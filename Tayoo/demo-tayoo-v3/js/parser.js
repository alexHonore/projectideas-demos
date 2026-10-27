/* Tayoo V3 — deterministic, transparent request parser.
   No AI service is called. Rules below turn a dictation or typed request into intent + entities,
   and record every span they used so the Action Card can show exactly how the text was read. */
(function () {
  'use strict';
  var T = (window.Tayoo = window.Tayoo || {});

  // Same-length folding: lowercase + strip accents per UTF-16 unit so span offsets match the original.
  function fold(s) {
    var out = '', i, c, d;
    for (i = 0; i < s.length; i++) {
      c = s[i];
      d = c.normalize('NFD')[0] || c;
      if (d === '’' || d === '‘') d = "'";
      out += d.length === 1 ? d.toLowerCase() : c.toLowerCase();
    }
    return out;
  }

  var FR_MARKERS = /\b(je|j'|il|elle|lui|avec|visite|mais|est|son|sa|ses|les|des|trop|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|matin|promis|aime|adore|frais|budget passe|stationnement|maintenant|suivi|dossier)\b/g;
  var EN_MARKERS = /\b(i|she|he|her|his|with|the|showing|but|is|now|too|tomorrow|monday|morning|promised|loved|liked|fees|garage|follow|file)\b/g;

  var WEEKDAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };
  var PART_TIME = { morning: 'morning', matin: 'morning', afternoon: '14:00', 'apres-midi': '14:00', evening: '18:00', soir: '18:00', night: '19:00' };

  function Spans() { this.list = []; }
  Spans.prototype.free = function (a, b) {
    for (var i = 0; i < this.list.length; i++) { var s = this.list[i]; if (a < s.end && b > s.start) return false; }
    return true;
  };
  Spans.prototype.add = function (a, b, type, label) {
    if (a >= b || !this.free(a, b)) return false;
    this.list.push({ start: a, end: b, type: type, label: label });
    return true;
  };

  function wordRe(word) {
    return new RegExp('(^|[^a-z0-9])(' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=[^a-z0-9]|$)', 'g');
  }
  function findAll(re, f) {
    var out = [], m;
    re.lastIndex = 0;
    while ((m = re.exec(f))) { out.push(m); if (!re.global) break; }
    return out;
  }

  /* ---------- clients ---------- */
  // Words that can sit next to a name without being part of it ("Call Martin", "Emma Tuesday").
  var NOT_NAME = /^(call|called|calling|phone|phoned|book|remind|send|email|text|cancel|move|reschedule|with|and|for|to|from|about|tell|ask|meet|met|see|saw|visit|brief|note|remember|find|show|dear|hi|hello|bonjour|salut|appel|avec|pour|chez|monsieur|madame|mr|mrs|ms|mme|the|a|an|le|la|les|de|du|des|et|ou|is|was|has|had|just|then|also|but|mais|she|he|her|his|il|elle|lui|i|je|j|tomorrow|today|demain|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|january|february|march|april|may|june|july|august|september|october|november|december|rue|avenue|chemin|boulevard|tayoo|please|ok|okay|yes|no|oui|non)$/;
  function capWord(w) { return w && /^[A-ZÀ-Ý][a-zà-ÿ'-]+$/.test(w) && !/['’]/.test(w) && !NOT_NAME.test(fold(w)) && !(T.AREAS && Object.keys(T.AREAS).some(function (a) { return fold(a) === fold(w); })); }
  // Words that belong to an address, a place or a company never name a client: "Rue Saint-Laurent", "Sainte-Foy",
  // "Courtage Laurentides", "Avenue du Parc", "Laurier Street"
  var STREET = "rue|avenue|av|boulevard|boul|blvd|chemin|ch|cote|rang|route|place|montee|impasse|allee|promenade|terrasse|carre|croissant|street|road|drive|lane|crescent|court";
  var RE_ZONES = [
    new RegExp("(^|[^a-z])((?:" + STREET + ")\\.?\\s+(?:(?:de la|de l'|du|des|de|d'|la|le|l')\\s*)?[a-z0-9'-]+(?:\\s+(?:est|ouest|nord|sud|east|west))?)(?=[^a-z]|$)", 'g'),
    new RegExp("(^|[^a-z])([a-z'-]+\\s+(?:street|road|drive|avenue|boulevard|lane|crescent|court))(?=[^a-z]|$)", 'g'),
    /(^|[^a-z])((?:saint|sainte|st|ste)-[a-z-]+)(?=[^a-z]|$)/g,
    /(^|[^a-z])((?:courtage|agence|agency|realty|immobilier|groupe|group|notaires|notaire|cabinet|banque|caisse)\s+(?:[a-z'-]+)(?:[ -][a-z'-]+)?)(?=[^a-z]|$)/g,
    /(^|[^a-z])([a-z'-]+\s+(?:inc|ltee|ltd|realty|immobilier|notaires))(?=[^a-z]|$)/g
  ];
  function placeZones(f) {
    var z = [];
    RE_ZONES.forEach(function (re) { re.lastIndex = 0; var m; while ((m = re.exec(f))) { var a = m.index + m[1].length; z.push([a, a + m[2].length]); if (!m[0].length) re.lastIndex++; } });
    if (T.AREAS) Object.keys(T.AREAS).forEach(function (ar) { findAll(wordRe(fold(ar)), f).forEach(function (m) { var a = m.index + m[1].length; z.push([a, a + m[2].length]); }); });
    return z;
  }
  T.placeZones = placeZones;
  function findClients(f, spans, text) {
    var clients = T.store.state.clients, mentions = [], zones = placeZones(f);
    var inZone = function (a, b) { return zones.some(function (z) { return a < z[1] && b > z[0]; }); };
    // full names first
    clients.forEach(function (c) {
      var full = fold(c.first + ' ' + c.last);
      findAll(wordRe(full), f).forEach(function (m) {
        var a = m.index + m[1].length, b = a + m[2].length;
        if (inZone(a, b)) return;
        if (spans.add(a, b, 'client', T.fullName(c))) mentions.push({ ids: [c.id], start: a, end: b, by: 'full name' });
      });
    });
    // last names (possibly shared, e.g. Gagnon)
    var byLast = {}, byFirst = {};
    clients.forEach(function (c) {
      (byLast[fold(c.last)] = byLast[fold(c.last)] || []).push(c.id);
      (byFirst[fold(c.first)] = byFirst[fold(c.first)] || []).push(c.id);
    });
    var unknown = [];
    Object.keys(byLast).forEach(function (ln) {
      findAll(wordRe(ln), f).forEach(function (m) {
        var a = m.index + m[1].length, b = a + m[2].length;
        if (inZone(a, b)) return;
        // "Bob Martin" is not Chloé Martin: a different first name in front means another person
        var prev = text ? (text.slice(0, a).match(/([A-Za-zÀ-ÿ'-]+)\s+$/) || [])[1] : null;
        if (prev && capWord(prev) && !byLast[ln].some(function (id) { return fold(T.client(id).first) === fold(prev); })) { unknown.push({ name: prev + ' ' + text.slice(a, b), start: a - prev.length - 1, end: b }); spans.add(a - prev.length - 1, b, 'unknown', 'not a client'); return; }
        if (spans.add(a, b, 'client', 'last name')) mentions.push({ ids: byLast[ln].slice(), start: a, end: b, by: 'last name' });
      });
    });
    Object.keys(byFirst).forEach(function (fn) {
      findAll(wordRe(fn), f).forEach(function (m) {
        var a = m.index + m[1].length, b = a + m[2].length;
        if (inZone(a, b)) return;
        var next = text ? (text.slice(b).match(/^\s+([A-Za-zÀ-ÿ'-]+)/) || [])[1] : null;
        if (next && capWord(next) && !byFirst[fn].some(function (id) { return fold(T.client(id).last) === fold(next); }) && spans.free(a, b)) { unknown.push({ name: text.slice(a, b) + ' ' + next, start: a, end: b + 1 + next.length }); spans.add(a, b + 1 + next.length, 'unknown', 'not a client'); return; }
        if (spans.add(a, b, 'client', 'first name')) mentions.push({ ids: byFirst[fn].slice(), start: a, end: b, by: 'first name' });
      });
    });
    mentions.unknown = unknown;
    return mentions.sort(function (x, y) { return x.start - y.start; });
  }

  /* ---------- places: every bundled listing, CMA subject, transaction and known address ---------- */
  var GENERIC = /^(rue|avenue|av|chemin|ch|boulevard|boul|blvd|place|street|st|du|de|la|des|d|est|ouest|east|west|unit|apt|app|unite)$/;
  function placeIndex() {
    var idx = [];
    function add(id, address, kind, area) {
      var a = fold(address.split(',')[0]).replace(/\s+/g, ' ').trim();
      var m = a.match(/^(\d{1,5})\s+(.*)$/);
      var words = (m ? m[2] : a).split(/[\s]+/).filter(function (w) { return w && !GENERIC.test(w); });
      var street = words.sort(function (x, y) { return y.length - x.length; })[0] || '';
      idx.push({ id: id, number: m ? m[1] : '', street: street, label: address, kind: kind, area: area });
    }
    T.listings().forEach(function (l) { add(l.id, l.address, 'listing', l.area); });
    T.store.state.transactions.forEach(function (tx) { add(tx.id, tx.property, 'tx', tx.area); });
    return idx;
  }
  function findPlaces(f, spans) {
    var hits = [], idx = placeIndex(), m;
    idx.forEach(function (p) {
      if (!p.number || !p.street) return;
      var re = new RegExp('(^|[^0-9])(' + p.number + ')(?=[^0-9])', 'g');
      while ((m = re.exec(f))) {
        var a = m.index + m[1].length, tail = f.slice(a, a + 48), k = tail.indexOf(p.street);
        if (k < 0) continue;
        var b = a + k + p.street.length;
        var rest = f.slice(b).match(/^(\s(est|ouest|east|west))?(,?\s(unit|apt|app|unite)\s?\d+)?/);
        if (rest) b += rest[0].length;
        if (spans.add(a, b, 'place', p.label)) hits.push({ id: p.id, label: p.label, kind: p.kind, start: a, end: b, by: 'address' });
      }
    });
    // street name alone ("the Foulon condo"), only when one record has that street
    var counts = {};
    idx.forEach(function (p) { if (p.street && p.street.length >= 5) counts[p.street] = (counts[p.street] || 0) + 1; });
    idx.forEach(function (p) {
      if (!p.street || counts[p.street] !== 1 || hits.some(function (h) { return h.id === p.id; })) return;
      var re = wordRe(p.street), mm = re.exec(f);
      if (!mm) return;
      var a = mm.index + mm[1].length, b = a + mm[2].length;
      if (T.AREAS && Object.keys(T.AREAS).some(function (ar) { return fold(ar) === p.street; })) return;
      if (spans.add(a, b, 'place', p.label)) hits.push({ id: p.id, label: p.label, kind: p.kind, start: a, end: b, by: 'street name' });
    });
    return hits.sort(function (x, y) { return x.start - y.start; });
  }

  /* ---------- areas, property types, bedrooms, durations ---------- */
  var AREA_ALIAS = { 'old quebec': 'Vieux-Québec', 'vieux-quebec': 'Vieux-Québec', 'vieux quebec': 'Vieux-Québec', 'st-roch': 'Saint-Roch', 'st-sauveur': 'Saint-Sauveur', 'ste-foy': 'Sainte-Foy', 'levis': 'Lévis', 'cap rouge': 'Cap-Rouge' };
  function findAreas(f, spans) {
    var out = [];
    var names = Object.keys(T.AREAS || {}).map(function (n) { return [fold(n), n]; }).concat(Object.keys(AREA_ALIAS).map(function (k) { return [k, AREA_ALIAS[k]]; }));
    names.sort(function (a, b) { return b[0].length - a[0].length; });
    names.forEach(function (n) {
      var re = wordRe(n[0]), m;
      while ((m = re.exec(f))) {
        var a = m.index + m[1].length, b = a + m[2].length;
        if (spans.add(a, b, 'area', n[1]) && out.indexOf(n[1]) < 0) out.push(n[1]);
      }
    });
    return out;
  }
  var TYPES = [['townhouses?|maisons? de ville', 'Townhouse'], ['semi-detached|semis?|jumelee?s?', 'Semi-detached'], ['condos?|condominiums?|appartements?', 'Condo'], ['bungalows?', 'Bungalow'], ['duplex', 'Duplex'], ['triplex', 'Triplex'], ['detached|single-family|unifamiliales?|houses?|maisons?', 'Detached']];
  function findTypes(f, spans) {
    var out = [];
    TYPES.forEach(function (t) {
      var re = new RegExp('(^|[^a-z])(' + t[0] + ')(?=[^a-z]|$)', 'g'), m;
      while ((m = re.exec(f))) {
        var a = m.index + m[1].length;
        if (/^\s*(fees?|frais)/.test(f.slice(a + m[2].length)) || /frais (de |du )?$/.test(f.slice(Math.max(0, a - 9), a))) continue; // "condo fees" isn't a type
        if (spans.add(a, a + m[2].length, 'type', t[1]) && out.indexOf(t[1]) < 0) out.push(t[1]);
      }
    });
    return out;
  }
  var NUMW = { one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, deux: 2, trois: 3, quatre: 4, cinq: 5, un: 1, une: 1 };
  function num(w) { return /^\d+$/.test(w) ? +w : NUMW[w] || null; }
  function findBeds(f, spans) {
    var m = /(^|[^a-z0-9])((\d|one|two|three|four|five|deux|trois|quatre|cinq)\s*\+?\s*(?:-\s*)?(bed|beds|bedroom|bedrooms|bdr|chambres?|cc))(?=[^a-z]|$)/.exec(f);
    if (!m) return null;
    var a = m.index + m[1].length;
    spans.add(a, a + m[2].length, 'beds', num(m[3]) + '+ bedrooms');
    return num(m[3]);
  }
  function findDays(f, spans) {
    var m = /(^|[^a-z0-9])((?:in|for|over|since|depuis|en|dans)\s+(?:the\s+(?:last|past)\s+)?(\d+|a|one|two|three|four|six|deux|trois|quatre|six)\s+(days?|weeks?|months?|jours?|semaines?|mois))(?=[^a-z]|$)/.exec(f);
    if (!m) return null;
    var n = num(m[3]) || 1, u = m[4], d = /week|semaine/.test(u) ? n * 7 : /month|mois/.test(u) ? n * 30 : n;
    var a = m.index + m[1].length;
    spans.add(a, a + m[2].length, 'days', d + ' days');
    return d;
  }

  /* ---------- dates & times ---------- */
  function morning() { return (T.store.state.settings && T.store.state.settings.morning) || '09:00'; }
  function findWhen(f, spans, opts) {
    var today = T.today(), found = null, m;
    function set(date, time, a, b, text, note, approx) {
      if (found) return;
      spans.add(a, b, 'when', text);
      found = { date: date, time: time, text: text, phrase: text, note: note || '', approx: !!approx, start: a, end: b };
    }
    // "in two hours", "dans 30 minutes": a moment from now
    var reRel = /(^|[^a-z])((?:in|dans)\s+(\d+|a|an|one|two|three|four|five|six|une?|deux|trois|quatre|cinq|six|half an|a half|une demi)[- ]?\s*(hours?|heures?|minutes?|mins?|h)(?:\s+(?:from now|d'ici))?)(?=[^a-z]|$)/g;
    if ((m = reRel.exec(f))) {
      var nR = /half|demi/.test(m[3]) ? 0.5 : (num(m[3]) || 1), mR = /^(m)/.test(m[4]) ? nR : nR * 60, atR = T.addMinutes(T.nowISO(), Math.round(mR)), aR = m.index + m[1].length;
      set(atR.slice(0, 10), atR.slice(11, 16), aR, aR + m[2].length, m[2], m[2] + ' from now (' + T.fmtTime(T.nowISO().slice(11, 16)) + ')', false);
      found.fixedTime = true;
    }
    var reDA = /(^|[^a-z])(the day after tomorrow|day after tomorrow|apres-demain|apres demain)(?=[^a-z]|$)/g;
    if (!found && (m = reDA.exec(f))) { var aDA = m.index + m[1].length; set(T.addDays(today, 2), null, aDA, aDA + m[2].length, m[2], '', false); }
    var re1 = /(^|[^a-z])((tomorrow|demain)(\s(morning|afternoon|evening|night|matin|apres-midi|soir))?)(?=[^a-z]|$)/g;
    if (!found && (m = re1.exec(f))) {
      var a1 = m.index + m[1].length, part = m[5];
      var t1 = part ? (PART_TIME[part] === 'morning' ? morning() : PART_TIME[part]) : null;
      set(T.addDays(today, 1), t1, a1, a1 + m[2].length, m[2], part ? (PART_TIME[part] === 'morning' ? 'your default morning time' : '') : '', false);
    }
    var re2 = /(^|[^a-z])(((next|this|by|on|ce)\s)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(\s(morning|afternoon|evening|matin|apres-midi|soir))?(\sprochain)?)(?=[^a-z]|$)/g;
    if (!found && (m = re2.exec(f))) {
      var a2 = m.index + m[1].length, wd = WEEKDAYS[m[5]], cur = T.dateObj(today).getUTCDay();
      var delta = (wd - cur + 7) % 7; if (delta === 0) delta = 7;
      // "next Saturday" said on a Friday is a week from tomorrow, not tomorrow
      var nextW = (m[4] === 'next' || !!m[8]) && delta === 1;
      if (nextW) delta += 7;
      var p2 = m[7], t2 = p2 ? (PART_TIME[p2] === 'morning' ? morning() : PART_TIME[p2]) : null;
      set(T.addDays(today, delta), t2, a2, a2 + m[2].length, m[2], (p2 && PART_TIME[p2] === 'morning' ? 'your default morning time' : '') + (nextW ? (p2 ? '; ' : '') + '“next” read as the week after tomorrow' : ''), false);
    }
    var MONTHS = { jan: 1, january: 1, janvier: 1, feb: 2, february: 2, fevrier: 2, mar: 3, march: 3, mars: 3, apr: 4, april: 4, avril: 4, may: 5, mai: 5, jun: 6, june: 6, juin: 6, jul: 7, july: 7, juillet: 7, aug: 8, august: 8, aout: 8, sep: 9, sept: 9, september: 9, septembre: 9, oct: 10, october: 10, octobre: 10, nov: 11, november: 11, novembre: 11, dec: 12, december: 12, decembre: 12 };
    function ymd(mo, d) {
      var y = +today.slice(0, 4), iso = y + '-' + T.pad(mo) + '-' + T.pad(d);
      if (iso < T.addDays(today, -7)) iso = (y + 1) + '-' + T.pad(mo) + '-' + T.pad(d);
      return T.validDate(iso) ? iso : null;
    }
    var mn = Object.keys(MONTHS).join('|');
    var reM1 = new RegExp('(^|[^a-z])(((?:on|by|le|the)\\s+)?(' + mn + ')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?)(?=[^0-9a-z]|$)', 'g');
    var reM2 = new RegExp('(^|[^a-z0-9])(((?:le|on|the)\\s+)?(\\d{1,2})(?:er|st|nd|rd|th)?\\s+(?:of\\s+)?(' + mn + ')\\.?)(?=[^a-z]|$)', 'g');
    if (!found && (m = reM1.exec(f))) { var dd1 = ymd(MONTHS[m[4]], +m[5]); if (dd1) { var aM = m.index + m[1].length; set(dd1, null, aM, aM + m[2].length, m[2], '', false); } }
    if (!found && (m = reM2.exec(f))) { var dd2 = ymd(MONTHS[m[5]], +m[4]); if (dd2) { var aM2 = m.index + m[1].length; set(dd2, null, aM2, aM2 + m[2].length, m[2], '', false); } }
    var reIso = /(^|[^0-9])((\d{4})-(\d{2})-(\d{2}))(?=[^0-9]|$)/g;
    if (!found && (m = reIso.exec(f)) && T.validDate(m[2])) { var aI = m.index + m[1].length; set(m[2], null, aI, aI + m[2].length, m[2], '', false); }
    var reIn = /(^|[^a-z])((?:in|dans)\s+(\d+|a|an|one|two|three|four|five|six|seven|une?|deux|trois|quatre|cinq)\s+(days?|jours?|weeks?|semaines?))(?=[^a-z]|$)/g;
    if (!found && (m = reIn.exec(f))) { var nIn = num(m[3]) || 1, dIn = /week|semaine/.test(m[4]) ? nIn * 7 : nIn, aIn = m.index + m[1].length; set(T.addDays(today, dIn), null, aIn, aIn + m[2].length, m[2], '', false); }
    var reWk = /(^|[^a-z])(this weekend|ce week-end|ce weekend|en fin de semaine)(?=[^a-z]|$)/g;
    if (!found && (m = reWk.exec(f))) { var cw = T.dateObj(today).getUTCDay(), dw = (6 - cw + 7) % 7, aW = m.index + m[1].length; set(T.addDays(today, dw), null, aW, aW + m[2].length, m[2], 'Saturday assumed', true); }
    var re3 = /(^|[^a-z])(next week|la semaine prochaine)(?=[^a-z]|$)/g;
    if (!found && (m = re3.exec(f))) {
      var a3 = m.index + m[1].length, cur3 = T.dateObj(today).getUTCDay(), d3 = (8 - cur3) % 7 || 7;
      set(T.addDays(today, d3), morning(), a3, a3 + m[2].length, m[2], 'approximate: start of next week', true);
    }
    var re4 = /(^|[^a-z])(today|tonight|this afternoon|this evening|aujourd'hui|ce soir|cet apres-midi)(?=[^a-z]|$)/g;
    if (!found && (m = re4.exec(f))) {
      var a4 = m.index + m[1].length, w = m[2];
      set(today, /night|soir|evening/.test(w) ? '18:00' : /afternoon|apres/.test(w) ? '16:00' : null, a4, a4 + w.length, w, '', false);
    }
    // explicit clock time
    var tm = null, reT = TIME_RE();
    if (found && found.fixedTime) reT.lastIndex = f.length;
    while ((m = reT.exec(f))) {
      var hasPrefix = !!m[2], mins = m[4], ap = m[5];
      if (!hasPrefix && !mins && !ap) continue;
      var h = +m[3]; if (h > 23) continue;
      var a5 = m.index + m[1].length, b5 = m.index + m[0].length;
      if (!spans.free(a5, b5)) continue;
      if (ap && /p/.test(ap) && h < 12) h += 12;
      else if (ap && /a/.test(ap) && h === 12) h = 0;
      else if (!ap || ap === 'h') { if (ap !== 'h' && h >= 1 && h <= 6) h += 12; }
      spans.add(a5, b5, 'when', m[0].slice(m[1].length));
      var hm = T.pad(h) + ':' + (mins || '00'), isAfter = /^(after|apres|des)/.test(m[2] || ''), isBefore = /^(before|avant|by)/.test(m[2] || '');
      tm = { time: hm, text: m[0].slice(m[1].length).trim(), note: isAfter ? 'after ' + T.fmtTime(hm) + ': from then on' : isBefore ? 'before ' + T.fmtTime(hm) + ': the latest time' : '', cons: isAfter ? { after: hm, text: 'at or after ' + T.fmtTime(hm) } : isBefore ? { before: hm, text: 'ending by ' + T.fmtTime(hm) } : null };
      break;
    }
    // parts of the day as windows: "late afternoon" is 4 to 6 PM, the first free slot inside it
    var dp = !tm && /(^|[^a-z])(late afternoon|early afternoon|late morning|early morning|mid-?morning|mid-?afternoon|early evening|en fin d'apres-midi|fin d'apres-midi|en debut d'apres-midi|debut d'apres-midi|en fin de matinee|fin de matinee|tot le matin|en debut de soiree|debut de soiree)(?=[^a-z]|$)/.exec(f);
    if (dp) {
      var W = { 'late afternoon': ['16:00', '18:00'], 'fin d\'apres-midi': ['16:00', '18:00'], 'early afternoon': ['13:00', '15:00'], 'debut d\'apres-midi': ['13:00', '15:00'], 'late morning': ['10:30', '12:00'], 'fin de matinee': ['10:30', '12:00'], 'early morning': ['08:00', '09:30'], 'tot le matin': ['08:00', '09:30'], midmorning: ['09:30', '11:00'], 'mid-morning': ['09:30', '11:00'], midafternoon: ['14:00', '16:00'], 'mid-afternoon': ['14:00', '16:00'], 'early evening': ['17:00', '19:00'], 'debut de soiree': ['17:00', '19:00'] };
      var key = dp[2].replace(/^en /, ''), win = W[key] || ['16:00', '18:00'];
      spans.add(dp.index + dp[1].length, dp.index + dp[0].length, 'when', dp[2]);
      tm = { time: win[0], text: dp[2], note: dp[2] + ': between ' + T.fmtTime(win[0]) + ' and ' + T.fmtTime(win[1]), cons: { after: win[0], before: win[1], text: 'between ' + T.fmtTime(win[0]) + ' and ' + T.fmtTime(win[1]) } };
    }
    if (!tm && !(found && found.fixedTime)) {
      var reN0 = /(^|[^a-z])((?:at\s|a\s|vers\s|before\s|avant\s|by\s|after\s|apres\s)?(after lunch|after lunchtime|apres (?:le )?diner|apres le lunch|noon|midday|lunchtime|midi|end of (?:the )?day|end of business|fin de (?:la )?journee))(?=[^a-z]|$)/g;
      if ((m = reN0.exec(f)) && spans.free(m.index + m[1].length, m.index + m[0].length) && !/apres-$/.test(f.slice(Math.max(0, m.index - 5), m.index + m[1].length))) {
        var aN0 = m.index + m[1].length, eod = /end|fin/.test(m[3]), lunch = /^(after|apres)/.test(m[3]);
        spans.add(aN0, aN0 + m[2].length, 'when', m[2]);
        tm = { time: eod ? '17:00' : lunch ? '13:00' : '12:00', text: m[2], note: eod ? 'end of day, so 5:00 PM' : lunch ? 'after lunch, so 1:00 PM' : '' };
        var nb = /^(before|avant|by)\s/.test(m[2]), na = /^(after|apres)\s/.test(m[2]) || lunch;
        if (nb) { tm.cons = { before: tm.time, text: 'ending by ' + T.fmtTime(tm.time) }; tm.note = 'before ' + T.fmtTime(tm.time) + ': the latest time'; }
        else if (na) tm.cons = { after: tm.time, text: 'at or after ' + T.fmtTime(tm.time) };
      }
    }
    var first = /(^|[^a-z])(first thing|premiere heure|a la premiere heure)(?=[^a-z]|$)/.exec(f);
    if (first && !tm) { spans.add(first.index + first[1].length, first.index + first[0].length, 'when', first[2]); tm = { time: morning(), text: first[2], note: 'first thing, so your default morning time' }; }
    // "tonight at 8", "Thursday afternoon at 2", "ce soir à 7 h": the part of the day decides am or pm
    if (found && tm && /(evening|night|tonight|soir|afternoon|apres-midi)/.test(found.text) && +tm.time.slice(0, 2) < 12 && !/a\.?m/.test(tm.text)) tm.time = T.pad(+tm.time.slice(0, 2) + 12) + tm.time.slice(2);
    if (found && tm) { found.time = tm.time; found.text += ' ' + tm.text; found.timeText = tm.text; found.note = tm.note || ''; found.cons = tm.cons || null; }
    else if (!found && tm) found = { date: T.today(), time: tm.time, text: tm.text, timeText: tm.text, note: tm.note || 'today assumed', approx: false, cons: tm.cons || null };
    if (found && !found.time) { found.time = morning(); found.note = 'no time given, so your default morning time'; }
    return found;
  }

  // A clock time: "at 10", "4:30", "5:15", "3pm", "17 h 15", "after 5", "vers 14 h"
  function TIME_RE() { return /(^|[^0-9a-z])((?:at|a|vers|for|@|after|apres|before|avant|by|from|de|to|until|jusqu'a|des)\s?)?(\d{1,2})(?:\s?(?::|h)\s?(\d{2}))?\s?(a\.?m\.?|p\.?m\.?|h)?(?=[^0-9a-z]|$)/g; }
  function timeAt(m) {
    var hasPrefix = !!m[2], mins = m[4], ap = m[5];
    if (!hasPrefix && !mins && !ap) return null;
    var h = +m[3]; if (h > 23) return null;
    if (ap && /p/.test(ap) && h < 12) h += 12;
    else if (ap && /a/.test(ap) && h === 12) h = 0;
    else if (!ap || ap === 'h') { if (ap !== 'h' && h >= 1 && h <= 6) h += 12; }
    return T.pad(h) + ':' + (mins || '00');
  }
  // Moving an event: the source time or date identifies it, the target ("to 5:15", "à jeudi 14 h") is the new slot.
  var RE_PUSH = /(^|[^a-z])(push|bump|bring|move|put|retarde|repousse|recule|avance|decale|devance)\b[^.;!?]{0,60}?\b(back|later|forward|earlier|up|plus tard|plus tot|de)?\s*(?:by\s+|de\s+)?(\d+|an?|one|two|three|half an?|une?|deux|trois|une demi)[- ]?\s*(hours?|heures?|h|minutes?|mins?)\b(?:\s+(back|later|earlier|forward|plus tard|plus tot))?/;
  function findMove(f, lang) {
    var vm = /(^|[^a-z])(moving|moved|rescheduled|pushed|postponed|brought|deplacee?s?|reportee?s?|decalee?s?|devancee?s?|repoussee?s?|reschedule|move|push|bump|bring|postpone|change|shift|put|slide|deplace|deplacer|deplacez|reporte|reporter|reportez|devance|devancer|avance|avancer|avancez|decale|decaler|decalez|retarde|retarder|retardez|repousse|repousser|repoussez|recule|reculer|reculez)(?=[^a-z])/.exec(f);
    if (!vm) return null;
    var after = vm.index + vm[0].length, rest = f.slice(after), mv = { fromTime: null, fromDate: null, toTime: null, toDate: null, offset: null, vague: null };
    var look = ')\\s(?=[^.;!?]*?(\\d|tomorrow|demain|today|aujourd|next|prochain|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|noon|midi|tonight|ce soir|this|cet|ce |jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|janv|fev|avr|mai|juin|juil|aout|sept|octo|nove|dece))';
    var EN_C = 'to|until|till|for', FR_C = 'a|au|pour|vers|jusqu\'a';
    // the clause's own language first; a short French clause can be read as English, so the other set is the fallback
    var conn = new RegExp('\\s(' + (lang === 'FR' ? FR_C + '|to' : EN_C) + look).exec(rest) || new RegExp('\\s(' + (lang === 'FR' ? EN_C : FR_C) + look).exec(rest);
    var cut = conn ? after + conn.index : f.length;
    var head = f.slice(0, cut), tail = conn ? f.slice(cut) : '';
    var fromRe = /(^|[^a-z])(from|de|du)\s+(?=\d)/.exec(head);
    function when(sub) { var w = findWhen(sub, new Spans()); return w; }
    var hw = when(head), tw = tail ? when(tail) : null;
    if (hw && hw.phrase) mv.fromDate = hw.date;
    if (hw && hw.timeText) mv.fromTime = hw.time;
    if (tw && tw.phrase) mv.toDate = tw.date;
    if (tw && (tw.timeText || tw.fixedTime)) mv.toTime = tw.time;
    // "to 7:30" with no am/pm: the planner reads it next to the event it moves (an evening meeting stays in the evening)
    if (mv.toTime && tw && tw.timeText && !/(am|pm|a\.m|p\.m|matin|soir|apres-midi|morning|evening|afternoon|tonight|noon|midi)/.test(tail) && +mv.toTime.slice(0, 2) >= 7 && +mv.toTime.slice(0, 2) <= 11) mv.toAmbig = true;
    var pm = RE_PUSH.exec(f);
    if (pm && !mv.toTime) {
      var amt = /half|demi/.test(pm[4]) ? 30 : (num(pm[4]) || 1) * (/^(m)/.test(pm[5]) ? 1 : 60);
      var dir = (pm[3] || '') + ' ' + (pm[6] || '') + ' ' + pm[2];
      mv.offset = /(forward|earlier|up|plus tot|avance|devance)/.test(dir) ? -amt : amt;
    } else if (!mv.toTime && !mv.toDate && /(earlier|later|plus tot|plus tard|sooner)/.test(f)) mv.vague = /(earlier|plus tot|sooner)/.test(f) ? 'earlier' : 'later';
    if (fromRe && !mv.fromTime) { var fw = when(head.slice(fromRe.index)); if (fw && fw.timeText) mv.fromTime = fw.time; }
    return mv;
  }

  /* ---------- money ---------- */
  var MONEY_CTX = {
    fees: /(condo fees?|fees?|frais( de condo| de copropriete)?|a month|per month|\/month|monthly|par mois|mensuel)/g,
    budget: /(budget|up to|maximum|max|afford|pre-?approv|jusqu'a|plafond)/g,
    price: /(price|asking|offer|prix|offre|listed at)/g
  };
  function nearest(f, re, idx, endIdx) {
    var best = 1e9, m;
    re.lastIndex = 0;
    while ((m = re.exec(f))) {
      var d = m.index < idx ? idx - (m.index + m[0].length) : m.index - endIdx;
      if (m.index >= idx && d > 14) continue; // keywords after the number must be close ("350 a month")
      if (d >= 0 && d < best) best = d;
    }
    return best;
  }
  function findMoney(f, spans) {
    var out = [], m;
    var re = /(c?\$\s?)?(\d{1,3}(?:[   ,]\d{3})+|\d+(?:[.,]\d+)?)(\s?(k|thousand|mille|million|m)(?=[^a-z]|$))?(\s?\$|\s?dollars)?/g;
    while ((m = re.exec(f))) {
      var a = m.index, b = m.index + m[0].length;
      while (b > a && f[b - 1] === ' ') b--;
      if (!spans.free(a, b)) continue;
      var raw = m[2], suffix = m[4], dollar = !!(m[1] || m[5]);
      var grouped = /[   ,]\d{3}$/.test(raw) && !/[.,]\d{1,2}$/.test(raw);
      var v = grouped ? +raw.replace(/[^\d]/g, '') : +raw.replace(',', '.');
      if (suffix === 'k' || suffix === 'thousand' || suffix === 'mille') v *= 1000;
      if (suffix === 'million' || suffix === 'm') v *= 1e6;
      if (isNaN(v) || v <= 0) continue;
      var dF = nearest(f, MONEY_CTX.fees, a, b), dB = nearest(f, MONEY_CTX.budget, a, b), dP = nearest(f, MONEY_CTX.price, a, b);
      var kind = null;
      if (v < 5000 && dF < 60) kind = 'fees';
      else if (v >= 20000 && dB <= dP && dB < 60) kind = 'budget';
      else if (v >= 20000 && dP < 60) kind = 'price';
      else if (v >= 20000 && (dollar || suffix || grouped)) kind = 'budget';
      if (!kind) continue;
      var pre = f.slice(Math.max(0, a - 16), a);
      var band = /(under|below|less than|max|up to|moins de|sous|jusqu'a)\s*$/.test(pre) ? 'max' : /(over|above|more than|at least|from|plus de|au moins)\s*$/.test(pre) ? 'min' : /between\s*$|entre\s*$/.test(pre) ? 'min' : /\band\s*$|\bet\s*$/.test(pre) && out.length && out[out.length - 1].band === 'min' ? 'max' : null;
      spans.add(a, b, kind, kind === 'fees' ? T.money(v) + '/month' : T.money(v));
      out.push({ kind: kind, value: v, start: a, end: b, band: band });
    }
    return out;
  }

  /* ---------- features, signals, promises ---------- */
  var FEATURES = [
    { key: 'garage', re: /(garage|indoor parking)/g },
    { key: 'parking', re: /(stationnement|parking|place de stationnement)/g }
  ];
  var REQ = /(essential|essentiel(le)?|must|a must|required|requirement|non-negotiable|needs?|wants?|has to have|obligatoire|indispensable|absolument|veut)/;
  var PREF = /(nice to have|would be nice|prefer|bonus|souhaite|aimerait|serait un plus)/;
  var DROP = /(no longer|doesn't need|not needed|pas besoin|plus necessaire)/;
  function clauseAround(f, a, b) {
    var left = f.lastIndexOf('.', a), l2 = Math.max(left, f.lastIndexOf(',', a), f.lastIndexOf(' but ', a), f.lastIndexOf(' mais ', a), f.lastIndexOf(' and ', a), f.lastIndexOf(' et ', a));
    var r = f.slice(b).search(/[.,;!?]| but | mais | and | et /);
    return f.slice(l2 + 1, r === -1 ? f.length : b + r);
  }
  function findFeatures(f, spans) {
    var out = {};
    FEATURES.forEach(function (ft) {
      var m; ft.re.lastIndex = 0;
      while ((m = ft.re.exec(f))) {
        var a = m.index, b = a + m[0].length;
        var cl = clauseAround(f, a, b), strength = REQ.test(cl) ? 'required' : DROP.test(cl) ? 'none' : PREF.test(cl) ? 'preferred' : null;
        if (!strength) continue;
        spans.add(a, b, 'feature', ft.key);
        var sm = cl.match(REQ) || cl.match(DROP) || cl.match(PREF);
        if (sm) { var si = f.indexOf(sm[0], Math.max(0, a - 40)); if (si > -1) spans.add(si, si + sm[0].length, 'feature', strength); }
        out[ft.key] = strength;
        break;
      }
    });
    return out;
  }
  function cleanObject(s) {
    return s.replace(/^\s*(the|la|le|les|l'|un|une|des)\s+/i, function (x) { return x; }).replace(/\s+$/, '').replace(/^\s+/, '');
  }
  function findSignals(text, f, spans) {
    var pos = [], neg = [], m;
    var reP = /(^|[^a-z])(loved|loves|love|liked|likes|enjoyed|appreciated|was impressed by|really liked|a adore|adore|a aime|aime|a apprecie|apprecie)\s+([^.,;!?]+?)(?=(,|\.|;|!|\?| but | mais | and the | et |$))/g;
    while ((m = reP.exec(f))) {
      var a = m.index + m[1].length, b = a + m[2].length + 1 + m[3].length;
      if (/^(to|de|d')\b/.test(m[3])) continue;
      if (spans.add(a, b, 'positive', 'liked')) pos.push({ text: cleanObject(text.slice(a + m[2].length + 1, b)), quote: text.slice(a, b) });
    }
    var reN = /(?:\s(?:felt|feels|was|were|is|are|seemed|seem|looked|etait|est|sont|semblait)|['’]s)\s(?:a bit |a little |way |much |un peu |beaucoup )?(too (?:much |many )?([a-z-]{3,})|not ([a-z-]{3,}) enough|trop (?:de |d')?([a-z-]{3,})|pas assez (?:de |d')?([a-z-]{3,}))/g;
    while ((m = reN.exec(f))) {
      var coreA = m.index, b2 = m.index + m[0].length;
      // walk back to the clause boundary (punctuation, conjunction or a span already used)
      var lo = Math.max(0, coreA - 48), seg = f.slice(lo, coreA), cut = -1, bm, reB = /([.,;!?]|\sbut\s|\sand\s|\smais\s|\set\s|\swhile\s)/g;
      while ((bm = reB.exec(seg))) cut = bm.index + bm[0].length;
      var a2 = lo + (cut > -1 ? cut : 0);
      spans.list.forEach(function (sp) { if (sp.end <= coreA && sp.end > a2) a2 = sp.end; });
      while (a2 < coreA && f[a2] === ' ') a2++;
      var subj = text.slice(a2, coreA).replace(/^((she|he|they|il|elle|[A-ZÀ-Ý][\wÀ-ÿ'-]*) )?(said|says|thought|thinks|felt|feels|finds|found|mentioned|told me|trouve|trouvait|pense|pensait|a dit|dit)\s+(that\s+|que\s+|qu['’])?/i, '');
      if (subj.split(' ').length > 6 || subj.length < 2) continue;
      if (spans.add(a2, b2, 'objection', 'concern')) neg.push({ text: cleanObject(subj), quote: text.slice(a2, b2) });
    }
    var reN2 = /(^|[^a-z])((?:(?:il|elle|she|he|they|ils)\s)?(?:trouve|trouvent|trouvait|thinks|think|finds|find|found|felt))\s([^.,;!?]+?)\s(is |are |was |were |est |sont |etait )?(too (?:much |many )?([a-z-]{3,})|not ([a-z-]{3,}) enough|trop (?:de |d')?([a-z-]{3,})|pas assez (?:de |d')?([a-z-]{3,}))/g;
    while ((m = reN2.exec(f))) {
      var a3 = m.index + m[1].length, b3 = m.index + m[0].length;
      var subj3 = text.slice(a3 + m[2].length + 1, a3 + m[2].length + 1 + m[3].length).replace(/\s+(is|are|was|were|est|sont)$/i, '');
      if (spans.add(a3, b3, 'objection', 'concern')) neg.push({ text: cleanObject(subj3), quote: text.slice(a3, b3) });
    }
    var reN3 = /(^|[^a-z])(didn't like|did not like|disliked|n'a pas aime|was worried about|is worried about|concerned about|inquiete? (de|pour|par))\s([^.,;!?]+)/g;
    while ((m = reN3.exec(f))) {
      var a4 = m.index + m[1].length, b4 = m.index + m[0].length;
      var subj4 = text.slice(b4 - m[4].length, b4);
      if (spans.add(a4, b4, 'objection', 'concern')) neg.push({ text: cleanObject(subj4), quote: text.slice(a4, b4) });
    }
    return { positive: pos, objections: neg };
  }
  var PROMISE = /(^|[^a-z])(i promised(?: to)?|i told (?:her|him|them) i'?d|i'll|i will|i need to|i have to|i owe (?:her|him|them)|je lui ai promis (?:d'|de )?|je leur ai promis (?:d'|de )?|j'ai promis (?:d'|de )?|je vais lui|je dois lui|je dois)\s?([^.!?;]+)/;
  function findPromise(text, f, spans) {
    var m = PROMISE.exec(f);
    if (!m) return null;
    var a = m.index + m[1].length, b = m.index + m[0].length;
    spans.add(a, b, 'promise', 'commitment');
    return { trigger: m[2], clause: text.slice(b - m[3].length, b).trim(), foldedClause: m[3].trim(), start: a, end: b };
  }

  /* ---------- intent ---------- */
  var RE_RECOVERY = /who (should|do|must|could) i (follow up|call|contact|reach out|get back|check in)|who needs (a )?(follow-?up|a call)|qui (dois-je|devrais-je|je dois|est-ce que je dois) (relancer|rappeler|appeler|contacter)|(haven'?t|have not|didn'?t|did not|never)( i| we)? (followed|follow|reached|contacted|called|written|heard|talked|spoken|spoke|been in touch)|not (talked|spoken) to|follow[- ]?ups? (i owe|due|overdue)|follow-ups i owe|overdue follow|take care of my follow|neglect|dormant|recover|reconnect|re-?engage|lose money|losing|slipping|relanc|pas fait de suivi|suivis? en retard|oublie/;
  var RE_FILE = /(file|dossier|transaction|closing|notary|notaire|financing|financement|deed|deadline|conditions?)/;
  var RE_FILE_ASK = /(summar|status|what needs|attention|check|where are we|where do we stand|resume|ou en est|update me)/;
  var RE_BRIEF = /(brief me|briefing|what do i need to know|what should i know|prepare me\b|remind me about|before (the|my) [a-z' ]{0,30}(call|showing|meeting|visit|presentation)|resume-moi|que dois-je savoir)/;
  var RE_SCHED = /(^|[^a-z])(book|schedule|set up|arrange|organize|plan|planifie|reserve|organise|fixe|cale|prevois|ajoute un rendez-vous)(?=[^a-z])/;
  var RE_RESCHED = /(open house|showing|visit|call|meeting|inspection|deed|signing|presentation|photographer|review|appointment|visite|appel|rencontre|rendez-vous|signature)[^.;!?]{0,30}?\b(is|was|has been|have been|got|been|est|a ete|sont|ont ete|is being) (moved|moving|rescheduled|pushed( back)?|postponed|brought forward|deplacee?s?|reportee?s?|decalee?s?|devancee?s?|repoussee?s?)(?=[^a-z])|(^|[^a-z])(reschedule|move|push back|postpone|bring forward|deplace|reporte|devance|decale|retarde|repousse|change the time)(?=[^a-z])|(^|[^a-z])(push|bump|bring|shift|slide)\b[^.;!?]{0,60}?\b(back|forward|later|earlier|to \d+|by \d+|by an?|by half|until|to (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|noon|the \d+))\b|(^|[^a-z])(change|switch)\b[^.;!?]{0,40}?\b(\d{1,2}(:\d{2})?|call|showing|visit|meeting|presentation|open house|appointment|review|photographer|deed|signing|rendez-vous|rencontre|visite|appel)\b[^.;!?]{0,40}?\bto\s+(\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next|noon)|(^|[^a-z])(avance|avancer|recule|reculer)\b[^.;!?]{0,50}\b(de \d|plus tot|plus tard|a \d|au (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)|a (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|midi))/;
  var RE_CANCEL = /(^|[^a-z])(cancel|call off|annule|annuler)(?=[^a-z]|$)/;
  var RE_TASK = /(remind me( [^.,;!?]{1,40}?)? to |reminder to|add a task|create a task|new task|to-?do|rappelle-moi( [^.,;!?]{1,40}?)? (de |d')|ajoute une tache|cree une tache|don'?t forget to|n'oublie pas de)/;
  var RE_WANT = /(^|[^a-z])(wants?|would like|is looking for|looking for|interested in|needs?|veut|cherche|aimerait|souhaite|a besoin d'?e?|interessee? par|interessee? a|interessee?s? par)(?=[^a-z])/g;
  var EVT_WORDS = [
    [/(open house|visite libre|portes ouvertes)/, function (a) { return a.kind === 'open-house'; }, 'open house'],
    [/(photographer|photo shoot|photographe|seance photo)/, function (a) { return /photo/i.test(a.title); }, 'photographer visit'],
    [/(^|[^a-z])inspection/, function (a) { return /inspection/i.test(a.title); }, 'inspection'],
    [/(deed|signing|signature)/, function (a) { return a.kind === 'deed'; }, 'deed signing'],
    [/(pricing review|price review|revision de prix|rencontre sur le prix)/, function (a) { return /pricing/i.test(a.title); }, 'pricing review'],
    [/(listing presentation|presentation)/, function (a) { return /presentation/i.test(a.title); }, 'presentation'],
    [/(^|[^a-z])(call|appel)(?=[^a-z]|$)/, function (a) { return a.kind === 'call'; }, 'call'],
    [/(second showing|showing|visit(?!e libre)|visite(?! libre))/, function (a) { return a.kind === 'showing'; }, 'showing'],
    [/(meeting|rencontre|rendez-vous|rdv)/, function (a) { return a.kind === 'meeting'; }, 'meeting']
  ];
  // a task points at an existing event only through "about / after / before the …" ("book the photographer" is a new one)
  var RE_EVTREF_ABOUT = /(about|after|before|regarding|following|apres|avant|concernant|au sujet de)\s+(my|the|tomorrow's|today's|ma|mon|la|le|l')\s*(\d{1,2}(:\d{2})?|open house|visite libre|inspection|photographer|deed|signing|pricing review|presentation|call|appel|showing|visite|meeting|rencontre)/;
  var RE_EVTREF = /(^|[^a-z])(my|the|tomorrow's|today's|ma|mon|la|le|l')\s+(\d{1,2}(:\d{2})?|open house|visite libre|inspection|photographer|deed|signing|pricing review|presentation|call|appel|showing|visite|meeting|rencontre)/;
  var RE_VISIT = /(wants? to (see|visit|view|tour|go back to)|would like to (see|visit|view|tour)|wants? (a |an |another |a second |one more )?(second )?(visit|showing|viewing|tour|look)|(asked|asking) for (a |another |a second )?(visit|showing|viewing)|veut (visiter|voir|revoir|retourner)|veut (une |une autre |une deuxieme |une seconde )?(visite|deuxieme visite)|aimerait (visiter|voir|revoir)|souhaite (visiter|voir|revoir)|demande (une |une autre |une deuxieme )?visite)/;
  var RE_LOGCALL = /(^|[^a-z])(called|spoke (with|to)|phoned|talked (with|to)|log (a|the|my) call|call with|had a (quick |short )?(chat|call|talk) with|chatted with|caught up with|j'ai appele|appel avec|parle (a|avec)|jase avec)(?=[^a-z])/;
  var RE_SENDL = /(^|[^a-z])(send|share|email|forward|envoie|envoyer|partage)\b[^.?!]*\b(listings?|propert|options?|condos?|houses?|duplex|townhouses?|bungalows?|inscriptions?|proprietes?|fiches?|the [a-z-]+ (condo|house|duplex|townhouse))/;
  // Messages to the client ("tell him…", "let her know…", "ask him whether…", "remind her to…", "dis-lui que…")
  var RE_MSGSTART = /^(please\s+)?(tell(?! (me|us)\b)|inform(?! (me|us)\b)|let (him|her|them|[a-z][a-z'-]+( [a-z][a-z'-]+)?) know|ask (him|her|them|[a-z][a-z'-]+( [a-z][a-z'-]+)?) (whether|if|to|for|about)|remind (?!me\b)(him|her|them|[a-z][a-z'-]+( [a-z][a-z'-]+)?) (to|that|about|of)|email (him|her|them|[a-z][a-z'-]+( [a-z][a-z'-]+)?)(?! (the|a|an|two|three|some|those|these|her|his|my|our|listings?|propert)\b)|e-mail|text|write to|message (him|her|them)|send (him|her|them|[a-z][a-z'-]+) (a )?(quick )?(note|message|text|word)|send (a |an )?(quick )?(note|message|text|email|word) to|envoie(r|z)? (un |une )?(petit |court )?(courriel|message|texto|mot|note|courriel rapide) a|dis(-lui|-leur| a | lui )|dites(-lui|-leur| a )|ecris(-lui|-leur| a )|ecrivez(-lui| a )|avise|avisez|previens|prevenez|informe|informez|demande(-lui|-leur| a | lui )|demandez(-lui| a )|rappelle(-lui|-leur)|rappelez(-lui|-leur))/;
  // Follow-ups with a client ("follow up Monday with…", "get back to her", "check in", "relance-le")
  // Writing to or calling a third party (the notary, the lender…) is a task for the broker, not a message to the client
  var RE_THIRD = new RegExp("^(please\\s+)?(can you\\s+|could you\\s+)?(ask|tell|call|phone|email|e-mail|text|contact|check with|confirm with|follow up with|let|remind|write to|demande|demander|appelle|appeler|ecris|ecrire|contacte|contacter|avise|aviser|verifie avec|confirme avec|relance|relancer|previens|dis)\\s+(a |au |aux )?(the |our |my |his |her |their |le |la |l'|les |leur |son |sa |mon |ma |notre )?(notary|notaire|lender|preteur|bank|banque|mortgage broker|courtier hypothecaire|inspector|inspecteur|appraiser|evaluateur|photographer|photographe|listing broker|other broker|seller'?s broker|buyer'?s broker|autre courtier|courtier inscripteur|stager|contractor|entrepreneur|syndicate|syndicat|condo board|lawyer|avocat|tenants?|locataires?)s?\\b");
  T.RE_THIRD = RE_THIRD;
  var RE_FOLLOWSTART = /^(please\s+)?(follow up|follow-up|followup|get back to|circle back|check in|touch base|reach out to|relance|relancer|relancez|fais un suivi|faire un suivi|fais le suivi|reviens vers|revenir vers)/;
  var RE_SEARCH = /(^|[^a-z])(find|search|show me|look for|looking for|any|trouve|cherche|montre)\b[^.?!]*\b(condos?|houses?|homes?|duplex|triplex|townhouses?|bungalows?|listings?|propert|maisons?|plex|semi)/;
  var RE_CMA = /(^|[^a-z])(cma|market evaluation|market value|comparative market|evaluation|evaluer|comparables|what (could|would|will) [^.?!]{0,40} sell for|price the (house|home|condo))/;
  var RE_EVENT = /(showing|visit|visite|viewing|meeting|rendez-vous|rdv|call|appel|tour)/;
  var RE_CALLTASK = /(^|[^a-z])(call|phone|rappeler|appeler|text)\s/;
  var RE_RECAP = /(showing|showed|shown|visite|visit|viewing|toured|tour of|took [a-z'-]+(?: [a-z'-]+)? (to see|through)|saw the|fait visiter|montre|just left|just finished|finished the|walked through|just got off|hung up|after the (showing|call|visit)|terminee|je sors de|je viens de|called|spoke with|spoke to|phoned|talked to|talked with|call with|had a (quick |short )?(chat|call|talk)|chatted with|caught up with|appel avec|j'ai appele|jase avec)/;
  // "showed 2280 1re Avenue to Jonathan", "visited … with Louis", "took Annie to see …", "j'ai fait visiter …": a showing happened
  var RE_SHOWED = /(^|[^a-z])(showed|shown|visited|toured|took [a-z'-]+(?: [a-z'-]+)? (?:to see|through)|walked [a-z'-]+(?: [a-z'-]+)? through|fait visiter|a visite|ai visite|avons visite|ont visite|montre)(?=[^a-z]|$)/;
  T.RE_SHOWED = RE_SHOWED;
  var RE_NOTE = /(remember|note that|make a note|retiens|prends note|note:)/;

  T.parse = function (raw, popts) {
    popts = popts || {};
    var text = String(raw || '').replace(/\s+/g, ' ').trim().normalize('NFC');
    var f = fold(text);
    var spans = new Spans();
    var frScore = (f.match(FR_MARKERS) || []).length, enScore = (f.match(EN_MARKERS) || []).length;
    var lang = frScore > enScore ? 'FR' : 'EN';

    var places = findPlaces(f, spans), place = places.filter(function (x) { return x.kind === 'listing'; })[0] || places[0] || null;
    var mentions = findClients(f, spans, text);
    var areas = findAreas(f, spans), types = findTypes(f, spans), beds = findBeds(f, spans);
    var isRecovery = RE_RECOVERY.test(f);
    var days = isRecovery ? findDays(f, spans) : null;
    var when = findWhen(f, spans);
    var money = findMoney(f, spans);
    var features = findFeatures(f, spans);
    var sig = findSignals(text, f, spans);
    var promise = findPromise(text, f, spans);

    // ---- resolve client ----
    var s = T.store.state, clientId = null, why = '', ambiguous = null, mention = null, viaPlace = null;
    var ids = [];
    mentions.forEach(function (mm) { mm.ids.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); }); });
    // A surname alone counts only with corroboration: a pronoun, the client of your last request, or an upcoming event
    // or open file of that client. Otherwise it becomes a question, never a silent match.
    var pronounHere = /(^|[^a-z])(he|she|him|her|his|they|them|il|elle|lui|leur|son|sa|ses)(?=[^a-z]|$)|-(lui|le|la)(?=[^a-z]|$)/.test(f);
    mentions.forEach(function (mm) {
      if (mm.by !== 'last name') return;
      var ctxId = s.context && s.context.clientId;
      var byEvent = mm.ids.filter(function (id) { return T.cal.active().some(function (a) { return a.client === id && (a.date + 'T' + a.end) >= T.nowISO(); }) || s.transactions.some(function (t) { return t.client === id && t.stage !== 'Closed'; }); });
      if (ctxId && mm.ids.indexOf(ctxId) > -1) { mm.ids = [ctxId]; mm.by = 'last name, the client of your last request'; }
      else if (byEvent.length === 1 && mm.ids.length > 1) { mm.ids = byEvent; mm.by = 'last name, the only one with an upcoming appointment or open file'; }
      else if (byEvent.length) mm.by = 'last name' + (mm.ids.length === 1 ? ', with an upcoming appointment or open file' : '');
      else if (!pronounHere) mm.weak = true;
    });
    var definite = mentions.filter(function (mm) { return mm.ids.length === 1 && !mm.weak; });
    // Two clients joined by "and" ("book Sofia and Raj") ask for one action for both: the planner asks instead of guessing
    var together = [];
    for (var mi = 1; mi < definite.length; mi++) if (definite[mi].ids[0] !== definite[mi - 1].ids[0] && /^\s*(and|et|&|,|or|ou)\s*$/.test(f.slice(definite[mi - 1].end, definite[mi].start))) together = together.concat(definite[mi - 1].ids, definite[mi].ids);
    together = together.filter(function (id, k, a) { return a.indexOf(id) === k; });
    if (definite.length) { clientId = definite[0].ids[0]; mention = definite[0]; why = 'Matched by ' + mention.by + '.'; }
    else if (mentions.length) {
      mention = mentions[0];
      var cands = mention.ids;
      var todays = s.appointments.filter(function (a) { return a.date === T.today() && cands.indexOf(a.client) > -1; });
      if (place) {
        var viaPlace = s.appointments.filter(function (a) { return cands.indexOf(a.client) > -1 && (a.listing === place.id || (a.place || '').indexOf(place.label.split(',')[0]) === 0) && Math.abs(T.daysBetween(a.date, T.today())) <= 7; });
        if (viaPlace.length === 1) { clientId = viaPlace[0].client; why = 'Matched through ' + (viaPlace[0].date === T.today() ? 'today’s ' : T.fmtDate(viaPlace[0].date) + ' ') + T.fmtTime(viaPlace[0].start) + ' ' + viaPlace[0].title.toLowerCase() + ' at ' + viaPlace[0].place + '.'; }
      }
      if (!clientId && RE_RECAP.test(f)) {
        var shows = todays.filter(function (a) { return a.kind === 'showing'; });
        if (shows.length === 1) { clientId = shows[0].client; why = 'Matched through today’s ' + T.fmtTime(shows[0].start) + ' showing.'; }
      }
      if (!clientId && cands.length === 1 && !mention.weak) { clientId = cands[0]; why = 'Matched by ' + mention.by + '.'; }
      if (!clientId) ambiguous = cands.slice();
      else if (cands.length > 1) {
        var others = cands.filter(function (id) { return id !== clientId; }).map(function (id) { var c = T.client(id); return T.fullName(c) + ' (' + c.role.toLowerCase() + ')'; });
        why += ' Not ' + others.join(' or ') + ': no matching appointment with them.';
      }
    } else if (place && !(mentions.unknown && mentions.unknown.length)) {
      var ap = s.appointments.filter(function (a) { return a.date === T.today() && (a.listing === place.id); })[0];
      if (ap) { clientId = ap.client; viaPlace = 'visited'; why = 'No name heard. Inferred from today’s ' + T.fmtTime(ap.start) + ' showing at this address.'; }
      var txp = place.kind === 'tx' && T.tx(place.id);
      if (!clientId && txp) { clientId = txp.client; viaPlace = 'own'; why = 'No name heard. The address belongs to the ' + txp.title + ' file.'; }
    }
    // "for Rue Saint-Laurent": no name and no listing, but one client's upcoming event is on that street
    if (!clientId && !ambiguous && !mentions.length && !place && !(mentions.unknown && mentions.unknown.length)) {
      var sre = RE_ZONES[0], sm, streets = [];
      sre.lastIndex = 0;
      while ((sm = sre.exec(f))) streets.push(sm[2].replace(/\.\s/, ' '));
      streets.forEach(function (st) {
        if (clientId) return;
        var evs = T.cal.active().filter(function (a) { return a.client && (a.date + 'T' + a.end) >= T.nowISO() && fold(a.place || '').indexOf(st) > -1; });
        var who2 = evs.map(function (a) { return a.client; }).filter(function (id, k, arr) { return arr.indexOf(id) === k; });
        if (who2.length === 1) { clientId = who2[0]; viaPlace = evs[0].kind === 'showing' ? 'visited' : 'own'; why = 'No name heard. ' + st.replace(/(^|\s|-)([a-z])/g, function (x, a, b) { return a + b.toUpperCase(); }) + ' is where ' + T.fullName(T.client(clientId)) + '’s ' + evs[0].title.toLowerCase() + ' is (' + T.fmtDT(evs[0].date + 'T' + evs[0].start) + ').'; }
      });
    }
    // No name, but the request points at an event ("my 4:30", "tomorrow's open house", "the inspection on Monday"):
    // one match gives the client, several matches ask, none falls through to the usual question
    var anchorText = null;
    // (inside a longer message, "her"/"him" already points at the client named there, so no anchoring)
    var hasPro = /(^|[^a-z])(him|her|them|his|lui|leur|son|sa|ses)(?=[^a-z]|$)|-(lui|leur|le|la)(?=[^a-z]|$)/.test(f);
    if (!clientId && !ambiguous && !mentions.length && !(mentions.unknown && mentions.unknown.length) && !(popts.noContext && hasPro) && (RE_RESCHED.test(f) || RE_CANCEL.test(f) || RE_MSGSTART.test(f) || ((RE_TASK.test(f) || RE_FOLLOWSTART.test(f)) && RE_EVTREF_ABOUT.test(f)))) {
      var mvx = RE_RESCHED.test(f) ? findMove(f, lang) : null, wx = findWhen(mvx ? f.slice(0, Math.max(0, f.search(/\s(to|until|a|au|pour|vers)\s/)) || f.length) : f, new Spans());
      var atT = mvx && mvx.fromTime || (wx && wx.timeText ? wx.time : null), atD = mvx && mvx.fromDate || (wx && wx.phrase ? wx.date : null);
      var kindW = EVT_WORDS.filter(function (k) { return k[0].test(f); })[0];
      if (atT || kindW) {
        var cand = T.cal.active().filter(function (a) { return a.client && (a.date + 'T' + a.end) >= T.nowISO() && (!atD || a.date === atD) && (!atT || a.start === atT) && (!kindW || kindW[1](a)); });
        var cl = cand.map(function (a) { return a.client; }).filter(function (id, k, arr) { return arr.indexOf(id) === k; });
        var what = (kindW ? kindW[2] : 'appointment') + (atT ? ' at ' + T.fmtTime(atT) : '') + (atD ? ' ' + (atD === T.today() ? 'today' : atD === T.addDays(T.today(), 1) ? 'tomorrow' : 'on ' + T.fmtDate(atD)) : '');
        if (cl.length === 1) { clientId = cl[0]; why = 'No name heard. The ' + what + ' is ' + T.fullName(T.client(clientId)) + '’s ' + cand[0].title.toLowerCase() + (cand[0].place ? ' at ' + cand[0].place : '') + ', the only match in your calendar.'; }
        else if (cl.length > 1) { ambiguous = cl; anchorText = what; }
      }
    }
    // "Tell him…", "Move it to 5:15" right after a plan about someone: the pronoun points at that client (shown on the card)
    var ctxC = s.context && s.context.clientId && T.client(s.context.clientId), pro = null;
    if (!popts.noContext && !clientId && !ambiguous && !mentions.length && !(mentions.unknown && mentions.unknown.length) && !place && ctxC && (pro = /(^|[^a-z])(him|her|them|he|she|his|lui|leur|il|elle|it|ca)(?=[^a-z]|$)|-(lui|leur|le|la)(?=[^a-z]|$)/.exec(f))) {
      clientId = ctxC.id; why = 'No name heard. “' + (pro[2] || '-' + pro[3]) + '” read as ' + T.fullName(ctxC) + ', from your last request.'; var fromContext = true;
    }

    // property from the calendar when not said
    var listingId = place ? place.id : null, listingWhy = place ? 'Address heard in your note.' : '';
    if (place && place.kind !== 'listing') { listingId = null; listingWhy = ''; }
    if (!listingId && clientId && RE_RECAP.test(f) && !RE_LOGCALL.test(f)) {
      var recent = s.appointments.filter(function (a) { return a.client === clientId && a.listing && a.status !== 'cancelled' && (a.date + 'T' + a.start) <= T.nowISO() && T.daysBetween(a.date, T.today()) <= 3; }).pop();
      if (recent) { listingId = recent.listing; listingWhy = 'Not said. Taken from the ' + T.fmtDate(recent.date) + ' ' + T.fmtTime(recent.start) + ' showing in your calendar.'; }
    }

    var budget = null, fees = null, price = null, budgetMin = null, budgetMax = null;
    money.forEach(function (mo) {
      if (mo.kind === 'budget' && mo.band === 'min') budgetMin = mo.value;
      else if (mo.kind === 'budget' && mo.band === 'max') budgetMax = mo.value;
      if (mo.kind === 'budget' && budget == null) budget = mo.value;
      if (mo.kind === 'fees' && fees == null) fees = mo.value;
      if (mo.kind === 'price' && price == null) price = mo.value;
    });
    // "the Limoilou condo" / "le condo de Limoilou": a definite property named by type and area, resolved only when unique
    if (!place) {
      var dm = /(^|[^a-z])(the|le|la|l')\s+(?:([a-z-]+)\s+)?(condo|townhouse|duplex|triplex|bungalow|house|maison|maison de ville|jumele)(?:\s+(?:in|on|de|du|a|en)\s+([a-z-]+(?:\s[a-z-]+)?))?/.exec(f);
      if (dm) {
        var tWord = dm[4], aWords = [dm[3] || '', dm[5] || ''].join(' ');
        var tType = (TYPES.filter(function (t) { return new RegExp('^(' + t[0] + ')$').test(tWord); })[0] || [])[1];
        var tArea = Object.keys(T.AREAS || {}).filter(function (ar) { return aWords.indexOf(fold(ar)) > -1; })[0];
        if (tType && tArea) {
          var uniq = T.LISTINGS.filter(function (l) { return l.type === tType && l.area === tArea; });
          if (uniq.length === 1) { place = { id: uniq[0].id, label: uniq[0].address, kind: 'listing', start: dm.index + dm[1].length, end: dm.index + dm[0].length, by: 'type and area' }; places.push(place); }
        }
      }
    }
    // preferences stated as wants ("she wants to see condos in Limoilou", "she now needs 2 bedrooms"), clause by clause
    var memSets = [], wm;
    RE_WANT.lastIndex = 0;
    while ((wm = RE_WANT.exec(f))) {
      var wa = wm.index + wm[1].length, rest = f.slice(wa), we = rest.search(/[.;!?]| but | mais |, (book|remind|send|cancel|call|envoie|annule)/);
      var cl = rest.slice(0, we < 0 ? rest.length : we), cs = wa, ce = wa + cl.length;
      if (/^(wants?|would like|veut|aimerait|souhaite) (to )?(see|visit|view|tour|visiter|voir) (the|le|la|l'|this|ce|cette)\b/.test(cl)) continue; // a specific property, not a preference
      var inCl = spans.list.filter(function (sp) { return sp.start >= cs && sp.end <= ce; });
      var tys = inCl.filter(function (sp) { return sp.type === 'type' && !/(the|le|la|l'|this|ce|cette)\s$/.test(f.slice(Math.max(0, sp.start - 6), sp.start)); }).map(function (sp) { return sp.label; });
      var ars = inCl.filter(function (sp) { return sp.type === 'area'; }).map(function (sp) { return sp.label; });
      var bd = inCl.filter(function (sp) { return sp.type === 'beds'; })[0];
      if (tys.length && !memSets.some(function (x) { return x.key === 'types'; })) memSets.push({ key: 'types', label: 'Property type', value: tys.filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ') });
      if (ars.length && !memSets.some(function (x) { return x.key === 'areas'; })) memSets.push({ key: 'areas', label: 'Areas', value: ars.join(', '), fallback: 'area' });
      if (bd && !memSets.some(function (x) { return x.key === 'beds'; })) memSets.push({ key: 'beds', label: 'Bedrooms (min)', value: beds + '+' });
    }
    // how the client wants to be reached: "prefers texts", "préfère les appels", "ne veut plus de courriels"
    var pm1 = /(prefers?|prefere|would rather|aime mieux|best reached by|rather be (?:contacted|reached) by)\s+(?:to be (?:contacted|reached) by\s+|d'etre joint par\s+|by\s+|par\s+|les\s+|des\s+)?(texts?|texting|sms|text messages?|textos?|calls?|phone calls?|phone|appels?|telephone|emails?|e-mails?|courriels?)(?=[^a-z]|$)/.exec(f);
    var noMail = /(no more emails?|stop emailing|stop sending (?:him |her |them )?emails?|doesn'?t want (?:any )?(?:more )?emails?|(?:ne )?veut plus (?:de |recevoir de )?courriels?|plus de courriels?|pas de courriels?)/.test(f);
    if (pm1 || noMail) {
      var ch = noMail ? 'No email (client asked)' : /text|sms|texto/.test(pm1[2]) ? 'Text messages' : /call|phone|appel|telephone/.test(pm1[2]) ? 'Phone calls' : 'Email';
      memSets.push({ key: 'contact', label: 'Best way to reach', value: ch, consentNote: noMail ? 'Email consent on file is not changed by this note. If the client withdrew consent, update it on their record.' : '' });
    }
    var tx = (RE_FILE.test(f) || place && place.kind === 'tx') ? (place && place.kind === 'tx' ? T.tx(place.id) : T.files.match(f) || (clientId && T.files.forClient(clientId)[0]) || null) : null;

    if (place && place.by === 'type and area' && !listingId) { listingId = place.id; listingWhy = 'Not given by address: the only ' + T.listing(place.id).type.toLowerCase() + ' in ' + T.listing(place.id).area + ' in the listing export.'; }
    // ---- intent ----
    var hasSignals = sig.positive.length || sig.objections.length || budget != null || fees != null || Object.keys(features).length || memSets.length;
    var intent = 'clarify';
    var single = clientId && !ambiguous;
    var who = single || ambiguous;
    var listingHits = places.filter(function (x) { return x.kind === 'listing'; });
    var unknownName = !clientId && !ambiguous && mentions.unknown && mentions.unknown.length ? mentions.unknown[0].name : null;
    if (!unknownName && !clientId && !ambiguous) {
      // a full name nobody in the CRM has, right after "call", "with", "for"…: ask, never guess
      var um = /(?:^|[\s,(])(?:call|phone|text|email|meet|meeting|with|for|book|see|visit|appeler|rappeler|appel|avec|pour|chez)\s+((?:[A-ZÀ-Ý][a-zà-ÿ'-]+)\s(?:[A-ZÀ-Ý][a-zà-ÿ'-]+))(?=$|[\s,.;:!?)'’])/gi, uu;
      while ((uu = um.exec(text))) { var w2 = uu[1].split(' '); if (capWord(w2[0]) && capWord(w2[1])) { unknownName = uu[1]; break; } }
    }
    if (RE_THIRD.test(f)) intent = 'task';
    else if (RE_MSGSTART.test(f) && !RE_SENDL.test(f) && (who || /^(please\s+)?[a-z-]+\s+(him|her|them|lui|leur)\b|-(lui|leur|le|la)\b/.test(f))) intent = 'message';
    else if (RE_FOLLOWSTART.test(f) && (who || /(him|her|them|-le|-la|-les|\ble\b|\bla\b)/.test(f.slice(0, 40)))) intent = 'followup';
    else if (RE_BRIEF.test(f)) intent = 'brief';
    else if (isRecovery && !single) intent = 'recovery';
    else if (RE_FILE.test(f) && (RE_FILE_ASK.test(f) || tx) && !RE_TASK.test(f) && !RE_SCHED.test(f) && !(who && (RE_RESCHED.test(f) || RE_CANCEL.test(f)))) intent = 'file';
    else if (RE_CANCEL.test(f) && (who || when)) intent = 'cancel';
    else if (RE_RESCHED.test(f) && (who || when)) intent = 'reschedule';
    else if (RE_TASK.test(f)) intent = 'task';
    else if (RE_SCHED.test(f) && (RE_EVENT.test(f) || listingHits.length || (place && place.by === 'type and area'))) intent = 'schedule';
    else if (RE_VISIT.test(f) && when && who) intent = 'schedule';
    else if (RE_CMA.test(f) && !(RE_RECAP.test(f) && (hasSignals || promise))) intent = 'cma';
    else if (RE_RECAP.test(f) && (hasSignals || promise)) intent = 'showing';
    else if (RE_SHOWED.test(f) && who && listingId) intent = 'showing';
    else if (RE_SENDL.test(f) && who) intent = 'listings';
    else if (RE_SEARCH.test(f) && !who) intent = 'search';
    else if (RE_CALLTASK.test(f) && when && !hasSignals) intent = 'schedule';
    else if (RE_LOGCALL.test(f) && who) intent = 'showing';
    else if (who && (hasSignals || RE_NOTE.test(f))) intent = 'note';
    else if (isRecovery) intent = 'recovery';
    else if (RE_SEARCH.test(f) || (types.length && (areas.length || budgetMax)) && !who) intent = 'search';
    else if (promise && who) intent = 'note';
    else if (who && f.split(' ').length > 3 && !RE_SEARCH.test(f)) intent = 'note';

    var found = spans.list.slice().sort(function (a, b) { return a.start - b.start; });
    found.forEach(function (sp) {
      if (sp.type === 'client') {
        var segIds = mentions.filter(function (mm) { return mm.start === sp.start; })[0];
        if (clientId && !ambiguous && segIds && segIds.ids.indexOf(clientId) > -1) sp.label = T.fullName(T.client(clientId));
        else if (segIds && segIds.ids.length > 1) sp.label = segIds.ids.length + ' people share this name';
      }
      if (sp.type === 'when' && when) sp.label = T.fmtDT(when.date + 'T' + when.time);
      if (sp.type === 'place') { var ph = places.filter(function (x) { return x.start === sp.start; })[0]; if (ph) sp.label = ph.label; }
    });
    return {
      text: text, lang: lang, intent: intent, spans: found,
      clientId: ambiguous ? null : clientId, clientWhy: why, ambiguous: ambiguous, mention: mention ? text.slice(mention.start, mention.end) : null,
      listingId: listingId, listingWhy: listingWhy,
      budget: budget, fees: fees, price: price, features: features,
      positive: sig.positive, objections: sig.objections,
      promise: promise, when: when,
      isCall: (RE_CALLTASK.test(f) || RE_LOGCALL.test(f)) && !/(showing|visit|visite)/.test(f),
      listingIds: (listingHits.length ? listingHits : place && place.by === 'type and area' ? [place] : []).map(function (x) { return x.id; }), places: places, memSets: memSets, unknownName: unknownName,
      areas: areas, types: types, beds: beds, days: days, budgetMin: budgetMin, budgetMax: budgetMax,
      roleFilter: /(^|[^a-z])(sellers?|vendeurs?)(?=[^a-z]|$)/.test(f) ? 'Seller' : /(^|[^a-z])(buyers?|acheteurs?)(?=[^a-z]|$)/.test(f) ? 'Buyer' : null,
      stageFilter: /(^|[^a-z])leads?(?=[^a-z]|$)/.test(f) ? 'Lead' : null,
      together: together.length > 1 ? together : null, viaPlace: viaPlace, anchorText: ambiguous ? anchorText : null, txId: tx ? tx.id : null, move: RE_RESCHED.test(f) ? findMove(f, lang) : null, source: { kind: 'rules' }
    };
  };

  /* Title for a promise ("send her two alternatives tomorrow morning" → "Send Sarah two alternatives") */
  T.promiseTitle = function (p, client, when, lang) {
    if (!p) return null;
    if (p.aiTitle) return p.aiTitle;
    var clause = p.clause;
    if (when && when.phrase) {
      var fc = fold(clause), k = fc.indexOf(when.phrase);
      if (k > 0) clause = clause.slice(0, k);
    }
    if (when && when.timeText) {
      var k2 = fold(clause).indexOf(when.timeText);
      if (k2 > 0) clause = clause.slice(0, k2);
    }
    clause = clause.replace(/\s+(by|on|at|pour|d'ici|vers|le|la)\s*$/i, '').replace(/[\s,]+$/, '');
    var first = client ? client.first : '';
    if (lang === 'FR') {
      clause = clause.replace(/^(lui|leur)\s+/i, '');
      var withName = /^(lui|leur)/i.test(p.trigger) || /lui/.test(p.trigger);
      var t = clause.charAt(0).toUpperCase() + clause.slice(1);
      if (first && t.indexOf(first) < 0 && (withName || true)) t += ' à ' + first;
      return t;
    }
    clause = clause.replace(/\b(her|him|them)\b/i, first || '$1');
    if (/^to\s/i.test(clause)) clause = clause.slice(3);
    return clause.charAt(0).toUpperCase() + clause.slice(1);
  };
  /* ---------- several requests in one breath ----------
     Split on sentence boundaries, then before a new imperative ("…, book a showing", "… and remind me to…",
     "…, envoie-lui…"). Each clause is read on its own, so a date and a time bind only inside their clause;
     the client carries across clauses. Description clauses are read together as the recap. */
  var ACTION_START = /^(please\s+)?(book|schedule|set up|arrange|plan a|remind|add (a )?task|create (a )?task|send|email|e-mail|share|forward|cancel|call off|move|reschedule|push|bump|postpone|call|phone|text|tell(?! (me|us)\b)|inform(?! (me|us)\b)|let(?! (me|us)\b)|ask(?! (me|us)\b)|write to|follow up|follow-up|get back|circle back|check in|touch base|reach out|block|reserve|envoie|envoyez|envoyer|partage|planifie|organise|cale|fixe|rappelle|annule|deplace|reporte|decale|retarde|repousse|ajoute|n'oublie pas|don'?t forget|dis|dites|ecris|ecrivez|avise|avisez|previens|prevenez|informe|demande|demandez|relance|fais un suivi)(?=[^a-z]|$)/;
  // instructions Tayoo has no action for ("and order new lawn signs"): still their own part, so the card can quote them
  var RE_IMPERATIVE = /^(please\s+)?(order|buy|print|prepare|check(?! in)|verify|update|upload|find out|get(?! back)|make|put|pick up|drop off|bring|review|sign|scan|post|list|add|remove|delete|create|draft|confirm|organize|organise|contact|pay|transfer|look into|look up|figure out|water|clean|fix|commande|achete|imprime|prepare|verifie|mets|trouve|va chercher|apporte|signe|numerise|publie|ajoute|enleve|supprime|cree|confirme|contacte|paie|fais(?! un suivi)|regarde|occupe-toi)(?=[^a-z]|$)/;
  var CONNECT = /^\s*(and then|and also|and|then|also|plus|et puis|et|puis|aussi|alors|ensuite)\s+/;
  T.segment = function (raw) {
    var text = String(raw || '').replace(/\s+/g, ' ').trim().normalize('NFC'), f = fold(text), out = [];
    var sents = [], re = /([.!?;]+)(\s+|$)|\s*:\s+|\s+[—–]\s+/g, m, from = 0;
    while ((m = re.exec(f))) {
      var end = m[1] ? m.index + m[1].length : m.index;
      if (m[1] === '.' && /\d$/.test(f.slice(0, m.index)) && /^\d/.test(f.slice(m.index + 1))) continue;
      if (end > from) sents.push([from, end]);
      from = m.index + m[0].length;
    }
    if (from < f.length) sents.push([from, f.length]);
    sents.forEach(function (sn) {
      var a = sn[0], cuts = [], seg = f.slice(sn[0], sn[1]), mm, reC = /,\s*|\s+(?=(and then|and also|and|then|also|plus|et puis|et|puis|aussi|ensuite)\s)/g;
      while ((mm = reC.exec(seg))) {
        var restAt = mm.index + mm[0].length, rest = seg.slice(restAt), cm = rest.match(CONNECT);
        var verbAt = restAt + (cm ? cm[0].length : 0);
        var nxt = seg.slice(verbAt), comma = /,/.test(mm[0]);
        if ((ACTION_START.test(nxt) || ((cm || comma) && RE_IMPERATIVE.test(nxt))) && mm.index > 0) cuts.push([mm.index, verbAt]);
        else if (mm.index > 0 && ((cm && /^\s*(and|et|but|mais)\s/.test(cm[0]) && (comma ? /^(his|her|their|he|she|they|i|we|son|sa|ses|leur|leurs|il|elle|ils|elles|je|nous)\s|^j'/ : /^(he|she|they|i|we|il|elle|ils|elles|je|nous)\s|^j'/).test(nxt)) || (!cm && comma && /^(he|she|they|i|we|il|elle|ils|elles|je|nous)\s|^j'/.test(nxt)))) cuts.push([mm.index, verbAt]);
        if (!mm[0].length) reC.lastIndex++;
      }
      var st = 0;
      cuts.forEach(function (c) { if (c[0] > st) out.push([a + st, a + c[0]]); st = c[1]; });
      out.push([a + st, sn[1]]);
    });
    return out.map(function (r) {
      var t = text.slice(r[0], r[1]), lead = t.length - t.replace(/^\s+/, '').length;
      return { start: r[0] + lead, end: r[0] + lead + t.trim().length, text: t.trim() };
    }).filter(function (c) { return c.text.replace(/[^a-z0-9à-ÿ]/gi, '').length > 1; });
  };
  var RE_LETS = /^(let'?s|lets)\s+(talk|chat|catch up|speak|connect|touch base|reconnect)/;
  var RE_SENDSTART = /^(please\s+)?(send|email|e-mail|share|forward|envoie|envoyez|envoyer|partage)(?=[^a-z]|$)/;
  var RE_LISTINGWORD = /(listings?|fiches?|sheet|details|propert|condos?|houses?|duplex|townhouses?|bungalows?|options?|inscriptions?|proprietes?)/;
  // "I should renegotiate…", "il faut que je…": something you mean to do, so a task (promises like "I'll…" stay in the recap)
  var RE_INTEND = /^(and |but |et |mais )?(i should|i need to|i have to|i must|i want to|i'd like to|i ought to|i gotta|je dois|je devrais|il faut que je|il faudrait que je|je veux)\s/;
  function classify(p, f, carriedListing) {
    if (RE_TASK.test(f) || RE_LETS.test(f) || RE_THIRD.test(f) || RE_INTEND.test(f)) return 'task';
    if (RE_FOLLOWSTART.test(f)) return 'followup';
    if (RE_MSGSTART.test(f) && !RE_SENDL.test(f)) return 'message';
    if (/^(please\s+)?(call|phone|rappelle|appelle)\s/.test(f) && !RE_SCHED.test(f) && !/^call off/.test(f)) return 'task';
    if (RE_CANCEL.test(f)) return 'cancel';
    if (RE_RESCHED.test(f) && !/move (in|out)/.test(f)) return 'reschedule';
    if ((RE_SCHED.test(f) && (RE_EVENT.test(f) || p.listingIds.length)) || (RE_VISIT.test(f) && p.when)) return 'schedule';
    if (RE_SENDSTART.test(f)) return RE_LISTINGWORD.test(f) || p.listingIds.length || carriedListing ? 'listings' : 'task';
    return 'content';
  }
  T.parseCompound = function (raw, opts) {
    opts = opts || {};
    var text = String(raw || '').replace(/\s+/g, ' ').trim().normalize('NFC');
    var clauses = T.segment(text);
    if (clauses.length < 2) return null;
    var subject = opts.clientId || null, why = opts.clientId ? 'You picked this client.' : '', ambiguous = null, mention = null, others = [], lastListing = null, unknownName = null, anchorText = null, firstAny = null;
    var items = clauses.map(function (c) {
      // a pronoun inside a longer message points at the client named in it, not at the previous request
      var p = T.parse(c.text, { noContext: true }), f = fold(c.text);
      if (p.clientId && !subject && (p.mention || p.viaPlace !== 'own')) { subject = p.clientId; why = p.clientWhy; mention = p.mention; }
      else if (p.clientId && !firstAny) firstAny = p;
      if (p.ambiguous && !subject && !ambiguous) { ambiguous = p.ambiguous; mention = p.mention; anchorText = p.anchorText; }
      if (p.unknownName && !unknownName) unknownName = p.unknownName;
      var kind = classify(p, f, lastListing);
      if (p.listingId) lastListing = p.listingId;
      return { start: c.start, end: c.end, text: c.text, p: p, kind: kind };
    });
    if (!subject && firstAny) { subject = firstAny.clientId; why = firstAny.clientWhy; }
    var actions = items.filter(function (x) { return x.kind !== 'content'; }), content = items.filter(function (x) { return x.kind === 'content'; });
    if (!actions.length || (actions.length === 1 && !content.length)) return null;
    if (ambiguous && subject && ambiguous.indexOf(subject) > -1) ambiguous = null;
    var baseText = content.map(function (x) { return /[.!?;]$/.test(x.text) ? x.text : x.text + '.'; }).join(' ');
    var base = baseText ? T.parse(baseText, { noContext: true }) : null;
    // nobody named anywhere, but "him"/"her"/"it": the client of your last request, said on the card
    var cx = T.store.state.context && T.client(T.store.state.context.clientId);
    if (!subject && !ambiguous && !unknownName && cx && /(^|[^a-z])(him|her|them|he|she|his|lui|leur|il|elle|it|ca)(?=[^a-z]|$)|-(lui|leur|le|la)(?=[^a-z]|$)/.test(fold(text))) { subject = cx.id; why = 'No name heard. Read as ' + T.fullName(cx) + ', from your last request.'; }
    // Who each part is about: a name switches the client; a pronoun or no name keeps the current one; a client's own
    // property or event named in a part ("book the photographer for Rue Saint-Laurent") makes that part theirs
    var carry = null, cur = opts.clientId || null;
    items.forEach(function (x) {
      if (x.p.listingId) carry = x.p.listingId;
      var pro = /(^|[^a-z])(him|her|his|he|she|them|they|lui|leur|il|elle|son|sa|ses)(?=[^a-z]|$)|-(lui|le|la)(?=[^a-z]|$)/.test(fold(x.text));
      if (!opts.clientId && x.p.clientId && x.p.mention) cur = x.p.clientId;
      else if (!opts.clientId && x.p.clientId && x.p.viaPlace === 'own' && !pro) { x.own = true; }
      else if ((cur || subject) && !x.p.ambiguous) { x.p.clientId = cur || subject; x.p.clientWhy = 'Same client as earlier in your message.'; x.carried = true; }
      if (x.p.ambiguous && (cur || subject) && x.p.ambiguous.indexOf(cur || subject) > -1) { x.p.clientId = cur || subject; x.p.ambiguous = null; }
      x.carriedListing = !x.p.listingId && carry ? carry : null;
    });
    items.forEach(function (x) { if (!x.p.clientId && subject && !x.p.ambiguous) { x.p.clientId = subject; x.carried = true; } x.owner = x.p.clientId; });
    if (!opts.clientId) items.forEach(function (x) { if (x.owner && x.owner !== subject && others.indexOf(x.owner) < 0) others.push(x.owner); });
    if (base && subject) { base.clientId = subject; base.ambiguous = null; }
    var spans = [];
    items.forEach(function (x) { x.p.spans.forEach(function (sp) { spans.push({ start: sp.start + x.start, end: sp.end + x.start, type: sp.type, label: sp.label }); }); });
    var fr = (fold(text).match(FR_MARKERS) || []).length > (fold(text).match(EN_MARKERS) || []).length;
    return {
      compound: true, text: text, lang: fr ? 'FR' : 'EN', spans: spans, clauses: items, actions: actions, content: content, base: base,
      clientId: ambiguous ? null : subject, clientWhy: why, ambiguous: subject ? null : ambiguous, mention: mention, anchorText: subject ? null : anchorText,
      otherClients: others.filter(function (id, i, a) { return a.indexOf(id) === i; }), unknownName: subject ? null : unknownName,
      isCall: !!(base && base.isCall) || items.some(function (x) { return x.kind === 'content' && RE_LOGCALL.test(fold(x.text)); }),
      source: { kind: 'rules', clauses: items.length }
    };
  };
  // Two clients really named in one message: one plan per client, each with only its own parts
  T.splitCompound = function (cp) {
    var owners = [cp.clientId].concat(cp.otherClients || []);
    return owners.map(function (id) {
      var items = cp.clauses.filter(function (x) { return x.owner === id; });
      var content = items.filter(function (x) { return x.kind === 'content'; }), actions = items.filter(function (x) { return x.kind !== 'content'; });
      var baseText = content.map(function (x) { return /[.!?;]$/.test(x.text) ? x.text : x.text + '.'; }).join(' ');
      var base = baseText ? T.parse(baseText, { noContext: true }) : null;
      if (base) { base.clientId = id; base.ambiguous = null; }
      var first = items[0] || {}, text = items.map(function (x) { return x.text; }).join(' ');
      var spans = cp.spans.filter(function (sp) { return items.some(function (x) { return sp.start >= x.start && sp.end <= x.end; }); });
      return { compound: true, split: true, text: text, lang: cp.lang, spans: spans, clauses: items, actions: actions, content: content, base: base, clientId: id, clientWhy: first.p && first.p.mention && first.p.clientId === id ? first.p.clientWhy : (items.filter(function (x) { return x.p.clientId === id && x.p.clientWhy; })[0] || { p: {} }).p.clientWhy || 'From your message.', ambiguous: null, mention: null, otherClients: [], unknownName: null, isCall: !!(base && base.isCall) || content.some(function (x) { return RE_LOGCALL.test(fold(x.text)); }), source: cp.source };
    }).filter(function (sc) { return sc.clauses.length; });
  };
  // One request already read by T.parse, in the plan-in-parts shape (messages, follow-ups)
  T.asCompound = function (p) {
    var x = { start: 0, end: p.text.length, text: p.text, p: p, kind: p.intent };
    return { compound: true, text: p.text, lang: p.lang, spans: p.spans, clauses: [x], actions: [x], content: [], base: null, clientId: p.clientId, clientWhy: p.clientWhy, ambiguous: p.ambiguous, mention: p.mention, otherClients: [], unknownName: p.unknownName, isCall: false, source: p.source };
  };
  T.timeIn = function (s) { var m = TIME_RE().exec(fold(s)); return m ? timeAt(m) : null; };
  T.fold = T.fold || fold;
  T.foldKeep = fold;
  // the request patterns, for the check that every clause of a request is accounted for
  T.RX = { intend: RE_INTEND, showed: RE_SHOWED, imper: RE_IMPERATIVE, sched: RE_SCHED, visit: RE_VISIT, cancel: RE_CANCEL, resched: RE_RESCHED, msg: RE_MSGSTART, task: RE_TASK, follow: RE_FOLLOWSTART, sendl: RE_SENDL, third: RE_THIRD, lets: RE_LETS };
})();
