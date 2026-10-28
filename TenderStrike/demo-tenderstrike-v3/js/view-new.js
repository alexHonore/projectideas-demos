/* Écran : ajouter un appel d’offres (texte collé ou fichier .txt, .html, .pdf).
   Règles par défaut; IA en direct en option. Les deux produisent la même structure, revue avant création. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S, UI = TS.UI, X = TS.X;
  const esc = U.esc, ic = U.icon;
  const V = (TS.V = TS.V || {});

  UI.view.nt = UI.view.nt || { text: '', file: null, pdf: null, ex: null, busy: false, note: '', edits: {} };
  V.ntReset = () => { UI.view.nt = { text: '', file: null, pdf: null, ex: null, busy: false, note: '', edits: {} }; };

  /* Dates : champs datetime-local exprimés à l’heure de Montréal */
  V.toLocalInput = (iso) => {
    if (!iso) return '';
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
    const g = (t) => (p.find((x) => x.type === t) || {}).value;
    return g('year') + '-' + g('month') + '-' + g('day') + 'T' + g('hour') + ':' + g('minute');
  };
  V.fromLocalInput = (v) => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); return m ? X.iso(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : ''; };

  const quoteOf = (ex, rid) => { const r = ex.requirements.find((x) => x.id === rid || (x.rule && rid === 'rule:' + x.rule.type)); return r && r.quoteIdx >= 0 ? { i: r.quoteIdx, s: ex.segments[r.quoteIdx] } : r && r.quote ? { i: -1, s: r.quote } : null; };
  const findSeg = (ex, val) => { if (!val) return null; const v = String(val).toLowerCase().slice(0, 30); const i = ex.segments.findIndex((s) => s.toLowerCase().includes(v)); return i >= 0 ? { i, s: ex.segments[i] } : null; };
  /* Citation : une puce « Source » (la phrase en infobulle) qui surligne la phrase dans le texte */
  const cite = (q) => (q ? `<button type="button" class="nt-q" data-act="nt-seg" data-i="${q.i}" title="${esc('« ' + (q.s.length > 220 ? q.s.slice(0, 220) + '…' : q.s) + ' »')}" aria-label="${esc('Voir la citation dans le texte source : ' + q.s.slice(0, 120))}">${ic('doc', 13)}<span>Source</span></button>` : `<span class="nt-q nt-q-none" title="Non trouvé dans le texte : à saisir ou à vérifier">${ic('q', 13)}<span>À vérifier</span></span>`);
  const hintHtml = (h) => (!h ? '' : /^Hypothèse étiquetée/.test(h) ? UI.chip('clock', 'Hypothèse étiquetée', 'chip-wait') + UI.info(h, 'Hypothèse') : h.split(' ').length <= 4 ? UI.chip('', h, /^Hors/.test(h) ? 'chip-wait' : '') : UI.info(h, 'À savoir'));
  const field = (key, label, input, q, hint) => `<div class="nt-f" data-field="${key}"><label class="fld"><span>${esc(label)}</span>${input}</label><span class="nt-fm">${q !== undefined ? cite(q) : ''}${hintHtml(hint)}</span></div>`;

  const review = (ex) => {
    const n = ex.notice, e = UI.view.nt.edits, as = n.assumed || {}, ed = n.evaluationDetail;
    n.bond = Object.assign({ rate: 0, basis: 'ttc', amount: 0, forms: [] }, n.bond); n.visit = Object.assign({ mandatory: false, at: '', place: '' }, n.visit); n.perfBond = n.perfBond || {}; n.lmBond = n.lmBond || {};
    const val = (k, d) => (e[k] != null ? e[k] : d);
    const inp = (k, v, type, extra) => `<input id="nt-${k}" data-nt="${k}" type="${type || 'text'}" value="${esc(val(k, v))}"${extra || ''}>`;
    const kinds = { trap: ['alert', 'Piège éliminatoire'], pill: ['info', 'Clause de risque'], req: ['check', 'Exigence'], info: ['info', 'À savoir'] };
    const prov = ex.provenance.source === 'ai' ? ex.provenance : null;
    return `<section class="nt-review" aria-labelledby="ntr-h">
      <div class="sec-row"><h2 id="ntr-h" class="sec-h">2. Revoir</h2><span class="nt-prov">${UI.prov(prov)}${ex.fallback ? `<span class="st st-wait" title="${esc(ex.fallback)}">${ic('alert', 13)}<span>IA indisponible · règles</span></span>` : ''}</span>${ex.unverified ? UI.chip('alert', ex.unverified + ' citation(s) non retrouvée(s)', 'chip-bad', 'Marquées « à vérifier » : elles n’ont pas été retrouvées mot pour mot dans le texte.') : ''}${UI.info((prov ? 'Champs et exigences proposés par l’IA en direct; chaque citation a été recherchée mot pour mot dans le texte.' : 'Champs lus par des règles déterministes, sans réseau.') + ' Corrigez au besoin : rien n’est créé avant votre clic.' + (ex.fallback ? ' ' + ex.fallback : ''), 'Comment revoir')}</div>
      <div class="nt-fields">
        ${field('buyer', 'Donneur d’ouvrage', inp('buyer', n.buyer), findSeg(ex, n.buyer))}
        ${field('title', 'Objet', inp('title', n.title), findSeg(ex, n.title))}
        ${field('ref', 'Numéro d’appel d’offres', inp('ref', n.ref), findSeg(ex, n.ref))}
        ${field('trade', 'Métier', `<select id="nt-trade" data-nt="trade">${Object.entries(D.tradeLabels).map(([k, l]) => `<option value="${k}"${val('trade', n.trade) === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`, undefined, D.company.trades.some((t) => t[0] === val('trade', n.trade)) ? 'Dans vos métiers' : 'Hors de vos métiers : le dossier sera créé, mais signalé')}
        ${field('close', 'Clôture (heure de Montréal)', inp('close', V.toLocalInput(n.close), 'datetime-local'), quoteOf(ex, 'r-close'), n.close ? '' : n.closeDate ? 'Date lue : ' + U.date(n.closeDate + 'T12:00:00-05:00') + '. Heure non précisée dans l’avis : saisissez-la (aucune heure n’est supposée).' : 'Clôture non trouvée : saisissez la date et l’heure.')}
        ${field('questions', 'Date limite des questions', inp('questions', V.toLocalInput(n.questionsDeadline), 'datetime-local'), quoteOf(ex, 'r-questions'), as.questions ? 'Hypothèse étiquetée : heure non précisée dans l’avis, 23 h 59 (fin de journée) affichée. À confirmer.' : '')}
        ${field('visit', 'Visite des lieux', `<span class="nt-inline"><label class="fld-check"><input type="checkbox" id="nt-visitm" data-nt="visitm"${val('visitm', n.visit.mandatory) ? ' checked' : ''}><span>Obligatoire</span></label>${inp('visitat', V.toLocalInput(n.visit.at), 'datetime-local', ' aria-label="Date et heure de la visite"')}</span>`, quoteOf(ex, 'r-visit'), n.visit.none ? 'L’avis indique qu’aucune visite n’est prévue.' : as.visit ? 'Hypothèse étiquetée : heure de visite non précisée, fin de journée affichée. À confirmer.' : n.visit.mandatory && !n.visit.at ? 'Date de visite non trouvée : à confirmer auprès du responsable.' : '')}
        ${field('bond', 'Garantie de soumission', `<span class="nt-inline">${inp('bond', n.bond.rate ? String(Math.round(n.bond.rate * 1000) / 10) : '0', 'number', ' min="0" max="50" step="0.5" aria-label="Taux en pour cent"')}<span>%</span><select id="nt-basis" data-nt="basis" aria-label="Base de calcul"><option value="ttc"${val('basis', n.bond.basis) === 'ttc' ? ' selected' : ''}>taxes incluses</option><option value="ht"${val('basis', n.bond.basis) === 'ht' ? ' selected' : ''}>avant taxes</option></select><span>ou</span>${inp('bondamt', n.bond.amount || '', 'number', ' min="0" step="500" placeholder="montant fixe ($)" aria-label="Montant fixe de la garantie"')}</span>`, quoteOf(ex, 'r-bond'), (n.bond.forms || []).length ? 'Formes acceptées : ' + n.bond.forms.join(', ') + '.' : '')}
        ${(n.perfBond && (n.perfBond.rate || n.perfBond.amount)) || (n.lmBond && (n.lmBond.rate || n.lmBond.amount)) ? field('post', 'Garanties exigées de l’adjudicataire', `<input id="nt-post" type="text" readonly value="${esc([n.perfBond.rate || n.perfBond.amount ? 'Exécution ' + (n.perfBond.rate ? U.num(n.perfBond.rate * 100, 0) + ' %' : U.money(n.perfBond.amount)) : '', n.lmBond.rate || n.lmBond.amount ? 'Gages, matériaux et services ' + (n.lmBond.rate ? U.num(n.lmBond.rate * 100, 0) + ' %' : U.money(n.lmBond.amount)) : ''].filter(Boolean).join(' · '))}">`, quoteOf(ex, 'r-perf') || quoteOf(ex, 'r-lm'), 'Après l’adjudication : comparées à votre capacité de cautionnement.') : ''}
        ${field('ins', 'Assurance responsabilité minimale ($)', inp('ins', n.insuranceMin || '', 'number', ' min="0" step="100000"'), quoteOf(ex, 'r-insurance'))}
        ${field('rbq', 'Sous-catégories RBQ exigées', inp('rbq', (n.rbq || []).join(', '), 'text', ' placeholder="aucune"'), quoteOf(ex, 'r-rbq'))}
        ${field('eval', 'Mode d’adjudication', `<input id="nt-eval" type="text" readonly value="${esc(n.evaluation === 'lowest' ? 'Plus bas soumissionnaire conforme' : n.evaluation === 'quality' ? 'Évaluation qualité-prix' + (ed && ed.threshold ? ', pointage minimal ' + ed.threshold : '') : 'Non précisé')}">`, quoteOf(ex, 'r-award'), ed ? [ed.formula && ed.formula !== 'voir l’avis' ? 'Formule : ' + ed.formula : '', (ed.criteria || []).length ? 'Critères : ' + ed.criteria.map((c) => c.label + ' (' + c.pts + ')').join(', ') : ''].filter(Boolean).join(' · ') : '')}
      </div>
      <div class="sec-row"><h3 class="sec-h3">Exigences <b class="cnt">${ex.requirements.length}</b></h3>${UI.info('Décochez celles qui ne s’appliquent pas. Le bouclier : TenderStrike vérifie l’exigence avec vos pièces du coffre-fort.', 'Comment trier')}</div>
      <ul class="nt-reqs">${ex.requirements.map((r, i) => { const k = kinds[r.kind] || kinds.req; return `<li class="nt-r nt-r-${r.kind}"><label class="nt-keep"><input type="checkbox" data-nt-keep="${i}"${e['keep' + i] === false ? '' : ' checked'}><span class="sr">Garder</span></label>
        <span class="req-k" title="${esc(k[1])}">${ic(k[0], 15)}<span class="sr">${esc(k[1])}</span></span>
        <p class="nt-r-h"><b>${esc(r.title)}</b>${r.rule ? `<span class="st st-muted" title="Vérifiée par le bouclier">${ic('shield', 12)}<span class="sr">Vérifiée par le bouclier</span></span>` : ''}${r.unverifiedQuote ? `<span class="st st-wait">${ic('q', 12)}<span>À vérifier</span></span>` : ''}</p>
        <span class="nt-r-a">${r.quoteIdx >= 0 ? cite({ i: r.quoteIdx, s: ex.segments[r.quoteIdx] }) : r.quote ? `<span class="nt-q" title="${esc('« ' + r.quote + ' »')}">${ic('doc', 13)}<span>Citation</span></span>` : ''}${UI.info((prov ? 'Lecture IA : ' : 'Lecture TenderStrike : ') + r.plain, 'Lecture de l’exigence')}</span></li>`; }).join('') || '<li class="kempty">Aucune exigence reconnue : le dossier sera créé avec les champs ci-dessus.</li>'}</ul>
      <div class="nt-create">${UI.btn('Créer le dossier', 'nt-create', { cls: 'btn-primary btn-lg', icon: 'check', disabled: !S.can('tender'), title: S.can('tender') ? 'Créer le dossier' : 'Réservé à l’estimateur ou à la propriétaire' })}${UI.info(S.can('tender') ? 'Le dossier suit ensuite le même parcours que les autres : Go / No-Go, prix, conformité, formulaires, revue et reçu.' : 'Réservé à l’estimateur ou à la propriétaire.', 'Et ensuite')}</div>
    </section>`;
  };

  V.nouveau = () => {
    const nt = UI.view.nt, ex = nt.ex, on = TS.AI && TS.AI.on(), st = TS.AI.status();
    const segs = ex ? ex.segments : [];
    const quoted = {};
    if (ex) ex.requirements.forEach((r) => { if (r.quoteIdx >= 0) quoted[r.quoteIdx] = r.kind; });
    return `<div class="newt">
      <div class="pagehead"><a class="icon-btn" href="#/radar" aria-label="Retour au radar" title="Retour au radar">${ic('back', 17)}</a><h1 class="page-h1">Ajouter un appel d’offres</h1>${UI.info('Collez l’avis SEAO ou le texte du devis, ou déposez un fichier .txt, .html ou .pdf. Les règles extraient dates, garantie, visite, RBQ, AMP et mode d’adjudication, chacun avec sa citation. L’IA en direct, si elle est active dans le moniteur d’API, fait une radiographie complète.', 'Comment ça marche')}</div>
      <div class="nt-grid">
        <div class="nt-main">
          <section class="nt-src" aria-labelledby="nts-h">
            <h2 id="nts-h" class="sec-h">1. L’avis</h2>
            <label class="fld fld-wide"><span class="sr">Texte de l’avis</span><textarea id="nt-text" rows="8" placeholder="Collez ici le texte de l’avis (SEAO) ou du devis…">${esc(nt.text)}</textarea></label>
            <div class="drop drop-sm" data-drop="new" title="Le fichier est lu dans votre navigateur">${ic('upload', 18)}<label class="drop-l"><span class="link">Fichier</span> .txt, .html, .pdf<input type="file" id="nt-file" class="sr" accept=".txt,.html,.htm,.pdf,text/plain,text/html,application/pdf" data-act-change="nt-file"></label><span class="drop-name">${nt.file ? esc(nt.file.name) + ' · ' + U.bytes(nt.file.size) + (nt.pdf ? ' · ' + nt.pdf.pages + ' p.' : '') : ''}</span></div>
            ${nt.note ? `<p class="srcnote">${ic('info', 15)}<span>${esc(nt.note)}</span></p>` : ''}
            <div class="nt-acts">
              ${UI.btn('Analyser', 'nt-rules', { cls: 'btn-primary', icon: 'list', disabled: nt.busy, title: 'Analyser avec les règles (sans réseau)' })}
              ${UI.btn('IA', 'nt-ai', { cls: 'btn-hl', icon: 'bolt', disabled: nt.busy || !on, title: on ? 'Analyser avec l’IA en direct : texte' + (nt.pdf ? ' et PDF' : '') + ' envoyés au modèle choisi (' + (window.LiveAI ? window.LiveAI.model : 'OpenRouter') + '), appels comptés dans le moniteur d’API' : st.label + ' · ' + st.reason })}
              ${TS.AI.link('', true)}
              ${UI.btn('Exemple', 'nt-sample', { cls: 'btn-ghost', icon: 'doc', disabled: nt.busy, title: 'Coller un avis d’exemple (fictif)' })}
              ${nt.text || nt.ex ? UI.iconBtn('trash', 'Effacer', 'nt-clear', {}) : ''}
            </div>
            ${nt.busy ? `<p class="nt-busy" role="status">${ic('clock', 15)}<span>Analyse par l’IA en direct…</span></p>` : ''}
          </section>
          ${ex ? review(ex) : ''}
        </div>
        <details class="fold nt-side"${segs.length && UI.view.ntSrcOpen ? ' open' : ''}><summary>${ic('doc', 16)}<span>Texte source</span>${segs.length ? `<small title="${segs.length} phrases, dont ${Object.keys(quoted).length} citées">${Object.keys(quoted).length}/${segs.length}</small>` : ''}</summary>
          <div class="nt-source" tabindex="0">${segs.length ? segs.map((s, i) => `<p id="nt-seg-${i}" class="nt-s${quoted[i] ? ' is-q nt-s-' + quoted[i] : ''}"><span class="nt-sn">${i + 1}</span>${esc(s)}</p>`).join('') : '<p class="kempty">Lancez une analyse : chaque phrase citée sera surlignée ici.</p>'}</div>
        </details>
      </div>
    </div>`;
  };

  /* Construit la définition à partir de l’extraction revue */
  V.ntBuild = () => {
    const nt = UI.view.nt, ex = JSON.parse(JSON.stringify(nt.ex));
    const g = (k) => { const el = U.$('#nt-' + k); return el ? (el.type === 'checkbox' ? el.checked : el.value) : nt.edits[k]; };
    const n = ex.notice;
    n.buyer = (g('buyer') || '').trim(); n.title = (g('title') || '').trim(); n.ref = (g('ref') || '').trim(); n.trade = g('trade') || n.trade;
    n.close = V.fromLocalInput(g('close')); n.questionsDeadline = V.fromLocalInput(g('questions'));
    n.opening = n.close ? new Date(Date.parse(n.close) + 5 * 60000).toISOString() : '';
    const orig = nt.ex.notice;
    n.visit = { mandatory: !!g('visitm'), at: V.fromLocalInput(g('visitat')), place: (n.visit || {}).place || '' };
    n.visit.none = !n.visit.mandatory && !n.visit.at && !!(orig.visit || {}).none;
    n.assumed = Object.assign({}, orig.assumed);
    if (n.questionsDeadline !== orig.questionsDeadline) n.assumed.questions = false;
    if (n.visit.at !== (orig.visit || {}).at) n.assumed.visit = false;
    const rate = Number(String(g('bond') || '0').replace(',', '.')) / 100;
    const amt = Number(g('bondamt')) || 0;
    n.bond = { rate: isFinite(rate) && rate > 0 ? rate : 0, basis: g('basis') || 'ttc', amount: isFinite(rate) && rate > 0 ? 0 : amt, forms: (n.bond && n.bond.forms) || [], formKeys: (n.bond && n.bond.formKeys) || [] };
    n.insuranceMin = Number(g('ins')) || 0;
    n.rbq = String(g('rbq') || '').split(/[,;\s]+/).filter((c) => /^\d{1,2}\.\d{1,2}(\.\d)?$/.test(c));
    ex.requirements = ex.requirements.filter((r, i) => { const el = U.$('[data-nt-keep="' + i + '"]'); return el ? el.checked : nt.edits['keep' + i] !== false; });
    ex.requirements.forEach((r) => {
      if (r.rule && r.rule.type === 'insurance') { if (n.insuranceMin) r.rule.min = n.insuranceMin; else r.rule = null; }
      if (r.rule && r.rule.type === 'rbq') { if (n.rbq.length) r.rule.cats = n.rbq; else r.rule = null; }
      if (r.id === 'r-bond') { if (!n.bond.rate && !n.bond.amount) r.rule = null; else if (!r.rule) r.rule = { type: 'bond' }; }
    });
    if (n.insuranceMin && !ex.requirements.some((r) => r.rule && r.rule.type === 'insurance')) ex.requirements.push({ id: 'r-insurance-x', title: 'Assurance responsabilité civile de ' + U.money(n.insuranceMin), kind: 'req', assess: 'eligibility', quoteIdx: -1, plain: 'Saisie par vous à la revue de l’extraction.', rule: { type: 'insurance', min: n.insuranceMin }, conf: 0.8 });
    const meta = { kind: nt.file ? 'file' : 'paste', name: nt.file ? nt.file.name : '', sourceLabel: nt.file ? 'fichier ' + nt.file.name : 'texte collé', docLabel: nt.file ? nt.file.name : 'Texte de l’avis' };
    return X.buildTender(ex, meta);
  };
})();
