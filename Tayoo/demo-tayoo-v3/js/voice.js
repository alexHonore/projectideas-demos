/* Tayoo V3 — voice: real browser speech recognition when available, scripted sample dictations otherwise,
   spoken replies through speechSynthesis, and the luminous capture orb (canvas). */
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

  /* ======================= speech synthesis ======================= */
  // Capabilities respect the Test lab toggles, so fallbacks can be tested in any browser.
  var V = (T.voice = { speaking: false });
  function caps() { return (T.store.state && T.store.state.caps) || {}; }
  Object.defineProperty(V, 'supported', { get: function () { return !!SR && caps().sr !== false; } });
  Object.defineProperty(V, 'canSpeak', { get: function () { return !!window.speechSynthesis && caps().voices !== false; } });
  V.say = function (text, lang) {
    try {
      if (!V.canSpeak || !T.store.state.settings.speak || !text) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      var want = lang === 'FR' ? 'fr' : 'en';
      var voices = window.speechSynthesis.getVoices() || [];
      var v = voices.filter(function (x) { return x.lang && x.lang.toLowerCase().indexOf(want + '-ca') === 0; })[0] ||
        voices.filter(function (x) { return x.lang && x.lang.toLowerCase().indexOf(want) === 0; })[0];
      if (v) u.voice = v;
      u.lang = lang === 'FR' ? 'fr-CA' : 'en-CA';
      u.rate = 1.03;
      u.onstart = function () { V.speaking = true; T.app && T.app.onSpeaking(true, text); };
      u.onend = u.onerror = function () { V.speaking = false; T.app && T.app.onSpeaking(false); };
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech is optional */ }
  };
  V.hush = function () {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    V.speaking = false; T.app && T.app.onSpeaking(false);
  };

  /* ======================= capture overlay ======================= */
  var C = (T.capture = { open: false, mode: null, text: '', interim: '', rec: null, timer: 0, started: 0, playId: 0 });
  function $(id) { return document.getElementById(id); }
  function setStatus(text, kind) {
    $('cap-status-text').textContent = text;
    $('capture').setAttribute('data-mode', kind || C.mode);
  }
  function renderText() {
    var el = $('cap-text');
    var fin = C.text, inter = C.interim;
    $('capture').classList.toggle('is-long', (fin + ' ' + inter).length > 110);
    el.innerHTML = fin || inter ? T.esc(fin) + (inter ? ' <span class="interim">' + T.esc(inter) + '</span>' : '') : '<span class="placeholder">' + (C.mode === 'live' ? 'Go ahead, I’m listening…' : '') + '</span>';
  }
  function tickTimer() {
    var s = Math.floor((Date.now() - C.started) / 1000);
    $('cap-timer').textContent = Math.floor(s / 60) + ':' + T.pad(s % 60);
  }

  C.show = function (opts) {
    opts = opts || {};
    T.voice.hush();
    var el = $('capture');
    C.open = true; C.text = ''; C.interim = ''; C.error = null; C.lastFocus = document.activeElement;
    // the one orchestrated moment: the desk view folds into midnight from the talk control
    var o = opts.origin && opts.origin.getBoundingClientRect ? opts.origin.getBoundingClientRect() : null;
    el.style.setProperty('--ox', o ? Math.round(o.left + o.width / 2) + 'px' : '50%');
    el.style.setProperty('--oy', o ? Math.round(o.top + o.height / 2) + 'px' : '80%');
    el.hidden = false;
    el.classList.remove('is-in');
    void el.offsetWidth;
    el.classList.add('is-in');
    document.body.classList.add('capturing');
    T.orb.start($('orb'));
    C.started = Date.now(); clearInterval(C.timer); C.timer = setInterval(tickTimer, 500); tickTimer();
    renderSamples(opts.sample);
    if (opts.sample) C.playSample(opts.sample);
    else if (V.supported) C.startLive();
    else {
      C.mode = 'unsupported';
      setStatus(SR ? 'Speech recognition is off (Test lab)' : 'Live transcription isn’t available in this browser', 'unsupported');
      $('cap-hint').textContent = 'Nothing is being recorded. Pick a scripted sample dictation below, or type instead.';
      renderText();
    }
    setTimeout(function () { var b = $('cap-stop'); if (b) b.focus(); }, 30);
  };
  function renderSamples(active) {
    $('cap-samples').innerHTML = '<p class="cap-samples-h" id="cap-samples-h">Sample dictations (scripted)</p><div class="cap-samples-row" role="group" aria-labelledby="cap-samples-h">' + T.SAMPLES.map(function (s) {
      return '<button type="button" class="cap-sample' + (s.id === active ? ' is-on' : '') + '" data-act="cap-sample" data-sample="' + s.id + '">' + T.esc(s.label) + '</button>';
    }).join('') + '</div>';
  }
  C.startLive = function () {
    C.mode = 'live';
    var lang = T.store.state.settings.recLang || 'en-CA';
    var langName = lang === 'fr-CA' ? 'Français (Canada)' : 'English (Canada)';
    setStatus('Starting the microphone…', 'starting');
    $('cap-hint').textContent = 'If your browser asks for microphone access, allow it. Nothing is recorded until it does. Some browsers, Chrome among them, send the audio to their own speech service to transcribe it.';
    clearTimeout(C.noAudioT);
    C.noAudioT = setTimeout(function () {
      if (C.open && C.mode === 'live' && !C.audio) $('cap-hint').textContent = 'No audio yet. If the microphone prompt was dismissed or blocked, use a sample dictation below or type instead.';
    }, 4500 * T.speed);
    C.audio = false;
    renderText();
    try {
      var rec = new SR();
      C.rec = rec;
      rec.lang = lang; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
      rec.onresult = function (ev) {
        var fin = '', inter = '';
        for (var i = 0; i < ev.results.length; i++) {
          var r = ev.results[i];
          if (r.isFinal) fin += r[0].transcript; else inter += r[0].transcript;
        }
        C.text = fin.trim(); C.interim = inter.trim();
        T.orb.pulse(0.55 + Math.random() * 0.35);
        renderText();
      };
      rec.onspeechstart = function () { T.orb.pulse(0.6); };
      rec.onaudiostart = function () {
        C.audio = true;
        setStatus('Listening · ' + langName, 'live');
        $('cap-hint').textContent = 'Microphone on. Your browser’s speech service writes the transcript; this demo doesn’t store audio. Tap Stop when you’re done.';
      };
      rec.onerror = function (ev) {
        C.error = ev.error;
        var msg = {
          'not-allowed': 'Microphone permission was denied. Nothing was recorded.',
          'service-not-allowed': 'This browser doesn’t allow speech recognition here (common on file:// pages). Nothing was recorded.',
          network: 'Your browser’s speech service couldn’t be reached. Nothing was transcribed.',
          'no-speech': 'I didn’t hear anything. Try again, play a sample, or type instead.',
          'audio-capture': 'No microphone was found. Nothing was recorded.',
          aborted: 'Listening stopped.'
        }[ev.error] || ('Speech recognition stopped (' + ev.error + ').');
        if (ev.error === 'aborted') return;
        C.mode = 'error';
        setStatus('Couldn’t transcribe', 'error');
        $('cap-hint').textContent = msg + ' You can use a sample dictation below or type instead.';
        renderText();
      };
      rec.onend = function () {
        C.rec = null;
        if (C.mode === 'live' && C.open && !C.stopping) {
          // the browser ended on its own (silence): keep what we have and let the broker decide
          setStatus('Paused. Tap Stop to review the transcript', 'paused');
        }
      };
      rec.start();
    } catch (e) {
      C.mode = 'error';
      setStatus('Couldn’t start the microphone', 'error');
      $('cap-hint').textContent = 'Speech recognition failed to start here. Use a sample dictation or type instead.';
    }
  };
  C.playSample = function (id) {
    var smp = T.SAMPLES.filter(function (s) { return s.id === id; })[0];
    if (!smp) return;
    if (C.rec) { try { C.stopping = true; C.rec.abort(); } catch (e) { /* ignore */ } C.rec = null; C.stopping = false; }
    C.mode = 'sample'; C.sampleId = id; C.text = ''; C.interim = '';
    setStatus('Sample dictation · scripted, no microphone', 'sample');
    $('cap-hint').textContent = 'This plays a pre-written transcript so you can see the whole loop. With a supported browser, tap the mic to dictate your own.';
    renderSamples(id);
    var words = smp.text.split(' '), i = 0, my = ++C.playId;
    function next() {
      if (my !== C.playId || !C.open) return;
      if (i >= words.length) {
        C.text = smp.text; C.interim = ''; renderText();
        setStatus('Sample finished. Tap Stop to review the transcript', 'sample-done');
        C.sampleDone = true;
        if (C.autoStop) setTimeout(function () { if (my === C.playId && C.open) C.stop(); }, 500 * T.speed);
        return;
      }
      var chunk = Math.min(words.length, i + 2);
      C.text = words.slice(0, Math.max(0, chunk - 2)).join(' ');
      C.interim = words.slice(Math.max(0, chunk - 2), chunk).join(' ');
      i = chunk;
      renderText();
      T.orb.pulse(0.45 + (i % 5) * 0.1);
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
  C.stop = function () {
    if (!C.open) return;
    if (C.mode === 'sample' && !C.sampleDone) C.finishSampleNow();
    var text = (C.text + ' ' + C.interim).trim();
    var lang = C.mode === 'sample' ? (T.SAMPLES.filter(function (s) { return s.id === C.sampleId; })[0] || {}).lang : T.store.state.settings.recLang;
    var source = C.mode === 'sample' ? 'sample' : 'live';
    C.close();
    if (text) T.app.setDraft(text, 'voice', source, lang);
    else T.app.toast('Nothing was captured, so there’s nothing to review.');
  };
  C.cancel = function () {
    C.close();
    T.app.toast('Discarded. Nothing was saved.');
  };
  C.typeInstead = function () {
    C.close();
    var ta = document.getElementById('composer-input');
    if (ta) ta.focus();
  };
  C.close = function () {
    C.playId++;
    if (C.rec) { try { C.stopping = true; C.rec.abort(); } catch (e) { /* ignore */ } C.rec = null; }
    C.stopping = false;
    C.open = false; C.autoStop = false;
    clearInterval(C.timer);
    T.orb.stop();
    var el = $('capture');
    el.classList.remove('is-in');
    el.hidden = true;
    document.body.classList.remove('capturing');
    if (C.lastFocus && C.lastFocus.focus && document.body.contains(C.lastFocus)) { try { C.lastFocus.focus(); } catch (e) { /* ignore */ } }
  };
  window.addEventListener('resize', function () { if (C.open) T.orb.resize(); });
})();
