/* API meter for the demos: every external or browser speech API call goes through here.
 * Canonical copy: scripts/api-meter/api-meter.js. The hub (index.html#api) is the API page;
 * each V3 demo loads a verbatim copy (vendor/api-meter.js), checked by npm run check.
 *
 * Nothing is sent anywhere by this file except the calls it is asked to make. It holds keys the
 * owner pastes on the API page (this tab only, or this device if "remember" is ticked), checks
 * killswitches and budgets before a call, and records usage and cost after it. State lives in
 * localStorage, so it covers this browser only; set a hard limit on each provider key as well.
 *
 * OpenRouter is the default engine: one key reaches every model it routes to, it reports the exact
 * cost of each call, and routing preferences (sort, privacy, fallbacks) apply to every demo.
 *
 *   ApiMeter.check(app, provider)          -> {ok, reason}
 *   ApiMeter.checkLlm(app) / checkTts(app) / checkStt(app)   same, for whatever engine is chosen
 *   ApiMeter.run({app, provider, op, model}, fn)
 *       fn() resolves {result, usage, model?}; usage = {inputTokens, outputTokens, audioInTokens,
 *       audioOutTokens, chars, seconds, costUSD?}. Throws ApiMeterBlocked when off.
 *   ApiMeter.record({...})                 log a call made elsewhere (e.g. browser speech)
 *   ApiMeter.keys.get/set/clear/has/remembered(provider)
 *   ApiMeter.llm(app) / setLlm(provider, model, app?) / clearLlm(app)   live-AI engine, per app or default
 *   ApiMeter.route() / setRoute(patch)     OpenRouter routing: sort, privacy, zdr, fallbacks
 *   ApiMeter.voice() / setVoice(kind, {provider, model, voice})        speech engines ('tts' | 'stt'); on
 *       OpenRouter an empty model means auto (best-suited model from the live list, shown as v.auto)
 *   ApiMeter.tts({app, text, voice, signal}) -> {blob, usage}           via the chosen voice engine
 *   ApiMeter.transcribe({app, blob, lang, seconds, signal}) -> {text, usage}
 *   ApiMeter.openrouter.models({kind, refresh})   kind 'text' | 'speech' | 'transcription'
 *   ApiMeter.openrouter.account({refresh})        key label, limit, remaining, usage (GET /key)
 *   ApiMeter.openrouter.chat({app, model, system, messages, jsonSchema, maxTokens, fallbacks, signal})
 *   ApiMeter.openrouter.speech({app, model, text, voice, signal}) / transcribe({app, model, blob, lang, seconds, signal})
 *   ApiMeter.gemini.tts({...}) / transcribe({...})   Gemini direct, with a Gemini key
 *   ApiMeter.state(), setKill(scope, id, on), setBudget(scope, id, usd), setPrice(model, prices),
 *   resetUsage(), exportCsv(), onChange(fn)
 */
(function (global) {
  'use strict';
  var STORE = 'project-demos:api-meter:v1';
  var KEYS = 'project-demos:api-keys:v1';
  var LEGACY_ANTHROPIC = 'project-demos:live-ai:key';
  var OR_MODELS = 'project-demos:openrouter-models:v2';
  var LOG_CAP = 500;

  var APPS = { tradedesk: 'TradeDesk', langquest: 'LangQuest', tayoo: 'Tayoo', nexus: 'Nexus CTE', tenderstrike: 'TenderStrike', hub: 'Hub' };
  var PROVIDERS = {
    openrouter: { name: 'OpenRouter', paid: true, key: true },
    anthropic: { name: 'Anthropic', paid: true, key: true },
    gemini: { name: 'Google Gemini', paid: true, key: true },
    'browser-speech': { name: 'Browser speech recognition', paid: false, key: false },
    'browser-tts': { name: 'Browser voices', paid: false, key: false }
  };
  // USD per 1M tokens, for providers that do not report a cost. OpenRouter reports the exact cost
  // of each chat call; its model list fills in estimates for the rest.
  var DEFAULT_PRICES = {
    'claude-opus-5-5': { input: 4, output: 20 },
    'gemini-3.8-flash-tts': { input: 0.5, audioOut: 9 },
    'gemini-3.8-flash-lite-tts': { input: 0.5, audioOut: 6 },
    'gemini-3.8-flash': { input: 0.3, audioIn: 1, output: 2.5 }
  };
  var DEFAULT_MODELS = { tts: 'gemini-3.8-flash-tts', transcribe: 'gemini-3.8-flash' };
  var CLAUDE = 'claude-opus-5-5';
  var DEFAULT_LLM = { provider: 'openrouter', model: 'openrouter/auto' };
  var DEFAULT_ROUTE = { sort: '', privacy: false, zdr: false, fallbacks: [] };
  var RATE_PER_MIN = 30;

  function now() { return Date.now(); }
  function month(t) { var d = new Date(t || now()); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); }
  function read(k, store) { try { return JSON.parse((store || global.localStorage).getItem(k) || 'null'); } catch (e) { return null; } }
  function write(k, v, store) { try { (store || global.localStorage).setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  var orCache = {}; // kind -> {at, list}
  var orPrices = {};
  ['text', 'speech', 'transcription'].forEach(function (kind) {
    var c = read(OR_MODELS + ':' + kind);
    if (c && c.list) { orCache[kind] = c; c.list.forEach(function (m) { orPrices[m.id] = { input: m.input || 0, output: m.output || 0, audioIn: m.audioIn || 0 }; }); }
  });

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
    s.models.llmApps = s.models.llmApps || {};
    return s;
  }
  var listeners = [];
  function save(s) { mem = s; write(STORE, s); emit(); }
  function emit() { var st = api.state(); listeners.forEach(function (fn) { try { fn(st); } catch (e) {} }); }
  global.addEventListener && global.addEventListener('storage', function (e) { if (e.key === STORE || e.key === KEYS || e.key === LEGACY_ANTHROPIC) emit(); });

  function price(model) { var s = load(); return Object.assign({}, orPrices[model] || {}, DEFAULT_PRICES[model] || {}, s.prices[model] || {}); }
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

  var account = null; // cached GET /key result
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
      write(KEYS, loc);
      if (p === 'openrouter') account = null;
      emit();
    },
    clear: function (p) {
      var ses = read(KEYS, global.sessionStorage) || {}, loc = read(KEYS) || {};
      delete ses[p]; delete loc[p]; write(KEYS, ses, global.sessionStorage); write(KEYS, loc);
      if (p === 'anthropic') { try { global.sessionStorage.removeItem(LEGACY_ANTHROPIC); global.localStorage.removeItem(LEGACY_ANTHROPIC); } catch (e) {} }
      if (p === 'openrouter') account = null;
      emit();
    }
  };

  // Live-AI engine: OpenRouter with any model (default openrouter/auto), or Claude direct.
  // With no choice made, an owner who added only an Anthropic key gets Claude direct.
  // An OpenRouter engine with an empty model keeps live AI off rather than guessing one.
  function normLlm(l) {
    if (!l) return keys.has('anthropic') && !keys.has('openrouter') ? { provider: 'anthropic', model: CLAUDE } : { provider: DEFAULT_LLM.provider, model: DEFAULT_LLM.model };
    if (l.provider === 'anthropic') return { provider: 'anthropic', model: CLAUDE };
    return { provider: 'openrouter', model: l.model == null ? DEFAULT_LLM.model : String(l.model) };
  }
  function normRoute(r) {
    r = Object.assign({}, DEFAULT_ROUTE, r || {});
    return { sort: /^(price|throughput|latency)$/.test(r.sort) ? r.sort : '', privacy: !!r.privacy, zdr: !!r.zdr, fallbacks: (r.fallbacks || []).filter(Boolean).slice(0, 2) };
  }
  // Speech engines: Gemini direct unless OpenRouter is chosen, or is the only key added. On OpenRouter
  // an empty model means "auto": the best-suited voice or transcription model from its live list.
  function normVoice(m) {
    var t = m.ttsVia || {}, s = m.sttVia || {}, orOnly = keys.has('openrouter') && !keys.has('gemini');
    if (!t.provider && orOnly) t = Object.assign({ provider: 'openrouter' }, t);
    if (!s.provider && orOnly) s = Object.assign({ provider: 'openrouter' }, s);
    return {
      tts: t.provider === 'openrouter' ? { provider: 'openrouter', model: t.model || autoModel('speech'), auto: !t.model, voice: t.voice || '' } : { provider: 'gemini', model: m.tts || DEFAULT_MODELS.tts, voice: t.voice || 'Kore' },
      stt: s.provider === 'openrouter' ? { provider: 'openrouter', model: s.model || autoModel('transcription'), auto: !s.model } : { provider: 'gemini', model: m.transcribe || DEFAULT_MODELS.transcribe }
    };
  }
  // Auto picks, from the cached OpenRouter lists: Gemini TTS first (natural, multilingual, and the
  // demos' character voices are Gemini voice names), then other TTS; Whisper first for transcription.
  var AUTO_PREF = { speech: [/gemini[^/]*flash[^/]*tts/i, /gemini[^/]*tts/i, /tts/i], transcription: [/whisper/i, /transcri/i] };
  function autoModel(kind) {
    var list = ((orCache[kind] || {}).list) || [];
    if (!list.length) return '';
    var prefs = AUTO_PREF[kind] || [], cheap = function (a, b) { return (a.input || 0) - (b.input || 0); };
    for (var i = 0; i < prefs.length; i++) { var hit = list.filter(function (m) { return prefs[i].test(m.id); }).sort(cheap)[0]; if (hit) return hit.id; }
    return list[0].id;
  }
  function gateWith(app, provider, model, what, auto) {
    var g = api.check(app, provider);
    if (g.ok && provider === 'openrouter' && !model && !auto) return { ok: false, reason: 'No OpenRouter ' + what + ' chosen' };
    return g;
  }

  var api = {
    APPS: APPS, PROVIDERS: PROVIDERS, DEFAULT_PRICES: DEFAULT_PRICES, DEFAULT_LLM: DEFAULT_LLM, CLAUDE: CLAUDE, keys: keys, Blocked: Blocked,
    month: month, price: price, costOf: costOf,
    model: function (kind) { return load().models[kind] || DEFAULT_MODELS[kind]; },
    setModel: function (kind, m) { var s = load(); if (m) s.models[kind] = m; else delete s.models[kind]; save(s); },

    llm: function (app) { var m = load().models; return normLlm((app && m.llmApps[app]) || m.llm); },
    llmOverride: function (app) { return !!load().models.llmApps[app]; },
    setLlm: function (provider, model, app) {
      var s = load(), l = provider === 'anthropic' ? { provider: 'anthropic', model: CLAUDE } : { provider: 'openrouter', model: String(model == null ? '' : model).trim() };
      if (app) s.models.llmApps[app] = l; else s.models.llm = l;
      save(s);
    },
    clearLlm: function (app) { var s = load(); delete s.models.llmApps[app]; save(s); },
    route: function () { return normRoute(load().models.route); },
    setRoute: function (patch) { var s = load(); s.models.route = normRoute(Object.assign({}, normRoute(s.models.route), patch || {})); save(s); },
    voice: function () { return normVoice(load().models); },
    setVoice: function (kind, v) {
      var s = load(), k = kind === 'stt' ? 'sttVia' : 'ttsVia', cur = s.models[k] || {}, next = Object.assign({}, cur, v || {});
      // Voice names differ between engines, so switching engine drops a voice that was not given.
      if (v && v.provider && v.provider !== (cur.provider || 'gemini') && v.voice == null) delete next.voice;
      s.models[k] = next;
      if (v && v.provider === 'gemini' && v.model) s.models[kind === 'stt' ? 'transcribe' : 'tts'] = v.model;
      save(s);
    },

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
    checkLlm: function (app) { var l = api.llm(app); return gateWith(app, l.provider, l.model, 'model'); },
    checkTts: function (app) { var v = api.voice().tts; return gateWith(app, v.provider, v.model, 'voice model', v.auto); },
    checkStt: function (app) { var v = api.voice().stt; return gateWith(app, v.provider, v.model, 'transcription model', v.auto); },

    record: function (e) {
      var s = load(), t = now(), m = month(t);
      var entry = { t: t, app: e.app, provider: e.provider, op: e.op || 'call', model: e.model || '', usage: e.usage || {}, ok: e.ok !== false, ms: e.ms || 0, error: e.error ? String(e.error).slice(0, 160) : '' };
      if (e.via) entry.via = String(e.via).slice(0, 60);
      // A provider-reported cost (OpenRouter returns one) wins over the price-list estimate.
      var paid = PROVIDERS[e.provider] && PROVIDERS[e.provider].paid, reported = entry.usage.costUSD != null;
      entry.cost = paid ? (reported ? Math.round(Number(entry.usage.costUSD) * 1e6) / 1e6 : costOf(entry.model, entry.usage)) : 0;
      if (paid && !reported && entry.ok) entry.est = true;
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
        api.record({ app: o.app, provider: o.provider, op: o.op, model: (r && r.model) || o.model, via: r && r.via, usage: (r && r.usage) || {}, ms: now() - t0 });
        return r;
      }, function (err) {
        if (!(err && err.name === 'AbortError')) api.record({ app: o.app, provider: o.provider, op: o.op, model: o.model, ok: false, ms: now() - t0, error: err && err.message });
        throw err;
      });
    },

    state: function () {
      var s = load(), m = s.totals[month()] || {};
      return {
        month: month(), kill: s.kill, budgets: s.budgets, totals: m, allMonths: s.totals, log: s.log, spent: spent(s),
        spentByApp: Object.keys(APPS).reduce(function (o, a) { o[a] = spent(s, a); return o; }, {}),
        prices: Object.keys(DEFAULT_PRICES).reduce(function (o, k) { o[k] = price(k); return o; }, {}),
        models: { tts: api.model('tts'), transcribe: api.model('transcribe') },
        llm: api.llm(), llmApps: Object.keys(s.models.llmApps).reduce(function (o, a) { o[a] = normLlm(s.models.llmApps[a]); return o; }, {}),
        route: api.route(), voice: api.voice()
      };
    },
    setKill: function (scope, id, on) { var s = load(); if (scope === 'global') s.kill.global = !!on; else s.kill[scope][id] = !!on; save(s); },
    setBudget: function (scope, id, usd) { var s = load(), v = Math.max(0, Number(usd) || 0); if (scope === 'global') s.budgets.global = v; else s.budgets.apps[id] = v; save(s); },
    setPrice: function (model, p) { var s = load(); s.prices[model] = p; save(s); },
    resetUsage: function () { var s = load(); s.totals = {}; s.log = []; save(s); },
    exportCsv: function () {
      var rows = [['time', 'app', 'provider', 'operation', 'model', 'served_by', 'ok', 'ms', 'input_tokens', 'output_tokens', 'audio_in_tokens', 'audio_out_tokens', 'chars', 'seconds', 'cost_usd', 'cost_estimated', 'error']];
      load().log.slice().reverse().forEach(function (e) { var u = e.usage || {}; rows.push([new Date(e.t).toISOString(), e.app, e.provider, e.op, e.model, e.via || '', e.ok, e.ms, u.inputTokens || 0, u.outputTokens || 0, u.audioInTokens || 0, u.audioOutTokens || 0, u.chars || 0, u.seconds || 0, e.cost, !!e.est, e.error]); });
      return rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    },
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
  };

  // ---- audio helpers
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
  // A recording (webm/ogg/mp4) re-encoded as 16 kHz mono WAV, which every transcription provider takes.
  function toWav(blob) {
    var AC = global.AudioContext || global.webkitAudioContext, OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    if (!AC || !OAC || !blob.arrayBuffer) return Promise.reject(new Error('No audio decoder'));
    return blob.arrayBuffer().then(function (buf) {
      var ctx = new AC();
      return new Promise(function (ok, no) { var pr = ctx.decodeAudioData(buf, ok, no); if (pr && pr.catch) pr.catch(function () {}); }).then(function (audio) {
        try { ctx.close(); } catch (e) {}
        var rate = 16000, off = new OAC(1, Math.max(1, Math.ceil(audio.duration * rate)), rate), src = off.createBufferSource();
        src.buffer = audio; src.connect(off.destination); src.start();
        return off.startRendering();
      }, function (err) { try { ctx.close(); } catch (e) {} throw err; });
    }).then(function (r) {
      var ch = r.getChannelData(0), pcm = new Uint8Array(ch.length * 2), dv = new DataView(pcm.buffer);
      for (var i = 0; i < ch.length; i++) { var v = Math.max(-1, Math.min(1, ch[i])); dv.setInt16(i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true); }
      return pcmToWav(pcm, 16000);
    });
  }
  function audioFormat(type) { var t = String(type || '').split(';')[0].split('/')[1] || 'webm'; return t === 'mpeg' ? 'mp3' : t === 'x-wav' ? 'wav' : t === 'mp4' ? 'm4a' : t; }

  // ---- Google Gemini direct: TTS and transcription with the owner's Gemini key.
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

  // ---- OpenRouter: every model it routes to, called from the browser with the owner's key.
  var OR = 'https://openrouter.ai/api/v1/';
  function perMillion(v) { var n = Number(v); return v != null && v !== '' && isFinite(n) && n >= 0 ? Math.round(n * 1e6 * 1e4) / 1e4 : null; }
  function has(list, x) { return (list || []).indexOf(x) >= 0; }
  function mapModel(m) {
    var p = m.pricing || {}, a = m.architecture || {}, sp = m.supported_parameters || [], ins = a.input_modalities || [], aa = (m.benchmarks || {}).artificial_analysis || {};
    var input = perMillion(p.prompt), output = perMillion(p.completion);
    return {
      id: m.id, name: m.name || m.id, context: m.context_length || (m.top_provider || {}).context_length || 0,
      input: input, output: output, audioIn: perMillion(p.audio) || 0,
      json: has(sp, 'response_format') || has(sp, 'structured_outputs'), tools: has(sp, 'tools'), reasoning: has(sp, 'reasoning'),
      vision: has(ins, 'image'), file: has(ins, 'file'), audio: has(ins, 'audio'),
      free: /:free$/.test(m.id) || (input === 0 && output === 0 && !(Number(p.request) > 0)),
      created: m.created || 0, intel: aa.intelligence_index == null ? null : Number(aa.intelligence_index),
      voices: m.supported_voices || null
    };
  }
  function orHeaders(json) {
    var h = { authorization: 'Bearer ' + keys.get('openrouter'), 'x-title': 'Project demos' };
    if (json) h['content-type'] = 'application/json';
    if (global.location && /^https:/.test(global.location.protocol)) h['http-referer'] = global.location.origin + global.location.pathname;
    return h;
  }
  function orError(res, j) {
    var e = new Error((j && j.error && j.error.message) || ('OpenRouter error ' + res.status));
    e.status = (j && j.error && Number(j.error.code)) || res.status; return e;
  }
  function orJson(res) { return res.json().catch(function () { return {}; }).then(function (j) { if (!res.ok || j.error) throw orError(res, j); return j; }); }
  // Routing preferences from the API page; speech endpoints take only the privacy ones.
  function orProvider(extra, speech) {
    var r = api.route(), p = {};
    if (r.sort && !speech) p.sort = r.sort;
    if (r.privacy) p.data_collection = 'deny';
    if (r.zdr) p.zdr = true;
    Object.keys(extra || {}).forEach(function (k) { p[k] = extra[k]; });
    return Object.keys(p).length ? p : null;
  }
  api.openrouter = {
    // Public model lists (no key needed), cached for a day; they also feed the cost estimates.
    models: function (o) {
      o = o || {}; var kind = o.kind || 'text', c = orCache[kind];
      if (c && c.list && now() - c.at < 864e5 && !o.refresh) return Promise.resolve(c.list);
      return fetch(OR + 'models' + (kind === 'text' ? '' : '?output_modalities=' + kind)).then(function (r) { if (!r.ok) throw new Error('OpenRouter model list: HTTP ' + r.status); return r.json(); }).then(function (j) {
        var list = (j.data || []).map(mapModel).sort(function (a, b) { return a.id < b.id ? -1 : 1; });
        list.forEach(function (m) { orPrices[m.id] = { input: m.input || 0, output: m.output || 0, audioIn: m.audioIn || 0 }; });
        orCache[kind] = { at: now(), list: list }; write(OR_MODELS + ':' + kind, orCache[kind]);
        return list;
      });
    },
    cached: function (kind) { return ((orCache[kind || 'text'] || {}).list) || []; },
    auto: function (kind) { return autoModel(kind); },
    find: function (id) { var hit = null; Object.keys(orCache).some(function (k) { return (orCache[k].list || []).some(function (m) { if (m.id === id) { hit = m; return true; } return false; }); }); return hit; },
    // The key's own label, limit and usage. Free; needs the key, and nothing is recorded.
    account: function (o) {
      if (!keys.has('openrouter')) return Promise.reject(new Error('No OpenRouter key'));
      var s = load();
      if (s.kill.global || s.kill.providers.openrouter) return Promise.reject(new Error('OpenRouter is switched off'));
      if (account && now() - account.at < 60000 && !(o && o.refresh)) return Promise.resolve(account.data);
      return fetch(OR + 'key', { headers: orHeaders(false) }).then(orJson).then(function (j) {
        var d = j.data || {};
        account = { at: now(), data: {
          label: d.label || '', limit: d.limit == null ? null : Number(d.limit), remaining: d.limit_remaining == null ? null : Number(d.limit_remaining), reset: d.limit_reset || null,
          usage: Number(d.usage || 0), daily: Number(d.usage_daily || 0), weekly: Number(d.usage_weekly || 0), monthly: Number(d.usage_monthly || 0),
          free: !!d.is_free_tier, rate: d.rate_limit || null
        } };
        return account.data;
      });
    },
    chat: function (o) {
      var model = o.model || api.llm(o.app).model;
      return api.run({ app: o.app, provider: 'openrouter', op: 'chat', model: model }, function () {
        var msgs = (o.system ? [{ role: 'system', content: o.system }] : []).concat(o.messages || []);
        var body = { model: model, messages: msgs, max_tokens: o.maxTokens || 4000, usage: { include: true } };
        if (o.jsonSchema) body.response_format = { type: 'json_schema', json_schema: { name: 'result', strict: true, schema: o.jsonSchema } };
        // Structured output only goes to hosts that support it.
        var prov = orProvider(o.jsonSchema ? { require_parameters: true } : null); if (prov) body.provider = prov;
        var fb = (o.fallbacks || api.route().fallbacks).filter(function (id) { return id && id !== model; }).slice(0, 2);
        if (fb.length) body.models = [model].concat(fb);
        return fetch(OR + 'chat/completions', { method: 'POST', signal: o.signal, headers: orHeaders(true), body: JSON.stringify(body) }).then(orJson).then(function (j) {
          var c = (j.choices || [])[0] || {}, m = c.message || {}, u = j.usage || {};
          var text = typeof m.content === 'string' ? m.content : (m.content || []).map(function (x) { return x.text || ''; }).join('');
          var usage = { inputTokens: u.prompt_tokens || 0, outputTokens: u.completion_tokens || 0 };
          if (u.cost != null) usage.costUSD = Number(u.cost);
          return { result: { text: text, finish: c.finish_reason || c.native_finish_reason || '', servedBy: j.model || model, host: j.provider || '' }, model: j.model || model, via: j.provider || '', usage: usage };
        });
      }).then(function (r) { return { text: r.result.text, finish: r.result.finish, model: r.result.servedBy, provider: r.result.host, usage: r.usage }; });
    },
    speech: function (o) {
      return resolveModel('speech', o.model).then(function (model) {
        var v = api.voice().tts, info = api.openrouter.find(model), voice = o.voice;
        // A demo may ask for a voice this model does not have (e.g. a Gemini voice name); then the chosen one is used.
        if (info && info.voices && voice && !has(info.voices, voice)) voice = '';
        if (info && info.voices && v.voice && !has(info.voices, v.voice)) v.voice = '';
        voice = voice || v.voice || (info && info.voices && info.voices[0]) || '';
        return api.run({ app: o.app, provider: 'openrouter', op: 'tts', model: model }, function () {
          var once = function (fmt) {
            var body = { model: model, input: o.text, response_format: fmt };
            if (voice) body.voice = voice;
            if (o.instructions) body.instructions = o.instructions;
            var prov = orProvider(null, true); if (prov) body.provider = prov;
            return fetch(OR + 'audio/speech', { method: 'POST', signal: o.signal, headers: orHeaders(true), body: JSON.stringify(body) }).then(function (res) {
              if (!res.ok) return res.json().catch(function () { return {}; }).then(function (j) { throw orError(res, j); });
              return speechBlob(res, fmt);
            });
          };
          // Raw PCM is the format every voice model takes (some take nothing else); it is wrapped as WAV.
          // If a model rejects the format, the other one is tried once and remembered for that model.
          var fmt = speechFormat(model);
          return once(fmt).catch(function (err) {
            if (!(err && err.status === 400 && /response_format|format/i.test(err.message || ''))) throw err;
            var alt = /"?pcm"?/i.test(err.message) && fmt !== 'pcm' ? 'pcm' : /"?mp3"?/i.test(err.message) && fmt !== 'mp3' ? 'mp3' : fmt === 'pcm' ? 'mp3' : 'pcm';
            return once(alt).then(function (b) { speechFormat(model, alt); return b; });
          }).then(function (b) {
            var chars = (o.text || '').length;
            return { result: { blob: b, voice: voice }, model: model, usage: { inputTokens: Math.ceil(chars / 4), chars: chars } };
          });
        });
      }).then(function (r) { return { blob: r.result.blob, voice: r.result.voice, usage: r.usage }; });
    },
    transcribe: function (o) {
      return resolveModel('transcription', o.model).then(function (model) { return orTranscribe(o, model); });
    }
  };
  function orTranscribe(o, model) {
    return api.run({ app: o.app, provider: 'openrouter', op: 'transcribe', model: model }, function () {
      return toWav(o.blob).catch(function () { return o.blob; }).then(function (b) {
        return blobToB64(b).then(function (data) {
          var body = { model: model, input_audio: { data: data, format: audioFormat(b.type) } };
          if (o.lang) body.language = String(o.lang).split('-')[0];
          var prov = orProvider(null, true); if (prov) body.provider = prov;
          return fetch(OR + 'audio/transcriptions', { method: 'POST', signal: o.signal, headers: orHeaders(true), body: JSON.stringify(body) }).then(orJson);
        });
      }).then(function (j) {
        var u = j.usage || {}, usage = { inputTokens: u.input_tokens || 0, outputTokens: u.output_tokens || 0, seconds: u.seconds || o.seconds || 0 };
        if (u.cost != null) usage.costUSD = Number(u.cost);
        return { result: { text: String(j.text || '').trim() }, model: model, usage: usage };
      });
    }).then(function (r) { return { text: r.result.text, usage: r.usage }; });
  }
  // The model to use: the one asked for, else the chosen one, else the auto pick (loading the list if needed).
  function resolveModel(kind, asked) {
    var v = api.voice()[kind === 'speech' ? 'tts' : 'stt'], m = asked || (v.provider === 'openrouter' ? v.model : '');
    if (m) return Promise.resolve(m);
    return api.openrouter.models({ kind: kind }).then(function () {
      var a = autoModel(kind);
      if (!a) throw new Error('OpenRouter lists no ' + (kind === 'speech' ? 'voice' : 'transcription') + ' model');
      return a;
    });
  }
  var FORMATS = 'project-demos:or-speech-format:v1';
  function speechFormat(model, set) {
    var all = read(FORMATS) || {};
    if (set) { all[model] = set; write(FORMATS, all); return set; }
    return all[model] || 'pcm';
  }
  // Speech bytes as a playable blob: WAV and MP3 pass through; raw PCM (16-bit mono) gets a WAV header.
  function speechBlob(res, fmt) {
    var ct = (res.headers && res.headers.get('content-type')) || '';
    return res.arrayBuffer().then(function (buf) {
      var u = new Uint8Array(buf);
      if (u.length > 4 && u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46) return new Blob([u], { type: 'audio/wav' });
      if (fmt === 'mp3' || /mpeg|mp3/i.test(ct) || (u[0] === 0x49 && u[1] === 0x44 && u[2] === 0x33)) return new Blob([u], { type: 'audio/mpeg' });
      if (/ogg|opus|webm|aac|mp4/i.test(ct)) return new Blob([u], { type: ct.split(';')[0] });
      var rate = Number((/rate=(\d+)/i.exec(ct) || [])[1] || 24000);
      return pcmToWav(u.length % 2 ? u.slice(0, u.length - 1) : u, rate);
    });
  }

  // ---- the chosen speech engines, for the demos
  api.tts = function (o) {
    var v = api.voice().tts;
    if (v.provider === 'openrouter') return api.openrouter.speech(Object.assign({}, o, { model: v.auto ? '' : v.model }));
    return api.gemini.tts(Object.assign({}, o, { voice: o.voice || v.voice }));
  };
  api.transcribe = function (o) {
    var v = api.voice().stt;
    if (v.provider === 'openrouter') return api.openrouter.transcribe(Object.assign({}, o, { model: v.auto ? '' : v.model }));
    return api.gemini.transcribe(o);
  };

  global.ApiMeter = api;
})(window);
