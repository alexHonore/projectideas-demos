/* LangQuest V3 — mission player: the connected learn → speak → remember loop.
   Context listening → model phrases → Pimsleur anticipation → branching role-play → feedback. */
'use strict';
(function () {
  const LS = LQ.lesson = {};
  const U = LQ.ui, S = LQ.store, A = LQ.art, C = LQ.cap, esc = U.esc, ic = U.icon;
  let R = null;
  LS.run = () => R;
  LS.live = { speaking: false, who: null };
  const PH = { context: 'Listen', model: 'Phrases', anticipate: 'Anticipate', talk: 'Talk', feedback: 'Wrap-up' };
  const phasesOf = m => m.roleplay ? ['context', 'model', 'anticipate', 'talk', 'feedback'] : ['context', 'model', 'anticipate', 'feedback'];

  function newRun(m) {
    return { mid: m.id, tid: m.track, phase: 'context', ctx: { answer: null, ok: false, translate: false, text: null }, modelIdx: 0, model: {}, antIdx: 0, ant: {}, antResults: [],
      turn: m.roleplay ? m.roleplay.start : null, vars: {}, log: [], credits: {}, turnHelp: null, misses: 0, subs: null, ended: false, summary: null, hints: 0, typedOpen: false, started: S.today(), talkStarted: false };
  }
  function saveDraft() {
    if (!R) return;
    const p = S.prog(R.tid); p.missions[R.mid] = p.missions[R.mid] || { status: 'new', runs: 0 };
    if (R.phase === 'feedback') { delete p.missions[R.mid].draft; }
    else p.missions[R.mid].draft = JSON.parse(JSON.stringify(Object.assign({}, R, { ant: {}, model: {} })));
    S.save();
  }
  LS.ensure = (mid) => {
    if (R && R.mid === mid) return R;
    const m = LQ.missionById(mid); if (!m) return null;
    C.stopAll(); C.clearTakes(); LQ.speech.cancel();
    const d = (S.prog(m.track).missions[mid] || {}).draft;
    R = d ? Object.assign(newRun(m), d) : newRun(m);
    if (R.judging) { const e = R.log[R.judging.idx]; if (e) Object.assign(e, { pending: false, miss: 'Not checked: the page was reloaded while live AI was answering' }); R.judging = null; }
    if (S.state.active !== m.track && S.state.enrollments[m.track]) S.state.active = m.track;
    return R;
  };
  LS.reset = () => { C.stopAll(); LQ.speech.cancel(); R = null; };
  const mis = () => LQ.missionById(R.mid);
  const trk = () => LQ.trackById(R.tid);
  const enr = () => S.enr(R.tid);
  const src = () => enr() ? enr().source : 'en';
  const L = o => U.L(o, src());
  const char = () => { const m = mis(); return m.character ? LQ.CHARACTERS[m.character] : null; };
  const who = () => { const c = char(); return c ? c.name.split(' ')[0] : (mis().local ? mis().local.name : 'Local'); };
  const srLang = () => U.srLocale(trk(), enr());
  const tts = (p, o) => U.say(p, Object.assign({ track: trk(), character: mis().character, speaker: mis().local && mis().local.name }, o || {}));
  function subsDefault() {
    const h = S.state.settings.help;
    if (h === 'visible') return true; if (h === 'ask') return false;
    const m = mis(); const st = m.skills.map(k => S.skillState(R.tid, k));
    return !st.every(x => x === 'independent' || x === 'durable');
  }

  /* ── speaking (character / reference) with honest live state ── */
  function paintLive() {
    const el = document.getElementById('live-state'), port = document.getElementById('live-port');
    if (!el || !R) return;
    let txt, expr = 'neutral';
    if (LS.live.speaking) { txt = (LS.live.who === 'ref' ? 'Reference audio playing' : who() + ' is speaking'); expr = 'talking'; }
    else if (C.mode === 'sr') { txt = 'Listening to you'; expr = 'listening'; }
    else if (C.mode === 'rec') { txt = 'Recording your voice'; expr = 'listening'; }
    else if (R && R.phase === 'feedback') { txt = 'Conversation finished'; expr = 'success'; }
    else if (R && R.phase === 'talk' && !R.ended) { txt = 'Waiting for you'; expr = (mis().roleplay.turns[R.turn] || {}).unexpected ? 'question' : 'listening'; }
    else txt = '';
    el.textContent = txt; el.className = 'live' + (LS.live.speaking ? ' is-speaking' : C.mode ? ' is-mic' : '');
    if (port) port.innerHTML = portraitFor(expr, 64);
  }
  LS.paintLive = paintLive;
  function portraitFor(expr, size) { const m = mis(); return m.character ? A.portrait(m.character, expr, { size }) : A.portrait(A.localLook(trk()), expr, { size, look: A.localLook(trk()), name: m.local && m.local.name }); }
  const queue = [];
  function speakNext() {
    if (!R) { queue.length = 0; LS.live.speaking = false; return; } // the mission was left or reset
    if (!queue.length) { LS.live.speaking = false; paintLive(); return; }
    const it = queue.shift();
    const res = tts(it.p, { slow: it.slow, fast: it.fast, onstart: () => { LS.live.speaking = true; LS.live.who = it.ref ? 'ref' : 'char'; paintLive(); }, onend: (why) => { LS.live.speaking = false; paintLive(); if (why === 'cancelled') { queue.length = 0; return; } setTimeout(speakNext, 220); } });
    if (!res.ok && res.reason) { /* text-only: onend fires and continues the queue */ }
  }
  LS.say = (p, o) => { queue.length = 0; LQ.speech.cancel(); queue.push(Object.assign({ p }, o || {})); speakNext(); };
  LS.sayMany = (items) => { queue.length = 0; LQ.speech.cancel(); items.forEach(i => queue.push(i)); speakNext(); };

  /* ── view ── */
  LS.view = (mid) => {
    if (!LS.ensure(mid)) return LQ.views.notFound();
    const m = mis(), t = trk(), e = enr();
    if (!e) return gateEnroll(m, t);
    if (m.status !== 'playable') { R = null; return LQ.views.mission(mid); }
    if (!U.coverage(m, src()) && !e.fallback) return gateLanguage(m, t);
    const phases = phasesOf(m), idx = phases.indexOf(R.phase);
    const vs = U.voiceStatus(t, e);
    if (R.subs === null) R.subs = subsDefault();
    let h = '<main class="lesson lesson--' + R.phase + '" id="main">' +
      '<header class="lhead"><button class="iconbtn" data-act="lesson-exit" aria-label="Pause and leave the mission">' + ic('close') + '</button>' +
      '<div class="lhead__t" title="' + esc(t.name + ', from ' + S.srcName(src())) + '"><strong>' + esc(L(m.title)) + '</strong></div>' + U.voiceChip(t, e) + '</header>' +
      '<ol class="stepper" aria-label="Mission steps">' + phases.map((p, i) => '<li class="' + (i < idx ? 'is-done' : i === idx ? 'is-on' : '') + '"' + (i === idx ? ' aria-current="step"' : '') + '><span class="stepper__bar"></span><span class="stepper__l">' + PH[p] + '</span></li>').join('') + '</ol>' +
      '<div class="lscene">' + A.scene(m.scene, { palette: A.plazaPalette(t) }) + '<div class="lscene__who"><span id="live-port">' + portraitFor('neutral', 64) + '</span><span class="live" id="live-state" role="status"></span></div></div>' +
      '<section class="lbody">' + PHASE[R.phase]() + '</section></main>';
    return h;
  };
  function gateEnroll(m, t) {
    return '<main class="ob" id="main"><a class="backlink" href="#/home">' + ic('back', 'ic--sm') + ' Home</a><h1 class="h2">Enroll in ' + esc(t.name) + ' first</h1><p class="muted">Missions belong to a course enrollment so your instruction language and progress are kept per course.</p><a class="btn btn--primary btn--block" href="#/course/' + t.id + '">Set up ' + esc(t.name) + '</a></main>';
  }
  function gateLanguage(m, t) {
    const s = S.srcName(src());
    return '<main class="ob" id="main"><a class="backlink" href="#/missions">' + ic('back', 'ic--sm') + ' Missions</a>' + U.mascot('curious', 88) +
      '<h1 class="h2">' + esc(s) + ' instructions aren’t written for this mission yet</h1>' +
      '<p>You chose to learn ' + esc(t.name) + ' from ' + esc(s) + '. Rather than switching language without telling you, LangQuest asks first. The spoken ' + esc(t.name) + ' stays exactly the same either way.</p>' +
      '<div class="stack-sm"><button class="btn btn--primary btn--block" data-act="lesson-fallback" data-arg="en">Show English instructions for this course</button>' +
      '<a class="btn btn--ghost btn--block" href="#/course/' + t.id + '">Change the instruction language</a><a class="btn btn--quiet btn--block" href="#/missions">Choose another mission</a></div>' +
      '<p class="fineprint">Editorial status: ' + esc(s) + ' overlay for this mission is queued for writing and native review.</p></main>';
  }
  const fbNote = (o) => { const r = U.Lf(o, src()); return r.fb ? '<span class="fbtag" title="Shown in ' + esc(S.srcName(r.lang)) + ' because you opted in">' + esc(S.srcName(r.lang)) + '</span>' : ''; };

  /* A studio upload attached to this mission (published, rights cleared) plays as the scene recording. */
  const attached = () => (S.state.studio.assets || []).find(a => a.attach && a.attach.kind === 'mission' && a.attach.id === R.mid && a.published);
  const attachedNote = () => { const a = attached(); return LQ.studio.fileUrl(a.id) ? '<p class="muted small">' + ic('audio', 'ic--xs') + ' Scene recording: “' + esc(a.title) + '”, ' + esc(a.speaker || 'studio upload') + '. Original file, unaltered.</p>' : '<p class="muted small">' + ic('info', 'ic--xs') + ' A studio recording is attached (“' + esc(a.title) + '”), but its file stays in the browser session that uploaded it. Re-attach it in the studio library to hear it here.</p>'; };
  const saveTool = (p, i) => { const on = LQ.notebook.hasLine(R.tid, p); return '<button class="ltool" data-act="log-save" data-arg="' + i + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Saved to your notebook' : 'Save this line to your notebook') + '">' + ic(on ? 'check' : 'bookmark', 'ic--xs') + '</button>'; };
  const saveExprBtn = (ex) => { const on = S.isSaved(R.tid, ex.id); return U.tool('save-expr', on ? 'check' : 'bookmark', on ? 'In your notebook' : 'Save to notebook', ' data-arg="' + esc(R.tid + '|' + ex.id) + '" aria-pressed="' + on + '"'); };
  const PHASE = {};
  /* 1. Context: situational listening and a visual meaning check */
  PHASE.context = () => {
    const m = mis(), c = m.context;
    let h = '<details class="scene-d"><summary aria-label="About the scene" title="' + esc(L(c.setup)) + '">' + ic('info', 'ic--xs') + '</summary><p class="setup">' + esc(L(c.setup)) + fbNote(c.setup) + '</p></details>' +
      '<div class="bubble-char"><div class="bubble-char__txt">' + (R.subs || R.ctx.text ? U.phrase(c.line, { track: trk() }) : '<span class="muted">' + ic('ear', 'ic--sm') + ' Listen first. Text is hidden.</span>') +
      (R.ctx.translate ? '<span class="gloss">' + esc(L(c.line.m)) + '</span>' : '') + '</div>' +
      '<div class="tools">' + U.tool('ctx-play', 'replay', 'Replay') + U.tool('ctx-slow', 'slow', 'Slower') + U.tool('ctx-text', 'text', 'Show text', ' aria-pressed="' + !!(R.subs || R.ctx.text) + '"') + U.tool('ctx-translate', 'translate', 'Translate', ' aria-pressed="' + R.ctx.translate + '"') +
      U.tool('ctx-save', LQ.notebook.hasLine(R.tid, c.line) ? 'check' : 'bookmark', LQ.notebook.hasLine(R.tid, c.line) ? 'Saved to your notebook' : 'Save line', ' aria-pressed="' + LQ.notebook.hasLine(R.tid, c.line) + '"') + (attached() ? U.tool('ctx-recording', 'audio', 'Scene recording') : '') + '</div></div>' + (attached() ? attachedNote() : '') +
      '<h2 class="q">' + esc(L(c.question)) + '</h2><div class="opts" role="group" aria-label="Choose the meaning">' +
      c.options.map((o, i) => { const chosen = R.ctx.answer === i; const cls = chosen ? (o.ok ? ' is-right' : ' is-wrong') : ''; return '<button class="opt' + cls + '" data-act="ctx-answer" data-arg="' + i + '"' + (R.ctx.ok ? ' disabled' : '') + ' aria-pressed="' + chosen + '">' + A.optionIcon(o.icon) + '<span>' + esc(L(o.m)) + '</span>' + (chosen ? (o.ok ? ic('check', 'ic--sm') : '') : '') + '</button>'; }).join('') + '</div>';
    if (R.ctx.answer !== null && !R.ctx.ok) h += '<p class="soft-no">' + ic('replay', 'ic--sm') + '<span>Not quite. Replay it, or turn on the translation, and try again.</span></p>';
    if (R.ctx.ok) h += '<p class="yes">' + ic('check', 'ic--sm') + '<span>' + esc(L(c.after) || 'Right.') + '</span></p>';
    h += '<div class="lfoot">' + U.tool('phase-skip', 'skip', 'Skip this step') + (R.ctx.ok ? '<button class="btn btn--primary" data-act="phase-next">Continue</button>' : '') + '</div>';
    return h;
  };
  /* 2. Model phrases: hear normal/slow, say it, optional word help */
  PHASE.model = () => {
    const m = mis(), list = m.expressions, ex = list[R.modelIdx], at = R.model[ex.id];
    C.on('model', a => { R.model[ex.id] = a; if (a.mode !== 'self' || true) S.award('say:' + ex.id + ':' + S.today(), 5, 'Said “' + U.nm(ex.t) + '”', R.tid); S.save(); LQ.app.render(); });
    let h = '<p class="kicker" aria-label="Phrase ' + (R.modelIdx + 1) + ' of ' + list.length + '">' + (R.modelIdx + 1) + ' / ' + list.length + '</p>' +
      '<div class="pcard"><div class="pcard__phrase">' + U.phrase(ex, { track: trk() }) + '</div><p class="pcard__m">' + esc(U.nm(L(ex.m))) + fbNote(ex.m) + '</p>' +
      '<div class="tools"><button class="tool tool--main" data-act="ref-play" data-arg="' + ex.id + '" title="Listen">' + ic('volume', 'ic--sm') + 'Listen</button>' + U.tool('ref-slow', 'slow', 'Slowly', ' data-arg="' + ex.id + '"') +
      (ex.words ? U.tool('words-toggle', 'list', 'Word by word', ' aria-expanded="' + !!R.words + '"') : '') + saveExprBtn(ex) + (ex.note ? U.info(L(ex.note), 'Tip', 'bulb') : '') + '</div>' +
      (ex.words && R.words ? '<dl class="words">' + ex.words.map(w => '<div><dt dir="auto">' + esc(w[0]) + '</dt><dd>' + esc(L(w[1])) + '</dd></div>').join('') + '</dl>' : '') + '</div>';
    if (!at) h += C.widget('model', { lang: srLang(), langName: trk().name, label: C.srUsable() ? 'Tap and say it' : 'Tap to record yourself' });
    else h += '<div class="after">' + (at.mode === 'self' ? '<p class="yes">' + ic('check', 'ic--sm') + '<span>Marked as said aloud. Compare with the reference whenever you like.</span></p>' : '') + C.compareHtml(U.nm(ex.t), at) + C.takeHtml('model', true) +
      '<button class="linkbtn" data-act="model-again" title="Try it again">' + ic('replay', 'ic--xs') + 'Again</button></div>';
    h += '<div class="dots" aria-hidden="true">' + list.map((x, i) => '<span class="' + (i === R.modelIdx ? 'is-on' : R.model[x.id] ? 'is-done' : '') + '"></span>').join('') + '</div>' +
      '<div class="lfoot"><button class="btn btn--quiet" data-act="model-skip" aria-label="Skip phrase" title="Skip phrase">' + ic('skip', 'ic--sm') + '</button><button class="btn btn--primary" data-act="model-next"' + (at ? '' : ' disabled') + '>' + (R.modelIdx < list.length - 1 ? 'Next' : 'Continue') + '</button></div>';
    return h;
  };
  /* 3. Anticipation (Pimsleur): attempt before the model answer is revealed */
  function antModel(item) { if (item.model) return item.model; const f = mis().expressions.find(e => e.id === item.expr); return f; }
  function ring(state) {
    const arcs = [['Listen', 'ear'], ['Think', 'bulb'], ['Say', 'mic'], ['Compare', 'loop']];
    const on = state === 'prompt' ? [1, 2] : state === 'compare' ? [3] : [];
    return '<div class="loopring" aria-hidden="true"><svg viewBox="0 0 120 120">' + arcs.map((a, i) => { const s = i * 90 - 90 - 38, e = s + 76; const p = (d) => [60 + 50 * Math.cos(d * Math.PI / 180), 60 + 50 * Math.sin(d * Math.PI / 180)]; const [x1, y1] = p(s), [x2, y2] = p(e); return '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'A50 50 0 0 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" class="arc' + (on.includes(i) || (state === 'prompt' && i === 0) ? ' is-on' : '') + (state === 'compare' && i < 3 ? ' is-done' : '') + '"/>'; }).join('') + '</svg>' +
      '<span class="loopring__c">' + (S.state.settings.mascot ? A.orbit(state === 'compare' ? 'encouraging' : 'thinking', { size: 64 }) : ic('bulb')) + '</span>' +
      arcs.map((a, i) => '<span class="loopring__l loopring__l--' + i + (on.includes(i) ? ' is-on' : '') + '">' + a[0] + '</span>').join('') + '</div>';
  }
  PHASE.anticipate = () => {
    const m = mis(), item = m.anticipate[R.antIdx], model = antModel(item), st = R.ant[R.antIdx] || { state: 'prompt' };
    R.ant[R.antIdx] = st;
    C.on('ant', a => { st.attempt = a; st.state = 'compare'; LQ.app.render(); setTimeout(() => LS.say(model, { ref: true }), 250); });
    let h = '<p class="kicker" aria-label="Prompt ' + (R.antIdx + 1) + ' of ' + m.anticipate.length + '">' + (R.antIdx + 1) + ' / ' + m.anticipate.length + '</p>' +
      '<div class="prompt"><p class="prompt__t">' + esc(U.nm(L(item.prompt))) + fbNote(item.prompt) + '</p></div>';
    if (st.state === 'prompt') {
      h += ring('prompt') +
        (st.hint ? '<p class="hint">' + ic('bulb', 'ic--sm') + '<span>Starts with: <strong dir="auto">' + esc(U.nm(model.r && enr().script === 'roman' ? model.r : model.t).split(' ').slice(0, 2).join(' ')) + '…</strong></span></p>' : '') +
        C.widget('ant', { lang: srLang(), langName: trk().name, label: C.srUsable() ? 'Say your answer' : 'Record your answer' }) +
        '<div class="lfoot"><button class="btn btn--quiet" data-act="ant-hint"' + (st.hint ? ' disabled' : '') + ' title="Hint">' + ic('bulb', 'ic--sm') + 'Hint</button><button class="btn btn--ghost" data-act="ant-reveal" title="Reveal the answer (it returns sooner)">' + ic('eye', 'ic--sm') + 'Reveal</button></div>';
    } else {
      const assisted = st.revealed && !st.attempt ? 'revealed' : st.hint ? 'hint' : false;
      h += ring('compare') + '<div class="pcard pcard--answer"><p class="small muted">' + (st.attempt ? 'Model' : 'Model (revealed)') + '</p><div class="pcard__phrase">' + U.phrase(model, { track: trk() }) + '</div><p class="pcard__m">' + esc(U.nm(L(model.m))) + '</p>' +
        '<div class="tools"><button class="tool tool--main" data-act="ant-play">' + ic('volume', 'ic--sm') + 'Listen</button>' + U.tool('ant-slow', 'slow', 'Slowly') + '</div></div>' +
        C.compareHtml(U.nm(model.t), st.attempt) + (st.attempt && st.attempt.mode === 'record' ? C.takeHtml('ant', true) : '') +
        '';
      if (!st.rated) {
        h += '<h3 class="q q--sm">How close?</h3><div class="rate" role="group" aria-label="Rate your attempt"><button class="ratebtn ratebtn--got" data-act="ant-rate" data-arg="got">' + ic('check', 'ic--sm') + 'Got it</button><button class="ratebtn ratebtn--close" data-act="ant-rate" data-arg="close">' + ic('loop', 'ic--sm') + 'Close</button><button class="ratebtn ratebtn--again" data-act="ant-rate" data-arg="again">' + ic('replay', 'ic--sm') + 'Not yet</button></div>' +
          (assisted ? '<p class="muted small">' + ic('bulb', 'ic--xs') + ' Helped ' + U.info(assisted === 'revealed' ? 'You revealed it first; that’s fine and is noted as help, so it returns sooner.' : 'You used a hint; it’s noted, so it returns sooner.', 'About help') + '</p>' : '');
      } else {
        h += '<p class="sched">' + ic('calendar', 'ic--sm') + '<span>' + esc(st.why) + '</span></p><div class="lfoot"><span></span><button class="btn btn--primary" data-act="ant-next">' + (R.antIdx < m.anticipate.length - 1 ? 'Next prompt' : (m.roleplay ? 'Talk to ' + who() : 'Finish')) + '</button></div>';
      }
    }
    return h;
  };
  /* 4. Role-play: branching conversation with semantic acceptance */
  PHASE.talk = () => {
    const m = mis(), turn = m.roleplay.turns[R.turn];
    C.on('talk', a => handleInput(a, R.turnHelp === 'suggested' ? 'suggested' : R.turnHelp ? 'hint' : 'independent'));
    const showSug = R.turnHelp === 'suggest' || R.misses >= 2 || S.state.settings.help === 'visible';
    if (!C.srUsable() && C.typing.talk === undefined) C.typing.talk = true;
    const lastChar = R.log.map(e => e.who).lastIndexOf('char');
    let h = '<ol class="log" role="log" aria-label="Conversation">' + R.log.map((e, i) => {
      if (e.who === 'char') return '<li class="msg msg--char"><span class="msg__who">' + esc(who()) + (e.fast ? ' (fast)' : e.slow ? ' (slowly)' : '') + '</span><div class="msg__b">' + (R.subs && !e.hide || e.show ? U.phrase(e.p, { track: trk() }) : '<span class="muted">' + ic('ear', 'ic--xs') + ' Text hidden</span>') + (e.tr ? '<span class="gloss">' + esc(U.nm(L(e.p.m))) + '</span>' : '') + '</div>' +
        (i !== lastChar ? '<div class="msg__tools"><button class="ltool" data-act="log-play" data-arg="' + i + '" aria-label="Replay this line">' + ic('replay', 'ic--xs') + '</button>' + saveTool(e.p, i) + '</div></li>' : '') + (i !== lastChar ? '' : '<div class="msg__tools"><button class="ltool" data-act="log-play" data-arg="' + i + '" aria-label="Replay this line">' + ic('replay', 'ic--xs') + '</button><button class="ltool" data-act="log-text" data-arg="' + i + '" aria-label="Show text">' + ic('text', 'ic--xs') + '</button><button class="ltool" data-act="log-tr" data-arg="' + i + '" aria-label="Translate this line">' + ic('translate', 'ic--xs') + '</button>' + saveTool(e.p, i) + '</div></li>');
      if (e.who === 'me') return '<li class="msg msg--me"><div class="msg__b" dir="auto">' + esc(e.text) + '</div><span class="msg__meta">' + esc({ speech: 'spoken', typed: 'typed', suggested: 'suggested reply' }[e.mode] || e.mode) + (e.prov ? ' ' + LQ.ai.badge(e.prov) : '') + '</span>' + (e.pending ? '<span class="eval eval--wait">' + ic('cpu', 'ic--xs') + 'Rules didn’t match. Asking live AI…</span>' : e.ok ? '<span class="eval">' + ic('check', 'ic--xs') + esc(e.ok) + '</span>' : e.miss ? '<span class="eval eval--miss">' + ic('info', 'ic--xs') + esc(e.miss) + '</span>' : '') + '</li>';
      return '<li class="msg msg--note">' + ic(e.icon || 'info', 'ic--xs') + '<span>' + esc(e.text) + '</span></li>';
    }).join('') + '</ol>';
    if (R.proposal) { h += proposalHtml(); return h; }
    if (R.judging) { h += '<p class="muted small center" role="status">' + ic('cpu', 'ic--xs') + ' Checking the meaning with live AI. The rules are standing by.</p>'; return h; }
    if (R.ended) {
      h += '<div class="ended">' + U.mascot('celebrate', 72) + '<p><strong>Conversation complete.</strong> ' + esc(U.mascotLine('done', {}, src())) + '</p><button class="btn btn--primary btn--block" data-act="talk-finish">See how it went</button></div>';
      return h;
    }
    if (R.turnHelp === 'hint' || R.misses >= 2) h += '<p class="hint">' + ic('bulb', 'ic--sm') + '<span>' + esc(U.nm(L(turn.hint))) + '</span></p>';
    if (showSug && turn.suggest) h += '<div class="sugs" role="group" aria-label="Suggested replies">' + turn.suggest.map((s, i) => '<button class="sug" data-act="talk-suggest" data-arg="' + i + '" dir="auto">' + esc(U.nm(s)) + '</button>').join('') + '</div>';
    const cp = C.parts('talk', { lang: srLang(), langName: trk().name, allowSelf: false, label: C.srUsable() ? 'Tap and answer' : 'Type your answer', allowRecord: false });
    h += '<div class="dock"><button class="dock__b" data-act="talk-repeat">' + ic('replay', 'ic--sm') + '<span>Repeat</span></button><button class="dock__b" data-act="talk-slower">' + ic('slow', 'ic--sm') + '<span>Slower</span></button>' +
      '<div class="dock__mic cap cap--compact' + (cp.active ? ' is-' + cp.active : '') + '">' + cp.mic + '</div>' +
      '<button class="dock__b" data-act="talk-hint"' + (R.turnHelp ? ' aria-pressed="true"' : '') + '>' + ic('bulb', 'ic--sm') + '<span>Hint</span></button><button class="dock__b" data-act="talk-suggest-show">' + ic('sparkle', 'ic--sm') + '<span>Ideas</span></button>' +
      '<div class="dock__extra cap">' + cp.extra + '</div></div>' +
      '<div class="lfoot lfoot--talk">' + U.tool('talk-subs', 'text', R.subs ? 'Hide subtitles' : 'Show subtitles', ' aria-pressed="' + R.subs + '"') + U.tool('talk-skip', 'skip', 'Skip this turn') + '</div>';
    return h;
  };
  /* 5. Feedback: objectives with evidence, 1–2 priority notes, recall plan, story memory */
  PHASE.feedback = () => {
    const m = mis(), sm = R.summary || summarize();
    let h = '<div class="fb-hero">' + U.mascot(sm.met === sm.total ? 'celebrate' : 'encouraging', 80) + '<div><h2 class="h3">' + (m.firstWords ? 'First words done' : sm.met === sm.total ? 'Mission complete' : 'Mission finished') + '</h2><p class="muted small">' + sm.met + '/' + sm.total + ' goals' + (sm.xp ? ' · +' + sm.xp + ' XP' : '') + ' ' + U.info((m.roleplay ? sm.met + ' of ' + sm.total + ' goals shown in conversation. ' : sm.met + ' of ' + sm.total + ' phrases anticipated and self-checked. ') + (sm.xp ? '+' + sm.xp + ' XP for effort. ' : 'XP already earned today for this mission. ') + 'Goals come from what the meaning matcher accepted in conversation. Typed answers count for meaning, not for speaking. No pronunciation score is given.', 'How this was judged') + '</p></div></div>';
    h += '<ul class="goals" role="list">' + sm.goals.map(g => '<li class="goal' + (g.ok ? ' is-ok' : '') + '" title="' + esc(g.how) + '">' + (g.ok ? ic('check', 'ic--sm') : '<span class="goal__ring" aria-hidden="true"></span>') + '<span><strong>' + esc(LQ.SKILLS[g.skill].en) + '</strong></span>' + U.stateChip(g.state) + '</li>').join('') + '</ul>';
    h += '<div class="stack-sm"><a class="btn btn--primary btn--block" href="#/home" data-act="lesson-done">Done</a>' + (S.due(R.tid).length ? '<a class="btn btn--ghost btn--block" href="#/recall" data-act="lesson-done">' + ic('refresh', 'ic--sm') + 'Recall ' + S.due(R.tid).length + '</a>' : '') + '</div>';
    h += '<details class="more"><summary>' + ic('list', 'ic--sm') + 'Details</summary>' +
      '<ul class="goals goals--how" role="list">' + sm.goals.map(g => '<li><span class="small"><strong>' + esc(LQ.SKILLS[g.skill].en) + ':</strong> ' + esc(g.how) + '</span></li>').join('') + '</ul>';
    if (sm.notes.length) h += '<h3 class="h4">Worth trying</h3><ul class="notes" role="list">' + sm.notes.slice(0, 2).map(n => '<li>' + ic('bulb', 'ic--sm') + '<span>' + esc(n) + '</span></li>').join('') + '</ul>';
    if (sm.recall.length) h += '<h3 class="h4">Coming back</h3><ul class="recallplan" role="list">' + sm.recall.map(r => '<li><span class="rp__p" dir="auto">' + esc(r.text) + '</span><span class="muted small">' + esc(r.when) + (r.where ? ', ' + r.where : '') + '</span></li>').join('') + '</ul>';
    if (sm.memory) h += '<div class="memory">' + portraitFor('success', 40) + '<p><strong>' + esc(who()) + ' will remember</strong><br>' + esc(sm.memory) + '</p></div>';
    h += '</details><button class="btn btn--quiet btn--block" data-act="lesson-replay">' + ic('replay', 'ic--sm') + 'Replay</button>';
    return h;
  };

  function summarize() {
    const m = mis(), t = trk();
    const goals = m.skills.map(k => { const c = R.credits[k]; return { skill: k, ok: !!c, how: c ? ({ independent: 'No hints', hint: 'With a hint', suggested: 'With a suggested reply' }[c.autonomy] + ', ' + ({ speech: 'spoken', typed: 'typed', suggested: 'chosen', self: 'self-checked' }[c.input] || c.input) + (c.said ? ': “' + c.said + '”' : '')) : (m.roleplay ? 'Not shown in this conversation' : 'Practised in anticipation'), state: S.skillState(R.tid, k) }; });
    if (!m.roleplay) goals.forEach(g => { if (R.antResults.length) { g.ok = R.antResults.some(a => LQ.exprSkill(a.id) === g.skill && a.result !== 'again'); g.how = g.ok ? 'Anticipated and self-checked' : 'Marked “not yet”, coming back soon'; } });
    const met = goals.filter(g => g.ok).length;
    const notes = [];
    const meLines = R.log.filter(e => e.who === 'me');
    if (t.id === 'es-spain') {
      const q = meLines.find(e => /order|oat/.test(e.intent || '') && /\bquiero\b/i.test(e.text) && !/por favor/i.test(e.text));
      if (q) notes.push('You said “' + q.text + '”. It was understood. Adding “por favor”, or starting with “Me pones…”, sounds friendlier in a Madrid café.');
      if (m.id === 'es-cafe' && !R.credits.greet_politely) notes.push('Try opening with “Buenos días” before you order. It makes the exchange warmer and it’s what Lucía expects.');
    }
    if (R.vars.note === 'thanked-before-price') notes.push('You thanked ' + who() + ' before asking the price. Next time, ask “¿Cuánto es?” first, then thank.');
    if (meLines.length && meLines.every(e => e.mode !== 'speech')) notes.push('Everything was ' + (meLines.every(e => e.mode === 'suggested') ? 'chosen from suggestions' : 'typed') + '. When you can, use the microphone so this course collects speaking evidence too.');
    if (R.hints > 1) notes.push('You asked for help ' + R.hints + ' times. That’s what it’s there for; the same skills will come back with fewer hints offered.');
    const missedGoal = goals.find(g => !g.ok); if (missedGoal && notes.length < 2 && m.roleplay) notes.push('“' + LQ.SKILLS[missedGoal.skill].en + '” didn’t come up this time. It will appear again in your next scene.');
    const recall = R.antResults.map(a => { const r = S.prog(R.tid).expressions[a.id]; const ctx = m.recall && m.recall[a.id]; const ch = ctx && LQ.CHARACTERS[ctx.character]; return r ? { text: LQ.phraseText(a.id), when: 'due ' + S.relDay(r.due) + ' (' + S.fmtDay(r.due) + ')', where: ch ? 'with ' + ch.name.split(' ')[0] + ' ' + (ctx.scene === 'madrid-terrace' ? 'on a terrace' : ctx.scene === 'madrid-plaza' ? 'on the plaza' : 'somewhere new') : '' } : null; }).filter(Boolean);
    const seen = new Set(); const recallU = recall.filter(r => { if (seen.has(r.text)) return false; seen.add(r.text); return true; });
    let memory = null;
    const v = R.vars;
    if (m.id === 'es-cafe') memory = 'You take your café con leche' + (v.milk === 'oat' ? ' with oat milk' : '') + (v.where === 'to-go' ? ', to go' : v.where === 'here' ? ', at the counter' : '') + (v.food === 'toast' ? ', with tostada con tomate' : v.food === 'croissant' ? ', with a croissant' : '') + '.';
    if (m.id === 'ary-cafe') memory = v.drink === 'tea' ? 'Tu prends ton atay à la menthe' + (v.food && v.food !== 'none' ? ' avec un ' + v.food : '') + '.' : 'Ton nss-nss, toujours' + (v.food && v.food !== 'none' ? ' avec un ' + v.food : '') + '.';
    if (m.id === 'fr-mileend') memory = 'Café au lait ' + (v.where === 'to-go' ? 'pour apporter' : 'sur place') + (v.food === 'chocolatine' ? ', with a chocolatine' : '') + '.';
    if (m.id === 'ja-cafe') memory = 'A café latte, size ' + (v.size || 'M') + ', ' + (v.where === 'to-go' ? 'to take away' : 'at the counter') + '.';
    if (m.id === 'en-cafe') memory = 'A ' + (v.size === 'large' ? 'large' : 'medium') + ' latte, ' + (v.where === 'to-go' ? 'to go' : 'for here') + '.';
    if (m.id === 'es-metro') memory = 'You were looking for the metro to Sol.';
    if (m.id === 'es-plans') memory = v.plan === 'accepted' ? 'You’re meeting at eight on Saturday, at the café door.' : 'You couldn’t make Saturday; she’ll ask again.';
    if (m.id === 'es-hello') memory = 'Your name and that you’re from ' + (v.from || 'abroad') + '.';
    return { goals, met, total: goals.length, notes, recall: recallU, memory, xp: 0 };
  }
  function finish() {
    const m = mis(), p = S.prog(R.tid);
    R.summary = summarize();
    const first = !p.missions[R.mid] || p.missions[R.mid].status !== 'done';
    const xp = first ? S.award('m:' + R.mid + ':done', m.firstWords ? 30 : 60, L(m.title) + ', completed', R.tid) : S.award('m:' + R.mid + ':replay:' + S.today(), 15, L(m.title) + ', practised again', R.tid);
    R.summary.xp = xp;
    p.missions[R.mid] = Object.assign(p.missions[R.mid] || {}, { status: 'done', completedAt: S.today(), runs: ((p.missions[R.mid] || {}).runs || 0) + 1, vars: R.vars });
    delete p.missions[R.mid].draft;
    if (R.summary.memory && m.character) { p.memory[m.character] = p.memory[m.character] || []; p.memory[m.character].push({ at: S.today(), en: R.summary.memory, fr: R.summary.memory }); }
    S.event('conversation.finished', L(m.title) + ': ' + R.summary.met + '/' + R.summary.total + ' goals');
    R.phase = 'feedback';
    S.save();
  }

  /* ── role-play turn logic ── */
  /* Character lines pick up what the learner told them, e.g. the name they actually gave. */
  function charLine(p, o) { if (p && R.vars && R.vars.name) p = LQ.fillSlots(p, { name: R.vars.name }); R.log.push(Object.assign({ who: 'char', p }, o || {})); }
  function note(text, icon) { R.log.push({ who: 'note', text, icon }); }
  function enterTurn(id, speakList, opts) {
    const m = mis(); R.turn = id; R.turnHelp = null; R.misses = 0;
    const turn = id ? m.roleplay.turns[id] : null;
    if (opts && opts.silent) return; // already answered in the same breath: skip the question
    if (turn && turn.say) { charLine(turn.say, { fast: turn.fast, slow: turn.slow, hide: turn.hideText }); speakList.push({ p: R.log[R.log.length - 1].p, fast: turn.fast, slow: turn.slow }); }
    if (turn && turn.unexpected) note('Surprise question', 'sparkle');
  }
  function credit(skill, autonomy, input, said, kind, judged) {
    if (!skill) return;
    const m = mis();
    const prev = R.credits[skill];
    const rank = { independent: 3, hint: 2, suggested: 1 };
    if (!prev || rank[autonomy] > rank[prev.autonomy]) R.credits[skill] = { autonomy, input, said, judged: judged || null };
    S.observe(R.tid, skill, Object.assign({ mission: m.id, scene: m.scene, kind: kind || 'roleplay', autonomy, input, ok: true, said }, judged ? { judge: judged } : {}));
  }
  function handleInput(a, autonomy) {
    const m = mis(), turn = m.roleplay.turns[R.turn];
    if (!turn || R.ended) return;
    const text = a.text || '';
    const input = a.mode === 'suggested' ? 'suggested' : a.mode;
    if (a.mode === 'suggested') autonomy = 'suggested';
    if (R.proposal || R.judging) return;
    const speak = [];
    // repairs first: the character keeps the scene and repeats (slower)
    const rep = LQ.match.repair(text, m.gid);
    const found = findMatch(turn, text), two = secondIntent(m, turn, text, found);
    const matched = two ? two.first : found;
    if (rep && !matched) {
      R.log.push({ who: 'me', text, mode: input, ok: rep.kind === 'slower' ? 'Asked to slow down' : rep.kind === 'dunno' ? 'Said you didn’t understand' : 'Asked to repeat' });
      if (m.skills.includes('repair_misunderstanding')) credit('repair_misunderstanding', autonomy, input, text);
      if (turn.repairNext) { enterTurn(turn.repairNext, speak); }
      else { const line = turn.say || (R.log.slice().reverse().find(e => e.who === 'char') || {}).p; if (line) { note(who() + ' repeats' + (rep.kind === 'repeat' ? '' : ' more slowly') + ', same scene.', 'slow'); charLine(line, { slow: rep.kind !== 'repeat', show: rep.kind === 'dunno', tr: rep.kind === 'dunno' }); speak.push({ p: line, slow: rep.kind !== 'repeat' }); } }
      LQ.app.render(); LS.sayMany(speak); saveDraft(); return;
    }
    if (!matched) {
      // Rules found no accepted phrasing. With live AI on, ask it to judge the meaning; it only proposes.
      if (LQ.ai.on() && input !== 'suggested' && text.trim().length > 1) { judge(text, input, autonomy); return; }
      miss(text, input); return;
    }
    applyMatch(matched.x, text, input, autonomy, null, null, two ? two.second : null);
  }
  const findMatch = (turn, text) => (turn && turn.expect || []).map(x => ({ x, r: LQ.match.intent(x.intent, text) })).find(y => y.r.ok) || null;
  /* Up to two intents per turn, in order: "Un té, por favor. ¿Cuánto es?" serves the tea, then
     answers the price question of the next turn. Clauses split at sentence punctuation; for
     unpunctuated speech, pack intents (distinct words by construction) can still chain. */
  function secondIntent(m, turn, text, whole) {
    const segs = LQ.match.segments(text), nextOf = h => h && h.x.next && !h.x.stay ? m.roleplay.turns[h.x.next] : null;
    if (segs.length > 1) {
      for (let i = 0; i < segs.length; i++) {
        const h = findMatch(turn, segs[i]); if (!h) continue;
        const rest = segs.slice(i + 1).join(' '), h2 = rest ? findMatch(nextOf(h), rest) : null;
        return h2 && h2.x.intent !== h.x.intent ? { first: h, second: h2.x } : null;
      }
      return null;
    }
    if (!whole || !/^pk:/.test(whole.x.intent)) return null;
    const h2 = findMatch(nextOf(whole), text);
    if (h2 && /^pk:/.test(h2.x.intent) && h2.x.intent.split(':')[2] !== whole.x.intent.split(':')[2] && !h2.r.matched.some(t => whole.r.matched.includes(t)) && !LQ.match.ambiguous(h2.x.intent, h2.r.matched) && LQ.match.position(text, h2.r.matched) > LQ.match.position(text, whole.r.matched)) return { first: whole, second: h2.x };
    return null;
  }
  function miss(text, input, why, idx) {
    const m = mis(), turn = m.roleplay.turns[R.turn], speak = [];
    R.misses++;
    const label = R.misses >= 2 ? 'Not understood yet: a hint and ideas are shown' : 'Not understood yet';
    if (idx != null && R.log[idx]) Object.assign(R.log[idx], { miss: label, pending: false }); else R.log.push({ who: 'me', text, mode: input, miss: label });
    if (why) note(why, 'info');
    const cl = turn.clarify || { t: '¿Perdona?', m: { en: 'Sorry?', fr: 'Pardon ?' } };
    charLine(cl); speak.push({ p: cl });
    S.event('evaluator.unclear', 'Turn ' + R.turn + ': meaning not matched (no penalty, clarification asked)');
    LQ.app.render(); LS.sayMany(speak); saveDraft();
  }
  function applyMatch(x, text, input, autonomy, judged, idx, second) {
    const m = mis(), speak = [], by = judged ? 'live-ai' : null;
    const entry = { who: 'me', text, mode: input, intent: x.intent, intent2: second ? second.intent : null, judged: by };
    if (idx != null && R.log[idx]) Object.assign(R.log[idx], entry, { pending: false }); else R.log.push(entry);
    const me = idx != null && R.log[idx] ? R.log[idx] : R.log[R.log.length - 1];
    const take = (y) => {
      credit(y.skill, autonomy, input, text, null, by);
      (mis().roleplay.turns[R.turn].also || []).forEach(al => { if (LQ.match.intent(al.intent, text).ok) credit(al.skill, autonomy, input, text, null, by); });
      if (y.set) Object.assign(R.vars, y.set);
      if (y.note) R.vars.note = y.note;
      slots(m, y, text);
      const reply = typeof y.reply === 'function' ? y.reply(R.vars) : y.reply;
      if (reply) { charLine(reply); speak.push({ p: R.log[R.log.length - 1].p }); }
    };
    take(x);
    let last = x;
    if (second && x.next && !x.stay) { enterTurn(x.next, speak, { silent: true }); take(second); last = second; }
    me.ok = (judged ? 'Understood (live AI, you accepted): ' : 'Understood: ') + intentLabel(x.intent) + (second ? ' + ' + intentLabel(second.intent) : '');
    if (last.stay) { R.turnHelp = null; R.misses = 0; }
    else if (last.next) enterTurn(last.next, speak);
    else { R.ended = true; R.turn = null; }
    LQ.app.render(); LS.sayMany(speak); saveDraft();
  }
  /* Slots the learner filled: where they're from (Madrid hello), and the name they gave. */
  function slots(m, y, text) {
    if (m.id === 'es-hello' && y.intent === 'es_from') { const mt = text.match(/de\s+([A-Za-zÀ-ÿ\s]+)/i); R.vars.from = mt ? mt[1].trim().replace(/[.!?]$/, '') : 'abroad'; }
    if (/:name$/.test(y.intent) || y.skill === 'introduce_self') {
      const tpls = (m.expressions || []).map(e => e.t).concat((LQ.PK['pk:' + R.tid + ':name'] || { variants: [] }).variants);
      const v = LQ.match.slotFor(y.intent, text, tpls); if (v) R.vars.name = v;
    }
  }
  /* Live-AI meaning check: same verdict structure as LQ.match.verdict, shown as a proposal. */
  const examplesOf = (id) => { const pk = LQ.PK && LQ.PK[id]; if (pk) return pk.variants.slice(0, 4); const d = LQ.INTENTS[id]; return d ? (d.any || []).slice(0, 5) : []; };
  LS.judgeSchema = (ids) => ({ type: 'object', properties: { intent: { type: 'string', enum: ids.concat(['none']) }, ok: { type: 'boolean' }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, explanation: { type: 'string' } }, required: ['intent', 'ok', 'confidence', 'explanation'], additionalProperties: false });
  function judge(text, input, autonomy) {
    const m = mis(), t = trk(), turn = m.roleplay.turns[R.turn], turnId = R.turn;
    R.log.push({ who: 'me', text, mode: input, pending: true });
    const idx = R.log.length - 1;
    R.judging = { idx, turn: turnId };
    LQ.app.render(); saveDraft();
    const last = (R.log.slice().reverse().find(e => e.who === 'char') || {}).p;
    const exp = (turn.expect || []).map(x => ({ id: x.intent, label: intentLabel(x.intent), examples: examplesOf(x.intent) }));
    const system = LQ.ai.context(R.tid) + ' Your task: decide whether the learner’s reply in a guided role-play conveys one of the expected meanings for this turn. Be generous with paraphrase, missing accents and small grammar slips, but strict on meaning: a negated or refused request is not that request. If nothing fits, answer intent "none" and ok false. The explanation is one short sentence in ' + S.srcName(src()) + ', addressed to the learner.';
    const prompt = 'Mission goal: ' + L(m.outcome) + '\nCharacter (' + who() + ') just said: “' + (last ? U.nm(last.t) : '') + '”' + (last && last.m ? ' (meaning: ' + L(last.m) + ')' : '') + '\nExpected meanings for this turn:\n' + exp.map(e => '- ' + e.id + ': ' + e.label + (e.examples.length ? ' (accepted examples: ' + e.examples.map(x => '“' + U.nm(x) + '”').join(', ') + ')' : '')).join('\n') + '\nLearner said (' + (input === 'speech' ? 'speech recognizer transcript' : 'typed') + '): “' + text + '”';
    LQ.ai.json({ task: 'Role-play meaning check', system, prompt, schema: LS.judgeSchema(exp.map(e => e.id)), maxTokens: 400 }).then(res => {
      if (!R || !R.judging || R.judging.idx !== idx) return;
      R.judging = null;
      const d = res.data, x = d.intent !== 'none' ? (turn.expect || []).find(e => e.intent === d.intent) : null;
      const v = { source: 'live-ai', intent: x ? x.intent : null, ok: !!(d.ok && x), confidence: d.confidence, matched: [], explanation: d.explanation };
      if (!v.ok) { R.log[idx].prov = res.provenance; miss(text, input, 'Live AI also didn’t find an expected meaning: ' + d.explanation, idx); return; }
      R.proposal = { v, idx, text, input, autonomy, prov: res.provenance };
      R.log[idx].pending = false; R.log[idx].prov = res.provenance;
      LQ.app.render(); saveDraft();
    }).catch(err => {
      if (!R || !R.judging || R.judging.idx !== idx) return;
      R.judging = null;
      R.log[idx].prov = { source: 'fallback', error: err.described || LQ.ai.describe(err) };
      miss(text, input, 'Live AI couldn’t check this (' + (err.described || LQ.ai.describe(err)) + '). Using the rules: not understood yet.', idx);
    });
  }
  function proposalHtml() {
    const P = R.proposal; if (!P) return '';
    return '<div class="proposal" role="group" aria-label="Live AI proposal">' + LQ.ai.badge(P.prov) + '<p><strong>Live AI reads this as: ' + esc(intentLabel(P.v.intent)) + '</strong> <span class="muted small">(confidence: ' + esc(P.v.confidence) + ')</span></p><p class="small">' + esc(P.v.explanation) + '</p>' +
      '<div class="row2"><button class="btn btn--primary btn--sm" data-act="judge-accept">Yes, that’s what I meant</button><button class="btn btn--ghost btn--sm" data-act="judge-reject">Not what I meant</button></div><p class="muted small">Nothing changes until you choose. The rules didn’t match your words, so this is a suggestion.</p></div>';
  }
  function intentLabel(id) {
    if (/:name$/.test(id || '') || id === 'es_name') return 'said your name' + (R && R.vars && R.vars.name ? ' (' + R.vars.name + ')' : '');
    const pk = /^pk:.*:(\w+)$/.exec(id || '');
    if (pk) return ({ hello: 'greeted', fine: 'answered the greeting', bye: 'said goodbye', thanks: 'thanked', coffee: 'ordered a coffee', tea: 'asked for tea', howmuch: 'asked the price', where: 'asked the way', slower: 'asked to slow down' })[pk[1]] || 'meaning matched';
    const map = { order: 'you ordered', oat: 'asked about plant milk', yes: 'said yes', no: 'declined', here: 'chose for here', to_go: 'chose to go', toast: 'ordered toast', croissant: 'ordered a croissant', price: 'asked the price', thanks: 'thanked and closed', fine: 'answered the greeting', name: 'said your name', from: 'said where you’re from', greet: 'greeted', where_metro: 'asked for the metro', far: 'asked if it’s far', confirm_dir: 'checked the directions', tea: 'asked for tea', msemmen: 'ordered a msemmen', baghrir: 'ordered a baghrir', size: 'chose a size', size_l: 'chose large', size_large: 'chose large', nothing: 'answered about Saturday', accept: 'accepted the invitation', decline: 'declined politely', what_time: 'asked the time', see_you: 'confirmed the plan' };
    const k = id.replace(/^(es|ary|fr|ja|en)_/, '').replace('order_coffee', 'order').replace('greet_only', 'greet').replace('thanks_bye', 'thanks');
    return map[k] || 'meaning matched';
  }

  /* ── actions ── */
  const act = LQ.lessonActs = {};
  act['ctx-play'] = () => LS.say(mis().context.line);
  act['ctx-slow'] = () => LS.say(mis().context.line, { slow: true });
  act['ctx-text'] = () => { R.ctx.text = !(R.subs || R.ctx.text); if (!R.ctx.text) R.subs = false; LQ.app.render(); };
  act['ctx-translate'] = () => { R.ctx.translate = !R.ctx.translate; LQ.app.render(); };
  act['ctx-answer'] = (el) => {
    const i = +el.dataset.arg, m = mis(), o = m.context.options[i];
    R.ctx.answer = i; R.ctx.ok = !!o.ok;
    const sk = m.roleplay ? (m.roleplay.turns[m.roleplay.start].expect.slice(-1)[0] || {}).skill : m.skills[0];
    if (o.ok) S.observe(R.tid, sk, { mission: m.id, scene: m.scene, kind: 'listening', autonomy: R.ctx.translate ? 'hint' : 'independent', input: 'choice', ok: true });
    LQ.app.render();
  };
  act['phase-next'] = () => { const ps = phasesOf(mis()); R.phase = ps[ps.indexOf(R.phase) + 1]; onEnterPhase(); };
  act['phase-skip'] = act['phase-next'];
  function onEnterPhase() {
    C.stopAll(); LQ.speech.cancel(); R.words = false;
    if (R.phase === 'talk' && !R.talkStarted) { R.talkStarted = true; const sp = []; enterTurn(mis().roleplay.start, sp); saveDraft(); LQ.app.render(true); LS.sayMany(sp); return; }
    if (R.phase === 'feedback') finish();
    saveDraft(); LQ.app.render(true);
    if (R.phase === 'model') setTimeout(() => { if (R && R.phase === 'model') LS.say(mis().expressions[R.modelIdx], { ref: true }); }, 300);
  }
  LS.onEnterPhase = onEnterPhase;
  act['ref-play'] = (el) => { const ex = mis().expressions.find(e => e.id === el.dataset.arg); LS.say(ex, { ref: true }); };
  act['ref-slow'] = (el) => { const ex = mis().expressions.find(e => e.id === el.dataset.arg); LS.say(ex, { ref: true, slow: true }); };
  act['words-toggle'] = () => { R.words = !R.words; LQ.app.render(); };
  act['model-again'] = () => { delete R.model[mis().expressions[R.modelIdx].id]; LQ.app.render(); };
  act['model-next'] = () => { C.stopAll(); const m = mis(); if (R.modelIdx < m.expressions.length - 1) { R.modelIdx++; R.words = false; saveDraft(); LQ.app.render(true); setTimeout(() => LS.say(m.expressions[R.modelIdx], { ref: true }), 250); } else { R.phase = 'anticipate'; onEnterPhase(); } };
  act['model-skip'] = act['model-next'];
  act['ant-hint'] = () => { const st = R.ant[R.antIdx]; st.hint = true; R.hints++; LQ.app.render(); };
  act['ant-reveal'] = () => { C.stopAll(); const st = R.ant[R.antIdx]; st.revealed = true; st.state = 'compare'; LQ.app.render(); LS.say(antModel(mis().anticipate[R.antIdx]), { ref: true }); };
  act['ant-play'] = () => LS.say(antModel(mis().anticipate[R.antIdx]), { ref: true });
  act['ant-slow'] = () => LS.say(antModel(mis().anticipate[R.antIdx]), { ref: true, slow: true });
  act['ant-rate'] = (el) => {
    const m = mis(), item = m.anticipate[R.antIdx], st = R.ant[R.antIdx], result = el.dataset.arg;
    const assisted = st.revealed && !st.attempt ? 'revealed' : st.hint ? 'hint' : false;
    const ids = item.ids || [item.expr];
    let last;
    ids.forEach(id => { last = S.schedule(R.tid, id, result, { assisted, mission: m.id, kind: 'anticipation', scene: m.scene }); R.antResults.push({ id, result, assisted }); });
    const sk = LQ.exprSkill(ids[ids.length - 1]);
    if (sk) S.observe(R.tid, sk, { mission: m.id, scene: m.scene, kind: 'anticipation', autonomy: assisted ? (assisted === 'revealed' ? 'revealed' : 'hint') : 'independent', input: st.attempt ? (st.attempt.mode === 'record' ? 'self' : st.attempt.mode) : 'none', ok: result !== 'again', said: st.attempt && st.attempt.text });
    if (result !== 'again' && st.attempt) S.award('a:' + m.id + ':' + R.antIdx + ':' + S.today(), 5, 'Anticipated a reply', R.tid);
    st.rated = result; st.why = last.why; saveDraft(); LQ.app.render();
  };
  act['ant-next'] = () => { C.stopAll(); const m = mis(); if (R.antIdx < m.anticipate.length - 1) { R.antIdx++; saveDraft(); LQ.app.render(true); } else { R.phase = m.roleplay ? 'talk' : 'feedback'; onEnterPhase(); } };
  act['talk-repeat'] = () => { const line = (R.log.slice().reverse().find(e => e.who === 'char') || {}).p; if (line) LS.say(line); };
  act['talk-slower'] = () => { const line = (R.log.slice().reverse().find(e => e.who === 'char') || {}).p; if (line) { note('You asked ' + who() + ' to slow down. Same scene, slower speech.', 'slow'); if (mis().skills.includes('repair_misunderstanding') && mis().roleplay.turns[R.turn] && mis().roleplay.turns[R.turn].repairNext) { const sp = []; enterTurn(mis().roleplay.turns[R.turn].repairNext, sp); credit('repair_misunderstanding', 'hint', 'choice', 'Slower button'); LQ.app.render(); LS.sayMany(sp.map(x => Object.assign(x, { slow: true }))); saveDraft(); return; } LQ.app.render(); LS.say(line, { slow: true }); } };
  act['talk-hint'] = () => { if (!R.turnHelp) { R.turnHelp = 'hint'; R.hints++; } LQ.app.render(); };
  act['talk-suggest-show'] = () => { R.turnHelp = 'suggest'; R.hints++; LQ.app.render(); };
  act['talk-suggest'] = (el) => { const turn = mis().roleplay.turns[R.turn]; handleInput({ mode: 'suggested', text: U.nm(turn.suggest[+el.dataset.arg]) }, 'suggested'); };
  act['talk-subs'] = () => { R.subs = !R.subs; LQ.app.render(); };
  act['talk-skip'] = () => { const turn = mis().roleplay.turns[R.turn]; const x = turn.expect[turn.expect.length - 1]; note('Turn skipped. No evidence recorded for it.', 'info'); const sp = []; if (x.next) enterTurn(x.next, sp); else { R.ended = true; } LQ.app.render(); LS.sayMany(sp); saveDraft(); };
  act['talk-finish'] = () => { R.phase = 'feedback'; onEnterPhase(); };
  act['log-play'] = (el) => { const e = R.log[+el.dataset.arg]; LS.say(e.p, { slow: e.slow }); };
  act['log-text'] = (el) => { const e = R.log[+el.dataset.arg]; e.show = !e.show; LQ.app.render(); };
  act['log-tr'] = (el) => { const e = R.log[+el.dataset.arg]; e.tr = !e.tr; if (e.tr && !R.turnHelp) R.hints++; LQ.app.render(); };
  act['judge-accept'] = () => { const P = R.proposal; if (!P) return; R.proposal = null; const turn = mis().roleplay.turns[R.turn]; const x = (turn.expect || []).find(e => e.intent === P.v.intent); S.event('ai.accepted', 'Learner accepted the live-AI reading “' + intentLabel(P.v.intent) + '”'); if (x) applyMatch(x, P.text, P.input, P.autonomy, true, P.idx); else miss(P.text, P.input, null, P.idx); };
  act['judge-reject'] = () => { const P = R.proposal; if (!P) return; R.proposal = null; S.event('ai.rejected', 'Learner rejected the live-AI reading; rules apply'); miss(P.text, P.input, 'You said that wasn’t what you meant, so it counts as not understood yet. No penalty.', P.idx); };
  act['ctx-recording'] = () => { const a = attached(); const url = a && LQ.studio.fileUrl(a.id); if (!url) { U.toast('Re-attach the file in the studio library to play it in this browser.'); return; } LQ.speech.cancel(); LQ.speech.playTake(url); S.event('audio.attached_played', a.id + ' “' + a.title + '” played in ' + L(mis().title)); S.save(); };
  act['ctx-save'] = () => LQ.notebook.saveLine(R.tid, mis().context.line, L(mis().title));
  act['save-expr'] = (el) => { const [tid, id] = el.dataset.arg.split('|'); LQ.notebook.toggleExpr(tid, id); };
  act['log-save'] = (el) => { const e = R.log[+el.dataset.arg]; if (e && e.p) LQ.notebook.saveLine(R.tid, e.p, L(mis().title)); };
  act['lesson-fallback'] = () => { const e = enr(); e.fallback = 'en'; S.event('enrollment.fallback_opt_in', trk().name + ': learner chose English instructions where ' + S.srcName(e.source) + ' isn’t written yet'); S.save(); LQ.app.render(true); };
  act['lesson-replay'] = () => { const mid = R.mid; const p = S.prog(R.tid); if (p.missions[mid]) delete p.missions[mid].draft; R = null; S.save(); LS.ensure(mid); LQ.app.render(true); setTimeout(() => R && LS.say(mis().context.line), 300); };
  act['lesson-done'] = () => { R = null; };
  LS.exitSheet = () => '<h2 class="h3" id="sheet-title">Pause this mission?</h2><p class="muted">Your place, choices and conversation so far are saved. Pick up from Home or Missions whenever you like.</p><div class="stack-sm"><button class="btn btn--primary btn--block" data-act="lesson-pause">Pause and leave</button><button class="btn btn--quiet btn--block" data-act="sheet-close">Keep going</button></div>';
  act['lesson-exit'] = () => { if (!R || R.phase === 'feedback') { R = null; location.hash = '#/home'; return; } U.sheet(LS.exitSheet()); };
  act['lesson-pause'] = () => { saveDraft(); C.stopAll(); LQ.speech.cancel(); U.closeSheet(); S.event('mission.paused', L(mis().title) + ' paused at ' + PH[R.phase]); R = null; S.save(); location.hash = '#/home'; };
  LS.autoplay = () => { if (R && R.phase === 'context' && R.ctx.answer === null) setTimeout(() => { if (R && R.phase === 'context') LS.say(mis().context.line); }, 350); };
  LS.goPhase = (ph) => { if (!R) return; R.phase = ph; if (ph === 'talk') R.talkStarted = false; onEnterPhase(); };
  LS.typeAnswer = (text) => { if (!R || R.ended || !R.turn) return; if (R.phase === 'talk') handleInput({ mode: 'typed', text }, R.turnHelp ? 'hint' : 'independent'); };
})();
