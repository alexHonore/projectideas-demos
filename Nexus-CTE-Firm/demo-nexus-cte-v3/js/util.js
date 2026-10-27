/* Nexus CTE V3 — utilitaires : formats fr-CA, dates, échappement, typographie. */
(function (g) {
  'use strict';
  var NB = ' ';      // espace insécable
  var NNB = ' ';     // espace fine insécable

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function group(intStr) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  }

  // 1 662 500 $ — séparateur insécable, $ après une espace insécable.
  function money(n, opts) {
    opts = opts || {};
    if (n == null || isNaN(n)) return '—';
    var neg = n < 0;
    var v = Math.round(Math.abs(n));
    var s = group(String(v)) + NB + '$';
    if (neg) s = '−' + s;
    if (opts.sign && !neg && n !== 0) s = '+' + s;
    return s;
  }
  // 1,66 M$ ou 475 k$
  function moneyShort(n, digits) {
    if (n == null || isNaN(n)) return '—';
    var neg = n < 0, a = Math.abs(n), s;
    if (a >= 1e6) {
      var d = digits == null ? (a >= 1e7 ? 1 : 2) : digits;
      s = trimZeros((a / 1e6).toFixed(d)).replace('.', ',') + NB + 'M$';
    } else if (a >= 1000) {
      s = group(String(Math.round(a / 1000))) + NB + 'k$';
    } else s = String(Math.round(a)) + NB + '$';
    return (neg ? '−' : '') + s;
  }
  function trimZeros(s) { return s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s; }
  function num(n, d) {
    if (n == null || isNaN(n)) return '—';
    d = d || 0;
    var neg = n < 0;
    var fixed = Math.abs(n).toFixed(d).split('.');
    var s = group(fixed[0]) + (fixed[1] ? ',' + fixed[1] : '');
    return (neg ? '−' : '') + s;
  }
  function pct(n, d) { return num(n, d == null ? 1 : d) + NB + '%'; }
  function mult(n, d) {
    if (n == null || isNaN(n)) return '—';
    return num(n, d == null ? 2 : d).replace(/,?0+$/, function (m) { return m.charAt(0) === ',' && m.length > 1 && d !== 2 ? '' : m; }) + '×';
  }
  // multiple affiché : 3,5× ou 3,25×
  function x(n) {
    if (n == null || isNaN(n)) return '—';
    var s = (Math.round(n * 100) / 100).toFixed(2);
    s = s.replace(/0$/, '');
    if (/\.$/.test(s)) s = s + '0';
    return (n < 0 ? '−' : '') + s.replace('-', '').replace('.', ',') + '×';
  }
  function signedX(n) { return (n > 0 ? '+' : n < 0 ? '−' : '±') + x(Math.abs(n)).replace('−', ''); }

  /* ---------- dates (ISO AAAA-MM-JJ, calcul en UTC) ---------- */
  var MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juill.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var MOIS_L = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  function parse(iso) { var p = String(iso).slice(0, 10).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function iso(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function addDays(isoStr, n) { return iso(parse(isoStr) + n * 86400000); }
  function diffDays(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }
  function date(isoStr) { if (!isoStr) return '—'; var d = new Date(parse(isoStr)); return d.getUTCDate() + NB + MOIS[d.getUTCMonth()] + NB + d.getUTCFullYear(); }
  function dateShort(isoStr) { if (!isoStr) return '—'; var d = new Date(parse(isoStr)); return d.getUTCDate() + NB + MOIS[d.getUTCMonth()]; }
  function dateLong(isoStr) { var d = new Date(parse(isoStr)); return JOURS[d.getUTCDay()] + ' ' + d.getUTCDate() + NB + MOIS_L[d.getUTCMonth()] + NB + d.getUTCFullYear(); }
  function weekday(isoStr) { return new Date(parse(isoStr)).getUTCDay(); }
  function days(n) { return num(n) + NB + (Math.abs(n) > 1 ? 'jours' : 'jour'); }

  /* ---------- typographie québécoise : espaces insécables ---------- */
  var TYPO_RE = [
    [/ ([:])/g, NB + '$1'],
    [/ ([;?!])/g, NNB + '$1'],
    [/« /g, '«' + NB],
    [/ »/g, NB + '»'],
    [/(\d) (%|\$|M\$|k\$)/g, '$1' + NB + '$2'],
    [/(\d) (\d{3})(?!\d)/g, '$1' + NB + '$2'],
    [/(\d) (\d{3})(?!\d)/g, '$1' + NB + '$2']
  ];
  function typo(s) {
    for (var i = 0; i < TYPO_RE.length; i++) s = s.replace(TYPO_RE[i][0], TYPO_RE[i][1]);
    return s;
  }
  function typoTree(root) {
    if (!root || !document.createTreeWalker) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'CODE') return NodeFilter.FILTER_REJECT;
        return /[ «»]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n, list = [];
    while ((n = w.nextNode())) list.push(n);
    for (var i = 0; i < list.length; i++) {
      var v = list[i].nodeValue, t = typo(v);
      if (t !== v) list[i].nodeValue = t;
    }
  }

  /* ---------- divers ---------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sum(arr, f) { var s = 0; for (var i = 0; i < arr.length; i++) s += f ? f(arr[i]) : arr[i]; return s; }
  function by(key) { return function (a, b) { return a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0; }; }
  function uid(prefix) { uid.n = (uid.n || 0) + 1; return (prefix || 'id') + '-' + Date.now().toString(36) + uid.n; }
  function median(arr) {
    if (!arr.length) return null;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function download(filename, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      return true;
    } catch (e) { return false; }
  }
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // protection contre l'injection de formules
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    } catch (e) { /* repli */ }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      return !!ok;
    } catch (e) { return false; }
  }
  function sha256Hex(buffer) {
    try {
      if (g.crypto && g.crypto.subtle && g.crypto.subtle.digest) {
        return g.crypto.subtle.digest('SHA-256', buffer).then(function (h) {
          return Array.prototype.map.call(new Uint8Array(h), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        }, function () { return null; });
      }
    } catch (e) { /* repli */ }
    return Promise.resolve(null);
  }
  /* ---------- horloge de démonstration (date ISO + minutes depuis minuit) ---------- */
  function time(min) { min = ((min % 1440) + 1440) % 1440; var h = Math.floor(min / 60), mi = min % 60; return h + ' h ' + (mi < 10 ? '0' : '') + mi; }
  function absMin(d, m) { return Math.round(parse(d) / 60000) + (m || 0); }
  function fromAbs(abs) { var day = Math.floor(abs / 1440); return { d: iso(day * 86400000), m: abs - day * 1440 }; }
  function isIsoDate(s) { return /^\d{4}-\d\d-\d\d$/.test(String(s || '')) && iso(parse(s)) === s; }
  function dateTime(d, m) { return date(d) + ', ' + time(m); }

  /* ---------- texte et objets ---------- */
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function fold(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u00a0\u202f]/g, ' '); }
  function hash(s) { var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }
  // « 1 234 567 », « 1234567 $ », « 1,5 M$ » ou « 475 k$ » vers un nombre; null si illisible.
  function parseAmount(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v == null ? '' : v).replace(/[\u00a0\u202f\s]/g, '').replace(/\$/g, '').replace(/−/g, '-');
    if (!s) return null;
    var mult = 1;
    if (/M$/i.test(s)) { mult = 1e6; s = s.slice(0, -1); } else if (/k$/i.test(s)) { mult = 1e3; s = s.slice(0, -1); }
    s = s.replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
    return Math.round(parseFloat(s) * mult);
  }

  function reducedMotion() {
    try { return g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  g.U = {
    NB: NB, NNB: NNB, esc: esc, money: money, moneyShort: moneyShort, num: num, pct: pct, x: x, signedX: signedX, mult: mult,
    parse: parse, iso: iso, addDays: addDays, diffDays: diffDays, date: date, dateShort: dateShort, dateLong: dateLong, weekday: weekday, days: days,
    typo: typo, typoTree: typoTree, clamp: clamp, sum: sum, by: by, uid: uid, median: median,
    download: download, csvCell: csvCell, copyText: copyText, sha256Hex: sha256Hex, reducedMotion: reducedMotion,
    time: time, absMin: absMin, fromAbs: fromAbs, isIsoDate: isIsoDate, dateTime: dateTime, clone: clone, fold: fold, hash: hash, parseAmount: parseAmount
  };
})(window);
