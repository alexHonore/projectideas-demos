/* TradeDesk V3 — Today: "What needs my attention?" built from the role's queue (spec §9). */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});
  const D = TD.DATA; const u = TD.u; const E = TD.engine; const S = TD.store;
  const { esc, icon } = u;
  const V = TD.views;

  /* Enrich a queue item with the facts a decision card shows: action, money, missing facts, authority. */
  function enrich(state, q) {
    const auth = D.authority[state.role]; const usr = D.users[state.role];
    const d = Object.assign({ facts: null, why: q.note || '', action: 'Open', icon: 'arrow' }, q);
    if (q.kind === 'offer' || q.kind === 'revision') {
      const m = state.messages.find((x) => x.id === q.ref);
      d.time = m ? V.when(m.at) : '';
      d.why = m ? (m.translation || m.body).replace(/\s+/g, ' ').slice(0, 190) + ((m.translation || m.body).length > 190 ? '…' : '') : '';
      const ex = state.extraction[q.ref];
      const miss = ex ? S.extractionMissing(ex) : null;
      d.facts = [['From', m ? m.org : '—'], ['Language', m && m.lang === 'en' ? 'English' : 'French'], ['Missing', miss == null ? 'Not reviewed yet' : miss.length ? miss.join(', ') : 'Nothing required'], ['Approval', 'Review only: nothing is bought']];
      d.action = q.kind === 'revision' ? 'Review the revision' : 'Review the offer'; d.icon = 'inbox';
    } else if (q.kind === 'approve') {
      const tr = state.trades[q.ref];
      const plan = E.planSummary(state, tr, { moisture: tr.moisture, freightPct: 0 });
      d.why = q.note === 'Ready to approve' ? 'All checks pass for ' + V.tradeTitle(tr) + ': ' + (plan.loads ? plan.per.map((p) => p.loads + ' loads to ' + p.rates.name).join(' and ') : 'no sale allocated yet') + '.' : q.note;
      d.facts = [['Plan', plan.contribution == null ? 'Incomplete' : u.cad(plan.contribution) + (plan.perTonne != null ? ' (' + u.rate(plan.perTonne) + '/t)' : '')], ['Supply', tr.certainty === 'tentative' ? 'Tentative' : tr.supplierConfirmed ? 'Supplier-confirmed' : 'Stated'], ['Window', tr.windowEnd != null ? 'Ends ' + V.when(tr.windowEnd) : 'Missing'], ['Authority', auth.trade ? 'Up to ' + u.cad(u.toCents(auth.purchaseLimit)).replace('.00', '') : usr.title + ': view only']];
      d.action = 'Price and approve'; d.icon = 'scale';
    } else if (q.kind === 'exception') {
      const ex = state.exceptions[q.ref]; const l = E.load(state, ex.load);
      const q2 = E.quotedLoadLines(state, l); const opts = E.exceptionOptions(state, ex); const best = opts.find((o) => o.recommended);
      d.time = V.when(ex.openedAt);
      d.why = ex.cause + ' Receiver cutoff ' + V.when(l.cutoffAt) + '.';
      d.facts = [['At risk', q2 ? u.cad(E.contrib(q2)) + ' contribution' : '—'], ['Best option', best ? V.pname(best.carrier, true) + ', +' + u.money(best.extra) : 'None eligible: re-quote'], ['Quote validity', best ? 'Until ' + V.when(best.validUntil) : '—'], ['Your cap', auth.replacement ? 'CAD ' + auth.replacementCap + ' per load' : 'Cannot approve']];
      d.action = 'Resolve the incident'; d.icon = 'truck';
    } else if (['quality', 'invoice', 'settle', 'export', 'ack'].includes(q.kind)) {
      const l = E.load(state, q.ref); const tr = state.trades[l.trade]; const dm = E.demand(state, l.demand);
      d.why = V.commodityName(tr.commodity) + ', ' + V.pname(tr.supplier) + ' to ' + V.pname(dm.buyer) + '. ' + (q.kind === 'quality' ? 'Destination grades settle the sale; both readings are kept.' : q.kind === 'invoice' ? 'The freight order sets the payable basis; finance treats invoices.' : q.kind === 'settle' ? 'Every discrepancy is treated. Finance approves the package.' : q.kind === 'export' ? 'Approved values only. Export is not posting.' : 'Exported; the accounting acknowledgement is pending.');
      d.facts = [['Amount', q.money != null ? u.cad(q.money) : '—'], ['Load', l.id + ' · ' + u.t3(l.docs.receiving ? l.docs.receiving.net : l.planned) + ' t'], ['Delivered', l.deliveredAt != null ? V.when(l.deliveredAt) : '—'], ['Authority', q.kind === 'quality' ? 'Trader' : 'Finance']];
      d.action = q.kind === 'export' ? 'Export to accounting' : 'Review the evidence'; d.icon = 'scale';
    } else if (q.kind === 'rfq' || q.kind === 'appts') {
      const tr = state.trades[q.ref]; const alloc = tr.approval.snapshot.alloc; const n = Object.values(alloc).reduce((a, b) => a + b, 0);
      d.why = 'Approved v' + tr.approval.version + ' by ' + tr.approval.by + '. ' + (q.kind === 'rfq' ? 'Carriers see lanes, dates and equipment only.' : 'A request is not a confirmed slot.');
      d.facts = [['Loads', n + ' × ' + tr.payload + ' t'], ['Lanes', Object.keys(alloc).filter((k) => alloc[k]).map((k) => tr.origin + ' → ' + (E.party(state, E.demand(state, k).buyer) || {}).town).join('; ')], ['Window', u.dayShort(tr.windowStart) + '–' + u.dayShort(tr.windowEnd)], ['Authority', auth.award ? 'You can award' : 'Logistics awards']];
      d.action = q.kind === 'rfq' ? 'Open freight' : 'Book appointments'; d.icon = 'truck';
    } else if (q.kind === 'overdue') {
      d.why = 'Payment status imports from accounting; TradeDesk never marks an invoice paid by itself.';
      d.facts = [['Amount', u.cad(q.money)], ['Counterparty', q.title.split('(')[1] ? q.title.split('(')[1].replace(')', '') : '—'], ['Credit', 'Counts against the limit until paid'], ['Authority', 'Finance']];
      d.action = 'Open receivables';
    } else if (q.kind === 'party') {
      const p = state.parties[q.ref];
      d.why = 'Created by ' + (p.createdBy || 'someone') + '. Segregation of duties: the creator cannot approve.';
      d.facts = [['Kind', p.kind], ['Town', p.town || '—'], ['Credit', p.creditLimit ? u.cad(u.toCents(p.creditLimit)) : '—'], ['Authority', p.kind === 'Carrier' ? 'Logistics' : 'Finance']];
      d.action = 'Open the passport'; d.actAttr = 'party';
    } else if (q.kind === 'late') {
      const l = E.load(state, q.ref);
      d.why = 'ETA ' + V.when(l.etaAt) + ' against a ' + u.hhmm(l.cutoffAt % 1440) + ' cutoff. Call the receiver or plan the next receiving day.';
      d.action = 'Open the load';
    } else if (q.kind === 'policy') { d.action = 'Review the policy'; }
    return d;
  }

  function card(d, i) {
    const sevChip = V.chip(d.sev === 'new' ? 'new' : d.sev, d.sev === 'new' ? ({ offer: 'New offer', approve: 'Ready', rfq: 'Handoff', appts: 'Handoff', settle: 'Handoff', party: 'Approval', export: 'Next step' }[d.kind] || 'New') : null);
    const action = d.actAttr === 'party' ? '<button type="button" class="btn primary" data-act="party" data-id="' + esc(d.ref) + '">' + icon('user', 16) + '<span>' + esc(d.action) + '</span></button>' : V.link(esc(d.action), d.href, i === 0 ? 'primary' : '', d.icon);
    return '<article class="dcard sev-' + d.sev + '" id="dcard-' + esc(d.kind + '-' + d.ref) + '">' +
      '<header class="dcard-head">' + sevChip + '<span class="dcard-ref">' + esc(d.ref) + '</span>' + (d.time ? '<time>' + esc(d.time) + '</time>' : '') + '</header>' +
      '<h3>' + esc(d.title) + '</h3>' + (d.why ? '<p class="dcard-why">' + esc(d.why) + '</p>' : '') +
      (d.facts ? '<dl class="dcard-facts">' + d.facts.map((f) => '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>').join('') + '</dl>' : '') +
      '<div class="dcard-actions">' + action + '</div></article>';
  }

  /* Things worth a look that are not yet a decision. */
  function watching(state) {
    const out = [];
    const today = Math.floor(state.now / 1440);
    state.loads.forEach((l) => {
      if (!['booked', 'loading', 'transit'].includes(l.status) || !l.carrier) return;
      if (l.exception && state.exceptions[l.exception] && state.exceptions[l.exception].status !== 'resolved') return;
      if (Math.floor(l.etaAt / 1440) !== today) return;
      const buffer = l.cutoffAt - l.etaAt;
      if (buffer < 30 && !state.watch[l.id]) {
        const tr = state.trades[l.trade]; const b = E.party(state, E.demand(state, l.demand).buyer);
        out.push({ id: 'w-' + l.id, sev: buffer < 0 ? 'high' : 'medium', ref: l.id + ' · ' + l.trade, title: 'Predicted arrival ' + u.hhmm(l.etaAt % 1440) + '; ' + b.short + ' closes at ' + u.hhmm(l.cutoffAt % 1440), why: (buffer < 0 ? 'It will miss the cutoff by ' + Math.abs(buffer) + ' minutes.' : 'Only ' + buffer + ' minutes of buffer.') + ((state.parties[tr.supplier] || {}).observations || []).slice(0, 1).map((o) => ' ' + o.text).join(''), actions: '<button type="button" class="btn small" data-act="copy-receiver" data-id="' + l.id + '">' + icon('copy', 15) + '<span>Copy a note for the receiver</span></button>' + V.link('Open ' + l.id, '#/load/' + l.id, 'small ghost') });
      }
    });
    state.loads.forEach((l) => {
      if (!l.bolMissing || l.status === 'cancelled') return;
      out.push({ id: 'b-' + l.id, sev: 'low', ref: l.id + ' · ' + l.trade, title: 'BOL photo missing for ' + l.id, why: 'A reminder to the driver is drafted, not sent. The photo is read in your browser and checksummed.', actions: '<button type="button" class="btn small" data-act="copy-bol" data-id="' + l.id + '">' + icon('copy', 15) + '<span>Copy driver reminder</span></button><label class="btn small file-btn">' + icon('upload', 15) + '<span>Attach BOL photo</span><input type="file" accept="image/*,.pdf" data-input="bol" data-id="' + l.id + '"></label>' });
    });
    state.demands.forEach((d) => {
      if (d.validUntil == null || E.bidStatus(state, d) !== 'open' || d.validUntil - state.now > 480) return;
      const users = Object.values(state.trades).filter((t) => t.alloc && t.alloc[d.id] && !(t.approval && t.approval.valid) && t.status !== 'cancelled');
      if (!users.length) return;
      out.push({ id: 'd-' + d.id, sev: 'medium', ref: d.id, title: E.party(state, d.buyer).short + '’s bid expires ' + V.when(d.validUntil), why: 'Unapproved plans rely on it: ' + users.map((t) => t.id).join(', ') + '. After expiry the plan cannot be approved against it.', actions: V.link('Open ' + users[0].id, '#/trade/' + users[0].id + '/approve', 'small ghost') });
    });
    Object.values(state.trades).forEach((t) => {
      if (t.status !== 'open' || t.windowEnd == null || t.windowEnd - state.now > 1440 || t.windowEnd < state.now) return;
      out.push({ id: 't-' + t.id, sev: 'medium', ref: t.id, title: t.id + '’s pickup window ends ' + V.when(t.windowEnd), why: 'Unapproved supply drops out of firm capacity when its window lapses.', actions: V.link('Open ' + t.id, '#/trade/' + t.id, 'small ghost') });
    });
    return out;
  }

  function heroCopy(state, items) {
    const n = items.length;
    const usr = D.users[state.role];
    const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const nextCut = state.loads.filter((l) => ['booked', 'loading', 'transit'].includes(l.status) && l.cutoffAt > state.now && Math.floor(l.cutoffAt / 1440) === Math.floor(state.now / 1440)).map((l) => l.cutoffAt).sort((a, b) => a - b)[0];
    const by = nextCut ? ' before the ' + u.hhmm(nextCut % 1440) + ' cutoff' : '';
    const title = n === 0 ? 'Your queue is clear, ' + usr.first + '. Every decision is on the record.' : (n === 1 ? 'One decision needs you' + by + '.' : (WORDS[n] || n) + ' decisions need you' + by + '.');
    const parts = items.slice(0, 3).map((d) => d.title.charAt(0).toLowerCase() + d.title.slice(1));
    let lede = parts.length ? (parts.length > 1 ? parts.slice(0, -1).join('; ') + '; and ' + parts[parts.length - 1] : parts[0]) : 'Contribution, loads and settlements below reflect everything approved so far.';
    lede = lede.charAt(0).toUpperCase() + lede.slice(1) + (parts.length ? '.' : '');
    return { title: title, lede: lede };
  }

  function loopStrip(state) {
    const trades = Object.values(state.trades).filter((t) => t.status !== 'cancelled');
    const st = (tr) => V.stageOf(state, tr).done;
    const reviewMsgs = state.messages.filter((m) => S.isExtractable(m) && m.status === 'review').length;
    const ls = state.loads.filter((l) => l.status !== 'cancelled');
    const cnt = (f) => ls.filter(f).length;
    const cells = [
      ['Offer', reviewMsgs, 'to review', '#/inbox'],
      ['Lot', trades.filter((t) => st(t) <= 2).length, 'lots unpriced', '#/trades'],
      ['Priced', trades.filter((t) => st(t) === 3).length, 'awaiting approval', '#/trades'],
      ['Approved', trades.filter((t) => st(t) === 4).length, 'awaiting freight', '#/trades'],
      ['Freight', cnt((l) => l.status === 'booked'), 'loads booked', '#/loads'],
      ['Moving', cnt((l) => l.status === 'loading' || l.status === 'transit'), 'loads', '#/loads'],
      ['Delivered', cnt((l) => l.status === 'delivered'), 'to reconcile', '#/settle'],
      ['Settled', cnt((l) => l.status === 'reconciled' || l.status === 'settled'), 'reconciled', '#/review']
    ];
    return '<ol class="loop" aria-label="Work in each stage of the trade loop">' + cells.map((c, i) => '<li><a href="' + c[3] + '" class="loop-cell' + (c[1] ? '' : ' is-zero') + '"><span class="loop-n">' + (i + 1) + '</span><span class="loop-name">' + c[0] + '</span><span class="loop-count num">' + c[1] + '</span><span class="loop-unit">' + c[2] + '</span></a></li>').join('') + '</ol>';
  }

  function pnlPanel(state) {
    const b = E.bookPnl(state);
    const rows = Object.values(state.trades).filter((t) => t.status !== 'cancelled').map((t) => ({ t: t, p: E.tradePnl(state, t) })).filter((x) => x.p.has);
    return '<section class="panel" aria-labelledby="pnl-h"><div class="panel-head"><h2 id="pnl-h">Contribution on the book</h2>' + V.link('Explain', '#/review', 'small ghost') + '</div>' +
      '<div class="pnl3"><div><span class="pnl-l">Quoted</span><strong class="num" id="pnl-quoted">' + u.money(b.quoted) + '</strong><small>at approval</small></div><div><span class="pnl-l">Current</span><strong class="num" id="pnl-current">' + u.money(b.current) + '</strong><small>with today’s evidence</small></div><div><span class="pnl-l">Realized</span><strong class="num" id="pnl-actual">' + u.money(b.actual) + '</strong><small>reconciled loads</small></div></div>' +
      '<div class="table-wrap"><table class="mini"><caption class="sr-only">Contribution by trade, CAD</caption><thead><tr><th scope="col">Trade</th><th scope="col" class="r">Quoted</th><th scope="col" class="r">Current</th><th scope="col" class="r">Realized</th></tr></thead><tbody>' +
      rows.map((x) => '<tr><th scope="row"><a href="#/trade/' + x.t.id + '">' + u.kernel(x.t.commodity, 12) + x.t.id + '</a></th><td class="r num">' + u.money(x.p.quoted) + '</td><td class="r num' + (x.p.current < x.p.quoted ? ' neg' : '') + '">' + u.money(x.p.current) + '</td><td class="r num">' + (x.p.reconciled ? u.money(x.p.actual) : '—') + '</td></tr>').join('') +
      '</tbody></table></div><p class="panel-note">CAD. Quoted is fixed at approval; current adds rebookings, firm freight and tickets; realized counts reconciled loads only.</p></section>';
  }

  function loadsPanel(state) {
    const day = Math.floor(state.now / 1440);
    const ls = state.loads.filter((l) => l.status !== 'cancelled' && (Math.floor(l.pickupAt / 1440) === day || Math.floor(l.etaAt / 1440) === day || (l.status === 'delivered' && !l.docs.receiving)));
    const by = (s) => ls.filter((l) => l.status === s).length;
    return '<section class="panel" aria-labelledby="lt-h"><div class="panel-head"><h2 id="lt-h">Loads today</h2>' + V.link('Control tower', '#/loads', 'small ghost') + '</div>' +
      '<p class="lt-counts"><span><strong class="num">' + by('booked') + '</strong> booked</span><span><strong class="num">' + by('loading') + '</strong> loading</span><span><strong class="num">' + by('transit') + '</strong> in transit</span><span><strong class="num">' + by('delivered') + '</strong> delivered</span></p>' +
      (ls.length ? '<ul class="lt-list">' + ls.map((l) => {
        const tr = state.trades[l.trade]; const b = E.party(state, E.demand(state, l.demand).buyer);
        return '<li><a href="#/load/' + l.id + '">' + u.kernel(tr.commodity, 12) + '<span class="lt-id">' + l.id + '</span><span class="lt-lane">to ' + esc(b.town) + '</span>' + V.loadChip(state, l) + '<span class="lt-eta num">' + (['booked', 'loading', 'transit'].includes(l.status) ? 'ETA ' + u.hhmm(l.etaAt % 1440) : '') + '</span></a></li>';
      }).join('') + '</ul>' : '<p class="muted small">No loads move today. Advance the clock in the Test lab to watch booked loads roll.</p>') + '<p class="panel-note">Positions come from manual check-ins, not GPS.</p></section>';
  }

  function marketPanel(state) {
    const rows = ['CZ26', 'SX26', 'USDCAD'].map((k) => {
      const b = E.benchmark(state, k);
      return '<div><dt>' + esc(k === 'USDCAD' ? 'USD/CAD' : k + ' ' + (b.commodity === 'corn' ? 'corn' : 'soybeans')) + '</dt><dd><span class="num">' + b.value.toFixed(4) + '</span> ' + (k === 'USDCAD' ? '' : 'USD/bu ') + V.chip(b.stale ? 'stale' : 'fresh', (b.stale ? 'Stale: ' : 'Entered ') + V.when(b.at)) + '</dd></div>';
    }).join('');
    const cz = E.futuresCad(state, 'CZ26');
    return '<section class="panel" aria-labelledby="mk-h"><div class="panel-head"><h2 id="mk-h">Benchmarks</h2>' + V.link('Edit in Book', '#/book', 'small ghost') + '</div><dl class="bench">' + rows +
      '<div><dt>CZ26 in CAD/t</dt><dd><span class="num">' + u.rate(cz.value) + '</span> <small class="muted">= ' + cz.fut.value.toFixed(4) + ' × ' + cz.fx.value.toFixed(4) + ' × ' + cz.buPerT.toFixed(4) + ' bu/t</small></dd></div></dl>' +
      '<p class="panel-note">Manual entries, not a live feed. A price older than 4 hours stays visible but cannot support an executable basis sale.</p></section>';
  }

  function logPanel(state) {
    const items = state.events.slice(-6).reverse();
    return '<section class="panel" aria-labelledby="lg-h"><div class="panel-head"><h2 id="lg-h">Desk log</h2><button type="button" class="btn small ghost" data-act="lab" data-sec="log">' + state.events.length + ' events</button></div><ol class="logl">' +
      items.map((e) => '<li><time class="num">' + u.hhmm(e.at % 1440) + '</time><div><p>' + esc(e.text) + '</p><small>' + esc(u.dayShort(e.at)) + ' · ' + esc(e.who) + (e.role === 'service' ? ' (service identity, no human authority)' : '') + '</small></div></li>').join('') + '</ol></section>';
  }

  /* Hero companion: the newest offer in one glance, from the sender's words to delivered margin by buyer. */
  function heroDemo(state) {
    let tr = null; let m = null;
    const offer = state.messages.find((x) => x.kind === 'Supply offer' && (x.status === 'review' || x.status === 'linked'));
    if (offer) { m = offer; const ex = state.extraction[offer.id]; if (ex && ex.created) tr = state.trades[ex.created]; }
    if (!tr && !m) tr = Object.values(state.trades).filter((t) => t.status === 'open' && t.price != null && t.origin).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    if (!m && tr && tr.source) m = state.messages.find((x) => x.id === tr.source);
    let lot = tr;
    if (!lot && m) {
      const parsed = TD.parser.parse(m.body); const v = S.valuesFromParse(Object.assign(parsed, { text: m.body }), m);
      if (v.price != null && v.commodity) lot = { id: 'preview', commodity: v.commodity, origin: v.origin || (m.originHint && m.originHint.town) || (state.parties[m.party] || {}).town, price: v.price, moisture: v.moisture, testWeight: v.testWeight, payload: 38.5, windowStart: v.windowStart, windowEnd: v.windowEnd, supplier: m.party, alloc: {} };
    }
    if (!lot) return '';
    const rows = E.comparison(state, lot, { moisture: lot.moisture, freightPct: 0 }).filter((r) => r.contribution != null && r.compat !== 'excluded' && r.compat !== 'fail').sort((a, b) => b.price - a.price).slice(0, 3).reverse();
    if (!rows.length) return '';
    const max = Math.max.apply(null, rows.map((r) => r.price - lot.price));
    let quote = '';
    if (m) {
      const ex = state.extraction[m.id];
      const parsed = ex && ex.parsed ? ex.parsed : Object.assign(TD.parser.parse(m.body), { text: m.body });
      const spans = ['certainty', 'quantity', 'moisture', 'price'].map((k) => parsed.fields[k] && parsed.fields[k].span ? { span: parsed.fields[k].span, key: k } : null).filter(Boolean);
      let a = Math.max(0, Math.min.apply(null, spans.map((s) => s.span[0])) - 2); let b = Math.min(m.body.length, Math.max.apply(null, spans.map((s) => s.span[1])) + 1);
      while (a > 0 && !/[\n.!?]/.test(m.body[a - 1]) && Math.min.apply(null, spans.map((s) => s.span[0])) - a < 40) a -= 1;
      while (a < m.body.length && /\s/.test(m.body[a])) a += 1;
      while (b < m.body.length && !/[\n.!?]/.test(m.body[b - 1]) && b - Math.max.apply(null, spans.map((s) => s.span[1])) < 30) b += 1;
      const shifted = spans.map((s) => ({ span: [s.span[0] - a, s.span[1] - a], key: s.key }));
      quote = spans.length ? '<blockquote lang="' + esc(m.lang) + '">' + (a > 0 ? '…' : '') + TD.parser.highlight(m.body.slice(a, b), shifted).replace(/src-mark/g, 'hd-mark') + (b < m.body.length ? '…' : '') + '</blockquote>' : '';
    }
    const ap = tr && tr.approval && tr.approval.valid;
    const foot = ap ? 'Approved v' + tr.approval.version + ': ' + Object.keys(tr.approval.snapshot.alloc).filter((k) => tr.approval.snapshot.alloc[k]).map((k) => tr.approval.snapshot.alloc[k] + ' loads to ' + E.party(state, E.demand(state, k).buyer).short).join(', ') + '.' : 'Grey is freight, moisture shrink, financing and detention. The highest bid comes last.';
    const href = tr ? '#/trade/' + tr.id + '/price' : '#/inbox/' + m.id;
    return '<a class="hero-demo" href="' + href + '" aria-label="Open the delivered-margin comparison for ' + esc(m ? m.from : tr.id) + '"><p class="hd-l">' + esc(m ? m.from + ', ' + V.when(m.at) : tr.id + ', ' + V.tradeTitle(tr)) + '</p>' + quote +
      '<p class="hd-l">Delivered contribution, CAD/t, before you call anyone back</p><ul class="hd-rows">' + rows.map((r) => {
        const w = Math.max(4, (Math.max(0, r.contribution) / max) * 100); const cost = (Math.max(0, r.price - lot.price - r.contribution) / max) * 100;
        return '<li><span class="hd-name">' + esc(r.name) + '<small>bids ' + u.rate(r.price) + '</small></span><span class="hd-bar"><i class="hd-cost" style="width:' + Math.min(100, cost).toFixed(1) + '%"></i><i class="hd-c" style="width:' + Math.min(100, w).toFixed(1) + '%"></i></span><span class="hd-v num">' + u.rate(r.contribution) + '</span></li>';
      }).join('') + '</ul><p class="hd-foot">' + esc(foot) + '</p></a>';
  }

  V.today = function (state) {
    const items = S.queue(state.role).map((q) => enrich(state, q));
    const sevRank = { high: 0, medium: 1, new: 2, low: 3 };
    items.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]);
    const h = heroCopy(state, items);
    const usr = D.users[state.role];
    const primary = items.length ? V.link('Go to the first decision', items[0].href || '#/today', 'primary on-dark', 'arrow', 'hero-primary') : V.link('Review the month', '#/review', 'primary on-dark', 'chart', 'hero-primary');
    const hero = '<div class="hero-grid"><div class="hero"><p class="hero-date">' + esc(u.dayLong(state.now)) + ', ' + u.hhmm(state.now) + ' · ' + esc(D.desk.company) + ', ' + esc(D.desk.desk) + ' · ' + esc(usr.name) + ', ' + esc(usr.title.toLowerCase()) + '</p>' +
      '<h1 class="hero-title" id="hero-title">' + esc(h.title) + '</h1><p class="hero-lede">' + esc(h.lede) + '</p>' +
      '<p class="hero-what">TradeDesk turns supplier messages, buyer bids and freight quotes into priced, booked and reconciled loads. It runs beside your ERP; you keep every purchase, sale and payment decision.</p>' +
      '<div class="hero-actions">' + primary + '<button type="button" class="btn ghost on-dark" data-act="tour-start">' + icon('play', 16) + '<span>Take the guided tour</span></button><button type="button" class="btn ghost on-dark" data-act="lab">' + icon('flask', 16) + '<span>Open the Test lab</span></button></div></div>' + heroDemo(state) + '</div>' + loopStrip(state);
    const watch = watching(state);
    const day = Math.floor(state.now / 1440);
    const done = state.events.filter((e) => e.role !== 'service' && e.kind === 'action' && Math.floor(e.at / 1440) === day && !/^Edited|^Entered indicative|^Logged confirmation/.test(e.text)).slice(-6).reverse();
    return V.band(hero, 'band-hero') +
      '<div class="wrap today-grid"><div class="col-main"><section aria-labelledby="dec-h"><div class="sec-head"><h2 id="dec-h">Your queue</h2><span class="muted small">' + esc(usr.title) + ': each card names the action, the money and the authority it needs. Switch roles to see their queues.</span></div>' +
      (items.length ? items.map(card).join('') : '<div class="empty">' + icon('check', 22) + '<p>Nothing waiting for ' + esc(usr.title.toLowerCase()) + '. New messages, handoffs and exceptions will appear here.</p></div>') + '</section>' +
      (watch.length ? '<section aria-labelledby="w-h" class="watch"><div class="sec-head"><h2 id="w-h">Watching</h2><span class="muted small">No decision yet, but worth a look.</span></div>' + watch.map((w) => '<article class="dcard sev-' + w.sev + '" id="watch-' + esc(w.id) + '"><header class="dcard-head">' + V.chip(w.sev) + '<span class="dcard-ref">' + esc(w.ref) + '</span></header><h3>' + esc(w.title) + '</h3><p class="dcard-why">' + esc(w.why) + '</p><div class="dcard-actions">' + w.actions + '</div></article>').join('') + '</section>' : '') +
      (done.length ? '<section aria-labelledby="dn-h" class="donelist"><div class="sec-head"><h2 id="dn-h">Done today</h2></div><ul>' + done.map((d) => { const href = V.refHref(state, d.ref); return '<li>' + icon('check', 15) + (href ? '<a href="' + href + '">' : '<span>') + esc(u.hhmm(d.at % 1440) + ' · ' + d.text) + (href ? '</a>' : '</span>') + '</li>'; }).join('') + '</ul></section>' : '') +
      '</div><aside class="col-side" aria-label="Desk summary">' + pnlPanel(state) + loadsPanel(state) + marketPanel(state) + logPanel(state) + '</aside></div>';
  };
  V.enrichQueue = enrich;
})();
