/* Écrans : coffre-fort (pièces, versions, projets de référence) et journal unique. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S, UI = TS.UI;
  const esc = U.esc, ic = U.icon;
  const V = (TS.V = TS.V || {});
  const kindLabel = (k) => (D.vaultKinds.find((x) => x[0] === k) || [k, k])[1];
  const dayIso = (d) => d + 'T12:00:00-05:00';
  const SHORT = { arq: 'Revenu Québec', cnesst: 'CNESST', insurance: 'Assurance RC', rbq: 'Licence RBQ', amp: 'AMP', surety: 'Cautionnement', background: 'Antécédents' };

  V.vaultStatus = (v) => S.vaultStatus(v);

  /* Dossiers ouverts qui exigent ce type de pièce */
  V.usedBy = (kind) => S.openDossierIds().filter((id) => S.requirements(id).some((r) => r.rule && (r.rule.kind === kind || r.rule.type === kind)));

  const timeline = () => {
    const now = S.now();
    const y = Number(U.isoDay(now).slice(0, 4)), m = Number(U.isoDay(now).slice(5, 7)) - 1;
    const months = [];
    for (let i = 0; i < 9; i++) { const mm = (m + i) % 12, yy = y + Math.floor((m + i) / 12); months.push(new Date(Date.UTC(yy, mm, 1, 17))); }
    const START = Date.UTC(y, m, 1, 5), END = Date.UTC(y + Math.floor((m + 9) / 12), (m + 9) % 12, 1, 5);
    const pos = (ts) => Math.max(0, Math.min(100, ((ts - START) / (END - START)) * 100));
    const rows = [];
    S.state.vault.filter((v) => !v.removed && ['arq', 'cnesst', 'insurance', 'rbq', 'amp', 'surety', 'background'].includes(v.kind)).forEach((v) => {
      const st = S.vaultStatus(v);
      (v.versions || []).slice(-1).forEach((o) => { if (o.expires) rows.push({ label: SHORT[v.kind] + ' · v' + (v.versions.length), from: Date.parse(dayIso(o.issued)), to: S.endOf(o.expires), k: 'old', note: 'remplacée' }); });
      const k = v.revoked ? 'bad' : v.indefinite ? 'open' : st.k === 'expired' ? 'bad' : st.k === 'pending' ? 'wait' : 'ok';
      rows.push({ id: v.id, label: SHORT[v.kind] + ((v.versions || []).length ? ' · v' + (v.versions.length + 1) : ''), from: Date.parse(dayIso(v.issued)), to: v.indefinite || !v.expires ? null : S.endOf(v.expires), k, note: v.revoked ? 'révoquée' : v.indefinite ? (v.annual ? 'mise à jour annuelle avant le ' + U.dateShort(dayIso(v.annual)) : 'sans échéance') : v.expires ? 'jusqu’au ' + U.dateShort(dayIso(v.expires)) : 'sans échéance' });
    });
    const open = S.openDossierIds().sort((a, b) => Date.parse(S.close(a)) - Date.parse(S.close(b)));
    const first = open[0];
    const fmtM = new Intl.DateTimeFormat('fr-CA', { month: 'short', timeZone: 'America/Toronto' });
    const bad = rows.filter((r) => r.k === 'bad').length;
    return `<details class="fold tl"><summary>${ic('cal', 16)}<span>Validité face aux clôtures</span>${bad ? `<b class="cnt is-bad">${bad}</b>` : ''}<small>${first ? esc(S.def(first).buyerShort) + ' · ' + esc(U.dateShort(S.close(first))) : ''}</small></summary>
      <div class="sec-row"><h2 id="tl-h" class="sr">Validité des pièces face à vos clôtures</h2>${UI.info('Rappel automatique 15 jours avant chaque échéance (texto simulé à Josée). Trait vertical : aujourd’hui (horloge de démo); repères : vos clôtures.', 'Comment lire')}</div>
      <div class="tl-grid">
        <div class="tl-months" aria-hidden="true">${months.map((d) => `<span style="left:${pos(d.getTime())}%">${esc(fmtM.format(d))}</span>`).join('')}</div>
        <div class="tl-rows">
          ${open.map((id) => `<span class="tl-close${id === first ? ' is-main' : ''}" style="left:${pos(Date.parse(S.close(id)))}%" aria-hidden="true" title="${esc(S.def(id).buyerShort)}">${id === first ? '<b>Clôture : ' + esc(S.def(id).buyerShort) + '</b>' : ''}</span>`).join('')}
          <span class="tl-today" style="left:${pos(S.nowTs())}%" aria-hidden="true"></span>
          ${rows.map((r) => { const a = pos(r.from), b = r.to ? pos(r.to) : 100; const inside = b > 72; return `<div class="tl-row"><span class="tl-l">${esc(r.label)}</span><span class="tl-track"><span class="tl-bar tl-${r.k}${r.to ? '' : ' tl-open'}" style="left:${a}%;width:${Math.max(1.5, b - a)}%"></span><span class="tl-note${inside ? ' tl-note-in' : ''}" style="${inside ? 'right:' + (100 - b + (r.to ? 0.6 : 32)) + '%' : 'left:' + b + '%'}">${esc(r.note)}</span></span></div>`; }).join('')}
        </div>
      </div>
      <p class="tl-legend"><span><i class="lg-today"></i>Aujourd’hui</span>${first ? `<span><i class="lg-main"></i>${esc(S.def(first).buyerShort)}</span>` : ''}${open.length > 1 ? `<span title="${esc(open.slice(1).map((id) => S.def(id).buyerShort + ' (' + U.dateShort(S.close(id)) + ')').join(', '))}"><i class="lg-other"></i>+${open.length - 1}</span>` : ''}</p>
      <p class="sr">${esc(open.map((id) => S.def(id).buyerShort + ' clôture le ' + U.date(S.close(id))).join('; '))}. ${esc(rows.filter((r) => r.k === 'bad').map((r) => r.label + ' : ' + r.note).join('; '))}</p>
    </details>`;
  };

  const docRow = (v) => {
    const st = S.vaultStatus(v), restricted = v.sensitivity === 'restricted', canR = S.can('restricted'), canV = S.can('vault');
    const used = V.usedBy(v.kind);
    const registry = v.kind === 'amp' || v.kind === 'rena';
    const key = v.revoked ? 'Révoquée' : v.expires ? 'jusqu’au ' + U.dateShort(dayIso(v.expires)) : v.indefinite ? 'sans échéance' : '';
    const meta = restricted && !canR ? 'Accès restreint : visible par la propriétaire et l’administratrice seulement.' : [v.issuer + ' · ' + kindLabel(v.kind) + (v.tender && S.def(v.tender) ? ' · ' + S.def(v.tender).buyerShort : ''), v.file + (v.hash ? ' · empreinte ' + v.hash.slice(0, 12) : '') + (v.verified ? ' · ' + v.verified : ''), v.expires ? 'Délivrée le ' + U.date(dayIso(v.issued)) + ', valide jusqu’au ' + U.date(dayIso(v.expires)) : '', v.amount ? 'Couverture ' + U.money(v.amount) : '', v.revoked ? 'Révoquée le ' + U.dayTime(v.revoked.at) + ' : ' + v.revoked.reason : '', v.note || '', restricted ? 'Pièce restreinte.' : used.length ? 'Exigée par ' + used.length + ' dossier' + (used.length > 1 ? 's' : '') + ' ouvert' + (used.length > 1 ? 's' : '') + '.' : 'Données de l’entreprise.'].filter(Boolean).join(' · ');
    return `<li class="doc${restricted ? ' doc-restricted' : ''}${v.created ? ' doc-new' : ''}" id="doc-${esc(v.id)}">
      ${UI.status(st.k, st.label)}
      <div class="doc-t"><b>${restricted ? ic('lock', 13) : ''}${esc(v.title)}</b><small>${esc(key)}${used.length && !restricted ? ' · ' + ic('folder', 12) + used.length : ''}</small></div>
      <span class="doc-a">${UI.info(meta, 'Détails de la pièce')}${restricted && !canR ? '' : `${UI.iconBtn('upload', 'Remplacer', 'vault-replace', { v: v.id })}${UI.iconBtn('pen', 'Modifier', 'vault-edit', { v: v.id })}${registry ? UI.iconBtn('reset', 'Revérifier au registre', 'vault-recheck', { v: v.id }) : ''}${UI.iconBtn('trash', 'Retirer', 'vault-remove', { v: v.id })}`.replace(/<button /g, canV ? '<button ' : '<button disabled ')}</span>
      ${(v.versions || []).length ? `<details class="vers-d"><summary>${ic('log', 13)}${v.versions.length} version${v.versions.length > 1 ? 's' : ''} précédente${v.versions.length > 1 ? 's' : ''}</summary><ul>${v.versions.slice().reverse().map((o, i) => `<li><b>v${v.versions.length - i}</b> ${esc(o.file)} · ${o.expires ? 'valide jusqu’au ' + esc(U.dateShort(dayIso(o.expires))) : 'sans échéance'} · remplacée ${esc(U.dayTime(o.replacedAt))}</li>`).join('')}</ul></details>` : ''}
    </li>`;
  };

  const projRow = (p) => {
    const qualifies = S.tenders().filter((t) => t.experience && S.isOpen(t.id) && S.projectTest(t, p).ok);
    const tip = p.object + ' · ' + U.dateShort(p.start + 'T12:00:00-04:00') + ' ' + p.start.slice(0, 4) + ' au ' + U.dateShort(p.end + 'T12:00:00-04:00') + ' ' + p.end.slice(0, 4) + ' · ' + U.money(p.value) + (p.km ? ' · ' + U.num(p.km, 1) + ' km' : '') + (p.m2 ? ' · ' + U.num(p.m2, 0) + ' m²' : '') + (p.sites ? ' · ' + p.sites + ' sites' : '') + '. ' + (qualifies.length ? 'Admissible pour : ' + qualifies.map((t) => t.buyerShort).join(', ') : 'Admissible pour aucun dossier ouvert') + (p.email ? '.' : ' · courriel de référence absent.');
    return `<li id="proj-${esc(p.id)}"><span class="pj-s ${qualifies.length ? 'ok' : 'no'}" title="${qualifies.length ? 'Admissible : ' + esc(qualifies.map((t) => t.buyerShort).join(', ')) : 'Admissible pour aucun dossier ouvert'}">${ic(qualifies.length ? 'check' : 'minus', 14)}</span><div class="pj-t"><b>${esc(p.client)}</b><small>${UI.trade(p.trade)} · ${p.start.slice(0, 4)}</small></div>
      <span class="row-act">${UI.info(tip, 'Détails du projet')}${`${UI.iconBtn('pen', 'Modifier', 'project-edit', { p: p.id })}${UI.iconBtn('trash', 'Retirer', 'project-remove', { p: p.id })}`.replace(/<button /g, S.can('forms') ? '<button ' : '<button disabled ')}</span></li>`;
  };

  V.coffre = () => {
    const c = D.company, f = UI.view.vaultFilter;
    const all = S.state.vault.filter((v) => !v.removed);
    const docs = all.filter((v) => f === 'all' || (f === 'review' && ['expired', 'pending', 'unverified', 'suspended'].includes(S.vaultStatus(v).k)) || (f === 'restricted' && v.sensitivity === 'restricted'));
    const review = all.filter((v) => ['expired', 'pending', 'unverified', 'suspended'].includes(S.vaultStatus(v).k)).length;
    return `<div class="vault">
      <div class="pagehead"><h1 class="page-h1">Coffre-fort</h1>${UI.info('Une seule source pour l’identité, les attestations et les preuves de l’entreprise. Chaque pièce ajoutée, remplacée ou retirée recalcule la conformité de tous les dossiers ouverts.' + (S.can('vault') ? '' : ' Votre rôle peut consulter le coffre-fort, mais seules l’administratrice et la propriétaire y versent des pièces.'), 'À propos du coffre-fort')}
        <div class="pagehead-a">${UI.btn('Ajouter', 'vault-new', { cls: 'btn-primary', icon: 'plus', disabled: !S.can('vault'), title: 'Ajouter une pièce' })}</div></div>
      <div class="vault-grid">
        <section class="docs" aria-labelledby="docs-h">
          <div class="sec-row"><h2 id="docs-h" class="sec-h">Pièces <b class="cnt">${all.length}</b></h2>
            <div class="seg" role="group" aria-label="Filtrer">${[['all', 'Toutes'], ['review', 'À revoir · ' + review], ['restricted', ic('lock', 13) + '<span class="sr">Restreintes</span>']].map(([k, l]) => `<button type="button" class="seg-b${f === k ? ' is-on' : ''}" data-act="vault-filter" data-f="${k}" aria-pressed="${f === k}"${k === 'restricted' ? ' title="Restreintes"' : ''}>${l}</button>`).join('')}</div>
          </div>
          <ul class="doclist">${docs.map(docRow).join('') || '<li class="kempty">Aucune pièce pour ce filtre.</li>'}</ul>
        </section>
        <aside class="ident" aria-label="Entreprise">
          ${timeline()}
          <details class="fold projs-f"><summary>${ic('list', 16)}<span>Projets de référence</span><b class="cnt">${S.projects().length}</b></summary>
            <div class="fold-a">${UI.btn('Ajouter', 'project-new', { cls: 'btn-ghost btn-sm', icon: 'plus', disabled: !S.can('forms'), title: 'Ajouter un projet de référence' })}</div>
            <ul class="projs projs-crud">${S.projects().map(projRow).join('')}</ul>
          </details>
          <details class="fold"><summary>${ic('user', 16)}<span>Identité</span><small>NEQ ${esc(c.neq)}</small></summary>
          <dl class="id-dl">
            <div><dt>Nom légal</dt><dd>${esc(c.legalName)}</dd></div>
            <div><dt>NEQ</dt><dd>${esc(c.neq)} <small>confirmé le 2 sept. 2026</small></dd></div>
            <div><dt>Adresse</dt><dd>${esc(c.address)}</dd></div>
            <div><dt>TPS / TVQ</dt><dd>${esc(c.tps)}<br>${esc(c.tvq)}</dd></div>
            <div><dt>AMP</dt><dd>${esc(c.amp)} <small>durée indéterminée</small></dd></div>
            <div><dt>RBQ</dt><dd>${esc(c.rbq)} <small>${esc(((S.bestDoc('rbq') || {}).cats || []).join(' et ') || 'aucune')}</small></dd></div>
            <div><dt>Signataire</dt><dd>${esc(c.signatory)}, ${esc(c.signatoryTitle.toLowerCase())} <small>${esc(c.resolution)}</small></dd></div>
          </dl>${UI.chip('info', 'Fictif', '', 'Données fictives. Les numéros ne correspondent à aucune entreprise réelle.')}</details>
          <details class="fold"><summary>${ic('truck', 16)}<span>Équipement</span><b class="cnt">${D.equipment.length}</b></summary>
          <ul class="projs">${D.equipment.map((e) => `<li><b>${e.count} × ${esc(e.label)}</b><small>${esc(e.mode)}</small></li>`).join('')}</ul></details>
        </aside>
      </div>
    </div>`;
  };

  /* ---------- Formulaires (dialogues) ---------- */
  V.vaultDialog = (mode, vid) => {
    const v = vid ? S.state.vault.find((x) => x.id === vid) : null;
    const today = U.isoDay(S.now());
    const kind = v ? v.kind : UI.view.vaultKind || 'arq';
    const f = UI.view.vaultFile;
    const file = mode === 'edit' ? '' : `<div class="drop drop-sm" data-drop="vault">${ic('upload', 18)}<label class="drop-l">Déposez le fichier ou <span class="link">choisissez-le</span><input type="file" class="sr" id="vf-file" data-act-change="vault-file"></label><span class="drop-name" id="vf-name">${f ? esc(f.name) + ' · ' + U.bytes(f.size) : 'Aucun fichier : un fichier d’exemple sera généré'}</span></div>`;
    return `<form class="frm" data-form="vault" data-mode="${mode}" data-v="${esc(vid || '')}">
      ${mode === 'add' ? `<label class="fld"><span>Type de pièce</span><select name="kind" id="vf-kind" data-act-change="vault-kind">${D.vaultKinds.filter((k) => k[0] !== 'visit').map(([k, l]) => `<option value="${k}"${k === kind ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>` : `<p class="fld-wide muted-note">${esc(kindLabel(kind))} · ${esc(v.title)}${mode === 'replace' ? ' : la version actuelle est conservée dans l’historique.' : ''}</p>`}
      ${mode !== 'replace' ? `<label class="fld${mode === 'add' ? '' : ' fld-wide'}"><span>Titre</span><input name="title" value="${esc(v ? v.title : kindLabel(kind))}" required minlength="3"></label>` : ''}
      ${mode !== 'replace' ? `<label class="fld"><span>Émetteur</span><input name="issuer" value="${esc(v ? v.issuer : '')}" placeholder="Organisme émetteur"></label>` : ''}
      <label class="fld"><span>Date de délivrance</span><input name="issued" type="date" value="${esc(mode === 'edit' && v ? v.issued : today)}" max="${today}"></label>
      <label class="fld"><span>Fin de validité</span><input name="expires" type="date" value="${esc(mode === 'edit' && v ? v.expires || '' : mode === 'replace' && v && v.expires ? U.isoDay(new Date(S.nowTs() + 91 * 86400000)) : kind === 'arq' ? U.isoDay(new Date(S.nowTs() + 91 * 86400000)) : '')}"></label>
      ${(mode === 'add' || (v && ['insurance', 'bondcheque', 'bondletter'].includes(v.kind))) && mode !== 'replace' ? `<label class="fld" data-only="insurance bondcheque bondletter"${['insurance', 'bondcheque', 'bondletter'].includes(kind) ? '' : ' hidden'}><span>Montant ($)</span><input name="amount" type="number" min="0" step="100000" value="${esc(v && v.amount ? v.amount : '')}"></label>` : ''}
      ${(mode === 'add' || (v && v.kind === 'rbq')) && mode !== 'replace' ? `<label class="fld" data-only="rbq"${kind === 'rbq' ? '' : ' hidden'}><span>Sous-catégories RBQ</span><input name="cats" value="${esc(v && v.cats ? v.cats.join(', ') : '')}" placeholder="1.4, 2.5"></label>` : ''}
      ${mode === 'add' ? `<label class="fld fld-check"><input type="checkbox" name="restricted"><span>Accès restreint (propriétaire et administratrice)</span></label>` : ''}
      ${file ? `<div class="fld-wide">${file}</div>` : ''}
      <p class="fld-wide fld-note">${UI.chip('lock', 'Reste dans votre navigateur', '', 'Seuls son nom, sa taille et son empreinte SHA-256 sont conservés. Les dossiers ouverts sont recalculés à l’enregistrement.')}</p>
      <div class="dlg-actions fld-wide"><button type="button" class="btn btn-ghost" data-act="dlg-close">Annuler</button><button type="submit" class="btn btn-primary">${mode === 'add' ? 'Ajouter au coffre-fort' : mode === 'replace' ? 'Verser la nouvelle version' : 'Enregistrer'}</button></div>
    </form>`;
  };
  V.projectDialog = (pid) => {
    const p = pid ? S.state.projects.find((x) => x.id === pid) : null;
    const trade = p ? p.trade : UI.view.projTrade || 'pavage';
    return `<form class="frm" data-form="project" data-p="${esc(pid || '')}">
      <label class="fld"><span>Métier</span><select name="trade">${D.company.trades.map(([k, l]) => `<option value="${k}"${k === trade ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <label class="fld"><span>Client</span><input name="client" required value="${esc(p ? p.client : '')}" placeholder="Ex. : Ville de Saint-Rémi-des-Prés"></label>
      <label class="fld fld-wide"><span>Objet du contrat</span><input name="object" required value="${esc(p ? p.object : '')}" placeholder="Ex. : Réfection du chemin du Lac"></label>
      <label class="fld"><span>Début</span><input name="start" type="date" required value="${esc(p ? p.start : '2025-05-05')}"></label>
      <label class="fld"><span>Fin</span><input name="end" type="date" required value="${esc(p ? p.end : '2025-09-26')}"></label>
      <label class="fld"><span>Valeur avant taxes ($)</span><input name="value" type="number" min="0" step="1000" required value="${esc(p ? p.value : '')}"></label>
      <label class="fld"><span>Kilomètres de voies</span><input name="km" type="number" min="0" step="0.1" value="${esc(p ? p.km || '' : '')}"></label>
      <label class="fld"><span>Superficie entretenue (m²)</span><input name="m2" type="number" min="0" step="10" value="${esc(p ? p.m2 || '' : '')}"></label>
      <label class="fld"><span>Nombre de sites</span><input name="sites" type="number" min="0" step="1" value="${esc(p ? p.sites || '' : '')}"></label>
      <label class="fld"><span>Personne-ressource</span><input name="contact" value="${esc(p ? p.contact : '')}"></label>
      <label class="fld"><span>Courriel de référence</span><input name="email" type="email" value="${esc(p ? p.email : '')}" placeholder="courriel@exemple.ca"></label>
      <p class="fld-wide fld-note">${UI.info('Un projet est proposé à l’Annexe D d’un dossier seulement s’il passe ses tests : métier, période et minimum exigé. TenderStrike n’en invente jamais.', 'Quand un projet est proposé')}</p>
      <div class="dlg-actions fld-wide"><button type="button" class="btn btn-ghost" data-act="dlg-close">Annuler</button><button type="submit" class="btn btn-primary">${p ? 'Enregistrer' : 'Ajouter le projet'}</button></div>
    </form>`;
  };

  /* ---------- Journal ---------- */
  V.logRow = (e) => `<li class="log-e${D.people[e.actor] ? ' is-human' : ''}"><time datetime="${esc(e.at)}">${U.time(e.at)}</time>${UI.avatar(e.actor, 'sm')}<div class="log-b"><p class="log-w"><b>${esc(e.what)}</b>${e.tender && S.def(e.tender) ? ' <a class="log-t" href="#/dossier/' + esc(e.tender) + '/historique">' + esc(S.def(e.tender).buyerShort) + '</a>' : ''}${e.diff ? `<span class="log-diff"><del>${esc(e.diff[0])}</del>${ic('arrow', 12)}<ins>${esc(e.diff[1])}</ins></span>` : ''}</p></div>${UI.info([S.actorName(e.actor), e.detail, e.ver && e.ver !== '—' ? e.ver + (e.rev ? ' · version de travail ' + e.rev : '') : ''].filter(Boolean).join(' · '), 'Détails de l’événement')}</li>`;
  V.journal = () => {
    const f = UI.view.logFilter, ft = UI.view.logTender;
    const all = S.state.log.slice().reverse();
    const list = all.filter((e) => (f === 'all' || (f === 'people' ? D.people[e.actor] : f === 'lab' ? e.actor === 'lab' : !D.people[e.actor])) && (ft === 'all' || (ft === 'none' ? !e.tender : e.tender === ft)));
    let lastDay = '';
    const tenders = S.tenders().filter((t) => all.some((e) => e.tender === t.id));
    return `<div class="journal">
      <div class="pagehead"><h1 class="page-h1">Journal <b class="cnt">${all.length}</b></h1>${UI.info('Qui a fait quoi, quand, sur quelle version des documents. ' + all.length + ' événements, dont ' + all.filter((e) => D.people[e.actor]).length + ' faits par une personne. Tous les modules écrivent ici.', 'À propos du journal')}
        <div class="pagehead-a">${UI.iconBtn('download', 'Exporter le journal (.json)', 'log-json', {})}</div></div>
      <div class="log-tools">
        <div class="filters" role="group" aria-label="Filtrer le journal">${[['all', 'Tout', 'list'], ['people', 'Personnes', 'user'], ['system', 'Système', 'bolt'], ['lab', 'Labo', 'flask']].map(([k, l, icn]) => `<button type="button" class="chip${f === k ? ' is-on' : ''}" data-act="log-filter" data-f="${k}" aria-pressed="${f === k}" title="${k === 'system' ? 'TenderStrike et sources' : k === 'lab' ? 'Labo de test' : l}">${ic(icn, 14)}${l}</button>`).join('')}</div>
        <label class="crit-sel" title="Dossier">${ic('folder', 15)}<span class="sr">Dossier</span><select data-act-change="log-tender" aria-label="Filtrer par dossier"><option value="all">Tous</option><option value="none"${ft === 'none' ? ' selected' : ''}>Entreprise et coffre-fort</option>${tenders.map((t) => `<option value="${t.id}"${ft === t.id ? ' selected' : ''}>${esc(t.buyerShort)}</option>`).join('')}</select></label>
      </div>
      <ol class="log">${list.map((e) => { const day = U.date(e.at); const dl = U.day(e.at); const head = day !== lastDay ? `<li class="log-day">${esc(dl.charAt(0).toUpperCase() + dl.slice(1))}</li>` : ''; lastDay = day; return head + V.logRow(e); }).join('') || '<li class="kempty">Aucun événement pour ce filtre.</li>'}</ol>
    </div>`;
  };
})();
