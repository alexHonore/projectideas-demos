/* LangQuest V3 — shared "say it" capture widget.
   One primary microphone action (browser speech recognition when available, otherwise
   recording), plus accessible alternatives: record my voice, type, or "I said it aloud". */
'use strict';
(function () {
  const C = LQ.cap = { key: null, mode: null, interim: '', typing: {}, takes: {}, handlers: {}, error: null };
  const U = LQ.ui, ic = U.icon, esc = U.esc, SP = LQ.speech;
  let srCtl = null, startedAt = 0;
  C.on = (key, fn) => { C.handlers[key] = fn; };
  /* Recognition is usable when the browser has it, it hasn't failed, and the API monitor allows it. */
  C.srUsable = () => SP.hasSR && !SP.srBroken && SP.srGate().ok;
  C.srPaused = () => { if (!SP.hasSR) return null; const g = SP.srGate(); return g.ok ? null : g.reason; };
  C.busy = () => !!C.mode;
  const addSpeaking = () => { if (startedAt) { LQ.store.state.speakingSeconds += Math.min(30, (Date.now() - startedAt) / 1000); startedAt = 0; LQ.store.save(); } };
  function emit(key, attempt) { const fn = C.handlers[key]; C.error = null; C.mode = null; C.key = null; C.interim = ''; if (fn) fn(attempt); else LQ.app.render(); }
  C.stopAll = () => { if (srCtl) { try { srCtl.abort(); } catch (e) { } srCtl = null; } if (SP.recording()) SP.abortRecording(); C.mode = null; C.key = null; C.interim = ''; addSpeaking(); };
  C.clearTakes = () => { Object.values(C.takes).forEach(t => { try { URL.revokeObjectURL(t.url); } catch (e) { } }); C.takes = {}; };

  C.speak = (key, lang) => {
    if (C.mode) { // second press stops
      if (C.mode === 'sr' && srCtl) { srCtl.stop(); return; }
      if (C.mode === 'rec') { C.stopRecord(key); return; }
    }
    SP.cancel(); // barge-in: stop any character speech immediately
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
  C.record = (key) => {
    if (C.mode === 'rec') { C.stopRecord(key); return; }
    if (!SP.hasRecorder) { C.errorKey = key; C.error = SP.micErrorText({ name: 'unsupported' }); LQ.app.render(); return; }
    SP.cancel(); C.error = null; C.errorKey = key; C.mode = 'rec-wait'; C.key = key; LQ.app.render();
    SP.startRecording(level => { const b = document.getElementById('cap-level'); if (b) b.style.transform = 'scaleX(' + Math.max(0.04, level).toFixed(3) + ')'; })
      .then(() => { C.mode = 'rec'; startedAt = Date.now(); LQ.app.render(); })
      .catch(err => { if (err && err.message === 'stale') return; C.mode = null; C.key = null; C.error = SP.micErrorText(err); LQ.app.render(); });
  };
  C.stopRecord = (key) => {
    SP.stopRecording().then(take => {
      addSpeaking();
      if (take) { if (C.takes[key]) { try { URL.revokeObjectURL(C.takes[key].url); } catch (e) { } } C.takes[key] = take; emit(key, { mode: 'record', take }); }
      else { C.mode = null; C.key = null; C.error = 'The recording was empty. Check the microphone and try again.'; LQ.app.render(); }
    });
  };
  C.typed = (key, text) => { C.typing[key] = false; if (!text || !text.trim()) { LQ.app.render(); return; } emit(key, { mode: 'typed', text: text.trim() }); };
  C.self = (key) => emit(key, { mode: 'self' });

  /* Widget markup. opts: {lang, rtl, label, compact, allowSelf, allowType, allowRecord} */
  C.parts = (key, opts) => {
    opts = opts || {};
    const active = C.key === key ? C.mode : null;
    const sr = C.srUsable();
    const primaryLabel = active === 'sr' ? 'Listening… tap to finish' : active === 'rec' ? 'Recording… tap to stop' : active === 'rec-wait' ? 'Waiting for the microphone…' : (opts.label || (sr ? 'Tap and speak' : 'Tap to record yourself'));
    const paused = C.srPaused();
    const mic = '<button class="mic' + (active ? ' is-live' : '') + '" data-act="cap-speak" data-arg="' + key + '" aria-pressed="' + (!!active) + '" aria-label="' + esc(primaryLabel) + '" title="' + esc(primaryLabel) + '">' + ic(active === 'sr' || active === 'rec' ? 'stop' : 'mic') + '</button><p class="cap__status" role="status">' + esc(primaryLabel) + (paused ? ' <span class="paused" title="Speech recognition paused: ' + esc(paused) + '. Recording and typing still work." aria-label="Speech recognition paused: ' + esc(paused) + '">' + ic('pausecircle', 'ic--xs') + '</span>' : '') + '</p>';
    let x = '';
    if (active === 'sr') x += '<p class="cap__interim" id="cap-interim" lang="' + esc(opts.lang || '') + '" dir="auto">' + esc(C.interim) + '</p>' + U.info('The browser’s recognizer is transcribing. It shows words, not pronunciation quality.', 'About recognition');
    if (active === 'rec') x += '<div class="level" aria-hidden="true"><span id="cap-level"></span></div>' + U.info('Live microphone level. Your take stays in this tab only.', 'About recording');
    if (C.error && C.errorKey === key && !active) x += '<p class="cap__err">' + ic('info', 'ic--sm') + '<span>' + esc(C.error) + '</span></p>';
    if (!active) {
      x += '<div class="cap__alts">';
      if (sr && SP.hasRecorder && opts.allowRecord !== false) x += '<button class="altbtn" data-act="cap-record" data-arg="' + key + '" aria-label="Record my voice" title="Record my voice">' + ic('audio', 'ic--sm') + '</button>';
      if (opts.allowType !== false) x += '<button class="altbtn" data-act="cap-type" data-arg="' + key + '" aria-expanded="' + !!C.typing[key] + '" aria-label="' + (C.typing[key] ? 'Hide keyboard' : 'Type instead') + '" title="' + (C.typing[key] ? 'Hide keyboard' : 'Type instead') + '">' + ic('keyboard', 'ic--sm') + '</button>';
      if (opts.allowSelf !== false) x += '<button class="altbtn" data-act="cap-self" data-arg="' + key + '" aria-label="I said it aloud" title="I said it aloud">' + ic('check', 'ic--sm') + '</button>';
      x += '</div>';
      if (C.typing[key]) x += '<form class="typebox" data-submit="cap-typed" data-arg="' + key + '"><label class="sr-only" for="type-' + key + '">Type your answer</label><input id="type-' + key + '" name="t" type="text" autocomplete="off" dir="auto" lang="' + esc(opts.lang || '') + '" placeholder="Type it in ' + esc(opts.langName || 'the language') + '"><button class="btn btn--sm btn--primary" type="submit">Send</button></form>';
    }
    return { mic, extra: x, active };
  };
  /* Widget markup. opts: {lang, label, compact, allowSelf, allowType, allowRecord} */
  C.widget = (key, opts) => {
    const p = C.parts(key, opts);
    return '<div class="cap' + (opts && opts.compact ? ' cap--compact' : '') + (p.active ? ' is-' + p.active : '') + '" data-cap="' + key + '">' + p.mic + p.extra + '</div>';
  };
  /* Comparison of what the recognizer heard (or what was typed) against the target. */
  C.compareHtml = (target, attempt) => {
    if (!attempt || (attempt.mode !== 'speech' && attempt.mode !== 'typed')) return '';
    const c = LQ.match.compare(target, attempt.text);
    const label = attempt.mode === 'speech' ? 'What the recognizer heard' : 'What you typed';
    return '<div class="cmp"><p class="cmp__head">' + ic(attempt.mode === 'speech' ? 'ear' : 'keyboard', 'ic--sm') + '<span>' + label + ': <q dir="auto">' + esc(attempt.text) + '</q></span></p>' +
      '<p class="cmp__words" aria-label="Target words, marked heard or not heard">' + c.tokens.map(t => '<span class="w ' + (t.heard ? 'w--hit' : 'w--miss') + '">' + (t.heard ? ic('check', 'ic--xs') : '<span class="w__ring" aria-hidden="true"></span>') + esc(t.w) + '<span class="sr-only">' + (t.heard ? ' heard' : ' not heard') + '</span></span>').join(c.spaced ? ' ' : '') + '</p>' +
      '<p class="cmp__sum">' + c.heardCount + ' of ' + c.total + ' target ' + (c.spaced ? 'words' : 'characters') + ' ' + (attempt.mode === 'speech' ? 'recognised' : 'matched') + (c.extra.length ? '; extra: ' + esc(c.extra.slice(0, 4).join(' ')) : '') + '.</p>' +
      (attempt.mode === 'speech' ? '<p class="cmp__honest">Not a score ' + U.info('Not a pronunciation score. Recognizers often “fix” what they hear, so a match doesn’t prove your accent and a miss can be the microphone. No validated pronunciation scorer is connected in this demo.', 'Why this is not a score') + '</p>' : '') + '</div>';
  };
  C.takeHtml = (key, model) => {
    const t = C.takes[key]; if (!t) return '';
    return '<div class="take">' + ic('audio', 'ic--sm') + '<span>Your take, ' + t.seconds.toFixed(1) + ' s</span><button class="btn btn--sm" data-act="take-play" data-arg="' + key + '">' + ic('play', 'ic--xs') + 'Play me</button>' +
      (model ? '<button class="btn btn--sm" data-act="take-compare" data-arg="' + key + '">' + ic('loop', 'ic--xs') + 'Model, then me</button>' : '') + '</div>';
  };
})();
