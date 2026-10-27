/* LangQuest V3 — honest wrappers around the browser's own speech tools.
   - speechSynthesis: reference audio, only with a voice whose locale matches exactly
     (or an explicitly opted-in nearby variant). Never substitutes a "never" locale.
   - SpeechRecognition: shows what the recognizer heard. It is NOT a pronunciation score.
   - MediaRecorder + AnalyserNode: record a take and show a real input level.
   Everything degrades to text when an API is missing or fails. */
'use strict';
(function () {
  const S = LQ.speech = {};
  const W = window;
  const synth = W.speechSynthesis || null;
  const Rec = W.SpeechRecognition || W.webkitSpeechRecognition || null;
  /* Capability toggles from the Test lab (no recognizer, no voice for the course locale, offline)
     are applied here, so every screen sees the same simulated device. */
  const cap = k => !!(LQ.store && LQ.store.state && LQ.store.state.caps && LQ.store.state.caps[k]);
  const realTTS = !!(synth && W.SpeechSynthesisUtterance), realSR = !!Rec;
  S.realSR = realSR; S.realTTS = realTTS;
  Object.defineProperty(S, 'hasTTS', { get: () => realTTS, configurable: true });
  Object.defineProperty(S, 'hasSR', { get: () => realSR && !cap('noSR') && !cap('offline'), configurable: true });
  S.hasRecorder = !!(W.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const courseLocales = () => { const st = LQ.store && LQ.store.state; const t = st && st.active && LQ.trackById(st.active); if (!t) return []; return (t.tts || []).concat((t.regions || []).map(r => r.locale)).filter(Boolean).map(l => String(l).replace('_', '-').toLowerCase()); };
  S.srBroken = null; // set to an error code once recognition fails in this session
  let voices = [];
  const listeners = new Set();
  function loadVoices() {
    try { voices = synth ? synth.getVoices() || [] : []; } catch (e) { voices = []; }
    listeners.forEach(fn => { try { fn(); } catch (e) { } });
  }
  if (S.hasTTS) { loadVoices(); try { synth.addEventListener('voiceschanged', loadVoices); } catch (e) { synth.onvoiceschanged = loadVoices; } }
  S.onVoices = fn => listeners.add(fn);
  const norm = l => String(l || '').replace('_', '-').toLowerCase();
  S.voiceCount = () => voices.length;
  /* Exact-locale match first; "near" variants only if allowed and not in the never-list. */
  S.findVoice = (locales, opts) => {
    opts = opts || {};
    if (!voices.length) return null;
    const want = (locales || []).map(norm);
    const never = (opts.never || []).map(norm);
    if (cap('noVoice') && want.some(l => courseLocales().includes(l))) return null;
    const pool = cap('offline') ? voices.filter(v => v.localService !== false) : voices;
    for (const l of want) { const v = pool.find(x => norm(x.lang) === l); if (v) return { voice: v, exact: true }; }
    if (opts.allowNear) {
      const bases = want.map(l => l.split('-')[0]);
      const v = pool.find(x => bases.includes(norm(x.lang).split('-')[0]) && !never.includes(norm(x.lang)) && !never.includes(norm(x.lang).split('-')[0]));
      if (v) return { voice: v, exact: false };
    }
    return null;
  };
  S.nearVoice = (locales, never) => {
    if (!voices.length || cap('noVoice')) return null;
    const want = (locales || []).map(norm), nv = (never || []).map(norm);
    const bases = want.map(l => l.split('-')[0]);
    return voices.find(x => bases.includes(norm(x.lang).split('-')[0]) && !want.includes(norm(x.lang)) && !nv.includes(norm(x.lang)) && !nv.includes(norm(x.lang).split('-')[0])) || null;
  };
  let current = null, watchdog = null, speaking = false;
  S.isSpeaking = () => speaking;
  S.cancel = () => {
    clearTimeout(watchdog);
    if (current && current.done) { const d = current.done; current = null; d('cancelled'); }
    speaking = false;
    try { synth && synth.cancel(); } catch (e) { }
  };
  /* speak(text, {locales, never, allowNear, rate, pitch, onstart, onend, onboundary})
     returns {ok, voice, exact, reason}. onend always fires (watchdog guards silent engines). */
  S.speak = (text, o) => {
    o = o || {};
    const done = o.onend || (() => { });
    if (!S.hasTTS) { setTimeout(() => done('no-tts'), 0); return { ok: false, reason: 'no-tts' }; }
    const found = S.findVoice(o.locales, o);
    if (!found) { setTimeout(() => done('no-voice'), 0); return { ok: false, reason: 'no-voice' }; }
    S.cancel();
    const u = new W.SpeechSynthesisUtterance(String(text).replace(/\{name\}/g, ''));
    u.voice = found.voice; u.lang = found.voice.lang; u.rate = o.rate || 1; u.pitch = o.pitch || 1;
    let finished = false;
    const finish = (why) => { if (finished) return; finished = true; clearTimeout(watchdog); speaking = false; if (current && current.u === u) current = null; done(why || 'end'); };
    current = { u, done: finish };
    u.onstart = () => { speaking = true; o.onstart && o.onstart(); };
    u.onend = () => finish('end');
    u.onerror = (e) => finish(e && e.error === 'interrupted' ? 'cancelled' : 'error');
    if (o.onboundary) u.onboundary = o.onboundary;
    const est = Math.max(1400, (String(text).length * 85) / (o.rate || 1) + 1800);
    watchdog = setTimeout(() => finish('timeout'), est);
    try { synth.speak(u); } catch (e) { finish('error'); return { ok: false, reason: 'error' }; }
    return { ok: true, voice: found.voice.name, lang: found.voice.lang, exact: found.exact };
  };

  /* Speech recognition. listen({lang, onInterim, onFinal, onError, onEnd}) → {stop()} */
  let activeRec = null;
  S.listen = (o) => {
    o = o || {};
    if (!Rec) { setTimeout(() => o.onError && o.onError('unsupported'), 0); return { stop() { } }; }
    try { if (activeRec) activeRec.abort(); } catch (e) { }
    let r;
    try { r = new Rec(); } catch (e) { setTimeout(() => o.onError && o.onError('unsupported'), 0); return { stop() { } }; }
    activeRec = r;
    r.lang = o.lang || 'en-US'; r.interimResults = true; r.maxAlternatives = 3; r.continuous = false;
    let finalText = '', gotFinal = false, errored = false;
    r.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) { finalText += res[0].transcript; gotFinal = true; o.onFinal && o.onFinal(finalText.trim(), Array.from(res).map(a => ({ t: a.transcript, c: a.confidence }))); }
        else interim += res[0].transcript;
      }
      if (interim && o.onInterim) o.onInterim((finalText + interim).trim());
    };
    r.onerror = (ev) => { errored = true; S.srBroken = ev.error || 'error'; o.onError && o.onError(ev.error || 'error'); };
    r.onend = () => { if (activeRec === r) activeRec = null; o.onEnd && o.onEnd({ gotFinal, errored, text: finalText.trim() }); };
    try { r.start(); } catch (e) { setTimeout(() => o.onError && o.onError('start-failed'), 0); }
    return { stop() { try { r.stop(); } catch (e) { } }, abort() { try { r.abort(); } catch (e) { } } };
  };
  S.stopListening = () => { try { activeRec && activeRec.abort(); } catch (e) { } activeRec = null; };
  S.srErrorText = (code) => ({
    'not-allowed': 'Microphone access was blocked. Allow it in the browser, or type or self-check your answer.',
    'service-not-allowed': 'This browser doesn’t allow speech recognition here. Type your answer, or say it aloud and mark it yourself.',
    'network': 'The browser’s recognizer needs a network connection it couldn’t reach. Type your answer, or say it aloud and mark it yourself.',
    'no-speech': 'No speech was detected. Try again closer to the microphone, or type instead.',
    'audio-capture': 'No microphone was found. Type your answer, or say it aloud and mark it yourself.',
    'language-not-supported': 'The browser’s recognizer doesn’t support this language. Type your answer, or say it aloud and mark it yourself.',
    'unsupported': 'This browser has no speech recognition. Type your answer, or say it aloud and mark it yourself.',
    'aborted': 'Listening stopped.'
  }[code] || 'Speech recognition stopped unexpectedly. Type your answer, or try again.');

  /* Recorder with a real input-level meter. */
  let rec = null, stream = null, chunks = [], ctx = null, analyser = null, raf = 0, recStart = 0, generation = 0;
  S.recording = () => !!rec;
  S.startRecording = (onLevel) => {
    if (!S.hasRecorder) return Promise.reject(new Error('unsupported'));
    const gen = ++generation;
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
      if (gen !== generation) { s.getTracks().forEach(t => t.stop()); throw new Error('stale'); }
      stream = s; chunks = [];
      rec = new W.MediaRecorder(s);
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.start(); recStart = Date.now();
      try {
        const AC = W.AudioContext || W.webkitAudioContext;
        if (AC && onLevel) {
          ctx = new AC(); const src = ctx.createMediaStreamSource(s); analyser = ctx.createAnalyser(); analyser.fftSize = 512; src.connect(analyser);
          const buf = new Uint8Array(analyser.fftSize);
          const tick = () => { if (!analyser) return; analyser.getByteTimeDomainData(buf); let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; } onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4)); raf = requestAnimationFrame(tick); };
          tick();
        }
      } catch (e) { }
      return true;
    });
  };
  S.stopRecording = () => new Promise(resolve => {
    cancelAnimationFrame(raf); analyser = null;
    try { ctx && ctx.close(); } catch (e) { } ctx = null;
    if (!rec) { resolve(null); return; }
    const r = rec, secs = (Date.now() - recStart) / 1000;
    r.onstop = () => {
      const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' });
      try { stream && stream.getTracks().forEach(t => t.stop()); } catch (e) { }
      stream = null; rec = null;
      resolve(blob.size ? { url: URL.createObjectURL(blob), seconds: secs, size: blob.size } : null);
    };
    try { r.stop(); } catch (e) { rec = null; resolve(null); }
  });
  S.abortRecording = () => { generation++; cancelAnimationFrame(raf); analyser = null; try { ctx && ctx.close(); } catch (e) { } ctx = null; try { rec && rec.state !== 'inactive' && rec.stop(); } catch (e) { } try { stream && stream.getTracks().forEach(t => t.stop()); } catch (e) { } rec = null; stream = null; };
  S.micErrorText = (err) => {
    const n = err && (err.name || err.message);
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Microphone access was blocked. You can still practise: say it aloud and compare with the reference.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No microphone was found on this device. Say it aloud and compare with the reference instead.';
    if (n === 'unsupported') return 'This browser can’t record audio. Say it aloud and compare with the reference instead.';
    return 'Recording didn’t start. Say it aloud and compare with the reference instead.';
  };
  /* Play a recorded take; resolves when it ends. */
  let takeAudio = null;
  S.playTake = (url) => new Promise(resolve => {
    try { takeAudio && takeAudio.pause(); } catch (e) { }
    takeAudio = new Audio(url); takeAudio.onended = () => resolve('end'); takeAudio.onerror = () => resolve('error');
    const p = takeAudio.play(); if (p && p.catch) p.catch(() => resolve('error'));
  });
  S.stopTake = () => { try { takeAudio && takeAudio.pause(); } catch (e) { } };
})();
