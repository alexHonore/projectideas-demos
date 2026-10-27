/* Nexus CTE V3 — Copilote : questions sur les données du cabinet, sous les permissions du rôle.
   Réponses déterministes calculées sur l'état courant (tous les mandats), jamais un chiffre inventé. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, S = g.S, UI = g.UI, C = UI.C, esc = U.esc;
  var thread = [];

  function findMandate(t) {
    var f = U.fold(t), ms = S.mandates();
    return ms.filter(function (m) { return f.indexOf(U.fold(m.code)) >= 0 || f.indexOf(U.fold(m.codename.replace(/^Projet /, ''))) >= 0 || (S.P.identity() && g.R.tokens(m.profile.company).some(function (w) { return f.indexOf(U.fold(w)) >= 0; })); })[0] || null;
  }
  function findBuyer(t) { var f = U.fold(t); return S.get().buyers.filter(function (b) { return g.R.tokens(b.name).some(function (w) { return w.length > 4 && f.indexOf(U.fold(w)) >= 0; }); })[0] || null; }
  function mName(m) { return S.P.identity() ? m.codename + ' (' + m.profile.company + ')' : m.codename + ' (' + m.blind.sector.toLowerCase() + ', ' + m.profile.region + ')'; }

  function answer(q) {
    var st = S.get(), t = U.fold(q), canM = S.P.mandates();
    if (/fiscal|impot|exoneration|aape|purification/.test(t)) return { text: 'Je n’offre pas de conseil fiscal. Je peux expliquer un concept à partir de la Salle de formation; la décision appartient au fiscaliste du cédant.', cards: [{ t: 'Leçon C4.9 L1', s: 'Expliquer un concept ou donner un conseil : la ligne' }], actions: [{ l: 'Ouvrir la Salle de formation', h: '#/formation' }] };
    if (/actions.*actifs|actifs.*actions|vente d.actions/.test(t)) return { text: 'Dans une vente d’actions, l’acheteur reprend la société avec son historique; le cédant peut, selon sa situation, se prévaloir de l’exonération cumulative des gains en capital. Dans une vente d’actifs, l’acheteur choisit les actifs et obtient une meilleure base fiscale; le produit reste dans la société du cédant. Pour la situation précise du cédant, le fiscaliste tranche.', cards: [{ t: 'Section 4, chapitre C4.1', s: 'Actions ou actifs : le conflit fondamental' }], actions: [{ l: 'Ouvrir la Salle de formation', h: '#/formation' }] };
    var m = findMandate(q);
    if (/retard|risque|bloque/.test(t)) {
      if (!canM) return { text: 'Aucun mandat n’est accessible à votre rôle.', cards: [], actions: [{ l: 'Ouvrir le radar de relève', h: '#/radar' }] };
      var late = S.mandates().map(function (x) { return { m: x, a: E.nextAction(x, st), r: E.risks(x, st) }; }).filter(function (x) { return x.a.late || x.r.length; });
      return { text: late.length ? late.length + ' dossier' + (late.length > 1 ? 's' : '') + ' en retard ou à risque au ' + U.date(st.clock.d) + ' :' : 'Aucun dossier en retard au ' + U.date(st.clock.d) + '.', cards: late.map(function (x) { return { t: mName(x.m), s: (x.a.late ? x.a.text + ' (prévu le ' + U.date(x.a.due) + ')' : '') + (x.r[0] ? (x.a.late ? '; ' : '') + x.r[0].why : '') }; }), actions: [{ l: 'Ouvrir la tour de contrôle', h: '#/' }] };
    }
    if (/qui pourrait acheter|acheteurs? (pour|du)|candidat/.test(t) && !/vaut|valeur/.test(t)) {
      if (!canM) return { text: 'Je ne trouve aucun mandat accessible à votre rôle.', cards: [], actions: [{ l: 'Ouvrir le radar de relève', h: '#/radar' }], note: 'Permission structurelle : la requête ne retourne rien, ce n’est pas une consigne donnée au modèle.' };
      m = m || S.mandate(st.towerMandate) || S.mandates()[0];
      if (!m.fin.entered) return { text: mName(m) + ' n’a pas encore d’états financiers : l’appariement attend le BAIIA.', cards: [], actions: [{ l: 'Saisir les états financiers', h: '#/dossier/' + m.id + '/retraitement' }] };
      var list = E.ranked(m, st).filter(function (x) { return !x.r.excluded && !m.cautions[x.b.id] && !x.refused; }).slice(0, 3);
      var held = Object.keys(m.cautions).map(function (id) { return S.buyer(id).name; }).concat(Object.keys(m.exclusions).map(function (id) { return S.buyer(id).name + ' (exclu)'; }));
      return { note: held.length ? 'Approche sous condition ou exclue : ' + held.join(', ') + '.' : null, text: 'Pour ' + mName(m) + ', les trois meilleurs candidats approchables selon le ' + D.WEIGHTS[st.weights].label + ' sont :', cards: list.map(function (x) { return { t: x.b.name + ', ' + x.r.score, s: D.BUYER_TYPES[x.b.type] + '. ' + x.r.chips.join(', ') }; }), actions: [{ l: 'Ouvrir le classement', h: '#/dossier/' + m.id + '/acheteurs' }] };
    }
    var b = findBuyer(q);
    if (b && /pourquoi|score/.test(t)) {
      m = m || S.mandate(st.towerMandate) || S.mandates()[0];
      if (!canM || !m || !m.fin.entered) return { text: b.name + ' : ' + D.BUYER_TYPES[b.type] + ', ' + b.thesis, cards: [], actions: [{ l: 'Voir la fiche acheteur', h: '#/acheteurs/' + b.id }] };
      var r = E.matchScore(b, m, st.weights, st);
      return { text: b.name + ' obtient ' + (r.excluded ? '0 (exclu : ' + r.reason + ')' : r.score) + ' pour ' + mName(m) + ' : ' + r.chips.join(', ').toLowerCase() + '. Le score est un rang relatif, pas une probabilité de clôture.', cards: r.parts.slice(0, 4).map(function (p) { return { t: p.label, s: p.sub + ' sur 100, poids ' + p.w + ' %' }; }), actions: [{ l: 'Voir la fiche acheteur', h: '#/acheteurs/' + b.id }] };
    }
    if (b && /approch|deja|contact/.test(t)) {
      var hist = (b.refusals || []).map(function (x) { var mm = S.mandate(x.m); return { t: 'A décliné ' + (mm && canM ? mm.codename : x.code), s: x.reason + ', ' + U.date(x.date) }; });
      if (canM) S.mandates().forEach(function (x) { if (x.nda[b.id]) hist.push({ t: x.codename, s: (UI.DOSSIER.NDA[x.nda[b.id]] || ['En discussion'])[0] }); });
      (b.history || []).forEach(function (h) { hist.push(h); });
      return { text: hist.length ? 'Oui. ' + b.name + ' a été approché : ' : 'Aucune approche consignée pour ' + b.name + '.', cards: hist, actions: [{ l: 'Voir la fiche acheteur', h: '#/acheteurs/' + b.id }] };
    }
    if (/vaut|valeur|combien/.test(t)) {
      if (!S.P.financials() || !canM) return { text: 'Les montants des mandats ne sont pas accessibles à votre rôle.', cards: [], actions: [], note: 'Le copilote utilise le même client de données que l’interface.' };
      m = m || S.mandate(st.towerMandate) || S.mandates()[0];
      if (!m.fin.entered) return { text: mName(m) + ' n’a pas encore d’états financiers.', cards: [], actions: [{ l: 'Saisir les états financiers', h: '#/dossier/' + m.id + '/retraitement' }] };
      var v = E.valuation(m);
      return { text: 'Le moteur situe la valeur d’entreprise de ' + mName(m) + ' entre ' + U.money(v.ev.low) + ' et ' + U.money(v.ev.high) + ', médiane ' + U.money(v.ev.mid) + ', à partir d’un ' + E.BASE_LABEL[v.which].toLowerCase() + ' de ' + U.money(v.base) + ' et d’un multiple médian de ' + U.x(v.mult.mid) + '. Je n’émets aucun chiffre moi-même.', cards: [{ t: 'Fourchette', s: m.valApproved ? 'Validée par la courtière' : 'Non validée' }], actions: [{ l: 'Ouvrir l’évaluation', h: '#/dossier/' + m.id + '/evaluation' }] };
    }
    return { text: 'Je réponds à partir des données du cabinet et de la Salle de formation seulement. Essayez une des questions proposées, ou nommez un mandat (code ou nom de code) ou un acheteur.', cards: [], actions: [] };
  }

  function render() {
    var el = document.getElementById('copilot'), samples = D.COPILOT_SAMPLES.concat(['Quels dossiers sont en retard ?']);
    el.innerHTML = '<div class="drawer-head"><h2 id="copilot-title">Copilote</h2><button type="button" class="icon-btn" data-ui="copilot-close" aria-label="Fermer le copilote">' + C.icon('x') + '</button></div>' +
      '<div class="drawer-body"><p class="cell-sub">Répond à partir des données du cabinet, avec vos permissions (' + esc(D.ROLE_LABEL[S.get().role].toLowerCase()) + '). Réponses calculées sur l’état courant; aucun outil n’agit sans votre clic.</p>' +
      '<ul class="cp-samples">' + samples.map(function (s) { if (!S.P.identity()) s = s.replace('Usinage Beaucage', 'le Projet Outarde'); return '<li><button type="button" class="seg" data-ui="copilot-ask" data-q="' + esc(s) + '">' + esc(s) + '</button></li>'; }).join('') + '</ul>' +
      '<ol class="cp-thread" aria-live="polite">' + thread.map(function (m) {
        if (m.q) return '<li class="cp-q">' + esc(m.q) + '</li>';
        var a = m.a;
        return '<li class="cp-a"><p>' + esc(a.text) + '</p>' + (a.cards.length ? '<ul class="cp-cards">' + a.cards.map(function (c) { return '<li><strong>' + esc(c.t) + '</strong><span>' + esc(c.s) + '</span></li>'; }).join('') + '</ul>' : '') + (a.note ? '<p class="fineprint">' + esc(a.note) + '</p>' : '') + (a.actions.length ? '<p class="cp-actions">' + a.actions.map(function (x) { return '<a class="btn btn-sm btn-quiet" href="' + x.h + '">' + esc(x.l) + '</a>'; }).join('') + '</p>' : '') + '</li>';
      }).join('') + '</ol>' +
      '<form class="cp-form" data-ui-form="copilot"><label class="sr-only" for="cp-input">Votre question</label><input id="cp-input" name="q" type="text" placeholder="Posez une question sur un dossier, un acheteur…" autocomplete="off"><button type="submit" class="btn btn-primary btn-sm">Demander</button></form></div>';
    U.typoTree(el);
    var th = el.querySelector('.cp-thread'); if (th && th.lastElementChild) th.lastElementChild.scrollIntoView({ block: 'nearest' });
  }
  function ask(q) { if (!q || !q.trim()) return; thread.push({ q: q.trim() }); thread.push({ a: answer(q) }); render(); var i = document.getElementById('cp-input'); if (i) i.focus(); }

  UI.UIA['copilot-open'] = function () { var el = document.getElementById('copilot'); UI.closeDrawer(); render(); el.hidden = false; document.getElementById('scrim').hidden = false; var h = el.querySelector('h2'); h.setAttribute('tabindex', '-1'); h.focus(); };
  UI.UIA['copilot-close'] = function () { var el = document.getElementById('copilot'); if (el.hidden) return; el.hidden = true; if (document.getElementById('drawer').hidden) document.getElementById('scrim').hidden = true; };
  UI.UIA['copilot-ask'] = function (p) { ask(p.q); };
  UI.FORMS.copilot = function (f) { ask(f.elements.q.value); };
  g.Copilot = { answer: answer };
})(window);
