/* Nexus CTE V3 — coquille, routeur, composants, boîte de réception et délégation d'événements. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, S = g.S;
  var esc = U.esc;
  var VIEWS = {};
  var current = { route: null, key: null };

  var NAV = [
    { id: 'tower', href: '#/', label: 'Tour de contrôle', short: 'Contrôle', icon: 'M3 12l3-3 3 3 4-6 4 4 4-2M3 19h18' },
    { id: 'radar', href: '#/radar', label: 'Radar de relève', short: 'Radar', icon: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12l5-3M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0' },
    { id: 'dossiers', href: '#/dossiers', label: 'Dossiers', short: 'Dossiers', icon: 'M4 6h6l2 2h8v11H4zM4 6v13' },
    { id: 'acheteurs', href: '#/acheteurs', label: 'Acheteurs', short: 'Acheteurs', icon: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5M17 11a2.5 2.5 0 1 0 0-5M17 14c2.2.4 4 2 4 5' },
    { id: 'conformite', href: '#/conformite', label: 'Conformité', short: 'Conformité', icon: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6zM9 12l2 2 4-4' },
    { id: 'formation', href: '#/formation', label: 'Formation', short: 'Formation', icon: 'M3 8l9-4 9 4-9 4zM7 10v5c3 2 7 2 10 0v-5' }
  ];
  function icon(path, cls) { return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + path + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }
  var ICON = {
    doc: 'M7 3h7l4 4v14H7zM14 3v4h4', lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z', check: 'M5 12l4 4 10-10', x: 'M6 6l12 12M18 6L6 18',
    alert: 'M12 4l9 16H3zM12 10v4M12 17v.5', spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
    arrow: 'M5 12h14M13 6l6 6-6 6', phone: 'M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z', copy: 'M9 9h11v11H9zM5 15H4V4h11v1', download: 'M12 4v11M7 10l5 5 5-5M4 20h16', upload: 'M12 20V9M7 14l5-5 5 5M4 4h16',
    stamp: 'M9 4h6l-1 7h4l1 4H5l1-4h4zM5 19h14', plus: 'M12 5v14M5 12h14', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0', flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7.5 14h9', mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3'
  };

  /* ---------------- composants ---------------- */
  var C = {};
  C.icon = function (name, cls) { return icon(ICON[name] || name, cls); };
  C.chip = function (text, tone, title) { return '<span class="chip' + (tone ? ' chip-' + tone : '') + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' + esc(text) + '</span>'; };
  C.src = function (ref, m, label) {
    if (!ref) return '<span class="src src-missing">' + C.icon('alert') + 'Non sourcé</span>';
    if (ref === 'moteur') return '<span class="src src-engine" title="Valeur calculée par le moteur déterministe">' + C.icon('check') + 'Calcul du moteur</span>';
    if (ref === 'mandat') return '<span class="src" title="Contrat de mandat exclusif">' + C.icon('doc') + 'Mandat exclusif</span>';
    if (ref === 'salle') return '<span class="src">' + C.icon('doc') + 'Salle de données</span>';
    if (/^\d\d-\d\d$/.test(ref) && m) { var ist = E.itemStatus(m, ref), okI = ist === 'revise' || ist === 'sans_objet'; return '<a class="src' + (okI ? '' : ' src-missing') + '" href="#/dossier/' + m.id + '/salle" title="' + esc(E.itemName(m, ref)) + '">' + C.icon(okI ? 'doc' : 'alert') + 'Pièce ' + esc(ref) + (okI ? '' : ' (' + esc((D.ITEM_STATUS[ist] || ist).toLowerCase()) + ')') + '</a>'; }
    return '<span class="src">' + C.icon('doc') + esc(label || ref) + '</span>';
  };
  // Provenance : règles, IA scénarisée (dossiers semés), IA en direct (modèle et durée), saisie manuelle, Labo de test.
  function normProv(p) {
    if (!p) return { source: 'rules' };
    if (p.source === 'ia-scenario') return { source: 'scenario' };
    if (p.source === 'ia-direct') return Object.assign({}, p, { source: 'live-ai' });
    return p;
  }
  C.prov = function (p) {
    p = normProv(p);
    if (p.source === 'live-ai') return '<span class="prov-badge prov-live" title="Réponse du modèle, validée contre le schéma avant affichage">' + C.icon('spark', 'ico ico-sm') + 'IA en direct · ' + esc(p.model || 'claude-opus-5-5') + (p.ms ? ' · ' + U.num(p.ms / 1000, 1) + ' s' : '') + '</span>';
    if (p.source === 'scenario') return '<span class="prov-badge prov-scen" title="Texte préparé pour la démonstration (dossier semé)">' + C.icon('spark', 'ico ico-sm') + 'IA scénarisée</span>';
    if (p.source === 'manual') return '<span class="prov-badge" title="Saisi par une personne">' + C.icon('edit', 'ico ico-sm') + 'Saisi à la main</span>';
    if (p.source === 'lab') return '<span class="prov-badge" title="Événement injecté depuis le Labo de test">' + C.icon('flask', 'ico ico-sm') + 'Labo de test</span>';
    if (p.source === 'mixed') return (p.parts || []).map(C.prov).join(' ');
    return '<span class="prov-badge prov-rules" title="Moteur de règles déterministe, sans réseau">' + C.icon('check', 'ico ico-sm') + 'Règles' + (p.fallback ? ' (repli)' : '') + '</span>';
  };
  // Provenance d'une liste de propositions : une seule source ou « mixte » (une pastille par source distincte).
  C.provOf = function (items) {
    var parts = [], seen = {};
    (items || []).forEach(function (it) {
      var p = normProv(it), k = p.source === 'live-ai' ? 'live-ai:' + (p.model || '') : p.source + (p.fallback ? ':fb' : '');
      if (!seen[k]) { seen[k] = true; parts.push(p.source === 'live-ai' ? { source: 'live-ai', model: p.model } : p); }
    });
    if (!parts.length) return { source: 'rules' };
    return parts.length === 1 ? parts[0] : { source: 'mixed', parts: parts };
  };
  // Provenance d'un élément de dossier (retraitement, modulateur, constat) d'après son champ « source ».
  C.itemProv = function (x) {
    var s = x && x.source;
    if (s === 'ia-direct') return x.provenance || { source: 'live-ai' };
    if (s === 'ia-scenario') return { source: 'scenario' };
    if (s === 'manuel') return { source: 'manual' };
    if (s === 'injecté') return { source: 'lab' };
    return x && x.provenance && x.provenance.fallback ? { source: 'rules', fallback: x.provenance.fallback } : { source: 'rules' };
  };
  // Bandeau d'une section de propositions : son libellé découle de la provenance réelle; une sortie des règles n'est jamais dite « IA ».
  C.ai = function (cap, conf, body, extra, prov) {
    prov = normProv(prov);
    var src = prov.source, srcs = src === 'mixed' ? prov.parts.map(function (x) { return x.source; }) : [src];
    var anyAi = srcs.some(function (x) { return x === 'live-ai' || x === 'scenario'; }), allRules = srcs.every(function (x) { return x === 'rules'; });
    var tag = allRules ? 'Proposé par les règles' : src === 'live-ai' ? 'Proposé par l’IA en direct' : src === 'scenario' ? 'Proposé par l’IA (scénarisé)' : src === 'manual' ? 'Saisi à la main' : src === 'lab' ? 'Événement du Labo de test' : 'Propositions de plusieurs sources';
    return '<div class="ai' + (allRules ? ' ai-rules' : '') + '"><div class="ai-head"><span class="ai-tag">' + C.icon(anyAi ? 'spark' : 'check') + esc(tag) + '</span><span class="ai-cap">' + esc(cap) + '</span>' + (conf ? '<span class="ai-conf">Confiance ' + esc(conf.toLowerCase()) + '</span>' : '') + C.prov(prov) + '</div><div class="ai-body">' + body + '</div>' + (extra || '') + '</div>';
  };
  C.stamp = function (obj, label) { if (!obj) return ''; return '<span class="stamp">' + C.icon('stamp') + '<span><strong>' + esc(label) + '</strong> ' + esc(obj.by) + ', ' + U.date(obj.date) + '</span></span>'; };
  // Bouton : si `blocked` contient une raison, le bouton reste focalisable mais explique pourquoi il ne fonctionne pas.
  C.btn = function (label, action, o) {
    o = o || {};
    var attrs = '';
    Object.keys(o.data || {}).forEach(function (k) { attrs += ' data-' + k + '="' + esc(o.data[k]) + '"'; });
    var cls = 'btn' + (o.variant ? ' btn-' + o.variant : '') + (o.small ? ' btn-sm' : '') + (o.blocked ? ' is-blocked' : '');
    return '<button type="button" class="' + cls + '"' + (action ? (o.ui ? ' data-ui="' + action + '"' : ' data-action="' + action + '"') : '') + attrs +
      (o.blocked ? ' aria-disabled="true" data-reason="' + esc(o.blocked) + '"' : '') + (o.id ? ' id="' + o.id + '"' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + (o.key ? ' data-key="' + esc(o.key) + '"' : '') + (o.label ? ' aria-label="' + esc(o.label) + '"' : '') + '>' +
      (o.icon && !o.blocked ? C.icon(o.icon) : '') + (o.blocked ? C.icon('lock') : '') + '<span>' + esc(label) + '</span></button>';
  };
  C.gates = function (list, m, compact) {
    if (!list.length) return '';
    return '<ul class="gates' + (compact ? ' gates-compact' : '') + '">' + list.map(function (x) {
      return '<li class="' + (x.ok ? 'ok' : 'todo') + '">' + C.icon(x.ok ? 'check' : 'lock') + '<span>' + esc(x.label) + '</span>' + (!x.ok && x.tab && m ? '<a class="gate-go" href="#/dossier/' + m.id + '/' + x.tab + '">Ouvrir</a>' : '') + '</li>';
    }).join('') + '</ul>';
  };
  C.empty = function (title, body, action) { return '<div class="empty"><p class="empty-title">' + esc(title) + '</p><p>' + esc(body) + '</p>' + (action || '') + '</div>'; };
  C.money = function (n, o) { if (!S.P.financials()) return '<span class="masked" title="Montant non visible pour ce rôle">montant masqué</span>'; return U.money(n, o); };
  C.moneyShort = function (n) { if (!S.P.financials()) return '<span class="masked" title="Montant non visible pour ce rôle">masqué</span>'; return U.moneyShort(n); };
  C.mName = function (m) { return S.P.identity() ? m.profile.company : E.capital(m.blind.sector) + ', ' + m.profile.region; };
  C.mLabel = function (m) { return m.codename + ' (' + m.code + ')'; };
  C.bar = function (pct, tone) { return '<span class="meter' + (tone ? ' meter-' + tone : '') + '" role="img" aria-label="' + Math.round(pct) + ' %"><span style="width:' + U.clamp(pct, 0, 100) + '%"></span></span>'; };
  C.person = function (id) { var p = D.TEAM[id]; return '<span class="person" title="' + esc(p.title) + '"><span class="avatar">' + p.initials + '</span>' + esc(p.name) + '</span>'; };
  C.section = function (title, body, o) {
    o = o || {};
    return '<section class="sheet' + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + ' aria-labelledby="' + (o.hid || '') + '">' +
      '<header class="sheet-head"><div><h2 id="' + (o.hid || '') + '">' + esc(title) + '</h2>' + (o.sub ? '<p class="sheet-sub">' + o.sub + '</p>' : '') + '</div>' + (o.tools ? '<div class="sheet-tools">' + o.tools + '</div>' : '') + '</header>' + body + '</section>';
  };
  C.roleNote = function (text) { return '<p class="role-note">' + C.icon('lock') + esc(text) + '</p>'; };
  C.field = function (label, input, o) { o = o || {}; return '<label class="field' + (o.cls ? ' ' + o.cls : '') + '"><span>' + esc(label) + (o.req ? ' <abbr title="obligatoire">*</abbr>' : '') + '</span>' + input + (o.hint ? '<span class="field-hint">' + esc(o.hint) + '</span>' : '') + '</label>'; };
  C.input = function (name, value, o) { o = o || {}; return '<input name="' + name + '" type="' + (o.type || 'text') + '" value="' + esc(value == null ? '' : value) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.req ? ' required' : '') + (o.mode ? ' inputmode="' + o.mode + '"' : '') + (o.key ? ' data-key="' + o.key + '"' : '') + (o.attrs || '') + '>'; };
  C.select = function (name, options, value, o) { o = o || {}; return '<select name="' + name + '"' + (o.key ? ' data-key="' + o.key + '"' : '') + (o.attrs || '') + '>' + options.map(function (x) { var v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>'; };

  /* ---------------- notifications éphémères (avec annulation) ---------------- */
  function toast(msg, tone, action) {
    if (!msg) return;
    var host = document.getElementById('toasts');
    var last = host.lastElementChild; if (last && last.getAttribute('data-msg') === msg) last.remove();
    var el = document.createElement('div');
    el.className = 'toast' + (tone ? ' toast-' + tone : '');
    el.setAttribute('data-msg', msg);
    el.innerHTML = C.icon(tone === 'err' ? 'alert' : 'check') + '<span>' + esc(U.typo(msg)) + '</span>' + (action ? '<button type="button" class="toast-act">' + esc(action.label) + '</button>' : '');
    if (action) el.querySelector('.toast-act').addEventListener('click', function () { el.remove(); action.fn(); });
    host.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 400); }, action ? 9000 : tone === 'err' ? 5200 : 3600);
    while (host.children.length > 2) host.firstChild.remove();
  }

  /* ---------------- modale ---------------- */
  var lastFocus = null;
  function modal(html, o) {
    o = o || {};
    lastFocus = document.activeElement;
    var root = document.getElementById('modal-root');
    root.innerHTML = '<div class="modal-scrim" data-ui="modal-close"></div><div class="modal' + (o.wide ? ' modal-wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">' + html + '</div>';
    U.typoTree(root);
    var m = root.querySelector('.modal');
    var first = m.querySelector('[autofocus]') || m.querySelector('input:not([type=hidden]),select,textarea,button');
    (first || m).focus();
    if (o.onMount) o.onMount(m);
  }
  function closeModal() { var root = document.getElementById('modal-root'); if (!root.innerHTML) return; root.innerHTML = ''; if (lastFocus && lastFocus.isConnected) lastFocus.focus(); }
  function trapFocus(e, container) {
    if (e.key !== 'Tab' || !container) return;
    var f = Array.prototype.filter.call(container.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.offsetParent !== null; });
    if (!f.length) return;
    var a = f[0], b = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
    else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
  }

  /* ---------------- tiroir ---------------- */
  var drawerKind = null;
  function drawer(html, kind) {
    if (document.getElementById('drawer').hidden) lastFocus = document.activeElement;
    var d = document.getElementById('drawer'), s = document.getElementById('scrim');
    d.innerHTML = html; d.hidden = false; s.hidden = false; drawerKind = kind || 'misc';
    d.setAttribute('data-kind', drawerKind);
    U.typoTree(d);
    if (UI.DRAWER_MOUNT[drawerKind]) UI.DRAWER_MOUNT[drawerKind](d);
    var h = d.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  }
  function refreshDrawer(html) { var d = document.getElementById('drawer'); if (d.hidden) return; var y = d.scrollTop, ae = document.activeElement, key = ae && d.contains(ae) ? (ae.getAttribute('data-key') || ae.id) : null; d.innerHTML = html; U.typoTree(d); if (UI.DRAWER_MOUNT[drawerKind]) UI.DRAWER_MOUNT[drawerKind](d); d.scrollTop = y; if (key) { var el = d.querySelector('[data-key="' + key + '"]') || document.getElementById(key); if (el) el.focus({ preventScroll: true }); } }
  function closeDrawer() {
    var d = document.getElementById('drawer'), s = document.getElementById('scrim');
    if (d.hidden) return false; d.hidden = true; d.innerHTML = ''; drawerKind = null;
    if (document.getElementById('copilot').hidden) s.hidden = true;
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
    return true;
  }

  /* ---------------- boîte de réception (alimentée par toutes les actions et l'horloge) ---------------- */
  function inboxHtml() {
    var st = S.get(), list = st.inbox.filter(function (n) { return !n.m || S.P.mandates(); }).slice(0, 60), unread = list.filter(function (n) { return !n.read; }).length;
    return '<div class="drawer-head"><h2 id="drawer-title">Boîte de réception <span class="muted">' + unread + ' non lue' + (unread > 1 ? 's' : '') + '</span></h2><button type="button" class="icon-btn" data-ui="drawer-close" aria-label="Fermer">' + C.icon('x') + '</button></div>' +
      '<div class="drawer-body"><p class="cell-sub">Rappels, échéances, réponses d’acheteurs, pièces reçues : tout ce que les actions et l’horloge de démonstration déclenchent. Chaque élément renvoie à l’écran concerné.</p>' +
      (list.length ? '<div class="actions">' + C.btn('Tout marquer comme lu', 'inboxReadAll', { small: true, variant: 'quiet', key: 'inbox-all' }) + '</div><ol class="inbox">' + list.map(function (n) {
        return '<li class="' + (n.read ? 'is-read' : 'is-unread') + (n.tone ? ' tone-' + n.tone : '') + '"><a href="' + esc(n.href || '#/') + '" data-ui="inbox-go" data-id="' + n.id + '"><span class="ib-at">' + esc(n.at.replace(/^(\d{4}-\d\d-\d\d)/, function (d) { return U.date(d); })) + '</span><strong>' + esc(n.title) + '</strong><span class="ib-body">' + esc(n.body) + '</span></a></li>';
      }).join('') + '</ol>' : C.empty('Aucune notification', 'Avancez l’horloge ou agissez sur un dossier : les conséquences arrivent ici.')) + '</div>';
  }
  function renderInboxBadge() {
    var st = S.get(), n = st.inbox.filter(function (x) { return !x.read && (!x.m || S.P.mandates()); }).length, b = document.getElementById('inbox-badge'), btn = document.getElementById('inbox-btn');
    if (b) { b.textContent = n > 99 ? '99+' : String(n); b.hidden = !n; }
    if (btn) btn.setAttribute('aria-label', 'Boîte de réception' + (n ? ', ' + n + ' non lue' + (n > 1 ? 's' : '') : ''));
  }

  /* ---------------- routeur ---------------- */
  function parseRoute() {
    var h = (location.hash || '#/').replace(/^#/, '').split('#')[0];
    var parts = h.split('/').filter(Boolean);
    var name = parts[0] || 'tower';
    var map = { radar: 'radar', dossiers: 'dossiers', dossier: 'dossier', acheteurs: 'acheteurs', conformite: 'conformite', formation: 'formation' };
    var view = map[name] || 'tower';
    if (view === 'dossiers' && parts[1] === 'nouveau') view = 'mandate-new';
    return { view: view, parts: parts.slice(1), raw: h };
  }
  function navActive(view) { return view === 'dossier' || view === 'mandate-new' ? 'dossiers' : view; }
  function renderNav(view) {
    var act = navActive(view), st = S.get();
    var hot = st.leads.filter(function (c) { return E.radarScore(c, st).total >= 70 && !(st.companyState[c.id] && st.companyState[c.id].lastTouch); }).length;
    document.getElementById('primary-nav').innerHTML = NAV.map(function (n) {
      var badge = n.id === 'radar' && hot ? '<span class="nav-badge" aria-label="' + hot + ' prospects chauds">' + hot + '</span>' : '';
      return '<a href="' + n.href + '" class="tab' + (act === n.id ? ' is-active' : '') + '"' + (act === n.id ? ' aria-current="page"' : '') + '>' + icon(n.icon) + '<span>' + n.label + '</span>' + badge + '</a>';
    }).join('');
    document.getElementById('bottom-nav').innerHTML = NAV.map(function (n) {
      return '<a href="' + n.href + '" class="bn' + (act === n.id ? ' is-active' : '') + '"' + (act === n.id ? ' aria-current="page"' : '') + '>' + icon(n.icon) + '<span>' + n.short + '</span></a>';
    }).join('');
  }
  function renderClock() {
    var st = S.get(), el = document.getElementById('clock'), moved = st.clock.d !== D.TODAY || st.clock.m !== D.START_MIN;
    el.innerHTML = '<button type="button" class="clock-btn" data-ui="lab-open" data-section="clock" title="Horloge de démonstration : avancez-la dans le Labo de test">' + C.icon('clock') + '<span>' + (U.dateLong(st.clock.d).split(' ')[0].slice(0, 3) + '. ' + U.date(st.clock.d)).replace(/^./, function (c) { return c.toUpperCase(); }) + ', ' + U.time(st.clock.m) + '</span>' + (moved ? '<span class="clock-sim">simulée</span>' : '') + '</button>';
    var sel = document.getElementById('role-select'); if (sel && sel.value !== st.role) sel.value = st.role;
    var sel2 = document.querySelector('.role-select-2'); if (sel2 && sel2.value !== st.role) sel2.value = st.role;
    document.body.dataset.role = st.role;
    renderInboxBadge();
  }
  function render(opts) {
    opts = opts || {};
    var r = parseRoute(), main = document.getElementById('main');
    var sameRoute = current.route === r.raw, y = g.scrollY;
    var active = document.activeElement, key = active && active.getAttribute && main.contains(active) && (active.getAttribute('data-key') || active.id);
    var fn = VIEWS[r.view] || VIEWS.tower, html;
    try { html = fn(r); } catch (e) { g.console && console.error(e); html = '<div class="page"><p class="empty">Cet écran n’a pas pu s’afficher.</p></div>'; }
    main.innerHTML = html;
    U.typoTree(main);
    renderNav(r.view); renderClock();
    var titleEl = main.querySelector('h1');
    document.title = (titleEl ? titleEl.textContent.trim().slice(0, 60) + ' · ' : '') + 'Nexus CTE V3';
    if (sameRoute && !opts.scrollTop) { g.scrollTo(0, y); if (key) { var el = main.querySelector('[data-key="' + key + '"]') || document.getElementById(key); if (el && el.focus) el.focus({ preventScroll: true }); } }
    else { g.scrollTo(0, 0); if (current.route !== null && !opts.noFocus) main.focus({ preventScroll: true }); }
    current.route = r.raw;
    if (drawerKind && UI.DRAWERS[drawerKind]) refreshDrawer(UI.DRAWERS[drawerKind]());
    if (g.Tour) g.Tour.refresh();
  }

  /* ---------------- délégation ---------------- */
  var UIA = {};
  function params(el) { var o = {}; Object.keys(el.dataset).forEach(function (k) { if (k !== 'action' && k !== 'ui') o[k] = el.dataset[k]; }); return o; }
  function run(name, p) {
    var res = S.dispatch(name, p);
    if (res && !res.ok) toast(res.msg, 'err');
    else if (res && res.undo) toast(res.msg || 'Fait.', '', { label: res.undo.label || 'Annuler', fn: function () { run(res.undo.action, res.undo.payload); } });
    else if (res && res.msg) toast(res.msg);
    return res;
  }
  document.addEventListener('click', function (e) {
    var blocked = e.target.closest('[aria-disabled="true"][data-reason]');
    if (blocked) { e.preventDefault(); toast(blocked.getAttribute('data-reason'), 'err'); return; }
    var u = e.target.closest('[data-ui]');
    if (u) { var fn = UIA[u.getAttribute('data-ui')]; if (fn) { e.preventDefault(); fn(params(u), u, e); } return; }
    var a = e.target.closest('[data-action]');
    if (a && a.tagName !== 'SELECT' && a.tagName !== 'INPUT') {
      var name = a.getAttribute('data-action');
      e.preventDefault();
      if (UIA[name]) { UIA[name](params(a), a, e); return; }
      run(name, params(a));
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-change]');
    if (!el) { var a = e.target.closest('input[type=checkbox][data-action]'); if (a) { var rr = run(a.getAttribute('data-action'), params(a)); if (rr && !rr.ok) render(); } return; }
    var name = el.getAttribute('data-change'), p = params(el); p.value = el.type === 'checkbox' ? el.checked : el.value;
    if (UIA[name]) { UIA[name](p, el, e); return; }
    run(name, p);
  });
  document.addEventListener('input', function (e) {
    var el = e.target.closest('[data-input]');
    if (!el) return;
    var p = params(el); p.value = el.value;
    S.dispatch(el.getAttribute('data-input'), p);
  });
  document.addEventListener('keydown', function (e) {
    var modalEl = document.querySelector('#modal-root .modal');
    if (e.key === 'Escape') {
      if (modalEl) { e.preventDefault(); closeModal(); return; }
      if (!document.getElementById('palette').hidden) { UIA['palette-close'](); return; }
      if (closeDrawer()) return;
      if (!document.getElementById('copilot').hidden && UIA['copilot-close']) { UIA['copilot-close'](); return; }
    }
    if (modalEl) trapFocus(e, modalEl);
    var dr = document.getElementById('drawer'); if (!dr.hidden && !modalEl) trapFocus(e, dr);
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); UIA['palette-open'](); }
  });
  document.getElementById('scrim').addEventListener('click', function () { closeDrawer(); if (UIA['copilot-close']) UIA['copilot-close'](); });

  UIA['modal-close'] = closeModal;
  UIA['drawer-close'] = closeDrawer;
  UIA['role'] = function (p) { run('role', { value: p.value }); };
  UIA['menu-toggle'] = function (p, el) { var sheet = document.getElementById('utility-sheet'), open = !sheet.classList.contains('is-open'); sheet.classList.toggle('is-open', open); el.setAttribute('aria-expanded', String(open)); };
  UIA['inbox-open'] = function () { drawer(inboxHtml(), 'inbox'); };
  UIA['inbox-go'] = function (p, el) { S.dispatch('inboxRead', { id: p.id, silent: true }); closeDrawer(); var h = el.getAttribute('href'); if (location.hash === h) render(); else location.hash = h; renderInboxBadge(); };
  UIA['reset-ask'] = function () {
    modal('<h2 id="modal-title">Réinitialiser la démo ?</h2><p>Toutes vos décisions (mandats créés, retraitements, approbations, appels, acheteurs, accès, horloge) seront effacées de ce navigateur. L’espace revient au vendredi 23 octobre 2026, 10 h 40. Exportez-le d’abord depuis le Labo de test si vous voulez le garder.</p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="button" class="btn btn-danger" data-ui="reset-do">Réinitialiser</button></div>');
  };
  UIA['reset-do'] = function () { closeModal(); closeDrawer(); S.reset(); if (g.Tour) g.Tour.stop(true); location.hash = '#/'; render({ scrollTop: true }); toast('Démo réinitialisée.'); };

  S.subscribe(function (info) { if (info && info.silent) return; render(); });
  g.addEventListener('hashchange', function () { if (drawerKind === 'inbox' || drawerKind === 'misc') closeDrawer(); closeModal(); var sheet = document.getElementById('utility-sheet'); sheet.classList.remove('is-open'); render({ scrollTop: true }); });

  var UI = g.UI = { C: C, VIEWS: VIEWS, UIA: UIA, DRAWERS: { inbox: inboxHtml }, DRAWER_MOUNT: {}, FORMS: {}, render: render, toast: toast, modal: modal, closeModal: closeModal, drawer: drawer, refreshDrawer: refreshDrawer, closeDrawer: closeDrawer, run: run, icon: icon, ICON: ICON, parseRoute: parseRoute, drawerKind: function () { return drawerKind; } };
})(window);
