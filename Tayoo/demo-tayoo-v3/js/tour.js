/* Tayoo V3 — presenter tour. Walks both signature workflows end to end on the real UI.
   Each step can "ensure" its precondition, so the tour works from any state and after a reset. */
(function () {
  'use strict';
  var T = (window.Tayoo = window.Tayoo || {});
  var S = function () { return T.store.state; };
  var $ = function (id) { return document.getElementById(id); };

  function latest(type, client) {
    var s = S(), ids = Object.keys(s.cards), i;
    for (i = s.thread.length - 1; i >= 0; i--) {
      var m = s.thread[i];
      if (m.kind !== 'card') continue;
      var c = s.cards[m.cardId];
      if (c && c.type === type && (!client || c.clientId === client) && c.status !== 'cancelled') return c;
    }
    return null;
  }
  function sel(card, inner) { return card ? '#msgs [data-card="' + card.id + '"] ' + (inner || '') : null; }
  function waitFor(fn, ms) {
    var t0 = Date.now();
    return new Promise(function (res) {
      (function poll() { var v = fn(); if (v || Date.now() - t0 > (ms || 8000)) return res(v); setTimeout(poll, 60); })();
    });
  }
  function go(hash) { if (location.hash !== hash) location.hash = hash; return T.wait(60); }
  function ensureSarahCard() {
    var c = latest('showing', 'sarah');
    if (c) return Promise.resolve(c);
    if (T.capture.open) T.capture.stop();
    var s = S(), smp = T.SAMPLES[0];
    return go('#/').then(function () {
      if (s.draft && /1280 Avenue du Parc/.test(s.draft)) return T.app.submit(s.draft, 'voice', 'sample', 'en-CA', { instant: true });
      return T.app.runSample('sarah');
    }).then(function () { return latest('showing', 'sarah'); });
  }
  function ensureSarahDone() {
    return ensureSarahCard().then(function (c) {
      if (c.status === 'ready') return T.approve(c.id).then(function () { return c; });
      return waitFor(function () { return c.status !== 'running'; }).then(function () { return c; });
    });
  }
  function ensureRecoveryCard() {
    var c = latest('recovery');
    if (c) return Promise.resolve(c);
    return go('#/').then(function () { return T.app.runSample('recovery'); }).then(function () { return latest('recovery'); });
  }
  function ensureRecoveryDone() {
    return ensureRecoveryCard().then(function (c) {
      if (!c) return null;
      if (c.status === 'ready') return T.approve(c.id).then(function () { return c; });
      return waitFor(function () { return c.status !== 'running'; }, 12000).then(function () { return c; });
    });
  }
  function openDetails(selector) { var d = document.querySelector(selector); if (d && !d.open) d.open = true; }
  // Cards show a summary first; steps about the fields open the card's Details
  function opened(c) { if (c) openDetails(sel(c, '.card-more')); return c; }
  function sarahOpen() { return ensureSarahCard().then(opened); }
  function recoveryOpen() { return go('#/').then(ensureRecoveryCard).then(opened); }
  function receiptSel(card) {
    if (!card || !card.receiptId) return null;
    var s = S(), m = s.thread.filter(function (x) { return x.kind === 'receipt' && x.receiptId === card.receiptId; })[0];
    return m ? '#msgs [data-id="' + m.id + '"] .receipt' : null;
  }

  var STEPS = [
    { title: 'One conversation is the front door', text: 'Tap to talk, type, or pick a suggestion. Tayoo answers in one thread and adds structure only when the work needs it. Next: Sarah’s 2:00 showing.',
      enter: function () { return go('#/'); }, target: function () { return document.querySelector('#talk-orb') ? '#talk-orb' : '#composer'; } },
    { title: 'Speak after the showing', text: 'Tap the orb and talk: your words appear live, and Tayoo sends them when you pause. Hold it for push-to-talk. Here a labelled scripted sample plays instead of the microphone.',
      enter: function () {
        if (latest('showing', 'sarah')) return go('#/');
        return go('#/').then(function () { T.capture.show({ sample: 'sarah', origin: $('talk-orb') || document.querySelector('.mic') }); T.capture.autoStop = false; });
      },
      target: function () { return T.capture.open ? '#cap-text' : '#composer'; },
      leave: function () { if (T.capture.open) T.capture.stop(); } },
    { title: 'You stay in control', text: 'A sample lands as an editable draft. Live speech is sent after a pause, and Edit in the toast takes it back. Either way, nothing runs until you approve.',
      enter: function () {
        var s = S();
        if (!latest('showing', 'sarah') && !(s.draft && /1280 Avenue du Parc/.test(s.draft))) T.app.setDraft(T.SAMPLES[0].text, 'voice', 'sample', 'en-CA');
        return go('#/');
      }, target: function () { return '#composer'; } },
    { title: 'Named records, never “your CRM”', text: '“Sarah” matched Sarah Mitchell through today’s 2:00 showing. Sarah Côté, a seller, was ruled out and the card says why.',
      enter: ensureSarahCard, target: function () { return sel(latest('showing', 'sarah'), '.records'); } },
    { title: 'How Tayoo read your words', text: 'Every phrase it used is marked: client, property, budget, fees, the feature, the promise and its date. Deterministic rules, no AI service; unmarked words were not used.',
      enter: function () { return sarahOpen().then(function (c) { openDetails(sel(c, '.parse')); }); }, target: function () { return sel(latest('showing', 'sarah'), '.parse'); } },
    { title: 'Memory Diff', text: 'Old value, new value and where it came from, field by field. Untick anything misheard or correct the amount; the old budget stays in history after approval.',
      enter: sarahOpen, target: function () { return sel(latest('showing', 'sarah'), '.sec:nth-of-type(1)'); } },
    { title: 'The promise becomes a task', text: '“Tomorrow morning” resolves to Saturday 9:00 AM. Two candidate listings come from an authorized export; one with an unknown garage is excluded rather than assumed.',
      enter: sarahOpen, target: function () { return sel(latest('showing', 'sarah'), '.sec:nth-of-type(2)'); } },
    { title: 'A draft in Sarah’s language', text: 'Consent is shown with its source and rechecked at send time. Tone changes regenerate the draft; your own edits are kept.',
      enter: sarahOpen, target: function () { return sel(latest('showing', 'sarah'), '.sec:nth-of-type(3)'); } },
    { title: 'Approval binds one exact version', text: 'The fingerprint covers the recipients, changes and wording. Edit anything and it becomes a new version. Next approves plan v' + '1.',
      enter: ensureSarahCard, target: function () { return sel(latest('showing', 'sarah'), '.bind'); } },
    { title: 'A receipt that doesn’t overclaim', text: 'Local changes are completed. The email is marked simulated, not sent, and never shown in green. Local changes can be undone.',
      enter: function () { return go('#/').then(ensureSarahDone).then(function () { return waitFor(function () { return receiptSel(latest('showing', 'sarah')); }); }); },
      target: function () { return receiptSel(latest('showing', 'sarah')); } },
    { title: 'The change ripples through the CRM', text: 'Sarah’s record now shows the reviewed values with their provenance, the earlier budget under Changes, and Saturday’s task under Next actions.',
      enter: function () { return ensureSarahDone().then(function () { return go('#/clients/sarah'); }); }, target: function () { return '.mem'; } },
    { title: 'Recover the follow-ups you owe', text: '14 contacts matched: 10 eligible, 2 need a consent review, 2 opted out and are excluded. Everyone is named with a reason, not a score.',
      enter: recoveryOpen, target: function () { return sel(latest('recovery'), '.scope'); } },
    { title: 'Evidence for every rank', text: 'Promises you made come first, with the source and date. Exclude anyone handled elsewhere, or open a draft and edit it.',
      enter: recoveryOpen, target: function () { return sel(latest('recovery'), '.row-eligible'); } },
    { title: 'Consent rechecked at send time', text: 'Kevin opted out after approval, so he was skipped before his email went out. The other drafts were simulated; nothing was sent.',
      enter: function () { return go('#/').then(ensureRecoveryDone).then(function () { return waitFor(function () { return receiptSel(latest('recovery')); }, 12000); }); },
      target: function () { return receiptSel(latest('recovery')); } },
    { title: 'Revenue Recovery Ledger', text: 'Coverage moved because nine contacts now have a next action. Replies and meetings count only when observed or confirmed, once per contact.',
      enter: function () { return go('#/ledger'); }, target: function () { return '.ledger'; } },
    { title: 'Now use your own words', text: 'Dictate or type a recap for any client, “move Camille’s presentation to Monday at 10”, “find condos in Saint-Roch under 480k”, or “what could Antoine’s house sell for?”. Shadow Mode, in the Demo menu, shows what Tayoo would do without changing anything.',
      enter: function () { return go('#/'); }, target: function () { return '#composer'; } },
    { title: 'Test it your way', text: 'The Demo menu holds scripted samples, Shadow Mode, this tour, Reset and the Test lab: presets, the demo clock, injected replies, opt-outs, cancellations and lender changes, roles, and JSON export.',
      enter: function () { return go('#/'); }, target: function () { return '.demo-btn'; } }
  ];

  var tour = (T.tour = { steps: STEPS, active: false, i: 0, busy: false });
  function panel() { return $('tour'); }
  tour.boot = function () {
    var st = S().tour;
    if (st && st.active) tour.start(st.step || 0);
  };
  tour.start = function (i) {
    if (S().role !== 'broker') { S().role = 'broker'; T.log('Signed in as ' + T.BROKER.name + ' for the tour', 'lab'); T.store.commit(); }
    tour.active = true;
    S().tour.active = true; S().tour.seen = true; T.store.save();
    panel().hidden = false;
    document.body.classList.add('touring');
    tour.show(typeof i === 'number' ? i : 0);
  };
  tour.stop = function (silent) {
    tour.active = false;
    var st = S().tour; st.active = false; T.store.save();
    panel().hidden = true;
    $('spot').hidden = true;
    document.body.classList.remove('touring');
    if (T.capture.open && !silent) T.capture.stop();
  };
  tour.show = function (i) {
    if (i < 0 || i >= STEPS.length) return;
    var prev = STEPS[tour.i];
    if (prev && prev.leave && i !== tour.i) prev.leave();
    tour.i = i; S().tour.step = i; T.store.save();
    var step = STEPS[i], p = panel();
    tour.busy = true;
    p.querySelector('.tour-n').textContent = (i + 1) + ' of ' + STEPS.length;
    p.querySelector('.tour-h').textContent = step.title;
    p.querySelector('.tour-t').textContent = step.text;
    p.querySelector('[data-tour="back"]').disabled = i === 0;
    var next = p.querySelector('[data-tour="next"]');
    next.textContent = i === STEPS.length - 1 ? 'Finish' : 'Next';
    next.disabled = true;
    p.querySelector('.tour-bar span').style.width = ((i + 1) / STEPS.length * 100) + '%';
    $('spot').hidden = true;
    Promise.resolve(step.enter ? step.enter() : null).then(function () { return T.wait(120); }).then(function () {
      if (tour.i !== i) return;
      tour.busy = false; next.disabled = false;
      tour.reposition(true);
      try { next.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }, function () { tour.busy = false; next.disabled = false; });
  };
  tour.next = function () {
    if (tour.busy) return;
    if (tour.i >= STEPS.length - 1) { tour.stop(); T.app.toast('Tour finished. Everything you saw is saved; Reset restores the demo.'); return; }
    tour.show(tour.i + 1);
  };
  tour.back = function () { if (!tour.busy && tour.i > 0) tour.show(tour.i - 1); };
  tour.reposition = function (scroll) {
    if (!tour.active) return;
    var step = STEPS[tour.i], q = step && step.target && step.target(), el = null;
    try { el = q ? document.querySelector(q) : null; } catch (e) { el = null; }
    var spot = $('spot'), p = panel();
    if (!el || !el.getClientRects().length) { spot.hidden = true; place(p, null); return; }
    if (scroll) { try { el.scrollIntoView({ block: el.offsetHeight > frame().h * 0.6 ? 'start' : 'center', behavior: 'auto' }); } catch (e) { /* ignore */ } }
    // The spotlight and the panel live inside the phone frame (#device is their containing block),
    // so coordinates are relative to its padding box, and clipped to it.
    var box = frame(), r = el.getBoundingClientRect(), pad = 6;
    var x = r.left - box.x, y = r.top - box.y;
    var l = Math.max(4, x - pad), t = Math.max(4, y - pad), rr = Math.min(box.w - 4, x + r.width + pad), bb = Math.min(box.h - 4, y + r.height + pad);
    spot.hidden = false;
    spot.style.left = l + 'px';
    spot.style.top = t + 'px';
    spot.style.width = Math.max(0, rr - l) + 'px';
    spot.style.height = Math.max(0, bb - t) + 'px';
    place(p, { top: y, height: r.height }, box);
  };
  function frame() {
    var d = $('device');
    if (!d) return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
    var b = d.getBoundingClientRect();
    return { x: b.left + d.clientLeft, y: b.top + d.clientTop, w: d.clientWidth, h: d.clientHeight };
  }
  tour.frame = frame;
  function place(p, r, box) {
    p.classList.toggle('at-top', false);
    p.classList.toggle('at-left', false);
    if (!r) return;
    if (r.top + r.height / 2 > (box ? box.h : window.innerHeight) * 0.55) p.classList.add('at-top');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tour]');
    if (!b || b.disabled) return;
    var k = b.getAttribute('data-tour');
    if (k === 'next') tour.next(); else if (k === 'back') tour.back(); else if (k === 'exit') tour.stop();
  });
  document.addEventListener('keydown', function (e) {
    if (!tour.active || T.capture.open) return;
    if (e.key === 'Escape') { tour.stop(); }
    if (e.altKey && e.key === 'ArrowRight') tour.next();
    if (e.altKey && e.key === 'ArrowLeft') tour.back();
  });
  var raf = 0;
  function onMove() { if (!tour.active) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { tour.reposition(false); }); }
  window.addEventListener('resize', onMove);
  document.addEventListener('scroll', onMove, true);
})();
