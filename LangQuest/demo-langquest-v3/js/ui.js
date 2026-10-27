/* LangQuest V3 — UI helpers: localisation overlays, phrase markup, sheets, toasts. */
'use strict';
(function () {
  const U = LQ.ui = {};
  const esc = LQ.art.esc;
  U.esc = esc;
  U.icon = LQ.art.icon;
  const st = () => LQ.store.state;

  /* Instruction-language overlay. Returns text in the enrollment's source language.
     If missing: uses the learner's explicit opt-in fallback (never silently). */
  U.Lf = (obj, src) => {
    if (obj == null) return { text: '', fb: false };
    if (typeof obj === 'string') return { text: obj, fb: false };
    src = src || LQ.store.source();
    if (obj[src]) return { text: obj[src], fb: false, lang: src };
    const enr = LQ.store.enr();
    const fbLang = (enr && enr.fallback) || 'en';
    const t = obj[fbLang] || obj.en || obj.fr || Object.values(obj)[0] || '';
    return { text: t, fb: true, lang: obj[fbLang] ? fbLang : (obj.en ? 'en' : Object.keys(obj)[0]) };
  };
  U.L = (obj, src) => U.Lf(obj, src).text;
  U.nm = s => String(s || '').replace(/\{name\}/g, (st().learner && st().learner.name) || 'Alex');
  /* Is this mission fully written in the given instruction language? */
  U.coverage = (m, src) => {
    const probe = [m.title, m.outcome, m.context && m.context.setup, m.context && m.context.line && m.context.line.m].concat((m.expressions || []).map(e => e.m)).concat((m.anticipate || []).map(a => a.prompt));
    return probe.filter(Boolean).every(o => typeof o === 'string' || o[src]);
  };
  U.trackSources = (track) => {
    const ms = LQ.missionsFor(track.id).filter(m => m.status === 'playable');
    return LQ.SOURCES.filter(s => ms.some(m => U.coverage(m, s.code))).map(s => s.code);
  };

  /* Target phrase with script mode, romanisation and direction handled per track. */
  U.phrase = (p, opts) => {
    opts = opts || {};
    const track = opts.track || LQ.store.track();
    const enr = LQ.store.enr(track && track.id) || {};
    const mode = track && track.scriptModes ? (enr.script || 'both') : 'native';
    const lang = (track && (track.tts && track.tts[0])) || 'und';
    const t = U.nm(p.t), r = U.nm(p.r || '');
    const dir = track && track.rtl ? 'rtl' : 'ltr';
    const main = '<span class="tgt" lang="' + esc(lang) + '" dir="' + dir + '">' + esc(t) + '</span>';
    const rom = r ? '<span class="rom" lang="' + esc(lang) + '-Latn" dir="ltr">' + esc(r) + '</span>' : '';
    if (mode === 'roman' && r) return '<span class="phr phr--roman">' + '<span class="tgt" lang="' + esc(lang) + '-Latn" dir="ltr">' + esc(r) + '</span></span>';
    if (mode === 'both' && r) return '<span class="phr phr--both">' + main + rom + '</span>';
    return '<span class="phr">' + main + '</span>';
  };
  /* Plain text a TTS engine should read (always the native script). */
  U.speakText = p => U.nm(p.t);
  U.voiceFor = (track, enr) => {
    if (!track) return null;
    let locales = track.tts.slice();
    if (track.regions && enr && enr.region) { const r = track.regions.find(x => x.id === enr.region); if (r) locales = [r.locale].concat(locales.filter(l => l !== r.locale)); }
    return { locales, never: track.never || [], allowNear: !!(enr && enr.voiceNear) };
  };
  U.srLocale = (track, enr) => {
    if (track.regions && enr && enr.region) { const r = track.regions.find(x => x.id === enr.region); if (r) return r.locale; }
    return track.sr;
  };
  U.voiceStatus = (track, enr) => {
    if (!LQ.speech.hasTTS) return { ok: false, text: 'This browser has no speech synthesis. Phrases are shown as text.' };
    const v = U.voiceFor(track, enr);
    if (LQ.store.cap('noVoice') && LQ.store.state.active === track.id) return { ok: false, text: 'Test lab: this device has no ' + v.locales[0] + ' voice. Phrases are shown as text, and no other variety is substituted.' };
    const f = LQ.speech.findVoice(v.locales, v);
    if (f) return { ok: true, exact: f.exact, name: f.voice.name, lang: f.voice.lang, text: (f.exact ? 'Device voice: ' : 'Nearby regional voice (you opted in): ') + f.voice.name + ' (' + f.voice.lang + ')' };
    const near = LQ.speech.nearVoice(v.locales, v.never);
    if (LQ.speech.voiceCount() === 0) return { ok: false, text: 'No device voices are loaded in this browser yet. Phrases are shown as text.' };
    return { ok: false, near: near ? near.lang : null, text: 'No ' + v.locales[0] + ' voice on this device. LangQuest won’t read ' + track.name + ' with a different variety' + (near ? ' (a ' + near.lang + ' voice is available if you opt in).' : '.') };
  };
  U.say = (p, opts) => {
    opts = opts || {};
    const track = opts.track || LQ.store.track(), enr = LQ.store.enr(track && track.id);
    const v = U.voiceFor(track, enr);
    const ch = opts.character && LQ.CHARACTERS[opts.character];
    const rate = (opts.slow ? 0.68 : opts.fast ? 1.18 : 1) * ((ch && ch.voice && ch.voice.rate) || 1);
    return LQ.speech.speak(U.speakText(p), Object.assign({}, v, { rate, pitch: (ch && ch.voice && ch.voice.pitch) || 1, onend: opts.onend, onstart: opts.onstart }));
  };
  U.sayNarrator = (text, src, opts) => {
    const s = LQ.SOURCES.find(x => x.code === src) || LQ.SOURCES[0];
    return LQ.speech.speak(text, Object.assign({ locales: s.voice, allowNear: true }, opts || {}));
  };

  /* Toasts */
  let toastTimer;
  /* toast(msg, kind, {undo}) — an Undo button restores what the last destructive action removed. */
  U.toast = (msg, kind, opts) => {
    opts = opts || {};
    const global = document.body.classList.contains('mode-studio') || document.body.classList.contains('lab-open') || document.body.classList.contains('search-open');
    ['toast', 'toast-global'].forEach(i => { const o = document.getElementById(i); if (o) o.classList.remove('is-on'); });
    const el = document.getElementById(global ? 'toast-global' : 'toast'); if (!el) return;
    U.toastUndo = opts.undo || null;
    el.innerHTML = '<span class="toast__in toast--' + (kind || 'info') + '">' + esc(msg) + (opts.undo ? '<button class="toast__undo" data-act="toast-undo">Undo</button>' : '') + '</span>';
    el.classList.add('is-on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.classList.remove('is-on'); U.toastUndo = null; }, opts.undo ? 7000 : 3400);
  };
  U.toastHide = () => { ['toast', 'toast-global'].forEach(i => { const o = document.getElementById(i); if (o) o.classList.remove('is-on'); }); U.toastUndo = null; };
  U.announce = (msg) => { const el = document.getElementById('sr-live'); if (el) { el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30); } };

  /* Sheets: modal panels inside the phone screen (or the studio), with focus trap and Escape. */
  let sheetReturn = null;
  U.sheet = (html, opts) => {
    opts = opts || {};
    const host = document.getElementById(opts.host || 'sheet-host');
    const scope = document.getElementById(opts.scope || 'view');
    host.innerHTML = '<div class="sheet-backdrop" data-act="sheet-close"></div><div class="sheet ' + (opts.cls || '') + '" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1"><div class="sheet__grip" aria-hidden="true"></div>' + html + '</div>';
    host.classList.add('is-open');
    ['view', 'tabbar', 'app-header'].forEach(i => { const el = document.getElementById(i); if (el) el.inert = true; });
    if (opts.scope === 'studio-main') { const el = document.getElementById('studio-main'); if (el) el.inert = true; }
    sheetReturn = document.activeElement;
    const sh = host.querySelector('.sheet');
    setTimeout(() => { const f = sh.querySelector('[autofocus], input, select, button:not([data-act="sheet-close"])'); (f || sh).focus(); }, 20);
  };
  U.closeSheet = () => {
    ['sheet-host', 'studio-sheet-host'].forEach(h => { const host = document.getElementById(h); if (host) { host.classList.remove('is-open'); host.innerHTML = ''; } });
    ['view', 'tabbar', 'app-header', 'studio-main'].forEach(i => { const el = document.getElementById(i); if (el) el.inert = false; });
    if (sheetReturn && document.contains(sheetReturn)) { try { sheetReturn.focus(); } catch (e) { } }
    sheetReturn = null;
  };
  U.sheetOpen = () => !!document.querySelector('.sheet-host.is-open, #sheet-host.is-open, #studio-sheet-host.is-open');
  document.addEventListener('keydown', (e) => {
    const open = document.querySelector('#sheet-host.is-open .sheet, #studio-sheet-host.is-open .sheet');
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); U.closeSheet(); return; }
    if (e.key === 'Tab') {
      const f = Array.from(open.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* Mascot lines follow the enrollment's instruction language (spec §10.2A.6). */
  const ML = {
    morning: { en: 'Morning, {name}. One real conversation today?', fr: 'Bonjour {name}. Une vraie conversation aujourd’hui ?', es: 'Buenos días, {name}. ¿Una conversación de verdad hoy?', ru: 'Доброе утро, {name}. Один настоящий разговор сегодня?' },
    due: { en: '{n} phrases want a quick hello in new places.', fr: '{n} expressions attendent un petit rappel ailleurs.', es: '{n} frases quieren un repaso en un sitio nuevo.', ru: '{n} фраз ждут повторения в новых местах.' },
    nodue: { en: 'Nothing to recall right now. Your memory is resting.', fr: 'Rien à revoir pour l’instant. Ta mémoire se repose.', es: 'Nada que repasar ahora. Tu memoria descansa.', ru: 'Пока нечего повторять. Память отдыхает.' },
    listen: { en: 'Listen first. No rush.', fr: 'Écoute d’abord. Rien ne presse.', es: 'Escucha primero. Sin prisa.', ru: 'Сначала послушайте. Не спешите.' },
    anticipate: { en: 'Say it before you see it. Guessing is how memory grows.', fr: 'Dis-le avant de le voir. C’est en devinant que la mémoire grandit.', es: 'Dilo antes de verlo. Adivinar hace crecer la memoria.', ru: 'Скажите, прежде чем увидите. Так растёт память.' },
    talk: { en: 'Any way you say it is fine, as long as it gets across.', fr: 'Peu importe la formule, tant que le sens passe.', es: 'Dilo como quieras, mientras se entienda.', ru: 'Говорите как угодно, главное, чтобы поняли.' },
    done: { en: 'That was a real conversation. Nicely done.', fr: 'C’était une vraie conversation. Bravo.', es: 'Eso fue una conversación de verdad. ¡Bien hecho!', ru: 'Это был настоящий разговор. Отлично.' },
    tryagain: { en: 'Not yet, and that’s useful. It’ll come back soon.', fr: 'Pas encore, et c’est utile. Ça reviendra bientôt.', es: 'Todavía no, y eso es útil. Volverá pronto.', ru: 'Пока нет, и это полезно. Скоро вернётся.' }
  };
  U.mascotLine = (k, vars, src) => { let t = U.L(ML[k], src); Object.entries(vars || {}).forEach(([a, b]) => { t = t.replace('{' + a + '}', b); }); return U.nm(t); };
  U.mascot = (state, size, label) => st().settings.mascot ? LQ.art.orbit(state, { size, label }) : '';

  U.trackBadge = (track, cls) => '<span class="tbadge ' + (cls || '') + '" aria-hidden="true">' + esc(track.glyph) + '</span>';
  U.pairLabel = (tid) => { const t = LQ.trackById(tid), e = LQ.store.enr(tid); return t.name + ', from ' + LQ.store.srcName(e ? e.source : 'en'); };
  U.list = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  U.fmtDur = s => { s = Math.round(s); const m = Math.floor(s / 60), r = s % 60; return m + ':' + String(r).padStart(2, '0'); };
  U.stateChip = (state, src) => { const d = LQ.SKILL_STATES.find(x => x.id === state); return '<span class="chip chip--' + state + '"><span class="chip__dot" aria-hidden="true"></span>' + esc(d[src] || d.en) + '</span>'; };
})();
