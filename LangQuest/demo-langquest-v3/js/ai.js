/* LangQuest V3 — optional live AI, layered on the vendored LiveAI adapter (vendor/live-ai.js).
   Off by default. Every live answer must come back in the same structure the rule engine
   produces; it is validated here, badged with its provenance, and only ever proposed: the
   learner or editor accepts it. Any failure falls back to the rules, and the UI says so. */
'use strict';
(function () {
  const AI = LQ.ai = {};
  const S = LQ.store, U = LQ.ui, esc = U.esc;
  const LA = () => window.LiveAI || null;
  AI.MODEL = 'claude-opus-5-5';

  /* Is a live call allowed right now? Key configured, Test-lab toggle on, not offline. */
  AI.on = () => { const la = LA(); return !!(la && la.isOn() && S.state.caps.liveAI !== false && !S.cap('offline')); };
  AI.why = () => {
    const la = LA();
    if (!la || !la.available()) return 'The live AI library didn’t load, so rules are used.';
    if (S.cap('offline')) return 'Offline (Test lab), so the rules run on this device.';
    if (S.state.caps.liveAI === false) return 'Live AI is switched off in the Test lab, so rules are used.';
    if (!la.isOn()) return 'No API key: deterministic rules run on this device. Add your own key in the Test lab to try live AI.';
    return '';
  };
  /* Provenance badge: "Rules" or "Live AI · claude-opus-5-5 · 2.1 s". */
  AI.badge = (prov) => {
    if (prov && prov.source === 'live-ai') return '<span class="prov prov--ai" title="Proposed by live AI. Nothing is applied until you accept it.">Live AI · ' + esc(prov.model || AI.MODEL) + ' · ' + ((prov.ms || 0) / 1000).toFixed(1) + ' s' + (prov.fellBack ? ' (fallback model)' : '') + '</span>';
    if (prov && prov.source === 'fallback') return '<span class="prov prov--fb" title="' + esc(prov.error || '') + '">Rules (live AI failed)</span>';
    return '<span class="prov">Rules</span>';
  };

  /* Structural validation beyond schema.required: types, enums, nested objects and arrays. */
  function check(schema, v, path, errs) {
    if (!schema) return;
    const types = [].concat(schema.type || []);
    const t = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v;
    if (types.length && !types.some(x => x === t || (x === 'number' && t === 'integer'))) { errs.push(path + ' should be ' + types.join(' or ') + ', got ' + t); return; }
    if (schema.enum && !schema.enum.includes(v)) { errs.push(path + ' must be one of ' + schema.enum.join(', ')); return; }
    if (t === 'object' && schema.properties) {
      (schema.required || []).forEach(k => { if (!(k in v)) errs.push(path + '.' + k + ' is missing'); });
      Object.entries(schema.properties).forEach(([k, s]) => { if (k in v) check(s, v[k], path + '.' + k, errs); });
    }
    if (t === 'array' && schema.items) v.forEach((x, i) => check(schema.items, x, path + '[' + i + ']', errs));
    if ((t === 'number' || t === 'integer') && schema.minimum != null && v < schema.minimum) errs.push(path + ' is below ' + schema.minimum);
    if ((t === 'number' || t === 'integer') && schema.maximum != null && v > schema.maximum) errs.push(path + ' is above ' + schema.maximum);
  }
  AI.validate = (schema, data) => { const errs = []; check(schema, data, 'answer', errs); return errs; };

  let seq = 0;
  /* json(): LiveAI.json plus our own validation. Rejects with a plain-language message. */
  AI.json = (o) => {
    if (!AI.on()) return Promise.reject(Object.assign(new Error(AI.why() || 'Live AI is off.'), { name: 'LiveAIError', code: 'off' }));
    const id = ++seq, t0 = Date.now();
    S.event('ai.requested', o.task + ' sent to ' + AI.MODEL + ' (your key)');
    return LA().json({ system: o.system, prompt: o.prompt, schema: o.schema, effort: o.effort || 'low', maxTokens: o.maxTokens || 900, signal: o.signal }).then(res => {
      const errs = AI.validate(o.schema, res.data);
      if (o.extraCheck) errs.push.apply(errs, o.extraCheck(res.data) || []);
      if (errs.length) throw Object.assign(new Error('The live AI answer didn’t match the structure the app needs (' + errs.slice(0, 2).join('; ') + ').'), { name: 'LiveAIError', code: 'shape' });
      S.event('ai.answered', o.task + ': answer validated in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s (proposal only)');
      return res;
    }).catch(err => {
      const msg = AI.describe(err);
      S.event('ai.failed', o.task + ': ' + msg + ' Rules used instead.');
      throw Object.assign(err, { described: msg });
    }).finally(() => { if (id === seq) S.save(); });
  };
  AI.describe = (err) => { const la = LA(); if (err && err.name === 'LiveAIError') return err.message; return la ? la.describe(err) : (err && err.message) || 'Something went wrong.'; };

  /* Fictional context shared by every system prompt. */
  AI.context = (tid) => {
    const t = LQ.trackById(tid), e = S.enr(tid) || {}, reg = t.regions && e.region ? t.regions.find(r => r.id === e.region) : null;
    return 'You are part of LangQuest, a fictional demo language app (demo date ' + S.fmtDay(S.today(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + '). All people and places are fictional. ' +
      'Course: ' + t.name + '. Spoken variety: ' + (reg ? reg.label + ', ' : '') + t.variety + ' (internal ID ' + t.internal + '). Script: ' + LQ.SCRIPT_NAMES[t.script] + '. City setting: ' + t.city + '. ' +
      'Never switch to a neighbouring variety or standard form (for example, Moroccan Darija is never Modern Standard Arabic; Cantonese is never Mandarin). ' +
      'The learner is a beginner (CEFR A1). Their instruction language is ' + S.srcName(e.source || S.state.defaultSource) + '. ' +
      'Never comment on pronunciation, accent or sound quality, and never give scores, percentages or grades: you only see text.';
  };
})();
