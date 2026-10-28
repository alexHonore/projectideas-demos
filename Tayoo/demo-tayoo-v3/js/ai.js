/* Tayoo V3 — optional live AI (bring your own key), on top of vendor/live-ai.js.
   Live AI only proposes: it returns the same parse object as the rule engine (js/parser.js), which then goes
   through the identical builders, Action Card, approval and receipt. Every result is validated against the
   CRM before use; on any error the rules take over and the conversation says so. */
(function () {
  'use strict';
  var T = (window.Tayoo = window.Tayoo || {});
  var S = function () { return T.store.state; };
  var AI = (T.ai = {});

  // on / off / paused, with the reason. Keys, budgets and killswitches are set on the hub's API monitor.
  AI.status = function () {
    var L = window.LiveAI, s = S(), M = window.ApiMeter;
    if (!L || !L.available()) return { on: false, state: 'off', why: 'Live AI adapter not loaded' };
    if (!s.caps.ai) return { on: false, state: 'off', why: 'Live AI is off in the Test lab' };
    if (s.caps.offline) return { on: false, state: 'off', why: 'Offline: live AI needs the network' };
    if (!s.settings.useAI) return { on: false, state: 'off', why: 'Live AI is off in Settings' };
    if (M) { var g = M.check('tayoo', 'anthropic'); if (!g.ok) return { on: false, state: /^No /.test(g.reason) ? 'off' : 'paused', why: g.reason + ' (API monitor)' }; }
    else if (!L.isOn()) return { on: false, state: 'off', why: 'No API key' };
    return { on: true, state: 'on', why: 'Live AI (' + L.model + ') reads free text; you still approve every plan' };
  };
  AI.on = function () { return AI.status().on; };

  var STR = { type: 'string' };
  function pair() { return { type: 'array', items: { type: 'object', additionalProperties: false, required: ['text', 'quote'], properties: { text: STR, quote: STR } } }; }
  var STRENGTH = { type: 'string', enum: ['required', 'preferred', 'none', 'unknown'] };
  AI.SCHEMA = {
    type: 'object', additionalProperties: false,
    required: ['intent', 'client_id', 'candidate_ids', 'client_reason', 'listing_ids', 'budget', 'condo_fees', 'garage', 'parking', 'liked', 'concerns', 'promise_title', 'when_date', 'when_time', 'when_phrase', 'question', 'evidence'],
    properties: {
      intent: { type: 'string', enum: ['showing', 'call', 'note', 'recovery', 'file', 'schedule', 'reschedule', 'cancel', 'task', 'listings', 'search', 'cma', 'brief', 'clarify'] },
      client_id: { type: 'string', description: 'Exact id from the client list, or an empty string when unsure.' },
      candidate_ids: { type: 'array', items: STR, description: 'Ids of every client the name could mean when it is ambiguous.' },
      client_reason: STR,
      listing_ids: { type: 'array', items: STR },
      budget: { type: 'number', description: 'Maximum budget in CAD if stated, else 0.' },
      condo_fees: { type: 'number', description: 'Maximum monthly condo fees in CAD if stated, else 0.' },
      garage: STRENGTH, parking: STRENGTH,
      liked: pair(), concerns: pair(),
      promise_title: { type: 'string', description: 'The commitment the broker made, as a short task title naming the client, or empty.' },
      when_date: { type: 'string', description: 'YYYY-MM-DD, resolved against today, or empty.' },
      when_time: { type: 'string', description: 'HH:MM 24-hour, or empty.' },
      when_phrase: { type: 'string', description: 'The exact words that gave the date, or empty.' },
      question: { type: 'string', description: 'One clarifying question when the request can’t be planned safely, else empty.' },
      evidence: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['type', 'phrase'], properties: { type: { type: 'string', enum: ['client', 'place', 'when', 'budget', 'fees', 'feature', 'positive', 'objection', 'promise', 'other'] }, phrase: STR } } }
    }
  };

  AI.system = function () {
    var s = S(), today = T.today();
    var clients = s.clients.map(function (c) { return c.id + ' | ' + T.fullName(c) + ' | ' + c.role + ' | ' + c.area + ' | ' + c.lang + ' | ' + c.stage; }).join('\n');
    var listings = T.listings().map(function (l) { return l.id + ' | ' + l.address + ' | ' + l.area + ' | ' + l.type + (l.price ? ' | ' + l.price : ''); }).join('\n');
    var appts = T.cal.active().filter(function (a) { return a.date >= T.addDays(today, -3) && a.date <= T.addDays(today, 14); }).map(function (a) { return a.date + ' ' + a.start + '-' + a.end + ' | ' + a.title + ' | client ' + (a.client || '-') + ' | ' + (a.place || '') + (a.listing ? ' | listing ' + a.listing : ''); }).join('\n');
    var files = s.transactions.map(function (t) { return t.id + ' | ' + t.title + ' | client ' + t.client + ' | ' + t.property; }).join('\n');
    return [
      'You read requests for Tayoo, an assistant for a residential real estate broker in Québec City (Alex Lavoie, Courtage Boréal). Everything below is fictional demo data.',
      'Now: ' + T.fmtDT(s.now, { long: true }) + ' (' + s.now + '), ' + T.tzLabel(today) + '. Resolve relative dates against this.',
      'Return only the JSON object. Rules: use ids exactly as listed; if a name could mean several clients, leave client_id empty and list them in candidate_ids; never invent amounts, dates, listings or facts that are not in the text; garage/parking "required" only when the text says it is needed or essential; quote exact phrases from the input in evidence, liked.quote and concerns.quote; intent "call" is a recap of a phone call, "showing" a recap of a visit, "note" a preference or fact to remember, "task" a reminder, "schedule" booking a new appointment; ask one question in "question" with intent "clarify" when unsure.',
      'Clients (id | name | role | area | language | stage):\n' + clients,
      'Listings and CMA subjects (id | address | area | type | price):\n' + listings,
      'Appointments, last 3 days to next 14 (date time | title | client | place):\n' + appts,
      'Transactions (id | title | client | property):\n' + files
    ].join('\n\n');
  };

  function locate(text, phrase, from) {
    var f = T.foldKeep(text), q = T.foldKeep(String(phrase || '').trim());
    if (q.length < 2) return -1;
    return f.indexOf(q, from || 0);
  }
  // Validate the model's answer against the CRM and turn it into the rule engine's parse shape.
  AI.toParse = function (d, text, prov) {
    var s = S(), clean = String(text).replace(/\s+/g, ' ').trim().normalize('NFC');
    var intents = AI.SCHEMA.properties.intent.enum;
    var intent = intents.indexOf(d.intent) > -1 ? d.intent : 'clarify';
    var known = function (id) { var c = T.client(id); return c && !c.deleted ? c : null; };
    var cand = (Array.isArray(d.candidate_ids) ? d.candidate_ids : []).filter(function (id, i, a) { return known(id) && a.indexOf(id) === i; });
    var clientId = known(d.client_id) ? d.client_id : null, ambiguous = null;
    if (!clientId && cand.length === 1) clientId = cand[0];
    if (!clientId && cand.length > 1) ambiguous = cand;
    var listingIds = (Array.isArray(d.listing_ids) ? d.listing_ids : []).filter(function (id, i, a) { return T.listing(id) && !/^SOLD-/.test(id) && a.indexOf(id) === i; });
    var money = function (v, lo, hi) { return typeof v === 'number' && v >= lo && v <= hi ? Math.round(v) : null; };
    var features = {};
    ['garage', 'parking'].forEach(function (k) { if (['required', 'preferred', 'none'].indexOf(d[k]) > -1) features[k] = d[k]; });
    function pairs(list) { return (Array.isArray(list) ? list : []).filter(function (x) { return x && String(x.text || '').trim(); }).slice(0, 4).map(function (x) { var q = locate(clean, x.quote) > -1 ? x.quote : x.text; return { text: String(x.text).trim(), quote: String(q).trim() }; }); }
    var when = null;
    if (T.validDate(d.when_date)) when = { date: d.when_date, time: T.validTime(d.when_time) ? d.when_time : S().settings.morning, text: d.when_phrase || T.fmtDate(d.when_date), phrase: T.foldKeep(d.when_phrase || ''), note: T.validTime(d.when_time) ? 'read by live AI' : 'no time given, so your default morning time', timeText: '' };
    var spans = [], taken = [];
    (Array.isArray(d.evidence) ? d.evidence : []).forEach(function (e) {
      var i = locate(clean, e.phrase);
      if (i < 0) return;
      var j = i + String(e.phrase).trim().length;
      if (taken.some(function (r) { return i < r[1] && j > r[0]; })) return;
      taken.push([i, j]);
      var type = { fees: 'fees', budget: 'budget', when: 'when', client: 'client', place: 'place', feature: 'feature', positive: 'positive', objection: 'objection', promise: 'promise' }[e.type] || 'other';
      var label = type === 'client' && clientId ? T.fullName(T.client(clientId)) : type === 'when' && when ? T.fmtDT(when.date + 'T' + when.time) : type === 'place' && listingIds[0] ? T.listing(listingIds[0]).address : '';
      spans.push({ start: i, end: j, type: type, label: label });
    });
    spans.sort(function (a, b) { return a.start - b.start; });
    var title = String(d.promise_title || '').trim().slice(0, 120);
    // Filters for search/recovery/file come from the rules (the schema doesn't carry them), so results stay comparable.
    var rp = T.parse(clean);
    var mapped = intent === 'call' ? 'showing' : intent;
    var p = {
      text: clean, lang: rp.lang, intent: mapped, spans: spans,
      clientId: ambiguous ? null : clientId, clientWhy: clientId ? 'Live AI: ' + (String(d.client_reason || '').trim() || 'matched from the client list') : '', ambiguous: ambiguous,
      mention: ambiguous ? (rp.mention || T.client(ambiguous[0]).first) : (clientId ? T.client(clientId).first : null),
      listingId: listingIds[0] || null, listingIds: listingIds, listingWhy: listingIds[0] ? 'Named in your note (read by live AI).' : '',
      budget: money(d.budget, 1000, 50000000), fees: money(d.condo_fees, 1, 10000), price: null, features: features,
      positive: pairs(d.liked), objections: pairs(d.concerns),
      promise: title ? { clause: title, aiTitle: title, trigger: '' } : null, when: when,
      isCall: intent === 'call', places: rp.places, areas: rp.areas, types: rp.types, beds: rp.beds, days: rp.days,
      budgetMin: rp.budgetMin, budgetMax: rp.budgetMax, roleFilter: rp.roleFilter, stageFilter: rp.stageFilter,
      txId: intent === 'file' ? (rp.txId || (clientId && T.files.forClient(clientId)[0] ? T.files.forClient(clientId)[0].id : null)) : rp.txId,
      question: String(d.question || '').trim(),
      source: { kind: 'ai', model: prov.model, ms: prov.ms, inputTokens: prov.inputTokens, outputTokens: prov.outputTokens, fellBack: prov.fellBack }
    };
    if (p.intent === 'showing' && !p.listingId && clientId) {
      var recent = s.appointments.filter(function (a) { return a.client === clientId && a.listing && a.status !== 'cancelled' && (a.date + 'T' + a.start) <= T.nowISO() && T.daysBetween(a.date, T.today()) <= 3; }).pop();
      if (recent && !p.isCall) { p.listingId = recent.listing; p.listingWhy = 'Not said. Taken from the ' + T.fmtDate(recent.date) + ' showing in your calendar.'; }
    }
    return p;
  };

  AI.read = function (text) {
    return window.LiveAI.json({ system: AI.system(), prompt: 'Request from the broker:\n"""' + text + '"""', schema: AI.SCHEMA, effort: 'low', maxTokens: 4000 })
      .then(function (r) { return AI.toParse(r.data, text, r.provenance); });
  };

  // Drafting in the client's language, from approved facts only
  AI.draft = function (facts) {
    var st = S().style, fr = facts.lang === 'FR';
    var system = 'You write short emails for Alex Lavoie, a residential real estate broker in Québec City (fictional demo). Write in ' + (fr ? 'Québec French' : 'Canadian English') + '. Use only the facts given; never add property facts, prices, dates or promises that are not listed. No emoji. Under 120 words. Start with "' + (fr ? 'Bonjour ' : 'Hi ') + facts.first + ',". End with this sign-off exactly:\n' + (fr ? st.signFR : st.signEN) + '\nReturn only the email body.';
    return window.LiveAI.text({ system: system, messages: [{ role: 'user', content: 'Tone: ' + (facts.tone || 'warm') + '.\nFacts:\n' + facts.lines.map(function (l) { return '- ' + l; }).join('\n') }], effort: 'low', maxTokens: 1200 })
      .then(function (r) {
        var t = String(r.text || '').trim().replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
        if (t.length < 20 || t.length > 3000) throw Object.assign(new Error('The draft came back empty or too long, so nothing was changed.'), { name: 'LiveAIError', code: 'format' });
        return { text: t, provenance: r.provenance };
      });
  };
  AI.factsFor = function (card, rowIndex) {
    var c, lines = [], tone;
    if (card.type === 'recovery') {
      var r = card.rows[rowIndex]; c = T.client(r.clientId); tone = card.tone;
      lines.push('Why you are writing: ' + r.signal.reason);
      (r.signal.evidence || []).forEach(function (e) { lines.push('Evidence (' + e.source + ', ' + e.date + '): ' + e.quote); });
      var it = T.memField(c, 'intent'); if (it && it.value) lines.push('What they are looking for: ' + it.value);
      lines.push('Goal: reconnect and ask one simple question. Do not promise listings.');
    } else {
      c = T.client(card.clientId); tone = card.email.tone;
      if (card.listingId) lines.push('Visited today: ' + T.listing(card.listingId).address);
      (card.diff || []).forEach(function (d) { if (d.include) lines.push(d.label + ': ' + (d.kind === 'money' ? T.money(d.to) : d.kind === 'fees' ? 'under ' + T.money(d.to) + ' a month' : d.kind === 'strength' ? T.strengthLabel(d.to) : d.add)); });
      if (card.task && card.task.include) lines.push('Commitment: ' + card.task.title + ', due ' + T.fmtDT(card.task.due, { long: true }));
      if (card.type === 'listings') card.rows.forEach(function (r2) { if (r2.include) { var L = T.listing(r2.id); lines.push('Listing ' + L.id + ': ' + L.address + ', ' + L.area + ', ' + L.type + ', ' + T.money(L.price) + ', ' + L.beds + ' bedrooms' + (L.fees ? ', fees ' + T.money(L.fees) + '/month' : '') + ', garage ' + L.garage); } });
      if (card.type === 'cancel') { var a = S().appointments.filter(function (x) { return x.id === card.target; })[0]; if (a) lines.push('Cancelling: ' + a.title + ' on ' + T.fmtDT(a.date + 'T' + a.start, { long: true }) + '. Offer to find another time.'); }
    }
    return { first: c.first, lang: c.lang, tone: tone, lines: lines };
  };
  AI.badge = function (prov) {
    if (!prov || prov.kind !== 'ai') return prov && prov.fallback ? 'Rules · live AI fell back' : 'Rules';
    return 'Live AI · ' + prov.model + ' · ' + (prov.ms / 1000).toFixed(1) + ' s' + (prov.fellBack ? ' · fallback model' : '');
  };
})();
