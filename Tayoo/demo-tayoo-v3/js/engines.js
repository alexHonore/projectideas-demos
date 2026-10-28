/* Tayoo V3 — generic engines shared by every module:
   calendar conflicts and travel, CRUD for clients/tasks/events/notes/transactions, the transaction date check,
   the CMA engine, the demo clock rules, Test lab events, presets, search, outbox and workspace import/export. */
(function () {
  'use strict';
  var T = (window.Tayoo = window.Tayoo || {});
  var S = function () { return T.store.state; };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function addMin(hhmm, m) { var p = hhmm.split(':'), t = +p[0] * 60 + +p[1] + m; t = Math.max(0, Math.min(t, 23 * 60 + 59)); return T.pad(Math.floor(t / 60)) + ':' + T.pad(t % 60); }
  function minsBetween(a, b) { var x = a.split(':'), y = b.split(':'); return (+y[0] * 60 + +y[1]) - (+x[0] * 60 + +x[1]); }
  T.addMin = addMin;
  T.tzLabel = function (date) { return (date || T.today()) < '2026-11-01' ? 'Eastern Time (EDT until Nov 1)' : 'Eastern Time (EST since Nov 1)'; };

  /* ======================= calendar ======================= */
  var C = (T.cal = {});
  C.travel = function (a, b) {
    if (!a || !b) return 0;
    if (a === b) return 5;
    var A = T.AREAS[a], B = T.AREAS[b];
    if (!A || !B) return 15;
    var d = Math.sqrt(Math.pow(A[0] - B[0], 2) + Math.pow(A[1] - B[1], 2));
    var river = (a === 'Lévis') !== (b === 'Lévis') ? 12 : 0;
    return Math.round(5 + d * 2.2 + river);
  };
  C.areaOf = function (e) {
    if (!e || e.kind === 'call') return '';
    if (e.area) return e.area;
    var L = e.listing && T.listing(e.listing);
    if (L) return L.area;
    var c = e.client && T.client(e.client);
    return c ? c.area : '';
  };
  C.active = function () { return S().appointments.filter(function (a) { return a.status !== 'cancelled'; }); };
  // Overlaps, plus travel-time gaps that are too short between two in-person events (estimates)
  C.conflicts = function (e, ignoreId) {
    var out = [], area = C.areaOf(e);
    C.active().forEach(function (a) {
      if (a.id === ignoreId || a.id === e.id || a.date !== e.date) return;
      if (a.start < e.end && e.start < a.end) { out.push({ type: 'overlap', other: a }); return; }
      var oa = C.areaOf(a);
      if (!area || !oa) return;
      var need = C.travel(oa, area);
      if (a.end <= e.start) { var gap = minsBetween(a.end, e.start); if (gap < need) out.push({ type: 'travel', other: a, gap: gap, need: need, from: oa, to: area }); }
      else if (e.end <= a.start) { var gap2 = minsBetween(e.end, a.start); var need2 = C.travel(area, oa); if (gap2 < need2) out.push({ type: 'travel', other: a, gap: gap2, need: need2, from: area, to: oa, after: true }); }
    });
    return out;
  };
  C.describe = function (x) {
    if (x.type === 'overlap') return 'Overlaps ' + x.other.title.toLowerCase() + (x.other.place ? ', ' + x.other.place : '') + ', ' + T.fmtTime(x.other.start) + ' to ' + T.fmtTime(x.other.end) + '.';
    return (x.after ? 'Leaves ' : 'Only ') + x.gap + ' min ' + (x.after ? 'before ' : 'after ') + x.other.title.toLowerCase() + ' (' + T.fmtTime(x.after ? x.other.start : x.other.end) + '); travel ' + x.from + ' → ' + x.to + ' is about ' + x.need + ' min (estimate).';
  };
  C.suggest = function (date, dur, area, after, ignoreId) {
    var out = [], t = after || '09:00';
    while (out.length < 2 && t <= '19:00') {
      var e = { date: date, start: t, end: addMin(t, dur), area: area };
      if (!C.conflicts(e, ignoreId).length) { out.push(t); t = addMin(t, 60); } else t = addMin(t, 15);
    }
    return out;
  };
  C.validate = function (f) {
    var errs = {};
    if (!String(f.title || '').trim()) errs.title = 'Give the event a title.';
    if (!T.validDate(f.date)) errs.date = 'Pick a date.';
    if (!T.validTime(f.start)) errs.start = 'Pick a start time.';
    if (!T.validTime(f.end)) errs.end = 'Pick an end time.';
    if (!errs.start && !errs.end && f.end <= f.start) errs.end = 'The end has to be after the start.';
    return errs;
  };
  C.save = function (f, id) {
    var s = S(), c = f.client && T.client(f.client);
    var e = id ? s.appointments.filter(function (a) { return a.id === id; })[0] : null;
    var before = e ? clone(e) : null;
    if (!e) { e = { id: T.newId('ev'), status: 'scheduled', createdBy: T.actor() }; s.appointments.push(e); }
    ['title', 'date', 'start', 'end', 'client', 'place', 'kind', 'listing'].forEach(function (k) { if (f[k] !== undefined) e[k] = f[k] || (k === 'client' || k === 'listing' ? null : ''); });
    e.area = f.area || (e.listing && T.listing(e.listing) ? T.listing(e.listing).area : (c ? c.area : ''));
    if (e.kind === 'call') e.area = '';
    s.appointments.sort(function (a, b) { return (a.date + a.start) < (b.date + b.start) ? -1 : 1; });
    if (c) c.timeline.unshift({ date: T.today(), text: (before ? 'Event updated: ' : 'Event added: ') + e.title + ', ' + T.fmtDT(e.date + 'T' + e.start), kind: 'meeting' });
    T.log((before ? 'Event updated: ' : 'Event added: ') + e.title + ' (' + T.fmtDT(e.date + 'T' + e.start) + ')', 'calendar', e.id);
    return e;
  };
  C.cancel = function (id, by) {
    var s = S(), e = s.appointments.filter(function (a) { return a.id === id; })[0];
    if (!e || e.status === 'cancelled') return null;
    e.status = 'cancelled'; e.cancelledBy = by || T.actor(); e.cancelledAt = T.nowISO();
    var c = e.client && T.client(e.client);
    if (c && !c.deleted) c.timeline.unshift({ date: T.today(), text: e.title + ' on ' + T.fmtDT(e.date + 'T' + e.start) + ' cancelled' + (by === 'client' ? ' by the client' : ''), kind: 'meeting' });
    T.log('Event cancelled: ' + e.title + ' (' + T.fmtDT(e.date + 'T' + e.start) + ')', 'calendar', e.id);
    return e;
  };

  /* ======================= tasks ======================= */
  var K = (T.tasks = {});
  K.validate = function (f) {
    var errs = {};
    if (!String(f.title || '').trim()) errs.title = 'Describe the task.';
    if (!T.validDate((f.due || '').slice(0, 10)) || !T.validTime((f.due || '').slice(11, 16))) errs.due = 'Pick a due date and time.';
    return errs;
  };
  K.save = function (f, id) {
    var s = S(), t = id ? s.tasks.filter(function (x) { return x.id === id; })[0] : null, isNew = !t;
    if (!t) { t = { id: T.newId('t'), status: 'open', source: 'Added by ' + T.actor() + ', ' + T.fmtDate(T.today(), { noDay: true }) }; s.tasks.push(t); }
    t.title = f.title.trim(); t.due = f.due; t.client = f.client || null; t.owner = f.owner || T.BROKER.name; t.internal = !!f.internal;
    if (f.note != null) t.note = f.note;
    var c = t.client && T.client(t.client);
    if (c && !c.deleted) c.timeline.unshift({ date: T.today(), text: (isNew ? 'Task added: ' : 'Task updated: ') + t.title, kind: 'note' });
    T.log((isNew ? 'Task added: ' : 'Task updated: ') + t.title, 'task', t.id);
    return t;
  };
  K.done = function (id, outcome) {
    var t = S().tasks.filter(function (x) { return x.id === id; })[0];
    if (!t || t.status !== 'open') return null;
    t.status = 'done'; t.doneAt = T.nowISO(); t.outcome = outcome || '';
    var c = t.client && T.client(t.client);
    if (c && !c.deleted) { c.timeline.unshift({ date: T.today(), text: 'Done: ' + t.title + (outcome ? ' (' + outcome + ')' : ''), kind: 'note' }); if (!t.internal) c.lastContact = T.today(); }
    T.log('Marked done: ' + t.title, 'task', t.id);
    return t;
  };
  K.reopen = function (id) {
    var t = S().tasks.filter(function (x) { return x.id === id; })[0];
    if (!t || t.status !== 'done') return null;
    t.status = 'open'; t.reopenedAt = T.nowISO();
    T.log('Reopened: ' + t.title, 'task', t.id);
    return t;
  };

  /* ======================= trash & undo ======================= */
  T.trashPut = function (kind, item, extra) {
    var s = S(), entry = { id: T.newId('trash'), kind: kind, item: clone(item), extra: extra ? clone(extra) : null, at: T.nowISO() };
    s.trash.unshift(entry);
    if (s.trash.length > 40) s.trash.length = 40;
    return entry;
  };
  T.restore = function (trashId) {
    var s = S(), i, entry = null;
    for (i = 0; i < s.trash.length; i++) if (s.trash[i].id === trashId) { entry = s.trash[i]; s.trash.splice(i, 1); break; }
    if (!entry) return null;
    if (entry.kind === 'client') {
      s.clients.push(entry.item);
      (entry.extra.tasks || []).forEach(function (t) { s.tasks.push(t); });
      (entry.extra.appointments || []).forEach(function (a) { s.appointments.push(a); });
    } else if (entry.kind === 'task') s.tasks.push(entry.item);
    else if (entry.kind === 'event') s.appointments.push(entry.item);
    else if (entry.kind === 'tx') s.transactions.push(entry.item);
    else if (entry.kind === 'note') { var c = T.client(entry.extra.client); if (c && !c.deleted) c.notes.unshift(entry.item); }
    s.appointments.sort(function (a, b) { return (a.date + a.start) < (b.date + b.start) ? -1 : 1; });
    T.log('Restored ' + entry.kind + ': ' + (entry.item.title || entry.item.first || entry.item.text || ''), 'undo');
    return entry;
  };
  T.removeTask = function (id) { var s = S(), t = s.tasks.filter(function (x) { return x.id === id; })[0]; if (!t) return null; s.tasks = s.tasks.filter(function (x) { return x.id !== id; }); T.log('Deleted task: ' + t.title, 'task'); return T.trashPut('task', t); };
  T.removeEvent = function (id) { var s = S(), a = s.appointments.filter(function (x) { return x.id === id; })[0]; if (!a) return null; s.appointments = s.appointments.filter(function (x) { return x.id !== id; }); T.log('Deleted event: ' + a.title, 'calendar'); return T.trashPut('event', a); };

  /* ======================= clients ======================= */
  var CL = (T.clients = {});
  CL.validate = function (f, id) {
    var errs = {}, s = S();
    if (!String(f.first || '').trim()) errs.first = 'First name is required.';
    if (!String(f.last || '').trim()) errs.last = 'Last name is required.';
    var em = String(f.email || '').trim();
    if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) errs.email = 'This email doesn’t look valid.';
    if (em) { var dup = s.clients.filter(function (c) { return c.email.toLowerCase() === em.toLowerCase() && c.id !== id; })[0]; if (dup) errs.email = 'Already used by ' + T.fullName(dup) + '. Open that record instead.'; }
    if ((f.consent === 'express' || f.consent === 'implied' || f.consent === 'opted-out') && !String(f.consentSource || '').trim()) errs.consentSource = 'Say where this consent came from (form, call, email…).';
    if ((f.consent === 'express' || f.consent === 'implied') && !em) errs.email = 'Add an email address for email consent.';
    if (f.budget && (isNaN(+String(f.budget).replace(/[^\d.]/g, '')) || +String(f.budget).replace(/[^\d.]/g, '') <= 0)) errs.budget = 'Enter an amount, like 650,000.';
    return errs;
  };
  function slug(f) {
    var base = T.fold(f.first + f.last).replace(/[^a-z]/g, '').slice(0, 14) || 'contact', id = base, n = 2;
    while (T.client(id)) id = base + n++;
    return id;
  }
  CL.create = function (f) {
    var s = S(), today = T.today();
    var c = {
      id: slug(f), stage: f.stage || 'Lead', first: f.first.trim(), last: f.last.trim(), role: f.role || 'Buyer', area: f.area || 'Montcalm', lang: f.lang || 'EN',
      email: String(f.email || '').trim(), phone: String(f.phone || '').trim(),
      consent: { email: { status: f.consent || 'unknown', source: f.consentSource || 'No consent recorded yet', date: f.consentDate || today }, sms: { status: 'not-configured' } },
      lastContact: f.lastContact || null, memory: [], history: [], notes: [], saved: [], inbound: [],
      timeline: [{ date: today, text: 'Record created by ' + T.actor(), kind: 'note' }], createdBy: T.actor()
    };
    if (c.consent.email.status === 'implied') c.consent.email.expires = T.addDays(c.consent.email.date, 182);
    if (f.intent) c.memory.push({ key: 'intent', label: 'Looking for', value: f.intent, display: f.intent, prov: 'agent', source: 'Client form', date: today });
    var b = f.budget ? +String(f.budget).replace(/[^\d.]/g, '') : 0;
    if (b) c.memory.push({ key: 'budget', label: 'Budget (max)', value: b, display: T.money(b), prov: 'agent', source: 'Client form', date: today });
    c.memory.push({ key: 'areas', label: 'Areas', value: f.areas || c.area, display: f.areas || c.area, prov: 'agent', source: 'Client form', date: today });
    if (f.garage && f.garage !== 'unknown') c.memory.push({ key: 'garage', label: 'Garage', value: f.garage, display: T.strengthLabel(f.garage), prov: 'agent', source: 'Client form', date: today });
    s.clients.push(c);
    T.log('Client created: ' + T.fullName(c), 'client', c.id);
    return c;
  };
  CL.update = function (id, f) {
    var c = T.client(id); if (!c || c.deleted) return null;
    var changes = [];
    [['first', 'First name'], ['last', 'Last name'], ['role', 'Role'], ['stage', 'Stage'], ['area', 'Area'], ['lang', 'Language'], ['email', 'Email'], ['phone', 'Phone']].forEach(function (k) {
      var v = String(f[k[0]] == null ? c[k[0]] : f[k[0]]).trim();
      if (v !== c[k[0]]) { changes.push({ field: k[1], from: c[k[0]] || '—', to: v || '—' }); c[k[0]] = v; }
    });
    var ce = c.consent.email;
    if (f.consent && (f.consent !== ce.status || (f.consentSource || '') !== (ce.source || ''))) {
      changes.push({ field: 'Email consent', from: T.CONSENT_LABEL[T.consentOf(c)] + ' (' + ce.source + ')', to: T.CONSENT_LABEL[f.consent] + ' (' + f.consentSource + ')' });
      c.consent.email = { status: f.consent, source: f.consentSource || 'Updated by ' + T.actor(), date: f.consentDate || T.today() };
      if (f.consent === 'implied') c.consent.email.expires = T.addDays(c.consent.email.date, 182);
      if (f.consent === 'opted-out') { T.staleCardsFor(c.id, T.fullName(c) + ' opted out after this plan was drafted.'); S().counters.optOuts++; }
    }
    changes.forEach(function (x) { c.history.unshift({ date: T.today(), at: T.nowISO(), field: x.field, from: x.from, to: x.to, by: T.actor(), source: 'Edited in the client record' }); });
    if (changes.length) T.log('Client updated: ' + T.fullName(c) + ' (' + changes.map(function (x) { return x.field.toLowerCase(); }).join(', ') + ')', 'client', c.id);
    return changes;
  };
  CL.remove = function (id) {
    var s = S(), c = T.client(id); if (!c || c.deleted) return null;
    var tasks = s.tasks.filter(function (t) { return t.client === id; }), appts = s.appointments.filter(function (a) { return a.client === id; });
    s.clients = s.clients.filter(function (x) { return x.id !== id; });
    s.tasks = s.tasks.filter(function (t) { return t.client !== id; });
    s.appointments = s.appointments.filter(function (a) { return a.client !== id; });
    Object.keys(s.cards).forEach(function (k) { var cd = s.cards[k]; if (cd.clientId === id && (cd.status === 'ready' || cd.status === 'clarify' || cd.status === 'awaiting')) { cd.status = 'cancelled'; cd.rev++; } });
    T.log('Client deleted: ' + T.fullName(c) + ' (' + tasks.length + ' tasks, ' + appts.length + ' events removed with it)', 'client');
    return T.trashPut('client', c, { tasks: tasks, appointments: appts });
  };
  CL.addNote = function (id, text) {
    var c = T.client(id); if (!c || c.deleted || !String(text || '').trim()) return null;
    c.notes = c.notes || [];
    var n = { id: T.newId('note'), at: T.nowISO(), text: String(text).trim(), by: T.actor() };
    c.notes.unshift(n);
    c.timeline.unshift({ date: T.today(), text: 'Note: ' + n.text.slice(0, 90) + (n.text.length > 90 ? '…' : ''), kind: 'note' });
    T.log('Note added to ' + T.fullName(c), 'note', c.id);
    return n;
  };
  CL.removeNote = function (id, noteId) {
    var c = T.client(id); if (!c || !c.notes) return null;
    var n = c.notes.filter(function (x) { return x.id === noteId; })[0]; if (!n) return null;
    c.notes = c.notes.filter(function (x) { return x.id !== noteId; });
    return T.trashPut('note', n, { client: id });
  };
  CL.toggleSaved = function (id, listingId) {
    var c = T.client(id); if (!c || c.deleted) return null;
    c.saved = c.saved || [];
    var L = T.listing(listingId), on = c.saved.indexOf(listingId) < 0;
    if (on) c.saved.push(listingId); else c.saved = c.saved.filter(function (x) { return x !== listingId; });
    c.timeline.unshift({ date: T.today(), text: (on ? 'Listing saved: ' : 'Listing removed: ') + L.address + ' (' + L.id + ')', kind: 'note' });
    T.log((on ? 'Saved ' : 'Unsaved ') + L.address + ' for ' + T.fullName(c), 'listing', c.id);
    return on;
  };

  // Plans drafted before a material change (opt-out, deletion, clock) can't be approved until refreshed
  T.staleCardsFor = function (clientId, why) {
    var s = S();
    Object.keys(s.cards).forEach(function (k) {
      var cd = s.cards[k];
      if (cd.status !== 'ready' && cd.status !== 'awaiting') return;
      var hit = cd.clientId === clientId || (cd.rows && cd.rows.some(function (r) { return r.clientId === clientId && (r.include || r.review === 'task'); }));
      if (hit) { cd.stale = why; cd.rev++; }
    });
  };

  /* ======================= outbox ======================= */
  T.outboxAdd = function (m) {
    var s = S();
    var item = Object.assign({ id: T.newId('out'), at: T.nowISO(), status: s.caps.offline ? 'queued' : 'simulated' }, m);
    s.outbox.unshift(item);
    return item;
  };
  T.flushOutbox = function () {
    var s = S(), n = 0;
    s.outbox.forEach(function (o) { if (o.status === 'queued') { o.status = 'simulated'; o.flushedAt = T.nowISO(); n++; } });
    if (n) T.notify('system', n + ' queued message' + (n === 1 ? '' : 's') + ' simulated after reconnecting', 'They were held while offline. Nothing was actually sent.', { type: 'outbox' });
    return n;
  };

  /* ======================= transactions ======================= */
  var F = (T.files = {});
  F.forClient = function (clientId) { return S().transactions.filter(function (x) { return x.client === clientId; }); };
  F.match = function (folded) {
    var best = null;
    S().transactions.forEach(function (tx) {
      var c = T.client(tx.client), keys = [T.fold(tx.title.split(' ')[0]), T.fold(tx.property.split(',')[0])];
      if (c) keys.push(T.fold(c.last), T.fold(T.fullName(c)));
      keys.forEach(function (k) { if (k && k.length > 3 && folded.indexOf(k) > -1 && !best) best = tx; });
    });
    return best;
  };
  F.check = function (tx) {
    var today = T.today(), issues = [], done = [], open = [];
    tx.conditions.forEach(function (cd) {
      var vals = [{ value: cd.deadline, source: cd.source, recorded: true }];
      tx.docs.forEach(function (d) { (d.fields || []).forEach(function (f) { if (f.key === cd.id) vals.push({ value: f.value, source: d.type + (f.page ? ', ' + f.page : ''), quote: f.quote, calc: f.calc, doc: d.id }); }); });
      var res = tx.resolutions[cd.id];
      var considered = vals.filter(function (v) { return v.recorded || !(res && (res.seen || []).indexOf(v.doc) > -1); });
      var distinct = considered.filter(function (v, i) { return considered.map(function (x) { return x.value; }).indexOf(v.value) === i; });
      if (cd.status === 'open' && distinct.length > 1) issues.push({ type: 'conflict', key: cd.id, label: cd.label + ' deadline', values: distinct });
      if (cd.status === 'open' && cd.deadline < today) issues.push({ type: 'overdue', key: cd.id, label: cd.label + ' deadline passed on ' + T.fmtDate(cd.deadline, { long: true }) + ' and the condition is still open.' });
      tx.docs.forEach(function (d) { (d.fields || []).forEach(function (f) {
        if (f.key === cd.id + '-lender' && cd.status === 'open') issues.push({ type: f.value > cd.deadline ? 'lender-late' : 'lender-ok', key: cd.id, label: 'Lender expects approval ' + T.fmtDate(f.value, { long: true }) + (f.value > cd.deadline ? ', after the ' + cd.label.toLowerCase() + ' deadline (' + T.fmtDate(cd.deadline, { noDay: true }) + ').' : ', before the deadline.'), source: d.type + ', ' + T.fmtDate(d.date, { noDay: true }) });
      }); });
      if (cd.status === 'satisfied' || cd.status === 'waived') done.push({ item: cd.label + ' condition ' + cd.status, date: cd.closedOn, source: cd.source });
      else open.push({ item: cd.label + ' condition', date: cd.deadline, note: 'Deadline ' + T.fmtDate(cd.deadline, { long: true }), source: cd.source, cond: cd.id });
    });
    (tx.keyDates || []).forEach(function (kd) {
      if (kd.done) { done.push({ item: kd.label, date: kd.date, source: kd.source }); return; }
      var kres = tx.resolutions[kd.id];
      tx.docs.forEach(function (d) { (d.fields || []).forEach(function (f) {
        if (f.key === kd.id && f.value !== kd.date && !(kres && (kres.seen || []).indexOf(d.id) > -1)) issues.push({ type: 'conflict', key: kd.id, label: kd.label, keyDate: true, values: [{ value: kd.date, source: kd.source, recorded: true }, { value: f.value, source: d.type + (f.page ? ', ' + f.page : ''), quote: f.quote, doc: d.id }] });
      }); });
      var ev = S().appointments.filter(function (a) { return a.tx === tx.id && a.ref === kd.id && a.status !== 'cancelled'; })[0];
      var soon = kd.date >= today && T.daysBetween(today, kd.date) <= 60;
      if (soon && !ev) issues.push({ type: 'missing-calendar', key: kd.id, label: kd.label + ' on ' + T.fmtDate(kd.date, { long: true }) + ' is not in your calendar.' });
      if (ev && ev.date !== kd.date) issues.push({ type: 'calendar-mismatch', key: kd.id, event: ev.id, label: 'Your calendar has the ' + kd.label.toLowerCase() + ' on ' + T.fmtDate(ev.date, { long: true }) + '; the file says ' + T.fmtDate(kd.date, { long: true }) + '.' });
      open.push({ item: kd.label, date: kd.date, note: T.fmtDate(kd.date, { long: true }) + (ev ? ', in your calendar' : ''), source: kd.source });
    });
    tx.docs.forEach(function (d) { done.push({ item: d.type + ' received', date: d.date, source: d.type }); });
    done.sort(function (a, b) { return (a.date || '') < (b.date || '') ? -1 : 1; });
    return { issues: issues.filter(function (x) { return x.type !== 'lender-ok'; }), notes: issues.filter(function (x) { return x.type === 'lender-ok'; }), done: done, open: open };
  };
  F.issueCount = function (tx) { return F.check(tx).issues.length; };
  F.resolve = function (txId, key, value, source) {
    var tx = T.tx(txId); if (!tx) return null;
    var cd = tx.conditions.filter(function (x) { return x.id === key; })[0], kd = (tx.keyDates || []).filter(function (x) { return x.id === key; })[0];
    var before = cd ? cd.deadline : kd ? kd.date : null;
    var seen = tx.docs.map(function (d) { return d.id; });
    tx.resolutions[key] = { value: value, source: source, by: T.actor(), at: T.nowISO(), seen: seen };
    if (cd) { cd.deadline = value; cd.source = source; } else if (kd) { kd.date = value; kd.source = source; }
    var label = cd ? cd.label + ' deadline' : kd ? kd.label : key;
    tx.history.unshift({ at: T.nowISO(), text: label + ': ' + T.fmtDate(before, { noDay: true }) + ' → ' + T.fmtDate(value, { noDay: true }) + ' (from ' + source + ', by ' + T.actor() + ')' });
    var c = T.client(tx.client);
    if (c && !c.deleted) {
      var mf = T.memField(c, 'deadline-' + key);
      if (!mf) c.memory.push({ key: 'deadline-' + key, label: label, value: value, display: T.fmtDate(value, { long: true }), prov: /Promise|letter|report|agreement|Deed/i.test(source) ? 'verified' : 'agent', source: source, date: T.today() });
      else { mf.value = value; mf.display = T.fmtDate(value, { long: true }); mf.source = source; mf.date = T.today(); }
      c.history.unshift({ date: T.today(), at: T.nowISO(), field: label + ' (' + tx.title + ')', from: before ? T.fmtDate(before, { noDay: true }) : '—', to: T.fmtDate(value, { long: true }), by: T.actor(), source: 'Chosen from ' + source });
    }
    if (cd) {
      var tid = 't-dl-' + tx.id + '-' + key;
      var t = S().tasks.filter(function (x) { return x.id === tid; })[0];
      if (!t) S().tasks.push({ id: tid, client: tx.client, title: cd.label + ' condition deadline (' + tx.title + '): confirm or ask for an extension', due: value + 'T12:00', owner: T.BROKER.name, source: source, status: 'open' });
      else t.due = value + 'T12:00';
    }
    var r = { id: T.newId('r'), cardId: null, type: 'file', title: tx.title + ': ' + label.toLowerCase() + ' settled', version: 1, fingerprint: T.hash(txId + key + value + source), approvedAt: T.nowISO(), finishedAt: T.nowISO(), approver: T.actor(), steps: [{ label: 'Record the authoritative date', status: 'done', detail: T.fmtDate(value, { long: true }) + ', from ' + source + '. The other value stays in history.' }].concat(cd ? [{ label: 'Create a reminder', status: 'done', detail: 'Due ' + T.fmtDT(value + 'T12:00') + '.' }] : []), summary: 'A checklist entry is not proof that a legal condition is satisfied.', clientId: tx.client };
    S().receipts.unshift(r);
    T.log(tx.title + ': ' + label + ' set to ' + T.fmtDate(value, { noDay: true }), 'done', r.id);
    return r;
  };
  F.setCondition = function (txId, condId, status, note) {
    var tx = T.tx(txId), cd = tx && tx.conditions.filter(function (x) { return x.id === condId; })[0];
    if (!cd) return null;
    var before = cd.status;
    cd.status = status; cd.closedOn = status === 'open' ? null : T.today(); if (note) cd.source = note;
    tx.history.unshift({ at: T.nowISO(), text: cd.label + ' condition: ' + before + ' → ' + status + (note ? ' (' + note + ')' : '') + ', by ' + T.actor() });
    if (tx.conditions.every(function (x) { return x.status !== 'open'; }) && tx.stage === 'Conditional') { tx.stage = 'Firm'; tx.history.unshift({ at: T.nowISO(), text: 'All conditions closed: file is firm' }); T.notify('file', tx.title + ' is now firm', 'Every condition is satisfied or waived. Check the deed of sale date with the notary.', { type: 'tx', id: tx.id }); }
    if (status !== 'open') S().tasks.forEach(function (t) { if (t.id === 't-dl-' + tx.id + '-' + condId && t.status === 'open') { t.status = 'done'; t.doneAt = T.nowISO(); } });
    T.log(tx.title + ': ' + cd.label + ' ' + status, 'file', tx.id);
    return cd;
  };
  F.addDoc = function (txId, d) {
    var tx = T.tx(txId); if (!tx) return null;
    var doc = { id: T.newId('doc'), type: d.type, date: d.date || T.today(), fields: d.fields || [], addedBy: T.actor() };
    tx.docs.push(doc);
    tx.history.unshift({ at: T.nowISO(), text: 'Document added: ' + doc.type + (doc.fields.length ? ' (' + doc.fields.map(function (f) { return f.label + ' ' + T.fmtDate(f.value, { noDay: true }); }).join(', ') + ')' : '') });
    var chk = F.check(tx);
    if (chk.issues.length) T.notify('file', tx.title + ': ' + chk.issues.length + ' item' + (chk.issues.length === 1 ? ' needs' : 's need') + ' attention', chk.issues.map(function (x) { return x.label; }).join(' '), { type: 'tx', id: tx.id });
    return doc;
  };
  F.addKeyDateToCalendar = function (txId, key) {
    var tx = T.tx(txId), kd = tx && (tx.keyDates || []).filter(function (x) { return x.id === key; })[0];
    if (!kd) return null;
    var e = C.save({ title: kd.label + ': ' + tx.title, date: kd.date, start: '10:00', end: '11:00', client: tx.client, place: 'Notary office (to confirm)', kind: key === 'deed' ? 'deed' : 'meeting', area: tx.area }, null);
    e.tx = tx.id; e.ref = key;
    tx.history.unshift({ at: T.nowISO(), text: kd.label + ' added to the calendar for ' + T.fmtDT(e.date + 'T' + e.start) });
    return e;
  };
  F.linkCalendar = function (txId, key, evId) {
    var tx = T.tx(txId), kd = (tx.keyDates || []).filter(function (x) { return x.id === key; })[0], e = S().appointments.filter(function (a) { return a.id === evId; })[0];
    if (!kd || !e) return null;
    var before = e.date; e.date = kd.date;
    T.log('Calendar event moved from ' + T.fmtDate(before, { noDay: true }) + ' to ' + T.fmtDate(kd.date, { noDay: true }) + ' to match the ' + tx.title + ' file', 'calendar', e.id);
    return e;
  };
  F.validate = function (f) {
    var errs = {};
    if (!f.client) errs.client = 'Pick the client.';
    if (!String(f.property || '').trim()) errs.property = 'Add the property address.';
    var p = +String(f.price || '').replace(/[^\d.]/g, ''); if (!p) errs.price = 'Enter the accepted price.';
    if (!T.validDate(f.accepted)) errs.accepted = 'Pick the acceptance date.';
    ['finDays', 'inspDays'].forEach(function (k) { if (f[k] !== '' && f[k] != null && (isNaN(+f[k]) || +f[k] < 0 || +f[k] > 120)) errs[k] = 'Enter a number of days (0 to 120), or leave it empty.'; });
    if (f.deed && !T.validDate(f.deed)) errs.deed = 'Pick a valid date or leave it empty.';
    return errs;
  };
  F.create = function (f) {
    var c = T.client(f.client), price = +String(f.price).replace(/[^\d.]/g, '');
    var tx = { id: T.newId('tx'), title: c.last + (f.side === 'Seller' ? ' sale' : ' purchase'), client: c.id, side: f.side || 'Buyer', stage: 'Conditional', property: f.property.trim(), area: f.area || c.area, price: price, accepted: f.accepted, counterpart: f.counterpart || 'Other party (to add)', conditions: [], keyDates: [], docs: [], resolutions: {}, history: [{ at: T.nowISO(), text: 'File created by ' + T.actor() }] };
    if (f.inspDays !== '' && f.inspDays != null && +f.inspDays > 0) tx.conditions.push({ id: 'insp', label: 'Inspection', deadline: T.addDays(f.accepted, +f.inspDays), status: 'open', source: 'Promise to Purchase (accepted + ' + f.inspDays + ' days)' });
    if (f.finDays !== '' && f.finDays != null && +f.finDays > 0) tx.conditions.push({ id: 'fin', label: 'Financing', deadline: T.addDays(f.accepted, +f.finDays), status: 'open', source: 'Promise to Purchase (accepted + ' + f.finDays + ' days)' });
    if (!tx.conditions.length) tx.stage = 'Firm';
    if (f.deed) tx.keyDates.push({ id: 'deed', label: 'Deed of sale', date: f.deed, source: 'Promise to Purchase' });
    S().transactions.push(tx);
    if (c && !c.deleted) { c.stage = 'Under contract'; c.timeline.unshift({ date: T.today(), text: 'Transaction opened: ' + tx.property + ', ' + T.money(price), kind: 'note' }); }
    T.log('Transaction created: ' + tx.title, 'file', tx.id);
    return tx;
  };
  F.remove = function (id) { var s = S(), tx = T.tx(id); if (!tx) return null; s.transactions = s.transactions.filter(function (x) { return x.id !== id; }); T.log('Transaction deleted: ' + tx.title, 'file'); return T.trashPut('tx', tx); };

  /* ======================= CMA engine (deterministic, reproducible) ======================= */
  var GROUP = { Condo: 'attached', Townhouse: 'attached', 'Semi-detached': 'semi', Detached: 'house', Bungalow: 'house', Duplex: 'plex', Triplex: 'plex' };
  var COND_PCT = { 'needs work': -8, average: 0, good: 3, renovated: 7 };
  var M = (T.cma = { version: 'cma-rules v1', COND_PCT: COND_PCT });
  M.defaults = function (subject) {
    var g = GROUP[subject.type] || 'attached';
    return { trend: 0.3, sqft: { attached: 300, semi: 160, house: 180, plex: 120 }[g], bed: 15000, garage: 25000, age: 1200 };
  };
  function monthsSince(date) { return Math.max(0, Math.round(T.daysBetween(date, T.today()) / 30.4 * 10) / 10); }
  M.pool = function (subject) {
    var g = GROUP[subject.type], near = T.AREA_NEAR[subject.area] || [];
    return T.SOLD.map(function (x) {
      var why = null;
      if (GROUP[x.type] !== g) why = 'Different property type (' + x.type.toLowerCase() + ')';
      else if (x.area !== subject.area && near.indexOf(x.area) < 0) why = 'Not in or next to ' + subject.area;
      else if (Math.abs(x.size - subject.size) / subject.size > 0.4) why = 'Size differs by more than 40%';
      else if (T.daysBetween(x.sold, T.today()) > 366) why = 'Sold more than 12 months ago';
      var score = (x.area === subject.area ? 0 : 1.5) + Math.abs(x.size - subject.size) / subject.size * 5 + Math.abs(x.built - subject.built) / 20 + monthsSince(x.sold) / 6 + (x.type === subject.type ? 0 : 1);
      return { comp: x, why: why, score: Math.round(score * 100) / 100 };
    }).sort(function (a, b) { return a.score - b.score; });
  };
  M.runFor = function (subjectId) {
    var s = S(), run = s.cmaRuns[subjectId], subject = T.listing(subjectId);
    if (!run && subject) {
      var pool = M.pool(subject).filter(function (p) { return !p.why; });
      var inc = {}; pool.forEach(function (p, i) { inc[p.comp.id] = i < 5; });
      run = s.cmaRuns[subjectId] = { include: inc, rates: M.defaults(subject), condition: 'not assessed', updated: T.nowISO() };
    }
    return run;
  };
  M.compute = function (subjectId) {
    var subject = T.listing(subjectId), run = M.runFor(subjectId);
    if (!subject || !run) return null;
    var r = run.rates, sc = COND_PCT[run.condition];
    var pool = M.pool(subject);
    var rows = pool.filter(function (p) { return !p.why; }).map(function (p) {
      var x = p.comp, months = monthsSince(x.sold), adj = [], flags = [];
      var aTime = Math.round(x.price * r.trend / 100 * months);
      adj.push({ k: 'Time', v: aTime, why: months + ' months since sale × ' + r.trend + '%/month' });
      var aSize = Math.round((subject.size - x.size) * r.sqft);
      adj.push({ k: 'Size', v: aSize, why: (subject.size - x.size) + ' sq ft × ' + T.money(r.sqft) + '/sq ft' });
      var aBed = (subject.beds - x.beds) * r.bed;
      adj.push({ k: 'Bedrooms', v: aBed, why: (subject.beds - x.beds) + ' × ' + T.money(r.bed) });
      var sg = subject.garage === 'yes' ? 1 : subject.garage === 'no' ? 0 : null, cg = x.garage === 'yes' ? 1 : x.garage === 'no' ? 0 : null;
      var aGar = sg == null || cg == null ? 0 : (sg - cg) * r.garage;
      if (sg == null || cg == null) flags.push('Garage unknown: no adjustment');
      adj.push({ k: 'Garage', v: aGar, why: sg == null || cg == null ? 'unknown, not adjusted' : sg === cg ? 'same' : (sg > cg ? 'subject has one' : 'comparable has one') });
      var dy = Math.max(-40, Math.min(40, subject.built - x.built));
      var aAge = dy * r.age;
      adj.push({ k: 'Age', v: aAge, why: dy + ' years × ' + T.money(r.age) });
      var cc = COND_PCT[x.condition], aCond = 0;
      if (sc == null) flags.push('Subject condition not assessed');
      else if (cc == null) flags.push('Comparable condition unknown: no adjustment');
      else aCond = Math.round(x.price * (sc - cc) / 100);
      adj.push({ k: 'Condition', v: aCond, why: sc == null ? 'subject not assessed' : cc == null ? 'comparable unknown' : run.condition + ' vs ' + x.condition + ' (' + (sc - cc) + '%)' });
      var total = adj.reduce(function (a, b) { return a + b.v; }, 0);
      return { comp: x, include: !!run.include[x.id], adj: adj, total: total, adjusted: x.price + total, net: Math.round(total / x.price * 1000) / 10, flags: flags, score: p.score };
    });
    var used = rows.filter(function (x) { return x.include; }).map(function (x) { return x.adjusted; }).sort(function (a, b) { return a - b; });
    var n = used.length, res = { subject: subject, run: run, rows: rows, excluded: pool.filter(function (p) { return p.why; }), n: n };
    if (!n) { res.quality = 'No evidence'; res.note = 'No comparable is included. Include at least three to get a range.'; res.noteShort = 'No comparables'; return res; }
    function q(p) { var i = (n - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return used[lo] + (used[hi] - used[lo]) * (i - lo); }
    var round5 = function (v) { return Math.round(v / 5000) * 5000; };
    res.point = round5(q(0.5));
    res.low = round5(n >= 4 ? q(0.25) : used[0]);
    res.high = round5(n >= 4 ? q(0.75) : used[n - 1]);
    if (res.high - res.low < res.point * 0.04) { res.low = round5(res.point * 0.98); res.high = round5(res.point * 1.02); }
    res.dispersion = Math.round((used[n - 1] - used[0]) / res.point * 1000) / 10;
    res.quality = n >= 5 && res.dispersion < 8 ? 'Strong evidence' : n >= 3 && res.dispersion < 15 ? 'Moderate evidence' : 'Limited evidence';
    if (sc == null) { res.note = 'Subject condition not assessed: no condition adjustment was applied, so the range is provisional. Select a condition you observed.'; res.noteShort = 'Condition not assessed'; }
    res.fp = T.hash(JSON.stringify({ s: subject.id, inc: run.include, r: run.rates, c: run.condition, today: T.today() }));
    return res;
  };
  M.setSubject = function (f) {
    var s = S(), id = 'SUBJ-' + (s.subjects.length + 1);
    var subj = { id: id, address: f.address.trim(), area: f.area, type: f.type, price: null, fees: 0, garage: f.garage || 'unknown', beds: +f.beds, built: +f.built, size: +f.size, subject: true, client: f.client || null, createdBy: T.actor() };
    s.subjects.push(subj);
    T.log('CMA subject added: ' + subj.address, 'cma', id);
    return subj;
  };
  M.validateSubject = function (f) {
    var e = {};
    if (!String(f.address || '').trim()) e.address = 'Add the address.';
    if (!(+f.size > 200 && +f.size < 20000)) e.size = 'Enter the living area in square feet.';
    if (!(+f.beds >= 0 && +f.beds < 20)) e.beds = 'Enter the number of bedrooms.';
    if (!(+f.built > 1700 && +f.built <= 2026)) e.built = 'Enter the year built.';
    return e;
  };
  M.saveReport = function (subjectId) {
    var s = S(), r = M.compute(subjectId); if (!r || !r.n) return null;
    var v = s.cmaReports.filter(function (x) { return x.subjectId === subjectId; }).length + 1;
    var rep = { id: T.newId('cma'), subjectId: subjectId, address: r.subject.address, version: v, at: T.nowISO(), low: r.low, high: r.high, point: r.point, n: r.n, quality: r.quality, condition: r.run.condition, fp: r.fp, by: T.actor() };
    s.cmaReports.unshift(rep);
    var c = r.subject.client && T.client(r.subject.client);
    if (c && !c.deleted) c.timeline.unshift({ date: T.today(), text: 'Market evaluation v' + v + ' saved: ' + T.money(r.low) + ' to ' + T.money(r.high) + ' (' + r.quality.toLowerCase() + ')', kind: 'note' });
    T.log('CMA v' + v + ' saved for ' + r.subject.address + ' (' + T.money(r.low) + '–' + T.money(r.high) + ')', 'cma', rep.id);
    return rep;
  };

  /* ======================= demo clock rules ======================= */
  T.advanceTo = function (iso) {
    var s = S(), prev = s.now;
    if (!iso || iso <= prev) return [];
    s.now = iso;
    var today = iso.slice(0, 10), prevDay = prev.slice(0, 10), out = [];
    s.tasks.forEach(function (t) {
      if (t.status === 'open' && t.due > prev && t.due <= iso) { out.push('Overdue: ' + t.title); T.notify('overdue', 'Overdue: ' + t.title, 'Was due ' + T.fmtDT(t.due) + (t.client && T.client(t.client) ? ' · ' + T.fullName(T.client(t.client)) : '') + '.', { type: 'task', id: t.id, client: t.client }); }
    });
    s.appointments.forEach(function (a) {
      var end = a.date + 'T' + a.end;
      if (a.status !== 'cancelled' && a.kind === 'showing' && end > prev && end <= iso && !a.recapped && T.client(a.client)) { out.push('Recap needed: ' + T.fullName(T.client(a.client))); T.notify('recap', 'Recap needed: showing with ' + T.fullName(T.client(a.client)), 'Ended ' + T.fmtDT(end) + ' at ' + a.place + '.', { type: 'event', id: a.id, client: a.client }); }
    });
    s.outreach.forEach(function (o) {
      if (o.status === 'awaiting' && o.windowEnd < today) { o.status = 'no-reply'; out.push('No reply: ' + o.name); T.notify('window', 'No reply from ' + o.name + ' within 14 days', 'The observation window closed on ' + T.fmtDate(o.windowEnd, { noDay: true }) + '. Nothing is counted as recovered.', { type: 'client', id: o.client }); }
    });
    s.clients.forEach(function (c) {
      var e = c.consent.email;
      if (e.status === 'implied' && e.expires && e.expires >= prevDay && e.expires < today) { out.push('Consent expired: ' + T.fullName(c)); T.notify('consent', 'Implied consent expired: ' + T.fullName(c), 'Six months after ' + e.source.toLowerCase() + ' (' + T.fmtDate(e.date, { noDay: true }) + '). Commercial email now needs express consent.', { type: 'client', id: c.id }); T.staleCardsFor(c.id, 'Implied consent for ' + T.fullName(c) + ' expired after this plan was drafted.'); }
    });
    s.transactions.forEach(function (tx) {
      tx.conditions.forEach(function (cd) {
        if (cd.status === 'open' && cd.deadline >= prevDay && cd.deadline < today) { out.push(tx.title + ': ' + cd.label + ' deadline passed'); T.notify('deadline', tx.title + ': ' + cd.label.toLowerCase() + ' deadline passed', 'The condition is still open. Talk to the other broker about a waiver or an extension; Tayoo doesn’t decide this.', { type: 'tx', id: tx.id }); }
        var soon = T.addDays(today, 2);
        if (cd.status === 'open' && cd.deadline > prevDay && T.addDays(prevDay, 2) < cd.deadline && cd.deadline <= soon) { var dn = T.daysBetween(today, cd.deadline); T.notify('deadline', tx.title + ': ' + cd.label.toLowerCase() + ' deadline ' + (dn === 0 ? 'today' : 'in ' + dn + ' day' + (dn === 1 ? '' : 's')), T.fmtDate(cd.deadline, { long: true }) + '. The condition is still open.', { type: 'tx', id: tx.id }); }
      });
    });
    Object.keys(s.cards).forEach(function (k) {
      var cd = s.cards[k];
      if ((cd.status === 'ready' || cd.status === 'awaiting') && !cd.stale && T.minutesBetween(cd.createdAt, iso) > 24 * 60) { cd.stale = 'Drafted more than a day ago. Evidence or consent may have changed; refresh it before approving.'; cd.rev++; out.push('Plan needs a refresh: ' + cd.title); }
    });
    T.log('Clock advanced from ' + T.fmtDT(prev) + ' to ' + T.fmtDT(iso), 'clock');
    return out;
  };

  /* ======================= Test lab events ======================= */
  var L = (T.lab = {});
  L.reply = function (clientId, text) {
    var s = S(), c = T.client(clientId); if (!c || c.deleted) return null;
    var quote = String(text || '').trim() || (c.lang === 'FR' ? 'Oui, ça m’intéresse. On peut se parler cette semaine ?' : 'Yes, I’m still interested. Can we talk this week?');
    var o = s.outreach.filter(function (x) { return x.client === clientId && x.status === 'awaiting'; })[0];
    c.timeline.unshift({ date: T.today(), text: 'Email from ' + c.first + ': “' + quote + '”', kind: 'email' });
    c.lastContact = T.today();
    if (o) { o.status = 'replied'; o.reply = T.today(); o.replyKind = 'observed'; o.replyText = quote; }
    else { c.inbound = c.inbound || []; c.inbound.unshift({ date: T.today(), quote: quote, source: 'Email from ' + c.first, answered: false }); }
    s.outbox.forEach(function (m) { if (m.client === clientId && !m.reply) m.reply = { at: T.nowISO(), text: quote }; });
    T.notify('reply', T.fullName(c) + ' replied', '“' + quote + '”' + (o ? ' Counted as an observed reply in the ledger.' : ' No follow-up of yours was waiting, so it’s an inbound message to answer.'), { type: 'client', id: c.id });
    return o ? 'observed' : 'inbound';
  };
  L.optout = function (clientId) {
    var s = S(), c = T.client(clientId); if (!c || c.deleted) return null;
    c.consent.email = { status: 'opted-out', source: 'Replied “STOP” to an email (test lab event)', date: T.today() };
    c.timeline.unshift({ date: T.today(), text: 'Opted out of commercial email', kind: 'consent' });
    s.counters.optOuts++;
    T.staleCardsFor(c.id, T.fullName(c) + ' opted out after this plan was drafted.');
    T.notify('consent', T.fullName(c) + ' opted out', 'Email consent is now opted out. Plans that included them need a review, and nobody can override this from a card.', { type: 'client', id: c.id });
    return true;
  };
  L.queueOptout = function (clientId) {
    var s = S(), c = T.client(clientId); if (!c) return null;
    if (s.pendingEvents.some(function (e) { return e.client === clientId; })) return false;
    s.pendingEvents.push({ id: T.newId('pe'), type: 'optout-during-send', client: clientId, note: T.fullName(c) + ' will opt out while the next batch is sending.' });
    T.log('Queued an opt-out for ' + T.fullName(c) + ' during the next send', 'lab');
    return true;
  };
  L.cancelShowing = function (apptId) {
    var e = C.cancel(apptId, 'client'); if (!e) return null;
    var c = T.client(e.client);
    T.notify('cancel', (c ? T.fullName(c) : 'A client') + ' cancelled a showing', e.title + ' on ' + T.fmtDT(e.date + 'T' + e.start) + (e.place ? ' at ' + e.place : '') + '. Ask Tayoo to book a new time.', { type: 'event', id: e.id, client: e.client });
    return e;
  };
  L.lenderChange = function (txId, date) {
    var tx = T.tx(txId); if (!tx || !T.validDate(date)) return null;
    var cd = tx.conditions.filter(function (x) { return x.id === 'fin'; })[0];
    if (!cd) return null;
    return F.addDoc(txId, { type: 'Lender letter', date: T.today(), fields: [{ key: 'fin-lender', label: 'Lender approval expected', value: date, quote: 'Final approval is expected by ' + T.fmtDate(date, { long: true }) + '.' }] });
  };
  L.newLead = function (f) {
    var c = CL.create({ first: f.first, last: f.last, email: f.email, area: f.area, lang: f.lang, role: f.role || 'Buyer', stage: 'Lead', consent: 'implied', consentSource: 'Website inquiry (implied consent, 6 months)', intent: f.intent || '' });
    c.inbound = [{ date: T.today(), quote: f.message || 'I’d like to talk about buying in ' + c.area + '.', source: 'Website inquiry', answered: false }];
    c.timeline.unshift({ date: T.today(), text: 'Website inquiry: “' + c.inbound[0].quote + '”', kind: 'email' });
    T.notify('lead', 'New lead: ' + T.fullName(c), '“' + c.inbound[0].quote + '” Implied consent from the inquiry, valid six months.', { type: 'client', id: c.id });
    return c;
  };

  /* ======================= search ======================= */
  T.search = function (q) {
    var f = T.fold(String(q || '').trim()), s = S(), out = [];
    if (f.length < 2) return out;
    function hit(str) { return T.fold(str).indexOf(f) > -1; }
    s.clients.forEach(function (c) { if (hit(T.fullName(c) + ' ' + c.email + ' ' + c.area + ' ' + c.role + ' ' + c.stage)) out.push({ type: 'Client', title: T.fullName(c), sub: c.role + ', ' + c.area + ', ' + c.stage, href: '#/clients/' + c.id }); });
    T.listings().forEach(function (l) { if (hit(l.address + ' ' + l.area + ' ' + l.id + ' ' + l.type)) out.push({ type: 'Listing', title: l.address, sub: l.area + ', ' + l.type + (l.price ? ', ' + T.money(l.price) : '') + ' · ' + l.id, href: '#/listings/' + l.id }); });
    s.appointments.forEach(function (a) { var c = T.client(a.client); if (hit(a.title + ' ' + (a.place || '') + ' ' + (c ? T.fullName(c) : ''))) out.push({ type: 'Event', title: a.title + (c ? ', ' + T.fullName(c) : ''), sub: T.fmtDT(a.date + 'T' + a.start) + (a.status === 'cancelled' ? ' (cancelled)' : ''), href: '#/calendar' }); });
    s.tasks.forEach(function (t) { if (hit(t.title)) out.push({ type: 'Task', title: t.title, sub: (t.status === 'done' ? 'Done' : 'Due ' + T.fmtDT(t.due)), href: '#/calendar' }); });
    s.transactions.forEach(function (tx) { if (hit(tx.title + ' ' + tx.property)) out.push({ type: 'File', title: tx.title, sub: tx.property + ', ' + tx.stage, href: '#/files/' + tx.id }); });
    s.outbox.forEach(function (m) { if (hit(m.subject + ' ' + m.name)) out.push({ type: 'Outbox', title: m.subject, sub: 'To ' + m.name + ', simulated', href: '#/inbox/outbox' }); });
    s.receipts.forEach(function (r) { if (hit(r.title)) out.push({ type: 'Receipt', title: r.title, sub: 'Plan v' + r.version + ', ' + T.fmtDT(r.approvedAt), href: '#/activity' }); });
    return out.slice(0, 40);
  };

  /* ======================= export / import ======================= */
  T.exportJSON = function () { return JSON.stringify({ app: 'tayoo-v3', exportedAt: new Date().toISOString(), state: S() }, null, 2); };
  T.importJSON = function (text) {
    var obj;
    try { obj = JSON.parse(text); } catch (e) { return { error: 'This file isn’t valid JSON.' }; }
    var st = obj && obj.state ? obj.state : obj;
    if (!st || st.version !== 4 || !Array.isArray(st.clients) || !Array.isArray(st.thread) || typeof st.now !== 'string') return { error: 'This isn’t a Tayoo V3 workspace export (version 4).' };
    T.store.state = st;
    T.store.save();
    T.log('Workspace imported (' + st.clients.length + ' clients, ' + st.thread.length + ' messages)', 'system');
    return { ok: true, state: st };
  };

  T.actor = function () { return S().role === 'coordinator' ? T.BROKER.coordinator : T.BROKER.name; };
})();
