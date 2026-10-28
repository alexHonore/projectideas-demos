/* Écran : revue (proposer → confirmer → exécuter), paquet, export, reçu, résultats d’ouverture et issue. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S, UI = TS.UI;
  const esc = U.esc, ic = U.icon;
  const V = (TS.V = TS.V || {});

  /* Une ligne par proposition : état, titre, responsable, ⓘ et action; le détail s’ouvre au besoin */
  const STEP = ['Proposé', 'Confirmé', 'Exécuté'];
  const card = (cid, title, who, n, tip, actions, state, more) => `<article class="acard acard-${state || 'open'}" data-card="${cid}" aria-labelledby="ac-${cid}">
    <span class="acard-s" title="${state === 'done' ? 'Exécuté' : esc(STEP.map((l, i) => (i === n ? '› ' : '') + l).join(' → '))}">${state === 'done' ? ic('check', 16) : `<b>${Math.min(n, 2) + 1}</b>/3`}<span class="sr">${state === 'done' ? 'Exécuté' : 'Étape ' + (Math.min(n, 2) + 1) + ' sur 3 : ' + STEP[Math.min(n, 2)]}</span></span>
    <h3 id="ac-${cid}">${title}</h3>
    <span class="acard-who" title="${esc(D.people[who].name)}">${UI.avatar(who, 'sm')}<span class="sr">${esc(D.people[who].short)}</span></span>
    <span class="acard-a">${tip ? UI.info(tip, 'Détails') : ''}${actions || ''}</span>
    ${more ? `<div class="acard-b">${more}</div>` : ''}</article>`;

  const priceCard = (id) => {
    const T = S.totals(id), O = S.oracle(id), d = S.D(id), pa = d.priceApproval, ok = S.priceApproved(id);
    if (ok) return card('price', 'Prix · ' + U.cents(T.htC, 0), 'sylvie', 3, U.cents(T.htC) + ' avant taxes · ' + U.cents(T.ttcC) + ' taxes incluses · marge ' + U.pct(T.margin) + '. Approuvé par ' + S.actorName(pa.by) + ', ' + U.dayTime(pa.at) + '.', '', 'done');
    const pos = O.mode === 'bids' ? (O.zoneState === 'in' ? 'dans la zone recommandée' : O.zoneState === 'above' ? 'au-dessus de la zone recommandée' : 'hors de la zone recommandée') : 'cible fondée sur le coût : ' + U.money(Math.round(O.target));
    const tip = 'Total : ' + U.cents(T.htC) + ' avant taxes, ' + U.cents(T.ttcC) + ' taxes incluses. Marge brute : ' + U.pct(T.margin) + ' sur coût interne. Position : ' + pos + '.' + (pa ? ' L’approbation précédente (' + U.cents(pa.ht, 0) + ') est périmée : ' + (pa.bundle !== S.bundleKey(id) ? 'un addenda a changé les quantités' : 'des prix ont changé') + '.' : '') + ' Cette approbation porte sur cette version exacte du bordereau; toute modification la rendra périmée.';
    return card('price', (pa ? 'Prix modifié · ' : 'Prix · ') + U.cents(T.htC, 0), 'sylvie', 0, tip,
      `<a class="icon-btn" href="#/dossier/${id}/prix" aria-label="Modifier les prix" title="Modifier les prix">${ic('pen', 16)}</a>${UI.btn(pa ? 'Réapprouver' : 'Approuver', 'approve-price', { cls: 'btn-primary btn-sm', icon: 'check', disabled: !S.can('approvePrice'), data: { t: id }, title: S.can('approvePrice') ? 'Approuver le bordereau de prix' : 'Réservé à la propriétaire' })}`);
  };
  const bondCard = (id) => {
    const def = S.def(id);
    if (!S.hasBond(id)) return '';
    const bc = S.compliance(id).find((x) => x.req && (S.reqById(id, x.req) || {}).rule && S.reqById(id, x.req).rule.type === 'bond');
    if (bc && bc.status === 'verified' && bc.vault) return card('bond', 'Garantie de soumission', 'marc', 3, bc.detail, '', 'done');
    if (!S.bondAccepts(id, 'cautionnement')) return card('bond', 'Garantie : ' + esc((S.def(id).bondForms || []).join(', ')), 'marc', 0, (bc ? bc.detail + ' ' : '') + 'Le devis n’admet pas le cautionnement du courtier : aucune demande n’est préparée. Versez la pièce de la forme admise.', `<a class="btn btn-primary btn-sm" href="#/dossier/${id}/conformite">${ic('vault', 16)}<span>Verser</span></a>`);
    const d = S.D(id), b = d.bond, T = S.totals(id), cap = b.cap || S.bondCap(T.bondC);
    const facts = `<details class="fold fold-sm"><summary>${ic('mail', 14)}<span>Ce qui est partagé</span></summary><dl class="share"><div><dt>Destinataire</dt><dd>${esc(D.surety.contact)}, ${esc(D.surety.broker)} (fictif)</dd></div><div><dt>Objet</dt><dd>Garantie de soumission, ${esc(def.ref)}, bénéficiaire : ${esc(def.buyer)}</dd></div><div><dt>Montant</dt><dd>${def.bondAmount ? 'montant fixe' : U.num(def.bondRate * 100, 0) + ' % du prix total ' + (def.bondBasis === 'ht' ? 'HT' : 'TTC')} = ${U.cents(T.bondC)}; plafond demandé ${U.money(cap)} (marge de 8 % arrondie)</dd></div><div><dt>Validité</dt><dd>90 jours suivant l’ouverture du ${esc(U.date(S.opening(id)))}</dd></div><div><dt>Pièces partagées</dt><dd>Extrait du devis sur la garantie, total du bordereau</dd></div><div><dt>Non partagé</dt><dd>États financiers, coûts internes, autres dossiers</dd></div></dl></details>`;
    const capTip = 'Capacité : ' + U.money(cap) + ' demandés pour un plafond de ' + U.money(D.surety.single) + ' par contrat; ' + U.msShort(D.surety.committed) + ' engagés sur ' + U.msShort(D.surety.aggregate) + '. TenderStrike ne se substitue pas à la caution.';
    if (b.status === 'none') return card('bond', 'Garantie · ' + U.cents(T.bondC, 0), 'marc', 0, 'Le devis exige ' + S.bondLabel(id, true) + ', soit ' + U.cents(T.bondC) + (def.bondAmount ? '' : ' au prix actuel') + '. ' + capTip, UI.btn('Préparer', 'bond', { cls: 'btn-primary btn-sm', icon: 'mail', data: { t: id, step: 'propose' }, disabled: !!d.receipt, title: 'Préparer la demande au courtier' }));
    if (b.status === 'proposed') return card('bond', 'Demande au courtier', 'marc', 0, capTip, `${UI.iconBtn('x', 'Rejeter la demande', 'bond', { t: id, step: 'cancel' })}${UI.btn('Confirmer', 'bond', { cls: 'btn-primary btn-sm', icon: 'check', data: { t: id, step: 'confirm' }, disabled: !S.can('decide'), title: 'Confirmer la demande' })}`, 'open', facts);
    if (b.status === 'confirmed') return card('bond', 'Demande prête à envoyer', 'marc', 1, capTip, UI.btn('Envoyer', 'bond', { cls: 'btn-primary btn-sm', icon: 'send', data: { t: id, step: 'execute' }, title: 'Exécuter : enregistrer l’envoi (simulé)' }), 'open', facts);
    if (b.status === 'requested') return card('bond', 'Demande envoyée', 'marc', 2, 'Envoi simulé ' + U.time(b.sentAt) + ' : aucun courriel réel n’est parti. Une relance ne crée pas de doublon.', UI.btn('Lettre reçue', 'bond', { cls: 'btn-ghost btn-sm', icon: 'download', data: { t: id, step: 'issued' }, title: 'Enregistrer la lettre reçue (simulation)' }));
    const ok = b.cap * 100 >= T.bondC;
    return card('bond', ok ? 'Garantie · ' + U.money(b.cap) : 'Garantie insuffisante', 'marc', 3, 'Lettre d’engagement jusqu’à ' + U.money(b.cap) + ' · montant requis actuel ' + U.cents(T.bondC) + (ok ? ' : couvert.' : ' : insuffisant.'), ok ? '' : UI.btn('Réviser', 'bond', { cls: 'btn-primary btn-sm', data: { t: id, step: 'redo' }, title: 'Demander une garantie révisée' }), ok ? 'done' : 'open');
  };
  const ackCard = (id) => {
    const d = S.D(id), list = S.published(id);
    if (!list.length) return '';
    const allDone = list.every((a) => d.ack[a.id]);
    return card('ack', 'Accusés d’addenda · ' + list.filter((a) => d.ack[a.id]).length + '/' + list.length, 'sylvie', allDone ? 3 : 0, 'La signature reste celle de la signataire, par la méthode acceptée.', '', allDone ? 'done' : 'open',
      `<ul class="acks">${list.map((a) => `<li>${d.ack[a.id] ? UI.status('verified', 'Signé') : UI.status('missing')}<span title="${esc(a.summary || '')}">${esc(a.label)}${a.publishedAt ? ' · ' + esc(U.dateShort(a.publishedAt)) : ''}</span>${d.ack[a.id] ? `<small>${esc(U.time(d.ack[a.id].at))}</small>` : UI.btn('Signer', 'ack', { cls: 'btn-ghost btn-sm', icon: 'pen', data: { t: id, k: a.id }, disabled: !S.can('sign'), title: 'Signer l’accusé (simulation)' })}</li>`).join('')}</ul>`);
  };
  V.declBody = (id) => {
    const d = S.D(id), items = S.def(id).declItems || [];
    return `<p class="dlg-lead">${ic('pen', 16)}<span>TenderStrike ne coche jamais ces cases : elles engagent la signataire.</span></p>
      <ul class="decl">${items.map((x, i) => `<li><label><input type="checkbox" data-act-change="decl" data-t="${esc(id)}" data-k="d${i + 1}"${d.decl['d' + (i + 1)] ? ' checked' : ''}${S.can('sign') ? '' : ' disabled'}><span>${esc(x)}</span></label></li>`).join('')}</ul>
      <div class="dlg-actions"><button type="button" class="btn btn-ghost" data-act="dlg-close">Fermer</button>${UI.btn('Signer (simulation)', 'sign-decl', { cls: 'btn-primary', icon: 'pen', data: { t: id }, disabled: !S.can('sign') || !items.every((x, i) => d.decl['d' + (i + 1)]) })}</div>`;
  };
  const declCard = (id) => {
    const d = S.D(id), items = S.def(id).declItems || [];
    if (d.declSigned) return card('decl', 'Déclaration signée', 'sylvie', 3, 'Signée (simulation) par ' + S.actorName(d.declSigned.by) + ', ' + U.dayTime(d.declSigned.at) + '. Aucune signature enregistrée n’a été apposée automatiquement.', '', 'done');
    const n = items.filter((x, i) => d.decl['d' + (i + 1)]).length;
    return card('decl', 'Déclaration (Annexe C) · ' + n + '/' + items.length, 'sylvie', 0, '', UI.btn('Lire et signer', 'decl-open', { cls: 'btn-primary btn-sm', icon: 'pen', data: { t: id } }));
  };

  V.finalChecks = (id) => {
    const list = S.compliance(id).filter((c) => c.status !== 'na').map((c) => ({ label: c.label, ok: c.status === 'verified', sev: S.HARD.includes(c.status) ? 'bloquant' : S.SOFT.includes(c.status) ? 'à compléter' : 'ok', status: c.status }));
    list.push({ label: 'Dernier addenda inclus : ' + S.bundleLabel(id) + (S.state.caps.offline ? ' · SEAO injoignable' : ''), ok: !S.state.caps.offline || !!S.D(id).manualCheck, sev: S.state.caps.offline && !S.D(id).manualCheck ? 'à compléter' : 'ok', status: S.state.caps.offline && !S.D(id).manualCheck ? 'unverified' : 'verified' });
    list.push({ label: 'Fichiers PDF de 25 Mo au plus, noms sans caractères spéciaux', ok: true, sev: 'ok', status: 'verified' });
    return list;
  };
  const resultsBlock = (id) => {
    const d = S.D(id), open = S.nowTs() >= Date.parse(S.opening(id));
    if (d.results) {
      const op = S.state.openings.find((o) => o.id === d.results);
      const sorted = op ? op.bids : [];
      const you = sorted.find((b) => b.you);
      const rank = sorted.filter((b) => b.status !== 'nonconform').indexOf(you) + 1;
      return `<div class="results"><h4>Résultats d’ouverture · ${esc(op ? op.opened : '')}</h4>
        <table class="res res-sm"><tbody>${sorted.map((b, i) => `<tr class="${b.you ? 'is-you' : ''}${i === 0 ? ' is-win' : ''}"><td class="rk">${i + 1}</td><td class="fm">${esc(b.firm)}${b.you ? ' <em>(vous)</em>' : ''}</td><td class="num">${U.money(b.amount)}</td><td class="num">${i === 0 ? '—' : U.signedPct((b.amount - sorted[0].amount) / sorted[0].amount)}</td></tr>`).join('')}</tbody></table>
        <p class="res-src">${ic('doc', 14)}<span>${esc(op ? op.source : '')}</span>${UI.info('Ajouté à l’historique de ' + S.def(id).buyer + ' : l’oracle des dossiers semblables en tient compte.', 'À savoir')}</p>
        ${d.outcome ? `<p><span class="stamp stamp-${d.outcome.kind === 'awarded' ? 'done' : 'sm'}">${esc(S.stageLabel(d.outcome.kind))}</span> ${esc(U.dayTime(d.outcome.at))}</p>` : `<div class="rc-a">${UI.btn('Adjugé à nous', 'outcome', { cls: rank === 1 ? 'btn-primary' : 'btn-ghost', data: { t: id, k: 'awarded' }, disabled: rank !== 1 })}${UI.btn('Perdu', 'outcome', { cls: rank > 1 ? 'btn-primary' : 'btn-ghost', data: { t: id, k: 'lost' } })}${UI.btn('Annulé', 'outcome', { cls: 'btn-ghost', data: { t: id, k: 'cancelled' } })}${UI.info('Vous êtes ' + (rank === 1 ? '1er' : rank + 'e') + ' : ' + (rank === 1 ? 'l’adjudication attend la vérification de conformité du donneur d’ouvrage.' : 'un autre soumissionnaire est plus bas.'), 'Votre rang')}</div>`}
      </div>`;
    }
    if (!open) return `<div class="results"><h4>${ic('clock', 15)} Ouverture · ${esc(U.dayTime(S.opening(id)))}</h4>${UI.info('Avancez l’horloge dans le Labo de test, puis saisissez les résultats lus (ou simulez leur publication).', 'Comment tester')}</div>`;
    const T = S.totals(id);
    return `<form class="results" data-form="results" data-t="${esc(id)}"><div class="sec-row"><h4>Résultats d’ouverture</h4>${UI.info('Inscrivez les montants lus à l’ouverture du ' + U.dayTime(S.opening(id)) + '. Ils rejoindront l’historique de prix de cet acheteur.', 'À savoir')}</div>
      ${[0, 1, 2].map((i) => `<div class="rrow"><label class="fld"><span>Soumissionnaire ${i + 1}</span><input name="firm${i}" value="${esc(((S.def(id).resultFactors || [])[i] || [''])[0])}"></label><label class="fld"><span>Montant avant taxes</span><input name="amt${i}" type="number" step="1" min="0" placeholder="0"></label></div>`).join('')}
      <div class="rrow"><label class="fld"><span>Votre soumission</span><input value="${esc(D.company.legalName)}" disabled></label><label class="fld"><span>Montant avant taxes</span><input name="you" type="number" step="0.01" value="${(T.htC / 100).toFixed(2)}"></label></div>
      <div class="rc-a">${UI.btn('Simuler', 'results-event', { cls: 'btn-ghost btn-sm', icon: 'flask', data: { t: id }, title: 'Publier les résultats (simulation)' })}<button type="submit" class="btn btn-primary btn-sm">${ic('check', 16)}<span>Enregistrer</span></button></div></form>`;
  };
  const pkgPanel = (id) => {
    const d = S.D(id), def = S.def(id);
    const blockers = S.blockers(id), approved = S.packageApproved(id), hash = S.packageHash(id);
    const lastExport = d.exports.slice().reverse().find((e) => e.kind === 'approved');
    const exportedCurrent = lastExport && lastExport.hash === hash;
    const checks = V.finalChecks(id), bad = checks.filter((c) => !c.ok);
    const checking = UI.view.checking && UI.view.checking.id === id ? UI.view.checking.i : null;
    const past = S.nowTs() > Date.parse(S.close(id));
    let stamp = '';
    if (d.outcome) stamp = `<span class="stamp stamp-big stamp-done">${esc(S.stageLabel(d.outcome.kind))}</span>`;
    else if (d.receipt) stamp = '<span class="stamp stamp-big stamp-done">Déposé</span>';
    else if (approved) stamp = `<span class="stamp stamp-big">Approuvé · v${d.packageApproval.rev}</span>`;
    else if (past) stamp = '<span class="stamp stamp-big stamp-bad">Clôturé</span>';
    const atts = S.attachments(id);
    let actions;
    if (checking != null) actions = `<div class="precheck" aria-live="polite"><p><b>Contrôle final</b></p><ol>${['Addenda publiés sur SEAO', 'Validité des attestations à la clôture', 'Approbations à jour', 'Champs requis et fichiers'].map((x, i) => `<li class="${i < checking ? 'is-done' : i === checking ? 'is-on' : ''}">${i < checking ? ic('check', 14) : ic('clock', 14)}${x}</li>`).join('')}</ol></div>`;
    else if (d.receipt) actions = `<div class="deposited"><p>${ic('stamp', 15)}<b>${esc(d.receipt.number)}</b><span>${esc(U.dayTime(d.receipt.when))}</span>${UI.info('Reçu officiel saisi : le statut « Déposé » repose sur ce reçu.', 'À savoir')}</p>${downloads(id, lastExport)}${resultsBlock(id)}</div>`;
    else if (past) actions = `<div class="exported"><p class="exp-note">${ic('lock', 16)}<span>Clôture passée</span>${UI.info('La clôture du ' + U.dayTime(S.close(id)) + ' est passée sans dépôt enregistré. SEAO n’accepte plus de soumission : le dossier reste consultable.', 'Pourquoi')}</p>${UI.btn('Archiver', 'archive', { cls: 'btn-ghost btn-sm', icon: 'folder', data: { t: id }, title: 'Archiver le dossier' })}</div>`;
    else if (exportedCurrent) {
      const nowLocal = new Date(S.nowTs() - S.now().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      actions = `<div class="exported"><p class="exp-note">${ic('download', 16)}<span>Exporté ${esc(U.time(lastExport.at))} · <b>pas encore déposé</b></span>${UI.info('Exporté ne veut pas dire déposé : 1. connectez-vous à SEAO avec le compte de l’entreprise; 2. téléversez les ' + atts.length + ' fichiers listés dans le manifeste, avant le ' + U.dayTime(S.close(id)) + '; 3. notez le numéro de confirmation affiché par SEAO, puis inscrivez-le ici.', 'Comment déposer')}</p>${downloads(id, lastExport)}
        <form class="receipt" data-form="receipt" data-t="${esc(id)}" aria-labelledby="rc-h-${id}"><h4 id="rc-h-${id}">Reçu officiel SEAO</h4>
          <label class="fld"><span>Numéro de confirmation SEAO</span><input id="rc-num" type="text" autocomplete="off" placeholder="Tel qu’affiché par SEAO"></label>
          <label class="fld"><span>Date et heure du reçu</span><input id="rc-when" type="datetime-local" value="${nowLocal}"></label>
          <div class="rc-a">${UI.btn('Exemple', 'receipt-sample', { cls: 'btn-ghost btn-sm', icon: 'flask', data: { t: id }, title: 'Utiliser un reçu fictif' })}${UI.btn('Enregistrer le reçu', 'receipt', { cls: 'btn-primary', icon: 'stamp', disabled: !S.can('receipt'), data: { t: id } })}</div></form></div>`;
    } else {
      const offline = S.state.caps.offline && !d.manualCheck;
      actions = `<div class="pkg-a">
        ${approved ? UI.btn('Exporter le paquet', 'export', { cls: 'btn-hl', icon: 'download', data: { t: id }, title: 'Exporter le paquet approuvé' }) : UI.btn('Approuver le paquet', 'approve-package', { cls: 'btn-primary', icon: 'stamp', disabled: blockers.length > 0 || !S.can('approvePackage'), data: { t: id }, title: blockers.length ? blockers.length + ' point(s) empêchent l’approbation' : S.can('approvePackage') ? 'Approuver cette version du paquet' : 'Réservé à la signataire' })}
        ${approved ? UI.btn('Paquet approuvé', 'approve-package', { cls: 'btn-ghost btn-sm', icon: 'stamp', disabled: true }) : UI.btn('Exporter', 'export', { cls: 'btn-ghost btn-sm', icon: 'download', disabled: true, title: 'Approuvez d’abord le paquet' })}
        ${offline && approved ? UI.btn('Vérifié sur SEAO', 'manual-check', { cls: 'btn-ghost btn-sm', icon: 'check', data: { t: id }, title: 'J’ai vérifié manuellement sur SEAO' }) : ''}
        ${UI.iconBtn('doc', 'Exporter un brouillon avec avertissements', 'export-draft', { t: id })}
        ${UI.info(blockers.length ? blockers.length + ' point(s) empêchent l’approbation. Un brouillon les liste et ne peut pas être déposé comme prêt.' : approved ? (offline ? 'SEAO est injoignable : le contrôle final exige une vérification manuelle documentée.' : 'Le contrôle final revérifie les addenda et les attestations juste avant l’export.') : 'Tout est prêt pour l’approbation de la signataire.', 'Où en est le paquet')}</div>`;
    }
    return `<section class="package" aria-labelledby="pk-h">
      <header class="pkg-h"><h2 id="pk-h" class="sec-h">Paquet · v${d.rev}</h2>${UI.info('Version de travail n° ' + d.rev + ' · empreinte ' + hash.slice(0, 12) + ' · ' + S.bundleLabel(id), 'Version du paquet')}${stamp}</header>
      ${actions}
      <details class="fold fold-sm checks-f"><summary>${ic(bad.length ? 'alert' : 'check', 15)}<span>Contrôles finaux</span>${bad.length ? `<b class="cnt is-bad">${bad.length}</b>` : '<b class="cnt">✓</b>'}</summary>
        <ul class="checks">${bad.concat(checks.filter((c) => c.ok)).map((c) => `<li class="ck-${c.ok ? 'ok' : c.sev === 'bloquant' ? 'bad' : 'wait'}">${UI.status(c.status)}<span>${esc(c.label)}</span>${c.ok ? '' : `<small>${esc(c.sev)}</small>`}</li>`).join('')}</ul></details>
      <details class="fold fold-sm atts"><summary>${ic('doc', 15)}<span>Fichiers</span><b class="cnt">${atts.length}</b></summary><ul>${atts.map((a) => `<li title="${esc(a.role)}"><span>${esc(a.name)}</span><small><code>${a.hash.slice(0, 10)}</code></small></li>`).join('')}</ul></details>
    </section>`;
  };
  const downloads = (id, e) => (e ? `<div class="dls">${UI.btn('Manifeste', 'dl-html', { cls: 'btn-ghost btn-sm', icon: 'download', data: { t: id }, title: 'Télécharger le manifeste (.html)' })}${UI.btn('JSON', 'dl-json', { cls: 'btn-ghost btn-sm', icon: 'download', data: { t: id }, title: 'Télécharger (.json)' })}${UI.iconBtn('print', 'Imprimer ou PDF', 'print', { t: id })}</div>` : '');

  V.revue = (id) => {
    const d = S.D(id);
    const changes = d.packageApproval && !S.packageApproved(id) && !d.receipt ? `<p class="since">${ic('alert', 16)}<span>Modifié depuis la v${d.packageApproval.rev}</span>${UI.info('Des changements depuis l’approbation de la version ' + d.packageApproval.rev + ' : ' + (d.packageApproval.bundle !== S.bundleKey(id) ? 'nouvel addenda intégré, ' : '') + 'nouvelle empreinte. Revoyez les lignes ouvertes puis approuvez la version ' + d.rev + '.', 'Ce qui a changé')}</p>` : '';
    return `${UI.dossierHead(id, 'revue')}
    <div class="review"><div class="cards">
      <div class="sec-row"><h2 class="sec-h">À confirmer</h2>${UI.info('Proposer → confirmer → exécuter. Rien d’externe n’est envoyé sans confirmation.', 'Comment ça marche')}</div>
      ${changes}${priceCard(id)}${bondCard(id)}${ackCard(id)}${declCard(id)}
    </div>${pkgPanel(id)}</div>`;
  };

  /* ---------- Manifeste exportable ---------- */
  V.manifest = (id, entry) => {
    const d = S.D(id), T = S.totals(id), t = S.def(id), draft = entry.kind === 'draft';
    const atts = S.attachments(id), comp = S.compliance(id);
    const approvals = [];
    if (d.priceApproval) approvals.push(['Prix (approbation commerciale)', S.actorName(d.priceApproval.by), U.dayTime(d.priceApproval.at), S.priceApproved(id) ? 'à jour' : 'périmée']);
    if (d.declSigned) approvals.push(['Déclaration Annexe C (signature simulée)', S.actorName(d.declSigned.by), U.dayTime(d.declSigned.at), 'à jour']);
    S.published(id).forEach((a) => { if (d.ack[a.id]) approvals.push(['Accusé ' + a.label.toLowerCase() + ' (signature simulée)', S.actorName(d.ack[a.id].by), U.dayTime(d.ack[a.id].at), 'à jour']); });
    if (d.packageApproval) approvals.push(['Paquet, version ' + d.packageApproval.rev, S.actorName(d.packageApproval.by), U.dayTime(d.packageApproval.at), S.packageApproved(id) ? 'à jour' : 'périmée']);
    if (d.manualCheck) approvals.push(['Vérification manuelle de SEAO (exception)', S.actorName(d.manualCheck.by), U.dayTime(d.manualCheck.at), 'documentée']);
    const STAT = { verified: 'Vérifié', expired: 'Expiré à la clôture', missing: 'Manquant', insufficient: 'Montant insuffisant', failed: 'Non admissible', suspended: 'Révoqué', pending: 'À compléter', unverified: 'Non vérifié', na: 'Non applicable' };
    const css = `.mf{font:14px/1.5 Georgia,'Times New Roman',serif;color:#172338;max-width:820px;margin:24px auto;padding:0 24px}.mf h1{font:700 24px/1.2 system-ui,sans-serif;margin:8px 0}.mf h2{font:700 15px/1.3 system-ui,sans-serif;margin:24px 0 8px;border-bottom:2px solid #172338;padding-bottom:4px}.mf .banner{border:3px solid #B3261E;color:#B3261E;padding:10px 14px;font:700 13px/1.4 system-ui,sans-serif;margin:0 0 16px}.mf .draft{background:#FCEBE9}.mf table{width:100%;border-collapse:collapse;font-size:13px}.mf th,.mf td{text-align:left;padding:5px 6px;border-bottom:1px solid #D3DAE2;vertical-align:top}.mf td.n,.mf th.n{text-align:right;font-variant-numeric:tabular-nums}.mf code{font:12px ui-monospace,monospace;word-break:break-all}.mf .meta{font:13px/1.5 system-ui,sans-serif;color:#45536A}.mf .ok{color:#1C6B4F}.mf .bad{color:#B3261E}.mf footer{margin-top:28px;font:12px/1.5 system-ui,sans-serif;color:#45536A}`;
    const body = `<div class="mf">
      <p class="banner${draft ? ' draft' : ''}">DÉMONSTRATION · DONNÉES FICTIVES. Ce document n’est pas une soumission officielle et n’a été transmis à aucun portail.${draft ? ' BROUILLON NON PRÊT À DÉPOSER : ' + entry.blockers.length + ' point(s) non résolu(s).' : ''}</p>
      <p class="meta">TenderStrike QC · manifeste interne du paquet</p>
      <h1>${esc(t.ref)} · ${esc(t.title)}</h1>
      <p class="meta">${esc(t.buyer)} ${t.custom ? '(avis ajouté par vous)' : '(fictive)'} · clôture ${esc(U.dayTime(S.close(id)))} (heure de Montréal)<br>Soumissionnaire : ${esc(D.company.legalName)} · NEQ ${esc(D.company.neq)} (fictif)<br>Version de travail n° ${entry.rev} · ${esc(S.bundleLabel(id))} · empreinte du paquet <code>${esc(entry.hash)}</code><br>Exporté le ${esc(U.dayTime(entry.at))} par ${esc(S.actorName(entry.by))} (horloge de démonstration)</p>
      ${draft ? `<h2>Points non résolus</h2><ul>${entry.blockers.map((b) => `<li class="bad">${esc(b)}</li>`).join('')}</ul>` : ''}
      <h2>Bordereau de prix</h2><table><thead><tr><th>Art.</th><th>Description</th><th class="n">Quantité</th><th class="n">Prix unitaire</th><th class="n">Total</th></tr></thead><tbody>
      ${T.lines.map((l) => `<tr><td>${l.a.n}</td><td>${esc(l.a.label)}</td><td class="n">${U.num(l.qty, l.a.decimals)} ${esc(l.a.unit === 'saison' && l.qty > 1 ? 'saisons' : l.a.unit)}</td><td class="n">${U.cents(l.priceC)}</td><td class="n">${U.cents(l.totalC)}</td></tr>`).join('')}
      <tr><td></td><td>Sous-total avant taxes</td><td></td><td></td><td class="n">${U.cents(T.htC)}</td></tr><tr><td></td><td>TPS 5 %</td><td></td><td></td><td class="n">${U.cents(T.tpsC)}</td></tr><tr><td></td><td>TVQ 9,975 %</td><td></td><td></td><td class="n">${U.cents(T.tvqC)}</td></tr>
      <tr><td></td><td><b>Total, taxes incluses</b></td><td></td><td></td><td class="n"><b>${U.cents(T.ttcC)}</b></td></tr>${S.hasBond(id) ? `<tr><td></td><td>Garantie de soumission requise (${S.bondLabel(id)})</td><td></td><td></td><td class="n">${U.cents(T.bondC)}</td></tr>` : ''}</tbody></table>
      <h2>Conformité à la clôture</h2><table><tbody>${comp.map((c) => `<tr><td class="${c.status === 'verified' ? 'ok' : c.status === 'na' ? '' : 'bad'}">${esc(STAT[c.status] || c.status)}</td><td>${esc(c.label)}</td><td>${esc(c.detail)}</td></tr>`).join('')}</tbody></table>
      <h2>Fichiers du paquet</h2><table><thead><tr><th>Fichier</th><th>Rôle</th><th>Empreinte SHA-256</th></tr></thead><tbody>${atts.map((a) => `<tr><td>${esc(a.name)}</td><td>${esc(a.role)}</td><td><code>${esc(a.hash)}</code></td></tr>`).join('')}</tbody></table>
      <h2>Approbations</h2><table><thead><tr><th>Objet</th><th>Par</th><th>Quand</th><th>État</th></tr></thead><tbody>${approvals.map((a) => `<tr><td>${esc(a[0])}</td><td>${esc(a[1])}</td><td>${esc(a[2])}</td><td>${esc(a[3])}</td></tr>`).join('') || '<tr><td colspan="4">Aucune approbation</td></tr>'}</tbody></table>
      <h2>Instructions de dépôt</h2><p>Déposer sur SEAO uniquement, en PDF de 25 Mo au plus par fichier, avant le ${esc(U.dayTime(S.close(id)))}. Le statut « Déposé » n’est inscrit qu’après la saisie du numéro de confirmation officiel.</p>
      <footer>Les coûts internes et les marges ne figurent pas dans ce manifeste. Les empreintes sont calculées dans le navigateur sur le contenu de démonstration.</footer></div>`;
    const typoBody = body.replace(/>([^<]+)</g, (m0, txt) => '>' + U.typoText(txt) + '<');
    return { css, body: typoBody, html: `<!doctype html><html lang="fr-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Manifeste ${esc(t.ref)} · v${entry.rev}${draft ? ' · brouillon' : ''}</title><style>body{margin:0;background:#fff}${css}</style></head><body>${typoBody}</body></html>` };
  };
  V.manifestJson = (id, entry) => {
    const d = S.D(id), T = S.totals(id), t = S.def(id);
    return JSON.stringify({ avertissement: 'DÉMONSTRATION · DONNÉES FICTIVES · pas une soumission officielle', appel: { reference: t.ref, seao: t.seao, acheteur: t.buyer, cloture: S.close(id) }, version: { travail: entry.rev, documents: S.bundleLabel(id), empreinte: entry.hash, type: entry.kind },
      bordereau: T.lines.map((l) => ({ article: l.a.n, description: l.a.label, quantite: l.qty, unite: l.a.unit, prixUnitaire: l.priceC / 100, total: l.totalC / 100 })),
      totaux: { avantTaxes: T.htC / 100, tps: T.tpsC / 100, tvq: T.tvqC / 100, taxesIncluses: T.ttcC / 100, garantieRequise: T.bondC / 100 },
      conformite: S.compliance(id).map((c) => ({ element: c.label, statut: c.status })), fichiers: S.attachments(id), exporte: entry.at, recu: d.receipt || null }, null, 2);
  };
})();
