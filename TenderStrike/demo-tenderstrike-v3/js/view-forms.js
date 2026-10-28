/* Écran : formulaires pré-remplis et choix des références, pour tout dossier. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S, UI = TS.UI;
  const esc = U.esc, ic = U.icon;
  const V = (TS.V = TS.V || {});

  const meter = (fs) => {
    const ver = fs.verifiedFields, pre = fs.prefilled - ver, md = fs.manualDone, mr = fs.manual - fs.manualDone, miss = fs.missingEligible;
    const pc = (n) => (fs.total ? (n / fs.total) * 100 : 0);
    const tip = fs.prefilled + ' champs pré-remplis sur ' + fs.total + ' : ' + ver + ' revus par vous, ' + pre + ' à revoir, ' + md + ' saisis par vous, ' + miss + ' vides faute de donnée vérifiée, ' + mr + ' manuels à faire (déclarations, signatures, date). Calcul : champs pré-remplis ÷ tous les champs des annexes. Les prix unitaires, les déclarations et les signatures ne sont jamais pré-remplis; ce pourcentage n’est pas une approbation juridique.';
    return `<section class="fill-meter" aria-labelledby="fm-h">
      <h2 id="fm-h" class="sr">Mesure du pré-remplissage</h2>
      <span class="fm-big" title="Pré-rempli depuis le coffre-fort">${U.pct(fs.share, 0)}</span>
      <div class="fm-body"><div class="fm-bar" role="img" aria-label="${ver} vérifiés, ${pre} pré-remplis à revoir, ${md} manuels faits, ${mr} manuels à faire, ${miss} vides"><span class="seg-v" style="width:${pc(ver)}%"></span><span class="seg-p" style="width:${pc(pre)}%"></span><span class="seg-m" style="width:${pc(md)}%"></span><span class="seg-e" style="width:${pc(miss)}%"></span><span class="seg-r" style="width:${pc(mr)}%"></span></div>
        <p class="fm-line">${UI.chip('vault', fs.prefilled + '/' + fs.total + ' pré-remplis', '', 'Champs pré-remplis depuis le coffre-fort')}${mr ? UI.chip('pen', mr + ' à faire', 'chip-wait', 'Champs manuels : déclarations, signatures, date') : UI.chip('check', 'Manuels faits', 'chip-ok')}${miss ? UI.chip('minus', miss + ' vides', 'chip-wait', 'Faute de donnée vérifiée') : ''}${UI.info(tip, 'Comment on mesure')}</p>
      </div></section>`;
  };
  const picker = (id) => {
    const def = S.def(id), e = def.experience, sel = S.selectedProjects(id);
    const unit = e.metric === 'km' ? ' km' : e.metric === 'm2' ? ' m²' : '';
    const list = S.projects().filter((p) => p.trade === e.trade).concat(S.projects().filter((p) => p.trade !== e.trade).slice(0, 2));
    return `<div class="picker"><div class="sec-row"><h4>Références</h4>${UI.info('Le devis exige ' + e.count + ' ' + e.label + '. TenderStrike propose les projets qui passent les tests; il n’en invente jamais un de plus. Ajoutez un projet réel au coffre-fort s’il en manque.', 'Comment choisir')}</div>
      <ul class="pk-list">${list.map((p) => { const t = S.projectTest(def, p), on = sel.includes(p.id); const metricVal = e.metric === 'value' ? U.money(p.value) : U.num(S.projectMetric(p, e.metric), e.metric === 'km' ? 1 : 0) + unit; return `<li class="pk${t.ok ? '' : ' is-no'}${on ? ' is-on' : ''}" title="${esc(t.why)}">
        <label class="pk-l"><input type="checkbox" data-act-change="project" data-t="${esc(id)}" data-id="${p.id}"${on ? ' checked' : ''}${!t.ok && !on ? ' disabled' : ''}><span><b>${esc(p.client)}</b><small>${p.start.slice(0, 4)}–${p.end.slice(0, 4)}${p.created ? ' · ajouté par vous' : ''}</small></span></label>
        <span class="pk-tests"><span class="${t.tradeOk ? 'ok' : 'no'}" title="Métier">${ic(t.tradeOk ? 'check' : 'x', 13)}<span class="sr">Métier</span></span><span class="${t.inPeriod ? 'ok' : 'no'}" title="Période">${ic(t.inPeriod ? 'check' : 'x', 13)}<span class="sr">Période</span></span><span class="${t.metricOk ? 'ok' : 'no'}">${ic(t.metricOk ? 'check' : 'x', 13)}${esc(metricVal)}</span></span>
        ${UI.info(p.object + ' · ' + U.dateShort(p.start + 'T12:00:00-04:00') + ' ' + p.start.slice(0, 4) + ' au ' + U.dateShort(p.end + 'T12:00:00-04:00') + ' ' + p.end.slice(0, 4) + '. ' + t.why, 'Détails du projet')}</li>`; }).join('')}</ul>
      <p class="pk-count">${S.qualifying(id) >= e.count ? UI.status('verified', e.count + '/' + e.count + ' admissibles') : UI.status('missing', S.qualifying(id) + '/' + e.count + ' admissible(s)')} ${UI.btn('Projet', 'project-new', { cls: 'btn-link btn-sm', icon: 'plus', title: 'Ajouter un projet de référence' })}</p></div>`;
  };
  const fieldRow = (id, x) => {
    let val, tag;
    if (x.manual) { tag = '<span class="ftag ftag-you">À vous</span>'; const where = x.price ? `<a href="#/dossier/${id}/prix">Prix</a>` : `<a href="#/dossier/${id}/revue">Revue</a>`; val = x.filled ? `<span class="fv">${esc(x.value)}</span>` : `<span class="fv fv-todo">À faire · ${where}</span>`; }
    else if (!x.filled) {
      tag = '<span class="ftag ftag-miss">Vide</span>';
      if (x.editable) val = `<span class="fv-edit"><label class="sr" for="ref-email-${x.editable}">Courriel de la référence</label><input id="ref-email-${x.editable}" type="email" placeholder="courriel@exemple.ca" value="${esc(S.D(id).refEmails[x.editable] || '')}" data-ref="${x.editable}" data-t="${esc(id)}">${UI.btn('Enregistrer', 'ref-save', { cls: 'btn-ghost btn-sm', data: { t: id, p: x.editable } })}</span>`;
      else if (x.gps) val = `<span class="fv-edit"><span class="fv fv-todo">Non documenté</span>${UI.btn('Confirmer avec le loueur', 'confirm', { cls: 'btn-ghost btn-sm', data: { t: id, key: 'gps' } })}</span>`;
      else val = '<span class="fv fv-todo">À compléter</span>';
    } else { tag = x.user ? '<span class="ftag ftag-user">Saisi</span>' : '<span class="ftag ftag-vault">Coffre-fort</span>'; val = `<span class="fv">${esc(x.value)}</span>`; }
    const TAGI = { 'ftag-you': ['pen', 'À vous'], 'ftag-miss': ['minus', 'Vide'], 'ftag-user': ['user', 'Saisi par vous'], 'ftag-vault': ['vault', 'Coffre-fort'] };
    const tk = (tag.match(/ftag-(you|miss|user|vault)/) || [])[0];
    const ti = TAGI[tk] || ['info', 'Source'];
    tag = `<button type="button" class="ftag ${tk}" data-act="info" data-tip="${esc(ti[1] + ' · ' + x.prov)}" title="${esc(ti[1] + ' · ' + x.prov)}" aria-label="${esc(ti[1] + ' · source : ' + x.prov)}">${ic(ti[0], 14)}</button>`;
    return `<tr class="${x.manual ? 'is-manual' : !x.filled ? 'is-missing' : ''}"><th scope="row">${esc(x.label)}</th><td>${val}</td><td class="fsrc">${tag}</td></tr>`;
  };
  V.formulaires = (id) => {
    const fs = S.fieldStats(id), def = S.def(id), d = S.D(id);
    const cur = fs.A.find((a) => a.id === UI.view.annex[id]) || fs.A[0];
    UI.view.annex[id] = cur.id;
    const v = d.verified[cur.id];
    return `${UI.dossierHead(id, 'formulaires')}
    ${meter(fs)}
    <div class="forms">
      <nav class="annex-nav" aria-label="Annexes"><ul>${fs.A.map((a) => `<li><button type="button" class="an${a.id === cur.id ? ' is-on' : ''}" data-act="annex" data-t="${esc(id)}" data-id="${a.id}" aria-current="${a.id === cur.id}" title="${esc(a.title + ' · ' + a.prefilled + '/' + a.eligible + ' pré-remplis' + (a.manual ? ' · ' + a.manualDone + '/' + a.manual + ' à vous' : ''))}">${a.verified ? UI.status('verified', 'Revue') : a.stale ? UI.status('pending', 'Modifiée') : UI.status('pending', 'À revoir')}<span class="an-t">${esc(a.title.split(' · ')[0])}</span><span class="sr"> · ${esc(a.title.split(' · ').slice(1).join(' · '))}</span><span class="an-s">${a.prefilled}/${a.eligible}</span></button></li>`).join('')}</ul>
        ${UI.btn('Tout confirmer', 'verify-all', { cls: 'btn-ghost btn-sm', icon: 'check', disabled: fs.allVerified, data: { t: id }, title: 'Confirmer toutes les annexes revues' })}</nav>
      <article class="annex-sheet" aria-labelledby="an-h">
        <header class="as-h"><div><p class="as-k">${esc(def.ref)} · ${esc(D.company.legalName)}</p><h2 id="an-h">${esc(cur.title)}</h2></div>${cur.verified ? `<span class="stamp stamp-sm" title="${esc('Revue par ' + S.actorName(v.by) + ', ' + U.dayTime(v.at))}">Revue · ${esc(U.time(v.at))}</span>` : ''}</header>
        ${cur.id === 'D' && def.experience ? picker(id) : ''}
        <div class="as-wrap"><table class="as-t"><thead><tr><th scope="col">Champ</th><th scope="col">Valeur</th><th scope="col">Source</th></tr></thead><tbody>${cur.fields.map((x) => fieldRow(id, x)).join('') || '<tr><td colspan="3">Aucune référence choisie.</td></tr>'}</tbody></table></div>
        <footer class="as-f">${cur.stale ? UI.chip('alert', 'Modifiée depuis la revue', 'chip-wait', 'Une valeur a changé depuis la revue : confirmez de nouveau.') : ''}${UI.info('Confirmer signifie que vous avez lu ces valeurs. Les champs vides ou manuels restent signalés. Survolez une source pour voir sa provenance.', 'Ce que « confirmer » veut dire')}
          ${UI.btn(cur.verified ? 'Annexe revue' : 'Confirmer ' + cur.prefilled + ' champs', 'verify-annex', { cls: cur.verified ? 'btn-ghost' : 'btn-primary', icon: 'check', disabled: cur.verified, data: { t: id, id: cur.id }, title: 'Confirmer les ' + cur.prefilled + ' champs pré-remplis' })}</footer>
      </article>
    </div>`;
  };
})();
