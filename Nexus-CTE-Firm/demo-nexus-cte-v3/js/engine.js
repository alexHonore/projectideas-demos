/* Nexus CTE V3 — moteurs déterministes, génériques : chaque fonction reçoit un mandat (ou une piste) et l'état.
   « Les modèles proposent, les moteurs calculent, les humains valident. » Chaque montant affiché provient d'ici. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U;

  function today(st) { return (st && st.clock && st.clock.d) || D.TODAY; }
  function nowMin(st) { return (st && st.clock && st.clock.m != null) ? st.clock.m : D.START_MIN; }
  function byId(list, id) { for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i]; return null; }

  /* ---------------- Secteurs ---------------- */
  function sectorOf(scian) {
    var s = String(scian || ''), best = null, bl = 0;
    D.SECTORS.forEach(function (x) { var l = 0; while (l < s.length && l < x.code.length && s[l] === x.code[l]) l++; if (l > bl) { bl = l; best = x; } });
    return bl >= 2 ? best : null;
  }
  function sectorAffinity(sectors, scian) {
    var s = String(scian || ''), best = 20;
    (sectors || []).forEach(function (c) {
      c = String(c);
      if (c === '*') { best = Math.max(best, 70); return; }
      var l = 0; while (l < s.length && l < c.length && s[l] === c[l]) l++;
      var full = l === c.length || l === s.length; // le code de l'acheteur est un préfixe du SCIAN du mandat
      var v = !full ? (l >= 3 ? 70 : l === 2 ? 60 : 20) : l >= 4 ? 100 : l === 3 ? 85 : l === 2 ? 60 : 20;
      var adj = (D.ADJACENT[s.slice(0, 3)] || []).some(function (a) { return c.indexOf(a) === 0 || a.indexOf(c) === 0; });
      if (adj) v = Math.max(v, 55);
      best = Math.max(best, v);
    });
    return best;
  }

  /* ---------------- Retraitement du BAIIA (§16.2) ---------------- */
  function years(m) { return (m.fin && m.fin.years) || []; }
  function baseYear(m) { var y = years(m); return y[y.length - 1]; }
  function normalization(m) {
    var ys = years(m), out = { years: ys, declared: {}, conservative: {}, full: {}, rows: [] };
    var pending = 0, accepted = 0, rejected = 0;
    ys.forEach(function (y) { var v = (m.fin.ebitda || {})[y] || 0; out.declared[y] = v; out.conservative[y] = v; out.full[y] = v; });
    (m.adjustments || []).forEach(function (a) {
      var st = m.adj[a.id] || {};
      var status = st.status || 'proposed', rating = st.rating || a.rating;
      if (status === 'proposed') pending++; else if (status === 'accepted') accepted++; else rejected++;
      if (status === 'accepted') ys.forEach(function (y) { var v = (a.amounts || {})[y] || 0; out.full[y] += v; if (rating === 'solide') out.conservative[y] += v; });
      out.rows.push({ a: a, status: status, rating: rating, reason: st.reason || '' });
    });
    var by = baseYear(m);
    out.pending = pending; out.accepted = accepted; out.rejected = rejected; out.decided = accepted + rejected; out.total = (m.adjustments || []).length;
    out.base = by; out.solidSum = by ? out.conservative[by] - out.declared[by] : 0; out.fullSum = by ? out.full[by] - out.declared[by] : 0;
    return out;
  }
  function baseEbitda(m, which) { var n = normalization(m); which = which || m.valBase || 'conservative'; return { value: n.base ? n[which][n.base] : 0, which: which, n: n }; }
  var BASE_LABEL = { declared: 'BAIIA déclaré', conservative: 'BAIIA retraité conservateur', full: 'BAIIA retraité complet' };
  function cagr(m) { var ys = years(m); if (ys.length < 2) return 0; var a = m.fin.revenue[ys[0]], b = m.fin.revenue[ys[ys.length - 1]]; if (!a || !b) return 0; return Math.pow(b / a, 1 / (ys.length - 1)) - 1; }
  // Contrôles déterministes des états saisis : jamais une case « validé » manuelle.
  function statementChecks(m) {
    var ys = years(m), out = (m.fin.extraChecks || []).slice();
    var okRev = ys.every(function (y) { return (m.fin.revenue[y] || 0) > 0; });
    out.push({ id: 'rev', label: 'Ventes positives pour les trois exercices', ok: okRev, detail: ys.map(function (y) { return y + ' : ' + U.money(m.fin.revenue[y]); }).join('; ') });
    var margins = ys.map(function (y) { return (m.fin.ebitda[y] || 0) / (m.fin.revenue[y] || 1); });
    var okM = margins.every(function (x) { return x > 0 && x < 0.45; });
    out.push({ id: 'margin', label: 'BAIIA positif et inférieur à 45 % des ventes', ok: okM, detail: 'Marges : ' + margins.map(function (x) { return U.pct(x * 100, 1); }).join(', ') });
    var consec = ys.length === 3 && ys[1] === ys[0] + 1 && ys[2] === ys[1] + 1;
    out.push({ id: 'years', label: 'Trois exercices consécutifs', ok: consec, detail: ys.join(', ') });
    if (m.fin.lines && m.fin.lines.length) {
      var by = baseYear(m), lines = m.fin.lines, sum = 0;
      lines.forEach(function (l) { if (!l.subtotal && !l.total && l.id !== 'amo' && l.id !== 'int' && l.id !== 'imp') sum += l.amount; });
      var tot = (lines.filter(function (l) { return l.id === 'baiia'; })[0] || {}).amount;
      out.push({ id: 'sum', label: 'Les sous-totaux se recalculent', ok: tot == null || Math.abs(sum - tot) < 2, detail: tot == null ? 'Sans détail de lignes' : 'BAIIA recalculé : ' + U.money(sum) + ' (déclaré ' + U.money(m.fin.ebitda[by]) + ')' });
    }
    var jumps = [];
    for (var i = 1; i < ys.length; i++) { var a = m.fin.ebitda[ys[i - 1]], b = m.fin.ebitda[ys[i]]; if (a && Math.abs(b - a) / a > 0.25) jumps.push(ys[i] + ' : ' + U.pct((b - a) / a * 100, 0)); }
    out.push({ id: 'yoy', label: 'Écarts d’une année à l’autre supérieurs à 25 %', ok: !jumps.length && !m.fin.yoyNote, warn: true, detail: jumps.length ? 'BAIIA ' + jumps.join(', ') : m.fin.yoyNote || 'Aucun écart de plus de 25 % sur le BAIIA' });
    return out;
  }
  function statementsValid(m) { return !!(m.fin && m.fin.entered) && statementChecks(m).every(function (c) { return c.ok || c.warn; }); }

  /* ---------------- Évaluation (§16.3) ---------------- */
  function modifierValue(mod, base) { if (mod.auto) return base < 250000 ? -0.5 : base < 500000 ? -0.25 : 0; return mod.value; }
  function valuation(m, opts) {
    opts = opts || {};
    var b = opts.base != null ? { value: opts.base, which: opts.which || 'custom' } : baseEbitda(m, opts.which);
    var base = b.value, net = 0, mods = [];
    (m.val.modifiers || []).forEach(function (mod) {
      var st = (m.mods && m.mods[mod.id]) || (mod.auto ? 'accepted' : 'proposed');
      var v = modifierValue(mod, base);
      var applied = st === 'accepted' && !(opts.remove && opts.remove.indexOf(mod.id) >= 0);
      if (applied) net += v;
      mods.push({ mod: mod, status: st, value: v, applied: applied });
    });
    var bm = m.val.base;
    var mult = { low: bm.low + net, mid: bm.mid + net, high: bm.high + net };
    var ev = { low: Math.round(base * mult.low), mid: Math.round(base * mult.mid), high: Math.round(base * mult.high) };
    var br = m.val.bridge, wcAdj = br.wcClose - br.wcTarget, eq = {};
    ['low', 'mid', 'high'].forEach(function (k) { eq[k] = ev[k] - br.debt + br.cash + wcAdj; });
    return { base: base, which: b.which, net: net, mods: mods, mult: mult, ev: ev, equity: eq, wcAdj: wcAdj, decided: mods.filter(function (x) { return x.status !== 'proposed'; }).length, pending: mods.filter(function (x) { return x.status === 'proposed'; }).length };
  }
  function sensitivity(m) {
    var n = normalization(m), v = valuation(m), by = n.base;
    var cols = [{ id: 'declared', label: 'Déclaré', v: n.declared[by] }, { id: 'conservative', label: 'Conservateur', v: n.conservative[by] }, { id: 'full', label: 'Complet', v: n.full[by] }];
    var rows = []; for (var d = -0.75; d <= 0.751; d += 0.25) rows.push(Math.round((v.mult.mid + d) * 100) / 100);
    return { cols: cols, rows: rows, mid: v.mult.mid, which: v.which };
  }
  // Écart de valeur : leviers appliqués en séquence (modulateurs négatifs avec levier, puis pro forma hors base), sans double comptage.
  function valueGap(m) {
    var v0 = valuation(m), cur = { base: v0.base, mult: v0.mult.mid, val: v0.ev.mid }, steps = [];
    v0.mods.forEach(function (x) {
      if (!x.applied || x.value >= 0 || !x.mod.lever) return;
      var m1 = cur.mult - x.value, val1 = Math.round(cur.base * m1);
      steps.push({ id: x.mod.id, label: x.mod.lever, detail: 'Multiple ' + U.x(cur.mult) + ' à ' + U.x(m1), delta: val1 - cur.val });
      cur = { base: cur.base, mult: m1, val: val1 };
    });
    var by = baseYear(m);
    (m.adjustments || []).forEach(function (a) {
      if (a.cat !== 'Pro forma') return;
      var st = m.adj[a.id] || {}, amt = (a.amounts || {})[by] || 0;
      if (!amt || (v0.which === 'full' && st.status === 'accepted')) return;
      var b3 = cur.base + amt, m3 = cur.mult, crossed = cur.base < 500000 && b3 >= 500000;
      if (crossed) m3 += 0.25;
      var val3 = Math.round(b3 * m3);
      steps.push({ id: a.id, label: 'Réaliser : ' + a.label.charAt(0).toLowerCase() + a.label.slice(1), detail: 'BAIIA ' + U.money(cur.base) + ' à ' + U.money(b3) + (crossed ? ', seuil de 500 k$ franchi (+0,25×)' : ''), delta: val3 - cur.val });
      cur = { base: b3, mult: m3, val: val3 };
    });
    return { today: v0.ev.mid, after: cur.val, steps: steps, total: cur.val - v0.ev.mid };
  }
  // Modulateurs proposés par règles pour un mandat créé (mêmes règles que les modulateurs semés).
  /* ---------------- Preuves : une citation ne renvoie qu'à ce qui existe ---------------- */
  function evidenceRefs(text) {
    var out = [], re = /pi[eè]ces?\s+((?:\d\d-\d\d)(?:\s*(?:,|et)\s*\d\d-\d\d)*)/gi, mm;
    while ((mm = re.exec(String(text || '')))) mm[1].replace(/\d\d-\d\d/g, function (id) { if (out.indexOf(id) < 0) out.push(id); });
    return out;
  }
  // { refs, missing:[{id,name,status}], ok } ; une pièce compte quand elle est révisée (ou sans objet).
  function evidenceOf(m, x) {
    var refs = evidenceRefs(x && x.evidence); if (x && x.needsEvidence && refs.indexOf(x.needsEvidence) < 0) refs.unshift(x.needsEvidence);
    var missing = refs.filter(function (id) { var s = itemStatus(m, id); return s !== 'revise' && s !== 'sans_objet'; }).map(function (id) { return { id: id, name: itemName(m, id), status: itemStatus(m, id) }; });
    return { refs: refs, missing: missing, ok: !missing.length };
  }
  function citeOf(m, id, page) { var s = itemStatus(m, id); return s === 'revise' ? id + (page ? ', p. ' + page : '') : id + ' « ' + itemName(m, id) + ' » à obtenir'; }
  // Modulateurs proposés par règles pour un mandat saisi : la preuve citée est ce qui existe réellement
  // (déclaration au formulaire ou à l'audit, états saisis). Un modulateur qui exige une pièce porte « needsEvidence » :
  // il reste « à documenter » et ne peut pas être retenu tant que la pièce n'est pas reçue et révisée dans la salle.
  function proposeModifiers(m) {
    var p = m.profile || {}, decl = /^radar:/.test(m.origin || '') ? 'Déclaré à l’audit de sortie' : 'Déclaré au formulaire de mandat';
    var out = [{ id: 'taille', label: 'Taille : BAIIA inférieur à 500 000 $', auto: true, evidence: 'Calculé à partir du BAIIA retenu', source: 'rules' }];
    if (p.ownerDependency === 'élevée') out.push({ id: 'dependance', label: 'Dépendance au dirigeant élevée', value: -0.75, evidence: decl + ' (dépendance élevée), à confirmer en rencontre', lever: 'Nommer un directeur et transférer les comptes clés sur 12 mois', source: 'rules' });
    else if (p.ownerDependency === 'moyenne') out.push({ id: 'dependance', label: 'Dépendance au dirigeant moyenne', value: -0.25, evidence: decl + ' (dépendance moyenne), à confirmer en rencontre', lever: 'Déléguer les responsabilités clés du cédant', source: 'rules' });
    if (p.topClientPct >= 30) out.push({ id: 'concentration', label: 'Concentration client : ' + p.topClientPct + ' % du chiffre d’affaires', value: p.topClientPct >= 40 ? -0.5 : -0.25, evidence: decl + ', premier client à ' + p.topClientPct + ' %', needsEvidence: '04-01', lever: 'Ramener le premier client sous 25 %', source: 'rules' });
    if (p.recurringPct >= 50) out.push({ id: 'recurrence', label: 'Récurrence : ' + p.recurringPct + ' % des ventes sous contrat', value: 0.25, evidence: decl + ', ' + p.recurringPct + ' % des ventes sous contrat', needsEvidence: '04-02', source: 'rules' });
    var c = cagr(m), ys = years(m);
    if (ys.length >= 2) out.push({ id: 'croissance', source: 'rules', label: 'Croissance : TCAC du chiffre d’affaires de ' + U.pct(c * 100, 1) + ' sur ' + (ys.length - 1) + ' ans', value: c >= 0.05 ? 0.25 : c < 0 ? -0.25 : 0, evidence: 'États financiers saisis : ' + U.money(m.fin.revenue[ys[0]]) + ' en ' + ys[0] + ' à ' + U.money(m.fin.revenue[ys[ys.length - 1]]) + ' en ' + ys[ys.length - 1] + ' (ÉF)' });
    return out;
  }

  /* ---------------- Honoraires (§11.4, Partie A) ---------------- */
  function fee(policyId, value) {
    var p = D.FEE_POLICIES[policyId || 'A'], lower = 0, gross = 0, parts = [];
    for (var i = 0; i < p.tiers.length; i++) {
      var t = p.tiers[i], span = Math.max(0, Math.min(value, t.upTo) - lower);
      if (span > 0) { gross += span * t.rate; parts.push({ from: lower, to: Math.min(value, t.upTo), rate: t.rate, amount: span * t.rate }); }
      lower = t.upTo; if (value <= t.upTo) break;
    }
    gross = Math.round(gross);
    var minApplied = gross < p.min; if (minApplied) gross = p.min;
    var credit = Math.round(p.prep * p.credit);
    return { policy: p, value: value, gross: gross, parts: parts, minApplied: minApplied, credit: credit, net: gross - credit, prep: p.prep };
  }
  function loiOf(m, id) { return byId(m.lois, id || m.loiSelected); }
  function dealPrice(m) { var l = m.loiSigned ? loiOf(m) : null; return l ? l.ev : valuation(m).ev.mid; }
  function propertyDeal(m, loi) {
    if (!m.property) return null;
    loi = loi || loiOf(m);
    if (loi && !loi.leaseback && loi.propertyPrice) return { price: loi.propertyPrice, to: 'acquereur' };
    if (m.property.investor && (!loi || loi.leaseback)) return { price: m.property.value, to: 'investisseur' };
    return { price: m.property.value, to: loi ? 'acquereur' : 'a_determiner' };
  }

  /* ---------------- Appariement (§8) ---------------- */
  function metrics(m) {
    var n = normalization(m), by = n.base, v = valuation(m);
    var ebitda = by ? n.conservative[by] : 0;
    return { ebitda: ebitda, revenue: by ? m.fin.revenue[by] : 0, ev: v.ev.mid || 0, requiredEquity: Math.round((v.ev.mid || 0) * D.FINANCING.equityShare), scian: m.profile.scian, region: m.profile.region, structure: m.structure, property: !!m.property };
  }
  function fitRange(v, min, max) {
    if (min == null && max == null) return null;
    if (min != null && v < min) return Math.max(0, Math.round(100 - 120 * (min - v) / min));
    if (max != null && v > max) return Math.max(0, Math.round(100 - 60 * (v - max) / max));
    if (min != null && max != null && max > min) { var c = (min + max) / 2, h = (max - min) / 2; return Math.round(100 - 15 * Math.abs(v - c) / h); }
    return 95;
  }
  function geoFit(regions, region) {
    regions = regions || [];
    if (regions.indexOf(region) >= 0) return 100;
    if (regions.indexOf('Québec') >= 0) return 80;
    var near = D.NEAR[region] || [];
    if (regions.some(function (r) { return near.indexOf(r) >= 0; })) return 70;
    return 30;
  }
  var TL = { now: 100, '6m': 80, '12m': 60, opportuniste: 50 };
  function subScores(b, m, mx) {
    mx = mx || metrics(m);
    var cr = b.criteria || {}, sub = {};
    sub.secteur = sectorAffinity(cr.sectors, mx.scian);
    var e = fitRange(mx.ebitda, cr.ebitdaMin, cr.ebitdaMax), r = fitRange(mx.revenue, cr.revenueMin, cr.revenueMax);
    sub.taille = e == null && r == null ? 70 : e == null ? r : r == null ? e : Math.round(0.6 * e + 0.4 * r);
    sub.tailleKnown = !(e == null && r == null);
    sub.geo = geoFit(cr.regions, mx.region);
    var wanted = mx.structure === 'actifs' ? 'actifs' : 'actions';
    var prefBpv = (m.sellerPrefs || []).some(function (p) { return p.id === 'bpv'; });
    sub.structure = !(cr.structures || []).length ? 60 : cr.structures.indexOf(wanted) >= 0 ? 85 + (cr.bpvOk && prefBpv ? 10 : 0) : 35;
    var equity = b.fundingEvidence ? b.equityMax : b.equityMin;
    sub.capacite = equity == null ? 30 : !mx.requiredEquity ? 80 : equity >= mx.requiredEquity ? (b.fundingEvidence ? 100 : 80) : Math.round(equity / mx.requiredEquity * (b.fundingEvidence ? 90 : 70));
    sub.echeancier = TL[b.timeline] || 60;
    sub.historique = b.acquisitions >= 2 ? 100 : b.acquisitions === 1 ? 80 : b.priorInterest ? 60 : 50;
    sub.synergies = b.type === 'strategique' || b.type === 'consolidateur' ? (sub.secteur >= 85 ? 85 : sub.secteur >= 60 ? 60 : 30) : b.type === 'interne' ? 70 : b.type === 'familial' ? 60 : b.type === 'financier' ? 40 : 30;
    sub.immobilier = !mx.property ? 70 : cr.leaseback === true ? 90 : cr.leaseback === false ? 50 : 70;
    return sub;
  }
  function matchScore(b, m, version, st) {
    var W = D.WEIGHTS[version || 'nexus'], mx = metrics(m), sub = subScores(b, m, mx), raw = 0, parts = [];
    W.dims.forEach(function (d) { var s = sub[d.id] || 0, pts = d.w * s / 100; raw += pts; parts.push({ id: d.id, label: d.label, w: d.w, sub: s, pts: pts }); });
    var score = Math.round(raw);
    var band = sub.secteur >= 85 && sub.taille >= 85 && sub.geo >= 70 && sub.structure >= 80 && sub.capacite >= 80 ? 'correspond' : (sub.secteur < 85 && !sub.tailleKnown) || score < 55 ? 'hypothese' : 'pourrait';
    var chips = [];
    chips.push(sub.secteur >= 100 ? 'SCIAN exact' : sub.secteur >= 85 ? 'Secteur proche' : sub.secteur >= 55 ? 'Secteur adjacent' : 'Hors secteur');
    chips.push(!sub.tailleKnown ? 'Taille non déclarée' : sub.taille >= 85 ? 'Taille alignée' : 'Hors de la taille déclarée');
    chips.push(sub.capacite >= 100 ? 'Financement prêt' : sub.capacite >= 80 ? 'Fonds propres suffisants, à prouver' : 'Mise de fonds sous le requis');
    if (b.acquisitions >= 2) chips.push('A déjà acquis ' + b.acquisitions + ' fois');
    var fr = freshness(lastVerified(b, st), today(st));
    if (fr.level === 'low') chips.push('À requalifier');
    var reason = m.exclusions && m.exclusions[b.id];
    if (reason) return { score: 0, raw: score, excluded: true, reason: reason, parts: parts, band: 'exclu', chips: chips, sub: sub };
    return { score: score, raw: score, excluded: false, parts: parts, band: band, chips: chips, sub: sub };
  }
  function lastVerified(b, st) { return b.lastVerified; }
  function isBusinessBuyer(b) { return !b.archived && b.type !== 'investisseur_immobilier' && !b.coInvestor; }
  function candidates(m, st) { return (st.buyers || []).filter(function (b) { return isBusinessBuyer(b) && (!b.onlyMandate || b.onlyMandate === m.id) && b.underMandate !== m.id; }); }
  function ranked(m, st, version) {
    var mx = metrics(m);
    return candidates(m, st).filter(function (b) { return sectorAffinity(b.criteria.sectors, mx.scian) >= 55 || (m.shortlist || []).indexOf(b.id) >= 0 || (m.nda || {})[b.id]; }).map(function (b) {
      var r = matchScore(b, m, version || st.weights, st);
      var refused = (m.refusals || []).filter(function (x) { return x.buyer === b.id; })[0] || null;
      return { b: b, r: r, refused: refused };
    }).sort(function (a, b) { return b.r.score - a.r.score || a.b.name.localeCompare(b.b.name); });
  }
  function freshness(lastIso, clock) {
    if (!lastIso) return { label: 'Jamais vérifié', level: 'low', days: null, conf: 'Faible' };
    var d = U.diffDays(lastIso, clock);
    if (d <= 90) return { label: 'Vérifié il y a ' + U.days(Math.max(0, d)), level: 'high', days: d, conf: 'Élevée' };
    if (d <= 180) return { label: 'Vérifié il y a ' + U.days(d), level: 'mid', days: d, conf: 'Moyenne' };
    return { label: 'Vérifié il y a ' + U.days(d) + ', à requalifier', level: 'low', days: d, conf: 'Faible' };
  }
  // Liquidité acheteur : univers théorique (CRM et univers généré) jusqu'aux acheteurs ayant déjà manifesté un intérêt.
  function funnel(m, st) {
    var clock = today(st), mx = metrics(m);
    var pool = candidates(m, st).map(function (b) { return { id: b.id, name: b.name, type: b.type, angle: b.angle, sectors: b.criteria.sectors, regions: b.criteria.regions, ebitdaMin: b.criteria.ebitdaMin, ebitdaMax: b.criteria.ebitdaMax, lastVerified: b.lastVerified, fundingEvidence: b.fundingEvidence, prior: b.priorInterest || b.acquisitions >= 1, crm: true }; })
      .concat(D.UNIVERSE.map(function (u) { return { id: u.id, name: u.name, type: u.type, angle: u.angle, sectors: u.sectors, regions: [u.region], ebitdaMin: u.ebitdaMin, ebitdaMax: u.ebitdaMax, lastVerified: u.lastVerified, fundingEvidence: u.fundingEvidence, prior: u.priorInterest, generated: true }; }));
    pool.forEach(function (e) { e.aff = sectorAffinity(e.sectors, mx.scian); e.size = fitRange(mx.ebitda, e.ebitdaMin, e.ebitdaMax); e.geo = geoFit(e.regions, mx.region); e.excluded = !!(m.exclusions && m.exclusions[e.id]); });
    var all = pool.filter(function (e) { return e.aff >= 55; });
    var verified = all.filter(function (e) { return e.lastVerified; });
    var recent = verified.filter(function (e) { return U.diffDays(e.lastVerified, clock) <= 180; });
    var fit = recent.filter(function (e) { return (e.size == null ? 60 : e.size) >= 60 && e.geo >= 70; });
    var funding = fit.filter(function (e) { return e.fundingEvidence; });
    var prior = funding.filter(function (e) { return e.prior; });
    var steps = [
      { id: 'all', label: 'Univers théorique', note: 'Horizontal, aval, amont, consolidateurs, financiers', list: all },
      { id: 'verified', label: 'Profils vérifiés par un agent', note: 'Personne, thèse, taille, territoire', list: verified },
      { id: 'recent', label: 'Actifs depuis moins de 180 jours', note: 'Critères confirmés récemment', list: recent },
      { id: 'fit', label: 'Taille et géographie alignées', note: 'Critères déclarés ou appris', list: fit },
      { id: 'funding', label: 'Preuve de financement', note: 'Fonds propres ou prêteur documentés', list: funding },
      { id: 'prior', label: 'Intérêt antérieur pour ce type', note: 'Historique d’approche ou d’acquisition', list: prior }
    ];
    steps.forEach(function (s) { s.n = s.list.length; s.excluded = s.list.filter(function (e) { return e.excluded; }).length; });
    return steps;
  }

  /* ---------------- Financement (§16.4) ---------------- */
  function payment(P, r, n) { if (!P) return 0; if (!r) return P / n; return P * r / (1 - Math.pow(1 + r, -n)); }
  function financing(m, loi) {
    var F = D.FINANCING;
    loi = loi || loiOf(m);
    var base = baseEbitda(m, 'conservative').value;
    var price = loi ? loi.ev : valuation(m).ev.mid;
    var bpvAmt = loi && loi.bpv ? loi.bpv.amount : 0, bpvRate = loi && loi.bpv ? loi.bpv.rate : 0, bpvYears = loi && loi.bpv ? loi.bpv.years : 1;
    var earn = loi ? loi.earnout || 0 : 0;
    var equity = loi && loi.equity != null ? loi.equity : Math.round(price * F.equityShare);
    var senior = Math.max(0, price - equity - bpvAmt - earn);
    var capex = Math.round(base * F.capexShare / 1000) * 1000, taxes = Math.round(base * F.taxShare / 1000) * 1000;
    if (m.fin.capex != null) capex = m.fin.capex;
    if (m.fin.taxes != null) taxes = m.fin.taxes;
    function ds(rateShock) { return payment(senior, F.senior.rate + rateShock, F.senior.years) + payment(bpvAmt, bpvRate, bpvYears); }
    function flow(shock) { return base * (1 - shock) - capex - taxes; }
    var grid = [0, 0.1, 0.2, 0.3].map(function (es) { return { shock: es, cells: [0, 0.01, 0.02, 0.03].map(function (rs) { var d = ds(rs); var r = d ? flow(es) / d : 99; return { rate: rs, dscr: r, pass: r >= F.threshold }; }) }; });
    var dsBase = ds(0);
    return {
      loi: loi, base: base, sources: [{ label: 'Mise de fonds de l’acquéreur', v: equity }, { label: 'Dette senior, ' + U.pct(F.senior.rate * 100, 1) + ' sur ' + F.senior.years + ' ans', v: senior }, { label: 'Balance de prix de vente' + (loi && loi.bpv ? ', ' + U.pct(bpvRate * 100, 1) + ' sur ' + bpvYears + ' ans' : ''), v: bpvAmt }].concat(earn ? [{ label: 'Complément de prix conditionnel', v: earn }] : []),
      uses: [{ label: 'Prix des actions (valeur d’entreprise convenue)', v: price }], senior: senior, equity: equity,
      seniorPay: payment(senior, F.senior.rate, F.senior.years), bpvPay: payment(bpvAmt, bpvRate, bpvYears), debtService: dsBase,
      flow: flow(0), dscr: dsBase ? flow(0) / dsBase : 99, threshold: F.threshold, grid: grid, capex: capex, taxes: taxes, lender: m.lender || F.lender
    };
  }
  /* ---------------- Lettres d'intention (§MA-24) ---------------- */
  function loiCompare(m, loi) {
    var wcAdj = m.val.bridge.wcTarget - loi.wcTarget, bpv = loi.bpv ? loi.bpv.amount : 0;
    var certain = loi.cash + wcAdj, fees = fee(m.feePolicy, loi.ev), feeCertain = loi.earnout ? fee(m.feePolicy, loi.ev - loi.earnout) : fees;
    return { loi: loi, wcAdj: wcAdj, certain: certain, deferred: bpv, contingent: loi.earnout || 0, max: certain + bpv + (loi.earnout || 0), nonContingent: certain + bpv, fee: fees.gross, feeAtClose: feeCertain.gross, feeContingent: fees.gross - feeCertain.gross, implied: loi.ev / (baseEbitda(m, 'conservative').value || 1) };
  }
  function prefsMet(m, b, loi) {
    var n = 0;
    (m.sellerPrefs || []).forEach(function (p) {
      if (p.id === 'emplois' && /maintien|engagement/i.test(loi.employees || '')) n++;
      else if (p.id === 'quebec' && b && b.prefs && b.prefs.quebec) n++;
      else if (p.id === 'transition' && /\d/.test(loi.transition || '') && parseInt(loi.transition, 10) <= 12) n++;
      else if (p.id === 'bpv' && loi.bpv) n++;
      else if (p.id === 'immeuble' && (loi.leaseback || !m.property || (loi.propertyPrice && loi.propertyPrice >= m.property.value))) n++;
    });
    return n;
  }
  // Lettres d'intention arrivées à la date limite : gabarits du dossier ou génération déterministe pour les signataires.
  function generateLOIs(m, st) {
    var deadline = m.loiDeadline, out = [];
    var signers = ndaSigned(m).filter(function (id) { return m.grants[id] && !m.grants[id].revoked && m.nda[id] !== 'retire'; });
    if (m.loiTemplates && m.loiTemplates.length) {
      m.loiTemplates.forEach(function (t) { if (signers.indexOf(t.buyer) < 0) return; var l = U.clone(t); l.close = U.addDays(deadline, t.closeOffset || 84); delete l.closeOffset; l.received = deadline; l.source = 'reçue'; out.push(l); });
      return out;
    }
    var v = valuation(m), mid = v.ev.mid, br = m.val.bridge;
    signers.forEach(function (id, i) {
      var b = byId(st.buyers, id); if (!b) return;
      var r = matchScore(b, m, st.weights, st);
      var f = U.clamp(0.92 + (r.score - 60) / 200, 0.85, 1.1);
      var ev = Math.round(mid * f / 25000) * 25000;
      var l = { id: 'l' + U.hash(m.id + id + deadline), buyer: id, ev: ev, earnout: 0, earnoutCond: '', wcTarget: br.wcTarget, conditions: [], received: deadline, source: 'reçue', generated: true };
      if (b.type === 'financier') { l.earnout = Math.round(ev * 0.2 / 5000) * 5000; l.bpv = { amount: Math.round(ev * 0.1 / 5000) * 5000, years: 3, rate: 0.07 }; l.earnoutCond = 'BAIIA d’au moins ' + U.money(Math.round(v.base * 1.15 / 5000) * 5000) + ' sur deux exercices'; l.wcTarget = br.wcTarget + Math.round(br.wcTarget * 0.08 / 5000) * 5000; }
      else if (b.type === 'consolidateur') { l.bpv = null; }
      else if (b.type === 'repreneur' || b.type === 'interne') { l.bpv = { amount: Math.round(ev * 0.25 / 5000) * 5000, years: 5, rate: 0.06 }; }
      else { l.bpv = { amount: Math.round(ev * 0.2 / 5000) * 5000, years: 5, rate: 0.06 }; }
      var bpvA = l.bpv ? l.bpv.amount : 0;
      l.cash = ev - bpvA - l.earnout;
      l.equity = b.type === 'consolidateur' ? l.cash : Math.round(ev * 0.2 / 5000) * 5000;
      l.financing = b.type === 'consolidateur' ? 'Facilité de crédit en place' : b.fundingEvidence && b.type !== 'repreneur' ? 'Approbation conditionnelle obtenue' : 'À obtenir';
      l.financingOk = l.financing !== 'À obtenir';
      l.exclusivity = b.type === 'financier' ? 120 : b.type === 'consolidateur' ? 60 : 90;
      l.close = U.addDays(deadline, b.type === 'consolidateur' ? 56 : b.type === 'financier' ? 112 : 84 + i * 7);
      l.transition = b.type === 'financier' ? '12 mois' : b.type === 'consolidateur' ? '3 mois' : '6 mois';
      l.employees = b.prefs && b.prefs.emplois ? 'Engagement écrit de maintien, 24 mois' : 'Aucun engagement';
      if (m.property) {
        l.leaseback = b.criteria.leaseback !== false && !!m.property.investor;
        l.propertyPrice = l.leaseback ? null : Math.round(m.property.value * 0.9 / 25000) * 25000;
        l.property = l.leaseback ? 'Cession-bail acceptée (loyer marchand)' : 'Achat de l’immeuble à ' + U.money(l.propertyPrice);
      } else { l.leaseback = false; l.propertyPrice = null; l.property = 'Sans objet : locaux loués'; }
      l.conditions = [l.financingOk ? 'Financement en place' : 'Financement senior à obtenir', 'Vérification diligente de ' + (b.type === 'financier' ? 90 : 60) + ' jours'].concat(l.earnout ? ['Complément de prix sur deux exercices'] : []);
      l.prefsMet = prefsMet(m, b, l);
      out.push(l);
    });
    return out;
  }

  /* ---------------- Radar de relève (§6.11) ---------------- */
  function sectorRate(scian) {
    var s = String(scian);
    for (var n = s.length; n >= 3; n--) if (D.SECTOR_RATES[s.slice(0, n)] != null) return D.SECTOR_RATES[s.slice(0, n)];
    return 0.5;
  }
  function phoneOf(c) { return (c.contacts || []).filter(function (k) { return /Téléphone|Cellulaire/.test(k.kind); })[0] || null; }
  function emailOf(c, st) { var cs = (st.companyState && st.companyState[c.id]) || {}; return (c.contacts || []).filter(function (k) { return k.kind === 'Courriel'; })[0] || (cs.email ? { id: c.id + 'e', kind: 'Courriel', value: cs.email, business: true, src: 'Appel du ' + U.date(cs.emailDate), srcDate: cs.emailDate, basis: 'aucun' } : null); }
  function radarScore(c, st) {
    var clock = today(st);
    var cs = (st.companyState && st.companyState[c.id]) || {};
    var yrs = U.diffDays(c.registered, clock) / 365.25, comps = [];
    comps.push({ id: 'age', label: 'Âge de l’entreprise', w: 25, pts: yrs >= 20 ? 25 : yrs >= 11 ? 17.5 : 6.25, detail: Math.floor(yrs) + ' ans (REQ, immatriculation ' + U.date(c.registered) + ')' });
    var e = cs.employees || c.employees, eff = e >= 5 && e <= 19 ? 20 : e >= 3 && e <= 4 ? 17 : e >= 20 && e <= 25 ? 15 : 6;
    comps.push({ id: 'eff', label: 'Effectif', w: 20, pts: eff, detail: e + ' employés (' + (cs.employees ? 'déclaré au dossier' : c.employeesSrc) + ')' });
    var rate = sectorRate(c.scian);
    comps.push({ id: 'sec', label: 'Secteur', w: 20, pts: rate * 20, detail: 'SCIAN ' + c.scian + ', taux d’intention normalisé ' + U.num(rate, 2) + (String(c.scian).indexOf('722') === 0 ? ', secteur pénalisé au barème' : '') });
    var sig = 0, sigDetail = [];
    (c.signals || []).forEach(function (s) { var t = D.SIGNAL_TYPES[s.type]; var dd = Math.max(0, U.diffDays(s.date, clock)); var f = Math.max(0, 1 - dd / 180); sig += t.weight * f; sigDetail.push(t.label + ' (' + U.days(dd) + ', facteur ' + U.num(f, 2) + ')'); });
    sig = Math.min(1, sig);
    comps.push({ id: 'sig', label: 'Signaux actifs', w: 20, pts: sig * 20, detail: (sigDetail.join('; ') || 'Aucun signal') + ', décroissance sur 180 jours' });
    var geo = D.LAUNCH_REGIONS.indexOf(c.region) >= 0 ? 10 : 5;
    comps.push({ id: 'geo', label: 'Géographie', w: 10, pts: geo, detail: c.region + (geo === 10 ? ', territoire de lancement' : ', hors territoire de lancement (50 %)') });
    var phone = phoneOf(c), callable = phone && !isDnc(phone.value, st) && phone.business;
    var email = emailOf(c, st), basis = email ? emailBasis(c, email, st) : 'aucun', emailable = email && basis !== 'aucun' && basis !== 'supprime';
    comps.push({ id: 'joi', label: 'Joignabilité légale', w: 5, pts: (callable ? 3 : 0) + (emailable ? 2 : 0), detail: (callable ? 'Ligne d’affaires appelable' : 'Aucune ligne appelable') + ', ' + (emailable ? 'courriel autorisé' : 'courriel non autorisé') });
    var band = cs.ageBand || c.ownerAgeBand;
    if (band === '55–64' || band === '65+') comps.push({ id: 'own', label: 'Tranche d’âge du propriétaire', w: 10, pts: 10, detail: band + ' (déclaré)', proxy: false });
    else if (band === '45–54') comps.push({ id: 'own', label: 'Tranche d’âge du propriétaire', w: 10, pts: 4, detail: band + ' (déclaré)', proxy: false });
    else { var tenure = U.diffDays(c.directorSince + '-01-01', clock) / 365.25; comps.push({ id: 'own', label: '≈ Ancienneté du dirigeant', w: 5, pts: tenure >= 20 ? 5 : 0, detail: 'Proxy à demi-poids : dirigeant depuis ' + c.directorSince + ' (' + Math.floor(tenure) + ' ans). L’âge n’est jamais déduit d’un nom.', proxy: true }); }
    var total = Math.min(100, Math.round(U.sum(comps, function (x) { return x.pts; })));
    return { total: total, comps: comps, tier: total >= 70 ? 'Chaud' : total >= 50 ? 'Tiède' : 'Froid', callable: callable, emailable: emailable, basis: basis };
  }
  function isDnc(value, st) { return (st.dnc || []).some(function (d) { return d.value === value; }); }
  function emailBasis(c, email, st) { var cs = (st.companyState && st.companyState[c.id]) || {}; if (cs.consentWithdrawn) return 'supprime'; if (cs.emailBasis) return cs.emailBasis; return email.basis; }
  var BASIS_LABEL = { expres: 'Consentement exprès', relation: 'Relation d’affaires', demande: 'Demande d’information', publication: 'Publication bien en vue', aucun: 'Aucun fondement', supprime: 'Supprimé', na: 'Sans objet (téléphone)' };
  function callingHours(st) {
    var wd = U.weekday(today(st)), weekend = wd === 0 || wd === 6, m = nowMin(st), from = weekend ? 600 : 540, to = weekend ? 1080 : 1200;
    return { ok: m >= from && m < to, weekend: weekend, label: weekend ? 'Fin de semaine : plage 10 h à 18 h' : 'Jour de semaine : plage 9 h à 20 h', now: U.time(m) };
  }
  // Barrière d'appel (§14.3) : chaque vérification bloque; aucun contournement, pour aucun rôle.
  function callGate(c, st) {
    var role = st.role, checks = [], phone = phoneOf(c);
    if (role === 'analyste') checks.push({ label: 'Rôle autorisé à prospecter', ok: false, block: 'Le rôle analyste n’a aucun outil de prospection.' });
    if (role === 'agent_acheteur') checks.push({ label: 'Rôle autorisé à prospecter des cédants', ok: false, block: 'Les agents acheteurs ne prospectent pas les cédants.' });
    if (role === 'agent_vendeur') { var t = st.training.jg; checks.push({ label: 'Formation obligatoire (Sections 1 et 8)', ok: t.s1 && t.s8, block: 'Outils d’appel débloqués après la Section 1 et la Section 8 : 3 chapitres restants.', okText: 'Sections 1 et 8 réussies' }); }
    var owner = (st.companyState[c.id] && st.companyState[c.id].owner) || c.owner, me = D.ROLE_USER[role];
    if (owner && owner !== me && (role === 'agent_vendeur' || role === 'courtier')) checks.push({ label: 'Propriété du prospect', ok: false, block: 'Prospect réservé à ' + D.TEAM[owner].name + ' : demandez le transfert plutôt que d’appeler.' });
    else if (role === 'agent_vendeur' || role === 'courtier') checks.push({ label: 'Propriété du prospect', ok: true, okText: owner ? 'Prospect attribué à ' + D.TEAM[owner].name : 'Prospect non réclamé' });
    var cw = ((st.companyState && st.companyState[c.id]) || {}).consentWithdrawn;
    if (cw === 'tout') checks.push({ label: 'Consentement (Loi 25)', ok: false, block: 'La personne a retiré son consentement (Loi 25) : aucun contact, renseignements minimisés.', okText: '' });
    checks.push({ label: 'Inscription LNNTE du télévendeur', ok: true, okText: 'Consignée par l’administratrice' });
    var onDnc = phone && isDnc(phone.value, st);
    checks.push({ label: 'Liste interne d’exclusion', ok: !onDnc, block: 'Numéro inscrit à la liste interne d’exclusion : jamais appelable.', okText: 'Numéro absent de la liste' });
    var pv = ((st.companyState && st.companyState[c.id]) || {}).phoneVerified, pvOk = !!(phone && !phone.business && pv && U.diffDays(pv, today(st)) <= 31);
    checks.push({ id: 'line', label: 'Ligne d’affaires ou personnelle', ok: !!(phone && (phone.business || pvOk)), block: phone ? 'Ligne personnelle : vérification LNNTE du numéro ' + (pv ? 'du ' + U.date(pv) + ' périmée' : 'absente') + '. Appel bloqué tant que le numéro n’est pas vérifié.' : 'Aucun numéro de téléphone au dossier.', okText: phone && phone.business ? 'Ligne d’affaires : exemption interentreprises consignée' : 'Ligne personnelle absente de la LNNTE, vérifiée le ' + U.date(pv) + ' (valide 31 jours)' });
    var scrubAge = U.diffDays(st.compliance.lastScrub, today(st));
    checks.push({ label: 'Fraîcheur de la vérification LNNTE', ok: scrubAge <= 31, block: 'Appels suspendus : liste LNNTE à mettre à jour (responsable : administratrice). Dernière vérification il y a ' + U.days(scrubAge) + '.', okText: 'Vérifiée il y a ' + U.days(scrubAge) + ' (fenêtre de 31 jours)' });
    var h = callingHours(st);
    checks.push({ label: 'Heures d’appel du destinataire', ok: h.ok, block: 'Hors des heures d’appel (' + h.now + ', ' + h.label.toLowerCase() + ').', okText: h.label + ', il est ' + h.now });
    checks.push({ label: 'Identification de l’appelant', ok: true, okText: '(418) 555-0100, numéro de la firme, rappelable' });
    var blocked = checks.filter(function (x) { return !x.ok; });
    return { ok: blocked.length === 0, checks: checks, first: blocked[0] || null, phone: phone };
  }
  // Moteur d'acceptation de mandat (recherche, MA-15.2) : lecture des faits consignés à l'audit de sortie.
  function acceptance(c, st) {
    var cs = (st.companyState && st.companyState[c.id]) || {}, a = cs.audit || c.audit;
    if (!a) return null;
    var sec = sectorOf(c.scian), band = sec ? sec.mult : { low: 3, mid: 3.5, high: 4 };
    var density = (st.buyers || []).filter(function (b) { return isBusinessBuyer(b) && sectorAffinity(b.criteria.sectors, sec ? sec.code : c.scian) >= 55; }).length +
      D.UNIVERSE.filter(function (u) { return sectorAffinity(u.sectors, sec ? sec.code : c.scian) >= 55; }).length;
    var verified = D.UNIVERSE.filter(function (u) { return u.lastVerified && sectorAffinity(u.sectors, sec ? sec.code : c.scian) >= 55 && U.diffDays(u.lastVerified, today(st)) <= 180; }).length;
    function s3(cond1, cond2) { return cond1 ? 'faible' : cond2 ? 'moyen' : 'bon'; }
    var inputs = [
      { id: 'i1', label: 'BAIIA normalisé estimé', value: U.money(a.ebitdaEst), status: s3(a.ebitdaEst < 250000, a.ebitdaEst < 500000), note: a.ebitdaEst < 250000 ? 'Sous 250 k$ : multiple comprimé, financement difficile' : a.ebitdaEst < 500000 ? 'Sous 500 k$ : modulateur de taille' : '' },
      { id: 'i2', label: 'Attente de prix du cédant', value: U.x(a.priceMultiple) + ' le BAIIA', status: s3(a.priceMultiple > band.high + 1, a.priceMultiple > band.high), note: 'Fourchette de marché indicative : ' + U.x(band.low - 0.25) + ' à ' + U.x(band.mid) + ' pour ce secteur et cette taille' },
      { id: 'i3', label: 'Qualité des états financiers', value: a.engagement || 'Aucun', status: !a.engagement ? 'faible' : a.engagement === 'Avis au lecteur' ? 'moyen' : 'bon', note: a.engagement === 'Avis au lecteur' ? 'Une mission d’examen rassurerait acheteurs et prêteurs' : '' },
      { id: 'i4', label: 'Dépendance au dirigeant', value: a.dependency.charAt(0).toUpperCase() + a.dependency.slice(1), status: a.dependency === 'élevée' ? 'faible' : a.dependency === 'moyenne' ? 'moyen' : 'bon', note: '' },
      { id: 'i5', label: 'Densité d’acheteurs', value: density + ' acheteurs théoriques, ' + verified + ' vérifiés récemment', status: s3(density < 10, density < 30), note: 'Univers énumérable du secteur (CRM et univers)' },
      { id: 'i6', label: 'Immeuble', value: a.property || 'Locataire', status: a.propertyValue ? 'bon' : 'moyen', note: a.propertyValue ? 'Montage P1 envisageable, valeurs à séparer' : '' },
      { id: 'i7', label: 'Réactivité du cédant', value: a.responsiveness || '—', status: a.responsiveness ? 'bon' : 'moyen', note: '' }
    ];
    var weak = inputs.filter(function (i) { return i.status === 'faible'; }).length;
    var suggestion = weak >= 5 ? 'refuser' : weak >= 3 ? 'preparation' : weak >= 1 ? 'conditions' : 'accepter';
    return { inputs: inputs, weak: weak, suggestion: suggestion, audit: a, sector: sec };
  }

  /* ---------------- Salle de données (§15) ---------------- */
  function fillName(tpl, m) {
    var ys = years(m);
    return tpl.replace('{y1}', ys[0] || 'N-2').replace('{y2}', ys[1] || 'N-1').replace('{y3}', ys[2] || 'N').replace('{engagement}', (m.profile.engagement || 'états internes').toLowerCase())
      .replace('{propco}', m.property && m.profile.propco ? m.profile.propco : 'le locateur');
  }
  function roomFolders(m) {
    var r = m.room || {};
    return D.ROOM_TEMPLATE.map(function (f) {
      var items = f.items.map(function (it) { return { id: it[0], name: (r.names && r.names[it[0]]) || fillName(it[1], m), when: it[2] || null }; });
      (r.extra || []).forEach(function (x) { if (x[1] === f.id) items.push({ id: x[0], name: x[2], extra: true }); });
      items.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
      return { id: f.id, name: f.name, items: items };
    });
  }
  function itemStatus(m, id) {
    var r = m.room || {};
    if (r.status && r.status[id]) return r.status[id];
    var f = null; roomFolders(m).forEach(function (fo) { fo.items.forEach(function (it) { if (it.id === id) f = it; }); });
    if (!f) return null;
    if (f.when === 'property' && !m.property) return 'sans_objet';
    if (id === '06-05' && !m.profile.union) return 'sans_objet';
    return r.defaultStatus || 'a_demander';
  }
  function itemName(m, id) { var n = id; roomFolders(m).forEach(function (fo) { fo.items.forEach(function (it) { if (it.id === id) n = it.name; }); }); return n; }
  function room(m) {
    var total = 0, done = 0, byStatus = {};
    roomFolders(m).forEach(function (f) { f.items.forEach(function (it) { total++; var s = itemStatus(m, it.id); byStatus[s] = (byStatus[s] || 0) + 1; if (s === 'revise' || s === 'sans_objet') done++; }); });
    return { total: total, done: done, pct: total ? Math.round(done / total * 1000) / 10 : 0, byStatus: byStatus };
  }
  function grantActive(m, id, st) { var gr = m.grants[id]; return !!(gr && !gr.revoked && U.diffDays(gr.expires, today(st)) <= 0); }

  /* ---------------- Barrières d'étape (§11.9) ---------------- */
  function ndaSigned(m) { return Object.keys(m.nda || {}).filter(function (k) { return m.nda[k] === 'signe'; }); }
  function conflictParties(m) {
    var loi = loiOf(m); if (!loi || !m.property || !loi.leaseback || !m.property.investor) return [];
    return [{ id: 'cedant', label: (m.profile.owner || 'Cédant') + ', cédant', blindLabel: 'Cédant' }, { id: 'investor', label: 'Placements Rive-Sud SEC, investisseur (mandat d’achat)', blindLabel: 'Investisseur immobilier (mandat d’achat)' }];
  }
  function conflictRequired(m) { return conflictParties(m).length > 0; }
  function financingOk(m) { var loi = loiOf(m); if (!loi) return false; return !!loi.financingOk || !!m.financingApproved; }
  function ddFindings(m) { return (m.dd && m.dd.findings) || []; }
  function gates(m, st) {
    var r = room(m);
    var G = {
      signe: [
        { id: 'fin', label: 'États financiers de trois exercices saisis et contrôlés', todo: 'Saisir et contrôler les états financiers de trois exercices', ok: statementsValid(m), tab: 'retraitement' },
        { id: 'req', label: 'Demande de documents envoyée au cédant', todo: 'Envoyer la demande de documents (lien sans compte)', ok: !!m.room.requested, tab: 'salle' }
      ],
      preparation: [
        { id: 'norm', label: 'Retraitement du BAIIA approuvé', todo: 'Décider des retraitements et approuver le BAIIA', ok: !!m.normApproved, tab: 'retraitement' },
        { id: 'val', label: 'Fourchette de valeur validée par la courtière', todo: 'Retenir les modulateurs et valider la fourchette', ok: !!m.valApproved, tab: 'evaluation' },
        { id: 'teaser', label: 'Sommaire aveugle approuvé, vérification des noms réussie', todo: 'Générer, corriger et approuver le sommaire aveugle', ok: !!m.teaser.approved, tab: 'sommaire' },
        { id: 'list', label: 'Liste d’acheteurs verrouillée', todo: 'Réviser et verrouiller la liste d’acheteurs', ok: !!m.listLocked, tab: 'acheteurs' },
        { id: 'script', label: 'Script de divulgation consigné', todo: 'Consigner le script de divulgation', ok: !!m.script, tab: 'acheteurs' },
        { id: 'room', label: 'Salle de données révisée à 80 % ou plus (' + U.pct(r.pct) + ')', todo: 'Obtenir et réviser les pièces de la salle de données', ok: r.pct >= 80, tab: 'salle' }
      ].concat(m.kind === 'preparation' ? [{ id: 'convert', label: 'Mandat de vente signé (conversion du mandat de préparation)', todo: 'Convertir le mandat de préparation en mandat de vente', ok: false, tab: 'apercu' }] : []),
      marche: [
        { id: 'sent', label: 'Sommaires transmis aux acheteurs retenus', todo: 'Transmettre les sommaires et les ententes', ok: !!m.teasersSent, tab: 'acheteurs' },
        { id: 'nda', label: 'Au moins une entente de confidentialité signée', todo: 'Obtenir les ententes de confidentialité signées', ok: ndaSigned(m).length > 0, tab: 'acheteurs' },
        { id: 'cim', label: 'Cahier de présentation approuvé', todo: 'Générer, sourcer et approuver le cahier', ok: !!m.cim.approved, tab: 'sommaire' },
        { id: 'grant', label: 'Accès à la salle accordé à au moins un signataire', todo: 'Accorder l’accès à la salle aux signataires', ok: Object.keys(m.grants).some(function (id) { return grantActive(m, id, st); }), tab: 'salle' },
        { id: 'deadline', label: 'Date limite des lettres d’intention fixée', todo: 'Fixer la date limite des lettres d’intention', ok: !!m.loiDeadline, tab: 'cloture' }
      ],
      fenetre: [{ id: 'lois', label: 'Au moins une lettre d’intention reçue', todo: m.loiDeadline && U.diffDays(today(st), m.loiDeadline) > 0 ? 'Attendre les lettres d’intention (date limite du ' + U.date(m.loiDeadline) + ')' : 'Recevoir les lettres d’intention', ok: (m.lois || []).length > 0, tab: 'cloture' }],
      negociation: [
        { id: 'sel', label: 'Lettre d’intention retenue et signée', todo: 'Retenir une lettre d’intention et la faire signer', ok: !!m.loiSigned, tab: 'cloture' },
        { id: 'conf', label: 'Divulgations de conflit signées par chaque partie représentée', todo: 'Faire signer les divulgations de conflit', ok: conflictParties(m).every(function (p) { return !!m.conflict[p.id]; }), tab: 'cloture' },
        { id: 'amf', label: 'Encadrement AMF validé si vente partielle d’actions', todo: 'Consigner la validation juridique AMF', ok: m.structure !== 'actionsPartielle' || !!m.amfValidated, tab: 'apercu' }
      ],
      diligence: [
        { id: 'fin', label: 'Approbation conditionnelle du financement reçue', todo: 'Obtenir l’approbation conditionnelle du prêteur', ok: financingOk(m), tab: 'cloture' },
        { id: 'dd', label: 'Constats de diligence résolus', todo: !m.dd.indexed ? 'Mener la vérification diligente (indexation des pièces)' : 'Résoudre les constats de diligence', ok: !!m.dd.indexed && ddFindings(m).every(function (d) { return m.dd.status[d.id] === 'resolu'; }), tab: 'cloture' }
      ],
      cloture: [{ id: 'run', label: 'Feuille de route de clôture complétée chez le notaire', todo: 'Suivre la feuille de route de clôture chez le notaire', ok: runSheet(m).every(function (k) { return m.run[k.id]; }), tab: 'cloture' }]
    };
    var list = G[m.stage] || [];
    if (m.hold) list = [{ id: 'hold', label: 'Le cédant confirme la poursuite du mandat', todo: 'Rencontrer le cédant et confirmer la poursuite', ok: false, tab: 'apercu' }].concat(list);
    if (m.sellerConsentWithdrawn) list = [{ id: 'consent', label: 'Consentement du cédant à la communication aux acheteurs', todo: 'Obtenir à nouveau le consentement du cédant (Loi 25)', ok: false, tab: 'apercu' }].concat(list);
    if (m.leak) list = [{ id: 'leak', label: 'Gel lié au protocole de fuite levé', todo: 'Évaluer la fuite et lever le gel', ok: false, tab: 'salle' }].concat(list);
    return list;
  }
  function nextStage(stage) { var ids = D.MANDATE_STAGES.map(function (s) { return s.id; }); var i = ids.indexOf(stage); return i >= 0 && i < ids.length - 1 ? ids[i + 1] : null; }
  function stageLabel(id) { var s = D.MANDATE_STAGES.filter(function (x) { return x.id === id; })[0]; return s ? s.label : id; }
  function stageStart(m) { return m.history.length ? m.history[m.history.length - 1].date : m.dates.signed; }
  function typical(stage) { return (D.MANDATE_STAGES.filter(function (s) { return s.id === stage; })[0] || {}).typical; }
  function commitSchedule(signed) { var out = {}, d = signed; D.MANDATE_STAGES.forEach(function (s, i) { out[s.id] = d; if (s.typical) d = U.addDays(d, s.typical); }); return out; }
  function runSheet(m) {
    var loi = loiOf(m), pd = propertyDeal(m, loi), F = financing(m, loi), asset = m.structure === 'actifs';
    var out = [{ id: 'k1', text: 'Levée écrite des conditions : financement, vérification diligente' + (m.property ? ', environnement' : ''), who: 'Courtière et avocats' }];
    if (pd && pd.to === 'investisseur') out.push({ id: 'k2', text: 'Signature du bail de 10 ans (jambe 3), conditionnel à la vente de l’immeuble', who: 'Investisseur immobilier et acquéreur' });
    if (pd) out.push({ id: 'k3', text: 'Acte de vente de l’immeuble chez le notaire (jambe 2), simultané à la jambe 1', who: 'Notaire' });
    if (F.senior > 0) out.push({ id: 'k4', text: 'Déboursement du prêt senior (jambe 4), qui finance la jambe 1', who: 'Prêteur senior' });
    out.push({ id: 'k5', text: 'Signature de la convention d’achat d’' + (asset ? 'actifs' : 'actions') + (loi && loi.bpv ? ' et de la balance de prix de vente (jambes 1 et 5)' : ' (jambe 1)'), who: 'Cédant, acquéreur, avocats' });
    if (m.val.bridge.debt > 0) out.push({ id: 'k6', text: 'Mainlevée de l’hypothèque mobilière au RDPRM', who: 'Notaire' });
    out.push({ id: 'k7', text: 'Remise des fonds en fidéicommis et quittances', who: 'Notaire' });
    out.push({ id: 'k8', text: 'Annonce aux employés et aux clients (plan de communication approuvé)', who: 'Cédant et acquéreur' });
    return out;
  }
  // Constats générés par règles à l'indexation (complètent les constats du dossier s'il en existe).
  function ddRules(m) {
    var out = [];
    var v = valuation(m);
    v.mods.forEach(function (x) { if (x.mod.id === 'concentration' && x.applied) out.push({ id: 'r-conc', text: 'Concentration : ' + x.mod.label.replace(/^Concentration client : /, 'le premier client représente ') + '.', source: 'rules', cite: citeOf(m, '04-01', 1), resolve: 'Reflétée au multiple et divulguée au cahier' }); });
    (m.adjustments || []).forEach(function (a) { var s = m.adj[a.id] || {}; if (a.cat === 'Loyer' && s.status === 'accepted') out.push({ id: 'r-rent', text: 'Transaction avec une partie liée : loyer versé sous le marché.', cite: citeOf(m, '07-02'), needsDoc: itemStatus(m, '07-02') === 'revise' ? null : '07-02', resolve: 'Remplacé par un bail au loyer marchand', source: 'rules' }); });
    if (m.val.bridge.debt > 0) out.push({ id: 'r-lien', text: 'Hypothèque mobilière inscrite au RDPRM en faveur du prêteur.', cite: citeOf(m, '08-02', 2), needsDoc: itemStatus(m, '08-02') === 'revise' ? null : '08-02', resolve: 'Mainlevée prévue à la clôture, remboursement du prêt', source: 'rules' });
    roomFolders(m).forEach(function (f) { f.items.forEach(function (it) { var s = itemStatus(m, it.id); if ((s === 'demande' || s === 'a_demander') && out.length < 8) out.push({ id: 'r-miss-' + it.id, text: 'Pièce manquante : ' + it.name + '.', cite: it.id + ' (absent)', resolve: 'Pièce reçue et révisée', needsDoc: it.id, source: 'rules' }); }); });
    return out;
  }
  function cimSections(m) {
    var n = normalization(m), by = n.base, p = m.profile, b = m.blind, c = cagr(m), structL = STRUCT_PHRASE[m.structure] || 'à déterminer';
    var S = [
      { id: 1, title: 'Sommaire exécutif', s: [{ t: capital(b.sector) + ', établie depuis ' + b.age + ' en ' + p.region + '.', src: '01-03' }, { t: 'BAIIA retraité conservateur de ' + U.money(n.conservative[by]) + ', sur un chiffre d’affaires de ' + U.money(m.fin.revenue[by]) + '.', src: 'moteur' }] },
      { id: 2, title: 'Historique et description de l’entreprise', s: [{ t: 'Constituée en ' + String(p.registered || '').slice(0, 4) + ' en société par actions.', src: '01-01' }] },
      { id: 3, title: 'Produits, services et marché', s: [{ t: capital(p.sectorLabel) + '.', src: '04-01' }] },
      { id: 4, title: 'Clientèle (concentration anonymisée)', s: [].concat(p.topClientPct ? [{ t: 'Premier client : ' + p.topClientPct + ' % des ventes ' + by + '.', src: '04-01' }] : []).concat(p.recurringPct ? [{ t: 'Ventes sous contrat ou récurrentes : ' + p.recurringPct + ' %.', src: '04-02' }] : []) },
      { id: 5, title: 'Opérations et installations', s: [{ t: m.property ? 'Immeuble de ' + (m.property.area || 'superficie à préciser') + ', détenu par une société liée.' : 'Locaux loués; bail en vigueur transférable.', src: '07-02' }] },
      { id: 6, title: 'Équipe et structure organisationnelle', s: [{ t: p.employees + ' employés' + (p.union ? ' syndiqués' : ' non syndiqués') + '.', src: '06-01' }] },
      { id: 7, title: 'Analyse financière (états retraités)', s: [{ t: 'Tableau de retraitement du BAIIA lié au moteur, ' + years(m).join(' à ').replace(/ à (\d+) à /, ', $1, ') + '.', src: 'moteur' }] },
      { id: 8, title: 'Immobilier et équipements', s: m.property ? [{ t: 'Immeuble offert séparément, avec bail de 10 ans au loyer marchand de ' + U.money(m.property.marketRent) + ' par année.', src: '07-04' }, { t: 'Liste des équipements, âge et valeur.', src: '08-01' }] : [{ t: 'Liste des équipements, âge et valeur.', src: '08-01' }] },
      { id: 9, title: 'Occasions de croissance', s: [{ t: 'Croissance annuelle composée du chiffre d’affaires de ' + U.pct(c * 100, 1) + '.', src: 'moteur' }] },
      { id: 10, title: 'Structure de transaction envisagée', s: [{ t: capital(structL) + (m.sellerPrefs.some(function (x) { return x.id === 'bpv'; }) ? '; balance de prix de vente envisageable.' : '.'), src: 'mandat' }] },
      { id: 11, title: 'Processus et échéancier', s: [{ t: 'Lettres d’intention attendues à la date limite fixée par la courtière.', src: 'mandat' }] },
      { id: 12, title: 'Annexes', s: [{ t: 'Index de la salle de données en 12 dossiers.', src: 'salle' }] }
    ];
    (m.cim.claims || []).forEach(function (cl) { var sec = byId(S, cl.section) || S[2]; sec.s.push({ t: cl.t, src: cl.src || null, claim: cl }); });
    return S;
  }
  var STRUCT_PHRASE = { actions100: 'vente de 100 % des actions', actionsPartielle: 'vente partielle des actions', actifs: 'vente d’actifs', indetermine: 'structure à déterminer' };
  function capital(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function cimOpen(m) {
    var out = [];
    cimSections(m).forEach(function (sec) { sec.s.forEach(function (x) {
      if (x.claim) { var d = m.cim.decisions[x.claim.id]; if (!d && !x.claim.src) out.push({ id: x.claim.id, why: 'Phrase non sourcée' }); }
      else if (/^\d\d-\d\d$/.test(x.src || '') && itemStatus(m, x.src) !== 'revise') out.push({ id: 'src-' + x.src, why: 'Source ' + x.src + ' non révisée', doc: x.src });
    }); });
    return out;
  }

  /* ---------------- Prochaine action, retards et risques (horloge de démonstration) ---------------- */
  function overdueItems(m, st) {
    var out = [], t = today(st);
    Object.keys((m.room && m.room.due) || {}).forEach(function (id) { var s = itemStatus(m, id); if ((s === 'demande' || s === 'a_demander') && U.diffDays(m.room.due[id], t) > 0) out.push({ id: id, name: itemName(m, id), due: m.room.due[id] }); });
    return out;
  }
  function silentBuyers(m, st) { if (m.stage !== 'marche' || !m.teasersSent) return []; var d = U.diffDays(m.teasersSent, today(st)); if (d < 10) return []; return Object.keys(m.nda).filter(function (id) { return m.nda[id] === 'envoye'; }); }
  function nextAction(m, st) {
    var t = today(st);
    if (m.stage === 'conclu') return { text: 'Suivi post-clôture : transition du cédant et versements de la balance de prix de vente', due: null, late: false, tab: 'cloture' };
    var od = overdueItems(m, st);
    if (od.length) return { text: 'Relancer le cédant : pièce ' + od[0].id + ' en retard (' + od[0].name + ')', due: od[0].due, late: true, tab: 'salle', blocker: 'Pièce ' + od[0].id + ' en retard (responsable : cédant)' };
    var sb = silentBuyers(m, st);
    if (sb.length) { var due = U.addDays(m.teasersSent, 14); return { text: 'Relancer ' + sb.length + ' acheteur' + (sb.length > 1 ? 's' : '') + ' sans réponse au sommaire', due: due, late: U.diffDays(due, t) > 0, tab: 'acheteurs' }; }
    var miss = gates(m, st).filter(function (x) { return !x.ok; })[0];
    var typ = typical(m.stage), dueG = typ ? U.addDays(stageStart(m), typ) : null;
    return { text: miss ? miss.todo : 'Faire passer le dossier à l’étape ' + stageLabel(nextStage(m.stage)), due: dueG, late: dueG ? U.diffDays(dueG, t) > 0 : false, tab: miss ? miss.tab : 'apercu' };
  }
  function risks(m, st) {
    var out = [], t = today(st);
    if (m.stage === 'conclu') return out;
    var na = nextAction(m, st);
    if (na.blocker) out.push({ m: m.id, why: na.blocker + ', échéance dépassée de ' + U.days(U.diffDays(na.due, t)) });
    if (m.leak) out.push({ m: m.id, why: 'Protocole de fuite actif : envois gelés' });
    if (m.hold) out.push({ m: m.id, why: 'Le cédant hésite : mandat en pause depuis le ' + U.date(m.hold.since) });
    if (m.sellerConsentWithdrawn) out.push({ m: m.id, why: 'Consentement du cédant retiré : communications aux acheteurs suspendues' });
    if (m.exclusivityEnd && U.diffDays(t, m.exclusivityEnd) < 30) out.push({ m: m.id, why: U.diffDays(t, m.exclusivityEnd) < 0 ? 'Exclusivité de l’acquéreur échue le ' + U.date(m.exclusivityEnd) : 'Exclusivité de l’acquéreur échoit dans ' + U.days(U.diffDays(t, m.exclusivityEnd)) });
    if (U.diffDays(t, m.dates.exclusivityEnd) < 60) out.push({ m: m.id, why: 'Mandat exclusif échoit le ' + U.date(m.dates.exclusivityEnd) });
    var typ = typical(m.stage), days = U.diffDays(stageStart(m), t);
    if (typ && days > typ && !na.blocker) out.push({ m: m.id, why: stageLabel(m.stage) + ' au-delà de la durée type (' + days + ' jours sur ' + typ + ')' });
    return out;
  }

  /* ---------------- Mémoire institutionnelle ---------------- */
  function intervalsOf(m) {
    var h = {}; (m.history || []).forEach(function (e) { if (!h[e.stage]) h[e.stage] = e.date; });
    var out = {}; D.INTERVALS.forEach(function (iv) { if (h[iv.from] && h[iv.to]) out[iv.id] = U.diffDays(h[iv.from], h[iv.to]); });
    return out;
  }
  function friction(st) {
    var closed = D.CLOSED.slice();
    (st.mandateIds || []).forEach(function (id) { var m = st.mandates[id]; if (m && m.stage === 'conclu') closed.push({ code: m.code, codename: m.codename, intervals: intervalsOf(m), live: true }); });
    return { n: closed.length, rows: D.INTERVALS.map(function (iv) { var vals = closed.map(function (c) { return c.intervals[iv.id]; }).filter(function (v) { return v != null; }); return { iv: iv, median: U.median(vals), vals: vals }; }), closed: closed };
  }

  g.E = {
    today: today, nowMin: nowMin, byId: byId, sectorOf: sectorOf, sectorAffinity: sectorAffinity, years: years, baseYear: baseYear,
    normalization: normalization, baseEbitda: baseEbitda, BASE_LABEL: BASE_LABEL, cagr: cagr, statementChecks: statementChecks, statementsValid: statementsValid,
    valuation: valuation, sensitivity: sensitivity, valueGap: valueGap, proposeModifiers: proposeModifiers, fee: fee, loiOf: loiOf, dealPrice: dealPrice, propertyDeal: propertyDeal,
    metrics: metrics, subScores: subScores, matchScore: matchScore, candidates: candidates, ranked: ranked, isBusinessBuyer: isBusinessBuyer, freshness: freshness, funnel: funnel,
    payment: payment, financing: financing, loiCompare: loiCompare, prefsMet: prefsMet, generateLOIs: generateLOIs,
    evidenceOf: evidenceOf, evidenceRefs: evidenceRefs, isSeeded: function (m) { return !m.origin || m.origin === 'seed'; },
    radarScore: radarScore, callGate: callGate, callingHours: callingHours, isDnc: isDnc, emailBasis: emailBasis, phoneOf: phoneOf, emailOf: emailOf, BASIS_LABEL: BASIS_LABEL, acceptance: acceptance,
    roomFolders: roomFolders, room: room, itemStatus: itemStatus, itemName: itemName, grantActive: grantActive,
    gates: gates, ndaSigned: ndaSigned, conflictParties: conflictParties, conflictRequired: conflictRequired, financingOk: financingOk, ddFindings: ddFindings,
    nextStage: nextStage, stageLabel: stageLabel, stageStart: stageStart, typical: typical, commitSchedule: commitSchedule, runSheet: runSheet, ddRules: ddRules,
    cimSections: cimSections, cimOpen: cimOpen, STRUCT_PHRASE: STRUCT_PHRASE, capital: capital,
    overdueItems: overdueItems, silentBuyers: silentBuyers, nextAction: nextAction, risks: risks, intervalsOf: intervalsOf, friction: friction
  };
})(window);
