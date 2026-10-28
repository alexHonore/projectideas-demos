/* Nexus CTE V3 — coquille, routeur, composants, boîte de réception et délégation d'événements. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, S = g.S;
  var esc = U.esc;
  var VIEWS = {};
  var current = { route: null, key: null };

  // Quatre destinations principales; le reste sous « Plus » (au plus cinq entrées dans la barre).
  var NAV = [
    { id: 'tower', href: '#/', label: 'Tour de contrôle', short: 'Contrôle', icon: 'M3 12l3-3 3 3 4-6 4 4 4-2M3 19h18' },
    { id: 'radar', href: '#/radar', label: 'Radar', short: 'Radar', icon: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12l5-3M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0' },
    { id: 'dossiers', href: '#/dossiers', label: 'Dossiers', short: 'Dossiers', icon: 'M4 6h6l2 2h8v11H4zM4 6v13' },
    { id: 'acheteurs', href: '#/acheteurs', label: 'Acheteurs', short: 'Acheteurs', icon: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5M17 11a2.5 2.5 0 1 0 0-5M17 14c2.2.4 4 2 4 5' }
  ];
  var MORE = [
    { id: 'conformite', href: '#/conformite', label: 'Conformité', icon: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6zM9 12l2 2 4-4' },
    { id: 'formation', href: '#/formation', label: 'Formation', icon: 'M3 8l9-4 9 4-9 4zM7 10v5c3 2 7 2 10 0v-5' }
  ];
  function icon(path, cls) { return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + path + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }
  var ICON = {
    doc: 'M7 3h7l4 4v14H7zM14 3v4h4', lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z', check: 'M5 12l4 4 10-10', x: 'M6 6l12 12M18 6L6 18',
    alert: 'M12 4l9 16H3zM12 10v4M12 17v.5', spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
    arrow: 'M5 12h14M13 6l6 6-6 6', phone: 'M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z', copy: 'M9 9h11v11H9zM5 15H4V4h11v1', download: 'M12 4v11M7 10l5 5 5-5M4 20h16', upload: 'M12 20V9M7 14l5-5 5 5M4 4h16',
    stamp: 'M9 4h6l-1 7h4l1 4H5l1-4h4zM5 19h14', plus: 'M12 5v14M5 12h14', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0', flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7.5 14h9', mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 7.6v.4', more: 'M5 12h.01M12 12h.01M19 12h.01', play: 'M7 5l11 7-11 7z', reset: 'M4 12a8 8 0 1 0 3-6.2M4 4v5h5',
    pause: 'M9 6v12M15 6v12', off: 'M5 5l14 14M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', chev: 'M9 6l6 6-6 6', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6'
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
  // Provenance : pastilles courtes (« Règles », « IA », « Scénarisé », « Saisi », « Labo »); le détail est dans l'infobulle.
  function normProv(p) {
    if (!p) return { source: 'rules' };
    if (p.source === 'ia-scenario') return { source: 'scenario' };
    if (p.source === 'ia-direct') return Object.assign({}, p, { source: 'live-ai' });
    return p;
  }
  function provTitle(p) {
    p = normProv(p);
    if (p.source === 'live-ai') return 'IA en direct · ' + (p.model || 'claude-opus-5-5') + (p.ms ? ' · ' + U.num(p.ms / 1000, 1) + ' s' : '') + ' : réponse validée contre le schéma, à décider';
    if (p.source === 'scenario') return 'IA scénarisée : texte préparé pour la démonstration (dossier semé)';
    if (p.source === 'manual') return 'Saisi par une personne';
    if (p.source === 'lab') return 'Événement injecté depuis le Labo de test';
    return 'Règles : moteur déterministe, sans réseau' + (p.fallback ? ' (repli : ' + p.fallback + ')' : '');
  }
  C.provTitle = provTitle;
  C.prov = function (p) {
    p = normProv(p);
    if (p.source === 'mixed') return (p.parts || []).map(C.prov).join(' ');
    var t = esc(provTitle(p));
    if (p.source === 'live-ai') return '<span class="prov-badge prov-live" title="' + t + '" data-prov="live-ai">' + C.icon('spark', 'ico ico-sm') + 'IA</span>';
    if (p.source === 'scenario') return '<span class="prov-badge prov-scen" title="' + t + '" data-prov="scenario">' + C.icon('spark', 'ico ico-sm') + 'Scénarisé</span>';
    if (p.source === 'manual') return '<span class="prov-badge" title="' + t + '" data-prov="manual">' + C.icon('edit', 'ico ico-sm') + 'Saisi</span>';
    if (p.source === 'lab') return '<span class="prov-badge" title="' + t + '" data-prov="lab">' + C.icon('flask', 'ico ico-sm') + 'Labo</span>';
    return '<span class="prov-badge prov-rules" title="' + t + '" data-prov="rules"' + (p.fallback ? ' data-fallback="1"' : '') + '>' + C.icon(p.fallback ? 'reset' : 'check', 'ico ico-sm') + 'Règles</span>';
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
  // ⓘ : bouton icône (infobulle au survol, fenêtre au toucher) qui porte les explications hors de la surface.
  var infoSeq = 0;
  function plain(html) { var d = document.createElement('div'); d.innerHTML = html; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  C.info = function (html, label) {
    if (!html) return '';
    var id = 'ip' + (++infoSeq);
    return '<span class="info"><button type="button" class="info-btn" data-ui="info" data-for="' + id + '" aria-expanded="false" aria-controls="' + id + '" aria-label="' + esc(label ? 'Détails : ' + label : 'Détails') + '" title="' + esc(plain(html).slice(0, 300)) + '">' + C.icon('info', 'ico ico-sm') + '</button><span class="info-pop" id="' + id + '" role="note" hidden>' + html + '</span></span>';
  };
  // Bandeau d'une section de propositions : une pastille de provenance réelle et le module; l'explication passe dans ⓘ.
  // Une sortie des règles n'est jamais dite « IA ».
  C.ai = function (cap, conf, body, extra, prov, o) {
    prov = normProv(prov); o = o || {};
    var srcs = prov.source === 'mixed' ? prov.parts.map(function (x) { return x.source; }) : [prov.source];
    var allRules = srcs.every(function (x) { return x === 'rules'; });
    var why = (allRules ? 'Proposé par les règles' : srcs.length > 1 ? 'Propositions de plusieurs sources' : srcs[0] === 'live-ai' ? 'Proposé par l’IA en direct' : srcs[0] === 'scenario' ? 'Proposé par l’IA (scénarisé)' : srcs[0] === 'manual' ? 'Saisi à la main' : 'Événement du Labo de test') + ' · ' + cap + (conf ? ' · confiance ' + conf.toLowerCase() : '') + '. ' + (o.info || '') + ' Rien ne s’applique sans décision humaine.';
    return '<div class="ai' + (allRules ? ' ai-rules' : '') + (body ? '' : ' ai-line') + '"><div class="ai-head">' + C.prov(prov) + '<span class="ai-cap">' + esc(o.label || cap) + '</span>' + C.info(esc(why), cap) + '</div>' + (body ? '<div class="ai-body">' + body + '</div>' : '') + (extra || '') + '</div>';
  };
  // Ligne de provenance seule (sans corps) : pastille + module + ⓘ.
  C.aiLine = function (cap, prov, info, label) { return C.ai(cap, null, '', '', prov, { info: info, label: label }); };
  C.stamp = function (obj, label) { if (!obj) return ''; return '<span class="stamp">' + C.icon('stamp') + '<span><strong>' + esc(label) + '</strong> ' + esc(obj.by) + ', ' + U.date(obj.date) + '</span></span>'; };
  // Bouton : si `blocked` contient une raison, le bouton reste focalisable mais explique pourquoi il ne fonctionne pas.
  C.btn = function (label, action, o) {
    o = o || {};
    var attrs = '';
    Object.keys(o.data || {}).forEach(function (k) { attrs += ' data-' + k + '="' + esc(o.data[k]) + '"'; });
    if (!label && o.label && !o.title) o.title = o.blocked ? o.label + ' : ' + o.blocked : o.label; // bouton icône : libellé accessible et infobulle
    var cls = 'btn' + (o.variant ? ' btn-' + o.variant : '') + (o.small ? ' btn-sm' : '') + (o.blocked ? ' is-blocked' : '') + (!label ? ' btn-icon' : '');
    return '<button type="button" class="' + cls + '"' + (action ? (o.ui ? ' data-ui="' + action + '"' : ' data-action="' + action + '"') : '') + attrs +
      (o.blocked ? ' aria-disabled="true" data-reason="' + esc(o.blocked) + '"' : '') + (o.id ? ' id="' + o.id + '"' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + (o.key ? ' data-key="' + esc(o.key) + '"' : '') + (o.label ? ' aria-label="' + esc(o.label) + '"' : '') + '>' +
      (o.icon && !o.blocked ? C.icon(o.icon) : '') + (o.blocked ? C.icon('lock') : '') + (label ? '<span>' + esc(label) + '</span>' : '') + '</button>';
  };
  C.gates = function (list, m, compact) {
    if (!list.length) return '';
    return '<ul class="gates' + (compact ? ' gates-compact' : '') + '">' + list.map(function (x) {
      return '<li class="' + (x.ok ? 'ok' : 'todo') + '" title="' + esc(x.label + (x.ok ? '' : ' : ' + (x.todo || ''))) + '">' + C.icon(x.ok ? 'check' : 'lock') + '<span>' + esc(x.short || x.label) + '</span>' + (!x.ok && x.tab && m ? '<a class="gate-go" href="#/dossier/' + m.id + '/' + x.tab + '" aria-label="Ouvrir : ' + esc(x.todo || x.label) + '" title="' + esc(x.todo || x.label) + '">' + C.icon('arrow', 'ico ico-sm') + '</a>' : '') + '</li>';
    }).join('') + '</ul>';
  };
  C.empty = function (title, body, action) { return '<div class="empty"><p class="empty-title">' + esc(title) + '</p><p>' + esc(body) + '</p>' + (action || '') + '</div>'; };
  C.money = function (n, o) { if (!S.P.financials()) return '<span class="masked" title="Montant non visible pour ce rôle">montant masqué</span>'; return U.money(n, o); };
  C.moneyShort = function (n) { if (!S.P.financials()) return '<span class="masked" title="Montant non visible pour ce rôle">masqué</span>'; return U.moneyShort(n); };
  C.mName = function (m) { return S.P.identity() ? m.profile.company : E.capital(m.blind.sector) + ', ' + m.profile.region; };
  C.mLabel = function (m) { return m.codename + ' (' + m.code + ')'; };
  C.bar = function (pct, tone) { return '<span class="meter' + (tone ? ' meter-' + tone : '') + '" role="img" aria-label="' + Math.round(pct) + ' %"><span style="width:' + U.clamp(pct, 0, 100) + '%"></span></span>'; };
  C.person = function (id) { var p = D.TEAM[id]; return '<span class="person" title="' + esc(p.title) + '"><span class="avatar">' + p.initials + '</span>' + esc(p.name) + '</span>'; };
  // Section : titre + ⓘ (le sous-titre devient une infobulle). « fold: true » la replie derrière son titre (un tap pour l'ouvrir).
  C.section = function (title, body, o) {
    o = o || {};
    if (o.fold) return '<details class="sheet sheet-fold' + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + (o.open ? ' open' : '') + '><summary class="sheet-head"><h2 id="' + (o.hid || '') + '">' + (o.icon ? C.icon(o.icon) : '') + esc(title) + (o.count != null ? ' <span class="count">' + esc(o.count) + '</span>' : '') + '</h2>' + (o.meta ? '<span class="fold-meta">' + o.meta + '</span>' : '') + C.icon('chev', 'ico fold-chev') + '</summary><div class="fold-body">' + (o.sub ? '<p class="sheet-sub">' + o.sub + '</p>' : '') + body + '</div></details>';
    return '<section class="sheet' + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + ' aria-labelledby="' + (o.hid || '') + '">' +
      '<header class="sheet-head"><div><h2 id="' + (o.hid || '') + '">' + esc(title) + (o.sub ? ' ' + C.info(o.sub, title) : '') + '</h2></div>' + (o.tools ? '<div class="sheet-tools">' + o.tools + '</div>' : '') + '</header>' + body + '</section>';
  };
  // Disclosure « un tap plus loin » à l'intérieur d'une section.
  C.more = function (label, body, o) { o = o || {}; return '<details class="more' + (o.cls ? ' ' + o.cls : '') + (o.iconOnly ? ' more-icon' : '') + '"' + (o.open ? ' open' : '') + (o.id ? ' id="' + o.id + '"' : '') + '><summary' + (o.iconOnly ? ' aria-label="' + esc(label) + '" title="' + esc(label) + '"' : '') + '>' + C.icon(o.icon || 'chev', 'ico ico-sm') + (o.iconOnly ? '' : '<span>' + esc(label) + '</span>') + (o.meta ? '<span class="more-meta">' + o.meta + '</span>' : '') + '</summary><div class="more-body">' + body + '</div></details>'; };
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
    var act = navActive(view), st = S.get(), inMore = MORE.some(function (n) { return n.id === act; });
    var hot = st.leads.filter(function (c) { return E.radarScore(c, st).total >= 70 && !(st.companyState[c.id] && st.companyState[c.id].lastTouch); }).length;
    var moreBtn = function (cls) { var lab = inMore ? MORE.filter(function (n) { return n.id === act; })[0].label : 'Plus'; return '<button type="button" class="' + cls + (inMore ? ' is-active' : '') + '" data-ui="more-open" aria-haspopup="true" aria-expanded="false" aria-controls="more-menu" title="Conformité, Formation, Copilote">' + icon(ICON.more) + '<span>' + lab + '</span></button>'; };
    document.getElementById('primary-nav').innerHTML = NAV.map(function (n) {
      var badge = n.id === 'radar' && hot ? '<span class="nav-badge" aria-label="' + hot + ' prospects chauds" title="' + hot + ' prospects chauds">' + hot + '</span>' : '';
      return '<a href="' + n.href + '" class="tab' + (act === n.id ? ' is-active' : '') + '"' + (act === n.id ? ' aria-current="page"' : '') + '>' + icon(n.icon) + '<span>' + n.label + '</span>' + badge + '</a>';
    }).join('') + moreBtn('tab tab-more');
    document.getElementById('bottom-nav').innerHTML = NAV.map(function (n) {
      return '<a href="' + n.href + '" class="bn' + (act === n.id ? ' is-active' : '') + '"' + (act === n.id ? ' aria-current="page"' : '') + '>' + icon(n.icon) + '<span>' + n.short + '</span></a>';
    }).join('') + moreBtn('bn');
  }
  function moreHtml() {
    return MORE.map(function (n) { return '<a role="menuitem" href="' + n.href + '" class="menu-item">' + icon(n.icon) + '<span>' + n.label + '</span></a>'; }).join('') +
      '<button type="button" role="menuitem" class="menu-item" data-action="copilot-open">' + icon('M4 4h16v11H11l-5 4v-4H4z') + '<span>Copilote</span></button>';
  }
  // Menu « Démo » : tout l'outillage de démonstration au même endroit (visite, labo, rôle, IA en direct, réinitialisation).
  function demoHtml() {
    var st = S.get(), ai = g.AI && g.AI.status ? g.AI.status() : { state: 'off', reason: 'IA en direct indisponible' };
    var aiLabel = { on: 'activée', off: 'désactivée', paused: 'en pause' }[ai.state];
    return '<p class="menu-mark">' + C.icon('flask', 'ico ico-sm') + 'Démo · données fictives</p>' +
      '<button type="button" role="menuitem" class="menu-item" data-action="tour-start">' + C.icon('play') + '<span>Visite commentée</span></button>' +
      '<button type="button" role="menuitem" class="menu-item" data-ui="lab-open">' + C.icon('flask') + '<span>Labo de test</span></button>' +
      '<label class="menu-item menu-role">' + C.icon('user') + '<span class="sr-only">Voir comme</span><select id="role-select" data-change="role" aria-label="Voir l’application comme" title="Voir comme">' + Object.keys(D.ROLE_LABEL).map(function (k) { return '<option value="' + k + '"' + (st.role === k ? ' selected' : '') + '>' + esc(D.ROLE_LABEL[k]) + '</option>'; }).join('') + '</select></label>' +
      '<a role="menuitem" class="menu-item ai-status is-' + ai.state + '" href="../../index.html#api" data-key="ai-status" title="IA en direct ' + aiLabel + (ai.reason ? ' : ' + esc(ai.reason) : '') + '. Clés, budgets et interrupteurs au moniteur d’API.">' + C.icon(ai.state === 'on' ? 'spark' : ai.state === 'paused' ? 'pause' : 'off') + '<span>IA en direct</span><span class="ai-state">' + aiLabel + '</span></a>' +
      '<button type="button" role="menuitem" class="menu-item" data-ui="reset-ask">' + C.icon('reset') + '<span>Réinitialiser</span></button>' +
      '<a role="menuitem" class="menu-item" href="../../index.html">' + C.icon('M15 6l-6 6 6 6') + '<span>Toutes les démos</span></a>';
  }
  function popMenu(id, btn, html) {
    var el = document.getElementById(id), open = el.hidden;
    closeMenus();
    if (!open) return;
    el.innerHTML = html; U.typoTree(el); el.hidden = false; el._btn = btn;
    var r = btn.getBoundingClientRect(), w = Math.min(280, g.innerWidth - 16);
    el.style.width = w + 'px';
    if (btn.closest('.bottom-nav')) { el.style.left = Math.max(8, g.innerWidth - w - 8) + 'px'; el.style.top = 'auto'; el.style.bottom = (g.innerHeight - r.top + 6) + 'px'; }
    else { el.style.left = Math.max(8, Math.min(r.right - w, g.innerWidth - w - 8)) + 'px'; el.style.top = (r.bottom + 6) + 'px'; el.style.bottom = 'auto'; }
    btn.setAttribute('aria-expanded', 'true');
    var f = el.querySelector('a, button, select'); if (f) f.focus();
  }
  function closeMenus() {
    var any = false;
    ['demo-menu', 'more-menu'].forEach(function (id) { var el = document.getElementById(id); if (el && !el.hidden) { el.hidden = true; any = true; if (el._btn) el._btn.setAttribute('aria-expanded', 'false'); } });
    document.querySelectorAll('.info-pop:not([hidden])').forEach(function (p) { p.hidden = true; var b = document.querySelector('[data-for="' + p.id + '"]'); if (b) b.setAttribute('aria-expanded', 'false'); any = true; });
    return any;
  }
  function renderClock() {
    var st = S.get(), el = document.getElementById('clock'), moved = st.clock.d !== D.TODAY || st.clock.m !== D.START_MIN;
    el.innerHTML = '<button type="button" class="clock-btn" data-ui="lab-open" data-section="clock" title="Horloge de démonstration' + (moved ? ' (simulée, avancée au Labo de test)' : '') + ' : ' + esc(U.dateLong(st.clock.d)) + ', ' + U.time(st.clock.m) + '" aria-label="Horloge de démonstration, ' + esc(U.dateLong(st.clock.d)) + ', ' + U.time(st.clock.m) + '">' + C.icon('clock') + '<span>' + U.date(st.clock.d).replace(/ \d{4}$/, '') + ', ' + U.time(st.clock.m) + '</span>' + (moved ? '<span class="clock-sim" aria-label="simulée">' + C.icon('flask', 'ico ico-sm') + '</span>' : '') + '</button>';
    var sel = document.getElementById('role-select'); if (sel && sel.value !== st.role) sel.value = st.role;
    document.body.dataset.role = st.role;
    var dot = document.getElementById('ai-dot'), ai = g.AI && g.AI.status ? g.AI.status() : null;
    if (dot && ai) { dot.className = 'ai-dot is-' + ai.state; }
    var dm = document.getElementById('demo-menu'); if (dm && !dm.hidden) { var foc = document.activeElement && dm.contains(document.activeElement) ? document.activeElement.getAttribute('data-key') || document.activeElement.id : null; dm.innerHTML = demoHtml(); U.typoTree(dm); if (foc) { var fe = dm.querySelector('[data-key="' + foc + '"]') || document.getElementById(foc); if (fe) fe.focus(); } }
    renderInboxBadge();
  }
  // Allègement : sous-titres de page et petits caractères explicatifs passent dans ⓘ (le fait reste, les mots partent).
  function infoEl(html, label) { var t = document.createElement('span'); t.innerHTML = C.info(html, label); return t.firstChild; }
  function compact(root) {
    var interactive = 'a,button,input,select,textarea,label';
    root.querySelectorAll('.page-head > p.lead, .page-head > .lead').forEach(function (p) {
      var h = p.parentNode.querySelector('h1'); if (!h || p.querySelector(interactive)) return;
      h.appendChild(document.createTextNode(' ')); h.appendChild(infoEl(p.innerHTML, h.textContent.trim())); p.remove();
    });
    root.querySelectorAll('p.fineprint').forEach(function (p) {
      if (p.closest('details, .modal, .doc, .wm-doc, .info-pop, .tour-card, form') || p.querySelector(interactive)) return;
      var sec = p.closest('.sheet'), h = sec && sec.querySelector('.sheet-head h2, :scope > h2');
      if (h && !h.closest('details')) {
        var ex = h.querySelector(':scope > .info .info-pop');
        if (ex) { var q = document.createElement('p'); q.innerHTML = p.innerHTML; ex.appendChild(q); var b = h.querySelector(':scope > .info .info-btn'); b.title = (b.title + ' ' + p.textContent).slice(0, 300); }
        else { h.appendChild(document.createTextNode(' ')); h.appendChild(infoEl('<p>' + p.innerHTML + '</p>', h.textContent.trim())); }
        p.remove();
      } else { var w = document.createElement('p'); w.className = 'fine-i'; w.appendChild(infoEl(p.innerHTML, 'Précisions')); p.replaceWith(w); }
    });
  }
  // Les replis ouverts restent ouverts d'un rendu à l'autre (par écran) : on peut agir dans un détail sans le perdre.
  var openFolds = {};
  function foldKey(d) { if (d.id) return 'id:' + d.id; var sm = d.querySelector(':scope > summary'); if (!sm) return null; var h = sm.querySelector('[id]'); return h ? 'h:' + h.id : 't:' + (sm.getAttribute('aria-label') || sm.textContent).trim().slice(0, 80); }
  document.addEventListener('toggle', function (e) {
    var d = e.target; if (!d || d.tagName !== 'DETAILS' || !d.closest('#main')) return;
    var k = foldKey(d), f = openFolds[current.route || ''] = openFolds[current.route || ''] || {}; if (k) { if (d.open) f[k] = true; else delete f[k]; }
  }, true);
  function render(opts) {
    opts = opts || {};
    var r = parseRoute(), main = document.getElementById('main');
    var sameRoute = current.route === r.raw, y = g.scrollY;
    var active = document.activeElement, key = active && active.getAttribute && main.contains(active) && (active.getAttribute('data-key') || active.id);
    var fn = VIEWS[r.view] || VIEWS.tower, html;
    try { html = fn(r); } catch (e) { g.console && console.error(e); html = '<div class="page"><p class="empty">Cet écran n’a pas pu s’afficher.</p></div>'; }
    var folds = openFolds[r.raw] = openFolds[r.raw] || {};
    main.innerHTML = html;
    U.typoTree(main);
    compact(main);
    main.querySelectorAll('details').forEach(function (d) { var k = foldKey(d); if (k && folds[k] && !d.open) d.open = true; });
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
    if (!e.target.closest('.menu-pop, [data-ui="demo-open"], [data-ui="more-open"], .info')) closeMenus();
    else if (e.target.closest('.menu-pop a, .menu-pop button')) setTimeout(closeMenus, 0);
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
      if (closeMenus()) { e.preventDefault(); return; }
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
  UIA['demo-open'] = function (p, el) { popMenu('demo-menu', el, demoHtml()); };
  UIA['more-open'] = function (p, el) { popMenu('more-menu', el, moreHtml()); };
  UIA['info'] = function (p, el) {
    var pop = document.getElementById(p.for); if (!pop) return;
    var open = pop.hidden; closeMenus(); if (!open) return;
    pop.hidden = false; el.setAttribute('aria-expanded', 'true');
    var r = el.getBoundingClientRect(), w = Math.min(300, g.innerWidth - 24);
    pop.style.width = w + 'px'; pop.style.left = Math.max(12, Math.min(r.left - 12, g.innerWidth - w - 12)) - r.left + 'px';
  };
  UIA['inbox-open'] = function () { drawer(inboxHtml(), 'inbox'); };
  UIA['inbox-go'] = function (p, el) { S.dispatch('inboxRead', { id: p.id, silent: true }); closeDrawer(); var h = el.getAttribute('href'); if (location.hash === h) render(); else location.hash = h; renderInboxBadge(); };
  UIA['reset-ask'] = function () {
    modal('<h2 id="modal-title">Réinitialiser la démo ?</h2><p>Retour au 23 octobre 2026, 10 h 40. Vos décisions sont effacées de ce navigateur. ' + C.info('Mandats créés, retraitements, approbations, appels, acheteurs, accès et horloge. Exportez l’espace depuis le Labo de test pour le garder.', 'Réinitialiser') + '</p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Annuler</button><button type="button" class="btn btn-danger" data-ui="reset-do">Réinitialiser</button></div>');
  };
  UIA['reset-do'] = function () { closeModal(); closeDrawer(); S.reset(); if (g.Tour) g.Tour.stop(true); location.hash = '#/'; render({ scrollTop: true }); toast('Démo réinitialisée.'); };

  S.subscribe(function (info) { if (info && info.silent) return; render(); });
  g.addEventListener('hashchange', function () { if (drawerKind === 'inbox' || drawerKind === 'misc') closeDrawer(); closeModal(); closeMenus(); render({ scrollTop: true }); });

  var UI = g.UI = { C: C, VIEWS: VIEWS, UIA: UIA, DRAWERS: { inbox: inboxHtml }, DRAWER_MOUNT: {}, FORMS: {}, render: render, compact: compact, closeMenus: closeMenus, toast: toast, modal: modal, closeModal: closeModal, drawer: drawer, refreshDrawer: refreshDrawer, closeDrawer: closeDrawer, run: run, icon: icon, ICON: ICON, parseRoute: parseRoute, drawerKind: function () { return drawerKind; } };
})(window);
