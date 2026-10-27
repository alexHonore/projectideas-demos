/* IA en direct (optionnelle) : radiographie d’un avis, « pourquoi ce prix ? », brouillon de question.
   Chaque appel retourne la même structure que les règles, est validé, et retombe sur les règles en cas d’erreur. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S, X = TS.X;
  const AI = (TS.AI = {});
  const fail = (code, message) => { const e = new Error(message); e.name = 'LiveAIError'; e.code = code; return e; };

  AI.on = () => !!(window.LiveAI && window.LiveAI.isOn());
  const FR = [
    [/^Live AI is off/, 'IA en direct désactivée : ajoutez une clé API dans le Labo de test.'],
    [/^The model declined this request:?\s*(.*)$/, (m) => 'Le modèle a refusé la demande' + (m[1] ? ' : ' + m[1] : '.')],
    [/^The answer was cut off/, 'Réponse tronquée avant la fin : essayez un texte plus court.'],
    [/^The answer was not valid JSON/, 'Réponse illisible (JSON invalide) : rien n’a été appliqué.'],
    [/^The answer was missing (.*), so nothing was applied\.$/, (m) => 'Réponse incomplète (' + m[1] + ' manquant) : rien n’a été appliqué.'],
    [/^The API key was rejected/, 'Clé API refusée : vérifiez-la dans le Labo de test.'],
    [/is not allowed to use/, 'Cette clé API n’a pas accès au modèle.'],
    [/is not available to this API key/, 'Modèle indisponible pour cette clé API.'],
    [/^Rate limited/, 'Limite de débit atteinte : réessayez dans un moment.'],
    [/^The request was rejected/, 'Requête refusée par l’API.'],
    [/temporary problem/, 'Problème temporaire de l’API.'],
    [/^Could not reach the API/, 'API injoignable : vérifiez votre connexion.'],
    [/^Cancelled/, 'Annulé.'],
    [/^API error (\d*)/, (m) => 'Erreur de l’API ' + m[1] + '.']
  ];
  /* Message en français, à partir de LiveAI.describe */
  AI.reason = (err) => {
    const msg = window.LiveAI ? window.LiveAI.describe(err) : String((err && err.message) || err);
    for (const [re, out] of FR) { const m = msg.match(re); if (m) return typeof out === 'function' ? out(m) : out; }
    return msg;
  };

  /* Contexte fictif transmis au modèle pour résoudre noms et pièces */
  AI.context = () => 'Contexte fictif de démonstration. Entreprise : ' + D.company.legalName + ', NEQ ' + D.company.neq + ', métiers : ' + D.company.trades.map((t) => t[1]).join(', ') + '. '
    + 'Coffre-fort : ' + S.state.vault.filter((v) => !v.removed).map((v) => v.title + ' (' + S.vaultStatus(v).label + ')').join('; ') + '. '
    + 'Donneurs d’ouvrage suivis : ' + Array.from(new Set(S.tenders().map((t) => t.buyer))).join(', ') + '. Date de la démo : ' + U.dayTime(S.now()) + ', heure de Montréal.';

  /* ---------- Radiographie d’un avis (texte collé ou PDF en base64) ---------- */
  AI.xray = async (text, pdf) => {
    if (!AI.on()) throw fail('off', 'Live AI is off.');
    const documents = pdf && pdf.base64 ? [{ base64: pdf.base64, mediaType: 'application/pdf', title: pdf.name || 'Avis' }] : undefined;
    const prompt = (documents ? 'Le document PDF joint est l’avis d’appel d’offres à radiographier.' + (text ? ' Texte extrait dans le navigateur, pour référence :\n\n' + text.slice(0, 60000) : '') : 'Avis d’appel d’offres à radiographier :\n\n' + text.slice(0, 60000));
    const res = await window.LiveAI.json({ system: X.system() + ' ' + AI.context(), prompt, schema: X.schema, documents, effort: 'low', maxTokens: 8000 });
    const bad = X.validateAI(res.data);
    if (bad) throw fail('format', bad);
    const ex = X.fromAI(res.data, text || '', { provenance: res.provenance });
    if (!ex.requirements.length) throw fail('format', 'Aucune exigence retournée.');
    return ex;
  };

  /* ---------- Pourquoi ce prix ? (ancré dans les chiffres de l’oracle) ---------- */
  const WHY_SCHEMA = { type: 'object', additionalProperties: false, required: ['text', 'numbers'], properties: { text: { type: 'string', description: 'Explication en français du Québec, 90 à 140 mots' }, numbers: { type: 'array', items: { type: 'string' }, description: 'Chaque montant cité dans le texte, tel qu’écrit' } } };
  AI.whyFacts = (id) => {
    const O = S.oracle(id), def = S.def(id), r = (x) => (x == null ? null : Math.round(x));
    return { appel: def.ref, acheteur: def.buyer, mode: O.mode, prixActuel: r(O.current), coutInterne: r(O.T.costC / 100), margeMinimale: def.minMargin, plancher: r(O.floor),
      zone: O.mode === 'bids' ? { bas: r(O.zoneLo), haut: r(O.zoneHi), cible: r(O.target) } : null, repere: r(O.A1), ecartMoyen1er2e: O.meanSpread != null ? Number(O.meanSpread.toFixed(4)) : null,
      position: O.zoneState, rangHistorique: O.rank || null, sur: O.rankOf || null, cible: r(O.target),
      cycles: O.cycles.map((c) => ({ annee: c.year, reference: c.ref, gagnant: c.winner ? c.winner.firm : c.award ? c.award.firm : null, montant: c.winner ? r(c.winner.amount) : c.award ? r(c.award.amount) : null, ajuste: c.winner ? r(c.winner.adjusted) : c.awardAdj != null ? r(c.awardAdj) : null, portee: Number(c.scope.toFixed(4)), inflation: Number(c.infl.toFixed(4)), origine: c.origin })) };
  };
  AI.allowed = (facts) => {
    const out = [];
    const walk = (v) => { if (typeof v === 'number' && Math.abs(v) >= 1000) out.push(Math.abs(v)); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    walk(facts);
    return out;
  };
  AI.checkWhy = (data, facts) => {
    const text = String(data.text || '').trim();
    if (text.length < 60) return 'Explication trop courte.';
    if (text.length > 1800) return 'Explication trop longue.';
    if (/probabilit|chances? de (gagner|l’emporter|remporter)|\d+\s*%\s*de chances/i.test(text)) return 'L’explication avançait une probabilité de gain, ce que TenderStrike refuse d’afficher.';
    const allowed = AI.allowed(facts);
    const cited = (data.numbers || []).concat(text.match(/\d{1,3}(?:[\s  ]\d{3})+(?:,\d+)?|\d{4,}/g) || []);
    for (const n of cited) {
      const v = Number(String(n).replace(/[^\d,]/g, '').replace(',', '.'));
      if (!isFinite(v) || v < 1000 || (v >= 1900 && v <= 2100)) continue;
      if (!allowed.some((a) => Math.abs(a - v) / a < 0.005)) return 'Montant non fourni par l’oracle (' + n + ') : explication rejetée.';
    }
    return null;
  };
  AI.why = async (id) => {
    if (!AI.on()) throw fail('off', 'Live AI is off.');
    const facts = AI.whyFacts(id);
    const res = await window.LiveAI.json({
      system: 'Tu expliques à la propriétaire d’une PME québécoise la recommandation de prix calculée par TenderStrike QC, en français du Québec, en 90 à 140 mots, sans jargon. Utilise uniquement les chiffres fournis en JSON; n’en invente aucun et n’en recalcule aucun. N’exprime aucune probabilité ni aucune chance de gagner : personne ne sait qui soumissionnera. Ne recommande aucun prix autre que ceux fournis. ' + AI.context(),
      prompt: 'Chiffres de l’oracle pour ' + facts.appel + ' :\n' + JSON.stringify(facts, null, 1) + '\nExplique pourquoi ce prix est recommandé et où se situe le prix actuel.',
      schema: WHY_SCHEMA, effort: 'low', maxTokens: 1500 });
    const bad = AI.checkWhy(res.data, facts);
    if (bad) throw fail('format', bad);
    return { text: String(res.data.text).trim(), provenance: res.provenance };
  };

  /* ---------- Brouillon de question au donneur d’ouvrage ---------- */
  const Q_SCHEMA = { type: 'object', additionalProperties: false, required: ['text'], properties: { text: { type: 'string', description: 'Question complète, prête à relire' } } };
  AI.question = async (id, rid) => {
    if (!AI.on()) throw fail('off', 'Live AI is off.');
    const def = S.def(id), r = rid ? S.reqById(id, rid) : null;
    const facts = { appel: def.ref, titre: def.title, acheteur: def.buyer, dateLimiteQuestions: def.questionsDeadline ? U.dayTime(def.questionsDeadline) : null, exigence: r ? { titre: r.title, section: r.sec, page: r.page, texte: S.clauseText(id, r.clause), lecture: r.plain } : null, signataire: D.company.contact + ', ' + D.company.legalName };
    const res = await window.LiveAI.json({
      system: 'Tu rédiges une question écrite au responsable d’un appel d’offres public québécois, au nom de ' + D.company.legalName + ', en français du Québec, ton professionnel, 60 à 130 mots. Cite l’article et la page visés. Demande une précision, jamais une dérogation. Ne mentionne aucun prix, coût ou montant de soumission. Termine par la signature fournie. ' + AI.context(),
      prompt: 'Données :\n' + JSON.stringify(facts, null, 1), schema: Q_SCHEMA, effort: 'low', maxTokens: 1200 });
    let text = String(res.data.text || '').trim();
    if (text.length < 40 || text.length > 1600) throw fail('format', 'Brouillon de longueur inattendue.');
    if (/\d[\d\s  ]*(?:,\d+)?\s*\$/.test(text)) throw fail('format', 'Le brouillon mentionnait un montant : rejeté.');
    if (text.indexOf(def.ref) < 0) text = 'Appel d’offres ' + def.ref + ' · ' + text;
    return { text, provenance: res.provenance };
  };
})();
