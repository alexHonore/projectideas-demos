/* LangQuest V3 — shared "say it" capture widget.
   One primary microphone action, plus accessible alternatives: record my voice, type, or "I said it aloud".
   The microphone uses, in order: AI transcription (the engine chosen on the hub's API page, which works
   in every browser with a microphone; the recording stops by itself when you pause), the browser's own
   recognizer, or a plain recording. Whatever was heard or typed gets a clear verdict against the target. */
'use strict';
(function () {
  const C = LQ.cap = { key: null, mode: null, interim: '', typing: {}, takes: {}, handlers: {}, error: null, langs: {}, aiBroken: null };
  const U = LQ.ui, ic = U.icon, esc = U.esc, SP = LQ.speech;
  const MON = () => window.ApiMeter || null;
  let srCtl = null, startedAt = 0, vad = 0;
  C.on = (key, fn) => { C.handlers[key] = fn; };
  /* Recognition is usable when the browser has it, it hasn't failed, and the API monitor allows it. */
  C.srUsable = () => SP.hasSR && !SP.srBroken && SP.srGate().ok;
  C.srPaused = () => { if (!SP.hasSR) return null; const g = SP.srGate(); return g.ok ? null : g.reason; };
  /* AI transcription is usable with a microphone, a transcription engine ready on the API page, and the network. */
  C.aiUsable = () => { const m = MON(); return !!(m && SP.hasRecorder && !C.aiBroken && !(LQ.store.cap && LQ.store.cap('offline')) && m.checkStt('langquest').ok); };
  C.canSpeak = () => C.aiUsable() || C.srUsable();
  C.busy = () => !!C.mode;
  const addSpeaking = () => { if (startedAt) { LQ.store.state.speakingSeconds += Math.min(30, (Date.now() - startedAt) / 1000); startedAt = 0; LQ.store.save(); } };
  function emit(key, attempt) { const fn = C.handlers[key]; C.error = null; C.mode = null; C.key = null; C.interim = ''; if (fn) fn(attempt); else LQ.app.render(); }
  C.stopAll = () => { clearInterval(vad); if (srCtl) { try { srCtl.abort(); } catch (e) { } srCtl = null; } if (SP.recording()) SP.abortRecording(); C.mode = null; C.key = null; C.interim = ''; addSpeaking(); };
  C.clearTakes = () => { Object.values(C.takes).forEach(t => { try { URL.revokeObjectURL(t.url); } catch (e) { } }); C.takes = {}; };

  C.speak = (key, lang) => {
    if (C.mode) { // second press stops
      if (C.mode === 'sr' && srCtl) { srCtl.stop(); return; }
      if (C.mode === 'rec' || C.mode === 'ai') { C.stopRecord(key); return; }
      return; // waiting for the microphone or the transcript
    }
    SP.cancel(); // barge-in: stop any character speech immediately
    if (lang) C.langs[key] = lang;
    if (C.aiUsable()) { C.record(key, { transcribe: true }); return; }
    if (!C.srUsable()) { C.record(key); return; }
    if (!LQ.store.state.settings.srConsent) { LQ.app.srConsent(() => C.speak(key, lang)); return; }
    C.error = null; C.errorKey = key; C.mode = 'sr'; C.key = key; C.interim = ''; startedAt = Date.now();
    LQ.app.render();
    let finalText = '';
    srCtl = SP.listen({
      lang,
      onInterim: t => { C.interim = t; const el = document.getElementById('cap-interim'); if (el) el.textContent = t; },
      onFinal: t => { finalText = t; },
      onError: code => { C.error = SP.srErrorText(code); if (code !== 'no-speech' && code !== 'aborted') SP.srBroken = code; },
      onEnd: (r) => { srCtl = null; addSpeaking(); if (finalText) emit(key, { mode: 'speech', text: finalText }); else { C.mode = null; C.key = null; if (!C.error) C.error = SP.srErrorText('no-speech'); LQ.app.render(); } }
    });
  };
  /* Record a take. With AI transcription it becomes a checked answer: it stops by itself after a
     pause (or at 15 s, or on a second tap) and the transcript is compared with the target. */
  C.record = (key, opts) => {
    opts = opts || {};
    if (C.mode === 'rec' || C.mode === 'ai') { C.stopRecord(key); return; }
    if (C.mode) return;
    if (!SP.hasRecorder) { C.errorKey = key; C.error = SP.micErrorText({ name: 'unsupported' }); LQ.app.render(); return; }
    const transcribe = opts.transcribe != null ? opts.transcribe : C.aiUsable();
    SP.cancel(); C.error = null; C.errorKey = key; C.mode = 'rec-wait'; C.key = key; C.transcribe = transcribe; LQ.app.render();
    let spoke = false, loudAt = 0;
    SP.startRecording(level => {
      const b = document.getElementById('cap-level'); if (b) b.style.transform = 'scaleX(' + Math.max(0.04, level).toFixed(3) + ')';
      if (level > 0.12) { spoke = true; loudAt = Date.now(); }
    }).then(() => {
      C.mode = transcribe ? 'ai' : 'rec'; startedAt = Date.now(); loudAt = Date.now(); LQ.app.render();
      if (!transcribe) return;
      clearInterval(vad);
      vad = setInterval(() => {
        if (C.mode !== 'ai' || C.key !== key) { clearInterval(vad); return; }
        const now = Date.now();
        if ((spoke && now - loudAt > 1400) || now - startedAt > 15000) { clearInterval(vad); C.stopRecord(key); }
      }, 120);
    }).catch(err => { if (err && err.message === 'stale') return; C.mode = null; C.key = null; C.error = SP.micErrorText(err); LQ.app.render(); });
  };
  C.stopRecord = (key) => {
    clearInterval(vad);
    const transcribe = C.mode === 'ai';
    if (transcribe) { C.mode = 'ai-wait'; LQ.app.render(); }
    SP.stopRecording().then(take => {
      addSpeaking();
      if (!take) { C.mode = null; C.key = null; C.error = 'The recording was empty. Check the microphone and try again.'; LQ.app.render(); return; }
      if (C.takes[key]) { try { URL.revokeObjectURL(C.takes[key].url); } catch (e) { } }
      C.takes[key] = take;
      if (!transcribe) { emit(key, { mode: 'record', take }); return; }
      const m = MON();
      m.transcribe({ app: 'langquest', blob: take.blob, lang: C.langs[key] || '', seconds: take.seconds }).then(r => {
        const text = String(r.text || '').trim();
        if (text) emit(key, { mode: 'speech', via: 'ai', text, take });
        else { C.mode = null; C.key = null; C.error = 'Nothing was heard in that take. Try again a little closer to the microphone.'; LQ.app.render(); }
      }, err => {
        const blocked = err && err.name === 'ApiMeterBlocked';
        if (!blocked) C.aiBroken = (err && err.message) || 'error';
        emit(key, { mode: 'record', take });
        C.errorKey = key;
        C.error = blocked ? 'Transcription paused: ' + err.message + '. Your take is kept; compare it by ear.' : 'AI transcription failed (' + C.aiBroken + '). Your take is kept; ' + (C.srUsable() ? 'the next try uses the browser’s recognizer.' : 'compare it by ear, or type.');
        LQ.app.render();
      });
    });
  };
  C.typed = (key, text) => { C.typing[key] = false; if (!text || !text.trim()) { LQ.app.render(); return; } emit(key, { mode: 'typed', text: text.trim() }); };
  C.self = (key) => emit(key, { mode: 'self' });

  /* Verdict for what was heard or typed against the target: ok (all, or nearly all, the target words),
     close (at least half), miss. Extra words never fail an answer. */
  C.verdict = (target, text) => {
    if (!text || !String(text).trim()) return null;
    const c = LQ.match.compare(target, text), r = c.total ? c.heardCount / c.total : 0;
    return { k: r >= 0.8 ? 'ok' : r >= 0.5 ? 'close' : 'miss', c, ratio: r };
  };
  /* A short sound (and a buzz on phones) for each verdict. */
  let cueCtx = null;
  C.cue = (k) => {
    if (!k || (LQ.store.state.settings && LQ.store.state.settings.sounds === false)) return;
    try { if (k === 'miss' && navigator.vibrate) navigator.vibrate(60); } catch (e) { }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      cueCtx = cueCtx && cueCtx.state !== 'closed' ? cueCtx : new AC(); if (cueCtx.resume) cueCtx.resume();
      const notes = k === 'ok' ? [660, 880] : k === 'close' ? [600, 600] : [330, 247], t0 = cueCtx.currentTime;
      notes.forEach((f, i) => {
        const o = cueCtx.createOscillator(), g = cueCtx.createGain(), t = t0 + i * 0.11;
        o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g); g.connect(cueCtx.destination); o.start(t); o.stop(t + 0.18);
      });
    } catch (e) { }
  };

  /* Widget markup. opts: {lang, rtl, label, compact, allowSelf, allowType, allowRecord} */
  C.parts = (key, opts) => {
    opts = opts || {};
    if (opts.lang) C.langs[key] = opts.lang;
    const active = C.key === key ? C.mode : null;
    const ai = C.aiUsable(), sr = C.srUsable();
    const primaryLabel = active === 'sr' ? 'Listening… tap to finish' : active === 'ai' ? 'Listening… pause or tap to finish' : active === 'ai-wait' ? 'Checking what you said…' : active === 'rec' ? 'Recording… tap to stop' : active === 'rec-wait' ? 'Waiting for the microphone…' : (opts.label || (ai || sr ? 'Speak' : 'Record yourself'));
    const paused = ai ? null : C.srPaused();
    const live = active === 'sr' || active === 'rec' || active === 'ai';
    const mic = '<button class="mic' + (active ? ' is-live' : '') + '" data-act="cap-speak" data-arg="' + key + '" aria-pressed="' + (!!active) + '" aria-label="' + esc(primaryLabel) + '" title="' + esc(primaryLabel) + '"' + (active === 'ai-wait' || active === 'rec-wait' ? ' aria-busy="true"' : '') + '>' + ic(live ? 'stop' : active ? 'loop' : 'mic') + '</button><p class="cap__status" role="status">' + esc(primaryLabel) + (paused ? ' <span class="paused" title="Speech recognition paused: ' + esc(paused) + '. Recording and typing still work." aria-label="Speech recognition paused: ' + esc(paused) + '">' + ic('pausecircle', 'ic--xs') + '</span>' : '') + '</p>';
    let x = '';
    if (active === 'sr') x += '<p class="cap__interim" id="cap-interim" lang="' + esc(opts.lang || '') + '" dir="auto">' + esc(C.interim) + '</p>' + U.info('The browser’s recognizer is transcribing. It shows words, not pronunciation quality.', 'About recognition');
    if (active === 'rec' || active === 'ai') x += '<div class="level" aria-hidden="true"><span id="cap-level"></span></div>' + U.info(active === 'ai' ? 'Your take is transcribed by the AI engine chosen on the hub’s API page (metered), then checked against the phrase. It stops by itself when you pause.' : 'Live microphone level. Your take stays in this tab only.', 'About recording');
    if (C.error && C.errorKey === key && !active) x += '<p class="cap__err">' + ic('info', 'ic--sm') + '<span>' + esc(C.error) + '</span></p>';
    if (!active) {
      x += '<div class="cap__alts">';
      if ((sr || ai) && SP.hasRecorder && opts.allowRecord !== false && !ai) x += '<button class="altbtn" data-act="cap-record" data-arg="' + key + '" aria-label="Record my voice" title="Record my voice">' + ic('audio', 'ic--sm') + '</button>';
      if (opts.allowType !== false) x += '<button class="altbtn" data-act="cap-type" data-arg="' + key + '" aria-expanded="' + !!C.typing[key] + '" aria-label="' + (C.typing[key] ? 'Hide keyboard' : 'Type instead') + '" title="' + (C.typing[key] ? 'Hide keyboard' : 'Type instead') + '">' + ic('keyboard', 'ic--sm') + '</button>';
      if (opts.allowSelf !== false) x += '<button class="altbtn" data-act="cap-self" data-arg="' + key + '" aria-label="I said it aloud" title="I said it aloud">' + ic('check', 'ic--sm') + '</button>';
      x += '</div>';
      if (C.typing[key]) x += '<form class="typebox" data-submit="cap-typed" data-arg="' + key + '"><label class="sr-only" for="type-' + key + '">Type your answer</label><input id="type-' + key + '" name="t" type="text" autocomplete="off" dir="auto" lang="' + esc(opts.lang || '') + '" placeholder="Type it in ' + esc(opts.langName || 'the language') + '"><button class="btn btn--sm btn--primary" type="submit">Check</button></form>';
    }
    return { mic, extra: x, active };
  };
  /* Widget markup. opts: {lang, label, compact, allowSelf, allowType, allowRecord} */
  C.widget = (key, opts) => {
    const p = C.parts(key, opts);
    return '<div class="cap' + (opts && opts.compact ? ' cap--compact' : '') + (p.active ? ' is-' + p.active : '') + '" data-cap="' + key + '">' + p.mic + p.extra + '</div>';
  };
  /* Verdict and word-by-word comparison of what was heard (or typed) against the target. */
  const VERDICT = { ok: ['check', 'Correct!'], close: ['loop', 'Almost'], miss: ['close', 'Not quite'] };
  C.compareHtml = (target, attempt) => {
    if (!attempt || !attempt.text || (attempt.mode !== 'speech' && attempt.mode !== 'typed')) return '';
    const v = C.verdict(target, attempt.text), c = v.c, d = VERDICT[v.k];
    const label = attempt.mode === 'typed' ? 'You typed' : attempt.via === 'ai' ? 'AI heard' : 'Recognizer heard';
    return '<div class="verdict verdict--' + v.k + '" role="status">' + '<span class="verdict__ic">' + ic(d[0]) + '</span><div><strong>' + d[1] + '</strong><span>' + label + ': <q dir="auto">' + esc(attempt.text) + '</q></span></div></div>' +
      '<div class="cmp"><p class="cmp__words" aria-label="Target words, marked heard or not heard">' + c.tokens.map(t => '<span class="w ' + (t.heard ? 'w--hit' : 'w--miss') + '">' + (t.heard ? ic('check', 'ic--xs') : '<span class="w__ring" aria-hidden="true"></span>') + esc(t.w) + '<span class="sr-only">' + (t.heard ? ' heard' : ' not heard') + '</span></span>').join(c.spaced ? ' ' : '') + '</p>' +
      '<p class="cmp__sum">' + c.heardCount + ' / ' + c.total + (c.spaced ? ' words' : ' characters') + (v.k !== 'ok' ? ' · expected <q dir="auto">' + esc(target) + '</q>' : '') + '</p>' +
      (attempt.mode === 'speech' ? '<p class="cmp__honest">Words, not accent ' + U.info('This checks the words that were heard, not your pronunciation. Transcribers often “fix” what they hear, so a match doesn’t prove your accent and a miss can be the microphone. No validated pronunciation scorer is connected in this demo.', 'Why this is not a pronunciation score') + '</p>' : '') + '</div>';
  };
  C.takeHtml = (key, model) => {
    const t = C.takes[key]; if (!t) return '';
    return '<div class="take">' + ic('audio', 'ic--sm') + '<span>Your take, ' + t.seconds.toFixed(1) + ' s</span><button class="btn btn--sm" data-act="take-play" data-arg="' + key + '">' + ic('play', 'ic--xs') + 'Play me</button>' +
      (model ? '<button class="btn btn--sm" data-act="take-compare" data-arg="' + key + '">' + ic('loop', 'ic--xs') + 'Model, then me</button>' : '') + '</div>';
  };
})();
