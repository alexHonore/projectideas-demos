/* TradeDesk V3 — state store, persistence, demo clock and actions.
   One state object, mutated only through TD.act.*; every change is saved under "commtrader-v3",
   written to one event log and re-rendered. External replies (carriers, facilities, accounting)
   are simulated and labelled. Every action works on any record: no hero special cases. */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});
  const D = TD.DATA; const u = TD.u; const E = TD.engine;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const DAY = 1440;
  const T = D.T;

  function seedEvents() {
    return [
      { at: T(0, 7, 41), who: 'TradeDesk intake', role: 'service', kind: 'doc', text: 'Carrier invoice F-10422 attached to LD-4072 (MSG-0880).', ref: 'LD-4072' },
      { at: T(0, 7, 58), who: 'TradeDesk intake', role: 'service', kind: 'doc', text: 'Receiving ticket R-55821 attached to LD-4072. Moisture 15.6% vs 15.0% max: discrepancy opened.', ref: 'LD-4072', notify: true },
      { at: T(0, 8, 52), who: 'TradeDesk intake', role: 'service', kind: 'cancel', text: 'Camionnage Lafrance cancelled LD-4093. Incident EX-0317 opened with prepared alternatives.', ref: 'EX-0317', notify: true },
      { at: T(0, 9, 5), who: 'Samuel Ouellet', role: 'logistics', kind: 'milestone', text: 'Logged LD-4091 departure from Saint-Ours (event 08:55, received 09:05).', ref: 'LD-4091' },
      { at: T(0, 9, 12), who: 'TradeDesk intake', role: 'service', kind: 'offer', text: 'Supply offer from Ferme Gendron et Fils received (MSG-0884). Duplicate forward merged by checksum.', ref: 'MSG-0884', notify: true }
    ].map((e, i) => Object.assign({ id: i + 1 }, e));
  }

  function initialState() {
    const trades = {};
    D.trades.forEach((t) => {
      const c = clone(t);
      trades[t.id] = Object.assign({ alloc: {}, scenario: { moisture: c.moisture, freightPct: 0 }, selected: null, supplierConfirmed: null, approvals: c.approval ? [{ version: c.approval.version, at: c.approval.at, by: c.approval.by, contribution: null }] : [], contracts: [], rfq: null, appts: null, freightManual: {}, downsideMoist: (D.parties[c.supplier] || {}).moistureDrift != null ? Math.max(0.5, D.parties[c.supplier].moistureDrift + 0.2) : 0.5 }, c);
    });
    const exceptions = {}; D.exceptions.forEach((x) => { exceptions[x.id] = Object.assign(clone(x), { events: [{ at: x.openedAt, text: 'Known: ' + x.cause }, { at: x.openedAt + 1, text: 'Suggested: alternatives ranked by contribution and cutoff risk.' }] }); });
    const loads = clone(D.loads);
    loads.forEach((l) => { if (['delivered', 'reconciled', 'settled'].includes(l.status) && l.deliveredAt == null) l.deliveredAt = l.etaAt; });
    return {
      app: 'commtrader-v3', v: D.version, now: D.startClock, role: 'trader',
      parties: clone(D.parties), lanes: {}, benchmarks: clone(D.benchmarks), demands: clone(D.demands), trades: trades,
      loads: loads, exceptions: exceptions, receivables: clone(D.receivables), ledger: clone(D.ledger),
      messages: clone(D.messages), extraction: {}, read: {}, msgState: {},
      events: seedEvents(), notifSeen: 0,
      counters: { trade: 2417, load: 4101, demand: 440, msg: 885, ex: 318, party: 1, fq: 1 }, fquotes: {},
      watch: {}, bol: {}, policy: { maxExtra: 100, minContrib: 8, minBuffer: 45, status: 'draft' },
      session: {}, paste: null, ui: { unit: 't', loadFilter: 'all', aiBusy: {} }
    };
  }

  let state = null;
  const listeners = [];
  const timers = [];
  const undoStack = [];

  function load() {
    let s = null;
    try { if (u.caps.storage) { const raw = window.localStorage.getItem(D.storageKey); if (raw) s = JSON.parse(raw); } } catch (e) { s = null; }
    if (!s || s.v !== D.version || s.app !== 'commtrader-v3') s = initialState();
    state = s;
    finishPending();
    return state;
  }
  function save() {
    if (!u.caps.storage) return false;
    try { window.localStorage.setItem(D.storageKey, JSON.stringify(state)); return true; } catch (e) { return false; }
  }
  function emit(info) { save(); listeners.forEach((fn) => { try { fn(info || {}); } catch (e) { console.error(e); } }); }
  function subscribe(fn) { listeners.push(fn); }
  function get() { return state; }

  const user = () => D.users[state.role];
  const auth = () => D.authority[state.role];
  function tick(min) { state.now += min || 0; }
  function log(text, ref, extra) {
    const id = (state.events.length ? state.events[state.events.length - 1].id : 0) + 1;
    const e = Object.assign({ id: id, at: state.now, who: user().name, role: state.role, kind: 'action', text: text, ref: ref || '' }, extra || {});
    state.events.push(e);
    return e;
  }
  const sys = (text, ref, kind, notify) => log(text, ref, { who: 'TradeDesk intake', role: 'service', kind: kind || 'system', notify: notify !== false });
  function fail(msg) { if (TD.ui) TD.ui.toast(msg, 'warn'); return false; }
  /* Capability toggle (Test lab): external requests need a connection; decisions already made are kept. */
  function offline(what) { if (!u.caps.offline) return false; fail('Offline (Test lab toggle): ' + what + ' needs a connection. Nothing was sent; your approvals are kept.'); return true; }
  function ok(msg) { if (TD.ui) TD.ui.toast(msg, 'ok'); }
  function later(ms, fn) { const id = setTimeout(() => { fn(); emit({ async: true }); }, ms * SPEED); timers.push(id); }
  const SPEED = /[?&]fast=1/.test(window.location.search) ? 0.05 : 1;
  function snapshotUndo(label) { undoStack.push({ label: label, json: JSON.stringify(state) }); if (undoStack.length > 8) undoStack.shift(); }
  function undo() {
    const last = undoStack.pop(); if (!last) return fail('Nothing to undo.');
    state = JSON.parse(last.json); emit(); ok('Undone: ' + last.label + '.'); return true;
  }
  const nextId = (k, prefix, pad) => prefix + String(state.counters[k]++).padStart(pad || 4, '0');

  /* Complete any simulated reply whose wait is over (also after reload or presets). */
  function finishPending(instant) {
    Object.values(state.trades).forEach((tr) => {
      if (tr.rfq && tr.rfq.pending && (instant || true)) receiveQuotes(tr.id);
      if (tr.rfq && tr.rfq.award && tr.rfq.award.state === 'tendered') acceptAward(tr.id);
      if (tr.appts && tr.appts.state === 'requested') confirmAppts(tr.id);
    });
    Object.values(state.exceptions).forEach((ex) => { if (ex.status === 'revalidating' || ex.status === 'awaiting') completeReplacement(ex.id); });
  }

  /* ---------------- Window and value helpers ---------------- */
  function dayOf(mon, d) { const m = { oct: 0, nov: 1, dec: 2 }[String(mon).slice(0, 3).toLowerCase()]; if (m == null) return null; return m === 0 ? d - 23 : m === 1 ? 8 + d : 38 + d; }
  function parseWindow(text) {
    if (!text) return null;
    const toks = [...String(text).matchAll(/(Oct|Nov|Dec)\w*\.?\s+(\d{1,2})/gi)];
    if (!toks.length) return null;
    const a = dayOf(toks[0][1], Number(toks[0][2]));
    let b = a;
    if (toks.length > 1) b = dayOf(toks[toks.length - 1][1], Number(toks[toks.length - 1][2]));
    else { const m = /[–-]\s*(\d{1,2})\b/.exec(text.slice(toks[0].index + toks[0][0].length)); if (m) b = dayOf(toks[0][1], Number(m[1])); }
    if (a == null || b == null) return null;
    return { start: a * DAY, end: b * DAY + 1439 };
  }

  /* Rule-parser output → editable values for the review UI (the live-AI path produces the same shape). */
  function valuesFromParse(parsed, msg) {
    const f = parsed.fields;
    const w = f.window && f.window.start != null ? { start: f.window.start, end: f.window.end } : f.window && f.window.value ? parseWindow(f.window.value) : null;
    const q = f.quantity || {};
    const v = {
      intent: f.intent ? f.intent.value : 'Unclear', commodity: f.commodity ? f.commodity.value : null,
      qtyValue: q.value != null ? q.value : null, qtyUnit: q.unit || null, payload: q.payload ? q.payload.value : null, payloadDerived: !!(q.payload && q.payload.derived), qtyTotal: q.total ? q.total.value : null,
      certainty: f.certainty && f.certainty.value === 'Tentative' ? 'tentative' : 'stated', tentativeWord: f.certainty && f.certainty.span ? (parsed.text || '').slice(f.certainty.span[0], f.certainty.span[1]) : null,
      moisture: f.moisture ? f.moisture.value : null, testWeight: f.testWeight ? f.testWeight.value : null, grade: f.grade ? f.grade.value : null,
      price: f.price ? f.price.value : null, priceUnit: f.price ? f.price.unit || 'CAD/t' : 'CAD/t', basis: f.basis ? f.basis.value : null,
      windowStart: w ? w.start : null, windowEnd: w ? w.end : null, origin: f.origin ? f.origin.value : null,
      party: msg && msg.party ? msg.party : null, priceType: f.price && f.price.priceType === 'basis' ? 'basis' : 'flat', month: f.price && f.price.month ? f.price.month : null, basisValue: f.price && f.price.basisValue != null ? f.price.basisValue : null, basisUnit: f.price && f.price.basisUnit ? f.price.basisUnit : null, basisUnitFrom: f.price && f.price.basisUnit ? 'message' : null,
      intentCandidates: f.intent && f.intent.candidates ? f.intent.candidates : null,
      validUntil: f.validity && f.validity.at != null ? f.validity.at : null, lang: (msg && msg.lang) || parsed.lang || null,
      sender: f.sender ? { person: f.sender.person, company: f.sender.company } : null, partySuggest: null,
      destination: f.destination ? f.destination.value : null, site: null, loadRef: f.loadRef ? f.loadRef.value : null,
      basisOptions: f.basisOptions ? f.basisOptions.options.map((o) => ({ basis: o.basis, town: o.town, price: o.price })) : null, email: f.email ? f.email.value : null
    };
    if (v.intent === 'Carrier reschedule' && f.reschedule) {
      const r = f.reschedule;
      Object.assign(v, { rsFromDay: r.from.day, rsFromMins: r.from.mins, rsFrom: r.from.day != null ? r.from.day * DAY + (r.from.mins != null ? r.from.mins : 0) : null, rsToDay: r.to.day, rsToTimeStated: !!r.to.timeStated,
        rsTo: r.to.day != null ? r.to.day * DAY + (r.to.mins != null ? r.to.mins : r.from.mins != null ? r.from.mins : 420) : null, rsSiteText: r.siteText, sameRate: r.sameRate, rsReason: r.reason });
    }
    if (v.intent === 'Freight quote' || v.intent === 'Carrier decline') {
      const ln = f.lane || {}; const pk = f.pickup || {}; const rt = f.rate || {}; const fs = f.fsc || {}; const eq = f.equipment || {};
      Object.assign(v, { laneFrom: ln.from || null, laneTo: ln.to || null, pickupAt: pk.at != null ? pk.at : null, pickupTimeStated: !!pk.timeStated, equipment: eq.value || null, equipmentBtrain: !!eq.btrain, rate: rt.value != null ? rt.value : null, rateBasis: rt.basis || 't', fsc: fs.value != null ? fs.value : null, fscIncluded: !!fs.included });
    }
    if (v.intent === 'Carrier update') Object.assign(v, { eta: f.eta ? f.eta.at : null, etaPrev: f.etaPrev ? f.etaPrev.at : null, delay: f.delay ? f.delay.value : null, departure: f.departure ? f.departure.at : null });
    if (v.qtyUnit === 'loads' && msg && msg.payloadHint) v.payloadHint = msg.payloadHint;
    if (msg && msg.kind === 'Revision') v.intent = 'Revision';
    if (msg && msg.kind === 'Buyer demand' && v.intent === 'Unclear') v.intent = 'Buyer demand';
    return v;
  }

  /* ---------------- Inbox and extraction (CT-02) ---------------- */
  function openMessage(id) {
    if (!state.read[id]) state.read[id] = true;
    const m = state.messages.find((x) => x.id === id);
    if (m && /Supply offer/.test(m.kind) && !state.session.offerOpenedAt) state.session.offerOpenedAt = Date.now();
    if (m && isExtractable(m) && !state.extraction[id]) runRules(id, m.body, m);
    save();
  }
  function isExtractable(m) { return ['Supply offer', 'Buyer demand', 'Revision', 'Bid revision', 'Freight quote'].includes(m.kind) && m.status !== 'processed'; }
  /* A bid's destination town against the buyer's delivery sites on file. */
  function resolveSite(v) {
    if (v.intent !== 'Buyer demand') return;
    const p = state.parties[v.party];
    if (!p) { v.site = null; return; }
    const sites = E.sitesOf(p);
    if (!v.destination) { const mn = sites.find((x) => x.main) || sites[0]; v.site = mn ? mn.id : null; v.destDefault = true; return; }
    const hit = sites.find((x) => x.town === v.destination);
    v.site = hit ? hit.id : null; v.destDefault = false;
  }
  /* Basis units: as stated, else the buyer's convention on file, else left to confirm. */
  function resolveBasisUnit(v) {
    if (v.priceType !== 'basis' || v.basisUnitFrom === 'message' || v.basisUnitFrom === 'you') return;
    const conv = (state.parties[v.party] || {}).basisConvention;
    v.basisUnit = conv || null; v.basisUnitFrom = conv ? 'convention' : null;
  }
  function finishValues(parsed, values, text) { matchParty(parsed, values, text); resolveSite(values); resolveBasisUnit(values); resolveReschedule(values); }
  /* The counterparty's role decides the side: read once, find who wrote it in the records (any role, no town-only
     guesses), then read again with that role as evidence. */
  function roleFor(text, parsed, msg) {
    if (msg && msg.party && state.parties[msg.party]) return state.parties[msg.party].kind;
    const g = guessParty(text, null, parsed.fields.sender || null, parsed.fields.email);
    return g && g.strength === 'strong' ? state.parties[g.id].kind : null;
  }
  function parseWithRole(text, ref, msg) {
    let parsed = TD.parser.parse(text, ref);
    const role = roleFor(text, parsed, msg);
    if (role) parsed = TD.parser.parse(text, ref, { role: role });
    parsed.role = role;
    domainFlag(parsed);
    return parsed;
  }
  function runRules(key, text, msg, notice) {
    const parsed = parseWithRole(text, msg && msg.at != null ? msg.at : state.now, msg);
    parsed.text = text;
    const values = valuesFromParse(parsed, msg);
    finishValues(parsed, values, text);
    state.extraction[key] = { source: 'rules', provenance: { source: 'rules' }, notice: notice || null, parsed: parsed, values: values, accepted: {}, edited: {}, created: null, msg: msg ? msg.id : null };
    return state.extraction[key];
  }
  /* Apply a live-AI (or any structured) extraction produced outside the store. */
  function setExtraction(key, ex) { state.extraction[key] = ex; emit({ soft: true }); }
  const REQUIRED_OFFER = ['party', 'commodity', 'quantity', 'price', 'origin', 'window'];
  const REVIEW_FREIGHT = ['intent', 'party', 'lane', 'pickup', 'rate'];
  function freightMissing(v) {
    const miss = [];
    if (!v.party) miss.push('carrier');
    if (!v.laneFrom || !v.laneTo) miss.push('lane (pickup and delivery towns)');
    if (v.pickupAt == null) miss.push('pickup date');
    if (v.rate == null || !(v.rate > 0)) miss.push('rate');
    return miss;
  }
  const REQUIRED_BID = ['party', 'commodity', 'quantity', 'price', 'window'];
  function extractionMissing(ex) {
    const v = ex.values;
    const intent = v.intent;
    if (intent === 'Revision') return [];
    if (intent === 'Freight quote') return freightMissing(v);
    if (intent !== 'Supply offer' && intent !== 'Buyer demand') return ['intent (supply offer, buyer demand or freight quote)'];
    const req = intent === 'Buyer demand' ? REQUIRED_BID : REQUIRED_OFFER;
    const miss = [];
    req.forEach((k) => {
      if (k === 'party' && !v.party) miss.push('counterparty');
      if (k === 'commodity' && !v.commodity) miss.push('commodity');
      if (k === 'quantity' && (v.qtyValue == null || (v.qtyUnit === 'loads' && !v.payload) || v.qtyUnit === 'bu')) miss.push(v.qtyUnit === 'loads' && !v.payload ? 'payload per load' : v.qtyUnit === 'bu' ? 'tonnes (bushels need conversion)' : 'quantity');
      if (k === 'price' && (v.priceType === 'basis' ? v.basisValue == null || !v.month : v.price == null || v.priceUnit !== 'CAD/t')) miss.push(v.priceUnit && v.priceUnit !== 'CAD/t' ? 'price in CAD/t (convert explicitly)' : 'price');
      if (k === 'price' && v.priceType === 'basis' && v.basisValue != null && !v.basisUnit) miss.push('basis units (CAD/t or US¢/bu)');
      if (k === 'origin' && !v.origin) miss.push('origin');
      if (k === 'window' && (v.windowStart == null || v.windowEnd == null)) miss.push('window');
    });
    return miss;
  }
  const REVIEW_OFFER = ['intent', 'party', 'commodity', 'quantity', 'certainty', 'price', 'window', 'origin'];
  const REVIEW_BID = ['intent', 'party', 'commodity', 'quantity', 'price', 'window', 'destination'];
  function extractionReady(key) {
    const ex = state.extraction[key]; if (!ex) return { ready: false, missing: ['extraction'], unreviewed: [] };
    const v = ex.values;
    const missing = extractionMissing(ex);
    const rows = v.intent === 'Buyer demand' ? REVIEW_BID : v.intent === 'Freight quote' ? REVIEW_FREIGHT : v.intent === 'Revision' ? [] : REVIEW_OFFER;
    const unreviewed = rows.filter((k) => !ex.accepted[k]);
    const flagged = !!(ex.parsed && ex.parsed.flags && ex.parsed.flags.length);
    return { ready: !missing.length && !unreviewed.length && !flagged, missing: missing, unreviewed: unreviewed, flagged: flagged, rows: rows };
  }
  function setValue(key, field, value) {
    const ex = state.extraction[key]; if (!ex) return false;
    ex.values[field] = value; ex.edited[field] = true;
    if (field === 'payload') ex.values.payloadDerived = false;
    if (field === 'equipment') ex.values.equipmentBtrain = /b-train/i.test(value || '');
    if (field === 'basisUnit') ex.values.basisUnitFrom = value ? 'you' : null;
    if (field === 'rsLoad') { ex.values.rsLoadChosen = value || null; resolveReschedule(ex.values); }
    if (field === 'rsTo') { ex.values.rsToDay = value != null ? Math.floor(value / DAY) : null; ex.values.rsToTimeStated = true; const l = E.load(state, ex.values.rsLoad); ex.values.rsImpact = l && value != null ? E.rescheduleImpact(state, l, value) : null; }
    if (field === 'party' || field === 'destination' || field === 'intent') { resolveSite(ex.values); resolveBasisUnit(ex.values); }
    const fr = ex.values.intent === 'Freight quote';
    const row = { rsLoad: 'rsLoad', rsTo: 'rsTo', qtyValue: fr ? 'payload' : 'quantity', qtyUnit: 'quantity', payload: fr ? 'payload' : 'quantity', price: 'price', priceUnit: 'price', priceType: 'price', month: 'price', basisValue: 'price', basisUnit: 'price', windowStart: 'window', windowEnd: 'window', validUntil: 'validity', laneFrom: 'lane', laneTo: 'lane', pickupAt: 'pickup', rate: 'rate', rateBasis: 'rate', fsc: 'rate' }[field] || field;
    ex.accepted[row] = true;
    emit({ soft: true });
    return true;
  }
  function acceptField(key, field) { const ex = state.extraction[key]; if (!ex) return false; ex.accepted[field] = true; emit({ soft: true }); return true; }
  function acceptAll(key) {
    const ex = state.extraction[key]; if (!ex) return false;
    const v = ex.values; const m = state.messages.find((x) => x.id === ex.msg);
    if (v.intent === 'Freight quote') {
      ['intent', 'party', 'lane', 'pickup', 'rate', 'equipment', 'payload', 'validity'].forEach((k) => { ex.accepted[k] = true; });
      log('Reviewed carrier quote in ' + (ex.msg || 'pasted text') + ': fields accepted.', ex.msg || key);
      emit(); return true;
    }
    if (v.qtyUnit === 'loads' && !v.payload) v.payload = v.payloadHint || 38.5;
    if (!v.origin && m && m.originHint) v.origin = m.originHint.town;
    if (!v.origin && v.party && state.parties[v.party] && state.parties[v.party].kind === 'Supplier') v.origin = state.parties[v.party].town;
    ['intent', 'party', 'commodity', 'quantity', 'certainty', 'moisture', 'price', 'window', 'origin', 'basis'].concat(v.intent === 'Buyer demand' ? ['destination'] : []).forEach((k) => { ex.accepted[k] = true; });
    log('Reviewed extraction of ' + (ex.msg || 'pasted text') + ': fields accepted' + (v.payload ? ', quantity converted at ' + v.payload + ' t per load' : '') + (v.origin ? ', origin ' + v.origin : '') + '.', ex.msg || key);
    emit();
    return true;
  }

  /* US cents per bushel to CAD/t, at the USD/CAD benchmark and the commodity's bushels per tonne. */
  function basisToCad(cents, commodity) { const c = D.commodities[commodity] || D.commodities.corn; const fx = (state.benchmarks.USDCAD || {}).value || 1.385; return u.r2((cents / 100) * fx * u.buPerT(c.lbPerBu)); }
  function createFromExtraction(key) {
    const ex = state.extraction[key]; if (!ex) return null;
    if (ex.created) return ex.created;
    const rd = extractionReady(key);
    if (rd.flagged) { fail('Flagged content cannot create records. It is treated as content only.'); return null; }
    if (rd.missing.length) { fail('Complete the extraction first: ' + rd.missing.join(', ') + '.'); return null; }
    if (rd.unreviewed.length) { fail('Review every field first: ' + rd.unreviewed.join(', ') + '.'); return null; }
    const v = ex.values;
    let id;
    if (v.intent === 'Freight quote') {
      id = createFq(v, ex);
      if (!id) return null;
      ex.created = id;
      const target = ex.target != null ? ex.target : (E.freightCandidates(state, state.fquotes[id]).find((c) => c.fit === 'match') || {}).id || 'lane';
      attachFq(id, target, true);
      const m0 = state.messages.find((x) => x.id === ex.msg);
      if (m0) { m0.status = 'linked'; m0.link = { type: 'fq', id: id, label: 'Carrier quote ' + id + ' ' + fqWhere(state.fquotes[id]) }; }
      emit();
      return id;
    }
    const basisCad = v.priceType === 'basis' && v.basisValue != null ? (v.basisUnit === 'USc/bu' ? basisToCad(v.basisValue, v.commodity) : v.basisValue) : null;
    if (v.intent === 'Buyer demand') id = createDemand({ buyer: v.party, commodity: v.commodity, grade: v.grade, site: v.site, destTown: v.site ? null : v.destination, qty: v.qtyUnit === 'loads' ? u.r2(v.qtyValue * v.payload) : v.qtyValue, tolPct: 5, priceType: v.priceType, price: v.price, basis: basisCad, basisQuoted: v.priceType === 'basis' ? { value: v.basisValue, unit: v.basisUnit, from: v.basisUnitFrom } : null, month: v.month, windowStart: v.windowStart, windowEnd: v.windowEnd, validUntil: v.validUntil != null && v.validUntil > state.now ? v.validUntil : state.now + DAY, source: ex.msg || 'Pasted text' }, true);
    else id = createTrade({ supplier: v.party, commodity: v.commodity, qtyLoads: v.qtyUnit === 'loads' ? v.qtyValue : Math.max(1, Math.round(v.qtyValue / (v.payload || 38.5))), payload: v.qtyUnit === 'loads' ? v.payload : u.r2(v.qtyValue / Math.max(1, Math.round(v.qtyValue / (v.payload || 38.5)))), price: v.price, moisture: v.moisture, moistureSource: v.moisture != null ? 'Supplier statement in message' + (ex.source === 'live-ai' ? ' (read by live AI)' : '') : null, testWeight: v.testWeight, grade: v.grade, origin: v.origin, windowStart: v.windowStart, windowEnd: v.windowEnd, certainty: v.certainty === 'tentative' ? 'tentative' : 'stated', tentativeWord: v.tentativeWord, validUntil: v.validUntil, payloadDerived: v.payloadDerived, deliveredOption: (v.basisOptions || []).filter((o) => o.basis === 'Delivered').map((o) => ({ town: o.town, price: o.price != null ? o.price : v.price }))[0] || null, source: ex.msg || 'Pasted text', sourceText: ex.parsed ? ex.parsed.text : null, extractionSource: ex.source }, true);
    if (!id) return null;
    ex.created = id;
    const m = state.messages.find((x) => x.id === ex.msg);
    if (m) { m.status = 'linked'; m.link = { type: v.intent === 'Buyer demand' ? 'demand' : 'trade', id: id, label: (v.intent === 'Buyer demand' ? 'Created bid ' : 'Created lot and opportunity ') + id }; }
    emit();
    return id;
  }

  /* ---------------- Trades: create, edit, cancel ---------------- */
  function suggestAlloc(tr) {
    const rows = E.comparison(state, tr, { moisture: tr.moisture, freightPct: 0 })
      .filter((r) => (r.compat === 'pass' || r.compat === 'discount') && r.contribution != null && r.contribution >= D.authority.trader.minContribution && !r.priceStale)
      .sort((a, b) => b.contribution - a.contribution);
    const alloc = {}; let left = tr.qtyLoads || 0;
    rows.forEach((r) => { if (left <= 0) return; const n = Math.min(left, E.maxLoadsFor(state, tr, r.dem)); if (n > 0) { alloc[r.demand] = n; left -= n; } });
    return alloc;
  }
  function createTrade(v, silent) {
    const qtyLoads = Math.max(0, Math.round(Number(v.qtyLoads) || 0));
    if (!D.commodities[v.commodity]) { fail('Choose a commodity.'); return null; }
    if (!(qtyLoads >= 1 && qtyLoads <= 60)) { fail('Loads must be between 1 and 60.'); return null; }
    if (v.payload != null && !(Number(v.payload) >= 20 && Number(v.payload) <= 45)) { fail('Tonnes per load must be between 20 and 45.'); return null; }
    if (v.price != null && v.price !== '' && !(Number(v.price) > 0 && Number(v.price) < 2000)) { fail('Enter a purchase price in CAD/t.'); return null; }
    if (v.supplier && !state.parties[v.supplier]) { fail('Unknown supplier.'); return null; }
    if (v.windowStart != null && v.windowEnd != null && v.windowEnd < v.windowStart) { fail('The pickup window ends before it starts.'); return null; }
    const id = 'TR-' + state.counters.trade++;
    const tr = { id: id, commodity: v.commodity, supplier: v.supplier || null, origin: v.origin || null, source: v.source || 'Manual entry', sourceText: v.sourceText || null, extractionSource: v.extractionSource || null,
      qtyLoads: qtyLoads, payload: Number(v.payload) || 38.5, price: v.price != null && v.price !== '' ? Number(v.price) : null, moisture: v.moisture != null && v.moisture !== '' ? Number(v.moisture) : null,
      moistureSource: v.moistureSource || (v.moisture != null ? 'Supplier statement' : null), testWeight: v.testWeight ? Number(v.testWeight) : null, grade: v.grade || null,
      windowStart: v.windowStart, windowEnd: v.windowEnd, validUntil: v.validUntil != null ? v.validUntil : null, payloadDerived: !!v.payloadDerived, deliveredOption: v.deliveredOption || null, certainty: v.certainty || 'stated', tentativeWord: v.tentativeWord || null, downsideMoist: (state.parties[v.supplier] || {}).moistureDrift ? Math.max(0.5, state.parties[v.supplier].moistureDrift + 0.2) : 0.5,
      status: 'open', alloc: {}, scenario: { moisture: v.moisture != null ? Number(v.moisture) : null, freightPct: 0 }, selected: null, supplierConfirmed: null, approval: null, approvals: [], contracts: [], rfq: null, appts: null, freightManual: {}, createdAt: state.now, isNew: true };
    state.trades[id] = tr;
    tr.alloc = suggestAlloc(tr);
    log('Created ' + (tr.certainty === 'tentative' ? 'tentative ' : '') + 'lot and opportunity ' + id + ': ' + qtyLoads + ' loads of ' + (D.commodities[tr.commodity] || {}).label + ' from ' + ((state.parties[tr.supplier] || {}).name || 'an unidentified supplier') + (tr.validUntil != null ? ', price firm until ' + u.when(tr.validUntil, state.now) : '') + '. Not firm inventory until approved.', id);
    if (!silent) emit();
    return id;
  }
  function locked(tr) { return !!(tr.rfq && tr.rfq.award) || E.loadsOf(state, tr.id).length > 0; }
  /* scope 'alloc': only the sales changed, so the purchase confirmation stands. */
  function invalidate(tr, reason, scope) {
    if (tr.approval && tr.approval.valid) {
      tr.approval.valid = false; tr.approval.invalidReason = reason; tr.approval.invalidAt = state.now;
      Object.keys(tr.approval.snapshot.alloc).forEach((demId) => {
        const tonnes = state.ledger.filter((e) => e.trade === tr.id && e.demand === demId).reduce((a, e) => a + e.tonnes, 0);
        if (Math.abs(tonnes) > 1e-6) state.ledger.push({ at: state.now, trade: tr.id, demand: demId, tonnes: -u.r2(tonnes), kind: 'reversal', by: user().name, note: 'Reversed: ' + reason });
      });
      tr.contracts.forEach((c) => { if (c.state === 'Cancelled' || c.state === 'Superseded') return; if (scope === 'alloc' && c.party === tr.supplier) return; c.state = 'Superseded'; });
      if (tr.rfq && !tr.rfq.award) tr.rfq = null;
      if (tr.appts && tr.appts.state !== 'confirmed') tr.appts = null;
      log('Approval v' + tr.approval.version + ' of ' + tr.id + ' invalidated: ' + reason + '. Reservations reversed; history kept.', tr.id, { notify: true, kind: 'invalid' });
    }
  }
  function updateTrade(id, patch) {
    const tr = state.trades[id]; if (!tr) return false;
    if (tr.status === 'cancelled') return fail(id + ' is cancelled.');
    const COMMERCIAL = ['qtyLoads', 'payload', 'price', 'supplier', 'origin', 'commodity', 'windowStart', 'windowEnd'];
    if (locked(tr) && COMMERCIAL.some((k) => k in patch && patch[k] !== tr[k])) return fail('Freight is awarded on ' + id + ': quantity, price, origin and window are locked. Cancel the booked loads, or open a new trade for the difference.');
    if (patch.qtyLoads != null && !(patch.qtyLoads >= 1 && patch.qtyLoads <= 60)) return fail('Loads must be between 1 and 60.');
    if (patch.price != null && !(patch.price > 0 && patch.price < 2000)) return fail('Enter a purchase price in CAD/t.');
    if (patch.moisture != null && !(patch.moisture >= 5 && patch.moisture <= 35)) return fail('Moisture must be between 5% and 35%.');
    if (patch.windowStart != null && patch.windowEnd != null && patch.windowEnd < patch.windowStart) return fail('The pickup window ends before it starts.');
    snapshotUndo('edit ' + id);
    const changed = [];
    Object.keys(patch).forEach((k) => { if (patch[k] !== tr[k]) { changed.push(k + ' ' + fmtVal(k, tr[k]) + ' → ' + fmtVal(k, patch[k])); tr[k] = patch[k]; } });
    if (!changed.length) return true;
    if ('moisture' in patch) tr.scenario.moisture = tr.moisture;
    const n = Object.values(tr.alloc).reduce((a, b) => a + b, 0);
    if (n > tr.qtyLoads) { let over = n - tr.qtyLoads; Object.keys(tr.alloc).sort((a, b) => tr.alloc[a] - tr.alloc[b]).forEach((k) => { const cut = Math.min(over, tr.alloc[k]); tr.alloc[k] -= cut; over -= cut; if (!tr.alloc[k]) delete tr.alloc[k]; }); }
    const commercial = Object.keys(patch).some((k) => COMMERCIAL.includes(k) || k === 'moisture' || k === 'testWeight');
    if (tr.approval && tr.approval.valid && commercial && !locked(tr)) invalidate(tr, 'lot edited (' + changed.join('; ') + ')');
    if (patch.windowEnd && tr.status === 'expired' && tr.expiredReason !== 'offer' && patch.windowEnd > state.now) { tr.status = tr.approval ? 'approved' : 'open'; tr.expiredReason = null; }
    if ('validUntil' in patch && tr.status === 'expired' && tr.expiredReason === 'offer' && (patch.validUntil == null || patch.validUntil > state.now)) { tr.status = 'open'; tr.expiredReason = null; }
    if (('qtyLoads' in patch || 'price' in patch) && tr.supplierConfirmed && !tr.approval) { tr.supplierConfirmed = null; tr.certainty = 'stated'; }
    log('Edited ' + id + ': ' + changed.join('; ') + '.', id);
    emit();
    return true;
  }
  function fmtVal(k, v) { if (v == null) return '—'; if (k === 'windowStart' || k === 'windowEnd') return u.dayShort(v); if (k === 'validUntil') return u.when(v, state.now); if (k === 'supplier') return (state.parties[v] || {}).short || (state.parties[v] || {}).name || v; return String(v); }
  function cancelTrade(id) {
    const tr = state.trades[id]; if (!tr) return false;
    const ls = E.loadsOf(state, id);
    if (ls.some((l) => !['booked'].includes(l.status))) return fail('Loads on ' + id + ' are already loading or moving. Cancel the remaining booked loads individually.');
    snapshotUndo('cancel ' + id);
    ls.forEach((l) => cancelLoadInternal(l, 'trade cancelled'));
    invalidate(tr, 'trade cancelled');
    tr.status = 'cancelled'; tr.alloc = {};
    tr.contracts.forEach((c) => { c.state = 'Cancelled'; });
    log('Cancelled ' + id + '. Allocations reversed, booked loads released, confirmations marked cancelled (send cancellation notices from your email).', id, { notify: true, kind: 'cancel' });
    emit();
    return true;
  }

  /* ---------------- Pricing and allocation (CT-07, CT-08, CT-04) ---------------- */
  function setScenario(tid, patch) {
    const tr = state.trades[tid]; tr.scenario = Object.assign({}, tr.scenario, patch);
    if (!state.session.comparedAt && state.session.offerOpenedAt) state.session.comparedAt = Date.now();
    emit({ soft: true });
  }
  function selectDemand(tid, demId) { state.trades[tid].selected = demId; emit({ soft: true }); }
  function setUnit(un) { state.ui.unit = un; emit({ soft: true }); }
  function setAlloc(tid, demId, n) {
    const tr = state.trades[tid];
    if (locked(tr)) return fail('Freight is awarded or loads exist on approval v' + tr.approval.version + '. The plan is locked; edit the lot or cancel loads to change it.');
    const dem = E.demand(state, demId);
    const max = E.maxLoadsFor(state, tr, dem);
    const cur = tr.alloc[demId] || 0;
    const others = Object.keys(tr.alloc).reduce((s, k) => s + (k === demId ? 0 : tr.alloc[k]), 0);
    if (n < 0) n = 0;
    if (n > cur && n > max) { const o = E.demandOpen(state, dem, tr.id); return fail('Blocked: ' + E.party(state, dem.buyer).short + ' has ' + u.t1(o.open) + ' t open on ' + dem.id + ' (' + u.t1(o.maxOpen) + ' t with tolerance). ' + n + ' loads would be ' + u.t1(n * tr.payload) + ' t.'); }
    if (n + others > tr.qtyLoads) return fail('Blocked: the lot has ' + tr.qtyLoads + ' loads. ' + (n + others) + ' would double-allocate supply.');
    if (n === cur) return true;
    if (n) tr.alloc[demId] = n; else delete tr.alloc[demId];
    invalidate(tr, 'allocation changed (' + E.party(state, dem.buyer).short + ' ' + cur + ' → ' + n + ' loads)', 'alloc');
    emit();
    return true;
  }
  function setFreightManual(tid, demId, rate) {
    const tr = state.trades[tid]; const v = Number(rate);
    if (!(v > 0 && v < 200)) return fail('Enter a freight rate between 0 and 200 CAD/t.');
    tr.freightManual = tr.freightManual || {}; tr.freightManual[demId] = u.r2(v);
    invalidate(tr, 'indicative freight entered for ' + demId, 'alloc');
    log('Entered indicative freight CAD ' + u.rate(v) + '/t for ' + tr.id + ' → ' + demId + ' (desk estimate, not a quote).', tid);
    emit();
    return true;
  }
  function confirmSupplier(tid, note) {
    const tr = state.trades[tid];
    const lapsed = tr.validUntil != null && state.now > tr.validUntil && !(tr.approval && tr.approval.valid);
    if (tr.supplierConfirmed && tr.certainty !== 'tentative' && !lapsed) return true;
    tick(4);
    if (lapsed) {
      tr.validUntil = null; if (tr.status === 'expired' && tr.expiredReason === 'offer') { tr.status = 'open'; tr.expiredReason = null; }
      log('Re-confirmed the price with ' + ((state.parties[tr.supplier] || {}).contact || 'the supplier') + ' after the offer lapsed on ' + tid + '.', tid);
    }
    const sup = state.parties[tr.supplier] || { contact: 'the supplier' };
    tr.supplierConfirmed = { at: state.now, by: user().name, note: note || (sup.contact + ' confirmed ' + tr.qtyLoads + ' loads, pickup ' + tr.origin + ', ' + u.dayShort(tr.windowStart) + '–' + u.dayShort(tr.windowEnd) + ', CAD ' + u.rate(tr.price) + '/t.') };
    tr.certainty = 'confirmed';
    log('Logged confirmation call with ' + sup.contact + ' for ' + tid + ': ' + tr.qtyLoads + ' loads confirmed. Lot now supplier-confirmed.', tid);
    emit();
    return true;
  }
  function approveTrade(tid) {
    const tr = state.trades[tid];
    const res = E.approvalChecks(state, tr, state.role);
    if (res.blocked) { const b = res.checks.find((c) => c.block); return fail('Approval blocked: ' + b.text); }
    const plan = res.plan;
    const prevVersion = tr.approvals && tr.approvals.length ? tr.approvals[tr.approvals.length - 1].version : tr.approval ? tr.approval.version : 0;
    const version = prevVersion + 1;
    const rates = {}; plan.per.forEach((p) => { rates[p.demand] = Object.assign({}, p.rates, { dem: undefined, lane: undefined }); });
    tick(2);
    const month = (D.commodities[tr.commodity] || {}).futures;
    const f = month ? E.futuresCad(state, month) : null;
    // A purchase that was already approved keeps its price; the new version adds or changes sales.
    tr.approval = { version: version, at: state.now, by: user().name, role: state.role, valid: true, futuresCad: tr.approval && tr.approval.futuresCad != null ? tr.approval.futuresCad : f ? f.value : null, snapshot: { alloc: clone(tr.alloc), rates: clone(rates), contribution: plan.contribution, tonnes: plan.tonnes, perTonne: plan.perTonne } };
    tr.approvals = (tr.approvals || []).concat([{ version: version, at: state.now, by: user().name, contribution: plan.contribution }]);
    tr.status = 'approved';
    plan.per.forEach((p) => { state.ledger.push({ at: state.now, trade: tr.id, demand: p.demand, tonnes: p.tonnes, kind: 'reserve', by: user().name, note: p.loads + ' loads to ' + p.rates.name }); });
    const num = tr.id.slice(3);
    const sfx = version > 1 ? '-v' + version : '';
    tr.contracts = tr.contracts || [];
    const livePc = tr.contracts.some((c) => c.party === tr.supplier && c.state !== 'Superseded' && c.state !== 'Cancelled');
    if (!livePc) tr.contracts.push({ id: 'PC-' + num + sfx, kind: version > 1 ? 'Purchase amendment' : 'Purchase confirmation', party: tr.supplier, lang: (state.parties[tr.supplier] || {}).lang || 'fr', state: 'Approved', version: version });
    plan.per.forEach((p) => { const dm = E.demand(state, p.demand); tr.contracts.push({ id: (dm.contract ? dm.contract + '-' + num : 'SC-' + p.demand.slice(4) + '-' + num) + sfx, kind: dm.contract ? 'Call-off notice under ' + dm.contract : 'Sale confirmation', party: dm.buyer, lang: (state.parties[dm.buyer] || {}).lang || 'fr', state: 'Approved', version: version, demand: p.demand }); });
    tr.certainty = 'contracted';
    log('Approved v' + version + ' of ' + tid + ': buy ' + u.t1(tr.qtyLoads * tr.payload) + ' t at CAD ' + u.rate(tr.price) + '/t' + (plan.per.length ? '; sell ' + plan.per.map((p) => u.t1(p.tonnes) + ' t to ' + p.rates.name).join(' and ') : '; no sale yet') + '. Expected contribution ' + u.cad(plan.contribution || 0) + '.', tid);
    if (plan.per.length) log('Handoff to logistics: tender freight and book appointments for ' + tid + ' (' + plan.loads + ' loads).', tid, { kind: 'handoff', notify: true });
    emit();
    ok('Approved v' + version + '. Quantities reserved; confirmations drafted, not sent.');
    return true;
  }
  function revisePlan(tid) {
    const tr = state.trades[tid];
    if (locked(tr)) return fail('Freight is awarded or loads exist. The approved plan is locked.');
    invalidate(tr, 'plan reopened for revision by ' + user().name, 'alloc');
    emit();
    return true;
  }
  function sendConfirmations(tid) {
    const tr = state.trades[tid];
    if (offline('marking confirmations as sent')) return false;
    if (!tr.approval || !tr.approval.valid) return fail('Approve the current plan first.');
    tick(2);
    tr.contracts.forEach((c) => { if (c.state === 'Approved') { c.state = 'Sent'; c.sentAt = state.now; c.ackDueAt = state.now + 120; } });
    log('Marked confirmations for ' + tid + ' as sent (simulated: no email left this browser). Acknowledgements pending.', tid);
    emit(); ok('Marked as sent. This demo does not send email; acknowledgements stay pending.');
    return true;
  }

  /* ---------------- Carrier quotes from messages (FQ-…) ----------------
     A quote read from an email is a record: carrier, lane, pickup, equipment, payload, rate and basis, fuel, validity.
     It attaches to the lot or load that needs freight on that lane and day, or stands on the lane until it lapses. */
  function laneKm(from, to) {
    const b = E.buyerAt(state, to)[0];
    if (!b) return null;
    const ln = E.laneFor(state, from, { buyer: b.buyer, site: b.main ? null : b.site });
    return ln ? ln.km : null;
  }
  function fqWhere(fq) {
    const a = fq.attached || [];
    if (!a.length) return fq.status === 'standing' ? 'kept as a standing quote on ' + fq.from + ' → ' + fq.to : 'recorded';
    const t = a[a.length - 1];
    return t.type === 'load' ? 'added to the replacement options for ' + t.load : 'added to the ' + (t.approved ? 'freight comparison' : 'price ladder') + ' of ' + t.trade + ' (' + t.demand + ')';
  }
  function createFq(v, ex) {
    if (!v.party || !state.parties[v.party] || state.parties[v.party].kind !== 'Carrier') { fail('Choose the carrier.'); return null; }
    const id = 'FQ-' + String(state.counters.fq++).padStart(4, '0');
    const fq = { id: id, carrier: v.party, from: v.laneFrom, to: v.laneTo, pickupAt: v.pickupAt, pickupTimeStated: !!v.pickupTimeStated || !!ex.edited.pickupAt, equipment: v.equipment || null, equipmentBtrain: !!v.equipmentBtrain, payload: v.payload != null ? Number(v.payload) : null, loads: v.qtyValue != null ? Number(v.qtyValue) : null,
      rate: Number(v.rate), rateBasis: v.rateBasis || 't', fsc: v.fsc != null ? Number(v.fsc) : 0, fscIncluded: !!v.fscIncluded, km: laneKm(v.laneFrom, v.laneTo), validUntil: v.validUntil != null ? v.validUntil : null,
      receivedAt: (state.messages.find((x) => x.id === ex.msg) || {}).at != null ? state.messages.find((x) => x.id === ex.msg).at : state.now, source: ex.msg || 'Pasted text', sourceText: ex.parsed ? ex.parsed.text : null, lang: v.lang || 'fr', status: 'standing', attached: [], createdBy: user().name, createdAt: state.now };
    state.fquotes[id] = fq;
    const c = state.parties[fq.carrier];
    log('Recorded carrier quote ' + id + ' from ' + c.name + ': ' + fq.from + ' → ' + fq.to + ', pickup ' + (fq.pickupAt != null ? u.when(fq.pickupAt, state.now) : 'not stated') + ', ' + E.fqBasisLabel(fq) + (fq.equipment ? ', ' + fq.equipment : '') + (fq.payload ? ' ' + fq.payload + ' t' : '') + (fq.validUntil != null ? ', valid until ' + u.when(fq.validUntil, state.now) : ', validity not stated') + '.' + (c.status !== 'Approved' ? ' ' + c.name + ' is pending: it cannot be booked until logistics approves it.' : ''), id);
    return id;
  }
  /* target: 'TR-x:DEM-y' (a lot's lane), 'LD-x' (a load without a carrier) or 'lane' (standing quote). */
  function attachFq(fqId, target, silent) {
    const fq = state.fquotes[fqId]; if (!fq) return false;
    const done = (msg) => { tick(1); log(msg, fqId); if (!silent) emit(); return true; };
    if (!target || target === 'lane') { fq.status = 'standing'; return done('Kept ' + fqId + ' as a standing quote on ' + fq.from + ' → ' + fq.to + (fq.validUntil != null ? ' until ' + u.when(fq.validUntil, state.now) : '') + '. Lots that need freight on this lane and day will see it.'); }
    const cand = E.freightCandidates(state, fq).find((c) => c.id === target);
    if (!cand) return fail('That lot or load no longer needs freight on ' + fq.from + ' → ' + fq.to + '.');
    if (cand.fit !== 'match') return fail(cand.reason || 'The pickup day does not fit.');
    const c = state.parties[fq.carrier];
    if (cand.kind === 'load') {
      const l = E.load(state, cand.load);
      const exId = l.exception;
      if (!exId || !state.exceptions[exId]) return fail(l.id + ' has no open incident to add the quote to.');
      const ex = state.exceptions[exId];
      const per = E.fqRatePerT(state, fq, l.planned, E.laneFor(state, state.trades[l.trade].origin, E.demand(state, l.demand)));
      if (per == null) return fail('The rate cannot be converted to CAD/t for this load.');
      ex.quotes = ex.quotes || {};
      ex.quotes[fq.carrier] = { rate: per, quotedAt: fq.receivedAt, validUntil: fq.validUntil != null ? fq.validUntil : E.roundUpHalf(state.now + 180), pickupAt: fq.pickupAt, fq: fqId, declared: !!(fq.payload && fq.equipmentBtrain) };
      ex.excluded = (ex.excluded || []).filter((x) => x !== fq.carrier);
      ex.events.push({ at: state.now, text: 'Quote by email: ' + c.short + ' ' + E.fqBasisLabel(fq) + ' (' + fqId + ') added to the options.' });
      fq.status = 'attached'; fq.attached.push({ type: 'load', load: l.id, exception: exId, at: state.now });
      return done('Added ' + fqId + ' (' + c.name + ', CAD ' + u.rate(per) + '/t all-in) to the replacement options for ' + l.id + ' (' + exId + ').');
    }
    const tr = state.trades[cand.trade];
    if (cand.approved) {
      if (!tr.rfq) tr.rfq = { id: 'RFQ-' + tr.id.slice(3), sentAt: state.now, pending: false, requested: false, quotes: [], award: null };
      const q = E.quoteFromFq(state, fq, tr, [cand.demand]);
      tr.rfq.quotes = tr.rfq.quotes.filter((x) => x.carrier !== fq.carrier).concat([q]);
      tr.rfq.expiredNotified = false;
      fq.status = 'attached'; fq.attached.push({ type: 'lot', trade: tr.id, demand: cand.demand, approved: true, at: state.now });
      return done('Added ' + fqId + ' from ' + c.name + ' to the freight comparison of ' + tr.id + ' (' + tr.rfq.id + '), normalized to all-in CAD.');
    }
    tr.freightQuote = Object.assign({}, tr.freightQuote || {}, { [cand.demand]: fqId });
    fq.status = 'attached'; fq.attached.push({ type: 'lot', trade: tr.id, demand: cand.demand, approved: false, at: state.now });
    return done('Used ' + fqId + ' from ' + c.name + ' as the freight on ' + tr.id + ' → ' + cand.demand + ' in the price ladder (CAD ' + u.rate(E.fqRatePerT(state, fq, tr.payload, E.laneFor(state, tr.origin, E.demand(state, cand.demand)))) + '/t all-in, until the quote lapses).');
  }
  function setFqTarget(key, target) { const ex = state.extraction[key]; if (!ex) return false; ex.target = target; emit({ soft: true }); return true; }
  function setReplyMode(key, mode) { const ex = state.extraction[key]; if (!ex) return false; ex.replyMode = mode; emit({ soft: true }); return true; }
  /* Standing quotes that fit a lot's lanes and window, for its freight comparison. */
  function standingFor(tr) {
    const alloc = tr.approval && tr.approval.valid ? tr.approval.snapshot.alloc : tr.alloc || {};
    return Object.values(state.fquotes || {}).filter((fq) => fq.status === 'standing' && (fq.validUntil == null || fq.validUntil >= state.now)).map((fq) => {
      const cand = E.freightCandidates(state, fq).find((c) => c.kind === 'lot' && c.trade === tr.id && c.fit === 'match' && alloc[c.demand]);
      return cand ? { fq: fq, cand: cand } : null;
    }).filter(Boolean);
  }

  /* ---------------- Freight (CT-11, CT-12, CT-13) ---------------- */
  function sendRfq(tid) {
    const tr = state.trades[tid];
    if (offline('sending the RFQ')) return false;
    if (!tr.approval || !tr.approval.valid) return fail('Approve the commercial terms before tendering freight.');
    if (!Object.values(tr.approval.snapshot.alloc).some((n) => n)) return fail('No sale is allocated, so there is no lane to tender.');
    if (!auth().award) return fail(user().title + ' cannot tender freight. Hand it to logistics.');
    if (tr.rfq && !tr.rfq.pending && tr.rfq.quotes.length && tr.rfq.requested !== false) return true;
    if (tr.rfq && tr.rfq.award) return true;
    tick(1);
    const kept = tr.rfq ? tr.rfq.quotes.filter((q) => q.source === 'manual' || q.source === 'email') : [];
    tr.rfq = { id: 'RFQ-' + tid.slice(3), sentAt: state.now, pending: true, requested: true, quotes: kept, award: null, manual: [] };
    log('Sent RFQ-' + tid.slice(3) + ' to preferred carriers (simulated). Carriers see lanes, dates and equipment only.', tid);
    emit();
    later(900, () => receiveQuotes(tid));
    return true;
  }
  function receiveQuotes(tid) {
    const tr = state.trades[tid];
    if (!tr.rfq || !tr.rfq.pending) return;
    tr.rfq.pending = false;
    const kept = (tr.rfq.quotes || []).filter((q) => q.source === 'manual' || q.source === 'email');
    // Standing quotes from carriers' emails that fit this lot's lanes and window join the comparison.
    // Quotes already used as this lot's freight before approval come along into the comparison.
    Object.keys(tr.freightQuote || {}).forEach((demId) => { const fq = state.fquotes[tr.freightQuote[demId]]; if (!fq || !tr.approval.snapshot.alloc[demId] || kept.some((q) => q.fq === fq.id || q.carrier === fq.carrier) || (fq.validUntil != null && fq.validUntil < state.now)) return; kept.push(E.quoteFromFq(state, fq, tr, [demId])); fq.attached.push({ type: 'lot', trade: tr.id, demand: demId, approved: true, at: state.now }); });
    standingFor(tr).forEach((x) => { if (!kept.some((q) => q.fq === x.fq.id || q.carrier === x.fq.carrier)) { kept.push(E.quoteFromFq(state, x.fq, tr, [x.cand.demand])); x.fq.status = 'attached'; x.fq.attached.push({ type: 'lot', trade: tr.id, demand: x.cand.demand, approved: true, at: state.now }); } });
    const sim = Object.values(state.parties).filter((p) => p.kind === 'Carrier' && p.status === 'Approved' && !kept.some((q) => q.carrier === p.id)).map((c) => E.quoteFor(state, tr, c, tr.rfq.sentAt + 5));
    tr.rfq.quotes = kept.concat(sim);
    sys(tr.rfq.id + ': ' + sim.filter((q) => !q.declined).length + ' quotes and ' + sim.filter((q) => q.declined).length + ' decline received (simulated replies)' + (kept.length ? '; ' + kept.length + ' quote' + (kept.length > 1 ? 's' : '') + ' already on file kept in the comparison' : '') + '.', tid, 'quote', false);
  }
  function refreshQuote(tid, carrier) {
    const tr = state.trades[tid];
    if (offline('requesting a refreshed quote')) return false;
    const i = tr.rfq.quotes.findIndex((x) => x.carrier === carrier); if (i < 0) return false;
    tick(3);
    tr.rfq.quotes[i] = E.quoteFor(state, tr, state.parties[carrier], state.now, true);
    log('Requested a refreshed quote from ' + state.parties[carrier].name + ' for ' + tr.rfq.id + ' (simulated reply).', tid);
    emit(); return true;
  }
  function requoteAll(tid) {
    const tr = state.trades[tid];
    if (offline('re-quoting')) return false;
    tr.rfq.quotes = tr.rfq.quotes.map((q) => (q.declined || E.quoteStatus(state, q) !== 'expired' ? q : E.quoteFor(state, tr, state.parties[q.carrier], state.now, true)));
    tick(5);
    log('Re-quoted expired freight quotes on ' + tr.rfq.id + ' (simulated replies, about 2% higher).', tid);
    emit(); return true;
  }
  function addManualQuote(tid, q) {
    const tr = state.trades[tid];
    if (!tr.rfq) { tr.rfq = { id: 'RFQ-' + tid.slice(3), sentAt: state.now, pending: false, requested: false, quotes: [], award: null }; }
    const c = state.parties[q.carrier]; if (!c) return fail('Choose a carrier.');
    const rates = {};
    Object.keys(tr.approval.snapshot.alloc).forEach((k) => { if (tr.approval.snapshot.alloc[k]) rates[k] = Number(q.rates[k]); });
    if (Object.values(rates).some((v) => !(v > 0))) return fail('Enter a rate for every lane.');
    tr.rfq.quotes = tr.rfq.quotes.filter((x) => x.carrier !== q.carrier).concat([{ carrier: q.carrier, rates: rates, fsc: Number(q.fsc) || 0, sentAt: state.now, validUntil: q.validUntil || state.now + DAY, payload: c.verifiedPayload ? 'verified' : 'unverified', note: 'Entered by ' + user().name + ' from a phone quote.', source: 'manual' }]);
    log('Recorded a phone quote from ' + c.name + ' on ' + tr.rfq.id + ': ' + Object.keys(rates).map((k) => k + ' CAD ' + u.rate(rates[k]) + '/t').join(', ') + (q.fsc ? ' + ' + q.fsc + '% fuel' : '') + '.', tid);
    emit(); return true;
  }
  function award(tid, carrier) {
    const tr = state.trades[tid];
    if (offline('tendering to the carrier')) return false;
    if (!auth().award) return fail(user().title + ' cannot award freight. Hand it to logistics.');
    const q = tr.rfq.quotes.find((x) => x.carrier === carrier);
    const st = E.quoteStatus(state, q);
    if (st === 'expired') return fail('Expired quotes cannot be awarded. Re-quote first.');
    if (st === 'pending') return fail(state.parties[carrier].name + ' is pending: logistics verifies its authority, insurance and equipment before an award.');
    if (st === 'partial') return fail('This quote covers ' + q.capacity + ' of ' + q.need + ' loads: the award needs a carrier for every load.');
    if (st !== 'valid') return fail('This quote cannot be awarded.');
    if (!E.payloadOk(q)) return fail('Payload unverified: the axle configuration is not declared, so ' + tr.payload + ' t per load cannot be assumed.');
    tick(2);
    tr.rfq.award = { carrier: carrier, rates: E.quoteRates(q), at: state.now, state: 'tendered', by: user().name };
    const backup = tr.rfq.quotes.filter((x) => x.carrier !== carrier && E.quoteStatus(state, x) === 'valid' && E.payloadOk(x)).sort((a, b) => E.quoteTotal(state, tr, a) - E.quoteTotal(state, tr, b))[0];
    if (q.fq && state.fquotes[q.fq]) state.fquotes[q.fq].status = 'awarded';
    tr.rfq.backup = backup ? backup.carrier : null;
    log('Awarded ' + tr.rfq.id + ' to ' + state.parties[carrier].name + ' (simulated tender). Competing requests closed; closing notes drafted.', tid);
    emit();
    later(1100, () => acceptAward(tid));
    return true;
  }
  function acceptAward(tid) {
    const tr = state.trades[tid]; const a = tr.rfq && tr.rfq.award;
    if (!a || a.state !== 'tendered') return;
    a.state = 'accepted'; a.acceptedAt = state.now + 8;
    const snap = tr.approval.snapshot.rates; let worst = -Infinity;
    Object.keys(tr.approval.snapshot.alloc).forEach((k) => { if (tr.approval.snapshot.alloc[k] && snap[k] && snap[k].freight) worst = Math.max(worst, ((a.rates[k] - snap[k].freight) / snap[k].freight) * 100); });
    a.variancePct = worst === -Infinity ? 0 : worst;
    const within = a.variancePct <= (D.authority.trader.freightVariancePct || 10);
    sys(state.parties[a.carrier].name + ' accepted ' + tr.rfq.id + ' (simulated reply). Freight now firm; variance ' + u.pct(a.variancePct) + ' vs estimate' + (within ? ', within the 10% policy.' : ': above the 10% policy, re-approval needed.'), tid, 'quote', true);
    if (!within) invalidate(tr, 'firm freight ' + u.pct(a.variancePct) + ' above estimate');
  }
  function requestAppts(tid) {
    const tr = state.trades[tid];
    if (offline('requesting appointments')) return false;
    if (!tr.rfq || !tr.rfq.award || tr.rfq.award.state !== 'accepted') return fail('Book the carrier first: an award only becomes a booking once the carrier accepts.');
    if (!tr.approval || !tr.approval.valid) return fail('Re-approve the plan first.');
    if (tr.appts && tr.appts.state !== 'failed') return true;
    const count = Object.values(tr.approval.snapshot.alloc).reduce((a, b) => a + b, 0);
    const sch = E.scheduleSlots(state, tr, count);
    if (sch.fits < count) { tr.appts = { state: 'failed', at: state.now, reason: 'Only ' + sch.fits + ' of ' + count + ' pickups fit the window ' + u.dayShort(tr.windowStart) + '–' + u.dayShort(tr.windowEnd) + '. Extend the window with the supplier or reduce the plan.' }; log(tr.appts.reason, tid, { notify: true, kind: 'expired' }); emit(); return false; }
    tick(2);
    tr.appts = { state: 'requested', at: state.now };
    log('Requested pickup and receiving appointments for ' + tid + ' (simulated). A request is not a confirmed slot.', tid);
    emit();
    later(1000, () => confirmAppts(tid));
    return true;
  }
  function confirmAppts(tid) {
    const tr = state.trades[tid];
    if (!tr.appts || tr.appts.state !== 'requested') return;
    tr.appts.state = 'confirmed'; tr.appts.confirmedAt = state.now + 9;
    const alloc = tr.approval.snapshot.alloc;
    const demIds = Object.keys(alloc).filter((k) => alloc[k]);
    const total = demIds.reduce((a, k) => a + alloc[k], 0);
    const sch = E.scheduleSlots(state, tr, total);
    let i = 0;
    demIds.forEach((demId) => {
      const dm = E.demand(state, demId); const buyer = state.parties[dm.buyer];
      for (let j = 0; j < alloc[demId]; j++) {
        const pickupAt = sch.slots[i].at; i += 1;
        const eta = E.etaFor(state, tr, dm.buyer, pickupAt, dm);
        const day = E.openAt(buyer, eta);
        const id = 'LD-' + state.counters.load++;
        state.loads.push({ id: id, trade: tr.id, demand: demId, carrier: tr.rfq.award.carrier, rate: tr.rfq.award.rates[demId], planned: tr.payload, status: 'booked', pickupAt: pickupAt, etaAt: eta, cutoffAt: day.close, unit: 'B-train ' + (j % 2 ? 'unit 22' : 'unit 31'), lastUpdate: 'Booked · appointments confirmed (simulated replies)', docs: {}, recon: { d: {} } });
      }
    });
    sys('Appointments confirmed for ' + tid + ' (simulated replies). ' + i + ' loads booked from ' + u.dayShort(sch.slots[0].at) + '.', tid, 'booked', true);
  }

  /* ---------------- Loads (CT-15) and the demo clock ---------------- */
  function hashOf(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return h; }
  function loadMins(tr) { return (state.parties[tr.supplier] || {}).loadMins || 45; }
  function defaultOrigin(l, tr, at) {
    const h = hashOf(l.id);
    const net = u.r2(l.planned - (h % 5) * 0.01);
    return { ref: 'OT-' + (5000 + (h % 4000)), issuer: (state.parties[tr.supplier] || {}).name + ' (certified scale)', at: at, gross: u.r2(net + 23.52), tare: 23.52, net: Math.round(net * 1000) / 1000, moisture: tr.moisture, source: tr.moistureSource || 'Supplier statement', simulated: true };
  }
  const TW = { corn: 56.0, soy: 57.0, wheat: 58.5, barley: 48.5 };
  function defaultReceiving(l, tr, at, wait) {
    const h = hashOf(l.id + 'r');
    const o = l.docs.origin || defaultOrigin(l, tr, at);
    const net = Math.round((o.net - (0.02 + (h % 4) * 0.01)) * 1000) / 1000;
    const drift = (state.parties[tr.supplier] || {}).moistureDrift != null ? state.parties[tr.supplier].moistureDrift : 0.2;
    const buyer = state.parties[E.demand(state, l.demand).buyer];
    return { ref: 'R-' + (56000 + (h % 3000)), issuer: buyer.name + ', ' + buyer.town, at: at, gross: u.r2(net + 23.5), tare: 23.5, net: net, moisture: tr.moisture != null ? u.r1(tr.moisture + drift) : null, testWeight: tr.testWeight || TW[tr.commodity] || 56, wait: wait, simulated: true };
  }
  function defaultInvoice(l, at, detention) {
    const c = state.parties[l.carrier] || {};
    const basis = (c.traits || {}).invoiceBasis;
    return { ref: 'F-' + (11000 + (hashOf(l.id + 'i') % 900)), issuer: c.name, at: at, qty: basis === 'contract' ? l.planned : l.docs.origin.net, rate: l.rate, detention: detention || 0, simulated: true };
  }
  function receivingWait(l, arrival) {
    const buyer = state.parties[E.demand(state, l.demand).buyer];
    const h = buyer.hours || {};
    if (l.missedCutoff) return Math.max(0, l.etaAt - l.arrivedAt) + (buyer.unloadMins || 30);
    if (h.queueAfter != null && (arrival % DAY) >= h.queueAfter) return h.queueMins || 120;
    return (buyer.unloadMins || 30) + (hashOf(l.id) % 3) * 15;
  }
  /* Detention is billed per hour past free time, capped at 8 billable hours per load. */
  function detentionFor(wait) { const w = Math.min(Number(wait) || 0, D.finance.freeMins + 480); return Math.max(0, Math.round(((w - D.finance.freeMins) / 60) * D.finance.detentionPerHour * 100) / 100); }

  /* Earliest scheduled consequence at or before target, or null. */
  function nextDue(target) {
    let best = null;
    const consider = (at, kind, fn) => { if (at == null || at > target) return; if (!best || at < best.at) best = { at: Math.max(at, state.now), kind: kind, fn: fn }; };
    state.loads.forEach((l) => {
      if (l.status === 'cancelled') return;
      const blocked = (l.exception && state.exceptions[l.exception] && state.exceptions[l.exception].status !== 'resolved') || !l.carrier;
      const tr = state.trades[l.trade];
      if (!blocked && l.status === 'booked') consider(l.pickupAt, 'pickup', () => { l.status = 'loading'; l.lastUpdate = 'Simulated carrier check-in at pickup, ' + u.when(l.pickupAt, state.now); });
      if (!blocked && l.status === 'loading') { const dep = l.departAt || l.pickupAt + loadMins(tr); consider(dep, 'depart', () => { l.status = 'transit'; l.departAt = dep; if (!l.docs.origin) l.docs.origin = defaultOrigin(l, tr, dep - 8); l.lastUpdate = 'Departed with origin ticket ' + l.docs.origin.ref + ' (simulated check-in)'; }); }
      if (l.status === 'transit') consider(l.etaAt, 'arrive', () => arrive(l, tr));
      if (l.status === 'delivered' && l.pending) {
        if (l.pending.receivingAt != null && !l.docs.receiving) consider(l.pending.receivingAt, 'ticket', () => { l.docs.receiving = Object.assign({ at: l.pending.receivingAt }, l.pending.receiving); sys('Receiving ticket ' + l.docs.receiving.ref + ' arrived for ' + l.id + '.', l.id, 'ticket', false); l.pending.receivingAt = null; handoffRecon(l); });
        if (l.pending.invoiceAt != null && !l.docs.invoice) consider(l.pending.invoiceAt, 'invoice', () => { l.docs.invoice = Object.assign({}, l.pending.invoice, { at: l.pending.invoiceAt }); sys('Carrier invoice ' + l.docs.invoice.ref + ' arrived for ' + l.id + '.', l.id, 'invoice', false); l.pending.invoiceAt = null; handoffRecon(l); });
      }
      if (l.receivable && l.receivable.paid == null) {
        const buyer = state.parties[E.demand(state, l.demand).buyer];
        if (!l.receivable.overdueNotified) consider(l.receivable.due + 1, 'overdue', () => { l.receivable.overdueNotified = true; sys('Receivable ' + l.receivable.ref + ' (' + buyer.short + ') is overdue.', l.id, 'overdue', true); });
        if (buyer.payDelayDays != null) consider(l.receivable.due + buyer.payDelayDays * DAY, 'paid', () => { l.receivable.paid = state.now; sys('Payment for ' + l.receivable.ref + ' imported from accounting (simulated).', l.id, 'payment', true); });
      }
    });
    Object.values(state.exceptions).forEach((ex) => {
      if (ex.status === 'resolved') return;
      const l = E.load(state, ex.load);
      const opts = E.exceptionOptions(state, ex);
      const firstExp = opts.filter((o) => !o.declined && !o.expired && o.validUntil != null).map((o) => o.validUntil).sort((a, b) => a - b)[0];
      if (firstExp != null && !ex.quotesExpiredAt) { const allExp = opts.filter((o) => !o.declined).every((o) => o.validUntil <= target); if (allExp) consider(Math.max.apply(null, opts.filter((o) => !o.declined).map((o) => o.validUntil)) + 1, 'quotes', () => { ex.quotesExpiredAt = state.now; ex.events.push({ at: state.now, text: 'Replacement quotes expired: re-quote before approving.' }); sys('Replacement quotes for ' + ex.load + ' expired (' + ex.id + '). Re-quote.', ex.id, 'expired', true); }); }
      if (!ex.pickupMissed) consider(l.pickupAt + 1, 'pickup-missed', () => { ex.pickupMissed = true; ex.events.push({ at: state.now, text: 'Pickup time passed with no carrier.' }); sys(ex.load + ' pickup time passed with no carrier (' + ex.id + ').', ex.id, 'missed', true); });
      if (!ex.cutoffMissed) consider(l.cutoffAt + 1, 'cutoff-missed', () => { ex.cutoffMissed = true; ex.events.push({ at: state.now, text: 'Receiving cutoff passed: delivery now needs a new receiving day.' }); sys(ex.load + ' missed the receiving cutoff (' + ex.id + '): rebook for the next receiving day.', ex.id, 'missed', true); });
    });
    Object.values(state.trades).forEach((tr) => {
      (tr.contracts || []).forEach((c) => { if (c.state === 'Sent' && c.ackDueAt != null) consider(c.ackDueAt, 'ack', () => { c.state = 'Acknowledged'; c.ackAt = state.now; sys((state.parties[c.party] || {}).name + ' acknowledged ' + c.id + ' (simulated reply).', tr.id, 'ack', false); }); });
      if (tr.rfq && !tr.rfq.award && tr.rfq.quotes && !tr.rfq.expiredNotified) {
        const valid = tr.rfq.quotes.filter((q) => !q.declined && q.validUntil > state.now);
        if (valid.length) { const last = Math.max.apply(null, valid.map((q) => q.validUntil)); consider(last + 1, 'rfq-expired', () => { tr.rfq.expiredNotified = true; sys('All freight quotes on ' + tr.rfq.id + ' expired before an award. Re-quote.', tr.id, 'expired', true); }); }
      }
      if (tr.status === 'open' && tr.validUntil != null && !(tr.approval && tr.approval.valid)) consider(tr.validUntil + 1, 'offer-lapsed', () => { tr.status = 'expired'; tr.expiredReason = 'offer'; sys('The supplier’s price on ' + tr.id + ' lapsed (firm until ' + u.when(tr.validUntil, state.now) + '). Re-confirm it before approving.', tr.id, 'expired', true); });
      if (tr.status === 'open' && tr.windowEnd != null) consider(tr.windowEnd + 1, 'lot-expired', () => { tr.status = 'expired'; tr.expiredReason = 'window'; sys('Pickup window for ' + tr.id + ' lapsed before approval. Supplier availability is excluded from firm capacity.', tr.id, 'expired', true); });
    });
    state.demands.forEach((d) => {
      if (d.validUntil != null && !d.expiredNotified && d.status !== 'withdrawn') consider(d.validUntil + 1, 'bid-expired', () => {
        d.expiredNotified = true;
        const users = Object.values(state.trades).filter((t) => t.alloc && t.alloc[d.id] && !(t.approval && t.approval.valid)).map((t) => t.id);
        sys('Bid ' + d.id + ' (' + state.parties[d.buyer].short + ') expired.' + (users.length ? ' Unapproved plans using it: ' + users.join(', ') + '.' : ''), d.id, 'expired', true);
      });
    });
    state.receivables.forEach((r) => { if (r.paid == null && !r.overdueNotified && r.due < target) consider(Math.max(r.due + 1, state.now), 'overdue', () => { r.overdueNotified = true; sys('Receivable ' + r.ref + ' (' + state.parties[r.party].short + ') is ' + Math.floor((state.now - r.due) / DAY) + ' days overdue.', r.ref, 'overdue', true); }); });
    Object.values(state.fquotes || {}).forEach((fq) => {
      if (fq.validUntil == null || fq.lapsedNotified || fq.status === 'awarded') return;
      consider(fq.validUntil + 1, 'fq-lapsed', () => { fq.lapsedNotified = true; if (fq.status === 'standing') fq.status = 'expired'; sys((state.parties[fq.carrier] || {}).name + '’s quote ' + fq.id + ' (' + fq.from + ' → ' + fq.to + (fq.pickupAt != null ? ', pickup ' + u.when(fq.pickupAt, state.now) : '') + ') lapsed at ' + u.hhmm(fq.validUntil % DAY) + (fq.attached.length ? '. It no longer counts in ' + fq.attached.map((a) => a.type === 'load' ? a.load : a.trade).join(', ') + '.' : '.'), fq.id, 'expired', true); });
    });
    return best;
  }
  function arrive(l, tr) {
    const buyer = state.parties[E.demand(state, l.demand).buyer];
    if (!l.missedCutoff && l.etaAt > l.cutoffAt) {
      l.missedCutoff = true; l.arrivedAt = l.etaAt; l.etaAt = E.nextOpening(buyer, l.etaAt + 1);
      l.lastUpdate = 'Arrived after the ' + u.hhmm(l.cutoffAt % DAY) + ' cutoff; unloads ' + u.when(l.etaAt, state.now);
      sys(l.id + ' missed the receiving cutoff at ' + buyer.short + ' (arrived ' + u.when(l.arrivedAt, state.now) + '). Unloads ' + u.when(l.etaAt, state.now) + '; detention accrues.', l.id, 'missed', true);
      return;
    }
    const wait = receivingWait(l, l.etaAt);
    const unloadAt = l.etaAt + Math.min(wait, 600);
    l.status = 'delivered'; l.deliveredAt = l.missedCutoff ? l.etaAt : l.etaAt;
    if (!l.docs.origin) l.docs.origin = defaultOrigin(l, tr, l.pickupAt + 30);
    l.lastUpdate = 'Delivered to ' + buyer.short + ' (simulated check-in)';
    l.pending = l.pending || {};
    if (!l.docs.receiving) { l.pending.receiving = defaultReceiving(l, tr, unloadAt, wait); l.pending.receivingAt = unloadAt + 30; }
    if (!l.docs.invoice) { l.pending.invoice = defaultInvoice(l, null, detentionFor(wait)); l.pending.invoiceAt = (Math.floor(l.etaAt / DAY) + 1) * DAY + 450; }
    sys(l.id + ' delivered to ' + buyer.short + '. Receiving ticket and carrier invoice to follow.', l.id, 'arrived', false);
  }
  function handoffRecon(l) {
    if (l.docs.origin && l.docs.receiving && l.docs.invoice) {
      const f = E.findings(state, l);
      const roles = [...new Set(f.list.map((x) => (x.role === 'quality' ? 'trader' : 'finance')))];
      sys('All documents in for ' + l.id + ': ' + (f.list.length ? f.list.length + ' discrepanc' + (f.list.length > 1 ? 'ies' : 'y') + ' for ' + roles.join(' and ') : 'within all tolerances; finance can approve the settlement') + '.', l.id, 'handoff', true);
    }
  }
  /* What the clock will trigger next (Test lab preview). Read-only. */
  function upcoming(limit) {
    const s = state; const out = [];
    const add = (at, text, ref) => { if (at != null && at > s.now) out.push({ at: at, text: text, ref: ref }); };
    s.loads.forEach((l) => {
      if (l.status === 'cancelled') return;
      if (l.exception && s.exceptions[l.exception] && s.exceptions[l.exception].status !== 'resolved') { add(l.pickupAt, l.id + ' pickup time with no carrier', l.id); add(l.cutoffAt, l.id + ' receiving cutoff', l.id); return; }
      if (l.status === 'booked') add(l.pickupAt, l.id + ' pickup', l.id);
      if (l.status === 'transit' || l.status === 'loading' || l.status === 'booked') add(l.etaAt, l.id + ' arrival' + (l.etaAt > l.cutoffAt ? ' (after the cutoff)' : ''), l.id);
      if (l.pending && l.pending.receivingAt != null && !l.docs.receiving) add(l.pending.receivingAt, l.id + ' receiving ticket due', l.id);
      if (l.pending && l.pending.invoiceAt != null && !l.docs.invoice) add(l.pending.invoiceAt, l.id + ' carrier invoice due', l.id);
      if (l.receivable && l.receivable.paid == null) add(l.receivable.due, l.receivable.ref + ' payment due', l.id);
    });
    s.demands.forEach((d) => { if (d.validUntil != null && d.status !== 'withdrawn') add(d.validUntil, 'Bid ' + d.id + ' (' + (s.parties[d.buyer] || {}).short + ') expires', d.id); });
    Object.values(s.trades).forEach((t) => {
      if (t.status === 'open') add(t.windowEnd, t.id + ' pickup window lapses', t.id);
      if (t.status === 'open' && t.validUntil != null && !(t.approval && t.approval.valid)) add(t.validUntil, t.id + ' supplier’s price lapses', t.id);
      if (t.rfq && !t.rfq.award) (t.rfq.quotes || []).forEach((q) => { if (!q.declined) add(q.validUntil, (s.parties[q.carrier] || {}).short + ' quote on ' + t.rfq.id + ' expires', t.id); });
      (t.contracts || []).forEach((c) => { if (c.state === 'Sent') add(c.ackDueAt, c.id + ' acknowledgement expected', t.id); });
    });
    Object.values(s.exceptions).forEach((ex) => { if (ex.status !== 'resolved') E.exceptionOptions(s, ex).forEach((o) => { if (!o.declined && !o.expired) add(o.validUntil, (s.parties[o.carrier] || {}).short + ' replacement quote for ' + ex.load + ' expires', ex.id); }); });
    s.receivables.forEach((r) => { if (r.paid == null) add(r.due, r.ref + ' payment due', r.ref); });
    Object.values(s.fquotes || {}).forEach((fq) => { if (fq.validUntil != null && !fq.lapsedNotified && fq.status !== 'awarded') add(fq.validUntil, (s.parties[fq.carrier] || {}).short + ' quote ' + fq.id + ' (' + fq.from + ' → ' + fq.to + ') lapses', fq.id); });
    return out.sort((a, b) => a.at - b.at).slice(0, limit || 8);
  }
  function runClockTo(target) {
    if (target < state.now) return fail('The demo clock only moves forward.');
    let guard = 0;
    while (guard++ < 3000) {
      const ev = nextDue(target);
      if (!ev) break;
      state.now = ev.at; ev.fn();
    }
    state.now = target;
    finishPending();
    return true;
  }
  function advance(mins) {
    const from = state.now;
    snapshotUndo('clock advance');
    runClockTo(state.now + mins);
    log('Demo clock advanced ' + u.durationLabel(mins) + ' to ' + u.when(state.now, state.now) + ' (' + u.dayShort(state.now) + ').', 'CLOCK', { kind: 'clock', who: 'Test lab', role: 'service' });
    emit();
    return from !== state.now;
  }
  function advanceTo(t) { if (t == null || t <= state.now) return fail('Choose a time after ' + u.when(state.now, state.now) + '.'); return advance(t - state.now); }

  /* Next milestone a person can record by hand (logistics), regardless of the clock. */
  function nextMilestone(id) {
    const l = E.load(state, id); if (!l || !l.carrier) return null;
    if (l.exception && state.exceptions[l.exception] && state.exceptions[l.exception].status !== 'resolved') return null;
    if (l.status === 'booked') return { to: 'loading', label: 'Record arrival at pickup' };
    if (l.status === 'loading') return { to: 'transit', label: 'Record departure with origin ticket' };
    if (l.status === 'transit') return { to: 'delivered', label: 'Record arrival at receiver' };
    return null;
  }
  function advanceLoad(id) {
    const l = E.load(state, id); const n = nextMilestone(id); if (!l || !n) return false;
    if (!auth().milestones && state.role !== 'trader') return fail(user().title + ' cannot record load milestones.');
    const tr = state.trades[l.trade];
    tick(1);
    if (n.to === 'loading') { l.status = 'loading'; l.pickupAt = Math.min(l.pickupAt, state.now) === l.pickupAt ? l.pickupAt : state.now; }
    if (n.to === 'transit') { l.status = 'transit'; l.departAt = state.now; if (!l.docs.origin) l.docs.origin = defaultOrigin(l, tr, state.now - 5); l.etaAt = Math.max(l.etaAt, state.now + 20); }
    if (n.to === 'delivered') { l.etaAt = state.now; arrive(l, tr); }
    l.lastUpdate = 'Manual update by ' + user().name + ', ' + u.when(state.now, state.now);
    log(id + ': ' + n.label.toLowerCase() + ' (manual update, received ' + u.hhmm(state.now % DAY) + ').', id);
    emit(); return true;
  }
  function cancelLoadInternal(l, reason) {
    if (l.status !== 'booked') return false;
    l.status = 'cancelled';
    state.ledger.push({ at: state.now, trade: l.trade, demand: l.demand, tonnes: -l.planned, kind: 'reversal', by: user().name, note: l.id + ' cancelled: ' + reason });
    if (l.exception && state.exceptions[l.exception]) state.exceptions[l.exception].status = 'resolved';
    return true;
  }
  function cancelLoad(id) {
    const l = E.load(state, id); if (!l) return false;
    if (l.status !== 'booked') return fail('Only booked loads that have not started loading can be cancelled.');
    snapshotUndo('cancel ' + id);
    cancelLoadInternal(l, 'cancelled by ' + user().name);
    log('Cancelled ' + id + ' before dispatch. ' + u.t1(l.planned) + ' t released back to the demand; the sale delivers short unless replaced.', id, { notify: true, kind: 'cancel' });
    emit(); return true;
  }
  function markWatch(id) { state.watch[id] = { at: state.now, by: user().name }; tick(1); log('Watching ' + id + ': receiver note copied.', id); emit(); }
  function attachBol(id, meta) {
    const l = E.load(state, id);
    state.bol[id] = Object.assign({ at: state.now, by: user().name }, meta);
    l.bolMissing = false; tick(1);
    log('BOL photo attached to ' + id + ': ' + meta.name + ' (' + Math.round(meta.size / 1024) + ' KB, checksum ' + meta.hash.slice(0, 12) + '…). Read in your browser; not uploaded.', id);
    emit();
  }
  function reviewFlag(id) { state.msgState[id] = 'reviewed'; tick(1); log('Reviewed flagged message ' + id + ': no action taken; finance asked to verify bank details by phone.', id); emit(); }

  /* ---------------- Exceptions (CT-16) ---------------- */
  function openCancellation(loadId, viaMessage) {
    const l = E.load(state, loadId);
    if (!l || !['booked', 'loading'].includes(l.status) || !l.carrier) return fail('Only booked loads with a carrier can be cancelled by the carrier.');
    if (l.exception && state.exceptions[l.exception] && state.exceptions[l.exception].status !== 'resolved') return fail(loadId + ' already has an open incident.');
    const c = state.parties[l.carrier];
    const id = 'EX-' + String(state.counters.ex++).padStart(4, '0');
    const msgId = 'MSG-' + String(state.counters.msg++).padStart(4, '0');
    state.exceptions[id] = { id: id, load: loadId, kind: 'cancellation', carrier: l.carrier, openedAt: state.now, status: 'open', cause: c.name + ' cancelled ' + loadId + ' (simulated message ' + msgId + ').', owner: D.users.logistics.name, events: [{ at: state.now, text: 'Known: ' + c.name + ' cancelled by email (' + msgId + ').' }, { at: state.now + 1, text: 'Suggested: alternatives ranked by contribution and cutoff risk.' }] };
    l.cancelledCarrier = l.carrier; l.carrier = null; l.exception = id; l.status = 'booked';
    l.lastUpdate = 'Cancellation email from ' + c.name + ', ' + u.hhmm(state.now % DAY);
    state.messages.unshift({ id: msgId, from: c.contact.replace('Dispatch: ', ''), org: c.name, party: c.id, at: state.now, subject: loadId + ' – annulation', lang: c.lang || 'fr', kind: 'Carrier cancellation', status: 'linked', link: { type: 'exception', id: id, load: loadId, label: 'Linked to incident ' + id + ' (' + loadId + ')' }, body: D.templates.cancelFr(loadId, u.hhmm(l.pickupAt % DAY)), injected: true });
    c.perf.cancels90 = (c.perf.cancels90 || 0) + 1;
    c.cancellations = (c.cancellations || []).concat([{ load: loadId, date: u.dayShort(state.now).slice(4), note: 'Cancelled · incident ' + id }]);
    sys(c.name + ' cancelled ' + loadId + '. Incident ' + id + ' opened with prepared alternatives.', id, 'cancel', true);
    if (!viaMessage) emit();
    return id;
  }
  function chooseOption(exId, opt) { state.exceptions[exId].option = opt; emit({ soft: true }); }
  function requoteException(exId) {
    const ex = state.exceptions[exId];
    if (offline('re-quoting')) return false; const l = E.load(state, ex.load);
    ex.quotes = ex.quotes || {};
    E.exceptionOptions(state, ex).forEach((o) => { if (!o.declined) ex.quotes[o.carrier] = { rate: u.r2(o.rate + 0.4), quotedAt: state.now, validUntil: E.roundUpHalf(state.now + ((state.parties[o.carrier].traits || {}).spotValidMin || 180)) }; });
    ex.quotesExpiredAt = null; tick(6);
    ex.events.push({ at: state.now, text: 'Re-quoted: fresh spot quotes requested (simulated replies, +CAD 0.40/t).' });
    log('Re-quoted replacement carriers for ' + l.id + ' (' + exId + ').', exId);
    emit(); return true;
  }
  function verifyCarrier(cid) {
    const c = state.parties[cid]; if (!c) return false;
    if (state.role !== 'logistics' && state.role !== 'manager') return fail('Carrier verification belongs to logistics.');
    c.verifiedPayload = true; c.equipment = '7-axle B-train hopper (declared ' + u.dayShort(state.now) + ')';
    tick(3);
    log(c.name + ' declared its axle configuration (simulated reply): payload can now be checked against the rule pack.', cid);
    emit(); return true;
  }
  function approveReplacement(exId) {
    const ex = state.exceptions[exId];
    if (ex.status !== 'open') return true;
    const opts = E.exceptionOptions(state, ex);
    const opt = opts.find((o) => o.id === ex.option) || opts.find((o) => o.recommended);
    if (!opt) return fail('No eligible alternative. Re-quote or cancel the load.');
    ex.option = opt.id;
    if (opt.declined) return fail('That carrier declined.');
    if (opt.expired) return fail('That quote expired ' + u.when(opt.validUntil, state.now) + '. Re-quote first.');
    if (opt.block && !(opt.contractChange && auth().amend)) return fail(opt.block);
    if (!auth().replacement) return fail(user().title + ' cannot approve carrier replacements.');
    if (offline('sending the replacement request')) return false;
    if (opt.extra > u.toCents(auth().replacementCap)) return fail('CAD ' + u.money(opt.extra) + ' exceeds your replacement cap of CAD ' + auth().replacementCap + '. Route to the desk manager.');
    tick(1);
    ex.status = 'revalidating'; ex.approvedBy = user().name; ex.approvedRole = state.role; ex.approvedAt = state.now; ex.extra = opt.extra; ex.chosen = opt;
    ex.events.push({ at: state.now, text: 'Approved: ' + user().name + ' approved CAD ' + u.money(opt.extra) + ' additional freight with ' + state.parties[opt.carrier].short + '.' });
    log('Approved CAD ' + u.money(opt.extra) + ' additional freight to replace the carrier on ' + ex.load + ' with ' + state.parties[opt.carrier].name + '. Revalidating before execution.', exId);
    emit();
    later(900, () => {
      if (ex.status !== 'revalidating') return;
      ex.status = 'awaiting';
      ex.events.push({ at: state.now, text: 'Revalidated: insurance, qualification, quote validity, payload and terms. Request sent (simulated).' });
      later(1000, () => completeReplacement(exId));
    });
    return true;
  }
  function completeReplacement(exId) {
    const ex = state.exceptions[exId];
    if (ex.status === 'resolved') return;
    const opt = ex.chosen || E.exceptionOptions(state, ex).find((o) => o.recommended);
    if (!opt) return;
    const l = E.load(state, ex.load);
    l.originalRate = l.originalRate || l.rate;
    l.carrier = opt.carrier; l.rate = opt.rate; l.rebooked = true; l.unit = l.unit || 'Replacement unit';
    l.etaAt = opt.deliverAt;
    if (opt.arrive > l.pickupAt) l.pickupAt = opt.arrive;
    if (opt.contractChange || opt.deferred) {
      if (opt.contractChange) l.pickupAt = opt.deliverAt - ((state.parties[state.trades[l.trade].supplier] || {}).loadMins || 45) - 90;
      l.cutoffAt = E.openAt(state.parties[E.demand(state, l.demand).buyer], opt.deliverAt).close;
      l.extraC = (l.extraC || 0) + (opt.extraC || 0);
      l.extraNote = opt.contractChange ? 'Late allowance CAD ' + u.rate(D.finance.lateAllowance) + '/t (buyer amendment)' : 'Layover CAD ' + u.rate(D.finance.layover) + ' (next receiving day)';
    }
    l.lastUpdate = 'Replacement accepted by ' + state.parties[opt.carrier].short + ' (simulated reply)';
    const used = ((ex.quotes || {})[opt.carrier] || {}).fq; if (used && state.fquotes[used]) state.fquotes[used].status = 'awarded';
    l.exception = null; l.replacedFrom = ex.carrier;
    ex.status = 'resolved'; ex.resolvedAt = state.now + 3;
    ex.events.push({ at: state.now + 3, text: 'Done: ' + state.parties[opt.carrier].short + ' accepted (simulated reply). Original booking closed as carrier-cancelled. Coordinated update drafted for supplier and buyer.' });
    sys(exId + ' resolved with evidence: ' + state.parties[opt.carrier].name + ' accepted ' + l.id + ' (simulated reply). ETA ' + u.when(l.etaAt, state.now) + '.', exId, 'resolved', true);
  }

  /* ---------------- Delivery simulation and late tickets (Test lab) ---------------- */
  function simulateDelivery(id, p) {
    const l = E.load(state, id); const tr = state.trades[l.trade];
    if (!l || l.status === 'cancelled' || ['reconciled', 'settled'].includes(l.status)) return fail('Choose a booked, moving or delivered load that is not yet reconciled.');
    if (!l.carrier) return fail(id + ' has no carrier. Resolve its incident first.');
    if (l.docs.origin && l.docs.receiving && l.docs.invoice) return fail(id + ' already has all its documents; simulate another load.');
    const on = Number(p.originNet), rn = Number(p.destNet);
    if (!(on > 20 && on < 45) || !(rn > 20 && rn < 45)) return fail('Weights must be between 20 and 45 t.');
    snapshotUndo('simulate delivery ' + id);
    const at = Math.max(state.now, l.status === 'booked' ? state.now : l.departAt || state.now);
    l.docs.origin = { ref: 'OT-' + (7000 + (hashOf(id) % 2000)), issuer: (state.parties[tr.supplier] || {}).name + ' (certified scale)', at: at - 120, gross: u.r2(on + 23.52), tare: 23.52, net: on, moisture: p.originMoisture !== '' && p.originMoisture != null ? Number(p.originMoisture) : tr.moisture, source: 'Simulated in Test lab', simulated: true };
    const wait = Number(p.waitMins) || 35;
    l.docs.receiving = { ref: 'R-' + (60000 + (hashOf(id + 'r') % 3000)), issuer: state.parties[E.demand(state, l.demand).buyer].name, at: at, gross: u.r2(rn + 23.5), tare: 23.5, net: rn, moisture: Number(p.destMoisture), testWeight: p.testWeight ? Number(p.testWeight) : TW[tr.commodity], grade: p.grade || null, wait: wait, simulated: true };
    const invQty = p.invoiceBasis === 'contract' ? l.planned : p.invoiceBasis === 'custom' ? Number(p.invoiceQty) : on;
    l.docs.invoice = { ref: 'F-' + (12000 + (hashOf(id + 'i') % 900)), issuer: (state.parties[l.carrier] || {}).name, at: at + 60, qty: invQty, rate: l.rate, detention: detentionFor(wait), simulated: true };
    l.status = 'delivered'; l.deliveredAt = at; l.pending = null; l.departAt = l.departAt || at - 120; l.recon = { d: {} };
    l.lastUpdate = 'Delivery simulated in Test lab';
    log('Test lab: simulated delivery of ' + id + ' (origin ' + u.t3(on) + ' t, receiving ' + u.t3(rn) + ' t, moisture ' + l.docs.receiving.moisture + '%, invoice on ' + u.t3(invQty) + ' t' + (l.docs.invoice.detention ? ', detention CAD ' + l.docs.invoice.detention : '') + ').', id, { kind: 'doc', notify: true });
    handoffRecon(l);
    emit(); return true;
  }
  function lateTicket(id) {
    const l = E.load(state, id);
    if (!l || l.status !== 'delivered' || l.docs.receiving) return fail('Choose a delivered load still waiting for its receiving ticket.');
    const tr = state.trades[l.trade];
    l.docs.receiving = l.pending && l.pending.receiving ? Object.assign({ at: state.now }, l.pending.receiving) : defaultReceiving(l, tr, state.now, 35);
    if (!l.docs.invoice) l.docs.invoice = l.pending && l.pending.invoice ? Object.assign({}, l.pending.invoice, { at: state.now }) : defaultInvoice(l, state.now, 0);
    l.pending = null;
    sys('Late receiving ticket ' + l.docs.receiving.ref + ' arrived for ' + id + ' (simulated).', id, 'ticket', true);
    handoffRecon(l);
    emit(); return true;
  }
  /* A carrier's email moves a pickup: receiving day, contract and supplier windows and detention are re-checked. */
  function reschedulePickup(id, at, src, sameRate) {
    const l = E.load(state, id);
    if (!l || !['booked', 'loading'].includes(l.status)) { fail('Only a booked load that has not left can be rescheduled.'); return null; }
    if (at == null) { fail('Choose the new pickup date and time.'); return null; }
    const imp = E.rescheduleImpact(state, l, at);
    const was = l.pickupAt;
    l.pickupAt = at; l.etaAt = imp.deliverAt; l.cutoffAt = imp.cutoff; if (l.status === 'loading') l.status = 'booked';
    if (imp.layover) { l.extraC = (l.extraC || 0) + u.toCents(D.finance.layover); l.extraNote = 'Layover CAD ' + u.rate(D.finance.layover) + ' (rescheduled past the receiving cutoff)'; }
    l.lastUpdate = 'Pickup moved to ' + u.when(at, state.now) + ' at the carrier’s request' + (src ? ' (' + src + ')' : '') + (sameRate ? ', same rate' : ', rate to confirm');
    tick(1);
    log(id + ': pickup moved from ' + u.when(was, state.now) + ' to ' + u.when(at, state.now) + ' at the carrier’s request' + (src ? ' (' + src + ')' : '') + '. ' + imp.text, id, { kind: 'missed', notify: imp.outsideContract || imp.outsideSupplier || imp.layover });
    if (imp.outsideContract) log('Drafted an amendment request to ' + imp.buyerName + ' for ' + imp.demand + ': delivery ' + u.when(imp.deliverAt, state.now) + ' is after the window end. Copied, not sent.', id, { kind: 'handoff', notify: true });
    emit(); return imp;
  }
  /* A carrier's email moves a load's ETA: checked against the receiving cutoff; the buyer's note is drafted when at risk. */
  function applyEta(id, eta, src) {
    const l = E.load(state, id);
    if (!l || !['booked', 'loading', 'transit'].includes(l.status)) { fail('Only a load that is still on its way can take a new ETA.'); return null; }
    if (eta == null) { fail('No ETA to apply.'); return null; }
    const was = l.etaAt; l.etaAt = eta;
    const risk = E.etaRisk(state, l, eta);
    const b = state.parties[E.demand(state, l.demand).buyer] || {};
    tick(1);
    l.lastUpdate = 'ETA ' + u.hhmm(eta % DAY) + ' from the carrier’s email' + (src ? ' (' + src + ')' : '') + ', was ' + u.hhmm(was % DAY);
    log(id + ': ETA ' + u.hhmm(was % DAY) + ' → ' + u.hhmm(eta % DAY) + ' from the carrier’s email' + (src ? ' (' + src + ')' : '') + '. ' + risk.text, id, { kind: 'missed', notify: risk.level !== 'ok' });
    if (risk.level !== 'ok') log('Drafted a note to ' + (b.name || 'the buyer') + ' receiving about ' + id + ': ' + (risk.level === 'late' ? 'misses the ' + u.hhmm(risk.cutoff % DAY) + ' cutoff' : 'arrives ' + risk.margin + ' min before the cutoff') + '. Copied, not sent.', id, { kind: 'handoff', notify: true });
    emit(); return risk;
  }
  function delayLoad(id, mins) {
    const l = E.load(state, id);
    if (!l || !['booked', 'loading', 'transit'].includes(l.status)) return fail('Choose a load that has not been delivered.');
    l.etaAt += mins; if (l.status !== 'transit') l.pickupAt += mins;
    sys(id + ' delayed ' + u.durationLabel(mins) + ' (simulated carrier update). New ETA ' + u.when(l.etaAt, state.now) + (l.etaAt > l.cutoffAt ? ', after the ' + u.hhmm(l.cutoffAt % DAY) + ' cutoff.' : '.'), id, 'missed', true);
    emit(); return true;
  }

  /* ---------------- Reconciliation and settlement (CT-17, CT-18) ---------------- */
  function treat(loadId, fid, choice) {
    const l = E.load(state, loadId); const rc = l.recon;
    if (rc.approved) return fail('Settlement already approved. Changes need a credit or debit note.');
    const f = E.findings(state, l).list.find((x) => x.id === fid); if (!f) return false;
    if (f.role === 'quality' && !auth().quality) return fail('Quality treatment needs the trader or a quality reviewer.');
    if (f.role === 'finance' && !auth().invoice) return fail('Invoice treatments belong to finance.');
    rc.d[fid] = { choice: choice, by: user().name, at: state.now }; tick(2);
    log(loadId + ': ' + f.title.toLowerCase() + ' treated as “' + (f.options.find((o) => o.v === choice) || {}).label + '”.', loadId);
    const nf = E.findings(state, l);
    if (nf.all) log('Handoff to finance: ' + loadId + ' is ready for settlement approval.', loadId, { kind: 'handoff', notify: true });
    emit(); return true;
  }
  function approveSettlement(loadId) {
    const l = E.load(state, loadId); const rc = l.recon;
    if (!auth().settlement) return fail('Settlement approval belongs to finance (segregation of duties).');
    const f = E.findings(state, l);
    if (!f.ready) return fail('Missing documents: ' + f.missing.join(', ') + '.');
    if (!f.all) return fail('Treat every discrepancy before approving.');
    tick(2);
    rc.approved = { at: state.now, by: user().name };
    const disputed = Object.keys(rc.d).some((k) => rc.d[k].choice === 'dispute');
    if (!disputed) { l.status = 'reconciled'; } else { l.claim = 'CF-' + loadId.slice(3); }
    log('Approved settlement package for ' + loadId + (disputed ? ' (disputed amounts kept separate, claim ' + l.claim + ')' : '') + '.', loadId);
    emit(); return true;
  }
  function exportSettlement(loadId) {
    const l = E.load(state, loadId); const rc = l.recon;
    if (!rc.approved) { fail('Only approved values can be exported.'); return null; }
    tick(1);
    rc.exported = { at: state.now, by: user().name, file: 'tradedesk-settlement-' + loadId + '.csv' };
    log('Exported approved settlement for ' + loadId + ' as CSV. Awaiting accounting acknowledgement; nothing is posted or paid yet.', loadId);
    emit(); return rc.exported.file;
  }
  function ackSettlement(loadId) {
    const l = E.load(state, loadId); const rc = l.recon;
    if (!rc.exported) return fail('Export first.');
    tick(4);
    rc.ack = { at: state.now, id: 'ACK-' + u.toDateInput(state.now) + '-' + loadId.slice(3) };
    if (!l.claim) l.status = 'settled';
    const buyer = state.parties[E.demand(state, l.demand).buyer];
    l.receivable = { ref: 'INV-' + loadId.slice(3), due: (Math.floor(state.now / DAY) + (buyer.termsDays || 15)) * DAY + 1020, paid: null };
    sys('Accounting acknowledged the ' + loadId + ' export (simulated ' + rc.ack.id + '). Invoice ' + l.receivable.ref + ' due ' + u.dayShort(l.receivable.due) + '.', loadId, 'payment', false);
    emit(); return true;
  }
  function resolveClaim(loadId, outcome) {
    const l = E.load(state, loadId); if (!l.claim) return false;
    const rc = l.recon;
    Object.keys(rc.d).forEach((k) => {
      if (!rc.d[k] || rc.d[k].choice !== 'dispute') return;
      const quality = k === 'moisture' || k === 'testweight';
      if (outcome === 'supplier') rc.d[k] = { choice: quality ? 'accept' : k === 'detention' ? 'pay' : 'accept', by: 'Retained-sample lab (simulated)', at: state.now, note: 'Re-test confirmed the destination reading' };
      else rc.d[k] = { choice: quality ? 'dispute-won' : 'dispute', by: 'Retained-sample lab (simulated)', at: state.now, note: 'Re-test supported the origin reading' };
    });
    l.claimResult = outcome; l.claim = null; l.status = rc.ack ? 'settled' : 'reconciled';
    log('Claim on ' + loadId + ' closed: ' + (outcome === 'supplier' ? 'the re-test confirmed the destination moisture; the discount stands.' : 'the re-test supported the origin reading; the buyer credits the discount back.'), loadId, { notify: true });
    emit(); return true;
  }
  function recordPayment(ref) {
    const r = state.receivables.find((x) => x.ref === ref);
    if (r) { r.paid = state.now; log('Recorded payment of ' + ref + ' (imported from accounting, simulated).', ref, { kind: 'payment', notify: true }); emit(); return true; }
    const l = state.loads.find((x) => x.receivable && x.receivable.ref === ref);
    if (l) { l.receivable.paid = state.now; log('Recorded payment of ' + ref + ' (imported from accounting, simulated).', l.id, { kind: 'payment', notify: true }); emit(); return true; }
    return false;
  }
  function draftReminder(ref) { log('Drafted a collection reminder for ' + ref + ' (copied, not sent).', ref); emit(); }

  /* ---------------- Bids and contracts ---------------- */
  function createDemand(v, silent) {
    const buyer = state.parties[v.buyer];
    if (!buyer || buyer.kind !== 'Buyer') { fail('Choose a buyer.'); return null; }
    const qty = Number(v.qty);
    if (!(qty > 0)) { fail('Quantity must be positive.'); return null; }
    if (v.priceType === 'basis' ? !(v.basis != null && v.basis !== '' && isFinite(Number(v.basis)) && v.month) : !(Number(v.price) > 0 && Number(v.price) < 2000)) { fail('Enter a flat price or a basis and futures month.'); return null; }
    if (!D.commodities[v.commodity]) { fail('Choose a commodity.'); return null; }
    if (v.priceType === 'basis' && D.commodities[v.commodity].futures !== v.month) { fail(v.month + ' does not price ' + D.commodities[v.commodity].label.toLowerCase() + '.'); return null; }
    if (v.kind !== 'Contract' && (v.validUntil == null || v.validUntil <= state.now)) { fail('A bid needs a validity time after now.'); return null; }
    if (v.windowStart == null || v.windowEnd == null || v.windowEnd < v.windowStart) { fail('Enter a valid delivery window.'); return null; }
    const id = 'DEM-0' + state.counters.demand++;
    const sites = E.sitesOf(buyer);
    const site = v.site && sites.find((x) => x.id === v.site) ? v.site : null;
    state.demands.push({ id: id, buyer: v.buyer, commodity: v.commodity, grade: v.grade || null, basisQuoted: v.basisQuoted || null, site: site, destTown: !site && v.destTown && v.destTown !== buyer.town ? v.destTown : null, qty: u.r2(qty), tolPct: Number(v.tolPct) || 0, priorAllocated: 0, priceType: v.priceType === 'basis' ? 'basis' : 'flat', price: v.priceType === 'basis' ? null : u.r2(Number(v.price)), basis: v.priceType === 'basis' ? u.r2(Number(v.basis)) : null, month: v.priceType === 'basis' ? v.month : null, windowStart: v.windowStart, windowEnd: v.windowEnd, validUntil: v.kind === 'Contract' ? null : v.validUntil, kind: v.kind || 'Open bid', contract: v.kind === 'Contract' ? 'SC-' + id.slice(4) : null, status: 'open', source: v.source || 'Manual entry', createdBy: user().name });
    const dm = state.demands[state.demands.length - 1];
    log('Created ' + (v.kind === 'Contract' ? 'sale contract ' : 'buyer bid ') + id + ': ' + buyer.short + ' ' + u.t1(qty) + ' t ' + (D.commodities[v.commodity] || {}).label + (dm.grade ? ' ' + dm.grade : '') + ' at ' + (v.priceType === 'basis' ? v.month + (Number(v.basis) >= 0 ? ' +' : ' ') + u.rate(Number(v.basis)) : 'CAD ' + u.rate(Number(v.price)) + '/t') + ' delivered ' + E.destTown(state, dm) + (dm.site && !(E.siteOf(state, dm) || {}).main ? ' (' + E.siteOf(state, dm).name + ')' : dm.destTown ? ' (not a delivery site on file: no lane history)' : '') + '.', id);
    if (!silent) emit();
    return id;
  }
  function usersOfDemand(id) { return Object.values(state.trades).filter((t) => (t.alloc && t.alloc[id]) || (t.approval && t.approval.valid && t.approval.snapshot.alloc[id])); }
  function updateDemand(id, patch, viaBuyer) {
    const d = E.demand(state, id); if (!d) return false;
    snapshotUndo('edit ' + id);
    const changed = [];
    Object.keys(patch).forEach((k) => { if (patch[k] !== d[k]) { changed.push(k); d[k] = patch[k]; } });
    if (!changed.length) return true;
    if (d.validUntil != null && d.validUntil > state.now) d.expiredNotified = false;
    usersOfDemand(id).forEach((t) => {
      if (t.approval && t.approval.valid && t.approval.snapshot.alloc[id]) {
        const acked = t.contracts.some((c) => c.party === d.buyer && c.state === 'Acknowledged');
        if (!acked && !locked(t)) invalidate(t, (viaBuyer ? 'buyer revised ' : 'edited ') + id + ' before acknowledging', 'alloc');
        else log(t.id + ' keeps its approved terms on ' + id + ': the contract stands; the revision applies to new allocations only.', t.id);
      }
    });
    log((viaBuyer ? 'Buyer revised ' : 'Edited ') + id + ': ' + changed.join(', ') + '.', id, { notify: !!viaBuyer, kind: 'bid' });
    emit(); return true;
  }
  function withdrawDemand(id, viaBuyer) {
    const d = E.demand(state, id); if (!d) return false;
    if (d.kind === 'Contract') return fail('A contract cannot be withdrawn here; amend or cancel it with the buyer.');
    snapshotUndo('withdraw ' + id);
    d.status = 'withdrawn';
    usersOfDemand(id).forEach((t) => {
      if (t.approval && t.approval.valid && t.approval.snapshot.alloc[id] && !t.contracts.some((c) => c.party === d.buyer && c.state === 'Acknowledged') && !locked(t)) invalidate(t, id + ' withdrawn by the buyer', 'alloc');
    });
    log((viaBuyer ? 'Buyer withdrew ' : 'Withdrew ') + id + '. Unapproved plans using it must find another buyer.', id, { notify: true, kind: 'bid' });
    emit(); return true;
  }
  function deleteDemand(id) {
    const d = E.demand(state, id); if (!d) return false;
    if (Math.abs(E.reservedOnDemand(state, id)) > 0.01 || d.priorAllocated) return fail('This demand holds reservations. Withdraw it instead; history is kept.');
    snapshotUndo('delete ' + id);
    state.demands = state.demands.filter((x) => x.id !== id);
    Object.values(state.trades).forEach((t) => { if (t.alloc && t.alloc[id]) delete t.alloc[id]; });
    log('Deleted bid ' + id + ' (no reservations).', id); emit(); return true;
  }

  /* ---------------- Counterparties ---------------- */
  function createParty(v) {
    const name = String(v.name || '').trim();
    if (name.length < 3) { fail('Enter the legal name.'); return null; }
    if (!['Supplier', 'Buyer', 'Carrier'].includes(v.kind)) { fail('Choose a role.'); return null; }
    let id = u.slug(name).slice(0, 28) || 'party'; while (state.parties[id]) id += '-2';
    const p = { id: id, kind: v.kind, name: name, short: v.short || name, town: v.town || '', contact: v.contact || '', lang: v.lang || 'fr', address: v.address || v.town || '', status: 'Pending', screening: 'Screened ' + u.dayShort(state.now) + ' · no potential match (simulated)', createdBy: user().name, verified: [], observations: [], cancellations: [],
      kyc: { state: 'pending', items: v.kind === 'Carrier' ? ['Operating authority (NIR/CVOR)', 'Cargo insurance certificate', 'Equipment and axle configuration'] : ['Legal entity (NEQ)', 'Signing authority', 'Bank details verified by phone'].concat(v.kind === 'Buyer' ? ['Credit report and limit'] : []) }, source: v.source || null };
    if (v.kind === 'Supplier') Object.assign(p, { terms: 'Paid 10 days after delivery', loadMins: 45, moistureDrift: 0.2 });
    if (v.kind === 'Buyer') Object.assign(p, { creditLimit: Number(v.creditLimit) || 0, otherReceivables: 0, termsDays: Number(v.termsDays) || 15, payDelayDays: 0, hours: { days: [1, 2, 3, 4, 5], open: Number(v.open) || 420, close: Number(v.close) || 960 }, unloadMins: 30, rule: { label: 'Moisture max ' + (Number(v.maxMoisture) || 15).toFixed(1) + '%; above that ' + (Number(v.shrink) || 1.4) + '% shrink and CAD ' + u.rate(Number(v.drying) || 3) + '/t drying per point.' + (v.minTestWeight ? ' Test weight min ' + v.minTestWeight + ' lb/bu.' : ''), maxMoisture: Number(v.maxMoisture) || 15, shrinkPerPt: Number(v.shrink) || 1.4, dryingPerPt: Number(v.drying) || 3, needsTestWeight: !!v.minTestWeight, minTestWeight: v.minTestWeight ? Number(v.minTestWeight) : null, version: name + ' schedule (entered ' + u.dayShort(state.now) + ')' } });
    if (v.kind === 'Carrier') Object.assign(p, { equipment: v.equipment || '8-axle B-train hopper', insurance: v.insurance || 'Certificate on file', verifiedPayload: !!v.verifiedPayload, perf: { loads: 0, onTime: 0, period: 'new', cancels90: 0, actualVsQuoted: 'n/a' }, traits: { factor: Number(v.factor) || 1.0, fsc: 0, validity: 24, spot: 2.5, spotValidMin: 180, availIn: 180, invoiceBasis: 'origin', rateSheet: {} } });
    state.parties[id] = p;
    log('Created ' + v.kind.toLowerCase() + ' ' + name + '. Status pending: ' + (v.kind === 'Carrier' ? 'logistics verifies authority, insurance and equipment' : 'finance approves the counterparty' + (v.kind === 'Buyer' ? ' and its CAD ' + u.n0(p.creditLimit) + ' credit limit' : '')) + '; the creator cannot approve it.', id, { notify: true, kind: 'handoff' });
    emit(); return id;
  }
  function approveParty(id) {
    const p = state.parties[id]; if (!p || p.status !== 'Pending') return false;
    const need = p.kind === 'Carrier' ? ['logistics', 'manager'] : ['finance', 'manager'];
    if (!need.includes(state.role)) return fail((p.kind === 'Carrier' ? 'Logistics' : 'Finance') + ' approves new ' + p.kind.toLowerCase() + 's.');
    if (p.createdBy === user().name) return fail('Segregation of duties: the person who created ' + p.name + ' cannot approve it.');
    p.status = 'Approved'; p.approvedBy = user().name; if (p.kyc) p.kyc = Object.assign({}, p.kyc, { state: 'verified', by: user().name, at: state.now }); p.verified = p.verified.concat([(p.kind === 'Buyer' ? 'Credit limit CAD ' + u.n0(p.creditLimit) + ' approved' : p.kind === 'Carrier' ? 'Authority and insurance verified' : 'Supplier approved') + ' by ' + user().name + ', ' + u.dayShort(state.now)]);
    tick(2);
    log('Approved ' + p.name + ' (' + p.kind.toLowerCase() + ').', id);
    emit(); return true;
  }
  function updateParty(id, patch) {
    const p = state.parties[id]; if (!p) return false;
    snapshotUndo('edit ' + p.name);
    if (patch.creditLimit != null && Number(patch.creditLimit) !== p.creditLimit) { if (!auth().credit) return fail('Credit limits change only with finance approval.'); }
    Object.keys(patch).forEach((k) => {
      if (k === 'maxMoisture' || k === 'shrink' || k === 'drying') { p.rule = Object.assign({}, p.rule, { [k === 'maxMoisture' ? 'maxMoisture' : k === 'shrink' ? 'shrinkPerPt' : 'dryingPerPt']: Number(patch[k]) }); p.rule.label = 'Moisture max ' + p.rule.maxMoisture.toFixed(1) + '%; above that ' + p.rule.shrinkPerPt + '% shrink and CAD ' + u.rate(p.rule.dryingPerPt) + '/t drying per point.'; }
      else p[k] = k === 'creditLimit' ? Number(patch[k]) : patch[k];
    });
    log('Edited ' + p.name + ': ' + Object.keys(patch).join(', ') + '.', id);
    emit(); return true;
  }
  function deleteParty(id) {
    const p = state.parties[id]; if (!p) return false;
    const used = Object.values(state.trades).some((t) => t.supplier === id) || state.demands.some((d) => d.buyer === id) || state.loads.some((l) => l.carrier === id || l.cancelledCarrier === id);
    if (used) return fail(p.name + ' is referenced by trades, bids or loads. Put it on hold instead.');
    snapshotUndo('delete ' + p.name);
    delete state.parties[id];
    log('Deleted counterparty ' + p.name + ' (never used).', id); emit(); return true;
  }

  /* ---------------- Market ---------------- */
  function setBenchmark(id, value) {
    const b = state.benchmarks[id]; const v = Number(value);
    if (!(v > 0)) return fail('Enter a positive price.');
    const old = b.value;
    b.value = Math.round(v * 10000) / 10000; b.at = state.now; b.by = user().name;
    log('Entered ' + id + ' ' + b.value.toFixed(4) + ' ' + b.unit + (old !== b.value ? ' (was ' + old.toFixed(4) + ')' : ' (refreshed, unchanged)') + '. Manual entry; basis bids and mark-to-market re-price.', id, { kind: 'market', notify: old !== b.value });
    emit(); return true;
  }
  function moveFutures(id, delta) { const b = state.benchmarks[id]; return setBenchmark(id, b.value + Number(delta)); }
  function setBasis(demId, basis) { const d = E.demand(state, demId); if (!d || d.priceType !== 'basis') return fail('Choose a basis-priced bid.'); return updateDemand(demId, { basis: u.r2(Number(basis)) }, true); }

  /* ---------------- Injected messages (Test lab) ---------------- */
  function pushMessage(m) { const id = 'MSG-' + String(state.counters.msg++).padStart(4, '0'); state.messages.unshift(Object.assign({ id: id, at: state.now, status: 'review', injected: true }, m)); return id; }
  function injectSupplierRevision(tid, loads, moisture, lang) {
    const tr = state.trades[tid]; if (!tr) return false;
    const sup = state.parties[tr.supplier] || { contact: 'Supplier', name: 'Supplier' };
    const who = (sup.contact || '').split(' ')[0] || 'Le vendeur';
    const body = lang === 'en' ? D.templates.revisionEn(who, loads, moisture) : D.templates.revisionFr(who, loads, moisture);
    const id = pushMessage({ from: sup.contact, org: sup.name, party: sup.id, subject: (lang === 'en' ? 'Update on ' : 'Mise à jour ') + tid, lang: lang, kind: 'Revision', body: body, target: tid });
    sys('Revision email from ' + sup.name + ' about ' + tid + ' (' + id + ').', id, 'revision', true);
    emit(); return id;
  }
  function applyRevision(msgId) {
    const ex = state.extraction[msgId]; const m = state.messages.find((x) => x.id === msgId);
    if (!ex || !m) return false;
    const tr = state.trades[m.target]; if (!tr) return fail('Choose the trade this revision applies to.');
    const v = ex.values; const patch = {};
    if (v.qtyValue != null && v.qtyUnit === 'loads' && v.qtyValue !== tr.qtyLoads) patch.qtyLoads = v.qtyValue;
    if (v.moisture != null && v.moisture !== tr.moisture) patch.moisture = v.moisture;
    if (v.price != null && v.priceUnit === 'CAD/t' && v.price !== tr.price) patch.price = v.price;
    if (!Object.keys(patch).length) return fail('Nothing in this revision changes ' + tr.id + '.');
    const okk = updateTrade(tr.id, patch);
    if (okk) { m.status = 'processed'; m.link = { type: 'trade', id: tr.id, label: 'Applied to ' + tr.id }; ex.created = tr.id; emit(); }
    return okk;
  }
  function injectBidRevision(demId, price, qty) {
    const d = E.demand(state, demId); if (!d) return false;
    const b = state.parties[d.buyer];
    const patch = {}; if (price != null && price !== '' && d.priceType === 'flat') patch.price = u.r2(Number(price)); if (qty != null && qty !== '') patch.qty = u.r2(Number(qty));
    pushMessage({ from: b.contact, org: b.name, party: b.id, subject: 'Revised bid ' + demId, lang: 'en', kind: 'Bid revision', status: 'processed', body: D.templates.bidReviseEn((b.contact || '').split(' ')[0], patch.price != null ? u.rate(patch.price) : u.rate(E.demandPrice(state, d).price), patch.qty != null ? patch.qty : d.qty), link: { type: 'demand', id: demId, label: 'Applied to ' + demId } });
    return updateDemand(demId, patch, true);
  }
  function injectBidWithdraw(demId) {
    const d = E.demand(state, demId); if (!d) return false; const b = state.parties[d.buyer];
    pushMessage({ from: b.contact, org: b.name, party: b.id, subject: 'Withdraw ' + demId, lang: 'en', kind: 'Bid revision', status: 'processed', body: D.templates.bidWithdrawEn((b.contact || '').split(' ')[0]), link: { type: 'demand', id: demId, label: 'Withdrawn ' + demId } });
    return withdrawDemand(demId, true);
  }
  function injectEmail(m) { const id = pushMessage(m); sys('New email from ' + m.org + ' (' + id + ').', id, 'offer', true); emit(); return id; }

  /* ---------------- Paste intake ---------------- */
  /* Who is this? Fuzzy-match the signature, the self-introduction and distinctive name words against the
     counterparty records ("Gendron" → Ferme Gendron et Fils). A town match is a last resort and stays inferred. */
  const fold = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const STOP = new Set(['ferme', 'farm', 'farms', 'fils', 'inc', 'ltee', 'ltd', 'les', 'grains', 'grain', 'transport', 'saint', 'sainte', 'vrac', 'logistique', 'camionnage', 'terminal', 'moulee', 'provenderie', 'provende', 'trituration', 'ethanol', 'meunerie', 'coop', 'dispatch', 'et', 'de', 'du', 'des', 'la', 'le', 'the', 'and', 'sur']);
  const toks = (x) => fold(x).split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !STOP.has(t));
  /* Who is this? Never attributed silently, never by location, never by a company named in the body.
     The sender comes only from the header, the domain or the signature. Strong evidence selects, in this order:
     the email domain on file, the signature or self-introduction company (fuzzy), the sender's full name as a contact on file (a load ID and the
     sender's address on file are handled by the caller). Weak evidence only suggests, for the trader to confirm:
     a single name word, a first name or surname alone, a town. A signature naming a company that is not on file
     is a new sender: nothing is suggested from weaker clues. */
  const bareName = (x) => fold(x).replace(/\b(inc|ltee|ltd|enr|senc)\b\.?/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const domainCore = (d) => String(d || '').toLowerCase().replace(/\.[a-z]{2,}$/, '').replace(/[^a-z0-9]/g, '');
  function guessParty(text, intent, sender, email) {
    const low = fold(text);
    const kind = intent === 'Buyer demand' ? 'Buyer' : intent === 'Supply offer' || intent === 'Revision' ? 'Supplier' : /Carrier|Freight/.test(intent || '') ? 'Carrier' : null;
    const all = Object.values(state.parties);
    const ps = all.filter((p) => !kind || p.kind === kind);
    if (email && email.domain) {
      const d = email.domain.toLowerCase();
      const byDomain = all.find((p) => (p.domains || []).some((x) => d === x || d.slice(-(x.length + 1)) === '.' + x));
      if (byDomain) return { id: byDomain.id, strength: 'strong', how: 'email domain ' + d, span: email.span, score: 10 };
    }
    const word = (t) => { const m = new RegExp('(^|[^a-z0-9])' + t + '([^a-z0-9]|$)').exec(low); return m ? [m.index + m[1].length, m.index + m[1].length + t.length] : null; };
    const phrase = (t) => { if (!t || t.length < 8 || t.indexOf(' ') < 0) return null; const i = (' ' + low.replace(/[^a-z0-9]+/g, ' ') + ' ').indexOf(' ' + t + ' '); return i >= 0; };
    let best = null;
    ps.forEach((p) => {
      let strong = 0; let weak = 0; let sp = null; let how = ''; let whow = '';
      const townToks = toks(p.town);
      const names = [...new Set(toks(p.name).concat(toks(p.short)))].filter((t) => !townToks.includes(t)); // "Trituration Bécancour" in Bécancour: the town word is not a name match
      const contact = fold((p.contact || '').replace(/^Dispatch:\s*/i, ''));
      const cParts = contact.split(/\s+/).filter(Boolean);
      if (sender && sender.company && (bareName(sender.company) === bareName(p.name) || bareName(sender.company) === bareName(p.short))) { strong += 6; how = 'signature “' + sender.company + '”'; }
      else if (sender && sender.company) { const hit = toks(sender.company).filter((t) => names.includes(t)).length; if (hit) { strong += 3 * hit + 1; how = 'signature “' + sender.company + '”'; } }
      // A company named in the body is an entity the message refers to (a pickup site, a buyer), never the sender:
      // at most a weak suggestion, and only when the header, domain and signature name no company.
      if (!how && !(sender && sender.company) && (phrase(bareName(p.name)) || phrase(bareName(p.short)))) { weak += 3; whow = 'company “' + (phrase(bareName(p.short)) ? p.short : p.name) + '” named in the text, not in the signature'; }
      const otherCo = sender && sender.company && !strong;
      if (sender && sender.person) {
        const pf = fold(sender.person); const pp = pf.split(/\s+/);
        if (contact && pf === contact) { strong += 4; how = how || 'sender name “' + sender.person + '”'; }
        else if (!otherCo && cParts.length > 1 && pp.length > 1 && pp[pp.length - 1] === cParts[cParts.length - 1] && pp[pp.length - 1].length >= 4) { weak += 2; whow = whow || 'surname “' + sender.person + '” only'; }
        else if (!otherCo && pp.length === 1 && cParts[0] === pp[0]) { weak += 1; whow = whow || 'first name “' + sender.person + '” matches ' + p.contact.replace(/^Dispatch:\s*/i, ''); }
      }
      if (!otherCo) names.forEach((t) => { const w = word(t); if (w) { weak += 2; sp = sp || w; whow = whow || 'name word “' + text.slice(w[0], w[1]) + '” only'; } });
      const score = strong * 10 + weak;
      // Evidence span: the signature itself for a signature match, the name word only for a weak match.
      if (score && (!best || score > best.score)) best = { id: p.id, score: score, span: strong && /^signature|^sender name/.test(how) ? (sender.companySpan || sender.span || null) : sp, how: how || whow, strength: strong ? 'strong' : 'weak' };
    });
    // An email address on file for nobody: a name in the text can only suggest.
    if (best && best.strength === 'strong' && email && email.domain) { best.strength = 'weak'; best.how += ', but the sender’s domain ' + email.domain + ' is not on file for them'; }
    if (best) return best;
    if ((kind === 'Supplier' || kind === 'Buyer') && !(sender && sender.company)) {
      let hit = null;
      ps.forEach((p) => { if (hit || !p.town) return; const t = fold(p.town); const i = low.indexOf(t); if (i >= 0) hit = { id: p.id, span: [i, i + t.length], how: 'town “' + p.town + '” only', strength: 'weak', score: 1 }; });
      if (hit) return hit;
    }
    return null;
  }
  /* Fill the counterparty only on strong evidence; show weaker evidence as a suggestion; propose creating one from the signature. */
  function matchParty(parsed, values, text) {
    const sender = parsed.fields.sender || null;
    values.partyHint = null;
    if (values.party) { values.partyHow = values.partyHow || 'sender address on file'; return; }
    // A carrier message about a load: the load's booking says who the carrier is.
    if (/^(Carrier|Freight)/.test(values.intent || '') && values.loadRef) {
      const l = E.load(state, values.loadRef); const cid = l ? l.carrier || l.cancelledCarrier : null;
      if (cid && state.parties[cid]) { values.party = cid; values.partyHow = 'load ID ' + l.id + ' (booked with ' + state.parties[cid].short + ')'; parsed.fields.counterparty = { value: cid, status: 'inferred', span: parsed.fields.loadRef ? parsed.fields.loadRef.span : null, note: 'Matched on ' + values.partyHow + '.' }; return; }
    }
    const g = guessParty(text, values.intent === 'Unclear' ? null : values.intent, sender, parsed.fields.email);
    if (g && g.strength === 'strong') { values.party = g.id; values.partyHow = g.how; parsed.fields.counterparty = { value: g.id, status: 'inferred', span: g.span || (sender ? sender.span : null), note: 'Matched on ' + g.how + '.' }; return; }
    if (g) values.partyHint = { id: g.id, how: g.how, span: g.span || null };
    if (sender && (sender.company || sender.person) && (values.intent === 'Supply offer' || values.intent === 'Buyer demand' || values.intent === 'Freight quote')) {
      const kind = values.intent === 'Buyer demand' ? 'Buyer' : values.intent === 'Freight quote' ? 'Carrier' : 'Supplier';
      values.partySuggest = { kind: kind, name: sender.company || sender.person, contact: sender.person || '', town: values.intent === 'Supply offer' ? values.origin || '' : values.intent === 'Buyer demand' ? values.destination || '' : '', lang: values.lang || 'fr', equipment: kind === 'Carrier' ? values.equipment || '' : '', domain: parsed.fields.email ? parsed.fields.email.domain : '' };
    }
  }
  /* A sender domain that imitates one on file ("grains-desrosiers.net" for grainsdesrosiers.ca) is flagged. */
  function domainFlag(parsed) {
    const em = parsed.fields.email; if (!em || !em.domain) return;
    const d = em.domain; const core = domainCore(d);
    const onFile = Object.values(state.parties).some((p) => (p.domains || []).some((x) => d === x || d.slice(-(x.length + 1)) === '.' + x));
    if (onFile) return;
    const twin = Object.values(state.parties).find((p) => (p.domains || []).some((x) => domainCore(x) === core));
    if (twin) parsed.flags.push({ text: 'Sender domain ' + d + ' imitates ' + twin.domains[0] + ' (' + twin.name + ') but is not on file. Treated as content only: verify through a known contact.', span: em.span });
  }
  /* Reschedules: the supplier site named, the loads that match (carrier, pickup day and time, site), the impact. */
  function supplierByName(txt) {
    const tk = toks(txt); if (!tk.length) return null;
    return Object.values(state.parties).filter((p) => p.kind === 'Supplier').find((p) => { const n = toks(p.name).concat(toks(p.short)).concat(toks((p.contact || '').split(' ').slice(-1)[0])); return tk.some((t) => n.includes(t)); }) || null;
  }
  function resolveReschedule(v) {
    if (v.intent !== 'Carrier reschedule') return;
    const sup = v.rsSiteText ? supplierByName(v.rsSiteText) : null;
    v.rsSite = sup ? sup.id : null;
    let cands = state.loads.filter((l) => ['booked', 'loading'].includes(l.status));
    const basis = [];
    if (v.rsLoadChosen) { cands = cands.filter((l) => l.id === v.rsLoadChosen); basis.push('your choice'); }
    else if (v.loadRef) { cands = cands.filter((l) => l.id === v.loadRef); basis.push('load ID ' + v.loadRef); }
    else {
      if (!v.party && v.rsFromDay == null && !v.rsSite) cands = [];
      if (v.party) { cands = cands.filter((l) => l.carrier === v.party); basis.push('carrier'); }
      if (v.rsFromDay != null) { cands = cands.filter((l) => Math.floor(l.pickupAt / DAY) === v.rsFromDay); basis.push('pickup day'); }
      if (v.rsFromMins != null) { cands = cands.filter((l) => l.pickupAt % DAY === v.rsFromMins); basis.push('pickup time'); }
      if (v.rsSite) { cands = cands.filter((l) => (state.trades[l.trade] || {}).supplier === v.rsSite); basis.push('site'); }
    }
    v.loadMatches = cands.map((l) => ({ id: l.id, pickupAt: l.pickupAt, basis: basis.join(', ') }));
    v.loadNear = null; v.rsLoad = null; v.rsImpact = null;
    if (!cands.length) {
      const ref = v.rsFrom != null ? v.rsFrom : state.now;
      const near = state.loads.filter((l) => ['booked', 'loading'].includes(l.status) && ((v.party && l.carrier === v.party) || (v.rsSite && (state.trades[l.trade] || {}).supplier === v.rsSite))).sort((a, b) => Math.abs(a.pickupAt - ref) - Math.abs(b.pickupAt - ref));
      const inDay = near.filter((l) => Math.abs(l.pickupAt - ref) <= DAY + 720);
      v.loadNear = (inDay.length ? inDay : near.slice(0, 2)).slice(0, 4).map((l) => l.id); v.loadNearWithinDay = inDay.length > 0;
      return;
    }
    if (cands.length > 1) return;
    const l = cands[0];
    v.rsLoad = l.id;
    if (v.rsFrom == null) { v.rsFrom = l.pickupAt; v.rsFromDay = Math.floor(l.pickupAt / DAY); v.rsFromMins = l.pickupAt % DAY; }
    if (v.rsToDay != null && !v.rsToTimeStated) v.rsTo = v.rsToDay * DAY + (l.pickupAt % DAY);
    if (v.rsTo != null) v.rsImpact = E.rescheduleImpact(state, l, v.rsTo);
  }
  function newPasteKey() { state.counters.paste = (state.counters.paste || 0) + 1; return 'PASTE-' + state.counters.paste; }
  function setPaste(text, origin) {
    const key = newPasteKey();
    state.paste = { key: key, text: String(text).slice(0, 4000), from: origin || 'Pasted text', at: state.now };
    runRules(key, state.paste.text, null);
    emit({ soft: true });
    return key;
  }
  /* Live AI on pasted text: the bridge fills the extraction under a new key. */
  function setPasteText(text, origin) { const key = newPasteKey(); state.paste = { key: key, text: String(text).slice(0, 4000), from: origin || 'Pasted text', at: state.now }; return key; }
  function clearPaste() { state.paste = null; emit({ soft: true }); }

  /* ---------------- Policy (CT-21) ---------------- */
  function setPolicy(k, v) { if (state.policy.status === 'simulation') return fail('Policy is in its simulation period. Withdraw it to edit.'); state.policy[k] = v; emit({ soft: true }); }
  function submitPolicy() { state.policy.status = 'submitted'; state.policy.submittedBy = user().name; tick(1); log('Submitted replacement-carrier policy for manager review (simulation only).', 'POLICY', { kind: 'handoff', notify: true }); emit(); }
  function approvePolicy() { if (!auth().policy) return fail('Only the desk manager can approve automation policies.'); state.policy.status = 'simulation'; state.policy.approvedBy = user().name; tick(1); log('Approved a 30-day simulation period for the replacement-carrier policy. No external execution.', 'POLICY'); emit(); return true; }
  function withdrawPolicy() { state.policy.status = 'draft'; tick(1); log('Withdrew the replacement-carrier policy to draft.', 'POLICY'); emit(); }

  function logAi(text, ref) { log(text, ref, { kind: 'ai' }); save(); }
  function setRole(r) { if (!D.users[r] || state.role === r) return; state.role = r; emit(); ok('Now acting as ' + D.users[r].name + ' (' + D.users[r].title + ').'); }
  function markNotifsRead() { state.notifSeen = state.events.length ? state.events[state.events.length - 1].id : 0; emit({ soft: true }); }

  /* ---------------- Workspace: reset, export, import, scenarios ---------------- */
  function reset() {
    timers.forEach(clearTimeout); timers.length = 0; undoStack.length = 0;
    state = initialState();
    try { if (u.caps.storage) { window.localStorage.removeItem(D.storageKey); window.localStorage.removeItem(D.storageKey + ':tour'); } } catch (e) { /* blocked */ }
    emit({ reset: true });
  }
  function exportJson() { return JSON.stringify({ app: 'commtrader-v3', v: D.version, exportedFrom: 'TradeDesk V3 Test lab', state: state }, null, 1); }
  function importJson(text) {
    let o;
    try { o = JSON.parse(text); } catch (e) { return fail('That file is not valid JSON.'); }
    const s = o && o.state;
    if (!o || o.app !== 'commtrader-v3' || !s || s.v !== D.version || !s.trades || !s.loads || !s.parties) return fail('This is not a TradeDesk V3 workspace export (version ' + D.version + ').');
    timers.forEach(clearTimeout); timers.length = 0;
    snapshotUndo('import');
    state = s; finishPending();
    log('Imported a workspace export (' + Object.keys(s.trades).length + ' trades, ' + s.loads.length + ' loads).', 'WORKSPACE', { kind: 'system' });
    emit({ reset: true });
    return true;
  }

  const SCENARIOS = [
    { id: 'morning', label: 'Friday morning (default)', desc: 'The seeded desk at 09:40: a new offer, a cancelled truck, a moisture claim.', run: () => {} },
    { id: 'approved', label: 'Offer approved, freight to book', desc: 'Michel’s corn is extracted, confirmed and approved; logistics has to tender freight.', run: () => { const k = 'MSG-0884'; openMessage(k); acceptAll(k); const id = createFromExtraction(k); confirmSupplier(id); approveTrade(id); } },
    { id: 'rolling', label: 'Tuesday, loads rolling', desc: 'Everything booked and the incident resolved; clock at Tue Oct 27 10:00 with loads delivered, moving and waiting for tickets.', run: () => { SCENARIOS[1].run(); const id = state.extraction['MSG-0884'].created; state.role = 'logistics'; sendRfq(id); finishPending(); award(id, 'berard'); finishPending(); requestAppts(id); finishPending(); state.role = 'trader'; approveReplacementInstant('EX-0317'); runClockTo(T(4, 10, 0)); } },
    { id: 'storm', label: 'Cancellation storm', desc: 'Two more carriers cancel today’s loads on top of EX-0317.', run: () => { openCancellation('LD-4088', true); openCancellation('LD-4092', true); } },
    { id: 'expiry', label: 'Monday: quotes expired, cutoff missed', desc: 'Freight quotes from Friday were never awarded; clock at Mon Oct 26 13:00. Every quote and Moulée Richelieu’s bid have expired, and EX-0317 missed its cutoff.', run: () => { SCENARIOS[1].run(); const id = state.extraction['MSG-0884'].created; state.role = 'logistics'; sendRfq(id); finishPending(); state.role = 'trader'; runClockTo(T(3, 13, 0)); } },
    { id: 'monthend', label: 'Month-end close', desc: 'Loads rolling, then the clock jumps to Fri Nov 6: many loads to reconcile, receivables due or overdue.', run: () => { SCENARIOS[2].run(); runClockTo(T(14, 9, 0)); } },
    { id: 'rally', label: 'Futures rally', desc: 'CZ26 +0.25 USD/bu and SX26 refreshed: basis bids re-price and the uncovered corn long marks to market.', run: () => { setBenchmark('CZ26', 4.565); setBenchmark('SX26', 10.4625); } }
  ];
  function approveReplacementInstant(exId) {
    const ex = state.exceptions[exId]; if (!ex || ex.status !== 'open') return;
    const r = state.role; state.role = 'logistics';
    approveReplacement(exId); timers.forEach(clearTimeout); timers.length = 0;
    if (ex.status === 'revalidating') ex.status = 'awaiting';
    completeReplacement(exId); state.role = r;
  }
  function loadScenario(id) {
    const sc = SCENARIOS.find((x) => x.id === id); if (!sc) return false;
    timers.forEach(clearTimeout); timers.length = 0; undoStack.length = 0;
    state = initialState();
    const quiet = TD.ui ? TD.ui.toast : null; if (TD.ui) TD.ui.toast = function () {};
    try { sc.run(); finishPending(); } finally { if (TD.ui && quiet) TD.ui.toast = quiet; }
    log('Test lab: loaded scenario “' + sc.label + '”.', 'SCENARIO', { kind: 'system', who: 'Test lab', role: 'service' });
    emit({ reset: true });
    return true;
  }

  /* ---------------- Queues: who needs to do what next (handoffs) ---------------- */
  function queue(role) {
    const s = state; const out = [];
    const push = (o) => out.push(Object.assign({ role: role }, o));
    if (role === 'trader' || role === 'manager') {
      s.messages.forEach((m) => { if (isExtractable(m) && m.status === 'review') push({ kind: 'offer', sev: 'new', ref: m.id, title: m.kind + ' from ' + m.org, href: '#/inbox/' + m.id }); });
      Object.values(s.trades).forEach((t) => {
        if (t.status === 'open' || (t.approval && !t.approval.valid && t.status !== 'cancelled')) {
          const res = E.approvalChecks(s, t, role); const block = res.checks.find((c) => c.block);
          if (role === 'manager' && !res.checks.some((c) => c.manager || /manager/i.test(c.text))) return;
          push({ kind: 'approve', sev: block ? 'medium' : 'new', ref: t.id, title: (t.approval && !t.approval.valid ? 'Re-approve ' : 'Price and approve ') + t.id + ' (' + (D.commodities[t.commodity] || {}).label.toLowerCase() + ', ' + ((s.parties[t.supplier] || {}).short || (s.parties[t.supplier] || {}).name || 'unidentified supplier') + ')', note: block ? block.text : 'Ready to approve', href: '#/trade/' + t.id + '/' + (t.approval || Object.keys(t.alloc).length ? 'approve' : 'price') });
        }
      });
      if (role === 'trader') {
        s.loads.forEach((l) => { const f = E.findings(s, l); if (f.ready && !l.recon.approved) f.list.filter((x) => x.role === 'quality' && !l.recon.d[x.id]).forEach((x) => push({ kind: 'quality', sev: 'medium', ref: l.id, title: x.title + ' on ' + l.id, money: x.amount, href: '#/settle/' + l.id })); });
        s.messages.forEach((m) => { if (m.kind === 'Revision' && m.status === 'review') push({ kind: 'revision', sev: 'medium', ref: m.id, title: 'Supplier revision for ' + m.target, href: '#/inbox/' + m.id }); });
      }
    }
    if (role === 'logistics' || role === 'manager' || role === 'trader') {
      Object.values(s.exceptions).forEach((ex) => { if (ex.status !== 'resolved') push({ kind: 'exception', sev: 'high', ref: ex.id, title: 'Replace the carrier on ' + ex.load, note: ex.cutoffMissed ? 'Receiving cutoff missed' : ex.pickupMissed ? 'Pickup time passed' : ex.quotesExpiredAt ? 'Quotes expired: re-quote' : 'Prepared alternatives ready', href: '#/load/' + ex.load }); });
    }
    if (role === 'logistics') {
      Object.values(s.trades).forEach((t) => {
        if (!t.approval || !t.approval.valid || !Object.values(t.approval.snapshot.alloc).some((n) => n)) return;
        if (!t.rfq) push({ kind: 'rfq', sev: 'new', ref: t.id, title: 'Tender freight for ' + t.id, href: '#/trade/' + t.id + '/freight' });
        else if (!t.rfq.award) push({ kind: 'rfq', sev: t.rfq.quotes.some((q) => E.quoteStatus(s, q) === 'valid') ? 'new' : 'medium', ref: t.id, title: (t.rfq.quotes.some((q) => E.quoteStatus(s, q) === 'valid') ? 'Award freight for ' : 'Re-quote expired freight for ') + t.id, href: '#/trade/' + t.id + '/freight' });
        else if (t.rfq.award.state === 'accepted' && (!t.appts || t.appts.state === 'failed')) push({ kind: 'appts', sev: 'new', ref: t.id, title: 'Book appointments for ' + t.id, href: '#/trade/' + t.id + '/freight' });
      });
      Object.values(s.parties).forEach((p) => { if (p.kind === 'Carrier' && p.status === 'Pending') push({ kind: 'party', sev: 'new', ref: p.id, title: 'Verify new carrier ' + p.name, href: '#/book' }); });
      s.loads.forEach((l) => { if (l.status === 'transit' && l.etaAt > l.cutoffAt && !l.missedCutoff) push({ kind: 'late', sev: 'medium', ref: l.id, title: l.id + ' will arrive after the receiving cutoff', href: '#/load/' + l.id }); });
    }
    if (role === 'finance') {
      s.loads.forEach((l) => {
        const f = E.findings(s, l); if (!f.ready || l.recon.ack) return;
        f.list.filter((x) => x.role === 'finance' && !l.recon.d[x.id]).forEach((x) => push({ kind: 'invoice', sev: 'medium', ref: l.id, title: x.title + ' on ' + l.id, money: x.amount, href: '#/settle/' + l.id }));
        if (f.all && !l.recon.approved) push({ kind: 'settle', sev: 'new', ref: l.id, title: 'Approve the settlement of ' + l.id, href: '#/settle/' + l.id });
        if (l.recon.approved && !l.recon.exported) push({ kind: 'export', sev: 'new', ref: l.id, title: 'Export ' + l.id + ' to accounting', href: '#/settle/' + l.id });
        if (l.recon.exported && !l.recon.ack) push({ kind: 'ack', sev: 'low', ref: l.id, title: 'Waiting for the accounting acknowledgement of ' + l.id, href: '#/settle/' + l.id });
      });
      E.receivables(s).forEach((r) => { if (r.state === 'overdue') push({ kind: 'overdue', sev: 'high', ref: r.ref, title: r.ref + ' is ' + r.daysLate + ' days overdue (' + (s.parties[r.party] || {}).short + ')', money: u.toCents(r.amount), href: '#/settle' }); });
      Object.values(s.parties).forEach((p) => { if ((p.kind === 'Buyer' || p.kind === 'Supplier') && p.status === 'Pending') push({ kind: 'party', sev: 'new', ref: p.id, title: 'Approve new ' + p.kind.toLowerCase() + ' ' + p.name + (p.creditLimit ? ' (credit CAD ' + u.n0(p.creditLimit) + ')' : ''), href: '#/book' }); });
    }
    if (role === 'manager' && s.policy.status === 'submitted') push({ kind: 'policy', sev: 'new', ref: 'POLICY', title: 'Review the replacement-carrier policy (simulation)', href: '#/review' });
    return out;
  }

  TD.store = { guessParty, finishValues, standingFor, fqWhere, load, save, get, subscribe, emit, initialState, nextMilestone, locked, queue, extractionMissing, extractionReady, parseWindow, valuesFromParse, exportJson, importJson, SCENARIOS, upcoming, undoCount: () => undoStack.length, undoLabel: () => (undoStack.length ? undoStack[undoStack.length - 1].label : null), isExtractable, runRules };
  TD.act = { openMessage, setValue, acceptField, acceptAll, createFromExtraction, setExtraction, createTrade, updateTrade, cancelTrade, setScenario, selectDemand, setUnit, setAlloc, setFreightManual, confirmSupplier, approveTrade, revisePlan, sendConfirmations, sendRfq, refreshQuote, requoteAll, addManualQuote, award, requestAppts, advance, advanceTo, advanceLoad, cancelLoad, markWatch, attachBol, reviewFlag, openCancellation, chooseOption, requoteException, verifyCarrier, approveReplacement, simulateDelivery, lateTicket, delayLoad, treat, approveSettlement, exportSettlement, ackSettlement, resolveClaim, recordPayment, draftReminder, createDemand, updateDemand, withdrawDemand, deleteDemand, createParty, approveParty, updateParty, deleteParty, setBenchmark, moveFutures, setBasis, injectSupplierRevision, applyRevision, injectBidRevision, injectBidWithdraw, injectEmail, setPaste, setPasteText, clearPaste, attachFq, setFqTarget, setReplyMode, applyEta, reschedulePickup, setPolicy, submitPolicy, approvePolicy, withdrawPolicy, logAi, setRole, markNotifsRead, reset, loadScenario, undo };
})();
