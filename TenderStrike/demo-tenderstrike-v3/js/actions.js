/* Actions génériques : chaque action prend l’identifiant du dossier, écrit au journal unique,
   produit les notifications utiles et persiste. Aucune action n’est propre à un dossier. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S;
  const A = (TS.A = {});
  const log = S.log, notify = S.notify, commit = S.commit;
  const touch = (id) => { S.D(id).rev += 1; };
  const WHO = { decide: 'la propriétaire', approvePrice: 'la propriétaire', sign: 'la signataire autorisée', approvePackage: 'la signataire autorisée', vault: 'l’administratrice ou la propriétaire', price: 'l’estimateur ou la propriétaire', bond: 'l’estimateur ou la propriétaire', receipt: 'la propriétaire', forms: 'l’équipe de préparation', restricted: 'la propriétaire ou l’administratrice', tender: 'l’estimateur ou la propriétaire' };
  const deny = (perm) => ({ ok: false, msg: 'Action réservée à ' + WHO[perm] + '. Changez de rôle en haut à droite pour l’essayer.' });
  const name = (id) => S.def(id).buyerShort;
  const LBL = { proceed: 'Poursuivre', investigate: 'Investiguer', decline: 'Décliner' };

  /* ---------- général ---------- */
  A.setPersona = (p) => { if (!D.people[p]) return { ok: false }; S.state.persona = p; log(null, 'Rôle actif : ' + D.people[p].name, D.people[p].role, { min: 1 }); commit(); return { ok: true, msg: 'Vous agissez maintenant comme ' + D.people[p].name + '.' }; };
  A.clockBy = (minutes, label) => {
    const before = S.now();
    S.state.clock += Math.round(minutes);
    S.state.log.push({ at: S.nowIso(), actor: 'lab', tender: null, what: 'Horloge avancée' + (label ? ' : ' + label : ''), detail: U.dayTime(before) + ' → ' + U.dayTime(S.now()), ver: '' });
    S.scan(); commit();
    return { ok: true, msg: 'Horloge de démo : ' + U.dayTime(S.now()) + '.' };
  };
  A.clockTo = (iso) => {
    const ts = Date.parse(iso);
    if (!isFinite(ts)) return { ok: false, msg: 'Date invalide.' };
    const delta = Math.round((ts - S.nowTs()) / 60000);
    if (delta <= 0) return { ok: false, msg: 'L’horloge ne recule pas : réinitialisez la démo ou chargez un scénario pour revenir en arrière.' };
    return A.clockBy(delta, 'aller au ' + U.dayTime(ts));
  };
  A.cap = (k, v) => { S.state.caps[k] = !!v; log(null, 'Capacité simulée : ' + k + (v ? ' activée' : ' désactivée'), '', { actor: 'lab', min: 0 }); if (k === 'offline' && v) notify({ type: 'system', title: 'SEAO injoignable (simulation)', body: 'La surveillance des addenda est interrompue : vérifiez manuellement avant tout export.', href: '#/radar' }); commit(); return { ok: true }; };
  A.read = (nid) => { const n = S.state.inbox.find((x) => x.id === nid); if (n) n.read = true; commit(); };
  A.readAll = () => { S.state.inbox.forEach((n) => { n.read = true; }); commit(); return { ok: true, msg: 'Toutes les notifications sont lues.' }; };
  A.radarView = (v) => { S.state.radar.view = v; commit(); };
  A.radius = (km) => { const before = S.state.radar.radius; S.state.radar.radius = km; log(null, 'Rayon de recherche modifié', 'Le classement change; les décisions passées gardent leur motif.', { min: 1, diff: [before + ' km', km + ' km'] }); commit(); };
  A.feedback = (id, code) => {
    const lbl = (D.feedbackCodes.find((c) => c[0] === code) || [])[1];
    S.state.radar.feedback[id] = { code, at: S.nowIso(), by: S.state.persona };
    log(id, 'Retour sur une correspondance : ' + lbl, 'Appliqué à votre entreprise seulement.', { min: 1 });
    commit();
    return { ok: true, msg: 'Merci : « ' + lbl + ' » sera pris en compte pour vos prochains classements.' };
  };

  /* ---------- dossier ---------- */
  A.openXray = (id) => { const d = S.D(id); if (!d.xrayOpened) { d.xrayOpened = true; log(id, 'Radiographie ouverte', 'Le dossier passe en revue.', { min: 2 }); commit(); } };
  A.acquire = (id, files, sample) => {
    if (!S.can('tender')) return deny('tender');
    const d = S.D(id);
    d.acquired = { files: (files || []).map((f) => ({ name: f.name, size: f.size, hash: f.hash })), at: S.nowIso(), sample: !!sample };
    d.xrayOpened = true;
    log(id, 'Documents obtenus sur SEAO versés au dossier', (files || []).map((f) => f.name).join(', ') + ' · lecture simulée : ' + S.requirements(id).length + ' exigences reliées à leur page', { min: 6 });
    notify({ type: 'analysis', tender: id, title: 'Radiographie prête : ' + name(id), body: S.def(id).pagesTotal + ' pages lues; ' + S.hardBlockers(id).length + ' bloqueur(s) détecté(s).', href: '#/dossier/' + id + '/radiographie' });
    commit();
    return { ok: true, msg: 'Documents versés. La radiographie est prête (lecture simulée dans la démo).' };
  };
  A.decide = (id, choice, reason, owner, review) => {
    if (!S.can('decide')) return deny('decide');
    if (!reason || reason.trim().length < 8) return { ok: false, msg: 'Inscrivez un motif d’au moins quelques mots : il sera conservé au journal.' };
    const d = S.D(id), prev = d.decision;
    d.decision = { choice, reason: reason.trim(), owner: owner || 'marc', review: review || U.isoDay(S.now()), at: null, by: S.state.persona };
    log(id, 'Décision : ' + LBL[choice], reason.trim() + (S.blockers(id).length ? ' · Les points ouverts restent ouverts : la décision ne les rend pas conformes.' : ''), { min: 4, diff: prev ? [LBL[prev.choice], LBL[choice]] : null });
    d.decision.at = S.nowIso();
    commit();
    return { ok: true, msg: 'Décision enregistrée : ' + LBL[choice] + '.' };
  };
  A.reopen = (id) => { if (!S.can('decide')) return deny('decide'); const d = S.D(id), prev = d.decision; d.decision = null; d.archived = false; log(id, 'Dossier rouvert', 'Décision précédente conservée au journal : ' + (prev ? prev.reason : ''), { min: 1 }); commit(); return { ok: true, msg: 'Dossier rouvert.' }; };
  A.archive = (id, on) => { const d = S.D(id); d.archived = !!on; log(id, on ? 'Dossier archivé' : 'Dossier désarchivé', '', { min: 1 }); commit(); return { ok: true, msg: on ? 'Dossier archivé : il reste consultable et peut être rouvert.' : 'Dossier rétabli.' }; };

  A.setPrice = (id, code, dollars) => {
    if (!S.can('price')) return deny('price');
    const c = Math.round(Number(dollars) * 100);
    if (!isFinite(c) || c <= 0) return { ok: false, msg: 'Entrez un prix unitaire positif, avec au plus deux décimales.' };
    const d = S.D(id), before = d.prices[code];
    if (before === c) return { ok: true, silent: true };
    const was = S.priceApproved(id);
    d.prices[code] = c; touch(id);
    const a = S.def(id).articles.find((x) => x.code === code);
    log(id, 'Prix unitaire modifié · article ' + a.n, a.label + (was ? ' · L’approbation du prix devient périmée.' : ''), { min: 2, diff: [U.cents(before), U.cents(c)] });
    commit();
    return { ok: true, msg: was ? 'Prix modifié : l’approbation précédente ne couvre plus ce bordereau.' : 'Prix unitaire mis à jour.' };
  };
  A.setCost = (id, code, dollars) => {
    if (!S.can('price')) return deny('price');
    const v = Number(dollars);
    if (!isFinite(v) || v < 0) return { ok: false, msg: 'Entrez un coût interne positif ou nul.' };
    const d = S.D(id), a = S.def(id).articles.find((x) => x.code === code);
    const before = d.costs[code] != null ? d.costs[code] / 100 : a.cost;
    if (Math.round(before * 100) === Math.round(v * 100)) return { ok: true, silent: true };
    d.costs[code] = Math.round(v * 100);
    log(id, 'Coût interne modifié · article ' + a.n, 'Privé : jamais exporté. Plancher et marges recalculés.', { min: 2, diff: [U.money(before, 2), U.money(v, 2)] });
    commit();
    return { ok: true, msg: 'Coût interne mis à jour : plancher, marge et scénarios recalculés.' };
  };
  A.setInflation = (id, k, rate) => {
    const d = S.D(id);
    d.inflation = k;
    if (rate != null && isFinite(Number(rate))) d.manualRate = Math.max(-5, Math.min(15, Number(rate)));
    log(id, 'Hypothèse d’ajustement : ' + D.indices[k].label, 'Seul le scénario ajusté change; les montants publiés restent intacts.', { min: 1 });
    commit();
    return { ok: true, msg: 'Scénario recalculé. Les montants publiés ne changent pas.' };
  };
  A.propose = (id) => {
    if (!S.can('price')) return deny('price');
    const P = S.buildProposal(id), d = S.D(id);
    d.proposal = { status: 'proposed', to: P.to, from: Object.assign({}, d.prices), ratio: P.ratio, at: S.nowIso() };
    log(id, 'Proposition de prix préparée', 'Coefficient ' + U.num(P.ratio, 4) + ' sur tous les articles · total ' + U.cents(P.before.T.htC, 0) + ' → ' + U.cents(P.after.T.htC, 0), { min: 1 });
    commit();
    return { ok: true, msg: 'Proposition prête : vérifiez-la avant de la confirmer.' };
  };
  A.confirmProposal = (id) => {
    if (!S.can('price')) return deny('price');
    const d = S.D(id), p = d.proposal;
    if (!p || p.status !== 'proposed') return { ok: false, msg: 'Aucune proposition en attente.' };
    const before = S.totals(id).htC;
    d.prices = Object.assign({}, p.to); p.status = 'applied'; p.appliedAt = S.nowIso(); touch(id);
    log(id, 'Proposition confirmée et appliquée au bordereau', 'Même coefficient sur chaque prix unitaire.', { min: 3, diff: [U.cents(before, 0), U.cents(S.totals(id).htC, 0)] });
    commit();
    return { ok: true, msg: 'Bordereau mis à jour. Il reste à faire approuver le prix.' };
  };
  A.rejectProposal = (id) => { const p = S.D(id).proposal; if (!p) return { ok: false }; p.status = 'rejected'; log(id, 'Proposition de prix rejetée', 'Vos prix unitaires restent inchangés.', { min: 1 }); commit(); return { ok: true, msg: 'Proposition rejetée : vos prix restent inchangés.' }; };
  A.approvePrice = (id) => {
    if (!S.can('approvePrice')) return deny('approvePrice');
    const T = S.totals(id);
    if (!T.lines.length || T.lines.some((l) => !l.priceC)) return { ok: false, msg: 'Chaque article doit avoir un prix unitaire.' };
    const d = S.D(id);
    d.priceApproval = { hash: S.priceHash(id), ht: T.htC, bundle: S.bundleKey(id), at: null, by: S.state.persona };
    log(id, 'Prix approuvé (approbation commerciale)', U.cents(T.htC) + ' avant taxes · marge ' + U.pct(T.margin) + ' · ' + S.bundleLabel(id), { min: 3 });
    d.priceApproval.at = S.nowIso();
    commit();
    return { ok: true, msg: 'Prix approuvé pour cette version du bordereau.' };
  };

  A.toggleProject = (id, pid) => {
    if (!S.can('forms')) return deny('forms');
    const def = S.def(id), d = S.D(id), p = S.projects().find((x) => x.id === pid);
    const t = S.projectTest(def, p);
    const sel = S.selectedProjects(id);
    if (sel.includes(pid)) { d.projects = sel.filter((x) => x !== pid); touch(id); log(id, 'Référence retirée de l’Annexe D', p.client, { min: 1 }); commit(); return { ok: true, msg: 'Référence retirée.' }; }
    if (!t.ok) return { ok: false, msg: 'Non admissible : ' + t.why.charAt(0).toLowerCase() + t.why.slice(1) + '.' };
    if (sel.length >= def.experience.count) return { ok: false, msg: 'L’Annexe D prévoit ' + def.experience.count + ' références : retirez-en une d’abord.' };
    d.projects = sel.concat(pid); touch(id); log(id, 'Référence ajoutée à l’Annexe D', p.client, { min: 1 }); commit();
    return { ok: true, msg: 'Référence ajoutée.' };
  };
  A.setRefEmail = (id, pid, v) => {
    if (!S.can('forms')) return deny('forms');
    const email = String(v || '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, msg: 'Adresse courriel invalide.' };
    const d = S.D(id), before = d.refEmails[pid];
    d.refEmails[pid] = email; touch(id);
    log(id, 'Champ saisi : courriel d’une référence', 'Valeur saisie par une personne, et non tirée du coffre-fort.', { min: 2, diff: [before || '(vide)', email || '(vide)'] });
    commit();
    return { ok: true, msg: email ? 'Courriel enregistré comme valeur saisie par vous.' : 'Champ vidé.' };
  };
  A.verifyAnnex = (id, aid) => {
    if (!S.can('forms')) return deny('forms');
    const a = S.annexes(id).find((x) => x.id === aid);
    if (!a) return { ok: false };
    S.D(id).verified[aid] = { hash: a.hash, at: S.nowIso(), by: S.state.persona };
    log(id, 'Champs revus · ' + a.title, a.prefilled + ' champ(s) pré-rempli(s) confirmé(s)', { min: 2 });
    commit();
    return { ok: true, msg: a.prefilled + ' champs confirmés pour ' + a.title.split(' · ')[0] + '.' };
  };
  A.verifyAll = (id) => {
    if (!S.can('forms')) return deny('forms');
    const list = S.annexes(id).filter((a) => !a.verified);
    list.forEach((a) => { S.D(id).verified[a.id] = { hash: a.hash, at: S.nowIso(), by: S.state.persona }; });
    log(id, 'Champs revus · ' + list.length + ' annexe(s)', list.map((a) => a.title.split(' · ')[0]).join(', '), { min: 6 });
    commit();
    return { ok: true, msg: list.length + ' annexe(s) confirmée(s).' };
  };
  A.confirm = (id, key) => {
    const r = S.requirements(id).find((x) => x.rule && x.rule.key === key);
    S.D(id).confirmations[key] = { at: S.nowIso(), by: S.state.persona }; touch(id);
    log(id, 'Point de capacité confirmé', r ? r.title + ' · ' + r.rule.done : key, { min: 3 });
    commit();
    return { ok: true, msg: 'Point confirmé et noté au dossier.' };
  };
  A.visitAssign = (id, who) => { const d = S.D(id); d.visitAttendee = who; log(id, 'Participant assigné à la visite', S.actorName(who), { min: 1 }); commit(); return { ok: true, msg: S.actorName(who) + ' assiste à la visite. Un rappel apparaîtra 48 h avant.' }; };
  A.visitUpload = (id, file) => {
    const def = S.def(id);
    if (!def.visit) return { ok: false };
    if (S.nowTs() < Date.parse(def.visit.at)) return { ok: false, msg: 'La visite a lieu le ' + U.dayTime(def.visit.at) + ' : l’attestation est remise sur place. Avancez l’horloge dans le Labo de test.' };
    return A.vaultAdd({ kind: 'visit', tender: id, title: 'Attestation de visite · ' + def.buyerShort, issuer: def.buyer, issued: def.visit.at ? U.isoDay(def.visit.at) : U.isoDay(S.now()), expires: '', file }, true);
  };

  A.bond = (id, step) => {
    const d = S.D(id), b = d.bond, T = S.totals(id), def = S.def(id);
    if (step === 'propose') { if (!S.can('bond')) return deny('bond'); d.bond = { status: 'proposed', cap: S.bondCap(T.bondC), required: T.bondC }; log(id, 'Demande de garantie proposée', 'Destinataire : ' + D.surety.contact + ', ' + D.surety.broker + ' · plafond proposé ' + U.money(S.bondCap(T.bondC)), { min: 2 }); }
    else if (step === 'confirm') { if (!S.can('decide')) return deny('decide'); if (b.status !== 'proposed') return { ok: false }; b.status = 'confirmed'; b.confirmedBy = S.state.persona; log(id, 'Demande de garantie confirmée', 'Données partagées : référence de l’appel, bénéficiaire, montant, échéance. États financiers non partagés.', { min: 2 }); }
    else if (step === 'execute') { if (b.status !== 'confirmed') return { ok: false }; b.status = 'requested'; b.sentAt = S.nowIso(); log(id, 'Demande de garantie enregistrée (envoi simulé)', 'Aucun courriel réel n’est envoyé. Clé de déduplication ' + U.sha256('bond|' + def.ref + '|' + b.cap).slice(0, 10), { min: 2 }); }
    else if (step === 'issued') { if (b.status !== 'requested') return { ok: false }; b.status = 'issued'; b.issuedAt = S.nowIso(); touch(id); log(id, 'Garantie de soumission reçue (simulation)', 'Lettre d’engagement de ' + D.surety.broker + ' jusqu’à ' + U.money(b.cap) + '; bénéficiaire : ' + def.buyer + '.', { min: 6 }); notify({ type: 'bond', tender: id, title: 'Lettre du courtier reçue : ' + name(id), body: 'Garantie jusqu’à ' + U.money(b.cap) + '.', href: '#/dossier/' + id + '/revue' }); }
    else if (step === 'redo') { d.bond = { status: 'proposed', cap: S.bondCap(T.bondC), required: T.bondC }; log(id, 'Nouvelle demande de garantie proposée', 'Le montant requis dépasse la garantie émise.', { min: 2 }); }
    else if (step === 'cancel') { d.bond = { status: 'none' }; log(id, 'Demande de garantie retirée', '', { min: 1 }); }
    commit();
    return { ok: true, msg: { propose: 'Demande proposée : vérifiez le destinataire et les données.', confirm: 'Confirmée. Il reste à exécuter l’envoi.', execute: 'Envoi simulé enregistré : aucun courriel réel n’est parti.', issued: 'Garantie enregistrée au dossier.', redo: 'Nouvelle demande proposée.', cancel: 'Demande retirée.' }[step] };
  };
  A.toggleDecl = (id, k) => { if (!S.can('sign')) return deny('sign'); const d = S.D(id); if (d.declSigned) return { ok: false, msg: 'Déclaration déjà signée. Une modification exigerait une nouvelle signature.' }; d.decl[k] = !d.decl[k]; commit(); return { ok: true, silent: true }; };
  A.signDecl = (id) => {
    if (!S.can('sign')) return deny('sign');
    const d = S.D(id), n = (S.def(id).declItems || []).length;
    for (let i = 1; i <= n; i++) if (!d.decl['d' + i]) return { ok: false, msg: 'Lisez et cochez les ' + n + ' déclarations avant de signer.' };
    d.declSigned = { at: null, by: S.state.persona }; touch(id);
    log(id, 'Annexe C signée (simulation)', 'Intention de signer enregistrée; aucune signature stockée n’est apposée automatiquement.', { min: 3 });
    d.declSigned.at = S.nowIso(); commit();
    return { ok: true, msg: 'Déclaration signée (simulation).' };
  };
  A.ack = (id, addId) => {
    if (!S.can('sign')) return deny('sign');
    const d = S.D(id), a = S.allAddenda(id).find((x) => x.id === addId);
    d.ack[addId] = { at: null, by: S.state.persona }; touch(id);
    log(id, 'Accusé de réception signé · ' + a.label.toLowerCase(), 'Formulaire joint au paquet (signature simulée).', { min: 2 });
    d.ack[addId].at = S.nowIso(); commit();
    return { ok: true, msg: 'Accusé de réception de l’' + a.label.toLowerCase() + ' signé.' };
  };
  A.approvePackage = (id) => {
    if (!S.can('approvePackage')) return deny('approvePackage');
    const b = S.blockers(id);
    if (b.length) return { ok: false, msg: b.length + ' point(s) bloquent encore l’approbation : ' + b.map((x) => x.label).join(', ') + '.' };
    if (S.nowTs() > Date.parse(S.close(id))) return { ok: false, msg: 'La clôture est passée : SEAO n’accepte plus de dépôt.' };
    const d = S.D(id);
    d.packageApproval = { hash: S.packageHash(id), rev: d.rev, at: null, by: S.state.persona, bundle: S.bundleKey(id) };
    log(id, 'Paquet approuvé · version de travail ' + d.rev, 'Empreinte ' + S.packageHash(id).slice(0, 12) + ' · ' + S.bundleLabel(id), { min: 3 });
    d.packageApproval.at = S.nowIso(); commit();
    return { ok: true, msg: 'Version ' + d.rev + ' approuvée. Export possible après le contrôle final.' };
  };

  /* ---------- addenda (publication scénarisée, injectée ou générée) ---------- */
  A.publishAddendum = (id, addId, actor) => {
    const d = S.D(id);
    let a = addId ? S.allAddenda(id).find((x) => x.id === addId) : S.pendingAddenda(id)[0];
    if (!a) {
      const n = S.allAddenda(id).length + 1;
      const first = S.articles(id)[0];
      const to = first ? Math.round(S.qtyOf(id, first) * 1.1 * 10) / 10 : 0;
      a = { id: 'gen' + n, n, label: 'Addenda n° ' + n, pages: 1, generated: true, summary: (first ? 'Article ' + first.n + ' : ' + U.num(S.qtyOf(id, first), first.decimals || 0) + ' → ' + U.num(to, first.decimals || 0) + ' ' + first.unit + '. ' : '') + 'Clôture inchangée.',
        changes: first ? [{ type: 'qty', code: first.code, to }] : [],
        pageDefs: [{ n: 1, blocks: [{ t: 'kicker', x: 'Addenda n° ' + n + ' · ' + S.def(id).ref + ' (généré par le Labo de test)' }, { t: 'clause', id: 'c-gen' + n + '-qty', x: first ? '1. Article ' + first.n + ' du bordereau (' + first.label.toLowerCase() + ') : la quantité passe à ' + U.num(to, first.decimals || 0) + ' ' + first.unit + '. Le bordereau joint remplace le précédent.' : '1. Précisions administratives.' }, { t: 'clause', id: 'c-gen' + n + '-ack', x: '2. ' + TS.CL.ack(n) + ' 3. La date et l’heure limites demeurent inchangées.' }] }] };
      d.extraAddenda.push(a);
    }
    if (d.addenda.includes(a.id)) return { ok: false, msg: 'Addenda déjà publié.' };
    const before = S.totals(id), hadPrice = S.priceApproved(id), hadPkg = S.packageApproved(id), closeBefore = S.close(id);
    a.publishedAt = S.nowIso();
    d.addenda.push(a.id); touch(id);
    const after = S.totals(id);
    const closeMoved = S.close(id) !== closeBefore;
    log(id, a.label + ' publié', a.summary + (hadPrice ? ' Approbation du prix périmée.' : '') + (hadPkg ? ' Approbation du paquet périmée.' : '') + ' Accusé de réception requis.' + (closeMoved ? ' Échéances et rappels déplacés.' : ''), { min: 2, actor: actor || 'source', diff: before.htC !== after.htC ? [U.cents(before.htC, 0), U.cents(after.htC, 0)] : closeMoved ? [U.dayTime(closeBefore), U.dayTime(S.close(id))] : null });
    notify({ type: 'addendum', tender: id, title: a.label + ' · ' + name(id), body: a.summary + (hadPkg ? ' L’approbation du paquet est périmée.' : ''), href: '#/dossier/' + id + '/revue' });
    commit();
    return { ok: true, addendum: a, before, after, hadPrice, hadPkg, closeMoved, msg: a.label + ' publié pour ' + name(id) + '.' };
  };

  /* Contrôle pré-export : revérifie SEAO, les attestations et les approbations juste avant l’export */
  A.preExportCheck = (id) => {
    const d = S.D(id);
    if (S.state.caps.offline && !d.manualCheck) { log(id, 'Contrôle pré-export : SEAO injoignable', 'Surveillance des addenda interrompue. Vérification manuelle requise avant l’export.', { min: 1, actor: 'system' }); notify({ type: 'system', tender: id, title: 'Vérification manuelle requise : ' + name(id), body: 'SEAO injoignable : consultez l’avis sur SEAO avant d’exporter.', href: '#/dossier/' + id + '/revue' }); commit(); return { ok: false, offline: true }; }
    const auto = S.pendingAddenda(id).find((a) => a.auto === 'precheck');
    if (auto && !S.state.caps.offline) { const r = A.publishAddendum(id, auto.id, 'source'); S.state.log[S.state.log.length - 1].what = auto.label + ' détecté avant l’export'; commit(); return Object.assign({ ok: false, addenda: true }, r); }
    const b = S.blockers(id);
    if (b.length || !S.packageApproved(id)) { commit(); return { ok: false, blockers: b }; }
    log(id, 'Contrôle pré-export réussi', (d.manualCheck ? 'Vérification manuelle de SEAO notée à ' + U.time(d.manualCheck.at) : 'Aucun nouvel addenda') + '; attestations valides à la clôture; approbations à jour.', { min: 1, actor: 'system' });
    commit();
    return { ok: true };
  };
  A.manualCheck = (id) => { const d = S.D(id); d.manualCheck = { at: S.nowIso(), by: S.state.persona }; log(id, 'Vérification manuelle de SEAO', 'Exception documentée : aucun nouvel addenda constaté sur le portail.', { min: 4 }); commit(); return { ok: true, msg: 'Vérification manuelle notée : l’export peut reprendre.' }; };
  A.recordExport = (id, kind) => {
    const d = S.D(id), hash = S.packageHash(id);
    const entry = { kind, hash, rev: d.rev, at: null, by: S.state.persona, bundle: S.bundleKey(id), blockers: kind === 'draft' ? S.blockers(id).map((b) => b.label) : [] };
    log(id, kind === 'approved' ? 'Paquet exporté (manifeste interne)' : 'Brouillon exporté avec avertissements', kind === 'approved' ? 'Version ' + d.rev + ' · empreinte ' + hash.slice(0, 12) + '. Exporté ne veut pas dire déposé.' : entry.blockers.length + ' point(s) non résolu(s) listés dans le brouillon.', { min: 1 });
    entry.at = S.nowIso();
    d.exports.push(entry);
    commit();
    return entry;
  };
  A.recordReceipt = (id, number, when) => {
    if (!S.can('receipt')) return deny('receipt');
    if (!S.exportedCurrent(id)) return { ok: false, msg: 'Exportez d’abord le paquet approuvé de la version actuelle.' };
    if (!number || number.trim().length < 4) return { ok: false, msg: 'Inscrivez le numéro de confirmation affiché par SEAO.' };
    const ts = when ? Date.parse(when) : S.nowTs();
    if (ts > Date.parse(S.close(id))) return { ok: false, msg: 'Ce reçu est postérieur à la clôture du ' + U.dayTime(S.close(id)) + ' : SEAO l’aurait refusé.' };
    const d = S.D(id);
    d.receipt = { number: number.trim(), when: new Date(ts).toISOString(), rev: d.rev, hash: S.packageHash(id), at: null };
    log(id, 'Reçu officiel enregistré · dossier déposé', 'Numéro ' + number.trim() + ' · le statut Déposé repose sur ce reçu saisi, pas sur l’export.', { min: 2 });
    d.receipt.at = S.nowIso(); commit();
    return { ok: true, msg: 'Reçu enregistré : le dossier est maintenant « Déposé ».' };
  };

  /* ---------- résultats d’ouverture → historique (boucle d’apprentissage) ---------- */
  A.recordResults = (id, bids, source) => {
    const def = S.def(id), d = S.D(id);
    if (!d.receipt) return { ok: false, msg: 'Enregistrez d’abord le reçu de dépôt.' };
    if (S.nowTs() < Date.parse(S.opening(id))) return { ok: false, msg: 'L’ouverture publique a lieu le ' + U.dayTime(S.opening(id)) + '. Avancez l’horloge dans le Labo de test.' };
    const clean = (bids || []).filter((b) => b.firm && b.amount > 0);
    if (clean.length < 2) return { ok: false, msg: 'Inscrivez au moins deux soumissions, dont la vôtre.' };
    const sorted = clean.slice().sort((a, b) => a.amount - b.amount).map((b) => Object.assign({ status: 'conform' }, b));
    const firstConform = sorted.find((b) => b.status !== 'nonconform');
    if (firstConform) firstConform.status = 'winner';
    const qtys = {}, refs = {};
    S.lines(id).forEach((l) => { qtys[l.a.code] = l.qty; refs[l.a.code] = l.a.ref; });
    const op = { id: S.nextId('op'), tender: id, family: def.family, buyer: def.buyer, ref: def.ref, year: 2026, openedAt: S.opening(id), opened: U.dayTime(S.opening(id)), cpi: D.cpiNow, composite: 1, seasons: def.seasons, qtys, refs, bids: sorted, source: source === 'event' ? 'Résultats d’ouverture publiés sur SEAO (simulation)' : 'Résultats saisis par vous', retrieved: 'Enregistré le ' + U.dayTime(S.now()), note: 'Conformité à confirmer par le donneur d’ouvrage. Ajouté à l’historique de ' + def.buyer + '.' };
    S.state.openings = S.state.openings.filter((o) => o.tender !== id).concat(op);
    d.results = op.id;
    const you = sorted.find((b) => b.you), rank = sorted.filter((b) => b.status !== 'nonconform').indexOf(you) + 1;
    log(id, 'Résultats d’ouverture enregistrés', sorted.length + ' soumissions; vous êtes ' + (rank === 1 ? '1er' : rank + 'e') + (rank > 1 ? ', à ' + U.signedPct((you.amount - sorted[0].amount) / sorted[0].amount) + ' du plus bas' : '') + '. L’oracle des dossiers semblables en tient compte.', { min: 3, actor: source === 'event' ? 'source' : S.state.persona });
    notify({ type: 'results', tender: id, title: 'Résultats d’ouverture : ' + name(id), body: 'Vous êtes ' + (rank === 1 ? '1er' : rank + 'e') + ' sur ' + sorted.length + '. Historique mis à jour pour les dossiers du même acheteur.', href: '#/dossier/' + id + '/revue' });
    commit();
    return { ok: true, rank, msg: 'Résultats enregistrés : vous êtes ' + (rank === 1 ? '1er' : rank + 'e') + ' sur ' + sorted.length + '.' };
  };
  A.publishResults = (id) => {
    const def = S.def(id), d = S.D(id);
    if (!d.receipt) return { ok: false, msg: name(id) + ' n’est pas déposé : aucun résultat à publier.' };
    if (S.nowTs() < Date.parse(S.opening(id))) return { ok: false, msg: 'L’ouverture a lieu le ' + U.dayTime(S.opening(id)) + ' : avancez l’horloge d’abord.' };
    const T = S.totals(id);
    const basket = T.lines.reduce((s, l) => s + l.qty * (l.a.ref || 0), 0) || T.htC / 100;
    const bids = (def.resultFactors || [['Concurrent A inc.', 0.985], ['Concurrent B inc.', 1.032], ['Concurrent C inc.', 1.071]]).map(([firm, f]) => ({ firm, amount: Math.round(basket * f) }));
    bids.push({ firm: D.company.legalName, amount: T.htC / 100, you: true });
    return A.recordResults(id, bids, 'event');
  };
  A.outcome = (id, kind) => {
    const d = S.D(id);
    if (!d.results && kind !== 'cancelled') return { ok: false, msg: 'Enregistrez d’abord les résultats d’ouverture.' };
    d.outcome = { kind, at: S.nowIso(), by: S.state.persona };
    log(id, 'Issue enregistrée : ' + S.stageLabel(kind), kind === 'awarded' ? 'Garantie d’exécution et avenant d’assurance à fournir.' : kind === 'lost' ? 'Leçons à noter pour le prochain cycle.' : 'Appel d’offres annulé par le donneur d’ouvrage.', { min: 2 });
    commit();
    return { ok: true, msg: 'Issue enregistrée : ' + S.stageLabel(kind) + '.' };
  };

  /* ---------- questions au donneur d’ouvrage ---------- */
  A.questionSave = (id, q) => {
    const def = S.def(id), d = S.D(id);
    const text = String(q.text || '').trim();
    if (text.length < 15) return { ok: false, msg: 'La question est trop courte.' };
    if (def.questionsDeadline && S.nowTs() > Date.parse(def.questionsDeadline)) return { ok: false, msg: 'La date limite des questions (' + U.dayTime(def.questionsDeadline) + ') est passée.' };
    if (q.id) { const x = d.questions.find((y) => y.id === q.id); if (!x) return { ok: false }; if (x.sentAt) return { ok: false, msg: 'Question déjà envoyée : elle n’est plus modifiable.' }; x.text = text; log(id, 'Question modifiée', text.slice(0, 90), { min: 1 }); }
    else d.questions.push({ id: S.nextId('q'), text, req: q.req || null, provenance: q.provenance || 'Règles', at: S.nowIso(), by: S.state.persona, sentAt: null, answer: null });
    if (!q.id) log(id, 'Question rédigée', text.slice(0, 90) + (text.length > 90 ? '…' : ''), { min: 2 });
    commit();
    return { ok: true, msg: q.id ? 'Question modifiée.' : 'Question enregistrée en brouillon. Envoyez-la quand elle est prête.' };
  };
  A.questionSend = (id, qid) => {
    const d = S.D(id), x = d.questions.find((y) => y.id === qid), def = S.def(id);
    if (!x) return { ok: false };
    if (def.questionsDeadline && S.nowTs() > Date.parse(def.questionsDeadline)) return { ok: false, msg: 'La date limite des questions est passée.' };
    x.sentAt = S.nowIso();
    log(id, 'Question envoyée au responsable (envoi simulé)', x.text.slice(0, 90), { min: 2 });
    commit();
    return { ok: true, msg: 'Question envoyée (simulation). La réponse sera publiée en addenda à tous les preneurs.' };
  };
  A.questionDelete = (id, qid) => { const d = S.D(id); const x = d.questions.find((y) => y.id === qid); if (!x) return { ok: false }; if (x.sentAt) return { ok: false, msg: 'Une question envoyée ne peut pas être retirée.' }; S.snapshot('Question supprimée'); d.questions = d.questions.filter((y) => y.id !== qid); log(id, 'Question supprimée', x.text.slice(0, 60), { min: 1 }); commit(); return { ok: true, undo: true, msg: 'Question supprimée.' }; };
  A.answerQuestion = (id) => {
    const d = S.D(id), x = d.questions.find((y) => y.sentAt && !y.answer);
    if (!x) return { ok: false, msg: 'Aucune question envoyée en attente de réponse pour ' + name(id) + '.' };
    const n = S.allAddenda(id).length + 1;
    x.answer = { at: S.nowIso(), text: 'Le donneur d’ouvrage confirme que les exigences du devis demeurent inchangées; la précision demandée est apportée à tous les preneurs.' };
    const a = { id: 'qa' + n, n, label: 'Addenda n° ' + n, pages: 1, generated: true, summary: 'Réponse à votre question : exigences inchangées. Accusé de réception requis.', changes: [],
      pageDefs: [{ n: 1, blocks: [{ t: 'kicker', x: 'Addenda n° ' + n + ' · ' + S.def(id).ref + ' · réponses aux questions' }, { t: 'clause', id: 'c-qa' + n + '-qty', x: 'Question : « ' + x.text + ' » Réponse : ' + x.answer.text }, { t: 'clause', id: 'c-qa' + n + '-ack', x: TS.CL.ack(n) }] }] };
    d.extraAddenda.push(a);
    return A.publishAddendum(id, a.id, 'source');
  };

  /* ---------- appels d’offres créés par vous ---------- */
  A.createTender = (def) => {
    if (!S.can('tender')) return deny('tender');
    if (!def.title || !def.buyer) return { ok: false, msg: 'Le titre et l’organisme sont obligatoires.' };
    if (!def.close || !isFinite(Date.parse(def.close))) return { ok: false, msg: 'La date et l’heure de clôture sont obligatoires.' };
    if (Date.parse(def.close) <= S.nowTs()) return { ok: false, msg: 'La clôture doit être dans le futur (horloge de démo : ' + U.dayTime(S.now()) + ').' };
    const id = S.nextId('cu');
    def.id = id; def.custom = true;
    S.state.custom[id] = def;
    const d = S.D(id);
    d.xrayOpened = true;
    log(id, 'Appel d’offres ajouté au radar', def.source && def.source.kind === 'ai' ? 'Analyse par IA en direct, citations vérifiées dans le texte.' : 'Extraction par règles à partir du texte ' + (def.source && def.source.name ? '(' + def.source.name + ')' : 'collé') + '.', { min: 3 });
    notify({ type: 'analysis', tender: id, title: 'Nouveau dossier : ' + def.buyerShort, body: def.requirements.length + ' exigences extraites; clôture le ' + U.dayTime(def.close) + '.', href: '#/dossier/' + id + '/radiographie' });
    commit();
    return { ok: true, id, msg: 'Dossier créé. Il suit le même parcours que les autres.' };
  };
  A.updateTender = (id, patch) => {
    const def = S.state.custom[id];
    if (!def) return { ok: false, msg: 'Seuls les dossiers que vous avez créés sont modifiables; les autres proviennent de SEAO.' };
    if (patch.close && (!isFinite(Date.parse(patch.close)) || Date.parse(patch.close) <= S.nowTs())) return { ok: false, msg: 'La clôture doit être une date future.' };
    if (patch.bondRate != null && (patch.bondRate < 0 || patch.bondRate > 0.5)) return { ok: false, msg: 'Taux de garantie invalide.' };
    const before = { title: def.title, close: def.close };
    Object.assign(def, patch);
    if (patch.close) def.opening = patch.opening || new Date(Date.parse(patch.close) + 5 * 60000).toISOString();
    touch(id);
    log(id, 'Dossier modifié', Object.keys(patch).join(', '), { min: 2, diff: patch.close ? [U.dayTime(before.close), U.dayTime(def.close)] : null });
    commit();
    return { ok: true, msg: 'Dossier mis à jour.' };
  };
  A.deleteTender = (id) => {
    if (!S.state.custom[id]) return { ok: false, msg: 'Les dossiers provenant de SEAO ne se suppriment pas : archivez-les.' };
    S.snapshot('Dossier supprimé');
    const t = S.state.custom[id];
    delete S.state.custom[id]; delete S.state.dossiers[id];
    S.state.inbox = S.state.inbox.filter((n) => n.tender !== id);
    log(null, 'Dossier supprimé', t.buyerShort + ' · ' + t.title, { min: 1 });
    commit();
    return { ok: true, undo: true, msg: 'Dossier supprimé.' };
  };
  A.lineSave = (id, line) => {
    const def = S.state.custom[id];
    if (!def) return { ok: false, msg: 'Les articles des avis SEAO sont fixés par le bordereau officiel.' };
    if (!S.can('price')) return deny('price');
    const qty = Number(line.qty), price = Number(line.price), cost = Number(line.cost);
    if (!line.label || line.label.trim().length < 3) return { ok: false, msg: 'Décrivez l’article.' };
    if (!(qty > 0) || !(price > 0) || !(cost >= 0)) return { ok: false, msg: 'Quantité et prix doivent être positifs.' };
    const d = S.D(id);
    if (line.code) {
      const a = def.articles.find((x) => x.code === line.code);
      Object.assign(a, { label: line.label.trim(), unit: line.unit || 'unité', qty, cost });
      d.prices[a.code] = Math.round(price * 100);
      log(id, 'Article modifié · ' + a.n, a.label, { min: 1 });
    } else {
      const code = 'l' + (def.articles.length + 1) + '-' + S.state.seq;
      def.articles.push({ code, n: def.articles.length + 1, label: line.label.trim(), unit: line.unit || 'unité', qty, cost, price, ref: null, decimals: qty % 1 ? 1 : 0, custom: true });
      d.prices[code] = Math.round(price * 100);
      log(id, 'Article ajouté au bordereau', line.label.trim(), { min: 1 });
    }
    touch(id); commit();
    return { ok: true, msg: 'Bordereau mis à jour.' };
  };
  A.lineDelete = (id, code) => {
    const def = S.state.custom[id];
    if (!def) return { ok: false };
    if (def.articles.length <= 1) return { ok: false, msg: 'Le bordereau doit garder au moins un article.' };
    S.snapshot('Article supprimé');
    const a = def.articles.find((x) => x.code === code);
    def.articles = def.articles.filter((x) => x.code !== code).map((x, i) => Object.assign(x, { n: i + 1 }));
    delete S.D(id).prices[code];
    touch(id);
    log(id, 'Article supprimé du bordereau', a ? a.label : code, { min: 1 });
    commit();
    return { ok: true, undo: true, msg: 'Article supprimé.' };
  };

  /* ---------- coffre-fort ---------- */
  const kindLabel = (k) => (D.vaultKinds.find((x) => x[0] === k) || [k, k])[1];
  const affected = (kind) => S.tenders().filter((t) => S.isOpen(t.id) && S.requirements(t.id).some((r) => r.rule && (r.rule.kind === kind || r.rule.type === kind || (kind === 'insurance' && r.rule.type === 'insurance') || (kind === 'rbq' && r.rule.type === 'rbq'))));
  A.vaultAdd = (doc, skipPerm) => {
    if (!skipPerm && !S.can('vault')) return deny('vault');
    if (!doc.kind) return { ok: false, msg: 'Choisissez le type de pièce.' };
    if (doc.issued && Date.parse(doc.issued + 'T12:00:00-04:00') > S.nowTs() + DAYMS) return { ok: false, msg: 'La date de délivrance ne peut pas être dans le futur.' };
    if (doc.expires && doc.issued && doc.expires <= doc.issued) return { ok: false, msg: 'La fin de validité doit suivre la date de délivrance.' };
    if (doc.kind === 'insurance' && !(Number(doc.amount) > 0)) return { ok: false, msg: 'Indiquez le montant de la couverture.' };
    if (['bondcheque', 'bondletter'].includes(doc.kind) && !(Number(doc.amount) > 0)) return { ok: false, msg: 'Indiquez le montant de la garantie.' };
    const v = { id: S.nextId('v'), kind: doc.kind, tender: doc.tender || undefined, title: (doc.title || kindLabel(doc.kind)).trim(), issuer: doc.issuer || '—', issued: doc.issued || U.isoDay(S.now()), expires: doc.expires || null, indefinite: !!doc.indefinite, amount: doc.amount ? Number(doc.amount) : undefined, cats: doc.cats || undefined, owner: S.state.persona, sensitivity: doc.sensitivity || 'public', file: doc.file ? doc.file.name : kindLabel(doc.kind).replace(/\W+/g, '_') + '.pdf', size: doc.file ? doc.file.size : 0, hash: doc.file ? doc.file.hash : null, sample: doc.file && doc.file.sample, verified: 'Versée le ' + U.dayTime(S.now()) + ' par ' + S.actorName(S.state.persona), versions: [] };
    if (v.kind === 'amp' || v.kind === 'rena') { v.checkedAt = S.nowIso(); v.reviewDays = 14; }
    S.state.vault.push(v);
    const aff = affected(v.kind);
    log(null, 'Pièce ajoutée au coffre-fort : ' + v.title, v.file + (v.hash ? ' · empreinte ' + v.hash.slice(0, 12) : '') + (aff.length ? ' · ' + aff.length + ' dossier(s) recalculé(s)' : ''), { min: 3 });
    commit();
    return { ok: true, id: v.id, msg: 'Pièce ajoutée. ' + (aff.length ? 'Conformité recalculée pour ' + aff.map((t) => t.buyerShort).join(', ') + '.' : '') };
  };
  const DAYMS = 86400000;
  A.vaultReplace = (vid, patch) => {
    if (!S.can('vault')) return deny('vault');
    const v = S.state.vault.find((x) => x.id === vid);
    if (!v) return { ok: false };
    if (patch.expires && patch.issued && patch.expires <= patch.issued) return { ok: false, msg: 'La fin de validité doit suivre la date de délivrance.' };
    if (!patch.expires && !v.indefinite && v.expires) return { ok: false, msg: 'Indiquez la fin de validité inscrite sur la nouvelle pièce.' };
    v.versions = v.versions || [];
    v.versions.push({ file: v.file, issued: v.issued, expires: v.expires, hash: v.hash || null, replacedAt: S.nowIso() });
    const before = v.expires;
    Object.assign(v, { file: patch.file ? patch.file.name : v.file, size: patch.file ? patch.file.size : v.size, hash: patch.file ? patch.file.hash : v.hash, sample: patch.file && patch.file.sample, issued: patch.issued || U.isoDay(S.now()), expires: patch.expires || v.expires, revoked: null, verified: 'Nouvelle version versée le ' + U.dayTime(S.now()) + ' par ' + S.actorName(S.state.persona) });
    if (v.checkedAt) v.checkedAt = S.nowIso();
    const aff = affected(v.kind);
    log(null, v.title + ' remplacée (version ' + (v.versions.length + 1) + ')', v.file + (v.hash ? ' · empreinte ' + v.hash.slice(0, 12) : '') + ' · ' + aff.length + ' dossier(s) recalculé(s)', { min: 4, diff: before !== v.expires ? ['Valide jusqu’au ' + (before || '—'), 'Valide jusqu’au ' + (v.expires || '—')] : null });
    commit();
    return { ok: true, msg: 'Nouvelle version versée : la précédente reste dans l’historique. ' + (aff.length ? 'Recalculé pour ' + aff.map((t) => t.buyerShort).join(', ') + '.' : '') };
  };
  A.vaultUpdate = (vid, patch) => {
    if (!S.can('vault')) return deny('vault');
    const v = S.state.vault.find((x) => x.id === vid);
    if (!v) return { ok: false };
    if (patch.title != null && patch.title.trim().length < 3) return { ok: false, msg: 'Titre trop court.' };
    if (patch.expires && (patch.issued || v.issued) && patch.expires <= (patch.issued || v.issued)) return { ok: false, msg: 'La fin de validité doit suivre la date de délivrance.' };
    Object.assign(v, patch);
    log(null, 'Fiche du coffre-fort modifiée : ' + v.title, Object.keys(patch).join(', '), { min: 2 });
    commit();
    return { ok: true, msg: 'Fiche mise à jour.' };
  };
  A.vaultRemove = (vid) => {
    if (!S.can('vault')) return deny('vault');
    const v = S.state.vault.find((x) => x.id === vid);
    if (!v) return { ok: false };
    S.snapshot('Pièce retirée');
    v.removed = { at: S.nowIso(), by: S.state.persona };
    const aff = affected(v.kind);
    log(null, 'Pièce retirée du coffre-fort : ' + v.title, aff.length ? aff.length + ' dossier(s) n’ont plus cette pièce.' : '', { min: 1 });
    commit();
    return { ok: true, undo: true, msg: 'Pièce retirée. ' + (aff.length ? 'Conformité recalculée pour ' + aff.length + ' dossier(s).' : '') };
  };
  A.vaultRevoke = (vid, reason, actor) => {
    const v = S.state.vault.find((x) => x.id === vid);
    if (!v) return { ok: false };
    v.revoked = { at: S.nowIso(), reason: reason || 'retirée par l’organisme émetteur' };
    const aff = affected(v.kind);
    log(null, v.title + ' révoquée', v.revoked.reason + ' · ' + aff.length + ' dossier(s) bloqué(s)', { min: 2, actor: actor || 'source' });
    notify({ type: 'revoked', title: v.title + ' révoquée', body: v.revoked.reason + '. ' + (aff.length ? 'Bloque : ' + aff.map((t) => t.buyerShort).join(', ') + '.' : ''), href: '#/coffre' });
    commit();
    return { ok: true, msg: v.title + ' révoquée : ' + aff.length + ' dossier(s) bloqué(s).' };
  };
  A.vaultRecheck = (vid) => {
    if (!S.can('vault')) return deny('vault');
    const v = S.state.vault.find((x) => x.id === vid);
    if (!v) return { ok: false };
    if (S.state.caps.registryDown) return { ok: false, msg: 'Le registre est indisponible (Labo de test) : le résultat reste « Non vérifié ».' };
    if (v.revoked) return { ok: false, msg: 'Le registre confirme la révocation : remplacez la pièce.' };
    v.checkedAt = S.nowIso();
    v.verified = 'Statut vérifié manuellement le ' + U.dayTime(S.now()) + ' par ' + S.actorName(S.state.persona);
    log(null, 'Vérification manuelle au registre : ' + v.title, 'Résultat : statut valide.', { min: 3 });
    commit();
    return { ok: true, msg: 'Vérification enregistrée. Prochaine revérification dans ' + (v.reviewDays || 14) + ' jours.' };
  };

  /* ---------- projets de référence ---------- */
  A.projectSave = (p) => {
    if (!S.can('forms')) return deny('forms');
    if (!p.client || p.client.trim().length < 3) return { ok: false, msg: 'Indiquez le client.' };
    if (!p.object || p.object.trim().length < 3) return { ok: false, msg: 'Décrivez l’objet du contrat.' };
    if (!p.start || !p.end || p.end < p.start) return { ok: false, msg: 'La date de fin doit suivre la date de début.' };
    if (!(Number(p.value) > 0)) return { ok: false, msg: 'Indiquez la valeur du contrat avant taxes.' };
    if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) return { ok: false, msg: 'Courriel de référence invalide.' };
    const clean = { trade: p.trade, client: p.client.trim(), object: p.object.trim(), start: p.start, end: p.end, value: Number(p.value), km: Number(p.km) || 0, m2: Number(p.m2) || 0, sites: Number(p.sites) || 0, contact: (p.contact || '').trim(), email: (p.email || '').trim() };
    if (p.id) { const x = S.state.projects.find((y) => y.id === p.id); Object.assign(x, clean); log(null, 'Projet de référence modifié', clean.client + ' · ' + clean.object, { min: 2 }); }
    else { clean.id = S.nextId('p'); clean.created = true; S.state.projects.push(clean); log(null, 'Projet de référence ajouté', clean.client + ' · ' + clean.object + ' · ' + U.money(clean.value), { min: 2 }); }
    commit();
    return { ok: true, msg: p.id ? 'Projet mis à jour.' : 'Projet ajouté : il est proposé aux annexes D où il répond aux critères.' };
  };
  A.projectRemove = (pid) => {
    if (!S.can('forms')) return deny('forms');
    const x = S.state.projects.find((y) => y.id === pid);
    if (!x) return { ok: false };
    S.snapshot('Projet retiré');
    x.removed = { at: S.nowIso() };
    log(null, 'Projet de référence retiré', x.client + ' · ' + x.object, { min: 1 });
    commit();
    return { ok: true, undo: true, msg: 'Projet retiré des références.' };
  };
})();
