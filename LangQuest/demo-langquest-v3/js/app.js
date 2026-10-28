/* LangQuest V3 — app shell: hash router, rendering, event delegation, boot. */
'use strict';
(function () {
  const APP = LQ.app = {};
  const S = LQ.store, U = LQ.ui, V = LQ.views, C = LQ.cap, P = LQ.player, PN = LQ.panel, esc = U.esc, ic = U.icon;
  const $ = id => document.getElementById(id);

  /* ── routes ── */
  APP.parse = () => {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const [a, b, c] = h.split('/');
    if (a === 'studio') return { name: 'studio', section: b || 'overview', arg: c, studio: true };
    const map = { '': 'root', welcome: 'welcome', home: 'home', missions: 'missions', mission: 'mission', play: 'play', recall: 'recall', audio: b ? 'collection' : 'audio', listen: 'listen', progress: 'progress', courses: 'courses', course: 'course', settings: 'settings', notebook: 'notebook', review: 'review', inbox: 'inbox', talk: 'talk' };
    if (a === 'onboard') return { name: 'onboard-' + (b || 'source'), arg: c, full: true };
    if (a === 'speak') return { name: b === 'coach' ? 'speak-coach' : b === 'locals' ? 'speak-local' : b === 'challenge' ? 'speak-challenge' : 'speak', arg: c, tab: 'speak' };
    return { name: map[a] || 'notfound', arg: b };
  };
  const FULL = ['welcome', 'play', 'listen', 'talk', 'onboard-source', 'onboard-track', 'onboard-confirm'];
  const TABS = [['home', 'Home', 'home'], ['missions', 'Missions', 'path'], ['audio', 'Audio', 'audio'], ['speak', 'Speak', 'mic'], ['progress', 'Progress', 'passport']];
  const tabOf = r => ({ home: 'home', recall: 'home', missions: 'missions', mission: 'missions', audio: 'audio', collection: 'audio', speak: 'speak', 'speak-coach': 'speak', 'speak-local': 'speak', 'speak-challenge': 'speak', progress: 'progress', courses: 'home', course: 'home', settings: 'home', notebook: 'home', review: 'home', inbox: 'home', talk: 'speak' }[r.name]);
  function view(r) {
    const st = S.state;
    switch (r.name) {
      case 'welcome': return V.welcome();
      case 'onboard-source': return V.obSource();
      case 'onboard-track': return V.obTrack();
      case 'onboard-confirm': return V.obConfirm(r.arg);
      case 'home': return V.home();
      case 'missions': return V.missions();
      case 'mission': return V.mission(r.arg);
      case 'play': return LQ.lesson.view(r.arg);
      case 'recall': return V.recall(r.arg === 'all' ? 'all' : r.arg === 'ahead' ? 'ahead' : 'due');
      case 'notebook': return V.notebook();
      case 'review': return V.review();
      case 'inbox': return V.inbox();
      case 'talk': return V.talk(r.arg);
      case 'speak-challenge': return V.recall('challenge');
      case 'audio': return V.audio();
      case 'collection': return V.collection(r.arg);
      case 'listen': return V.listen(r.arg);
      case 'speak': return V.speak();
      case 'speak-coach': return V.coach(r.arg);
      case 'speak-local': return V.local(r.arg);
      case 'progress': return V.progress();
      case 'courses': return V.courses();
      case 'course': return V.course(r.arg);
      case 'settings': return V.settings();
      default: return V.notFound();
    }
  }
  let lastKey = null, lastLog = 0;
  /* Unsaved form edits survive background re-renders (upload jobs, timers). */
  const dirty = {};
  const fieldKey = el => { const f = el.form; return f && f.dataset.submit && el.name ? f.dataset.submit + '|' + (f.dataset.arg || '') + '|' + el.name : null; };
  document.addEventListener('input', e => { const k = e.target && fieldKey(e.target); if (k) dirty[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; }, true);
  document.addEventListener('change', e => { const k = e.target && fieldKey(e.target); if (k) dirty[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'radio' ? (e.target.checked ? e.target.value : dirty[k]) : e.target.value; }, true);
  document.addEventListener('submit', e => { const f = e.target; if (f && f.dataset.submit) Object.keys(dirty).forEach(k => { if (k.startsWith(f.dataset.submit + '|' + (f.dataset.arg || '') + '|')) delete dirty[k]; }); }, true);
  function restoreDirty() {
    Object.entries(dirty).forEach(([k, v]) => { const [sub, arg, name] = k.split('|'); const f = document.querySelector('form[data-submit="' + sub + '"]' + (arg ? '[data-arg="' + CSS.escape(arg) + '"]' : '')); if (!f) return; f.querySelectorAll('[name="' + CSS.escape(name) + '"]').forEach(el => { if (el.type === 'radio') el.checked = el.value === v; else if (el.type === 'checkbox') el.checked = !!v; else el.value = v; }); });
  }
  APP.render = (routeChanged) => {
    const r = APP.parse(), st = S.state;
    // guards
    if (!r.studio) {
      if (r.name === 'root') { location.replace('#/' + (st.onboarded ? 'home' : 'welcome')); return; }
      if (!st.onboarded && !r.name.startsWith('onboard') && r.name !== 'welcome' && r.name !== 'course') { location.replace('#/welcome'); return; }
      if (st.onboarded && !st.active && !['courses', 'course', 'settings', 'welcome'].includes(r.name) && !r.name.startsWith('onboard')) { location.replace('#/courses'); return; }
    }
    const key = location.hash;
    routeChanged = routeChanged || key !== lastKey;
    if (key !== lastKey) Object.keys(dirty).forEach(k => delete dirty[k]);
    // remember focus
    const ae = document.activeElement;
    const fk = ae && ae !== document.body ? (ae.id ? { id: ae.id, sel: ae.selectionStart } : ae.dataset && ae.dataset.act ? { act: ae.dataset.act, arg: ae.dataset.arg } : null) : null;
    document.body.classList.toggle('mode-studio', !!r.studio);
    document.querySelectorAll('[data-surface]').forEach(a => a.setAttribute('aria-current', (a.dataset.surface === 'studio') === !!r.studio ? 'page' : 'false'));
    if (r.studio) {
      $('studio-root').hidden = false; $('stage').hidden = true;
      $('studio-root').innerHTML = LQ.studio.render(r.section, r.arg);
      $('tour-float').innerHTML = PN.mobileCard('tourcard--float');
      if (routeChanged) { window.scrollTo(0, 0); const sm = $('studio-main'); if (sm) sm.scrollTop = 0; }
    } else {
      $('studio-root').hidden = true; $('stage').hidden = false;
      const v = $('view'), prevScroll = v.scrollTop;
      v.innerHTML = view(r);
      const full = FULL.includes(r.name) || (['recall', 'speak-challenge'].includes(r.name) && !!document.querySelector('#view .recall--live'));
      $('screen').classList.toggle('is-full', full);
      $('tabbar').innerHTML = full ? '' : TABS.map(t => '<a href="#/' + t[0] + '" class="tab' + (tabOf(r) === t[0] ? ' is-on' : '') + '"' + (tabOf(r) === t[0] ? ' aria-current="page"' : '') + '>' + ic(t[2]) + '<span>' + t[1] + '</span></a>').join('');
      $('tabbar').hidden = full;
      $('mini-host').innerHTML = full ? '' : V.miniPlayer();
      if (routeChanged) v.scrollTop = 0; else v.scrollTop = prevScroll;
      const run = LQ.lesson.run();
      if (r.name === 'play' && run && run.phase === 'talk') { if (run.log.length !== lastLog || routeChanged) { const log = v.querySelector('.log'); if (log) { const dock = v.querySelector('.dock'); v.scrollTop = v.scrollHeight; } } lastLog = run.log.length; }
      if (r.name === 'talk' && LQ.talk.s) { const n = LQ.talk.s.log.length + (LQ.talk.s.pending ? 1 : 0); if (n !== APP._talkLen || routeChanged) { if (!routeChanged || n > 1) v.scrollTop = v.scrollHeight; } APP._talkLen = n; }
      if (r.name === 'play') LQ.lesson.paintLive();
      if (r.name === 'listen') P.paint();
      PN.render(r);
      $('tour-host').innerHTML = PN.mobileCard();
      $('tour-float').innerHTML = innerWidth >= 760 ? PN.mobileCard('tourcard--float') : ''; // the rail stays closed; the tour floats
      const sb = $('sb-time'); if (sb) sb.textContent = S.fmtTime().replace(/\s?[AP]M$/, '');
    }
    if (LQ.lab.open) LQ.lab.render();
    APP.titles(document.body);
    restoreDirty();
    // restore focus or move it to the new page heading
    let target = null;
    if (fk && !routeChanged) target = fk.id ? document.getElementById(fk.id) : document.querySelector('[data-act="' + fk.act + '"]' + (fk.arg != null ? '[data-arg="' + CSS.escape(fk.arg) + '"]' : ''));
    if (target) { try { target.focus({ preventScroll: true }); if (fk.sel != null && target.setSelectionRange) target.setSelectionRange(fk.sel, fk.sel); } catch (e) { } }
    else if (routeChanged) { const h1 = document.querySelector(r.studio ? '#studio-main h1' : '#view h1, #view h2'); if (h1) { h1.setAttribute('tabindex', '-1'); try { h1.focus({ preventScroll: true }); } catch (e) { } } }
    if (routeChanged && lastKey !== null) { if (r.name === 'play') LQ.lesson.autoplay(); PN.afterRoute(); }
    lastKey = key;
    applySettings();
  };
  function applySettings() {
    const s = S.state.settings, root = document.documentElement;
    root.dataset.theme = s.theme; root.dataset.font = s.readingFont; root.dataset.motion = s.motion ? 'on' : 'off'; root.dataset.mascot = s.mascot ? 'on' : 'off';
    root.style.setProperty('--text-scale', (s.textSize / 100).toString());
  }

  /* ── tour ring ── */
  APP.showRing = (sel) => {
    const ring = $('tour-ring'); if (!sel) return;
    const studio = document.body.classList.contains('mode-studio');
    const el = document.querySelector((studio ? '#studio-root ' : '#view ') + sel) || document.querySelector(sel);
    if (!el) { ring.hidden = true; return; }
    el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setTimeout(() => {
      const b = el.getBoundingClientRect(), box = studio ? { top: 56, left: 0, right: innerWidth, bottom: innerHeight } : document.getElementById('view').getBoundingClientRect();
      const top = Math.max(b.top - 6, box.top + 2), left = Math.max(b.left - 6, box.left + 2), right = Math.min(b.right + 6, box.right - 2), bottom = Math.min(b.bottom + 6, box.bottom - 2);
      if (bottom - top < 12) { ring.hidden = true; return; }
      ring.style.cssText = 'top:' + top + 'px;left:' + left + 'px;width:' + (right - left) + 'px;height:' + (bottom - top) + 'px'; ring.hidden = false;
    }, 360);
  };
  APP.hideRing = () => { const r = $('tour-ring'); if (r) r.hidden = true; };
  window.addEventListener('resize', () => APP.hideRing());
  document.addEventListener('scroll', (e) => { if (e.target && e.target.id === 'view' && !PN._ringLock) APP.hideRing(); }, true);

  /* ── helpers ── */
  APP.download = (name, text, type) => {
    const blob = new Blob([text], { type: type || 'application/json' }), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  APP.srConsent = (cb) => {
    APP._consentCb = cb;
    U.sheet('<h2 class="h3" id="sheet-title">Use the browser’s speech recognition?</h2><p>To show which words it heard, your browser may send this short recording to its own speech service (for example Google, in Chrome). LangQuest doesn’t store it and gives no pronunciation score from it.</p><div class="stack-sm"><button class="btn btn--primary btn--block" data-act="sr-yes">Use speech recognition</button><button class="btn btn--ghost btn--block" data-act="sr-no">Type or record instead</button></div>');
  };
  APP.confirm = (title, body, yesLabel, onYes) => {
    APP._confirmYes = onYes;
    const studio = document.body.classList.contains('mode-studio');
    const html = '<h2 class="h3" id="sheet-title">' + esc(title) + '</h2><p>' + esc(body) + '</p><div class="stack-sm"><button class="btn btn--primary btn--block" data-act="confirm-yes">' + esc(yesLabel) + '</button><button class="btn btn--quiet btn--block" data-act="sheet-close">Cancel</button></div>';
    if (LQ.lab.open) LQ.lab.hide();
    U.sheet(html, studio ? { host: 'studio-sheet-host', scope: 'studio-main' } : {});
  };

  /* ── actions ── */
  const ACT = Object.assign({}, LQ.lessonActs, LQ.recallActs, LQ.studioActs, LQ.notebookActs, LQ.talkActs, LQ.factoryActs, LQ.labActs, LQ.searchActs);
  ACT['toast-undo'] = () => { const f = U.toastUndo; U.toastHide(); if (f) f(); };
  ACT['sheet-close'] = () => U.closeSheet();
  ACT['sheet-close-nav'] = () => { U.closeSheet(); };
  ACT['use-sample'] = () => { S.useSample(); location.hash = '#/home'; U.toast('Welcome, Camille: two courses already set up.'); };
  ACT['demo-sheet'] = () => U.sheet(V.demoSheet());
  ACT['open-switcher'] = () => U.sheet(V.switcherSheet());
  ACT['switch-course'] = (el) => { LQ.lesson.reset(); S.commit(st => { st.active = el.dataset.arg; }); U.closeSheet(); U.toast('Now learning ' + U.pairLabel(el.dataset.arg) + '.'); if (location.hash.startsWith('#/course')) location.hash = '#/home'; };
  ACT['archive-course'] = (el) => { const t = LQ.trackById(el.dataset.arg); APP.confirm('Archive ' + t.name + '?', 'It leaves your course list. Skills, recall schedule, bookmarks and story are kept, and re-enrolling restores them.', 'Archive course', () => { S.commit(st => { st.enrollments[t.id].status = 'archived'; if (st.active === t.id) st.active = Object.keys(st.enrollments).find(k => st.enrollments[k].status === 'active') || null; S.event('enrollment.archived', t.name + ' archived, progress kept'); }); location.hash = '#/courses'; }); };
  ACT['confirm-yes'] = () => { const f = APP._confirmYes; U.closeSheet(); if (f) f(); };
  ACT['sr-yes'] = () => { S.state.settings.srConsent = true; S.save(); U.closeSheet(); const cb = APP._consentCb; APP._consentCb = null; if (cb) cb(); };
  ACT['sr-no'] = () => { U.closeSheet(); LQ.speech.srBroken = 'declined'; APP.render(); };
  ACT['catalog-group'] = (el) => { U.catalogGroup = el.dataset.arg; APP.render(); };
  ACT['catalog-clear'] = () => { U.catalogQuery = ''; U.catalogGroup = 'all'; APP.render(); };
  ACT['ob-source'] = (el) => { const nm = $('ob-name'); if (nm) S.state.learner.name = nm.value.trim(); S.state.defaultSource = el.dataset.arg; S.save(); APP.render(); };
  ACT['ob-next-track'] = () => { const nm = $('ob-name'); if (nm) { S.state.learner.name = nm.value.trim(); S.save(); } };
  ACT['path-mode'] = (el) => { U.pathMode = el.dataset.arg; APP.render(); };
  ACT['set-region'] = (el) => { const [tid, reg] = el.dataset.arg.split('|'); S.commit(st => { st.enrollments[tid].region = reg; S.event('enrollment.region_changed', LQ.trackById(tid).name + ' region: ' + LQ.trackById(tid).regions.find(r => r.id === reg).label); }); };
  ACT['sample-voice'] = (el) => { const t = LQ.trackById(el.dataset.arg); const r = U.say(t.hello, { track: t }); if (!r.ok) U.toast(U.voiceStatus(t, S.enr(t.id) || {}).text); };
  ACT['export-data'] = () => ACT['profile-export']();
  ACT['reset-demo'] = () => APP.confirm('Reset the demo?', 'This clears everything this demo saved in your browser (every learner, the studio, the inbox and the clock) and starts over at the welcome screen.', 'Reset demo', () => { LQ.lab.resetModules(); S.reset(); LQ.applyPublication(); location.hash = '#/welcome'; U.toast('Demo reset.'); });
  /* Demo clock: minutes forward (1 hour, 1 day, 1 week); consequences run in the store. */
  ACT['clock-advance'] = (el) => {
    const min = +(el && el.dataset.arg) || 1440, before = S.unread(), overdueBefore = LQ.notebook.buckets().overdue.length;
    LQ.recall.run = null; U.closeSheet(); S.advance(min);
    const due = S.dueAll().length, notes = S.unread() - before, od = LQ.notebook.buckets().overdue.length;
    U.toast('Demo clock: ' + S.fmtDay(S.today()) + ', ' + S.fmtTime() + '. ' + due + ' due' + (od > overdueBefore ? ', ' + od + ' overdue' : '') + (notes > 0 ? '. ' + notes + ' new in your inbox' : '') + '.');
  };
  ACT['clock-reset'] = () => { LQ.recall.run = null; S.state.clockMin = 0; S.event('demo.clock', 'Demo clock back to the start'); S.save(); APP.render(); };
  ACT['tour-start'] = () => { APP.closeDemoMenu(); PN.startTour(); };
  ACT['rail'] = (el) => PN.toggle(el.dataset.arg);
  /* Demo menu (desktop top bar): tour, Test lab, API monitor, reset, the fictional-data marker. */
  APP.closeDemoMenu = () => { const m = $('demo-menu'), b = $('demo-btn'); if (m && !m.hidden) { m.hidden = true; if (b) b.setAttribute('aria-expanded', 'false'); } };
  ACT['demo-menu'] = () => {
    const m = $('demo-menu'), b = $('demo-btn'); if (!m) return;
    if (!m.hidden) { APP.closeDemoMenu(); return; }
    m.innerHTML = V.demoItems(); m.hidden = false; b.setAttribute('aria-expanded', 'true');
    const f = m.querySelector('button, a'); if (f) f.focus();
  };
  document.addEventListener('click', (ev) => { const m = $('demo-menu'); if (m && !m.hidden && !ev.target.closest('.demomenu-wrap')) APP.closeDemoMenu(); }, true);
  document.addEventListener('keydown', (ev) => { const m = $('demo-menu'); if (ev.key === 'Escape' && m && !m.hidden) { APP.closeDemoMenu(); const b = $('demo-btn'); if (b) b.focus(); } });
  ACT['tip'] = (el) => U.toggleTip(el);
  /* Every icon-only control gets a tooltip that matches its accessible name. */
  APP.titles = (root) => { if (root) root.querySelectorAll('button[aria-label]:not([title]), a[aria-label]:not([title])').forEach(el => { if (!/\p{L}{2,}/u.test(el.textContent || '')) el.title = el.getAttribute('aria-label'); }); };
  /* Per-course voice picker (behind the speaker icon). */
  ACT['voice-picker'] = (el) => U.sheet(V.voicePicker(el.dataset.arg || (S.track() || {}).id));
  ACT['voice-sample'] = (el) => {
    const [tid, uri] = el.dataset.arg.split('|'), t = LQ.trackById(tid), e = S.enr(tid) || {};
    const v = U.voiceFor(t, e); const r = LQ.speech.speak(U.speakText(t.hello), Object.assign({}, v, { voiceURI: uri || e.voiceURI, rate: LQ.speech.RATE.normal }));
    if (!r.ok) U.toast(r.reason === 'blocked' ? 'Browser voices are paused on the API monitor.' : 'No voice for this locale on this device.');
  };
  ACT['tour-next'] = () => PN.next();
  ACT['tour-back'] = () => PN.back();
  ACT['tour-do'] = () => PN.doStep();
  ACT['tour-end'] = () => PN.end(false);
  // capture widget
  ACT['cap-speak'] = (el) => { const k = el.dataset.arg; if (k === 'talk' && !C.srUsable()) { C.typing.talk = true; APP.render(); return; } const t = S.track(); C.speak(k, U.srLocale(t, S.enr())); };
  ACT['cap-record'] = (el) => C.record(el.dataset.arg);
  ACT['cap-type'] = (el) => { const k = el.dataset.arg; C.typing[k] = !C.typing[k]; APP.render(); const i = $('type-' + k); if (i) i.focus(); };
  ACT['cap-self'] = (el) => C.self(el.dataset.arg);
  ACT['take-play'] = (el) => { const t = C.takes[el.dataset.arg]; if (t) LQ.speech.playTake(t.url); };
  ACT['take-compare'] = (el) => {
    const k = el.dataset.arg, t = C.takes[k]; if (!t) return;
    const run = LQ.lesson.run(); let p = null;
    if (k === 'model' && run) p = LQ.missionById(run.mid).expressions[run.modelIdx];
    else if (k === 'ant' && run) { const it = LQ.missionById(run.mid).anticipate[run.antIdx]; p = it.model || LQ.missionById(run.mid).expressions.find(e => e.id === it.expr); }
    else if (k === 'recall') { const R = LQ.recall.run; const f = LQ.expressionById(R.items[R.idx].id); p = f && f.e; }
    const trackOf = k === 'recall' ? LQ.trackById(LQ.recall.run.items[LQ.recall.run.idx].tid) : undefined;
    const go = () => LQ.speech.playTake(t.url);
    if (p) { const r = U.say(p, { track: trackOf, onend: (w) => setTimeout(go, w === 'no-voice' || w === 'no-tts' || w === 'blocked' ? 0 : 300) }); if (!r.ok) U.toast('No reference voice on this device; playing your take only.'); } else go();
  };
  // player
  ACT['p-toggle'] = () => { P.playing ? P.pause() : P.play(); };
  ACT['p-back'] = () => P.skip(-15);
  ACT['p-fwd'] = () => P.skip(15);
  ACT['p-rate'] = (el) => { P.rate = +el.dataset.arg; if (P.el) P.el.playbackRate = P.rate; APP.render(); };
  ACT['p-loop'] = () => { P.loop = !P.loop; APP.render(); };
  ACT['p-seek-seg'] = (el) => P.seekSeg(+el.dataset.arg);
  ACT['p-close'] = () => P.close();
  ACT['p-pause-nav'] = () => P.pause();
  ACT['p-bookmark'] = () => { const f = P.lesson(); if (!f) return; const p = S.prog(f.c.track); const a = p.audio[P.id] = p.audio[P.id] || { pos: P.idx, updated: S.today(), bookmarks: [] }; a.bookmarks = a.bookmarks || []; const i = a.bookmarks.indexOf(P.idx); if (i >= 0) a.bookmarks.splice(i, 1); else { a.bookmarks.push(P.idx); S.event('audio.bookmarked', f.l.title + ', segment ' + (P.idx + 1)); } S.save(); APP.render(); };
  ACT['p-coach'] = () => { const f = P.lesson(); if (!f || !f.l.segs) return; let i = P.idx; while (i < f.l.segs.length && !f.l.segs[i].s) i++; if (i >= f.l.segs.length) { i = P.idx; while (i > 0 && !f.l.segs[i].s) i--; } const seg = f.l.segs[i]; P.pause(); LQ.coach.custom = { t: seg.s, r: seg.r, m: { en: seg.g, fr: seg.g, ru: seg.g } }; LQ.coach.id = null; location.hash = '#/speak/coach'; };
  ACT['audio-src'] = (el) => { U.audioSrc = el.dataset.arg; APP.render(); };
  ACT['audio-download'] = (el) => { const f = LQ.lessonById(el.dataset.arg); if (!f) return; APP.download(f.l.id + '-lesson-pack.json', JSON.stringify({ lesson: f.l.id, title: f.l.title, collection: f.c.title, course: LQ.trackById(f.c.track).name, instruction: f.c.source, rights: f.c.rights, segments: f.l.segs.map((s, i) => ({ i, kind: s.p ? 'pause' : s.n ? 'narration' : 'target', text: s.n || s.s || null, romanization: s.r || null, gloss: s.g || null, seconds: +LQ.segSeconds(s).toFixed(1) })), note: 'Text pack only. The mobile app downloads audio for offline use.' }, null, 2)); S.state.downloads = S.state.downloads || {}; S.state.downloads[f.l.id] = S.today(); S.event('download.saved', f.l.title + ' lesson pack'); S.save(); APP.render(); };
  // coach
  ACT['coach-play'] = () => { const ex = coachEx(); if (ex) { const r = U.say(ex); if (!r.ok) U.toast(U.voiceStatus(S.track(), S.enr()).text); } };
  ACT['coach-slow'] = () => { const ex = coachEx(); if (ex) U.say(ex, { slow: true }); };
  ACT['coach-script'] = () => { const e = S.enr(), order = ['native', 'roman', 'both']; e.script = order[(order.indexOf(e.script || 'both') + 1) % 3]; S.save(); APP.render(); };
  ACT['coach-take'] = (el) => { const t = LQ.coach.takes[+el.dataset.arg]; if (t) LQ.speech.playTake(t.url); };
  ACT['coach-ab'] = (el) => { const t = LQ.coach.takes[+el.dataset.arg], ex = coachEx(); if (!t) return; const r = U.say(ex, { onend: (w) => setTimeout(() => LQ.speech.playTake(t.url), w === 'no-voice' ? 0 : 300) }); if (!r.ok) LQ.speech.playTake(t.url); };
  function coachEx() { const id = LQ.coach.id; if (id === 'custom') return LQ.coach.custom; const f = LQ.expressionById(id); return f && f.e; }
  ACT['skill-toggle'] = (el) => { U.openSkill = U.openSkill === el.dataset.arg ? null : el.dataset.arg; APP.render(); };

  const SUBMIT = Object.assign({}, LQ.studioSubmit, LQ.notebookSubmit, LQ.factorySubmit, LQ.labSubmit, {
    'cap-typed': (form, arg) => C.typed(arg, new FormData(form).get('t')),
    'ob-enroll': (form, arg) => { const f = new FormData(form), st = S.state; if (!st.learner.name) st.learner.name = 'Alex'; st.onboarded = true; S.enroll(arg, { source: f.get('source'), region: f.get('region'), script: f.get('script') }); S.save(); location.hash = '#/play/fw-' + arg; },
    'course-save': (form, arg) => {
      const f = new FormData(form), st = S.state, existing = st.enrollments[arg];
      if (!existing || existing.status !== 'active') { if (!st.learner.name) st.learner.name = 'Alex'; st.onboarded = true; S.enroll(arg, { source: f.get('source'), region: f.get('region'), script: f.get('script') }); S.save(); U.toast('Enrolled: ' + U.pairLabel(arg) + '.'); location.hash = '#/home'; return; }
      S.setSource(arg, f.get('source'));
      if (f.get('region')) existing.region = f.get('region');
      if (f.get('script')) existing.script = f.get('script');
      if (f.get('voiceNear')) existing.voiceNear = true;
      LQ.lesson.reset(); S.save(); U.toast('Saved. Progress kept.'); APP.render();
    },
    'profile-save': (form) => { const f = new FormData(form); S.commit(st => { st.learner.name = (f.get('name') || '').trim() || st.learner.name; st.defaultSource = f.get('defaultSource'); }); U.toast('Profile saved. Existing courses keep their own instruction language.'); }
  });
  const CHANGE = Object.assign({}, LQ.studioChange, LQ.notebookChange, LQ.labChange, {
    'voice-pick': (el) => { const e = S.enr(el.dataset.arg); if (!e) return; e.voiceURI = el.value || null; S.event('voice.picked', LQ.trackById(el.dataset.arg).name + ': ' + (el.value ? 'device voice ' + el.value : 'automatic voice')); S.save(); U.sheet(V.voicePicker(el.dataset.arg)); APP.render(); },
    'voice-neural': (el) => { const e = S.enr(el.dataset.arg); if (!e) return; e.neural = el.checked; S.event('voice.neural', LQ.trackById(el.dataset.arg).name + ': neural voice ' + (el.checked ? 'allowed' : 'off')); S.save(); U.sheet(V.voicePicker(el.dataset.arg)); APP.render(); },
    'setting': (el) => { const k = el.dataset.arg, st = S.state; if (k === 'streakPaused') st.streakPaused = el.checked; else if (k === 'readingFont') st.settings.readingFont = el.checked ? 'lexend' : 'standard'; else if (k === 'rem-due') st.settings.reminders.due = el.checked; else if (k === 'rem-audio') st.settings.reminders.audio = el.checked; else st.settings[k] = el.checked; S.save(); APP.render(); },
    'textsize': (el) => { S.state.settings.textSize = +el.value; S.save(); APP.render(); },
    'theme': (el) => { S.state.settings.theme = el.value; S.save(); APP.render(); },
    'help': (el) => { S.state.settings.help = el.value; S.save(); APP.render(); },
    'p-sleep': (el) => P.sleep(+el.value)
  });
  const INPUT = Object.assign({}, LQ.labInput, {
    'catalog-q': (el) => { U.catalogQuery = el.value; APP.render(); },
    'audio-q': (el) => { U.audioQuery = el.value; APP.render(); },
    'lib-q': (el) => { LQ.studio.q = el.value; APP.render(); },
    'p-seek': (el) => { if (P.el && P.el.duration) P.el.currentTime = P.el.duration * (+el.value / 1000); }
  });
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACT[el.dataset.act]; if (!fn) return;
    if (el.tagName === 'BUTTON' || el.dataset.act === 'sheet-close') ev.preventDefault();
    try { fn(el, ev); } catch (e) { console.error(e); U.toast('Something went wrong with that action. The demo state is unchanged.'); }
    if (el.closest('#demo-menu') && el.dataset.act !== 'demo-menu') APP.closeDemoMenu();
  });
  document.addEventListener('submit', (ev) => { const f = ev.target.closest('[data-submit]'); if (!f) return; ev.preventDefault(); const fn = SUBMIT[f.dataset.submit]; if (fn) fn(f, f.dataset.arg); });
  document.addEventListener('change', (ev) => { const el = ev.target.closest('[data-change]'); if (!el) return; const fn = CHANGE[el.dataset.change]; if (fn) fn(el); });
  document.addEventListener('input', (ev) => { const el = ev.target.closest('[data-input]'); if (!el) return; const fn = INPUT[el.dataset.input]; if (fn) fn(el); });
  document.addEventListener('dragover', (ev) => { const d = ev.target.closest && ev.target.closest('[data-drop]'); if (d) { ev.preventDefault(); d.classList.add('is-over'); } });
  document.addEventListener('dragleave', (ev) => { const d = ev.target.closest && ev.target.closest('[data-drop]'); if (d) d.classList.remove('is-over'); });
  document.addEventListener('drop', (ev) => { const d = ev.target.closest && ev.target.closest('[data-drop]'); if (!d) return; ev.preventDefault(); d.classList.remove('is-over'); if (ev.dataTransfer && ev.dataTransfer.files.length) LQ.studio.handleFiles(ev.dataTransfer.files); });

  window.addEventListener('hashchange', () => {
    const r = APP.parse();
    if (r.name !== 'play') { if (LQ.lesson.run() && LQ.lesson.run().phase !== 'feedback') { /* paused implicitly: draft is saved each step */ } C.stopAll(); if (!P.playing) LQ.speech.cancel(); }
    if (r.name !== 'speak-coach') { LQ.coach.takes.forEach(t => { try { URL.revokeObjectURL(t.url); } catch (e) { } }); LQ.coach.takes = []; if (r.name !== 'listen') LQ.coach.custom = LQ.coach.custom && r.name === 'speak-coach' ? LQ.coach.custom : null; }
    if (r.name !== 'recall' && r.name !== 'speak-challenge' && LQ.recall.run && LQ.recall.run.done) LQ.recall.run = null;
    U.closeSheet(); APP.hideRing(); if (LQ.search.open) LQ.search.hide(true);
    APP.render(true);
  });
  if (window.LiveAI) LiveAI.onChange(() => APP.render());
  /* Re-render when the hub monitor changes a key or a killswitch (usage records alone don't). */
  if (window.ApiMeter) { const sig = () => JSON.stringify(ApiMeter.state().kill) + ['anthropic', 'gemini'].map(p => ApiMeter.keys.has(p)).join(); let last = sig();
    ApiMeter.onChange(() => { const now = sig(); if (now === last && !LQ.lab.open) return; last = now; if (!APP._meterT) APP._meterT = setTimeout(() => { APP._meterT = null; APP.render(); }, 120); }); }
  LQ.speech.onVoices(() => { if (document.readyState !== 'loading') APP.render(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) C.stopAll(); });

  /* ── boot ── */
  document.querySelectorAll('[data-icon]').forEach(el => { el.outerHTML = ic(el.dataset.icon); });
  S.load();
  LQ.applyPublication();
  S.subscribe(() => APP.render());
  if (!location.hash) location.replace('#/' + (S.state.onboarded ? 'home' : 'welcome'));
  APP.render(true);
})();
