/* Utilitaires : échappement, formats fr-CA, dates, empreinte SHA-256, téléchargements, typographie. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const U = (TS.U = {});

  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.$ = (q, root) => (root || document).querySelector(q);
  U.$$ = (q, root) => Array.from((root || document).querySelectorAll(q));

  const NB = ' ', NNB = ' ';
  U.NB = NB; U.NNB = NNB;

  const moneyFmt = {};
  U.money = (dollars, dec) => {
    const d = dec == null ? 0 : dec;
    moneyFmt[d] = moneyFmt[d] || new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: d, maximumFractionDigits: d });
    return moneyFmt[d].format(dollars).replace(/ /g, NB);
  };
  U.cents = (c, dec) => U.money(c / 100, dec == null ? 2 : dec);
  U.num = (n, dec) => new Intl.NumberFormat('fr-CA', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }).format(n).replace(/ /g, NB);
  U.pct = (x, dec) => U.num(x * 100, dec == null ? 1 : dec) + NB + '%';
  U.signedPct = (x, dec) => (x > 0 ? '+' : x < 0 ? '−' : '') + U.num(Math.abs(x) * 100, dec == null ? 1 : dec) + NB + '%';
  U.msShort = (dollars) => U.num(dollars / 1e6, 2) + NB + 'M$';

  const TZ = 'America/Toronto';
  const df = (opts) => new Intl.DateTimeFormat('fr-CA', Object.assign({ timeZone: TZ }, opts));
  const fDay = df({ weekday: 'long', day: 'numeric', month: 'long' });
  const fDate = df({ day: 'numeric', month: 'long', year: 'numeric' });
  const fDateShort = df({ day: 'numeric', month: 'short' });
  const fTime = df({ hour: 'numeric', minute: '2-digit', hour12: false });
  U.toDate = (v) => (v instanceof Date ? v : new Date(v));
  U.day = (v) => fDay.format(U.toDate(v));
  U.date = (v) => fDate.format(U.toDate(v)).replace(/^1 /, '1er ');
  U.dateShort = (v) => fDateShort.format(U.toDate(v));
  U.time = (v) => {
    const parts = fTime.formatToParts(U.toDate(v));
    const h = parts.find((p) => p.type === 'hour').value.replace(/^0(?=\d)/, '');
    const m = parts.find((p) => p.type === 'minute').value;
    return h + NB + 'h' + NB + m;
  };
  U.dayTime = (v) => U.day(v) + ', ' + U.time(v);
  U.isoDay = (v) => {
    const d = U.toDate(v);
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    return p;
  };
  /* Durée entre deux instants, en jours et heures */
  U.countdown = (from, to) => {
    const ms = U.toDate(to) - U.toDate(from);
    if (ms <= 0) return 'échue';
    const h = Math.floor(ms / 3600000);
    const d = Math.floor(h / 24);
    return d > 0 ? d + NB + 'j' + NB + (h % 24) + NB + 'h' : h + NB + 'h' + NB + Math.floor((ms % 3600000) / 60000) + NB + 'min';
  };
  U.daysBetween = (a, b) => Math.round((U.toDate(b) - U.toDate(a)) / 86400000);
  U.minutes = (m) => {
    const h = Math.floor(m / 60), r = m % 60;
    return h ? h + NB + 'h' + (r ? NB + String(r).padStart(2, '0') : '') : r + NB + 'min';
  };

  /* SHA-256 synchrone (empreintes réelles des contenus du paquet) */
  U.sha256 = (input, raw) => {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    const bytes = raw ? input : unescape(encodeURIComponent(input));
    const words = [];
    const bitLen = bytes.length * 8;
    const K = U._k || (U._k = (function () {
      const k = [], isP = (n) => { for (let f = 2; f * f <= n; f++) if (n % f === 0) return false; return true; };
      let c = 0;
      for (let n = 2; c < 64; n++) if (isP(n)) { k[c++] = (Math.pow(n, 1 / 3) * 4294967296) | 0; }
      return k;
    })());
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    let s = bytes + '\x80';
    while (s.length % 64 - 56) s += '\x00';
    for (let i = 0; i < s.length; i++) words[i >> 2] |= s.charCodeAt(i) << ((3 - i) % 4) * 8;
    words[words.length] = (bitLen / 4294967296) | 0;
    words[words.length] = bitLen | 0;
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, (j += 16));
      const old = H.slice(0);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = H[0], e = H[4];
        const t1 = H[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & H[5]) ^ (~e & H[6])) + K[i] +
          (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & H[1]) ^ (a & H[2]) ^ (H[1] & H[2]));
        H = [(t1 + t2) | 0].concat(H);
        H[4] = (H[4] + t1) | 0;
        H.length = 8;
      }
      for (let i = 0; i < 8; i++) H[i] = (H[i] + old[i]) | 0;
    }
    let out = '';
    for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (H[i] >> (j * 8)) & 255; out += (b < 16 ? '0' : '') + b.toString(16); }
    return out;
  };

  U.download = (name, mime, content) => {
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return true;
    } catch (e) { return false; }
  };

  U.readFile = (file) => new Promise((resolve) => {
    if (!file) return resolve(null);
    const r = new FileReader();
    r.onload = () => {
      const bin = new Uint8Array(r.result);
      let s = '';
      const max = Math.min(bin.length, 2 * 1024 * 1024);
      for (let i = 0; i < max; i++) s += String.fromCharCode(bin[i]);
      resolve({ name: file.name, size: file.size, type: file.type || 'inconnu', hash: U.sha256(s, true), partial: bin.length > max });
    };
    r.onerror = () => resolve({ name: file.name, size: file.size, type: file.type, hash: null });
    r.readAsArrayBuffer(file);
  });
  U.bytes = (n) => n < 1024 ? n + ' o' : n < 1048576 ? U.num(n / 1024, 0) + NB + 'Ko' : U.num(n / 1048576, 1) + NB + 'Mo';

  /* Typographie française : espaces insécables avant : ; ! ? et à l’intérieur des guillemets */
  U.typoText = (t) => t
    .replace(/ ([:])/g, NB + '$1')
    .replace(/ ([;!?])/g, NNB + '$1')
    .replace(/« ?/g, '«' + NNB)
    .replace(/ ?»/g, NNB + '»')
    .replace(/(\d) %/g, '$1' + NB + '%')
    .replace(/(\d) \$/g, '$1' + NB + '$')
    .replace(/(\d) (M\$|k\$|km|m³|t|h|min|j|Mo|Ko|HP|cm)(?=[\s.,;:)]|$)/g, '$1' + NB + '$2')
    .replace(/(\d)\u00A0h (\d\d)/g, '$1' + NB + 'h' + NB + '$2')
    .replace(/(n°|p\.|§|art\.) (?=[\dA-Z])/g, '$1' + NB);
  U.typo = (root) => {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentNode && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const v = n.nodeValue;
      if (!/[ «»]/.test(v)) continue;
      const t = U.typoText(v);
      if (t !== v) n.nodeValue = t;
    }
  };

  /* Icônes (traits) */
  const P = {
    sun: 'M12 4V2 M12 22v-2 M4.9 4.9 3.5 3.5 M20.5 20.5l-1.4-1.4 M4 12H2 M22 12h-2 M4.9 19.1l-1.4 1.4 M20.5 3.5l-1.4 1.4 M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10',
    radar: 'M12 3a9 9 0 1 0 9 9 M12 7a5 5 0 1 0 5 5 M12 12l7-7',
    folder: 'M3 6h6l2 2h10v11H3z',
    vault: 'M4 4h16v16H4z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M12 9v-2 M12 17v-2 M9 12H7 M17 12h-2',
    log: 'M5 4h14v16H5z M9 8h6 M9 12h6 M9 16h4',
    doc: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h5',
    check: 'M5 12.5l4.2 4.2L19 7',
    x: 'M6 6l12 12 M18 6 6 18',
    alert: 'M12 3l10 18H2z M12 10v5 M12 18v.5',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',
    q: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7 M12 17v.5',
    minus: 'M6 12h12',
    pin: 'M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z M12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    back: 'M19 12H5 M11 6l-6 6 6 6',
    down: 'M6 9l6 6 6-6',
    download: 'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',
    print: 'M7 8V3h10v5 M5 8h14v8h-3 M8 16H5V8 M8 13h8v8H8z',
    upload: 'M12 21V9 M7 14l5-5 5 5 M4 7V3h16v4',
    play: 'M7 5l12 7-12 7z',
    reset: 'M4 4v6h6 M4.5 15a8 8 0 1 0 1.6-8.4L4 10',
    mail: 'M3 5h18v14H3z M3 6l9 7 9-7',
    phone: 'M8 2h8v20H8z M11 18h2',
    shield: 'M12 3l8 3v6c0 5-3.6 8.2-8 9-4.4-.8-8-4-8-9V6z',
    stamp: 'M9 3h6v6l-1 2h5v4H5v-4h5l-1-2z M5 19h14v2H5z',
    pen: 'M4 20l4-1 11-11-3-3L5 16z M14 6l3 3',
    lock: 'M6 11h12v10H6z M8 11V8a4 4 0 0 1 8 0v3',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    send: 'M3 11l18-8-8 18-2-8z M11 13l10-10',
    cal: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16',
    truck: 'M2 6h12v10H2z M14 9h4l3 3v4h-7 M6 18.5a1.5 1.5 0 1 0 0 .1 M17 18.5a1.5 1.5 0 1 0 0 .1',
    snow: 'M12 2v20 M4 7l16 10 M4 17 20 7 M9 4l3 2 3-2 M9 20l3-2 3 2',
    user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21c0-4 3.6-6 8-6s8 2 8 6',
    chart: 'M4 20V4 M4 20h16 M8 16l4-5 3 3 5-7',
    list: 'M8 6h12 M8 12h12 M8 18h12 M4 6v.5 M4 12v.5 M4 18v.5',
    columns: 'M4 4h4v16H4z M10 4h4v10h-4z M16 4h4v13h-4z',
    filter: 'M4 5h16l-6 7v6l-4 2v-8z',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 11v6 M12 7.5v.5',
    bolt: 'M13 2L5 14h6l-1 8 8-12h-6z',
    menu: 'M4 7h16 M4 12h16 M4 17h16',
    close: 'M6 6l12 12 M18 6 6 18',
    plus: 'M12 5v14 M5 12h14',
    ext: 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 20a2 2 0 0 0 4 0',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M20 20l-4-4',
    flask: 'M9 3h6 M10 3v6L4.5 18.5A1.6 1.6 0 0 0 6 21h12a1.6 1.6 0 0 0 1.5-2.5L14 9V3 M7 15h10',
    trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
    undo: 'M9 14 4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3'
  };
  U.icon = (name, size, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" width="${size || 18}" height="${size || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${P[name] || P.doc}"/></svg>`;

  U.reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
})();
