/* Écrans : calendrier de toutes les échéances (dossiers et coffre-fort) et boîte de notifications. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const U = TS.U, S = TS.S, UI = TS.UI;
  const esc = U.esc, ic = U.icon;
  const V = (TS.V = TS.V || {});
  const WD = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
  const KIND_CLS = { Clôture: 'close', Visite: 'visit', Questions: 'q', Garantie: 'bond', Interne: 'int', Ouverture: 'open', Expiration: 'exp', Registre: 'reg' };

  const hrefOf = (x) => (x.tender ? '#/dossier/' + x.tender + '/' + (x.kind === 'Visite' ? 'conformite' : x.kind === 'Questions' ? 'radiographie' : 'revue') : '#/coffre');
  const state = (x) => (x.done ? 'done' : Date.parse(x.at) < S.nowTs() ? 'late' : Date.parse(x.at) - S.nowTs() < 2 * 86400000 ? 'soon' : 'n');
  const evChip = (x) => `<a class="cev cev-${KIND_CLS[x.kind] || 'n'} is-${state(x)}" href="${hrefOf(x)}" title="${esc(x.label + (x.buyer ? ' · ' + x.buyer : '') + ' · ' + U.time(x.at))}"><span class="cev-t">${U.time(x.at)}</span><span class="cev-l">${esc(x.buyer || x.label.replace('Fin de validité : ', ''))}</span></a>`;

  V.calendrier = () => {
    const now = S.now();
    const all = S.allDeadlines();
    const f = UI.view.calFilter || 'all';
    const list = all.filter((x) => f === 'all' || (f === 'vault' ? !x.tender : x.tender === f));
    const cur = UI.view.calMonth || U.isoDay(now).slice(0, 7);
    UI.view.calMonth = cur;
    const y = Number(cur.slice(0, 4)), m = Number(cur.slice(5, 7)) - 1;
    const first = new Date(Date.UTC(y, m, 1, 12));
    const lead = (first.getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(y, m + 1, 0, 12)).getUTCDate();
    const today = U.isoDay(now);
    const byDay = {};
    list.forEach((x) => { const k = U.isoDay(x.at); (byDay[k] = byDay[k] || []).push(x); });
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div class="cday is-pad" aria-hidden="true"></div>');
    for (let d = 1; d <= days; d++) {
      const k = cur + '-' + String(d).padStart(2, '0');
      const ev = byDay[k] || [];
      cells.push(`<div class="cday${k === today ? ' is-today' : ''}${k < today ? ' is-past' : ''}" role="gridcell" aria-label="${esc(U.day(k + 'T12:00:00-05:00'))} : ${ev.length} échéance(s)"><span class="cday-n">${d}</span>${ev.slice(0, 3).map(evChip).join('')}${ev.length > 3 ? `<span class="cmore">+${ev.length - 3}</span>` : ''}</div>`);
    }
    const monthLabel = new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric', timeZone: 'America/Toronto' }).format(first);
    const late = list.filter((x) => state(x) === 'late');
    const upcoming = list.filter((x) => !x.done && Date.parse(x.at) >= S.nowTs()).slice(0, 14);
    const tenders = S.tenders().filter((t) => all.some((x) => x.tender === t.id));
    const agenda = (arr) => { let lastDay = ''; return arr.map((x) => { const dd = U.isoDay(x.at); const h = dd !== lastDay ? `<li class="ag-day">${esc(U.day(x.at))}</li>` : ''; lastDay = dd; return h + `<li class="ag ag-${state(x)}"><time datetime="${esc(x.at)}">${U.time(x.at)}</time><span class="ag-k ag-k-${KIND_CLS[x.kind] || 'n'}" title="${esc(x.kind)}">${esc(x.kind)}</span><a href="${hrefOf(x)}" class="ag-t" title="${esc((x.buyer ? x.buyer + ' · ' : '') + (x.note || ''))}"><b>${esc(x.label)}</b>${x.buyer ? `<small>${esc(x.buyer)}${state(x) === 'late' ? ' · en retard' : state(x) === 'soon' ? ' · < 48 h' : ''}</small>` : ''}</a></li>`; }).join(''); };
    return `<div class="cal">
      <div class="pagehead"><h1 class="page-h1">Agenda</h1>${late.length ? UI.chip('alert', late.length + ' en retard', 'chip-bad') : ''}${UI.info('Questions, visites, garanties, approbations, clôtures et ouvertures de tous vos dossiers, plus les expirations du coffre-fort. L’horloge de démo fait passer les échéances. Couleurs : ' + Object.keys(KIND_CLS).join(', ') + '.', 'À propos de l’agenda')}
        <div class="pagehead-a">${UI.iconBtn('download', 'Exporter tout (.ics)', 'ics', {})}</div></div>
      <div class="cal-tools">
        <div class="cal-nav">${UI.btn('', 'cal-month', { cls: 'icon-btn', icon: 'back', data: { dir: '-1' }, title: 'Mois précédent' })}<h2 class="cal-m" aria-live="polite">${esc(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1))}</h2>${UI.btn('', 'cal-month', { cls: 'icon-btn', icon: 'arrow', data: { dir: '1' }, title: 'Mois suivant' })}${UI.iconBtn('pin', 'Aujourd’hui', 'cal-today', {})}</div>
        <label class="crit-sel" title="Afficher">${ic('filter', 15)}<span class="sr">Afficher</span><select data-act-change="cal-filter" aria-label="Filtrer les échéances"><option value="all">Toutes les échéances</option><option value="vault"${f === 'vault' ? ' selected' : ''}>Coffre-fort seulement</option>${tenders.map((t) => `<option value="${t.id}"${f === t.id ? ' selected' : ''}>${esc(t.buyerShort)}</option>`).join('')}</select></label>
      </div>
      <div class="cal-grid-wrap"><div class="cal-grid" role="grid" aria-label="${esc(monthLabel)}">${WD.map((w) => `<div class="cwd" role="columnheader">${w}</div>`).join('')}${cells.join('')}</div></div>
      <div class="cal-cols">
        <section aria-labelledby="ag-h"><h2 id="ag-h" class="sec-h">À venir</h2><ol class="agenda">${agenda(upcoming) || '<li class="kempty">Aucune échéance à venir.</li>'}</ol></section>
        <section aria-labelledby="late-h"><h2 id="late-h" class="sec-h">En retard <b class="cnt${late.length ? ' is-bad' : ''}">${late.length}</b></h2><ol class="agenda">${agenda(late.slice().reverse()) || '<li class="kempty">Rien en retard.</li>'}</ol></section>
      </div>
    </div>`;
  };

  /* ---------- Notifications ---------- */
  const TYPE = { brief: ['sun', 'Brief'], addendum: ['doc', 'Addenda'], expiry: ['clock', 'Rappel'], expired: ['alert', 'Expiration'], revoked: ['lock', 'Révocation'], registry: ['q', 'Registre'], deadline: ['cal', 'Échéance'], missed: ['x', 'Clôture'], opening: ['chart', 'Ouverture'], results: ['chart', 'Résultats'], analysis: ['eye', 'Analyse'], bond: ['stamp', 'Garantie'], system: ['info', 'Système'] };
  V.notifRow = (n, mini) => { const t = TYPE[n.type] || TYPE.system; return `<li class="nrow${n.read ? '' : ' is-unread'}"><a href="${esc(n.href || '#/brief')}" data-act="notif-open" data-id="${esc(n.id)}"><span class="nic nic-${esc(n.type)}">${ic(t[0], 16)}</span><span class="nbody" title="${esc(n.body || '')}"><b>${esc(n.title)}</b><small class="nmeta">${esc(U.dayTime(n.at))}${n.tender && S.def(n.tender) ? ' · ' + esc(S.def(n.tender).buyerShort) : ''}</small></span>${n.read ? '' : '<span class="ndot" aria-label="Non lue"></span>'}</a></li>`; };
  V.notifications = () => {
    const f = UI.view.notifFilter || 'all';
    const list = S.state.inbox.filter((n) => f === 'all' || !n.read).slice().sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    return `<div class="notifs">
      <div class="pagehead"><h1 class="page-h1">Notifications</h1>${UI.info('Addenda publiés, rappels d’expiration, échéances à 48 h, résultats d’ouverture, révocations : chaque événement du moteur, de l’horloge ou du Labo de test arrive ici. Les envois par courriel ou texto sont simulés.', 'À propos des notifications')}
        <div class="pagehead-a">${UI.btn('Tout lu', 'notif-read-all', { cls: 'btn-ghost', icon: 'check', disabled: !S.unread(), title: 'Tout marquer comme lu' })}</div></div>
      <div class="filters" role="group" aria-label="Filtrer">${[['all', 'Toutes · ' + S.state.inbox.length], ['unread', 'Non lues · ' + S.unread()]].map(([k, l]) => `<button type="button" class="chip${f === k ? ' is-on' : ''}" data-act="notif-filter" data-f="${k}" aria-pressed="${f === k}">${esc(l)}</button>`).join('')}</div>
      <ul class="inbox">${list.map((n) => V.notifRow(n)).join('') || '<li class="kempty">Aucune notification non lue.</li>'}</ul>
    </div>`;
  };
})();
