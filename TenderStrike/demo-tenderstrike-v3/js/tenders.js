/* TenderStrike QC · V3 — définitions complètes des appels d’offres fictifs.
   Chaque définition alimente le même moteur : pages clés citées, exigences et règles, bordereau,
   historique d’ouvertures, addenda (publiés ou à venir), échéances. Tout est inventé. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const U = TS.U;
  const dt = (iso) => U.day(iso) + ' ' + U.date(iso).replace(/^\S+ \S+ /, '').replace(/^\d+ \S+ /, '') + ' à ' + U.time(iso);
  const longDate = (iso) => U.day(iso).replace(/^(\S+) /, '$1 ') + ' ' + new Date(iso).toLocaleDateString('fr-CA', { year: 'numeric', timeZone: 'America/Toronto' });
  const when = (iso) => longDate(iso) + ', ' + U.time(iso);

  /* Clauses communes (gabarits paramétrés) */
  const CL = {
    cover: (t, rows) => ({ doc: 'devis', n: 1, cover: true, blocks: [
      { t: 'kicker', x: t.buyer + ' · ' + (t.service || 'Service de l’approvisionnement') },
      { t: 'title', x: 'Appel d’offres public n° ' + t.ref },
      { t: 'subtitle', x: t.title },
      { t: 'p', x: t.termLong || t.term },
      { t: 'dl', rows: [['Publication sur SEAO', U.date(t.published + 'T12:00:00-04:00')], ['Réception des soumissions', when(t.close) + ' (heure de Montréal)'], ['Ouverture publique', 'Le même jour, ' + U.time(t.opening)]].concat(rows || []) },
      { t: 'note', x: 'Document fictif produit pour une démonstration. Il ne provient d’aucun avis public réel.' }
    ] }),
    arq: 'Attestation de Revenu Québec. Le soumissionnaire qui a un établissement au Québec joint à sa soumission une attestation délivrée par Revenu Québec dont la période de validité couvre la date et l’heure limites de réception des soumissions. Une soumission non accompagnée d’une telle attestation est rejetée.',
    amp: 'Autorisation de contracter. À la date du dépôt, le soumissionnaire détient une autorisation de contracter délivrée par l’Autorité des marchés publics (AMP) et la maintient pendant toute la durée du contrat. Il en indique le numéro au formulaire de soumission.',
    rena: 'Le soumissionnaire n’est pas inscrit au Registre des entreprises non admissibles aux contrats publics (RENA).',
    cnesst: 'Le soumissionnaire joint une attestation de conformité délivrée par la CNESST, valide à la date limite de réception des soumissions.',
    seao: 'Mode de dépôt. Les soumissions sont déposées par voie électronique sur le Système électronique d’appel d’offres (SEAO) avant la date et l’heure limites. Aucune soumission sur papier, par courriel ou par télécopieur n’est acceptée. Les documents sont transmis en format PDF; chaque fichier ne dépasse pas 25 Mo.',
    validity: (d) => 'Délai de validité. La soumission est irrévocable et demeure valide pendant ' + d + ' jours suivant la date d’ouverture.',
    lowest: (basis) => 'Adjudication. Le contrat est adjugé au plus bas soumissionnaire conforme, sur la base du prix total soumis, ' + (basis || 'toutes taxes incluses') + '.',
    questions: (iso) => 'Questions. Toute question est adressée par écrit au responsable de l’appel d’offres au plus tard le ' + when(iso) + '. Les réponses sont transmises à tous les preneurs du document sous forme d’addenda publié sur SEAO.',
    insurance: (m) => 'L’adjudicataire maintient une assurance responsabilité civile d’au moins ' + U.money(m) + ' par sinistre, désignant le donneur d’ouvrage comme coassuré. Une preuve d’assurance est jointe à la soumission.',
    bond: (rate, basis) => 'Garantie de soumission. Le soumissionnaire joint une garantie de soumission équivalant à ' + U.num(rate * 100, 0) + ' % du prix total de sa soumission, ' + (basis === 'ht' ? 'avant taxes' : 'toutes taxes incluses') + ', sous forme de cautionnement émis par une compagnie autorisée ou de chèque visé, valide pendant quatre-vingt-dix (90) jours suivant l’ouverture. L’absence de garantie, ou une garantie d’un montant insuffisant, entraîne le rejet automatique de la soumission.',
    ack: (n) => 'Le soumissionnaire joint à sa soumission le formulaire d’accusé de réception du présent addenda n° ' + n + ', dûment signé.'
  };
  TS.CL = CL;
  TS.when = when;

  const docMeta = (pages, published) => ({ devis: { id: 'devis', label: 'Cahier des charges', short: 'Devis v1', pages, published } });

  /* ============ 1. Mont-Saint-Aubin, secteur Nord · déneigement ============ */
  const msaArticles = (q) => [
    { code: 'chaussees', n: 1, label: 'Déneigement et déglaçage des chaussées', unit: 'km·saison', qty: q.ch, cost: q.cost[0], price: q.price[0], ref: 3690, decimals: 1 },
    { code: 'trottoirs', n: 2, label: 'Déneigement des trottoirs', unit: 'km·saison', qty: q.tr, cost: q.cost[1], price: q.price[1], ref: 2110, decimals: 1, note: q.trNote },
    { code: 'transport', n: 3, label: 'Chargement et transport de la neige au dépôt', unit: 'm³', qty: q.tp, cost: q.cost[2], price: q.price[2], ref: 2.70, decimals: 0, measured: true },
    { code: 'epandage', n: 4, label: 'Épandage de fondants et d’abrasifs (fournis par la Ville)', unit: 't', qty: q.ep, cost: q.cost[3], price: q.price[3], ref: 19.40, decimals: 0, measured: true },
    { code: 'garde', n: 5, label: 'Garde, mobilisation et disponibilité', unit: 'saison', qty: 3, cost: q.cost[4], price: q.price[4], ref: 12200, decimals: 0 }
  ];
  const MSA_CPI = { 2020: 139.0, 2023: 158.9 };
  const msaStdReqs = (secs) => [
    { id: 'r-visit', clause: 'c-visit', doc: 'devis', page: secs.visit, sec: '§1.4', assess: 'eligibility', kind: 'trap', title: 'Visite obligatoire des lieux', plain: 'Sans l’attestation de visite remise par la Ville, la soumission est rejetée.', rule: { type: 'visit' }, conf: 0.98 },
    { id: 'r-arq', clause: 'c-arq', doc: 'devis', page: 16, sec: '§2.4', assess: 'eligibility', kind: 'trap', title: 'Attestation de Revenu Québec valide à la clôture', plain: 'La validité doit couvrir la date et l’heure de clôture, pas seulement la date du dépôt.', rule: { type: 'vault', kind: 'arq' }, conf: 0.96 },
    { id: 'r-amp', clause: 'c-amp', doc: 'devis', page: 16, sec: '§2.5', assess: 'eligibility', kind: 'req', title: 'Autorisation de contracter de l’AMP', plain: 'Exigée par ce devis à la date du dépôt et pendant tout le contrat.', rule: { type: 'amp' }, conf: 0.95 },
    { id: 'r-rena', clause: 'c-rena', doc: 'devis', page: 17, sec: '§2.6', assess: 'eligibility', kind: 'req', title: 'Absence d’inscription au RENA', plain: 'L’entreprise ne doit pas figurer au registre des entreprises non admissibles.', rule: { type: 'rena' }, conf: 0.97 },
    { id: 'r-cnesst', clause: 'c-cnesst', doc: 'devis', page: 17, sec: '§2.7', assess: 'eligibility', kind: 'req', title: 'Attestation de conformité CNESST', plain: 'Valide à la date limite de réception des soumissions.', rule: { type: 'vault', kind: 'cnesst' }, conf: 0.94 },
    { id: 'r-exp', clause: 'c-exp', doc: 'devis', page: 21, sec: '§3.2', assess: 'eligibility', kind: 'trap', title: 'Trois contrats de 30 km ou plus en 5 ans', plain: 'Trois références distinctes, terminées depuis le 5 novembre 2021 et d’au moins 30 km de voies.', rule: { type: 'experience' }, conf: 0.93 },
    { id: 'r-bond', clause: 'c-bond', doc: 'devis', page: 37, sec: '§6.3', assess: 'eligibility', kind: 'trap', title: 'Garantie de soumission de 5 % TTC', plain: 'Une garantie absente ou insuffisante entraîne le rejet automatique. En 2023, la plus basse soumission a été rejetée pour ce motif.', rule: { type: 'bond' }, conf: 0.97 },
    { id: 'r-insurance', clause: 'c-insurance', doc: 'devis', page: 40, sec: '§7.1', assess: 'eligibility', kind: 'req', title: 'Assurance responsabilité civile de 5 M$', plain: 'Preuve d’assurance au dépôt; l’avenant désignant la Ville à l’adjudication.', rule: { type: 'insurance', min: 5000000 }, conf: 0.95 },
    { id: 'r-equip', clause: 'c-equip', doc: 'devis', page: 25, sec: '§4.2', assess: 'capability', kind: 'req', title: 'Équipements minimaux', plain: secs.equipPlain, rule: { type: 'equipment' }, conf: 0.94 },
    { id: 'r-gps', clause: 'c-gps', doc: 'devis', page: 30, sec: '§5.6', assess: 'capability', kind: 'req', title: 'GPS sur chaque véhicule', plain: 'Registre transmis chaque semaine; 500 $ par intervention non consignée (§8.2).', rule: { type: 'confirm', key: 'gps', unknown: '11 véhicules sur 12 ont un GPS documenté (les 2 souffleuses sont des accessoires) : celui de la chenillette louée ne l’est pas.', done: 'GPS confirmé par le loueur pour la chenillette Prinoth.', action: 'Marquer comme confirmé' }, conf: 0.9 },
    { id: 'r-penalty', clause: 'c-penalty', doc: 'devis', page: 48, sec: '§8.1', assess: 'commercial', kind: 'pill', title: 'Pénalité de 2 500 $ par jour de retard', plain: 'Retenue par jour ou partie de jour si les artères prioritaires dépassent 6 heures.', risk: 'Trois jours de retard par saison coûteraient 22 500 $ sur le contrat, environ 15 % de la marge brute visée.', conf: 0.97 },
    { id: 'r-firm', clause: 'c-firm', doc: 'devis', page: 52, sec: '§9.2', assess: 'commercial', kind: 'pill', title: 'Prix fermes pendant 3 saisons', plain: 'Aucune indexation du carburant ni de l’inflation avant les saisons d’option.', risk: 'Exposition au diesel sur 3 saisons : voir le scénario « Diesel » dans l’onglet Prix.', conf: 0.95 },
    { id: 'r-award', clause: 'c-award', doc: 'devis', page: 12, sec: '§1.15', assess: 'info', kind: 'info', title: 'Plus bas soumissionnaire conforme', plain: 'Comparaison sur le total des 3 saisons, taxes incluses. Les options ne comptent pas.', conf: 0.98 },
    { id: 'r-seao', clause: 'c-seao', doc: 'devis', page: 7, sec: '§1.9', assess: 'info', kind: 'info', title: 'Dépôt sur SEAO seulement, PDF de 25 Mo au plus', plain: 'Aucun dépôt papier ni par courriel. L’heure du système SEAO fait foi.', conf: 0.97 },
    { id: 'r-questions', clause: 'c-questions', doc: 'devis', page: 6, sec: '§1.7', assess: 'info', kind: 'info', title: 'Questions avant la date limite', plain: 'Réponses publiées en addenda à tous les preneurs du document.', conf: 0.96 }
  ];
  const msaPages = (t, o) => [
    CL.cover(t, [['Responsable', 'M. Luc Ferland, approvisionnement']]),
    { doc: 'devis', n: 5, blocks: [
      { t: 'h', x: 'Section 1 · Instructions aux soumissionnaires' },
      { t: 'p', x: '1.3 Les documents d’appel d’offres comprennent le présent cahier des charges, ses annexes A à F et tout addenda publié avant la date limite de réception des soumissions.' },
      { t: 'clause', id: 'c-visit', x: '1.4 Visite obligatoire des lieux. Une visite des lieux est obligatoire. Elle a lieu le ' + when(t.visit.at) + ', ' + t.visit.place + '. Le soumissionnaire y est représenté par une personne dûment autorisée, qui signe le registre de présence. La Ville remet à chaque entreprise présente une attestation de visite, qui doit être jointe à la soumission. Toute soumission non accompagnée de l’attestation de visite sera rejetée.' },
      { t: 'p', x: '1.5 Aucune visite individuelle ne sera organisée.' }
    ] },
    { doc: 'devis', n: 6, blocks: [{ t: 'clause', id: 'c-questions', x: '1.7 ' + CL.questions(t.questionsDeadline) }, { t: 'p', x: '1.8 Il appartient au soumissionnaire de vérifier, avant le dépôt, qu’il a reçu tous les addenda publiés.' }] },
    { doc: 'devis', n: 7, blocks: [{ t: 'clause', id: 'c-seao', x: '1.9 ' + CL.seao }, { t: 'p', x: '1.11 Le soumissionnaire assume tout délai de téléversement. L’heure du système SEAO fait foi.' }] },
    { doc: 'devis', n: 11, blocks: [{ t: 'clause', id: 'c-validity', x: '1.12 ' + CL.validity('quatre-vingt-dix (90)') }] },
    { doc: 'devis', n: 12, blocks: [{ t: 'clause', id: 'c-award', x: '1.15 Adjudication. Le contrat est adjugé au plus bas soumissionnaire conforme, sur la base du prix total des trois (3) saisons, toutes taxes incluses. Les options de renouvellement ne sont pas considérées aux fins de l’adjudication.' }, { t: 'p', x: '1.16 La Ville ne s’engage à accepter ni la plus basse ni aucune des soumissions reçues.' }] },
    { doc: 'devis', n: 16, blocks: [{ t: 'h', x: 'Section 2 · Conditions d’admissibilité' }, { t: 'clause', id: 'c-arq', x: '2.4 ' + CL.arq }, { t: 'clause', id: 'c-amp', x: '2.5 ' + CL.amp }] },
    { doc: 'devis', n: 17, blocks: [{ t: 'clause', id: 'c-rena', x: '2.6 ' + CL.rena }, { t: 'clause', id: 'c-cnesst', x: '2.7 ' + CL.cnesst }] },
    { doc: 'devis', n: 21, blocks: [{ t: 'h', x: 'Section 3 · Qualifications' }, { t: 'clause', id: 'c-exp', x: '3.2 Expérience. Le soumissionnaire démontre qu’il a exécuté, à titre d’entrepreneur principal, au moins trois (3) contrats de déneigement de voies publiques municipales d’au moins trente (30) kilomètres de voies chacun, au cours des cinq (5) années précédant la date limite de réception des soumissions. Il remplit à cet effet l’Annexe D.' }] },
    { doc: 'devis', n: 25, blocks: [{ t: 'h', x: 'Section 4 · Équipements' }, { t: 'clause', id: 'c-equip', x: '4.2 Équipements minimaux. Pour toute la durée du contrat, le soumissionnaire dispose, en propriété ou en location à long terme, au minimum de : ' + o.equipText + '. Il en fournit la liste à l’Annexe E.' }] },
    { doc: 'devis', n: 30, blocks: [{ t: 'h', x: 'Section 5 · Exécution des travaux' }, { t: 'clause', id: 'c-delays', x: '5.3 Délais d’intervention. Les opérations débutent dès que l’accumulation atteint 5 cm. Les artères prioritaires montrées à l’Annexe F sont déblayées dans les 6 heures suivant la fin d’une précipitation et l’ensemble du réseau dans les 12 heures.' }, { t: 'clause', id: 'c-gps', x: '5.6 Chaque véhicule affecté au contrat est muni d’un système de localisation GPS dont le registre est transmis à la Ville chaque semaine.' }] },
    { doc: 'devis', n: 37, blocks: [{ t: 'h', x: 'Section 6 · Garanties' }, { t: 'clause', id: 'c-bond', x: '6.3 ' + CL.bond(0.05, 'ttc') }] },
    { doc: 'devis', n: 38, blocks: [{ t: 'clause', id: 'c-perf', x: '6.4 Garantie d’exécution. L’adjudicataire fournit, dans les dix (10) jours suivant l’adjudication, une garantie d’exécution de dix pour cent (10 %) du prix total du contrat.' }] },
    { doc: 'devis', n: 40, blocks: [{ t: 'h', x: 'Section 7 · Assurances' }, { t: 'clause', id: 'c-insurance', x: '7.1 ' + CL.insurance(5000000) + ' L’avenant désignant la Ville est fourni à l’adjudication.' }] },
    { doc: 'devis', n: 48, blocks: [{ t: 'h', x: 'Section 8 · Pénalités' }, { t: 'clause', id: 'c-penalty', x: '8.1 Si les artères prioritaires ne sont pas entièrement déblayées dans le délai prévu à l’article 5.3, une pénalité de deux mille cinq cents dollars (2 500 $) par jour ou partie de jour de retard est retenue sur les paiements, sans préjudice des autres recours de la Ville.' }, { t: 'clause', id: 'c-penalty-gps', x: '8.2 Une pénalité de cinq cents dollars (500 $) est imposée pour chaque intervention non consignée au registre GPS exigé à l’article 5.6.' }] },
    { doc: 'devis', n: 52, blocks: [{ t: 'h', x: 'Section 9 · Prix et paiement' }, { t: 'clause', id: 'c-firm', x: '9.2 Les prix soumis sont fermes pour les trois (3) saisons du contrat; aucun ajustement pour l’inflation, le carburant ou les précipitations n’est accordé. Pour les saisons d’option, les prix sont ajustés selon la variation de l’IPC (Québec) d’août à août.' }, { t: 'p', x: '9.4 Les articles 3 et 4 du bordereau sont payés selon les quantités réellement mesurées. Les quantités inscrites au bordereau sont des estimations.' }] },
    { doc: 'devis', n: 155, blocks: [{ t: 'h', x: 'Annexe B · Bordereau de prix (version originale)' }, { t: 'clause', id: 'c-bordereau-v1', x: o.bordereauV1 }, { t: 'p', x: o.bordereauNote }] },
    { doc: 'devis', n: 171, scan: true, blocks: [{ t: 'h', x: 'Annexe F · Plan des artères prioritaires' }, { t: 'clause', id: 'c-annexf', x: 'Plan numérisé (6 pages). Le texte de cette annexe n’a pas pu être extrait de façon fiable : confiance de lecture de 68 %.' }] }
  ];
  const msaScanReq = { id: 'r-annexf', clause: 'c-annexf', doc: 'devis', page: 171, sec: 'Annexe F', assess: 'capability', kind: 'gap', title: 'Plan des artères prioritaires numérisé', plain: 'Lecture incomplète (68 %) : les circuits prioritaires doivent être vérifiés à l’œil.', rule: { type: 'confirm', key: 'annexf', unknown: 'Analyse incomplète : ne vous fiez pas aux circuits extraits de ce plan.', done: 'Revue à l’œil par une personne; circuits prioritaires notés.', action: 'Marquer comme revue à l’œil' }, conf: 0.68 };

  const msaNord = {
    id: 'ts-031', ref: 'TP-2026-031', seao: '2026-1187344', family: 'msa-deneigement',
    buyer: 'Ville de Mont-Saint-Aubin', buyerShort: 'Mont-Saint-Aubin', service: 'Service des travaux publics',
    title: 'Déneigement des chaussées et des trottoirs, secteur Nord', term: '3 saisons (2026-2029) et 2 options d’une saison',
    termLong: 'Saisons 2026-2027, 2027-2028 et 2028-2029, avec deux options de renouvellement d’une saison chacune.',
    region: 'Montérégie', distance: 14, trade: 'deneigement', published: '2026-10-14',
    close: '2026-11-05T11:00:00-05:00', opening: '2026-11-05T11:05:00-05:00', questionsDeadline: '2026-10-29T16:00:00-04:00',
    visit: { mandatory: true, at: '2026-10-21T10:00:00-04:00', place: 'au garage municipal du 400, rue des Ateliers' },
    value: { kind: 'estimated', text: 'Non publiée · estimée à partir des cycles 2020 et 2023' },
    reasons: ['Déneigement de voies publiques : votre métier principal', 'À 14 km de votre garage, dans votre rayon de 60 km', 'Vous avez soumissionné ce contrat en 2023 (3e)'],
    pagesTotal: 184, bondRate: 0.05, bondBasis: 'ttc', minMargin: 0.10, seasons: 3,
    experience: { count: 3, trade: 'deneigement', metric: 'km', min: 30, since: '2021-11-05', label: 'contrats de déneigement de voies publiques d’au moins 30 km, terminés depuis le 5 novembre 2021' },
    equipment: [{ cat: 'chargeuse', min: 5 }, { cat: 'souffleuse', min: 2 }, { cat: 'chenillette', min: 4 }, { cat: 'epandeur', min: 3 }],
    declItems: ['Absence de collusion et de communication d’influence', 'Respect de la Loi sur la transparence et l’éthique en matière de lobbyisme', 'Absence de conflit d’intérêts avec un membre du conseil', 'Exactitude des renseignements fournis'],
    articles: msaArticles({ ch: 140.4, tr: 54.6, tp: 114000, ep: 4350, cost: [3380, 1940, 2.46, 17.80, 10600], price: [4020, 2290, 2.95, 21.00, 13500], trNote: '' }).concat([
      { code: 'stationnements', n: 6, label: 'Déneigement de 9 stationnements municipaux', unit: 'site·saison', qty: 0, cost: 1040, price: 1240, ref: 1200, refInternal: true, decimals: 0 }
    ]),
    cycles: [
      { id: 'c2023', ref: 'TP-2023-012', year: 2023, opened: '9 novembre 2023, 11 h 05', cpi: MSA_CPI[2023], composite: 1.084, seasons: 3,
        qtys: { chaussees: 132.3, trottoirs: 51.0, transport: 108000, epandage: 4200, garde: 3 },
        source: 'Procès-verbal d’ouverture des soumissions, SEAO (fictif)', retrieved: 'Récupéré le 23 octobre 2026 à 6 h 04 · analyseur v2.3',
        note: 'Montants avant taxes, tels que lus à l’ouverture publique. Conformité établie par la Ville le 14 novembre 2023.',
        bids: [
          { firm: 'Déneigement Côté-Sud inc.', amount: 978900, status: 'nonconform', why: 'Garantie de soumission absente (§6.3 du devis 2023)' },
          { firm: 'Déneigement Patenaude-Richelieu inc.', amount: 1005477, status: 'winner' },
          { firm: 'Transport Bélair & Fils ltée', amount: 1049800, status: 'conform' },
          { firm: 'Les Entreprises Gaudreau & Fils inc.', amount: 1097650, status: 'conform', you: true },
          { firm: 'Excavation M. Roy et Fils inc.', amount: 1164200, status: 'conform' }
        ] },
      { id: 'c2020', ref: 'TP-2020-008', year: 2020, opened: '12 novembre 2020, 11 h 05', cpi: MSA_CPI[2020], composite: 1.279, seasons: 3,
        qtys: { chaussees: 127.5, trottoirs: 48.3, transport: 102000, epandage: 3900, garde: 3 },
        source: 'Procès-verbal d’ouverture des soumissions, SEAO (fictif)', retrieved: 'Récupéré le 23 octobre 2026 à 6 h 04 · analyseur v2.3',
        note: 'Montants avant taxes. Quantités de 2020 lues dans le devis TP-2020-008.',
        bids: [
          { firm: 'Déneigement Patenaude-Richelieu inc.', amount: 852300, status: 'winner' },
          { firm: 'Transport Bélair & Fils ltée', amount: 879600, status: 'conform' },
          { firm: 'Excavation M. Roy et Fils inc.', amount: 931400, status: 'conform' }
        ] }
    ],
    externalComparable: { buyer: 'Municipalité de Sainte-Odile-sur-Rivière', ref: 'SOR-2025-DN-04', year: 2025, award: 548000, firm: 'Déneigement Patenaude-Richelieu inc.', why: 'Exclu des calculs : 2 saisons au lieu de 3, aucun transport de neige, et seule l’adjudication est publiée. Aucun deuxième prix n’est inventé.' },
    competitors: [
      { firm: 'Déneigement Patenaude-Richelieu inc.', seen: 3, of: 3, wins: 2, note: 'Adjudicataire en 2020 et 2023; également adjudicataire à Sainte-Odile-sur-Rivière en 2025.' },
      { firm: 'Transport Bélair & Fils ltée', seen: 3, of: 3, wins: 0, note: '2e en 2020 et en 2023.' },
      { firm: 'Excavation M. Roy et Fils inc.', seen: 2, of: 3, wins: 0, note: 'Toujours au-dessus de +9 % du gagnant.' },
      { firm: 'Déneigement Côté-Sud inc.', seen: 1, of: 3, wins: 0, note: 'Plus bas prix en 2023, rejeté pour garantie absente.' }
    ],
    coverage: 'Couverture : SEAO 2019-2026 pour cet acheteur (2 cycles avec ouverture publique). Les années 2009-2018 ne sont pas importées dans cette démo.',
    resultFactors: [['Déneigement Patenaude-Richelieu inc.', 1.0560], ['Transport Bélair & Fils ltée', 1.0905], ['Excavation M. Roy et Fils inc.', 1.1120]],
    addenda: [
      { id: 'add1', n: 1, label: 'Addenda n° 1', publishedAt: '2026-10-22T16:40:00-04:00', seeded: true, pages: 2,
        summary: 'Trottoirs 18,2 → 21,4 km par saison; nouvel article 6 (9 stationnements); nouveau bordereau.',
        changes: [{ type: 'qty', code: 'trottoirs', to: 64.2 }, { type: 'qty', code: 'stationnements', to: 27 }],
        pageDefs: [
          { n: 1, blocks: [{ t: 'kicker', x: 'Addenda n° 1 · Appel d’offres TP-2026-031 · 22 octobre 2026' }, { t: 'p', x: 'Le présent addenda fait partie intégrante des documents d’appel d’offres.' }, { t: 'clause', id: 'c-add1-qty', x: '1. Article 2 du bordereau : la longueur des trottoirs à déneiger passe de 18,2 km à 21,4 km par saison, à la suite de l’ajout du secteur des Hauts-Bois. 2. Nouvel article 6 : déneigement de neuf (9) stationnements municipaux, payé à prix unitaire par site et par saison.' }, { t: 'p', x: '3. Réponse à la question n° 2 : la Ville fournit les fondants et les abrasifs de l’article 4.' }] },
          { n: 2, blocks: [{ t: 'clause', id: 'c-add1-sheet', x: '4. Le bordereau de prix joint au présent addenda remplace intégralement l’Annexe B. Toute soumission présentée sur le bordereau original sera jugée non conforme.' }, { t: 'clause', id: 'c-add1-ack', x: '5. ' + CL.ack(1) + ' 6. La date et l’heure limites de réception des soumissions demeurent inchangées.' }] }
        ],
        reqs: [{ id: 'r-sheet', clause: 'c-add1-sheet', doc: 'add1', page: 2, sec: 'art. 4', assess: 'eligibility', kind: 'trap', title: 'Bordereau de l’addenda obligatoire', plain: 'Le bordereau original est périmé : une soumission sur l’ancien formulaire est non conforme.', rule: { type: 'sheet' }, conf: 0.97 }] },
      { id: 'add2', n: 2, label: 'Addenda n° 2', auto: 'precheck', pages: 1,
        summary: 'Article 3 : 38 000 → 41 500 m³ par saison; clôture inchangée.',
        changes: [{ type: 'qty', code: 'transport', to: 124500 }],
        pageDefs: [{ n: 1, blocks: [{ t: 'kicker', x: 'Addenda n° 2 · Appel d’offres TP-2026-031' }, { t: 'clause', id: 'c-add2-qty', x: '1. Article 3 du bordereau : la quantité estimée de neige à charger et à transporter passe de 38 000 m³ à 41 500 m³ par saison, selon la moyenne des trois dernières saisons. Le bordereau joint remplace celui de l’addenda n° 1.' }, { t: 'clause', id: 'c-add2-ack', x: '2. ' + CL.ack(2) + ' 3. La date et l’heure limites de réception des soumissions demeurent inchangées.' }] }]
      }
    ],
    seedState: { addenda: ['add1'] }
  };
  msaNord.pages = msaPages(msaNord, { equipText: 'a) cinq (5) chargeuses sur roues de 150 HP ou plus munies d’une gratte réversible; b) deux (2) souffleuses détachables; c) quatre (4) chenillettes à trottoirs; d) trois (3) camions épandeurs de 10 roues', bordereauV1: 'Article 2 · Déneigement des trottoirs : 18,2 km par saison, 3 saisons, prix unitaire par kilomètre et par saison.', bordereauNote: 'Le présent bordereau a été remplacé par celui de l’addenda n° 1.' });
  msaNord.requirements = msaStdReqs({ visit: 5, equipPlain: '5 chargeuses de 150 HP et plus, 2 souffleuses, 4 chenillettes, 3 épandeurs, en propriété ou en location à long terme.' }).concat([msaScanReq]);

  /* ============ 2. Mont-Saint-Aubin, secteur Sud · déneigement (même gabarit, autre secteur) ============ */
  const msaSud = {
    id: 'ts-034', ref: 'TP-2026-034', seao: '2026-1190218', family: 'msa-deneigement',
    buyer: 'Ville de Mont-Saint-Aubin', buyerShort: 'Mont-Saint-Aubin Sud', service: 'Service des travaux publics',
    title: 'Déneigement des chaussées et des trottoirs, secteur Sud', term: '3 saisons (2026-2029)',
    termLong: 'Saisons 2026-2027, 2027-2028 et 2028-2029.',
    region: 'Montérégie', distance: 19, trade: 'deneigement', published: '2026-10-21',
    close: '2026-11-26T11:00:00-05:00', opening: '2026-11-26T11:05:00-05:00', questionsDeadline: '2026-11-19T16:00:00-05:00',
    visit: { mandatory: true, at: '2026-11-10T10:00:00-05:00', place: 'au garage municipal du 400, rue des Ateliers' },
    value: { kind: 'estimated', text: 'Non publiée · estimée à partir du cycle 2023 du secteur Sud' },
    reasons: ['Même acheteur et même gabarit que le secteur Nord', 'À 19 km de votre garage', 'Visite obligatoire à venir : le 10 novembre'],
    pagesTotal: 162, bondRate: 0.05, bondBasis: 'ttc', minMargin: 0.10, seasons: 3,
    experience: msaNord.experience,
    equipment: [{ cat: 'chargeuse', min: 3 }, { cat: 'souffleuse', min: 1 }, { cat: 'chenillette', min: 3 }, { cat: 'epandeur', min: 2 }],
    declItems: msaNord.declItems,
    articles: msaArticles({ ch: 94.5, tr: 37.8, tp: 72000, ep: 2940, cost: [3420, 1980, 2.50, 18.00, 9800], price: [4050, 2330, 2.98, 21.20, 12900] }),
    cycles: [
      { id: 's2023', ref: 'TP-2023-013', year: 2023, opened: '9 novembre 2023, 11 h 20', cpi: MSA_CPI[2023], composite: 1.084, seasons: 3,
        qtys: { chaussees: 89.4, trottoirs: 35.7, transport: 67500, epandage: 2760, garde: 3 },
        source: 'Procès-verbal d’ouverture des soumissions, SEAO (fictif)', retrieved: 'Récupéré le 23 octobre 2026 à 6 h 04 · analyseur v2.3',
        note: 'Montants avant taxes, secteur Sud, ouvert le même jour que le secteur Nord.',
        bids: [
          { firm: 'Déneigement Patenaude-Richelieu inc.', amount: 702300, status: 'winner' },
          { firm: 'Transport Bélair & Fils ltée', amount: 731900, status: 'conform' },
          { firm: 'Déneigement Côté-Sud inc.', amount: 758400, status: 'conform' },
          { firm: 'Excavation M. Roy et Fils inc.', amount: 790100, status: 'conform' }
        ] }
    ],
    externalComparable: null,
    competitors: [
      { firm: 'Déneigement Patenaude-Richelieu inc.', seen: 1, of: 1, wins: 1, note: 'Titulaire du contrat actuel du secteur Sud.' },
      { firm: 'Transport Bélair & Fils ltée', seen: 1, of: 1, wins: 0, note: '2e en 2023.' },
      { firm: 'Déneigement Côté-Sud inc.', seen: 1, of: 1, wins: 0, note: '3e en 2023.' }
    ],
    coverage: 'Couverture : un cycle d’ouverture pour le secteur Sud. Les résultats que vous enregistrerez pour le secteur Nord s’ajouteront ici comme comparable du même acheteur.',
    resultFactors: [['Déneigement Patenaude-Richelieu inc.', 1.031], ['Transport Bélair & Fils ltée', 1.072], ['Déneigement Côté-Sud inc.', 1.094]],
    addenda: [
      { id: 'add1', n: 1, label: 'Addenda n° 1', pages: 1, summary: 'Réponse aux questions : la visite du 10 novembre est maintenue; trottoirs 12,6 → 13,4 km par saison.',
        changes: [{ type: 'qty', code: 'trottoirs', to: 40.2 }],
        pageDefs: [{ n: 1, blocks: [{ t: 'kicker', x: 'Addenda n° 1 · Appel d’offres TP-2026-034' }, { t: 'clause', id: 'c-add1-qty', x: '1. La visite obligatoire du 10 novembre est maintenue. 2. Article 2 du bordereau : la longueur des trottoirs passe de 12,6 km à 13,4 km par saison.' }, { t: 'clause', id: 'c-add1-ack', x: '3. ' + CL.ack(1) }] }] }
    ],
    seedState: {}
  };
  msaSud.pages = msaPages(msaSud, { equipText: 'a) trois (3) chargeuses sur roues de 150 HP ou plus; b) une (1) souffleuse détachable; c) trois (3) chenillettes à trottoirs; d) deux (2) camions épandeurs de 10 roues', bordereauV1: 'Article 2 · Déneigement des trottoirs : 12,6 km par saison, 3 saisons.', bordereauNote: 'Quantités estimées; les articles 3 et 4 sont payés au mesuré.' }).map((p) => (p.n === 5 ? p : p));
  msaSud.requirements = msaStdReqs({ visit: 5, equipPlain: '3 chargeuses, 1 souffleuse, 3 chenillettes, 2 épandeurs. Si le secteur Nord est aussi adjugé, la capacité doit couvrir les deux contrats.' }).filter((r) => r.id !== 'r-gps').map((r) => (r.id === 'r-penalty' ? Object.assign({}, r, { risk: 'Trois jours de retard par saison coûteraient 22 500 $, une part importante d’une marge sur un contrat plus petit.' }) : r));

  /* ============ 3. CSS des Trois-Cours · entretien ménager (conciergerie) ============ */
  const css = {
    id: 'ts-044', ref: 'CSSTC-2026-07', seao: '2026-1183120', family: 'csstc-entretien',
    buyer: 'Centre de services scolaire des Trois-Cours', buyerShort: 'CSS des Trois-Cours', service: 'Service des ressources matérielles',
    title: 'Entretien ménager de six écoles primaires', term: '2 ans (2027-2028) et 1 option d’un an',
    termLong: 'Du 1er janvier 2027 au 31 décembre 2028, avec une option de renouvellement d’un an.',
    region: 'Montérégie', distance: 22, trade: 'entretien', published: '2026-10-09',
    close: '2026-11-12T14:00:00-05:00', opening: '2026-11-12T14:15:00-05:00', questionsDeadline: '2026-11-04T12:00:00-05:00',
    visit: { mandatory: true, at: '2026-10-28T13:30:00-04:00', place: 'à l’école des Pionniers, 85, rue Saint-Louis' },
    value: { kind: 'published', amount: 1150000, text: 'Estimation publiée par le donneur d’ouvrage (2 ans)' },
    reasons: ['Entretien de bâtiments publics : votre division Gaudreau Entretien', 'Client actuel (4 écoles, 2023-2025)', 'Visite obligatoire le 28 octobre'],
    pagesTotal: 96, bondRate: 0, bondBasis: 'ht', minMargin: 0.08, seasons: 2,
    experience: { count: 2, trade: 'entretien', metric: 'm2', min: 5000, since: '2023-11-12', label: 'contrats d’entretien ménager de bâtiments publics d’au moins 5 000 m², exécutés depuis le 12 novembre 2023' },
    equipment: [{ cat: 'autolaveuse', min: 4 }],
    declItems: ['Absence de collusion et de communication d’influence', 'Exactitude des renseignements fournis', 'Vérification des antécédents judiciaires de tout le personnel affecté aux écoles', 'Respect des horaires hors présence des élèves'],
    articles: [
      { code: 'regulier', n: 1, label: 'Entretien ménager régulier des 6 écoles (41 200 m²)', unit: 'mois', qty: 24, cost: 34100, price: 38900, ref: 33900, decimals: 0 },
      { code: 'planchers', n: 2, label: 'Décapage et cirage des planchers (2 fois par an)', unit: 'intervention', qty: 4, cost: 15600, price: 18400, ref: 16900, refInternal: true, decimals: 0 },
      { code: 'vitres', n: 3, label: 'Lavage des vitres intérieures et extérieures (2 fois par an)', unit: 'intervention', qty: 4, cost: 5100, price: 6200, ref: 5800, refInternal: true, decimals: 0 },
      { code: 'appels', n: 4, label: 'Interventions sur appel', unit: 'h', qty: 600, cost: 37.50, price: 46.00, ref: 44.00, refInternal: true, decimals: 0, measured: true }
    ],
    cycles: [
      { id: 'e2022', ref: 'CSSTC-2022-04', year: 2022, opened: '17 novembre 2022, 14 h 15', cpi: 151.2, composite: 1.16, seasons: 2,
        qtys: { regulier: 24, planchers: 4, vitres: 4, appels: 500 }, scopeNote: '5 écoles, 33 800 m²',
        qtyScale: { regulier: 33800 / 41200 },
        source: 'Résolution d’adjudication du conseil, publiée sur SEAO (fictif)', retrieved: 'Récupéré le 23 octobre 2026 à 6 h 04',
        note: 'Seule l’adjudication est publiée : les autres soumissions de 2022 ne figurent pas dans la couverture.',
        award: { firm: 'Services d’entretien Boréal-Net inc.', amount: 842000 } }
    ],
    externalComparable: { buyer: 'Municipalité de Sainte-Odile-sur-Rivière', ref: 'SOR-2024-EM-02', year: 2024, award: 286400, firm: 'Entretien Clair-Net inc.', why: 'Exclu des calculs : 3 bâtiments municipaux, horaires de jour, autre acheteur. Montant d’adjudication seulement.' },
    competitors: [
      { firm: 'Services d’entretien Boréal-Net inc.', seen: 1, of: 1, wins: 1, note: 'Titulaire du contrat 2023-2024 (adjudication seulement).' }
    ],
    coverage: 'Couverture limitée : une adjudication pour cet acheteur, aucune soumission perdante publiée. TenderStrike n’invente pas de classement.',
    resultFactors: [['Services d’entretien Boréal-Net inc.', 1.012], ['Entretien Clair-Net inc.', 1.064], ['Maintenance Rive-Sud inc.', 1.118]],
    addenda: [
      { id: 'add1', n: 1, label: 'Addenda n° 1', pages: 1, summary: 'Ajout de l’école Sainte-Marguerite (4 100 m²) à compter de 2028; clôture inchangée.',
        changes: [{ type: 'qty', code: 'regulier', to: 24 }, { type: 'priceNote', text: 'École ajoutée en 2028 : prix mensuel à revoir.' }],
        pageDefs: [{ n: 1, blocks: [{ t: 'kicker', x: 'Addenda n° 1 · CSSTC-2026-07' }, { t: 'clause', id: 'c-add1-qty', x: '1. L’école Sainte-Marguerite (4 100 m²) s’ajoute au contrat à compter du 1er janvier 2028. Le prix mensuel de l’article 1 inclut cet ajout.' }, { t: 'clause', id: 'c-add1-ack', x: '2. ' + CL.ack(1) }] }] }
    ],
    seedState: { xrayOpened: true, decision: { choice: 'proceed', reason: 'Client actuel; personnel disponible; visite à faire le 28 octobre.', owner: 'josee', review: '2026-10-29', at: '2026-10-21T15:10:00-04:00', by: 'sylvie' }, verified: {} }
  };
  css.pages = [
    CL.cover(css, [['Responsable', 'Mme Karine Dubé, ressources matérielles']]),
    { doc: 'devis', n: 4, blocks: [{ t: 'h', x: 'Section 1 · Instructions aux soumissionnaires' }, { t: 'clause', id: 'c-visit', x: '1.5 Visite obligatoire. Une visite des six écoles débute le ' + when(css.visit.at) + ', ' + css.visit.place + '. Le soumissionnaire qui n’y assiste pas ne peut pas déposer de soumission conforme; une attestation de présence est remise sur place.' }, { t: 'clause', id: 'c-questions', x: '1.7 ' + CL.questions(css.questionsDeadline) }] },
    { doc: 'devis', n: 6, blocks: [{ t: 'clause', id: 'c-seao', x: '1.9 ' + CL.seao }, { t: 'clause', id: 'c-award', x: '1.14 ' + CL.lowest('avant taxes, pour les deux années du contrat') }] },
    { doc: 'devis', n: 9, blocks: [{ t: 'h', x: 'Section 2 · Admissibilité' }, { t: 'clause', id: 'c-arq', x: '2.2 ' + CL.arq }, { t: 'clause', id: 'c-cnesst', x: '2.3 ' + CL.cnesst }, { t: 'clause', id: 'c-rena', x: '2.4 ' + CL.rena }, { t: 'clause', id: 'c-noamp', x: '2.5 Compte tenu de sa valeur, le présent contrat n’exige pas d’autorisation de contracter de l’Autorité des marchés publics.' }] },
    { doc: 'devis', n: 12, blocks: [{ t: 'h', x: 'Section 3 · Expérience et personnel' }, { t: 'clause', id: 'c-exp', x: '3.1 Le soumissionnaire démontre l’exécution d’au moins deux (2) contrats d’entretien ménager de bâtiments publics d’une superficie d’au moins 5 000 m² chacun au cours des trois (3) années précédant la clôture.' }, { t: 'clause', id: 'c-bg', x: '3.4 Antécédents judiciaires. Tout membre du personnel affecté aux écoles fait l’objet d’une vérification des antécédents judiciaires avant son affectation. Le soumissionnaire signe la déclaration de l’Annexe F.' }] },
    { doc: 'devis', n: 15, blocks: [{ t: 'h', x: 'Section 4 · Exécution' }, { t: 'clause', id: 'c-hours', x: '4.2 Les travaux sont exécutés de 16 h à 23 h, du lundi au vendredi, hors de la présence des élèves. Les autolaveuses (au moins quatre) sont fournies par l’entrepreneur.' }, { t: 'clause', id: 'c-eco', x: '4.6 Les produits utilisés sont certifiés ÉcoLogo ou équivalent; leur fiche est remise au donneur d’ouvrage avant le début du contrat.' }] },
    { doc: 'devis', n: 21, blocks: [{ t: 'h', x: 'Section 6 · Garanties et assurances' }, { t: 'clause', id: 'c-nobond', x: '6.1 Aucune garantie de soumission n’est exigée. L’adjudicataire fournit une garantie d’exécution de dix pour cent (10 %) dans les quinze (15) jours suivant l’adjudication.' }, { t: 'clause', id: 'c-insurance', x: '6.3 ' + CL.insurance(2000000) }] },
    { doc: 'devis', n: 24, blocks: [{ t: 'h', x: 'Section 7 · Contrôle de la qualité' }, { t: 'clause', id: 'c-penalty', x: '7.2 Une inspection mensuelle est réalisée dans chaque école. Une retenue de deux cent cinquante dollars (250 $) est appliquée par local jugé non conforme et non corrigé dans les 24 heures.' }] },
    { doc: 'devis', n: 27, blocks: [{ t: 'h', x: 'Section 8 · Prix' }, { t: 'clause', id: 'c-ipc', x: '8.1 Les prix forfaitaires mensuels sont ajustés au 1er janvier 2028 selon la variation de l’IPC (Québec), plafonnée à 3 %.' }] }
  ];
  css.requirements = [
    { id: 'r-visit', clause: 'c-visit', doc: 'devis', page: 4, sec: '§1.5', assess: 'eligibility', kind: 'trap', title: 'Visite obligatoire des écoles', plain: 'Sans attestation de présence, aucune soumission conforme n’est possible.', rule: { type: 'visit' }, conf: 0.97 },
    { id: 'r-arq', clause: 'c-arq', doc: 'devis', page: 9, sec: '§2.2', assess: 'eligibility', kind: 'trap', title: 'Attestation de Revenu Québec valide à la clôture', plain: 'Validité exigée le 12 novembre à 14 h 00.', rule: { type: 'vault', kind: 'arq' }, conf: 0.96 },
    { id: 'r-cnesst', clause: 'c-cnesst', doc: 'devis', page: 9, sec: '§2.3', assess: 'eligibility', kind: 'req', title: 'Attestation de conformité CNESST', plain: 'Valide à la clôture.', rule: { type: 'vault', kind: 'cnesst' }, conf: 0.95 },
    { id: 'r-rena', clause: 'c-rena', doc: 'devis', page: 9, sec: '§2.4', assess: 'eligibility', kind: 'req', title: 'Absence d’inscription au RENA', plain: 'Vérification au registre.', rule: { type: 'rena' }, conf: 0.97 },
    { id: 'r-noamp', clause: 'c-noamp', doc: 'devis', page: 9, sec: '§2.5', assess: 'info', kind: 'info', title: 'Pas d’autorisation de l’AMP exigée', plain: 'Le devis l’exclut explicitement : TenderStrike ne l’impose pas.', conf: 0.94 },
    { id: 'r-exp', clause: 'c-exp', doc: 'devis', page: 12, sec: '§3.1', assess: 'eligibility', kind: 'trap', title: 'Deux contrats de 5 000 m² ou plus en 3 ans', plain: 'Deux références distinctes de bâtiments publics, depuis le 12 novembre 2023.', rule: { type: 'experience' }, conf: 0.92 },
    { id: 'r-bg', clause: 'c-bg', doc: 'devis', page: 12, sec: '§3.4', assess: 'eligibility', kind: 'req', title: 'Antécédents judiciaires du personnel', plain: 'Vérifications au dossier et déclaration de l’Annexe F signée.', rule: { type: 'vault', kind: 'background' }, conf: 0.93 },
    { id: 'r-hours', clause: 'c-hours', doc: 'devis', page: 15, sec: '§4.2', assess: 'capability', kind: 'req', title: 'Travaux de 16 h à 23 h et 4 autolaveuses', plain: 'Équipe du soir et équipement à démontrer.', rule: { type: 'equipment' }, conf: 0.9 },
    { id: 'r-insurance', clause: 'c-insurance', doc: 'devis', page: 21, sec: '§6.3', assess: 'eligibility', kind: 'req', title: 'Assurance responsabilité civile de 2 M$', plain: 'Votre certificat de 5 M$ couvre l’exigence.', rule: { type: 'insurance', min: 2000000 }, conf: 0.95 },
    { id: 'r-nobond', clause: 'c-nobond', doc: 'devis', page: 21, sec: '§6.1', assess: 'info', kind: 'info', title: 'Aucune garantie de soumission', plain: 'Seule une garantie d’exécution de 10 % est exigée après l’adjudication.', conf: 0.96 },
    { id: 'r-penalty', clause: 'c-penalty', doc: 'devis', page: 24, sec: '§7.2', assess: 'commercial', kind: 'pill', title: 'Retenue de 250 $ par local non conforme', plain: 'Inspection mensuelle dans chaque école.', risk: 'Huit locaux non corrigés par mois représenteraient 48 000 $ sur deux ans.', conf: 0.95 },
    { id: 'r-eco', clause: 'c-eco', doc: 'devis', page: 15, sec: '§4.6', assess: 'commercial', kind: 'pill', title: 'Produits certifiés ÉcoLogo', plain: 'Coût des produits plus élevé d’environ 8 %.', risk: 'Déjà inclus dans votre coût interne de l’article 1.', conf: 0.9 },
    { id: 'r-ipc', clause: 'c-ipc', doc: 'devis', page: 27, sec: '§8.1', assess: 'info', kind: 'info', title: 'Indexation IPC plafonnée à 3 % en 2028', plain: 'Le risque d’inflation est partagé pour la deuxième année.', conf: 0.95 },
    { id: 'r-seao', clause: 'c-seao', doc: 'devis', page: 6, sec: '§1.9', assess: 'info', kind: 'info', title: 'Dépôt sur SEAO seulement', plain: 'PDF de 25 Mo au plus.', conf: 0.97 },
    { id: 'r-questions', clause: 'c-questions', doc: 'devis', page: 4, sec: '§1.7', assess: 'info', kind: 'info', title: 'Questions avant la date limite', plain: 'Réponses publiées en addenda.', conf: 0.96 }
  ];

  /* ============ 4. Sainte-Odile-sur-Rivière · pavage et réfection ============ */
  const sor = {
    id: 'ts-047', ref: 'SOR-2026-TP-11', seao: '2026-1188402', family: 'sor-pavage',
    buyer: 'Municipalité de Sainte-Odile-sur-Rivière', buyerShort: 'Sainte-Odile-sur-Rivière', service: 'Service du génie',
    title: 'Réfection et pavage des rues Principale et du Moulin', term: 'Travaux de mai à août 2027',
    termLong: 'Travaux exécutés entre le 3 mai et le 27 août 2027.',
    region: 'Montérégie', distance: 31, trade: 'pavage', published: '2026-10-22',
    close: '2026-11-19T11:00:00-05:00', opening: '2026-11-19T11:05:00-05:00', questionsDeadline: '2026-11-12T16:00:00-05:00',
    visit: { mandatory: false, at: '2026-11-04T09:00:00-05:00', place: 'à l’hôtel de ville' },
    value: { kind: 'unavailable', text: 'Indisponible : aucun montant publié; historique 2025 disponible après lecture du devis' },
    reasons: ['Pavage et réfection : votre division estivale', 'Client actuel (chemins municipaux)', 'Licence RBQ 1.4 au coffre-fort'],
    acquisition: true, pagesTotal: 128, bondRate: 0.10, bondBasis: 'ttc', minMargin: 0.10, seasons: 1,
    experience: { count: 3, trade: 'pavage', metric: 'value', min: 500000, since: '2021-11-19', label: 'contrats de pavage ou de réfection de chaussée d’au moins 500 000 $, terminés depuis le 19 novembre 2021' },
    equipment: [{ cat: 'finisseur', min: 1 }, { cat: 'rouleau', min: 2 }],
    declItems: ['Absence de collusion et de communication d’influence', 'Respect de la Loi sur la transparence et l’éthique en matière de lobbyisme', 'Exactitude des renseignements fournis'],
    articles: [
      { code: 'planage', n: 1, label: 'Planage de la chaussée existante', unit: 'm²', qty: 18400, cost: 3.40, price: 4.10, ref: 3.70, decimals: 0, measured: true },
      { code: 'esg10', n: 2, label: 'Enrobé bitumineux ESG-10, couche de surface', unit: 't', qty: 2950, cost: 109.00, price: 128.00, ref: 118.00, decimals: 0, measured: true },
      { code: 'esg14', n: 3, label: 'Enrobé bitumineux ESG-14, couche de base', unit: 't', qty: 3400, cost: 101.50, price: 119.00, ref: 109.00, decimals: 0, measured: true },
      { code: 'bordures', n: 4, label: 'Réfection de bordures de béton', unit: 'm', qty: 1240, cost: 76.00, price: 92.00, ref: 84.00, decimals: 0, measured: true },
      { code: 'regards', n: 5, label: 'Ajustement de regards et de puisards', unit: 'unité', qty: 86, cost: 520, price: 640, ref: 590, decimals: 0 },
      { code: 'signalisation', n: 6, label: 'Signalisation et maintien de la circulation', unit: 'forfait', qty: 1, cost: 39500, price: 48000, ref: 42000, decimals: 0 }
    ],
    cycles: [
      { id: 'p2025', ref: 'SOR-2025-TP-07', year: 2025, opened: '13 novembre 2025, 11 h 05', cpi: 164.2, composite: 1.041, seasons: 1,
        qtys: { planage: 12600, esg10: 2080, esg14: 2300, bordures: 880, regards: 60, signalisation: 1 },
        source: 'Procès-verbal d’ouverture des soumissions, SEAO (fictif)', retrieved: 'Récupéré le 23 octobre 2026 à 6 h 04 · analyseur v2.3',
        note: 'Pavage du rang Saint-Joseph et de la rue de l’Église. Montants avant taxes.',
        bids: [
          { firm: 'Pavages R.L. inc.', amount: 689900, status: 'nonconform', why: 'Licence RBQ 1.4 non détenue à la date du dépôt' },
          { firm: 'Pavage Montérégie-Est inc.', amount: 702400, status: 'winner' },
          { firm: 'Construction Bérubé & Frères inc.', amount: 731800, status: 'conform' },
          { firm: 'Les Entreprises Gaudreau & Fils inc.', amount: 748900, status: 'conform', you: true },
          { firm: 'Asphalte Richelieu ltée', amount: 776300, status: 'conform' }
        ] }
    ],
    externalComparable: { buyer: 'Ville de Pointe-aux-Saules', ref: 'PAS-2024-TP-03', year: 2024, award: 742000, firm: 'Les Entreprises Gaudreau & Fils inc.', why: 'Exclu des calculs : autre acheteur et autre portée (rue des Érables, avec aqueduc). C’est votre propre contrat de référence.' },
    competitors: [
      { firm: 'Pavage Montérégie-Est inc.', seen: 1, of: 1, wins: 1, note: 'Adjudicataire en 2025.' },
      { firm: 'Construction Bérubé & Frères inc.', seen: 1, of: 1, wins: 0, note: '2e en 2025, à +4,2 %.' },
      { firm: 'Pavages R.L. inc.', seen: 1, of: 1, wins: 0, note: 'Plus bas prix en 2025, rejeté : licence RBQ 1.4 absente.' }
    ],
    coverage: 'Couverture : un cycle d’ouverture pour cet acheteur (2025). Le contrat de Pointe-aux-Saules sert seulement de repère qualitatif.',
    resultFactors: [['Pavage Montérégie-Est inc.', 1.024], ['Construction Bérubé & Frères inc.', 1.061], ['Asphalte Richelieu ltée', 1.097]],
    addenda: [
      { id: 'add1', n: 1, label: 'Addenda n° 1', pages: 1, summary: 'Clôture reportée au 26 novembre, 11 h 00; ESG-10 : 2 950 → 3 180 t.',
        changes: [{ type: 'close', to: '2026-11-26T11:00:00-05:00', opening: '2026-11-26T11:05:00-05:00' }, { type: 'qty', code: 'esg10', to: 3180 }],
        pageDefs: [{ n: 1, blocks: [{ t: 'kicker', x: 'Addenda n° 1 · SOR-2026-TP-11' }, { t: 'clause', id: 'c-add1-qty', x: '1. La date et l’heure limites de réception des soumissions sont reportées au jeudi 26 novembre 2026, 11 h 00. 2. Article 2 du bordereau : la quantité d’enrobé ESG-10 passe de 2 950 t à 3 180 t.' }, { t: 'clause', id: 'c-add1-ack', x: '3. ' + CL.ack(1) }] }] }
    ],
    seedState: {}
  };
  sor.pages = [
    CL.cover(sor, [['Responsable', 'M. Éric Lavallée, ing., directeur du génie']]),
    { doc: 'devis', n: 5, blocks: [{ t: 'h', x: 'Section 1 · Instructions' }, { t: 'clause', id: 'c-visit', x: '1.4 Une visite facultative des lieux a lieu le ' + when(sor.visit.at) + ', au départ de l’hôtel de ville. Aucune attestation n’est exigée.' }, { t: 'clause', id: 'c-questions', x: '1.6 ' + CL.questions(sor.questionsDeadline) }, { t: 'clause', id: 'c-seao', x: '1.8 ' + CL.seao }] },
    { doc: 'devis', n: 9, blocks: [{ t: 'clause', id: 'c-award', x: '1.13 ' + CL.lowest('toutes taxes incluses, établi selon les quantités estimées du bordereau') }] },
    { doc: 'devis', n: 12, blocks: [{ t: 'h', x: 'Section 2 · Admissibilité' }, { t: 'clause', id: 'c-rbq', x: '2.2 Le soumissionnaire détient, à la date du dépôt, une licence d’entrepreneur de la Régie du bâtiment du Québec comportant la sous-catégorie 1.4 (routes et canalisation). Une soumission d’un entrepreneur ne détenant pas cette sous-catégorie est rejetée.' }, { t: 'clause', id: 'c-arq', x: '2.3 ' + CL.arq }, { t: 'clause', id: 'c-cnesst', x: '2.4 ' + CL.cnesst }, { t: 'clause', id: 'c-rena', x: '2.5 ' + CL.rena }] },
    { doc: 'devis', n: 15, blocks: [{ t: 'h', x: 'Section 3 · Expérience' }, { t: 'clause', id: 'c-exp', x: '3.1 Le soumissionnaire démontre avoir réalisé, au cours des cinq (5) dernières années, au moins trois (3) contrats de pavage ou de réfection de chaussée d’une valeur d’au moins cinq cent mille dollars (500 000 $) chacun, avant taxes.' }] },
    { doc: 'devis', n: 22, blocks: [{ t: 'h', x: 'Section 5 · Garanties' }, { t: 'clause', id: 'c-bond', x: '5.1 ' + CL.bond(0.10, 'ttc') }, { t: 'clause', id: 'c-perf', x: '5.3 L’adjudicataire fournit une garantie d’exécution de 50 % et une garantie des obligations pour gages, matériaux et services de 50 % du prix du contrat.' }, { t: 'clause', id: 'c-insurance', x: '5.6 ' + CL.insurance(2000000) }] },
    { doc: 'devis', n: 31, blocks: [{ t: 'h', x: 'Section 7 · Délais et pénalités' }, { t: 'clause', id: 'c-penalty', x: '7.2 Les travaux sont terminés au plus tard le 27 août 2027. Une pénalité de mille dollars (1 000 $) par jour de retard est appliquée, jusqu’à concurrence de 10 % du prix du contrat.' }] },
    { doc: 'devis', n: 34, blocks: [{ t: 'h', x: 'Section 8 · Prix et paiement' }, { t: 'clause', id: 'c-bitume', x: '8.3 Le prix du bitume est ajusté selon la variation de l’indice mensuel du prix du bitume publié par le ministère des Transports, entre le mois de l’ouverture et le mois de la pose.' }, { t: 'clause', id: 'c-measured', x: '8.4 Les articles 1 à 4 sont payés selon les quantités réellement mesurées par le laboratoire mandaté par la Municipalité.' }] }
  ];
  sor.requirements = [
    { id: 'r-rbq', clause: 'c-rbq', doc: 'devis', page: 12, sec: '§2.2', assess: 'eligibility', kind: 'trap', title: 'Licence RBQ, sous-catégorie 1.4', plain: 'En 2025, la plus basse soumission a été rejetée pour ce motif.', rule: { type: 'rbq', cats: ['1.4'] }, conf: 0.97 },
    { id: 'r-arq', clause: 'c-arq', doc: 'devis', page: 12, sec: '§2.3', assess: 'eligibility', kind: 'trap', title: 'Attestation de Revenu Québec valide à la clôture', plain: 'Validité exigée le jour de la clôture.', rule: { type: 'vault', kind: 'arq' }, conf: 0.96 },
    { id: 'r-cnesst', clause: 'c-cnesst', doc: 'devis', page: 12, sec: '§2.4', assess: 'eligibility', kind: 'req', title: 'Attestation de conformité CNESST', plain: 'Valide à la clôture.', rule: { type: 'vault', kind: 'cnesst' }, conf: 0.95 },
    { id: 'r-rena', clause: 'c-rena', doc: 'devis', page: 12, sec: '§2.5', assess: 'eligibility', kind: 'req', title: 'Absence d’inscription au RENA', plain: 'Vérification au registre.', rule: { type: 'rena' }, conf: 0.97 },
    { id: 'r-exp', clause: 'c-exp', doc: 'devis', page: 15, sec: '§3.1', assess: 'eligibility', kind: 'trap', title: 'Trois contrats de pavage de 500 000 $ ou plus', plain: 'Trois références distinctes en 5 ans; un projet trop petit ou trop ancien ne compte pas.', rule: { type: 'experience' }, conf: 0.93 },
    { id: 'r-bond', clause: 'c-bond', doc: 'devis', page: 22, sec: '§5.1', assess: 'eligibility', kind: 'trap', title: 'Garantie de soumission de 10 % TTC', plain: 'Montant calculé sur le total taxes incluses.', rule: { type: 'bond' }, conf: 0.97 },
    { id: 'r-perf', clause: 'c-perf', doc: 'devis', page: 22, sec: '§5.3', assess: 'commercial', kind: 'req', title: 'Garanties d’exécution et de paiement de 50 %', plain: 'Vérifiées contre votre capacité de cautionnement.', rule: { type: 'perf', rate: 1.0 }, conf: 0.95 },
    { id: 'r-insurance', clause: 'c-insurance', doc: 'devis', page: 22, sec: '§5.6', assess: 'eligibility', kind: 'req', title: 'Assurance responsabilité civile de 2 M$', plain: 'Couverte par votre certificat de 5 M$.', rule: { type: 'insurance', min: 2000000 }, conf: 0.95 },
    { id: 'r-equip', clause: 'c-exp', doc: 'devis', page: 15, sec: '§3.1', assess: 'capability', kind: 'req', title: 'Finisseur d’asphalte et rouleaux', plain: 'Un finisseur et deux rouleaux disponibles de mai à août.', rule: { type: 'equipment' }, conf: 0.85 },
    { id: 'r-penalty', clause: 'c-penalty', doc: 'devis', page: 31, sec: '§7.2', assess: 'commercial', kind: 'pill', title: 'Pénalité de 1 000 $ par jour après le 27 août 2027', plain: 'Plafonnée à 10 % du prix du contrat.', risk: 'Une semaine de retard coûterait 7 000 $, environ 4 % de la marge visée.', conf: 0.96 },
    { id: 'r-bitume', clause: 'c-bitume', doc: 'devis', page: 34, sec: '§8.3', assess: 'info', kind: 'info', title: 'Prix du bitume ajusté selon l’indice', plain: 'Le risque sur le bitume est partagé : une bonne nouvelle pour la marge.', conf: 0.94 },
    { id: 'r-visit', clause: 'c-visit', doc: 'devis', page: 5, sec: '§1.4', assess: 'info', kind: 'info', title: 'Visite facultative le 4 novembre', plain: 'Aucune attestation exigée.', conf: 0.96 },
    { id: 'r-questions', clause: 'c-questions', doc: 'devis', page: 5, sec: '§1.6', assess: 'info', kind: 'info', title: 'Questions avant la date limite', plain: 'Réponses publiées en addenda.', conf: 0.96 },
    { id: 'r-award', clause: 'c-award', doc: 'devis', page: 9, sec: '§1.13', assess: 'info', kind: 'info', title: 'Plus bas soumissionnaire conforme', plain: 'Total taxes incluses selon les quantités estimées.', conf: 0.97 }
  ];

  /* ============ 5. Lac-aux-Hérons · déneigement de bâtiments (déposé) ============ */
  const lah = {
    id: 'ts-052', ref: 'LAH-2026-11', seao: '2026-1179015', family: 'lah-batiments',
    buyer: 'Ville de Lac-aux-Hérons', buyerShort: 'Lac-aux-Hérons', service: 'Service des travaux publics',
    title: 'Déneigement des bâtiments et stationnements municipaux', term: '3 saisons (2026-2029)',
    termLong: 'Saisons 2026-2027 à 2028-2029.', region: 'Montérégie', distance: 27, trade: 'deneigement', published: '2026-10-02',
    close: '2026-10-27T11:00:00-04:00', opening: '2026-10-27T11:05:00-04:00', questionsDeadline: '2026-10-20T12:00:00-04:00',
    visit: null,
    value: { kind: 'published', amount: 214000, text: 'Estimation publiée par le donneur d’ouvrage' },
    reasons: ['Client actuel (secteur Centre 2023-2026)', 'Soumission déposée le 20 octobre', 'Ouverture publique le 27 octobre'],
    pagesTotal: 64, bondRate: 0.05, bondBasis: 'ttc', minMargin: 0.10, seasons: 3,
    experience: { count: 2, trade: 'deneigement', metric: 'km', min: 0, since: '2021-10-27', label: 'contrats de déneigement municipal exécutés depuis le 27 octobre 2021' },
    equipment: [{ cat: 'chargeuse', min: 2 }],
    declItems: ['Absence de collusion et de communication d’influence', 'Exactitude des renseignements fournis'],
    articles: [
      { code: 'stat', n: 1, label: 'Déneigement de 15 stationnements municipaux', unit: 'site·saison', qty: 45, cost: 1390, price: 1680, ref: 1560, decimals: 0 },
      { code: 'bat', n: 2, label: 'Accès et trottoirs de 9 bâtiments', unit: 'bâtiment·saison', qty: 27, cost: 2040, price: 2450, ref: 2280, decimals: 0 },
      { code: 'epandage', n: 3, label: 'Épandage d’abrasifs', unit: 't', qty: 450, cost: 19.50, price: 24.00, ref: 22.50, decimals: 0, measured: true },
      { code: 'garde', n: 4, label: 'Garde et disponibilité', unit: 'saison', qty: 3, cost: 10900, price: 13000, ref: 12000, decimals: 0 }
    ],
    cycles: [
      { id: 'l2023', ref: 'LAH-2023-09', year: 2023, opened: '25 octobre 2023, 11 h 05', cpi: 158.9, composite: 1.084, seasons: 3,
        qtys: { stat: 39, bat: 24, epandage: 390, garde: 3 },
        source: 'Procès-verbal d’ouverture des soumissions, SEAO (fictif)', retrieved: 'Récupéré le 23 octobre 2026 à 6 h 04',
        note: 'Contrat 2023-2026 : vous en êtes l’adjudicataire.',
        bids: [
          { firm: 'Les Entreprises Gaudreau & Fils inc.', amount: 168900, status: 'winner', you: true },
          { firm: 'Déneigement Côté-Sud inc.', amount: 176400, status: 'conform' },
          { firm: 'Transport Bélair & Fils ltée', amount: 181200, status: 'conform' }
        ] }
    ],
    externalComparable: null,
    competitors: [
      { firm: 'Déneigement Côté-Sud inc.', seen: 1, of: 1, wins: 0, note: '2e en 2023, à +4,4 %.' },
      { firm: 'Transport Bélair & Fils ltée', seen: 1, of: 1, wins: 0, note: '3e en 2023.' }
    ],
    coverage: 'Couverture : un cycle d’ouverture (2023), que vous aviez remporté.',
    resultFactors: [['Déneigement Côté-Sud inc.', 1.062], ['Déneigement Patenaude-Richelieu inc.', 1.098], ['Transport Bélair & Fils ltée', 1.121]],
    addenda: [],
    seedState: {
      xrayOpened: true,
      decision: { choice: 'proceed', reason: 'Renouvellement d’un contrat que vous exécutez.', owner: 'sylvie', review: '2026-10-16', at: '2026-10-08T09:20:00-04:00', by: 'sylvie' },
      priceApprovalSeed: '2026-10-19T16:00:00-04:00', bond: { status: 'issued', cap: 12000, issuedAt: '2026-10-16T10:00:00-04:00' },
      declSigned: { at: '2026-10-20T14:40:00-04:00', by: 'sylvie' }, decl: { d1: true, d2: true }, packageSeed: '2026-10-20T14:55:00-04:00',
      receipt: { number: 'Reçu SEAO fictif LAH-11-0042', when: '2026-10-20T15:12:00-04:00' }, allVerified: true
    }
  };
  lah.pages = [
    CL.cover(lah, [['Responsable', 'Mme Nadia Ouellet, travaux publics']]),
    { doc: 'devis', n: 4, blocks: [{ t: 'h', x: 'Section 1 · Instructions' }, { t: 'clause', id: 'c-seao', x: '1.6 ' + CL.seao }, { t: 'clause', id: 'c-award', x: '1.10 ' + CL.lowest() }] },
    { doc: 'devis', n: 8, blocks: [{ t: 'h', x: 'Section 2 · Admissibilité' }, { t: 'clause', id: 'c-arq', x: '2.1 ' + CL.arq }, { t: 'clause', id: 'c-cnesst', x: '2.2 ' + CL.cnesst }, { t: 'clause', id: 'c-exp', x: '2.4 Le soumissionnaire démontre l’exécution d’au moins deux (2) contrats de déneigement municipal au cours des cinq (5) dernières années.' }] },
    { doc: 'devis', n: 14, blocks: [{ t: 'h', x: 'Section 5 · Garanties' }, { t: 'clause', id: 'c-bond', x: '5.1 ' + CL.bond(0.05, 'ttc') }, { t: 'clause', id: 'c-insurance', x: '5.4 ' + CL.insurance(2000000) }] },
    { doc: 'devis', n: 19, blocks: [{ t: 'h', x: 'Section 7 · Exécution' }, { t: 'clause', id: 'c-delay', x: '7.1 Les accès des bâtiments sont dégagés avant 7 h 00 les jours ouvrables. Une retenue de 300 $ s’applique par accès non dégagé.' }] }
  ];
  lah.requirements = [
    { id: 'r-arq', clause: 'c-arq', doc: 'devis', page: 8, sec: '§2.1', assess: 'eligibility', kind: 'trap', title: 'Attestation de Revenu Québec valide à la clôture', plain: 'Clôture le 27 octobre : votre attestation actuelle la couvre.', rule: { type: 'vault', kind: 'arq' }, conf: 0.96 },
    { id: 'r-cnesst', clause: 'c-cnesst', doc: 'devis', page: 8, sec: '§2.2', assess: 'eligibility', kind: 'req', title: 'Attestation de conformité CNESST', plain: 'Valide à la clôture.', rule: { type: 'vault', kind: 'cnesst' }, conf: 0.95 },
    { id: 'r-exp', clause: 'c-exp', doc: 'devis', page: 8, sec: '§2.4', assess: 'eligibility', kind: 'req', title: 'Deux contrats de déneigement municipal en 5 ans', plain: 'Deux références distinctes.', rule: { type: 'experience' }, conf: 0.94 },
    { id: 'r-bond', clause: 'c-bond', doc: 'devis', page: 14, sec: '§5.1', assess: 'eligibility', kind: 'trap', title: 'Garantie de soumission de 5 % TTC', plain: 'Lettre du courtier au dossier.', rule: { type: 'bond' }, conf: 0.97 },
    { id: 'r-insurance', clause: 'c-insurance', doc: 'devis', page: 14, sec: '§5.4', assess: 'eligibility', kind: 'req', title: 'Assurance responsabilité civile de 2 M$', plain: 'Couverte.', rule: { type: 'insurance', min: 2000000 }, conf: 0.95 },
    { id: 'r-delay', clause: 'c-delay', doc: 'devis', page: 19, sec: '§7.1', assess: 'commercial', kind: 'pill', title: 'Accès dégagés avant 7 h 00', plain: 'Retenue de 300 $ par accès non dégagé.', risk: 'Équipe de nuit existante : risque connu, déjà exécuté depuis 2023.', conf: 0.95 },
    { id: 'r-seao', clause: 'c-seao', doc: 'devis', page: 4, sec: '§1.6', assess: 'info', kind: 'info', title: 'Dépôt sur SEAO seulement', plain: 'PDF de 25 Mo au plus.', conf: 0.97 }
  ];

  /* ============ 6. Pointe-aux-Saules · entretien CVC (métier non couvert) ============ */
  const pas = {
    id: 'ts-039', ref: 'PAS-2026-CVC-02', seao: '2026-1186071', family: 'pas-cvc',
    buyer: 'Ville de Pointe-aux-Saules', buyerShort: 'Pointe-aux-Saules', service: 'Service des immeubles',
    title: 'Entretien préventif des systèmes CVC de l’aréna et de la bibliothèque', term: '2 ans (2027-2028)',
    termLong: 'Du 1er janvier 2027 au 31 décembre 2028.', region: 'Montérégie', distance: 19, trade: 'cvc', published: '2026-10-19',
    close: '2026-11-10T11:00:00-05:00', opening: '2026-11-10T11:05:00-05:00', questionsDeadline: '2026-11-03T16:00:00-05:00',
    visit: null,
    value: { kind: 'published', amount: 160000, text: 'Estimation publiée par la Ville' },
    reasons: ['Client actuel pour le pavage', 'À 19 km de votre garage', 'Métier non couvert par votre profil'],
    excludedReason: 'Métier non couvert : le devis exige une licence RBQ en ventilation et chauffage, absente de votre profil. Une municipalité connue ne suffit pas à rendre l’avis admissible.',
    pagesTotal: 48, bondRate: 0.05, bondBasis: 'ttc', minMargin: 0.10, seasons: 2,
    experience: null, equipment: [],
    declItems: ['Absence de collusion et de communication d’influence', 'Exactitude des renseignements fournis'],
    articles: [
      { code: 'preventif', n: 1, label: 'Entretien préventif mensuel', unit: 'mois', qty: 24, cost: 3600, price: 4200, ref: 3900, refInternal: true, decimals: 0 },
      { code: 'filtres', n: 2, label: 'Remplacement des filtres', unit: 'intervention', qty: 8, cost: 1500, price: 1850, ref: 1700, refInternal: true, decimals: 0 },
      { code: 'appels', n: 3, label: 'Appels de service', unit: 'h', qty: 300, cost: 96, price: 112, ref: 108, refInternal: true, decimals: 0, measured: true }
    ],
    cycles: [
      { id: 'v2024', ref: 'PAS-2024-CVC-01', year: 2024, opened: '7 novembre 2024', cpi: 162.0, composite: 1.05, seasons: 2,
        qtys: { preventif: 24, filtres: 8, appels: 260 }, source: 'Résolution d’adjudication (fictif)', retrieved: 'Récupéré le 23 octobre 2026',
        note: 'Adjudication seulement.', award: { firm: 'Climatisation Rive-Sud inc.', amount: 132000 } }
    ],
    externalComparable: null, competitors: [{ firm: 'Climatisation Rive-Sud inc.', seen: 1, of: 1, wins: 1, note: 'Titulaire du contrat actuel.' }],
    coverage: 'Couverture : une adjudication. Ce métier n’est pas dans votre profil : l’historique est montré pour information.',
    resultFactors: [['Climatisation Rive-Sud inc.', 0.98], ['Mécanique Boréale inc.', 1.04]],
    addenda: [], seedState: {}
  };
  pas.pages = [
    CL.cover(pas, [['Responsable', 'M. Steve Gagnon, immeubles']]),
    { doc: 'devis', n: 6, blocks: [{ t: 'h', x: 'Section 2 · Admissibilité' }, { t: 'clause', id: 'c-rbq', x: '2.1 Le soumissionnaire détient une licence d’entrepreneur spécialisé de la Régie du bâtiment du Québec comportant les sous-catégories applicables aux systèmes de ventilation et de chauffage visés par le contrat.' }, { t: 'clause', id: 'c-arq', x: '2.2 ' + CL.arq }, { t: 'clause', id: 'c-tech', x: '2.5 Chaque technicien affecté détient un certificat de compétence valide pour les fluides frigorigènes.' }] },
    { doc: 'devis', n: 11, blocks: [{ t: 'clause', id: 'c-bond', x: '4.1 ' + CL.bond(0.05, 'ttc') }, { t: 'clause', id: 'c-award', x: '4.6 ' + CL.lowest() }] }
  ];
  pas.requirements = [
    { id: 'r-rbq', clause: 'c-rbq', doc: 'devis', page: 6, sec: '§2.1', assess: 'eligibility', kind: 'trap', title: 'Licence RBQ en ventilation et chauffage', plain: 'Votre licence couvre 1.4 et 2.5 : la sous-catégorie exigée manque.', rule: { type: 'rbq', cats: ['ventilation'] }, conf: 0.95 },
    { id: 'r-arq', clause: 'c-arq', doc: 'devis', page: 6, sec: '§2.2', assess: 'eligibility', kind: 'trap', title: 'Attestation de Revenu Québec valide à la clôture', plain: 'Validité exigée le 10 novembre.', rule: { type: 'vault', kind: 'arq' }, conf: 0.96 },
    { id: 'r-tech', clause: 'c-tech', doc: 'devis', page: 6, sec: '§2.5', assess: 'capability', kind: 'req', title: 'Techniciens certifiés en fluides frigorigènes', plain: 'Aucun employé certifié dans votre profil.', rule: { type: 'confirm', key: 'tech', unknown: 'Aucun certificat de compétence au coffre-fort.', done: 'Sous-traitance confirmée (hypothèse).', action: 'Noter une sous-traitance' }, conf: 0.9 },
    { id: 'r-bond', clause: 'c-bond', doc: 'devis', page: 11, sec: '§4.1', assess: 'eligibility', kind: 'trap', title: 'Garantie de soumission de 5 % TTC', plain: 'À obtenir si vous poursuivez.', rule: { type: 'bond' }, conf: 0.96 },
    { id: 'r-award', clause: 'c-award', doc: 'devis', page: 11, sec: '§4.6', assess: 'info', kind: 'info', title: 'Plus bas soumissionnaire conforme', plain: 'Total taxes incluses.', conf: 0.96 }
  ];

  TS.TENDERS = [msaNord, css, sor, msaSud, lah, pas];

  /* Exemple d’avis à coller dans « Ajouter un appel d’offres » (fictif) */
  TS.SAMPLE_NOTICE = [
    'Ville de Rivière-aux-Saules (fictive) · Service des travaux publics',
    'Appel d’offres public n° RAS-2026-019',
    'Objet : Déneigement des stationnements et des accès des bâtiments municipaux, saisons 2026-2027 et 2027-2028.',
    '',
    'Les soumissions seront reçues par voie électronique sur SEAO jusqu’au jeudi 3 décembre 2026 à 11 h 00, heure de Montréal. L’ouverture publique aura lieu le même jour à 11 h 05.',
    'Une visite des lieux est obligatoire le mercredi 18 novembre 2026 à 9 h 30, au garage municipal. Une attestation de visite sera remise aux entreprises présentes.',
    'Toute question doit être transmise par écrit au plus tard le jeudi 26 novembre 2026 à 16 h 00.',
    '',
    'Admissibilité. Le soumissionnaire joint une attestation de Revenu Québec valide à la date et à l’heure limites de réception des soumissions. Il doit détenir une autorisation de contracter de l’Autorité des marchés publics (AMP). Il ne doit pas être inscrit au RENA.',
    'Le soumissionnaire démontre avoir exécuté au moins deux (2) contrats de déneigement municipal au cours des cinq (5) dernières années.',
    'Garanties. Une garantie de soumission équivalant à 10 % du prix total, toutes taxes incluses, est exigée. L’absence de garantie entraîne le rejet de la soumission.',
    'Assurances. Une assurance responsabilité civile d’au moins 3 000 000 $ est exigée.',
    'Pénalités. Une pénalité de 500 $ par jour s’applique lorsque les accès ne sont pas dégagés avant 7 h 00.',
    'Adjudication. Le contrat sera adjugé au plus bas soumissionnaire conforme, toutes taxes incluses.'
  ].join('\n');
})();
