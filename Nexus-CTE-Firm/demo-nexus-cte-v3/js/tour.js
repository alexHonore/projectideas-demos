/* Nexus CTE V3 — mode présentation : parcours commenté du signal de relève à la clôture.
   Chaque étape peut être faite à la main ou exécutée par « Faire l'étape pour moi » (actions déterministes, journalisées). */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, S = g.S, R = g.R, UI = g.UI, C = UI.C, esc = U.esc;
  var active = false, idx = 0, ring = null;

  var O = 'outarde';
  function st() { return S.get(); }
  function m() { return S.mandate(O) || S.mandates()[0]; }
  function d(name, p) { return S.dispatch(name, Object.assign({ m: O }, p || {})); }
  function k() { var c = st().companyState.r1; return c && c.call; }
  function fixTeaser() { if (!m().teaser.draft) d('teaserGenerate'); for (var i = 0; i < 12; i++) { var iss = R.openIssues(m())[0]; if (!iss) break; if (iss.fixed) d('teaserFix', { key: iss.key }); else d('teaserDropLine', { line: iss.line }); } d('teaserApprove'); }
  function funnelText() { var f = E.funnel(m(), st()); return 'De ' + f[0].n + ' sociétés théoriques à ' + f[5].n + ' acheteurs vérifiés, actifs, financés et déjà intéressés.'; }

  var STEPS = [
    { route: '#/', target: '.equation', title: 'La chaîne de valeur du dossier',
      body: 'Du BAIIA déclaré aux honoraires : chaque terme est calculé par un moteur déterministe et renvoie à sa pièce. Le sélecteur montre la même chaîne pour chacun des mandats; la visite suit Outarde. Les termes pointillés attendent une décision humaine.',
      enter: function () { if (st().towerMandate !== O) S.dispatch('towerMandate', { value: O }); } },
    { route: '#/radar/r1', target: '.r-detail .split-r', title: 'Un signal de relève, un score transparent',
      body: 'Un administrateur ajouté chez Soudure Poulin & Fils fait monter le score. Chaque composante est visible; l’âge du propriétaire, inconnu, est remplacé par un proxy étiqueté à demi-poids. Chaque piste du radar suit le même flux.' },
    { route: '#/radar/r1', target: '.callflow', title: 'Pré-brief et barrière de conformité',
      body: 'Avant de composer : propriété du prospect, LNNTE, liste d’exclusion, ligne d’affaires, fraîcheur de la vérification, heures d’appel selon l’horloge, identification. Si une vérification échoue, le bouton explique pourquoi. L’appel est simulé.',
      act: function () { var c = k(); if (!c || c.step === 'brief') S.dispatch('callOpen', { id: 'r1' }); }, done: function () { var c = k(); return c && c.step !== 'brief'; } },
    { route: '#/radar/r1', target: '.callflow', title: 'Extraction de l’appel, revue avant écriture', enter: function () { var c = k(); if (c && c.step === 'call') S.dispatch('callExtract', { id: 'r1' }); },
      body: 'Le moteur de règles (ou l’IA en direct, avec votre clé) extrait les champs des notes, chacun avec son extrait. Rien n’est écrit sans révision. La disposition « a accepté le questionnaire » consigne le fondement d’envoi du lien de collecte.',
      act: function () { var c = k(); if (!c || c.step === 'brief') S.dispatch('callOpen', { id: 'r1' }); c = k(); if (c.step === 'call') S.dispatch('callExtract', { id: 'r1' }); c = k(); if (c.step === 'extract') { S.dispatch('extractAll', { id: 'r1' }); S.dispatch('callDisposition', { id: 'r1', value: 'a accepté le questionnaire' }); S.dispatch('callCommit', { id: 'r1' }); } },
      done: function () { var c = k(); return c && c.committed; } },
    { route: '#/radar/r1', target: '.callflow', title: 'Questionnaire de sortie et consentement exprès',
      body: 'Le lien passe la barrière LCAP et expire en 14 jours. Le cédant coche deux cases jamais précochées : le fondement passe à consentement exprès, avec preuve. Deux conflits respectent la préséance des sources, puis l’audit de sortie est planifié avec ses rappels.',
      act: function () { var c = k(); if (!c || !c.committed) return; if (c.intake === 'ready') S.dispatch('intakeSend', { id: 'r1' }); c = k(); if (c.intake === 'sent') S.dispatch('intakeSubmit', { id: 'r1', answers: S.lead('r1').sampleIntake, cem: true, notice: true }); c = k(); (c.conflictList || []).forEach(function (x, i) { if (!k().conflicts[x.id]) S.dispatch('conflictResolve', { id: 'r1', c: x.id, choice: i === 0 ? 'a' : 'b' }); }); if (!k().relation) S.dispatch('relationConfirm', { id: 'r1', d: 'yes' }); if (!k().booked) S.dispatch('bookAudit', { id: 'r1' }); },
      done: function () { var c = k(); return c && !!c.booked; } },
    { route: '#/radar/r4', target: '.r-work', title: 'Faut-il prendre ce mandat ?',
      body: 'Après l’audit du Garage Lessard & Frères, le moteur d’acceptation suggère « Préparation seulement » : BAIIA sous 250 k$, attente de prix au-dessus du marché, dépendance au dirigeant. La courtière tranche et justifie; la décision crée un mandat de préparation, visible dans Dossiers.',
      act: function () { if (!(st().companyState.r4 && st().companyState.r4.acceptance)) S.dispatch('acceptance', { id: 'r4', decision: 'preparation', rationale: 'Préparation de 9 mois avant mandat de vente : réduire la dépendance au dirigeant et passer à une mission d’examen.' }); },
      done: function () { return !!(st().companyState.r4 && st().companyState.r4.acceptance); } },
    { route: '#/dossier/outarde/retraitement', target: '.split-norm', title: 'Retraitement du BAIIA : l’IA propose, l’analyste décide',
      body: 'Huit retraitements avec ligne source et preuve. Le loyer sous le marché réduit le BAIIA (cession-bail à venir). La réparation exige la facture. La proposition a8 est un piège : trois années d’honoraires semblables, donc récurrents. Rejetée avec motif, elle devient un exemple. Collez un grand livre pour obtenir d’autres propositions.',
      act: function () {
        if (m().normApproved) return;
        ['a1', 'a3', 'a4', 'a5', 'a6', 'a7'].forEach(function (id) { if (!(m().adj[id] && m().adj[id].status !== 'proposed')) d('adjDecide', { id: id, d: 'accepted' }); });
        if (['demande', 'a_demander'].indexOf(E.itemStatus(m(), '02-07')) >= 0) d('evidenceDeposit', { id: '02-07' });
        if (E.itemStatus(m(), '02-07') === 'recu') d('roomReview', { id: '02-07' });
        if (!(m().adj.a2 && m().adj.a2.status !== 'proposed')) d('adjDecide', { id: 'a2', d: 'accepted' });
        if (!(m().adj.a8 && m().adj.a8.status !== 'proposed')) d('adjDecide', { id: 'a8', d: 'rejected', reason: 'Dépense récurrente : honoraires juridiques semblables en 2023, 2024 et 2025' });
        m().adjustments.forEach(function (a) { if (!(m().adj[a.id] && m().adj[a.id].status !== 'proposed')) d('adjDecide', { id: a.id, d: 'rejected', reason: 'Hors du périmètre de la visite' }); });
        d('normApprove');
      }, done: function () { return !!m().normApproved; } },
    { route: '#/dossier/outarde/evaluation', target: '.split-val', title: 'Évaluation : une fourchette, jamais un prix unique',
      body: 'Le moteur applique le jeu de multiples du secteur et les modulateurs retenus par la courtière : taille, dépendance au dirigeant, concentration, récurrence, croissance. Pont vers la valeur des actions, sensibilité, et l’écart de valeur qui vend les mandats de préparation.',
      act: function () { if (m().valApproved) return; m().val.modifiers.forEach(function (x) { if (!x.auto && (!m().mods[x.id] || m().mods[x.id] === 'proposed')) d('modDecide', { id: x.id, d: 'accepted' }); }); d('valApprove'); },
      done: function () { return !!m().valApproved; } },
    { route: '#/dossier/outarde/evaluation', target: '#honoraires', title: 'Honoraires : le barème signé, et l’autre',
      body: 'Politique A, signée au mandat : 10 % jusqu’à 1 M$, 6 % au-delà, minimum 65 000 $. La politique B (Nexus §11.4) reste un brouillon inactif, affiché en comparaison. La commission immobilière est calculée à part.',
      act: function () { if (!st().feeCompare) S.dispatch('feeCompare'); }, done: function () { return !!st().feeCompare; } },
    { route: '#/dossier/outarde/sommaire', target: '.split-tz', title: 'Sommaire aveugle : vérification des noms et identifiabilité',
      body: 'Le brouillon contient le nom du cédant (exportation bloquée), un chiffre absent du moteur (12 % au lieu de 6,0 %), une année de fondation exacte et des lieux qui permettraient à un concurrent beauceron de reconnaître l’atelier. La même vérification passe sur un brouillon de l’IA en direct.',
      act: function () { if (!m().teaser.approved) fixTeaser(); }, done: function () { return !!m().teaser.approved; } },
    { route: '#/dossier/outarde/acheteurs', target: '.split-buy', title: 'Acheteurs : liquidité réelle et classement explicable',
      body: function () { return funnelText() + ' Le classement se calcule à partir des critères du CRM : modifiez un profil et il se recalcule. Filtres fermes d’abord : le concurrent local reste exclu malgré un score brut élevé. La courtière verrouille la liste et consigne le script.'; },
      act: function () { if (!m().listLocked) d('listLock'); if (!m().script) d('scriptRecord', { ack: true }); }, done: function () { return !!m().listLocked && !!m().script; } },
    { route: '#/dossier/outarde/salle', target: '.room-head', title: 'Salle de données avant la mise en marché',
      body: 'Douze dossiers, chaque pièce avec son statut et son échéance. Le cédant dépose par un lien sans compte (au fil de l’horloge, ou tout de suite en simulation); l’analyste révise. Vous pouvez téléverser un vrai fichier : empreinte SHA-256 et aperçu filigrané. À 80 % révisé, le dossier passe à la mise en marché.',
      act: function () { if (m().stage !== 'preparation') return; if (!m().room.requested) d('roomRequest'); d('roomDepositNow'); d('roomReviewAll'); d('advance'); }, done: function () { return m().stage !== 'preparation'; } },
    { route: '#/dossier/outarde/acheteurs', target: '.split-buy .sticky', title: 'Mise en marché, ententes et refus structuré',
      body: 'Sommaire et entente transmis (simulé). L’horloge avance de trois semaines : les réponses arrivent selon le profil de chaque acheteur. Étienne Rousseau-Vachon décline faute de mise de fonds : le motif structuré enrichit ses critères appris, propose un montage avec co-investisseur et relance l’appariement inverse.',
      act: function () { if (m().stage !== 'marche') return; if (!m().teasersSent) d('teasersSend'); if (Object.keys(m().nda).some(function (id) { return m().nda[id] === 'envoye'; })) S.dispatch('clockAdvance', { minutes: 21 * 1440 }); m().pendingRefusals.slice().forEach(function (x) { d('refusal', { id: x.buyer, reason: x.reason, note: x.reason === 'financement indisponible' ? 'Mise de fonds sous le requis, sans prêteur confirmé' : '' }); }); },
      done: function () { return !!m().teasersSent && E.ndaSigned(m()).length > 0 && !m().pendingRefusals.length; } },
    { route: '#/dossier/outarde/sommaire', target: '.cim', title: 'Cahier de présentation : chaque phrase sourcée',
      body: 'Deux affirmations sans source bloquent l’approbation, dont une qui contredit le constat de dépendance au dirigeant. Une fois corrigé et approuvé, le cahier est remis aux signataires, qui reçoivent un accès filigrané, par dossier et daté. La date limite des lettres est fixée.',
      act: function () { if (m().stage !== 'marche') return; if (!m().cim.generated) d('cimGenerate'); E.cimOpen(m()).forEach(function (x) { var cl = E.byId(m().cim.claims, x.id); if (cl) d('cimClaim', { id: x.id, d: cl.alt ? 'reformulated' : 'deleted' }); }); if (!m().cim.approved) d('cimApprove'); if (E.ndaSigned(m()).some(function (id) { return !E.grantActive(m(), id, st()); })) d('grantAllSigned'); if (!m().loiDeadline) d('loiDeadline', { date: U.diffDays(S.today(), '2027-01-15') >= 7 ? '2027-01-15' : U.addDays(S.today(), 28) }); d('advance'); },
      done: function () { return ['preparation', 'marche'].indexOf(m().stage) < 0; } },
    { route: '#/dossier/outarde/cloture', target: '.loi', title: 'Lettres d’intention : même prix affiché, valeur différente',
      body: 'À la date limite, les lettres arrivent des signataires ayant un accès actif. Lacasse et Capital Relève affichent 1,7 M$, mais 425 000 $ de la seconde sont conditionnels et sa cible de fonds de roulement retire 80 000 $. La courtière retient Lacasse; la signature déclenche la divulgation de conflit (cession-bail avec un client de la firme).',
      act: function () { if (m().stage === 'fenetre' && !m().lois.length) S.dispatch('clockTo', { date: m().loiDeadline, time: 600, actor: 'Visite' }); if (m().stage === 'fenetre') d('advance'); if (m().stage !== 'negociation') return; if (!m().loiSelected) d('loiSelect', { id: (E.byId(m().lois, 'la') || m().lois[0]).id }); if (!m().loiSigned) d('loiSign'); E.conflictParties(m()).forEach(function (p) { if (!m().conflict[p.id]) d('conflictSign', { party: p.id }); }); d('advance'); },
      done: function () { return ['diligence', 'cloture', 'conclu'].indexOf(m().stage) >= 0; } },
    { route: '#/dossier/outarde/cloture', target: '.canvas', title: 'Vérification diligente et montage entreprise plus immeuble',
      body: 'Le montage P1 réunit cédant, acquéreur, investisseur immobilier et prêteur en cinq jambes liées. Le ratio de couverture est testé sous stress. Huit semaines passent : les constats cités sont indexés, la phase I environnementale arrive; la feuille de route de clôture suit l’ordre des dépendances.',
      act: function () { if (m().stage === 'diligence') { if (!m().dd.indexed) S.dispatch('clockAdvance', { minutes: 56 * 1440 }); if (!m().dd.indexed) d('ddIndexNow'); E.ddFindings(m()).forEach(function (x) { if (x.needsDoc && E.itemStatus(m(), x.needsDoc) === 'demande') d('evidenceDeposit', { id: x.needsDoc }); if (x.needsDoc && E.itemStatus(m(), x.needsDoc) === 'recu') d('roomReview', { id: x.needsDoc }); if (m().dd.status[x.id] !== 'resolu') d('ddResolve', { id: x.id }); }); if (!E.financingOk(m())) d('financingApprove'); d('advance'); } if (m().stage === 'cloture') { E.runSheet(m()).forEach(function (x) { if (!m().run[x.id]) d('run', { id: x.id }); }); d('conclude'); } },
      done: function () { return m().stage === 'conclu'; } },
    { route: '#/', target: '.grid-2', title: 'Les conséquences, partout',
      body: 'Le dossier conclu nourrit la mémoire institutionnelle : la médiane des intervalles se recalcule, l’économie du cabinet bascule l’honoraire en encaissé. Les mois écoulés ont aussi fait avancer les autres mandats : retards, accès échus et rappels sont dans la boîte de réception. Le Labo de test rejoue d’autres scénarios.' }
  ];

  function el() { return document.getElementById('tour'); }
  function placeRing() {
    if (!active) return;
    var s = STEPS[idx], t = s.target ? document.querySelector(s.target) : null;
    if (!ring) { ring = document.createElement('div'); ring.className = 'tour-ring'; ring.setAttribute('aria-hidden', 'true'); document.body.appendChild(ring); }
    if (!t) { ring.style.display = 'none'; return; }
    var r = t.getBoundingClientRect();
    ring.style.display = 'block';
    ring.style.top = (r.top + g.scrollY - 6) + 'px'; ring.style.left = (r.left + g.scrollX - 6) + 'px';
    ring.style.width = (r.width + 12) + 'px'; ring.style.height = (r.height + 12) + 'px';
  }
  function card() {
    var s = STEPS[idx], done = s.done ? s.done() : true;
    var host = el();
    host.innerHTML = '<section class="tour-card" role="region" aria-label="Visite commentée" aria-live="polite"><header><span class="tour-n">Étape ' + (idx + 1) + ' sur ' + STEPS.length + '</span><button type="button" class="icon-btn" data-ui="tour-stop" aria-label="Quitter la visite">' + C.icon('x') + '</button></header>' +
      '<div class="tour-prog" aria-hidden="true"><span style="width:' + ((idx + 1) / STEPS.length * 100) + '%"></span></div>' +
      '<h2>' + esc(s.title) + '</h2><p>' + esc(typeof s.body === 'function' ? s.body() : s.body) + '</p>' +
      (s.act ? '<p class="tour-state ' + (done ? 'ok' : '') + '">' + C.icon(done ? 'check' : 'arrow') + (done ? 'Étape faite. Les résultats sont visibles à l’écran.' : 'Faites-la vous-même à l’écran, ou laissez la démo l’exécuter.') + '</p>' : '') +
      '<div class="tour-btns">' + (idx ? '<button type="button" class="btn btn-ghost btn-sm" data-ui="tour-prev">Précédent</button>' : '<span></span>') +
      (s.act && !done ? '<button type="button" class="btn btn-quiet btn-sm" data-ui="tour-do" data-key="tour-do">Faire l’étape pour moi</button>' : '') +
      '<button type="button" class="btn btn-primary btn-sm" data-ui="tour-next" data-key="tour-next">' + (idx === STEPS.length - 1 ? 'Terminer' : 'Suivant') + '</button></div></section>';
    U.typoTree(host);
    host.hidden = false;
  }
  function go(i, focus) {
    idx = Math.max(0, Math.min(STEPS.length - 1, i));
    S.dispatch('tourStep', { n: idx });
    var s = STEPS[idx];
    if (s.enter) { try { s.enter(); } catch (e) { /* ignoré */ } }
    if (location.hash !== s.route) location.hash = s.route; else UI.render();
    setTimeout(function () {
      card();
      var t = s.target && document.querySelector(s.target);
      if (t) t.scrollIntoView({ block: 'start', behavior: U.reducedMotion() ? 'auto' : 'smooth' });
      setTimeout(placeRing, U.reducedMotion() ? 0 : 350);
      if (focus) { var b = el().querySelector('[data-ui="tour-next"]'); if (b) b.focus({ preventScroll: true }); }
    }, 30);
  }
  function start() {
    if (S.get().role !== 'courtier') S.dispatch('role', { value: 'courtier' });
    active = true; document.body.classList.add('touring');
    var saved = S.get().tourStep || 0;
    go(saved > 0 && saved < STEPS.length ? saved : 0, true);
  }
  function stop(silent) {
    active = false; document.body.classList.remove('touring');
    var host = el(); host.hidden = true; host.innerHTML = '';
    if (ring) ring.style.display = 'none';
    if (!silent) UI.toast('Visite en pause. Le bouton « Visite commentée » la reprend à cette étape.');
  }
  UI.UIA['tour-start'] = function () { start(); };
  UI.UIA['tour-stop'] = function () { stop(); };
  UI.UIA['tour-next'] = function () { if (idx === STEPS.length - 1) { stop(true); S.dispatch('tourStep', { n: 0 }); UI.toast('Visite terminée. Explorez librement, ou réinitialisez la démo pour recommencer.'); return; } go(idx + 1, true); };
  UI.UIA['tour-prev'] = function () { go(idx - 1, true); };
  UI.UIA['tour-do'] = function () {
    var s = STEPS[idx];
    try { s.act(); } catch (e) { g.console && console.error(e); }
    UI.render();
    var ok = s.done ? s.done() : true;
    if (!ok) UI.toast('Étape partielle : une condition manque, voyez le message à l’écran.', 'err');
    card(); placeRing();
    var b = el().querySelector('[data-ui="tour-next"]'); if (b) b.focus({ preventScroll: true });
  };
  g.addEventListener('resize', placeRing);
  g.addEventListener('scroll', function () { if (active) placeRing(); }, { passive: true });
  g.Tour = { refresh: function () { if (!active) return; var ae = document.activeElement, host = el(), key = ae && host.contains(ae) ? ae.getAttribute('data-ui') : null; card(); if (key) { var b = host.querySelector('[data-ui="' + key + '"]'); if (b) b.focus({ preventScroll: true }); } setTimeout(placeRing, 0); }, stop: stop, start: start, steps: STEPS, isActive: function () { return active; }, index: function () { return idx; } };
})(window);
