/* TradeDesk V3 — deterministic commercial engine. One code path for every trade, bid, load and exception.
   Delivered contribution, allocation balances, freight quotes, schedules, reconciliation, attribution,
   positions with mark-to-market, exposure, queues and invariants.
   Rounding policy (shown in the UI): each cost line is rounded to the cent per load, then summed. */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});
  const D = TD.DATA;
  const u = TD.u;

  const LINE_KEYS = ['sale', 'purchase', 'freight', 'quality', 'financing', 'admin', 'exceptions'];
  const LINE_LABELS = { sale: 'Delivered sale', purchase: 'Purchase', freight: 'Freight', quality: 'Quality adjustment', financing: 'Financing', admin: 'Handling and admin', exceptions: 'Exceptions and claims' };
  const ACTIVE_LOAD = (l) => l.status !== 'cancelled';

  /* ---------- Lookups ---------- */
  const party = (s, id) => (s.parties || {})[id] || null;
  const demand = (s, id) => (s.demands || []).find((d) => d.id === id) || null;
  const trade = (s, id) => (s.trades || {})[id] || null;
  const load = (s, id) => (s.loads || []).find((l) => l.id === id) || null;
  const loadsOf = (s, tid) => s.loads.filter((l) => l.trade === tid && ACTIVE_LOAD(l));
  const laneKey = (origin, buyer) => origin + '>' + buyer;
  function lane(s, origin, buyer) {
    if (!origin) return null;
    const k = laneKey(origin, buyer);
    return (s.lanes && s.lanes[k]) || D.lanes[k] || null;
  }
  /* Buyer delivery sites. A bid delivers to one site; lanes to a second site are keyed origin>buyer:site.
     A town that is not a site on file has no lane history: freight stays unresolved, never borrowed. */
  function sitesOf(p) { if (!p) return []; return p.sites && p.sites.length ? p.sites : [{ id: 'main', name: (p.short || p.name), town: p.town, address: p.address || p.town, main: true }]; }
  function siteOf(s, dem) { const p = party(s, dem.buyer); const ss = sitesOf(p); if (dem.site) return ss.find((x) => x.id === dem.site) || null; if (dem.destTown) return ss.find((x) => x.town === dem.destTown) || null; return ss.find((x) => x.main) || ss[0] || null; }
  function destTown(s, dem) { if (!dem) return null; if (dem.destTown) return dem.destTown; const st = siteOf(s, dem); return st ? st.town : (party(s, dem.buyer) || {}).town; }
  function laneKeyFor(s, origin, dem) { const st = siteOf(s, dem); if (!st) return laneKey(origin, dem.buyer) + '@' + (dem.destTown || ''); return st.main ? laneKey(origin, dem.buyer) : laneKey(origin, dem.buyer) + ':' + st.id; }
  function laneFor(s, origin, dem) { if (!origin || !dem) return null; const k = laneKeyFor(s, origin, dem); return (s.lanes && s.lanes[k]) || D.lanes[k] || null; }

  /* ---------- Market (CT-06) ---------- */
  function benchmark(s, id) {
    const b = s.benchmarks[id];
    if (!b) return null;
    const age = s.now - b.at;
    return Object.assign({}, b, { ageMin: age, stale: age > D.staleAfterMin });
  }
  function futuresCad(s, month) {
    const f = benchmark(s, month); const fx = benchmark(s, 'USDCAD');
    if (!f || !fx) return null;
    const c = D.commodities[f.commodity];
    const bu = u.buPerT(c.lbPerBu);
    return { fut: f, fx: fx, buPerT: bu, value: u.r2(f.value * fx.value * bu), stale: f.stale || fx.stale };
  }
  function demandPrice(s, dem) {
    if (dem.priceType === 'basis') {
      const f = futuresCad(s, dem.month);
      if (!f) return { price: null, stale: true, note: 'No benchmark for ' + dem.month };
      return { price: u.r2(f.value + dem.basis), stale: f.stale, futures: f, note: dem.month + ' ' + u.rate(f.value) + (dem.basis >= 0 ? ' + ' : ' − ') + u.rate(Math.abs(dem.basis)) + ' basis' };
    }
    return { price: dem.price, stale: false, note: 'Flat price' };
  }
  function bidStatus(s, dem) {
    if (dem.status === 'withdrawn') return 'withdrawn';
    if (dem.validUntil != null && s.now > dem.validUntil) return 'expired';
    if (s.now > dem.windowEnd) return 'closed';
    return 'open';
  }

  /* ---------- Time helpers on the demo clock ---------- */
  const DAY = 1440;
  const weekday = (min) => ((5 + Math.floor(min / DAY)) % 7 + 7) % 7; // day 0 is a Friday
  const isBusiness = (min) => { const w = weekday(min); return w >= 1 && w <= 5; };
  function nextBusinessNoon(min) { let d = Math.floor(min / DAY) + 1; while (!isBusiness(d * DAY)) d += 1; return d * DAY + 720; }
  function quoteValidity(rule, sentAt) {
    if (rule === 'nextNoon') return nextBusinessNoon(sentAt);
    if (rule === 'next17') return (Math.floor(sentAt / DAY) + 1) * DAY + 1020;
    return sentAt + (Number(rule) || 24) * 60;
  }
  const roundUpHalf = (m) => Math.ceil(m / 30) * 30;
  function openAt(p, min) { // receiving open/close on the day of min
    const h = p.hours || { days: [1, 2, 3, 4, 5], open: 420, close: 960 };
    const d = Math.floor(min / DAY);
    return { open: d * DAY + h.open, close: d * DAY + h.close, isOpen: h.days.includes(weekday(min)) };
  }
  function nextOpening(p, min) {
    const h = p.hours || { days: [1, 2, 3, 4, 5], open: 420, close: 960 };
    let d = Math.floor(min / DAY);
    for (let i = 0; i < 10; i++) {
      const o = d * DAY + h.open, c = d * DAY + h.close;
      if (h.days.includes(weekday(d * DAY))) { if (min <= o) return o; if (min <= c) return min; }
      d += 1; min = d * DAY;
    }
    return min;
  }

  /* ---------- Delivered economics (CT-07, CT-05.2) ---------- */
  function financingRate(purchase, days) { return u.r2(purchase * (D.finance.ratePct / 100) * (days / 365)); }
  function moistureOver(moisture, max) { if (moisture == null || max == null) return 0; return Math.max(0, u.r1(moisture - max)); }
  const overlap = (a1, a2, b1, b2) => a1 <= b2 && b1 <= a2;

  function rates(s, tr, dem, opts) {
    opts = opts || {};
    const p = party(s, dem.buyer) || {};
    const rule = p.rule || {};
    const dp = demandPrice(s, dem);
    const moisture = opts.moisture != null ? opts.moisture : tr.moisture;
    const site = siteOf(s, dem);
    const out = { demand: dem.id, buyer: dem.buyer, name: p.short || p.name, town: destTown(s, dem), site: site, siteNote: site && !site.main ? site.name : dem.destTown && !site ? dem.destTown + ' (not a site on file)' : null, dem: dem, price: dp.price, priceNote: dp.note, priceStale: dp.stale, purchase: tr.price, moisture: moisture, ruleLabel: rule.label, ruleVersion: rule.version };
    const bs = bidStatus(s, dem);
    let compat = 'pass';
    let reason = 'Pass: meets ' + (rule.version || 'buyer rule');
    const over = moistureOver(moisture, rule.maxMoisture);
    if (p.status === 'On hold') { compat = 'excluded'; reason = p.hold || 'Counterparty on hold.'; }
    else if (p.status === 'Pending') { compat = 'excluded'; reason = 'Counterparty pending finance approval of its credit limit.'; }
    else if (bs === 'withdrawn') { compat = 'excluded'; reason = 'Bid withdrawn by the buyer.'; }
    else if (bs === 'expired') { compat = 'excluded'; reason = 'Bid expired ' + u.when(dem.validUntil, s.now) + '.'; }
    else if (bs === 'closed') { compat = 'excluded'; reason = 'Delivery window closed.'; }
    else if (tr.windowStart != null && !overlap(tr.windowStart, tr.windowEnd, dem.windowStart, dem.windowEnd)) { compat = 'excluded'; reason = 'Pickup window ' + u.dayShort(tr.windowStart) + '–' + u.dayShort(tr.windowEnd) + ' does not overlap delivery ' + u.dayShort(dem.windowStart) + '–' + u.dayShort(dem.windowEnd) + '.'; }
    else if (moisture == null) { compat = 'unknown'; reason = 'Moisture missing: a firm compatibility call is blocked until it is evidenced.'; }
    else if (rule.hardMax && moisture > rule.maxMoisture) { compat = 'fail'; reason = 'Fail: accepts ' + rule.maxMoisture.toFixed(1) + '% max, the lot states ' + moisture.toFixed(1) + '%.'; }
    else if (rule.needsTestWeight && !tr.testWeight) { compat = 'unknown'; reason = 'Unknown: test weight (min ' + (rule.minTestWeight || 54) + ' lb/bu) is mandatory and not yet in evidence.'; }
    else if (rule.minTestWeight && tr.testWeight && tr.testWeight < rule.minTestWeight) { compat = 'fail'; reason = 'Fail: test weight ' + tr.testWeight + ' lb/bu is under the ' + rule.minTestWeight + ' lb/bu minimum.'; }
    else if (over > 0) { compat = 'discount'; reason = 'Conditional discount: ' + over.toFixed(1) + ' pt over ' + rule.maxMoisture.toFixed(1) + '% max.'; }
    out.compat = compat; out.reason = reason; out.over = over; out.bidStatus = bs;

    const ln = laneFor(s, tr.origin, dem);
    out.lane = ln;
    const firm = opts.firm && opts.firm[dem.id] != null ? opts.firm[dem.id] : null;
    const manual = tr.freightManual && tr.freightManual[dem.id] != null ? tr.freightManual[dem.id] : null;
    const fqId = tr.freightQuote && tr.freightQuote[dem.id]; const fq = fqId && s.fquotes ? s.fquotes[fqId] : null;
    const fqRate = fq ? fqRatePerT(s, fq, tr.payload, ln) : null;
    const dOpt = tr.deliveredOption && tr.deliveredOption.town === out.town && tr.deliveredOption.price != null ? tr.deliveredOption : null;
    if (firm != null) { out.freight = firm; out.freightStatus = 'firm'; out.freightBasis = 'Firm: awarded ' + (opts.firmRef || 'quote'); }
    else if (fq && fqRate != null && !(fq.validUntil != null && s.now > fq.validUntil)) {
      const shock = opts.freightPct || 0;
      out.freight = u.r2(fqRate * (1 + shock / 100)); out.freightStatus = 'quoted'; out.fq = fq.id;
      out.freightBasis = 'Carrier quote ' + fq.id + ' from ' + ((party(s, fq.carrier) || {}).short || 'carrier') + ' (' + fqBasisLabel(fq) + ')' + (fq.validUntil != null ? ', valid to ' + u.when(fq.validUntil, s.now) : '') + (shock ? ', ' + (shock > 0 ? '+' : '') + shock + '% scenario' : '');
    }
    else if (manual != null || ln) {
      const base = manual != null ? manual : ln.rate;
      const shock = opts.freightPct || 0;
      out.freight = u.r2(base * (1 + shock / 100)); out.freightStatus = 'indicative';
      out.freightBasis = (manual != null ? 'Indicative: entered by the desk' : 'Indicative: lane history, ' + ln.n + ' loads ' + ln.period + ' (range ' + ln.range + ')') + (fq ? '; carrier quote ' + fq.id + ' lapsed' : '') + (shock ? ', ' + (shock > 0 ? '+' : '') + shock + '% scenario' : '');
    } else { out.freight = null; out.freightStatus = 'unknown'; out.freightBasis = tr.origin ? 'No lane history from ' + tr.origin + ' to ' + out.town + (out.siteNote && !site ? ', ' + out.siteNote : '') + '. Freight is unresolved, not zero: enter a rate.' : 'Origin unknown. Freight is unresolved, not zero.'; }

    if (over > 0 && compat !== 'excluded' && out.price != null) {
      const shrinkPct = u.r2((rule.shrinkPerPt || 1.5) * over);
      const shrinkValue = (shrinkPct / 100) * out.price;
      const drying = (rule.dryingPerPt || 3) * over;
      out.quality = u.r2(shrinkValue + drying);
      out.qualityBasis = (rule.version || 'Buyer schedule') + ': ' + shrinkPct.toFixed(2) + '% shrink (' + u.rate(shrinkValue) + '/t) + drying ' + u.rate(drying) + '/t';
    } else { out.quality = 0; out.qualityBasis = moisture == null ? 'Unresolved until moisture is evidenced' : 'No discount at ' + moisture.toFixed(1) + '% (' + (rule.maxMoisture != null ? 'max ' + rule.maxMoisture.toFixed(1) + '%' : 'no rule') + ')'; }
    const days = p.financeDays || D.finance.days;
    out.financing = tr.price != null ? financingRate(tr.price, days) : 0;
    out.financingBasis = D.finance.ratePct + '% a year on purchase cost for ' + days + ' days between supplier and buyer payment';
    out.admin = D.finance.adminPerT; out.adminBasis = 'Cargo insurance and bank fees, desk standard';
    out.exceptions = p.expectedDetention || 0;
    out.exceptionBasis = p.expectedDetention ? 'Detention exposure: ' + p.detentionBasis : 'No recurring exception cost at this receiver';
    out.contribution = out.freight == null || out.price == null || tr.price == null ? null : u.r2(out.price - tr.price - out.freight - out.quality - out.financing - out.admin - out.exceptions);
    // The supplier's delivered alternative to this buyer's town: no freight, the delivered price. Used when it leaves more.
    if (dOpt && firm == null && out.price != null) {
      const alt = u.r2(out.price - dOpt.price - out.quality - financingRate(dOpt.price, days) - out.admin - out.exceptions);
      if (out.contribution == null || alt > out.contribution) { out.option = 'delivered'; out.fobContribution = out.contribution; out.purchase = dOpt.price; out.freight = 0; out.freightStatus = 'delivered'; out.financing = financingRate(dOpt.price, days); out.freightBasis = 'Supplier delivers to ' + out.town + ' (delivered option at ' + u.rate(dOpt.price) + ')' + (out.fobContribution != null ? '; FOB farm would leave ' + u.rate(out.fobContribution) + '/t' : ''); out.contribution = alt; }
    }
    return out;
  }

  function linesFromRates(r, tonnes) {
    return {
      sale: r.price == null ? null : u.lineCents(r.price, tonnes), purchase: u.lineCents(r.purchase || 0, tonnes),
      freight: r.freight == null ? null : u.lineCents(r.freight, tonnes), quality: u.lineCents(r.quality || 0, tonnes),
      financing: u.lineCents(r.financing || 0, tonnes), admin: u.lineCents(r.admin || 0, tonnes), exceptions: u.lineCents(r.exceptions || 0, tonnes)
    };
  }
  function scaleLines(l, n) { const o = {}; LINE_KEYS.forEach((k) => { o[k] = l[k] == null ? null : l[k] * n; }); return o; }
  function addLines(a, b) { const o = {}; LINE_KEYS.forEach((k) => { o[k] = a[k] == null || b[k] == null ? null : a[k] + b[k]; }); return o; }
  const zeroLines = () => ({ sale: 0, purchase: 0, freight: 0, quality: 0, financing: 0, admin: 0, exceptions: 0 });
  function contrib(l) { if (!l || l.freight == null || l.sale == null) return null; return l.sale - l.purchase - l.freight - l.quality - l.financing - l.admin - l.exceptions; }

  /* ---------- Allocation ledger (CT-04.2) ---------- */
  function reservedOnDemand(s, demId, exceptTrade) {
    let t = 0;
    s.ledger.forEach((e) => { if (e.demand === demId && e.trade !== exceptTrade) t += e.tonnes; });
    return Math.round(t * 1000) / 1000;
  }
  function demandOpen(s, dem, exceptTrade) {
    const taken = dem.priorAllocated + reservedOnDemand(s, dem.id, exceptTrade);
    return { taken: taken, open: Math.max(0, u.r2(dem.qty - taken)), maxOpen: Math.max(0, u.r2(dem.qty * (1 + dem.tolPct / 100) - taken)) };
  }
  function maxLoadsFor(s, tr, dem) { const o = demandOpen(s, dem, tr.id); return tr.payload ? Math.max(0, Math.floor((o.maxOpen + 1e-9) / tr.payload)) : 0; }

  function tradeOpts(s, tr, scenario) {
    const award = tr.rfq && tr.rfq.award && tr.rfq.award.state === 'accepted' ? tr.rfq.award : null;
    return { moisture: scenario && scenario.moisture != null ? scenario.moisture : tr.moisture, freightPct: scenario ? scenario.freightPct || 0 : 0, firm: award ? award.rates : null, firmRef: award ? (party(s, award.carrier) || {}).short : '' };
  }
  function comparison(s, tr, scenario) {
    const o = tradeOpts(s, tr, scenario);
    return s.demands.filter((d) => d.commodity === tr.commodity && (bidStatus(s, d) !== 'closed' || (tr.alloc && tr.alloc[d.id]))).map((d) => rates(s, tr, d, o));
  }
  function planSummary(s, tr, scenario) {
    const rows = comparison(s, tr, scenario);
    let total = zeroLines(); let loads = 0; let incomplete = false;
    const per = [];
    Object.keys(tr.alloc || {}).forEach((demId) => {
      const n = tr.alloc[demId]; if (!n) return;
      let r = rows.find((x) => x.demand === demId);
      if (!r) { const dm = demand(s, demId); if (!dm) return; r = rates(s, tr, dm, tradeOpts(s, tr, scenario)); }
      const perLoad = linesFromRates(r, tr.payload);
      const lines = scaleLines(perLoad, n);
      if (lines.freight == null || lines.sale == null) incomplete = true;
      total = addLines(total, lines); loads += n;
      per.push({ demand: demId, buyer: r.buyer, loads: n, tonnes: u.r2(n * tr.payload), rates: r, perLoad: perLoad, lines: lines, contribution: contrib(lines) });
    });
    const tonnes = u.r2(loads * (tr.payload || 0));
    const c = incomplete || !loads ? (loads ? null : 0) : contrib(total);
    return { rows: rows, per: per, loads: loads, tonnes: tonnes, unallocatedLoads: (tr.qtyLoads || 0) - loads, lines: total, contribution: c, perTonne: c == null || !tonnes ? null : c / 100 / tonnes, incomplete: incomplete };
  }
  function downside(tr) { return { moisture: u.r1((tr.moisture || 0) + (tr.downsideMoist || 0.5)), freightPct: 5 }; }

  function requiredMissing(s, tr) {
    const m = [];
    if (!tr.supplier) m.push('supplier');
    if (!tr.commodity) m.push('commodity');
    if (!tr.qtyLoads) m.push('quantity');
    if (!tr.payload) m.push('payload');
    if (tr.price == null) m.push('price');
    if (!tr.origin) m.push('origin');
    if (tr.windowStart == null || tr.windowEnd == null) m.push('pickup window');
    return m;
  }

  /* Approval checks (CT-01.2, CT-04, CT-05, CT-06, CT-09, CT-21). */
  function approvalChecks(s, tr, role) {
    const auth = D.authority[role];
    const usr = D.users[role];
    const plan = planSummary(s, tr, { moisture: tr.moisture, freightPct: 0 });
    const checks = [];
    const missing = requiredMissing(s, tr);
    if (missing.length) checks.push({ id: 'fields', block: true, text: 'Complete the lot first: ' + missing.join(', ') + ' missing.', fix: 'edit-lot' });
    const sup = party(s, tr.supplier);
    if (sup && sup.status !== 'Approved') checks.push({ id: 'supplier', block: true, text: sup.name + ' is ' + sup.status.toLowerCase() + ': suppliers must be approved before a purchase.' });
    if (tr.certainty === 'tentative') checks.push({ id: 'supply', block: true, text: 'Availability is still tentative' + (tr.tentativeWord ? ' (“' + tr.tentativeWord + '”)' : '') + '. Log the supplier’s confirmation before buying.', fix: 'confirm-supplier' });
    else if (tr.supplierConfirmed) checks.push({ id: 'supply', ok: true, text: 'Supplier confirmed ' + tr.qtyLoads + ' loads (' + u.t1(tr.qtyLoads * tr.payload) + ' t) at ' + u.when(tr.supplierConfirmed.at, s.now) + '.' });
    if (tr.validUntil != null && !(tr.approval && tr.approval.valid)) checks.push(s.now > tr.validUntil ? { id: 'offer', block: true, text: 'The supplier’s price lapsed ' + u.when(tr.validUntil, s.now) + ' (firm until). Re-confirm it with the supplier before buying.', fix: 'confirm-supplier' } : { id: 'offer', ok: true, warn: tr.validUntil - s.now < 240, text: 'The supplier’s price is firm until ' + u.when(tr.validUntil, s.now) + '.' });
    if (tr.payloadDerived) checks.push({ id: 'payload', ok: true, warn: true, text: 'Payload ' + tr.payload + ' t per load is derived from the stated total, not stated per load. Confirm before booking trucks.' });
    if (tr.windowEnd != null && s.now > tr.windowEnd) checks.push({ id: 'window', block: true, text: 'The pickup window lapsed ' + u.when(tr.windowEnd, s.now) + ': supplier availability is excluded from firm capacity. Edit the window after confirming new dates.', fix: 'edit-lot' });
    if (!plan.loads) checks.push({ id: 'alloc', ok: true, warn: true, text: 'No sale allocated: the purchase stays uncovered (price exposure).' });
    else if (plan.unallocatedLoads > 0) checks.push({ id: 'alloc', ok: true, warn: true, text: u.t1(plan.unallocatedLoads * tr.payload) + ' t stays uncovered after this plan.' });
    plan.per.forEach((p) => {
      const r = p.rates;
      if (r.compat === 'unknown' || r.compat === 'fail' || r.compat === 'excluded') checks.push({ id: 'q-' + p.demand, block: true, text: r.name + ': ' + r.reason });
      if (r.dem.priceType === 'basis' && r.priceStale) checks.push({ id: 'stale-' + p.demand, block: true, text: r.dem.month + ' benchmark is stale (entered ' + u.when(s.benchmarks[r.dem.month].at, s.now) + '): a stale price cannot support an executable sale. Refresh it first.', fix: 'refresh-' + r.dem.month });
      if (r.freight == null) checks.push({ id: 'fr-' + p.demand, block: true, text: r.name + ': freight unresolved. Enter an indicative rate or a carrier quote.' });
      if (r.contribution != null && r.contribution < auth.minContribution) checks.push({ id: 'min-' + p.demand, block: !D.authority.manager.trade || role !== 'manager' || r.contribution < D.authority.manager.minContribution, manager: true, text: r.name + ': ' + u.rate(r.contribution) + '/t is under the ' + u.rate(auth.minContribution) + '/t minimum for ' + usr.title.toLowerCase() + '. Manager approval required.', fix: role !== 'manager' ? 'role-manager' : null });
    });
    if (tr.moisture != null && plan.loads) checks.push({ id: 'quality', ok: true, warn: true, text: 'Moisture ' + tr.moisture.toFixed(1) + '% is a ' + (/lab/i.test(tr.moistureSource || '') ? 'lab result' : 'supplier statement') + '. Allocated buyers grade at destination' + (plan.per.some((p) => p.rates.compat === 'discount') ? '; the moisture discount is priced in.' : '.') });
    const purchaseValue = (tr.qtyLoads || 0) * (tr.payload || 0) * (tr.price || 0);
    if (!auth.trade) checks.push({ id: 'role', block: true, text: usr.title + ' cannot approve purchases or sales (segregation of duties).', fix: 'role-trader' });
    else if (purchaseValue > auth.purchaseLimit) checks.push({ id: 'limit', block: true, text: 'Purchase value ' + u.cad(u.toCents(purchaseValue)) + ' exceeds the ' + u.cad(u.toCents(auth.purchaseLimit)).replace('.00', '') + ' limit for ' + usr.title.toLowerCase() + '. Route to the desk manager.', fix: 'role-manager' });
    else checks.push({ id: 'limit', ok: true, text: 'Purchase value ' + u.cad(u.toCents(purchaseValue)) + ' is within the ' + u.cad(u.toCents(auth.purchaseLimit)).replace('.00', '') + ' limit for ' + usr.title.toLowerCase() + '.' });
    plan.per.forEach((p) => {
      const ex = exposure(s, p.buyer);
      const after = ex.current + (p.lines.sale || 0);
      const pct = ex.limit ? (after / u.toCents(ex.limit)) * 100 : 100;
      checks.push(after <= u.toCents(ex.limit) ? { id: 'credit-' + p.demand, ok: true, warn: pct > 85, text: p.rates.name + ' credit: ' + u.cad(after) + ' of ' + u.cad(u.toCents(ex.limit)) + ' after this sale (' + pct.toFixed(1) + '%).' } : { id: 'credit-' + p.demand, block: true, text: p.rates.name + ' credit limit exceeded: ' + u.cad(after) + ' of ' + u.cad(u.toCents(ex.limit)) + '.' });
      if (p.rates.dem.validUntil != null) checks.push({ id: 'bid-' + p.demand, ok: true, warn: true, text: p.rates.name + ' bid ' + p.demand + ' is valid until ' + u.when(p.rates.dem.validUntil, s.now) + '.' });
    });
    checks.push({ id: 'screen', ok: true, text: 'Counterparty screening current for all parties (no potential match).' });
    if (plan.loads) checks.push({ id: 'freight', ok: true, warn: true, text: 'Freight is indicative. A firm award may differ by up to ' + (auth.freightVariancePct || 10) + '% before re-approval is needed.' });
    return { checks: checks, blocked: checks.some((c) => c.block), plan: plan };
  }

  /* ---------- Freight quotes (CT-11) ---------- */
  function quoteFor(s, tr, carrier, sentAt, refresh) {
    const t = carrier.traits || {};
    const lanes = Object.keys(tr.approval ? tr.approval.snapshot.alloc : tr.alloc || {}).filter((k) => (tr.approval ? tr.approval.snapshot.alloc : tr.alloc)[k]);
    if (t.declines) return { carrier: carrier.id, declined: true, note: 'Declined: ' + t.declines };
    const r = {}; let missing = false;
    lanes.forEach((demId) => {
      const dm = demand(s, demId); const k = laneKeyFor(s, tr.origin, dm);
      const sheet = refresh && t.refreshSheet && t.refreshSheet[k] != null ? t.refreshSheet[k] : t.rateSheet && t.rateSheet[k] != null ? (refresh ? u.r2(t.rateSheet[k] * 1.02) : t.rateSheet[k]) : null;
      const ln = laneFor(s, tr.origin, dm);
      const v = sheet != null ? sheet : ln ? u.r2(ln.rate * (t.factor || 1) * (refresh ? 1.02 : 1)) : null;
      if (v == null) missing = true; r[demId] = v;
    });
    const stale = t.staleSheet && !refresh;
    return { carrier: carrier.id, rates: r, fsc: t.fsc || 0, sentAt: sentAt, validUntil: stale ? (Math.floor(sentAt / DAY)) * DAY - 420 : quoteValidity(t.validity || 24, sentAt), payload: carrier.verifiedPayload ? 'verified' : 'unverified', missingLane: missing,
      note: t.declines ? '' : stale ? 'Replied with yesterday’s rate sheet.' : t.fsc ? 'Rate excludes the ' + t.fsc.toFixed(1) + '% fuel surcharge.' : (carrier.verifiedPayload ? 'All-in, fuel included.' : 'Equipment listed as “' + carrier.equipment + '”.') + (refresh ? ' Refreshed quote.' : ''), refreshed: !!refresh, source: 'simulated' };
  }
  function quoteRates(q) { const f = 1 + (q.fsc || 0) / 100; const r = {}; Object.keys(q.rates || {}).forEach((k) => { r[k] = q.rates[k] == null ? null : u.r2(q.rates[k] * f); }); return r; }
  function quoteStatus(s, q) {
    if (q.declined) return 'declined';
    if (q.missingLane) return 'nolane';
    if (s.now > q.validUntil) return 'expired';
    if (q.capacity != null && q.need != null && q.capacity < q.need) return 'partial';
    const c = party(s, q.carrier);
    if (c && c.status !== 'Approved') return 'pending';
    return 'valid';
  }
  /* A payload is usable when verified on the carrier record or declared in writing with the equipment in the quote. */
  const payloadOk = (q) => q.payload === 'verified' || q.payload === 'declared';

  /* ---------- Carrier quotes from messages (FQ-…) ---------- */
  function fqBasisLabel(fq) { return fq.rateBasis === 'load' ? 'CAD ' + u.rate(fq.rate) + ' per load' : fq.rateBasis === 'km' ? 'CAD ' + u.rate(fq.rate) + ' per km' : 'CAD ' + u.rate(fq.rate) + '/t' + (fq.fsc ? ' + ' + fq.fsc + '% fuel' : fq.fscIncluded ? ' all-in' : ''); }
  /* CAD/t all-in for a payload: per load ÷ payload; per km × lane km ÷ payload; fuel surcharge added. */
  function fqRatePerT(s, fq, payload, ln) {
    if (!fq || fq.rate == null) return null;
    const pl = Number(payload) || fq.payload || null;
    const fuel = 1 + (fq.fsc || 0) / 100;
    if (fq.rateBasis === 'load') return pl ? u.r2((fq.rate / pl) * fuel) : null;
    if (fq.rateBasis === 'km') { const km = ln ? ln.km : fq.km; return pl && km ? u.r2(((fq.rate * km) / pl) * fuel) : null; }
    return u.r2(fq.rate * fuel);
  }
  function fqConversion(s, fq, payload, ln) {
    const pl = Number(payload) || fq.payload || null; const per = fqRatePerT(s, fq, payload, ln);
    if (fq.rate == null) return 'No rate stated.';
    if (fq.rateBasis === 'load') return pl ? 'CAD ' + u.rate(fq.rate) + ' per load ÷ ' + pl + ' t = ' + u.rate(fq.rate / pl) + '/t' + (fq.fsc ? ', + ' + fq.fsc + '% fuel = ' + u.rate(per) + '/t' : '') : 'Per load: needs a payload to convert.';
    if (fq.rateBasis === 'km') { const km = ln ? ln.km : fq.km; return km && pl ? 'CAD ' + u.rate(fq.rate) + '/km × ' + km + ' km ÷ ' + pl + ' t = ' + u.rate((fq.rate * km) / pl) + '/t' + (fq.fsc ? ', + ' + fq.fsc + '% fuel = ' + u.rate(per) + '/t' : '') : 'Per km: no lane distance on file, so it cannot be converted.'; }
    return 'CAD ' + u.rate(fq.rate) + '/t' + (fq.fsc ? ' + ' + fq.fsc + '% fuel = ' + u.rate(per) + '/t all-in' : fq.fscIncluded ? ', fuel included' : '');
  }
  /* The buyer (and site) a destination town stands for. */
  function buyerAt(s, town) {
    const out = [];
    Object.values(s.parties).forEach((p) => { if (p.kind !== 'Buyer') return; sitesOf(p).forEach((st) => { if (st.town === town) out.push({ buyer: p.id, site: st.id, main: !!st.main, name: (p.short || p.name) + (st.main ? '' : ', ' + st.name) }); }); });
    return out;
  }
  /* Lots and loads that need freight on this lane: approved lots not yet awarded, unapproved lots with that sale
     in the plan, and loads that lost their carrier. Same lane and pickup day is a match; other days are shown, not offered. */
  function freightCandidates(s, fq) {
    const out = [];
    if (!fq || !fq.from || !fq.to) return out;
    const day = fq.pickupAt != null ? Math.floor(fq.pickupAt / DAY) : null;
    Object.values(s.trades).forEach((tr) => {
      if (tr.status === 'cancelled' || tr.status === 'expired' || tr.origin !== fq.from) return;
      const approved = !!(tr.approval && tr.approval.valid);
      if (approved && ((tr.rfq && tr.rfq.award) || loadsOf(s, tr.id).length)) return;
      const alloc = approved ? tr.approval.snapshot.alloc : tr.alloc || {};
      Object.keys(alloc).forEach((demId) => {
        if (!alloc[demId]) return;
        const dm = demand(s, demId); if (!dm || destTown(s, dm) !== fq.to) return;
        const inWin = day == null || tr.windowStart == null || (day >= Math.floor(tr.windowStart / DAY) && day <= Math.floor(tr.windowEnd / DAY));
        const b = party(s, dm.buyer) || {};
        out.push({ kind: 'lot', id: tr.id + ':' + demId, trade: tr.id, demand: demId, loads: alloc[demId], approved: approved, fit: inWin ? 'match' : 'date',
          label: tr.id + ' · ' + alloc[demId] + ' load' + (alloc[demId] > 1 ? 's' : '') + ' to ' + (b.short || b.name) + ' (' + demId + ')',
          detail: (approved ? 'Approved, freight not awarded yet: joins the freight comparison.' : 'Not approved yet: becomes the lane’s freight in the price ladder.') + ' Pickup window ' + (tr.windowStart != null ? u.dayShort(tr.windowStart) + '–' + u.dayShort(tr.windowEnd) : 'not set') + '.' + (fq.loads && fq.loads < alloc[demId] ? ' The quote covers ' + fq.loads + ' of ' + alloc[demId] + ' loads.' : ''),
          reason: inWin ? null : 'Pickup ' + u.dayShort(fq.pickupAt) + ' is outside the lot’s window ' + u.dayShort(tr.windowStart) + '–' + u.dayShort(tr.windowEnd) + '.' });
      });
    });
    s.loads.forEach((l) => {
      if (l.status === 'cancelled' || l.carrier || !['booked', 'loading'].includes(l.status)) return;
      const tr = trade(s, l.trade); const dm = demand(s, l.demand);
      if (!tr || !dm || tr.origin !== fq.from || destTown(s, dm) !== fq.to) return;
      const same = day == null || Math.floor(l.pickupAt / DAY) === day;
      out.push({ kind: 'load', id: l.id, load: l.id, trade: tr.id, demand: dm.id, exception: l.exception || null, loads: 1, fit: same ? 'match' : 'date',
        label: l.id + ' · no carrier, pickup ' + u.when(l.pickupAt, s.now) + (l.exception ? ' (' + l.exception + ')' : ''),
        detail: 'Joins the replacement options for ' + l.id + '.', reason: same ? null : 'The load picks up ' + u.dayShort(l.pickupAt) + ', the quote is for ' + u.dayShort(fq.pickupAt) + '.' });
    });
    return out.sort((a, b) => (a.fit === 'match' ? 0 : 1) - (b.fit === 'match' ? 0 : 1) || (a.kind === 'load' ? 0 : 1) - (b.kind === 'load' ? 0 : 1) || (b.approved ? 1 : 0) - (a.approved ? 1 : 0));
  }
  /* A message quote as a row of a lot's freight comparison. */
  function quoteFromFq(s, fq, tr, demIds) {
    const c = party(s, fq.carrier) || {};
    const rates = {}; let missing = false;
    const alloc = tr.approval && tr.approval.valid ? tr.approval.snapshot.alloc : tr.alloc || {};
    Object.keys(alloc).filter((k) => alloc[k]).forEach((k) => { const dm = demand(s, k); if (demIds.includes(k)) { rates[k] = fqRatePerT(s, Object.assign({}, fq, { fsc: 0 }), tr.payload, laneFor(s, tr.origin, dm)); if (rates[k] == null) missing = true; } else { rates[k] = null; missing = true; } });
    const need = demIds.reduce((a, k) => a + (alloc[k] || 0), 0);
    const declared = fq.payload != null && fq.equipmentBtrain;
    return { carrier: fq.carrier, rates: rates, fsc: fq.fsc || 0, sentAt: fq.receivedAt, validUntil: fq.validUntil != null ? fq.validUntil : nextBusinessNoon(fq.receivedAt), payload: c.verifiedPayload ? 'verified' : declared ? 'declared' : 'unverified', missingLane: missing, capacity: fq.loads || null, need: need, pickupAt: fq.pickupAt,
      note: 'From ' + (fq.source && /^MSG/.test(fq.source) ? fq.source : 'a pasted email') + ' (' + fq.id + '): ' + fqBasisLabel(fq) + (fq.equipment ? ', ' + fq.equipment : '') + (fq.payload ? ' ' + fq.payload + ' t' : '') + (fq.pickupAt != null ? ', pickup ' + u.when(fq.pickupAt, s.now) : '') + '.', source: 'email', fq: fq.id };
  }
  function quoteTotal(s, tr, q) {
    const alloc = tr.approval ? tr.approval.snapshot.alloc : tr.alloc;
    const r = quoteRates(q);
    return Object.keys(alloc).reduce((sum, k) => sum + (alloc[k] && r[k] != null ? alloc[k] * u.lineCents(r[k], tr.payload) : 0), 0);
  }

  /* ---------- Schedule (CT-13) ---------- */
  function scheduleSlots(s, tr, count) {
    const sup = party(s, tr.supplier) || {};
    let day = Math.max(Math.floor(tr.windowStart / DAY), Math.floor(s.now / DAY) + (s.now % DAY > 600 ? 1 : 0));
    const slots = [];
    const endDay = Math.floor(tr.windowEnd / DAY);
    while (slots.length < count && day <= endDay + 14) {
      if (isBusiness(day * DAY)) D.pickupTimes.forEach((t) => { if (slots.length < count && day * DAY + t > s.now) slots.push({ at: day * DAY + t, inWindow: day <= endDay }); });
      day += 1;
    }
    return { slots: slots, loadMins: sup.loadMins || 45, fits: slots.filter((x) => x.inWindow).length };
  }
  function etaFor(s, tr, buyerId, pickupAt, dem) {
    const sup = party(s, tr.supplier) || {}; const ln = dem ? laneFor(s, tr.origin, dem) : lane(s, tr.origin, buyerId);
    return pickupAt + (sup.loadMins || 45) + (ln ? ln.mins : 90);
  }

  /* ---------- Load economics and reconciliation (CT-17, CT-18) ---------- */
  function snapRates(s, l) {
    const tr = trade(s, l.trade);
    return tr && tr.approval && tr.approval.snapshot.rates[l.demand] ? tr.approval.snapshot.rates[l.demand] : null;
  }
  function quotedLoadLines(s, l) { const r = snapRates(s, l); return r ? linesFromRates(r, l.planned) : null; }

  /* Discrepancies found by comparing contract, origin, receiving and invoice (CT-17.2). */
  function findings(s, l) {
    const docs = l.docs || {};
    const O = docs.origin, R = docs.receiving, I = docs.invoice;
    if (!O || !R || !I) return { ready: false, missing: [!O && 'origin scale ticket', !R && 'receiving ticket', !I && 'carrier invoice'].filter(Boolean), list: [] };
    const r = snapRates(s, l) || {};
    const p = party(s, (demand(s, l.demand) || {}).buyer) || {};
    const rule = p.rule || {};
    const list = [];
    const over = moistureOver(R.moisture, rule.maxMoisture);
    if (over > 0) {
      const shrinkPct = u.r2((rule.shrinkPerPt || 1.5) * over);
      const shrinkKg = Math.round(R.net * 1000 * (shrinkPct / 100));
      const shrinkC = u.lineCents(r.price, shrinkKg / 1000);
      const dryingC = u.lineCents((rule.dryingPerPt || 3) * over, R.net);
      list.push({ id: 'moisture', role: 'quality', title: 'Moisture above contract maximum', detail: 'Receiving ' + R.moisture.toFixed(1) + '% vs ' + rule.maxMoisture.toFixed(1) + '% max under ' + (rule.version || 'the buyer schedule') + '; origin reading ' + (O.moisture != null ? O.moisture.toFixed(1) + '%' : 'not recorded') + ' (' + (O.source || 'origin') + '). Both measurements are kept.', amount: shrinkC + dryingC, shrinkKg: shrinkKg, shrinkC: shrinkC, dryingC: dryingC, over: over, shrinkPct: shrinkPct,
        options: [{ v: 'accept', label: 'Accept destination grade per contract formula', sub: over.toFixed(1) + ' pt × ' + (rule.shrinkPerPt || 1.5) + '% = ' + shrinkPct.toFixed(2) + '% shrink (' + u.t3(shrinkKg / 1000) + ' t, CAD ' + u.money(shrinkC) + ') + ' + over.toFixed(1) + ' × CAD ' + u.rate(rule.dryingPerPt || 3) + '/t drying (CAD ' + u.money(dryingC) + '). Total CAD ' + u.money(shrinkC + dryingC) + '.' }, { v: 'dispute', label: 'Dispute: request a re-test of the retained sample', sub: 'Opens a claim file (simulated). CAD ' + u.money(shrinkC + dryingC) + ' stays separate; the load is not marked reconciled while the claim is open.' }] });
    }
    if (rule.minTestWeight && R.testWeight != null && R.testWeight < rule.minTestWeight) {
      const lb = u.r1(rule.minTestWeight - R.testWeight); const disc = u.lineCents(2 * lb, R.net);
      list.push({ id: 'testweight', role: 'quality', title: 'Test weight under the buyer minimum', detail: R.testWeight + ' lb/bu vs ' + rule.minTestWeight + ' lb/bu minimum: CAD 2.00/t per lb discount.', amount: disc, options: [{ v: 'accept', label: 'Accept the grade discount', sub: 'CAD ' + u.money(disc) + ' off the sale.' }, { v: 'dispute', label: 'Dispute the grade', sub: 'Held separately until the official determination.' }] });
    }
    const lossPct = O.net ? ((O.net - R.net) / O.net) * 100 : 0;
    if (lossPct > D.finance.weightTolPct) {
      const excess = u.r2(O.net - R.net - O.net * D.finance.weightTolPct / 100);
      const claim = u.lineCents(r.price, Math.max(0, Math.round(excess * 1000) / 1000));
      list.push({ id: 'weight', role: 'quality', title: 'Transit loss beyond tolerance', detail: 'Origin ' + u.t3(O.net) + ' t → receiving ' + u.t3(R.net) + ' t (' + u.pct(-lossPct, 2) + '), tolerance ±' + D.finance.weightTolPct + '%.', amount: claim, options: [{ v: 'claim', label: 'Claim the excess loss from the carrier', sub: 'Recover CAD ' + u.money(claim) + ' (' + u.t3(excess) + ' t beyond tolerance at the sale price).' }, { v: 'absorb', label: 'Absorb the loss', sub: 'No claim; the loss stays in contribution.' }] });
    }
    if (Math.abs(I.qty - O.net) > 0.0005) {
      const diff = u.lineCents(I.rate, I.qty) - u.lineCents(I.rate, O.net);
      list.push({ id: 'invoice', role: 'finance', title: 'Carrier invoice on the wrong quantity basis', detail: I.ref + ' bills ' + u.t3(I.qty) + ' t; the freight order pays on origin certified net weight, ' + u.t3(O.net) + ' t.', amount: diff, options: [{ v: 'origin', label: 'Pay on origin net ' + u.t3(O.net) + ' t', sub: 'CAD ' + u.money(u.lineCents(I.rate, O.net)) + ' + tax. Short-pay CAD ' + u.money(Math.abs(diff)) + ' before tax, with a note to the carrier.' }, { v: 'invoice', label: 'Pay as invoiced on ' + u.t3(I.qty) + ' t', sub: 'CAD ' + u.money(u.lineCents(I.rate, I.qty)) + ' + tax. Accepts CAD ' + u.money(Math.abs(diff)) + ' of quantity leakage.' }] });
    }
    if (I.detention > 0) {
      list.push({ id: 'detention', role: 'finance', title: 'Detention billed', detail: 'Receiving wait ' + Math.round(R.wait || 0) + ' min against ' + D.finance.freeMins + ' min free time at CAD ' + D.finance.detentionPerHour + '/h.', amount: u.toCents(I.detention), options: [{ v: 'pay', label: 'Pay the detention', sub: 'CAD ' + u.money(u.toCents(I.detention)) + ' supported by the receiving timestamps.' }, { v: 'dispute', label: 'Dispute the detention', sub: 'Held until the carrier provides arrival evidence.' }] });
    }
    const d = (l.recon && l.recon.d) || {};
    const treated = list.filter((f) => d[f.id]).length;
    return { ready: true, list: list, treated: treated, all: treated === list.length, lossPct: lossPct };
  }

  function actualLoadLines(s, l) {
    const r = snapRates(s, l);
    const docs = l.docs || {};
    const O = docs.origin, R = docs.receiving, I = docs.invoice;
    if (!r || !O || !R) return null;
    const d = (l.recon && l.recon.d) || {};
    const f = findings(s, l);
    let qualityC = 0; let shrinkKg = 0; let shrinkC = 0; let dryingC = 0; let claimC = 0;
    (f.list || []).forEach((x) => {
      const won = d[x.id] && d[x.id].choice === 'dispute-won';
      if (x.id === 'moisture' && !won) { qualityC += x.amount; shrinkKg = x.shrinkKg; shrinkC = x.shrinkC; dryingC = x.dryingC; }
      if (x.id === 'testweight' && !won) qualityC += x.amount;
      if (x.id === 'weight' && d.weight && d.weight.choice === 'claim') claimC = x.amount;
    });
    const freightQty = I && d.invoice && d.invoice.choice === 'invoice' ? I.qty : O.net;
    const detention = I && I.detention && !(d.detention && d.detention.choice === 'dispute') ? u.toCents(I.detention) : 0;
    const lines = { sale: u.lineCents(r.price, R.net), purchase: u.lineCents(r.purchase, O.net), freight: u.lineCents(l.rate, freightQty), quality: qualityC, financing: u.lineCents(r.financing, O.net), admin: u.lineCents(r.admin, O.net), exceptions: detention - claimC + (l.extraC || 0) };
    return { lines: lines, shrinkKg: shrinkKg, shrinkC: shrinkC, dryingC: dryingC, claimC: claimC, detention: detention, freightQty: freightQty, payableT: (R.net * 1000 - shrinkKg) / 1000 };
  }

  /* Variance attribution: sums exactly to the observed change (CT-20 acceptance). */
  function attribution(s, l, q, a) {
    const r = snapRates(s, l);
    const volumeFreight = u.lineCents(r.freight, a.freightQty) - q.freight;
    const quantity = (a.lines.sale - q.sale) - (a.lines.purchase - q.purchase) - (a.lines.financing - q.financing) - (a.lines.admin - q.admin) - volumeFreight;
    const rateEffect = -((a.lines.freight - q.freight) - volumeFreight);
    return { quantity: quantity, freight: l.rebooked ? 0 : rateEffect, quality: -(a.lines.quality - q.quality), exceptions: -(a.lines.exceptions - q.exceptions), rebooking: l.rebooked ? rateEffect : 0 };
  }

  function currentLoadLines(s, l) {
    const r = snapRates(s, l); if (!r) return null;
    const a = actualLoadLines(s, l);
    if (a) return a.lines;
    const lines = linesFromRates(Object.assign({}, r, { freight: l.rate != null ? l.rate : r.freight }), l.planned);
    if (l.extraC) lines.exceptions += l.extraC;
    return lines;
  }

  function tradePnl(s, tr) {
    const loads = loadsOf(s, tr.id);
    let quoted = 0; let current = 0; let actual = 0; let nRec = 0; let has = false;
    if (tr.approval && tr.approval.valid && !loads.length) {
      const plan = planSummary(s, tr, { moisture: tr.moisture, freightPct: 0 });
      const snapC = tr.approval.snapshot.contribution;
      return { has: plan.loads > 0, quoted: snapC != null ? snapC : plan.contribution || 0, current: plan.contribution || 0, actual: 0, reconciled: 0, loads: 0 };
    }
    loads.forEach((l) => {
      const q = quotedLoadLines(s, l); if (!q) return; has = true;
      quoted += contrib(q); current += contrib(currentLoadLines(s, l));
      if (l.status === 'reconciled' || l.status === 'settled') { const a = actualLoadLines(s, l); if (a) { actual += contrib(a.lines); nRec += 1; } }
    });
    return { has: has, quoted: quoted, current: current, actual: actual, reconciled: nRec, loads: loads.length };
  }
  function bookPnl(s) {
    let quoted = 0, current = 0, actual = 0;
    Object.values(s.trades).forEach((tr) => { if (tr.status === 'cancelled') return; const p = tradePnl(s, tr); if (!p.has) return; quoted += p.quoted; current += p.current; actual += p.actual; });
    return { quoted: quoted, current: current, actual: actual };
  }

  /* ---------- Receivables and exposure (CT-09.2, CT-18.3) ---------- */
  function receivables(s) {
    const out = [];
    s.receivables.forEach((r) => out.push(Object.assign({ load: null }, r)));
    s.loads.forEach((l) => {
      if (!l.receivable) return;
      const a = actualLoadLines(s, l); const dm = demand(s, l.demand);
      out.push({ ref: l.receivable.ref, party: dm.buyer, amount: a ? (a.lines.sale - a.lines.quality) / 100 : 0, due: l.receivable.due, paid: l.receivable.paid, load: l.id, note: l.id + ' · ' + V_commodity(s, l) });
    });
    return out.map((r) => Object.assign(r, { state: r.paid != null ? 'paid' : s.now > r.due ? 'overdue' : 'current', daysLate: r.paid == null && s.now > r.due ? Math.floor((s.now - r.due) / DAY) : 0 }));
  }
  function V_commodity(s, l) { const tr = trade(s, l.trade); return tr ? (D.commodities[tr.commodity] || {}).label : ''; }

  function exposure(s, buyerId) {
    const p = party(s, buyerId) || {};
    let committed = 0;
    Object.values(s.trades).forEach((tr) => {
      if (tr.status === 'cancelled' || !tr.approval || !tr.approval.valid) return;
      const snap = tr.approval.snapshot;
      Object.keys(snap.alloc).forEach((demId) => {
        const n = snap.alloc[demId]; if (!n) return;
        const dm = demand(s, demId); if (!dm || dm.buyer !== buyerId) return;
        const all = s.loads.filter((l) => l.trade === tr.id && l.demand === demId);
        const ls = all.filter(ACTIVE_LOAD);
        if (!all.length) { committed += n * u.lineCents(snap.rates[demId].price, tr.payload); return; }
        ls.forEach((l) => {
          if (l.receivable) { if (l.receivable.paid == null) { const a = actualLoadLines(s, l); committed += a ? a.lines.sale - a.lines.quality : 0; } }
          else committed += u.lineCents(snap.rates[demId].price, l.planned);
        });
      });
    });
    let seed = 0;
    s.receivables.forEach((r) => { if (r.party === buyerId && r.paid == null) seed += u.toCents(r.amount); });
    const other = u.toCents(p.otherReceivables || 0);
    return { limit: p.creditLimit || 0, other: other + seed, committed: committed, current: other + seed + committed };
  }

  /* ---------- Physical book with mark-to-market (CT-19) ---------- */
  function position(s) {
    const rows = {};
    const row = (c) => (rows[c] = rows[c] || { commodity: c, bought: 0, sold: 0, tentative: 0, moving: 0, delivered: 0, contracts: [], mtm: 0, mtmNote: [] });
    Object.values(s.trades).forEach((tr) => {
      if (tr.status === 'cancelled' || tr.status === 'expired') return;
      const r = row(tr.commodity);
      const qty = u.r2((tr.qtyLoads || 0) * (tr.payload || 0));
      const purchaseLive = tr.approval && (tr.approval.valid || (tr.contracts || []).some((c) => c.party === tr.supplier && c.state !== 'Superseded' && c.state !== 'Cancelled'));
      if (purchaseLive) {
        const ls = loadsOf(s, tr.id);
        const bought = qty;
        const snap = tr.approval.valid ? tr.approval.snapshot : { alloc: {} };
        const sold = ls.length ? ls.reduce((a, l) => a + l.planned, 0) : Object.keys(snap.alloc).reduce((a, k) => a + snap.alloc[k] * tr.payload, 0);
        r.bought += bought; r.sold += Math.min(bought, sold); r.contracts.push(tr.id);
        const unc = u.r2(bought - Math.min(bought, sold));
        const month = (D.commodities[tr.commodity] || {}).futures;
        if (unc > 0 && month && tr.approval.futuresCad != null) {
          const f = futuresCad(s, month);
          const m = u.lineCents(f.value - tr.approval.futuresCad, unc);
          r.mtm += m; r.mtmNote.push(tr.id + ': ' + u.t1(unc) + ' t × (' + month + ' ' + u.rate(f.value) + ' − ' + u.rate(tr.approval.futuresCad) + ' at purchase)');
        }
      } else if (tr.qtyLoads) r.tentative += qty;
    });
    s.loads.forEach((l) => {
      const tr = trade(s, l.trade); if (!tr || !ACTIVE_LOAD(l)) return;
      const r = row(tr.commodity);
      if (l.status === 'transit') r.moving += (l.docs && l.docs.origin ? l.docs.origin.net : l.planned);
      if (['delivered', 'reconciled', 'settled'].includes(l.status)) r.delivered += l.docs && l.docs.receiving ? l.docs.receiving.net : (l.docs && l.docs.origin ? l.docs.origin.net : l.planned);
    });
    return ['corn', 'soy', 'wheat', 'barley'].filter((c) => rows[c]).map((c) => {
      const r = rows[c];
      ['bought', 'sold', 'tentative', 'moving', 'delivered'].forEach((k) => { r[k] = u.r2(r[k]); });
      r.uncovered = u.r2(r.bought - r.sold);
      return r;
    });
  }

  /* ---------- A carrier's new ETA against the receiving cutoff and the delivery window ---------- */
  function etaRisk(s, l, eta) {
    if (!l || eta == null) return null;
    const dm = demand(s, l.demand); const b = party(s, dm && dm.buyer) || {};
    const cut = l.cutoffAt; const name = b.short || b.name || 'the receiver';
    if (eta > cut) {
      const next = nextOpening(b, eta + 1); const outside = !!(dm && next > dm.windowEnd);
      return { level: 'late', margin: cut - eta, cutoff: cut, next: next, outside: outside, buyer: b.id, buyerName: name, text: 'Arrives ' + (eta - cut) + ' min after the ' + u.hhmm(cut % DAY) + ' receiving cutoff at ' + name + ': unloads ' + u.when(next, s.now) + (outside ? ', outside the delivery window. Rebook or amend with the buyer.' : '. Detention and a CAD ' + u.rate(D.finance.layover) + ' layover are at risk: tell the buyer.') };
    }
    if (cut - eta < 60) return { level: 'tight', margin: cut - eta, cutoff: cut, buyer: b.id, buyerName: name, text: 'Arrives ' + (cut - eta) + ' min before the ' + u.hhmm(cut % DAY) + ' receiving cutoff at ' + name + ': warn receiving.' };
    return { level: 'ok', margin: cut - eta, cutoff: cut, buyer: b.id, buyerName: name, text: (cut - eta) + ' min before the ' + u.hhmm(cut % DAY) + ' receiving cutoff at ' + name + '.' };
  }

  /* ---------- A pickup moved by the carrier: receiving day, contract and supplier windows, detention ---------- */
  function rescheduleImpact(s, l, at) {
    const tr = trade(s, l.trade); const dm = demand(s, l.demand); const b = party(s, dm.buyer) || {}; const sup = party(s, tr.supplier) || {};
    const ln = laneFor(s, tr.origin, dm);
    const eta = at + (sup.loadMins || 45) + (ln ? ln.mins : 90);
    const day = openAt(b, eta);
    let deliverAt = eta; let layover = false;
    if (!day.isOpen || eta < day.open) deliverAt = nextOpening(b, eta);
    else if (eta > day.close) { deliverAt = nextOpening(b, eta + 1); layover = true; }
    const cutoff = openAt(b, deliverAt).close;
    const outsideContract = deliverAt > dm.windowEnd || deliverAt < dm.windowStart;
    const pd = Math.floor(at / DAY);
    const outsideSupplier = tr.windowStart != null && (pd > Math.floor(tr.windowEnd / DAY) || pd < Math.floor(tr.windowStart / DAY));
    const weekend = !isBusiness(at);
    const name = b.short || b.name;
    const notes = ['Unloads ' + u.when(deliverAt, s.now) + ' at ' + name + (layover ? ' (after the receiving cutoff: next receiving time, CAD ' + u.rate(D.finance.layover) + ' layover)' : deliverAt > eta ? ' (when receiving opens)' : '') + '.'];
    if (outsideContract) notes.push('Outside the ' + dm.id + ' delivery window (' + u.dayShort(dm.windowStart) + '–' + u.dayShort(dm.windowEnd) + '): needs the buyer’s agreement.');
    if (outsideSupplier) notes.push('Outside the supplier’s pickup window (' + u.dayShort(tr.windowStart) + '–' + u.dayShort(tr.windowEnd) + '): confirm with ' + (sup.short || sup.name) + '.');
    if (weekend) notes.push('Weekend pickup: confirm the yard is open.');
    if (!outsideContract && !layover && !outsideSupplier) notes.push('Within the contract and supplier windows; no detention expected.');
    return { at: at, eta: eta, deliverAt: deliverAt, cutoff: cutoff, layover: layover, outsideContract: outsideContract, outsideSupplier: outsideSupplier, weekend: weekend, buyer: b.id, buyerName: name, demand: dm.id, windowEnd: dm.windowEnd, supplierName: sup.short || sup.name, text: notes.join(' ') };
  }

  /* ---------- Exceptions (CT-16) ---------- */
  function exceptionOptions(s, ex) {
    const l = load(s, ex.load);
    const tr = trade(s, l.trade); const dm = demand(s, l.demand);
    const buyer = party(s, dm.buyer);
    const base = l.rate;
    const ln = laneFor(s, tr.origin, dm);
    const sup = party(s, tr.supplier) || {};
    const now = Math.max(s.now, ex.openedAt);
    const opts = [];
    const quoted = ex.quotes || {};
    Object.values(s.parties).filter((p) => p.kind === 'Carrier' && (p.status === 'Approved' || (quoted[p.id] && quoted[p.id].fq)) && p.id !== ex.carrier && !(ex.excluded || []).includes(p.id)).forEach((c) => {
      const t = c.traits || {};
      const q = quoted[c.id] || { rate: u.r2(base + (t.spot || 2.5)), quotedAt: ex.openedAt + 1, validUntil: roundUpHalf(ex.openedAt + 1 + (t.spotValidMin || 180)) };
      if (t.declines && !q.fq) { opts.push({ id: c.id, carrier: c.id, declined: true, note: t.declines }); return; }
      const arrive = q.pickupAt != null ? Math.max(q.pickupAt, now) : Math.max(l.pickupAt, now + (t.availIn || 180));
      const eta = arrive + (sup.loadMins || 45) + (ln ? ln.mins : 90);
      const cut = l.cutoffAt;
      const buffer = eta - cut <= 0 ? cut - eta : -(eta - cut);
      const windowEnd = dm.windowEnd;
      let block = null; let contractChange = false; let deliverAt = eta; let deferred = false; let note = q.fq ? 'Quoted by email (' + q.fq + ').' : '';
      if (c.status !== 'Approved') block = c.name + ' is pending: logistics verifies its authority, insurance and equipment before it can be booked.';
      else if (!c.verifiedPayload && !q.declared) block = 'Axle configuration not declared: ' + u.t1(l.planned) + ' t cannot be assumed legal until the carrier confirms the vehicle.';
      if (eta > cut) {
        deliverAt = nextOpening(buyer, eta);
        contractChange = deliverAt > windowEnd;
        deferred = !contractChange;
        if (contractChange) { if (!block) block = 'Misses the ' + u.hhmm(cut % DAY) + ' cutoff. Delivery moves to ' + u.when(deliverAt, s.now) + ', outside the contract window: needs a buyer amendment (late allowance CAD ' + u.rate(D.finance.lateAllowance) + '/t) and manager approval.'; }
        else note = (note ? note + ' ' : '') + 'Misses the ' + u.hhmm(cut % DAY) + ' cutoff: unloads ' + u.when(deliverAt, s.now) + ', the next receiving time, with a CAD ' + u.rate(D.finance.layover) + ' layover.';
      }
      const expired = s.now > q.validUntil;
      const extraC = (contractChange ? u.lineCents(D.finance.lateAllowance, l.planned) : 0) + (deferred ? u.toCents(D.finance.layover) : 0);
      const extra = u.lineCents(q.rate - base, l.planned) + extraC;
      opts.push({ id: c.id, carrier: c.id, rate: q.rate, quotedAt: q.quotedAt, validUntil: q.validUntil, expired: expired, arrive: arrive, eta: eta, deliverAt: deliverAt, buffer: buffer, block: block, contractChange: contractChange, deferred: deferred, note: note, extra: extra, extraC: extraC, verified: c.verifiedPayload });
    });
    const eligible = opts.filter((o) => !o.declined && !o.block && !o.expired).sort((a, b) => a.extra - b.extra);
    const rec = eligible.find((o) => o.buffer >= 45 && !o.deferred) || eligible.find((o) => !o.deferred) || eligible[0];
    if (rec) rec.recommended = true;
    return opts.sort((a, b) => (a.declined ? 1 : 0) - (b.declined ? 1 : 0) || (a.block ? 1 : 0) - (b.block ? 1 : 0) || a.extra - b.extra);
  }

  /* ---------- Policy shadow replay (CT-21.3 proposal) ---------- */
  function policyReplay(policy) {
    const res = D.policyCases.map((c) => {
      const reasons = [];
      if (c.extra > policy.maxExtra) reasons.push('extra freight ' + u.rate(c.extra) + ' > ' + u.rate(policy.maxExtra));
      if (c.contrib < policy.minContrib) reasons.push('contribution ' + u.rate(c.contrib) + '/t < ' + u.rate(policy.minContrib));
      if (c.buffer < policy.minBuffer) reasons.push('cutoff buffer ' + c.buffer + ' min < ' + policy.minBuffer);
      if (c.change) reasons.push('contract change');
      const auto = reasons.length === 0;
      return Object.assign({}, c, { auto: auto, reasons: reasons, nearMiss: auto && !!c.late });
    });
    return { cases: res, handled: res.filter((r) => r.auto).length, escalated: res.filter((r) => !r.auto).length, nearMiss: res.filter((r) => r.nearMiss).length };
  }

  /* ---------- Month-to-date review (CT-20) ---------- */
  function review(s) {
    const A = D.archive;
    let quoted = u.toCents(A.quoted); let actual = u.toCents(A.actual); let loads = A.loads; let tonnes = A.tonnes;
    const causes = { quality: u.toCents(A.causes.quality), quantity: u.toCents(A.causes.quantity), freight: u.toCents(A.causes.freight), exceptions: u.toCents(A.causes.exceptions), rebooking: u.toCents(A.causes.rebooking) };
    const rows = [];
    s.loads.filter((l) => l.status === 'reconciled' || l.status === 'settled').forEach((l) => {
      const q = quotedLoadLines(s, l); const a = actualLoadLines(s, l); if (!q || !a) return;
      const at = attribution(s, l, q, a);
      Object.keys(at).forEach((k) => { causes[k] += at[k]; });
      quoted += contrib(q); actual += contrib(a.lines); loads += 1; tonnes += l.docs.receiving.net;
      rows.push({ load: l, trade: trade(s, l.trade), quoted: contrib(q), actual: contrib(a.lines), attr: at });
    });
    let rebookCurrent = 0;
    s.loads.forEach((l) => { if (l.rebooked && !['reconciled', 'settled'].includes(l.status)) { const r = snapRates(s, l); if (r) rebookCurrent += u.lineCents(l.rate - (l.originalRate || r.freight), l.planned); } });
    return { quoted: quoted, actual: actual, loads: loads, tonnes: u.r2(tonnes), causes: causes, rows: rows, perHour: actual / A.traderHours, hours: A.traderHours, rebookCurrent: rebookCurrent };
  }

  /* ---------- Invariants (allocation conservation and settlement integrity) ---------- */
  function invariants(s) {
    const out = [];
    let ok = true;
    s.demands.forEach((d) => { const o = demandOpen(s, d); if (o.taken > u.r2(d.qty * (1 + d.tolPct / 100)) + 1e-6) { ok = false; out.push('Over-allocated ' + d.id + ': ' + u.t1(o.taken) + ' t > ' + u.t1(d.qty * (1 + d.tolPct / 100)) + ' t'); } });
    out.push({ ok: ok, text: 'No demand is allocated beyond its quantity and tolerance' });
    let ok2 = true;
    Object.values(s.trades).forEach((tr) => { const n = Object.values(tr.alloc || {}).reduce((a, b) => a + b, 0); if (n > (tr.qtyLoads || 0)) { ok2 = false; out.push('Over-allocated lot ' + tr.id); } });
    out.push({ ok: ok2, text: 'No lot is allocated beyond its loads' });
    let ok3 = true;
    Object.values(s.trades).forEach((tr) => {
      const snap = tr.approval && tr.approval.valid ? tr.approval.snapshot.alloc : {};
      Object.keys(snap).forEach((demId) => {
        const led = s.ledger.filter((e) => e.trade === tr.id && e.demand === demId).reduce((a, e) => a + e.tonnes, 0);
        const all = s.loads.filter((l) => l.trade === tr.id && l.demand === demId);
        const ls = all.filter(ACTIVE_LOAD);
        const expect = all.length ? ls.reduce((a, l) => a + l.planned, 0) : snap[demId] * tr.payload;
        if (Math.abs(led - expect) > 0.05) { ok3 = false; out.push('Ledger ' + tr.id + '/' + demId + ': ' + u.t1(led) + ' t vs plan ' + u.t1(expect) + ' t'); }
        if (ls.length > snap[demId]) { ok3 = false; out.push('More loads than approved on ' + tr.id + '/' + demId); }
      });
      Object.keys(tr.approval && !tr.approval.valid ? tr.approval.snapshot.alloc : {}).forEach((demId) => {
        const led = s.ledger.filter((e) => e.trade === tr.id && e.demand === demId).reduce((a, e) => a + e.tonnes, 0);
        if (Math.abs(led) > 0.05) { ok3 = false; out.push('Invalid approval still reserving on ' + tr.id + '/' + demId); }
      });
    });
    out.push({ ok: ok3, text: 'Ledger reservations equal approved plans and booked loads' });
    let ok4 = true;
    s.loads.forEach((l) => { if (l.status === 'settled') { const f = findings(s, l); if (f.ready && !f.all) { ok4 = false; out.push(l.id + ' settled with untreated findings'); } } });
    out.push({ ok: ok4, text: 'No load is settled while a discrepancy is untreated' });
    const book = position(s);
    let ok5 = book.every((r) => r.sold <= r.bought + 1e-6);
    out.push({ ok: ok5, text: 'Sold quantity never exceeds bought quantity' });
    const checks = out.filter((x) => typeof x === 'object');
    return { all: checks.every((c) => c.ok), checks: checks, notes: out.filter((x) => typeof x === 'string') };
  }

  TD.engine = { LINE_KEYS, LINE_LABELS, DAY, party, demand, trade, load, loadsOf, lane, laneKey, benchmark, futuresCad, demandPrice, bidStatus, weekday, isBusiness, quoteValidity, openAt, nextOpening, rates, linesFromRates, scaleLines, addLines, zeroLines, contrib, reservedOnDemand, demandOpen, maxLoadsFor, comparison, planSummary, downside, requiredMissing, approvalChecks, quoteFor, quoteRates, quoteStatus, quoteTotal, scheduleSlots, etaFor, snapRates, quotedLoadLines, findings, actualLoadLines, attribution, currentLoadLines, tradePnl, bookPnl, receivables, exposure, position, exceptionOptions, policyReplay, review, invariants, moistureOver, roundUpHalf, ACTIVE_LOAD, sitesOf, siteOf, destTown, laneFor, laneKeyFor, payloadOk, fqRatePerT, fqConversion, fqBasisLabel, buyerAt, freightCandidates, quoteFromFq, nextBusinessNoon, etaRisk, rescheduleImpact };
})();
