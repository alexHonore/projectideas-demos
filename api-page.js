/* Hub API page (index.html#api): OpenRouter-first console for every API the demos use.
 *   #api            Overview: spend, OpenRouter credits, killswitch, apps
 *   #api/models     default model, per-app models, routing, fallbacks, model browser
 *   #api/playground run one prompt on up to three models side by side
 *   #api/voice      speak and listen through OpenRouter, Gemini or the browser
 *   #api/usage      calls by model and day, log, CSV
 *   #api/keys       OpenRouter (main), Gemini and Anthropic keys, provider switches
 * Reads and writes ApiMeter (scripts/api-meter/api-meter.js); every demo on this origin shares the
 * same state, so changes here apply to open demo tabs at once. Test calls are metered as "Hub". */
(function () {
  'use strict';
  var M = window.ApiMeter, root = document.getElementById('api-page'), btn = document.getElementById('btn-api');
  if (!M || !root) return;
  var APP = 'hub';

  var ICON = {
    gauge: '<path d="M12 14l4-4"/><path d="M3.3 19a9 9 0 1 1 17.4 0"/>',
    cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    flask: '<path d="M9 3h6M10 3v6L4.6 18.6A1.6 1.6 0 0 0 6 21h12a1.6 1.6 0 0 0 1.4-2.4L14 9V3"/><path d="M7.5 15h9"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    chart: '<path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M15 8l2 2"/>',
    power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    refresh: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    braces: '<path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    audio: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.4-1-1.6-1.7-3-1.7-1.7 0-3 .9-3 2.1s1.3 1.7 3 2.1 3 .9 3 2.1-1.3 2.1-3 2.1c-1.4 0-2.6-.7-3-1.7M12 6v1.8M12 16.2V18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8"/>',
    speaker: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    rec: '<circle cx="12" cy="12" r="6" fill="currentColor"/>',
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>'
  };
  function ic(n, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[n] || '') + '</svg>'; }
  var APP_ICON = { tradedesk: '🌾', langquest: '🗣️', tayoo: '🎙️', nexus: '🤝', tenderstrike: '📑', hub: '🧪' };
  var SECTIONS = [['overview', 'gauge', 'Overview'], ['models', 'cpu', 'Models'], ['playground', 'flask', 'Playground'], ['voice', 'mic', 'Voice'], ['usage', 'chart', 'Usage'], ['keys', 'key', 'Keys']];
  var LANGS = [
    ['en-CA', 'English (Canada)', 'Good morning! Your showing at two o’clock is confirmed.'],
    ['en-US', 'English (US)', 'Good morning! Your showing at two o’clock is confirmed.'],
    ['fr-CA', 'Français (Québec)', 'Bonjour! Votre visite de quatorze heures est confirmée.'],
    ['fr-FR', 'Français (France)', 'Bonjour ! Votre visite de quatorze heures est confirmée.'],
    ['es-ES', 'Español (España)', 'Un café con leche, por favor. ¿Cuánto es?'],
    ['es-MX', 'Español (México)', 'Un café con leche, por favor. ¿Cuánto cuesta?'],
    ['it-IT', 'Italiano', 'Un caffè, per favore. Quanto costa?'],
    ['de-DE', 'Deutsch', 'Einen Kaffee, bitte. Was kostet das?'],
    ['pt-BR', 'Português (Brasil)', 'Um café, por favor. Quanto custa?'],
    ['ja-JP', '日本語', 'コーヒーをひとつください。いくらですか。'],
    ['zh-CN', '中文', '请给我一杯咖啡。多少钱？'],
    ['ko-KR', '한국어', '커피 한 잔 주세요. 얼마예요?'],
    ['hi-IN', 'हिन्दी', 'एक कॉफ़ी दीजिए। कितने की है?'],
    ['ar-EG', 'العربية (مصر)', 'قهوة واحدة لو سمحت. بكام؟'],
    ['sw-KE', 'Kiswahili', 'Kahawa moja, tafadhali. Ni bei gani?']
  ];
  var GEMINI_VOICES = [
    ['Kore', 'F · firm'], ['Aoede', 'F · breezy'], ['Leda', 'F · youthful'], ['Zephyr', 'F · bright'], ['Callirrhoe', 'F · easy-going'],
    ['Autonoe', 'F · bright'], ['Despina', 'F · smooth'], ['Erinome', 'F · clear'], ['Laomedeia', 'F · upbeat'], ['Achernar', 'F · soft'],
    ['Gacrux', 'F · mature'], ['Pulcherrima', 'F · forward'], ['Vindemiatrix', 'F · gentle'], ['Sulafat', 'F · warm'],
    ['Puck', 'M · upbeat'], ['Charon', 'M · informative'], ['Fenrir', 'M · excitable'], ['Orus', 'M · firm'], ['Enceladus', 'M · breathy'],
    ['Iapetus', 'M · clear'], ['Umbriel', 'M · easy-going'], ['Algieba', 'M · smooth'], ['Algenib', 'M · gravelly'], ['Rasalgethi', 'M · informative'],
    ['Alnilam', 'M · firm'], ['Schedar', 'M · even'], ['Achird', 'M · friendly'], ['Zubenelgenubi', 'M · casual'], ['Sadachbia', 'M · lively'], ['Sadaltager', 'M · knowledgeable']
  ];
  var AUTO = 'openrouter/auto';
  var PG_SCHEMA = { type: 'object', properties: { answer: { type: 'string' }, confidence: { type: 'number' } }, required: ['answer', 'confidence'], additionalProperties: false };

  /* ---------- formatting ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function usd(v) { v = Number(v) || 0; return v > 0 && v < 0.01 ? usd4(v) : '$' + v.toFixed(2); }
  function usd4(v) { v = Number(v) || 0; return v > 0 && v < 0.0001 ? '<$0.0001' : '$' + v.toFixed(4); }
  function per(v) { return v == null ? 'varies' : v === 0 ? '0' : '$' + (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(2).replace(/\.?0+$/, '') : String(Number(v.toFixed(3)))); }
  function ctx(n) { return !n ? '' : n >= 1e6 ? (Math.round(n / 1e5) / 10) + 'M' : Math.round(n / 1000) + 'k'; }
  function plural(c, w) { return c + ' ' + w + (c === 1 ? '' : 's'); }
  function sum(obj, key) { return Object.keys(obj || {}).reduce(function (n, k) { return n + ((obj[k] || {})[key] || 0); }, 0); }
  function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function sw(id, on, label) { return '<button type="button" class="ap-sw" role="switch" aria-checked="' + !!on + '" data-sw="' + id + '" aria-label="' + esc(label) + '" title="' + esc(label) + '"><span></span></button>'; }
  function bar(p, cls) { return '<div class="ap-bar' + (cls ? ' ' + cls : '') + '"><i style="width:' + Math.max(0, Math.min(100, p)).toFixed(1) + '%"></i></div>'; }
  function time(t) { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  /* ---------- models ---------- */
  var data = { text: M.openrouter.cached('text'), speech: M.openrouter.cached('speech'), transcription: M.openrouter.cached('transcription'), loading: {}, error: {}, account: null, accErr: '', accLoading: false };
  // The public model lists are free and need no key, but nothing is fetched while OpenRouter is switched off.
  function orOff() { var k = M.state().kill; return k.global || k.providers.openrouter; }
  function autoLoad(kind) { if (!data[kind].length && !data.loading[kind] && !data.error[kind] && !orOff()) setTimeout(function () { loadModels(kind); }, 0); }
  function loadModels(kind, refresh) {
    if (data.loading[kind]) return;
    if (orOff()) { data.error[kind] = 'OpenRouter is switched off'; draw(); if (picker.open) drawPicker(); return; }
    data.loading[kind] = true; data.error[kind] = '';
    M.openrouter.models({ kind: kind, refresh: !!refresh }).then(function (list) { data[kind] = list; }, function (err) { data.error[kind] = err.message; })
      .then(function () { data.loading[kind] = false; draw(); if (picker.open) drawPicker(); });
  }
  function loadAccount(refresh) {
    if (!M.keys.has('openrouter') || data.accLoading) return;
    data.accLoading = true;
    M.openrouter.account({ refresh: !!refresh }).then(function (a) { data.account = a; data.accErr = ''; }, function (err) { data.account = null; data.accErr = err.message; })
      .then(function () { data.accLoading = false; draw(); });
  }
  function info(id) { return M.openrouter.find(id); }
  function shortName(id) {
    if (!id) return 'None';
    if (id === AUTO) return 'Auto router';
    if (id === M.CLAUDE) return 'Claude Opus 5.5';
    var m = info(id); if (m) return m.name.replace(/^[^:]{1,40}:\s*/, '');
    return id.split('/').pop();
  }
  function org(id) { var m = info(id); return m && /:/.test(m.name) ? m.name.split(':')[0] : (id || '').split('/')[0]; }
  function priceLine(m) { return !m ? '' : m.input == null ? 'price varies by model' : per(m.input) + ' in · ' + per(m.output) + ' out / 1M'; }
  function caps(m) {
    if (!m) return '';
    var c = [];
    if (m.json) c.push(['braces', 'Structured output (JSON)']);
    if (m.vision) c.push(['eye', 'Reads images']);
    if (m.file) c.push(['file', 'Reads files (PDF)']);
    if (m.audio) c.push(['audio', 'Hears audio']);
    if (m.tools) c.push(['tool', 'Tool calling']);
    return '<span class="ap-caps">' + c.map(function (x) { return '<span title="' + esc(x[1]) + '" aria-label="' + esc(x[1]) + '">' + ic(x[0]) + '</span>'; }).join('') + (m.free ? '<b class="ap-free" title="Free (rate-limited)">FREE</b>' : '') + '</span>';
  }
  function blended(m) { return m.input == null ? Infinity : (m.input + 3 * m.output) / 4; }
  // Preset picks, computed from the live model list and shown before they are applied.
  function presets() {
    var list = data.text, paid = list.filter(function (m) { return m.json && !m.free && m.input != null && m.context >= 32000; });
    var scored = paid.filter(function (m) { return m.intel != null; });
    var by = function (f) { return function (a, b) { return f(a, b); }; };
    var best = scored.slice().sort(by(function (a, b) { return b.intel - a.intel || blended(a) - blended(b); }))[0];
    var balanced = scored.filter(function (m) { return blended(m) <= 2; }).sort(by(function (a, b) { return b.intel - a.intel || blended(a) - blended(b); }))[0];
    var cheapest = paid.slice().sort(by(function (a, b) { return blended(a) - blended(b) || (b.intel || 0) - (a.intel || 0); }))[0];
    var free = list.filter(function (m) { return m.free && m.json; }).sort(by(function (a, b) { return (b.intel || 0) - (a.intel || 0) || b.context - a.context; }))[0];
    return [['auto', 'layers', 'Auto', { id: AUTO }], ['best', 'spark', 'Best', best], ['balanced', 'bolt', 'Balanced', balanced], ['cheapest', 'coin', 'Cheapest', cheapest], ['free', 'check', 'Free', free]]
      .filter(function (p) { return p[3]; });
  }

  /* ---------- page state ---------- */
  var ui = { sec: 'overview', keyOpen: null, uApp: '', uProv: '', uErr: false };
  var pg = { prompt: 'In one sentence: why do grain prices differ between two buyers 80 km apart?', json: false, slots: [], out: {}, busy: false };
  var vs = { lang: 'en-CA', text: '', tts: null, stt: null, gvoice: '', orTts: '', orVoice: '', orStt: '', dvoice: '', rate: 1, out: {}, busy: '', recording: false, listening: false };
  try { var saved = JSON.parse(sessionStorage.getItem('project-demos:api-page') || '{}'); if (saved.pg) { pg.prompt = saved.pg.prompt || pg.prompt; pg.json = !!saved.pg.json; pg.slots = saved.pg.slots || []; } if (saved.vs) Object.assign(vs, saved.vs, { out: {}, busy: '', recording: false, listening: false }); } catch (e) {}
  function keep() { try { sessionStorage.setItem('project-demos:api-page', JSON.stringify({ pg: { prompt: pg.prompt, json: pg.json, slots: pg.slots }, vs: { lang: vs.lang, text: vs.text, tts: vs.tts, stt: vs.stt, gvoice: vs.gvoice, orTts: vs.orTts, orVoice: vs.orVoice, orStt: vs.orStt, dvoice: vs.dvoice, rate: vs.rate } })); } catch (e) {} }

  /* ---------- sections ---------- */
  function setup(s) {
    var hasKey = M.keys.has('openrouter'), l = s.llm, tested = s.log.some(function (e) { return e.provider === 'openrouter' && e.ok; });
    if (hasKey && tested) return '';
    var step = function (done, n, icon, label, href) { return '<a class="ap-step' + (done ? ' done' : '') + '" href="' + href + '">' + (done ? ic('check') : '<b>' + n + '</b>') + ic(icon) + '<span>' + label + '</span></a>'; };
    return '<nav class="ap-steps" aria-label="Set up">' + step(hasKey, 1, 'key', 'Add OpenRouter key', '#api/keys') + step(hasKey && !!l.model, 2, 'cpu', 'Pick a model', '#api/models') + step(tested, 3, 'flask', 'Test it', '#api/playground') + '</nav>';
  }
  function engineLabel(l) { return l.provider === 'anthropic' ? 'Claude Opus 5.5 · direct' : shortName(l.model); }

  function overview(s) {
    var t = s.totals, calls = Object.keys(t).reduce(function (n, a) { return n + sum(t[a], 'calls'); }, 0), errs = Object.keys(t).reduce(function (n, a) { return n + sum(t[a], 'errors'); }, 0);
    var b = s.budgets.global, a = data.account, hasKey = M.keys.has('openrouter');
    if (hasKey && !a && !data.accLoading && !data.accErr) setTimeout(function () { loadAccount(false); }, 0);
    var orTile = !hasKey ? '<a class="ap-tile ap-tile-cta" href="#api/keys">' + ic('key', 'big') + '<span class="ap-tl">OpenRouter</span><strong>Add key</strong><small>One key for every model</small></a>'
      : a ? '<div class="ap-tile"><span class="ap-tl">' + ic('coin') + 'OpenRouter</span><strong>' + (a.remaining == null ? 'No limit' : usd(a.remaining)) + '</strong>' +
        (a.limit ? bar(100 - (a.remaining / a.limit) * 100, 'ap-bar-or') : '') + '<small>' + (a.remaining == null ? '' : 'left · ') + usd(a.monthly) + ' this month' + (a.free ? ' · free tier' : '') + '</small>' +
        '<button type="button" class="ap-ib ap-tile-act" data-act="account" title="Refresh" aria-label="Refresh OpenRouter credit">' + ic('refresh') + '</button></div>'
      : '<div class="ap-tile"><span class="ap-tl">' + ic('coin') + 'OpenRouter</span><strong>' + (data.accLoading ? '…' : '—') + '</strong><small>' + esc(data.accErr || 'Checking…') + '</small>' +
        '<button type="button" class="ap-ib ap-tile-act" data-act="account" title="Refresh" aria-label="Refresh OpenRouter credit">' + ic('refresh') + '</button></div>';
    var html = setup(s) + '<div class="ap-tiles">' +
      '<div class="ap-tile"><span class="ap-tl">' + ic('chart') + 'This month</span><strong>' + usd(s.spent) + '</strong>' + bar(b ? s.spent / b * 100 : 0) +
      '<label class="ap-budget">of $<input type="number" min="0" step="0.5" value="' + b + '" data-budget="global" aria-label="Monthly budget for all apps, USD"></label></div>' +
      orTile +
      '<a class="ap-tile" href="#api/usage"><span class="ap-tl">' + ic('bolt') + 'Calls</span><strong>' + calls + '</strong><small>' + (errs ? plural(errs, 'error') : 'no errors') + (s.log[0] ? ' · last ' + time(s.log[0].t) : '') + '</small></a></div>';

    html += '<h2 class="ap-h">Apps</h2><div class="ap-apps" role="list">';
    Object.keys(M.APPS).forEach(function (app) {
      var row = t[app] || {}, spent = s.spentByApp[app] || 0, ab = s.budgets.apps[app], off = !!s.kill.apps[app], l = M.llm(app), own = M.llmOverride(app), g = M.checkLlm(app);
      html += '<div class="ap-app' + (off ? ' off' : '') + '" role="listitem">' +
        '<span class="ap-emoji" aria-hidden="true">' + APP_ICON[app] + '</span>' +
        '<div class="ap-app-main"><strong>' + esc(M.APPS[app]) + '</strong>' +
        '<a class="ap-chip' + (own ? ' own' : '') + (g.ok ? '' : ' warn') + '" href="#api/models" title="' + esc((own ? 'Own model: ' : 'Default model: ') + (l.model || 'none') + (g.ok ? '' : ' · ' + g.reason)) + '">' + ic('cpu') + '<span>' + esc(engineLabel(l)) + '</span></a></div>' +
        '<div class="ap-app-spend"><span>' + usd(spent) + ' <small>· ' + plural(sum(row, 'calls'), 'call') + '</small></span>' + bar(ab ? spent / ab * 100 : 0) +
        '<label class="ap-budget">of $<input type="number" min="0" step="0.5" value="' + (ab == null ? '' : ab) + '" data-budget="' + app + '" aria-label="' + esc(M.APPS[app]) + ' monthly budget, USD"></label></div>' +
        sw('app:' + app, !off, M.APPS[app] + ' APIs') + '</div>';
    });
    html += '</div>';
    return html;
  }

  function modelCard(l, s) {
    var m = l.provider === 'openrouter' ? info(l.model) : null, g = M.checkLlm('hub');
    return '<div class="ap-card ap-current">' +
      '<div class="ap-seg" role="radiogroup" aria-label="Live AI engine">' +
      '<button type="button" role="radio" data-engine="openrouter" aria-checked="' + (l.provider === 'openrouter') + '">' + ic('route') + 'OpenRouter</button>' +
      '<button type="button" role="radio" data-engine="anthropic" aria-checked="' + (l.provider === 'anthropic') + '">' + ic('spark') + 'Claude direct</button></div>' +
      '<div class="ap-cur-main"><span class="ap-tl">Default for all apps</span>' +
      '<strong id="ap-default-model">' + esc(engineLabel(l)) + '</strong>' +
      '<code>' + esc(l.model || 'no model chosen') + '</code>' +
      '<span class="ap-meta">' + (l.provider === 'anthropic' ? '$4 in · $20 out / 1M · Anthropic key' : l.model === AUTO ? 'Picks a model per request · exact cost reported' : esc(priceLine(m)) + (m && m.context ? ' · ' + ctx(m.context) + ' context' : '')) + '</span>' + caps(m) +
      (g.ok || /No OpenRouter key|No Anthropic key/.test(g.reason) ? '' : '<p class="ap-warn">' + esc(g.reason) + '</p>') + '</div>' +
      (l.provider === 'openrouter' ? '<button type="button" class="ap-btn" data-pick="default">' + ic('search') + 'Change</button>' : '') + '</div>';
  }
  function models(s) {
    var l = s.llm, r = s.route, list = data.text;
    autoLoad('text');
    var html = modelCard(l, s);
    if (l.provider === 'openrouter') {
      var pre = presets();
      html += '<div class="ap-presets" role="group" aria-label="Quick picks">' + pre.map(function (p) {
        var on = l.model === p[3].id;
        return '<button type="button" class="ap-pre' + (on ? ' on' : '') + '" data-preset="' + esc(p[3].id) + '" aria-pressed="' + on + '" title="' + esc(p[3].id) + '">' + ic(p[1]) + '<span>' + p[2] + '</span><small>' + esc(p[0] === 'auto' ? 'per request' : shortName(p[3].id)) + '</small></button>';
      }).join('') + (data.loading.text ? '<span class="ap-muted">Loading models…</span>' : data.error.text ? '<span class="ap-err">' + esc(data.error.text) + '</span>' : '') + '</div>';
    }

    html += '<h2 class="ap-h">Per app</h2><div class="ap-list">';
    Object.keys(M.APPS).forEach(function (app) {
      var own = M.llmOverride(app), la = M.llm(app);
      html += '<div class="ap-li"><span class="ap-emoji" aria-hidden="true">' + APP_ICON[app] + '</span><strong>' + esc(M.APPS[app]) + '</strong>' +
        '<button type="button" class="ap-pickbtn' + (own ? ' own' : '') + '" data-pick="app:' + app + '" aria-label="' + esc(M.APPS[app]) + ' model: ' + esc(own ? la.model : 'default') + '">' + esc(own ? shortName(la.model) : 'Default') + ic('edit') + '</button>' +
        (own ? '<button type="button" class="ap-ib" data-reset-app="' + app + '" title="Use the default" aria-label="' + esc(M.APPS[app]) + ': use the default model">' + ic('close') + '</button>' : '<span class="ap-ib-gap"></span>') + '</div>';
    });
    html += '</div>';

    html += '<h2 class="ap-h">Routing</h2><div class="ap-card ap-route">' +
      '<div class="ap-row"><span class="ap-tl">' + ic('route') + 'Prefer</span><div class="ap-seg" role="radiogroup" aria-label="Provider preference">' +
      [['', 'Balanced'], ['price', 'Price'], ['throughput', 'Speed'], ['latency', 'Latency']].map(function (o) { return '<button type="button" role="radio" data-sort="' + o[0] + '" aria-checked="' + (r.sort === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="ap-row"><span class="ap-tl">' + ic('shield') + 'No training on my data</span>' + sw('route:privacy', r.privacy, 'Only providers that do not train on or store prompts') + '</div>' +
      '<div class="ap-row"><span class="ap-tl">' + ic('lock') + 'Zero data retention</span>' + sw('route:zdr', r.zdr, 'Only zero-data-retention endpoints') + '</div>' +
      '<div class="ap-row ap-fb"><span class="ap-tl">' + ic('layers') + 'Fallbacks</span><div class="ap-fbs">' +
      [0, 1].map(function (i) { var id = r.fallbacks[i]; return id ? '<span class="ap-fbchip"><button type="button" data-pick="fb:' + i + '">' + esc(shortName(id)) + '</button><button type="button" class="ap-x" data-fb-rm="' + i + '" aria-label="Remove fallback ' + esc(id) + '">' + ic('close') + '</button></span>' : (i === r.fallbacks.length ? '<button type="button" class="ap-add" data-pick="fb:' + i + '">' + ic('plus') + 'Add</button>' : ''); }).join('') +
      '</div></div></div>';
    html += '<button type="button" class="ap-btn ap-browse" data-pick="browse">' + ic('search') + 'Browse ' + (list.length ? list.length + ' ' : '') + 'models' + '</button>';
    return html;
  }

  function playground(s) {
    autoLoad('text');
    if (!pg.slots.length) pg.slots = [s.llm.provider === 'openrouter' && s.llm.model ? s.llm.model : AUTO];
    var g = M.checkLlm('hub'), gate = M.check(APP, 'openrouter');
    var tok = Math.ceil(pg.prompt.length / 4) + 12;
    var known = pg.slots.every(function (id) { var m = info(id); return m && m.input != null; });
    var est = pg.slots.reduce(function (n, id) { return n + M.costOf(id, { inputTokens: tok, outputTokens: 120 }); }, 0);
    var html = (gate.ok ? '' : '<p class="ap-paused" role="status">' + ic('power') + esc(gate.reason) + (/key/.test(gate.reason) ? ' · <a href="#api/keys">add it</a>' : '') + '</p>') +
      '<label class="ap-field"><span class="sr-only">Prompt</span><textarea data-f="pgPrompt" rows="3" aria-label="Prompt">' + esc(pg.prompt) + '</textarea></label>' +
      '<div class="ap-row ap-pg-bar"><div class="ap-slots">' + pg.slots.map(function (id, i) {
        return '<span class="ap-fbchip"><button type="button" data-pick="pg:' + i + '" title="' + esc(id) + '">' + esc(shortName(id)) + '</button>' + (pg.slots.length > 1 ? '<button type="button" class="ap-x" data-slot-rm="' + i + '" aria-label="Remove ' + esc(id) + '">' + ic('close') + '</button>' : '') + '</span>';
      }).join('') + (pg.slots.length < 3 ? '<button type="button" class="ap-add" data-pick="pg:' + pg.slots.length + '">' + ic('plus') + 'Compare</button>' : '') + '</div>' +
      '<label class="ap-check" title="Ask for structured output, as the demos do"><input type="checkbox" data-f="pgJson"' + (pg.json ? ' checked' : '') + '>' + ic('braces') + 'JSON</label>' +
      '<button type="button" class="ap-run" data-run="pg"' + (pg.busy || !gate.ok ? ' disabled' : '') + '>' + (pg.busy ? '…' : ic('play') + 'Run') + '<small>' + (known ? '≈ ' + usd4(est) : 'exact cost after') + '</small></button></div>';
    html += '<div class="ap-results ap-n' + pg.slots.length + '">' + pg.slots.map(function (id, i) {
      var o = pg.out[i]; if (!o) return '';
      if (o.busy) return '<div class="ap-res busy"><strong>' + esc(shortName(id)) + '</strong><p class="ap-muted">Running…</p></div>';
      if (o.error) return '<div class="ap-res err"><strong>' + esc(shortName(id)) + '</strong><p class="ap-err" role="alert">' + esc(o.error) + '</p></div>';
      var u = o.usage || {};
      return '<div class="ap-res"><div class="ap-res-head"><strong>' + esc(shortName(o.model || id)) + '</strong>' + (o.json != null ? '<span class="ap-ok' + (o.json ? '' : ' bad') + '">' + ic(o.json ? 'check' : 'close') + 'JSON</span>' : '') + '</div>' +
        '<p class="ap-meta">' + [o.provider ? 'via ' + esc(o.provider) : '', (o.ms / 1000).toFixed(1) + ' s', (u.inputTokens || 0) + '→' + (u.outputTokens || 0) + ' tok', o.cost != null ? '<b>' + usd4(o.cost) + '</b>' + (o.est ? ' ≈' : '') : ''].filter(Boolean).join(' · ') + '</p>' +
        (o.model && o.model !== id ? '<p class="ap-meta">' + ic('route') + esc(o.model) + '</p>' : '') +
        '<blockquote class="ap-out">' + esc(o.text) + '</blockquote>' +
        (o.model && o.model !== AUTO ? '<button type="button" class="ap-link" data-preset="' + esc(o.model) + '">' + (s.llm.model === o.model ? ic('check') + 'Default' : 'Use as default') + '</button>' : '') + '</div>';
    }).join('') + '</div>';
    return html;
  }

  /* voice */
  function voiceScore(v, lang) {
    var n = v.name || '', s = 0;
    if (/natural|neural|online|premium|enhanced|siri/i.test(n)) s += 5;
    if (/google/i.test(n)) s += 3;
    if (/espeak|mbrola|festival/i.test(n)) s -= 6;
    if (v.lang === lang) s += 4; else if ((v.lang || '').split('-')[0] === lang.split('-')[0]) s += 2;
    if (v.localService === false) s += 1;
    return s;
  }
  function deviceVoices() {
    var all = (window.speechSynthesis && speechSynthesis.getVoices()) || [], base = vs.lang.split('-')[0];
    return all.filter(function (v) { return (v.lang || '').replace('_', '-').split('-')[0] === base; }).sort(function (a, b) { return voiceScore(b, vs.lang) - voiceScore(a, vs.lang); });
  }
  if (window.speechSynthesis && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', function () { if (ui.sec === 'voice') draw(); });
  function sample() { return (LANGS.filter(function (x) { return x[0] === vs.lang; })[0] || LANGS[0])[2]; }
  function langSel() { return '<label class="ap-field"><span>' + ic('speaker') + 'Language</span><select data-f="vLang">' + LANGS.map(function (l) { return opt(l[0], l[1], vs.lang); }).join('') + '</select></label>'; }
  function seg(name, cur, items) { return '<div class="ap-seg" role="radiogroup" aria-label="' + esc(name) + '">' + items.map(function (x) { return '<button type="button" role="radio" data-' + name + '="' + x[0] + '" aria-checked="' + (cur === x[0]) + '">' + ic(x[1]) + x[2] + '</button>'; }).join('') + '</div>'; }
  function meta(o) {
    if (!o) return '';
    if (o.error) return '<p class="ap-err" role="alert">' + esc(o.error) + '</p>';
    var u = o.usage || {}, bits = [];
    if (o.ms != null) bits.push((o.ms / 1000).toFixed(1) + ' s');
    if (u.inputTokens) bits.push(u.inputTokens + ' in');
    if (u.outputTokens) bits.push(u.outputTokens + ' out');
    if (u.audioOutTokens) bits.push(u.audioOutTokens + ' audio tokens');
    if (u.audioInTokens) bits.push(u.audioInTokens + ' audio-in tokens');
    if (u.chars) bits.push(u.chars + ' chars');
    if (u.seconds) bits.push(Number(u.seconds).toFixed(1) + ' s audio');
    if (o.cost != null) bits.push(o.cost ? usd4(o.cost) + (o.est ? ' ≈' : '') : 'free');
    return '<p class="ap-meta">' + esc(bits.join(' · ')) + '</p>';
  }
  function inUse(kind, prov, model, voice) {
    var v = M.voice()[kind];
    return v.provider === prov && (prov === 'gemini' ? (kind === 'stt' || v.voice === voice) : v.model === model && (kind === 'stt' || v.voice === voice));
  }
  function useBtn(kind, prov, model, voice) {
    if (prov === 'device' || prov === 'browser') return '<span class="ap-muted">' + ic('check') + 'Free fallback in the demos</span>';
    var on = inUse(kind, prov, model, voice);
    return '<button type="button" class="ap-link" data-use-voice="' + kind + '"' + (on || (prov === 'openrouter' && !model) ? ' disabled' : '') + '>' + (on ? ic('check') + 'Demos use this' : 'Use in demos') + '</button>';
  }
  function voice(s) {
    var cur = s.voice;
    var orOnly = M.keys.has('openrouter') && !M.keys.has('gemini');
    if (!vs.tts) vs.tts = cur.tts.provider === 'gemini' && orOnly ? 'openrouter' : cur.tts.provider;
    if (!vs.stt) vs.stt = cur.stt.provider === 'gemini' && orOnly ? 'openrouter' : cur.stt.provider;
    if (!vs.gvoice) vs.gvoice = cur.tts.provider === 'gemini' ? cur.tts.voice : 'Kore';
    if (!vs.orTts && cur.tts.provider === 'openrouter') { vs.orTts = cur.tts.model; vs.orVoice = cur.tts.voice; }
    if (!vs.orStt && cur.stt.provider === 'openrouter') vs.orStt = cur.stt.model;
    var needT = vs.tts === 'openrouter' && !data.speech.length, needS = vs.stt === 'openrouter' && !data.transcription.length;
    if (needT) autoLoad('speech');
    if (needS) autoLoad('transcription');
    if (vs.tts === 'openrouter' && !vs.orTts && data.speech.length) vs.orTts = data.speech[0].id;
    if (vs.stt === 'openrouter' && !vs.orStt && data.transcription.length) vs.orStt = data.transcription[0].id;
    var text = vs.text || sample(), o = vs.out.tts, busy = vs.busy === 'tts';

    // Speak
    var prov = vs.tts === 'device' ? 'browser-tts' : vs.tts, g = vs.tts === 'device' ? M.check(APP, 'browser-tts') : M.check(APP, prov), body = '';
    if (vs.tts === 'openrouter') {
      var tm = info(vs.orTts), voices = (tm && tm.voices) || [];
      if (voices.length && vs.orVoice && voices.indexOf(vs.orVoice) < 0) vs.orVoice = '';
      body = '<label class="ap-field"><span>' + ic('cpu') + 'Model</span><select data-f="orTts">' + (data.speech.length ? data.speech.map(function (m) { return opt(m.id, shortName(m.id) + (m.input != null ? ' · ' + per(m.input) + '/1M' : ''), vs.orTts); }).join('') : '<option value="">' + (data.loading.speech ? 'Loading…' : esc(data.error.speech || 'No voice models')) + '</option>') + '</select></label>' +
        '<label class="ap-field"><span>' + ic('speaker') + 'Voice</span>' + (voices.length ? '<select data-f="orVoice">' + voices.map(function (v) { return opt(v, v, vs.orVoice || voices[0]); }).join('') + '</select>' : '<input data-f="orVoice" value="' + esc(vs.orVoice) + '" placeholder="default">') + '</label>';
    } else if (vs.tts === 'gemini') {
      body = '<label class="ap-field"><span>' + ic('speaker') + 'Voice</span><select data-f="gvoice">' + GEMINI_VOICES.map(function (v) { return opt(v[0], v[0] + ' · ' + v[1], vs.gvoice); }).join('') + '</select></label>' +
        '<label class="ap-field"><span>' + ic('cpu') + 'Model</span><input data-f="gTtsModel" value="' + esc(M.model('tts')) + '"></label>';
    } else {
      var dv = deviceVoices();
      if (vs.dvoice && !dv.some(function (v) { return v.name === vs.dvoice; })) vs.dvoice = '';
      body = '<label class="ap-field"><span>' + ic('speaker') + 'Voice</span><select data-f="dvoice">' + (dv.length ? dv.map(function (v, i) { return opt(v.name, (voiceScore(v, vs.lang) >= 5 ? '★ ' : '') + v.name + (i === 0 ? ' (best)' : ''), vs.dvoice || dv[0].name); }).join('') : '<option value="">No voice for this language</option>') + '</select></label>' +
        '<label class="ap-field"><span>' + ic('clock') + 'Speed ' + vs.rate.toFixed(2) + '</span><input type="range" min="0.6" max="1.3" step="0.05" value="' + vs.rate + '" data-f="rate"></label>';
    }
    var tModel = vs.tts === 'openrouter' ? vs.orTts : vs.tts === 'gemini' ? M.model('tts') : '';
    var html = '<div class="ap-card ap-voice"><div class="ap-card-head"><h3>' + ic('speaker') + 'Speak</h3>' + seg('tts', vs.tts, [['openrouter', 'route', 'OpenRouter'], ['gemini', 'spark', 'Gemini'], ['device', 'speaker', 'Device']]) + '</div>' +
      (g.ok ? '' : '<p class="ap-paused" role="status">' + ic('power') + esc(g.reason) + (/key/.test(g.reason) ? ' · <a href="#api/keys">add it</a>' : '') + '</p>') +
      '<div class="ap-grid3">' + langSel() + body + '</div>' +
      '<label class="ap-field wide"><span class="sr-only">Text to speak</span><input data-f="vText" value="' + esc(text) + '" aria-label="Text to speak"></label>' +
      '<div class="ap-row"><button type="button" class="ap-run" data-run="tts"' + (busy || !g.ok || (vs.tts === 'openrouter' && !vs.orTts) ? ' disabled' : '') + '>' + (busy ? '…' : ic('play') + 'Speak') + '<small>' + (vs.tts === 'device' ? 'free' : '≈ ' + usd4(vs.tts === 'gemini' ? M.costOf(M.model('tts'), { inputTokens: Math.ceil(text.length / 4) + 10, audioOutTokens: Math.ceil(Math.max(1, text.length / 14) * 25) }) : M.costOf(tModel, { inputTokens: Math.ceil(text.length / 4) }))) + '</small></button>' +
      useBtn('tts', vs.tts, tModel, vs.tts === 'gemini' ? vs.gvoice : vs.orVoice || ((info(vs.orTts) || {}).voices || [])[0] || '') + '</div>' +
      (o && o.url ? '<audio class="ap-audio" controls src="' + o.url + '"></audio>' : '') + meta(o) + '</div>';

    // Listen
    var so = vs.out.stt, SR = window.SpeechRecognition || window.webkitSpeechRecognition, sprov = vs.stt === 'browser' ? 'browser-speech' : vs.stt, sg = M.check(APP, sprov), sbody = '';
    if (vs.stt === 'openrouter') sbody = '<label class="ap-field"><span>' + ic('cpu') + 'Model</span><select data-f="orStt">' + (data.transcription.length ? data.transcription.map(function (m) { return opt(m.id, shortName(m.id), vs.orStt); }).join('') : '<option value="">' + (data.loading.transcription ? 'Loading…' : esc(data.error.transcription || 'No transcription models')) + '</option>') + '</select></label>';
    else if (vs.stt === 'gemini') sbody = '<label class="ap-field"><span>' + ic('cpu') + 'Model</span><input data-f="gSttModel" value="' + esc(M.model('transcribe')) + '"></label>';
    var rec = vs.recording || vs.listening, sbusy = vs.busy === 'stt';
    html += '<div class="ap-card ap-voice"><div class="ap-card-head"><h3>' + ic('mic') + 'Listen</h3>' + seg('stt', vs.stt, [['openrouter', 'route', 'OpenRouter'], ['gemini', 'spark', 'Gemini'], ['browser', 'mic', 'Browser']]) + '</div>' +
      (vs.stt === 'browser' && !SR ? '<p class="ap-paused">This browser has no speech recognition. Try Chrome or Edge.</p>' : sg.ok ? '' : '<p class="ap-paused" role="status">' + ic('power') + esc(sg.reason) + (/key/.test(sg.reason) ? ' · <a href="#api/keys">add it</a>' : '') + '</p>') +
      '<div class="ap-grid3">' + langSel().replace('data-f="vLang"', 'data-f="vLang2"') + sbody + '</div>' +
      '<div class="ap-row"><button type="button" class="ap-run' + (rec ? ' rec' : '') + '" data-run="stt"' + (sbusy || (!rec && (!sg.ok || (vs.stt === 'browser' && !SR) || (vs.stt === 'openrouter' && !vs.orStt))) ? ' disabled' : '') + '>' + (rec ? ic('stop') + 'Stop' : sbusy ? '…' : ic('rec') + 'Record') + '<small>' + (rec ? (vs.stt === 'browser' ? 'listening' : 'max 8 s') : vs.stt === 'browser' ? 'free' : '8 s max') + '</small></button>' +
      useBtn('stt', vs.stt, vs.stt === 'openrouter' ? vs.orStt : M.model('transcribe')) + '</div>' +
      (so && (so.text != null || so.interim) ? '<blockquote class="ap-out">' + esc(so.text || (so.interim ? '' : '(silence)')) + (so.interim ? ' <i>' + esc(so.interim) + '</i>' : '') + '</blockquote>' : '') + meta(so) + '</div>';
    return html;
  }

  function usage(s) {
    var mon = s.month, log = s.log.filter(function (e) { return new Date(e.t).toISOString().slice(0, 7) === mon; });
    var shown = log.filter(function (e) { return (!ui.uApp || e.app === ui.uApp) && (!ui.uProv || e.provider === ui.uProv) && (!ui.uErr || !e.ok); });
    var byModel = {};
    shown.forEach(function (e) { var k = e.model || M.PROVIDERS[e.provider].name, b = byModel[k] = byModel[k] || { calls: 0, inT: 0, outT: 0, cost: 0, est: false, prov: e.provider }; b.calls++; b.inT += (e.usage || {}).inputTokens || 0; b.outT += (e.usage || {}).outputTokens || 0; b.cost += e.cost || 0; if (e.est) b.est = true; });
    var rows = Object.keys(byModel).sort(function (a, b) { return byModel[b].cost - byModel[a].cost || byModel[b].calls - byModel[a].calls; });
    var days = new Date(Date.UTC(+mon.slice(0, 4), +mon.slice(5, 7), 0)).getUTCDate(), perDay = [];
    for (var d = 0; d < days; d++) perDay.push(0);
    shown.forEach(function (e) { perDay[new Date(e.t).getUTCDate() - 1] += e.cost || 0; });
    var max = Math.max.apply(null, perDay.concat([0.0001])), total = perDay.reduce(function (a, b) { return a + b; }, 0);
    var html = '<div class="ap-row ap-filters">' +
      '<select data-f="uApp" aria-label="App"><option value="">All apps</option>' + Object.keys(M.APPS).map(function (a) { return opt(a, M.APPS[a], ui.uApp); }).join('') + '</select>' +
      '<select data-f="uProv" aria-label="Provider"><option value="">All providers</option>' + Object.keys(M.PROVIDERS).map(function (p) { return opt(p, M.PROVIDERS[p].name, ui.uProv); }).join('') + '</select>' +
      '<label class="ap-check"><input type="checkbox" data-f="uErr"' + (ui.uErr ? ' checked' : '') + '>Errors</label>' +
      '<span class="ap-grow"></span><button type="button" class="ap-ib" data-act="csv" title="Export CSV" aria-label="Export usage as CSV">' + ic('download') + '</button>' +
      '<button type="button" class="ap-ib" data-act="reset" title="Reset usage" aria-label="Reset usage">' + ic('trash') + '</button></div>';
    html += '<div class="ap-card ap-days"><div class="ap-card-head"><h3>' + ic('chart') + esc(mon) + '</h3><strong>' + usd(total) + '</strong></div><div class="ap-daybars" role="img" aria-label="Spend per day, ' + esc(mon) + ', total ' + usd(total) + '">' +
      perDay.map(function (v, i) { return '<i style="height:' + (v ? Math.max(4, v / max * 100) : 0) + '%" title="' + esc(mon + '-' + String(i + 1).padStart(2, '0') + ': ' + usd4(v)) + '"></i>'; }).join('') + '</div></div>';
    html += '<h2 class="ap-h">By model</h2>' + (rows.length ? '<div class="ap-table" role="table" aria-label="Usage by model"><div role="row" class="ap-th"><span role="columnheader">Model</span><span role="columnheader">Calls</span><span role="columnheader">Tokens</span><span role="columnheader">Cost</span></div>' +
      rows.map(function (k) { var b = byModel[k]; return '<div role="row"><span role="cell" title="' + esc(k) + '">' + esc(k) + '</span><span role="cell">' + b.calls + '</span><span role="cell">' + (b.inT || b.outT ? b.inT + '→' + b.outT : '—') + '</span><span role="cell">' + (b.cost ? usd4(b.cost) + (b.est ? ' ≈' : '') : M.PROVIDERS[b.prov].paid ? '$0' : 'free') + '</span></div>'; }).join('') + '</div>' : '<p class="ap-empty">' + ic('chart') + 'No calls yet.</p>');
    html += '<h2 class="ap-h">Recent calls <span class="ap-count">' + shown.length + '</span></h2>' + (shown.length ? '<div class="ap-log" role="table" aria-label="Recent API calls">' + shown.slice(0, 80).map(function (e) {
      var u = e.usage || {}, units = [u.inputTokens && u.inputTokens + ' in', u.outputTokens && u.outputTokens + ' out', u.audioOutTokens && u.audioOutTokens + ' audio', u.audioInTokens && u.audioInTokens + ' audio in', u.chars && u.chars + ' chars'].filter(Boolean).join(' · ');
      return '<div role="row" class="' + (e.ok ? '' : 'err') + '"><span role="cell">' + time(e.t) + '</span><span role="cell">' + APP_ICON[e.app] + ' ' + esc(e.op) + '</span><span role="cell" title="' + esc(e.model) + '">' + esc(e.model || M.PROVIDERS[e.provider].name) + (e.via ? ' <small>· ' + esc(e.via) + '</small>' : '') + '</span><span role="cell">' + esc(e.ok ? units : e.error) + '</span><span role="cell">' + (e.cost ? usd4(e.cost) + (e.est ? ' ≈' : '') : '—') + '</span></div>';
    }).join('') + '</div>' : '');
    return html;
  }

  function keyCard(p, s, extra) {
    var P = M.PROVIDERS[p], off = !!s.kill.providers[p], has = M.keys.has(p), open = ui.keyOpen === p || (p === 'openrouter' && !has);
    var desc = { openrouter: 'Every model · exact cost per call', gemini: 'Optional · voice direct', anthropic: 'Optional · Claude direct' }[p];
    var link = { openrouter: 'https://openrouter.ai/settings/keys', gemini: 'https://aistudio.google.com/apikey', anthropic: 'https://console.anthropic.com/settings/keys' }[p];
    var cost = Object.keys(s.totals).reduce(function (n, a) { return n + (((s.totals[a] || {})[p] || {}).cost || 0); }, 0);
    var html = '<div class="ap-card ap-key' + (p === 'openrouter' ? ' main' : '') + (off ? ' off' : '') + '" data-provider="' + p + '"><div class="ap-key-top">' +
      '<span class="ap-kic">' + ic(p === 'openrouter' ? 'route' : p === 'gemini' ? 'spark' : 'cpu') + '</span>' +
      '<div class="ap-key-main"><strong>' + esc(P.name) + '</strong><small>' + desc + ' · ' + usd(cost) + ' this month</small></div>' +
      '<span class="ap-dot' + (has ? ' on' : '') + '" title="' + (has ? 'Key set' + (M.keys.remembered(p) ? ', remembered on this device' : ', this tab only') : 'No key') + '"></span>' +
      '<button type="button" class="ap-ib" data-key="' + p + '" aria-expanded="' + open + '" title="' + (has ? 'Change key' : 'Add key') + '" aria-label="' + esc(P.name) + (has ? ': change key' : ': add key') + '">' + ic('key') + '</button>' +
      sw('prov:' + p, !off, P.name) + '</div>';
    if (open) {
      html += '<form class="ap-keyform" data-keyform="' + p + '"><input type="password" name="k" autocomplete="off" spellcheck="false" placeholder="' + (has ? '•••••••• (set)' : p === 'openrouter' ? 'sk-or-…' : 'Paste key') + '" aria-label="' + esc(P.name) + ' API key">' +
        '<label class="ap-check" title="Keep on this device"><input type="checkbox" name="r"' + (M.keys.remembered(p) ? ' checked' : '') + '>Remember</label>' +
        '<button type="submit" class="ap-btn dark">Save</button>' + (has ? '<button type="button" class="ap-btn" data-clear="' + p + '">Remove</button>' : '') +
        '<a class="ap-link" href="' + link + '" target="_blank" rel="noopener">Get a key' + ic('ext') + '</a></form>';
    }
    return html + (extra || '') + '</div>';
  }
  function keysSec(s) {
    var a = data.account, acc = '';
    if (M.keys.has('openrouter')) {
      if (!a && !data.accLoading && !data.accErr) setTimeout(function () { loadAccount(false); }, 0);
      acc = '<div class="ap-acct">' + (a ? '<span>' + ic('check') + esc(a.label || 'Key valid') + '</span><span>' + (a.limit == null ? 'No credit limit' : usd(a.remaining) + ' of ' + usd(a.limit) + ' left' + (a.reset ? ' · resets ' + esc(a.reset) : '')) + '</span><span>' + usd(a.daily) + ' today · ' + usd(a.monthly) + ' this month</span>' + (a.free ? '<span>Free tier</span>' : '') + (a.limit == null ? '<span class="ap-warn">' + ic('shield') + 'Set a credit limit on this key at OpenRouter</span>' : '')
        : data.accErr ? '<span class="ap-err">' + esc(data.accErr) + '</span>' : '<span class="ap-muted">Checking key…</span>') +
        '<button type="button" class="ap-ib" data-act="account" title="Check key" aria-label="Check OpenRouter key">' + ic('refresh') + '</button></div>';
    }
    var html = keyCard('openrouter', s, acc) + keyCard('gemini', s) + keyCard('anthropic', s);
    html += '<h2 class="ap-h">Free browser APIs</h2><div class="ap-list">' + ['browser-speech', 'browser-tts'].map(function (p) {
      var off = !!s.kill.providers[p], c = Object.keys(s.totals).reduce(function (n, a2) { return n + (((s.totals[a2] || {})[p] || {}).calls || 0); }, 0);
      return '<div class="ap-li' + (off ? ' off' : '') + '"><span class="ap-kic sm">' + ic(p === 'browser-tts' ? 'speaker' : 'mic') + '</span><strong>' + esc(M.PROVIDERS[p].name) + '</strong><span class="ap-muted">' + plural(c, 'call') + '</span>' + sw('prov:' + p, !off, M.PROVIDERS[p].name) + '</div>';
    }).join('') + '</div>';
    html += '<p class="ap-note">' + ic('lock') + 'Keys stay in this browser: this tab only, unless “Remember” is ticked. They are sent only to their own provider.</p>';
    return html;
  }

  /* ---------- shell ---------- */
  function draw() {
    if (root.hidden) return;
    var s = M.state(), fa = document.activeElement, keepF = fa && root.contains(fa) ? fa.getAttribute('data-f') || fa.getAttribute('data-sec-link') : null;
    var selStart = fa && keepF && fa.selectionStart != null ? fa.selectionStart : null;
    var body = { overview: overview, models: models, playground: playground, voice: voice, usage: usage, keys: keysSec }[ui.sec](s);
    var title = SECTIONS.filter(function (x) { return x[0] === ui.sec; })[0];
    root.innerHTML =
      '<div class="ap-top"><a class="ap-back" href="#" aria-label="Back to the demos">' + ic('back') + '<span>Demos</span></a>' +
      '<h1 id="ap-title" tabindex="-1">API</h1><span class="ap-month">' + esc(s.month) + ' · ' + usd(s.spent) + '</span><span class="ap-grow"></span>' +
      '<button type="button" class="ap-master' + (s.kill.global ? ' off' : '') + '" data-sw="global" role="switch" aria-checked="' + !s.kill.global + '" aria-label="All APIs" title="Killswitch: all APIs">' + ic('power') + '<span>' + (s.kill.global ? 'All off' : 'Live') + '</span></button></div>' +
      '<div class="ap-shell"><nav class="ap-nav" aria-label="API sections">' + SECTIONS.map(function (x) { return '<a href="#api' + (x[0] === 'overview' ? '' : '/' + x[0]) + '" data-sec-link="' + x[0] + '"' + (ui.sec === x[0] ? ' aria-current="page"' : '') + '>' + ic(x[1]) + '<span>' + x[2] + '</span></a>'; }).join('') + '</nav>' +
      '<div class="ap-body"><h2 class="ap-sec-title" id="ap-sec-title" tabindex="-1">' + ic(title[1]) + title[2] + '</h2>' + body + '</div></div>';
    if (keepF) { var el = root.querySelector('[data-f="' + keepF + '"], [data-sec-link="' + keepF + '"]'); if (el) { el.focus(); if (selStart != null && el.setSelectionRange) try { el.setSelectionRange(selStart, selStart); } catch (e) {} } }
    updateBadge(s);
  }
  function updateBadge(s) {
    if (!btn) return;
    s = s || M.state();
    btn.classList.toggle('killed', !!s.kill.global);
    var sp = btn.querySelector('.api-spend'); if (sp) sp.textContent = usd(s.spent);
  }

  /* ---------- model picker (dialog) ---------- */
  var picker = { open: false, target: null, q: '', f: { json: true }, sort: 'smart', limit: 60 };
  var dlg = document.createElement('dialog');
  dlg.className = 'ap-dlg'; dlg.setAttribute('aria-labelledby', 'ap-dlg-title');
  document.body.appendChild(dlg);
  var FILTERS = [['json', 'braces', 'JSON'], ['vision', 'eye', 'Images'], ['file', 'file', 'Files'], ['audio', 'audio', 'Audio'], ['tools', 'tool', 'Tools'], ['free', 'check', 'Free']];
  function targetLabel(t) {
    if (t === 'default' || t === 'browse') return 'Default for all apps';
    if (/^app:/.test(t)) return M.APPS[t.slice(4)];
    if (/^fb:/.test(t)) return 'Fallback ' + (Number(t.slice(3)) + 1);
    return 'Playground';
  }
  function targetCurrent(t) {
    if (t === 'default' || t === 'browse') return M.llm().model;
    if (/^app:/.test(t)) return M.llmOverride(t.slice(4)) ? M.llm(t.slice(4)).model : '';
    if (/^fb:/.test(t)) return M.route().fallbacks[Number(t.slice(3))] || '';
    return pg.slots[Number(t.slice(3))] || '';
  }
  function openPicker(t) {
    picker.target = t; picker.q = ''; picker.limit = 60; picker.f = { json: !/^pg:/.test(t) };
    if (!data.text.length && !data.loading.text) loadModels('text');
    drawPicker(); picker.open = true;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    var q = dlg.querySelector('[data-pq]'); if (q) q.focus();
  }
  function closePicker() { picker.open = false; if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  function pickerList() {
    var q = picker.q.toLowerCase().trim(), f = picker.f;
    var list = data.text.filter(function (m) {
      if (m.id === AUTO) return false;
      if (q && (m.id + ' ' + m.name).toLowerCase().indexOf(q) < 0) return false;
      return Object.keys(f).every(function (k) { return !f[k] || m[k]; });
    });
    var cmp = {
      smart: function (a, b) { return (b.intel == null ? -1 : b.intel) - (a.intel == null ? -1 : a.intel) || blended(a) - blended(b); },
      price: function (a, b) { return blended(a) - blended(b); },
      'price-desc': function (a, b) { return (blended(b) === Infinity ? -1 : blended(b)) - (blended(a) === Infinity ? -1 : blended(a)); },
      context: function (a, b) { return b.context - a.context; },
      newest: function (a, b) { return b.created - a.created; },
      name: function (a, b) { return a.name < b.name ? -1 : 1; }
    }[picker.sort];
    return list.sort(cmp);
  }
  function drawPicker() {
    var cur = targetCurrent(picker.target), list = pickerList(), shown = list.slice(0, picker.limit);
    var auto = !/^fb:/.test(picker.target) && (!picker.q || 'auto router openrouter/auto'.indexOf(picker.q.toLowerCase()) >= 0);
    var active = document.activeElement && dlg.contains(document.activeElement) ? document.activeElement.getAttribute('data-pq') != null ? 'q' : null : null;
    var row = function (m) {
      var on = m.id === cur;
      return '<button type="button" class="ap-mrow' + (on ? ' on' : '') + '" data-choose="' + esc(m.id) + '" aria-pressed="' + on + '">' +
        '<span class="ap-mname"><strong>' + esc(shortName(m.id)) + '</strong><small>' + esc(m.id) + '</small></span>' +
        '<span class="ap-mprice">' + (m.input == null ? 'varies' : per(m.input) + ' / ' + per(m.output)) + '</span>' +
        '<span class="ap-mctx">' + ctx(m.context) + '</span>' + caps(m) +
        '<span class="ap-mintel" title="Intelligence index (Artificial Analysis)">' + (m.intel != null ? ic('spark') + Math.round(m.intel) : '') + '</span>' + (on ? ic('check', 'ap-mcheck') : '') + '</button>';
    };
    dlg.innerHTML = '<div class="ap-dlg-head"><div><h2 id="ap-dlg-title">' + ic('search') + 'Choose a model</h2><small>' + esc(targetLabel(picker.target)) + '</small></div>' +
      '<button type="button" class="ap-ib" data-pclose aria-label="Close">' + ic('close') + '</button></div>' +
      '<div class="ap-dlg-tools"><input type="search" data-pq value="' + esc(picker.q) + '" placeholder="Search ' + (data.text.length || '') + ' models: claude, gemini, llama…" aria-label="Search models">' +
      '<select data-psort aria-label="Sort">' + [['smart', 'Smartest'], ['price', 'Cheapest'], ['price-desc', 'Priciest'], ['context', 'Longest context'], ['newest', 'Newest'], ['name', 'Name']].map(function (o) { return opt(o[0], o[1], picker.sort); }).join('') + '</select>' +
      '<button type="button" class="ap-ib" data-prefresh title="Refresh list" aria-label="Refresh model list">' + ic('refresh') + '</button></div>' +
      '<div class="ap-dlg-filters" role="group" aria-label="Filters">' + FILTERS.map(function (x) { return '<button type="button" class="ap-filter" data-pf="' + x[0] + '" aria-pressed="' + !!picker.f[x[0]] + '">' + ic(x[1]) + x[2] + '</button>'; }).join('') + '<span class="ap-muted">' + list.length + '</span></div>' +
      '<div class="ap-mlist">' +
      (auto ? '<button type="button" class="ap-mrow' + (cur === AUTO ? ' on' : '') + '" data-choose="' + AUTO + '" aria-pressed="' + (cur === AUTO) + '"><span class="ap-mname"><strong>' + ic('layers') + 'Auto router</strong><small>' + AUTO + ' · picks a model per request</small></span><span class="ap-mprice">varies</span><span class="ap-mctx"></span><span class="ap-caps"></span><span class="ap-mintel"></span>' + (cur === AUTO ? ic('check', 'ap-mcheck') : '') + '</button>' : '') +
      (data.loading.text && !data.text.length ? '<p class="ap-empty">Loading models…</p>' : data.error.text && !data.text.length ? '<p class="ap-err">' + esc(data.error.text) + '</p><form class="ap-manual" data-manual><input name="id" placeholder="provider/model" aria-label="Model id"><button type="submit" class="ap-btn dark">Use</button></form>' : '') +
      shown.map(row).join('') +
      (list.length > shown.length ? '<button type="button" class="ap-more" data-pmore>Show more (' + (list.length - shown.length) + ')</button>' : '') +
      (!list.length && data.text.length ? '<p class="ap-empty">No model matches.</p>' : '') + '</div>';
    if (active === 'q') { var q = dlg.querySelector('[data-pq]'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }
  function choose(id) {
    var t = picker.target;
    if (t === 'default' || t === 'browse') M.setLlm('openrouter', id);
    else if (/^app:/.test(t)) M.setLlm('openrouter', id, t.slice(4));
    else if (/^fb:/.test(t)) { var fb = M.route().fallbacks.slice(); fb[Number(t.slice(3))] = id; M.setRoute({ fallbacks: fb.filter(Boolean) }); }
    else { pg.slots[Number(t.slice(3))] = id; pg.out = {}; keep(); }
    closePicker(); draw();
  }
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) return closePicker();
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-pclose')) closePicker();
    else if (b.dataset.choose) choose(b.dataset.choose);
    else if (b.dataset.pf) { picker.f[b.dataset.pf] = !picker.f[b.dataset.pf]; picker.limit = 60; drawPicker(); }
    else if (b.hasAttribute('data-pmore')) { picker.limit += 60; drawPicker(); }
    else if (b.hasAttribute('data-prefresh')) loadModels('text', true);
  });
  dlg.addEventListener('input', function (e) { if (e.target.hasAttribute('data-pq')) { picker.q = e.target.value; picker.limit = 60; clearTimeout(picker.t); picker.t = setTimeout(drawPicker, 120); } });
  dlg.addEventListener('change', function (e) { if (e.target.hasAttribute('data-psort')) { picker.sort = e.target.value; drawPicker(); } });
  dlg.addEventListener('submit', function (e) { var f = e.target.closest('[data-manual]'); if (!f) return; e.preventDefault(); var id = f.id.value.trim(); if (id) choose(id); });
  dlg.addEventListener('close', function () { picker.open = false; });

  /* ---------- actions ---------- */
  function fail(where, err) { vs.busy = ''; vs.recording = false; vs.listening = false; vs.out[where] = { error: (window.LiveAI && LiveAI.describe ? LiveAI.describe(err) : '') || (err && err.message) || String(err) }; draw(); }
  function lastCost() { var l = M.state().log[0]; return l ? { cost: l.cost, est: !!l.est } : {}; }

  function runPlayground() {
    var gate = M.check(APP, 'openrouter'); if (!gate.ok) return;
    pg.busy = true; pg.out = {};
    pg.slots.forEach(function (id, i) { pg.out[i] = { busy: true }; });
    draw();
    Promise.all(pg.slots.map(function (id, i) {
      var t0 = Date.now();
      return M.openrouter.chat({ app: APP, model: id, messages: [{ role: 'user', content: pg.prompt }], maxTokens: pg.json ? 600 : 400, jsonSchema: pg.json ? PG_SCHEMA : null, fallbacks: [] }).then(function (r) {
        var entry = M.state().log.filter(function (e) { return e.provider === 'openrouter' && e.app === APP; })[0] || {};
        var text = r.text, okJson = null;
        if (pg.json) { try { var d = JSON.parse(String(text).trim().replace(/^```(?:json)?\s*|\s*```$/g, '')); okJson = typeof d.answer === 'string' && typeof d.confidence === 'number'; text = JSON.stringify(d, null, 2); } catch (e) { okJson = false; } }
        pg.out[i] = { text: text, model: r.model, provider: r.provider, usage: r.usage, ms: Date.now() - t0, cost: r.usage.costUSD != null ? r.usage.costUSD : entry.cost, est: r.usage.costUSD == null, json: okJson };
      }, function (err) { pg.out[i] = { error: describe(err) }; });
    })).then(function () { pg.busy = false; draw(); });
  }
  function describe(err) {
    if (!err) return 'Something went wrong.';
    if (err.name === 'ApiMeterBlocked') return 'Paused: ' + err.message + '.';
    if (err.status === 401) return 'The OpenRouter key was rejected.';
    if (err.status === 402) return 'OpenRouter credits are exhausted for this key.';
    if (err.status === 429) return 'Rate limited. Wait a moment and try again.';
    if (err.status) return 'OpenRouter ' + err.status + ': ' + err.message;
    return err.message || String(err);
  }

  var recorder = null, recTimer = null, recognition = null;
  function speak() {
    var text = vs.text || sample(), lang = (LANGS.filter(function (l) { return l[0] === vs.lang; })[0] || LANGS[0])[1], t0 = Date.now();
    if (vs.tts === 'device') {
      var g3 = M.check(APP, 'browser-tts'); if (!g3.ok) return fail('tts', M.Blocked(g3.reason));
      if (!window.speechSynthesis) return fail('tts', new Error('This browser has no speech synthesis.'));
      var dv = deviceVoices(), v = dv.filter(function (x) { return x.name === vs.dvoice; })[0] || dv[0];
      var u = new SpeechSynthesisUtterance(text); u.lang = vs.lang; u.rate = vs.rate; if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
      M.record({ app: APP, provider: 'browser-tts', op: 'speak', model: v ? v.name : '', usage: { chars: text.length } });
      vs.out.tts = { usage: { chars: text.length }, cost: 0 }; draw(); return;
    }
    vs.busy = 'tts'; draw();
    var p = vs.tts === 'openrouter'
      ? M.openrouter.speech({ app: APP, model: vs.orTts, voice: vs.orVoice || ((info(vs.orTts) || {}).voices || [])[0], text: text, instructions: 'Speak naturally, in ' + lang + '.' })
      : M.gemini.tts({ app: APP, voice: vs.gvoice, text: 'Say naturally, in ' + lang + ': ' + text });
    p.then(function (r) {
      vs.busy = ''; var c = lastCost();
      vs.out.tts = { url: URL.createObjectURL(r.blob), ms: Date.now() - t0, usage: r.usage, cost: c.cost, est: c.est }; draw();
      setTimeout(function () { var a = root.querySelector('.ap-audio'); if (a && a.play) a.play().catch(function () {}); }, 0);
    }, function (err) { fail('tts', err); });
  }
  function listen() {
    if (vs.stt === 'browser') {
      if (vs.listening) { if (recognition) recognition.stop(); return; }
      var g2 = M.check(APP, 'browser-speech'); if (!g2.ok) return fail('stt', M.Blocked(g2.reason));
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
      recognition = new SR(); recognition.lang = vs.lang; recognition.interimResults = true; recognition.continuous = false;
      var started = Date.now(); vs.out.stt = { text: '', interim: '' };
      recognition.onresult = function (e) {
        var interim = '', fin = '';
        for (var i = 0; i < e.results.length; i++) { if (e.results[i].isFinal) fin += e.results[i][0].transcript; else interim += e.results[i][0].transcript; }
        vs.out.stt = { text: fin, interim: interim }; draw();
      };
      recognition.onerror = function (e) { vs.out.stt = { error: 'Speech recognition: ' + (e.error || 'error') }; };
      recognition.onend = function () {
        vs.listening = false;
        var secs = (Date.now() - started) / 1000, prev = vs.out.stt || {};
        M.record({ app: APP, provider: 'browser-speech', op: 'listen', usage: { seconds: secs }, ok: !prev.error, error: prev.error });
        vs.out.stt = prev.error ? prev : { text: prev.text || prev.interim || '', usage: { seconds: secs }, cost: 0 };
        draw();
      };
      try { recognition.start(); vs.listening = true; draw(); } catch (err) { fail('stt', err); }
      return;
    }
    if (vs.recording) { if (recorder && recorder.state !== 'inactive') recorder.stop(); return; }
    var g = M.check(APP, vs.stt); if (!g.ok) return fail('stt', M.Blocked(g.reason));
    if (!navigator.mediaDevices || !window.MediaRecorder) return fail('stt', new Error('This browser cannot record audio.'));
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var chunks = [], started = Date.now();
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = function () {
        clearTimeout(recTimer); stream.getTracks().forEach(function (t) { t.stop(); });
        vs.recording = false; vs.busy = 'stt'; draw();
        var blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }), secs = (Date.now() - started) / 1000, t0 = Date.now();
        var p = vs.stt === 'openrouter' ? M.openrouter.transcribe({ app: APP, model: vs.orStt, blob: blob, lang: vs.lang, seconds: secs }) : M.gemini.transcribe({ app: APP, blob: blob, lang: vs.lang, seconds: secs });
        p.then(function (r) { vs.busy = ''; var c = lastCost(); vs.out.stt = { text: r.text, ms: Date.now() - t0, usage: r.usage, cost: c.cost, est: c.est }; draw(); }, function (err) { fail('stt', err); });
      };
      recorder.start(); vs.recording = true; draw();
      recTimer = setTimeout(function () { if (recorder.state !== 'inactive') recorder.stop(); }, 8000);
    }, function () { fail('stt', new Error('Microphone permission was denied.')); });
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var d = b.dataset;
    if (d.sw) {
      var on = b.getAttribute('aria-checked') !== 'true', id = d.sw;
      if (id === 'global') M.setKill('global', null, !on);
      else if (/^route:/.test(id)) { var patch = {}; patch[id.slice(6)] = on; M.setRoute(patch); }
      else { var parts = id.split(':'); M.setKill(parts[0] === 'app' ? 'apps' : 'providers', parts[1], !on); }
    }
    else if (d.pick) openPicker(d.pick === 'browse' ? 'browse' : d.pick);
    else if (d.preset) { M.setLlm('openrouter', d.preset); }
    else if (d.engine) { var cur = M.llm(); M.setLlm(d.engine, d.engine === 'openrouter' ? (cur.provider === 'openrouter' && cur.model ? cur.model : AUTO) : M.CLAUDE); }
    else if (d.resetApp) M.clearLlm(d.resetApp);
    else if (d.sort != null && b.getAttribute('role') === 'radio') M.setRoute({ sort: d.sort });
    else if (d.fbRm) { var fb = M.route().fallbacks.slice(); fb.splice(Number(d.fbRm), 1); M.setRoute({ fallbacks: fb }); }
    else if (d.slotRm) { pg.slots.splice(Number(d.slotRm), 1); pg.out = {}; keep(); draw(); }
    else if (d.run === 'pg') runPlayground();
    else if (d.run === 'tts') speak();
    else if (d.run === 'stt') listen();
    else if (d.tts) { vs.tts = d.tts; vs.out.tts = null; keep(); draw(); }
    else if (d.stt) { vs.stt = d.stt; vs.out.stt = null; keep(); draw(); }
    else if (d.useVoice === 'tts') M.setVoice('tts', vs.tts === 'openrouter' ? { provider: 'openrouter', model: vs.orTts, voice: vs.orVoice || ((info(vs.orTts) || {}).voices || [])[0] || '' } : { provider: 'gemini', voice: vs.gvoice });
    else if (d.useVoice === 'stt') M.setVoice('stt', vs.stt === 'openrouter' ? { provider: 'openrouter', model: vs.orStt } : { provider: 'gemini' });
    else if (d.key) { ui.keyOpen = ui.keyOpen === d.key ? null : d.key; draw(); var k = root.querySelector('[data-keyform="' + d.key + '"] input[name=k]'); if (k) k.focus(); }
    else if (d.clear) { M.keys.clear(d.clear); if (d.clear === 'openrouter') { data.account = null; data.accErr = ''; } }
    else if (d.act === 'account') loadAccount(true);
    else if (d.act === 'reset') { if (confirm('Reset all recorded usage in this browser?')) M.resetUsage(); }
    else if (d.act === 'csv') {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([M.exportCsv()], { type: 'text/csv' }));
      a.download = 'api-usage-' + M.month() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    }
  });
  root.addEventListener('input', function (e) {
    var f = e.target.dataset.f; if (!f) return;
    if (f === 'pgPrompt') { pg.prompt = e.target.value; keep(); }
    else if (f === 'vText') { vs.text = e.target.value; keep(); }
    else if (f === 'orVoice' && e.target.tagName === 'INPUT') { vs.orVoice = e.target.value.trim(); keep(); }
    else if (f === 'rate') { vs.rate = Number(e.target.value); var lab = e.target.parentNode.querySelector('span'); if (lab) lab.lastChild.textContent = 'Speed ' + vs.rate.toFixed(2); keep(); }
  });
  root.addEventListener('change', function (e) {
    var el = e.target, f = el.dataset.f;
    if (el.dataset.budget) return M.setBudget(el.dataset.budget === 'global' ? 'global' : 'apps', el.dataset.budget, el.value);
    if (!f || f === 'pgPrompt' || f === 'vText' || f === 'rate') return; // typed fields: no re-render, or a click on Run right after typing is lost
    if (f === 'pgJson') pg.json = el.checked;
    else if (f === 'vLang' || f === 'vLang2') { vs.lang = el.value; vs.text = ''; vs.dvoice = ''; }
    else if (f === 'gvoice') vs.gvoice = el.value;
    else if (f === 'orTts') { vs.orTts = el.value; vs.orVoice = ''; }
    else if (f === 'orVoice') vs.orVoice = el.value;
    else if (f === 'orStt') vs.orStt = el.value;
    else if (f === 'dvoice') vs.dvoice = el.value;
    else if (f === 'gTtsModel') M.setModel('tts', el.value.trim());
    else if (f === 'gSttModel') M.setModel('transcribe', el.value.trim());
    else if (f === 'uApp') ui.uApp = el.value;
    else if (f === 'uProv') ui.uProv = el.value;
    else if (f === 'uErr') ui.uErr = el.checked;
    keep(); draw();
  });
  root.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-keyform]'); if (!f) return;
    e.preventDefault();
    var p = f.dataset.keyform;
    try { M.keys.set(p, f.k.value, f.r.checked); ui.keyOpen = null; if (p === 'openrouter') { data.account = null; data.accErr = ''; loadAccount(true); } draw(); }
    catch (err) { f.k.setCustomValidity(err.message); f.k.reportValidity(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || root.hidden || picker.open || dlg.open) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
    location.hash = '';
  });

  /* ---------- routing ---------- */
  var wasOpen = false;
  function route() {
    var m = /^#api(?:\/([a-z]+))?$/.exec(location.hash), on = !!m;
    var sec = on && SECTIONS.some(function (x) { return x[0] === m[1]; }) ? m[1] : 'overview', changed = sec !== ui.sec;
    root.hidden = !on;
    document.body.classList.toggle('ap-open', on);
    if (btn) { if (on) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current'); }
    if (!on) { if (picker.open) closePicker(); if (wasOpen && btn) btn.focus(); wasOpen = false; return; }
    ui.sec = sec;
    autoLoad('text');
    if ((sec === 'overview' || sec === 'keys') && M.keys.has('openrouter') && !data.account && !data.accErr) loadAccount(false);
    draw();
    if (!wasOpen || changed) { window.scrollTo(0, 0); var h = root.querySelector(wasOpen ? '#ap-sec-title' : '#ap-title'); if (h) h.focus({ preventScroll: true }); }
    wasOpen = true;
  }
  M.onChange(function () {
    if (!orOff()) ['text', 'speech', 'transcription'].forEach(function (k) { if (data.error[k] === 'OpenRouter is switched off') data.error[k] = ''; }); if (!root.hidden && !pg.busy && !vs.recording && !vs.listening && !vs.busy) draw(); else updateBadge(); });
  window.addEventListener('hashchange', route);
  window.ApiPage = { refresh: draw, voiceScore: voiceScore, presets: presets };
  updateBadge(); route();
})();
