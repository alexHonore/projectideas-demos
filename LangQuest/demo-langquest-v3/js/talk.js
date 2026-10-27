/* LangQuest V3 — free conversation with a character, in every course.
   Rules mode (default): a scoped, honest engine built from the course phrase pack. It knows
   greetings, how-are-you, names, coffee or tea, prices, directions, slowing down, thanks and
   goodbye; anything else gets a polite "sorry?" and suggestions.
   Live AI mode (your key): an open conversation in character, in the course's variety, with
   gentle corrections and phrases to save. Both return the same object; neither scores speech. */
'use strict';
(function () {
  const V = LQ.views, U = LQ.ui, S = LQ.store, A = LQ.art, C = LQ.cap, esc = U.esc, ic = U.icon;
  const TK = LQ.talk = { s: null };
  const ORDER = ['name', 'hello', 'fine', 'tea', 'coffee', 'howmuch', 'where', 'thanks', 'bye'];
  const NEXT = { start: ['hello', 'coffee', 'where'], hello: ['fine', 'name'], fine: ['name', 'coffee'], name: ['coffee', 'where', 'bye'], coffee: ['howmuch', 'thanks'], tea: ['howmuch', 'thanks'], howmuch: ['thanks', 'bye'], where: ['thanks', 'slower'], thanks: ['bye', 'where'], bye: ['hello'], slower: ['thanks'], none: ['hello', 'coffee', 'where'] };
  const REPLY = { hello: 'c_howareyou', fine: 'c_name', name: 'c_nice', coffee: 'c_here', tea: 'c_here', howmuch: 'c_price', where: 'c_way', thanks: 'c_welcome', bye: 'bye' };

  /* Who you talk to: the course's recurring character if it has one, else the pack's local. */
  TK.partner = (tid) => {
    const ch = Object.entries(LQ.CHARACTERS).find(([k, c]) => c.track === tid);
    const t = LQ.trackById(tid), pk = LQ.PACKS[tid] || {};
    if (ch) return { id: ch[0], name: ch[1].name.split(' ')[0], full: ch[1].name, role: U.L(ch[1].role, 'en'), character: ch[0] };
    if (pk.character && LQ.CHARACTERS[pk.character]) { const c = LQ.CHARACTERS[pk.character]; return { id: pk.character, name: c.name.split(' ')[0], full: c.name, role: U.L(c.role, 'en'), character: pk.character }; }
    const l = t.local || { name: 'A neighbour', role: 'who lives nearby' };
    return { id: 'local', name: l.name, full: l.name, role: l.role, character: null };
  };
  const toP = (x) => ({ target: U.nm(x.t), romanization: U.nm(x.r || ''), meaning: U.nm(x.mm) });
  const asMM = (tid, p) => p ? { t: p.t, r: p.r || '', mm: U.L(p.m, S.source(tid)) } : null;
  const pack = (tid, c) => asMM(tid, LQ.packPhrase(tid, c));

  /* Find up to two intents, in the order the learner said them. Clauses are split at sentence
     punctuation; inside a clause, distinct pack words ("té" vs "café") still tell concepts apart. */
  TK.detect = (tid, text) => {
    const M = LQ.match, found = [];
    const add = (c, matched, at) => { const pos = at != null ? at : M.position(text, matched); const f = found.find(x => x.c === c); if (f) { if (pos < f.pos) f.pos = pos; return; } found.push({ c, pos, matched, seg: text }); };
    // whole turn and each clause; positions are always measured on the whole turn
    [text].concat(M.segments(text)).forEach(seg => {
      ORDER.forEach(c => { const id = 'pk:' + tid + ':' + c; if (!LQ.PK[id]) return; const r = M.intent(id, seg); if (r.ok) add(c, r.matched); });
      const rp = M.repair(seg, tid); if (rp) add('slower', rp.matched[0] === 'pack' ? [] : rp.matched, text.indexOf(seg) >= 0 ? M.norm(text.slice(0, text.indexOf(seg))).length : 0);
    });
    // a word that also belongs to another phrase ("tack" in "…, tack") isn't a second request
    const list = found.sort((a, b) => a.pos - b.pos);
    const keep = list.filter(h => h.c === 'slower' || !M.ambiguous('pk:' + tid + ':' + h.c, h.matched));
    return (keep.length ? keep : list.slice(0, 1)).sort((a, b) => a.pos - b.pos).slice(0, 2);
  };

  /* Rule engine: returns the same structure the live AI must return. */
  TK.rules = (tid, text, s) => {
    const src = S.source(tid), hits = TK.detect(tid, text), parts = [], glosses = [];
    let item = (s && s.item) || null, slow = false, name = null;
    hits.forEach((h, k) => {
      const c = h.c;
      if (c === 'slower') { if (hits.length === 1) { const last = (s.log || []).slice().reverse().find(e => e.who === 'char'); if (last) parts.push({ t: last.p.target, r: last.p.romanization, mm: last.p.meaning }); slow = true; } glosses.push(U.L(LQ.CONCEPTS.slower, src)); return; }
      if (c === 'name') name = LQ.match.slotFor('pk:' + tid + ':name', text) || ((S.state.learner.name && LQ.match.norm(text).includes(' ' + LQ.match.norm(S.state.learner.name).trim() + ' ')) ? S.state.learner.name : null);
      if (c === 'coffee' || c === 'tea') item = c;
      glosses.push(U.L(LQ.fillSlots({ m: LQ.CONCEPTS[c] }, { name: name || S.state.learner.name || '…' }).m, src));
      let rp;
      if (c === 'hello' && hits.length > 1) rp = LQ.packPhrase(tid, 'hello');            // a greeting that opens a longer turn gets a greeting back
      else if (c === 'howmuch') rp = LQ.packPrice(tid, item);
      else if (c === 'name') rp = LQ.withName(LQ.packPhrase(tid, 'c_nice'), name, tid);
      else rp = LQ.packPhrase(tid, REPLY[c]);
      const mm = asMM(tid, rp); if (mm && !parts.some(x => x.t === mm.t)) parts.push(mm);
    });
    if (!parts.length) parts.push(pack(tid, 'c_sorry'));
    const reply = { t: parts.map(x => x.t).join(' '), r: parts.some(x => x.r) ? parts.map(x => x.r || x.t).join(' ') : '', mm: parts.map(x => x.mm).join(' ') };
    const last = hits.length ? hits[hits.length - 1].c : 'none';
    const sug = (NEXT[last] || NEXT.none).map(c => pack(tid, c)).filter(Boolean).map(toP);
    return { reply: toP(reply), understood: hits.length > 0, learner_meaning: glosses.join(' + '), correction: '', suggestions: sug, slow, concept: hits.map(h => h.c).join('+') || null, item, name };
  };
  const P3 = { type: 'object', properties: { target: { type: 'string' }, romanization: { type: 'string' }, meaning: { type: 'string' } }, required: ['target', 'romanization', 'meaning'], additionalProperties: false };
  TK.schema = { type: 'object', properties: { reply: P3, understood: { type: 'boolean' }, learner_meaning: { type: 'string' }, correction: { type: 'string' }, suggestions: { type: 'array', items: P3 } }, required: ['reply', 'understood', 'learner_meaning', 'correction', 'suggestions'], additionalProperties: false };
  TK.system = (tid) => {
    const t = LQ.trackById(tid), pt = TK.partner(tid), src = S.srcName(S.source(tid)), nonLatin = t.script !== 'Latn';
    return LQ.ai.context(tid) + ' You are ' + pt.full + ', ' + pt.role + ', in ' + t.city + '. Stay in character in a short, friendly, everyday conversation with the learner, who is called ' + (S.state.learner.name || 'Alex') + '. ' +
      'Write reply.target only in ' + t.name + ' (' + t.variety + '): one or two short sentences a beginner can follow. ' + (nonLatin ? 'Put a learner-friendly romanization in reply.romanization. ' : 'Leave reply.romanization empty. ') +
      'reply.meaning and learner_meaning are in ' + src + '. understood says whether you could tell what the learner meant. ' +
      'If the learner’s words blur or change their meaning, give one gentle correction in ' + src + ' that quotes the better ' + t.name + ' phrasing; otherwise leave correction empty. Never correct accents, pronunciation or spelling of sounds: you only see text. ' +
      'Offer one to three short suggestions the learner could say next, in ' + t.name + ' with meanings in ' + src + '. If the learner writes in another language, answer in ' + t.name + ' anyway and show how to say it in a suggestion.';
  };
  TK.prompt = (s, text) => s.log.slice(-12).map(e => e.who === 'char' ? TK.partner(s.tid).name + ': ' + e.p.target + (e.p.meaning ? ' (' + e.p.meaning + ')' : '') : 'Learner: ' + e.text).join('\n') + '\nLearner: ' + text + '\n\nReply in character.';

  function start(tid) {
    const pt = TK.partner(tid), open = pack(tid, 'hello');
    TK.s = { tid, partner: pt.id, log: [{ who: 'char', p: toP(open), prov: { source: 'rules' } }], suggestions: TK.rules(tid, '', { log: [] }).suggestions, pending: false, turns: 0, at: S.today() };
    S.event('talk.started', 'Free conversation with ' + pt.name + ' (' + LQ.trackById(tid).name + ', ' + (LQ.ai.on() ? 'live AI' : 'rules') + ')');
  }
  function send(a) {
    const s = TK.s; if (!s || s.pending) return;
    const text = (a.text || '').trim(); if (!text) { LQ.app.render(); return; }
    const entry = { who: 'me', text, mode: a.mode }; s.log.push(entry); s.turns++;
    if (s.turns === 3) S.award('talk:' + s.tid + ':' + S.today(), 10, 'Free conversation with ' + TK.partner(s.tid).name, s.tid);
    const finish = (res, prov, why) => {
      if (res.item) s.item = res.item; if (res.name) s.name = res.name;
      entry.understood = res.understood; entry.meaning = res.learner_meaning; entry.correction = res.correction || ''; entry.prov = prov;
      s.log.push({ who: 'char', p: res.reply, prov, slow: res.slow, note: why || null });
      s.suggestions = (res.suggestions || []).slice(0, 3); s.pending = false;
      LQ.app.render(); S.save();
      const t = LQ.trackById(s.tid); U.say({ t: res.reply.target, r: res.reply.romanization }, { track: t, character: TK.partner(s.tid).character, slow: res.slow });
    };
    if (LQ.ai.on()) {
      s.pending = true; LQ.app.render();
      LQ.ai.json({ task: 'Free conversation turn', system: TK.system(s.tid), prompt: TK.prompt(s, text), schema: TK.schema, maxTokens: 700, extraCheck: d => d.reply && d.reply.target && d.reply.target.trim() ? [] : ['reply.target is empty'] })
        .then(r => { if (TK.s !== s) return; finish(r.data, r.provenance); })
        .catch(err => { if (TK.s !== s) return; const res = TK.rules(s.tid, text, s); finish(res, { source: 'fallback', error: err.described || LQ.ai.describe(err) }, 'Live AI failed (' + (err.described || LQ.ai.describe(err)) + '). This reply comes from the rules.'); });
    } else finish(TK.rules(s.tid, text, s), { source: 'rules' });
  }
  TK.send = send;

  V.talk = (tid) => {
    tid = tid && LQ.trackById(tid) ? tid : S.state.active;
    const t = LQ.trackById(tid), e = S.enr(tid);
    if (!e) return V.header() + '<main class="ob" id="main"><h1 class="h2">Enroll in ' + esc(t.name) + ' first</h1><a class="btn btn--primary btn--block" href="#/course/' + tid + '">Set up ' + esc(t.name) + '</a></main>';
    if (!TK.s || TK.s.tid !== tid) start(tid);
    const s = TK.s, pt = TK.partner(tid), live = LQ.ai.on(), src = S.source(tid);
    C.on('talkfree', a => send(a));
    if (!C.srUsable() && C.typing.talkfree === undefined) C.typing.talkfree = true;
    const port = pt.character ? A.portrait(pt.character, s.pending ? 'thinking' : 'talking', { size: 56 }) : A.portrait(A.localLook(t), s.pending ? 'thinking' : 'talking', { size: 56, look: A.localLook(t), name: pt.name });
    let h = '<main class="lesson lesson--free" id="main"><header class="lhead"><a class="iconbtn" href="#/speak" aria-label="Leave the conversation">' + ic('close') + '</a><div class="lhead__t"><span class="small muted">' + esc(t.name) + ', from ' + esc(S.srcName(src)) + '</span><h1 class="lhead__h">Talk freely with ' + esc(pt.name) + '</h1></div>' + (live ? LQ.ai.badge({ source: 'live-ai', model: LQ.ai.MODEL, ms: 0 }).replace(/ · 0\.0 s/, '') : LQ.ai.badge(null)) + '</header>' +
      '<div class="lscene">' + A.scene(t.id === 'es-spain' ? 'madrid-cafe' : 'kiosk', { palette: A.plazaPalette(t) }) + '<div class="lscene__who">' + port + '<span class="live" role="status">' + (s.pending ? esc(pt.name) + ' is thinking' : 'Your turn') + '</span></div></div>' +
      '<section class="lbody">';
    h += live ? '<p class="scope scope--ai">' + ic('cpu', 'ic--sm') + '<span><strong>Open conversation, live AI.</strong> ' + esc(pt.name) + ' answers in ' + esc(t.variety) + ' through ' + LQ.ai.MODEL + ' on your key. Corrections are suggestions; nothing is graded, and it never judges pronunciation: it only sees text.</span></p>'
      : '<p class="scope">' + ic('info', 'ic--sm') + '<span><strong>Rules mode, scoped on purpose.</strong> ' + esc(pt.name) + ' understands greetings, your name, coffee or tea, prices, directions, “slower”, thanks and goodbye; anything else gets a polite “sorry?”. ' + esc(window.LiveAI && LiveAI.isOn() ? LQ.ai.why() : 'Add your own key in the Test lab for an open conversation.') + '</span></p>';
    h += '<ol class="log" role="log" aria-label="Conversation">' + s.log.map((x, i) => {
      if (x.who === 'char') { const ph = { t: x.p.target, r: x.p.romanization, m: x.p.meaning }; const saved = LQ.notebook.hasLine(tid, ph); return '<li class="msg msg--char"><span class="msg__who">' + esc(pt.name) + (x.slow ? ' (slowly)' : '') + ' ' + LQ.ai.badge(x.prov) + '</span><div class="msg__b">' + U.phrase(ph, { track: t }) + '<span class="gloss">' + esc(x.p.meaning) + '</span></div>' + (x.note ? '<p class="small muted">' + esc(x.note) + '</p>' : '') + '<div class="msg__tools"><button class="ltool" data-act="free-play" data-arg="' + i + '" aria-label="Replay this line">' + ic('replay', 'ic--xs') + '</button><button class="ltool" data-act="free-save" data-arg="' + i + '" aria-pressed="' + saved + '" aria-label="' + (saved ? 'Saved to your notebook' : 'Save this line to your notebook') + '">' + ic(saved ? 'check' : 'bookmark', 'ic--xs') + '</button></div></li>'; }
      return '<li class="msg msg--me"><div class="msg__b" dir="auto">' + esc(x.text) + '</div><span class="msg__meta">' + esc({ speech: 'spoken', typed: 'typed', suggested: 'suggested reply' }[x.mode] || x.mode) + '</span>' + (x.understood === true ? '<span class="eval">' + ic('check', 'ic--xs') + 'Understood' + (x.meaning ? ': ' + esc(x.meaning) : '') + '</span>' : x.understood === false ? '<span class="eval eval--miss">' + ic('info', 'ic--xs') + 'Not understood' + (x.prov && x.prov.source === 'rules' ? ' (outside what rules mode knows)' : '') + '</span>' : '') + (x.correction ? '<p class="correction">' + ic('bulb', 'ic--xs') + '<span>' + esc(x.correction) + '</span></p>' : '') + '</li>';
    }).join('') + (s.pending ? '<li class="msg msg--note">' + ic('cpu', 'ic--xs') + '<span>' + esc(pt.name) + ' is answering (live AI)…</span></li>' : '') + '</ol>';
    if (s.suggestions.length && !s.pending) h += '<div class="sugbox"><p class="small muted">You could say (tap to use, or save it):</p><ul class="sugsave" role="list">' + s.suggestions.map((g, i) => { const ph = { t: g.target, r: g.romanization, m: g.meaning }; const saved = LQ.notebook.hasLine(tid, ph); return '<li><button class="sug" data-act="free-suggest" data-arg="' + i + '" dir="auto">' + esc(g.target) + (g.romanization && g.romanization !== g.target ? ' <span class="muted">' + esc(g.romanization) + '</span>' : '') + '</button><span class="small muted">' + esc(g.meaning) + '</span><button class="ltool" data-act="free-sug-save" data-arg="' + i + '" aria-pressed="' + saved + '" aria-label="' + (saved ? 'Saved' : 'Save “' + esc(g.target) + '” to your notebook') + '">' + ic(saved ? 'check' : 'bookmark', 'ic--xs') + '</button></li>'; }).join('') + '</ul></div>';
    const cp = C.parts('talkfree', { lang: U.srLocale(t, e), langName: t.name, allowSelf: false, allowRecord: false, label: C.srUsable() ? 'Tap and answer' : 'Type your answer' });
    h += '<div class="dock dock--free"><div class="dock__mic cap cap--compact' + (cp.active ? ' is-' + cp.active : '') + '">' + cp.mic + '</div><div class="dock__extra cap">' + cp.extra + '</div></div>' +
      '<div class="lfoot lfoot--talk"><button class="linkbtn" data-act="free-restart">' + ic('refresh', 'ic--xs') + 'Start over</button><a class="linkbtn" href="#/notebook">' + ic('bookmark', 'ic--xs') + 'Notebook</a></div>' +
      '<p class="fineprint">Free conversation isn’t assessed: it records no skill evidence and no score. Phrases are demo-authored, not native-reviewed.</p></section></main>';
    return h;
  };

  const act = LQ.talkActs = {};
  act['free-play'] = el => { const x = TK.s.log[+el.dataset.arg]; if (x && x.p) U.say({ t: x.p.target, r: x.p.romanization }, { track: LQ.trackById(TK.s.tid), character: TK.partner(TK.s.tid).character }); };
  act['free-save'] = el => { const x = TK.s.log[+el.dataset.arg]; if (x && x.p) LQ.notebook.saveLine(TK.s.tid, { t: x.p.target, r: x.p.romanization, m: x.p.meaning }, 'free talk with ' + TK.partner(TK.s.tid).name); };
  act['free-sug-save'] = el => { const g = TK.s.suggestions[+el.dataset.arg]; if (g) LQ.notebook.saveLine(TK.s.tid, { t: g.target, r: g.romanization, m: g.meaning }, 'free talk with ' + TK.partner(TK.s.tid).name); };
  act['free-suggest'] = el => { const g = TK.s.suggestions[+el.dataset.arg]; if (g) send({ mode: 'suggested', text: g.target }); };
  act['free-restart'] = () => { TK.s = null; LQ.speech.cancel(); LQ.app.render(true); };
})();
