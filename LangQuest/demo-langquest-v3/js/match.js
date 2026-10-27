/* LangQuest V3 — deterministic meaning matcher and transcript comparison.
   This stands in for the production AI evaluator. It checks a learner's words against
   accepted phrasings for an intent (so paraphrases pass and negations fail). It never
   produces a pronunciation score. */
'use strict';
(function () {
  const M = LQ.match = {};
  M.norm = (s) => {
    let t = String(s || '').toLowerCase();
    t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');            // fold Latin diacritics
    t = t.replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا'); // Arabic: strip harakat/tatweel, unify alef
    t = t.replace(/[’'`´]/g, '').replace(/[¿?¡!.,;:«»“”"()…\-–—、。！？「」・\/]/g, ' ');
    t = t.replace(/([a-z0-9])([^\sa-z0-9])/g, '$1 $2').replace(/([^\sa-z0-9])([a-z0-9])/g, '$1 $2'); // split script runs
    return ' ' + t.replace(/\s+/g, ' ').trim() + ' ';
  };
  const latin = p => /^[a-z0-9 ]+$/.test(p);
  M.has = (normText, pattern) => {
    const p = M.norm(pattern).trim();
    if (!p) return false;
    const shortRtl = p.length <= 2 && /[֐-ۿ]/.test(p); // e.g. Arabic "لا" must be a whole word
    return (latin(p) || shortRtl) ? normText.includes(' ' + p + ' ') : normText.includes(p);
  };
  /* Pack intents (template missions): distinctive words of a concept's phrasings, computed
     against the sibling concepts of the same phrase set, so "kahawa" orders coffee and "chai" tea. */
  const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
  const toks = (s) => { const n = M.norm(s).trim(); if (!n) return []; return n.split(' ').flatMap(w => CJK.test(w) ? Array.from(w).filter(ch => !/[をはがのにでもよねかぁ-ぉっ]/.test(ch) || false) : [w]).filter(w => w.length >= 2 || CJK.test(w)); };
  const distinct = {};
  M.packTokens = (id) => {
    if (distinct[id]) return distinct[id];
    const def = LQ.PK[id]; if (!def) return null;
    const others = new Set();
    Object.values(LQ.PK).filter(d => d.gid === def.gid && d.concept !== def.concept).forEach(d => d.variants.forEach(v => toks(String(v).replace('{name}', '')).forEach(t => others.add(t))));
    const own = new Set(); def.variants.forEach(v => toks(String(v).replace('{name}', '')).forEach(t => own.add(t)));
    const d = Array.from(own).filter(t => !others.has(t));
    return (distinct[id] = { distinct: d, whole: def.variants.map(v => M.norm(String(v).replace('{name}', '')).trim()).filter(Boolean) });
  };
  M.resetPackCache = (gid) => { Object.keys(distinct).forEach(k => { if (!gid || LQ.PK[k] && LQ.PK[k].gid === gid) delete distinct[k]; }); };
  function packIntent(id, text) {
    const def = LQ.PK[id], tk = M.packTokens(id), n = M.norm(text);
    if (def.concept === 'name') { const nm = M.norm((LQ.store && LQ.store.state.learner.name) || '').trim(); if (nm && n.includes(' ' + nm + ' ')) return { ok: true, matched: [nm] }; }
    const whole = tk.whole.find(w => w && n.includes(CJK.test(w) ? w : ' ' + w + ' '));
    if (whole) return { ok: true, matched: [whole] };
    const hit = tk.distinct.filter(t => CJK.test(t) ? n.includes(t) : M.has(n, t));
    const need = tk.distinct.length >= 4 ? 2 : 1;
    return { ok: tk.distinct.length > 0 && hit.length >= need, matched: hit };
  }
  /* Returns {ok, matched:[patterns], blockedBy} */
  M.intent = (intentId, text) => {
    if (LQ.PK && LQ.PK[intentId]) return packIntent(intentId, text);
    const def = LQ.INTENTS[intentId] || LQ.REPAIR[intentId];
    if (!def) return { ok: false, matched: [] };
    const n = M.norm(text);
    if (def.not) { const b = def.not.find(p => M.has(n, p)); if (b) return { ok: false, matched: [], blockedBy: b }; }
    const matched = (def.any || []).filter(p => M.has(n, p));
    let ok = matched.length > 0;
    if (def.all) ok = ok && def.all.every(group => group.some(p => M.has(n, p)));
    return { ok, matched };
  };
  M.repair = (text, gid) => {
    // "What?" or "sorry?" is a repair; a long sentence that happens to contain "what" is not.
    const short = M.norm(text).trim().split(' ').filter(Boolean).length <= 4;
    for (const k of ['dunno', 'slower', 'repeat']) { if (k !== 'slower' && !short) continue; const r = M.intent(k, text); if (r.ok) return { kind: k, matched: r.matched }; }
    if (gid && LQ.PK && LQ.PK['pk:' + gid + ':slower'] && packIntent('pk:' + gid + ':slower', text).ok) return { kind: 'slower', matched: ['pack'] };
    return null;
  };
  /* Clause segmentation: a learner turn can carry two requests ("Un té, por favor. ¿Cuánto es?").
     Splits after sentence punctuation and before Spanish opening marks; commas stay inside. */
  M.segments = (text) => String(text || '').split(/(?<=[.!?;。！？؟।])\s*|\s*(?=[¿¡])/).map(x => x.trim()).filter(x => x && /[^\s.!?;¿¡。！？؟,،、]/.test(x));
  /* Where in the text an intent matched (index of its earliest matched pattern), for ordering. */
  M.position = (text, matched) => {
    const n = M.norm(text); let best = Infinity;
    (matched || []).forEach(m => { const p = M.norm(m).trim(); if (!p) return; const i = latin(p) ? n.indexOf(' ' + p + ' ') : n.indexOf(p); if (i >= 0 && i < best) best = i; });
    return best === Infinity ? 0 : best;
  };
  /* Slot filling: what the learner put where a template has {name}. Accent- and case-insensitive
     on the fixed words, but the captured value keeps the learner's own spelling. */
  const fold = ch => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace('ß', 'ss');
  const escRe = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const PUNCT = '\\s,.!?;:¿¡«»“”"()…、。！？؟،।॥·';
  M.slot = (template, text, slot) => {
    slot = slot || 'name';
    const t = String(template || ''), mark = '{' + slot + '}', i = t.indexOf(mark);
    if (i < 0 || !text) return null;
    let folded = '', map = [];
    Array.from(String(text)).forEach((ch, k, arr) => { const f = fold(ch); for (const c of f) { folded += c; map.push(arr.slice(0, k).join('').length); } });
    const words = x => Array.from(x).map(fold).join('').replace(new RegExp('[' + PUNCT + ']+', 'g'), ' ').trim().split(' ').filter(Boolean).map(escRe);
    const before = words(t.slice(0, i)), after = words(t.slice(i + mark.length));
    const gap = '[' + PUNCT + ']*';
    const re = new RegExp((before.length ? before.join(gap) + gap : '(?:^|[' + PUNCT + '])') + '([^' + PUNCT + ']+?)' + (after.length ? gap + after.join(gap) : '(?=[' + PUNCT + ']|$)'), 'u');
    const m = re.exec(folded); if (!m) return null;
    const start = folded.indexOf(m[1], m.index), end = start + m[1].length;
    const src = String(text), a = map[start], b = end < map.length ? map[end] : src.length;
    const val = src.slice(a, b).trim();
    return val && val.length <= 30 ? val : null;
  };
  /* A pack match is ambiguous when everything it matched also occurs in a sibling phrase, e.g.
     Swedish "tack" (thanks) inside "Lite långsammare, tack": it can't count as a second request. */
  M.ambiguous = (id, matched) => {
    const def = LQ.PK && LQ.PK[id]; if (!def || !matched || !matched.length) return false;
    const sib = Object.values(LQ.PK).filter(d => d.gid === def.gid && d.concept !== def.concept).flatMap(d => d.variants.map(v => M.norm(String(v).replace('{name}', ''))));
    return matched.every(mt => { const n = M.norm(mt).trim(); return n && sib.some(sv => CJK.test(n) ? sv.includes(n) : sv.includes(' ' + n + ' ')); });
  };
  /* The name a learner gave for a pack "my name is" intent, or null. */
  M.slotFor = (intentId, text, extraTemplates) => {
    const def = LQ.PK && LQ.PK[intentId];
    const tpls = (def ? def.variants : []).concat(extraTemplates || []).filter(v => /\{name\}/.test(v));
    for (const tp of tpls) { const v = M.slot(tp, text); if (v) return v; }
    return null;
  };
  /* The verdict object every evaluator (rules or live AI) returns for one learner turn. */
  M.verdict = (expects, text) => {
    const hit = (expects || []).map(x => ({ x, r: M.intent(x.intent, text) })).find(y => y.r.ok);
    return { source: 'rules', intent: hit ? hit.x.intent : null, ok: !!hit, confidence: hit ? 'high' : 'low', matched: hit ? hit.r.matched : [], explanation: hit ? 'Matched accepted phrasing: ' + hit.r.matched.slice(0, 3).join(', ') : 'No accepted phrasing matched.' };
  };
  /* Word alignment between a target phrase and what the recognizer heard (LCS on normalised tokens).
     Returns target tokens tagged heard/missed plus extra heard words. Script-agnostic: for
     unspaced scripts it compares characters. */
  M.compare = (target, heard) => {
    const nt = M.norm(target).trim(), nh = M.norm(heard).trim();
    const spaced = /\s/.test(nt) || latin(nt);
    const a = spaced ? nt.split(' ').filter(Boolean) : Array.from(nt.replace(/\s/g, ''));
    const b = spaced ? nh.split(' ').filter(Boolean) : Array.from(nh.replace(/\s/g, ''));
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = [], extra = [];
    let i = 0, j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { out.push({ w: a[i], heard: true }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ w: a[i], heard: false }); i++; }
      else { extra.push(b[j]); j++; }
    }
    while (i < a.length) out.push({ w: a[i++], heard: false });
    while (j < b.length) extra.push(b[j++]);
    const heardCount = out.filter(x => x.heard).length;
    return { tokens: out, extra, heardCount, total: a.length, spaced };
  };
})();
