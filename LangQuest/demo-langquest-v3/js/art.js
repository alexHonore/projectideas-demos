/* LangQuest V3 — original vector artwork drawn in code for this demo.
   Orbit (mascot, 17 states), character portraits (8 expressions), mission scenes, icons.
   No reference image was traced; no third-party artwork is embedded. */
'use strict';
(function () {
  const A = LQ.art = {};
  let uid = 0;
  const id = p => p + (++uid);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ───────────────────────── Icons (24×24, stroke) ───────────────────────── */
  const IC = {
    home: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    path: '<circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="6" r="2.4"/><path d="M8.2 17.2c5-1 2.3-6.4 7.6-9.5"/><path d="M5 4v5M5 4h4l-1 1.5L9 7H5"/>',
    audio: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.6"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.6"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
    passport: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><circle cx="12" cy="10.5" r="3.4"/><path d="M8.6 10.5h6.8M12 7.1c-1.6 2-1.6 4.8 0 6.8M12 7.1c1.6 2 1.6 4.8 0 6.8M9 17h6"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
    pause: '<rect x="7" y="5" width="3.6" height="14" rx="1" fill="currentColor"/><rect x="13.4" y="5" width="3.6" height="14" rx="1" fill="currentColor"/>',
    replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
    slow: '<path d="M3 16.5h14.5a3.5 3.5 0 0 0 0-7c-1 0-1.6.3-2.3.8"/><path d="M5 16.5c0-4 2.5-7 6.3-7 2.6 0 4.2 1.6 4.2 3.6v2.9"/><path d="M7 16.5V19M13 16.5V19"/>',
    translate: '<path d="M4 5h9M8.5 3v2M6 5c.6 3.4 2.8 6 6 7.4M11 5c-.8 3.6-3.4 6.5-7 8"/><path d="m13 21 4-9 4 9M14.4 18h5.2"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    skipb: '<path d="M11.5 7.5 6 12l5.5 4.5zM18 7.5 12.5 12l5.5 4.5z" fill="currentColor"/>',
    skipf: '<path d="M12.5 7.5 18 12l-5.5 4.5zM6 7.5 11.5 12 6 16.5z" fill="currentColor"/>',
    bookmark: '<path d="M7 3.5h10v17l-5-3.6-5 3.6z"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
    moon: '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.4l2 1.2M17.8 15.4l2 1.2M4.2 16.6l2-1.2M17.8 8.6l2-1.2M2.8 12h2.4M18.8 12h2.4"/><circle cx="12" cy="12" r="6.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    upload: '<path d="M12 16V4.5M7.5 9 12 4.5 16.5 9M5 19.5h14"/>',
    shield: '<path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    route: '<circle cx="5.5" cy="6" r="2"/><circle cx="18.5" cy="18" r="2"/><path d="M7.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7.5"/>',
    list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="17.5" r="1" fill="currentColor"/>',
    map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
    flask: '<path d="M9.5 3.5h5M10.5 3.5v5.2L5.3 17.6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.7-2.9l-5.2-8.9V3.5"/><path d="M7.6 14.5h8.8"/>',
    skip: '<path d="m6 6.5 6 5.5-6 5.5M13 6.5l6 5.5-6 5.5"/>',
    bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    cup: '<path d="M4.5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M16.5 10.5h1.2a2.6 2.6 0 0 1 0 5.2h-1.6"/><path d="M8 3.5c-.8 1 .8 2 0 3M11.5 3.5c-.8 1 .8 2 0 3"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    wave: '<path d="M7.5 12.5V7a1.5 1.5 0 0 1 3 0v4.5M10.5 11V5a1.5 1.5 0 0 1 3 0v6M13.5 11V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6.5 7-2.5 0-4-1.2-5.6-3.4l-2-3a1.5 1.5 0 0 1 2.4-1.8l2.2 2.2"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.6-1.2-1.6 0-2.7.9-2.7 2s1 1.6 2.7 2c1.8.4 2.8 1 2.8 2.2S13.6 16 12 16c-1.2 0-2.2-.5-2.8-1.3M12 6.5V8M12 16v1.5"/>',
    door: '<path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21M3.5 21h17"/><circle cx="14.5" cy="12.5" r="1" fill="currentColor"/>',
    hand: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4.8a1.5 1.5 0 0 1 3 0V12M14 11.5V6.3a1.5 1.5 0 0 1 3 0V14c0 4-2.6 6.5-6 6.5-2.4 0-3.8-1-5.4-3.3L3.8 14.4a1.5 1.5 0 0 1 2.5-1.7L8 14.8"/>',
    flower: '<circle cx="12" cy="9" r="2.4"/><path d="M12 6.6c0-3 3.6-3 3.6-.4M14.4 9c3 0 3 3.6.4 3.6M12 11.4c0 3-3.6 3-3.6.4M9.6 9c-3 0-3-3.6-.4-3.6M12 11.5V21M12 17c-2-2.2-4.6-2.2-5.5-1.5.9 2.2 3.4 2.8 5.5 1.5z"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6.5l2.5-2M9.5 19.5 12 17.5l2.5 2"/>',
    umbrella: '<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v6.5a2 2 0 0 1-4 0M12 3v-.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c-2.5 2.6-3.6 5.6-3.6 8.5s1.1 5.9 3.6 8.5M12 3.5c2.5 2.6 3.6 5.6 3.6 8.5s-1.1 5.9-3.6 8.5"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z"/>',
    flame: '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.6 3-5.2 3.6-8.9 2.6 1.3 4.2 3.4 4.4 5.7.8-.6 1.4-1.5 1.6-2.6 1.6 1.4 2.4 3.4 2.4 5.6C18 18.6 15.6 21 12 21z"/>',
    calendar: '<rect x="4" y="5" width="16" height="15.5" rx="2"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
    ear: '<path d="M7 9.5a5 5 0 1 1 10 0c0 3-2.6 3.8-3.4 5.6-.6 1.4-.8 4.4-3.6 4.4-1.6 0-2.6-1-2.6-2.4"/><path d="M10 10a2 2 0 1 1 3.4 1.4"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 9.5h.01M9 9.5h.01M12 9.5h.01M15 9.5h.01M18 9.5h.01M7 14.5h10"/>',
    wand: '<path d="m4 20 11-11M14 4l1 2.2L17.2 7 15 8l-1 2.2L13 8l-2.2-1L13 6zM19 12l.6 1.4L21 14l-1.4.6L19 16l-.6-1.4L17 14l1.4-.6z"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12a7.5 7.5 0 0 1 13.2-4.9"/><path d="M18 3.5v3.8h-3.8M6 20.5v-3.8h3.8"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
    volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    loop: '<path d="M17 4.5 20 7.5l-3 3M20 7.5H8a4 4 0 0 0-4 4M7 19.5 4 16.5l3-3M4 16.5h12a4 4 0 0 0 4-4"/>',
    text: '<path d="M5 6V4.5h14V6M12 4.5v15M9 19.5h6"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    layers: '<path d="m12 3.5 9 4.5-9 4.5L3 8z"/><path d="m3 12.5 9 4.5 9-4.5M3 16.5 12 21l9-4.5"/>',
    sparkle: '<path d="M12 3c.8 4.2 2.8 6.2 7 7-4.2.8-6.2 2.8-7 7-.8-4.2-2.8-6.2-7-7 4.2-.8 6.2-2.8 7-7z"/>',
    film: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9h17M3.5 15h17M8 4.5v15M16 4.5v15"/>',
    folder: '<path d="M3.5 6.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3"/>',
    logout: '<path d="M14 4.5h4.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H14M10 16.5l-4.5-4.5L10 7.5M5.5 12H15"/>',
    pausecircle: '<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>'
  };
  A.icon = (name, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (IC[name] || IC.info) + '</svg>';

  /* ───────────────────────── Orbit, the mascot ─────────────────────────
     A floating marigold body ringed by an asymmetric cobalt ribbon that ends in a
     notched tail flick. The ribbon keeps the silhouette recognisable in greyscale. */
  A.ORBIT_STATES = ['neutral', 'welcome', 'happy', 'curious', 'listening', 'speaking', 'thinking', 'encouraging', 'try_again', 'celebrate', 'achievement', 'quiet_audio', 'sleep', 'offline', 'connection_error', 'success', 'gentle_hint'];
  A.ORBIT_LABEL = { neutral: 'Orbit, calm', welcome: 'Orbit waving hello', happy: 'Orbit smiling', curious: 'Orbit tilting its head, curious', listening: 'Orbit listening closely', speaking: 'Orbit speaking', thinking: 'Orbit thinking', encouraging: 'Orbit cheering you on', try_again: 'Orbit shrugging kindly, try again', celebrate: 'Orbit celebrating with confetti', achievement: 'Orbit holding up a star', quiet_audio: 'Orbit with headphones, keeping quiet', sleep: 'Orbit resting', offline: 'Orbit beside a crossed-out cloud, offline', connection_error: 'Orbit dizzy, connection lost', success: 'Orbit beside a check mark', gentle_hint: 'Orbit with a small light bulb, offering a hint' };
  function ring(cx, cy, rx, ry, rot, t0, t1) {
    const r = rot * Math.PI / 180, pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = (t0 + (t1 - t0) * i / 24) * Math.PI / 180;
      const x = rx * Math.cos(t), y = ry * Math.sin(t);
      pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
    }
    return 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
  }
  const RING_BACK = ring(60, 66, 49, 14, -16, 185, 355);
  const RING_FRONT = ring(60, 66, 49, 14, -16, 20, 150);
  A.orbit = function (state, opts) {
    opts = opts || {};
    state = A.ORBIT_STATES.includes(state) ? state : 'neutral';
    const size = opts.size || 96, g = id('og'), s = state;
    const label = opts.label || A.ORBIT_LABEL[s];
    const ink = '#22264A', cob = '#3149E0', cobD = '#2234B8';
    // eyes
    let eyes;
    if (s === 'happy' || s === 'celebrate' || s === 'success' || s === 'welcome' || s === 'achievement') eyes = '<path d="M43 59q6-7 12 0M65 59q6-7 12 0" stroke="' + ink + '" stroke-width="3.6" fill="none" stroke-linecap="round"/>';
    else if (s === 'sleep') eyes = '<path d="M43 60q6 5 12 0M65 60q6 5 12 0" stroke="' + ink + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
    else if (s === 'connection_error') eyes = '<path d="M45 54l8 8M53 54l-8 8M67 54l8 8M75 54l-8 8" stroke="' + ink + '" stroke-width="3.2" stroke-linecap="round"/>';
    else {
      const dx = s === 'listening' ? 2.6 : s === 'thinking' ? -2.4 : s === 'gentle_hint' ? 2 : 0;
      const dy = s === 'thinking' ? -3 : s === 'gentle_hint' ? -2.4 : s === 'quiet_audio' ? 1 : 0;
      const ery = s === 'curious' ? 11.5 : 10, erx = s === 'curious' ? 9.2 : 8.4;
      const pr = s === 'curious' ? 5.2 : 4.6;
      eyes = '<g class="o-eyes"><ellipse cx="49" cy="58" rx="' + erx + '" ry="' + ery + '" fill="#fff"/><ellipse cx="71" cy="58" rx="' + erx + '" ry="' + ery + '" fill="#fff"/>' +
        '<circle cx="' + (49.5 + dx) + '" cy="' + (60 + dy) + '" r="' + pr + '" fill="' + ink + '"/><circle cx="' + (71.5 + dx) + '" cy="' + (60 + dy) + '" r="' + pr + '" fill="' + ink + '"/>' +
        '<circle cx="' + (51.3 + dx) + '" cy="' + (57.6 + dy) + '" r="1.7" fill="#fff"/><circle cx="' + (73.3 + dx) + '" cy="' + (57.6 + dy) + '" r="1.7" fill="#fff"/></g>';
    }
    // brows
    let brows = '';
    if (s === 'curious') brows = '<path d="M41 44q7-5 14-1" stroke="' + ink + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    if (s === 'try_again' || s === 'offline') brows = '<path d="M42 48q6-4 11-3M67 45q5-1 11 3" stroke="' + ink + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    if (s === 'encouraging') brows = '<path d="M42 45q6-3 12-1M66 44q6-2 12 1" stroke="' + ink + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    // mouth
    const M = {
      neutral: '<path d="M54 74q6 5 12 0" stroke="' + ink + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
      smile: '<path d="M51 72q9 9 18 0" stroke="' + ink + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
      grin: '<path d="M50 71q10 0 20 0q-1 11-10 11t-10-11z" fill="' + ink + '"/><path d="M54 77q6 4 12 0q-2 4-6 4t-6-4z" fill="#FF8A7A"/>',
      open: '<ellipse cx="60" cy="75" rx="5.6" ry="6.4" fill="' + ink + '"/><ellipse cx="60" cy="78" rx="3.4" ry="2.4" fill="#FF8A7A"/>',
      o: '<ellipse cx="60" cy="75" rx="3.4" ry="4" fill="' + ink + '"/>',
      soft: '<path d="M54 76q6-3 12 0" stroke="' + ink + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
      flat: '<path d="M55 75h10" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>',
      wavy: '<path d="M52 75q2-3 4 0t4 0t4 0t4 0" stroke="' + ink + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
      shh: '<ellipse cx="60" cy="75" rx="2.6" ry="2.2" fill="' + ink + '"/>'
    };
    const mouthFor = { neutral: 'neutral', welcome: 'smile', happy: 'smile', curious: 'o', listening: 'neutral', speaking: 'open', thinking: 'flat', encouraging: 'grin', try_again: 'soft', celebrate: 'grin', achievement: 'grin', quiet_audio: 'shh', sleep: 'soft', offline: 'soft', connection_error: 'wavy', success: 'smile', gentle_hint: 'smile' };
    const mouth = M[mouthFor[s]];
    // arms (tiny rounded stubs) and props
    const arm = (d) => '<path d="' + d + '" stroke="#F2A51C" stroke-width="8" stroke-linecap="round" fill="none"/>';
    const armsFor = {
      neutral: arm('M33 72q-5 5-5 10') + arm('M87 72q5 5 5 10'),
      welcome: arm('M33 72q-5 5-5 10') + arm('M88 66q8-8 9-19'),
      happy: arm('M33 72q-6 4-7 9') + arm('M87 72q6 4 7 9'),
      curious: arm('M33 72q-5 5-5 10') + arm('M86 74q2 6-4 9'),
      listening: arm('M33 66q-8-4-6-14') + arm('M87 72q5 5 5 10'),
      speaking: arm('M33 72q-5 5-5 10') + arm('M87 70q8 0 11-5'),
      thinking: arm('M33 72q-5 5-5 10') + arm('M84 76q-4 6-14 6'),
      encouraging: arm('M33 72q-5 5-5 10') + arm('M88 68q8-6 8-15'),
      try_again: arm('M33 70q-9-1-12-8') + arm('M87 70q9-1 12-8'),
      celebrate: arm('M34 64q-7-8-6-18') + arm('M86 64q7-8 6-18'),
      achievement: arm('M35 70q4-8 14-12') + arm('M85 70q-4-8-14-12'),
      quiet_audio: arm('M33 72q-5 5-5 10') + arm('M84 78q-8 2-18-3'),
      sleep: arm('M35 78q-2 6 2 9') + arm('M85 78q2 6-2 9'),
      offline: arm('M33 72q-5 5-5 10') + arm('M87 72q5 5 5 10'),
      connection_error: arm('M33 70q-8-1-11-7') + arm('M87 72q5 5 5 10'),
      success: arm('M33 72q-5 5-5 10') + arm('M88 68q8-6 8-15'),
      gentle_hint: arm('M33 72q-5 5-5 10') + arm('M88 66q6-8 6-17')
    };
    let props = '';
    const spark = (x, y, r, c) => '<path d="M' + x + ' ' + (y - r) + 'q' + (r * .25) + ' ' + (r * .75) + ' ' + r + ' ' + r + 'q-' + (r * .75) + ' ' + (r * .25) + ' -' + r + ' ' + r + 'q-' + (r * .25) + ' -' + (r * .75) + ' -' + r + ' -' + r + 'q' + (r * .75) + ' -' + (r * .25) + ' ' + r + ' -' + r + 'z" fill="' + c + '"/>';
    if (s === 'welcome' || s === 'happy') props = spark(100, 26, 6, '#FFC83D') + spark(18, 34, 4, cob);
    if (s === 'speaking') props = '<path d="M101 58q5 6 0 12M107 54q8 10 0 20" stroke="' + cob + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
    if (s === 'listening') props = '<path d="M17 44q-5 6 0 12M11 40q-8 10 0 20" stroke="' + cob + '" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>';
    if (s === 'thinking') props = '<circle cx="92" cy="30" r="3" fill="' + cob + '"/><circle cx="100" cy="21" r="4.4" fill="' + cob + '"/><circle cx="110" cy="10" r="6" fill="' + cob + '"/>';
    if (s === 'celebrate') props = '<g class="o-confetti"><rect x="14" y="20" width="6" height="10" rx="1.5" fill="#E5375F" transform="rotate(-20 17 25)"/><rect x="98" y="16" width="6" height="10" rx="1.5" fill="#12805C" transform="rotate(25 101 21)"/><circle cx="24" cy="8" r="3.5" fill="' + cob + '"/><circle cx="92" cy="6" r="3" fill="#FFC83D"/><rect x="58" y="2" width="5" height="9" rx="1.5" fill="#E5375F" transform="rotate(10 60 6)"/></g>';
    if (s === 'achievement') props = '<path d="M60 22l5 10 11 1.6-8 7.6 2 11-10-5.4-10 5.4 2-11-8-7.6 11-1.6z" fill="#FFC83D" stroke="' + cobD + '" stroke-width="2.4" stroke-linejoin="round"/>';
    if (s === 'quiet_audio') props = '<path d="M30 54q0-30 30-30t30 30" stroke="' + cob + '" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="24" y="50" width="10" height="16" rx="4" fill="' + cobD + '"/><rect x="86" y="50" width="10" height="16" rx="4" fill="' + cobD + '"/>';
    if (s === 'sleep') props = '<path d="M98 28a7 7 0 1 1-9-9 5.4 5.4 0 0 0 9 9z" fill="' + cob + '"/><circle cx="108" cy="12" r="2.6" fill="' + cob + '" opacity=".7"/><circle cx="86" cy="10" r="1.8" fill="' + cob + '" opacity=".5"/>';
    if (s === 'offline') props = '<path d="M86 30h18a7 7 0 0 0 0-14 9 9 0 0 0-17-2 6 6 0 0 0-1 16z" fill="#fff" stroke="' + cob + '" stroke-width="2.6"/><path d="M84 8l24 26" stroke="#E5375F" stroke-width="3" stroke-linecap="round"/>';
    if (s === 'connection_error') props = '<path d="M92 22q6-6 12 0t12 0" stroke="#E5375F" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M14 26q4-4 8 0t8 0" stroke="#E5375F" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    if (s === 'success') props = '<circle cx="102" cy="28" r="12" fill="#12805C"/><path d="m96 28 4.5 4.5L108 24" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    if (s === 'gentle_hint') props = '<path d="M101 22a9 9 0 0 0-6 15.6c1 .9 1.4 2 1.4 3.2h9.2c0-1.2.4-2.3 1.4-3.2A9 9 0 0 0 101 22z" fill="#FFE38A" stroke="' + cobD + '" stroke-width="2.4"/><path d="M97 45h8" stroke="' + cobD + '" stroke-width="2.6" stroke-linecap="round"/>';
    if (s === 'encouraging') props = spark(104, 30, 6, cob);
    const tilt = s === 'curious' ? ' rotate(-8 60 66)' : s === 'try_again' ? ' rotate(4 60 66)' : '';
    const tail = 'M107.5 52.5c9-3 14 3 9.5 9-2.6 3.4-7.6 3.6-9.2 6.8 4.4-1 8.6.4 9.8 3.6-5.2-1.2-10.2-.2-13.6 3.4';
    return '<svg class="orbit orbit--' + s + '" width="' + size + '" height="' + size + '" viewBox="0 0 120 120" role="img" aria-label="' + esc(label) + '">' +
      '<defs><radialGradient id="' + g + '" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#FFE48C"/><stop offset=".55" stop-color="#FFC83D"/><stop offset="1" stop-color="#F2A51C"/></radialGradient></defs>' +
      '<ellipse class="o-shadow" cx="60" cy="112" rx="24" ry="4.2" fill="#22264A" opacity=".13"/>' +
      '<g class="o-float"><g transform="translate(0 0)' + tilt + '">' +
      '<path class="o-ribbon" d="' + RING_BACK + '" stroke="' + cobD + '" stroke-width="6.5" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="50" cy="99" rx="7.4" ry="4.6" fill="#E69A12"/><ellipse cx="70" cy="99" rx="7.4" ry="4.6" fill="#E69A12"/>' +
      armsFor[s].split('#F2A51C').join('#F0A21A') +
      '<path d="M60 30c19 0 32 14 32 33 0 19-13 33-32 33S28 82 28 63s13-33 32-33z" fill="url(#' + g + ')"/>' +
      '<path d="M44 40q8-7 18-7" stroke="#FFF4CC" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>' +
      '<ellipse cx="40" cy="72" rx="6.4" ry="3.6" fill="#FF8A7A" opacity=".55"/><ellipse cx="80" cy="72" rx="6.4" ry="3.6" fill="#FF8A7A" opacity=".55"/>' +
      brows + '<g class="o-face">' + eyes + mouth + '</g>' +
      '<path class="o-ribbon" d="' + RING_FRONT + '" stroke="' + cob + '" stroke-width="6.5" fill="none" stroke-linecap="round"/>' +
      '<path class="o-tail" d="' + tail + '" stroke="' + cob + '" stroke-width="5.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</g></g>' + props + '</svg>';
  };

  /* ───────────────────────── Character portraits ───────────────────────── */
  A.PORTRAIT_EXPRESSIONS = ['neutral', 'greeting', 'listening', 'talking', 'surprise', 'confusion', 'success', 'question'];
  A.portrait = function (charId, expr, opts) {
    opts = opts || {};
    const ch = typeof charId === 'string' ? LQ.CHARACTERS[charId] : charId;
    const look = (ch && ch.look) || opts.look || { skin: '#C98E66', hair: 'short', hairColor: '#2B1A14', top: '#3149E0', bg: '#FFE3A3' };
    const size = opts.size || 64, e = A.PORTRAIT_EXPRESSIONS.includes(expr) ? expr : 'neutral';
    const ink = '#22264A', k = look.skin, h = look.hairColor, clip = id('pc');
    const shade = 'rgba(34,38,74,.14)';
    let back = '', front = '';
    switch (look.hair) {
      case 'bun': back = '<circle cx="50" cy="22" r="9" fill="' + h + '"/>'; front = '<path d="M30 46c-1-14 8-23 20-23s21 9 20 23c-3-7-9-11-14-12-6 4-15 6-26 12z" fill="' + h + '"/>'; break;
      case 'long': back = '<path d="M28 46c0-16 9-25 22-25s22 9 22 25v30H28z" fill="' + h + '"/>'; front = '<path d="M30 45c0-13 8-21 20-21s20 8 20 21c-7-6-13-9-20-9s-13 3-20 9z" fill="' + h + '"/>'; break;
      case 'curly': back = '<g fill="' + h + '"><circle cx="32" cy="40" r="8"/><circle cx="68" cy="40" r="8"/><circle cx="30" cy="52" r="7"/><circle cx="70" cy="52" r="7"/></g>'; front = '<g fill="' + h + '"><circle cx="38" cy="30" r="8"/><circle cx="50" cy="26" r="9"/><circle cx="62" cy="30" r="8"/><circle cx="32" cy="38" r="6"/><circle cx="68" cy="38" r="6"/></g>'; break;
      case 'bob': back = '<path d="M28 48c0-17 9-26 22-26s22 9 22 26v12c-3 2-6 2-8 0V44H36v16c-2 2-5 2-8 0z" fill="' + h + '"/>'; front = '<path d="M30 44c1-12 9-19 20-19s19 7 20 19c-8-1-15-5-19-10-4 6-12 9-21 10z" fill="' + h + '"/>'; break;
      case 'wavy': front = '<path d="M30 44c-1-13 8-21 20-21s21 8 20 21c-2-4-5-6-8-6 0 3-3 4-6 2-3 3-7 3-9 0-3 2-6 2-8 0-4 0-7 2-9 4z" fill="' + h + '"/>'; break;
      case 'buzz': front = '<path d="M31.5 42c0-11 8-18.5 18.5-18.5S68.5 31 68.5 42c-5-4-11-6-18.5-6s-13.5 2-18.5 6z" fill="' + h + '" opacity=".92"/>'; break;
      default: front = '<path d="M31 43c0-12 8-20 19-20 12 0 20 8 19 20-4-5-10-8-16-8-8 0-15 4-22 8z" fill="' + h + '"/>';
    }
    const browY = (e === 'surprise' || e === 'greeting') ? 38 : 40;
    let brows = '<path d="M40 ' + browY + 'q4-2 7 0M53 ' + browY + 'q4-2 7 0" stroke="' + ink + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    if (e === 'confusion') brows = '<path d="M40 40q4-1 7 1M53 37q4-2 7 1" stroke="' + ink + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    if (e === 'question') brows = '<path d="M40 40q4-2 7 0M53 37q4-1 7 1" stroke="' + ink + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    let eyes;
    if (e === 'success' || e === 'greeting') eyes = '<path d="M41 46q2.6-3 5.2 0M54 46q2.6-3 5.2 0" stroke="' + ink + '" stroke-width="2" fill="none" stroke-linecap="round"/>';
    else if (e === 'surprise') eyes = '<circle cx="43.5" cy="46" r="2.6" fill="' + ink + '"/><circle cx="56.5" cy="46" r="2.6" fill="' + ink + '"/>';
    else { const dx = e === 'listening' ? 1 : 0; eyes = '<circle cx="' + (43.5 + dx) + '" cy="46" r="2" fill="' + ink + '"/><circle cx="' + (56.5 + dx) + '" cy="46" r="2" fill="' + ink + '"/>'; }
    const mouths = {
      neutral: '<path d="M45.5 58q4.5 2.6 9 0" stroke="' + ink + '" stroke-width="1.9" fill="none" stroke-linecap="round"/>',
      greeting: '<path d="M44 56.5q6 6 12 0z" fill="' + ink + '"/>',
      listening: '<path d="M46 57.5q4 2 8 0" stroke="' + ink + '" stroke-width="1.9" fill="none" stroke-linecap="round"/>',
      talking: '<ellipse cx="50" cy="58" rx="3.6" ry="3" fill="' + ink + '"/>',
      surprise: '<ellipse cx="50" cy="59" rx="2.4" ry="3.2" fill="' + ink + '"/>',
      confusion: '<path d="M46 59q2-1.6 4 0t4 0" stroke="' + ink + '" stroke-width="1.9" fill="none" stroke-linecap="round"/>',
      success: '<path d="M43.5 56q6.5 7 13 0z" fill="' + ink + '"/>',
      question: '<ellipse cx="51" cy="58" rx="2.6" ry="2.2" fill="' + ink + '"/>'
    };
    let acc = '';
    if (look.accent === 'glasses') acc = '<g stroke="' + ink + '" stroke-width="1.6" fill="none"><circle cx="43.5" cy="46" r="5"/><circle cx="56.5" cy="46" r="5"/><path d="M48.5 46h3"/></g>';
    if (look.accent === 'earrings') acc = '<circle cx="31" cy="55" r="2.2" fill="#FFC83D"/><circle cx="69" cy="55" r="2.2" fill="#FFC83D"/>';
    if (look.accent === 'beard') acc = '<path d="M33 50c1 9 7 15 17 15s16-6 17-15c-2 5-4 6-7 6-2-2-6-3-10-3s-8 1-10 3c-3 0-5-1-7-6z" fill="' + h + '" opacity=".9"/>';
    if (look.accent === 'toque') front = '<path d="M30 40c0-12 9-19 20-19s20 7 20 19z" fill="#E5375F"/><path d="M30 38h40v5H30z" fill="#B82646"/><circle cx="50" cy="19" r="4.4" fill="#FFF4CC"/>' + '<path d="M31 44c2-2 4-3 6-3" stroke="' + h + '" stroke-width="3" stroke-linecap="round"/>';
    let apron = look.accent === 'apron' ? '<path d="M40 82h20v18H40z" fill="#fff" opacity=".9"/><path d="M40 82l-6-8M60 82l6-8" stroke="#fff" stroke-width="2"/>' : '';
    return '<svg class="portrait" width="' + size + '" height="' + size + '" viewBox="0 0 100 100" role="img" aria-label="' + esc((ch ? ch.name : (opts.name || 'Local speaker')) + ', ' + e) + '">' +
      '<defs><clipPath id="' + clip + '"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#' + clip + ')">' +
      '<rect width="100" height="100" fill="' + (look.bg || '#FFE3A3') + '"/>' + back +
      '<path d="M44 64h12v12H44z" fill="' + k + '"/><path d="M44 70h12v4H44z" fill="' + shade + '"/>' +
      '<path d="M12 104c2-18 16-30 38-30s36 12 38 30z" fill="' + (look.top || '#3149E0') + '"/>' + apron +
      '<path d="M43 74l7 7 7-7" stroke="rgba(255,255,255,.55)" stroke-width="2" fill="none"/>' +
      '<ellipse cx="31" cy="49" rx="3.6" ry="5" fill="' + k + '"/><ellipse cx="69" cy="49" rx="3.6" ry="5" fill="' + k + '"/>' +
      '<ellipse cx="50" cy="47" rx="19" ry="22" fill="' + k + '"/>' +
      '<ellipse cx="39" cy="53.5" rx="3.6" ry="2.2" fill="#E5375F" opacity=".18"/><ellipse cx="61" cy="53.5" rx="3.6" ry="2.2" fill="#E5375F" opacity=".18"/>' +
      front + brows + eyes + '<path d="M50 48.5q-1.6 3.4.6 4.4" stroke="' + shade + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' + mouths[e] + acc +
      '</g></svg>';
  };
  /* Locals for first-words lessons get a stable look derived from the track number. */
  A.localLook = track => {
    const skins = ['#F0C8A8', '#E2B08C', '#C98E66', '#A8714F', '#8A5A3C', '#6E4530'];
    const hairs = ['short', 'bob', 'curly', 'long', 'wavy', 'buzz', 'bun'];
    const tops = ['#3149E0', '#12805C', '#E5375F', '#FFC83D', '#191C32', '#7A4FD0'];
    const bgs = ['#FFE3A3', '#CFE6D8', '#D6E8FF', '#FFD0D8', '#FFD9B8', '#DCE3FF'];
    const n = track.num;
    return { skin: skins[(n * 7) % 6], hair: hairs[(n * 5) % 7], hairColor: ['#1F1410', '#3A2418', '#5A3A22', '#120C08'][n % 4], top: tops[n % 6], bg: bgs[(n * 3) % 6], accent: n % 5 === 0 ? 'glasses' : 'none' };
  };

  /* ───────────────────────── Scenes (400×240) ─────────────────────────
     Original flat illustrations of contemporary places. No baked-in words or logos. */
  const winGrid = (x, y, cols, rows, w, h, gx, gy, fill, frame) => { let s = ''; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += '<rect x="' + (x + c * (w + gx)) + '" y="' + (y + r * (h + gy)) + '" width="' + w + '" height="' + h + '" rx="1.5" fill="' + fill + '"' + (frame ? ' stroke="' + frame + '" stroke-width="1.4"' : '') + '/>'; return s; };
  const scallop = (x, y, w, n, c) => { const sw = w / n; let d = 'M' + x + ' ' + y; for (let i = 0; i < n; i++) d += 'q' + (sw / 2) + ' ' + (sw * .7) + ' ' + sw + ' 0'; return '<path d="' + d + 'z" fill="' + c + '"/>'; };
  const tree = (x, y, s, c, t) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path d="M-2 0h4v-30h-4z" fill="' + (t || '#7A5A3A') + '"/><circle cx="0" cy="-40" r="18" fill="' + c + '"/><circle cx="-12" cy="-32" r="12" fill="' + c + '"/><circle cx="12" cy="-31" r="13" fill="' + c + '"/><circle cx="-5" cy="-48" r="9" fill="rgba(255,255,255,.18)"/></g>';
  const bistro = (x, y, c) => '<g transform="translate(' + x + ' ' + y + ')"><ellipse cx="0" cy="0" rx="13" ry="3" fill="' + c + '"/><path d="M0 0v18M-6 18h12" stroke="' + c + '" stroke-width="2.2"/><path d="M-22 4v16M-22 8h8v12M22 4v16M22 8h-8v12" stroke="' + c + '" stroke-width="2" fill="none"/><path d="M-4 -6h7v6h-7z" fill="#fff"/><path d="M3 -4.5q3 0 3 2t-3 2" stroke="#fff" stroke-width="1.2" fill="none"/></g>';
  const plantPot = (x, y, c) => '<g transform="translate(' + x + ' ' + y + ')"><path d="M-7 0h14l-2 9h-10z" fill="#C4683E"/><circle cx="-4" cy="-4" r="5" fill="' + c + '"/><circle cx="4" cy="-5" r="5.5" fill="' + c + '"/><circle cx="0" cy="-9" r="4.5" fill="' + c + '"/></g>';
  const SCENES = {
    'madrid-cafe': { alt: 'A café terrace in Lavapiés, Madrid, in morning sun: an ochre building with green shutters and iron balconies, a blue scalloped awning and two bistro tables.', draw: () =>
      '<defs><linearGradient id="skyM" x2="0" y2="1"><stop stop-color="#FFE7B3"/><stop offset="1" stop-color="#FFD7A8"/></linearGradient></defs><rect width="400" height="240" fill="url(#skyM)"/><circle cx="68" cy="52" r="26" fill="#FFF3CF"/>' +
      '<path d="M0 64h46v150H0z" fill="#E9A9A0"/>' + winGrid(8, 78, 2, 3, 12, 20, 8, 16, '#8C4E4A') +
      '<path d="M44 26h262v188H44z" fill="#E8B07A"/><path d="M40 20h270v10H40z" fill="#D4935E"/>' +
      [0, 1, 2, 3, 4].map(i => { const x = 62 + i * 50; return '<rect x="' + x + '" y="40" width="24" height="34" rx="2" fill="#7E4B2E"/><path d="M' + (x - 5) + ' 40h7v34h-7zM' + (x + 22) + ' 40h7v34h-7z" fill="#3E7D5A"/><path d="M' + (x - 6) + ' 74h36v3h-36zM' + (x - 6) + ' 64h36" stroke="#2A2D4A" stroke-width="1.6" fill="none"/><path d="M' + (x - 6) + ' 64v10M' + (x + 4) + ' 64v10M' + (x + 14) + ' 64v10M' + (x + 24) + ' 64v10M' + (x + 30) + ' 64v10" stroke="#2A2D4A" stroke-width="1.2"/>' + (i % 2 ? '<circle cx="' + (x + 2) + '" cy="62" r="3.4" fill="#E5375F"/><circle cx="' + (x + 9) + '" cy="61" r="3" fill="#E5375F"/><circle cx="' + (x + 6) + '" cy="63" r="3" fill="#3E7D5A"/>' : ''); }).join('') +
      [0, 1, 2, 3, 4].map(i => { const x = 62 + i * 50; return '<rect x="' + x + '" y="90" width="24" height="30" rx="2" fill="#7E4B2E"/><path d="M' + (x - 5) + ' 90h7v30h-7zM' + (x + 22) + ' 90h7v30h-7z" fill="#3E7D5A"/>'; }).join('') +
      '<path d="M44 132h262v82H44z" fill="#D69A63"/>' +
      '<path d="M52 136h246l-12 22H64z" fill="#3149E0"/>' + scallop(64, 158, 222, 12, '#3149E0') + '<path d="M58 136h234v6H58z" fill="#2234B8"/>' +
      '<rect x="72" y="166" width="66" height="46" rx="3" fill="#FFE9B8"/><rect x="152" y="160" width="34" height="54" rx="3" fill="#5A3A28"/><rect x="200" y="166" width="78" height="46" rx="3" fill="#FFE9B8"/>' +
      '<path d="M76 196h58M204 196h70" stroke="#E8C48E" stroke-width="2"/><circle cx="180" cy="188" r="1.8" fill="#FFC83D"/>' +
      '<path d="M0 212h400v28H0z" fill="#EAD9C2"/><path d="M0 214h400" stroke="#D9C2A4" stroke-width="2"/>' +
      bistro(104, 214, '#2A2D4A') + bistro(250, 214, '#2A2D4A') +
      '<path d="M344 214V120" stroke="#2A2D4A" stroke-width="3"/><path d="M334 118h20l-4-12h-12z" fill="#2A2D4A"/><circle cx="344" cy="122" r="4" fill="#FFE38A"/>' + plantPot(318, 205, '#3E7D5A') + plantPot(372, 205, '#5E9E6E') },
    'madrid-plaza': { alt: 'Plaza de Tirso de Molina, Madrid: flower stalls under striped roofs, round trees and a metro entrance with a railing and a blank diamond sign.', draw: () =>
      '<defs><linearGradient id="skyP" x2="0" y2="1"><stop stop-color="#D9E7FF"/><stop offset="1" stop-color="#FFE9C9"/></linearGradient></defs><rect width="400" height="240" fill="url(#skyP)"/><circle cx="330" cy="44" r="20" fill="#FFF3CF"/>' +
      '<path d="M0 70h90v110H0z" fill="#F2D2B0"/><path d="M90 50h120v130H90z" fill="#EBC59A"/><path d="M210 78h110v102H210z" fill="#F0D9BE"/><path d="M320 60h80v120h-80z" fill="#E7B98E"/>' +
      winGrid(10, 84, 3, 3, 14, 18, 12, 12, '#9B6B4E') + winGrid(102, 62, 4, 4, 14, 18, 14, 10, '#8C5E44') + winGrid(222, 92, 4, 2, 14, 18, 12, 14, '#9B6B4E') + winGrid(330, 74, 3, 3, 14, 18, 10, 12, '#8C5E44') +
      '<path d="M0 176h400v64H0z" fill="#E6D3BA"/>' + tree(40, 190, 1, '#5E9E6E') + tree(372, 188, 1.05, '#4F8C60') +
      [0, 1, 2].map(i => { const x = 96 + i * 66; const cols = ['#E5375F', '#FFC83D', '#7A4FD0', '#FFFFFF', '#FF8A7A']; return '<g><path d="M' + x + ' 150h56l-6-14H' + (x + 6) + 'z" fill="' + (i % 2 ? '#12805C' : '#3149E0') + '"/><path d="M' + (x + 12) + ' 136l-2 14M' + (x + 24) + ' 136v14M' + (x + 36) + ' 136l2 14" stroke="#fff" stroke-width="3" opacity=".7"/><path d="M' + (x + 4) + ' 150h48v36h-48z" fill="#A87850"/>' + [0, 1, 2, 3].map(j => '<path d="M' + (x + 8 + j * 11) + ' 172h8l-1 12h-6z" fill="#5A6A8A"/><circle cx="' + (x + 12 + j * 11) + '" cy="168" r="4.6" fill="' + cols[(i + j) % 5] + '"/><circle cx="' + (x + 9 + j * 11) + '" cy="164" r="3" fill="' + cols[(i + j + 2) % 5] + '"/>').join('') + '</g>'; }).join('') +
      '<path d="M296 190h70v6h-70z" fill="#B9A58C"/><path d="M300 196h62l-10 30h-42z" fill="#8F7E6A"/><path d="M306 202h50M310 210h42M314 218h34" stroke="#A8957E" stroke-width="2"/><path d="M296 190v-16h70v16" stroke="#2A2D4A" stroke-width="3" fill="none"/><path d="M372 196V150" stroke="#2A2D4A" stroke-width="3"/><path d="M372 132l12 12-12 12-12-12z" fill="#E5375F"/><path d="M362 144h20" stroke="#3149E0" stroke-width="4"/>' },
    'madrid-terrace': { alt: 'A terrace near El Retiro park in Madrid: white umbrellas over small tables, tall trees, and the boating lake behind.', draw: () =>
      '<defs><linearGradient id="skyR" x2="0" y2="1"><stop stop-color="#CFE6FF"/><stop offset="1" stop-color="#F3F7E8"/></linearGradient></defs><rect width="400" height="240" fill="url(#skyR)"/>' +
      '<path d="M0 118h400v40H0z" fill="#8DB89A"/><path d="M0 132h400v22H0z" fill="#7FB3C9"/><path d="M60 140q12 6 24 0" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/><path d="M226 144l26 0-4 5h-18z" fill="#E5375F"/>' +
      '<path d="M150 118v-34h100v34" fill="#EFE6D6"/>' + winGrid(156, 92, 6, 1, 8, 22, 8, 0, '#CDBFA6') + '<path d="M146 80h108v6H146z" fill="#DCCDB4"/>' +
      tree(24, 132, 1.3, '#4F8C60') + tree(110, 128, 1, '#5E9E6E') + tree(300, 130, 1.15, '#4F8C60') + tree(378, 134, 1.4, '#5E9E6E') +
      '<path d="M0 154h400v86H0z" fill="#EFE3CC"/>' +
      [70, 200, 330].map((x, i) => '<path d="M' + x + ' 206v-48" stroke="#8F7E6A" stroke-width="3"/><path d="M' + (x - 44) + ' 160q44-28 88 0z" fill="' + (i === 1 ? '#3149E0' : '#FFFFFF') + '"/><path d="M' + (x - 44) + ' 160h88" stroke="' + (i === 1 ? '#2234B8' : '#D9CFBE') + '" stroke-width="3"/>' + bistro(x, 206, '#2A2D4A')).join('') },
    'casablanca-cafe': { alt: 'A café terrace in Maârif, Casablanca: a white art-deco building with a rounded corner, a palm tree, zellige tiles and chairs facing the street.', draw: () =>
      '<defs><linearGradient id="skyC" x2="0" y2="1"><stop stop-color="#BFE0FF"/><stop offset="1" stop-color="#EEF7FF"/></linearGradient><pattern id="zel" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#12805C"/><path d="M8 1 15 8 8 15 1 8z" fill="#3149E0"/><circle cx="8" cy="8" r="2.4" fill="#FFC83D"/></pattern></defs><rect width="400" height="240" fill="url(#skyC)"/><circle cx="340" cy="40" r="18" fill="#FFF6D6"/>' +
      '<path d="M60 40h220a40 40 0 0 1 40 40v120H60z" fill="#FBF8F2"/><path d="M60 40h220a40 40 0 0 1 40 40v6H60z" fill="#EFE7DA"/>' +
      [70, 94, 118].map(y => '<path d="M60 ' + y + 'h260" stroke="#E4DACB" stroke-width="3"/>').join('') +
      winGrid(80, 52, 5, 2, 18, 30, 22, 14, '#3D6FA8', '#E4DACB') + '<rect x="298" y="56" width="14" height="70" rx="7" fill="#3D6FA8"/>' +
      '<path d="M60 136h260v8H60z" fill="#E4DACB"/><path d="M60 144h260v40H60z" fill="url(#zel)" opacity=".9"/><rect x="150" y="146" width="40" height="38" fill="#3B2F2A"/><path d="M90 150h48v30H90zM202 150h96v30h-96z" fill="#FFE9B8"/>' +
      '<path d="M0 184h400v56H0z" fill="#E7DCCB"/><path d="M0 214h400v26H0z" fill="#9A9AA8"/><path d="M20 226h40M110 226h40M200 226h40M290 226h40" stroke="#E7E7EE" stroke-width="3"/>' +
      '<g transform="translate(26 186)"><path d="M10 0c-2-40 2-80 6-110" stroke="#8B6B47" stroke-width="7" fill="none"/><g fill="#3E8A5E"><path d="M16-110c-22-6-38 4-44 18 14-10 28-12 44-18z"/><path d="M16-110c20-10 38-6 46 8-16-6-30-6-46-8z"/><path d="M16-110c-10-18-28-22-40-16 16 2 28 8 40 16z"/><path d="M16-110c8-18 26-24 40-18-16 2-30 8-40 18z"/><path d="M16-110c-4 18-18 30-30 32 10-8 20-20 30-32z"/></g></g>' +
      [110, 170, 230, 290].map(x => '<g transform="translate(' + x + ' 186)"><path d="M0 0v16M0 4h10v12M10 4V-12" stroke="#2A2D4A" stroke-width="2.4" fill="none"/></g>').join('') +
      [140, 260].map(x => '<g transform="translate(' + x + ' 196)"><ellipse cx="0" cy="0" rx="12" ry="3" fill="#2A2D4A"/><path d="M0 0v14" stroke="#2A2D4A" stroke-width="2.2"/><path d="M-4-9h5l-.6 9h-3.8z" fill="#CFEFE0" opacity=".85"/><path d="M-3-6h3" stroke="#12805C" stroke-width="2"/></g>').join('') },
    'montreal-cafe': { alt: 'Mile End, Montréal, in October: a red-brick triplex with black outdoor staircases, a maple tree with orange leaves, and a café with a green awning.', draw: () =>
      '<defs><linearGradient id="skyQ" x2="0" y2="1"><stop stop-color="#CFE3F5"/><stop offset="1" stop-color="#F6EBDD"/></linearGradient></defs><rect width="400" height="240" fill="url(#skyQ)"/>' +
      '<path d="M40 36h280v170H40z" fill="#B5543B"/><path d="M36 30h288v10H36z" fill="#8E3E2B"/>' + Array.from({ length: 9 }, (_, i) => '<path d="M40 ' + (48 + i * 18) + 'h280" stroke="#A24A33" stroke-width="1" opacity=".6"/>').join('') +
      winGrid(60, 52, 4, 2, 26, 30, 40, 22, '#F3E3C6', '#6B2A1C') +
      '<path d="M40 104h280v6H40z" fill="#2A2D4A"/><path d="M40 104v-14M110 104v-14M180 104v-14M250 104v-14M320 104v-14M40 90h280" stroke="#2A2D4A" stroke-width="2" fill="none"/>' +
      '<path d="M200 104c40 4 60 26 70 50 6 14 18 26 34 30" stroke="#2A2D4A" stroke-width="5" fill="none"/><path d="M206 112c36 6 52 26 60 46 6 14 16 22 30 26" stroke="#2A2D4A" stroke-width="2" fill="none"/>' + Array.from({ length: 8 }, (_, i) => { const t = i / 7, x = 210 + t * 90, y = 108 + t * 76 + Math.sin(t * 3) * 4; return '<path d="M' + x.toFixed(0) + ' ' + y.toFixed(0) + 'l10 4" stroke="#2A2D4A" stroke-width="2.4"/>'; }).join('') +
      '<path d="M48 150h134v6H48z" fill="#0E6B4D"/><path d="M44 140h142l-8 14H52z" fill="#12805C"/>' + scallop(52, 154, 126, 8, '#12805C') +
      '<rect x="56" y="162" width="74" height="40" rx="2" fill="#FFE9B8"/><rect x="138" y="160" width="32" height="46" rx="2" fill="#4A2A1E"/>' +
      '<path d="M0 204h400v36H0z" fill="#D9D2C8"/><path d="M0 206h400" stroke="#C8BFB2" stroke-width="2"/>' +
      tree(360, 214, 1.5, '#E8743B', '#5A3A28') + '<circle cx="344" cy="140" r="10" fill="#F2A33A"/><circle cx="378" cy="146" r="9" fill="#D9532B"/>' +
      [[30, 232, '#E8743B'], [70, 228, '#F2A33A'], [118, 234, '#D9532B'], [300, 230, '#F2A33A'], [250, 234, '#E8743B']].map(l => '<path d="M' + l[0] + ' ' + l[1] + 'l4-4 4 4-4 3z" fill="' + l[2] + '"/>').join('') +
      '<g transform="translate(206 192)" stroke="#2A2D4A" stroke-width="2.2" fill="none"><circle cx="0" cy="12" r="10"/><circle cx="36" cy="12" r="10"/><path d="M0 12 12-4h18l6 16M12-4 18 12h12M10-8h6M30-6l2-4"/></g>' },
    'tokyo-cafe': { alt: 'A narrow street in Shimokitazawa, Tokyo, in light rain: a small wooden café with an indigo noren curtain, a lantern, a vending machine and a utility pole with wires.', draw: () =>
      '<defs><linearGradient id="skyT" x2="0" y2="1"><stop stop-color="#C9D3E6"/><stop offset="1" stop-color="#E8ECF4"/></linearGradient></defs><rect width="400" height="240" fill="url(#skyT)"/>' +
      '<path d="M0 60h70v140H0z" fill="#B9BFCF"/><path d="M330 50h70v150h-70z" fill="#AEB5C6"/>' + winGrid(10, 74, 2, 3, 18, 14, 14, 16, '#E2E6EF') + winGrid(340, 64, 2, 4, 18, 14, 14, 14, '#E2E6EF') +
      '<path d="M70 70h200v130H70z" fill="#9C6B45"/><path d="M62 62h216l-10 16H72z" fill="#3A3F5C"/><path d="M70 78h200v8H70z" fill="#7E5434"/>' + Array.from({ length: 10 }, (_, i) => '<path d="M' + (74 + i * 20) + ' 90v54" stroke="#8A5C3A" stroke-width="1.4"/>').join('') +
      '<rect x="90" y="96" width="70" height="44" rx="2" fill="#FFE9B8"/><path d="M90 118h70M125 96v44" stroke="#C9A06E" stroke-width="2"/>' +
      '<path d="M180 120h70v80h-70z" fill="#4A2F20"/><path d="M180 120h70v36h-70z" fill="#2B3A8C"/><path d="M203 120v36M227 120v36" stroke="#E8ECF4" stroke-width="2"/><circle cx="215" cy="138" r="7" fill="none" stroke="#E8ECF4" stroke-width="2"/>' +
      '<g transform="translate(166 96)"><path d="M0 0v6" stroke="#2A2D4A" stroke-width="2"/><rect x="-7" y="6" width="14" height="22" rx="7" fill="#E5375F"/><path d="M-7 12h14M-7 22h14" stroke="#B82646" stroke-width="1.6"/></g>' +
      '<rect x="284" y="118" width="40" height="82" rx="3" fill="#F2F4FA" stroke="#3149E0" stroke-width="3"/><rect x="290" y="124" width="28" height="34" fill="#BFD0FF"/>' + winGrid(291, 128, 4, 2, 5, 12, 2, 4, '#3149E0') + '<rect x="292" y="168" width="24" height="6" fill="#3A3F5C"/><circle cx="296" cy="184" r="2" fill="#E5375F"/><circle cx="304" cy="184" r="2" fill="#12805C"/>' +
      '<path d="M48 200V18" stroke="#6E6A66" stroke-width="7"/><path d="M38 36h20M40 48h16" stroke="#6E6A66" stroke-width="3"/><path d="M48 32Q200 54 400 26M48 44Q200 70 400 40M0 52Q24 44 48 40" stroke="#3A3F5C" stroke-width="1.4" fill="none"/>' +
      '<path d="M0 200h400v40H0z" fill="#7F8597"/><ellipse cx="140" cy="222" rx="40" ry="5" fill="#9CA3B8"/><ellipse cx="300" cy="228" rx="30" ry="4" fill="#9CA3B8"/>' + plantPot(80, 192, '#4F8C60') + plantPot(262, 192, '#5E9E6E') +
      '<g stroke="#FFFFFF" stroke-width="1.4" opacity=".55">' + Array.from({ length: 26 }, (_, i) => { const x = (i * 53) % 400, y = (i * 37) % 200; return '<path d="M' + x + ' ' + y + 'l-4 12"/>'; }).join('') + '</g>' },
    'brooklyn-cafe': { alt: 'Fort Greene, Brooklyn: a brownstone with a tall stoop and iron railings, a coffee shop window with a bench, and a street tree.', draw: () =>
      '<defs><linearGradient id="skyB" x2="0" y2="1"><stop stop-color="#DDEBFF"/><stop offset="1" stop-color="#FFF0DC"/></linearGradient></defs><rect width="400" height="240" fill="url(#skyB)"/>' +
      '<path d="M30 30h190v176H30z" fill="#8B5A44"/><path d="M26 24h198v10H26z" fill="#6E4433"/>' + winGrid(46, 46, 3, 2, 34, 44, 24, 18, '#F3E3C6', '#5A3527') +
      '<path d="M150 150h50v56h-50z" fill="#3B2A22"/><path d="M134 206l16-50h50l16 50z" fill="#9C6A52"/>' + Array.from({ length: 6 }, (_, i) => '<path d="M' + (138 + i * 2.6) + ' ' + (196 - i * 8.4) + 'h' + (74 - i * 5) + '" stroke="#7E5240" stroke-width="2"/>').join('') + '<path d="M134 206l16-50M216 206l-16-50" stroke="#1F2238" stroke-width="3"/><path d="M128 206v-14M222 206v-14" stroke="#1F2238" stroke-width="3"/>' +
      '<path d="M220 70h160v136H220z" fill="#C9B79C"/><path d="M216 64h168v8H216z" fill="#AA987E"/>' + winGrid(236, 80, 4, 1, 26, 34, 12, 0, '#F3E3C6', '#8C7A62') +
      '<path d="M228 140h144v8H228z" fill="#191C32"/><rect x="236" y="150" width="96" height="50" rx="2" fill="#FFE9B8"/><rect x="340" y="150" width="28" height="56" rx="2" fill="#3B2A22"/>' +
      '<path d="M242 186h84" stroke="#E8C48E" stroke-width="2"/><path d="M246 200h70v4h-70zM250 204v8M312 204v8" fill="#5A3A28" stroke="#5A3A28" stroke-width="2"/>' +
      '<path d="M0 206h400v34H0z" fill="#CFC8BE"/><path d="M0 208h400" stroke="#BDB4A6" stroke-width="2"/>' + tree(92, 224, 1.25, '#6FA36F', '#5A3A28') + '<path d="M80 224h24v6H80z" fill="#8F7E6A"/>' },
    'paris-cafe': { alt: 'Canal Saint-Martin, Paris: a cream stone building with wrought-iron balconies, a red café awning with wicker chairs, and a green iron footbridge over the canal.', draw: () =>
      '<defs><linearGradient id="skyPa" x2="0" y2="1"><stop stop-color="#D7DEE9"/><stop offset="1" stop-color="#EEE9E0"/></linearGradient></defs><rect width="400" height="240" fill="url(#skyPa)"/>' +
      '<path d="M0 40h250v156H0z" fill="#E9DFCB"/><path d="M0 34h256l-8-10H0z" fill="#5E6A7D"/>' + [0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => { const x = 14 + c * 48, y = 48 + r * 34; return '<rect x="' + x + '" y="' + y + '" width="22" height="26" rx="2" fill="#8FA0B5"/><path d="M' + (x - 4) + ' ' + (y + 26) + 'h30" stroke="#2A2D4A" stroke-width="2"/>' + Array.from({ length: 6 }, (_, i) => '<path d="M' + (x - 3 + i * 5.6) + ' ' + (y + 19) + 'v7" stroke="#2A2D4A" stroke-width="1.2"/>').join(''); }).join('')).join('') +
      '<path d="M0 150h250v46H0z" fill="#D9CCB2"/><path d="M8 146h236l-12 18H20z" fill="#B82646"/>' + scallop(20, 164, 212, 10, '#B82646') + '<rect x="24" y="170" width="84" height="26" rx="2" fill="#FFE9B8"/><rect x="124" y="166" width="26" height="30" fill="#3B2A22"/><rect x="164" y="170" width="70" height="26" rx="2" fill="#FFE9B8"/>' +
      '<path d="M0 196h400v12H0z" fill="#CFC4B3"/>' + [40, 92, 196].map(x => '<g transform="translate(' + x + ' 196)"><path d="M0 0v12M-6 4h12" stroke="#2A2D4A" stroke-width="2"/><path d="M-14 2v10M-14 4h8v8M14 2v10M14 4h-8v8" stroke="#A27B4B" stroke-width="2.4" fill="none"/></g>').join('') +
      '<path d="M250 160h150v36H250z" fill="#C9D2DE"/><path d="M0 208h400v32H0z" fill="#6F98A8"/><path d="M30 222q20 5 40 0M150 228q20 5 40 0M290 220q20 5 40 0" stroke="#A7C6D2" stroke-width="2" fill="none"/>' +
      '<path d="M262 200q70-58 140 0" stroke="#2E6B4A" stroke-width="6" fill="none"/><path d="M262 200q70-50 140 0" stroke="#2E6B4A" stroke-width="2" fill="none"/>' + Array.from({ length: 9 }, (_, i) => { const x = 270 + i * 15; const y = 200 - Math.sin((i + .5) / 9 * Math.PI) * 42; return '<path d="M' + x + ' ' + y.toFixed(0) + 'v' + (200 - y).toFixed(0) + '" stroke="#2E6B4A" stroke-width="1.6"/>'; }).join('') +
      tree(380, 196, 0.9, '#C9A24A', '#5A3A28') },
    'kiosk': { alt: 'A small corner café with a striped awning, a counter window and two stools on the pavement.', draw: (o) => {
      const p = o && o.palette || ['#FFE3A3', '#F2D2B0', '#D9B48E', '#5E9E6E', '#3149E0'];
      return '<defs><linearGradient id="skyK" x2="0" y2="1"><stop stop-color="#E2ECFF"/><stop offset="1" stop-color="' + p[0] + '"/></linearGradient></defs><rect width="400" height="240" fill="url(#skyK)"/><circle cx="330" cy="46" r="20" fill="#FFF3CF"/>' +
        '<path d="M0 60h120v140H0z" fill="' + p[1] + '"/><path d="M280 50h120v150H280z" fill="' + p[1] + '"/>' + winGrid(14, 74, 3, 3, 18, 22, 16, 14, 'rgba(34,38,74,.25)') + winGrid(294, 64, 3, 3, 18, 22, 16, 14, 'rgba(34,38,74,.25)') +
        '<path d="M110 70h180v130H110z" fill="' + p[2] + '"/>' + winGrid(126, 84, 4, 1, 26, 26, 14, 0, 'rgba(34,38,74,.28)') +
        '<path d="M100 126h200l-12 24H112z" fill="' + p[4] + '"/>' + [0, 1, 2, 3, 4].map(i => '<path d="M' + (120 + i * 36) + ' 126l-4 24h14l4-24z" fill="#fff" opacity=".85"/>').join('') + scallop(112, 150, 176, 9, p[4]) +
        '<rect x="124" y="158" width="152" height="40" rx="3" fill="#FFE9B8"/><path d="M124 178h152" stroke="#E8C48E" stroke-width="2"/><rect x="140" y="164" width="20" height="12" rx="2" fill="#fff"/><rect x="168" y="162" width="10" height="14" rx="2" fill="#C4683E"/><rect x="250" y="160" width="14" height="16" rx="3" fill="' + p[3] + '"/>' +
        '<path d="M0 198h400v42H0z" fill="#E6D8C3"/><path d="M0 200h400" stroke="#D3C2A8" stroke-width="2"/>' +
        [150, 240].map(x => '<g transform="translate(' + x + ' 200)"><ellipse cx="0" cy="0" rx="12" ry="3" fill="#2A2D4A"/><path d="M0 0v22M-7 22h14" stroke="#2A2D4A" stroke-width="2.4"/></g>').join('') + plantPot(60, 192, p[3]) + plantPot(350, 192, p[3]); } },
    'station': { alt: 'A neighbourhood transit station with a canopy, a clock, a departures board without text, and a pedestrian crossing.', draw: (o) => {
      const p = o && o.palette || ['#FFE3A3', '#F2D2B0', '#D9B48E', '#5E9E6E', '#3149E0'];
      return '<defs><linearGradient id="skyS" x2="0" y2="1"><stop stop-color="#DCE8FF"/><stop offset="1" stop-color="#F4F1EA"/></linearGradient></defs><rect width="400" height="240" fill="url(#skyS)"/>' +
        '<path d="M40 60h320v120H40z" fill="' + p[2] + '"/><path d="M30 52h340l-14 18H44z" fill="#5E6A7D"/>' + winGrid(60, 80, 7, 1, 30, 40, 12, 0, '#C9D6EA', 'rgba(34,38,74,.3)') +
        '<circle cx="200" cy="40" r="17" fill="#fff" stroke="#2A2D4A" stroke-width="3"/><path d="M200 40v-10M200 40l8 5" stroke="#2A2D4A" stroke-width="2.4" stroke-linecap="round"/>' +
        '<rect x="150" y="128" width="100" height="22" rx="3" fill="#191C32"/>' + [0, 1, 2].map(i => '<path d="M' + (158 + i * 30) + ' 139h22" stroke="#FFC83D" stroke-width="3" stroke-linecap="round" opacity="' + (1 - i * .25) + '"/>').join('') +
        '<path d="M60 150h80v30H60zM260 150h80v30h-80z" fill="#4B5470"/><rect x="176" y="154" width="48" height="26" fill="#2A2D4A"/>' +
        '<path d="M0 180h400v60H0z" fill="#9EA4B5"/>' + Array.from({ length: 8 }, (_, i) => '<rect x="' + (110 + i * 24) + '" y="200" width="14" height="34" fill="#F3F4F8"/>').join('') +
        '<path d="M28 228V120" stroke="#2A2D4A" stroke-width="4"/><rect x="18" y="96" width="20" height="28" rx="4" fill="' + p[4] + '"/><circle cx="28" cy="105" r="4" fill="#fff"/>' +
        tree(370, 186, 1, p[3]); } },
    'plaza': { alt: 'A friendly neighbourhood square with a fountain, benches and trees.', draw: (o) => {
      const p = o && o.palette || ['#FFE3A3', '#F2D2B0', '#D9B48E', '#5E9E6E', '#3149E0'];
      return '<defs><linearGradient id="skyG" x2="0" y2="1"><stop stop-color="#DCE8FF"/><stop offset="1" stop-color="' + p[0] + '"/></linearGradient></defs><rect width="400" height="240" fill="url(#skyG)"/>' +
        '<path d="M0 80h110v110H0z" fill="' + p[1] + '"/><path d="M110 56h100v134H110z" fill="' + p[2] + '"/><path d="M210 86h100v104H210z" fill="' + p[1] + '"/><path d="M310 66h90v124h-90z" fill="' + p[2] + '"/>' +
        winGrid(14, 94, 3, 3, 16, 18, 16, 12, 'rgba(34,38,74,.28)') + winGrid(124, 70, 4, 4, 12, 18, 12, 10, 'rgba(34,38,74,.28)') + winGrid(224, 100, 4, 3, 12, 16, 12, 10, 'rgba(34,38,74,.28)') + winGrid(322, 80, 3, 4, 14, 18, 12, 10, 'rgba(34,38,74,.28)') +
        '<path d="M0 186h400v54H0z" fill="#EBDFCC"/>' + tree(40, 200, 1.1, p[3]) + tree(360, 198, 1.15, p[3]) +
        '<ellipse cx="200" cy="206" rx="54" ry="10" fill="#B9C9D9"/><ellipse cx="200" cy="203" rx="46" ry="7" fill="#8FC2E0"/><path d="M196 203v-36h8v36z" fill="#C9BBA6"/><path d="M200 168c-10-6-16-2-18 6M200 168c10-6 16-2 18 6" stroke="#8FC2E0" stroke-width="3" fill="none"/><circle cx="200" cy="166" r="5" fill="' + p[4] + '"/>' +
        '<path d="M96 212h44v5H96zM100 217v8M136 217v8M260 212h44v5h-44zM264 217v8M300 217v8" stroke="#5A3A28" stroke-width="2.4" fill="#7A5A3A"/>'; } }
  };
  A.SCENE_IDS = Object.keys(SCENES);
  A.sceneAlt = sid => (SCENES[sid] || SCENES.plaza).alt;
  A.scene = function (sid, opts) {
    opts = opts || {};
    const sc = SCENES[sid] || SCENES.plaza;
    return '<svg class="scene" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(opts.alt || sc.alt) + '">' + sc.draw(opts) + '</svg>';
  };
  A.plazaPalette = track => {
    const sets = [['#FFE3A3', '#F2D2B0', '#D9B48E', '#5E9E6E', '#3149E0'], ['#FFD9C9', '#F0C7B8', '#D99C8A', '#4F8C60', '#E5375F'], ['#E2F1E6', '#CFE3D3', '#A9C9B0', '#3E7D5A', '#12805C'], ['#E6E2FF', '#D9D3F2', '#B8AEE0', '#5E9E6E', '#7A4FD0'], ['#FFF0C7', '#F5DFB0', '#E0BF82', '#6FA36F', '#3149E0']];
    return sets[track.num % sets.length];
  };

  /* Small object pictograms used as visual answer options in listening checks. */
  A.optionIcon = name => A.icon(name, 'opt-ic');
  A.esc = esc;
})();
