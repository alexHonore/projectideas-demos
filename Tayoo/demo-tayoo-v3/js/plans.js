/* Tayoo V3 — Action Card builders, drafts, edits and the (simulated) execution engine.
   Local demo records really change; anything external (email, invitations) is simulated and labelled so. */
(function () {
  'use strict';
  var T = (window.Tayoo = window.Tayoo || {});
  var S = function () { return T.store.state; };

  /* ======================= drafts ======================= */
  var D = (T.drafts = {});
  D.footer = function (lang) {
    var b = T.BROKER;
    return lang === 'FR'
      ? b.name + ', ' + b.titleFr.toLowerCase() + ', ' + b.agency + ' · ' + b.phone + '\nPour ne plus recevoir de messages commerciaux, répondez « désabonner ».'
      : b.name + ', ' + b.title.toLowerCase() + ', ' + b.agency + ' · ' + b.phone + '\nTo stop receiving commercial messages, reply “unsubscribe”.';
  };
  function sign(lang, tone) {
    var st = S().style;
    if (tone === 'formal') return lang === 'FR' ? 'Cordialement,\n' + T.BROKER.name : 'Best regards,\n' + T.BROKER.name;
    return lang === 'FR' ? st.signFR : st.signEN;
  }
  function relWhen(due, lang) {
    if (!due) return '';
    var d = due.split('T')[0], t = due.split('T')[1] || '09:00', h = +t.split(':')[0];
    var part = h < 12 ? (lang === 'FR' ? ' matin' : ' morning') : h < 17 ? (lang === 'FR' ? ' après-midi' : ' afternoon') : (lang === 'FR' ? ' soir' : ' evening');
    var diff = T.daysBetween(T.today(), d);
    if (lang === 'FR') {
      if (diff === 0) return "aujourd'hui";
      if (diff === 1) return 'demain' + part;
      return T.fmtDate(d, { fr: true }).split(' ')[0] + part;
    }
    if (diff === 0) return 'later today';
    if (diff === 1) return 'tomorrow' + part;
    if (diff < 7) return 'on ' + T.weekday(d) + part;
    return 'on ' + T.fmtDate(d, { long: true });
  }
  function joinList(arr, lang) {
    if (arr.length < 2) return arr.join('');
    var and = lang === 'FR' ? ' et ' : ', and ';
    if (arr.length === 2) return arr[0] + (lang === 'FR' ? ' et ' : ' and ') + arr[1];
    return arr.slice(0, -1).join(', ') + and + arr[arr.length - 1];
  }
  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  D.showing = function (card) {
    var c = T.client(card.clientId), L = card.listingId && T.listing(card.listingId), lang = card.email.lang, tone = card.email.tone;
    var ups = [], pos = null, neg = null;
    card.diff.forEach(function (d) {
      if (!d.include) return;
      if (d.key === 'budget') ups.push(lang === 'FR' ? 'budget maximal de ' + T.moneyFr(d.to) : 'up to ' + T.money(d.to));
      if (d.key === 'fees') ups.push(lang === 'FR' ? 'frais de condo sous ' + T.moneyFr(d.to) + ' par mois' : 'condo fees under ' + T.money(d.to) + ' a month');
      if ((d.key === 'garage' || d.key === 'parking') && d.to === 'required') ups.push(lang === 'FR' ? (d.key === 'garage' ? 'garage obligatoire' : 'stationnement obligatoire') : (d.key === 'garage' ? 'a garage as a must' : 'parking as a must'));
      if (d.key === 'likes' && !pos) pos = d.add;
      if (d.key === 'concerns' && !neg) neg = d.subject;
    });
    var first = c.first, lines = [];
    var hi = tone === 'formal' ? (lang === 'FR' ? 'Bonjour ' + first + ',' : 'Hello ' + first + ',') : (lang === 'FR' ? 'Bonjour ' + first + ',' : 'Hi ' + first + ',');
    var place = L ? L.address.split(',')[0] : null;
    if (lang === 'FR') {
      lines.push(tone === 'brief' ? "Merci pour aujourd'hui." : place ? 'Merci pour la visite du ' + place + " aujourd'hui." : "Merci pour votre temps aujourd'hui.");
      if (tone !== 'brief') {
        if (pos && neg) lines[0] += ' Je suis content que ' + lowerFirst(pos) + ' vous ait plu, et je comprends pour ' + lowerFirst(neg) + '.';
        else if (pos) lines[0] += ' Je suis content que ' + lowerFirst(pos) + ' vous ait plu.';
        else if (neg) lines[0] += ' Je comprends pour ' + lowerFirst(neg) + '.';
      }
      if (ups.length) lines.push("J'ai mis à jour votre recherche : " + joinList(ups, 'FR') + '.');
      if (card.task && card.task.include) {
        var obj = card.task.title.replace(/^(envoyer|préparer|preparer|partager|faire parvenir)\s+/i, '').replace(new RegExp('\\s+à\\s+' + first + '$'), '');
        var verbOk = /^(envoyer|préparer|preparer|partager|faire parvenir)/i.test(card.task.title);
        lines.push(verbOk ? 'Comme promis, je vous envoie ' + obj + ' ' + relWhen(card.task.due, 'FR') + '.' : 'Je vous reviens ' + relWhen(card.task.due, 'FR') + '.');
      }
    } else {
      if (tone === 'brief') lines.push('Thanks for today.');
      else if (tone === 'formal') lines.push(place ? 'Thank you for visiting ' + place + ' today.' : 'Thank you for your time today.');
      else lines.push(place ? 'Thanks for visiting ' + place + ' with me today.' : 'Thanks for your time today.');
      if (tone !== 'brief') {
        if (pos && neg) lines[0] += ' I’m glad ' + lowerFirst(pos) + ' stood out, and I hear you on ' + lowerFirst(neg) + '.';
        else if (pos) lines[0] += ' I’m glad ' + lowerFirst(pos) + ' stood out.';
        else if (neg) lines[0] += ' I hear you on ' + lowerFirst(neg) + '.';
      }
      if (ups.length) lines.push((tone === 'brief' ? 'Noted: ' : 'I’ve updated your search: ') + joinList(ups, 'EN') + '.');
      if (card.task && card.task.include) {
        var t = card.task.title, m = t.match(/^(send|share|email)\s+(.*)$/i);
        var what = m ? m[2].replace(new RegExp('^' + first + '\\s+'), 'you ') : null;
        lines.push(what ? 'I’ll send ' + what.replace(/^you\s+/, 'you ') + ' ' + relWhen(card.task.due, 'EN') + '.' : 'I’ll follow up ' + relWhen(card.task.due, 'EN') + '.');
      }
    }
    var body = lines.join('\n\n');
    return hi + '\n\n' + body + '\n\n' + sign(lang, tone);
  };
  D.showingSubject = function (card) {
    var L = card.listingId && T.listing(card.listingId);
    if (card.email.lang === 'FR') return L ? 'Suite à notre visite du ' + L.address.split(',')[0] : 'Suite à notre échange';
    return L ? 'Following up on ' + L.address.split(',')[0] : 'Following up on today';
  };
  function genericLine(c, sig) {
    var fr = c.lang === 'FR', intent = T.memField(c, 'intent'), it = intent && intent.value ? lowerFirst(intent.value) : null;
    var k = sig ? sig.kind : 'dormant';
    if (k === 'promise') {
      var t = sig.evidence && sig.evidence[0] ? lowerFirst(sig.evidence[0].quote) : '';
      return fr ? 'Je vous avais promis un suivi (' + t + ') et j’ai pris du retard, désolé. Est-ce toujours utile pour vous ?' : 'I promised to follow up (' + t + '), and I’m behind. I’m sorry. Is this still useful to you?';
    }
    if (k === 'unanswered') return fr ? 'Merci pour votre message du ' + T.fmtDate(sig.evidence[0].date, { fr: true }).split(' ').slice(1).join(' ') + ', et désolé du délai. Auriez-vous quelques minutes cette semaine pour en parler ?' : 'Thank you for your message on ' + T.fmtDate(sig.evidence[0].date, { noDay: true }) + ', and sorry for the delay. Would a quick call this week work?';
    return fr ? 'Il y a un moment qu’on ne s’est pas parlé. ' + (it ? 'Cherchez-vous toujours : ' + it + ' ?' : 'Votre projet est-il toujours d’actualité ?') + ' Je suis là quand ça vous convient.' : 'It’s been a while since we last spoke. ' + (it ? 'Are you still looking for ' + it.replace(/^looking for /, '') + '?' : 'Is your project still on?') + ' Happy to help whenever it suits you.';
  }
  D.recovery = function (c, tone, sig) {
    var lang = c.lang, line = (c.recovery && c.recovery.line && !c.recovery.handled && (c.recovery.line[lang] || c.recovery.line.EN)) || genericLine(c, sig || T.signalOf(c));
    if (tone === 'brief') {
      var sents = line.match(/[^.?!]+[.?!]/g) || [line];
      var q = sents.filter(function (x) { return /\?$/.test(x.trim()); }).pop();
      line = (q || sents[0]).trim();
    }
    var hi = tone === 'formal' ? (lang === 'FR' ? 'Bonjour ' + c.first + ',' : 'Hello ' + c.first + ',') : (lang === 'FR' ? 'Bonjour ' + c.first + ',' : 'Hi ' + c.first + ',');
    return hi + '\n\n' + line + '\n\n' + sign(lang, tone);
  };
  D.recoverySubject = function (c, sig) {
    var k = (sig && sig.kind) || (c.recovery && c.recovery.kind) || 'dormant', fr = c.lang === 'FR';
    if (k === 'promise') return fr ? 'Ce que je vous avais promis' : 'What I promised you';
    if (k === 'unanswered') return fr ? 'Re : votre question' : 'Re: your question';
    return fr ? 'Un petit suivi' : 'Checking in';
  };

  /* ======================= helpers ======================= */
  function newCard(type, p, input) {
    var s = S();
    s.counters.card++;
    return {
      id: 'c' + s.counters.card, type: type, status: 'ready', version: 1, rev: 1, createdAt: T.nowISO(),
      source: p ? { text: p.text, spans: p.spans, lang: p.lang, input: input || 'text', mention: p.mention, provenance: p.source || { kind: 'rules' } } : null,
      author: T.actor(),
      history: [{ v: 1, at: T.nowISO(), what: 'Drafted from your ' + (input === 'voice' ? 'voice note' : input === 'form' ? 'memory-change form' : 'message') }]
    };
  }
  function strengthLabel(v) { return v === 'required' ? 'Required' : v === 'preferred' ? 'Preferred' : v === 'none' ? 'Not needed' : 'Not discussed yet'; }
  T.strengthLabel = strengthLabel;
  function quotesIn(text) {
    var out = [], m, re = /["“]([^"”]{3,120})["”]/g;
    while ((m = re.exec(text))) out.push(m[1]);
    return out;
  }

  function buildDiff(c, p) {
    var diff = [];
    function field(key) { return T.memField(c, key); }
    if (p.budget != null) {
      var f = field('budget');
      diff.push({ key: 'budget', label: 'Budget (max)', kind: 'money', from: f ? f.value : null, fromDisplay: f ? f.display : 'Not on file', to: p.budget, include: true, prov: 'agent' });
    }
    if (p.fees != null) {
      var ff = field('fees');
      diff.push({ key: 'fees', label: 'Condo fees (max)', kind: 'fees', from: ff ? ff.value : null, fromDisplay: ff ? ff.display : 'Not discussed yet', to: p.fees, include: true, prov: 'agent' });
    }
    Object.keys(p.features).forEach(function (k) {
      var key = k;
      if (k === 'parking' && !field('parking') && field('garage')) key = 'garage';
      if (k === 'garage' && !field('garage') && field('parking')) key = 'parking';
      var fx = field(key);
      diff.push({ key: key, label: key === 'garage' ? 'Garage' : 'Parking', kind: 'strength', from: fx ? fx.value : null, fromDisplay: fx ? fx.display : 'Not discussed yet', to: p.features[k], include: true, prov: 'agent' });
    });
    p.positive.forEach(function (sg) {
      var fl = field('likes');
      diff.push({ key: 'likes', label: 'Liked', kind: 'add', from: fl ? fl.value : null, fromDisplay: fl ? fl.display : 'Nothing recorded', add: sg.text, quote: sg.quote, include: true, prov: 'agent', voice: 'observation' });
    });
    p.objections.forEach(function (ob) {
      var fc = field('concerns'), extra = '';
      var L = p.listingId && T.listing(p.listingId);
      if (L && /fee|frais/i.test(ob.text) && L.fees) extra = L.fees + '';
      diff.push({ key: 'concerns', label: 'Concerns', kind: 'add', from: fc ? fc.value : null, fromDisplay: fc ? fc.display : 'Nothing recorded', add: ob.quote.charAt(0).toUpperCase() + ob.quote.slice(1), subject: ob.text, include: true, prov: 'agent', voice: 'observation', listingFact: extra ? { label: 'Listing data: ' + T.money(+extra) + '/month', source: T.LISTINGS_SOURCE.label + ', ' + T.fmtDate(T.LISTINGS_SOURCE.imported, { noDay: true }) } : null });
    });
    (p.memSets || []).forEach(function (m) {
      var fm = field(m.key);
      if (fm && fm.value === m.value) return;
      var fb = !fm && m.fallback === 'area' && c.area ? c.area : null;
      if (fb === m.value) return;
      diff.push({ key: m.key, label: m.label, kind: 'set', from: fm ? fm.value : fb, fromDisplay: fm ? fm.display : fb ? fb + ' (home area on file)' : 'Not on file', to: m.value, include: true, prov: 'agent', caution: m.consentNote || '' });
    });
    (p.noQuotes ? [] : quotesIn(p.text)).forEach(function (q) {
      diff.push({ key: 'quotes', label: 'Client said', kind: 'add', from: null, fromDisplay: '', add: q, include: true, prov: 'agent', voice: 'quote' });
    });
    return diff;
  }

  function searchAlternatives(c, diff, shownId) {
    var areasF = T.memField(c, 'areas'), areas = areasF && areasF.value ? areasF.value.split(/,\s*/) : [c.area];
    var budget = null, fees = null, needGarage = false;
    var bF = T.memField(c, 'budget'); if (bF) budget = bF.value;
    var gF = T.memField(c, 'garage') || T.memField(c, 'parking'); if (gF && gF.value === 'required') needGarage = true;
    var fF = T.memField(c, 'fees'); if (fF && fF.value) fees = fF.value;
    diff.forEach(function (d) {
      if (!d.include) return;
      if (d.key === 'budget') budget = d.to;
      if (d.key === 'fees') fees = d.to;
      if ((d.key === 'garage' || d.key === 'parking') && d.to === 'required') needGarage = true;
      if (d.key === 'concerns' && d.listingFact && !fees) { var sh = T.listing(shownId); if (sh) fees = sh.fees - 1; }
    });
    var it = T.fold((T.memField(c, 'intent') || {}).value || ''), types = [];
    [['condo', 'Condo'], ['townhouse', 'Townhouse'], ['duplex', 'Duplex'], ['triplex', 'Triplex'], ['bungalow', 'Bungalow'], ['semi', 'Semi-detached'], ['detached', 'Detached'], ['family home', 'Detached']].forEach(function (x) { if (it.indexOf(x[0]) > -1) types.push(x[1]); });
    var tyF = T.memField(c, 'types'); if (tyF && tyF.value) types = String(tyF.value).split(/,\s*/);
    diff.forEach(function (d) { if (!d.include) return; if (d.key === 'types') types = String(d.to).split(/,\s*/); if (d.key === 'areas') areas = String(d.to).split(/,\s*/); });
    var pool = T.LISTINGS.filter(function (l) { return areas.indexOf(l.area) > -1 && (!types.length || types.indexOf(l.type) > -1); });
    var matches = [], excluded = [];
    pool.forEach(function (l) {
      var why = null;
      if (l.id === shownId) why = 'Shown today';
      else if (budget && l.price > budget) why = 'Over budget (' + T.money(l.price) + ')';
      else if (needGarage && l.garage === 'unknown') why = (c.memory.some(function (m) { return m.key === 'parking'; }) ? 'Parking' : 'Garage') + ' unknown in the data. A required feature can’t be assumed';
      else if (needGarage && l.garage === 'no') why = 'No ' + (c.memory.some(function (m) { return m.key === 'parking'; }) ? 'parking' : 'garage');
      else if (fees && l.fees > fees) why = 'Fees ' + T.money(l.fees) + '/month';
      if (why) excluded.push({ id: l.id, why: why }); else matches.push(l.id);
    });
    return { areas: areas, types: types, pool: pool.length, matches: matches.slice(0, 2), more: Math.max(0, matches.length - 2), excluded: excluded, criteria: { budget: budget, fees: fees, garage: needGarage } };
  }

  /* ======================= builders ======================= */
  var B = (T.build = {});

  B.showing = function (p, input) {
    var c = T.client(p.clientId), card = newCard('showing', p, input);
    var isCall = (p.isCall || /(phone|call|appel)/i.test(p.text)) && !p.listingId;
    card.clientId = c.id; card.listingId = p.listingId; card.isCall = isCall;
    card.clientWhy = p.clientWhy; card.listingWhy = p.listingWhy;
    card.title = isCall ? 'Follow through after the call with ' + T.shortName(c) : 'Follow through after ' + T.shortName(c) + '’s showing';
    card.diff = buildDiff(c, p);
    if (!card.diff.length && p.text) card.diff.push({ key: 'notes', label: 'Note', kind: 'add', from: null, fromDisplay: '', add: p.text, include: true, prov: 'agent', voice: 'observation' });
    if (p.promise) {
      var title = T.promiseTitle(p.promise, c, p.when, c.lang === 'FR' || p.lang === 'FR' ? 'FR' : 'EN');
      var due = p.when ? p.when.date + 'T' + p.when.time : T.addDays(T.today(), 1) + 'T' + S().settings.morning;
      var note = p.when ? '“' + p.when.text + '” → ' + T.fmtDT(due, { long: true }) + (p.when.note ? ' (' + p.when.note + ')' : '') : 'No date heard, so tomorrow at your default morning time. Change it if needed.';
      card.task = { include: true, title: title, due: due, owner: T.BROKER.name, note: note, source: (isCall ? 'Call recap' : 'Showing recap') + ', ' + T.fmtDate(T.today(), { noDay: true }) };
    } else card.task = null;
    var wantsAlts = /Buyer/.test(c.role) && (p.promise && /(alternative|option|listing|propri|duplex|condo|house|maison)/i.test(p.promise.clause || p.promise.aiTitle || '') || p.fees != null || p.objections.length);
    card.alts = wantsAlts ? searchAlternatives(c, card.diff, p.listingId) : null;
    if (card.alts) card.alts.attach = card.alts.matches.length > 0 && !!card.task;
    var lang = c.lang;
    card.email = {
      include: T.canEmail(c), locked: !T.canEmail(c),
      to: c.email, name: T.fullName(c), lang: lang, tone: 'warm', kind: 'service', bodyEdited: false, subject: '', body: ''
    };
    card.email.subject = D.showingSubject(card);
    card.email.body = D.showing(card);
    card.fingerprint = T.fingerprint(card);
    var bits = [];
    var nMem = card.diff.length;
    bits.push(nMem + ' memory change' + (nMem === 1 ? '' : 's'));
    if (card.task) bits.push('one task for ' + T.fmtDT(card.task.due).replace(/^\w+, /, ''));
    bits.push('a draft email' + (lang === 'FR' ? ' in French' : ''));
    var L = p.listingId && T.listing(p.listingId);
    var list = joinList(bits, 'EN');
    list = list.charAt(0).toUpperCase() + list.slice(1);
    var reply = 'I matched this to ' + T.fullName(c) + (L ? ' and the showing at ' + L.address.split(',')[0] : '') + '. ' + list + '. Nothing has been sent.';
    var say = 'I matched this to ' + T.fullName(c) + '. ' + list + '. Nothing has been sent.';
    return { card: card, reply: reply, say: say };
  };

  B.note = function (p, input) {
    var c = T.client(p.clientId), card = newCard('note', p, input);
    card.clientId = c.id; card.clientWhy = p.clientWhy;
    card.title = 'Update ' + T.shortName(c) + '’s memory';
    card.diff = buildDiff(c, p);
    if (!card.diff.length) {
      var txt = p.text.replace(/^(tayoo,?\s*)?(remember( that)?|note that|make a note( that)?|retiens( que)?|prends note( que)?)\s*/i, '');
      card.diff.push({ key: 'notes', label: 'Note', kind: 'add', from: null, fromDisplay: '', add: txt.charAt(0).toUpperCase() + txt.slice(1), include: true, prov: 'agent', voice: 'observation' });
    }
    card.task = null; card.email = null; card.alts = null;
    card.fingerprint = T.fingerprint(card);
    var n = card.diff.length;
    return { card: card, reply: 'Here is the change for ' + T.fullName(c) + '. ' + n + ' memory change' + (n === 1 ? '' : 's') + ', waiting for your approval.', say: n + ' memory change' + (n === 1 ? '' : 's') + ' for ' + c.first + ', waiting for your approval.' };
  };

  T.critDefault = function () { return { area: 'any', role: 'any', stage: 'any', lang: 'any', days: null, budgetMin: null, budgetMax: null, signal: 'any' }; };
  T.critText = function (cr) {
    var bits = [];
    bits.push(cr.role && cr.role !== 'any' ? cr.role.toLowerCase() + 's' : 'clients');
    if (cr.stage && cr.stage !== 'any') bits.push('at stage ' + cr.stage);
    if (cr.area && cr.area !== 'any') bits.push('in ' + cr.area);
    if (cr.lang && cr.lang !== 'any') bits.push('writing in ' + (cr.lang === 'FR' ? 'French' : 'English'));
    if (cr.budgetMin || cr.budgetMax) bits.push('budget ' + (cr.budgetMin ? T.money(cr.budgetMin) : '') + (cr.budgetMin && cr.budgetMax ? '–' : cr.budgetMax ? 'up to ' : '+') + (cr.budgetMax ? T.money(cr.budgetMax) : ''));
    if (cr.days) bits.push('no contact for ' + cr.days + '+ days');
    if (cr.signal && cr.signal !== 'any') bits.push({ promise: 'with a promise overdue', unanswered: 'with an unanswered message', dormant: 'gone quiet' }[cr.signal]);
    return bits.join(', ');
  };
  function isDefaultCrit(cr) { var d = T.critDefault(); return Object.keys(d).every(function (k) { return (cr[k] || null) === (d[k] || null) || (cr[k] === 'any' && d[k] === 'any'); }); }
  B.recovery = function (p, input, critIn) {
    var crit = critIn || Object.assign(T.critDefault(), {
      area: p && p.areas && p.areas[0] || 'any', role: p && p.roleFilter || 'any', stage: p && p.stageFilter || 'any',
      days: p && p.days || null, budgetMin: p && p.budgetMin || null, budgetMax: p && p.budgetMax || null
    });
    var cands = T.recoveryCandidates(crit);
    var s0 = S();
    var hasReview = function (c) { return s0.tasks.some(function (t) { return t.id === 't-consent-' + c.id && t.status === 'open'; }); };
    cands = cands.filter(function (c) { return !((T.consentOf(c) === 'unknown' || T.consentOf(c) === 'expired') && hasReview(c)); });
    var actionable = cands.filter(function (c) { return T.consentOf(c) !== 'opted-out'; });
    var scope = T.critText(crit);
    if (!actionable.length) {
      var cv0 = T.coverage();
      var reviews = s0.clients.filter(function (c) { return (T.consentOf(c) === 'unknown' || T.consentOf(c) === 'expired') && hasReview(c); }).map(T.fullName);
      var oo = cands.filter(function (c) { return T.consentOf(c) === 'opted-out'; }).length;
      return { card: null, reply: (isDefaultCrit(crit) ? 'Nothing you can act on right now.' : 'No ' + scope + ' need a follow-up right now.') + ' ' + cv0.covered + ' of ' + cv0.eligible + ' eligible contacts have a timely next action.' + (reviews.length ? ' Consent reviews are open for ' + joinList(reviews, 'EN') + '.' : '') + (oo ? ' ' + oo + ' opted-out contacts stay uncontacted.' : ''), say: 'Nothing you can act on right now.', chips: [{ label: 'Change the criteria', act: 'recovery-criteria' }] };
    }
    var card = newCard('recovery', p, input);
    card.criteria = crit;
    card.title = isDefaultCrit(crit) ? 'Recover overdue follow-ups' : 'Recover follow-ups: ' + scope;
    card.tone = 'warm';
    card.rows = cands.map(function (c) {
      var cs = T.consentOf(c), sig = T.signalOf(c, { days: crit.days });
      var bucket = cs === 'opted-out' ? 'optout' : (cs === 'unknown' || cs === 'expired') ? 'review' : 'eligible';
      var row = { clientId: c.id, bucket: bucket, include: bucket === 'eligible', reason: '', review: bucket === 'review' ? 'task' : null, signal: { kind: sig.kind, reason: sig.reason, evidence: sig.evidence || [] } };
      if (bucket === 'eligible') { row.subject = D.recoverySubject(c, sig); row.body = D.recovery(c, 'warm', sig); row.bodyEdited = false; }
      return row;
    });
    card.fingerprint = T.fingerprint(card);
    var n = card.rows.length, e = count(card, 'eligible'), r = count(card, 'review'), o = count(card, 'optout');
    var reply = n + ' contact' + (n === 1 ? '' : 's') + ' matched' + (isDefaultCrit(crit) ? '' : ' (' + scope + ')') + '. ' + e + ' ' + (e === 1 ? 'is' : 'are') + ' eligible for email. ' + r + ' need' + (r === 1 ? 's' : '') + ' a consent review. ' + o + ' opted out, so I excluded them. ' + (e ? 'Drafts are ready for your review. ' : '') + 'Nothing has been sent.';
    var say = numWord(n) + ' contacts matched. ' + numWord(e) + ' are eligible, ' + numWord(r) + ' need a consent review, and ' + numWord(o) + ' opted out, so I excluded them. Nothing has been sent.';
    return { card: card, reply: reply, say: say };
  };
  function count(card, bucket) { return card.rows.filter(function (r) { return r.bucket === bucket; }).length; }
  function numWord(n) { return ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen'][n] || String(n); }

  B.file = function (p, input) {
    var tx = p.txId && T.tx(p.txId);
    if (!tx) return { help: { text: 'Which file? I didn’t recognise a client or an address from one of your transactions.', chips: S().transactions.map(function (x) { return { label: x.title, text: 'Summarize the ' + x.title + ' file' }; }) } };
    var card = newCard('file', p, input);
    card.status = 'info'; card.clientId = tx.client; card.txId = tx.id;
    card.title = tx.title + ': what needs attention';
    card.fingerprint = T.fingerprint(card);
    var chk = T.files.check(tx), n = chk.issues.length;
    var reply = 'Here is the ' + tx.title + ' file (' + tx.stage.toLowerCase() + '). ' + chk.done.length + ' item' + (chk.done.length === 1 ? ' is' : 's are') + ' done and ' + chk.open.length + ' ' + (chk.open.length === 1 ? 'is' : 'are') + ' open. ' + (n ? n + ' need' + (n === 1 ? 's' : '') + ' your attention: ' + chk.issues.map(function (x) { return x.label; }).join(' ') + (chk.issues.some(function (x) { return x.type === 'conflict'; }) ? ' I won’t treat a conflicting date as a deadline until you choose.' : '') : 'Nothing conflicts with your calendar or documents.');
    return { card: card, reply: reply, say: 'Here is the ' + tx.title + ' file. ' + (n ? numWord(n) + ' item' + (n === 1 ? '' : 's') + ' need your attention.' : 'Nothing needs attention.') };
  };

  function addMin(hhmm, m) { return T.addMin(hhmm, m); }
  function upcomingFor(clientId, when) {
    var now = T.nowISO();
    var list = T.cal.active().filter(function (a) { return a.client === clientId && (a.date + 'T' + a.end) >= now; });
    if (when && when.date) { var same = list.filter(function (a) { return a.date === when.date; }); if (same.length) return same; }
    return list;
  }
  function planSlot(card, date, start, dur, area, ignoreId, cons) {
    // "after 5", "before noon", "late afternoon": the first slot inside the window that is free, travel included
    if (cons) {
      var from = cons.after || S().settings.morning, last = addMin(cons.before || '20:00', -dur), t = from, pick = null;
      while (t <= last && !pick) { if (!T.cal.conflicts({ date: date, start: t, end: addMin(t, dur), area: area }, ignoreId).length) pick = t; else t = addMin(t, 15); }
      card.slotRule = { text: cons.text, picked: pick, from: from, last: last };
      if (pick) { card.conflicts = []; card.suggestions = []; return { conf: [], sugg: [], start: pick }; }
    }
    var evt = { date: date, start: start, end: addMin(start, dur), area: area };
    var conf = T.cal.conflicts(evt, ignoreId);
    var lastEnd = conf.reduce(function (m, x) { return x.other.end > m ? x.other.end : m; }, start);
    var sugg = conf.length ? T.cal.suggest(date, dur, area, addMin(lastEnd, 15), ignoreId) : [];
    card.conflicts = conf.map(function (x) { return { id: x.other.id, text: T.cal.describe(x) }; });
    card.suggestions = sugg;
    return { conf: conf, sugg: sugg };
  }
  B.schedule = function (p, input) {
    var c = T.client(p.clientId), card = newCard('schedule', p, input);
    card.clientId = c.id; card.clientWhy = p.clientWhy;
    var when = p.when || { date: T.addDays(T.today(), 1), time: S().settings.morning, text: '', note: 'no time heard' };
    // "schedule a call with Kevin" is a calendar slot; "call Kevin tomorrow" is a task
    var bookCall = /(^|[^a-z])(schedule|book|set up|plan|put in|planifie|prevois|cedule|fixe|reserve|organise)\b[^.;!?]{0,25}?\b(call|phone call|appel)\b/.test(T.foldKeep(p.text));
    if (p.isCall && !bookCall && !p.listingId && !/(showing|visit|visite|see|voir)/i.test(p.text)) {
      card.mode = 'task';
      card.title = 'Call ' + T.fullName(c);
      card.task = { include: true, title: 'Call ' + T.fullName(c), due: when.date + 'T' + when.time, owner: T.BROKER.name, note: when.text ? '“' + when.text + '” → ' + T.fmtDT(when.date + 'T' + when.time, { long: true }) : 'No time heard.', source: 'Your request, ' + T.fmtDate(T.today(), { noDay: true }) };
      card.fingerprint = T.fingerprint(card);
      return { card: card, reply: 'A task to call ' + c.first + ' on ' + T.fmtDT(card.task.due) + '. It stays a task: no invitation goes out.', say: 'A task to call ' + c.first + ', ready for approval.' };
    }
    card.mode = 'appointment';
    var second = /second|deuxi/i.test(p.text);
    var kind = bookCall && !p.listingId ? 'Call' : /meeting|rendez|rdv|presentation/i.test(p.text) ? 'Meeting' : (second ? 'Second showing' : 'Showing');
    var dur = kind === 'Call' ? 20 : kind === 'Meeting' ? 30 : 45;
    var L = p.listingId && T.listing(p.listingId);
    var area = kind === 'Call' ? '' : L ? L.area : c.area;
    var start = when.time;
    var r = planSlot(card, when.date, start, dur, area, null, when.cons);
    if (r.start) start = r.start;
    card.title = 'Book a ' + kind.toLowerCase() + ' with ' + T.shortName(c);
    card.appt = { title: kind, kind: kind === 'Call' ? 'call' : kind === 'Meeting' ? 'meeting' : 'showing', date: when.date, requested: start, start: r.conf.length && r.sugg.length ? r.sugg[0] : start, dur: dur, place: kind === 'Call' ? 'Phone' : L ? L.address : '', listing: L ? L.id : null, area: area, whenText: when.text, note: when.note };
    card.invite = { include: T.canEmail(c) && kind !== 'Call', to: c.email, locked: !T.canEmail(c) };
    card.fingerprint = T.fingerprint(card);
    var reply, say;
    if (card.slotRule && !card.slotRule.picked) {
      reply = 'No free slot ' + when.cons.text + ' on ' + T.fmtDate(when.date, { long: true }) + ', travel included. ' + (r.conf.length ? T.cal.describe(r.conf[0]) + ' ' : '') + 'Pick a time before I book anything.';
      say = 'No free slot in that window. Pick a time before I book anything.';
    } else if (r.conf.length) {
      reply = T.weekday(when.date) + ' at ' + T.fmtTime(start) + ': ' + T.cal.describe(r.conf[0]) + (r.sugg.length ? ' I suggest ' + T.fmtTime(r.sugg[0]) + '.' : ' I found no free slot that day.') + ' Pick a time before I book anything.';
      say = 'That time doesn’t work. ' + (r.sugg.length ? 'I suggest ' + T.fmtTime(r.sugg[0]) + '. ' : '') + 'Pick a time before I book anything.';
    } else {
      reply = T.fmtDT(when.date + 'T' + start) + ' is ' + (card.slotRule ? 'the first free slot ' + when.cons.text : 'free') + (L ? ' (' + L.address + ', ' + L.area + ')' : '') + '. Approve to add it to your calendar; the invitation to ' + c.first + ' is a separate step.';
      say = 'That time is free. Approve to book it.';
    }
    return { card: card, reply: reply, say: say };
  };
  // Which event, and where it goes: the source time/date picks the event, the target time/date (or an offset) is the new slot
  // (event kinds are matched by T.namedEvent below)
  // The event a request names: the noun must match the event's type, the most specific noun first. A "visit" never
  // picks the deed of sale, a "call" never picks the open house.
  var EVENT_NOUNS = [
    [/(open house|visite libre|portes ouvertes)/, function (a) { return a.kind === 'open-house'; }, 'open house'],
    [/(photographer|photo shoot|photographe|seance photo)/, function (a) { return /photo/i.test(a.title); }, 'photographer visit'],
    [/(^|[^a-z])inspection/, function (a) { return /inspection/i.test(a.title); }, 'inspection'],
    [/(deed|notary|notaire|signing|signature)/, function (a) { return a.kind === 'deed'; }, 'deed signing'],
    [/(pricing review|price review|revision de prix|rencontre sur le prix)/, function (a) { return /pricing/i.test(a.title); }, 'pricing review'],
    [/(listing presentation|presentation)/, function (a) { return /presentation/i.test(a.title); }, 'presentation'],
    [/(^|[^a-z])(call|appel|phone call)(?=[^a-z]|$)/, function (a) { return a.kind === 'call'; }, 'call'],
    [/(second showing|showing|viewing|visit(?!e libre)|visite(?! libre))/, function (a) { return a.kind === 'showing'; }, 'visit'],
    [/(^|[^a-z])(meeting|rencontre)(?=[^a-z]|$)/, function (a) { return a.kind === 'meeting'; }, 'meeting']
  ];
  T.namedEvent = function (text) { var f = T.foldKeep(text).replace(/’/g, "'"); return EVENT_NOUNS.filter(function (k) { return k[0].test(f); })[0] || null; };
  function evList(list) { return list.slice(0, 4).map(function (a) { return a.title.toLowerCase() + ' ' + T.fmtDT(a.date + 'T' + a.start); }).join('; '); }
  function noSuchEvent(c, kind, date, time, list, nothing) {
    return T.fullName(c) + ' has no ' + kind[2] + (date ? ' on ' + T.fmtDate(date, { long: true }) : '') + (time ? ' at ' + T.fmtTime(time) : '') + ' in your calendar, so ' + nothing + '. ' + (list.length ? (list.length === 1 ? 'The only upcoming event is the ' : 'Upcoming: ') + evList(list) + '. Which one did you mean?' : 'Nothing else is on the calendar for ' + c.first + '.');
  }
  // Which existing appointment a request points at: by date, time, listing and the kind of event it names
  T.pickEvent = function (c, p, text, verb) {
    var f = T.foldKeep(text || p.text), now = T.nowISO(), w = p.when, nothing = verb === 'cancel' ? 'nothing will be cancelled' : 'nothing will change';
    var list = T.cal.active().filter(function (a) { return a.client === c.id && (a.date + 'T' + a.end) >= now; });
    if (!list.length) return { question: T.fullName(c) + ' has no upcoming appointment in your calendar, so ' + nothing + '.' };
    var pick = list;
    if (w && w.phrase) { var d = pick.filter(function (a) { return a.date === w.date; }); if (d.length) pick = d; else return { question: 'I don’t see an appointment with ' + T.fullName(c) + ' on ' + T.fmtDate(w.date, { long: true }) + ', so ' + nothing + '. Upcoming: ' + list.slice(0, 3).map(function (a) { return a.title.toLowerCase() + ' ' + T.fmtDT(a.date + 'T' + a.start); }).join('; ') + '.' }; }
    if (w && w.timeText) { var t = pick.filter(function (a) { return a.start === w.time; }); if (t.length) pick = t; }
    if (p.listingId) { var l = pick.filter(function (a) { return a.listing === p.listingId; }); if (l.length) pick = l; }
    var kindP = T.namedEvent(text || p.text);
    if (kindP) { pick = pick.filter(kindP[1]); if (!pick.length) return { question: noSuchEvent(c, kindP, w && w.phrase ? w.date : null, w && w.timeText ? w.time : null, list, nothing) }; }
    if (pick.length > 1 && !(w && (w.phrase || w.timeText))) return { question: T.fullName(c) + ' has ' + pick.length + ' upcoming appointments: ' + pick.slice(0, 3).map(function (a) { return a.title.toLowerCase() + ' ' + T.fmtDT(a.date + 'T' + a.start); }).join('; ') + '. Which one? Nothing ' + (verb === 'cancel' ? 'is cancelled' : 'changes') + ' until you say.' };
    return { target: pick[0], others: list.filter(function (a) { return a !== pick[0]; }) };
  };
  T.resolveMove = function (p, c) {
    var f = T.foldKeep(p.text), mv = p.move || {}, now = T.nowISO();
    var list = T.cal.active().filter(function (a) { return a.client === c.id && (a.date + 'T' + a.end) >= now; });
    // An event named by its exact time ("my 11 am showing") can still be moved after it was missed today
    var missed = mv.fromTime ? T.cal.active().filter(function (a) { return a.client === c.id && a.date === (mv.fromDate || T.today()) && a.start === mv.fromTime && (a.date + 'T' + a.end) < now; }) : [];
    if (!list.length && !missed.length) return { question: T.fullName(c) + ' has no upcoming appointment to move. Want to book one?' };
    var pick = list;
    if (mv.fromDate) pick = pick.filter(function (a) { return a.date === mv.fromDate; });
    if (mv.fromTime) pick = pick.filter(function (a) { return a.start === mv.fromTime; });
    if (!pick.length && missed.length) pick = missed;
    if (p.listingId) { var byL = pick.filter(function (a) { return a.listing === p.listingId; }); if (byL.length) pick = byL; }
    var kindM = T.namedEvent(p.text);
    if (kindM) { var byKind = pick.filter(kindM[1]); if (!byKind.length) return { question: noSuchEvent(c, kindM, mv.fromDate, mv.fromTime, list, 'nothing moves') + (mv.fromWhy ? ' (The date comes from “' + mv.fromWhy + '”.)' : '') }; pick = byKind; }
    if (!pick.length) return { question: 'I don’t see ' + (mv.fromTime ? 'an appointment at ' + T.fmtTime(mv.fromTime) : 'that appointment') + (mv.fromDate ? ' on ' + T.fmtDate(mv.fromDate, { long: true }) : '') + ' with ' + T.fullName(c) + ', so nothing moves. ' + list.length + ' upcoming: ' + list.slice(0, 3).map(function (a) { return a.title.toLowerCase() + ' ' + T.fmtDT(a.date + 'T' + a.start); }).join('; ') + '.' };
    var tg = pick[0];
    if (mv.vague) return { question: (mv.vague === 'earlier' ? 'How much earlier' : 'How much later') + ' should the ' + tg.title.toLowerCase() + ' on ' + T.fmtDT(tg.date + 'T' + tg.start) + ' move? Say a time, like “to 3 pm”, or an amount, like “an hour”.', target: tg };
    var date = mv.toDate || tg.date, start = mv.toTime || (mv.offset ? T.addMin(tg.start, mv.offset) : tg.start);
    // "Push my 6 pm meeting to 7:30": an hour without am/pm stays on the same side of noon as the event it moves
    if (mv.toTime && mv.toAmbig && date === tg.date && tg.start >= '12:00' && start < '12:00') start = T.pad(+start.slice(0, 2) + 12) + start.slice(2);
    if ((date + 'T' + start) < now) return { question: 'The new time, ' + T.fmtDT(date + 'T' + start) + ', has already passed. To when should the ' + tg.title.toLowerCase() + ' move?', target: tg };
    if (!mv.toTime && !mv.toDate && !mv.offset) return { question: 'To when? Tell me the new day and time for the ' + tg.title.toLowerCase() + ' on ' + T.fmtDT(tg.date + 'T' + tg.start) + '.', target: tg };
    if (date === tg.date && start === tg.start) return { question: 'The ' + tg.title.toLowerCase() + ' is already on ' + T.fmtDT(tg.date + 'T' + tg.start) + '. To when should it move?', target: tg };
    var dur = Math.max(15, T.minutesBetween(tg.date + 'T' + tg.start, tg.date + 'T' + tg.end));
    var how = mv.offset ? (mv.offset > 0 ? mv.offset + ' min later' : -mv.offset + ' min earlier') : [mv.toDate ? 'to ' + T.fmtDate(date, { noDay: true }) : '', mv.toTime ? T.fmtTime(start) : ''].filter(Boolean).join(' ');
    var txm = tg.tx && T.tx(tg.tx), cond = txm && tg.ref && (txm.conditions || []).filter(function (x) { return x.id === tg.ref; })[0], caution = '', fileCheck = null;
    if (cond) {
      // an appointment for a condition (the inspection): the file is updated with the move, and the deadline is checked
      var late = date > cond.deadline;
      fileCheck = { txId: txm.id, cond: cond.id, deadline: cond.deadline, late: late, text: (late ? 'After the ' + cond.label.toLowerCase() + ' deadline (' + T.fmtDate(cond.deadline, { long: true }) + ') in the ' + txm.title + ' file: the condition would lapse first. Ask the other broker for an extension before moving it.' : 'Still before the ' + cond.label.toLowerCase() + ' deadline, ' + T.fmtDate(cond.deadline, { long: true }) + ' (' + T.daysBetween(date, cond.deadline) + ' day' + (T.daysBetween(date, cond.deadline) === 1 ? '' : 's') + ' to spare), per the ' + txm.title + ' file.') };
      if (late) caution = fileCheck.text;
    } else if (txm && (tg.kind === 'deed' || tg.ref)) caution = 'This date comes from the ' + txm.title + ' file. Moving the calendar event doesn’t change the file or tell the notary: confirm the new date with them first.';
    return { target: tg, date: date, start: start, dur: dur, area: T.cal.areaOf(tg), how: how, caution: caution, fileCheck: fileCheck, missed: missed.indexOf(tg) > -1, fromNote: (mv.fromTime || mv.fromDate ? 'Found by ' + [mv.fromTime ? 'its time (' + T.fmtTime(mv.fromTime) + ')' : '', mv.fromDate ? 'its date' : ''].filter(Boolean).join(' and ') + '.' : '') + (missed.indexOf(tg) > -1 ? ' It was due earlier today and did not happen as planned.' : '') };
  };
  B.reschedule = function (p, input) {
    var c = T.client(p.clientId), r0 = T.resolveMove(p, c);
    if (r0.question) return { help: { text: r0.question, chips: r0.target ? [{ label: 'Move it to tomorrow at 2 pm', text: 'Move ' + c.first + '’s ' + r0.target.title.toLowerCase() + ' to tomorrow at 2 pm' }] : [{ label: 'Book a showing with ' + c.first, text: 'Book a showing with ' + T.fullName(c) + ' ' }] } };
    var target = r0.target, card = newCard('schedule', p, input);
    card.clientId = c.id; card.clientWhy = p.clientWhy; card.mode = 'reschedule'; card.target = target.id;
    var r = planSlot(card, r0.date, r0.start, r0.dur, r0.area, target.id);
    card.title = 'Move ' + T.shortName(c) + '’s ' + target.title.toLowerCase();
    if (r0.fileCheck) card.fileCheck = r0.fileCheck;
    card.appt = { title: target.title, kind: target.kind, date: r0.date, requested: r0.start, start: r.conf.length && r.sugg.length ? r.sugg[0] : r0.start, dur: r0.dur, place: target.place, listing: target.listing || null, area: r0.area, whenText: r0.how, note: [r0.fromNote, r0.caution].filter(Boolean).join(' '), from: target.date + 'T' + target.start };
    card.invite = { include: T.canEmail(c) && target.kind !== 'call', to: c.email, locked: !T.canEmail(c), update: true };
    card.fingerprint = T.fingerprint(card);
    return { card: card, reply: 'Moving the ' + target.title.toLowerCase() + ' from ' + T.fmtDT(target.date + 'T' + target.start) + ' to ' + T.fmtDT(r0.date + 'T' + card.appt.start) + '. ' + (r.conf.length ? T.cal.describe(r.conf[0]) + ' ' : '') + (r0.caution ? r0.caution + ' ' : '') + 'Nothing changes until you approve.', say: 'Ready to move it. Nothing changes until you approve.' };
  };
  // Event names in the client's language for French messages (calendar titles are the broker's, in English)
  var EVT_FR = { showing: 'visite', 'second showing': 'deuxième visite', 'listing presentation': 'rencontre de présentation', 'photographer visit': 'visite du photographe', 'pricing review': 'rencontre sur le prix', 'open house': 'visite libre', meeting: 'rendez-vous' };
  T.evtFr = function (e) {
    var t = String(e.title || '').toLowerCase();
    if (EVT_FR[t]) return EVT_FR[t];
    if (e.kind === 'call' || /^call/.test(t)) return 'appel';
    if (e.kind === 'showing') return 'visite';
    if (e.kind === 'deed') return 'signature chez le notaire';
    return 'rendez-vous';
  };
  B.cancel = function (p, input) {
    var c = T.client(p.clientId), pe = T.pickEvent(c, p, p.text, 'cancel');
    if (pe.question) return { help: { text: pe.question, chips: [{ label: 'Open ' + c.first, href: '#/clients/' + c.id }] } };
    var target = pe.target, list = [target].concat(pe.others), card = newCard('cancel', p, input);
    card.clientId = c.id; card.clientWhy = p.clientWhy; card.target = target.id;
    card.title = 'Cancel ' + T.shortName(c) + '’s ' + target.title.toLowerCase();
    card.others = list.slice(1).map(function (a) { return a.id; });
    var fr = c.lang === 'FR';
    card.email = { include: T.canEmail(c) && target.kind !== 'call', locked: !T.canEmail(c), to: c.email, name: T.fullName(c), lang: c.lang, tone: 'warm', kind: 'service', bodyEdited: false,
      subject: fr ? 'Annulation : ' + T.evtFr(target) + ' du ' + T.fmtDate(target.date, { fr: true }) : 'Cancelled: ' + target.title.toLowerCase() + ' on ' + T.fmtDate(target.date, { long: true }),
      body: fr ? 'Bonjour ' + c.first + ',\n\nJe dois annuler notre ' + T.evtFr(target) + ' du ' + T.fmtDate(target.date, { fr: true }) + ' à ' + T.fmtTime(target.start, true) + '. Je vous propose un autre moment très bientôt.\n\n' + S().style.signFR : 'Hi ' + c.first + ',\n\nI need to cancel our ' + target.title.toLowerCase() + ' on ' + T.fmtDate(target.date, { long: true }) + ' at ' + T.fmtTime(target.start) + '. I’ll suggest another time shortly.\n\n' + S().style.signEN };
    card.fingerprint = T.fingerprint(card);
    return { card: card, reply: 'This cancels the ' + target.title.toLowerCase() + ' on ' + T.fmtDT(target.date + 'T' + target.start) + (target.place ? ' at ' + target.place : '') + '. ' + (card.others.length ? card.others.length + ' other upcoming appointment' + (card.others.length === 1 ? ' stays' : 's stay') + ' as is. ' : '') + 'A note to ' + c.first + ' is drafted; nothing changes until you approve.', say: 'Ready to cancel it once you approve.' };
  };
  // A task title from the words of the request: the command, the date and the time are removed, "her" becomes the client
  var FR_INF = { relance: 'relancer', appelle: 'appeler', rappelle: 'rappeler', envoie: 'envoyer', ecris: 'écrire', prepare: 'préparer', verifie: 'vérifier', confirme: 'confirmer', demande: 'demander', fais: 'faire', planifie: 'planifier', reserve: 'réserver', passe: 'passer', contacte: 'contacter', avise: 'aviser', previens: 'prévenir', parle: 'parler', textes: 'texter', texte: 'texter', mets: 'mettre', ajoute: 'ajouter', imprime: 'imprimer', organise: 'organiser', trouve: 'trouver', reviens: 'revenir' };
  var FR_ONLY = /^(relance|appelle|rappelle|envoie|ecris|verifie|demande|fais|planifie|contacte|avise|previens|parle|mets|ajoute|imprime|trouve|reviens)(-|\s|$)/;
  function taskTitle(text, p, c, lang) {
    var t = String(text || '').replace(/[.!?;]+$/, '').trim();
    if (/^(please\s+)?(let['’]?s|lets)\s+(talk|chat|catch up|speak|connect|touch base|reconnect)/i.test(t)) return (lang === 'FR' ? 'Parler avec ' : 'Talk with ') + (c ? c.first : 'the client');
    t = t.replace(/^(tayoo,?\s*)?(please\s+)?(remind me(\s+[^,;]{1,40}?)??\s+to\s+|reminder to\s+|add a task( to)?:?\s*|create a task( to)?:?\s*|new task:?\s*|to-?do:?\s*|don['’]?t forget to\s+|(and\s+|but\s+)?i\s+(should|need to|have to|must|want to|ought to|gotta)\s+|i['’]d like to\s+|(je dois|je devrais|il faut que je|il faudrait que je|je veux)\s+|rappelle-moi(\s+[^,;]{1,40}?)??\s+(de\s+|d['’])|n['’]oublie pas (de\s+|d['’])|ajoute une t[aâ]che:?\s*)/i, '');
    function cut(ph) { if (!ph) return; var k = T.foldKeep(t).indexOf(ph); if (k > 0) t = (t.slice(0, k) + ' ' + t.slice(k + ph.length)).replace(/\s+/g, ' ').trim(); }
    if (p && p.when) { cut(p.when.phrase); cut(p.when.timeText); }
    t = t.replace(/\s+(on|by|at|for|le|pour|d'ici)(?=\s*$)/i, '').replace(/[\s,.]+$/, '').trim();
    // "her lawyer" → "Annie’s lawyer", "his file" → "Louis’s file", "call her" → "call Annie"
    if (c && lang !== 'FR') t = t.replace(/\b(his|her|their)\s+(?=(lawyer|notary|lender|bank|inspector|broker|agent|accountant|husband|wife|partner|spouse|parents?|mother|father|family|file|offer|budget|mortgage|pre-approval|condo|house|keys|documents?|deposit|id|t4s?|kids|children|boss|employer)\b)/i, c.first + '’s ').replace(/\b(her|him|them)\b/i, c.first);
    if (c && lang === 'FR') t = t.replace(/^(la|le|les|lui|leur)\s+(\S+)/i, function (m0, pr, v) { return v + ' ' + c.first; }).replace(/^(relance|appelle|rappelle)-(le|la)\b/i, '$1r ' + c.first);
    // French requests are imperatives ("relance Mathieu", "envoie-lui…"); a task title reads as an infinitive
    if (lang === 'FR' || FR_ONLY.test(T.fold(t))) t = t.replace(/^(\S+?)(-(?:lui|leur|le|la|les|moi))?(?=\s|$)/i, function (m0, v, pr) { var inf = FR_INF[T.fold(v)]; return inf ? inf + (pr && c && /lui|le|la/.test(pr) ? ' ' + (/lui/.test(pr) ? 'à ' : '') + c.first : '') : m0; });
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Follow up';
  }
  B.task = function (p, input) {
    var c = p.clientId && !p.ambiguous ? T.client(p.clientId) : null;
    var card = newCard('schedule', p, input);
    card.mode = 'task'; card.clientId = c ? c.id : null; card.clientWhy = p.clientWhy;
    var ae = c && (!p.when || !p.when.timeText) && T.afterEvent(c, p.text);
    if (ae && !ae.question) p = Object.assign({}, p, { when: { date: ae.date, time: ae.time, text: ae.text, phrase: ae.text, timeText: ae.text, note: ae.note } });
    var title = taskTitle(p.text, p, c, p.lang);
    var due = p.when ? p.when.date + 'T' + p.when.time : T.addDays(T.today(), 1) + 'T' + S().settings.morning;
    card.title = 'Add a task' + (c ? ' for ' + T.shortName(c) : '');
    card.task = { include: true, title: title || 'Follow up', due: due, owner: T.actor(), note: p.when ? '“' + p.when.text + '” → ' + T.fmtDT(due, { long: true }) + (p.when.note ? ' (' + p.when.note + ')' : '') : 'No date heard, so tomorrow at your default morning time.', source: 'Your request, ' + T.fmtDate(T.today(), { noDay: true }), internal: !c };
    if (p.txId) card.txId = p.txId;
    card.fingerprint = T.fingerprint(card);
    return { card: card, reply: 'A task' + (c ? ' linked to ' + T.fullName(c) : '') + ', due ' + T.fmtDT(due) + '. It stays a task; nothing goes out.', say: 'Task ready for approval.' };
  };
  function listingLine(L, lang) {
    var fr = lang === 'FR';
    var bits = [T.money(L.price), L.beds + (fr ? ' chambres' : ' bedrooms'), L.size ? (L.size + (fr ? ' pi²' : ' sq ft')) : null, L.fees ? (fr ? 'frais ' : 'fees ') + T.money(L.fees) + (fr ? '/mois' : '/month') : null, L.garage === 'yes' ? 'garage' : null].filter(Boolean);
    return '• ' + L.address + ', ' + L.area + ' (' + L.type.toLowerCase() + '): ' + bits.join(', ') + '. ' + (fr ? 'Fiche ' : 'Listing ') + L.id + '.';
  }
  D.listings = function (card) {
    var c = T.client(card.clientId), fr = c.lang === 'FR', inc = card.rows.filter(function (r) { return r.include; }).map(function (r) { return T.listing(r.id); });
    var hi = fr ? 'Bonjour ' + c.first + ',' : 'Hi ' + c.first + ',';
    var intro = fr ? (inc.length === 1 ? 'Voici une propriété qui pourrait vous intéresser :' : 'Voici ' + inc.length + ' propriétés qui pourraient vous intéresser :') : (inc.length === 1 ? 'Here is a listing that could interest you:' : 'Here are ' + inc.length + ' listings that could interest you:');
    var outro = fr ? 'Les détails viennent des fiches de l’export autorisé du ' + T.fmtDate(T.LISTINGS_SOURCE.imported, { fr: true }).split(' ').slice(1).join(' ') + '. Voulez-vous en visiter une ?' : 'Details come from the authorized listing export of ' + T.fmtDate(T.LISTINGS_SOURCE.imported, { noDay: true }) + '. Would you like to visit any of them?';
    return hi + '\n\n' + intro + '\n' + inc.map(function (L) { return listingLine(L, c.lang); }).join('\n') + '\n\n' + outro + '\n\n' + sign(c.lang, card.email.tone);
  };
  B.listings = function (p, input) {
    var c = T.client(p.clientId), ids = (p.listingIds || []).slice();
    var how = 'named in your request';
    if (!ids.length && c.saved && c.saved.length) { ids = c.saved.slice(0, 4); how = 'saved to ' + c.first + '’s record'; }
    if (!ids.length) { var alts = searchAlternatives(c, [], null); ids = alts.matches.concat([]); how = 'matching ' + c.first + '’s remembered criteria'; }
    if (!ids.length) return { help: { text: 'I couldn’t find listings to send ' + c.first + '. Name an address or save listings to the record first.', chips: [{ label: 'Open Listings', href: '#/listings' }] } };
    var card = newCard('listings', p, input);
    card.clientId = c.id; card.clientWhy = p.clientWhy; card.how = how;
    card.title = 'Send ' + T.shortName(c) + ' ' + (ids.length === 1 ? 'a listing' : ids.length + ' listings');
    card.rows = ids.map(function (id) { return { id: id, include: true }; });
    card.email = { include: T.canEmail(c), locked: !T.canEmail(c), to: c.email, name: T.fullName(c), lang: c.lang, tone: 'warm', kind: 'commercial', bodyEdited: false, subject: c.lang === 'FR' ? 'Des propriétés pour vous' : 'Listings for you', body: '' };
    card.email.body = D.listings(card);
    card.fingerprint = T.fingerprint(card);
    return { card: card, reply: ids.length + ' listing' + (ids.length === 1 ? '' : 's') + ' (' + how + ') and a draft email to ' + c.first + '. ' + (T.canEmail(c) ? 'Only facts from the listing data go in the email. ' : c.first + ' has no valid email consent, so the email step is locked. ') + 'Nothing has been sent.', say: 'Listings and a draft are ready. Nothing has been sent.' };
  };
  B.search = function (p) {
    var f = { areas: p.areas || [], types: p.types || [], max: p.budgetMax || (p.budget && !p.budgetMin ? p.budget : null), min: p.budgetMin || null, beds: p.beds || null, garage: /(garage|parking|stationnement)/i.test(p.text), fees: p.fees || null };
    var res = T.filterListings(f);
    return { results: { filters: f, ids: res.map(function (l) { return l.id; }) }, reply: res.length + ' listing' + (res.length === 1 ? '' : 's') + ' match' + (res.length === 1 ? 'es' : '') + ' (' + T.filterText(f) + '), from the authorized demo export.', say: res.length + ' listings match.' };
  };
  T.filterListings = function (f) {
    return T.LISTINGS.filter(function (l) {
      if (f.areas && f.areas.length && f.areas.indexOf(l.area) < 0) return false;
      if (f.types && f.types.length && f.types.indexOf(l.type) < 0 && !(f.types.indexOf('Detached') > -1 && l.type === 'Bungalow')) return false;
      if (f.max && l.price > f.max) return false;
      if (f.min && l.price < f.min) return false;
      if (f.beds && l.beds < f.beds) return false;
      if (f.garage && l.garage !== 'yes') return false;
      if (f.fees && l.fees > f.fees) return false;
      if (f.q && T.fold(l.address + ' ' + l.id).indexOf(T.fold(f.q)) < 0) return false;
      return true;
    }).sort(function (a, b) { return a.price - b.price; });
  };
  T.filterText = function (f) {
    var b = [];
    b.push(f.types && f.types.length ? f.types.join(' or ').toLowerCase() + 's' : 'any type');
    if (f.areas && f.areas.length) b.push('in ' + f.areas.join(' or '));
    if (f.max) b.push('up to ' + T.money(f.max));
    if (f.min) b.push('from ' + T.money(f.min));
    if (f.beds) b.push(f.beds + '+ bedrooms');
    if (f.garage) b.push('garage or indoor parking, unknown excluded');
    if (f.fees) b.push('fees under ' + T.money(f.fees));
    return b.join(', ');
  };
  B.cma = function (p) {
    var L = p.listingIds && p.listingIds[0] ? T.listing(p.listingIds[0]) : null;
    var c = p.clientId && !p.ambiguous ? T.client(p.clientId) : null;
    if (!L && c) L = (S().subjects || []).filter(function (x) { return x.client === c.id; })[0] || null;
    if (L) {
      var r = T.cma.compute(L.id);
      return { help: { text: 'The CMA studio is ready for ' + L.address + '. ' + (r && r.n ? r.n + ' comparable sales are included by default; the indicated range is ' + T.money(r.low) + ' to ' + T.money(r.high) + ' (' + r.quality.toLowerCase() + ').' + (r.note ? ' ' + r.note : '') : 'No comparable sale fits yet.') + ' It’s not an appraisal; adjust the comparables and condition before relying on it.', chips: [{ label: 'Open the CMA studio', href: '#/cma/' + L.id }] } };
    }
    return { help: { text: (c ? 'I don’t have ' + c.first + '’s property facts yet. ' : 'Which property? ') + 'Add the subject (address, size, bedrooms, year built) and I’ll pull comparable sales from the authorized export.', chips: [{ label: 'Add a CMA subject' + (c ? ' for ' + c.first : ''), act: 'new-subject', client: c ? c.id : '' }, { label: 'Pick a listing', href: '#/listings' }] } };
  };

  B.clarifyClient = function (p, input) {
    var card = newCard('clarify', p, input);
    card.status = 'clarify';
    card.options = p.ambiguous.slice();
    card.mention = p.mention;
    card.title = 'Which ' + (p.anchorText || p.mention) + '?';
    card.fingerprint = T.fingerprint(card);
    var names = p.ambiguous.map(function (id) { var c = T.client(id); return T.fullName(c); });
    if (p.anchorText) return { card: card, reply: 'No name heard, and ' + names.length + ' clients have a ' + p.anchorText + ': ' + names.join(' and ') + '. I won’t guess. Which one did you mean?', say: 'Which one did you mean?' };
    return { card: card, reply: 'I know ' + names.length + ' people called ' + p.mention + ': ' + names.join(' and ') + '. I won’t guess or merge them. Which one did you mean?', say: 'Which ' + p.mention + ' did you mean?' };
  };

  function numW(w) { var N = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, une: 1, un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, some: 3, des: 3, quelques: 3, 'a couple of': 2, 'couple of': 2, 'a few': 3, 'a handful of': 3 }; return !w ? null : /^\d+$/.test(w) ? +w : N[w] || null; }
  /* ---- messages to the client, written from the words of the request ---- */
  // Small brokerage lexicon, both directions. A message is translated only when every word is covered; otherwise the
  // broker's words are kept and the card says so.
  var LEX = [
    ['the lender', 'le prêteur'], ['your lender', 'votre prêteur'], ['the bank', 'la banque'], ['the notary', 'le notaire'], ['the inspector', 'l’inspecteur'], ['the appraiser', 'l’évaluateur'], ['the photographer', 'le photographe'],
    ['the buyers', 'les acheteurs'], ['the sellers', 'les vendeurs'], ['the buyer', 'l’acheteur'], ['the seller', 'le vendeur'], ['the other broker', 'l’autre courtier'], ['the owners', 'les propriétaires'], ['the owner', 'le propriétaire'],
    ['needs', 'a besoin de'], ['need', 'ont besoin de'], ['wants', 'veut'], ['is asking for', 'demande'], ['asked for', 'a demandé'], ['accepted', 'a accepté'], ['refused', 'a refusé'], ['rejected', 'a refusé'], ['signed', 'a signé'], ['countered', 'a fait une contre-proposition'], ['confirmed', 'a confirmé'], ['called', 'a appelé'],
    ['is coming', 'passe'], ['will come', 'passera'], ['will call you', 'va vous appeler'], ['will be there', 'sera là'], ['is available', 'est disponible'], ['is booked', 'est réservé'], ['is confirmed', 'est confirmé'], ['is cancelled', 'est annulé'],
    ['you can visit', 'vous pouvez visiter'], ['you can', 'vous pouvez'], ['you need to', 'vous devez'], ['you are', 'vous êtes'], ['you have', 'vous avez'], ['visit', 'visiter'], ['sign', 'signer'], ['bring', 'apporter'], ['send', 'envoyer'],
    ['i’ll bring', 'j’apporterai'], ['i\'ll bring', 'j’apporterai'], ['i’ll send', 'j’enverrai'], ['i\'ll send', 'j’enverrai'], ['i’ll call you', 'je vous appellerai'], ['i\'ll call you', 'je vous appellerai'], ['i’m running late', 'j’ai du retard'], ['i\'m running late', 'j’ai du retard'],
    ['your t4s', 'vos T4'], ['the t4s', 'vos T4'], ['t4s', 'T4'], ['your pay stubs', 'vos talons de paie'], ['pay stubs', 'talons de paie'], ['your notice of assessment', 'votre avis de cotisation'], ['your bank statements', 'vos relevés bancaires'], ['bank statements', 'relevés bancaires'],
    ['your pre-approval letter', 'votre lettre de préapprobation'], ['the pre-approval letter', 'la lettre de préapprobation'], ['your id', 'votre pièce d’identité'], ['your identification', 'votre pièce d’identité'], ['a void cheque', 'un spécimen de chèque'], ['proof of down payment', 'une preuve de mise de fonds'],
    ['your offer', 'votre offre'], ['the offer', 'l’offre'], ['the signed offer', 'l’offre signée'], ['the inspection report', 'le rapport d’inspection'], ['the inspection', 'l’inspection'], ['the deed', 'l’acte de vente'], ['the keys', 'les clés'], ['the comparables', 'les comparables'], ['the cma', 'l’analyse comparative de marché'], ['your cma', 'votre analyse comparative de marché'], ['the market evaluation', 'l’évaluation du marché'], ['the listing sheet', 'la fiche'], ['the visit', 'la visite'], ['the showing', 'la visite'],
    ['is flexible on', 'est flexible sur'], ['are flexible on', 'sont flexibles sur'], ['is flexible', 'est flexible'], ['the closing date', 'la date de signature'], ['the closing', 'la signature'], ['the possession date', 'la date de prise de possession'], ['the price', 'le prix'], ['the deposit', 'le dépôt'], ['the tax bill', 'le compte de taxes'], ['the municipal tax bill', 'le compte de taxes municipales'], ['the school tax bill', 'le compte de taxes scolaires'], ['the certificate of location', 'le certificat de localisation'], ['the declaration of co-ownership', 'la déclaration de copropriété'], ['the mortgage', 'le prêt hypothécaire'], ['the appraisal', 'l’évaluation'], ['the counter-offer', 'la contre-proposition'], ['the documents', 'les documents'], ['your documents', 'vos documents'], ['the condo fees', 'les frais de copropriété'], ['is firm', 'est ferme'], ['is ready', 'est prêt'], ['are ready', 'sont prêts'],
    ['the open house went well', 'la visite libre s’est bien passée'], ['the showing went well', 'la visite s’est bien passée'], ['the open house', 'la visite libre'], ['the inspection is booked', 'l’inspection est réservée'], ['the inspection is done', 'l’inspection est faite'],
    ['i’ll call', 'je vous appellerai'], ['i\'ll call', 'je vous appellerai'], ['i’ll be there', 'je serai là'], ['i\'ll be there', 'je serai là'], ['i’ll confirm', 'je vous confirmerai'], ['i\'ll confirm', 'je vous confirmerai'], ['we’ll reschedule', 'nous trouverons un autre moment'], ['we\'ll reschedule', 'nous trouverons un autre moment'],
    ['accepted', 'ont accepté'], ['signed', 'ont signé'], ['want', 'veulent'], ['are', 'sont'], ['is', 'est'], ['works', 'convient'], ['for you', 'pour vous'], ['for', 'pour'], ['again', 'de nouveau'], ['with', 'avec'], ['instead', 'plutôt'],
    ['tomorrow', 'demain'], ['today', 'aujourd’hui'], ['tonight', 'ce soir'], ['this week', 'cette semaine'], ['next week', 'la semaine prochaine'], ['this weekend', 'ce week-end'], ['afternoon', 'après-midi'], ['morning', 'matin'], ['evening', 'soir'],
    ['Monday', 'lundi'], ['Tuesday', 'mardi'], ['Wednesday', 'mercredi'], ['Thursday', 'jeudi'], ['Friday', 'vendredi'], ['Saturday', 'samedi'], ['Sunday', 'dimanche'],
    ['congratulations', 'félicitations'], ['congrats', 'félicitations'], ['thank you', 'merci'], ['thanks', 'merci'], ['good news', 'bonne nouvelle'], ['great news', 'excellente nouvelle'],
    ['you still want', 'vous voulez toujours'], ['you want', 'vous voulez'], ['a garage', 'un garage'], ['garage', 'garage'], ['a parking spot', 'un stationnement'], ['parking', 'stationnement'], ['you', 'vous'], ['you like', 'vous aimez'], ['you prefer', 'vous préférez'], ['works for you', 'vous convient'], ['suits you', 'vous convient'], ['to see again', 'revoir'], ['to see', 'voir'], ['see', 'voir'],
    ['the condo', 'le condo'], ['the house', 'la maison'], ['the property', 'la propriété'], ['the listing', 'la propriété'], ['the townhouse', 'la maison de ville'], ['the duplex', 'le duplex'], ['the bungalow', 'le bungalow'], ['a second visit', 'une deuxième visite'], ['a second showing', 'une deuxième visite'],
    ['i’m', 'je suis'], ['i\'m', 'je suis'], ['i am', 'je suis'], ['late', 'en retard'], ['early', 'en avance'], ['minutes', 'minutes'], ['to the notary', 'chez le notaire'], ['at the notary', 'chez le notaire'], ['to', 'à'], ['your', 'votre'], ['free', 'libre'], ['if', 'si'],
    ['before', 'avant'], ['by', 'd’ici'], ['on', ''], ['and', 'et'], ['or', 'ou'], ['still', 'toujours'], ['now', 'maintenant'], ['the', 'le'], ['a', 'un']
  ];
  var EN_FR = LEX.slice().sort(function (a, b) { return b[0].length - a[0].length; });
  var FR_EN = LEX.filter(function (x) { return x[1]; }).map(function (x) { return [T.foldKeep(x[1]).replace(/’/g, "'"), x[0]]; }).sort(function (a, b) { return b[0].length - a[0].length; });
  var MO_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], MO_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var TR_PAT = [
    ['EN', /^(?:on )?(january|february|march|april|may|june|july|august|september|october|november|december) (\d{1,2})(?:st|nd|rd|th)?/, function (m) { return 'le ' + (+m[2] === 1 ? '1er' : +m[2]) + ' ' + MO_FR[MO_EN.map(function (x) { return x.toLowerCase(); }).indexOf(m[1])]; }],
    ['FR', /^(?:le )?(\d{1,2})(?:er)? (janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)/, function (m) { return 'on ' + MO_EN[['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'].indexOf(m[2])] + ' ' + (+m[1]); }],
    ['EN', /^i'?m (\d+) minutes late/, function (m) { return 'j’ai ' + m[1] + ' minutes de retard'; }],
    ['FR', /^j'ai (\d+) minutes de retard/, function (m) { return 'I’m ' + m[1] + ' minutes late'; }],
    ['FR', /^revoir (le|la|l'|les) (\S+)/, function (m) { return 'to see the ' + (FR_NOUN[m[2]] || m[2]) + ' again'; }]
  ];
  var FR_NOUN = { condo: 'condo', maison: 'house', propriete: 'property', duplex: 'duplex', bungalow: 'bungalow', triplex: 'triplex' };
  function translate(text, from) {
    var src = T.foldKeep(text).replace(/’/g, "'"), out = [], i = 0, table = from === 'EN' ? EN_FR.map(function (x) { return [T.foldKeep(x[0]).replace(/’/g, "'"), x[1]]; }) : FR_EN;
    while (i < src.length) {
      if (src[i] === ' ' || src[i] === ',') { if (src[i] === ',') out.push(','); i++; continue; }
      var hit = null;
      for (var k = 0; k < table.length; k++) {
        var w = table[k][0];
        if (src.substr(i, w.length) !== w) continue;
        if (!/[a-z0-9]/.test(src[i + w.length] || '')) { hit = table[k]; break; }
        // French agreement: "confirmée", "prêts", "acceptées" match the base form
        var ag = from === 'FR' && /^(e|s|es)(?![a-z0-9])/.exec(src.slice(i + w.length));
        if (ag && /[eéiutsr]$/.test(w)) { hit = [w + ag[1], table[k][1]]; break; }
      }
      var pt = null;
      for (var q = 0; q < TR_PAT.length && !pt; q++) if (TR_PAT[q][0] === from) { var pm = TR_PAT[q][1].exec(src.slice(i)); if (pm && !/[a-z0-9]/.test(src[i + pm[0].length] || '')) pt = [pm, TR_PAT[q][2]]; }
      if (pt) { out.push(pt[1](pt[0])); i += pt[0][0].length; continue; }
      var tm = /^(at|a|vers) (\d{1,2})(?:[:h ]?(\d{2}))?\s?(am|pm|a\.m\.|p\.m\.|h)?(?![a-z0-9])/.exec(src.slice(i));
      if (tm) { var hh = +tm[2]; if (/p/.test(tm[4] || '') && hh < 12) hh += 12; else if (!tm[4] && hh >= 1 && hh <= 6) hh += 12; out.push(from === 'EN' ? 'à ' + hh + ' h' + (tm[3] ? ' ' + tm[3] : '') : 'at ' + T.fmtTime(T.pad(hh) + ':' + (tm[3] || '00'))); i += tm[0].length; continue; }
      var nm = /^(\d+|[a-z]?\d[\w-]*)(?![a-z])/.exec(src.slice(i)) || (/^[A-ZÀ-Ý]/.test(text[i]) ? /^\S+/.exec(text.slice(i)) : null);
      if (hit) { if (hit[1]) out.push(hit[1]); i += hit[0].length; continue; }
      if (nm) { out.push(text.substr(i, nm[0].length)); i += nm[0].length; continue; }
      return null;
    }
    var r = out.join(' ').replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();
    // French agreement after a plural subject ("les vendeurs a accepté" → "les vendeurs ont accepté")
    if (from === 'EN') r = r.replace(/\b(les \S+|vos \S+|ils|elles) (a|est|veut|passe|passera) /g, function (m0, sbj, v) { return sbj + ' ' + { a: 'ont', est: 'sont', veut: 'veulent', passe: 'passent', passera: 'passeront' }[v] + ' '; });
    // "vous" takes the second-person plural form
    if (from === 'EN') r = r.replace(/\bvous (veulent|veut|a|est|peut|doit|sont|ont|passe)\b/g, function (m0, v) { return 'vous ' + { veulent: 'voulez', veut: 'voulez', a: 'avez', est: 'êtes', peut: 'pouvez', doit: 'devez', sont: 'êtes', ont: 'avez', passe: 'passez' }[v]; });
    if (from === 'EN') r = r.replace(/\bde le\b/g, 'du').replace(/\bde les\b/g, 'des').replace(/\bde vos\b/g, 'de vos').replace(/\bde ([aeiouhé])/gi, 'd’$1').replace(/\ble ([aeiouhé])/gi, 'l’$1').replace(/\bà le\b/g, 'au');
    return r;
  }
  // "he needs his T4s" → "you need your T4s" (third person about the recipient → second person)
  function toYou(t, lang) {
    if (lang === 'FR') {
      var FRV = { veut: 'voulez', peut: 'pouvez', doit: 'devez', est: 'êtes', a: 'avez', aime: 'aimez', prefere: 'préférez', 'préfère': 'préférez', cherche: 'cherchez', pense: 'pensez', trouve: 'trouvez', souhaite: 'souhaitez', sera: 'serez', pourra: 'pourrez', va: 'allez' };
      return t.replace(/\b(il|elle) (veut|peut|doit|est|a|aime|prefere|préfère|cherche|pense|trouve|souhaite|sera|pourra|va)\b/gi, function (m0, pr, v) { return 'vous ' + FRV[v.toLowerCase()]; })
        .replace(/\blui (convient|plait|plaît|va)\b/gi, 'vous $1').replace(/\b(son|sa)\b/gi, 'votre').replace(/\bses\b/gi, 'vos');
    }
    var irr = { is: 'are', was: 'were', has: 'have', does: 'do', "'s": "'re", '’s': '’re' };
    t = t.replace(/\b(he|she)(['’])s\b/gi, 'you$2re').replace(/\b(he|she) (is|was|has|does)\b/gi, function (m0, a, v) { return 'you ' + irr[v.toLowerCase()]; });
    t = t.replace(/\b(he|she)\s+((?:still|really|also|never|always|already|just|now|probably|definitely|only|actually)\s+)?(\w+?)(es|s)\b/gi, function (m0, a, adv, v, sfx) { return 'you ' + (adv || '') + (sfx === 'es' && /(sh|ch|ss|x|o)$/.test(v) ? v : v + (sfx === 'es' ? 'e' : '')); });
    t = t.replace(/\b(he|she)\b/gi, 'you').replace(/\bhimself|herself\b/gi, 'yourself').replace(/\bhis\b/gi, 'your').replace(/\bhim\b/gi, 'you');
    t = t.replace(/\bher\b(?=\s+(?:new |own |next |first )?[a-z0-9-]+)/gi, 'your').replace(/\bher\b/gi, 'you');
    return t.replace(/you're/g, 'you’re');
  }
  T.composeMessage = function (x, c) {
    var text = x.text.replace(/[.!?;]+$/, '').trim(), f = T.foldKeep(text).replace(/’/g, "'");
    var vm = /^(please\s+)?(can you\s+|could you\s+)?(tell|inform|let|ask|remind|email|e-mail|text|write to|message|send|envoie|envoyer|envoyez|dis|dites|ecris|ecrivez|avise|avisez|previens|prevenez|informe|informez|demande|demandez|rappelle|rappelez)(-lui|-leur|-le|-la|-les)?\b\s*/.exec(f);
    var i = vm ? vm[0].length : 0, verb = vm ? vm[3] : 'tell';
    var rest = function () { return f.slice(i); };
    var skip = function (re) { var m = re.exec(rest()); if (m) { i += m[0].length; return m; } return null; };
    if (/^(send|envoie|envoyer|envoyez)$/.test(verb)) skip(/^(a |an |un |une )?(quick |petit |court )?(textos?|text message|message|note|text|e-mail|email|word|courriel|mot)( rapide)?\s*(to\s+|a\s+|à\s+)?/);
    skip(/^(a|à)\s+/);
    var who = (x.p.spans || []).filter(function (sp) { return sp.type === 'client' && sp.start >= i - 1 && sp.start <= i + 2; })[0];
    if (who) i = who.end + (f[who.end] === ' ' ? 1 : 0); else skip(/^(him|her|them|lui|leur|the sellers?|the buyers?|the owners?|the clients?|the family|les vendeurs|le vendeur|la vendeuse|les acheteurs|l'acheteur|les proprietaires|le proprietaire|le client|la cliente|les clients)\b\s*/);
    if (verb === 'let') skip(/^know\b\s*/);
    if (verb === 'send') skip(/^(a\s+)?(quick\s+)?(note|message|text|email|word)\s*/);
    var pourV = skip(/^(pour (lui|leur) (dire|demander|rappeler)|to (say|tell (him|her|them)))\s*/);
    // "email Sofia to ask if…", "text him to remind him…": the inner verb decides the kind of message
    var inner = /^(to )?(ask|tell|remind|let)\s+((him|her|them)\s+)?(know\s+)?/.exec(rest());
    if (inner && /^(email|e-mail|text|write to|message|send)$/.test(verb)) { verb = inner[2]; i += inner[0].length; }
    var comp = skip(/^(that|whether|if|to|about|for|of|saying|to say|que|qu'|si|s'|de|d'|pour)\s*/);
    var kind = /^(ask|demande|demandez)/.test(verb) || (pourV && /demander/.test(pourV[0])) ? (comp && /^(to|de|d')/.test(comp[1]) ? 'askto' : comp && /^(for)/.test(comp[1]) ? 'askfor' : 'askif') : /^(remind|rappelle|rappelez)/.test(verb) || (pourV && /rappeler/.test(pourV[0])) ? (comp && /^(to|de|d')/.test(comp[1]) ? 'remindto' : 'remind') : 'tell';
    var content = text.slice(i).replace(/^[\s,:]+/, '').trim();
    // "email him the comparables", "envoie-lui les documents": the message delivers a thing, not a sentence
    var attach = null;
    if (kind === 'tell' && !comp && /^(email|e-mail|text|send|message|envoie|envoyer|envoyez)$/.test(verb) && /^(the|your|his|her|a|an|our|my|le|la|les|l'|vos|votre|son|sa|ses|un|une|mon|ma|mes)\s?\S/i.test(T.foldKeep(content).replace(/’/g, "'"))) { kind = 'sendnp'; attach = content.replace(/^(his|her)\b/i, 'the'); }
    var srcLang = /^(dis|dites|ecris|ecrivez|avise|avisez|previens|prevenez|informe|informez|demande|demandez|rappelle|rappelez|envoie|envoyer|envoyez)/.test(verb) ? 'FR' : 'EN';
    content = toYou(content, srcLang);
    var tr = c.lang === srcLang ? content : content ? translate(content, srcLang) : '';
    var mg = { include: T.canEmail(c), locked: !T.canEmail(c), to: c.email, name: T.fullName(c), tone: 'warm', kind: 'service', msg: true, bodyEdited: false, srcLang: srcLang, clientLang: c.lang, sms: /^text/.test(verb), verb: kind, clause: x.text, content: content, attach: attach,
      parts: [{ content: content, kind: kind, src: frameLine(kind, content, srcLang === 'FR'), tr: tr == null ? null : frameLine(kind, tr, c.lang === 'FR') }] };
    T.renderMsg(mg, c);
    return mg;
  };
  // One line of a message: the request's words in a frame for its kind (tell, ask if, ask to, remind…)
  function frameLine(kind, body, fr) {
    if (!body) return '';
    var cap = function (t) { return t.charAt(0).toUpperCase() + t.slice(1); }, line;
    if (kind === 'sendnp') line = fr ? 'Voici ' + body + '.' : 'Here ' + (/s$/i.test(body.split(' ').pop()) ? 'are ' : 'is ') + body + '.';
    else if (fr) line = kind === 'askif' ? 'Pourriez-vous me dire si ' + body + ' ?' : kind === 'askto' ? 'Pourriez-vous ' + body + ' ?' : kind === 'askfor' ? 'Pourriez-vous m’envoyer ' + body + ' ?' : kind === 'remindto' ? 'Petit rappel : n’oubliez pas ' + (/^[aeiouhéè]/i.test(body) ? 'd’' : 'de ') + body + '.' : kind === 'remind' ? 'Petit rappel : ' + body + '.' : cap(body) + '.';
    else line = kind === 'askif' ? 'Could you let me know if ' + body + '?' : kind === 'askto' ? 'Could you ' + body + '?' : kind === 'askfor' ? 'Could you send me ' + body + '?' : kind === 'remindto' ? 'Just a reminder to ' + body + '.' : kind === 'remind' ? 'Just a reminder: ' + body + '.' : cap(body) + '.';
    return line.replace(/\.\./g, '.').replace(/\?\./g, '?').replace(/si il/g, 's’il');
  }
  // The client's language when every part could be translated; otherwise the broker's own words, flagged on the card
  T.renderMsg = function (mg, c) {
    var parts = mg.view || mg.parts, ok = parts.every(function (pt) { return pt.tr != null; });
    mg.lang = ok ? mg.clientLang : mg.srcLang; mg.mixed = !ok;
    var lines = parts.map(function (pt) { return ok ? pt.tr : pt.src; }).filter(Boolean), fr = mg.lang === 'FR';
    var kinds = parts.map(function (pt) { return pt.kind; }).join(' ');
    mg.lines = lines; mg.empty = !lines.length;
    mg.subject = mg.subjectFixed || (fr ? (/ask/.test(kinds) ? 'Une petite question' : /remind/.test(kinds) ? 'Rappel' : 'Petite note') : (/ask/.test(kinds) ? 'A quick question' : /remind/.test(kinds) ? 'Reminder' : 'A quick note'));
    mg.body = msgBody(c, mg.lang, lines, mg.greet);
  };
  function msgBody(c, lang, lines, greet) { return (lang === 'FR' ? 'Bonjour ' : 'Hi ') + (greet || c.first) + ',\n\n' + lines.filter(Boolean).join(' ') + '\n\n' + sign(lang, 'warm'); }
  // Two requests to write to the same client in one plan ("tell Hugo… and ask him…") become one message
  T.mergeMessage = function (a, b, c) {
    a.parts = a.parts.concat(b.parts);
    a.clause += ' / ' + b.clause; a.content = a.parts.map(function (pt) { return pt.content; }).filter(Boolean).join(' / '); a.sms = a.sms || b.sms; a.attach = a.attach || b.attach;
    if (/ask/.test(b.verb)) a.verb = b.verb;
    T.renderMsg(a, c);
    return a;
  };
  T.msgBody = msgBody;
  // "text her the new time": the line is written from the planned slot, and rewritten if the slot changes on the card
  var RE_NEWTIME = /\b(the |our )?new (time|date|slot|day|hour)\b|nouvelle (heure|date)|nouvel horaire|nouveau moment/i;
  // A message that refers to a change in the same plan ("text her the new time", "let Marie-Ève know", "avise-le",
  // "let him know we'll reschedule") is written from that change, and rewritten if the slot changes on the card
  var RE_CONFIRM = /^((to |pour )?(confirm|confirmer|le confirmer|la confirmer)( it| that| the (time|change))?)?$/i;
  var RE_RESCHED_LINE = /(reschedule|another time|other time|un autre moment|replanifier|reporter|trouver une autre date)/i;
  T.fillNewTime = function (card) {
    var c = T.client(card.clientId), a = card.appt, cx = card.cancel && card.cancel.include !== false && card.target && S().appointments.filter(function (e) { return e.id === card.target; })[0];
    if (!c || (!a && !cx)) return;
    function change(fr, mg) {
      if (a && mg && mg.recipient) {
        // to the notary, lawyer…: the client's file, in the third person
        var what = a.title.replace(/:.*$/, '').toLowerCase(), dt0 = T.fmtDT(a.date + 'T' + a.start, fr ? { fr: true } : { long: true }), txr = T.tx(mg.recipient.txId);
        return fr ? 'Dans le dossier ' + (/^[aeiouhéèêàâ]/i.test(c.first) ? 'd’' : 'de ') + T.fullName(c) + (txr ? ' (' + txr.property + ')' : '') + ', l’' + (what === 'inspection' ? 'inspection' : 'rendez-vous') + ' est maintenant le ' + dt0 + '.' : 'In ' + T.fullName(c) + '’s file' + (txr ? ' (' + txr.property + ')' : '') + ', the ' + what + ' is now on ' + dt0 + '.';
      }
      if (a) {
        var ev = { title: a.title, kind: a.kind }, dt = T.fmtDT(a.date + 'T' + a.start, fr ? { fr: true } : { long: true });
        if (card.apptMode === 'reschedule') return fr ? 'Notre ' + T.evtFr(ev) + ' est maintenant le ' + dt + '.' : 'Our ' + a.title.toLowerCase() + ' is now on ' + dt + '.';
        return fr ? 'J’ai réservé notre ' + T.evtFr(ev) + ' le ' + dt + (a.place ? ' au ' + a.place : '') + '.' : 'I booked our ' + a.title.toLowerCase() + ' for ' + dt + (a.place ? ' at ' + a.place : '') + '.';
      }
      return fr ? 'Je dois annuler notre ' + T.evtFr(cx) + ' du ' + T.fmtDate(cx.date, { fr: true }) + ' à ' + T.fmtTime(cx.start, true) + '.' : 'I need to cancel our ' + cx.title.toLowerCase() + ' on ' + T.fmtDate(cx.date, { long: true }) + ' at ' + T.fmtTime(cx.start) + '.';
    }
    var ask = { EN: ' Could you confirm that works for you?', FR: ' Pouvez-vous me confirmer que ça vous convient ?' };
    (card.msgs || []).forEach(function (mg) {
      if (mg.bodyEdited) return;
      var sF = mg.srcLang === 'FR', cF = mg.clientLang === 'FR', hit = false;
      mg.view = mg.parts.map(function (pt) {
        var ct = String(pt.content || '').trim();
        if (RE_NEWTIME.test(ct) && a) { hit = true; return { content: ct, kind: 'tell', src: change(sF, mg), tr: change(cF, mg) }; }
        if (RE_CONFIRM.test(ct)) { hit = true; return { content: ct, kind: 'tell', src: change(sF, mg) + (ct ? ask[mg.srcLang] : ''), tr: change(cF, mg) + (ct ? ask[mg.clientLang] : '') }; }
        if (cx && !a && RE_RESCHED_LINE.test(ct)) { hit = true; return { content: ct, kind: pt.kind, src: change(sF, mg) + ' ' + pt.src, tr: pt.tr == null ? null : change(cF, mg) + ' ' + pt.tr }; }
        return pt;
      });
      mg.newTime = hit && !!a;
      if (hit) mg.attach = null;
      mg.subjectFixed = hit && mg.parts.length === 1 ? (cF ? (a ? (card.apptMode === 'reschedule' ? 'Nouvelle heure' : 'Rendez-vous confirmé') : 'Annulation') : (a ? (card.apptMode === 'reschedule' ? 'New time' : 'Appointment booked') : 'Cancelled')) : null;
      T.renderMsg(mg, c);
      if (mg.subjectFixed && mg.lang !== mg.clientLang) mg.subject = mg.lang === 'FR' ? 'Petite note' : 'A quick note';
    });
  };
  // Similar listings: same type, same or neighbouring area (or the areas asked for), within 20% of the price, best match first
  T.similarListings = function (L, n, opts) {
    opts = opts || {};
    var near = T.AREA_NEAR[L.area] || [], ex = opts.exclude || [], types = opts.types || [opts.type || L.type], areas = opts.areas && opts.areas.length ? opts.areas : null;
    return T.LISTINGS.filter(function (x) {
      if (x.id === L.id || ex.indexOf(x.id) > -1 || types.indexOf(x.type) < 0) return false;
      if (areas ? areas.indexOf(x.area) < 0 : (x.area !== L.area && near.indexOf(x.area) < 0)) return false;
      if (opts.cheaper && x.price >= L.price) return false;
      if (opts.bigger && !(x.size > L.size)) return false;
      if (opts.max && x.price > opts.max) return false;
      return Math.abs(x.price - L.price) / L.price <= (opts.cheaper ? 0.3 : 0.2);
    }).sort(function (a, b) { return ((a.area === L.area ? 0 : 1) - (b.area === L.area ? 0 : 1)) || (steerScore(b, L, opts.steer) - steerScore(a, L, opts.steer)) || (Math.abs(a.price - L.price) - Math.abs(b.price - L.price)); }).slice(0, n || 2);
  };
  // What the client disliked steers the alternatives: "too small" favours bigger units, "fees too high" lower fees…
  function steerFrom(objections) {
    var t = T.foldKeep((objections || []).map(function (o) { return o.quote || o.text || ''; }).join(' | '));
    var st = { bigger: /(small|petit|cramped|exigu|tight|tiny|not big|not large|not spacious|pas assez grand)/.test(t), lowerFees: /(fees|frais)/.test(t), cheaper: /(expensive|cher|overpriced|price|prix)/.test(t) && !/(fees|frais)/.test(t), newer: /(old|vieux|dated|vieillot|outdated)/.test(t), parking: /(parking|stationnement|garage)/.test(t) };
    st.any = st.bigger || st.lowerFees || st.cheaper || st.newer || st.parking;
    return st;
  }
  function steerScore(x, L, st) {
    if (!st || !st.any) return 0;
    return (st.bigger && x.size > L.size ? 1 : 0) + (st.lowerFees && x.fees < L.fees ? 1 : 0) + (st.cheaper && x.price < L.price ? 1 : 0) + (st.newer && x.built > L.built ? 1 : 0) + (st.parking && x.garage === 'yes' ? 1 : 0);
  }
  function steerNote(ids, L, st) {
    if (!st || !st.any) return '';
    var ls = ids.map(T.listing), bits = [];
    [['bigger', 'larger than ' + L.size + ' sq ft', function (x) { return x.size > L.size; }], ['lowerFees', 'lower fees than $' + L.fees + '/month', function (x) { return x.fees < L.fees; }], ['cheaper', 'below ' + T.money(L.price), function (x) { return x.price < L.price; }], ['newer', 'built after ' + L.built, function (x) { return x.built > L.built; }], ['parking', 'with parking', function (x) { return x.garage === 'yes'; }]].forEach(function (k) {
      if (!st[k[0]]) return;
      var ok = ls.filter(k[2]).length;
      bits.push(ok === ls.length ? 'all ' + k[1] : ok ? ok + ' of ' + ls.length + ' ' + k[1] : 'none ' + k[1] + ', so check before sending');
    });
    return bits.length ? ' Steered by what the client disliked: ' + bits.join('; ') + '.' : '';
  }
  T.steerFrom = steerFrom;
  var TYPE_WORDS = [[/condo/, ['Condo']], [/townhouse|maison de ville/, ['Townhouse']], [/duplex/, ['Duplex']], [/triplex/, ['Triplex']], [/bungalow/, ['Bungalow']], [/semi|jumele/, ['Semi-detached']], [/house|home|maison/, ['Detached', 'Bungalow', 'Semi-detached']]];
  // Which listings a clause asks for: named ones, the one in context ("send him the sheet"), or alternatives to it
  // ("two cheaper options", "deux autres condos", "similar houses"), else the client's own criteria.
  T.listingPicks = function (text, p, c, ctxL, objections) {
    var f = T.foldKeep(text);
    // listings the client already visited are not "other options"
    var seen = S().appointments.filter(function (a) { return a.client === c.id && a.listing && a.kind === 'showing' && a.status !== 'cancelled' && (a.date + 'T' + a.start) <= T.nowISO(); }).map(function (a) { return a.listing; });
    if (p.listingIds && p.listingIds.length && !(ctxL && p.listingIds.length === 1 && p.listingIds[0] === ctxL.id && /(other|another|similar|cheaper|autres?|similaires?)/.test(f))) return { ids: p.listingIds.slice(), how: 'named in your message' };
    var cm = /\b(\d+|a couple of|couple of|a few|a handful of|a|an|one|two|three|four|five|une?|deux|trois|quatre|cinq|some|a few|quelques|des)\s+(?:more\s+|other\s+|autres\s+|similar\s+|cheaper\s+|bigger\s+|larger\s+|comparable\s+)*(condos?|houses?|homes?|listings?|options?|alternatives?|properties|property|duplex|triplex|townhouses?|bungalows?|maisons?|proprietes?|inscriptions?|semis?)\b/.exec(f);
    var n = cm ? (numW(cm[1]) || (/few|quelques|some|des/.test(cm[1]) ? 3 : 2)) : null;
    var alt = /(other|another|more|similar|comparable|cheaper|less expensive|bigger|larger|alternatives?|options?|autres?|similaires?|semblables?|comparables?|moins chers?|plus grands?)/.test(f);
    var tw = cm ? cm[2] : (/(condos?|houses?|homes?|duplex|triplex|townhouses?|bungalows?|maisons?)/.exec(f) || [])[0] || '';
    var types = (TYPE_WORDS.filter(function (x) { return x[0].test(tw); })[0] || [null, []])[1];
    var areas = p.areas || [];
    if (ctxL && !alt && !n) return { ids: [ctxL.id], how: 'the one you mentioned' };
    if (ctxL) {
      var opts = { types: types.length ? types : [ctxL.type], areas: areas, cheaper: /(cheaper|less expensive|moins chers?|moins cher)/.test(f), bigger: /(bigger|larger|plus grands?)/.test(f), exclude: [ctxL.id].concat(seen), steer: steerFrom(objections) };
      var ids = T.similarListings(ctxL, n || 2, opts).map(function (l) { return l.id; });
      var desc = [opts.cheaper ? 'cheaper' : '', opts.bigger ? 'bigger' : '', (types.length === 1 ? types[0].toLowerCase() : opts.types.length === 1 ? opts.types[0].toLowerCase() : 'same type'), areas.length ? 'in ' + areas.join(' or ') : 'in or next to ' + ctxL.area, 'within ' + (opts.cheaper ? '30' : '20') + '% of ' + T.money(ctxL.price)].filter(Boolean).join(', ');
      return ids.length ? { ids: ids, how: 'alternatives to ' + ctxL.address, note: 'Picked as ' + desc + ', leaving out the one shown' + (seen.length > 1 || (seen.length === 1 && seen[0] !== ctxL.id) ? ' and others ' + c.first + ' already visited' : '') + '.' + steerNote(ids, ctxL, opts.steer) } : { ids: [], question: 'No bundled listing is close enough to ' + ctxL.address + ' (' + desc + ').' };
    }
    var aF = T.memField(c, 'areas'), bF = T.memField(c, 'budget'), tyF = T.memField(c, 'types');
    var ars = areas.length ? areas : aF && aF.value ? String(aF.value).split(/,\s*/) : [c.area].concat(T.AREA_NEAR[c.area] || []);
    var tys = types.length ? types : tyF && tyF.value ? String(tyF.value).split(/,\s*/) : [];
    var max = p.budgetMax || p.budget || (bF && bF.value) || null;
    var picks = T.LISTINGS.filter(function (l) { return ars.indexOf(l.area) > -1 && (!tys.length || tys.indexOf(l.type) > -1) && (!max || l.price <= max) && (c.saved || []).indexOf(l.id) < 0; })
      .sort(function (a, b) { return ars.indexOf(a.area) - ars.indexOf(b.area) || a.price - b.price; }).slice(0, n || 2);
    return picks.length ? { ids: picks.map(function (l) { return l.id; }), how: 'matching ' + c.first + '’s ' + (areas.length ? 'requested area' : 'areas') + (max ? ' and budget' : '') } : { ids: [], question: 'No bundled listing matches ' + c.first + '’s criteria.' };
  };

  /* ---- one message, several requests: one plan with several parts ---- */
  // "after the open house", "après la visite": a moment taken from the client's calendar
  var RE_AFTER_EVT = /(^|[^a-z])(after|apres|right after|juste apres)\s+(the|my|our|his|her|their|this|la|le|l'|notre|ma|mon|sa|son|cette|ce)\s*(second showing|open house|showing|visit|call|meeting|presentation|listing presentation|photographer(?: visit)?|photo shoot|inspection|pricing review|deed|signing|visite libre|visite|appel|rencontre|presentation|signature|seance photo)(?=[^a-z]|$)/;
  T.afterEvent = function (c, text) {
    var m = c && RE_AFTER_EVT.exec(T.foldKeep(text).replace(/’/g, "'"));
    if (!m) return null;
    var pe = T.pickEvent(c, { text: m[4], when: null }, m[4]);
    if (!pe.target) return { question: 'I can’t place “' + m[2] + ' ' + m[3] + ' ' + m[4] + '”: ' + pe.question };
    var e = pe.target;
    return { date: e.date, time: e.end, text: m[2] + ' ' + m[3] + ' ' + m[4], note: 'after the ' + e.title.toLowerCase() + ' (' + T.fmtDT(e.date + 'T' + e.start) + ' to ' + T.fmtTime(e.end) + '), so when it ends' };
  };
  function taskPart(x, c, m) {
    var p = x.p;
    var ae = (!p.when || !p.when.timeText) && T.afterEvent(c, x.text);
    if (ae && !ae.question) p = Object.assign({}, p, { when: { date: ae.date, time: ae.time, text: ae.text, phrase: ae.text, timeText: ae.text, note: ae.note } });
    var due = p.when ? p.when.date + 'T' + p.when.time : T.addDays(T.today(), 1) + 'T' + S().settings.morning;
    var title = taskTitle(x.text, p, c, m.lang);
    if (ae && !ae.question) title = title.replace(new RegExp('\\s*(right |juste )?(after|après|apres)\\s+\\S+\\s*' + ae.text.split(' ').slice(2).join(' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
    // "…, ask the notary": a short request to a third party carries the facts said just before it
    if (T.RE_THIRD.test(T.foldKeep(x.text).replace(/’/g, "'")) && x.text.split(/\s+/).length <= 5) {
      var before = (m.clauses || []).filter(function (y) { return y.end <= x.start && y.kind === 'content' && !T.RX.imper.test(T.foldKeep(y.text).replace(/’/g, "'").replace(/^(and|then)\s+/, '')); }).pop();
      var thirdShort = true;
      if (before) { title = title.replace(/[.!?]+$/, '') + ': ' + before.text.replace(/[.!?;,]+$/, ''); var alsoCl = before.text; }
    }
    return { include: true, third: typeof thirdShort !== 'undefined' && !alsoCl, alsoClause: typeof alsoCl === 'string' ? alsoCl : null, title: title, due: due, owner: T.actor(), source: 'Your request, ' + T.fmtDate(T.today(), { noDay: true }), internal: false,
      note: p.when ? '“' + p.when.text + '” → ' + T.fmtDT(due, { long: true }) + (p.when.note ? ' (' + p.when.note + ')' : '') : 'No date given, so tomorrow at your default morning time (no time given).', clause: x.text };
  }
  function criteriaFrom(m) {
    var b = m.base || {}, mt = (b.memSets || []).filter(function (x) { return x.key === 'types'; })[0];
    return { types: mt ? mt.value.split(/,\s*/) : (b.types || []), areas: b.areas || [], max: b.budgetMax || b.budget || null };
  }
  B.multi = function (m, input) {
    var c = T.client(m.clientId), s = S(), base = m.base, card = newCard('multi', m, input);
    var objs = [].concat.apply([], (m.content || []).map(function (x) { return (x.p && x.p.objections) || []; }));
    card.clientId = c.id; card.clientWhy = m.clientWhy; card.isCall = !!m.isCall;
    card.clauses = m.clauses.map(function (x) { return { text: x.text, kind: x.kind, start: x.start, end: x.end }; });
    // an instruction with no matching action ("and order new lawn signs") is not a note: the card quotes it as not acted on
    var saidContent = (m.content || []).filter(function (x) { var f0 = T.foldKeep(x.text).replace(/’/g, "'").replace(/^(and|then|also|et|puis|but|mais)\s+/, ''); return !(T.RX.imper.test(f0) || /\?\s*$/.test(f0)); });
    // the note keeps the words that describe; instructions and your own to-dos are parts of their own, not client notes
    card.note = saidContent.length ? { include: true, text: saidContent.length === (m.content || []).length && !m.actions.some(function (y) { return T.RX.intend.test(T.foldKeep(y.text).replace(/’/g, "'")); }) ? m.text : saidContent.map(function (x) { return /[.!?;]$/.test(x.text) ? x.text : x.text + '.'; }).join(' '), call: card.isCall } : null;
    if (card.note && base && !card.isCall && base.listingId && (/(showing|showed|shown|visit|visite|toured|montre|fait visiter|saw the|walked through)/i.test(T.foldKeep(m.content.map(function (x) { return x.text; }).join(' '))) || T.RE_SHOWED.test(T.foldKeep(m.content.map(function (x) { return x.text; }).join(' ')).replace(/’/g, "'")))) {
      var shownAp = s.appointments.filter(function (a) { return a.client === c.id && a.kind === 'showing' && a.status !== 'cancelled' && a.listing === base.listingId && (a.date + 'T' + a.start) <= T.nowISO() && T.daysBetween(a.date, T.today()) <= 3; }).pop();
      card.note.showing = base.listingId; card.note.showingEv = shownAp ? shownAp.id : null;
      card.listingId = base.listingId; card.listingWhy = base.listingWhy;
    }
    card.msgs = [];
    card.diff = base ? buildDiff(c, Object.assign({}, base, { clientId: c.id })) : [];
    card.tasks = []; card.questions = [];
    if (base && base.promise) {
      var due0 = base.when ? base.when.date + 'T' + base.when.time : T.addDays(T.today(), 1) + 'T' + s.settings.morning;
      var pcl = (m.content || []).filter(function (y) { return /(^|[^a-z])(i promised|i told (?:her|him|them) i'?d|i'?ll|i will|i need to|i have to|i owe|je lui ai promis|je leur ai promis|j'ai promis|je vais lui|je dois lui|je dois)(?=[^a-z]|$)/.test(T.foldKeep(y.text).replace(/’/g, "'")); })[0];
      card.tasks.push({ clause: pcl ? pcl.text : null, include: true, title: T.promiseTitle(base.promise, c, base.when, c.lang === 'FR' || base.lang === 'FR' ? 'FR' : 'EN'), due: due0, owner: T.BROKER.name, internal: false, source: (card.isCall ? 'Call recap' : 'Your note') + ', ' + T.fmtDate(T.today(), { noDay: true }), note: base.when ? '“' + base.when.text + '” → ' + T.fmtDT(due0, { long: true }) + (base.when.note ? ' (' + base.when.note + ')' : '') : 'No date heard, so tomorrow at your default morning time.' });
    }
    m.actions.forEach(function (x) {
      var p = x.p;
      if (x.kind === 'task') {
        var fx3 = T.foldKeep(x.text).replace(/’/g, "'"), third = T.RE_THIRD.exec(fx3);
        var ROLE = { lawyer: 'Lawyer', avocat: 'Lawyer', notary: 'Notary', notaire: 'Notary', lender: 'Lender', preteur: 'Lender', bank: 'Lender', banque: 'Lender', inspector: 'Inspector', inspecteur: 'Inspector', 'mortgage broker': 'Mortgage broker', 'courtier hypothecaire': 'Mortgage broker' };
        var role = third && ROLE[third[6]], ftx2 = role && T.files.forClient(c.id).filter(function (t) { return t.stage !== 'Closed'; })[0], ct2 = ftx2 && (ftx2.contacts || []).filter(function (k) { return k.role === role && k.email; })[0];
        if (ct2) {
          // the file names this person: a message to them, built from the clause (and from the change in the same plan)
          var mg3 = T.composeMessage(Object.assign({}, x, { text: x.text.replace(new RegExp('^(.*?)\\b(the |her |his |their |our |my |le |la |l\'|son |sa |leur |notre )?' + third[6] + 's?\\b', 'i'), '$1them') }), c);
          mg3.recipient = { role: role, name: ct2.name, file: ftx2.title, txId: ftx2.id }; mg3.to = ct2.email; mg3.name = ct2.name; mg3.greet = ct2.name; mg3.include = true; mg3.locked = false; mg3.clientLang = ct2.lang || c.lang;
          mg3.clause = x.text; T.renderMsg(mg3, c); card.msgs.push(mg3); return;
        }
        var tkI = taskPart(x, c, m);
        if (T.RX.intend.test(fx3) && !/(^|[^a-z])(him|her|them|his|lui|leur|son|sa|ses)(?=[^a-z]|$)/.test(fx3) && x.carried) { tkI.internal = true; tkI.title = tkI.title.replace(/\s*\([^)]*\)$/, ''); tkI.note = 'Your own to-do: it doesn’t mention ' + c.first + ', so it isn’t linked to the record. ' + tkI.note; }
        card.tasks.push(tkI); return;
      }
      var roleW = x.kind === 'message' && /^(please\s+)?(let|tell|ask|remind|email|text|inform|avise|previens|dis a|ecris a|informe)\s+(the |les |le |la |l')?(sellers?|buyers?|owners?|vendeurs?|vendeuse|acheteurs?|acheteuse|proprietaires?)\b/.exec(T.foldKeep(x.text).replace(/’/g, "'"));
      if (roleW && !((/sell|vend|own|propri/.test(roleW[4]) && c.role === 'Seller') || (/buy|achet/.test(roleW[4]) && c.role === 'Buyer'))) {
        // "let the buyers know" on a seller's plan: they aren't the client, so it's a task for you
        var tkR = taskPart(x, c, m); tkR.title = tkR.title.replace(/[.!?]+$/, '') + (card.target ? ' (' + T.fullName(c) + '’s ' + ((S().appointments.filter(function (e) { return e.id === card.target; })[0] || {}).title || 'event').toLowerCase() + ')' : ''); tkR.note = 'The ' + roleW[4] + ' aren’t ' + c.first + ' (' + c.role.toLowerCase() + '), so this is a task for you, not a message. ' + tkR.note;
        card.tasks.push(tkR); return;
      }
      if (x.kind === 'message') { var mg0 = T.composeMessage(x, c), last = card.msgs[card.msgs.length - 1]; if (last) T.mergeMessage(last, mg0, c); else card.msgs.push(mg0); return; }
      if (x.kind === 'followup') {
        var tk = taskPart(x, c, m), fx = T.foldKeep(x.text);
        var att = /\b(?:with|avec)\s+(?:(\d+|a couple of|couple of|a few|a handful of|a|an|one|two|three|four|deux|trois|quatre|une?|some|des|quelques)\s+)?(more\s+|other\s+|autres\s+)?((?:(?:similar|comparable|cheaper|bigger|larger|smaller|newer|brighter|less expensive|more affordable|nicer|quieter)\s+){0,2})(condos?|houses?|homes?|listings?|options?|properties|propert(?:y|ies)|duplex(?:es)?|triplex(?:es)?|townhouses?|bungalows?|maisons?|proprietes?|inscriptions?)/.exec(fx);
        if (att) {
          var ctxL = T.listing(x.carriedListing || (base && base.listingId) || card.listingId || '');
          var pk = T.listingPicks(x.text.slice(att.index), Object.assign({}, p, { listingIds: [] }), c, ctxL, objs);
          var nAtt = numW(att[1]) || pk.ids.length || 2, tw = att[4], twType = (TYPE_WORDS.filter(function (q) { return q[0].test(tw); })[0] || [null, []])[1];
          var noun = twType.length === 1 ? twType[0].toLowerCase() : /house|maison/.test(tw) ? 'house' : 'listing';
          var lead = /^(please\s+)?(follow up with|follow up|get back to|check in with|check in|touch base with|circle back with|circle back|reach out to)/i.exec(T.foldKeep(x.text));
          var adj = m.lang === 'FR' ? '' : (att[3] || (att[2] && /other|more/.test(att[2]) ? att[2] : '')).replace(/\s+$/, '') + ' ';
          adj = adj.trim() ? adj : '';
          tk.title = (m.lang === 'FR' ? 'Relancer ' + c.first + ' : envoyer ' : (lead ? (lead[2].charAt(0).toUpperCase() + lead[2].slice(1)).replace(/^(Follow up|Check in|Circle back)$/, '$& with') : 'Follow up with') + ' ' + c.first + ': send ') + nAtt + ' ' + adj + noun + (nAtt === 1 ? '' : /(x|s|ch|sh)$/.test(noun) ? 'es' : 's');
          if (pk.ids.length && pk.ids.length < nAtt) card.questions.push({ kind: 'listings', clause: x.text, text: 'Only ' + pk.ids.length + ' bundled listing' + (pk.ids.length === 1 ? ' fits' : 's fit') + ' (' + (pk.note || pk.how) + '), not ' + nAtt + '. The follow-up task is still planned; add more on the card if you find them.' });
          tk.alts = pk.ids.slice();
          if (pk.ids.length && !card.rows) {
            card.rows = pk.ids.map(function (id) { return { id: id, include: true }; });
            card.how = pk.how; card.howNote = pk.note || '';
            card.email = { include: false, followup: true, locked: !T.canEmail(c), to: c.email, name: T.fullName(c), lang: c.lang, tone: 'warm', kind: 'commercial', bodyEdited: false, subject: c.lang === 'FR' ? 'Des propriétés pour vous' : 'Listings for you', body: '', clause: x.text };
            card.email.body = D.listings(card);
          }
          if (!pk.ids.length) card.questions.push({ kind: 'listings', clause: x.text, text: (pk.question || 'No bundled listing fits.') + ' The follow-up task is still planned.' });
        } else if (tk.title.indexOf(c.first) < 0) {
          tk.title = /^(check in|follow up|touch base|circle back|reach out)$/i.test(tk.title) ? tk.title + ' with ' + c.first : /^get back$/i.test(tk.title) ? 'Get back to ' + c.first : /^(relance|relancer|fais un suivi|faire un suivi)$/i.test(tk.title) ? 'Relancer ' + c.first : tk.title + ' (' + c.first + ')';
        }
        card.tasks.push(tk);
        return;
      }
      if (x.kind === 'cancel') {
        var pe = T.pickEvent(c, p, x.text, 'cancel');
        if (pe.target) { card.target = pe.target.id; card.cancel = { include: true, clause: x.text }; }
        else card.questions.push({ kind: 'cancel', clause: x.text, text: pe.question });
        return;
      }
      if (x.kind === 'schedule' || x.kind === 'reschedule') {
        if (card.appt) { card.questions.push({ kind: 'appt', clause: x.text, text: 'One appointment per plan: “' + x.text + '” was not planned. Send it on its own.' }); return; }
        var when = p.when || { date: T.addDays(T.today(), 1), time: s.settings.morning, text: '', note: 'no date heard, so tomorrow at your default morning time' };
        var rm = null;
        if (x.kind === 'reschedule') {
          var cantC = (m.content || []).filter(function (y) { return /(can'?t|cannot|won'?t (be able to )?make|isn'?t (able|available)|not available|unavailable|ne peut pas|ne pourra pas|n'est pas disponible|pas disponible|empeche)/.test(T.foldKeep(y.text).replace(/’/g, "'")) && y.p.when && y.p.when.phrase; })[0];
          if (cantC && p.move && !p.move.fromDate) p = Object.assign({}, p, { move: Object.assign({}, p.move, { fromDate: cantC.p.when.date, fromWhy: cantC.text }) });
          rm = T.resolveMove(p, c);
          if (rm.question) { card.questions.push({ kind: 'appt', clause: x.text, text: rm.question }); return; }
          card.moveTarget = rm.target.id; card.apptMode = 'reschedule';
          if (rm.caution) card.questions.push({ kind: 'appt', clause: x.text, text: rm.caution });
          if (rm.fileCheck) card.fileCheck = rm.fileCheck;
          when = { date: rm.date, time: rm.start, text: rm.how, note: rm.fromNote, timeText: 'set' };
        }
        var tg = card.moveTarget && s.appointments.filter(function (a) { return a.id === card.moveTarget; })[0];
        var lid = tg ? tg.listing : (p.listingId || x.carriedListing || null), L = lid && T.listing(lid), cr = criteriaFrom(m);
        var cands = L ? [] : T.filterListings({ areas: cr.areas, types: cr.types, max: cr.max });
        if (!L && !cr.areas.length && !cr.types.length && !cr.max) cands = (c.saved || []).slice();
        var kind = !L && /(^|[^a-z])(call|phone call|appel)\b/.test(T.foldKeep(x.text)) ? 'Call' : /meeting|rendez|rdv|presentation|review|revision/i.test(x.text) ? 'Meeting' : /second|deuxi/i.test(x.text) ? 'Second showing' : 'Showing';
        var dur = tg ? Math.max(15, T.minutesBetween(tg.date + 'T' + tg.start, tg.date + 'T' + tg.end)) : kind === 'Call' ? 20 : kind === 'Meeting' ? 30 : 45;
        var area = kind === 'Call' && !tg ? '' : L ? L.area : tg ? T.cal.areaOf(tg) : (cr.areas[0] || c.area);
        var start = rm ? rm.start : when.time;
        var r = planSlot(card, when.date, start, dur, area, card.moveTarget || card.target, rm ? null : when.cons);
        if (r.start) start = r.start;
        else if (when.cons) card.questions.push({ kind: 'appt', clause: x.text, text: 'No free slot ' + when.cons.text + ' on ' + T.fmtDate(when.date, { long: true }) + ', travel included. Pick another time on the card.' });
        var showingKind = !tg && /showing/i.test(kind);
        card.appt = { title: tg ? tg.title : kind, kind: tg ? tg.kind : kind === 'Call' ? 'call' : kind === 'Meeting' ? 'meeting' : 'showing', date: when.date, requested: start, start: r.conf.length && r.sugg.length ? r.sugg[0] : start, dur: dur,
          place: L ? L.address : tg ? tg.place : kind === 'Call' ? 'Phone' : '', listing: L ? L.id : null, area: area, whenText: when.text, note: when.note, choose: !L && showingKind, candidates: showingKind ? cands.map(function (l) { return l.id; }) : [], criteria: cr, clause: x.text, from: tg ? tg.date + 'T' + tg.start : null };
        card.invite = { include: T.canEmail(c) && (!!L || (!!tg && tg.kind !== 'call') || kind === 'Meeting'), to: c.email, locked: !T.canEmail(c), update: !!tg };
        if (L) { card.listingId = L.id; card.listingWhy = p.listingId ? p.listingWhy : 'From earlier in your message.'; }
        return;
      }
      if (x.kind === 'listings') {
        var pk2 = T.listingPicks(x.text, p, c, T.listing(x.carriedListing || ''), objs);
        var ids = pk2.ids.length ? pk2.ids : (c.saved || []).slice(0, 4);
        if (!ids.length) { card.questions.push({ kind: 'listings', clause: x.text, text: (pk2.question ? pk2.question + ' ' : '') + 'Which listings should I send? Name an address or save listings to ' + c.first + '’s record first.' }); return; }
        card.rows = ids.map(function (id) { return { id: id, include: true }; }); card.listClause = x.text;
        card.how = pk2.ids.length ? pk2.how : 'saved to ' + c.first + '’s record'; card.howNote = pk2.ids.length ? pk2.note || '' : '';
        card.email = { include: T.canEmail(c), locked: !T.canEmail(c), to: c.email, name: T.fullName(c), lang: c.lang, tone: 'warm', kind: 'commercial', bodyEdited: false, subject: c.lang === 'FR' ? 'Des propriétés pour vous' : (ids.length === 1 ? 'The listing we talked about' : 'Listings for you'), body: '', clause: x.text };
        card.email.body = D.listings(card);
      }
    });
    // "update the file": the move of a file-linked appointment updates the file, so that clause is carried out by it
    (m.content || []).forEach(function (x) { if (card.fileCheck && /^(and |then )?(please\s+)?(update|mets a jour|mettre a jour|change|fix|edit)\s+(the |her |his |their |le |la |son |sa |leur )?(file|dossier|record|fiche|transaction)\b/.test(T.foldKeep(x.text).replace(/’/g, "'"))) card.fileClause = x.text; });
    // "let her lawyer know" with a move or a cancellation in the plan: the task says what to tell them
    (card.tasks || []).forEach(function (t) {
      if (!t.third) return;
      var ca = card.appt, cxe = card.cancel && card.target && s.appointments.filter(function (e) { return e.id === card.target; })[0];
      if (ca && card.apptMode === 'reschedule') t.title += ': ' + ca.title.replace(/:.*$/, '').toLowerCase() + ' moved to ' + T.fmtDT(ca.date + 'T' + ca.start);
      else if (ca) t.title += ': ' + ca.title.toLowerCase() + ' booked for ' + T.fmtDT(ca.date + 'T' + ca.start);
      else if (cxe) t.title += ': ' + cxe.title.toLowerCase() + ' on ' + T.fmtDT(cxe.date + 'T' + cxe.start) + ' cancelled';
    });
    T.fillNewTime(card);
    card.msgs.forEach(function (mg) { if (mg.empty) { mg.include = false; card.questions.push({ kind: 'message', clause: mg.clause, text: 'What should the message to ' + c.first + ' say? I left it out; write it on the card to include it.' }); } });
    var parts = [];
    if (card.note) parts.push(card.isCall ? 'log the call' : 'save your note');
    if (card.diff.length) parts.push(card.diff.length + ' memory change' + (card.diff.length === 1 ? '' : 's'));
    if (card.target) { var ce = s.appointments.filter(function (a) { return a.id === card.target; })[0]; parts.push('cancel the ' + ce.title.toLowerCase() + ' on ' + T.fmtDT(ce.date + 'T' + ce.start)); }
    if (card.appt) parts.push((card.apptMode === 'reschedule' ? 'move the ' + card.appt.title.replace(/:.*$/, '').toLowerCase() + ' to ' : 'a ' + card.appt.title.toLowerCase() + ' on ') + T.fmtDT(card.appt.date + 'T' + card.appt.start) + (card.appt.listing ? ' at ' + T.listing(card.appt.listing).address : card.appt.choose ? ' (listing to choose)' : ''));
    card.tasks.forEach(function (t) { parts.push('a task due ' + T.fmtDT(t.due)); });
    if (card.rows) parts.push((card.email.followup ? 'a draft' : 'an email') + ' with ' + (card.rows.length === 1 ? 'the listing' : card.rows.length + ' listings') + (c.lang === 'FR' ? ' in French' : '') + (card.email.followup ? ' for the follow-up, not sent' : ''));
    card.msgs.forEach(function (mg) { parts.push('a message to ' + c.first + (mg.lang === 'FR' ? ' in French' : '') + (mg.mixed ? ' (part of it in your words: check the language)' : '')); });
    var only = m.clauses.length === 1 ? m.clauses[0].kind : null;
    card.title = only === 'message' ? 'Message to ' + T.shortName(c) : only === 'followup' ? 'Follow up with ' + T.shortName(c) : (card.isCall ? 'Follow through after the call with ' : card.note && card.note.showing ? 'Follow through after ' + T.shortName(c) + '’s showing' : 'Plan for ') + (card.note && card.note.showing && !card.isCall ? '' : T.shortName(c));
    card.fingerprint = T.fingerprint(card);
    var q = card.questions;
    if (card.note && card.note.showing) parts[0] = card.note.showingEv ? 'log the showing (linked to your calendar)' : 'log the showing at ' + T.listing(card.note.showing).address + ' (not on your calendar, so as a completed showing)';
    var reply = (m.clauses.length === 1 ? 'For ' + T.fullName(c) + ': ' : 'I read ' + m.clauses.length + ' parts for ' + T.fullName(c) + ': ') + (parts.length ? joinList(parts, 'EN') : 'nothing I can do yet') + '.' + (card.fileCheck ? ' ' + card.fileCheck.text : '') + (card.appt && card.conflicts && card.conflicts.length ? ' ' + card.conflicts[0].text + (card.suggestions.length ? ' I picked ' + T.fmtTime(card.appt.start) + ' instead; change it on the card.' : '') : '') + (q.length ? ' ' + (q.length === 1 ? 'One part needs' : q.length + ' parts need') + ' you: ' + q.map(function (x) { return x.text; }).join(' ') : '') + ' Nothing has happened yet.';
    return { card: card, reply: reply, say: 'One plan with ' + numWord(parts.length).toLowerCase() + ' parts for ' + c.first + '. Nothing has happened yet.' };
  };

  B.brief = function (p) {
    var c = p.clientId ? T.client(p.clientId) : null;
    if (!c) {
      var next = S().appointments.filter(function (a) { return a.date === T.today() && (a.date + 'T' + a.start) >= T.nowISO() && a.client; })[0];
      if (next) c = T.client(next.client);
    }
    if (!c) return { brief: null, reply: 'Nothing else on your calendar today.', say: 'Nothing else on your calendar today.' };
    return T.briefFor(c.id);
  };
  T.briefFor = function (id) {
    var c = T.client(id), s = S(), lines = [];
    var ap = T.cal.active().filter(function (a) { return a.client === id && (a.date + 'T' + a.start) >= T.nowISO(); })[0];
    lines.push(T.fullName(c) + ', ' + c.role.toLowerCase() + ', ' + c.area + ' (' + (c.stage || 'Active').toLowerCase() + '). Prefers ' + (c.lang === 'FR' ? 'French' : 'English') + '.' + (ap ? ' Next: ' + ap.title.toLowerCase() + ', ' + T.fmtDate(ap.date) + ' at ' + T.fmtTime(ap.start) + '.' : ''));
    T.files.forClient(id).forEach(function (tx) {
      if (tx.stage === 'Closed') { lines.push(tx.title + ': closed.'); return; }
      var chk = T.files.check(tx);
      chk.issues.forEach(function (x) {
        if (x.type === 'conflict') lines.push(tx.title + ': ' + x.label.toLowerCase() + ' is unresolved, ' + x.values.map(function (v) { return T.fmtDate(v.value, { noDay: true }) + ' in ' + v.source.split(',')[0].toLowerCase(); }).join(' vs ') + '.');
        else lines.push(tx.title + ': ' + x.label);
      });
      var nxt = chk.open.filter(function (o) { return o.date; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
      if (nxt) lines.push('Next on the file: ' + nxt.item.toLowerCase() + ', ' + T.fmtDate(nxt.date, { long: true }) + '.');
    });
    c.memory.filter(function (m) { return m.value != null && m.key.indexOf('deadline-') !== 0; }).slice(0, 3).forEach(function (m) { lines.push(m.label + ': ' + m.display + '.'); });
    var open = s.tasks.filter(function (t) { return t.client === id && t.status === 'open'; });
    if (open.length) lines.push('Open: ' + open.map(function (t) { return t.title + (T.isOverdue(t) ? ' (overdue)' : ''); }).join('; ') + '.');
    if (!T.canEmail(c)) lines.push('Email: ' + T.CONSENT_LABEL[T.consentOf(c)].toLowerCase() + ', so no commercial email.');
    return { brief: { clientId: id, lines: lines }, reply: null, say: lines.join(' ') };
  };

  /* ======================= fingerprint & edits ======================= */
  T.fingerprint = function (card) {
    var p = { t: card.type, c: card.clientId || null };
    if (card.diff) p.d = card.diff.map(function (d) { return [d.key, d.include, d.to, d.add]; });
    if (card.task) p.k = [card.task.include, card.task.title, card.task.due, card.task.owner];
    if (card.email) p.e = [card.email.include, card.email.to, card.email.subject, card.email.body];
    if (card.rows) p.r = card.rows.map(function (r) { return [r.clientId || r.id, r.include, r.review, r.subject, r.body]; });
    if (card.appt) p.a = [card.appt.date, card.appt.start, card.invite && card.invite.include];
    if (card.alts) p.x = card.alts.attach;
    if (card.target) p.g = card.target;
    if (card.tasks) p.ts = card.tasks.map(function (t) { return [t.include, t.title, t.due, t.owner]; });
    if (card.note) p.n = card.note.include;
    if (card.cancel) p.cx = card.cancel.include;
    if (card.appt) p.al = [card.appt.listing, card.moveTarget || null];
    if (card.msgs && card.msgs.length) p.m = card.msgs.map(function (x) { return [x.include, x.to, x.subject, x.body]; });
    return T.hash(JSON.stringify(p));
  };

  function setPath(obj, path, val) {
    var ks = path.split('.'), o = obj;
    for (var i = 0; i < ks.length - 1; i++) o = o[isNaN(ks[i]) ? ks[i] : +ks[i]];
    o[ks[ks.length - 1]] = val;
  }
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[isNaN(k) ? k : +k]; }, obj);
  }
  var UI_ONLY = /\.open$/;
  T.editCard = function (cardId, path, value, meta) {
    var s = S(), card = s.cards[cardId];
    if (!card || ((card.status !== 'ready' && card.status !== 'awaiting') && !UI_ONLY.test(path))) return;
    var before = getPath(card, path);
    if (before === value) return;
    setPath(card, path, value);
    if (UI_ONLY.test(path)) { card.rev++; T.store.save(); return; }
    if (card.status === 'awaiting') { card.status = 'ready'; card.requestedBy = null; }
    // dependent updates
    if (card.type === 'showing') {
      if (/^email\.body$/.test(path)) { card.email.bodyEdited = true; card.email.draftBy = meta && meta.provenance ? meta.provenance : { kind: 'you' }; }
      if (/^email\.tone$/.test(path)) { card.email.bodyEdited = false; card.email.draftBy = null; }
      if (/^(diff|task)/.test(path) && card.alts && /^diff/.test(path)) {
        var attach = card.alts.attach;
        card.alts = searchAlternatives(T.client(card.clientId), card.diff, card.listingId);
        card.alts.attach = attach && card.alts.matches.length > 0;
      }
      if (!card.email.bodyEdited) card.email.body = D.showing(card);
      else if (/^(diff|task)/.test(path)) card.email.stale = true;
    }
    if (card.type === 'listings') {
      if (/^email\.body$/.test(path)) { card.email.bodyEdited = true; card.email.draftBy = meta && meta.provenance ? meta.provenance : { kind: 'you' }; }
      if (/^email\.tone$/.test(path)) { card.email.bodyEdited = false; card.email.draftBy = null; }
      if (!card.email.bodyEdited) card.email.body = D.listings(card);
    }
    if (card.type === 'multi') {
      if (path === 'appt.listing') {
        var L2 = value && T.listing(value), c2 = T.client(card.clientId);
        card.appt.listing = L2 ? L2.id : null; card.appt.place = L2 ? L2.address : ''; if (L2) card.appt.area = L2.area;
        card.listingId = L2 ? L2.id : null; card.listingWhy = L2 ? 'You picked the listing on the card.' : '';
        if (!card.invite.locked) card.invite.include = T.canEmail(c2) && !!L2;
        planSlot(card, card.appt.date, card.appt.requested, card.appt.dur, card.appt.area, card.moveTarget || card.target);
      }
      var mm2 = path.match(/^msgs\.(\d+)\.body$/); if (mm2) { card.msgs[+mm2[1]].bodyEdited = true; card.msgs[+mm2[1]].draftBy = meta && meta.provenance ? meta.provenance : { kind: 'you' }; }
      if (card.email && /^email\.body$/.test(path)) { card.email.bodyEdited = true; card.email.draftBy = meta && meta.provenance ? meta.provenance : { kind: 'you' }; }
      if (card.email && /^email\.tone$/.test(path)) { card.email.bodyEdited = false; card.email.draftBy = null; }
      if (card.email && card.rows && !card.email.bodyEdited) card.email.body = D.listings(card);
      if (/^appt\./.test(path)) T.fillNewTime(card);
    }
    if (card.type === 'cancel' && /^email\.body$/.test(path)) { card.email.bodyEdited = true; card.email.draftBy = meta && meta.provenance ? meta.provenance : { kind: 'you' }; }
    if (card.type === 'recovery') {
      var m = path.match(/^rows\.(\d+)\.body$/);
      if (m) { card.rows[+m[1]].bodyEdited = true; card.rows[+m[1]].draftBy = meta && meta.provenance ? meta.provenance : { kind: 'you' }; }
      if (path === 'tone') card.rows.forEach(function (r) { if (r.bucket === 'eligible' && !r.bodyEdited) r.body = D.recovery(T.client(r.clientId), value, r.signal); });
      var mi = path.match(/^rows\.(\d+)\.reason$/);
      if (mi) card.rows[+mi[1]].include = !value;
    }
    card.version++;
    card.history.push({ v: card.version, at: T.nowISO(), what: describeEdit(card, path, value) });
    card.fingerprint = T.fingerprint(card);
    card.rev++;
    T.store.commit();
  };
  function describeEdit(card, path, value) {
    var m;
    if ((m = path.match(/^diff\.(\d+)\.(include|to)$/))) { var d = card.diff[+m[1]]; return (m[2] === 'include' ? (value ? 'Included ' : 'Excluded ') : 'Changed ') + d.label.toLowerCase(); }
    if (/^task\./.test(path)) return 'Changed the task ' + path.split('.')[1];
    if ((m = path.match(/^tasks\.(\d+)\.(\w+)$/))) return (m[2] === 'include' ? (value ? 'Included' : 'Excluded') + ' the task “' + card.tasks[+m[1]].title + '”' : 'Changed the task ' + m[2]);
    if (path === 'note.include') return value ? 'Included the call note' : 'Excluded the call note';
    if (path === 'cancel.include') return value ? 'Included the cancellation' : 'Excluded the cancellation';
    if (path === 'appt.listing') return value ? 'Picked ' + T.listing(value).address : 'Kept the listing to choose';
    if (/^email\.include/.test(path)) return value ? 'Included the email' : 'Excluded the email';
    if (/^email\./.test(path)) return 'Edited the email ' + path.split('.')[1];
    if ((m = path.match(/^rows\.(\d+)\.(\w+)$/))) { var r = card.rows[+m[1]]; var nm = r.clientId ? T.fullName(T.client(r.clientId)) : T.listing(r.id).address; return (m[2] === 'reason' ? (value ? 'Excluded ' : 'Re-included ') : m[2] === 'include' ? (value ? 'Included ' : 'Excluded ') : 'Edited the draft for ') + nm; }
    if (path === 'tone') return 'Changed the tone to ' + value;
    if (/^appt\./.test(path)) return 'Changed the time';
    if (/^invite/.test(path)) return value ? 'Included the invitation' : 'Excluded the invitation';
    if (/^alts/.test(path)) return 'Changed the alternatives';
    return 'Edited ' + path;
  }

  /* ======================= every clause is accounted for ======================= */
  // A clause ends as a plan part, a question on the card, or a visible "Not acted on" line quoting it. Nothing is
  // dropped silently: no rule set covers every sentence, so the card says what it did not do.
  var RE_IMPERATIVE = { test: function (f) { return T.RX.imper.test(f); } };
  var RE_ASKS = /\?\s*$|^(what|who|when|where|why|how|which|is there|are there|can you tell|qu'est-ce|qui|quand|pourquoi|comment|quel|quelle|est-ce)(?=[^a-z]|$)/;
  function clauseSignals(text) {
    var f = T.foldKeep(text).replace(/’/g, "'").replace(/^(and|then|also|et|puis|ensuite|but|mais)\s+/, ''), R = T.RX, out = [];
    var p = null, P = function () { return p || (p = T.parse(text, { noContext: true })); };
    // "I'll send her two options tomorrow" is a promise: a task for you, whatever it mentions
    if (/^(i'?ll|i will|i need to|i have to|i promised|je vais|je dois|j'ai promis|je lui ai promis)(?=[^a-z])/.test(f)) return { kinds: ['task'], f: f };
    if (R.third.test(f)) out.push('task');
    else if (R.msg.test(f) && !R.sendl.test(f)) out.push('message');
    if (R.cancel.test(f)) out.push('cancel');
    if (R.resched.test(f) && !/move (in|out)/.test(f)) out.push('move');
    if (/(^|[^a-z])(book|schedule|set up|reserve|planifie|prevois|cedule)(?=[^a-z])/.test(f) || (R.visit.test(f) && (P().when || P().listingId))) out.push('appt');
    if (R.task.test(f) || R.follow.test(f) || R.lets.test(f) || /^(please\s+)?(call|phone|appelle|rappelle)\s/.test(f)) out.push('task');
    if (R.sendl.test(f)) out.push('listings');
    // "j'ai fait visiter…", "showed … to …": a showing happened, so a recap or a note must keep it
    if (R.showed.test(f) && P().listingId) out.push('note');
    return { kinds: out, f: f };
  }
  function coverOf(card) {
    var cv = {}, add = function (k) { cv[k] = true; };
    if (card.type === 'multi') {
      if (card.note) add('note');
      if (card.appt) add(card.apptMode === 'reschedule' ? 'move' : 'appt');
      if (card.cancel) add('cancel');
      if ((card.msgs || []).length) add('message');
      if ((card.tasks || []).length) add('task');
      if (card.rows) add('listings');
      (card.questions || []).forEach(function (q) { add(q.kind === 'appt' ? 'appt' : q.kind); if (q.kind === 'appt') add('move'); });
    } else if (card.type === 'showing') { add('note'); if (card.task) add('task'); if (card.email) add('message'); if (card.alts && card.alts.attach) add('listings'); }
    else if (card.type === 'note') add('note');
    else if (card.type === 'schedule') { if (card.mode === 'task') { add('task'); if (/^call/i.test(card.task.title)) add('appt'); } else if (card.mode === 'reschedule') add('move'); else { add('appt'); if (card.appt && card.appt.kind === 'call') add('task'); } }
    else if (card.type === 'cancel') { add('cancel'); add('message'); }
    else if (card.type === 'listings') { add('listings'); add('message'); }
    else ['note', 'appt', 'move', 'cancel', 'message', 'task', 'listings'].forEach(add); // clarify, recovery, file: the whole request is one question or one review
    return cv;
  }
  // Does this clause, on its own, give the Memory Diff something (a like, a concern, a budget, a preference)?
  function feedsMemory(text) {
    var q = T.parse(text, { noContext: true });
    return !!(q.positive.length || q.objections.length || q.budget != null || q.fees != null || Object.keys(q.features || {}).length || (q.memSets || []).length);
  }
  function actionable(sg) { return sg.kinds.some(function (k) { return k !== 'note'; }) || RE_IMPERATIVE.test(sg.f) || RE_ASKS.test(sg.f) || T.RX.intend.test(sg.f); }
  // For each clause, the part that was built from its own words: a plan part, a question, the Memory Diff or the note
  // (only for plain description), or "not acted on". A clause that asks for something is never covered by the note.
  T.clauseLedger = function (out, text) {
    if (out && out.cards) {
      // one plan per client: each card accounts for its own clauses, read back in the order they were said
      var all = [];
      out.cards.forEach(function (cd) { T.clauseLedger({ card: cd }, '').forEach(function (e, i) { e.start = cd.clauses[i] ? cd.clauses[i].start : 0; e.client = cd.clientId; all.push(e); }); });
      return all.sort(function (a, b) { return a.start - b.start; });
    }
    var card = out && out.card, clauses = card && card.type === 'multi' ? card.clauses.map(function (x) { return { text: x.text, kind: x.kind }; }) : T.segment(text);
    if (!clauses.length) clauses = [{ text: String(text || '').trim() }];
    if (!card) return clauses.map(function (x) { return { clause: x.text, by: out && out.help ? 'question' : out && (out.results || out.brief || out.cma) ? 'answer' : null }; });
    var un = (card.unhandled || []).map(function (u) { return u.clause; });
    var diffOn = (card.diff || []).some(function (d) { return d.include !== false; }) || (card.type === 'note' && (card.diff || []).length);
    function described(x, sg) {
      if (sg.kinds.indexOf('note') > -1) return (card.note && card.note.showing) || card.type === 'showing' ? 'recap' : null;
      var fx = T.foldKeep(x.text);
      if ((card.diff || []).some(function (d) { return (d.quote && fx.indexOf(T.foldKeep(d.quote)) > -1) || (d.add && fx.indexOf(T.foldKeep(String(d.add))) > -1); }) || (feedsMemory(x.text) && (card.diff || []).length)) return 'memory';
      return (card.type === 'multi' ? card.note : card.type === 'note' || card.type === 'showing') ? 'note' : null;
    }
    if (card.type === 'multi') {
      var used = [], put = function (cl, by) { if (cl) String(cl).split(' / ').forEach(function (k) { used.push([k, by]); }); };
      if (card.appt) put(card.appt.clause, card.apptMode === 'reschedule' ? 'move' : 'appt');
      if (card.fileClause) put(card.fileClause, 'move (file updated)');
      if (card.cancel) put(card.cancel.clause, 'cancel');
      (card.tasks || []).forEach(function (t) { put(t.clause, 'task'); put(t.alsoClause, 'task'); });
      (card.msgs || []).forEach(function (mg) { put(mg.clause, mg.recipient ? 'message to the ' + mg.recipient.role.toLowerCase() : 'message'); });
      put(card.listClause, 'listings');
      if (card.email) put(card.email.clause, 'listings');
      (card.questions || []).forEach(function (q) { put(q.clause, 'question'); });
      return clauses.map(function (x) {
        if (un.indexOf(x.text) > -1) return { clause: x.text, by: 'not acted on' };
        var hit = used.filter(function (u) { return u[0] === x.text; })[0];
        if (hit) return { clause: x.text, by: hit[1] };
        var sg = clauseSignals(x.text);
        return { clause: x.text, by: x.kind === 'content' && !actionable(sg) ? described(x, sg) : null };
      });
    }
    var cv = coverOf(card), whole = ['recovery', 'file', 'clarify'].indexOf(card.type) > -1;
    var PART = { schedule: card.mode === 'task' ? 'task' : card.mode === 'reschedule' ? 'move' : 'appt', cancel: 'cancel', listings: 'listings' };
    return clauses.map(function (x) {
      if (un.indexOf(x.text) > -1) return { clause: x.text, by: 'not acted on' };
      if (whole) return { clause: x.text, by: card.type };
      var sg = clauseSignals(x.text), acts = sg.kinds.filter(function (k) { return k !== 'note'; });
      if (acts.length) return { clause: x.text, by: acts.every(function (k) { return cv[k] && !(card.type === 'showing' && k === 'message'); }) ? acts.join(' + ') : null };
      if (actionable(sg)) return { clause: x.text, by: null };
      if (clauses.length === 1 && PART[card.type]) return { clause: x.text, by: PART[card.type] };
      return { clause: x.text, by: described(x, sg) || (PART[card.type] && clauses.length === 1 ? PART[card.type] : null) };
    });
  };
  // Every clause the ledger can't attribute to a part becomes a quoted "Not acted on" line on the card
  T.accountClauses = function (out, text) {
    var card = out && out.card;
    if (!card || card.type === 'clarify') return out;
    card.unhandled = [];
    var miss = T.clauseLedger(out, text).filter(function (x) { return !x.by; }).map(function (x) { return x.clause; });
    card.unhandled = miss.map(function (t) { return { clause: t }; });
    if (miss.length) out.reply = (out.reply || '') + ' ' + (miss.length === 1 ? 'One part of your message wasn’t turned into an action' : miss.length + ' parts of your message weren’t turned into actions') + '; the card quotes ' + (miss.length === 1 ? 'it' : 'them') + '.';
    return out;
  };

  /* ======================= policy: who may approve what ======================= */
  // A coordinator prepares; sends, invitations and material memory changes need the broker (TY-21).
  T.needsBroker = function (card) {
    if (card.type === 'recovery') return card.rows.some(function (r) { return r.include; });
    if (card.email && card.email.include) return true;
    if (card.invite && card.invite.include) return true;
    if (card.diff && card.diff.some(function (d) { return d.include; })) return true;
    if (card.type === 'cancel' || (card.cancel && card.cancel.include && card.target)) return true;
    if (card.msgs && card.msgs.some(function (x) { return x.include; })) return true;
    return false;
  };

  /* ======================= execution ======================= */
  function step(key, label, detail) { return { key: key, label: label, detail: detail || '', status: 'pending' }; }
  function buildSteps(card) {
    var steps = [], c = card.clientId && T.client(card.clientId);
    if (card.type === 'showing') {
      var L = card.listingId && T.listing(card.listingId);
      steps.push(step('link', 'Attach the note to ' + T.fullName(c) + (L ? ' and the showing' : '')));
      steps.push(step('consent', 'Recheck permissions and email consent'));
      if (card.diff.some(function (d) { return d.include; })) steps.push(step('memory', 'Update ' + c.first + '’s memory'));
      if (card.task && card.task.include) steps.push(step('task', 'Create the task: ' + card.task.title));
      if (card.email && card.email.include) steps.push(step('email', 'Send the follow-up email to ' + c.first));
    } else if (card.type === 'note') {
      steps.push(step('memory', 'Update ' + c.first + '’s memory'));
    } else if (card.type === 'recovery') {
      var inc = card.rows.filter(function (r) { return r.include && r.bucket === 'eligible'; });
      steps.push(step('consent', 'Recheck consent for ' + inc.length + ' recipient' + (inc.length === 1 ? '' : 's') + ' at send time'));
      inc.forEach(function (r) { var rc = T.client(r.clientId); steps.push(step('send:' + r.clientId, 'Email to ' + T.fullName(rc))); });
      var rv = card.rows.filter(function (r) { return r.bucket === 'review' && r.review === 'task'; });
      if (rv.length) steps.push(step('review', 'Create ' + rv.length + ' consent-review task' + (rv.length === 1 ? '' : 's')));
      steps.push(step('exclusions', 'Record exclusions and opt-outs'));
    } else if (card.type === 'schedule') {
      if (card.mode === 'task') steps.push(step('task', 'Create the task: ' + card.task.title));
      else if (card.mode === 'reschedule') {
        steps.push(step('calendar', 'Recheck your calendar for ' + T.fmtDate(card.appt.date)));
        steps.push(step('move', 'Move the ' + card.appt.title.toLowerCase() + ' to ' + T.fmtDT(card.appt.date + 'T' + card.appt.start)));
        if (card.invite.include) steps.push(step('invite', 'Send ' + c.first + ' the updated invitation'));
      } else {
        steps.push(step('calendar', 'Recheck your calendar for ' + T.fmtDate(card.appt.date)));
        steps.push(step('appt', 'Add the ' + card.appt.title.toLowerCase() + ' to your calendar'));
        if (card.invite.include) steps.push(step('invite', 'Send a calendar invitation to ' + c.first));
      }
    } else if (card.type === 'cancel') {
      steps.push(step('cancel-evt', 'Cancel the event in your calendar'));
      if (card.email.include) steps.push(step('email', 'Send ' + c.first + ' the cancellation note'));
    } else if (card.type === 'multi') {
      if (card.note && card.note.include) steps.push(step('note-log', (card.isCall ? 'Log the call' : 'Save your note') + ' on ' + T.fullName(c) + '’s record'));
      if ((card.email && card.email.include) || (card.invite && card.invite.include)) steps.push(step('consent', 'Recheck permissions and email consent'));
      if (card.diff.some(function (d) { return d.include; })) steps.push(step('memory', 'Update ' + c.first + '’s memory'));
      if (card.target && card.cancel && card.cancel.include) steps.push(step('cancel-evt', 'Cancel the event in your calendar'));
      if (card.appt) {
        steps.push(step('calendar', 'Recheck your calendar for ' + T.fmtDate(card.appt.date)));
        if (card.apptMode === 'reschedule') steps.push(step('move', 'Move the ' + card.appt.title.toLowerCase() + ' to ' + T.fmtDT(card.appt.date + 'T' + card.appt.start)));
        else steps.push(step('appt', 'Add the ' + card.appt.title.toLowerCase() + ' to your calendar' + (card.appt.listing ? '' : ' (listing to choose)')));
        if (card.invite.include) steps.push(step('invite', 'Send ' + c.first + ' ' + (card.invite.update ? 'the updated invitation' : 'a calendar invitation')));
      }
      card.tasks.forEach(function (t, i) { if (t.include) steps.push(step('task:' + i, 'Create the task: ' + t.title)); });
      (card.msgs || []).forEach(function (mg, i) { if (mg.include) steps.push(step('msg:' + i, 'Send ' + (mg.recipient ? mg.recipient.name : c.first) + ' the message' + (mg.sms ? ' (as an email: SMS isn’t configured)' : ''))); });
      if ((card.msgs || []).some(function (mg) { return mg.include; }) && !steps.some(function (x) { return x.key === 'consent'; })) steps.splice(card.note && card.note.include ? 1 : 0, 0, step('consent', 'Recheck permissions and email consent'));
      if (card.rows && card.rows.some(function (r) { return r.include; })) {
        steps.push(step('save-listings', 'Save the listing' + (card.rows.length === 1 ? '' : 's') + ' to ' + c.first + '’s record'));
        if (card.email.include) steps.push(step('email', 'Send ' + c.first + ' the listings email'));
      }
    } else if (card.type === 'listings') {
      steps.push(step('consent', 'Recheck permissions and email consent'));
      steps.push(step('save-listings', 'Save the listings to ' + c.first + '’s record'));
      if (card.email.include) steps.push(step('email', 'Send ' + c.first + ' the listings email'));
    }
    return steps;
  }

  var running = {};
  function startRun(card) {
    var s = S();
    T.tick(2);
    card.status = 'running'; card.shadow = s.settings.mode === 'shadow';
    card.approvedAt = T.nowISO(); card.approvedVersion = card.version; card.approvedFp = card.fingerprint; card.approver = T.actor();
    card.steps = buildSteps(card); card.cursor = 0; card.rev++;
    s.counters.approved++; if (card.version > 1) s.counters.edited++;
    card.undo = { memory: [], tasks: [], appts: [], moved: [], notes: [], cancelled: [] };
  }
  // Returns 'requested' when a coordinator hands the plan to the broker, 'stale' when it needs a refresh.
  T.approve = function (cardId) {
    var s = S(), card = s.cards[cardId];
    if (!card || running[cardId] || (card.status !== 'ready' && card.status !== 'awaiting')) return Promise.resolve(); // duplicate-click protection
    if (card.stale) return Promise.resolve('stale');
    if (s.role === 'coordinator' && T.needsBroker(card)) {
      if (card.status === 'awaiting') return Promise.resolve('requested');
      card.status = 'awaiting'; card.requestedBy = T.BROKER.coordinator; card.requestedAt = T.nowISO(); card.rev++;
      T.notify('approval', 'Approval requested: ' + card.title, T.BROKER.coordinator + ' prepared plan v' + card.version + '. It includes a send or a memory change, so it needs the broker.', { type: 'card', id: card.id });
      T.store.commit();
      return Promise.resolve('requested');
    }
    startRun(card);
    T.store.commit();
    return T.resume(cardId);
  };
  // Synchronous run, used by Test lab presets
  T.approveNow = function (cardId) {
    var card = S().cards[cardId];
    if (!card || (card.status !== 'ready' && card.status !== 'awaiting') || card.stale) return null;
    startRun(card);
    card.steps.forEach(function (st) { applyStep(card, st); });
    card.cursor = card.steps.length;
    finish(card, true);
    return card;
  };
  T.resume = function (cardId) {
    var s = S(), card = s.cards[cardId];
    if (!card || card.status !== 'running' || running[cardId]) return Promise.resolve();
    running[cardId] = true;
    var i = card.cursor || 0;
    function next() {
      if (i >= card.steps.length) return finish(card).then(function () { delete running[cardId]; });
      var st = card.steps[i];
      st.status = 'running'; card.rev++; T.store.commit();
      return T.wait(T.reduced() ? 60 : 420).then(function () {
        if (S().cards[cardId] !== card) { delete running[cardId]; return null; } // workspace was reset or imported
        applyStep(card, st);
        i++; card.cursor = i; card.rev++; T.store.commit();
        return next();
      });
    }
    return next();
  };
  T.refreshCard = function (cardId) {
    var s = S(), card = s.cards[cardId];
    if (!card || !card.stale || !card.pending) return null;
    card.status = 'cancelled'; card.replaced = true; card.rev++;
    T.log('Plan refreshed: ' + card.title, 'draft');
    var p = T.parse(card.pending.text);
    if (card.clientId && !p.clientId) { p.clientId = card.clientId; p.ambiguous = null; }
    var cp = card.type === 'multi' ? T.parseCompound(card.pending.text, { clientId: card.clientId }) : null;
    var out = card.type === 'recovery' ? T.build.recovery(p, card.pending.input, card.criteria) : cp && cp.clientId ? T.build.multi(cp, card.pending.input) : T.app.buildFor(p, card.pending.input);
    if (out && out.card) {
      out.card.pending = card.pending;
      s.cards[out.card.id] = out.card;
      T.addMessage({ role: 'tayoo', kind: 'text', text: 'Refreshed with today’s records. ' + (out.reply || '') });
      T.addMessage({ role: 'tayoo', kind: 'card', cardId: out.card.id });
    } else T.addMessage({ role: 'tayoo', kind: 'text', text: (out && (out.reply || (out.help && out.help.text))) || 'Nothing to plan any more.' });
    T.store.commit();
    return out;
  };

  function memSet(c, d, undo, approver) {
    var f = T.memField(c, d.key), now = T.today(), prev = f ? JSON.parse(JSON.stringify(f)) : null;
    undo.memory.push({ client: c.id, key: d.key, prev: prev });
    var label = d.label, display, value;
    if (d.kind === 'money') { value = d.to; display = T.money(d.to); }
    else if (d.kind === 'fees') { value = d.to; display = 'Under ' + T.money(d.to) + '/month'; }
    else if (d.kind === 'strength') { value = d.to; display = strengthLabel(d.to); }
    else if (d.kind === 'set') { value = d.to; display = d.to; }
    else { value = (f && f.value ? f.value + '; ' : '') + d.add; display = value; }
    var src = 'Your note, approved';
    if (!f) { f = { key: d.key, label: label }; c.memory.push(f); }
    f.value = value; f.display = display; f.prov = 'agent'; f.source = src; f.date = now;
    if (d.voice === 'quote') f.quote = true;
    c.history.unshift({ date: now, at: T.nowISO(), field: label, from: prev ? prev.display : 'Not on file', to: display, by: (approver || T.BROKER.name) + ' (approved card)', source: 'Plan v' + (d._v || '') });
  }
  function emailStatus() { return S().caps.offline ? 'queued' : 'simulated'; }
  function emailDetail(st) { return st === 'queued' ? 'Offline: queued in the outbox and simulated once you reconnect. Not sent.' : 'Not sent. In production this would go from ' + T.BROKER.email + ' through your connected mailbox, and the receipt would wait for the provider’s confirmation.'; }

  function applyStep(card, st) {
    var s = S(), c = card.clientId && T.client(card.clientId), shadow = card.shadow, key = st.key;
    if (shadow) {
      st.status = 'shadow';
      st.detail = 'Would have run. Shadow Mode is on, so nothing changed.';
      return;
    }
    if (key === 'link') {
      var ap = s.appointments.filter(function (a) { return a.client === c.id && a.kind === 'showing' && !a.recapped && a.status !== 'cancelled' && (a.date + 'T' + a.start) <= T.nowISO() && (!card.listingId || !a.listing || a.listing === card.listingId); }).pop();
      if (ap && !card.isCall) { ap.recapped = true; card.undo.appts.push(ap.id); }
      else if (!ap && !card.isCall && card.listingId && T.listing(card.listingId) && !T.listing(card.listingId).subject) {
        var nowT = T.nowISO().slice(11, 16), Lk = T.listing(card.listingId), lid2 = 'a-' + card.id + '-shown';
        ap = { id: lid2, status: 'scheduled', date: T.today(), start: T.addMin(nowT, -45), end: nowT, title: 'Showing', client: c.id, place: Lk.address, listing: Lk.id, area: Lk.area, kind: 'showing', recapped: true, fromCard: card.id, logged: true };
        s.appointments.push(ap); s.appointments.sort(function (a, b) { return (a.date + a.start) < (b.date + b.start) ? -1 : 1; });
        card.undo.appts.push(lid2); card.loggedShowing = true;
      }
      c.timeline.unshift({ date: T.today(), text: (card.isCall ? 'Call recap' : 'Showing recap') + ' saved (' + (card.source && card.source.input === 'voice' ? 'voice note' : 'typed') + ')', kind: card.isCall ? 'call' : 'note' });
      c.lastContact = T.today();
      (c.inbound || []).forEach(function (x) { x.answered = true; });
      s.counters.recaps++;
      st.status = 'done'; st.detail = 'Linked to ' + T.fullName(c) + (ap && !card.isCall ? (card.loggedShowing ? '. The showing wasn’t on your calendar, so it’s logged as completed today at ' + ap.place : ' and the ' + T.fmtDate(ap.date) + ' ' + T.fmtTime(ap.start) + ' showing') : '') + '.';
    } else if (key === 'consent') {
      if (card.type === 'recovery') {
        st.status = 'done'; st.detail = 'Consent is checked again just before each email.';
      } else {
        var cs = T.consentOf(c), ce = c.consent.email;
        st.status = 'done'; st.detail = T.CONSENT_LABEL[cs] + ' to email (' + ce.source + ', ' + T.fmtDate(ce.date, { noDay: true }) + '). ' + (T.canEmail(c) ? 'Still valid at ' + T.clockStr() + '.' : 'Email steps will be skipped.');
      }
    } else if (key === 'memory') {
      var n = 0;
      card.diff.forEach(function (d) { if (d.include) { d._v = card.version; memSet(c, d, card.undo, card.approver); n++; } });
      st.status = 'done'; st.detail = n + ' change' + (n === 1 ? '' : 's') + ' saved to ' + T.fullName(c) + '. Earlier values stay in history.';
    } else if (key === 'task') {
      var t = card.task, id = 't-' + card.id;
      if (!s.tasks.some(function (x) { return x.id === id; })) {
        s.tasks.push({ id: id, client: c ? c.id : null, title: t.title, due: t.due, owner: t.owner, source: t.source, status: 'open', alts: card.alts && card.alts.attach ? card.alts.matches.slice() : null, fromCard: card.id, internal: !!t.internal, tx: card.txId || null });
        card.undo.tasks.push(id);
      }
      if (c) c.timeline.unshift({ date: T.today(), text: 'Task added: ' + t.title, kind: 'note' });
      st.status = 'done'; st.detail = 'Due ' + T.fmtDT(t.due) + ', owner ' + t.owner + '. A task, not a calendar invitation.' + (card.alts && card.alts.attach ? ' ' + card.alts.matches.length + ' candidate listings attached for your review.' : '');
    } else if (key.indexOf('task:') === 0) {
      var ti = +key.slice(5), tk = card.tasks[ti], tid = 't-' + card.id + '-' + ti;
      if (!s.tasks.some(function (x) { return x.id === tid; })) {
        s.tasks.push({ id: tid, client: tk.internal ? null : c.id, title: tk.title, due: tk.due, owner: tk.owner, source: tk.source, status: 'open', fromCard: card.id, internal: !!tk.internal, alts: tk.alts && tk.alts.length ? tk.alts.slice() : null });
        card.undo.tasks.push(tid);
      }
      if (!tk.internal) c.timeline.unshift({ date: T.today(), text: 'Task added: ' + tk.title, kind: 'note' });
      st.status = 'done'; st.detail = 'Due ' + T.fmtDT(tk.due) + ', owner ' + tk.owner + '. A task, not a calendar invitation.' + (tk.internal ? ' Not linked to ' + c.first + '’s record.' : '');
    } else if (key.indexOf('msg:') === 0) {
      var mg = card.msgs[+key.slice(4)];
      if (mg.recipient) {
        var msr = emailStatus(), rtx = T.tx(mg.recipient.txId);
        T.outboxAdd({ client: c.id, name: mg.recipient.name, to: mg.to, subject: mg.subject, body: mg.body, lang: mg.lang, kind: 'Message to the ' + mg.recipient.role.toLowerCase(), cardId: card.id, footer: T.drafts.footer(mg.lang) });
        if (rtx) rtx.history.unshift({ at: T.nowISO(), text: 'Message to ' + mg.recipient.name + ' (' + mg.recipient.role.toLowerCase() + '): “' + mg.subject + '” (' + msr + ')' });
        st.status = msr; st.detail = emailDetail(msr) + ' To ' + mg.recipient.name + ', ' + mg.recipient.role.toLowerCase() + ' on the ' + mg.recipient.file + ' file.';
        return;
      }
      if (!T.canEmail(c)) { st.status = 'excluded'; st.detail = 'Email consent is no longer valid (' + T.CONSENT_LABEL[T.consentOf(c)].toLowerCase() + '). Skipped.'; return; }
      var ms = emailStatus();
      T.outboxAdd({ client: c.id, name: T.fullName(c), to: c.email, subject: mg.subject, body: mg.body, lang: mg.lang, kind: 'Message', cardId: card.id, footer: T.drafts.footer(mg.lang) });
      c.timeline.unshift({ date: T.today(), text: 'Message (' + ms + ', not sent): “' + mg.subject + '”', kind: 'email' });
      st.status = ms; st.detail = emailDetail(ms) + (mg.sms ? ' SMS isn’t configured, so it went to the outbox as an email.' : '');
    } else if (key === 'note-log') {
      if (card.note.showing) {
        var sap = card.note.showingEv && s.appointments.filter(function (a) { return a.id === card.note.showingEv; })[0];
        if (sap) { sap.recapped = true; card.undo.appts.push(sap.id); }
        else {
          var endT = T.nowISO().slice(11, 16), sid = 'a-' + card.id + '-shown', Ls = T.listing(card.note.showing);
          s.appointments.push({ id: sid, status: 'scheduled', date: T.today(), start: T.addMin(endT, -45), end: endT, title: 'Showing', client: c.id, place: Ls.address, listing: Ls.id, area: Ls.area, kind: 'showing', recapped: true, fromCard: card.id, logged: true });
          s.appointments.sort(function (a, b) { return (a.date + a.start) < (b.date + b.start) ? -1 : 1; });
          card.undo.appts.push(sid);
        }
        s.counters.recaps++;
      }
      var nt = T.clients.addNote(c.id, card.note.text);
      if (nt) { nt.kind = card.isCall ? 'call' : 'note'; card.undo.notes.push(nt.id); }
      c.lastContact = T.today();
      (c.inbound || []).forEach(function (x) { x.answered = true; });
      if (card.isCall) c.timeline.unshift({ date: T.today(), text: 'Call logged (' + (card.source && card.source.input === 'voice' ? 'voice note' : 'typed') + ')', kind: 'call' });
      st.status = 'done'; st.detail = 'Saved word for word to ' + T.fullName(c) + '’s notes' + (card.isCall ? '; counts as today’s contact' : '') + (card.note.showing ? (card.note.showingEv ? '; linked to the showing in your calendar' : '; the showing wasn’t on your calendar, so it’s logged as completed today') : '') + '.';
    } else if (key === 'email') {
      if (!T.canEmail(c)) { st.status = 'excluded'; st.detail = 'Email consent is no longer valid (' + T.CONSENT_LABEL[T.consentOf(c)].toLowerCase() + '). Skipped.'; return; }
      var es = emailStatus();
      T.outboxAdd({ client: c.id, name: T.fullName(c), to: c.email, subject: card.email.subject, body: card.email.body, lang: card.email.lang, kind: card.type === 'cancel' ? 'Cancellation note' : card.type === 'listings' || (card.type === 'multi' && card.rows) ? 'Listings' : 'Follow-up', cardId: card.id, footer: T.drafts.footer(card.email.lang) });
      c.timeline.unshift({ date: T.today(), text: 'Email (' + es + ', not sent): “' + card.email.subject + '”', kind: 'email' });
      st.status = es; st.detail = emailDetail(es);
    } else if (key.indexOf('send:') === 0) {
      var rid = key.slice(5), rc = T.client(rid);
      var pe = s.pendingEvents.filter(function (e) { return e.type === 'optout-during-send' && e.client === rid; })[0];
      if (pe) {
        // A queued inbound event (seeded or from the Test lab): the opt-out lands after approval, before this email.
        s.pendingEvents = s.pendingEvents.filter(function (e) { return e !== pe; });
        rc.consent.email = { status: 'opted-out', source: 'Replied “Please take me off your list” while a batch was sending', date: T.today(), at: T.clockStr() };
        rc.timeline.unshift({ date: T.today(), text: 'Opted out of commercial email at ' + T.clockStr(), kind: 'consent' });
        s.counters.optOuts++;
        T.notify('consent', T.fullName(rc) + ' opted out during a send', 'Consent was rechecked just before the email, so it was skipped.', { type: 'client', id: rid });
        st.status = 'excluded'; st.detail = 'Opt-out received at ' + T.clockStr() + ', after you approved. Consent was rechecked before sending, so ' + rc.first + ' was skipped.';
        return;
      }
      if (!T.canEmail(rc)) { st.status = 'excluded'; st.detail = 'Consent changed before sending (' + T.CONSENT_LABEL[T.consentOf(rc)].toLowerCase() + '). Skipped.'; return; }
      var row = card.rows.filter(function (r) { return r.clientId === rid; })[0];
      var es2 = emailStatus();
      if (!s.outreach.some(function (o) { return o.client === rid && o.batch === card.id; })) {
        s.outreach.push({ id: 'o-' + card.id + '-' + rid, client: rid, name: T.fullName(rc), sent: T.today(), status: 'awaiting', windowEnd: T.addDays(T.today(), 14), messages: 1, batch: card.id, simulated: true });
        T.outboxAdd({ client: rid, name: T.fullName(rc), to: rc.email, subject: row.subject, body: row.body, lang: rc.lang, kind: 'Recovery', cardId: card.id, footer: T.drafts.footer(rc.lang) });
        rc.timeline.unshift({ date: T.today(), text: 'Recovery email (' + es2 + ', not sent): “' + row.subject + '”', kind: 'email' });
      }
      st.status = es2; st.detail = es2 === 'queued' ? emailDetail(es2) : 'Simulated. Not sent. Watching for a reply until ' + T.fmtDate(T.addDays(T.today(), 14), { noDay: true }) + '.';
    } else if (key === 'review') {
      card.rows.forEach(function (r) {
        if (r.bucket !== 'review' || r.review !== 'task') return;
        var rc2 = T.client(r.clientId), tid = 't-consent-' + r.clientId;
        if (!s.tasks.some(function (x) { return x.id === tid; })) s.tasks.push({ id: tid, client: r.clientId, title: 'Review email consent evidence for ' + T.fullName(rc2), due: T.addDays(T.today(), 3) + 'T10:00', owner: T.BROKER.name, source: 'Recovery card, ' + T.fmtDate(T.today(), { noDay: true }), status: 'open', internal: true });
      });
      st.status = 'done'; st.detail = 'Due ' + T.fmtDate(T.addDays(T.today(), 3), { long: true }) + '. Nobody without clear consent was messaged.';
    } else if (key === 'exclusions') {
      var ex = [];
      card.rows.forEach(function (r) {
        var rc3 = T.client(r.clientId);
        if (r.bucket === 'eligible' && !r.include && r.reason === 'handled') { rc3.recovery = rc3.recovery || { kind: 'dormant', reason: '', evidence: [] }; rc3.recovery.handled = true; rc3.lastContact = T.today(); rc3.timeline.unshift({ date: T.today(), text: 'Marked “handled elsewhere” in a recovery card', kind: 'note' }); ex.push(rc3.first + ' (handled elsewhere)'); }
        else if (r.bucket === 'eligible' && !r.include) ex.push(rc3.first + ' (' + (r.reason === 'later' ? 'not now' : r.reason === 'signal' ? 'wrong signal' : 'excluded') + ')');
        if (r.bucket === 'optout') ex.push(rc3.first + ' (opted out)');
      });
      st.status = 'done'; st.detail = ex.length ? 'Not contacted: ' + ex.join(', ') + '.' : 'No exclusions.';
    } else if (key === 'calendar') {
      var evt = { date: card.appt.date, start: card.appt.start, end: addMin(card.appt.start, card.appt.dur), area: card.appt.area };
      var conf = T.cal.conflicts(evt, card.moveTarget || card.target);
      st.status = 'done';
      st.detail = conf.length ? T.cal.describe(conf[0]) + ' You chose this time anyway.' : T.fmtTime(card.appt.start) + ' to ' + T.fmtTime(evt.end) + ' is free, travel included.';
    } else if (key === 'appt') {
      var aid = 'a-' + card.id;
      if (!s.appointments.some(function (a) { return a.id === aid; })) {
        s.appointments.push({ id: aid, status: 'scheduled', date: card.appt.date, start: card.appt.start, end: addMin(card.appt.start, card.appt.dur), title: card.appt.title, client: c.id, place: card.appt.place || (card.appt.choose ? 'Listing to choose' : 'Place to confirm'), listing: card.appt.listing || null, area: card.appt.area || '', kind: card.appt.kind || 'showing', fromCard: card.id });
        card.undo.appts.push(aid);
        c.timeline.unshift({ date: T.today(), text: card.appt.title + ' booked for ' + T.fmtDT(card.appt.date + 'T' + card.appt.start), kind: 'meeting' });
      }
      s.appointments.sort(function (a, b) { return (a.date + a.start) < (b.date + b.start) ? -1 : 1; });
      st.status = 'done'; st.detail = T.fmtDT(card.appt.date + 'T' + card.appt.start) + ' in your demo calendar.';
    } else if (key === 'move') {
      var tg = s.appointments.filter(function (a) { return a.id === (card.moveTarget || card.target); })[0];
      if (!tg || tg.status === 'cancelled') { st.status = 'skipped'; st.detail = 'The event no longer exists or was cancelled.'; return; }
      card.undo.moved.push({ id: tg.id, date: tg.date, start: tg.start, end: tg.end });
      tg.date = card.appt.date; tg.start = card.appt.start; tg.end = addMin(card.appt.start, card.appt.dur);
      c.timeline.unshift({ date: T.today(), text: tg.title + ' moved to ' + T.fmtDT(tg.date + 'T' + tg.start), kind: 'meeting' });
      s.appointments.sort(function (a, b) { return (a.date + a.start) < (b.date + b.start) ? -1 : 1; });
      st.status = 'done'; st.detail = 'Moved from ' + T.fmtDT(card.appt.from) + ' to ' + T.fmtDT(tg.date + 'T' + tg.start) + '.';
      var fc = card.fileCheck, ftx = fc && T.tx(fc.txId), fcond = ftx && ftx.conditions.filter(function (x) { return x.id === fc.cond; })[0];
      if (fcond) {
        var lateNow = tg.date > fcond.deadline;
        ftx.history.unshift({ at: T.nowISO(), text: tg.title.replace(/:.*$/, '') + ' appointment moved to ' + T.fmtDT(tg.date + 'T' + tg.start) + (lateNow ? ', after the ' + fcond.label.toLowerCase() + ' deadline (' + T.fmtDate(fcond.deadline, { noDay: true }) + ')' : ', before the ' + fcond.label.toLowerCase() + ' deadline (' + T.fmtDate(fcond.deadline, { noDay: true }) + ')') + ' (by ' + T.actor() + ')' });
        st.detail += ' The ' + ftx.title + ' file is updated' + (lateNow ? '; it now lands after the ' + fcond.label.toLowerCase() + ' deadline.' : ' and it still lands before the ' + fcond.label.toLowerCase() + ' deadline.');
      }
    } else if (key === 'invite') {
      var es3 = emailStatus();
      var ifr = c.lang === 'FR', ev = { title: card.appt.title, kind: card.appt.kind };
      T.outboxAdd({ client: c.id, name: T.fullName(c), to: c.email,
        subject: ifr ? (card.invite.update ? 'Invitation mise à jour : ' : 'Invitation : ') + T.evtFr(ev) + ', ' + T.fmtDT(card.appt.date + 'T' + card.appt.start, { fr: true }) : (card.invite.update ? 'Updated invitation: ' : 'Invitation: ') + card.appt.title + ', ' + T.fmtDT(card.appt.date + 'T' + card.appt.start),
        body: ifr ? T.evtFr(ev).charAt(0).toUpperCase() + T.evtFr(ev).slice(1) + (card.appt.place ? ' au ' + card.appt.place : '') + ', ' + T.fmtDT(card.appt.date + 'T' + card.appt.start, { fr: true }) + ' (heure de l’Est).' : card.appt.title + (card.appt.place ? ' at ' + card.appt.place : '') + ', ' + T.fmtDT(card.appt.date + 'T' + card.appt.start, { long: true }) + ' (' + T.tzLabel(card.appt.date) + ').',
        lang: c.lang, kind: 'Calendar invitation', cardId: card.id });
      st.status = es3; st.detail = es3 === 'queued' ? emailDetail(es3) : 'Not sent. An appointment in your calendar is not the same as an invitation the client accepted.';
    } else if (key === 'cancel-evt') {
      var ce2 = T.cal.cancel(card.target, T.actor());
      if (ce2) card.undo.cancelled.push(ce2.id);
      st.status = ce2 ? 'done' : 'skipped'; st.detail = ce2 ? ce2.title + ' on ' + T.fmtDT(ce2.date + 'T' + ce2.start) + ' is cancelled in your calendar. It stays visible, struck through.' : 'Already cancelled.';
    } else if (key === 'save-listings') {
      c.saved = c.saved || [];
      var added = 0;
      card.rows.forEach(function (r) { if (r.include && c.saved.indexOf(r.id) < 0) { c.saved.push(r.id); added++; } });
      c.timeline.unshift({ date: T.today(), text: added + ' listing' + (added === 1 ? '' : 's') + ' saved to the record', kind: 'note' });
      st.status = 'done'; st.detail = added + ' newly saved; ' + c.saved.length + ' on ' + c.first + '’s record.';
    }
  }

  // Receipts group the simulated per-recipient sends into one line; every exclusion keeps its own line.
  function receiptSteps(card) {
    var out = [], sims = [];
    card.steps.forEach(function (x) {
      if (card.type === 'recovery' && x.key.indexOf('send:') === 0 && (x.status === 'simulated' || x.status === 'queued')) { sims.push(T.fullName(T.client(x.key.slice(5)))); return; }
      if (card.type === 'recovery' && x.key === 'review' && sims.length) flush();
      out.push({ label: x.label, status: x.status, detail: x.detail });
    });
    function flush() {
      if (!sims.length) return;
      var q = S().caps.offline;
      out.splice(1, 0, { label: sims.length + ' recovery email' + (sims.length === 1 ? '' : 's') + ' ' + (q ? 'queued offline' : 'simulated'), status: q ? 'queued' : 'simulated', detail: 'Not sent: ' + sims.join(', ') + '. Each is watched for a reply until ' + T.fmtDate(T.addDays(T.today(), 14), { noDay: true }) + '.' });
      sims = [];
    }
    flush();
    return out;
  }

  function finish(card, quiet) {
    var s = S(), c = card.clientId && T.client(card.clientId);
    T.tick(1);
    var failed = card.steps.some(function (x) { return x.status === 'failed'; });
    card.status = card.shadow ? 'shadow' : failed ? 'partial' : 'completed';
    if (card.shadow) s.counters.shadowRuns++;
    var r = {
      id: 'r' + card.id.slice(1), cardId: card.id, type: card.type, title: card.title, version: card.approvedVersion, fingerprint: card.approvedFp,
      approvedAt: card.approvedAt, finishedAt: T.nowISO(), approver: card.approver || T.BROKER.name, shadow: !!card.shadow, requestedBy: card.requestedBy || null,
      steps: receiptSteps(card), provenance: card.source && card.source.provenance || { kind: 'rules' },
      clientId: card.clientId || null, undoable: !card.shadow && (card.undo.memory.length > 0 || card.undo.tasks.length > 0 || card.undo.appts.length > 0 || card.undo.moved.length > 0 || (card.undo.notes || []).length > 0 || (card.undo.cancelled || []).length > 0)
    };
    var done = r.steps.filter(function (x) { return x.status === 'done'; }).length;
    var sim = card.steps.filter(function (x) { return x.status === 'simulated' || x.status === 'queued'; }).length;
    var exc = card.steps.filter(function (x) { return x.status === 'excluded'; }).length;
    if (card.shadow) r.summary = 'Shadow Mode: nothing changed. This is what Tayoo would have done.';
    else if (card.type === 'recovery') r.summary = sim + ' email' + (sim === 1 ? '' : 's') + ' ' + (s.caps.offline ? 'queued offline' : 'simulated') + ', not sent. ' + (exc ? exc + ' recipient' + (exc === 1 ? '' : 's') + ' excluded at send time. ' : '') + 'Replies will be counted only when they are observed.';
    else r.summary = done + ' local change' + (done === 1 ? '' : 's') + ' completed' + (sim ? ', ' + sim + ' ' + (s.caps.offline ? 'queued offline' : 'simulated (nothing left this browser)') : '') + (exc ? ', ' + exc + ' skipped' : '') + '.';
    s.receipts.unshift(r);
    card.receiptId = r.id; card.rev++;
    T.log((card.shadow ? 'Shadow run: ' : 'Completed: ') + card.title + ' (approved by ' + r.approver + ')', card.shadow ? 'shadow' : 'done', r.id);
    T.addMessage({ role: 'tayoo', kind: 'receipt', receiptId: r.id });
    var say;
    if (card.shadow) say = 'Shadow Mode is on, so nothing changed. I recorded what I would have done.';
    else if (card.type === 'showing') say = 'Done. ' + c.first + '’s memory is updated' + (card.task && card.task.include ? ' and the task is set' : '') + '. The email was simulated; nothing was sent.';
    else if (card.type === 'recovery') say = 'Done. ' + numWord(sim) + ' emails simulated' + (exc ? ', and ' + numWord(exc).toLowerCase() + ' skipped because consent changed' : '') + '. Nothing was actually sent.';
    else say = 'Done.';
    T.store.commit();
    if (!quiet && card.source && card.source.input === 'voice') T.voice && T.voice.say(say, 'EN');
    return Promise.resolve();
  }

  T.reject = function (cardId) {
    var s = S(), card = s.cards[cardId];
    if (!card || (card.status !== 'ready' && card.status !== 'clarify' && card.status !== 'awaiting')) return;
    card.status = 'cancelled'; card.rev++;
    s.counters.rejected++;
    T.log('Rejected: ' + card.title + ' (by ' + T.actor() + ')', 'cancel');
    T.addMessage({ role: 'tayoo', kind: 'text', text: 'Rejected plan v' + card.version + '. Nothing changed and nothing was sent.' });
    T.store.commit();
  };

  T.undo = function (receiptId) {
    var s = S(), r = s.receipts.filter(function (x) { return x.id === receiptId; })[0];
    if (!r || !r.undoable || r.undone) return;
    var card = s.cards[r.cardId];
    (card.undo.memory || []).slice().reverse().forEach(function (u) {
      var c = T.client(u.client), i;
      if (!c || c.deleted) return;
      for (i = 0; i < c.memory.length; i++) if (c.memory[i].key === u.key) break;
      var cur = c.memory[i];
      if (u.prev) c.memory[i] = u.prev; else c.memory.splice(i, 1);
      c.history.unshift({ date: T.today(), at: T.nowISO(), field: u.prev ? u.prev.label : cur.label, from: cur ? cur.display : '', to: u.prev ? u.prev.display : 'Removed', by: T.actor() + ' (undo)', source: 'Undo of receipt ' + r.id });
    });
    s.tasks = s.tasks.filter(function (t) { return (card.undo.tasks || []).indexOf(t.id) < 0; });
    (card.undo.appts || []).forEach(function (id) {
      var a = s.appointments.filter(function (x) { return x.id === id; })[0];
      if (!a) return;
      if (a.fromCard) s.appointments = s.appointments.filter(function (x) { return x.id !== id; });
      else a.recapped = false;
    });
    (card.undo.moved || []).forEach(function (m) { var a = s.appointments.filter(function (x) { return x.id === m.id; })[0]; if (a) { a.date = m.date; a.start = m.start; a.end = m.end; } });
    (card.undo.cancelled || []).forEach(function (id) { var a = s.appointments.filter(function (x) { return x.id === id; })[0]; if (a) { a.status = 'scheduled'; a.cancelledBy = null; } });
    (card.undo.notes || []).forEach(function (id) { var cn = T.client(card.clientId); if (cn && cn.notes) cn.notes = cn.notes.filter(function (n) { return n.id !== id; }); });
    if (card.type === 'showing') s.counters.recaps = Math.max(0, s.counters.recaps - 1);
    r.undone = T.nowISO();
    r.steps.push({ label: 'Undo local changes', status: 'done', detail: 'Local records restored. Simulated messages can’t be recalled; real ones couldn’t be either.' });
    card.rev++;
    T.log('Undid local changes from ' + card.title, 'undo', r.id);
    T.addMessage({ role: 'tayoo', kind: 'text', text: 'Undone. ' + (card.clientId && T.client(card.clientId) ? T.client(card.clientId).first + '’s records are back to how they were. ' : '') + 'The history keeps both versions.' });
    T.store.commit();
  };

  T.resolveConflict = function (txId, key, choice) {
    var s = S(), tx = T.tx(txId);
    if (!tx) return;
    T.tick(1);
    if (choice === 'none') {
      T.addMessage({ role: 'tayoo', kind: 'text', text: 'Left unresolved. I won’t treat either date as the deadline, and it stays at the top of the ' + tx.title + ' file.' });
      T.store.commit(); return;
    }
    var chk = T.files.check(tx), issue = chk.issues.filter(function (x) { return x.type === 'conflict' && x.key === key; })[0];
    if (!issue) return;
    var pick = issue.values[+choice];
    if (!pick) return;
    T.files.resolve(txId, key, pick.value, pick.source);
    Object.keys(s.cards).forEach(function (k) { if (s.cards[k].type === 'file') s.cards[k].rev++; });
    T.addMessage({ role: 'tayoo', kind: 'text', text: 'Saved: the ' + issue.label.toLowerCase() + ' for the ' + tx.title + ' is ' + T.fmtDate(pick.value, { long: true }) + ', from ' + pick.source + '. The other value stays in the history' + (tx.conditions.some(function (c) { return c.id === key; }) ? ', and I set a reminder for that day at noon' : '') + '. This isn’t legal advice; confirm with the other broker.' });
    T.store.commit();
  };

  // Ledger: manual confirmations (the demo has no mailbox, so replies are confirmed by the broker)
  T.markReply = function (oid) {
    var s = S(), o = s.outreach.filter(function (x) { return x.id === oid; })[0];
    if (!o || o.status !== 'awaiting') return;
    T.tick(1);
    o.status = 'replied'; o.reply = T.today(); o.replyKind = 'confirmed';
    var c = T.client(o.client); if (c && !c.deleted) { c.timeline.unshift({ date: T.today(), text: 'Reply received (you confirmed it)', kind: 'email' }); c.lastContact = T.today(); }
    T.log('Reply from ' + o.name + ' confirmed manually', 'outcome');
    T.store.commit();
  };
  T.markMeeting = function (oid) {
    var s = S(), o = s.outreach.filter(function (x) { return x.id === oid; })[0];
    if (!o || o.status !== 'replied' || o.meeting) return;
    // one appointment linked to several messages counts once per contact
    var already = s.outreach.some(function (x) { return x.client === o.client && x.meeting; });
    o.meeting = T.today(); o.meetingKind = 'confirmed';
    if (already) o.duplicate = true;
    T.log('Meeting booked with ' + o.name + (already ? ' (already counted)' : ''), 'outcome');
    T.store.commit();
  };

  /* ======================= thread ======================= */
  T.addMessage = function (m) {
    var s = S();
    m.id = T.uid('m'); m.at = T.nowISO(); m.rev = 1;
    s.thread.push(m);
    return m;
  };
})();
