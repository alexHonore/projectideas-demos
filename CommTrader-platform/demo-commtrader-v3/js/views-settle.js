/* TradeDesk V3 — Evidence reconciliation, settlement and receivables (CT-17, CT-18), generic for every load. */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});
  const D = TD.DATA; const u = TD.u; const E = TD.engine;
  const { esc, icon } = u;
  const V = TD.views;

  function ticket(kind, ref, issuer, at, lines, tone) {
    return '<article class="ticket tone-' + (tone || 'plain') + '" aria-label="' + esc(kind + ' ' + ref) + '"><header><span class="tk-kind">' + esc(kind) + '</span><span class="tk-ref">' + esc(ref) + '</span></header><p class="tk-iss">' + esc(issuer) + '<br>' + esc(at) + '</p><dl>' + lines.map((l) => '<div' + (l[2] ? ' class="is-hl"' : '') + '><dt>' + esc(l[0]) + '</dt><dd>' + esc(l[1]) + '</dd></div>').join('') + '</dl></article>';
  }
  function waiting(kind, text) { return '<article class="ticket tone-wait" aria-label="' + esc(kind) + ' not received"><header><span class="tk-kind">' + esc(kind) + '</span><span class="tk-ref">—</span></header><p class="tk-iss">' + esc(text) + '</p></article>'; }

  /* All settlement money for one load, computed from evidence and the chosen treatments. */
  function pack(state, l) {
    const tr = state.trades[l.trade]; const dm = E.demand(state, l.demand);
    const r = E.snapRates(state, l);
    const f = E.findings(state, l);
    const a = f.ready ? E.actualLoadLines(state, l) : null;
    const q = E.quotedLoadLines(state, l);
    const at = a && q ? E.attribution(state, l, q, a) : null;
    const freightBase = a ? a.lines.freight : 0;
    const det = a ? a.detention : 0;
    const taxBase = freightBase + det;
    const gst = Math.round(taxBase * D.finance.gstPct / 100); const qst = Math.round(taxBase * D.finance.qstPct / 100);
    return { l: l, tr: tr, dm: dm, r: r, f: f, a: a, q: q, at: at, gst: gst, qst: qst, carrierTotal: taxBase + gst + qst, buyerInvoice: a ? a.lines.sale - a.lines.quality : 0, quoted: q ? E.contrib(q) : 0, actual: a ? E.contrib(a.lines) : 0, disputed: Object.keys(l.recon.d || {}).filter((k) => l.recon.d[k] && /^dispute/.test(l.recon.d[k].choice)) };
  }

  function waterfall(p, provisional) {
    const steps = [['Quality (moisture, grade)', p.at.quality], ['Quantity (weights)', p.at.quantity], ['Detention and claims', p.at.exceptions], ['Freight rate', p.at.freight], ['Rebooking', p.at.rebooking]].filter((s) => s[1] !== 0);
    const max = Math.max(p.quoted, p.actual, 1) * 1.08;
    const x = (v) => Math.max(0, Math.min(100, (v / max) * 100));
    let run = p.quoted;
    const rows = ['<li class="wf-row wf-total"><span class="wf-l">Quoted at approval</span><span class="wf-bar"><span class="wf-b" style="left:0;width:' + x(p.quoted).toFixed(2) + '%"></span></span><span class="wf-v num">' + u.money(p.quoted) + '</span></li>'];
    steps.forEach((s) => {
      const from = run; run += s[1];
      const lo = Math.min(from, run); const hi = Math.max(from, run);
      rows.push('<li class="wf-row ' + (s[1] < 0 ? 'wf-neg' : 'wf-pos') + '"><span class="wf-l">' + esc(s[0]) + '</span><span class="wf-bar"><span class="wf-b" style="left:' + x(lo).toFixed(2) + '%;width:' + Math.max(0.6, x(hi) - x(lo)).toFixed(2) + '%"></span></span><span class="wf-v num">' + u.money(s[1], { plus: true }) + '</span></li>');
    });
    rows.push('<li class="wf-row wf-total wf-end"><span class="wf-l">' + (provisional ? 'Current estimate' : 'Actual') + '</span><span class="wf-bar"><span class="wf-b" style="left:0;width:' + x(Math.max(0, p.actual)).toFixed(2) + '%"></span></span><span class="wf-v num">' + u.money(p.actual) + '</span></li>');
    const sum = steps.reduce((s, x2) => s + x2[1], 0);
    return '<ol class="wf" aria-label="Contribution waterfall, CAD">' + rows.join('') + '</ol><p class="small muted" id="wf-sum">Attribution sums exactly to the change: ' + u.money(p.quoted) + ' ' + (sum < 0 ? u.minus : '+') + ' ' + u.money(Math.abs(sum)) + ' = ' + u.money(p.actual) + '.</p>';
  }

  function csv(state, p) {
    const l = p.l; const rc = l.recon; const ap = rc.approved;
    const row = (arr) => arr.map((v) => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(',');
    const m = (c) => (c / 100).toFixed(2);
    const O = l.docs.origin, R = l.docs.receiving, I = l.docs.invoice;
    const sup = E.party(state, p.tr.supplier) || {}; const buyer = E.party(state, p.dm.buyer); const car = E.party(state, l.carrier) || {};
    const when = u.toDateInput(ap.at) + ' ' + u.hhmm(ap.at % 1440);
    const disputedQ = p.disputed.includes('moisture') || p.disputed.includes('testweight');
    const lines = [row(['record_type', 'reference', 'load', 'counterparty', 'quantity_t', 'quantity_source', 'unit_price_cad', 'amount_cad', 'gst_cad', 'qst_cad', 'total_cad', 'status', 'approved_by', 'approved_at'])];
    lines.push(row(['supplier_payable', 'PC-' + p.tr.id.slice(3), l.id, sup.name, u.t3(O.net), 'Origin ticket ' + O.ref, u.rate(p.r.purchase), m(p.a.lines.purchase), '0.00', '0.00', m(p.a.lines.purchase), 'approved', ap.by, when]));
    lines.push(row(['buyer_invoice', p.dm.contract || p.dm.id, l.id, buyer.name, p.a.payableT.toFixed(3), 'Receiving ticket ' + R.ref + ' net ' + u.t3(R.net) + ' t less ' + (p.a.shrinkKg / 1000).toFixed(3) + ' t shrink', u.rate(p.r.price), m(p.a.lines.sale - p.a.shrinkC), '0.00', '0.00', m(p.a.lines.sale - p.a.shrinkC), disputedQ ? 'approved_undisputed_portion' : 'approved', ap.by, when]));
    if (p.a.lines.quality - p.a.shrinkC) lines.push(row(['buyer_invoice_adjustment', p.dm.contract || p.dm.id, l.id, buyer.name, u.t3(R.net), 'Quality schedule: drying and grade discounts', '', '-' + m(p.a.lines.quality - p.a.shrinkC), '0.00', '0.00', '-' + m(p.a.lines.quality - p.a.shrinkC), disputedQ ? 'disputed_claim_' + (l.claim || 'CF') : 'approved', ap.by, when]));
    lines.push(row(['carrier_payable', 'FO-' + p.tr.id.slice(3), l.id, car.name, p.a.freightQty.toFixed(3), l.recon.d.invoice && l.recon.d.invoice.choice === 'invoice' ? 'As invoiced on ' + I.ref : 'Origin net per freight order; ' + I.ref + ' billed ' + u.t3(I.qty) + ' t', u.rate(l.rate), m(p.a.lines.freight + p.a.detention), m(p.gst), m(p.qst), m(p.carrierTotal), 'approved', ap.by, when]));
    if (p.a.claimC) lines.push(row(['carrier_claim', 'CL-' + l.id.slice(3), l.id, car.name, '', 'Transit loss beyond tolerance', '', '-' + m(p.a.claimC), '0.00', '0.00', '-' + m(p.a.claimC), 'claim_filed', ap.by, when]));
    lines.push('');
    lines.push('# Fictional demo data from TradeDesk V3. GST/QST: grain treated as zero-rated (demo assumption); freight and detention taxable. Export is not a posting or a payment.');
    return lines.join('\n');
  }
  V.settleCsv = function (state, id) { const l = E.load(state, id); return csv(state, pack(state, l)); };

  function decisionBlock(state, p) {
    const l = p.l; const rc = l.recon; const auth = D.authority[state.role]; const usr = D.users[state.role];
    const locked = !!rc.approved;
    if (!p.f.list.length) return '<p class="callout tone-leaf">' + icon('check', 16) + '<span>All documents agree within tolerance: weights, quantity basis, moisture and detention. Nothing to treat; finance can approve.</span></p>';
    return p.f.list.map((f, i) => {
      const cur = rc.d[f.id] ? rc.d[f.id].choice : null;
      const can = f.role === 'quality' ? auth.quality : auth.invoice;
      const radio = (o) => '<label class="opt' + (cur === o.v ? ' is-sel' : '') + '"><input type="radio" name="t-' + l.id + '-' + f.id + '" value="' + o.v + '" data-input="treat" data-id="' + l.id + '" data-key="' + f.id + '"' + (cur === o.v ? ' checked' : '') + (locked || !can ? ' disabled' : '') + '><span class="opt-main"><strong>' + esc(o.label) + '</strong><small>' + esc(o.sub) + '</small></span></label>';
      return '<div class="disc" id="disc-' + f.id + '"><div class="disc-head"><h3>D' + (i + 1) + ' · ' + esc(f.title) + '</h3>' + (cur ? V.chip(/^dispute/.test(cur) ? 'disputed' : 'resolved', /^dispute/.test(cur) ? 'Disputed' : 'Treated') : V.chip('open')) + '</div>' +
        '<p class="small">' + esc(f.detail) + ' <strong class="num">CAD ' + u.money(Math.abs(f.amount)) + '</strong></p>' +
        '<div class="opts" role="radiogroup" aria-label="' + esc(f.title) + ' treatment">' + f.options.map(radio).join('') + '</div>' +
        (!can && !cur ? '<p class="small muted">' + icon('lock', 13) + ' ' + esc(usr.title) + ' can view only. ' + (f.role === 'quality' ? 'Quality treatment needs the trader. ' + V.btn('Switch to Geneviève', 'role', { cls: 'small ghost', data: { role: 'trader' }, id: 'switch-trader-' + f.id }) : 'Carrier payables belong to finance. ' + V.btn('Switch to Nadia (finance)', 'role', { cls: 'small ghost', data: { role: 'finance' }, id: i === p.f.list.findIndex((x) => x.role === 'finance') ? 'switch-finance' : 'switch-finance-' + f.id })) + '</p>' : '') +
        (rc.d[f.id] ? '<p class="small muted">Recorded by ' + esc(rc.d[f.id].by) + ', ' + esc(V.when(rc.d[f.id].at)) + '.</p>' : '') + '</div>';
    }).join('');
  }

  function packageBlock(state, p) {
    const l = p.l; const rc = l.recon; const auth = D.authority[state.role];
    if (!p.f.ready) return '<section class="panel" aria-labelledby="pk-h"><div class="panel-head"><h2 id="pk-h">Settlement package</h2>' + V.chip('draft', 'Waiting for documents') + '</div><p class="muted">Missing: ' + esc(p.f.missing.join(', ')) + '. Nothing is settled on partial evidence.</p></section>';
    const O = l.docs.origin, R = l.docs.receiving, I = l.docs.invoice;
    const sup = E.party(state, p.tr.supplier) || {}; const buyer = E.party(state, p.dm.buyer); const car = E.party(state, l.carrier) || {};
    const rows = [
      ['Supplier payable', sup.name, u.t3(O.net) + ' t × ' + u.rate(p.r.purchase), 'Origin ticket ' + O.ref, p.a.lines.purchase, 0],
      ['Buyer invoice', buyer.name, u.t3(p.a.payableT) + ' t × ' + u.rate(p.r.price) + (p.a.lines.quality - p.a.shrinkC ? ', less ' + u.money(p.a.lines.quality - p.a.shrinkC) + ' drying and grade' : ''), 'Receiving ticket ' + R.ref + (p.a.shrinkKg ? ' less ' + u.t3(p.a.shrinkKg / 1000) + ' t shrink' : ''), p.buyerInvoice, 0],
      ['Carrier payable', car.name, u.t3(p.a.freightQty) + ' t × ' + u.rate(l.rate) + (p.a.detention ? ' + detention ' + u.money(p.a.detention) : ''), rc.d.invoice && rc.d.invoice.choice === 'invoice' ? 'As invoiced (' + I.ref + ')' : 'Origin net per freight order', p.a.lines.freight + p.a.detention, p.gst + p.qst]
    ];
    if (p.a.claimC) rows.push(['Carrier claim', car.name, 'Transit loss beyond tolerance', 'Claim to be filed', -p.a.claimC, 0]);
    const ready = p.f.all;
    let act;
    if (!ready) act = '<p class="small muted">Treat every discrepancy first. Only approved values can be exported.</p>';
    else if (!rc.approved) act = '<div class="row-actions">' + V.btn('Approve settlement package', 'settle-approve', { cls: 'primary', icon: 'check', disabled: !auth.settlement, id: 'settle-approve', data: { id: l.id } }) + (!auth.settlement ? V.btn('Switch to Nadia (finance)', 'role', { cls: 'ghost', data: { role: 'finance' }, id: 'switch-finance-2' }) : '') + '</div>' + (!auth.settlement ? '<p class="small muted">Settlement approval belongs to finance (segregation of duties).</p>' : '');
    else if (!rc.exported) act = '<p class="small">' + icon('check', 14) + ' Approved by ' + esc(rc.approved.by) + ', ' + esc(V.when(rc.approved.at)) + '.</p><div class="row-actions">' + V.btn('Export approved settlement (CSV)', 'settle-export', { cls: 'primary', icon: 'download', id: 'settle-export', data: { id: l.id }, disabled: !auth.settlement }) + '</div>';
    else if (!rc.ack) act = '<p class="small">' + icon('download', 14) + ' Exported ' + esc(rc.exported.file || '') + ', ' + esc(V.when(rc.exported.at)) + '. Not posted: waiting for the accounting system to acknowledge.</p><div class="row-actions">' + V.btn('Record accounting acknowledgement (simulated)', 'settle-ack', { cls: 'primary', icon: 'check', id: 'settle-ack', data: { id: l.id } }) + V.btn('Download again', 'settle-export', { cls: 'ghost', icon: 'download', data: { id: l.id } }) + '</div>';
    else act = '<p class="callout tone-leaf">' + icon('check', 16) + '<span><strong>Acknowledged ' + esc(rc.ack.id) + ', ' + esc(V.when(rc.ack.at)) + '.</strong> ' + (l.receivable ? 'Invoice ' + esc(l.receivable.ref) + ' due ' + esc(V.when(l.receivable.due)) + (l.receivable.paid != null ? ', paid ' + esc(V.when(l.receivable.paid)) : '') + '. ' : '') + 'Payment status imports from accounting; nothing here marks an invoice paid.</span></p>' + V.btn('Download CSV again', 'settle-export', { cls: 'small ghost', icon: 'download', data: { id: l.id } });
    const claim = l.claim ? '<div class="callout tone-amber">' + icon('flag', 16) + '<div><strong>Claim ' + esc(l.claim) + ' open.</strong><p>The disputed amount stays separate. Record the retained-sample result when it arrives (simulated).</p><div class="row-actions">' + V.btn('Re-test confirms destination', 'claim', { cls: 'small', data: { id: l.id, v: 'supplier' } }) + V.btn('Re-test supports origin', 'claim', { cls: 'small ghost', data: { id: l.id, v: 'buyer' } }) + '</div></div></div>' : '';
    return '<section class="panel" aria-labelledby="pk-h"><div class="panel-head"><h2 id="pk-h">Settlement package</h2>' + (rc.ack ? V.chip('settled', 'Acknowledged') : rc.exported ? V.chip('sent', 'Exported') : rc.approved ? V.chip('approved') : V.chip('draft')) + '</div>' +
      '<div class="table-wrap"><table class="econ"><caption class="sr-only">Settlement records for ' + l.id + '</caption><thead><tr><th scope="col">Record</th><th scope="col">Basis</th><th scope="col" class="r">Amount</th><th scope="col" class="r">GST/QST</th></tr></thead><tbody>' +
      rows.map((r) => '<tr><th scope="row">' + r[0] + '<small>' + esc(r[1]) + '</small></th><td class="small">' + esc(r[2]) + '<br><span class="muted">Source: ' + esc(r[3]) + '</span></td><td class="r num">' + u.money(r[4]) + '</td><td class="r num">' + (r[5] ? u.money(r[5]) : '0.00') + '</td></tr>').join('') +
      p.disputed.map((k) => { const f = p.f.list.find((x) => x.id === k); return f ? '<tr><th scope="row">Disputed: ' + esc(f.title.toLowerCase()) + '</th><td class="small">Held separately' + (l.claim ? ', claim ' + esc(l.claim) : '') + '</td><td class="r num">' + u.money(f.amount) + '</td><td class="r num">0.00</td></tr>' : ''; }).join('') +
      '</tbody></table></div><p class="small muted">CAD. Grain treated as zero-rated for GST/QST (demo assumption, set by your accountant). Freight tax is recoverable and kept out of contribution.</p>' + claim + act + '</section>';
  }

  function detail(state, l) {
    const p = pack(state, l);
    const O = l.docs.origin, R = l.docs.receiving, I = l.docs.invoice;
    const r = p.r || {}; const rule = (E.party(state, p.dm.buyer) || {}).rule || {};
    const sup = E.party(state, p.tr.supplier) || {};
    const tickets = '<div class="tickets">' +
      ticket('Contract', p.dm.contract || p.dm.id, D.desk.company, 'Approved ' + (p.tr.approval ? u.dayShort(p.tr.approval.at) : '—'), [['Quantity', u.t3(l.planned) + ' t', true], ['Moisture', rule.maxMoisture != null ? 'max ' + rule.maxMoisture.toFixed(1) + '%' : '—', true], ['Sale', u.rate(r.price || 0) + ' /t delivered'], ['Purchase', u.rate(r.purchase || 0) + ' /t FOB'], ['Freight', u.rate(l.rate) + ' /t on origin net']]) +
      (O ? ticket('Origin scale', O.ref, O.issuer, V.when(O.at), [['Gross', u.t3(O.gross) + ' t'], ['Tare', u.t3(O.tare) + ' t'], ['Net', u.t3(O.net) + ' t', true], ['Moisture', O.moisture != null ? O.moisture.toFixed(1) + '% (' + (O.source || 'origin') + ')' : '—', true]]) : waiting('Origin scale', 'Issued at departure')) +
      (R ? ticket('Receiving', R.ref, R.issuer, V.when(R.at), [['Gross', u.t3(R.gross) + ' t'], ['Tare', u.t3(R.tare) + ' t'], ['Net', u.t3(R.net) + ' t', true], ['Moisture', R.moisture != null ? R.moisture.toFixed(1) + '% (lab)' : '—', true], ['Test weight', R.testWeight != null ? R.testWeight + ' lb/bu' : '—'], ['Wait', R.wait != null ? R.wait + ' min' : '—']], p.f.list.some((f) => f.id !== 'invoice') ? 'amber' : '') : waiting('Receiving ticket', l.pending && l.pending.receivingAt != null ? 'Expected ' + V.when(l.pending.receivingAt) : 'Not received')) +
      (I ? ticket('Carrier invoice', I.ref, I.issuer, V.when(I.at), [['Quantity', u.t3(I.qty) + ' t', true], ['Rate', u.rate(I.rate) + ' /t'], ['Amount', u.money(u.lineCents(I.rate, I.qty))], ['Detention', I.detention ? u.rate(I.detention) : '0.00']], p.f.list.some((f) => f.id === 'invoice' || f.id === 'detention') ? 'amber' : '') : waiting('Carrier invoice', l.pending && l.pending.invoiceAt != null ? 'Expected ' + V.when(l.pending.invoiceAt) : 'Not received')) + '</div>';
    let matrix = '';
    if (O && R && I) {
      const find = (k) => p.f.list.find((f) => f.id === k);
      const res = (k, okText) => { const f = find(k); const t = f && l.recon.d[f.id]; return f ? V.chip(t ? (/^dispute/.test(t.choice) ? 'disputed' : 'resolved') : 'open', t ? (/^dispute/.test(t.choice) ? 'Disputed' : 'Treated') : 'Open') + ' ' : V.chip('ok', okText || 'Within') + ' '; };
      const loss = u.r2(R.net - O.net); const lossPct = (loss / O.net) * 100;
      matrix = '<div class="table-wrap"><table class="cmp"><caption class="sr-only">Cross-document comparison for ' + l.id + '</caption><thead><tr><th scope="col">Check</th><th scope="col" class="r">Contract</th><th scope="col" class="r">Origin</th><th scope="col" class="r">Receiving</th><th scope="col" class="r">Invoice</th><th scope="col">Rule and result</th></tr></thead><tbody>' +
        '<tr class="' + (find('weight') ? 'is-bad' : '') + '"><th scope="row">Net weight, t</th><td class="r num" data-l="Contract">' + u.t3(l.planned) + '</td><td class="r num" data-l="Origin">' + u.t3(O.net) + '</td><td class="r num" data-l="Receiving">' + u.t3(R.net) + '</td><td class="r num" data-l="Invoice">' + u.t3(I.qty) + '</td><td class="res">' + res('weight') + 'Origin → receiving ' + u.t3(loss) + ' t (' + u.pct(lossPct, 2) + '), tolerance ±' + D.finance.weightTolPct + '%</td></tr>' +
        '<tr class="' + (find('invoice') ? 'is-bad' : '') + '"><th scope="row">Freight quantity basis</th><td class="r num" data-l="Contract">—</td><td class="r num" data-l="Origin">' + u.t3(O.net) + '</td><td class="r num" data-l="Receiving">—</td><td class="r num" data-l="Invoice">' + u.t3(I.qty) + '</td><td class="res">' + res('invoice', 'Match') + (find('invoice') ? 'Invoice ' + u.t3(I.qty - O.net) + ' t off the origin net basis' : 'Invoice on origin net, as the freight order says') + '</td></tr>' +
        '<tr class="' + (find('moisture') ? 'is-bad' : '') + '"><th scope="row">Moisture, %</th><td class="r num" data-l="Contract">≤ ' + (rule.maxMoisture != null ? rule.maxMoisture.toFixed(1) : '—') + '</td><td class="r num" data-l="Origin">' + (O.moisture != null ? O.moisture.toFixed(1) : '—') + '</td><td class="r num" data-l="Receiving">' + (R.moisture != null ? R.moisture.toFixed(1) : '—') + '</td><td class="r num" data-l="Invoice">—</td><td class="res">' + res('moisture') + (find('moisture') ? '+' + find('moisture').over.toFixed(1) + ' pt at destination' + (O.moisture != null && O.moisture !== R.moisture ? '; origin and destination disagree' : '') : 'Within the buyer schedule') + '</td></tr>' +
        (rule.minTestWeight ? '<tr class="' + (find('testweight') ? 'is-bad' : '') + '"><th scope="row">Test weight, lb/bu</th><td class="r num" data-l="Contract">≥ ' + rule.minTestWeight + '</td><td class="r num" data-l="Origin">' + (p.tr.testWeight || '—') + '</td><td class="r num" data-l="Receiving">' + (R.testWeight != null ? R.testWeight : '—') + '</td><td class="r num" data-l="Invoice">—</td><td class="res">' + res('testweight') + 'Export minimum</td></tr>' : '') +
        '<tr class="' + (find('detention') ? 'is-bad' : '') + '"><th scope="row">Receiving wait, min</th><td class="r num" data-l="Contract">' + D.finance.freeMins + ' free</td><td class="r num" data-l="Origin">—</td><td class="r num" data-l="Receiving">' + (R.wait != null ? R.wait : '—') + '</td><td class="r num" data-l="Invoice">' + (I.detention ? u.rate(I.detention) : '0.00') + '</td><td class="res">' + res('detention', 'None billed') + 'CAD ' + D.finance.detentionPerHour + '/h past free time</td></tr>' +
        '<tr><th scope="row">Parties and references</th><td colspan="4" class="small">PC-' + p.tr.id.slice(3) + ', ' + esc(p.dm.contract || p.dm.id) + ', FO-' + p.tr.id.slice(3) + ', ' + esc(O.ref) + ', ' + esc(R.ref) + ', ' + esc(I.ref) + ' all reference ' + l.id + '</td><td class="res">' + V.chip('ok', 'Match') + '</td></tr></tbody></table></div>';
    }
    const provisional = !l.recon.approved || p.disputed.length > 0;
    const head = '<a class="crumb" href="#/trade/' + p.tr.id + '/pnl">' + icon('back', 14) + p.tr.id + '</a><div class="page-head"><div><p class="tr-id">' + u.kernel(p.tr.commodity, 16) + l.id + V.loadChip(state, l) + '</p><h1>' + (p.f.ready ? 'Four documents, one payable quantity each' : 'Waiting for evidence') + '</h1><ul class="facts"><li>' + esc(V.commodityName(p.tr.commodity)) + ', ' + esc(sup.name || '') + ' → ' + esc(E.party(state, p.dm.buyer).name) + '</li><li>Delivered ' + esc(l.deliveredAt != null ? V.when(l.deliveredAt) : '—') + '</li><li>Carrier ' + esc((E.party(state, l.carrier) || {}).short || '—') + '</li><li>Sale settles on destination grades; purchase on origin weight</li></ul></div></div>' + V.thread(state, p.tr, { labels: true, dark: true });
    return { head: head, body: '<section class="panel" aria-labelledby="dc-h"><div class="panel-head"><h2 id="dc-h">Evidence</h2>' + (Object.values(l.docs).some((d) => d && d.simulated) ? V.chip('simulated', 'Simulated documents') : V.chip('simulated', 'Extracted from the attachments')) + '</div>' + tickets + matrix + (!p.f.ready && !['reconciled', 'settled'].includes(l.status) ? '<div class="row-actions">' + (l.status === 'delivered' && !R ? V.btn('Late ticket arrives now (Test lab)', 'late-ticket', { cls: 'small ghost', icon: 'file', data: { id: l.id } }) : '') + V.btn('Simulate delivery documents', 'lab', { cls: 'small ghost', icon: 'flask', data: { sec: 'delivery', id: l.id } }) + '</div>' : '') + '</section>' +
      (p.f.ready ? '<div class="two settle-grid"><section class="panel" aria-labelledby="ds-h"><div class="panel-head"><h2 id="ds-h">Discrepancies</h2><span class="muted small">' + p.f.treated + ' of ' + p.f.list.length + ' treated</span></div>' + decisionBlock(state, p) + '</section>' +
        '<div>' + packageBlock(state, p) + (p.at ? '<section class="panel" aria-labelledby="wf-h"><div class="panel-head"><h2 id="wf-h">Why the margin moved</h2>' + V.chip(provisional ? 'indicative' : 'firm', provisional ? 'Provisional' : 'Actual') + '</div>' + waterfall(p, provisional) + '</section>' : '') + '</div></div>' : '') };
  }

  function receivablesPanel(state) {
    const rs = E.receivables(state).sort((a, b) => (a.state === 'paid' ? 1 : 0) - (b.state === 'paid' ? 1 : 0) || a.due - b.due);
    const auth = D.authority[state.role];
    const tot = rs.filter((r) => r.state !== 'paid').reduce((a, r) => a + u.toCents(r.amount), 0);
    return '<section class="panel" aria-labelledby="rv-h" id="receivables"><div class="panel-head"><h2 id="rv-h">Receivables</h2><span class="muted small">Open ' + u.cad(tot) + ' · imported from accounting (simulated)</span></div>' +
      (rs.length ? '<div class="table-wrap"><table class="mini"><caption class="sr-only">Buyer receivables</caption><thead><tr><th scope="col">Invoice</th><th scope="col">Buyer</th><th scope="col" class="r">Amount</th><th scope="col">Due</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead><tbody>' +
        rs.map((r) => '<tr id="rcv-' + esc(r.ref) + '"><th scope="row">' + esc(r.ref) + '<small>' + esc(r.note || '') + '</small></th><td>' + V.partyLink(r.party) + '</td><td class="r num">' + u.money(u.toCents(r.amount)) + '</td><td>' + esc(V.when(r.due)) + '</td><td>' + (r.state === 'paid' ? V.chip('paid', 'Paid ' + V.when(r.paid)) : r.state === 'overdue' ? V.chip('overdue', r.daysLate + ' day' + (r.daysLate === 1 ? '' : 's') + ' late') : V.chip('current', 'Not due')) + '</td><td class="actc">' + (r.state !== 'paid' ? V.btn('Copy reminder', 'reminder', { cls: 'small ghost', data: { id: r.ref } }) + (auth.invoice ? V.btn('Payment received', 'pay', { cls: 'small', data: { id: r.ref }, id: 'pay-' + r.ref }) : '') : '') + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted small">No receivables yet. Acknowledged settlements create buyer invoices with due dates.</p>') +
      '<p class="small muted">Overdue invoices count against credit until paid. Recording a payment here stands in for the accounting import.</p></section>';
  }

  V.settle = function (state, route) {
    const relevant = state.loads.filter((l) => l.status !== 'cancelled' && (['delivered', 'reconciled', 'settled'].includes(l.status) || l.docs.receiving || l.docs.invoice));
    const need = (l) => { const f = E.findings(state, l); return !l.recon.ack && f.ready ? 0 : !f.ready ? 1 : 2; };
    relevant.sort((a, b) => need(a) - need(b) || (b.deliveredAt || 0) - (a.deliveredAt || 0));
    const id = route.id || (relevant.find((l) => need(l) === 0) || {}).id || null;
    const l = id ? E.load(state, id) : null;
    const queue = relevant.map((x) => {
      const tr = state.trades[x.trade]; const f = E.findings(state, x);
      const st = x.recon.ack ? V.chip('settled') : x.claim ? V.chip('disputed', 'Claim') : x.recon.approved ? V.chip('approved', x.recon.exported ? 'Exported' : 'Approved') : !f.ready ? V.chip('requested', 'Awaiting ' + f.missing[0]) : f.list.length > f.treated ? V.chip('open', (f.list.length - f.treated) + ' to treat') : V.chip('new', 'Ready to approve');
      return '<li><a href="#/settle/' + x.id + '"' + (l && l.id === x.id ? ' aria-current="true"' : '') + ' id="sq-' + x.id + '">' + u.kernel(tr.commodity, 12) + '<span class="lt-id">' + x.id + '</span><span class="lt-lane">' + esc(E.party(state, E.demand(state, x.demand).buyer).short) + '</span>' + st + '</a></li>';
    }).join('');
    const d = l ? detail(state, l) : null;
    const headInner = d ? d.head : '<div class="page-head"><div><h1>Settle</h1><p>Delivered loads become payable quantities from four documents. Finance approves; exports are not postings.</p></div></div>';
    return V.band(headInner, 'band-page band-trade') +
      '<div class="wrap"><nav class="squeue" aria-label="Settlement queue">' + (queue ? '<ul>' + queue + '</ul>' : '<p class="muted small">No delivered loads yet.</p>') + '</nav>' + (d ? d.body : '') + receivablesPanel(state) + '</div>';
  };
  V.settlePack = pack;
})();
