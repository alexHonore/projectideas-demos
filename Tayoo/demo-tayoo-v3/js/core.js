/* Tayoo V3 — utilities, store and derived selectors */
(function () {
  'use strict';
  var T = (window.Tayoo = window.Tayoo || {});
  var KEY = 'tayoo-v3';

  /* ---------- formatting ---------- */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  T.esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  T.money = function (n) {
    if (n == null || isNaN(n)) return '—';
    return 'C$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  T.moneyFr = function (n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';
  };
  T.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  T.fold = function (s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'");
  };
  function parts(iso) {
    var d = String(iso).split('T')[0].split('-');
    return new Date(Date.UTC(+d[0], +d[1] - 1, +d[2]));
  }
  T.dateObj = parts;
  T.weekday = function (iso) { return DAYS[parts(iso).getUTCDay()]; };
  T.fmtDate = function (iso, opts) {
    if (!iso) return '—';
    var d = parts(iso);
    opts = opts || {};
    if (opts.fr) return JOURS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MOIS[d.getUTCMonth()];
    if (opts.long) return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();
    if (opts.noDay) return MON[d.getUTCMonth()] + ' ' + d.getUTCDate();
    return DAYS[d.getUTCDay()].slice(0, 3) + ', ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate();
  };
  T.fmtTime = function (hhmm, fr) {
    if (!hhmm) return '';
    var p = hhmm.split(':'), h = +p[0], m = p[1];
    if (fr) return h + ' h ' + m;
    var ap = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + m + ' ' + ap;
  };
  T.fmtDT = function (iso, opts) {
    if (!iso) return '—';
    var t = String(iso).split('T')[1];
    return T.fmtDate(iso, opts) + (t ? (opts && opts.fr ? ' à ' : ', ') + T.fmtTime(t, opts && opts.fr) : '');
  };
  T.addDays = function (isoDate, n) {
    var d = parts(isoDate);
    d.setUTCDate(d.getUTCDate() + n);
    return d.getUTCFullYear() + '-' + T.pad(d.getUTCMonth() + 1) + '-' + T.pad(d.getUTCDate());
  };
  T.daysBetween = function (a, b) { return Math.round((parts(b) - parts(a)) / 86400000); };
  /* ---------- demo clock: one datetime in state, advanced by actions and the Test lab ---------- */
  T.nowISO = function () { return T.store.state.now; };
  T.today = function () { return T.store.state.now.slice(0, 10); };
  T.clockStr = function () { return T.fmtTime(T.store.state.now.slice(11, 16)); };
  T.addMinutes = function (iso, n) {
    var d = iso.split('T'), t = (d[1] || '00:00').split(':');
    var mins = +t[0] * 60 + +t[1] + n, days = Math.floor(mins / 1440);
    mins = ((mins % 1440) + 1440) % 1440;
    return T.addDays(d[0], days) + 'T' + T.pad(Math.floor(mins / 60)) + ':' + T.pad(mins % 60);
  };
  T.minutesBetween = function (a, b) {
    var da = T.daysBetween(a.slice(0, 10), b.slice(0, 10));
    var ta = a.slice(11, 16).split(':'), tb = b.slice(11, 16).split(':');
    return da * 1440 + (+tb[0] * 60 + +tb[1]) - (+ta[0] * 60 + +ta[1]);
  };
  T.tick = function (n) { var s = T.store.state; s.now = T.addMinutes(s.now, n || 1); };
  T.validDate = function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !isNaN(T.dateObj(v)); };
  T.validTime = function (v) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(v || ''); };
  T.relDay = function (iso) {
    var d = T.daysBetween(T.today(), iso.slice(0, 10));
    return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d === -1 ? 'Yesterday' : T.fmtDate(iso);
  };
  T.hash = function (str) {
    var h = 5381, i;
    for (i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    var hex = ('00000000' + h.toString(16)).slice(-8).toUpperCase();
    return hex.slice(0, 3) + '-' + hex.slice(3, 6);
  };
  T.speed = /[?&]speed=fast/.test(location.search) ? 0.08 : 1;
  T.reduced = function () {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };
  T.wait = function (ms) {
    return new Promise(function (r) { setTimeout(r, Math.max(0, ms * T.speed)); });
  };
  T.initials = function (c) { return (c.first[0] + c.last[0]).toUpperCase(); };
  T.fullName = function (c) { return c.first + ' ' + c.last; };
  // First name when it's unique in the workspace, full name otherwise (two Sarahs are never blurred)
  T.shortName = function (c) {
    var n = T.store.state.clients.filter(function (x) { return x.first === c.first; }).length;
    return n > 1 ? T.fullName(c) : c.first;
  };

  /* ---------- icons (stroke paths, 24px grid) ---------- */
  var P = {
    mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5 11a7 7 0 0 0 14 0 M12 18v3',
    send: 'M12 19V5 M6 11l6-6 6 6',
    talk: 'M4 10v4 M8 7v10 M12 4v16 M16 7v10 M20 10v4',
    today: 'M4 6h16v14H4z M4 10h16 M9 3v4 M15 3v4',
    people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M16 3.5a4 4 0 0 1 0 7.5 M18 14a6 6 0 0 1 4 7',
    ledger: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
    activity: 'M3 12h4l3-8 4 16 3-8h4',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    check: 'M5 12.5l4.5 4.5L19 7',
    close: 'M6 6l12 12 M18 6L6 18',
    back: 'M15 5l-7 7 7 7',
    chevron: 'M9 6l6 6-6 6',
    down: 'M6 9l6 6 6-6',
    pen: 'M4 20h4L19 9l-4-4L4 16v4z M13.5 6.5l4 4',
    spark: 'M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z',
    alert: 'M12 4l9 16H3z M12 10v4 M12 17.5v.5',
    question: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7v.5 M12 17v.5',
    home: 'M4 11l8-7 8 7 M6 10v10h12V10',
    mail: 'M3 6h18v12H3z M3 7l9 6 9-6',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
    task: 'M9 11l2 2 4-4 M5 4h14v16H5z',
    shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
    eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M5.6 5.6l12.8 12.8',
    hollow: 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14z',
    play: 'M8 5v14l11-7z',
    stop: 'M7 7h10v10H7z',
    pause: 'M9 5v14 M15 5v14',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 8h.01',
    micoff: 'M9 9v3a3 3 0 0 0 5.1 2.1 M15 10V6a3 3 0 0 0-5.7-1.3 M5 11a7 7 0 0 0 11.6 5.3 M19 11a7 7 0 0 1-.5 2.6 M12 18v3 M4 4l16 16',
    gauge: 'M4 15a8 8 0 1 1 16 0 M12 15l4-5 M12 15h.01',
    keyboard: 'M3 7h18v10H3z M7 11h.01 M11 11h.01 M15 11h.01 M7 14h10',
    speaker: 'M5 10v4h3l5 4V6L8 10z M16 9a4 4 0 0 1 0 6 M18.5 6.5a8 8 0 0 1 0 11',
    mute: 'M5 10v4h3l5 4V6L8 10z M17 10l4 4 M21 10l-4 4',
    undo: 'M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3',
    download: 'M12 4v11 M7 10l5 5 5-5 M5 20h14',
    file: 'M14 3H6v18h12V7z M14 3v4h4 M9 13h6 M9 17h4',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M16 16l5 5',
    refresh: 'M20 11a8 8 0 0 0-14.3-4.9L4 8 M4 4v4h4 M4 13a8 8 0 0 0 14.3 4.9L20 16 M20 20v-4h-4',
    map: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    calendar: 'M4 6h16v14H4z M4 10h16 M9 3v4 M15 3v4 M8 14h3',
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
    flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
    tour: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M15.5 8.5l-2 5-5 2 2-5z',
    more: 'M5 12h.01 M12 12h.01 M19 12h.01',
    plus: 'M12 5v14 M5 12h14',
    flask: 'M9 3h6 M10 3v6L4.6 18.6A1.6 1.6 0 0 0 6 21h12a1.6 1.6 0 0 0 1.4-2.4L14 9V3 M7.5 15h9',
    trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
    filter: 'M4 5h16l-6 8v5l-4 2v-7z',
    print: 'M7 9V3h10v6 M7 17H4v-7h16v7h-3 M7 14h10v7H7z',
    upload: 'M12 20V9 M7 14l5-5 5 5 M5 4h14',
    inbox: 'M3 13l3-8h12l3 8v6H3z M3 13h5l1 3h6l1-3h5'
  };
  T.icon = function (name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + (P[name] || P.spark) + '"/></svg>';
  };
  T.logo = function () {
    return '<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
      '<rect x="3" y="12" width="3.4" height="8" rx="1.7"/><rect x="8.9" y="8" width="3.4" height="16" rx="1.7"/>' +
      '<rect x="14.3" y="4" width="3.4" height="24" rx="1.7"/><rect x="19.7" y="8" width="3.4" height="16" rx="1.7"/>' +
      '<rect x="25.6" y="12" width="3.4" height="8" rx="1.7"/></svg>';
  };

  /* ---------- store ---------- */
  var listeners = [];
  T.store = {
    state: null,
    storageOk: true,
    load: function () {
      var raw = null;
      try { raw = window.localStorage.getItem(KEY); } catch (e) { this.storageOk = false; }
      var parsed = null;
      if (raw) { try { parsed = JSON.parse(raw); } catch (e) { parsed = null; } }
      this.state = parsed && parsed.version === 4 ? parsed : T.seed();
      return this.state;
    },
    save: function () {
      try { window.localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { this.storageOk = false; }
    },
    reset: function () {
      try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      this.state = T.seed();
      this.save();
      this.emit();
    },
    commit: function (fn) {
      if (fn) fn(this.state);
      this.save();
      this.emit();
    },
    on: function (fn) { listeners.push(fn); },
    emit: function () { listeners.forEach(function (fn) { fn(); }); }
  };

  /* ---------- selectors ---------- */
  T.client = function (id) {
    var s = T.store.state, i;
    if (!id) return null;
    for (i = 0; i < s.clients.length; i++) if (s.clients[i].id === id) return s.clients[i];
    for (i = 0; i < (s.trash || []).length; i++) if (s.trash[i].kind === 'client' && s.trash[i].item.id === id) return Object.assign({}, s.trash[i].item, { deleted: true });
    return null;
  };
  T.listings = function () { return T.LISTINGS.concat(T.store.state.subjects || []); };
  T.listing = function (id) {
    var all = T.listings();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    for (i = 0; i < T.SOLD.length; i++) if (T.SOLD[i].id === id) return T.SOLD[i];
    return null;
  };
  T.tx = function (id) {
    var l = T.store.state.transactions;
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  };
  T.memField = function (c, key) {
    for (var i = 0; i < c.memory.length; i++) if (c.memory[i].key === key) return c.memory[i];
    return null;
  };
  T.consentOf = function (c) {
    var e = c && c.consent && c.consent.email;
    if (!e) return 'unknown';
    if (e.status === 'implied' && e.expires && e.expires < T.today()) return 'expired';
    return e.status || 'unknown';
  };
  T.canEmail = function (c) { var x = T.consentOf(c); return x === 'express' || x === 'implied'; };
  T.CONSENT_LABEL = { express: 'Express consent', implied: 'Implied consent', unknown: 'Consent unknown', expired: 'Implied consent expired', 'opted-out': 'Opted out' };

  // A contact is "covered" when it has a timely next action: an open task due in the future,
  // a future appointment, or a follow-up still inside its 14-day observation window.
  T.coverageOf = function (c) {
    var s = T.store.state, now = T.nowISO(), i;
    for (i = 0; i < s.tasks.length; i++) {
      var t = s.tasks[i];
      if (t.client === c.id && t.status === 'open' && t.due >= now && !t.internal) return { ok: true, why: 'Task: ' + t.title, due: t.due };
    }
    for (i = 0; i < s.appointments.length; i++) {
      var a = s.appointments[i];
      if (a.client === c.id && a.status !== 'cancelled' && (a.date + 'T' + a.start) >= now) return { ok: true, why: a.title + ', ' + T.fmtDate(a.date) + ' ' + T.fmtTime(a.start), due: a.date + 'T' + a.start };
    }
    for (i = 0; i < s.outreach.length; i++) {
      var o = s.outreach[i];
      if (o.client === c.id && o.status === 'awaiting' && o.windowEnd >= T.today()) return { ok: true, why: 'Follow-up awaiting reply until ' + T.fmtDate(o.windowEnd, { noDay: true }) };
      if (o.client === c.id && o.status === 'replied' && o.reply >= T.addDays(T.today(), -14) && !o.meeting) return { ok: true, why: 'Replied ' + T.fmtDate(o.reply, { noDay: true }) + ', conversation open' };
    }
    return { ok: false };
  };
  T.coverage = function () {
    var s = T.store.state, eligible = [], covered = [], uncovered = [];
    s.clients.forEach(function (c) {
      if (T.consentOf(c) === 'opted-out' || c.stage === 'Closed') return;
      eligible.push(c);
      var cv = T.coverageOf(c);
      if (cv.ok) covered.push(c); else uncovered.push(c);
    });
    return { eligible: eligible.length, covered: covered.length, uncovered: uncovered, pct: eligible.length ? Math.round(covered.length / eligible.length * 100) : 0 };
  };
  // Recovery signals, computed for any contact from its records. A seeded `recovery` note stands for a
  // signal already detected in history; overdue promises, unanswered inbound messages and silence are computed.
  var KIND_RANK = { promise: 1, unanswered: 2, dormant: 3, lead: 2 };
  T.signalOf = function (c, opts) {
    opts = opts || {};
    if (!c || c.deleted || c.stage === 'Closed') return null;
    if (c.recovery && c.recovery.handled) return null;
    var s = T.store.state, today = T.today();
    var days = c.lastContact ? T.daysBetween(c.lastContact, today) : null;
    if (c.recovery && !opts.computedOnly) return { kind: c.recovery.kind, reason: c.recovery.reason, evidence: c.recovery.evidence, order: c.recovery.order, days: days, seeded: true };
    var over = s.tasks.filter(function (t) { return t.client === c.id && t.status === 'open' && !t.internal && t.due < T.nowISO(); })[0];
    if (over) {
      var od = T.daysBetween(over.due.slice(0, 10), today);
      return { kind: 'promise', reason: 'Promised: ' + over.title + ' (due ' + T.fmtDate(over.due, { noDay: true }) + '). ' + (od > 0 ? 'Overdue by ' + od + ' day' + (od === 1 ? '' : 's') + '.' : 'Overdue since this morning.'), evidence: [{ source: over.source, date: over.due.slice(0, 10), quote: over.title }], order: 40, days: days, task: over.id };
    }
    var inb = (c.inbound || []).filter(function (x) { return !x.answered; })[0];
    if (inb) {
      var id2 = T.daysBetween(inb.date, today);
      return { kind: 'unanswered', reason: (c.stage === 'Lead' && !c.lastContact ? 'New inquiry' : 'Message') + ' on ' + T.fmtDate(inb.date, { noDay: true }) + ' not answered yet' + (id2 > 0 ? ' (' + id2 + ' day' + (id2 === 1 ? '' : 's') + ').' : '.'), evidence: [{ source: inb.source || 'Email from ' + c.first, date: inb.date, quote: inb.quote }], order: 45, days: days };
    }
    var limit = opts.days != null ? opts.days : 21;
    if (days == null ? true : days >= limit) {
      if (days == null && c.stage !== 'Lead') return null;
      return { kind: 'dormant', reason: days == null ? 'Never contacted.' : 'No contact in ' + days + ' days.', evidence: c.lastContact ? [{ source: 'Last recorded contact', date: c.lastContact, quote: (c.timeline[0] && c.timeline[0].text) || 'Contact' }] : [], order: 60, days: days };
    }
    return null;
  };
  T.recoveryCandidates = function (crit) {
    crit = crit || {};
    var s = T.store.state;
    return s.clients.filter(function (c) {
      if (T.coverageOf(c).ok) return false;
      if (crit.role && crit.role !== 'any' && c.role.indexOf(crit.role) < 0) return false;
      if (crit.stage && crit.stage !== 'any' && c.stage !== crit.stage) return false;
      if (crit.area && crit.area !== 'any' && c.area !== crit.area) return false;
      if (crit.lang && crit.lang !== 'any' && c.lang !== crit.lang) return false;
      if (crit.budgetMin || crit.budgetMax) {
        var b = T.memField(c, 'budget');
        if (!b || b.value == null) return false;
        if (crit.budgetMin && b.value < crit.budgetMin) return false;
        if (crit.budgetMax && b.value > crit.budgetMax) return false;
      }
      var sig = T.signalOf(c, { days: crit.days });
      if (!sig) return false;
      if (crit.days && (sig.days == null ? false : sig.days < crit.days) && !(sig.days == null)) return false;
      if (crit.signal && crit.signal !== 'any' && sig.kind !== crit.signal) return false;
      return true;
    }).sort(function (a, b) {
      var sa = T.signalOf(a, { days: crit.days }), sb = T.signalOf(b, { days: crit.days });
      return (KIND_RANK[sa.kind] - KIND_RANK[sb.kind]) || ((sa.order || 50) - (sb.order || 50)) || ((sb.days || 0) - (sa.days || 0));
    });
  };
  T.openTasks = function () {
    return T.store.state.tasks.filter(function (t) { return t.status === 'open'; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
  };
  T.isOverdue = function (t) { return t.status === 'open' && t.due < T.nowISO(); };
  T.pendingRecaps = function () {
    var s = T.store.state, now = T.nowISO(), since = T.addDays(T.today(), -7);
    return s.appointments.filter(function (a) {
      if (!(a.kind === 'showing' && a.status !== 'cancelled' && a.date >= since && (a.date + 'T' + a.end) <= now && !a.recapped && T.client(a.client))) return false;
      return !Object.keys(s.cards).some(function (k) { var c = s.cards[k]; return c.type === 'showing' && c.clientId === a.client && (c.status === 'ready' || c.status === 'running'); });
    });
  };
  T.pendingCards = function () {
    var s = T.store.state;
    return Object.keys(s.cards).map(function (k) { return s.cards[k]; }).filter(function (c) {
      return c.status === 'ready' || c.status === 'clarify' || c.status === 'awaiting';
    });
  };

  // Revenue Recovery Ledger (TY-23): every number is derived from records with its denominator.
  T.ledger = function () {
    var s = T.store.state, L = T.LEDGER_SEED, b = L.baseline;
    var recaps = L.recaps.length + s.counters.recaps;
    var outreachApproved = s.outreach.length;
    var minutes = recaps * (b.recapManual - b.recapReview) + outreachApproved * (b.followManual - b.followReview);
    var replies = s.outreach.filter(function (o) { return o.status === 'replied'; });
    var meetings = s.outreach.filter(function (o) { return !!o.meeting; });
    var awaiting = s.outreach.filter(function (o) { return o.status === 'awaiting'; });
    var due = L.commitmentsDone.length, overdue = 0, onTime = L.commitmentsDone.length;
    s.tasks.forEach(function (t) {
      if (t.due >= L.activeSince && t.due < T.nowISO()) {
        due++;
        if (t.status === 'done' && t.doneAt && t.doneAt <= t.due) onTime++;
        else if (t.status === 'open') overdue++;
      }
    });
    return {
      recaps: recaps, outreachApproved: outreachApproved, minutes: minutes,
      replies: replies, meetings: meetings, awaiting: awaiting,
      commitments: { due: due, onTime: onTime, overdue: overdue, late: due - onTime - overdue },
      coverage: T.coverage(),
      health: { approved: L.health.approved + s.counters.approved, edited: L.health.edited + s.counters.edited, rejected: L.health.rejected + s.counters.rejected, optOuts: L.health.optOuts + s.counters.optOuts }
    };
  };

  T.uid = function (prefix) {
    var s = T.store.state;
    s.counters.msg++;
    return prefix + '-' + s.counters.msg;
  };
  T.log = function (text, kind, ref) {
    var ev = T.store.state.events;
    ev.unshift({ at: T.nowISO(), text: text, kind: kind || 'info', ref: ref || null });
    if (ev.length > 400) ev.length = 400;
  };
  // One inbox for everything that needs the broker's eyes; it also writes to the event log.
  T.notify = function (kind, title, body, ref) {
    var s = T.store.state;
    s.counters.id = (s.counters.id || 0) + 1;
    s.inbox.unshift({ id: 'n' + s.counters.id, at: T.nowISO(), kind: kind, title: title, body: body || '', ref: ref || null, read: false });
    T.log(title, kind, ref);
  };
  T.newId = function (prefix) {
    var s = T.store.state;
    s.counters.id = (s.counters.id || 0) + 1;
    return prefix + '-' + s.counters.id + '-' + T.today().slice(5).replace('-', '');
  };
  T.unread = function () { return T.store.state.inbox.filter(function (n) { return !n.read; }).length; };
})();
