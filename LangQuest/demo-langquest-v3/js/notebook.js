/* LangQuest V3 — learner data, end to end: the notebook (saved and custom phrases),
   the cross-course review queue, the inbox and the learner profiles on this device. */
'use strict';
(function () {
  const V = LQ.views, U = LQ.ui, S = LQ.store, A = LQ.art, esc = U.esc, ic = U.icon;
  const NB = LQ.notebook = { filter: 'all', edit: null, err: {}, addOpen: false };
  const st = () => S.state;
  const activeCourses = () => Object.entries(st().enrollments).filter(([k, e]) => e.status === 'active').map(([k]) => k);
  const srcOf = tid => S.source(tid);

  /* ── saving from lessons, free talk and transcripts ── */
  const sameText = (a, b) => LQ.match.norm(U.nm(a)).trim() === LQ.match.norm(U.nm(b)).trim();
  NB.hasLine = (tid, p) => {
    if (!p || !p.t) return false;
    const pr = S.prog(tid);
    if (Object.values(pr.custom || {}).some(c => sameText(c.t, p.t))) return true;
    return Object.keys(pr.expressions).some(id => { const f = LQ.expressionById(id); return f && sameText(f.e.t, p.t); });
  };
  NB.saveLine = (tid, p, from) => {
    if (NB.hasLine(tid, p)) { U.toast('Already in your notebook.'); return null; }
    const m = typeof p.m === 'string' ? { [srcOf(tid)]: p.m } : Object.assign({}, p.m || {});
    const id = S.addCustom(tid, { t: p.t, r: p.r || '', m, from: from || 'saved', note: '' });
    S.save(); LQ.app.render();
    U.toast('Saved to your notebook. First recall: today.', 'ok', { undo: () => { S.deletePhrase(tid, id); S.save(); LQ.app.render(); U.toast('Removed again.'); } });
    return id;
  };
  NB.toggleExpr = (tid, id) => {
    const r = S.prog(tid).expressions[id];
    if (r) { U.toast('Already in your reviews: due ' + S.relDay(r.due) + '.'); return; }
    S.ensureReview(tid, id, 'saved'); S.event('phrase.saved', '“' + LQ.phraseText(id) + '” saved to the notebook'); S.save(); LQ.app.render();
    U.toast('Saved. It joins your review queue today.', 'ok', { undo: () => { S.deletePhrase(tid, id); S.save(); LQ.app.render(); } });
  };

  /* ── all learned items, across courses ── */
  NB.items = () => {
    const out = [];
    activeCourses().forEach(tid => {
      const pr = S.prog(tid), seen = new Set();
      Object.values(pr.expressions).forEach(r => { const f = LQ.expressionById(r.id); if (!f) return; seen.add(r.id); out.push({ tid, id: r.id, r, e: f.e, m: f.m, custom: r.id.startsWith('c-') ? pr.custom[r.id] : null }); });
      Object.values(pr.custom || {}).forEach(c => { if (!seen.has(c.id)) out.push({ tid, id: c.id, r: null, e: { id: c.id, t: c.t, r: c.r, m: c.m }, m: null, custom: c }); });
    });
    return out;
  };
  NB.buckets = () => {
    const t = S.today(), week = S.addDays(t, 7), b = { overdue: [], today: [], week: [], later: [], graduated: [] };
    NB.items().filter(x => x.r).forEach(x => {
      const r = x.r;
      if (r.due < t) b.overdue.push(x);
      else if (r.due === t) b.today.push(x);
      else if (r.interval >= 16) b.graduated.push(x);
      else if (r.due <= week) b.week.push(x);
      else b.later.push(x);
    });
    Object.values(b).forEach(l => l.sort((a, c) => a.r.due < c.r.due ? -1 : a.r.due > c.r.due ? 1 : 0));
    return b;
  };
  const dueLong = r => { const d = S.dueStatus(r); return d.k === 'overdue' ? d.days + ' day' + (d.days > 1 ? 's' : '') + ' overdue' : d.k === 'today' ? 'Due today' : 'Due ' + S.relDay(r.due) + ' (' + S.fmtDay(r.due) + ')'; };
  /* Compact due value for cards: "today", "+2 d", "−1 d"; the full sentence is the tooltip. */
  const dueText = r => { const d = S.dueStatus(r); return d.k === 'overdue' ? '−' + d.days + ' d' : d.k === 'today' ? 'today' : S.fmtDay(r.due, { month: 'short', day: 'numeric' }); };
  const dueChip = r => '<span class="small due due--' + S.dueStatus(r).k + '" title="' + esc(dueLong(r)) + '">' + esc(dueText(r)) + '</span>';
  const STAGE = { new: 'New', learning: 'Learning', young: 'Young', graduated: 'Graduated' };
  /* Stage as a status dot; the stage name and interval are its accessible name and tooltip. */
  const stageChip = r => { const s = S.stage(r), lab = STAGE[s] + (r && r.reps ? ' · ' + r.interval + 'd' : ''); return '<span class="stg stg--dot stg--' + s + '" role="img" aria-label="' + esc(lab) + '" title="' + esc(lab) + '"></span>'; };
  const originOf = (x) => {
    if (x.custom) return x.custom.from && x.custom.from !== 'custom' ? 'Saved from ' + x.custom.from : 'Your own phrase';
    if (x.m && x.m.title) return 'From “' + U.L(x.m.title, srcOf(x.tid)) + '”';
    return '';
  };

  /* ───────── Notebook ───────── */
  V.notebook = () => {
    const courses = activeCourses(), f = NB.filter !== 'all' && courses.includes(NB.filter) ? NB.filter : 'all';
    const items = NB.items().filter(x => f === 'all' || x.tid === f);
    let h = V.header() + '<main class="notebook" id="main"><div class="pagehead"><h1 class="h2">Notebook ' + U.info('Every phrase a mission scheduled or you saved, in all your courses, plus your own. Each one returns on its own recall schedule. Phrases are demo-authored and not yet native-reviewed; your own phrases aren’t checked against a reference.', 'About the notebook') + '</h1><a class="btn btn--sm" href="#/review" title="Review queue">' + ic('refresh', 'ic--xs') + 'Review</a></div>';
    h += '<div class="chips chips--scroll" role="group" aria-label="Filter by course"><button class="fchip' + (f === 'all' ? ' is-on' : '') + '" aria-pressed="' + (f === 'all') + '" data-act="nb-filter" data-arg="all">All <span class="fchip__n">' + NB.items().length + '</span></button>' +
      courses.map(tid => '<button class="fchip' + (f === tid ? ' is-on' : '') + '" aria-pressed="' + (f === tid) + '" data-act="nb-filter" data-arg="' + tid + '">' + esc(LQ.trackById(tid).name) + ' <span class="fchip__n">' + NB.items().filter(x => x.tid === tid).length + '</span></button>').join('') + '</div>';
    h += addForm(f === 'all' ? st().active : f);
    if (!items.length) h += '<div class="empty">' + U.mascot('curious', 80) + '<p><strong>Nothing saved yet.</strong></p><p class="muted small" title="Tap the bookmark on any line in a mission, or add your own phrase">' + ic('bookmark', 'ic--xs') + ' · ' + ic('plus', 'ic--xs') + '</p></div>';
    const groups = {}; items.forEach(x => { (groups[x.tid] = groups[x.tid] || []).push(x); });
    Object.entries(groups).forEach(([tid, list]) => {
      const t = LQ.trackById(tid);
      h += '<section class="nbgroup" aria-labelledby="nb-' + tid + '"><h2 class="h4" id="nb-' + tid + '">' + U.trackBadge(t) + ' ' + esc(t.name) + '</h2><ul class="nblist" role="list">' + list.map(x => row(x, t)).join('') + '</ul></section>';
    });
    return h + '</main>';
  };
  function row(x, t) {
    const key = x.tid + '|' + x.id, src = srcOf(x.tid);
    if (NB.edit === key && x.custom) return '<li class="nbrow nbrow--edit">' + phraseForm('phrase-edit', key, x.tid, { t: x.custom.t, r: x.custom.r, m: U.L(x.custom.m, src), note: x.custom.note }, 'Save changes') + '</li>';
    return '<li class="nbrow"><div class="nbrow__p">' + U.phrase(x.e, { track: t }) + '<span class="nbrow__m">' + esc(U.nm(U.L(x.e.m, src))) + '</span>' + (x.custom && x.custom.note ? '<span class="muted small">' + esc(x.custom.note) + '</span>' : '') +
      '<span class="nbrow__meta" title="' + esc(originOf(x)) + '">' + (x.r ? stageChip(x.r) + dueChip(x.r) : '<span class="small muted" title="Not scheduled">—</span>') + (x.custom ? '<span class="small muted">' + ic('edit', 'ic--xs') + '</span>' : '') + '</span></div>' +
      '<div class="nbrow__acts"><button class="iconbtn" data-act="nb-play" data-arg="' + esc(key) + '" aria-label="Listen to ' + esc(U.nm(x.e.t)) + '" title="Listen">' + ic('volume', 'ic--sm') + '</button>' +
      (x.custom ? '<button class="iconbtn" data-act="nb-edit" data-arg="' + esc(key) + '" aria-label="Edit ' + esc(U.nm(x.e.t)) + '" title="Edit">' + ic('edit', 'ic--sm') + '</button>' : '') +
      '<button class="iconbtn" data-act="nb-delete" data-arg="' + esc(key) + '" aria-label="Remove ' + esc(U.nm(x.e.t)) + ' from your notebook" title="Remove">' + ic('close', 'ic--sm') + '</button></div></li>';
  }
  function phraseForm(sub, arg, tid, v, label) {
    const t = LQ.trackById(tid), err = NB.err[sub] || {}, src = srcOf(tid);
    const nonLatin = t && t.script !== 'Latn';
    return '<form class="stack-sm nbform" data-submit="' + sub + '" data-arg="' + esc(arg || '') + '" novalidate>' +
      (sub === 'phrase-add' ? '<label class="field"><span>Course</span><select name="tid" data-change="nb-add-course">' + activeCourses().map(k => '<option value="' + k + '"' + (k === tid ? ' selected' : '') + '>' + esc(LQ.trackById(k).name) + '</option>').join('') + '</select></label>' : '') +
      '<label class="field"><span>Phrase in ' + esc(t.name) + ' <span class="req">(required)</span></span><input name="t" maxlength="120" value="' + esc(v.t || '') + '" dir="auto" lang="' + esc(t.tts[0]) + '" aria-invalid="' + !!err.t + '"' + (err.t ? ' aria-describedby="' + sub + '-t-err"' : '') + '>' + (err.t ? '<span class="ferr" id="' + sub + '-t-err">' + esc(err.t) + '</span>' : '') + '</label>' +
      (nonLatin ? '<label class="field"><span>Romanization (optional)</span><input name="r" maxlength="120" value="' + esc(v.r || '') + '"></label>' : '<input type="hidden" name="r" value="' + esc(v.r || '') + '">') +
      '<label class="field"><span>Meaning in ' + esc(S.srcName(src)) + ' <span class="req">(required)</span></span><input name="m" maxlength="140" value="' + esc(v.m || '') + '" aria-invalid="' + !!err.m + '"' + (err.m ? ' aria-describedby="' + sub + '-m-err"' : '') + '>' + (err.m ? '<span class="ferr" id="' + sub + '-m-err">' + esc(err.m) + '</span>' : '') + '</label>' +
      '<label class="field"><span>Note (optional)</span><input name="note" maxlength="140" value="' + esc(v.note || '') + '" placeholder="Where you heard it, who said it"></label>' +
      '<div class="row2"><button class="btn btn--primary btn--sm" type="submit">' + esc(label) + '</button>' + (sub === 'phrase-edit' ? '<button class="btn btn--quiet btn--sm" type="button" data-act="nb-edit-cancel">Cancel</button>' : '') + '</div></form>';
  }
  function addForm(tid) {
    if (!tid) return '';
    NB.addTid = NB.addTid && activeCourses().includes(NB.addTid) ? NB.addTid : tid;
    return '<details class="nbadd"' + (NB.addOpen ? ' open' : '') + '><summary data-act="nb-add-toggle">' + ic('plus', 'ic--sm') + 'Add a phrase</summary>' + phraseForm('phrase-add', '', NB.addTid, {}, 'Add to notebook') + '</details>';
  }
  function validate(f, sub) {
    const t = (f.get('t') || '').trim(), m = (f.get('m') || '').trim(), err = {};
    if (!t) err.t = 'Write the phrase in the course language.';
    else if (t.length < 2) err.t = 'That’s too short to practise.';
    if (!m) err.m = 'Add what it means, so recall can prompt you.';
    NB.err[sub] = err;
    return Object.keys(err).length ? null : { t, m, r: (f.get('r') || '').trim(), note: (f.get('note') || '').trim() };
  }

  /* ───────── Cross-course review queue ───────── */
  V.review = () => {
    const b = NB.buckets(), due = b.overdue.length + b.today.length;
    let h = V.header() + '<main class="review" id="main"><div class="pagehead"><h1 class="h2">Review queue ' + U.info('Everything you’ve learned, in every course, on one schedule. Intervals grow 1 → 3 → 7 → 16 → 37 days; a hint or a reveal halves the next one; “not yet” brings it back today. Missing days never resets anything.', 'How the schedule works') + '</h1><a class="iconbtn" href="#/notebook" aria-label="Notebook" title="Notebook">' + ic('bookmark', 'ic--sm') + '</a></div>' +
      '<div class="kpis kpis--4"><div class="kpi--warn"><strong>' + b.overdue.length + '</strong><span class="small muted">overdue</span></div><div><strong>' + b.today.length + '</strong><span class="small muted">today</span></div><div><strong>' + b.week.length + '</strong><span class="small muted">week</span></div><div><strong>' + b.graduated.length + '</strong><span class="small muted" title="Interval of 16 days or more">graduated</span></div></div>' +
      '<div class="stack-sm"><a class="btn btn--primary btn--block' + (due ? '' : ' is-disabled') + '" href="#/recall/all"' + (due ? '' : ' aria-disabled="true" tabindex="-1"') + ' data-act="review-start">' + ic('mic', 'ic--sm') + (due ? 'Recall ' + Math.min(due, 8) : 'Nothing due') + '</a>' +
      '<a class="btn btn--ghost btn--block" href="#/recall/ahead" data-act="review-start">' + ic('refresh', 'ic--sm') + 'Ahead</a></div>';
    const sec = (k, title, list, empty) => '<section class="rqsec" aria-labelledby="rq-' + k + '"><h2 class="h4" id="rq-' + k + '">' + esc(title) + ' <span class="muted small">' + list.length + '</span></h2>' + (list.length ? '<ul class="rqlist" role="list">' + list.map(x => { const t = LQ.trackById(x.tid); return '<li class="rqrow rqrow--' + k + '">' + U.trackBadge(t) + '<span class="rqrow__p"><span class="rqrow__t" dir="auto">' + esc(U.nm(x.e.t)) + '</span><span class="muted small">' + esc(U.nm(U.L(x.e.m, srcOf(x.tid)))) + '</span></span><span class="rqrow__d">' + stageChip(x.r) + (k === 'today' ? '' : dueChip(x.r)) + '</span></li>'; }).join('') + '</ul>' : '') + '</section>';
    h += sec('overdue', 'Overdue', b.overdue, 'Nothing overdue. Missing days never resets anything here.') + sec('today', 'Due today', b.today, 'Nothing due today.') + sec('week', 'Coming this week', b.week, 'Nothing else this week.') + sec('later', 'Later', b.later, 'Nothing scheduled further out.') + sec('graduated', 'Graduated', b.graduated, 'A phrase graduates when its interval reaches 16 days.');
    return h + '</main>';
  };

  /* ───────── Inbox ───────── */
  const KIND = { reminder: ['bell', 'Reminder'], system: ['info', 'System'], studio: ['layers', 'From the studio'], character: ['user', 'Message'], ai: ['cpu', 'Live AI'] };
  V.inbox = () => {
    const list = S.inboxFor(), un = list.filter(n => !n.read).length;
    let h = V.header() + '<main class="inbox" id="main"><div class="pagehead"><h1 class="h2">Inbox ' + U.info('Reminders, studio news and messages for ' + (st().learner.name || 'this learner') + '. Reminders respect quiet hours (' + st().settings.reminders.quiet + ') and a paused streak sends none.', 'About the inbox') + '</h1>' + (un ? '<button class="btn btn--sm" data-act="inbox-all-read" title="Mark all read">' + ic('check', 'ic--xs') + 'All read</button>' : '') + '</div>';
    if (!list.length) h += '<div class="empty">' + U.mascot('sleep', 80) + '<p><strong>All quiet.</strong></p>' + U.info('Advance the demo clock past 18:00 with phrases due, or inject an event from the Test lab.', 'Demo tip') + '</div>';
    else h += '<ul class="inlist" role="list">' + list.map(n => { const k = KIND[n.kind] || KIND.system; return '<li class="inrow' + (n.read ? '' : ' is-unread') + '"><span class="inrow__ic" role="img" aria-label="' + esc(k[1] + (n.read ? '' : ', new')) + '" title="' + esc(k[1]) + '">' + ic(k[0], 'ic--sm') + (n.read ? '' : '<span class="inrow__dot" aria-hidden="true"></span>') + '</span><div class="inrow__b"><strong>' + esc(n.title) + '</strong> ' + (n.body ? U.info(n.body, 'Message') : '') + '<p class="small muted">' + esc(S.fmtDay(n.at.slice(0, 10), { month: 'short', day: 'numeric' }) + (n.at.length > 10 ? ' · ' + fmtHm(n.at.slice(11)) : '')) + '</p></div>' + (n.link ? '<button class="btn btn--sm" data-act="inbox-open" data-arg="' + n.id + '">Open</button>' : (n.read ? '' : '<button class="iconbtn" data-act="inbox-read" data-arg="' + n.id + '" aria-label="Mark read" title="Mark read">' + ic('check', 'ic--sm') + '</button>')) + '</li>'; }).join('') + '</ul>';
    return h + '</main>';
  };
  const fmtHm = hm => { const [H, M] = hm.split(':').map(Number); return ((H % 12) || 12) + ':' + String(M).padStart(2, '0') + ' ' + (H < 12 ? 'AM' : 'PM'); };

  /* ───────── Profiles (rendered inside Settings) ───────── */
  V.profilesSection = () => {
    const list = S.profiles(), err = NB.err['profile-new'] || {};
    return '<section class="profiles" aria-labelledby="pf-h"><h2 class="h4" id="pf-h">Learners ' + U.info('Each learner on this device has their own courses, instruction languages, goals, streak pause and recall schedule. Switching never mixes them.', 'About learners') + '</h2>' +
      '<ul class="pflist" role="list">' + list.map(p => '<li class="pfrow' + (p.current ? ' is-current' : '') + '"><span class="avatar avatar--sm" aria-hidden="true">' + esc((p.name || '?').slice(0, 1).toUpperCase()) + '</span><span class="pfrow__m"><strong>' + esc(p.name) + '</strong><span class="muted small">' + (p.onboarded ? p.courses + ' course' + (p.courses === 1 ? '' : 's') + (p.active ? ' (' + esc(LQ.trackById(p.active).name) + ')' : '') : 'Not set up yet') + ' · ' + p.xp + ' XP' + (p.streakPaused ? ' · paused' : '') + '</span></span>' +
        (p.current ? '<span class="tag tag--ok">You</span>' : '<button class="btn btn--sm" data-act="profile-switch" data-arg="' + p.id + '">Switch</button>') + (list.length > 1 ? '<button class="iconbtn" data-act="profile-delete" data-arg="' + p.id + '" aria-label="Remove ' + esc(p.name) + ' from this device">' + ic('close', 'ic--sm') + '</button>' : '') + '</li>').join('') + '</ul>' +
      '<details class="nbadd"' + (NB.pfOpen ? ' open' : '') + '><summary data-act="pf-toggle">' + ic('plus', 'ic--sm') + 'Add a learner</summary><form class="stack-sm" data-submit="profile-new" novalidate><label class="field"><span>Name <span class="req">(required)</span></span><input name="name" maxlength="24" autocomplete="off" aria-invalid="' + !!err.name + '"' + (err.name ? ' aria-describedby="pf-name-err"' : '') + '>' + (err.name ? '<span class="ferr" id="pf-name-err">' + esc(err.name) + '</span>' : '') + '</label>' +
      '<label class="field"><span>Learns from (default for new courses)</span><select name="source">' + LQ.SOURCES.map(x => '<option value="' + x.code + '">' + esc(x.native + ' (' + x.name + ')') + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Daily goal</span><select name="goal">' + [10, 20, 40].map(g => '<option value="' + g + '"' + (g === 20 ? ' selected' : '') + '>' + g + ' XP a day</option>').join('') + '</select></label>' +
      '<button class="btn btn--primary btn--sm" type="submit">Create and switch</button></form></details>' +
      '<div class="row2"><button class="btn btn--ghost btn--sm" data-act="profile-export">' + ic('download', 'ic--xs') + 'Export</button><label class="btn btn--ghost btn--sm filebtn">' + ic('upload', 'ic--xs') + 'Import<input type="file" accept="application/json,.json" class="sr-only" data-change="profile-import"></label></div></section>';
  };

  /* ───────── actions ───────── */
  const act = LQ.notebookActs = {};
  act['nb-filter'] = el => { NB.filter = el.dataset.arg; LQ.app.render(); };
  act['nb-add-toggle'] = (el, ev) => { ev.preventDefault(); NB.addOpen = !NB.addOpen; LQ.app.render(); if (NB.addOpen) setTimeout(() => { const i = document.querySelector('form[data-submit="phrase-add"] input[name="t"]'); if (i) i.focus(); }, 30); };
  act['pf-toggle'] = (el, ev) => { ev.preventDefault(); NB.pfOpen = !NB.pfOpen; LQ.app.render(); if (NB.pfOpen) setTimeout(() => { const i = document.querySelector('form[data-submit="profile-new"] input[name="name"]'); if (i) i.focus(); }, 30); };
  act['nb-play'] = el => { const [tid, id] = el.dataset.arg.split('|'); const x = NB.items().find(y => y.tid === tid && y.id === id); if (!x) return; const r = U.say(x.e, { track: LQ.trackById(tid) }); if (!r.ok) U.toast(U.voiceStatus(LQ.trackById(tid), S.enr(tid) || {}).text); };
  act['nb-edit'] = el => { NB.edit = el.dataset.arg; NB.err['phrase-edit'] = {}; LQ.app.render(); setTimeout(() => { const i = document.querySelector('form[data-submit="phrase-edit"] input[name="t"]'); if (i) i.focus(); }, 30); };
  act['nb-edit-cancel'] = () => { NB.edit = null; LQ.app.render(); };
  act['nb-delete'] = el => {
    const [tid, id] = el.dataset.arg.split('|'), txt = LQ.phraseText(id) !== id ? LQ.phraseText(id) : ((S.prog(tid).custom || {})[id] || {}).t;
    LQ.app.confirm('Remove “' + U.nm(txt || '') + '”?', 'It leaves your notebook and your review queue. Skills you already showed keep their evidence. You can undo right after.', 'Remove phrase', () => {
      const undo = S.deletePhrase(tid, id); S.save(); LQ.app.render();
      U.toast('Phrase removed.', 'info', { undo: () => { S.restorePhrase(undo); S.save(); LQ.app.render(); U.toast('Phrase restored, schedule included.'); } });
    });
  };
  act['review-start'] = el => { if (el.classList.contains('is-disabled')) { el.blur && el.blur(); return; } LQ.recall.run = null; };
  act['inbox-open'] = el => { const n = S.state.inbox.find(x => x.id === el.dataset.arg); if (!n) return; n.read = true; S.save(); location.hash = n.link; };
  act['inbox-read'] = el => { const n = S.state.inbox.find(x => x.id === el.dataset.arg); if (n) { n.read = true; S.save(); LQ.app.render(); } };
  act['inbox-all-read'] = () => { S.inboxFor().forEach(n => { n.read = true; }); S.save(); LQ.app.render(); U.toast('All caught up.'); };
  act['profile-switch'] = el => { LQ.lesson.reset(); LQ.recall.run = null; LQ.player.close(); const ok = S.switchProfile(el.dataset.arg); if (ok) { U.toast('Now learning as ' + (S.state.learner.name || 'a new learner') + '.'); location.hash = S.state.onboarded ? '#/home' : '#/welcome'; } };
  act['profile-delete'] = el => {
    const id = el.dataset.arg, p = S.profiles().find(x => x.id === id); if (!p) return;
    LQ.app.confirm('Remove ' + p.name + ' from this device?', 'Their courses, notebook, recall schedule and XP are removed from this browser. Export them first if you want a copy. You can undo right after.', 'Remove learner', () => {
      const wasCurrent = p.current; LQ.lesson.reset(); LQ.recall.run = null;
      const undo = S.deleteProfile(id); if (!undo) return;
      if (wasCurrent) location.hash = S.state.onboarded ? '#/settings' : '#/welcome';
      U.toast(p.name + ' removed.', 'info', { undo: () => { S.restoreProfile(undo); U.toast(p.name + ' is back on this device.'); } });
    });
  };
  act['profile-export'] = () => { LQ.app.download('langquest-learner-' + (S.state.learner.name || 'profile').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json', S.exportProfile()); S.event('profile.exported', (S.state.learner.name || 'Learner') + ' exported as JSON'); S.save(); U.toast('Learner exported: progress, notebook, schedule and goals.'); };
  LQ.notebookSubmit = {
    'phrase-add': (form) => {
      const f = new FormData(form), tid = f.get('tid'), v = validate(f, 'phrase-add');
      if (!v) { LQ.app.render(); const bad = document.querySelector('form[data-submit="phrase-add"] [aria-invalid="true"]'); if (bad) bad.focus(); return; }
      const id = S.addCustom(tid, { t: v.t, r: v.r, m: { [srcOf(tid)]: v.m }, note: v.note, from: 'custom' });
      NB.addOpen = false; NB.err['phrase-add'] = {}; S.save(); LQ.app.render();
      U.toast('Added to ' + LQ.trackById(tid).name + '. First recall: today.', 'ok', { undo: () => { S.deletePhrase(tid, id); S.save(); LQ.app.render(); } });
    },
    'phrase-edit': (form, arg) => {
      const [tid, id] = arg.split('|'), v = validate(new FormData(form), 'phrase-edit');
      if (!v) { LQ.app.render(); return; }
      const before = JSON.parse(JSON.stringify(S.custom(tid)[id]));
      S.updateCustom(tid, id, { t: v.t, r: v.r, m: Object.assign({}, before.m, { [srcOf(tid)]: v.m }), note: v.note });
      NB.edit = null; S.save(); LQ.app.render();
      U.toast('Phrase updated.', 'ok', { undo: () => { S.custom(tid)[id] = before; S.save(); LQ.app.render(); } });
    },
    'profile-new': (form) => {
      const f = new FormData(form), name = (f.get('name') || '').trim(), err = {};
      if (!name) err.name = 'Give the learner a name.';
      else if (S.profiles().some(p => p.name.toLowerCase() === name.toLowerCase())) err.name = 'There’s already a learner called ' + name + ' on this device.';
      NB.err['profile-new'] = err;
      if (Object.keys(err).length) { LQ.app.render(); const i = document.querySelector('form[data-submit="profile-new"] input[name="name"]'); if (i) i.focus(); return; }
      LQ.lesson.reset(); LQ.recall.run = null; LQ.player.close();
      S.createProfile(name, f.get('source')); S.state.goal = { xp: +f.get('goal') || 20 }; S.save(); NB.pfOpen = false;
      location.hash = '#/welcome'; U.toast('Hi ' + name + '. Pick a first course.');
    }
  };
  LQ.notebookChange = {
    'nb-add-course': el => { NB.addTid = el.value; LQ.app.render(); },
    'profile-import': el => {
      const file = el.files && el.files[0]; el.value = ''; if (!file) return;
      file.text().then(txt => { let obj; try { obj = JSON.parse(txt); } catch (e) { throw new Error('That file isn’t valid JSON.'); } LQ.lesson.reset(); LQ.recall.run = null; S.importProfile(obj); location.hash = S.state.onboarded ? '#/home' : '#/welcome'; U.toast('Imported ' + (S.state.learner.name || 'a learner') + ' as a new profile on this device.'); })
        .catch(e => U.toast(e.message || 'Couldn’t import that file.', 'warn'));
    },
    'goal': el => { S.state.goal = { xp: +el.value }; S.event('goal.changed', (S.state.learner.name || 'Learner') + ': daily goal ' + el.value + ' XP'); S.save(); LQ.app.render(); }
  };
})();
