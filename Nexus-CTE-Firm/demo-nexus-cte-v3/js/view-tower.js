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
    if (!ms.length) return '<section class="equation equation-masked" aria-label="Mandats vendeur"><div class="eq-head"><span class="eq-title"><strong>Mandats vendeur</strong></span></div><p class="eq-masked-line">' + C.icon('lock') + 'Mandats réservés ' + C.info('Les agents vendeurs prospectent et prennent les rendez-vous d’audit; ils ne voient ni les mandats, ni leurs montants, ni la salle de données (§2.2). Votre file de travail est au radar de relève.', 'Accès') + '</p><p class="eq-note"><a class="btn btn-sm btn-primary" href="#/radar">Ouvrir le radar de relève</a></p></section>';
    var m = S.mandate(st.towerMandate) || ms[0], h = figures(m), n = h.n, v = h.v, by = n.base;
    var picker = '<label class="eq-pick"><span class="sr-only">Mandat affiché</span><select data-change="towerMandate" data-key="eq-pick">' + ms.map(function (x) { return '<option value="' + x.id + '"' + (x.id === m.id ? ' selected' : '') + '>' + esc(x.codename + ', ' + E.stageLabel(x.stage).toLowerCase()) + '</option>'; }).join('') + '</select></label>';
    var base = '#/dossier/' + m.id + '/';
    var headInfo = esc(m.code) + ' · ' + (S.P.identity() ? esc(m.profile.company) + ', ' + esc(m.profile.city) : 'identité protégée pour ce rôle') + ' · ' + esc(E.stageLabel(m.stage)) + ', ' + (m.stage === 'conclu' ? 'conclu le ' + U.date(m.concluded) : 'jour ' + U.diffDays(E.stageStart(m), st.clock.d) + ' de l’étape') + '.';
    var head = '<div class="eq-head"><a href="' + base + 'apercu" class="eq-title"><strong>' + esc(m.codename) + '</strong></a>' + C.info(headInfo, m.codename) + picker + '</div>';
    if (!S.P.financials()) {
      var bp = m.blind;
      return '<section class="equation equation-masked" aria-label="Profil du dossier">' + head + '<dl class="eq-blind"><div><dt>Secteur</dt><dd>' + esc(bp.sector) + '</dd></div><div><dt>Région</dt><dd>' + esc(bp.region) + '</dd></div><div><dt>Chiffre d’affaires</dt><dd>' + esc(bp.revenueBand) + '</dd></div><div><dt>BAIIA retraité</dt><dd>' + esc(bp.ebitdaBand) + '</dd></div><div><dt>Effectif</dt><dd>' + esc(bp.employeesBand) + '</dd></div></dl>' +
        '<p class="eq-note">' + C.icon('lock') + 'Profil anonymisé ' + C.info('Vue agente acheteurs : profil anonymisé seulement, jusqu’à ce qu’une entente de confidentialité soit consignée pour un acheteur précis.', 'Vue anonymisée') + '</p></section>';
    }
    if (!m.fin.entered) return '<section class="equation" aria-label="Chaîne de valeur">' + head + '<p class="eq-masked-line">États financiers à saisir</p><p class="eq-note"><a class="btn btn-sm btn-primary" href="' + base + 'retraitement">' + C.icon('edit') + 'Saisir</a></p></section>';
    var terms = [
      { op: '', val: U.money(n.declared[by]), label: 'BAIIA déclaré', info: 'BAIIA déclaré ' + by + '.', src: 'ÉF ' + by + ', ' + (m.profile.engagement || '').toLowerCase(), href: base + 'retraitement', state: 'Pièce source' },
      { op: n.solidSum >= 0 ? '+' : '−', val: U.money(Math.abs(n.solidSum)), label: 'Retraitements', info: 'Retraitements « solides » acceptés.', src: n.decided + ' sur ' + n.total + ' décidés' + (n.pending ? ', ' + n.pending + ' en attente' : ''), href: base + 'retraitement', state: m.normApproved ? 'Approuvé' : 'Proposé, à décider', pending: !m.normApproved },
      { op: '=', val: U.money(n.conservative[by]), label: 'BAIIA retraité', info: 'BAIIA retraité conservateur.', src: 'Base de négociation des acheteurs', href: base + 'retraitement', state: m.normApproved ? 'Verrouillé, version ' + m.normApproved.version : 'Non approuvé', pending: !m.normApproved, strong: true },
      h.loi ? { op: '×', val: U.x(h.price / n.conservative[by]), label: 'Multiple LI', info: 'Multiple implicite de la lettre d’intention signée.', src: 'Fourchette du moteur : ' + U.x(v.mult.low) + ' à ' + U.x(v.mult.high) + ', médiane ' + U.money(v.ev.mid), href: base + 'evaluation', state: 'Comparé à la fourchette validée' } :
      { op: '×', val: U.x(v.mult.mid), label: 'Multiple', info: 'Multiple médian.', src: 'Base ' + U.x(m.val.base.mid) + ', ' + (v.net >= 0 ? '+' : '') + U.x(v.net) + ' de modulateurs', href: base + 'evaluation', state: m.valApproved ? 'Validé' : v.decided + ' modulateur' + (v.decided > 1 ? 's' : '') + ' décidé' + (v.decided > 1 ? 's' : '') + ' sur ' + v.mods.length, pending: !m.valApproved },
      { op: h.loi ? '≈' : '=', val: U.money(h.price), label: h.loi ? 'Prix convenu' : 'Valeur', info: h.loi ? 'Prix convenu, lettre d’intention signée.' : 'Valeur d’entreprise médiane.', src: h.loi ? S.buyer(h.loi.buyer).name : 'Fourchette ' + U.moneyShort(v.ev.low) + ' à ' + U.moneyShort(v.ev.high), href: base + (h.loi ? 'cloture' : 'evaluation'), state: h.loi ? 'Signé' : m.valApproved ? 'Validé par la courtière' : 'Estimation', pending: !m.valApproved && !h.loi, strong: true }
    ];
    if (S.P.fees()) terms.push({ op: '→', val: U.money(h.fee.gross), label: 'Honoraires', info: m.stage === 'conclu' ? 'Honoraires de succès encaissés (simulé).' : 'Honoraires de succès estimés.', src: 'Politique ' + m.feePolicy + ' : 10 % jusqu’à 1 M$, 6 % au-delà', href: base + 'evaluation#honoraires', state: m.stage === 'conclu' ? 'Encaissé' : 'Avant partages, frais et impôts', fee: true });
    else terms.push({ op: '→', val: 'Réservé', label: 'Honoraires', info: 'Honoraires de succès.', src: 'Visibles par la courtière responsable du mandat', href: base + 'evaluation', state: 'Permission', masked: true });
    return '<section class="equation" aria-label="Chaîne de valeur du dossier ' + esc(m.codename) + '">' + head + '<ol class="eq-terms">' + terms.map(function (t, i) {
      return '<li class="eq-term' + (t.pending ? ' is-pending' : '') + (t.strong ? ' is-strong' : '') + (t.fee ? ' is-fee' : '') + (t.masked ? ' is-masked' : '') + '">' + (t.op ? '<span class="eq-op" aria-hidden="true">' + t.op + '</span>' : '') +
        '<div class="eq-cell"><a href="' + t.href + '" class="eq-link" data-key="eq-' + i + '"><span class="eq-val">' + t.val + '</span><span class="eq-label">' + esc(t.label) + (t.pending ? '<span class="eq-pend" title="À décider" aria-label="à décider">' + C.icon('clock', 'ico ico-sm') + '</span>' : '') + '</span></a>' + C.info(esc((t.info || '') + ' ' + t.src + '. ' + t.state + '.'), t.label) + '</div></li>';
    }).join('') + '</ol>' + '<p class="eq-note eq-foot">' + C.info('Calculé par les moteurs déterministes à partir des décisions humaines. Les retraitements et les modulateurs sont proposés ' + (E.isSeeded(m) ? 'par l’IA scénarisée ou les règles' : 'par les règles' + (m.adjustments.some(function (x) { return x.source === 'ia-direct'; }) ? ' et l’IA en direct' : '')) + ', selon la provenance affichée; aucun montant n’est émis hors du moteur.' + (m.property ? ' Immeuble évalué séparément à ' + U.money(m.property.value) + ' (jambe 2), sans double comptage du loyer.' : ''), 'Calcul') + '<span>Moteur déterministe</span></p></section>';
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
    return ('<table class="friction"><caption class="sr-only">Durées par intervalle des dossiers clôturés</caption><thead><tr><th scope="col">Intervalle</th><th scope="col"><span class="scale" aria-label="Échelle de 0 à 90 jours"><span>0</span><span>30</span><span>60</span><span>90 j</span></span></th><th scope="col" class="num">Médiane</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="fineprint">Points pleins : dossiers clôturés (' + f.closed.map(function (c) { return c.codename; }).join(', ') + '). Points creux : dossiers en cours. n = ' + f.n + ' : échantillon trop petit pour prédire une date ou une probabilité de clôture; l’écran ne montre que des durées observées.</p>');
  }

  function economics(st) {
    if (!S.P.fees()) return C.roleNote('Honoraires réservés à la courtière responsable.');
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
    return body;
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
    var queue = q.length ? '<ul class="rows queue-rows">' + q.slice(0, 12).map(function (it) {
      var p = D.TEAM[it.who];
      return '<li><span class="row-title"><span class="avatar" title="' + esc(p.name + ', ' + p.title) + '" aria-label="' + esc(p.name) + '">' + p.initials + '</span><a href="' + it.href + '" title="' + esc(it.cap) + '">' + esc(it.title) + '</a></span><span class="chip">' + esc(it.ctx) + '</span><span class="row-acts"><a class="btn btn-sm btn-quiet icon-btn-sm" href="' + it.href + '" aria-label="Ouvrir : ' + esc(it.title) + '" title="Ouvrir">' + C.icon('arrow') + '</a></span></li>';
    }).join('') + '</ul>' + (q.length > 12 ? '<p class="cell-sub">+ ' + (q.length - 12) + '</p>' : '') : C.empty('Rien à décider', 'Les propositions et pièces reçues arrivent ici.');
    var kpiHtml = '<ul class="kpis" aria-label="Indicateurs du cabinet">' + kpis.map(function (k) { var inner = '<span class="kpi-v">' + k.v + '</span><span class="kpi-l">' + esc(k.l) + '</span>'; return '<li title="' + esc(k.d) + '">' + (k.href.charAt(1) === '/' ? '<a href="' + k.href + '">' + inner + '</a>' : k.href === '#inbox' ? '<button type="button" data-ui="inbox-open">' + inner + '</button>' : '<button type="button" data-ui="scroll" data-target="' + k.href.slice(1) + '">' + inner + '</button>') + '</li>'; }).join('') + '</ul>';
    var nextHtml = na.length ? '<ul class="rows">' + na.map(function (a) {
      return '<li class="' + (a.late ? 'is-late' : '') + '"><span class="row-title"><a href="' + a.href + '">' + esc(a.m.codename) + '</a><span class="cell-sub">' + esc(a.text) + '</span></span><span class="row-val' + (a.late ? ' txt-brick' : '') + '">' + (a.due ? U.date(a.due).replace(/ \d{4}$/, '') : '—') + '</span><span class="state-i ' + (a.late ? 'state-block' : 'state-idle') + '" title="' + (a.late ? 'En retard' : 'Prévu') + '">' + C.icon(a.late ? 'alert' : 'clock') + '</span></li>';
    }).join('') + '</ul>' : C.empty('Aucune action', 'Aucun dossier ouvert.');
    var riskHtml = rk.length ? '<ul class="risks">' + rk.map(function (r) { return '<li>' + C.icon('alert') + '<span><a href="#/dossier/' + r.m.id + '/apercu"><strong>' + esc(r.m.codename) + '</strong></a> ' + esc(r.why) + '</span></li>'; }).join('') + '</ul>' : C.empty('Aucun risque', 'Échéance dépassée, exclusivité proche ou gel d’envois.');
    var pilot = kpiHtml + C.more('Prochaine action par dossier', nextHtml, { meta: String(na.length), id: 'next' }) + C.more('Signaux de risque', riskHtml, { meta: String(rk.length), id: 'risques' }) +
      (seller ? '' : C.more('Où les dossiers perdent du temps', friction(st), { id: 'friction' }) + C.more('Économie du cabinet', economics(st), { id: 'economie' }));
    return '<div class="page page-tower">' +
      '<header class="hero hero-compact"><div><h1>' + (seller ? 'Votre radar de relève' : 'De la relève à la clôture') + '</h1><p class="hero-line">' + (seller ? 'Appels, questionnaires et audits.' : ms.length + ' mandats, un seul processus.') + '</p></div>' +
      (seller ? '<a class="btn btn-primary btn-lg" href="#/radar">' + C.icon('arrow') + '<span>Ouvrir le radar</span></a>' : '<a class="btn btn-primary btn-lg" href="#/dossiers" data-key="cta-open">' + C.icon('arrow') + '<span>Ouvrir les dossiers</span></a>') + '</header>' +
      equation(st) +
      C.section('À décider', queue, { hid: 'h-file', id: 'file', sub: 'Une rangée par décision humaine en attente. Les modèles et les règles proposent; rien ne s’applique sans une personne autorisée.', tools: '<span class="count" title="Décisions en attente">' + q.length + '</span>' }) +
      C.section('Pilotage du cabinet', pilot, { fold: true, hid: 'h-pilot', icon: 'M3 12l3-3 3 3 4-6 4 4 4-2M3 19h18', meta: rk.length ? '<span class="state-i state-block" title="' + rk.length + ' signaux de risque">' + C.icon('alert') + '</span>' : '' }) +
      '</div>';
  };

  /* ---------------- Dossiers : trois tableaux sur les mêmes données (§11.8) ---------------- */
  // Dossiers : un tableau à la fois (vendeur, prospection, achat). Carte : titre, valeur clé, icône d'état.
  var boardTab = 'vendeur';
  UI.UIA['board-tab'] = function (p) { boardTab = p.t; UI.render(); };
  function stateIcon(tone, ico, title) { return '<span class="state-i state-' + tone + '" title="' + esc(title) + '" aria-label="' + esc(title) + '">' + C.icon(ico) + '</span>'; }
  UI.VIEWS.dossiers = function () {
    var st = S.get(), ms = visibleMandates(), seller = st.role === 'agent_vendeur';
    if (seller && boardTab === 'vendeur') boardTab = 'prospection';
    var cols = D.MANDATE_STAGES.map(function (s) {
      var cards = ms.filter(function (x) { return x.stage === s.id; });
      return '<div class="col' + (cards.length ? '' : ' col-empty') + '"><h3>' + esc(s.label) + ' <span class="count">' + cards.length + '</span></h3>' + cards.map(function (m) {
        var days = U.diffDays(E.stageStart(m), st.clock.d), typ = s.id === 'conclu' ? null : s.typical, aging = typ && days > typ, na = E.nextAction(m, st);
        var ev = m.fin.entered ? E.dealPrice(m) : null, frozen = m.leak ? 'Gel : fuite signalée' : m.sellerConsentWithdrawn ? 'Consentement retiré' : m.hold ? 'En pause : le cédant hésite' : null;
        var ic = frozen ? stateIcon('block', 'pause', frozen) : na.late ? stateIcon('block', 'alert', 'En retard : ' + na.text) : aging ? stateIcon('warn', 'clock', 'Jour ' + days + ' sur ' + typ + ' (durée type)') : m.stage === 'conclu' ? stateIcon('ok', 'check', 'Conclu') : stateIcon('idle', 'arrow', na.text);
        var tip = m.code + ' · ' + C.mName(m) + (typ ? ' · jour ' + days + ' sur ' + typ : '') + ' · ' + na.text + (m.kind === 'preparation' ? ' · mandat de préparation' : '');
        return '<a class="card card-link' + (aging ? ' is-aging' : '') + (frozen ? ' is-frozen' : '') + '" href="#/dossier/' + m.id + '/apercu" data-key="open-' + m.id + '" title="' + esc(tip) + '"><span class="card-code">' + esc(m.codename) + '</span><span class="card-row"><span class="card-ev">' + (ev == null ? 'États à saisir' : S.P.financials() ? U.moneyShort(ev) : '<span class="masked">masquée</span>') + '</span>' + ic + '</span>' + (frozen ? '<span class="chip chip-' + (m.hold ? 'warn' : 'block') + '">' + esc(frozen) + '</span>' : '') + '</a>';
      }).join('') + '</div>';
    }).join('');
    var prosp = D.PROSPECT_STAGES.map(function (s) {
      var cards = st.leads.filter(function (c) { var k = st.companyState[c.id] || {}; return (k.stage || c.stage) === s.id; });
      return '<div class="col' + (cards.length ? '' : ' col-empty') + '"><h3>' + esc(s.label) + ' <span class="count">' + cards.length + '</span></h3>' + cards.map(function (c) {
        var sc = E.radarScore(c, st), k = st.companyState[c.id] || {}, mm = k.mandateId && S.mandate(k.mandateId);
        return '<a class="card card-link" href="#/radar/' + c.id + '" title="' + esc(c.city + ', ' + c.scianLabel.toLowerCase() + (mm && S.P.mandates() ? ' · mandat ' + mm.codename : '')) + '"><span class="card-code">' + esc(c.name) + '</span><span class="card-row"><span class="card-ev">' + sc.total + '</span>' + (mm && S.P.mandates() ? stateIcon('ok', 'check', 'Mandat : ' + mm.codename) : stateIcon(sc.total >= 70 ? 'warn' : 'idle', 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0', sc.tier || 'Score')) + '</span></a>';
      }).join('') + '</div>';
    }).join('');
    var bm = '<ul class="rows">' + st.buyerMandates.map(function (b) { return '<li title="' + esc(b.brief) + '"><span class="row-title">' + esc(b.client) + '</span><span class="row-val">' + (S.P.fees() ? U.money(b.retainer) + '/mois' : '<span class="masked">masqué</span>') + '</span><span class="chip">' + esc(b.stage) + '</span></li>'; }).join('') + '</ul>';
    var tabs = (seller ? [] : [['vendeur', 'Vendeur', ms.length]]).concat([['prospection', 'Prospection', st.leads.length], ['achat', 'Achat', st.buyerMandates.length]]);
    var seg = '<div class="seg-group seg-tabs" role="tablist" aria-label="Tableaux">' + tabs.map(function (t) { return '<button type="button" role="tab" aria-selected="' + (boardTab === t[0]) + '" class="seg' + (boardTab === t[0] ? ' is-on' : '') + '" data-ui="board-tab" data-t="' + t[0] + '" data-key="board-' + t[0] + '"><strong>' + t[1] + '</strong><span>' + t[2] + '</span></button>'; }).join('') + '</div>';
    var action = boardTab === 'vendeur' ? (S.P.decideMandate() ? '<a class="btn btn-primary" href="#/dossiers/nouveau" data-key="new-mandate">' + C.icon('plus') + '<span>Nouveau mandat</span></a>' : '') : boardTab === 'prospection' ? '<button type="button" class="btn btn-primary" data-ui="lead-new">' + C.icon('plus') + '<span>Nouvelle piste</span></button>' : '';
    var info = boardTab === 'vendeur' ? 'Mandats vendeur par étape. Chaque carte : valeur d’entreprise médiane ou prix convenu, et son état (retard, durée type dépassée, pause). Le détail est dans l’infobulle; ouvrez la carte pour faire avancer le dossier.' : boardTab === 'prospection' ? 'Prospection : prospect, contact, audit de sortie, rapport ou préparation, puis mandat. La valeur est le score du radar.' : 'Mandats d’achat rémunérés : revenus récurrents de services, jamais présentés comme un ARR logiciel.';
    var body = '<section class="sheet sheet-plain" aria-label="' + esc(tabs.filter(function (t) { return t[0] === boardTab; })[0][1]) + '">' + (boardTab === 'vendeur' ? '<div class="board board-8">' + cols + '</div>' : boardTab === 'prospection' ? '<div class="board board-7">' + prosp + '</div>' : bm) + '</section>';
    return '<div class="page"><header class="page-head page-head-row"><h1>Dossiers ' + C.info(info, 'Dossiers') + '</h1>' + seg + action + '</header>' + body + '</div>';
  };
})(window);
