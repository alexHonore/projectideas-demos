/* TradeDesk V3 — shell (desk bar, navigation, notifications), shared components and the counterparty passport. */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});
  const D = TD.DATA; const u = TD.u; const E = TD.engine;
  const { esc, icon } = u;
  const V = (TD.views = TD.views || {});

  /* ---------- Status chips: colour is never the only signal ---------- */
  const CHIP = {
    tentative: ['Tentative', 'dot'], confirmed: ['Supplier-confirmed', 'check'], contracted: ['Contracted', 'check'], stated: ['Stated, unconfirmed', 'info'],
    indicative: ['Indicative', 'clock'], firm: ['Firm', 'lock'], unknown: ['Unknown', 'info'], unresolved: ['Unresolved', 'info'],
    stale: ['Stale', 'clock'], fresh: ['Current', 'check'], approved: ['Approved', 'check'], invalid: ['Re-approval needed', 'alert'],
    disputed: ['Disputed', 'flag'], pass: ['Pass', 'check'], discount: ['Conditional discount', 'minus'], fail: ['Fail', 'x'],
    excluded: ['Excluded', 'x'], open: ['Open', 'alert'], resolved: ['Resolved', 'check'], high: ['High', 'alert'], medium: ['Medium', 'alert'],
    low: ['Low', 'info'], new: ['New', 'spark'], simulated: ['Simulated', 'info'], blocked: ['Blocked', 'lock'], warn: ['Check', 'alert'],
    draft: ['Draft', 'file'], sent: ['Sent', 'mail'], booked: ['Booked', 'check'], requested: ['Requested', 'clock'], expired: ['Expired', 'clock'],
    reconciled: ['Reconciled', 'check'], settled: ['Settled', 'check'], delivered: ['Delivered', 'check'], transit: ['In transit', 'truck'], loading: ['Loading', 'truck'],
    planned: ['Planned', 'clock'], verified: ['Verified', 'check'], unverified: ['Needs verification', 'alert'], ok: ['OK', 'check'],
    cancelled: ['Cancelled', 'x'], withdrawn: ['Withdrawn', 'x'], closed: ['Closed', 'lock'], pending: ['Pending approval', 'clock'], overdue: ['Overdue', 'alert'],
    paid: ['Paid', 'check'], current: ['Current', 'clock'], hold: ['On hold', 'lock'], acknowledged: ['Acknowledged', 'check'], superseded: ['Superseded', 'refresh']
  };
  const TONE = { tentative: 'amber', confirmed: 'leaf', contracted: 'leaf', stated: 'steel', indicative: 'steel', firm: 'navy', unknown: 'amber', unresolved: 'amber', stale: 'muted', fresh: 'leaf', approved: 'leaf', invalid: 'brick', disputed: 'brick', pass: 'leaf', discount: 'amber', fail: 'brick', excluded: 'muted', open: 'brick', resolved: 'leaf', high: 'brick', medium: 'amber', low: 'steel', new: 'leaf', simulated: 'steel', blocked: 'brick', warn: 'amber', draft: 'muted', sent: 'steel', booked: 'leaf', requested: 'amber', expired: 'muted', reconciled: 'leaf', settled: 'leaf', delivered: 'steel', transit: 'navy', loading: 'navy', planned: 'muted', verified: 'leaf', unverified: 'amber', ok: 'leaf', cancelled: 'muted', withdrawn: 'muted', closed: 'muted', pending: 'amber', overdue: 'brick', paid: 'leaf', current: 'steel', hold: 'brick', acknowledged: 'leaf', superseded: 'muted' };
  function chip(kind, text) {
    const c = CHIP[kind] || [kind, 'dot'];
    return '<span class="chip tone-' + (TONE[kind] || 'muted') + (kind === 'tentative' ? ' is-dashed' : '') + '">' + icon(c[1], 13) + '<span>' + esc(text || c[0]) + '</span></span>';
  }
  /* Where a structured result came from: rules or live AI (model and time). */
  function provenance(p) {
    if (!p || p.source !== 'live-ai') return '<span class="prov prov-rules" title="Deterministic rule engine, runs in this browser">' + icon('check', 12) + '<span>Rules</span></span>';
    return '<span class="prov prov-ai" title="Proposed by live AI; you review before anything is applied">' + icon('spark', 12) + '<span>Live AI · ' + esc(p.model || 'claude-opus-5-5') + ' · ' + ((p.ms || 0) / 1000).toFixed(1) + ' s' + (p.fellBack ? ' · fallback model' : '') + '</span></span>';
  }

  /* ---------- Compact helpers: explanations behind ⓘ, status icons, tabs, live-AI status ---------- */
  /* ⓘ: the explanation is one tap away (a native disclosure, keyboard and touch friendly), never on the surface. */
  function info(text, label) {
    if (!text) return '';
    return '<details class="ii"><summary aria-label="' + esc(label ? 'About ' + label : 'Details') + '" title="' + esc(String(text).slice(0, 160)) + '">' + icon('info', 15) + '</summary><div class="ii-pop" role="note">' + esc(text) + '</div></details>';
  }
  /* A status as an icon with its word for screen readers and as a tooltip. */
  const ICO = { explicit: ['check', 'leaf', 'Stated in the message'], inferred: ['dot', 'steel', 'Inferred: check it'], approx: ['minus', 'amber', 'Approximate'], derived: ['alert', 'amber', 'Derived: check it'], missing: ['x', 'brick', 'Missing'], edited: ['edit', 'navy', 'Your entry'], converted: ['refresh', 'navy', 'Converted'], unverified: ['alert', 'amber', 'Quote not found in the message'], sender: ['mail', 'steel', 'From the sender address'], newsite: ['alert', 'amber', 'Not on file'] };
  function ico(kind, label) {
    const c = Array.isArray(kind) ? [kind[0], kind[1], label] : ICO[kind] || [CHIP[kind] ? CHIP[kind][1] : 'dot', TONE[kind] || 'muted', CHIP[kind] ? CHIP[kind][0] : kind];
    const l = label || c[2];
    return '<span class="sti tone-' + c[1] + '" title="' + esc(l) + '" role="img" aria-label="' + esc(l) + '">' + icon(c[0], 14) + '</span>';
  }
  /* Tabs: one panel at a time; the others stay in the page (search, tests and links still find them). */
  function tabs(group, list, active) {
    const cur = list.some((t) => t[0] === active) ? active : list[0][0];
    return { cur: cur, bar: '<div class="tabs" role="tablist" aria-label="' + esc(group) + '">' + list.map((t) => '<button type="button" role="tab" class="tab" id="tab-' + esc(group) + '-' + t[0] + '" aria-selected="' + (t[0] === cur) + '" aria-controls="tp-' + esc(group) + '-' + t[0] + '" data-act="tab" data-g="' + esc(group) + '" data-t="' + t[0] + '">' + (t[2] ? icon(t[2], 15) : '') + '<span>' + esc(t[1]) + '</span>' + (t[3] != null ? '<span class="tab-n">' + esc(t[3]) + '</span>' : '') + '</button>').join('') + '</div>',
      panel: (id, html) => '<div role="tabpanel" class="tabpanel" id="tp-' + esc(group) + '-' + id + '" aria-labelledby="tab-' + esc(group) + '-' + id + '"' + (id === cur ? '' : ' hidden') + '>' + html + '</div>' };
  }
  /* Live AI status icon: on, off or paused (reason as tooltip), linking to the hub's API monitor. */
  function aiStatus(opts) {
    opts = opts || {};
    const st = TD.ai ? TD.ai.status() : { state: 'off', reason: 'Live AI is not loaded.' };
    const word = st.state === 'on' ? 'on' : st.state === 'paused' ? 'paused' : 'off';
    const tip = 'Live AI ' + word + (st.reason ? ': ' + st.reason : '') + '. Keys, budgets and killswitches: API monitor.';
    return '<a class="ai-st is-' + st.state + (opts.cls ? ' ' + opts.cls : '') + '" href="../../index.html#api" title="' + esc(tip) + '" aria-label="' + esc(tip) + '" id="' + esc(opts.id || 'ai-status') + '">' + icon(st.state === 'paused' ? 'pause' : 'spark', opts.size || 15) + (opts.label ? '<span>AI ' + word + '</span>' : '') + '</a>';
  }

  /* ---------- Trade thread: the stages of the physical trade loop ---------- */
  const STAGES = ['Offer', 'Lot', 'Priced', 'Approved', 'Freight', 'Moving', 'Delivered', 'Settled'];
  function stageOf(state, tr) {
    const loads = E.loadsOf(state, tr.id);
    const valid = tr.approval && tr.approval.valid;
    const sold = valid && Object.values(tr.approval.snapshot.alloc).some((n) => n > 0);
    let done = 1; let note = ''; let blocked = false;
    if (!E.requiredMissing(state, tr).length) done = 2;
    if (done >= 2 && Object.values(tr.alloc || {}).some((n) => n > 0)) done = 3;
    if (done >= 3 && sold) done = 4;
    if (done >= 4 && loads.length) done = 5;
    if (done >= 5 && loads.some((l) => l.status !== 'booked')) done = 6;
    if (done >= 6 && loads.every((l) => ['delivered', 'reconciled', 'settled'].includes(l.status))) done = 7;
    if (done >= 7 && loads.every((l) => l.status === 'settled')) done = 8;
    if (valid && !sold) note = 'Bought, not yet sold';
    if (tr.status === 'cancelled') { blocked = true; note = 'Cancelled'; }
    else if (tr.status === 'expired') { blocked = true; note = tr.expiredReason === 'offer' ? 'Supplier’s price lapsed' : 'Pickup window lapsed'; }
    else if (E.requiredMissing(state, tr).length) { blocked = true; note = 'Missing ' + E.requiredMissing(state, tr).join(', '); }
    else if (tr.approval && !tr.approval.valid) { blocked = true; note = 'Re-approval needed'; }
    else if (loads.some((l) => l.exception && state.exceptions[l.exception] && state.exceptions[l.exception].status !== 'resolved')) { blocked = true; note = 'Carrier cancelled'; }
    else if (loads.some((l) => { const f = E.findings(state, l); return f.ready && !l.recon.approved && f.list.length > f.treated; })) { blocked = true; note = 'Discrepancy to resolve'; }
    else if (loads.some((l) => l.claim)) { blocked = true; note = 'Claim open'; }
    return { done: done, blocked: blocked, note: note };
  }
  function thread(state, tr, opts) {
    opts = opts || {};
    const s = stageOf(state, tr);
    const items = STAGES.map((name, i) => {
      const cls = i < s.done ? 'is-done' : i === s.done ? (s.blocked ? 'is-blocked' : 'is-current') : '';
      const lab = opts.labels === 'current' ? i === Math.min(s.done, STAGES.length - 1) : opts.labels;
      return '<li class="th-step ' + cls + '" title="' + name + '"><span class="th-node" aria-hidden="true">' + (i < s.done ? icon('check', 10) : '') + '</span>' + (lab ? '<span class="th-label">' + name + '</span>' : '') + '</li>';
    }).join('');
    const label = s.done >= STAGES.length ? 'All 8 stages complete: settled' : 'Stage ' + (s.done + 1) + ' of 8: ' + STAGES[Math.min(s.done, 7)] + (s.blocked ? ', blocked (' + s.note + ')' : '');
    return '<ol class="thread' + (opts.labels ? ' has-labels' : '') + (opts.dark ? ' on-dark' : '') + '" aria-label="' + esc(label) + '">' + items + '</ol>';
  }

  /* ---------- Small builders ---------- */
  function btn(label, act, opts) {
    opts = opts || {};
    const attrs = Object.keys(opts.data || {}).map((k) => ' data-' + k + '="' + esc(opts.data[k]) + '"').join('');
    return '<button type="button" class="btn ' + (opts.cls || '') + '" data-act="' + esc(act) + '"' + attrs + (opts.disabled ? ' disabled aria-disabled="true"' : '') + (opts.id ? ' id="' + esc(opts.id) + '"' : '') + (opts.label ? ' aria-label="' + esc(opts.label) + '"' : '') + (opts.title ? ' title="' + esc(opts.title) + '"' : '') + '>' + (opts.icon ? icon(opts.icon, 16) : '') + '<span>' + label + '</span></button>';
  }
  function link(label, href, cls, ic, id) { return '<a class="btn ' + (cls || '') + '" href="' + esc(href) + '"' + (id ? ' id="' + esc(id) + '"' : '') + '>' + (ic ? icon(ic, 16) : '') + '<span>' + label + '</span></a>'; }
  function partyLink(id, text) {
    const p = TD.store.get().parties[id]; if (!p) return esc(text || 'Unidentified');
    return '<button type="button" class="plink" data-act="party" data-id="' + esc(id) + '">' + esc(text || p.short || p.name) + '</button>';
  }
  function band(inner, cls) { return '<section class="band ' + (cls || '') + '"><div class="band-in">' + inner + '</div></section>'; }
  function commodityName(c) { return (D.commodities[c] || { label: c || 'Commodity unknown' }).label; }
  function pname(id, short) { const p = TD.store.get().parties[id]; return p ? (short ? p.short || p.name : p.name) : 'an unidentified sender'; }
  function tradeTitle(tr) { return commodityName(tr.commodity) + ' from ' + pname(tr.supplier); }
  function loadChip(state, l) {
    if (l.status === 'cancelled') return chip('cancelled');
    if (l.exception && state.exceptions[l.exception] && state.exceptions[l.exception].status !== 'resolved') return chip('open', 'No carrier');
    return chip({ booked: 'booked', loading: 'loading', transit: 'transit', delivered: 'delivered', reconciled: 'reconciled', settled: 'settled' }[l.status] || 'planned');
  }
  const statusChip = (st) => chip({ booked: 'booked', loading: 'loading', transit: 'transit', delivered: 'delivered', reconciled: 'reconciled', settled: 'settled', cancelled: 'cancelled' }[st] || 'planned');
  function lotChip(tr) {
    if (tr.status === 'cancelled') return chip('cancelled');
    if (tr.status === 'expired') return chip('expired', tr.expiredReason === 'offer' ? 'Price lapsed' : 'Window lapsed');
    if (tr.approval && tr.approval.valid) return chip('contracted', 'Approved v' + tr.approval.version);
    if (tr.approval) return chip('invalid');
    if (tr.certainty === 'tentative') return chip('tentative');
    if (tr.supplierConfirmed) return chip('confirmed');
    return chip('stated');
  }
  const when = (t) => u.when(t, TD.store.get().now);

  /* Unit display for prices: CAD/t, CAD/bu, CAD/cwt (documented conversion per commodity). */
  function perUnit(v, commodity, unit) {
    if (v == null) return '—';
    const c = D.commodities[commodity] || D.commodities.corn;
    if (unit === 'bu') return u.n4(v / u.buPerT(c.lbPerBu));
    if (unit === 'cwt') return u.rate(v / u.cwtPerT);
    return u.rate(v);
  }
  const unitLabel = (un) => ({ t: 'CAD/t', bu: 'CAD/bu', cwt: 'CAD/cwt' }[un] || 'CAD/t');

  /* Route for any reference in the event log or search. */
  function refHref(state, ref) {
    if (!ref) return null;
    if (/^TR-/.test(ref)) return '#/trade/' + ref;
    if (/^LD-/.test(ref)) { const l = E.load(state, ref); return l && ['delivered', 'reconciled', 'settled'].includes(l.status) ? '#/settle/' + ref : '#/load/' + ref; }
    if (/^EX-/.test(ref)) { const ex = state.exceptions[ref]; return ex ? '#/load/' + ex.load : null; }
    if (/^(MSG|PASTE)-/.test(ref)) return /^PASTE/.test(ref) ? '#/inbox/new' : '#/inbox/' + ref;
    if (/^DEM-/.test(ref)) return '#/book/' + ref;
    if (/^FQ-/.test(ref)) { const fq = (state.fquotes || {})[ref]; const a = fq && fq.attached.length ? fq.attached[fq.attached.length - 1] : null; return a ? (a.type === 'load' ? '#/load/' + a.load : '#/trade/' + a.trade + '/' + (a.approved ? 'freight' : 'price')) : '#/loads'; }
    if (/^INV-/.test(ref)) return '#/settle';
    if (ref === 'POLICY') return '#/review';
    if (state.parties[ref]) return '#/book/' + ref;
    return null;
  }

  /* ---------- Desk bar ---------- */
  const NAV = [
    ['today', 'Today', 'today'], ['inbox', 'Inbox', 'inbox'], ['trades', 'Trades', 'trade'], ['loads', 'Loads', 'truck'],
    ['settle', 'Settle', 'scale']
  ];
  const MORE = [['book', 'Book', 'book'], ['review', 'Review', 'chart']];
  function navCounts(state) {
    const inbox = state.messages.filter((m) => (TD.store.isExtractable(m) && m.status === 'review') || (m.status === 'flagged' && !state.msgState[m.id])).length;
    const loads = Object.values(state.exceptions).filter((x) => x.status !== 'resolved').length;
    const settle = state.loads.filter((l) => { const f = E.findings(state, l); return f.ready && !l.recon.ack && l.status !== 'cancelled'; }).length;
    return { inbox: inbox, loads: loads, settle: settle };
  }
  function unreadCount(state) { return state.events.filter((e) => e.notify && e.id > (state.notifSeen || 0)).length; }
  function deskbar(state, route) {
    const c = navCounts(state);
    const usr = D.users[state.role];
    const navItems = NAV.map((n) => {
      const cur = route.section === n[0];
      const cnt = c[n[0]] ? '<span class="nav-count' + (n[0] === 'loads' ? ' is-alert' : '') + '" aria-label="' + c[n[0]] + ' waiting">' + c[n[0]] + '</span>' : '';
      return '<a class="nav-a" href="#/' + n[0] + '"' + (cur ? ' aria-current="page"' : '') + ' data-nav="' + n[0] + '">' + icon(n[2], 17) + '<span>' + n[1] + '</span>' + cnt + '</a>';
    }).join('');
    const moreCur = MORE.some((n) => n[0] === route.section);
    const more = '<details class="nav-more"><summary class="nav-a"' + (moreCur ? ' aria-current="page"' : '') + '>' + icon('menu', 17) + '<span>More</span>' + icon('down', 13) + '</summary><div class="nav-more-menu">' + MORE.map((n) => '<a href="#/' + n[0] + '"' + (route.section === n[0] ? ' aria-current="page"' : '') + '>' + icon(n[2], 16) + '<span>' + n[1] + '</span></a>').join('') + '</div></details>';
    const roles = Object.values(D.users).map((x) => '<li><button type="button" role="menuitemradio" aria-checked="' + (x.id === state.role) + '" data-act="role" data-role="' + x.id + '"><span class="av">' + x.initials + '</span><span><strong>' + esc(x.name) + '</strong><small>' + esc(x.title) + '</small></span>' + (x.id === state.role ? icon('check', 15) : '') + '</button></li>').join('');
    const unread = unreadCount(state);
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || '');
    const t = esc(u.dayShort(state.now).slice(0, 3)) + ' ' + u.hhmm(state.now);
    return '<header class="deskbar" id="deskbar"><div class="deskbar-in">' +
      '<a class="back-all" href="../../index.html" aria-label="All demos" title="All demos">' + icon('back', 15) + '</a>' +
      '<a class="brand" href="#/today" aria-label="TradeDesk home: Today"><img src="assets/tradedesk-wordmark.png" alt="TradeDesk" width="137" height="24"></a>' +
      '<nav class="mainnav" aria-label="Main">' + navItems + more + '</nav>' +
      '<div class="desk-tools">' +
      '<button type="button" class="tool-btn icon-only search-btn" data-act="search" id="search-btn" aria-label="Search (' + (mac ? '⌘' : 'Ctrl') + '+K)" title="Search (' + (mac ? '⌘K' : 'Ctrl K') + ')">' + icon('search', 16) + '</button>' +
      '<div class="notif"><button type="button" class="tool-btn icon-only" data-act="notif" id="notif-btn" aria-haspopup="true" aria-expanded="false" aria-controls="notif-panel" aria-label="Notifications' + (unread ? ', ' + unread + ' unread' : '') + '" title="Notifications">' + icon('bell', 17) + (unread ? '<span class="nb-count" aria-hidden="true">' + (unread > 99 ? '99+' : unread) + '</span>' : '') + '</button>' + notifPanel(state) + '</div>' +
      '<div class="demo"><button type="button" class="demo-btn" data-act="demo-menu" id="demo-btn" aria-haspopup="true" aria-expanded="false" aria-controls="demo-menu" aria-label="Demo tools: tour, Test lab, reset, live AI. Demo clock ' + t + '" title="Demo tools · clock ' + t + '">' + icon('flask', 16) + '<span class="demo-t num">' + t + '</span></button>' + demoMenu(state, t) + '</div>' +
      '<div class="who"><button type="button" class="who-btn" data-act="role-menu" aria-haspopup="true" aria-expanded="false" aria-controls="role-menu" id="who-btn" aria-label="Acting as ' + esc(usr.name) + ', ' + esc(usr.title) + '. Switch role" title="' + esc(usr.name + ' · ' + usr.title) + '"><span class="av">' + usr.initials + '</span>' + icon('down', 14) + '</button>' +
      '<div class="role-menu" id="role-menu" hidden><p class="rm-title">Act as ' + info('Each role has its own limits and queue: traders price and approve, logistics books freight, finance settles and approves credit. Nobody approves their own new counterparty.', 'roles') + '</p><ul role="menu" aria-label="Switch desk role">' + roles + '</ul></div></div>' +
      '</div></div>' + banners(state) + '</header>';
  }
  /* Everything about the demo itself in one place: tour, Test lab and clock, reset, live-AI status, the demo marker. */
  function demoMenu(state, t) {
    return '<div class="demo-menu" id="demo-menu" hidden><p class="dm-mark">' + chip('simulated', 'Demo · fictional data') + info('Fictional companies, people and prices. Carrier, facility and accounting replies are simulated. TradeDesk runs beside an ERP and does not replace it.', 'the demo') + '</p><ul class="dm-list">' +
      '<li><button type="button" data-act="tour-start" id="tour-start">' + icon('play', 16) + '<span>Guided tour</span></button></li>' +
      '<li><button type="button" data-act="lab" id="lab-btn">' + icon('flask', 16) + '<span>Test lab</span></button></li>' +
      '<li><button type="button" data-act="lab" data-sec="clock" id="clock-btn">' + icon('clock', 16) + '<span>Clock <span class="num">' + t + '</span></span></button></li>' +
      '<li><button type="button" data-act="reset" id="reset-demo">' + icon('reset', 16) + '<span>Reset</span></button></li>' +
      '<li class="dm-ai">' + aiStatus({ id: 'ai-status-menu', label: true, size: 16 }) + '</li>' +
      '<li><a href="../../index.html">' + icon('back', 16) + '<span>All demos</span></a></li></ul></div>';
  }
  function banners(state) {
    const b = [];
    if (u.caps.offline) b.push('Offline');
    if (!u.caps.storage) b.push('Not saving');
    return b.length ? '<div class="capbar" role="status">' + icon('alert', 14) + '<span>' + esc(b.join(' · ')) + '</span>' + info((u.caps.offline ? 'Offline (Test lab): carrier, facility and accounting requests are paused; live AI is unavailable. ' : '') + (!u.caps.storage ? 'Saving is off (Test lab): changes last until you reload.' : ''), 'this mode') + '<button type="button" class="btn small on-dark" data-act="lab" data-sec="caps">Change</button></div>' : '';
  }
  function notifPanel(state) {
    const list = state.events.filter((e) => e.notify).slice(-40).reverse();
    const seen = state.notifSeen || 0;
    return '<div class="notif-panel" id="notif-panel" hidden><div class="np-head"><h2>Notifications</h2>' + (list.some((e) => e.id > seen) ? '<button type="button" class="btn small ghost" data-act="notif-read">Mark all read</button>' : '') + '</div>' +
      (list.length ? '<ul class="np-list">' + list.map((e) => {
        const href = refHref(state, e.ref);
        const inner = '<span class="np-dot' + (e.id > seen ? ' is-new' : '') + '" aria-hidden="true"></span><span class="np-main"><span>' + esc(e.text) + '</span><small>' + esc(u.when(e.at, state.now)) + ' · ' + esc(e.who) + (e.id > seen ? ' · new' : '') + '</small></span>';
        return '<li>' + (href ? '<a href="' + href + '" data-act="notif-go">' + inner + '</a>' : '<div>' + inner + '</div>') + '</li>';
      }).join('') + '</ul>' : '<p class="muted small np-empty">Nothing yet.</p>') +
      '<p class="np-foot"><button type="button" class="plink" data-act="lab" data-sec="log">Event log</button></p></div>';
  }
  function bottomNav(state, route) {
    const c = navCounts(state);
    return '<nav class="bottomnav" aria-label="Main (mobile)">' + NAV.slice(0, 5).map((n) => {
      const cur = route.section === n[0];
      return '<a href="#/' + n[0] + '"' + (cur ? ' aria-current="page"' : '') + '>' + icon(n[2], 20) + '<span>' + n[1] + '</span>' + (c[n[0]] ? '<i class="bn-dot" aria-label="' + c[n[0]] + ' waiting"></i>' : '') + '</a>';
    }).join('') + '<button type="button" data-act="more" aria-haspopup="dialog" id="more-btn">' + icon('menu', 20) + '<span>More</span>' + (unreadCount(state) ? '<i class="bn-dot" aria-hidden="true"></i>' : '') + '</button></nav>';
  }
  function moreSheet(state) {
    const unread = unreadCount(state);
    return '<dialog class="sheet" id="more-sheet" aria-labelledby="more-title"><div class="sheet-in"><div class="sheet-head"><h2 id="more-title">More</h2><button type="button" class="icon-btn" data-act="close-dialog" aria-label="Close">' + icon('x', 18) + '</button></div>' +
      '<nav class="sheet-nav" aria-label="More sections">' + MORE.map((n) => '<a href="#/' + n[0] + '">' + icon(n[2], 18) + n[1] + '</a>').join('') +
      '<button type="button" data-act="search">' + icon('search', 18) + 'Search</button><button type="button" data-act="lab" data-sec="log">' + icon('bell', 18) + 'Event log' + (unread ? ' <span class="nav-count">' + unread + '</span>' : '') + '</button></nav>' +
      '<p class="sheet-label">Act as</p><div class="sheet-roles">' + Object.values(D.users).map((x) => '<button type="button" class="role-pill' + (x.id === state.role ? ' is-on' : '') + '" aria-pressed="' + (x.id === state.role) + '" data-act="role" data-role="' + x.id + '"><span class="av">' + x.initials + '</span>' + esc(x.first) + ' · ' + esc(x.title) + '</button>').join('') + '</div></div></dialog>';
  }

  /* ---------- Counterparty passport (CT-03, CT-09) ---------- */
  function passport(state, id) {
    const p = state.parties[id];
    if (!p) return '<div class="pp"><p>Counterparty not found.</p><button type="button" class="btn small" data-act="close-dialog">Close</button></div>';
    let credit = '';
    if (p.kind === 'Buyer') {
      const ex = E.exposure(state, id);
      const lim = u.toCents(p.creditLimit || 0);
      const pc = lim ? Math.min(100, ex.current / lim * 100) : 0;
      credit = '<section class="pp-sec"><h3>Credit</h3><div class="meter' + (pc > 85 ? ' is-warn' : '') + '" role="img" aria-label="' + pc.toFixed(1) + '% of credit limit used"><span style="width:' + pc.toFixed(1) + '%"></span></div><dl class="kv"><div><dt>Approved limit</dt><dd class="num">' + u.cad(lim) + '</dd></div><div><dt>Current exposure</dt><dd class="num">' + u.cad(ex.current) + '</dd></div><div><dt>Open receivables</dt><dd class="num">' + u.cad(ex.other) + '</dd></div><div><dt>Committed, unbilled</dt><dd class="num">' + u.cad(ex.committed) + '</dd></div><div><dt>Terms</dt><dd>' + (p.termsDays || 15) + ' days' + (p.payDelayDays ? ', usually pays ' + p.payDelayDays + ' day' + (p.payDelayDays > 1 ? 's' : '') + ' late' : p.payDelayDays === 0 ? ', pays on time' : ', payment not imported') + '</dd></div></dl></section>';
    }
    let perf = '';
    if (p.perf) {
      const canc = (p.cancellations || []).slice();
      perf = '<section class="pp-sec"><h3>Execution history</h3><dl class="kv"><div><dt>On time</dt><dd>' + p.perf.onTime + ' of ' + p.perf.loads + ' loads (' + esc(p.perf.period) + ')' + (p.perf.loads < 10 ? ' · sample too small for a rate' : '') + '</dd></div><div><dt>Actual vs quoted</dt><dd>' + esc(p.perf.actualVsQuoted) + '</dd></div><div><dt>Equipment</dt><dd>' + esc(p.equipment) + (p.verifiedPayload ? '' : ' ' + chip('unverified', 'Axles not declared')) + '</dd></div><div><dt>Insurance</dt><dd>' + esc(p.insurance) + '</dd></div></dl>' +
        (canc.length ? '<h4>Cancellations, last 90 days (' + canc.length + ')</h4><ul class="pp-list">' + canc.map((c) => '<li><a href="#/load/' + esc(c.load) + '" data-act="close-dialog-nav">' + esc(c.load) + '</a> · ' + esc(c.date) + ' · ' + esc(c.note) + '</li>').join('') + '</ul>' : '<p class="muted">No cancellations in the last 90 days.</p>') +
        (!p.verifiedPayload && (state.role === 'logistics' || state.role === 'manager') ? btn('Record declared axle configuration (simulated reply)', 'verify-carrier', { cls: 'small', data: { id: id } }) : '') + '</section>';
    }
    const status = p.status === 'On hold' ? chip('hold') : p.status === 'Pending' ? chip('pending') : chip('approved', 'Approved ' + p.kind.toLowerCase());
    const canApprove = p.status === 'Pending';
    const used = Object.values(state.trades).filter((t) => t.supplier === id).map((t) => t.id).concat(state.demands.filter((d) => d.buyer === id).map((d) => d.id)).concat(state.loads.filter((l) => l.carrier === id || l.cancelledCarrier === id || l.replacedFrom === id).map((l) => l.id).slice(0, 6));
    return '<div class="pp"><div class="pp-head"><div><p class="pp-kind">' + esc(p.kind) + ' passport</p><h2 id="party-title">' + esc(p.name) + '</h2><p class="muted">' + esc(p.address || p.town) + ' · ' + esc(p.contact || 'No contact') + ' · prefers ' + (p.lang === 'en' ? 'English' : 'French') + '</p></div><button type="button" class="icon-btn" data-act="close-dialog" aria-label="Close passport">' + icon('x', 18) + '</button></div>' +
      '<div class="pp-status">' + status + chip('ok', String(p.screening || '').split('·')[0].trim() || 'Screened') + (p.createdBy ? chip('simulated', 'Created by ' + p.createdBy) : '') + '</div>' +
      (p.hold ? '<p class="callout tone-brick">' + icon('lock', 16) + esc(p.hold) + '</p>' : '') +
      (p.kyc ? '<p class="small">' + V_chipKyc(p) + ' ' + esc(p.kyc.state === 'verified' ? 'KYC verified by ' + p.kyc.by + ': ' + p.kyc.items.join(', ') + '.' : 'KYC to verify before approval: ' + p.kyc.items.join(', ') + '.') + '</p>' : '') +
      (canApprove ? '<p class="callout tone-amber">' + icon('clock', 16) + '<span>Pending: ' + (p.kind === 'Carrier' ? 'logistics verifies authority, insurance and equipment.' : 'finance approves the counterparty' + (p.kind === 'Buyer' ? ' and its credit limit.' : '.')) + ' The person who created it cannot approve it.</span></p>' : '') +
      '<div class="row-actions pp-actions">' + btn('Edit', 'form', { cls: 'small', icon: 'edit', data: { form: 'party-edit', id: id } }) + (canApprove ? btn('Approve ' + p.kind.toLowerCase(), 'party-approve', { cls: 'small primary', icon: 'check', data: { id: id } }) : '') + (!used.length ? btn('Delete', 'party-delete', { cls: 'small ghost', icon: 'x', data: { id: id } }) : '') + '</div>' +
      '<div class="pp-grid"><section class="pp-sec"><h3>Verified</h3><ul class="pp-list">' + ((p.verified || []).length ? p.verified.map((v) => '<li>' + icon('check', 14) + esc(v) + '</li>').join('') : '<li class="muted">Nothing beyond identity and screening.</li>') + '</ul>' + (p.rule ? '<h4>Commercial rule in force</h4><p>' + esc(p.rule.label) + '</p>' : '') + (p.kind === 'Buyer' ? '<h4>Delivery sites</h4><ul class="pp-list">' + E.sitesOf(p).map((x) => '<li>' + esc(x.name) + ' · ' + esc(x.address || x.town) + (x.main ? ' (main)' : '') + '</li>').join('') + '</ul>' : '') + (p.hours ? '<h4>Receiving</h4><p>' + esc(hoursLabel(p.hours)) + (p.unloadMins ? '; unloading about ' + p.unloadMins + ' min' : '') + '.</p>' : '') + (p.loadMins ? '<h4>Loading</h4><p>About ' + p.loadMins + ' min per load.</p>' : '') + '</section>' +
      '<section class="pp-sec"><h3>Observations</h3><p class="muted small">Kept apart from verified requirements: a note never overrides a contract.</p><ul class="pp-obs">' + ((p.observations || []).length ? p.observations.map((o) => '<li><p>' + esc(o.text) + '</p><small>' + esc(o.basis) + '</small></li>').join('') : '<li class="muted">No observations yet.</li>') + '</ul>' +
      (used.length ? '<h4>Records</h4><p class="small">' + used.map((r) => { const h = refHref(state, r); return h ? '<a href="' + h + '" data-act="close-dialog-nav">' + esc(r) + '</a>' : esc(r); }).join(', ') + '</p>' : '') + '</section>' +
      credit + perf + '</div>' +
      '<p class="pp-foot">' + icon('lock', 14) + ' Internal view. External carriers never see purchase prices, buyer margins or competing quotes.</p></div>';
  }
  function V_chipKyc(p) { return p.kyc.state === 'verified' ? chip('verified', 'KYC verified') : chip('pending', 'KYC pending'); }
  function hoursLabel(h) {
    const days = h.days.length === 7 ? 'Every day' : h.days.length === 6 && !h.days.includes(0) ? 'Mon–Sat' : h.days.join(',') === '1,2,3,4,5' ? 'Mon–Fri' : h.days.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');
    return days + ' ' + (h.open === 0 && h.close === 1439 ? 'around the clock' : u.hhmm(h.open) + '–' + u.hhmm(h.close)) + (h.queueAfter != null ? ', queue after ' + u.hhmm(h.queueAfter) : '');
  }

  /* ---------- Toasts (with optional undo) ---------- */
  TD.ui = TD.ui || {};
  TD.ui.toast = function (text, kind, opts) {
    const dlgs = Array.from(document.querySelectorAll('dialog[open]'));
    const top = dlgs.length ? dlgs[dlgs.length - 1].querySelector(':scope > .toasts') : null;
    const host = top || document.getElementById('toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast tone-' + (kind === 'warn' ? 'amber' : 'leaf');
    el.innerHTML = icon(kind === 'warn' ? 'alert' : 'check', 16) + '<span>' + esc(text) + '</span>' + (opts && opts.undo ? '<button type="button" class="toast-undo" data-act="undo">Undo</button>' : '');
    host.appendChild(el);
    while (host.children.length > 3) host.firstChild.remove();
    setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 400); }, kind === 'warn' ? 5200 : (opts && opts.undo ? 7000 : 3600));
  };

  Object.assign(V, { info, ico, tabs, aiStatus, chip, provenance, thread, stageOf, STAGES, btn, link, partyLink, band, commodityName, pname, tradeTitle, statusChip, loadChip, lotChip, when, perUnit, unitLabel, deskbar, bottomNav, moreSheet, passport, navCounts, refHref, hoursLabel, unreadCount });
})();
