/* Tayoo V3 — render functions. Pure-ish: read state, return HTML strings. */
(function () {
  'use strict';
  var T = (window.Tayoo = window.Tayoo || {});
  var h = T.esc, I = T.icon;
  var S = function () { return T.store.state; };
  var R = (T.render = {});
  T.ui = T.ui || { clientQ: '', clientFilter: 'all', open: {} };

  var STATE = {
    clarify: { label: 'Needs clarification', cls: 'clarify' },
    ready: { label: 'Ready for review', cls: 'ready' },
    running: { label: 'Running', cls: 'running' },
    completed: { label: 'Completed', cls: 'done' },
    partial: { label: 'Partially completed', cls: 'partial' },
    cancelled: { label: 'Cancelled', cls: 'cancelled' },
    resolved: { label: 'Clarified', cls: 'cancelled' },
    shadow: { label: 'Shadow run: nothing changed', cls: 'shadow' },
    info: { label: 'Read-only: no approval needed', cls: 'info' },
    awaiting: { label: 'Waiting for broker approval', cls: 'awaiting' }
  };
  var ST = {
    pending: { label: 'Waiting', icon: 'hollow', cls: 'pending' },
    running: { label: 'Running', icon: 'refresh', cls: 'running' },
    done: { label: 'Completed', icon: 'check', cls: 'done' },
    simulated: { label: 'Simulated, not sent', icon: 'hollow', cls: 'sim' },
    queued: { label: 'Queued offline', icon: 'clock', cls: 'sim' },
    excluded: { label: 'Excluded', icon: 'ban', cls: 'excluded' },
    skipped: { label: 'Skipped', icon: 'ban', cls: 'skipped' },
    shadow: { label: 'Would have run', icon: 'eye', cls: 'shadow' },
    failed: { label: 'Failed', icon: 'alert', cls: 'failed' }
  };
  R.ST = ST;

  function prov(kind, source, date) {
    var p = T.PROV[kind] || T.PROV.unknown;
    return '<span class="prov prov-' + kind + '">' + I(p.icon) + '<span>' + h(p.short) + '</span></span>' +
      (source ? '<span class="prov-src">' + h(source) + (date ? ', ' + h(T.fmtDate(date, { noDay: true })) : '') + '</span>' : '');
  }
  R.prov = prov;
  function consentChip(c) {
    var st = T.consentOf(c);
    return '<span class="consent consent-' + st + '">' + I(st === 'opted-out' ? 'ban' : st === 'unknown' || st === 'expired' ? 'question' : 'shield') + h(T.CONSENT_LABEL[st]) + '</span>';
  }
  R.consentChip = consentChip;
  function avatar(c, size) {
    return '<span class="av' + (size ? ' av-' + size : '') + '" aria-hidden="true">' + h(T.initials(c)) + '</span>';
  }
  function dis(card) { return card.status === 'ready' || card.status === 'awaiting' ? '' : ' disabled'; }
  R.avatar = avatar;
  function provBadge(pv) {
    if (!pv) return '';
    return '<span class="pv pv-' + (pv.kind === 'ai' ? 'ai' : 'rules') + '" title="' + (pv.kind === 'ai' ? 'Read by live AI; validated against your records before use' : 'Read by deterministic rules in your browser') + '">' + I(pv.kind === 'ai' ? 'spark' : 'search') + h(T.ai.badge(pv)) + '</span>';
  }
  R.provBadge = provBadge;

  /* ======================= header ======================= */
  R.top = function () {
    var s = S(), shadow = s.settings.mode === 'shadow';
    return '<a class="back-demos" href="../../index.html">' + I('back') + '<span class="bd-lg">All demos</span><span class="bd-sm">Demos</span></a>' +
      '<a class="top-brand" href="#/" aria-label="Tayoo, conversation">' + T.logo() + '<span>Tayoo</span></a>' +
      '<p class="top-clock">' + h(T.fmtDate(T.today(), { long: true })) + ', ' + h(T.clockStr()) + '</p>' +
      '<div class="mode-switch" role="group" aria-label="Execution mode">' +
      '<button type="button" data-act="mode" data-mode="active" aria-pressed="' + (!shadow) + '">Approvals</button>' +
      '<button type="button" data-act="mode" data-mode="shadow" aria-pressed="' + shadow + '">Shadow Mode</button></div>' +
      '<span class="top-spacer"></span>' +
      '<span class="speaking" id="speaking" hidden><span class="spk-bars" aria-hidden="true"><i></i><i></i><i></i></span><span>Speaking</span><button type="button" data-act="hush" class="spk-stop">Stop</button></span>' +
      (s.role === 'coordinator' ? '<button type="button" class="role-chip" data-act="lab" title="Switch roles in the Test lab">' + I('people') + '<span>Maude, coordinator</span></button>' : '') +
      (s.caps.offline ? '<span class="off-chip">' + I('ban') + 'Offline</span>' : '') +
      '<button type="button" class="search-btn" data-act="search" aria-label="Search everything (Ctrl or Cmd K)">' + I('search') + '<span class="sb-l">Search</span><kbd>⌘K</kbd></button>' +
      '<a class="icon-btn bell" href="#/inbox" aria-label="Inbox, ' + T.unread() + ' unread">' + I('mail') + (T.unread() ? '<span class="bell-n">' + Math.min(99, T.unread()) + '</span>' : '') + '</a>' +
      '<button type="button" class="icon-btn" data-act="toggle-speak" aria-pressed="' + !!s.settings.speak + '" aria-label="Spoken replies" title="Spoken replies">' + I(s.settings.speak ? 'speaker' : 'mute') + '</button>' +
      '<span class="demo-tag" title="Every person, address, price and message here is invented">Demo · fictional data</span>' +
      '<button type="button" class="btn btn-quiet btn-sm lab-btn" data-act="lab" aria-label="Test lab" aria-expanded="' + !!(T.app && T.app.labOpen) + '" aria-controls="lab">' + I('flask') + '<span>Test lab</span></button>' +
      '<button type="button" class="btn btn-quiet btn-sm" data-act="tour">' + I('tour') + '<span class="t-l">Tour</span></button>' +
      '<button type="button" class="btn btn-quiet btn-sm" data-act="reset">' + I('refresh') + '<span class="t-l">Reset</span></button>';
  };

  /* ======================= front door ======================= */
  function greeting() {
    var n = S().now.slice(11, 16).split(':'), m = +n[0] * 60 + +n[1];
    return m < 12 * 60 ? 'Good morning' : m < 18 * 60 ? 'Good afternoon' : 'Good evening';
  }
  function frontContext() {
    var rec = T.pendingRecaps(), pend = T.pendingCards(), cands = T.recoveryCandidates();
    if (pend.length) return 'A plan is waiting for your approval below.';
    if (rec.length) {
      var a = rec[rec.length - 1], c = T.client(a.client);
      return 'Your ' + T.fmtTime(a.start).replace(':00', '') + ' showing with ' + T.fullName(c) + ' ended at ' + T.fmtTime(a.end) + '. Tell me how it went.';
    }
    var elig = cands.filter(T.canEmail);
    if (elig.length) return elig.length + ' follow-up' + (elig.length === 1 ? ' is' : 's are') + ' overdue or missing. Want me to prepare ' + (elig.length === 1 ? 'it' : 'them') + '?';
    var nxt = T.cal.active().filter(function (a) { return (a.date + 'T' + a.start) >= T.nowISO() && a.client; })[0];
    if (nxt && T.client(nxt.client)) return 'Next: ' + nxt.title.toLowerCase() + ' with ' + T.fullName(T.client(nxt.client)) + ', ' + T.relDay(nxt.date).toLowerCase() + ' at ' + T.fmtTime(nxt.start) + '.';
    return 'What would you like to take care of?';
  }
  // Suggestions follow the records: scripted samples where one fits, otherwise prefilled requests
  R.suggestions = function () {
    var s = S(), out = [], rec = T.pendingRecaps();
    rec.slice().reverse().forEach(function (a) {
      var c = T.client(a.client), smp = T.SAMPLES.filter(function (x) { return x.id === a.client; })[0];
      if (smp) out.push({ sample: smp.id, label: smp.label });
      else out.push({ text: 'Just finished the showing at ' + (a.place || '') + ' with ' + T.fullName(c) + '. ', label: 'Recap ' + T.shortName(c) + '’s showing' });
    });
    if (T.recoveryCandidates().filter(T.canEmail).length) out.push({ sample: 'recovery', label: T.SAMPLES[1].label });
    var tx = s.transactions.filter(function (x) { return T.files.issueCount(x) > 0; })[0];
    if (tx) out.push(tx.id === 'tx-tremblay' ? { sample: 'tremblay', label: T.SAMPLES[2].label } : { text: 'Summarize the ' + tx.title + ' file', label: 'Check the ' + tx.title + ' file' });
    if (T.client('olivia') && !T.client('olivia').deleted) out.push({ sample: 'olivia', label: T.SAMPLES[4].label });
    if (!s.clients.length) out.push({ act: 'new-client', label: 'Add your first client' });
    out.push({ text: 'Find condos in Saint-Roch under 480k', label: 'Search listings' });
    return out.slice(0, 3);
  };
  R.chip = function (x) {
    if (x.sample) return '<button type="button" class="chip-say" data-act="sample" data-sample="' + x.sample + '">' + I('talk') + '<span>' + h(x.label) + '</span></button>';
    if (x.href) return '<a class="chip-say" href="' + h(x.href) + '">' + I('chevron') + '<span>' + h(x.label) + '</span></a>';
    if (x.act) return '<button type="button" class="chip-say" data-act="' + h(x.act) + '"' + (x.client ? ' data-client="' + h(x.client) + '"' : '') + (x.first ? ' data-first="' + h(x.first) + '" data-last="' + h(x.last || '') + '"' : '') + '>' + I('plus') + '<span>' + h(x.label) + '</span></button>';
    return '<button type="button" class="chip-say" data-act="prefill" data-text="' + h(x.text) + '">' + I('keyboard') + '<span>' + h(x.label) + '</span></button>';
  };
  R.front = function () {
    var s = S(), compact = s.thread.length > 0;
    var sug = R.suggestions();
    return '<div class="front-in">' +
      '<p class="front-meta"><span>' + h(T.fmtDate(T.today(), { long: true })) + ', ' + h(T.clockStr()) + '</span><span class="demo-tag only-m">Demo · fictional data</span></p>' +
      '<h1 class="greet">' + greeting() + ', ' + h(T.BROKER.first) + '.</h1>' +
      (compact ? '' :
        '<p class="greet-sub">' + h(frontContext()) + '</p>' +
        '<button type="button" class="orb-btn" id="talk-orb" data-act="talk" aria-describedby="orb-cap">' +
        '<span class="glass" aria-hidden="true"><span class="glass-sheen"></span>' + T.logo() + '</span>' +
        '<span class="orb-label">Tap to talk</span></button>' +
        '<p class="front-promise" id="orb-cap">Talk once after a showing or a call. Tayoo updates the right client, schedules what you promised and drafts the follow-up, then waits for your approval.</p>') +
      '<div class="suggest" role="group" aria-label="Suggestions">' +
      (compact ? '<span class="suggest-h">Try</span>' : '') +
      sug.map(R.chip).join('') +
      '<button type="button" class="chip-more" data-act="samples">More examples</button>' +
      '</div>' + (!compact && !s.tour.seen ? '<p class="front-tour">New here? <button type="button" class="btn-link" data-act="tour">Take the guided tour</button>, about two minutes, both workflows end to end.</p>' : '') + '</div>';
  };

  /* ======================= composer ======================= */
  R.composer = function () {
    var s = S(), voice = s.draftKind === 'voice' && s.draft;
    return '<form class="composer' + (voice ? ' has-voice' : '') + '" id="composer" data-form="ask" novalidate>' +
      (voice ? '<p class="draft-banner">' + I('talk') + '<span><strong>Voice draft</strong>, ' + (s.draftSource === 'sample' ? 'from a scripted sample' : 'from your browser’s transcription') + '. Fix anything first; nothing happens until you send it.</span><button type="button" class="btn-link discard" data-act="discard">Discard</button></p>' : '') +
      '<div class="composer-row">' +
      '<button type="button" class="mic" data-act="talk" aria-label="Talk to Tayoo">' + I('mic') + '</button>' +
      '<label class="sr-only" for="composer-input">Message Tayoo</label>' +
      '<textarea id="composer-input" class="' + (voice ? 'is-voice' : '') + '" rows="1" placeholder="Or type to Tayoo…" autocomplete="off">' + h(s.draft || '') + '</textarea>' +
      '<button type="submit" class="send" aria-label="Send to Tayoo">' + I('send') + '</button>' +
      '</div>' + (T.ai.on() ? '<p class="ai-line">' + I('spark') + '<span>Free text is read by live AI (' + h(window.LiveAI.model) + '), then checked against your records. <a href="#/settings">Change</a></span></p>' : '') + '</form>';
  };

  /* ======================= thread messages ======================= */
  R.message = function (m) {
    var s = S();
    if (m.role === 'broker') {
      var label = m.kind === 'voice' ? (m.source === 'sample' ? 'Voice note, scripted sample' : 'Voice note, live transcript') : 'Typed';
      return '<li class="msg msg-broker" data-id="' + m.id + '"><div class="said">' +
        '<p class="said-meta">' + I(m.kind === 'voice' ? 'talk' : 'keyboard') + '<span>' + label + (m.by && m.by !== T.BROKER.name ? ', by ' + h(m.by) : '') + '</span><time>' + h(T.relDay(m.at) === 'Today' ? '' : T.relDay(m.at) + ' ') + h(T.fmtTime(m.at.split('T')[1])) + '</time></p>' +
        '<p class="said-text" lang="' + (m.lang === 'FR' ? 'fr' : 'en') + '">' + h(m.text) + '</p></div></li>';
    }
    var inner = '';
    if (m.kind === 'text') inner = '<div class="t-body">' + (m.note ? '<p class="t-note">' + I('alert') + '<span>' + h(m.note) + '</span></p>' : '') + '<p>' + h(m.text) + '</p>' + (m.chips ? chips(m.chips) : '') + (m.pv ? '<p class="t-pv">' + provBadge(m.pv) + '</p>' : '') + '</div>';
    else if (m.kind === 'results') inner = '<div class="t-body"><p>' + h(m.text) + '</p>' + R.resultList(m.ids) + '<p class="t-chips"><a class="chip-say" href="#/listings" data-act="open-listings" data-filters="' + h(JSON.stringify(m.filters)) + '">' + I('chevron') + '<span>Open these in Listings</span></a></p></div>';
    else if (m.kind === 'working') inner = '<div class="t-body"><ol class="work">' + m.steps.map(function (x, i) {
      var state = i < m.done ? 'done' : i === m.done ? 'now' : 'wait';
      return '<li class="w-' + state + '">' + (state === 'done' ? I('check') : '<span class="w-dot" aria-hidden="true"></span>') + '<span>' + h(x) + '</span></li>';
    }).join('') + '</ol></div>';
    else if (m.kind === 'card') return '<li class="msg msg-card" data-id="' + m.id + '">' + R.card(s.cards[m.cardId]) + '</li>';
    else if (m.kind === 'receipt') return '<li class="msg msg-card" data-id="' + m.id + '">' + R.receipt(s.receipts.filter(function (r) { return r.id === m.receiptId; })[0]) + '</li>';
    else if (m.kind === 'brief') {
      var c = T.client(m.clientId);
      inner = '<div class="t-body brief"><p class="brief-h">' + I('clock') + '10-second briefing: ' + h(T.fullName(c)) + '</p><ul>' + m.lines.map(function (l) { return '<li>' + h(l) + '</li>'; }).join('') + '</ul>' +
        '<p class="brief-act"><button type="button" class="btn-link" data-act="say-brief" data-id="' + m.id + '">' + I('speaker') + 'Play it aloud</button><a class="btn-link" href="#/clients/' + c.id + '">Open ' + h(c.first) + '</a></p></div>';
    }
    return '<li class="msg msg-tayoo" data-id="' + m.id + '"><span class="t-mark" aria-hidden="true">' + T.logo() + '</span><span class="sr-only">Tayoo:</span>' + inner + '</li>';
  };
  function chips(list) {
    return '<div class="t-chips">' + list.map(function (c) {
      if (c.sample && !c.label) { var x = T.SAMPLES.filter(function (y) { return y.id === c.sample; })[0]; return R.chip({ sample: x.id, label: x.label }); }
      return R.chip(c);
    }).join('') + '</div>';
  }
  R.resultList = function (ids) {
    if (!ids.length) return '<p class="muted">No listing in the demo export matches. Try widening a filter.</p>';
    return '<ul class="res-list">' + ids.slice(0, 6).map(function (id) { var L = T.listing(id); return '<li><a href="#/listings/' + L.id + '"><span class="res-a">' + h(L.address) + '</span><span class="res-s">' + h(L.area) + ', ' + h(L.type.toLowerCase()) + ', ' + L.beds + ' bd, ' + T.money(L.price) + (L.fees ? ', fees ' + T.money(L.fees) : '') + ', garage ' + h(L.garage) + '</span></a></li>'; }).join('') + '</ul>' + (ids.length > 6 ? '<p class="muted">' + (ids.length - 6) + ' more in Listings.</p>' : '');
  };

  /* ======================= Action Cards ======================= */
  R.card = function (card) {
    if (!card) return '';
    var st = STATE[card.status] || STATE.ready;
    var done = /completed|shadow|partial|cancelled|resolved/.test(card.status);
    var body = '';
    if (card.type === 'showing') body = showingBody(card);
    else if (card.type === 'note') body = noteBody(card);
    else if (card.type === 'recovery') body = recoveryBody(card);
    else if (card.type === 'file') body = fileBody(card);
    else if (card.type === 'schedule') body = scheduleBody(card);
    else if (card.type === 'clarify') body = clarifyBody(card);
    else if (card.type === 'cancel') body = cancelBody(card);
    else if (card.type === 'listings') body = listingsBody(card);
    else if (card.type === 'multi') body = multiBody(card);
    var collapsible = done && card.type !== 'clarify' && card.type !== 'file';
    var openKey = 'plan-' + card.id;
    return '<article class="card card-' + card.type + ' is-' + st.cls + '" data-card="' + card.id + '" aria-labelledby="ct-' + card.id + '">' +
      '<div class="card-strip" aria-hidden="true"></div>' +
      '<header class="card-head"><p class="card-state"><span class="state-dot" aria-hidden="true"></span>' + h(st.label) + (card.status === 'awaiting' && card.requestedBy ? ' (from ' + h(card.requestedBy.split(' ')[0]) + ')' : '') + '</p>' +
      provBadge(card.source && card.source.provenance) +
      (card.type !== 'file' && card.type !== 'clarify' ? '<p class="card-ver">Plan v' + card.version + ' <span class="fp" title="Fingerprint of the exact payload you would approve">#' + h(card.fingerprint) + '</span></p>' : '') +
      '</header>' +
      '<h3 class="card-title" id="ct-' + card.id + '">' + h(card.title) + '</h3>' +
      (card.stale && (card.status === 'ready' || card.status === 'awaiting') ? '<div class="stale">' + I('alert') + '<p>' + h(card.stale) + ' Approval is blocked until you refresh it.</p><button type="button" class="btn btn-ghost btn-sm" data-act="refresh-card">' + I('refresh') + 'Refresh plan</button></div>' : '') +
      goal(card) + records(card) + parseBlock(card) +
      (collapsible ? '<details class="plan-done" data-ui="' + openKey + '"' + (T.ui.open[openKey] ? ' open' : '') + '><summary>Show the approved plan (v' + card.approvedVersion + ')</summary>' + body + '</details>' : body) +
      notActed(card) + footer(card) + '</article>';
  };
  function goal(card) {
    var c = card.clientId && T.client(card.clientId), g = '';
    if (card.type === 'showing') {
      var parts = [];
      if (card.diff.length) parts.push('update ' + T.shortName(c) + '’s preferences');
      if (card.task) parts.push('create the task you promised');
      if (card.email) parts.push('draft a follow-up email');
      g = parts.join(', ').replace(/, ([^,]*)$/, ', and $1');
      g = g.charAt(0).toUpperCase() + g.slice(1) + '. Send only what you approve.';
    } else if (card.type === 'note') g = 'Change what Tayoo remembers about ' + T.fullName(c) + ', with the source kept.';
    else if (card.type === 'recovery') g = 'Find ' + T.critText(card.criteria || T.critDefault()) + ' with an overdue promise, an unanswered request or a long silence. Prepare one personal email each. Send only to eligible recipients you approve.';
    else if (card.type === 'file') g = 'Compare the conditions, deadlines and key dates on file with the documents and your calendar. Separate what’s done from what’s missing or conflicting.';
    else if (card.type === 'schedule') g = card.mode === 'task' ? 'Create a commitment with a resolved date and time.' : card.mode === 'reschedule' ? 'Move the appointment without double-booking you, travel time included.' : 'Book time with ' + T.fullName(c) + ' without double-booking you, travel time included.';
    else if (card.type === 'cancel') g = 'Cancel the appointment and, if you want, tell ' + T.shortName(c) + '.';
    else if (card.type === 'listings') g = 'Send ' + T.shortName(c) + ' listings with facts from the listing data only, after a consent check.';
    else if (card.type === 'clarify') g = 'Tayoo needs one answer before it can plan anything.';
    else if (card.type === 'multi') g = (card.clauses || []).length > 1 ? 'Everything you asked, as one plan in ' + card.clauses.length + ' parts. Each part can be excluded or edited; only what you approve runs.' : 'Draft what you asked from your own words. Only what you approve runs.';
    return '<p class="card-goal"><span class="sr-only">Tayoo understood: </span>' + h(g) + '</p>';
  }
  function records(card) {
    var out = [], c = card.clientId && T.client(card.clientId);
    if (c) out.push('<a class="rec" href="#/clients/' + c.id + '">' + avatar(c, 'sm') + '<span>' + h(T.fullName(c)) + '<small>' + h(c.role) + ', ' + h(c.area) + '</small></span></a>');
    if (card.listingId) { var L = T.listing(card.listingId); out.push('<span class="rec">' + I('home') + '<span>' + h(L.address) + '<small>' + h(L.area) + ', ' + h(L.type) + ', ' + T.money(L.price) + '</small></span></span>'); }
    if (card.type === 'recovery') out.push('<span class="rec">' + I('people') + '<span>' + card.rows.length + ' named contacts<small>listed below, none hidden</small></span></span>');
    if (card.type === 'file') { var tx0 = T.tx(card.txId); if (tx0) out.push('<a class="rec" href="#/files/' + tx0.id + '">' + I('file') + '<span>' + h(tx0.property) + '<small>' + h(tx0.stage) + (tx0.accepted ? ', accepted ' + T.money(tx0.price) + ' on ' + h(T.fmtDate(tx0.accepted, { noDay: true })) : ', listed ' + T.money(tx0.price)) + '</small></span></a>'); }
    if ((card.type === 'cancel' || card.mode === 'reschedule' || card.type === 'multi') && (card.target || card.moveTarget)) { var ev0 = S().appointments.filter(function (a) { return a.id === (card.target || card.moveTarget); })[0]; if (ev0) out.push('<span class="rec">' + I('calendar') + '<span>' + h(ev0.title) + '<small>' + h(T.fmtDT(ev0.date + 'T' + ev0.start)) + (ev0.status === 'cancelled' ? ', cancelled' : '') + '</small></span></span>'); }
    if (!out.length) return '';
    var why = [card.clientWhy, card.listingWhy].filter(Boolean).join(' ');
    return '<div class="records" aria-label="Affected records">' + out.join('') + '</div>' + (why ? '<p class="records-why">' + I('link') + '<span>' + h(why) + '</span></p>' : '');
  }
  var SPAN_LABEL = { client: 'Client', place: 'Property', when: 'Date and time', budget: 'Budget', fees: 'Condo fees', price: 'Price', feature: 'Feature', positive: 'Liked', objection: 'Concern', promise: 'Commitment', area: 'Area', type: 'Property type', beds: 'Bedrooms', days: 'Days', unknown: 'Not a client' };
  var CLAUSE_KIND = { content: 'recap and preferences', task: 'task', schedule: 'appointment', reschedule: 'move an appointment', cancel: 'cancellation', listings: 'send listings', message: 'message to the client', followup: 'follow-up' };
  function parseBlock(card) {
    var src = card.source;
    if (!src || !src.text || !src.spans || !src.spans.length) return '';
    var t = src.text, sp = src.spans, i = 0, out = '';
    sp.forEach(function (s) {
      if (s.start < i) return;
      out += h(t.slice(i, s.start)) + '<mark class="m-' + s.type + '" title="' + h(SPAN_LABEL[s.type] || s.type) + '">' + h(t.slice(s.start, s.end)) + '</mark>';
      i = s.end;
    });
    out += h(t.slice(i));
    var list = sp.map(function (s) { return '<li><span class="pl-k m-' + s.type + '">' + h(SPAN_LABEL[s.type] || s.type) + '</span><span class="pl-v">“' + h(t.slice(s.start, s.end)) + '”' + (s.label && s.type !== 'positive' && s.type !== 'objection' && s.type !== 'promise' ? ' → ' + h(s.label) : '') + '</span></li>'; }).join('');
    var key = 'parse-' + card.id;
    return '<details class="parse" data-ui="' + key + '"' + (T.ui.open[key] ? ' open' : '') + '><summary>' + I('search') + 'How Tayoo read this <span class="parse-n">' + sp.length + ' detail' + (sp.length === 1 ? '' : 's') + ' used</span></summary>' +
      '<p class="said-text parse-text" lang="' + (src.lang === 'FR' ? 'fr' : 'en') + '">' + out + '</p>' +
      (card.clauses && card.clauses.length > 1 ? '<ol class="parse-parts">' + card.clauses.map(function (cl, i) { return '<li><span class="pp-n">' + (i + 1) + '</span><span class="pp-t">“' + h(cl.text) + '”</span><span class="pp-k">' + h(CLAUSE_KIND[cl.kind] || cl.kind) + '</span></li>'; }).join('') + '</ol><p class="parse-note">Split before each new request, so a date and a time count only inside their own part; the client carries across parts.</p>' : '') +
      (sp.length ? '<ul class="parse-list">' + list + '</ul>' : '<p class="muted">No structured details found in this text.</p>') +
      '<p class="parse-note">' + (src.provenance && src.provenance.kind === 'ai' ? 'Read by live AI (' + h(src.provenance.model) + '), then every name, listing and date was checked against your records. Unmarked words were not used.' : 'Read by deterministic rules running in your browser. No AI service was called, and unmarked words were not used.') + '</p></details>';
  }
  function secHead(n, title, toggle, card, sub) {
    return '<header class="sec-h">' + (n ? '<span class="sec-n" aria-hidden="true">' + n + '</span>' : '') + '<h4>' + h(title) + '</h4>' + (sub ? '<span class="sec-sub">' + sub + '</span>' : '') +
      (toggle ? '<label class="switch"><input type="checkbox" data-edit="' + toggle.path + '"' + (toggle.on ? ' checked' : '') + (toggle.lock ? ' disabled' : dis(card)) + '><span class="sw" aria-hidden="true"></span><span class="sw-l">Include</span></label>' : '') + '</header>';
  }
  function diffRows(card) {
    return card.diff.map(function (d, i) {
      var to = '', path = 'diff.' + i;
      if (d.kind === 'money') to = '<span class="money-in"><span aria-hidden="true">C$</span><input type="text" inputmode="numeric" value="' + T.money(d.to).replace('C$', '') + '" data-edit="' + path + '.to" data-num="1" aria-label="New ' + h(d.label.toLowerCase()) + ' in Canadian dollars"' + dis(card) + '></span>';
      else if (d.kind === 'fees') to = '<span class="money-in"><span aria-hidden="true">under C$</span><input type="text" inputmode="numeric" class="in-short" value="' + d.to + '" data-edit="' + path + '.to" data-num="1" aria-label="Maximum condo fees per month"' + dis(card) + '><span aria-hidden="true">a month</span></span>';
      else if (d.kind === 'strength') to = '<select data-edit="' + path + '.to" aria-label="New value for ' + h(d.label) + '"' + dis(card) + '>' + ['required', 'preferred', 'none'].map(function (v) { return '<option value="' + v + '"' + (d.to === v ? ' selected' : '') + '>' + T.strengthLabel(v) + '</option>'; }).join('') + '</select>';
      else if (d.kind === 'set') to = '<input type="text" class="in-set" value="' + h(d.to) + '" data-edit="' + path + '.to" aria-label="New value for ' + h(d.label) + '"' + dis(card) + '>';
      else to = '<span class="add-val ' + (d.voice === 'quote' ? 'is-quote' : 'is-said') + '">' + (d.voice === 'quote' ? '“' + h(d.add) + '”' : h(d.add)) + '</span>';
      var from = d.kind === 'add' ? '<span class="old add-plus">' + (d.voice === 'quote' ? 'Client’s words' : 'Add') + '</span>' : d.from == null ? '<span class="old is-none">' + h(d.fromDisplay) + '<span class="sr-only">, becomes</span></span>' : '<span class="old"><s>' + h(d.fromDisplay) + '</s><span class="sr-only"> changes to</span></span>';
      return '<li class="diff' + (d.include ? '' : ' is-off') + '">' +
        '<label class="inc"><input type="checkbox" data-edit="' + path + '.include"' + (d.include ? ' checked' : '') + dis(card) + '><span class="sr-only">Include ' + h(d.label) + '</span></label>' +
        '<div class="diff-main"><p class="diff-label">' + h(d.label) + '</p><div class="diff-vals">' + from + (d.kind !== 'add' ? '<span class="arrow" aria-hidden="true">→</span>' : '') + to + '</div>' +
        '<p class="diff-prov">' + prov('agent', d.voice === 'quote' ? 'Quoted in your note' : 'Your note', T.today()) +
        (d.listingFact ? '<span class="diff-fact">' + prov('verified', d.listingFact.label) + '<span class="prov-src">' + h(d.listingFact.source) + '</span></span>' : '') + '</p>' + (d.caution ? '<p class="caution">' + I('alert') + '<span>' + h(d.caution) + '</span></p>' : '') + '</div></li>';
    }).join('');
  }
  function memorySection(card, n) {
    var inc = card.diff.filter(function (d) { return d.include; }).length;
    return '<section class="sec">' + secHead(n, 'Memory changes', null, card, inc + ' of ' + card.diff.length + ' selected') +
      '<p class="sec-note">Before and after, field by field. Earlier values stay in ' + h(T.client(card.clientId).first) + '’s history.</p>' +
      '<ul class="diffs">' + diffRows(card) + '</ul></section>';
  }
  function altsBlock(card) {
    var a = card.alts;
    if (!a) return '';
    var src = T.LISTINGS_SOURCE;
    var head = '<p class="alts-src">' + I('file') + '<span>Searched ' + a.pool + ' records in ' + h(a.areas.join(' and ')) + ' from the ' + h(src.label.charAt(0).toLowerCase() + src.label.slice(1)) + ', imported ' + h(T.fmtDate(src.imported, { noDay: true })) + '. The Centris/QPAREB feed isn’t connected.</span></p>';
    if (!a.matches.length) return '<div class="alts">' + head + '<p class="muted">No record matches the updated criteria. Alternatives are unavailable; the task still keeps your promise visible.</p></div>';
    return '<div class="alts"><p class="alts-h">Candidates for your alternatives</p>' + head +
      '<ul class="alt-list">' + a.matches.map(function (id) {
        var L = T.listing(id);
        return '<li class="alt"><div><p class="alt-a">' + h(L.address) + '</p><p class="alt-s">' + h(L.area) + ', ' + h(L.type.toLowerCase()) + ', ' + L.beds + ' bedrooms, built ' + L.built + '</p></div><div class="alt-n"><p>' + T.money(L.price) + '</p><p class="alt-s">' + (L.fees ? 'fees ' + T.money(L.fees) + '/mo, ' : '') + 'garage: ' + h(L.garage) + '</p></div><span class="alt-id">' + h(L.id) + '</span></li>';
      }).join('') + '</ul>' +
      (a.excluded.length ? '<details class="alt-ex" data-ui="ex-' + card.id + '"' + (T.ui.open['ex-' + card.id] ? ' open' : '') + '><summary>' + a.excluded.length + ' records didn’t match</summary><ul>' + a.excluded.map(function (x) { var L = T.listing(x.id); return '<li><span>' + h(L.address) + '</span><span class="muted">' + h(x.why) + '</span></li>'; }).join('') + '</ul></details>' : '') +
      '<label class="check"><input type="checkbox" data-edit="alts.attach"' + (a.attach ? ' checked' : '') + dis(card) + '><span>Attach these ' + a.matches.length + ' to the task for your review. They are not sent.</span></label></div>';
  }
  function taskSection(card, n, idx) {
    var t = idx != null ? card.tasks[idx] : card.task, tp = idx != null ? 'tasks.' + idx : 'task';
    if (!t) return '';
    return '<section class="sec' + (t.include ? '' : ' is-off') + '">' + secHead(n, idx != null ? 'Task' : 'Commitment', { path: tp + '.include', on: t.include }, card, t.clause ? '“' + h(t.clause) + '”' : '') +
      '<div class="fgrid">' +
      '<label class="fld fld-wide"><span>Task</span><input type="text" value="' + h(t.title) + '" data-edit="' + tp + '.title"' + dis(card) + '></label>' +
      '<label class="fld"><span>Due</span><input type="datetime-local" value="' + h(t.due) + '" data-edit="' + tp + '.due"' + dis(card) + '></label>' +
      '<label class="fld"><span>Owner</span><select data-edit="' + tp + '.owner"' + dis(card) + '>' + [T.BROKER.name, T.BROKER.coordinator].map(function (o) { return '<option' + (t.owner === o ? ' selected' : '') + '>' + h(o) + '</option>'; }).join('') + '</select></label>' +
      (!card.clientId ? '<p class="sec-note fld-wide">Not linked to a client: it won’t count toward follow-up coverage.</p>' : '') +
      '</div>' +
      '<p class="interp">' + I('clock') + '<span>' + h(t.note) + '. ' + h(T.tzLabel(t.due.slice(0, 10))) + '.</span></p>' +
      (t.owner !== T.BROKER.name ? '<p class="interp">' + I('people') + '<span>' + h(t.owner) + ' is your coordinator: she can prepare this, but can’t send broker-branded messages without delegated authority.</span></p>' : '') +
      '<p class="sec-note">A task, not a calendar invitation. Nothing goes to the client from this step.</p>' +
      (idx != null ? '' : altsBlock(card)) + '</section>';
  }
  function aiDraftBtn(card, path, row) {
    if (!T.ai.on() || !(card.status === 'ready' || card.status === 'awaiting')) return '';
    return '<button type="button" class="btn btn-ghost btn-sm ai-btn" data-act="ai-draft"' + (row != null ? ' data-row="' + row + '"' : '') + '>' + I('spark') + 'Redraft with live AI</button>';
  }
  function draftBadge(by) {
    if (!by) return '<span class="pv pv-rules">' + I('file') + 'Template from your style memory</span>';
    if (by.kind === 'you') return '<span class="pv pv-you">' + I('pen') + 'Edited by you</span>';
    return provBadge(by);
  }
  function emailSection(card, n, title, path) {
    path = path || 'email';
    var e = path === 'email' ? card.email : path.split('.').reduce(function (o, k) { return o && o[isNaN(k) ? k : +k]; }, card), c = T.client(card.clientId), ce = c.consent.email;
    if (!e) return '';
    var tones = ['warm', 'brief', 'formal'];
    var kind = e.recipient ? 'Service message to a party on the file' : e.kind === 'commercial' ? 'Commercial electronic message (CASL)' : e.msg ? 'Client service message' : card.type === 'cancel' ? 'Client service note' : 'Client service follow-up';
    return '<section class="sec' + (e.include ? '' : ' is-off') + '">' + secHead(n, title || 'Follow-up email', { path: path + '.include', on: e.include, lock: e.locked }, card, e.clause ? '“' + h(e.clause) + '”' : '') +
      '<dl class="mail-meta"><div><dt>To</dt><dd>' + h(e.name) + ' &lt;' + h(e.to) + '&gt;</dd></div>' +
      (e.recipient ? '<div><dt>Role</dt><dd>' + h(e.recipient.role) + ' on the ' + h(e.recipient.file) + ' file. A message about the transaction, not marketing, so no consent is needed.</dd></div>' : '<div><dt>Consent</dt><dd>' + consentChip(c) + '<span class="muted">' + h(ce.source) + ', ' + h(T.fmtDate(ce.date, { noDay: true })) + '. Rechecked at send time.</span></dd></div>') +
      '<div><dt>Type</dt><dd>' + kind + ', in ' + (e.lang === 'FR' ? 'French' : 'English') + (e.recipient ? '' : e.clientLang && e.clientLang !== e.lang ? ' (' + h(c.first) + ' reads ' + (e.clientLang === 'FR' ? 'French' : 'English') + ': see below)' : ' (' + h(c.first) + '’s language)') + '</dd></div></dl>' +
      (e.locked && !e.recipient ? '<p class="warn">' + I('ban') + '<span>' + h(c.first) + ' has no valid email consent (' + h(T.CONSENT_LABEL[T.consentOf(c)].toLowerCase()) + '), so this step can’t be approved.</span></p>' : '') +
      '<label class="fld"><span>Subject</span><input type="text" value="' + h(e.subject) + '" data-edit="' + path + '.subject"' + dis(card) + '></label>' +
      '<label class="fld"><span>Message <span class="fld-pv">' + draftBadge(e.draftBy) + '</span></span><textarea rows="' + Math.min(18, e.body.split('\n').length + 3) + '" data-edit="' + path + '.body" lang="' + (e.lang === 'FR' ? 'fr' : 'en') + '"' + dis(card) + '>' + h(e.body) + '</textarea></label>' +
      (e.attach ? '<p class="caution">' + I('alert') + '<span>This message mentions ' + h(e.attach) + '. The demo sends text only, so attach it yourself or reword before approving.</span></p>' : '') + (e.newTime ? '<p class="sec-note">The time in this message comes from the planned slot and follows it if you change the slot.</p>' : '') +
      (e.mixed ? '<p class="caution">' + I('alert') + '<span>' + h(c.first) + ' reads ' + ((e.clientLang || c.lang) === 'FR' ? 'French' : 'English') + ', but I couldn’t translate every word of your request, so this draft keeps your words, in ' + (e.lang === 'FR' ? 'French' : 'English') + '. Translate or reword it before approving.</span></p>' : '') + (e.sms ? '<p class="sec-note">You said “text”: SMS isn’t configured, so this is drafted as an email.</p>' : '') + (e.followup ? '<p class="sec-note">Kept as a draft for the follow-up: it isn’t sent unless you include it. The listings are also attached to the task.</p>' : '') + (e.stale ? '<p class="warn">' + I('alert') + '<span>This message was edited or redrafted, and the plan has changed since. Tayoo kept the words; check that they still match.</span></p>' : '') +
      (path !== 'email' ? '' : card.type !== 'cancel' ? '<div class="tone" role="group" aria-label="Tone">' + tones.map(function (t) { return '<button type="button" data-act="edit-btn" data-path="email.tone" data-val="' + t + '" aria-pressed="' + (e.tone === t) + '"' + dis(card) + '>' + t.charAt(0).toUpperCase() + t.slice(1) + '</button>'; }).join('') + aiDraftBtn(card) + '<span class="tone-n">Style memory: ' + h(S().style.emoji === 'never' ? 'no emoji' : 'emoji ok') + ', short sign-off</span></div>' : '<div class="tone">' + aiDraftBtn(card) + '</div>') +
      '<p class="mail-foot"><span>Added to every email (sender identification and unsubscribe, CASL):</span> ' + h(T.drafts.footer(e.lang)).replace(/\n/g, '<br>') + '</p>' +
      '<p class="sim">' + I('hollow') + '<span>Simulated. This demo never sends email.' + (S().caps.offline ? ' Offline: it will wait in the outbox.' : '') + '</span></p></section>';
  }
  function cancelBody(card) {
    var a = S().appointments.filter(function (x) { return x.id === card.target; })[0];
    return '<section class="sec">' + secHead(1, 'Cancel the event', null, card) +
      (a ? '<p class="sched-what">' + h(a.title) + ', ' + h(T.fmtDT(a.date + 'T' + a.start, { long: true })) + (a.place ? ', ' + h(a.place) : '') + '</p>' : '<p class="muted">The event is gone.</p>') +
      (card.others && card.others.length ? '<p class="sec-note">' + card.others.length + ' other upcoming appointment' + (card.others.length === 1 ? '' : 's') + ' with this client stay' + (card.others.length === 1 ? 's' : '') + ' as is.</p>' : '') +
      '<p class="sec-note">The event stays in your calendar, struck through, so the history is clear.</p></section>' + emailSection(card, 2, 'Note to the client');
  }
  function listingsBody(card, n0) {
    var c = T.client(card.clientId);
    n0 = n0 || 0;
    return '<section class="sec">' + secHead(n0 + 1, 'Listings', null, card, card.rows.filter(function (r) { return r.include; }).length + ' of ' + card.rows.length + ' selected, ' + h(card.how)) +
      '<ul class="alt-list">' + card.rows.map(function (r, i) {
        var L = T.listing(r.id), saved = c.saved && c.saved.indexOf(r.id) > -1;
        return '<li class="alt' + (r.include ? '' : ' is-off') + '"><label class="inc"><input type="checkbox" data-edit="rows.' + i + '.include"' + (r.include ? ' checked' : '') + dis(card) + '><span class="sr-only">Include ' + h(L.address) + '</span></label><div><p class="alt-a">' + h(L.address) + '</p><p class="alt-s">' + h(L.area) + ', ' + h(L.type.toLowerCase()) + ', ' + L.beds + ' bedrooms' + (L.size ? ', ' + L.size + ' sq ft' : '') + (saved ? ', already saved' : '') + '</p></div><div class="alt-n"><p>' + T.money(L.price) + '</p><p class="alt-s">' + (L.fees ? 'fees ' + T.money(L.fees) + '/mo, ' : '') + 'garage: ' + h(L.garage) + '</p></div><span class="alt-id">' + h(L.id) + '</span></li>';
      }).join('') + '</ul>' + (card.howNote ? '<p class="sec-note">' + h(card.howNote) + '</p>' : '') + '<p class="alts-src">' + I('file') + '<span>' + h(T.LISTINGS_SOURCE.label) + ', imported ' + h(T.fmtDate(T.LISTINGS_SOURCE.imported, { noDay: true })) + '. Only these fields go in the email.</span></p></section>' + emailSection(card, n0 + 2, 'Email with the listings');
  }
  function showingBody(card) {
    var n = 0;
    return (card.diff.length ? memorySection(card, ++n) : '') + (card.task ? taskSection(card, ++n) : '') + (card.email ? emailSection(card, ++n) : '');
  }
  function noteBody(card) { return memorySection(card, 0); }

  function recoveryBody(card) {
    var rows = card.rows, el = rows.filter(function (r) { return r.bucket === 'eligible'; }), rv = rows.filter(function (r) { return r.bucket === 'review'; }), oo = rows.filter(function (r) { return r.bucket === 'optout'; });
    var sel = el.filter(function (r) { return r.include; }).length;
    var tones = ['warm', 'brief', 'formal'];
    function row(r) {
      var i = rows.indexOf(r), c = T.client(r.clientId), rc = r.signal || c.recovery || { reason: '', evidence: [] }, path = 'rows.' + i;
      var ev = r.bucket === 'eligible' ? (rc.evidence || []).map(function (e) {
        var client = /^Email from|^Text|^Sign-in|^Referral|^Website/.test(e.source) && !/opens/.test(e.source);
        return '<li><span class="' + (client ? 'q-client' : 'q-you') + '">' + (client ? '“' + h(e.quote) + '”' : h(e.quote)) + '</span> <span class="muted">' + h(e.source) + ', ' + h(T.fmtDate(e.date, { noDay: true })) + '</span></li>';
      }).join('') : '';
      var ctl = '';
      if (r.bucket === 'eligible') ctl = '<label class="sr-only" for="ex-' + card.id + '-' + i + '">Include ' + h(T.fullName(c)) + '</label><select id="ex-' + card.id + '-' + i + '" data-edit="' + path + '.reason"' + dis(card) + '>' + [['', 'Include'], ['handled', 'Exclude: handled elsewhere'], ['later', 'Exclude: not now'], ['signal', 'Exclude: wrong signal']].map(function (o) { return '<option value="' + o[0] + '"' + ((r.reason || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
      else if (r.bucket === 'review') ctl = '<label class="sr-only" for="rv-' + card.id + '-' + i + '">Consent review for ' + h(T.fullName(c)) + '</label><select id="rv-' + card.id + '-' + i + '" data-edit="' + path + '.review"' + dis(card) + '><option value="task"' + (r.review === 'task' ? ' selected' : '') + '>Create a review task</option><option value="skip"' + (r.review === 'skip' ? ' selected' : '') + '>Skip for now</option></select>';
      else ctl = '<span class="locked">' + I('ban') + 'Not contacted</span>';
      var draft = '';
      if (r.bucket === 'eligible') {
        var k = 'dr-' + card.id + '-' + i;
        draft = '<details class="row-draft" data-ui="' + k + '"' + (T.ui.open[k] ? ' open' : '') + '><summary>Draft email' + (c.lang === 'FR' ? ', in French' : '') + (r.draftBy && r.draftBy.kind === 'ai' ? ', live AI' : '') + '</summary>' +
          '<p class="row-note">' + consentChip(c) + '<span class="muted">' + h(c.consent.email.source) + ', ' + h(T.fmtDate(c.consent.email.date, { noDay: true })) + (c.consent.email.expires ? ', valid until ' + h(T.fmtDate(c.consent.email.expires, { noDay: true })) + ', ' + c.consent.email.expires.slice(0, 4) : '') + '</span></p>' +
          '<label class="fld"><span>Subject</span><input type="text" value="' + h(r.subject) + '" data-edit="' + path + '.subject"' + dis(card) + '></label>' +
          '<label class="fld"><span>Message <span class="fld-pv">' + draftBadge(r.draftBy) + '</span></span><textarea rows="' + Math.min(14, r.body.split('\n').length + 3) + '" lang="' + (c.lang === 'FR' ? 'fr' : 'en') + '" data-edit="' + path + '.body"' + dis(card) + '>' + h(r.body) + '</textarea></label>' + (aiDraftBtn(card, path, i) ? '<p>' + aiDraftBtn(card, path, i) + '</p>' : '') +
          '<p class="mail-foot"><span>Footer added:</span> ' + h(T.drafts.footer(c.lang)).replace(/\n/g, '<br>') + '</p></details>';
      }
      var note = r.bucket === 'review' ? '<p class="row-note">' + I('question') + '<span>' + h(c.consent.email.source) + '. Unknown consent is never treated as permission.</span></p>' :
        r.bucket === 'optout' ? '<p class="row-note">' + I('ban') + '<span>' + h(c.consent.email.source) + ', ' + h(T.fmtDate(c.consent.email.date, { noDay: true })) + '. An opt-out can’t be overridden from a card.</span></p>' : '';
      if (r.bucket === 'review' && T.consentOf(c) === 'expired') note = '<p class="row-note">' + I('question') + '<span>Implied consent expired on ' + h(T.fmtDate(c.consent.email.expires, { noDay: true })) + ' (' + h(c.consent.email.source) + '). Commercial email needs express consent now.</span></p>';
      return '<li class="row row-' + r.bucket + (r.bucket === 'eligible' && !r.include ? ' is-off' : '') + '">' +
        (r.bucket === 'eligible' ? '<span class="rank" aria-label="Rank ' + (el.indexOf(r) + 1) + '">' + (el.indexOf(r) + 1) + '</span>' : avatar(c, 'sm')) +
        '<div class="row-main"><p class="row-name"><a href="#/clients/' + c.id + '">' + h(T.fullName(c)) + '</a><span class="row-sub">' + h(c.role) + ', ' + h(c.area) + ', ' + c.lang + '</span>' + (r.bucket === 'eligible' ? consentChip(c) : '') + '</p>' +
        '<p class="row-why">' + h(rc.reason) + '</p>' + (ev ? '<ul class="row-ev">' + ev + '</ul>' : '') + note + draft + '</div>' +
        '<div class="row-ctl">' + ctl + '</div></li>';
    }
    var cr = card.criteria || T.critDefault();
    return '<div class="crit"><p class="crit-t">' + I('search') + '<span><strong>Segment:</strong> ' + h(T.critText(cr)) + ', no timely next action.</span></p>' + (card.status === 'ready' || card.status === 'awaiting' ? '<button type="button" class="btn-link" data-act="recovery-criteria">Change criteria</button>' : '') + '</div>' +
      '<div class="scope"><div class="scope-bar" role="img" aria-label="' + rows.length + ' matched: ' + el.length + ' eligible, ' + rv.length + ' need consent review, ' + oo.length + ' opted out">' +
      '<span class="sb sb-el" style="flex:' + el.length + '"></span><span class="sb sb-rv" style="flex:' + Math.max(rv.length, 0.0001) + '"></span><span class="sb sb-oo" style="flex:' + Math.max(oo.length, 0.0001) + '"></span></div>' +
      '<ul class="scope-legend"><li><span class="lg lg-el"></span><b>' + el.length + '</b> eligible for email</li><li><span class="lg lg-rv"></span><b>' + rv.length + '</b> need consent review</li><li><span class="lg lg-oo"></span><b>' + oo.length + '</b> opted out, excluded</li></ul>' +
      '<p class="scope-sel"><strong>' + sel + ' of ' + el.length + '</strong> eligible selected. Ranked by reason, not a score: promises you made first, then unanswered requests, then long silences.</p></div>' +
      '<div class="tone" role="group" aria-label="Tone for every draft">' + tones.map(function (t) { return '<button type="button" data-act="edit-btn" data-path="tone" data-val="' + t + '" aria-pressed="' + (card.tone === t) + '"' + dis(card) + '>' + t.charAt(0).toUpperCase() + t.slice(1) + '</button>'; }).join('') + '<span class="tone-n">Applies to drafts you haven’t edited</span></div>' +
      '<section class="sec"><header class="sec-h"><h4>Eligible</h4><span class="sec-sub">' + el.length + ' contacts</span></header><ol class="rows">' + el.map(row).join('') + '</ol></section>' +
      (rv.length ? '<section class="sec"><header class="sec-h"><h4>Consent review</h4><span class="sec-sub">' + rv.length + ' contacts, no message</span></header><ul class="rows">' + rv.map(row).join('') + '</ul></section>' : '') +
      (oo.length ? '<section class="sec"><header class="sec-h"><h4>Opted out</h4><span class="sec-sub">' + oo.length + ' contacts, excluded</span></header><ul class="rows">' + oo.map(row).join('') + '</ul></section>' : '') +
      '<p class="sim">' + I('hollow') + '<span>Simulated. This demo never sends email. Consent is rechecked for every recipient just before sending.</span></p>';
  }

  R.fileIssues = function (tx, inCard) {
    var chk = T.files.check(tx);
    return chk.issues.map(function (x, n) {
      if (x.type === 'conflict') {
        return '<div class="conflict"><p class="cf-h">' + I('alert') + 'Two values for the ' + h(x.label.toLowerCase()) + '</p>' +
          '<div class="cf-opts">' + x.values.map(function (o, k) {
            return '<div class="cf-opt"><p class="cf-val">' + h(T.fmtDate(o.value, { long: true })) + '</p><p class="cf-src">' + prov(o.recorded && !/Promise|letter|agreement|report|Deed/i.test(o.source) ? 'agent' : 'verified', o.source + (o.recorded ? ' (on file)' : '')) + '</p>' + (o.quote ? '<blockquote class="said-text">“' + h(o.quote) + '”</blockquote>' : '') + (o.calc ? '<p class="cf-calc">' + h(o.calc) + '</p>' : '') +
              '<button type="button" class="btn btn-ghost btn-sm" data-act="resolve" data-tx="' + tx.id + '" data-key="' + x.key + '" data-choice="' + k + '">Use ' + h(T.fmtDate(o.value, { noDay: true })) + '</button></div>';
          }).join('') + '</div>' +
          '<p class="cf-note">Tayoo won’t pick for you or treat a conflicting date as a deadline until you do. This isn’t legal advice; confirm with the other broker.' + (inCard ? ' <button type="button" class="btn-link" data-act="resolve" data-tx="' + tx.id + '" data-key="' + x.key + '" data-choice="none">Leave unresolved</button>' : '') + '</p></div>';
      }
      var act = x.type === 'missing-calendar' ? '<button type="button" class="btn btn-ghost btn-sm" data-act="tx-cal" data-tx="' + tx.id + '" data-key="' + x.key + '">' + I('calendar') + 'Add to calendar</button>' :
        x.type === 'calendar-mismatch' ? '<button type="button" class="btn btn-ghost btn-sm" data-act="tx-move" data-tx="' + tx.id + '" data-key="' + x.key + '" data-ev="' + x.event + '">' + I('calendar') + 'Move the event to match the file</button>' :
          x.type === 'overdue' || x.type === 'lender-late' ? '<span class="muted">Human-led: talk to the other broker about a waiver or an extension.</span>' : '';
      return '<div class="issue issue-' + x.type + '">' + I(x.type === 'overdue' || x.type === 'lender-late' ? 'alert' : 'calendar') + '<div><p>' + h(x.label) + '</p>' + (x.source ? '<p class="muted">Source: ' + h(x.source) + '</p>' : '') + (act ? '<p class="issue-act">' + act + '</p>' : '') + '</div></div>';
    }).join('');
  };
  R.fileLists = function (tx) {
    var chk = T.files.check(tx);
    return '<div class="file-cols"><section class="sec"><header class="sec-h"><h4>Done</h4><span class="sec-sub">' + chk.done.length + ' items</span></header><ul class="flist">' + chk.done.map(function (d) { return '<li>' + I('check', 'ok') + '<div><p>' + h(d.item) + '</p><p class="muted">' + (d.date ? h(T.fmtDate(d.date, { noDay: true })) + ', ' : '') + 'source: ' + h(d.source) + '</p></div></li>'; }).join('') + '</ul></section>' +
      '<section class="sec"><header class="sec-h"><h4>Open</h4><span class="sec-sub">' + chk.open.length + ' items</span></header>' + (chk.open.length ? '<ul class="flist">' + chk.open.map(function (d) { return '<li>' + I('hollow', 'open') + '<div><p>' + h(d.item) + '</p><p class="muted">' + h(d.note) + '. Source: ' + h(d.source) + '</p></div></li>'; }).join('') + '</ul>' : '<p class="muted">Nothing open.</p>') + '</section></div>';
  };
  function fileBody(card) {
    var tx = T.tx(card.txId);
    if (!tx) return '<p class="muted">This file was deleted.</p>';
    var issues = R.fileIssues(tx, true);
    return (issues || '<div class="conflict is-settled"><p class="cf-h">' + I('check') + 'Nothing needs attention</p><p>Every date on file matches the documents and your calendar.</p></div>') + R.fileLists(tx) +
      '<p class="sec-note">A checklist entry is not evidence that a legal condition is satisfied. ' + h(tx.counterpart) + '. <a href="#/files/' + tx.id + '">Open the file</a></p>';
  }

  function scheduleBody(card, n0) {
    var c = T.client(card.clientId);
    n0 = n0 || 0;
    if (card.mode === 'task') return taskSection(card, 1);
    var a = card.appt;
    var opts = card.suggestions.slice();
    if (opts.indexOf(a.requested) < 0) opts.push(a.requested);
    if (opts.indexOf(a.start) < 0) opts.unshift(a.start);
    var name = 'slot-' + card.id;
    var conflictsNow = T.cal.conflicts({ date: a.date, start: a.start, end: T.addMin(a.start, a.dur), area: a.area }, card.moveTarget || card.target);
    var mv = card.mode === 'reschedule' || card.apptMode === 'reschedule';
    return '<section class="sec">' + secHead(n0 + 1, mv ? 'New time' : a.title, null, card, a.clause ? '“' + h(a.clause) + '”' : '') +
      '<p class="sched-what">' + h(T.fullName(c)) + ', ' + a.dur + ' minutes, ' + (a.place ? h(a.place) : a.choose ? 'listing to choose' : 'place to confirm') + (a.area ? ' (' + h(a.area) + ')' : '') + '</p>' +
      (a.choose ? listingChooser(card) : '') +
      (mv ? '<p class="interp">' + I('calendar') + '<span>Now: ' + h(T.fmtDT(a.from, { long: true })) + '</span></p>' : '') +
      (a.whenText ? '<p class="interp">' + I('clock') + '<span>“' + h(a.whenText) + '” → ' + h(T.fmtDT(a.date + 'T' + a.requested, { long: true })) + '. ' + h(T.tzLabel(a.date)) + '.</span></p>' : '') +
      (card.fileCheck ? '<p class="' + (card.fileCheck.late ? 'warn' : 'interp') + '">' + I(card.fileCheck.late ? 'alert' : 'file') + '<span>' + h(card.fileCheck.text) + (card.fileCheck.late ? '' : ' The file’s history records the move.') + '</span></p>' : '') +
      (card.slotRule ? '<p class="interp">' + I('check') + '<span>' + (card.slotRule.picked ? 'First free slot ' + h(card.slotRule.text) + ': ' + h(T.fmtTime(card.slotRule.picked)) + ', with travel to and from your other appointments checked.' : 'No free slot ' + h(card.slotRule.text) + ' that day, travel included. Pick a time below.') + '</span></p>' : '') +
      (card.conflicts || []).map(function (x) { return '<p class="warn">' + I('alert') + '<span>At ' + T.fmtTime(a.requested) + ': ' + h(x.text) + '</span></p>'; }).join('') +
      '<fieldset class="slots"><legend>Time on ' + h(T.fmtDate(a.date, { long: true })) + '</legend>' + opts.map(function (t) {
        var cl = T.cal.conflicts({ date: a.date, start: t, end: T.addMin(t, a.dur), area: a.area }, card.moveTarget || card.target);
        return '<label class="slot' + (cl.length ? ' is-clash' : '') + '"><input type="radio" name="' + name + '" value="' + t + '" data-edit="appt.start"' + (a.start === t ? ' checked' : '') + dis(card) + '><span class="slot-t">' + T.fmtTime(t) + '</span><span class="slot-s">' + (cl.length ? (cl[0].type === 'overlap' ? 'overlaps, would double-book' : 'too tight for travel') : a.kind === 'call' ? 'free' : 'free, travel included') + '</span></label>';
      }).join('') + '</fieldset>' +
      (conflictsNow.length ? '<p class="sec-note">The selected time still conflicts. You can approve it anyway; the receipt will say so.</p>' : '') + '</section>' +
      '<section class="sec' + (card.invite.include ? '' : ' is-off') + '">' + secHead(n0 + 2, card.invite.update ? 'Updated invitation' : 'Calendar invitation', { path: 'invite.include', on: card.invite.include, lock: card.invite.locked }, card) +
      '<p class="sec-note">To ' + h(c.first) + ' at ' + h(card.invite.to) + '. A slot in your calendar is not an invitation the client accepted.' + (card.invite.locked ? ' No valid email consent, so no invitation.' : '') + '</p>' +
      '<p class="sim">' + I('hollow') + '<span>Simulated. No invitation leaves this browser.</span></p></section>';
  }

  // No address was given: offer the matching bundled listings, or keep an honest placeholder
  function listingChooser(card) {
    var a = card.appt, cr = a.criteria || {}, cands = a.candidates || [];
    var crit = [cr.types && cr.types.length ? cr.types.join(' or ').toLowerCase() : '', cr.areas && cr.areas.length ? 'in ' + cr.areas.join(' or ') : '', cr.max ? 'up to ' + T.money(cr.max) : ''].filter(Boolean).join(', ');
    var others = T.LISTINGS.filter(function (l) { return cands.indexOf(l.id) < 0; });
    return '<label class="fld"><span>Listing</span><select data-edit="appt.listing"' + dis(card) + '><option value=""' + (a.listing ? '' : ' selected') + '>Listing to choose (placeholder, no address)</option>' +
      (cands.length ? '<optgroup label="Matching ' + h(crit || 'the record') + '">' + cands.map(function (id) { var L = T.listing(id); return '<option value="' + id + '"' + (a.listing === id ? ' selected' : '') + '>' + h(L.address) + ' · ' + h(L.area) + ', ' + T.money(L.price) + '</option>'; }).join('') + '</optgroup>' : '') +
      '<optgroup label="Other listings">' + others.map(function (L) { return '<option value="' + L.id + '"' + (a.listing === L.id ? ' selected' : '') + '>' + h(L.address) + ' · ' + h(L.area) + ', ' + T.money(L.price) + '</option>'; }).join('') + '</optgroup></select></label>' +
      '<p class="sec-note">No address was given' + (a.listing ? '' : ', so the event is booked with a “listing to choose” placeholder and no invitation') + '. ' + (cands.length ? cands.length + ' bundled listing' + (cands.length === 1 ? '' : 's') + ' match' + (cands.length === 1 ? 'es' : '') + (crit ? ' ' + h(crit) : '') + ': pick one here.' : 'No bundled listing matches' + (crit ? ' ' + h(crit) : '') + '; pick another or keep the placeholder.') + ' Tayoo never invents an address.</p>';
  }
  // Clauses of the request that no part carries out, quoted so nothing is dropped silently
  function notActed(card) {
    if (!card.unhandled || !card.unhandled.length) return '';
    var c = card.clientId && T.client(card.clientId);
    return '<section class="sec not-acted" aria-label="Not acted on"><h4 class="sec-h na-h">' + I('alert') + 'Not acted on</h4>' + card.unhandled.map(function (u) {
      var t = u.clause.replace(/^(and|then|also|et|puis|but|mais)\s+/i, ''), withName = c && t.indexOf(c.first) < 0 ? t.replace(/^(\S)/, function (x) { return x.toUpperCase(); }) + ' (' + T.fullName(c) + ')' : t;
      return '<div class="na-line"><p>“' + h(u.clause) + '” — I didn’t turn this into an action. Edit, add it yourself, or try live AI.</p><button type="button" class="btn btn-ghost btn-sm" data-act="prefill" data-text="' + h(withName) + '">' + I('keyboard') + 'Put it in the composer</button></div>';
    }).join('') + '</section>';
  }
  function multiBody(card) {
    var n = 0, out = '', c = T.client(card.clientId), s = S();
    (card.questions || []).forEach(function (q) { out += '<div class="caution q-part">' + I('question') + '<span><strong>Needs you:</strong> ' + h(q.text) + (q.clause ? ' <em class="muted">“' + h(q.clause) + '”</em>' : '') + '</span>' + (q.kind === 'cancel' ? '<a class="btn-link" href="#/calendar">Open the calendar</a>' : '') + '</div>'; });
    if (card.note) {
      var shL = card.note.showing && T.listing(card.note.showing), shE = card.note.showingEv && s.appointments.filter(function (a) { return a.id === card.note.showingEv; })[0];
      out += '<section class="sec' + (card.note.include ? '' : ' is-off') + '">' + secHead(++n, card.isCall ? 'Log the call' : shL ? 'Log the showing' : 'Save your note', { path: 'note.include', on: card.note.include }, card) +
        (shL ? '<p class="sched-what">' + h(shL.address) + ', ' + h(shL.area) + ' · ' + (shE ? 'linked to the ' + h(T.fmtDT(shE.date + 'T' + shE.start)) + ' showing in your calendar' : 'not on your calendar, so it’s logged as a completed showing today') + '</p>' : '') +
        '<blockquote class="said-text note-q">' + h(card.note.text) + '</blockquote><p class="sec-note">Saved word for word to ' + h(c.first) + '’s notes and timeline' + (card.isCall || shL ? '; it counts as today’s contact.' : '.') + '</p></section>';
    }
    if (card.diff.length) out += memorySection(card, ++n);
    if (card.target && card.cancel) {
      var ev = s.appointments.filter(function (x) { return x.id === card.target; })[0];
      out += '<section class="sec' + (card.cancel.include ? '' : ' is-off') + '">' + secHead(++n, 'Cancel the event', { path: 'cancel.include', on: card.cancel.include }, card, '“' + h(card.cancel.clause) + '”') +
        (ev ? '<p class="sched-what">' + h(ev.title) + ', ' + h(T.fmtDT(ev.date + 'T' + ev.start, { long: true })) + (ev.place ? ', ' + h(ev.place) : '') + '</p>' : '') + '<p class="sec-note">It stays in your calendar, struck through. No note goes to the client from this step.</p></section>';
    }
    if (card.appt) { out += scheduleBody(card, n); n += 2; }
    (card.tasks || []).forEach(function (t, i) { out += taskSection(card, ++n, i); });
    if (card.rows) { out += listingsBody(card, n); n += 2; }
    (card.msgs || []).forEach(function (mg, i) { out += emailSection(card, ++n, 'Message to ' + (mg.recipient ? mg.recipient.name + ' (' + mg.recipient.role.toLowerCase() + ')' : c.first), 'msgs.' + i); });
    return out;
  }
  function clarifyBody(card) {
    var picked = card.picked;
    return '<ul class="choices">' + card.options.map(function (id) {
      var c = T.client(id), ap = S().appointments.filter(function (a) { return a.client === id && a.date === T.today(); })[0];
      return '<li><button type="button" class="choice' + (picked === id ? ' is-picked' : '') + '" data-act="pick-client" data-client="' + id + '"' + (card.status !== 'clarify' ? ' disabled' : '') + '>' + avatar(c) + '<span><strong>' + h(T.fullName(c)) + '</strong><small>' + h(c.role) + ', ' + h(c.area) + (ap ? '. ' + h(ap.title) + ' today at ' + T.fmtTime(ap.start) : c.lastContact ? '. Last contact ' + h(T.fmtDate(c.lastContact, { noDay: true })) : '') + '</small></span></button></li>';
    }).join('') + '</ul><p class="sec-note">People who share a name are never merged automatically.</p>';
  }

  function footer(card) {
    var s = S();
    if (card.type === 'file' || card.type === 'clarify') return '';
    if (card.status === 'ready' || card.status === 'awaiting') {
      var shadow = s.settings.mode === 'shadow', coord = s.role === 'coordinator' && T.needsBroker(card);
      var label = card.stale ? 'Refresh before approving' : coord ? (card.status === 'awaiting' ? 'Waiting for Alex' : 'Send to Alex for approval') : shadow ? 'Run in Shadow Mode' : 'Approve plan v' + card.version;
      return '<footer class="bind"><div class="perf" aria-hidden="true"></div>' +
        '<p class="bind-text">Approving binds <strong>plan v' + card.version + '</strong> <span class="fp">#' + h(card.fingerprint) + '</span>: ' + h(scopeText(card)) + '. Editing anything creates a new version.</p>' +
        (coord ? '<p class="bind-none is-shadow">' + I('people') + 'You’re signed in as the coordinator: you can prepare this, but sends and memory changes need the broker.</p>' : card.status === 'awaiting' ? '<p class="bind-none is-shadow">' + I('people') + h(card.requestedBy || 'Your coordinator') + ' prepared this plan and asked for your approval.</p>' : '') +
        (shadow ? '<p class="bind-none is-shadow">' + I('eye') + 'Shadow Mode is on: approving records what Tayoo would do. Nothing changes.</p>' : '<p class="bind-none">Nothing has happened yet.</p>') +
        '<div class="bind-act"><button type="button" class="btn btn-quiet" data-act="reject">Reject</button><button type="button" class="btn btn-primary" data-act="approve"' + (scopeCount(card) && !card.stale && !(coord && card.status === 'awaiting') ? '' : ' disabled') + '>' + label + '</button></div></footer>';
    }
    if (card.status === 'cancelled') return '<footer class="bind is-run"><p class="bind-none">' + (card.replaced ? 'Replaced by a refreshed plan below.' : 'Rejected or withdrawn. Nothing changed.') + '</p></footer>';
    if (!card.steps) return '';
    var counts = {};
    card.steps.forEach(function (x) { counts[x.status] = (counts[x.status] || 0) + 1; });
    var meta = '<p class="bind-meta">Approved by ' + h(card.approver || T.BROKER.name) + (card.requestedBy ? ' (prepared by ' + h(card.requestedBy) + ')' : '') + ' at ' + h(T.fmtTime(card.approvedAt.split('T')[1])) + ', plan v' + card.approvedVersion + ' <span class="fp">#' + h(card.approvedFp) + '</span></p>';
    if (card.status !== 'running') {
      var parts = [];
      if (counts.done) parts.push(counts.done + ' completed');
      if (counts.simulated) parts.push(counts.simulated + ' simulated, not sent');
      if (counts.queued) parts.push(counts.queued + ' queued offline');
      if (counts.skipped) parts.push(counts.skipped + ' skipped');
      if (counts.excluded) parts.push(counts.excluded + ' excluded');
      if (counts.shadow) parts.push(counts.shadow + ' step' + (counts.shadow === 1 ? '' : 's') + ' would have run');
      return '<footer class="bind is-run is-done"><p class="bind-sum">' + I(card.status === 'shadow' ? 'eye' : 'check') + '<span>' + h(parts.join(', ')) + '. The receipt below explains each step.</span></p>' + meta + '</footer>';
    }
    return '<footer class="bind is-run"><ol class="run">' + card.steps.map(function (x) {
      var st = ST[x.status] || ST.pending;
      return '<li class="st-' + st.cls + '"><span class="st-ic">' + I(st.icon) + '</span><span class="st-l">' + h(x.label) + '</span><span class="st-tag">' + h(st.label) + '</span></li>';
    }).join('') + '</ol>' + meta + '</footer>';
  }
  function multiScope(card) {
    var p = [], s = S();
    if (card.note && card.note.include) p.push(card.note.showing ? '1 showing logged' : card.isCall ? '1 call note' : '1 note');
    var m = card.diff.filter(function (d) { return d.include; }).length;
    if (m) p.push(m + ' memory change' + (m === 1 ? '' : 's'));
    if (card.target && card.cancel && card.cancel.include) p.push('cancel 1 appointment');
    if (card.appt) { p.push((card.apptMode === 'reschedule' ? 'move 1 appointment to ' : '1 appointment on ') + T.fmtDT(card.appt.date + 'T' + card.appt.start) + (card.appt.listing || !card.appt.choose ? '' : ' (listing to choose)')); if (card.invite.include) p.push('1 invitation'); }
    var nt = (card.tasks || []).filter(function (t) { return t.include; }).length;
    if (nt) p.push(nt + ' task' + (nt === 1 ? '' : 's'));
    if (card.rows) { var nl = card.rows.filter(function (r) { return r.include; }).length; if (nl) p.push('save ' + nl + ' listing' + (nl === 1 ? '' : 's')); if (card.email.include) p.push('1 email to 1 named recipient'); }
    var nm = (card.msgs || []).filter(function (x) { return x.include; }).length;
    if (nm) p.push(nm + ' message' + (nm === 1 ? '' : 's') + ' to ' + T.client(card.clientId).first);
    return p;
  }
  function scopeCount(card) {
    if (card.type === 'multi') return multiScope(card).length;
    if (card.type === 'showing') return card.diff.filter(function (d) { return d.include; }).length + (card.task && card.task.include ? 1 : 0) + (card.email && card.email.include ? 1 : 0);
    if (card.type === 'note') return card.diff.filter(function (d) { return d.include; }).length;
    if (card.type === 'recovery') return card.rows.filter(function (r) { return r.include || r.review === 'task'; }).length;
    if (card.type === 'schedule') return 1;
    if (card.type === 'listings') return card.rows.filter(function (r) { return r.include; }).length;
    return 1;
  }
  function scopeText(card) {
    var p = [];
    if (card.type === 'multi') p = multiScope(card);
    if (card.type === 'showing' || card.type === 'note') {
      var m = card.diff.filter(function (d) { return d.include; }).length;
      if (m) p.push(m + ' memory change' + (m === 1 ? '' : 's'));
      if (card.task && card.task.include) p.push('1 task');
      if (card.email && card.email.include) p.push('1 email to 1 named recipient');
    } else if (card.type === 'recovery') {
      var e = card.rows.filter(function (r) { return r.include; }).length, rv = card.rows.filter(function (r) { return r.review === 'task'; }).length;
      p.push(e + ' email' + (e === 1 ? '' : 's') + ' to ' + e + ' named recipient' + (e === 1 ? '' : 's'));
      if (rv) p.push(rv + ' consent-review task' + (rv === 1 ? '' : 's'));
    } else if (card.type === 'schedule') {
      if (card.mode === 'task') p.push('1 task due ' + T.fmtDT(card.task.due));
      else if (card.mode === 'reschedule') { p.push('move 1 appointment to ' + T.fmtDT(card.appt.date + 'T' + card.appt.start)); if (card.invite.include) p.push('1 updated invitation'); }
      else { p.push('1 appointment on ' + T.fmtDT(card.appt.date + 'T' + card.appt.start)); if (card.invite.include) p.push('1 invitation'); }
    } else if (card.type === 'cancel') {
      p.push('cancel 1 appointment'); if (card.email.include) p.push('1 note to 1 named recipient');
    } else if (card.type === 'listings') {
      var nl = card.rows.filter(function (r) { return r.include; }).length;
      p.push('save ' + nl + ' listing' + (nl === 1 ? '' : 's')); if (card.email.include) p.push('1 email to 1 named recipient');
    }
    return p.length ? p.join(', ') : 'nothing selected';
  }
  R.scopeText = scopeText;

  /* ======================= receipt ======================= */
  R.receipt = function (r, compact) {
    if (!r) return '';
    var c = r.clientId && T.client(r.clientId);
    var counts = {};
    r.steps.forEach(function (x) { counts[x.status] = (counts[x.status] || 0) + 1; });
    return '<article class="receipt' + (r.shadow ? ' is-shadow' : '') + '" aria-labelledby="rt-' + r.id + '">' +
      '<header class="rc-h"><p class="rc-tag">' + (r.shadow ? 'Shadow receipt' : 'Receipt') + '</p><h3 id="rt-' + r.id + '">' + h(r.title) + '</h3>' +
      '<p class="rc-meta">Plan v' + r.version + ' <span class="fp">#' + h(r.fingerprint) + '</span>, approved by ' + h(r.approver) + ' at ' + h(T.fmtTime(r.approvedAt.split('T')[1])) + '</p></header>' +
      (compact ? '<details class="rc-more" data-ui="rcm-' + r.id + '"' + (T.ui.open['rcm-' + r.id] ? ' open' : '') + '><summary>' + r.steps.length + ' steps: ' + Object.keys(counts).map(function (k) { return counts[k] + ' ' + (ST[k] || ST.pending).label.toLowerCase(); }).join(', ') + '</summary>' : '') +
      '<ol class="rc-steps">' + r.steps.map(function (x) {
        var st = ST[x.status] || ST.pending;
        return '<li class="st-' + st.cls + '"><span class="st-ic">' + I(st.icon) + '</span><div><p class="st-l">' + h(x.label) + '</p>' + (x.detail ? '<p class="st-d">' + h(x.detail) + '</p>' : '') + '</div><span class="st-tag">' + h(st.label) + '</span></li>';
      }).join('') + '</ol>' + (compact ? '</details>' : '') +
      '<p class="rc-sum">' + h(r.summary) + '</p>' +
      (compact ? '' : '<div class="rc-act">' + (c ? '<a class="btn btn-ghost btn-sm" href="#/clients/' + c.id + '">Open ' + h(c.first) + '</a>' : '') +
        (r.type === 'recovery' ? '<a class="btn btn-ghost btn-sm" href="#/ledger">See the ledger</a>' : '') +
        (r.undoable && !r.undone ? '<button type="button" class="btn btn-quiet btn-sm" data-act="undo" data-receipt="' + r.id + '">' + I('undo') + 'Undo local changes</button>' : '') +
        (r.undone ? '<span class="muted">Undone at ' + h(T.fmtTime(r.undone.split('T')[1])) + '</span>' : '') +
        '<a class="btn-link" href="#/activity">All receipts</a></div>') +
      '</article>';
  };

  /* ======================= views ======================= */
  function vHead(title, sub, opts) {
    opts = opts || {};
    return '<header class="v-head">' +
      '<a class="v-back" href="' + (opts.back || '#/') + '">' + I('back') + '<span>' + h(opts.backLabel || 'Conversation') + '</span></a>' +
      (opts.close ? '<a class="v-close" href="#/" aria-label="Close and show Today">' + I('close') + '</a>' : '') +
      '<h2 class="v-title" tabindex="-1">' + h(title) + '</h2>' + (sub ? '<p class="v-sub">' + sub + '</p>' : '') + '</header>';
  }
  R.vHead = vHead;

  R.today = function () {
    var s = S(), now = T.nowISO(), today = T.today();
    var needs = [];
    T.pendingRecaps().forEach(function (a) {
      var c = T.client(a.client), smp = T.SAMPLES.filter(function (x) { return x.id === a.client; })[0];
      needs.push('<li class="need">' + I('talk') + '<div><p><strong>Recap ' + h(T.fullName(c)) + '’s showing</strong></p><p class="muted">Ended ' + (a.date === today ? 'at ' : T.fmtDate(a.date) + ' ') + T.fmtTime(a.end) + ', ' + h(a.place) + '. No recap yet.</p></div>' +
        '<span class="need-act">' + (smp ? '<button type="button" class="btn btn-primary btn-sm" data-act="sample" data-sample="' + smp.id + '">Sample</button>' : '') + '<button type="button" class="btn btn-' + (smp ? 'ghost' : 'primary') + ' btn-sm" data-act="recap" data-ev="' + a.id + '">Recap</button></span></li>');
    });
    T.pendingCards().forEach(function (cd) {
      needs.push('<li class="need">' + I('task') + '<div><p><strong>' + h(cd.title) + '</strong></p><p class="muted">' + h((STATE[cd.status] || {}).label) + (cd.type === 'clarify' ? '' : ', plan v' + cd.version) + (cd.stale ? ', needs a refresh' : '') + '</p></div><button type="button" class="btn btn-ghost btn-sm" data-act="goto-card" data-card="' + cd.id + '">Review</button></li>');
    });
    var over = T.openTasks().filter(function (t) { return T.isOverdue(t) && !t.internal; });
    if (over.length) needs.push('<li class="need need-warn">' + I('alert') + '<div><p><strong>' + over.length + ' overdue commitment' + (over.length === 1 ? '' : 's') + '</strong></p><p class="muted">' + over.map(function (t) { var c = T.client(t.client); return c ? h(c.first) : h(t.title); }).join(', ') + '. Ask Tayoo to recover them.</p></div><button type="button" class="btn btn-ghost btn-sm" data-act="sample" data-sample="recovery">Recover</button></li>');
    s.transactions.forEach(function (tx) {
      var n = T.files.issueCount(tx);
      if (n) needs.push('<li class="need">' + I('file') + '<div><p><strong>' + h(tx.title) + ': ' + n + ' item' + (n === 1 ? '' : 's') + ' to check</strong></p><p class="muted">' + h(T.files.check(tx).issues[0].label) + '</p></div><a class="btn btn-ghost btn-sm" href="#/files/' + tx.id + '">Check</a></li>');
    });
    var unread = s.inbox.filter(function (n) { return !n.read; }).slice(0, 3);
    if (unread.length) needs.push('<li class="need">' + I('mail') + '<div><p><strong>' + T.unread() + ' unread in your inbox</strong></p><p class="muted">' + unread.map(function (n) { return h(n.title); }).join('; ') + '</p></div><a class="btn btn-ghost btn-sm" href="#/inbox">Open</a></li>');
    var tasks = T.openTasks().filter(function (t) { return t.due <= T.addDays(today, 4) + 'T23:59'; });
    var cv = T.coverage();
    return vHead('Today', h(T.fmtDate(today, { long: true })) + ', ' + h(T.clockStr()) + ' in Québec City', { backLabel: 'Conversation' }) +
      '<section class="blk"><h3 class="blk-h">Needs you</h3>' + (needs.length ? '<ul class="needs">' + needs.join('') + '</ul>' : '<p class="empty">' + I('check') + 'Nothing is waiting on you right now.</p>') + '</section>' +
      '<section class="blk"><h3 class="blk-h">Agenda <a class="blk-link" href="#/calendar">Calendar</a></h3>' + R.agendaDays(today, 4, true) + '</section>' +
      '<section class="blk"><h3 class="blk-h">Commitments, next 4 days <button type="button" class="blk-link" data-act="new-task">New task</button></h3>' + (tasks.length ? '<ul class="tasks">' + tasks.map(R.taskRow).join('') + '</ul>' : '<p class="empty">' + I('check') + 'Nothing due in the next four days.</p>') + '</section>' +
      '<section class="blk"><h3 class="blk-h">Follow-up coverage</h3><a class="cover" href="#/ledger"><span class="meter" role="img" aria-label="' + cv.pct + ' percent"><span style="width:' + cv.pct + '%"></span></span><span class="cover-t"><strong>' + cv.pct + '%</strong> ' + cv.covered + ' of ' + cv.eligible + ' eligible contacts have a timely next action</span></a></section>';
  };
  // Agenda list used by Today and the Calendar: any day range, generic actions per event
  R.agendaDays = function (from, days, compact) {
    var s = S(), now = T.nowISO(), out = '';
    for (var i = 0; i < days; i++) {
      var date = T.addDays(from, i);
      var items = s.appointments.filter(function (a) { return a.date === date && (!compact || a.status !== 'cancelled'); });
      if (!items.length) { if (!compact) out += '<h4 class="day-h">' + h(T.relDay(date) === T.fmtDate(date) ? T.fmtDate(date, { long: true }) : T.relDay(date) + ', ' + T.fmtDate(date, { noDay: true })) + '</h4><p class="muted ag-empty">Nothing scheduled.</p>'; continue; }
      out += '<h4 class="day-h">' + h(T.relDay(date) === T.fmtDate(date) ? T.fmtDate(date, { long: true }) : T.relDay(date) + ', ' + T.fmtDate(date, { noDay: true })) + '</h4><ol class="agenda">' + items.map(function (a, idx) {
        var past = (a.date + 'T' + a.end) <= now, c = a.client && T.client(a.client), cancelled = a.status === 'cancelled';
        var conf = cancelled ? [] : T.cal.conflicts(a, a.id);
        var tag = cancelled ? '<span class="tag tag-warn">Cancelled' + (a.cancelledBy === 'client' ? ' by client' : '') + '</span>' : past ? (a.kind === 'showing' ? (a.recapped ? '<span class="tag tag-ok">' + I('check') + 'Recapped</span>' : '<button type="button" class="btn-link" data-act="recap" data-ev="' + a.id + '">' + I('talk') + 'Recap</button>') : '<span class="tag">Done</span>') :
          (c && !c.deleted ? '<button type="button" class="btn-link" data-act="brief" data-client="' + c.id + '">' + I('speaker') + 'Brief me</button>' : '');
        var ctl = compact ? '' : '<span class="ag-ctl">' + (!cancelled ? '<button type="button" class="btn-link" data-act="edit-event" data-ev="' + a.id + '">Edit</button>' : '') + (!cancelled && !past ? '<button type="button" class="btn-link" data-act="cancel-event" data-ev="' + a.id + '">Cancel</button>' : '') + '<button type="button" class="btn-link danger" data-act="delete-event" data-ev="' + a.id + '">Delete</button></span>';
        return '<li class="ag' + (past ? ' is-past' : '') + (cancelled ? ' is-cancelled' : '') + '"><time>' + T.fmtTime(a.start) + '</time><div><p><strong>' + h(a.title) + '</strong>' + (c ? ' · <a href="#/clients/' + c.id + '">' + h(T.fullName(c)) + '</a>' : a.who ? ' · ' + h(a.who) : '') + '</p><p class="muted">' + h(a.place || '') + (a.area && (a.place || '').indexOf(a.area) < 0 ? ' (' + h(a.area) + ')' : '') + (a.fromCard ? ', booked by Tayoo' : '') + ', until ' + T.fmtTime(a.end) + '</p>' +
          conf.map(function (x) { return '<p class="ag-warn">' + I('alert') + h(T.cal.describe(x)) + '</p>'; }).join('') + ctl + '</div>' + tag + '</li>';
      }).join('') + '</ol>';
    }
    return out || '<p class="empty">' + I('calendar') + 'Nothing scheduled.</p>';
  };
  R.taskRow = function (t) {
    var c = T.client(t.client), od = T.isOverdue(t);
    return '<li class="task' + (od ? ' is-over' : '') + (t.status === 'done' ? ' is-done' : '') + '">' +
      '<button type="button" class="tick" data-act="' + (t.status === 'done' ? 'task-reopen' : 'task-done') + '" data-task="' + t.id + '" aria-label="' + (t.status === 'done' ? 'Reopen: ' : 'Mark done: ') + h(t.title) + '">' + I('check') + '</button>' +
      '<div><p>' + h(t.title) + '</p><p class="muted">' + (od ? '<span class="od">Overdue</span> ' : '') + (t.status === 'done' ? 'Done ' + h(T.fmtDT(t.doneAt)) : 'Due ' + h(T.fmtDT(t.due))) + (c ? ', <a href="#/clients/' + c.id + '">' + h(T.fullName(c)) + '</a>' : '') + (t.owner !== T.BROKER.name ? ', ' + h(t.owner) : '') + (t.internal ? ', internal' : '') + (t.alts ? ', ' + t.alts.length + ' listings attached' : '') + '</p>' +
      '<p class="task-ctl"><button type="button" class="btn-link" data-act="edit-task" data-task="' + t.id + '">Edit</button><button type="button" class="btn-link danger" data-act="delete-task" data-task="' + t.id + '">Delete</button></p></div></li>';
  };
  var taskRow = R.taskRow;

  R.clients = function () {
    var s = S(), q = T.fold(T.ui.clientQ || ''), f = T.ui.clientFilter;
    var list = s.clients.filter(function (c) {
      if (q && T.fold(T.fullName(c) + ' ' + c.area + ' ' + c.role + ' ' + c.stage + ' ' + c.email).indexOf(q) < 0) return false;
      if (f === 'buyers') return /Buyer/.test(c.role);
      if (f === 'sellers') return /Seller/.test(c.role);
      if (f === 'gap') return T.consentOf(c) !== 'opted-out' && c.stage !== 'Closed' && !T.coverageOf(c).ok;
      if (f === 'consent') return !T.canEmail(c);
      if (f === 'leads') return c.stage === 'Lead';
      return true;
    }).sort(function (a, b) { return a.last.localeCompare(b.last, 'fr'); });
    var filters = [['all', 'All'], ['buyers', 'Buyers'], ['sellers', 'Sellers'], ['leads', 'Leads'], ['gap', 'No next action'], ['consent', 'Consent issues']];
    return vHead('Clients', s.clients.length + ' contacts in this workspace' + (s.clients.some(function (c) { return c.createdBy; }) ? ', including ones you added' : '') + '. Most were imported from your existing CRM (CSV, Oct 5); Tayoo works alongside it.') +
      '<div class="cl-tools"><div class="cl-row"><label class="search">' + I('search') + '<span class="sr-only">Search clients</span><input type="search" id="client-q" placeholder="Search by name, area, stage or email" value="' + h(T.ui.clientQ || '') + '" data-filter="q"></label><button type="button" class="btn btn-primary btn-sm" data-act="new-client">' + I('plus') + 'New client</button></div>' +
      '<div class="fchips" role="group" aria-label="Filter">' + filters.map(function (x) { return '<button type="button" data-act="cfilter" data-f="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '<p class="muted cl-count" role="status">' + list.length + ' shown</p>' +
      '<ul class="clist">' + list.map(function (c) {
        var cv = T.coverageOf(c), oo = T.consentOf(c) === 'opted-out';
        return '<li><a class="cl" href="#/clients/' + c.id + '">' + avatar(c) + '<span class="cl-main"><span class="cl-name">' + h(T.fullName(c)) + '</span><span class="cl-sub">' + h(c.role) + ', ' + h(c.area) + ', ' + c.lang + ' · ' + h(c.stage) + '</span>' +
          '<span class="cl-next' + (cv.ok ? '' : (oo || c.stage === 'Closed') ? ' is-mute' : ' is-gap') + '">' + (cv.ok ? h(cv.why) : oo ? 'Opted out of commercial email' : c.stage === 'Closed' ? 'File closed' : 'No timely next action') + '</span></span>' + consentChip(c) + '</a></li>';
      }).join('') + '</ul>' + (list.length ? '' : '<p class="empty">No client matches. Try a first name, a neighbourhood, or add a new client.</p>');
  };

  R.client = function (id) {
    var s = S(), c = T.client(id);
    if (!c || c.deleted) return vHead('Client not found', c && c.deleted ? 'This record was deleted. Undo it from the toast, or restore it from the Test lab’s event log.' : 'This record doesn’t exist in the demo workspace.', { back: '#/clients', backLabel: 'Clients' });
    var tasks = s.tasks.filter(function (t) { return t.client === id; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
    var appts = s.appointments.filter(function (a) { return a.client === id && a.date >= T.today(); });
    var ce = c.consent.email, txs = T.files.forClient(id), subj = (s.subjects || []).filter(function (x) { return x.client === id; });
    var sig = T.signalOf(c), cv = T.coverageOf(c);
    return vHead(T.fullName(c), h(c.role) + ', ' + h(c.area) + ', ' + h(c.stage) + '. Writes in ' + (c.lang === 'FR' ? 'French' : 'English') + '.', { back: '#/clients', backLabel: 'Clients', close: true }) +
      '<div class="cd-consent"><p>' + consentChip(c) + '<span>Email: ' + h(ce.source) + ', ' + h(T.fmtDate(ce.date, { noDay: true })) + (ce.expires ? '. ' + (T.consentOf(c) === 'expired' ? 'Expired ' : 'Valid until ') + h(T.fmtDate(ce.expires, { noDay: true })) + ', ' + ce.expires.slice(0, 4) : '') + '</span></p><p class="muted">' + h(c.email || 'No email') + (c.phone ? ' · ' + h(c.phone) : '') + '. SMS: not configured, so SMS drafts are blocked.</p></div>' +
      '<div class="cd-act"><button type="button" class="btn btn-ghost btn-sm" data-act="brief" data-client="' + id + '">' + I('speaker') + 'Brief me</button><button type="button" class="btn btn-ghost btn-sm" data-act="prefill" data-text="' + h(c.first + ' ') + '">' + I('talk') + 'Tell Tayoo</button><button type="button" class="btn btn-ghost btn-sm" data-act="memory-form" data-client="' + id + '">' + I('pen') + 'Propose a memory change</button><button type="button" class="btn btn-ghost btn-sm" data-act="edit-client" data-client="' + id + '">Edit contact &amp; consent</button><button type="button" class="btn btn-quiet btn-sm danger" data-act="delete-client" data-client="' + id + '">' + I('trash') + 'Delete</button></div>' +
      (!cv.ok && sig ? '<p class="cd-sig">' + I('alert') + '<span><strong>No timely next action.</strong> ' + h(sig.reason) + '</span><button type="button" class="btn-link" data-act="prefill" data-text="' + h('Find the clients I haven’t followed up with') + '">Recover</button></p>' : '') +
      '<section class="blk"><h3 class="blk-h">What Tayoo remembers</h3>' +
      (c.memory.length ? '<dl class="mem">' + c.memory.map(function (m) {
        return '<div class="mem-row"><dt>' + h(m.label) + '</dt><dd><span class="mem-v' + (m.prov === 'unknown' ? ' is-unknown' : '') + (m.quote ? ' is-quote' : '') + '">' + h(m.display) + '</span><span class="mem-p">' + prov(m.prov, m.source, m.date) + '</span></dd></div>';
      }).join('') + '</dl>' : '<p class="empty">Nothing recorded yet. Tell Tayoo something about ' + h(c.first) + ' or propose a memory change.</p>') +
      '<p class="legend">' + ['verified', 'agent', 'inferred', 'conflicting', 'unknown'].map(function (k) { return prov(k); }).join('') + '</p></section>' +
      '<section class="blk"><h3 class="blk-h">Notes</h3><form class="note-form" data-form="note" data-client="' + id + '"><label class="sr-only" for="note-' + id + '">New note about ' + h(c.first) + '</label><textarea id="note-' + id + '" rows="2" placeholder="Add a note. It’s saved as is; use “Plan this” to turn it into an Action Card."></textarea><p class="note-act"><button type="submit" class="btn btn-ghost btn-sm">Save note</button></p></form>' +
      ((c.notes || []).length ? '<ul class="notes">' + c.notes.map(function (n) { return '<li><p class="said-text">' + h(n.text) + '</p><p class="muted">' + h(T.fmtDT(n.at)) + ', ' + h(n.by) + ' <button type="button" class="btn-link" data-act="plan-note" data-client="' + id + '" data-note="' + n.id + '">Plan this</button><button type="button" class="btn-link danger" data-act="delete-note" data-client="' + id + '" data-note="' + n.id + '">Delete</button></p></li>'; }).join('') + '</ul>' : '') + '</section>' +
      '<section class="blk"><h3 class="blk-h">Next actions <button type="button" class="blk-link" data-act="new-task" data-client="' + id + '">New task</button> <button type="button" class="blk-link" data-act="new-event" data-client="' + id + '">New event</button></h3>' + ((tasks.length || appts.length) ? '<ul class="tasks">' + appts.map(function (a) { return '<li class="task' + (a.status === 'cancelled' ? ' is-done' : '') + '"><span class="tick is-cal" aria-hidden="true">' + I('calendar') + '</span><div><p>' + h(a.title) + (a.status === 'cancelled' ? ' (cancelled)' : '') + '</p><p class="muted">' + h(T.fmtDT(a.date + 'T' + a.start)) + ', ' + h(a.place) + '</p><p class="task-ctl"><button type="button" class="btn-link" data-act="edit-event" data-ev="' + a.id + '">Edit</button></p></div></li>'; }).join('') + tasks.map(taskRow).join('') + '</ul>' : '<p class="empty">No next action. ' + (T.consentOf(c) === 'opted-out' ? 'Opted out, so no commercial follow-up.' : 'This contact counts against your follow-up coverage.') + '</p>') + '</section>' +
      ((c.saved || []).length ? '<section class="blk"><h3 class="blk-h">Saved listings</h3><ul class="res-list">' + c.saved.map(function (lid) { var L = T.listing(lid); return '<li><a href="#/listings/' + lid + '"><span class="res-a">' + h(L.address) + '</span><span class="res-s">' + h(L.area) + ', ' + T.money(L.price) + ' · ' + h(L.id) + '</span></a><button type="button" class="btn-link" data-act="unsave" data-client="' + id + '" data-listing="' + lid + '">Remove</button></li>'; }).join('') + '</ul><p><button type="button" class="btn btn-ghost btn-sm" data-act="prefill" data-text="' + h('Send ' + c.first + ' the listings saved to the record') + '">' + I('mail') + 'Send these to ' + h(c.first) + '</button></p></section>' : '') +
      (txs.length || subj.length ? '<section class="blk"><h3 class="blk-h">Files and evaluations</h3><ul class="res-list">' + txs.map(function (tx) { var n = T.files.issueCount(tx); return '<li><a href="#/files/' + tx.id + '"><span class="res-a">' + h(tx.title) + '</span><span class="res-s">' + h(tx.property) + ', ' + h(tx.stage) + (n ? ', ' + n + ' to check' : '') + '</span></a></li>'; }).join('') + subj.map(function (x) { return '<li><a href="#/cma/' + x.id + '"><span class="res-a">CMA: ' + h(x.address) + '</span><span class="res-s">' + h(x.area) + ', ' + h(x.type.toLowerCase()) + '</span></a></li>'; }).join('') + '</ul></section>' : '') +
      (c.history.length ? '<section class="blk"><h3 class="blk-h">Changes</h3><ol class="hist">' + c.history.map(function (x) {
        return '<li><p><strong>' + h(x.field) + '</strong>: <s>' + h(x.from) + '</s> → ' + h(x.to) + '</p><p class="muted">' + h(T.fmtDate(x.date, { noDay: true })) + (x.at ? ' ' + h(T.fmtTime(x.at.split('T')[1])) : '') + ', ' + h(x.by) + '. ' + h(x.source) + '</p></li>';
      }).join('') + '</ol></section>' : '') +
      (c.timeline.length ? '<section class="blk"><h3 class="blk-h">Timeline</h3><ol class="tl">' + c.timeline.map(function (x) { return '<li><time>' + h(T.fmtDate(x.date, { noDay: true })) + '</time><span>' + h(x.text) + '</span></li>'; }).join('') + '</ol></section>' : '');
  };

  R.ledger = function () {
    var s = S(), L = T.LEDGER_SEED, l = T.ledger(), b = L.baseline, cv = l.coverage;
    var hrs = (l.minutes / 60).toFixed(1);
    var meetingsUnique = {}; l.meetings.forEach(function (o) { meetingsUnique[o.client] = 1; });
    var repliesUnique = {}; l.replies.forEach(function (o) { repliesUnique[o.client] = 1; });
    function line(label, basis, value, denom, how, key) {
      return '<li class="lg-row"><div class="lg-l"><p class="lg-label">' + h(label) + '</p><p class="lg-basis basis-' + basis.toLowerCase().replace(/\W+/g, '-') + '">' + h(basis) + '</p></div><div class="lg-v"><p class="lg-n">' + value + '</p><p class="lg-d">' + denom + '</p></div>' +
        '<details class="lg-how" data-ui="lg-' + key + '"' + (T.ui.open['lg-' + key] ? ' open' : '') + '><summary>How it’s counted</summary>' + how + '</details></li>';
    }
    var overdueList = s.tasks.filter(function (t) { return t.status === 'open' && t.due >= L.activeSince && t.due < T.nowISO(); });
    var chainRows = s.outreach.slice().sort(function (a, b) { return a.sent > b.sent ? -1 : 1; }).map(function (o) {
      var n1 = '<span class="ch-n is-on">Sent ' + h(T.fmtDate(o.sent, { noDay: true })) + (o.simulated ? ' (simulated)' : '') + '</span>';
      var n2 = o.status === 'replied' ? '<span class="ch-n is-on">Reply ' + h(T.fmtDate(o.reply, { noDay: true })) + ' <em>' + (o.replyKind === 'observed' ? 'observed' : 'you confirmed') + '</em></span>' : '<span class="ch-n">Awaiting reply until ' + h(T.fmtDate(o.windowEnd, { noDay: true })) + '</span>';
      var n3 = o.meeting ? '<span class="ch-n is-on">Meeting ' + h(T.fmtDate(o.meeting, { noDay: true })) + ' <em>confirmed' + (o.duplicate ? ', counted once' : '') + '</em></span>' : '<span class="ch-n">No meeting yet</span>';
      var act = o.status === 'awaiting' ? '<button type="button" class="btn btn-quiet btn-sm" data-act="mark-reply" data-o="' + o.id + '">Mark reply received</button>' : (!o.meeting ? '<button type="button" class="btn btn-quiet btn-sm" data-act="mark-meeting" data-o="' + o.id + '">Mark meeting booked</button>' : '');
      return '<li class="chain"><p class="ch-name"><a href="#/clients/' + o.client + '">' + h(o.name) + '</a></p><p class="ch-track">' + n1 + n2 + n3 + '</p>' + (act ? '<p class="ch-act">' + act + '</p>' : '') + '</li>';
    }).join('');
    return vHead('Revenue Recovery Ledger', 'Since ' + h(T.fmtDate(L.activeSince, { long: true })) + ', when approvals went live. Each line shows its basis and denominator.') +
      '<ol class="ledger">' +
      line('Time returned', 'Estimate', '≈ ' + hrs + ' h', l.recaps + ' recaps, ' + l.outreachApproved + ' follow-ups', '<p>' + l.recaps + ' recaps × ' + (b.recapManual - b.recapReview) + ' min + ' + l.outreachApproved + ' follow-ups × ' + (b.followManual - b.followReview) + ' min = ' + l.minutes + ' min.</p><p class="muted">From your own manual baseline (' + h(b.window) + '): ' + b.recapManual + ' min per recap by hand vs ' + b.recapReview + ' min reviewing a card; ' + b.followManual + ' min per personal follow-up vs ' + b.followReview + ' min. Not a measurement of each action.</p>', 'time') +
      line('Commitments kept on time', 'Observed', l.commitments.onTime + ' of ' + l.commitments.due, l.commitments.overdue + ' overdue now', '<p>Tasks due since Oct 12 and closed by their due time. Overdue right now:</p><ul>' + overdueList.map(function (t) { return '<li>' + h(t.title) + ' (due ' + h(T.fmtDate(t.due, { noDay: true })) + ')</li>'; }).join('') + '</ul>', 'commit') +
      line('Follow-up coverage', 'Observed', cv.pct + '%', cv.covered + ' of ' + cv.eligible + ' eligible contacts', '<p>A contact is covered when it has a future task, a future appointment, or a follow-up still inside its 14-day reply window. Opted-out contacts are not in the denominator.</p><p>Not covered (' + cv.uncovered.length + '):</p><ul class="inline-list">' + cv.uncovered.map(function (c) { return '<li><a href="#/clients/' + c.id + '">' + h(T.fullName(c)) + '</a></li>'; }).join('') + '</ul>', 'cover') +
      line('Recovered conversations', 'Observed or confirmed', Object.keys(repliesUnique).length + '', 'from ' + s.outreach.length + ' recovery follow-ups', '<p>A conversation counts only after a reply is observed in the mailbox or you confirm it. A drafted or sent email is never counted as a result. Each contact counts once.</p>', 'conv') +
      line('Appointments from recovery', 'Confirmed by you', Object.keys(meetingsUnique).length + '', 'from ' + Object.keys(repliesUnique).length + ' conversations', '<p>A meeting linked to several messages counts once. Tayoo doesn’t claim it caused a sale because it touched a contact, and commission-weighted pipeline is not shown as revenue.</p>', 'meet') +
      '</ol>' +
      '<section class="blk"><h3 class="blk-h">Recovery chain</h3><p class="muted">Request, approved action, observed reply, appointment. This demo has no mailbox, so you confirm replies yourself.</p><ul class="chains">' + chainRows + '</ul></section>' +
      '<section class="blk"><h3 class="blk-h">Shadow Mode, ' + h(L.shadow.window) + '</h3><p>Tayoo watched for two weeks and proposed <strong>' + L.shadow.proposals + '</strong> actions without changing anything. You did <strong>' + L.shadow.didYourself + '</strong> of them yourself; <strong>' + L.shadow.missed + '</strong> would have been missed. ' + L.shadow.stillOpen.length + ' were still open on Oct 23: ' + L.shadow.stillOpen.map(function (id) { var c = T.client(id); return c && !c.deleted ? '<a href="#/clients/' + id + '">' + h(T.fullName(c)) + '</a>' : h(id); }).join(', ') + '.</p>' + (s.counters.shadowRuns ? '<p class="muted">Shadow runs in this session: ' + s.counters.shadowRuns + '.</p>' : '') + '</section>' +
      '<section class="blk"><h3 class="blk-h">Product health</h3><dl class="health"><div><dt>Cards approved</dt><dd>' + l.health.approved + '</dd></div><div><dt>Edited before approval</dt><dd>' + l.health.edited + '</dd></div><div><dt>Rejected</dt><dd>' + l.health.rejected + '</dd></div><div><dt>Opt-outs</dt><dd>' + l.health.optOuts + '</dd></div></dl><p class="muted">Correction rate so far: ' + Math.round(l.health.edited / Math.max(1, l.health.approved) * 100) + '% of approved cards were edited first.</p></section>';
  };

  R.activity = function () {
    var s = S();
    return vHead('Activity', 'Every receipt Tayoo produced, newest first. Completed, simulated, excluded and skipped steps are labelled separately.') +
      (s.receipts.length ? '<ul class="rc-list">' + s.receipts.map(function (r) { return '<li>' + R.receipt(r, true) + '</li>'; }).join('') + '</ul>' : '<p class="empty">' + I('activity') + 'No receipts yet. Approve a plan in the conversation and its receipt appears here.</p>') +
      '<section class="blk"><h3 class="blk-h">Event log</h3>' + (s.events.length ? '<ol class="tl tl-wide">' + s.events.slice(0, 80).map(function (e) { return '<li><time>' + h(T.relDay(e.at) === 'Today' ? '' : T.fmtDate(e.at, { noDay: true }) + ' ') + h(T.fmtTime(e.at.split('T')[1])) + '</time><span>' + h(e.text) + '</span></li>'; }).join('') + '</ol>' : '<p class="muted">Nothing logged in this session yet.</p>') +
      '<h4 class="day-h">Earlier (demo history)</h4><ol class="tl">' + T.LEDGER_SEED.recaps.slice().reverse().map(function (x) { return '<li><time>' + h(T.fmtDate(x.date, { noDay: true })) + '</time><span>Showing recap approved: ' + h(x.client) + '</span></li>'; }).join('') + '</ol></section>';
  };

  R.settings = function () {
    var s = S(), st = s.style, set = s.settings, ai = T.ai.status();
    var conns = [
      ['Mailbox', 'Demo mailbox, simulated', 'Gmail and Microsoft 365 aren’t connected. Sends are simulated, labelled, and listed in the outbox.', 'sim'],
      ['Calendar', 'Demo calendar, local', 'Appointments live in this browser. Invitations are simulated.', 'sim'],
      ['Existing CRM', 'CSV import, Oct 5', 'Contact identity stays owned by your CRM; Tayoo owns proposed memory and workflow evidence.', 'ok'],
      ['Listing data', 'Authorized export (demo CSV), Oct 22', T.LISTINGS.length + ' active listings and ' + T.SOLD.length + ' sales from the last 12 months. The QPAREB/Centris structured feed is not connected; public site scraping is excluded.', 'ok'],
      ['SMS', 'Not configured', 'No sender or inbound opt-out handling, so SMS drafts are blocked.', 'off']
    ];
    var sr = T.voice.supported, sp = T.voice.canSpeak;
    return vHead('Settings', 'Workspace: ' + h(T.BROKER.name) + ', ' + h(T.BROKER.agency) + '. Demo with fictional data.') +
      '<section class="blk"><h3 class="blk-h">Execution mode</h3><div class="radios">' +
      '<label class="radio"><input type="radio" name="mode" value="active" data-set="mode"' + (set.mode !== 'shadow' ? ' checked' : '') + '><span><strong>Approvals</strong><small>Plans run after you approve them. Local records change; sends are simulated.</small></span></label>' +
      '<label class="radio"><input type="radio" name="mode" value="shadow" data-set="mode"' + (set.mode === 'shadow' ? ' checked' : '') + '><span><strong>Shadow Mode</strong><small>Tayoo proposes and records what it would have done. Nothing changes.</small></span></label></div></section>' +
      '<section class="blk"><h3 class="blk-h">Who is using Tayoo</h3><div class="radios">' +
      '<label class="radio"><input type="radio" name="role" value="broker" data-role="broker"' + (s.role !== 'coordinator' ? ' checked' : '') + '><span><strong>' + h(T.BROKER.name) + ', broker</strong><small>Approves sends, invitations and memory changes.</small></span></label>' +
      '<label class="radio"><input type="radio" name="role" value="coordinator" data-role="coordinator"' + (s.role === 'coordinator' ? ' checked' : '') + '><span><strong>' + h(T.BROKER.coordinator) + ', coordinator</strong><small>Prepares plans and tasks. Anything that sends or changes memory goes to Alex for approval.</small></span></label></div></section>' +
      '<section class="blk"><h3 class="blk-h">Live AI</h3>' +
      '<p class="ai-state ' + (ai.on ? 'is-on' : '') + '">' + I('spark') + '<span><strong>' + (ai.on ? 'On.' : 'Off.') + '</strong> ' + h(ai.why) + '</span></p>' +
      '<label class="check"><input type="checkbox" data-set="useAI"' + (set.useAI ? ' checked' : '') + '><span>Use live AI to read free text and redraft emails when a key is set. Scripted samples, the Test lab and every approval still run on rules.</span></label>' +
      '<div class="lai-host" data-lai-host></div>' +
      '<p class="muted">Live AI only proposes. Its answer is checked against your records and shown on the same Action Card with a “Live AI” badge; nothing runs until you approve. On any error, the rules take over and the conversation says so.</p></section>' +
      '<section class="blk"><h3 class="blk-h">Voice</h3>' +
      '<p class="muted">' + (sr ? 'Live transcription is available in this browser. The microphone is only on while the capture screen is open.' : 'Speech recognition isn’t available' + (s.caps.sr ? ' in this browser' : ' (switched off in the Test lab)') + ', so capture uses scripted samples or typing.') + '</p>' +
      '<label class="check"><input type="checkbox" data-set="speak"' + (set.speak ? ' checked' : '') + '><span>Spoken replies after voice requests' + (sp ? '' : ' (no voices available here, so replies stay on screen)') + '</span></label>' +
      '<label class="fld"><span>Dictation language</span><select data-set="recLang"><option value="en-CA"' + (set.recLang === 'en-CA' ? ' selected' : '') + '>English (Canada)</option><option value="fr-CA"' + (set.recLang === 'fr-CA' ? ' selected' : '') + '>Français (Canada)</option></select></label>' +
      '<label class="fld"><span>Default “morning” time</span><input type="time" value="' + h(set.morning) + '" data-set="morning"></label></section>' +
      '<section class="blk"><h3 class="blk-h">Style memory</h3><p class="muted">New drafts follow these. Existing drafts keep your edits.</p>' +
      '<label class="fld"><span>English sign-off</span><textarea rows="2" data-style="signEN">' + h(st.signEN) + '</textarea></label>' +
      '<label class="fld"><span>French sign-off</span><textarea rows="2" data-style="signFR" lang="fr">' + h(st.signFR) + '</textarea></label>' +
      '<p class="muted">Emoji: never. Length: short. Preferred channel: email.</p></section>' +
      '<section class="blk"><h3 class="blk-h">Connections</h3><ul class="conns">' + conns.map(function (x) { return '<li class="conn conn-' + x[3] + '"><div><p><strong>' + h(x[0]) + '</strong>: ' + h(x[1]) + '</p><p class="muted">' + h(x[2]) + '</p></div></li>'; }).join('') + '</ul></section>' +
      '<section class="blk"><h3 class="blk-h">Demo data</h3><p class="muted">Saved in this browser only (localStorage key “tayoo-v3”)' + (T.store.storageOk ? '' : '. Storage is blocked here, so changes last until you close the tab') + '. The Test lab has presets, the demo clock, event injection and JSON import.</p><div class="cd-act"><button type="button" class="btn btn-ghost btn-sm" data-act="lab">' + I('flask') + 'Open the Test lab</button><button type="button" class="btn btn-ghost btn-sm" data-act="export">' + I('download') + 'Export workspace JSON</button><button type="button" class="btn btn-quiet btn-sm" data-act="reset">' + I('refresh') + 'Reset demo</button></div></section>';
  };
})();
