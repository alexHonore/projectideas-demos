/* Nexus CTE V3 — Moteur acheteurs (CRM) : profils, critères déclarés et appris, refus structurés, appariement inverse sur tous les mandats. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, S = g.S, UI = g.UI, C = UI.C, esc = U.esc;
  var filt = { q: '', type: '', show: 'actifs' };

  function money(v) { return v == null ? '—' : U.moneyShort(v); }
  function range(a, b) { return a == null && b == null ? 'non déclaré' : a != null && b != null ? money(a) + ' à ' + money(b) : a != null ? 'à partir de ' + money(a) : 'jusqu’à ' + money(b); }
  function reverse(b, st) {
    if (!S.P.mandates()) return [];
    return S.mandates().filter(function (m) { return m.fin.entered && (!b.onlyMandate || b.onlyMandate === m.id) && b.underMandate !== m.id; }).map(function (m) {
      var r = E.matchScore(b, m, st.weights, st), refused = (m.refusals || []).filter(function (x) { return x.buyer === b.id; })[0];
      var note = r.excluded ? r.reason : refused ? 'A décliné ce dossier : ' + refused.reason : m.nda[b.id] ? (UI.DOSSIER.NDA[m.nda[b.id]] || ['En discussion'])[0] : m.shortlist.indexOf(b.id) >= 0 ? 'Retenu sur la liste' : m.stage === 'conclu' ? 'Dossier conclu' : E.stageLabel(m.stage);
      return { m: m, score: r.excluded ? 0 : r.score, band: r.band, note: note };
    }).sort(function (a, c) { return c.score - a.score; });
  }
  function detail(b, st) {
    var fr = E.freshness(b.lastVerified, st.clock.d), cr = b.criteria || {}, rev = reverse(b, st), prop = b.type === 'investisseur_immobilier';
    var html = '<article class="sheet bd" aria-labelledby="bd-title"><header class="bd-head"><div><h2 id="bd-title">' + esc(b.name) + (b.archived ? ' ' + C.chip('Archivé', '') : '') + '</h2><p class="muted">' + esc(D.BUYER_TYPES[b.type]) + ', ' + esc(b.city) + (b.region ? ' (' + esc(b.region) + ')' : '') + '</p></div><span class="fresh fresh-' + fr.level + '">' + esc(fr.label) + '</span></header>' +
      '<p class="bd-thesis">' + esc(b.thesis) + '</p>' +
      (S.P.buyersWrite() ? '<div class="actions">' + C.btn('Modifier les critères', 'buyer-edit', { ui: true, small: true, variant: 'quiet', icon: 'edit', data: { id: b.id }, key: 'buyer-edit' }) + C.btn(b.archived ? 'Réactiver' : 'Archiver', 'buyerArchive', { small: true, variant: 'ghost', data: { id: b.id }, key: 'buyer-archive' }) + C.btn('Supprimer', 'buyer-delete', { ui: true, small: true, variant: 'ghost', icon: 'trash', data: { id: b.id }, key: 'buyer-delete' }) + '</div>' : '');
    var critHtml = '<div class="grid-2 grid-tight"><div><h3 class="sub-h">Critères déclarés</h3><dl class="facts">' +
      (prop ? '<div><dt>Prix des immeubles</dt><dd>' + range(cr.propertyMin, cr.propertyMax) + '</dd></div><div><dt>Rendement visé</dt><dd>' + esc(cr.yieldTarget || '—') + '</dd></div><div><dt>Bail</dt><dd>' + esc(cr.lease || '—') + '</dd></div>' :
        '<div><dt>Secteurs (SCIAN)</dt><dd>' + esc((cr.sectors || []).join(', ') || '—') + '</dd></div><div><dt>Chiffre d’affaires</dt><dd>' + range(cr.revenueMin, cr.revenueMax) + '</dd></div><div><dt>BAIIA</dt><dd>' + range(cr.ebitdaMin, cr.ebitdaMax) + '</dd></div>' +
        '<div><dt>Structure</dt><dd>' + esc((cr.structures || []).map(function (s) { return D.STRUCT_LABEL[s] || s; }).join(', ') || 'non déclarée') + (cr.bpvOk ? '; BPV acceptée' : '') + (cr.leaseback === true ? '; cession-bail acceptée' : cr.leaseback === false ? '; veut acheter l’immeuble' : '') + '</dd></div>') +
      '<div><dt>Géographie</dt><dd>' + esc((cr.regions || []).join(', ')) + '</dd></div><div><dt>Mise de fonds</dt><dd>' + range(b.equityMin, b.equityMax) + '</dd></div><div><dt>Financement</dt><dd>' + esc(b.financing) + (b.fundingEvidence ? ' ' + C.chip('Preuve au dossier', 'ok') : '') + '</dd></div><div><dt>Échéancier</dt><dd>' + esc(D.TIMELINES[b.timeline] || b.timeline) + '</dd></div><div><dt>Acquisitions</dt><dd>' + (b.acquisitions || 0) + '</dd></div></dl></div>' +
      '<div><h3 class="sub-h">Critères appris</h3>' + ((b.inferred || []).length ? '<ul class="inferred">' + b.inferred.map(function (i) { return '<li>' + C.chip('Appris', 'warn') + esc(i) + '</li>'; }).join('') + '</ul>' : '<p class="cell-sub">Aucun critère appris pour l’instant. Chaque refus structuré en ajoute, sans écraser les critères déclarés.</p>') +
      '<h3 class="sub-h">Relations</h3>' + ((b.relations || []).length ? '<ul class="rels">' + b.relations.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' : '<p class="cell-sub">Aucune relation consignée.</p>') +
      ((b.refusals || []).length ? '<h3 class="sub-h">Refus structurés</h3><ul class="rels">' + b.refusals.map(function (r) { return '<li>' + U.date(r.date) + ', ' + esc(S.P.identity() || !S.mandate(r.m) ? r.code : S.mandate(r.m).codename) + ' : <strong>' + esc(r.reason) + '</strong>' + (r.note ? '. ' + esc(r.note) : '') + '</li>'; }).join('') + '</ul>' : '') + '</div></div>';
    if (!prop && rev.length) html += '<h3 class="sub-h">Appariement inverse : mandats qui correspondent</h3><table class="ledger"><thead><tr><th scope="col">Mandat</th><th scope="col" class="num">Score</th></tr></thead><tbody>' + rev.map(function (r) { var name = S.P.identity() ? r.m.codename + ', ' + r.m.profile.company : r.m.codename + ', ' + r.m.blind.sector.toLowerCase() + ', ' + r.m.profile.region; return '<tr><th scope="row"><a href="#/dossier/' + r.m.id + '/acheteurs">' + esc(name) + '</a><span class="cell-sub">' + esc(r.note) + '</span></th><td class="num">' + r.score + '</td></tr>'; }).join('') + '</tbody></table><p class="fineprint">Recalculé à chaque modification des critères, de l’horloge ou du mandat. Anonymisé au secteur, à la taille et à la région tant que la courtière n’autorise pas la divulgation à cet acheteur précis.</p>';
    html += '<h3 class="sub-h">Requalification (§7.7)</h3><p class="cell-sub">« Envisagez-vous une acquisition d’ici 24 mois ? » Chaque réponse va dans un champ; la date de vérification remet la confiance à jour et relance l’appariement.</p>' +
      C.btn('Requalifier par appel (simulé)', 'requalify', { variant: 'quiet', icon: 'phone', data: { id: b.id }, blocked: S.P.buyersWrite() ? null : 'Les profils acheteurs sont mis à jour par les agents acheteurs et la courtière.', key: 'requal' }) + '</article>';
    return html;
  }

  UI.VIEWS.acheteurs = function (r) {
    var st = S.get();
    var all = st.buyers.filter(function (b) { return filt.show === 'tous' || (filt.show === 'archives' ? b.archived : !b.archived); })
      .filter(function (b) { return !filt.type || b.type === filt.type; })
      .filter(function (b) { return !filt.q || U.fold(b.name + ' ' + b.city + ' ' + (b.criteria.sectors || []).join(' ')).indexOf(U.fold(filt.q)) >= 0; });
    var sel = S.buyer(r.parts[0]) || all[0] || st.buyers[0];
    var list = all.map(function (b) {
      var fr = E.freshness(b.lastVerified, st.clock.d), dual = b.underMandate && S.P.identity() && S.mandate(b.underMandate);
      var tone = fr.level === 'high' ? 'ok' : fr.level === 'low' ? 'block' : 'warn';
      var flags = '<span class="state-i state-' + tone + '" title="' + esc(fr.label) + '" aria-label="' + esc(fr.label) + '">' + C.icon('clock') + '</span>' +
        (b.type === 'investisseur_immobilier' && b.buyerMandate ? '<span class="state-i state-warn" title="Mandat d’achat rémunéré" aria-label="Mandat d’achat rémunéré">' + C.icon('stamp') + '</span>' : '<span class="state-i state-' + (b.fundingEvidence ? 'ok' : 'warn') + '" title="' + (b.fundingEvidence ? 'Financement documenté' : 'Financement à prouver') + '" aria-label="' + (b.fundingEvidence ? 'Financement documenté' : 'Financement à prouver') + '">' + C.icon('M12 3v18M16 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8') + '</span>') +
        ((b.refusals || []).length ? '<span class="state-i state-idle" title="Refus consigné" aria-label="Refus consigné">' + C.icon('x') + '</span>' : '') + (dual ? '<span class="chip chip-brass" title="Aussi sous mandat de vente">' + esc(dual.code) + '</span>' : '') + (b.archived ? '<span class="state-i state-idle" title="Archivé" aria-label="Archivé">' + C.icon('M4 7h16v13H4zM9 11h6M3 4h18v3H3z') + '</span>' : '');
      return '<li><a href="#/acheteurs/' + b.id + '" class="bl-row' + (sel && sel.id === b.id ? ' is-sel' : '') + '"' + (sel && sel.id === b.id ? ' aria-current="true"' : '') + ' title="' + esc(D.BUYER_TYPES[b.type] + ', ' + b.city) + '"><span class="bl-name">' + esc(b.name) + '</span><span class="bl-flags">' + flags + '</span></a></li>';
    }).join('');
    var cnt = st.counters, fresh = st.buyers.filter(function (b) { return E.isBusinessBuyer(b) && b.lastVerified && U.diffDays(b.lastVerified, st.clock.d) <= 180; }).length;
    var tools = '<div class="crm-tools"><label class="field field-inline"><span class="sr-only">Rechercher</span><input type="search" value="' + esc(filt.q) + '" data-change="buyer-filter" data-f="q" data-key="buyer-q" placeholder="Nom, ville, SCIAN" aria-label="Rechercher un profil"></label><label class="field field-inline"><span class="sr-only">Type</span><select aria-label="Type d’acheteur" data-change="buyer-filter" data-f="type" data-key="buyer-type"><option value="">Tous</option>' + Object.keys(D.BUYER_TYPES).map(function (k) { return '<option value="' + k + '"' + (filt.type === k ? ' selected' : '') + '>' + esc(D.BUYER_TYPES[k]) + '</option>'; }).join('') + '</select></label><label class="field field-inline"><span>Profils</span><select data-change="buyer-filter" data-f="show" data-key="buyer-show">' + [['actifs', 'Actifs'], ['archives', 'Archivés'], ['tous', 'Tous']].map(function (o) { return '<option value="' + o[0] + '"' + (filt.show === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      (S.P.buyersWrite() ? C.btn('Nouveau profil', 'buyer-new', { ui: true, variant: 'primary', icon: 'plus', key: 'buyer-new', label: 'Nouveau profil acheteur' }) : '') + '</div>';
    var counters = '<ul class="counters counters-inline" aria-label="Actif cumulatif"><li title="Relations connues"><strong>' + U.num(cnt.relations) + '</strong>' + C.icon('M8 12h8M5 9a3 3 0 1 0 0 6M19 9a3 3 0 1 1 0 6') + '</li><li title="Critères appris"><strong>' + U.num(cnt.criteria) + '</strong>' + C.icon('spark') + '</li><li title="Refus structurés"><strong>' + U.num(cnt.refusals) + '</strong>' + C.icon('x') + '</li><li title="Profils détaillés vérifiés depuis moins de 180 jours"><strong>' + fresh + '</strong>' + C.icon('check') + '</li></ul>';
    return '<div class="page"><header class="page-head page-head-row"><h1>Acheteurs ' + C.info('Un courtier en transfert d’entreprise ne vend pas une inscription : il vend de la demande. Chaque profil créé, modifié, requalifié ou archivé relance l’appariement sur tous les mandats ouverts. Compteurs : relations connues, critères appris, refus structurés, profils vérifiés depuis moins de 180 jours.' + (S.P.identity() ? ' Distribution Hydraulique Nadeau inc. est aussi sous mandat de vente aveugle : en vue agente acheteurs, aucun badge ne le révèle.' : ''), 'Acheteurs') + '</h1>' + counters + '</header>' +
      tools + '<div class="radar-grid"><section class="sheet r-list" aria-label="Profils acheteurs"><h2 class="sr-only">Profils acheteurs</h2>' + (list ? '<ul>' + list + '</ul>' : C.empty('Aucun profil', 'Modifiez les filtres ou créez un profil.')) + '' + '</section>' + (sel ? detail(sel, st) : '') + '</div></div>';
  };
  UI.UIA['buyer-filter'] = function (p) { filt[p.f] = p.value; UI.render(); };
})(window);
