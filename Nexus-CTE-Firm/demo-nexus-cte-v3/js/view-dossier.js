/* Nexus CTE V3 — dossier de mandat (générique) : en-tête, aperçu, retraitement du BAIIA, évaluation et honoraires. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, S = g.S, R = g.R, UI = g.UI, C = UI.C, esc = U.esc;
  var TABS = [
    { id: 'apercu', label: 'Aperçu', n: null },
    { id: 'retraitement', label: 'Retraitement du BAIIA', n: 1, fin: true },
    { id: 'evaluation', label: 'Évaluation et honoraires', n: 2, fin: true },
    { id: 'sommaire', label: 'Sommaire et cahier', n: 3 },
    { id: 'acheteurs', label: 'Acheteurs', n: 4 },
    { id: 'salle', label: 'Salle de données', n: 5, room: true },
    { id: 'cloture', label: 'LI et clôture', n: 6 }
  ];
  var LEVELS = [['aveugle', 'Aveugle', 'Courtière, analyste, administratrice'], ['teaser', 'Sommaire', 'Profil anonymisé visible des acheteurs appariés'], ['nda', 'Entente', 'Acheteurs ayant signé une entente valide'], ['divulgue', 'Divulgué', 'Acheteur sous lettre d’intention']];
  var STRUCT_OPTS = [['actions100', 'Vente d’actions, 100 %'], ['actionsPartielle', 'Vente d’actions, partielle'], ['actifs', 'Vente d’actifs'], ['indetermine', 'Indéterminé']];
  var local = { editFin: {} };

  function tabStatus(id, m) {
    if (id === 'retraitement') return m.normApproved ? 'done' : 'now';
    if (id === 'evaluation') return m.valApproved ? 'done' : m.normApproved ? 'now' : 'wait';
    if (id === 'sommaire') return m.teaser.approved && m.cim.approved ? 'done' : m.normApproved ? 'now' : 'wait';
    if (id === 'acheteurs') return m.listLocked && m.script ? (m.stage === 'preparation' ? 'done' : E.ndaSigned(m).length ? 'done' : 'now') : m.valApproved ? 'now' : 'wait';
    if (id === 'salle') return E.room(m).pct >= 80 ? 'done' : 'now';
    if (id === 'cloture') return m.stage === 'conclu' ? 'done' : ['fenetre', 'negociation', 'diligence', 'cloture'].indexOf(m.stage) >= 0 ? 'now' : 'wait';
    return '';
  }

  function header(st, m, tab) {
    var nx = E.nextStage(m.stage), gs = E.gates(m, st), miss = gs.filter(function (x) { return !x.ok; });
    var days = U.diffDays(E.stageStart(m), st.clock.d), typ = E.typical(m.stage);
    var lvlIdx = LEVELS.map(function (l) { return l[0]; }).indexOf(m.disclosure);
    var exclu = U.diffDays(st.clock.d, m.dates.exclusivityEnd);
    var na = E.nextAction(m, st);
    var advance = nx && m.stage !== 'conclu' ? C.btn(nx === 'conclu' ? 'Conclure le dossier' : 'Faire passer à : ' + E.stageLabel(nx), 'advance', { variant: 'primary', data: { m: m.id }, blocked: !S.P.decideMandate() ? 'Seule la courtière responsable fait avancer le dossier.' : miss.length ? 'Étape bloquée : ' + miss[0].label + '.' : null, key: 'advance' }) : '';
    var p = m.profile;
    var who = S.P.identity() ? '<p class="d-company">' + esc(p.company) + ', ' + esc(p.city) + (p.area ? ' (' + esc(p.area) + ')' : '') + '. Cédant : ' + esc(p.owner) + (p.ownerAge ? ', ' + p.ownerAge + ' ans' : '') + '.</p>' : '<p class="d-company">' + esc(m.blind.sector) + ', ' + esc(m.blind.region) + '. ' + C.chip('Identité protégée pour ce rôle', 'warn') + '</p>';
    var html = '<header class="d-head"><div class="d-title"><p class="d-code">' + esc(m.code) + ', ' + (m.kind === 'preparation' ? 'mandat de préparation' : 'mandat exclusif') + ' signé le ' + U.date(m.dates.signed) + (m.origin && m.origin.indexOf('radar:') === 0 ? ', issu du radar' : m.origin === 'manuel' ? ', saisi de zéro' : '') + '</p><h1>' + esc(m.codename) + '</h1>' + who + '</div>' +
      '<div class="d-side"><ol class="levels" aria-label="Niveau de divulgation">' + LEVELS.map(function (l, i) { return '<li class="' + (i < lvlIdx ? 'past' : i === lvlIdx ? 'now' : '') + '" title="' + esc(l[2]) + '"' + (i === lvlIdx ? ' aria-current="step"' : '') + '>' + esc(l[1]) + '</li>'; }).join('') + '</ol>' +
      '<dl class="d-facts"><div><dt>Étape</dt><dd>' + esc(E.stageLabel(m.stage)) + (typ && m.stage !== 'conclu' ? ', jour ' + days + ' sur ' + typ : '') + '</dd></div><div><dt>Exclusivité du mandat</dt><dd>' + (m.stage === 'conclu' ? 'Mandat accompli' : exclu >= 0 ? exclu + ' jours restants' : 'Échue') + '</dd></div><div><dt>Équipe</dt><dd>' + C.person(m.team.courtier) + C.person(m.team.analyste) + '</dd></div></dl></div></header>';
    if (m.structure === 'actionsPartielle' && !m.amfValidated) html += '<div class="banner banner-brick" role="alert">' + C.icon('alert') + '<span><strong>Vente partielle d’actions.</strong> Valider l’encadrement AMF avec un conseiller juridique avant de poursuivre. Cette bannière ne se masque pas tant que l’administratrice n’a pas consigné la validation.</span></div>';
    if (m.leak) html += '<div class="banner banner-brick" role="alert">' + C.icon('alert') + '<span><strong>Protocole de fuite actif.</strong> Tous les envois et accès du dossier sont gelés. Voir la salle de données.</span></div>';
    if (m.hold) html += '<div class="banner banner-brick" role="alert">' + C.icon('alert') + '<span><strong>Le cédant hésite.</strong> ' + esc(m.hold.reason) + ' Envois et nouvelles approches suspendus depuis le ' + U.date(m.hold.since) + '. <a href="#/dossier/' + m.id + '/apercu#h-hold">Consigner la rencontre</a></span></div>';
    if (m.sellerConsentWithdrawn) html += '<div class="banner banner-brick" role="alert">' + C.icon('alert') + '<span><strong>Consentement du cédant retiré (Loi 25).</strong> Accès des acheteurs révoqués; aucune communication de ses renseignements avant un nouveau consentement écrit.</span></div>';
    html += '<div class="d-next' + (na.late ? ' is-late' : '') + '"><div><span class="d-next-label">Prochaine action' + (na.due ? (na.late ? ', en retard depuis le ' : ', prévue le ') + U.date(na.due) : '') + '</span><strong>' + esc(na.text) + '</strong></div>' + advance + '</div>';
    html += '<nav class="d-tabs" aria-label="Sections du dossier">' + TABS.map(function (t) {
      var locked = (t.fin && !S.P.financials()) || (t.room && !S.P.room()), stt = tabStatus(t.id, m);
      return '<a href="#/dossier/' + m.id + '/' + t.id + '" class="d-tab' + (tab === t.id ? ' is-active' : '') + (stt ? ' st-' + stt : '') + '"' + (tab === t.id ? ' aria-current="page"' : '') + '>' + (t.n ? '<span class="d-tab-n">' + t.n + '</span>' : '') + '<span>' + esc(t.label) + '</span>' + (locked ? C.icon('lock', 'ico ico-sm') : stt === 'done' ? C.icon('check', 'ico ico-sm') : '') + '</a>';
    }).join('') + '</nav>';
    return html;
  }

  /* ---------------- Aperçu ---------------- */
  function journal(st, m, n) {
    var list = st.audit.filter(function (a) { return a.m === m.id; }).slice(0, n || 10);
    return list.length ? '<ol class="journal">' + list.map(function (a) { return '<li><span class="j-at">' + esc(a.at.replace(/^(\d{4}-\d\d-\d\d)/, function (d) { return U.date(d); })) + '</span><span class="j-what"><strong>' + esc(a.action) + '</strong> ' + esc(a.detail) + '</span><span class="j-who">' + esc(a.actor) + '</span></li>'; }).join('') + '</ol><a class="link" href="#/conformite">Journal d’audit complet</a>' : '<p class="cell-sub">Aucune entrée pour ce dossier.</p>';
  }
  function apercu(st, m) {
    var h = {}; m.history.forEach(function (e) { if (!h[e.stage]) h[e.stage] = e.date; });
    var committed = m.committed || E.commitSchedule(m.dates.signed);
    var rows = D.MANDATE_STAGES.map(function (s) {
      var c = committed[s.id], a = h[s.id], v = a && c ? U.diffDays(c, a) : null, cur = s.id === m.stage;
      return '<tr class="' + (cur ? 'is-current' : '') + '"><th scope="row">' + esc(s.label) + (cur ? ' ' + C.chip('En cours', 'brass') : '') + '</th><td>' + U.date(c) + '</td><td>' + (a ? U.date(a) : '—') + '</td><td class="num ' + (v == null ? '' : v <= 0 ? 'txt-teal' : 'txt-brick') + '">' + (v == null ? '' : v === 0 ? 'à la date' : (v < 0 ? U.num(v) + ' j, en avance' : '+' + v + ' j, en retard')) + '</td></tr>';
    }).join('');
    var gates = E.gates(m, st);
    var extra = '';
    if (m.hold) extra += C.section('Le cédant hésite', '<p>' + esc(m.hold.reason) + '</p><form class="mini-form" data-ui-form="hold" data-m="' + m.id + '"><label class="field"><span>Résultat de la rencontre de recadrage (consigné au journal)</span><input name="note" type="text" value="Rencontre du ' + U.date(st.clock.d) + ' : le cédant confirme la vente; calendrier ajusté" data-key="hold-note"></label><button type="submit" class="btn btn-primary btn-sm" data-key="hold-submit">Confirmer la poursuite</button></form>', { hid: 'h-hold', id: 'h-hold' });
    if (m.sellerConsentWithdrawn) extra += C.section('Consentement du cédant', '<p>Retiré le ' + U.date(m.sellerConsentWithdrawn.date) + '. Les accès ont été révoqués et l’étape est bloquée.</p>' + C.btn('Consigner un nouveau consentement écrit', 'consentRestore', { variant: 'primary', small: true, data: { m: m.id }, key: 'consent-restore' }), { hid: 'h-consent' });
    if (m.kind === 'preparation') extra += C.section('Mandat de préparation', '<p>Décision d’acceptation : préparation seulement' + (m.conditions ? ' (' + esc(m.conditions) + ')' : '') + '. Le dossier suit le même processus, mais la mise en marché exige la signature d’un mandat de vente.</p>' + C.btn('Convertir en mandat de vente (signature simulée)', 'convert', { variant: 'quiet', small: true, data: { m: m.id }, key: 'convert', blocked: S.P.decideMandate() ? null : 'Réservé à la courtière.' }), { hid: 'h-prep' });
    var p = m.profile;
    var fiche = '<dl class="facts facts-2"><div><dt>Secteur</dt><dd>SCIAN ' + esc(p.scian) + ', ' + esc(p.sectorLabel) + '</dd></div><div><dt>Région</dt><dd>' + esc(p.region) + '</dd></div><div><dt>Effectif</dt><dd>' + p.employees + ' employés' + (p.union ? ', syndiqués' : '') + '</dd></div><div><dt>Immatriculation</dt><dd>' + U.date(p.registered) + (S.P.identity() ? ', NEQ ' + esc(p.neq) : '') + '</dd></div>' +
      '<div><dt>Premier client</dt><dd>' + (p.topClientPct ? p.topClientPct + ' % des ventes' : '—') + '</dd></div><div><dt>Ventes récurrentes</dt><dd>' + (p.recurringPct ? p.recurringPct + ' %' : '—') + '</dd></div><div><dt>Dépendance au dirigeant</dt><dd>' + esc(p.ownerDependency) + '</dd></div><div><dt>Immeuble</dt><dd>' + (m.property ? (S.P.financials() ? U.money(m.property.value) : 'oui') + (S.P.identity() && p.propco ? ', ' + esc(p.propco) : '') : 'Locataire') + '</dd></div></dl>' +
      (S.P.decideMandate() ? '<div class="actions">' + C.btn('Modifier la fiche', 'mandate-edit', { ui: true, small: true, variant: 'quiet', icon: 'edit', data: { m: m.id }, key: 'mandate-edit' }) + C.btn('Supprimer le mandat', 'mandate-delete', { ui: true, small: true, variant: 'ghost', icon: 'trash', data: { m: m.id }, key: 'mandate-delete' }) + '</div>' : '');
    return extra + '<div class="grid-2 grid-2-wide">' +
      C.section('Conditions d’entrée de l’étape suivante', (gates.length ? C.gates(gates, m) : '<p>Aucune condition : le dossier est conclu.</p>') + '<p class="fineprint">Une étape documentée exige le document : aucune case « signé » manuelle n’existe. Les mêmes barrières s’appliquent à chaque mandat, semé ou créé.</p>', { hid: 'h-gates', sub: m.stage === 'conclu' ? 'Dossier conclu' : 'Pour passer de « ' + E.stageLabel(m.stage) + ' » à « ' + E.stageLabel(E.nextStage(m.stage)) + ' »' }) +
      C.section('Échéancier engagé et réel', '<table class="ledger"><thead><tr><th scope="col">Étape</th><th scope="col">Engagé</th><th scope="col">Réel</th><th scope="col" class="num">Écart</th></tr></thead><tbody>' + rows + '</tbody></table><div class="actions">' + C.btn('Imprimer l’échéancier pour le cédant', 'print-schedule', { ui: true, variant: 'quiet', icon: 'print', data: { m: m.id } }) + '</div><p class="fineprint">Généré à la signature à partir des durées types (§11.1). Les dates réelles suivent l’horloge de démonstration.</p>', { hid: 'h-sched', sub: 'Artefact remis au cédant : l’engagement de calendrier est un différenciateur' }) +
      '</div><div class="grid-3">' +
      C.section('Fiche du mandat', fiche, { hid: 'h-fiche' }) +
      C.section('Structure de transaction', '<label class="field"><span>Structure (déclenche la vérification AMF)</span><select data-change="structure" data-m="' + m.id + '" data-key="structure"' + (S.P.decideMandate() ? '' : ' disabled') + '>' + STRUCT_OPTS.map(function (o) { return '<option value="' + o[0] + '"' + (m.structure === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
        (m.structure === 'actionsPartielle' ? (m.amfValidated ? '<p class="done-line">' + C.icon('check') + '<span>Validation consignée par ' + esc(m.amfValidated.by) + ' : ' + esc(m.amfValidated.note) + '</span></p>' : '<form data-ui-form="amf" data-m="' + m.id + '" class="mini-form"><label class="field"><span>Validation juridique (date, avocat, note)</span><input name="note" type="text" value="' + U.date(st.clock.d) + ', Me Lavigne : vente de 40 % sous dispense, avis écrit au dossier"></label><button type="submit" class="btn btn-quiet btn-sm">Consigner la validation</button></form>') : '<p class="fineprint">Une vente complète d’actions ne déclenche pas la bannière. Le cadre réel reste à confirmer par un avocat québécois.</p>') +
        '<h3 class="sub-h">Préférences du cédant</h3><ul class="prefs">' + m.sellerPrefs.map(function (x) { return '<li><span>' + esc(x.label) + '</span>' + C.chip('Importance ' + x.weight, x.weight === 'forte' ? 'brass' : '') + '</li>'; }).join('') + '</ul>', { hid: 'h-struct' }) +
      C.section('Qui voit quoi', '<ul class="levels-list">' + LEVELS.map(function (l) { return '<li class="' + (l[0] === m.disclosure ? 'is-now' : '') + '"><strong>' + esc(l[1]) + '</strong><span>' + esc(l[2]) + '</span></li>'; }).join('') + '</ul><p class="fineprint">Appliqué dans la couche de données : une agente acheteurs ne voit aucune trace d’un mandat aveugle. Essayez « Voir comme » dans l’en-tête.</p>', { hid: 'h-levels' }) +
      '</div>' + C.section('Journal du dossier', journal(st, m, 12), { hid: 'h-journal', sub: 'Ajout seulement, jamais modifiable' });
  }

  /* ---------------- Retraitement du BAIIA ---------------- */
  var RATING_TONE = { solide: 'ok', 'défendable': 'warn', agressif: 'block' };
  var SAMPLE_LEDGER = '5110 Salaire du président : 2023 190 000 ; 2024 195 000 ; 2025 200 000 (remplacement 150 000)\n5410 Véhicule personnel du dirigeant : 2023 14 000 ; 2024 14 500 ; 2025 15 000\n5710 Honoraires juridiques, litige : 2023 12 000 ; 2024 13 000 ; 2025 12 500\n5820 Réparation majeure du toit : 2025 26 000\n4900 Gain sur disposition d’équipement : 2025 9 000';
  function ledgerPanel(st, m) {
    var on = g.AI && g.AI.available(), busy = g.AI && g.AI.busy('adj-' + m.id);
    return '<details class="ledger-panel"' + (local.ledgerOpen === m.id ? ' open' : '') + '><summary data-ui="ledger-toggle" data-m="' + m.id + '">' + C.icon('spark') + 'Proposer des retraitements à partir d’un grand livre ou de notes</summary>' +
      '<p class="cell-sub">Collez des lignes du grand livre (« compte libellé : 2023 montant ; 2024 montant… », avec « (remplacement N) » ou « (marchand N) » au besoin) ou des notes. Le moteur de règles propose des retraitements dans la même structure que l’IA; rien n’est appliqué sans décision.</p>' +
      '<label class="field"><span class="sr-only">Grand livre ou notes</span><textarea rows="6" data-key="ledger-' + m.id + '" id="ledger-' + m.id + '" spellcheck="false">' + esc(local.ledger && local.ledger[m.id] || '') + '</textarea></label>' +
      '<div class="actions actions-wrap">' + C.btn('Insérer un exemple', 'ledger-sample', { ui: true, small: true, variant: 'ghost', data: { m: m.id } }) +
      C.btn('Analyser par règles', 'ledger-rules', { ui: true, small: true, variant: 'quiet', data: { m: m.id }, key: 'ledger-rules' }) +
      C.btn(busy ? 'Analyse en cours…' : 'Analyser avec l’IA en direct', 'ledger-ai', { ui: true, small: true, variant: 'primary', icon: 'spark', data: { m: m.id }, key: 'ledger-ai', blocked: busy ? 'Analyse déjà en cours.' : on ? null : g.AI ? g.AI.offReason() : 'IA en direct indisponible.' }) + '</div>' +
      (local.ledgerIgnored && local.ledgerIgnored[m.id] && local.ledgerIgnored[m.id].length ? '<p class="fineprint">Lignes non retenues : ' + esc(local.ledgerIgnored[m.id].join(' | ')) + '</p>' : '') + '</details>';
  }
  function retraitement(st, m) {
    if (!S.P.financials()) return C.roleNote('Les états financiers et le retraitement sont réservés à la courtière et à l’analyste (§2.2). Les agents voient des tranches anonymisées seulement.');
    if (!m.fin.entered || local.editFin[m.id]) return C.section(m.fin.entered ? 'Modifier les états financiers' : 'États financiers de trois exercices', UI.FIN.form(m), { hid: 'h-fin-form', sub: 'Le BAIIA est calculé par le moteur, jamais saisi. Des retraitements sont proposés par règles à l’enregistrement.' });
    var n = E.normalization(m), locked = !!m.normApproved, ys = n.years, by = n.base;
    var lines = (m.fin.lines || []).map(function (l) {
      return '<tr class="' + (l.subtotal ? 'is-sub' : '') + (l.total ? ' is-total' : '') + (l.adj ? ' has-adj' : '') + '"><th scope="row">' + esc(l.label) + (l.adj ? ' <a class="adj-ref" href="#adj-' + l.adj + '" data-ui="scroll" data-target="adj-' + l.adj + '">' + l.adj + '</a>' : '') + (l.note ? '<span class="cell-sub">' + esc(l.note) + '</span>' : '') + '</th><td class="num">' + U.money(l.amount) + '</td><td class="src-cell">' + (l.src ? '<span class="prov">' + esc(l.src) + '</span>' : '') + '</td></tr>';
    }).join('');
    var adjCards = n.rows.map(function (r) {
      var a = r.a, st2 = r.status, evid = a.needsEvidence ? E.itemStatus(m, a.needsEvidence) : null, evm = E.evidenceOf(m, a).missing;
      var amounts = ys.map(function (y) { return '<td class="num">' + (a.amounts[y] ? U.money(a.amounts[y], { sign: true }) : '—') + '</td>'; }).join('');
      var acts = '';
      if (!locked) {
        if (st2 === 'proposed') {
          var block = a.needsEvidence && evid !== 'revise' ? 'Justificatif requis : la pièce ' + a.needsEvidence + ' doit être reçue et révisée.' : null;
          acts = C.btn('Accepter', 'adjDecide', { small: true, variant: 'ok', data: { m: m.id, id: a.id, d: 'accepted' }, blocked: block, key: 'adj-a-' + a.id }) + C.btn('Rejeter', 'reject-adj', { ui: true, small: true, variant: 'quiet', data: { m: m.id, id: a.id }, key: 'adj-r-' + a.id }) +
            C.btn('Modifier', 'adj-edit', { ui: true, small: true, variant: 'ghost', icon: 'edit', data: { m: m.id, id: a.id }, label: 'Modifier ' + a.label }) + C.btn('Supprimer', 'adjDelete', { small: true, variant: 'ghost', icon: 'trash', data: { m: m.id, id: a.id }, label: 'Supprimer ' + a.label });
        } else acts = C.btn('Remettre en proposition', 'adjDecide', { small: true, variant: 'ghost', data: { m: m.id, id: a.id, d: 'proposed' } });
      }
      var evidLine = a.needsEvidence ? '<p class="evid ' + (evid === 'revise' ? 'ok' : 'todo') + '">' + C.icon(evid === 'revise' ? 'check' : 'doc') + 'Pièce ' + a.needsEvidence + ' : ' + esc(D.ITEM_STATUS[evid] || evid) + (evid === 'demande' || evid === 'a_demander' ? ' ' + C.btn('Simuler le dépôt par le cédant', 'evidenceDeposit', { small: true, variant: 'quiet', data: { m: m.id, id: a.needsEvidence }, key: 'evid-dep' }) : evid === 'recu' ? ' ' + C.btn('Réviser la pièce', 'roomReview', { small: true, variant: 'quiet', data: { m: m.id, id: a.needsEvidence }, key: 'evid-rev' }) : '') + '</p>' : '';
      var srcProv = a.source === 'ia-direct' ? a.provenance : a.source === 'ia-scenario' ? { source: 'scenario' } : a.source === 'manuel' ? null : { source: 'rules' };
      return '<article class="adj is-' + st2 + '" id="adj-' + a.id + '"><header><span class="adj-id">' + a.id + '</span><span class="adj-cat">' + esc(a.cat) + '</span>' +
        (locked || st2 !== 'proposed' ? C.chip(r.rating, RATING_TONE[r.rating]) : '<label class="rating"><span class="sr-only">Défendabilité</span><select data-change="adjRating" data-m="' + m.id + '" data-id="' + a.id + '" data-key="rate-' + a.id + '">' + ['solide', 'défendable', 'agressif'].map(function (x) { return '<option' + (r.rating === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>') +
        '<span class="adj-state">' + (st2 === 'proposed' ? (a.source === 'manuel' ? 'Saisi à la main' : 'Proposé') : st2 === 'accepted' ? 'Accepté par ' + esc((m.adj[a.id] || {}).by || '') : 'Rejeté') + '</span>' + (srcProv ? C.prov(srcProv) : '') + '</header>' +
        '<h4>' + esc(a.label) + '</h4>' + (a.why ? '<p class="adj-why">' + esc(a.why) + '</p>' : '') + (a.trap && st2 === 'proposed' && a.source !== 'ia-scenario' ? '<p class="adj-reason">' + C.icon('alert') + esc(a.trap) + '</p>' : '') +
        '<table class="mini"><thead><tr>' + ys.map(function (y) { return '<th scope="col" class="num">' + y + '</th>'; }).join('') + '</tr></thead><tbody><tr>' + amounts + '</tr></tbody></table>' +
        '<p class="adj-src">' + C.icon('doc') + '<span>Ligne source : ' + esc(a.line) + '. Preuve : ' + esc(a.evidence) + '.' + (evm.length && !a.needsEvidence ? ' <span class="adj-evid-missing">À documenter : ' + evm.map(function (x) { return 'pièce ' + x.id + ' « ' + esc(x.name) + ' », ' + esc((D.ITEM_STATUS[x.status] || x.status).toLowerCase()); }).join('; ') + '.</span>' : '') + '</span></p>' + evidLine +
        (st2 === 'rejected' && r.reason ? '<p class="adj-reason">Motif du rejet : ' + esc(r.reason) + '. Il servira d’exemple pour les prochaines propositions.</p>' : '') +
        '<div class="adj-acts">' + acts + '</div></article>';
    }).join('');
    var totals = '<table class="ledger totals"><thead><tr><th scope="col">BAIIA</th>' + ys.map(function (y) { return '<th scope="col" class="num">' + y + '</th>'; }).join('') + '</tr></thead><tbody>' +
      '<tr><th scope="row">Déclaré<span class="cell-sub">États financiers, ' + esc((m.profile.engagement || '').toLowerCase()) + '</span></th>' + ys.map(function (y) { return '<td class="num">' + U.money(n.declared[y]) + '</td>'; }).join('') + '</tr>' +
      '<tr class="is-key"><th scope="row">Retraité conservateur<span class="cell-sub">Retraitements « solides » acceptés</span></th>' + ys.map(function (y) { return '<td class="num">' + U.money(n.conservative[y]) + '</td>'; }).join('') + '</tr>' +
      '<tr><th scope="row">Retraité complet<span class="cell-sub">Tous les retraitements acceptés</span></th>' + ys.map(function (y) { return '<td class="num">' + U.money(n.full[y]) + '</td>'; }).join('') + '</tr></tbody></table>' +
      '<p class="fineprint">Les acheteurs négocient sur le chiffre conservateur; montrer les deux évite de survendre. Un ajustement proposé n’est pas un résultat vérifié.</p>';
    var approveBox = locked ? '<div class="approve-box">' + C.stamp(m.normApproved, 'Approuvé, version ' + m.normApproved.version) + C.btn('Rouvrir pour une nouvelle version', 'normReopen', { small: true, variant: 'ghost', data: { m: m.id } }) + '</div>' :
      '<div class="approve-box"><p>' + (n.pending ? n.pending + ' retraitement' + (n.pending > 1 ? 's' : '') + ' en attente de décision.' : n.total ? 'Toutes les propositions sont décidées.' : 'Aucun retraitement : ajoutez-en ou analysez un grand livre.') + '</p>' + C.btn('Approuver le retraitement', 'normApprove', { variant: 'brass', icon: 'stamp', data: { m: m.id }, blocked: n.pending ? 'Décidez des ' + n.pending + ' retraitements en attente avant d’approuver.' : !n.total ? 'Aucun retraitement à décider.' : null, key: 'norm-approve' }) + '</div>';
    var checks = E.statementChecks(m);
    var aiIntro = 'Retraitements proposés à partir des états' + (E.isSeeded(m) ? ' confirmés' : ' saisis') + ' et, le cas échéant, du grand livre collé. La provenance de chaque carte est affichée.';
    return '<div class="split split-norm"><div>' +
      C.section('État des résultats ' + by, '<table class="ledger ledger-is"><caption class="sr-only">État des résultats ' + by + '</caption><tbody>' + lines + '</tbody></table>' +
        '<h3 class="sub-h">Validations déterministes</h3><ul class="checks">' + checks.map(function (v) { return '<li class="' + (v.ok ? 'ok' : v.warn ? 'warn' : 'block') + '">' + C.icon(v.ok ? 'check' : 'alert') + '<span><strong>' + esc(v.label) + '</strong> ' + esc(v.detail) + '</span></li>'; }).join('') + '</ul>' +
        (!locked ? '<div class="actions">' + C.btn('Modifier les états financiers', 'fin-edit', { ui: true, small: true, variant: 'ghost', icon: 'edit', data: { m: m.id }, key: 'fin-edit' }) + '</div>' : ''), { hid: 'h-is', sub: esc(m.profile.engagement || '') + (m.profile.cpa && S.P.identity() ? ', ' + esc(m.profile.cpa) : '') + '. Chaque montant renvoie à sa page.' }) +
      C.section('Retraitements proposés', C.ai('Financial Forensics', 'Moyenne', '<p>' + aiIntro + ' Rien n’est appliqué automatiquement : l’analyste accepte, modifie la défendabilité ou rejette chacun. Les totaux sont calculés par le moteur.</p>', '', C.provOf(m.adjustments.map(C.itemProv))) + (locked ? '' : ledgerPanel(st, m)) + '<div class="adjs">' + (adjCards || C.empty('Aucun retraitement', 'Analysez un grand livre ou ajoutez un retraitement à la main.')) + '</div>' +
        (locked ? '' : '<div class="actions">' + C.btn('Ajouter un retraitement', 'adj-new', { ui: true, variant: 'quiet', icon: 'plus', data: { m: m.id }, key: 'adj-new' }) + '</div>'), { hid: 'h-adj', sub: n.decided + ' sur ' + n.total + ' décidés' }) +
      '</div><aside class="sticky">' + C.section('Trois BAIIA', totals + approveBox, { hid: 'h-tot', cls: 'sheet-key' }) + '</aside></div>';
  }

  /* ---------------- Évaluation ---------------- */
  function evaluation(st, m) {
    if (!S.P.financials()) return C.roleNote('L’évaluation et les honoraires sont réservés à la courtière et à l’analyste.');
    if (!m.fin.entered) return '<div class="notice">' + C.icon('lock') + '<span>L’évaluation part des états financiers. <a href="#/dossier/' + m.id + '/retraitement">Saisir les états financiers</a> (étape 1).</span></div>';
    var n = E.normalization(m), v = E.valuation(m), sens = E.sensitivity(m), gap = E.valueGap(m), locked = !!m.valApproved, by = n.base;
    if (!m.normApproved) return '<div class="notice">' + C.icon('lock') + '<span>L’évaluation part du BAIIA retraité approuvé. <a href="#/dossier/' + m.id + '/retraitement">Terminer le retraitement</a> (étape 1).</span></div><p class="fineprint">Aperçu non validé : base ' + U.money(v.base) + ', multiple médian ' + U.x(v.mult.mid) + '.</p>';
    var bases = [['declared', 'Déclaré', n.declared[by]], ['conservative', 'Conservateur', n.conservative[by]], ['full', 'Complet', n.full[by]]];
    var baseSel = '<div class="seg-group" role="radiogroup" aria-label="BAIIA retenu">' + bases.map(function (b) { return '<button type="button" role="radio" aria-checked="' + (v.which === b[0]) + '" class="seg' + (v.which === b[0] ? ' is-on' : '') + '" data-action="valBase" data-m="' + m.id + '" data-value="' + b[0] + '" data-key="base-' + b[0] + '"><strong>' + esc(b[1]) + '</strong><span>' + U.money(b[2]) + '</span></button>'; }).join('') + '</div>';
    var mods = '<ul class="mods">' + v.mods.map(function (x) {
      var auto = x.mod.auto, ev = E.evidenceOf(m, x.mod), miss = ev.missing.map(function (y) { return 'pièce ' + y.id + ' « ' + y.name + ' », ' + (D.ITEM_STATUS[y.status] || y.status).toLowerCase(); }).join('; ');
      return '<li class="is-' + x.status + '"><div><span class="mod-v">' + U.signedX(x.value) + '</span><strong>' + esc(x.mod.label) + '</strong> ' + C.prov(C.itemProv(x.mod)) + '<span class="cell-sub">' + esc(auto ? 'Règle moteur : −0,25× sous 500 k$ de BAIIA retraité, −0,5× sous 250 k$' : 'Preuve : ' + x.mod.evidence) + '</span>' + (miss ? '<span class="cell-sub mod-evid-missing">' + C.icon('alert', 'ico ico-sm') + 'À documenter : ' + esc(miss) + '. Ne peut pas être retenu avant la révision de la pièce.</span>' : '') + '</div><div class="mod-acts">' +
        (auto ? C.chip('Règle du moteur', '') : locked ? C.chip(x.status === 'accepted' ? 'Retenu' : 'Écarté', x.status === 'accepted' ? 'ok' : '') : (x.status === 'proposed' ? C.btn('Retenir', 'modDecide', { small: true, variant: 'ok', data: { m: m.id, id: x.mod.id, d: 'accepted' }, blocked: miss ? 'Preuve à documenter : ' + miss + '. Faites-la déposer et révisez-la dans la salle, ou écartez ce modulateur.' : null, key: 'mod-a-' + x.mod.id }) + C.btn('Écarter', 'modDecide', { small: true, variant: 'quiet', data: { m: m.id, id: x.mod.id, d: 'rejected' }, key: 'mod-r-' + x.mod.id }) : C.chip(x.status === 'accepted' ? 'Retenu' : 'Écarté', x.status === 'accepted' ? 'ok' : '') + C.btn('Annuler', 'modDecide', { small: true, variant: 'ghost', data: { m: m.id, id: x.mod.id, d: 'proposed' } }))) + '</div></li>';
    }).join('') + '</ul>';
    var lo = v.ev.low, hi = v.ev.high, scaleMin = Math.floor(lo * 0.8 / 100000) * 100000, scaleMax = Math.ceil(hi * 1.15 / 100000) * 100000;
    var pos = function (x) { return ((x - scaleMin) / (scaleMax - scaleMin || 1) * 100).toFixed(2) + '%'; };
    var range = '<div class="range" role="img" aria-label="Fourchette de ' + U.money(lo) + ' à ' + U.money(hi) + ', médiane ' + U.money(v.ev.mid) + '"><span class="range-band" style="left:' + pos(lo) + ';width:calc(' + pos(hi) + ' - ' + pos(lo) + ')"></span><span class="range-mid" style="left:' + pos(v.ev.mid) + '"></span>' +
      '<span class="range-lab" style="left:' + pos(lo) + '">' + U.money(lo) + '<em>' + U.x(v.mult.low) + '</em></span><span class="range-lab range-lab-mid" style="left:' + pos(v.ev.mid) + '">' + U.money(v.ev.mid) + '<em>' + U.x(v.mult.mid) + '</em></span><span class="range-lab" style="left:' + pos(hi) + '">' + U.money(hi) + '<em>' + U.x(v.mult.high) + '</em></span></div>';
    var br = m.val.bridge;
    var bridge = '<table class="ledger"><thead><tr><th scope="col">Pont de valeur</th><th scope="col" class="num">Bas</th><th scope="col" class="num">Médian</th><th scope="col" class="num">Haut</th></tr></thead><tbody>' +
      '<tr><th scope="row">Valeur d’entreprise</th>' + ['low', 'mid', 'high'].map(function (k) { return '<td class="num">' + U.money(v.ev[k]) + '</td>'; }).join('') + '</tr>' +
      '<tr><th scope="row">Moins : dette portant intérêt<span class="cell-sub">' + esc(br.debtSrc) + '</span></th>' + ['low', 'mid', 'high'].map(function () { return '<td class="num">' + U.money(-br.debt) + '</td>'; }).join('') + '</tr>' +
      '<tr><th scope="row">Plus : encaisse excédentaire<span class="cell-sub">' + esc(br.cashSrc) + '</span></th>' + ['low', 'mid', 'high'].map(function () { return '<td class="num">' + U.money(br.cash) + '</td>'; }).join('') + '</tr>' +
      '<tr><th scope="row">Ajustement du fonds de roulement<span class="cell-sub">' + esc(br.wcSrc) + ' : ' + U.money(br.wcClose) + ' estimé contre ' + U.money(br.wcTarget) + ' normalisé</span></th>' + ['low', 'mid', 'high'].map(function () { return '<td class="num">' + U.money(v.wcAdj) + '</td>'; }).join('') + '</tr>' +
      '</tbody><tfoot><tr><th scope="row">Valeur des actions</th>' + ['low', 'mid', 'high'].map(function (k) { return '<td class="num total">' + U.money(v.equity[k]) + '</td>'; }).join('') + '</tr></tfoot></table>' +
      '<p class="fineprint">Pourquoi le cédant entend un chiffre et reçoit l’autre : la valeur des actions, pas la valeur d’entreprise, revient à l’actionnaire (leçon C2.5 L3).</p>';
    var sensT = '<table class="ledger sens"><caption class="sr-only">Sensibilité de la valeur d’entreprise</caption><thead><tr><th scope="col">Multiple</th>' + sens.cols.map(function (c) { return '<th scope="col" class="num">' + esc(c.label) + '<span class="cell-sub">' + U.moneyShort(c.v) + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
      sens.rows.map(function (r) { return '<tr' + (Math.abs(r - sens.mid) < 0.001 ? ' class="is-mid"' : '') + '><th scope="row">' + U.x(r) + '</th>' + sens.cols.map(function (c) { var on = Math.abs(r - sens.mid) < 0.001 && c.id === sens.which; return '<td class="num' + (on ? ' is-on' : '') + '">' + U.moneyShort(c.v * r) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
    var gapH = '<div class="gap"><div class="gap-ends"><div><span>Aujourd’hui</span><strong>' + U.money(gap.today) + '</strong></div><div><span>Après préparation</span><strong>' + U.money(gap.after) + '</strong></div><div class="gap-total"><span>Écart</span><strong>' + U.money(gap.total, { sign: true }) + '</strong></div></div>' +
      (gap.steps.length ? '<ol class="gap-steps">' + gap.steps.map(function (s) { return '<li><span>' + esc(s.label) + '<span class="cell-sub">' + esc(s.detail) + '</span></span><strong class="num">' + U.money(s.delta, { sign: true }) + '</strong></li>'; }).join('') + '</ol>' : '<p class="cell-sub">Aucun levier retenu : aucun modulateur négatif avec plan d’action, aucun pro forma hors base.</p>') +
      '<p class="fineprint">Leviers appliqués en séquence pour ne jamais compter une prime deux fois; la somme des écarts égale l’écart total.</p></div>';
    var worst = v.mods.filter(function (x) { return x.applied && x.value < 0; }).sort(function (a, b) { return a.value - b.value; })[0];
    var narrative = C.ai('Valuation & Structuring : synthèse pour le cédant', 'Élevée', '<p>« Votre entreprise vaut entre <b class="bound">' + U.money(v.ev.low) + '</b> et <b class="bound">' + U.money(v.ev.high) + '</b>. Nous partons d’un BAIIA de <b class="bound">' + U.money(v.base) + '</b> et d’un multiple de marché de ' + U.x(m.val.base.mid) + ' pour ce secteur et cette taille.' + (worst ? ' « ' + esc(worst.mod.label) + ' » retire <b class="bound">' + U.x(Math.abs(worst.value)) + '</b> au multiple : c’est le levier principal.' : '') + ' »</p><p class="fineprint">Chaque chiffre en gras est une variable liée au moteur; un nombre absent des sorties du moteur bloquerait l’approbation. Gabarit rédigé à partir des sorties du moteur, sans modèle.</p>', '', { source: 'rules' });
    var approve = locked ? '<div class="approve-box">' + C.stamp(m.valApproved, 'Fourchette validée') + (['signe', 'preparation', 'marche'].indexOf(m.stage) >= 0 ? C.btn('Rouvrir', 'valReopen', { small: true, variant: 'ghost', data: { m: m.id } }) : '') + C.btn('Rapport d’évaluation (PDF)', 'print-valuation', { ui: true, small: true, variant: 'quiet', icon: 'print', data: { m: m.id } }) + '</div>' :
      '<div class="approve-box"><p>' + (v.pending ? 'Retenez ou écartez chaque modulateur proposé.' : 'Modulateurs décidés.') + '</p>' + C.btn('Valider la fourchette', 'valApprove', { variant: 'brass', icon: 'stamp', data: { m: m.id }, blocked: !S.P.decideMandate() ? 'Seule la courtière responsable valide la fourchette de valeur.' : v.pending ? 'Décidez des modulateurs proposés.' : null, key: 'val-approve' }) + '</div>';
    return '<div class="split split-val"><div>' +
      C.section('Base et multiple', '<h3 class="sub-h">BAIIA retenu, exercice ' + by + '</h3>' + baseSel + '<h3 class="sub-h">Multiple de marché</h3><p class="param">' + C.icon('doc') + '<span>' + esc(m.val.paramSet) + ' : ' + U.x(m.val.base.low) + ', ' + U.x(m.val.base.mid) + ', ' + U.x(m.val.base.high) + '. Vérifié le ' + U.date(m.val.verified) + ', ' + esc(m.val.by) + '.</span></p>' +
        C.ai('Valuation & Structuring', 'Moyenne', '<p>Modulateurs proposés avec leurs preuves. Le moteur applique uniquement ceux que la courtière retient; un modulateur sans pièce révisée reste « à documenter ».</p>', '', C.provOf(v.mods.filter(function (x) { return !x.mod.auto; }).map(function (x) { return C.itemProv(x.mod); }))) + mods +
        '<p class="mods-net">Effet net retenu : <strong>' + U.signedX(v.net) + '</strong>, multiples ' + U.x(v.mult.low) + ' / ' + U.x(v.mult.mid) + ' / ' + U.x(v.mult.high) + '</p>', { hid: 'h-base' }) +
      C.section('Fourchette de valeur d’entreprise', range + bridge + narrative, { hid: 'h-range', sub: 'Fourchette, jamais un prix unique (leçon C3.6 L1)' }) +
      C.section('Sensibilité', sensT, { hid: 'h-sens', sub: 'Valeur d’entreprise selon le multiple et le BAIIA retenu' }) +
      C.section('Écart de valeur', gapH, { hid: 'h-gap', sub: 'L’artefact qui vend les mandats de préparation' }) +
      '</div><aside class="sticky">' + C.section('Validation', approve, { hid: 'h-vapp', cls: 'sheet-key' }) + feesBlock(st, m, v) + '</aside></div>';
  }

  function feesBlock(st, m, v) {
    if (!S.P.fees()) return C.section('Honoraires', C.roleNote('Les honoraires sont visibles par la courtière responsable du mandat seulement (§2.3).'), { hid: 'h-fee', id: 'honoraires' });
    var loi = m.loiSigned ? E.loiOf(m) : null, pol = D.FEE_POLICIES[m.feePolicy];
    var basis = loi ? loi.ev : v.ev.mid, fA = E.fee(m.feePolicy, basis), fB = E.fee('B', basis);
    var pd = E.propertyDeal(m, loi), comm = pd ? Math.round(pd.price * (m.property.commissionRate || 0.05)) : 0;
    var input = st.feeInput || basis, fx = E.fee(m.feePolicy, input), fxB = E.fee('B', input);
    function breakdown(f) { return f.parts.map(function (p) { return '<tr><th scope="row">' + U.pct(p.rate * 100, 0) + ' de ' + U.moneyShort(p.from) + ' à ' + U.moneyShort(p.to) + '</th><td class="num">' + U.money(p.amount) + '</td></tr>'; }).join(''); }
    var html = '<table class="ledger"><tbody><tr><th scope="row">Assiette<span class="cell-sub">' + (loi ? 'Prix convenu à la LI signée' : 'Valeur d’entreprise médiane, à confirmer au mandat') + '</span></th><td class="num">' + U.money(basis) + '</td></tr>' + breakdown(fA) +
      '</tbody><tfoot><tr><th scope="row">Honoraires de succès, Politique ' + m.feePolicy + (fA.minApplied ? '<span class="cell-sub">Minimum de ' + U.money(pol.min) + ' appliqué</span>' : '<span class="cell-sub">Au-dessus du minimum de ' + U.money(pol.min) + '</span>') + '</th><td class="num total">' + U.money(fA.gross) + '</td></tr></tfoot></table>' +
      '<table class="ledger"><tbody><tr><th scope="row">Frais de préparation et d’évaluation<span class="cell-sub">Encaissés le ' + U.date(m.dates.signed) + '; crédit à définir au contrat</span></th><td class="num">' + U.money(m.prepFee) + '</td></tr>' +
      (pd ? '<tr><th scope="row">Commission immobilière, jambe 2<span class="cell-sub">Hypothèse 5 % de ' + U.money(pd.price) + ', agence partenaire OACIQ, partage à valider</span></th><td class="num">' + U.money(comm) + '</td></tr>' : '') + '</tbody>' +
      '<tfoot><tr><th scope="row">Revenu brut du dossier<span class="cell-sub">Avant partages, frais et impôts</span></th><td class="num total">' + U.money(fA.gross + m.prepFee + comm) + '</td></tr></tfoot></table>' +
      '<div class="fee-calc"><label class="field"><span>Calculateur : valeur de transaction</span><input type="number" min="0" step="10000" value="' + input + '" data-change="feeInput" data-key="fee-input" inputmode="numeric"></label><p>Politique ' + m.feePolicy + ' : <strong>' + U.money(fx.gross) + '</strong>' + (fx.minApplied ? ' (minimum)' : '') + '</p></div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="feeCompare" aria-expanded="' + !!st.feeCompare + '">' + (st.feeCompare ? 'Masquer' : 'Comparer avec') + ' la politique B</button>' +
      (st.feeCompare ? '<div class="fee-b"><p>' + C.chip(D.FEE_POLICIES.B.status, 'warn') + '</p><table class="ledger"><tbody>' + breakdown(fB) + '<tr><th scope="row">Brut, minimum 45 000 $</th><td class="num">' + U.money(fB.gross) + '</td></tr><tr><th scope="row">Crédit des frais de préparation (6 000 $, 100 %)</th><td class="num">' + U.money(-fB.credit) + '</td></tr></tbody><tfoot><tr><th scope="row">Net, Politique B</th><td class="num total">' + U.money(fB.net) + '</td></tr></tfoot></table><p class="fineprint">Calculateur, politique B : ' + U.money(fxB.net) + ' net. Deux barèmes contradictoires coexistent dans les sources; seul un barème approuvé par la propriétaire devient actif. Le mandat ' + esc(m.code) + ' conserve le barème signé (' + m.feePolicy + ').</p></div>' : '');
    return C.section('Honoraires', html, { hid: 'h-fee', id: 'honoraires', sub: 'Politique ' + m.feePolicy + ' : 10 % jusqu’à 1 M$, 6 % au-delà, minimum ' + U.money(pol.min) });
  }

  UI.UIA['fin-edit'] = function (p) { local.editFin[p.m] = !local.editFin[p.m]; UI.render(); };
  UI.UIA['fin-cancel'] = function (p) { local.editFin[p.m] = false; UI.render(); };
  UI.UIA['ledger-toggle'] = function (p, el, e) { var det = el.closest('details'); local.ledgerOpen = det.open ? null : p.m; det.open = !det.open; };
  UI.UIA['ledger-sample'] = function (p) { var ta = document.getElementById('ledger-' + p.m); if (ta) { ta.value = SAMPLE_LEDGER; local.ledger = local.ledger || {}; local.ledger[p.m] = ta.value; ta.focus(); } };
  function ledgerText(m) { var ta = document.getElementById('ledger-' + m); var v = ta ? ta.value : ''; local.ledger = local.ledger || {}; local.ledger[m] = v; local.ledgerOpen = m; return v; }
  UI.UIA['ledger-rules'] = function (p) {
    var m = S.mandate(p.m), t = ledgerText(p.m); if (!t.trim()) { UI.toast('Collez d’abord des lignes de grand livre ou des notes.', 'err'); return; }
    var res = R.adjustmentsFromText(t, m); local.ledgerIgnored = local.ledgerIgnored || {}; local.ledgerIgnored[p.m] = res.ignored;
    if (!res.adjustments.length) { UI.toast('Aucun retraitement reconnu par les règles. Lignes non retenues : ' + res.ignored.length + '.', 'err'); UI.render(); return; }
    UI.run('adjProposals', { m: p.m, items: res.adjustments, provenance: { source: 'rules' } });
  };
  UI.UIA['ledger-ai'] = function (p) { var t = ledgerText(p.m); if (!t.trim()) { UI.toast('Collez d’abord des lignes de grand livre ou des notes.', 'err'); return; } g.AI.adjustments(p.m, t, function (res) { local.ledgerIgnored = local.ledgerIgnored || {}; local.ledgerIgnored[p.m] = res.ignored || []; }); };

  UI.VIEWS.dossier = function (r) {
    var st = S.get();
    if (!S.P.mandates()) return '<div class="page"><header class="page-head"><h1>Dossier inaccessible</h1></header>' + C.roleNote('Les mandats vendeur ne sont pas accessibles au rôle agent vendeur (§2.2). Les agents vendeurs prospectent et prennent les rendez-vous; ils ne négocient pas.') + '<div class="actions"><a class="btn btn-primary" href="#/radar">Ouvrir le radar de relève</a></div></div>';
    var m = S.mandate(r.parts[0]);
    if (!m) return '<div class="page"><header class="page-head"><h1>Dossier introuvable</h1></header>' + C.empty('Ce mandat n’existe pas ou a été supprimé', 'Il a peut-être été supprimé ou l’espace de travail a été réinitialisé.', '<a class="btn btn-primary" href="#/dossiers">Voir les dossiers</a>') + '</div>';
    var tab = (r.parts[1] || 'apercu');
    if (TABS.map(function (t) { return t.id; }).indexOf(tab) < 0) tab = 'apercu';
    var body = tab === 'apercu' ? apercu(st, m) : tab === 'retraitement' ? retraitement(st, m) : tab === 'evaluation' ? evaluation(st, m) : UI.VIEWS['dossier-' + tab] ? UI.VIEWS['dossier-' + tab](st, m) : '';
    return '<div class="page page-dossier" data-mandate="' + m.id + '">' + header(st, m, tab) + '<div class="d-body">' + body + '</div></div>';
  };
  UI.DOSSIER = { TABS: TABS, journal: journal, local: local };
})(window);
