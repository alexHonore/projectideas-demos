/* Nexus CTE V3 — état unique, persistance (localStorage « nexus-cte-v3 »), horloge de démonstration et actions journalisées.
   Chaque module écrit au même journal (audit) et à la même boîte de réception; chaque action rafraîchit toutes les vues. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, R = g.R;
  var KEY = 'nexus-cte-v3', VERSION = 4;
  var listeners = [];

  function fresh() {
    var st = {
      v: VERSION, app: 'nexus-cte-v3',
      clock: { d: D.TODAY, m: D.START_MIN },
      role: 'courtier', weights: 'nexus', feeCompare: false, feeInput: null, towerMandate: 'outarde',
      radar: { preset: 'all', selected: 'r1' },
      leads: U.clone(D.COMPANIES), companyState: {},
      dnc: D.DNC_SEED.map(function (d) { return Object.assign({}, d); }),
      compliance: { lastScrub: '2026-10-05', blockedAttempts: 3, scrubNotified: null },
      training: { jg: { s1: true, s8: false, attempts: [] } },
      buyers: U.clone(D.BUYERS), buyerMandates: U.clone(D.BUYER_MANDATES),
      counters: { relations: 1247, criteria: 340, refusals: 87 },
      mandates: {}, mandateIds: [], scheduled: [], inbox: [], incidents: [], loi25: [], audit: seedAudit(), seq: 0, sched: 0,
      caps: { speech: true, voices: true, recognition: true, online: true, liveAI: true },
      auditAll: false, auditFilter: '', tourStep: 0, nextCode: 15
    };
    D.seedMandates().forEach(function (m) {
      // Provenance des propositions semées : textes préparés pour la démonstration (« scénarisé »), sauf les règles du moteur.
      (m.val.modifiers || []).forEach(function (x) { if (!x.source) x.source = x.auto ? 'rules' : 'ia-scenario'; });
      (m.dd.findings || []).forEach(function (x) { if (!x.source) x.source = 'ia-scenario'; });
      st.mandates[m.id] = m; st.mandateIds.push(m.id);
    });
    seedSchedule(st);
    return st;
  }
  function seedAudit() {
    return [
      { seq: -10, at: '2026-10-22 23 h 10', actor: 'Système', entity: 'Radar', action: 'Scores recalculés', detail: '7 entreprises surveillées, ventilation conservée', kind: 'system' },
      { seq: -11, at: '2026-10-19 15 h 20', actor: 'Catherine Pelletier', entity: 'M-2026-012', action: 'Mandat exclusif signé électroniquement', detail: 'Projet Sterne; certificat d’audit et empreinte conservés', m: 'sterne', kind: 'stage' },
      { seq: -12, at: '2026-10-07 09 h 00', actor: 'Catherine Pelletier', entity: 'M-2026-011', action: 'Sommaires et ententes transmis (simulé)', detail: 'Projet Pluvier : 4 acheteurs', m: 'pluvier', kind: 'buyers' },
      { seq: -13, at: '2026-10-05 16 h 30', actor: 'Système', entity: 'M-2026-006', action: 'Étape : Négociation', detail: 'Projet Grand-Héron : deux lettres d’intention reçues', m: 'grandheron', kind: 'stage' },
      { seq: -14, at: '2026-10-05 07 h 30', actor: 'Système', entity: 'Conformité', action: 'Vérification LNNTE importée', detail: 'Liste nationale au 2026-10-05, fenêtre de 31 jours', kind: 'compliance' },
      { seq: -15, at: '2026-10-02 16 h 40', actor: 'Moteur IA (Financial Forensics)', entity: 'M-2026-014', action: '8 retraitements proposés', detail: 'Aucun appliqué automatiquement; en attente de décision humaine', m: 'outarde', kind: 'ai' },
      { seq: -16, at: '2026-10-02 11 h 05', actor: 'Système', entity: 'M-2026-009', action: 'Constats de diligence indexés', detail: 'Projet Huard : 4 constats avec citations', m: 'huard', kind: 'dd' },
      { seq: -17, at: '2026-09-21 09 h 12', actor: 'Maxime Thibodeau', entity: 'M-2026-014', action: 'Étape : Préparation', detail: 'Normalisation commencée', m: 'outarde', kind: 'stage' },
      { seq: -18, at: '2026-09-14 14 h 07', actor: 'Système', entity: 'M-2026-014', action: 'Échéancier engagé généré', detail: 'Durées types §11.1; clôture visée le 7 mai 2027', m: 'outarde', kind: 'stage' },
      { seq: -19, at: '2026-09-14 14 h 05', actor: 'Catherine Pelletier', entity: 'M-2026-014', action: 'Mandat exclusif signé électroniquement', detail: 'Certificat d’audit et empreinte du document conservés (Loi concernant le cadre juridique des technologies de l’information)', m: 'outarde', kind: 'stage' },
      { seq: -20, at: '2026-09-12 13 h 40', actor: 'Catherine Pelletier', entity: 'M-2026-009', action: 'Lettre d’intention signée (simulé)', detail: 'Projet Huard : Hydraulique Provinciale inc.; exclusivité jusqu’au 11 déc. 2026', m: 'huard', kind: 'loi' }
    ];
  }
  // Conséquences déjà en route au démarrage (même mécanique que celles créées par les actions).
  function seedSchedule(st) {
    function at(d, h, mi) { return U.absMin(d, h * 60 + (mi || 0)); }
    st.scheduled.push({ id: 's1', at: at('2026-10-26', 11), kind: 'nda', m: 'pluvier', buyer: 'b16', result: 'refus', reason: 'trop petit' });
    st.scheduled.push({ id: 's2', at: at('2026-10-27', 9, 30), kind: 'nda', m: 'pluvier', buyer: 'b5', result: 'signe' });
    st.scheduled.push({ id: 's3', at: at('2026-10-28', 14), kind: 'nda', m: 'pluvier', buyer: 'b10', result: 'signe' });
    st.scheduled.push({ id: 's4', at: at('2026-11-06', 10), kind: 'lender', m: 'huard' });
    st.sched = 4;
  }

  var state = load();
  // Espaces enregistrés avant les identifiants lisibles : les retraitements à identifiant technique deviennent R1, R2…
  function migrate(s) {
    Object.keys(s.mandates || {}).forEach(function (k) {
      var m = s.mandates[k];
      (m.adjustments || []).forEach(function (a) {
        if (!/^[qm][a-z0-9]{5}$/.test(a.id)) return;
        var nid = nextAdjId(m), old = a.id; a.id = nid;
        if (m.adj && m.adj[old]) { m.adj[nid] = m.adj[old]; delete m.adj[old]; }
        (m.fin.lines || []).forEach(function (l) { if (l.adj === old) l.adj = nid; });
      });
    });
    return s;
  }
  function load() {
    try { var raw = g.localStorage.getItem(KEY); if (raw) { var s = JSON.parse(raw); if (s && s.v === VERSION && s.mandates) return migrate(s); } } catch (e) { /* stockage indisponible : état en mémoire */ }
    return fresh();
  }
  function save() { try { g.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignoré */ } }
  function reset() { state = fresh(); try { g.localStorage.removeItem(KEY); } catch (e) { /* ignoré */ } emit(); }
  function emit(info) { save(); listeners.forEach(function (fn) { try { fn(info || {}); } catch (e) { g.console && console.error(e); } }); }
  function subscribe(fn) { listeners.push(fn); }

  function today() { return state.clock.d; }
  function absNow() { return U.absMin(state.clock.d, state.clock.m); }
  function actorName() { return D.TEAM[D.ROLE_USER[state.role]].name; }
  function stamp() { return state.clock.d + ' ' + U.time(state.clock.m); }
  function log(entity, action, detail, o) {
    o = o || {}; state.seq++;
    state.audit.unshift({ seq: state.seq, at: stamp(), actor: o.actor || actorName(), entity: entity, action: action, detail: detail || '', m: o.m || null, kind: o.kind || 'action' });
  }
  function notify(title, body, o) {
    o = o || {}; state.seq++;
    state.inbox.unshift({ id: 'n' + state.seq, at: stamp(), title: title, body: body || '', href: o.href || null, kind: o.kind || 'info', m: o.m || null, tone: o.tone || '', read: false });
    if (state.inbox.length > 200) state.inbox.length = 200;
  }
  function schedule(atAbs, kind, data) { state.sched++; var ev = Object.assign({ id: 's' + state.sched + '-' + U.hash(kind + atAbs), at: atAbs, kind: kind }, data || {}); state.scheduled.push(ev); return ev; }
  function inDays(n, h, mi) { return U.absMin(U.addDays(today(), n), (h == null ? 10 : h) * 60 + (mi || 0)); }

  /* ---------------- Permissions (§2.2) ---------------- */
  var P = {
    financials: function () { return state.role === 'courtier' || state.role === 'analyste'; },
    fees: function () { return state.role === 'courtier'; },
    identity: function () { return state.role === 'courtier' || state.role === 'analyste'; },
    room: function () { return state.role === 'courtier' || state.role === 'analyste'; },
    decideMandate: function () { return state.role === 'courtier'; },
    outbound: function () { return state.role === 'courtier' || state.role === 'agent_vendeur' || state.role === 'agent_acheteur'; },
    buyersWrite: function () { return state.role === 'courtier' || state.role === 'agent_acheteur'; },
    mandates: function () { return state.role !== 'agent_vendeur'; },
    admin: function () { return state.role === 'courtier'; }
  };

  function cs(id) { if (!state.companyState[id]) state.companyState[id] = {}; return state.companyState[id]; }
  function lead(id) { return E.byId(state.leads, id); }
  function call(id) { var c = cs(id), L = lead(id); if (!c.call) c.call = { step: 'brief', notes: L && L.id === 'r1' ? L.sampleNotes : '', fields: [], x: {}, provenance: null, disposition: null, suggested: null, committed: false, intake: 'none', answers: null, conflicts: {}, conflictList: [], relation: null, booked: null }; return c.call; }
  function buyer(id) { return E.byId(state.buyers, id); }
  function mandate(id) { return state.mandates[id] || null; }
  function mandates() { return state.mandateIds.map(function (id) { return state.mandates[id]; }).filter(Boolean); }
  function fail(msg) { return { ok: false, msg: msg }; }
  function ok(msg, extra) { return Object.assign({ ok: true, msg: msg }, extra || {}); }
  function bname(id) { var b = buyer(id); return b ? b.name : id; }
  function mhref(m, tab) { return '#/dossier/' + m.id + '/' + (tab || 'apercu'); }

  /* ================= Horloge de démonstration : conséquences réelles ================= */
  function setClockAbs(abs) { var c = U.fromAbs(abs); state.clock = { d: c.d, m: c.m }; }
  function advanceTo(target) {
    var start = absNow(), fired = 0, guard = 0;
    if (target <= start) return 0;
    while (guard++ < 5000) {
      var due = state.scheduled.filter(function (e) { return e.at <= target; }).sort(function (a, b) { return a.at - b.at || (a.id < b.id ? -1 : 1); })[0];
      var midnight = (Math.floor(absNow() / 1440) + 1) * 1440;
      var step = Math.min(due ? due.at : Infinity, midnight, target);
      if (step > absNow()) setClockAbs(step);
      if (due && due.at <= absNow()) { state.scheduled = state.scheduled.filter(function (e) { return e !== due; }); try { runScheduled(due); } catch (e) { g.console && console.error(e); } fired++; continue; }
      if (absNow() === midnight) dailyChecks();
      if (absNow() >= target) break;
    }
    return fired;
  }
  function dailyChecks() {
    var d = today();
    mandates().forEach(function (m) {
      Object.keys(m.grants || {}).forEach(function (id) {
        var gr = m.grants[id];
        if (!gr.revoked && !gr.expiredNotified && U.diffDays(gr.expires, d) > 0) { gr.expiredNotified = d; log(m.code, 'Accès à la salle expiré : ' + bname(id), 'Expiration du ' + U.date(gr.expires) + '; renouveler ou laisser échoir', { m: m.id, kind: 'room', actor: 'Système' }); notify(m.codename + ' : accès expiré', bname(id) + ' n’a plus accès à la salle de données depuis le ' + U.date(gr.expires) + '.', { href: mhref(m, 'salle'), m: m.id, kind: 'expiry', tone: 'warn' }); }
      });
      if (m.exclusivityEnd && m.stage !== 'conclu' && !m.exclNotified && U.diffDays(m.exclusivityEnd, d) > 0) { m.exclNotified = d; log(m.code, 'Exclusivité de l’acquéreur échue', 'Fin le ' + U.date(m.exclusivityEnd) + ' : le cédant peut solliciter d’autres offres', { m: m.id, kind: 'loi', actor: 'Système' }); notify(m.codename + ' : exclusivité échue', 'L’exclusivité accordée à l’acquéreur a pris fin le ' + U.date(m.exclusivityEnd) + '.', { href: mhref(m, 'cloture'), m: m.id, kind: 'expiry', tone: 'warn' }); }
      var na = E.nextAction(m, state);
      if (na.late && na.due && m.lateNotified !== na.text + na.due) { m.lateNotified = na.text + na.due; notify(m.codename + ' : action en retard', na.text + ' (prévu le ' + U.date(na.due) + ').', { href: mhref(m, na.tab), m: m.id, kind: 'overdue', tone: 'warn' }); log(m.code, 'Action en retard', na.text + ', prévue le ' + U.date(na.due), { m: m.id, kind: 'overdue', actor: 'Système' }); }
    });
    state.leads.forEach(function (c) {
      var k = state.companyState[c.id] || {}, cl = k.call;
      if (cl && cl.intake === 'sent' && cl.linkExpires && U.diffDays(cl.linkExpires, d) > 0) { cl.intake = 'expired'; log(c.name, 'Lien de questionnaire expiré', 'Expiration du ' + U.date(cl.linkExpires) + '; jeton révoqué', { kind: 'radar', actor: 'Système' }); notify('Questionnaire expiré : ' + c.name, 'Le lien de collecte a expiré sans réponse. Renvoyez-le si le fondement d’envoi est toujours valide.', { href: '#/radar/' + c.id, kind: 'expiry', tone: 'warn' }); }
      if (k.emailBasis === 'demande' && k.basisSince && U.diffDays(U.addDays(k.basisSince, 183), d) > 0) { k.emailBasis = 'aucun'; log(c.name, 'Fondement d’envoi échu (LCAP)', 'Demande d’information de plus de 6 mois : aucun envoi sans nouveau consentement', { kind: 'compliance', actor: 'Système' }); notify('Fondement échu : ' + c.name, 'La demande d’information date de plus de 6 mois : le courriel n’est plus autorisé.', { href: '#/radar/' + c.id, kind: 'expiry', tone: 'warn' }); }
    });
    var age = U.diffDays(state.compliance.lastScrub, d);
    if (age > 31 && state.compliance.scrubNotified !== state.compliance.lastScrub) { state.compliance.scrubNotified = state.compliance.lastScrub; log('Conformité', 'Vérification LNNTE périmée : appels suspendus', 'Dernière vérification il y a ' + U.days(age) + ' (fenêtre de 31 jours)', { kind: 'compliance', actor: 'Système' }); notify('Appels suspendus : LNNTE à mettre à jour', 'La vérification LNNTE date de ' + U.days(age) + '. Aucun appel n’est permis avant l’import de la liste du jour (administratrice).', { href: '#/conformite', kind: 'compliance', tone: 'err' }); }
    state.buyers.forEach(function (b) { var engaged = mandates().some(function (m) { return m.stage !== 'conclu' && (m.shortlist.indexOf(b.id) >= 0 || ['envoye', 'consulte', 'signe'].indexOf(m.nda[b.id]) >= 0); }); if (engaged && b.lastVerified && U.diffDays(b.lastVerified, d) === 181 && !b.archived && E.isBusinessBuyer(b)) notify('Profil à requalifier : ' + b.name, 'Critères confirmés il y a plus de 180 jours : confiance passée à « faible »; le profil sort de l’entonnoir actif.', { href: '#/acheteurs/' + b.id, kind: 'expiry' }); });
  }
  function runScheduled(ev) {
    var m = ev.m ? mandate(ev.m) : null;
    if (ev.m && !m) return;
    if (ev.kind === 'nda') {
      var cur = m.nda[ev.buyer]; if (!cur || cur === 'signe' || cur === 'refuse' || cur === 'retire') return;
      if (m.leak || m.hold) { schedule(ev.at + 1440 * 2, 'nda', { m: m.id, buyer: ev.buyer, result: ev.result, reason: ev.reason }); return; }
      if (ev.result === 'signe') { m.nda[ev.buyer] = 'signe'; m.ndaDates[ev.buyer] = today(); log(m.code, 'Entente de confidentialité signée : ' + bname(ev.buyer), 'Signature électronique simulée; certificat conservé dans la salle', { m: m.id, kind: 'buyers', actor: 'Système' }); notify(m.codename + ' : entente signée', bname(ev.buyer) + ' a signé l’entente de confidentialité. Accordez l’accès à la salle s’il y a lieu.', { href: mhref(m, 'salle'), m: m.id, kind: 'buyers' }); }
      else if (ev.result === 'consulte') { m.nda[ev.buyer] = 'consulte'; log(m.code, 'Sommaire consulté : ' + bname(ev.buyer), 'Entente ouverte, non signée', { m: m.id, kind: 'buyers', actor: 'Système' }); }
      else { m.nda[ev.buyer] = 'consulte'; if (!m.pendingRefusals.some(function (x) { return x.buyer === ev.buyer; })) m.pendingRefusals.push({ buyer: ev.buyer, reason: ev.reason || 'autre (préciser)', date: today() }); log(m.code, bname(ev.buyer) + ' décline le dossier', 'Motif structuré requis avant de fermer la fiche', { m: m.id, kind: 'buyers', actor: 'Système' }); notify(m.codename + ' : refus à consigner', bname(ev.buyer) + ' décline le dossier. Consignez un motif structuré : il enrichit les critères appris.', { href: mhref(m, 'acheteurs'), m: m.id, kind: 'refusal', tone: 'warn' }); }
    } else if (ev.kind === 'docs') {
      var n = 0; (ev.items || []).forEach(function (id) { var s = E.itemStatus(m, id); if (s === 'demande' || s === 'a_demander') { m.room.status[id] = 'recu'; n++; } });
      if (n) { log(m.code, n + ' pièce' + (n > 1 ? 's' : '') + ' déposée' + (n > 1 ? 's' : '') + ' par le cédant (simulé)', 'Lien sans compte; en attente de révision', { m: m.id, kind: 'room', actor: (m.profile.owner || 'Cédant') + ' (cédant)' }); notify(m.codename + ' : ' + n + ' pièce' + (n > 1 ? 's' : '') + ' reçue' + (n > 1 ? 's' : ''), 'Le cédant a déposé ' + n + ' pièce' + (n > 1 ? 's' : '') + ' dans la salle de données. Elles attendent votre révision.', { href: mhref(m, 'salle'), m: m.id, kind: 'room' }); }
    } else if (ev.kind === 'docRemind') {
      var out = E.roomFolders(m).reduce(function (a, f) { return a.concat(f.items.filter(function (it) { return E.itemStatus(m, it.id) === 'demande'; })); }, []);
      if (out.length) log(m.code, 'Rappel automatique au cédant (J+' + ev.n + ', simulé)', out.length + ' pièce' + (out.length > 1 ? 's' : '') + ' en attente', { m: m.id, kind: 'room', actor: 'Système' });
    } else if (ev.kind === 'views') {
      if (!E.grantActive(m, ev.buyer, state)) return;
      var gr = m.grants[ev.buyer], b = buyer(ev.buyer), r = b ? E.matchScore(b, m, state.weights, state) : { score: 50 };
      gr.folders.slice(0, 3).forEach(function (f, i) { var min = Math.max(3, Math.round((r.score - 40) * (i === 0 ? 0.8 : 0.4))); m.views.push({ buyer: ev.buyer, folder: f, min: min, date: today() }); m.accessLog.unshift({ at: stamp(), who: bname(ev.buyer), what: 'Dossier ' + f + ' ' + folderName(f), action: 'Consultation (' + min + ' min)', ok: true }); });
      log(m.code, 'Consultations de la salle : ' + bname(ev.buyer), 'Filigrane nominatif appliqué à chaque page', { m: m.id, kind: 'room', actor: 'Système' });
    } else if (ev.kind === 'lois') {
      if ((m.lois || []).length) return;
      var lois = E.generateLOIs(m, state);
      if (!lois.length) { log(m.code, 'Date limite des LI atteinte', 'Aucune lettre reçue : aucun signataire avec accès actif', { m: m.id, kind: 'loi', actor: 'Système' }); notify(m.codename + ' : aucune lettre d’intention', 'La date limite est passée sans lettre. Vérifiez les accès et relancez les signataires.', { href: mhref(m, 'cloture'), m: m.id, kind: 'loi', tone: 'warn' }); return; }
      m.lois = lois;
      log(m.code, lois.length + ' lettre' + (lois.length > 1 ? 's' : '') + ' d’intention reçue' + (lois.length > 1 ? 's' : ''), lois.map(function (l) { return bname(l.buyer); }).join(', '), { m: m.id, kind: 'loi', actor: 'Système' });
      notify(m.codename + ' : ' + lois.length + ' lettre' + (lois.length > 1 ? 's' : '') + ' d’intention', 'Comparez-les champ par champ avant d’en retenir une.', { href: mhref(m, 'cloture'), m: m.id, kind: 'loi' });
    } else if (ev.kind === 'lender') {
      var loi = E.loiOf(m); if (!loi || E.financingOk(m)) return;
      var F = E.financing(m, loi);
      if (F.dscr >= F.threshold) { m.financingApproved = true; log(m.code, 'Approbation conditionnelle du prêteur reçue (simulé)', 'Ratio de couverture ' + U.num(F.dscr, 2) + '× (seuil ' + U.num(F.threshold, 2) + '×)', { m: m.id, kind: 'loi', actor: 'Système' }); notify(m.codename + ' : financement approuvé', 'Approbation conditionnelle du prêteur reçue.', { href: mhref(m, 'cloture'), m: m.id, kind: 'loi' }); }
      else { log(m.code, 'Prêteur : demande refusée (simulé)', 'Ratio de couverture ' + U.num(F.dscr, 2) + '× sous le seuil', { m: m.id, kind: 'loi', actor: 'Système' }); notify(m.codename + ' : financement refusé', 'Le ratio de couverture est sous le seuil : restructurer (BPV, mise de fonds) ou changer d’offre.', { href: mhref(m, 'cloture'), m: m.id, kind: 'loi', tone: 'err' }); }
    } else if (ev.kind === 'ddIndex') { ddIndex(m, 'Système'); }
    else if (ev.kind === 'auditRemind') {
      var c = lead(ev.lead), k = c && state.companyState[c.id] && state.companyState[c.id].call; if (!c || !k || !k.booked || k.auditDone) return;
      notify('Rappel ' + ev.label + ' : audit de sortie', c.name + ', ' + U.date(k.booked.date) + ' à ' + U.time(k.booked.min) + ' (' + k.booked.type + ').', { href: '#/radar/' + c.id, kind: 'reminder' });
      log(c.name, 'Rappel ' + ev.label + ' envoyé (simulé)', 'Audit de sortie du ' + U.date(k.booked.date), { kind: 'radar', actor: 'Système' });
    } else if (ev.kind === 'callback') {
      var c2 = lead(ev.lead); if (!c2 || (state.companyState[c2.id] || {}).consentWithdrawn) return;
      notify('Rappel prévu : ' + c2.name, 'Le prospect avait demandé d’être rappelé vers cette date.', { href: '#/radar/' + c2.id, kind: 'reminder' });
    } else if (ev.kind === 'intakeRemind') {
      var c3 = lead(ev.lead), k3 = c3 && (state.companyState[c3.id] || {}).call; if (!k3 || k3.intake !== 'sent') return;
      log(c3.name, 'Rappel du questionnaire (J+' + ev.n + ', simulé)', 'Barrière LCAP repassée : fondement valide', { kind: 'radar', actor: 'Système' });
    }
  }
  function folderName(id) { var f = D.ROOM_TEMPLATE.filter(function (x) { return x.id === id; })[0]; return f ? f.name : id; }

  /* ================= Actions ================= */
  var A = {};
  A.role = function (p) { if (!D.ROLE_LABEL[p.value]) return fail('Rôle inconnu.'); state.role = p.value; log('Session', 'Vue changée', D.ROLE_LABEL[p.value], { kind: 'session' }); return ok('Vue : ' + D.ROLE_LABEL[p.value]); };
  A.clockAdvance = function (p) {
    var min = Math.round(+p.minutes || 0); if (min <= 0 || min > 60 * 24 * 400) return fail('Durée invalide.');
    var before = stamp(), n = advanceTo(absNow() + min);
    log('Horloge', 'Horloge avancée', before + ' à ' + stamp() + '; ' + n + ' événement' + (n > 1 ? 's' : '') + ' traité' + (n > 1 ? 's' : ''), { kind: 'clock', actor: 'Labo de test' });
    return ok('Horloge : ' + U.dateTime(state.clock.d, state.clock.m) + (n ? '. ' + n + ' événement' + (n > 1 ? 's' : '') + ' traité' + (n > 1 ? 's' : '') + '.' : '.'));
  };
  A.clockTo = function (p) {
    if (!U.isIsoDate(p.date)) return fail('Date invalide (AAAA-MM-JJ).');
    var tm = p.time != null ? +p.time : 540, target = U.absMin(p.date, tm);
    if (target <= absNow()) return fail('L’horloge de démonstration ne recule jamais : choisissez une date future.');
    if (U.diffDays(today(), p.date) > 400) return fail('Au plus 400 jours à la fois.');
    var before = stamp(), n = advanceTo(target);
    log('Horloge', 'Horloge avancée à une date', before + ' à ' + stamp() + '; ' + n + ' événement' + (n > 1 ? 's' : '') + ' traité' + (n > 1 ? 's' : ''), { kind: 'clock', actor: p.actor || 'Labo de test' });
    return ok('Horloge : ' + U.dateTime(state.clock.d, state.clock.m) + (n ? '. ' + n + ' événement' + (n > 1 ? 's' : '') + ' traité' + (n > 1 ? 's' : '') + '.' : '.'));
  };
  A.inboxRead = function (p) { var n = E.byId(state.inbox, p.id); if (n) n.read = true; return ok(null, { silent: !!p.silent }); };
  A.inboxReadAll = function () { state.inbox.forEach(function (n) { n.read = true; }); return ok('Notifications marquées comme lues.'); };
  A.caps = function (p) { if (!(p.key in state.caps)) return fail('Capacité inconnue.'); state.caps[p.key] = !!p.value; log('Labo de test', 'Capacité ' + (p.value ? 'rétablie' : 'désactivée') + ' : ' + p.key, 'Pour tester les replis', { kind: 'lab', actor: 'Labo de test' }); return ok(); };
  A.tourStep = function (p) { state.tourStep = p.n; return ok(null, { silent: true }); };
  A.towerMandate = function (p) { if (!mandate(p.value)) return fail('Mandat introuvable.'); state.towerMandate = p.value; return ok(); };

  /* ---------------- Radar : pistes (CRUD) et appel ---------------- */
  A.radarPreset = function (p) { state.radar.preset = p.id; return ok(); };
  A.radarSelect = function (p) { state.radar.selected = p.id; return ok(); };
  function validLead(d) {
    if (!d.name || d.name.trim().length < 3) return 'Raison sociale requise (3 caractères ou plus).';
    if (!/^\d{3,6}$/.test(String(d.scian || ''))) return 'Code SCIAN de 3 à 6 chiffres requis.';
    if (D.REGIONS.indexOf(d.region) < 0) return 'Choisissez une région administrative.';
    if (!(+d.employees > 0)) return 'Effectif requis (nombre positif).';
    if (!d.director || d.director.trim().length < 3) return 'Nom du dirigeant requis.';
    if (d.phone && !/^\(\d{3}\) \d{3}-\d{4}$/.test(d.phone)) return 'Téléphone au format (418) 555-0123.';
    if (d.email && !/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(d.email)) return 'Courriel invalide.';
    if (!U.isIsoDate(d.registered)) return 'Date d’immatriculation au format AAAA-MM-JJ.';
    return null;
  }
  A.leadCreate = function (p) {
    var d = p.data || {}, err = validLead(d); if (err) return fail(err);
    var id = 'r' + (state.leads.length + 1) + '-' + U.hash(d.name + absNow()).slice(0, 4);
    var c = { id: id, manual: true, name: d.name.trim(), neq: d.neq || '—', registered: d.registered, scian: String(d.scian), scianLabel: (E.sectorOf(d.scian) || {}).label || 'Secteur SCIAN ' + d.scian, city: d.city || '—', region: d.region,
      employees: +d.employees, employeesSrc: 'Saisie manuelle', director: d.director.trim(), directorSince: String(d.registered).slice(0, 4), ownerAgeBand: d.ageBand || null,
      signals: d.signal ? [{ type: d.signal, date: today(), detail: 'Saisi manuellement', channel: 'Saisie' }] : [], contacts: [], owner: D.ROLE_USER[state.role] === 'mt' || D.ROLE_USER[state.role] === 'sl' ? null : D.ROLE_USER[state.role],
      reqFresh: today(), building: 'inconnu', stage: 'prospect', lastTouch: null, reason: 'Piste saisie le ' + U.date(today()), preset: [], sampleNotes: '', sampleIntake: null, audit: null };
    if (d.phone) c.contacts.push({ id: id + 'p', kind: 'Téléphone', value: d.phone, business: d.business !== false, src: 'Saisie manuelle', srcDate: today(), basis: 'na', dnc: d.business !== false ? 'Ligne d’affaires, exemption B2B consignée' : 'Ligne personnelle : vérification LNNTE requise' });
    if (d.email) c.contacts.push({ id: id + 'e', kind: 'Courriel', value: d.email, business: true, src: 'Saisie manuelle', srcDate: today(), basis: d.basis || 'aucun', basisNote: 'Fondement déclaré à la saisie' });
    state.leads.push(c); state.radar.selected = id;
    log(c.name, 'Piste créée', 'SCIAN ' + c.scian + ', ' + c.region, { kind: 'radar' });
    return ok('Piste créée : ' + c.name + '.', { id: id });
  };
  A.leadUpdate = function (p) {
    var c = lead(p.id); if (!c) return fail('Piste introuvable.');
    var d = Object.assign({ name: c.name, scian: c.scian, region: c.region, employees: c.employees, director: c.director, registered: c.registered }, p.data || {}), err = validLead(d); if (err) return fail(err);
    ['name', 'city', 'region', 'director'].forEach(function (k) { if (d[k] != null) c[k] = String(d[k]).trim(); });
    c.scian = String(d.scian); c.employees = +d.employees; c.registered = d.registered;
    log(c.name, 'Fiche modifiée', 'Champs mis à jour par ' + actorName(), { kind: 'radar' }); return ok('Fiche enregistrée.');
  };
  A.leadDelete = function (p) {
    var i = state.leads.findIndex(function (c) { return c.id === p.id; }); if (i < 0) return fail('Piste introuvable.');
    var c = state.leads[i], k = state.companyState[c.id] || {};
    if (k.mandateId) return fail('Cette piste a produit un mandat : elle ne peut pas être supprimée.');
    var snap = { lead: U.clone(c), cs: U.clone(state.companyState[c.id] || null), index: i };
    state.leads.splice(i, 1); delete state.companyState[c.id];
    if (state.radar.selected === c.id) state.radar.selected = (state.leads[0] || {}).id;
    log(c.name, 'Piste supprimée', 'Annulable depuis la notification', { kind: 'radar' });
    return ok('Piste supprimée.', { undo: { action: 'leadRestore', payload: snap, label: 'Annuler' } });
  };
  A.leadRestore = function (p) { if (!p.lead || lead(p.lead.id)) return fail('Rien à restaurer.'); state.leads.splice(Math.min(p.index || 0, state.leads.length), 0, p.lead); if (p.cs) state.companyState[p.lead.id] = p.cs; log(p.lead.name, 'Piste restaurée', '', { kind: 'radar' }); return ok('Piste restaurée.'); };
  A.phoneVerify = function (p) {
    var c = lead(p.id); if (!c) return fail('Piste introuvable.'); var ph = E.phoneOf(c); if (!ph) return fail('Aucun numéro au dossier.'); if (ph.business) return fail('Ligne d’affaires : exemption déjà consignée.');
    if (E.isDnc(ph.value, state)) return fail('Numéro inscrit à la liste interne d’exclusion : jamais appelable.');
    cs(c.id).phoneVerified = today(); log(c.name, 'Numéro personnel vérifié à la LNNTE (simulé)', ph.value + ' absent de la liste nationale au ' + U.date(today()) + '; valide 31 jours', { kind: 'compliance' });
    return ok('Numéro absent de la LNNTE (vérification simulée) : appel permis pendant 31 jours.');
  };
  A.leadReassign = function (p) { if (!P.admin()) return fail('Seule l’administratrice réattribue un prospect.'); var c = lead(p.id); if (!c) return fail('Piste introuvable.'); var from = (cs(c.id).owner || c.owner); cs(c.id).owner = 'cp'; log(c.name, 'Prospect réattribué', (from ? D.TEAM[from].name : 'Non réclamé') + ' à Catherine Pelletier (administratrice)', { kind: 'radar' }); notify('Prospect réattribué : ' + c.name, 'Transfert consigné au journal. L’ancien propriétaire en est avisé.', { href: '#/radar/' + c.id, kind: 'radar' }); return ok('Prospect réattribué à Catherine Pelletier.'); };
  A.callOpen = function (p) {
    var c = lead(p.id); if (!c) return fail('Piste introuvable.');
    var k0 = state.companyState[c.id]; if (k0 && k0.consentWithdrawn === 'tout') return fail('La personne a retiré son consentement (Loi 25) : aucun contact.');
    var gate = E.callGate(c, state);
    if (!gate.ok) { state.compliance.blockedAttempts++; log(c.name, 'Appel bloqué par la barrière de conformité', gate.first.block, { kind: 'compliance' }); return fail(gate.first.block); }
    var k = call(p.id); k.step = 'call';
    log(c.name, 'Ligne ouverte (appel simulé)', 'Barrière : ' + gate.checks.length + ' vérifications réussies; enregistrement désactivé', { kind: 'radar' });
    return ok('Appel simulé : aucune ligne réelle n’est ouverte.');
  };
  A.callNotes = function (p) { call(p.id).notes = String(p.value || '').slice(0, 6000); return ok(null, { silent: true }); };
  A.callSample = function (p) { var c = lead(p.id); if (!c) return fail('Piste introuvable.'); var k = call(p.id); if (!c.sampleNotes) return fail('Aucune note d’exemple pour cette piste : saisissez les vôtres.'); k.notes = c.sampleNotes; return ok(); };
  // Extraction : par règles ou à partir d'un résultat d'IA déjà validé (même structure), toujours en proposition.
  A.callExtract = function (p) {
    var c = lead(p.id), k = call(p.id);
    if (!k.notes || k.notes.trim().length < 20) return fail('Ajoutez des notes d’appel avant l’extraction (20 caractères ou plus).');
    var res = p.result || R.extractNotes(k.notes, c);
    k.fields = res.fields; k.x = {}; res.fields.forEach(function (f) { k.x[f.id] = 'proposed'; });
    k.suggested = res.disposition; if (!k.disposition) k.disposition = null;
    k.provenance = p.provenance || { source: 'rules' }; k.step = 'extract';
    log(c.name, 'Extraction proposée (' + (k.provenance.source === 'live-ai' ? 'IA en direct, ' + k.provenance.model : 'règles') + ')', res.fields.length + ' champs proposés, aucun écrit avant révision' + (p.fallback ? '; repli sur les règles : ' + p.fallback : ''), { kind: k.provenance.source === 'live-ai' ? 'ai' : 'radar' });
    return ok(res.fields.length ? null : 'Aucun champ reconnu dans ces notes : la disposition reste obligatoire.');
  };
  A.callBackToNotes = function (p) { var k = call(p.id); if (k.step !== 'extract') return fail('Aucune extraction à reprendre.'); k.step = 'call'; return ok('Notes rouvertes : corrigez-les puis relancez l’extraction (règles ou IA en direct).'); };
  A.callEnd = function (p) { var k = call(p.id); if (k.step !== 'call') return fail('Aucun appel en cours.'); return A.callExtract({ id: p.id }); };
  A.extractDecide = function (p) { call(p.id).x[p.x] = p.d; return ok(); };
  A.extractAll = function (p) { var k = call(p.id); (k.fields || []).forEach(function (f) { if (k.x[f.id] === 'proposed') k.x[f.id] = 'accepted'; }); return ok('Champs acceptés; vous pouvez encore en rejeter un.'); };
  A.callDisposition = function (p) { if (p.value && D.DISPOSITIONS.indexOf(p.value) < 0) return fail('Disposition inconnue.'); call(p.id).disposition = p.value || null; return ok(); };
  A.callCommit = function (p) {
    var c = lead(p.id), k = call(p.id), st = cs(p.id);
    if (!k.disposition) return fail('Choisissez une disposition : elle est obligatoire après chaque appel.');
    var pend = (k.fields || []).filter(function (f) { return k.x[f.id] === 'proposed'; });
    if (pend.length) return fail('Décidez des ' + pend.length + ' champs proposés avant d’enregistrer.');
    var before = E.radarScore(c, state).total, written = [];
    (k.fields || []).forEach(function (f) {
      if (k.x[f.id] !== 'accepted') return;
      written.push(f.field);
      if (f.key === 'ageBand') st.ageBand = f.value;
      else if (f.key === 'employees') { var n = parseInt(f.value, 10); if (n > 0) st.employees = n; }
      else if (f.key === 'exitHorizon') st.exitHorizon = { value: f.value, rank: f.conf === 'Élevée' ? 1 : 3, src: 'Appel du ' + U.date(today()) + (f.conf === 'Élevée' ? ', vérifié par l’agent' : ', déclaré') };
      else if (f.key === 'propertyOwner') st.propertyOwner = { value: f.value, rank: f.conf === 'Élevée' ? 1 : 3, src: 'Appel du ' + U.date(today()) + (f.conf === 'Élevée' ? ', vérifié par l’agent' : ', déclaré') };
      else if (f.key === 'succession') st.succession = f.value;
      else if (f.key === 'advisor') { st.advisor = f.value.replace(/^conseille_par : /, ''); state.counters.relations++; }
      else if (f.key === 'revenueBand') st.revenueBand = f.value;
      else if (f.key === 'email') { st.email = f.value; st.emailDate = today(); }
      else if (f.key === 'callback') { var mo = parseInt(f.value.replace(/\D+/g, ' '), 10) || 6, unit = /semaine/.test(f.value) ? 7 : /an/.test(f.value) ? 365 : 30; st.callbackDate = U.addDays(today(), mo * unit); schedule(U.absMin(st.callbackDate, 600), 'callback', { lead: c.id }); }
    });
    if ((k.fields || []).some(function (f) { return (f.key === 'exitHorizon' || f.key === 'succession') && k.x[f.id] === 'accepted'; })) state.counters.criteria++;
    k.committed = true; k.step = 'after'; st.lastTouch = today();
    var disp = k.disposition, phone = E.phoneOf(c);
    if (disp === 'refus' || disp === 'retiré de la liste') {
      if (disp === 'retiré de la liste' && phone && !E.isDnc(phone.value, state)) { state.dnc.unshift({ value: phone.value, company: c.name, date: today(), source: 'Disposition « ' + disp + ' »' }); log(c.name, 'Numéro ajouté à la liste interne d’exclusion', 'Irréversible pour un non-administrateur', { kind: 'compliance' }); }
      st.stage = disp === 'refus' ? 'perdu' : 'contacte';
    } else {
      st.stage = 'contacte';
      if (disp === 'a accepté le questionnaire') { st.emailBasis = 'demande'; st.basisSince = today(); k.intake = E.emailOf(c, state) ? 'ready' : 'needEmail'; }
    }
    var after = E.radarScore(c, state).total;
    st.scoreHistory = (st.scoreHistory || []).concat([{ date: today(), from: before, to: after, why: written.length ? written.slice(0, 2).join(', ') + ' consignés' : 'Disposition consignée' }]);
    log(c.name, 'Appel consigné : ' + disp, (written.length ? written.length + ' champs écrits après révision' : 'Aucun champ écrit') + '; score ' + before + ' à ' + after + ' (version précédente conservée)', { kind: 'radar' });
    return ok('Appel consigné. Score recalculé : ' + before + ' à ' + after + '.');
  };
  A.callReset = function (p) {
    var c = lead(p.id), k = call(p.id), st = cs(p.id); if (!c) return fail('Piste introuvable.');
    if (k.disposition === 'retiré de la liste' || st.consentWithdrawn === 'tout') return fail('Numéro retiré de la liste : aucun nouvel appel.');
    st.calls = (st.calls || []).concat([{ date: today(), disposition: k.disposition }]); delete st.call; call(p.id);
    log(c.name, 'Nouvel appel préparé', 'Appel précédent conservé à l’historique (' + (st.calls.slice(-1)[0].disposition || 'sans disposition') + ')', { kind: 'radar' });
    return ok();
  };
  A.contactAdd = function (p) { var c = lead(p.id); if (!c) return fail('Piste introuvable.'); if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(String(p.email || ''))) return fail('Courriel invalide.'); var st = cs(p.id); st.email = p.email; st.emailDate = today(); var k = call(p.id); if (k.intake === 'needEmail') k.intake = 'ready'; log(c.name, 'Courriel consigné', p.email + ' (fourni verbalement à l’appel)', { kind: 'radar' }); return ok(); };
  A.intakeSend = function (p) {
    var c = lead(p.id), k = call(p.id), st = cs(p.id), em = E.emailOf(c, state);
    if (!em) return fail('Aucun courriel au dossier : consignez l’adresse fournie à l’appel.');
    var basis = E.emailBasis(c, em, state);
    if (basis === 'aucun' || basis === 'supprime') return fail('Envoi bloqué : aucun fondement de consentement pour cette adresse.');
    k.intake = 'sent'; k.token = U.hash(c.id + absNow()).toUpperCase().slice(0, 4) + '-' + U.hash(c.name).toUpperCase().slice(0, 4);
    k.link = 'https://questionnaire.lafirmecte.example/q/' + k.token; k.linkExpires = U.addDays(today(), 14);
    schedule(inDays(3, 9), 'intakeRemind', { lead: c.id, n: 3 }); schedule(inDays(7, 9), 'intakeRemind', { lead: c.id, n: 7 });
    log(c.name, 'Questionnaire de sortie envoyé (simulé)', 'Barrière LCAP : fondement « ' + E.BASIS_LABEL[basis].toLowerCase() + ' », mentions obligatoires et désabonnement ajoutés; expiration ' + U.date(k.linkExpires), { kind: 'radar' });
    return ok('Envoi simulé : aucun courriel ne quitte la démo.');
  };
  var CONFLICT_KEYS = [['exitHorizon', 'Horizon de sortie'], ['propertyOwner', 'Propriétaire de l’immeuble']];
  A.intakeSubmit = function (p) {
    var c = lead(p.id), k = call(p.id), st = cs(p.id);
    if (k.intake !== 'sent') return fail('Le lien n’est plus valide (expiré ou révoqué).');
    if (!p.notice) return fail('Le cédant doit prendre connaissance de l’avis de collecte (Loi 25) pour soumettre.');
    var a = p.answers || {}; k.answers = a; k.intake = 'completed';
    var updated = 0; Object.keys(a).forEach(function (key) { if (String(a[key] || '').trim()) updated++; });
    if (parseInt(a.employees, 10) > 0) st.employees = parseInt(a.employees, 10);
    if (a.revenueBand) st.revenueBand = a.revenueBand;
    k.conflictList = []; var n = 0;
    CONFLICT_KEYS.forEach(function (ck) {
      var cur = st[ck[0]], val = String(a[ck[0]] || '').trim();
      if (!val) return;
      if (!cur) { st[ck[0]] = { value: val, rank: 3, src: 'Questionnaire de sortie' }; return; }
      if (U.fold(cur.value) === U.fold(val)) return;
      n++; k.conflictList.push({ id: 'c' + n, key: ck[0], field: ck[1], a: { value: cur.value, src: cur.src, rank: cur.rank }, b: { value: val, src: 'Questionnaire de sortie', rank: 3 } });
    });
    if (!st.advisor && a.advisors && /CPA|comptable/i.test(a.advisors)) st.advisorHint = a.advisors;
    if (p.cem) { st.emailBasis = 'expres'; st.consentEvidence = { wording: 'v2026.2', at: stamp(), link: k.token }; }
    log(c.name, 'Questionnaire complété', updated + ' champs mis à jour, ' + k.conflictList.length + ' conflit' + (k.conflictList.length > 1 ? 's' : '') + ' à résoudre' + (st.advisor ? ', 1 relation proposée' : '') + (p.cem ? '; consentement exprès consigné (libellé v2026.2)' : '; aucun consentement exprès'), { kind: 'radar', actor: c.director + ' (prospect)' });
    notify('Questionnaire reçu : ' + c.name, updated + ' champs mis à jour, ' + k.conflictList.length + ' conflit' + (k.conflictList.length > 1 ? 's' : '') + ' à résoudre.', { href: '#/radar/' + c.id, kind: 'radar' });
    return ok(c.name + ' a complété le questionnaire : ' + updated + ' champs mis à jour, ' + k.conflictList.length + ' conflit' + (k.conflictList.length > 1 ? 's' : '') + ' à résoudre' + (st.advisor ? ', 1 relation proposée' : '') + '.');
  };
  A.conflictResolve = function (p) {
    var c = lead(p.id), k = call(p.id), st = cs(p.id), x = E.byId(k.conflictList, p.c); if (!x) return fail('Conflit introuvable.');
    k.conflicts[p.c] = p.choice; var v = x[p.choice]; st[x.key] = { value: v.value, rank: v.rank, src: v.src };
    log(c.name, 'Conflit résolu', x.field + ' : valeur ' + (p.choice === 'a' ? 'existante conservée' : 'du questionnaire retenue'), { kind: 'radar' });
    return ok();
  };
  A.relationConfirm = function (p) { var c = lead(p.id), k = call(p.id), st = cs(p.id); k.relation = p.d; if (p.d === 'yes') state.counters.relations++; log(c.name, p.d === 'yes' ? 'Relation confirmée' : 'Relation écartée', 'conseille_par : ' + (st.advisor || st.advisorHint || 'conseiller'), { kind: 'radar' }); return ok(); };
  A.bookAudit = function (p) {
    var c = lead(p.id), k = call(p.id), st = cs(p.id);
    var open = (k.conflictList || []).filter(function (x) { return !k.conflicts[x.id]; });
    if (open.length) return fail('Résolvez les conflits avant de planifier l’audit.');
    var d = U.addDays(today(), 6); while (U.weekday(d) === 0 || U.weekday(d) === 6) d = U.addDays(d, 1);
    k.booked = { date: d, min: 600, type: 'Audit de sortie, 60 min, en personne à ' + c.city };
    st.stage = 'audit_planifie';
    schedule(U.absMin(U.addDays(d, -1), 600), 'auditRemind', { lead: c.id, label: 'J-1' }); schedule(U.absMin(d, 480), 'auditRemind', { lead: c.id, label: 'H-2' });
    log(c.name, 'Audit de sortie planifié (simulé)', U.dateLong(d) + ', 10 h; rappels J-1 et H-2 prévus', { kind: 'radar' });
    return ok('Audit de sortie planifié le ' + U.dateLong(d) + ' à 10 h (invitation simulée).');
  };
  A.auditRecord = function (p) {
    var c = lead(p.id), k = call(p.id), st = cs(p.id), f = p.facts || {};
    if (!k.booked) return fail('Planifiez d’abord l’audit de sortie.');
    if (absNow() < U.absMin(k.booked.date, k.booked.min)) return fail('L’audit est prévu le ' + U.date(k.booked.date) + ' à 10 h : avancez l’horloge (Labo de test) pour le consigner.');
    var e = U.parseAmount(f.ebitdaEst), rv = U.parseAmount(f.revenueEst), pm = parseFloat(String(f.priceMultiple || '').replace(',', '.'));
    if (!(e > 0) || !(rv > 0) || e >= rv) return fail('BAIIA estimé et chiffre d’affaires requis (BAIIA inférieur au chiffre d’affaires).');
    if (!(pm > 0 && pm < 20)) return fail('Attente de prix requise, en multiple du BAIIA (ex. 4,5).');
    st.audit = { date: today(), ebitdaEst: e, revenueEst: rv, priceMultiple: pm, engagement: f.engagement || 'Avis au lecteur', dependency: f.dependency || 'moyenne', topClientPct: +f.topClientPct || 0, recurringPct: +f.recurringPct || 0,
      property: f.propertyValue ? 'Société sœur' : 'Locataire', propertyValue: U.parseAmount(f.propertyValue) || 0, marketRent: U.parseAmount(f.marketRent) || 0, rentPaid: U.parseAmount(f.rentPaid) || 0,
      owner: c.director, ownerAge: +f.ownerAge || null, responsiveness: k.intake === 'completed' ? 'Questionnaire rempli' : null, horizon: (st.exitHorizon || {}).value || '', propco: f.propco || '' };
    k.auditDone = today(); st.stage = 'audit_tenu';
    log(c.name, 'Audit de sortie consigné', 'BAIIA estimé ' + U.money(e) + ', attente ' + U.x(pm) + '; décision d’acceptation à rendre', { kind: 'radar' });
    notify('Décision d’acceptation à rendre : ' + c.name, 'L’audit de sortie est consigné. Le moteur d’acceptation propose une lecture; la courtière tranche.', { href: '#/radar/' + c.id, kind: 'radar' });
    return ok('Audit consigné : décision d’acceptation à rendre.');
  };
  A.acceptance = function (p) {
    var c = lead(p.id); if (!c) return fail('Piste introuvable.');
    var st = cs(p.id);
    if (!P.decideMandate()) return fail('Seule la courtière responsable rend la décision d’acceptation.');
    if (st.acceptance) return fail('Décision déjà consignée.');
    if (D.ACCEPTANCE_OPTIONS.map(function (o) { return o.id; }).indexOf(p.decision) < 0) return fail('Choisissez une décision.');
    if (!p.rationale || p.rationale.trim().length < 10) return fail('Consignez la justification de la décision (10 caractères ou plus).');
    var acc = E.acceptance(c, state); if (!acc) return fail('Aucun audit de sortie consigné pour cette piste.');
    st.acceptance = { decision: p.decision, rationale: p.rationale.trim(), date: today(), by: actorName(), suggested: acc.suggestion };
    var lbl = D.ACCEPTANCE_OPTIONS.filter(function (o) { return o.id === p.decision; })[0].label;
    log(c.name, 'Décision d’acceptation : ' + lbl, p.rationale.trim() + (acc.suggestion !== p.decision ? ' (suggestion du moteur : ' + acc.suggestion + ')' : ''), { kind: 'radar' });
    if (p.decision === 'refuser') { st.stage = 'perdu'; return ok('Décision consignée : refus. Refuser un mandat ne signifie pas que l’entreprise est invendable.'); }
    var m = buildFromLead(c, acc.audit, p.decision);
    st.stage = p.decision === 'preparation' ? 'preparation' : 'pret'; st.mandateId = m.id;
    log(m.code, 'Mandat créé depuis le radar', m.codename + ' (' + (m.kind === 'preparation' ? 'mandat de préparation' : 'mandat de vente') + ') pour ' + c.name, { m: m.id, kind: 'stage' });
    notify('Nouveau mandat : ' + m.codename, c.name + ' : saisissez les états financiers de trois exercices pour lancer le retraitement.', { href: mhref(m, 'retraitement'), m: m.id, kind: 'stage' });
    return ok('Décision consignée : ' + lbl + '. ' + m.codename + ' (' + m.code + ') est créé.', { id: m.id });
  };

  /* ---------------- Mandats : création, modification, suppression ---------------- */
  function nextCode() { var n = state.nextCode++; return 'M-' + today().slice(0, 4) + '-0' + (n < 10 ? '0' : '') + n; }
  function nextCodename() { var used = mandates().map(function (m) { return m.codename; }); var b = D.BIRDS.filter(function (x) { return used.indexOf('Projet ' + x) < 0; })[0] || ('Oiseau ' + (state.mandateIds.length + 1)); return 'Projet ' + b; }
  function bandOf(v, steps, unit) { for (var i = 0; i < steps.length - 1; i++) if (v < steps[i + 1]) return U.num(steps[i] / (unit === 'k' ? 1000 : 1e6), unit === 'M' ? 0 : 0) + ' à ' + U.num(steps[i + 1] / (unit === 'k' ? 1000 : 1e6), 0) + ' ' + (unit === 'k' ? 'k$' : 'M$'); return 'plus de ' + U.num(steps[steps.length - 1] / (unit === 'k' ? 1000 : 1e6), 0) + ' ' + (unit === 'k' ? 'k$' : 'M$'); }
  function blindFor(p, rev, ebitda) {
    var sec = E.sectorOf(p.scian), yrs = Math.floor(U.diffDays(p.registered, today()) / 365.25);
    return { sector: (sec ? sec.label : 'Entreprise SCIAN ' + p.scian), region: p.region + ' (sans précision de ville)',
      revenueBand: rev ? bandOf(rev, [0, 1e6, 2e6, 3e6, 5e6, 8e6, 10e6, 15e6, 25e6], 'M') : 'à confirmer', ebitdaBand: ebitda ? bandOf(ebitda, [0, 200000, 400000, 600000, 800000, 1000000, 1500000, 2000000], 'k') : 'à confirmer',
      employeesBand: p.employees < 10 ? 'moins de 10 employés' : p.employees < 20 ? '10 à 20 employés' : p.employees < 35 ? '20 à 35 employés' : p.employees < 50 ? '35 à 50 employés' : '50 employés et plus',
      age: yrs >= 30 ? 'plus de 30 ans' : yrs >= 20 ? 'plus de 20 ans' : yrs >= 10 ? 'plus de 10 ans' : 'moins de 10 ans' };
  }
  function blankMandate(p, extra) {
    var sec = E.sectorOf(p.scian) || D.SECTORS[0], signed = today();
    var m = Object.assign({
      id: 'm' + U.hash(p.company + absNow()).slice(0, 6), code: nextCode(), codename: nextCodename(), stage: 'signe', kind: 'vente', origin: 'manuel', feePolicy: 'A', prepFee: 3500,
      structure: p.structure || 'actions100', amfValidated: null, disclosure: 'aveugle', team: { courtier: 'cp', analyste: 'mt' },
      profile: { company: p.company, neq: p.neq || '—', registered: p.registered, scian: sec.code, sectorLabel: sec.label, city: p.city || '—', region: p.region, area: p.area || '', employees: +p.employees, owner: p.owner, ownerAge: +p.ownerAge || null, ownerAgeBand: p.ownerAge ? R.ageBand(+p.ownerAge) : null, ownerSource: 'saisi le ' + signed, holdco: p.holdco || '', propco: p.propco || '', cpa: p.cpa || '', engagement: p.engagement || 'Mission d’examen', union: !!p.union, topClientPct: +p.topClientPct || 0, recurringPct: +p.recurringPct || 0, ownerDependency: p.ownerDependency || 'moyenne' },
      sellerPrefs: [{ id: 'emplois', label: 'Maintien des ' + p.employees + ' emplois', weight: 'forte' }, { id: 'quebec', label: 'Acquéreur québécois privilégié', weight: 'moyenne' }, { id: 'transition', label: 'Transition de 6 à 12 mois', weight: 'moyenne' }, { id: 'bpv', label: 'Balance de prix de vente acceptée jusqu’à 20 %', weight: 'moyenne' }],
      dates: { signed: signed, exclusivityEnd: U.addDays(signed, 365), prepStart: null }, history: [{ stage: 'signe', date: signed }], committed: E.commitSchedule(signed),
      fin: { entered: false, years: [], revenue: {}, ebitda: {}, lines: [] }, adjustments: [], adj: {}, normApproved: null, normVersion: 1,
      val: { paramSet: 'Paramètres de marché démo v2026.3, ' + sec.param, verified: '2026-09-30', by: 'à valider par un EEE/CBV', base: U.clone(sec.mult), modifiers: [], bridge: { debt: U.parseAmount(p.debt) || 0, debtSrc: 'Dette portant intérêt déclarée (à confirmer aux ÉF)', cash: U.parseAmount(p.cash) || 0, cashSrc: 'Encaisse excédentaire déclarée', wcTarget: U.parseAmount(p.wcTarget) || 0, wcClose: U.parseAmount(p.wcTarget) || 0, wcSrc: 'FDR normalisé à confirmer (pièce 02-04)' } },
      valBase: 'conservative', mods: {}, valApproved: null,
      property: U.parseAmount(p.propertyValue) > 0 ? { value: U.parseAmount(p.propertyValue), src: 'Valeur déclarée, évaluation agréée à obtenir (pièce 07-04)', municipal: null, area: p.propertyArea || 'superficie à préciser', marketRent: U.parseAmount(p.marketRent) || 0, rentPaid: U.parseAmount(p.rentPaid) || 0, commissionRate: 0.05, investor: U.parseAmount(p.propertyValue) >= 1000000 && U.parseAmount(p.propertyValue) <= 2500000 && D.NEAR['Chaudière-Appalaches'].concat(['Chaudière-Appalaches']).indexOf(p.region) >= 0 ? 'b8' : null } : null,
      teaser: { draft: null, source: null, provenance: null, kept: {}, approved: null }, teaserSeed: null, teaserNotes: (p.highlights || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 5),
      cim: { claims: (p.claims || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4).map(function (t, i) { return { id: 'cl' + (i + 1), section: 3, t: t, src: null }; }), generated: false, decisions: {}, approved: null },
      exclusions: {}, cautions: {}, shortlist: [], listLocked: null, script: null, redList: [], teasersSent: null, nda: {}, ndaDates: {}, grants: {}, views: [], accessLog: [], leak: false, hold: null,
      room: { status: {}, extra: [], names: {}, docs: [], requested: null, due: {}, late: ['07-05'] }, loiDeadline: null, lois: [], loiTemplates: [], loiSelected: null, loiSigned: null, exclusivityEnd: null,
      conflict: {}, financingApproved: false, dd: { findings: [], status: {}, indexed: null }, ddSeed: [], run: {}, concluded: null, pendingRefusals: [], refusals: [], plan: { marketWeeks: 3 }, customGates: [], createdAt: stamp()
    }, extra || {});
    m.blind = blindFor(m.profile, 0, 0);
    while (state.mandates[m.id]) m.id += 'x';
    state.mandates[m.id] = m; state.mandateIds.push(m.id);
    return m;
  }
  function buildFromLead(c, a, decision) {
    var k = state.companyState[c.id] || {};
    var p = { company: c.name, neq: c.neq, registered: c.registered, scian: (E.sectorOf(c.scian) || {}).code || c.scian, city: c.city, region: c.region, employees: k.employees || c.employees, owner: a.owner || c.director, ownerAge: a.ownerAge,
      propco: a.propco || '', cpa: k.advisor || '', engagement: a.engagement, topClientPct: a.topClientPct, recurringPct: a.recurringPct, ownerDependency: a.dependency, propertyValue: a.propertyValue, marketRent: a.marketRent, rentPaid: a.rentPaid };
    var m = blankMandate(p, { origin: 'radar:' + c.id, kind: decision === 'preparation' ? 'preparation' : 'vente', conditions: decision === 'conditions' ? (k.acceptance || {}).rationale : null });
    if (m.property && !m.property.investor) m.property.investor = null;
    m.blind = blindFor(m.profile, a.revenueEst, a.ebitdaEst);
    m.profile.revenueEst = a.revenueEst || null; m.profile.ebitdaEst = a.ebitdaEst || null;
    return m;
  }
  function validProfile(d) {
    if (!d.company || d.company.trim().length < 3) return 'Raison sociale requise (3 caractères ou plus).';
    if (!/^\d{3,6}$/.test(String(d.scian || '')) || !E.sectorOf(d.scian)) return 'Choisissez un secteur SCIAN couvert par les paramètres de marché.';
    if (D.REGIONS.indexOf(d.region) < 0) return 'Choisissez une région administrative.';
    if (!(+d.employees > 0 && +d.employees < 5000)) return 'Effectif requis (1 à 4 999).';
    if (!d.owner || d.owner.trim().length < 3) return 'Nom du cédant requis.';
    if (!U.isIsoDate(d.registered) || U.diffDays(d.registered, today()) < 365) return 'Date d’immatriculation valide requise (au moins un an).';
    if (d.topClientPct !== '' && d.topClientPct != null && !(+d.topClientPct >= 0 && +d.topClientPct <= 100)) return 'Part du premier client entre 0 et 100 %.';
    if (d.recurringPct !== '' && d.recurringPct != null && !(+d.recurringPct >= 0 && +d.recurringPct <= 100)) return 'Part récurrente entre 0 et 100 %.';
    if (d.propertyValue && !(U.parseAmount(d.propertyValue) > 0)) return 'Valeur de l’immeuble invalide.';
    return null;
  }
  A.mandateCreate = function (p) {
    if (!P.decideMandate()) return fail('Seule la courtière responsable ouvre un mandat.');
    var d = p.data || {}, err = validProfile(d); if (err) return fail(err);
    var m = blankMandate({ company: d.company.trim(), neq: d.neq, registered: d.registered, scian: d.scian, city: d.city, region: d.region, employees: d.employees, owner: d.owner.trim(), ownerAge: d.ownerAge, holdco: d.holdco, propco: d.propco, cpa: d.cpa, engagement: d.engagement, union: d.union, topClientPct: d.topClientPct, recurringPct: d.recurringPct, ownerDependency: d.ownerDependency, structure: d.structure, propertyValue: d.propertyValue, marketRent: d.marketRent, rentPaid: d.rentPaid, debt: d.debt, cash: d.cash, wcTarget: d.wcTarget, highlights: d.highlights, claims: d.claims });
    log(m.code, 'Mandat créé de zéro', m.codename + ' : ' + m.profile.company + ' (' + m.profile.region + ')', { m: m.id, kind: 'stage' });
    notify('Nouveau mandat : ' + m.codename, 'Saisissez les états financiers de trois exercices pour lancer le retraitement.', { href: mhref(m, 'retraitement'), m: m.id, kind: 'stage' });
    if (p.fin) { var r = A.finSave({ m: m.id, fin: p.fin, assumptions: p.assumptions }); if (!r.ok) return Object.assign(r, { id: m.id, msg: 'Mandat créé, mais les états financiers sont incomplets : ' + r.msg }); }
    return ok(m.codename + ' (' + m.code + ') est créé.', { id: m.id });
  };
  A.mandateUpdate = function (p) {
    var m = mandate(p.m); if (!m) return fail('Mandat introuvable.');
    if (!P.decideMandate()) return fail('Seule la courtière responsable modifie la fiche du mandat.');
    var d = Object.assign({}, m.profile, p.data || {}), err = validProfile(d); if (err) return fail(err);
    var keys = ['company', 'neq', 'registered', 'city', 'region', 'area', 'owner', 'holdco', 'propco', 'cpa', 'engagement', 'ownerDependency'];
    keys.forEach(function (k) { if (p.data[k] != null) m.profile[k] = String(p.data[k]).trim(); });
    ['employees', 'topClientPct', 'recurringPct', 'ownerAge'].forEach(function (k) { if (p.data[k] != null && p.data[k] !== '') m.profile[k] = +p.data[k]; });
    if (p.data.ownerAge) m.profile.ownerAgeBand = R.ageBand(+p.data.ownerAge);
    if (p.data.codename && p.data.codename.trim().length >= 4) m.codename = p.data.codename.trim();
    if (p.data.prepFee != null && p.data.prepFee !== '') { var pf = U.parseAmount(p.data.prepFee); if (!(pf >= 0)) return fail('Frais de préparation invalides.'); m.prepFee = pf; }
    if (m.teaser.approved) { m.teaser.approved = null; log(m.code, 'Approbation invalidée', 'Sommaire aveugle : la fiche a changé, la vérification des noms doit être refaite', { m: m.id, kind: 'teaser' }); }
    log(m.code, 'Fiche du mandat modifiée', 'Par ' + actorName(), { m: m.id, kind: 'stage' });
    return ok('Fiche enregistrée.');
  };
  A.mandateDelete = function (p) {
    var m = mandate(p.m); if (!m) return fail('Mandat introuvable.');
    if (!P.admin()) return fail('Seule l’administratrice supprime un mandat.');
    var i = state.mandateIds.indexOf(m.id), snap = { mandate: U.clone(m), index: i, scheduled: U.clone(state.scheduled.filter(function (e) { return e.m === m.id; })) };
    state.mandateIds.splice(i, 1); delete state.mandates[m.id];
    state.scheduled = state.scheduled.filter(function (e) { return e.m !== m.id; });
    if (state.towerMandate === m.id) state.towerMandate = state.mandateIds[0] || null;
    log(m.code, 'Mandat supprimé', m.codename + ' retiré des tableaux; annulable depuis la notification', { kind: 'stage' });
    return ok(m.codename + ' supprimé.', { undo: { action: 'mandateRestore', payload: snap, label: 'Annuler' } });
  };
  A.mandateRestore = function (p) {
    if (!p.mandate || state.mandates[p.mandate.id]) return fail('Rien à restaurer.');
    state.mandates[p.mandate.id] = p.mandate; state.mandateIds.splice(Math.min(p.index || 0, state.mandateIds.length), 0, p.mandate.id);
    (p.scheduled || []).forEach(function (e) { state.scheduled.push(e); });
    log(p.mandate.code, 'Mandat restauré', p.mandate.codename, { m: p.mandate.id, kind: 'stage' });
    return ok(p.mandate.codename + ' restauré.');
  };
  // États financiers : trois exercices consécutifs; le BAIIA est calculé, jamais saisi.
  A.finSave = function (p) {
    var m = mandate(p.m); if (!m) return fail('Mandat introuvable.');
    if (!P.financials()) return fail('Accès réservé : courtière et analyste (états financiers du cédant).');
    if (m.normApproved) return fail('Retraitement approuvé : rouvrez-le pour modifier les états financiers.');
    var f = p.fin || {}, y3 = +f.lastYear;
    if (!(y3 >= 2015 && y3 <= +today().slice(0, 4))) return fail('Dernier exercice invalide.');
    var ys = [y3 - 2, y3 - 1, y3], rev = {}, ebitda = {}, comp = {}, rent = {}, rows = {};
    for (var i = 0; i < 3; i++) {
      var y = ys[i], r = (f.rows || {})[y] || {};
      var v = { revenue: U.parseAmount(r.revenue), cogs: U.parseAmount(r.cogs), opex: U.parseAmount(r.opex), owner: U.parseAmount(r.owner), rent: U.parseAmount(r.rent || 0) || 0 };
      if (!(v.revenue > 0)) return fail('Ventes ' + y + ' : montant positif requis.');
      if (v.cogs == null || v.cogs < 0) return fail('Coût des ventes ' + y + ' : montant de 0 ou plus requis.');
      if (v.opex == null || v.opex < 0) return fail('Frais d’exploitation ' + y + ' : montant de 0 ou plus requis.');
      if (v.owner == null || v.owner < 0) return fail('Rémunération du dirigeant ' + y + ' : montant de 0 ou plus requis.');
      var e = v.revenue - v.cogs - v.opex - v.owner - v.rent;
      if (e <= 0) return fail('BAIIA ' + y + ' négatif ou nul (' + U.money(e) + ') : le moteur d’évaluation exige un BAIIA positif.');
      rev[y] = v.revenue; ebitda[y] = e; comp[y] = v.owner; rent[y] = v.rent; rows[y] = v;
    }
    var L = rows[y3];
    m.fin = { entered: true, years: ys, revenue: rev, ebitda: ebitda, input: f, lines: [
      { id: 'ventes', label: 'Ventes', amount: L.revenue, src: 'ÉF ' + y3 + ' (saisie)' }, { id: 'cdv', label: 'Coût des ventes', amount: -L.cogs, src: 'ÉF ' + y3 }, { id: 'mb', label: 'Marge brute', amount: L.revenue - L.cogs, subtotal: true },
      { id: 'aut', label: 'Frais d’exploitation (hors dirigeant)', amount: -L.opex, src: 'ÉF ' + y3 }, { id: 'dir', label: 'Rémunération du dirigeant', amount: -L.owner, src: 'ÉF ' + y3 }
    ].concat(L.rent ? [{ id: 'loyer', label: 'Loyer versé à la société liée', amount: -L.rent, src: 'ÉF ' + y3 }] : []).concat([{ id: 'baiia', label: 'BAIIA déclaré', amount: ebitda[y3], total: true, src: 'Calcul du moteur' }]) };
    // Propositions par règles (les décisions humaines sur les autres propositions sont conservées).
    var a = p.assumptions || {}, props = R.proposeFromStatements(m, { replacementSalary: U.parseAmount(a.replacementSalary) || 150000, ownerComp: comp, rentPaid: rent, personal: U.parseAmount(a.personal) || 0 });
    if (a.ledger) props = props.concat(R.adjustmentsFromText(a.ledger, m, { replacementSalary: U.parseAmount(a.replacementSalary) || 150000 }).adjustments);
    m.adjustments = m.adjustments.filter(function (x) { return x.source !== 'regles-etats'; });
    addProposals(m, props, 'regles-etats', { source: 'rules' });
    if (!m.valApproved) { m.val.modifiers = E.proposeModifiers(m); m.mods = {}; }
    m.blind = Object.assign(m.blind || {}, { revenueBand: blindFor(m.profile, rev[y3], ebitda[y3]).revenueBand, ebitdaBand: blindFor(m.profile, rev[y3], ebitda[y3]).ebitdaBand });
    m.room.status['02-01'] = m.room.status['02-01'] || 'recu'; m.room.status['02-02'] = m.room.status['02-02'] || 'recu'; m.room.status['02-03'] = m.room.status['02-03'] || 'recu';
    log(m.code, 'États financiers saisis : ' + ys.join(', '), 'BAIIA déclaré ' + ys.map(function (y) { return U.money(ebitda[y]); }).join(' / ') + '; ' + props.length + ' retraitement' + (props.length > 1 ? 's' : '') + ' proposé' + (props.length > 1 ? 's' : '') + ' par règles', { m: m.id, kind: 'fin' });
    return ok('États enregistrés : BAIIA ' + y3 + ' de ' + U.money(ebitda[y3]) + '. ' + props.length + ' retraitement' + (props.length > 1 ? 's' : '') + ' proposé' + (props.length > 1 ? 's' : '') + ', à décider.');
  };
  // Identifiants lisibles par mandat : R1, R2… (les dossiers semés gardent a1…a8, p1…, etc.).
  function nextAdjId(m) { var n = 0; (m.adjustments || []).forEach(function (a) { var x = /^R(\d+)$/.exec(a.id); if (x) n = Math.max(n, +x[1]); }); return 'R' + (n + 1); }
  function addProposals(m, items, tag, prov) {
    var have = m.adjustments.map(function (a) { return U.fold(a.label); }), n = 0;
    items.forEach(function (a) {
      if (have.indexOf(U.fold(a.label)) >= 0) return;
      var id = nextAdjId(m);
      m.adjustments.push(Object.assign({ id: id, needsEvidence: null }, a, { source: tag, provenance: prov || null }));
      have.push(U.fold(a.label)); n++;
    });
    return n;
  }
  A.adjProposals = function (p) {
    var m = mandate(p.m); if (!m) return fail('Mandat introuvable.');
    if (!P.financials()) return fail('Accès réservé : courtière et analyste.');
    if (m.normApproved) return fail('Retraitement approuvé et verrouillé : rouvrez-le pour ajouter des propositions.');
    if (!m.fin.entered) return fail('Saisissez d’abord les états financiers.');
    var prov = p.provenance || { source: 'rules' }, tag = prov.source === 'live-ai' ? 'ia-direct' : 'regles-grand-livre';
    var n = addProposals(m, p.items || [], tag, prov);
    log(m.code, n + ' retraitement' + (n > 1 ? 's' : '') + ' proposé' + (n > 1 ? 's' : '') + ' (' + (prov.source === 'live-ai' ? 'IA en direct, ' + prov.model : 'règles') + ')', 'Aucun appliqué automatiquement' + (p.fallback ? '; repli sur les règles : ' + p.fallback : ''), { m: m.id, kind: prov.source === 'live-ai' ? 'ai' : 'fin' });
    return n ? ok(n + ' proposition' + (n > 1 ? 's' : '') + ' ajoutée' + (n > 1 ? 's' : '') + ' : chacune attend une décision humaine.') : fail('Aucune nouvelle proposition (doublons ou lignes non retenues).');
  };
  function validAdj(m, d) {
    if (R.CATS.indexOf(d.cat) < 0) return 'Choisissez une catégorie.';
    if (!d.label || d.label.trim().length < 4) return 'Libellé requis (4 caractères ou plus).';
    if (['solide', 'défendable', 'agressif'].indexOf(d.rating) < 0) return 'Choisissez une défendabilité.';
    var any = false; for (var i = 0; i < m.fin.years.length; i++) { var v = U.parseAmount((d.amounts || {})[m.fin.years[i]] || 0); if (v == null) return 'Montant ' + m.fin.years[i] + ' illisible.'; if (Math.abs(v) > m.fin.revenue[m.fin.years[i]]) return 'Montant ' + m.fin.years[i] + ' supérieur aux ventes.'; if (v) any = true; }
    if (!any) return 'Au moins un montant non nul requis.';
    return null;
  }
  A.adjAdd = function (p) {
    var m = mandate(p.m); if (!m) return fail('Mandat introuvable.');
    if (!P.financials()) return fail('Accès réservé : courtière et analyste.');
    if (m.normApproved) return fail('Retraitement verrouillé.');
    if (!m.fin.entered) return fail('Saisissez d’abord les états financiers.');
    var d = p.data || {}, err = validAdj(m, d); if (err) return fail(err);
    var am = {}; m.fin.years.forEach(function (y) { am[y] = U.parseAmount((d.amounts || {})[y] || 0) || 0; });
    var id = nextAdjId(m);
    m.adjustments.push({ id: id, cat: d.cat, label: d.label.trim(), amounts: am, rating: d.rating, line: d.line || 'Saisie manuelle', why: d.why || '', evidence: d.evidence || 'Preuve à joindre', needsEvidence: null, source: 'manuel' });
    log(m.code, 'Retraitement ajouté à la main', d.label.trim(), { m: m.id, kind: 'fin' });
    return ok('Retraitement ajouté, en proposition.');
  };
  A.adjEdit = function (p) {
    var m = mandate(p.m), a = m && E.byId(m.adjustments, p.id); if (!a) return fail('Retraitement introuvable.');
    if (!P.financials() || m.normApproved) return fail('Retraitement verrouillé ou accès réservé.');
    if ((m.adj[a.id] || {}).status && m.adj[a.id].status !== 'proposed') return fail('Remettez-le en proposition avant de le modifier.');
    var d = Object.assign({ cat: a.cat, label: a.label, rating: a.rating, amounts: a.amounts }, p.data || {}), err = validAdj(m, d); if (err) return fail(err);
    a.cat = d.cat; a.label = d.label.trim(); a.rating = d.rating; a.why = d.why != null ? d.why : a.why; m.fin.years.forEach(function (y) { a.amounts[y] = U.parseAmount((d.amounts || {})[y] || 0) || 0; });
    if (m.adj[a.id]) delete m.adj[a.id].rating;
    log(m.code, 'Retraitement modifié', a.label, { m: m.id, kind: 'fin' }); return ok('Retraitement modifié.');
  };
  A.adjDelete = function (p) {
    var m = mandate(p.m); if (!m) return fail('Mandat introuvable.');
    var i = m.adjustments.findIndex(function (a) { return a.id === p.id; }); if (i < 0) return fail('Retraitement introuvable.');
    if (!P.financials() || m.normApproved) return fail('Retraitement verrouillé ou accès réservé.');
    if ((m.adj[p.id] || {}).status === 'accepted') return fail('Un retraitement accepté ne se supprime pas : remettez-le en proposition ou rejetez-le avec un motif.');
    var snap = { m: m.id, adj: U.clone(m.adjustments[i]), dec: U.clone(m.adj[p.id] || null), index: i };
    m.adjustments.splice(i, 1); delete m.adj[p.id];
    log(m.code, 'Retraitement supprimé', snap.adj.label, { m: m.id, kind: 'fin' });
    return ok('Retraitement supprimé.', { undo: { action: 'adjRestore', payload: snap, label: 'Annuler' } });
  };
  A.adjRestore = function (p) { var m = mandate(p.m); if (!m || E.byId(m.adjustments, p.adj.id)) return fail('Rien à restaurer.'); m.adjustments.splice(Math.min(p.index, m.adjustments.length), 0, p.adj); if (p.dec) m.adj[p.adj.id] = p.dec; log(m.code, 'Retraitement restauré', p.adj.label, { m: m.id, kind: 'fin' }); return ok('Retraitement restauré.'); };

  /* ---------------- Mandat : retraitement, évaluation, structure ---------------- */
  function MM(p) { return mandate(p.m); }
  function needFin() { return P.financials() ? null : fail('Accès réservé : courtière et analyste (états financiers du cédant).'); }
  function needCourtier(what) { return P.decideMandate() ? null : fail('Seule la courtière responsable peut ' + what + '.'); }
  function frozen(m) { return m.leak ? 'Protocole de fuite actif : les envois liés au dossier sont gelés.' : m.hold ? 'Le cédant hésite : envois suspendus jusqu’à sa confirmation.' : m.sellerConsentWithdrawn ? 'Consentement du cédant retiré : aucune communication aux acheteurs.' : null; }
  function invalidate(m, reason) {
    var lost = [];
    if (m.valApproved) { m.valApproved = null; lost.push('fourchette de valeur'); }
    if (m.teaser.approved) { m.teaser.approved = null; lost.push('sommaire aveugle'); }
    if (m.cim.approved) { m.cim.approved = null; lost.push('cahier de présentation'); }
    if (lost.length) log(m.code, 'Approbations invalidées', reason + ' : ' + lost.join(', '), { m: m.id, kind: 'fin' });
    return lost;
  }
  A.adjDecide = function (p) {
    var e = needFin(); if (e) return e;
    var m = MM(p); if (!m) return fail('Mandat introuvable.');
    if (m.normApproved) return fail('Le retraitement est approuvé et verrouillé. Rouvrez-le pour créer une nouvelle version.');
    var a = E.byId(m.adjustments, p.id); if (!a) return fail('Retraitement introuvable.');
    if (p.d === 'accepted' && a.needsEvidence && E.itemStatus(m, a.needsEvidence) !== 'revise') return fail('Justificatif requis : la pièce ' + a.needsEvidence + ' doit être reçue et révisée.');
    if (p.d === 'rejected' && !p.reason) return fail('Un rejet exige un motif : il servira d’exemple pour les prochaines propositions.');
    var st = m.adj[p.id] || (m.adj[p.id] = {}), before = st.status || 'proposed';
    st.status = p.d; st.reason = p.reason || ''; st.by = actorName();
    log(m.code, 'Retraitement ' + (p.d === 'accepted' ? 'accepté' : p.d === 'rejected' ? 'rejeté' : 'remis en proposition') + ' : ' + a.label, (p.reason ? 'Motif : ' + p.reason + '. ' : '') + 'Statut ' + before + ' à ' + p.d, { m: m.id, kind: 'fin' });
    return ok();
  };
  A.adjRating = function (p) { var e = needFin(); if (e) return e; var m = MM(p); if (m.normApproved) return fail('Retraitement verrouillé.'); var st = m.adj[p.id] || (m.adj[p.id] = {}); st.rating = p.value; log(m.code, 'Défendabilité modifiée', p.id + ' : ' + p.value, { m: m.id, kind: 'fin' }); return ok(); };
  A.evidenceDeposit = function (p) { var m = MM(p), id = p.id; var s = E.itemStatus(m, id); if (s === 'demande' || s === 'a_demander') { m.room.status[id] = 'recu'; log(m.code, 'Pièce déposée par le cédant (lien sans compte, simulé)', id + ' ' + E.itemName(m, id), { m: m.id, kind: 'room', actor: (m.profile.owner || 'Cédant') + ' (cédant)' }); } return ok('Le cédant a déposé la pièce (simulé). Révisez-la pour l’utiliser comme justificatif.'); };
  A.roomReview = function (p) { var e = needFin(); if (e) return e; var m = MM(p), s = E.itemStatus(m, p.id); if (s !== 'recu') return fail('Seule une pièce reçue peut être révisée.'); m.room.status[p.id] = 'revise'; log(m.code, 'Pièce révisée', p.id + ' ' + E.itemName(m, p.id), { m: m.id, kind: 'room' }); return ok(); };
  A.roomReviewAll = function (p) {
    var e = needFin(); if (e) return e; var m = MM(p), n = 0;
    E.roomFolders(m).forEach(function (f) { f.items.forEach(function (it) { if (E.itemStatus(m, it.id) === 'recu') { m.room.status[it.id] = 'revise'; n++; } }); });
    if (!n) return fail('Aucune pièce reçue en attente de révision.');
    var pl = n > 1 ? n + ' pièces révisées' : '1 pièce révisée'; log(m.code, pl, 'Révision par lot', { m: m.id, kind: 'room' }); return ok(pl + '.');
  };
  A.roomSetStatus = function (p) { var e = needFin(); if (e) return e; var m = MM(p); if (['sans_objet', 'a_demander', 'probleme'].indexOf(p.status) < 0) return fail('Statut non permis.'); m.room.status[p.id] = p.status; log(m.code, 'Statut de pièce : ' + D.ITEM_STATUS[p.status], p.id + ' ' + E.itemName(m, p.id), { m: m.id, kind: 'room' }); return ok(); };
  A.roomRequest = function (p) {
    var m = MM(p), fz = frozen(m); if (fz) return fail(fz);
    if (!P.financials()) return fail('Accès réservé : courtière et analyste.');
    var items = []; E.roomFolders(m).forEach(function (f) { f.items.forEach(function (it) { if (E.itemStatus(m, it.id) === 'a_demander') items.push(it.id); }); });
    var again = []; E.roomFolders(m).forEach(function (f) { f.items.forEach(function (it) { if (E.itemStatus(m, it.id) === 'demande') again.push(it.id); }); });
    if (!items.length && !again.length) return fail('Aucune pièce à demander au cédant pour l’instant.');
    items.forEach(function (id) { m.room.status[id] = 'demande'; m.room.due[id] = U.addDays(today(), 14); });
    again.forEach(function (id) { if (!m.room.due[id]) m.room.due[id] = U.addDays(today(), 14); });
    m.room.requested = m.room.requested || today();
    var all = items.concat(again).filter(function (id) { return (m.room.late || []).indexOf(id) < 0; });
    var half = Math.ceil(all.length * 0.6);
    if (all.slice(0, half).length) schedule(inDays(2, 15), 'docs', { m: m.id, items: all.slice(0, half) });
    if (all.slice(half).length) schedule(inDays(5, 11), 'docs', { m: m.id, items: all.slice(half) });
    [3, 7, 14].forEach(function (n) { schedule(inDays(n, 8), 'docRemind', { m: m.id, n: n }); });
    log(m.code, 'Demande de documents envoyée au cédant (simulée)', (items.length + again.length) + ' pièces; lien sans compte; rappels J+3, J+7, J+14; échéance ' + U.date(U.addDays(today(), 14)), { m: m.id, kind: 'room' });
    return ok('Demande envoyée (simulée) : ' + (items.length + again.length) + ' pièces. Dépôts attendus d’ici 2 à 5 jours; avancez l’horloge ou simulez un dépôt.');
  };
  A.roomDepositNow = function (p) {
    var m = MM(p), n = 0;
    E.roomFolders(m).forEach(function (f) { f.items.forEach(function (it) { if (E.itemStatus(m, it.id) === 'demande' && (m.room.late || []).indexOf(it.id) < 0) { m.room.status[it.id] = 'recu'; n++; } }); });
    var lateOpen = (m.room.late || []).filter(function (id) { return E.itemStatus(m, id) === 'demande'; });
    if (!n) return fail(lateOpen.length ? 'Pièce' + (lateOpen.length > 1 ? 's' : '') + ' ' + lateOpen.join(', ') + ' attendue' + (lateOpen.length > 1 ? 's' : '') + ' d’un tiers, en retard : relancez le cédant ou téléversez-la.' : 'Aucune pièce demandée en attente de dépôt.');
    log(m.code, (n > 1 ? n + ' pièces déposées' : '1 pièce déposée') + ' par le cédant (simulé)', (m.room.late || []).length ? 'Pièces en retard attendues d’un tiers : ' + m.room.late.join(', ') : '', { m: m.id, kind: 'room', actor: (m.profile.owner || 'Cédant') + ' (cédant)' });
    return ok((n > 1 ? n + ' pièces déposées par le cédant (simulé). Elles attendent' : '1 pièce déposée par le cédant (simulé). Elle attend') + ' votre révision.');
  };
  A.roomRemind = function (p) {
    var m = MM(p), fz = frozen(m); if (fz) return fail(fz);
    var od = E.overdueItems(m, state).concat(Object.keys(m.room.due || {}).filter(function (id) { return E.itemStatus(m, id) === 'demande'; }).map(function (id) { return { id: id }; }));
    var ids = od.map(function (x) { return x.id; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    if (!ids.length) return fail('Aucune pièce demandée en attente.');
    ids.forEach(function (id) { m.room.due[id] = U.addDays(today(), 7); m.room.late = (m.room.late || []).filter(function (x) { return x !== id; }); });
    schedule(inDays(4, 14), 'docs', { m: m.id, items: ids });
    log(m.code, 'Relance envoyée au cédant (simulée)', ids.join(', ') + '; nouvelle échéance ' + U.date(U.addDays(today(), 7)), { m: m.id, kind: 'room' });
    return ok('Relance envoyée (simulée). Dépôt attendu dans environ 4 jours.');
  };
  A.docUpload = function (p) {
    var m = MM(p); if (!m) return fail('Mandat introuvable.');
    if (!P.room()) return fail('Salle de données réservée à la courtière et à l’analyste.');
    var meta = p.meta || {}; if (!meta.name) return fail('Fichier invalide.');
    if (meta.size > 25 * 1024 * 1024) return fail('Fichier de plus de 25 Mo : refusé.');
    var id = 'doc' + U.hash(m.id + meta.name + absNow() + m.room.docs.length).slice(0, 6), folder = p.item ? p.item.slice(0, 2) : (p.folder || '12');
    m.room.docs.push({ id: id, folder: folder, item: p.item || null, name: String(meta.name).slice(0, 160), size: meta.size || 0, type: meta.type || '', hash: meta.hash || null, snippet: meta.snippet ? String(meta.snippet).slice(0, 700) : '', at: stamp(), by: actorName() });
    if (p.item) { var s = E.itemStatus(m, p.item); if (s === 'a_demander' || s === 'demande' || s === 'probleme') m.room.status[p.item] = 'recu'; }
    log(m.code, 'Pièce téléversée' + (p.item ? ' pour ' + p.item : ' dans ' + folder), meta.name + (meta.hash ? ', SHA-256 ' + meta.hash.slice(0, 16) + '…' : '') + '; contenu non conservé hors de cet appareil', { m: m.id, kind: 'room' });
    return ok('Pièce téléversée' + (p.item ? ' : ' + p.item + ' passe à « Reçu »' : '') + '.', { id: id });
  };
  A.docDelete = function (p) { var m = MM(p), i = m.room.docs.findIndex(function (d) { return d.id === p.id; }); if (i < 0) return fail('Pièce introuvable.'); var d = m.room.docs.splice(i, 1)[0]; log(m.code, 'Pièce téléversée retirée', d.name, { m: m.id, kind: 'room' }); return ok('Pièce retirée.', { undo: { action: 'docRestore', payload: { m: m.id, doc: d, index: i }, label: 'Annuler' } }); };
  A.docRestore = function (p) { var m = MM(p); if (!m) return fail('Mandat introuvable.'); m.room.docs.splice(p.index, 0, p.doc); log(m.code, 'Pièce téléversée restaurée', p.doc.name, { m: m.id, kind: 'room' }); return ok('Pièce restaurée.'); };
  A.normApprove = function (p) {
    var e = needFin(); if (e) return e; var m = MM(p), n = E.normalization(m);
    if (!m.fin.entered) return fail('Saisissez d’abord les états financiers.');
    if (!n.total) return fail('Aucun retraitement à décider : ajoutez-en un ou consignez « aucun retraitement » par une proposition rejetée.');
    if (n.pending) return fail('Décidez des ' + n.pending + ' retraitements en attente avant d’approuver.');
    m.normApproved = { by: actorName(), date: today(), version: m.normVersion };
    log(m.code, 'Retraitement du BAIIA approuvé, version ' + m.normVersion, 'Conservateur ' + U.money(n.conservative[n.base]) + ', complet ' + U.money(n.full[n.base]), { m: m.id, kind: 'fin' });
    return ok('Retraitement approuvé et verrouillé (version ' + m.normVersion + ').');
  };
  A.normReopen = function (p) {
    var e = needFin(); if (e) return e; var m = MM(p);
    if (['signe', 'preparation', 'marche'].indexOf(m.stage) < 0) return fail('Après la mise en marché, une révision passe par une divulgation corrective aux acheteurs.');
    m.normApproved = null; m.normVersion++;
    var lost = invalidate(m, 'Révision du retraitement');
    log(m.code, 'Retraitement rouvert, version ' + m.normVersion, 'Les documents qui en dépendent deviennent périmés', { m: m.id, kind: 'fin' });
    return ok(lost.length ? 'Version ' + m.normVersion + ' ouverte. Approbations invalidées : ' + lost.join(', ') + '.' : 'Version ' + m.normVersion + ' ouverte.');
  };
  A.valBase = function (p) { var e = needFin(); if (e) return e; var m = MM(p); if (m.valApproved) return fail('Fourchette validée : rouvrez-la pour changer la base.'); if (!E.BASE_LABEL[p.value]) return fail('Base inconnue.'); m.valBase = p.value; return ok(); };
  A.modDecide = function (p) { var e = needFin(); if (e) return e; var m = MM(p); if (m.valApproved) return fail('Fourchette validée : rouvrez-la pour modifier un modulateur.'); var mod = E.byId(m.val.modifiers, p.id); if (!mod) return fail('Modulateur introuvable.'); if (p.d === 'accepted') { var ev = E.evidenceOf(m, mod); if (!ev.ok) return fail('Preuve à documenter : pièce ' + ev.missing.map(function (x) { return x.id + ' « ' + x.name + ' » (' + (D.ITEM_STATUS[x.status] || x.status).toLowerCase() + ')'; }).join(', ') + '. Faites-la déposer et révisez-la dans la salle, ou écartez ce modulateur.'); } m.mods[p.id] = p.d; log(m.code, 'Modulateur ' + (p.d === 'accepted' ? 'retenu' : p.d === 'rejected' ? 'écarté' : 'remis en proposition'), mod.label, { m: m.id, kind: 'val' }); return ok(); };
  A.valApprove = function (p) {
    var e = needCourtier('valider la fourchette de valeur'); if (e) return e;
    var m = MM(p); if (!m.normApproved) return fail('Le retraitement du BAIIA doit être approuvé d’abord.');
    var v = E.valuation(m); if (v.pending) return fail('Décidez des ' + v.pending + ' modulateurs proposés.');
    m.valApproved = { by: actorName(), date: today(), mid: v.ev.mid };
    log(m.code, 'Fourchette de valeur validée', U.money(v.ev.low) + ' à ' + U.money(v.ev.high) + ', médiane ' + U.money(v.ev.mid) + ' (' + U.x(v.mult.mid) + ')', { m: m.id, kind: 'val' });
    return ok('Fourchette validée : ' + U.money(v.ev.low) + ' à ' + U.money(v.ev.high) + '.');
  };
  A.valReopen = function (p) {
    var e = needCourtier('rouvrir la fourchette'); if (e) return e; var m = MM(p);
    if (['signe', 'preparation', 'marche'].indexOf(m.stage) < 0) return fail('Fourchette figée après la mise en marché.');
    m.valApproved = null; if (m.teaser.approved) { m.teaser.approved = null; log(m.code, 'Approbation invalidée', 'Sommaire aveugle', { m: m.id, kind: 'teaser' }); }
    return ok('Fourchette rouverte.');
  };
  A.feeInput = function (p) { state.feeInput = Math.max(0, Math.min(1e9, Math.round(+p.value || 0))); return ok(); };
  A.feeCompare = function () { state.feeCompare = !state.feeCompare; return ok(); };
  A.structure = function (p) {
    var e = needCourtier('modifier la structure de transaction'); if (e) return e;
    var m = MM(p); if (!E.STRUCT_PHRASE[p.value]) return fail('Structure inconnue.');
    m.structure = p.value; if (p.value !== 'actionsPartielle') m.amfValidated = null;
    log(m.code, 'Structure de transaction modifiée', E.STRUCT_PHRASE[p.value], { m: m.id, kind: 'stage' });
    return ok(p.value === 'actionsPartielle' ? 'Vente partielle : bannière AMF active jusqu’à validation juridique.' : null);
  };
  A.amfValidate = function (p) { if (!P.admin()) return fail('Seule l’administratrice consigne la validation juridique.'); if (!p.note || p.note.trim().length < 8) return fail('Consignez la date et la note du conseiller juridique.'); var m = MM(p); m.amfValidated = { note: p.note, by: actorName(), date: today() }; log(m.code, 'Validation AMF consignée', p.note, { m: m.id, kind: 'compliance' }); return ok('Validation consignée.'); };
  A.convert = function (p) { var e = needCourtier('convertir le mandat'); if (e) return e; var m = MM(p); if (m.kind !== 'preparation') return fail('Ce mandat est déjà un mandat de vente.'); m.kind = 'vente'; m.dates.exclusivityEnd = U.addDays(today(), 365); log(m.code, 'Mandat de préparation converti en mandat de vente', 'Signature électronique simulée; exclusivité de 12 mois', { m: m.id, kind: 'stage' }); return ok('Mandat de vente signé (simulé).'); };

  /* ---------------- Sommaire aveugle (brouillon, vérification, approbation) ---------------- */
  A.teaserGenerate = function (p) {
    var e = needFin(); if (e) return e; var m = MM(p);
    if (!m.normApproved) return fail('Le sommaire se génère à partir du BAIIA retraité approuvé.');
    var draft = p.draft || R.teaserDraft(m), prov = p.provenance || { source: m.teaserSeed ? 'scenario' : 'rules' };
    m.teaser = { draft: draft, source: prov.source, provenance: prov, kept: {}, approved: null, generatedAt: stamp() };
    var n = R.openIssues(m).length;
    log(m.code, 'Brouillon de sommaire aveugle généré (' + (prov.source === 'live-ai' ? 'IA en direct, ' + prov.model : prov.source === 'scenario' ? 'IA scénarisée' : 'règles') + ')', 'Profil anonymisé seulement : la raison sociale n’est jamais envoyée au modèle; ' + n + ' constat' + (n > 1 ? 's' : '') + ' à la vérification' + (p.fallback ? '; repli sur les règles : ' + p.fallback : ''), { m: m.id, kind: prov.source === 'live-ai' ? 'ai' : 'teaser' });
    return ok('Brouillon généré. ' + (n ? n + ' constat' + (n > 1 ? 's' : '') + ' à traiter avant l’exportation.' : 'Aucun constat : vérification des noms réussie.'));
  };
  function findIssue(m, key) { return (m.teaser.draft ? R.scanTeaser(m.teaser.draft, m) : []).filter(function (i) { return i.key === key; })[0]; }
  A.teaserFix = function (p) {
    var e = needFin(); if (e) return e; var m = MM(p), iss = findIssue(m, p.key);
    if (!iss) return fail('Constat déjà traité.'); if (!iss.fixed) return fail('Aucune correction automatique : supprimez la ligne ou modifiez-la.');
    var old = m.teaser.draft[iss.line].t; m.teaser.draft[iss.line].t = iss.fixed; m.teaser.approved = null;
    log(m.code, 'Sommaire : correction appliquée (' + iss.kind + ')', '« ' + old + ' » remplacé par « ' + iss.fixed + ' »', { m: m.id, kind: 'teaser' });
    return ok();
  };
  A.teaserDropLine = function (p) { var e = needFin(); if (e) return e; var m = MM(p), i = +p.line; if (!m.teaser.draft || !m.teaser.draft[i] || m.teaser.draft[i].k === 'title') return fail('Ligne introuvable (le titre ne se supprime pas).'); var old = m.teaser.draft.splice(i, 1)[0]; m.teaser.approved = null; log(m.code, 'Sommaire : ligne supprimée', '« ' + old.t + ' »', { m: m.id, kind: 'teaser' }); return ok(); };
  A.teaserKeep = function (p) { var e = needCourtier('conserver un détail identifiant'); if (e) return e; var m = MM(p), iss = findIssue(m, p.key); if (!iss) return fail('Constat introuvable.'); if (!iss.canKeep) return fail('Un nom ou un chiffre non lié au moteur ne peut pas être conservé.'); m.teaser.kept[p.key] = { by: actorName(), date: today() }; log(m.code, 'Sommaire : détail conservé, accord du cédant consigné', iss.match, { m: m.id, kind: 'teaser' }); return ok(); };
  A.teaserEdit = function (p) {
    var e = needFin(); if (e) return e; var m = MM(p), lines = p.lines || [];
    if (!lines.length || lines[0].k !== 'title' || !String(lines[0].t || '').trim()) return fail('Un titre est requis.');
    if (lines.some(function (l) { return String(l.t || '').length > 300; })) return fail('Une ligne dépasse 300 caractères.');
    m.teaser.draft = lines.filter(function (l) { return String(l.t || '').trim(); }).map(function (l) { return { k: l.k, t: String(l.t).trim() }; }); m.teaser.approved = null;
    var n = R.openIssues(m).length;
    log(m.code, 'Sommaire modifié à la main', n + ' constat' + (n > 1 ? 's' : '') + ' après nouvelle vérification', { m: m.id, kind: 'teaser' });
    return ok(n ? 'Brouillon enregistré : ' + n + ' constat' + (n > 1 ? 's' : '') + ' à traiter.' : 'Brouillon enregistré : vérification réussie.');
  };
  A.teaserApprove = function (p) {
    var e = needCourtier('approuver le sommaire aveugle'); if (e) return e; var m = MM(p);
    if (!m.teaser.draft) return fail('Générez d’abord le brouillon.');
    var open = R.openIssues(m); if (open.length) return fail('Exportation bloquée : ' + open.length + ' constat' + (open.length > 1 ? 's' : '') + ' à traiter.');
    m.teaser.approved = { by: actorName(), date: today() };
    log(m.code, 'Sommaire aveugle approuvé', 'Référence ' + m.blindRef + '; vérification des noms réussie', { m: m.id, kind: 'teaser' });
    return ok('Sommaire approuvé. L’exportation PDF est débloquée.');
  };

  /* ---------------- Acheteurs du mandat ---------------- */
  A.shortlist = function (p) {
    var m = MM(p); if (m.listLocked) return fail('Liste verrouillée.');
    if (!P.buyersWrite() && !P.decideMandate()) return fail('Lecture seule pour ce rôle.');
    var b = buyer(p.id); if (!b) return fail('Acheteur introuvable.');
    if (m.exclusions[b.id]) return fail('Exclusion ferme : ' + m.exclusions[b.id] + '. Un score élevé ne la lève pas.');
    var i = m.shortlist.indexOf(p.id);
    if (i >= 0) m.shortlist.splice(i, 1); else { if (m.cautions[b.id] && !p.confirm) return fail(m.cautions[b.id]); m.shortlist.push(p.id); }
    return ok();
  };
  A.exclusionSet = function (p) { var e = needCourtier('consigner une exclusion du cédant'); if (e) return e; var m = MM(p); if (!buyer(p.id)) return fail('Acheteur introuvable.'); if (p.reason) { if (p.reason.trim().length < 6) return fail('Motif requis.'); m.exclusions[p.id] = p.reason.trim(); m.shortlist = m.shortlist.filter(function (x) { return x !== p.id; }); log(m.code, 'Exclusion ferme consignée : ' + bname(p.id), p.reason.trim(), { m: m.id, kind: 'buyers' }); } else { delete m.exclusions[p.id]; log(m.code, 'Exclusion levée : ' + bname(p.id), 'Accord du cédant', { m: m.id, kind: 'buyers' }); } return ok(); };
  A.listLock = function (p) { var e = needCourtier('verrouiller la liste'); if (e) return e; var m = MM(p); if (!m.shortlist.length) return fail('La liste est vide.'); m.listLocked = { by: actorName(), date: today(), ids: m.shortlist.slice() }; log(m.code, 'Liste d’acheteurs verrouillée', m.shortlist.map(bname).join(', '), { m: m.id, kind: 'buyers' }); return ok('Liste verrouillée : ' + m.shortlist.length + ' acheteurs.'); };
  A.listUnlock = function (p) { var e = needCourtier('déverrouiller la liste'); if (e) return e; var m = MM(p); if (m.teasersSent) return fail('Sommaires déjà transmis : la liste ne peut plus être modifiée.'); m.listLocked = null; return ok(); };
  A.scriptRecord = function (p) {
    var e = needCourtier('consigner le script de divulgation'); if (e) return e; var m = MM(p), fn = E.funnel(m, state), u = fn[0].n;
    if (u < 30 && !p.ack) return fail('Univers de ' + u + ' acheteurs, sous le seuil de 30 : l’accord écrit du cédant sur le risque d’identification est requis.');
    m.script = { by: actorName(), date: today(), universe: u, ack: u < 30 };
    log(m.code, 'Script de divulgation consigné', 'Univers de ' + u + ' acheteurs : ' + (u < 30 ? 'risque d’identification élevé, accord écrit du cédant consigné' : 'risque d’identification standard'), { m: m.id, kind: 'buyers' });
    return ok('Script consigné. Il s’affiche dans le panneau d’appel des agents acheteurs.');
  };
  function planResponses(m) {
    var mx = E.metrics(m), plan = [];
    (m.listLocked ? m.listLocked.ids : m.shortlist).forEach(function (id) {
      var b = buyer(id); if (!b) return;
      var r = E.matchScore(b, m, state.weights, state), equity = b.fundingEvidence ? b.equityMax : b.equityMin;
      var floor = m.property && b.criteria.flexEbitdaMin != null ? b.criteria.flexEbitdaMin : b.criteria.ebitdaMin; // critère appris : plancher assoupli quand l'immeuble est offert
      var tooSmall = floor != null && mx.ebitda < floor * 0.8, tooBig = b.criteria.ebitdaMax != null && mx.ebitda > b.criteria.ebitdaMax * 1.25;
      if (equity != null && equity < mx.requiredEquity) { plan.push([4, 14, id, 'consulte']); plan.push([12, 10, id, 'refus', 'financement indisponible']); }
      else if (tooSmall || tooBig) plan.push([6, 11, id, 'refus', tooSmall ? 'trop petit' : 'trop gros']);
      else if (r.score >= 70) plan.push([3 + Math.round((100 - r.score) / 6), 10, id, 'signe']);
      else { plan.push([5, 15, id, 'consulte']); plan.push([13, 10, id, 'signe']); }
    });
    plan.forEach(function (x) { schedule(inDays(x[0], x[1]), 'nda', { m: m.id, buyer: x[2], result: x[3], reason: x[4] }); });
    return plan.length;
  }
  A.teasersSend = function (p) {
    var e = needCourtier('autoriser la transmission'); if (e) return e; var m = MM(p), fz = frozen(m); if (fz) return fail(fz);
    if (m.stage !== 'marche') return fail('La transmission se fait à l’étape Mise en marché.');
    if (!m.listLocked) return fail('Verrouillez d’abord la liste.');
    if (m.teasersSent) return fail('Sommaires déjà transmis.');
    m.teasersSent = today(); m.listLocked.ids.forEach(function (id) { m.nda[id] = 'envoye'; });
    planResponses(m);
    log(m.code, 'Sommaires et ententes de confidentialité transmis (simulé)', m.listLocked.ids.length + ' acheteurs; identité du cédant non divulguée; réponses attendues dans les 3 semaines', { m: m.id, kind: 'buyers' });
    return ok('Transmission simulée à ' + m.listLocked.ids.length + ' acheteurs. Les réponses arrivent au fil de l’horloge.');
  };
  A.refusal = function (p) {
    var m = MM(p); if (!p.reason || D.REFUSAL_REASONS.indexOf(p.reason) < 0) return fail('Choisissez un motif structuré.');
    var b = buyer(p.id); if (!b) return fail('Acheteur introuvable.');
    var mx = E.metrics(m), learned = p.reason === 'financement indisponible' ? 'Capacité : mise de fonds insuffisante sans partenaire pour un prix de ' + U.moneyShort(mx.ev) + ' (refus du ' + U.date(today()) + ')' : 'Refus « ' + p.reason + ' » sur un dossier ' + (m.profile.sectorLabel || '').toLowerCase() + ' de ' + U.moneyShort(mx.ev);
    b.inferred = (b.inferred || []).concat([learned]);
    b.refusals = (b.refusals || []).concat([{ m: m.id, code: m.code, reason: p.reason, note: p.note || '', date: today() }]);
    m.refusals.push({ buyer: b.id, reason: p.reason, note: p.note || '', date: today() });
    m.pendingRefusals = m.pendingRefusals.filter(function (x) { return x.buyer !== b.id; });
    if (m.nda[b.id] && m.nda[b.id] !== 'signe') m.nda[b.id] = 'refuse';
    state.counters.refusals++; state.counters.criteria += 2;
    // Appariement inverse : autres mandats actifs où cet acheteur dépasse 70, sans approche en cours.
    var hits = [];
    mandates().forEach(function (o) { if (o.id === m.id || o.stage === 'conclu' || ['signe', 'preparation', 'marche'].indexOf(o.stage) < 0) return; if (o.nda[b.id] || (o.refusals || []).some(function (x) { return x.buyer === b.id; })) return; var r = E.matchScore(b, o, state.weights, state); if (!r.excluded && r.score >= 70) hits.push({ m: o, score: r.score }); });
    hits.sort(function (a, c) { return c.score - a.score; });
    m.afterRefusal = (m.afterRefusal || []).concat(hits.slice(0, 2).map(function (h) { return { text: 'Appariement inverse : ' + h.m.codename + ' (' + h.m.code + ') correspond à ' + b.name + ' (score ' + h.score + ')', href: '#/dossier/' + h.m.id + '/acheteurs', date: today() }; }));
    var co = state.buyers.filter(function (x) { return x.coInvestor && !x.archived; })[0];
    if (p.reason === 'financement indisponible' && co) m.afterRefusal.push({ text: 'Montage P3 possible : ' + b.name + ' avec ' + co.name + ' (co-investisseur)', href: '#/acheteurs/' + co.id, date: today() });
    if (!hits.length) m.afterRefusal.push({ text: 'Appariement inverse relancé : aucun autre mandat actif ne dépasse 70 pour ' + b.name, date: today() });
    log(b.name, 'Refus structuré consigné : ' + p.reason, m.code + '; critère inféré ajouté (distinct du critère déclaré); appariement inverse relancé; contact toujours permis', { m: m.id, kind: 'buyers' });
    hits.slice(0, 2).forEach(function (h) { notify('Appariement inverse : ' + h.m.codename, b.name + ' correspond (score ' + h.score + ') après son refus de ' + m.codename + '.', { href: '#/dossier/' + h.m.id + '/acheteurs', m: h.m.id, kind: 'buyers' }); });
    return ok('Refus consigné. L’acheteur reste admissible ailleurs : appariement inverse relancé.');
  };
  A.cimGenerate = function (p) { var e = needFin(); if (e) return e; var m = MM(p); if (!m.valApproved) return fail('Le cahier se génère à partir de la fourchette validée.'); m.cim.generated = true; var n = E.cimOpen(m).length; log(m.code, 'Cahier de présentation généré (' + (E.isSeeded(m) ? 'IA scénarisée' : 'règles') + ')', '12 sections; chaque phrase factuelle liée à sa source; ' + n + ' à corriger', { m: m.id, kind: 'teaser' }); return ok('Cahier généré' + (n ? ' : ' + n + ' phrase' + (n > 1 ? 's' : '') + ' bloque' + (n > 1 ? 'nt' : '') + ' l’approbation.' : '.')); };
  A.cimClaim = function (p) {
    var e = needFin(); if (e) return e; var m = MM(p), cl = E.byId(m.cim.claims, p.id); if (!cl) return fail('Phrase introuvable.');
    if (p.d === 'reformulated' && !cl.alt) return fail('Aucune reformulation sourcée : liez une pièce ou supprimez la phrase.');
    if (p.d === 'linked' && (!p.doc || E.itemStatus(m, p.doc) !== 'revise')) return fail('Choisissez une pièce révisée de la salle de données.');
    m.cim.decisions[p.id] = { d: p.d, doc: p.doc || null }; if (m.cim.approved) m.cim.approved = null;
    log(m.code, 'Cahier : phrase ' + (p.d === 'deleted' ? 'supprimée' : p.d === 'linked' ? 'liée à la pièce ' + p.doc : 'reformulée avec source'), cl.t, { m: m.id, kind: 'teaser' });
    return ok();
  };
  A.cimApprove = function (p) {
    var e = needCourtier('approuver le cahier'); if (e) return e; var m = MM(p);
    if (!m.cim.generated) return fail('Générez d’abord le cahier.');
    var open = E.cimOpen(m); if (open.length) return fail('Approbation bloquée : ' + open.length + ' phrase' + (open.length > 1 ? 's' : '') + ' à sourcer (' + open[0].why + ').');
    m.cim.approved = { by: actorName(), date: today() };
    log(m.code, 'Cahier de présentation approuvé', 'Diffusion réservée aux signataires d’une entente de confidentialité', { m: m.id, kind: 'teaser' });
    return ok('Cahier approuvé.');
  };

  /* ---------------- Salle de données : accès par acheteur ---------------- */
  A.grant = function (p) {
    var e = needCourtier('accorder un accès'); if (e) return e; var m = MM(p), fz = frozen(m); if (fz) return fail(fz);
    if (m.nda[p.id] !== 'signe') return fail('Accès refusé : aucune entente de confidentialité signée pour ce dossier.');
    var folders = p.folders && p.folders.length ? p.folders : D.DEFAULT_GRANT_FOLDERS.slice(), days = +p.days || 75;
    if (folders.some(function (f) { return !D.ROOM_TEMPLATE.some(function (x) { return x.id === f; }); })) return fail('Dossier inconnu.');
    if (days < 1 || days > 365) return fail('Durée d’accès entre 1 et 365 jours.');
    m.grants[p.id] = { folders: folders, expires: U.addDays(today(), days), by: actorName(), date: today() };
    schedule(inDays(2, 13), 'views', { m: m.id, buyer: p.id });
    log(m.code, 'Accès accordé à ' + bname(p.id), 'Dossiers ' + folders.join(', ') + ' jusqu’au ' + U.date(m.grants[p.id].expires) + '; filigrane nominatif', { m: m.id, kind: 'room' });
    return ok('Accès accordé jusqu’au ' + U.date(m.grants[p.id].expires) + '.');
  };
  A.grantUpdate = function (p) {
    var e = needCourtier('modifier un accès'); if (e) return e; var m = MM(p), gr = m.grants[p.id]; if (!gr) return fail('Aucun accès pour cet acheteur.');
    if (m.nda[p.id] !== 'signe') return fail('Entente non valide : l’accès ne peut pas être prolongé.');
    var folders = (p.folders || []).filter(function (f) { return D.ROOM_TEMPLATE.some(function (x) { return x.id === f; }); });
    if (!folders.length) return fail('Cochez au moins un dossier, ou révoquez l’accès.');
    if (!U.isIsoDate(p.expires) || U.diffDays(today(), p.expires) < 0) return fail('Date d’expiration future requise.');
    gr.folders = folders; gr.expires = p.expires; gr.revoked = null; gr.expiredNotified = null;
    log(m.code, 'Accès modifié : ' + bname(p.id), 'Dossiers ' + folders.join(', ') + ' jusqu’au ' + U.date(p.expires), { m: m.id, kind: 'room' });
    return ok('Accès mis à jour.');
  };
  A.grantAllSigned = function (p) { var e = needCourtier('accorder un accès'); if (e) return e; var m = MM(p), n = 0, err = null; E.ndaSigned(m).forEach(function (id) { if (!E.grantActive(m, id, state)) { var r = A.grant({ m: m.id, id: id }); if (r.ok) n++; else err = r.msg; } }); return n ? ok(n + ' accès accordés (dossiers ' + D.DEFAULT_GRANT_FOLDERS.join(', ') + ', 75 jours).') : fail(err || 'Aucun signataire sans accès.'); };
  A.revoke = function (p) { var e = needCourtier('révoquer un accès'); if (e) return e; var m = MM(p); if (!m.grants[p.id]) return fail('Aucun accès.'); m.grants[p.id].revoked = today(); log(m.code, 'Accès révoqué : ' + bname(p.id), 'Effet immédiat; les copies téléchargées ne peuvent pas être rappelées', { m: m.id, kind: 'room' }); return ok('Accès révoqué.'); };
  A.buyerView = function (p) {
    var m = MM(p), b = buyer(p.buyer); if (!b) return fail('Acheteur introuvable.');
    var folder = p.folder, active = E.grantActive(m, b.id, state), okF = active && m.grants[b.id].folders.indexOf(folder) >= 0;
    m.accessLog.unshift({ at: stamp(), who: b.name, what: p.doc ? p.doc : 'Dossier ' + folder + ' ' + folderName(folder), action: okF ? 'Aperçu filigrané (vu par ' + actorName() + ')' : 'Refusé : ' + (!m.grants[b.id] ? 'aucun accès' : m.grants[b.id].revoked ? 'accès révoqué' : !active ? 'accès expiré' : 'dossier hors permission'), ok: okF });
    log(m.code, okF ? 'Aperçu côté acheteur consulté' : 'Accès refusé côté acheteur', b.name + ' : ' + (p.doc || 'dossier ' + folder), { m: m.id, kind: 'room' });
    // Un refus est quand même un changement d'état (tentative consignée) : on émet pour que le journal d'accès s'affiche.
    return okF ? ok(null) : ok(null, { denied: 'Accès refusé pour ' + b.name + ' : ' + m.accessLog[0].action.replace(/^Refusé : /, '') + '.' });
  };
  A.leak = function (p) { var m = MM(p); if (m.leak) return fail('Protocole déjà actif.'); m.leak = { since: today() }; state.incidents.unshift({ id: 'inc-' + (state.incidents.length + 1), date: today(), mandate: m.code, m: m.id, severity: 'À évaluer', status: 'Ouvert', text: 'Signalement de fuite potentielle' }); log(m.code, 'Fuite signalée : envois gelés', 'Incident consigné; administratrice et courtière avisées; liste de contrôle ouverte', { m: m.id, kind: 'compliance' }); notify(m.codename + ' : protocole de fuite', 'Envois et accès gelés. Suivez la liste de contrôle des six premières heures.', { href: mhref(m, 'salle'), m: m.id, kind: 'compliance', tone: 'err' }); return ok('Envois gelés. Incident consigné au registre.'); };
  A.leakResolve = function (p) { if (!P.admin()) return fail('Seule l’administratrice lève le gel.'); var m = MM(p); if (!m.leak) return fail('Aucun gel actif.'); m.leak = false; state.incidents.forEach(function (i) { if (i.m === m.id && i.status === 'Ouvert') i.status = 'Fermé, aucune exposition confirmée'; }); log(m.code, 'Gel levé', 'Évaluation : aucune exposition confirmée', { m: m.id, kind: 'compliance' }); return ok('Gel levé.'); };

  /* ---------------- Lettres d'intention, négociation, diligence, clôture ---------------- */
  A.loiDeadline = function (p) {
    var e = needCourtier('fixer la date limite'); if (e) return e; var m = MM(p);
    if (['marche', 'fenetre'].indexOf(m.stage) < 0) return fail('La date limite se fixe à l’étape Mise en marché.');
    if ((m.lois || []).length) return fail('Lettres déjà reçues.');
    if (!U.isIsoDate(p.date) || U.diffDays(today(), p.date) < 7) return fail('Date limite à au moins 7 jours de la date du jour.');
    m.loiDeadline = p.date; state.scheduled = state.scheduled.filter(function (x) { return !(x.m === m.id && x.kind === 'lois'); });
    schedule(U.absMin(p.date, 540), 'lois', { m: m.id });
    log(m.code, 'Date limite des LI fixée', U.dateLong(p.date), { m: m.id, kind: 'loi' });
    return ok('Date limite fixée au ' + U.date(p.date) + '.');
  };
  function validLoi(m, d) {
    var b = buyer(d.buyer); if (!b) return 'Choisissez un acheteur.';
    if (m.nda[d.buyer] !== 'signe') return 'Cet acheteur n’a pas d’entente de confidentialité signée.';
    var ev = U.parseAmount(d.ev), cash = U.parseAmount(d.cash), bpv = U.parseAmount(d.bpv || 0) || 0, earn = U.parseAmount(d.earnout || 0) || 0;
    if (!(ev > 0)) return 'Prix affiché requis.';
    if (!(cash >= 0) || cash + bpv + earn !== ev) return 'Comptant, BPV et complément doivent totaliser le prix (' + U.money(ev) + ').';
    if (!U.isIsoDate(d.close) || U.diffDays(today(), d.close) < 14) return 'Date de clôture visée à au moins 14 jours.';
    if (!(+d.exclusivity >= 15 && +d.exclusivity <= 180)) return 'Exclusivité de 15 à 180 jours.';
    return null;
  }
  function loiFrom(m, d, id) {
    var b = buyer(d.buyer), ev = U.parseAmount(d.ev), bpv = U.parseAmount(d.bpv || 0) || 0, earn = U.parseAmount(d.earnout || 0) || 0;
    var l = { id: id, buyer: d.buyer, ev: ev, cash: U.parseAmount(d.cash), bpv: bpv ? { amount: bpv, years: +d.bpvYears || 5, rate: (parseFloat(String(d.bpvRate || '6').replace(',', '.')) || 6) / 100 } : null, earnout: earn, earnoutCond: d.earnoutCond || (earn ? 'Conditions à préciser' : ''),
      wcTarget: U.parseAmount(d.wcTarget) != null ? U.parseAmount(d.wcTarget) : m.val.bridge.wcTarget, equity: U.parseAmount(d.equity) != null ? U.parseAmount(d.equity) : Math.round(ev * 0.2), conditions: String(d.conditions || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean),
      financing: d.financing || 'À obtenir', financingOk: d.financing && d.financing !== 'À obtenir', exclusivity: +d.exclusivity, close: d.close, transition: d.transition || '6 mois', employees: d.employees || 'Aucun engagement',
      leaseback: !!(m.property && d.leaseback), propertyPrice: m.property && !d.leaseback ? (U.parseAmount(d.propertyPrice) || m.property.value) : null, received: today(), source: 'manuelle' };
    l.property = !m.property ? 'Sans objet' : l.leaseback ? 'Cession-bail acceptée (loyer marchand)' : 'Achat de l’immeuble à ' + U.money(l.propertyPrice);
    l.prefsMet = E.prefsMet(m, b, l); return l;
  }
  A.loiAdd = function (p) { var e = needCourtier('consigner une lettre d’intention'); if (e) return e; var m = MM(p); if (m.loiSigned) return fail('Une lettre est déjà signée.'); var d = p.data || {}, err = validLoi(m, d); if (err) return fail(err); if (m.lois.some(function (l) { return l.buyer === d.buyer && l.status !== 'retirée'; })) return fail('Cet acheteur a déjà une lettre active : modifiez-la.'); var l = loiFrom(m, d, 'lm' + U.hash(m.id + d.buyer + absNow()).slice(0, 5)); m.lois.push(l); log(m.code, 'Lettre d’intention consignée : ' + bname(d.buyer), U.money(l.ev) + ', clôture visée le ' + U.date(l.close), { m: m.id, kind: 'loi' }); return ok('Lettre consignée.'); };
  A.loiEdit = function (p) { var e = needCourtier('modifier une lettre'); if (e) return e; var m = MM(p), i = m.lois.findIndex(function (l) { return l.id === p.id; }); if (i < 0) return fail('Lettre introuvable.'); if (m.loiSigned) return fail('Lettre signée : modification impossible.'); var d = Object.assign({ buyer: m.lois[i].buyer }, p.data || {}), err = validLoi(m, d); if (err) return fail(err); m.lois[i] = loiFrom(m, d, p.id); log(m.code, 'Lettre d’intention modifiée : ' + bname(d.buyer), U.money(m.lois[i].ev), { m: m.id, kind: 'loi' }); return ok('Lettre modifiée.'); };
  A.loiDelete = function (p) { var e = needCourtier('retirer une lettre'); if (e) return e; var m = MM(p), i = m.lois.findIndex(function (l) { return l.id === p.id; }); if (i < 0) return fail('Lettre introuvable.'); if (m.loiSigned) return fail('Lettre signée : retrait impossible.'); var l = m.lois.splice(i, 1)[0]; if (m.loiSelected === l.id) m.loiSelected = null; log(m.code, 'Lettre d’intention retirée', bname(l.buyer), { m: m.id, kind: 'loi' }); return ok('Lettre retirée.', { undo: { action: 'loiRestore', payload: { m: m.id, loi: l, index: i }, label: 'Annuler' } }); };
  A.loiRestore = function (p) { var m = MM(p); if (!m || E.byId(m.lois, p.loi.id)) return fail('Rien à restaurer.'); m.lois.splice(p.index, 0, p.loi); log(m.code, 'Lettre restaurée', bname(p.loi.buyer), { m: m.id, kind: 'loi' }); return ok('Lettre restaurée.'); };
  A.loiSelect = function (p) { var e = needCourtier('retenir une lettre'); if (e) return e; var m = MM(p); if (m.loiSigned) return fail('Lettre déjà signée.'); var l = E.byId(m.lois, p.id); if (!l || l.status === 'retirée') return fail('Lettre non disponible.'); m.loiSelected = p.id; return ok(); };
  A.loiSign = function (p) {
    var e = needCourtier('faire signer la lettre'); if (e) return e; var m = MM(p), fz = frozen(m); if (fz) return fail(fz);
    if (!m.loiSelected) return fail('Retenez d’abord une lettre.'); if (m.stage !== 'negociation') return fail('La signature se fait à l’étape Négociation.');
    var loi = E.loiOf(m);
    m.loiSigned = today(); m.exclusivityEnd = U.addDays(today(), loi.exclusivity);
    m.grants[loi.buyer] = { folders: D.ROOM_TEMPLATE.map(function (f) { return f.id; }), expires: m.exclusivityEnd, by: actorName(), date: today() };
    if (!loi.financingOk) schedule(inDays(21, 10), 'lender', { m: m.id });
    log(m.code, 'Accès étendu pour la vérification diligente', bname(loi.buyer) + ' : 12 dossiers jusqu’à la fin de l’exclusivité', { m: m.id, kind: 'room' });
    log(m.code, 'Lettre d’intention signée (signature électronique simulée)', bname(loi.buyer) + '; exclusivité de ' + loi.exclusivity + ' jours jusqu’au ' + U.date(m.exclusivityEnd), { m: m.id, kind: 'loi' });
    if (E.conflictRequired(m)) notify(m.codename + ' : représentation multiple', 'Divulgations de conflit requises avant la vérification diligente.', { href: mhref(m, 'cloture'), m: m.id, kind: 'loi', tone: 'warn' });
    return ok('Lettre signée (simulé). Exclusivité jusqu’au ' + U.date(m.exclusivityEnd) + '.');
  };
  A.conflictSign = function (p) { var e = needCourtier('transmettre la divulgation'); if (e) return e; var m = MM(p), party = E.conflictParties(m).filter(function (x) { return x.id === p.party; })[0]; if (!party) return fail('Partie inconnue.'); m.conflict[p.party] = today(); log(m.code, 'Divulgation de conflit signée (simulé)', party.label, { m: m.id, kind: 'compliance' }); return ok(); };
  A.financingApprove = function (p) { var m = MM(p); if (!E.loiOf(m)) return fail('Aucune lettre retenue.'); m.financingApproved = true; state.scheduled = state.scheduled.filter(function (x) { return !(x.m === m.id && x.kind === 'lender'); }); log(m.code, 'Approbation conditionnelle du prêteur reçue (simulé)', '', { m: m.id, kind: 'loi', actor: 'Système' }); return ok('Approbation conditionnelle consignée (simulé).'); };
  function ddIndex(m, actor) {
    if (m.dd.indexed) return 0;
    var seed = U.clone(m.ddSeed || []).map(function (x) { return Object.assign({ source: 'ia-scenario' }, x); }), rules = E.ddRules(m), covered = seed.map(function (x) { return x.needsDoc; }).filter(Boolean);
    var list = seed.length ? seed.concat(rules.filter(function (r) { return r.needsDoc && covered.indexOf(r.needsDoc) < 0; })) : rules;
    m.dd.findings = (m.dd.findings || []).concat(list); m.dd.indexed = today();
    var docs = list.map(function (x) { return x.needsDoc; }).filter(function (id) { return id && ['demande', 'a_demander'].indexOf(E.itemStatus(m, id)) >= 0; });
    if (docs.length) { docs.forEach(function (id) { if (E.itemStatus(m, id) === 'a_demander') m.room.status[id] = 'demande'; }); schedule(inDays(21, 11), 'docs', { m: m.id, items: docs }); }
    log(m.code, 'Pièces indexées : ' + list.length + ' constats de diligence', 'Citations de pièce et de page; l’IA ne certifie jamais l’absence de passif', { m: m.id, kind: 'dd', actor: actor || actorName() });
    notify(m.codename + ' : ' + list.length + ' constats de diligence', 'À transmettre ou à résoudre avant la levée des conditions.', { href: mhref(m, 'cloture'), m: m.id, kind: 'dd' });
    return list.length;
  }
  A.ddIndexNow = function (p) { var m = MM(p); if (m.stage !== 'diligence') return fail('À l’étape Vérification diligente seulement.'); if (m.dd.indexed) return fail('Pièces déjà indexées.'); state.scheduled = state.scheduled.filter(function (x) { return !(x.m === m.id && x.kind === 'ddIndex'); }); var n = ddIndex(m); return ok(n + ' constats indexés (simulé).'); };
  A.ddResolve = function (p) {
    var m = MM(p), d = E.byId(E.ddFindings(m), p.id); if (!d) return fail('Constat introuvable.');
    if (!m.dd.indexed) return fail('Indexez d’abord les pièces.');
    if (d.needsDoc && E.itemStatus(m, d.needsDoc) !== 'revise') return fail('Révisez d’abord la pièce ' + d.needsDoc + ' dans la salle de données.');
    m.dd.status[p.id] = 'resolu'; log(m.code, 'Constat de diligence résolu', d.text + ' Résolution : ' + d.resolve, { m: m.id, kind: 'dd' }); return ok();
  };
  A.run = function (p) {
    var e = needCourtier('cocher la feuille de route'); if (e) return e; var m = MM(p);
    if (m.stage !== 'cloture') return fail('À l’étape Clôture seulement.');
    var rs = E.runSheet(m), idx = rs.map(function (k) { return k.id; }).indexOf(p.id); if (idx < 0) return fail('Étape inconnue.');
    if (idx > 0 && !m.run[rs[idx - 1].id]) return fail('Ordre imposé par les dépendances : complétez d’abord l’étape ' + idx + '.');
    if (m.run[p.id] && rs.slice(idx + 1).some(function (k) { return m.run[k.id]; })) return fail('Décochez d’abord les étapes suivantes.');
    m.run[p.id] = m.run[p.id] ? null : today();
    if (m.run[p.id]) log(m.code, 'Feuille de route : étape ' + (idx + 1) + ' suivie', rs[idx].text, { m: m.id, kind: 'stage' });
    return ok();
  };
  A.conclude = function (p) {
    var e = needCourtier('conclure le dossier'); if (e) return e; var m = MM(p);
    if (m.stage !== 'cloture') return fail('À l’étape Clôture seulement.');
    var gs = E.gates(m, state).filter(function (x) { return !x.ok; }); if (gs.length) return fail('Clôture bloquée : ' + gs[0].label + '.');
    var loi = E.loiOf(m);
    if (U.diffDays(today(), loi.close) > 0) advanceTo(U.absMin(loi.close, 540));
    m.stage = 'conclu'; m.history.push({ stage: 'conclu', date: today() }); m.concluded = today(); m.disclosure = 'divulgue';
    state.counters.relations++;
    var b = buyer(loi.buyer); if (b) { b.acquisitions = (b.acquisitions || 0) + 1; b.relations = (b.relations || []).concat(['a_acquis : ' + (P.identity() ? m.profile.company : m.codename) + ' (' + today().slice(0, 4) + ')']); }
    log(m.code, 'Dossier conclu : actes signés chez le notaire', 'Fonds remis (suivi seulement : la firme ne détient aucun fonds)', { m: m.id, kind: 'stage' });
    notify(m.codename + ' conclu', 'Clôture du ' + U.date(today()) + ' : mémoire institutionnelle et économie du cabinet mises à jour.', { href: mhref(m, 'cloture'), m: m.id, kind: 'stage' });
    return ok(m.codename + ' conclu le ' + U.date(today()) + '.');
  };
  A.advance = function (p) {
    var e = needCourtier('faire avancer le dossier'); if (e) return e; var m = MM(p);
    var miss = E.gates(m, state).filter(function (x) { return !x.ok; });
    if (miss.length) return fail('Étape bloquée : ' + miss[0].label + '.');
    var nx = E.nextStage(m.stage); if (!nx) return fail('Dossier conclu.');
    if (nx === 'conclu') return A.conclude(p);
    var from = m.stage; m.stage = nx; m.history.push({ stage: nx, date: today() });
    if (nx === 'preparation') m.dates.prepStart = today();
    if (nx === 'marche') m.disclosure = 'teaser';
    if (nx === 'fenetre') m.disclosure = 'nda';
    if (nx === 'diligence') { m.disclosure = 'divulgue'; schedule(inDays(14, 9), 'ddIndex', { m: m.id }); }
    log(m.code, 'Étape : ' + E.stageLabel(nx), 'Depuis ' + E.stageLabel(from) + '; toutes les conditions d’entrée remplies', { m: m.id, kind: 'stage' });
    notify(m.codename + ' : ' + E.stageLabel(nx), 'Le dossier passe à l’étape ' + E.stageLabel(nx) + '.', { href: mhref(m, 'apercu'), m: m.id, kind: 'stage' });
    return ok(m.codename + ' : ' + E.stageLabel(nx) + '.');
  };
  A.holdResolve = function (p) { var e = needCourtier('confirmer la poursuite'); if (e) return e; var m = MM(p); if (!m.hold) return fail('Aucune pause active.'); if (!p.note || p.note.trim().length < 8) return fail('Consignez le résultat de la rencontre (8 caractères ou plus).'); log(m.code, 'Le cédant confirme la poursuite', p.note.trim() + ' (pause du ' + U.date(m.hold.since) + ')', { m: m.id, kind: 'stage' }); m.hold = null; return ok('Poursuite confirmée : les envois reprennent.'); };
  A.consentRestore = function (p) { var e = needCourtier('consigner un nouveau consentement'); if (e) return e; var m = MM(p); if (!m.sellerConsentWithdrawn) return fail('Aucun retrait actif.'); m.sellerConsentWithdrawn = null; state.loi25.unshift({ date: today(), person: m.profile.owner, scope: 'Nouveau consentement écrit du cédant', actions: ['Communications aux acheteurs rétablies'] }); log(m.code, 'Nouveau consentement du cédant consigné (Loi 25)', 'Formulaire signé; libellé v2026.2', { m: m.id, kind: 'compliance' }); return ok('Consentement consigné.'); };

  /* ---------------- Moteur acheteurs : CRM (création, modification, archivage) ---------------- */
  function validBuyer(d) {
    if (!d.name || d.name.trim().length < 3) return 'Nom requis (3 caractères ou plus).';
    if (!D.BUYER_TYPES[d.type] || d.type === 'investisseur_immobilier') return 'Choisissez un type d’acheteur.';
    var sectors = (d.sectors || []).filter(Boolean); if (!sectors.length) return 'Au moins un secteur SCIAN (ou « * » pour un acheteur généraliste).';
    if (sectors.some(function (s) { return s !== '*' && !/^\d{2,6}$/.test(s); })) return 'Secteurs : codes SCIAN de 2 à 6 chiffres séparés par des virgules.';
    var pairs = [['ebitdaMin', 'ebitdaMax', 'BAIIA'], ['revenueMin', 'revenueMax', 'Chiffre d’affaires'], ['equityMin', 'equityMax', 'Mise de fonds']];
    for (var i = 0; i < pairs.length; i++) { var a = U.parseAmount(d[pairs[i][0]]), b = U.parseAmount(d[pairs[i][1]]); if ((d[pairs[i][0]] && a == null) || (d[pairs[i][1]] && b == null)) return pairs[i][2] + ' : montant illisible.'; if (a != null && b != null && a > b) return pairs[i][2] + ' : le minimum dépasse le maximum.'; }
    if (!(d.regions || []).length) return 'Au moins une région (ou « Québec » pour toute la province).';
    if (d.lastVerified && (!U.isIsoDate(d.lastVerified) || U.diffDays(d.lastVerified, today()) < 0)) return 'Date de vérification invalide ou future.';
    if (D.TIMELINES[d.timeline] == null) return 'Choisissez un échéancier.';
    return null;
  }
  function buyerFields(b, d) {
    b.name = d.name.trim(); b.type = d.type; b.city = d.city || ''; b.region = d.region || (d.regions || [])[0] || ''; b.thesis = d.thesis || ''; b.angle = d.angle || (d.type === 'financier' ? 'Financier' : 'Horizontal');
    b.criteria = Object.assign(b.criteria || {}, { sectors: (d.sectors || []).filter(Boolean), revenueMin: U.parseAmount(d.revenueMin), revenueMax: U.parseAmount(d.revenueMax), ebitdaMin: U.parseAmount(d.ebitdaMin), ebitdaMax: U.parseAmount(d.ebitdaMax), regions: d.regions, structures: d.structures || [], bpvOk: !!d.bpvOk, leaseback: d.leaseback === 'oui' ? true : d.leaseback === 'non' ? false : null });
    b.equityMin = U.parseAmount(d.equityMin); b.equityMax = U.parseAmount(d.equityMax); b.fundingEvidence = !!d.fundingEvidence; b.financing = d.financing || (d.fundingEvidence ? 'Preuve au dossier' : 'Aucune preuve');
    b.timeline = d.timeline; b.lastVerified = d.lastVerified || null; b.acquisitions = +d.acquisitions || 0; b.priorInterest = !!d.priorInterest; b.notes = d.notes || '';
    b.prefs = b.prefs || { emplois: true, quebec: true, transition: true, bpv: !!d.bpvOk, immeuble: true };
  }
  function rematch(b, why) {
    var hits = [], n = 0;
    mandates().forEach(function (m) {
      if (m.stage === 'conclu' || !E.isBusinessBuyer(b) || !m.fin.entered) return; n++;
      if (m.shortlist.indexOf(b.id) >= 0 || m.nda[b.id] || m.exclusions[b.id]) return;
      var r = E.matchScore(b, m, state.weights, state); if (r.score >= 70 && ['signe', 'preparation', 'marche'].indexOf(m.stage) >= 0) hits.push({ m: m, score: r.score });
    });
    log(b.name, 'Appariement relancé (' + why + ')', n + ' mandat' + (n > 1 ? 's' : '') + ' recalculé' + (n > 1 ? 's' : '') + '; ' + hits.length + ' correspondance' + (hits.length > 1 ? 's' : '') + ' de 70 ou plus', { kind: 'buyers' });
    hits.forEach(function (h) { notify('Nouveau candidat pour ' + h.m.codename, b.name + ' correspond (score ' + h.score + ').', { href: '#/dossier/' + h.m.id + '/acheteurs', m: h.m.id, kind: 'buyers' }); });
    return hits;
  }
  A.buyerCreate = function (p) {
    if (!P.buyersWrite()) return fail('Les profils acheteurs sont créés par les agents acheteurs et la courtière.');
    var d = p.data || {}, err = validBuyer(d); if (err) return fail(err);
    if (state.buyers.some(function (b) { return U.fold(b.name) === U.fold(d.name) && !b.archived; })) return fail('Un profil porte déjà ce nom.');
    var b = { id: 'b' + U.hash(d.name + absNow()).slice(0, 6), inferred: [], relations: [], refusals: [], archived: false, onlyMandate: null, underMandate: null, coInvestor: false, created: today() };
    buyerFields(b, d); state.buyers.push(b);
    log(b.name, 'Profil acheteur créé', D.BUYER_TYPES[b.type] + '; critères déclarés consignés', { kind: 'buyers' });
    var hits = rematch(b, 'nouveau profil');
    return ok('Profil créé. ' + (hits.length ? hits.length + ' mandat' + (hits.length > 1 ? 's' : '') + ' correspond' + (hits.length > 1 ? 'ent' : '') + ' (score de 70 ou plus).' : 'Aucun mandat ne dépasse 70 pour l’instant.'), { id: b.id });
  };
  A.buyerUpdate = function (p) {
    if (!P.buyersWrite()) return fail('Lecture seule pour ce rôle.');
    var b = buyer(p.id); if (!b) return fail('Profil introuvable.');
    var d = p.data || {}, err = validBuyer(d); if (err) return fail(err);
    buyerFields(b, d); log(b.name, 'Critères déclarés modifiés', 'Par ' + actorName(), { kind: 'buyers' });
    var hits = rematch(b, 'critères modifiés');
    return ok('Profil enregistré. Appariement relancé' + (hits.length ? ' : ' + hits.length + ' nouvelle' + (hits.length > 1 ? 's' : '') + ' correspondance' + (hits.length > 1 ? 's' : '') + '.' : '.'));
  };
  A.buyerDelete = function (p) {
    if (!P.buyersWrite()) return fail('Lecture seule pour ce rôle.');
    var i = state.buyers.findIndex(function (b) { return b.id === p.id; }); if (i < 0) return fail('Profil introuvable.');
    var b = state.buyers[i], engaged = mandates().filter(function (m) { return m.nda[b.id] || m.lois.some(function (l) { return l.buyer === b.id; }) || m.shortlist.indexOf(b.id) >= 0; });
    if (engaged.length) return fail('Profil engagé dans ' + engaged.map(function (m) { return m.codename; }).join(', ') + ' (liste, entente ou lettre) : archivez-le plutôt.');
    var snap = { buyer: U.clone(b), index: i };
    state.buyers.splice(i, 1); log(b.name, 'Profil acheteur supprimé', 'Annulable depuis la notification', { kind: 'buyers' });
    return ok('Profil supprimé.', { undo: { action: 'buyerRestore', payload: snap, label: 'Annuler' } });
  };
  A.buyerRestore = function (p) { if (!p.buyer || buyer(p.buyer.id)) return fail('Rien à restaurer.'); state.buyers.splice(Math.min(p.index, state.buyers.length), 0, p.buyer); log(p.buyer.name, 'Profil restauré', '', { kind: 'buyers' }); return ok('Profil restauré.'); };
  A.buyerArchive = function (p) { if (!P.buyersWrite()) return fail('Lecture seule pour ce rôle.'); var b = buyer(p.id); if (!b) return fail('Profil introuvable.'); b.archived = !b.archived; log(b.name, b.archived ? 'Profil archivé' : 'Profil réactivé', b.archived ? 'Retiré de l’appariement; historique conservé' : 'Remis dans l’appariement', { kind: 'buyers' }); if (!b.archived) rematch(b, 'profil réactivé'); return ok(b.archived ? 'Profil archivé : il sort de l’appariement.' : 'Profil réactivé.'); };
  A.requalify = function (p) {
    if (!P.buyersWrite()) return fail('Les profils acheteurs sont mis à jour par les agents acheteurs et la courtière.');
    var b = buyer(p.id); if (!b) return fail('Profil introuvable.');
    b.lastVerified = today(); state.counters.criteria++;
    log(b.name, 'Profil requalifié (appel simulé)', 'Intérêt, capacité et échéancier confirmés le ' + U.date(today()), { kind: 'buyers' });
    rematch(b, 'requalification');
    return ok('Profil requalifié : confiance remise à « élevée ».');
  };
  A.weights = function (p) { if (!D.WEIGHTS[p.value]) return fail('Barème inconnu.'); state.weights = p.value; log('Appariement', 'Barème d’appariement : ' + D.WEIGHTS[p.value].label, 'Résultats reproductibles avec la version enregistrée', { kind: 'buyers' }); return ok(); };

  /* ---------------- Formation et conformité ---------------- */
  A.exam = function (p) { var t = state.training.jg, score = p.score, total = D.EXAM_S8.length, pass = score / total >= 0.8; t.attempts.push({ date: today(), score: score, total: total }); if (pass) t.s8 = true; log('Jérémie Gosselin', 'Examen de la Section 8 : ' + score + ' sur ' + total, pass ? 'Réussi : outils d’appel débloqués' : 'Échec : seuil de 80 %', { actor: 'Jérémie Gosselin', kind: 'training' }); return ok(pass ? 'Examen réussi : les outils d’appel de Jérémie sont débloqués.' : 'Seuil de 80 % non atteint. Les réponses ne sont révélées qu’après la réussite.'); };
  A.scrubImport = function () { if (!P.admin()) return fail('Réservé à l’administratrice.'); state.compliance.lastScrub = today(); log('Conformité', 'Vérification LNNTE importée', 'Liste au ' + U.date(today()), { kind: 'compliance' }); return ok('Vérification LNNTE à jour.'); };
  A.vendorToggle = function (p) { var v = D.VENDORS.filter(function (x) { return x.id === p.id; })[0]; if (v.efvp !== 'complete') { log('Conformité', 'Activation refusée : ' + v.name, 'EFVP non complétée : aucun flux de renseignements personnels', { kind: 'compliance' }); return fail('Activation refusée : l’EFVP de ' + v.name + ' n’est pas complétée.'); } return ok(v.name + ' : flux déjà autorisé.'); };
  A.accessExport = function (p) { var c = lead(p.id || 'r1'); log('Loi 25', 'Demande d’accès traitée', 'Export JSON des renseignements détenus sur ' + (c ? c.director : 'la personne'), { kind: 'compliance' }); return ok(); };
  A.auditExport = function () { log('Journal', 'Journal exporté', 'CSV filigrané au nom de ' + actorName(), { kind: 'compliance' }); return ok(); };
  A.logOnly = function (p) { log(p.entity, p.action, p.detail, { m: p.m, kind: p.kind || 'action' }); return ok(); };
  A.auditAll = function () { state.auditAll = !state.auditAll; return ok(); };
  A.auditFilter = function (p) { state.auditFilter = String(p.value || '').slice(0, 60); return ok(); };

  /* ---------------- Labo de test : événements externes injectés ---------------- */
  A.labEvent = function (p) {
    var t = p.type, m = p.m ? mandate(p.m) : null, b = p.buyer ? buyer(p.buyer) : null, actor = { actor: 'Labo de test' };
    if (t === 'buyerWithdraws') {
      if (!m || !b) return fail('Choisissez un mandat et un acheteur.');
      if (!m.nda[b.id] || m.nda[b.id] === 'retire' || m.nda[b.id] === 'refuse') return fail(b.name + ' n’est pas en discussion sur ce dossier.');
      m.nda[b.id] = 'retire'; if (m.grants[b.id]) m.grants[b.id].revoked = today();
      var l = (m.lois || []).filter(function (x) { return x.buyer === b.id && x.status !== 'retirée'; })[0], fell = false;
      if (l) { l.status = 'retirée'; if (m.loiSelected === l.id) { fell = !!m.loiSigned; m.loiSelected = null; m.loiSigned = null; m.exclusivityEnd = null; m.financingApproved = false; m.conflict = {}; m.dd = { findings: [], status: {}, indexed: null }; m.run = {}; } }
      if (fell && ['negociation', 'diligence', 'cloture'].indexOf(m.stage) >= 0) { var alive = m.lois.filter(function (x) { return x.status !== 'retirée'; }).length; var back = alive ? 'negociation' : 'marche'; m.stage = back; m.history.push({ stage: back, date: today() }); state.scheduled = state.scheduled.filter(function (x) { return !(x.m === m.id && (x.kind === 'lender' || x.kind === 'ddIndex')); }); log(m.code, 'Retour à l’étape : ' + E.stageLabel(back), 'L’acquéreur retenu s’est retiré', Object.assign({ m: m.id, kind: 'stage' }, actor)); }
      if (!m.pendingRefusals.some(function (x) { return x.buyer === b.id; })) m.pendingRefusals.push({ buyer: b.id, reason: 'pas le bon moment', date: today() });
      log(m.code, b.name + ' se retire du processus', 'Entente close, accès révoqué' + (l ? ', lettre d’intention retirée' : '') + (fell ? '; transaction tombée, retour en ' + E.stageLabel(m.stage) : ''), Object.assign({ m: m.id, kind: 'buyers' }, actor));
      notify(m.codename + ' : ' + b.name + ' se retire', (fell ? 'L’acquéreur retenu s’est retiré : le dossier revient à « ' + E.stageLabel(m.stage) + ' ». ' : '') + 'Consignez le motif structuré.', { href: mhref(m, fell ? 'cloture' : 'acheteurs'), m: m.id, kind: 'refusal', tone: 'err' });
      return ok(b.name + ' s’est retiré' + (fell ? ' : la transaction est tombée.' : '.'));
    }
    if (t === 'newLoi') {
      if (!m || !b) return fail('Choisissez un mandat et un acheteur.');
      if (m.nda[b.id] !== 'signe') return fail(b.name + ' n’a pas d’entente signée sur ce dossier.');
      if (m.loiSigned) return fail('Une lettre est déjà signée (exclusivité en cours).');
      if (['marche', 'fenetre', 'negociation'].indexOf(m.stage) < 0) return fail('Une lettre arrive pendant la mise en marché, la fenêtre de LI ou la négociation.');
      if (m.lois.some(function (x) { return x.buyer === b.id && x.status !== 'retirée'; })) return fail('Cet acheteur a déjà une lettre active.');
      var save = m.loiDeadline; m.loiDeadline = m.loiDeadline && U.diffDays(m.loiDeadline, today()) >= 0 ? m.loiDeadline : today();
      var keep = m.grants[b.id]; if (!E.grantActive(m, b.id, state)) m.grants[b.id] = { folders: ['02'], expires: U.addDays(today(), 1), by: 'Labo', date: today() };
      var tpl = m.loiTemplates; m.loiTemplates = [];
      var gen = E.generateLOIs(m, state).filter(function (x) { return x.buyer === b.id; })[0];
      m.loiTemplates = tpl; m.loiDeadline = save; if (keep) m.grants[b.id] = keep; else delete m.grants[b.id];
      if (!gen) return fail('Impossible de générer la lettre.');
      if (p.ev) { var ev = U.parseAmount(p.ev); if (!(ev > 0)) return fail('Prix invalide.'); var ratio = ev / gen.ev; gen.ev = ev; gen.cash = Math.round(gen.cash * ratio); gen.earnout = Math.round((gen.earnout || 0) * ratio); if (gen.bpv) gen.bpv.amount = ev - gen.cash - gen.earnout; else gen.cash = ev - gen.earnout; }
      gen.id = 'lx' + U.hash(m.id + b.id + absNow()).slice(0, 5); gen.received = today(); gen.source = 'reçue (événement injecté)'; gen.close = U.addDays(today(), 84);
      m.lois.push(gen);
      log(m.code, 'Nouvelle lettre d’intention reçue : ' + b.name, U.money(gen.ev) + ', ' + gen.financing.toLowerCase(), Object.assign({ m: m.id, kind: 'loi' }, actor));
      notify(m.codename + ' : nouvelle lettre d’intention', b.name + ' propose ' + U.money(gen.ev) + '. Comparez-la aux autres offres.', { href: mhref(m, 'cloture'), m: m.id, kind: 'loi' });
      return ok('Lettre de ' + b.name + ' reçue : ' + U.money(gen.ev) + '.');
    }
    if (t === 'ddFinding') {
      if (!m) return fail('Choisissez un mandat.'); if (m.stage !== 'diligence' && m.stage !== 'cloture') return fail('Un constat de diligence s’ajoute à l’étape Vérification diligente.');
      if (!p.text || p.text.trim().length < 10) return fail('Décrivez le constat (10 caractères ou plus).');
      if (!m.dd.indexed) m.dd.indexed = today();
      var f = { id: 'dx' + U.hash(p.text + absNow()).slice(0, 5), text: p.text.trim(), cite: p.cite || 'Pièce à préciser', resolve: 'Résolu après analyse par la courtière et les professionnels', severity: p.severity || 'élevée', source: 'injecté' };
      m.dd.findings.push(f);
      if (m.stage === 'cloture') { m.stage = 'diligence'; m.history.push({ stage: 'diligence', date: today() }); m.run = {}; }
      log(m.code, 'Nouveau constat de diligence', f.text + ' (gravité ' + f.severity + ')', Object.assign({ m: m.id, kind: 'dd' }, actor));
      notify(m.codename + ' : nouveau constat', f.text, { href: mhref(m, 'cloture'), m: m.id, kind: 'dd', tone: 'warn' });
      return ok('Constat ajouté : la clôture est bloquée jusqu’à sa résolution.');
    }
    if (t === 'sellerHesitates') {
      if (!m) return fail('Choisissez un mandat.'); if (m.stage === 'conclu') return fail('Dossier conclu.'); if (m.hold) return fail('Le cédant hésite déjà.');
      m.hold = { since: today(), reason: p.text || 'Le cédant demande une pause : il doute du moment de vendre.' };
      log(m.code, 'Le cédant hésite : mandat en pause', m.hold.reason, Object.assign({ m: m.id, kind: 'stage' }, actor));
      notify(m.codename + ' : le cédant hésite', 'Envois et nouvelles approches suspendus jusqu’à une rencontre de recadrage.', { href: mhref(m, 'apercu'), m: m.id, kind: 'stage', tone: 'warn' });
      return ok('Mandat en pause : les envois sont suspendus.');
    }
    if (t === 'consentWithdrawn') {
      if (p.m) {
        if (!m) return fail('Mandat introuvable.'); if (m.sellerConsentWithdrawn) return fail('Déjà retiré.');
        m.sellerConsentWithdrawn = { date: today() }; var revoked = 0; Object.keys(m.grants).forEach(function (id) { if (E.grantActive(m, id, state)) { m.grants[id].revoked = today(); revoked++; } });
        state.loi25.unshift({ date: today(), person: m.profile.owner + ' (cédant, ' + m.code + ')', scope: 'Communication de ses renseignements aux acheteurs', actions: ['Envois aux acheteurs suspendus', revoked + ' accès à la salle révoqué' + (revoked > 1 ? 's' : ''), 'Étape bloquée jusqu’à un nouveau consentement écrit'] });
        log(m.code, 'Retrait du consentement du cédant (Loi 25)', revoked + ' accès révoqué' + (revoked > 1 ? 's' : '') + '; communications aux acheteurs suspendues', Object.assign({ m: m.id, kind: 'compliance' }, actor));
        notify(m.codename + ' : consentement retiré', 'Le cédant retire son consentement à la communication de ses renseignements. Accès révoqués; étape bloquée.', { href: mhref(m, 'apercu'), m: m.id, kind: 'compliance', tone: 'err' });
        return ok('Consentement retiré : accès révoqués et envois suspendus.');
      }
      var c = lead(p.lead); if (!c) return fail('Choisissez une piste.');
      var k = cs(c.id), scope = p.scope === 'tout' ? 'tout' : 'courriel', acts = [];
      k.consentWithdrawn = scope; k.emailBasis = 'supprime'; acts.push('Fondement courriel : supprimé (LCAP)');
      if (k.call && (k.call.intake === 'sent' || k.call.intake === 'ready')) { k.call.intake = 'revoked'; acts.push('Lien de questionnaire révoqué'); }
      var before = state.scheduled.length; state.scheduled = state.scheduled.filter(function (x) { return x.lead !== c.id; }); if (before !== state.scheduled.length) acts.push((before - state.scheduled.length) + ' rappel' + (before - state.scheduled.length > 1 ? 's' : '') + ' annulé' + (before - state.scheduled.length > 1 ? 's' : ''));
      if (scope === 'tout') {
        var ph = E.phoneOf(c); if (ph && !E.isDnc(ph.value, state)) { state.dnc.unshift({ value: ph.value, company: c.name, date: today(), source: 'Retrait du consentement (Loi 25)' }); acts.push('Numéro inscrit à la liste interne d’exclusion'); }
        if (k.call) { k.call.notes = '[Notes supprimées à la demande de la personne, Loi 25, ' + today() + ']'; k.call.fields = []; acts.push('Notes d’appel et champs extraits supprimés'); }
        delete k.ageBand; delete k.succession; delete k.email; acts.push('Renseignements personnels minimisés (âge, relève, courriel)');
      }
      state.loi25.unshift({ date: today(), person: c.director + ' (' + c.name + ')', scope: scope === 'tout' ? 'Retrait complet : aucun contact, minimisation' : 'Retrait du consentement aux courriels', actions: acts });
      log(c.name, 'Retrait du consentement (Loi 25)', acts.join('; '), Object.assign({ kind: 'compliance' }, actor));
      notify('Consentement retiré : ' + c.name, acts.join('. ') + '.', { href: '#/radar/' + c.id, kind: 'compliance', tone: 'err' });
      return ok('Retrait consigné : ' + acts.length + ' conséquence' + (acts.length > 1 ? 's' : '') + ' appliquée' + (acts.length > 1 ? 's' : '') + '.');
    }
    if (t === 'docArrives') {
      if (!m || !p.item) return fail('Choisissez un mandat et une pièce.'); var s = E.itemStatus(m, p.item); if (['revise', 'recu', 'sans_objet'].indexOf(s) >= 0) return fail('Pièce déjà reçue ou sans objet.');
      m.room.status[p.item] = 'recu'; log(m.code, 'Pièce reçue du cédant', p.item + ' ' + E.itemName(m, p.item), Object.assign({ m: m.id, kind: 'room' }, actor));
      notify(m.codename + ' : pièce reçue', p.item + ' ' + E.itemName(m, p.item) + ' attend votre révision.', { href: mhref(m, 'salle'), m: m.id, kind: 'room' });
      return ok('Pièce ' + p.item + ' reçue.');
    }
    if (t === 'ndaSigned') {
      if (!m || !b) return fail('Choisissez un mandat et un acheteur.'); if (['envoye', 'consulte'].indexOf(m.nda[b.id]) < 0) return fail('Aucune entente en attente pour cet acheteur.');
      m.nda[b.id] = 'signe'; m.ndaDates[b.id] = today(); state.scheduled = state.scheduled.filter(function (x) { return !(x.m === m.id && x.buyer === b.id && x.kind === 'nda'); });
      log(m.code, 'Entente de confidentialité signée : ' + b.name, 'Événement injecté', Object.assign({ m: m.id, kind: 'buyers' }, actor));
      notify(m.codename + ' : entente signée', b.name + ' a signé l’entente de confidentialité.', { href: mhref(m, 'salle'), m: m.id, kind: 'buyers' });
      return ok('Entente signée par ' + b.name + '.');
    }
    return fail('Événement inconnu.');
  };

  /* ---------------- Espace de travail : export et import JSON ---------------- */
  function exportJSON() { return JSON.stringify(Object.assign({}, state, { exportedAt: stamp() }), null, 1); }
  A.importState = function (p) {
    var s; try { s = typeof p.json === 'string' ? JSON.parse(p.json) : p.json; } catch (e) { return fail('Fichier illisible : JSON invalide.'); }
    if (!s || s.app !== 'nexus-cte-v3') return fail('Ce fichier ne vient pas de la démo Nexus CTE V3.');
    if (s.v !== VERSION) return fail('Version d’espace de travail incompatible (' + s.v + ', attendu ' + VERSION + ').');
    var need = ['clock', 'mandates', 'mandateIds', 'buyers', 'leads', 'audit', 'inbox', 'scheduled', 'caps'];
    for (var i = 0; i < need.length; i++) if (!(need[i] in s)) return fail('Fichier incomplet : « ' + need[i] + ' » manquant.');
    if (!U.isIsoDate(s.clock.d) || s.mandateIds.some(function (id) { return !s.mandates[id]; })) return fail('Fichier incohérent : horloge ou mandats invalides.');
    delete s.exportedAt; state = s;
    log('Espace de travail', 'Espace de travail importé', s.mandateIds.length + ' mandats, ' + s.buyers.length + ' profils acheteurs, horloge au ' + U.dateTime(s.clock.d, s.clock.m), { kind: 'lab', actor: 'Labo de test' });
    return ok('Espace de travail importé.');
  };

  function dispatch(name, payload) {
    var fn = A[name];
    if (!fn) return fail('Action inconnue : ' + name);
    var res;
    try { res = fn(payload || {}); } catch (e) { g.console && console.error(e); return fail('Erreur inattendue.'); }
    if (res && res.ok) emit({ action: name, silent: res.silent }); else save();
    return res || ok();
  }

  g.S = {
    get: function () { return state; }, dispatch: dispatch, subscribe: subscribe, reset: reset, P: P, lead: lead, company: lead, buyer: buyer, mandate: mandate, mandates: mandates,
    call: call, cs: cs, actorName: actorName, KEY: KEY, VERSION: VERSION, today: today, exportJSON: exportJSON, absNow: absNow, actions: A
  };
})(window);
