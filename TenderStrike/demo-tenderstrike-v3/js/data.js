/* TenderStrike QC · V3 — données partagées fictives : entreprise, rôles, coffre-fort, projets, équipement.
   Les appels d’offres sont définis dans tenders.js. Montants en dollars; calculs en cents dans engine.js. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});

  TS.DATA = {
    now: '2026-10-23T07:30:00-04:00',
    tz: 'America/Toronto',

    company: {
      legalName: 'Les Entreprises Gaudreau & Fils inc.',
      tradeName: 'Déneigement Gaudreau',
      neq: '1166 418 905',
      address: '1280, rang Double, Saint-Aubin-Est (Québec) J0L 2B0',
      phone: '450 555-0142',
      email: 'soumissions@gaudreau.example',
      tps: '811 204 377 RT0001',
      tvq: '1219 845 330 TQ0001',
      amp: '3000041877',
      rbq: '5712-4408-01',
      contact: 'Marc-André Lavoie, estimateur',
      signatory: 'Sylvie Gaudreau',
      signatoryTitle: 'Présidente',
      resolution: 'Résolution du conseil d’administration n° 2026-03 du 12 mars 2026',
      yard: 'Garage de Saint-Aubin-Est',
      trades: [['deneigement', 'Déneigement'], ['transport', 'Transport de neige'], ['pavage', 'Pavage et réfection'], ['entretien', 'Entretien ménager de bâtiments']],
      radiusKm: 60,
      band: [150000, 2500000]
    },
    tradeLabels: { deneigement: 'Déneigement', transport: 'Transport de neige', pavage: 'Pavage et réfection', entretien: 'Entretien ménager', cvc: 'Ventilation et chauffage (CVC)', autre: 'Autre métier' },

    people: {
      sylvie: { id: 'sylvie', name: 'Sylvie Gaudreau', initials: 'SG', role: 'Propriétaire, signataire autorisée', short: 'Propriétaire', can: ['decide', 'approvePrice', 'sign', 'approvePackage', 'vault', 'restricted', 'price', 'receipt', 'forms', 'bond', 'tender'] },
      marc: { id: 'marc', name: 'Marc-André Lavoie', initials: 'ML', role: 'Estimateur et chargé de soumission', short: 'Estimateur', can: ['price', 'forms', 'bond', 'tender'] },
      josee: { id: 'josee', name: 'Josée Tremblay', initials: 'JT', role: 'Administratrice et tenue de livres', short: 'Administratrice', can: ['vault', 'restricted', 'forms'] }
    },

    connectors: [
      { id: 'seao', name: 'SEAO', detail: 'Dernière vérification aujourd’hui à 6 h 04 · 312 avis lus, 41 nouveaux, 6 addenda' },
      { id: 'canadabuys', name: 'CanadaBuys', state: 'next', detail: 'Connecteur en validation : schéma 2026 à tester avant la mise en service' },
      { id: 'sam', name: 'SAM.gov', state: 'later', detail: 'Prévu plus tard, avec ses propres règles d’approvisionnement' }
    ],

    night: [
      { t: '6 h 00', title: 'Ingestion SEAO', body: '312 avis et 6 addenda relus depuis le flux public. Instantanés bruts conservés.' },
      { t: '6 h 12', title: 'Tri par métier et territoire', body: '41 nouveaux avis : 2 correspondent à vos métiers dans un rayon de 60 km, 1 est exclu avec son motif.' },
      { t: '6 h 48', title: 'Radiographie des dossiers', body: '186 pages lues pour Mont-Saint-Aubin; exigences reliées à leur page pour chaque dossier lisible.' },
      { t: '7 h 02', title: 'Comparaison des prix', body: 'Ouvertures publiques rapprochées des quantités de 2026, dossier par dossier.' },
      { t: '7 h 30', title: 'Brief prêt', body: 'Courriel et texto préparés pour Sylvie. Envoi simulé dans cette démo.' }
    ],

    feedbackCodes: [['relevant', 'Pertinent'], ['trade', 'Mauvais métier'], ['far', 'Trop loin'], ['big', 'Trop gros'], ['capacity', 'Capacité insuffisante']],
    taxes: { tps: 0.05, tvq: 0.09975 },
    surety: { single: 2500000, aggregate: 6000000, committed: 3100000, broker: 'Courtage Boréal', contact: 'Nadia Fortin', confirmed: '30 septembre 2026' },
    cpiNow: 168.7,
    indices: {
      ipc: { label: 'IPC Québec, ensemble', short: 'IPC Québec', detail: 'Statistique Canada, tableau 18-10-0004 · valeurs d’indice fictives pour la démo' },
      composite: { label: 'Indice composite du métier', short: 'indice composite', detail: 'Main-d’œuvre, carburant et équipement pondérés par l’entreprise · valeurs fictives' },
      none: { label: 'Aucun ajustement', short: 'aucun ajustement', detail: 'Montants historiques comparés tels quels' },
      manual: { label: 'Taux annuel manuel', short: 'taux manuel', detail: 'Composé sur le nombre d’années écoulées depuis chaque cycle' }
    },
    vaultKinds: [
      ['arq', 'Attestation de Revenu Québec'], ['cnesst', 'Attestation de conformité CNESST'], ['amp', 'Autorisation de contracter de l’AMP'], ['rena', 'Vérification au RENA'],
      ['insurance', 'Assurance responsabilité civile'], ['rbq', 'Licence RBQ'], ['visit', 'Attestation de visite'], ['background', 'Antécédents judiciaires du personnel'],
      ['resolution', 'Résolution de signataire'], ['surety', 'Capacité de cautionnement'], ['financial', 'États financiers'], ['equipment', 'Liste d’équipement'], ['bondcheque', 'Chèque visé ou traite (garantie de soumission)'], ['bondletter', 'Lettre de garantie ou de crédit irrévocable'], ['other', 'Autre pièce']
    ],

    vault: [
      { id: 'v-arq', kind: 'arq', title: 'Attestation de Revenu Québec', issuer: 'Revenu Québec', issued: '2026-08-03', expires: '2026-11-02', owner: 'josee', sensitivity: 'public', file: 'ARQ_Gaudreau_2026-08-03.pdf', verified: 'Vérifiée le 3 août 2026 par Josée Tremblay' },
      { id: 'v-amp', kind: 'amp', title: 'Autorisation de contracter de l’AMP', issuer: 'Autorité des marchés publics', issued: '2024-03-18', expires: null, indefinite: true, owner: 'josee', sensitivity: 'public', file: 'AMP_autorisation_3000041877.pdf', checkedAt: '2026-10-22T09:12:00-04:00', reviewDays: 14, verified: 'Statut « autorisée » vérifié au REA le 22 octobre 2026 à 9 h 12 (manuel)', note: 'Durée indéterminée depuis le 2 avril 2026. Mise à jour annuelle à faire avant le 14 mars 2027.', annual: '2027-03-14' },
      { id: 'v-rena', kind: 'rena', title: 'Non-inscription au RENA', issuer: 'Autorité des marchés publics', issued: '2026-10-22', expires: null, owner: 'josee', sensitivity: 'public', file: 'RENA_verification_2026-10-22.pdf', checkedAt: '2026-10-22T09:20:00-04:00', reviewDays: 14, verified: 'Consultation manuelle du registre le 22 octobre 2026' },
      { id: 'v-cnesst', kind: 'cnesst', title: 'Attestation de conformité CNESST', issuer: 'CNESST', issued: '2026-09-15', expires: '2027-01-15', owner: 'josee', sensitivity: 'public', file: 'CNESST_conformite_2026-09-15.pdf', verified: 'Vérifiée le 19 octobre 2026' },
      { id: 'v-rc', kind: 'insurance', title: 'Assurance responsabilité civile 5 M$', issuer: 'Assurances Laurentides (fictive)', issued: '2026-06-01', expires: '2027-05-31', amount: 5000000, owner: 'josee', sensitivity: 'public', file: 'Certificat_RC_5M_2026.pdf', verified: 'Vérifiée le 2 juin 2026' },
      { id: 'v-visit-031', kind: 'visit', tender: 'ts-031', title: 'Attestation de visite · Mont-Saint-Aubin Nord', issuer: 'Ville de Mont-Saint-Aubin', issued: '2026-10-21', expires: null, owner: 'marc', sensitivity: 'public', file: 'Attestation_visite_TP-2026-031.pdf', verified: 'Remise sur place à Denis Gaudreau le 21 octobre 2026' },
      { id: 'v-res', kind: 'resolution', title: 'Résolution autorisant la signataire', issuer: 'Conseil d’administration', issued: '2026-03-12', expires: null, owner: 'sylvie', sensitivity: 'public', file: 'Resolution_CA_2026-03.pdf', verified: 'Confirmée le 12 mars 2026' },
      { id: 'v-rbq', kind: 'rbq', title: 'Licence RBQ 5712-4408-01 (1.4 et 2.5)', issuer: 'Régie du bâtiment du Québec', issued: '2019-05-02', expires: '2027-05-02', cats: ['1.4', '2.5'], owner: 'josee', sensitivity: 'public', file: 'Licence_RBQ_5712-4408-01.pdf', verified: 'Vérifiée au registre le 1er octobre 2026', note: 'Sous-catégories 1.4 (routes et canalisation) et 2.5 (excavation et terrassement).' },
      { id: 'v-bg', kind: 'background', title: 'Vérifications des antécédents judiciaires (12 employés)', issuer: 'Service de police (fictif)', issued: '2026-09-02', expires: '2027-09-02', owner: 'josee', sensitivity: 'restricted', file: 'Antecedents_personnel_2026.pdf', verified: 'Dossiers reçus le 2 septembre 2026' },
      { id: 'v-surety', kind: 'surety', title: 'Lettre de capacité de cautionnement', issuer: 'Courtage Boréal (fictif)', issued: '2026-09-30', expires: '2027-09-30', owner: 'sylvie', sensitivity: 'restricted', file: 'Capacite_cautionnement_2026.pdf', verified: 'Confirmée par le courtier le 30 septembre 2026', note: '2,5 M$ par contrat, 6 M$ au total, 3,1 M$ engagés.' },
      { id: 'v-fin', kind: 'financial', title: 'États financiers 2025 (mission d’examen)', issuer: 'Cabinet comptable (fictif)', issued: '2026-04-28', expires: null, owner: 'sylvie', sensitivity: 'restricted', file: 'Etats_financiers_2025.pdf', verified: 'Déposés le 28 avril 2026' },
      { id: 'v-equip', kind: 'equipment', title: 'Liste d’équipement (22 unités)', issuer: 'Interne', issued: '2026-10-01', expires: null, owner: 'marc', sensitivity: 'public', file: 'Liste_equipement_2026-10.pdf', verified: 'Mise à jour le 1er octobre 2026' }
    ],

    projects: [
      { id: 'p1', trade: 'deneigement', client: 'Ville de Pointe-aux-Saules', object: 'Déneigement des voies publiques, secteur Est', start: '2022-11-01', end: '2025-04-15', km: 41.2, value: 1018400, contact: 'Hélène Rivard, directrice des travaux publics', email: 'h.rivard@pointe-aux-saules.example' },
      { id: 'p2', trade: 'deneigement', client: 'Municipalité de Sainte-Odile-sur-Rivière', object: 'Déneigement des chemins municipaux', start: '2021-11-01', end: '2024-04-15', km: 33.5, value: 712900, contact: 'Paul Desrosiers, directeur général', email: 'p.desrosiers@sainte-odile.example' },
      { id: 'p3', trade: 'deneigement', client: 'Ville de Lac-aux-Hérons', object: 'Déneigement, secteur Centre', start: '2023-11-01', end: '2026-04-15', km: 36.0, value: 884300, contact: 'Nadia Ouellet, contremaîtresse voirie', email: '' },
      { id: 'p4', trade: 'deneigement', client: 'Ville de Saint-Jacques-des-Monts', object: 'Déneigement du réseau local', start: '2017-11-01', end: '2020-04-15', km: 52.0, value: 1240000, contact: 'Gilles Brault, ingénieur municipal', email: 'g.brault@sjdm.example' },
      { id: 'p5', trade: 'deneigement', client: 'Centre de services scolaire des Trois-Cours', object: 'Cours d’école et stationnements (14 sites)', start: '2024-11-01', end: '2026-04-15', km: 0, sites: 14, value: 168000, contact: 'Martine Roy, ressources matérielles', email: 'm.roy@cstc.example' },
      { id: 'p6', trade: 'pavage', client: 'Ville de Pointe-aux-Saules', object: 'Réfection de la rue des Érables', start: '2024-05-06', end: '2024-08-30', value: 742000, contact: 'Hélène Rivard, directrice des travaux publics', email: 'h.rivard@pointe-aux-saules.example' },
      { id: 'p7', trade: 'pavage', client: 'Municipalité de Sainte-Odile-sur-Rivière', object: 'Pavage de la rue des Peupliers', start: '2023-05-15', end: '2023-08-18', value: 618500, contact: 'Éric Lavallée, ing., directeur du génie', email: 'e.lavallee@sainte-odile.example' },
      { id: 'p8', trade: 'pavage', client: 'Ville de Lac-aux-Hérons', object: 'Resurfaçage du stationnement de l’aréna', start: '2025-06-02', end: '2025-07-11', value: 312000, contact: 'Nadia Ouellet, contremaîtresse voirie', email: 'n.ouellet@lac-aux-herons.example' },
      { id: 'p9', trade: 'pavage', client: 'Ville de Saint-Jacques-des-Monts', object: 'Réfection du boulevard des Monts', start: '2019-05-06', end: '2019-09-27', value: 1120000, contact: 'Gilles Brault, ingénieur municipal', email: 'g.brault@sjdm.example' },
      { id: 'p10', trade: 'entretien', client: 'Centre de services scolaire des Trois-Cours', object: 'Entretien ménager de 4 écoles', start: '2023-01-01', end: '2025-06-30', m2: 11800, value: 588000, contact: 'Martine Roy, ressources matérielles', email: 'm.roy@cstc.example' },
      { id: 'p11', trade: 'entretien', client: 'Ville de Lac-aux-Hérons', object: 'Entretien de l’hôtel de ville et de la bibliothèque', start: '2024-03-01', end: '2026-02-28', m2: 6200, value: 214000, contact: 'Nadia Ouellet, contremaîtresse voirie', email: 'n.ouellet@lac-aux-herons.example' }
    ],

    equipment: [
      { cat: 'chargeuse', label: 'Chargeuse sur roues Cat 938M (188 HP)', count: 4, mode: 'Propriété', gps: 4, year: '2021' },
      { cat: 'chargeuse', label: 'Chargeuse sur roues Volvo L90H (173 HP)', count: 1, mode: 'Location long terme jusqu’au 30 avril 2029', gps: 1, year: '2024' },
      { cat: 'souffleuse', label: 'Souffleuse détachable Larue D65', count: 2, mode: 'Propriété', gps: 0, attachment: true, year: '2019' },
      { cat: 'chenillette', label: 'Chenillette à trottoirs Trackless MT7', count: 3, mode: 'Propriété', gps: 3, year: '2020' },
      { cat: 'chenillette', label: 'Chenillette à trottoirs Prinoth SW4S', count: 1, mode: 'Location long terme jusqu’au 30 avril 2029', gps: null, year: '2025' },
      { cat: 'epandeur', label: 'Camion épandeur 10 roues', count: 3, mode: 'Propriété', gps: 3, year: '2018' },
      { cat: 'finisseur', label: 'Finisseur d’asphalte Cat AP555F', count: 1, mode: 'Propriété', gps: 1, year: '2022' },
      { cat: 'rouleau', label: 'Rouleau vibrant tandem', count: 2, mode: 'Propriété', gps: 2, year: '2021' },
      { cat: 'autolaveuse', label: 'Autolaveuse autoportée', count: 5, mode: 'Propriété', gps: null, attachment: true, year: '2023' }
    ],

    taskTemplates: [
      { id: 't-decide', title: 'Revoir la radiographie et décider', who: 'sylvie', min: 15, tab: 'radiographie' },
      { id: 't-acquire', title: 'Obtenir les documents sur SEAO', who: 'marc', min: 10, tab: 'radiographie', when: 'acquisition' },
      { id: 't-blockers', title: 'Régler les pièces bloquantes du coffre-fort', who: 'josee', min: 20, tab: 'conformite' },
      { id: 't-price', title: 'Ajuster et faire approuver les prix unitaires', who: 'marc', min: 60, tab: 'prix' },
      { id: 't-bond', title: 'Obtenir la garantie de soumission du courtier', who: 'marc', min: 15, tab: 'revue', when: 'bond' },
      { id: 't-fields', title: 'Revoir les champs pré-remplis des annexes', who: 'josee', min: 25, tab: 'formulaires' },
      { id: 't-sign', title: 'Signer la déclaration et les accusés d’addenda', who: 'sylvie', min: 15, tab: 'revue' },
      { id: 't-confirm', title: 'Confirmer les points de capacité', who: 'marc', min: 15, tab: 'radiographie', optional: true },
      { id: 't-export', title: 'Approuver et exporter le paquet', who: 'sylvie', min: 10, tab: 'revue' },
      { id: 't-receipt', title: 'Déposer sur SEAO et enregistrer le reçu', who: 'sylvie', min: 20, tab: 'revue' }
    ]
  };
})();
