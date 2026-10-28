/* Écrans du dossier : radiographie (Go / No-Go), conformité, historique. Un seul code pour tous les dossiers.
   Une tâche par écran : les explications passent derrière ⓘ, le devis s’ouvre à la demande. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S, UI = TS.UI;
  const esc = U.esc, ic = U.icon;
  const V = (TS.V = TS.V || {});
  const plural = (n, one, many) => n + ' ' + (n > 1 ? many : one);

  V.reqStatus = (id, r) => {
    if (S.needsAcquisition(id)) return { k: 'unknown', detail: 'Documents non obtenus : à vérifier après lecture.' };
    return S.evalRule(id, r);
  };

  /* Action de remédiation : un bouton icône vers l’onglet où l’on règle le point */
  const fixLink = (id, fix) => {
    if (!fix) return '';
    const go = (tab, icon, label) => `<a class="icon-btn" href="#/dossier/${id}/${tab}" aria-label="${esc(label)}" title="${esc(label)}">${ic(icon, 16)}</a>`;
    if (/^vault:/.test(fix) || /^visit/.test(fix) || /^recheck/.test(fix)) return go('conformite', 'shield', 'Régler dans Conformité');
    if (fix === 'bond' || fix === 'sign') return go('revue', 'stamp', 'Voir dans Revue');
    if (fix === 'exp' || fix === 'fields') return go('formulaires', 'doc', 'Ouvrir les formulaires');
    if (fix === 'price') return go('prix', 'chart', 'Aller aux prix');
    return '';
  };

  const KIND = { trap: ['alert', 'Piège éliminatoire'], pill: ['info', 'Clause de risque'], req: ['check', 'Exigence'], gap: ['q', 'Lecture incomplète'], info: ['info', 'À savoir'] };
  const reqRow = (id, r) => {
    const s = V.reqStatus(id, r);
    const clause = S.clauseText(id, r.clause) || r.quote || '';
    const kind = KIND[r.kind] || KIND.req;
    let act = '';
    if (s.act && /^confirm:/.test(s.act)) act = UI.iconBtn('check', s.actLabel || 'Confirmer', 'confirm', { t: id, key: s.act.slice(8) });
    else act = fixLink(id, s.fix);
    const canAsk = S.def(id).questionsDeadline && S.nowTs() < Date.parse(S.def(id).questionsDeadline) && r.kind !== 'info';
    const tip = [r.plain, s.detail, r.unverifiedQuote ? 'Citation non retrouvée dans le texte.' : '', 'Lecture ' + U.pct(r.conf || 0.9, 0) + '.'].filter(Boolean).join(' ');
    return `<li class="req req-${r.kind}${UI.viewer(id).clause === r.clause ? ' is-on' : ''}" data-req="${r.id}">
      <span class="req-k" title="${esc(kind[1])}">${ic(kind[0], 16)}<span class="sr">${esc(kind[1])}</span></span>
      <h4 class="req-t"><button type="button" class="req-open" data-act="cite" data-t="${esc(id)}" data-clause="${esc(r.clause)}" data-doc="${r.doc}" data-page="${r.page}" title="Ouvrir la page ${r.page}">${esc(r.title)}</button></h4>
      <span class="req-s">${UI.status(s.k)}</span>
      <span class="req-a">${UI.cite(id, r, 'p. ' + r.page)}${act}${canAsk ? UI.iconBtn('q', 'Poser une question au donneur d’ouvrage', 'q-new', { t: id, req: r.id }) : ''}${UI.info(tip, 'Lecture de l’exigence')}</span>
      ${clause ? `<details class="req-more"><summary>${ic('doc', 13)}<span>Texte du devis</span></summary><blockquote class="verbatim">${esc(clause)}</blockquote></details>` : ''}
    </li>`;
  };

  /* Go / No-Go : trois tuiles, un verdict chacune; le détail derrière ⓘ */
  const scorecard = (id) => {
    const R = S.requirements(id);
    const st = (r) => V.reqStatus(id, r).k;
    const el = R.filter((r) => r.assess === 'eligibility'), ca = R.filter((r) => r.assess === 'capability'), co = R.filter((r) => r.assess === 'commercial');
    const cnt = (list, ks) => list.filter((r) => ks.includes(st(r))).length;
    const elBad = cnt(el, S.HARD), elWait = cnt(el, S.SOFT.concat(['unknown'])), failed = cnt(el, ['failed']);
    const caUnk = cnt(ca, ['unknown', 'failed']);
    const pills = co.filter((r) => r.kind === 'pill');
    const O = S.oracle(id);
    const margin = O.target ? (O.target - O.T.costC / 100) / O.target : O.T.margin;
    const names = (list) => list.map((r) => r.title).join(' · ');
    const tiles = [
      ['Admissibilité', failed ? 'bad' : elBad ? 'bad' : elWait ? 'wait' : 'ok', failed ? plural(failed, 'condition impossible', 'conditions impossibles') : elBad ? plural(elBad, 'bloqueur', 'bloqueurs') : elWait ? elWait + ' à obtenir' : 'Vérifiée', names(el.filter((r) => st(r) !== 'verified')) || 'Conditions obligatoires réunies.'],
      ['Capacité', caUnk ? 'wait' : 'ok', ca.length ? (caUnk ? caUnk + ' à confirmer' : 'Suffisante') : '—', names(ca) || 'Aucune exigence de capacité lue.'],
      ['Attrait', pills.length ? 'risk' : 'ok', pills.length ? plural(pills.length, 'risque', 'risques') : 'Sans risque relevé', (pills.length ? names(pills) + '. ' : '') + 'Marge d’environ ' + U.pct(margin, 0) + ' à la cible de prix · effort restant ' + U.minutes(S.effortLeft(id)) + '.']
    ];
    const proposal = failed ? 'Décliner : une condition éliminatoire ne peut pas être remplie avant la clôture.' : elBad ? 'Poursuivre, en réglant ' + S.hardBlockers(id).map((b) => b.label.charAt(0).toLowerCase() + b.label.slice(1)).slice(0, 2).join(' et ') + ' avant la clôture.' : 'Poursuivre : aucune condition éliminatoire en échec.';
    return `<section class="scorecard" aria-labelledby="sc-h">
      <div class="sec-row"><h2 id="sc-h" class="sec-h">Go / No-Go</h2>${UI.info('Proposition TenderStrike : ' + proposal + ' Aucun score global : chaque volet garde ses faits, et une décision de poursuivre ne rend pas un point ouvert conforme.', 'Proposition')}</div>
      <div class="sc-grid">${tiles.map(([h, k, v, tip]) => `<article class="sc sc-${k}" title="${esc(tip)}"><h3>${h}</h3><p class="sc-v">${ic(k === 'ok' ? 'check' : k === 'bad' ? 'alert' : k === 'risk' ? 'info' : 'clock', 17)}<span>${esc(v)}</span></p></article>`).join('')}</div>
    </section>`;
  };

  const LBL = { proceed: 'Poursuivre', investigate: 'Investiguer', decline: 'Décliner' };
  const decisionPanel = (id) => {
    const d = S.D(id);
    if (d.decision) return `<section class="decision is-done" id="decision" tabindex="-1" aria-label="Décision">
      <span class="dec-choice dec-${d.decision.choice}">${ic(d.decision.choice === 'decline' ? 'x' : d.decision.choice === 'proceed' ? 'check' : 'q', 15)}${esc(LBL[d.decision.choice])}</span>
      <span class="dec-by">${UI.avatar(d.decision.by, 'sm')}${esc(U.dateShort(d.decision.at))}</span>
      ${UI.info('« ' + d.decision.reason + ' » · ' + S.actorName(d.decision.by) + ', ' + U.dayTime(d.decision.at) + ' · responsable : ' + S.actorName(d.decision.owner) + ' · révision le ' + U.date(d.decision.review + 'T12:00:00-04:00') + '.', 'Motif de la décision')}
      ${d.decision.choice === 'proceed' ? `<a class="btn btn-primary btn-sm" href="#/dossier/${id}/prix">${ic('chart', 15)}<span>Prix</span></a>` : ''}
      ${d.receipt ? '' : UI.iconBtn('reset', 'Rouvrir la décision', 'reopen', { t: id })}
    </section>`;
    return `<section class="decision" id="decision" tabindex="-1" aria-label="Décision">
      ${UI.btn('Décider', 'decide-open', { cls: 'btn-primary', icon: 'check', data: { t: id }, disabled: !S.can('decide'), title: S.can('decide') ? 'Poursuivre, investiguer ou décliner, avec un motif' : 'Réservé à la propriétaire' })}
      ${UI.info('TenderStrike propose; la propriétaire décide. Le motif, la personne responsable et la date de révision sont conservés au journal.', 'Comment décider')}
    </section>`;
  };
  V.decisionDialog = (id) => {
    const failed = S.compliance(id).some((c) => c.status === 'failed');
    const def0 = failed ? 'decline' : 'proceed';
    const reason = failed ? 'Condition éliminatoire impossible à remplir avant la clôture.' : 'Métier, territoire et références conformes; régler les pièces bloquantes avant la clôture.';
    return `<fieldset class="dec-opts"><legend class="sr">Choix</legend>
        ${[['proceed', 'Poursuivre', 'check'], ['investigate', 'Investiguer', 'q'], ['decline', 'Décliner', 'x']].map(([v, l, icn]) => `<label class="dec-opt"><input type="radio" name="dec" value="${v}"${v === def0 ? ' checked' : ''}>${ic(icn, 16)}<b>${l}</b></label>`).join('')}
      </fieldset>
      <label class="fld fld-wide"><span>Motif (conservé au journal)</span><textarea id="dec-reason" rows="2">${esc(reason)}</textarea></label>
      <div class="dec-fields">
        <label class="fld"><span>Responsable</span><select id="dec-owner">${Object.values(D.people).map((p) => `<option value="${p.id}"${p.id === 'marc' ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <label class="fld"><span>Révision</span><input id="dec-review" type="date" value="${U.isoDay(new Date(S.nowTs() + 5 * 86400000))}" min="${U.isoDay(S.now())}"></label>
      </div>
      <div class="dlg-actions"><button type="button" class="btn btn-ghost" data-act="dlg-close">Annuler</button>${UI.btn('Enregistrer', 'decide', { cls: 'btn-primary', icon: 'check', id: 'btn-decide', data: { t: id } })}</div>`;
  };

  const acquisitionPanel = (id) => {
    const def = S.def(id);
    return `<section class="acq" aria-labelledby="acq-h">
      <div class="sec-row"><h2 id="acq-h" class="sec-h">${ic('lock', 18)} Documents à obtenir</h2>${UI.info('La fiche de l’avis est publique, mais le cahier des charges (' + def.pagesTotal + ' pages) s’obtient en se connectant à SEAO. TenderStrike ne contourne pas cette étape : versez les fichiers obtenus. Ils sont lus dans votre navigateur (nom, taille, empreinte); la lecture du devis est simulée.', 'Pourquoi')}</div>
      <div class="fix-row">${UI.btn('Utiliser le dossier d’exemple', 'acquire-sample', { cls: 'btn-primary', icon: 'doc', data: { t: id }, disabled: !S.can('tender') })}
        <div class="drop drop-sm" data-drop="acquire" data-t="${esc(id)}">${ic('upload', 18)}<label class="drop-l"><span class="link">Verser les fichiers</span><input type="file" multiple accept=".pdf,.zip,.xlsx,.txt" class="sr" data-act-change="acquire" data-t="${esc(id)}"${S.can('tender') ? '' : ' disabled'}></label></div></div>
    </section>`;
  };

  const questionsPanel = (id) => {
    const def = S.def(id), d = S.D(id);
    if (!def.questionsDeadline) return '';
    const open = S.nowTs() < Date.parse(def.questionsDeadline);
    return `<details class="fold questions"${d.questions.length ? ' open' : ''}><summary>${ic('q', 16)}<span>Questions</span><b class="cnt">${d.questions.length}</b><small>${open ? 'jusqu’au ' + esc(U.dateShort(def.questionsDeadline)) : 'période terminée'}</small></summary>
      ${d.questions.length ? `<ul class="qlist">${d.questions.map((q) => `<li class="q${q.sentAt ? ' is-sent' : ''}"><p class="q-t">« ${esc(q.text)} »</p><p class="q-m">${UI.chip(q.sentAt ? 'send' : 'pen', q.sentAt ? 'Envoyée' : 'Brouillon', '', q.sentAt ? 'Envoyée (simulation) le ' + U.dayTime(q.sentAt) : 'À relire avant l’envoi')}${UI.prov(q.provenance === 'Règles' ? null : q.provenance)}${q.answer ? UI.chip('doc', 'Répondue', 'chip-ok', 'Réponse publiée en addenda') : ''}${q.sentAt ? '' : `${UI.btn('Envoyer', 'q-send', { cls: 'btn-primary btn-sm', icon: 'send', data: { t: id, q: q.id }, disabled: !open, title: 'Envoi simulé au responsable' })}${UI.iconBtn('pen', 'Modifier', 'q-edit', { t: id, q: q.id })}${UI.iconBtn('trash', 'Supprimer', 'q-del', { t: id, q: q.id })}`}</p></li>`).join('')}</ul>` : ''}
      ${open ? UI.btn('Rédiger une question', 'q-new', { cls: 'btn-ghost btn-sm', icon: 'pen', data: { t: id } }) : ''}
    </details>`;
  };

  V.radiographie = (id) => {
    const R = S.requirements(id);
    const f = UI.view.reqFilter[id] || (R.some((r) => r.kind === 'trap') ? 'trap' : 'all');
    const filters = [['trap', 'Pièges', R.filter((r) => r.kind === 'trap').length, 'alert'], ['pill', 'Risques', R.filter((r) => r.kind === 'pill').length, 'info'], ['capability', 'Capacité', R.filter((r) => r.assess === 'capability').length, 'truck'], ['all', 'Tout', R.length, 'list']].filter((x) => x[0] === 'all' || x[2] > 0);
    const list = R.filter((r) => f === 'all' || (f === 'capability' ? r.assess === 'capability' : r.kind === f));
    const T = S.totals(id), def = S.def(id);
    const cite = (rid, lbl) => { const r = R.find((x) => x.id === rid); return r ? UI.cite(id, r, lbl) : ''; };
    const acq = S.needsAcquisition(id);
    const award = R.find((r) => r.id === 'r-award');
    return `${UI.dossierHead(id, 'radiographie')}
    <div class="wb">
      ${acq ? acquisitionPanel(id) : ''}
      ${def.custom ? `<p class="srcnote">${ic('info', 15)}<span>${def.source && def.source.kind === 'file' ? esc(def.source.name) : 'Texte collé'}</span>${UI.prov(def.source && def.source.kind === 'ai' ? { source: 'ai', model: 'claude-opus-5-5' } : null)}</p>` : ''}
      ${acq ? '' : `<div class="gn">${scorecard(id)}${decisionPanel(id)}</div>`}
      <section class="reqs" aria-labelledby="reqs-h">
        <div class="sec-row"><h2 id="reqs-h" class="sec-h">Exigences</h2>${UI.info('Chaque exigence cite le texte du devis mot pour mot; l’icône ⓘ donne la lecture de TenderStrike, à vérifier. Touchez un titre ou une page pour ouvrir le devis.', 'Comment lire')}</div>
        <div class="filters" role="group" aria-label="Filtrer les exigences">${filters.map(([k, l, n, icn]) => `<button type="button" class="chip${f === k ? ' is-on' : ''}" data-act="req-filter" data-t="${esc(id)}" data-f="${k}" aria-pressed="${f === k}">${ic(icn, 14)}${esc(l)} <b>${n}</b></button>`).join('')}</div>
        <ul class="req-list">${list.map((r) => reqRow(id, r)).join('')}</ul>
      </section>
      <details class="fold scope"><summary>${ic('list', 16)}<span>Portée et dates</span><small>${acq ? 'fiche de l’avis' : S.bundlePages(id) + ' p. · ' + R.length + ' exigences'}</small></summary>
        <p class="scope-p">${esc(def.title)} pour ${esc(def.buyer)}, ${esc(def.term.toLowerCase())}. Bordereau de ${T.lines.length} article${T.lines.length > 1 ? 's' : ''} : ${T.lines.slice(0, 4).map((l) => `<b>${U.num(l.qty, l.a.decimals)} ${esc(l.a.unit)}</b> ${esc(l.a.label.charAt(0).toLowerCase() + l.a.label.slice(1))}`).join(', ')}${T.lines.length > 4 ? ', etc.' : ''}.</p>
        <dl class="scope-dl">
          <div><dt>Clôture</dt><dd>${esc(U.dayTime(S.close(id)))}${S.close(id) !== def.close ? ' (reportée par addenda)' : ''}</dd></div>
          <div><dt>Évaluation</dt><dd>${award ? esc(award.title) + ' ' + cite('r-award', 'p. ' + award.page) : 'Non précisée'}</dd></div>
          <div><dt>Visite</dt><dd>${def.visit ? (def.visit.mandatory ? 'Obligatoire' : 'Facultative') + ', ' + (def.visit.at ? esc(U.dayTime(def.visit.at)) + (def.visitAssumed ? ' (heure supposée)' : '') : 'date à confirmer') + ' ' + cite('r-visit', 'p. ' + ((R.find((r) => r.id === 'r-visit') || {}).page || 1)) : 'Aucune'}</dd></div>
          <div><dt>Garantie de soumission</dt><dd>${S.hasBond(id) ? S.bondLabel(id, true) + ' ' + cite('r-bond', 'p. ' + ((R.find((r) => r.id === 'r-bond') || {}).page || 1)) : 'Non exigée'}</dd></div>
        </dl>
      </details>
      ${acq ? '' : questionsPanel(id)}
    </div>`;
  };

  /* ---------- Conformité : une liste à cocher; raisons derrière ⓘ ---------- */
  const vaultFix = (id, kind) => {
    const canV = S.can('vault');
    const existing = S.bestDoc(kind);
    const label = (D.vaultKinds.find((k) => k[0] === kind) || [kind, kind])[1];
    const def3 = U.isoDay(new Date(S.nowTs() + 91 * 86400000));
    const bondK = ['bondcheque', 'bondletter'].includes(kind);
    const tip = (kind === 'arq' ? 'Demandez une nouvelle attestation dans votre dossier Revenu Québec, puis versez le PDF. ' : bondK ? 'Forme de garantie admise par le devis : versez la copie numérisée; l’original accompagne le dépôt si l’avis l’exige. ' : '') + 'Le fichier reste dans votre navigateur : seule son empreinte SHA-256 est conservée.' + (canV ? '' : ' Réservé à l’administratrice ou à la propriétaire.');
    return `<div class="fixbox" data-fix="${kind}">
      <div class="drop drop-sm" data-drop="fix" data-kind="${kind}" title="${esc((existing && !bondK ? 'Remplacer : ' : 'Ajouter : ') + label)}">${ic('upload', 18)}<label class="drop-l"><span class="link">${existing && !bondK ? 'Nouvelle version' : 'Ajouter la pièce'}</span><input type="file" id="fix-file-${kind}" accept=".pdf,application/pdf" class="sr" data-act-change="fix-file" data-kind="${kind}"${canV ? '' : ' disabled'}></label><span class="drop-name" id="fix-name-${kind}">${UI.view['fix_' + kind] ? esc(UI.view['fix_' + kind].name) + ' · ' + U.bytes(UI.view['fix_' + kind].size) : ''}</span></div>
      ${bondK ? `<label class="fld fld-inline" title="Montant"><span class="sr">Montant ($)</span>${ic('chart', 15)}<input type="number" min="0" step="100" id="fix-amount-${kind}" value="${Math.ceil(S.totals(id).bondC / 10000) * 100}" aria-label="Montant ($)"></label>` : ''}
      <label class="fld fld-inline" title="Fin de validité inscrite">${ic('cal', 15)}<span class="sr">Fin de validité inscrite</span><input type="date" id="fix-until-${kind}" value="${def3}" min="${U.isoDay(S.now())}" aria-label="Fin de validité inscrite"></label>
      ${UI.btn('Verser', 'fix-save', { cls: 'btn-primary btn-sm', icon: 'vault', disabled: !canV, data: { kind, t: id }, title: 'Verser au coffre-fort' })}
      ${UI.btn('Exemple', 'fix-sample', { cls: 'btn-ghost btn-sm', icon: 'doc', disabled: !canV, data: { kind, t: id }, title: 'Utiliser un fichier d’exemple' })}
      ${UI.info(tip, 'Comment régler')}
    </div>`;
  };
  const compRow = (id, i) => {
    const r = i.req ? S.reqById(id, i.req) : null;
    let fix = '';
    if (i.fix && /^vault:/.test(i.fix)) { const kind = i.fix.slice(6); fix = ['arq', 'cnesst', 'background', 'insurance', 'rbq', 'bondcheque', 'bondletter'].includes(kind) ? vaultFix(id, kind) : `<a class="icon-btn" href="#/coffre" aria-label="Ouvrir le coffre-fort" title="Ouvrir le coffre-fort">${ic('vault', 16)}</a>`; }
    else if (i.fix && /^recheck:/.test(i.fix)) fix = UI.btn('Revérifier', 'vault-recheck', { cls: 'btn-ghost btn-sm', icon: 'reset', data: { v: i.fix.slice(8) }, title: 'Revérifier au registre (manuel)' });
    else if (i.fix === 'visit-assign') fix = `<div class="fixbox"><label class="fld fld-inline" title="Participant à la visite">${ic('user', 15)}<span class="sr">Participant à la visite</span><select id="visit-who-${id}" aria-label="Participant à la visite">${Object.values(D.people).map((p) => `<option value="${p.id}"${S.D(id).visitAttendee === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="denis"${S.D(id).visitAttendee === 'denis' ? ' selected' : ''}>Denis Gaudreau</option></select></label>${UI.btn('Assigner', 'visit-assign', { cls: 'btn-ghost btn-sm', data: { t: id } })}</div>`;
    else if (i.fix === 'visit-upload') fix = UI.btn('Attestation', 'visit-upload', { cls: 'btn-primary btn-sm', icon: 'upload', data: { t: id }, title: 'Verser l’attestation de visite (exemple)' });
    else if (i.fix === 'acquire') fix = `<a class="icon-btn" href="#/dossier/${id}/radiographie" aria-label="Obtenir les documents" title="Obtenir les documents">${ic('lock', 16)}</a>`;
    else fix = fixLink(id, i.fix);
    const box = fix.indexOf('fixbox') > 0;
    const tip = i.detail + (i.vault ? ' · Pièce : ' + (i.vault.file || i.vault.title) + (i.vault.verified ? ', ' + i.vault.verified : '') + '.' : '');
    return `<li class="comp comp-${i.status}" data-comp="${i.id === 'r-arq' ? 'arq' : i.id}">
      <div class="comp-top">${UI.status(i.status)}<h4>${esc(i.label)}</h4><span class="comp-f">${r ? UI.cite(id, r, 'p. ' + r.page) : ''}${box ? '' : fix}${UI.info(tip, 'Pourquoi ce statut')}</span></div>
      ${box ? fix : ''}
    </li>`;
  };
  V.conformite = (id) => {
    const items = S.compliance(id);
    const hardL = items.filter((i) => S.HARD.includes(i.status)), softL = items.filter((i) => S.SOFT.includes(i.status) || i.status === 'unknown');
    const okL = items.filter((i) => i.status === 'verified'), naL = items.filter((i) => i.status === 'na');
    const hard = hardL.length, soft = softL.length;
    const close = S.close(id);
    const shared = S.sharedCapacity(id);
    const list = (arr) => `<ul class="comp-list">${arr.map((i) => compRow(id, i)).join('')}</ul>`;
    return `${UI.dossierHead(id, 'conformite')}
    <div class="wb">
      <section class="gate gate-${hard ? 'bad' : soft ? 'wait' : 'ok'}" aria-live="polite">
        ${ic(hard ? 'lock' : soft ? 'clock' : 'shield', 20)}
        <h2 class="gate-h">${hard ? plural(hard, 'bloquant', 'bloquants') : soft ? 'Aucun bloquant' : 'Tout est vérifié'}</h2>
        ${soft ? UI.chip('clock', soft + ' à compléter', 'chip-wait') : ''}${okL.length ? UI.chip('check', okL.length + ' vérifiés', 'chip-ok') : ''}
        ${UI.info('Chaque pièce est vérifiée à la date et à l’heure de clôture (' + U.dayTime(close) + '), avec l’horloge de démo (' + U.dayTime(S.now()) + '). Un brouillon reste exportable, mais il ne peut jamais afficher « prêt ».' + (shared.length ? ' Capacité partagée : ' + shared.map((x) => x.cat + ' ' + x.own + '/' + x.need + ' avec ' + x.name).join('; ') + ', à confirmer.' : ''), 'Comment on vérifie')}
      </section>
      ${hard ? list(hardL) : ''}${soft ? list(softL) : ''}${okL.length ? list(okL) : ''}
      ${naL.length ? `<details class="fold"><summary>${ic('minus', 16)}<span>Non applicable</span><b class="cnt">${naL.length}</b></summary>${list(naL)}</details>` : ''}
    </div>`;
  };

  /* ---------- Historique du dossier ---------- */
  V.logLine = (e, dateToo) => `<li class="log-e${D.people[e.actor] ? ' is-human' : ''}"><time datetime="${esc(e.at)}">${dateToo ? esc(U.dateShort(e.at)) + ' · ' : ''}${U.time(e.at)}</time>${UI.avatar(e.actor, 'sm')}<div class="log-b"><p class="log-w"><b>${esc(e.what)}</b>${e.diff ? `<span class="log-diff"><del>${esc(e.diff[0])}</del>${ic('arrow', 12)}<ins>${esc(e.diff[1])}</ins></span>` : ''}</p></div>${e.detail || e.ver ? UI.info([S.actorName(e.actor), e.detail, e.ver ? e.ver + (e.rev ? ' · version de travail ' + e.rev : '') : ''].filter(Boolean).join(' · '), 'Détails de l’événement') : ''}</li>`;
  V.historique = (id) => {
    const ev = S.state.log.filter((e) => e.tender === id).slice().reverse();
    const d = S.D(id);
    const pub = S.published(id);
    return `${UI.dossierHead(id, 'historique')}
    <div class="wb">
      <details class="fold"><summary>${ic('doc', 16)}<span>Versions et exports</span><b class="cnt">${1 + pub.length + d.exports.length}</b></summary>
        <ul class="vers"><li><b>Devis v1</b><small>${esc(U.date(S.def(id).published + 'T12:00:00-04:00'))}</small></li>${pub.map((a) => `<li><b>${esc(a.label)}</b><small>${a.publishedAt ? esc(U.dayTime(a.publishedAt)) : ''} · ${esc(a.summary)}</small></li>`).join('')}
        ${d.exports.map((e) => `<li><b>${e.kind === 'approved' ? 'Paquet v' + e.rev : 'Brouillon'}</b><small>${esc(U.dayTime(e.at))} · <code>${e.hash.slice(0, 10)}</code></small></li>`).join('')}${d.receipt ? `<li><b>Reçu ${esc(d.receipt.number)}</b><small>${esc(U.dayTime(d.receipt.when))}</small></li>` : ''}</ul>
      </details>
      <ol class="log log-in">${ev.map((e) => V.logLine(e, true)).join('') || '<li class="kempty">Aucun événement pour ce dossier.</li>'}</ol>
    </div>`;
  };

  /* ---------- Dialogue : question au donneur d’ouvrage ---------- */
  V.questionDraft = (id, rid) => {
    const def = S.def(id), r = rid ? S.reqById(id, rid) : null;
    const quote = r ? (S.clauseText(id, r.clause) || '').slice(0, 220) : '';
    return r ? 'Bonjour, concernant l’article ' + r.sec.replace('§', '') + ' (p. ' + r.page + ') de l’appel d’offres ' + def.ref + ' : « ' + quote + (quote.length >= 220 ? '…' : '') + ' » Pouvez-vous préciser ' + (r.kind === 'trap' ? 'les pièces acceptées pour satisfaire cette exigence au moment du dépôt' : r.kind === 'pill' ? 'les modalités d’application de cette clause (calcul, plafond et avis préalable)' : 'comment cette exigence sera évaluée') + ' ? Merci. ' + D.company.contact + ', ' + D.company.legalName + '.'
      : 'Bonjour, concernant l’appel d’offres ' + def.ref + ' (' + def.title + ') : pouvez-vous préciser … ? Merci. ' + D.company.contact + '.';
  };
  V.questionDialog = (id, rid, qid) => {
    const d = S.D(id), def = S.def(id);
    const q = qid ? d.questions.find((x) => x.id === qid) : null;
    const reqs = S.requirements(id).filter((r) => r.kind !== 'info');
    const on = TS.AI.on();
    return `<label class="fld"><span>Exigence visée</span><select id="q-req">${'<option value="">Question générale</option>' + reqs.map((r) => `<option value="${r.id}"${(q ? q.req : rid) === r.id ? ' selected' : ''}>${esc(r.title)}</option>`).join('')}</select></label>
      <label class="fld"><span>Question</span><textarea id="q-text" rows="6">${esc(q ? q.text : V.questionDraft(id, rid))}</textarea></label>
      <p class="q-prov" id="q-prov">${UI.prov(q && q.provenance !== 'Règles' ? q.provenance : null)}${UI.info('Envoi simulé, par écrit, au responsable de l’appel d’offres. La réponse est publiée en addenda à tous les preneurs, avant le ' + U.dayTime(def.questionsDeadline) + '. Rien n’est envoyé sans votre clic.', 'Comment c’est envoyé')}</p>
      <div class="dlg-actions">${TS.AI.link('', true)}${UI.btn('IA', 'q-ai', { cls: 'btn-ghost', icon: 'bolt', data: { t: id }, disabled: !on, title: on ? 'Rédiger avec l’IA en direct' : TS.AI.status().label + ' · ' + TS.AI.status().reason })}${UI.iconBtn('reset', 'Régénérer (règles)', 'q-rules', { t: id })}${UI.btn(q ? 'Enregistrer' : 'Enregistrer le brouillon', 'q-save', { cls: 'btn-primary', icon: 'check', data: { t: id, q: qid || '' } })}</div>`;
  };
})();
