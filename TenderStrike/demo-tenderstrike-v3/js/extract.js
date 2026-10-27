/* Extraction d’un avis collé ou déposé : règles déterministes (par défaut) ou IA en direct (optionnelle).
   Les deux produisent la même structure { notice, requirements, segments } avec citations dans le texte. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U;
  const X = (TS.X = {});

  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const WORDNUM = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10 };
  const norm = (s) => String(s || '').replace(/[  ]/g, ' ').replace(/[’']/g, '’').replace(/\s+/g, ' ').trim();

  /* Heure de Montréal : HAE du 2e dimanche de mars au 1er dimanche de novembre */
  const nthSunday = (y, m, n) => { const d = new Date(Date.UTC(y, m, 1)); let c = 0; for (let i = 1; i <= 31; i++) { d.setUTCDate(i); if (d.getUTCMonth() !== m) break; if (d.getUTCDay() === 0 && ++c === n) return i; } return 1; };
  X.offset = (y, m, day) => { const start = nthSunday(y, 2, 2), end = nthSunday(y, 10, 1); const after = m > 2 || (m === 2 && day >= start); const before = m < 10 || (m === 10 && day < end); return after && before ? '-04:00' : '-05:00'; };
  X.iso = (y, m, d, h, mi) => { const pad = (n) => String(n).padStart(2, '0'); return y + '-' + pad(m + 1) + '-' + pad(d) + 'T' + pad(h) + ':' + pad(mi) + ':00' + X.offset(y, m, d); };
  const DATE_RE = new RegExp('(?:(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\\s+)?(\\d{1,2})(?:er)?\\s+(' + MONTHS.join('|') + ')\\s+(\\d{4})(?:[^\\d\\n]{0,14}?(\\d{1,2})\\s*h\\s*(\\d{2})?)?', 'i');
  X.findDate = (s) => { const m = norm(s).match(DATE_RE); if (!m) return null; const mi = MONTHS.indexOf(m[2].toLowerCase()); return { iso: X.iso(+m[3], mi, +m[1], m[4] ? +m[4] : 12, m[5] ? +m[5] : 0), hasTime: !!m[4], raw: m[0] }; };
  const TIME_RE = /(\d{1,2})\s*h\s*(\d{2})?/;

  /* Découpage en phrases. Les abréviations (M., Mme, art., p., n°, c., inc., etc.) ne coupent pas une phrase. */
  const DOT = '․';
  const ABBR_ALWAYS = /(^|[\s(«’'\-])(MM|Mmes|Mme|Mlle|Mlles|Me|Mes|Dr|Dre|Pr|M|St|Ste|Sts|Stes)\.(?=\s)/g;
  const ABBR_BEFORE = /(^|[\s(«’'\-])(art|Art|arts|al|alin|p|P|pp|no|No|nos|Nos|c|ch|chap|sect|par|réf|vol|éd|ann|annexe|cf|ex|env|approx|tél|téléc|boul|av|app|bur|min|max|inc|ltée|Ltée|enr|ss|suiv|L\.R\.Q|RLRQ|R\.R\.Q)\.(?=\s+(?:[\da-zà-ÿ(«]|[A-Z]{1,3}-\d))/g;
  const INITIAL = /(-)([A-ZÀ-Ý])\.(?=\s)/g;
  X.segment = (text) => {
    const out = [];
    /* Une ligne coupée au milieu d’une phrase (PDF, courriel) est rejointe à la suivante */
    String(text || '').replace(/\r/g, '').replace(/([^\n.:;!?»)])[ \t]*\n(?=[ \t]*[a-zà-ÿ0-9(«])/g, '$1 ').split(/\n+/).forEach((para) => {
      let p = norm(para);
      if (!p) return;
      p = p.replace(ABBR_ALWAYS, '$1$2' + DOT).replace(ABBR_BEFORE, '$1$2' + DOT).replace(INITIAL, '$1$2' + DOT);
      p.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÝÉ«0-9])/).forEach((x) => { const t = x.split(DOT).join('.').trim(); if (t) out.push(t); });
    });
    return out;
  };
  const num = (s) => { const v = String(s).replace(/[\s  ]/g, '').replace(',', '.'); return Number(v); };
  const moneyIn = (s) => {
    let m = s.match(/(\d{1,3}(?:[\s  ]\d{3})+|\d+)(?:,\d{2})?\s*\$/); if (m) return num(m[1]);
    m = s.match(/(\d+(?:,\d+)?)\s*(?:M\$|M \$|millions?\s+de\s+dollars)/i); if (m) return num(m[1]) * 1e6;
    m = s.match(/\b(un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s*(?:\(\d+\)\s*)?millions?\s+(?:de\s+)?dollars/i); if (m) return WORDNUM[m[1].toLowerCase()] * 1e6;
    m = s.match(/(\d{3,})\s*(?:dollars)/i); if (m) return num(m[1]);
    return null;
  };
  const pctIn = (s) => { const m = s.match(/(\d{1,3}(?:,\d+)?)\s*(?:%|pour\s*cent)/i); return m ? num(m[1]) / 100 : 0; };
  const countIn = (s, word) => { const m = s.match(new RegExp('(?:^|[^\\p{L}])(\\d+|' + Object.keys(WORDNUM).join('|') + ')\\s*(?:\\(\\d+\\)\\s*)?' + word, 'iu')); return m ? (WORDNUM[m[1].toLowerCase()] || +m[1]) : null; };

  /* Donneurs d’ouvrage reconnus dans l’en-tête, où qu’ils soient dans la ligne */
  const BUYER_TYPES = ['Municipalité régionale de comté', 'Municipalité', 'Ville', 'MRC', 'Cité', 'Paroisse', 'Canton', 'Village', 'Agglomération', 'Communauté métropolitaine', 'Centre de services scolaire', 'Commission scolaire', 'Régie intermunicipale', 'Régie régionale', 'Régie', 'Ministère', 'Société de transport', 'Société québécoise', 'Société', 'Office municipal d’habitation', 'Centre intégré universitaire de santé et de services sociaux', 'Centre intégré de santé et de services sociaux', 'CIUSSS', 'CISSS', 'Université', 'Cégep', 'Collège', 'Conseil régional', 'Corporation'];
  const BUYER_SRC = '(?:^|[\\s(«—–:-])((?:' + BUYER_TYPES.join('|') + ')(?:\\s+(?:de la|de l’|de|du|des|d’|en)\\s*|\\s+(?=[A-ZÀ-Ý]))[\\p{L}\\d’\'-][^,.;:()\\n·|–—]*)';
  const BUYER_RE = new RegExp(BUYER_SRC, 'u');
  const BUYER_RE_CAPS = new RegExp(BUYER_SRC.replace(/\(\?:\^\|/, '(?:^|'), 'iu');
  const SMALL = ['de', 'des', 'du', 'la', 'le', 'les', 'sur', 'en', 'aux', 'au', 'et', 'd’', 'l’'];
  const titleCase = (t) => t.toLowerCase().replace(/(^|[\s-])([\p{L}’]+)/gu, (m0, sep, w) => sep + (SMALL.includes(w) && sep ? w : w.charAt(0).toUpperCase() + w.slice(1))).replace(/\b(D|L)’/g, (x) => x.toLowerCase()).replace(/^./, (c) => c.toUpperCase());
  const cleanBuyer = (b) => { const t = b.replace(/\s+(se|ne|est|sollicite|sollicitent|demande|invite|reçoit|recevra|lance|requiert|désire|souhaite|procède)\b.*$/u, '').replace(/\s+(fictive|fictif)$/i, '').trim(); return t.length > 6 && t === t.toUpperCase() ? titleCase(t) : t; };
  X.findBuyer = (seg) => {
    const objIdx = seg.findIndex((s) => /^Objet\s*:/i.test(s));
    const head = seg.slice(0, Math.max(4, objIdx >= 0 ? objIdx + 1 : 6));
    for (let k = 0; k < head.length; k++) { const m = head[k].match(BUYER_RE) || (/^[^a-zà-ÿ]{8,}/u.test(head[k]) ? head[k].match(BUYER_RE_CAPS) : null); if (m) return { name: cleanBuyer(m[1]), idx: k }; }
    for (let k = head.length; k < seg.length; k++) { const m = seg[k].match(BUYER_RE); if (m && /^(Ville|Municipalité|MRC|Centre de services|Régie|Ministère|Société)/u.test(m[1]) && !/^(Régie du bâtiment|Société de l’assurance|Ministère du Revenu)/u.test(m[1]) && /\s(de|du|des|d’)\s?/u.test(m[1].slice(0, 40))) return { name: cleanBuyer(m[1]), idx: k }; }
    return null;
  };
  /* Date et heure : jamais d’heure inventée. Sans heure, la date est rapportée et l’hypothèse (fin de journée) est étiquetée. */
  const endOfDay = (d) => d.iso.slice(0, 11) + '23:59:00' + d.iso.slice(19);
  const firstWithDate = (seg, re, avoid) => { for (let k = 0; k < seg.length; k++) { if (!re.test(seg[k]) || (avoid && avoid.test(seg[k]))) continue; const d = X.findDate(seg[k]); if (d) return { k, d }; } return null; };
  /* Formes de garantie : chaque solution de rechange listée (« sous forme de A, B ou C », « A ou B », « soit A, soit B ») */
  const FORM_KEYS = [[/cautionnement|compagnie d’assurance|assureur/i, 'cautionnement', 'cautionnement'], [/chèque (?:visé|certifié)/i, 'cheque', 'chèque visé'], [/traite bancaire/i, 'traite', 'traite bancaire'], [/mandat[- ]poste/i, 'mandat', 'mandat-poste'], [/lettre de garantie/i, 'lettre-garantie', 'lettre de garantie irrévocable'], [/lettre de crédit/i, 'lettre-credit', 'lettre de crédit irrévocable']];
  X.FORM_KEYS = FORM_KEYS;
  X.parseBondForms = (text) => {
    const out = [];
    const take = (alt) => { const f = FORM_KEYS.find(([re]) => re.test(alt)); if (f && !out.some((o) => o.key === f[1])) out.push({ key: f[1], label: f[2] }); };
    const s = String(text).replace(/(?:cautionnement|garantie)s? d[’e]\s*(?:exécution|paiement|obligations?|entretien)[^,.;]*/gi, ' ');
    const re = /(?:sous (?:la |l’une des )?formes? (?:suivantes?\s*:\s*)?|l’une des formes suivantes\s*:\s*|prendre la forme |formes? accept[ée]es?\s*:\s*|être (?:fournie |constituée )?(?:par |sous )?|\bsoit\s+)((?:de |d’|du |d’un |d’une |un |une )?[^.;]+)/gi;
    let m, found = false;
    while ((m = re.exec(s))) { const before = out.length; m[1].split(/,|\bou(?:\s+bien)?\b|\bsoit\b|\bet\/ou\b/i).forEach(take); if (out.length > before) found = true; }
    if (!found) s.split(/,|\bou(?:\s+bien)?\b|\bsoit\b|\bet\/ou\b/i).forEach(take);
    return out;
  };

  /* ---------- Règles ---------- */
  X.rules = (text) => {
    const seg = X.segment(text);
    const find = (re, avoid) => seg.findIndex((s) => re.test(s) && !(avoid && avoid.test(s)));
    const all = (re) => seg.map((s, i) => (re.test(s) ? i : -1)).filter((i) => i >= 0);
    const n = { buyer: '', title: '', ref: '', trade: 'autre', close: '', closeDate: '', opening: '', questionsDeadline: '', visit: { mandatory: false, at: '', place: '', none: false }, evaluation: 'unknown', evaluationDetail: null, bond: { rate: 0, basis: 'ttc', amount: 0, forms: [] }, perfBond: { rate: 0, amount: 0 }, lmBond: { rate: 0, amount: 0 }, rbq: [], amp: false, ampThreshold: 0, arq: false, rena: false, cnesst: false, insuranceMin: 0, experience: null, reservation: false, assumed: {} };
    const reqs = [];
    const add = (r) => reqs.push(Object.assign({ conf: 0.9 }, r));
    const buyer = X.findBuyer(seg);
    if (buyer) n.buyer = buyer.name;
    const refM = norm(text).match(/(?:appel d’offres|AO)[^\n]{0,40}?n[°o]\.?\s*([A-Z0-9][A-Z0-9-]{3,})/i) || norm(text).match(/\bn[°o]\s*([A-Z0-9]{2,}[A-Z0-9-]*-[A-Z0-9-]+)/) || norm(text).match(/\b([A-Z]{2,6}-\d{4}-[A-Z0-9-]{1,8})\b/);
    if (refM) n.ref = refM[1];
    const objM = norm(text).match(/Objet\s*:\s*([^.]+?)(?:,\s*saisons?|\.|$)/im);
    if (objM) n.title = objM[1].trim().replace(/^./, (c) => c.toUpperCase());
    else { const t = seg.find((s, k) => (!buyer || k !== buyer.idx) && !/appel d’offres/i.test(s) && s.length > 20); n.title = t ? t.slice(0, 90) : 'Appel d’offres collé'; }
    const blob = norm(text).toLowerCase();
    n.trade = /déneig|neige/.test(blob) ? 'deneigement' : /pavage|enrobé|asphalt|réfection de (?:la )?chaussée|marquage de la chaussée|resurfa/.test(blob) ? 'pavage' : /entretien ménager|conciergerie/.test(blob) ? 'entretien' : /ventilation|cvc|chauffage|climatisation/.test(blob) ? 'cvc' : 'autre';

    /* Clôture */
    const CLOSE_RE = /(jusqu’au|au plus tard le|avant le|date limite de réception|réception des soumissions|dépôt des soumissions|clôture|soumissions seront reçues|déposées)/i;
    const c = firstWithDate(seg, CLOSE_RE, /(question|visite)/i) || firstWithDate(seg, /soumissions?[^.]{0,60}(?:reçues?|déposées?)/i);
    if (c) {
      if (c.d.hasTime) { n.close = c.d.iso; add({ id: 'r-close', title: 'Clôture le ' + U.dayTime(c.d.iso), kind: 'info', assess: 'info', quoteIdx: c.k, plain: 'Date et heure lues dans l’avis (heure de Montréal).', conf: 0.95 }); }
      else { n.closeDate = c.d.iso.slice(0, 10); add({ id: 'r-close', title: 'Clôture le ' + U.date(c.d.iso) + ' (heure non précisée)', kind: 'info', assess: 'info', quoteIdx: c.k, plain: 'Heure non précisée dans l’avis : à confirmer. Aucune heure n’est supposée; saisissez-la avant de créer le dossier.', conf: 0.6 }); }
    }
    let i = find(/ouverture/i);
    if (i >= 0 && n.close) { const d = X.findDate(seg[i]); const t = seg[i].match(TIME_RE); n.opening = d && d.hasTime ? d.iso : t ? n.close.slice(0, 11) + String(t[1]).padStart(2, '0') + ':' + (t[2] || '00') + n.close.slice(16) : ''; }
    if (!n.opening && n.close) n.opening = new Date(Date.parse(n.close) + 5 * 60000).toISOString();

    /* Visite des lieux */
    const noVisit = find(/(aucune visite|pas de visite|visite[^.]{0,60}(?:n’est|ne sera) (?:pas )?prévue|n’y aura (?:pas|aucune) de visite|aucune visite des lieux)/i);
    if (noVisit >= 0) { n.visit.none = true; add({ id: 'r-visit', title: 'Aucune visite des lieux prévue', kind: 'info', assess: 'info', quoteIdx: noVisit, plain: 'Aucune attestation de visite à joindre.' }); }
    else {
      i = find(/visite (?:des lieux|de chantier|des installations|des sites?|obligatoire|facultative|optionnelle)|visiter les lieux/i);
      if (i < 0) i = find(/visite/i, /attestation de visite/i);
      if (i >= 0) {
        const s = seg[i], next = seg[i + 1] || '';
        const mand = /obligatoire|doit (?:obligatoirement )?(?:participer|assister|visiter)|est exigée/i.test(s) && !/(facultative|non obligatoire|optionnelle)/i.test(s);
        let d = X.findDate(s), qi = i;
        if (!d && /visite/i.test(next)) { d = X.findDate(next); if (d) qi = i + 1; }
        const placeM = s.match(/(?:^|\s)((?:au|aux|à la|à l’)\s*(?:garage|hôtel|bureau|caserne|centre|usine|site|aréna|école|entrepôt|bâtiment|parc|chalet|local|poste|station)[^.,;]*)/i);
        if (d) { if (d.hasTime) n.visit.at = d.iso; else { n.visit.at = endOfDay(d); n.assumed.visit = true; } }
        n.visit.mandatory = mand; n.visit.place = placeM ? placeM[1].trim() : '';
        add({ id: 'r-visit', title: (mand ? 'Visite obligatoire des lieux' : 'Visite facultative') + (d ? ' le ' + U.date(d.iso) + (d.hasTime ? ' à ' + U.time(d.iso) : ' (heure non précisée)') : ''), kind: mand ? 'trap' : 'info', assess: mand ? 'eligibility' : 'info', quoteIdx: qi, plain: (mand ? 'Sans attestation de visite, la soumission est rejetée.' : 'Aucune attestation exigée.') + (d && !d.hasTime ? ' Heure non précisée : à confirmer (hypothèse affichée : fin de journée).' : !d && mand ? ' Date à confirmer auprès du responsable.' : ''), rule: mand ? { type: 'visit' } : null, conf: d && d.hasTime ? 0.92 : 0.7 });
      }
    }
    /* Questions */
    const q = firstWithDate(seg, /question|demande de (?:renseignements|précisions)/i);
    if (q) {
      if (q.d.hasTime) n.questionsDeadline = q.d.iso; else { n.questionsDeadline = endOfDay(q.d); n.assumed.questions = true; }
      const who = seg[q.k].match(/\b(M\.|Mme|Me)\s+([A-ZÀ-Ý][\p{L}’-]+(?:\s+[A-ZÀ-Ý][\p{L}’-]+)?)/u);
      add({ id: 'r-questions', title: 'Questions avant le ' + (q.d.hasTime ? U.dayTime(q.d.iso) : U.date(q.d.iso) + ' (heure non précisée)'), kind: 'info', assess: 'info', quoteIdx: q.k, plain: (q.d.hasTime ? '' : 'Heure non précisée : à confirmer; TenderStrike affiche l’hypothèse « fin de journée, 23 h 59 ». ') + 'Par écrit' + (who ? ' à ' + who[1] + ' ' + who[2] : '') + '; les réponses sont publiées en addenda.', conf: q.d.hasTime ? 0.92 : 0.7 });
    }

    /* Admissibilité */
    i = find(/attestation de revenu québec/i);
    if (i >= 0) { n.arq = true; add({ id: 'r-arq', title: 'Attestation de Revenu Québec valide à la clôture', kind: 'trap', assess: 'eligibility', quoteIdx: i, plain: 'Validité exigée à la date et à l’heure de clôture.', rule: { type: 'vault', kind: 'arq' } }); }
    i = find(/(autorité des marchés publics|autorisation de contracter|\bAMP\b)/i);
    if (i >= 0) {
      const s = seg[i], thr = /(seuil|égale? ou supérieure?|supérieure? à|de plus de|à partir de|atteint|excède|dépasse|\d\s*\$)/i.test(s) ? moneyIn(s) : null;
      if (/(n’exige pas|pas d’autorisation|n’est pas requise|aucune autorisation)/i.test(s) && !thr) add({ id: 'r-amp', title: 'Aucune autorisation de l’AMP exigée', kind: 'info', assess: 'info', quoteIdx: i, plain: 'Non requise pour ce contrat.' });
      else { n.amp = true; n.ampThreshold = thr || 0; add({ id: 'r-amp', title: 'Autorisation de contracter de l’AMP' + (thr ? ' (contrats de ' + U.money(thr) + ' et plus)' : ''), kind: 'req', assess: 'eligibility', quoteIdx: i, plain: thr ? 'Exigée seulement si la valeur atteint le seuil : TenderStrike compare votre prix taxes incluses au seuil, puis vérifie le statut au REA.' : 'Statut « autorisée » vérifié au REA.', rule: thr ? { type: 'amp', threshold: thr } : { type: 'amp' } }); }
    }
    i = find(/(\bRENA\b|non admissibles aux contrats publics)/i);
    if (i >= 0) { n.rena = true; add({ id: 'r-rena', title: 'Absence d’inscription au RENA', kind: 'req', assess: 'eligibility', quoteIdx: i, plain: 'Vérification au registre.', rule: { type: 'rena' } }); }
    i = find(/CNESST/i);
    if (i >= 0) { n.cnesst = true; add({ id: 'r-cnesst', title: 'Attestation de conformité CNESST', kind: 'req', assess: 'eligibility', quoteIdx: i, plain: 'Valide à la clôture.', rule: { type: 'vault', kind: 'cnesst' } }); }
    i = find(/(\bRBQ\b|régie du bâtiment)/i, /aucune licence/i);
    if (i >= 0) { const cats = (seg[i].match(/\b\d{1,2}\.\d{1,2}(?:\.\d)?\b/g) || []).filter((x) => +x.split('.')[0] < 20); n.rbq = cats; add({ id: 'r-rbq', title: 'Licence RBQ' + (cats.length ? ', sous-catégorie ' + cats.join(', ') : ''), kind: 'trap', assess: 'eligibility', quoteIdx: i, plain: cats.length ? 'Comparée aux sous-catégories de votre licence.' : 'Sous-catégorie non précisée dans le texte : à vérifier.', rule: cats.length ? { type: 'rbq', cats } : null, conf: cats.length ? 0.9 : 0.6 }); }

    /* Garanties : soumission, exécution, gages-matériaux-services, formes acceptées */
    i = find(/(garantie|cautionnement) de soumission/i);
    if (i >= 0) {
      const s = seg[i].slice(seg[i].search(/(garantie|cautionnement) de soumission/i));
      if (/aucune garantie|n’est pas exigée|pas de garantie/i.test(seg[i])) add({ id: 'r-bond', title: 'Aucune garantie de soumission', kind: 'info', assess: 'info', quoteIdx: i, plain: 'Non exigée.' });
      else {
        const rate = pctIn(s), amount = rate ? 0 : moneyIn(s) || 0;
        const basis = /(avant (?:les )?taxes|hors taxes|excluant les taxes|taxes exclues|sans les taxes)/i.test(s) ? 'ht' : 'ttc';
        const basisStated = /(taxes incluses|toutes taxes|incluant les taxes|avant (?:les )?taxes|hors taxes|excluant les taxes|taxes exclues|sans les taxes)/i.test(s);
        n.bond = { rate, basis, amount, forms: [] };
        add({ id: 'r-bond', title: 'Garantie de soumission de ' + (rate ? U.num(rate * 100, rate * 100 % 1 ? 1 : 0) + ' % ' + (basis === 'ht' ? 'avant taxes' : 'TTC') : amount ? U.money(amount) + ' (montant fixe)' : '(montant à préciser)'), kind: 'trap', assess: 'eligibility', quoteIdx: i, plain: 'Une garantie absente ou insuffisante entraîne le rejet.' + (!rate && !amount ? ' Taux ou montant non trouvé : à vérifier.' : rate && !basisStated ? ' Base de calcul non précisée : taxes incluses par prudence, à confirmer.' : ''), rule: rate || amount ? { type: 'bond' } : null, conf: rate || amount ? (rate && !basisStated ? 0.8 : 0.95) : 0.6 });
      }
    }
    /* Formes acceptées : dans la phrase de la garantie de soumission et dans la suivante si elle la prolonge */
    const bi = find(/(garantie|cautionnement) de soumission/i);
    const formSrc = bi >= 0 ? [bi].concat(/^(?:La |Cette |Elle |Ladite )?(garantie|elle|forme)/i.test(seg[bi + 1] || '') ? [bi + 1] : []) : seg.map((x, k) => (/formes? accept/i.test(x) ? k : -1)).filter((k) => k >= 0);
    const fl = [];
    formSrc.forEach((k) => X.parseBondForms(bi === k ? seg[k].slice(seg[k].search(/(garantie|cautionnement) de soumission/i)) : seg[k]).forEach((f) => { if (!fl.some((x) => x.key === f.key)) fl.push(f); }));
    if (fl.length && n.bond) { n.bond.forms = fl.map((f) => f.label); n.bond.formKeys = fl.map((f) => f.key); add({ id: 'r-bond-forms', title: 'Formes de garantie acceptées : ' + n.bond.forms.join(', '), kind: 'info', assess: 'info', quoteIdx: formSrc[0], plain: (fl.length > 1 ? 'Au choix, une des ' + fl.length + ' formes listées. ' : 'Une seule forme acceptée. ') + 'Le bouclier accepte la lettre du courtier (cautionnement) ou une pièce du coffre-fort de la forme admise.' }); }
    const postBond = (re, key, id, label) => {
      const k = find(re);
      if (k < 0) return;
      const tail = seg[k].slice(seg[k].search(re));
      const rate = pctIn(tail), amount = rate ? 0 : moneyIn(tail) || 0;
      n[key] = { rate, amount };
      add({ id, title: label + (rate ? ' de ' + U.num(rate * 100, 0) + ' %' : amount ? ' de ' + U.money(amount) : '') + ' (adjudicataire)', kind: 'req', assess: 'capability', quoteIdx: k, plain: 'Exigée après l’adjudication, pas au dépôt : TenderStrike la compare à votre capacité de cautionnement disponible.', rule: rate ? { type: 'perf', rate } : null });
    };
    postBond(/(cautionnement|garantie) d[’e]\s*exécution/i, 'perfBond', 'r-perf', 'Garantie d’exécution');
    postBond(/(gages,? matériaux et services|obligations pour gages|main-d’œuvre et (?:les )?matériaux|paiement de la main-d’œuvre)/i, 'lmBond', 'r-lm', 'Garantie des obligations pour gages, matériaux et services');

    /* Assurance */
    i = find(/assurance\s+(?:de\s+)?responsabilit/i);
    if (i >= 0) { const m = moneyIn(seg[i]) || 0; n.insuranceMin = m; add({ id: 'r-insurance', title: 'Assurance responsabilité civile' + (m ? ' de ' + U.money(m) : ''), kind: 'req', assess: 'eligibility', quoteIdx: i, plain: m ? 'Comparée au certificat du coffre-fort.' : 'Montant non trouvé : à vérifier.', rule: m ? { type: 'insurance', min: m } : null, conf: m ? 0.92 : 0.6 }); }

    /* Expérience */
    i = seg.findIndex((s) => /contrats?\b/i.test(s) && /(années|ans)\b/i.test(s) && /(expérience|exécuté|réalisé|démontr|similaires?|comparables?|de même nature)/i.test(s));
    if (i >= 0) {
      const s = seg[i], cnt = countIn(s, 'contrats?') || 1, y = countIn(s, '(?:dernières\\s+)?(?:années|ans)') || 5;
      const val = moneyIn(s), km = s.match(/(\d+)\s*(?:\(\d+\)\s*)?(?:km|kilomètres)/i), m2 = s.match(/(\d[\d\s]*)\s*(?:m²|mètres carrés)/i);
      const metric = val ? 'value' : km ? 'km' : m2 ? 'm2' : 'km';
      const min = val || (km ? +km[1] : m2 ? num(m2[1]) : 0);
      const ref = n.close || (n.closeDate ? n.closeDate + 'T12:00:00-05:00' : '');
      const since = ref ? (+U.isoDay(ref).slice(0, 4) - y) + U.isoDay(ref).slice(4) : '2021-11-01';
      n.experience = { count: cnt, trade: n.trade === 'autre' ? 'deneigement' : n.trade, metric, min, since, label: cnt + ' contrat(s) en ' + y + ' ans' + (min ? ', minimum ' + (metric === 'value' ? U.money(min) : U.num(min, 0) + (metric === 'km' ? ' km' : ' m²')) : '') };
      add({ id: 'r-exp', title: cnt + ' contrat' + (cnt > 1 ? 's' : '') + ' comparable' + (cnt > 1 ? 's' : '') + ' en ' + y + ' ans', kind: 'trap', assess: 'eligibility', quoteIdx: i, plain: 'Références distinctes testées : métier, période' + (min ? ' et minimum' : '') + '.', rule: { type: 'experience' } });
    }
    all(/(pénalité|retenue)/i).slice(0, 2).forEach((k, j) => { const m = moneyIn(seg[k]); add({ id: 'r-penalty' + (j || ''), title: 'Pénalité' + (m ? ' de ' + U.money(m) : ''), kind: 'pill', assess: 'commercial', quoteIdx: k, plain: 'Risque commercial : à intégrer au prix.', risk: 'Montant tiré de l’avis; fréquence à estimer.' }); });

    /* Mode d’adjudication : plus bas conforme, ou qualité-prix avec pondération et formule */
    const QUAL = /(pointage intérimaire|pointage final|pondération|qualité[- ]prix|grille d’évaluation|comité de sélection|deux enveloppes|meilleur pointage)/i;
    const qi = find(QUAL);
    if (qi >= 0) {
      n.evaluation = 'quality';
      const fIdx = seg.findIndex((s) => /pointage[^.]{0,60}(?:[x×*]|multipli)[^.]{0,30}10\s?000|(?:[x×*])\s*10\s?000\s*(?:[÷/]|divisé par)|\+\s*50\s*\)/i.test(s));
      const thrIdx = seg.findIndex((s) => /pointage intérimaire|note de passage|seuil/i.test(s) && /\b\d{2}\s*(?:points|%|sur 100)/i.test(s));
      const thr = thrIdx >= 0 ? +seg[thrIdx].match(/\b(\d{2})\s*(?:points|%|sur 100)/i)[1] : null;
      const crit = [];
      seg.forEach((s) => { const re = /([A-ZÀ-Ýa-zà-ÿ][^(;:.•]{2,70}?)\s*[(:–-]\s*(\d{1,2})\s*(?:points|%)\)?/g; let m; if (!/(critère|pondération|points|%)/i.test(s) || /garantie|cautionnement|assurance/i.test(s)) return; while ((m = re.exec(s)) && crit.length < 8) { const l = m[1].replace(/^(?:et|le|la|les|l’)\s+/i, '').trim(); if (!/pointage|intérimaire|seuil|passage|minimal/i.test(l)) crit.push({ label: l, pts: +m[2] }); } });
      const formula = fIdx >= 0 ? ((seg[fIdx].match(/\(?\s*pointage[^=.;]{0,60}?\+\s*50\s*\)?\s*[x×*]\s*10\s?000\s*(?:[÷/]|divisé par)\s*(?:le\s+)?prix[^.;,]*/i) || [])[0] || '').trim() : '';
      n.evaluationDetail = { threshold: thr, formula: formula || (fIdx >= 0 ? 'voir l’avis' : ''), criteria: crit };
      add({ id: 'r-award', title: 'Évaluation qualité-prix' + (thr ? ' (pointage minimal ' + thr + ')' : ''), kind: 'info', assess: 'info', quoteIdx: fIdx >= 0 ? fIdx : qi, plain: (thr ? 'Une offre sous ' + thr + ' points n’est pas retenue, peu importe son prix. ' : '') + (formula ? 'Formule : ' + formula + '. ' : '') + (crit.length ? 'Critères : ' + crit.map((x) => x.label + ' (' + x.pts + ')').join(', ') + '. ' : '') + 'Le prix pèse moins qu’au plus bas conforme : l’historique de prix sert de repère, sans plus.', conf: thr || formula ? 0.88 : 0.7 });
      if (thr && thrIdx !== (fIdx >= 0 ? fIdx : qi)) add({ id: 'r-quality-min', title: 'Pointage intérimaire d’au moins ' + thr + ' points', kind: 'trap', assess: 'capability', quoteIdx: thrIdx, plain: 'Offre qualitative à soigner : sous ce seuil, l’enveloppe de prix n’est pas ouverte.' });
    } else {
      const LOW = /(plus bas soumissionnaire conforme|plus bas prix conforme|plus basse soumission conforme|plus bas soumissionnaire)/i;
      i = find(LOW, /ne s’engage|n’est pas tenue?/i);
      if (i < 0) i = find(LOW);
      if (i >= 0) { n.evaluation = 'lowest'; add({ id: 'r-award', title: 'Plus bas soumissionnaire conforme', kind: 'info', assess: 'info', quoteIdx: i, plain: 'Le prix décide parmi les soumissions conformes.' }); }
    }
    /* Réserve de droits */
    i = find(/(ne s’engage (?:pas )?à accepter|n’est pas tenue? d’accepter|se réserve le droit de (?:rejeter|refuser|n’accepter)|ni la plus basse ni aucune)/i);
    if (i >= 0) { n.reservation = true; add({ id: 'r-reserve', title: 'Réserve de droits : aucune obligation d’accepter une soumission', kind: 'info', assess: 'info', quoteIdx: i, plain: 'Le donneur d’ouvrage peut n’accepter aucune soumission, même la plus basse : un dépôt conforme ne garantit pas l’adjudication.' }); }
    i = find(/\bSEAO\b/);
    if (i >= 0 && !reqs.some((r) => r.quoteIdx === i)) add({ id: 'r-seao', title: 'Dépôt électronique sur SEAO', kind: 'info', assess: 'info', quoteIdx: i, plain: 'Aucun dépôt papier.' });
    return { notice: n, requirements: reqs, segments: seg, provenance: { source: 'rules', label: 'Règles' } };
  };

  /* ---------- IA en direct : même structure, citations vérifiées ---------- */
  X.schema = {
    type: 'object', additionalProperties: false,
    required: ['buyer', 'title', 'ref', 'trade', 'close', 'questionsDeadline', 'visitMandatory', 'visitAt', 'evaluation', 'bondRate', 'bondBasis', 'rbq', 'insuranceMin', 'requirements'],
    properties: {
      buyer: { type: 'string' }, title: { type: 'string' }, ref: { type: 'string' },
      trade: { type: 'string', enum: ['deneigement', 'pavage', 'entretien', 'cvc', 'transport', 'autre'] },
      close: { type: 'string', description: 'Date et heure de clôture, format AAAA-MM-JJTHH:MM, heure de Montréal; vide si absente' },
      questionsDeadline: { type: 'string' }, visitMandatory: { type: 'boolean' }, visitAt: { type: 'string' },
      evaluation: { type: 'string', enum: ['lowest', 'quality', 'unknown'] },
      bondRate: { type: 'number', description: 'Taux de la garantie de soumission, ex. 0.05; 0 si aucune' },
      bondBasis: { type: 'string', enum: ['ttc', 'ht'] },
      rbq: { type: 'array', items: { type: 'string' } },
      insuranceMin: { type: 'number' },
      requirements: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'kind', 'assess', 'rule', 'quote', 'page', 'plain'], properties: {
        title: { type: 'string' }, kind: { type: 'string', enum: ['trap', 'pill', 'req', 'info'] }, assess: { type: 'string', enum: ['eligibility', 'capability', 'commercial', 'info'] },
        rule: { type: 'string', enum: ['arq', 'cnesst', 'amp', 'rena', 'rbq', 'insurance', 'bond', 'visit', 'experience', 'background', 'none'] },
        quote: { type: 'string', description: 'Citation mot pour mot du texte source' }, page: { type: 'integer' }, plain: { type: 'string' } } } }
    }
  };
  X.system = () => 'Tu es le module de radiographie de TenderStrike QC, pour une PME québécoise fictive (' + D.company.legalName + '). Métiers : ' + D.company.trades.map((t) => t[1]).join(', ') + '. Licence RBQ : sous-catégories 1.4 et 2.5. Coffre-fort : attestation de Revenu Québec, CNESST, autorisation AMP, vérification RENA, assurance RC de 5 M$, licence RBQ, antécédents judiciaires. Lis l’avis d’appel d’offres fourni et extrais les champs demandés et chaque exigence, en français du Québec. Pour chaque exigence, « quote » doit être un passage copié mot pour mot du document; n’invente aucune exigence absente. Classe en « trap » les conditions éliminatoires, en « pill » les clauses de risque commercial (pénalités, prix fermes), en « req » les autres exigences, en « info » le reste. Les dates suivent le format AAAA-MM-JJTHH:MM, heure de Montréal.';
  const RULE_MAP = { arq: { type: 'vault', kind: 'arq' }, cnesst: { type: 'vault', kind: 'cnesst' }, background: { type: 'vault', kind: 'background' }, amp: { type: 'amp' }, rena: { type: 'rena' }, bond: { type: 'bond' }, visit: { type: 'visit' }, experience: { type: 'experience' } };
  X.toIso = (s) => { const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/); return m ? X.iso(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 12, m[5] ? +m[5] : 0) : ''; };
  X.fromAI = (data, text, opts) => {
    const seg = X.segment(text || '');
    const segN = seg.map((s) => norm(s).toLowerCase());
    const n = { buyer: data.buyer || '', title: data.title || '', ref: data.ref || '', trade: data.trade || 'autre', close: X.toIso(data.close), opening: '', questionsDeadline: X.toIso(data.questionsDeadline), visit: { mandatory: !!data.visitMandatory, at: X.toIso(data.visitAt), place: '' }, evaluation: data.evaluation || 'unknown', bond: { rate: Math.max(0, Math.min(0.5, Number(data.bondRate) || 0)), basis: data.bondBasis === 'ht' ? 'ht' : 'ttc' }, rbq: Array.isArray(data.rbq) ? data.rbq.slice(0, 6) : [], insuranceMin: Number(data.insuranceMin) || 0, experience: null };
    if (n.close) n.opening = new Date(Date.parse(n.close) + 5 * 60000).toISOString();
    let unverified = 0;
    const reqs = (data.requirements || []).slice(0, 40).map((r, k) => {
      const q = norm(r.quote).toLowerCase();
      let idx = q ? segN.findIndex((s) => s.includes(q.slice(0, 80))) : -1;
      if (idx < 0 && q.length > 30) idx = segN.findIndex((s) => q.includes(s.slice(0, 40)) && s.length > 20);
      const found = idx >= 0;
      if (!found) unverified++;
      let rule = RULE_MAP[r.rule] || null;
      if (r.rule === 'rbq') rule = n.rbq.length ? { type: 'rbq', cats: n.rbq } : null;
      if (r.rule === 'insurance') rule = n.insuranceMin ? { type: 'insurance', min: n.insuranceMin } : null;
      if (r.rule === 'bond' && !n.bond.rate) rule = null;
      return { id: 'r-ai-' + k, title: String(r.title || 'Exigence').slice(0, 120), kind: ['trap', 'pill', 'req', 'info'].includes(r.kind) ? r.kind : 'info', assess: ['eligibility', 'capability', 'commercial', 'info'].includes(r.assess) ? r.assess : 'info', quoteIdx: found ? idx : -1, quote: r.quote, page: r.page || null, plain: String(r.plain || '').slice(0, 300), rule: r.assess === 'eligibility' ? rule : null, conf: found ? 0.9 : 0.55, unverifiedQuote: !found, risk: r.kind === 'pill' ? 'Clause de risque relevée par l’IA; à chiffrer.' : '' };
    });
    if (reqs.some((r) => r.rule && r.rule.type === 'experience')) n.experience = { count: 2, trade: n.trade === 'autre' ? 'deneigement' : n.trade, metric: 'km', min: 0, since: n.close ? (+U.isoDay(n.close).slice(0, 4) - 5) + U.isoDay(n.close).slice(4) : '2021-11-01', label: 'contrats comparables (précisez le minimum)' };
    return { notice: n, requirements: reqs, segments: seg, provenance: Object.assign({ source: 'ai', label: 'IA en direct · ' + (opts && opts.provenance ? opts.provenance.model : 'claude-opus-5-5') + (opts && opts.provenance ? ' · ' + U.num(opts.provenance.ms / 1000, 1) + ' s' : '') }, opts && opts.provenance ? { ms: opts.provenance.ms, model: opts.provenance.model } : {}), unverified };
  };
  X.validateAI = (data) => {
    if (!data || typeof data !== 'object') return 'Réponse vide.';
    if (!Array.isArray(data.requirements)) return 'La liste des exigences manque.';
    if (typeof data.title !== 'string' || typeof data.buyer !== 'string') return 'Titre ou organisme manquant.';
    return null;
  };

  /* ---------- Texte d’un PDF (flux FlateDecode simples) ---------- */
  X.pdfText = async (buf) => {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    if (!/^%PDF/.test(s)) return { text: '', pages: 0, note: 'Ce fichier n’est pas un PDF.' };
    const pages = (s.match(/\/Type\s*\/Page[^s]/g) || []).length;
    const chunks = [];
    const re = /<<([^]*?)>>\s*stream\r?\n/g;
    let m;
    while ((m = re.exec(s))) {
      const start = m.index + m[0].length, end = s.indexOf('endstream', start);
      if (end < 0) break;
      const dict = m[1].slice(m[1].lastIndexOf('<<') + 1);
      const len = (dict.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/) || [])[1];
      let stop = end;
      while (stop > start && (bytes[stop - 1] === 10 || bytes[stop - 1] === 13)) stop--;
      if (len && start + Number(len) <= end) stop = start + Number(len);
      let raw = bytes.subarray(start, stop);
      let body = '';
      try {
        if (/FlateDecode/.test(dict)) {
          if (typeof DecompressionStream === 'undefined') continue;
          const ds = new DecompressionStream('deflate');
          const out = await new Response(new Blob([raw]).stream().pipeThrough(ds)).arrayBuffer();
          const ob = new Uint8Array(out);
          for (let i = 0; i < ob.length; i++) body += String.fromCharCode(ob[i]);
        } else if (!/Filter/.test(dict)) { for (let i = 0; i < raw.length; i++) body += String.fromCharCode(raw[i]); }
      } catch (e) { continue; }
      if (!/T[Jj]/.test(body)) continue;
      const lines = [];
      body.replace(/\[((?:\\.|[^\]])*)\]\s*TJ|\(((?:\\.|[^)])*)\)\s*Tj|(T\*|ET)/g, (all, arr, one, brk) => {
        if (brk) { lines.push('\n'); return ''; }
        const parts = arr != null ? (arr.match(/\(((?:\\.|[^)])*)\)/g) || []).map((p) => p.slice(1, -1)) : [one];
        lines.push(parts.map((p) => p.replace(/\\([nrtbf()\\]|\d{1,3})/g, (x, c) => (/\d/.test(c) ? String.fromCharCode(parseInt(c, 8)) : { n: '\n', r: '', t: ' ', b: '', f: '', '(': '(', ')': ')', '\\': '\\' }[c]))).join(''));
        return '';
      });
      chunks.push(lines.join(''));
    }
    let text = chunks.join('\n\n');
    try { text = decodeURIComponent(escape(text)); } catch (e) {
      /* Chaînes en WinAnsi (cas courant) : octets 0x80-0x9F vers leurs caractères typographiques */
      const W = { 0x80: '€', 0x85: '…', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x96: '–', 0x97: '—', 0x9c: 'œ', 0x8c: 'Œ' };
      text = text.replace(/[\x80-\x9f]/g, (c) => W[c.charCodeAt(0)] || ' ');
    }
    const letters = (text.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
    if (letters < 120) return { text: '', pages, note: 'Texte non extractible (PDF numérisé ou polices encodées). Collez le texte ou activez l’IA en direct, qui lit le PDF directement.' };
    return { text, pages, note: '' };
  };

  /* ---------- Construction d’une définition de dossier ---------- */
  X.buildTender = (ex, meta) => {
    const n = ex.notice;
    const seasonal = n.trade === 'deneigement';
    const segs = ex.segments.length ? ex.segments : ['(Document PDF transmis à l’IA en direct : texte non extrait dans le navigateur.)'];
    const quoted = {};
    ex.requirements.forEach((r) => { if (r.quoteIdx >= 0) quoted[r.quoteIdx] = r; });
    const pages = [];
    const per = 9;
    for (let p = 0; p * per < segs.length; p++) {
      const blocks = segs.slice(p * per, (p + 1) * per).map((s, j) => { const k = p * per + j; return quoted[k] ? { t: 'clause', id: 'c-s' + k, x: s } : { t: 'p', x: s }; });
      pages.push({ doc: 'devis', n: p + 1, blocks });
    }
    const unplaced = ex.requirements.filter((r) => r.quoteIdx < 0 && r.quote);
    if (unplaced.length) pages.push({ doc: 'devis', n: pages.length + 1, blocks: [{ t: 'h', x: 'Citations rapportées par l’IA, non retrouvées dans le texte extrait' }].concat(unplaced.map((r, j) => ({ t: 'clause', id: 'c-u' + j, x: '« ' + r.quote + ' »' + (r.page ? ' (page ' + r.page + ' du PDF selon l’IA)' : '') }))) });
    const reqs = ex.requirements.map((r) => {
      let clause, page;
      if (r.quoteIdx >= 0) { clause = 'c-s' + r.quoteIdx; page = Math.floor(r.quoteIdx / per) + 1; }
      else if (r.quote) { const j = unplaced.indexOf(r); clause = 'c-u' + j; page = pages.length; }
      else { clause = 'c-s0'; page = 1; }
      return Object.assign({}, r, { clause, doc: 'devis', page, sec: r.unverifiedQuote ? 'à vérifier' : 'texte collé', title: r.title });
    });
    const sameBuyer = TS.TENDERS.find((t) => t.buyer.toLowerCase() === (n.buyer || '').toLowerCase() && t.trade === n.trade);
    const buyerShort = (n.buyer || 'Donneur d’ouvrage').replace(/^(Ville de |Municipalité de |Centre de services scolaire )/, '').slice(0, 40) || 'Nouvel avis';
    const close = n.close || '';
    return {
      ref: n.ref || 'AO-' + String(Date.now()).slice(-5), seao: '—', family: sameBuyer ? sameBuyer.family : 'custom:' + (n.buyer || '').toLowerCase().replace(/\W+/g, '-') + ':' + n.trade,
      buyer: n.buyer || 'Donneur d’ouvrage non identifié', buyerShort, service: '', title: n.title || 'Appel d’offres collé', term: seasonal ? 'Durée à confirmer (saisons)' : 'Durée à confirmer',
      region: '—', distance: 0, trade: n.trade, published: U.isoDay(TS.S.now()), close, opening: n.opening || close, questionsDeadline: n.questionsDeadline || '',
      visit: n.visit && !n.visit.none && (n.visit.at || n.visit.mandatory) ? { mandatory: !!n.visit.mandatory, at: n.visit.at || '', place: n.visit.place || '' } : null,
      visitAssumed: !!(n.assumed && n.assumed.visit), questionsAssumed: !!(n.assumed && n.assumed.questions), evaluation: n.evaluation || 'unknown', evaluationDetail: n.evaluationDetail || null,
      value: { kind: 'unavailable', text: 'Non publiée dans le texte collé' },
      reasons: ['Avis ajouté par vous (' + (meta.sourceLabel || 'texte collé') + ')', (D.tradeLabels[n.trade] || 'Métier à confirmer') + (D.company.trades.some((t) => t[0] === n.trade) ? ' : dans vos métiers' : ' : hors de vos métiers'), ex.requirements.length + ' exigences extraites avec citation'],
      pagesTotal: pages.length, docLabel: meta.docLabel || 'Texte de l’avis', docShort: 'Avis', bondRate: n.bond ? n.bond.rate : 0, bondBasis: n.bond ? n.bond.basis : 'ttc', bondAmount: n.bond && !n.bond.rate ? n.bond.amount || 0 : 0, bondForms: (n.bond && n.bond.forms) || [], bondFormKeys: (n.bond && n.bond.formKeys) || [], minMargin: 0.10, seasons: seasonal ? 2 : 1,
      experience: n.experience, equipment: [], declItems: ['Absence de collusion et de communication d’influence', 'Respect de la Loi sur la transparence et l’éthique en matière de lobbyisme', 'Exactitude des renseignements fournis'],
      articles: [{ code: 'l1', n: 1, label: 'Prix forfaitaire (à détailler selon le bordereau officiel)', unit: 'forfait', qty: 1, cost: 100000, price: 115000, ref: null, decimals: 0, custom: true }],
      cycles: [], externalComparable: null, competitors: [], coverage: sameBuyer ? 'Même acheteur et même métier qu’un dossier suivi : son historique et les résultats que vous enregistrez s’appliquent ici.' : 'Aucun historique importé pour cet acheteur : la recommandation repose sur votre coût et votre marge minimale.',
      resultFactors: null, addenda: [], pages, requirements: reqs, source: { kind: ex.provenance.source === 'ai' ? 'ai' : meta.kind || 'paste', name: meta.name || '', label: ex.provenance.label }, seedState: {}
    };
  };
})();
