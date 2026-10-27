/* LangQuest V3 — state store, persistence, evidence model, scheduler, XP ledger.
   Everything is saved in this browser under "langquest-v3". */
'use strict';
(function () {
  const KEY = 'langquest-v3';
  const S = LQ.store = {};
  const listeners = new Set();

  /* Expressions → the can-do skill they evidence. */
  LQ.EXPR_SKILL = Object.assign(LQ.EXPR_SKILL || {}, {
    'es-hola-que-tal': 'greet_politely', 'es-muy-bien': 'greet_politely', 'es-me-llamo': 'introduce_self', 'es-mucho-gusto': 'introduce_self',
    'es-buenos-dias': 'greet_politely', 'es-cafe-con-leche': 'request_item', 'es-para-aqui': 'choose_option', 'es-cuanto-es': 'ask_price',
    'es-donde-metro': 'ask_directions', 'es-mas-despacio': 'repair_misunderstanding', 'es-todo-recto': 'confirm_understanding', 'es-muchas-gracias': 'thank_and_close',
    'ary-labas': 'greet_politely', 'ary-bghit-nss': 'request_item', 'ary-bch7al': 'ask_price', 'ary-chokran': 'thank_and_close',
    'fr-cafe-au-lait': 'request_item', 'fr-pour-apporter': 'choose_option', 'fr-combien': 'ask_price', 'fr-bonne-journee': 'thank_and_close',
    'ja-latte': 'request_item', 'ja-tennai': 'choose_option', 'ja-ikura': 'ask_price', 'ja-arigatou': 'thank_and_close',
    'en-latte': 'request_item', 'en-to-go': 'choose_option', 'en-how-much': 'ask_price', 'en-thanks': 'thank_and_close'
  });
  LQ.exprSkill = id => {
    if (LQ.EXPR_SKILL[id]) return LQ.EXPR_SKILL[id];
    const c = /-(hello|fine|name|bye|thanks|coffee|tea|howmuch|where|slower)$/.exec(id || '');
    if (c && LQ.CONCEPT_SKILL) return LQ.CONCEPT_SKILL[c[1]];
    return null;
  };

  /* ── dates: the demo clock runs in minutes from Fri Oct 23, 2026, 09:10 ── */
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const BASE = new Date(LQ.DEMO_DATE + 'T' + LQ.DEMO_TIME + ':00').getTime();
  S.now = () => new Date(BASE + ((S.state && S.state.clockMin) || 0) * 60000);
  S.nowIso = () => { const d = S.now(); return iso(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  S.fmtTime = (d) => (d || S.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  S.addDays = (isoDate, n) => { const d = new Date(isoDate + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  S.today = () => iso(S.now());
  S.daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  S.fmtDay = (isoDate, opts) => new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', opts || { weekday: 'short', month: 'short', day: 'numeric' });
  S.relDay = (isoDate) => { const d = S.daysBetween(S.today(), isoDate); if (d < 0) return d === -1 ? 'yesterday' : (-d) + ' days ago'; if (d === 0) return 'today'; if (d === 1) return 'tomorrow'; return 'in ' + d + ' days'; };

  /* Profile fields live at the top level for the active learner; other learners on the
     device are parked in state.profiles and swapped in by switchProfile(). */
  const PF = ['onboarded', 'sample', 'learner', 'ui', 'defaultSource', 'active', 'enrollments', 'progress', 'xp', 'streakPaused', 'speakingSeconds', 'downloads', 'goal', 'createdAt'];
  S.PF = PF;
  function freshProfile() {
    return { onboarded: false, sample: false, learner: { name: '', city: '' }, ui: 'en', defaultSource: 'en', active: null, enrollments: {}, progress: {}, xp: [], streakPaused: false, speakingSeconds: 0, downloads: {}, goal: { xp: 20 }, createdAt: null };
  }
  function fresh() {
    return Object.assign({
      v: 4, profileId: 'p1', profiles: {}, clockMin: 0, events: [], inbox: [], remindedDays: {},
      caps: { noSR: false, noVoice: false, offline: false, liveAI: true },
      settings: { mascot: true, motion: true, readingFont: 'standard', textSize: 100, theme: 'system', help: 'fade', reminders: { due: true, missions: false, audio: true, quiet: '21:00–08:00' } },
      studio: LQ.studioSeed ? LQ.studioSeed() : {}, tourSeen: false
    }, freshProfile());
  }
  S.fresh = fresh;
  S.freshProfile = freshProfile;
  S.blankProgress = () => ({ missions: {}, expressions: {}, skills: {}, memory: {}, audio: {}, attempts: [] });

  function seedSample(st) {
    st.onboarded = true; st.sample = true;
    st.learner = { name: LQ.SAMPLE_LEARNER.name, city: LQ.SAMPLE_LEARNER.city };
    st.active = 'es-spain';
    st.enrollments = {
      'es-spain': { source: 'en', script: null, region: null, addedAt: '2026-10-19', status: 'active', fallback: null, voiceNear: false },
      'ar-moroccan': { source: 'fr', script: 'both', region: 'casa', addedAt: '2026-10-20', status: 'active', fallback: null, voiceNear: false }
    };
    const es = S.blankProgress();
    es.missions['fw-es-spain'] = { status: 'done', completedAt: '2026-10-19', runs: 1 };
    es.missions['es-hello'] = { status: 'done', completedAt: '2026-10-21', runs: 1, vars: { from: 'Montréal' } };
    const ex = (id, added, interval, due, hist) => { es.expressions[id] = { id, added, interval, due, reps: hist.length, lapses: hist.filter(h => h.result === 'again').length, history: hist }; };
    ex('fw-es-spain-hello', '2026-10-19', 3, '2026-10-25', [{ at: '2026-10-19', result: 'got', kind: 'anticipation' }, { at: '2026-10-22', result: 'got', kind: 'recall', scene: 'plaza' }]);
    ex('fw-es-spain-thanks', '2026-10-19', 3, '2026-10-25', [{ at: '2026-10-19', result: 'got', kind: 'anticipation' }, { at: '2026-10-22', result: 'got', kind: 'recall', scene: 'plaza' }]);
    ex('es-hola-que-tal', '2026-10-21', 1, '2026-10-23', [{ at: '2026-10-21', result: 'got', kind: 'anticipation', assisted: true }]);
    ex('es-muy-bien', '2026-10-21', 3, '2026-10-25', [{ at: '2026-10-21', result: 'got', kind: 'anticipation' }, { at: '2026-10-22', result: 'got', kind: 'recall', scene: 'madrid-plaza' }]);
    ex('es-me-llamo', '2026-10-21', 1, '2026-10-23', [{ at: '2026-10-21', result: 'close', kind: 'anticipation' }, { at: '2026-10-22', result: 'close', kind: 'recall', scene: 'madrid-terrace' }]);
    ex('es-mucho-gusto', '2026-10-21', 1, '2026-10-22', [{ at: '2026-10-21', result: 'got', kind: 'anticipation', assisted: true }]);
    const ev = (skill, list) => { es.skills[skill] = { evidence: list }; };
    ev('greet_politely', [{ at: '2026-10-19', mission: 'fw-es-spain', scene: 'plaza', kind: 'anticipation', autonomy: 'independent', input: 'self', ok: true },
      { at: '2026-10-21', mission: 'es-hello', scene: 'madrid-cafe', kind: 'roleplay', autonomy: 'independent', input: 'typed', ok: true, said: 'Muy bien, ¿y tú?' }]);
    ev('introduce_self', [{ at: '2026-10-21', mission: 'es-hello', scene: 'madrid-cafe', kind: 'roleplay', autonomy: 'hint', input: 'typed', ok: true, said: 'Me llamo Camille.' }]);
    ev('respond_unexpected', [{ at: '2026-10-21', mission: 'es-hello', scene: 'madrid-cafe', kind: 'roleplay', autonomy: 'suggested', input: 'choice', ok: true, said: 'Soy de Montreal.' }]);
    ev('thank_and_close', [{ at: '2026-10-19', mission: 'fw-es-spain', scene: 'plaza', kind: 'anticipation', autonomy: 'independent', input: 'self', ok: true },
      { at: '2026-10-21', mission: 'es-hello', scene: 'madrid-cafe', kind: 'roleplay', autonomy: 'independent', input: 'typed', ok: true, said: 'Gracias, ¡hasta luego!' }]);
    es.memory.lucia = [{ at: '2026-10-21', en: 'You’re from Montréal and just moved into the street for a month.', fr: 'Tu viens de Montréal et tu loges dans la rue pour un mois.' }];
    es.audio['madrid-l1'] = { pos: 6, updated: '2026-10-22', bookmarks: [4] };
    es.custom = { 'c-es-spain-1': { id: 'c-es-spain-1', t: '¡Vale, perfecto!', r: '', m: { en: 'OK, perfect!', fr: 'D’accord, parfait !' }, note: 'Heard at the market on Saturday', from: 'custom', added: '2026-10-22', concept: null } };
    es.expressions['c-es-spain-1'] = { id: 'c-es-spain-1', added: '2026-10-22', interval: 0, due: '2026-10-23', reps: 0, lapses: 0, history: [], saved: true, from: 'custom' };
    st.progress = { 'es-spain': es, 'ar-moroccan': S.blankProgress() };
    st.xp = [
      { key: 'm:fw-es-spain:done', xp: 30, at: '2026-10-19', track: 'es-spain', reason: 'First words in Madrid, completed' },
      { key: 'enroll:ar-moroccan', xp: 0, at: '2026-10-20', track: 'ar-moroccan', reason: 'Enrolled in Arabic (Moroccan) from French' },
      { key: 'audio:madrid-l1:2026-10-20', xp: 10, at: '2026-10-20', track: 'es-spain', reason: 'Listened to “¿Qué te pongo?” (part)' },
      { key: 'm:es-hello:done', xp: 60, at: '2026-10-21', track: 'es-spain', reason: 'Say hello at La Corrala, completed' },
      { key: 'r:es-muy-bien:2026-10-22', xp: 10, at: '2026-10-22', track: 'es-spain', reason: 'Recalled “Muy bien, ¿y tú?” in a new scene' },
      { key: 'r:es-me-llamo:2026-10-22', xp: 10, at: '2026-10-22', track: 'es-spain', reason: 'Recalled “Me llamo…” in a new scene' },
      { key: 'r:fw-es-spain-hello:2026-10-22', xp: 10, at: '2026-10-22', track: 'es-spain', reason: 'Recalled “¡Hola!”' },
      { key: 'r:fw-es-spain-thanks:2026-10-22', xp: 10, at: '2026-10-22', track: 'es-spain', reason: 'Recalled “Gracias”' }
    ];
    st.speakingSeconds = 0;
    st.events = [{ at: '2026-10-22', type: 'review.completed', text: '4 expressions recalled in new scenes' }];
    return st;
  }

  function normalize(saved) {
    const st = fresh();
    if (!saved || (saved.v !== 3 && saved.v !== 4)) return st;
    Object.assign(st, saved);
    st.v = 4;
    st.settings = Object.assign(fresh().settings, saved.settings || {});
    st.caps = Object.assign(fresh().caps, saved.caps || {});
    if (st.clockMin == null) st.clockMin = (saved.clockOffset || 0) * 1440;
    delete st.clockOffset;
    st.profiles = st.profiles || {}; st.inbox = st.inbox || []; st.events = st.events || []; st.remindedDays = st.remindedDays || {};
    st.profileId = st.profileId || 'p1';
    PF.forEach(k => { if (st[k] === undefined) st[k] = freshProfile()[k]; });
    if (!st.studio || !st.studio.assets) st.studio = LQ.studioSeed();
    if (!st.studio.fxSeeded && LQ.seedTemplateDrafts) { st.studio.drafts = st.studio.drafts.concat(LQ.seedTemplateDrafts()); st.studio.fxSeeded = true; }
    return st;
  }
  S.normalize = normalize;
  S.load = () => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
    S.state = normalize(saved);
    return S.state;
  };
  S.save = () => { try { localStorage.setItem(KEY, JSON.stringify(S.state)); } catch (e) { } };
  S.reset = () => { try { localStorage.removeItem(KEY); localStorage.removeItem(KEY + ':ui'); } catch (e) { } S.state = fresh(); S.save(); emitChange(); };
  /* "Explore as a sample learner" fills the current profile with Camille; other learners stay. */
  S.useSample = () => {
    const st = S.state, tmp = fresh(); seedSample(tmp); PF.forEach(k => { st[k] = tmp[k]; }); st.createdAt = S.today();
    st.inbox = st.inbox.filter(n => n.profile !== st.profileId).concat([
      { id: 'n-sample-2', at: '2026-10-22T19:05', read: false, profile: st.profileId, kind: 'character', title: 'Lucía: “¡Hasta mañana, Camille!”', body: 'She remembers you’re from Montréal. Your next café visit is ready when you are.', link: '#/speak/locals/lucia' },
      { id: 'n-sample-1', at: '2026-10-19T08:30', read: true, profile: st.profileId, kind: 'system', title: 'Welcome to LangQuest', body: 'Two courses set up: Spanish (Spain) from English and Darija from French. Everything is free.', link: '#/courses' }
    ]);
    S.event('profile.sample', 'Sample learner Camille loaded into this profile'); S.save(); emitChange();
  };
  S.seedSampleInto = (st) => seedSample(st);

  /* ── learner profiles on this device ── */
  const snapshot = st => { const o = {}; PF.forEach(k => { o[k] = JSON.parse(JSON.stringify(st[k] === undefined ? freshProfile()[k] : st[k])); }); return o; };
  S.profiles = () => {
    const st = S.state, list = [{ id: st.profileId, data: st, current: true }];
    Object.entries(st.profiles).forEach(([id, d]) => list.push({ id, data: d, current: false }));
    return list.map(p => ({ id: p.id, current: p.current, name: p.data.learner.name || 'New learner', onboarded: p.data.onboarded, courses: Object.values(p.data.enrollments).filter(e => e.status === 'active').length, active: p.data.active, xp: (p.data.xp || []).reduce((a, x) => a + x.xp, 0), streakPaused: p.data.streakPaused, goal: p.data.goal }));
  };
  S.switchProfile = (id) => {
    const st = S.state; if (id === st.profileId || !st.profiles[id]) return false;
    st.profiles[st.profileId] = snapshot(st);
    const next = st.profiles[id]; delete st.profiles[id];
    PF.forEach(k => { st[k] = next[k] === undefined ? freshProfile()[k] : next[k]; });
    st.profileId = id;
    S.event('profile.switched', 'Now learning as ' + (st.learner.name || 'a new learner'));
    S.save(); emitChange(); return true;
  };
  S.createProfile = (name, source) => {
    const st = S.state, id = 'p' + (Date.now().toString(36)) + Math.floor(Math.random() * 99);
    st.profiles[st.profileId] = snapshot(st);
    const np = freshProfile(); np.learner.name = (name || '').trim(); np.defaultSource = source || 'en'; np.createdAt = S.today();
    PF.forEach(k => { st[k] = np[k]; }); st.profileId = id;
    S.event('profile.created', 'New learner profile: ' + (np.learner.name || 'unnamed'));
    S.save(); emitChange(); return id;
  };
  S.deleteProfile = (id) => {
    const st = S.state;
    if (id === st.profileId) { const other = Object.keys(st.profiles)[0]; if (!other) return null; const removed = snapshot(st); S.switchProfile(other); delete st.profiles[id]; S.save(); emitChange(); return { id, data: removed }; }
    const data = st.profiles[id]; if (!data) return null; delete st.profiles[id];
    S.event('profile.deleted', 'Removed learner profile ' + (data.learner.name || id)); S.save(); emitChange(); return { id, data };
  };
  S.restoreProfile = (undo) => { if (!undo) return; S.state.profiles[undo.id] = undo.data; S.event('profile.restored', 'Restored learner profile ' + (undo.data.learner.name || undo.id)); S.save(); emitChange(); };
  S.exportProfile = () => JSON.stringify({ type: 'langquest-profile', version: 1, exportedAt: S.nowIso(), profile: snapshot(S.state) }, null, 2);
  S.importProfile = (obj) => {
    if (!obj || obj.type !== 'langquest-profile' || !obj.profile || !obj.profile.learner || typeof obj.profile.enrollments !== 'object') throw new Error('This file isn’t a LangQuest learner profile export.');
    const st = S.state, id = 'p' + Date.now().toString(36);
    st.profiles[st.profileId] = snapshot(st);
    const p = Object.assign(freshProfile(), obj.profile);
    PF.forEach(k => { st[k] = p[k]; }); st.profileId = id;
    S.event('profile.imported', 'Imported learner profile ' + (p.learner.name || '')); S.save(); emitChange(); return id;
  };
  S.exportWorkspace = () => JSON.stringify({ type: 'langquest-workspace', version: 4, exportedAt: S.nowIso(), state: S.state }, null, 2);
  S.importWorkspace = (obj) => {
    if (!obj || obj.type !== 'langquest-workspace' || !obj.state || !obj.state.studio) throw new Error('This file isn’t a LangQuest workspace export.');
    S.state = normalize(obj.state); S.event('workspace.imported', 'Workspace imported from a JSON file'); S.save(); emitChange();
  };

  /* ── inbox ── */
  S.notify = (n) => { const st = S.state; st.inbox.unshift(Object.assign({ id: 'n' + Date.now().toString(36) + Math.floor(Math.random() * 999), at: S.nowIso(), read: false, profile: st.profileId }, n)); st.inbox = st.inbox.slice(0, 80); };
  S.inboxFor = () => S.state.inbox.filter(n => !n.profile || n.profile === S.state.profileId);
  S.unread = () => S.inboxFor().filter(n => !n.read).length;

  /* ── demo clock and its consequences ── */
  const quiet = (d) => { const h = d.getHours(); return h >= 21 || h < 8; };
  S.advance = (minutes) => {
    const st = S.state, before = S.now();
    st.clockMin = (st.clockMin || 0) + minutes;
    const after = S.now();
    S.event('demo.clock', 'Demo clock moved to ' + S.fmtDay(S.today()) + ', ' + S.fmtTime(after));
    runConsequences(before, after);
    S.save(); emitChange();
  };
  S.setDate = (isoDate) => { const target = new Date(isoDate + 'T' + LQ.DEMO_TIME + ':00').getTime(); const diff = Math.round((target - S.now().getTime()) / 60000); if (diff > 0) S.advance(diff); else { S.state.clockMin += diff; S.event('demo.clock', 'Demo clock set back to ' + S.fmtDay(S.today())); S.save(); emitChange(); } };
  function allProfileData() { const st = S.state; return [{ id: st.profileId, d: st }].concat(Object.entries(st.profiles).map(([id, d]) => ({ id, d }))); }
  S.allProfileData = allProfileData;
  /* Notify every learner on the device who matches pred(profileData). */
  S.notifyProfiles = (pred, n) => { let k = 0; allProfileData().forEach(({ id, d }) => { if (pred(d)) { S.notify(Object.assign({}, n, { profile: id })); k++; } }); return k; };
  S.tickHooks = [];
  function runConsequences(before, after) {
    const st = S.state;
    // 1. Daily reminder at 18:00 for due phrases, per learner, respecting settings, pauses and quiet hours.
    const d = new Date(before); d.setHours(18, 0, 0, 0); if (d <= before) d.setDate(d.getDate() + 1);
    for (; d <= after; d.setDate(d.getDate() + 1)) {
      const day = iso(d);
      if (!st.settings.reminders.due || quiet(d)) continue;
      allProfileData().forEach(({ id, d: pd }) => {
        if (!pd.onboarded || pd.streakPaused || st.remindedDays[id + ':' + day]) return;
        let n = 0; Object.entries(pd.enrollments).forEach(([tid, e]) => { if (e.status !== 'active') return; Object.values((pd.progress[tid] || {}).expressions || {}).forEach(r => { if (r.due <= day) n++; }); });
        if (!n) return;
        st.remindedDays[id + ':' + day] = true;
        st.inbox.unshift({ id: 'n' + day + id, at: day + 'T18:00', read: false, profile: id, kind: 'reminder', title: n + ' phrase' + (n > 1 ? 's' : '') + ' ready to recall', body: 'A short recall session keeps them coming back at longer intervals. Skipping a day costs nothing.', link: '#/review' });
        S.event('reminder.sent', (pd.learner.name || 'Learner') + ': ' + n + ' due (18:00, ' + S.fmtDay(day) + ')');
      });
    }
    // 2. Modules with time-based rules (scheduled publishing, invites) run here.
    S.tickHooks.forEach(fn => { try { fn(before, after); } catch (e) { console.error(e); } });
    // 3. Offline lesson packs are licensed for 30 days, then need a fresh download.
    allProfileData().forEach(({ id, d: pd }) => {
      Object.entries(pd.downloads || {}).forEach(([lid, v]) => {
        const at = typeof v === 'string' ? v : v.at; const exp = typeof v === 'object' && v.expired;
        if (!exp && S.daysBetween(at, iso(after)) >= 30) {
          pd.downloads[lid] = { at, expired: true };
          const f = LQ.lessonById && LQ.lessonById(lid);
          st.inbox.unshift({ id: 'n' + lid + iso(after), at: iso(after) + 'T09:00', read: false, profile: id, kind: 'system', title: 'Offline pack expired: ' + (f ? f.l.title : lid), body: 'Downloaded lesson packs stay valid for 30 days. Download it again while online.', link: f ? '#/audio/' + f.c.id : '#/audio' });
          S.event('download.expired', (f ? f.l.title : lid) + ' (30-day offline licence)');
        }
      });
    });
  }

  /* ── notebook: saved and custom phrases ── */
  S.custom = (tid) => { const p = S.prog(tid); p.custom = p.custom || {}; return p.custom; };
  S.addCustom = (tid, ph) => {
    const c = S.custom(tid), n = Object.keys(c).length + 1; let id = 'c-' + tid + '-' + n; while (c[id]) id += 'b';
    c[id] = { id, t: ph.t.trim(), r: (ph.r || '').trim(), m: ph.m, note: ph.note || '', from: ph.from || 'custom', added: S.today(), concept: ph.concept || null };
    S.ensureReview(tid, id, ph.from || 'custom');
    S.event('phrase.added', '“' + c[id].t + '” added to the notebook (' + LQ.trackById(tid).name + ')');
    return id;
  };
  S.updateCustom = (tid, id, ph) => { const c = S.custom(tid)[id]; if (!c) return; Object.assign(c, { t: ph.t.trim(), r: (ph.r || '').trim(), m: ph.m, note: ph.note || '' }); S.event('phrase.edited', '“' + c.t + '” edited'); };
  S.deletePhrase = (tid, id) => {
    const p = S.prog(tid), undo = { tid, id, custom: p.custom && p.custom[id] ? JSON.parse(JSON.stringify(p.custom[id])) : null, review: p.expressions[id] ? JSON.parse(JSON.stringify(p.expressions[id])) : null };
    if (p.custom) delete p.custom[id]; delete p.expressions[id];
    S.event('phrase.removed', '“' + (undo.custom ? undo.custom.t : LQ.phraseText(id)) + '” removed from reviews'); return undo;
  };
  S.restorePhrase = (u) => { const p = S.prog(u.tid); if (u.custom) { p.custom = p.custom || {}; p.custom[u.id] = u.custom; } if (u.review) p.expressions[u.id] = u.review; S.event('phrase.restored', 'Phrase restored'); };
  S.ensureReview = (tid, id, from) => { const p = S.prog(tid); if (!p.expressions[id]) p.expressions[id] = { id, added: S.today(), interval: 0, due: S.today(), reps: 0, lapses: 0, history: [], saved: true, from: from || 'saved' }; else p.expressions[id].saved = true; return p.expressions[id]; };
  S.isSaved = (tid, id) => { const r = S.prog(tid).expressions[id]; return !!r; };
  LQ.customExpression = (id) => {
    const st = S.state; for (const [tid, p] of Object.entries(st.progress || {})) { const c = p.custom && p.custom[id]; if (c) return { e: { id, t: c.t, r: c.r, m: c.m, note: c.note }, m: { id: 'notebook', track: tid, title: { en: 'your notebook', fr: 'votre carnet', es: 'tu cuaderno', ru: 'ваш блокнот' }, scene: 'plaza', recall: {} } }; }
    return null;
  };
  S.stage = (r) => !r || !r.reps ? 'new' : r.interval >= 16 ? 'graduated' : r.interval >= 3 ? 'young' : 'learning';
  S.dueStatus = (r) => { const d = S.daysBetween(S.today(), r.due); return d < 0 ? { k: 'overdue', days: -d } : d === 0 ? { k: 'today', days: 0 } : { k: 'upcoming', days: d }; };
  S.dueAll = () => { const t = S.today(), out = []; Object.entries(S.state.enrollments).forEach(([tid, e]) => { if (e.status !== 'active') return; Object.values(S.prog(tid).expressions).forEach(r => { if (r.due <= t) out.push({ tid, r }); }); }); return out.sort((a, b) => a.r.due < b.r.due ? -1 : 1); };
  S.xpToday = () => S.state.xp.filter(x => x.at === S.today()).reduce((a, x) => a + x.xp, 0);
  S.cap = (k) => !!(S.state && S.state.caps && S.state.caps[k]);
  S.subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
  function emitChange() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }
  S.commit = (fn) => { fn && fn(S.state); S.save(); emitChange(); };
  S.event = (type, text, extra) => { S.state.events.unshift(Object.assign({ at: S.today(), time: S.fmtTime(), type, text, n: Date.now(), profile: S.state.profileId }, extra || {})); S.state.events = S.state.events.slice(0, 150); };

  /* ── enrollments ── */
  S.track = () => S.state.active ? LQ.trackById(S.state.active) : null;
  S.enr = (tid) => S.state.enrollments[tid || S.state.active] || null;
  S.prog = (tid) => { tid = tid || S.state.active; if (!S.state.progress[tid]) S.state.progress[tid] = S.blankProgress(); return S.state.progress[tid]; };
  S.source = (tid) => { const e = S.enr(tid); return e ? e.source : S.state.defaultSource; };
  S.enroll = (tid, opts) => {
    const st = S.state, track = LQ.trackById(tid);
    const isNew = !st.enrollments[tid];
    st.enrollments[tid] = Object.assign(st.enrollments[tid] || { addedAt: S.today(), status: 'active', fallback: null, voiceNear: false }, {
      source: opts.source || st.defaultSource, script: opts.script || (track.scriptModes ? 'both' : null), region: opts.region || (track.regions ? track.regions[0].id : null), status: 'active'
    });
    S.prog(tid); st.active = tid;
    if (isNew) { award('enroll:' + tid, 0, 'Enrolled in ' + track.name + ' from ' + srcName(opts.source || st.defaultSource), tid); S.event('enrollment.created', track.name + ' from ' + srcName(opts.source || st.defaultSource)); }
  };
  S.setSource = (tid, code) => {
    const e = S.enr(tid); if (!e || e.source === code) return;
    const prev = e.source; e.source = code; e.fallback = null;
    S.event('enrollment.source_changed', LQ.trackById(tid).name + ': instructions ' + srcName(prev) + ' → ' + srcName(code) + '. Skills, recall schedule and story kept.');
  };
  const srcName = c => (LQ.SOURCES.find(s => s.code === c) || { name: c }).name;
  S.srcName = srcName;

  /* ── XP ledger: append-only, idempotent by key ── */
  function award(key, xp, reason, tid) {
    if (S.state.xp.some(x => x.key === key)) return 0;
    S.state.xp.push({ key, xp, at: S.today(), track: tid || S.state.active, reason });
    if (xp) S.event('xp.awarded', '+' + xp + ' XP · ' + reason);
    return xp;
  }
  S.award = award;
  S.xpTotal = () => S.state.xp.reduce((a, x) => a + x.xp, 0);
  S.xpByDay = () => { const m = {}; S.state.xp.forEach(x => { m[x.at] = (m[x.at] || 0) + x.xp; }); return m; };
  S.activeDays = () => Object.keys(S.xpByDay()).filter(d => S.xpByDay()[d] > 0).sort();
  S.week = () => { const t = S.today(); const days = []; const by = S.xpByDay(); const dow = new Date(t + 'T12:00:00').getDay(); const monday = S.addDays(t, -((dow + 6) % 7)); for (let i = 0; i < 7; i++) { const d = S.addDays(monday, i); days.push({ d, xp: by[d] || 0, future: d > t, today: d === t }); } return days; };
  S.run = () => { let n = 0, d = S.today(); const by = S.xpByDay(); if (!by[d]) d = S.addDays(d, -1); while (by[d] > 0) { n++; d = S.addDays(d, -1); } return n; };

  /* ── evidence & can-do skill states ── */
  S.observe = (tid, skill, ob) => {
    if (!skill) return;
    const p = S.prog(tid); p.skills[skill] = p.skills[skill] || { evidence: [] };
    const before = S.skillState(tid, skill);
    p.skills[skill].evidence.push(Object.assign({ at: S.today() }, ob));
    const after = S.skillState(tid, skill);
    const name = LQ.SKILLS[skill] ? LQ.SKILLS[skill].en : skill;
    S.event('skill.observed', name + ': ' + ob.kind + ', ' + (ob.ok ? 'meaning came across' : 'not yet') + ' (' + ob.autonomy + ', ' + ob.input + ')' + (before !== after ? ' → ' + after.replace('_', ' ') : ''));
  };
  S.skillState = (tid, skill) => {
    const s = S.prog(tid).skills[skill];
    if (!s || !s.evidence.length) return 'not_attempted';
    const ev = s.evidence;
    const indep = ev.filter(e => e.ok && e.kind === 'roleplay' && e.autonomy === 'independent');
    if (indep.length) {
      const first = indep[0];
      const later = ev.find(e => e.ok && e.kind === 'recall' && e.autonomy === 'independent' && S.daysBetween(first.at, e.at) >= 1 && e.scene !== first.scene);
      return later ? 'durable' : 'independent';
    }
    if (ev.some(e => e.ok && e.kind === 'roleplay')) return 'practiced';
    return 'emerging';
  };
  S.skillDims = (tid, skill) => {
    const ev = ((S.prog(tid).skills[skill] || {}).evidence) || [];
    return {
      listening: ev.some(e => e.kind === 'listening' && e.ok),
      meaning: ev.some(e => e.ok && (e.kind === 'roleplay' || e.kind === 'recall')),
      spoken: ev.some(e => e.ok && e.input === 'speech'),
      retention: ev.some(e => e.ok && e.kind === 'recall')
    };
  };

  /* ── scheduler: evidence-weighted intervals (pluggable, deterministic) ──
     got: 1 → 3 → 7 → 16 → 37 days; close: ×1.2 (min 1); again: later today.
     If the answer was revealed before an attempt, or a hint was used, the interval halves. */
  S.schedule = (tid, exprId, result, opts) => {
    opts = opts || {};
    const p = S.prog(tid), t = S.today();
    const r = p.expressions[exprId] || { id: exprId, added: t, interval: 0, due: t, reps: 0, lapses: 0, history: [], mission: opts.mission };
    const prev = r.interval || 0;
    let iv, why;
    if (result === 'again') { iv = 0; r.lapses++; why = 'You marked it “not yet”, so it comes back later today. No penalty, just another try.'; }
    else if (result === 'close') { iv = Math.max(1, Math.round(prev * 1.2)); why = 'Close: it returns in ' + iv + ' day' + (iv > 1 ? 's' : '') + ' to firm it up.'; }
    else { iv = prev === 0 ? 1 : prev < 3 ? 3 : Math.round(prev * 2.3); why = 'Got it: next review in ' + iv + ' day' + (iv > 1 ? 's' : '') + '.'; }
    if (opts.assisted && result !== 'again') { const h = Math.max(1, Math.floor(iv / 2)); if (h < iv) { why = 'You ' + (opts.assisted === 'hint' ? 'used a hint' : 'revealed the answer before trying') + ', so it returns in ' + h + ' day' + (h > 1 ? 's' : '') + ' instead of ' + iv + '.'; iv = h; } }
    r.interval = iv; r.due = S.addDays(t, iv); r.reps++;
    r.history.push({ at: t, result, kind: opts.kind || 'anticipation', assisted: opts.assisted || false, scene: opts.scene || null });
    p.expressions[exprId] = r;
    S.event('review.scheduled', '“' + LQ.phraseText(exprId) + '” due ' + S.fmtDay(r.due) + ' (' + iv + 'd)');
    return { due: r.due, interval: iv, why };
  };
  S.due = (tid) => { const t = S.today(); return Object.values(S.prog(tid).expressions).filter(r => r.due <= t).sort((a, b) => a.due < b.due ? -1 : 1); };
  S.upcoming = (tid, days) => { const t = S.today(); const out = []; for (let i = 0; i < (days || 7); i++) { const d = S.addDays(t, i); out.push({ d, items: Object.values(S.prog(tid).expressions).filter(r => i === 0 ? r.due <= d : r.due === d) }); } return out; };
  LQ.phraseText = id => { const f = LQ.expressionById(id); return f ? f.e.t.replace('{name}', (S.state && S.state.learner.name) || '…') : id; };

  /* ── missions ── */
  S.missionState = (tid, mid) => (S.prog(tid).missions[mid] || {}).status || 'new';
  S.nextMission = (tid) => {
    tid = tid || S.state.active; if (!tid) return null;
    const enr = S.enr(tid), list = LQ.missionsFor(tid).filter(m => m.status === 'playable' && (!m.region || !enr.region || m.region === enr.region));
    const draft = list.find(m => (S.prog(tid).missions[m.id] || {}).draft);
    if (draft) return draft;
    return list.find(m => S.missionState(tid, m.id) !== 'done') || list[list.length - 1];
  };
})();
