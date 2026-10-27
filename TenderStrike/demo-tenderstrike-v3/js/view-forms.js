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
    return `<section class="fill-meter" aria-labelledby="fm-h">
      <div class="fm-num"><span class="fm-big">${U.pct(fs.share, 0)}</span><span class="fm-cap">du dossier pré-rempli depuis le coffre-fort</span></div>
      <div class="fm-body"><h2 id="fm-h" class="sr">Mesure du pré-remplissage</h2>
        <p class="fm-line"><b>${fs.prefilled}</b> champs pré-remplis sur <b>${fs.total}</b>. ${mr ? 'Il vous reste ' + mr + (mr > 1 ? ' champs manuels' : ' champ manuel') + ' sur ' + fs.manual + ' (déclarations, signatures, date)' : 'Tous les champs manuels sont faits'}${miss ? ', et ' + miss + (miss > 1 ? ' champs vides' : ' champ vide') + ' faute de donnée vérifiée' : ''}.</p>
        <div class="fm-bar" role="img" aria-label="${ver} vérifiés, ${pre} pré-remplis à revoir, ${md} manuels faits, ${mr} manuels à faire, ${miss} vides"><span class="seg-v" style="width:${pc(ver)}%"></span><span class="seg-p" style="width:${pc(pre)}%"></span><span class="seg-m" style="width:${pc(md)}%"></span><span class="seg-e" style="width:${pc(miss)}%"></span><span class="seg-r" style="width:${pc(mr)}%"></span></div>
        <ul class="fm-legend"><li><i class="seg-v"></i>Revus par vous · ${ver}</li><li><i class="seg-p"></i>Pré-remplis à revoir · ${pre}</li><li><i class="seg-m"></i>Saisis par vous · ${md}</li><li><i class="seg-e"></i>Vides · ${miss}</li><li><i class="seg-r"></i>À faire · ${mr}</li></ul>
        <p class="muted-note">Calcul : champs pré-remplis ÷ tous les champs des annexes. Les prix unitaires, les déclarations et les signatures ne sont jamais pré-remplis; ce pourcentage n’est pas une approbation juridique.</p>
      </div></section>`;
  };
  const picker = (id) => {
    const def = S.def(id), e = def.experience, sel = S.selectedProjects(id);
    const unit = e.metric === 'km' ? ' km' : e.metric === 'm2' ? ' m²' : '';
    const list = S.projects().filter((p) => p.trade === e.trade).concat(S.projects().filter((p) => p.trade !== e.trade).slice(0, 2));
    return `<div class="picker"><h4>Choix des références</h4>
      <p class="muted-note">Le devis exige ${e.count} ${esc(e.label)}. TenderStrike propose les projets qui passent les tests; il n’en invente jamais un de plus. Ajoutez un projet réel au <a href="#/coffre">coffre-fort</a> s’il en manque.</p>
      <ul class="pk-list">${list.map((p) => { const t = S.projectTest(def, p), on = sel.includes(p.id); const metricVal = e.metric === 'value' ? U.money(p.value) : U.num(S.projectMetric(p, e.metric), e.metric === 'km' ? 1 : 0) + unit; return `<li class="pk${t.ok ? '' : ' is-no'}${on ? ' is-on' : ''}">
        <label class="pk-l"><input type="checkbox" data-act-change="project" data-t="${esc(id)}" data-id="${p.id}"${on ? ' checked' : ''}${!t.ok && !on ? ' disabled' : ''}><span><b>${esc(p.client)}</b><small>${esc(p.object)} · ${esc(U.dateShort(p.start + 'T12:00:00-04:00'))} ${p.start.slice(0, 4)} au ${esc(U.dateShort(p.end + 'T12:00:00-04:00'))} ${p.end.slice(0, 4)}${p.created ? ' · ajouté par vous' : ''}</small></span></label>
        <span class="pk-tests"><span class="${t.tradeOk ? 'ok' : 'no'}">${ic(t.tradeOk ? 'check' : 'x', 13)}Métier</span><span class="${t.inPeriod ? 'ok' : 'no'}">${ic(t.inPeriod ? 'check' : 'x', 13)}Période</span><span class="${t.metricOk ? 'ok' : 'no'}">${ic(t.metricOk ? 'check' : 'x', 13)}${esc(metricVal)}</span></span>
        <small class="pk-why">${esc(t.why)}</small></li>`; }).join('')}</ul>
      <p class="pk-count">${S.qualifying(id) >= e.count ? UI.status('verified', e.count + ' références admissibles sur ' + e.count) : UI.status('missing', S.qualifying(id) + ' référence(s) admissible(s) sur ' + e.count)} ${UI.btn('Ajouter un projet de référence', 'project-new', { cls: 'btn-link btn-sm', icon: 'plus' })}</p></div>`;
  };
  const fieldRow = (id, x) => {
    let val, tag;
    if (x.manual) { tag = '<span class="ftag ftag-you">À vous</span>'; const where = x.price ? `<a href="#/dossier/${id}/prix">Onglet Prix</a>` : `<a href="#/dossier/${id}/revue">Revue et export</a>`; val = x.filled ? `<span class="fv">${esc(x.value)}</span>` : `<span class="fv fv-todo">À faire · ${where}</span>`; }
    else if (!x.filled) {
      tag = '<span class="ftag ftag-miss">Vide</span>';
      if (x.editable) val = `<span class="fv-edit"><label class="sr" for="ref-email-${x.editable}">Courriel de la référence</label><input id="ref-email-${x.editable}" type="email" placeholder="courriel@exemple.ca" value="${esc(S.D(id).refEmails[x.editable] || '')}" data-ref="${x.editable}" data-t="${esc(id)}">${UI.btn('Enregistrer', 'ref-save', { cls: 'btn-ghost btn-sm', data: { t: id, p: x.editable } })}</span>`;
      else if (x.gps) val = `<span class="fv-edit"><span class="fv fv-todo">Non documenté</span>${UI.btn('Confirmer avec le loueur', 'confirm', { cls: 'btn-ghost btn-sm', data: { t: id, key: 'gps' } })}</span>`;
      else val = '<span class="fv fv-todo">À compléter</span>';
    } else { tag = x.user ? '<span class="ftag ftag-user">Saisi</span>' : '<span class="ftag ftag-vault">Coffre-fort</span>'; val = `<span class="fv">${esc(x.value)}</span>`; }
    return `<tr class="${x.manual ? 'is-manual' : !x.filled ? 'is-missing' : ''}"><th scope="row">${esc(x.label)}</th><td>${val}</td><td class="fsrc">${tag}<small>${esc(x.prov)}</small></td></tr>`;
  };
  V.formulaires = (id) => {
    const fs = S.fieldStats(id), def = S.def(id), d = S.D(id);
    const cur = fs.A.find((a) => a.id === UI.view.annex[id]) || fs.A[0];
    UI.view.annex[id] = cur.id;
    const v = d.verified[cur.id];
    return `${UI.dossierHead(id, 'formulaires')}
    ${meter(fs)}
    <div class="forms">
      <nav class="annex-nav" aria-label="Annexes"><ul>${fs.A.map((a) => `<li><button type="button" class="an${a.id === cur.id ? ' is-on' : ''}" data-act="annex" data-t="${esc(id)}" data-id="${a.id}" aria-current="${a.id === cur.id}"><span class="an-t">${esc(a.title)}</span><span class="an-s">${a.prefilled}/${a.eligible} pré-remplis${a.manual ? ' · ' + a.manualDone + '/' + a.manual + ' à vous' : ''}</span>${a.verified ? UI.status('verified', 'Revue') : a.stale ? UI.status('pending', 'Modifiée depuis la revue') : UI.status('pending', 'À revoir')}</button></li>`).join('')}</ul>
        ${UI.btn('Confirmer toutes les annexes revues', 'verify-all', { cls: 'btn-ghost btn-sm', icon: 'check', disabled: fs.allVerified, data: { t: id } })}</nav>
      <article class="annex-sheet" aria-labelledby="an-h">
        <header class="as-h"><div><p class="as-k">${esc(def.ref)} · ${esc(D.company.legalName)}</p><h2 id="an-h">${esc(cur.title)}</h2></div>${cur.verified ? `<span class="stamp stamp-sm">Revue · ${esc(S.actorName(v.by))} · ${esc(U.time(v.at))}</span>` : ''}</header>
        ${cur.id === 'D' && def.experience ? picker(id) : ''}
        <div class="as-wrap"><table class="as-t"><thead><tr><th scope="col">Champ</th><th scope="col">Valeur</th><th scope="col">Provenance</th></tr></thead><tbody>${cur.fields.map((x) => fieldRow(id, x)).join('') || '<tr><td colspan="3">Aucune référence choisie.</td></tr>'}</tbody></table></div>
        <footer class="as-f"><p class="muted-note">${cur.stale ? 'Une valeur a changé depuis la revue : confirmez de nouveau.' : 'Confirmer signifie que vous avez lu ces valeurs. Les champs vides ou manuels restent signalés.'}</p>
          ${UI.btn(cur.verified ? 'Annexe revue' : 'Confirmer les ' + cur.prefilled + ' champs pré-remplis', 'verify-annex', { cls: cur.verified ? 'btn-ghost' : 'btn-primary', icon: 'check', disabled: cur.verified, data: { t: id, id: cur.id } })}</footer>
      </article>
    </div>`;
  };
})();
