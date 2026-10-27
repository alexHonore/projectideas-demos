/* TradeDesk V3 — Trades list and the trade workbench: lot → priced → approved → freight → P&L.
   Every trade, seeded or created, runs through the same screens. */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});
  const D = TD.DATA; const u = TD.u; const E = TD.engine; const S = TD.store;
  const { esc, icon } = u;
  const V = TD.views;

  /* ---------------- Trades list ---------------- */
  function buyersOf(state, t) {
    const alloc = t.approval && t.approval.valid ? t.approval.snapshot.alloc : t.alloc || {};
    const ks = Object.keys(alloc).filter((k) => alloc[k]);
    return ks.length ? ks.map((k) => (E.party(state, (E.demand(state, k) || {}).buyer) || {}).short).join(', ') : (t.approval && t.approval.valid ? 'not yet sold' : 'buyer not chosen');
  }
  function trow(state, t) {
    const p = E.tradePnl(state, t);
    const s = V.stageOf(state, t);
    const qty = u.r2((t.qtyLoads || 0) * (t.payload || 0));
    return '<li><a class="trow" href="#/trade/' + t.id + '" id="trow-' + t.id + '"><span class="trow-id">' + u.kernel(t.commodity, 16) + '<strong>' + t.id + '</strong>' + (t.isNew ? V.chip('new', 'New') : '') + V.lotChip(t) + '</span>' +
      '<span class="trow-what"><strong>' + esc(V.tradeTitle(t)) + '</strong><small>' + esc(t.origin || 'Origin unknown') + ' to ' + esc(buyersOf(state, t)) + (qty ? ' · ' + t.qtyLoads + ' loads, ' + u.t1(qty) + ' t' : '') + '</small></span>' +
      '<span class="trow-thread">' + V.thread(state, t) + '<small>' + (s.blocked ? '<span class="neg">' + esc(s.note) + '</span>' : esc(s.done >= 8 ? 'Settled' : (s.note ? s.note + ' · ' : '') + 'Next: ' + V.STAGES[Math.min(s.done, 7)])) + '</small></span>' +
      '<span class="trow-pnl num">' + (p.has ? '<span>' + u.money(p.current) + '</span><small>current, quoted ' + u.money(p.quoted) + '</small>' : '<span class="muted">—</span><small>' + (t.approval && t.approval.valid ? 'open long, no sale priced' : 'not approved') + '</small>') + '</span></a></li>';
  }
  V.trades = function (state) {
    const all = Object.values(state.trades).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || b.id.localeCompare(a.id));
    const st = (t) => V.stageOf(state, t);
    const work = all.filter((t) => !['cancelled', 'expired'].includes(t.status) && (!t.approval || !t.approval.valid));
    const live = all.filter((t) => t.approval && t.approval.valid && t.status !== 'cancelled' && st(t).done < 8);
    const closed = all.filter((t) => ['cancelled', 'expired'].includes(t.status) || st(t).done >= 8);
    const waiting = state.messages.filter((m) => m.kind === 'Supply offer' && m.status === 'review' && !(state.extraction[m.id] && state.extraction[m.id].created));
    const sec = (id, title, list, empty) => '<section aria-labelledby="' + id + '"><h2 class="sec-h" id="' + id + '">' + title + ' <span class="muted small">' + list.length + '</span></h2>' + (list.length ? '<ul class="tlist">' + list.map((t) => trow(state, t)).join('') + '</ul>' : '<p class="muted small sec-empty">' + empty + '</p>') + '</section>';
    return V.band('<div class="page-head"><div><h1>Trades</h1><p>Every trade as one thread: offer, lot, price, approval, freight, movement, delivery, settlement. Seeded and new trades run through the same workbench.</p></div><div class="row-actions">' + V.btn('New lot by hand', 'form', { cls: 'primary on-dark', icon: 'plus', id: 'new-trade', data: { form: 'trade-new' } }) + V.link('Paste an offer', '#/inbox/new', 'ghost on-dark', 'upload') + '</div></div>', 'band-page') +
      '<div class="wrap">' +
      (waiting.length ? '<section aria-labelledby="wi-h"><h2 class="sec-h" id="wi-h">Waiting in the inbox</h2><ul class="tlist">' + waiting.map((m) => '<li><a class="trow is-pending" href="#/inbox/' + m.id + '"><span class="trow-id">' + V.chip('new', 'Offer') + '<strong>' + m.id + '</strong></span><span class="trow-what"><strong>' + esc(m.subject) + ' · ' + esc(m.org) + '</strong><small>Not a trade yet: review the extraction to create a lot</small></span><span class="trow-thread"><small>' + esc(V.when(m.at)) + '</small></span><span class="trow-pnl num"><span class="muted">—</span><small>not priced</small></span></a></li>').join('') + '</ul></section>' : '') +
      sec('tw-h', 'To price and approve', work, 'Nothing to price. Paste an offer or create a lot by hand.') + sec('tl-h', 'Approved and moving', live, 'No approved trades in flight.') + sec('tc-h', 'Settled, cancelled or lapsed', closed, 'Nothing closed yet.') +
      '<p class="legend-line">Thread stages: ' + V.STAGES.join(', ') + '. Filled dots are done; a ring marks the next stage, red when it is blocked.</p></div>';
  };

  /* ---------------- Workbench header ---------------- */
  const TABS = [['source', 'Lot<span class="st-long"> and source</span>'], ['price', 'Price<span class="st-long"> and allocate</span>'], ['approve', 'Approve'], ['freight', 'Freight<span class="st-long"> and schedule</span>'], ['pnl', 'P&amp;L<span class="st-long"> and history</span>']];
  function head(state, tr, stage) {
    const qty = u.r2((tr.qtyLoads || 0) * (tr.payload || 0));
    const facts = [(tr.qtyLoads ? tr.qtyLoads + ' loads × ' + tr.payload + ' t = ' + u.t1(qty) + ' t' : 'Quantity missing'), tr.price != null ? 'CAD ' + u.rate(tr.price) + '/t FOB ' + (tr.origin || 'origin unknown') : 'Price missing', tr.windowStart != null ? 'Pickup ' + u.dayShort(tr.windowStart) + ' – ' + u.dayShort(tr.windowEnd) : 'Window missing', tr.moisture != null ? 'Moisture ' + tr.moisture.toFixed(1) + '% (' + (tr.moistureSource || 'supplier statement').toLowerCase() + ')' : 'Moisture missing'];
    const tabs = '<nav class="stagetabs" aria-label="Trade steps"><ol>' + TABS.map((s, i) => '<li><a href="#/trade/' + tr.id + '/' + s[0] + '"' + (stage === s[0] ? ' aria-current="step"' : '') + ' id="tab-' + s[0] + '"><span class="st-n">' + (i + 1) + '</span><span>' + s[1] + '</span></a></li>').join('') + '</ol></nav>';
    return V.band('<a class="crumb" href="#/trades">' + icon('back', 14) + 'Trades</a><div class="page-head"><div><p class="tr-id">' + u.kernel(tr.commodity, 16) + tr.id + V.lotChip(tr) + '</p><h1>' + esc(V.tradeTitle(tr)) + '</h1>' +
      '<ul class="facts">' + facts.map((f) => '<li>' + esc(f) + '</li>').join('') + '</ul></div></div>' + V.thread(state, tr, { labels: true, dark: true }), 'band-page band-trade') + tabs;
  }

  /* ---------------- Stage 1: lot and source ---------------- */
  function sourceEvidence(state, tr) {
    const m = state.messages.find((x) => x.id === tr.source);
    if (m) return '<div class="letter" lang="' + esc(m.lang) + '"><header class="letter-head"><div><strong>' + esc(m.from) + '</strong><br><span class="muted">' + esc(V.when(m.at)) + ' · ' + esc(m.subject) + '</span></div></header><div class="letter-body">' + esc(m.body) + '</div></div><p class="muted small">' + icon('lock', 13) + ' Original stored with checksum; corrections never overwrite it. ' + V.link('Open in inbox', '#/inbox/' + m.id, 'small ghost') + '</p>';
    if (tr.sourceText) return '<div class="letter"><header class="letter-head"><div><strong>' + esc(tr.source) + '</strong><br><span class="muted">Read ' + (tr.extractionSource === 'live-ai' ? 'by live AI' : 'by rules') + '</span></div></header><div class="letter-body">' + esc(tr.sourceText) + '</div></div>';
    return '<p class="muted">' + esc(tr.source || 'Entered by hand') + (tr.createdAt != null ? ', ' + esc(V.when(tr.createdAt)) : '') + '. No message attached: the lot passport is the record.</p>';
  }
  function stageSource(state, tr) {
    const sup = state.parties[tr.supplier];
    const missing = E.requiredMissing(state, tr);
    const lockedNow = S.locked(tr);
    const canCancel = tr.status !== 'cancelled' && !E.loadsOf(state, tr.id).some((l) => l.status !== 'booked');
    const evidenceClass = (src) => (/lab/i.test(src || '') ? V.chip('verified', 'Lab result') : src ? V.chip('tentative', 'Supplier statement') : V.chip('unknown', 'Missing'));
    return '<div class="wrap two"><section class="panel" aria-labelledby="se-h"><div class="panel-head"><h2 id="se-h">Source evidence</h2>' + V.provenance(tr.extractionSource === 'live-ai' ? { source: 'live-ai', model: 'claude-opus-5-5', ms: 0 } : null) + '</div>' + sourceEvidence(state, tr) + '</section>' +
      '<section class="panel" aria-labelledby="lp-h"><div class="panel-head"><h2 id="lp-h">Lot passport</h2>' + V.lotChip(tr) + '</div>' +
      (missing.length ? '<p class="callout tone-amber">' + icon('alert', 16) + '<span>Missing ' + esc(missing.join(', ')) + '. A missing cost or date is never treated as zero.</span></p>' : '') +
      (tr.status === 'cancelled' ? '<p class="callout tone-brick">' + icon('x', 16) + '<span>Cancelled. Allocations were reversed; history is kept.</span></p>' : '') +
      (tr.status === 'expired' ? '<p class="callout tone-amber">' + icon('clock', 16) + '<span>The pickup window lapsed ' + esc(V.when(tr.windowEnd)) + '. Confirm new dates with the supplier and edit the window to reopen it.</span></p>' : '') +
      '<dl class="kv"><div><dt>Supplier</dt><dd>' + (sup ? V.partyLink(sup.id) + (sup.status !== 'Approved' ? ' ' + V.chip('pending', sup.status) : '') : V.chip('unknown', 'Unidentified')) + '</dd></div>' +
      '<div><dt>Quantity</dt><dd>' + (tr.qtyLoads ? tr.qtyLoads + ' loads × ' + tr.payload + ' t = ' + u.t1(tr.qtyLoads * tr.payload) + ' t' : '—') + '</dd></div>' +
      '<div><dt>Origin</dt><dd>' + esc(tr.origin || 'Unknown') + '</dd></div><div><dt>Pickup window</dt><dd>' + (tr.windowStart != null ? esc(u.dayShort(tr.windowStart) + ' – ' + u.dayShort(tr.windowEnd)) : '—') + '</dd></div>' +
      '<div><dt>Price</dt><dd>' + (tr.price != null ? 'CAD ' + u.rate(tr.price) + '/t FOB farm' : '—') + (tr.validUntil != null ? ' · firm until ' + esc(V.when(tr.validUntil)) + (state.now > tr.validUntil && !(tr.approval && tr.approval.valid) ? ' ' + V.chip('expired', 'Lapsed') : '') : '') + '</dd></div>' +
      (tr.payloadDerived ? '<div><dt>Payload</dt><dd>' + tr.payload + ' t per load, derived from the stated total ' + V.chip('tentative', 'Derived: confirm') + '</dd></div>' : '') +
      '<div><dt>Firmness</dt><dd>' + (tr.supplierConfirmed ? esc(tr.supplierConfirmed.note) + ' <small class="muted">(' + esc(tr.supplierConfirmed.by) + ', ' + esc(V.when(tr.supplierConfirmed.at)) + ')</small>' : tr.certainty === 'tentative' ? 'Tentative: “' + esc(tr.tentativeWord || 'tentative') + '”' : 'Stated, not yet confirmed') + '</dd></div></dl>' +
      '<h3 class="h3">Quality evidence</h3><div class="table-wrap"><table class="mini"><caption class="sr-only">Quality evidence by class</caption><thead><tr><th scope="col">Attribute</th><th scope="col">Value</th><th scope="col">Evidence class</th></tr></thead><tbody>' +
      '<tr><th scope="row">Moisture</th><td>' + (tr.moisture != null ? tr.moisture.toFixed(1) + '%' : 'Not stated') + '</td><td>' + evidenceClass(tr.moisture != null ? tr.moistureSource || 'Supplier statement' : null) + '</td></tr>' +
      '<tr><th scope="row">Grade</th><td>' + esc(tr.grade || 'Not stated') + '</td><td>' + (tr.grade ? V.chip('tentative', 'Supplier statement') : V.chip('unknown', 'Missing')) + '</td></tr>' +
      '<tr><th scope="row">Test weight</th><td>' + (tr.testWeight ? tr.testWeight + ' lb/bu' : 'Not stated') + '</td><td>' + (tr.testWeight ? evidenceClass(tr.moistureSource) : V.chip('unknown', 'Missing')) + '</td></tr>' +
      (sup && sup.observations && sup.observations[0] ? '<tr><th scope="row">History</th><td>' + esc(sup.observations[0].text) + '</td><td>' + V.chip('indicative', sup.observations[0].basis) + '</td></tr>' : '') + '</tbody></table></div>' +
      '<p class="muted small">Grades come from official inspection or the buyer’s receiving lab, never from TradeDesk.</p>' +
      '<div class="row-actions">' + V.btn('Edit lot', 'form', { icon: 'edit', id: 'edit-lot', data: { form: 'trade-edit', id: tr.id }, disabled: tr.status === 'cancelled' }) +
      (tr.status !== 'cancelled' && !(tr.approval && tr.approval.valid) && (tr.certainty === 'tentative' || !tr.supplierConfirmed) ? V.btn('Log supplier confirmation', 'confirm-supplier', { icon: 'phone', id: 'confirm-supplier-lot' }) : '') +
      (canCancel ? V.btn('Cancel trade', 'cancel-trade', { cls: 'ghost', icon: 'x', id: 'cancel-trade' }) : '') +
      (tr.status !== 'cancelled' ? V.link('Price and allocate', '#/trade/' + tr.id + '/price', 'primary', 'arrow') : '') + '</div>' +
      (lockedNow ? '<p class="small muted">' + icon('lock', 13) + ' Freight is awarded: quantity, price, origin and window are locked. Quality evidence can still be updated.</p>' : '') + '</section></div>';
  }

  /* ---------------- Stage 2: price ladder + allocation ---------------- */
  function ladder(state, tr, rows, unit, animate) {
    const shown = rows.filter((r) => r.compat !== 'excluded' && r.compat !== 'fail' && r.price != null);
    const excluded = rows.filter((r) => r.compat === 'excluded' || r.compat === 'fail' || r.price == null);
    const known = shown.filter((r) => r.freight != null);
    let lo = Math.floor(tr.price - 3);
    let hi = Math.ceil(Math.max.apply(null, shown.map((r) => Math.max(r.price, r.contribution != null ? r.price - r.contribution : r.price)).concat([tr.price + 20])) + 3);
    const x = (v) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
    const best = known.slice().sort((a, b) => b.contribution - a.contribution)[0];
    const top = known.slice().sort((a, b) => b.price - a.price)[0];
    const fmt = (v) => V.perUnit(v, tr.commodity, unit);
    const month = (D.commodities[tr.commodity] || {}).futures;
    const fut = month ? E.futuresCad(state, month) : null;
    const rowsHtml = shown.map((r) => {
      const sel = tr.selected === r.demand;
      let bar = '';
      if (r.freight != null) {
        let at = tr.price;
        const segs = [['freight', r.freight, r.freightStatus === 'firm' ? 'seg-freight is-firm' : 'seg-freight'], ['quality', r.quality, 'seg-quality'], ['other', u.r2(r.financing + r.admin), 'seg-other'], ['exceptions', r.exceptions, 'seg-exc']];
        bar = segs.filter((s) => s[1] > 0).map((s) => { const h = '<span class="seg ' + s[2] + '" style="left:' + x(at).toFixed(2) + '%;width:' + (x(at + s[1]) - x(at)).toFixed(2) + '%"></span>'; at += s[1]; return h; }).join('');
        bar += r.contribution >= 0 ? '<span class="seg seg-contrib" style="left:' + x(at).toFixed(2) + '%;width:' + (x(r.price) - x(at)).toFixed(2) + '%"></span>' : '<span class="seg seg-loss" style="left:' + x(r.price).toFixed(2) + '%;width:' + (x(at) - x(r.price)).toFixed(2) + '%"></span>';
        bar += '<span class="tick tick-bid" style="left:' + x(r.price).toFixed(2) + '%"><span>Bid ' + fmt(r.price) + '</span></span>';
      } else bar = '<span class="seg seg-unknown" style="left:' + x(tr.price).toFixed(2) + '%;width:' + Math.max(4, x(r.price) - x(tr.price)).toFixed(2) + '%"></span><span class="unk-label">Freight unresolved</span>';
      const ready = (r.compat === 'pass' || r.compat === 'discount') && r.freight != null && !(r.dem.priceType === 'basis' && r.priceStale);
      const basis = fut && r.dem.commodity === tr.commodity ? month + ' ' + (r.price - fut.value >= 0 ? '+' : u.minus) + u.rate(Math.abs(r.price - fut.value)) : '';
      const chipK = r.freight == null ? 'unresolved' : r.dem.priceType === 'basis' && r.priceStale ? 'stale' : r.compat === 'unknown' ? 'unknown' : r.compat;
      return '<li class="lrow' + (sel ? ' is-sel' : '') + (ready ? '' : ' is-notready') + '" data-demand="' + r.demand + '" data-buyer="' + r.buyer + '">' +
        '<button type="button" class="lrow-name" data-act="select-demand" data-d="' + r.demand + '" aria-pressed="' + sel + '"><strong>' + esc(r.name) + '</strong><small>' + esc(r.town) + (r.siteNote ? ' (' + esc(r.siteNote) + ')' : '') + (r.lane ? ' · ' + r.lane.km + ' km' : '') + (r.freightStatus === 'quoted' ? ' · carrier quote ' + esc(r.fq) : '') + ' · ' + esc(r.demand) + (r.dem.kind === 'Contract' ? ' (contract)' : '') + '</small><small class="num">Bid ' + fmt(r.price) + (r.dem.priceType === 'basis' ? ' = ' + esc(r.priceNote) : basis ? ' = ' + basis : '') + '</small></button>' +
        '<div class="lbar" aria-hidden="true"><span class="tick tick-buy" style="left:' + x(tr.price).toFixed(2) + '%"></span>' + bar + '</div>' +
        '<div class="lrow-out"><span class="lc num' + (r.contribution != null && r.contribution < 0 ? ' neg' : '') + '">' + (r.contribution == null ? '—' : fmt(r.contribution)) + '</span><small>' + V.unitLabel(unit) + ' contribution</small>' + V.chip(chipK, chipK === 'unknown' ? 'Not approval-ready' : chipK === 'stale' ? 'Benchmark stale' : null) + '</div>' +
        '<p class="sr-only">' + esc(r.name) + ': bid ' + u.rate(r.price) + ', freight ' + (r.freight == null ? 'unresolved' : u.rate(r.freight) + ' ' + r.freightStatus) + ', quality ' + u.rate(r.quality) + ', financing and admin ' + u.rate(r.financing + r.admin) + ', expected exceptions ' + u.rate(r.exceptions) + ', contribution ' + (r.contribution == null ? 'unknown' : u.rate(r.contribution)) + ' CAD per tonne. ' + esc(r.reason) + '</p></li>';
    }).join('');
    let insight = '';
    if (best && top && best.demand !== top.demand && top.price > best.price) {
      const df = u.r2(top.freight - best.freight); const dq = u.r2(top.quality - best.quality); const dO = u.r2(top.financing + top.admin + top.exceptions - best.financing - best.admin - best.exceptions);
      insight = '<p class="insight">' + icon('info', 16) + '<span><strong>' + esc(top.name) + ' bids ' + u.rate(top.price - best.price) + '/t more than ' + esc(best.name) + ' but leaves ' + u.rate(best.contribution - top.contribution) + '/t less.</strong> Freight ' + (df >= 0 ? '+' : u.minus) + u.rate(Math.abs(df)) + (dq ? ', quality ' + (dq >= 0 ? '+' : u.minus) + u.rate(Math.abs(dq)) : '') + (dO ? ', financing and exceptions ' + (dO >= 0 ? '+' : u.minus) + u.rate(Math.abs(dO)) : '') + '.</span></p>';
    }
    return '<div class="ladder' + (animate ? ' is-anim' : '') + '" id="ladder">' + (shown.length ? '<div class="ladder-axis" aria-hidden="true"><span style="left:' + x(tr.price) + '%">Buy ' + fmt(tr.price) + '</span></div><ul class="lrows" aria-label="Delivered economics by buyer">' + rowsHtml + '</ul>' +
      '<ul class="ladder-legend" aria-label="Legend"><li><i class="lg lg-buy"></i>Purchase price</li><li><i class="lg lg-freight"></i>Freight, indicative</li><li><i class="lg lg-freight-firm"></i>Freight, firm</li><li><i class="lg lg-quality"></i>Moisture discount</li><li><i class="lg lg-other"></i>Financing and admin</li><li><i class="lg lg-exc"></i>Expected detention</li><li><i class="lg lg-contrib"></i>Contribution</li></ul>' : '<p class="muted">No open ' + esc(V.commodityName(tr.commodity).toLowerCase()) + ' demand overlaps this lot. ' + V.btn('Create a buyer bid', 'form', { cls: 'small', icon: 'plus', data: { form: 'demand-new', commodity: tr.commodity } }) + '</p>') +
      insight +
      (excluded.length ? '<div class="excluded"><h3 class="h3">Excluded, with reasons</h3><ul>' + excluded.map((r) => '<li>' + V.chip(r.compat === 'fail' ? 'fail' : 'excluded') + '<strong>' + V.partyLink(r.buyer, r.name) + '</strong> ' + esc(r.demand) + (r.price != null ? ' bids ' + u.rate(r.price) : '') + ': ' + esc(r.reason) + '</li>').join('') + '</ul></div>' : '') + '</div>';
  }

  function explain(state, tr, r, unit) {
    if (!r) return '';
    const fmt = (v) => V.perUnit(v, tr.commodity, unit);
    const n = (tr.alloc && tr.alloc[r.demand]) || 0;
    const per = E.linesFromRates(r, tr.payload);
    const tot = n ? E.scaleLines(per, n) : null;
    const lines = [['Delivered sale', r.price, r.dem.kind + ' ' + r.demand + (r.dem.validUntil != null ? ', valid until ' + V.when(r.dem.validUntil) : '') + '. ' + r.priceNote, 'sale'], ['Purchase', r.purchase == null ? null : -r.purchase, V.pname(tr.supplier) + ', FOB farm', 'purchase'], ['Freight', r.freight == null ? null : -r.freight, r.freightBasis, 'freight'], ['Moisture discount', -r.quality, r.qualityBasis, 'quality'], ['Financing', -r.financing, r.financingBasis, 'financing'], ['Handling and admin', -r.admin, r.adminBasis, 'admin'], ['Expected detention', -r.exceptions, r.exceptionBasis, 'exceptions']];
    const src = tot || per;
    return '<section class="panel explain" aria-labelledby="exp-h"><div class="panel-head"><h2 id="exp-h">Why ' + esc(r.name) + ' ' + (r.contribution == null ? 'is incomplete' : 'leaves ' + fmt(r.contribution)) + '</h2>' + V.chip(r.freight == null ? 'unresolved' : r.compat === 'unknown' ? 'unknown' : r.compat) + '</div>' +
      '<p class="small">' + esc(r.reason.replace(/\.?$/, '.')) + (r.ruleLabel ? ' Rule: ' + esc(r.ruleLabel) : '') + '</p>' +
      (r.freight == null ? '<p class="callout tone-amber small">' + icon('alert', 15) + '<span>' + esc(r.freightBasis) + ' ' + V.btn('Enter indicative freight', 'form', { cls: 'small', data: { form: 'freight-manual', id: tr.id, d: r.demand }, id: 'fr-manual-' + r.demand }) + '</span></p>' : '') +
      '<div class="table-wrap"><table class="econ"><caption class="sr-only">Delivered economics for ' + esc(r.name) + '</caption><thead><tr><th scope="col">Line</th><th scope="col" class="r">' + V.unitLabel(unit) + '</th><th scope="col" class="r">' + (n ? n + ' loads, CAD' : 'Per load, CAD') + '</th><th scope="col">Basis</th></tr></thead><tbody>' +
      lines.map((l) => '<tr><th scope="row">' + l[0] + '</th><td class="r num">' + (l[1] == null ? '—' : (l[1] < 0 ? u.minus : '') + fmt(Math.abs(l[1]))) + '</td><td class="r num">' + (src[l[3]] == null ? '—' : (l[1] < 0 ? u.minus : '') + u.money(src[l[3]])) + '</td><td class="small">' + esc(l[2]) + '</td></tr>').join('') +
      '<tr class="tot"><th scope="row">Contribution</th><td class="r num">' + (r.contribution == null ? 'Incomplete' : fmt(r.contribution)) + '</td><td class="r num">' + (E.contrib(src) == null ? 'Incomplete' : u.money(E.contrib(src))) + '</td><td class="small">Before separately disclosed taxes. Rounding: per line, per load.</td></tr></tbody></table></div></section>';
  }

  function allocation(state, tr, plan, down) {
    const rows = plan.rows.filter((r) => r.compat !== 'excluded' && r.compat !== 'fail' && r.price != null);
    const lockedNow = S.locked(tr);
    const used = plan.loads;
    const pctUsed = tr.qtyLoads ? (used / tr.qtyLoads) * 100 : 0;
    const rowsHtml = rows.map((r) => {
      const n = tr.alloc[r.demand] || 0;
      const o = E.demandOpen(state, r.dem, tr.id);
      const max = E.maxLoadsFor(state, tr, r.dem);
      const p = plan.per.find((x) => x.demand === r.demand);
      return '<li class="arow"><div class="arow-name"><strong>' + esc(r.name) + '</strong><small>' + esc(r.demand) + ': ' + u.t1(o.open) + ' t open' + (o.maxOpen > o.open ? ' (' + u.t1(o.maxOpen) + ' t with ±' + r.dem.tolPct + '%)' : '') + (r.dem.priorAllocated ? ' · ' + u.t1(r.dem.priorAllocated) + ' t allocated before' : '') + '</small></div>' +
        '<div class="stepper" role="group" aria-label="Loads to ' + esc(r.name) + '"><button type="button" class="icon-btn" data-act="alloc" data-d="' + r.demand + '" data-n="' + (n - 1) + '" aria-label="One load fewer to ' + esc(r.name) + '"' + (n <= 0 || lockedNow ? ' disabled' : '') + '>' + icon('minus', 16) + '</button><output aria-live="polite" id="alloc-' + r.demand + '">' + n + '</output><button type="button" class="icon-btn" data-act="alloc" data-d="' + r.demand + '" data-n="' + (n + 1) + '" aria-label="One load more to ' + esc(r.name) + '"' + (lockedNow ? ' disabled' : '') + '>' + icon('plus', 16) + '</button></div>' +
        '<div class="arow-out num"><span>' + u.t1(n * tr.payload) + ' t</span><small>' + (p && p.contribution != null ? u.money(p.contribution) : '—') + '</small></div>' +
        (n >= max && n > 0 && !lockedNow ? '<p class="arow-cap small">At the open-demand limit: ' + max + ' loads.</p>' : '') + '</li>';
    }).join('');
    const ap = tr.approval;
    return '<section class="panel alloc" aria-labelledby="al-h"><div class="panel-head"><h2 id="al-h">Allocation plan</h2>' + (ap && ap.valid ? V.chip('approved', 'Approved v' + ap.version) : ap ? V.chip('invalid') : V.chip('draft', 'Suggested')) + '</div>' +
      '<div class="lotmeter"><div class="meter" role="img" aria-label="' + used + ' of ' + tr.qtyLoads + ' loads allocated"><span style="width:' + pctUsed + '%"></span></div><p><strong class="num">' + used + ' of ' + tr.qtyLoads + '</strong> loads allocated · ' + u.t1(plan.tonnes) + ' of ' + u.t1((tr.qtyLoads || 0) * tr.payload) + ' t' + (plan.unallocatedLoads > 0 ? ' · <span class="warn-t">' + u.t1(plan.unallocatedLoads * tr.payload) + ' t would stay uncovered</span>' : '') + '</p></div>' +
      (rows.length ? '<ul class="arows">' + rowsHtml + '</ul>' : '<p class="muted small">No eligible demand to allocate to.</p>') +
      '<dl class="alloc-tot"><div><dt>Best estimate</dt><dd class="num" id="plan-total">' + (plan.contribution == null ? 'Incomplete' : u.cad(plan.contribution)) + '<small>' + (plan.perTonne == null ? '' : u.rate(plan.perTonne) + '/t') + '</small></dd></div><div><dt>Downside</dt><dd class="num">' + (down.contribution == null ? '—' : u.cad(down.contribution)) + '<small>' + (tr.moisture != null ? E.downside(tr).moisture.toFixed(1) + '% moisture, ' : '') + 'freight +5%</small></dd></div></dl>' +
      (lockedNow ? '<p class="small muted">' + icon('lock', 13) + ' Locked: freight is awarded on approval v' + ap.version + '.</p>' : '<p class="small muted">The ledger refuses any plan beyond a buyer’s open demand or the lot. Changing an approved plan reverses its reservations and needs re-approval.</p>') +
      (tr.status === 'cancelled' ? '' : V.link(ap && ap.valid ? 'View approval' : 'Continue to approval', '#/trade/' + tr.id + '/approve', 'primary', 'arrow', 'to-approve')) + '</section>';
  }

  function scenarioBar(state, tr) {
    const sc = tr.scenario || { moisture: tr.moisture, freightPct: 0 };
    const isBest = sc.moisture === tr.moisture && !sc.freightPct;
    const dn = E.downside(tr);
    const isDown = sc.moisture === dn.moisture && sc.freightPct === dn.freightPct;
    const un = state.ui.unit;
    const c = D.commodities[tr.commodity] || D.commodities.corn;
    return '<div class="scen" role="group" aria-label="Scenario and units"><div class="scen-f"><label for="sc-moist">Moisture at delivery <output id="sc-moist-o" class="num">' + (sc.moisture != null ? sc.moisture.toFixed(1) + '%' : '—') + '</output></label><input type="range" id="sc-moist" min="11" max="18" step="0.1" value="' + (sc.moisture != null ? sc.moisture : 15) + '" data-input="sc-moist"' + (tr.moisture == null ? ' disabled' : '') + '></div>' +
      '<div class="scen-f"><label for="sc-fr">Freight vs estimate <output id="sc-fr-o" class="num">' + (sc.freightPct > 0 ? '+' : '') + sc.freightPct + '%</output></label><input type="range" id="sc-fr" min="-10" max="25" step="1" value="' + sc.freightPct + '" data-input="sc-fr"></div>' +
      '<div class="seg-ctl" role="group" aria-label="Scenario preset"><button type="button" data-act="scen" data-p="best" aria-pressed="' + isBest + '">Best estimate</button><button type="button" data-act="scen" data-p="down" aria-pressed="' + isDown + '" id="scen-down">Downside</button></div>' +
      '<div class="seg-ctl" role="group" aria-label="Price unit">' + ['t', 'bu', 'cwt'].map((x) => '<button type="button" data-act="unit" data-u="' + x + '" aria-pressed="' + (un === x) + '">CAD/' + x + '</button>').join('') + '</div>' +
      '<p class="scen-note small">Scenarios test the plan; they never change what you approve. ' + esc(c.label) + ': ' + u.buPerT(c.lbPerBu).toFixed(4) + ' bu/t (' + c.lbPerBu + ' lb bushel), ' + u.cwtPerT.toFixed(4) + ' cwt/t.</p></div>';
  }

  function priceLive(state, tr) {
    const plan = E.planSummary(state, tr, tr.scenario);
    const down = E.planSummary(state, tr, E.downside(tr));
    const animate = !V._ladderSeen;
    V._ladderSeen = true;
    const shown = plan.rows.filter((r) => r.compat !== 'excluded' && r.compat !== 'fail' && r.price != null);
    const sel = plan.rows.find((r) => r.demand === tr.selected) || shown[0];
    const min = D.authority[state.role].minContribution;
    const breach = plan.per.filter((p) => p.rates.contribution != null && p.rates.contribution < min);
    return (breach.length ? '<p class="callout tone-amber">' + icon('alert', 16) + '<span>In this scenario ' + breach.map((p) => esc(p.rates.name) + ' falls to ' + u.rate(p.rates.contribution) + '/t').join(' and ') + ', under the CAD ' + u.rate(min) + '/t minimum. Approving at these numbers would need the desk manager.</span></p>' : '') +
      '<div class="price-grid"><section class="panel" aria-labelledby="ld-h"><div class="panel-head"><h2 id="ld-h">Delivered economics, ' + esc(tr.id) + '</h2><span class="muted small">One CAD/t scale for every buyer. Select a buyer to see each line.</span></div>' + ladder(state, tr, plan.rows, state.ui.unit, animate) + '</section>' +
      '<div class="price-side">' + allocation(state, tr, plan, down) + '</div></div>' + explain(state, tr, sel, state.ui.unit);
  }
  V.priceLive = priceLive;

  function stagePrice(state, tr) {
    if (tr.price == null || !tr.qtyLoads || !tr.payload || !tr.commodity) {
      return '<div class="wrap"><div class="empty">' + icon('info', 22) + '<p>This lot cannot be priced yet: ' + esc(E.requiredMissing(state, tr).join(', ') || 'quantity or price') + ' missing. A missing cost is never treated as zero.</p>' + V.btn('Edit lot', 'form', { cls: 'small primary', data: { form: 'trade-edit', id: tr.id } }) + '</div></div>';
    }
    return '<div class="wrap">' + standingCallout(state, tr) + scenarioBar(state, tr) + '<div id="price-live">' + priceLive(state, tr) + '</div></div>';
  }
  /* Carrier quotes from emails that fit this lot's lanes and pickup window. */
  function standingCallout(state, tr) {
    if (tr.status === 'cancelled') return '';
    const list = S.standingFor(tr);
    if (!list.length) return '';
    const approved = tr.approval && tr.approval.valid;
    return '<div class="callout tone-steel" id="fq-standing">' + icon('truck', 18) + '<div><strong>' + list.length + ' carrier quote' + (list.length > 1 ? 's' : '') + ' on file for this lot’s lanes and dates</strong><ul class="fq-list">' + list.map((x) => { const c = E.party(state, x.fq.carrier) || {}; return '<li><span>' + esc(x.fq.id) + ' · ' + esc(c.name) + (c.status !== 'Approved' ? ' (pending)' : '') + ': ' + esc(x.fq.from + ' → ' + x.fq.to) + ', pickup ' + esc(x.fq.pickupAt != null ? V.when(x.fq.pickupAt) : '—') + ', ' + esc(E.fqBasisLabel(x.fq)) + (x.fq.validUntil != null ? ', valid to ' + esc(V.when(x.fq.validUntil)) : '') + '</span>' + V.btn(approved ? 'Add to the freight comparison' : 'Use as this lane’s freight', 'fq-attach', { cls: 'small', data: { fq: x.fq.id, t: x.cand.id }, id: 'fq-attach-' + x.fq.id }) + '</li>'; }).join('') + '</ul></div></div>';
  }

  /* ---------------- Stage 3: approval ---------------- */
  function confirmationDoc(state, tr) {
    const snap = tr.approval && tr.approval.valid ? tr.approval : null;
    const sup = state.parties[tr.supplier] || { name: 'Vendeur non identifié', address: '' };
    const fr = (sup.lang || 'fr') === 'fr';
    const qty = u.t1((tr.qtyLoads || 0) * (tr.payload || 0));
    const num = (x) => (fr ? String(x).replace('.', ',') : String(x));
    const pc = (tr.contracts || []).find((c) => c.party === tr.supplier && c.state !== 'Superseded' && c.state !== 'Cancelled');
    const ref = pc ? pc.id : 'PC-' + tr.id.slice(3);
    const k = fr ? { title: 'Confirmation d’achat', draft: 'brouillon', seller: 'Vendeur', product: 'Produit', qty: 'Quantité', price: 'Prix', quality: 'Qualité', loading: 'Chargement', pay: 'Paiement', transport: 'Transport', foot: 'Document généré à partir des conditions approuvées', sentNote: 'L’envoi ne prouve pas l’acceptation.' } : { title: 'Purchase confirmation', draft: 'draft', seller: 'Seller', product: 'Product', qty: 'Quantity', price: 'Price', quality: 'Quality', loading: 'Loading', pay: 'Payment', transport: 'Transport', foot: 'Generated from the approved terms', sentNote: 'Sending does not prove acceptance.' };
    const cname = fr ? (D.commodities[tr.commodity] || {}).fr : V.commodityName(tr.commodity).toLowerCase();
    return '<article class="doc" id="pc-doc" lang="' + (fr ? 'fr' : 'en') + '" aria-label="Purchase confirmation preview"><header class="doc-head"><div>' + u.leaf(20) + '<strong>' + esc(D.desk.company) + '</strong></div><div class="doc-ref">' + k.title + ' ' + esc(ref) + (snap ? ' · v' + tr.approval.version : ' · ' + k.draft) + '</div></header>' +
      '<dl class="doc-kv"><div><dt>' + k.seller + '</dt><dd>' + esc(sup.name) + (sup.address ? ', ' + esc(sup.address) : '') + '</dd></div><div><dt>' + k.product + '</dt><dd>' + esc(cname || '—') + (tr.grade ? ', ' + esc(tr.grade) : '') + (fr ? ', grade à destination' : ', graded at destination') + '</dd></div><div><dt>' + k.qty + '</dt><dd>' + (tr.qtyLoads || '—') + (fr ? ' voyages, environ ' : ' loads, about ') + num(qty) + ' t (± 2 %), ' + (fr ? 'poids de l’origine (balance certifiée)' : 'origin certified scale weight') + '</dd></div>' +
      '<div><dt>' + k.price + '</dt><dd>' + (tr.price != null ? num(u.rate(tr.price)) + (fr ? ' $ CA la tonne, FOB ferme' : ' CAD per tonne, FOB farm') : '—') + '</dd></div><div><dt>' + k.quality + '</dt><dd>' + (tr.moisture != null ? (fr ? 'Humidité déclarée ' : 'Stated moisture ') + num(tr.moisture.toFixed(1)) + ' %. ' : '') + (fr ? 'Escomptes selon la grille de l’acheteur.' : 'Discounts per the buyer’s schedule.') + '</dd></div><div><dt>' + k.loading + '</dt><dd>' + (tr.windowStart != null ? esc(u.dayShort(tr.windowStart)) + ' – ' + esc(u.dayShort(tr.windowEnd)) : '—') + (fr ? ', rendez-vous confirmés par TradeDesk' : ', appointments confirmed by TradeDesk') + '</dd></div><div><dt>' + k.pay + '</dt><dd>' + (fr ? '10 jours après livraison' : '10 days after delivery') + '</dd></div><div><dt>' + k.transport + '</dt><dd>' + (fr ? 'Organisé par l’acheteur' : 'Arranged by the buyer') + '</dd></div></dl>' +
      '<footer class="doc-foot">' + k.foot + (snap ? ' · ' + esc(tr.approval.by) + ', ' + esc(u.dayShort(tr.approval.at)) + ' ' + u.hhmm(tr.approval.at) : '') + '. ' + k.sentNote + '</footer></article>';
  }
  function fixBtn(c, tr) {
    if (c.fix === 'confirm-supplier') return V.btn('Log the supplier’s confirmation call', 'confirm-supplier', { cls: 'small', icon: 'phone', id: 'confirm-supplier' });
    if (c.fix === 'role-trader') return V.btn('Switch to Geneviève (trader)', 'role', { cls: 'small', data: { role: 'trader' } });
    if (c.fix === 'role-manager') return V.btn('Switch to Jean-François (manager)', 'role', { cls: 'small', data: { role: 'manager' }, id: 'switch-manager' });
    if (c.fix === 'edit-lot') return V.btn('Edit lot', 'form', { cls: 'small', data: { form: 'trade-edit', id: tr.id } });
    if (c.fix && /^refresh-/.test(c.fix)) return V.btn('Enter ' + c.fix.slice(8), 'form', { cls: 'small', icon: 'refresh', data: { form: 'benchmark', id: c.fix.slice(8) }, id: 'fix-' + c.fix });
    return '';
  }
  function stageApprove(state, tr) {
    if (tr.status === 'cancelled') return '<div class="wrap"><div class="empty">' + icon('x', 22) + '<p>Cancelled trades cannot be approved.</p></div></div>';
    const res = E.approvalChecks(state, tr, state.role);
    const plan = res.plan;
    const ap = tr.approval;
    const usr = D.users[state.role];
    let action;
    const contracts = (tr.contracts || []).length ? '<h3 class="h3">Confirmations</h3><ul class="contracts">' + tr.contracts.map((c) => '<li><span>' + icon('file', 15) + '<strong>' + esc(c.id) + '</strong> ' + esc(c.kind) + ' to ' + V.partyLink(c.party) + ' (' + c.lang + ')</span>' + V.chip(c.state === 'Sent' ? 'sent' : c.state === 'Superseded' ? 'superseded' : c.state === 'Cancelled' ? 'cancelled' : c.state === 'Acknowledged' ? 'acknowledged' : 'approved', c.state === 'Sent' ? 'Sent, acknowledgement expected ' + V.when(c.ackDueAt) : c.state) + '</li>').join('') + '</ul>' : '';
    if (ap && ap.valid) {
      action = '<div class="approved">' + icon('check', 20) + '<div><strong>Approved v' + ap.version + ' by ' + esc(ap.by) + ', ' + esc(V.when(ap.at)) + '</strong><p>Quantities reserved in the allocation ledger and credit exposure updated. Contribution at approval: ' + (ap.snapshot.contribution != null ? u.cad(ap.snapshot.contribution) + (ap.snapshot.perTonne != null ? ' (' + u.rate(ap.snapshot.perTonne) + '/t)' : '') : 'no sale') + '.</p></div></div>' + contracts +
        '<div class="row-actions">' + (tr.contracts.some((c) => c.state === 'Approved') ? V.btn('Mark confirmations as sent (simulated)', 'send-conf', { icon: 'mail', id: 'send-conf' }) : '') + V.btn('Print purchase confirmation', 'print-pc', { cls: 'ghost', icon: 'print' }) + (S.locked(tr) ? '' : V.btn('Revise plan', 'revise', { cls: 'ghost', icon: 'refresh', id: 'revise' })) + (plan.loads || Object.values(ap.snapshot.alloc).some((n) => n) ? V.link('Book freight', '#/trade/' + tr.id + '/freight', 'primary', 'truck', 'to-freight') : V.link('Allocate a sale', '#/trade/' + tr.id + '/price', 'primary', 'scale')) + '</div>';
    } else {
      const label = 'Approve purchase' + (plan.per.length ? ' and ' + plan.per.length + ' sale' + (plan.per.length === 1 ? '' : 's') + ': ' + (plan.contribution == null ? 'incomplete' : u.cad(plan.contribution)) + ' contribution' : ' only (uncovered)');
      action = (ap && !ap.valid ? '<p class="callout tone-brick">' + icon('alert', 16) + '<span>Approval v' + ap.version + ' no longer matches: ' + esc(ap.invalidReason) + '. Reservations were reversed; approve the new version.</span></p>' : '') +
        '<ul class="checks">' + res.checks.map((c) => '<li class="' + (c.block ? 'is-block' : c.warn ? 'is-warn' : 'is-ok') + '">' + icon(c.block ? 'x' : c.warn ? 'alert' : 'check', 15) + '<span>' + esc(c.text) + '</span>' + fixBtn(c, tr) + '</li>').join('') + '</ul>' +
        '<div class="row-actions">' + V.btn(label, 'approve', { cls: 'primary', icon: 'check', disabled: res.blocked, id: 'approve-btn' }) + V.link('Adjust the plan', '#/trade/' + tr.id + '/price', 'ghost') + '</div>' +
        (res.blocked ? '<p class="small muted">Blocked until every red line is resolved. Acting as ' + esc(usr.name) + ', ' + esc(usr.title) + '.</p>' : '<p class="small muted">Approval applies to this exact version. Any later change to price, quantity, buyer or route invalidates it.</p>') + contracts;
    }
    const lines = plan.lines;
    const L = (k, sign) => '<td class="r num">' + (lines[k] == null ? '—' : (sign && lines[k] ? u.minus : '') + u.money(lines[k])) + '</td>';
    const summary = '<table class="econ"><caption class="sr-only">Plan totals</caption><tbody>' + [['Delivered sales', 'sale', false], ['Purchase (allocated loads)', 'purchase', true], ['Freight', 'freight', true], ['Moisture discount', 'quality', true], ['Financing', 'financing', true], ['Handling and admin', 'admin', true], ['Expected detention', 'exceptions', true]].map((r) => '<tr><th scope="row">' + r[0] + '</th>' + L(r[1], r[2]) + '</tr>').join('') +
      '<tr class="tot"><th scope="row">Contribution</th><td class="r num">' + (plan.contribution == null ? 'Incomplete' : u.money(plan.contribution)) + '</td></tr></tbody></table>';
    const qty = u.t1((tr.qtyLoads || 0) * tr.payload);
    return '<div class="wrap two approve-grid"><section class="panel acard" aria-labelledby="ap-h"><div class="panel-head"><h2 id="ap-h">Decision</h2>' + (ap && ap.valid ? V.chip('approved', 'v' + ap.version) : V.chip('draft', 'Version ' + (((tr.approvals || []).slice(-1)[0] || {}).version + 1 || 1))) + '</div>' +
      '<p class="acard-what">Buy <strong>' + qty + ' t</strong> from ' + esc(V.pname(tr.supplier)) + ' at CAD ' + (tr.price != null ? u.rate(tr.price) : '—') + '/t FOB farm.' + (plan.per.length ? ' Sell ' + plan.per.map((p) => '<strong>' + u.t1(p.tonnes) + ' t</strong> to ' + esc(p.rates.name) + ' at ' + u.rate(p.rates.price)).join(' and ') + ' delivered.' : ' No sale allocated.') + (plan.unallocatedLoads > 0 ? ' <strong>' + u.t1(plan.unallocatedLoads * tr.payload) + ' t</strong> stays uncovered.' : '') + '</p>' +
      '<div class="acard-sum">' + summary + '</div>' + action + '</section>' +
      '<section class="panel" aria-labelledby="pv-h"><div class="panel-head"><h2 id="pv-h">Purchase confirmation preview</h2>' + V.chip('draft', ap && ap.valid ? 'Generated' : 'Draft') + '</div>' + confirmationDoc(state, tr) + '<p class="small muted">Generated from structured terms in the supplier’s language. Carrier documents never show this price.</p></section></div>';
  }

  /* ---------------- Stage 4: freight and schedule ---------------- */
  function payloadCard(tr) {
    const b = D.payload.btrain; const c = D.commodities[tr.commodity] || D.commodities.corn;
    const legal = (b.gvw - b.tare) / 1000;
    const vol = u.r1(b.volumeM3 * c.density);
    const ok = tr.payload <= Math.min(legal, vol);
    return '<section class="panel" aria-labelledby="pl-h"><div class="panel-head"><h2 id="pl-h">Route and payload check</h2>' + V.chip(ok ? 'ok' : 'blocked', ok ? 'Feasible' : 'Over limit') + '</div>' +
      '<table class="mini"><caption class="sr-only">Payload constraints</caption><tbody><tr><th scope="row">Vehicle</th><td>' + esc(b.label) + ', tare 23.5 t (carrier-declared)</td></tr><tr><th scope="row">Total loaded mass</th><td class="num">' + u.n0(b.gvw) + ' kg − ' + u.n0(b.tare) + ' kg = <strong>' + legal.toFixed(1) + ' t</strong>' + (legal <= vol ? ' · limiting' : '') + '</td></tr>' +
      '<tr><th scope="row">Volume</th><td class="num">' + b.volumeM3 + ' m³ × ' + c.density + ' t/m³ ' + esc(c.label.toLowerCase()) + ' = ' + vol + ' t' + (vol < legal ? ' · limiting' : '') + '</td></tr><tr><th scope="row">Planned</th><td class="num">' + tr.payload + ' t per load</td></tr><tr><th scope="row">Season</th><td>' + esc(D.payload.thaw) + '</td></tr><tr><th scope="row">Pickup</th><td>' + esc(V.pname(tr.supplier)) + ', ' + esc(tr.origin || '—') + ' · loading about ' + ((state().parties[tr.supplier] || {}).loadMins || 45) + ' min</td></tr></tbody></table>' +
      '<p class="small muted">' + esc(D.payload.ruleVersion) + '. An undeclared axle configuration never inherits another truck’s capacity.</p></section>';
  }
  const state = () => S.get();
  function stageFreight(state, tr) {
    if (!tr.approval || !tr.approval.valid) return '<div class="wrap"><div class="empty">' + icon('lock', 22) + '<p>Approve the commercial terms first. Freight is tendered against an approved version.</p>' + V.link('Go to approval', '#/trade/' + tr.id + '/approve', 'primary small') + '</div></div>';
    const alloc = tr.approval.snapshot.alloc;
    const lanes = Object.keys(alloc).filter((k) => alloc[k]);
    if (!lanes.length) return '<div class="wrap"><div class="empty">' + icon('info', 22) + '<p>Approved as a purchase with no sale: there is no lane to tender yet. Allocate a buyer and re-approve.</p>' + V.link('Allocate a sale', '#/trade/' + tr.id + '/price', 'primary small') + '</div></div>';
    const rfq = tr.rfq; const auth = D.authority[state.role];
    const town = (k) => E.destTown(state, E.demand(state, k));
    let rfqHtml;
    const totalLoads = lanes.reduce((a, k) => a + alloc[k], 0);
    if (!rfq) {
      const inPlan = Object.keys(tr.freightQuote || {}).map((k) => (state.fquotes || {})[tr.freightQuote[k]]).filter(Boolean);
      rfqHtml = '<div class="rfq-empty"><p>Request quotes from your approved bulk carriers for ' + lanes.map((k) => alloc[k] + ' loads to ' + esc(town(k))).join(' and ') + '. Carriers see lanes, dates and equipment; never your purchase price, margin or competing quotes.' + (inPlan.length ? ' Already priced into the plan: ' + inPlan.map((fq) => esc(fq.id) + ' from ' + esc((E.party(state, fq.carrier) || {}).short || '')).join(', ') + '; it joins the comparison when the RFQ goes out.' : '') + '</p>' + (auth.award ? V.btn('Send RFQ to approved carriers (simulated)', 'rfq', { cls: 'primary', icon: 'mail', id: 'rfq-btn' }) : '<p class="small muted">' + icon('lock', 13) + ' Logistics tenders freight. ' + V.btn('Switch to Samuel (logistics)', 'role', { cls: 'small', data: { role: 'logistics' }, id: 'switch-logistics' }) + '</p>') + V.btn('Record a phone quote', 'form', { cls: 'ghost', icon: 'phone', data: { form: 'quote-manual', id: tr.id } }) + '</div>';
    } else if (rfq.pending) {
      rfqHtml = '<p class="dcard-progress" role="status"><span class="spinner" aria-hidden="true"></span>Waiting for carrier replies (simulated)…</p>';
    } else {
      const est = lanes.reduce((s, k) => s + alloc[k] * u.lineCents(tr.approval.snapshot.rates[k].freight, tr.payload), 0);
      const quotes = rfq.quotes.filter((q) => !q.declined).map((q) => {
        const r = E.quoteRates(q); const st = E.quoteStatus(state, q);
        // An incomplete quote has no total: it never looks cheaper than a complete one.
        const total = lanes.some((k) => r[k] == null) ? null : lanes.reduce((s, k) => s + alloc[k] * u.lineCents(r[k], tr.payload), 0);
        return { q: q, r: r, st: st, total: total, eligible: st === 'valid' && E.payloadOk(q) && total != null };
      }).sort((a, b) => (a.total == null ? 1 : 0) - (b.total == null ? 1 : 0) || a.total - b.total);
      const bestElig = quotes.find((x) => x.eligible);
      const award = rfq.award;
      const anyExpired = quotes.some((x) => x.st === 'expired');
      rfqHtml = '<div class="table-wrap"><table class="qtable"><caption class="sr-only">Freight quotes normalized to all-in CAD</caption><thead><tr><th scope="col">Carrier</th>' + lanes.map((k) => '<th scope="col" class="r">To ' + esc(town(k)) + '<small>CAD/t as quoted</small></th>').join('') + '<th scope="col" class="r">All-in total<small>' + totalLoads + ' loads</small></th><th scope="col">Validity and evidence</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead><tbody>' +
        quotes.map((x) => {
          const p = E.party(state, x.q.carrier);
          const chips = [];
          chips.push(x.st === 'expired' ? V.chip('expired', 'Expired ' + V.when(x.q.validUntil)) : x.st === 'nolane' ? V.chip('unresolved', 'Lane not quoted') : x.st === 'partial' ? V.chip('unresolved', 'Covers ' + x.q.capacity + ' of ' + x.q.need + ' loads') : x.st === 'pending' ? V.chip('pending', 'Carrier pending approval') : V.chip('ok', 'Valid to ' + V.when(x.q.validUntil)));
          if (x.q.fsc) chips.push(V.chip('warn', 'Excludes fuel: +' + x.q.fsc + '% added'));
          if (!E.payloadOk(x.q)) chips.push(V.chip('unverified', 'Payload unverified'));
          else if (x.q.payload === 'declared') chips.push(V.chip('tentative', 'Payload declared in the quote'));
          if (x.q.source === 'manual') chips.push(V.chip('simulated', 'Phone quote'));
          if (x.q.source === 'email') chips.push(V.chip('indicative', 'Email quote ' + x.q.fq));
          if (x === bestElig && !award) chips.push(V.chip('new', 'Lowest eligible all-in'));
          let act;
          if (award) act = award.carrier === x.q.carrier ? V.chip(award.state === 'accepted' ? 'booked' : 'requested', award.state === 'accepted' ? 'Booked' : 'Awaiting acceptance') : '<span class="muted small">Closed</span>';
          else if (x.st === 'expired') act = auth.award ? V.btn('Request refresh', 'refresh-quote', { cls: 'small ghost', data: { c: x.q.carrier } }) : '';
          else if (x.st === 'pending') act = '<span class="small muted">Logistics approves the carrier first</span>';
          else if (x.st === 'partial') act = '<span class="small muted">Not enough capacity</span>';
          else if (!E.payloadOk(x.q)) act = '<span class="small muted">Ask for axle configuration</span>';
          else if (x.st !== 'valid') act = '';
          else act = auth.award ? V.btn('Award ' + u.cad(x.total), 'award', { cls: 'small' + (x === bestElig ? ' primary' : ''), data: { c: x.q.carrier }, id: 'award-' + x.q.carrier }) : '<span class="small muted">Logistics awards</span>';
          return '<tr class="' + (award && award.carrier === x.q.carrier ? 'is-award' : '') + '"><th scope="row"><button type="button" class="plink" data-act="party" data-id="' + x.q.carrier + '">' + esc(p.name) + '</button><small>' + esc(p.equipment) + ' · ' + p.perf.onTime + '/' + p.perf.loads + ' on time' + (p.perf.loads < 10 ? ' (sample too small)' : '') + (p.perf.cancels90 ? ' · ' + p.perf.cancels90 + ' cancellations in 90 days' : '') + '</small></th>' +
            lanes.map((k) => '<td class="r num" data-l="To ' + esc(town(k)) + '">' + (x.q.rates[k] != null ? u.rate(x.q.rates[k]) : '—') + (x.q.fsc && x.r[k] != null ? '<small>' + u.rate(x.r[k]) + ' all-in</small>' : '') + '</td>').join('') +
            '<td class="r num qtot" data-l="All-in total">' + (x.total == null ? '<strong>Incomplete</strong><small>not every lane quoted</small>' : '<strong>' + u.money(x.total) + '</strong><small>' + (x.total - est >= 0 ? '+' : u.minus) + u.money(Math.abs(x.total - est)) + ' vs estimate</small>') + '</td><td class="qv"><div class="chips">' + chips.join('') + '</div><small>' + esc(x.q.note || '') + '</small></td><td class="actc">' + act + '</td></tr>';
        }).join('') +
        rfq.quotes.filter((q) => q.declined).map((q) => '<tr class="is-declined"><th scope="row">' + esc(E.party(state, q.carrier).name) + '</th><td colspan="' + (lanes.length + 1) + '" class="muted qdash">—</td><td colspan="2" class="qv">' + V.chip('expired', 'Declined') + '<small>' + esc(q.note) + '</small></td></tr>').join('') +
        '</tbody></table></div><p class="small muted">Estimate in the approved plan: ' + u.cad(est) + '. Quotes are normalized to all-in CAD before ranking; an incomplete quote never looks cheaper.</p>' +
        (!award ? '<div class="row-actions">' + (rfq.requested === false && auth.award ? V.btn('Send RFQ to approved carriers (simulated)', 'rfq', { cls: 'small primary', icon: 'mail', id: 'rfq-btn' }) : '') + (anyExpired && auth.award ? V.btn('Re-quote all expired', 'requote', { cls: 'small', icon: 'refresh', id: 'requote-btn' }) : '') + V.btn('Record a phone quote', 'form', { cls: 'small ghost', icon: 'phone', data: { form: 'quote-manual', id: tr.id } }) + (!auth.award ? V.btn('Switch to Samuel (logistics)', 'role', { cls: 'small', data: { role: 'logistics' }, id: 'switch-logistics' }) : '') + '</div>' : '');
      if (award) {
        rfqHtml += award.state === 'accepted'
          ? '<p class="callout tone-leaf">' + icon('check', 16) + '<span><strong>' + esc(E.party(state, award.carrier).name) + ' accepted, ' + esc(V.when(award.acceptedAt)) + ' (simulated reply).</strong> Freight is firm; variance ' + u.pct(award.variancePct || 0) + ' vs estimate' + ((award.variancePct || 0) <= 10 ? ', inside the 10% policy, so approval v' + tr.approval.version + ' stands.' : '.') + (rfq.backup ? ' Ranked backup: ' + esc(E.party(state, rfq.backup).short) + ' (not reserved).' : '') + '</span></p>'
          : '<p class="dcard-progress" role="status"><span class="spinner" aria-hidden="true"></span>Tender sent to ' + esc(E.party(state, award.carrier).name) + ' (simulated). An award becomes a booking only when the carrier accepts.</p>';
      }
    }
    let appt = '';
    if (rfq && rfq.award && rfq.award.state === 'accepted') {
      const fac = [[V.pname(tr.supplier) + ', ' + tr.origin, 'Pickups', totalLoads + ' slots from ' + u.dayShort(Math.max(tr.windowStart, state.now))]].concat(lanes.map((k) => { const b = E.party(state, E.demand(state, k).buyer); return [b.name + ', ' + b.town, 'Receiving', alloc[k] + ' slots · ' + V.hoursLabel(b.hours || { days: [1, 2, 3, 4, 5], open: 420, close: 960 })]; }));
      const st = tr.appts ? tr.appts.state : null;
      appt = '<section class="panel" aria-labelledby="apt-h"><div class="panel-head"><h2 id="apt-h">Appointments</h2>' + (st === 'confirmed' ? V.chip('booked', 'Confirmed') : st === 'requested' ? V.chip('requested') : st === 'failed' ? V.chip('blocked', 'Does not fit') : '') + '</div><ul class="appts">' + fac.map((f) => '<li><span><strong>' + esc(f[0]) + '</strong><small>' + f[1] + ': ' + esc(f[2]) + '</small></span>' + (st === 'confirmed' ? V.chip('booked', 'Confirmed (simulated reply)') : st === 'requested' ? V.chip('requested', 'Requested') : V.chip('planned', 'Not requested')) + '</li>').join('') + '</ul>' +
        (st === 'failed' ? '<p class="callout tone-brick">' + icon('alert', 16) + '<span>' + esc(tr.appts.reason) + '</span></p>' + V.btn('Edit lot window', 'form', { cls: 'small', data: { form: 'trade-edit', id: tr.id } }) : '') +
        (!st || st === 'failed' ? (auth.award ? V.btn('Request appointments (simulated)', 'appts', { cls: 'primary', icon: 'clock', id: 'appts-btn' }) : '<p class="small muted">Logistics books appointments.</p>') : st === 'requested' ? '<p class="dcard-progress" role="status"><span class="spinner" aria-hidden="true"></span>A calendar request is not a confirmed slot. Waiting for each facility…</p>' : '') + '</section>';
    }
    let loadsHtml = '';
    const loads = state.loads.filter((l) => l.trade === tr.id);
    if (loads.length) {
      loadsHtml = '<section class="panel" aria-labelledby="tl-h"><div class="panel-head"><h2 id="tl-h">Loads booked</h2>' + V.link('Control tower', '#/loads', 'small ghost') + '</div><div class="table-wrap"><table class="mini" id="booked-loads"><caption class="sr-only">Loads for ' + tr.id + '</caption><thead><tr><th scope="col">Load</th><th scope="col">Pickup</th><th scope="col">To</th><th scope="col" class="r">Planned</th><th scope="col">Status</th></tr></thead><tbody>' +
        loads.map((l) => '<tr><th scope="row"><a href="#/load/' + l.id + '">' + l.id + '</a></th><td>' + esc(V.when(l.pickupAt)) + '</td><td>' + esc(E.party(state, E.demand(state, l.demand).buyer).short) + '</td><td class="r num">' + u.t1(l.planned) + ' t</td><td>' + V.loadChip(state, l) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<p class="small muted">Planned tonnes stay unconfirmed until the origin ticket is compared with the loading plan.</p></section>';
    }
    const carrierView = '<details class="cview"><summary>' + icon('lock', 15) + 'What the carrier sees on the freight order</summary><dl class="doc-kv"><div><dt>Freight order</dt><dd>FO-' + tr.id.slice(3) + ', ' + lanes.map((k) => alloc[k] + ' × ' + esc(V.commodityName(tr.commodity).toLowerCase()) + ', ' + esc(tr.origin) + ' → ' + esc(town(k))).join('; ') + '</dd></div><div><dt>Per load</dt><dd>' + tr.payload + ' t target, 8-axle B-train hopper, clean (previous cargo: grain)</dd></div><div><dt>Windows</dt><dd>Pickup ' + esc(u.dayShort(tr.windowStart)) + ' – ' + esc(u.dayShort(tr.windowEnd)) + '; receiving per appointment</dd></div><div><dt>Rate</dt><dd>Their own quoted rate only</dd></div><div><dt>Not shown</dt><dd>Purchase price, buyer prices, margins, other carriers’ quotes</dd></div></dl></details>';
    return '<div class="wrap freight-grid"><div class="fg-main">' + (!(rfq && rfq.award) ? standingCallout(state, tr) : '') + '<section class="panel" aria-labelledby="rq-h"><div class="panel-head"><h2 id="rq-h">Freight quotes · RFQ-' + tr.id.slice(3) + '</h2>' + (rfq && !rfq.pending && rfq.requested !== false ? V.chip('simulated', 'Simulated replies') : '') + '</div>' + rfqHtml + carrierView + '</section>' + appt + loadsHtml + '</div><div class="fg-side">' + payloadCard(tr) + '</div></div>';
  }

  /* ---------------- Stage 5: P&L and history ---------------- */
  function stagePnl(state, tr) {
    const loads = E.loadsOf(state, tr.id);
    let q = E.zeroLines(); let c = E.zeroLines(); let a = E.zeroLines(); let nRec = 0;
    loads.forEach((l) => {
      const ql = E.quotedLoadLines(state, l); if (!ql) return;
      q = E.addLines(q, ql); c = E.addLines(c, E.currentLoadLines(state, l));
      if (l.status === 'reconciled' || l.status === 'settled') { const al = E.actualLoadLines(state, l); if (al) { a = E.addLines(a, al.lines); nRec += 1; } }
    });
    const p = E.tradePnl(state, tr);
    const keys = E.LINE_KEYS;
    const sign = (k) => (k === 'sale' ? '' : u.minus);
    const tbl = loads.length ? '<div class="table-wrap"><table class="econ"><caption class="sr-only">Quoted, current and actual by line, CAD</caption><thead><tr><th scope="col">Line</th><th scope="col" class="r">Quoted</th><th scope="col" class="r">Current</th><th scope="col" class="r">Actual (' + nRec + ' of ' + loads.length + ' loads)</th></tr></thead><tbody>' +
      keys.map((k) => '<tr><th scope="row">' + E.LINE_LABELS[k] + '</th><td class="r num">' + (q[k] ? sign(k) : '') + u.money(q[k] || 0) + '</td><td class="r num">' + (c[k] ? sign(k) : '') + u.money(c[k] || 0) + '</td><td class="r num">' + (nRec ? (a[k] ? sign(k) : '') + u.money(a[k] || 0) : '—') + '</td></tr>').join('') +
      '<tr class="tot"><th scope="row">Contribution</th><td class="r num">' + u.money(E.contrib(q) || 0) + '</td><td class="r num">' + u.money(E.contrib(c) || 0) + '</td><td class="r num">' + (nRec ? u.money(E.contrib(a)) : '—') + '</td></tr></tbody></table></div>'
      : p.has ? '<p>Approved plan: quoted ' + u.cad(p.quoted) + ', current ' + u.cad(p.current) + ' (freight ' + (tr.rfq && tr.rfq.award && tr.rfq.award.state === 'accepted' ? 'firm' : 'indicative') + '). Lines split by load once loads are booked.</p>' : '<p class="muted">No priced sale yet: contribution is not estimated for an uncovered purchase.</p>';
    const ids = new Set([tr.id].concat(loads.map((l) => l.id)).concat(Object.values(state.exceptions).filter((x) => loads.some((l) => l.id === x.load)).map((x) => x.id)));
    const hist = state.events.filter((e) => ids.has(e.ref)).slice(-14).reverse();
    const pos = E.position(state).find((r) => r.commodity === tr.commodity);
    return '<div class="wrap two"><section class="panel" aria-labelledby="pn-h"><div class="panel-head"><h2 id="pn-h">Quoted, current, actual</h2>' + V.chip(nRec === loads.length && loads.length ? 'firm' : 'indicative', nRec === loads.length && loads.length ? 'All loads reconciled' : 'In progress') + '</div>' + tbl + '<p class="small muted">Current uses today’s evidence: firm freight, rebookings, tickets and treatments. Actual counts reconciled loads only.</p>' +
      (tr.approvals && tr.approvals.length ? '<h3 class="h3">Approval versions</h3><ul class="contracts">' + tr.approvals.map((v) => '<li><span>' + icon('check', 14) + '<strong>v' + v.version + '</strong> ' + esc(v.by) + ', ' + esc(V.when(v.at)) + '</span>' + (v.contribution != null ? '<span class="num">' + u.cad(v.contribution) + '</span>' : '') + '</li>').join('') + '</ul>' : '') +
      (pos && pos.mtmNote.some((n) => n.indexOf(tr.id) === 0) ? '<p class="small">' + icon('chart', 14) + ' Mark-to-market on the uncovered part: ' + esc(pos.mtmNote.find((n) => n.indexOf(tr.id) === 0)) + '.</p>' : '') + '</section>' +
      '<section class="panel" aria-labelledby="lo-h"><div class="panel-head"><h2 id="lo-h">Loads</h2></div>' + (loads.length ? '<ul class="lt-list">' + loads.map((l) => '<li><a href="' + V.refHref(state, l.id) + '">' + u.kernel(tr.commodity, 12) + '<span class="lt-id">' + l.id + '</span><span class="lt-lane">' + esc(u.dayShort(l.pickupAt)) + ' · ' + esc(l.carrier ? E.party(state, l.carrier).short : 'no carrier') + '</span>' + V.loadChip(state, l) + '<span class="lt-eta num">' + (l.docs.receiving ? u.t3(l.docs.receiving.net) : l.docs.origin ? u.t3(l.docs.origin.net) : u.t1(l.planned)) + ' t</span></a></li>').join('') + '</ul>' : '<p class="muted small">No loads yet.</p>') +
      '<h3 class="h3">History</h3><ol class="logl">' + (hist.length ? hist.map((e) => '<li><time class="num">' + u.hhmm(e.at % 1440) + '</time><div><p>' + esc(e.text) + '</p><small>' + esc(u.dayShort(e.at)) + ' · ' + esc(e.who) + '</small></div></li>').join('') : '<li class="muted">' + (tr.approval ? 'Approved v' + tr.approval.version + ' by ' + esc(tr.approval.by) + ', ' + esc(u.dayShort(tr.approval.at)) + '.' : 'No history yet.') + '</li>') + '</ol></section></div>';
  }

  function defaultStage(state, tr) {
    if (tr.status === 'cancelled') return 'pnl';
    if (E.requiredMissing(state, tr).length) return 'source';
    if (!tr.approval || !tr.approval.valid) return Object.values(tr.alloc || {}).some((n) => n) && !E.approvalChecks(state, tr, state.role).blocked ? 'approve' : 'price';
    if (!E.loadsOf(state, tr.id).length && Object.values(tr.approval.snapshot.alloc).some((n) => n)) return 'freight';
    if (!Object.values(tr.approval.snapshot.alloc).some((n) => n)) return 'price';
    return 'pnl';
  }
  V.trade = function (state, route) {
    const tr = state.trades[route.id];
    if (!tr) return V.band('<div class="page-head"><div><h1>Trade not found</h1><p>It may have been reset or never created in this workspace.</p></div></div>', 'band-page') + '<div class="wrap"><div class="empty">' + V.link('All trades', '#/trades', 'small') + '</div></div>';
    let stage = route.stage;
    if (!TABS.some((t) => t[0] === stage)) stage = defaultStage(state, tr);
    const body = stage === 'source' ? stageSource(state, tr) : stage === 'approve' ? stageApprove(state, tr) : stage === 'freight' ? stageFreight(state, tr) : stage === 'pnl' ? stagePnl(state, tr) : stagePrice(state, tr);
    return head(state, tr, stage) + body;
  };
  V.confirmationDoc = confirmationDoc;
  V.tradeStage = function (state, route) { const tr = state.trades[route.id]; if (!tr) return null; return TABS.some((t) => t[0] === route.stage) ? route.stage : defaultStage(state, tr); };
})();
