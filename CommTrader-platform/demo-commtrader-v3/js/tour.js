/* TradeDesk V3 — presenter tour. Walks the three signature journeys on the real screens.
   "Do it for me" performs each step through the same generic actions a person would trigger,
   switching roles where the work is handed off (trader → logistics → finance). */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});
  const S = TD.store; const A = TD.act; const E = TD.engine; const D = TD.DATA; const u = TD.u;
  const KEY = D.storageKey + ':tour';
  const MSG = 'MSG-0884';
  const st = () => S.get();
  const tid = () => (st().extraction[MSG] || {}).created || null;
  const tr = () => (tid() ? st().trades[tid()] : null);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function until(fn, ms) { const t0 = Date.now(); while (!fn() && Date.now() - t0 < (ms || 6000)) await wait(80); return fn(); }
  const as = (role) => { if (st().role !== role) A.setRole(role); };

  /* Prerequisites, so any step can be opened directly (idempotent). */
  function ensureLot() { if (!tr()) { A.openMessage(MSG); if (!S.extractionReady(MSG).ready) A.acceptAll(MSG); A.createFromExtraction(MSG); } }
  function ensureApproved() { ensureLot(); const t = tr(); if (t && !(t.approval && t.approval.valid)) { as('trader'); A.setScenario(t.id, { moisture: t.moisture, freightPct: 0 }); A.confirmSupplier(t.id); A.approveTrade(t.id); } }
  async function ensureAwarded() { ensureApproved(); const t = tr(); if (!t) return; as('logistics'); if (!t.rfq) A.sendRfq(t.id); await until(() => tr().rfq && !tr().rfq.pending); if (!tr().rfq.award) A.award(t.id, 'berard'); await until(() => tr().rfq.award && tr().rfq.award.state === 'accepted'); }
  async function ensureBooked() { await ensureAwarded(); const t = tr(); as('logistics'); if (!t.appts || t.appts.state === 'failed') A.requestAppts(t.id); await until(() => tr().appts && tr().appts.state === 'confirmed'); }
  async function ensureReplaced() { const ex = st().exceptions['EX-0317']; if (ex && ex.status === 'open') { as('logistics'); A.chooseOption('EX-0317', 'berard'); A.approveReplacement('EX-0317'); } await until(() => st().exceptions['EX-0317'].status === 'resolved', 8000); }
  function ensureTreated() { const l = E.load(st(), 'LD-4072'); if (!l.recon.d.moisture) { as('trader'); A.treat('LD-4072', 'moisture', 'accept'); } if (!l.recon.d.invoice) { as('finance'); A.treat('LD-4072', 'invoice', 'origin'); } }
  function ensureSettled() { ensureTreated(); const l = E.load(st(), 'LD-4072'); as('finance'); if (!l.recon.approved) A.approveSettlement('LD-4072'); if (!l.recon.exported) { const f = A.exportSettlement('LD-4072'); if (f) u.download(f, TD.views.settleCsv(st(), 'LD-4072'), 'text/csv;charset=utf-8'); } if (!l.recon.ack) A.ackSettlement('LD-4072'); }
  const trRoute = (stage) => () => (tid() ? '#/trade/' + tid() + '/' + stage : '#/inbox/' + MSG);

  const STEPS = [
    { route: '#/today', target: '#hero-title', title: 'What needs you today', body: 'TradeDesk opens on your queue, not a dashboard. Each card names the action, the money at stake and the authority it needs. The tour walks three of them: a new corn offer, a cancelled truck and a moisture claim. Everything also works on any other record, and the Test lab lets you move time and inject events.' },
    { route: '#/inbox/' + MSG, target: '.letter', title: 'Michel’s email, kept verbatim', body: 'The original stays in French, stored with a checksum; Samuel’s duplicate forward was merged. Every extracted value links back to the words it came from.' },
    { route: '#/inbox/' + MSG, target: '.extract', title: 'Review field by field', body: '“Probablement” keeps the lot tentative. “10 voyages” stays 10 loads until a payload is chosen, and the origin stays unknown until someone picks it. Accepting applies 38.5 t per B-train and Saint-Pie. Live AI, metered on the hub’s API monitor, can read the same email into the same fields.', action: () => A.acceptAll(MSG), done: () => S.extractionReady(MSG).ready || !!tid() },
    { route: '#/inbox/' + MSG, target: '#create-lot, .ex-done', prep: () => { A.openMessage(MSG); if (!tid() && !S.extractionReady(MSG).ready) A.acceptAll(MSG); }, title: 'Create the tentative lot', body: 'This creates a lot and an opportunity. It buys nothing and adds no firm inventory.', action: () => { A.createFromExtraction(MSG); }, done: () => !!tid() },
    { route: trRoute('price'), prep: ensureLot, target: '#ladder', title: 'The highest bid is not the best trade', body: 'Every buyer on one CAD/t scale, starting at the purchase price: freight, moisture discount, financing and detention, then contribution in green. Terminal Laviolette’s basis bid is the highest, leaves less, and is not approval-ready without a test weight.' },
    { route: trRoute('price'), prep: ensureLot, target: '#scen-down', title: 'Test the downside', body: 'Michel’s corn has arrived 0.3 to 0.6 points wetter than he said. At 15.8% with freight +5%, Éthanol Saint-Laurent falls under the CAD 8.00/t minimum.', action: () => A.setScenario(tid(), E.downside(tr())), done: () => tr() && tr().scenario.moisture === E.downside(tr()).moisture },
    { route: trRoute('price'), prep: ensureLot, target: '.alloc', title: 'Allocate without double-allocating', body: 'Six loads fill Moulée Richelieu’s open 231 t; four take the last 154 t of Éthanol’s contract. Press + on Éthanol: the ledger refuses a fifth load. The scenario goes back to best estimate for approval.', action: () => A.setScenario(tid(), { moisture: tr().moisture, freightPct: 0 }), done: () => tr() && tr().scenario.moisture === tr().moisture && !tr().scenario.freightPct },
    { route: trRoute('approve'), prep: ensureLot, target: '.checks', title: 'Approval checks this exact version', body: '“Probablement” is not a purchase, so approval is blocked until Michel confirms. Limits, credit headroom, bid validity and screening are checked against this version.', action: () => { as('trader'); A.confirmSupplier(tid()); }, done: () => tr() && !!tr().supplierConfirmed },
    { route: trRoute('approve'), prep: () => { ensureLot(); as('trader'); A.confirmSupplier(tid()); }, target: '#approve-btn, .approved', title: 'Approve, with the money on the button', body: 'Approving reserves 385 t in the allocation ledger, adds both sales to credit exposure, drafts confirmations in each party’s language and hands freight to logistics. Nothing is sent.', action: ensureApproved, done: () => tr() && tr().approval && tr().approval.valid },
    { route: trRoute('freight'), prep: ensureApproved, target: '#rq-h', title: 'Logistics tenders freight, all-in', body: 'Samuel picks up the handoff. Lafrance looks cheapest until its 9% fuel surcharge is added; Rive-Sud’s quote has expired; Montcalm has not declared its axles. Bérard is the lowest eligible all-in quote; carrier replies are simulated.', action: ensureAwarded, done: () => tr() && tr().rfq && tr().rfq.award && tr().rfq.award.state === 'accepted' },
    { route: trRoute('freight'), prep: ensureAwarded, target: '#apt-h', title: 'Slots confirmed, then loads exist', body: 'A calendar request is not a confirmed slot. When the facilities confirm, ten loads are booked from Monday and the thread moves past Freight. Advance the clock in the Test lab to watch them roll.', action: ensureBooked, done: () => tr() && tr().appts && tr().appts.state === 'confirmed' },
    { route: '#/load/LD-4093', target: '#incident-EX-0317', title: 'Meanwhile, a truck cancels', body: 'One incident instead of scattered alerts: prepared alternatives with cost, cutoff and evidence. Montcalm is cheaper but its axles are unverified; Rive-Sud would miss the 15:30 cutoff and the contract window. Quotes expire: wait too long and you must re-quote.' },
    { route: '#/load/LD-4093', target: '#ex-approve, #incident-EX-0317 .callout', title: 'Approve the additional freight', body: 'TradeDesk revalidates insurance, quote validity, payload and terms before anything is sent. The incident stays open until Bérard’s acceptance is evidenced.', action: ensureReplaced, done: () => st().exceptions['EX-0317'].status === 'resolved' },
    { route: '#/settle/LD-4072', target: '.tickets', title: 'Four documents, four weights', body: 'Contract 38.500 t, origin 38.420 t, receiving 38.370 t, invoice 38.500 t. The weight loss is within tolerance. The invoice basis and the moisture are not.' },
    { route: '#/settle/LD-4072', target: '#ds-h', title: 'Treat each discrepancy', body: 'As trader, accept the destination grade under the contract formula. Then finance pays the carrier on the origin weight its freight order specifies. Roles switch here because each treatment belongs to a different desk.', action: ensureTreated, done: () => { const l = E.load(st(), 'LD-4072'); return !!(l.recon.d.moisture && l.recon.d.invoice); } },
    { route: '#/settle/LD-4072', prep: ensureTreated, target: '#pk-h', title: 'Finance approves and exports', body: 'Only approved values leave TradeDesk. The CSV download is real; the accounting acknowledgement is simulated, and it opens a receivable that will go overdue if the buyer pays late.', action: ensureSettled, done: () => !!E.load(st(), 'LD-4072').recon.ack },
    { route: '#/review', prep: () => TD.app.showTab('review', 'leak'), target: '.leak', title: 'Why expected became actual', body: 'LD-4072 was quoted at 644.87 and settled at 514.80: moisture −157.30, weights −15.12, detention not incurred +42.35. Causes sum exactly to the change, load by load.' },
    { route: '#/review', prep: () => TD.app.showTab('review', 'policy'), target: '.policy', title: 'Automation only with evidence', body: 'Before anyone lets software rebook trucks, replay the rule over past cancellations. The desk manager can approve a simulation period; live execution stays off. Next: open the Test lab and try your own case.' }
  ];

  let idx = 0; let active = false; let busy = false;
  let host = null; let ring = null;
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ idx: idx })); } catch (e) { /* storage blocked */ } }
  function load() { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && Number.isInteger(v.idx)) idx = Math.max(0, Math.min(STEPS.length - 1, v.idx)); } catch (e) { /* ignore */ } }
  function mount() { if (host) return; host = document.getElementById('tour'); ring = document.getElementById('tour-ring'); }
  const routeOf = (step) => (typeof step.route === 'function' ? step.route() : step.route);
  function targetEl(step) {
    const els = step.target ? Array.from(document.querySelectorAll(step.target)) : [];
    return els.find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) || null;
  }
  function place() {
    if (!active) return;
    const el = targetEl(STEPS[idx]);
    if (!el) { ring.hidden = true; return; }
    const r = el.getBoundingClientRect();
    ring.hidden = false;
    ring.style.top = (r.top - 6) + 'px'; ring.style.left = (r.left - 6) + 'px';
    ring.style.width = (r.width + 12) + 'px'; ring.style.height = Math.min(r.height + 12, window.innerHeight) + 'px';
  }
  function draw() {
    if (!active) { host.hidden = true; ring.hidden = true; return; }
    const step = STEPS[idx];
    let done = true; try { done = step.done ? step.done() : true; } catch (e) { done = false; }
    const last = idx === STEPS.length - 1;
    const primary = step.action && !done ? '<button type="button" class="btn primary" data-tour="do" id="tour-do">' + (busy ? '<span class="spinner" aria-hidden="true"></span><span>Working…</span>' : u.icon('play', 15) + '<span>Do it for me</span>') + '</button>' : last ? '<button type="button" class="btn primary" data-tour="finish">' + u.icon('check', 15) + '<span>Finish the tour</span></button>' : '<button type="button" class="btn primary" data-tour="next" id="tour-next"><span>Next</span>' + u.icon('arrow', 15) + '</button>';
    host.innerHTML = '<div class="tour-card" role="dialog" aria-modal="false" aria-labelledby="tour-t" aria-describedby="tour-b"><div class="tour-top"><span class="tour-step">Step ' + (idx + 1) + ' of ' + STEPS.length + '</span><button type="button" class="icon-btn" data-tour="close" aria-label="Close the tour">' + u.icon('x', 16) + '</button></div>' +
      '<div class="tour-prog" aria-hidden="true"><span style="width:' + (((idx + 1) / STEPS.length) * 100).toFixed(1) + '%"></span></div>' +
      '<h2 id="tour-t">' + u.esc(step.title) + '</h2><p id="tour-b">' + u.esc(step.body) + '</p>' +
      (step.action && done ? '<p class="tour-done">' + u.icon('check', 14) + ' Done. The change is saved and visible across screens.</p>' : '') +
      '<div class="tour-actions"><button type="button" class="btn ghost" data-tour="back"' + (idx === 0 ? ' disabled' : '') + '>' + u.icon('back', 15) + '<span>Back</span></button>' + (step.action && !done ? '<button type="button" class="btn ghost" data-tour="next">Skip</button>' : '') + primary + '</div></div>';
    host.hidden = false;
    place();
  }
  function stickyOffset() {
    let o = 0;
    const bar = document.getElementById('deskbar'); if (bar) o += bar.getBoundingClientRect().height;
    const tabs = document.querySelector('.stagetabs'); if (tabs) o += tabs.getBoundingClientRect().height;
    return o;
  }
  function scrollToTarget(step) {
    const el = targetEl(step); if (!el) return;
    const r = el.getBoundingClientRect();
    const top = window.scrollY + r.top; const off = stickyOffset(); const vh = window.innerHeight;
    const card = host && host.querySelector('.tour-card');
    const mobile = window.innerWidth < 960;
    const room = vh - off - (mobile && card ? card.getBoundingClientRect().height + 90 : 0);
    const y = r.height > room * 0.8 || mobile ? top - off - 14 : top - off - (room - r.height) / 2;
    window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
  }
  async function go(i) {
    idx = Math.max(0, Math.min(STEPS.length - 1, i)); save();
    const step = STEPS[idx];
    busy = true; draw();
    try { if (step.prep) await step.prep(); } catch (e) { console.error(e); }
    busy = false;
    const r = routeOf(step);
    if (location.hash !== r) { location.hash = r; await wait(60); } else TD.render({ nav: false });
    await wait(30);
    scrollToTarget(step);
    draw();
    place(); for (let k = 1; k <= 6; k++) setTimeout(place, k * 120);
    const f = host.querySelector('#tour-do, #tour-next, [data-tour="finish"]'); if (f) f.focus({ preventScroll: true });
  }
  async function doStep() {
    const step = STEPS[idx];
    if (!step.action || busy) return;
    busy = true; draw();
    try { await step.action(); } catch (e) { console.error(e); }
    busy = false;
    await wait(40);
    const r = routeOf(step);
    if (location.hash !== r) { location.hash = r; await wait(60); }
    TD.render();
    draw();
    const f = host.querySelector('#tour-next, [data-tour="finish"], #tour-do'); if (f) f.focus({ preventScroll: true });
  }
  function start() { mount(); const wasMid = idx > 0 && idx < STEPS.length - 1; active = true; go(wasMid ? idx : 0); }
  function stop(resetIdx) { active = false; if (resetIdx) { idx = 0; save(); } if (host) { host.hidden = true; ring.hidden = true; } }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tour]');
    if (!b || b.disabled) return;
    const k = b.getAttribute('data-tour');
    if (k === 'next') go(idx + 1);
    if (k === 'back') go(idx - 1);
    if (k === 'do') doStep();
    if (k === 'close') { stop(false); const t = document.getElementById('tour-start'); if (t) t.focus(); }
    if (k === 'finish') { stop(true); TD.ui.toast('Tour finished. The Test lab has scenarios, the clock and event injection for testing your own way.', 'ok'); }
  });
  document.addEventListener('keydown', (e) => { if (active && e.key === 'Escape' && !document.querySelector('dialog[open]')) stop(false); });
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, { passive: true });

  TD.tour = { start: start, stop: stop, steps: STEPS, refresh: function () { if (active && !busy) draw(); }, boot: function () { mount(); load(); }, isActive: () => active };
})();
