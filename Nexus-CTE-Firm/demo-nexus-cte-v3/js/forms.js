/* Nexus CTE V3 — formulaires de création et de modification (mandats, états financiers, retraitements, acheteurs, pistes,
   lettres d'intention, accès), confirmations de suppression et aperçus filigranés. La validation finale est dans le store. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, S = g.S, R = g.R, UI = g.UI, C = UI.C, esc = U.esc;
  var previews = {}; // aperçus en mémoire (texte ou image) : jamais persistés
  function sectorOpts() { return D.SECTORS.map(function (s) { return [s.code, s.code + ' — ' + s.label]; }); }
  function regionOpts() { return D.REGIONS.slice().sort().map(function (r) { return [r, r]; }); }
  function err(f, msg) { var el = f.querySelector('.form-error'); if (el) { el.textContent = msg || ''; el.hidden = !msg; if (msg) el.scrollIntoView({ block: 'nearest' }); } }
  function val(f, n) { var el = f.elements[n]; return el ? (el.type === 'checkbox' ? el.checked : el.value) : ''; }
  function confirmModal(title, body, ui, data, label) {
    var attrs = Object.keys(data || {}).map(function (k) { return ' data-' + k + '="' + esc(data[k]) + '"'; }).join('');
    UI.modal('<h2 id="modal-title">' + esc(title) + '</h2><p>' + esc(body) + '</p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="button" class="btn btn-danger" data-ui="' + ui + '"' + attrs + ' data-key="confirm-do">' + esc(label || 'Supprimer') + '</button></div>');
  }
  function runClose(action, p, f) { var r = UI.run(action, p); if (r && r.ok) UI.closeModal(); else if (f) err(f, r && r.msg); return r; }

  /* ================= Nouveau mandat (page complète) ================= */
  var SAMPLE = { company: 'Fabrication Démo Tremblay inc.', neq: '1199 000 001', registered: '1999-05-04', scian: '332710', city: 'Lévis', region: 'Chaudière-Appalaches', employees: '16', owner: 'Lucie Tremblay', ownerAge: '63', engagement: 'Mission d’examen', ownerDependency: 'élevée', topClientPct: '35', recurringPct: '55', structure: 'actions100', propertyValue: '1 200 000', marketRent: '96 000', rentPaid: '72 000', propco: 'Immeubles L. Tremblay inc.', debt: '150 000', cash: '80 000', wcTarget: '400 000', highlights: 'Seul fabricant de la Beauce certifié AS9100\nClientèle industrielle fidèle depuis 20 ans', claims: 'L’équipe tourne sans la propriétaire.',
    lastYear: '2025', rows: { 2023: ['3 900 000', '2 600 000', '620 000', '210 000', '72 000'], 2024: ['4 150 000', '2 760 000', '640 000', '215 000', '72 000'], 2025: ['4 420 000', '2 930 000', '660 000', '220 000', '72 000'] }, replacementSalary: '140 000', personal: '12 000', ledger: '5710 Honoraires juridiques, litige : 2023 9 000 ; 2024 10 000 ; 2025 9 500' };
  function finRows(prefix, ys, rows) {
    var labels = [['revenue', 'Ventes'], ['cogs', 'Coût des ventes'], ['opex', 'Frais d’exploitation (hors dirigeant)'], ['owner', 'Rémunération du dirigeant'], ['rent', 'Loyer à une société liée (facultatif)']];
    return '<div class="table-wrap"><table class="ledger fin-grid"><thead><tr><th scope="col">Poste ($)</th>' + ys.map(function (y) { return '<th scope="col" class="num">' + y + '</th>'; }).join('') + '</tr></thead><tbody>' + labels.map(function (l, li) {
      return '<tr><th scope="row">' + esc(l[1]) + '</th>' + ys.map(function (y, yi) { var v = rows && rows[y] ? rows[y][li] : ''; return '<td><input class="num-in" name="' + prefix + y + '-' + l[0] + '" value="' + esc(v == null ? '' : v) + '" inputmode="numeric" aria-label="' + esc(l[1]) + ' ' + y + '" data-key="fin-' + y + '-' + l[0] + '"></td>'; }).join('') + '</tr>';
    }).join('') + '</tbody><tfoot><tr><th scope="row">BAIIA calculé</th>' + ys.map(function (y) { return '<td class="num total" data-ebitda="' + y + '">—</td>'; }).join('') + '</tr></tfoot></table></div>';
  }
  function finBlock(prefix, ly, rows, a) {
    var ys = [ly - 2, ly - 1, ly];
    a = a || {};
    return '<div class="fin-form" data-prefix="' + prefix + '"><label class="field field-inline"><span>Dernier exercice clos</span><select name="lastYear" data-key="fin-last">' + [2025, 2024].map(function (y) { return '<option' + (y === ly ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select></label>' + finRows(prefix, ys, rows) +
      '<h3 class="sub-h">Hypothèses de retraitement (règles)</h3><div class="form-grid">' + C.field('Salaire de remplacement du dirigeant ($)', C.input('replacementSalary', a.replacementSalary || '150 000', { mode: 'numeric' }), { hint: 'Coût d’un directeur général de remplacement, charges incluses' }) + C.field('Dépenses personnelles annuelles ($)', C.input('personal', a.personal || '', { mode: 'numeric' }), { hint: 'Véhicule, assurance-vie, etc.' }) + '</div>' +
      C.field('Grand livre ou notes (facultatif)', '<textarea name="ledger" rows="4" spellcheck="false" data-key="fin-ledger">' + esc(a.ledger || '') + '</textarea>', { hint: 'Une ligne par compte : « 5410 Véhicule personnel : 2023 14 000 ; 2024 14 500 ; 2025 15 000 »' }) + '</div>';
  }
  function finData(f) {
    var ly = +val(f, 'lastYear') || 2025, ys = [ly - 2, ly - 1, ly], rows = {};
    ys.forEach(function (y) { rows[y] = {}; ['revenue', 'cogs', 'opex', 'owner', 'rent'].forEach(function (k) { rows[y][k] = val(f, 'f' + y + '-' + k); }); });
    return { fin: { lastYear: ly, rows: rows }, assumptions: { replacementSalary: val(f, 'replacementSalary'), personal: val(f, 'personal'), ledger: val(f, 'ledger') } };
  }
  function recalc(form) {
    var ly = +((form.elements.lastYear || {}).value) || 2025;
    [ly - 2, ly - 1, ly].forEach(function (y) {
      var g2 = function (k) { var el = form.elements['f' + y + '-' + k]; return el ? U.parseAmount(el.value) : null; };
      var r = g2('revenue'), c = g2('cogs'), o = g2('opex'), w = g2('owner'), rent = g2('rent') || 0, cell = form.querySelector('[data-ebitda="' + y + '"]');
      if (!cell) return;
      if (r == null || c == null || o == null || w == null) { cell.textContent = '—'; cell.className = 'num total'; return; }
      var e = r - c - o - w - rent; cell.textContent = U.typo(U.money(e)); cell.className = 'num total ' + (e > 0 ? 'txt-teal' : 'txt-brick');
    });
  }
  document.addEventListener('input', function (e) { var ff = e.target.closest('.fin-form'); if (ff) recalc(ff.closest('form')); var lf = e.target.closest('.loi-form'); if (lf) loiCalc(lf); });
  document.addEventListener('change', function (e) {
    if (e.target.name === 'lastYear' && e.target.closest('.fin-form')) {
      var form = e.target.closest('form'), ly = +e.target.value, wrap = form.querySelector('.fin-grid').parentNode, data = {};
      wrap.outerHTML = finRows('f', [ly - 2, ly - 1, ly], data); recalc(form);
    }
  });
  UI.FIN = {
    form: function (m) {
      var inp = m.fin.input, ly = inp ? inp.lastYear : 2025, rows = {};
      if (inp) [ly - 2, ly - 1, ly].forEach(function (y) { var r = inp.rows[y] || {}; rows[y] = [r.revenue, r.cogs, r.opex, r.owner, r.rent]; });
      else if (m.fin.entered) { ly = m.fin.years[2]; m.fin.years.forEach(function (y) { rows[y] = [m.fin.revenue[y], '', '', '', '']; }); }
      return '<form class="stmt-form" data-ui-form="fin" data-m="' + m.id + '" novalidate><p class="cell-sub">Saisissez trois exercices consécutifs tels qu’ils figurent aux états financiers. Le BAIIA se calcule ligne par ligne; à l’enregistrement, le moteur de règles propose des retraitements que l’analyste décide un à un.</p>' + finBlock('f', ly, rows, inp ? {} : {}) +
        '<p class="form-error" role="alert" hidden></p><div class="actions">' + (S.P.financials() ? '<button type="submit" class="btn btn-primary" data-key="fin-save">Enregistrer les états financiers</button>' : '') + '<button type="button" class="btn btn-ghost" data-ui="fin-sample">Remplir un exemple</button>' + (m.fin.entered ? '<button type="button" class="btn btn-ghost" data-ui="fin-cancel" data-m="' + m.id + '">Annuler</button>' : '') + '</div></form>';
    }
  };
  // Exemple mis à l'échelle du chiffre d'affaires estimé à l'audit de sortie quand il existe (piste convertie en mandat).
  UI.UIA['fin-sample'] = function (p, el) {
    var f = el.closest('form'), m = S.mandate(f.getAttribute('data-m')), est = m && m.profile.revenueEst, k = est ? est / U.parseAmount(SAMPLE.rows[2025][0]) : 1;
    var sc = function (v) { return k === 1 ? v : U.num(Math.round(U.parseAmount(v) * k / 1000) * 1000); };
    f.elements.lastYear.value = '2025';
    [2023, 2024, 2025].forEach(function (y) { ['revenue', 'cogs', 'opex', 'owner', 'rent'].forEach(function (key, i) { var e = f.elements['f' + y + '-' + key]; if (e) e.value = sc(SAMPLE.rows[y][i]); }); });
    f.elements.replacementSalary.value = sc(SAMPLE.replacementSalary); f.elements.personal.value = SAMPLE.personal; f.elements.ledger.value = SAMPLE.ledger; recalc(f);
    if (k !== 1) UI.toast('Exemple ajusté au chiffre d’affaires estimé à l’audit (' + U.money(est) + ').');
  };
  UI.FORMS.fin = function (f) {
    var d = finData(f), r = S.dispatch('finSave', { m: f.getAttribute('data-m'), fin: d.fin, assumptions: d.assumptions });
    if (!r.ok) { err(f, r.msg); UI.toast(r.msg, 'err'); return; }
    UI.DOSSIER.local.editFin[f.getAttribute('data-m')] = false; UI.render(); UI.toast(r.msg);
  };

  UI.VIEWS['mandate-new'] = function () {
    if (!S.P.decideMandate()) return '<div class="page"><header class="page-head"><h1>Nouveau mandat</h1></header>' + C.roleNote('Seule la courtière responsable ouvre un mandat.') + '</div>';
    var opt = function (list, v) { return list; };
    return '<div class="page"><header class="page-head"><h1>Nouveau mandat</h1><p class="lead">Un mandat saisi de zéro suit exactement le même processus que les dossiers semés : états financiers, retraitement, évaluation, sommaire, acheteurs, salle de données, lettres d’intention et clôture. Les données sont fictives et restent dans ce navigateur.</p></header>' +
      '<form class="sheet mandate-form" data-ui-form="mandate-new" novalidate><div class="actions"><button type="button" class="btn btn-ghost btn-sm" data-ui="mandate-sample" data-key="mandate-sample">Remplir un exemple fictif</button></div>' +
      '<h2 class="sub-h">Entreprise et cédant</h2><div class="form-grid">' +
      C.field('Raison sociale', C.input('company', '', { req: true, key: 'nm-company' }), { req: true }) + C.field('NEQ', C.input('neq', '', { ph: '1199 000 001' })) + C.field('Date d’immatriculation', C.input('registered', '', { type: 'date', req: true, key: 'nm-registered' }), { req: true }) +
      C.field('Secteur SCIAN', C.select('scian', sectorOpts(), '332710', { key: 'nm-scian' }), { req: true, hint: 'Détermine le jeu de multiples de marché' }) + C.field('Ville', C.input('city', '')) + C.field('Région administrative', C.select('region', regionOpts(), 'Chaudière-Appalaches', { key: 'nm-region' }), { req: true }) +
      C.field('Effectif', C.input('employees', '', { mode: 'numeric', req: true, key: 'nm-employees' }), { req: true }) + C.field('Cédant (nom)', C.input('owner', '', { req: true, key: 'nm-owner' }), { req: true }) + C.field('Âge du cédant', C.input('ownerAge', '', { mode: 'numeric' })) +
      C.field('États financiers', C.select('engagement', ['Mission d’examen', 'Avis au lecteur', 'Audit'], 'Mission d’examen')) + C.field('Dépendance au dirigeant', C.select('ownerDependency', [['faible', 'Faible'], ['moyenne', 'Moyenne'], ['élevée', 'Élevée']], 'moyenne')) + C.field('Structure', C.select('structure', [['actions100', 'Vente d’actions, 100 %'], ['actionsPartielle', 'Vente d’actions, partielle'], ['actifs', 'Vente d’actifs']], 'actions100')) +
      C.field('Premier client (% des ventes)', C.input('topClientPct', '', { mode: 'numeric' })) + C.field('Ventes récurrentes (%)', C.input('recurringPct', '', { mode: 'numeric' })) + C.field('CPA du cédant', C.input('cpa', '')) + '</div>' +
      '<h2 class="sub-h">Immeuble et pont de valeur</h2><div class="form-grid">' + C.field('Valeur de l’immeuble ($, vide si locataire)', C.input('propertyValue', '', { mode: 'numeric' })) + C.field('Loyer marchand annuel ($)', C.input('marketRent', '', { mode: 'numeric' })) + C.field('Loyer payé annuel ($)', C.input('rentPaid', '', { mode: 'numeric' })) + C.field('Société immobilière', C.input('propco', '')) +
      C.field('Dette portant intérêt ($)', C.input('debt', '', { mode: 'numeric' })) + C.field('Encaisse excédentaire ($)', C.input('cash', '', { mode: 'numeric' })) + C.field('Fonds de roulement normalisé ($)', C.input('wcTarget', '', { mode: 'numeric' })) + '</div>' +
      '<h2 class="sub-h">États financiers de trois exercices</h2>' + finBlock('f', 2025, {}, {}) +
      '<h2 class="sub-h">Pour le sommaire et le cahier</h2><div class="form-grid form-grid-2">' + C.field('Points saillants (une ligne chacun; la vérification des noms passe dessus)', '<textarea name="highlights" rows="3"></textarea>') + C.field('Affirmations du cédant à sourcer (une ligne chacune)', '<textarea name="claims" rows="3"></textarea>') + '</div>' +
      '<p class="form-error" role="alert" hidden></p><div class="actions"><button type="submit" class="btn btn-primary btn-lg" data-key="nm-submit">Créer le mandat</button><a class="btn btn-ghost" href="#/dossiers">Annuler</a></div></form></div>';
  };
  UI.UIA['mandate-sample'] = function (p, el) {
    var f = el.closest('form');
    ['company', 'neq', 'registered', 'scian', 'city', 'region', 'employees', 'owner', 'ownerAge', 'engagement', 'ownerDependency', 'topClientPct', 'recurringPct', 'structure', 'propertyValue', 'marketRent', 'rentPaid', 'propco', 'debt', 'cash', 'wcTarget', 'highlights', 'claims', 'replacementSalary', 'personal', 'ledger'].forEach(function (k) { if (f.elements[k]) f.elements[k].value = SAMPLE[k]; });
    [2023, 2024, 2025].forEach(function (y) { ['revenue', 'cogs', 'opex', 'owner', 'rent'].forEach(function (k, i) { var e = f.elements['f' + y + '-' + k]; if (e) e.value = SAMPLE.rows[y][i]; }); });
    recalc(f);
  };
  UI.FORMS['mandate-new'] = function (f) {
    var data = {}; ['company', 'neq', 'registered', 'scian', 'city', 'region', 'employees', 'owner', 'ownerAge', 'engagement', 'ownerDependency', 'topClientPct', 'recurringPct', 'structure', 'propertyValue', 'marketRent', 'rentPaid', 'propco', 'debt', 'cash', 'wcTarget', 'highlights', 'claims', 'cpa'].forEach(function (k) { data[k] = val(f, k); });
    var d = finData(f), hasFin = ['revenue', 'cogs', 'opex', 'owner'].some(function (k) { return String(d.fin.rows[d.fin.lastYear][k] || '').trim(); });
    var r = S.dispatch('mandateCreate', { data: data, fin: hasFin ? d.fin : null, assumptions: d.assumptions });
    if (!r.ok && !r.id) { err(f, r.msg); UI.toast(r.msg, 'err'); return; }
    location.hash = '#/dossier/' + r.id + '/retraitement';
    UI.toast(r.msg, r.ok ? '' : 'err');
  };

  /* ================= Mandat : modification et suppression ================= */
  UI.UIA['mandate-edit'] = function (p) {
    var m = S.mandate(p.m), q = m.profile;
    UI.modal('<h2 id="modal-title">Modifier la fiche : ' + esc(m.codename) + '</h2><form data-ui-form="mandate-edit" data-m="' + m.id + '" novalidate><div class="form-grid">' +
      C.field('Nom de code', C.input('codename', m.codename)) + C.field('Raison sociale', C.input('company', q.company)) + C.field('Ville', C.input('city', q.city)) + C.field('Région', C.select('region', regionOpts(), q.region)) +
      C.field('Effectif', C.input('employees', q.employees, { mode: 'numeric' })) + C.field('Cédant', C.input('owner', q.owner)) + C.field('Âge du cédant', C.input('ownerAge', q.ownerAge || '', { mode: 'numeric' })) + C.field('Dépendance au dirigeant', C.select('ownerDependency', [['faible', 'Faible'], ['moyenne', 'Moyenne'], ['élevée', 'Élevée']], q.ownerDependency)) +
      C.field('Premier client (%)', C.input('topClientPct', q.topClientPct, { mode: 'numeric' })) + C.field('Ventes récurrentes (%)', C.input('recurringPct', q.recurringPct, { mode: 'numeric' })) + C.field('CPA', C.input('cpa', q.cpa)) + C.field('Frais de préparation ($)', C.input('prepFee', m.prepFee, { mode: 'numeric' })) + '</div>' +
      '<p class="fineprint">Modifier la fiche invalide l’approbation du sommaire aveugle : la vérification des noms doit être refaite.</p><p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="submit" class="btn btn-primary">Enregistrer</button></div></form>', { wide: true });
  };
  UI.FORMS['mandate-edit'] = function (f) { var d = {}; ['codename', 'company', 'city', 'region', 'employees', 'owner', 'ownerAge', 'ownerDependency', 'topClientPct', 'recurringPct', 'cpa', 'prepFee'].forEach(function (k) { d[k] = val(f, k); }); runClose('mandateUpdate', { m: f.getAttribute('data-m'), data: d }, f); };
  UI.UIA['mandate-delete'] = function (p) { var m = S.mandate(p.m); confirmModal('Supprimer ' + m.codename + ' ?', 'Le mandat disparaît des tableaux, de la tour de contrôle et de la recherche; ses événements prévus sont annulés. Vous pourrez annuler depuis la notification qui suit.', 'mandate-delete-do', { m: m.id }, 'Supprimer le mandat'); };
  UI.UIA['mandate-delete-do'] = function (p) { UI.closeModal(); var r = UI.run('mandateDelete', { m: p.m }); if (r.ok) location.hash = '#/dossiers'; };

  /* ================= Retraitements ================= */
  function adjForm(m, a) {
    var ys = m.fin.years;
    return '<form data-ui-form="adj" data-m="' + m.id + '"' + (a ? ' data-id="' + a.id + '"' : '') + ' novalidate><div class="form-grid">' + C.field('Catégorie', C.select('cat', R.CATS, a ? a.cat : R.CATS[0])) + C.field('Défendabilité', C.select('rating', ['solide', 'défendable', 'agressif'], a ? a.rating : 'défendable')) + '</div>' +
      C.field('Libellé', C.input('label', a ? a.label : '', { key: 'adj-label' })) + '<div class="form-grid">' + ys.map(function (y) { return C.field('Effet sur le BAIIA ' + y + ' ($)', C.input('y' + y, a ? a.amounts[y] || 0 : '', { mode: 'numeric', key: 'adj-y' + y })); }).join('') + '</div>' +
      C.field('Justification', '<textarea name="why" rows="2">' + esc(a ? a.why : '') + '</textarea>') + C.field('Preuve', C.input('evidence', a ? a.evidence : '')) +
      '<p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="submit" class="btn btn-primary" data-key="adj-save">' + (a ? 'Enregistrer' : 'Ajouter') + '</button></div></form>';
  }
  UI.UIA['adj-new'] = function (p) { var m = S.mandate(p.m); UI.modal('<h2 id="modal-title">Ajouter un retraitement</h2><p class="cell-sub">Il entre en proposition : une décision reste nécessaire avant l’approbation.</p>' + adjForm(m), { wide: true }); };
  UI.UIA['adj-edit'] = function (p) { var m = S.mandate(p.m), a = E.byId(m.adjustments, p.id); UI.modal('<h2 id="modal-title">Modifier le retraitement ' + esc(a.id) + '</h2>' + adjForm(m, a), { wide: true }); };
  UI.FORMS.adj = function (f) {
    var m = S.mandate(f.getAttribute('data-m')), am = {}; m.fin.years.forEach(function (y) { am[y] = val(f, 'y' + y); });
    var d = { cat: val(f, 'cat'), rating: val(f, 'rating'), label: val(f, 'label'), amounts: am, why: val(f, 'why'), evidence: val(f, 'evidence') };
    runClose(f.getAttribute('data-id') ? 'adjEdit' : 'adjAdd', { m: m.id, id: f.getAttribute('data-id'), data: d }, f);
  };
  UI.UIA['reject-adj'] = function (p) {
    var m = S.mandate(p.m), a = E.byId(m.adjustments, p.id);
    var sugg = a.trap ? 'Dépense récurrente : montants semblables en ' + m.fin.years.join(', ') : '';
    UI.modal('<h2 id="modal-title">Rejeter le retraitement ' + esc(a.id) + '</h2><p>' + esc(a.label) + '</p><form data-ui-form="reject" data-m="' + m.id + '" data-id="' + a.id + '"><label class="field"><span>Motif du rejet (requis, il servira d’exemple pour les prochaines propositions)</span><textarea name="reason" rows="3" autofocus>' + esc(sugg) + '</textarea></label><p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="submit" class="btn btn-primary">Rejeter</button></div></form>');
  };
  UI.FORMS.reject = function (f) { runClose('adjDecide', { m: f.getAttribute('data-m'), id: f.getAttribute('data-id'), d: 'rejected', reason: f.elements.reason.value.trim() }, f); };

  /* ================= Sommaire aveugle : édition ================= */
  UI.UIA['teaser-edit'] = function (p) {
    var m = S.mandate(p.m), d = m.teaser.draft || [];
    var pick = function (k) { return d.filter(function (l) { return l.k === k; }).map(function (l) { return l.t; }); };
    UI.modal('<h2 id="modal-title">Modifier le sommaire aveugle</h2><p class="cell-sub">La vérification des noms et le test d’identifiabilité repassent à l’enregistrement. Essayez d’y écrire le nom du cédant ou sa ville.</p><form data-ui-form="teaser" data-m="' + m.id + '">' +
      C.field('Titre', C.input('title', pick('title')[0] || '', { key: 'tz-title' })) + C.field('Introduction', '<textarea name="intro" rows="3">' + esc(pick('intro').join('\n')) + '</textarea>') + C.field('Points saillants (une ligne chacun)', '<textarea name="hl" rows="5" data-key="tz-hl">' + esc(pick('hl').join('\n')) + '</textarea>') + C.field('Structure envisagée', '<textarea name="structure" rows="2">' + esc(pick('structure').join('\n')) + '</textarea>') +
      '<p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="submit" class="btn btn-primary" data-key="tz-save">Enregistrer et vérifier</button></div></form>', { wide: true });
  };
  UI.FORMS.teaser = function (f) {
    var lines = [{ k: 'title', t: val(f, 'title') }];
    ['intro', 'hl', 'structure'].forEach(function (k) { val(f, k).split(/\n+/).forEach(function (t) { if (t.trim()) lines.push({ k: k, t: t.trim() }); }); });
    runClose('teaserEdit', { m: f.getAttribute('data-m'), lines: lines }, f);
  };
  UI.UIA['teaser-ai'] = function (p) { g.AI.teaser(p.m); };

  /* ================= Acheteurs du mandat ================= */
  UI.UIA['ui-shortlist'] = function (p, el) {
    var b = S.buyer(p.id), m = S.mandate(p.m), adding = m.shortlist.indexOf(p.id) < 0;
    if (adding && m.cautions[p.id]) { el.checked = false; UI.modal('<h2 id="modal-title">Ajouter ' + esc(b.name) + ' ?</h2><p>' + esc(m.cautions[p.id]) + '</p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="button" class="btn btn-primary" data-ui="shortlist-confirm" data-m="' + m.id + '" data-id="' + b.id + '">Accord écrit du cédant obtenu : ajouter</button></div>'); return; }
    var r = UI.run('shortlist', { m: p.m, id: p.id }); if (!r.ok) UI.render();
  };
  UI.UIA['shortlist-confirm'] = function (p) { UI.closeModal(); UI.run('shortlist', { m: p.m, id: p.id, confirm: true }); };
  UI.UIA['exclude-ask'] = function (p) { var b = S.buyer(p.id); UI.modal('<h2 id="modal-title">Exclure ' + esc(b.name) + ' de ce dossier</h2><form data-ui-form="exclude" data-m="' + p.m + '" data-id="' + p.id + '"><label class="field"><span>Motif (demande du cédant, consigné au journal)</span><input name="reason" type="text" value="Concurrent exclu par le cédant (mandat exclusif, annexe B)" autofocus></label><p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="submit" class="btn btn-danger">Exclure</button></div></form>'); };
  UI.FORMS.exclude = function (f) { runClose('exclusionSet', { m: f.getAttribute('data-m'), id: f.getAttribute('data-id'), reason: val(f, 'reason') }, f); };
  UI.UIA['script-open'] = function (p) {
    var m = S.mandate(p.m), b = m.blind, fn = E.funnel(m, S.get()), u = fn[0].n;
    var red = [m.profile.city, m.profile.area].filter(Boolean).map(function (x) { return x + ' et toute adresse'; }).concat(R.tokens(m.profile.owner).slice(-1).map(function (x) { return 'Nom de famille du cédant (' + (S.P.identity() ? x : '…') + ')'; })).concat(m.redList || []).concat(['Le nom des clients et des fournisseurs']);
    UI.modal('<h2 id="modal-title">Script de divulgation, ' + esc(m.codename) + '</h2><p class="muted">Affiché dans le panneau d’appel des agents acheteurs pendant l’approche aveugle.</p><div class="grid-2 grid-tight"><div><h3 class="sub-h">Ce qui peut être dit</h3><ul class="script"><li>' + esc(E.capital(b.sector)) + '</li><li>Région : ' + esc(b.region) + '</li><li>Chiffre d’affaires de ' + esc(b.revenueBand) + '</li><li>' + esc(E.capital(b.age)) + ' d’exploitation, ' + esc(b.employeesBand) + '</li>' + (m.property ? '<li>Immeuble offert séparément ou avec l’entreprise</li>' : '') + '</ul></div><div><h3 class="sub-h">Liste rouge</h3><ul class="script red">' + red.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div>' +
      '<p class="fineprint">Univers énumérable : ' + u + ' sociétés' + (u >= 30 ? ', au-dessus du seuil de 30.' : ', sous le seuil de 30 : le cédant doit accepter par écrit le risque d’identification.') + '</p>' + (u < 30 ? '<label class="check"><input type="checkbox" id="script-ack"><span>Accord écrit du cédant sur le risque d’identification obtenu et versé au dossier</span></label>' : '') +
      '<div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="button" class="btn btn-primary" data-ui="script-save" data-m="' + m.id + '" data-key="script-save">Consigner le script</button></div>', { wide: true });
  };
  UI.UIA['script-save'] = function (p) { var ack = document.getElementById('script-ack'); var r = UI.run('scriptRecord', { m: p.m, ack: ack ? ack.checked : false }); if (r.ok) UI.closeModal(); };
  UI.UIA['funnel'] = function (p) {
    var st = S.get(), m = S.mandate(p.m), s = E.funnel(m, st)[+p.i];
    var items = s.list.map(function (e) { var fr = E.freshness(e.lastVerified, st.clock.d); return '<li><strong>' + esc(e.name) + '</strong><span>' + esc(D.BUYER_TYPES[e.type] || e.type) + ', ' + esc(String(e.angle || '').toLowerCase()) + (e.lastVerified ? ', ' + esc(fr.label.toLowerCase()) : ', non vérifié') + (e.excluded ? ', exclu (contrainte ferme)' : '') + (e.crm ? ', profil CRM' : '') + '</span></li>'; }).join('');
    UI.drawer('<div class="drawer-head"><h2 id="drawer-title">' + esc(s.label) + ' <span class="muted">' + s.n + '</span></h2><button type="button" class="icon-btn" data-ui="drawer-close" aria-label="Fermer">' + C.icon('x') + '</button></div><div class="drawer-body"><p class="cell-sub">' + esc(s.note) + '. Univers construit par adjacence SCIAN (horizontal, aval, amont), consolidateurs et acheteurs financiers, à partir du CRM et de l’univers généré. Entreprises fictives.</p><ul class="name-list">' + items + '</ul></div>');
  };
  UI.UIA['weights'] = function (p) { UI.run('weights', { value: p.value }); };
  UI.FORMS.refusal = function (f) { UI.run('refusal', { m: f.getAttribute('data-m'), id: f.getAttribute('data-id'), reason: f.elements.reason.value, note: f.elements.note.value }); };
  UI.FORMS.amf = function (f) { UI.run('amfValidate', { m: f.getAttribute('data-m'), note: f.elements.note.value }); };
  UI.FORMS.hold = function (f) { UI.run('holdResolve', { m: f.getAttribute('data-m'), note: f.elements.note.value }); };
  UI.FORMS['loi-deadline'] = function (f) { UI.run('loiDeadline', { m: f.getAttribute('data-m'), date: f.elements.date.value }); };

  /* ================= Lettres d'intention (saisie manuelle) ================= */
  function loiCalc(f) { var ev = U.parseAmount(f.elements.ev.value) || 0, bpv = U.parseAmount(f.elements.bpv.value) || 0, earn = U.parseAmount(f.elements.earnout.value) || 0, out = f.querySelector('[data-cash]'); if (out) out.textContent = U.typo(U.money(ev - bpv - earn)); }
  function nf(v) { return v == null || v === '' || isNaN(+v) ? (v == null ? '' : v) : U.num(+v); }
  function loiForm(m, l) {
    var signers = E.ndaSigned(m), st = S.get();
    if (!signers.length) return '<p class="notice">' + C.icon('lock') + '<span>Aucun acheteur n’a signé d’entente de confidentialité : une lettre d’intention exige une entente.</span></p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Fermer</button></div>';
    var v = E.valuation(m), def = l || { buyer: signers[0], ev: v.ev.mid, bpv: { amount: Math.round(v.ev.mid * 0.2 / 5000) * 5000, years: 5, rate: 0.06 }, earnout: 0, wcTarget: m.val.bridge.wcTarget, exclusivity: 90, close: U.addDays(st.clock.d, 84), financing: 'À obtenir', transition: '6 mois', employees: 'Engagement écrit de maintien, 24 mois', conditions: ['Vérification diligente de 60 jours'], leaseback: !!(m.property && m.property.investor) };
    return '<form class="loi-form" data-ui-form="loi" data-m="' + m.id + '"' + (l ? ' data-id="' + l.id + '"' : '') + ' novalidate><div class="form-grid">' +
      C.field('Acheteur (entente signée)', C.select('buyer', signers.map(function (id) { return [id, S.buyer(id).name]; }), def.buyer, { attrs: l ? ' disabled' : '' })) + C.field('Prix affiché ($)', C.input('ev', nf(def.ev), { mode: 'numeric', key: 'loi-ev' })) + C.field('Balance de prix de vente ($)', C.input('bpv', nf(def.bpv ? def.bpv.amount : 0), { mode: 'numeric' })) +
      C.field('BPV : durée (ans)', C.input('bpvYears', def.bpv ? def.bpv.years : 5, { mode: 'numeric' })) + C.field('BPV : taux (%)', C.input('bpvRate', def.bpv ? U.num(def.bpv.rate * 100, 1) : '6', { mode: 'decimal' })) + C.field('Complément de prix ($)', C.input('earnout', nf(def.earnout || 0), { mode: 'numeric' })) +
      C.field('Condition du complément', C.input('earnoutCond', def.earnoutCond || '')) + C.field('Fonds de roulement cible ($)', C.input('wcTarget', nf(def.wcTarget), { mode: 'numeric' })) + C.field('Mise de fonds de l’acquéreur ($)', C.input('equity', nf(def.equity != null ? def.equity : Math.round(def.ev * 0.2)), { mode: 'numeric' })) +
      C.field('Financement', C.select('financing', ['Approbation conditionnelle obtenue', 'Facilité de crédit en place', 'Fonds engagés', 'À obtenir'], def.financing)) + C.field('Exclusivité (jours)', C.input('exclusivity', def.exclusivity, { mode: 'numeric' })) + C.field('Clôture visée', C.input('close', def.close, { type: 'date' })) +
      C.field('Transition du cédant', C.input('transition', def.transition)) + C.field('Emplois', C.input('employees', def.employees)) + (m.property ? C.field('Immeuble', '<select name="leaseback"><option value="1"' + (def.leaseback ? ' selected' : '') + '>Cession-bail (investisseur)</option><option value=""' + (!def.leaseback ? ' selected' : '') + '>Achat par l’acquéreur</option></select>') + C.field('Prix offert pour l’immeuble ($)', C.input('propertyPrice', nf(def.propertyPrice || m.property.value), { mode: 'numeric' })) : '') + '</div>' +
      C.field('Conditions (une par ligne)', '<textarea name="conditions" rows="3">' + esc((def.conditions || []).join('\n')) + '</textarea>') + '<p class="cell-sub">Comptant à la clôture (calculé) : <strong data-cash>' + U.money(def.ev - (def.bpv ? def.bpv.amount : 0) - (def.earnout || 0)) + '</strong></p>' +
      '<p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="submit" class="btn btn-primary" data-key="loi-save">' + (l ? 'Enregistrer' : 'Consigner la lettre') + '</button></div></form>';
  }
  UI.UIA['loi-new'] = function (p) { UI.modal('<h2 id="modal-title">Consigner une lettre d’intention reçue</h2>' + loiForm(S.mandate(p.m)), { wide: true }); };
  UI.UIA['loi-edit'] = function (p) { var m = S.mandate(p.m); UI.modal('<h2 id="modal-title">Modifier la lettre d’intention</h2>' + loiForm(m, E.byId(m.lois, p.id)), { wide: true }); };
  UI.FORMS.loi = function (f) {
    var m = S.mandate(f.getAttribute('data-m')), id = f.getAttribute('data-id'), ev = U.parseAmount(val(f, 'ev')) || 0, bpv = U.parseAmount(val(f, 'bpv')) || 0, earn = U.parseAmount(val(f, 'earnout')) || 0;
    var d = { buyer: id ? E.byId(m.lois, id).buyer : val(f, 'buyer'), ev: val(f, 'ev'), cash: String(ev - bpv - earn), bpv: val(f, 'bpv'), bpvYears: val(f, 'bpvYears'), bpvRate: val(f, 'bpvRate'), earnout: val(f, 'earnout'), earnoutCond: val(f, 'earnoutCond'), wcTarget: val(f, 'wcTarget'), equity: val(f, 'equity'), financing: val(f, 'financing'), exclusivity: val(f, 'exclusivity'), close: val(f, 'close'), transition: val(f, 'transition'), employees: val(f, 'employees'), leaseback: f.elements.leaseback ? !!f.elements.leaseback.value : false, propertyPrice: val(f, 'propertyPrice'), conditions: val(f, 'conditions') };
    runClose(id ? 'loiEdit' : 'loiAdd', { m: m.id, id: id, data: d }, f);
  };

  /* ================= Salle de données : accès, aperçus, téléversement ================= */
  UI.UIA['grant-edit'] = function (p) {
    var m = S.mandate(p.m), gr = m.grants[p.id] || { folders: D.DEFAULT_GRANT_FOLDERS, expires: U.addDays(S.today(), 75) }, b = S.buyer(p.id);
    var exp = U.diffDays(gr.expires, S.today()) > 0 || gr.revoked ? U.addDays(S.today(), 30) : gr.expires;
    UI.modal('<h2 id="modal-title">Accès de ' + esc(b.name) + '</h2><form data-ui-form="grant" data-m="' + m.id + '" data-id="' + p.id + '"><fieldset><legend>Dossiers autorisés (filigrane nominatif sur chaque page)</legend><div class="check-grid">' + D.ROOM_TEMPLATE.map(function (f) { return '<label class="check"><input type="checkbox" name="f" value="' + f.id + '"' + (gr.folders.indexOf(f.id) >= 0 ? ' checked' : '') + '><span>' + f.id + ' ' + esc(f.name) + '</span></label>'; }).join('') + '</div></fieldset>' +
      C.field('Expiration', C.input('expires', exp, { type: 'date', key: 'grant-exp' })) + '<p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="submit" class="btn btn-primary" data-key="grant-save">Enregistrer l’accès</button></div></form>', { wide: true });
  };
  UI.FORMS.grant = function (f) {
    var folders = Array.prototype.filter.call(f.querySelectorAll('input[name=f]'), function (x) { return x.checked; }).map(function (x) { return x.value; });
    var m = S.mandate(f.getAttribute('data-m')), id = f.getAttribute('data-id');
    if (!m.grants[id]) { var days = U.diffDays(S.today(), val(f, 'expires')); runClose('grant', { m: m.id, id: id, folders: folders, days: days }, f); }
    else runClose('grantUpdate', { m: m.id, id: id, folders: folders, expires: val(f, 'expires') }, f);
  };
  function watermark(text) { return '<div class="wm-layer" aria-hidden="true">' + new Array(7).join('<span>' + esc(text) + '</span>') + '</div>'; }
  function previewBody(m, d, who) {
    var pv = previews[d.id];
    var content = pv && pv.kind === 'image' ? '<img src="' + pv.url + '" alt="Aperçu de ' + esc(d.name) + '">' : pv && pv.kind === 'text' ? '<pre>' + esc(pv.text.slice(0, 2400)) + '</pre>' : d.snippet ? '<pre>' + esc(d.snippet) + '</pre>' : '<p class="cell-sub">Aperçu indisponible pour ce type de fichier (' + esc(d.type || 'inconnu') + ') : métadonnées seulement. ' + (pv ? '' : 'Le contenu n’est conservé que dans l’onglet où il a été déposé.') + '</p>';
    return '<div class="wm-doc"><p class="wm-title">' + esc(d.name) + '</p><div class="wm-content">' + content + '</div>' + watermark(who + ' · ' + U.date(S.today()) + ' · ' + m.blindRef) + '</div><p class="fineprint">' + U.num((d.size || 0) / 1024, 0) + ' Ko' + (d.hash ? ', SHA-256 ' + esc(d.hash) : '') + '. Déposé par ' + esc(d.by) + ' le ' + esc(d.at.replace(/^(\d{4}-\d\d-\d\d)/, function (x) { return U.date(x); })) + '. Le filigrane nomme la personne qui consulte; les copies téléchargées ne peuvent pas être rappelées.</p>';
  }
  UI.UIA['doc-preview'] = function (p) { var m = S.mandate(p.m), d = E.byId(m.room.docs, p.id); if (!d) return; UI.modal('<h2 id="modal-title">Aperçu filigrané</h2>' + previewBody(m, d, S.actorName() + ' (interne)') + '<div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Fermer</button></div>', { wide: true }); S.dispatch('logOnly', { entity: m.code, action: 'Pièce consultée (interne)', detail: d.name, m: m.id, kind: 'room' }); };
  function buyerPreview(m, id, folder) {
    var b = S.buyer(id), gr = m.grants[id], active = E.grantActive(m, id, S.get());
    var list = D.ROOM_TEMPLATE.map(function (f) { var okF = active && gr.folders.indexOf(f.id) >= 0; return '<li class="' + (okF ? 'ok' : 'no') + (folder === f.id ? ' is-open' : '') + '"><button type="button" class="bp-f" data-ui="buyer-folder" data-m="' + m.id + '" data-id="' + id + '" data-f="' + f.id + '">' + C.icon(okF ? 'doc' : 'lock') + '<span>' + f.id + ' ' + esc(f.name) + '</span></button></li>'; }).join('');
    var content = '';
    if (folder) {
      var fo = E.roomFolders(m).filter(function (x) { return x.id === folder; })[0], okF2 = active && gr.folders.indexOf(folder) >= 0;
      content = okF2 ? '<div class="wm-doc"><p class="wm-title">' + folder + ' ' + esc(fo.name) + '</p><ul class="wm-items">' + fo.items.filter(function (it) { return E.itemStatus(m, it.id) === 'revise'; }).map(function (it) { return '<li>' + it.id + ' ' + esc(it.name) + '</li>'; }).join('') + (m.room.docs || []).filter(function (d) { return d.folder === folder; }).map(function (d) { return '<li>' + esc(d.name) + '</li>'; }).join('') + '</ul>' + watermark(b.name + ' · ' + U.date(S.today()) + ' · ' + m.blindRef) + '</div>' : '<p class="notice">' + C.icon('lock') + '<span>Accès refusé : dossier hors permission, accès expiré ou révoqué. La tentative est consignée au journal d’accès.</span></p>';
    }
    return '<h2 id="modal-title">Vue de ' + esc(b.name) + ' (simulée)</h2><p class="cell-sub">' + (active ? 'Accès actif jusqu’au ' + U.date(gr.expires) + '.' : gr ? 'Accès inactif (' + (gr.revoked ? 'révoqué' : 'expiré') + ').' : 'Aucun accès.') + ' Seules les pièces révisées sont visibles; chaque ouverture est journalisée.</p><div class="bp-grid"><ul class="bp-list">' + list + '</ul><div class="bp-view">' + (content || '<p class="cell-sub">Choisissez un dossier.</p>') + '</div></div><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Fermer</button></div>';
  }
  UI.UIA['buyer-preview'] = function (p) { UI.modal(buyerPreview(S.mandate(p.m), p.id), { wide: true }); };
  UI.UIA['buyer-folder'] = function (p) {
    var m = S.mandate(p.m); var r = S.dispatch('buyerView', { m: p.m, buyer: p.id, folder: p.f });
    var root = document.querySelector('#modal-root .modal'); if (root) { root.innerHTML = buyerPreview(S.mandate(p.m), p.id, p.f); U.typoTree(root); var b = root.querySelector('[data-f="' + p.f + '"]'); if (b) b.focus(); }
    if (!r.ok) UI.toast(r.msg, 'err'); else if (r.denied) UI.toast(r.denied, 'err');
  };
  UI.UIA['ui-file'] = function (p, el) {
    var files = Array.prototype.slice.call(el.files || []); if (!files.length) return;
    var m = S.mandate(p.m), pending = files.length, done = 0;
    files.forEach(function (f) {
      var meta = { name: f.name, size: f.size, type: f.type, hash: null, snippet: '' }, pv = null;
      var finish = function () {
        var r = S.dispatch('docUpload', { m: m.id, item: p.item || null, folder: p.folder || (p.item ? p.item.slice(0, 2) : '12'), meta: meta });
        if (r.ok && pv) previews[r.id] = pv;
        if (!r.ok) UI.toast(r.msg, 'err');
        done++; if (done === pending) UI.toast(pending + ' pièce' + (pending > 1 ? 's' : '') + ' téléversée' + (pending > 1 ? 's' : '') + ' : empreinte SHA-256 calculée dans le navigateur.');
      };
      var p1 = f.arrayBuffer ? f.arrayBuffer().then(function (buf) { return U.sha256Hex(buf); }).then(function (h) { meta.hash = h; }, function () {}) : Promise.resolve();
      var p2 = /^text\/|json|csv|xml/.test(f.type || '') || /\.(txt|csv|md|json)$/i.test(f.name) ? (f.text ? f.text().then(function (t) { pv = { kind: 'text', text: t }; meta.snippet = t.slice(0, 600); }, function () {}) : Promise.resolve()) :
        /^image\//.test(f.type || '') && f.size < 6 * 1024 * 1024 ? new Promise(function (res) { try { var rd = new FileReader(); rd.onload = function () { pv = { kind: 'image', url: rd.result }; res(); }; rd.onerror = function () { res(); }; rd.readAsDataURL(f); } catch (e) { res(); } }) : Promise.resolve();
      Promise.all([p1, p2]).then(finish, finish);
    });
    el.value = '';
  };

  /* ================= CRM acheteurs ================= */
  function buyerForm(b) {
    var cr = (b && b.criteria) || {}, ms = function (v) { return v == null ? '' : U.num(v, 0); };
    var regs = (cr.regions || ['Québec']);
    return '<form data-ui-form="buyer"' + (b ? ' data-id="' + b.id + '"' : '') + ' novalidate><div class="form-grid">' +
      C.field('Nom', C.input('name', b ? b.name : '', { key: 'by-name' }), { req: true }) + C.field('Type', C.select('type', Object.keys(D.BUYER_TYPES).filter(function (k) { return k !== 'investisseur_immobilier'; }).map(function (k) { return [k, D.BUYER_TYPES[k]]; }), b ? b.type : 'strategique')) + C.field('Ville', C.input('city', b ? b.city : '')) +
      C.field('Secteurs SCIAN (séparés par des virgules, « * » pour généraliste)', C.input('sectors', (cr.sectors || []).join(', '), { key: 'by-sectors', ph: '3327, 3323' }), { req: true }) +
      C.field('BAIIA minimum ($)', C.input('ebitdaMin', ms(cr.ebitdaMin), { mode: 'numeric' })) + C.field('BAIIA maximum ($)', C.input('ebitdaMax', ms(cr.ebitdaMax), { mode: 'numeric' })) +
      C.field('Chiffre d’affaires minimum ($)', C.input('revenueMin', ms(cr.revenueMin), { mode: 'numeric' })) + C.field('Chiffre d’affaires maximum ($)', C.input('revenueMax', ms(cr.revenueMax), { mode: 'numeric' })) +
      C.field('Mise de fonds minimum ($)', C.input('equityMin', ms(b && b.equityMin), { mode: 'numeric' })) + C.field('Mise de fonds maximum ($)', C.input('equityMax', ms(b && b.equityMax), { mode: 'numeric' })) +
      C.field('Échéancier', C.select('timeline', Object.keys(D.TIMELINES).map(function (k) { return [k, D.TIMELINES[k]]; }), b ? b.timeline : 'now')) + C.field('Date de vérification', C.input('lastVerified', b ? b.lastVerified || '' : S.today(), { type: 'date', key: 'by-verified' })) +
      C.field('Acquisitions antérieures', C.input('acquisitions', b ? b.acquisitions || 0 : 0, { mode: 'numeric' })) + C.field('Cession-bail', C.select('leaseback', [['', 'Inconnu'], ['oui', 'Acceptée'], ['non', 'Veut acheter l’immeuble']], cr.leaseback === true ? 'oui' : cr.leaseback === false ? 'non' : '')) + '</div>' +
      '<fieldset><legend>Régions visées</legend><div class="check-grid">' + ['Québec'].concat(D.REGIONS).map(function (r) { return '<label class="check"><input type="checkbox" name="rg" value="' + esc(r) + '"' + (regs.indexOf(r) >= 0 ? ' checked' : '') + '><span>' + (r === 'Québec' ? 'Toute la province' : esc(r)) + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<div class="check-row"><label class="check"><input type="checkbox" name="st-actions"' + (!b || (cr.structures || []).indexOf('actions') >= 0 ? ' checked' : '') + '><span>Achète des actions</span></label><label class="check"><input type="checkbox" name="st-actifs"' + (b && (cr.structures || []).indexOf('actifs') >= 0 ? ' checked' : '') + '><span>Achète des actifs</span></label><label class="check"><input type="checkbox" name="bpvOk"' + (cr.bpvOk ? ' checked' : '') + '><span>Accepte une balance de prix de vente</span></label><label class="check"><input type="checkbox" name="fundingEvidence"' + (b && b.fundingEvidence ? ' checked' : '') + '><span>Preuve de financement au dossier</span></label><label class="check"><input type="checkbox" name="priorInterest"' + (b && b.priorInterest ? ' checked' : '') + '><span>Intérêt antérieur pour ce type</span></label></div>' +
      C.field('Thèse d’acquisition', '<textarea name="thesis" rows="2">' + esc(b ? b.thesis : '') + '</textarea>') + C.field('Financement (texte)', C.input('financing', b ? b.financing : '')) +
      '<p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="submit" class="btn btn-primary" data-key="by-save">' + (b ? 'Enregistrer et relancer l’appariement' : 'Créer le profil') + '</button></div></form>';
  }
  UI.UIA['buyer-new'] = function () { UI.modal('<h2 id="modal-title">Nouveau profil acheteur</h2><p class="cell-sub">Critères déclarés par l’acheteur. L’appariement se relance sur tous les mandats dès l’enregistrement.</p>' + buyerForm(), { wide: true }); };
  UI.UIA['buyer-edit'] = function (p) { UI.modal('<h2 id="modal-title">Modifier ' + esc(S.buyer(p.id).name) + '</h2>' + buyerForm(S.buyer(p.id)), { wide: true }); };
  UI.FORMS.buyer = function (f) {
    var d = {}; ['name', 'type', 'city', 'ebitdaMin', 'ebitdaMax', 'revenueMin', 'revenueMax', 'equityMin', 'equityMax', 'timeline', 'lastVerified', 'acquisitions', 'leaseback', 'thesis', 'financing'].forEach(function (k) { d[k] = val(f, k); });
    d.sectors = val(f, 'sectors').split(/[,;\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    d.regions = Array.prototype.filter.call(f.querySelectorAll('input[name=rg]'), function (x) { return x.checked; }).map(function (x) { return x.value; });
    d.structures = [val(f, 'st-actions') ? 'actions' : null, val(f, 'st-actifs') ? 'actifs' : null].filter(Boolean);
    d.bpvOk = val(f, 'bpvOk'); d.fundingEvidence = val(f, 'fundingEvidence'); d.priorInterest = val(f, 'priorInterest');
    var id = f.getAttribute('data-id'), r = runClose(id ? 'buyerUpdate' : 'buyerCreate', { id: id, data: d }, f);
    if (r && r.ok && r.id) location.hash = '#/acheteurs/' + r.id;
  };
  UI.UIA['buyer-delete'] = function (p) { var b = S.buyer(p.id); confirmModal('Supprimer ' + b.name + ' ?', 'Le profil sort du CRM et de l’appariement. Un profil engagé dans un dossier (liste, entente, lettre) doit plutôt être archivé. Vous pourrez annuler depuis la notification.', 'buyer-delete-do', { id: p.id }); };
  UI.UIA['buyer-delete-do'] = function (p) { UI.closeModal(); var r = UI.run('buyerDelete', { id: p.id }); if (r.ok) location.hash = '#/acheteurs'; };

  /* ================= Pistes du radar ================= */
  function leadForm(c) {
    var ph = c ? E.phoneOf(c) : null, em = c ? (c.contacts || []).filter(function (k) { return k.kind === 'Courriel'; })[0] : null;
    return '<form data-ui-form="lead"' + (c ? ' data-id="' + c.id + '"' : '') + ' novalidate><div class="form-grid">' +
      C.field('Raison sociale', C.input('name', c ? c.name : '', { key: 'ld-name' }), { req: true }) + C.field('NEQ', C.input('neq', c ? c.neq : '')) + C.field('Immatriculation', C.input('registered', c ? c.registered : '1995-01-01', { type: 'date' }), { req: true }) +
      C.field('SCIAN (3 à 6 chiffres)', C.input('scian', c ? c.scian : '332', { mode: 'numeric', key: 'ld-scian' }), { req: true }) + C.field('Ville', C.input('city', c && c.city !== '—' ? c.city : '')) + C.field('Région', C.select('region', regionOpts(), c ? c.region : 'Chaudière-Appalaches')) +
      C.field('Effectif', C.input('employees', c ? c.employees : '', { mode: 'numeric', key: 'ld-emp' }), { req: true }) + C.field('Dirigeant', C.input('director', c ? c.director : '', { key: 'ld-dir' }), { req: true }) +
      (c ? '' : C.field('Téléphone', C.input('phone', '', { ph: '(418) 555-0123', key: 'ld-phone' })) + C.field('Ligne', C.select('business', [['1', 'Ligne d’affaires'], ['', 'Ligne personnelle']], '1')) + C.field('Courriel', C.input('email', '', { type: 'email' })) + C.field('Fondement du courriel', C.select('basis', Object.keys(E.BASIS_LABEL).filter(function (k) { return k !== 'na' && k !== 'supprime'; }).map(function (k) { return [k, E.BASIS_LABEL[k]]; }), 'aucun')) + C.field('Signal', C.select('signal', [['', 'Aucun']].concat(Object.keys(D.SIGNAL_TYPES).map(function (k) { return [k, D.SIGNAL_TYPES[k].label]; })), 'administrateur_ajoute'))) + '</div>' +
      '<p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="submit" class="btn btn-primary" data-key="ld-save">' + (c ? 'Enregistrer' : 'Créer la piste') + '</button></div></form>';
  }
  UI.UIA['lead-new'] = function () { UI.modal('<h2 id="modal-title">Nouvelle piste</h2><p class="cell-sub">Saisie manuelle (carte d’affaires, référence). La piste suit ensuite le même flux que les pistes détectées au REQ.</p>' + leadForm(), { wide: true }); };
  UI.UIA['lead-edit'] = function (p) { UI.modal('<h2 id="modal-title">Modifier la fiche</h2>' + leadForm(S.lead(p.id)), { wide: true }); };
  UI.FORMS.lead = function (f) {
    var d = {}; ['name', 'neq', 'registered', 'scian', 'city', 'region', 'employees', 'director', 'phone', 'email', 'basis', 'signal'].forEach(function (k) { d[k] = val(f, k); });
    d.business = f.elements.business ? !!f.elements.business.value : true;
    var id = f.getAttribute('data-id'), r = runClose(id ? 'leadUpdate' : 'leadCreate', { id: id, data: d }, f);
    if (r && r.ok && r.id) location.hash = '#/radar/' + r.id;
  };

  /* ================= Raccourcis d'horloge dans le contexte d'un dossier ================= */
  UI.UIA['clock-weeks'] = function (p) { UI.run('clockAdvance', { minutes: (+p.weeks || 1) * 7 * 1440 }); };
  UI.UIA['clock-to'] = function (p) { UI.run('clockTo', { date: p.date, time: p.time ? +p.time : 540, actor: 'Dossier' }); };
  UI.UIA['scroll'] = function (p) { var t = document.getElementById(p.target); if (t) { t.scrollIntoView({ block: 'center', behavior: U.reducedMotion() ? 'auto' : 'smooth' }); t.classList.add('flash'); setTimeout(function () { t.classList.remove('flash'); }, 1400); } };
  UI.FORMS_PREVIEWS = previews;
})(window);
