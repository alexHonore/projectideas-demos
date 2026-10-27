/* LangQuest V3 — Test lab: a drawer for testing the demo, not part of the product.
   Scenario presets, the demo clock, event injection, capability toggles, learner and studio
   role switchers, the shared event log, workspace export/import/reset, and live-AI settings. */
'use strict';
(function () {
  const U = LQ.ui, S = LQ.store, esc = U.esc, ic = U.icon;
  const LB = LQ.lab = { open: false, logQ: '', aiPainted: false };
  const $ = id => document.getElementById(id);

  /* ── scenario presets: each builds a whole workspace ── */
  const day = (n) => S.addDays(LQ.DEMO_DATE, n);
  const ex = (id, added, interval, due, reps, extra) => Object.assign({ id, added, interval, due, reps, lapses: 0, history: Array.from({ length: reps }, (_, i) => ({ at: S.addDays(added, i * Math.max(1, Math.round(interval / 2))), result: 'got', kind: i ? 'recall' : 'anticipation' })) }, extra || {});
  function camille() { const ws = S.fresh(); S.seedSampleInto(ws); ws.createdAt = '2026-10-19'; ws.events = [{ at: '2026-10-22', time: '7:40 PM', type: 'review.completed', text: '4 expressions recalled in new scenes', n: 1, profile: 'p1' }]; return ws; }
  function learnerProfile(name, tid, src, extra) {
    const p = S.freshProfile(); Object.assign(p, { onboarded: true, learner: { name, city: '' }, defaultSource: src, active: tid, createdAt: '2026-10-20' });
    p.enrollments[tid] = { source: src, script: LQ.trackById(tid).scriptModes ? 'both' : null, region: LQ.trackById(tid).regions ? LQ.trackById(tid).regions[0].id : null, addedAt: '2026-10-20', status: 'active', fallback: null, voiceNear: false };
    const pr = S.blankProgress(); pr.missions['fw-' + tid] = { status: 'done', completedAt: '2026-10-20', runs: 1 };
    pr.expressions['fw-' + tid + '-hello'] = ex('fw-' + tid + '-hello', '2026-10-20', 3, '2026-10-23', 2); pr.expressions['fw-' + tid + '-thanks'] = ex('fw-' + tid + '-thanks', '2026-10-20', 1, '2026-10-22', 1);
    p.progress[tid] = pr; p.xp = [{ key: 'm:fw-' + tid + ':done', xp: 30, at: '2026-10-20', track: tid, reason: 'First words, completed' }];
    return Object.assign(p, extra || {});
  }
  const PRESETS = [
    { id: 'new', name: 'New learner', desc: 'An empty device at the welcome screen: onboarding, all 30 courses, nothing saved.', go: '#/welcome', build: () => S.fresh() },
    { id: 'mid', name: 'Mid-course (Camille)', desc: 'Spanish from English and Darija from French; one mission done, recall due today.', go: '#/home', build: () => { const ws = camille(); ws.inbox = [{ id: 'n-mid-1', at: '2026-10-22T18:00', read: false, profile: 'p1', kind: 'reminder', title: '2 phrases ready to recall', body: 'A short recall session keeps them coming back at longer intervals.', link: '#/review' }]; return ws; } },
    { id: 'overdue', name: 'Overdue reviews', desc: 'Camille eight days later: phrases overdue in two courses, one graduated, a reminder waiting.', go: '#/review', build: () => {
      const ws = camille(), es = ws.progress['es-spain'], ar = ws.progress['ar-moroccan'];
      es.missions['es-cafe'] = { status: 'done', completedAt: '2026-10-23', runs: 1, vars: { where: 'to-go' } };
      ['es-buenos-dias', 'es-cafe-con-leche', 'es-para-aqui', 'es-cuanto-es'].forEach((id, i) => { es.expressions[id] = ex(id, '2026-10-23', 1, '2026-10-24', 1); });
      es.expressions['fw-es-spain-hello'] = ex('fw-es-spain-hello', '2026-10-05', 16, '2026-11-09', 4);
      ws.enrollments['ar-moroccan'].addedAt = '2026-10-20'; ar.missions['ary-cafe'] = { status: 'done', completedAt: '2026-10-24', runs: 1, vars: { drink: 'tea' } };
      ['ary-labas', 'ary-bghit-nss', 'ary-chokran'].forEach(id => { ar.expressions[id] = ex(id, '2026-10-24', 1, '2026-10-25', 1); });
      ws.xp.push({ key: 'm:es-cafe:done', xp: 60, at: '2026-10-23', track: 'es-spain', reason: 'Order a café con leche, completed' }, { key: 'm:ary-cafe:done', xp: 60, at: '2026-10-24', track: 'ar-moroccan', reason: 'Commander au café, completed' });
      ws.clockMin = 8 * 1440; ws.remindedDays = { 'p1:2026-10-30': true };
      const due = Object.values(ws.progress).reduce((a, pr) => a + Object.values(pr.expressions).filter(r => r.due <= '2026-10-30').length, 0);
      ws.inbox = [{ id: 'n-ov-1', at: '2026-10-30T18:00', read: false, profile: 'p1', kind: 'reminder', title: due + ' phrases ready to recall', body: 'Some have waited a week. Nothing is lost; the next interval simply starts from today.', link: '#/review' }];
      return ws; } },
    { id: 'studio', name: 'Studio with pending reviews', desc: 'Camille plus a busy studio: two template drafts and a recording waiting for review, one scheduled publish. Opens the studio review queue as a native reviewer.', go: '#/studio/review', build: () => {
      const ws = camille(), sd = ws.studio;
      const it = LQ.factory.blank('D-207', 'italian', 'greet', 'en'); Object.assign(it, { title: 'Meet Giulia at the bakery', status: 'review_needed', created: '2026-10-22', history: [{ at: '2026-10-22T17:10', who: 'Content editor', what: 'Sent to native review' }] }); sd.drafts.unshift(it);
      const a = sd.assets.find(x => x.id === 'A-2003'); if (a) { a.review = 'needed'; a.transcript = 'draft'; }
      sd.role = 'native_reviewer'; return ws; } },
    { id: 'family', name: 'Family device (3 learners)', desc: 'Camille, Malik (Japanese from French) and Inès (Swahili from English, streak paused, 10 XP goal) on one phone.', go: '#/settings', build: () => {
      const ws = camille();
      ws.profiles = { p2: learnerProfile('Malik', 'japanese', 'fr', { goal: { xp: 40 } }), p3: learnerProfile('Inès', 'swahili', 'en', { streakPaused: true, goal: { xp: 10 } }) };
      return ws; } }
  ];
  LB.PRESETS = PRESETS;
  function resetModules() { try { LQ.lesson.reset(); } catch (e) { } LQ.recall.run = null; if (LQ.talk) LQ.talk.s = null; try { LQ.player.close(); } catch (e) { } LQ.speech.srBroken = null; if (LQ.factory) { LQ.factory.cache = {}; LQ.factory.proposal = {}; } LQ.panel.tour = null; }
  LB.loadPreset = (id) => {
    const p = PRESETS.find(x => x.id === id); if (!p) return;
    const before = JSON.stringify(S.state);
    resetModules();
    const ws = S.normalize(JSON.parse(JSON.stringify(p.build())));
    ws.settings = S.state.settings; ws.tourSeen = true;
    S.state = ws; S.event('lab.preset', 'Scenario loaded: ' + p.name); LQ.applyPublication(); S.save();
    location.hash = p.go; LQ.app.render(true);
    U.toast('Scenario: ' + p.name + '.', 'ok', { undo: () => { resetModules(); S.state = S.normalize(JSON.parse(before)); LQ.applyPublication(); S.save(); LQ.app.render(true); U.toast('Previous workspace restored.'); } });
  };

  /* ── event injection: each one ripples through studio, learner app and inbox ── */
  const EVENTS = [
    { id: 'review-approve', label: 'A native reviewer approves the oldest template draft in review', run: () => {
      const d = S.state.studio.drafts.filter(x => x.kind === 'template' && x.status === 'review_needed').slice(-1)[0];
      if (!d) return 'No template draft is waiting for review.';
      const c = LQ.factory.checks(d); if (!c.schema.ok || !c.semantic.ok) return d.id + ' can’t be approved: its checks fail.';
      d.status = 'approved'; d.reviewedBy = 'Native reviewer (' + LQ.trackById(d.track).name + ')'; d.history.unshift({ at: S.nowIso(), who: d.reviewedBy, what: 'Approved (injected from the Test lab)' }); LQ.factory.touch(d);
      LQ.studio.audit(d.id + ' approved by ' + d.reviewedBy + ' (injected)'); S.event('draft.approved', d.id + ' “' + d.title + '” approved (injected)');
      S.notify({ kind: 'studio', title: d.id + ' approved: ready to publish', body: '“' + d.title + '” for ' + LQ.trackById(d.track).name + ' passed native review. An administrator can publish it.', link: '#/studio/draft/' + d.id });
      return d.id + ' approved. An administrator can publish it now.'; } },
    { id: 'consent', label: 'A contributor withdraws consent (Nadia B., Darija recordings)', run: () => {
      const list = S.state.studio.assets.filter(a => /Nadia B\./.test(a.speaker || ''));
      if (!list.length) return 'No recordings from that contributor.';
      list.forEach(a => { a.published = false; a.rights = 'unknown'; a.rightsNote = 'Consent withdrawn on ' + S.fmtDay(S.today()) + '; takedown applied'; a.unpublishedOnce = true; });
      LQ.studio.audit('Takedown: ' + list.length + ' recordings by Nadia B. unpublished after consent withdrawal (injected)'); LQ.studio.bump('takedown of ' + list.length + ' Darija recordings');
      S.event('rights.takedown', list.length + ' Darija recordings unpublished: consent withdrawn');
      S.notifyProfiles(pd => pd.enrollments['ar-moroccan'], { kind: 'system', title: 'Some Darija recordings were withdrawn', body: 'A speaker withdrew consent, so ' + list.length + ' audio lessons were taken down. Your progress and notebook are unchanged.', link: '#/audio' });
      return list.length + ' recordings taken down; Darija learners were told.'; } },
    { id: 'reminder', label: 'The reminder service runs now', run: () => {
      if (S.state.streakPaused) return 'Streak paused: no reminder is sent.';
      if (!S.state.settings.reminders.due) return 'Due-phrase reminders are switched off in Settings.';
      const n = S.dueAll().length; if (!n) return 'Nothing is due, so no reminder.';
      S.notify({ kind: 'reminder', title: n + ' phrase' + (n > 1 ? 's' : '') + ' ready to recall', body: 'Sent now from the Test lab. Skipping a day costs nothing.', link: '#/review' }); S.event('reminder.sent', (S.state.learner.name || 'Learner') + ': ' + n + ' due (injected)');
      return 'Reminder delivered to the inbox.'; } },
    { id: 'invite', label: 'Lucía sends an invitation for Saturday', run: () => {
      if (!S.state.enrollments['es-spain']) return 'This learner isn’t enrolled in Spanish (Spain).';
      const live = LQ.missionById('es-plans').status === 'playable';
      S.notify({ kind: 'character', title: 'Lucía: “¿Quedamos el sábado?”', body: live ? 'She’d like to make plans. Answer her in the mission “Make plans for Saturday”.' : 'She’d like to make plans. That mission is still in review in the studio, so it opens as “in production” until it’s published.', link: '#/mission/es-plans' });
      S.event('character.message', 'Lucía invited ' + (S.state.learner.name || 'the learner') + ' (injected)'); return 'Lucía’s invitation is in the inbox.'; } },
    { id: 'sr-down', label: 'The speech recognizer goes down mid-session', run: () => { LQ.speech.srBroken = 'network'; S.event('capability.sr_failed', 'Recognizer outage (injected): every mic falls back to recording or typing'); return 'Recognizer down: every microphone now offers recording or typing.'; } },
    { id: 'publish', label: 'The studio publishes a new mission for the active course', run: () => {
      const tid = S.state.active; if (!tid) return 'No active course.';
      const sd = S.state.studio, n = Math.max(200, ...sd.drafts.map(x => +String(x.id).replace(/\D/g, '') || 0)) + 1, kind = ['greet', 'order', 'way'][n % 3];
      const d = LQ.factory.blank('D-' + n, tid, kind, S.source(tid)); d.status = 'approved'; d.reviewedBy = 'Native reviewer (injected)'; sd.drafts.unshift(d);
      const c = LQ.factory.checks(d); if (!(c.schema.ok && c.semantic.ok)) return 'The generated draft failed its checks, so nothing was published.';
      LQ.factory.publish(d, 'Published (injected from the Test lab)');
      return '“' + d.title + '” is live in Missions, under “New from the studio”.'; } }
  ];
  LB.EVENTS = EVENTS;
  LB.inject = (id) => { const e = EVENTS.find(x => x.id === id); if (!e) return; const msg = e.run(); S.save(); LQ.app.render(); U.toast(msg); };

  /* ── render ── */
  const CAPS = [['noSR', 'No speech recognition', 'Microphones fall back to recording or typing.'], ['noVoice', 'No voice for this course’s locale', 'Phrases are text only; no other variety is substituted.'], ['offline', 'Offline', 'No recognizer, no live AI, network voices hidden. Lesson packs still play.'], ['liveAIOff', 'Live AI off', 'Rules only, even with a key.']];
  LB.render = () => {
    const body = $('lab-body'); if (!body || !LB.open) return;
    const st = S.state, caps = st.caps, now = S.now();
    const q = LB.logQ.toLowerCase(), ev = st.events.filter(e => !q || (e.type + ' ' + e.text).toLowerCase().includes(q)).slice(0, 60);
    body.innerHTML = '<header class="lab__head"><div><h2 class="h3" id="lab-title">Test lab</h2><p class="small muted">Controls for testing this demo. They change the simulated device, time and data, never the product rules.</p></div><button class="iconbtn" data-act="lab-close" aria-label="Close the Test lab">' + ic('close') + '</button></header>' +
      '<section class="lab__sec"><h3 class="lab__h">Scenarios</h3><ul class="lab__presets" role="list">' + PRESETS.map(p => '<li><div><strong>' + esc(p.name) + '</strong><span class="small muted">' + esc(p.desc) + '</span></div><button class="btn btn--sm" data-act="lab-preset" data-arg="' + p.id + '">Load</button></li>').join('') + '</ul></section>' +
      '<section class="lab__sec"><h3 class="lab__h">Demo clock</h3><p class="lab__now"><strong>' + esc(S.fmtDay(S.today(), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })) + ', ' + esc(S.fmtTime(now)) + '</strong>' + (st.clockMin ? ' <span class="small muted">(' + describeOffset(st.clockMin) + ' after the demo start)</span>' : '') + '</p>' +
      '<div class="row2 wrap"><button class="btn btn--sm" data-act="clock-advance" data-arg="60">+1 hour</button><button class="btn btn--sm" data-act="clock-advance" data-arg="1440">+1 day</button><button class="btn btn--sm" data-act="clock-advance" data-arg="10080">+1 week</button><button class="btn btn--sm btn--quiet" data-act="clock-reset"' + (st.clockMin ? '' : ' disabled') + '>Back to the start</button></div>' +
      '<form class="row2 wrap" data-submit="lab-date"><label class="field field--inline"><span>Jump to</span><input type="date" id="lab-date" name="d" min="2026-10-01" max="2027-12-31" value="' + S.today() + '"></label><button class="btn btn--sm" type="submit">Go</button></form>' +
      '<p class="small muted">Time has consequences: phrases fall due and overdue, an 18:00 reminder lands in the inbox (not during quiet hours or a paused streak), scheduled studio drafts publish, and offline lesson packs expire after 30 days.</p></section>' +
      '<section class="lab__sec"><h3 class="lab__h">Inject an event</h3><form class="stack-sm" data-submit="lab-inject"><label class="field"><span class="sr-only">Event</span><select name="ev" id="lab-ev">' + EVENTS.map(e => '<option value="' + e.id + '">' + esc(e.label) + '</option>').join('') + '</select></label><button class="btn btn--sm btn--primary" type="submit">Inject</button></form>' + (LQ.speech.srBroken ? '<p class="small">Recognizer state: failed (' + esc(LQ.speech.srBroken) + '). <button class="linkbtn" data-act="lab-sr-recover">Recover it</button></p>' : '') + '</section>' +
      '<section class="lab__sec"><h3 class="lab__h">Capabilities</h3><div class="stack-sm">' + CAPS.map(([k, l, h]) => { const on = k === 'liveAIOff' ? caps.liveAI === false : !!caps[k]; return '<label class="switch"><span><strong>' + esc(l) + '</strong><span class="muted small">' + esc(h) + '</span></span><input type="checkbox" role="switch" data-change="lab-cap" data-arg="' + k + '"' + (on ? ' checked' : '') + '></label>'; }).join('') + '</div><p class="small muted">Real device: speech recognition ' + (LQ.speech.realSR ? 'available' : 'missing') + ', ' + LQ.speech.voiceCount() + ' voices, recording ' + (LQ.speech.hasRecorder ? 'available' : 'missing') + '.</p></section>' +
      '<section class="lab__sec"><h3 class="lab__h">Roles</h3><div class="row2 wrap"><label class="field"><span>Learner on this device</span><select data-change="lab-profile">' + S.profiles().map(p => '<option value="' + p.id + '"' + (p.current ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Studio role</span><select data-change="lab-role">' + Object.entries(LQ.STUDIO_ROLES).map(([k, r]) => '<option value="' + k + '"' + (k === st.studio.role ? ' selected' : '') + '>' + esc(r.label) + '</option>').join('') + '</select></label></div></section>' +
      '<section class="lab__sec"><h3 class="lab__h">Event log <span class="muted small">' + st.events.length + '</span></h3><label class="search search--sm">' + ic('search', 'ic--sm') + '<span class="sr-only">Filter events</span><input type="search" id="lab-log-q" data-input="lab-log-q" placeholder="Filter by type or text" value="' + esc(LB.logQ) + '"></label>' +
      '<ol class="lab__log">' + ev.map(e => '<li><span class="small muted">' + esc(S.fmtDay(e.at)) + (e.time ? ' ' + esc(e.time) : '') + '</span><code>' + esc(e.type) + '</code><span>' + esc(e.text) + '</span></li>').join('') + '</ol></section>' +
      '<section class="lab__sec"><h3 class="lab__h">Workspace</h3><p class="small muted">Everything this demo stores: learners, studio, inbox, clock and the event log.</p><div class="row2 wrap"><button class="btn btn--sm" data-act="lab-export">' + ic('download', 'ic--xs') + 'Export JSON</button><label class="btn btn--sm filebtn">' + ic('upload', 'ic--xs') + 'Import JSON<input type="file" accept="application/json,.json" class="sr-only" data-change="lab-import"></label><button class="btn btn--sm btn--quiet" data-act="reset-demo">Reset demo</button></div></section>';
    if (!LB.aiPainted) paintAI();
    $('lab-foot').innerHTML = '<p class="small muted lab__fine">Live AI note: with a key, the text of the turn being checked (and your conversation in free talk) goes to the Anthropic API and is billed to that key. Use a key with a low spend limit. Nothing is sent without a key, and tests never call the API.' + (window.LiveAI && LiveAI.lastCall() ? ' Last call: ' + esc(LiveAI.lastCall().model) + ', ' + (LiveAI.lastCall().ms / 1000).toFixed(1) + ' s, ' + LiveAI.lastCall().inputTokens + ' in / ' + LiveAI.lastCall().outputTokens + ' out tokens.' : '') + '</p>';
  };
  function describeOffset(min) { const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60); return (d ? d + ' day' + (d > 1 ? 's' : '') : '') + (d && h ? ' ' : '') + (h ? h + ' h' : '') || min + ' min'; }
  function paintAI() { const el = $('lab-ai'); if (!el) return; if (window.LiveAI) { LiveAI.renderSettings(el, { lang: 'en' }); LB.aiPainted = true; } else el.innerHTML = '<p class="small muted">The live AI library didn’t load.</p>'; }
  if (window.LiveAI) LiveAI.onChange(() => { LB.aiPainted = false; if (LB.open) paintAI(); S.event('ai.key', LiveAI.isOn() ? 'Live AI key added (held in this browser)' : 'Live AI key removed'); S.save(); LQ.app.render(); });

  LB.show = () => {
    if (LQ.search && LQ.search.open) LQ.search.hide(true);
    LB.open = true; LB.ret = document.activeElement; LB.aiPainted = false;
    const el = $('lab'); el.hidden = false; document.body.classList.add('lab-open');
    ['stage', 'studio-root'].forEach(id => { const x = $(id); if (x) x.inert = true; });
    LB.render(); setTimeout(() => { const h = $('lab-title'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } }, 20);
  };
  LB.hide = () => {
    LB.open = false; const el = $('lab'); el.hidden = true; document.body.classList.remove('lab-open');
    ['stage', 'studio-root'].forEach(id => { const x = $(id); if (x) x.inert = false; });
    if (LB.ret && document.contains(LB.ret)) { try { LB.ret.focus(); } catch (e) { } }
  };
  document.addEventListener('keydown', e => {
    if (!LB.open || (LQ.search && LQ.search.open) || U.sheetOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); LB.hide(); return; }
    if (e.key === 'Tab') { const panel = document.querySelector('.lab__panel'); const f = Array.from(panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(x => !x.disabled && x.offsetParent !== null); if (!f.length) return; const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });

  LQ.labActs = {
    'lab-open': () => { U.closeSheet(); LB.show(); },
    'lab-close': () => LB.hide(),
    'lab-preset': el => LB.loadPreset(el.dataset.arg),
    'lab-sr-recover': () => { LQ.speech.srBroken = null; S.event('capability.sr_recovered', 'Recognizer back (Test lab)'); S.save(); LQ.app.render(); },
    'lab-export': () => { LQ.app.download('langquest-workspace.json', S.exportWorkspace()); U.toast('Workspace exported as JSON.'); }
  };
  LQ.labSubmit = {
    'lab-date': form => { const d = new FormData(form).get('d'); if (!d) return; LQ.recall.run = null; S.setDate(d); U.toast('Demo clock: ' + S.fmtDay(S.today()) + ', ' + S.fmtTime() + '.'); },
    'lab-inject': form => LB.inject(new FormData(form).get('ev'))
  };
  LQ.labChange = {
    'lab-cap': el => { const k = el.dataset.arg, st = S.state; if (k === 'liveAIOff') st.caps.liveAI = !el.checked; else st.caps[k] = el.checked; if (k === 'noSR' && !el.checked) LQ.speech.srBroken = null; S.event('capability.toggled', CAPS.find(c => c[0] === k)[1] + ': ' + (el.checked ? 'on' : 'off') + ' (Test lab)'); S.save(); LQ.app.render(); },
    'lab-profile': el => { resetModules(); if (S.switchProfile(el.value)) { location.hash = S.state.onboarded ? '#/home' : '#/welcome'; U.toast('Now learning as ' + (S.state.learner.name || 'a new learner') + '.'); } },
    'lab-role': el => { S.state.studio.role = el.value; LQ.studio.audit('Switched role to ' + LQ.STUDIO_ROLES[el.value].label + ' (Test lab)'); S.save(); LQ.app.render(); },
    'lab-import': el => {
      const file = el.files && el.files[0]; el.value = ''; if (!file) return;
      file.text().then(txt => { let obj; try { obj = JSON.parse(txt); } catch (e) { throw new Error('That file isn’t valid JSON.'); } resetModules(); S.importWorkspace(obj); LQ.applyPublication(); location.hash = S.state.onboarded ? '#/home' : '#/welcome'; LQ.app.render(true); U.toast('Workspace imported.'); })
        .catch(e => U.toast(e.message || 'Couldn’t import that file.', 'warn'));
    }
  };
  LQ.labInput = { 'lab-log-q': el => { LB.logQ = el.value; LB.render(); const i = $('lab-log-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } };
  LB.resetModules = resetModules;
})();
