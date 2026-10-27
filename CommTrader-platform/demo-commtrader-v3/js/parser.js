/* TradeDesk V3 — rule-based trade-message parser (French and English).
   Deterministic and local: it runs in the browser on any pasted or dropped text.
   Every field keeps the exact character span it came from (CT-02.1). It is not an AI model.
   Dates are resolved against a reference time on the demo clock (minutes from Fri Oct 23, 2026 00:00):
   the message's receipt time, or now for pasted text. */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});

  const NUM_WORDS = { un: 1, une: 1, one: 1, deux: 2, two: 2, trois: 3, three: 3, quatre: 4, four: 4, cinq: 5, five: 5, six: 6, sept: 7, seven: 7, huit: 8, eight: 8, neuf: 9, nine: 9, dix: 10, ten: 10, onze: 11, eleven: 11, douze: 12, twelve: 12 };
  const COMMODITIES = [
    { key: 'corn', re: /\b(ma[iï]s|corn)\b/i },
    { key: 'soy', re: /\b(soya|soja|soybeans?|f[eè]ves? de soya|soy)\b/i },
    { key: 'wheat', re: /\b(bl[eé](?: fourrager)?|feed wheat|wheat)\b/i },
    { key: 'barley', re: /\b(orge|barley)\b/i }
  ];
  const TOWNS = ['Saint-Pie', 'Saint-Ours', 'Saint-Liboire', 'Saint-Hugues', 'Sainte-Madeleine', 'Saint-Damase', 'Saint-Hyacinthe', 'Saint-Césaire', 'Sainte-Rosalie', 'Granby', 'Varennes', 'Trois-Rivières', 'Bécancour', 'Saint-Jean-sur-Richelieu', 'Drummondville', 'Sorel-Tracy', 'Saint-Denis-sur-Richelieu', 'Saint-Valérien', 'Saint-Jacques'];
  /* Towns with "St-"/"Ste-" abbreviations, spaces for hyphens and optional accents; longest names first. */
  const townPat = (t) => t.replace(/^Sainte-/, 'Ste@').replace(/^Saint-/, 'St@').replace(/-/g, '[-\\s]').replace(/é/g, '[ée]').replace(/è/g, '[èe]').replace(/^Ste@/, '(?:Sainte|Ste\\.?)[-\\s]').replace(/^St@/, '(?:Saint|St\\.?)[-\\s]');
  const TOWNS_LONG = TOWNS.slice().sort((a, b) => b.length - a.length);
  const TOWN_ANY = '(?<![\\wà-ÿ-])(' + TOWNS_LONG.map(townPat).join('|') + ')(?![\\wà-ÿ])';
  function canonTown(s) { const x = String(s || '').trim(); return TOWNS_LONG.find((t) => new RegExp('^' + townPat(t) + '$', 'i').test(x)) || null; }
  const TIME_S = '(?:noon|midi|midnight|minuit|end of (?:the )?day|fin de (?:la )?journ[ée]e|close of business|(?:the |la )?(?:market )?close|(?:la )?fermeture|cob|eod|\\d{1,2}\\s*(?::\\s*\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)|\\d{1,2}:\\d{2}|\\d{1,2}\\s*h\\s*\\d{0,2}(?![a-zà-ÿ]))';

  /* ---------- Calendar on the demo clock ---------- */
  const BASE = Date.UTC(2026, 9, 23);
  const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MO_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MON = '(sept?(?:embre|ember)?|oct(?:obre|ober)?|nov(?:embre|ember)?|d[ée]c(?:embre|ember)?|janv?(?:ier|uary)?|f[ée]v(?:rier)?|feb(?:ruary)?|mars|march)\\.?(?![a-zà-ÿ])';
  const WD = '(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues?|wed|thur?s?|fri|sat|sun)(?![a-zà-ÿ])';
  const CONN = '(?:-|–|—|to|through|thru|until|till|au|à|jusqu[’\']?au|et le|and)';
  function monthIdx(s) {
    const m = String(s || '').toLowerCase();
    if (/^sep/.test(m)) return 8; if (/^oct/.test(m)) return 9; if (/^nov/.test(m)) return 10; if (/^d[ée]c/.test(m)) return 11;
    if (/^jan/.test(m)) return 0; if (/^f[ée]v|^feb/.test(m)) return 1; if (/^mar/.test(m)) return 2; return null;
  }
  function wdIdx(s) {
    const m = String(s || '').toLowerCase();
    if (/^(dim|sun)/.test(m)) return 0; if (/^(lun|mon)/.test(m)) return 1; if (/^(mar|tue)/.test(m)) return 2; if (/^(mer|wed)/.test(m)) return 3;
    if (/^(jeu|thu)/.test(m)) return 4; if (/^(ven|fri)/.test(m)) return 5; if (/^(sam|sat)/.test(m)) return 6; return null;
  }
  const dayOff = (m, d) => Math.round((Date.UTC(m < 8 ? 2027 : 2026, m, d) - BASE) / 86400000);
  function label(off) { const dt = new Date(BASE + off * 86400000); return WD_SHORT[dt.getUTCDay()] + ' ' + MO_SHORT[dt.getUTCMonth()] + ' ' + dt.getUTCDate(); }
  const weekdayOf = (off) => ((5 + off) % 7 + 7) % 7; // day 0 is a Friday

  function span(m, offset) { const s = (offset || 0) + m.index; return [s, s + m[0].length]; }
  /* Numbers as people write them: "1,000", "1 000", "1 000", "1.000 t" (European thousands), "1k", "13,9", "38.5".
     A single separator followed by exactly three digits is a thousands separator for quantities, except for a
     per-load weight ("38,460 t" is a scale ticket in tonnes and kilograms). Prices and percentages are decimals. */
  function num(s, kind) {
    let t = String(s).trim().replace(/[\u00a0\u202f\u2009]/g, ' ').replace('−', '-').replace(/\s+(?=[.,]|$)/g, '');
    let mult = 1;
    if (/\d\s?k$/i.test(t)) { mult = 1000; t = t.replace(/\s?k$/i, ''); }
    t = t.replace(/(\d)\s(?=\d{3}(?!\d))/g, '$1');
    const hasC = t.indexOf(',') >= 0; const hasD = t.indexOf('.') >= 0;
    if (hasC && hasD) { const dec = t.lastIndexOf(',') > t.lastIndexOf('.') ? ',' : '.'; t = t.split(dec === ',' ? '.' : ',').join('').replace(',', '.'); }
    else if (hasC || hasD) {
      const parts = t.split(hasC ? ',' : '.');
      const perLoad = Number(parts[0]) >= 15 && Number(parts[0]) <= 60;
      if (parts.length > 2) t = parts.join('');
      else if ((kind === 't' || kind === 'bu' || kind === 'qty') && parts[1].length === 3 && !(kind === 't' && perLoad)) t = parts.join('');
      else t = parts.join('.');
    }
    return Number(t.replace(/\s/g, '')) * mult;
  }
  const WNUM = { un: 1, une: 1, one: 1, a: 1, deux: 2, two: 2, trois: 3, three: 3, quatre: 4, four: 4, cinq: 5, five: 5, six: 6, sept: 7, seven: 7, huit: 8, eight: 8, neuf: 9, nine: 9, dix: 10, ten: 10, douze: 12, twelve: 12, quinze: 15, fifteen: 15, vingt: 20, twenty: 20 };
  /* Words for a thousand: "mille", "deux mille", "a thousand", "two thousand". */
  function thousands(src) {
    const m = /(?<![\wà-ÿ-])(?:(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|douze|quinze|vingt|a|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|\d{1,2})\s+)?(mille|thousand)\s+(tonnes? m[ée]triques?|tonnes?|tons|mt\b|t\b)/i.exec(src);
    if (!m) return null;
    const k = m[1] ? (/\d/.test(m[1]) ? Number(m[1]) : WNUM[m[1].toLowerCase()] || 1) : 1;
    return { value: k * 1000, span: span(m) };
  }
  /* Keyword sets with accent-aware word boundaries ("camion a" never reads as "on a"). */
  const KW = (s, g) => new RegExp('(?<![\\wà-ÿ’\'-])(?:' + s + ')(?![\\wà-ÿ-])', g ? 'gi' : 'i');
  const inside = (a, b) => !!(b && a && a[0] >= b[0] && a[1] <= b[1]);
  const r2 = (x) => Math.round(x * 100) / 100;

  /* Time of day: noon/midi, 5 pm, 17 h, 17h30, 16:00. Default end of business, 17:00. */
  function timeOf(s) {
    if (!s) return { mins: 1020, stated: false };
    const t = s.toLowerCase();
    if (/noon|midi/.test(t)) return { mins: 720, stated: true };
    if (/midnight|minuit/.test(t)) return { mins: 1439, stated: true };
    if (/end of (?:the )?day|fin de (?:la )?journ[ée]e|close of business|\bcob\b|\beod\b/.test(t)) return { mins: 1020, stated: true };
    if (/close|fermeture/.test(t)) return { mins: 1020, stated: true, close: true };
    let m = /(\d{1,2})\s*(?::\s*(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/.exec(t);
    if (m) { let h = Number(m[1]) % 12; if (/p/.test(m[3])) h += 12; return { mins: h * 60 + Number(m[2] || 0), stated: true }; }
    m = /(\d{1,2})\s*(?:h|:)\s*(\d{2})?/.exec(t);
    if (m) return { mins: Math.min(23, Number(m[1])) * 60 + Number(m[2] || 0), stated: true };
    return { mins: 1020, stated: false };
  }

  function detectLang(src) {
    const fr = (src.match(KW("je|j['’]\\w*|nous|vous|on|bonjour|salut|merci|voyages?|est|pour|avec|chez|une?|les|des|du|de|la|le|et|à|au|aux|ferme|livr[ée]e?s?|humidit[ée]|semaine|jusqu['’]\\w*|d['’]ici|prix|tonnes|maïs|soya|blé|orge|prendrait|pourrait|aurait|besoin|valide|demain|aujourd['’]hui|svp|désolée?|retard|camion|chauffeur|arrivée|vers|sur|ici|ton|mon|notre", true)) || []).length;
    const en = (src.match(KW("the|we|you|have|hi|hello|thanks|thank|loads?|of|and|is|for|with|our|ready|asking|delivered|moisture|week|until|till|good|can|could|would|need|bid|truck|driver|late|running|tomorrow|today|at|to|from|more|again|it|will|be|this|that|there|here", true)) || []).length;
    return fr > en ? 'fr' : en > fr ? 'en' : /[àâçéèêëîïôûùüÿœ]/i.test(src.replace(/Genevi[èe]ve|Saint-\S+|B[ée]cancour|Trois-Rivi[èe]res/g, '')) ? 'fr' : 'en';
  }

  /* Who wrote it: a self-introduction ("ici Marc Tessier de la Ferme Tessier", "Kevin here at Terminal Laviolette")
     or the sign-off block after "Thanks," / "Merci,". Returns the person, the company and their spans. */
  const CO_WORD = /\b(ferme|farms?|grains?|transport|camionnage|logistique|moul[ée]e|meunerie|provende(?:rie)?|terminal|[ée]thanol|trituration|coop(?:[ée]rative)?|silos?|[ée]l[ée]vateur|vrac|agri\w*|inc\.?|lt[ée]e|ltd\.?|enr\.?)\b/i;
  const NAME = "[A-ZÀ-Ý][a-zà-ÿ'’]+(?:-[A-ZÀ-Ý]?[a-zà-ÿ'’]+)*(?:\\s+[A-ZÀ-Ý][a-zà-ÿ'’]+(?:-[A-ZÀ-Ý]?[a-zà-ÿ'’]+)*){0,2}";
  const COMPANY = "(?:la\\s+|le\\s+|les\\s+)?[A-ZÀ-Ý][\\wà-ÿ'’.&-]*(?:[ -](?:et|and|&|de|du|des|la|le|[A-ZÀ-Ý][\\wà-ÿ'’.&-]*))*";
  const CO_SUFFIX = '(?:,?\\s+(?:inc|lt[ée]e|ltd|enr|senc|s\\.e\\.n\\.c)\\.?)?';
  function sender(src) {
    const out = { person: null, company: null, span: null, companySpan: null };
    const setCo = (txt, at) => { const c = txt.split(/[.!?](?:\s|$)|\n/)[0].replace(/^(la|le|les)\s+/i, '').replace(/[.,;:]+$/, '').trim(); if (c && CO_WORD.test(c)) { out.company = c; out.companySpan = [at + txt.indexOf(c), at + txt.indexOf(c) + c.length]; } };
    // "Dave Lemieux, Transport Lemieux inc." closing the message (its own line or the last sentence).
    const sig = new RegExp('(?:^|[.!?]\\s+|\\n\\s*)(' + NAME + ')\\s*(?:,|–|—|\\s-\\s|\\s\\/\\s)\\s*(' + COMPANY + CO_SUFFIX + ')(?:\\s+(?:dispatch|répartition|billing|facturation|logistics|logistique|sales|ventes|accounting|comptabilité|transport))?\\s*\\.?\\s*$').exec(src.replace(/\s+$/, ''));
    const sigCo = sig ? sig[2].replace(/^(la|le|les)\s+/i, '') : null;
    const sigOut = sig && CO_WORD.test(sig[2]) && !CO_WORD.test(sig[1]) && !/^(Hi|Hello|Bonjour|Salut|Merci|Thanks)$/i.test(sig[1]) ? { person: sig[1], company: sigCo, pAt: sig.index + sig[0].indexOf(sig[1]), cAt: sig.index + sig[0].lastIndexOf(sigCo) } : null;
    let m = new RegExp("(?:[Cc]['’]est|[Ii]ci|[Tt]his is|[Ii]t['’]s)\\s+(" + NAME + ")(?:\\s+(?:de la|de|du|from|at|chez)\\s+(" + COMPANY + "))?").exec(src);
    if (!m) m = new RegExp('(' + NAME + ')\\s+(?:here|ici)\\b(?:\\s+(?:at|from|de la|de|du|chez)\\s+(' + COMPANY + '))?').exec(src);
    if (!m) m = new RegExp('\\b(' + NAME + ')\\s+(?:again\\s+)?(?:from|de la)\\s+(' + COMPANY + ')').exec(src);
    if (!m) { const m3 = new RegExp('(?:^|[.!?:]\\s+|,\\s+)(' + NAME + ')\\s+(?:de|du|at|chez|of)\\s+(' + COMPANY + ')').exec(src); if (m3 && CO_WORD.test(m3[2])) m = m3; }
    if (m && !CO_WORD.test(m[1]) && !/^(Hi|Hello|Bonjour|Salut|Merci|Thanks|We|Nous|Je|On)$/i.test(m[1])) {
      out.person = m[1]; out.span = [m.index + m[0].indexOf(m[1]), m.index + m[0].indexOf(m[1]) + m[1].length];
      if (m[2]) setCo(m[2], m.index + m[0].indexOf(m[2]));
    }
    // "Nathalie, Rive-Sud": a closing name before a short name that is not a company word still gives the person.
    if (!sigOut && sig && !CO_WORD.test(sig[1]) && sig[1].split(/\s+/).length <= 2 && !canonTown(sig[1]) && !/^(Hi|Hello|Bonjour|Salut|Merci|Thanks|Thank|Sorry|D[ée]sol[ée]e?)$/i.test(sig[1])) { const pAt = sig.index + sig[0].indexOf(sig[1]); out.person = sig[1]; out.span = [pAt, pAt + sig[1].length]; }
    if (sigOut) { out.person = sigOut.person; out.span = [sigOut.pAt, sigOut.pAt + sigOut.person.length]; out.company = sigOut.company; out.companySpan = [sigOut.cAt, sigOut.cAt + sigOut.company.length]; }
    // Sign-off block: lines after the closing phrase, else the last short lines.
    const lines = []; let pos = 0;
    src.split('\n').forEach((ln) => { lines.push({ text: ln, at: pos }); pos += ln.length + 1; });
    let start = -1;
    lines.forEach((ln, i) => { if (/^\s*(thanks|thank you|merci(?: beaucoup)?|regards|best(?: regards)?|cheers|cordialement|salutations|bonne journ[ée]e|à bientôt|a\+|d[ée]sol[ée]e?|sorry|merci et bonne journ[ée]e)\s*[,!.]*\s*$/i.test(ln.text)) start = i + 1; });
    let block = start >= 0 ? lines.slice(start) : lines.slice(-2);
    block = block.filter((ln) => ln.text.trim()).slice(0, 3).filter((ln) => ln.text.trim().length <= 48 && !/\d|\$|[?!]/.test(ln.text) && /^[A-ZÀ-Ý]/.test(ln.text.trim()) && !/[.]\s+\S/.test(ln.text.trim()));
    block.forEach((ln) => {
      const t = ln.text.trim(); const at = ln.at + ln.text.indexOf(t);
      const tc = t.replace(/[.,]+$/, '').replace(/\s+(?:dispatch|répartition|billing|facturation|logistics|logistique|sales|ventes|accounting|comptabilité)$/i, '');
      // The signature completes a self-introduction: "Karine" + "Karine Bérard", "Transport Bérard" + "Transport Bérard et Fils".
      if (CO_WORD.test(t)) { if (!out.company || (tc.length > out.company.length && tc.toLowerCase().indexOf(out.company.toLowerCase()) === 0)) { out.company = tc; out.companySpan = [at, at + tc.length]; } }
      else if (new RegExp('^' + NAME + '$').test(tc) && (!out.person || (tc.length > out.person.length && tc.indexOf(out.person + ' ') === 0))) { out.person = tc; out.span = [at, at + tc.length]; }
    });
    // A bare name closing a one-paragraph message: "… jusqu'à lundi 15 h. Isabelle Roy".
    if (!out.person) {
      const tail = new RegExp('(?:^|[.!?]\\s+)(' + NAME + ')\\s*\\.?\\s*$').exec(src.replace(/\s+$/, ''));
      const notName = /^(Merci|Thanks|Thank|Bonne|Have|Regards|Cordialement|Salutations|Cheers|Sorry|D[ée]sol[ée]e?|Oui|Non|Yes|No|Ok|Okay|Svp|Please|Bonjour|Salut|Hi|Hello)\b/i;
      const isPlace = tail && (canonTown(tail[1]) || COMMODITIES.some((c) => c.re.test(tail[1])) || new RegExp('^' + WD + '$|^' + MON + '$', 'i').test(tail[1]));
      if (tail && !CO_WORD.test(tail[1]) && !notName.test(tail[1]) && !isPlace && (/\s/.test(tail[1]) || tail[1].length >= 3)) { const at = tail.index + tail[0].indexOf(tail[1]); out.person = tail[1]; out.span = [at, at + tail[1].length]; }
    }
    return out.person || out.company ? out : null;
  }

  /* Equipment as carriers write it, mapped to the desk's vehicle names. */
  const EQUIP = /\b(?:(?:8|7|six|huit|sept)[- ]?(?:axle|essieux)\s+)?(?:super[- ]?b(?:-?train)?|b-?trains?|train[- ]b|tridem|grain trailer|remorque(?:\s+(?:céréalière|à grain|trémie))?|hopper(?: trailer)?|trémie|straight truck|camion porteur)(?:\s+(?:hoppers?|trémie|(?:8|7)[- ]?(?:axle|essieux)))?/i;
  function equipName(s) {
    const t = s.toLowerCase();
    const axles = /8|huit/.test(t) ? 8 : /7|sept/.test(t) ? 7 : null;
    if (/super/.test(t)) return { value: 'Super B-train' + (axles ? ' (' + axles + ' axles)' : ''), axles: axles || 8, btrain: true };
    if (/b-?train|train[- ]b/.test(t)) return { value: axles ? axles + '-axle B-train hopper' : 'B-train (axles not stated)', axles: axles, btrain: true };
    if (/tridem/.test(t)) return { value: 'Tridem trailer', axles: 3, btrain: false };
    if (/straight|porteur/.test(t)) return { value: 'Straight truck', axles: null, btrain: false };
    return { value: 'Grain trailer (axles not stated)', axles: axles, btrain: false };
  }

  /* Validity: a trigger ("firm until", "need an answer by", "réponse d'ici", "bonne jusqu'à") followed by a day
     and/or a time in either order ("Monday noon", "3pm today", "demain midi", "11 h"). */
  const VT = /\b(?:(?:firm|good|valid|open|holds?|price is good|quote is good|quote good|rate is good|rate good|offer good|bid good|price good)\s+(?:until|till|through|thru|to)|(?:i |we )?needs?\s+(?:an?\s+)?(?:answer|reply|response|decision|confirmation|yes or no)\s+(?:by|before)|(?:answer|reply|respond|confirm|let (?:me|us) know|book it|decide)\s+(?:by|before)|(?:ferme|bonne?|valide|valable|tient)\s+jusqu[’']?\s*(?:à|a|au)|jusqu[’']?\s*(?:à|au)|(?:réponse|répondre|répondez|réponds|confirmer|confirmation|me revenir|me confirmer|nous confirmer|reviens-moi|revenez-moi|décision)(?:-moi|-nous)?\s+(?:avant|d[’']ici|pour)|(?:let (?:me|us) know|get back to (?:me|us)|fais-moi signe|faites-moi signe)\s+(?:by|before|avant|d[’']ici)|d[’']ici)\s+/gi;
  const DAYRE = new RegExp('^(?:' + WD + '|today|tomorrow|tonight|aujourd[’\']hui|demain|ce soir|' + MON + '\\s+\\d{1,2}|\\d{1,2}(?:er)?\\s+' + MON + ')', 'i');
  const TIMERE = new RegExp('^' + TIME_S, 'i');
  const CONNRE = /^(?:\s+|,|@|(?:at|à|a|le|ce|this|next|on|the|vers)(?=\s))+/i;

  /* ---------- Intent evidence: every signal scores, the strongest clear lead wins ---------- */
  const SIGNALS = [
    ['Supply offer', 3, KW("à vendre|a vendre|vendre|vends|on vend|je vends|to sell|could sell|can sell|we sell|for sale|selling|need (?:them|it|these|those) (?:gone|moved|out)|besoin d[’']écouler")],
    ['Supply offer', 2, KW('dispo|disponibles?|prêts?|prêtes?|available|ready|can offer|could offer|offering|on peut offrir')],
    ['Supply offer', 2, KW("si (?:ça|ca|cela) (?:t|vous)[’']intéresse|if you[’']?re interested|if you are interested|interested\\?|de plus|en surplus|surplus|extra (?:loads?|tonnes|corn|soy\\w*|wheat|barley)|à offrir|to offer")],
    // Having a quantity is an offer signal: "j'ai 2 voyages", "we have 6 loads", "nous aurions 1 200 tonnes".
    ['Supply offer', 2, KW("(?:j[’']ai|j[’']aurai[st]?|on a|nous avons|nous aurions|we have|we[’']ll have|we will have|i have|i[’']ll have|have)\\s+(?:about |around |roughly |environ |à peu près )?\\d")],
    ['Supply offer', 2, KW("je demande|on demande|asking|à la ferme|a la ferme|fob|farm gate|à ma cour|at the farm|on farm|chargement à|load(?:ing)? at")],
    ['Supply offer', 1, KW("j[’']aurai[st]?|j[’']ai|on a|on aura|nous avons|we have|we[’']ll have|we will have|i have|i[’']ll have|have|offre|offer")],
    ['Buyer demand', 3, KW("cherche|on cherche|looking for|want to buy|acheter|achète|buying|we buy|needs?(?! (?:an? )?(?:answer|reply|response|decision|confirmation|yes)| to sell| to (?:push|move|reschedule|postpone|shift|bump|delay|change|cancel)| (?:them|it|these|those) (?:gone|moved|out))|on aurait besoin|aurait besoin|besoin(?! de vendre| d[’']écouler)")],
    ['Buyer demand', 3, KW("on prendrait|prendrait|prendrions|pourrait prendre|pourrions prendre|on peut prendre|prendre|we can take|can take|could take|would take|we[’']d take|we would take|can use|could use")],
    ['Buyer demand', 2, KW("on paie|on paierait|paierait|payons|payerait|we pay|we[’']d pay|we can pay|we can do|bid|bids|bidding|offre d[’']achat")],
    ['Buyer demand', 1, KW('livr[ée]e?s?|livraison|rendu|delivered|delivery')],
    ['Carrier update', 3, KW("retard|en retard|late(?! (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\w*)|delay(?:ed)?|running behind|behind schedule|arrivée prévue|nouvelle arrivée|arrive vers|arrivera|will arrive|should arrive|should be there|crev[ée]|crevaison|flat tire|pneu|stuck|bloqué|traffic|trafic|on the road|sur la route|just left|vient de partir|est parti|departed")],
    ['Carrier cancellation', 5, KW("annul\\w*|cancel\\w*|ne pourr(?:a|ons) pas faire|on ne pourra pas|can[’']?t (?:do|make)|cannot (?:do|make)|won[’']t make|lost the truck|perdu le camion")],
    ['Carrier cancellation', 2, KW('en panne|breakdown|bris m[ée]canique')],
    ['Carrier decline', 5, KW("no (?:truck|trucks|capacity|equipment|unit)s?|pas de (?:camion|disponibilit\\w*|capacit\\w*|place)|aucun camion|fully booked|on est complets?|we are full|can[’']?t cover|cannot cover|unable to cover|pas capable de (?:faire|couvrir)")]
  ];

  /* ---------- Basis over futures in any written form ----------
     "CZ26 +44.00", "+45 over Dec", "45 over Z", "Dec +45", "Z +38 cents/bu", "+0,45 $/bu sur décembre", "base +12 $/t sur mars".
     Units: CAD/t, or US cents per bushel ($/bu is read as US dollars and converted to cents); unstated units stay null. */
  const FMON = '(janv(?:ier)?|jan(?:uary)?|mars|mar(?:ch)?|mai|may|juil(?:let)?|jul(?:y)?|ao[uû]t|aug(?:ust)?|sept?(?:embre|ember)?|nov(?:embre|ember)?|d[ée]c(?:embre|ember)?)\\.?(?![a-zà-ÿ])';
  const FLET = { 0: 'F', 2: 'H', 4: 'K', 6: 'N', 7: 'Q', 8: 'U', 10: 'X', 11: 'Z' };
  const LETM = { F: 0, H: 2, K: 4, N: 6, Q: 7, U: 8, X: 10, Z: 11 };
  function fmonIdx(w) { const m = String(w || '').toLowerCase(); if (/^jan/.test(m)) return 0; if (/^mar/.test(m)) return 2; if (/^ma[iy]/.test(m)) return 4; if (/^ju[il]/.test(m)) return 6; if (/^(ao|aug)/.test(m)) return 7; if (/^sep/.test(m)) return 8; if (/^nov/.test(m)) return 10; if (/^d[ée]c/.test(m)) return 11; return null; }
  const BVAL = '([+\\-−]?\\s*\\d{1,3}(?:[.,]\\d{1,2})?)';
  const BUNIT = '(\\$\\s*\\/\\s*t(?:onne)?\\b|\\$\\s*(?:la|par|per)\\s*(?:tonne|t)\\b|CAD\\s*\\/\\s*t\\b|\\/\\s*t\\b|(?:US)?\\$\\s*\\/\\s*bu\\b|\\$\\s*(?:par|le|per)\\s*(?:boisseau|bu|bushel)|c(?:ents?|ts?)?\\s*\\/\\s*bu\\b|cents?(?:\\s*(?:per|a|par|\\/)\\s*(?:bu|bushel|boisseau))?|¢(?:\\s*\\/\\s*bu)?)?';
  const BASIS_RE = [
    [new RegExp('\\b([CS])([FHKNQUXZ])(\\d{2})\\s*([+\\-−]\\s*\\d{1,3}(?:[.,]\\d{1,2})?)\\s*' + BUNIT, 'i'), (m) => ({ pre: m[1], let: m[2], yr: m[3], val: m[4], unit: m[5] })],
    [new RegExp('(?:\\b(?:base|basis)\\s*(?:de\\s*)?)?' + BVAL + '\\s*' + BUNIT + '\\s*(over|under|sur|au-dessus d[eu]|vs\\.?|against|on)\\s+(?:the\\s+|le\\s+|la\\s+)?(?:' + FMON + '|([CS]?)([FHKNQUXZ])(\\d{2})?(?![\\wà-ÿ]))', 'i'), (m) => ({ val: m[1], unit: m[2], conn: m[3], mon: m[4], pre: m[5], let: m[6], yr: m[7] })],
    [new RegExp('(?<![\\wà-ÿ-])(?:' + FMON + '|([CS]?)([FHKNQUXZ])(\\d{2})?)\\s+(?:corn\\s+|maïs\\s+|soy\\w*\\s+|soya\\s+)?([+\\-−]\\s*\\d{1,3}(?:[.,]\\d{1,2})?)\\s*' + BUNIT, 'i'), (m) => ({ mon: m[1], pre: m[2], let: m[3], yr: m[4], val: m[5], unit: m[6] })]
  ];
  function basisOf(src, commodity, refMin) {
    for (const [re, map] of BASIS_RE) {
      const g = new RegExp(re.source, 'gi'); let m;
      while ((m = g.exec(src))) {
        const r = map(m);
        if (r.let && r.let !== r.let.toUpperCase()) continue;               // codes are capital letters: "Z", "CZ26"
        if (r.conn && /^on$/i.test(r.conn) && !/^[+\-−]/.test(r.val.trim())) continue;
        const L = r.let ? r.let.toUpperCase() : FLET[fmonIdx(r.mon)];
        if (!L) continue;
        const pre = r.pre ? r.pre.toUpperCase() : commodity === 'soy' ? 'S' : commodity === 'corn' ? 'C' : 'FQX'.indexOf(L) >= 0 ? 'S' : 'C';
        let yr = r.yr;
        if (!yr) { const cur = new Date(BASE + Math.floor(refMin / 1440) * 86400000); const cy = cur.getUTCFullYear() % 100; yr = String(LETM[L] > cur.getUTCMonth() ? cy : cy + 1); }
        let v = num(r.val.replace(/\s/g, ''), 'price');
        if (r.conn && /under/i.test(r.conn)) v = -Math.abs(v);
        const us = r.unit ? r.unit.toLowerCase() : '';
        let unit = null; let note = '';
        if (/\/\s*t\b|tonne|\bt\b|cad/.test(us) && !/bu|bushel|boisseau/.test(us)) unit = 'CAD/t';
        else if (/\$/.test(us) && /bu|bushel|boisseau/.test(us)) { unit = 'USc/bu'; v = r2(v * 100); note = '“$/bu” read as US dollars per bushel over CBOT: ' + v + ' US¢/bu. '; }
        else if (us) unit = 'USc/bu';
        return { month: pre + L + yr, value: v, unit: unit, unitStated: !!unit, span: span(m), note: note };
      }
    }
    return null;
  }

  function parse(text, ref, opts) {
    const src = String(text || '');
    const refMin = ref == null ? 580 : ref;
    const today = Math.floor(refMin / 1440);
    const nextMonday = (() => { let d = today + 1; while (weekdayOf(d) !== 1) d += 1; return d; })();
    const nextWd = (wi) => { let off = today; while (weekdayOf(off) !== wi) off += 1; return off; };
    const dayOfToken = (w) => {
      if (/^(today|tonight|aujourd|ce soir)/i.test(w)) return today;
      if (/^(tomorrow|demain)/i.test(w)) return today + 1;
      if (new RegExp('^' + WD + '$', 'i').test(w)) return nextWd(wdIdx(w));
      const a = new RegExp(MON + '\\s+(\\d{1,2})', 'i').exec(w); const b = new RegExp('(\\d{1,2})(?:er)?\\s+' + MON, 'i').exec(w);
      if (a) return dayOff(monthIdx(a[1]), Number(a[2])); if (b) return dayOff(monthIdx(b[2]), Number(b[1]));
      return null;
    };
    const hm = (mins) => String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
    const f = {};
    const flags = [];
    const lang = detectLang(src);
    const commodityWord = COMMODITIES.some((c) => c.re.test(src));

    // Towns in reading order, and a lane "from X to Y" / "X – Y" / "de X à Y" / "X vers Y".
    const towns = [...src.matchAll(new RegExp(TOWN_ANY, 'gi'))].map((m) => ({ town: canonTown(m[1]), span: span(m) })).filter((t) => t.town);
    const LANE = new RegExp('(?:\\b(?:from|de|depuis|du)\\s+|\\bd[’\']\\s*)?' + TOWN_ANY + '\\s*(?:→|->|>|\\s[-–—]\\s|[–—]|\\s(?:to|vers|jusqu[’\']?(?:à|au)|à|a|au)\\s)\\s*' + TOWN_ANY, 'i');
    const laneM = LANE.exec(src);

    // Rates a carrier quotes: per tonne, per load or per km.
    const NUMR = '(\\d{1,4}(?:[.,]\\d{1,2})?)';
    const RATE_T = new RegExp('(?:\\$\\s*|CAD\\s*)' + NUMR + '\\s*(?:\\/|per|a|la)\\s*(?:t\\b|tonne|mt\\b)|' + NUMR + '\\s*\\$\\s*(?:\\/|par|la|per|du)\\s*(?:t\\b|tonne|tm\\b)|\\bat\\s+' + NUMR + '\\s*\\/\\s*t\\b', 'i');
    const RATE_L = new RegExp('(?:\\$\\s*|CAD\\s*)' + NUMR + '\\s*(?:\\/|per|a|par|the)\\s*(?:load|trip|run|voyage)|' + NUMR + '\\s*\\$\\s*(?:\\/|par|du|le|per|pour le)\\s*(?:voyage|load|trip)', 'i');
    const RATE_K = new RegExp('(?:\\$\\s*|CAD\\s*)' + NUMR + '\\s*(?:\\/|per|a|par)\\s*(?:km|kilom[eè]tre)|' + NUMR + '\\s*\\$\\s*(?:\\/|par|du|le|per)\\s*(?:km|kilom[eè]tre)', 'i');
    const rates = [['t', RATE_T.exec(src)], ['load', RATE_L.exec(src)], ['km', RATE_K.exec(src)]].filter((r) => r[1]).sort((a, b) => a[1].index - b[1].index);
    const haulVerb = /(we can cover|can cover|we can haul|can haul|can do|can run|on peut faire|on peut prendre|peut faire|on peut couvrir|dispo pour|available for|have a truck|j['’]ai un camion|on a un camion|pick\s?-?up|ramassage)/i.exec(src);
    const haul = /(cover|haul|trucking|\btruck\b|camion|transport(?:er)?|b-?train|train b|trailer|remorque|pick\s?-?up|ramassage|dispatch|répartition|can do|can run|on peut faire|peut faire|capacity|capacité|freight|\bfret\b|\btaux\b|\brate\b)/i.exec(src);

    // Commodity
    for (const c of COMMODITIES) { const m = c.re.exec(src); if (m) { f.commodity = { value: c.key, status: 'explicit', span: span(m) }; break; } }
    if (!f.commodity) f.commodity = { value: null, status: 'missing' };

    // Basis over futures (read before the intent: a basis is a bid's price form).
    const BS = basisOf(src, f.commodity.value, refMin);

    // Intent by scored evidence across every signal: load IDs, verbs, rates and lanes, the price form and the
    // counterparty's role from the records (opts.role). A clear lead wins; otherwise the intent stays Unclear.
    const loadRef = /\bLD-\d{4}\b/.exec(src);
    const role = opts && opts.role ? opts.role : null;
    const carrierWords = !!loadRef || KW('camions?|trucks?|voyages?|loads?|chauffeur|driver|b-?trains?|unité').test(src);
    const etaWord = new RegExp('(?:ETA|arriv[\\wé]*|heure d[’\']arrivée)[^.!?\\n]{0,40}?' + TIME_S, 'i').exec(src);
    const sc = { 'Supply offer': 0, 'Buyer demand': 0, 'Freight quote': 0, 'Carrier update': 0, 'Carrier reschedule': 0, 'Carrier cancellation': 0, 'Carrier decline': 0 };
    const ev = {};
    const hit = (k, w, m) => { if (!m) return; sc[k] += w; if (!ev[k] || ev[k].w < w) ev[k] = { w: w, span: span(m) }; };
    SIGNALS.forEach((sg) => hit(sg[0], sg[1], sg[2].exec(src)));
    if (BS) hit('Buyer demand', 2, { index: BS.span[0], 0: src.slice(BS.span[0], BS.span[1]) });
    // Reschedule: "push tomorrow's 8am pickup … to Monday", "décaler le chargement de lundi … à mardi", "move LD-4089 to Tuesday 6am".
    const RSV = 'push(?:ed)?|move[ds]?|moving|reschedul\\w*|postpone\\w*|bump(?:ed)?|shift(?:ed)?|d[ée]caler|d[ée]cale|reporter|reporte|repousser|repousse|remettre|d[ée]placer|d[ée]place';
    const RSDAY = '(?:(?:next|this|le|ce)\\s+)?(?:' + WD + '(?:\\s+prochain)?|today|tomorrow|demain|aujourd[’\']hui|' + MON + '\\s+\\d{1,2}|\\d{1,2}(?:er)?\\s+' + MON + ')';
    const RS = new RegExp('(?<![\\wà-ÿ-])(' + RSV + ')(?![\\wà-ÿ-])([^.!?\\n]{0,90}?)(?<![\\wà-ÿ-])(to|until|till|à|au|pour|jusqu[’\']?à)\\s+' + RSDAY, 'i').exec(src);
    const pickNoun = !!loadRef || KW('pick\\s?-?ups?|chargements?|load(?:s|ing)?|voyages?|livraisons?|deliver(?:y|ies)|appointments?|rendez-vous|rdv').test(src);
    // Moving a pickup to another day is logistics, whoever is mentioned in the body.
    if (RS && pickNoun) { hit('Carrier reschedule', 6, RS); sc['Carrier cancellation'] -= 3; sc['Supply offer'] -= 3; sc['Buyer demand'] -= 3; }
    const sellWords = KW('à vendre|for sale|asking|je demande').test(src);
    if (rates.length && haul) hit('Freight quote', 4, haulVerb || haul); else if (rates.some((r) => r[0] !== 't')) hit('Freight quote', 2, rates.find((r) => r[0] !== 't')[1]);
    if (laneM && (rates.length || haul)) hit('Freight quote', 2, laneM);
    if (commodityWord && !laneM) sc['Freight quote'] -= 2;
    if (sellWords) sc['Freight quote'] -= 3;
    if (!carrierWords && role !== 'Carrier') { sc['Carrier update'] = Math.min(0, sc['Carrier update']); sc['Carrier cancellation'] = Math.min(0, sc['Carrier cancellation']); sc['Carrier reschedule'] = Math.min(0, sc['Carrier reschedule']); }
    if (etaWord && (carrierWords || role === 'Carrier')) { hit('Carrier update', 2, etaWord); sc['Carrier cancellation'] -= 3; }
    if (loadRef) { hit('Carrier update', 3, loadRef); sc['Carrier cancellation'] += 1; sc['Supply offer'] -= 4; sc['Buyer demand'] -= 4; }
    if (!towns.length && !carrierWords) sc['Carrier decline'] = Math.min(0, sc['Carrier decline']);
    if (rates.length) sc['Carrier decline'] -= 3;
    if (role === 'Buyer') sc['Buyer demand'] += 4;
    if (role === 'Supplier') sc['Supply offer'] += 4;
    if (role === 'Carrier') { ['Carrier update', 'Carrier reschedule', 'Carrier cancellation', 'Carrier decline', 'Freight quote'].forEach((k) => { if (sc[k] > 0) sc[k] += 3; }); sc['Supply offer'] -= 4; sc['Buyer demand'] -= 4; }
    if (sc['Carrier reschedule'] > 0) sc['Carrier update'] -= 2;
    const ORDER = Object.keys(sc);
    const cands = ORDER.map((k) => ({ value: k, score: sc[k] })).sort((a, b) => b.score - a.score || ORDER.indexOf(a.value) - ORDER.indexOf(b.value));
    const top = cands[0]; const second = cands[1];
    if (top.score >= 3 && top.score - second.score >= 2) f.intent = { value: top.value, status: top.score >= 5 && top.score - second.score >= 3 ? 'explicit' : 'inferred', span: ev[top.value] ? ev[top.value].span : null, score: top.score, candidates: cands.slice(0, 3), note: role ? 'Counterparty on file is a ' + role.toLowerCase() + '.' : null };
    else f.intent = { value: 'Unclear', status: 'missing', span: null, candidates: cands.slice(0, 3), note: 'Low confidence: ' + cands.slice(0, 2).map((c) => c.value.toLowerCase() + ' (' + c.score + ')').join(' or ') + '. Nothing in the message settles it: choose the intent.' };
    if (loadRef) f.loadRef = { value: loadRef[0], status: 'explicit', span: span(loadRef) };
    const isFreight = f.intent.value === 'Freight quote';

    // Grade: "maïs #2", "No. 2 corn", "no 2 yellow", "grade 2", "n° 2", "catégorie 2".
    const g = /(?:^|[^\w#])((?:no\.?|n[o°º]\.?|#|grade|grad[eé]|cat[ée]gorie)\s?([1-5]))(?![\d.,])(?:\s*(yellow|jaune|ce\b|canada|western))?/i.exec(src);
    if (g && !/(?:unit|truck|camion|load|voyage|quai|dock)\s*$/i.test(src.slice(Math.max(0, g.index - 8), g.index + 1))) {
      const gs = g.index + g[0].indexOf(g[1]);
      const ge = g[3] ? g.index + g[0].length : gs + g[1].length;
      f.grade = { value: 'No. ' + g[2] + (g[3] ? ' ' + g[3].replace(/jaune/i, 'yellow').toLowerCase() : ''), status: 'explicit', span: [gs, ge] };
    } else f.grade = { value: null, status: 'missing' };

    // Validity first: its dates are not the window or the pickup.
    let vm = null; let vtm;
    VT.lastIndex = 0;
    while (!vm && (vtm = VT.exec(src))) {
      let pos = vtm.index + vtm[0].length; let day = null; let tm = null; let end = pos;
      for (let i = 0; i < 3; i++) {
        const rest = src.slice(pos); const c = CONNRE.exec(rest); const skip = c ? c[0].length : 0; const r2s = rest.slice(skip);
        const d = day == null ? DAYRE.exec(r2s) : null;
        if (d) { day = d[0]; pos += skip + d[0].length; end = pos; continue; }
        const t = tm == null ? TIMERE.exec(r2s) : null;
        if (t) { tm = t[0]; pos += skip + t[0].length; end = pos; continue; }
        break;
      }
      if (day || tm) vm = { start: vtm.index, end: end, day: day, time: tm };
    }
    const vh = /\b(?:good|valid|valable|bon(?:ne)?|firm|ferme|holds?)\s+(?:for|pour)\s+(\d{1,2})\s*(?:hours?|hrs?|h|heures?)\b/i.exec(src);
    if (vm) {
      const tmo = timeOf(vm.time);
      let off = vm.day ? dayOfToken(vm.day) : today;
      if (!vm.day && tmo.mins <= refMin % 1440) off = today + 1;
      if (off != null) { const at = off * 1440 + tmo.mins; f.validity = { value: label(off) + ' ' + hm(tmo.mins), at: at, status: tmo.stated ? 'explicit' : 'inferred', span: [vm.start, vm.end], note: tmo.stated ? 'Lapses at that time on the demo clock.' : 'No time stated: read as 17:00.' }; }
    } else if (vh) {
      const at = refMin + Number(vh[1]) * 60;
      f.validity = { value: label(Math.floor(at / 1440)) + ' ' + hm(at % 1440), at: at, status: 'explicit', span: span(vh), note: vh[1] + ' h from receipt (' + label(today) + ' ' + hm(refMin % 1440) + ').' };
    }
    if (!f.validity) f.validity = { value: null, status: 'missing', note: 'No validity stated.' };
    const vspan = f.validity.span;

    // Quantity: loads stay a count (CT-02.1); a stated total or per-load weight becomes the payload.
    const LOADS = /(?<![\wà-ÿ-])(\d{1,3}|a|an|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:more\s+|autres\s+|de plus\s+)?(voyages?|loads?|chargements?|camions?|trucks?|b-?trains?|trains b|runs?)\b/i;
    const qL = LOADS.exec(src);
    const tonnes = [...src.matchAll(/(\d{1,3}(?:[  \u202f\u2009,.]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d+)?)(\s?k)?\s*(tonnes? m[ée]triques?|tonnes?|tons\b|tm\b|mt\b|t\b)(?!\s*\/)/gi)].filter((m) => !/\$/.test(src.slice(Math.max(0, m.index - 2), m.index))).map((m) => { m[1] = String(num(m[1] + (m[2] || ''), 't')); return m; });
    const kw = thousands(src);
    if (kw && !tonnes.some((m) => Number(m[1]) === kw.value)) { const pm = [src.slice(kw.span[0], kw.span[1]), String(kw.value)]; pm.index = kw.span[0]; tonnes.push(pm); tonnes.sort((x, y) => x.index - y.index); }
    const qBu = /(\d{1,3}(?:[ ,  ]?\d{3})*)(\s?k)?\s*(bu\b|bushels?|boisseaux)(?!\s*\/)/i.exec(src);
    const approxBefore = (i) => /(about|around|approx\.?|approximately|roughly|environ|autour de|à peu près|~)\s*$/i.test(src.slice(Math.max(0, i - 16), i));
    const EQ_BEFORE = /(?:b-?trains?|train[- ]b|tridem|trailer|remorque|super[- ]?b|hoppers?|trémie|essieux|axles?|payload|charge utile|legal|légal)\s*(?:de|of|:|,|at|à)?\s*(?:about|around|environ|~)?\s*$/i;
    if (qL) {
      const n = /\d/.test(qL[1]) ? num(qL[1]) : /^an?$/i.test(qL[1]) ? 1 : NUM_WORDS[qL[1].toLowerCase()];
      const q = { value: n, unit: 'loads', status: 'explicit', span: span(qL), note: 'Load count, not a mass.' };
      tonnes.forEach((m) => {
        const v = num(m[1]); const after = src.slice(m.index + m[0].length, m.index + m[0].length + 22); const before = src.slice(Math.max(0, m.index - 22), m.index);
        const perLoad = /^\s*(?:per|par|each|chacun|chaque|\/)\s*(?:load|voyage|camion|truck)?|^\s*(?:each|chacun)/i.test(after) || /(?:loads?|voyages?) (?:of|de)\s*$/i.test(before) || EQ_BEFORE.test(before) || (isFreight && v >= 15 && v <= 45);
        const total = /^\s*(?:total|au total|en tout|in all|altogether)/i.test(after) || /total\s*(?:of|de)?\s*$/i.test(before);
        if (perLoad && !q.payload && v >= 15 && v <= 45) q.payload = { value: v, derived: false, span: span(m), approx: approxBefore(m.index) };
        else if ((total || v > 45) && !q.total) q.total = { value: v, span: span(m), approx: approxBefore(m.index) };
      });
      if (q.total && !q.payload && n) { const p = r2(q.total.value / n); if (p >= 15 && p <= 45) q.payload = { value: p, derived: true, span: q.total.span }; }
      q.span2 = q.total ? q.total.span : q.payload ? q.payload.span : null;
      q.note = q.payload ? (q.payload.derived ? 'Payload derived: ' + q.total.value + ' t ÷ ' + n + ' loads = ' + q.payload.value + ' t per load. Check it.' : 'Payload stated: ' + q.payload.value + ' t per load.') : 'Load count, not a mass. Choose a payload to convert.';
      if (approxBefore(qL.index) || (q.total && q.total.approx)) q.status = 'approx';
      f.quantity = q;
    } else if (tonnes.length && isFreight) {
      const m = tonnes.find((x) => num(x[1]) >= 15 && num(x[1]) <= 45);
      f.quantity = m ? { value: null, unit: 'loads', status: 'missing', payload: { value: num(m[1]), derived: false, span: span(m) }, span: span(m), note: 'Payload stated; number of loads not stated.' } : { value: null, status: 'missing' };
    } else if (tonnes.length) {
      const m = tonnes[0];
      f.quantity = { value: num(m[1]), unit: 't', status: approxBefore(m.index) ? 'approx' : 'explicit', span: span(m) };
    } else if (qBu) {
      f.quantity = { value: num(qBu[1] + (qBu[2] || ''), 'bu'), unit: 'bu', status: 'explicit', span: span(qBu), note: 'Bushels. Converting to tonnes needs the commodity bushel weight.' };
    } else f.quantity = { value: null, status: 'missing' };

    // Firmness: only words that hedge availability make a lot tentative; "about 115 t" is an approximate quantity.
    const cert = /(probablement|peut-[eê]tre|possiblement|sans doute|probably|maybe|possibly|might|likely|si tout va bien|if all goes well)/i.exec(src);
    f.certainty = cert ? { value: 'Tentative', status: 'explicit', span: span(cert), note: '“' + cert[0] + '” keeps this tentative: it does not add to firm inventory.' } : { value: 'Not qualified', status: 'inferred', note: 'No hedging word found; still unconfirmed until the counterparty commits.' };

    // Moisture / protein / test weight
    let mo = /(humidit[ée]|moisture|hum\.?)((?:\s*(?:est|is|will be|sera|plutôt|plutot|closer to|now|maintenant|autour de|around|environ|approximately|approx\.?|about|max(?:imum)?|maxi|de|of|at|à|a|:|d[’']))*)\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*%?/i.exec(src);
    let moVal = mo ? mo[3] : null;
    if (!mo) { mo = /(\d{1,2}(?:[.,]\d{1,2})?)\s*%?\s*(?:d[’']|de\s+)(humidit[ée])|(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*(?:max(?:imum)?\s+)?(moisture)/i.exec(src); moVal = mo ? mo[1] || mo[3] : null; }
    f.moisture = mo ? { value: num(moVal), status: /autour|around|environ|approx|about/i.test(mo[0]) || cert ? 'approx' : 'explicit', span: span(mo), note: /max/i.test(mo[0]) || /max/i.test(src.slice(Math.max(0, mo.index - 6), mo.index + 4)) ? 'Stated as a maximum.' : 'Supplier statement, not a lab result.' } : { value: null, status: 'missing', note: 'Missing: blocks a firm compatibility call.' };
    const pr = /(prot[ée]ines?|protein)\s*(?:de|of|at|à|:)?\s*(\d{1,2}(?:[.,]\d)?)\s*%?/i.exec(src);
    if (pr) f.protein = { value: num(pr[2]), status: 'explicit', span: span(pr) };
    const tw = /(\d{2}(?:[.,]\d)?)\s*(?:lb|lbs)\s*(?:\/\s*bu|par boisseau|per bushel)?|(?:poids sp[ée]cifique|test weight)\s*(?:of|de|:|min(?:imum)?|is|est)?\s*(\d{2}(?:[.,]\d)?)/i.exec(src);
    f.testWeight = tw ? { value: num(tw[1] || tw[2]), status: 'explicit', span: span(tw), note: /min/i.test(src.slice(tw.index, tw.index + tw[0].length + 10)) ? 'Stated as a minimum.' : undefined } : { value: null, status: 'missing' };

    // Price: flat CAD/t, per bushel, or basis over a futures month (any written form, see basisOf). A carrier's rate is not a grain price.
    const pT = /(\d{2,4}(?:[.,]\d{1,2})?)\s*(?:\$|CAD|\$CA|CA\$)\s*(?:\/|par|la|per|a|\s)*\s*(?:la\s+)?(t\b|tonne|tm\b|mt\b)|(?:\$|CAD\s?)(\d{2,4}(?:[.,]\d{1,2})?)\s*(?:\/|per|a)\s*(t\b|tonne|mt\b)|(\d{2,4}[.,]\d{2})\s*\/\s*t\b/i.exec(src);
    const pBu = /(\d{1,2}[.,]\d{2,4})\s*(?:\$|USD|US\$|CAD)?\s*(?:\/|par|per|le)\s*(bu\b|boisseau|bushel)/i.exec(src);
    if (isFreight) f.price = { value: null, status: 'missing', note: 'Carrier rate, not a grain price: see Rate.' };
    else if (BS) {
      const sg = BS.value >= 0 ? '+' : '';
      f.price = { value: null, unit: 'CAD/t', priceType: 'basis', month: BS.month, basisValue: BS.value, basisUnit: BS.unit, unitStated: BS.unitStated, status: 'explicit', span: BS.span, note: BS.note + 'Basis ' + sg + BS.value + (BS.unit === 'CAD/t' ? ' CAD/t' : BS.unit === 'USc/bu' ? ' US¢/bu' : '') + ' over ' + BS.month + '.' + (BS.unit ? '' : ' Units not stated: CAD/t or US cents per bushel? Confirm, unless the buyer’s convention is on file.') };
    } else if (pT) f.price = { value: num(pT[1] || pT[3] || pT[5]), unit: 'CAD/t', status: 'explicit', span: span(pT) };
    else if (pBu) f.price = { value: num(pBu[1]), unit: /USD|US\$/i.test(pBu[0]) ? 'USD/bu' : 'CAD/bu', status: 'explicit', span: span(pBu), note: 'Per-bushel price: convert explicitly before comparing with CAD/t bids.' };
    else f.price = { value: null, status: 'missing' };
    if (f.price.value != null || f.price.priceType === 'basis' || isFreight) {
      const cur = /(USD|US\$|CAD|\$CA|CA\$)/i.exec(src);
      f.currency = cur ? { value: /US/i.test(cur[1]) ? 'USD' : 'CAD', status: 'explicit', span: span(cur) } : { value: 'CAD', status: 'inferred', note: '“$” read as CAD because the sender is in Québec. Confirm.' };
    }

    // Price basis
    const fob = /(à la ferme|a la ferme|à ma cour|a ma cour|\bfob\b|at the farm|farm gate|on farm)/i.exec(src);
    const del = /(\brendu\b|livr[ée]e?s?|delivered|\bdel\b|\bcif\b)/i.exec(src);
    if (fob) f.basis = { value: 'FOB farm', status: 'explicit', span: span(fob) };
    else if (del) f.basis = { value: 'Delivered', status: 'explicit', span: span(del) };
    else f.basis = { value: null, status: 'missing' };

    // Window: explicit ranges first (both ends filled), then weekday ranges, "next week", single dates and days.
    const notVal = (m) => m && !inside(span(m), vspan) && !(BS && inside(span(m), BS.span));
    const first = (re) => { let m; const g2 = new RegExp(re.source, 'gi'); while ((m = g2.exec(src))) { if (notVal(m)) return m; } return null; };
    const rA = first(new RegExp('\\b' + MON + '\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*' + CONN + '\\s*(?:' + MON + '\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\b', 'i'));
    const rB = first(new RegExp('\\b(?:du\\s+|from\\s+|between\\s+|entre le\\s+|le\\s+)?(\\d{1,2})(?:er|st|nd|rd|th)?(?:\\s+' + MON + ')?\\s*' + CONN + '\\s*(?:le\\s+)?(\\d{1,2})(?:er|st|nd|rd|th)?\\s+' + MON, 'i'));
    const wkOf = first(new RegExp('\\b(?:semaine du|week of)\\s+(?:(\\d{1,2})(?:er)?\\s+' + MON + '|' + MON + '\\s+(\\d{1,2}))', 'i'));
    const rW = first(new RegExp('\\b(?:du\\s+|from\\s+)?' + WD + '\\s*' + CONN + '\\s*' + WD, 'i'));
    const nextWeek = first(/(la semaine prochaine|semaine prochaine|next week)/i);
    const single = first(new RegExp('\\b' + MON + '\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b|\\b(\\d{1,2})(?:er)?\\s+' + MON, 'i'));
    const tom = first(/\b(demain|tomorrow)\b/i);
    const tod = first(/\b(today|aujourd[’']hui|ce matin|cet après-midi|cet apres-midi|this morning|this afternoon|tonight|ce soir)\b/i);
    // Parts of a month and relative windows: "first half of December", "fin novembre", "mi-novembre", "early November",
    // "by Nov 6", "avant la fin du mois", "en décembre".
    const PART = first(new RegExp('\\b(first half|1st half|premi[èe]re quinzaine|second half|2nd half|deuxi[èe]me quinzaine|seconde quinzaine|early|beginning of|d[ée]but(?: de| du)?|mid-|mid|middle of|mi-|late|end of|fin(?: de| du)?)\\s*(?:of\\s+|de\\s+|d[’\']\\s*)?' + MON, 'i'));
    const BYD = first(new RegExp('\\b(?:by|before|no later than|not later than|avant le|avant|au plus tard le)\\s+(?:the\\s+)?(?:' + MON + '\\s+(\\d{1,2})(?:st|nd|rd|th)?|(\\d{1,2})(?:er)?\\s+' + MON + ')', 'i'));
    const EOM = first(/\b(?:avant|d[’']ici|by|before|until)\s+(?:la\s+|the\s+)?(?:fin du mois|end of (?:the )?month)|\b(?:this month|ce mois-ci)\b/i);
    const WMON = first(new RegExp('\\b(?:en|in|during|for|pour|courant|au cours de|tout)\\s+(?:le mois de\\s+|the month of\\s+)?' + MON + '(?!\\s*\\d)', 'i'));
    const lastDay = (mi) => new Date(Date.UTC(mi < 8 ? 2027 : 2026, mi + 1, 0)).getUTCDate();
    const oneWd = first(new RegExp('\\b(?:(?:this|next|ce|le)\\s+)?' + WD + '(?:\\s+(?:prochain|next))?', 'i'));
    const win = (a, b, m, status, note, m2) => { if (a == null || b == null || b < a || b - a > 120) return null; return { value: label(a) + ' – ' + label(b), start: a * 1440, end: b * 1440 + 1439, status: status, span: span(m), span2: m2 ? span(m2) : null, note: note }; };
    let W = null;
    const ranges = [];
    if (rA) { const m1 = monthIdx(rA[1]); const m2 = rA[3] ? monthIdx(rA[3]) : m1; ranges.push({ m: rA, a: dayOff(m1, Number(rA[2])), b: dayOff(m2, Number(rA[4])) }); }
    if (rB) { const m2 = monthIdx(rB[4]); const m1 = rB[2] ? monthIdx(rB[2]) : m2; ranges.push({ m: rB, a: dayOff(m1, Number(rB[1])), b: dayOff(m2, Number(rB[3])) }); }
    ranges.sort((x, y) => x.m.index - y.m.index);
    if (ranges.length) W = win(ranges[0].a, ranges[0].b, ranges[0].m, 'explicit');
    if (!W && rW) {
      let base = nextMonday; let note = '“Next week” resolved against ' + label(today) + '.';
      if (wkOf) { const d = wkOf[1] ? dayOff(monthIdx(wkOf[2]), Number(wkOf[1])) : dayOff(monthIdx(wkOf[3]), Number(wkOf[4])); base = d - ((weekdayOf(d) + 6) % 7); note = 'Week of ' + label(base) + '.'; }
      else if (!nextWeek) note = 'Week not stated; read as next week (from ' + label(nextMonday) + ').';
      const ia = (wdIdx(rW[1]) + 6) % 7; const ib = (wdIdx(rW[2]) + 6) % 7;
      W = win(base + ia, base + ib, rW, wkOf || nextWeek ? 'inferred' : 'approx', note, wkOf || nextWeek);
    }
    if (!W && wkOf) { const d = wkOf[1] ? dayOff(monthIdx(wkOf[2]), Number(wkOf[1])) : dayOff(monthIdx(wkOf[3]), Number(wkOf[4])); const mon = d - ((weekdayOf(d) + 6) % 7); W = win(mon, mon + 4, wkOf, 'inferred', 'Week of ' + label(mon) + ', Monday to Friday.'); }
    if (!W && PART) {
      const mi = monthIdx(PART[2]); const pw = PART[1].toLowerCase(); const last = lastDay(mi); let a; let b;
      if (/first|1st|premi/.test(pw)) { a = 1; b = 15; } else if (/second|2nd|deuxi|seconde/.test(pw)) { a = 16; b = last; } else if (/early|beginning|d[ée]but/.test(pw)) { a = 1; b = 10; } else if (/^mi|middle/.test(pw)) { a = 11; b = 20; } else { a = 21; b = last; }
      W = win(dayOff(mi, a), dayOff(mi, b), PART, 'inferred', '“' + PART[0] + '” read as ' + label(dayOff(mi, a)) + ' – ' + label(dayOff(mi, b)) + '. Confirm the exact dates.');
    }
    if (!W && BYD) { const d = BYD[1] ? dayOff(monthIdx(BYD[1]), Number(BYD[2])) : dayOff(monthIdx(BYD[4]), Number(BYD[3])); W = win(today, d, BYD, 'inferred', 'Up to ' + label(d) + ', from ' + label(today) + '.'); }
    if (!W && EOM) { const cur = new Date(BASE + today * 86400000); const d = Math.round((Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 0) - BASE) / 86400000); W = win(today, d, EOM, 'inferred', 'By the end of the month: ' + label(today) + ' – ' + label(d) + '.'); }
    if (!W && nextWeek && oneWd && !inside(span(oneWd), span(nextWeek))) { const d = nextMonday + (wdIdx(oneWd[1]) + 6) % 7; W = win(d, d, oneWd, 'inferred', label(d) + ': that day next week.', nextWeek); }
    if (!W && nextWeek) W = win(nextMonday, nextMonday + 4, nextWeek, 'inferred', '“Next week” resolved against ' + label(today) + ': Monday to Friday.');
    if (!W && single) { const d = single[1] ? dayOff(monthIdx(single[1]), Number(single[2])) : dayOff(monthIdx(single[4]), Number(single[3])); W = win(d, d, single, 'explicit', 'One date only: start and end on that day.'); }
    if (!W && WMON) { const mi = monthIdx(WMON[1]); W = win(dayOff(mi, 1), dayOff(mi, lastDay(mi)), WMON, 'inferred', 'The whole of ' + MO_SHORT[mi] + ': ' + label(dayOff(mi, 1)) + ' – ' + label(dayOff(mi, lastDay(mi))) + '. Confirm the dates.'); }
    if (!W && tom) W = win(today + 1, today + 1, tom, 'inferred', '“Tomorrow” resolved against ' + label(today) + '.');
    if (!W && tod) W = win(today, today, tod, 'inferred', '“Today”: ' + label(today) + '.');
    if (!W && oneWd) { let d = nextWd(wdIdx(oneWd[1])); if (/next|prochain/i.test(oneWd[0]) && d - today < 7 && d < nextMonday) d += 7; W = win(d, d, oneWd, 'inferred', label(d) + ': the next ' + WD_SHORT[weekdayOf(d)] + ' from ' + label(today) + '.'); }
    f.window = W || { value: null, status: 'missing' };

    // Origin (supply offers): a town with a farm or pickup word before it, else the first town not after a delivery word.
    const DELIV0 = /(livr[ée]e?s?|livrables?|livraison|rendu|delivered|delivery|deliver(?:ed)? to|usine|plant|mill|meunerie|moulin|entrep[ôo]t|warehouse|terminal|réception|receiving)[^.\n]{0,40}$/i;
    const ORIG_CTX = /(ferme|farm|cour|chargement|pickup|pick up|load(?:ing)? at|from|depuis|silo|élévateur|elevator|je suis à|i[’']m in|we[’']re in)\s*(?:in|à|a|at|de|du)?\s*$/i;
    const oT = towns.find((t) => ORIG_CTX.test(src.slice(Math.max(0, t.span[0] - 30), t.span[0]))) || towns.find((t) => !DELIV0.test(src.slice(Math.max(0, t.span[0] - 48), t.span[0]))) || towns[0];
    let origin = oT ? { value: oT.town, status: 'explicit', span: oT.span } : null;
    if (!origin) {
      const m = /(?:silo|ferme|cour|farm|elevator|élévateur)\s+(?:de|à|at|in)\s+((?:Saint|Sainte|St|Ste)[-\s][A-ZÉ][\wéèêàç’'-]+)/i.exec(src);
      if (m) origin = { value: m[1].replace(/^St[-\s]/i, 'Saint-').replace(/^Ste[-\s]/i, 'Sainte-'), status: 'explicit', span: span(m) };
    }
    f.origin = origin || { value: null, status: 'missing', note: 'Unknown in the message. It stays unknown until you confirm it.' };

    // Destination (buyer demands): the town after a delivery word ("livrés à notre usine de Saint-Hyacinthe").
    const DELIV = /(livr[ée]e?s?|livraison|rendu|delivered|delivery|deliver(?:ed)? to|usine|plant|mill|meunerie|moulin|entrep[ôo]t|warehouse|terminal|réception|receiving)[^.\n]{0,40}$/i;
    const dTown = towns.find((t) => DELIV.test(src.slice(Math.max(0, t.span[0] - 48), t.span[0])) && !(vspan && inside(t.span, vspan))) || (f.intent.value === 'Buyer demand' ? towns[0] : null);
    f.destination = dTown ? { value: dTown.town, status: DELIV.test(src.slice(Math.max(0, dTown.span[0] - 48), dTown.span[0])) ? 'explicit' : 'inferred', span: dTown.span } : { value: null, status: 'missing' };

    // Price-basis alternatives: "livrable … à Trois-Rivières ou FOB ferme à Saint-Hugues",
    // "either FOB our farm in Saint-Damase at $232/t or delivered Saint-Césaire at $246/t".
    const OPT_D = new RegExp('(?<![\\wà-ÿ-])(livrables?|livr[ée]e?s?|rendue?s?|delivered|delivery)(?:\\s+(?:en|in|le|on|from)\\s+[\\wà-ÿ]+)?\\s+(?:à|a|au|to|at|in)?\\s*' + TOWN_ANY, 'gi');
    const OPT_F = new RegExp('(?<![\\wà-ÿ-])(fob(?:\\s+(?:la\\s+)?(?:ferme|farm|our farm|notre ferme|my farm))?|à ma cour|a ma cour|à la ferme|a la ferme|at (?:our|the|my) farm|farm gate|ma ferme|notre ferme)\\s*(?:in|à|a|at|de)?\\s*' + TOWN_ANY, 'gi');
    const bopts = [...src.matchAll(OPT_D)].map((m) => ({ basis: 'Delivered', town: canonTown(m[2]), span: span(m) })).concat([...src.matchAll(OPT_F)].map((m) => ({ basis: 'FOB farm', town: canonTown(m[2]), span: span(m) }))).sort((a, b) => a.span[0] - b.span[0]);
    const alt = bopts.length >= 2 && bopts[0].basis !== bopts[1].basis && KW('ou|or|either|soit|sinon').test(src.slice(bopts[0].span[0], bopts[1].span[1]));
    if (alt) {
      const two = bopts.slice(0, 2);
      two.forEach((o, i) => {
        const endSeg = i === 0 ? two[1].span[0] : (/[.!?\n]/.exec(src.slice(o.span[1])) || { index: src.length - o.span[1] }).index + o.span[1];
        const seg = src.slice(o.span[1], endSeg);
        const pm = /(?:\$|CAD\s?)\s*(\d{2,4}(?:[.,]\d{1,2})?)\s*(?:\/|per|a|la)\s*(?:t\b|tonne|tm\b|mt\b)|(\d{2,4}(?:[.,]\d{1,2})?)\s*\$\s*(?:\/|par|la|per)?\s*(?:t\b|tonne|tm\b)/i.exec(seg);
        o.price = pm ? num(pm[1] || pm[2], 'price') : null;
        if (pm) o.priceSpan = [o.span[1] + pm.index, o.span[1] + pm.index + pm[0].length];
      });
      f.basisOptions = { value: two.map((o) => o.basis + ' ' + o.town + (o.price != null ? ' at ' + o.price : '')).join(' or '), options: two, status: 'explicit', span: two[0].span, span2: two[1].span, note: 'Two price bases offered.' + (two.some((o) => o.price == null) ? ' The price is stated once: ask which basis it is for.' : '') };
      const fobO = two.find((o) => o.basis === 'FOB farm');
      if (fobO) { f.origin = { value: fobO.town, status: 'explicit', span: fobO.span, note: 'FOB farm option.' }; if (fobO.price != null) f.price = { value: fobO.price, unit: 'CAD/t', status: 'explicit', span: fobO.priceSpan, note: 'FOB farm option; the delivered option is compared separately.' }; }
      f.basis = { value: 'FOB farm', status: 'explicit', span: (fobO || two[0]).span, note: 'With a delivered alternative.' };
    }

    // Carrier quote: lane, pickup date and time, equipment, rate and rate basis, fuel.
    if (isFreight || f.intent.value === 'Carrier decline') {
      let lane = null;
      if (laneM) lane = { value: canonTown(laneM[1]) + ' → ' + canonTown(laneM[2]), from: canonTown(laneM[1]), to: canonTown(laneM[2]), status: 'explicit', span: span(laneM) };
      else if (towns.length >= 2 && towns[0].town !== towns[1].town) lane = { value: towns[0].town + ' → ' + towns[1].town, from: towns[0].town, to: towns[1].town, status: 'inferred', span: towns[0].span, span2: towns[1].span, note: 'Read in order: first town as pickup, second as delivery. Check it.' };
      else if (towns.length === 1) lane = { value: null, from: /(?:to|vers|à|livr|deliver)\s*$/i.test(src.slice(Math.max(0, towns[0].span[0] - 12), towns[0].span[0])) ? null : towns[0].town, to: null, status: 'missing', span: towns[0].span, note: 'Only one town stated.' };
      f.lane = lane || { value: null, from: null, to: null, status: 'missing' };
    }
    if (isFreight) {
      const PICK = new RegExp('(?:pick\\s?-?up|loading|load at|chargement|ramassage|départ|depart|on site|sur place|at the farm|à la ferme)\\s*(?:time\\s*)?(?:at|à|a|@|:|vers|for|prévu|prévue)?\\s*(' + TIME_S + ')', 'i');
      let pt = null; let m; const gp = new RegExp(PICK.source, 'gi');
      while ((m = gp.exec(src))) { if (!inside(span(m), vspan)) { pt = { text: m[1], span: [m.index + m[0].lastIndexOf(m[1]), m.index + m[0].length] }; break; } }
      if (!pt && W && W.span) { const after = src.slice(W.span[1]); const am = new RegExp('^\\s*,?\\s*(?:at|à|a|@|vers|dès|from)?\\s*(' + TIME_S + ')', 'i').exec(after); if (am) pt = { text: am[1], span: [W.span[1] + am[0].lastIndexOf(am[1]), W.span[1] + am[0].length] }; }
      const day = W ? Math.floor(W.start / 1440) : null;
      const tmo = pt ? timeOf(pt.text) : null;
      f.pickup = day != null ? { value: label(day) + (tmo ? ' ' + hm(tmo.mins) : ''), at: day * 1440 + (tmo ? tmo.mins : 420), day: day, timeStated: !!tmo, status: tmo ? W.status : 'approx', span: W.span, span2: pt ? pt.span : null, note: (W.end - W.start > 1439 ? 'Window ' + W.value + ': first day used. ' : '') + (tmo ? '' : 'No pickup time stated: 07:00 assumed until the carrier confirms.') + (W.note && W.status !== 'explicit' ? ' ' + W.note : '') } : { value: null, status: 'missing', note: pt ? 'Pickup time ' + pt.text + ' stated without a day.' : 'No pickup day stated.', span2: pt ? pt.span : null };
      const eq = EQUIP.exec(src);
      if (eq) { const e = equipName(eq[0]); f.equipment = { value: e.value, axles: e.axles, btrain: e.btrain, status: 'explicit', span: span(eq) }; } else f.equipment = { value: null, status: 'missing', note: 'Equipment not stated: payload cannot be assumed.' };
      if (rates.length) {
        const [basis, rm] = rates[0]; const val = num(rm.slice(1).find((x) => x != null));
        f.rate = { value: val, basis: basis, status: 'explicit', span: span(rm), note: basis === 't' ? 'CAD per tonne.' : basis === 'load' ? 'CAD per load: converted with the payload.' : 'CAD per km: converted with the lane distance and the payload.' };
      } else f.rate = { value: null, basis: null, status: 'missing' };
      const fsc = /(\d{1,2}(?:[.,]\d)?)\s*%\s*(?:de\s+)?(?:fuel|carburant|FSC|surcharge|de surcharge)|(?:fuel(?: surcharge)?|FSC|surcharge(?: carburant)?|carburant)\s*(?:of|de|:|\+|at|à|en sus)?\s*(\d{1,2}(?:[.,]\d)?)\s*%/i.exec(src);
      const fin = /(fuel included|incl(?:uding|\.)? fuel|all[- ]in|tout compris|tout inclus|carburant inclus|incluant le carburant|FSC included)/i.exec(src);
      const fextra = /(plus fuel|\+ ?fuel|fuel extra|plus (?:le )?carburant|carburant en sus|\+ ?carburant|plus FSC|\+ ?FSC)/i.exec(src);
      f.fsc = fsc ? { value: num(fsc[1] || fsc[2]), status: 'explicit', span: span(fsc), note: 'Fuel surcharge added before ranking.' } : fin ? { value: 0, included: true, status: 'explicit', span: span(fin), note: 'Fuel included: all-in rate.' } : fextra ? { value: null, status: 'missing', span: span(fextra), note: 'Fuel is extra but the percentage is not stated: ask.' } : { value: null, status: 'missing', note: 'Fuel not stated: ask whether the rate is all-in.' };
    }

    // Carrier update: the new ETA (and the one it replaces), the delay, a departure time.
    if (f.intent.value === 'Carrier update') {
      const ETA_T = /(?:\bETA\b|arriv[\wé]*|heure d[’']arrivée|sera là|be there|on site)/gi; let em;
      while ((em = ETA_T.exec(src))) {
        const from = em.index + em[0].length; const tail = src.slice(from, from + 48).split(/[.!?\n]/)[0];
        const t = new RegExp(TIME_S, 'i').exec(tail);
        if (t && !/^\s*(?:au lieu de|instead of)/i.test(tail.slice(0, t.index))) {
          const tt = timeOf(t[0]); const a = from + t.index; const b = a + t[0].length;
          f.eta = { value: hm(tt.mins), at: today * 1440 + tt.mins + (/demain|tomorrow/i.test(tail) ? 1440 : 0), status: 'explicit', span: [em.index, b] };
          const pv = new RegExp('^\\s*(?:au lieu de|instead of|rather than|plutôt que|plutot que|not)\\s*(?:the\\s+|les?\\s+)?(' + TIME_S + ')', 'i').exec(src.slice(b));
          if (pv) { const pt = timeOf(pv[1]); f.etaPrev = { value: hm(pt.mins), at: today * 1440 + pt.mins, status: 'explicit', span: [b + pv[0].indexOf(pv[1]), b + pv[0].length] }; }
          break;
        }
      }
      const dl = /(\d{1,3})\s*(?:min(?:utes)?|mins)\b(?:\s+(?:late|de retard|behind|en retard))?|(?:retard (?:de|d['’]environ)|delay(?:ed)? (?:of|by))\s*(\d{1,3})\s*(?:min|minutes)|(\d)\s*h(?:eures?)?\s+(?:de retard|late|behind)/i.exec(src);
      if (dl) f.delay = { value: dl[3] ? Number(dl[3]) * 60 : Number(dl[1] || dl[2]), status: 'explicit', span: span(dl) };
      else if (f.eta && f.etaPrev && f.eta.at > f.etaPrev.at) f.delay = { value: f.eta.at - f.etaPrev.at, status: 'inferred', span: f.etaPrev.span, note: 'From the new ETA against the one it replaces.' };
      const dep = new RegExp('(?:leave|depart|départ|partir|partira|repart\\w*)\\s*(?:at|à|around|vers|about|autour de)?\\s*(' + TIME_S + ')', 'i').exec(src);
      if (dep) { const dt = timeOf(dep[1]); f.departure = { value: hm(dt.mins), at: today * 1440 + dt.mins, status: 'explicit', span: span(dep) }; }
    }

    // Carrier reschedule: the pickup it moves (day, time, site), the new day and time, same rate, the reason.
    if (f.intent.value === 'Carrier reschedule' && RS) {
      const sStart = Math.max(src.lastIndexOf('\n', RS.index), src.lastIndexOf('. ', RS.index), src.lastIndexOf('! ', RS.index), src.lastIndexOf('? ', RS.index)) + 1;
      const midEnd = RS.index + RS[1].length + RS[2].length;
      const before = src.slice(sStart, midEnd);
      const dA = new RegExp('(?<![\\wà-ÿ-])' + RSDAY, 'i').exec(before);
      const tA = new RegExp(TIME_S, 'i').exec(before.replace(/LD-\d{4}/g, (x) => ' '.repeat(x.length)));
      let fromDay = dA ? dayOfToken(dA[0].replace(/^(next|this|le|ce)\s+/i, '').replace(/\s+prochain$/i, '').replace(/['’]s$/i, '')) : null;
      const fromT = tA ? timeOf(tA[0]) : null;
      // Target: the day after the connector, then an optional time.
      const tgtAt = midEnd + RS[3].length; const tgt = src.slice(tgtAt).replace(/^\s+/, '');
      const tgtOff = tgtAt + (src.slice(tgtAt).length - tgt.length);
      const dB = new RegExp('^' + RSDAY, 'i').exec(tgt);
      let toDay = dB ? dayOfToken(dB[0].replace(/^(next|this|le|ce)\s+/i, '').replace(/\s+prochain$/i, '')) : null;
      if (toDay != null && fromDay != null && toDay <= fromDay && new RegExp('^(?:(?:next|this|le|ce)\\s+)?' + WD, 'i').test(dB[0])) toDay += 7;
      if (toDay != null && toDay <= today && new RegExp('^(?:(?:next|this|le|ce)\\s+)?' + WD, 'i').test(dB[0])) toDay += 7;
      const tB = dB ? new RegExp('^\\s*(?:at|à|a|,|@|vers|dès)?\\s*(' + TIME_S + ')', 'i').exec(tgt.slice(dB[0].length)) : null;
      const toT = tB ? timeOf(tB[1]) : null;
      const site = /(?:\bat|\bchez|de chez|from|à la ferme)\s+((?:la |le )?[A-ZÀ-Ý][\wà-ÿ’'-]*(?:\s+(?:et|de|du|des|[A-ZÀ-Ý][\wà-ÿ’'-]*))*)/.exec(before);
      const same = KW('same rate|même taux|même prix|same price|rate unchanged|taux inchangé|no change (?:to|in) (?:the )?rate').exec(src);
      const why = /(driver (?:is )?sick|chauffeur (?:est )?malade|en formation|in training|mechanical|bris|weather|météo|tempête|storm|road closed|route fermée)/i.exec(src);
      f.reschedule = {
        from: { day: fromDay, mins: fromT ? fromT.mins : null, at: fromDay != null ? fromDay * 1440 + (fromT ? fromT.mins : 0) : null, timeStated: !!fromT, span: dA ? [sStart + dA.index, sStart + dA.index + dA[0].length] : null },
        to: { day: toDay, mins: toT ? toT.mins : null, timeStated: !!toT, span: dB ? [tgtOff, tgtOff + dB[0].length + (tB ? tB[0].length : 0)] : null },
        siteText: site ? site[1].replace(/^(la|le)\s+/i, '') : null, siteSpan: site ? [sStart + site.index + site[0].indexOf(site[1]), sStart + site.index + site[0].indexOf(site[1]) + site[1].length] : null,
        sameRate: !!same, sameSpan: same ? span(same) : null, reason: why ? why[0] : null };
      f.rsFrom = { value: fromDay != null ? label(fromDay) + (fromT ? ' ' + hm(fromT.mins) : '') : null, status: fromDay != null ? 'explicit' : 'missing', span: f.reschedule.from.span };
      f.rsTo = { value: toDay != null ? label(toDay) + (toT ? ' ' + hm(toT.mins) : '') : null, status: toDay != null ? (toT ? 'explicit' : 'inferred') : 'missing', span: f.reschedule.to.span, note: toT ? null : 'No new time stated: the current pickup time is kept until the carrier confirms.' };
      if (f.reschedule.siteSpan) f.rsSite = { value: f.reschedule.siteText, status: 'explicit', span: f.reschedule.siteSpan };
      if (same) f.sameRate = { value: true, status: 'explicit', span: span(same) };
    }

    // Sender: the email address (its domain identifies the company first), then the signature or self-introduction.
    const em = /(?:^|\n)\s*(?:from|de|exp[ée]diteur)\s*:\s*([^<\n]*?)\s*<\s*([\w.+-]+@([\w-]+(?:\.[\w-]+)+))\s*>|([\w.+-]+@([\w-]+(?:\.[\w-]+)+))/i.exec(src);
    if (em) f.email = { value: em[2] || em[4], domain: (em[3] || em[5]).toLowerCase(), name: em[1] ? em[1].trim() : null, status: 'explicit', span: span(em) };
    const who = sender(src);
    if (who) f.sender = { value: [who.person, who.company].filter(Boolean).join(', '), person: who.person, company: who.company, status: 'explicit', span: who.companySpan || who.span, span2: who.companySpan && who.span ? who.span : null };
    if (f.email && f.email.name && /\s/.test(f.email.name) && !CO_WORD.test(f.email.name) && (!f.sender || !f.sender.person || f.email.name.indexOf(f.sender.person) === 0)) f.sender = Object.assign({ status: 'explicit' }, f.sender || {}, { person: f.email.name, value: [f.email.name, f.sender && f.sender.company].filter(Boolean).join(', '), span: (f.sender && f.sender.span) || f.email.span });

    // Untrusted instructions are business content only (CT-02, CT-21)
    const inj = /(ignore (?:the |all )?(?:previous|prior|usual) (?:instructions|rules|approval rules)|bypass|without (?:the usual )?(?:checks|approval)|sans (?:les )?(?:vérifications|approbations?)|ignorer? les règles|change(?:d)? banks?|nouvelles? coordonnées bancaires|new bank(?:ing)? details|updated? (?:our |the )?bank(?:ing)? (?:details|account|information)|changement de compte bancaire|nouveau compte bancaire)/i.exec(src);
    if (inj) flags.push({ text: 'Contains instructions to bypass controls or change payment details. Treated as content only: nothing is executed.', span: span(inj) });

    const missing = isFreight ? ['lane', 'pickup', 'rate'].filter((k) => !f[k] || f[k].value == null) : ['commodity', 'quantity', 'price', 'origin', 'window', 'moisture'].filter((k) => !f[k] || (f[k].value == null && f[k].priceType !== 'basis'));
    return { fields: f, flags: flags, missing: missing, length: src.length, lang: lang, ref: refMin };
  }

  /* Highlight spans in the original text. Returns HTML (escaped). */
  function highlight(text, spans, active) {
    const esc = TD.u.esc;
    /* Overlapping evidence: keep the most specific (shortest) spans, then render in reading order. */
    const all = spans.filter((s) => s && s.span).map((s) => ({ a: s.span[0], b: s.span[1], key: s.key })).sort((x, y) => (x.b - x.a) - (y.b - y.a));
    const list = [];
    all.forEach((s) => { if (!list.some((c) => s.a < c.b && c.a < s.b)) list.push(s); });
    list.sort((x, y) => x.a - y.a);
    let out = ''; let i = 0;
    list.forEach((s) => {
      if (s.a < i) return;
      out += esc(text.slice(i, s.a));
      out += '<mark class="src-mark' + (s.key === active ? ' is-active' : '') + '" data-key="' + esc(s.key) + '">' + esc(text.slice(s.a, s.b)) + '</mark>';
      i = s.b;
    });
    out += esc(text.slice(i));
    return out;
  }

  TD.parser = { parse: parse, highlight: highlight, detectLang: detectLang, sender: sender, canonTown: canonTown, towns: TOWNS };
})();
