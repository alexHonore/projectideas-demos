/* Labo de test : outils de démonstration, à l’écart de l’interface principale.
   Scénarios, événements externes, horloge, rôles, capacités (dont l’IA en direct), journal, export et import. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S, A = TS.A, UI = TS.UI;
  const esc = U.esc, ic = U.icon;
  const DAY = 86400000;

  /* ---------- Parcours idempotents, réutilisés par les scénarios et la visite guidée ---------- */
  const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^(ville|municipalite|centre de services scolaire)\s+(de\s+|des\s+|du\s+|d’)?/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const sampleFile = (kind, label) => { const content = (label || kind).toUpperCase() + ' · EXEMPLE FICTIF POUR LA DÉMO TENDERSTRIKE\n' + D.company.legalName + ' · NEQ ' + D.company.neq + ' (fictif)\nGénéré le ' + U.dayTime(S.now()) + '\n'; return { name: (label || kind).replace(/[^\w]+/g, '_') + '_' + U.isoDay(S.now()) + '_exemple.pdf', size: new Blob([content]).size, hash: U.sha256(content), type: 'application/pdf', sample: true }; };
  const F = (TS.Flow = {
    sampleFile,
    decide: (id, reason) => { const d = S.D(id); if (!d.xrayOpened) A.openXray(id); if (S.needsAcquisition(id)) F.acquire(id); if (!d.decision) A.decide(id, 'proceed', reason || 'Métier, territoire et références conformes; régler les pièces bloquantes avant la clôture.', 'marc', U.isoDay(new Date(S.nowTs() + 5 * DAY))); },
    acquire: (id) => { if (S.needsAcquisition(id)) A.acquire(id, [{ name: S.def(id).ref + '_Cahier_des_charges.pdf', size: 4820133, hash: U.sha256(S.def(id).ref + '|devis') }, { name: S.def(id).ref + '_Bordereau.xlsx', size: 48210, hash: U.sha256(S.def(id).ref + '|bordereau') }], true); },
    proposal: (id) => { F.decide(id); const O = S.oracle(id); if (O.feasible && O.zoneState !== 'in' && O.mode === 'bids') { A.propose(id); A.confirmProposal(id); } },
    price: (id) => { F.proposal(id); if (!S.priceApproved(id)) A.approvePrice(id); },
    vault: (id) => {
      const close = Date.parse(S.close(id));
      S.blockers(id).forEach((b) => {
        if (!b.fix || !/^vault:/.test(b.fix)) return;
        const kind = b.fix.slice(6);
        const until = U.isoDay(new Date(Math.max(close, S.nowTs()) + 90 * DAY));
        const v = S.bestDoc(kind);
        if (kind === 'insurance') { const r = S.requirements(id).find((x) => x.rule && x.rule.type === 'insurance'); A.vaultAdd({ kind, title: 'Assurance responsabilité civile ' + U.msShort(r ? r.rule.min : 5000000), issuer: 'Assurances Laurentides (fictive)', issued: U.isoDay(S.now()), expires: until, amount: r ? r.rule.min : 5000000, file: sampleFile(kind, 'Certificat_RC') }); }
        else if (v) A.vaultReplace(v.id, { file: sampleFile(kind, v.title), issued: U.isoDay(S.now()), expires: v.expires ? until : null });
        else A.vaultAdd({ kind, issued: U.isoDay(S.now()), expires: until, file: sampleFile(kind) });
      });
      S.compliance(id).filter((c) => c.fix && /^recheck:/.test(c.fix)).forEach((c) => A.vaultRecheck(c.fix.slice(8)));
    },
    visit: (id) => { const def = S.def(id); if (!def.visit || !def.visit.mandatory || S.bestDoc('visit', id)) return; if (S.nowTs() < Date.parse(def.visit.at)) { if (!S.D(id).visitAttendee) A.visitAssign(id, 'denis'); } else A.visitUpload(id, sampleFile('visit', 'Attestation_visite_' + def.ref)); },
    forms: (id) => {
      S.annexes(id).forEach((a) => a.fields.forEach((x) => { if (x.editable && !x.filled) { const p = S.projects().find((y) => y.id === x.editable); const who = (p.contact || 'reference').split(',')[0].trim().split(/\s+/); A.setRefEmail(id, p.id, (who[0][0] + '.' + (who[who.length - 1] || 'ref')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@' + slug(p.client) + '.example'); } }));
      if (!S.fieldStats(id).allVerified) A.verifyAll(id);
    },
    bond: (id) => {
      if (!S.hasBond(id)) return;
      if (!S.bondAccepts(id, 'cautionnement')) {
        const st = S.compliance(id).find((c) => c.req && (S.reqById(id, c.req) || {}).rule && S.reqById(id, c.req).rule.type === 'bond');
        const kind = ['cheque', 'traite', 'mandat'].some((k) => S.bondAccepts(id, k)) ? 'bondcheque' : 'bondletter';
        if (st && st.status !== 'verified') A.vaultAdd({ kind, tender: id, title: (kind === 'bondcheque' ? 'Chèque visé' : 'Lettre de garantie irrévocable') + ' · ' + S.def(id).ref, issuer: 'Institution financière (fictive)', issued: U.isoDay(S.now()), expires: '', amount: Math.ceil(S.totals(id).bondC / 10000) * 100, file: sampleFile(kind) });
        return;
      }
      const b = S.D(id).bond;
      if (b.status === 'issued' && b.cap * 100 < S.totals(id).bondC) A.bond(id, 'redo');
      ['propose', 'confirm', 'execute', 'issued'].forEach((step, i) => { const st = S.D(id).bond.status; if ([['none'], ['proposed'], ['confirmed'], ['requested']][i].includes(st)) A.bond(id, step); });
    },
    sign: (id) => {
      const d = S.D(id);
      if (!d.declSigned) { (S.def(id).declItems || []).forEach((x, i) => { if (!d.decl['d' + (i + 1)]) A.toggleDecl(id, 'd' + (i + 1)); }); A.signDecl(id); }
      S.published(id).forEach((a) => { if (!S.D(id).ack[a.id]) A.ack(id, a.id); });
    },
    approve: (id) => { F.price(id); F.vault(id); F.visit(id); F.forms(id); F.bond(id); F.sign(id); if (!S.priceApproved(id)) A.approvePrice(id); F.forms(id); if (!S.packageApproved(id) && !S.blockers(id).length) A.approvePackage(id); },
    export: (id) => {
      F.approve(id);
      let r = A.preExportCheck(id);
      if (r.offline) { A.manualCheck(id); r = A.preExportCheck(id); }
      if (r.addenda) { F.approve(id); r = A.preExportCheck(id); }
      if (r.ok && !S.exportedCurrent(id)) A.recordExport(id, 'approved');
      return r;
    },
    receipt: (id) => { F.export(id); if (!S.D(id).receipt && S.exportedCurrent(id)) A.recordReceipt(id, 'SEAO-DEMO-' + S.def(id).ref.replace(/\W/g, '').slice(-6) + '-' + String(4821 + S.state.seq).slice(-4), S.nowIso()); },
    toOpening: (id) => { const ts = Date.parse(S.opening(id)) + 5 * 60000; if (S.nowTs() < ts) A.clockTo(new Date(ts).toISOString()); },
    results: (id) => { F.receipt(id); F.toOpening(id); if (!S.D(id).results) A.publishResults(id); }
  });

  /* ---------- Scénarios ---------- */
  const at = (iso) => { if (Date.parse(iso) > S.nowTs()) A.clockTo(iso); };
  const PRESETS = [
    { id: 'initial', title: 'Vendredi 23 octobre, 7 h 30', desc: 'État de départ : six avis à des étapes différentes, dont un déjà déposé.', route: '#/brief', run: () => {} },
    { id: 'msa-ready', title: 'Mont-Saint-Aubin Nord prêt à exporter', desc: 'Prix approuvé, Revenu Québec renouvelée, garantie et signatures faites : le prochain export trouve l’addenda n° 2.', route: '#/dossier/ts-031/revue', run: () => F.approve('ts-031') },
    { id: 'msa-add2', title: 'Addenda n° 2 détecté', desc: 'Le contrôle final vient de publier l’addenda : prix et paquet périmés, accusé à signer, garantie à revoir.', route: '#/dossier/ts-031/revue', run: () => { F.approve('ts-031'); A.preExportCheck('ts-031'); } },
    { id: 'lah-opening', title: 'Lac-aux-Hérons : ouverture passée', desc: 'Horloge au 27 octobre, 11 h 15 : saisissez les résultats lus ou simulez leur publication, puis l’issue.', route: '#/dossier/ts-052/revue', run: () => at('2026-10-27T11:15:00-04:00') },
    { id: 'learning', title: 'Boucle d’apprentissage', desc: 'Mont-Saint-Aubin Nord déposé, ouvert le 5 novembre et résultats publiés : l’oracle du secteur Sud en tient compte.', route: '#/dossier/ts-034/prix', run: () => F.results('ts-031') },
    { id: 'arq-expired', title: 'Revenu Québec expirée', desc: 'Horloge au 3 novembre sans renouvellement : l’attestation est échue et bloque chaque dossier ouvert qui l’exige.', route: '#/coffre', run: () => { F.decide('ts-031'); at('2026-11-03T08:00:00-05:00'); } },
    { id: 'css-visit', title: 'Visite manquée aux Trois-Cours', desc: 'Horloge au 30 octobre sans attestation de visite : la condition devient non admissible.', route: '#/dossier/ts-044/conformite', run: () => at('2026-10-30T09:00:00-04:00') },
    { id: 'sor-acq', title: 'Sainte-Odile : documents obtenus', desc: 'Cahier des charges versé et décision prise : il manque une référence de pavage d’au moins 500 000 $.', route: '#/dossier/ts-047/conformite', run: () => F.decide('ts-047', 'Client actuel; ajouter une troisième référence de pavage avant la clôture.') },
    { id: 'pasted', title: 'Avis collé : Rivière-aux-Saules', desc: 'Un dossier créé à partir de l’avis d’exemple, extraction par règles, prêt pour la décision.', route: null, run: () => { const ex = TS.X.rules(TS.SAMPLE_NOTICE); const r = A.createTender(TS.X.buildTender(ex, { kind: 'paste', sourceLabel: 'texte collé' })); PRESETS.find((p) => p.id === 'pasted').route = '#/dossier/' + r.id + '/radiographie'; } },
    { id: 'offline', title: 'SEAO injoignable', desc: 'Mont-Saint-Aubin prêt, mais la surveillance des addenda est coupée : l’export exige une vérification manuelle.', route: '#/dossier/ts-031/revue', run: () => { F.approve('ts-031'); A.cap('offline', true); } }
  ];
  const L = (TS.Lab = { presets: PRESETS });
  L.runPreset = (pid) => {
    const p = PRESETS.find((x) => x.id === pid);
    if (!p) return { ok: false };
    if (TS.Tour && TS.Tour.active) TS.Tour.stop();
    S.reset();
    UI.view.viewers = {}; UI.view.reqFilter = {}; UI.view.annex = {}; UI.view.oracleCycle = {}; UI.view.calMonth = null;
    if (TS.V && TS.V.ntReset) TS.V.ntReset();
    p.run();
    S.state.log.push({ at: S.nowIso(), actor: 'lab', tender: null, what: 'Scénario chargé : ' + p.title, detail: p.desc, ver: '' });
    S.scan(); S.commit();
    return { ok: true, route: p.route, msg: 'Scénario « ' + p.title + ' » chargé.' };
  };

  /* ---------- Contenu du tiroir ---------- */
  const TABS = [['scen', 'Scénarios'], ['events', 'Événements'], ['clock', 'Horloge et rôle'], ['caps', 'Capacités · IA'], ['log', 'Journal'], ['data', 'Données']];
  const opt = (list, sel) => list.map(([v, l]) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(l)}</option>`).join('');
  const evBlock = (title, desc, select, act, label, extra) => `<div class="lab-ev"><h4>${esc(title)}</h4><p class="muted-note">${esc(desc)}</p>${select ? `<div class="lab-row">${select}${extra || ''}${UI.btn(label, act, { cls: 'btn-primary btn-sm' })}</div>` : '<p class="lab-none">Aucun dossier dans cet état pour le moment.</p>'}</div>`;
  const sel = (id, items) => (items.length ? `<label class="sr" for="${id}">Choisir</label><select id="${id}">${opt(items)}</select>` : '');

  L.html = () => {
    const tab = UI.view.labTab || 'scen';
    let body = '';
    if (tab === 'scen') body = `<p class="muted-note">Chaque scénario réinitialise l’espace de travail, puis rejoue les actions avec le même moteur que l’interface.</p><ul class="lab-presets">${PRESETS.map((p) => `<li><button type="button" class="lab-preset" data-act="lab-preset" data-id="${p.id}"><b>${esc(p.title)}</b><span>${esc(p.desc)}</span></button></li>`).join('')}</ul>`;
    else if (tab === 'events') {
      const notSubmitted = S.tenders().filter((t) => !S.D(t.id).receipt && !S.D(t.id).archived && Date.parse(S.close(t.id)) > S.nowTs()).map((t) => [t.id, t.buyerShort + (S.pendingAddenda(t.id).length ? ' · addenda prévu' : '')]);
      const docs = S.state.vault.filter((v) => !v.removed && !v.revoked && v.kind !== 'visit').map((v) => [v.id, v.title]);
      const deposited = S.tenders().filter((t) => S.D(t.id).receipt && !S.D(t.id).results).map((t) => [t.id, t.buyerShort + (S.nowTs() < Date.parse(S.opening(t.id)) ? ' · ouverture le ' + U.dateShort(S.opening(t.id)) : ' · ouverture passée')]);
      const asked = S.tenders().filter((t) => S.D(t.id).questions.some((q) => q.sentAt && !q.answer)).map((t) => [t.id, t.buyerShort]);
      const broker = S.tenders().filter((t) => S.D(t.id).bond.status === 'requested').map((t) => [t.id, t.buyerShort]);
      const visits = S.tenders().filter((t) => t.visit && t.visit.mandatory && !S.bestDoc('visit', t.id) && S.nowTs() >= Date.parse(t.visit.at) && S.isOpen(t.id)).map((t) => [t.id, t.buyerShort]);
      body = evBlock('Un addenda est publié', 'Publie l’addenda prévu au devis, ou en génère un (+10 % sur l’article 1). Les approbations de prix et de paquet deviennent périmées.', sel('lab-add-t', notSubmitted), 'lab-addendum', 'Publier')
        + evBlock('Une attestation est révoquée', 'L’organisme émetteur retire la pièce : chaque dossier ouvert qui l’exige est bloqué.', sel('lab-rev-v', docs), 'lab-revoke', 'Révoquer', '<label class="sr" for="lab-rev-why">Motif</label><input id="lab-rev-why" value="retirée par l’organisme émetteur (simulation)">')
        + evBlock('Les résultats d’ouverture sont publiés', 'Montants des concurrents publiés sur SEAO après l’ouverture; ils rejoignent l’historique de l’acheteur.', sel('lab-res-t', deposited), 'lab-results', 'Publier les résultats')
        + evBlock('Le donneur d’ouvrage répond à une question', 'La réponse est publiée en addenda à tous les preneurs : accusé de réception requis.', sel('lab-ans-t', asked), 'lab-answer', 'Publier la réponse')
        + evBlock('Le courtier envoie la lettre de garantie', 'La demande de garantie envoyée (simulation) reçoit sa lettre d’engagement.', sel('lab-brk-t', broker), 'lab-broker', 'Recevoir la lettre')
        + evBlock('L’attestation de visite arrive', 'Remise sur place après une visite obligatoire passée.', sel('lab-vis-t', visits), 'lab-visit', 'Verser l’attestation');
    } else if (tab === 'clock') {
      const next = S.allDeadlines().find((x) => !x.done && Date.parse(x.at) > S.nowTs());
      body = `<div class="lab-clock"><p class="lab-now">${ic('clock', 18)}<span><b>${esc(U.dayTime(S.now()))}</b><small>Horloge de démo · heure de Montréal</small></span></p>
        <div class="lab-row">${UI.btn('+1 heure', 'lab-clock', { cls: 'btn-ghost btn-sm', data: { min: 60 } })}${UI.btn('+1 jour', 'lab-clock', { cls: 'btn-ghost btn-sm', data: { min: 1440 } })}${UI.btn('+1 semaine', 'lab-clock', { cls: 'btn-ghost btn-sm', data: { min: 10080 } })}</div>
        <div class="lab-row"><label class="fld"><span>Aller à</span><input type="datetime-local" id="lab-to" value="${esc(TS.V.toLocalInput(new Date(S.nowTs() + DAY).toISOString()))}"></label>${UI.btn('Aller', 'lab-clock-to', { cls: 'btn-primary btn-sm' })}</div>
        ${next ? `<p class="muted-note">Prochaine échéance : ${esc(next.label)}${next.buyer ? ' · ' + esc(next.buyer) : ''}, ${esc(U.dayTime(next.at))}.</p>${UI.btn('Aller juste après cette échéance', 'lab-next', { cls: 'btn-ghost btn-sm', icon: 'arrow' })}` : ''}
        <p class="muted-note">L’horloge ne recule pas. Les conséquences sont réelles : attestations échues, visites et clôtures passées, rappels à 15 jours et à 48 h, ouvertures à saisir.</p></div>
        <h3 class="sec-h3">Rôle actif</h3><div class="lab-roles">${Object.values(D.people).map((x) => `<button type="button" class="pm${x.id === S.state.persona ? ' is-on' : ''}" aria-pressed="${x.id === S.state.persona}" data-act="persona" data-id="${x.id}">${UI.avatar(x.id)}<span><b>${esc(x.name)}</b><small>${esc(x.role)}</small></span></button>`).join('')}</div>`;
    } else if (tab === 'caps') {
      const c = S.state.caps;
      const tg = (k, l, dsc) => `<label class="lab-tg"><input type="checkbox" data-act-change="lab-cap" data-k="${k}"${c[k] ? ' checked' : ''}><span><b>${esc(l)}</b><small>${esc(dsc)}</small></span></label>`;
      body = `${tg('offline', 'SEAO injoignable', 'Surveillance des addenda interrompue : l’export exige une vérification manuelle documentée.')}
        ${tg('registryDown', 'Registres indisponibles (REA, RENA)', 'Les vérifications au registre deviennent « Non vérifié » au lieu de réutiliser un vieux résultat.')}
        ${tg('noClipboard', 'Presse-papiers refusé', 'La copie du texto affiche une solution de repli.')}
        <div class="lab-ai">${TS.AI.link('lab-ai-l')}<small>${esc(TS.AI.status().reason)}</small></div>
        <p class="muted-note">La clé, les budgets et les coupe-circuits vivent dans le moniteur d’API du hub; chaque appel y est compté sous « tenderstrike ». Sans clé, aucune requête ne quitte le navigateur et tout fonctionne avec les règles. Avec une clé, la radiographie d’un avis collé ou d’un PDF, « Pourquoi ce prix ? » et le brouillon de question passent par ${esc(window.LiveAI ? window.LiveAI.model : 'claude-opus-5-5')}; toute erreur ou pause retombe sur les règles, avec la raison.</p>`;
    } else if (tab === 'log') {
      const ev = S.state.log.slice(-40).reverse();
      body = `<p class="muted-note">Les 40 derniers événements du journal unique. <a href="#/journal">Ouvrir le journal complet</a></p><ol class="log log-lab">${ev.map((e) => TS.V.logRow(e)).join('')}</ol>`;
    } else if (tab === 'data') {
      body = `<div class="lab-ev"><h4>Exporter l’espace de travail</h4><p class="muted-note">Télécharge l’état complet (dossiers, coffre-fort, journal, notifications, horloge) en JSON, pour le rejouer plus tard ou sur un autre appareil.</p>${UI.btn('Exporter (.json)', 'lab-export', { cls: 'btn-primary btn-sm', icon: 'download' })}</div>
        <div class="lab-ev"><h4>Importer un espace de travail</h4><p class="muted-note">Remplace l’état actuel par un fichier exporté de TenderStrike V3. Le fichier est validé avant d’être appliqué.</p><label class="btn btn-ghost btn-sm file-btn">${ic('upload', 15)}<span>Choisir un fichier .json</span><input type="file" accept=".json,application/json" class="sr" id="lab-import" data-act-change="lab-import"></label></div>
        <div class="lab-ev"><h4>Réinitialiser</h4><p class="muted-note">Revient au vendredi 23 octobre, 7 h 30, et efface ce navigateur pour cette démo.</p>${UI.btn('Réinitialiser la démo', 'reset', { cls: 'btn-danger btn-sm', icon: 'reset' })}</div>
        <p class="muted-note">Stockage : <code>localStorage</code> « tenderstrike-v3 » · ${S.state.log.length} événements · ${Object.keys(S.state.dossiers).length} dossiers ouverts en mémoire.</p>`;
    }
    return `<aside class="lab" id="lab" role="dialog" aria-modal="false" aria-labelledby="lab-h">
      <header class="lab-h"><h2 id="lab-h">${ic('flask', 18)}Labo de test</h2><span class="lab-tag">Outil de démonstration</span><button type="button" class="icon-btn" data-act="lab-close" aria-label="Fermer le Labo de test">${ic('close', 16)}</button></header>
      <nav class="lab-tabs" aria-label="Sections du Labo">${TABS.map(([k, l]) => `<button type="button" class="lab-tab${k === tab ? ' is-on' : ''}" data-act="lab-tab" data-k="${k}" aria-pressed="${k === tab}">${esc(l)}</button>`).join('')}</nav>
      <div class="lab-b">${body}</div>
    </aside>`;
  };
})();
