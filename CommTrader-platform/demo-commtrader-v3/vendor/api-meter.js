/* API meter for the demos: every external or browser speech API call goes through here.
 * Canonical copy: scripts/api-meter/api-meter.js. The hub (index.html#api) is the monitoring page;
 * each V3 demo loads a verbatim copy (vendor/api-meter.js), checked by npm run check.
 *
 * Nothing is sent anywhere by this file. It holds keys the owner pastes on the monitor page
 * (this tab only, or this device if "remember" is ticked), checks killswitches and budgets before
 * a call, and records usage and estimated cost after it. State lives in localStorage, so it
 * covers this browser only; set hard limits at each provider as well.
 *
 *   ApiMeter.check(app, provider)          -> {ok, reason}
 *   ApiMeter.run({app, provider, op, model}, fn)
 *       fn() resolves {result, usage, model?}; usage = {inputTokens, outputTokens,
 *       audioInTokens, audioOutTokens, chars, seconds}. Throws ApiMeterBlocked when off.
 *   ApiMeter.record({...})                 log a call made elsewhere (e.g. browser speech)
 *   ApiMeter.keys.get/set/clear/has(provider)
 *   ApiMeter.gemini.tts({app, text, voice, model, signal})        -> {blob, usage}
 *   ApiMeter.gemini.transcribe({app, blob, lang, model, signal})  -> {text, usage}
 *   ApiMeter.state(), setKill(scope, id, on), setBudget(scope, id, usd), setPrice(model, prices),
 *   resetUsage(), exportCsv(), onChange(fn)
 */
(function (global) {
  'use strict';
  var STORE = 'project-demos:api-meter:v1';
  var KEYS = 'project-demos:api-keys:v1';
  var LEGACY_ANTHROPIC = 'project-demos:live-ai:key';
  var LOG_CAP = 500;

  var APPS = { tradedesk: 'TradeDesk', langquest: 'LangQuest', tayoo: 'Tayoo', nexus: 'Nexus CTE', tenderstrike: 'TenderStrike', hub: 'Hub' };
  var PROVIDERS = {
    anthropic: { name: 'Anthropic', paid: true, key: true },
    gemini: { name: 'Google Gemini', paid: true, key: true },
    'browser-speech': { name: 'Browser speech recognition', paid: false, key: false },
    'browser-tts': { name: 'Browser voices', paid: false, key: false }
  };
  // USD per 1M tokens. Estimates from public price lists (Oct 2026); edit them on the monitor page.
  var DEFAULT_PRICES = {
    'claude-opus-5-5': { input: 4, output: 20 },
    'gemini-3.8-flash-tts': { input: 0.5, audioOut: 9 },
    'gemini-3.8-flash-lite-tts': { input: 0.5, audioOut: 6 },
    'gemini-3.8-flash': { input: 0.3, audioIn: 1, output: 2.5 }
  };
  var DEFAULT_MODELS = { tts: 'gemini-3.8-flash-tts', transcribe: 'gemini-3.8-flash' };
  var RATE_PER_MIN = 30;

  function now() { return Date.now(); }
  function month(t) { var d = new Date(t || now()); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); }
  function read(k, store) { try { return JSON.parse((store || global.localStorage).getItem(k) || 'null'); } catch (e) { return null; } }
  function write(k, v, store) { try { (store || global.localStorage).setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  function blank() {
    return {
      kill: { global: false, apps: {}, providers: {} },
      budgets: { global: 5, apps: { tradedesk: 2, langquest: 2, tayoo: 2, nexus: 2, tenderstrike: 2, hub: 1 } },
      prices: {}, models: {}, totals: {}, log: []
    };
  }
  var mem = null;
  function load() {
    var s = read(STORE) || mem || blank();
    var b = blank();
    s.kill = s.kill || b.kill; s.kill.apps = s.kill.apps || {}; s.kill.providers = s.kill.providers || {};
    s.budgets = s.budgets || b.budgets; s.budgets.apps = Object.assign({}, b.budgets.apps, s.budgets.apps || {});
    s.prices = s.prices || {}; s.models = s.models || {}; s.totals = s.totals || {}; s.log = s.log || [];
    return s;
  }
  var listeners = [];
  function save(s) { mem = s; write(STORE, s); emit(); }
  function emit() { var st = api.state(); listeners.forEach(function (fn) { try { fn(st); } catch (e) {} }); }
  global.addEventListener && global.addEventListener('storage', function (e) { if (e.key === STORE || e.key === KEYS || e.key === LEGACY_ANTHROPIC) emit(); });

  function price(model) { var s = load(); return Object.assign({}, DEFAULT_PRICES[model] || {}, s.prices[model] || {}); }
  function costOf(model, u) {
    var p = price(model); u = u || {};
    var usd = ((u.inputTokens || 0) * (p.input || 0) + (u.outputTokens || 0) * (p.output || 0) +
      (u.audioInTokens || 0) * (p.audioIn || p.input || 0) + (u.audioOutTokens || 0) * (p.audioOut || p.output || 0)) / 1e6;
    return Math.round(usd * 1e6) / 1e6;
  }
  function spent(s, app) {
    var m = s.totals[month()] || {}, total = 0;
    Object.keys(m).forEach(function (a) { if (app && a !== app) return; Object.keys(m[a]).forEach(function (p) { total += m[a][p].cost || 0; }); });
    return total;
  }
  function recentPaid(s, app) {
    var cutoff = now() - 60000;
    return s.log.filter(function (e) { return e.t > cutoff && e.app === app && PROVIDERS[e.provider] && PROVIDERS[e.provider].paid; }).length;
  }

  function Blocked(reason) { var e = new Error(reason); e.name = 'ApiMeterBlocked'; e.code = 'blocked'; return e; }

  // ---- keys: this tab (sessionStorage) unless remembered (localStorage); never written anywhere else.
  var keys = {
    get: function (p) {
      var k = (read(KEYS, global.sessionStorage) || {})[p] || (read(KEYS) || {})[p] || null;
      if (!k && p === 'anthropic') { try { k = global.sessionStorage.getItem(LEGACY_ANTHROPIC) || global.localStorage.getItem(LEGACY_ANTHROPIC); } catch (e) {} }
      return k || null;
    },
    has: function (p) { return !!keys.get(p); },
    remembered: function (p) { return !!(read(KEYS) || {})[p]; },
    set: function (p, value, remember) {
      var v = String(value || '').trim(); if (!v) throw new Error('Paste a key first.');
      var ses = read(KEYS, global.sessionStorage) || {}, loc = read(KEYS) || {};
      ses[p] = v; write(KEYS, ses, global.sessionStorage);
      if (remember) loc[p] = v; else delete loc[p];
      write(KEYS, loc); emit();
    },
    clear: function (p) {
      var ses = read(KEYS, global.sessionStorage) || {}, loc = read(KEYS) || {};
      delete ses[p]; delete loc[p]; write(KEYS, ses, global.sessionStorage); write(KEYS, loc);
      if (p === 'anthropic') { try { global.sessionStorage.removeItem(LEGACY_ANTHROPIC); global.localStorage.removeItem(LEGACY_ANTHROPIC); } catch (e) {} }
      emit();
    }
  };

  var api = {
    APPS: APPS, PROVIDERS: PROVIDERS, DEFAULT_PRICES: DEFAULT_PRICES, keys: keys, Blocked: Blocked,
    month: month, price: price, costOf: costOf,
    model: function (kind) { return load().models[kind] || DEFAULT_MODELS[kind]; },
    setModel: function (kind, m) { var s = load(); if (m) s.models[kind] = m; else delete s.models[kind]; save(s); },

    check: function (app, provider) {
      var s = load(), P = PROVIDERS[provider];
      if (!APPS[app]) return { ok: false, reason: 'Unknown app' };
      if (!P) return { ok: false, reason: 'Unknown provider' };
      if (s.kill.global) return { ok: false, reason: 'Killswitch: all APIs are off' };
      if (s.kill.apps[app]) return { ok: false, reason: 'Killswitch: ' + APPS[app] + ' is off' };
      if (s.kill.providers[provider]) return { ok: false, reason: 'Killswitch: ' + P.name + ' is off' };
      if (P.key && !keys.has(provider)) return { ok: false, reason: 'No ' + P.name + ' key' };
      if (P.paid) {
        if (spent(s) >= s.budgets.global) return { ok: false, reason: 'Monthly budget reached' };
        if (s.budgets.apps[app] != null && spent(s, app) >= s.budgets.apps[app]) return { ok: false, reason: APPS[app] + ' budget reached' };
        if (recentPaid(s, app) >= RATE_PER_MIN) return { ok: false, reason: 'Rate limit: ' + RATE_PER_MIN + ' calls a minute' };
      }
      return { ok: true };
    },

    record: function (e) {
      var s = load(), t = now(), m = month(t);
      var entry = { t: t, app: e.app, provider: e.provider, op: e.op || 'call', model: e.model || '', usage: e.usage || {}, ok: e.ok !== false, ms: e.ms || 0, error: e.error ? String(e.error).slice(0, 160) : '' };
      entry.cost = PROVIDERS[e.provider] && PROVIDERS[e.provider].paid ? costOf(entry.model, entry.usage) : 0;
      s.log.unshift(entry); if (s.log.length > LOG_CAP) s.log.length = LOG_CAP;
      var a = (s.totals[m] = s.totals[m] || {}); var b = (a[e.app] = a[e.app] || {});
      var c = (b[e.provider] = b[e.provider] || { calls: 0, errors: 0, cost: 0, inputTokens: 0, outputTokens: 0, audioInTokens: 0, audioOutTokens: 0, chars: 0, seconds: 0 });
      c.calls++; if (!entry.ok) c.errors++; c.cost = Math.round((c.cost + entry.cost) * 1e6) / 1e6;
      ['inputTokens', 'outputTokens', 'audioInTokens', 'audioOutTokens', 'chars', 'seconds'].forEach(function (k) { c[k] += Number(entry.usage[k] || 0); });
      save(s);
      return entry;
    },

    run: function (o, fn) {
      var gate = api.check(o.app, o.provider);
      if (!gate.ok) return Promise.reject(Blocked(gate.reason));
      var t0 = now();
      return Promise.resolve().then(fn).then(function (r) {
        api.record({ app: o.app, provider: o.provider, op: o.op, model: (r && r.model) || o.model, usage: (r && r.usage) || {}, ms: now() - t0 });
        return r;
      }, function (err) {
        if (!(err && err.name === 'AbortError')) api.record({ app: o.app, provider: o.provider, op: o.op, model: o.model, ok: false, ms: now() - t0, error: err && err.message });
        throw err;
      });
    },

    state: function () {
      var s = load(), m = s.totals[month()] || {};
      return { month: month(), kill: s.kill, budgets: s.budgets, totals: m, allMonths: s.totals, log: s.log, spent: spent(s), spentByApp: Object.keys(APPS).reduce(function (o, a) { o[a] = spent(s, a); return o; }, {}), prices: Object.keys(DEFAULT_PRICES).reduce(function (o, k) { o[k] = price(k); return o; }, {}), models: { tts: api.model('tts'), transcribe: api.model('transcribe') } };
    },
    setKill: function (scope, id, on) { var s = load(); if (scope === 'global') s.kill.global = !!on; else s.kill[scope][id] = !!on; save(s); },
    setBudget: function (scope, id, usd) { var s = load(), v = Math.max(0, Number(usd) || 0); if (scope === 'global') s.budgets.global = v; else s.budgets.apps[id] = v; save(s); },
    setPrice: function (model, p) { var s = load(); s.prices[model] = p; save(s); },
    resetUsage: function () { var s = load(); s.totals = {}; s.log = []; save(s); },
    exportCsv: function () {
      var rows = [['time', 'app', 'provider', 'operation', 'model', 'ok', 'ms', 'input_tokens', 'output_tokens', 'audio_in_tokens', 'audio_out_tokens', 'chars', 'seconds', 'cost_usd', 'error']];
      load().log.slice().reverse().forEach(function (e) { var u = e.usage || {}; rows.push([new Date(e.t).toISOString(), e.app, e.provider, e.op, e.model, e.ok, e.ms, u.inputTokens || 0, u.outputTokens || 0, u.audioInTokens || 0, u.audioOutTokens || 0, u.chars || 0, u.seconds || 0, e.cost, e.error]); });
      return rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    },
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
  };

  // ---- Google Gemini: TTS and transcription, called from the browser with the owner's key.
  var GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';
  function geminiPost(model, body, signal) {
    return fetch(GEMINI + model + ':generateContent', {
      method: 'POST', signal: signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': keys.get('gemini') },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (!res.ok) { var e = new Error((j.error && j.error.message) || ('Gemini error ' + res.status)); e.status = res.status; throw e; }
        return j;
      });
    });
  }
  function modalityTokens(details, mod) { return (details || []).filter(function (d) { return d.modality === mod; }).reduce(function (n, d) { return n + (d.tokenCount || 0); }, 0); }
  function b64ToBytes(b64) { var bin = atob(b64), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  function pcmToWav(pcm, rate) {
    var h = new DataView(new ArrayBuffer(44)), w = function (o, s) { for (var i = 0; i < s.length; i++) h.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); h.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
    h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, 'data'); h.setUint32(40, pcm.length, true);
    return new Blob([h.buffer, pcm], { type: 'audio/wav' });
  }
  function blobToB64(blob) {
    return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.onerror = no; r.readAsDataURL(blob); });
  }
  api.gemini = {
    tts: function (o) {
      var model = o.model || api.model('tts');
      return api.run({ app: o.app, provider: 'gemini', op: 'tts', model: model }, function () {
        return geminiPost(model, {
          contents: [{ parts: [{ text: o.text }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: o.voice || 'Kore' } } } }
        }, o.signal).then(function (j) {
          var part = ((((j.candidates || [])[0] || {}).content || {}).parts || []).filter(function (p) { return p.inlineData; })[0];
          if (!part) throw new Error('Gemini returned no audio');
          var rate = Number((/rate=(\d+)/.exec(part.inlineData.mimeType || '') || [])[1] || 24000);
          var u = j.usageMetadata || {};
          var audioOut = modalityTokens(u.candidatesTokensDetails, 'AUDIO') || u.candidatesTokenCount || 0;
          return { result: { blob: pcmToWav(b64ToBytes(part.inlineData.data), rate) }, model: model, usage: { inputTokens: u.promptTokenCount || 0, audioOutTokens: audioOut, chars: (o.text || '').length } };
        });
      }).then(function (r) { return { blob: r.result.blob, usage: r.usage }; });
    },
    transcribe: function (o) {
      var model = o.model || api.model('transcribe');
      return api.run({ app: o.app, provider: 'gemini', op: 'transcribe', model: model }, function () {
        return blobToB64(o.blob).then(function (data) {
          return geminiPost(model, {
            contents: [{ parts: [
              { inlineData: { mimeType: (o.blob.type || 'audio/webm').split(';')[0], data: data } },
              { text: 'Transcribe this recording exactly, in its original language' + (o.lang ? ' (expected: ' + o.lang + ')' : '') + '. Return only the words spoken, with no commentary. If nothing is said, return an empty string.' }
            ] }]
          }, o.signal);
        }).then(function (j) {
          var parts = ((((j.candidates || [])[0] || {}).content || {}).parts || []);
          var text = parts.map(function (p) { return p.text || ''; }).join('').trim();
          var u = j.usageMetadata || {};
          var audioIn = modalityTokens(u.promptTokensDetails, 'AUDIO');
          return { result: { text: text }, model: model, usage: { inputTokens: Math.max(0, (u.promptTokenCount || 0) - audioIn), audioInTokens: audioIn, outputTokens: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0), seconds: o.seconds || 0 } };
        });
      }).then(function (r) { return { text: r.result.text, usage: r.usage }; });
    }
  };

  global.ApiMeter = api;
})(window);
