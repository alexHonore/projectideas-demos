/* Nexus CTE V3 — interactions transversales : impression, exports, recherche globale (Ctrl K), démarrage. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, S = g.S, R = g.R, UI = g.UI, C = UI.C, esc = U.esc;

  /* ---------- impression (PDF via la boîte d'impression du navigateur) ---------- */
  function print(html) {
    var root = document.getElementById('print-root');
    root.innerHTML = html; U.typoTree(root);
    document.body.classList.add('printing');
    var clean = function () { document.body.classList.remove('printing'); root.innerHTML = ''; g.removeEventListener('afterprint', clean); };
    g.addEventListener('afterprint', clean);
    try { g.print(); } catch (e) { clean(); UI.toast('Impression indisponible dans ce navigateur.', 'err'); }
    setTimeout(function () { if (document.body.classList.contains('printing') && !g.matchMedia('print').matches) clean(); }, 1500);
  }
  function printHead(title, sub) { return '<header class="pr-head"><span>La Firme CTE</span><span>' + esc(sub) + '</span></header><h1>' + esc(title) + '</h1>'; }
  UI.UIA['print-teaser'] = function (p) {
    var m = S.mandate(p.m); if (!m.teaser.approved) { UI.toast('Exportation bloquée : sommaire non approuvé.', 'err'); return; }
    print('<div class="pr">' + UI.DOSSIER.teaserDoc(m) + '<p class="pr-foot">Approuvé par ' + esc(m.teaser.approved.by) + ' le ' + U.date(m.teaser.approved.date) + '. Provenance du brouillon : ' + esc(m.teaser.provenance && m.teaser.provenance.source === 'live-ai' ? 'IA en direct (' + m.teaser.provenance.model + ')' : m.teaser.source === 'scenario' ? 'IA scénarisée' : 'règles') + '; vérification des noms réussie. Confidentiel.</p></div>');
    UI.run('logOnly', { entity: m.code, action: 'Sommaire aveugle exporté (impression)', detail: 'Exportation filigranée et journalisée', m: m.id, kind: 'teaser' });
  };
  UI.UIA['print-schedule'] = function (p) {
    var m = S.mandate(p.m), h = {}, cm = m.committed || E.commitSchedule(m.dates.signed); m.history.forEach(function (e) { if (!h[e.stage]) h[e.stage] = e.date; });
    print('<div class="pr">' + printHead('Échéancier de votre transaction', m.codename) + '<p>Préparé pour ' + (S.P.identity() ? esc(m.profile.owner) : 'le cédant') + '. Les dates engagées découlent des durées types; les dates réelles sont mises à jour à chaque étape.</p><table class="ledger"><thead><tr><th>Étape</th><th>Date engagée</th><th>Date réelle</th></tr></thead><tbody>' + D.MANDATE_STAGES.map(function (s) { return '<tr><td>' + esc(s.label) + '</td><td>' + U.date(cm[s.id]) + '</td><td>' + (h[s.id] ? U.date(h[s.id]) : '—') + '</td></tr>'; }).join('') + '</tbody></table><p class="pr-foot">Document de démonstration, données fictives. Les délais sont un objectif opérationnel, pas une promesse.</p></div>');
  };
  UI.UIA['print-valuation'] = function (p) {
    var m = S.mandate(p.m), v = E.valuation(m);
    print('<div class="pr">' + printHead('Rapport d’évaluation, document de travail', m.codename) + '<p><strong>Votre entreprise vaut entre ' + U.money(v.ev.low) + ' et ' + U.money(v.ev.high) + '.</strong> Valeur médiane : ' + U.money(v.ev.mid) + ', soit ' + U.x(v.mult.mid) + ' un ' + E.BASE_LABEL[v.which].toLowerCase() + ' de ' + U.money(v.base) + '.</p><table class="ledger"><tbody>' + v.mods.filter(function (x) { return x.applied && x.value; }).map(function (x) { return '<tr><td>' + esc(x.mod.label) + '</td><td>' + U.signedX(x.value) + '</td></tr>'; }).join('') + '</tbody></table><p>Valeur des actions (médiane) : ' + U.money(v.equity.mid) + '.' + (m.property ? ' Immeuble évalué séparément : ' + U.money(m.property.value) + '.' : '') + '</p><p class="pr-foot">Validé par ' + esc(m.valApproved ? m.valApproved.by : '—') + '. Paramètres de marché démo, à valider par un EEE/CBV. Ne constitue pas un avis fiscal ni une évaluation certifiée.</p></div>');
  };
  UI.UIA['print-buyermap'] = function (p) {
    var st = S.get(), m = S.mandate(p.m), list = E.ranked(m, st).filter(function (x) { return !x.r.excluded; }), fn = E.funnel(m, st);
    var byType = {}; list.forEach(function (x) { var t = D.BUYER_TYPES[x.b.type]; byType[t] = (byType[t] || 0) + 1; });
    print('<div class="pr">' + printHead('Carte des acheteurs, anonymisée', m.codename) + '<p>Univers énumérable : ' + fn[0].n + ' sociétés; ' + fn[1].n + ' profils vérifiés; ' + fn[2].n + ' actifs depuis moins de 180 jours; ' + fn[4].n + ' avec preuve de financement.</p><table class="ledger"><thead><tr><th>Type d’acheteur</th><th>Nombre (profils détaillés)</th></tr></thead><tbody>' + Object.keys(byType).map(function (k) { return '<tr><td>' + esc(k) + '</td><td>' + byType[k] + '</td></tr>'; }).join('') + '</tbody></table><p>Aucun nom n’apparaît sur ce document.</p><p class="pr-foot">Document de démonstration, données fictives.</p></div>');
  };
  UI.UIA['audit-csv'] = function () {
    var st = S.get(), lines = [['Horodatage', 'Acteur', 'Entité', 'Action', 'Détail', 'Type'].map(U.csvCell).join(',')];
    st.audit.forEach(function (a) { lines.push([a.at, a.actor, a.entity, a.action, a.detail, a.kind || ''].map(U.csvCell).join(',')); });
    lines.push(U.csvCell('Exporté par ' + S.actorName() + ', démo Nexus CTE, données fictives'));
    U.download('nexus-cte-journal-audit.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
    UI.run('auditExport');
  };
  UI.UIA['access-export'] = function (p) {
    var st = S.get(), sel = document.getElementById('acc-person'), c = S.lead(p.id || (sel && sel.value) || st.radar.selected) || st.leads[0], cs = st.companyState[c.id] || {};
    var data = { demande: 'Accès (Loi 25, art. 27)', personne: c.director, entreprise: c.name, role: 'Dirigeant, administrateur depuis ' + c.directorSince, tranche_age: cs.ageBand || null, consentement_retire: cs.consentWithdrawn || null,
      points_de_contact: (c.contacts || []).map(function (k) { return { type: k.kind, valeur: k.value, source: k.src, saisi_le: k.srcDate, fondement: k.kind === 'Courriel' ? E.emailBasis(c, k, st) : 'sans objet' }; }),
      activites: (cs.calls || []).concat(cs.call && cs.call.committed ? [{ date: cs.lastTouch, disposition: cs.call.disposition }] : []), journal: st.audit.filter(function (a) { return a.entity === c.name; }).map(function (a) { return { horodatage: a.at, action: a.action }; }), genere_le: st.clock.d, note: 'Données fictives de démonstration' };
    U.download('acces-' + U.fold(c.director).replace(/[^a-z]+/g, '-') + '.json', JSON.stringify(data, null, 2), 'application/json');
    UI.run('accessExport', { id: c.id });
    UI.toast('Export JSON téléchargé : ' + c.director + '.');
  };

  /* ---------- recherche globale (Ctrl K) : écrans, commandes, mandats, pistes, acheteurs, pièces, lettres ---------- */
  var pal = { items: [], sel: 0 };
  function palItems() {
    var st = S.get(), out = [
      { l: 'Tour de contrôle', s: 'Écran', h: '#/' }, { l: 'Radar de relève', s: 'Écran', h: '#/radar' }, { l: 'Dossiers', s: 'Écran', h: '#/dossiers' }, { l: 'Moteur acheteurs', s: 'Écran', h: '#/acheteurs' }, { l: 'Conformité et journal d’audit', s: 'Écran', h: '#/conformite' }, { l: 'Salle de formation', s: 'Écran', h: '#/formation' },
      { l: 'Ouvrir le Labo de test', s: 'Commande', ui: 'lab-open' }, { l: 'Boîte de réception', s: 'Commande', ui: 'inbox-open' }, { l: 'Avancer l’horloge d’un jour', s: 'Commande', action: 'clockAdvance', p: { minutes: 1440 } },
      { l: 'Nouvelle piste', s: 'Commande', ui: 'lead-new' }, { l: 'Lancer la visite commentée', s: 'Commande', ui: 'tour-start' }, { l: 'Ouvrir le copilote', s: 'Commande', ui: 'copilot-open' }
    ];
    if (S.P.decideMandate()) out.splice(6, 0, { l: 'Nouveau mandat', s: 'Commande', h: '#/dossiers/nouveau' });
    if (S.P.buyersWrite()) out.push({ l: 'Nouveau profil acheteur', s: 'Commande', ui: 'buyer-new' });
    if (S.P.mandates()) S.mandates().forEach(function (m) {
      out.push({ l: m.codename + (S.P.identity() ? ' — ' + m.profile.company : ''), s: 'Mandat ' + m.code + ', ' + E.stageLabel(m.stage).toLowerCase() + (S.P.identity() ? ', ' + m.profile.city : ''), h: '#/dossier/' + m.id + '/apercu', k: S.P.identity() ? m.profile.owner + ' ' + m.profile.neq : '' });
      UI.DOSSIER.TABS.slice(1).forEach(function (t) { out.push({ l: m.codename + ' : ' + t.label, s: 'Dossier ' + m.code, h: '#/dossier/' + m.id + '/' + t.id, deep: true }); });
      if (S.P.room()) (m.room.docs || []).forEach(function (d) { out.push({ l: d.name, s: 'Pièce téléversée, ' + m.codename, h: '#/dossier/' + m.id + '/salle', deep: true }); });
      if (S.P.financials()) (m.lois || []).forEach(function (l) { out.push({ l: 'Lettre de ' + (S.buyer(l.buyer) || {}).name, s: m.codename + ', ' + U.money(l.ev), h: '#/dossier/' + m.id + '/cloture', deep: true }); });
    });
    st.leads.forEach(function (c) { out.push({ l: c.name, s: 'Piste, NEQ ' + c.neq + ', ' + c.city, h: '#/radar/' + c.id, k: c.director }); });
    st.buyers.forEach(function (b) { out.push({ l: b.name, s: 'Acheteur, ' + D.BUYER_TYPES[b.type] + (b.archived ? ', archivé' : ''), h: '#/acheteurs/' + b.id, k: (b.criteria.sectors || []).join(' ') }); });
    return out;
  }
  function norm(s) { return U.fold(s).replace(/\s/g, ''); }
  function palRender(q) {
    var all = palItems(), nq = norm(q || '');
    pal.items = !nq ? all.filter(function (i) { return !i.deep; }).slice(0, 14) : all.filter(function (i) { return norm(i.l + i.s + (i.k || '')).indexOf(nq) >= 0; }).slice(0, 14);
    pal.sel = Math.min(pal.sel, Math.max(0, pal.items.length - 1));
    var ul = document.getElementById('pal-list');
    ul.innerHTML = pal.items.length ? pal.items.map(function (i, n) { return '<li role="option" id="pal-' + n + '" aria-selected="' + (n === pal.sel) + '" class="' + (n === pal.sel ? 'is-sel' : '') + '" data-ui="pal-go" data-n="' + n + '"><strong>' + esc(i.l) + '</strong><span>' + esc(i.s) + '</span></li>'; }).join('') : '<li class="pal-empty">Aucun résultat. Essayez un NEQ, un nom d’entreprise, un code de mandat ou « Outarde ».</li>';
    document.getElementById('pal-input').setAttribute('aria-activedescendant', pal.items.length ? 'pal-' + pal.sel : '');
    var cur = document.getElementById('pal-' + pal.sel); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    U.typoTree(ul);
  }
  UI.UIA['palette-open'] = function () {
    var p = document.getElementById('palette');
    p.innerHTML = '<div class="pal-box"><label class="sr-only" for="pal-input">Rechercher un mandat, une entreprise, un acheteur, un écran ou une commande</label><input id="pal-input" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" placeholder="Mandat, NEQ, entreprise, acheteur, pièce, commande" autocomplete="off"><ul id="pal-list" role="listbox" aria-label="Résultats"></ul><p class="pal-hint">Flèches pour naviguer, Entrée pour ouvrir, Échap pour fermer.</p></div>';
    p.hidden = false; document.getElementById('scrim').hidden = false;
    pal.sel = 0; palRender('');
    var inp = document.getElementById('pal-input'); inp.focus();
    inp.addEventListener('input', function () { pal.sel = 0; palRender(inp.value); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); pal.sel = Math.min(pal.items.length - 1, pal.sel + 1); palRender(inp.value); }
      if (e.key === 'ArrowUp') { e.preventDefault(); pal.sel = Math.max(0, pal.sel - 1); palRender(inp.value); }
      if (e.key === 'Enter') { e.preventDefault(); palGo(pal.sel); }
      if (e.key === 'Tab') { e.preventDefault(); }
    });
  };
  function palGo(n) { var i = pal.items[n]; UI.UIA['palette-close'](); if (!i) return; if (i.ui) UI.UIA[i.ui]({}); else if (i.action) UI.run(i.action, i.p); else if (location.hash === i.h) UI.render(); else location.hash = i.h; }
  UI.UIA['pal-go'] = function (p) { palGo(+p.n); };
  UI.UIA['palette-close'] = function () { var p = document.getElementById('palette'); if (p.hidden) return; p.hidden = true; p.innerHTML = ''; if (document.getElementById('drawer').hidden && document.getElementById('copilot').hidden) document.getElementById('scrim').hidden = true; };
  document.getElementById('scrim').addEventListener('click', function () { UI.UIA['palette-close'](); });

  /* ---------- démarrage ---------- */
  function boot() {
    UI.render({ scrollTop: true, noFocus: true });
    var h = (location.hash || '').split('#');
    if (h.length > 2) { var t = document.getElementById(h[2]); if (t) t.scrollIntoView(); }
  }
  g.addEventListener('hashchange', function () { var h = (location.hash || '').split('#'); if (h.length > 2) setTimeout(function () { var t = document.getElementById(h[2]); if (t) t.scrollIntoView({ block: 'start' }); }, 0); });
  boot();
})(window);
