/* LangQuest V3 — learner views: onboarding, home, missions, courses, settings. */
'use strict';
(function () {
  const V = LQ.views = LQ.views || {};
  const U = LQ.ui, S = LQ.store, A = LQ.art, esc = U.esc, ic = U.icon;
  const st = () => S.state;

  /* ── App header with the global course switcher (target + source + edit) ── */
  V.header = (noPill) => {
    const t = S.track();
    if (!t) return '';
    const e = S.enr();
    return '<header class="appbar' + (noPill ? ' appbar--nopill' : '') + '" id="app-header">' + (noPill ? '<span class="appbar__fill"></span>' : '') +
      (noPill ? '' : '<button class="coursepill" data-act="open-switcher" aria-label="Course: ' + esc(t.name) + ', learning from ' + esc(S.srcName(e.source)) + '. Change course or instruction language">' + U.trackBadge(t) +
      '<span class="coursepill__txt" title="' + esc(t.name + ', from ' + S.srcName(e.source)) + '"><strong>' + esc(t.name.replace(/\s*\(.*\)$/, '')) + '</strong></span><span class="coursepill__src">' + esc(String(e.source).toUpperCase()) + '</span></button>') +
      '<button class="iconbtn hdr-search" data-act="search-open" aria-label="Search (Ctrl or Cmd + K)" title="Search">' + ic('search', 'ic--sm') + '</button>' +
      '<a class="iconbtn bell" href="#/inbox" title="Inbox" aria-label="Inbox' + (S.unread() ? ', ' + S.unread() + ' unread' : '') + '">' + ic('bell', 'ic--sm') + (S.unread() ? '<span class="bell__n" aria-hidden="true">' + Math.min(9, S.unread()) + (S.unread() > 9 ? '+' : '') + '</span>' : '') + '</a>' +
      '<button class="iconbtn demo-chip" data-act="demo-sheet" aria-label="Demo tools: tour, Test lab, API monitor, reset. Fictional data." title="Demo tools · fictional data">' + ic('flask', 'ic--sm') + '</button>' +
      '<a class="iconbtn avatar" href="#/settings" title="Profile and settings" aria-label="Profile and settings, learning as ' + esc(st().learner.name || 'you') + '">' + esc((st().learner.name || 'You').slice(0, 1).toUpperCase()) + '</a></header>';
  };

  /* ── Welcome ── */
  V.welcome = () => '<main class="welcome" id="main">' +
    '<div class="welcome__art">' + A.orbit('welcome', { size: 168 }) + '</div>' +
    '<h1 class="display">Start speaking from day one.</h1>' +
    '<p class="lede">30 courses. Free. Talk first.</p>' +
    '<div class="stack-sm"><a class="btn btn--primary btn--lg" href="#/onboard/source" data-fk="ob-start">Choose a language</a>' +
    '<button class="linkbtn" data-act="use-sample">Try a sample learner</button></div>' +
    '<p class="fineprint"><button class="chip-demo chip-demo--btn" data-act="demo-sheet" aria-haspopup="dialog" title="Demo tools: tour, Test lab, API monitor, reset">' + ic('flask', 'ic--xs') + 'Demo · fictional data</button> ' + U.info('Hear a real situation, say your answer before you see it, then talk it through with a recurring local character. Thirty courses, all free: no paywall, no credits, no daily limits. Your progress stays in this browser.', 'About LangQuest') + '</p></main>';

  /* ── Onboarding: instruction language → course → confirm ── */
  V.obSource = () => {
    const def = st().defaultSource;
    const row = s => '<li><button class="choice' + (s.code === def ? ' is-on' : '') + '" data-act="ob-source" data-arg="' + s.code + '" aria-pressed="' + (s.code === def) + '"><span class="choice__main"><strong>' + esc(s.native) + '</strong><span>' + esc(s.name) + '</span></span>' +
      (s.tier === 1 ? '<span class="tag tag--ok" title="Primary: every course is written in it">' + ic('check', 'ic--xs') + '</span>' : s.tier === 2 ? '<span class="tag" title="Some courses are written in it">Some</span>' : '<span class="tag tag--muted" title="In progress: English shown where missing, after you agree">' + ic('clock', 'ic--xs') + '</span>') + '</button></li>';
    return '<main class="ob" id="main"><a class="backlink" href="#/welcome">' + ic('back', 'ic--sm') + ' Back</a>' +
      '<p class="step-count">1 / 3</p><h1 class="h1">Explain things in…</h1>' + U.info('Hints, translations and Orbit’s notes use this language. You can pick a different one for every course later. The app itself stays in English in this demo.', 'About instruction languages') +
      '<label class="field"><span>Your name</span><input id="ob-name" type="text" autocomplete="given-name" maxlength="24" value="' + esc(st().learner.name || '') + '" placeholder="Your first name"></label>' +
      '<ul class="choices" role="list">' + LQ.SOURCES.map(row).join('') + '</ul>' +
      '<a class="btn btn--primary btn--lg btn--block" href="#/onboard/track" data-act="ob-next-track">Continue</a></main>';
  };
  V.catalogList = (opts) => {
    opts = opts || {};
    const q = (LQ.ui.catalogQuery || '').trim().toLowerCase(), g = LQ.ui.catalogGroup || 'all';
    const group = LQ.REGION_GROUPS.find(x => x.id === g);
    const list = LQ.TRACKS.filter(t => (!group.ids || group.ids.includes(t.id)) && (!q || (t.name + ' ' + t.variety + ' ' + t.city + ' ' + (t.hello.r || '') + ' ' + t.hello.t).toLowerCase().includes(q)));
    const item = t => {
      const enrolled = st().enrollments[t.id];
      const nMissions = LQ.missionsFor(t.id).filter(m => m.status === 'playable' && !m.firstWords).length, deep = LQ.MISSIONS.some(m => m.track === t.id && m.status === 'playable');
      return '<li><a class="track" href="' + (opts.ob ? '#/onboard/confirm/' + t.id : '#/course/' + t.id) + '">' + U.trackBadge(t, 'tbadge--lg') +
        '<span class="track__main"><strong>' + esc(t.name) + '</strong><span class="track__sample"' + (t.hello.r ? ' title="' + esc(t.hello.r) + '"' : '') + '><span lang="' + esc(t.tts[0]) + '" dir="' + (t.rtl ? 'rtl' : 'ltr') + '">' + esc(t.hello.t) + '</span></span>' +
        '</span>' +
        '<span class="track__tags">' + (enrolled ? '<span class="tag tag--ok" title="Enrolled">' + ic('check', 'ic--xs') + '</span>' : '') + '<span class="tag' + (deep ? ' tag--cobalt' : '') + '" aria-label="' + nMissions + ' missions" title="' + esc(t.variety + ', ' + LQ.SCRIPT_NAMES[t.script] + ' script' + (t.rtl ? ', right-to-left' : '') + '. ' + nMissions + ' missions' + (deep ? ', including longer hand-written ones' : '')) + '">' + ic('path', 'ic--xs') + nMissions + '</span>' + '</span></a></li>';
    };
    return '<div class="catalog"><label class="search">' + ic('search', 'ic--sm') + '<input type="search" id="catalog-q" data-input="catalog-q" aria-label="Search 30 courses" placeholder="Course, city or “hello”" value="' + esc(LQ.ui.catalogQuery || '') + '"></label>' +
      '<div class="chips chips--scroll" role="group" aria-label="Filter courses">' + LQ.REGION_GROUPS.map(x => '<button class="fchip' + (x.id === g ? ' is-on' : '') + '" aria-pressed="' + (x.id === g) + '" data-act="catalog-group" data-arg="' + x.id + '" title="' + esc(x.label) + '">' + esc(x.label.replace(/ varieties$/, '')) + '</button>').join('') + '</div>' +
      '<p class="muted small" aria-live="polite">' + list.length + ' / 30</p>' +
      (list.length ? '<ul class="tracklist" role="list">' + list.map(item).join('') + '</ul>' : '<div class="empty">' + A.orbit('curious', { size: 72 }) + '<p>No course matches “' + esc(q) + '”. Try a city like “Kigali” or a word like “mbote”.</p><button class="btn btn--ghost" data-act="catalog-clear">Clear search</button></div>') + '</div>';
  };
  V.obTrack = () => '<main class="ob" id="main"><a class="backlink" href="#/onboard/source">' + ic('back', 'ic--sm') + ' Back</a><p class="step-count">2 / 3</p>' +
    '<h1 class="h1">What will you speak?</h1>' + U.info('All 30 courses are free. Each one names its spoken variety and script, so Moroccan Darija is never swapped for Modern Standard Arabic, nor Cantonese for Mandarin.', 'About varieties') + V.catalogList({ ob: true }) + '</main>';
  V.courseOptions = (t, cur) => {
    let h = '';
    if (t.regions) h += '<fieldset class="field"><legend>Regional variety</legend><div class="seg seg--wrap">' + t.regions.map(r => '<label class="segopt"><input type="radio" name="region" value="' + r.id + '"' + (cur.region === r.id ? ' checked' : '') + '><span>' + esc(r.label) + '</span></label>').join('') + '</div></fieldset>';
    if (t.scriptModes) h += '<fieldset class="field"><legend>Writing</legend><div class="seg">' + t.scriptModes.map(m => '<label class="segopt"><input type="radio" name="script" value="' + m + '"' + (cur.script === m ? ' checked' : '') + '><span>' + esc(m === 'native' ? (LQ.SCRIPT_MODE_LABEL.native[t.script] || 'Native script') : m === 'roman' ? (LQ.SCRIPT_MODE_LABEL.roman[t.id] || 'Romanized') : 'Both') + '</span></label>').join('') + '</div></fieldset>';
    const covered = U.trackSources(t);
    h += '<label class="field"><span>Learn from (instructions, hints, translations)</span><select name="source">' + LQ.SOURCES.filter(s => s.code !== V.targetCode(t)).map(s => '<option value="' + s.code + '"' + (cur.source === s.code ? ' selected' : '') + '>' + esc(s.native + ' (' + s.name + ')') + (covered.includes(s.code) ? '' : ' (not written yet)') + '</option>').join('') + '</select></label>';
    h += '<p class="small muted">' + esc(U.list(covered.map(c => S.srcName(c))) || 'English') + ' ' + U.info('In this demo, ' + t.name + ' instructions are written in ' + (U.list(covered.map(c => S.srcName(c))) || 'English') + '. If you pick another language, LangQuest tells you and asks before showing English instead.', 'About instruction coverage') + '</p>';
    return h;
  };
  V.targetCode = t => (t.internal || '').slice(0, 2);
  V.defaultSourceFor = t => st().defaultSource !== V.targetCode(t) ? st().defaultSource : (U.trackSources(t).find(c => c !== V.targetCode(t)) || 'fr');
  V.obConfirm = (tid) => {
    const t = LQ.trackById(tid); if (!t) return V.notFound();
    const cur = { source: V.defaultSourceFor(t), region: t.regions ? t.regions[0].id : null, script: t.scriptModes ? 'both' : null };
    return '<main class="ob" id="main"><a class="backlink" href="#/onboard/track">' + ic('back', 'ic--sm') + ' Back</a><p class="step-count">3 / 3</p>' +
      '<div class="confirm-hero">' + U.trackBadge(t, 'tbadge--xl') + '<h1 class="h1">Learn ' + esc(t.name) + ' from <span id="ob-src-name">' + esc(S.srcName(cur.source)) + '</span></h1></div>' +
      (t.note ? U.info(t.note, 'About this course') : '') +
      '<form class="stack" data-submit="ob-enroll" data-arg="' + t.id + '">' + V.courseOptions(t, cur) +
      '<button class="btn btn--primary btn--lg btn--block" type="submit">Start my first minute</button></form></main>';
  };

  /* ── Home ── */
  V.home = () => {
    const t = S.track(), e = S.enr(), src = e.source, p = S.prog();
    const m = S.nextMission();
    const due = S.due();
    const ch = m && m.character ? LQ.CHARACTERS[m.character] : null;
    const draft = m && (p.missions[m.id] || {}).draft;
    const done = m && S.missionState(t.id, m.id) === 'done';
    const listen = Object.entries(p.audio).sort((a, b) => (a[1].updated < b[1].updated ? 1 : -1))[0];
    const lesson = listen && LQ.lessonById(listen[0]);
    const mem = Object.entries(p.memory).find(([k, v]) => v && v.length);
    const week = S.week(), active = week.filter(d => d.xp > 0).length;
    const greet = (U.L({ en: 'Hi', fr: 'Salut', es: 'Hola', ru: 'Привет' }, src)) + ', ' + (st().learner.name || '') + '!';
    let html = V.header() + '<main class="home" id="main">' +
      '<section class="greet">' + U.mascot('happy', 52) + '<h1 class="h2" lang="' + src + '">' + esc(greet) + '</h1></section>';
    if (m) {
      const port = ch ? A.portrait(m.character, 'greeting', { size: 56 }) : A.portrait(A.localLook(t), 'greeting', { size: 56, look: A.localLook(t), name: m.local && m.local.name });
      html += '<article class="hero-mission"><a class="hero-mission__art" href="#/mission/' + m.id + '" aria-label="Mission details: ' + esc(U.L(m.title, src)) + '" title="' + esc(U.L(m.outcome, src)) + '">' + A.scene(m.scene, { palette: A.plazaPalette(t) }) + '<span class="hero-mission__port">' + port + '</span></a>' +
        '<div class="hero-mission__body"><h2 class="h3">' + esc(U.L(m.title, src)) + '</h2><p class="muted small">' + ic('clock', 'ic--xs') + ' ' + m.minutes + ' min · ' + esc(ch ? ch.name.split(' ')[0] : (m.local ? m.local.name : t.city)) + '</p>' +
        '<a class="btn btn--primary btn--lg btn--block" href="#/play/' + m.id + '" data-fk="home-start">' + ic('mic') + (draft ? 'Resume' : done ? 'Practise again' : 'Start speaking') + '</a></div></article>';
    }
    const allDue = S.dueAll().length, g = (st().goal && st().goal.xp) || 20, x = S.xpToday();
    const tile = (href, icon, label, value, cls, title) => '<a class="qtile' + (cls ? ' ' + cls : '') + '" href="' + href + '" title="' + esc(title || label) + '">' + ic(icon) + '<strong>' + esc(String(value)) + '</strong><span>' + esc(label) + '</span></a>';
    html += '<nav class="qgrid" aria-label="Your learning">' +
      tile('#/recall', 'refresh', 'Recall', due.length, due.length ? 'is-hot' : '', due.length ? due.length + ' phrases ready, in new scenes with new people' : 'Recall is clear. Next: ' + nextDueLabel()) +
      tile('#/review', 'list', 'All due', allDue, '', allDue + ' due across courses') +
      tile(lesson ? '#/listen/' + lesson.l.id : '#/audio', 'audio', 'Listen', lesson ? Math.round(100 * (listen[1].pos || 0) / Math.max(1, (lesson.l.segs || []).length)) + '%' : '▶', '', lesson ? 'Continue “' + lesson.l.title + '”' : 'Audio courses') +
      tile('#/talk', 'cup', 'Talk', LQ.ai.on() ? 'AI' : '', '', LQ.ai.on() ? 'Free conversation, live AI' : 'Free conversation, rules mode') + '</nav>';
    html += '<section class="rhythm" aria-label="This week">' +
      (st().streakPaused ? '<p class="muted small">' + ic('pausecircle', 'ic--xs') + ' Streak paused</p>' :
        '<ol class="week" aria-label="Practice this week">' + week.map(d => '<li class="' + (d.xp ? 'is-on' : '') + (d.today ? ' is-today' : '') + (d.future ? ' is-future' : '') + '"><span class="week__d">' + S.fmtDay(d.d, { weekday: 'narrow' }) + '</span><span class="week__dot" aria-label="' + S.fmtDay(d.d, { weekday: 'long' }) + ': ' + (d.xp ? d.xp + ' XP' : d.future ? 'upcoming' : 'rest') + '"></span></li>').join('') + '</ol>') +
      '<a class="goal-today" href="#/progress" title="' + esc(active + ' active days this week. XP counts effort, not fluency. Change the goal in Settings.') + '"><span class="small"><strong>' + x + '/' + g + ' XP</strong></span><span class="meter" aria-hidden="true"><span style="width:' + Math.min(100, Math.round(100 * x / g)) + '%"></span></span></a></section>';
    if (mem) { const c = LQ.CHARACTERS[mem[0]]; html += '<a class="story" href="#/speak/locals/' + mem[0] + '" title="' + esc(U.L(mem[1][mem[1].length - 1], src)) + '">' + A.portrait(mem[0], 'listening', { size: 36 }) + '<span><strong>' + esc(c.name.split(' ')[0]) + ' remembers</strong></span>' + ic('chevron', 'ic--sm') + '</a>'; }
    html += '</main>';
    return html;
  };
  function nextDueLabel() { const up = Object.values(S.prog().expressions).sort((a, b) => a.due < b.due ? -1 : 1)[0]; return up ? S.fmtDay(up.due) : 'finish a mission to start'; }

  /* ── Missions: illustrated path with a linear list alternative ── */
  V.missions = () => {
    const t = S.track(), e = S.enr(), src = e.source, mode = LQ.ui.pathMode || 'path';
    const ms = LQ.missionsFor(t.id);
    const chapters = [];
    ms.forEach(m => { let c = chapters.find(x => x.n === m.chapter.n); if (!c) { c = { n: m.chapter.n, title: m.chapter, items: [] }; chapters.push(c); } c.items.push(m); });
    chapters.sort((a, b) => a.n - b.n);
    const next = S.nextMission();
    const statusOf = m => {
      if (m.status === 'preview') return { k: 'preview', label: 'In production' };
      if (m.region && e.region && m.region !== e.region) return { k: 'region', label: 'Other region' };
      const ms_ = S.prog().missions[m.id] || {};
      if (ms_.draft) return { k: 'paused', label: 'Paused' };
      if (ms_.status === 'done') return { k: 'done', label: 'Done' };
      if (next && next.id === m.id) return { k: 'next', label: 'Up next' };
      return { k: 'open', label: 'Open' };
    };
    /* Status as an icon (the word is the tooltip and accessible name); only "Next" keeps a word. */
    const ST_IC = { done: 'check', next: 'play', open: 'chevron', preview: 'wand', region: 'globe', paused: 'pausecircle' };
    const stTag = s => s.k === 'next' ? '<span class="tag tag--next" title="' + esc(s.label) + '">' + ic('play', 'ic--xs') + 'Next</span>' : '<span class="tag tag--' + s.k + ' tag--ic" role="img" aria-label="' + esc(s.label) + '" title="' + esc(s.label) + '">' + ic(ST_IC[s.k] || 'info', 'ic--xs') + '</span>';
    const reg = t.regions && e.region ? t.regions.find(r => r.id === e.region) : null, city = reg && /\(([^)]+)\)/.test(reg.label) ? reg.label.match(/\(([^)]+)\)/)[1] : t.city;
    let html = V.header() + '<main class="missions" id="main"><div class="pagehead"><h1 class="h2">' + esc(city) + ' ' + U.info('Each stop is a real situation. Every mission is open to you; the path only suggests an order. Map art is illustrative, not geography. Full release plans about 40 missions per course.', 'About the mission path') + '</h1>' +
      '<div class="seg seg--mini" role="group" aria-label="View"><button class="segbtn' + (mode === 'path' ? ' is-on' : '') + '" aria-pressed="' + (mode === 'path') + '" data-act="path-mode" data-arg="path" aria-label="Path view" title="Path view">' + ic('route', 'ic--sm') + '</button><button class="segbtn' + (mode === 'list' ? ' is-on' : '') + '" aria-pressed="' + (mode === 'list') + '" data-act="path-mode" data-arg="list" aria-label="List view" title="List view">' + ic('list', 'ic--sm') + '</button></div></div>' +
      '';
    if (t.regions && LQ.MISSIONS.some(m => m.track === t.id && m.region)) html += '<a class="chiplink" href="#/course/' + t.id + '" title="Your regional variety. Change it in course settings.">' + ic('globe', 'ic--xs') + esc(t.regions.find(r => r.id === e.region).label) + '</a>';
    chapters.forEach(c => {
      html += '<section class="chapter"><h2 class="chapter__title">' + (c.n ? '<span class="chapter__n" title="Chapter ' + c.n + '">' + c.n + '</span> ' : '') + esc(U.L(c.title, src)) + '</h2>';
      if (mode === 'path') {
        const ROW = 124, H = c.items.length * ROW;
        const pts = c.items.map((m, i) => [i % 2 ? 80 : 20, i * ROW + 56]);
        const d = pts.map((p, i) => i === 0 ? 'M' + p[0] + ' ' + p[1] : 'C' + pts[i - 1][0] + ' ' + (pts[i - 1][1] + ROW / 2) + ' ' + p[0] + ' ' + (p[1] - ROW / 2) + ' ' + p[0] + ' ' + p[1]).join(' ');
        html += '<div class="path" style="height:' + H + 'px"><svg class="path__line" viewBox="0 0 100 ' + H + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '" vector-effect="non-scaling-stroke"/></svg><ol role="list">' + c.items.map((m, i) => {
          const s = statusOf(m);
          return '<li class="stop stop--' + s.k + (i % 2 ? ' stop--r' : '') + '" style="top:' + (i * ROW) + 'px"><a class="stop__medal" href="#/mission/' + m.id + '" aria-label="' + esc(U.L(m.title, src) + ', ' + s.label + ', ' + m.minutes + ' minutes') + '">' + A.scene(m.scene, { palette: A.plazaPalette(t) }) + (s.k === 'done' ? '<span class="stop__badge">' + ic('check', 'ic--xs') + '</span>' : '') + '</a>' +
            '<div class="stop__card" title="' + esc(s.label + ' · ' + m.minutes + ' min. ' + U.L(m.focus, src)) + '">' + stTag(s) + '<strong>' + esc(U.L(m.title, src)) + '</strong></div></li>';
        }).join('') + '</ol></div>';
      } else {
        html += '<ul class="mlist" role="list">' + c.items.map(m => { const s = statusOf(m); return '<li><a class="mrow" href="#/mission/' + m.id + '"><span class="mrow__thumb">' + A.scene(m.scene, { palette: A.plazaPalette(t) }) + '</span><span class="mrow__main"><strong>' + esc(U.L(m.title, src)) + '</strong><span class="muted small">' + m.minutes + ' min</span></span>' + stTag(s) + '</a></li>'; }).join('') + '</ul>';
      }
      html += '</section>';
    });
    html += '</main>';
    return html;
  };

  /* ── Mission detail (8-minute template, skills, honest availability) ── */
  V.mission = (mid) => {
    const m = LQ.missionById(mid); if (!m) return V.notFound();
    const t = LQ.trackById(m.track), e = S.enr(m.track), src = e ? e.source : 'en';
    const ch = m.character ? LQ.CHARACTERS[m.character] : null;
    const cov = U.coverage(m, src);
    const vs = U.voiceStatus(t, e);
    let html = V.header() + '<main class="mdetail" id="main"><a class="backlink" href="#/missions" aria-label="Back to missions">' + ic('back', 'ic--sm') + '</a>' +
      '<figure class="mdetail__art">' + A.scene(m.scene, { palette: A.plazaPalette(t) }) + '<figcaption class="sr-only">' + esc(A.sceneAlt(m.scene)) + '</figcaption></figure>' +
      '<h1 class="h2">' + esc(U.L(m.title, src)) + '</h1>' +
      '<p class="chips-line">' + '<span class="mchip" title="Length">' + ic('clock', 'ic--xs') + m.minutes + ' min</span>' + (ch ? '<span class="mchip" title="' + esc(ch.name + ', ' + U.L(ch.role, src) + '. Speaks ' + ch.variety + '.') + '">' + A.portrait(m.character, 'neutral', { size: 20 }) + esc(ch.name.split(' ')[0]) + '</span>' : m.local ? '<span class="mchip">' + ic('user', 'ic--xs') + esc(m.local.name) + '</span>' : '') + '<span class="mchip" title="' + esc(vs.text) + '">' + ic(vs.icon, 'ic--xs') + esc(vs.label) + '</span><span class="mchip mchip--honest" title="Phrases written for this demo, awaiting native review.">' + ic('shield', 'ic--xs') + 'Demo-authored</span></p>';
    if (m.status === 'preview') {
      html += '<div class="callout callout--wait">' + U.mascot('thinking', 44) + '<div><strong>In production</strong>' + U.info(U.L(m.previewNote, src), 'Why it is not playable yet') + '</div></div><a class="btn btn--ghost btn--block" href="#/missions">Back to missions</a></main>';
      return html;
    }
    if (m.region && e && e.region && m.region !== e.region) {
      const r = t.regions.find(x => x.id === m.region);
      html += '<div class="callout">' + ic('globe') + '<div><strong>' + esc(r.label) + ' French</strong> ' + U.info('Your course is set to ' + t.regions.find(x => x.id === e.region).label + '. Switch your regional variety to play it; your progress is kept.', 'About regional varieties') + '<button class="btn btn--ghost btn--sm" data-act="set-region" data-arg="' + m.track + '|' + m.region + '">Switch to ' + esc(r.label) + '</button></div></div>';
    }
    html += '<a class="btn btn--primary btn--lg btn--block" href="#/play/' + m.id + '">' + ic('mic') + 'Start mission</a>';
    const phases = m.firstWords ? [['ear', 'Listen', 'about 1 min'], ['mic', 'Hear and say', 'about 1 min'], ['bulb', 'Anticipate and compare', 'about 1 min']]
      : [['ear', 'Listen to the scene', 'about 1 min'], ['mic', 'Hear and say key phrases', 'about 1.5 min'], ['bulb', 'Anticipate, then compare', 'about 1.5 min'], ['cup', 'Talk with ' + (ch ? ch.name.split(' ')[0] : 'a local'), 'about 3 min'], ['check', 'Feedback and recall plan', 'about 1 min']];
    html += '<details class="more"><summary>' + ic('list', 'ic--sm') + 'Details</summary><p class="small">' + esc(U.L(m.outcome, src)) + '</p>' +
      '<h2 class="h4">How it goes</h2><ol class="phases">' + phases.map((p, i) => '<li><span class="phases__n">' + (i + 1) + '</span>' + ic(p[0], 'ic--sm') + '<span>' + esc(p[1]) + '</span><span class="muted small">' + esc(p[2]) + '</span></li>').join('') + '</ol>' +
      '<h2 class="h4">Skills you’ll show</h2><ul class="skillrow" role="list">' + m.skills.map(k => '<li><span>' + esc(LQ.SKILLS[k].en) + '</span>' + U.stateChip(S.skillState(m.track, k)) + '</li>').join('') + '</ul>' +
      '<ul class="facts" role="list"><li>' + ic(vs.icon, 'ic--sm') + '<span>' + esc(vs.text) + '</span></li>' +
      '<li>' + ic('translate', 'ic--sm') + '<span>' + (cov ? 'Instructions in ' + esc(S.srcName(src)) + ' (written for this demo).' : 'Instructions aren’t written in ' + esc(S.srcName(src)) + ' yet. You’ll be asked before English is shown.') + '</span></li>' +
      (m.factory ? (function () { const d = (S.state.studio.drafts || []).find(x => x.id === m.draftId) || {}; return '<li>' + ic('layers', 'ic--sm') + '<span>Made in the content studio from the “' + esc(LQ.TEMPLATE_INFO[m.template].label) + '” template' + (d.provenance && d.provenance.source === 'live-ai' ? ', first drafted with live AI and then edited' : '') + '. ' + esc(d.reviewedBy ? 'Approved by ' + d.reviewedBy + '.' : '') + '</span></li>'; })() : m.templated ? '<li>' + ic('layers', 'ic--sm') + '<span>Built by the template engine from the ' + esc(t.name) + ' phrase pack, like every course’s first path.</span></li>' : '') +
      '<li>' + ic('shield', 'ic--sm') + '<span>Phrases written for this demo, awaiting native review.</span></li></ul></details></main>';
    return html;
  };

  /* ── Courses: enrollments + full catalog ── */
  V.courses = () => {
    const ens = Object.entries(st().enrollments).filter(([k, v]) => v.status === 'active');
    return V.header(true) + '<main class="courses" id="main"><h1 class="h2">Courses</h1>' +
      '<ul class="enrolls" role="list" aria-label="Your courses">' + ens.map(([tid, en]) => { const t = LQ.trackById(tid); return '<li class="enroll' + (tid === st().active ? ' is-active' : '') + '">' + U.trackBadge(t, 'tbadge--lg') + '<span class="enroll__main"><strong>' + esc(t.name) + '</strong><span class="muted small" title="' + esc('From ' + S.srcName(en.source) + (en.region && t.regions ? ', ' + t.regions.find(r => r.id === en.region).label : '')) + '">' + esc(String(en.source).toUpperCase()) + '</span></span>' +
        (tid === st().active ? '<span class="tag tag--ok tag--ic" role="img" aria-label="Active course" title="Active course">' + ic('check', 'ic--xs') + '</span>' : '<button class="iconbtn" data-act="switch-course" data-arg="' + tid + '" aria-label="Switch to ' + esc(t.name) + '" title="Switch to ' + esc(t.name) + '">' + ic('refresh', 'ic--sm') + '</button>') + '<a class="iconbtn" href="#/course/' + tid + '" aria-label="Edit ' + esc(t.name) + ' settings" title="Course settings">' + ic('edit', 'ic--sm') + '</a></li>'; }).join('') + '</ul>' +
      '<h2 class="h4">All 30</h2>' + V.catalogList() + '</main>';
  };
  V.course = (tid) => {
    const t = LQ.trackById(tid); if (!t) return V.notFound();
    const en = st().enrollments[tid];
    const cur = en ? en : { source: V.defaultSourceFor(t), region: t.regions ? t.regions[0].id : null, script: t.scriptModes ? 'both' : null };
    const vs = U.voiceStatus(t, cur);
    const as = LQ.ASSESS[t.assess];
    const ms = LQ.missionsFor(tid);
    return V.header() + '<main class="course" id="main"><a class="backlink" href="#/courses">' + ic('back', 'ic--sm') + ' Courses</a>' +
      '<div class="confirm-hero">' + U.trackBadge(t, 'tbadge--xl') + '<div><h1 class="h2">' + esc(t.name) + '</h1><p class="muted small" title="Internal variety ID: ' + esc(t.internal) + '">' + esc(t.variety) + ' · ' + esc(LQ.SCRIPT_NAMES[t.script]) + '</p></div></div>' +
      (t.note ? U.info(t.note, 'About this course') : '') +
      '<div class="sample"><span class="sample__t" lang="' + esc(t.tts[0]) + '" dir="' + (t.rtl ? 'rtl' : 'ltr') + '">' + esc(t.hello.t) + '</span>' + (t.hello.r ? '<span class="muted">' + esc(t.hello.r) + '</span>' : '') + '<button class="iconbtn" data-act="sample-voice" data-arg="' + tid + '" aria-label="Hear a sample" title="Hear a sample">' + ic('volume', 'ic--sm') + '</button>' + (en ? U.voiceChip(t, cur) : '') + '</div>' +
      '<p class="chips-line"><span class="mchip" title="' + esc(vs.text) + '">' + ic(vs.icon, 'ic--xs') + esc(vs.label) + '</span><span class="mchip" title="' + esc(as.detail) + '">' + ic('mic', 'ic--xs') + 'No scorer</span><span class="mchip" title="' + esc(ms.filter(m => m.status === 'playable').length + ' playable in this demo, ' + ms.filter(m => m.status === 'preview').length + ' in production.') + '">' + ic('path', 'ic--xs') + ms.filter(m => m.status === 'playable').length + ' missions</span></p>' +
      '<form class="stack" data-submit="course-save" data-arg="' + tid + '"><h2 class="h4">' + (en ? 'Course settings' : 'Enroll') + '</h2>' + V.courseOptions(t, cur) +
      (vs.near && !cur.voiceNear ? '<label class="check"><input type="checkbox" name="voiceNear"><span>Use the nearby ' + esc(vs.near) + ' voice for reference audio, knowing it’s a different regional accent.</span></label>' : '') +
      (en ? '<p class="small muted">' + ic('shield', 'ic--xs') + ' Progress kept ' + U.info('Changing the instruction language re-renders hints and translations. Your skills, recall schedule, bookmarks and story stay as they are.', 'What changing settings keeps') + '</p>' : '') +
      '<button class="btn btn--primary btn--lg btn--block" type="submit">' + (en ? 'Save course settings' : 'Enroll and start') + '</button></form>' +
      (en && tid !== st().active ? '<button class="btn btn--ghost btn--block" data-act="switch-course" data-arg="' + tid + '">Make this my active course</button>' : '') +
      (en && Object.values(st().enrollments).filter(x => x.status === 'active').length > 1 ? '<button class="btn btn--quiet btn--block" data-act="archive-course" data-arg="' + tid + '">Archive this course (keeps progress)</button>' : '') + '</main>';
  };

  /* ── Settings / profile ── */
  V.settings = () => {
    const s = st().settings, tog = (k, on, label, hint) => '<label class="switch"' + (hint ? ' title="' + esc(hint) + '"' : '') + '><span><strong>' + esc(label) + '</strong></span><input type="checkbox" role="switch" data-change="setting" data-arg="' + k + '"' + (on ? ' checked' : '') + (hint ? ' title="' + esc(hint) + '"' : '') + '></label>';
    return V.header() + '<main class="settings" id="main"><h1 class="h2">Settings</h1>' +
      '<form class="stack" data-submit="profile-save"><label class="field"><span>Name</span><input name="name" type="text" maxlength="24" value="' + esc(st().learner.name) + '"></label>' +
      '<label class="field"><span>Default “learn from” language</span><select name="defaultSource">' + LQ.SOURCES.map(x => '<option value="' + x.code + '"' + (x.code === st().defaultSource ? ' selected' : '') + '>' + esc(x.native) + '</option>').join('') + '</select></label>' +
      '<p class="small muted">' + U.info('This only pre-fills new enrollments. Existing courses keep their own instruction language.', 'About the default language') + '</p><button class="btn btn--sm" type="submit">Save</button></form>' +
      V.profilesSection() +
      '<h2 class="h4">Comfort</h2><div class="stack-sm">' + tog('mascot', s.mascot, 'Show Orbit', 'Learning works the same without the mascot.') + tog('motion', s.motion, 'Animations', 'Also follows your system’s reduced-motion setting.') +
      tog('readingFont', s.readingFont === 'lexend', 'Lexend font', 'Wider letterforms for easier reading.') +
      '<fieldset class="field"><legend>Text size</legend><div class="seg">' + [100, 115, 130].map(v => '<label class="segopt"><input type="radio" name="ts" data-change="textsize" value="' + v + '"' + (s.textSize === v ? ' checked' : '') + '><span>' + v + '%</span></label>').join('') + '</div></fieldset>' +
      '<fieldset class="field"><legend>Theme</legend><div class="seg">' + [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(v => '<label class="segopt"><input type="radio" name="theme" data-change="theme" value="' + v[0] + '"' + (s.theme === v[0] ? ' checked' : '') + '><span>' + v[1] + '</span></label>').join('') + '</div></fieldset>' +
      '<fieldset class="field"><legend>Help during conversations</legend><div class="seg seg--wrap">' + [['visible', 'Keep help visible'], ['fade', 'Fade as I improve'], ['ask', 'Only when I ask']].map(v => '<label class="segopt"><input type="radio" name="help" data-change="help" value="' + v[0] + '"' + (s.help === v[0] ? ' checked' : '') + '><span>' + v[1] + '</span></label>').join('') + '</div></fieldset></div>' +
      '<h2 class="h4">Habits</h2><div class="stack-sm"><label class="field"><span>Daily goal for ' + esc(st().learner.name || 'this learner') + '</span><select data-change="goal">' + [10, 20, 40].map(g => '<option value="' + g + '"' + (((st().goal || {}).xp || 20) === g ? ' selected' : '') + '>' + g + ' XP a day' + (g === 10 ? ' (light)' : g === 40 ? ' (keen)' : '') + '</option>').join('') + '</select></label>' + tog('streakPaused', st().streakPaused, 'Pause my streak', 'No reminders about it and nothing is lost. Turn back on any time.') +
      tog('rem-due', s.reminders.due, 'Remind me when phrases are due', 'At 18:00 in the in-app inbox (demo clock), never in quiet hours ' + s.reminders.quiet + ' or while the streak is paused.') + tog('rem-audio', s.reminders.audio, 'Remind me to continue listening', '') + '</div>' +
      '<details class="more"><summary>' + ic('shield', 'ic--sm') + 'Privacy</summary><ul class="facts" role="list"><li>' + ic('mic', 'ic--sm') + '<span>Recordings stay in this tab’s memory and are deleted when you leave the screen. Nothing is uploaded.</span></li><li>' + ic('shield', 'ic--sm') + '<span>Browser speech recognition may send audio to your browser vendor’s service. LangQuest shows a notice before you use it.</span></li><li>' + ic('sparkle', 'ic--sm') + '<span>Neural voices (when the owner enables Gemini on the API monitor) send the phrase text, never your audio, to Google. Clips are cached on this device.</span></li><li>' + ic('cpu', 'ic--sm') + '<span>' + (LQ.ai.on() ? 'Live AI is on with your key: the text being checked, and free-talk messages, go to the Anthropic API and are billed to that key. No audio is sent.' : 'Live AI is off. If the owner adds a key on the API monitor, typed or recognised text (never audio) goes to the Anthropic API, metered and billed to that key.') + '</span></li></ul></details>' +
      '<div class="stack-sm"><button class="btn btn--ghost btn--block" data-act="export-data">' + ic('download', 'ic--sm') + 'Export my data (JSON)</button><button class="btn btn--ghost btn--block" data-act="lab-open">' + ic('sliders', 'ic--sm') + 'Open the Test lab</button><button class="btn btn--quiet btn--block" data-act="reset-demo">Reset demo</button></div>' +
      '<p class="fineprint">' + ic('check', 'ic--xs') + ' Free for every learner</p></main>';
  };

  V.notFound = () => V.header() + '<main class="empty-page" id="main">' + A.orbit('curious', { size: 96 }) + '<h1 class="h3">That page isn’t here</h1><p class="muted">The link may be from an older version of the demo.</p><a class="btn btn--primary" href="#/home">Go home</a></main>';

  /* ── Sheets ── */
  V.switcherSheet = () => {
    const ens = Object.entries(st().enrollments).filter(([k, v]) => v.status === 'active');
    return '<h2 class="h3" id="sheet-title">Your courses</h2><ul class="enrolls" role="list">' + ens.map(([tid, en]) => { const t = LQ.trackById(tid); return '<li class="enroll' + (tid === st().active ? ' is-active' : '') + '">' + U.trackBadge(t, 'tbadge--lg') + '<span class="enroll__main"><strong>' + esc(t.name) + '</strong><span class="muted small">from ' + esc(S.srcName(en.source)) + '</span></span>' + (tid === st().active ? '<span class="tag tag--ok">Active</span>' : '<button class="btn btn--sm" data-act="switch-course" data-arg="' + tid + '">Switch</button>') + '<a class="iconbtn" href="#/course/' + tid + '" data-act="sheet-close-nav" aria-label="Edit ' + esc(t.name) + '">' + ic('edit', 'ic--sm') + '</a></li>'; }).join('') + '</ul>' +
      '<a class="btn btn--ghost btn--block" href="#/courses" data-act="sheet-close-nav">' + ic('plus', 'ic--sm') + 'Add a course (30 available)</a><button class="btn btn--quiet btn--block" data-act="sheet-close">Close</button>';
  };
  /* Demo tools, one list for the desktop Demo menu and the phone's Demo sheet. */
  V.demoItems = () => {
    const ai = LQ.ai.state(), g = LQ.voice.geminiGate(), tts = LQ.speech.ttsGate();
    const row = (inner) => '<li>' + inner + '</li>';
    return '<ul class="dmenu" role="list">' +
      row('<button class="dmenu__b" data-act="tour-start">' + ic('sparkle', 'ic--sm') + '<span>Guided tour</span></button>') +
      row('<button class="dmenu__b" data-act="lab-open">' + ic('sliders', 'ic--sm') + '<span>Test lab</span></button>') +
      row('<a class="dmenu__b" href="#/studio" data-act="sheet-close-nav">' + ic('layers', 'ic--sm') + '<span>Content studio</span></a>') +
      row('<a class="dmenu__b" href="' + LQ.ai.MONITOR + '" title="' + esc('Keys, budgets and killswitches live on the hub’s API monitor. ' + ai.label + '. Neural voice: ' + (g.ok ? 'on' : g.reason) + '. Browser voices: ' + (tts.ok ? 'on' : tts.reason) + '.') + '">' + ic('cpu', 'ic--sm') + '<span>API monitor</span><span class="dmenu__st"><span class="dot dot--' + ai.k + '" title="' + esc(ai.label) + '"></span><span class="dot dot--' + (g.ok ? 'on' : 'off') + '" title="' + esc('Neural voice: ' + (g.ok ? 'on' : g.reason)) + '"></span></span></a>') +
      row('<button class="dmenu__b" data-act="reset-demo">' + ic('refresh', 'ic--sm') + '<span>Reset demo</span></button>') +
      row('<a class="dmenu__b" href="../../index.html">' + ic('back', 'ic--sm') + '<span>All demos</span></a>') +
      '</ul><p class="dmenu__foot">' + ic('flask', 'ic--xs') + ' Demo · fictional data</p>';
  };
  V.demoSheet = () => '<h2 class="h3" id="sheet-title">Demo</h2>' + V.demoItems() + '<button class="btn btn--quiet btn--block" data-act="sheet-close">Close</button>';

  /* Per-course voice picker: which tier speaks, the neural toggle, and the ranked device voices. */
  V.voicePicker = (tid) => {
    const t = LQ.trackById(tid); if (!t) return '';
    const e = S.enr(tid), enr = e || {}, tier = LQ.voice.tierFor(t, enr), pol = LQ.voice.policy(t, enr.region), g = LQ.voice.geminiGate();
    const v = U.voiceFor(t, enr), ranked = LQ.speech.rankVoices(v.locales, v);
    const q = x => /natural|neural|online|premium|enhanced|siri|google/i.test(x.voice.name) ? 'Natural' : /espeak|mbrola|festival/i.test(x.voice.name) ? 'Robotic' : 'Standard';
    const clips = Object.values(window.LQ_AUDIO || {}).filter(c => c && c.c === LQ.voice.clipCourse(t, enr.region)).length;
    let h = '<h2 class="h3" id="sheet-title">' + ic('volume', 'ic--sm') + ' ' + esc(t.name) + '</h2>' +
      '<ul class="tiers" role="list">' +
      '<li class="' + (tier.tier === 'clip' ? 'is-on' : '') + '">' + ic('film', 'ic--sm') + '<span>Studio clips</span><span class="small muted">' + (clips ? clips : '0') + '</span></li>' +
      '<li class="' + (tier.tier === 'gemini' ? 'is-on' : '') + '" title="' + esc(!pol.gemini ? pol.why : g.ok ? 'Gemini TTS through the API monitor, cached after the first play.' : g.reason) + '">' + ic('sparkle', 'ic--sm') + '<span>Neural voice</span><span class="small muted">' + (!pol.gemini ? 'Off for this variety' : g.ok ? (enr.neural === false ? 'Off' : 'On') : 'Paused') + '</span></li>' +
      '<li class="' + (tier.tier === 'device' ? 'is-on' : '') + '">' + ic('volume', 'ic--sm') + '<span>Device voice</span><span class="small muted">' + ranked.length + '</span></li>' +
      '<li class="' + (tier.tier === 'text' ? 'is-on' : '') + '">' + ic('text', 'ic--sm') + '<span>Text</span></li></ul>' +
      '<p class="small">' + ic(tier.icon, 'ic--xs') + ' <strong>' + esc(tier.label) + '</strong> ' + U.info(tier.why, 'Why this voice') + '</p>';
    if (!e) return h + '<p class="small muted">Enroll to choose a voice.</p><button class="btn btn--quiet btn--block" data-act="sheet-close">Close</button>';
    if (pol.gemini) h += '<label class="switch" title="Uses your Gemini key on the API monitor; each phrase is paid for once, then cached."><span><strong>Neural voice</strong></span><input type="checkbox" role="switch" data-change="voice-neural" data-arg="' + tid + '"' + (enr.neural !== false ? ' checked' : '') + '></label>';
    h += '<fieldset class="field"><legend>Device voice</legend><div class="vlist">' +
      '<label class="vopt"><input type="radio" name="vp-' + tid + '" value="" data-change="voice-pick" data-arg="' + tid + '"' + (!enr.voiceURI ? ' checked' : '') + '><span>Automatic' + (ranked[0] ? ' <span class="muted small">(' + esc(ranked[0].voice.name) + ')</span>' : '') + '</span></label>' +
      ranked.slice(0, 8).map(x => '<label class="vopt"><input type="radio" name="vp-' + tid + '" value="' + esc(x.voice.voiceURI || x.voice.name) + '" data-change="voice-pick" data-arg="' + tid + '"' + (enr.voiceURI && (enr.voiceURI === x.voice.voiceURI || enr.voiceURI === x.voice.name) ? ' checked' : '') + '><span>' + esc(x.voice.name) + ' <span class="tag' + (q(x) === 'Natural' ? ' tag--ok' : q(x) === 'Robotic' ? ' tag--warn' : '') + '">' + q(x) + '</span></span><button type="button" class="iconbtn" data-act="voice-sample" data-arg="' + esc(tid + '|' + (x.voice.voiceURI || x.voice.name)) + '" aria-label="Hear ' + esc(x.voice.name) + '" title="Hear it">' + ic('play', 'ic--xs') + '</button></label>').join('') +
      (ranked.length ? '' : '<p class="small muted">' + ic('text', 'ic--xs') + ' No ' + esc(v.locales[0]) + ' voice on this device.</p>') + '</div></fieldset>' +
      '<button class="btn btn--quiet btn--block" data-act="sheet-close">Close</button>';
    return h;
  };
})();
