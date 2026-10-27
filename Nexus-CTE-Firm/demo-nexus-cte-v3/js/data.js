/* Nexus CTE V3 — données de démonstration (entièrement fictives).
   Les montants sont des entrées de moteurs déterministes : aucun chiffre affiché n'est produit par un texte de modèle.
   Chaque mandat porte son propre dossier complet (états financiers, retraitements, paramètres, salle, offres);
   les moteurs le traitent par le même code, qu'il soit semé ici, créé depuis le radar ou saisi de zéro. */
(function (g) {
  'use strict';

  var TODAY = '2026-10-23'; // vendredi 23 octobre 2026, 10 h 40 au démarrage
  var START_MIN = 640;

  var TEAM = {
    cp: { id: 'cp', name: 'Catherine Pelletier', initials: 'CP', title: 'Courtière principale, fondatrice', role: 'courtier' },
    mt: { id: 'mt', name: 'Maxime Thibodeau', initials: 'MT', title: 'Analyste transaction', role: 'analyste' },
    sl: { id: 'sl', name: 'Sophie Lavoie', initials: 'SL', title: 'Agente acheteurs', role: 'agent_acheteur' },
    jg: { id: 'jg', name: 'Jérémie Gosselin', initials: 'JG', title: 'Agent vendeur', role: 'agent_vendeur' }
  };
  var ROLE_USER = { courtier: 'cp', analyste: 'mt', agent_acheteur: 'sl', agent_vendeur: 'jg' };
  var ROLE_LABEL = { courtier: 'Courtière principale', analyste: 'Analyste transaction', agent_acheteur: 'Agente acheteurs', agent_vendeur: 'Agent vendeur' };

  /* ---------------- Secteurs, paramètres de marché et géographie ---------------- */
  // Jeu démo v2026.3 (à valider par un EEE/CBV). Le moteur choisit le jeu par préfixe SCIAN; le modèle n'en fournit aucun.
  var SECTORS = [
    { code: '332710', label: 'Ateliers d’usinage', mult: { low: 3.75, mid: 4.25, high: 4.75 }, param: 'usinage SCIAN 3327, BAIIA de 250 k$ à 1 M$' },
    { code: '332319', label: 'Fabrication de charpentes et de produits en tôle forte (soudure)', mult: { low: 3.5, mid: 4.0, high: 4.5 }, param: 'soudure et fabrication métallique SCIAN 3323' },
    { code: '417230', label: 'Grossistes-distributeurs de machines et de matériel industriels', mult: { low: 4.0, mid: 4.5, high: 5.0 }, param: 'distribution industrielle SCIAN 4172' },
    { code: '484229', label: 'Transport par camion spécialisé', mult: { low: 3.25, mid: 3.75, high: 4.25 }, param: 'camionnage spécialisé SCIAN 4842' },
    { code: '238210', label: 'Entrepreneurs en électricité', mult: { low: 3.0, mid: 3.5, high: 4.0 }, param: 'entrepreneurs spécialisés SCIAN 2382' },
    { code: '811199', label: 'Réparation de véhicules lourds', mult: { low: 2.75, mid: 3.25, high: 3.75 }, param: 'réparation et entretien SCIAN 8111' },
    { code: '337110', label: 'Fabrication d’armoires de cuisine et de meubles', mult: { low: 3.0, mid: 3.5, high: 4.0 }, param: 'meubles et armoires SCIAN 3371' },
    { code: '323119', label: 'Impression et activités connexes', mult: { low: 2.75, mid: 3.25, high: 3.75 }, param: 'impression SCIAN 3231' },
    { code: '722511', label: 'Restaurants à service complet', mult: { low: 2.25, mid: 2.75, high: 3.25 }, param: 'restauration SCIAN 7225' },
    { code: '541330', label: 'Services de génie', mult: { low: 3.5, mid: 4.0, high: 4.5 }, param: 'services professionnels SCIAN 5413' }
  ];
  // Adjacence sectorielle pour l'appariement (aval, amont, voisins).
  var ADJACENT = { '332': ['333', '336', '417', '811'], '333': ['332', '417'], '336': ['332'], '417': ['332', '333', '484'], '484': ['488', '493', '417'], '488': ['484'], '493': ['484'], '238': ['236', '237'], '811': ['417', '332'], '337': ['321'], '323': ['322'], '541': ['238'] };
  var REGIONS = ['Bas-Saint-Laurent', 'Saguenay–Lac-Saint-Jean', 'Capitale-Nationale', 'Mauricie', 'Estrie', 'Montréal', 'Outaouais', 'Abitibi-Témiscamingue', 'Côte-Nord', 'Nord-du-Québec', 'Gaspésie–Îles-de-la-Madeleine', 'Chaudière-Appalaches', 'Laval', 'Lanaudière', 'Laurentides', 'Montérégie', 'Centre-du-Québec'];
  var NEAR = {
    'Chaudière-Appalaches': ['Capitale-Nationale', 'Bas-Saint-Laurent', 'Estrie', 'Centre-du-Québec'],
    'Capitale-Nationale': ['Chaudière-Appalaches', 'Mauricie', 'Saguenay–Lac-Saint-Jean', 'Côte-Nord'],
    'Bas-Saint-Laurent': ['Chaudière-Appalaches', 'Gaspésie–Îles-de-la-Madeleine', 'Côte-Nord'],
    'Mauricie': ['Capitale-Nationale', 'Centre-du-Québec', 'Lanaudière'],
    'Centre-du-Québec': ['Chaudière-Appalaches', 'Mauricie', 'Estrie', 'Montérégie'],
    'Estrie': ['Chaudière-Appalaches', 'Centre-du-Québec', 'Montérégie'],
    'Montérégie': ['Montréal', 'Estrie', 'Centre-du-Québec'],
    'Montréal': ['Laval', 'Montérégie', 'Lanaudière', 'Laurentides'],
    'Laurentides': ['Laval', 'Lanaudière', 'Outaouais', 'Montréal']
  };
  var LAUNCH_REGIONS = ['Chaudière-Appalaches', 'Capitale-Nationale'];
  // Lieux précis que la vérification d'identifiabilité signale dans un sommaire aveugle (plus précis que la région).
  var PLACES = ['Saint-Georges', 'Sainte-Marie', 'Lévis', 'Montmagny', 'Thetford Mines', 'Beauceville', 'Saint-Henri', 'Drummondville', 'Saint-Jérôme', 'Saint-Augustin-de-Desmaures', 'Sherbrooke', 'Rimouski', 'La Pocatière', 'Trois-Rivières', 'Boucherville', 'Saint-Jean-Port-Joli', 'Lac-Etchemin', 'Victoriaville', 'Plessisville', 'Beauce', 'Bellechasse', 'Lotbinière', 'Etchemins', 'Côte-du-Sud', 'Kamouraska', 'Portneuf', 'Charlevoix', 'Saguenay'];

  // Politiques d'honoraires : deux brouillons contradictoires conservés (spécification MA-26).
  var FEE_POLICIES = {
    A: { id: 'A', label: 'Politique A, Partie A du dossier maître', status: 'Signée aux mandats en cours', prep: 3500, credit: 0,
      tiers: [{ upTo: 1000000, rate: 0.10 }, { upTo: Infinity, rate: 0.06 }], min: 65000,
      note: 'Frais de préparation de 3 500 $; crédit éventuel à définir au contrat.' },
    B: { id: 'B', label: 'Politique B, Nexus §11.4', status: 'Brouillon inactif, comparaison seulement', prep: 6000, credit: 1,
      tiers: [{ upTo: 1000000, rate: 0.10 }, { upTo: 2000000, rate: 0.08 }, { upTo: 5000000, rate: 0.06 }, { upTo: Infinity, rate: 0.06 }], min: 45000,
      note: 'Frais de préparation de 6 000 $ crédités à 100 % sur les honoraires de succès.' }
  };

  /* ---------------- Moteur acheteurs : profils CRM (critères déclarés) ---------------- */
  var BUYER_TYPES = {
    strategique: 'Acquéreur stratégique', financier: 'Acheteur financier', repreneur: 'Repreneur individuel', consolidateur: 'Consolidateur sectoriel',
    interne: 'Relève interne', familial: 'Relève familiale', investisseur_immobilier: 'Investisseur immobilier'
  };
  var TIMELINES = { now: 'Actif maintenant', '6m': 'D’ici 6 mois', '12m': 'D’ici 12 mois', opportuniste: 'Opportuniste' };
  var STRUCT_LABEL = { actions: 'Actions', actifs: 'Actifs' };
  // Deux barèmes conservés pour comparaison (spécification MA-09.1).
  var WEIGHTS = {
    nexus: { label: 'Barème Nexus §8 (v1.1)', dims: [
      { id: 'secteur', label: 'Adjacence SCIAN', w: 30 }, { id: 'taille', label: 'Taille', w: 25 }, { id: 'geo', label: 'Géographie', w: 15 },
      { id: 'structure', label: 'Structure', w: 10 }, { id: 'capacite', label: 'Capacité financière', w: 10 }, { id: 'echeancier', label: 'Échéancier', w: 5 }, { id: 'historique', label: 'Historique', w: 5 } ] },
    plan: { label: 'Barème du plan initial §10', dims: [
      { id: 'secteur', label: 'Fit sectoriel et stratégique', w: 25 }, { id: 'capacite', label: 'Capacité financière', w: 20 }, { id: 'historique', label: 'Historique d’acquisitions', w: 15 },
      { id: 'synergies', label: 'Synergies opérationnelles', w: 15 }, { id: 'geo', label: 'Géographie', w: 10 }, { id: 'immobilier', label: 'Compatibilité immobilière', w: 10 }, { id: 'echeancier', label: 'Calendrier et transition', w: 5 } ] }
  };
  function B(o) { return Object.assign({ inferred: [], relations: [], refusals: [], archived: false, onlyMandate: null, underMandate: null, coInvestor: false, notes: '' }, o); }
  var BUYERS = [
    B({ id: 'b1', name: 'Groupe Industriel Lacasse inc.', type: 'strategique', city: 'Lévis', region: 'Chaudière-Appalaches', angle: 'Horizontal',
      thesis: 'Ajouter de la capacité CNC et de fabrication au sud de Québec; troisième acquisition depuis 2021.',
      criteria: { sectors: ['3327', '3323'], revenueMin: 2000000, revenueMax: 12000000, ebitdaMin: 200000, ebitdaMax: 1500000, regions: ['Chaudière-Appalaches', 'Capitale-Nationale', 'Bas-Saint-Laurent'], structures: ['actions', 'actifs'], bpvOk: true, leaseback: true },
      equityMin: 1000000, equityMax: 2000000, fundingEvidence: true, financing: 'Lettre d’intérêt d’un prêteur senior (2026-08)', timeline: 'now',
      lastVerified: '2026-10-02', acquisitions: 2, priorInterest: true,
      relations: ['a_acquis : Usinage Montmagny (2021)', 'a_acquis : Soudure Bellechasse (2024)', 'finance_par : prêteur senior (lettre 2026-08)'],
      prefs: { emplois: true, quebec: true, transition: true, bpv: true, immeuble: true } }),
    B({ id: 'b2', name: 'Capital Relève Laurentides', type: 'financier', city: 'Saint-Jérôme', region: 'Laurentides', angle: 'Financier',
      thesis: 'Société de gestion familiale : plateformes B2B rentables (fabrication, distribution, services), dirigeants en transition.',
      criteria: { sectors: ['31', '32', '33', '41', '23'], revenueMin: 4000000, revenueMax: 20000000, ebitdaMin: 400000, ebitdaMax: 2000000, regions: ['Québec'], structures: ['actions'], bpvOk: true, leaseback: true },
      equityMin: 3000000, equityMax: 5000000, fundingEvidence: true, financing: 'Relations bancaires, à confirmer', timeline: '6m',
      lastVerified: '2026-05-14', acquisitions: 1, priorInterest: true, relations: ['a_acquis : Plastiques Mauricie (2023)'],
      prefs: { emplois: false, quebec: true, transition: false, bpv: true, immeuble: true }, notes: 'Regroupement possible des activités à Drummondville; complément de prix fréquent.' }),
    B({ id: 'b3', name: 'Groupe Usinex Québec', type: 'consolidateur', city: 'Saint-Augustin-de-Desmaures', region: 'Capitale-Nationale', angle: 'Consolidation',
      thesis: 'Consolidateur sectoriel : 4 acquisitions d’ateliers d’usinage depuis 2019.',
      criteria: { sectors: ['3327'], revenueMin: 5000000, revenueMax: 25000000, ebitdaMin: 750000, ebitdaMax: null, flexEbitdaMin: 500000, regions: ['Capitale-Nationale', 'Chaudière-Appalaches', 'Bas-Saint-Laurent', 'Saguenay–Lac-Saint-Jean'], structures: ['actions'], bpvOk: false, leaseback: false },
      equityMin: 5000000, equityMax: 8000000, fundingEvidence: true, financing: 'Facilité de crédit d’acquisition en place', timeline: 'now',
      lastVerified: '2026-09-18', acquisitions: 4, priorInterest: true, inferred: ['A accepté un BAIIA de 520 k$ en 2025 lorsque l’immeuble était inclus (critère appris)'],
      history: [{ t: 'Projet Bernache, M-2026-003', s: 'Entente signée en avril 2026, lettre d’intention non retenue' }],
      relations: ['a_acquis : 4 ateliers (2019–2025)', 'concurrent_de : Groupe Industriel Lacasse'],
      prefs: { emplois: false, quebec: true, transition: true, bpv: false, immeuble: false }, notes: 'Souhaite acheter l’immeuble plutôt que le louer.' }),
    B({ id: 'b4', name: 'Équipements Agricoles Boisvert inc.', type: 'strategique', city: 'Sainte-Marie', region: 'Chaudière-Appalaches', angle: 'Aval (client)',
      thesis: 'Fabricant d’équipements agricoles : pourrait sécuriser son approvisionnement en pièces usinées.',
      criteria: { sectors: ['333'], revenueMin: null, revenueMax: null, ebitdaMin: null, ebitdaMax: null, regions: ['Chaudière-Appalaches'], structures: [], bpvOk: false, leaseback: null },
      equityMin: null, equityMax: null, fundingEvidence: false, financing: 'Aucune preuve', timeline: 'opportuniste',
      lastVerified: '2026-07-30', acquisitions: 0, priorInterest: false, relations: ['client_de : Usinage Beaucage inc. (31 % des ventes)'],
      prefs: { emplois: true, quebec: true, transition: true, bpv: false, immeuble: true } }),
    B({ id: 'b5', name: 'Étienne Rousseau-Vachon', type: 'repreneur', city: 'Québec', region: 'Capitale-Nationale', angle: 'Repreneur',
      thesis: 'Ancien directeur d’usine (22 ans en fabrication métallique), cherche une première acquisition dans la région de Québec.',
      criteria: { sectors: ['332', '333'], revenueMin: 1500000, revenueMax: 8000000, ebitdaMin: 200000, ebitdaMax: 700000, regions: ['Capitale-Nationale', 'Chaudière-Appalaches'], structures: ['actions'], bpvOk: true, leaseback: true },
      equityMin: 250000, equityMax: 400000, fundingEvidence: false, financing: 'Prêteur à confirmer', timeline: 'now',
      lastVerified: '2026-10-09', acquisitions: 0, priorInterest: false, relations: ['ancien_employeur_de : Métallurgie Portneuf'],
      prefs: { emplois: true, quebec: true, transition: true, bpv: true, immeuble: true } }),
    B({ id: 'b6', name: 'Julie Fortin', type: 'interne', city: 'Saint-Georges', region: 'Chaudière-Appalaches', angle: 'Relève interne', onlyMandate: 'outarde',
      thesis: 'Directrice des opérations de la cible depuis 19 ans; rachat par les cadres envisageable avec un partenaire financier.',
      criteria: { sectors: ['3327'], revenueMin: null, revenueMax: null, ebitdaMin: null, ebitdaMax: null, regions: ['Chaudière-Appalaches'], structures: ['actions'], bpvOk: true, leaseback: true },
      equityMin: 80000, equityMax: 120000, fundingEvidence: false, financing: 'Aucune preuve', timeline: '12m',
      lastVerified: '2026-08-27', acquisitions: 0, priorInterest: false, relations: ['employée de : Usinage Beaucage inc.'],
      prefs: { emplois: true, quebec: true, transition: true, bpv: true, immeuble: true } }),
    B({ id: 'b7', name: 'Atelier Précision Chaudière inc.', type: 'strategique', city: 'Saint-Georges', region: 'Chaudière-Appalaches', angle: 'Horizontal',
      thesis: 'Atelier concurrent situé en Beauce, croissance par acquisition locale.',
      criteria: { sectors: ['3327'], revenueMin: 4000000, revenueMax: 10000000, ebitdaMin: 300000, ebitdaMax: 900000, regions: ['Chaudière-Appalaches'], structures: ['actifs'], bpvOk: false, leaseback: false },
      equityMin: 1000000, equityMax: 2000000, fundingEvidence: true, financing: 'Facilité bancaire', timeline: 'now',
      lastVerified: '2026-09-02', acquisitions: 1, priorInterest: true, relations: ['concurrent_de : Usinage Beaucage inc.'],
      prefs: { emplois: false, quebec: true, transition: true, bpv: false, immeuble: false } }),
    B({ id: 'b10', name: 'Métal Côte-du-Sud inc.', type: 'strategique', city: 'La Pocatière', region: 'Bas-Saint-Laurent', angle: 'Horizontal',
      thesis: 'Fabricant de charpentes et de pièces soudées; veut une deuxième usine plus près de Québec.',
      criteria: { sectors: ['3323', '3327'], revenueMin: 1500000, revenueMax: 6000000, ebitdaMin: 150000, ebitdaMax: 600000, regions: ['Bas-Saint-Laurent', 'Chaudière-Appalaches'], structures: ['actions', 'actifs'], bpvOk: true, leaseback: null },
      equityMin: 400000, equityMax: 800000, fundingEvidence: true, financing: 'Lettre de la banque (2026-07)', timeline: '6m',
      lastVerified: '2026-08-19', acquisitions: 1, priorInterest: true, relations: ['a_acquis : Fer Ornemental Kamouraska (2022)'],
      prefs: { emplois: true, quebec: true, transition: true, bpv: true, immeuble: true } }),
    B({ id: 'b11', name: 'Groupe Transport Boréal inc.', type: 'consolidateur', city: 'Lévis', region: 'Chaudière-Appalaches', angle: 'Consolidation',
      thesis: 'Consolidateur du camionnage spécialisé; cinq transporteurs régionaux intégrés depuis 2018.',
      criteria: { sectors: ['484'], revenueMin: 8000000, revenueMax: 40000000, ebitdaMin: 800000, ebitdaMax: 4000000, regions: ['Québec'], structures: ['actions'], bpvOk: true, leaseback: false },
      equityMin: 5000000, equityMax: 9000000, fundingEvidence: true, financing: 'Facilité de crédit d’acquisition en place', timeline: 'now',
      lastVerified: '2026-09-25', acquisitions: 5, priorInterest: true, relations: ['a_acquis : 5 transporteurs (2018–2025)'],
      prefs: { emplois: true, quebec: true, transition: true, bpv: true, immeuble: false }, notes: 'Préfère acheter les terminaux.' }),
    B({ id: 'b12', name: 'Logistique Laurentienne SEC', type: 'financier', city: 'Québec', region: 'Capitale-Nationale', angle: 'Financier',
      thesis: 'Fonds spécialisé en transport et logistique, horizon de détention de 7 ans.',
      criteria: { sectors: ['484', '493', '488'], revenueMin: 5000000, revenueMax: 30000000, ebitdaMin: 700000, ebitdaMax: 3000000, regions: ['Québec'], structures: ['actions'], bpvOk: true, leaseback: true },
      equityMin: 2000000, equityMax: 4000000, fundingEvidence: true, financing: 'Fonds engagés; dette senior à obtenir', timeline: 'now',
      lastVerified: '2026-09-30', acquisitions: 2, priorInterest: true, relations: ['a_acquis : Entrepôts Bellechasse (2024)'],
      prefs: { emplois: true, quebec: true, transition: true, bpv: true, immeuble: true }, notes: 'Complément de prix fréquent.' }),
    B({ id: 'b13', name: 'Hydraulique Provinciale inc.', type: 'strategique', city: 'Boucherville', region: 'Montérégie', angle: 'Horizontal',
      thesis: 'Distributeur de composants hydrauliques; veut couvrir l’est du Québec.',
      criteria: { sectors: ['417'], revenueMin: 4000000, revenueMax: 15000000, ebitdaMin: 400000, ebitdaMax: 1500000, regions: ['Québec'], structures: ['actions', 'actifs'], bpvOk: true, leaseback: null },
      equityMin: 1500000, equityMax: 3000000, fundingEvidence: true, financing: 'Relation bancaire établie, demande de crédit à déposer', timeline: 'now',
      lastVerified: '2026-09-05', acquisitions: 3, priorInterest: true, relations: ['a_acquis : 3 distributeurs (2017–2024)'],
      prefs: { emplois: true, quebec: true, transition: true, bpv: true, immeuble: true } }),
    B({ id: 'b14', name: 'Fonds Saint-Laurent PME', type: 'financier', city: 'Québec', region: 'Capitale-Nationale', angle: 'Financier',
      thesis: 'Fonds régional : participations majoritaires dans des PME de distribution, de fabrication et de construction.',
      criteria: { sectors: ['41', '33', '23'], revenueMin: 3000000, revenueMax: 20000000, ebitdaMin: 500000, ebitdaMax: 3000000, regions: ['Québec'], structures: ['actions'], bpvOk: true, leaseback: true },
      equityMin: 2000000, equityMax: 6000000, fundingEvidence: true, financing: 'Fonds engagés', timeline: '6m',
      lastVerified: '2025-12-04', acquisitions: 3, priorInterest: true, relations: ['a_acquis : 3 PME (2019–2024)'],
      prefs: { emplois: true, quebec: true, transition: false, bpv: true, immeuble: true } }),
    B({ id: 'b15', name: 'Groupe Électrique Côté inc.', type: 'strategique', city: 'Québec', region: 'Capitale-Nationale', angle: 'Horizontal',
      thesis: 'Entrepreneur électricien institutionnel; cherche des équipes industrielles et des contrats de service.',
      criteria: { sectors: ['2382'], revenueMin: 5000000, revenueMax: 25000000, ebitdaMin: 400000, ebitdaMax: 2000000, regions: ['Capitale-Nationale', 'Chaudière-Appalaches'], structures: ['actions'], bpvOk: true, leaseback: null },
      equityMin: 1000000, equityMax: 3000000, fundingEvidence: true, financing: 'Marge d’acquisition autorisée', timeline: 'now',
      lastVerified: '2026-10-06', acquisitions: 2, priorInterest: true, relations: ['a_acquis : Électro-Service Portneuf (2023)'],
      prefs: { emplois: true, quebec: true, transition: true, bpv: true, immeuble: true } }),
    B({ id: 'b16', name: 'Soudage Rive-Nord inc.', type: 'strategique', city: 'Trois-Rivières', region: 'Mauricie', angle: 'Horizontal',
      thesis: 'Fabricant de structures soudées en croissance, cible des ateliers d’au moins 600 k$ de BAIIA.',
      criteria: { sectors: ['3323'], revenueMin: 5000000, revenueMax: 20000000, ebitdaMin: 600000, ebitdaMax: 2000000, regions: ['Mauricie', 'Capitale-Nationale', 'Centre-du-Québec'], structures: ['actions'], bpvOk: false, leaseback: null },
      equityMin: 1000000, equityMax: 2000000, fundingEvidence: true, financing: 'Facilité bancaire', timeline: '6m',
      lastVerified: '2026-07-12', acquisitions: 1, priorInterest: false, relations: [],
      prefs: { emplois: false, quebec: true, transition: true, bpv: false, immeuble: true } }),
    B({ id: 'bx', name: 'Distribution Hydraulique Nadeau inc.', type: 'strategique', city: 'Lévis', region: 'Chaudière-Appalaches', angle: 'Amont (fournisseur)', underMandate: 'huard',
      thesis: 'Ajouter une ligne de composants usinés à son catalogue de distribution.',
      criteria: { sectors: ['3327', '417'], revenueMin: 1000000, revenueMax: 6000000, ebitdaMin: 150000, ebitdaMax: 600000, regions: ['Chaudière-Appalaches', 'Capitale-Nationale'], structures: ['actifs'], bpvOk: false, leaseback: null },
      equityMin: 500000, equityMax: 1200000, fundingEvidence: true, financing: 'Liquidités de l’entreprise', timeline: 'opportuniste',
      lastVerified: '2026-09-09', acquisitions: 0, priorInterest: false, relations: [],
      prefs: { emplois: true, quebec: true, transition: false, bpv: false, immeuble: false } }),
    B({ id: 'b8', name: 'Placements Rive-Sud SEC', type: 'investisseur_immobilier', city: 'Lévis', region: 'Chaudière-Appalaches', angle: 'Immobilier',
      thesis: 'Immeubles industriels loués à long terme, Rive-Sud et Chaudière-Appalaches.',
      criteria: { sectors: [], regions: ['Chaudière-Appalaches', 'Capitale-Nationale'], propertyMin: 1000000, propertyMax: 2500000, yieldTarget: '7 à 8 %', lease: 'Bail de 10 ans minimum', structures: [], bpvOk: false, leaseback: true },
      equityMin: 1500000, equityMax: 3000000, fundingEvidence: true, financing: 'Prêteur hypothécaire commercial', timeline: 'now',
      lastVerified: '2026-10-14', acquisitions: 6, priorInterest: true, buyerMandate: 'bm1', relations: ['client_de : La Firme CTE (mandat d’achat rémunéré)'],
      prefs: {} }),
    B({ id: 'b9', name: 'Fonds Capital Appalaches', type: 'financier', city: 'Sainte-Marie', region: 'Chaudière-Appalaches', angle: 'Co-investisseur', coInvestor: true,
      thesis: 'Co-investisseur minoritaire auprès de repreneurs qualifiés, billets de 150 k$ à 600 k$.',
      criteria: { sectors: ['*'], revenueMin: null, revenueMax: null, ebitdaMin: 200000, ebitdaMax: 1500000, regions: ['Chaudière-Appalaches', 'Capitale-Nationale'], structures: ['actions'], bpvOk: true, leaseback: true },
      equityMin: 150000, equityMax: 600000, fundingEvidence: true, financing: 'Fonds engagés', timeline: 'now',
      lastVerified: '2026-09-21', acquisitions: 7, priorInterest: true, relations: [], prefs: {} })
  ];

  // Univers énumérable (§7.2) : 66 sociétés générées de façon déterministe, en plus des profils détaillés du CRM.
  var UNIVERSE = (function () {
    var pre = ['Usinage', 'Mécanique', 'Fabrications', 'Industries', 'Groupe', 'Métal', 'Outillage', 'Atelier', 'Distribution', 'Transport', 'Électro', 'Services'];
    var noms = ['Veilleux', 'Cloutier', 'Lessard', 'Rodrigue', 'Bolduc', 'Giguère', 'Fecteau', 'Grenier', 'Rancourt', 'Quirion', 'Maheux', 'Labbé', 'Poulin', 'Gilbert', 'Paré', 'Vachon', 'Boucher', 'Lapointe', 'Doyon', 'Turcotte', 'Bégin', 'Roy'];
    var sect = ['3327', '3327', '3323', '332', '333', '417', '484', '2382', '3327', '3323', '417', '484', '33', '41'];
    var regs = ['Chaudière-Appalaches', 'Capitale-Nationale', 'Bas-Saint-Laurent', 'Chaudière-Appalaches', 'Centre-du-Québec', 'Estrie', 'Mauricie', 'Montérégie', 'Saguenay–Lac-Saint-Jean', 'Chaudière-Appalaches', 'Capitale-Nationale'];
    var angles = ['Horizontal', 'Horizontal', 'Aval (client)', 'Amont (fournisseur)', 'Géographique', 'Consolidation', 'Financier'];
    var types = { 'Horizontal': 'strategique', 'Aval (client)': 'strategique', 'Amont (fournisseur)': 'strategique', 'Géographique': 'strategique', 'Consolidation': 'consolidateur', 'Financier': 'financier' };
    var bands = [[150000, 600000], [250000, 1000000], [400000, 1500000], [600000, 2500000], [200000, 800000]];
    var dates = ['2026-10-12', '2026-09-28', '2026-09-03', '2026-08-21', '2026-08-14', '2026-07-22', '2026-07-09', '2026-06-30', '2026-06-11', '2026-05-27', '2026-05-08', '2026-03-02', '2026-01-19', '2025-12-04', '2025-11-17', '2025-10-08', '2025-08-25', '2025-07-14', '2025-06-02', '2025-04-21'];
    var out = [];
    for (var i = 0; i < 66; i++) {
      var ang = angles[i % angles.length], t = types[ang];
      var s = t === 'financier' ? '*' : sect[i % sect.length];
      var nm = pre[(i + (s === '484' ? 9 : s === '417' ? 8 : s === '2382' ? 10 : 0)) % pre.length] + ' ' + (i % 3 === 0 ? ['Lotbinière', 'Bellechasse', 'Montmagny', 'Etchemin', 'Thetford', 'Mégantic', 'Kamouraska', 'Portneuf', 'Rimouski', 'Charlevoix'][i % 10] : noms[(i * 7) % noms.length]) + (i % 4 === 0 ? ' ltée' : ' inc.');
      var verified = i % 7 !== 3 && i < 52;
      out.push({ id: 'u' + (i + 1), name: nm, type: t, angle: ang, sectors: [s], region: regs[i % regs.length], ebitdaMin: bands[i % bands.length][0], ebitdaMax: bands[i % bands.length][1],
        lastVerified: verified ? dates[(i * 3) % dates.length] : null, fundingEvidence: i % 3 === 0 || i % 5 === 0, priorInterest: i % 6 === 0, generated: true });
    }
    return out;
  })();

  /* ---------------- Radar de relève (sourçage REQ) ---------------- */
  var SIGNAL_TYPES = {
    statut_vers_radiation: { label: 'Statut vers radiation', weight: 1.0, level: 'Très élevé' },
    administrateur_radie: { label: 'Administrateur radié', weight: 0.8, level: 'Élevé' },
    immeuble_liste: { label: 'Immeuble inscrit à vendre', weight: 0.8, level: 'Élevé' },
    administrateur_ajoute: { label: 'Administrateur ajouté', weight: 0.5, level: 'Moyen' },
    changement_siege: { label: 'Changement de siège', weight: 0.5, level: 'Moyen' },
    declaration_en_retard: { label: 'Déclaration annuelle en retard', weight: 0.5, level: 'Moyen' },
    changement_effectif: { label: 'Changement d’effectif', weight: 0.5, level: 'Moyen' },
    changement_nom: { label: 'Changement de nom', weight: 0.2, level: 'Faible' }
  };
  var SECTOR_RATES = { // taux d'intention de transfert normalisé par secteur (paramètre démo, source : plan section 5, à valider)
    '332': 0.85, '3323': 0.85, '484': 0.9, '417': 0.8, '337': 0.75, '811': 0.7, '323': 0.65, '722': 0.2, '332710': 0.85, '238': 0.7, '541': 0.6
  };
  function L(o) { return Object.assign({ manual: false, signals: [], contacts: [], preset: [], sampleNotes: '', sampleIntake: null, audit: null }, o); }
  var COMPANIES = [
    L({ id: 'r1', name: 'Soudure Poulin & Fils inc.', neq: '1142 908 117', registered: '1991-05-02', scian: '3323', scianLabel: 'Fabrication de charpentes et d’éléments métalliques', city: 'Sainte-Marie', region: 'Chaudière-Appalaches',
      employees: 18, employeesSrc: 'REQ : 11 à 25; estimation agent 18', director: 'Gaétan Poulin', directorSince: '1991', ownerAgeBand: null,
      signals: [{ type: 'administrateur_ajoute', date: '2026-09-30', detail: 'Mathieu Poulin ajouté comme administrateur', channel: 'B (consultation ciblée)' }],
      contacts: [
        { id: 'r1p', kind: 'Téléphone', value: '(418) 555-0142', business: true, src: 'Site de l’entreprise, page Nous joindre', srcDate: '2026-09-12', basis: 'na', dnc: 'Ligne d’affaires, exemption B2B consignée' },
        { id: 'r1e', kind: 'Courriel', value: 'info@soudurepoulin.example', business: true, src: 'soudurepoulin.example/nous-joindre', srcDate: '2026-09-12', basis: 'publication', basisNote: 'Publication bien en vue : URL saisie, aucun refus détecté' }
      ],
      owner: 'cp', reqFresh: '2026-09-30', building: 'à vérifier', stage: 'prospect', lastTouch: null, reason: 'Administrateur ajouté il y a 23 jours', preset: ['principale'],
      sampleNotes: 'Parlé avec Gaétan Poulin, président. 62 ans. Pense à sa retraite « dans 3 ans », son fils Mathieu vient d’entrer au conseil mais ne veut pas reprendre seul. Dit qu’il est propriétaire de la bâtisse. Environ 18 employés. Son comptable est chez Bérubé Lachance CPA. Pas pressé, mais curieux de savoir ce que vaut l’entreprise. Accepte de recevoir le questionnaire par courriel.',
      sampleIntake: { ownership: 'Gaétan Poulin 100 % (société par actions)', holdco: 'Aucune', employees: '19', revenueBand: '3 à 5 M$', ebitdaBand: '250 à 400 k$', motivation: 'Raisons personnelles (retraite)', advisors: 'CPA, notaire', exitHorizon: '24 mois', propertyOwner: 'Immeubles Poulin inc., société sœur' } }),
    L({ id: 'r2', name: 'Distribution Fecteau inc.', neq: '1160 334 552', registered: '1998-11-20', scian: '417', scianLabel: 'Grossistes-distributeurs de machines et de matériel', city: 'Lévis', region: 'Chaudière-Appalaches',
      employees: 14, employeesSrc: 'REQ : 11 à 25', director: 'Lise Fecteau', directorSince: '1998', ownerAgeBand: null,
      signals: [{ type: 'administrateur_radie', date: '2026-10-17', detail: 'Cofondateur radié comme administrateur', channel: 'B (consultation ciblée)' }],
      contacts: [
        { id: 'r2p', kind: 'Téléphone', value: '(418) 555-0177', business: true, src: 'Site de l’entreprise', srcDate: '2026-08-30', basis: 'na', dnc: 'Ligne d’affaires, exemption B2B consignée' },
        { id: 'r2e', kind: 'Courriel', value: 'ventes@fecteau.example', business: true, src: 'Annuaire d’entreprises en ligne', srcDate: '2026-08-30', basis: 'aucun', basisNote: 'Source d’annuaire : ne qualifie pas comme publication bien en vue' }
      ],
      owner: 'jg', reqFresh: '2026-10-17', building: 'inconnu', stage: 'prospect', lastTouch: null, reason: 'Administrateur radié il y a 6 jours', preset: ['secondaire'],
      sampleNotes: 'Parlé avec Lise Fecteau, présidente. 67 ans. Son associé vient de quitter le conseil; elle veut vendre d’ici 2 ans. L’entrepôt de Lévis appartient à une société de gestion familiale. 14 employés. Chiffre d’affaires d’environ 4 M$. Sa comptable est chez Fortier Roy CPA. Intéressée par une évaluation; accepte de recevoir le questionnaire par courriel à lise@fecteau.example.' }),
    L({ id: 'r3', name: 'Transport Gilbert & Fils inc.', neq: '1148 776 201', registered: '1998-04-14', scian: '484', scianLabel: 'Transport par camion', city: 'Saint-Henri', region: 'Chaudière-Appalaches',
      employees: 34, employeesSrc: 'REQ : 26 à 50', director: 'Denis Gilbert', directorSince: '1998', ownerAgeBand: null,
      signals: [{ type: 'changement_siege', date: '2026-09-12', detail: 'Siège déplacé de Saint-Henri à Lévis', channel: 'A (compilation)' }],
      contacts: [
        { id: 'r3p', kind: 'Cellulaire', value: '(418) 555-0109', business: false, src: 'Saisie manuelle (carte d’affaires)', srcDate: '2026-04-02', basis: 'na', dnc: 'Ligne personnelle : vérification LNNTE du 2026-08-04, périmée' }
      ],
      owner: 'jg', reqFresh: '2026-09-12', building: 'inconnu', stage: 'prospect', lastTouch: null, reason: 'Siège déplacé il y a 41 jours', preset: ['transport'],
      sampleNotes: 'Denis Gilbert, 59 ans. Le siège a déménagé à Lévis pour se rapprocher des clients. Pas de relève familiale pour l’instant. Rappeler dans 6 mois.' }),
    L({ id: 'r4', name: 'Garage Lessard & Frères inc.', neq: '1143 552 090', registered: '1988-06-01', scian: '811', scianLabel: 'Réparation de véhicules lourds', city: 'Thetford Mines', region: 'Chaudière-Appalaches',
      employees: 12, employeesSrc: 'Audit de sortie : 12', director: 'Normand Lessard', directorSince: '1988', ownerAgeBand: '65+',
      signals: [{ type: 'immeuble_liste', date: '2026-10-11', detail: 'Bâtisse du garage inscrite à vendre (annonce externe appariée à l’adresse)', channel: 'Externe' }],
      contacts: [
        { id: 'r4p', kind: 'Téléphone', value: '(418) 555-0166', business: true, src: 'Site de l’entreprise', srcDate: '2026-07-19', basis: 'na', dnc: 'Ligne d’affaires, exemption B2B consignée' },
        { id: 'r4e', kind: 'Courriel', value: 'normand@garagelessard.example', business: true, src: 'Questionnaire de sortie', srcDate: '2026-09-29', basis: 'expres', basisNote: 'Consentement exprès, libellé v2026.2' }
      ],
      owner: 'cp', reqFresh: '2026-10-11', building: 'Immeubles Lessard inc. (administrateur commun)', stage: 'audit_tenu', lastTouch: '2026-10-20', reason: 'Audit de sortie tenu le 20 oct.; décision d’acceptation à rendre', preset: ['double'],
      // Faits consignés à l'audit de sortie du 20 octobre (entrées du moteur d'acceptation).
      audit: { date: '2026-10-20', ebitdaEst: 185000, revenueEst: 1650000, priceMultiple: 6, engagement: 'Avis au lecteur', dependency: 'élevée', topClientPct: 18, recurringPct: 22,
        property: 'Société sœur, inscrit à vendre', propertyValue: 640000, marketRent: 54000, rentPaid: 36000, owner: 'Normand Lessard', ownerAge: 68, responsiveness: 'Questionnaire rempli en 2 jours', horizon: '12 mois', propco: 'Immeubles Lessard inc.' } }),
    L({ id: 'r5', name: 'Ébénisterie Rodrigue ltée', neq: '1147 001 338', registered: '1984-02-27', scian: '337', scianLabel: 'Fabrication de meubles et d’armoires', city: 'Saint-Georges', region: 'Chaudière-Appalaches',
      employees: 9, employeesSrc: 'REQ : 6 à 10', director: 'Yvon Rodrigue', directorSince: '1984', ownerAgeBand: null,
      signals: [{ type: 'declaration_en_retard', date: '2026-06-15', detail: 'Dernière déclaration annuelle il y a 19 mois', channel: 'A (compilation)' }],
      contacts: [
        { id: 'r5p', kind: 'Téléphone', value: '(418) 555-0128', business: true, src: 'Site de l’entreprise', srcDate: '2025-11-08', basis: 'na', dnc: 'Liste interne d’exclusion depuis le 2026-03-12' }
      ],
      owner: 'jg', reqFresh: '2026-06-15', building: 'inconnu', stage: 'contacte', lastTouch: '2026-03-12', reason: 'Déclaration en retard de 19 mois', preset: ['fermetures'] }),
    L({ id: 'r6', name: 'Imprimerie Doyon-Cloutier inc.', neq: '1149 650 774', registered: '1996-09-09', scian: '323', scianLabel: 'Impression et activités connexes', city: 'Québec', region: 'Capitale-Nationale',
      employees: 22, employeesSrc: 'REQ : 11 à 25 (était 26 à 50)', director: 'Hélène Doyon', directorSince: '2004', ownerAgeBand: null,
      signals: [{ type: 'changement_effectif', date: '2026-08-03', detail: 'Tranche d’effectif passée de 26 à 50 à 11 à 25', channel: 'A (compilation)' }],
      contacts: [
        { id: 'r6p', kind: 'Téléphone', value: '(418) 555-0190', business: true, src: 'Site de l’entreprise', srcDate: '2026-08-03', basis: 'na', dnc: 'Ligne d’affaires, exemption B2B consignée' }
      ],
      owner: 'jg', reqFresh: '2026-08-03', building: 'inconnu', stage: 'prospect', lastTouch: null, reason: 'Effectif réduit il y a 81 jours', preset: [],
      sampleNotes: 'Hélène Doyon, 58 ans, directrice générale. Réduction d’effectif après la perte d’un contrat. Pas intéressée pour l’instant, mais ouverte à en reparler. Rappeler dans 6 mois.' }),
    L({ id: 'r7', name: 'Restaurants Le Relais Beauceron inc.', neq: '1150 228 413', registered: '2001-01-15', scian: '722', scianLabel: 'Services de restauration', city: 'Beauceville', region: 'Chaudière-Appalaches',
      employees: 31, employeesSrc: 'REQ : 26 à 50', director: 'Marc Veilleux', directorSince: '2001', ownerAgeBand: null,
      signals: [{ type: 'changement_nom', date: '2026-07-21', detail: 'Nouvelle dénomination déclarée', channel: 'A (compilation)' }],
      contacts: [
        { id: 'r7p', kind: 'Téléphone', value: '(418) 555-0151', business: true, src: 'Site de l’entreprise', srcDate: '2026-07-21', basis: 'na', dnc: 'Ligne d’affaires, exemption B2B consignée' }
      ],
      owner: null, reqFresh: '2026-07-21', building: 'inconnu', stage: 'prospect', lastTouch: null, reason: 'Secteur pénalisé au barème', preset: [],
      sampleNotes: 'Marc Veilleux, propriétaire. Pas du tout intéressé. Ne me rappelez plus.' })
  ];
  var PRESETS = [
    { id: 'all', label: 'Toute la file' },
    { id: 'principale', label: 'Voie principale : fabrication 20 ans et plus' },
    { id: 'secondaire', label: 'Commerce de gros' },
    { id: 'transport', label: 'Transport et entreposage' },
    { id: 'fermetures', label: 'Liste des fermetures' },
    { id: 'double', label: 'Double actif (immeuble)' }
  ];
  var DISPOSITIONS = ['conversation', 'pas de réponse', 'boîte vocale', 'mauvais numéro', 'refus', 'à rappeler', 'retiré de la liste', 'intéressé', 'RDV pris', 'a accepté le questionnaire'];
  // Champs de la fiche alimentés par l'extraction d'appel (Call-to-CRM) et le questionnaire de sortie.
  var INTAKE_KEYS = [
    { key: 'ageBand', field: 'Tranche d’âge du propriétaire', target: 'Person.age_band' },
    { key: 'exitHorizon', field: 'Horizon de sortie déclaré', target: 'Company.exit_horizon' },
    { key: 'propertyOwner', field: 'Détention immobilière', target: 'Company.property_owner' },
    { key: 'succession', field: 'Relève familiale', target: 'Company.succession' },
    { key: 'advisor', field: 'Relation mentionnée', target: 'Relation' },
    { key: 'employees', field: 'Effectif déclaré', target: 'Company.employees' },
    { key: 'revenueBand', field: 'Tranche de chiffre d’affaires', target: 'Company.revenue_band' },
    { key: 'interest', field: 'Intérêt pour un audit de sortie', target: 'Task' },
    { key: 'callback', field: 'Rappel demandé', target: 'Task' },
    { key: 'dncRequest', field: 'Demande de retrait', target: 'DNC' },
    { key: 'email', field: 'Courriel fourni', target: 'ContactPoint' }
  ];
  var INTAKE_FORM = [
    { key: 'ownership', field: 'Structure de propriété' }, { key: 'holdco', field: 'Société de gestion' }, { key: 'employees', field: 'Effectif' },
    { key: 'revenueBand', field: 'Tranche de chiffre d’affaires' }, { key: 'ebitdaBand', field: 'Tranche de BAIIA' }, { key: 'motivation', field: 'Motivation' },
    { key: 'advisors', field: 'Conseillers' }, { key: 'exitHorizon', field: 'Horizon de sortie' }, { key: 'propertyOwner', field: 'Propriétaire de l’immeuble' }
  ];
  var ACCEPTANCE_OPTIONS = [
    { id: 'accepter', label: 'Accepter' }, { id: 'conditions', label: 'Accepter avec conditions' }, { id: 'preparation', label: 'Préparation seulement' }, { id: 'refuser', label: 'Refuser' }
  ];

  /* ---------------- Salle de données : gabarit en 12 dossiers (§15.1) ---------------- */
  // Les noms entre accolades sont remplis à partir du mandat; « when » limite une pièce à certains montages.
  var ROOM_TEMPLATE = [
    { id: '01', name: 'Corporatif', items: [['01-01', 'Statuts et certificat de constitution'], ['01-02', 'Registre des actionnaires'], ['01-03', 'État de renseignements au REQ']] },
    { id: '02', name: 'Financiers', items: [['02-01', 'États financiers {y1}, {engagement}'], ['02-02', 'États financiers {y2}, {engagement}'], ['02-03', 'États financiers {y3}, {engagement}'], ['02-04', 'Balance de vérification récente'], ['02-05', 'Budget de l’exercice suivant']] },
    { id: '03', name: 'Fiscal', items: [['03-01', 'Déclarations T2 et CO-17, trois derniers exercices'], ['03-02', 'Avis de cotisation'], ['03-03', 'Comptes de taxes TPS et TVQ']] },
    { id: '04', name: 'Clients et revenus', items: [['04-01', 'Top 20 clients et concentration'], ['04-02', 'Contrats en vigueur'], ['04-04', 'Carnet de commandes']] },
    { id: '05', name: 'Fournisseurs', items: [['05-01', 'Principaux contrats d’approvisionnement'], ['05-02', 'Ententes d’exclusivité']] },
    { id: '06', name: 'Employés', items: [['06-01', 'Organigramme'], ['06-02', 'Échelles salariales'], ['06-03', 'Descriptions de poste'], ['06-04', 'Contrats des cadres'], ['06-05', 'Convention collective']] },
    { id: '07', name: 'Immobilier', items: [['07-01', 'Certificat de localisation', 'property'], ['07-02', 'Bail avec {propco}'], ['07-03', 'Évaluation municipale', 'property'], ['07-04', 'Évaluation immobilière agréée et locative', 'property'], ['07-05', 'Évaluation environnementale de site, phase I']] },
    { id: '08', name: 'Équipements', items: [['08-01', 'Liste des équipements (âge, valeur)'], ['08-02', 'État certifié du RDPRM'], ['08-03', 'Financement d’équipement']] },
    { id: '09', name: 'Propriété intellectuelle', items: [['09-01', 'Marques, licences et logiciels']] },
    { id: '10', name: 'Litiges et conformité', items: [['10-01', 'Certificats d’assurance'], ['10-02', 'Permis et certifications'], ['10-03', 'Réclamations en cours']] },
    { id: '11', name: 'Opérations', items: [['11-01', 'Procédures qualité'], ['11-02', 'Systèmes et dépendances informatiques']] },
    { id: '12', name: 'Divulgations', items: [['12-01', 'Éléments signalés par le cédant']] }
  ];
  var ITEM_STATUS = { a_demander: 'À demander', demande: 'Demandé', recu: 'Reçu', revise: 'Révisé', probleme: 'Problème', sans_objet: 'Sans objet' };
  var DEFAULT_GRANT_FOLDERS = ['01', '02', '03', '04', '07', '08'];

  var REFUSAL_REASONS = ['trop petit', 'trop gros', 'mauvais secteur', 'mauvaise géographie', 'prix trop élevé', 'dépendance au dirigeant', 'concentration client', 'pas le bon moment', 'financement indisponible', 'structure inacceptable', 'autre (préciser)'];
  var LOSS_REASONS = ['vendeur pas prêt', 'attentes de prix irréalistes', 'a choisi un autre courtier', 'a vendu seul', 'entreprise invendable', 'financement introuvable', 'problème de diligence', 'décès ou maladie', 'a changé d’idée', 'fermeture', 'autre'];
  var FINANCING = { equityShare: 0.2, senior: { rate: 0.07, years: 10 }, capexShare: 0.14, taxShare: 0.11, threshold: 1.25, lender: 'Caisse d’économie Chaudière (prêteur senior, fictif)' };
  var BIRDS = ['Harle', 'Pygargue', 'Sarcelle', 'Bécasse', 'Plongeon', 'Grèbe', 'Fuligule', 'Eider', 'Garrot', 'Bihoreau', 'Pluvier doré', 'Bruant', 'Héron vert', 'Sterne arctique', 'Mouette'];

  /* ================= Mandats semés : cinq dossiers à des étapes différentes ================= */
  function stamp(by, date, extra) { return Object.assign({ by: TEAM[by].name, date: date }, extra || {}); }
  function decisions(map) { var o = {}; Object.keys(map).forEach(function (k) { var v = map[k]; o[k] = typeof v === 'string' ? { status: v, by: 'Maxime Thibodeau' } : Object.assign({ by: 'Maxime Thibodeau' }, v); }); return o; }
  function base(o) {
    return Object.assign({
      kind: 'vente', origin: 'seed', feePolicy: 'A', prepFee: 3500, structure: 'actions100', amfValidated: null, disclosure: 'aveugle',
      team: { courtier: 'cp', analyste: 'mt' }, adj: {}, normApproved: null, normVersion: 1, valBase: 'conservative', mods: {}, valApproved: null,
      teaser: { draft: null, source: null, provenance: null, kept: {}, approved: null }, teaserSeed: null, teaserNotes: [],
      cim: { claims: [], generated: false, decisions: {}, approved: null },
      exclusions: {}, cautions: {}, shortlist: [], listLocked: null, script: null, redList: [],
      teasersSent: null, nda: {}, ndaDates: {}, grants: {}, views: [], accessLog: [], leak: false, hold: null,
      room: { status: {}, extra: [], names: {}, docs: [], requested: null, due: {}, late: [] },
      loiDeadline: null, lois: [], loiTemplates: [], loiSelected: null, loiSigned: null, exclusivityEnd: null,
      conflict: {}, financingApproved: false, dd: { findings: [], status: {}, indexed: null }, ddSeed: [], run: {}, concluded: null,
      pendingRefusals: [], refusals: [], plan: {}, history: [], committed: null, customGates: []
    }, o);
  }

  function seedMandates() {
    var list = [];
    /* ---------- 1. Projet Outarde : préparation (le parcours de la visite commentée) ---------- */
    list.push(base({
      id: 'outarde', code: 'M-2026-014', codename: 'Projet Outarde', blindRef: 'OUTARDE-26', stage: 'preparation',
      profile: { company: 'Usinage Beaucage inc.', neq: '1145 220 386', registered: '1994-03-11', scian: '332710', sectorLabel: 'Ateliers d’usinage', city: 'Saint-Georges', region: 'Chaudière-Appalaches', area: 'Beauce',
        employees: 24, owner: 'Réjean Beaucage', ownerAge: 64, ownerAgeBand: '55–64', ownerSource: 'déclaré à l’audit de sortie, 2026-08-27',
        holdco: 'Gestion R. Beaucage inc.', propco: 'Immeubles Beaucage inc.', cpa: 'Bérubé Lachance CPA', engagement: 'Mission d’examen', union: false,
        topClientPct: 31, recurringPct: 58, ownerDependency: 'élevée' },
      blind: { sector: 'Usinage CNC de précision (sous-traitance industrielle)', region: 'Chaudière-Appalaches (sans précision de ville)', revenueBand: '5 à 10 M$', ebitdaBand: '400 à 600 k$', employeesBand: '20 à 30 employés', age: 'plus de 30 ans' },
      sellerPrefs: [
        { id: 'emplois', label: 'Maintien des 24 emplois à Saint-Georges', weight: 'forte' },
        { id: 'quebec', label: 'Propriété québécoise privilégiée', weight: 'moyenne' },
        { id: 'transition', label: 'Transition du cédant de 6 à 12 mois', weight: 'moyenne' },
        { id: 'bpv', label: 'Balance de prix de vente acceptée jusqu’à 20 %', weight: 'moyenne' },
        { id: 'immeuble', label: 'Immeuble vendu séparément, avec cession-bail', weight: 'forte' }
      ],
      dates: { signed: '2026-09-14', exclusivityEnd: '2027-09-14', prepStart: '2026-09-21' },
      history: [{ stage: 'signe', date: '2026-09-14' }, { stage: 'preparation', date: '2026-09-21' }],
      committed: { signe: '2026-09-14', preparation: '2026-09-21', marche: '2026-11-09', fenetre: '2026-12-07', negociation: '2027-01-11', diligence: '2027-02-08', cloture: '2027-04-12', conclu: '2027-05-07' },
      fin: {
        entered: true, years: [2023, 2024, 2025],
        revenue: { 2023: 5710000, 2024: 6080000, 2025: 6420000 }, ebitda: { 2023: 371000, 2024: 398000, 2025: 420000 },
        lines: [
          { id: 'ventes', label: 'Ventes', amount: 6420000, src: 'ÉF 2025, p. 4' },
          { id: 'cdv', label: 'Coût des ventes', amount: -4172000, src: 'ÉF 2025, p. 4', note: 'Matières 2 310 000 $, main-d’œuvre directe 1 486 000 $, frais de fabrication 376 000 $' },
          { id: 'mb', label: 'Marge brute', amount: 2248000, subtotal: true },
          { id: 'sal', label: 'Salaires, administration et vente', amount: -688000, src: 'Annexe A, p. 11' },
          { id: 'dir', label: 'Rémunération du dirigeant', amount: -245000, src: 'Annexe A, p. 11', adj: 'a1' },
          { id: 'fam', label: 'Salaires, membres de la famille', amount: -58000, src: 'Annexe A, p. 11', adj: 'a6' },
          { id: 'loyer', label: 'Loyer, Immeubles Beaucage inc.', amount: -96000, src: 'Annexe A, p. 11', adj: 'a3' },
          { id: 'veh', label: 'Véhicules et déplacements', amount: -74000, src: 'Annexe A, p. 11', adj: 'a5' },
          { id: 'ass', label: 'Assurances', amount: -63000, src: 'Annexe A, p. 11', adj: 'a5' },
          { id: 'hon', label: 'Honoraires professionnels', amount: -41000, src: 'Annexe A, p. 11', adj: 'a8' },
          { id: 'ent', label: 'Entretien et réparations', amount: -131000, src: 'Annexe A, p. 11', adj: 'a2' },
          { id: 'ene', label: 'Énergie', amount: -148000, src: 'Annexe A, p. 11' },
          { id: 'bur', label: 'Frais de bureau et informatique', amount: -66000, src: 'Annexe A, p. 11' },
          { id: 'pub', label: 'Publicité et représentation', amount: -39000, src: 'Annexe A, p. 11' },
          { id: 'cd', label: 'Créances douteuses', amount: -12000, src: 'Annexe A, p. 11' },
          { id: 'tax', label: 'Taxes et permis', amount: -37000, src: 'Annexe A, p. 11' },
          { id: 'aut', label: 'Autres frais d’exploitation', amount: -142000, src: 'Annexe A, p. 11' },
          { id: 'gain', label: 'Gain sur cession d’équipement', amount: 12000, src: 'ÉF 2025, p. 4', adj: 'a4' },
          { id: 'baiia', label: 'BAIIA déclaré', amount: 420000, total: true, src: 'Calcul, ÉF 2025, p. 4' },
          { id: 'amo', label: 'Amortissement', amount: -168000, src: 'ÉF 2025, p. 4' },
          { id: 'int', label: 'Intérêts sur la dette', amount: -46000, src: 'ÉF 2025, p. 4' },
          { id: 'imp', label: 'Impôts sur le bénéfice', amount: -38000, src: 'ÉF 2025, p. 4' },
          { id: 'bn', label: 'Bénéfice net', amount: 168000, total: true, src: 'ÉF 2025, p. 4' }
        ],
        extraChecks: [
          { id: 'v1', label: 'Le bilan s’équilibre (actif = passif + avoir)', ok: true, detail: '3 184 000 $ = 1 412 000 $ + 1 772 000 $ (ÉF 2025, p. 6)' },
          { id: 'v2', label: 'Le bénéfice net concorde entre l’état des résultats et les bénéfices non répartis', ok: true, detail: '168 000 $ (p. 4 et p. 7)' }
        ],
        yoyNote: 'Entretien et réparations : +41 % en 2025 (pont roulant), voir a2', capex: 60000, taxes: 45000
      },
      adjustments: [
        { id: 'a1', cat: 'Rémunération du dirigeant', label: 'Rémunération du cédant au-delà du salaire de remplacement', amounts: { 2023: 78000, 2024: 80000, 2025: 85000 }, rating: 'solide',
          line: 'Rémunération du dirigeant, 245 000 $ (Annexe A, p. 11)', why: 'Le cédant touche 245 000 $; un directeur général de remplacement coûterait 160 000 $ charges incluses.',
          evidence: 'Grille salariale de référence, DG manufacturier 20 à 49 employés, Chaudière-Appalaches (paramètre démo v2026.3)', needsEvidence: null, source: 'ia-scenario' },
        { id: 'a2', cat: 'Éléments non récurrents', label: 'Réparation majeure du pont roulant de l’atelier', amounts: { 2023: 0, 2024: 0, 2025: 18000 }, rating: 'solide',
          line: 'Entretien et réparations, 131 000 $ (Annexe A, p. 11)', why: 'Facture ponctuelle de 18 000 $ en juin 2025. Le reste de la hausse du poste, lié à l’outillage, demeure récurrent.',
          evidence: 'Facture Levage Appalaches, 2025-06-18 (pièce 02-07)', needsEvidence: '02-07', source: 'ia-scenario' },
        { id: 'a3', cat: 'Loyer', label: 'Loyer non commercial versé à la société sœur', amounts: { 2023: -38000, 2024: -36000, 2025: -36000 }, rating: 'solide',
          line: 'Loyer, Immeubles Beaucage inc., 96 000 $ (Annexe A, p. 11)', why: 'Le loyer payé (96 000 $) est inférieur au loyer marchand (132 000 $). Après la cession-bail, l’acquéreur paiera le loyer marchand : l’ajustement réduit le BAIIA.',
          evidence: 'Évaluation locative, 2 400 m² à 55 $/m² (pièce 07-04)', needsEvidence: null, source: 'ia-scenario' },
        { id: 'a4', cat: 'Éléments non opérationnels', label: 'Gain sur cession d’une fraiseuse remplacée', amounts: { 2023: 0, 2024: 0, 2025: -12000 }, rating: 'solide',
          line: 'Gain sur cession d’équipement, 12 000 $ (ÉF 2025, p. 4)', why: 'Gain non lié à l’exploitation courante; il est retiré du BAIIA.', evidence: 'Note 5 des états financiers 2025', needsEvidence: null, source: 'ia-scenario' },
        { id: 'a5', cat: 'Dépenses personnelles', label: 'Véhicule du cédant et assurance-vie du dirigeant', amounts: { 2023: 21000, 2024: 21000, 2025: 22000 }, rating: 'défendable',
          line: 'Véhicules et déplacements, 74 000 $; Assurances, 63 000 $', why: 'Le véhicule (14 000 $) et la prime d’assurance-vie (8 000 $) ne seront pas repris par un acquéreur.',
          evidence: 'Grand livre, comptes 5410 et 5620 (export du 2026-10-02)', needsEvidence: null, source: 'ia-scenario' },
        { id: 'a6', cat: 'Rémunération du dirigeant', label: 'Salaire de la conjointe au-delà du marché', amounts: { 2023: 25000, 2024: 26000, 2025: 26000 }, rating: 'défendable',
          line: 'Salaires, membres de la famille, 58 000 $ (Annexe A, p. 11)', why: 'Tenue de livres à temps partiel payée 58 000 $; la valeur marchande du poste est de 32 000 $.', evidence: 'Description de poste et heures déclarées (pièce 06-03)', needsEvidence: null, source: 'ia-scenario' },
        { id: 'a7', cat: 'Pro forma', label: 'Marge annualisée du contrat-cadre Hydro-Mécanique Saguenay', amounts: { 2023: 0, 2024: 0, 2025: 64000 }, rating: 'agressif',
          line: 'Contrat signé en septembre 2025, non reflété aux résultats', why: 'Contrat de trois ans signé, mais la marge n’est pas encore réalisée : un contrat signé ne rend pas le revenu gagné.', evidence: 'Contrat-cadre 2025-09-08 (pièce 04-03)', needsEvidence: null, source: 'ia-scenario' },
        { id: 'a8', cat: 'Éléments non récurrents', label: 'Honoraires juridiques d’un litige fournisseur', amounts: { 2023: 0, 2024: 0, 2025: 15000 }, rating: 'défendable',
          line: 'Honoraires professionnels, 41 000 $ (Annexe A, p. 11)', why: 'Le modèle propose de traiter 15 000 $ d’honoraires juridiques 2025 comme non récurrents.',
          evidence: 'Grand livre, compte 5710 : 14 000 $ en 2023, 16 000 $ en 2024, 15 000 $ en 2025', needsEvidence: null, source: 'ia-scenario',
          trap: 'Les trois exercices montrent des honoraires juridiques semblables : la dépense est récurrente.' }
      ],
      val: { paramSet: 'Paramètres de marché démo v2026.3, usinage SCIAN 3327, BAIIA de 250 k$ à 1 M$', verified: '2026-09-30', by: 'à valider par un EEE/CBV', base: { low: 3.75, mid: 4.25, high: 4.75 },
        modifiers: [
          { id: 'taille', label: 'Taille : BAIIA inférieur à 500 000 $', auto: true, evidence: 'Calculé à partir du BAIIA retenu' },
          { id: 'dependance', label: 'Dépendance au dirigeant élevée', value: -0.75, evidence: 'Le cédant gère seul les 3 plus gros comptes clients; aucun directeur général (audit de sortie, 2026-08-27)', lever: 'Nommer un directeur des opérations et transférer les comptes clés sur 12 mois' },
          { id: 'concentration', label: 'Concentration client : 31 % du chiffre d’affaires', value: -0.25, evidence: 'Top 20 clients 2025 (pièce 04-01) : premier client à 31 %', lever: 'Ramener le premier client sous 25 % du chiffre d’affaires' },
          { id: 'recurrence', label: 'Récurrence : contrats-cadres pour 58 % des ventes', value: 0.25, evidence: 'Contrats-cadres (pièces 04-02 et 04-03)' },
          { id: 'croissance', label: 'Croissance : TCAC du chiffre d’affaires de 6,0 % sur 2 ans', value: 0.25, evidence: '5 710 000 $ en 2023 à 6 420 000 $ en 2025 (ÉF)' },
          { id: 'actifs', label: 'Intensité en actifs : parc CNC renouvelé, âge moyen 6 ans', value: 0, evidence: 'Liste des équipements (pièce 08-01)' }
        ],
        bridge: { debt: 310000, debtSrc: 'Prêt à terme d’équipement (ÉF 2025, p. 6)', cash: 140000, cashSrc: 'Encaisse excédentaire au 30 sept. 2026 (pièce 02-04)', wcTarget: 820000, wcClose: 790000, wcSrc: 'FDR normalisé : moyenne des 12 derniers mois (pièce 02-04)' } },
      property: { value: 1450000, src: 'Évaluation immobilière agréée, 2026-07-15 (pièce 07-04)', municipal: 1180000, area: '2 400 m², terrain de 9 800 m²', marketRent: 132000, rentPaid: 96000, commissionRate: 0.05, investor: 'b8' },
      exclusions: { b7: 'Concurrent local exclu par le cédant (mandat exclusif, annexe B)' },
      cautions: { b4: 'Approcher le principal client avant une entente de confidentialité peut fragiliser la relation commerciale : accord écrit du cédant requis.', b6: 'Relève interne : aucune approche sans l’accord écrit du cédant (confidentialité envers les employés).' },
      shortlist: ['b1', 'b2', 'b3', 'b5'],
      redList: ['Le pont roulant et la superficie de l’atelier', 'Le principal client et son secteur exact'],
      teaserSeed: [
        { k: 'title', t: 'Atelier d’usinage CNC de précision, Chaudière-Appalaches' },
        { k: 'intro', t: 'Entreprise de sous-traitance industrielle fondée en 1994 par la famille Beaucage, offerte à la vente par voie de cession de 100 % des actions.' },
        { k: 'hl', t: 'Parc de centres d’usinage 3 et 5 axes d’un âge moyen de 6 ans.' },
        { k: 'hl', t: 'Contrats-cadres représentant 58 % des ventes.' },
        { k: 'hl', t: 'Une croissance de 12 % par année.' },
        { k: 'hl', t: 'Seul atelier certifié AS9100 de la Beauce.' },
        { k: 'hl', t: 'Principal client : un fabricant d’équipements agricoles de Sainte-Marie.' },
        { k: 'structure', t: 'Vente des actions; immeuble industriel offert séparément à un investisseur, avec bail de 10 ans au loyer marchand.' }
      ],
      cim: { claims: [
        { id: 's3b', section: 3, t: 'L’entreprise détient la plus importante capacité 5 axes de la région.', src: null, alt: { t: 'Parc de quatre centres d’usinage 5 axes.', src: '08-01' } },
        { id: 's6b', section: 6, t: 'L’équipe est entièrement autonome sans le propriétaire.', src: null, alt: { t: 'La directrice des opérations supervise la production; le cédant gère les comptes clés.', src: '06-01' } }
      ], generated: false, decisions: {}, approved: null },
      room: { status: {
        '01-01': 'revise', '01-02': 'revise', '01-03': 'revise', '02-01': 'revise', '02-02': 'revise', '02-03': 'revise', '02-04': 'recu', '02-05': 'demande', '02-07': 'demande',
        '03-01': 'revise', '03-02': 'recu', '03-03': 'revise', '04-01': 'revise', '04-02': 'revise', '04-03': 'revise', '04-04': 'recu', '05-01': 'revise', '05-02': 'sans_objet',
        '06-01': 'revise', '06-02': 'revise', '06-03': 'revise', '06-04': 'demande', '06-05': 'sans_objet', '07-01': 'revise', '07-02': 'revise', '07-03': 'revise', '07-04': 'revise', '07-05': 'demande',
        '08-01': 'revise', '08-02': 'recu', '08-03': 'revise', '09-01': 'revise', '10-01': 'revise', '10-02': 'revise', '10-03': 'sans_objet', '11-01': 'recu', '11-02': 'revise', '12-01': 'demande' },
        extra: [['02-07', '02', 'Facture de réparation du pont roulant'], ['04-03', '04', 'Contrat-cadre Hydro-Mécanique Saguenay']],
        names: { '04-02': 'Contrats-cadres en vigueur (2)', '05-01': 'Contrats d’acier et d’outillage', '06-03': 'Description de poste, tenue de livres', '08-01': 'Liste des équipements CNC (âge, valeur)', '09-01': 'Marques et licences de logiciels FAO', '11-02': 'Système ERP et dépendances', '02-04': 'Balance de vérification au 30 sept. 2026', '02-05': 'Budget 2027', '04-04': 'Carnet de commandes au 30 sept. 2026', '03-01': 'Déclarations T2 et CO-17, 2023 à 2025', '07-03': 'Évaluation municipale 2026' },
        docs: [], requested: null, due: {}, late: ['07-05'] },
      plan: { loiDeadline: '2027-01-15', marketWeeks: 3 },
      loiTemplates: [
        { id: 'la', buyer: 'b1', ev: 1700000, cash: 1360000, bpv: { amount: 340000, years: 5, rate: 0.06 }, earnout: 0, earnoutCond: '', wcTarget: 820000, equity: 340000,
          conditions: ['Financement : approbation conditionnelle obtenue le 2027-01-08', 'Vérification diligente de 60 jours', 'Bail de 10 ans avec l’investisseur immobilier'],
          financing: 'Approbation conditionnelle obtenue', financingOk: true, exclusivity: 90, closeOffset: 84, transition: '6 mois', employees: 'Engagement écrit de maintien à Saint-Georges, 24 mois', property: 'Cession-bail acceptée (loyer marchand)', leaseback: true, propertyPrice: null, prefsMet: 5 },
        { id: 'lb', buyer: 'b2', ev: 1700000, cash: 1020000, bpv: { amount: 255000, years: 3, rate: 0.07 }, earnout: 425000, earnoutCond: 'BAIIA d’au moins 550 000 $ en 2027 et en 2028', wcTarget: 900000, equity: 425000,
          conditions: ['Financement à obtenir', 'Vérification diligente de 90 jours', 'Complément de prix sur deux exercices'],
          financing: 'À obtenir', financingOk: false, exclusivity: 120, closeOffset: 119, transition: '18 mois', employees: 'Regroupement possible à Drummondville', property: 'Cession-bail acceptée', leaseback: true, propertyPrice: null, prefsMet: 2 },
        { id: 'lc', buyer: 'b3', ev: 1550000, cash: 1550000, bpv: null, earnout: 0, earnoutCond: '', wcTarget: 820000, equity: 1550000,
          conditions: ['Vérification diligente de 45 jours', 'Évaluation environnementale phase II de l’immeuble', 'Achat de l’immeuble à 1 300 000 $'],
          financing: 'Facilité de crédit en place', financingOk: true, exclusivity: 60, closeOffset: 56, transition: '3 mois', employees: 'Aucun engagement', property: 'Offre d’achat de l’immeuble sous l’évaluation (1 300 000 $)', leaseback: false, propertyPrice: 1300000, prefsMet: 2 }
      ],
      ddSeed: [
        { id: 'd1', text: 'Le contrat-cadre avec le principal client échoit le 2027-06-30.', cite: '04-02, p. 3', resolve: 'Lettre d’intention de renouvellement du client obtenue' },
        { id: 'd2', text: 'Concentration : le premier client représente 31 % des ventes 2025.', cite: '04-01, p. 1', resolve: 'Reflétée au multiple (−0,25×) et divulguée au cahier' },
        { id: 'd3', text: 'Transaction avec une partie liée : loyer versé à Immeubles Beaucage inc. sous le marché.', cite: '07-02, art. 4', resolve: 'Remplacée par le bail de 10 ans au loyer marchand (jambe 3)' },
        { id: 'd4', text: 'Hypothèque mobilière inscrite au RDPRM en faveur du prêteur d’équipement.', cite: '08-02, p. 2', resolve: 'Mainlevée prévue à la clôture, remboursement du prêt' },
        { id: 'd5', text: 'Évaluation environnementale de site phase I manquante.', cite: '07-05 (absent)', resolve: 'Rapport reçu sans recommandation de phase II', needsDoc: '07-05' }
      ]
    }));

    /* ---------- 2. Projet Pluvier : mise en marché (sommaires transmis, réponses en cours) ---------- */
    list.push(base({
      id: 'pluvier', code: 'M-2026-011', codename: 'Projet Pluvier', blindRef: 'PLUVIER-26', stage: 'marche', disclosure: 'teaser',
      profile: { company: 'Soudure Industrielle Couture inc.', neq: '1141 337 509', registered: '1987-04-14', scian: '332319', sectorLabel: 'Fabrication de charpentes et de produits en tôle forte (soudure)', city: 'Montmagny', region: 'Chaudière-Appalaches', area: 'Côte-du-Sud',
        employees: 11, owner: 'Réal Couture', ownerAge: 66, ownerAgeBand: '65+', ownerSource: 'déclaré au questionnaire de sortie, 2026-06-02',
        holdco: 'Gestion Réal Couture inc.', propco: 'Immeubles Couture et associés', cpa: 'Lemieux Gagnon CPA', engagement: 'Mission d’examen', union: false,
        topClientPct: 28, recurringPct: 24, ownerDependency: 'moyenne' },
      blind: { sector: 'Soudure et fabrication de charpentes métalliques', region: 'Chaudière-Appalaches (sans précision de ville)', revenueBand: '2 à 3 M$', ebitdaBand: '200 à 400 k$', employeesBand: '10 à 15 employés', age: 'près de 40 ans' },
      sellerPrefs: [{ id: 'emplois', label: 'Maintien des 11 emplois', weight: 'forte' }, { id: 'quebec', label: 'Repreneur de la région privilégié', weight: 'moyenne' }, { id: 'transition', label: 'Transition de 12 mois', weight: 'moyenne' }, { id: 'bpv', label: 'Balance de prix de vente acceptée jusqu’à 25 %', weight: 'moyenne' }],
      dates: { signed: '2026-06-08', exclusivityEnd: '2027-06-08', prepStart: '2026-06-15' },
      history: [{ stage: 'signe', date: '2026-06-08' }, { stage: 'preparation', date: '2026-06-15' }, { stage: 'marche', date: '2026-10-07' }],
      fin: { entered: true, years: [2023, 2024, 2025], revenue: { 2023: 2180000, 2024: 2265000, 2025: 2340000 }, ebitda: { 2023: 228000, 2024: 236000, 2025: 245000 },
        lines: [
          { id: 'ventes', label: 'Ventes', amount: 2340000, src: 'ÉF 2025, p. 3' }, { id: 'cdv', label: 'Coût des ventes', amount: -1520000, src: 'ÉF 2025, p. 3' },
          { id: 'mb', label: 'Marge brute', amount: 820000, subtotal: true }, { id: 'dir', label: 'Rémunération du dirigeant', amount: -165000, src: 'Annexe, p. 9', adj: 'p1' },
          { id: 'veh', label: 'Véhicules', amount: -31000, src: 'Annexe, p. 9', adj: 'p2' }, { id: 'loyer', label: 'Loyer', amount: -72000, src: 'Annexe, p. 9' },
          { id: 'aut', label: 'Autres frais d’exploitation', amount: -307000, src: 'Annexe, p. 9' }, { id: 'baiia', label: 'BAIIA déclaré', amount: 245000, total: true, src: 'Calcul, ÉF 2025, p. 3' }
        ] },
      adjustments: [
        { id: 'p1', cat: 'Rémunération du dirigeant', label: 'Rémunération du cédant au-delà du salaire de remplacement', amounts: { 2023: 48000, 2024: 49000, 2025: 50000 }, rating: 'solide', line: 'Rémunération du dirigeant, 165 000 $', why: 'Un contremaître-directeur de remplacement coûterait 115 000 $ charges incluses.', evidence: 'Grille salariale de référence (paramètre démo v2026.3)', needsEvidence: null, source: 'ia-scenario' },
        { id: 'p2', cat: 'Dépenses personnelles', label: 'Camionnette personnelle du cédant', amounts: { 2023: 8500, 2024: 8800, 2025: 9000 }, rating: 'défendable', line: 'Véhicules, 31 000 $', why: 'Usage personnel documenté au registre de kilométrage.', evidence: 'Grand livre, compte 5410', needsEvidence: null, source: 'ia-scenario' },
        { id: 'p3', cat: 'Éléments non récurrents', label: 'Déménagement d’un pont roulant (2024)', amounts: { 2023: 0, 2024: 12000, 2025: 0 }, rating: 'solide', line: 'Entretien, 2024', why: 'Dépense ponctuelle liée au réaménagement de l’atelier.', evidence: 'Facture 2024-05 (pièce 02-02)', needsEvidence: null, source: 'ia-scenario' },
        { id: 'p4', cat: 'Pro forma', label: 'Marge d’un nouveau client éolien', amounts: { 2023: 0, 2024: 0, 2025: 30000 }, rating: 'agressif', line: 'Soumission en cours', why: 'Soumission non signée : aucune marge démontrée.', evidence: 'Courriel du client (non contractuel)', needsEvidence: null, source: 'ia-scenario' }
      ],
      adj: decisions({ p1: 'accepted', p2: 'accepted', p3: 'accepted', p4: { status: 'rejected', reason: 'Contrat non signé : aucune marge démontrée' } }),
      normApproved: stamp('mt', '2026-09-24', { version: 1 }),
      val: { paramSet: 'Paramètres de marché démo v2026.3, soudure et fabrication métallique SCIAN 3323', verified: '2026-09-30', by: 'à valider par un EEE/CBV', base: { low: 3.5, mid: 4.0, high: 4.5 },
        modifiers: [
          { id: 'taille', label: 'Taille : BAIIA inférieur à 500 000 $', auto: true, evidence: 'Calculé à partir du BAIIA retenu' },
          { id: 'dependance', label: 'Dépendance au dirigeant moyenne', value: -0.25, evidence: 'Le cédant prépare toutes les soumissions (questionnaire, 2026-06-02)', lever: 'Former le chargé de projets aux soumissions sur 6 mois' },
          { id: 'croissance', label: 'Croissance : TCAC du chiffre d’affaires de 3,6 % sur 2 ans', value: 0, evidence: '2 180 000 $ en 2023 à 2 340 000 $ en 2025 (ÉF)' }
        ],
        bridge: { debt: 120000, debtSrc: 'Prêt d’équipement (ÉF 2025, p. 5)', cash: 60000, cashSrc: 'Encaisse excédentaire (pièce 02-04)', wcTarget: 310000, wcClose: 300000, wcSrc: 'FDR normalisé, 12 mois (pièce 02-04)' } },
      mods: { dependance: 'accepted', croissance: 'accepted' },
      valApproved: stamp('cp', '2026-09-28', { mid: 1032500 }),
      property: null,
      teaser: { draft: [
        { k: 'title', t: 'Atelier de soudure et de charpentes métalliques, Chaudière-Appalaches' },
        { k: 'intro', t: 'Entreprise de fabrication métallique établie depuis près de 40 ans, offerte à la vente par voie de cession de 100 % des actions.' },
        { k: 'hl', t: 'Clientèle d’entrepreneurs généraux et d’industriels régionaux.' },
        { k: 'hl', t: 'Équipe de 10 à 15 soudeurs et monteurs qualifiés.' },
        { k: 'structure', t: 'Vente des actions; locaux loués, bail transférable.' }
      ], source: 'regles', provenance: { source: 'rules' }, kept: {}, approved: stamp('cp', '2026-10-02') },
      cim: { claims: [{ id: 'pl-c1', section: 3, t: 'Seul atelier de la région certifié pour l’acier de charpente.', src: null, alt: { t: 'Certification de soudage pour l’acier de charpente (division 2).', src: '10-02' } }], generated: false, decisions: {}, approved: null },
      shortlist: ['b1', 'b5', 'b10', 'b16'], listLocked: stamp('cp', '2026-10-03', { ids: ['b1', 'b5', 'b10', 'b16'] }), script: stamp('cp', '2026-10-03'),
      teasersSent: '2026-10-07', nda: { b1: 'signe', b5: 'consulte', b10: 'envoye', b16: 'envoye' }, ndaDates: { b1: '2026-10-12', b5: '2026-10-15' },
      room: { status: { '02-05': 'demande', '06-04': 'sans_objet', '06-05': 'sans_objet', '07-05': 'sans_objet', '10-03': 'sans_objet', '05-02': 'sans_objet', '12-01': 'recu', '11-01': 'recu' }, defaultStatus: 'revise', extra: [], names: { '07-02': 'Bail des locaux (tiers)' }, docs: [], requested: '2026-06-16', due: {}, late: [] },
      plan: { marketWeeks: 3 }
    }));

    /* ---------- 3. Projet Grand-Héron : négociation (deux lettres d'intention reçues) ---------- */
    list.push(base({
      id: 'grandheron', code: 'M-2026-006', codename: 'Projet Grand-Héron', blindRef: 'HERON-26', stage: 'negociation', disclosure: 'nda',
      profile: { company: 'Transport Spécialisé Mathieu inc.', neq: '1144 870 225', registered: '1992-08-03', scian: '484229', sectorLabel: 'Transport par camion spécialisé', city: 'Sainte-Marie', region: 'Chaudière-Appalaches', area: 'Beauce',
        employees: 42, owner: 'Guy Mathieu', ownerAge: 61, ownerAgeBand: '55–64', ownerSource: 'déclaré à l’audit de sortie, 2026-04-22',
        holdco: 'Gestion Guy Mathieu inc.', propco: 'Immeubles G. Mathieu inc.', cpa: 'Fortier Roy CPA', engagement: 'Mission d’examen', union: false,
        topClientPct: 34, recurringPct: 61, ownerDependency: 'faible' },
      blind: { sector: 'Transport spécialisé de marchandises (charges hors normes)', region: 'Chaudière-Appalaches (sans précision de ville)', revenueBand: '10 à 12 M$', ebitdaBand: '1 à 1,4 M$', employeesBand: '40 à 50 employés', age: 'plus de 30 ans' },
      sellerPrefs: [{ id: 'emplois', label: 'Maintien des chauffeurs et du terminal', weight: 'forte' }, { id: 'quebec', label: 'Propriété québécoise privilégiée', weight: 'moyenne' }, { id: 'transition', label: 'Transition de 6 mois', weight: 'moyenne' }, { id: 'immeuble', label: 'Terminal vendu ou loué au marché', weight: 'moyenne' }],
      dates: { signed: '2026-05-11', exclusivityEnd: '2027-05-11', prepStart: '2026-05-19' },
      history: [{ stage: 'signe', date: '2026-05-11' }, { stage: 'preparation', date: '2026-05-19' }, { stage: 'marche', date: '2026-07-06' }, { stage: 'fenetre', date: '2026-08-31' }, { stage: 'negociation', date: '2026-10-05' }],
      fin: { entered: true, years: [2023, 2024, 2025], revenue: { 2023: 9850000, 2024: 10420000, 2025: 11060000 }, ebitda: { 2023: 1090000, 2024: 1140000, 2025: 1205000 },
        lines: [
          { id: 'ventes', label: 'Revenus de transport', amount: 11060000, src: 'ÉF 2025, p. 4' }, { id: 'cdv', label: 'Coûts d’exploitation (carburant, chauffeurs, entretien)', amount: -8310000, src: 'ÉF 2025, p. 4' },
          { id: 'mb', label: 'Marge d’exploitation', amount: 2750000, subtotal: true }, { id: 'dir', label: 'Rémunération du dirigeant', amount: -230000, src: 'Annexe, p. 12', adj: 'g1' },
          { id: 'fam', label: 'Salaire du fils, répartiteur', amount: -96000, src: 'Annexe, p. 12', adj: 'g3' }, { id: 'loyer', label: 'Loyer, Immeubles G. Mathieu inc.', amount: -150000, src: 'Annexe, p. 12', adj: 'g5' },
          { id: 'hon', label: 'Honoraires et réclamations d’assurance', amount: -61000, src: 'Annexe, p. 12', adj: 'g4' }, { id: 'aut', label: 'Frais administratifs et autres', amount: -1053000, src: 'Annexe, p. 12' },
          { id: 'gain', label: 'Gain sur vente de camions', amount: 45000, src: 'ÉF 2025, p. 4', adj: 'g2' }, { id: 'baiia', label: 'BAIIA déclaré', amount: 1205000, total: true, src: 'Calcul, ÉF 2025, p. 4' }
        ] },
      adjustments: [
        { id: 'g1', cat: 'Rémunération du dirigeant', label: 'Rémunération du cédant au-delà du salaire de remplacement', amounts: { 2023: 66000, 2024: 68000, 2025: 70000 }, rating: 'solide', line: 'Rémunération du dirigeant, 230 000 $', why: 'Un directeur général de remplacement coûterait 160 000 $.', evidence: 'Grille salariale de référence (paramètre démo v2026.3)', needsEvidence: null, source: 'ia-scenario' },
        { id: 'g2', cat: 'Éléments non opérationnels', label: 'Gain sur vente de camions remplacés', amounts: { 2023: -21000, 2024: -30000, 2025: -45000 }, rating: 'solide', line: 'Gain sur vente de camions, 45 000 $', why: 'Gain sur cession d’actifs : retiré du BAIIA.', evidence: 'Note 6 des états financiers', needsEvidence: null, source: 'ia-scenario' },
        { id: 'g3', cat: 'Rémunération du dirigeant', label: 'Salaire du fils au-delà du marché', amounts: { 2023: 17000, 2024: 18000, 2025: 18000 }, rating: 'défendable', line: 'Salaire du fils, 96 000 $', why: 'Poste de répartiteur au marché à 78 000 $.', evidence: 'Description de poste (pièce 06-03)', needsEvidence: null, source: 'ia-scenario' },
        { id: 'g4', cat: 'Éléments non récurrents', label: 'Frais de réclamation d’assurance 2025', amounts: { 2023: 0, 2024: 0, 2025: 25000 }, rating: 'défendable', line: 'Honoraires et réclamations, 61 000 $', why: 'Le modèle propose 25 000 $ de frais de réclamation comme non récurrents.', evidence: 'Grand livre : 22 000 $ en 2023, 24 000 $ en 2024, 25 000 $ en 2025', needsEvidence: null, source: 'ia-scenario', trap: 'Les trois exercices montrent des frais semblables : la dépense est récurrente.' },
        { id: 'g5', cat: 'Loyer', label: 'Loyer du terminal sous le marché', amounts: { 2023: -39000, 2024: -39000, 2025: -39000 }, rating: 'solide', line: 'Loyer, 150 000 $', why: 'Loyer marchand de 189 000 $ (évaluation locative).', evidence: 'Évaluation locative (pièce 07-04)', needsEvidence: null, source: 'ia-scenario' }
      ],
      adj: decisions({ g1: 'accepted', g2: 'accepted', g3: 'accepted', g4: { status: 'rejected', reason: 'Dépense récurrente : réclamations semblables en 2023, 2024 et 2025' }, g5: 'accepted' }),
      normApproved: stamp('mt', '2026-06-12', { version: 1 }),
      val: { paramSet: 'Paramètres de marché démo v2026.3, camionnage spécialisé SCIAN 4842', verified: '2026-05-30', by: 'à valider par un EEE/CBV', base: { low: 3.25, mid: 3.75, high: 4.25 },
        modifiers: [
          { id: 'taille', label: 'Taille : BAIIA inférieur à 500 000 $', auto: true, evidence: 'Calculé à partir du BAIIA retenu' },
          { id: 'concentration', label: 'Concentration client : 34 % du chiffre d’affaires', value: -0.25, evidence: 'Top 20 clients (pièce 04-01)', lever: 'Diversifier le premier client sous 25 %' },
          { id: 'recurrence', label: 'Récurrence : contrats annuels pour 61 % des revenus', value: 0.25, evidence: 'Contrats en vigueur (pièce 04-02)' },
          { id: 'croissance', label: 'Croissance : TCAC des revenus de 6,0 % sur 2 ans', value: 0.25, evidence: '9 850 000 $ en 2023 à 11 060 000 $ en 2025 (ÉF)' },
          { id: 'actifs', label: 'Flotte à renouveler : âge moyen de 7,5 ans', value: -0.25, evidence: 'Liste des équipements (pièce 08-01)', lever: 'Renouveler 8 tracteurs avant la vente' }
        ],
        bridge: { debt: 1850000, debtSrc: 'Financement de la flotte (ÉF 2025, p. 7)', cash: 420000, cashSrc: 'Encaisse excédentaire (pièce 02-04)', wcTarget: 1150000, wcClose: 1120000, wcSrc: 'FDR normalisé, 12 mois (pièce 02-04)' } },
      mods: { concentration: 'accepted', recurrence: 'accepted', croissance: 'accepted', actifs: 'accepted' },
      valApproved: stamp('cp', '2026-06-20', { mid: 4466250 }),
      property: { value: 2100000, src: 'Évaluation agréée, 2026-05-02 (pièce 07-04)', municipal: 1720000, area: 'Terminal de 3 100 m², cour de 2,4 ha', marketRent: 189000, rentPaid: 150000, commissionRate: 0.05, investor: 'b8' },
      teaser: { draft: [
        { k: 'title', t: 'Transporteur spécialisé, Chaudière-Appalaches' },
        { k: 'intro', t: 'Transporteur de charges hors normes établi depuis plus de 30 ans, offert à la vente par voie de cession de 100 % des actions.' },
        { k: 'hl', t: 'Contrats annuels pour 61 % des revenus.' },
        { k: 'hl', t: 'Croissance annuelle composée de 6,0 % sur deux ans.' },
        { k: 'structure', t: 'Vente des actions; terminal offert séparément ou loué au marché.' }
      ], source: 'regles', provenance: { source: 'rules' }, kept: {}, approved: stamp('cp', '2026-06-28') },
      cim: { claims: [{ id: 'gh-c1', section: 6, t: 'Taux de roulement des chauffeurs de 6 % en 2025.', src: '06-01' }], generated: true, decisions: {}, approved: stamp('cp', '2026-07-10') },
      shortlist: ['b11', 'b12', 'b2', 'b14'], listLocked: stamp('cp', '2026-07-03', { ids: ['b11', 'b12', 'b2', 'b14'] }), script: stamp('cp', '2026-07-03'),
      teasersSent: '2026-07-06', nda: { b11: 'signe', b12: 'signe', b2: 'refuse', b14: 'signe' }, ndaDates: { b11: '2026-07-14', b12: '2026-07-20', b14: '2026-07-29' },
      refusals: [{ buyer: 'b2', reason: 'prix trop élevé', note: 'Multiple jugé élevé pour un transporteur à flotte vieillissante', date: '2026-07-24' }],
      grants: { b11: { folders: ['01', '02', '03', '04', '07', '08'], expires: '2026-11-30', by: 'Catherine Pelletier', date: '2026-07-31' }, b12: { folders: ['01', '02', '03', '04', '07', '08'], expires: '2026-11-30', by: 'Catherine Pelletier', date: '2026-07-31' }, b14: { folders: ['01', '02', '04'], expires: '2026-10-29', by: 'Catherine Pelletier', date: '2026-08-14' } },
      views: [{ buyer: 'b11', folder: '02', min: 51, date: '2026-08-04' }, { buyer: 'b11', folder: '08', min: 33, date: '2026-08-04' }, { buyer: 'b12', folder: '02', min: 38, date: '2026-08-11' }, { buyer: 'b12', folder: '04', min: 24, date: '2026-08-11' }, { buyer: 'b14', folder: '02', min: 4, date: '2026-08-20' }],
      room: { status: { '02-05': 'recu', '06-05': 'sans_objet', '10-03': 'sans_objet', '05-02': 'sans_objet', '07-05': 'revise' }, defaultStatus: 'revise', extra: [], names: { '08-01': 'Liste de la flotte (tracteurs, remorques, âge)' }, docs: [], requested: '2026-05-20', due: {}, late: [] },
      loiDeadline: '2026-10-02',
      lois: [
        { id: 'h1', buyer: 'b11', ev: 4500000, cash: 3600000, bpv: { amount: 900000, years: 5, rate: 0.06 }, earnout: 0, earnoutCond: '', wcTarget: 1150000, equity: 1350000,
          conditions: ['Vérification diligente de 45 jours', 'Achat du terminal à 1 950 000 $', 'Maintien des contrats des trois premiers clients'], financing: 'Facilité de crédit en place', financingOk: true, exclusivity: 75, close: '2027-01-29',
          transition: '6 mois', employees: 'Maintien des chauffeurs; répartition regroupée à Lévis', property: 'Achat du terminal sous l’évaluation (1 950 000 $)', leaseback: false, propertyPrice: 1950000, prefsMet: 3, received: '2026-10-02', source: 'reçue' },
        { id: 'h2', buyer: 'b12', ev: 4750000, cash: 2850000, bpv: { amount: 475000, years: 3, rate: 0.07 }, earnout: 1425000, earnoutCond: 'BAIIA d’au moins 1 350 000 $ en 2027 et en 2028', wcTarget: 1250000, equity: 950000,
          conditions: ['Financement senior à obtenir', 'Vérification diligente de 75 jours', 'Bail de 10 ans du terminal avec un investisseur'], financing: 'À obtenir', financingOk: false, exclusivity: 90, close: '2027-02-26',
          transition: '12 mois', employees: 'Engagement de maintien, 24 mois', property: 'Cession-bail du terminal (loyer marchand)', leaseback: true, propertyPrice: null, prefsMet: 4, received: '2026-10-01', source: 'reçue' }
      ],
      ddSeed: [
        { id: 'gd1', text: 'Trois tracteurs sous contrat de location-acquisition non inscrits au bilan.', cite: '08-03, annexe 2', resolve: 'Contrats intégrés au calcul de la dette (pont de valeur)' },
        { id: 'gd2', text: 'Permis de charges hors normes renouvelables le 2027-03-31.', cite: '10-02, p. 1', resolve: 'Renouvellement anticipé déposé auprès du ministère' }
      ]
    }));

    /* ---------- 4. Projet Huard : vérification diligente (phase I en retard) ---------- */
    list.push(base({
      id: 'huard', code: 'M-2026-009', codename: 'Projet Huard', blindRef: 'HUARD-26', stage: 'diligence', disclosure: 'divulgue',
      profile: { company: 'Distribution Hydraulique Nadeau inc.', neq: '1146 012 873', registered: '1989-02-20', scian: '417230', sectorLabel: 'Grossistes-distributeurs de machines et de matériel industriels', city: 'Lévis', region: 'Chaudière-Appalaches', area: 'Rive-Sud',
        employees: 19, owner: 'Claude Nadeau', ownerAge: 67, ownerAgeBand: '65+', ownerSource: 'déclaré à l’audit de sortie, 2026-02-11',
        holdco: 'Gestion Claude Nadeau inc.', propco: '', cpa: 'Bérubé Lachance CPA', engagement: 'Mission d’examen', union: false,
        topClientPct: 14, recurringPct: 70, ownerDependency: 'moyenne' },
      blind: { sector: 'Distribution de composants hydrauliques industriels', region: 'Chaudière-Appalaches (sans précision de ville)', revenueBand: '6 à 8 M$', ebitdaBand: '600 à 800 k$', employeesBand: '15 à 25 employés', age: 'plus de 35 ans' },
      sellerPrefs: [{ id: 'emplois', label: 'Maintien de l’équipe de vente', weight: 'forte' }, { id: 'quebec', label: 'Acquéreur québécois privilégié', weight: 'moyenne' }, { id: 'transition', label: 'Transition de 6 mois', weight: 'moyenne' }, { id: 'bpv', label: 'Balance de prix de vente acceptée jusqu’à 20 %', weight: 'moyenne' }],
      dates: { signed: '2026-03-02', exclusivityEnd: '2027-03-02', prepStart: '2026-03-09' },
      history: [{ stage: 'signe', date: '2026-03-02' }, { stage: 'preparation', date: '2026-03-09' }, { stage: 'marche', date: '2026-05-04' }, { stage: 'fenetre', date: '2026-06-08' }, { stage: 'negociation', date: '2026-07-27' }, { stage: 'diligence', date: '2026-09-18' }],
      fin: { entered: true, years: [2023, 2024, 2025], revenue: { 2023: 6120000, 2024: 6390000, 2025: 6710000 }, ebitda: { 2023: 612000, 2024: 638000, 2025: 664000 },
        lines: [
          { id: 'ventes', label: 'Ventes', amount: 6710000, src: 'ÉF 2025, p. 4' }, { id: 'cdv', label: 'Coût des marchandises vendues', amount: -4630000, src: 'ÉF 2025, p. 4' },
          { id: 'mb', label: 'Marge brute', amount: 2080000, subtotal: true }, { id: 'dir', label: 'Rémunération du dirigeant', amount: -215000, src: 'Annexe, p. 10', adj: 'n1' },
          { id: 'sal', label: 'Salaires et commissions', amount: -742000, src: 'Annexe, p. 10', adj: 'n3' }, { id: 'loyer', label: 'Loyer (tiers)', amount: -168000, src: 'Annexe, p. 10' },
          { id: 'pub', label: 'Publicité et commandites', amount: -48000, src: 'Annexe, p. 10', adj: 'n2' }, { id: 'aut', label: 'Autres frais d’exploitation', amount: -243000, src: 'Annexe, p. 10' },
          { id: 'baiia', label: 'BAIIA déclaré', amount: 664000, total: true, src: 'Calcul, ÉF 2025, p. 4' }
        ] },
      adjustments: [
        { id: 'n1', cat: 'Rémunération du dirigeant', label: 'Rémunération du cédant au-delà du salaire de remplacement', amounts: { 2023: 52000, 2024: 54000, 2025: 55000 }, rating: 'solide', line: 'Rémunération du dirigeant, 215 000 $', why: 'Un directeur général de remplacement coûterait 160 000 $.', evidence: 'Grille salariale de référence (paramètre démo v2026.3)', needsEvidence: null, source: 'ia-scenario' },
        { id: 'n2', cat: 'Dépenses personnelles', label: 'Commandite du club de golf du cédant', amounts: { 2023: 10000, 2024: 11000, 2025: 11000 }, rating: 'défendable', line: 'Publicité et commandites, 48 000 $', why: 'Commandite sans retombée commerciale documentée.', evidence: 'Grand livre, compte 5320', needsEvidence: null, source: 'ia-scenario' },
        { id: 'n3', cat: 'Éléments non récurrents', label: 'Indemnité de départ d’un représentant (2025)', amounts: { 2023: 0, 2024: 0, 2025: 38000 }, rating: 'solide', line: 'Salaires et commissions, 742 000 $', why: 'Indemnité ponctuelle, poste comblé au même salaire.', evidence: 'Entente de départ (pièce 06-04)', needsEvidence: null, source: 'ia-scenario' }
      ],
      adj: decisions({ n1: 'accepted', n2: 'accepted', n3: 'accepted' }),
      normApproved: stamp('mt', '2026-04-02', { version: 1 }),
      val: { paramSet: 'Paramètres de marché démo v2026.3, distribution industrielle SCIAN 4172', verified: '2026-03-31', by: 'à valider par un EEE/CBV', base: { low: 4.0, mid: 4.5, high: 5.0 },
        modifiers: [
          { id: 'taille', label: 'Taille : BAIIA inférieur à 500 000 $', auto: true, evidence: 'Calculé à partir du BAIIA retenu' },
          { id: 'dependance', label: 'Dépendance au dirigeant moyenne', value: -0.25, evidence: 'Le cédant gère les deux ententes fournisseurs principales', lever: 'Transférer les ententes fournisseurs au directeur des ventes' },
          { id: 'recurrence', label: 'Récurrence : ententes de distribution pour 70 % des ventes', value: 0.25, evidence: 'Ententes fournisseurs et clients (pièces 04-02 et 05-02)' },
          { id: 'croissance', label: 'Croissance : TCAC des ventes de 4,7 % sur 2 ans', value: 0, evidence: '6 120 000 $ en 2023 à 6 710 000 $ en 2025 (ÉF)' }
        ],
        bridge: { debt: 280000, debtSrc: 'Marge de crédit utilisée (ÉF 2025, p. 6)', cash: 310000, cashSrc: 'Encaisse excédentaire (pièce 02-04)', wcTarget: 1480000, wcClose: 1455000, wcSrc: 'FDR normalisé, 12 mois (pièce 02-04)' } },
      mods: { dependance: 'accepted', recurrence: 'accepted', croissance: 'accepted' },
      valApproved: stamp('cp', '2026-04-09', { mid: 3406500 }),
      property: null,
      teaser: { draft: [
        { k: 'title', t: 'Distributeur de composants hydrauliques, Chaudière-Appalaches' },
        { k: 'intro', t: 'Distributeur industriel établi depuis plus de 35 ans, offert à la vente par voie de cession de 100 % des actions.' },
        { k: 'hl', t: 'Ententes de distribution pour 70 % des ventes.' },
        { k: 'structure', t: 'Vente des actions; entrepôt loué à un tiers jusqu’en 2031.' }
      ], source: 'regles', provenance: { source: 'rules' }, kept: {}, approved: stamp('cp', '2026-04-20') },
      cim: { claims: [], generated: true, decisions: {}, approved: stamp('cp', '2026-05-12') },
      shortlist: ['b13', 'b14', 'b2'], listLocked: stamp('cp', '2026-04-28', { ids: ['b13', 'b14', 'b2'] }), script: stamp('cp', '2026-04-28'),
      teasersSent: '2026-05-04', nda: { b13: 'signe', b14: 'signe', b2: 'signe' }, ndaDates: { b13: '2026-05-11', b14: '2026-05-19', b2: '2026-05-22' },
      grants: { b13: { folders: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'], expires: '2026-12-11', by: 'Catherine Pelletier', date: '2026-09-12' }, b14: { folders: ['01', '02', '04'], expires: '2026-07-31', by: 'Catherine Pelletier', date: '2026-05-25', revoked: '2026-09-12' } },
      views: [{ buyer: 'b13', folder: '02', min: 46, date: '2026-09-15' }, { buyer: 'b13', folder: '05', min: 29, date: '2026-09-16' }, { buyer: 'b13', folder: '07', min: 12, date: '2026-09-22' }],
      room: { status: { '07-01': 'sans_objet', '07-03': 'sans_objet', '07-04': 'sans_objet', '07-05': 'demande', '06-05': 'sans_objet', '10-03': 'sans_objet' }, defaultStatus: 'revise', extra: [], names: { '07-02': 'Bail de l’entrepôt (tiers, jusqu’en 2031)' }, docs: [], requested: '2026-03-10', due: { '07-05': '2026-10-21' }, late: ['07-05'] },
      loiDeadline: '2026-07-24',
      lois: [
        { id: 'n-l1', buyer: 'b13', ev: 3450000, cash: 2932500, bpv: { amount: 517500, years: 5, rate: 0.065 }, earnout: 0, earnoutCond: '', wcTarget: 1480000, equity: 862500,
          conditions: ['Financement senior à obtenir', 'Vérification diligente de 75 jours', 'Consentement du fabricant principal au changement de contrôle'], financing: 'À obtenir', financingOk: false, exclusivity: 90, close: '2026-12-04',
          transition: '6 mois', employees: 'Maintien de l’équipe de vente, 18 mois', property: 'Sans objet : entrepôt loué à un tiers', leaseback: false, propertyPrice: null, prefsMet: 4, received: '2026-07-22', source: 'reçue' },
        { id: 'n-l2', buyer: 'b14', ev: 3300000, cash: 2310000, bpv: { amount: 330000, years: 3, rate: 0.07 }, earnout: 660000, earnoutCond: 'BAIIA d’au moins 800 000 $ en 2027', wcTarget: 1550000, equity: 1320000,
          conditions: ['Vérification diligente de 90 jours', 'Complément de prix'], financing: 'Fonds engagés', financingOk: true, exclusivity: 120, close: '2027-01-15',
          transition: '12 mois', employees: 'Aucun engagement', property: 'Sans objet', leaseback: false, propertyPrice: null, prefsMet: 2, received: '2026-07-24', source: 'reçue' }
      ],
      loiSelected: 'n-l1', loiSigned: '2026-09-12', exclusivityEnd: '2026-12-11',
      dd: { indexed: '2026-10-02', status: { hd3: 'resolu', hd4: 'resolu' }, findings: [
        { id: 'hd1', text: 'Contrat de distribution exclusif avec le fabricant principal : clause de changement de contrôle.', cite: '05-02, art. 14', resolve: 'Consentement écrit du fabricant obtenu', severity: 'élevée' },
        { id: 'hd2', text: 'Évaluation environnementale de site phase I en retard (responsable : cédant).', cite: '07-05 (absent)', resolve: 'Rapport reçu sans recommandation de phase II', needsDoc: '07-05', severity: 'élevée' },
        { id: 'hd3', text: 'Inventaire : 6 % du stock à rotation lente (plus de 24 mois).', cite: '02-04, onglet Inventaire', resolve: 'Provision de 64 000 $ intégrée au fonds de roulement cible', severity: 'moyenne' },
        { id: 'hd4', text: 'Hypothèque mobilière au RDPRM en faveur de la banque.', cite: '08-02, p. 2', resolve: 'Mainlevée prévue à la clôture', severity: 'faible' }
      ] }
    }));

    /* ---------- 5. Projet Sterne : mandat signé (demande de documents à envoyer) ---------- */
    list.push(base({
      id: 'sterne', code: 'M-2026-012', codename: 'Projet Sterne', blindRef: 'STERNE-26', stage: 'signe',
      profile: { company: 'Électricité Grenier & Fils inc.', neq: '1149 203 664', registered: '1996-05-27', scian: '238210', sectorLabel: 'Entrepreneurs en électricité', city: 'Québec', region: 'Capitale-Nationale', area: '',
        employees: 28, owner: 'Martin Grenier', ownerAge: 59, ownerAgeBand: '55–64', ownerSource: 'déclaré à l’audit de sortie, 2026-09-30',
        holdco: 'Gestion M. Grenier inc.', propco: 'Immeubles M.G. inc.', cpa: 'Lemieux Gagnon CPA', engagement: 'Avis au lecteur', union: true,
        topClientPct: 22, recurringPct: 35, ownerDependency: 'moyenne' },
      blind: { sector: 'Entrepreneur électricien industriel et commercial', region: 'Capitale-Nationale (sans précision de ville)', revenueBand: '6 à 8 M$', ebitdaBand: '400 à 600 k$', employeesBand: '25 à 35 employés', age: 'près de 30 ans' },
      sellerPrefs: [{ id: 'emplois', label: 'Maintien des 28 emplois syndiqués', weight: 'forte' }, { id: 'quebec', label: 'Acquéreur québécois privilégié', weight: 'moyenne' }, { id: 'transition', label: 'Transition de 12 mois', weight: 'moyenne' }, { id: 'immeuble', label: 'Atelier vendu avec l’entreprise ou loué', weight: 'faible' }],
      dates: { signed: '2026-10-19', exclusivityEnd: '2027-10-19', prepStart: null },
      history: [{ stage: 'signe', date: '2026-10-19' }],
      fin: { entered: true, years: [2023, 2024, 2025], revenue: { 2023: 6940000, 2024: 7380000, 2025: 7150000 }, ebitda: { 2023: 512000, 2024: 566000, 2025: 498000 },
        lines: [
          { id: 'ventes', label: 'Revenus de contrats', amount: 7150000, src: 'ÉF 2025 (avis au lecteur), p. 2' }, { id: 'cdv', label: 'Coûts des contrats', amount: -5480000, src: 'ÉF 2025, p. 2' },
          { id: 'mb', label: 'Marge brute', amount: 1670000, subtotal: true }, { id: 'dir', label: 'Rémunération du dirigeant', amount: -200000, src: 'Annexe, p. 6', adj: 'e1' },
          { id: 'veh', label: 'Véhicules', amount: -118000, src: 'Annexe, p. 6', adj: 'e4' }, { id: 'cd', label: 'Créances douteuses', amount: -47000, src: 'Annexe, p. 6', adj: 'e3' },
          { id: 'loyer', label: 'Loyer, Immeubles M.G. inc.', amount: -84000, src: 'Annexe, p. 6' }, { id: 'aut', label: 'Salaires administratifs et autres frais', amount: -723000, src: 'Annexe, p. 6', adj: 'e2' },
          { id: 'baiia', label: 'BAIIA déclaré', amount: 498000, total: true, src: 'Calcul, ÉF 2025, p. 2' }
        ] },
      adjustments: [
        { id: 'e1', cat: 'Rémunération du dirigeant', label: 'Rémunération du cédant au-delà du salaire de remplacement', amounts: { 2023: 36000, 2024: 38000, 2025: 40000 }, rating: 'solide', line: 'Rémunération du dirigeant, 200 000 $', why: 'Un directeur général de remplacement coûterait 160 000 $.', evidence: 'Grille salariale de référence (paramètre démo v2026.3)', needsEvidence: null, source: 'ia-scenario' },
        { id: 'e2', cat: 'Éléments non récurrents', label: 'Prime exceptionnelle au contremaître (2025)', amounts: { 2023: 0, 2024: 0, 2025: 22000 }, rating: 'défendable', line: 'Salaires administratifs, 2025', why: 'Prime de rétention ponctuelle pendant un chantier majeur.', evidence: 'Lettre de prime (à obtenir)', needsEvidence: null, source: 'ia-scenario' },
        { id: 'e3', cat: 'Éléments non récurrents', label: 'Créance d’un entrepreneur général en faillite (2025)', amounts: { 2023: 0, 2024: 0, 2025: 31000 }, rating: 'solide', line: 'Créances douteuses, 47 000 $', why: 'Perte ponctuelle : le client a déclaré faillite en mars 2025.', evidence: 'Avis de faillite du client (pièce 02-06)', needsEvidence: '02-06', source: 'ia-scenario' },
        { id: 'e4', cat: 'Dépenses personnelles', label: 'Véhicules personnels du cédant et de sa conjointe', amounts: { 2023: 15000, 2024: 15500, 2025: 16000 }, rating: 'défendable', line: 'Véhicules, 118 000 $', why: 'Deux véhicules sans usage commercial démontré.', evidence: 'Grand livre, compte 5410', needsEvidence: null, source: 'ia-scenario' },
        { id: 'e5', cat: 'Pro forma', label: 'Marge attendue des projets hydroélectriques 2027', amounts: { 2023: 0, 2024: 0, 2025: 60000 }, rating: 'agressif', line: 'Soumissions en cours', why: 'Aucun contrat signé : marge hypothétique.', evidence: 'Liste de soumissions (non contractuelle)', needsEvidence: null, source: 'ia-scenario' }
      ],
      val: { paramSet: 'Paramètres de marché démo v2026.3, entrepreneurs spécialisés SCIAN 2382', verified: '2026-09-30', by: 'à valider par un EEE/CBV', base: { low: 3.0, mid: 3.5, high: 4.0 },
        modifiers: [
          { id: 'taille', label: 'Taille : BAIIA inférieur à 500 000 $', auto: true, evidence: 'Calculé à partir du BAIIA retenu' },
          { id: 'dependance', label: 'Dépendance au dirigeant moyenne', value: -0.25, evidence: 'Le cédant signe toutes les soumissions de plus de 250 000 $', lever: 'Déléguer les soumissions au chargé de projets principal' },
          { id: 'croissance', label: 'Croissance : TCAC des revenus de 1,5 % sur 2 ans', value: 0, evidence: '6 940 000 $ en 2023 à 7 150 000 $ en 2025 (ÉF)' }
        ],
        bridge: { debt: 210000, debtSrc: 'Prêt d’équipement (ÉF 2025, p. 4)', cash: 180000, cashSrc: 'Encaisse excédentaire (pièce 02-04)', wcTarget: 940000, wcClose: 960000, wcSrc: 'FDR normalisé, 12 mois (pièce 02-04)' } },
      property: { value: 980000, src: 'Évaluation agréée, 2026-08-15 (pièce 07-04)', municipal: 812000, area: 'Atelier et entrepôt de 1 200 m²', marketRent: 84000, rentPaid: 84000, commissionRate: 0.05, investor: null },
      teaserNotes: ['Entrepreneur électricien industriel et commercial fondé en 1996 par Martin Grenier.', 'Contrats de service récurrents auprès d’institutions publiques.', 'Le plus important carnet de commandes industriel de la région.'],
      cim: { claims: [{ id: 'st-c1', section: 3, t: 'Carnet de commandes record de 9 M$.', src: null, alt: { t: 'Carnet de commandes au 30 septembre 2026, détaillé par projet.', src: '04-04' } }], generated: false, decisions: {}, approved: null },
      exclusions: {}, shortlist: [],
      room: { status: { '06-05': 'a_demander' }, defaultStatus: 'a_demander', extra: [['02-06', '02', 'Avis de faillite du client (créance 2025)']], names: { '07-02': 'Bail avec Immeubles M.G. inc.' }, docs: [], requested: null, due: {}, late: ['07-05'] },
      plan: { marketWeeks: 3 }
    }));
    return list;
  }

  /* ---------------- Mémoire institutionnelle ---------------- */
  var CLOSED = [ // dossiers clôturés (durées par intervalle, en jours)
    { code: 'M-2025-004', codename: 'Projet Macreuse', closed: '2025-11-28', ev: 1250000, fee: 115000, intervals: { package: 48, nda: 24, loi: 41, diligence: 68, closing: 25 } },
    { code: 'M-2025-007', codename: 'Projet Fou-de-Bassan', closed: '2026-03-20', ev: 2050000, fee: 161000, intervals: { package: 62, nda: 30, loi: 35, diligence: 81, closing: 30 } },
    { code: 'M-2026-003', codename: 'Projet Bernache', closed: '2026-08-28', ev: 1300000, fee: 118000, intervals: { package: 45, nda: 19, loi: 33, diligence: 59, closing: 22 } }
  ];
  var INTERVALS = [
    { id: 'package', label: 'Mandat signé à la mise en marché', from: 'signe', to: 'marche' },
    { id: 'nda', label: 'Mise en marché aux ententes signées', from: 'marche', to: 'fenetre' },
    { id: 'loi', label: 'Ententes aux lettres d’intention', from: 'fenetre', to: 'negociation' },
    { id: 'diligence', label: 'Vérification diligente', from: 'diligence', to: 'cloture' },
    { id: 'closing', label: 'Diligence à la clôture notariée', from: 'cloture', to: 'conclu' }
  ];
  var BUYER_MANDATES = [
    { id: 'bm1', client: 'Placements Rive-Sud SEC', buyer: 'b8', brief: 'Immeubles industriels loués, Rive-Sud', stage: 'Recherche active', retainer: 3500, since: '2026-06-01' },
    { id: 'bm2', client: 'Holding Mercier-Doyon', buyer: null, brief: 'Distribution B2B, 2 à 6 M$ de ventes', stage: 'Cible présentée', retainer: 2500, since: '2026-04-15' }
  ];
  var PROSPECT_STAGES = [
    { id: 'prospect', label: 'Prospect' }, { id: 'contacte', label: 'Contacté' }, { id: 'audit_planifie', label: 'Audit planifié' },
    { id: 'audit_tenu', label: 'Audit tenu' }, { id: 'preparation', label: 'Rapport vendu ou en préparation' }, { id: 'pret', label: 'Prêt à mandater' }, { id: 'perdu', label: 'Perdu ou refusé' }
  ];
  var MANDATE_STAGES = [
    { id: 'signe', label: 'Mandat signé', typical: 7 },
    { id: 'preparation', label: 'Préparation', typical: 49 },
    { id: 'marche', label: 'Mise en marché', typical: 28 },
    { id: 'fenetre', label: 'Fenêtre de LI', typical: 21 },
    { id: 'negociation', label: 'Négociation', typical: 25 },
    { id: 'diligence', label: 'Vérification diligente', typical: 63 },
    { id: 'cloture', label: 'Clôture', typical: 25 },
    { id: 'conclu', label: 'Conclu', typical: null }
  ];

  /* ---------------- Conformité ---------------- */
  var GATES = [
    { id: 'g1', label: 'Inscription LNNTE au dossier', status: 'ok', detail: 'Inscription du télévendeur consignée; abonnement requis seulement pour les appels non exemptés', owner: 'Administratrice' },
    { id: 'g2', label: 'Liste interne d’exclusion', status: 'ok', detail: '41 numéros, alimentée par les refus et retraits', owner: 'Tous' },
    { id: 'g3', label: 'Fraîcheur de la vérification LNNTE', status: 'ok', detail: 'Dernière vérification le 2026-10-05 (fenêtre de 31 jours)', owner: 'Administratrice' },
    { id: 'g4', label: 'Heures d’appel', status: 'ok', detail: '9 h à 20 h en semaine, 10 h à 18 h la fin de semaine, heure du destinataire', owner: 'Administratrice' },
    { id: 'g5', label: 'Identification de l’appelant', status: 'ok', detail: 'Numéros 418 et 581 légitimes et rappelables', owner: 'Administratrice' },
    { id: 'g6', label: 'Enregistrement des appels', status: 'off', detail: 'Désactivé par défaut : aucun régime d’autorisation configuré', owner: 'Conseiller juridique' },
    { id: 'g7', label: 'EFVP des fournisseurs', status: 'warn', detail: '2 fournisseurs sans EFVP complétée : flux de renseignements personnels bloqués', owner: 'Responsable de la protection des renseignements personnels' }
  ];
  var VENDORS = [
    { id: 'v1', name: 'Supabase', use: 'Base de données, authentification, stockage', location: 'Canada (Centre), Montréal', efvp: 'complete', date: '2026-08-30', agreement: true },
    { id: 'v2', name: 'Vercel', use: 'Hébergement de l’application', location: 'Hors Québec (réseau mondial)', efvp: 'complete', date: '2026-09-04', agreement: true },
    { id: 'v3', name: 'VoIP.ms', use: 'Appels humains', location: 'Canada', efvp: 'complete', date: '2026-09-11', agreement: true },
    { id: 'v4', name: 'Twilio', use: 'Textos', location: 'États-Unis', efvp: 'en_cours', date: null, agreement: false },
    { id: 'v5', name: 'OpenRouter et fournisseurs amont', use: 'Passerelle de modèles IA', location: 'États-Unis et autres', efvp: 'en_cours', date: null, agreement: false },
    { id: 'v6', name: 'n8n (auto-hébergé)', use: 'Automatisations', location: 'Montréal', efvp: 'complete', date: '2026-09-20', agreement: true },
    { id: 'v7', name: 'Signature électronique', use: 'Mandats, ententes, LI', location: 'Fournisseur à choisir', efvp: 'a_faire', date: null, agreement: false }
  ];
  var CONSENT_DIST = [ // base de consentement des adresses courriel du corpus (fictif)
    { id: 'expres', label: 'Consentement exprès', n: 214 }, { id: 'relation', label: 'Relation d’affaires', n: 96 },
    { id: 'demande', label: 'Demande d’information', n: 58 }, { id: 'publication', label: 'Publication bien en vue', n: 1032 },
    { id: 'aucun', label: 'Aucun fondement', n: 4807 }, { id: 'supprime', label: 'Supprimé', n: 63 }
  ];
  var DNC_SEED = [
    { value: '(418) 555-0128', company: 'Ébénisterie Rodrigue ltée', date: '2026-03-12', source: 'Disposition « retiré de la liste »' },
    { value: '(581) 555-0114', company: 'Boulangerie Vachon & Filles', date: '2026-02-03', source: 'Demande entrante par courriel' },
    { value: '(418) 555-0186', company: 'Pavage Labbé inc.', date: '2025-12-15', source: 'Désabonnement courriel (téléphone lié)' }
  ];
  var REGULATORY = [
    { id: 'amf', title: 'AMF : vente partielle d’actions', text: 'Une vente partielle d’actions peut relever des valeurs mobilières. Le champ « structure de transaction » de chaque mandat déclenche une bannière non masquable tant qu’un conseiller juridique n’a pas validé l’encadrement.', status: 'À valider par un avocat en valeurs mobilières' },
    { id: 'oaciq', title: 'OACIQ : jambe immobilière', text: 'La vente de l’immeuble passe par une agence partenaire titulaire de permis. La représentation de plusieurs parties exige une divulgation à valider avec l’OACIQ.', status: 'À valider auprès de l’OACIQ et de l’agence' },
    { id: 'lcap', title: 'LCAP : courriels et textos', text: 'Aucun envoi sans fondement de consentement valide. Une adresse tirée d’un annuaire ne qualifie pas comme publication bien en vue.', status: 'Barrière active' },
    { id: 'crtc', title: 'CRTC : appels de télémarketing', text: 'Les appels interentreprises à des numéros d’affaires sont exemptés des règles de la LNNTE, pas des autres règles. La liste interne d’exclusion reste obligatoire.', status: 'Barrière active' },
    { id: 'loi25', title: 'Loi 25 : renseignements personnels', text: 'EFVP du système et de chaque flux hors Québec, caviardage des noms d’administrateurs dans les requêtes IA, demandes d’accès et registre d’incidents.', status: 'EFVP du système complétée le 2026-08-30' }
  ];

  /* ---------------- Formation : Salle de formation (annexe B) ---------------- */
  var CURRICULUM = [
    { id: 1, title: 'Fondamentaux du transfert d’entreprise', chapters: 5, lessons: 18, color: 's1', gate: true },
    { id: 2, title: 'Comptabilité et lecture des états financiers', chapters: 7, lessons: 27, color: 's2' },
    { id: 3, title: 'Évaluation d’entreprise', chapters: 6, lessons: 21, color: 's3' },
    { id: 4, title: 'Fiscalité de la vente', chapters: 10, lessons: 29, color: 's4' },
    { id: 5, title: 'Financement d’acquisition et créanciers', chapters: 9, lessons: 33, color: 's5' },
    { id: 6, title: 'Le processus de transaction', chapters: 11, lessons: 42, color: 's6' },
    { id: 7, title: 'Prospection, acheteurs et vente du mandat', chapters: 9, lessons: 36, color: 's7' },
    { id: 8, title: 'Conformité et éthique', chapters: 4, lessons: 21, color: 's8', gate: true }
  ];
  var EXAM_S8 = [
    { q: 'Une adresse courriel trouvée dans un annuaire d’entreprises en ligne peut-elle fonder un consentement « publication bien en vue » ?', options: ['Oui, si l’adresse est publique', 'Non, une source d’annuaire ne qualifie pas', 'Oui, si le message est pertinent'], a: 1, why: 'Les sources d’annuaire ou d’agrégateur ne qualifient jamais (§14.2). L’adresse est conservée pour le téléphone seulement, avec un fondement « aucun ».' },
    { q: 'Un cédant vous dit « Ne me rappelez plus ». Que faites-vous ?', options: ['Je note un rappel dans 6 mois', 'J’inscris le numéro à la liste interne d’exclusion, immédiatement', 'Je demande l’accord de la courtière'], a: 1, why: 'La disposition « retiré de la liste » écrit immédiatement à la liste interne d’exclusion, sans confirmation, irréversible par un non-administrateur.' },
    { q: 'Un acheteur refuse le dossier Outarde parce qu’il le juge trop petit. Quelle est la bonne saisie ?', options: ['Ajouter l’acheteur à la liste d’exclusion', 'Un refus structuré « trop petit »; l’acheteur reste admissible ailleurs', 'Supprimer la fiche acheteur'], a: 1, why: 'Un refus commercial n’est pas un retrait des communications. Il enrichit les critères inférés et relance l’appariement inverse.' },
    { q: 'Mardi, 20 h 30, heure du destinataire : pouvez-vous appeler un numéro d’affaires ?', options: ['Oui, c’est un appel interentreprises', 'Non, les heures d’appel se terminent à 20 h en semaine', 'Oui, si le prospect a déjà été contacté'], a: 1, why: 'Les heures d’appel sont une barrière ferme : 9 h à 20 h en semaine, 10 h à 18 h la fin de semaine.' },
    { q: 'Peut-on envoyer les noms des administrateurs à un fournisseur de modèles hors Québec dont l’EFVP n’est pas complétée ?', options: ['Oui, avec un engagement de non-rétention', 'Non : caviardage par défaut et EFVP préalable', 'Oui, si le cédant y consent verbalement'], a: 1, why: 'Loi 25 : toute communication hors Québec exige une EFVP et une entente écrite. Le caviardage des noms est la voie par défaut.' }
  ];

  var COPILOT_SAMPLES = [
    'Qui pourrait acheter le mandat M-2026-014 ?',
    'Pourquoi tu me proposes Groupe Industriel Lacasse ?',
    'Est-ce qu’on a déjà approché Groupe Usinex Québec ?',
    'C’est quoi la différence entre une vente d’actions et une vente d’actifs ?',
    'Combien vaut Usinage Beaucage ?',
    'Qui pourrait acheter le Projet Pluvier ?'
  ];

  var AI_CAPABILITIES = [
    'Deal Hunter', 'Origination Agent', 'Seller Interviewer', 'Financial Forensics', 'Valuation & Structuring', 'Deal Packaging',
    'Buyer Discovery & Matching', 'Due Diligence', 'Negotiation Copilot', 'Deal Execution', 'Business + Real Estate', 'Institutional Memory'
  ];

  g.DATA = {
    TODAY: TODAY, START_MIN: START_MIN, TEAM: TEAM, ROLE_USER: ROLE_USER, ROLE_LABEL: ROLE_LABEL, SECTORS: SECTORS, ADJACENT: ADJACENT, REGIONS: REGIONS, NEAR: NEAR, LAUNCH_REGIONS: LAUNCH_REGIONS, PLACES: PLACES,
    FEE_POLICIES: FEE_POLICIES, BUYERS: BUYERS, BUYER_TYPES: BUYER_TYPES, TIMELINES: TIMELINES, STRUCT_LABEL: STRUCT_LABEL, WEIGHTS: WEIGHTS, UNIVERSE: UNIVERSE,
    SIGNAL_TYPES: SIGNAL_TYPES, SECTOR_RATES: SECTOR_RATES, COMPANIES: COMPANIES, PRESETS: PRESETS, DISPOSITIONS: DISPOSITIONS, INTAKE_KEYS: INTAKE_KEYS, INTAKE_FORM: INTAKE_FORM,
    ACCEPTANCE_OPTIONS: ACCEPTANCE_OPTIONS, ROOM_TEMPLATE: ROOM_TEMPLATE, ITEM_STATUS: ITEM_STATUS, DEFAULT_GRANT_FOLDERS: DEFAULT_GRANT_FOLDERS,
    REFUSAL_REASONS: REFUSAL_REASONS, LOSS_REASONS: LOSS_REASONS, FINANCING: FINANCING, BIRDS: BIRDS, seedMandates: seedMandates,
    CLOSED: CLOSED, INTERVALS: INTERVALS, BUYER_MANDATES: BUYER_MANDATES, PROSPECT_STAGES: PROSPECT_STAGES, MANDATE_STAGES: MANDATE_STAGES,
    GATES: GATES, VENDORS: VENDORS, CONSENT_DIST: CONSENT_DIST, DNC_SEED: DNC_SEED, REGULATORY: REGULATORY, CURRICULUM: CURRICULUM, EXAM_S8: EXAM_S8,
    COPILOT_SAMPLES: COPILOT_SAMPLES, AI_CAPABILITIES: AI_CAPABILITIES
  };
})(window);
