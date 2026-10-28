/* Optional live AI for the V3 demos. Shared, dependency-free adapter over the
 * vendored official Anthropic SDK (anthropic-sdk.js, loaded first). Copies live
 * beside each V3 demo; edit scripts/live-ai/live-ai.js and re-copy all five.
 *
 * Off by default. Nothing leaves the browser until the viewer pastes their own
 * API key. The key is held in memory for this tab unless the viewer ticks
 * "remember on this device", which stores it in localStorage for this origin.
 *
 *   LiveAI.isOn()                         key configured and SDK loaded
 *   LiveAI.configure({apiKey, remember})  turn on; LiveAI.clear() turns off
 *   LiveAI.json({system, prompt, schema, effort, maxTokens, signal, documents})
 *     -> {data, provenance}               data validated against schema.required
 *   LiveAI.text({system, messages, effort, maxTokens, signal})
 *     -> {text, provenance}
 *   LiveAI.describe(error)                plain-language message for any failure
 *   LiveAI.onChange(fn)                   called with isOn() after configure/clear
 *   LiveAI.renderSettings(el, {lang})     drop-in settings panel (en/fr)
 *
 * When ApiMeter selects OpenRouter as the engine (hub monitor, index.html#api), json() and text()
 * go to the chosen OpenRouter model instead, with the same result shapes and checks.
 *
 * When ApiMeter (scripts/api-meter/api-meter.js) is loaded first, the key comes from the hub's
 * API monitor (index.html#api), and every call is checked against its killswitches and budgets
 * and recorded there under LiveAI.app (inferred from the demo's folder name).
 */
(function (global) {
  'use strict';
  var MODEL = 'claude-opus-5-5';
  var STORE = 'project-demos:live-ai:key';
  var FALLBACK_BETA = 'server-side-fallback-2026-07-01';
  var key = null, client = null, listeners = [], fallbacksOk = true, lastCall = null;

  try { key = global.localStorage.getItem(STORE) || null; } catch (e) {}

  function meter() { return global.ApiMeter || null; }
  function currentKey() { var m = meter(); return m ? m.keys.get('anthropic') : key; }
  var APP_BY_FOLDER = { commtrader: 'tradedesk', langquest: 'langquest', tayoo: 'tayoo', 'nexus-cte': 'nexus', tenderstrike: 'tenderstrike' };
  function inferApp() {
    var m = /demo-([a-z-]+?)(?:-v\d)?\//.exec((global.location && global.location.pathname) || '');
    return (m && APP_BY_FOLDER[m[1]]) || 'hub';
  }

  function sdk() { return global.Anthropic || null; }
  function emit() { var on = api.isOn(); listeners.forEach(function (fn) { try { fn(on); } catch (e) {} }); }
  var clientKey = null;
  function getClient() {
    var k = currentKey();
    if (k !== clientKey) { client = null; clientKey = k; }
    if (!client && k && sdk()) {
      client = new (sdk())({ apiKey: k, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 90000 });
    }
    return client;
  }

  function LiveAIError(code, message, cause) {
    var e = new Error(message);
    e.name = 'LiveAIError'; e.code = code; e.cause = cause;
    return e;
  }

  function textOf(res) {
    return (res.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
  }

  function provenanceOf(res, startedAt) {
    var usage = res.usage || {};
    var fellBack = (usage.iterations || []).some(function (it) { return it.type === 'fallback_message'; });
    return {
      source: 'live-ai',
      model: res.model || MODEL,
      fellBack: fellBack,
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      ms: Date.now() - startedAt,
      at: new Date().toISOString()
    };
  }

  // One request with the server-side refusal fallback; if this account or
  // endpoint rejects that beta parameter, retry once without it and remember.
  function send(body, signal) {
    var m = meter();
    if (!m) return sendNow(body, signal);
    return m.run({ app: api.app || inferApp(), provider: 'anthropic', op: 'messages', model: MODEL }, function () {
      return sendNow(body, signal).then(function (res) {
        var u = res.usage || {};
        return { result: res, model: res.model || MODEL, usage: { inputTokens: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0), outputTokens: u.output_tokens || 0 } };
      });
    }).then(function (r) { return r.result; }, function (err) {
      if (err && err.name === 'ApiMeterBlocked') throw LiveAIError('blocked', 'Live AI is paused: ' + err.message + '.');
      throw err;
    });
  }
  function sendNow(body, signal) {
    var c = getClient();
    if (!c) return Promise.reject(LiveAIError('off', 'Live AI is off. Add an API key in the demo settings to turn it on.'));
    var A = sdk();
    var params = Object.assign({ model: MODEL }, body);
    if (fallbacksOk) { params.betas = [FALLBACK_BETA]; params.fallbacks = 'default'; }
    var opts = signal ? { signal: signal } : undefined;
    return c.beta.messages.create(params, opts).catch(function (err) {
      if (fallbacksOk && A && err instanceof A.BadRequestError) {
        fallbacksOk = false;
        var retry = Object.assign({ model: MODEL }, body);
        return c.beta.messages.create(retry, opts);
      }
      throw err;
    });
  }

  function checkStop(res) {
    if (res.stop_reason === 'refusal') {
      var d = res.stop_details || {};
      throw LiveAIError('refusal', 'The model declined this request' + (d.explanation ? ': ' + d.explanation : '.'));
    }
    if (res.stop_reason === 'max_tokens') throw LiveAIError('truncated', 'The answer was cut off before it finished. Try a shorter input.');
  }

  function engine() { var m = meter(); return m && m.llm ? m.llm() : { provider: 'anthropic', model: MODEL }; }
  function viaOpenRouter() { return engine().provider === 'openrouter'; }
  function orCall(o, jsonSchema) {
    var m = meter(), started = Date.now(), content = o.prompt;
    if (o.documents && o.documents.length) {
      content = o.documents.map(function (d) { return { type: 'file', file: { filename: d.title || 'document.pdf', file_data: 'data:' + (d.mediaType || 'application/pdf') + ';base64,' + d.base64 } }; }).concat([{ type: 'text', text: o.prompt }]);
    }
    var messages = o.messages || [{ role: 'user', content: content }];
    return m.openrouter.chat({ app: api.app || inferApp(), model: engine().model, system: o.system, messages: messages, jsonSchema: jsonSchema, maxTokens: o.maxTokens || (jsonSchema ? 8000 : 4000), signal: o.signal })
      .then(function (r) {
        if (r.finish === 'content_filter') throw LiveAIError('refusal', 'The model declined this request.');
        if (r.finish === 'length') throw LiveAIError('truncated', 'The answer was cut off before it finished. Try a shorter input.');
        lastCall = { source: 'live-ai', model: r.model, provider: 'openrouter', fellBack: false, inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens, ms: Date.now() - started, at: new Date().toISOString() };
        return r;
      }, function (err) {
        if (err && err.name === 'ApiMeterBlocked') throw LiveAIError('blocked', 'Live AI is paused: ' + err.message + '.');
        throw err;
      });
  }

  function missingRequired(schema, data) {
    if (!schema || !schema.required || !data || typeof data !== 'object') return [];
    return schema.required.filter(function (k) { return !(k in data); });
  }

  var api = {
    get model() { return engine().model; },
    get provider() { return engine().provider; },
    available: function () { return !!sdk(); },
    app: null,
    isOn: function () { if (viaOpenRouter()) return !!meter() && meter().keys.has('openrouter') && !!engine().model; return !!currentKey() && !!sdk(); },
    hasStoredKey: function () { var m = meter(); if (m) return m.keys.remembered('anthropic'); try { return !!global.localStorage.getItem(STORE); } catch (e) { return false; } },
    configure: function (o) {
      var k = String((o && o.apiKey) || '').trim();
      if (!k) throw LiveAIError('invalid', 'Paste an API key first.');
      client = null; fallbacksOk = true;
      if (meter()) { meter().keys.set('anthropic', k, !!o.remember); emit(); return; }
      key = k;
      try { if (o.remember) global.localStorage.setItem(STORE, k); else global.localStorage.removeItem(STORE); } catch (e) {}
      emit();
    },
    clear: function () {
      key = null; client = null;
      if (meter()) meter().keys.clear('anthropic');
      try { global.localStorage.removeItem(STORE); } catch (e) {}
      emit();
    },
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    lastCall: function () { return lastCall; },

    json: function (o) {
      if (viaOpenRouter()) return orCall(o, o.schema).then(function (r) {
        var data, raw = String(r.text || '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
        try { data = JSON.parse(raw); } catch (e) { throw LiveAIError('format', 'The answer was not valid JSON, so nothing was applied.'); }
        var missing = missingRequired(o.schema, data);
        if (missing.length) throw LiveAIError('format', 'The answer was missing ' + missing.join(', ') + ', so nothing was applied.');
        return { data: data, provenance: lastCall };
      });
      var started = Date.now();
      var content = [];
      (o.documents || []).forEach(function (d) {
        content.push({ type: 'document', source: { type: 'base64', media_type: d.mediaType || 'application/pdf', data: d.base64 }, title: d.title });
      });
      content.push({ type: 'text', text: o.prompt });
      return send({
        max_tokens: o.maxTokens || 8000,
        system: o.system,
        output_config: { effort: o.effort || 'low', format: { type: 'json_schema', schema: o.schema } },
        messages: [{ role: 'user', content: content }]
      }, o.signal).then(function (res) {
        checkStop(res);
        var raw = textOf(res), data;
        try { data = JSON.parse(raw); } catch (e) { throw LiveAIError('format', 'The answer was not valid JSON, so nothing was applied.'); }
        var missing = missingRequired(o.schema, data);
        if (missing.length) throw LiveAIError('format', 'The answer was missing ' + missing.join(', ') + ', so nothing was applied.');
        lastCall = provenanceOf(res, started);
        return { data: data, provenance: lastCall };
      });
    },

    text: function (o) {
      if (viaOpenRouter()) return orCall(o, null).then(function (r) { return { text: r.text, provenance: lastCall }; });
      var started = Date.now();
      return send({
        max_tokens: o.maxTokens || 4000,
        system: o.system,
        output_config: { effort: o.effort || 'low' },
        messages: o.messages
      }, o.signal).then(function (res) {
        checkStop(res);
        lastCall = provenanceOf(res, started);
        return { text: textOf(res), provenance: lastCall };
      });
    },

    describe: function (err) {
      var A = sdk();
      if (!err) return 'Something went wrong.';
      if (err.name === 'LiveAIError') return err.message;
      if (err.name === 'ApiMeterBlocked') return 'Live AI is paused: ' + err.message + '.';
      if (viaOpenRouter() && err.status) {
        if (err.status === 401) return 'The OpenRouter key was rejected. Check it on the API monitor.';
        if (err.status === 402) return 'OpenRouter credits are exhausted for this key.';
        if (err.status === 429) return 'OpenRouter rate limit. Wait a moment and try again.';
        if (err.status === 400 || err.status === 404) return 'OpenRouter rejected the request: ' + err.message + '.';
        return 'OpenRouter error ' + err.status + ': ' + err.message;
      }
      if (err.name === 'AbortError' || (A && err instanceof A.APIUserAbortError)) return 'Cancelled.';
      if (A) {
        if (err instanceof A.AuthenticationError) return 'The API key was rejected. Check it and try again.';
        if (err instanceof A.PermissionDeniedError) return 'This API key is not allowed to use ' + MODEL + '.';
        if (err instanceof A.NotFoundError) return 'The model ' + MODEL + ' is not available to this API key.';
        if (err instanceof A.RateLimitError) return 'Rate limited. Wait a moment and try again.';
        if (err instanceof A.BadRequestError) return 'The request was rejected: ' + (err.message || 'bad request') + '.';
        if (err instanceof A.InternalServerError) return 'The API had a temporary problem. Try again.';
        if (err instanceof A.APIConnectionError) return 'Could not reach the API. Check your connection.';
        if (err instanceof A.APIError) return 'API error ' + (err.status || '') + ': ' + err.message;
      }
      return err.message || String(err);
    },

    renderSettings: function (el, o) {
      var fr = o && o.lang === 'fr';
      var t = fr ? {
        title: 'IA en direct (optionnelle)', on: 'Activée', off: 'Désactivée',
        body: 'Par défaut, la démo utilise des règles déterministes, sans réseau. Avec votre propre clé API Anthropic, certaines étapes peuvent être analysées par ' + MODEL + '. Les résultats passent toujours par votre approbation.',
        warn: 'Votre texte est envoyé à l’API Anthropic et facturé à votre compte. Utilisez une clé à plafond bas. Rien n’est envoyé sans clé.',
        label: 'Clé API', remember: 'Mémoriser sur cet appareil (stockage local de ce navigateur)', save: 'Activer', clear: 'Retirer la clé', saved: 'IA en direct activée.', removed: 'Clé retirée.'
      } : {
        title: 'Live AI (optional)', on: 'On', off: 'Off',
        body: 'By default the demo runs on deterministic rules with no network. With your own Anthropic API key, some steps can be read by ' + MODEL + ' instead. Results still go through your approval.',
        warn: 'Your text is sent to the Anthropic API and billed to your account. Use a key with a low spend limit. Nothing is sent without a key.',
        label: 'API key', remember: 'Remember on this device (this browser’s local storage)', save: 'Turn on', clear: 'Remove key', saved: 'Live AI is on.', removed: 'Key removed.'
      };
      var on = api.isOn();
      el.innerHTML =
        '<div class="lai">' +
        '<p class="lai-head"><strong>' + t.title + '</strong> <span class="lai-state" data-on="' + on + '">' + (on ? t.on : t.off) + '</span></p>' +
        '<p class="lai-body">' + t.body + '</p><p class="lai-warn">' + t.warn + '</p>' +
        (api.available() ? '' : '<p class="lai-warn">SDK not loaded.</p>') +
        '<form class="lai-form"><label>' + t.label + '<input type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" name="k"></label>' +
        '<label class="lai-check"><input type="checkbox" name="r"' + (api.hasStoredKey() ? ' checked' : '') + '> ' + t.remember + '</label>' +
        '<div class="lai-actions"><button type="submit">' + t.save + '</button>' + (on ? '<button type="button" data-lai="clear">' + t.clear + '</button>' : '') + '</div>' +
        '<p class="lai-msg" role="status" aria-live="polite"></p></form></div>';
      var form = el.querySelector('form'), msg = el.querySelector('.lai-msg');
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        try { api.configure({ apiKey: form.k.value, remember: form.r.checked }); api.renderSettings(el, o); el.querySelector('.lai-msg').textContent = t.saved; }
        catch (e) { msg.textContent = api.describe(e); }
      });
      var c = el.querySelector('[data-lai="clear"]');
      if (c) c.addEventListener('click', function () { api.clear(); api.renderSettings(el, o); el.querySelector('.lai-msg').textContent = t.removed; });
    }
  };

  if (meter()) meter().onChange(function () { client = null; emit(); });
  global.LiveAI = api;
})(window);
