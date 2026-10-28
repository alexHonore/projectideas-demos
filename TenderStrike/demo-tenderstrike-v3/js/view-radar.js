/* Écran : radar et pipeline. Chaque avis listé ouvre son dossier complet, par le même moteur. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S, UI = TS.UI;
  const esc = U.esc, ic = U.icon;
  const V = (TS.V = TS.V || {});

  const valueLine = (id) => {
    const t = S.def(id), v = t.value || { kind: 'unavailable', text: '' };
    const k = v.kind;
    const label = k === 'published' ? 'Valeur publiée' : k === 'estimated' ? 'Valeur estimée' : 'Valeur indisponible';
    let amount = '';
    if (k === 'published') amount = U.money(v.amount);
    else if (k === 'estimated') { const O = S.oracle(id); amount = O.A1 ? 'repère ' + U.msShort(O.A1) : ''; }
    return `<span class="val val-${k}"><b>${label}</b>${amount ? ' · ' + amount : ''}<small>${esc(v.text)}</small></span>`;
  };

  /* Exclusions explicites : métier non couvert, rayon. Un avis exclu reste ouvrable. */
  V.radarSets = () => {
    const included = [], excluded = [], archived = [];
    const f = S.state.radar.filter || 'all';
    S.tenders().forEach((t) => {
      if (S.D(t.id).archived) return archived.push(t);
      const why = S.excluded(t.id);
      if (why) excluded.push({ t, reason: why });
      else if (f === 'all' || t.trade === f) included.push(t);
    });
    return { included, excluded, archived };
  };

  const feedback = (t) => {
    const fb = S.state.radar.feedback[t.id];
    return `<div class="fb" role="group" aria-label="Votre retour sur cette correspondance">
      <span class="fb-q">Cette correspondance vous est-elle utile ?</span>
      ${D.feedbackCodes.map(([c, l]) => `<button type="button" class="chip${fb && fb.code === c ? ' is-on' : ''}" data-act="feedback" data-id="${t.id}" data-code="${c}" aria-pressed="${!!(fb && fb.code === c)}">${esc(l)}</button>`).join('')}
    </div>`;
  };

  /* Carte : titre, une valeur clé (échéance), un statut. Le reste s’ouvre au besoin. */
  const card = (t, featured) => {
    const id = t.id, k = S.stage(id), d = S.D(id), n = S.nextAction(id);
    const isNew = !t.custom && Date.parse(t.published + 'T12:00:00-04:00') >= S.nowTs() - 2 * 86400000;
    const hb = S.isOpen(id) ? S.hardBlockers(id) : [];
    const close = S.close(id);
    return `<article class="tcard${featured ? ' tcard-hero' : ''}" data-tender="${id}">
      <header class="tcard-h"><span class="tcard-buyer">${esc(t.buyerShort)}</span>${isNew ? UI.chip('', 'Nouveau', 'newmark') : ''}${t.custom ? UI.chip('user', 'Ajouté', 'newmark newmark-you', 'Ajouté par vous') : ''}${UI.stage(k)}${t.custom ? UI.iconBtn('trash', 'Supprimer ce dossier', 'tender-del', { t: id }, 'icon-sm') : ''}</header>
      <h3 class="tcard-t"><a href="#/dossier/${id}/radiographie">${esc(t.title)}</a></h3>
      <p class="tcard-k"><span title="Clôture : ${esc(U.dayTime(close))}">${ic('clock', 15)}${S.nowTs() < Date.parse(close) ? U.countdown(S.now(), close) : esc(U.dateShort(close))}</span>${hb.length && (d.decision || d.xrayOpened) ? `<span class="tcard-bad" title="${esc(hb.map((b) => b.label).join(' · '))}">${ic('alert', 15)}${hb.length}</span>` : ''}${d.receipt ? `<span class="tcard-ok" title="${esc(d.receipt.number)}">${ic('stamp', 15)}Reçu</span>` : ''}${featured ? `<a class="btn btn-primary btn-sm" href="${n.href}">${esc(n.label)}</a>` : ''}</p>
      <details class="tcard-more"><summary aria-label="Détails : ${esc(t.buyerShort)}">${ic('down', 14)}<span>Détails</span></summary>
        <p class="tcard-meta"><span>${ic('folder', 14)}${UI.trade(t.trade)}</span>${t.custom ? '' : `<span>${ic('pin', 14)}${t.distance} km</span>`}<span>${ic('doc', 14)}${esc(S.bundleLabel(id))}</span></p>
        ${valueLine(id)}
        <ul class="reasons">${(t.reasons || []).map((r) => `<li>${ic('check', 14)}<span>${esc(r)}</span></li>`).join('')}</ul>
        ${S.needsAcquisition(id) ? `<p class="unverified">${ic('lock', 14)}<span>Documents à obtenir sur SEAO</span></p>` : ''}
        ${hb.length && (d.decision || d.xrayOpened) ? `<p class="unverified">${ic('alert', 14)}<span>${esc(hb.map((b) => b.label.charAt(0).toLowerCase() + b.label.slice(1)).join(' · '))}</span></p>` : ''}
        <div class="tcard-f"><a class="btn btn-ghost btn-sm" href="${n.href}">${esc(n.label)}${ic('arrow', 15)}</a>${!t.custom && ['declined', 'missed', 'lost', 'cancelled', 'awarded'].includes(k) ? UI.btn('Archiver', 'archive', { cls: 'btn-link btn-sm', data: { t: id, on: '1' } }) : ''}</div>
        ${!d.receipt && !t.custom && S.isOpen(id) ? feedback(t) : ''}
      </details>
    </article>`;
  };

  const pipeline = (list) => {
    const keys = S.STAGES.map((s) => s[0]);
    const col = (id) => { const c = S.column(id); return keys.includes(c) ? c : 'result'; };
    const cols = S.STAGES.map(([k, label]) => ({ k, label, items: list.filter((t) => col(t.id) === k) }));
    return `<div class="kanban" role="list" aria-label="Pipeline des soumissions">
      ${cols.map((c) => `<section class="kcol" role="listitem" aria-label="${esc(c.label)}, ${c.items.length}">
        <h3 class="kcol-h">${esc(c.label)} <span>${c.items.length}</span></h3>
        ${c.items.map((t) => { const hb = S.isOpen(t.id) ? S.hardBlockers(t.id).length : 0; const tk = S.tasks(t.id); return `<a class="kcard" href="${S.nextAction(t.id).href}">
          <span class="kcard-b">${esc(t.buyerShort)}</span>
          <span class="kcard-t">${esc(t.title)}</span>
          <span class="kcard-m">${ic('clock', 13)}${esc(U.dateShort(S.close(t.id)))} · ${tk.filter((x) => x.done).length}/${tk.length} tâches</span>
          ${c.k === 'result' ? UI.stage(S.stage(t.id)) : ''}
          ${hb && (S.D(t.id).decision || S.D(t.id).xrayOpened) ? `<span class="kcard-flag">${ic('alert', 13)}Bloqué : ${hb} point(s)</span>` : ''}
        </a>`; }).join('') || '<p class="kempty">Aucun dossier</p>'}
      </section>`).join('')}
    </div>`;
  };

  V.radar = () => {
    const { included, excluded, archived } = V.radarSets();
    const view = S.state.radar.view, r = S.state.radar.radius, f = S.state.radar.filter || 'all';
    const feat = S.featured();
    const ordered = included.slice().sort((a, b) => (S.isOpen(b.id) ? 1 : 0) - (S.isOpen(a.id) ? 1 : 0) || Date.parse(S.close(a.id)) - Date.parse(S.close(b.id)));
    const trades = D.company.trades.filter((t) => S.tenders().some((x) => x.trade === t[0]));
    const openN = included.filter((t) => S.isOpen(t.id)).length;
    const off = S.state.caps.offline;
    return `<div class="radar">
      <div class="pagehead">
        <h1 class="page-h1">Radar <span class="cnt">${openN}</span></h1>
        ${UI.info(included.length + ' dossiers suivis, dont ' + openN + ' ouverts. Chaque avis s’ouvre en dossier complet; les exclusions sont expliquées. Plage de valeur visée : 150 k$ à 2,5 M$.', 'À propos du radar')}
        <div class="pagehead-a">
          <a class="btn btn-hl" href="#/nouveau" title="Ajouter un appel d’offres">${ic('plus', 16)}<span>Ajouter</span></a>
          <div class="seg" role="group" aria-label="Affichage">
            <button type="button" class="seg-b${view === 'list' ? ' is-on' : ''}" data-act="radar-view" data-v="list" aria-pressed="${view === 'list'}" aria-label="Liste" title="Liste">${ic('list', 16)}</button>
            <button type="button" class="seg-b${view === 'kanban' ? ' is-on' : ''}" data-act="radar-view" data-v="kanban" aria-pressed="${view === 'kanban'}" aria-label="Pipeline" title="Pipeline">${ic('columns', 16)}</button>
          </div>
        </div>
      </div>
      <div class="toolrow">
        <ul class="conns" aria-label="Sources">${D.connectors.map((c) => { const bad = c.id === 'seao' && off; return `<li class="conn2${!c.state && !bad ? ' is-ok' : bad ? ' is-bad' : ''}" title="${esc(bad ? 'Injoignable (Labo de test) : addenda non surveillés' : c.detail)}">${ic(!c.state && !bad ? 'check' : bad ? 'alert' : 'clock', 14)}<span>${esc(c.name)}</span></li>`; }).join('')}</ul>
        <label class="crit-sel" title="Métier">${ic('filter', 15)}<span class="sr">Métier</span><select data-act-change="radar-filter" aria-label="Filtrer par métier">${[['all', 'Tous les métiers']].concat(trades).map(([k, l]) => `<option value="${k}"${f === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <label class="crit-sel" title="Rayon autour du garage">${ic('pin', 15)}<span class="sr">Rayon</span><select data-act-change="radius" aria-label="Rayon de recherche">${[10, 20, 30, 60, 100].map((k) => `<option value="${k}"${k === r ? ' selected' : ''}>${k} km</option>`).join('')}</select></label>
      </div>
      ${view === 'kanban' ? pipeline(included) : `<div class="tlist">${ordered.map((t) => card(t, t.id === feat && S.isOpen(t.id))).join('') || '<p class="kempty">Aucun dossier pour ce filtre.</p>'}</div>`}
      <details class="excluded"><summary><span>Exclus</span><b>${excluded.length}</b></summary>
        <ul>${excluded.map(({ t, reason }) => `<li><div><strong>${esc(t.buyerShort)}</strong> · ${esc(t.title)}</div><p>${ic('filter', 14)}<span>${esc(reason)}</span></p><a class="btn btn-ghost btn-sm" href="#/dossier/${t.id}/radiographie">${ic('eye', 15)}<span>Ouvrir quand même</span></a></li>`).join('') || '<li class="kempty">Aucune exclusion.</li>'}</ul>
      </details>
      ${archived.length ? `<details class="excluded"><summary><span>Archivés</span><b>${archived.length}</b></summary><ul>${archived.map((t) => `<li><div><strong>${esc(t.buyerShort)}</strong> · ${esc(t.title)}<small>${esc(S.stageLabel(S.stage(t.id)))}</small></div><span class="row-act"><a class="btn btn-ghost btn-sm" href="#/dossier/${t.id}/historique">Historique</a>${UI.btn('Désarchiver', 'archive', { cls: 'btn-ghost btn-sm', data: { t: t.id, on: '' } })}</span></li>`).join('')}</ul></details>` : ''}
    </div>`;
  };
})();
