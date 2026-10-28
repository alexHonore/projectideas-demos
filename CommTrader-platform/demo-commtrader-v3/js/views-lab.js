/* TradeDesk V3 — Test lab: demo tooling kept out of the product's way.
   Scenarios, the demo clock, external events, delivery simulation, roles, capability toggles,
   live AI settings, the event log and workspace export/import/reset. */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});
  const D = TD.DATA; const u = TD.u; const E = TD.engine; const S = TD.store;
  const { esc, icon } = u;
  const V = TD.views;
  const LAB = (TD.labUi = TD.labUi || { delivery: null, logQ: '', logKind: '' });

  const opt = (list, cur) => list.map((o) => '<option value="' + esc(o[0]) + '"' + (String(cur) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('');
  const fld = (id, label, ctl, cls) => '<div class="fld' + (cls ? ' ' + cls : '') + '"><label for="' + id + '">' + esc(label) + '</label>' + ctl + '</div>';
  const sec = (id, title, sub, body) => '<section class="lab-sec" id="lab-' + id + '" aria-labelledby="lab-h-' + id + '"><h3 id="lab-h-' + id + '">' + esc(title) + '</h3>' + (sub ? '<p class="lab-sub">' + esc(sub) + '</p>' : '') + body + '</section>';
  const loadLabel = (state, l) => l.id + ' · ' + (state.trades[l.trade] ? V.commodityName(state.trades[l.trade].commodity) : '') + ' → ' + (E.party(state, E.demand(state, l.demand).buyer) || {}).short + ' · ' + l.status + ' · ' + u.dayShort(l.pickupAt);

  function clock(state) {
    const up = S.upcoming(8);
    return sec('clock', 'Demo clock', 'Time only moves forward. Every rule that depends on it runs as the clock passes: quotes and bids expire, pickups start, trucks arrive or miss cutoffs, tickets and invoices arrive, invoices go overdue.',
      '<p class="lab-now"><strong>' + esc(u.dayLong(state.now)) + ', ' + u.hhmm(state.now) + '</strong></p>' +
      '<div class="lab-row">' + [[15, '+15 min'], [60, '+1 hour'], [1440, '+1 day'], [10080, '+1 week']].map((x) => V.btn(x[1], 'clock-adv', { cls: 'small', data: { m: x[0] }, id: 'clock-' + x[0] })).join('') + '</div>' +
      '<div class="lab-row lab-to">' + fld('lab-to-d', 'Advance to date', '<input type="date" id="lab-to-d" class="inp" value="' + u.toDateInput(state.now + 1440) + '" min="' + u.toDateInput(state.now) + '">', 'is-half') + fld('lab-to-t', 'Time', '<input type="time" id="lab-to-t" class="inp" value="09:00">', 'is-half') + V.btn('Go', 'clock-to', { cls: 'small primary', icon: 'forward', id: 'clock-to' }) + '</div>' +
      '<h4>Coming up</h4>' + (up.length ? '<ol class="lab-up">' + up.map((x) => '<li><time class="num">' + esc(u.when(x.at, state.now)) + '</time><span>' + esc(x.text) + '</span></li>').join('') + '</ol>' : '<p class="muted small">Nothing scheduled.</p>'));
  }
  function scenarios() {
    return sec('scen', 'Scenario presets', 'Each preset resets the workspace and jumps to an interesting state. Export first if you want to keep your own.',
      '<ul class="lab-scen">' + S.SCENARIOS.map((s) => '<li><div><strong>' + esc(s.label) + '</strong><small>' + esc(s.desc) + '</small></div>' + V.btn('Load', 'scenario', { cls: 'small', data: { id: s.id }, id: 'scen-' + s.id }) + '</li>').join('') + '</ul>');
  }
  function inject(state) {
    const cancellable = state.loads.filter((l) => ['booked', 'loading'].includes(l.status) && l.carrier && !(l.exception && state.exceptions[l.exception] && state.exceptions[l.exception].status !== 'resolved'));
    const moving = state.loads.filter((l) => ['booked', 'loading', 'transit'].includes(l.status) && l.carrier);
    const openBids = state.demands.filter((d) => E.bidStatus(state, d) === 'open');
    const bids = openBids.filter((d) => d.kind !== 'Contract');
    const revTrades = Object.values(state.trades).filter((t) => t.status !== 'cancelled' && !S.locked(t) && t.supplier);
    const late = state.loads.filter((l) => l.status === 'delivered' && !l.docs.receiving);
    const none = (t) => '<option value="">' + esc(t) + '</option>';
    return sec('events', 'Inject external events', 'What carriers, buyers, suppliers, facilities and markets do to you. Each event lands in the inbox, the event log and notifications, and ripples to every screen.',
      '<div class="lab-card"><h4>Carrier cancels a load</h4><div class="lab-row">' + fld('ev-cancel', 'Load', '<select id="ev-cancel" class="inp">' + (cancellable.length ? opt(cancellable.map((l) => [l.id, loadLabel(state, l)])) : none('No booked loads with a carrier')) + '</select>') + V.btn('Cancel it', 'ev-cancel', { cls: 'small', icon: 'x', disabled: !cancellable.length, id: 'ev-cancel-btn' }) + '</div></div>' +
      '<div class="lab-card"><h4>Carrier reports a delay</h4><div class="lab-row">' + fld('ev-delay', 'Load', '<select id="ev-delay" class="inp">' + (moving.length ? opt(moving.map((l) => [l.id, loadLabel(state, l)])) : none('No moving loads')) + '</select>') + fld('ev-delay-m', 'Delay', '<select id="ev-delay-m" class="inp">' + opt([[30, '30 min'], [60, '1 hour'], [120, '2 hours'], [240, '4 hours']], 60) + '</select>', 'is-half') + V.btn('Delay it', 'ev-delay', { cls: 'small', icon: 'clock', disabled: !moving.length }) + '</div></div>' +
      '<div class="lab-card"><h4>Buyer revises a bid</h4><div class="lab-row">' + fld('ev-bid', 'Bid or contract', '<select id="ev-bid" class="inp">' + (openBids.length ? opt(openBids.map((d) => [d.id, d.id + ' · ' + E.party(state, d.buyer).short + ' · ' + (d.priceType === 'basis' ? d.month + ' basis ' + u.rate(d.basis) : u.rate(d.price)) + ' · ' + u.t1(d.qty) + ' t'])) : none('No open bids')) + '</select>') + fld('ev-bid-p', 'New flat price (or basis)', '<input id="ev-bid-p" class="inp num" type="number" step="0.01" placeholder="e.g. 263.00">', 'is-half') + fld('ev-bid-q', 'New quantity, t', '<input id="ev-bid-q" class="inp num" type="number" step="0.1" placeholder="unchanged">', 'is-half') + V.btn('Send revision', 'ev-bid', { cls: 'small', icon: 'mail', disabled: !openBids.length, id: 'ev-bid-btn' }) + '</div></div>' +
      '<div class="lab-card"><h4>Buyer withdraws a bid</h4><div class="lab-row">' + fld('ev-wd', 'Bid', '<select id="ev-wd" class="inp">' + (bids.length ? opt(bids.map((d) => [d.id, d.id + ' · ' + E.party(state, d.buyer).short + ' · valid to ' + V.when(d.validUntil)])) : none('No open bids')) + '</select>') + V.btn('Withdraw', 'ev-wd', { cls: 'small', icon: 'x', disabled: !bids.length, id: 'ev-wd-btn' }) + '</div></div>' +
      '<div class="lab-card"><h4>Futures or FX move</h4><div class="lab-row">' + fld('ev-fut', 'Benchmark', '<select id="ev-fut" class="inp">' + opt([['CZ26', 'CZ26 corn ' + state.benchmarks.CZ26.value.toFixed(4)], ['SX26', 'SX26 soybeans ' + state.benchmarks.SX26.value.toFixed(4)], ['USDCAD', 'USD/CAD ' + state.benchmarks.USDCAD.value.toFixed(4)]]) + '</select>') + fld('ev-fut-d', 'Move', '<select id="ev-fut-d" class="inp">' + opt([[-0.25, '−0.25'], [-0.1, '−0.10'], [-0.02, '−0.02'], [0, 'Refresh, same value'], [0.02, '+0.02'], [0.1, '+0.10'], [0.25, '+0.25']], 0.25) + '</select>', 'is-half') + V.btn('Apply', 'ev-fut', { cls: 'small', icon: 'chart', id: 'ev-fut-btn' }) + '</div><p class="lab-sub">Basis bids re-price; uncovered approved purchases mark to market in the Book.</p></div>' +
      '<div class="lab-card"><h4>Supplier revision email</h4><div class="lab-row">' + fld('ev-rev', 'Trade', '<select id="ev-rev" class="inp">' + (revTrades.length ? opt(revTrades.map((t) => [t.id, t.id + ' · ' + V.pname(t.supplier, true) + ' · ' + t.qtyLoads + ' loads, ' + (t.moisture != null ? t.moisture.toFixed(1) + '%' : '—')])) : none('No editable trades')) + '</select>') + fld('ev-rev-l', 'Loads', '<input id="ev-rev-l" class="inp num" type="number" min="1" max="60" value="' + (revTrades[0] ? Math.max(1, revTrades[0].qtyLoads - 2) : 3) + '">', 'is-half') + fld('ev-rev-m', 'Moisture, %', '<input id="ev-rev-m" class="inp num" type="number" step="0.1" value="' + (revTrades[0] && revTrades[0].moisture != null ? u.r1(revTrades[0].moisture + 0.3) : 15) + '">', 'is-half') + fld('ev-rev-lang', 'Language', '<select id="ev-rev-lang" class="inp">' + opt([['fr', 'French'], ['en', 'English']], 'fr') + '</select>', 'is-half') + V.btn('Send email', 'ev-rev', { cls: 'small', icon: 'mail', disabled: !revTrades.length, id: 'ev-rev-btn' }) + '</div></div>' +
      '<div class="lab-card"><h4>Receiving ticket arrives late</h4><div class="lab-row">' + fld('ev-late', 'Delivered load waiting for its ticket', '<select id="ev-late" class="inp">' + (late.length ? opt(late.map((l) => [l.id, loadLabel(state, l) + (l.pending && l.pending.receivingAt != null ? ' · due ' + V.when(l.pending.receivingAt) : '')])) : none('None waiting')) + '</select>') + V.btn('Deliver ticket now', 'ev-late', { cls: 'small', icon: 'file', disabled: !late.length, id: 'ev-late-btn' }) + '</div></div>' +
      '<div class="lab-card"><h4>New email in the inbox</h4><div class="lab-row">' + fld('ev-mail-p', 'From', '<select id="ev-mail-p" class="inp">' + opt(Object.values(state.parties).filter((p) => p.kind !== 'Carrier').map((p) => [p.id, p.name])) + '</select>') + fld('ev-mail-k', 'Kind', '<select id="ev-mail-k" class="inp">' + opt([['Supply offer', 'Supply offer'], ['Buyer demand', 'Buyer demand']]) + '</select>', 'is-half') + '</div>' + fld('ev-mail-b', 'Body (any language)', '<textarea id="ev-mail-b" class="inp" rows="3">Bonjour, j’aurais environ 6 voyages de maïs à Saint-Liboire pour la semaine du 2 novembre. Humidité 15,0. 239 $ la tonne à la ferme.</textarea>') + '<div class="lab-row">' + V.btn('Deliver to inbox', 'ev-mail', { cls: 'small', icon: 'inbox', id: 'ev-mail-btn' }) + '</div></div>');
  }
  function delivery(state) {
    const ls = simulable(state);
    const id = LAB.delivery && ls.some((l) => l.id === LAB.delivery) ? LAB.delivery : (ls[0] || {}).id;
    const l = id ? E.load(state, id) : null;
    if (!l) return sec('delivery', 'Delivery simulation', 'Generate scale, receiving and invoice documents for any load still waiting for them.', '<p class="muted small">No load is waiting for documents. Book loads on a trade first.</p>');
    const tr = state.trades[l.trade]; const b = E.party(state, E.demand(state, l.demand).buyer); const rule = b.rule || {};
    const on = l.docs.origin ? l.docs.origin.net : l.planned; const dm = rule.maxMoisture != null ? u.r1(rule.maxMoisture + 0.4) : 15;
    return sec('delivery', 'Delivery simulation', 'Write the origin scale ticket, the receiving ticket and the carrier invoice for any load, with your weights and grades. Reconciliation, treatments and settlement then run exactly as for LD-4072.',
      '<div class="lab-row">' + fld('sim-load', 'Load', '<select id="sim-load" class="inp" data-input="lab-load">' + opt(ls.map((x) => [x.id, loadLabel(state, x)]), id) + '</select>') + '</div>' +
      '<p class="lab-sub">' + esc(V.commodityName(tr.commodity)) + ' · planned ' + u.t1(l.planned) + ' t · ' + esc(b.short) + ': ' + esc(rule.label || '') + '</p>' +
      '<div class="lab-grid">' + fld('sim-on', 'Origin net, t', '<input id="sim-on" class="inp num" type="number" step="0.001" value="' + on.toFixed(3) + '">', 'is-half') + fld('sim-rn', 'Receiving net, t', '<input id="sim-rn" class="inp num" type="number" step="0.001" value="' + (on - 0.05).toFixed(3) + '">', 'is-half') +
      fld('sim-om', 'Origin moisture, %', '<input id="sim-om" class="inp num" type="number" step="0.1" value="' + (tr.moisture != null ? tr.moisture : '') + '">', 'is-half') + fld('sim-rm', 'Receiving moisture, %', '<input id="sim-rm" class="inp num" type="number" step="0.1" value="' + dm + '">', 'is-half') +
      fld('sim-tw', 'Test weight, lb/bu', '<input id="sim-tw" class="inp num" type="number" step="0.1" value="' + (tr.testWeight || (rule.minTestWeight ? rule.minTestWeight + 1 : 56)) + '">', 'is-half') + fld('sim-gr', 'Grade', '<input id="sim-gr" class="inp" type="text" value="' + esc(tr.grade || 'No. 2') + '">', 'is-half') +
      fld('sim-wait', 'Receiving wait, min', '<input id="sim-wait" class="inp num" type="number" step="5" value="35">', 'is-half') + fld('sim-ib', 'Carrier invoices on', '<select id="sim-ib" class="inp">' + opt([['origin', 'Origin net (correct)'], ['contract', 'Contract quantity'], ['custom', 'Custom quantity']], 'origin') + '</select>', 'is-half') +
      fld('sim-iq', 'Custom invoice quantity, t', '<input id="sim-iq" class="inp num" type="number" step="0.001" value="' + l.planned.toFixed(3) + '">', 'is-half') + '</div>' +
      '<div class="lab-row">' + V.btn('Deliver ' + l.id + ' with these documents', 'sim-delivery', { cls: 'small primary', icon: 'scale', id: 'sim-delivery' }) + '</div><p class="lab-sub">Waits over ' + D.finance.freeMins + ' min bill detention at CAD ' + D.finance.detentionPerHour + '/h. Transit loss beyond ±' + D.finance.weightTolPct + '% becomes a carrier claim.</p>');
  }
  function roles(state) {
    return sec('roles', 'Roles and authority', 'Switching roles changes what you can approve and which queue you see on Today. Segregation of duties: nobody approves the counterparty they created, and only finance approves settlements.',
      '<div class="lab-roles">' + Object.values(D.users).map((x) => '<button type="button" class="role-pill' + (x.id === state.role ? ' is-on' : '') + '" aria-pressed="' + (x.id === state.role) + '" data-act="role" data-role="' + x.id + '" id="lab-role-' + x.id + '"><span class="av">' + x.initials + '</span>' + esc(x.first) + ' · ' + esc(x.title) + ' <small>' + S.queue(x.id).length + ' in queue</small></button>').join('') + '</div>' +
      '<div class="table-wrap"><table class="mini lab-auth"><caption class="sr-only">Authority by role</caption><thead><tr><th scope="col">Authority</th>' + Object.values(D.users).map((x) => '<th scope="col">' + esc(x.first) + '</th>').join('') + '</tr></thead><tbody>' +
      [['Approve purchases', (a) => (a.trade ? 'to ' + u.n0(a.purchaseLimit / 1000) + 'k' : '—')], ['Minimum contribution', (a) => u.rate(a.minContribution) + '/t'], ['Award freight', (a) => (a.award ? 'Yes' : '—')], ['Replace a carrier', (a) => (a.replacement ? 'to CAD ' + a.replacementCap : '—')], ['Treat quality', (a) => (a.quality ? 'Yes' : '—')], ['Treat invoices, settle', (a) => (a.settlement ? 'Yes' : '—')], ['Approve credit', (a) => (a.credit ? 'Yes' : '—')], ['Approve policy', (a) => (a.policy ? 'Yes' : '—')]].map((r) => '<tr><th scope="row">' + r[0] + '</th>' + Object.keys(D.users).map((k) => '<td>' + esc(r[1](D.authority[k])) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
  }
  function caps() {
    const c = u.caps;
    const t = (k, label, sub) => '<label class="lab-tog"><input type="checkbox" data-input="cap" data-k="' + k + '"' + (c[k] ? ' checked' : '') + ' id="cap-' + k + '"><span><strong>' + esc(label) + '</strong><small>' + esc(sub) + '</small></span></label>';
    return sec('caps', 'Capability toggles', 'Switch browser and network capabilities off to test the fallbacks. Toggles last until you reload.',
      t('liveAi', 'Live AI allowed', 'Off: every “Read with live AI” falls back to rules, even with a key.') + t('offline', 'Offline', 'On: carrier, facility and accounting requests are refused; decisions you made are kept.') + t('clipboard', 'Clipboard available', 'Off: copy buttons explain how to copy by hand.') + t('crypto', 'SubtleCrypto available', 'Off: BOL checksums fall back to FNV-1a, labelled as such.') + t('storage', 'Save to this browser', 'Off: nothing is written to localStorage.'));
  }
  function ai() {
    /* Keys, budgets and killswitches live on the hub's API monitor; this demo only shows the state. */
    return sec('ai', 'Live AI (optional)', 'Reads pasted or received emails with the model chosen on the hub’s API page (' + (window.LiveAI ? window.LiveAI.model : 'OpenRouter') + ') and drafts replies, metered under “tradedesk”. Off without a key; the demo stays fully usable on rules.', '<div id="lab-ai-host" class="lab-ai">' + V.aiStatus({ id: 'ai-status-lab', label: true }) + '<a class="btn small" href="../../index.html#api">' + icon('chart', 15) + '<span>API monitor</span></a></div><p class="lab-sub">Cost and privacy: the message text and the counterparty list go to ' + (window.LiveAI && window.LiveAI.provider === 'anthropic' ? 'the Anthropic API' : 'OpenRouter and the model it routes to') + '. Every call is checked against the monitor’s budgets and killswitches first, and recorded there.</p>');
  }
  function workspace(state) {
    const inv = E.invariants(state);
    return sec('ws', 'Workspace', 'Download the whole test state as JSON, re-import it later or on another machine, or start over.',
      '<div class="lab-row">' + V.btn('Export JSON', 'ws-export', { cls: 'small', icon: 'download', id: 'ws-export' }) + '<label class="btn small file-btn">' + icon('upload', 15) + '<span>Import JSON</span><input type="file" accept="application/json,.json" data-input="ws-import" id="ws-import"></label>' + V.btn('Reset to Friday morning', 'reset', { cls: 'small ghost', icon: 'reset', id: 'ws-reset' }) + (S.undoCount() ? V.btn('Undo: ' + S.undoLabel(), 'undo', { cls: 'small ghost', icon: 'back', id: 'ws-undo' }) : '') + '</div>' +
      '<h4>Invariants</h4><ul class="checks">' + inv.checks.map((c) => '<li class="' + (c.ok ? 'is-ok' : 'is-block') + '">' + icon(c.ok ? 'check' : 'x', 15) + '<span>' + esc(c.text) + '</span></li>').join('') + '</ul>' + (inv.notes.length ? '<p class="small neg">' + esc(inv.notes.join('; ')) + '</p>' : '') +
      '<p class="lab-sub">' + Object.keys(state.trades).length + ' trades, ' + state.loads.length + ' loads, ' + state.demands.length + ' bids and contracts, ' + Object.keys(state.parties).length + ' counterparties, ' + state.events.length + ' events. Saved under “' + D.storageKey + '”.</p>');
  }
  function log(state) {
    const q = (LAB.logQ || '').toLowerCase(); const k = LAB.logKind;
    const kinds = [...new Set(state.events.map((e) => e.kind))].sort();
    const list = state.events.filter((e) => (!k || e.kind === k) && (!q || (e.text + ' ' + e.ref + ' ' + e.who).toLowerCase().includes(q))).slice(-200).reverse();
    return sec('log', 'Event log', 'Every action and external event, newest first. Notifications are the subset marked for attention.',
      '<div class="lab-row">' + fld('log-q', 'Filter', '<input id="log-q" class="inp" type="search" value="' + esc(LAB.logQ || '') + '" placeholder="LD-4093, Bérard, expired…" data-input="log-q">') + fld('log-k', 'Kind', '<select id="log-k" class="inp" data-input="log-k"><option value="">All kinds</option>' + opt(kinds.map((x) => [x, x]), k) + '</select>', 'is-half') + '</div>' +
      '<ol class="lab-log">' + list.map((e) => { const href = V.refHref(state, e.ref); return '<li class="' + (e.notify ? 'is-notify' : '') + '"><time class="num">' + esc(u.dayShort(e.at).slice(4)) + ' ' + u.hhmm(e.at % 1440) + '</time><span class="lk">' + esc(e.kind) + '</span><div><p>' + esc(e.text) + '</p><small>' + esc(e.who) + (e.ref ? ' · ' + (href ? '<a href="' + href + '" data-act="lab-go">' + esc(e.ref) + '</a>' : esc(e.ref)) : '') + '</small></div></li>'; }).join('') + '</ol>' + (!list.length ? '<p class="muted small">No events match.</p>' : ''));
  }

  V.lab = function (state) {
    const nav = [['clock', 'Clock'], ['scen', 'Scenarios'], ['events', 'Events'], ['delivery', 'Delivery'], ['roles', 'Roles'], ['caps', 'Capabilities'], ['ai', 'Live AI'], ['ws', 'Workspace'], ['log', 'Event log']];
    return '<div class="lab"><div class="lab-head"><div><p class="lab-kicker">' + icon('flask', 14) + ' Demo tooling, not part of TradeDesk</p><h2 id="lab-title">Test lab</h2></div><button type="button" class="icon-btn" data-act="close-dialog" aria-label="Close the Test lab">' + icon('x', 18) + '</button></div>' +
      '<nav class="lab-nav" aria-label="Test lab sections">' + nav.map((n) => '<a href="#lab-' + n[0] + '" data-act="lab-jump" data-sec="' + n[0] + '">' + n[1] + '</a>').join('') + '</nav>' +
      '<div class="lab-body">' + clock(state) + scenarios() + inject(state) + delivery(state) + roles(state) + caps() + ai() + workspace(state) + log(state) + '</div></div>';
  };
  function simulable(state) { return state.loads.filter((l) => !['cancelled', 'reconciled', 'settled'].includes(l.status) && l.carrier && !(l.docs.origin && l.docs.receiving && l.docs.invoice) && !(l.exception && state.exceptions[l.exception] && state.exceptions[l.exception].status !== 'resolved')); }
  V.labDeliveryId = function (state) { const ls = simulable(state); return LAB.delivery && ls.some((l) => l.id === LAB.delivery) ? LAB.delivery : (ls[0] || {}).id; };
})();
