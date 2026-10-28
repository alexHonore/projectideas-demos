/* LangQuest V3 — natural voices in three tiers, chosen in this order:
     1. pre-generated neural clips: window.LQ_AUDIO[clipKey] → assets/audio/<course>/<key>.mp3
     2. live Gemini TTS, only through ApiMeter.gemini.tts (metered, killswitch- and budget-aware),
        cached in IndexedDB by model + voice + text so a phrase is paid for once
     3. the best device voice for the exact locale (ranked in speech.js; metered as browser-tts)
   Varieties that a general TTS model may not render faithfully (Arabic dialects, Cantonese,
   Haitian Creole, Kinyarwanda, Lingala, European Portuguese, some regional accents) never use
   tier 2: the spec forbids passing another variety off as the course's. The same rules are used by
   tools/generate-audio.mjs, so clip keys match. */
'use strict';
(function (root) {
  const LQ = root.LQ;
  const VX = LQ.voice = LQ.voice || {};

  /* ── policy: which course varieties may use a neural model, and how to ask for them ── */
  const OFF = {
    'ar-eastern': 'Levantine Arabic could come out as Modern Standard Arabic',
    'ar-moroccan': 'Moroccan Darija could come out as Modern Standard Arabic',
    'ar-egyptian': 'Egyptian Arabic could come out as Modern Standard Arabic',
    'zh-cantonese': 'Cantonese characters could be read in Mandarin',
    'haitian-creole': 'Haitian Creole could come out with a French accent',
    'kinyarwanda': 'Kinyarwanda isn’t reliably supported by the model',
    'lingala': 'Lingala isn’t reliably supported by the model',
    'pt-europe': 'European Portuguese could come out with a Brazilian accent'
  };
  const OFF_REGION = { 'french:ca': 'Québec French could come out as metropolitan French', 'es-latam:co': 'Colombian Spanish could come out as Mexican Spanish', 'es-latam:ar': 'Rioplatense Spanish could come out as Mexican Spanish', 'vietnamese:south': 'Southern Vietnamese could come out with a northern accent' };
  const ACCENT = { 'es-spain': 'Castilian Spanish from Madrid', 'french': 'French from Paris', 'english': 'American English from New York', 'es-latam': 'Mexican Spanish', 'pt-brazil': 'Brazilian Portuguese', 'ar-msa': 'Modern Standard Arabic', 'zh-mandarin': 'Mandarin Chinese', 'zh-simplified': 'Mandarin Chinese', 'japanese': 'Tokyo Japanese', 'korean': 'Seoul Korean', 'vietnamese': 'northern Vietnamese (Hanoi)' };
  const REGION_ACCENT = { 'english:gb': 'British English from London', 'french:fr': 'French from Paris', 'es-latam:mx': 'Mexican Spanish' };
  VX.OFF = OFF; VX.OFF_REGION = OFF_REGION;
  VX.policy = (track, region) => {
    if (!track) return { gemini: false, why: 'No course' };
    const rk = track.id + ':' + region;
    if (OFF[track.id]) return { gemini: false, why: OFF[track.id] };
    if (region && OFF_REGION[rk]) return { gemini: false, why: OFF_REGION[rk] };
    const accent = REGION_ACCENT[rk] || ACCENT[track.id] || track.name;
    return { gemini: true, accent, instruction: 'Say it naturally, like a friendly local, in ' + accent + ':' };
  };
  VX.narratorPolicy = (src) => ({ gemini: true, accent: (LQ.SOURCES.find(s => s.code === src) || { name: 'English' }).name, instruction: 'Read it clearly and warmly, like a language teacher, in ' + (LQ.SOURCES.find(s => s.code === src) || { name: 'English' }).name + ':' });

  /* ── Gemini prebuilt voices per speaker ── */
  const FEMALE = ['Kore', 'Aoede', 'Leda', 'Zephyr', 'Callirrhoe', 'Autonoe', 'Despina'];
  const MALE = ['Puck', 'Charon', 'Fenrir', 'Orus', 'Enceladus', 'Iapetus', 'Algenib'];
  VX.CHARACTER_VOICES = { lucia: 'Leda', andres: 'Charon', carmen: 'Zephyr', youssef: 'Orus', salma: 'Callirrhoe', emilie: 'Aoede', haruto: 'Iapetus', rafa: 'Puck', brahim: 'Algenib', theo: 'Fenrir', jordan: 'Enceladus' };
  const MALE_NAMES = ['Rami', 'Lin Wei', 'Jonas', 'Arjun', 'Thiago', 'Andrei', 'Minh', 'Patrick', 'Sora', 'Mathieu', 'Juma', 'Baraka', 'Karim'];
  VX.NARRATOR = 'Kore';
  const hash = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
  VX.hash = hash;
  VX.voiceFor = (o) => {
    o = o || {};
    if (o.narrator) return VX.NARRATOR;
    if (o.character && VX.CHARACTER_VOICES[o.character]) return VX.CHARACTER_VOICES[o.character];
    const name = o.speaker || (o.track && o.track.local && o.track.local.name) || 'Local';
    const list = MALE_NAMES.includes(name) ? MALE : FEMALE;
    return list[hash(name) % list.length];
  };
  /* Stable clip key, shared with tools/generate-audio.mjs. */
  VX.clipKey = (course, voice, text) => 'c' + hash(course + '|' + voice + '|' + String(text).trim()).toString(36);
  VX.clipPath = (course, key) => 'assets/audio/' + course + '/' + key + '.mp3';

  if (!root.document) return; // node (generation tool): policy, voices and keys only

  const S = LQ.store, meter = () => root.ApiMeter || null;
  const APP = 'langquest';
  /* ── IndexedDB cache for Gemini audio (model|voice|text → Blob) ── */
  const mem = new Map();
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((ok) => {
      try {
        const rq = root.indexedDB.open('langquest-voice', 1);
        rq.onupgradeneeded = () => { try { rq.result.createObjectStore('tts'); } catch (e) { } };
        rq.onsuccess = () => ok(rq.result); rq.onerror = () => ok(null); rq.onblocked = () => ok(null);
      } catch (e) { ok(null); }
    });
    return dbp;
  }
  VX.cacheGet = (key) => mem.has(key) ? Promise.resolve(mem.get(key)) : db().then(d => d ? new Promise(ok => { try { const r = d.transaction('tts').objectStore('tts').get(key); r.onsuccess = () => { const v = r.result || null; if (v) mem.set(key, v); ok(v); }; r.onerror = () => ok(null); } catch (e) { ok(null); } }) : null);
  VX.cachePut = (key, blob) => { mem.set(key, blob); return db().then(d => d ? new Promise(ok => { try { const tx = d.transaction('tts', 'readwrite'); tx.objectStore('tts').put(blob, key); tx.oncomplete = () => ok(true); tx.onerror = () => ok(false); } catch (e) { ok(false); } }) : false); };
  VX.cacheKey = (model, voice, text) => model + '|' + voice + '|' + text;

  /* ── tier status (for the tiny icon and the voice picker) ── */
  VX.geminiGate = () => { const m = meter(); if (!m) return { ok: false, reason: 'API monitor not loaded' }; if (LQ.store && LQ.store.cap && LQ.store.cap('offline')) return { ok: false, reason: 'Offline (Test lab)' }; return m.check(APP, 'gemini'); };
  VX.hasClips = (course) => Object.values(root.LQ_AUDIO || {}).some(c => c && c.c === course);
  VX.tierFor = (track, enr) => {
    enr = enr || {};
    const pol = VX.policy(track, enr.region), g = VX.geminiGate();
    if (VX.hasClips(track.id)) return { tier: 'clip', icon: 'film', label: 'Studio clips', why: 'Pre-generated neural recordings for this course.' };
    if (pol.gemini && enr.neural !== false && g.ok) return { tier: 'gemini', icon: 'sparkle', label: 'Neural voice', why: 'Gemini TTS through the API monitor, cached after the first play.' };
    const f = LQ.speech.findVoice(LQ.ui.voiceFor(track, enr).locales, Object.assign({}, LQ.ui.voiceFor(track, enr), { voiceURI: enr.voiceURI }));
    const tts = LQ.speech.ttsGate();
    const neuralWhy = !pol.gemini ? 'Neural voice off for this variety: ' + pol.why + '.' : enr.neural === false ? 'Neural voice switched off for this course.' : 'Neural voice paused: ' + g.reason + '.';
    if (f && tts.ok) return { tier: 'device', icon: 'volume', label: 'Device voice', why: f.voice.name + ' (' + f.voice.lang + '). ' + neuralWhy };
    const loc = LQ.ui.voiceFor(track, enr).locales[0], sim = LQ.store && LQ.store.cap && LQ.store.cap('noVoice');
    return { tier: 'text', icon: 'text', label: 'Text only', why: (!tts.ok ? 'Browser voices paused: ' + tts.reason + '. ' : sim ? 'Test lab: this device has no ' + loc + ' voice; no other variety is substituted. ' : 'No ' + loc + ' voice on this device; no other variety is substituted. ') + neuralWhy };
  };
  VX.last = null;

  /* ── playback ── */
  let audio = null, pending = null, gen = 0;
  VX.stop = () => { gen++; if (audio) { try { audio.pause(); } catch (e) { } audio = null; } if (pending) { const d = pending; pending = null; d('cancelled'); } };
  function playUrl(url, rate, o, g, onfail) {
    const a = new root.Audio(url); audio = a; a.playbackRate = rate; try { a.preservesPitch = true; } catch (e) { }
    let done = false;
    const end = (why) => { if (done) return; done = true; if (pending === fin) pending = null; if (audio === a) audio = null; o.onend && o.onend(why); };
    const fin = (why) => end(why); pending = fin;
    a.onplaying = () => { if (g === gen) o.onstart && o.onstart(); };
    a.onended = () => end('end');
    a.onerror = () => { if (done || g !== gen) return; done = true; pending = null; audio = null; onfail(); };
    const p = a.play(); if (p && p.catch) p.catch(() => { if (done || g !== gen) return; done = true; pending = null; audio = null; onfail(); });
  }
  /* play(p, {track, enr, character, speaker, narrator, src, slow, fast, onstart, onend}) → {ok, tier} */
  VX.play = (p, o) => {
    o = o || {};
    VX.stop(); try { root.speechSynthesis && root.speechSynthesis.cancel(); } catch (e) { }
    const g = gen, track = o.track, enr = o.enr || {};
    const text = LQ.ui.speakText(p).trim(); if (!text) { setTimeout(() => o.onend && o.onend('empty'), 0); return { ok: false, reason: 'empty' }; }
    const course = track ? track.id : 'narration', voice = VX.voiceFor(o);
    const rate = o.slow ? LQ.speech.RATE.slow : o.fast ? LQ.speech.RATE.fast : 1;
    const device = () => {
      if (g !== gen) return;
      VX.last = { tier: 'device' };
      const v = o.narrator ? { locales: (LQ.SOURCES.find(s => s.code === o.src) || LQ.SOURCES[0]).voice, allowNear: true } : LQ.ui.voiceFor(track, enr);
      const r = LQ.speech.speak(text, Object.assign({}, v, { voiceURI: o.narrator ? null : enr.voiceURI, rate: o.slow ? LQ.speech.RATE.slow : o.fast ? LQ.speech.RATE.fast : LQ.speech.RATE.normal, onstart: o.onstart, onend: o.onend }));
      if (r.ok) VX.last = { tier: 'device', voice: r.voice };
      return r;
    };
    // 1. pre-generated clip
    const key = VX.clipKey(course, voice, text);
    if (root.LQ_AUDIO && root.LQ_AUDIO[key]) {
      VX.last = { tier: 'clip', voice };
      playUrl(VX.clipPath(course, key), rate, o, g, () => { VX.lastError = 'clip missing'; tier2(); });
      return { ok: true, tier: 'clip' };
    }
    // 2. live Gemini, metered and cached
    function tier2() {
      const pol = o.narrator ? VX.narratorPolicy(o.src) : VX.policy(track, enr.region);
      const gate = VX.geminiGate();
      if (!pol.gemini || enr.neural === false || !gate.ok || S.cap('offline')) return device();
      const m = meter(), model = m.model('tts'), prompt = pol.instruction + ' ' + text, ck = VX.cacheKey(model, voice, prompt);
      VX.last = { tier: 'gemini', voice };
      VX.cacheGet(ck).then(hit => {
        if (g !== gen) return null;
        if (hit) { VX.last = { tier: 'gemini', voice, cached: true }; return hit; }
        return m.gemini.tts({ app: APP, text: prompt, voice }).then(r => { VX.cachePut(ck, r.blob); S.event('voice.generated', 'Neural voice (' + voice + ') for “' + text.slice(0, 40) + '”, metered'); S.save(); return r.blob; });
      }).then(blob => {
        if (!blob || g !== gen) return;
        const url = URL.createObjectURL(blob);
        playUrl(url, rate, Object.assign({}, o, { onend: (w) => { setTimeout(() => URL.revokeObjectURL(url), 1000); o.onend && o.onend(w); } }), g, device);
      }).catch(err => { if (g !== gen) return; VX.lastError = (err && err.message) || 'Gemini failed'; S.event('voice.fallback', 'Neural voice unavailable (' + VX.lastError + '); device voice used'); device(); });
      return true;
    }
    const t2 = tier2();
    return t2 === true ? { ok: true, tier: 'gemini' } : (t2 || { ok: false, reason: 'cancelled' });
  };
})(typeof window !== 'undefined' ? window : globalThis);
