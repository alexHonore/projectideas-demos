/* Hub API test bench (inside index.html#api): pick an API, choose its model, voice and language,
 * run it, and see the result with its measured usage and cost. Every run goes through ApiMeter under
 * the "hub" app, so killswitches and budgets apply and the call shows in the monitor. */
(function () {
  'use strict';
  var M = window.ApiMeter, root = document.getElementById('am-bench');
  if (!M || !root) return;
  var APP = 'hub';

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
  var TABS = [
    ['claude', '✳︎', 'Claude', 'anthropic'],
    ['openrouter', '◎', 'OpenRouter', 'openrouter'],
    ['voice', '✦', 'AI voice', 'gemini'],
    ['transcribe', '✦', 'Transcribe', 'gemini'],
    ['listen', '🎤', 'Listen', 'browser-speech'],
    ['device', '🔊', 'Device voice', 'browser-tts']
  ];
  var st = { tab: 'claude', lang: 'en-CA', gvoice: 'Kore', dvoice: '', rate: 1, orModel: '', orFilter: '', busy: false, out: {} };
  var orList = [], orLoading = false, orError = '';
  try { Object.assign(st, JSON.parse(sessionStorage.getItem('project-demos:api-bench') || '{}'), { busy: false, out: {} }); } catch (e) {}
  function keep() { try { sessionStorage.setItem('project-demos:api-bench', JSON.stringify({ tab: st.tab, lang: st.lang, gvoice: st.gvoice, dvoice: st.dvoice, rate: st.rate, orModel: st.orModel, orFilter: st.orFilter })); } catch (e) {} }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function usd(v) { return v > 0 && v < 0.0001 ? '<$0.0001' : '$' + v.toFixed(4); }
  function sample(l) { return (LANGS.filter(function (x) { return x[0] === l; })[0] || LANGS[0])[2]; }
  function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function langSelect() { return '<label class="ab-field"><span>Language</span><select data-f="lang">' + LANGS.map(function (l) { return opt(l[0], l[1], st.lang); }).join('') + '</select></label>'; }

  // Device voices, most natural first.
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
    var all = (window.speechSynthesis && speechSynthesis.getVoices()) || [], base = st.lang.split('-')[0];
    return all.filter(function (v) { return (v.lang || '').replace('_', '-').split('-')[0] === base; })
      .sort(function (a, b) { return voiceScore(b, st.lang) - voiceScore(a, st.lang); });
  }
  if (window.speechSynthesis && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', function () { if (st.tab === 'device') draw(); });

  function gate(provider) { var g = M.check(APP, provider); return g.ok ? '' : '<p class="ab-paused" role="status">⏸ ' + esc(g.reason) + (/key/.test(g.reason) ? ' — add it with the key button above.' : '') + '</p>'; }
  function meta(o) {
    if (!o) return '';
    if (o.error) return '<p class="ab-err" role="alert">' + esc(o.error) + '</p>';
    var u = o.usage || {}, bits = [];
    if (o.ms != null) bits.push((o.ms / 1000).toFixed(1) + ' s');
    if (u.inputTokens) bits.push(u.inputTokens + ' in');
    if (u.outputTokens) bits.push(u.outputTokens + ' out');
    if (u.audioOutTokens) bits.push(u.audioOutTokens + ' audio tokens');
    if (u.audioInTokens) bits.push(u.audioInTokens + ' audio-in tokens');
    if (u.chars) bits.push(u.chars + ' chars');
    if (u.seconds) bits.push(u.seconds.toFixed(1) + ' s audio');
    if (o.cost != null) bits.push(o.cost ? usd(o.cost) : 'free');
    return '<p class="ab-meta">' + esc(bits.join(' · ')) + '</p>';
  }
  function estimate(kind, text) {
    if (kind === 'voice') { var secs = Math.max(1, (text || '').length / 14); return M.costOf(M.model('tts'), { inputTokens: Math.ceil((text || '').length / 4) + 10, audioOutTokens: Math.ceil(secs * 25) }); }
    if (kind === 'transcribe') return M.costOf(M.model('transcribe'), { audioInTokens: 8 * 32, inputTokens: 40, outputTokens: 40 });
    if (kind === 'claude') return M.costOf('claude-opus-5-5', { inputTokens: 40, outputTokens: 60 });
    return 0;
  }

  function loadModels(refresh) {
    if (orLoading) return; orLoading = true; orError = '';
    M.openrouter.models({ refresh: !!refresh }).then(function (list) {
      orList = list; orLoading = false;
      if (!st.orModel && list.length) { var pick = list.filter(function (m) { return /claude|gemini|gpt/i.test(m.id) && m.input > 0; })[0] || list[0]; st.orModel = pick.id; keep(); }
      draw();
    }, function (err) { orLoading = false; orError = err.message; draw(); });
  }
  function orInfo(id) { return orList.filter(function (m) { return m.id === id; })[0]; }
  function k(n) { return n >= 1000 ? Math.round(n / 1000) + 'k' : String(n); }

  function panelHtml() {
    var o = st.out[st.tab], busy = st.busy;
    var run = function (label, extra) { return '<button type="button" class="ab-run" data-run="' + st.tab + '"' + (busy ? ' disabled' : '') + '>' + (busy ? '…' : label) + (extra ? '<small>' + extra + '</small>' : '') + '</button>'; };
    if (st.tab === 'claude') {
      return gate('anthropic') + '<label class="ab-field wide"><span>Prompt</span><input data-f="prompt" value="' + esc(st.prompt || 'Say hello in five words.') + '"></label>' +
        '<div class="ab-row"><span class="ab-chip">claude-opus-5-5</span>' + run('▶ Run', '≈ ' + usd(estimate('claude'))) + '</div>' +
        (o && o.text ? '<blockquote class="ab-out">' + esc(o.text) + '</blockquote>' : '') + meta(o);
    }
    if (st.tab === 'openrouter') {
      if (!orList.length && !orLoading && !orError) setTimeout(function () { loadModels(false); }, 0);
      var f = (st.orFilter || '').toLowerCase(), shown = orList.filter(function (m) { return !f || (m.id + ' ' + m.name).toLowerCase().indexOf(f) >= 0; }).slice(0, 300);
      if (st.orModel && !shown.some(function (m) { return m.id === st.orModel; })) shown.unshift(orInfo(st.orModel) || { id: st.orModel, name: st.orModel, input: 0, output: 0, context: 0 });
      var info = orInfo(st.orModel), eng = M.llm(), inUse = eng.provider === 'openrouter' && eng.model === st.orModel;
      var est = info ? M.costOf(st.orModel, { inputTokens: 40, outputTokens: 60 }) : null;
      return gate('openrouter') + '<div class="ab-grid">' +
        '<label class="ab-field"><span>Search ' + (orLoading ? '…' : orList.length ? orList.length + ' models' : '') + '</span><input data-f="orFilter" value="' + esc(st.orFilter) + '" placeholder="claude, gemini, llama…"></label>' +
        '<label class="ab-field span2"><span>Model</span><select data-f="orModel">' + (shown.length ? shown.map(function (m) { return opt(m.id, m.id + (m.input || m.output ? ' · $' + m.input + ' / $' + m.output : '') + (m.context ? ' · ' + k(m.context) : ''), st.orModel); }).join('') : '<option value="">' + (orLoading ? 'Loading models…' : 'No models') + '</option>') + '</select></label></div>' +
        (orError ? '<p class="ab-err">' + esc(orError) + ' — type a model id instead: <input data-f="orModelId" value="' + esc(st.orModel) + '" placeholder="provider/model"></p>' : '') +
        (info ? '<p class="ab-modelinfo">$' + info.input + ' in · $' + info.output + ' out per 1M tokens · ' + k(info.context) + ' context' + (info.json ? ' · structured output' : '') + '</p>' : '') +
        '<label class="ab-field wide"><span>Prompt</span><input data-f="prompt" value="' + esc(st.prompt || 'Say hello in five words.') + '"></label>' +
        '<div class="ab-row">' + run('▶ Run', est != null ? '≈ ' + usd(est) : '') +
        '<button type="button" class="ab-use" data-use="' + esc(st.orModel) + '"' + (st.orModel && !inUse ? '' : ' disabled') + '>' + (inUse ? '✓ Live AI uses this' : 'Use for live AI') + '</button>' +
        '<button type="button" class="ab-use" data-refresh-models title="Refresh model list" aria-label="Refresh model list">↻</button></div>' +
        (o && o.text ? '<blockquote class="ab-out">' + esc(o.text) + '</blockquote>' : '') + (o && o.served && o.served !== st.orModel ? '<p class="ab-modelinfo">Served by ' + esc(o.served) + '</p>' : '') + meta(o);
    }
    if (st.tab === 'voice') {
      return gate('gemini') + '<div class="ab-grid">' + langSelect() +
        '<label class="ab-field"><span>Voice</span><select data-f="gvoice">' + GEMINI_VOICES.map(function (v) { return opt(v[0], v[0] + ' · ' + v[1], st.gvoice); }).join('') + '</select></label>' +
        '<label class="ab-field"><span>Model</span><input data-f="ttsModel" value="' + esc(M.model('tts')) + '"></label></div>' +
        '<label class="ab-field wide"><span>Text</span><input data-f="text" value="' + esc(st.text || sample(st.lang)) + '"></label>' +
        '<div class="ab-row">' + run('▶ Speak', '≈ ' + usd(estimate('voice', st.text || sample(st.lang)))) + '</div>' +
        (o && o.url ? '<audio class="ab-audio" controls src="' + o.url + '"></audio>' : '') + meta(o);
    }
    if (st.tab === 'transcribe') {
      var rec = st.recording;
      return gate('gemini') + '<div class="ab-grid">' + langSelect() + '<label class="ab-field"><span>Model</span><input data-f="sttModel" value="' + esc(M.model('transcribe')) + '"></label></div>' +
        '<div class="ab-row"><button type="button" class="ab-run' + (rec ? ' rec' : '') + '" data-run="transcribe"' + (busy && !rec ? ' disabled' : '') + '>' + (rec ? '■ Stop' : busy ? '…' : '● Record') + '<small>' + (rec ? 'max 8 s' : '≈ ' + usd(estimate('transcribe')) + ' for 8 s') + '</small></button></div>' +
        (o && o.text != null ? '<blockquote class="ab-out">' + esc(o.text || '(silence)') + '</blockquote>' : '') + meta(o);
    }
    if (st.tab === 'listen') {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return '<p class="ab-paused">This browser has no speech recognition. Try Chrome or Edge, or use Transcribe.</p>';
      return gate('browser-speech') + '<div class="ab-grid">' + langSelect() + '</div>' +
        '<div class="ab-row"><button type="button" class="ab-run' + (st.listening ? ' rec' : '') + '" data-run="listen">' + (st.listening ? '■ Stop' : '● Listen') + '<small>free</small></button></div>' +
        (o && (o.text || o.interim) ? '<blockquote class="ab-out">' + esc(o.text || '') + (o.interim ? ' <i>' + esc(o.interim) + '</i>' : '') + '</blockquote>' : '') + meta(o);
    }
    var vs = deviceVoices();
    if (!window.speechSynthesis) return '<p class="ab-paused">This browser has no speech synthesis.</p>';
    if (st.dvoice && !vs.some(function (v) { return v.name === st.dvoice; })) st.dvoice = '';
    return gate('browser-tts') + '<div class="ab-grid">' + langSelect() +
      '<label class="ab-field"><span>Voice</span><select data-f="dvoice">' + (vs.length ? vs.map(function (v, i) { return opt(v.name, (voiceScore(v, st.lang) >= 5 ? '★ ' : '') + v.name + (i === 0 ? ' (best)' : ''), st.dvoice || vs[0].name); }).join('') : '<option value="">No voice for this language</option>') + '</select></label>' +
      '<label class="ab-field"><span>Speed ' + st.rate.toFixed(2) + '</span><input type="range" min="0.6" max="1.3" step="0.05" value="' + st.rate + '" data-f="rate"></label></div>' +
      '<label class="ab-field wide"><span>Text</span><input data-f="text" value="' + esc(st.text || sample(st.lang)) + '"></label>' +
      '<div class="ab-row">' + run('▶ Speak', 'free') + '<span class="ab-chip">★ = natural</span></div>' + meta(o);
  }

  function draw() {
    var active = document.activeElement && root.contains(document.activeElement) ? document.activeElement.getAttribute('data-f') || document.activeElement.getAttribute('data-tab') : null;
    root.innerHTML = '<h3 class="am-h">Test an API</h3><div class="ab-tabs" role="tablist" aria-label="API to test">' +
      TABS.map(function (t) { var g = M.check(APP, t[3]); return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (st.tab === t[0]) + '" title="' + esc(t[2] + (g.ok ? '' : ' · ' + g.reason)) + '"><span aria-hidden="true">' + t[1] + '</span> ' + esc(t[2]) + (g.ok ? '' : ' <em aria-label="unavailable">⏸</em>') + '</button>'; }).join('') +
      '</div><div class="ab-panel" role="tabpanel">' + panelHtml() + '</div>';
    if (active) { var el = root.querySelector('[data-f="' + active + '"], [data-tab="' + active + '"]'); if (el) el.focus(); }
  }

  function done(o) { st.busy = false; st.out[st.tab] = o; draw(); }
  function fail(err) { st.busy = false; st.recording = false; st.listening = false; st.out[st.tab] = { error: (window.LiveAI && LiveAI.describe ? LiveAI.describe(err) : '') || M.Blocked && err && err.message || String(err) }; draw(); }

  var sdkLoading = null;
  function ensureLiveAI() {
    if (window.LiveAI) return Promise.resolve();
    if (!sdkLoading) sdkLoading = ['./scripts/live-ai/anthropic-sdk.js', './scripts/live-ai/live-ai.js'].reduce(function (p, src) {
      return p.then(function () { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error('Could not load ' + src)); }; document.head.appendChild(s); }); });
    }, Promise.resolve());
    return sdkLoading.then(function () { window.LiveAI.app = APP; });
  }

  var recorder = null, recTimer = null, recognition = null, listenStart = 0;
  function runTab(tab) {
    if (tab === 'claude') {
      st.busy = true; draw(); var t0 = Date.now();
      return ensureLiveAI().then(function () { return LiveAI.text({ messages: [{ role: 'user', content: st.prompt || 'Say hello in five words.' }], maxTokens: 300 }); })
        .then(function (r) { var last = M.state().log[0]; done({ text: r.text, ms: Date.now() - t0, usage: last && last.usage, cost: last && last.cost }); }, fail);
    }
    if (tab === 'openrouter') {
      if (!st.orModel) return fail(new Error('Choose a model first.'));
      st.busy = true; draw(); var t3 = Date.now();
      return M.openrouter.chat({ app: APP, model: st.orModel, messages: [{ role: 'user', content: st.prompt || 'Say hello in five words.' }], maxTokens: 300 })
        .then(function (r) { var last = M.state().log[0]; done({ text: r.text, served: r.model, ms: Date.now() - t3, usage: r.usage, cost: last && last.cost }); }, fail);
    }
    if (tab === 'voice') {
      st.busy = true; draw(); var t1 = Date.now();
      var text = st.text || sample(st.lang), lang = (LANGS.filter(function (l) { return l[0] === st.lang; })[0] || LANGS[0])[1];
      return M.gemini.tts({ app: APP, voice: st.gvoice, text: 'Say naturally, in ' + lang + ': ' + text })
        .then(function (r) { var last = M.state().log[0]; done({ url: URL.createObjectURL(r.blob), ms: Date.now() - t1, usage: r.usage, cost: last && last.cost }); setTimeout(function () { var a = root.querySelector('.ab-audio'); if (a && a.play) a.play().catch(function () {}); }, 0); }, fail);
    }
    if (tab === 'transcribe') {
      if (st.recording) { if (recorder && recorder.state !== 'inactive') recorder.stop(); return; }
      var g = M.check(APP, 'gemini'); if (!g.ok) return fail(M.Blocked(g.reason));
      if (!navigator.mediaDevices || !window.MediaRecorder) return fail(new Error('This browser cannot record audio.'));
      return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        var chunks = [], started = Date.now();
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        recorder.onstop = function () {
          clearTimeout(recTimer); stream.getTracks().forEach(function (t) { t.stop(); });
          st.recording = false; st.busy = true; draw();
          var blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }), secs = (Date.now() - started) / 1000, t2 = Date.now();
          M.gemini.transcribe({ app: APP, blob: blob, lang: st.lang, seconds: secs }).then(function (r) { var last = M.state().log[0]; done({ text: r.text, ms: Date.now() - t2, usage: r.usage, cost: last && last.cost }); }, fail);
        };
        recorder.start(); st.recording = true; draw();
        recTimer = setTimeout(function () { if (recorder.state !== 'inactive') recorder.stop(); }, 8000);
      }, function () { fail(new Error('Microphone permission was denied.')); });
    }
    if (tab === 'listen') {
      if (st.listening) { if (recognition) recognition.stop(); return; }
      var g2 = M.check(APP, 'browser-speech'); if (!g2.ok) return fail(M.Blocked(g2.reason));
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SR(); recognition.lang = st.lang; recognition.interimResults = true; recognition.continuous = false;
      var finalText = '';
      st.out.listen = { text: '', interim: '' }; listenStart = Date.now();
      recognition.onresult = function (e) {
        var interim = ''; finalText = '';
        for (var i = 0; i < e.results.length; i++) { if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript; }
        st.out.listen = { text: finalText, interim: interim }; draw();
      };
      recognition.onerror = function (e) { st.out.listen = { error: 'Speech recognition: ' + (e.error || 'error') }; };
      recognition.onend = function () {
        st.listening = false;
        var secs = (Date.now() - listenStart) / 1000, prev = st.out.listen || {};
        M.record({ app: APP, provider: 'browser-speech', op: 'listen', usage: { seconds: secs }, ok: !prev.error, error: prev.error });
        st.out.listen = prev.error ? prev : { text: prev.text || prev.interim || '', usage: { seconds: secs }, cost: 0 };
        draw();
      };
      try { recognition.start(); st.listening = true; draw(); } catch (err) { fail(err); }
      return;
    }
    if (tab === 'device') {
      var g3 = M.check(APP, 'browser-tts'); if (!g3.ok) return fail(M.Blocked(g3.reason));
      var vs = deviceVoices(), v = vs.filter(function (x) { return x.name === st.dvoice; })[0] || vs[0];
      var u = new SpeechSynthesisUtterance(st.text || sample(st.lang)); u.lang = st.lang; u.rate = st.rate; u.pitch = 1; if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
      M.record({ app: APP, provider: 'browser-tts', op: 'speak', model: v ? v.name : '', usage: { chars: u.text.length } });
      st.out.device = { usage: { chars: u.text.length }, cost: 0 }; draw();
    }
  }

  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]'); if (t) { st.tab = t.dataset.tab; keep(); draw(); return; }
    var r = e.target.closest('[data-run]'); if (r) runTab(r.dataset.run);
    var u = e.target.closest('[data-use]'); if (u && u.dataset.use) { M.setLlm('openrouter', u.dataset.use); draw(); }
    if (e.target.closest('[data-refresh-models]')) loadModels(true);
  });
  root.addEventListener('keydown', function (e) {
    var t = e.target.closest('[role=tab]'); if (!t || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    var i = TABS.findIndex(function (x) { return x[0] === st.tab; }); i = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    st.tab = TABS[i][0]; keep(); draw(); root.querySelector('[aria-selected="true"]').focus();
  });
  root.addEventListener('input', function (e) {
    var f = e.target.dataset.f; if (!f) return;
    if (f === 'prompt') st.prompt = e.target.value;
    if (f === 'orFilter') { st.orFilter = e.target.value; keep(); clearTimeout(st._ft); st._ft = setTimeout(draw, 250); return; }
    if (f === 'text') st.text = e.target.value;
    if (f === 'rate') { st.rate = Number(e.target.value); var lab = e.target.parentNode.querySelector('span'); if (lab) lab.textContent = 'Speed ' + st.rate.toFixed(2); }
    keep();
  });
  root.addEventListener('change', function (e) {
    var f = e.target.dataset.f; if (!f || f === 'prompt' || f === 'text' || f === 'rate' || f === 'orFilter') return; // typed fields: no re-render, or a click on Run right after typing is lost
    if (f === 'lang') { st.lang = e.target.value; st.text = ''; st.dvoice = ''; }
    if (f === 'gvoice') st.gvoice = e.target.value;
    if (f === 'orModel' || f === 'orModelId') st.orModel = e.target.value.trim();
    if (f === 'dvoice') st.dvoice = e.target.value;
    if (f === 'ttsModel') M.setModel('tts', e.target.value.trim());
    if (f === 'sttModel') M.setModel('transcribe', e.target.value.trim());
    keep(); draw();
  });

  window.ApiBench = { refresh: function () { if (!st.busy && !st.recording && !st.listening) draw(); }, voiceScore: voiceScore };
  draw();
})();
