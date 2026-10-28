/* Écran : oracle des prix et bordereau, génériques pour tout dossier (zone, adjudication seule, ou aucun historique). */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S, UI = TS.UI;
  const esc = U.esc, ic = U.icon;
  const V = (TS.V = TS.V || {});
  const f4 = (x) => U.num(x, 4);
  V.parseMoney = (s) => { const clean = String(s).replace(/[\s  $]/g, '').replace(',', '.'); return clean === '' ? NaN : Number(clean); };
  const unitOf = (l) => (l.a.unit === 'saison' && l.qty > 1 ? 'saisons' : l.a.unit);

  /* ---------- Corridor en haltères : publié → ajusté, une ligne par soumission ---------- */
  const shortFirm = (f) => f.replace(/^(Déneigement|Transport|Excavation|Les Entreprises|Services d’entretien|Construction|Pavages?|Asphalte|Entretien|Climatisation|Maintenance|Mécanique) /, '').replace(/ (inc\.|ltée)$/, '');
  V.corridor = (id, O) => {
    const narrow = window.matchMedia('(max-width: 640px)').matches;
    const medium = !narrow && window.matchMedia('(max-width: 1023px)').matches;
    const W = narrow ? 420 : medium ? 760 : 1180, LBL = narrow ? 0 : medium ? 200 : 240;
    const rowH = narrow ? 46 : 27, top = narrow ? 52 : 40;
    const rows = [];
    O.cycles.forEach((c) => { (c.bids || []).forEach((b) => rows.push({ c, b, adj: b.adjusted })); if (c.award) rows.push({ c, b: { firm: c.award.firm, amount: c.award.amount, status: 'award' }, adj: c.awardAdj }); });
    if (!rows.length) return `<p class="kempty">Aucun montant historique pour cet acheteur : pas de corridor. La recommandation repose sur votre coût.</p>`;
    rows.sort((x, y) => x.adj - y.adj);
    const vals = [];
    rows.forEach((r) => vals.push(r.b.amount, r.adj));
    vals.push(O.floor, O.current); if (O.zoneLo) vals.push(O.zoneLo);
    const span = Math.max(...vals) - Math.min(...vals);
    const stepBase = span > 600000 ? 100000 : span > 200000 ? 50000 : span > 60000 ? 10000 : 5000;
    const lo = Math.floor((Math.min(...vals) - stepBase / 3) / stepBase) * stepBase, hi = Math.ceil((Math.max(...vals) + stepBase / 3) / stepBase) * stepBase;
    const L = LBL + 14, R = 18;
    const x = (v) => L + ((v - lo) / (hi - lo)) * (W - L - R);
    const plotBottom = top + rows.length * rowH + 6, H = plotBottom + 40;
    const ticks = []; const step = narrow ? stepBase * 2 : stepBase;
    for (let v = lo; v <= hi; v += step) ticks.push(v);
    const fmt = (v) => (hi >= 1e6 ? U.num(v / 1e6, 2) + ' M$' : U.num(v / 1000, 0) + ' k$');
    const cur = x(O.current), fl = x(O.floor);
    const anchor = cur > W - 120 ? 'end' : cur < L + 80 ? 'start' : 'middle';
    const body = rows.map((r, i) => {
      const y = top + i * rowH + rowH / 2, nc = r.b.status === 'nonconform', aw = r.b.status === 'award';
      const a = x(r.b.amount), z = x(r.adj);
      const label = r.c.year + ' · ' + shortFirm(r.b.firm) + (r.b.you ? ' (vous)' : '') + (r.b.status === 'winner' ? ' · adjugé' : aw ? ' · adjudication seule' : '') + (nc ? ' · non conforme' : '') + (r.c.origin === 'recorded' ? ' · enregistré' : '');
      const ly = narrow ? y - 12 : y + 4, lx = narrow ? L : LBL;
      const win = r.b.status === 'winner' || aw;
      const dot = r.c.origin === 'recorded' ? `<rect class="pt-adj${r.b.you ? ' pt-you' : ''}${win ? ' pt-win' : ''}" x="${z - 6}" y="${y - 6}" width="12" height="12" rx="6" transform="rotate(45 ${z} ${y})"/>`
        : nc ? `<g class="pt-nc"><circle cx="${z}" cy="${y}" r="6.5"/><path d="M${z - 4} ${y - 4}l8 8M${z + 4} ${y - 4}l-8 8"/></g>`
        : `<circle class="pt-adj${r.b.you ? ' pt-you' : ''}${win ? ' pt-win' : ''}" cx="${z}" cy="${y}" r="${win ? 7.5 : 6.5}"/>`;
      return `<g class="row"><title>${esc(r.b.firm)}, ${r.c.year} : publié ${U.money(r.b.amount)}, ajusté ${U.money(Math.round(r.adj))}${nc ? ', non conforme' : ''}</title>
        <text class="rl${nc ? ' rl-nc' : ''}${r.b.you ? ' rl-you' : ''}" x="${lx}" y="${ly}" text-anchor="${narrow ? 'start' : 'end'}">${esc(label)}</text>
        <line class="db${nc ? ' db-nc' : ''}" x1="${a}" x2="${z}" y1="${y}" y2="${y}"/><circle class="pt-pub" cx="${a}" cy="${y}" r="4"/>${dot}</g>`;
    }).join('');
    return `<svg class="corr" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="corr-t-${id} corr-d-${id}">
      <title id="corr-t-${id}">Corridor de prix historique, total du bordereau</title>
      <desc id="corr-d-${id}">Chaque ligne relie un montant publié (point creux) à son montant ajusté en 2026 (point plein). ${O.zoneLo ? 'Zone recommandée de ' + U.money(Math.round(O.zoneLo)) + ' à ' + U.money(Math.round(O.zoneHi)) + '. ' : ''}Plancher de ${U.money(Math.round(O.floor))}; votre prix actuel ${U.money(Math.round(O.current))}.</desc>
      ${O.zoneLo && O.feasible ? `<rect class="zone" x="${x(O.zoneLo)}" y="${top - 6}" width="${Math.max(3, x(O.zoneHi) - x(O.zoneLo))}" height="${plotBottom - top + 6}" rx="2"/>` : ''}
      ${rows.map((r, i) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${top + i * rowH + rowH / 2}" y2="${top + i * rowH + rowH / 2}"/>`).join('')}
      <line class="floor" x1="${fl}" x2="${fl}" y1="${top - 10}" y2="${plotBottom}"/><text class="floor-t" x="${fl - 5}" y="${top - 14}" text-anchor="end">Plancher</text>
      ${body}
      <line class="cur" x1="${cur}" x2="${cur}" y1="${top - 22}" y2="${plotBottom}"/><text class="cur-t" x="${cur}" y="${top - 26}" text-anchor="${anchor}">Votre prix ${esc(fmt(O.current))}</text>
      <line class="axis" x1="${L}" x2="${W - R}" y1="${plotBottom}" y2="${plotBottom}"/>
      ${ticks.map((v) => `<line class="tick" x1="${x(v)}" x2="${x(v)}" y1="${plotBottom}" y2="${plotBottom + 5}"/><text class="tick-t" x="${x(v)}" y="${plotBottom + 21}" text-anchor="middle">${fmt(v)}</text>`).join('')}
    </svg>`;
  };
  /* ---------- Résultats publiés ---------- */
  const results = (id, O) => {
    if (!O.cycles.length && !S.def(id).externalComparable) return `<p class="kempty">Aucune ouverture publique importée pour cet acheteur. Après votre dépôt, enregistrez les résultats lus à l’ouverture : ils alimenteront ce tableau pour le prochain appel semblable.</p>`;
    const sel = UI.view.oracleCycle[id] || (O.cycles[0] ? O.cycles[0].id : 'ext');
    if (sel === 'ext') {
      const e = S.def(id).externalComparable;
      if (!e) return '';
      return `<div class="ext"><p><b>${esc(e.buyer)}</b> · ${esc(e.ref)} · ${e.year}</p><p>Adjugé à ${esc(e.firm)} pour <b>${U.money(e.award)}</b>. Les autres soumissions ne sont pas publiées dans la couverture.</p><p class="ext-why">${ic('filter', 14)}<span>${esc(e.why)}</span></p></div>`;
    }
    const c = O.cycles.find((x) => x.id === sel) || O.cycles[0];
    if (c.award) return `<div class="ext"><p><b>${esc(c.ref)}</b> · ${c.year} · ${esc(c.scopeNote || '')}</p><p>Adjugé à ${esc(c.award.firm)} pour <b><button type="button" class="amt" data-act="record" data-t="${esc(id)}" data-cycle="${esc(c.id)}" data-firm="${esc(c.award.firm)}">${U.money(c.award.amount)}</button></b>, soit ${U.money(Math.round(c.awardAdj))} ajusté en 2026 (× ${f4(c.factor)}).</p><p class="ext-why">${ic('info', 14)}<span>${esc(c.note)} Aucun deuxième prix n’est inventé : sans soumissions perdantes, pas d’écart habituel ni de zone.</span></p></div>`;
    const win = c.winner;
    let rank = 0;
    return `<table class="res"><caption class="sr">Résultats publiés de l’ouverture ${c.year}</caption>
      <thead><tr><th scope="col">Rang</th><th scope="col">Soumissionnaire</th><th scope="col" class="num">Montant publié</th><th scope="col" class="num">Écart au gagnant</th><th scope="col" class="num">Ajusté 2026</th></tr></thead>
      <tbody>${c.bids.slice().sort((a, b) => a.amount - b.amount).map((b) => {
        const nc = b.status === 'nonconform'; if (!nc) rank += 1;
        return `<tr class="${nc ? 'is-nc' : ''}${b.you ? ' is-you' : ''}${b.status === 'winner' ? ' is-win' : ''}">
          <td class="rk">${nc ? '—' : rank}</td>
          <td class="fm"><span class="firm">${esc(b.firm)}${b.you ? ' <em>(vous)</em>' : ''}</span>${nc ? `<small class="nc-why">${ic('x', 12)}Non conforme : ${esc(b.why)}</small>` : b.status === 'winner' ? '<small>Adjugé' + (c.origin === 'recorded' ? ' (plus bas, conformité à confirmer)' : '') + '</small>' : ''}</td>
          <td class="num" data-l="Publié"><button type="button" class="amt" data-act="record" data-t="${esc(id)}" data-cycle="${esc(c.id)}" data-firm="${esc(b.firm)}" aria-label="Voir la source publique du montant ${U.money(b.amount)}">${U.money(b.amount)}</button></td>
          <td class="num" data-l="Écart">${nc ? 'exclu' : b === win ? '—' : U.signedPct((b.amount - win.amount) / win.amount)}</td>
          <td class="num adj" data-l="Ajusté 2026">${U.money(Math.round(b.adjusted))}</td></tr>`;
      }).join('')}</tbody></table>
      <p class="res-src">${ic('doc', 14)}<span>${esc(c.source)} · ${esc(c.retrieved)}. ${esc(c.note)}</span></p>`;
  };

  /* ---------- Recommandation expliquée ---------- */
  const zoneChip = (O) => {
    if (O.mode !== 'bids') return O.vsA1 != null ? `<span class="st st-muted">${ic('info', 14)}<span>${U.signedPct(O.vsA1)} par rapport à l’adjudication ajustée</span></span>` : '';
    const m = { above: ['wait', 'Au-dessus de la zone de ' + U.pct((O.current - O.zoneHi) / O.zoneHi)], in: ['ok', 'Dans la zone'], below: ['wait', 'Sous la zone : marge abandonnée'], 'below-floor': ['bad', 'Sous votre plancher de marge'], infeasible: ['bad', 'Votre coût dépasse le repère'] }[O.zoneState];
    return `<span class="st st-${m[0]}">${ic(m[0] === 'ok' ? 'check' : 'alert', 14)}<span>${esc(m[1])}</span></span>`;
  };
  V.whyRules = (id) => {
    const O = S.oracle(id), def = S.def(id);
    if (O.mode === 'bids') return 'Votre prix de ' + U.money(Math.round(O.current)) + ' se compare au gagnant de ' + O.recent.year + ' (' + O.recent.winner.firm + ', ' + U.money(O.recent.winner.amount) + '), ramené aux quantités et aux prix de 2026 : ' + U.money(Math.round(O.A1)) + '. Le deuxième était en moyenne à ' + U.pct(O.meanSpread) + ' du gagnant; viser sous le repère de plus de la moitié de cet écart abandonne de la marge sans gain de rang observé. La zone va donc de ' + U.money(Math.round(O.zoneLo)) + ' à ' + U.money(Math.round(O.zoneHi)) + ', au-dessus de votre plancher de ' + U.money(Math.round(O.floor)) + ' (coût + ' + U.pct(def.minMargin, 0) + ' de marge). ' + (O.zoneState === 'in' ? 'Vous êtes dans la zone.' : O.zoneState === 'above' ? 'Vous êtes au-dessus : à ce prix, vous auriez été ' + O.rank + (O.rank === 1 ? 'er' : 'e') + ' en ' + O.recent.year + '.' : 'Vous êtes sous la zone : vous laissez probablement de la marge.') + ' Ce n’est pas une probabilité : personne ne sait qui soumissionnera cette année.';
    if (O.mode === 'award') return 'Seule l’adjudication de ' + (O.refCycle ? O.refCycle.year : '') + ' est publiée (' + (O.refCycle && O.refCycle.award ? O.refCycle.award.firm : '') + '), ajustée à ' + U.money(Math.round(O.A1)) + '. Sans soumissions perdantes, on ne connaît pas l’écart habituel : aucune zone n’est calculée. La cible proposée est votre coût plus ' + U.pct((def.minMargin || 0.1) + 0.04, 0) + ' de marge, soit ' + U.money(Math.round(O.target)) + '. Votre prix actuel est ' + (O.vsA1 > 0 ? 'au-dessus' : 'au-dessous') + ' de l’adjudication ajustée de ' + U.pct(Math.abs(O.vsA1)) + '.';
    return 'Aucun historique pour cet acheteur : la cible est votre coût plus ' + U.pct((def.minMargin || 0.1) + 0.04, 0) + ' de marge, soit ' + U.money(Math.round(O.target)) + '. Enregistrez les résultats de l’ouverture après votre dépôt pour nourrir le prochain appel semblable.';
  };
  const reco = (id, O) => {
    const d = S.D(id), def = S.def(id), p = d.proposal, proposed = p && p.status === 'proposed';
    const why = UI.view['why_' + id];
    let steps;
    if (O.mode === 'bids') {
      const c = O.recent, c2 = O.cycles.filter((x) => x.spread != null);
      steps = `<li><b>Repère.</b> Gagnant conforme de ${c.year} : ${U.money(c.winner.amount)} × portée ${f4(c.scope)} × inflation ${f4(c.infl)} (${esc(D.indices[d.inflation].short)}) = <b>${U.money(Math.round(O.A1))}</b>.</li>
        <li><b>Écart habituel.</b> Le 2<sup>e</sup> conforme était à ${c2.map((x) => U.signedPct(x.spread) + ' en ' + x.year).join(', ')}, soit ${U.pct(O.meanSpread)} en moyenne.</li>
        <li><b>Zone.</b> Du repère moins la moitié de cet écart (${U.pct(O.meanSpread / 2)}) jusqu’au repère : passer plus bas abandonne de la marge sans gain de rang observé.</li>
        <li><b>Plancher.</b> Votre coût interne de ${U.money(Math.round(O.T.costC / 100))} ÷ (1 − ${U.pct(def.minMargin, 0)} de marge minimale) = ${U.money(Math.round(O.floor))}. ${O.floor < O.zoneLo ? 'La zone reste au-dessus.' : 'Le plancher relève le bas de la zone.'}</li>
        ${O.refInternal.length ? `<li><b>Articles sans historique.</b> ${O.refInternal.map((l) => 'Article ' + l.a.n).join(', ')} : pondérés dans la portée avec un prix de référence interne, signalé comme tel.</li>` : ''}`;
    } else steps = `<li><b>Historique.</b> ${O.mode === 'award' ? 'Adjudication seulement : aucun écart 1er-2e connu.' : 'Aucun cycle comparable.'}</li><li><b>Cible.</b> Coût interne ${U.money(Math.round(O.T.costC / 100))} ÷ (1 − ${U.pct((def.minMargin || 0.1) + 0.04, 0)}) = ${U.money(Math.round(O.target))}.</li><li><b>Plancher.</b> ${U.money(Math.round(O.floor))} (marge minimale de ${U.pct(def.minMargin || 0.1, 0)}).</li>`;
    const rankTip = 'À ' + U.money(Math.round(O.current)) + ', vous auriez été ' + O.rank + (O.rank === 1 ? 'er' : 'e') + ' sur ' + O.rankOf + ' soumissions conformes de ' + (O.recent ? O.recent.year : '') + ' ajustées, et sous ' + O.below + ' des ' + (O.conformAll || []).length + ' soumissions conformes observées. Aucune probabilité de gain : quelques soumissions sur un ou deux cycles ne permettent pas de l’estimer, et personne ne sait qui soumissionnera cette année.';
    const ai = TS.AI.on();
    return `<section class="reco" aria-labelledby="reco-h">
      <div class="reco-top"><h2 id="reco-h" class="reco-l">${O.mode === 'bids' ? 'Zone recommandée' : 'Cible de prix'}</h2>${UI.info(O.mode === 'bids' ? 'Total du bordereau avant taxes, comparé aux ouvertures publiques du même acheteur ramenées à 2026.' : 'Cible fondée sur votre coût interne : aucun écart entre soumissionnaires n’est publié pour cet acheteur.', 'Comment lire')}</div>
      <p class="reco-range">${O.mode === 'bids' ? (O.feasible ? U.money(Math.round(O.zoneLo)) + ' à ' + U.money(Math.round(O.zoneHi)) : 'Aucune zone rentable') : U.money(Math.round(O.target))}</p>
      <div class="reco-cur"><span>Votre prix</span><b>${U.money(Math.round(O.current))}</b>${zoneChip(O)}${O.mode === 'bids' ? `<span class="reco-rank" title="${esc(rankTip)}">${ic('chart', 14)}<b>${O.rank}<sup>${O.rank === 1 ? 'er' : 'e'}</sup>/${O.rankOf}</b><span class="sr"> en ${O.recent.year}</span></span>${UI.info(rankTip, 'Lecture historique')}` : ''}</div>
      ${proposed ? proposalCard(id) : `<div class="reco-act">${UI.btn(O.zoneState === 'in' ? 'Proposer le milieu' : 'Proposer un ajustement', 'propose', { cls: 'btn-hl', icon: 'pen', disabled: !O.feasible || !S.can('price') || !!d.receipt, data: { t: id }, title: O.zoneState === 'in' ? 'Proposer le milieu de la zone' : 'Proposer un ajustement vers la cible' })}${UI.btn('Pourquoi ?', 'why', { cls: 'btn-ghost-inv btn-sm', icon: 'q', data: { t: id }, title: 'Pourquoi ce prix ? (règles)' })}${ai ? UI.btn('IA', 'why-ai', { cls: 'btn-ghost-inv btn-sm', icon: 'bolt', data: { t: id }, title: 'Expliquer avec l’IA en direct' }) : ''}${TS.AI.link('ai-inv', true)}${p && p.status === 'applied' ? UI.chip('check', 'Appliquée ' + U.time(p.appliedAt), 'chip-inv') : ''}</div>`}
      <div class="why" aria-live="polite">${why ? `<p class="why-t">${esc(why.text)}</p><p class="why-m">${UI.prov(why.provenance)}${why.fallback ? ' · ' + esc(why.fallback) : ''}</p><ol class="reco-steps">${steps}</ol>` : ''}</div>
    </section>`;
  };
  const proposalCard = (id) => {
    const p = S.D(id).proposal;
    const before = S.oracle(id), after = S.oracle(id, p.to);
    return `<article class="pcard" aria-labelledby="pc-h-${id}">
      <ol class="pcs" aria-label="Étapes de la proposition"><li class="is-on">Proposé</li><li>Confirmé</li><li>Exécuté</li></ol>
      <h3 id="pc-h-${id}">Ajuster chaque prix unitaire d’un même coefficient (${U.num(p.ratio, 4)})</h3>
      <table class="pc-t"><thead><tr><th scope="col">Article</th><th scope="col" class="num">Avant</th><th scope="col" class="num">Après</th></tr></thead>
      <tbody>${S.articles(id).map((a) => `<tr><td>${a.n}. ${esc(a.label)}</td><td class="num">${U.cents(p.from[a.code])}</td><td class="num">${U.cents(p.to[a.code])}</td></tr>`).join('')}</tbody></table>
      <ul class="pc-cons"><li>Total avant taxes : ${U.cents(before.T.htC, 0)} → <b>${U.cents(after.T.htC, 0)}</b></li><li>Marge brute : ${U.pct(before.T.margin)} → <b>${U.pct(after.T.margin)}</b></li>${S.hasBond(id) ? `<li>Garantie requise : ${U.cents(before.T.bondC, 0)} → ${U.cents(after.T.bondC, 0)}</li>` : ''}<li>Conséquence : une approbation de prix existante deviendra périmée.</li></ul>
      <div class="pc-act">${UI.btn('Confirmer et appliquer', 'proposal-confirm', { cls: 'btn-primary', icon: 'check', data: { t: id } })}${UI.btn('Rejeter', 'proposal-reject', { cls: 'btn-ghost', data: { t: id } })}${UI.info('Les prix restent votre décision : vous pouvez aussi modifier chaque prix unitaire dans le bordereau.', 'À savoir')}</div>
    </article>`;
  };

  const assumptions = (id, O) => {
    const k = S.D(id).inflation;
    if (!O.cycles.length) return '';
    return `<details class="fold assume" id="hypotheses"><summary>${ic('filter', 16)}<span>Hypothèses</span><small>${esc(D.indices[k].short || D.indices[k].label)}</small></summary>
      <div class="or-grid2"><fieldset class="idx"><legend>Ajustement de l’inflation</legend>
        ${['ipc', 'composite', 'none', 'manual'].map((o) => `<label class="idx-o" title="${esc(D.indices[o].detail)}"><input type="radio" name="infl-${id}" value="${o}"${o === k ? ' checked' : ''} data-act-change="inflation" data-t="${esc(id)}"><span><b>${esc(D.indices[o].label)}</b></span>${o === 'manual' ? `<span class="idx-rate"><input type="number" step="0.1" min="-5" max="15" value="${esc(S.D(id).manualRate)}" aria-label="Taux annuel en pour cent" data-act-change="manual-rate" data-t="${esc(id)}"> % par an</span>` : ''}</label>`).join('')}
      </fieldset>
      <div><div class="sec-row"><h3 class="sec-h3">Facteurs appliqués</h3>${UI.info('Portée = quantités de 2026 ÷ quantités du cycle, pondérées par des prix unitaires de référence. Changer d’hypothèse modifie seulement le scénario : les montants publiés restent intacts.', 'Comment c’est calculé')}</div><table class="factors"><caption class="sr">Facteurs appliqués</caption><thead><tr><th scope="col">Cycle</th><th scope="col" class="num">Portée</th><th scope="col" class="num">Inflation</th><th scope="col" class="num">Total</th></tr></thead>
        <tbody>${O.cycles.map((c) => `<tr><td>${c.year} · ${esc(c.ref)}${c.origin === 'recorded' ? ' (enregistré)' : ''}</td><td class="num">× ${f4(c.scope)}</td><td class="num">× ${f4(c.infl)}</td><td class="num"><b>× ${f4(c.factor)}</b></td></tr>`).join('')}</tbody></table></div></div></details>`;
  };
  const competitors = (id) => {
    const def = S.def(id);
    const rec = S.state.openings.filter((o) => o.family === def.family && o.tender !== id);
    const list = (def.competitors || []).slice();
    rec.forEach((o) => o.bids.filter((b) => !b.you).forEach((b) => { const x = list.find((c) => c.firm === b.firm); if (x) { x.note = (x.note || '') + ' Présent en 2026 (' + o.ref + ').'; } else list.push({ firm: b.firm, seen: 1, of: 1, wins: b.status === 'winner' ? 1 : 0, note: 'Observé à l’ouverture enregistrée ' + o.ref + '.' }); }));
    return `<section class="compobs" aria-labelledby="co-h"><div class="sec-row"><h3 id="co-h" class="sec-h3">Concurrents observés</h3>${UI.info('Observation historique, pas une liste des soumissionnaires de cette année. ' + (def.coverage || ''), 'À savoir')}</div>
      ${list.length ? `<ul>${list.map((c) => `<li title="${esc(c.note)}"><span class="co-n">${esc(c.firm)}</span><span class="co-c"><b>${c.seen}/${c.of}</b>${c.wins ? ' · ' + ic('check', 12) + c.wins : ''}</span></li>`).join('')}</ul>` : '<p class="kempty">Aucun concurrent observé.</p>'}</section>`;
  };

  /* ---------- Bordereau ---------- */
  V.scenarios = (T) => {
    const calc = (fn) => { let rev = 0, cost = 0; T.lines.forEach((l) => { const r = fn(l); rev += r[0]; cost += r[1]; }); return { m: rev ? (rev - cost) / rev : 0 }; };
    return [
      ['Base', 'Quantités du bordereau', calc((l) => [l.totalC, l.costC])],
      ['Volumes +20 %', 'Articles payés au mesuré +20 %; coûts fixes des autres articles +12 %', calc((l) => (l.a.measured ? [l.totalC * 1.2, l.costC * 1.2] : [l.totalC, l.costC * 1.12]))],
      ['Carburant +15 %', 'Carburant à 22 % des coûts : +3,3 % sur tous les articles', calc((l) => [l.totalC, l.costC * 1.033])],
      ['Volumes −20 %', 'Articles payés au mesuré −20 %; une part de leurs coûts reste fixe', calc((l) => (l.a.measured ? [l.totalC * 0.8, l.costC * 0.82] : [l.totalC, l.costC]))]
    ];
  };
  V.bordFoot = (id, T) => `<div class="bf-grid"><dl class="bf-tot">
      <div><dt>Sous-total avant taxes</dt><dd>${U.cents(T.htC)}</dd></div><div><dt>TPS 5 %</dt><dd>${U.cents(T.tpsC)}</dd></div><div><dt>TVQ 9,975 %</dt><dd>${U.cents(T.tvqC)}</dd></div>
      <div class="bf-ttc"><dt>Total, taxes incluses</dt><dd>${U.cents(T.ttcC)}</dd></div>
      ${S.hasBond(id) ? `<div><dt>Garantie de soumission ${S.bondLabel(id)}</dt><dd>${U.cents(T.bondC)}</dd></div>` : ''}
      <div><dt>Marge brute (coût interne)</dt><dd>${U.cents(T.marginC, 0)} · ${U.pct(T.margin)}</dd></div></dl>
      <table class="scen"><caption>Marge selon le scénario</caption><tbody>${V.scenarios(T).map(([n, dsc, r]) => `<tr><th scope="row">${esc(n)}<small>${esc(dsc)}</small></th><td class="num ${r.m < (S.def(id).minMargin || 0.1) ? 'is-low' : ''}">${U.pct(r.m)}</td></tr>`).join('')}</tbody></table></div>`;
  const bordereau = (id) => {
    const T = S.totals(id), def = S.def(id), d = S.D(id);
    const canP = S.can('price') && !d.receipt;
    return `<section class="bord" aria-labelledby="bo-h" id="bordereau">
      <div class="sec-row"><h2 id="bo-h" class="sec-h">Bordereau</h2>${UI.chip('doc', S.bundleLabel(id).replace('Devis v1 + ', '').replace('Devis v1', 'Version originale'), '', 'Version du devis prise en compte')}${UI.chip('lock', 'Coûts privés', '', 'Les coûts internes restent privés et ne sont jamais exportés.')}${d.receipt ? UI.chip('lock', 'Figé', 'chip-wait', 'Dossier déposé : bordereau figé.') : ''}${UI.info('Saisissez vos prix unitaires (champs surlignés) et vos coûts internes : TenderStrike ne remplit jamais les prix pour vous. Arrondi au cent par ligne, comme sur le formulaire officiel.', 'Comment saisir')}</div>
      <div class="bord-wrap"><table class="bord-t">
        <thead><tr><th scope="col">Art.</th><th scope="col">Description</th><th scope="col" class="num">Quantité</th><th scope="col" class="num">Coût interne</th><th scope="col" class="num">Prix unitaire</th><th scope="col" class="num">Total</th><th scope="col" class="num">Marge</th>${def.custom ? '<th scope="col"><span class="sr">Actions</span></th>' : ''}</tr></thead>
        <tbody>${T.lines.map((l) => `<tr class="${l.changed ? 'is-changed' : ''}" data-line="${l.a.code}">
          <td data-l="Article">${l.a.n}</td>
          <td data-l="Description"><span class="bd-d">${esc(l.a.label)}</span>${l.changed ? `<small class="chg">${ic('alert', 12)}Addenda : ${U.num(l.before, l.a.decimals)} → ${U.num(l.qty, l.a.decimals)} ${esc(l.a.unit)}</small>` : l.a.note ? `<small>${esc(l.a.note)}</small>` : l.a.measured ? '<small>Payé au mesuré</small>' : ''}</td>
          <td data-l="Quantité" class="num">${U.num(l.qty, l.a.decimals)} <small>${esc(unitOf(l))}</small></td>
          <td data-l="Coût interne" class="num"><label class="sr" for="co-${id}-${l.a.code}">Coût interne, article ${l.a.n}</label><input class="cin" id="co-${id}-${l.a.code}" type="text" inputmode="decimal" autocomplete="off" value="${U.num(l.costU, 2)}" data-cost="${l.a.code}" data-t="${esc(id)}"${canP ? '' : ' readonly'}></td>
          <td data-l="Prix unitaire" class="num"><label class="sr" for="pr-${id}-${l.a.code}">Prix unitaire, article ${l.a.n}</label><input class="pin" id="pr-${id}-${l.a.code}" type="text" inputmode="decimal" autocomplete="off" value="${U.num(l.priceC / 100, 2)}" data-price="${l.a.code}" data-t="${esc(id)}"${canP ? '' : ' readonly'}></td>
          <td data-l="Total" class="num" id="lt-${id}-${l.a.code}">${U.cents(l.totalC)}</td>
          <td data-l="Marge" class="num ${l.marginRate < (def.minMargin || 0.1) ? 'is-low' : ''}" id="lm-${id}-${l.a.code}">${U.pct(l.marginRate)}</td>
          ${def.custom ? `<td data-l="Actions" class="row-act">${UI.btn('Modifier', 'line-edit', { cls: 'btn-link btn-sm', data: { t: id, code: l.a.code }, disabled: !canP })}${UI.btn('Supprimer', 'line-del', { cls: 'btn-link btn-sm', data: { t: id, code: l.a.code }, disabled: !canP || T.lines.length <= 1 })}</td>` : ''}
        </tr>`).join('')}</tbody></table></div>
      ${def.custom ? `<div class="fix-row">${UI.btn('Ajouter un article', 'line-new', { cls: 'btn-ghost btn-sm', icon: 'plus', data: { t: id }, disabled: !canP })}${UI.info('Recopiez les articles du bordereau officiel (quantités du donneur d’ouvrage).', 'À savoir')}</div>` : ''}
      <div id="bord-foot-${id}">${V.bordFoot(id, T)}</div>
      ${approval(id)}
    </section>`;
  };
  const approval = (id) => {
    const d = S.D(id), pa = d.priceApproval, ok = S.priceApproved(id), T = S.totals(id);
    if (ok) return `<div class="approve-price is-ok"><span class="stamp">Prix approuvé</span><span class="ap-by">${UI.avatar(pa.by, 'sm')}${U.cents(pa.ht, 0)}</span>${UI.info('Par ' + S.actorName(pa.by) + ', ' + U.dayTime(pa.at) + ' · ' + U.cents(pa.ht) + ' avant taxes · ' + S.bundleLabel(id) + '. Toute modification de prix ou de quantité annulera cette approbation.', 'Détails de l’approbation')}</div>`;
    return `<div class="approve-price${pa ? ' is-stale' : ''}">${pa ? `<p class="stale">${ic('alert', 16)}<span>Approbation périmée</span>${UI.info('L’approbation de ' + U.time(pa.at) + ' (' + U.cents(pa.ht, 0) + ') ne couvre plus ce bordereau : ' + (pa.bundle !== S.bundleKey(id) ? 'un addenda a changé les quantités' : 'des prix ont changé') + '.', 'Pourquoi')}</p>` : ''}
      ${UI.btn(pa ? 'Approuver de nouveau' : 'Approuver le prix', 'approve-price', { cls: 'btn-primary', icon: 'stamp', disabled: !S.can('approvePrice') || !!d.receipt, data: { t: id }, title: S.can('approvePrice') ? 'Approbation commerciale de ' + U.cents(T.htC) + ' avant taxes, marge de ' + U.pct(T.margin) : 'Réservée à la propriétaire' })}<span class="ap-sum">${U.cents(T.htC, 0)} · ${U.pct(T.margin)}</span></div>`;
  };

  V.prix = (id) => {
    const O = S.oracle(id), def = S.def(id);
    const sel = UI.view.oracleCycle[id] || (O.cycles[0] ? O.cycles[0].id : 'ext');
    const segs = O.cycles.map((c) => [c.id, String(c.year) + (c.origin === 'recorded' ? ' · enregistré' : '')]).concat(def.externalComparable ? [['ext', 'Autre acheteur']] : []);
    const nBids = O.cycles.reduce((n, c) => n + (c.bids ? c.bids.length : c.award ? 1 : 0), 0);
    return `${UI.dossierHead(id, 'prix')}
    <div class="oracle">
      ${reco(id, O)}
      <details class="fold oracle-results" id="historique-prix"><summary>${ic('chart', 16)}<span>Ouvertures publiques</span><small>${O.cycles.length ? O.cycles.map((c) => c.year).join(' · ') + ' · ' + nBids + ' montants' : def.externalComparable ? 'autre acheteur' : 'aucune'}</small></summary>
        <div class="sec-row"><h2 id="or-h" class="sec-h3">${O.mode === 'award' ? 'Adjudication seule' : 'Même acheteur'}</h2>
          ${segs.length > 1 ? `<div class="seg" role="group" aria-label="Cycle affiché">${segs.map(([k, l]) => `<button type="button" class="seg-b${sel === k ? ' is-on' : ''}" data-act="oracle-cycle" data-t="${esc(id)}" data-c="${k}" aria-pressed="${sel === k}">${esc(l)}</button>`).join('')}</div>` : ''}</div>
        ${results(id, O)}
        <div class="corr-box"><div class="sec-row"><h3 class="sec-h3">Corridor et votre prix</h3>${O.cycles.length ? UI.info('Chaque ligne relie un montant publié (point creux) à son montant ajusté en 2026 (point plein). Bande : zone recommandée. Trait : votre plancher (coût + marge minimale). Losange : résultat enregistré par vous. Croix : non conforme, exclu.', 'Légende') : ''}</div><div id="corridor-${id}">${V.corridor(id, O)}</div></div>
        ${competitors(id)}
      </details>
      ${assumptions(id, O)}
      ${bordereau(id)}
    </div>`;
  };

  V.recordDialog = (id, cycleId, firm) => {
    const O = S.oracle(id), c = O.cycles.find((x) => x.id === cycleId);
    const b = c.bids ? c.bids.find((x) => x.firm === firm) : { firm: c.award.firm, amount: c.award.amount, status: 'award', adjusted: c.awardAdj };
    return `<dl class="rec">
      <div><dt>Appel d’offres</dt><dd>${esc(c.ref)} · ${esc(c.buyer || S.def(id).buyer)} · ${c.seasons || ''} ${c.seasons > 1 ? 'saisons' : ''}</dd></div>
      <div><dt>Type de donnée</dt><dd>${b.status === 'award' ? 'Montant adjugé (résolution), et non prix d’ouverture' : 'Prix lu à l’ouverture publique, et non montant adjugé ou dépensé'}</dd></div>
      <div><dt>Ouverture</dt><dd>${esc(c.opened || '')}</dd></div><div><dt>Soumissionnaire</dt><dd>${esc(b.firm)}</dd></div>
      <div><dt>Montant publié</dt><dd><b>${U.money(b.amount)}</b> avant taxes</dd></div>
      <div><dt>Conformité</dt><dd>${b.status === 'nonconform' ? 'Non conforme : ' + esc(b.why) : b.status === 'winner' ? 'Conforme, adjugé' : b.status === 'award' ? 'Adjugé' : 'Conforme'}</dd></div>
      <div><dt>Source</dt><dd>${esc(c.source)}<br><small>${esc(c.retrieved)}</small></dd></div>
      <div><dt>Scénario 2026</dt><dd>${U.money(b.amount)} × ${f4(c.factor)} = ${U.money(Math.round(b.adjusted))} <small>(calcul, pas un fait publié)</small></dd></div></dl>`;
  };
  V.lineDialog = (id, code) => {
    const a = code ? S.def(id).articles.find((x) => x.code === code) : null;
    const price = a ? S.D(id).prices[code] / 100 : '';
    return `<form class="frm" data-form="line" data-t="${esc(id)}" data-code="${esc(code || '')}">
      <label class="fld fld-wide"><span>Description</span><input name="label" required value="${esc(a ? a.label : '')}" placeholder="Ex. : Déneigement de 12 stationnements"></label>
      <label class="fld"><span>Unité</span><input name="unit" value="${esc(a ? a.unit : 'unité')}"></label>
      <label class="fld"><span>Quantité</span><input name="qty" type="number" step="0.1" min="0" required value="${a ? a.qty : ''}"></label>
      <label class="fld"><span>Coût interne unitaire</span><input name="cost" type="number" step="0.01" min="0" required value="${a ? a.cost : ''}"></label>
      <label class="fld"><span>Prix unitaire</span><input name="price" type="number" step="0.01" min="0" required value="${price}"></label>
      <div class="dlg-actions fld-wide"><button type="button" class="btn btn-ghost" data-act="dlg-close">Annuler</button><button type="submit" class="btn btn-primary">${a ? 'Enregistrer' : 'Ajouter l’article'}</button></div></form>`;
  };
})();
