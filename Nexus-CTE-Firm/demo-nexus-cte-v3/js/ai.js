/* Nexus CTE V3 — IA en direct facultative (clé du visiteur) et capacités du navigateur.
   Trois usages seulement, tous en proposition : extraction des notes d'appel, retraitements à partir d'un grand livre,
   brouillon du sommaire aveugle. Même structure que les règles (schémas de R.SCHEMAS), validée avant usage;
   toute erreur bascule sur les règles et le dit. Rien ne part sans clé; rien ne s'exécute sans décision humaine. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, S = g.S, R = g.R, UI = g.UI;
  var busy = {};

  /* ---------------- Capacités (bascules du Labo de test) ---------------- */
  function caps() { return S.get().caps || {}; }
  // Les API vocales du navigateur passent aussi par le moniteur d'API (gratuites, mais mesurées et coupables).
  function gate(provider) { var M = meter(); if (!M) return { ok: true }; var c = M.check('nexus', provider); return c.ok ? c : { ok: false, reason: meterFr(c.reason) }; }
  function recordUse(provider, op, usage) { var M = meter(); if (!M) return; try { M.record({ app: 'nexus', provider: provider, op: op, usage: usage }); } catch (e) { /* ignoré */ } }
  g.Caps = {
    speech: function () { return caps().speech !== false && 'speechSynthesis' in g && gate('browser-tts').ok; },
    speechReason: function () { var gt = gate('browser-tts'); return caps().speech === false ? 'Synthèse vocale désactivée dans le Labo de test : la réplique reste écrite.' : !gt.ok ? 'Voix en pause (' + gt.reason + ') : la réplique reste écrite.' : 'Synthèse vocale indisponible dans ce navigateur : la réplique reste écrite.'; },
    voices: function () { return caps().voices !== false; },
    recognition: function () { return caps().recognition !== false && !!(g.SpeechRecognition || g.webkitSpeechRecognition) && gate('browser-speech').ok; },
    recognitionReason: function () { var gt = gate('browser-speech'); return caps().recognition === false ? 'Reconnaissance vocale désactivée dans le Labo de test : saisissez les notes au clavier.' : !gt.ok ? 'Dictée en pause (' + gt.reason + ') : saisissez les notes au clavier.' : 'Reconnaissance vocale non prise en charge par ce navigateur : saisissez les notes au clavier.'; },
    online: function () { return caps().online !== false; },
    gate: gate, record: recordUse
  };


  function lai() { return g.LiveAI || null; }
  function meter() { return g.ApiMeter || null; }
  try { if (g.LiveAI) g.LiveAI.app = 'nexus'; } catch (e) { /* ignoré */ }
  // Raisons du moniteur d'API (hub), en français.
  var METER_FR = [
    [/all APIs are off/i, 'interrupteur général coupé au moniteur d’API'], [/Nexus CTE is off/i, 'Nexus CTE coupé au moniteur d’API'], [/Anthropic is off/i, 'Anthropic coupé au moniteur d’API'], [/OpenRouter is off/i, 'OpenRouter coupé au moniteur d’API'], [/No OpenRouter key/i, 'aucune clé OpenRouter au moniteur d’API'], [/No OpenRouter model/i, 'aucun modèle OpenRouter choisi au moniteur d’API'],
    [/No Anthropic key/i, 'aucune clé Anthropic au moniteur d’API'], [/Monthly budget reached/i, 'budget mensuel atteint'], [/budget reached/i, 'budget de Nexus CTE atteint'], [/Rate limit/i, 'limite de 30 appels par minute'],
    [/Killswitch/i, 'interrupteur coupé au moniteur d’API']
  ];
  function meterFr(reason) { for (var i = 0; i < METER_FR.length; i++) if (METER_FR[i][0].test(reason || '')) return METER_FR[i][1]; return reason || 'moniteur d’API'; }
  // État de l'IA en direct : activée, désactivée (aucune clé) ou en pause (interrupteur, budget, Labo), avec la raison.
  function status() {
    var L = lai(), M = meter();
    if (!L || !L.available()) return { state: 'off', reason: 'SDK non chargé' };
    if (caps().liveAI === false) return { state: 'paused', reason: 'désactivée dans le Labo de test' };
    if (M) { var c = M.checkLlm('nexus'); if (!c.ok) return { state: /key|chosen/i.test(c.reason) ? 'off' : 'paused', reason: meterFr(c.reason) }; }
    else if (!L.isOn()) return { state: 'off', reason: 'aucune clé' };
    if (caps().online === false) return { state: 'paused', reason: 'hors ligne (Labo de test) : aucune requête' };
    return { state: 'on', reason: '' };
  }
  function available() { var st = status(); return st.state === 'on' || (st.state === 'paused' && caps().online === false && caps().liveAI !== false); }
  function offReason() { var st = status(); return st.state === 'on' ? null : 'IA en direct ' + (st.state === 'paused' ? 'en pause' : 'désactivée') + ' : ' + st.reason + '.'; }
  var FR = [
    [/Live AI is off/i, 'IA en direct désactivée'], [/API key was rejected/i, 'clé API refusée'], [/not allowed to use/i, 'cette clé n’a pas accès au modèle'], [/not available to this API key/i, 'modèle indisponible pour cette clé'],
    [/Rate limited/i, 'limite de débit atteinte'], [/request was rejected/i, 'requête refusée par l’API'], [/temporary problem/i, 'problème temporaire de l’API'], [/Could not reach the API/i, 'API injoignable'],
    [/Live AI is paused: (.*)/i, function (m) { return 'en pause, ' + meterFr(m[1]); }], [/model declined/i, 'le modèle a refusé la demande'], [/cut off/i, 'réponse tronquée'], [/not valid JSON/i, 'réponse non conforme (JSON invalide)'], [/was missing/i, 'réponse incomplète (champs obligatoires manquants)'], [/^Cancelled/i, 'annulé']
  ];
  function frDescribe(err) {
    if (err && err.name === 'ValidationError') return 'réponse invalide : ' + err.message.replace(/\.$/, '').toLowerCase();
    if (err && err.name === 'OfflineError') return err.message;
    var L = lai(), msg = L ? L.describe(err) : (err && err.message) || 'erreur';
    for (var i = 0; i < FR.length; i++) { var mm = FR[i][0].exec(msg); if (mm) return typeof FR[i][1] === 'function' ? FR[i][1](mm) : FR[i][1]; }
    return 'erreur de l’API (' + String(msg).slice(0, 80) + ')';
  }
  function call(o) {
    if (!g.Caps.online()) { var e = new Error('hors ligne (simulation du Labo de test) : aucune requête envoyée'); e.name = 'OfflineError'; return Promise.reject(e); }
    return lai().json({ system: o.system, prompt: o.prompt, schema: o.schema, effort: 'low', maxTokens: o.maxTokens || 4000 });
  }
  function validated(fn) { return function (res) { try { return { data: fn(res.data), provenance: res.provenance }; } catch (e) { var v = new Error(e.message); v.name = 'ValidationError'; throw v; } }; }
  function start(key) { busy[key] = true; UI.render(); UI.toast('Requête envoyée à ' + (lai() ? lai().model : 'claude-opus-5-5') + ' : le résultat reviendra en proposition.'); }
  function stop(key) { delete busy[key]; }
  var CONTEXT = 'Démonstration Nexus CTE : La Firme CTE est un cabinet fictif de transfert d’entreprise au Québec; toutes les entreprises, personnes et montants sont fictifs. Écris en français du Québec. Ne fournis que des faits présents dans le texte; n’invente aucun montant, nom ou date. Ta réponse est une proposition révisée par une personne avant tout usage.';

  /* ---------------- 1. Extraction des notes d'appel (structure Call-to-CRM) ---------------- */
  function extraction(leadId) {
    var c = S.lead(leadId), k = S.call(leadId), key = 'call-' + leadId;
    if (!k.notes || k.notes.trim().length < 20) { UI.toast('Ajoutez des notes d’appel avant l’extraction (20 caractères ou plus).', 'err'); return; }
    if (!available()) { UI.toast(offReason(), 'err'); return; }
    var red = R.redact(k.notes, [c.director]);
    var keys = D.INTAKE_KEYS.map(function (x) { return x.key + ' (' + x.field + ')'; }).join('; ');
    var system = CONTEXT + ' Tu es l’assistant Call-to-CRM : tu extrais des notes d’un appel avec un cédant potentiel les champs de la fiche, dans la structure JSON demandée. Chaque champ cite un extrait exact des notes, sans guillemets. Les noms de personnes ont été remplacés par [personne] (Loi 25). Clés permises : ' + keys + '. Formats : ageBand parmi « 35–44 », « 45–54 », « 55–64 », « 65+ »; exitHorizon en mois (« 36 mois »); employees « N employés »; advisor « conseille_par : <cabinet> »; email l’adresse exacte; callback « Rappel dans N mois ». disposition parmi : ' + D.DISPOSITIONS.join(', ') + '. Omets un champ absent des notes.';
    var prompt = 'Entreprise : ' + c.name + ' (SCIAN ' + c.scian + ', ' + c.city + ', ' + c.region + '). Signal REQ : ' + ((c.signals || [])[0] ? c.signals[0].detail : 'aucun') + '.\n\nNotes d’appel :\n' + red.text;
    start(key);
    call({ system: system, prompt: prompt, schema: R.SCHEMAS.extraction }).then(validated(function (d) { return R.VALIDATE.extraction(d, red.text); })).then(function (out) {
      stop(key); var r = UI.run('callExtract', { id: leadId, result: out.data, provenance: out.provenance });
      if (r.ok) UI.toast('Extraction proposée par l’IA en direct (' + U.num(out.provenance.ms / 1000, 1) + ' s, ' + red.count + ' nom' + (red.count > 1 ? 's' : '') + ' caviardé' + (red.count > 1 ? 's' : '') + ') : révisez chaque champ.');
    }, function (err) {
      stop(key); var why = frDescribe(err);
      UI.run('callExtract', { id: leadId, provenance: { source: 'rules', fallback: why }, fallback: why });
      UI.toast('IA en direct indisponible (' + why + ') : extraction par règles affichée.', 'err');
    });
  }

  /* ---------------- 2. Retraitements à partir d'un grand livre (structure Financial Forensics) ---------------- */
  function adjustments(mId, text, onIgnored) {
    var m = S.mandate(mId), key = 'adj-' + mId;
    if (!available()) { UI.toast(offReason(), 'err'); return; }
    var n = E.normalization(m), ys = m.fin.years;
    var red = R.redact(text, [m.profile.owner]);
    var system = CONTEXT + ' Tu es l’analyste Financial Forensics : tu proposes des retraitements du BAIIA à partir d’un grand livre ou de notes, dans la structure JSON demandée. Convention : un montant positif augmente le BAIIA. La rémunération du dirigeant au-delà d’un salaire de remplacement s’ajoute; un loyer payé sous le loyer marchand réduit le BAIIA; un gain sur cession se retire; une dépense personnelle s’ajoute; un revenu non réalisé est « Pro forma » et « agressif ». Une dépense présentée comme ponctuelle mais présente chaque année n’est pas non récurrente : recurring_risk = true et cote « agressif ». Utilise seulement les exercices ' + ys.join(', ') + '. Mets les lignes non retenues dans ignored_lines.';
    var prompt = 'Mandat ' + m.codename + ' (' + m.profile.sectorLabel + ', ' + m.profile.region + '). BAIIA déclaré : ' + ys.map(function (y) { return y + ' ' + m.fin.ebitda[y]; }).join(', ') + '. Ventes : ' + ys.map(function (y) { return y + ' ' + m.fin.revenue[y]; }).join(', ') + '. Retraitements déjà au dossier, à ne pas dupliquer : ' + (m.adjustments.map(function (a) { return a.label; }).join('; ') || 'aucun') + '.\n\nGrand livre ou notes :\n' + red.text;
    start(key);
    call({ system: system, prompt: prompt, schema: R.SCHEMAS.adjustments, maxTokens: 6000 }).then(validated(function (d) { return R.VALIDATE.adjustments(d, m); })).then(function (out) {
      stop(key); if (onIgnored) onIgnored(out.data);
      UI.run('adjProposals', { m: mId, items: out.data.adjustments, provenance: out.provenance });
    }, function (err) {
      stop(key); var why = frDescribe(err), res = R.adjustmentsFromText(text, m); if (onIgnored) onIgnored(res);
      if (res.adjustments.length) UI.run('adjProposals', { m: mId, items: res.adjustments, provenance: { source: 'rules', fallback: why }, fallback: why }); else UI.render();
      UI.toast('IA en direct indisponible (' + why + ') : ' + (res.adjustments.length ? res.adjustments.length + ' proposition' + (res.adjustments.length > 1 ? 's' : '') + ' par règles.' : 'les règles ne reconnaissent aucune ligne.'), 'err');
    });
  }

  /* ---------------- 3. Brouillon du sommaire aveugle (la vérification des noms passe ensuite) ---------------- */
  function teaser(mId) {
    var m = S.mandate(mId), key = 'tz-ai-' + mId;
    if (!m.normApproved) { UI.toast('Le sommaire se génère à partir du BAIIA retraité approuvé.', 'err'); return; }
    if (!available()) { UI.toast(offReason(), 'err'); return; }
    var f = R.teaserFacts(m), b = m.blind, notes = R.redact((m.teaserNotes || []).join('\n'), [m.profile.owner, m.profile.company]);
    var system = CONTEXT + ' Tu rédiges le sommaire aveugle (une page) d’un mandat de vente, dans la structure JSON demandée. Règles fermes : aucun nom de personne ou d’entreprise, aucune ville ni sous-région plus précise que la région, aucune année de fondation exacte, aucun superlatif vérifiable (seul, le plus important), aucun chiffre absent des données fournies. Ton sobre et factuel; 3 à 5 points saillants.';
    var prompt = 'Profil anonymisé autorisé : secteur « ' + b.sector + ' »; région « ' + m.profile.region + ' »; chiffre d’affaires ' + b.revenueBand + '; BAIIA retraité de la bande ' + b.ebitdaBand + '; ' + b.employeesBand + '; en activité depuis ' + b.age + '; structure : ' + (E.STRUCT_PHRASE[m.structure] || '') + '; ventes récurrentes ' + (m.profile.recurringPct || 0) + ' %; TCAC des ventes ' + U.num(f.cagr, 1) + ' %; immeuble : ' + (m.property ? 'offert séparément ou avec l’entreprise' : 'locaux loués') + '. Notes de la courtière (noms caviardés) :\n' + (notes.text || 'aucune');
    start(key);
    call({ system: system, prompt: prompt, schema: R.SCHEMAS.teaser }).then(validated(function (d) { return R.VALIDATE.teaser(d); })).then(function (out) {
      stop(key); UI.run('teaserGenerate', { m: mId, draft: out.data, provenance: out.provenance });
    }, function (err) {
      stop(key); var why = frDescribe(err);
      UI.run('teaserGenerate', { m: mId, provenance: { source: 'rules', fallback: why }, draft: R.teaserDraft(Object.assign({}, m, { teaserSeed: null })), fallback: why });
      UI.toast('IA en direct indisponible (' + why + ') : brouillon par règles affiché, vérifié de la même façon.', 'err');
    });
  }

  g.AI = { available: available, offReason: offReason, status: status, busy: function (k) { return !!busy[k]; }, extraction: extraction, adjustments: adjustments, teaser: teaser, frDescribe: frDescribe };
  try { if (lai()) lai().onChange(function () { UI.render(); }); } catch (e) { /* ignoré */ }
  try { if (meter()) meter().onChange(function () { UI.render(); }); } catch (e) { /* ignoré */ }
})(window);
