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
      return '<li class="th-step ' + cls + '"><span class="th-node" aria-hidden="true">' + (i < s.done ? icon('check', 10) : '') + '</span>' + (opts.labels ? '<span class="th-label">' + name + '</span>' : '') + '</li>';
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
    ['settle', 'Settle', 'scale'], ['book', 'Book', 'book'], ['review', 'Review', 'chart']
  ];
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
    const roles = Object.values(D.users).map((x) => '<li><button type="button" role="menuitemradio" aria-checked="' + (x.id === state.role) + '" data-act="role" data-role="' + x.id + '"><span class="av">' + x.initials + '</span><span><strong>' + esc(x.name) + '</strong><small>' + esc(x.title) + '</small></span>' + (x.id === state.role ? icon('check', 15) : '') + '</button></li>').join('');
    const unread = unreadCount(state);
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || '');
    return '<header class="deskbar" id="deskbar"><div class="deskbar-in">' +
      '<a class="back-all" href="../../index.html" aria-label="All demos">' + icon('back', 14) + '<span>All demos</span></a>' +
      '<a class="brand" href="#/today" aria-label="TradeDesk home: Today"><img src="assets/tradedesk-wordmark.png" alt="TradeDesk" width="137" height="24"></a>' +
      '<nav class="mainnav" aria-label="Main">' + navItems + '</nav>' +
      '<div class="desk-tools">' +
      '<button type="button" class="tool-btn search-btn" data-act="search" id="search-btn" aria-label="Search (' + (mac ? '⌘' : 'Ctrl') + '+K)">' + icon('search', 16) + '<span class="tb-l">Search</span><kbd>' + (mac ? '⌘K' : 'Ctrl K') + '</kbd></button>' +
      '<div class="notif"><button type="button" class="tool-btn icon-only" data-act="notif" id="notif-btn" aria-haspopup="true" aria-expanded="false" aria-controls="notif-panel" aria-label="Notifications' + (unread ? ', ' + unread + ' unread' : '') + '">' + icon('bell', 17) + (unread ? '<span class="nb-count" aria-hidden="true">' + (unread > 99 ? '99+' : unread) + '</span>' : '') + '</button>' + notifPanel(state) + '</div>' +
      '<button type="button" class="clock" data-act="lab" data-sec="clock" id="clock-btn" title="Demo clock: open the Test lab to move time">' + icon('clock', 14) + '<span>' + esc(u.dayShort(state.now).slice(0, 3)) + ' ' + u.hhmm(state.now) + '</span></button>' +
      '<button type="button" class="lab-btn" data-act="lab" id="lab-btn">' + icon('flask', 15) + '<span>Test lab</span></button>' +
      '<button type="button" class="tour-btn" data-act="tour-start" id="tour-start">' + icon('play', 14) + '<span>Guided tour</span></button>' +
      '<div class="who"><button type="button" class="who-btn" data-act="role-menu" aria-haspopup="true" aria-expanded="false" aria-controls="role-menu" id="who-btn"><span class="av">' + usr.initials + '</span><span class="who-txt"><strong>' + esc(usr.name) + '</strong><small>' + esc(usr.title) + '</small></span>' + icon('down', 14) + '</button>' +
      '<div class="role-menu" id="role-menu" hidden><p class="rm-title">Act as</p><ul role="menu" aria-label="Switch desk role">' + roles + '</ul><p class="rm-note">Each role has its own limits and queue: traders price and approve, logistics books freight, finance settles and approves credit. Nobody approves their own new counterparty.</p><div class="rm-foot"><button type="button" class="btn small" data-act="reset" id="reset-demo">' + icon('reset', 15) + '<span>Reset demo</span></button><a class="btn small ghost" href="../../index.html">' + icon('back', 15) + '<span>All demos</span></a></div></div></div>' +
      '</div></div>' + banners(state) + '</header>';
  }
  function banners(state) {
    const b = [];
    if (u.caps.offline) b.push('Offline (Test lab): carrier, facility and accounting requests are paused; live AI is unavailable.');
    if (!u.caps.storage) b.push('Saving is off (Test lab): changes last until you reload.');
    return b.length ? '<div class="capbar" role="status">' + icon('alert', 14) + '<span>' + esc(b.join(' ')) + '</span><button type="button" class="btn small on-dark" data-act="lab" data-sec="caps">Change</button></div>' : '';
  }
  function notifPanel(state) {
    const list = state.events.filter((e) => e.notify).slice(-40).reverse();
    const seen = state.notifSeen || 0;
    return '<div class="notif-panel" id="notif-panel" hidden><div class="np-head"><h2>Notifications</h2>' + (list.some((e) => e.id > seen) ? '<button type="button" class="btn small ghost" data-act="notif-read">Mark all read</button>' : '') + '</div>' +
      (list.length ? '<ul class="np-list">' + list.map((e) => {
        const href = refHref(state, e.ref);
        const inner = '<span class="np-dot' + (e.id > seen ? ' is-new' : '') + '" aria-hidden="true"></span><span class="np-main"><span>' + esc(e.text) + '</span><small>' + esc(u.when(e.at, state.now)) + ' · ' + esc(e.who) + (e.id > seen ? ' · new' : '') + '</small></span>';
        return '<li>' + (href ? '<a href="' + href + '" data-act="notif-go">' + inner + '</a>' : '<div>' + inner + '</div>') + '</li>';
      }).join('') + '</ul>' : '<p class="muted small np-empty">Nothing yet. Handoffs, expiries, cancellations and arrivals appear here.</p>') +
      '<p class="np-foot"><button type="button" class="plink" data-act="lab" data-sec="log">Open the full event log</button></p></div>';
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
      '<nav class="sheet-nav" aria-label="More sections"><a href="#/book">' + icon('book', 18) + 'Book: positions, bids, counterparties</a><a href="#/review">' + icon('chart', 18) + 'Review: performance and automation</a>' +
      '<button type="button" data-act="search">' + icon('search', 18) + 'Search everything</button><button type="button" data-act="lab" data-sec="log">' + icon('bell', 18) + 'Notifications and event log' + (unread ? ' <span class="nav-count">' + unread + '</span>' : '') + '</button><button type="button" data-act="lab">' + icon('flask', 18) + 'Test lab: clock, events, scenarios</button></nav>' +
      '<p class="sheet-label">Act as</p><div class="sheet-roles">' + Object.values(D.users).map((x) => '<button type="button" class="role-pill' + (x.id === state.role ? ' is-on' : '') + '" aria-pressed="' + (x.id === state.role) + '" data-act="role" data-role="' + x.id + '"><span class="av">' + x.initials + '</span>' + esc(x.first) + ' · ' + esc(x.title) + '</button>').join('') + '</div>' +
      '<div class="sheet-actions"><button type="button" class="btn" data-act="tour-start">' + icon('play', 16) + '<span>Guided tour</span></button><button type="button" class="btn" data-act="reset">' + icon('reset', 16) + '<span>Reset demo</span></button><a class="btn ghost" href="../../index.html">' + icon('back', 16) + '<span>All demos</span></a></div>' +
      '<p class="sheet-note">Demo, fictional data. Demo clock ' + esc(u.dayLong(state.now)) + ', ' + u.hhmm(state.now) + '.</p></div></dialog>';
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

  Object.assign(V, { chip, provenance, thread, stageOf, STAGES, btn, link, partyLink, band, commodityName, pname, tradeTitle, statusChip, loadChip, lotChip, when, perUnit, unitLabel, deskbar, bottomNav, moreSheet, passport, navCounts, refHref, hoursLabel, unreadCount });
})();
