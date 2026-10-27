/* Recherche globale (Ctrl/Cmd-K) : dossiers, exigences, pièces, projets, échéances, notifications, journal, concurrents. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S, UI = TS.UI;
  const esc = U.esc, ic = U.icon;
  const Q = (TS.Search = { active: 0, results: [] });
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').toLowerCase();

  const GROUPS = { tender: ['folder', 'Dossiers'], req: ['doc', 'Exigences'], vault: ['vault', 'Coffre-fort'], project: ['user', 'Projets de référence'], deadline: ['cal', 'Échéances'], notif: ['bell', 'Notifications'], log: ['log', 'Journal'], firm: ['chart', 'Concurrents'], question: ['q', 'Questions'] };

  Q.index = () => {
    const out = [];
    const add = (type, title, sub, href, extra) => out.push(Object.assign({ type, title, sub, href, hay: fold(title + ' ' + sub) }, extra || {}));
    S.tenders().forEach((t) => {
      add('tender', t.buyerShort + ' · ' + t.title, t.ref + ' · ' + (D.tradeLabels[t.trade] || '') + ' · ' + S.stageLabel(S.stage(t.id)) + ' · clôture ' + U.dateShort(S.close(t.id)), '#/dossier/' + t.id + '/radiographie', { boost: 3 });
      if (!S.needsAcquisition(t.id)) S.requirements(t.id).forEach((r) => add('req', r.title, t.buyerShort + ' · ' + (r.sec || '') + ' · p. ' + r.page + ' · ' + (r.plain || ''), '#/dossier/' + t.id + '/radiographie', { cite: { t: t.id, doc: r.doc, page: r.page, clause: r.clause } }));
      S.D(t.id).questions.forEach((q) => add('question', q.text.slice(0, 90), t.buyerShort + ' · ' + (q.sentAt ? 'envoyée' : 'brouillon'), '#/dossier/' + t.id + '/radiographie'));
    });
    S.state.vault.filter((v) => !v.removed).forEach((v) => add('vault', v.title, v.issuer + ' · ' + S.vaultStatus(v).label + ' · ' + (v.file || ''), '#/coffre', { anchor: 'doc-' + v.id }));
    S.projects().forEach((p) => add('project', p.client + ' · ' + p.object, (D.tradeLabels[p.trade] || '') + ' · ' + U.money(p.value) + ' · ' + p.start.slice(0, 4) + '-' + p.end.slice(0, 4), '#/coffre', { anchor: 'proj-' + p.id }));
    S.allDeadlines().forEach((x) => add('deadline', x.label, (x.buyer ? x.buyer + ' · ' : '') + U.dayTime(x.at) + (x.done ? ' · fait' : Date.parse(x.at) < S.nowTs() ? ' · en retard' : ''), '#/calendrier'));
    S.state.inbox.forEach((n) => add('notif', n.title, n.body || '', n.href || '#/notifications'));
    S.state.log.slice(-160).forEach((e) => add('log', e.what, (e.tender && S.def(e.tender) ? S.def(e.tender).buyerShort + ' · ' : '') + U.dayTime(e.at) + ' · ' + (e.detail || ''), e.tender && S.def(e.tender) ? '#/dossier/' + e.tender + '/historique' : '#/journal'));
    const firms = {};
    S.tenders().forEach((t) => (t.cycles || []).forEach((c) => (c.bids || []).concat(c.award ? [c.award] : []).forEach((b) => { if (b.you) return; (firms[b.firm] = firms[b.firm] || []).push({ t, year: c.year, amount: b.amount }); })));
    S.state.openings.forEach((o) => o.bids.forEach((b) => { if (b.you) return; (firms[b.firm] = firms[b.firm] || []).push({ t: S.def(o.tender), year: o.year, amount: b.amount }); }));
    Object.entries(firms).forEach(([f, l]) => add('firm', f, l.length + ' soumission(s) observée(s) · ' + Array.from(new Set(l.map((x) => x.t ? x.t.buyerShort : ''))).join(', '), '#/dossier/' + (l[0].t ? l[0].t.id : 'ts-031') + '/prix'));
    return out;
  };

  Q.find = (q) => {
    const terms = fold(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return Q.index().map((x) => {
      if (!terms.every((t) => x.hay.includes(t))) return null;
      const tf = fold(x.title);
      const score = (x.boost || 0) + terms.reduce((s, t) => s + (tf.startsWith(t) ? 4 : tf.includes(t) ? 2 : 0.5), 0);
      return Object.assign({ score }, x);
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 40);
  };

  const list = (res) => {
    if (!res.length) return `<p class="srch-empty">${UI.view.searchQ ? 'Aucun résultat pour « ' + esc(UI.view.searchQ) + ' ».' : 'Tapez un nom de municipalité, une exigence (« garantie », « RBQ »), une pièce, un projet ou un concurrent.'}</p>`;
    let html = '', last = '';
    res.forEach((r, i) => {
      if (r.type !== last) { html += `<li class="srch-g" role="presentation">${ic(GROUPS[r.type][0], 14)}${esc(GROUPS[r.type][1])}</li>`; last = r.type; }
      html += `<li role="option" id="srch-o-${i}" class="srch-o${i === Q.active ? ' is-on' : ''}" aria-selected="${i === Q.active}" data-i="${i}"><b>${esc(r.title)}</b><small>${esc(r.sub.length > 140 ? r.sub.slice(0, 140) + '…' : r.sub)}</small></li>`;
    });
    return `<ul class="srch-l" role="listbox" id="srch-list" aria-label="Résultats">${html}</ul>`;
  };
  const paint = () => {
    const host = U.$('#srch-res'); if (!host) return;
    host.innerHTML = list(Q.results);
    U.typo(host);
    const inp = U.$('#srch-q');
    if (inp) inp.setAttribute('aria-activedescendant', Q.results.length ? 'srch-o-' + Q.active : '');
    const on = host.querySelector('.srch-o.is-on'); if (on) on.scrollIntoView({ block: 'nearest' });
    const c = U.$('#srch-count'); if (c) c.textContent = Q.results.length ? Q.results.length + ' résultat' + (Q.results.length > 1 ? 's' : '') : '';
  };
  Q.open = () => {
    Q.active = 0;
    Q.results = UI.view.searchQ ? Q.find(UI.view.searchQ) : [];
    UI.dialog(`<div class="srch"><label class="srch-in">${ic('search', 18)}<span class="sr">Rechercher</span><input id="srch-q" type="search" role="combobox" aria-expanded="true" aria-controls="srch-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Rechercher dans TenderStrike…" value="${esc(UI.view.searchQ || '')}" autofocus></label>
      <div id="srch-res" class="srch-res"></div><p class="srch-help"><span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span><span><kbd>Entrée</kbd> ouvrir</span><span><kbd>Échap</kbd> fermer</span><span id="srch-count" aria-live="polite"></span></p></div>`, { title: 'Recherche', cls: 'dlg-search' });
    paint();
    const inp = U.$('#srch-q');
    if (inp) { inp.focus(); inp.select(); }
  };
  Q.go = (i) => {
    const r = Q.results[i]; if (!r) return;
    UI.closeDialog();
    if (r.cite) { const v = UI.viewer(r.cite.t); Object.assign(v, { doc: r.cite.doc, page: r.cite.page, clause: r.cite.clause }); UI.view.scrollPending = r.cite.t; UI.view.reqFilter[r.cite.t] = 'all'; }
    if (r.anchor) UI.view.pendingAnchor = r.anchor;
    TS.App.go(r.href);
  };
  Q.input = (el) => { UI.view.searchQ = el.value; Q.active = 0; Q.results = Q.find(el.value); paint(); };
  Q.key = (ev) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); if (!Q.results.length) return; Q.active = (Q.active + (ev.key === 'ArrowDown' ? 1 : -1) + Q.results.length) % Q.results.length; paint(); }
    else if (ev.key === 'Enter') { ev.preventDefault(); Q.go(Q.active); }
    else if (ev.key === 'Escape') { ev.preventDefault(); UI.closeDialog(); }
  };
})();
