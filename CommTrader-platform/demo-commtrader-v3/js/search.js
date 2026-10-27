/* TradeDesk V3 — global search (Ctrl/Cmd-K): trades, loads, messages, bids, counterparties, incidents,
   receivables and events. Keyboard: arrows move, Enter opens, Escape closes. */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});
  const D = TD.DATA; const u = TD.u; const E = TD.engine; const S = TD.store;
  const { esc, icon } = u;
  const V = TD.views;
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function index(state) {
    const out = [];
    const add = (type, id, title, sub, href, extra) => out.push({ type: type, id: id, title: title, sub: sub, href: href, act: extra && extra.act, hay: norm([type, id, title, sub, extra && extra.more].join(' ')) });
    Object.values(state.trades).forEach((t) => add('Trade', t.id, V.tradeTitle(t), (t.qtyLoads || 0) + ' loads · ' + (t.origin || 'origin unknown') + ' · ' + (t.status === 'cancelled' ? 'cancelled' : V.stageOf(state, t).note || V.STAGES[Math.min(V.stageOf(state, t).done, 7)]), '#/trade/' + t.id, { more: V.pname(t.supplier) + ' ' + V.commodityName(t.commodity) + ' ' + (D.commodities[t.commodity] || {}).fr }));
    state.loads.forEach((l) => { const tr = state.trades[l.trade]; const b = E.party(state, E.demand(state, l.demand).buyer); add('Load', l.id, (tr ? V.commodityName(tr.commodity) : '') + ' to ' + b.short, l.status + ' · ' + (l.carrier ? E.party(state, l.carrier).short : 'no carrier') + ' · pickup ' + u.dayShort(l.pickupAt), V.refHref(state, l.id), { more: l.trade + ' ' + b.name + ' ' + (tr ? tr.origin + ' ' + V.pname(tr.supplier) : '') + ' ' + Object.values(l.docs || {}).filter(Boolean).map((d) => d.ref).join(' ') }); });
    state.messages.forEach((m) => add('Message', m.id, m.subject, m.from + ' · ' + m.org + ' · ' + m.kind, '#/inbox/' + m.id, { more: m.body }));
    state.demands.forEach((d) => { const dp = E.demandPrice(state, d); add(d.kind === 'Contract' ? 'Contract' : 'Bid', d.id, E.party(state, d.buyer).name + ' · ' + V.commodityName(d.commodity), u.t1(d.qty) + ' t · ' + (dp.price != null ? u.rate(dp.price) + ' CAD/t' : '') + ' · ' + E.bidStatus(state, d), '#/book/' + d.id, { more: d.contract || '' }); });
    Object.values(state.parties).forEach((p) => add(p.kind, p.id, p.name, (p.town || '') + ' · ' + (p.contact || '') + ' · ' + p.status, null, { act: 'party', more: p.short }));
    Object.values(state.exceptions).forEach((x) => add('Incident', x.id, 'Carrier cancelled ' + x.load, x.status + ' · ' + x.cause, '#/load/' + x.load));
    E.receivables(state).forEach((r) => add('Receivable', r.ref, (E.party(state, r.party) || {}).name || r.party, u.cad(u.toCents(r.amount)) + ' · ' + r.state + ' · due ' + u.dayShort(r.due), '#/settle', { more: r.load || '' }));
    state.events.slice(-300).forEach((e) => add('Event', '#' + e.id, e.text, u.dayShort(e.at) + ' ' + u.hhmm(e.at % 1440) + ' · ' + e.who, V.refHref(state, e.ref), { more: e.ref }));
    return out;
  }
  const RANK = { Trade: 0, Load: 1, Incident: 2, Message: 3, Bid: 4, Contract: 4, Supplier: 5, Buyer: 5, Carrier: 5, Receivable: 6, Event: 9 };
  function search(state, q) {
    const toks = norm(q).split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    return index(state).filter((r) => toks.every((t) => r.hay.includes(t))).map((r) => Object.assign(r, { score: (norm(r.id) === toks.join(' ') ? -10 : 0) + (norm(r.id).includes(toks[0]) ? -3 : 0) + RANK[r.type] })).sort((a, b) => a.score - b.score).slice(0, 30);
  }

  let sel = 0; let results = [];
  function dlg() { return document.getElementById('search-dlg'); }
  function draw(q) {
    const host = document.getElementById('search-results'); if (!host) return;
    results = search(S.get(), q);
    sel = Math.min(sel, Math.max(0, results.length - 1));
    host.innerHTML = results.length ? results.map((r, i) => '<li role="option" id="sr-' + i + '" aria-selected="' + (i === sel) + '" data-i="' + i + '" class="sr-item' + (i === sel ? ' is-sel' : '') + '"><span class="sr-type">' + esc(r.type) + '</span><span class="sr-main"><strong>' + esc(r.id) + ' · ' + esc(r.title) + '</strong><small>' + esc(r.sub) + '</small></span>' + icon('chevron', 14) + '</li>').join('') : (q.trim() ? '<li class="sr-empty" role="presentation">No match for “' + esc(q) + '”. Try a load (LD-4093), a person (Michel), a town or a status (expired).</li>' : '<li class="sr-empty" role="presentation">Search trades, loads, messages, bids, counterparties, incidents, receivables and the event log.</li>');
    const input = document.getElementById('search-input');
    if (input) { input.setAttribute('aria-activedescendant', results.length ? 'sr-' + sel : ''); }
    const cnt = document.getElementById('search-count'); if (cnt) cnt.textContent = q.trim() ? results.length + ' result' + (results.length === 1 ? '' : 's') : '';
  }
  function choose(i) {
    const r = results[i]; if (!r) return;
    close();
    if (r.act === 'party') { TD.app.openParty(r.id); return; }
    if (r.href) TD.router.go(r.href);
  }
  function open() {
    const d = dlg(); if (!d) return;
    document.getElementById('search-root').innerHTML = '<div class="search"><div class="search-bar">' + icon('search', 18) + '<label class="sr-only" for="search-input">Search TradeDesk</label><input id="search-input" type="search" autocomplete="off" spellcheck="false" placeholder="Search loads, trades, people, towns, statuses…" role="combobox" aria-expanded="true" aria-controls="search-results" aria-autocomplete="list"><span class="muted small" id="search-count" aria-live="polite"></span><button type="button" class="icon-btn" data-act="close-dialog" aria-label="Close search">' + icon('x', 16) + '</button></div><ul id="search-results" role="listbox" aria-label="Results"></ul><p class="search-foot small muted"><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close</p></div>';
    if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
    sel = 0; draw('');
    const input = document.getElementById('search-input'); input.focus();
    input.addEventListener('input', () => { sel = 0; draw(input.value); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(results.length - 1, sel + 1); draw(input.value); scrollSel(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(input.value); scrollSel(); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); const b = document.getElementById('search-btn'); if (b) b.focus(); }
    });
    document.getElementById('search-results').addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) choose(Number(li.dataset.i)); });
  }
  function scrollSel() { const el = document.getElementById('sr-' + sel); if (el) el.scrollIntoView({ block: 'nearest' }); }
  function close() { const d = dlg(); if (d && d.open) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); } }
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); const d = dlg(); if (d && d.open) close(); else open(); }
  });
  TD.search = { open: open, close: close, search: search };
})();
