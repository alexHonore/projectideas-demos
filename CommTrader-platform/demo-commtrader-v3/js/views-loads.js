/* TradeDesk V3 — Loads control tower (CT-15) and incident recovery (CT-16), generic for every load. */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});
  const D = TD.DATA; const u = TD.u; const E = TD.engine; const S = TD.store;
  const { esc, icon } = u;
  const V = TD.views;

  const ORDER = ['booked', 'loading', 'transit', 'delivered', 'reconciled', 'settled'];
  const LABEL = { booked: 'Booked', loading: 'Loading', transit: 'In transit', delivered: 'Delivered', reconciled: 'Reconciled', settled: 'Settled' };
  const buyerOf = (state, l) => E.party(state, E.demand(state, l.demand).buyer);
  function lane(state, l) { const tr = state.trades[l.trade]; return esc(tr.origin) + ' → ' + esc(E.destTown(state, E.demand(state, l.demand))); }
  /* Carrier quotes read from emails: standing on a lane, attached, awarded or lapsed. */
  function quotesPanel(state) {
    const list = Object.values(state.fquotes || {}).sort((a, b) => b.createdAt - a.createdAt);
    if (!list.length) return '';
    const stc = (fq) => fq.status === 'awarded' ? V.chip('booked', 'Awarded') : fq.validUntil != null && state.now > fq.validUntil ? V.chip('expired', 'Lapsed ' + V.when(fq.validUntil)) : fq.status === 'attached' ? V.chip('ok', 'In a comparison') : V.chip('indicative', 'Standing on the lane');
    return '<section class="panel" aria-labelledby="fq-h" id="fq-panel"><div class="panel-head"><h2 id="fq-h">Carrier quotes from emails</h2>' + V.chip('ok', list.length + ' on file') + '</div><div class="table-wrap"><table class="mini"><caption class="sr-only">Carrier quotes read from messages</caption><thead><tr><th scope="col">Quote</th><th scope="col">Lane and pickup</th><th scope="col" class="r">Rate</th><th scope="col">Status</th><th scope="col">Used in</th></tr></thead><tbody>' +
      list.map((fq) => { const c = E.party(state, fq.carrier) || {}; return '<tr id="fq-' + esc(fq.id) + '"><th scope="row">' + esc(fq.id) + '<small>' + V.partyLink(fq.carrier) + (c.status !== 'Approved' ? ' ' + V.chip('pending') : '') + '</small></th><td>' + esc(fq.from + ' → ' + fq.to) + '<small>' + esc(fq.pickupAt != null ? 'Pickup ' + V.when(fq.pickupAt) : 'Pickup not stated') + (fq.equipment ? ' · ' + esc(fq.equipment) : '') + (fq.payload ? ' ' + fq.payload + ' t' : '') + '</small></td><td class="r num">' + esc(E.fqBasisLabel(fq)) + '<small>' + (fq.rateBasis !== 't' ? esc(E.fqConversion(state, fq, fq.payload || 38.5, null)) : '') + '</small></td><td>' + stc(fq) + '<small>' + (fq.validUntil != null ? 'Valid to ' + esc(V.when(fq.validUntil)) : 'No validity stated') + '</small></td><td class="small">' + (fq.attached.length ? fq.attached.map((a) => { const h = a.type === 'load' ? '#/load/' + a.load : '#/trade/' + a.trade + '/' + (a.approved ? 'freight' : 'price'); return '<a href="' + h + '">' + esc(a.type === 'load' ? a.load : a.trade + ' → ' + a.demand) + '</a>'; }).join(', ') : 'Offered to lots on this lane and day') + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="small muted">Each quote keeps the email it came from. It lapses on the demo clock at its stated validity.</p></section>';
  }
  const exOpen = (state, l) => !!(l.exception && state.exceptions[l.exception] && state.exceptions[l.exception].status !== 'resolved');

  /* ---------- Incident card with prepared alternatives (any exception) ---------- */
  function incident(state, ex, compact) {
    const l = E.load(state, ex.load); const tr = state.trades[l.trade];
    const b = buyerOf(state, l);
    const q = E.quotedLoadLines(state, l);
    const atRisk = q ? E.contrib(q) : 0;
    /* Once approved, the decision is frozen: show the option as it was when approved, not a live re-quote. */
    const frozen = ex.status !== 'open' && ex.chosen;
    const opts = frozen ? [Object.assign({}, ex.chosen, { expired: false, recommended: false })] : E.exceptionOptions(state, ex);
    const chosen = frozen ? opts[0] : opts.find((o) => o.id === ex.option) || opts.find((o) => o.recommended) || null;
    const r = E.snapRates(state, l) || {};
    const optsHtml = opts.map((o) => {
      const p = E.party(state, o.carrier);
      if (o.declined) return '<li><div class="opt is-blocked"><span></span><span class="opt-main"><strong>' + esc(p.name) + ' ' + V.chip('expired', 'Declined') + '</strong><small>' + esc(o.note) + '</small></span></div></li>';
      const after = atRisk - o.extra;
      const perT = r.price != null ? u.r2(r.price - r.purchase - o.rate - (r.quality || 0) - (r.financing || 0) - (r.admin || 0)) : null;
      const sel = chosen && chosen.id === o.id;
      const dis = ex.status !== 'open';
      return '<li><label class="opt' + (sel ? ' is-sel' : '') + (o.block || o.expired ? ' is-blocked' : '') + '"><input type="radio" name="exopt-' + ex.id + '" value="' + o.id + '" data-input="exopt" data-ex="' + ex.id + '"' + (sel ? ' checked' : '') + (dis ? ' disabled' : '') + '>' +
        '<span class="opt-main"><strong>' + esc(p.name) + (o.recommended ? V.chip('new', 'Recommended') : '') + (o.expired ? V.chip('expired', 'Quote expired') : '') + (o.block ? V.chip('blocked', o.contractChange ? 'Contract change' : 'Needs verification') : '') + (o.deferred ? V.chip('warn', 'Next receiving day') : '') + '</strong>' +
        '<small>At pickup ' + esc(V.when(o.arrive)) + '. ' + p.perf.onTime + ' of ' + p.perf.loads + ' loads on time' + (p.perf.loads < 10 ? ' (too few for a rate)' : '') + '. Quote ' + u.rate(o.rate) + '/t, ' + (o.expired ? 'expired ' : 'valid until ') + esc(V.when(o.validUntil)) + '.</small>' + (o.block ? '<small class="neg">' + esc(o.block) + '</small>' : '') + (o.note ? '<small class="warn-t">' + esc(o.note) + '</small>' : '') + '</span>' +
        '<span class="opt-nums num"><span>+' + u.rate(o.rate - (frozen && l.originalRate != null ? l.originalRate : l.rate)) + '/t</span><small>+' + u.money(o.extra) + ' total</small><span>ETA ' + esc(u.hhmm(o.deliverAt % 1440)) + '</span><small class="' + (o.buffer < 30 ? 'neg' : '') + '">' + (o.buffer >= 0 ? o.buffer + ' min before cutoff' : Math.abs(o.buffer) + ' min after cutoff') + '</small><span>' + (perT != null ? u.rate(perT) + '/t' : '—') + '</span><small>' + u.money(after) + ' kept</small></span></label></li>';
    }).join('');
    let actions;
    const auth = D.authority[state.role]; const usr = D.users[state.role];
    if (ex.status === 'open') {
      const ok = chosen && !chosen.expired && (!chosen.block || (chosen.contractChange && auth.amend)) && !chosen.declined;
      const capOk = auth.replacement && chosen && chosen.extra <= u.toCents(auth.replacementCap);
      actions = '<div class="row-actions">' + V.btn(chosen ? 'Approve ' + u.cad(chosen.extra) + ' additional ' + (chosen.extraC ? 'cost' : 'freight') : 'No eligible option', 'ex-approve', { cls: 'primary', icon: 'check', disabled: !ok || !capOk, id: compact ? 'ex-approve-' + ex.id : 'ex-approve', data: { ex: ex.id } }) + V.btn('Re-quote all carriers', 'ex-requote', { cls: 'ghost', icon: 'refresh', data: { ex: ex.id }, id: 'ex-requote-' + ex.id }) + (!capOk && chosen && auth.replacement ? V.btn('Switch to the desk manager', 'role', { cls: 'small ghost', data: { role: 'manager' } }) : '') + '</div>' +
        '<p class="small muted">Acting as ' + esc(usr.name) + ' (' + esc(usr.title) + '): ' + (!auth.replacement ? 'cannot approve replacements.' : chosen && capOk ? 'within your replacement cap of CAD ' + auth.replacementCap + ' per load.' : 'above your cap of CAD ' + auth.replacementCap + '; route to the desk manager.') + ' Everything is revalidated before execution.' + (ex.quotesExpiredAt ? ' Quotes expired ' + esc(V.when(ex.quotesExpiredAt)) + ': re-quote first.' : '') + '</p>';
    } else if (ex.status === 'resolved') {
      const carrier = E.party(state, l.carrier);
      actions = '<p class="callout tone-leaf">' + icon('check', 16) + '<span><strong>Resolved ' + esc(V.when(ex.resolvedAt)) + ' with evidence:</strong> ' + esc(carrier ? carrier.name : 'the replacement carrier') + ' accepted (simulated reply). Contribution kept: ' + u.cad(atRisk - (ex.extra || 0)) + ' of ' + u.cad(atRisk) + '.</span></p>';
    } else {
      actions = '<p class="dcard-progress" role="status"><span class="spinner" aria-hidden="true"></span>' + (ex.status === 'revalidating' ? 'Revalidating before anything is sent…' : 'Request sent to ' + esc(E.party(state, (ex.chosen || {}).carrier || '').name || 'the carrier') + ' (simulated). Not resolved until acceptance is evidenced.') + '</p>';
    }
    const c = ex.chosen;
    const checks = ex.status === 'open' || !c ? '' : '<ul class="checks">' + [['Insurance current', (E.party(state, c.carrier) || {}).insurance || 'On file'], ['Qualified for feed grain', 'Approved bulk carrier, food-grade wash log'], ['Quote still valid', 'Valid to ' + V.when(c.validUntil) + '; approved ' + V.when(ex.approvedAt)], ['Payload', u.t1(l.planned) + ' t within the declared B-train limit'], ['Terms', c.contractChange ? 'Buyer amendment: late allowance CAD ' + u.rate(D.finance.lateAllowance) + '/t' : c.deferred ? 'Same terms; unloads the next receiving day' : 'Same buyer, window and price'], ['Cutoff', 'ETA ' + V.when(c.deliverAt) + (c.buffer >= 0 ? ', ' + c.buffer + ' min before the cutoff' : '')]].map((x) => '<li class="is-ok">' + icon('check', 15) + '<span><strong>' + x[0] + '.</strong> ' + esc(x[1]) + '</span></li>').join('') + '</ul>';
    const replay = '<ol class="replay" aria-label="Incident replay">' + (ex.events || []).map((e) => '<li><time class="num">' + u.hhmm(e.at % 1440) + '</time><span>' + esc(e.text) + '</span></li>').join('') + '</ol>';
    const sup = E.party(state, tr.supplier) || {}; const fr = (sup.lang || 'fr') === 'fr';
    const update = l.carrier ? (fr ? 'Bonjour ' + (sup.contact || '').split(' ')[0] + ' et ' + (b.contact || '').split(' ')[0] + ',\nLe voyage ' + l.id + ' (' + (D.commodities[tr.commodity] || {}).fr + ', ' + String(u.t1(l.planned)).replace('.', ',') + ' t) sera fait par ' + E.party(state, l.carrier).name + '.\nChargement à ' + u.hhmm(l.pickupAt % 1440) + ', arrivée prévue à ' + b.town + ' vers ' + u.hhmm(l.etaAt % 1440) + (Math.floor(l.etaAt / 1440) !== Math.floor(l.pickupAt / 1440) ? ' (' + u.dayShort(l.etaAt) + ')' : '') + '.\n' + D.users.logistics.first : 'Hi ' + (sup.contact || '').split(' ')[0] + ' and ' + (b.contact || '').split(' ')[0] + ',\nLoad ' + l.id + ' (' + V.commodityName(tr.commodity).toLowerCase() + ', ' + u.t1(l.planned) + ' t) is now with ' + E.party(state, l.carrier).name + '.\nPickup ' + u.hhmm(l.pickupAt % 1440) + ', arriving ' + b.town + ' around ' + u.hhmm(l.etaAt % 1440) + '.\n' + D.users.logistics.first) : '';
    return '<section class="panel incident" id="incident-' + ex.id + '" aria-labelledby="inc-h-' + ex.id + '"><div class="panel-head"><h2 id="inc-h-' + ex.id + '">' + esc(ex.id) + ' · Carrier cancelled ' + esc(l.id) + '</h2>' + V.chip(ex.status === 'resolved' ? 'resolved' : 'high', ex.status === 'resolved' ? 'Resolved' : 'High') + '</div>' +
      '<p>' + esc(ex.cause) + ' ' + esc(V.commodityName(tr.commodity)) + ', ' + esc(lane(state, l).replace(/&gt;/g, '>')) + ', pickup ' + esc(V.when(l.pickupAt)) + '; ' + esc(b.short) + ' cutoff ' + esc(V.when(l.cutoffAt)) + '. Owner: ' + esc(ex.owner || D.users.logistics.name) + '. Contribution at risk: <strong>' + u.cad(atRisk) + '</strong>.</p>' +
      (ex.pickupMissed && ex.status === 'open' ? '<p class="callout tone-brick small">' + icon('clock', 15) + '<span>The pickup time passed with no carrier' + (ex.cutoffMissed ? ' and the receiving cutoff is gone: options now deliver the next receiving day or need a buyer amendment.' : '.') + '</span></p>' : '') +
      (compact ? '' : '<h3 class="h3">' + (frozen ? 'Approved alternative, as quoted at approval' : 'Prepared alternatives') + '</h3>') + '<ul class="opts" role="radiogroup" aria-label="Replacement options">' + optsHtml + '</ul>' + actions + checks +
      (compact ? (ex.status === 'open' ? '' : V.link('Open ' + l.id, '#/load/' + l.id, 'small ghost')) : '<h3 class="h3">Incident replay</h3>' + replay) +
      (ex.status === 'resolved' && !compact && update ? '<h3 class="h3">Coordinated update, drafted once for everyone</h3><pre class="reply-body" lang="' + (fr ? 'fr' : 'en') + '" id="update-' + l.id + '">' + esc(update) + '</pre>' + V.btn('Copy update', 'copy-update', { cls: 'small', icon: 'copy', data: { id: l.id } }) : '') + '</section>';
  }
  V.incident = incident;

  /* ---------- Board ---------- */
  V.loads = function (state) {
    const filter = state.ui.loadFilter || 'all';
    const day = Math.floor(state.now / 1440);
    const loads = state.loads.filter((l) => l.status !== 'cancelled');
    const counts = {}; ORDER.forEach((s) => { counts[s] = loads.filter((l) => l.status === s).length; });
    const open = Object.values(state.exceptions).filter((x) => x.status !== 'resolved');
    const match = (l) => filter === 'all' || (filter === 'today' && (Math.floor(l.pickupAt / 1440) === day || Math.floor(l.etaAt / 1440) === day)) || (filter === 'next' && l.pickupAt > state.now && l.pickupAt < state.now + 7 * 1440) || (filter === 'evidence' && l.status === 'delivered') || (filter === 'cancelled' && l.status === 'cancelled');
    const shown = (filter === 'cancelled' ? state.loads : loads).filter(match).sort((a, b) => a.pickupAt - b.pickupAt);
    const tally = '<ul class="tally">' + ORDER.map((s) => '<li><strong class="num">' + counts[s] + '</strong><span>' + LABEL[s] + '</span></li>').join('') + '<li class="tally-sum"><strong class="num">' + loads.length + '</strong><span>active loads</span></li></ul>';
    const days = [...new Set(shown.map((l) => Math.floor(l.pickupAt / 1440)))];
    const rows = days.map((d) => '<tbody><tr class="grp"><th scope="rowgroup" colspan="7">' + esc(d === day ? 'Today, ' + u.dayShort(d * 1440) : u.dayShort(d * 1440)) + '</th></tr>' + shown.filter((l) => Math.floor(l.pickupAt / 1440) === d).map((l) => {
      const tr = state.trades[l.trade]; const isEx = exOpen(state, l);
      const nm = S.nextMilestone(l.id);
      const f = E.findings(state, l);
      const act = isEx ? V.link('Resolve', '#/load/' + l.id, 'small primary') : f.ready && !l.recon.ack && l.status !== 'cancelled' ? V.link('Reconcile', '#/settle/' + l.id, 'small') : nm ? V.btn('Record: ' + nm.label.replace('Record ', ''), 'advance', { cls: 'small ghost', data: { id: l.id } }) : '';
      const b = buyerOf(state, l);
      return '<tr class="' + (isEx ? 'is-ex' : '') + '" id="row-' + l.id + '"><th scope="row"><a href="#/load/' + l.id + '">' + u.kernel(tr.commodity, 12) + l.id + '</a><small>' + l.trade + '</small></th><td>' + lane(state, l) + '<small>' + esc(V.pname(tr.supplier, true)) + ' to ' + esc(b.short) + '</small></td>' +
        '<td>' + esc(l.carrier ? E.party(state, l.carrier).short : '—') + (l.unit ? '<small>' + esc(l.unit) + '</small>' : '') + '</td><td class="r num">' + (l.docs.receiving ? u.t3(l.docs.receiving.net) : l.docs.origin ? u.t3(l.docs.origin.net) : u.t1(l.planned)) + ' t<small>' + (l.docs.receiving ? 'received' : l.docs.origin ? 'origin ticket' : 'planned') + '</small></td>' +
        '<td>' + V.loadChip(state, l) + (l.bolMissing ? V.chip('warn', 'BOL missing') : '') + (l.claim ? V.chip('disputed', 'Claim ' + l.claim) : '') + (l.missedCutoff ? V.chip('warn', 'Missed cutoff') : '') + (l.status === 'transit' && l.etaAt > l.cutoffAt && !l.missedCutoff ? V.chip('warn', 'Late for cutoff') : '') + '</td>' +
        '<td class="small">' + (['booked', 'loading', 'transit'].includes(l.status) ? 'ETA ' + esc(V.when(l.etaAt)) + ' · closes ' + u.hhmm(l.cutoffAt % 1440) + '<br>' : '') + esc(l.lastUpdate || (l.status === 'booked' ? 'Booked · pickup ' + V.when(l.pickupAt) : '')) + '</td><td class="actc">' + act + '</td></tr>';
    }).join('') + '</tbody>').join('');
    const fbtn = (k, t) => '<button type="button" data-act="load-filter" data-f="' + k + '" aria-pressed="' + (filter === k) + '">' + t + '</button>';
    return V.band('<div class="page-head"><div><h1>Loads</h1><p>Exceptions first, then every load. Each row shows where its last update came from: manual check-ins and simulated carrier messages, not GPS. Move the demo clock to watch loads roll.</p></div>' + V.btn('Advance 1 hour', 'clock-adv', { cls: 'ghost on-dark', icon: 'clock', data: { m: 60 }, id: 'loads-adv' }) + '</div>' + tally, 'band-page') +
      '<div class="wrap">' + (open.length ? open.map((ex) => incident(state, ex, true)).join('') : '<p class="callout tone-leaf">' + icon('check', 16) + '<span>No open incidents. Inject a carrier cancellation from the Test lab to test recovery on any booked load.</span></p>') +
      '<section class="panel" aria-labelledby="bd-h"><div class="panel-head"><h2 id="bd-h">Board</h2><div class="seg-ctl" role="group" aria-label="Filter loads">' + fbtn('all', 'All') + fbtn('today', 'Today') + fbtn('next', 'Next 7 days') + fbtn('evidence', 'Awaiting evidence') + fbtn('cancelled', 'Cancelled') + '</div></div>' +
      '<div class="table-wrap"><table class="board"><caption class="sr-only">Loads by pickup day</caption><thead><tr><th scope="col">Load</th><th scope="col">Lane</th><th scope="col">Carrier</th><th scope="col" class="r">Tonnes</th><th scope="col">Status</th><th scope="col">ETA and last update</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead>' + (rows || '<tbody><tr><td colspan="7" class="muted">No loads match this filter.</td></tr></tbody>') + '</table></div>' +
      '<p class="small muted">Counts above reconcile to the ' + loads.length + ' active rows in “All”. Out-of-order updates cannot move a delivered load back.</p></section>' + quotesPanel(state) + '</div>';
  };

  /* ---------- Load detail ---------- */
  function milestones(state, l) {
    const done = (s) => ORDER.indexOf(l.status) >= ORDER.indexOf(s);
    const steps = [['Booked', true, 'Carrier accepted, appointments confirmed'], ['At pickup / loading', done('loading'), 'Pickup ' + V.when(l.pickupAt)], ['Departed with origin ticket', done('transit'), l.docs.origin ? l.docs.origin.ref + ', ' + u.t3(l.docs.origin.net) + ' t net' + (l.departAt != null ? ', ' + V.when(l.departAt) : '') : ''], ['Delivered', done('delivered'), (l.missedCutoff ? 'Missed the cutoff; unloaded ' : 'ETA ') + V.when(l.etaAt)], ['Receiving ticket', !!l.docs.receiving, l.docs.receiving ? l.docs.receiving.ref + ', ' + u.t3(l.docs.receiving.net) + ' t net' : l.pending && l.pending.receivingAt != null ? 'Expected ' + V.when(l.pending.receivingAt) : 'Pending'], ['Carrier invoice', !!l.docs.invoice, l.docs.invoice ? l.docs.invoice.ref + ', ' + u.t3(l.docs.invoice.qty) + ' t' : l.pending && l.pending.invoiceAt != null ? 'Expected ' + V.when(l.pending.invoiceAt) : 'Pending'], ['Reconciled', done('reconciled'), l.recon.approved ? 'Approved by ' + l.recon.approved.by : ''], ['Settled', l.status === 'settled', l.recon.ack ? l.recon.ack.id : '']];
    return '<ol class="miles">' + steps.map((s) => '<li class="' + (s[1] ? 'is-done' : '') + '"><span class="mi-dot" aria-hidden="true">' + (s[1] ? icon('check', 11) : '') + '</span><div><strong>' + s[0] + '</strong><small>' + esc(s[2]) + '</small></div></li>').join('') + '</ol>';
  }
  V.load = function (state, route) {
    const l = state.loads.find((x) => x.id === route.id);
    if (!l) return V.band('<div class="page-head"><div><h1>Load not found</h1></div></div>', 'band-page') + '<div class="wrap">' + V.link('All loads', '#/loads', 'small') + '</div>';
    const tr = state.trades[l.trade]; const b = buyerOf(state, l);
    const q = E.quotedLoadLines(state, l); const c = E.currentLoadLines(state, l);
    const ex = l.exception ? state.exceptions[l.exception] : Object.values(state.exceptions).find((x) => x.load === l.id);
    const nm = S.nextMilestone(l.id);
    const f = E.findings(state, l);
    const head = '<a class="crumb" href="#/loads">' + icon('back', 14) + 'Loads</a><div class="page-head"><div><p class="tr-id">' + u.kernel(tr.commodity, 16) + l.id + V.loadChip(state, l) + '</p><h1>' + lane(state, l) + '</h1><ul class="facts"><li>' + esc(V.commodityName(tr.commodity)) + '</li><li>' + u.t1(l.planned) + ' t planned</li><li>' + esc(l.carrier ? E.party(state, l.carrier).name : 'No carrier') + (l.unit ? ', ' + esc(l.unit) : '') + '</li><li>Pickup ' + esc(V.when(l.pickupAt)) + '</li><li><a href="#/trade/' + tr.id + '">' + tr.id + '</a></li></ul></div></div>' + V.thread(state, tr, { labels: true, dark: true });
    const ctx = '<section class="panel" aria-labelledby="ctx-h"><div class="panel-head"><h2 id="ctx-h">Trade context</h2>' + V.link(tr.id, '#/trade/' + tr.id, 'small ghost') + '</div><dl class="kv"><div><dt>Supplier</dt><dd>' + V.partyLink(tr.supplier) + '</dd></div><div><dt>Buyer</dt><dd>' + V.partyLink(b.id) + ' · ' + esc(l.demand) + '</dd></div><div><dt>Carrier</dt><dd>' + (l.carrier ? V.partyLink(l.carrier) : V.chip('open', 'None')) + (l.replacedFrom ? ' (replaced ' + esc(E.party(state, l.replacedFrom).short) + ')' : '') + '</dd></div><div><dt>Freight</dt><dd class="num">CAD ' + u.rate(l.rate) + '/t' + (l.originalRate ? ' (was ' + u.rate(l.originalRate) + ')' : '') + (l.extraNote ? ' · ' + esc(l.extraNote) : '') + '</dd></div><div><dt>Receiving</dt><dd>' + esc(V.hoursLabel(b.hours || { days: [1, 2, 3, 4, 5], open: 420, close: 960 })) + ' · cutoff ' + esc(V.when(l.cutoffAt)) + '</dd></div><div><dt>Quality terms</dt><dd>' + esc((b.rule || {}).label || '—') + '</dd></div>' +
      (q ? '<div><dt>Contribution, this load</dt><dd class="num">Quoted ' + u.money(E.contrib(q)) + ' · current ' + u.money(E.contrib(c)) + '</dd></div>' : '') + '<div><dt>Last update</dt><dd>' + esc(l.lastUpdate || '—') + '</dd></div></dl>' +
      '<div class="row-actions">' + (nm && (D.authority[state.role].milestones || state.role === 'trader') ? V.btn(nm.label, 'advance', { cls: 'small', data: { id: l.id }, icon: 'check', id: 'advance-' + l.id }) : '') +
      (l.status === 'booked' && !exOpen(state, l) ? V.btn('Cancel this load', 'cancel-load', { cls: 'small ghost', icon: 'x', data: { id: l.id }, id: 'cancel-load' }) : '') +
      (f.ready && !l.recon.ack ? V.link('Open reconciliation', '#/settle/' + l.id, 'small primary', 'scale') : '') +
      (l.status !== 'cancelled' && !['reconciled', 'settled'].includes(l.status) && l.carrier && !(l.docs.origin && l.docs.receiving && l.docs.invoice) ? V.btn('Simulate in Test lab', 'lab', { cls: 'small ghost', icon: 'flask', data: { sec: 'delivery', id: l.id } }) : '') + '</div>' +
      (l.bolMissing ? '<label class="btn small file-btn">' + icon('upload', 15) + '<span>Attach BOL photo</span><input type="file" accept="image/*,.pdf" data-input="bol" data-id="' + l.id + '"></label>' : state.bol[l.id] ? '<p class="small">' + icon('check', 14) + ' BOL attached: ' + esc(state.bol[l.id].name) + ', ' + (/^fnv/.test(state.bol[l.id].hash) ? 'FNV-1a ' : 'SHA-256 ') + esc(state.bol[l.id].hash.slice(0, 16)) + '…</p>' : '') + '</section>';
    const docs = l.docs.origin || l.docs.receiving || l.docs.invoice ? '<section class="panel" aria-labelledby="dk-h"><div class="panel-head"><h2 id="dk-h">Documents</h2>' + (Object.values(l.docs).some((d) => d && d.simulated) ? V.chip('simulated', 'Simulated') : '') + '</div><ul class="appts">' + [['Origin scale ticket', l.docs.origin, (d) => u.t3(d.net) + ' t net' + (d.moisture != null ? ', ' + d.moisture.toFixed(1) + '% moisture' : '')], ['Receiving ticket', l.docs.receiving, (d) => u.t3(d.net) + ' t net, ' + (d.moisture != null ? d.moisture.toFixed(1) + '%' : '—') + (d.wait ? ', waited ' + d.wait + ' min' : '')], ['Carrier invoice', l.docs.invoice, (d) => u.t3(d.qty) + ' t × ' + u.rate(d.rate) + (d.detention ? ' + detention ' + u.rate(d.detention) : '')]].map((x) => '<li><span><strong>' + x[0] + (x[1] ? ' ' + esc(x[1].ref) : '') + '</strong><small>' + (x[1] ? esc(x[2](x[1])) + ' · ' + esc(x[1].issuer || '') : 'Not received yet') + '</small></span>' + (x[1] ? V.chip('ok', 'In') : V.chip('planned', 'Waiting')) + '</li>').join('') + '</ul></section>' : '';
    const left = (ex ? incident(state, ex, false) : '') + '<section class="panel" aria-labelledby="ms-h"><div class="panel-head"><h2 id="ms-h">Milestones</h2>' + V.chip('simulated', 'Manual and simulated updates') + '</div>' + milestones(state, l) + '<p class="small muted">Event time and receipt time are stored separately. No GPS feed: absent tracking never implies a live position.</p></section>';
    return V.band(head, 'band-page band-trade') + '<div class="wrap two load-grid"><div>' + left + '</div><div>' + ctx + docs + '</div></div>';
  };
})();
