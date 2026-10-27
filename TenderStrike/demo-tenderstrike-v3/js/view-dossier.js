/* Écrans du dossier : radiographie (Go / No-Go), conformité, historique. Un seul code pour tous les dossiers. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S, UI = TS.UI;
  const esc = U.esc, ic = U.icon;
  const V = (TS.V = TS.V || {});

  V.reqStatus = (id, r) => {
    if (S.needsAcquisition(id)) return { k: 'unknown', detail: 'Documents non obtenus : à vérifier après lecture.' };
    const e = S.evalRule(id, r);
    return e;
  };

  const fixLink = (id, fix) => {
    if (!fix) return '';
    if (/^vault:/.test(fix)) return `<a class="btn btn-ghost btn-sm" href="#/dossier/${id}/conformite">${ic('shield', 15)}<span>Régler dans Conformité</span></a>`;
    if (fix === 'bond' || fix === 'sign') return `<a class="btn btn-ghost btn-sm" href="#/dossier/${id}/revue">${ic('stamp', 15)}<span>Voir la proposition</span></a>`;
    if (fix === 'exp' || fix === 'fields') return `<a class="btn btn-ghost btn-sm" href="#/dossier/${id}/formulaires">${ic('doc', 15)}<span>Ouvrir les formulaires</span></a>`;
    if (/^visit/.test(fix) || /^recheck/.test(fix)) return `<a class="btn btn-ghost btn-sm" href="#/dossier/${id}/conformite">${ic('shield', 15)}<span>Régler dans Conformité</span></a>`;
    if (fix === 'price') return `<a class="btn btn-ghost btn-sm" href="#/dossier/${id}/prix">${ic('chart', 15)}<span>Aller aux prix</span></a>`;
    return '';
  };

  const reqRow = (id, r) => {
    const s = V.reqStatus(id, r);
    const clause = S.clauseText(id, r.clause) || r.quote || '';
    const on = UI.viewer(id).clause === r.clause;
    const kindLabel = { trap: 'Piège éliminatoire', pill: 'Clause de risque', req: r.assess === 'capability' ? 'Capacité' : 'Exigence', gap: 'Lecture incomplète', info: 'À savoir' }[r.kind] || 'Exigence';
    let act = '';
    if (s.act && /^confirm:/.test(s.act)) act = UI.btn(esc(s.actLabel || 'Confirmer'), 'confirm', { cls: 'btn-ghost btn-sm', icon: 'check', data: { t: id, key: s.act.slice(8) } });
    else act = fixLink(id, s.fix);
    const canAsk = S.def(id).questionsDeadline && S.nowTs() < Date.parse(S.def(id).questionsDeadline) && r.kind !== 'info';
    return `<li class="req req-${r.kind}${on ? ' is-on' : ''}" data-req="${r.id}">
      <div class="req-top"><span class="req-kind req-kind-${r.kind}">${esc(kindLabel)}</span>${UI.status(s.k)}</div>
      <h4 class="req-t"><button type="button" class="req-open" data-act="cite" data-t="${esc(id)}" data-clause="${esc(r.clause)}" data-doc="${r.doc}" data-page="${r.page}" aria-label="${esc(r.title)} : ouvrir la page ${r.page}">${esc(r.title)}</button></h4>
      <blockquote class="verbatim">${esc(clause)}</blockquote>
      <p class="req-plain"><span class="tag-ai">Lecture TenderStrike</span> ${esc(r.plain)}${r.unverifiedQuote ? ' <span class="st st-wait">' + ic('q', 13) + 'Citation non retrouvée dans le texte</span>' : ''}</p>
      ${s.detail ? `<p class="req-note">${esc(s.detail)}</p>` : ''}
      <div class="req-f">${UI.cite(id, r)}<span class="conf" title="Confiance de lecture du passage">lecture ${U.pct(r.conf || 0.9, 0)}</span>${act}${canAsk ? UI.btn('Poser une question', 'q-new', { cls: 'btn-link btn-sm', data: { t: id, req: r.id } }) : ''}</div>
    </li>`;
  };

  const scorecard = (id) => {
    const R = S.requirements(id);
    const st = (r) => V.reqStatus(id, r).k;
    const el = R.filter((r) => r.assess === 'eligibility'), ca = R.filter((r) => r.assess === 'capability'), co = R.filter((r) => r.assess === 'commercial');
    const cnt = (list, ks) => list.filter((r) => ks.includes(st(r))).length;
    const elBad = cnt(el, S.HARD), elWait = cnt(el, S.SOFT.concat(['unknown'])), elOk = cnt(el, ['verified']), failed = cnt(el, ['failed']);
    const caUnk = cnt(ca, ['unknown', 'failed']), caOk = cnt(ca, ['verified']);
    const O = S.oracle(id);
    const margin = O.target ? (O.target - O.T.costC / 100) / O.target : O.T.margin;
    const verdictEl = failed ? 'Non admissible : ' + failed + ' condition' + (failed > 1 ? 's' : '') + ' impossible' + (failed > 1 ? 's' : '') + ' à remplir' : elBad ? elBad + ' bloqueur' + (elBad > 1 ? 's' : '') + ' remédiable' + (elBad > 1 ? 's' : '') : elWait ? 'Aucun échec, ' + elWait + ' à obtenir' : 'Toutes vérifiées';
    const pills = co.filter((r) => r.kind === 'pill');
    const proposal = failed ? 'Décliner : une condition éliminatoire ne peut pas être remplie avant la clôture. TenderStrike ne promet aucune dérogation.' : elBad ? 'Poursuivre, en réglant ' + S.hardBlockers(id).map((b) => b.label.charAt(0).toLowerCase() + b.label.slice(1)).slice(0, 2).join(' et ') + ' avant la clôture.' : 'Poursuivre : aucune condition éliminatoire en échec.';
    return `<section class="scorecard" aria-labelledby="sc-h">
      <div class="sec-row"><h2 id="sc-h" class="sec-h">Go / No-Go en trois volets</h2><span class="muted-note">Aucun score global : chaque volet garde ses faits.</span></div>
      <div class="sc-grid">
        <article class="sc sc-${failed || elBad ? 'bad' : elWait ? 'wait' : 'ok'}">
          <h3>Admissibilité</h3><p class="sc-v">${verdictEl}</p><p class="sc-c">${elOk} vérifiées · ${elWait} à obtenir · ${elBad} bloquantes</p>
          <ul class="sc-l">${el.filter((r) => st(r) !== 'verified').slice(0, 5).map((r) => `<li>${UI.status(st(r))}<span>${esc(r.title)}</span></li>`).join('') || '<li>' + UI.status('verified') + '<span>Conditions obligatoires réunies</span></li>'}</ul>
        </article>
        <article class="sc sc-${caUnk ? 'wait' : 'ok'}">
          <h3>Capacité</h3><p class="sc-v">${ca.length ? (caUnk ? 'À confirmer : ' + caUnk + ' point' + (caUnk > 1 ? 's' : '') : 'Suffisante') : 'Aucune exigence de capacité lue'}</p><p class="sc-c">${caOk} vérifiés · ${caUnk} inconnus</p>
          <ul class="sc-l">${ca.slice(0, 4).map((r) => `<li>${UI.status(st(r))}<span>${esc(r.title)}</span></li>`).join('')}</ul>
        </article>
        <article class="sc sc-risk">
          <h3>Attrait commercial</h3><p class="sc-v">${pills.length ? pills.length + ' clause' + (pills.length > 1 ? 's' : '') + ' de risque' : 'Pas de clause de risque relevée'}</p><p class="sc-c">Marge d’environ ${U.pct(margin, 0)} ${O.mode === 'bids' ? 'au milieu de la zone de prix' : 'à la cible de prix'} · effort restant ${U.minutes(S.effortLeft(id))}</p>
          <ul class="sc-l">${pills.slice(0, 3).map((r) => `<li>${UI.status('risk')}<span>${esc(r.title)}</span></li>`).join('')}${O.mode === 'bids' && O.recent.bids.find((b) => b.you) ? `<li>${UI.status('info')}<span>Vous étiez ${(() => { const c = O.recent; const conf = c.bids.filter((b) => b.status !== 'nonconform').sort((a, b) => a.amount - b.amount); const i = conf.findIndex((b) => b.you) + 1; return i === 1 ? '1er' : i + 'e'; })()} en ${O.recent.year}</span></li>` : ''}</ul>
        </article>
      </div>
      <p class="sc-prop"><span class="tag-ai">Proposition TenderStrike</span> ${esc(proposal)} Une décision de poursuivre ne transforme pas un point ouvert en conformité.</p>
    </section>`;
  };

  const decisionPanel = (id) => {
    const d = S.D(id), owners = Object.values(D.people);
    if (d.decision) {
      const lbl = { proceed: 'Poursuivre', investigate: 'Investiguer', decline: 'Décliner' }[d.decision.choice];
      return `<section class="decision is-done" id="decision" aria-labelledby="dec-h" tabindex="-1">
        <h2 id="dec-h" class="sec-h">Décision enregistrée</h2>
        <p class="dec-res"><span class="dec-choice dec-${d.decision.choice}">${esc(lbl)}</span> par ${esc(S.actorName(d.decision.by))}, ${esc(U.dayTime(d.decision.at))}</p>
        <p class="dec-reason">« ${esc(d.decision.reason)} »</p>
        <p class="muted-note">Responsable : ${esc(S.actorName(d.decision.owner))} · révision le ${esc(U.date(d.decision.review + 'T12:00:00-04:00'))}. ${S.blockers(id).length ? S.blockers(id).length + ' point(s) restent ouverts et seront divulgués au paquet tant qu’ils ne sont pas réglés.' : ''}</p>
        <div class="dec-actions">${d.decision.choice === 'proceed' ? `<a class="btn btn-primary" href="#/dossier/${id}/prix">${ic('chart', 16)}<span>Passer aux prix</span></a>` : ''}${d.receipt ? '' : UI.btn('Rouvrir la décision', 'reopen', { cls: 'btn-ghost', icon: 'reset', data: { t: id } })}</div>
      </section>`;
    }
    const failed = S.compliance(id).some((c) => c.status === 'failed');
    const def0 = failed ? 'decline' : 'proceed';
    const reason = failed ? 'Condition éliminatoire impossible à remplir avant la clôture.' : 'Métier, territoire et références conformes; régler les pièces bloquantes avant la clôture.';
    return `<section class="decision" id="decision" aria-labelledby="dec-h" tabindex="-1">
      <h2 id="dec-h" class="sec-h">Votre décision</h2>
      <p class="muted-note">TenderStrike propose; la propriétaire décide. Le motif, la personne responsable et la date de révision sont conservés au journal.</p>
      <fieldset class="dec-opts"><legend class="sr">Choix</legend>
        ${[['proceed', 'Poursuivre', 'Préparer la soumission'], ['investigate', 'Investiguer', 'Vérifier un point avant de décider'], ['decline', 'Décliner', 'Classer avec un motif']].map(([v, l, h]) => `<label class="dec-opt"><input type="radio" name="dec" value="${v}"${v === def0 ? ' checked' : ''}><span><b>${l}</b><small>${h}</small></span></label>`).join('')}
      </fieldset>
      <div class="dec-fields">
        <label class="fld fld-wide"><span>Motif</span><textarea id="dec-reason" rows="2">${esc(reason)}</textarea></label>
        <label class="fld"><span>Responsable</span><select id="dec-owner">${owners.map((p) => `<option value="${p.id}"${p.id === 'marc' ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <label class="fld"><span>Date de révision</span><input id="dec-review" type="date" value="${U.isoDay(new Date(S.nowTs() + 5 * 86400000))}" min="${U.isoDay(S.now())}"></label>
      </div>
      <div class="dec-actions">${UI.btn('Enregistrer la décision', 'decide', { cls: 'btn-primary', icon: 'check', id: 'btn-decide', data: { t: id } })}${S.can('decide') ? '' : '<span class="muted-note">Réservé à la propriétaire.</span>'}</div>
    </section>`;
  };

  const acquisitionPanel = (id) => {
    const def = S.def(id);
    return `<section class="acq" aria-labelledby="acq-h">
      <h2 id="acq-h" class="sec-h">${ic('lock', 18)} Documents à obtenir</h2>
      <p>La fiche de l’avis est publique, mais le cahier des charges de ${esc(def.buyerShort)} (${def.pagesTotal} pages) s’obtient en se connectant à SEAO. TenderStrike ne contourne pas cette étape : téléchargez les documents par le canal officiel, puis versez-les ici.</p>
      <div class="drop" data-drop="acquire" data-t="${esc(id)}">${ic('upload', 20)}<label class="drop-l">Déposez les fichiers obtenus ou <span class="link">choisissez-les</span><input type="file" multiple accept=".pdf,.zip,.xlsx,.txt" class="sr" data-act-change="acquire" data-t="${esc(id)}"${S.can('tender') ? '' : ' disabled'}></label></div>
      <div class="fix-row">${UI.btn('Utiliser le dossier d’exemple', 'acquire-sample', { cls: 'btn-primary', icon: 'doc', data: { t: id }, disabled: !S.can('tender') })}<span class="muted-note">Les fichiers sont lus dans votre navigateur (nom, taille, empreinte); la lecture du devis est simulée.</span></div>
    </section>`;
  };

  const questionsPanel = (id) => {
    const def = S.def(id), d = S.D(id);
    if (!def.questionsDeadline) return '';
    const open = S.nowTs() < Date.parse(def.questionsDeadline);
    return `<section class="questions" aria-labelledby="q-h">
      <div class="sec-row"><h2 id="q-h" class="sec-h">Questions au donneur d’ouvrage</h2><span class="muted-note">${open ? 'Jusqu’au ' + esc(U.dayTime(def.questionsDeadline)) : 'Période de questions terminée le ' + esc(U.dayTime(def.questionsDeadline))}</span></div>
      ${d.questions.length ? `<ul class="qlist">${d.questions.map((q) => `<li class="q${q.sentAt ? ' is-sent' : ''}"><p class="q-t">« ${esc(q.text)} »</p><p class="muted-note">${q.sentAt ? 'Envoyée (simulation) le ' + esc(U.dayTime(q.sentAt)) : 'Brouillon'} · ${UI.prov(q.provenance === 'Règles' ? null : q.provenance)}${q.answer ? ' · Réponse publiée en addenda' : ''}</p>${q.sentAt ? '' : `<div class="q-a">${UI.btn('Envoyer (simulation)', 'q-send', { cls: 'btn-primary btn-sm', icon: 'send', data: { t: id, q: q.id }, disabled: !open })}${UI.btn('Modifier', 'q-edit', { cls: 'btn-ghost btn-sm', data: { t: id, q: q.id } })}${UI.btn('Supprimer', 'q-del', { cls: 'btn-ghost btn-sm', data: { t: id, q: q.id } })}</div>`}</li>`).join('')}</ul>` : `<p class="muted-note">Aucune question. Une ambiguïté dans le devis ? Rédigez une question depuis l’exigence concernée; la réponse sera publiée en addenda à tous les preneurs.</p>`}
      ${open ? UI.btn('Rédiger une question', 'q-new', { cls: 'btn-ghost btn-sm', icon: 'pen', data: { t: id } }) : ''}
    </section>`;
  };

  V.radiographie = (id) => {
    const f = UI.view.reqFilter[id] || (S.requirements(id).some((r) => r.kind === 'trap') ? 'trap' : 'all');
    const R = S.requirements(id);
    const filters = [['all', 'Tout', R.length], ['trap', 'Pièges éliminatoires', R.filter((r) => r.kind === 'trap').length], ['pill', 'Clauses de risque', R.filter((r) => r.kind === 'pill').length], ['capability', 'Capacité', R.filter((r) => r.assess === 'capability').length], ['info', 'À savoir', R.filter((r) => r.assess === 'info').length]].filter((x) => x[0] === 'all' || x[2] > 0);
    const list = R.filter((r) => f === 'all' || (f === 'capability' ? r.assess === 'capability' : f === 'info' ? r.assess === 'info' : r.kind === f));
    const T = S.totals(id), def = S.def(id);
    const cite = (rid, lbl) => { const r = R.find((x) => x.id === rid); return r ? UI.cite(id, r, lbl) : ''; };
    const acq = S.needsAcquisition(id);
    return `${UI.dossierHead(id, 'radiographie')}
    <div class="wb">
      <div class="wb-main">
        ${acq ? acquisitionPanel(id) : ''}
        ${def.custom ? `<p class="srcnote">${ic('info', 15)}<span>Dossier créé à partir ${def.source && def.source.kind === 'file' ? 'du fichier ' + esc(def.source.name) : 'd’un texte collé'} · extraction : ${UI.prov(def.source && def.source.kind === 'ai' ? { source: 'ai', model: 'claude-opus-5-5' } : null)} · ${R.length} exigences.</span></p>` : ''}
        <section class="scope" aria-labelledby="scope-h">
          <div class="sec-row"><h2 id="scope-h" class="sec-h">La portée, en clair</h2><span class="muted-note">${acq ? 'Fiche de l’avis seulement' : S.bundlePages(id) + ' pages lues · ' + R.length + ' exigences reliées à leur page'}</span></div>
          <p class="scope-p">${esc(def.title)} pour ${esc(def.buyer)}, ${esc(def.term.toLowerCase())}. Bordereau de ${T.lines.length} article${T.lines.length > 1 ? 's' : ''} : ${T.lines.slice(0, 4).map((l) => `<b>${U.num(l.qty, l.a.decimals)} ${esc(l.a.unit)}</b> ${esc(l.a.label.charAt(0).toLowerCase() + l.a.label.slice(1))}`).join(', ')}${T.lines.length > 4 ? ', etc.' : ''}.</p>
          <dl class="scope-dl">
            <div><dt>Clôture</dt><dd>${esc(U.dayTime(S.close(id)))}${S.close(id) !== def.close ? ' (reportée par addenda)' : ''}</dd></div>
            <div><dt>Évaluation</dt><dd>${R.find((r) => r.id === 'r-award') ? esc(R.find((r) => r.id === 'r-award').title) + ' ' + cite('r-award', 'p. ' + R.find((r) => r.id === 'r-award').page) : 'Non précisée'}</dd></div>
            <div><dt>Visite</dt><dd>${def.visit ? (def.visit.mandatory ? 'Obligatoire' : 'Facultative') + ', ' + (def.visit.at ? esc(U.dayTime(def.visit.at)) + (def.visitAssumed ? ' (heure supposée)' : '') : 'date à confirmer') + ' ' + cite('r-visit', 'p. ' + ((R.find((r) => r.id === 'r-visit') || {}).page || 1)) : 'Aucune'}</dd></div>
            <div><dt>Garantie de soumission</dt><dd>${S.hasBond(id) ? S.bondLabel(id, true) + ' ' + cite('r-bond', 'p. ' + ((R.find((r) => r.id === 'r-bond') || {}).page || 1)) : 'Non exigée'}</dd></div>
          </dl>
        </section>
        ${acq ? '' : scorecard(id)}
        ${acq ? '' : decisionPanel(id)}
        <section class="reqs" aria-labelledby="reqs-h">
          <div class="sec-row"><h2 id="reqs-h" class="sec-h">Exigences et pièges, reliés au devis</h2><span class="muted-note">Touchez une exigence pour ouvrir sa page</span></div>
          <div class="filters" role="group" aria-label="Filtrer les exigences">${filters.map(([k, l, n]) => `<button type="button" class="chip${f === k ? ' is-on' : ''}" data-act="req-filter" data-t="${esc(id)}" data-f="${k}" aria-pressed="${f === k}">${esc(l)} <b>${n}</b></button>`).join('')}</div>
          <p class="legend-line"><span class="verbatim-mini">Texte du devis</span> est cité mot pour mot; <span class="tag-ai">Lecture TenderStrike</span> est une interprétation à vérifier.</p>
          <ul class="req-list">${list.map((r) => reqRow(id, r)).join('')}</ul>
        </section>
        ${acq ? '' : questionsPanel(id)}
      </div>
      <aside class="wb-side" aria-label="Document source">${UI.viewerHtml(id)}</aside>
    </div>`;
  };

  /* ---------- Conformité ---------- */
  const vaultFix = (id, kind, item) => {
    const canV = S.can('vault');
    const existing = S.bestDoc(kind);
    const label = (D.vaultKinds.find((k) => k[0] === kind) || [kind, kind])[1];
    const def3 = U.isoDay(new Date(S.nowTs() + 91 * 86400000));
    const bondK = ['bondcheque', 'bondletter'].includes(kind);
    return `<div class="fixbox" data-fix="${kind}">
      <h5>${existing && !bondK ? 'Remplacer' : 'Ajouter'} : ${esc(label)}</h5>
      <p>${kind === 'arq' ? 'Demandez une nouvelle attestation dans votre dossier Revenu Québec, puis versez le PDF ici.' : bondK ? 'Le devis admet cette forme de garantie : versez la copie numérisée (à l’ordre du donneur d’ouvrage); l’original accompagne le dépôt si l’avis l’exige.' : 'Versez la pièce à jour.'} Le fichier reste dans votre navigateur : seule son empreinte SHA-256 est calculée et conservée.</p>
      <div class="drop" data-drop="fix" data-kind="${kind}">${ic('upload', 20)}<label class="drop-l">Déposez le PDF ici ou <span class="link">choisissez un fichier</span><input type="file" id="fix-file-${kind}" accept=".pdf,application/pdf" class="sr" data-act-change="fix-file" data-kind="${kind}"${canV ? '' : ' disabled'}></label><span class="drop-name" id="fix-name-${kind}">${UI.view['fix_' + kind] ? esc(UI.view['fix_' + kind].name) + ' · ' + U.bytes(UI.view['fix_' + kind].size) : 'Aucun fichier choisi'}</span></div>
      <div class="fix-row">
        ${bondK ? `<label class="fld"><span>Montant ($)</span><input type="number" min="0" step="100" id="fix-amount-${kind}" value="${Math.ceil(S.totals(id).bondC / 10000) * 100}"></label>` : ''}
        <label class="fld"><span>Fin de validité inscrite</span><input type="date" id="fix-until-${kind}" value="${def3}" min="${U.isoDay(S.now())}"></label>
        ${UI.btn('Verser au coffre-fort', 'fix-save', { cls: 'btn-primary', icon: 'vault', disabled: !canV, data: { kind, t: id } })}
        ${UI.btn('Utiliser un fichier d’exemple', 'fix-sample', { cls: 'btn-ghost', disabled: !canV, data: { kind, t: id } })}
      </div>
      ${canV ? '' : '<p class="muted-note">Réservé à l’administratrice ou à la propriétaire.</p>'}
    </div>`;
  };
  const compRow = (id, i) => {
    const r = i.req ? S.reqById(id, i.req) : null;
    let fix = '';
    if (i.fix && /^vault:/.test(i.fix)) { const kind = i.fix.slice(6); fix = ['arq', 'cnesst', 'background', 'insurance', 'rbq', 'bondcheque', 'bondletter'].includes(kind) ? vaultFix(id, kind, i) : `<a class="btn btn-ghost btn-sm" href="#/coffre">${ic('vault', 15)}<span>Ouvrir le coffre-fort</span></a>`; }
    else if (i.fix && /^recheck:/.test(i.fix)) fix = UI.btn('Revérifier au registre (manuel)', 'vault-recheck', { cls: 'btn-ghost btn-sm', icon: 'reset', data: { v: i.fix.slice(8) } });
    else if (i.fix === 'visit-assign') fix = `<div class="fix-row"><label class="fld"><span>Participant à la visite</span><select id="visit-who-${id}">${Object.values(D.people).map((p) => `<option value="${p.id}"${S.D(id).visitAttendee === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="denis"${S.D(id).visitAttendee === 'denis' ? ' selected' : ''}>Denis Gaudreau (contremaître)</option></select></label>${UI.btn('Assigner', 'visit-assign', { cls: 'btn-ghost', data: { t: id } })}</div>`;
    else if (i.fix === 'visit-upload') fix = `<div class="fix-row">${UI.btn('Verser l’attestation de visite (exemple)', 'visit-upload', { cls: 'btn-primary btn-sm', icon: 'upload', data: { t: id } })}</div>`;
    else if (i.fix === 'acquire') fix = `<a class="btn btn-ghost btn-sm" href="#/dossier/${id}/radiographie">${ic('lock', 15)}<span>Obtenir les documents</span></a>`;
    else fix = fixLink(id, i.fix);
    const inline = i.fix && /^vault:/.test(i.fix) && fix.indexOf('fixbox') > 0;
    return `<li class="comp comp-${i.status}" data-comp="${i.id === 'r-arq' ? 'arq' : i.id}">
      <div class="comp-top">${UI.status(i.status)}<h4>${esc(i.label)}</h4></div>
      <p class="comp-d">${esc(i.detail)}</p>
      ${i.vault ? `<p class="comp-ev">${ic('vault', 14)}<span>${esc(i.vault.file || i.vault.title)} · ${esc(i.vault.verified || '')}</span></p>` : ''}
      <div class="comp-f">${r ? UI.cite(id, r) : ''}${inline ? '' : fix}</div>
      ${inline ? fix : ''}
    </li>`;
  };
  V.conformite = (id) => {
    const items = S.compliance(id);
    const groups = [
      ['Bloquant à la clôture', items.filter((i) => S.HARD.includes(i.status))],
      ['À compléter avant l’approbation', items.filter((i) => S.SOFT.includes(i.status))],
      ['Vérifié', items.filter((i) => i.status === 'verified')],
      ['Non applicable à ce devis', items.filter((i) => i.status === 'na')]
    ];
    const hard = groups[0][1].length, soft = groups[1][1].length;
    const close = S.close(id);
    const shared = S.sharedCapacity(id);
    return `${UI.dossierHead(id, 'conformite')}
    <div class="wb">
      <div class="wb-main">
        <section class="gate gate-${hard ? 'bad' : soft ? 'wait' : 'ok'}" aria-live="polite">
          ${ic(hard ? 'lock' : soft ? 'clock' : 'shield', 22)}
          <div>
            <h2 class="gate-h">${hard ? 'Export approuvé bloqué : ' + hard + ' point' + (hard > 1 ? 's' : '') + ' éliminatoire' + (hard > 1 ? 's' : '') : soft ? 'Aucun point éliminatoire · ' + soft + ' à compléter' : 'Toutes les conditions sont vérifiées pour la clôture'}</h2>
            <p>Chaque pièce est vérifiée à la date et à l’heure de clôture, <b>${esc(U.dayTime(close))}</b>, avec l’horloge de démo (${esc(U.dayTime(S.now()))}). Un brouillon reste exportable, mais il ne peut jamais afficher « prêt ».</p>
          </div>
        </section>
        ${shared.length ? `<p class="srcnote">${ic('alert', 15)}<span>Capacité partagée : ${esc(shared.map((x) => x.cat + ' ' + x.own + '/' + x.need + ' avec ' + x.name).join('; '))}. Non bloquant, mais à confirmer avant de signer deux contrats.</span></p>` : ''}
        ${groups.filter((g) => g[1].length).map(([title, list]) => `<section class="comp-group"><h3 class="comp-gh">${esc(title)} <b>${list.length}</b></h3><ul class="comp-list">${list.map((i) => compRow(id, i)).join('')}</ul></section>`).join('')}
      </div>
      <aside class="wb-side" aria-label="Document source">${UI.viewerHtml(id)}</aside>
    </div>`;
  };

  /* ---------- Historique du dossier ---------- */
  V.historique = (id) => {
    const ev = S.state.log.filter((e) => e.tender === id).slice().reverse();
    const d = S.D(id);
    const pub = S.published(id);
    return `${UI.dossierHead(id, 'historique')}
    <div class="hist">
      <section class="hist-side">
        <h2 class="sec-h3">Versions des documents</h2>
        <ul class="vers"><li><b>Devis v1</b><small>Publié le ${esc(U.date(S.def(id).published + 'T12:00:00-04:00'))}</small></li>${pub.map((a) => `<li><b>${esc(a.label)}</b><small>${a.publishedAt ? esc(U.dayTime(a.publishedAt)) : ''} · ${esc(a.summary)}</small></li>`).join('')}</ul>
        <h2 class="sec-h3">Exports et reçus</h2>
        <ul class="vers">${d.exports.map((e) => `<li><b>${e.kind === 'approved' ? 'Paquet v' + e.rev : 'Brouillon'}</b><small>${esc(U.dayTime(e.at))} · <code>${e.hash.slice(0, 10)}</code></small></li>`).join('') || '<li><small>Aucun export.</small></li>'}${d.receipt ? `<li><b>Reçu ${esc(d.receipt.number)}</b><small>${esc(U.dayTime(d.receipt.when))}</small></li>` : ''}</ul>
      </section>
      <ol class="log log-in">${ev.map((e) => `<li class="log-e${D.people[e.actor] ? ' is-human' : ''}"><time datetime="${esc(e.at)}">${esc(U.dateShort(e.at))}<br>${U.time(e.at)}</time>${UI.avatar(e.actor, 'sm')}<div class="log-b"><p class="log-w"><b>${esc(e.what)}</b> <span>· ${esc(S.actorName(e.actor))}</span></p>${e.detail ? `<p class="log-d">${esc(e.detail)}</p>` : ''}${e.diff ? `<p class="log-diff"><del>${esc(e.diff[0])}</del>${ic('arrow', 13)}<ins>${esc(e.diff[1])}</ins></p>` : ''}${e.ver ? `<p class="log-v">${esc(e.ver)}${e.rev ? ' · version de travail ' + e.rev : ''}</p>` : ''}</div></li>`).join('') || '<li class="kempty">Aucun événement pour ce dossier.</li>'}</ol>
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
    return `<p class="dlg-note">${ic('info', 14)} La question est envoyée par écrit au responsable de l’appel d’offres (envoi simulé). La réponse sera publiée en addenda à tous les preneurs du document, avant le ${esc(U.dayTime(def.questionsDeadline))}.</p>
      <label class="fld"><span>Exigence visée</span><select id="q-req">${'<option value="">Question générale</option>' + reqs.map((r) => `<option value="${r.id}"${(q ? q.req : rid) === r.id ? ' selected' : ''}>${esc(r.title)}</option>`).join('')}</select></label>
      <label class="fld"><span>Question</span><textarea id="q-text" rows="6">${esc(q ? q.text : V.questionDraft(id, rid))}</textarea></label>
      <p class="muted-note" id="q-prov">${UI.prov(q && q.provenance !== 'Règles' ? q.provenance : null)} Brouillon à relire : rien n’est envoyé sans votre clic.</p>
      <div class="dlg-actions">${UI.btn('Rédiger avec l’IA en direct', 'q-ai', { cls: 'btn-ghost', icon: 'bolt', data: { t: id }, disabled: !(window.LiveAI && window.LiveAI.isOn()), title: window.LiveAI && window.LiveAI.isOn() ? '' : 'Activez l’IA en direct dans le Labo de test' })}${UI.btn('Régénérer (règles)', 'q-rules', { cls: 'btn-ghost', data: { t: id } })}${UI.btn(q ? 'Enregistrer' : 'Enregistrer le brouillon', 'q-save', { cls: 'btn-primary', icon: 'check', data: { t: id, q: qid || '' } })}</div>`;
  };
})();
