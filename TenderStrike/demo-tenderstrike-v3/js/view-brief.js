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

  const heroTitle = (id, open) => {
    if (!open.length) return 'Aucun dossier ouvert ce matin.';
    const k = S.stage(id), b = S.def(id).buyerShort, hard = S.hardBlockers(id).length;
    if (S.state.clock === 0) return 'Votre soumission de ' + b + ' est prête à revoir.';
    if (S.needsAcquisition(id)) return b + ' : les documents restent à obtenir.';
    if (k === 'matched' || k === 'review') return b + ' : la radiographie attend votre décision.';
    if (k === 'prep') return hard ? b + ' : ' + plural(hard, 'bloqueur', 'bloqueurs') + ' avant l’export.' : b + ' : la préparation avance.';
    if (k === 'approval') return b + ' : prêt pour votre approbation.';
    if (k === 'ready') return b + ' : paquet approuvé, à déposer sur SEAO.';
    return b + ' : ' + S.stageLabel(k).toLowerCase() + '.';
  };

  V.brief = () => {
    const now = S.now(), open = S.openDossierIds();
    const id = S.featured(), t = S.def(id);
    const O = S.oracle(id), fs = S.fieldStats(id);
    const hard = S.hardBlockers(id).length, soft = S.blockers(id).length - hard;
    const steps = S.progressSteps(id), done = steps.filter((s) => s.done).length, next = S.nextAction(id);
    const close = S.close(id), acq = S.needsAcquisition(id);
    const tasksOpen = S.tasks(id).filter((x) => !x.done);
    const lead = !open.length ? 'Tous vos dossiers sont déposés, classés ou archivés. Ajoutez un appel d’offres collé depuis SEAO, ou consultez le radar.'
      : plural(open.length, 'dossier ouvert', 'dossiers ouverts') + '. Le plus proche de sa clôture : ' + t.title.charAt(0).toLowerCase() + t.title.slice(1) + ' pour ' + t.buyer + ', le ' + U.dayTime(close) + '. '
        + (acq ? 'Le cahier des charges s’obtient sur SEAO : versez-le pour lancer la radiographie. ' : 'TenderStrike a lu ' + S.bundlePages(id) + ' pages, ' + (O.cycles.length ? 'comparé vos prix à ' + plural(O.cycles.length, 'ouverture publique', 'ouvertures publiques') : 'n’a trouvé aucun historique de prix pour cet acheteur') + ' et pré-rempli ' + U.pct(fs.share, 0) + ' des champs. ')
        + (hard ? 'Il reste ' + plural(hard, 'bloqueur', 'bloqueurs') + ' à régler' : 'Aucun bloqueur') + (S.priceApproved(id) || S.D(id).receipt ? '.' : ' et vos prix à confirmer.') + ' Vous signez; rien ne part sans vous.';
    const ref = (O.mode === 'bids' && O.recent) || null;
    const conf = ref ? ref.bids.filter((b) => b.status !== 'nonconform').sort((a, b) => a.amount - b.amount) : [];
    const rejected = ref ? ref.bids.find((b) => b.status === 'nonconform') : null;
    const value = t.value || { kind: 'unavailable' };
    const dl = S.allDeadlines().filter((x) => !x.done && Date.parse(x.at) >= S.nowTs() - 7 * 86400000).slice(0, 7);
    const others = S.tenders().filter((x) => x.id !== id && !S.D(x.id).archived && (!S.excluded(x.id) || S.D(x.id).decision));
    const inbox = S.state.inbox.slice(0, 4);
    const live = S.state.log.some((e) => D.people[e.actor] && Date.parse(e.at) > Date.parse(D.now));
    return `<div class="brief">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-text">
          <p class="hero-time"><span class="hero-clock">${U.time(now)}</span><span class="hero-date">${esc(U.day(now))} ${now.getFullYear()}</span></p>
          <h1 id="hero-title" class="hero-h">${esc(heroTitle(id, open))}</h1>
          <p class="hero-lead">${esc(lead)}</p>
          <div class="hero-cta">
            ${open.length ? `<a class="btn btn-primary btn-lg" href="#/dossier/${id}/radiographie">${ic('eye', 18)}<span>Ouvrir la radiographie</span></a>` : `<a class="btn btn-primary btn-lg" href="#/nouveau">${ic('plus', 18)}<span>Ajouter un appel d’offres</span></a>`}
            <button type="button" class="btn btn-ghost btn-lg" data-act="show-message" data-t="${esc(id)}">${ic('phone', 18)}<span>Voir le message du matin</span></button>
          </div>
          ${live ? `<p class="hero-live">${ic('clock', 14)}<span>Mis à jour ${U.time(now)} : ${esc(t.buyerShort)} est <b>${esc(S.stageLabel(S.stage(id)).toLowerCase())}</b>. Prochaine action : ${esc(next.label.charAt(0).toLowerCase() + next.label.slice(1))}.</span></p>` : ''}
          <p class="hero-fresh">${ic(S.state.caps.offline ? 'alert' : 'check', 14)} ${S.state.caps.offline ? 'SEAO injoignable (Labo de test) : la surveillance des addenda est suspendue' : 'SEAO vérifié aujourd’hui à 6 h 04 · CanadaBuys et SAM.gov viendront ensuite'}</p>
        </div>

        <article class="brief-sheet${UI.view.swept ? '' : ' do-sweep'}" aria-label="Brief exécutif d’une page">
          <header class="bs-head"><span class="bs-kind">Brief exécutif</span><span class="bs-ref">${esc(t.ref)}${t.seao !== '—' ? ' · SEAO ' + esc(t.seao) : ''}</span></header>
          <h2 class="bs-title"><span class="bs-buyer">${esc(t.buyer)}</span>${esc(t.title)}</h2>
          <dl class="bs-facts">
            <div><dt>Clôture</dt><dd>${esc(U.day(close))}, ${U.time(close)}<small>${S.nowTs() < Date.parse(close) ? 'dans ' + U.countdown(now, close) + ', heure de Montréal' : 'clôture passée'}</small></dd></div>
            <div><dt>Durée</dt><dd>${esc(t.term.split(' et ')[0])}<small>${esc(t.term.split(' et ')[1] ? '+ ' + t.term.split(' et ')[1] : t.service || '')}</small></dd></div>
            <div><dt>Valeur</dt><dd>${value.kind === 'published' ? U.money(value.amount) : value.kind === 'estimated' ? 'Non publiée' : 'Indisponible'}<small>${value.kind === 'estimated' && O.A1 ? 'repère historique ajusté : ' + U.msShort(O.A1) : esc(value.kind === 'published' ? 'estimation publiée' : 'aucun montant publié')}</small></dd></div>
            <div><dt>Adjudication</dt><dd>${S.reqById(id, 'r-award') ? esc(S.reqById(id, 'r-award').title) : 'Non précisée'}<small>${S.hasBond(id) ? 'garantie ' + S.bondLabel(id) : 'sans garantie de soumission'}</small></dd></div>
          </dl>
          <h3 class="bs-sub">Ce qui compte avant de signer</h3>
          ${acq ? `<p class="bs-note">${ic('lock', 14)} Documents à obtenir sur SEAO : les exigences seront vérifiées après la lecture du devis.</p>` : `<ol class="bs-find">${V.findings(id).map((f) => `<li class="${f.bad ? 'is-bad' : ''}"><span class="hl${f.bad ? ' hl-red' : ''}">${esc(f.r.title)}</span>. ${esc((f.s.detail || f.r.risk || f.r.plain || '').replace(/\.$/, ''))}. ${UI.cite(id, f.r, 'p. ' + f.r.page)}</li>`).join('') || '<li>Aucun point ouvert relevé.</li>'}</ol>`}
          <h3 class="bs-sub">${ref ? 'Ouverture publique de ' + ref.year + ', même acheteur' : O.mode === 'award' ? 'Adjudication publiée' : 'Historique de prix'}</h3>
          ${ref ? `<table class="bs-table"><caption class="sr">Résultats de l’ouverture de ${ref.year}</caption><tbody>${conf.slice(0, 3).map((b, i) => `<tr${b.you ? ' class="is-you"' : ''}><td>${b.you ? 'Vous' : esc(b.firm)}</td><td class="num">${U.money(b.amount)}</td><td class="num">${i === 0 ? 'plus bas' : U.signedPct((b.amount - conf[0].amount) / conf[0].amount)}</td></tr>`).join('')}</tbody></table>${rejected ? `<p class="bs-note">La plus basse soumission (${esc(rejected.firm)}, ${U.money(rejected.amount)}) a été rejetée : ${esc(rejected.why || 'non conforme')}.</p>` : ''}`
            : `<p class="bs-note">${O.mode === 'award' && O.refCycle ? 'Adjudication de ' + O.refCycle.year + ' seulement (' + esc(O.refCycle.award.firm) + ', ' + U.money(O.refCycle.award.amount) + ') : aucun écart entre soumissionnaires connu.' : 'Aucune ouverture publique pour cet acheteur. La cible repose sur votre coût et votre marge minimale.'}</p>`}
          <footer class="bs-foot"><span><b>${fs.prefilled}</b> champs pré-remplis sur ${fs.total}</span><span><b>${hard}</b> bloqueur${hard > 1 ? 's' : ''} · <b>${soft}</b> à compléter</span><span>${esc(S.bundleLabel(id).replace('Devis v1', 'Devis ' + (t.pagesTotal || '') + ' p.'))}</span></footer>
        </article>
        <section class="night" aria-labelledby="night-h">
          <h2 id="night-h" class="night-h">Pendant la nuit${U.isoDay(now) === '2026-10-23' ? '' : ' du 22 au 23 octobre'}</h2>
          <ol class="night-list">${D.night.map((n) => `<li><time>${esc(n.t)}</time><div><strong>${esc(n.title)}</strong><span>${esc(n.body)}</span></div></li>`).join('')}</ol>
        </section>
      </section>

      <section class="track" aria-labelledby="track-h">
        <div class="track-head"><h2 id="track-h" class="sec-h">${esc(t.buyerShort)} · avancement</h2>
          <p class="track-sum">${done} étape${done > 1 ? 's' : ''} sur ${steps.length} · effort restant estimé ${U.minutes(S.effortLeft(id))}, d’après ${plural(tasksOpen.length, 'tâche ouverte', 'tâches ouvertes')}${tasksOpen.some((x) => x.optional) ? ', dont ' + tasksOpen.filter((x) => x.optional).length + ' facultative' : ''}</p></div>
        <ol class="steps">${steps.map((s, i) => `<li class="${s.done ? 'is-done' : ''}"><a href="${s.href}"><span class="step-n">${s.done ? ic('check', 14) : i + 1}</span><span>${esc(s.label)}</span></a></li>`).join('')}</ol>
        <div class="track-next"><span>Prochaine action</span><a class="btn btn-hl" href="${next.href}">${esc(next.label)}${ic('arrow', 16)}</a></div>
      </section>

      <div class="brief-cols">
        <section aria-labelledby="also-h">
          <div class="sec-row"><h2 id="also-h" class="sec-h">Vos autres dossiers</h2><a class="btn btn-ghost btn-sm" href="#/nouveau">${ic('plus', 15)}<span>Ajouter un appel d’offres</span></a></div>
          <ul class="also">${others.map((o) => { const n = S.nextAction(o.id), hb = S.isOpen(o.id) ? S.hardBlockers(o.id).length : 0; return `<li><a href="${n.href}" class="also-row">
            <span class="also-buyer">${esc(o.buyerShort)} <small class="also-trade">${UI.trade(o.trade)}</small></span>
            <span class="also-title">${esc(o.title)}</span>
            <span class="also-meta">${UI.stage(S.stage(o.id))}<span>Clôture ${esc(U.dateShort(S.close(o.id)))}</span>${hb ? `<span class="also-bad">${ic('alert', 13)}${plural(hb, 'bloqueur', 'bloqueurs')}</span>` : ''}</span>
            <span class="also-next">${esc(n.label)}${ic('arrow', 14)}</span>
          </a></li>`; }).join('') || '<li class="kempty">Aucun autre dossier.</li>'}</ul>
        </section>
        <div class="brief-side">
          <section aria-labelledby="dl-h">
            <div class="sec-row"><h2 id="dl-h" class="sec-h">Échéances à venir</h2><span class="sec-acts"><a class="btn btn-ghost btn-sm" href="#/calendrier">${ic('cal', 15)}<span>Calendrier</span></a>${UI.btn('.ics', 'ics', { cls: 'btn-ghost btn-sm', icon: 'download', title: 'Exporter toutes les échéances (.ics)' })}</span></div>
            <ul class="deadlines">${dl.map((x) => { const late = Date.parse(x.at) < S.nowTs(); return `<li class="dl-${late ? 'bad' : x.kind === 'Clôture' ? 'close' : x.kind === 'Expiration' ? 'bad' : 'n'}"><time datetime="${esc(x.at)}"><b>${esc(U.dateShort(x.at))}</b><span>${U.time(x.at)}</span></time><span class="dl-t"><strong>${esc(x.label)}</strong><small>${esc(x.buyer || x.note)}${late ? ' · en retard' : ''}</small></span><span class="dl-k">${esc(x.kind)}</span></li>`; }).join('') || '<li class="kempty">Aucune échéance ouverte.</li>'}</ul>
          </section>
          <section aria-labelledby="nt-h">
            <div class="sec-row"><h2 id="nt-h" class="sec-h">Notifications</h2><a class="btn btn-ghost btn-sm" href="#/notifications">${ic('bell', 15)}<span>Tout voir${S.unread() ? ' · ' + S.unread() + ' non lue' + (S.unread() > 1 ? 's' : '') : ''}</span></a></div>
            <ul class="inbox inbox-mini">${inbox.map((n) => V.notifRow(n, true)).join('') || '<li class="kempty">Aucune notification.</li>'}</ul>
          </section>
        </div>
      </div>
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
