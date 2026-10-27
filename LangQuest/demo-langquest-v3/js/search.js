/* LangQuest V3 — global search (Ctrl/Cmd-K or the Search buttons). One index over courses,
   missions in all 30 courses, your phrases, characters, audio lessons, studio assets and
   drafts, and every screen. Arrow keys move, Enter opens, Escape closes. */
'use strict';
(function () {
  const U = LQ.ui, S = LQ.store, esc = U.esc, ic = U.icon;
  const SR = LQ.search = { open: false, q: '', idx: 0, results: [], ret: null };
  const SCREENS = [['Home', '#/home'], ['Missions', '#/missions'], ['Notebook: saved and custom phrases', '#/notebook'], ['Review queue, all courses', '#/review'], ['Inbox', '#/inbox'], ['Audio courses', '#/audio'], ['Speak', '#/speak'], ['Free conversation', '#/talk'], ['Pronunciation coach', '#/speak/coach'], ['Passport and progress', '#/progress'], ['Courses (all 30)', '#/courses'], ['Settings and learners on this device', '#/settings'],
    ['Studio overview', '#/studio'], ['Studio library and uploads', '#/studio/library'], ['Studio review queue', '#/studio/review'], ['Rights and licensing', '#/studio/rights'], ['Content factory', '#/studio/factory'], ['AI routing', '#/studio/models'], ['Speech capabilities', '#/studio/capabilities'], ['Audit log', '#/studio/audit'], ['Mascot and art', '#/studio/brand']];
  const ORDER = ['Screen', 'Demo', 'Course', 'Mission', 'Phrase', 'Character', 'Audio', 'Draft', 'Asset', 'Inbox'];
  function build() {
    const out = [], src = (S.state && S.state.defaultSource) || 'en';
    SCREENS.forEach(([t, h]) => out.push({ type: 'Screen', title: t, href: h }));
    out.push({ type: 'Demo', title: 'Open the Test lab', sub: 'Scenarios, clock, events, capabilities, live AI', act: 'lab' }, { type: 'Demo', title: 'Start the guided tour', act: 'tour' });
    LQ.TRACKS.forEach(t => {
      out.push({ type: 'Course', title: t.name, sub: t.variety + ', ' + t.city + ' · ' + t.hello.t + (t.hello.r ? ' (' + t.hello.r + ')' : ''), href: '#/course/' + t.id, extra: t.id + ' ' + (t.note || '') });
      LQ.missionsFor(t.id).forEach(m => out.push({ type: 'Mission', title: U.L(m.title, S.enr(t.id) ? S.source(t.id) : 'en'), sub: t.name + (m.status !== 'playable' ? ' · in production' : m.factory ? ' · from the studio' : m.templated ? ' · template mission' : '') , href: '#/mission/' + m.id, extra: U.L(m.outcome, 'en') + ' ' + (m.local ? m.local.name : '') }));
    });
    if (LQ.notebook) LQ.notebook.items().forEach(x => out.push({ type: 'Phrase', title: U.nm(x.e.t), sub: LQ.trackById(x.tid).name + ' · ' + U.nm(U.L(x.e.m, S.source(x.tid))), href: '#/notebook', tid: x.tid, extra: x.e.r || '' }));
    Object.entries(LQ.CHARACTERS).forEach(([k, c]) => out.push({ type: 'Character', title: c.name, sub: U.L(c.role, src) + ', ' + LQ.trackById(c.track).name, href: '#/speak/locals/' + k }));
    LQ.audioCollections().forEach(c => c.chapters.forEach(ch => ch.lessons.forEach(l => out.push({ type: 'Audio', title: l.title, sub: c.title + ' · ' + LQ.trackById(c.track).name + (l.speakers ? ' · ' + l.speakers : ''), href: '#/listen/' + l.id }))));
    const sd = S.state.studio;
    sd.drafts.forEach(d => out.push({ type: 'Draft', title: d.title, sub: d.id + ' · ' + (LQ.trackById(d.track) || { name: d.track }).name + ' · ' + (LQ.factory.STATUS[d.status] || d.status), href: d.kind === 'template' ? '#/studio/draft/' + d.id : '#/studio/factory', extra: d.id }));
    sd.assets.forEach(a => out.push({ type: 'Asset', title: a.title || a.id, sub: a.id + ' · ' + (LQ.studio.STATUS[LQ.studio.statusOf(a)] || '') + (a.speaker ? ' · ' + a.speaker : ''), href: '#/studio/asset/' + a.id, extra: a.id + ' ' + a.path }));
    S.inboxFor().slice(0, 20).forEach(n => out.push({ type: 'Inbox', title: n.title, sub: S.fmtDay(n.at.slice(0, 10)), href: '#/inbox' }));
    return out;
  }
  SR.query = (q) => {
    const all = build(), n = LQ.match.norm(q).trim();
    if (!n) return all.filter(x => x.type === 'Screen' || x.type === 'Demo').slice(0, 14);
    const words = n.split(' ').filter(Boolean);
    const scored = [];
    all.forEach(x => {
      const title = LQ.match.norm(x.title), hay = title + ' ' + LQ.match.norm((x.sub || '') + ' ' + (x.extra || '') + ' ' + x.type);
      if (!words.every(w => hay.includes(w))) return;
      const score = (title.trim().startsWith(words[0]) ? 0 : title.includes(words[0]) ? 1 : 2) * 10 + ORDER.indexOf(x.type);
      scored.push({ x, score });
    });
    return scored.sort((a, b) => a.score - b.score).slice(0, 40).map(s => s.x);
  };
  SR.show = () => {
    if (SR.open) { const i = document.getElementById('sr-q'); if (i) i.focus(); return; }
    SR.open = true; SR.ret = document.activeElement; SR.q = ''; SR.idx = 0;
    document.body.classList.add('search-open');
    const host = document.getElementById('search-host');
    host.innerHTML = '<div class="search-ov" data-act="search-close"></div><div class="search-dlg" role="dialog" aria-modal="true" aria-label="Search LangQuest"><div class="search-bar">' + ic('search', 'ic--sm') +
      '<input id="sr-q" type="search" role="combobox" aria-expanded="true" aria-controls="sr-list" aria-autocomplete="list" autocomplete="off" placeholder="Search courses, missions, phrases, studio…" aria-label="Search">' +
      '<button class="btn btn--sm btn--quiet" data-act="search-close">Esc</button></div><ul id="sr-list" role="listbox" aria-label="Results"></ul><p class="search-foot small muted"><kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open, <kbd>Esc</kbd> to close. Searches all 30 courses.</p></div>';
    ['stage', 'studio-root', 'lab'].forEach(id => { const el = document.getElementById(id); if (el) el.inert = true; });
    const inp = document.getElementById('sr-q');
    inp.addEventListener('input', () => { SR.q = inp.value; SR.idx = 0; paint(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); SR.idx = Math.min(SR.results.length - 1, SR.idx + 1); paint(true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); SR.idx = Math.max(0, SR.idx - 1); paint(true); }
      else if (e.key === 'Enter') { e.preventDefault(); SR.go(SR.idx); }
      else if (e.key === 'Escape') { e.preventDefault(); SR.hide(); }
    });
    paint(); inp.focus();
  };
  function paint(moveOnly) {
    const list = document.getElementById('sr-list'), inp = document.getElementById('sr-q'); if (!list) return;
    if (!moveOnly) {
      SR.results = SR.query(SR.q);
      let last = null;
      list.innerHTML = SR.results.length ? SR.results.map((x, i) => { const head = x.type !== last ? '<li class="sr-group" role="presentation">' + esc(x.type === 'Screen' ? (SR.q ? 'Screens' : 'Jump to') : x.type + 's') + '</li>' : ''; last = x.type; return head + '<li id="sr-opt-' + i + '" role="option" class="sr-opt" aria-selected="false" data-act="search-go" data-arg="' + i + '"><span class="sr-opt__t" dir="auto">' + esc(x.title) + '</span>' + (x.sub ? '<span class="sr-opt__s small muted" dir="auto">' + esc(x.sub) + '</span>' : '') + '</li>'; }).join('')
        : '<li class="sr-empty" role="presentation">No results for “' + esc(SR.q) + '”. Try a city, a course, a phrase or an ID like D-203.</li>';
    }
    list.querySelectorAll('.sr-opt').forEach(o => { const on = +o.dataset.arg === SR.idx; o.setAttribute('aria-selected', on); o.classList.toggle('is-on', on); if (on && moveOnly) o.scrollIntoView({ block: 'nearest' }); });
    if (SR.results.length) inp.setAttribute('aria-activedescendant', 'sr-opt-' + SR.idx); else inp.removeAttribute('aria-activedescendant');
  }
  SR.go = (i) => {
    const x = SR.results[i]; if (!x) return;
    SR.hide(true);
    if (x.act === 'lab') { LQ.lab.show(); return; }
    if (x.act === 'tour') { LQ.panel.startTour(); return; }
    if (x.type === 'Phrase' && x.tid) LQ.notebook.filter = x.tid;
    if (location.hash === x.href) LQ.app.render(true); else location.hash = x.href;
  };
  SR.hide = (navigating) => {
    if (!SR.open) return;
    SR.open = false; document.body.classList.remove('search-open');
    document.getElementById('search-host').innerHTML = '';
    ['stage', 'studio-root', 'lab'].forEach(id => { const el = document.getElementById(id); if (el) el.inert = false; });
    if (!navigating && SR.ret && document.contains(SR.ret)) { try { SR.ret.focus(); } catch (e) { } }
  };
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); SR.open ? SR.hide() : SR.show(); }
  });
  LQ.searchActs = { 'search-open': () => SR.show(), 'search-close': () => SR.hide(), 'search-go': el => SR.go(+el.dataset.arg) };
})();
