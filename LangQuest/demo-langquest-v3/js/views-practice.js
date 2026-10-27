/* LangQuest V3 — recall, audio library + player, speak hub, passport (progress). */
'use strict';
(function () {
  const V = LQ.views, U = LQ.ui, S = LQ.store, A = LQ.art, C = LQ.cap, esc = U.esc, ic = U.icon;
  const st = () => S.state;
  const src = () => S.source();
  const L = o => U.L(o, src());

  /* ───────── Spaced recall: the same skill, a different scene and person ─────────
     Modes: "due" (active course), "all" (every course, due and overdue), "ahead" (on demand,
     upcoming phrases), "challenge" (transfer checkpoint). Items are {tid, id}. */
  LQ.recall = { run: null };
  function contextFor(id, tid) {
    const f = LQ.expressionById(id); if (!f) return null;
    const ctx = f.m.recall && f.m.recall[id];
    if (ctx) return Object.assign({ m: f.m, e: f.e }, ctx);
    const t = LQ.trackById(tid || f.m.track), s = S.source(t.id);
    const mean = U.L(f.e.m, s);
    return { m: f.m, e: f.e, scene: 'plaza', character: null, local: t.local || null, line: null, task: { en: 'Someone new in ' + t.city + '. Say: ' + mean, fr: 'Quelqu’un de nouveau à ' + t.city + '. Dites : ' + mean, es: 'Alguien nuevo en ' + t.city + '. Di: ' + mean, ru: 'Новый знакомый (' + t.city + '). Скажите: ' + mean } };
  }
  LQ.recall.contextFor = contextFor;
  function buildRun(mode) {
    const tid = st().active;
    let items;
    if (mode === 'challenge') {
      const p = S.prog(tid);
      items = Object.keys(p.expressions).filter(id => { const c = contextFor(id, tid); return c && c.character; }).sort((a, b) => p.expressions[a].due < p.expressions[b].due ? 1 : -1).slice(0, 2).map(id => ({ tid, id }));
    } else if (mode === 'all') items = S.dueAll().map(x => ({ tid: x.tid, id: x.r.id })).filter(x => contextFor(x.id, x.tid)).slice(0, 8);
    else if (mode === 'ahead') { const t = S.today(); const all = []; Object.entries(st().enrollments).forEach(([k, e]) => { if (e.status !== 'active') return; Object.values(S.prog(k).expressions).forEach(r => { if (r.due > t) all.push({ tid: k, id: r.id, due: r.due }); }); }); items = all.sort((a, b) => a.due < b.due ? -1 : 1).filter(x => contextFor(x.id, x.tid)).slice(0, 5).map(x => ({ tid: x.tid, id: x.id })); }
    else items = S.due(tid).map(r => ({ tid, id: r.id })).filter(x => contextFor(x.id, x.tid)).slice(0, 6);
    return { mode, tid, items, ids: items.map(x => x.id), idx: 0, st: {}, results: [] };
  }
  const TITLE = { challenge: 'New scene, same skill', all: 'Recall across courses', ahead: 'Practise ahead', due: 'Recall' };
  V.recall = (mode) => {
    mode = mode || 'due';
    let R = LQ.recall.run;
    if (!R || (R.mode !== 'all' && R.mode !== 'ahead' && R.tid !== st().active) || R.mode !== mode || (R.done && R.fresh)) R = LQ.recall.run = buildRun(mode);
    let h = V.header() + '<main class="recall" id="main"><div class="pagehead"><h1 class="h2">' + TITLE[mode] + '</h1>' + (mode === 'due' || mode === 'all' ? '<a class="btn btn--sm" href="#/review">' + ic('list', 'ic--xs') + 'Queue</a>' : '') + '</div>';
    if (!R.items.length) {
      const t = S.track(), up = S.upcoming(t.id, 7);
      h += '<div class="empty">' + U.mascot('sleep', 96) + '<p><strong>' + esc(mode === 'challenge' ? 'Practise a mission first' : mode === 'ahead' ? 'Nothing scheduled ahead yet' : U.mascotLine('nodue', {}, src())) + '</strong></p><p class="muted">' + (mode === 'challenge' ? 'Checkpoints reuse skills you’ve already practised, in a scene you haven’t seen.' : 'Phrases come back on their own schedule. Here’s the week ahead.') + '</p></div>' + calendar(up) +
        '<p class="fineprint">Demo tip: the Test lab’s clock makes tomorrow’s phrases due. The review queue lists every course.</p></main>';
      return h;
    }
    if (R.idx >= R.items.length) {
      const got = R.results.filter(r => r.result === 'got').length, close = R.results.filter(r => r.result === 'close').length, again = R.results.filter(r => r.result === 'again').length;
      R.done = true;
      h += '<div class="fb-hero">' + U.mascot('celebrate', 88) + '<div><h2 class="h3">' + R.results.length + ' recalled in new scenes</h2><p class="muted">' + got + ' got it, ' + close + ' close, ' + again + ' not yet. Each one is rescheduled from what you reported.</p></div></div>' +
        '<ul class="recallplan" role="list">' + R.results.map(r => '<li><span class="rp__p" dir="auto">' + esc(LQ.phraseText(r.id)) + '</span><span class="muted small">' + (R.mode === 'all' || R.mode === 'ahead' ? esc(LQ.trackById(r.tid).name) + '. ' : '') + esc(r.why) + '</span></li>').join('') + '</ul>' +
        calendar(S.upcoming(S.track().id, 7)) + '<div class="stack-sm"><a class="btn btn--primary btn--block" href="#/review" data-act="recall-close">Back to the review queue</a><a class="btn btn--ghost btn--block" href="#/progress" data-act="recall-close">See your passport</a></div></main>';
      return h;
    }
    const it = R.items[R.idx], id = it.id, t = LQ.trackById(it.tid), ctx = contextFor(id, it.tid), s = R.st[R.idx] = R.st[R.idx] || { state: 'prompt' };
    const ch = ctx.character ? LQ.CHARACTERS[ctx.character] : null, lc = !ch && ctx.local ? ctx.local : null;
    const Lt = o => U.L(o, S.source(it.tid));
    C.on('recall', a => { s.attempt = a; s.state = 'compare'; LQ.app.render(); setTimeout(() => U.say(ctx.e, { track: t }), 250); });
    h += '<p class="kicker">' + (R.idx + 1) + ' of ' + R.items.length + (R.mode === 'all' || R.mode === 'ahead' ? '. ' + esc(t.name) + '.' : '') + (mode === 'challenge' ? ' A transfer checkpoint: unseen scene, fewer hints.' : ' Learned in “' + esc(Lt(ctx.m.title)) + '”, now somewhere else.') + (mode === 'ahead' ? ' Early practice: rating it still reschedules it.' : '') + '</p>' +
      '<div class="rscene">' + A.scene(ctx.scene, { palette: A.plazaPalette(t) }) + (ch ? '<span class="rscene__who">' + A.portrait(ctx.character, s.state === 'compare' ? 'success' : 'talking', { size: 56 }) + '</span>' : lc ? '<span class="rscene__who">' + A.portrait(A.localLook(t), s.state === 'compare' ? 'success' : 'talking', { size: 56, look: A.localLook(t), name: lc.name }) + '</span>' : '') + '</div>';
    if (ctx.line) h += '<div class="bubble-char bubble-char--sm"><span class="msg__who">' + esc(ch ? ch.name.split(' ')[0] : lc ? lc.name : 'Local') + '</span><div class="bubble-char__txt">' + U.phrase(ctx.line, { track: t }) + (s.tr ? '<span class="gloss">' + esc(Lt(ctx.line.m)) + '</span>' : '') + '</div><div class="tools"><button class="tool" data-act="recall-line">' + ic('replay', 'ic--sm') + 'Replay</button><button class="tool" data-act="recall-tr" aria-pressed="' + !!s.tr + '">' + ic('translate', 'ic--sm') + 'Translate</button></div></div>';
    h += '<div class="prompt"><p class="prompt__t">' + esc(U.nm(Lt(ctx.task))) + '</p></div>';
    if (s.state === 'prompt') {
      h += C.widget('recall', { lang: U.srLocale(t, S.enr(t.id)), langName: t.name }) + '<div class="lfoot"><span></span><button class="btn btn--ghost" data-act="recall-reveal">Reveal answer</button></div>';
    } else {
      h += '<div class="pcard pcard--answer"><p class="small muted">Expected phrase</p><div class="pcard__phrase">' + U.phrase(ctx.e, { track: t }) + '</div><p class="pcard__m">' + esc(U.nm(Lt(ctx.e.m))) + '</p><div class="tools"><button class="tool tool--main" data-act="recall-play">' + ic('volume', 'ic--sm') + 'Listen</button><button class="tool" data-act="recall-slow">' + ic('slow', 'ic--sm') + 'Slowly</button></div></div>' +
        C.compareHtml(U.nm(ctx.e.t), s.attempt) + (s.attempt && s.attempt.mode === 'record' ? C.takeHtml('recall', true) : '');
      if (!s.rated) h += '<h3 class="q q--sm">How did it go?</h3><div class="rate" role="group" aria-label="Rate your recall"><button class="ratebtn ratebtn--got" data-act="recall-rate" data-arg="got">' + ic('check', 'ic--sm') + 'Got it</button><button class="ratebtn ratebtn--close" data-act="recall-rate" data-arg="close">' + ic('loop', 'ic--sm') + 'Close</button><button class="ratebtn ratebtn--again" data-act="recall-rate" data-arg="again">' + ic('replay', 'ic--sm') + 'Not yet</button></div>';
      else h += '<p class="sched">' + ic('calendar', 'ic--sm') + '<span>' + esc(s.why) + '</span></p><div class="lfoot"><span></span><button class="btn btn--primary" data-act="recall-next">' + (R.idx < R.items.length - 1 ? 'Next' : 'Finish') + '</button></div>';
    }
    return h + '</main>';
  };
  function calendar(up) {
    return '<section class="cal" aria-labelledby="cal-h"><h2 class="h4" id="cal-h">Due for recall, next 7 days</h2><ol class="cal__days">' + up.map((d, i) => '<li class="' + (d.items.length ? 'has' : '') + '"><span class="cal__d">' + esc(i === 0 ? 'Today' : S.fmtDay(d.d, { weekday: 'short' })) + '</span><span class="cal__n">' + d.items.length + '</span><span class="sr-only"> phrases</span></li>').join('') + '</ol></section>';
  }
  V.calendar = calendar;
  const ra = LQ.recallActs = {};
  const cur = () => { const R = LQ.recall.run; const it = R.items[R.idx]; return { R, id: it.id, tid: it.tid, t: LQ.trackById(it.tid), ctx: contextFor(it.id, it.tid), s: R.st[R.idx] }; };
  ra['recall-line'] = () => { const c = cur(); if (c.ctx.line) U.say(c.ctx.line, { track: c.t, character: c.ctx.character }); };
  ra['recall-tr'] = () => { const c = cur(); c.s.tr = !c.s.tr; c.s.helped = true; LQ.app.render(); };
  ra['recall-reveal'] = () => { C.stopAll(); const c = cur(); c.s.revealed = true; c.s.state = 'compare'; LQ.app.render(); U.say(c.ctx.e, { track: c.t }); };
  ra['recall-play'] = () => { const c = cur(); U.say(c.ctx.e, { track: c.t }); };
  ra['recall-slow'] = () => { const c = cur(); U.say(c.ctx.e, { track: c.t, slow: true }); };
  ra['recall-rate'] = (el) => {
    const c = cur(), result = el.dataset.arg, tid = c.tid;
    if (c.s.rated) return;
    const assisted = c.s.revealed && !c.s.attempt ? 'revealed' : c.s.helped ? 'hint' : false;
    const r = S.schedule(tid, c.id, result, { assisted, kind: c.R.mode === 'challenge' ? 'challenge' : 'recall', scene: c.ctx.scene });
    const sk = LQ.exprSkill(c.id);
    if (sk) S.observe(tid, sk, { mission: c.ctx.m.id, scene: c.ctx.scene, kind: 'recall', autonomy: assisted ? (assisted === 'revealed' ? 'revealed' : 'hint') : 'independent', input: c.s.attempt ? (c.s.attempt.mode === 'record' ? 'self' : c.s.attempt.mode) : 'none', ok: result !== 'again', said: c.s.attempt && c.s.attempt.text });
    if (result !== 'again') S.award('r:' + c.id + ':' + S.today(), 10, 'Recalled “' + LQ.phraseText(c.id) + '” in a new scene', tid);
    c.s.rated = result; c.s.why = r.why; c.R.results.push({ id: c.id, tid, result, why: r.why }); S.save(); LQ.app.render();
  };
  ra['recall-next'] = () => { C.stopAll(); const R = LQ.recall.run; R.idx++; LQ.app.render(true); };
  ra['recall-close'] = () => { LQ.recall.run = null; };

  /* ───────── Audio library ───────── */
  V.audio = () => {
    const t = S.track(), q = (LQ.ui.audioQuery || '').toLowerCase(), fsrc = LQ.ui.audioSrc || 'all';
    const all = LQ.audioCollections();
    const match = c => (!q || (c.title + ' ' + c.by + ' ' + c.chapters.map(ch => ch.title + ' ' + ch.lessons.map(l => l.title + ' ' + (l.speakers || '')).join(' ')).join(' ') + ' ' + LQ.trackById(c.track).name).toLowerCase().includes(q)) && (fsrc === 'all' || c.source === fsrc);
    const mine = all.filter(c => c.track === t.id && match(c)), others = all.filter(c => c.track !== t.id && match(c));
    const p = S.prog();
    const cont = Object.entries(p.audio).sort((a, b) => a[1].updated < b[1].updated ? 1 : -1).map(([id, v]) => ({ id, v, f: LQ.lessonById(id) })).find(x => x.f && x.f.l.segs && x.v.pos < x.f.l.segs.length);
    let h = V.header() + '<main class="audio" id="main"><h1 class="h2">Audio courses</h1>';
    if (cont) h += '<a class="cont" href="#/listen/' + cont.id + '"><span class="cont__cover" style="--tint:' + cont.f.c.tint + '">' + A.scene(cont.f.c.scene) + '</span><span class="cont__main"><span class="small muted">Continue listening</span><strong>' + esc(cont.f.l.title) + '</strong><span class="meter"><span style="width:' + Math.round(100 * cont.v.pos / cont.f.l.segs.length) + '%"></span></span></span>' + ic('play') + '</a>';
    h += '<label class="search">' + ic('search', 'ic--sm') + '<span class="sr-only">Search audio by title, speaker, chapter or language</span><input type="search" data-input="audio-q" placeholder="Title, speaker, chapter or language" value="' + esc(LQ.ui.audioQuery || '') + '"></label>' +
      '<div class="chips chips--scroll" role="group" aria-label="Instruction language">' + [['all', 'Any instructions']].concat(LQ.SOURCES.slice(0, 4).map(s => [s.code, s.name + ' narration'])).map(x => '<button class="fchip' + (fsrc === x[0] ? ' is-on' : '') + '" aria-pressed="' + (fsrc === x[0]) + '" data-act="audio-src" data-arg="' + x[0] + '">' + esc(x[1]) + '</button>').join('') + '</div>';
    const card = c => { const n = c.chapters.reduce((a, ch) => a + ch.lessons.length, 0); const secs = c.chapters.reduce((a, ch) => a + ch.lessons.reduce((b, l) => b + LQ.lessonSeconds(l), 0), 0); const tr = LQ.trackById(c.track);
      return '<li><a class="col" href="#/audio/' + c.id + '"><span class="col__cover" style="--tint:' + c.tint + '">' + A.scene(c.scene, { palette: A.plazaPalette(tr) }) + '</span><span class="col__meta"><strong>' + esc(c.title) + '</strong><span class="small">' + esc(tr.name) + '</span><span class="muted small">' + n + ' lesson' + (n > 1 ? 's' : '') + (secs ? ', about ' + Math.max(1, Math.round(secs / 60)) + ' min' : '') + '. Narration in ' + esc(S.srcName(c.source)) + '. ' + esc(c.by) + '</span>' + (c.uploaded ? '<span class="tag tag--cobalt">Uploaded recording</span>' : c.archive ? '<span class="tag">Archive recording</span>' : '<span class="tag">Script lesson</span>') + '</span></a></li>'; };
    h += '<h2 class="h4">For ' + esc(t.name) + '</h2>' + (mine.length ? '<ul class="cols" role="list">' + mine.map(card).join('') + '</ul>' : '<p class="muted">No audio course for this course matches. Clear the search or check other courses below.</p>');
    h += '<h2 class="h4">Other courses</h2>' + (others.length ? '<ul class="cols" role="list">' + others.map(card).join('') + '</ul>' : '<p class="muted">Nothing else matches.</p>');
    h += '<p class="fineprint">Script lessons are read by your device’s voices in this demo; the full product plays native recordings. Original recordings are always played unaltered, including their pauses.</p></main>';
    return h;
  };
  V.collection = (cid) => {
    const c = LQ.audioCollections().find(x => x.id === cid); if (!c) return V.notFound();
    const p = S.prog(c.track), tr = LQ.trackById(c.track);
    const dl = (st().downloads || {});
    let h = V.header() + '<main class="collection" id="main"><a class="backlink" href="#/audio">' + ic('back', 'ic--sm') + ' Audio</a>' +
      '<div class="col__hero" style="--tint:' + c.tint + '">' + A.scene(c.scene, { palette: A.plazaPalette(tr) }) + '<div class="col__heroText"><h1 class="h2">' + esc(c.title) + '</h1><p>' + esc(tr.name) + ', narrated in ' + esc(S.srcName(c.source)) + '</p></div></div>' +
      '<ul class="facts" role="list"><li>' + ic('user', 'ic--sm') + '<span>' + esc(c.by) + '</span></li><li>' + ic('volume', 'ic--sm') + '<span>' + esc(c.voiceNote) + '</span></li><li>' + ic('shield', 'ic--sm') + '<span>Rights: ' + esc(c.rights) + '</span></li></ul>';
    c.chapters.forEach(ch => {
      h += '<h2 class="h4">' + esc(ch.title) + '</h2><ul class="lessons" role="list">' + ch.lessons.map(l => { const pr = p.audio[l.id] || {}; const total = l.segs ? l.segs.length : 0; const secs = LQ.lessonSeconds(l);
        return '<li class="lessonrow"><a class="lessonrow__main" href="#/listen/' + l.id + '">' + ic('play', 'ic--sm') + '<span><strong>' + esc(l.title) + '</strong><span class="muted small">' + (secs ? 'about ' + U.fmtDur(secs) : 'length unknown') + '. ' + esc(l.speakers || '') + (pr.bookmarks && pr.bookmarks.length ? '. ' + pr.bookmarks.length + ' bookmark' + (pr.bookmarks.length > 1 ? 's' : '') : '') + '</span>' + (total ? '<span class="meter"><span style="width:' + Math.round(100 * Math.min(pr.pos || 0, total) / total) + '%"></span></span>' : '') + '</span></a>' +
          (l.segs ? '<button class="iconbtn" data-act="audio-download" data-arg="' + l.id + '" aria-label="' + (dl[l.id] ? 'Downloaded. Download the lesson pack again' : 'Download lesson pack for offline use') + '">' + ic(dl[l.id] ? 'check' : 'download', 'ic--sm') + '</button>' : '') + '</li>'; }).join('') + '</ul>';
    });
    h += '<p class="fineprint">Downloads save a lesson pack (script, transcript and timings) as a file. Offline audio needs the mobile app’s download manager, which this web demo doesn’t include.</p></main>';
    return h;
  };

  /* ───────── Player: Pimsleur-style script lessons and real uploaded files ───────── */
  const P = LQ.player = { id: null, playing: false, idx: 0, rate: 1, loop: false, gen: 0, sleepAt: null, sleepTimer: null, el: null, mode: null };
  P.lesson = () => P.id ? LQ.lessonById(P.id) : null;
  P.load = (id) => {
    /* A published studio upload attached to this lesson replaces the device voices. */
    const att = (S.state.studio.assets || []).find(a => a.attach && a.attach.kind === 'lesson' && a.attach.id === id && a.published && LQ.studio.fileUrl(a.id));
    if (P.id === id && (P.attached ? P.attached.id : null) === (att ? att.id : null)) return;
    P.stop(); P.id = id; P.loop = false;
    const f = P.lesson(); if (!f) return;
    const pr = S.prog(f.c.track).audio[id] || {};
    P.attached = att || null;
    P.mode = f.l.upload || att ? 'file' : f.l.archive ? 'archive' : 'script';
    P.idx = f.l.segs ? Math.min(pr.pos || 0, f.l.segs.length - 1) : 0;
    if (P.mode === 'file') { const url = LQ.studio && LQ.studio.fileUrl(f.l.upload || att.id); if (url) { P.el = new Audio(url); P.el.playbackRate = P.rate; if (pr.time) P.el.currentTime = pr.time; P.el.ontimeupdate = () => { const a = document.getElementById('p-seek'); if (a && P.el.duration) { a.value = Math.round(1000 * P.el.currentTime / P.el.duration); } const tt = document.getElementById('p-time'); if (tt) tt.textContent = U.fmtDur(P.el.currentTime) + ' / ' + U.fmtDur(P.el.duration || 0); }; P.el.onended = () => { P.playing = false; LQ.app.render(); }; P.el.onloadedmetadata = () => LQ.app.render(); } }
  };
  function savePos() { const f = P.lesson(); if (!f) return; const p = S.prog(f.c.track); p.audio[P.id] = Object.assign(p.audio[P.id] || { bookmarks: [] }, { pos: P.idx, updated: S.today(), time: P.el ? P.el.currentTime : undefined }); S.save(); }
  function playSeg() {
    const f = P.lesson(); if (!f || !P.playing) return;
    const segs = f.l.segs, seg = segs[P.idx], g = ++P.gen;
    paintSeg();
    const next = () => { if (g !== P.gen || !P.playing) return; if (P.loop) { playSeg(); return; } if (P.idx < segs.length - 1) { P.idx++; savePos(); playSeg(); } else { P.playing = false; P.idx = segs.length; savePos(); S.award('audio:' + P.id + ':' + S.today(), 10, 'Listened to “' + f.l.title + '”', f.c.track); S.event('audio.completed', f.l.title); S.save(); LQ.app.render(); } };
    if (seg.p) { setTimeout(next, seg.p * 1000); return; }
    const timed = () => setTimeout(next, LQ.segSeconds(seg) * 1000 / P.rate);
    let r;
    if (seg.n) r = U.sayNarrator(seg.n, f.c.source, { rate: P.rate, onend: (why) => { if (why === 'no-voice' || why === 'no-tts') timed(); else next(); } });
    else r = U.say({ t: seg.s, r: seg.r }, { track: LQ.trackById(f.c.track), slow: seg.slow, fast: seg.fast, onend: (why) => { if (why === 'no-voice' || why === 'no-tts') timed(); else if (why !== 'cancelled') next(); } });
  }
  function paintSeg() {
    document.querySelectorAll('.tx__seg').forEach(el => { const on = +el.dataset.i === P.idx; el.classList.toggle('is-on', on); if (on) { el.setAttribute('aria-current', 'true'); const box = el.closest('.tx'); if (box) box.scrollTop = el.offsetTop - box.offsetTop - 60; } else el.removeAttribute('aria-current'); });
    const f = P.lesson(); const bar = document.getElementById('p-prog'); if (f && bar && f.l.segs) { const done = f.l.segs.slice(0, P.idx).reduce((a, s) => a + LQ.segSeconds(s), 0), tot = LQ.lessonSeconds(f.l); bar.style.width = (100 * done / tot) + '%'; const tt = document.getElementById('p-time'); if (tt) tt.textContent = U.fmtDur(done) + ' / ' + U.fmtDur(tot); }
  }
  P.paint = paintSeg;
  P.play = () => { const f = P.lesson(); if (!f) return; P.started = true; if (P.mode === 'archive') return; if (P.mode === 'file') { if (!P.el) return; P.playing = true; const pr = P.el.play(); if (pr && pr.catch) pr.catch(() => { P.playing = false; U.toast('This file couldn’t be played in this browser.'); LQ.app.render(); }); LQ.app.render(); return; } if (P.idx >= f.l.segs.length) P.idx = 0; P.playing = true; LQ.app.render(); playSeg(); };
  P.pause = () => { P.playing = false; P.gen++; LQ.speech.cancel(); if (P.el) P.el.pause(); savePos(); LQ.app.render(); };
  P.stop = () => { P.playing = false; P.gen++; try { LQ.speech.cancel(); } catch (e) { } if (P.el) { P.el.pause(); P.el = null; } };
  P.close = () => { P.stop(); P.id = null; P.started = false; clearTimeout(P.sleepTimer); P.sleepAt = null; LQ.app.render(); };
  P.skip = (sec) => {
    if (P.mode === 'file' && P.el) { P.el.currentTime = Math.max(0, Math.min((P.el.duration || 0), P.el.currentTime + sec)); savePos(); return; }
    const f = P.lesson(); if (!f) return; const segs = f.l.segs; let acc = 0, i = P.idx;
    if (sec > 0) { while (i < segs.length - 1 && acc < sec) { acc += LQ.segSeconds(segs[i]); i++; } } else { while (i > 0 && acc < -sec) { i--; acc += LQ.segSeconds(segs[i]); } }
    P.idx = i; savePos(); if (P.playing) { P.gen++; LQ.speech.cancel(); setTimeout(playSeg, 60); } else paintSeg();
  };
  P.seekSeg = (i) => { P.idx = i; savePos(); if (P.playing) { P.gen++; LQ.speech.cancel(); setTimeout(playSeg, 60); } else LQ.app.render(); };
  P.sleep = (min) => { clearTimeout(P.sleepTimer); if (!min) { P.sleepAt = null; LQ.app.render(); return; } P.sleepAt = Date.now() + min * 60000; P.sleepTimer = setTimeout(() => { P.pause(); P.sleepAt = null; U.toast('Sleep timer: playback paused.'); }, min * 60000); LQ.app.render(); };

  V.listen = (id) => {
    const f = LQ.lessonById(id); if (!f) return V.notFound();
    P.load(id);
    const tr = LQ.trackById(f.c.track), pr = S.prog(f.c.track).audio[id] || { bookmarks: [] };
    const narr = LQ.SOURCES.find(s => s.code === f.c.source);
    const nv = LQ.speech.findVoice(narr.voice, { allowNear: true }), tv = U.voiceStatus(tr, S.enr(tr.id) || {});
    let h = '<main class="player" id="main"><header class="lhead"><a class="iconbtn" href="#/audio/' + f.c.id + '" aria-label="Back to the collection">' + ic('down') + '</a><div class="lhead__t"><span class="small muted">' + esc(f.c.title) + ', ' + esc(f.ch.title) + '</span><strong>' + esc(f.l.title) + '</strong></div></header>' +
      '<div class="player__art" style="--tint:' + f.c.tint + '">' + A.scene(f.c.scene, { palette: A.plazaPalette(tr) }) + '</div>';
    if (P.mode === 'archive') {
      h += '<div class="callout">' + ic('info') + '<div><strong>Original recording, not bundled with this demo</strong><p>This lesson is published from the founder archive. The product streams it from private storage with a short-lived link; this static demo has no access to those files.</p></div></div></main>';
      return h;
    }
    if (P.mode === 'file') {
      if (!P.el) { h += '<div class="callout">' + ic('upload') + '<div><strong>Re-attach the file to play it</strong><p>Uploaded files stay in the browser session that added them. Open the content studio and drop the same file again; its checksum will match.</p><a class="btn btn--sm" href="#/studio/library">Open the library</a></div></div></main>'; return h; }
      const dur = P.el.duration || 0;
      h += '<p class="player__voice">' + ic('volume', 'ic--xs') + (P.attached ? 'Studio recording attached: “' + esc(P.attached.title) + '”, ' + esc(P.attached.speaker || 'uploaded') + '. Played unaltered; the transcript below is the lesson script, not time-synced.' : 'Original uploaded recording, played unaltered.') + '</p>' +
        '<label class="seek"><span class="sr-only">Seek</span><input type="range" id="p-seek" min="0" max="1000" value="' + (dur ? Math.round(1000 * P.el.currentTime / dur) : 0) + '" data-input="p-seek"></label><p class="p-time" id="p-time">' + U.fmtDur(P.el.currentTime) + ' / ' + U.fmtDur(dur) + '</p>';
    } else {
      h += '<p class="player__voice">' + ic('volume', 'ic--xs') + esc(nv ? 'Narrator: ' + nv.voice.name : 'No ' + narr.name + ' voice: narrator shown as timed text') + '. ' + esc(tv.ok ? 'Speakers: ' + tv.name : 'Speakers: timed text (no ' + tr.tts[0] + ' voice)') + '.</p>' +
        '<div class="seekbar" aria-hidden="true"><span id="p-prog"></span></div><p class="p-time" id="p-time"></p>';
    }
    h += '<div class="pctl"><button class="iconbtn iconbtn--lg" data-act="p-back" aria-label="Back 15 seconds">' + ic('skipb') + '<span class="pctl__n">15</span></button>' +
      '<button class="playbtn" data-act="p-toggle" aria-label="' + (P.playing ? 'Pause' : 'Play') + '">' + ic(P.playing ? 'pause' : 'play') + '</button>' +
      '<button class="iconbtn iconbtn--lg" data-act="p-fwd" aria-label="Forward 15 seconds">' + ic('skipf') + '<span class="pctl__n">15</span></button></div>' +
      '<div class="pbar"><div class="seg seg--mini" role="group" aria-label="Playback speed">' + [0.75, 1, 1.25].map(r => '<button class="segbtn' + (P.rate === r ? ' is-on' : '') + '" aria-pressed="' + (P.rate === r) + '" data-act="p-rate" data-arg="' + r + '">' + r + '×</button>').join('') + '</div>' +
      '<label class="pbar__sleep">' + ic('moon', 'ic--sm') + '<span class="sr-only">Sleep timer</span><select data-change="p-sleep"><option value="0">Sleep off</option>' + [5, 10, 15].map(m => '<option value="' + m + '"' + (P.sleepAt && Math.round((P.sleepAt - Date.now()) / 60000) === m ? ' selected' : '') + '>' + m + ' min</option>').join('') + '</select></label>' +
      (P.mode === 'script' ? '<button class="tool" data-act="p-loop" aria-pressed="' + P.loop + '">' + ic('loop', 'ic--sm') + 'Loop phrase</button>' : '') +
      '<button class="tool" data-act="p-bookmark" aria-pressed="' + (pr.bookmarks || []).includes(P.idx) + '">' + ic('bookmark', 'ic--sm') + 'Bookmark</button></div>' +
      (P.sleepAt ? '<p class="small muted center">Sleep timer pauses playback at ' + new Date(P.sleepAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.</p>' : '');
    if (f.l.segs) {
      h += '<div class="pactions">' + (f.l.mission ? '<a class="btn btn--primary" href="#/play/' + f.l.mission + '" data-act="p-pause-nav">' + ic('mic', 'ic--sm') + 'Practise this as a mission</a>' : '') + '<button class="btn btn--ghost" data-act="p-coach">' + ic('ear', 'ic--sm') + 'Practise this phrase</button></div>' +
        '<h2 class="h4">Transcript</h2><ol class="tx" aria-label="Transcript, follows playback">' + f.l.segs.map((s, i) => '<li class="tx__seg tx__seg--' + (s.p ? 'pause' : s.n ? 'narr' : 'tgt') + (i === P.idx ? ' is-on' : '') + '" data-i="' + i + '"' + (i === P.idx ? ' aria-current="true"' : '') + '><button class="tx__jump" data-act="p-seek-seg" data-arg="' + i + '" aria-label="Play from here">' + ((pr.bookmarks || []).includes(i) ? ic('bookmark', 'ic--xs') : '<span class="tx__n">' + (i + 1) + '</span>') + '</button>' +
          (s.s ? '<button class="tx__save ltool" data-act="tx-save" data-arg="' + i + '" aria-label="Save “' + esc(s.s) + '” to your notebook" aria-pressed="' + LQ.notebook.hasLine(tr.id, { t: s.s }) + '">' + ic(LQ.notebook.hasLine(tr.id, { t: s.s }) ? 'check' : 'bookmark', 'ic--xs') + '</button>' : '') + (s.p ? '<span class="muted">' + ic('pausecircle', 'ic--xs') + esc(s.cue || 'Pause') + ', ' + s.p + ' s. Instructional pause, kept as authored.</span>' : s.n ? '<span lang="' + f.c.source + '">' + esc(s.n) + '</span>' : '<span>' + (s.who ? '<span class="msg__who">' + esc(s.who) + '</span>' : '') + U.phrase({ t: s.s, r: s.r }, { track: tr }) + '<span class="gloss">' + esc(s.g || '') + '</span></span>') + '</li>').join('') + '</ol>';
    } else if (P.mode === 'file') h += '<p class="muted small">No transcript yet. In the studio, request transcription to add a reviewed, time-coded transcript.</p>';
    return h + '</main>';
  };
  LQ.recallActs['tx-save'] = (el) => { const f = P.lesson(); if (!f) return; const seg = f.l.segs[+el.dataset.arg]; if (!seg || !seg.s) return; if (!S.enr(f.c.track)) { U.toast('Enroll in ' + LQ.trackById(f.c.track).name + ' to keep a notebook for it.'); return; } LQ.notebook.saveLine(f.c.track, { t: seg.s, r: seg.r || '', m: { [f.c.source]: seg.g || '' } }, 'audio: ' + f.l.title); };
  V.miniPlayer = () => {
    const f = P.lesson(); if (!f || !P.started || location.hash.startsWith('#/listen/')) return '';
    return '<div class="mini" role="region" aria-label="Now playing"><a class="mini__t" href="#/listen/' + P.id + '"><strong>' + esc(f.l.title) + '</strong><span class="small muted">' + esc(f.c.title) + '</span></a><button class="iconbtn" data-act="p-toggle" aria-label="' + (P.playing ? 'Pause' : 'Play') + '">' + ic(P.playing ? 'pause' : 'play', 'ic--sm') + '</button><button class="iconbtn" data-act="p-close" aria-label="Close player">' + ic('close', 'ic--sm') + '</button></div>';
  };

  /* ───────── Speak hub ───────── */
  V.speak = () => {
    const t = S.track(), chars = Object.entries(LQ.CHARACTERS).filter(([k, c]) => c.track === t.id);
    const saved = Object.keys(S.prog().expressions);
    return V.header() + '<main class="speak" id="main"><h1 class="h2">Speak</h1>' +
      '<a class="bigcard" href="#/speak/coach">' + U.mascot('listening', 72) + '<span><strong>Pronunciation coach</strong><span class="muted">Hear a reference, record yourself, compare side by side. ' + saved.length + ' phrase' + (saved.length === 1 ? '' : 's') + ' saved.</span></span>' + ic('chevron', 'ic--sm') + '</a>' +
      '<a class="bigcard" href="#/speak/challenge">' + U.mascot('curious', 72) + '<span><strong>New scene, same skill</strong><span class="muted">A transfer checkpoint: use what you know with someone new.</span></span>' + ic('chevron', 'ic--sm') + '</a>' +
      '<a class="bigcard" href="#/missions">' + U.mascot('speaking', 72) + '<span><strong>Guided conversations</strong><span class="muted">Branching role-plays with ' + (chars.length ? chars.map(([k, c]) => c.name.split(' ')[0]).join(', ') : 'locals') + '.</span></span>' + ic('chevron', 'ic--sm') + '</a>' +
      '<a class="bigcard" href="#/talk">' + U.mascot('happy', 72) + '<span><strong>Talk freely with ' + esc(LQ.talk.partner(t.id).name) + '</strong><span class="muted">' + esc(LQ.ai.on() ? 'Open conversation in ' + t.variety + ' with live AI on your key: gentle corrections, phrases to save, no scores.' : 'Rules mode: a scoped chat about greetings, names, coffee, prices and directions. Add a key in the Test lab for an open conversation.') + '</span></span>' + ic('chevron', 'ic--sm') + '</a>' +
      (chars.length ? '<h2 class="h4">Meet the locals</h2><ul class="locals" role="list">' + chars.map(([k, c]) => '<li><a class="local" href="#/speak/locals/' + k + '">' + A.portrait(k, 'greeting', { size: 72 }) + '<strong>' + esc(c.name) + '</strong><span class="muted small">' + esc(U.L(c.role, src())) + '</span></a></li>').join('') + '</ul>' : '<p class="muted">This course’s cast is in production. First-words lessons use a local speaker.</p>') + '</main>';
  };
  V.local = (cid) => {
    const c = LQ.CHARACTERS[cid]; if (!c) return V.notFound();
    const p = S.prog(c.track), mem = p.memory[cid] || [], tr = LQ.trackById(c.track);
    const vs = U.voiceStatus(tr, S.enr(c.track) || {});
    const missions = LQ.MISSIONS.filter(m => m.character === cid);
    return V.header() + '<main class="localpage" id="main"><a class="backlink" href="#/speak">' + ic('back', 'ic--sm') + ' Speak</a>' +
      '<div class="local__hero">' + A.portrait(cid, 'greeting', { size: 112 }) + '<div><h1 class="h2">' + esc(c.name) + '</h1><p class="muted">' + esc(U.L(c.role, src())) + ', ' + esc(c.place) + '</p></div></div>' +
      '<ul class="facts" role="list"><li>' + ic('globe', 'ic--sm') + '<span>Speaks ' + esc(c.variety) + '</span></li><li>' + ic('volume', 'ic--sm') + '<span>' + esc(vs.text) + '</span></li><li>' + ic('user', 'ic--sm') + '<span>' + esc(U.L(c.personality, src())) + '</span></li></ul>' +
      '<h2 class="h4">Expressions</h2><p class="muted small">One consistent visual profile, eight states used during conversations.</p><ul class="exprs" role="list">' + A.PORTRAIT_EXPRESSIONS.map(e => '<li>' + A.portrait(cid, e, { size: 64 }) + '<span class="small">' + e + '</span></li>').join('') + '</ul>' +
      '<h2 class="h4">' + esc(c.name.split(' ')[0]) + ' remembers</h2>' + (mem.length ? '<ul class="memlist" role="list">' + mem.map(x => '<li><span class="muted small">' + esc(S.fmtDay(x.at)) + '</span>' + esc(U.L(x, src())) + '</li>').join('') + '</ul>' : '<p class="muted">Nothing yet. Short story notes are saved after conversations, never full transcripts.</p>') +
      '<h2 class="h4">Story</h2><ul class="memlist" role="list">' + (c.story.length ? c.story.map(s => { const done = (p.missions[s.after] || {}).status === 'done'; const m = LQ.missionById(s.after); return '<li class="' + (done ? '' : 'is-locked') + '">' + (done ? esc(U.L(s, src())) : '<span class="muted">Revealed after you complete “' + esc(U.L(m.title, src())) + '”. Always free.</span>') + '</li>'; }).join('') : '<li class="muted">Backstory in production.</li>') + '</ul>' +
      (missions.length ? '<h2 class="h4">Conversations</h2><ul class="mlist" role="list">' + missions.map(m => '<li><a class="mrow" href="#/mission/' + m.id + '"><span class="mrow__thumb">' + A.scene(m.scene) + '</span><span class="mrow__main"><strong>' + esc(U.L(m.title, src())) + '</strong><span class="muted small">' + (m.status === 'preview' ? 'In production' : m.minutes + ' min') + '</span></span></a></li>').join('') + '</ul>' : '') + '</main>';
  };

  /* Pronunciation coach: reference audio, record, compare. Never a numeric score. */
  LQ.TIPS = {
    'es-cafe-con-leche': 'Two clean syllables in “le-che”, with the “ch” of “church”. “Café” stresses the last syllable.',
    'es-buenos-dias': '“Días” has two syllables, DEE-as. The “b” in “buenos” is soft, lips barely touching.',
    'es-cuanto-es': 'Run it together: “cuánto-es”. Rise at the end for a question.',
    'es-mas-despacio': '“Despacio” is des-PA-sio, with the stress in the middle.',
    'es-hola-que-tal': 'The “h” in “hola” is silent. “Qué tal” is one smooth breath.',
    'ary-bghit-nss': 'The “gh” (غ) is a soft gargle, like a French “r”. Darija drops many short vowels: bghit, not baghit.',
    'ary-bch7al': 'The “7” is ح, a breathy “h” from deep in the throat.',
    'fr-pour-apporter': 'Keep the “r” at the back of the throat. “Apporter” ends like “ay”.',
    'ja-latte': 'Give each beat equal length: ka-fe-ra-te. The “u” in “kudasai” is nearly silent.',
    'en-latte': 'Americans blend “Can I get a” into one quick phrase: “canna-get-a”.'
  };
  LQ.coach = { id: null, takes: [] };
  V.coach = (eid) => {
    const t = S.track(), p = S.prog();
    const ids = Object.keys(p.expressions).concat(LQ.missionsFor(t.id).filter(m => m.status === 'playable').flatMap(m => (m.expressions || []).map(e => e.id))).filter((v, i, a) => a.indexOf(v) === i).filter(id => LQ.expressionById(id));
    if (LQ.coach.custom && !eid) eid = 'custom';
    const id = eid || LQ.coach.id || ids[0];
    if (LQ.coach.id !== id) { LQ.coach.id = id; LQ.coach.takes.forEach(x => { try { URL.revokeObjectURL(x.url); } catch (e) { } }); LQ.coach.takes = []; LQ.coach.attempt = null; }
    const ex = id === 'custom' ? LQ.coach.custom : (LQ.expressionById(id) || {}).e;
    if (!ex) return V.header() + '<main class="coach" id="main"><div class="empty">' + U.mascot('curious', 80) + '<p>No phrases yet. Finish a mission to fill your coach list.</p><a class="btn btn--primary" href="#/missions">Open missions</a></div></main>';
    const as = LQ.ASSESS[t.assess];
    C.on('coach', a => { if (a.mode === 'record') { LQ.coach.takes.unshift({ url: a.take.url, seconds: a.take.seconds, at: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) }); C.takes = {}; } else LQ.coach.attempt = a; if (a.mode === 'speech') { const c = LQ.match.compare(U.nm(ex.t), a.text); const sk = LQ.exprSkill(id); if (sk) S.observe(t.id, sk, { mission: 'coach', scene: 'coach', kind: 'coach', autonomy: 'independent', input: 'speech', ok: c.heardCount / c.total >= 0.6, said: a.text }); S.save(); } LQ.app.render(); });
    let h = V.header() + '<main class="coach" id="main"><a class="backlink" href="#/speak">' + ic('back', 'ic--sm') + ' Speak</a><h1 class="h2">Pronunciation coach</h1>' +
      '<div class="chips chips--scroll" role="group" aria-label="Choose a phrase">' + ids.slice(0, 14).map(x => '<a class="fchip' + (x === id ? ' is-on' : '') + '" href="#/speak/coach/' + x + '"' + (x === id ? ' aria-current="true"' : '') + ' dir="auto">' + esc(LQ.phraseText(x)) + '</a>').join('') + '</div>' +
      '<div class="pcard pcard--big"><div class="pcard__phrase">' + U.phrase(ex, { track: t }) + '</div><p class="pcard__m">' + esc(U.nm(L(ex.m || { en: '' }))) + '</p>' +
      '<div class="tools"><button class="tool tool--main" data-act="coach-play">' + ic('volume', 'ic--sm') + 'Reference</button><button class="tool" data-act="coach-slow">' + ic('slow', 'ic--sm') + 'Slowly</button>' + (t.scriptModes ? '<button class="tool" data-act="coach-script">' + ic('text', 'ic--sm') + 'Script: ' + esc((S.enr().script || 'both')) + '</button>' : '') + '</div></div>' +
      (LQ.TIPS[id] ? '<p class="tip">' + ic('bulb', 'ic--sm') + '<span><strong>Listen for:</strong> ' + esc(LQ.TIPS[id]) + ' <span class="muted small">(Coach note written for this demo, awaiting native review.)</span></span></p>' : '') +
      '<div class="coach__rec">' + C.widget('coach', { lang: U.srLocale(t, S.enr()), langName: t.name, allowSelf: false, label: C.srUsable() ? 'Say it: the recognizer shows the words it heard' : 'Record yourself' }) + '</div>' +
      (LQ.coach.attempt ? C.compareHtml(U.nm(ex.t), LQ.coach.attempt) : '') +
      (LQ.coach.takes.length ? '<h2 class="h4">Your takes (this visit only)</h2><ul class="takes" role="list">' + LQ.coach.takes.map((x, i) => '<li><span>' + esc(x.at) + ', ' + x.seconds.toFixed(1) + ' s</span><button class="btn btn--sm" data-act="coach-take" data-arg="' + i + '">' + ic('play', 'ic--xs') + 'Play</button><button class="btn btn--sm" data-act="coach-ab" data-arg="' + i + '">' + ic('loop', 'ic--xs') + 'Reference, then me</button></li>').join('') + '</ul><p class="muted small">Takes live in memory and are deleted when you leave this screen.</p>' : '') +
      '<h2 class="h4">What this coach can and can’t tell you</h2><ul class="facts" role="list">' +
      '<li>' + ic('check', 'ic--sm') + '<span>Reference audio at normal and slow speed, and your own recording to compare by ear.</span></li>' +
      '<li>' + ic(C.srUsable() ? 'check' : 'info', 'ic--sm') + '<span>' + (C.srUsable() ? 'Which words the browser’s recognizer picked up. Useful for intelligibility, not proof of accent.' : 'Word recognition isn’t available in this browser.') + '</span></li>' +
      '<li>' + ic('info', 'ic--sm') + '<span>Detailed sound-by-sound assessment for ' + esc(t.name) + ': ' + esc(as.label.toLowerCase()) + '. ' + esc(as.detail) + '</span></li></ul></main>';
    return h;
  };

  /* ───────── Passport: can-do evidence, stamps, recall calendar; XP kept separate ───────── */
  V.progress = () => {
    const t = S.track(), p = S.prog(), sk = Array.from(new Set(LQ.missionsFor(t.id).filter(m => m.status === 'playable').flatMap(m => m.skills).concat(Object.keys(p.skills))));
    const stamps = sk.filter(k => ['independent', 'durable'].includes(S.skillState(t.id, k)));
    const done = Object.entries(p.missions).filter(([k, v]) => v.status === 'done');
    const open = LQ.ui.openSkill;
    let h = V.header() + '<main class="passport" id="main"><h1 class="h2">Passport</h1><p class="muted">What you’ve shown you can do in ' + esc(t.name) + '. LangQuest doesn’t compute a fluency score; this page lists what was observed.</p>';
    h += '<section class="stamps" aria-labelledby="st-h"><h2 class="h4" id="st-h">Stamps</h2><p class="muted small">A stamp needs a conversation done without hints. It turns durable once you recall it a day later in a different scene.</p><ul class="stamps__grid" role="list">' +
      sk.map(k => { const s = S.skillState(t.id, k), on = s === 'independent' || s === 'durable'; return '<li class="stamp' + (on ? ' is-on stamp--' + s : '') + '">' + stampSvg(t, k, s) + '<span class="small">' + esc(LQ.SKILLS[k].en) + '</span><span class="sr-only">' + (on ? 'Stamped, ' + s : 'Not stamped yet') + '</span></li>'; }).join('') + '</ul><p class="small muted">' + stamps.length + ' of ' + sk.length + ' stamped.</p></section>';
    h += '<section aria-labelledby="cd-h"><h2 class="h4" id="cd-h">Can-do skills and evidence</h2><ul class="skills" role="list">' + sk.map(k => {
      const s = S.skillState(t.id, k), d = S.skillDims(t.id, k), ev = ((p.skills[k] || {}).evidence || []), def = LQ.SKILL_STATES.find(x => x.id === s);
      const dim = (on, label) => '<span class="dim' + (on ? ' is-on' : '') + '">' + (on ? ic('check', 'ic--xs') : '<span class="dim__o" aria-hidden="true"></span>') + label + '<span class="sr-only">' + (on ? ': observed' : ': not yet') + '</span></span>';
      return '<li class="skill"><button class="skill__head" data-act="skill-toggle" data-arg="' + k + '" aria-expanded="' + (open === k) + '"><span><strong>' + esc(LQ.SKILLS[k].en) + '</strong><span class="muted small">' + esc(U.L(LQ.SKILLS[k].can, src())) + '</span></span>' + U.stateChip(s) + '</button>' +
        '<div class="dims">' + dim(d.listening, 'Listening') + dim(d.meaning, 'Meaning') + dim(d.spoken, 'Spoken') + dim(d.retention, 'Retention') + '</div>' +
        (open === k ? '<div class="evid"><p class="small">' + esc(def.why ? def.why.en : 'No evidence yet.') + '</p>' + (ev.length ? '<ol class="evlist">' + ev.slice().reverse().map(e => '<li><span class="muted small">' + esc(S.fmtDay(e.at)) + '</span><span>' + esc(evText(e)) + '</span></li>').join('') + '</ol>' : '<p class="muted small">Not tried yet. It appears in ' + esc(LQ.missionsFor(t.id).filter(m => m.skills.includes(k) && m.status === 'playable').map(m => '“' + U.L(m.title, src()) + '”').join(', ') || 'upcoming missions') + '.</p>') + '</div>' : '') + '</li>';
    }).join('') + '</ul></section>';
    h += calendar(S.upcoming(t.id, 7));
    h += '<section aria-labelledby="mo-h"><h2 class="h4" id="mo-h">Mission outcomes</h2>' + (done.length ? '<ul class="mlist" role="list">' + done.map(([k, v]) => { const m = LQ.missionById(k); return m ? '<li><a class="mrow" href="#/mission/' + k + '"><span class="mrow__thumb">' + A.scene(m.scene, { palette: A.plazaPalette(t) }) + '</span><span class="mrow__main"><strong>' + esc(U.L(m.title, src())) + '</strong><span class="muted small">Completed ' + esc(S.fmtDay(v.completedAt)) + (v.runs > 1 ? ', ' + v.runs + ' runs' : '') + '</span></span></a></li>' : ''; }).join('') + '</ul>' : '<p class="muted">No mission completed yet.</p>') + '</section>';
    const total = S.xpTotal(), mins = Math.round(st().speakingSeconds / 60 * 10) / 10;
    h += '<section class="engage" aria-labelledby="en-h"><h2 class="h4" id="en-h">Effort (not proficiency)</h2><div class="kpis"><div><strong>' + total + '</strong><span class="small muted">XP, all courses</span></div><div><strong>' + S.activeDays().length + '</strong><span class="small muted">active days</span></div><div><strong>' + mins + '</strong><span class="small muted">min with the mic on, measured here</span></div></div>' +
      '<details class="ledger"><summary>XP ledger (' + st().xp.length + ' entries)</summary><ol>' + st().xp.slice().reverse().map(x => '<li><span class="muted small">' + esc(S.fmtDay(x.at)) + '</span><span>' + esc(x.reason) + '</span><strong>' + (x.xp ? '+' + x.xp : '0') + '</strong></li>').join('') + '</ol><p class="small muted">Each entry has a unique key, so replaying the same mission or recall on the same day can’t add XP twice.</p></details>' +
      '<label class="switch"><span><strong>Pause my streak</strong><span class="muted small">Nothing is lost while it’s paused.</span></span><input type="checkbox" role="switch" data-change="setting" data-arg="streakPaused"' + (st().streakPaused ? ' checked' : '') + '></label></section></main>';
    return h;
  };
  function evText(e) {
    const kind = { roleplay: 'Conversation', anticipation: 'Anticipation', recall: 'Recall in a new scene', listening: 'Listening check', coach: 'Coach recording', challenge: 'Transfer checkpoint' }[e.kind] || e.kind;
    const auto = { independent: 'no hints', hint: 'with a hint', suggested: 'with a suggested reply', revealed: 'answer revealed first' }[e.autonomy] || e.autonomy;
    const inp = { speech: 'spoken (recognizer)', typed: 'typed', self: 'self-checked', choice: 'chosen', none: 'no attempt', suggested: 'suggested reply' }[e.input] || e.input;
    return kind + ', ' + auto + ', ' + inp + (e.ok ? '' : ', not yet') + (e.said ? ': “' + e.said + '”' : '');
  }
  function stampSvg(t, k, s) {
    const on = s === 'independent' || s === 'durable';
    const col = s === 'durable' ? '#12805C' : on ? '#3149E0' : 'currentColor';
    const id = 'sp' + k.replace(/_/g, '');
    return '<svg class="stamp__svg" viewBox="0 0 100 100" aria-hidden="true"><defs><path id="' + id + '" d="M50 50m-34 0a34 34 0 1 1 68 0a34 34 0 1 1-68 0"/></defs><g fill="none" stroke="' + col + '" stroke-width="' + (on ? 2.6 : 1.6) + '" opacity="' + (on ? 1 : .28) + '" stroke-dasharray="' + (on ? '0' : '4 4') + '"><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="27"/></g>' +
      (on ? '<text font-size="9.5" font-weight="700" letter-spacing="1.5" fill="' + col + '"><textPath href="#' + id + '" startOffset="2%">' + esc((t.city + ' • ' + LQ.SKILLS[k].en).toUpperCase().slice(0, 34)) + '</textPath></text><g transform="translate(38 38) scale(1)" stroke="' + col + '" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + '<path d="m5 12.5 4.5 4.5L19 7.5"/></g>' : '') + '</svg>';
  }
})();
