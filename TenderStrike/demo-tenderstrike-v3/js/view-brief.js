/* Écran : brief du matin (accueil). Générique : le dossier mis en avant est le dossier ouvert le plus proche de sa clôture. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S, UI = TS.UI;
  const esc = U.esc, ic = U.icon;
  const V = (TS.V = TS.V || {});
  const plural = (n, one, many) => n + ' ' + (n > 1 ? many : one);

  /* Constats qui comptent : bloquants d’abord, puis à obtenir, puis risques commerciaux */
  V.findings = (id) => {
    const R = S.requirements(id);
    const rank = (r) => { const k = V.reqStatus(id, r).k; return S.HARD.includes(k) ? 0 : S.SOFT.includes(k) || k === 'unknown' ? 1 : r.kind === 'pill' ? 2 : r.kind === 'trap' ? 3 : 9; };
    return R.filter((r) => rank(r) < 9).sort((a, b) => rank(a) - rank(b)).slice(0, 3).map((r) => ({ r, s: V.reqStatus(id, r), bad: rank(r) === 0 }));
  };

  /* Titre de six mots au plus */
  const heroTitle = (id, open) => {
    if (!open.length) return 'Aucun dossier ouvert';
    const k = S.stage(id), b = S.def(id).buyerShort, hard = S.hardBlockers(id).length;
    if (S.state.clock === 0) return b + ' : prêt à revoir';
    if (S.needsAcquisition(id)) return b + ' : documents à obtenir';
    if (k === 'matched' || k === 'review') return b + ' : décision à prendre';
    if (k === 'prep') return hard ? b + ' : ' + plural(hard, 'bloqueur', 'bloqueurs') : b + ' : en préparation';
    if (k === 'approval') return b + ' : à approuver';
    if (k === 'ready') return b + ' : à déposer';
    return b + ' : ' + S.stageLabel(k).toLowerCase();
  };

  V.brief = () => {
    const now = S.now(), open = S.openDossierIds();
    const id = S.featured(), t = S.def(id);
    const O = S.oracle(id), fs = S.fieldStats(id);
    const hard = S.hardBlockers(id).length, next = S.nextAction(id), close = S.close(id), acq = S.needsAcquisition(id);
    const others = S.tenders().filter((x) => x.id !== id && !S.D(x.id).archived && (!S.excluded(x.id) || S.D(x.id).decision));
    const night = D.night.map((n) => n.t + ' · ' + n.title).join(' — ') + '. Envois du matin simulés.';
    const stats = [['eye', 'Lu', acq ? '—' : S.bundlePages(id) + ' p.', acq ? 'Documents à obtenir sur SEAO' : S.bundlePages(id) + ' pages lues, exigences reliées à leur page'], ['chart', 'Comparé', O.cycles.length ? O.cycles.length + ' ouv.' : '—', O.cycles.length ? O.cycles.length + ' ouverture(s) publique(s) ajustée(s) aux quantités de 2026' : 'Aucun historique de prix pour cet acheteur'], ['doc', 'Pré-rempli', U.pct(fs.share, 0), fs.prefilled + ' champs sur ' + fs.total + ', depuis le coffre-fort']];
    const kp = acq ? [] : V.findings(id);
    return `<div class="brief">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-text">
          <p class="hero-time"><span class="hero-clock">${U.time(now)}</span><span class="hero-date">${esc(U.day(now))}</span></p>
          <h1 id="hero-title" class="hero-h">${esc(heroTitle(id, open))}</h1>
          ${open.length ? `<p class="hero-sub">${ic('clock', 15)}<span>Clôture ${esc(U.dateShort(close))}, ${U.time(close)}</span>${hard ? UI.chip('alert', plural(hard, 'bloqueur', 'bloqueurs'), 'chip-bad') : UI.chip('check', 'Aucun bloqueur', 'chip-ok')}</p>` : ''}
          <div class="hero-cta">
            <a class="btn btn-primary btn-lg" href="${open.length ? next.href : '#/nouveau'}">${ic(open.length ? 'eye' : 'plus', 18)}<span>${esc(open.length ? next.label : 'Ajouter un appel d’offres')}</span></a>
            ${UI.iconBtn('mail', 'Voir le message du matin (envoi simulé)', 'show-message', { t: id }, 'icon-lg')}
          </div>
          <ul class="stats" aria-label="Cette nuit">${stats.map(([icn, l, v, tip]) => `<li title="${esc(tip)}">${ic(icn, 18)}<b>${esc(v)}</b><span>${esc(l)}</span></li>`).join('')}<li class="stats-i">${UI.info(night + (S.state.caps.offline ? ' SEAO injoignable (Labo de test).' : ' SEAO vérifié à 6 h 04.'), 'Pendant la nuit')}</li></ul>
        </div>
        <article class="brief-sheet${UI.view.swept ? '' : ' do-sweep'}" aria-label="Ce qui compte avant de signer">
          <header class="bs-head"><span class="bs-kind">${esc(t.buyerShort)}</span><span class="bs-ref">${esc(t.ref)}</span></header>
          <h2 class="bs-title">${esc(t.title)}</h2>
          ${acq ? `<p class="kp kp-wait">${ic('lock', 16)}<span>Documents à obtenir</span>${UI.info('Le cahier des charges s’obtient sur SEAO : versez-le pour lancer la radiographie.', 'Pourquoi')}</p>` : `<ol class="kps">${kp.map((f) => `<li class="kp${f.bad ? ' kp-bad' : f.r.kind === 'pill' ? ' kp-risk' : ''}">${ic(f.bad ? 'alert' : f.r.kind === 'pill' ? 'info' : 'clock', 16)}<span class="hl${f.bad ? ' hl-red' : ''}">${esc(f.r.title)}</span>${UI.cite(id, f.r, 'p. ' + f.r.page)}${UI.info((f.s.detail || f.r.risk || f.r.plain || '').trim(), 'Détails')}</li>`).join('') || `<li class="kp kp-ok">${ic('check', 16)}<span>Aucun point ouvert</span></li>`}</ol>`}
        </article>
      </section>
      ${others.length ? `<details class="fold"><summary>${ic('folder', 16)}<span>${plural(others.length, 'autre dossier', 'autres dossiers')}</span></summary>
        <ul class="rows">${others.map((o) => { const n = S.nextAction(o.id), hb = S.isOpen(o.id) ? S.hardBlockers(o.id).length : 0; return `<li><a class="row" href="${n.href}" title="${esc(o.title + ' · ' + n.label)}"><span class="row-t"><b>${esc(o.buyerShort)}</b><small>${UI.trade(o.trade)}</small></span><span class="row-v">${esc(U.dateShort(S.close(o.id)))}</span>${hb ? `<span class="row-bad" title="${hb} bloqueur(s)">${ic('alert', 14)}${hb}</span>` : ''}${UI.stage(S.stage(o.id))}</a></li>`; }).join('')}</ul></details>` : ''}
    </div>`;
  };

  V.messageDialog = (id) => {
    const t = S.def(id), close = S.close(id), O = S.oracle(id), fs = S.fieldStats(id);
    const hb = S.hardBlockers(id), open = S.openDossierIds();
    const sms = V.smsText(id);
    return `<p class="dlg-note">${ic('info', 14)} Aperçu de l’envoi simulé du matin. Aucun courriel ni texto réel n’est transmis par cette démo.</p>
      <div class="msg-grid">
        <figure class="sms"><figcaption>Texto · ${U.time(S.now())} · au 450 555-0187 (consentement donné)</figcaption><div class="bubble">${esc(sms)}</div>
          <p class="sms-rule">Le texto ne contient ni prix ni document : seulement un lien vers l’espace sécurisé.</p></figure>
        <article class="mail">
          <header><b>De :</b> TenderStrike &lt;brief@tenderstrike.example&gt;<br><b>À :</b> Sylvie Gaudreau<br><b>Objet :</b> Brief du ${esc(U.date(S.now()))} : ${esc(t.buyerShort)}, ${esc(S.stageLabel(S.stage(id)).toLowerCase())}</header>
          <p>Bonjour Sylvie,</p>
          <p>${open.length} dossier${open.length > 1 ? 's sont ouverts' : ' est ouvert'}. Le plus urgent : <b>${esc(t.title)}</b> (${esc(t.buyer)}), clôture le ${esc(U.day(close))} à ${U.time(close)}.</p>
          <ul>
            <li>Brief d’une page et ${S.requirements(id).length} exigences reliées aux pages du devis.</li>
            <li>${O.mode === 'bids' ? 'Oracle des prix : ' + O.cycles.length + ' ouverture(s) publique(s), repère ajusté de ' + U.msShort(O.A1) + '.' : 'Aucun historique de soumissions : cible fondée sur votre coût.'}</li>
            <li>${fs.prefilled} champs sur ${fs.total} déjà pré-remplis depuis votre coffre-fort.</li>
            <li>${hb.length ? 'À régler : ' + esc(hb.map((b) => b.label.charAt(0).toLowerCase() + b.label.slice(1)).join('; ')) + '.' : 'Aucun bloqueur à la clôture.'}</li>
          </ul>
          <p>Source vérifiée à 6 h 04. Si une source était en retard, ce courriel l’indiquerait au lieu d’afficher un dossier complet.</p>
        </article>
      </div>
      <div class="dlg-actions">${UI.btn('Copier le texto', 'copy-sms', { cls: 'btn-ghost', icon: 'doc', data: { t: id } })}<a class="btn btn-primary" href="#/dossier/${id}/radiographie" data-act="dlg-close-nav">${ic('eye', 16)}<span>Ouvrir la radiographie</span></a></div>`;
  };
  V.smsText = (id) => { const t = S.def(id), hb = S.hardBlockers(id).length; return U.typoText('TenderStrike : ' + S.openDossierIds().length + ' dossier(s) ouvert(s). Le plus urgent : ' + t.buyerShort + ', ' + (D.tradeLabels[t.trade] || '').toLowerCase() + ', clôture ' + U.dateShort(S.close(id)) + ' ' + U.time(S.close(id)) + '. ' + (hb ? hb + ' point(s) à régler avant le dépôt. ' : '') + 'Ouvrir : ts.example/b/' + t.ref.slice(-3) + ' · Répondez STOP pour arrêter.'); };

  /* iCalendar : toutes les échéances suivies (dossiers et coffre-fort) */
  V.ics = (list) => {
    const stamp = S.nowIso().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const fmt = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const clean = (s) => String(s).replace(/[,;\\]/g, (c) => '\\' + c).replace(/\n/g, ' ');
    const ev = (list || S.allDeadlines()).map((x) => {
      const t = x.tender ? S.def(x.tender) : null;
      return ['BEGIN:VEVENT', 'UID:' + x.id.replace(/[^\w:-]/g, '') + '@tenderstrike.example', 'DTSTAMP:' + stamp, 'DTSTART:' + fmt(x.at), 'DTEND:' + fmt(new Date(Date.parse(x.at) + 30 * 60000).toISOString()),
        'SUMMARY:' + clean((t ? t.ref + ' · ' : '') + x.label), 'DESCRIPTION:' + clean('Démo TenderStrike · données fictives. ' + (t ? t.buyer + '. ' : '') + (x.note || '')), 'END:VEVENT'].join('\r\n');
    }).join('\r\n');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TenderStrike demo V3//FR', 'CALSCALE:GREGORIAN', ev, 'END:VCALENDAR'].join('\r\n');
  };
})();
