/* Nexus CTE V3 — Labo de test : outils de démonstration, hors du produit. Scénarios, événements externes, horloge,
   capacités (et clé d'IA en direct), rôle, journal d'événements, export et import de l'espace de travail. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, S = g.S, R = g.R, UI = g.UI, C = UI.C, esc = U.esc;
  var lab = { tab: 'scenarios', ev: { type: 'buyerWithdraws' }, logKind: '', logM: '' };
  function d(n, p) { return S.dispatch(n, p || {}); }
  function M(id) { return S.mandate(id); }

  /* ---------------- Scénarios : chaque préréglage rejoue des actions réelles à partir de l'espace semé ---------------- */
  function outardeMarket() {
    var o = 'outarde';
    ['a1', 'a3', 'a4', 'a5', 'a6', 'a7'].forEach(function (id) { d('adjDecide', { m: o, id: id, d: 'accepted' }); });
    d('evidenceDeposit', { m: o, id: '02-07' }); d('roomReview', { m: o, id: '02-07' }); d('adjDecide', { m: o, id: 'a2', d: 'accepted' });
    d('adjDecide', { m: o, id: 'a8', d: 'rejected', reason: 'Dépense récurrente : honoraires juridiques semblables en 2023, 2024 et 2025' }); d('normApprove', { m: o });
    ['dependance', 'concentration', 'recurrence', 'croissance', 'actifs'].forEach(function (id) { d('modDecide', { m: o, id: id, d: 'accepted' }); }); d('valApprove', { m: o });
    fixTeaser(o); d('listLock', { m: o }); d('scriptRecord', { m: o }); d('roomRequest', { m: o }); d('roomDepositNow', { m: o }); d('roomReviewAll', { m: o }); d('advance', { m: o });
  }
  function fixTeaser(id) { d('teaserGenerate', { m: id }); for (var i = 0; i < 12; i++) { var iss = R.openIssues(M(id))[0]; if (!iss) break; if (iss.fixed) d('teaserFix', { m: id, key: iss.key }); else d('teaserDropLine', { m: id, line: iss.line }); } d('teaserApprove', { m: id }); }
  function cimFix(id) { d('cimGenerate', { m: id }); E.cimOpen(M(id)).forEach(function (x) { var cl = E.byId(M(id).cim.claims, x.id); if (cl) d('cimClaim', { m: id, id: x.id, d: cl.alt ? 'reformulated' : 'deleted' }); else if (x.doc) d('roomReview', { m: id, id: x.doc }); }); d('cimApprove', { m: id }); }
  var PRESETS = [
    { id: 'fresh', label: 'Départ : vendredi 23 octobre 2026, 10 h 40', desc: 'Espace semé : cinq mandats à cinq étapes, sept pistes au radar, dix-sept profils acheteurs.', route: '#/', run: function () {} },
    { id: 'outarde-market', label: 'Outarde prête à la mise en marché', desc: 'Retraitement, évaluation, sommaire, liste et salle approuvés; le dossier passe à la mise en marché.', route: '#/dossier/outarde/acheteurs', run: outardeMarket },
    { id: 'pluvier-lois', label: 'Pluvier : lettres d’intention à comparer', desc: 'Cahier approuvé, ententes signées, accès accordés, date limite atteinte : l’horloge avance de 16 jours.', route: '#/dossier/pluvier/cloture', run: function () {
      var p = 'pluvier'; cimFix(p); d('clockAdvance', { minutes: 6 * 1440 }); M(p).pendingRefusals.slice().forEach(function (x) { d('refusal', { m: p, id: x.buyer, reason: x.reason }); });
      d('grantAllSigned', { m: p }); d('loiDeadline', { m: p, date: U.addDays(S.today(), 10) }); d('advance', { m: p }); d('clockTo', { date: M(p).loiDeadline, time: 600 }); } },
    { id: 'heron-conflict', label: 'Grand-Héron : représentation multiple', desc: 'La lettre avec cession-bail est signée : divulgations de conflit requises avant la vérification diligente.', route: '#/dossier/grandheron/cloture', run: function () { d('loiSelect', { m: 'grandheron', id: 'h2' }); d('loiSign', { m: 'grandheron' }); } },
    { id: 'huard-late', label: 'Huard : deux semaines plus tard', desc: 'Phase I toujours en retard, décision du prêteur reçue, réponses d’acheteurs et retards dans la boîte de réception.', route: '#/', run: function () { d('clockAdvance', { minutes: 14 * 1440 }); } },
    { id: 'lnnte', label: 'LNNTE périmée : appels suspendus', desc: 'L’horloge passe au 6 novembre : la vérification date de plus de 31 jours, toute composition est bloquée.', route: '#/radar/r1', run: function () { d('clockTo', { date: '2026-11-06', time: 540 }); } },
    { id: 'evening', label: 'Fin de journée : 20 h 05', desc: 'Hors des heures d’appel du destinataire : la barrière bloque même un prospect appelable.', route: '#/radar/r1', run: function () { d('clockAdvance', { minutes: 565 }); } },
    { id: 'agent', label: 'Agent vendeur formé', desc: 'Jérémie réussit la Section 8 et peut appeler Distribution Fecteau sous son propre rôle.', route: '#/radar/r2', run: function () { d('exam', { score: 5 }); d('role', { value: 'agent_vendeur' }); } },
    { id: 'lessard', label: 'Garage Lessard accepté : nouveau mandat', desc: 'La courtière accepte le mandat : il est créé à l’étape Mandat signé, états financiers à saisir.', route: null, run: function () { var r = d('acceptance', { id: 'r4', decision: 'accepter', rationale: 'Mandat de vente accepté : immeuble inscrit à vendre, cédant réactif; prix à recadrer.' }); return r.id ? '#/dossier/' + r.id + '/retraitement' : '#/radar/r4'; } },
    { id: 'consent', label: 'Retrait du consentement (Loi 25)', desc: 'Soudure Poulin reçoit le questionnaire puis retire tout consentement : lien révoqué, rappels annulés, numéro exclu, notes minimisées.', route: '#/radar/r1', run: function () {
      d('callOpen', { id: 'r1' }); d('callExtract', { id: 'r1' }); d('extractAll', { id: 'r1' }); d('callDisposition', { id: 'r1', value: 'a accepté le questionnaire' }); d('callCommit', { id: 'r1' }); d('intakeSend', { id: 'r1' });
      d('labEvent', { type: 'consentWithdrawn', lead: 'r1', scope: 'tout' }); } }
  ];
  UI.UIA['lab-preset'] = function (p) {
    var pr = PRESETS.filter(function (x) { return x.id === p.id; })[0];
    UI.modal('<h2 id="modal-title">Charger « ' + esc(pr.label) + ' » ?</h2><p>' + esc(pr.desc) + '</p><p class="cell-sub">Le scénario part de l’espace semé et remplace l’espace actuel. Exportez-le d’abord pour le garder.</p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="button" class="btn btn-primary" data-ui="lab-preset-do" data-id="' + pr.id + '" data-key="preset-do">Charger le scénario</button></div>');
  };
  UI.UIA['lab-preset-do'] = function (p) {
    var pr = PRESETS.filter(function (x) { return x.id === p.id; })[0];
    UI.closeModal(); if (g.Tour) g.Tour.stop(true);
    S.reset(); var route = pr.run() || pr.route;
    d('logOnly', { entity: 'Labo de test', action: 'Scénario chargé : ' + pr.label, detail: pr.desc, kind: 'lab' });
    if (route && location.hash !== route) location.hash = route; else UI.render();
    UI.toast('Scénario chargé : ' + pr.label + '.');
  };

  /* ---------------- Événements externes injectés ---------------- */
  var EVENTS = [
    ['buyerWithdraws', 'Un acheteur se retire', 'Entente close, accès révoqué, lettre retirée; si c’était l’acquéreur retenu, la transaction tombe.'],
    ['newLoi', 'Une nouvelle lettre d’intention arrive', 'Générée à partir du profil de l’acheteur (entente signée requise), à comparer aux autres.'],
    ['ddFinding', 'Un constat de diligence apparaît', 'Bloque la levée des conditions jusqu’à sa résolution.'],
    ['sellerHesitates', 'Le cédant hésite', 'Mandat en pause : envois et nouvelles approches suspendus jusqu’à une rencontre consignée.'],
    ['consentWithdrawn', 'Retrait du consentement (Loi 25)', 'Prospect : fondement supprimé, lien révoqué, rappels annulés, exclusion et minimisation si complet. Cédant : accès révoqués, étape bloquée.'],
    ['ndaSigned', 'Un acheteur signe l’entente', 'L’entente passe à « signée » : l’accès à la salle devient possible.'],
    ['docArrives', 'Une pièce arrive du cédant', 'La pièce passe à « Reçu », prête à réviser.']
  ];
  function eventForm(st) {
    var ev = lab.ev, t = ev.type, ms = S.mandates(), out = '';
    var mOpts = function (filter) { var list = ms.filter(filter); if (!list.some(function (m) { return m.id === ev.m; })) ev.m = list[0] ? list[0].id : ''; return C.field('Mandat', '<select data-change="lab-set" data-f="m" data-key="lab-m">' + list.map(function (m) { return '<option value="' + m.id + '"' + (m.id === ev.m ? ' selected' : '') + '>' + esc(m.codename + ', ' + E.stageLabel(m.stage).toLowerCase()) + '</option>'; }).join('') + '</select>') + (list.length ? '' : '<p class="cell-sub">Aucun mandat admissible pour cet événement.</p>'); };
    var bOpts = function (m, ok) { var ids = m ? Object.keys(m.nda).filter(function (id) { return ok(m.nda[id]); }) : []; if (ids.indexOf(ev.buyer) < 0) ev.buyer = ids[0] || ''; return C.field('Acheteur', '<select data-change="lab-set" data-f="buyer" data-key="lab-b">' + ids.map(function (id) { return '<option value="' + id + '"' + (id === ev.buyer ? ' selected' : '') + '>' + esc(S.buyer(id).name) + '</option>'; }).join('') + '</select>') + (ids.length ? '' : '<p class="cell-sub">Aucun acheteur admissible sur ce dossier.</p>'); };
    if (t === 'buyerWithdraws') { out += mOpts(function (m) { return Object.keys(m.nda).some(function (id) { return ['envoye', 'consulte', 'signe'].indexOf(m.nda[id]) >= 0; }); }); out += bOpts(M(ev.m), function (s) { return ['envoye', 'consulte', 'signe'].indexOf(s) >= 0; }); }
    else if (t === 'newLoi') { out += mOpts(function (m) { return ['marche', 'fenetre', 'negociation'].indexOf(m.stage) >= 0 && !m.loiSigned; }); out += bOpts(M(ev.m), function (s) { return s === 'signe'; }) + C.field('Prix affiché (facultatif, sinon calculé)', '<input type="text" inputmode="numeric" data-change="lab-set" data-f="ev" value="' + esc(ev.ev || '') + '" data-key="lab-ev">'); }
    else if (t === 'ndaSigned') { out += mOpts(function (m) { return Object.keys(m.nda).some(function (id) { return ['envoye', 'consulte'].indexOf(m.nda[id]) >= 0; }); }); out += bOpts(M(ev.m), function (s) { return s === 'envoye' || s === 'consulte'; }); }
    else if (t === 'ddFinding') { out += mOpts(function (m) { return m.stage === 'diligence' || m.stage === 'cloture'; }) + C.field('Constat', '<textarea rows="2" data-change="lab-set" data-f="text" data-key="lab-text">' + esc(ev.text || 'Litige avec un ancien employé découvert au registre des plumitifs.') + '</textarea>') + C.field('Gravité', '<select data-change="lab-set" data-f="severity">' + ['élevée', 'moyenne', 'faible'].map(function (s) { return '<option' + (ev.severity === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>'); }
    else if (t === 'sellerHesitates') { out += mOpts(function (m) { return m.stage !== 'conclu' && !m.hold; }) + C.field('Motif rapporté', '<input type="text" data-change="lab-set" data-f="text" value="' + esc(ev.text || 'Le cédant doute du moment de vendre après une bonne année.') + '">'); }
    else if (t === 'docArrives') { out += mOpts(function (m) { return E.roomFolders(m).some(function (f) { return f.items.some(function (it) { var s = E.itemStatus(m, it.id); return s === 'demande' || s === 'a_demander'; }); }); }); var m2 = M(ev.m), items = []; if (m2) E.roomFolders(m2).forEach(function (f) { f.items.forEach(function (it) { var s = E.itemStatus(m2, it.id); if (s === 'demande' || s === 'a_demander') items.push(it); }); }); if (!items.some(function (i) { return i.id === ev.item; })) ev.item = items[0] ? items[0].id : ''; out += C.field('Pièce', '<select data-change="lab-set" data-f="item">' + items.map(function (it) { return '<option value="' + it.id + '"' + (it.id === ev.item ? ' selected' : '') + '>' + it.id + ' ' + esc(it.name) + '</option>'; }).join('') + '</select>'); }
    else if (t === 'consentWithdrawn') {
      var targets = st.leads.map(function (c) { return ['lead:' + c.id, 'Prospect : ' + c.name]; }).concat(S.mandates().filter(function (m) { return !m.sellerConsentWithdrawn && m.stage !== 'conclu'; }).map(function (m) { return ['m:' + m.id, 'Cédant : ' + m.codename]; }));
      if (!targets.some(function (x) { return x[0] === ev.target; })) ev.target = targets[0][0];
      out += C.field('Personne', '<select data-change="lab-set" data-f="target" data-key="lab-target">' + targets.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === ev.target ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>');
      if (ev.target.indexOf('lead:') === 0) out += C.field('Portée', '<select data-change="lab-set" data-f="scope"><option value="courriel"' + (ev.scope !== 'tout' ? ' selected' : '') + '>Courriels seulement (LCAP)</option><option value="tout"' + (ev.scope === 'tout' ? ' selected' : '') + '>Retrait complet : aucun contact, minimisation</option></select>');
    }
    return out;
  }
  UI.UIA['lab-set'] = function (p) { if (p.f === 'type') lab.ev = { type: p.value }; else lab.ev[p.f] = p.value; refresh(); };
  UI.UIA['lab-inject'] = function () {
    var ev = lab.ev, p = { type: ev.type, m: ev.m, buyer: ev.buyer, text: ev.text, severity: ev.severity, ev: ev.ev, item: ev.item };
    if (ev.type === 'ddFinding' && !ev.text) p.text = 'Litige avec un ancien employé découvert au registre des plumitifs.';
    if (ev.type === 'sellerHesitates' && !ev.text) p.text = 'Le cédant doute du moment de vendre après une bonne année.';
    if (ev.type === 'consentWithdrawn') { var t = ev.target || ''; p.m = t.indexOf('m:') === 0 ? t.slice(2) : null; p.lead = t.indexOf('lead:') === 0 ? t.slice(5) : null; p.scope = ev.scope || 'courriel'; }
    var r = UI.run('labEvent', p); if (r.ok) { lab.ev = { type: ev.type }; refresh(); }
  };

  /* ---------------- Horloge ---------------- */
  function schedLabel(e) {
    var m = e.m ? M(e.m) : null, mn = m ? m.codename + ' : ' : '', b = e.buyer ? (S.buyer(e.buyer) || {}).name : '', c = e.lead ? (S.lead(e.lead) || {}).name : '';
    return { nda: mn + 'réponse de ' + b + ' (' + (e.result === 'signe' ? 'signe l’entente' : e.result === 'consulte' ? 'consulte' : 'décline') + ')', docs: mn + 'dépôt de ' + (e.items || []).length + ' pièce' + ((e.items || []).length > 1 ? 's' : '') + ' par le cédant', docRemind: mn + 'rappel J+' + e.n + ' au cédant', views: mn + 'consultations de ' + b, lois: mn + 'date limite des lettres d’intention', lender: mn + 'décision du prêteur', ddIndex: mn + 'indexation des pièces de diligence', auditRemind: 'Rappel ' + e.label + ' : audit de ' + c, callback: 'Rappel du prospect ' + c, intakeRemind: 'Rappel J+' + e.n + ' du questionnaire : ' + c }[e.kind] || e.kind;
  }
  function clockHtml(st) {
    var next = st.scheduled.slice().sort(function (a, b) { return a.at - b.at; }).filter(function (e) { return !e.m || S.P.mandates(); }).slice(0, 8);
    return '<div class="lab-clock"><p class="lab-now">' + C.icon('clock') + '<strong>' + esc(U.dateLong(st.clock.d)) + ', ' + U.time(st.clock.m) + '</strong></p>' +
      '<div class="actions actions-wrap">' + C.btn('+1 heure', 'clockAdvance', { variant: 'quiet', data: { minutes: 60 }, key: 'clk-h' }) + C.btn('+1 jour', 'clockAdvance', { variant: 'quiet', data: { minutes: 1440 }, key: 'clk-d' }) + C.btn('+1 semaine', 'clockAdvance', { variant: 'quiet', data: { minutes: 10080 }, key: 'clk-w' }) + '</div>' +
      '<form class="mini-form inline-form" data-ui-form="lab-clock"><label class="field field-inline"><span>Aller au</span><input type="date" name="date" value="' + U.addDays(st.clock.d, 7) + '" min="' + st.clock.d + '" data-key="clk-date"></label><label class="field field-inline"><span>Heure</span><input type="time" name="time" value="09:00" data-key="clk-time"></label><button type="submit" class="btn btn-primary btn-sm" data-key="clk-go">Avancer</button></form>' +
      '<p class="fineprint">L’horloge ne recule jamais. Chaque avance traite, dans l’ordre, les événements prévus et les contrôles quotidiens : accès qui expirent, liens de questionnaire échus, fondements LCAP de 6 mois, LNNTE à 31 jours, actions en retard, exclusivités, rappels.</p>' +
      '<h3 class="sub-h">Prochains événements prévus</h3>' + (next.length ? '<ol class="sched">' + next.map(function (e) { var at = U.fromAbs(e.at); return '<li><span class="ib-at">' + U.date(at.d) + ', ' + U.time(at.m) + '</span>' + esc(schedLabel(e)) + '</li>'; }).join('') + '</ol>' : '<p class="cell-sub">Aucun événement prévu.</p>') + '</div>';
  }
  UI.FORMS['lab-clock'] = function (f) { var t = (f.elements.time.value || '09:00').split(':'); UI.run('clockTo', { date: f.elements.date.value, time: (+t[0]) * 60 + (+t[1] || 0) }); };

  /* ---------------- Rendu du tiroir ---------------- */
  var KIND_LABEL = { '': 'Tous', stage: 'Étapes', buyers: 'Acheteurs', room: 'Salle de données', loi: 'Lettres d’intention', dd: 'Diligence', fin: 'Financier', teaser: 'Sommaire', radar: 'Radar', compliance: 'Conformité', ai: 'IA', clock: 'Horloge', lab: 'Labo de test (y compris événements injectés)', overdue: 'Retards' };
  var TABS = [['scenarios', 'Scénarios'], ['clock', 'Horloge'], ['events', 'Événements'], ['caps', 'Capacités'], ['log', 'Journal'], ['workspace', 'Espace']];
  function html() {
    var st = S.get(), body = '';
    if (lab.tab === 'scenarios') body = '<ul class="presets">' + PRESETS.map(function (p) { return '<li><div><strong>' + esc(p.label) + '</strong><span class="cell-sub">' + esc(p.desc) + '</span></div>' + C.btn('Charger', 'lab-preset', { ui: true, small: true, variant: 'quiet', data: { id: p.id }, key: 'preset-' + p.id }) + '</li>'; }).join('') + '</ul>';
    else if (lab.tab === 'clock') body = clockHtml(st);
    else if (lab.tab === 'events') body = '<p class="cell-sub">Événements externes auxquels le produit réagit. Chaque injection passe par le même moteur que les actions de l’interface et apparaît au journal et dans la boîte de réception.</p>' +
      C.field('Événement', '<select data-change="lab-set" data-f="type" data-key="lab-type">' + EVENTS.map(function (e) { return '<option value="' + e[0] + '"' + (lab.ev.type === e[0] ? ' selected' : '') + '>' + esc(e[1]) + '</option>'; }).join('') + '</select>') + '<p class="fineprint">' + esc(EVENTS.filter(function (e) { return e[0] === lab.ev.type; })[0][2]) + '</p>' + eventForm(st) +
      '<div class="actions">' + C.btn('Injecter l’événement', 'lab-inject', { ui: true, variant: 'primary', icon: 'flask', key: 'lab-inject' }) + '</div>';
    else if (lab.tab === 'caps') body = '<p class="cell-sub">Bascules pour tester les replis. Elles sont enregistrées dans l’espace de travail.</p><ul class="caps">' + [['speech', 'Synthèse vocale (jeu de rôle)'], ['voices', 'Voix françaises disponibles'], ['recognition', 'Reconnaissance vocale (dictée des notes)'], ['online', 'Réseau en ligne (IA en direct)'], ['liveAI', 'IA en direct permise']].map(function (c) { return '<li><label class="check"><input type="checkbox" data-change="lab-cap" data-cap="' + c[0] + '"' + (st.caps[c[0]] !== false ? ' checked' : '') + ' data-key="cap-' + c[0] + '"><span>' + esc(c[1]) + '</span></label></li>'; }).join('') + '</ul>' +
      '<h3 class="sub-h">Rôle</h3><label class="field field-inline"><span class="sr-only">Voir comme</span><select data-change="role" data-key="lab-role">' + Object.keys(D.ROLE_LABEL).map(function (k) { return '<option value="' + k + '"' + (st.role === k ? ' selected' : '') + '>' + esc(D.ROLE_LABEL[k]) + '</option>'; }).join('') + '</select></label>' +
      '<h3 class="sub-h">IA en direct (votre clé)</h3><div id="lai-host" class="lai-host"></div><p class="fineprint">Trois usages : extraction des notes d’appel, retraitements à partir d’un grand livre, brouillon du sommaire aveugle. Le résultat suit la même structure que les règles, est validé, porte sa provenance et reste une proposition. Sans clé, ou en cas d’erreur, les règles répondent.</p>';
    else if (lab.tab === 'log') {
      var kinds = ['', 'stage', 'buyers', 'room', 'loi', 'dd', 'fin', 'teaser', 'radar', 'compliance', 'ai', 'clock', 'lab', 'overdue'];
      var rows = st.audit.filter(function (a) { return (!lab.logKind || a.kind === lab.logKind || (lab.logKind === 'lab' && a.actor === 'Labo de test')) && (!lab.logM || a.m === lab.logM) && (!a.m || S.P.mandates()); }).slice(0, 40);
      body = '<div class="form-grid"><label class="field"><span>Type</span><select data-change="lab-log" data-f="logKind">' + kinds.map(function (k) { return '<option value="' + k + '"' + (lab.logKind === k ? ' selected' : '') + '>' + (KIND_LABEL[k] || k) + '</option>'; }).join('') + '</select></label><label class="field"><span>Mandat</span><select data-change="lab-log" data-f="logM"><option value="">Tous</option>' + S.mandates().map(function (m) { return '<option value="' + m.id + '"' + (lab.logM === m.id ? ' selected' : '') + '>' + esc(m.codename) + '</option>'; }).join('') + '</select></label></div>' +
        '<ol class="journal lab-journal">' + rows.map(function (a) { return '<li><span class="j-at">' + esc(a.at.replace(/^(\d{4}-\d\d-\d\d)/, function (x) { return U.date(x); })) + '</span><span class="j-what"><strong>' + esc(a.action) + '</strong> ' + esc(a.entity) + (a.detail ? ' · ' + esc(a.detail) : '') + '</span><span class="j-who">' + esc(a.actor) + (a.kind ? ' · ' + esc(a.kind) : '') + '</span></li>'; }).join('') + '</ol><p class="fineprint">' + st.audit.length + ' entrées au total : un seul journal, alimenté par chaque module, l’horloge et ce labo.</p>';
    } else body = '<p>Téléchargez l’espace de travail complet (mandats, pistes, acheteurs, horloge, journal, boîte de réception) pour le rejouer plus tard ou sur un autre appareil.</p><div class="actions actions-wrap">' + C.btn('Exporter en JSON', 'lab-export', { ui: true, variant: 'primary', icon: 'download', key: 'lab-export' }) +
      '<label class="btn btn-quiet file-btn">' + C.icon('upload') + '<span>Importer un JSON</span><input type="file" accept="application/json,.json" data-change="lab-import" data-key="lab-import"></label>' + C.btn('Réinitialiser la démo', 'reset-ask', { ui: true, variant: 'ghost', key: 'lab-reset' }) + '</div><p class="fineprint">Le fichier est validé à l’import (application, version, horloge, mandats). Les aperçus de fichiers téléversés ne sont pas exportés : seules leurs métadonnées et empreintes le sont.</p>';
    return '<div class="drawer-head"><h2 id="drawer-title">' + C.icon('flask') + 'Labo de test</h2><button type="button" class="icon-btn" data-ui="drawer-close" aria-label="Fermer le labo de test">' + C.icon('x') + '</button></div>' +
      '<div class="drawer-body"><p class="lab-note">Outils de démonstration, hors du produit : ils simulent le temps et le monde extérieur pour tester les règles.</p><div class="lab-tabs" role="tablist" aria-label="Sections du labo">' + TABS.map(function (t) { return '<button type="button" role="tab" aria-selected="' + (lab.tab === t[0]) + '" class="lab-tab' + (lab.tab === t[0] ? ' is-on' : '') + '" data-ui="lab-tab" data-t="' + t[0] + '" data-key="lab-tab-' + t[0] + '">' + esc(t[1]) + '</button>'; }).join('') + '</div><div class="lab-body" role="tabpanel">' + body + '</div></div>';
  }
  function refresh() { if (UI.drawerKind() === 'lab') UI.refreshDrawer(html()); }
  UI.DRAWERS.lab = html;
  UI.DRAWER_MOUNT.lab = function (el) { var host = el.querySelector('#lai-host'); if (host && g.LiveAI) { try { g.LiveAI.renderSettings(host, { lang: 'fr' }); } catch (e) { host.textContent = 'Panneau indisponible.'; } } };
  UI.UIA['lab-open'] = function (p) { if (p && p.section) lab.tab = p.section; UI.drawer(html(), 'lab'); };
  UI.UIA['lab-tab'] = function (p) { lab.tab = p.t; refresh(); var b = document.querySelector('[data-key="lab-tab-' + p.t + '"]'); if (b) b.focus(); };
  UI.UIA['lab-cap'] = function (p) { UI.run('caps', { key: p.cap, value: p.value }); };
  UI.UIA['lab-log'] = function (p) { lab[p.f] = p.value; refresh(); };
  UI.UIA['lab-export'] = function () { var ok = U.download('nexus-cte-espace-' + S.today() + '.json', S.exportJSON(), 'application/json'); d('logOnly', { entity: 'Espace de travail', action: 'Espace de travail exporté (JSON)', detail: S.mandates().length + ' mandats', kind: 'lab' }); UI.toast(ok ? 'Espace exporté en JSON.' : 'Téléchargement impossible dans ce navigateur.', ok ? '' : 'err'); };
  UI.UIA['lab-import'] = function (p, el) {
    var f = el.files && el.files[0]; if (!f) return;
    f.text().then(function (t) {
      UI.modal('<h2 id="modal-title">Importer cet espace de travail ?</h2><p>« ' + esc(f.name) + ' » (' + U.num(f.size / 1024, 0) + ' Ko) remplacera l’espace actuel.</p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="button" class="btn btn-primary" data-ui="lab-import-do" data-key="import-do">Importer</button></div>');
      lab.pending = t;
    }, function () { UI.toast('Lecture du fichier impossible.', 'err'); });
    el.value = '';
  };
  UI.UIA['lab-import-do'] = function () { UI.closeModal(); var r = UI.run('importState', { json: lab.pending }); lab.pending = null; if (r.ok) { if (g.Tour) g.Tour.stop(true); location.hash = '#/'; UI.render({ scrollTop: true }); } };
  g.Lab = { presets: PRESETS, state: lab, html: html };
})(window);
