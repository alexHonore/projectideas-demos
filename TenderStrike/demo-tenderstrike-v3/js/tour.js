/* Visite guidée (mode présentation) : parcourt le flux complet de Mont-Saint-Aubin Nord, du brief au reçu officiel.
   Elle utilise les mêmes actions génériques que l’interface et le Labo de test (TS.Flow). */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const U = TS.U, S = TS.S, A = TS.A, UI = TS.UI;
  const esc = U.esc, ic = U.icon;
  const KEY = 'tenderstrike-v3:tour';
  const ID = 'ts-031';
  const F = () => TS.Flow;

  /* Actions idempotentes : chaque étape garantit ses prérequis */
  const E = {
    decision: () => F().decide(ID, 'Territoire, équipement et références conformes. Renouveler l’attestation de Revenu Québec avant le 2 novembre; viser le milieu de la zone de prix.'),
    proposal: () => F().proposal(ID),
    price: () => F().price(ID),
    arq: () => { E.decision(); const v = S.bestDoc('arq'); if (v && S.endOf(v.expires) < Date.parse(S.close(ID))) A.vaultReplace(v.id, { file: F().sampleFile('arq', 'ARQ_Gaudreau'), issued: U.isoDay(S.now()), expires: '2027-01-22' }); },
    forms: () => F().forms(ID),
    cards: () => { F().bond(ID); F().sign(ID); },
    addenda: () => { E.price(); E.arq(); F().approve(ID); if (!S.D(ID).addenda.includes('add2')) TS.App.doExport(ID, { instant: true, quiet: true, noDownload: true }); },
    exported: () => { E.addenda(); F().approve(ID); if (!S.exportedCurrent(ID)) TS.App.doExport(ID, { instant: true, noDownload: true }); },
    receipt: () => { E.exported(); if (!S.D(ID).receipt) A.recordReceipt(ID, 'SEAO-DEMO-031-48217', S.nowIso()); }
  };
  const cite = (rid) => () => {
    const r = S.reqById(ID, rid);
    UI.view.reqFilter[ID] = 'all';
    Object.assign(UI.viewer(ID), { doc: r.doc, page: r.page, clause: r.clause });
    if (UI.isNarrow()) {
      const fake = document.createElement('button');
      fake.dataset.t = ID; fake.dataset.clause = r.clause; fake.dataset.doc = r.doc; fake.dataset.page = r.page;
      TS.App.openCite(fake, true);
    } else { UI.view.scrollPending = ID; TS.App.render(); }
  };

  const STEPS = [
    { route: '#/brief', target: '.brief-sheet', title: 'Le brief du matin', body: 'Chaque matin, une page sur le dossier ouvert le plus urgent : les trois points qui comptent avec leur page source, et le dernier résultat d’ouverture publique. Cinq autres dossiers attendent à d’autres étapes.' },
    { route: '#/brief', target: '.night', title: 'Pendant la nuit', body: 'Ingestion SEAO à 6 h 00, tri par métier et territoire, lecture des devis, comparaison des prix. Ce sont des fenêtres de service : une source en retard donnerait un brief partiel, signalé comme tel.' },
    { route: '#/dossier/' + ID + '/radiographie', target: '.scorecard', title: 'Go / No-Go en trois volets', body: 'Admissibilité, capacité et attrait commercial restent séparés. Un inconnu n’est pas un échec, et aucun score global ne cache un bloqueur.' },
    { route: '#/dossier/' + ID + '/radiographie', target: '[data-req="r-arq"]', title: 'Chaque exigence ouvre sa page', body: 'Le texte du devis est cité mot pour mot, à côté de la lecture de TenderStrike. Ici, l’attestation de Revenu Québec expire trois jours avant la clôture : la page 16 s’ouvre, passage surligné.', action: 'Ouvrir la page 16', run: cite('r-arq') },
    { route: '#/dossier/' + ID + '/radiographie', target: '[data-req="r-penalty"]', title: 'Les clauses de risque', body: 'Une pénalité de 2 500 $ par jour n’empêche pas de soumissionner, mais elle pèse sur la marge : elle est classée à part des pièges éliminatoires.', action: 'Ouvrir la page 48', run: cite('r-penalty') },
    { route: '#/dossier/' + ID + '/radiographie', target: '#decision', title: 'Vous décidez', body: 'Poursuivre, investiguer ou décliner, avec un motif, une personne responsable et une date de révision. Poursuivre ne transforme pas un point ouvert en conformité.', action: 'Poursuivre', run: E.decision },
    { route: '#/dossier/' + ID + '/prix', target: '.oracle-results', title: 'Les ouvertures publiques', body: 'Le même contrat en 2023 : gagnant, écart du 2e (+4,4 %), votre 3e place, et la plus basse soumission rejetée faute de garantie. Chaque montant ouvre sa source publique.' },
    { route: '#/dossier/' + ID + '/prix', target: '.reco', title: 'Une recommandation expliquée', body: 'Repère ajusté (portée × inflation), écart habituel, plancher de marge : chaque étape du calcul est affichée. Aucune probabilité de gain : huit soumissions ne suffisent pas à en estimer une honnêtement.' },
    { route: '#/dossier/' + ID + '/prix', target: '.reco', title: 'Proposer, puis confirmer', body: 'TenderStrike propose un même coefficient pour chaque article; vous confirmez. Le bordereau, le corridor et la garantie requise se recalculent. Vos coûts internes sont modifiables et restent privés.', action: 'Proposer et confirmer', run: E.proposal },
    { route: '#/dossier/' + ID + '/prix', target: '.approve-price', title: 'L’approbation commerciale', body: 'La propriétaire approuve cette version exacte du bordereau. Si un prix ou une quantité change, l’approbation devient périmée.', action: 'Approuver le prix', run: E.price },
    { route: '#/dossier/' + ID + '/conformite', target: '[data-comp="arq"]', title: 'Le bouclier bloque l’export', body: 'Chaque pièce est vérifiée à la date et à l’heure de clôture. Versez la nouvelle attestation : le fichier est lu dans le navigateur et seule son empreinte SHA-256 est conservée. Les autres dossiers sont recalculés aussi.', action: 'Verser un fichier d’exemple', run: E.arq },
    { route: '#/dossier/' + ID + '/formulaires', target: '.fill-meter', title: 'Pré-rempli, et mesuré', body: 'Le pourcentage est compté champ par champ. Prix, déclarations et signatures restent à vous; un courriel absent du coffre-fort reste vide jusqu’à ce qu’une personne le saisisse.', action: 'Saisir le courriel et confirmer', run: E.forms },
    { route: '#/dossier/' + ID + '/revue', target: '.cards', title: 'Propositions à confirmer', body: 'Demande au courtier, déclaration, accusé d’addenda : chaque carte montre le destinataire, les données partagées et la conséquence avant d’exécuter. Les envois sont simulés.', action: 'Confirmer les cartes', run: E.cards },
    { route: '#/dossier/' + ID + '/revue', target: '.package', title: 'Le verrou d’addenda', body: 'Le contrôle final revérifie SEAO juste avant l’export : un addenda n° 2 vient de modifier l’article 3. Les approbations du prix et du paquet deviennent périmées.', action: 'Approuver et lancer l’export', run: E.addenda },
    { route: '#/dossier/' + ID + '/revue', target: '.package', title: 'Export du paquet approuvé', body: 'Après une nouvelle approbation, le paquet s’exporte avec son manifeste (fichiers, empreintes, approbations), marqué comme démonstration. Exporté ne veut pas dire déposé.', action: 'Réapprouver et exporter', run: E.exported },
    { route: '#/dossier/' + ID + '/revue', target: '.package', title: 'Déposé, avec le reçu officiel', body: 'Le dossier ne passe à « Déposé » qu’avec le numéro de confirmation SEAO que vous saisissez. Après l’ouverture, les résultats saisis nourrissent l’historique du secteur Sud.', action: 'Enregistrer un reçu fictif', run: E.receipt },
    { route: '#/journal', target: '.log', title: 'Tout est tracé', body: 'Décisions, approbations, versions des documents, valeurs avant et après : tout est au journal. Le Labo de test (bande du haut) fait avancer l’horloge, injecte des événements et charge d’autres scénarios.' }
  ];

  const T = (TS.Tour = { active: false, i: 0, done: {} });
  const save = () => { try { window.sessionStorage.setItem(KEY, JSON.stringify({ active: T.active, i: T.i })); } catch (e) { /* facultatif */ } };

  const panel = () => {
    let p = U.$('#tour');
    if (!p) {
      p = document.createElement('section');
      p.id = 'tour'; p.className = 'tour';
      p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'false'); p.setAttribute('aria-labelledby', 'tour-t');
      document.body.appendChild(p);
      p.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-tour]');
        if (!b) return;
        const k = b.dataset.tour;
        if (k === 'next') T.go(T.i + 1);
        if (k === 'prev') T.go(T.i - 1);
        if (k === 'close') T.stop();
        if (k === 'run') T.run();
      });
    }
    return p;
  };
  const draw = () => {
    const s = STEPS[T.i], p = panel(), last = T.i === STEPS.length - 1;
    p.innerHTML = `<div class="tour-in">
      <header class="tour-h"><span class="tour-n">Étape ${T.i + 1} sur ${STEPS.length}</span><button type="button" class="icon-btn" data-tour="close" aria-label="Quitter la visite guidée">${ic('close', 16)}</button></header>
      <div class="tour-bar" aria-hidden="true"><i style="width:${((T.i + 1) / STEPS.length) * 100}%"></i></div>
      <h2 id="tour-t" class="tour-t">${esc(s.title)}</h2>
      <p class="tour-b">${esc(s.body)}</p>
      ${s.run ? `<button type="button" class="btn btn-hl tour-run" data-tour="run"${T.done[T.i] ? ' disabled' : ''}>${T.done[T.i] ? ic('check', 15) + '<span>Fait</span>' : ic('play', 15) + '<span>' + esc(s.action) + '</span>'}</button>` : ''}
      <footer class="tour-f">
        <button type="button" class="btn btn-ghost-inv" data-tour="prev"${T.i === 0 ? ' disabled' : ''}>${ic('back', 15)}<span>Précédent</span></button>
        <button type="button" class="btn btn-inv" data-tour="${last ? 'close' : 'next'}">${last ? '<span>Terminer</span>' : '<span>Suivant</span>' + ic('arrow', 15)}</button>
      </footer>
    </div>`;
    U.typo(p);
  };
  const highlight = () => {
    U.$$('.tour-target').forEach((el) => el.classList.remove('tour-target'));
    if (!T.active) return;
    const el = U.$(STEPS[T.i].target);
    if (!el) return;
    el.classList.add('tour-target');
    const r = el.getBoundingClientRect();
    const p = U.$('#tour');
    if (p) p.classList.toggle('tour-left', window.innerWidth >= 861 && r.left + r.width / 2 > window.innerWidth * 0.55);
    const narrow = window.innerWidth < 760;
    const room = narrow ? window.innerHeight * 0.5 : window.innerHeight - 40;
    if (r.top < 70 || r.top > room - 60) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - (narrow ? 64 : 96)), behavior: U.reducedMotion() ? 'auto' : 'smooth' });
  };
  T.refresh = () => { if (T.active) highlight(); };
  T.go = (i) => {
    if (i < 0 || i >= STEPS.length) return;
    T.i = i; save();
    const s = STEPS[i];
    if (U.$('#dlg').open) UI.closeDialog();
    draw();
    if (location.hash !== s.route && !(s.route === '#/brief' && !location.hash)) location.hash = s.route;
    else highlight();
    const f = U.$('#tour .tour-run:not([disabled])') || U.$('#tour [data-tour="next"]') || U.$('#tour [data-tour="close"]');
    if (f) f.focus({ preventScroll: true });
  };
  T.run = () => {
    const s = STEPS[T.i];
    if (!s.run) return;
    if (location.hash !== s.route) location.hash = s.route;
    s.run();
    T.done[T.i] = true;
    TS.App.render(); draw(); highlight();
    const n = U.$('#tour [data-tour="next"]') || U.$('#tour [data-tour="close"]');
    if (n) n.focus({ preventScroll: true });
  };
  T.start = () => { if (UI.view.lab) { UI.view.lab = false; TS.App.render(); } T.active = true; T.done = {}; document.body.classList.add('touring'); T.go(0); };
  T.stop = () => {
    T.active = false; save();
    const p = U.$('#tour'); if (p) p.remove();
    document.body.classList.remove('touring');
    U.$$('.tour-target').forEach((el) => el.classList.remove('tour-target'));
    if (U.$('#dlg').open && U.$('#dlg').classList.contains('is-modeless')) UI.closeDialog();
    const b = U.$('[data-act="tour-start"]'); if (b) b.focus();
  };
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && T.active && !U.$('#dlg').open) T.stop(); });
  T.steps = STEPS;
})();
