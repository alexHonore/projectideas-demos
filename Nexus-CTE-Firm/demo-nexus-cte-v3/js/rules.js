/* Nexus CTE V3 — moteurs de règles pour le texte libre : extraction des notes d'appel, retraitements à partir d'un
   grand livre collé, brouillon et vérification du sommaire aveugle. L'IA en direct (facultative) doit rendre exactement
   les mêmes structures (schémas ci-dessous); tout passe ensuite par la même révision humaine. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U;
  var NUMW = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12 };
  function toNum(w) { w = String(w).toLowerCase(); return NUMW[w] != null ? NUMW[w] : parseInt(w, 10); }
  function sentenceAround(text, idx, len) {
    var a = text.lastIndexOf('.', idx - 1) + 1, b = text.indexOf('.', idx + len);
    var s = text.slice(a, b < 0 ? text.length : b).trim();
    return s.length > 140 ? s.slice(0, 137) + '…' : s;
  }
  function ageBand(n) { return n >= 65 ? '65+' : n >= 55 ? '55–64' : n >= 45 ? '45–54' : n >= 35 ? '35–44' : 'moins de 35'; }

  /* ================= 1. Extraction des notes d'appel (Call-to-CRM) ================= */
  var CONF = ['Élevée', 'Moyenne', 'Faible'];
  function extractNotes(notes, lead) {
    var t = String(notes || ''), out = [], m;
    function add(key, value, excerpt, conf, note) {
      if (out.some(function (f) { return f.key === key; })) return;
      var meta = D.INTAKE_KEYS.filter(function (k) { return k.key === key; })[0];
      out.push({ key: key, field: meta.field, target: meta.target, value: value, excerpt: excerpt, conf: conf, note: note || '' });
    }
    var reAge = /(\d{2})\s*ans\b/g;
    while ((m = reAge.exec(t))) {
      var before = t.slice(Math.max(0, m.index - 14), m.index).toLowerCase(), after = t.slice(m.index + m[0].length, m.index + m[0].length + 16).toLowerCase();
      var n = +m[1];
      if (n < 35 || n > 95 || /(dans|depuis|il y a|de|d’ici|d'ici)\s*$/.test(before) || /^\s*(d’exp|d'exp|en |de m|dans)/.test(after)) continue;
      add('ageBand', ageBand(n), '« ' + m[0] + ' »', 'Élevée'); break;
    }
    if ((m = /(?:dans|d’ici|d'ici)\s+(\d+|un|une|deux|trois|quatre|cinq|six)\s+(ans?|mois)\b/i.exec(t))) {
      var k = toNum(m[1]), months = /mois/i.test(m[2]) ? k : k * 12;
      if (!/rappel/i.test(t.slice(Math.max(0, m.index - 20), m.index))) add('exitHorizon', months + ' mois', '« ' + m[0].replace(/^\w+\s/, function (x) { return x; }) + ' »', 'Élevée', /retraite/i.test(t) ? 'Lié à la retraite du dirigeant' : '');
    }
    if ((m = /(propriétaire|possède|appartient|à lui|à elle)[^.]{0,50}?(bâtisse|bâtiment|immeuble|entrepôt|terminal|garage|usine)|(bâtisse|bâtiment|immeuble|entrepôt|terminal|garage|usine)[^.]{0,50}?(appartient|est à|loue|locataire|louée?)/i.exec(t))) {
      var sent = sentenceAround(t, m.index, m[0].length), soc = /(société|gestion|holding|inc\.|familiale)/i.test(sent), loc = /(loue|locataire|louée?)/i.test(sent);
      add('propertyOwner', loc ? 'Locataire de ses locaux' : soc ? 'Société liée (à vérifier)' : 'À vérifier : le cédant se dit propriétaire', '« ' + m[0].trim() + ' »', 'Moyenne', soc || loc ? '' : 'Propriété directe ou société sœur : non précisé');
    }
    if ((m = /(fils|fille|enfants?|relève|neveu|nièce)[^.]{0,90}/i.exec(t))) {
      var neg = /(ne veut pas|pas intéress|aucune|pas de relève|ne reprendra|pas reprendre|ne veut pas reprendre)/i.test(m[0]) || /pas de relève/i.test(t);
      add('succession', neg ? 'Relève familiale non confirmée' : 'Relève familiale possible', '« ' + m[0].trim().replace(/[,;]$/, '') + ' »', 'Moyenne');
    }
    if ((m = /(comptable|CPA|fiscaliste|notaire|avocate?)\b[^.]{0,30}?(?:est |:)?\s*(?:chez\s+)([A-ZÉÈÀÂ][\wÀ-ÿ’'.-]*(?:\s+(?:[A-ZÉÈÀÂ&][\wÀ-ÿ’'.-]*|et|de|du))*)/.exec(t))) {
      var firm = m[2].split(/\.(?:\s|$)/)[0].replace(/[.,]+$/, ''), exA = m[0].slice(0, m[0].indexOf(m[2]) + firm.length).trim();
      add('advisor', 'conseille_par : ' + firm, '« ' + exA + ' »', 'Élevée');
    }
    if ((m = /(environ\s+|près de\s+)?(\d{1,4})\s+employés/i.exec(t))) add('employees', m[2] + ' employés', '« ' + m[0].trim() + ' »', m[1] ? 'Moyenne' : 'Élevée');
    if ((m = /chiffre d.affaires[^.]{0,25}?(\d+(?:[,.]\d+)?)\s*(M\$|millions?)/i.exec(t))) {
      var v = parseFloat(m[1].replace(',', '.')), band = v < 1 ? 'moins de 1 M$' : v < 2 ? '1 à 2 M$' : v < 3 ? '2 à 3 M$' : v < 5 ? '3 à 5 M$' : v < 10 ? '5 à 10 M$' : '10 M$ et plus';
      add('revenueBand', band, '« ' + m[0].trim() + ' »', 'Moyenne');
    }
    if ((m = /rappeler\s+dans\s+(\d+|un|une|deux|trois|quatre|six)\s+(mois|semaines?|ans?)/i.exec(t))) {
      var q = toNum(m[1]), unit = /sem/i.test(m[2]) ? 'semaines' : /an/i.test(m[2]) ? 'ans' : 'mois';
      add('callback', 'Rappel dans ' + q + ' ' + unit, '« ' + m[0] + ' »', 'Élevée');
    }
    var dnc = /ne (me )?rappelez (plus|pas)|retirez[- ]moi|ne plus (m’|m')?appeler|pas d.appel/i.exec(t);
    if (dnc) add('dncRequest', 'Demande de retrait : inscrire à la liste interne d’exclusion', '« ' + dnc[0] + ' »', 'Élevée', 'Écrit à la liste dès l’enregistrement de la disposition « retiré de la liste »');
    var neg2 = /pas (du tout )?intéressée?|pas pour l.instant/i.exec(t), pos = /(curieux|curieuse|intéressée?|ouverte?)\b[^.]*/i.exec(t);
    if (neg2) add('interest', 'Pas intéressé pour l’instant', '« ' + neg2[0] + ' »', 'Moyenne');
    else if (pos) add('interest', 'Intérêt à confirmer : proposer une rencontre', '« ' + pos[0].trim() + ' »', 'Faible', 'Proposer une rencontre, sans fourchette de valeur avant des états financiers fiables');
    if ((m = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(t))) add('email', m[0].replace(/[.,]$/, ''), '« ' + m[0].replace(/[.,]$/, '') + ' »', 'Élevée');
    var disp = dnc ? 'retiré de la liste' : /accepte[^.]*questionnaire|envoyez[^.]*questionnaire|questionnaire[^.]*courriel/i.test(t) ? 'a accepté le questionnaire' : /rappeler/i.test(t) ? 'à rappeler' : /boîte vocale/i.test(t) ? 'boîte vocale' : /pas de réponse/i.test(t) ? 'pas de réponse' : neg2 ? 'refus' : pos ? 'intéressé' : 'conversation';
    var order = D.INTAKE_KEYS.map(function (k) { return k.key; });
    out.sort(function (a, b) { return order.indexOf(a.key) - order.indexOf(b.key); });
    out.forEach(function (f, i) { f.id = 'x' + (i + 1); });
    return { fields: out, disposition: disp, summary: out.length + ' champ' + (out.length > 1 ? 's' : '') + ' extrait' + (out.length > 1 ? 's' : '') + ' des notes; disposition suggérée : « ' + disp + ' »' };
  }
  // Caviardage par défaut (Loi 25) avant tout envoi à un fournisseur de modèles : noms de personnes remplacés.
  function redact(text, names) {
    var t = String(text || ''), n = 0;
    (names || []).filter(Boolean).forEach(function (full) {
      String(full).split(/\s+/).filter(function (w) { return w.length >= 3 && /^[A-ZÉÈÀÂ]/.test(w); }).forEach(function (w) {
        var re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
        t = t.replace(re, function () { n++; return '[personne]'; });
      });
    });
    return { text: t, count: n };
  }

  /* ================= 2. Retraitements à partir d'un grand livre ou de notes ================= */
  var CATS = ['Rémunération du dirigeant', 'Dépenses personnelles', 'Éléments non récurrents', 'Éléments non opérationnels', 'Loyer', 'Pro forma'];
  function parseLedgerLine(line, years) {
    var label = line, account = null, m = /^\s*(\d{3,5})\s+(.*)$/.exec(line);
    if (m) { account = m[1]; label = m[2]; }
    var main = label.split(/[:–—]/)[0].trim(), rest = label.slice(main.length);
    var amounts = {}, found = false, re = /(20\d\d)\s*[:=]?\s*(-?\d[\d\s  ]*(?:,\d+)?)\s*(k\$|\$)?/g, mm;
    var stripped = rest.replace(/\(([^)]*)\)/g, ' ');
    while ((mm = re.exec(stripped))) { var y = +mm[1]; if (years.indexOf(y) >= 0) { var v = U.parseAmount(mm[2] + (mm[3] === 'k$' ? 'k' : '')); if (v != null) { amounts[y] = v; found = true; } } }
    if (!found) { var single = /(-?\d[\d\s  ]{2,}(?:,\d+)?)\s*(k\$|\$)?/.exec(stripped); if (single) { var v1 = U.parseAmount(single[1] + (single[2] === 'k$' ? 'k' : '')); if (v1 != null) { amounts[years[years.length - 1]] = v1; found = true; } } }
    var ref = /\((?:[^)]*?)(remplacement|marchand|marché|market)\s*:?\s*(\d[\d\s  ]*(?:,\d+)?\s*k?\$?)\)/i.exec(label);
    return { raw: line.trim(), account: account, label: main, amounts: amounts, found: found, refKind: ref ? ref[1].toLowerCase() : null, ref: ref ? U.parseAmount(ref[2].replace('$', '')) : null };
  }
  function adjustmentsFromText(text, m, opts) {
    opts = opts || {};
    var ys = (m.fin && m.fin.years) || [], out = [], ignored = [];
    var replacement = opts.replacementSalary || 150000;
    String(text || '').split(/\n+/).map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 3; }).forEach(function (l) {
      var p = parseLedgerLine(l, ys), f = U.fold(p.label), cat = null, amounts = {}, rating = 'défendable', why = '', trap = null;
      if (!p.found) { ignored.push(l); return; }
      var vals = ys.map(function (y) { return p.amounts[y] || 0; }), present = vals.filter(function (v) { return v; });
      if (/(salaire|remuneration|bonus)/.test(f) && /(president|dirigeant|proprietaire|cedant|actionnaire|pdg)/.test(f)) {
        var base = p.refKind === 'remplacement' && p.ref ? p.ref : replacement; cat = CATS[0]; rating = 'solide';
        ys.forEach(function (y) { if (p.amounts[y]) amounts[y] = p.amounts[y] - base; });
        why = 'Rémunération versée au-delà d’un salaire de remplacement de ' + U.money(base) + (p.refKind === 'remplacement' ? ' (indiqué)' : ' (paramètre par défaut)') + '.';
      } else if (/(salaire|remuneration)/.test(f) && /(conjoint|conjointe|fils|fille|famille|enfant|epouse|epoux)/.test(f)) {
        if (!p.ref) { ignored.push(l + ' (salaire de marché non indiqué)'); return; }
        cat = CATS[0]; ys.forEach(function (y) { if (p.amounts[y]) amounts[y] = p.amounts[y] - p.ref; });
        why = 'Salaire d’un membre de la famille au-delà de la valeur marchande du poste (' + U.money(p.ref) + ').';
      } else if (/loyer/.test(f)) {
        if (!p.ref) { ignored.push(l + ' (loyer marchand non indiqué)'); return; }
        cat = CATS[4]; rating = 'solide'; ys.forEach(function (y) { if (p.amounts[y]) amounts[y] = p.amounts[y] - p.ref; });
        why = 'Écart entre le loyer payé et le loyer marchand de ' + U.money(p.ref) + ' : l’acquéreur paiera le loyer marchand.';
      } else if (/(gain|profit).{0,20}(cession|disposition|vente)/.test(f)) {
        cat = CATS[3]; rating = 'solide'; ys.forEach(function (y) { if (p.amounts[y]) amounts[y] = -Math.abs(p.amounts[y]); });
        why = 'Gain non lié à l’exploitation courante, retiré du BAIIA.';
      } else if (/(perte).{0,20}(cession|disposition|vente)/.test(f)) {
        cat = CATS[3]; rating = 'solide'; ys.forEach(function (y) { if (p.amounts[y]) amounts[y] = Math.abs(p.amounts[y]); });
        why = 'Perte non liée à l’exploitation courante, rajoutée au BAIIA.';
      } else if (/(contrat signe|pro forma|annualis|nouveau client|soumission|projet a venir)/.test(f)) {
        cat = CATS[5]; rating = 'agressif'; ys.forEach(function (y) { if (p.amounts[y]) amounts[y] = p.amounts[y]; });
        why = 'Revenu ou marge non encore réalisé : à traiter comme potentiel, jamais comme acquis.';
      } else if (/(vehicule|auto|voiture|camionnette|assurance-vie|assurance vie|club|golf|voyage|personnel|chalet|bateau)/.test(f)) {
        cat = CATS[1]; ys.forEach(function (y) { if (p.amounts[y]) amounts[y] = p.amounts[y]; });
        why = 'Dépense personnelle que l’acquéreur ne reprendra pas.';
      } else if (/(litige|juridique|reparation majeure|ponctuel|non recurrent|sinistre|demenagement|indemnite|faillite|mauvaise creance|prime exceptionnelle|exceptionnel)/.test(f)) {
        cat = CATS[2]; ys.forEach(function (y) { if (p.amounts[y]) amounts[y] = p.amounts[y]; });
        rating = present.length === 1 ? 'solide' : 'défendable';
        if (present.length >= 3) { var mx = Math.max.apply(null, present), mn = Math.min.apply(null, present); if (mn > 0 && mx / mn <= 1.5) { trap = 'Montants semblables sur trois exercices : la dépense paraît récurrente.'; rating = 'agressif'; } }
        why = 'Dépense présentée comme non récurrente' + (trap ? ', mais elle revient chaque année.' : '.');
      } else { ignored.push(l); return; }
      if (!Object.keys(amounts).some(function (y) { return amounts[y]; })) { ignored.push(l + ' (aucun écart)'); return; }
      var full = {}; ys.forEach(function (y) { full[y] = amounts[y] || 0; });
      out.push({ cat: cat, label: p.label.charAt(0).toUpperCase() + p.label.slice(1), amounts: full, rating: rating, line: (p.account ? 'Compte ' + p.account + ', ' : '') + p.label, why: why, evidence: 'Grand livre collé : « ' + p.raw.slice(0, 120) + ' »', trap: trap, needsEvidence: null });
    });
    return { adjustments: out, ignored: ignored };
  }
  // Propositions à partir des états saisis et des hypothèses du formulaire (mandats créés).
  function proposeFromStatements(m, a) {
    a = a || {}; var ys = m.fin.years, out = [];
    var rep = a.replacementSalary || 150000, comp = a.ownerComp || {};
    if (ys.some(function (y) { return (comp[y] || 0) > rep; })) {
      var am = {}; ys.forEach(function (y) { am[y] = Math.max(0, (comp[y] || 0) - rep); });
      out.push({ cat: CATS[0], label: 'Rémunération du cédant au-delà du salaire de remplacement', amounts: am, rating: 'solide', line: 'Rémunération du dirigeant, ' + U.money(comp[ys[2]] || 0), why: 'Un dirigeant de remplacement coûterait ' + U.money(rep) + ' charges incluses.', evidence: 'Salaire de remplacement saisi au formulaire (à documenter)', needsEvidence: null });
    }
    var rent = a.rentPaid || {}, mr = m.property ? m.property.marketRent : null;
    if (mr && ys.some(function (y) { return rent[y] && rent[y] !== mr; })) {
      var ar = {}; ys.forEach(function (y) { ar[y] = rent[y] ? rent[y] - mr : 0; });
      out.push({ cat: CATS[4], label: 'Loyer versé à la société liée par rapport au loyer marchand', amounts: ar, rating: 'solide', line: 'Loyer, société liée', why: 'Après la vente, l’acquéreur paiera le loyer marchand de ' + U.money(mr) + '.', evidence: 'Loyer marchand saisi au formulaire; évaluation locative (pièce 07-04)', needsEvidence: null });
    }
    if (a.personal) { var ap = {}; ys.forEach(function (y) { ap[y] = a.personal; }); out.push({ cat: CATS[1], label: 'Dépenses personnelles du cédant', amounts: ap, rating: 'défendable', line: 'Montant annuel saisi', why: 'Dépenses que l’acquéreur ne reprendra pas.', evidence: 'Montant annuel saisi au formulaire, à documenter (grand livre)', needsEvidence: null }); }
    return out;
  }

  /* ================= 3. Sommaire aveugle : brouillon et vérification ================= */
  var STOP = ['inc', 'ltee', 'ltée', 'senc', 'sec', 'et', 'fils', 'filles', 'freres', 'frères', 'groupe', 'gestion', 'immeubles', 'industries', 'industriel', 'industrielle', 'usinage', 'soudure', 'distribution', 'transport', 'specialise', 'spécialisé', 'electricite', 'électricité', 'garage', 'hydraulique', 'atelier', 'fabrication', 'services', 'entreprises', 'compagnie', 'cie', 'holding', 'capital', 'placements', 'construction', 'metal', 'métal', 'mecanique', 'mécanique', 'associes', 'associés', 'les', 'des', 'du', 'de', 'la', 'le'];
  function tokens(s) { return String(s || '').replace(/[&,.()]/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 3 && STOP.indexOf(U.fold(w)) < 0 && /^[A-ZÉÈÀÂÎÔ]/.test(w); }); }
  function teaserFacts(m) {
    var E = g.E, c = E.cagr(m), n = E.normalization(m);
    return { cagr: Math.round(c * 1000) / 10, pcts: [Math.round(c * 1000) / 10, m.profile.recurringPct, m.profile.topClientPct, 100, 20, 25].filter(function (x) { return x != null; }), ebitda: n.conservative[n.base], revenue: m.fin.revenue[n.base] };
  }
  function teaserDraft(m) {
    if (m.teaserSeed && m.teaserSeed.length) return U.clone(m.teaserSeed);
    var b = m.blind, f = teaserFacts(m), p = m.profile, lines = [];
    lines.push({ k: 'title', t: g.E.capital(b.sector) + ', ' + p.region });
    lines.push({ k: 'intro', t: 'Entreprise en activité depuis ' + b.age + ', offerte à la vente par voie de ' + (g.E.STRUCT_PHRASE[m.structure] || 'structure à déterminer').replace(/^vente de /, 'cession de ') + '.' });
    if (p.recurringPct >= 40) lines.push({ k: 'hl', t: 'Contrats récurrents pour ' + p.recurringPct + ' % des ventes.' });
    if (f.cagr >= 3) lines.push({ k: 'hl', t: 'Croissance annuelle composée de ' + U.num(f.cagr, 1) + ' % sur deux ans.' });
    lines.push({ k: 'hl', t: 'Équipe de ' + b.employeesBand + '.' });
    (m.teaserNotes || []).forEach(function (t) { if (String(t).trim()) lines.push({ k: 'hl', t: String(t).trim() }); });
    lines.push({ k: 'structure', t: m.property ? (m.property.investor ? 'Vente des actions; immeuble offert séparément à un investisseur, avec bail au loyer marchand.' : 'Vente des actions; immeuble vendu avec l’entreprise ou loué au loyer marchand.') : 'Vente des actions; locaux loués, bail transférable.' });
    return lines;
  }
  var RARE = { 'AS9100': 'en qualité aérospatiale', 'AS 9100': 'en qualité aérospatiale', 'NADCAP': 'en procédés spéciaux', 'ITAR': 'pour la défense' };
  var SUPER = /\b(seule?|unique|le plus important|la plus importante|le plus gros|la plus grosse|le plus grand|la plus grande|premier fabricant|record)\b/i;
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function scanTeaser(lines, m) {
    var p = m.profile, facts = teaserFacts(m), issues = [];
    var companyTok = tokens(p.company), ownerTok = tokens(p.owner), tradeTok = tokens(p.holdco).concat(tokens(p.propco));
    var places = D.PLACES.slice(); if (p.city && p.city !== 'Québec' && places.indexOf(p.city) < 0) places.push(p.city); if (p.area && places.indexOf(p.area) < 0) places.push(p.area);
    (lines || []).forEach(function (ln, i) {
      var t = ln.t || '', found = [], cats = [];
      function hit(tok, cat) { if (new RegExp('(^|[^\\wÀ-ÿ])' + esc(tok) + '($|[^\\wÀ-ÿ])').test(t) && found.indexOf(tok) < 0) { found.push(tok); if (cats.indexOf(cat) < 0) cats.push(cat); } }
      companyTok.forEach(function (w) { hit(w, 'raison'); }); ownerTok.forEach(function (w) { hit(w, 'admin'); }); tradeTok.forEach(function (w) { hit(w, 'commercial'); });
      if (p.neq && t.replace(/\s/g, '').indexOf(String(p.neq).replace(/\s/g, '')) >= 0) { found.push(p.neq); cats.push('raison'); }
      if (/\(\d{3}\)\s?\d{3}-\d{4}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(t)) { found.push('téléphone'); cats.push('tel'); }
      if (/\b\d{1,5},?\s+(rue|boulevard|boul\.|avenue|av\.|chemin|route|rang)\b/i.test(t)) { found.push('adresse'); cats.push('adresse'); }
      if (found.length) {
        var fixed = t;
        if (p.owner) fixed = fixed.replace(new RegExp('(la |sa )?famille\\s+' + esc(ownerTok[ownerTok.length - 1] || '§'), 'g'), 'son propriétaire actuel').replace(new RegExp(esc(p.owner), 'g'), 'son propriétaire actuel');
        if (p.company) fixed = fixed.replace(new RegExp(esc(p.company), 'g'), 'l’entreprise');
        companyTok.concat(ownerTok, tradeTok).forEach(function (w) { fixed = fixed.replace(new RegExp('(\\s)?' + esc(w) + '\\b', 'g'), ''); });
        fixed = fixed.replace(/\(\d{3}\)\s?\d{3}-\d{4}/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([,.;])/g, '$1');
        issues.push({ key: 'nom:' + U.hash(U.fold(found.join('|'))), line: i, kind: 'nom', cats: cats, match: found.join(', '), why: 'Nom ou coordonnée identifiant le cédant (vérification des noms, blocage à l’exportation)', fixed: fixed === t ? null : fixed, canKeep: false });
        return;
      }
      var idf = [], fx = t, sm;
      if ((sm = /\b(fond[ée]+e?s?|établie?s?|constituée?s?|créée?s?)\s+en\s+((19|20)\d\d)\b/i.exec(t))) { idf.push(sm[2]); fx = fx.replace(sm[0], sm[1] + ' il y a ' + m.blind.age); }
      if ((sm = SUPER.exec(fx))) {
        idf.push(sm[0]);
        fx = fx.replace(/\b[Ll]e plus important\b/, 'un important').replace(/\b[Ll]a plus importante\b/, 'une importante').replace(/\b[Ll]e plus (gros|grand)\b/, 'un $1').replace(/\b[Ll]a plus (grosse|grande)\b/, 'une $1').replace(/^(Seule?|Unique)\s+/i, '').replace(/\s+(seule?|unique|record)\b/gi, '').replace(/\bpremier fabricant\b/i, 'fabricant');
        fx = fx.charAt(0).toUpperCase() + fx.slice(1);
      }
      Object.keys(RARE).forEach(function (k) { if (fx.indexOf(k) >= 0) { idf.push(k); fx = fx.replace(k, RARE[k]); } });
      places.forEach(function (pl) {
        var re = new RegExp('\\s*(de la |du |de l’|de |à |en |dans la |dans le )?' + esc(pl) + '\\b');
        if (new RegExp('(^|[^\\wÀ-ÿ-])' + esc(pl) + '($|[^\\wÀ-ÿ-])').test(fx)) { idf.push(pl); fx = fx.replace(re, ''); }
      });
      fx = fx.replace(/\s{2,}/g, ' ').replace(/\s+([,.;])/g, '$1').trim();
      if (idf.length) issues.push({ key: 'idf:' + U.hash(U.fold(idf.join('|'))), line: i, kind: 'identifiable', cats: [], match: idf.join(', '), why: /client/i.test(t) ? 'Détail permettant d’identifier le client et, par lui, la cible' : 'Détail permettant à un concurrent régional d’identifier l’entreprise', fixed: fx !== t ? fx : null, canKeep: true });
      var rp = /(\d+(?:,\d+)?)\s?%/g, pm, bad = null;
      while ((pm = rp.exec(t))) { var v = parseFloat(pm[1].replace(',', '.')); if (!facts.pcts.some(function (x) { return Math.abs(x - v) < 0.051; })) { bad = pm; break; } }
      if (bad) issues.push({ key: 'num:' + U.hash(bad[0] + i), line: i, kind: 'chiffre', cats: [], match: bad[0], why: 'Chiffre absent des sorties du moteur' + (/croissance/i.test(t) ? ' : le TCAC calculé est de ' + U.num(facts.cagr, 1) + ' %' : ''), fixed: /croissance/i.test(t) ? t.replace(bad[0], U.num(facts.cagr, 1) + ' %') : null, canKeep: false });
    });
    return issues;
  }
  function openIssues(m) { if (!m.teaser.draft) return []; return scanTeaser(m.teaser.draft, m).filter(function (i) { return !(i.canKeep && m.teaser.kept[i.key]); }); }
  function nameChecks(m) {
    var all = m.teaser.draft ? scanTeaser(m.teaser.draft, m) : [], has = function (c) { return all.some(function (i) { return i.kind === 'nom' && i.cats.indexOf(c) >= 0; }); };
    return [['Raison sociale « ' + m.profile.company + ' »', !has('raison'), 'raison'], ['Noms commerciaux (société de gestion, immobilière)', !has('commercial'), 'commercial'], ['Noms des administrateurs (« ' + (tokens(m.profile.owner).slice(-1)[0] || '—') + ' »)', !has('admin'), 'admin'], ['Adresse civique', !has('adresse'), 'adresse'], ['Numéros de téléphone', !has('tel'), 'tel']];
  }

  /* ================= 4. Schémas partagés par les règles et l'IA en direct ================= */
  var KEYS = D.INTAKE_KEYS.map(function (k) { return k.key; });
  var SCHEMAS = {
    extraction: { type: 'object', additionalProperties: false, required: ['fields', 'disposition', 'summary'], properties: {
      fields: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['key', 'value', 'excerpt', 'confidence', 'note'], properties: {
        key: { type: 'string', enum: KEYS, description: 'Champ de la fiche visé' }, value: { type: 'string' }, excerpt: { type: 'string', description: 'Extrait exact des notes, sans guillemets' },
        confidence: { type: 'string', enum: CONF }, note: { type: 'string' } } } },
      disposition: { type: 'string', enum: D.DISPOSITIONS }, summary: { type: 'string' } } },
    adjustments: { type: 'object', additionalProperties: false, required: ['adjustments', 'ignored_lines'], properties: {
      adjustments: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['category', 'label', 'amounts', 'rating', 'source_line', 'rationale', 'recurring_risk'], properties: {
        category: { type: 'string', enum: CATS }, label: { type: 'string' },
        amounts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['year', 'amount'], properties: { year: { type: 'integer' }, amount: { type: 'integer', description: 'Effet sur le BAIIA en dollars, positif ou négatif' } } } },
        rating: { type: 'string', enum: ['solide', 'défendable', 'agressif'] }, source_line: { type: 'string' }, rationale: { type: 'string' }, recurring_risk: { type: 'boolean' } } } },
      ignored_lines: { type: 'array', items: { type: 'string' } } } },
    teaser: { type: 'object', additionalProperties: false, required: ['title', 'intro', 'highlights', 'structure'], properties: {
      title: { type: 'string' }, intro: { type: 'string' }, highlights: { type: 'array', items: { type: 'string' } }, structure: { type: 'string' } } }
  };
  function str(v, max) { return typeof v === 'string' && v.trim().length > 0 && v.length <= (max || 400); }
  // Validation stricte côté navigateur : un résultat invalide est rejeté et les règles prennent le relais.
  var VALIDATE = {
    extraction: function (data, notes) {
      if (!data || !Array.isArray(data.fields)) throw new Error('Champs absents.');
      var nf = U.fold(notes), seen = {}, out = [];
      data.fields.forEach(function (f) {
        if (!f || KEYS.indexOf(f.key) < 0 || seen[f.key] || !str(f.value, 200) || !str(f.excerpt, 300) || CONF.indexOf(f.confidence) < 0) return;
        if (f.key === 'ageBand' && ['moins de 35', '35–44', '45–54', '55–64', '65+'].indexOf(f.value) < 0) return;
        if (f.key === 'email' && !/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(f.value.trim())) return;
        seen[f.key] = true;
        var ex = f.excerpt.replace(/^[«"\s]+|[»"\s]+$/g, ''), inNotes = nf.indexOf(U.fold(ex)) >= 0;
        var meta = D.INTAKE_KEYS.filter(function (k) { return k.key === f.key; })[0];
        out.push({ key: f.key, field: meta.field, target: meta.target, value: f.value.trim(), excerpt: '« ' + ex + ' »', conf: inNotes ? f.confidence : 'Faible', note: (inNotes ? '' : 'Extrait non retrouvé tel quel dans les notes. ') + (f.note || '') });
      });
      if (!out.length) throw new Error('Aucun champ valide.');
      if (D.DISPOSITIONS.indexOf(data.disposition) < 0) throw new Error('Disposition invalide.');
      out.forEach(function (f, i) { f.id = 'x' + (i + 1); });
      return { fields: out, disposition: data.disposition, summary: str(data.summary, 400) ? data.summary : out.length + ' champs proposés' };
    },
    adjustments: function (data, m) {
      if (!data || !Array.isArray(data.adjustments)) throw new Error('Liste absente.');
      var ys = m.fin.years, rev = m.fin.revenue[ys[ys.length - 1]] || 1e7, out = [];
      data.adjustments.slice(0, 12).forEach(function (a) {
        if (!a || CATS.indexOf(a.category) < 0 || !str(a.label, 160) || !Array.isArray(a.amounts) || ['solide', 'défendable', 'agressif'].indexOf(a.rating) < 0) return;
        var am = {}, okA = false; ys.forEach(function (y) { am[y] = 0; });
        a.amounts.forEach(function (x) { if (x && ys.indexOf(x.year) >= 0 && typeof x.amount === 'number' && isFinite(x.amount) && Math.abs(x.amount) <= Math.min(5e6, rev)) { am[x.year] = Math.round(x.amount); if (x.amount) okA = true; } });
        if (!okA) return;
        out.push({ cat: a.category, label: a.label.trim(), amounts: am, rating: a.rating, line: str(a.source_line, 300) ? a.source_line : a.label, why: str(a.rationale, 600) ? a.rationale : '', evidence: 'Ligne citée : « ' + String(a.source_line || '').slice(0, 120) + ' »', trap: a.recurring_risk ? 'Le modèle signale un risque de récurrence : vérifiez les trois exercices.' : null, needsEvidence: null });
      });
      if (!out.length) throw new Error('Aucun retraitement valide.');
      return { adjustments: out, ignored: Array.isArray(data.ignored_lines) ? data.ignored_lines.filter(function (s) { return typeof s === 'string'; }).slice(0, 20) : [] };
    },
    teaser: function (data) {
      if (!data || !str(data.title, 160) || !str(data.intro, 500) || !Array.isArray(data.highlights) || !str(data.structure, 300)) throw new Error('Brouillon incomplet.');
      var hl = data.highlights.filter(function (h) { return str(h, 240); }).slice(0, 6);
      if (!hl.length) throw new Error('Aucun point saillant.');
      return [{ k: 'title', t: data.title.trim() }, { k: 'intro', t: data.intro.trim() }].concat(hl.map(function (h) { return { k: 'hl', t: h.trim() }; })).concat([{ k: 'structure', t: data.structure.trim() }]);
    }
  };

  g.R = { extractNotes: extractNotes, redact: redact, CATS: CATS, adjustmentsFromText: adjustmentsFromText, proposeFromStatements: proposeFromStatements, parseLedgerLine: parseLedgerLine,
    teaserFacts: teaserFacts, teaserDraft: teaserDraft, scanTeaser: scanTeaser, openIssues: openIssues, nameChecks: nameChecks, tokens: tokens, SCHEMAS: SCHEMAS, VALIDATE: VALIDATE, ageBand: ageBand };
})(window);
