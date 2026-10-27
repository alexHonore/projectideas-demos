/* LangQuest V3 — desktop companion panel and guided tour presenter. */
'use strict';
(function () {
  const PN = LQ.panel = {};
  const U = LQ.ui, S = LQ.store, esc = U.esc, ic = U.icon;
  const INFO = {
    welcome: { t: 'A language app that starts with talking', b: 'LangQuest is built around one loop: hear a real situation, say your answer before you see it, compare, talk it through with a recurring character, and meet the phrase again days later somewhere new.', try: ['Choose a language to see onboarding with all 30 courses.', 'Or explore as Camille, a Montréal learner with two courses already set up.'] },
    onboard: { t: 'Three independent language settings', b: 'The app language, the language you learn from, and the variety you learn are separate. Each course stores its own instruction language, and changing your default never rewrites existing courses.', try: ['Search “Kigali”, “mbote” or “Darija”.', 'Pick Arabic (Moroccan): choose Arabic script, Latin Darija, or both.'] },
    home: { t: 'Home leads with a conversation', b: 'One tap starts the next speakable mission. Recall, listening and story continue from there. The streak is secondary, optional and pauseable.', try: ['Start “Order a café con leche”.', 'Open the course switcher: Spanish from English, Darija from French.'] },
    missions: { t: 'An illustrated path, with a list view', b: 'Stops are real situations with their skills, length and status. Nothing is locked behind payment; previews are honest about being in production.', try: ['Switch to List view.', 'Open a preview mission to see why it isn’t playable yet.'] },
    mission: { t: 'The 8-minute mission template', b: 'Listen, model phrases, anticipate, converse, then feedback and a recall plan. The skills list shows your current evidence state for each one.', try: ['Check which instruction language this mission is written in.', 'Start the mission.'] },
    play_context: { t: 'Step 1: listen in context', b: 'The scene sets up the situation; the character speaks first. Replay it, slow it down or translate it, then pick the meaning from visual options.', try: ['Press Slower, then Translate.', 'Choose the right meaning to continue.'] },
    play_model: { t: 'Step 2: hear it, say it', b: 'Reference audio uses a device voice only when its locale matches the course. The mic uses the browser’s recognizer to show words heard, never a score.', try: ['Press Listen, then the mic.', 'No mic? “I said it aloud” or type.'] },
    play_anticipate: { t: 'Step 3: anticipate (Pimsleur)', b: 'You answer before the model appears. Then compare by ear and rate yourself. Your rating, and whether you needed help, sets when the phrase returns.', try: ['Try once without the hint.', 'Reveal first on another prompt: it returns sooner.'] },
    play_talk: { t: 'Step 4: a conversation that accepts your words', b: 'The character branches on what you mean, not on exact wording: paraphrases pass, a negated order doesn’t. Ask to repeat or slow down and the scene carries on.', try: ['Type “Me pones un cortado” instead of the model phrase.', 'Ask “¿Tenéis leche de avena?” to branch.', 'Type “más despacio” mid-conversation.'] },
    play_feedback: { t: 'Step 5: feedback you can act on', b: 'Goals shown in conversation, at most two priority notes, the recall plan and what the character will remember. Typed answers count for meaning, not for speaking.', try: ['Open Progress to see the evidence trail.'] },
    recall: { t: 'Spaced recall in a different scene', b: 'Due phrases return with a different person and place. Rate yourself; the interval and the reason for it are shown. Nothing is a flashcard drill.', try: ['Answer Carmen or Andrés.', 'Use “Advance the demo clock” to make tomorrow due.'] },
    challenge: { t: 'New scene, same skill', b: 'A transfer checkpoint: skills you already practised, used with someone new and fewer hints.', try: ['Answer without revealing.'] },
    audio: { t: 'An audio-course library', b: 'Script lessons play with device voices in this demo. Uploaded recordings from the studio play unaltered. Search by speaker, chapter or instruction language.', try: ['Filter by Russian narration.', 'Publish a file in the studio and watch it appear here.'] },
    collection: { t: 'Collections, chapters, lessons', b: 'Each lesson shows progress and bookmarks. Download saves a real lesson-pack file.', try: ['Download a lesson pack.'] },
    listen: { t: 'Pimsleur-style audio', b: 'Narration in your instruction language, the speaker in the course variety, and instructional pauses kept exactly as authored. The transcript follows along.', try: ['Loop a phrase, bookmark it, set a sleep timer.', 'Practise this as a mission.'] },
    speak: { t: 'Speak: coach, checkpoints, locals, free talk', b: 'Practice spaces around the missions. Free conversation runs on a scoped rule engine in every course, or on live AI with your own key, and never scores pronunciation.', try: ['Open Talk freely and say hello.', 'Open the pronunciation coach.', 'Meet Lucía and see what she remembers.'] },
    coach: { t: 'An honest pronunciation coach', b: 'Reference audio, your own takes and a back-to-back comparison. Without a validated scorer for the course, no numeric score is ever shown.', try: ['Record two takes and compare them.'] },
    local: { t: 'Recurring characters', b: 'Stable visual profile with eight expressions, a regional voice and short consented story notes. Backstory unlocks through missions, never through payment.', try: ['Finish a mission and come back.'] },
    progress: { t: 'A passport of observed skills', b: 'Can-do skills move from emerging to durable based on evidence: no hints, a day later, in a different scene. XP and streaks are tracked separately and never set proficiency.', try: ['Expand a skill to see its evidence trail.', 'Open the XP ledger.'] },
    courses: { t: 'All 30 course entries', b: 'Course names are kept exactly. Each shows its variety, script and honest content status. Varieties are never swapped for a neighbour.', try: ['Filter Right-to-left.', 'Open Chinese (Simplified): it shares Mandarin audio.'] },
    course: { t: 'Per-course settings', b: 'Region, script and instruction language belong to this enrollment. Changing them re-renders hints and keeps all progress.', try: ['Change Spanish to “from French”, then open a mission.'] },
    notebook: { t: 'A notebook across every course', b: 'Phrases scheduled by missions, lines you bookmarked anywhere (missions, free talk, audio) and phrases you add yourself. Each has a stage and a due date; edits and removals can be undone.', try: ['Add your own phrase with a meaning.', 'Remove one, then press Undo.'] },
    review: { t: 'One review queue for everything learned', b: 'Overdue, due today, this week, later and graduated (interval of 16 days or more), across courses. Intervals come from the same deterministic scheduler shown after every rating.', try: ['Use +1 week in the Test lab, then come back.', 'Start a cross-course recall session.'] },
    inbox: { t: 'Inbox: reminders and news', b: 'The 18:00 reminder, studio publications, takedowns and character messages land here, per learner. A paused streak sends no reminders.', try: ['Advance the clock past 18:00.', 'Inject “Lucía sends an invitation” in the Test lab.'] },
    talk: { t: 'Free conversation, honest about its limits', b: 'Without a key, a rule engine built from the course phrase pack answers greetings, names, orders, prices and directions, and says “sorry?” to the rest. With your key, live AI holds an open conversation in the course variety, with gentle corrections. Never a pronunciation score.', try: ['Say hello, then ask for a coffee.', 'Save one of the suggested phrases.'] },
    settings: { t: 'Comfort, habits and data', b: 'Mascot off, reduced motion, Lexend reading font, larger text, help fading, a pauseable streak, data export and reset.', try: ['Switch on the Lexend font.', 'Export your data as JSON.'] }
  };
  PN.keyFor = (r) => {
    if (r.name === 'play') { const run = LQ.lesson.run(); return 'play_' + (run ? run.phase : 'context'); }
    if (r.name.startsWith('onboard')) return 'onboard';
    if (r.name === 'speak-coach') return 'coach';
    if (r.name === 'speak-local') return 'local';
    if (r.name === 'speak-challenge') return 'challenge';
    return r.name;
  };
  PN.render = (r) => {
    const el = document.getElementById('panel'); if (!el) return;
    const tour = PN.tour;
    const info = INFO[PN.keyFor(r)] || INFO.home;
    const t = S.track(), e = S.enr();
    let h = '<div class="pn__hero"><p class="pn__brand">' + LQ.art.orbit('happy', { size: 40, label: 'LangQuest' }) + '<span>LangQuest</span></p><h2 class="pn__h">Speak a new language from your first minute.</h2><p class="pn__lede">30 courses, recurring characters, an audio library and a content studio. Free for every learner: no paywall, no credits, no limits.</p></div>';
    if (tour) {
      const s = TOUR[tour.i];
      h += '<section class="pn__card pn__card--tour" aria-live="polite"><p class="small">Guided tour, step ' + (tour.i + 1) + ' of ' + TOUR.length + '</p><h3 class="h3">' + esc(s.title) + '</h3><p>' + esc(s.body) + '</p><div class="pn__tourbtns">' + (s.act ? '<button class="btn btn--sm" data-act="tour-do">' + esc(s.doLabel) + '</button>' : '') + '<button class="btn btn--ghost btn--sm" data-act="tour-back"' + (tour.i ? '' : ' disabled') + '>Back</button><button class="btn btn--primary btn--sm" data-act="tour-next">' + (tour.i === TOUR.length - 1 ? 'Finish' : 'Next') + '</button><button class="btn btn--quiet btn--sm" data-act="tour-end">End tour</button></div></section>';
    } else {
      h += '<section class="pn__card"><h3 class="h4">On this screen</h3><p class="pn__t"><strong>' + esc(info.t) + '</strong></p><p>' + esc(info.b) + '</p>' + (info.try ? '<ul class="pn__try">' + info.try.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') + '<button class="btn btn--primary btn--sm" data-act="tour-start">' + ic('sparkle', 'ic--xs') + 'Take the guided tour</button></section>';
    }
    if (t && e) {
      const reg = t.regions && e.region ? t.regions.find(x => x.id === e.region) : null;
      const vs = U.voiceStatus(t, e), as = LQ.ASSESS[t.assess], dm = S.state.studio.models.dialogue;
      h += '<div class="pn__grid"><section class="pn__card"><h3 class="h4">Language context</h3><dl class="kv"><div><dt>Course</dt><dd>' + esc(t.name) + '</dd></div><div><dt>Spoken variety</dt><dd>' + esc((reg ? reg.label + ', ' : '') + t.variety) + '</dd></div><div><dt>Variety ID</dt><dd>' + esc(t.internal) + '</dd></div><div><dt>Writing</dt><dd>' + esc(t.scriptModes ? ({ native: 'Native script', roman: 'Romanized', both: 'Both' }[e.script || 'both']) : LQ.SCRIPT_NAMES[t.script]) + '</dd></div><div><dt>Learning from</dt><dd>' + esc(S.srcName(e.source)) + (e.fallback ? ' (English where missing, opted in)' : '') + '</dd></div><div><dt>Dialogue route</dt><dd>' + esc(dm.route) + ' v' + dm.version + '</dd></div></dl></section>' +
        '<section class="pn__card"><h3 class="h4">Running on this device</h3><ul class="pn__caps"><li class="' + (vs.ok ? 'ok' : 'no') + '">' + ic(vs.ok ? 'check' : 'close', 'ic--xs') + '<span>' + esc(vs.ok ? 'Voice: ' + vs.name : 'No ' + (reg ? reg.locale : t.tts[0]) + ' voice; text only') + '</span></li><li class="' + (LQ.speech.hasSR && !LQ.speech.srBroken ? 'ok' : 'no') + '">' + ic(LQ.speech.hasSR && !LQ.speech.srBroken ? 'check' : 'close', 'ic--xs') + '<span>' + (LQ.speech.hasSR ? (LQ.speech.srBroken ? 'Recognizer failed (' + esc(LQ.speech.srBroken) + '); typing offered' : 'Browser speech recognition') : 'No speech recognition; typing offered') + '</span></li><li class="' + (LQ.speech.hasRecorder ? 'ok' : 'no') + '">' + ic(LQ.speech.hasRecorder ? 'check' : 'close', 'ic--xs') + '<span>' + (LQ.speech.hasRecorder ? 'Microphone recording (kept in memory)' : 'No recording API') + '</span></li><li class="no">' + ic('close', 'ic--xs') + '<span>Pronunciation scorer: not connected. ' + esc(as.label) + '.</span></li></ul></section></div>';
    }
    const ev = S.state.events.slice(0, 7);
    h += '<section class="pn__card"><h3 class="h4">Evidence log</h3><p class="small muted">Domain events written by your actions, newest first.</p>' + (ev.length ? '<ol class="pn__ev">' + ev.map(x => '<li><code>' + esc(x.type) + '</code><span>' + esc(x.text) + '</span></li>').join('') + '</ol>' : '<p class="muted small">Nothing yet. Start a mission and watch this fill.</p>') + '</section>';
    h += '<section class="pn__card pn__card--demo"><h3 class="h4">Demo clock</h3><p class="small">It’s <strong>' + esc(S.fmtDay(S.today(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })) + ', ' + esc(S.fmtTime()) + '</strong>. ' + S.dueAll().length + ' due, ' + LQ.notebook.buckets().overdue.length + ' overdue, ' + S.unread() + ' unread.</p><div class="pn__clock"><button class="btn btn--sm" data-act="clock-advance" data-arg="60">+1 hour</button><button class="btn btn--sm" data-act="clock-advance" data-arg="1440">+1 day</button><button class="btn btn--sm" data-act="clock-advance" data-arg="10080">+1 week</button>' + (S.state.clockMin ? '<button class="btn btn--sm btn--quiet" data-act="clock-reset">Back to the start</button>' : '') + '</div><button class="btn btn--sm btn--primary" data-act="lab-open">' + ic('sliders', 'ic--xs') + 'Open the Test lab</button></section>';
    el.innerHTML = h;
  };

  /* ── Guided tour: walks the signature workflow end to end ── */
  const LS = () => LQ.lesson;
  const TOUR = [
    { route: '#/home', target: '.hero-mission', title: 'One tap to a real conversation', body: 'Home leads with the next speakable mission: seven minutes with Lucía at her café in Lavapiés. No grammar menu, no paywall, and the streak stays secondary.' },
    { route: '#/home', target: '.coursepill', title: 'Each course keeps its own instruction language', body: 'Camille learns Spanish (Spain) from English and Moroccan Darija from French. The pill always shows target and source, with an edit affordance.' },
    { route: '#/missions', target: '.path', title: 'A path of real situations', body: 'Stops are scenes with skills, length and status. There’s a list view for accessibility, and previews say plainly that they’re still in production.' },
    { route: '#/play/es-cafe', phase: 'context', target: '.bubble-char', title: 'Listen first', body: 'Lucía asks “¿Qué te pongo?”. Replay it, slow it down or translate it, then pick the meaning from pictures. Reference audio only plays with a matching es-ES device voice.' },
    { route: '#/play/es-cafe', phase: 'model', target: '.pcard', title: 'Hear it, say it', body: 'Key phrases with normal and slow audio. The mic uses the browser’s recognizer to show the words it heard. That is never presented as a pronunciation score.' },
    { route: '#/play/es-cafe', phase: 'anticipate', target: '.loopring', title: 'Say it before you see it', body: 'The Pimsleur step: answer from memory, then the model appears for comparison. Your self-rating, and any help you used, decide when this phrase returns.' },
    { route: '#/play/es-cafe', phase: 'talk', target: '.log', type: 'Me pones un cortado, por favor', title: 'Your words, not a script', body: 'The tour just typed “Me pones un cortado, por favor”, a paraphrase of the model answer. The meaning matcher accepts it and Lucía moves on. A negated order would fail.' },
    { route: '#/play/es-cafe', phase: 'talk', target: '.dock', title: 'Help that keeps the scene', body: 'Repeat, Slower, Hint and Ideas sit around one primary mic. Asking to slow down, by button or by saying “más despacio”, keeps the same scene and context.' },
    { route: '#/recall', target: '.rscene', title: 'Recall somewhere new', body: 'Due phrases come back with a different person and place: Carmen on the plaza, Andrés on a terrace. The new interval and the reason for it are shown after each one.' },
    { route: '#/listen/madrid-l1', target: '.tx', title: 'Pimsleur-style audio lessons', body: 'Narration in English, Lucía in Castilian, and instructional pauses kept as authored. Loop a phrase, bookmark it, set a sleep timer or practise it as a mission.' },
    { route: '#/speak/coach/es-cafe-con-leche', target: '.coach__rec', title: 'An honest pronunciation coach', body: 'Reference audio, your own takes and a back-to-back comparison. No validated scorer is connected, so the coach says exactly what it can and can’t tell you.' },
    { route: '#/progress', target: '.stamps', title: 'A passport of can-do evidence', body: 'A stamp needs a conversation done without hints; it becomes durable after a recall a day later, somewhere else. XP and streaks sit apart and never set proficiency.' },
    { route: '#/studio/library', target: '.drop', title: 'Behind the app: the content studio', body: 'Drop real audio files: the browser reads duration, SHA-256 and ID3 tags. Purchased CDs stay blocked from learners by the rights gate, whatever their metadata.' },
    { route: '#/studio/factory', target: '.draft', title: 'Review, then publish', body: 'Act as a Language reviewer to approve “Make plans for Saturday”, then as Administrator to publish it. The mission becomes playable in the learner app with no update.', doLabel: 'Approve and publish it for me', act: () => { const sd = S.state.studio, d = sd.drafts.find(x => x.id === 'D-201'); if (d.status === 'review_needed') { sd.role = 'language_reviewer'; LQ.studioActs['draft-approve']({ dataset: { arg: 'D-201' } }); } if (d.status === 'approved') { sd.role = 'admin'; LQ.studioActs['draft-publish']({ dataset: { arg: 'D-201' } }); } S.save(); location.hash = '#/mission/es-plans'; } }
  ];
  PN.TOUR = TOUR;
  PN.tour = null;
  PN.startTour = () => {
    LQ.ui.closeSheet();
    const st = S.state;
    if (!st.enrollments['es-spain']) S.useSample();
    else if (st.active !== 'es-spain') { st.active = 'es-spain'; S.save(); }
    PN.tour = { i: 0 }; st.tourSeen = true; S.save();
    go();
  };
  function go() {
    const s = TOUR[PN.tour.i];
    LQ.app.hideRing();
    const after = () => {
      if (s.phase) { const run = LS().ensure('es-cafe'); if (run.phase !== s.phase || (s.phase === 'talk' && !run.talkStarted)) { if (s.phase === 'talk' && run.phase !== 'talk') { run.ctx.ok = true; } LS().goPhase(s.phase); } if (s.type) { const r2 = LS().run(); if (r2 && !r2.log.some(e => e.who === 'me')) setTimeout(() => LS().typeAnswer(s.type), 400); } }
      PN._ringLock = true; setTimeout(() => { LQ.app.showRing(s.target); setTimeout(() => { PN._ringLock = false; }, 900); }, s.type ? 700 : 260);
      LQ.app.render();
    };
    if (location.hash !== s.route) { PN._pending = after; location.hash = s.route; } else after();
  }
  PN.afterRoute = () => { if (PN._pending) { const f = PN._pending; PN._pending = null; setTimeout(f, 40); } };
  PN.next = () => { if (!PN.tour) return; if (PN.tour.i >= TOUR.length - 1) { PN.end(true); return; } PN.tour.i++; go(); };
  PN.doStep = () => { const s = TOUR[PN.tour.i]; if (s && s.act) { s.act(); U.toast('Done: the mission is now playable in the learner app.'); } };
  PN.back = () => { if (!PN.tour || !PN.tour.i) return; PN.tour.i--; go(); };
  PN.end = (done) => { PN.tour = null; LQ.app.hideRing(); LQ.speech.cancel(); if (done) { location.hash = '#/home'; U.toast('Tour finished. Everything you saw is yours to try.'); } LQ.app.render(); };
  PN.mobileCard = (cls) => {
    if (!PN.tour) return '';
    const s = TOUR[PN.tour.i];
    return '<div class="tourcard ' + (cls || '') + '" role="dialog" aria-label="Guided tour" aria-live="polite"><p class="small">Tour ' + (PN.tour.i + 1) + ' of ' + TOUR.length + '</p><strong>' + esc(s.title) + '</strong><p class="small">' + esc(s.body) + '</p><div class="pn__tourbtns">' + (s.act ? '<button class="btn btn--sm btn--primary" data-act="tour-do">' + esc(s.doLabel) + '</button>' : '') + '<button class="btn btn--ghost btn--sm" data-act="tour-back"' + (PN.tour.i ? '' : ' disabled') + '>Back</button><button class="btn btn--primary btn--sm" data-act="tour-next">' + (PN.tour.i === TOUR.length - 1 ? 'Finish' : 'Next') + '</button><button class="btn btn--quiet btn--sm" data-act="tour-end">End</button></div></div>';
  };
})();
