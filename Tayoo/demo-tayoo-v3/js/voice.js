/* Tayoo V3 — voice: tap or hold to talk, hands-free send after a short silence, a live mic level, a metered
   fallback to recorded audio + Gemini transcription, spoken replies with the best device voice, and the capture orb.

   Why the mic "wasn't hearing" before this pass (root cause, fixed below):
   1. Recognition ran with continuous = true. Android Chrome ends a continuous session at the first pause (and repeats
      results), desktop Chrome ends it after silence. onend only said "Paused, tap Stop", so nothing was sent.
   2. Even after Stop, the transcript only became a draft that needed a second tap on Send.
   3. Nothing showed whether audio arrived: the orb moved only when words came back.
   4. Without SpeechRecognition (Firefox) or when it is refused (iOS without Siri & Dictation: service-not-allowed),
      the overlay offered scripted samples, so the microphone never started; errors blamed file:// pages.
   Now: recognition starts synchronously in the gesture, single-utterance on phones, a 1.5 s silence sends it, a level
   meter proves the mic hears, errors map to an icon and a short message, and samples live only in the Demo menu. */
(function () {
  'use strict';
  var T = (window.Tayoo = window.Tayoo || {});
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  /* ======================= orb ======================= */
  var orb = (T.orb = { energy: 0, target: 0.15, raf: 0, t: 0 });
  orb.start = function (canvas) {
    orb.canvas = canvas; orb.ctx = canvas.getContext('2d');
    orb.resize();
    cancelAnimationFrame(orb.raf);
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(64, now - last); last = now;
      orb.t += dt * (T.reduced() ? 0 : 0.001);
      orb.energy += (orb.target - orb.energy) * 0.08;
      orb.target *= 0.985; if (orb.target < 0.12) orb.target = 0.12;
      orb.draw();
      orb.raf = requestAnimationFrame(frame);
    }
    if (T.reduced()) { orb.t = 1.3; orb.energy = 0.3; orb.draw(); return; }
    orb.raf = requestAnimationFrame(frame);
  };
  orb.stop = function () { cancelAnimationFrame(orb.raf); orb.raf = 0; };
  orb.pulse = function (x) { orb.target = Math.min(1, Math.max(orb.target, x)); };
  orb.resize = function () {
    if (!orb.canvas) return;
    var r = orb.canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    orb.canvas.width = Math.max(1, Math.round(r.width * dpr)); orb.canvas.height = Math.max(1, Math.round(r.height * dpr));
    orb.dpr = dpr;
  };
  orb.draw = function () {
    var c = orb.ctx, W = orb.canvas.width, H = orb.canvas.height;
    if (!c || !W) return;
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.34, e = orb.energy, t = orb.t;
    c.clearRect(0, 0, W, H);
    // halo
    var halo = c.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.9);
    halo.addColorStop(0, 'rgba(91,124,255,' + (0.20 + e * 0.25) + ')');
    halo.addColorStop(0.5, 'rgba(120,90,255,' + (0.08 + e * 0.1) + ')');
    halo.addColorStop(1, 'rgba(10,14,40,0)');
    c.fillStyle = halo; c.fillRect(0, 0, W, H);
    // dark glass core
    var core = c.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R);
    core.addColorStop(0, 'rgba(40,50,120,0.55)');
    core.addColorStop(0.7, 'rgba(12,16,52,0.85)');
    core.addColorStop(1, 'rgba(70,100,255,0.35)');
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fillStyle = core; c.fill();
    // ribbons
    c.save();
    c.globalCompositeOperation = 'lighter';
    var cols = ['91,124,255', '155,107,255', '79,209,232', '120,150,255', '190,140,255', '70,180,255', '140,120,255'];
    for (var i = 0; i < 7; i++) {
      var a = t * (0.35 + i * 0.07) + i * 0.9;
      var tilt = Math.sin(t * 0.6 + i) * 0.5 + 0.55;
      var rx = R * (0.96 - i * 0.035), ry = R * (0.18 + tilt * 0.62) * (1 + e * 0.12);
      c.save();
      c.translate(cx, cy); c.rotate(a);
      var g = c.createLinearGradient(-rx, 0, rx, 0);
      g.addColorStop(0, 'rgba(' + cols[i] + ',0)');
      g.addColorStop(0.5, 'rgba(' + cols[i] + ',' + (0.55 + e * 0.4) + ')');
      g.addColorStop(1, 'rgba(' + cols[(i + 2) % 7] + ',0.05)');
      c.strokeStyle = g;
      c.shadowColor = 'rgba(' + cols[i] + ',0.9)';
      c.shadowBlur = (10 + e * 18) * orb.dpr;
      c.lineWidth = (1.4 + (i % 3) * 1.1 + e * 2.6) * orb.dpr;
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    c.restore();
    // rim light
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(170,190,255,' + (0.25 + e * 0.3) + ')'; c.lineWidth = 1.2 * orb.dpr; c.stroke();
    // specular
    var sp = c.createRadialGradient(cx - R * 0.38, cy - R * 0.45, 0, cx - R * 0.38, cy - R * 0.45, R * 0.5);
    sp.addColorStop(0, 'rgba(255,255,255,0.22)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = sp; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
  };

  /* ======================= metering (hub API monitor) ======================= */
  var APP = 'tayoo';
  function meter() { return window.ApiMeter || null; }
  function gate(provider) { var m = meter(); return m ? m.check(APP, provider) : { ok: true }; }
  function rec(provider, op, usage, ok, err) { var m = meter(); if (m) try { m.record({ app: APP, provider: provider, op: op, usage: usage, ok: ok !== false, error: err || '' }); } catch (e) { /* metering is best effort */ } }
  T.meterGate = gate;

  /* ======================= speech synthesis ======================= */
  // Capabilities respect the Test lab toggles, so fallbacks can be tested in any browser.
  var V = (T.voice = { speaking: false });
  function caps() { return (T.store.state && T.store.state.caps) || {}; }
  Object.defineProperty(V, 'supported', { get: function () { return !!SR && caps().sr !== false; } });
  Object.defineProperty(V, 'canSpeak', { get: function () { return !!window.speechSynthesis && caps().voices !== false; } });
  Object.defineProperty(V, 'canRecord', { get: function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); } });
  // The most natural voice for the locale: network/neural voices first, an exact locale over a language match
  V.pickVoice = function (lang) {
    var want = lang === 'FR' ? 'fr-ca' : 'en-ca', base = want.slice(0, 2);
    var voices = (window.speechSynthesis && window.speechSynthesis.getVoices()) || [];
    function score(v) {
      var l = (v.lang || '').toLowerCase().replace('_', '-'), n = v.name || '';
      if (l.indexOf(base) !== 0) return -1;
      return (l === want ? 40 : l.indexOf(base) === 0 ? 10 : 0) + (/natural|neural|online|premium|enhanced/i.test(n) ? 30 : 0) + (/google/i.test(n) ? 20 : 0) + (v.localService === false ? 5 : 0);
    }
    return voices.map(function (v) { return [score(v), v]; }).filter(function (x) { return x[0] >= 0; }).sort(function (a, b) { return b[0] - a[0]; }).map(function (x) { return x[1]; })[0] || null;
  };
  // Gemini voices are opt-in (Settings), go through the hub meter, and are cached so a phrase is paid for once
  var cacheDb = null;
  function idb() {
    if (cacheDb) return cacheDb;
    cacheDb = new Promise(function (ok, no) {
      try { var rq = indexedDB.open('tayoo-v3-tts', 1); rq.onupgradeneeded = function () { rq.result.createObjectStore('clips'); }; rq.onsuccess = function () { ok(rq.result); }; rq.onerror = function () { no(rq.error); }; } catch (e) { no(e); }
    });
    return cacheDb;
  }
  function cacheGet(k) { return idb().then(function (db) { return new Promise(function (ok) { var r = db.transaction('clips').objectStore('clips').get(k); r.onsuccess = function () { ok(r.result || null); }; r.onerror = function () { ok(null); }; }); }).catch(function () { return null; }); }
  function cachePut(k, blob) { return idb().then(function (db) { db.transaction('clips', 'readwrite').objectStore('clips').put(blob, k); }).catch(function () {}); }
  function playBlob(blob, text) {
    var url = URL.createObjectURL(blob), au = new Audio(url);
    V.audio = au; V.speaking = true; T.app && T.app.onSpeaking(true, text);
    au.onended = au.onerror = function () { V.speaking = false; URL.revokeObjectURL(url); T.app && T.app.onSpeaking(false); };
    return au.play().catch(function () { V.speaking = false; T.app && T.app.onSpeaking(false); });
  }
  function deviceSay(text, lang) {
    var g = gate('browser-tts');
    if (!g.ok) { V.paused = g.reason; return false; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text), v = V.pickVoice(lang);
    if (v) u.voice = v;
    u.lang = v ? v.lang : (lang === 'FR' ? 'fr-CA' : 'en-CA');
    u.rate = 1; u.pitch = 1;
    u.onstart = function () { V.speaking = true; T.app && T.app.onSpeaking(true, text); };
    u.onend = u.onerror = function () { V.speaking = false; T.app && T.app.onSpeaking(false); };
    window.speechSynthesis.speak(u);
    rec('browser-tts', 'speak', { chars: text.length });
    return true;
  }
  V.say = function (text, lang) {
    try {
      if (!T.store.state.settings.speak || !text) return;
      var set = T.store.state.settings;
      if (set.voiceEngine === 'gemini' && meter() && gate('gemini').ok) {
        var voice = lang === 'FR' ? 'Leda' : 'Kore', key = voice + '|' + text;
        cacheGet(key).then(function (hit) {
          if (hit) return playBlob(hit, text);
          return meter().gemini.tts({ app: APP, text: text, voice: voice }).then(function (r) { cachePut(key, r.blob); return playBlob(r.blob, text); });
        }).catch(function () { if (V.canSpeak) deviceSay(text, lang); });
        return;
      }
      if (V.canSpeak) deviceSay(text, lang);
    } catch (e) { /* speech is optional */ }
  };
  V.hush = function () {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    try { if (V.audio) V.audio.pause(); } catch (e) { /* ignore */ }
    V.speaking = false; T.app && T.app.onSpeaking(false);
  };

  /* ======================= capture: a small state machine ======================= */
  // idle → starting → listening → (1.5 s of silence or Done) → sending; or paused / error / unsupported;
  // the fallback path is recording → transcribing → sending
  var STATES = {
    starting: { icon: 'mic', text: 'Starting the mic' },
    // the disclosure stays visible whenever the browser's recognizer is listening
    listening: { icon: 'mic', text: 'Listening', hint: 'Some browsers, Chrome among them, send the audio to their own speech service to transcribe it.' },
    recording: { icon: 'mic', text: 'Recording', hint: 'Gemini transcribes this recording (metered).' },
    transcribing: { icon: 'refresh', text: 'Transcribing' },
    sending: { icon: 'check', text: 'Got it' },
    sample: { icon: 'play', text: 'Scripted sample' },
    paused: { icon: 'pause', text: 'Voice paused' },
    error: { icon: 'alert', text: 'Couldn’t hear you' },
    unsupported: { icon: 'micoff', text: 'No voice input here' }
  };
  // every failure gets an icon, a few words and one way forward
  var ERR = {
    'not-allowed': ['micoff', 'Mic blocked', 'Allow the microphone for this site, then try again.'],
    'service-not-allowed': ['micoff', 'Speech not allowed', 'On iPhone, turn on Siri & Dictation. Or type.'],
    'audio-capture': ['micoff', 'No microphone', 'Plug in or enable a microphone.'],
    'no-speech': ['question', 'Didn’t catch that', 'Try again a little closer.'],
    network: ['ban', 'Speech service offline', 'Check the connection, or type.'],
    'language-not-supported': ['ban', 'Language not supported', 'Switch the dictation language in Settings.'],
    'bad-grammar': ['alert', 'Couldn’t transcribe', 'Try again.'],
    transcribe: ['alert', 'Couldn’t transcribe', 'Try again, or type.'],
    silent: ['question', 'Didn’t catch that', 'Try again a little closer.']
  };
  var FALLBACK_ERRORS = { 'service-not-allowed': 1, network: 1, 'language-not-supported': 1 };
  var C = (T.capture = { open: false, state: 'idle', mode: null, text: '', interim: '', rec: null, timer: 0, started: 0, playId: 0 });
  T.capture.silenceMs = 1500;
  function $(id) { return document.getElementById(id); }
  function isPhone() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ''); }
  function setState(st, text, hint, reason) {
    C.state = st; C.mode = st;
    var d = STATES[st] || STATES.error;
    $('capture').setAttribute('data-mode', st);
    $('cap-ic').innerHTML = T.icon(d.icon);
    $('cap-status-text').textContent = text || d.text;
    var hel = $('cap-hint');
    hel.textContent = hint != null ? hint : d.hint || '';
    hel.title = reason || '';
    $('cap-stop').hidden = !(st === 'listening' || st === 'recording' || st === 'starting' || st === 'sample');
    $('capture').querySelector('[data-act="cap-retry"]').hidden = !(st === 'error' || st === 'paused' || st === 'unsupported');
  }
  function renderText() {
    var el = $('cap-text');
    var fin = C.text, inter = C.interim;
    $('capture').classList.toggle('is-long', (fin + ' ' + inter).length > 110);
    el.innerHTML = fin || inter ? T.esc(fin) + (inter ? ' <span class="interim">' + T.esc(inter) + '</span>' : '') : '';
  }
  function tickTimer() {
    var s = Math.floor((Date.now() - C.started) / 1000);
    $('cap-timer').textContent = Math.floor(s / 60) + ':' + T.pad(s % 60);
  }

  /* ---------- the live level meter: getUserMedia + AnalyserNode ---------- */
  var L = (C.level = { stream: null, ctx: null, an: null, raf: 0, value: 0, heardAt: 0 });
  function levelBars(v) {
    var bars = $('cap-level').children;
    for (var i = 0; i < bars.length; i++) { var w = 1 - Math.abs(i - (bars.length - 1) / 2) / bars.length; bars[i].style.transform = 'scaleY(' + Math.max(0.12, Math.min(1, v * 3.2 * w + 0.1)).toFixed(2) + ')'; }
  }
  L.start = function (stream) {
    try {
      L.stream = stream;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      L.ctx = new AC(); L.an = L.ctx.createAnalyser(); L.an.fftSize = 512;
      L.ctx.createMediaStreamSource(stream).connect(L.an);
      var buf = new Uint8Array(L.an.fftSize);
      (function frame() {
        L.an.getByteTimeDomainData(buf);
        var sum = 0; for (var i = 0; i < buf.length; i++) { var x = (buf[i] - 128) / 128; sum += x * x; }
        L.value = Math.sqrt(sum / buf.length);
        if (L.value > 0.04) L.heardAt = Date.now();
        levelBars(L.value); T.orb.pulse(0.2 + L.value * 2);
        $('capture').classList.toggle('is-hearing', L.value > 0.04);
        L.raf = requestAnimationFrame(frame);
      })();
    } catch (e) { /* the meter is a visual aid */ }
  };
  L.stop = function () {
    cancelAnimationFrame(L.raf); L.raf = 0;
    try { if (L.ctx) L.ctx.close(); } catch (e) { /* ignore */ }
    if (L.stream && !C.recorder) L.stream.getTracks().forEach(function (t) { t.stop(); });
    L.ctx = L.an = null; if (!C.recorder) L.stream = null; L.value = 0; levelBars(0);
  };
  function openMic() {
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return Promise.reject(new Error('no-media'));
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  }

  /* ---------- show / start ---------- */
  C.show = function (opts) {
    opts = opts || {};
    T.voice.hush();
    var el = $('capture');
    C.open = true; C.text = ''; C.interim = ''; C.error = null; C.lastFocus = document.activeElement; C.hold = !!opts.hold; C.sent = false;
    var dv = $('device').getBoundingClientRect();
    var o = opts.origin && opts.origin.getBoundingClientRect ? opts.origin.getBoundingClientRect() : null;
    el.style.setProperty('--ox', o ? Math.round(o.left - dv.left + o.width / 2) + 'px' : '50%');
    el.style.setProperty('--oy', o ? Math.round(o.top - dv.top + o.height / 2) + 'px' : '80%');
    el.hidden = false;
    el.classList.remove('is-in'); void el.offsetWidth; el.classList.add('is-in');
    document.body.classList.add('capturing');
    T.orb.start($('orb'));
    C.started = Date.now(); clearInterval(C.timer); C.timer = setInterval(tickTimer, 500); tickTimer();
    renderText(); levelBars(0);
    if (opts.sample) return C.playSample(opts.sample);
    C.listen();
    setTimeout(function () { var b = $('cap-stop'); if (b && !b.hidden) b.focus(); }, 30);
  };
  // Must run inside the tap or press: recognition.start() and getUserMedia() are called synchronously from here
  C.listen = function () {
    C.text = ''; C.interim = ''; renderText();
    var lang = T.store.state.settings.recLang || 'en-CA';
    if (V.supported) {
      var g = gate('browser-speech');
      if (!g.ok) return setState('paused', null, 'Type instead, or turn voice back on in the API monitor.', g.reason);
      return C.startLive(lang);
    }
    return C.startFallback(lang, SR ? 'Speech recognition is off (Test lab).' : 'This browser has no speech recognition.');
  };
  C.startLive = function (lang) {
    setState('starting');
    C.speechAt = 0; C.liveStart = Date.now(); C.prior = (C.text + ' ' + C.interim).trim(); C.interim = '';
    try {
      var r = new SR();
      C.rec = r;
      r.lang = lang; r.interimResults = true; r.maxAlternatives = 1;
      // phones end a continuous session at the first pause and repeat results: one utterance at a time there
      r.continuous = !isPhone();
      r.onstart = function () { if (C.rec === r) setState('listening'); };
      r.onaudiostart = function () { if (C.rec === r && C.state === 'starting') setState('listening'); };
      r.onsoundstart = r.onspeechstart = function () { T.orb.pulse(0.6); if (!L.an) { levelBars(0.25); $('capture').classList.add('is-hearing'); } };
      r.onresult = function (ev) {
        if (C.rec !== r) return;
        // rebuilt from the session's whole result list each time, so repeated results never double the words
        var fin = '', inter = '';
        for (var i = 0; i < ev.results.length; i++) { var x = ev.results[i]; if (x.isFinal) fin += ' ' + x[0].transcript; else inter += ' ' + x[0].transcript; }
        C.text = ((C.prior || '') + ' ' + fin).replace(/\s+/g, ' ').trim(); C.interim = inter.replace(/\s+/g, ' ').trim();
        C.speechAt = Date.now();
        if (C.state !== 'listening') setState('listening');
        T.orb.pulse(0.55 + Math.random() * 0.35); if (!L.an) levelBars(0.3 + Math.random() * 0.3);
        renderText();
        C.armSilence();
      };
      r.onerror = function (ev) {
        if (C.rec !== r) return;
        C.error = ev.error;
        if (ev.error === 'aborted') return;
        if (FALLBACK_ERRORS[ev.error] && gate('gemini').ok && V.canRecord) { C.stopLive(true); C.startFallback(lang, ''); return; }
        if (ev.error === 'no-speech' && (C.text || C.interim)) return;
        C.fail(ev.error);
      };
      r.onend = function () {
        if (C.rec !== r) return;
        C.rec = null; clearTimeout(C.silenceT);
        C.meterListen(!C.error);
        if (!C.open || C.state === 'error' || C.state === 'transcribing' || C.state === 'recording') return;
        // the browser ended (silence, or a phone's single utterance): send what was heard, hands-free
        if ((C.text + ' ' + C.interim).trim()) return C.finish();
        if (C.hold && C.holding) return C.startLive(lang); // still holding: keep listening
        C.fail(C.error || 'silent');
      };
      r.start();
    } catch (e) { C.fail('audio-capture'); return; }
    // the level meter, on its own stream; Android can't share the mic with recognition, so it relies on sound events
    if (!/Android/i.test(navigator.userAgent || '')) openMic().then(function (st) { if (C.open && C.rec) L.start(st); else st.getTracks().forEach(function (t) { t.stop(); }); }, function () { /* the meter is optional */ });
  };
  C.armSilence = function () {
    clearTimeout(C.silenceT);
    if (C.hold && C.holding) return; // press-and-hold sends on release
    C.silenceT = setTimeout(function () { if (C.open && C.rec && (C.text || C.interim)) C.stopLive(); }, C.silenceMs * (T.speed || 1));
  };
  C.stopLive = function (silent) {
    var r = C.rec;
    clearTimeout(C.silenceT);
    if (!r) return;
    if (silent) { C.rec = null; C.meterListen(false); }
    try { silent ? r.abort() : r.stop(); } catch (e) { /* ignore */ }
  };
  C.meterListen = function (ok) {
    if (!C.liveStart) return;
    var secs = Math.max(0.1, Math.round((Date.now() - C.liveStart) / 100) / 10);
    rec('browser-speech', 'listen', { seconds: secs }, ok, ok ? '' : C.error);
    C.liveStart = 0;
  };
  C.fail = function (code, reason) {
    var e = ERR[code] || ['alert', 'Couldn’t hear you', 'Try again, or type.'];
    L.stop();
    setState(code === 'unsupported' ? 'unsupported' : 'error', e[1], e[2], reason || code);
    $('cap-ic').innerHTML = T.icon(e[0]);
  };

  /* ---------- fallback: record, then transcribe with Gemini through the hub meter ---------- */
  C.startFallback = function (lang, why) {
    var g = meter() ? gate('gemini') : { ok: false, reason: 'API monitor not loaded' };
    if (!g.ok || !V.canRecord) return setState('unsupported', null, 'Type instead. ' + (why || ''), (g.reason || 'Recording isn’t available') + (why ? '. ' + why : ''));
    setState('starting', 'Starting the mic', '', why);
    openMic().then(function (stream) {
      if (!C.open) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      var chunks = [], mr;
      try { mr = new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(function (t) { t.stop(); }); return C.fail('audio-capture'); }
      C.recorder = mr; C.recStart = Date.now();
      mr.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunks.push(ev.data); };
      mr.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        C.recorder = null; L.stop();
        if (!C.open || C.discarded) return;
        var blob = new Blob(chunks, { type: (mr.mimeType || 'audio/webm') });
        var secs = Math.round((Date.now() - C.recStart) / 100) / 10;
        setState('transcribing');
        meter().gemini.transcribe({ app: APP, blob: blob, lang: lang, seconds: secs }).then(function (r) {
          if (!C.open) return;
          C.text = (r.text || '').trim(); renderText();
          if (C.text) C.finish('gemini'); else C.fail('silent');
        }, function (err) {
          if (!C.open) return;
          if (err && err.name === 'ApiMeterBlocked') setState('paused', null, 'Type instead.', err.message);
          else C.fail('transcribe', err && err.message);
        });
      };
      mr.start(250);
      L.start(stream);
      setState('recording', 'Recording', null, 'Your browser has no speech recognition here, so the audio is transcribed by Gemini (metered).');
      // stop after 1.5 s of quiet once you have spoken, or at 60 s
      var spoke = false;
      C.silenceT = setInterval(function () {
        if (!C.recorder) return clearInterval(C.silenceT);
        if (L.value > 0.04) spoke = true;
        var quiet = Date.now() - (L.heardAt || C.recStart);
        if ((spoke && quiet > C.silenceMs * (T.speed || 1) && !(C.hold && C.holding)) || Date.now() - C.recStart > 60000) { clearInterval(C.silenceT); try { mr.stop(); } catch (e) { /* ignore */ } }
      }, 100);
    }, function (err) { C.fail(err && err.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture'); });
  };

  /* ---------- hold to talk ---------- */
  C.release = function () {
    if (!C.open || !C.hold) return;
    C.holding = false;
    if (C.recorder) { try { C.recorder.stop(); } catch (e) { /* ignore */ } return; }
    if (C.rec) C.stopLive();
  };

  /* ---------- scripted samples (Demo menu only; never what the mic does) ---------- */
  C.playSample = function (id) {
    var smp = T.SAMPLES.filter(function (s) { return s.id === id; })[0];
    if (!smp) return;
    if (C.rec) C.stopLive(true);
    C.sampleId = id; C.text = ''; C.interim = '';
    setState('sample', 'Scripted sample', 'Demo · no microphone');
    var words = smp.text.split(' '), i = 0, my = ++C.playId;
    function next() {
      if (my !== C.playId || !C.open) return;
      if (i >= words.length) {
        C.text = smp.text; C.interim = ''; renderText();
        C.sampleDone = true;
        if (C.autoStop) setTimeout(function () { if (my === C.playId && C.open) C.stop(); }, 500 * T.speed);
        return;
      }
      var chunk = Math.min(words.length, i + 2);
      C.text = words.slice(0, Math.max(0, chunk - 2)).join(' ');
      C.interim = words.slice(Math.max(0, chunk - 2), chunk).join(' ');
      i = chunk;
      renderText();
      T.orb.pulse(0.45 + (i % 5) * 0.1); levelBars(0.2 + (i % 4) * 0.08);
      setTimeout(next, (T.reduced() ? 40 : 150) * T.speed);
    }
    C.sampleDone = false;
    next();
  };
  C.finishSampleNow = function () {
    var smp = T.SAMPLES.filter(function (s) { return s.id === C.sampleId; })[0];
    C.playId++;
    if (smp) { C.text = smp.text; C.interim = ''; }
  };

  /* ---------- finish: hands-free send ---------- */
  C.finish = function (via) {
    if (C.sent) return;
    C.sent = true;
    var text = (C.text + ' ' + C.interim).replace(/\s+/g, ' ').trim();
    var lang = T.store.state.settings.recLang;
    setState('sending');
    C.close();
    if (!text) return T.app.toast('Nothing heard.');
    T.app.sendVoice(text, via === 'gemini' ? 'gemini' : 'live', lang);
  };
  // Done: in live mode it ends listening (and sends); with a sample it reviews the transcript
  C.stop = function () {
    if (!C.open) return;
    if (C.state === 'sample') {
      if (!C.sampleDone) C.finishSampleNow();
      var smp = T.SAMPLES.filter(function (s) { return s.id === C.sampleId; })[0] || {};
      var t = (C.text + ' ' + C.interim).trim();
      C.close();
      return t ? T.app.setDraft(t, 'voice', 'sample', smp.lang) : null;
    }
    if (C.recorder) { try { C.recorder.stop(); } catch (e) { /* ignore */ } return; }
    if (C.rec) { if (C.text || C.interim) return C.stopLive(); C.stopLive(true); }
    if (C.text || C.interim) return C.finish();
    C.cancel(true);
  };
  C.retry = function () { if (!C.open) return; C.error = null; C.sent = false; C.listen(); };
  C.cancel = function (quiet) {
    C.discarded = true;
    C.close();
    C.discarded = false;
    if (!quiet) T.app.toast('Discarded.');
  };
  C.typeInstead = function () {
    C.discarded = true; C.close(); C.discarded = false;
    var ta = document.getElementById('composer-input');
    if (ta) ta.focus();
  };
  C.close = function () {
    C.playId++;
    if (C.rec) C.stopLive(true);
    if (C.recorder && C.discarded) { try { C.recorder.stop(); } catch (e) { /* ignore */ } }
    clearTimeout(C.silenceT); clearInterval(C.silenceT);
    L.stop();
    C.open = false; C.autoStop = false; C.holding = false;
    clearInterval(C.timer);
    T.orb.stop();
    var el = $('capture');
    el.classList.remove('is-in', 'is-hearing');
    el.hidden = true;
    document.body.classList.remove('capturing');
    if (C.lastFocus && C.lastFocus.focus && document.body.contains(C.lastFocus)) { try { C.lastFocus.focus(); } catch (e) { /* ignore */ } }
  };
  window.addEventListener('resize', function () { if (C.open) T.orb.resize(); });
})();
