/* TradeDesk V3 — shared helpers: escaping, fixed-precision money, formatting, icons. */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Fixed precision: money is handled in integer cents, weights in kilograms. */
  const toCents = (x) => Math.round(Number((Number(x) * 100).toFixed(6)));
  const r2 = (x) => toCents(x) / 100;
  const r1 = (x) => Math.round(Number((Number(x) * 10).toFixed(6))) / 10;
  /* Rate (CAD/t) × quantity (t) → cents, rounded once per line. */
  const lineCents = (rate, tonnes) => Math.round(Number((Number(rate) * Number(tonnes) * 100).toFixed(6)));

  const nf2 = new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf0 = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('en-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf3 = new Intl.NumberFormat('en-CA', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const nf4 = new Intl.NumberFormat('en-CA', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  const minus = '−';
  /* CAD amount from cents. */
  function cad(cents, opts) {
    opts = opts || {};
    const v = cents / 100;
    const s = nf2.format(Math.abs(v));
    const sign = v < 0 ? minus : opts.plus && v > 0 ? '+' : '';
    return (opts.bare ? '' : 'CAD ') + sign + s;
  }
  /* Short money without currency code, for dense tables. */
  function money(cents, opts) {
    opts = opts || {};
    const v = cents / 100;
    const sign = v < 0 ? minus : opts.plus && v > 0 ? '+' : '';
    return sign + nf2.format(Math.abs(v));
  }
  function rate(v, opts) {
    opts = opts || {};
    const sign = v < 0 ? minus : opts.plus && v > 0 ? '+' : '';
    return sign + nf2.format(Math.abs(v));
  }
  const t3 = (v) => (v < 0 ? minus : '') + nf3.format(Math.abs(v));
  const t1 = (v) => nf1.format(v);
  const n0 = (v) => nf0.format(v);
  const n4 = (v) => nf4.format(v);
  const pct = (v, d) => (v < 0 ? minus : '') + Math.abs(v).toFixed(d == null ? 1 : d) + '%';

  /* Demo calendar: minute 0 is Friday, October 23, 2026 00:00. */
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const BASE = Date.UTC(2026, 9, 23);
  function dateParts(min) { const d = Math.floor(min / 1440); const dt = new Date(BASE + d * 86400000); return { d: d, wd: WD[dt.getUTCDay()], mo: MO[dt.getUTCMonth()], day: dt.getUTCDate(), y: dt.getUTCFullYear(), m: dt.getUTCMonth() }; }
  function dayShort(min) { if (min == null) return '—'; const p = dateParts(min); return p.wd + ' ' + p.mo + ' ' + p.day; }
  function dayLong(min) { const p = dateParts(min); const full = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' }[p.wd]; const mon = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][p.m]; return full + ', ' + mon + ' ' + p.day + ', ' + p.y; }
  /* Relative to the demo clock: "today 12:00", "tomorrow 07:00", "Mon Oct 26 07:00". */
  function when(min, now) {
    if (min == null) return '—';
    const a = Math.floor(min / 1440), b = Math.floor((now == null ? min : now) / 1440);
    const t = hhmm(((min % 1440) + 1440) % 1440);
    if (a === b) return 'today ' + t;
    if (a === b + 1) return 'tomorrow ' + t;
    if (a === b - 1) return 'yesterday ' + t;
    return dayShort(min) + ' ' + t;
  }
  function durationLabel(mins) { const m = Math.abs(Math.round(mins)); if (m < 60) return m + ' min'; if (m < 1440) return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : ''); const d = Math.floor(m / 1440); return d + ' day' + (d > 1 ? 's' : '') + (m % 1440 >= 60 ? ' ' + Math.floor((m % 1440) / 60) + ' h' : ''); }
  /* Parse a date input (YYYY-MM-DD) and time (HH:MM) into demo minutes. */
  function fromInputs(dateStr, timeStr) {
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || ''); if (!dm) return null;
    const ms = Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]));
    const days = Math.round((ms - BASE) / 86400000);
    const tm = /^(\d{1,2}):(\d{2})$/.exec(timeStr || '00:00');
    return days * 1440 + (tm ? Number(tm[1]) * 60 + Number(tm[2]) : 0);
  }
  function toDateInput(min) { const d = Math.floor(min / 1440); const dt = new Date(BASE + d * 86400000); return dt.toISOString().slice(0, 10); }

  /* Capability toggles (Test lab): let a tester exercise fallbacks. */
  const caps = { clipboard: true, crypto: true, storage: true, offline: false, liveAi: true };

  function hhmm(min) {
    if (min == null) return '';
    const m = ((Math.round(min) % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  /* Bushels per tonne from the commodity's standard bushel weight (CT-04.2: documented rule). */
  const KG_PER_LB = 0.45359237;
  const buPerT = (lbPerBu) => 1000 / (lbPerBu * KG_PER_LB);
  const cwtPerT = 1000 / (100 * KG_PER_LB);

  const ICONS = {
    today: 'M4 5h16v14H4z M4 10h16 M9 5V3 M15 5V3',
    inbox: 'M3 13l3-8h12l3 8v6H3z M3 13h5l1.5 2.5h5L16 13h5',
    trade: 'M5 7a2 2 0 1 0 0-.01 M19 17a2 2 0 1 0 0-.01 M7 7h6a4 4 0 0 1 0 8h-2a4 4 0 0 0 0 8 M17 17h-1',
    truck: 'M2 7h11v9H2z M13 10h4.5l3.5 3.5V16h-8 M6 18.5a1.8 1.8 0 1 0 0-.01 M17 18.5a1.8 1.8 0 1 0 0-.01',
    scale: 'M12 4v16 M7 20h10 M5 7h14 M5 7l-3 6a3 3 0 0 0 6 0z M19 7l-3 6a3 3 0 0 0 6 0z',
    book: 'M4 4h7v16H4z M13 4h7v16h-7z M6.5 8h2 M15.5 8h2',
    chart: 'M4 20V4 M4 20h16 M8 16v-4 M12 16V8 M16 16v-6',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    x: 'M6 6l12 12 M18 6L6 18',
    alert: 'M12 3l10 18H2z M12 10v4.5 M12 17.5v.5',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7.5V12l3 2',
    arrow: 'M4 12h15 M13 6l6 6-6 6',
    back: 'M20 12H5 M11 6l-6 6 6 6',
    chevron: 'M9 5l7 7-7 7',
    down: 'M6 9l6 6 6-6',
    copy: 'M8 8h12v12H8z M4 16V4h12',
    download: 'M12 4v11 M7 10.5l5 5 5-5 M4 20h16',
    print: 'M6 9V3h12v6 M6 17H3v-7h18v7h-3 M6 14h12v7H6z',
    upload: 'M12 20V9 M7 13.5l5-5 5 5 M4 4h16',
    phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z',
    mail: 'M3 5h18v14H3z M3 6l9 7 9-7',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
    play: 'M7 4l13 8-13 8z',
    refresh: 'M20 11a8 8 0 0 0-14.5-4.5L4 8 M4 4v4h4 M4 13a8 8 0 0 0 14.5 4.5L20 16 M20 20v-4h-4',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 11v6 M12 7.5v.5',
    lock: 'M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M8.5 12l2.5 2.5 4.5-5',
    flag: 'M5 21V4 M5 4h12l-2 4 2 4H5',
    menu: 'M4 7h16 M4 12h16 M4 17h16',
    reset: 'M4 12a8 8 0 1 0 2.5-5.8L4 8.5 M4 4v4.5h4.5',
    file: 'M6 3h9l4 4v14H6z M14 3v5h5',
    route: 'M6 19a2 2 0 1 0 0-.01 M18 7a2 2 0 1 0 0-.01 M6 17V9a3 3 0 0 1 3-3h7',
    spark: 'M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z',
    pause: 'M7 5h3.5v14H7z M13.5 5H17v14h-3.5z',
    minus: 'M5 12h14',
    plus: 'M12 5v14 M5 12h14',
    dot: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    exit: 'M14 4h6v16h-6 M10 8l-4 4 4 4 M6 12h10',
    search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M15.5 15.5L20 20',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0',
    flask: 'M9.5 3h5 M10.5 3v6L5 18.5A1.7 1.7 0 0 0 6.5 21h11a1.7 1.7 0 0 0 1.5-2.5L13.5 9V3 M7.5 15h9',
    edit: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
    trash: 'M5 7h14 M9.5 7V4.5h5V7 M7 7l1 13h8l1-13',
    calendar: 'M4 6h16v14H4z M4 10h16 M8 3.5V7 M16 3.5V7',
    forward: 'M5 5l7 7-7 7 M12 5l7 7-7 7'
  };
  function icon(name, size, cls) {
    const s = size || 18;
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + (ICONS[name] || ICONS.dot) + '"/></svg>';
  }
  /* Commodity glyph: a kernel shape coloured by commodity, always paired with a text label. */
  function kernel(commodity, size) {
    const s = size || 16;
    return '<svg class="kernel k-' + esc(commodity) + '" width="' + s + '" height="' + s + '" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 1.5C11 3 12.6 6 12.4 9.2 12.2 12.4 10.3 14.5 8 14.5S3.8 12.4 3.6 9.2C3.4 6 5 3 8 1.5z"/><path class="kernel-line" d="M8 4.5v7.5"/></svg>';
  }
  /* The leaf mark redrawn as SVG for light surfaces. */
  function leaf(size) {
    const s = size || 20;
    return '<svg class="leaf" width="' + s + '" height="' + s + '" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><defs><linearGradient id="lf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0E9A52"/><stop offset="1" stop-color="#8FD9AA"/></linearGradient></defs><path fill="url(#lf)" d="M29 2C18 2.5 7 6 4.2 15.5 2.6 21 5 26.5 6.5 28.2L19.6 10.4 8.8 29.2C14 31 24.5 29 27.6 19 29.2 13.6 29.4 7.2 29 2z"/></svg>';
  }

  function slug(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  /* Tiny non-cryptographic hash used only when SubtleCrypto is unavailable. */
  function fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  }

  function download(filename, text, type) {
    try {
      const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    } catch (e) { return false; }
  }

  async function copyText(text) {
    if (!caps.clipboard) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch (e) { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  }

  TD.u = { caps, dateParts, dayShort, dayLong, when, durationLabel, fromInputs, toDateInput, esc, toCents, r2, r1, lineCents, cad, money, rate, t3, t1, n0, n4, pct, hhmm, buPerT, cwtPerT, KG_PER_LB, icon, kernel, leaf, slug, fnv, download, copyText, minus };
})();
