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
  /* Phones (iOS above all) only let audio and speech start inside a tap. The first tap unlocks one
     shared <audio> element and the speech engine; later playback, even after a network call, reuses them. */
  const SILENT = 'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YVAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
  let shared = null;
  S.audioEl = () => { if (!shared) { shared = new W.Audio(); shared.preload = 'auto'; } return shared; };
  const UNLOCK = ['pointerdown', 'touchend', 'keydown'];
  function unlock() {
    UNLOCK.forEach(e => document.removeEventListener(e, unlock, true));
    try { const a = S.audioEl(); if (!a.src || a.paused) { a.src = SILENT; const p = a.play(); if (p && p.catch) p.catch(() => { }); } } catch (e) { }
    try { if (synth && W.SpeechSynthesisUtterance && navigator.maxTouchPoints > 0) { const u = new W.SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } } catch (e) { }
  }
  if (typeof document !== 'undefined') UNLOCK.forEach(e => document.addEventListener(e, unlock, true));
  const norm = l => String(l || '').replace('_', '-').toLowerCase();
  S.voiceCount = () => voices.length;
  /* Voice ranking: the most natural voice wins for each locale. Exact locale first (a nearby
     regional variant only by opt-in, never a "never" locale); within that, names that signal a
     modern neural voice beat eSpeak and old desktop voices. */
  const NATURAL = /natural|neural|online|premium|enhanced|siri|google/i;
  const ROBOTIC = /espeak|mbrola|festival|pico\b|flite|robot/i;
  const OLD_DESKTOP = /^microsoft (david|zira|mark|hazel|george|susan|hedda|helena|hortense|julie|paul|pablo|laura|raul|sabina|haruka|ayumi|ichiro|irina|pavel|elsa|cosimo|heami|huihui|kangkang|yaoyao|tracy|danny|hanhan|zhiwei|naayf|hoda|asaf|heera|kalpana|hemant|maria|daniel)\b(?!.*(online|natural))/i;
  S.voiceScore = (v, want) => {
    const l = norm(v.lang), name = String(v.name || '');
    let sc = want && want.includes(l) ? 1000 - want.indexOf(l) : 0;
    if (NATURAL.test(name)) sc += 60;
    if (/premium|enhanced|neural|natural/i.test(name)) sc += 15;
    if (ROBOTIC.test(name)) sc -= 300;
    if (OLD_DESKTOP.test(name) || /desktop/i.test(name)) sc -= 40;
    if (v.default) sc += 1;
    return sc;
  };
  /* rankVoices(locales, {never, allowNear}) → [{voice, exact, score}] best first */
  S.rankVoices = (locales, opts) => {
    opts = opts || {};
    const want = (locales || []).map(norm), never = (opts.never || []).map(norm);
    if (cap('noVoice') && want.some(l => courseLocales().includes(l))) return [];
    const pool = cap('offline') ? (opts.voices || voices).filter(v => v.localService !== false) : (opts.voices || voices);
    const bases = want.map(l => l.split('-')[0]);
    return pool.map(v => {
      const l = norm(v.lang), exact = want.includes(l);
      const near = !exact && opts.allowNear && bases.includes(l.split('-')[0]) && !never.includes(l) && !never.includes(l.split('-')[0]);
      return exact || near ? { voice: v, exact, score: S.voiceScore(v, want) } : null;
    }).filter(Boolean).sort((a, b) => (b.exact - a.exact) || (b.score - a.score));
  };
  /* Best voice; a voice the learner picked for this course (voiceURI) wins while it's still valid. */
  S.findVoice = (locales, opts) => {
    opts = opts || {};
    if (!voices.length && !opts.voices) return null;
    const ranked = S.rankVoices(locales, opts);
    if (opts.voiceURI) { const pick = ranked.find(x => x.voice.voiceURI === opts.voiceURI || x.voice.name === opts.voiceURI); if (pick) return pick; }
    return ranked[0] || null;
  };
  S.nearVoice = (locales, never) => {
    if (!voices.length || cap('noVoice')) return null;
    const want = (locales || []).map(norm), nv = (never || []).map(norm);
    const bases = want.map(l => l.split('-')[0]);
    return voices.find(x => bases.includes(norm(x.lang).split('-')[0]) && !want.includes(norm(x.lang)) && !nv.includes(norm(x.lang)) && !nv.includes(norm(x.lang).split('-')[0])) || null;
  };
  S.RATE = { normal: 0.95, slow: 0.8, fast: 1.1 };
  /* Long text is split at punctuation so engines keep a natural phrasing (and don't stall). */
  S.chunks = (text) => {
    const t = String(text || '').trim(); if (t.length <= 140) return [t];
    const parts = t.split(/(?<=[.!?;:。！？؟।])\s+/), out = [];
    parts.forEach(pt => { if (pt.length <= 160) { out.push(pt); return; } let cur = ''; pt.split(/(?<=[,，、،])\s*/).forEach(c => { if ((cur + ' ' + c).length > 160 && cur) { out.push(cur); cur = c; } else cur = cur ? cur + ' ' + c : c; }); if (cur) out.push(cur); });
    return out.filter(Boolean);
  };
  const meter = () => W.ApiMeter || null;
  S.ttsGate = () => { const m = meter(); return m ? m.check('langquest', 'browser-tts') : { ok: true }; };
  let current = null, watchdog = null, speaking = false;
  S.isSpeaking = () => speaking;
  S.cancel = () => {
    clearTimeout(watchdog);
    if (LQ.voice && LQ.voice.stop) LQ.voice.stop();
    if (current && current.done) { const d = current.done; current = null; d('cancelled'); }
    speaking = false;
    try { synth && synth.cancel(); } catch (e) { }
  };
  /* speak(text, {locales, never, allowNear, voiceURI, rate, onstart, onend})
     returns {ok, voice, exact, reason}. onend always fires (watchdog guards silent engines).
     Metered as browser-tts: checked before speaking, recorded (chars) after. */
  S.speak = (text, o) => {
    o = o || {};
    const done = o.onend || (() => { });
    if (!S.hasTTS) { setTimeout(() => done('no-tts'), 0); return { ok: false, reason: 'no-tts' }; }
    const gate = S.ttsGate();
    if (!gate.ok) { setTimeout(() => done('blocked'), 0); return { ok: false, reason: 'blocked', why: gate.reason }; }
    const found = S.findVoice(o.locales, o);
    if (!found) { setTimeout(() => done('no-voice'), 0); return { ok: false, reason: 'no-voice' }; }
    S.cancel();
    const clean = String(text).replace(/\{name\}/g, ''), parts = S.chunks(clean);
    let finished = false, idx = 0, started = false;
    const t0 = Date.now();
    const finish = (why) => {
      if (finished) return; finished = true; clearTimeout(watchdog); speaking = false; if (current && current.token === token) current = null;
      const m = meter(); if (m && started) m.record({ app: 'langquest', provider: 'browser-tts', op: 'speak', model: found.voice.name, usage: { chars: clean.length }, ok: why !== 'error', ms: Date.now() - t0 });
      done(why || 'end');
    };
    const token = {};
    current = { token, done: finish };
    const one = () => {
      if (finished) return;
      const u = new W.SpeechSynthesisUtterance(parts[idx]);
      u.voice = found.voice; u.lang = found.voice.lang; u.rate = o.rate || S.RATE.normal; u.pitch = 1;
      u.onstart = () => { speaking = true; if (!started) { started = true; o.onstart && o.onstart(); } };
      u.onend = () => { clearTimeout(watchdog); if (++idx < parts.length) one(); else finish('end'); };
      u.onerror = (e) => finish(e && e.error === 'interrupted' ? 'cancelled' : 'error');
      if (o.onboundary) u.onboundary = o.onboundary;
      const est = Math.max(1400, (parts[idx].length * 85) / (u.rate || 1) + 1800);
      clearTimeout(watchdog); watchdog = setTimeout(() => { started = true; finish('timeout'); }, est);
      try { synth.speak(u); } catch (e) { finish('error'); }
    };
    one();
    return { ok: true, voice: found.voice.name, lang: found.voice.lang, exact: found.exact, tier: 'device' };
  };

  /* Speech recognition. listen({lang, onInterim, onFinal, onError, onEnd}) → {stop()} */
  let activeRec = null;
  S.srGate = () => { const m = meter(); return m ? m.check('langquest', 'browser-speech') : { ok: true }; };
  S.listen = (o) => {
    o = o || {};
    const gate = S.srGate();
    if (!gate.ok) { setTimeout(() => o.onError && o.onError('blocked'), 0); return { stop() { }, abort() { } }; }
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
    const t0 = Date.now();
    r.onend = () => { if (activeRec === r) activeRec = null; const m = meter(); if (m) m.record({ app: 'langquest', provider: 'browser-speech', op: 'listen', model: r.lang, usage: { seconds: Math.round((Date.now() - t0) / 100) / 10 }, ok: !errored }); o.onEnd && o.onEnd({ gotFinal, errored, text: finalText.trim() }); };
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
    'aborted': 'Listening stopped.',
    'blocked': 'Speech recognition is paused on the API monitor. Type your answer, or say it aloud and mark it yourself.'
  }[code] || 'Speech recognition stopped unexpectedly. Type your answer, or try again.');

  /* Recorder with a real input-level meter. */
  let rec = null, stream = null, chunks = [], ctx = null, analyser = null, raf = 0, recStart = 0, generation = 0;
  S.recording = () => !!rec;
  S.startRecording = (onLevel) => {
    if (!S.hasRecorder) return Promise.reject(new Error('unsupported'));
    const gen = ++generation;
    // made and resumed inside the tap, or iOS keeps it suspended and the level (and auto-stop) never moves
    try { const AC = W.AudioContext || W.webkitAudioContext; if (AC && onLevel) { ctx = new AC(); if (ctx.resume) ctx.resume(); } } catch (e) { ctx = null; }
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(s => {
      if (gen !== generation) { s.getTracks().forEach(t => t.stop()); throw new Error('stale'); }
      stream = s; chunks = [];
      rec = new W.MediaRecorder(s);
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.start(); recStart = Date.now();
      try {
        const AC = W.AudioContext || W.webkitAudioContext;
        if (AC && onLevel) {
          if (!ctx || ctx.state === 'closed') ctx = new AC();
          const src = ctx.createMediaStreamSource(s); analyser = ctx.createAnalyser(); analyser.fftSize = 512; src.connect(analyser);
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
      resolve(blob.size ? { url: URL.createObjectURL(blob), seconds: secs, size: blob.size, blob } : null);
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
