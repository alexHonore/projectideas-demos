/* Tayoo V3 — Test lab scenario presets. Each preset starts from the seed and replays real requests through the
   same parser, builders, approval and clock rules a tester would use; nothing is hand-written into the state. */
(function () {
  'use strict';
  var T = window.Tayoo;
  var S = function () { return T.store.state; };
  var L = T.lab;

  L.PRESETS = [
    { id: 'fresh', label: 'Friday afternoon, untouched', desc: 'The seed: Fri Oct 23, 2:47 PM. Two showings to recap, overdue promises, two files with date problems.' },
    { id: 'recapped', label: 'After both showing recaps', desc: 'Sarah’s and Louis’s recaps approved: memory updated, tasks set, follow-ups in the outbox.' },
    { id: 'monday', label: 'Monday morning, replies in', desc: 'Recovery batch approved Friday (Kevin opted out mid-send). Mon Oct 26, 9:00 AM: Samuel and Raj replied, tasks went overdue.' },
    { id: 'financing', label: 'Financing crunch, Tremblay sale', desc: 'Tue Oct 27, 9:00 AM. The lender now expects approval Nov 3, after both candidate deadlines; the deed isn’t in the calendar.' },
    { id: 'coordinator', label: 'Coordinator’s desk', desc: 'Signed in as Maude. She prepared listings for Léa and a showing for Olivia; both wait for Alex. Her own task went through.' },
    { id: 'later', label: 'Ten days later, nothing done', desc: 'Mon Nov 2, 9:00 AM with no action since Friday: overdue tasks, Yannick’s implied consent expired, the Tremblay financing deadline passed.' },
    { id: 'blank', label: 'Blank workspace', desc: 'No clients, files or appointments; listings and sold data stay. Build your own case from scratch.' }
  ];

  function sample(id) { return T.SAMPLES.filter(function (x) { return x.id === id; })[0].text; }
  // Plans a request exactly like the composer does (rules only, so presets stay deterministic)
  L.plan = function (text, input) {
    var s = S(), p = T.parse(text);
    T.tick(1);
    T.addMessage({ role: 'broker', kind: input === 'voice' ? 'voice' : 'text', text: p.text, source: input === 'voice' ? 'sample' : null, lang: p.lang, by: T.actor() });
    var out = T.app.buildFor(p, input || 'text');
    if (out.card) {
      out.card.pending = { text: p.text, input: input || 'text', source: input === 'voice' ? 'sample' : null };
      s.cards[out.card.id] = out.card;
      T.addMessage({ role: 'tayoo', kind: 'text', text: out.reply });
      T.addMessage({ role: 'tayoo', kind: 'card', cardId: out.card.id });
      T.log('Plan drafted: ' + out.card.title, 'draft');
    } else T.addMessage({ role: 'tayoo', kind: 'text', text: (out.help && out.help.text) || out.reply || '' });
    return out.card || null;
  };

  L.preset = function (id) {
    T.store.state = T.seed();
    var s = S();
    s.tour.seen = true;
    if (id === 'recapped') {
      T.approveNow(L.plan(sample('sarah'), 'voice').id);
      T.tick(3);
      T.approveNow(L.plan(sample('louis'), 'voice').id);
    } else if (id === 'monday') {
      T.approveNow(L.plan(sample('recovery'), 'voice').id);
      T.advanceTo('2026-10-26T09:00');
      L.reply('samuel', 'Merci Alex, oui je cherche encore. On peut se parler mardi ?');
      T.tick(12);
      L.reply('raj', 'Thanks for checking in. Still looking, can we see something this week?');
    } else if (id === 'financing') {
      T.advanceTo('2026-10-27T09:00');
      L.lenderChange('tx-tremblay', '2026-11-03');
    } else if (id === 'coordinator') {
      s.role = 'coordinator';
      var c1 = L.plan('Send Léa the listings that fit her criteria', 'text');
      if (c1) T.approve(c1.id);
      var c2 = L.plan(sample('olivia'), 'text');
      if (c2) T.approve(c2.id);
      var c3 = L.plan('Remind me to print the open-house sign-in sheets for Hugo tomorrow at 8', 'text');
      if (c3) T.approveNow(c3.id);
    } else if (id === 'later') {
      T.advanceTo('2026-11-02T09:00');
    } else if (id === 'blank') {
      s.clients = []; s.appointments = []; s.tasks = []; s.transactions = []; s.outreach = []; s.pendingEvents = [];
      T.log('Blank workspace: clients, calendar, tasks and files cleared (listings and sold data kept)', 'lab');
    }
    var p = L.PRESETS.filter(function (x) { return x.id === id; })[0];
    T.log('Preset loaded: ' + (p ? p.label : id), 'lab');
    return s;
  };
})();
