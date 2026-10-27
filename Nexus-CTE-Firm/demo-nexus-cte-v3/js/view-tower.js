/* Nexus CTE V3 — Tour de contrôle et tableaux de pipeline, calculés sur tous les mandats. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, S = g.S, R = g.R, UI = g.UI, C = UI.C, esc = U.esc;

  function visibleMandates() { return S.P.mandates() ? S.mandates() : []; }
  function figures(m) {
    var n = E.normalization(m), v = E.valuation(m), loi = m.loiSigned ? E.loiOf(m) : null, price = loi ? loi.ev : v.ev.mid;
    return { n: n, v: v, loi: loi, price: price, fee: E.fee(m.feePolicy, price) };
  }

  // L'équation de valeur : l'élément signature. Chaque terme renvoie à sa source, pour le mandat choisi.
  function equation(st) {
    var ms = visibleMandates();
    if (!ms.length) return '<section class="equation equation-masked" aria-label="Mandats vendeur"><div class="eq-head"><span class="eq-title"><strong>Mandats vendeur</strong></span></div><p class="eq-masked-line">Les mandats vendeur ne sont pas accessibles au rôle agent vendeur.</p><p class="eq-note">' + C.icon('lock') + 'Les agents vendeurs prospectent et prennent les rendez-vous d’audit; ils ne voient ni les mandats, ni leurs montants, ni la salle de données (§2.2). Votre file de travail est au radar de relève.</p><p class="eq-note"><a class="btn btn-sm btn-primary" href="#/radar">Ouvrir le radar de relève</a></p></section>';
    var m = S.mandate(st.towerMandate) || ms[0], h = figures(m), n = h.n, v = h.v, by = n.base;
    var picker = '<label class="eq-pick"><span class="sr-only">Mandat affiché</span><select data-change="towerMandate" data-key="eq-pick">' + ms.map(function (x) { return '<option value="' + x.id + '"' + (x.id === m.id ? ' selected' : '') + '>' + esc(x.codename + ', ' + E.stageLabel(x.stage).toLowerCase()) + '</option>'; }).join('') + '</select></label>';
    var stageInfo = '<span>' + esc(E.stageLabel(m.stage)) + '</span><span>' + (m.stage === 'conclu' ? 'conclu le ' + U.date(m.concluded) : 'jour ' + U.diffDays(E.stageStart(m), st.clock.d) + ' de l’étape') + '</span>';
    var base = '#/dossier/' + m.id + '/';
    var head = '<div class="eq-head"><a href="' + base + 'apercu" class="eq-title"><strong>' + esc(m.codename) + '</strong> <span>' + esc(m.code) + '</span></a>' + picker + '<div class="eq-meta">' + (S.P.identity() ? '<span>' + esc(m.profile.company) + ', ' + esc(m.profile.city) + '</span>' : '<span>Identité protégée pour ce rôle</span>') + stageInfo + '</div></div>';
    if (!S.P.financials()) {
      var bp = m.blind;
      return '<section class="equation equation-masked" aria-label="Profil du dossier">' + head + '<dl class="eq-blind"><div><dt>Secteur</dt><dd>' + esc(bp.sector) + '</dd></div><div><dt>Région</dt><dd>' + esc(bp.region) + '</dd></div><div><dt>Chiffre d’affaires</dt><dd>' + esc(bp.revenueBand) + '</dd></div><div><dt>BAIIA retraité</dt><dd>' + esc(bp.ebitdaBand) + '</dd></div><div><dt>Effectif</dt><dd>' + esc(bp.employeesBand) + '</dd></div></dl>' +
        '<p class="eq-note">' + C.icon('lock') + 'Vue agente acheteurs : profil anonymisé seulement, jusqu’à ce qu’une entente de confidentialité soit consignée pour un acheteur précis.</p></section>';
    }
    if (!m.fin.entered) return '<section class="equation" aria-label="Chaîne de valeur">' + head + '<p class="eq-masked-line">États financiers à saisir : la chaîne de valeur se calcule dès que trois exercices sont entrés.</p><p class="eq-note"><a class="btn btn-sm btn-primary" href="' + base + 'retraitement">Saisir les états financiers</a></p></section>';
    var terms = [
      { op: '', val: U.money(n.declared[by]), label: 'BAIIA déclaré ' + by, src: 'ÉF ' + by + ', ' + (m.profile.engagement || '').toLowerCase(), href: base + 'retraitement', state: 'Pièce source' },
      { op: n.solidSum >= 0 ? '+' : '−', val: U.money(Math.abs(n.solidSum)), label: 'Retraitements solides acceptés', src: n.decided + ' sur ' + n.total + ' décidés' + (n.pending ? ', ' + n.pending + ' en attente' : ''), href: base + 'retraitement', state: m.normApproved ? 'Approuvé' : 'Proposé, à décider', pending: !m.normApproved },
      { op: '=', val: U.money(n.conservative[by]), label: 'BAIIA retraité conservateur', src: 'Base de négociation des acheteurs', href: base + 'retraitement', state: m.normApproved ? 'Verrouillé, version ' + m.normApproved.version : 'Non approuvé', pending: !m.normApproved, strong: true },
      h.loi ? { op: '×', val: U.x(h.price / n.conservative[by]), label: 'Multiple implicite de la LI', src: 'Fourchette du moteur : ' + U.x(v.mult.low) + ' à ' + U.x(v.mult.high) + ', médiane ' + U.money(v.ev.mid), href: base + 'evaluation', state: 'Comparé à la fourchette validée' } :
      { op: '×', val: U.x(v.mult.mid), label: 'Multiple médian', src: 'Base ' + U.x(m.val.base.mid) + ', ' + (v.net >= 0 ? '+' : '') + U.x(v.net) + ' de modulateurs', href: base + 'evaluation', state: m.valApproved ? 'Validé' : v.decided + ' modulateur' + (v.decided > 1 ? 's' : '') + ' décidé' + (v.decided > 1 ? 's' : '') + ' sur ' + v.mods.length, pending: !m.valApproved },
      { op: h.loi ? '≈' : '=', val: U.money(h.price), label: h.loi ? 'Prix convenu, LI signée' : 'Valeur d’entreprise médiane', src: h.loi ? S.buyer(h.loi.buyer).name : 'Fourchette ' + U.moneyShort(v.ev.low) + ' à ' + U.moneyShort(v.ev.high), href: base + (h.loi ? 'cloture' : 'evaluation'), state: h.loi ? 'Signé' : m.valApproved ? 'Validé par la courtière' : 'Estimation', pending: !m.valApproved && !h.loi, strong: true }
    ];
    if (S.P.fees()) terms.push({ op: '→', val: U.money(h.fee.gross), label: m.stage === 'conclu' ? 'Honoraires de succès encaissés (simulé)' : 'Honoraires de succès estimés', src: 'Politique ' + m.feePolicy + ' : 10 % jusqu’à 1 M$, 6 % au-delà', href: base + 'evaluation#honoraires', state: m.stage === 'conclu' ? 'Encaissé' : 'Avant partages, frais et impôts', fee: true });
    else terms.push({ op: '→', val: 'Réservé', label: 'Honoraires de succès', src: 'Visibles par la courtière responsable du mandat', href: base + 'evaluation', state: 'Permission', masked: true });
    return '<section class="equation" aria-label="Chaîne de valeur du dossier ' + esc(m.codename) + '">' + head + '<ol class="eq-terms">' + terms.map(function (t, i) {
      return '<li class="eq-term' + (t.pending ? ' is-pending' : '') + (t.strong ? ' is-strong' : '') + (t.fee ? ' is-fee' : '') + (t.masked ? ' is-masked' : '') + '">' + (t.op ? '<span class="eq-op" aria-hidden="true">' + t.op + '</span>' : '') +
        '<a href="' + t.href + '" class="eq-link" data-key="eq-' + i + '"><span class="eq-val">' + t.val + '</span><span class="eq-label">' + esc(t.label) + '</span><span class="eq-src">' + esc(t.src) + '</span><span class="eq-state">' + esc(t.state) + '</span></a></li>';
    }).join('') + '</ol><p class="eq-note">Calculé par les moteurs déterministes à partir des décisions humaines. Les retraitements et les modulateurs sont proposés ' + (E.isSeeded(m) ? 'par l’IA scénarisée ou les règles' : 'par les règles' + (m.adjustments.some(function (x) { return x.source === 'ia-direct'; }) ? ' et l’IA en direct' : '')) + ', selon la provenance affichée; aucun montant n’est émis hors du moteur.' + (m.property ? ' Immeuble évalué séparément à ' + U.money(m.property.value) + ' (jambe 2), sans double comptage du loyer.' : '') + '</p></section>';
  }

  function approvalQueue(st) {
    var items = [];
    visibleMandates().forEach(function (m) {
      if (m.stage === 'conclu') return;
      var ctx = m.codename, base = '#/dossier/' + m.id + '/', n = E.normalization(m);
      if (!m.fin.entered) items.push({ who: 'mt', cap: 'États financiers', title: 'Saisir les états financiers de trois exercices', ctx: ctx, href: base + 'retraitement' });
      else if (n.pending && !m.normApproved) items.push({ who: 'mt', cap: 'Financial Forensics', title: n.pending + ' retraitement' + (n.pending > 1 ? 's' : '') + ' du BAIIA à accepter ou rejeter', ctx: ctx, href: base + 'retraitement' });
      else if (!m.normApproved && n.total) items.push({ who: 'mt', cap: 'Moteur', title: 'Approuver le retraitement du BAIIA', ctx: ctx, href: base + 'retraitement' });
      if (m.normApproved && !m.valApproved) { var vp = E.valuation(m).pending; items.push({ who: 'cp', cap: 'Valuation & Structuring', title: vp ? vp + ' modulateur' + (vp > 1 ? 's' : '') + ' de multiple à retenir ou écarter' : 'Valider la fourchette de valeur', ctx: ctx, href: base + 'evaluation' }); }
      if (m.teaser.draft && !m.teaser.approved) { var ti = R.openIssues(m).length; items.push({ who: 'cp', cap: 'Deal Packaging', title: ti ? ti + ' constat' + (ti > 1 ? 's' : '') + ' bloque' + (ti > 1 ? 'nt' : '') + ' le sommaire aveugle' : 'Approuver le sommaire aveugle', ctx: ctx, href: base + 'sommaire' }); }
      else if (m.normApproved && m.valApproved && !m.teaser.draft && m.stage === 'preparation') items.push({ who: 'cp', cap: 'Deal Packaging', title: 'Générer le brouillon du sommaire aveugle', ctx: ctx, href: base + 'sommaire' });
      if (m.cim.generated && !m.cim.approved) { var ci = E.cimOpen(m).length; items.push({ who: 'cp', cap: 'Deal Packaging', title: ci ? ci + ' phrase' + (ci > 1 ? 's' : '') + ' à sourcer dans le cahier' : 'Approuver le cahier de présentation', ctx: ctx, href: base + 'sommaire' }); }
      if (!m.listLocked && m.stage === 'preparation' && m.valApproved) items.push({ who: 'cp', cap: 'Buyer Discovery & Matching', title: 'Réviser et verrouiller la liste d’acheteurs (' + m.shortlist.length + ' retenus)', ctx: ctx, href: base + 'acheteurs' });
      var recu = E.room(m).byStatus.recu || 0;
      if (recu && S.P.room()) items.push({ who: 'mt', cap: 'Salle de données', title: recu + ' pièce' + (recu > 1 ? 's' : '') + ' reçue' + (recu > 1 ? 's' : '') + ' à réviser', ctx: ctx, href: base + 'salle' });
      m.pendingRefusals.forEach(function (x) { items.push({ who: 'sl', cap: 'Institutional Memory', title: 'Consigner le motif structuré du refus de ' + S.buyer(x.buyer).name, ctx: ctx, href: base + 'acheteurs' }); });
      if ((m.lois || []).length && !m.loiSigned && ['fenetre', 'negociation'].indexOf(m.stage) >= 0) items.push({ who: 'cp', cap: 'Negotiation Copilot', title: 'Comparer ' + m.lois.filter(function (l) { return l.status !== 'retirée'; }).length + ' lettres d’intention et en retenir une', ctx: ctx, href: base + 'cloture' });
      var open = E.ddFindings(m).filter(function (d) { return m.dd.status[d.id] !== 'resolu'; }).length;
      if (m.dd.indexed && open && m.stage === 'diligence') items.push({ who: 'mt', cap: 'Due Diligence', title: open + ' constat' + (open > 1 ? 's' : '') + ' de diligence à résoudre', ctx: ctx, href: base + 'cloture' });
      if (m.loiSigned && E.conflictParties(m).some(function (p) { return !m.conflict[p.id]; })) items.push({ who: 'cp', cap: 'Conformité', title: 'Faire signer les divulgations de conflit', ctx: ctx, href: base + 'cloture' });
    });
    st.leads.forEach(function (c) {
      var k = (st.companyState[c.id] || {}).call, cs = st.companyState[c.id] || {};
      if (k && k.step === 'extract' && !k.committed) items.push({ who: 'jg', cap: 'Call-to-CRM Extraction', title: 'Réviser l’extraction de l’appel avant écriture', ctx: c.name, href: '#/radar/' + c.id });
      if (k && k.intake === 'completed') { var oc = (k.conflictList || []).filter(function (x) { return !k.conflicts[x.id]; }).length; if (oc) items.push({ who: 'jg', cap: 'Questionnaire de sortie', title: oc + ' conflit' + (oc > 1 ? 's' : '') + ' de valeurs à résoudre', ctx: c.name, href: '#/radar/' + c.id }); }
      if (k && k.booked && !k.auditDone && S.absNow() >= U.absMin(k.booked.date, k.booked.min)) items.push({ who: 'cp', cap: 'Audit de sortie', title: 'Consigner l’audit de sortie tenu le ' + U.date(k.booked.date), ctx: c.name, href: '#/radar/' + c.id });
      if ((cs.stage || c.stage) === 'audit_tenu' && !cs.acceptance && (cs.audit || c.audit)) items.push({ who: 'cp', cap: 'Moteur d’acceptation', title: 'Rendre la décision d’acceptation du mandat', ctx: c.name, href: '#/radar/' + c.id });
    });
    return items;
  }

  function nextActions(st) {
    return visibleMandates().map(function (m) { var a = E.nextAction(m, st); return { m: m, text: a.text, due: a.due, late: a.late, href: '#/dossier/' + m.id + '/' + a.tab }; })
      .sort(function (a, b) { return (a.late === b.late ? 0 : a.late ? -1 : 1) || String(a.due || '9').localeCompare(String(b.due || '9')); });
  }
  function risks(st) { var out = []; visibleMandates().forEach(function (m) { E.risks(m, st).forEach(function (r) { out.push({ m: m, why: r.why }); }); }); return out; }

  function friction(st) {
    var f = E.friction(st), max = 90, open = [];
    visibleMandates().forEach(function (m) { if (m.stage !== 'conclu') open.push(m); });
    var rows = f.rows.map(function (r) {
      var dots = f.closed.map(function (c) { var v = c.intervals[r.iv.id]; if (v == null) return ''; return '<span class="dot' + (c.live ? ' dot-live' : '') + '" style="left:' + Math.min(100, v / max * 100) + '%" title="' + esc(c.codename) + ' : ' + v + ' jours"></span>'; }).join('');
      var med = r.median != null ? '<span class="med" style="left:' + Math.min(100, r.median / max * 100) + '%" aria-hidden="true"></span>' : '';
      var cur = open.map(function (m) {
        var h = {}; m.history.forEach(function (e) { if (!h[e.stage]) h[e.stage] = e.date; });
        if (h[r.iv.from] && !h[r.iv.to]) { var d = U.diffDays(h[r.iv.from], st.clock.d); return '<span class="dot dot-open" style="left:' + Math.min(100, d / max * 100) + '%" title="' + esc(m.codename) + ', en cours : ' + d + ' jours"></span>'; }
        return '';
      }).join('');
      return '<tr><th scope="row">' + esc(r.iv.label) + '</th><td><div class="strip">' + med + dots + cur + '</div></td><td class="num">' + (r.median != null ? U.num(r.median, r.median % 1 ? 1 : 0) + U.NB + 'j' : '—') + '</td></tr>';
    }).join('');
    return C.section('Où les dossiers perdent du temps', '<table class="friction"><caption class="sr-only">Durées par intervalle des dossiers clôturés</caption><thead><tr><th scope="col">Intervalle</th><th scope="col"><span class="scale" aria-label="Échelle de 0 à 90 jours"><span>0</span><span>30</span><span>60</span><span>90 j</span></span></th><th scope="col" class="num">Médiane</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="fineprint">Points pleins : dossiers clôturés (' + f.closed.map(function (c) { return c.codename; }).join(', ') + '). Points creux : dossiers en cours. n = ' + f.n + ' : échantillon trop petit pour prédire une date ou une probabilité de clôture; l’écran ne montre que des durées observées.</p>', { hid: 'h-friction', sub: 'Médiane des jours par intervalle, mémoire institutionnelle' });
  }

  function economics(st) {
    if (!S.P.fees()) return C.section('Économie du cabinet', C.roleNote('Les honoraires et revenus sont visibles par la courtière responsable seulement.'), { hid: 'h-eco' });
    var year = st.clock.d.slice(0, 4), ms = S.mandates();
    var closedFees = D.CLOSED.filter(function (c) { return c.closed >= year + '-01-01' || c.closed >= '2026-01-01'; });
    var done = ms.filter(function (m) { return m.stage === 'conclu'; }), openM = ms.filter(function (m) { return m.stage !== 'conclu'; });
    var success = U.sum(closedFees, function (c) { return c.fee; }) + U.sum(done, function (m) { return E.fee(m.feePolicy, E.dealPrice(m)).gross; });
    var forecast = U.sum(openM.filter(function (m) { return m.fin.entered; }), function (m) { return E.fee(m.feePolicy, E.dealPrice(m)).gross; });
    var prep = U.sum(ms, function (m) { return m.prepFee || 0; });
    function months(since) { var a = U.parse(since), b = U.parse(st.clock.d); return Math.max(0, Math.floor((b - a) / (86400000 * 30.44))); }
    var retainers = U.sum(st.buyerMandates, function (b) { return b.retainer * months(b.since); }), retFut = U.sum(st.buyerMandates, function (b) { return b.retainer * 12; });
    var commDone = U.sum(done, function (m) { var pd = E.propertyDeal(m); return pd ? Math.round(pd.price * (m.property.commissionRate || 0.05)) : 0; });
    var commOpen = U.sum(openM, function (m) { return m.property ? Math.round(m.property.value * (m.property.commissionRate || 0.05)) : 0; });
    var rows = [
      ['Frais de préparation et d’évaluation', prep, ms.length + ' mandats signés', null],
      ['Honoraires de succès', success, closedFees.map(function (c) { return c.codename; }).concat(done.map(function (m) { return m.codename + ' (simulé, ' + m.concluded.slice(0, 4) + ')'; })).join(', '), forecast],
      ['Mandats d’achat rémunérés', retainers, U.money(U.sum(st.buyerMandates, function (b) { return b.retainer; })) + ' par mois : revenu de services, pas un ARR logiciel', retFut],
      ['Commission immobilière, agence partenaire', commDone, 'Hypothèse de 5 %, partage et permis OACIQ à valider', commOpen]
    ];
    var body = '<table class="ledger"><thead><tr><th scope="col">Source de revenus</th><th scope="col" class="num">Encaissé</th><th scope="col" class="num">Prévu, non pondéré</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '<span class="cell-sub">' + esc(r[2]) + '</span></th><td class="num">' + U.money(r[1]) + '</td><td class="num">' + (r[3] == null ? '—' : U.money(r[3])) + '</td></tr>'; }).join('') +
      '</tbody></table><p class="fineprint">Prévu : honoraires de la politique signée sur le prix convenu ou la valeur médiane des ' + openM.length + ' mandats ouverts, sans pondération par une probabilité. Encaissé et prévu restent séparés; le revenu net exige de soustraire partages, frais et impôts.</p>';
    return C.section('Économie du cabinet', body, { hid: 'h-eco', sub: 'Encaissé à ce jour et honoraires attendus des mandats ouverts' });
  }

  UI.VIEWS.tower = function () {
    var st = S.get(), q = approvalQueue(st), na = nextActions(st), rk = risks(st);
    var ms = visibleMandates(), active = ms.filter(function (m) { return m.stage !== 'conclu'; }).length;
    var seller = st.role === 'agent_vendeur';
    var freshBuyers = st.buyers.filter(function (b) { return E.isBusinessBuyer(b) && b.lastVerified && U.diffDays(b.lastVerified, st.clock.d) <= 180; }).length;
    var unread = st.inbox.filter(function (n) { return !n.read && (!n.m || S.P.mandates()); }).length;
    if (seller) {
      q = q.filter(function (it) { return it.who === 'jg'; });
      na = st.leads.filter(function (c) { return ((st.companyState[c.id] || {}).owner || c.owner) === 'jg'; }).map(function (c) { var k = st.companyState[c.id] || {}; return { m: { codename: c.name, code: c.city }, text: k.lastTouch ? 'Relance après l’appel du ' + U.date(k.lastTouch) : c.reason, due: st.clock.d, late: false, href: '#/radar/' + c.id }; });
      rk = [];
    }
    var kpis = seller ? [
      { v: st.leads.filter(function (c) { return E.radarScore(c, st).total >= 70; }).length, l: 'Prospects chauds', d: 'Score de 70 ou plus au radar', href: '#/radar' },
      { v: st.leads.filter(function (c) { var k = st.companyState[c.id] || {}; return (k.stage || c.stage) === 'audit_planifie'; }).length, l: 'Audits planifiés', d: 'Rendez-vous d’audit de sortie', href: '#/dossiers' },
      { v: q.length, l: 'Décisions en attente', d: 'Vos extractions et conflits à réviser', href: '#file' },
      { v: unread, l: 'Notifications non lues', d: 'Rappels et échéances', href: '#inbox' }
    ] : [
      { v: active, l: 'Mandats vendeur actifs', d: 'Dossiers signés, non conclus', href: '#/dossiers' },
      { v: freshBuyers, l: 'Acheteurs vérifiés et actifs', d: 'Critères confirmés depuis moins de 180 jours', href: '#/acheteurs' },
      { v: q.length, l: 'Décisions humaines en attente', d: 'Propositions (règles ou IA) et pièces à réviser', href: '#file' },
      { v: rk.length, l: 'Signaux de risque', d: 'Règles transparentes, sans score prédictif', href: '#risques' }
    ];
    return '<div class="page page-tower">' +
      '<header class="hero"><div class="hero-text"><h1>La cession d’une PME québécoise, du signal de relève à la clôture notariée.</h1></div>' +
      '<div class="hero-side"><p class="lead">Nexus CTE est le système privé de La Firme CTE. Chaque chiffre renvoie à sa pièce, chaque divulgation est autorisée et chaque décision est signée par une personne. ' + (seller ? 'Votre travail commence au radar de relève.' : ms.length + ' mandats suivent le même processus à barrières, chacun à son étape; la visite commentée parcourt le dossier Outarde, un atelier d’usinage vendu avec son immeuble.') + '</p>' +
      '<div class="hero-cta">' + (seller ? '<a class="btn btn-primary btn-lg" href="#/radar">' + C.icon('arrow') + '<span>Ouvrir le radar de relève</span></a>' : '<a class="btn btn-primary btn-lg" href="#/dossiers" data-key="cta-open">' + C.icon('arrow') + '<span>Ouvrir les dossiers</span></a>') + '<button type="button" class="btn btn-quiet btn-lg" data-action="tour-start">' + C.icon('M7 5l11 7-11 7z') + '<span>Visite commentée, ' + (g.Tour ? g.Tour.steps.length : 17) + ' étapes</span></button>' + '<button type="button" class="btn btn-ghost btn-lg" data-ui="lab-open">' + C.icon('flask') + '<span>Labo de test</span></button></div></div></header>' +
      equation(st) +
      '<ul class="kpis" aria-label="Indicateurs du cabinet">' + kpis.map(function (k) { var inner = '<span class="kpi-v">' + k.v + '</span><span class="kpi-l">' + esc(k.l) + '</span><span class="kpi-d">' + esc(k.d) + '</span>'; return '<li>' + (k.href.charAt(1) === '/' ? '<a href="' + k.href + '">' + inner + '</a>' : k.href === '#inbox' ? '<button type="button" data-ui="inbox-open">' + inner + '</button>' : '<button type="button" data-ui="scroll" data-target="' + k.href.slice(1) + '">' + inner + '</button>') + '</li>'; }).join('') + '</ul>' +
      '<div class="grid-tower"><div class="stack">' +
      C.section('File de validation', q.length ? '<ul class="queue">' + q.slice(0, 14).map(function (it) {
        return '<li><a href="' + it.href + '"><span class="q-who">' + C.person(it.who) + '</span><span class="q-title">' + esc(it.title) + '</span><span class="q-ctx">' + esc(it.ctx) + '<span class="q-cap">' + esc(it.cap) + '</span></span></a></li>';
      }).join('') + '</ul>' + (q.length > 14 ? '<p class="fineprint">' + (q.length - 14) + ' autres décisions dans les dossiers.</p>' : '') : C.empty('Rien n’attend de décision humaine', 'Les propositions (règles ou IA) et les pièces reçues apparaîtront ici avant d’agir sur un dossier.'), { hid: 'h-file', id: 'file', sub: 'Les modèles proposent; rien ne s’applique sans une personne autorisée' }) +
      C.section('Signaux de risque', rk.length ? '<ul class="risks">' + rk.map(function (r) { return '<li>' + C.icon('alert') + '<span><a href="#/dossier/' + r.m.id + '/apercu"><strong>' + esc(r.m.codename) + '</strong></a> ' + esc(r.why) + '</span></li>'; }).join('') + '</ul>' : C.empty('Aucun dossier à risque', 'Une échéance dépassée, une exclusivité proche ou un gel d’envois apparaîtrait ici.'), { hid: 'h-risk', id: 'risques' }) +
      '</div><div class="stack">' +
      C.section('Prochaine action par dossier', na.length ? '<ul class="next">' + na.map(function (a) {
        return '<li class="' + (a.late ? 'is-late' : '') + '"><a href="' + a.href + '"><span class="next-name"><strong>' + esc(a.m.codename) + '</strong> ' + esc(a.m.code) + '</span><span class="next-text">' + esc(a.text) + '</span><span class="next-due">' + (a.due ? (a.late ? 'En retard, prévu le ' : 'Prévu le ') + U.date(a.due) : 'Sans échéance') + '</span></a></li>';
      }).join('') + '</ul>' : C.empty('Aucune action', 'Aucun dossier ouvert.'), { hid: 'h-next', sub: 'Une seule action datée par dossier ouvert; les retards suivent l’horloge de démonstration' }) +
      '</div></div>' +
      (seller ? '' : '<div class="grid-2">' + friction(st) + economics(st) + '</div>') +
      '</div>';
  };

  /* ---------------- Dossiers : trois tableaux sur les mêmes données (§11.8) ---------------- */
  UI.VIEWS.dossiers = function () {
    var st = S.get(), ms = visibleMandates();
    var cols = D.MANDATE_STAGES.map(function (s) {
      var cards = ms.filter(function (x) { return x.stage === s.id; });
      return '<div class="col"><h3>' + esc(s.label) + ' <span class="count">' + cards.length + '</span></h3>' + cards.map(function (m) {
        var days = U.diffDays(E.stageStart(m), st.clock.d), typ = s.id === 'conclu' ? null : s.typical, aging = typ && days > typ, na = E.nextAction(m, st);
        var ev = m.fin.entered ? E.dealPrice(m) : null;
        return '<article class="card' + (aging ? ' is-aging' : '') + (m.hold || m.leak || m.sellerConsentWithdrawn ? ' is-frozen' : '') + '"><header><span class="card-code">' + esc(m.codename) + '</span><span class="card-id">' + esc(m.code) + '</span></header><p class="card-name">' + esc(C.mName(m)) + '</p>' +
          (m.leak ? '<p>' + C.chip('Gel : fuite signalée', 'block') + '</p>' : m.sellerConsentWithdrawn ? '<p>' + C.chip('Consentement retiré', 'block') + '</p>' : m.hold ? '<p>' + C.chip('En pause : le cédant hésite', 'warn') + '</p>' : '') +
          (typ ? '<p class="card-days">' + C.bar(days / typ * 100, aging ? 'warn' : '') + '<span>Jour ' + days + ' sur ' + typ + ' (durée type)</span></p>' : '') +
          '<p class="card-ev">' + (ev == null ? 'États à saisir' : S.P.financials() ? (m.loiSigned ? 'Prix convenu ' : 'VE médiane ') + U.moneyShort(ev) : '<span class="masked">valeur masquée</span>') + (m.kind === 'preparation' ? ' · mandat de préparation' : '') + '</p>' +
          '<p class="card-next' + (na.late ? ' is-late' : '') + '">' + esc(na.text) + '</p>' +
          '<a class="btn btn-sm btn-primary" href="#/dossier/' + m.id + '/apercu" data-key="open-' + m.id + '">Ouvrir le dossier</a></article>';
      }).join('') + '</div>';
    }).join('');
    var pstages = D.PROSPECT_STAGES;
    var prosp = pstages.map(function (s) {
      var cards = st.leads.filter(function (c) { var k = st.companyState[c.id] || {}; return (k.stage || c.stage) === s.id; });
      return '<div class="col"><h3>' + esc(s.label) + ' <span class="count">' + cards.length + '</span></h3>' + cards.map(function (c) {
        var sc = E.radarScore(c, st), k = st.companyState[c.id] || {}, mm = k.mandateId && S.mandate(k.mandateId);
        return '<article class="card"><header><span class="card-code">' + esc(c.name) + '</span><span class="card-id">' + sc.total + '</span></header><p class="card-name">' + esc(c.city) + ', ' + esc(c.scianLabel.toLowerCase()) + '</p>' + (mm && S.P.mandates() ? '<p class="card-ev">Mandat : <a href="#/dossier/' + mm.id + '/apercu">' + esc(mm.codename) + '</a></p>' : '') + '<a class="btn btn-sm btn-quiet" href="#/radar/' + c.id + '">Ouvrir au radar</a></article>';
      }).join('') + '</div>';
    }).join('');
    var bm = '<div class="col-list">' + st.buyerMandates.map(function (b) { return '<article class="card"><header><span class="card-code">' + esc(b.client) + '</span><span class="card-id">' + esc(b.stage) + '</span></header><p class="card-name">' + esc(b.brief) + '</p><p class="card-ev">' + (S.P.fees() ? 'Rétention ' + U.money(b.retainer) + ' par mois depuis le ' + U.date(b.since) : '<span class="masked">honoraires masqués</span>') + '</p></article>'; }).join('') + '</div>';
    var tools = S.P.decideMandate() ? '<a class="btn btn-primary btn-sm" href="#/dossiers/nouveau" data-key="new-mandate">' + C.icon('plus') + '<span>Nouveau mandat</span></a>' : '';
    return '<div class="page"><header class="page-head"><h1>Dossiers</h1><p class="lead">Trois tableaux sur les mêmes données : les mandats vendeur, la prospection des cédants et les mandats d’achat rémunérés. Chaque mandat passe par les mêmes barrières; ouvrez n’importe lequel pour le faire avancer.</p></header>' +
      (st.role === 'agent_vendeur' ? C.section('Mandats vendeur', C.roleNote('Les mandats vendeur ne sont pas accessibles au rôle agent vendeur (§2.2) : aucune carte, aucun compte.'), { hid: 'h-bv' }) : C.section('Mandats vendeur', '<div class="board board-8">' + cols + '</div>', { hid: 'h-bv', tools: tools, sub: 'Barre : jours dans l’étape par rapport à la durée type (§11.1). Une carte en retard passe en ocre.' })) +
      C.section('Prospection', '<div class="board board-7">' + prosp + '</div>', { hid: 'h-bp', tools: '<button type="button" class="btn btn-sm btn-quiet" data-ui="lead-new">' + C.icon('plus') + '<span>Nouvelle piste</span></button>', sub: 'Prospect, contact, audit de sortie, rapport ou préparation, puis mandat' }) +
      C.section('Mandats acheteur', bm, { hid: 'h-ba', sub: 'Revenus récurrents de services : jamais présentés comme un ARR logiciel' }) + '</div>';
  };
})(window);
