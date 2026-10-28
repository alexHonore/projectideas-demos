/* Nexus CTE V3 — Radar de relève : chaque piste suit le même flux (barrière, appel, extraction, questionnaire, audit, acceptation). */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, S = g.S, R = g.R, UI = g.UI, C = UI.C, esc = U.esc;
  var BASIS_TONE = { expres: 'ok', relation: 'warn', demande: 'warn', publication: 'warn', aucun: 'block', supprime: 'block', na: '' };
  var dict = { on: null, rec: null };

  function contacts(c, st) { var list = (c.contacts || []).slice(), em = E.emailOf(c, st); if (em && list.indexOf(em) < 0 && !list.some(function (k) { return k.kind === 'Courriel'; })) list.push(em); return list; }
  function contactRow(c, k, st) {
    var basis = k.kind === 'Courriel' ? E.emailBasis(c, k, st) : 'na', dnc = E.isDnc(k.value, st), cs = st.companyState[c.id] || {};
    var pill = k.kind === 'Courriel' ? C.chip(E.BASIS_LABEL[basis], BASIS_TONE[basis], k.basisNote) : (dnc ? C.chip('Liste interne d’exclusion', 'block') : k.business ? C.chip('Ligne d’affaires', 'ok') : C.chip('Ligne personnelle', 'block'));
    var dncRow = dnc ? st.dnc.filter(function (d) { return d.value === k.value; })[0] : null;
    return '<tr><th scope="row">' + esc(k.kind) + '<span class="cell-sub">' + esc(k.value) + '</span></th><td><span class="prov">' + C.icon('doc') + esc(k.src) + ', saisi le ' + U.date(k.srcDate) + '</span></td><td>' + pill + (k.kind !== 'Courriel' ? '<span class="cell-sub">' + esc(dncRow ? 'Inscrit le ' + U.date(dncRow.date) + ' (' + dncRow.source + ')' : k.dnc) + '</span>' : (cs.consentEvidence && basis === 'expres' ? '<span class="cell-sub">Preuve : libellé ' + esc(cs.consentEvidence.wording) + ', ' + esc(cs.consentEvidence.at) + '</span>' : cs.consentWithdrawn ? '<span class="cell-sub">Consentement retiré (Loi 25)</span>' : '')) + '</td></tr>';
  }
  function scoreTable(sc) {
    return '<table class="ledger ledger-score"><caption class="sr-only">Ventilation du score</caption><thead><tr><th scope="col">Composante</th><th scope="col" class="num">Poids</th><th scope="col" class="num">Points</th></tr></thead><tbody>' +
      sc.comps.map(function (x) { return '<tr' + (x.proxy ? ' class="is-proxy"' : '') + '><th scope="row">' + esc(x.label) + (x.proxy ? ' ' + C.chip('Proxy, demi-poids', 'warn') : '') + '<span class="cell-sub">' + esc(x.detail) + '</span></th><td class="num">' + x.w + '</td><td class="num">' + U.num(x.pts, 1) + '</td></tr>'; }).join('') +
      '</tbody><tfoot><tr><th scope="row">Score composite, barème v1.2</th><td></td><td class="num total">' + sc.total + '</td></tr></tfoot></table>';
  }
  function gateSummary(gate) {
    var n = gate.checks.length, fails = gate.checks.filter(function (x) { return !x.ok; });
    return '<details class="gate-sum ' + (gate.ok ? 'is-ok' : 'is-block') + '"><summary>' + C.icon(gate.ok ? 'check' : 'lock') + '<span>' + (gate.ok ? 'Conformité : ' + n + ' contrôles réussis' : esc(fails[0].block)) + '</span>' + C.icon('chev', 'ico fold-chev') + '</summary>' + gateBlock(gate) + '</details>';
  }
  function gateBlock(gate) { return '<ul class="checks">' + gate.checks.map(function (x) { return '<li class="' + (x.ok ? 'ok' : 'block') + '">' + C.icon(x.ok ? 'check' : 'x') + '<span><strong>' + esc(x.label) + '</strong> ' + esc(x.ok ? x.okText : x.block) + '</span></li>'; }).join('') + '</ul>'; }
  function brief(c, st) {
    var cs = st.companyState[c.id] || {}, yrs = Math.floor(U.diffDays(c.registered, st.clock.d) / 365.25), sig = (c.signals || [])[0];
    var missing = []; if (!(cs.ageBand || c.ownerAgeBand)) missing.push('âge du propriétaire'); if (!cs.propertyOwner) missing.push('détention de la bâtisse'); missing.push('données financières');
    return '<dl class="facts facts-2"><div><dt>Secteur</dt><dd>SCIAN ' + esc(c.scian) + ', ' + esc(c.scianLabel) + '</dd></div><div><dt>Ancienneté</dt><dd>' + yrs + ' ans (REQ, ' + c.registered.slice(0, 4) + ')</dd></div><div><dt>Site</dt><dd>' + esc(c.city) + ', ' + esc(c.region) + '</dd></div><div><dt>Signal</dt><dd>' + (sig ? esc(sig.detail) + ' (' + U.date(sig.date) + ')' : 'Aucun signal actif') + '</dd></div></dl>' +
      '<p><strong>Information absente, signalée :</strong> ' + esc(missing.join(', ')) + '.</p>' +
      '<p><strong>Questions à poser :</strong> « Avez-vous déjà envisagé une relève interne ? » « La bâtisse est-elle à vous, ou à une autre société ? » « Qui est votre comptable ? »</p>' +
      '<p><strong>Interdit :</strong> aucune fourchette de valeur avant des états financiers fiables; proposer plutôt une analyse préliminaire.</p>';
  }
  function dispoSelect(c, k) { return '<label class="field field-inline"><span>Disposition (obligatoire)</span><select data-change="callDisposition" data-id="' + c.id + '" data-key="dispo-' + c.id + '"><option value="">Choisir</option>' + D.DISPOSITIONS.map(function (d) { return '<option' + (k.disposition === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') + '</select></label>'; }

  function callFlow(c, st) {
    var k = (st.companyState[c.id] && st.companyState[c.id].call) || null, step = k ? k.step : 'brief', gate = E.callGate(c, st);
    var steps = [['brief', 'Pré-brief et barrière'], ['call', 'Appel'], ['extract', 'Extraction et disposition'], ['after', 'Questionnaire et audit']];
    var idx = steps.map(function (s) { return s[0]; }).indexOf(step);
    var rail = '<ol class="steps" aria-label="Étapes de l’appel">' + steps.map(function (s, i) { return '<li class="' + (i < idx ? 'done' : i === idx ? 'now' : '') + '"' + (i === idx ? ' aria-current="step"' : '') + '><span class="step-n">' + (i + 1) + '</span>' + esc(s[1]) + '</li>'; }).join('') + '</ol>';
    var body = '';
    if (step === 'brief') {
      body = gateSummary(gate) + C.more('Pré-brief de l’appel', C.ai('Pre-call Intelligence (A1)', 'Élevée', brief(c, st), '', { source: 'rules' }), { icon: 'chev' }) +
        '<div class="actions">' + C.btn('Ouvrir la ligne (appel simulé)', 'callOpen', { variant: 'primary', icon: 'phone', data: { id: c.id }, blocked: gate.ok ? null : gate.first.block, key: 'call-open' }) + (!gate.ok && gate.first.id === 'line' && gate.phone ? C.btn('Vérifier ce numéro à la LNNTE (simulé)', 'phoneVerify', { variant: 'ghost', data: { id: c.id }, key: 'phone-verify' }) : '') + (!gate.ok && /réservé à/.test(gate.first.block) && S.P.admin() ? C.btn('Réattribuer à moi (administratrice)', 'leadReassign', { variant: 'ghost', data: { id: c.id }, key: 'reassign' }) : '') + '</div>';
    } else if (step === 'call') {
      var recOk = g.Caps && g.Caps.recognition();
      body = '<div class="callbar">' + C.icon('phone') + '<span><strong>Appel simulé</strong> ' + esc(c.director) + ', ' + esc(gate.phone ? gate.phone.value : '') + '</span>' + '<span class="state-i state-idle" title="Enregistrement désactivé : aucun régime d’autorisation configuré (Partie A)" aria-label="Enregistrement désactivé">' + C.icon('off') + '</span><span class="state-i state-idle" title="Copilote temps réel non activé : priorité 2, après preuve technique et juridique" aria-label="Copilote temps réel non activé">' + C.icon('pause') + '</span></div>' +
        '<div class="split"><div>' + C.more('Script et objections', '<h4 class="sub-h">Script : cédant, premier appel</h4><ol class="script"><li>Ouverture : se nommer, nommer la firme, demander 2 minutes.</li><li>Question de valeur plutôt que de vente : « Savez-vous ce que vaudrait l’entreprise aujourd’hui ? »</li><li>Relève et immeuble : relève interne, bâtisse, horizon.</li><li>Clôture : proposer le questionnaire de sortie, avec consentement.</li></ol>' +
        '<details class="objection"><summary>« Mon comptable s’en occupe »</summary><p>« Tant mieux, il sera essentiel. Nous travaillons avec lui : il prépare les chiffres, nous trouvons et qualifions les acheteurs. » Leçon C7.5 L3.</p></details>' +
        '<details class="objection"><summary>« Je vais y penser »</summary><p>« Bien sûr. Puis-je vous envoyer le questionnaire de 10 minutes, pour que vous ayez une première lecture ? » Leçon C7.5 L5.</p></details>', { icon: 'chev' }) + '</div>' +
        '<div><label class="field"><span>Notes de l’appel</span><textarea rows="9" data-input="callNotes" data-id="' + c.id + '" data-key="notes-' + c.id + '">' + esc(k.notes) + '</textarea></label>' +
        '<div class="actions actions-wrap">' + (c.sampleNotes ? C.btn('Exemple', 'callSample', { small: true, variant: 'ghost', data: { id: c.id }, key: 'notes-sample' }) : '') +
        C.btn(dict.on === c.id ? 'Arrêter' : 'Dicter', 'dictate', { ui: true, small: true, variant: 'ghost', icon: recOk || !g.Caps || g.Caps.gate('browser-speech').ok ? 'mic' : 'pause', data: { id: c.id }, key: 'dictate', blocked: recOk ? null : g.Caps ? g.Caps.recognitionReason() : 'Reconnaissance vocale indisponible.' }) + '</div></div></div>' +
        '<div class="actions actions-wrap">' + C.btn('Terminer et extraire (règles)', 'callExtract', { variant: 'primary', data: { id: c.id }, key: 'call-extract' }) + C.btn('Extraire avec l’IA en direct', 'call-ai', { ui: true, variant: 'quiet', icon: 'spark', data: { id: c.id }, key: 'call-ai', blocked: g.AI && g.AI.available() ? (g.AI.busy('call-' + c.id) ? 'Extraction en cours.' : null) : g.AI ? g.AI.offReason() : 'IA en direct indisponible.' }) + '</div>' +
        '<p class="fineprint">L’IA en direct reçoit les notes avec les noms de personnes caviardés (Loi 25) et doit rendre la même structure que les règles; en cas d’échec, les règles prennent le relais.</p>';
    } else if (step === 'extract') {
      var fields = k.fields || [];
      body = C.ai('Call-to-CRM Extraction (A3)', 'Moyenne', '', '', k.provenance, { label: fields.length ? fields.length + ' champs proposés' : 'Aucun champ reconnu', info: 'Rien n’est écrit au dossier avant votre révision; chaque proposition cite son extrait.' + (k.suggested ? ' Disposition suggérée : ' + k.suggested + '.' : '') }) +
        '<ul class="extract">' + fields.map(function (x) {
          var d = k.x[x.id];
          return '<li class="is-' + d + '"><div class="ex-main"><span class="ex-field">' + esc(x.field) + '</span><span class="ex-value">' + esc(x.value) + C.info('Extrait : ' + esc(x.excerpt) + ', confiance ' + esc(x.conf.toLowerCase()) + (x.note ? '. ' + esc(x.note) : '') + '.', x.field) + '</span></div><div class="ex-act">' +
            (d === 'proposed' ? C.btn('Accepter', 'extractDecide', { small: true, variant: 'ok', data: { id: c.id, x: x.id, d: 'accepted' }, key: 'ex-a-' + x.id }) + C.btn('Rejeter', 'extractDecide', { small: true, variant: 'quiet', data: { id: c.id, x: x.id, d: 'rejected' }, key: 'ex-r-' + x.id }) : '<span class="ex-state">' + (d === 'accepted' ? 'Accepté' : 'Rejeté') + '</span>' + C.btn('Annuler', 'extractDecide', { small: true, variant: 'ghost', data: { id: c.id, x: x.id, d: 'proposed' } })) + '</div></li>';
        }).join('') + '</ul>' +
        '<div class="actions actions-wrap">' + (fields.length ? C.btn('Tout accepter', 'extractAll', { variant: 'quiet', data: { id: c.id } }) : '') + dispoSelect(c, k) +
        (k.suggested && k.disposition !== k.suggested ? C.btn('Appliquer la suggestion', 'callDisposition', { small: true, variant: 'ghost', data: { id: c.id, value: k.suggested } }) : '') +
        C.btn('Enregistrer au dossier', 'callCommit', { variant: 'primary', data: { id: c.id }, key: 'call-commit' }) + C.btn('Revenir aux notes', 'callBackToNotes', { variant: 'ghost', data: { id: c.id }, key: 'call-back' }) + '</div>' +
        '<p class="fineprint">« retiré de la liste » écrit immédiatement à la liste interne d’exclusion. Un refus d’opportunité n’est pas un retrait des communications.</p>';
    } else body = afterCall(c, k, st);
    return '<div class="callflow">' + rail + body + '</div>';
  }

  function intakeDefaults(c, st) {
    var cs = st.companyState[c.id] || {}, s = c.sampleIntake || {};
    return { ownership: s.ownership || c.director + ' 100 % (société par actions)', holdco: s.holdco || 'Aucune', employees: s.employees || String(cs.employees || c.employees), revenueBand: s.revenueBand || cs.revenueBand || '', ebitdaBand: s.ebitdaBand || '', motivation: s.motivation || 'Raisons personnelles (retraite)', advisors: s.advisors || (cs.advisor ? 'CPA (' + cs.advisor + ')' : 'CPA'), exitHorizon: s.exitHorizon || (cs.exitHorizon ? cs.exitHorizon.value : ''), propertyOwner: s.propertyOwner || '' };
  }
  function auditDefaults(c, st) {
    var cs = st.companyState[c.id] || {}, k = cs.call || {}, a = k.answers || {};
    var rev = /(\d+) à (\d+) M\$/.exec(a.revenueBand || cs.revenueBand || ''), r = rev ? (+rev[1] + +rev[2]) / 2 * 1e6 : 2500000;
    var eb = /(\d+) à (\d+) k\$/.exec(a.ebitdaBand || ''), e = eb ? (+eb[1] + +eb[2]) / 2 * 1000 : Math.round(r * 0.09 / 5000) * 5000;
    return { revenueEst: r, ebitdaEst: e, priceMultiple: '5', engagement: 'Avis au lecteur', dependency: 'moyenne', topClientPct: 20, recurringPct: 30, propertyValue: /sœur|liée|société/i.test(((cs.propertyOwner || {}).value || '') + (a.propertyOwner || '')) ? 900000 : '', marketRent: '', rentPaid: '', ownerAge: '', propco: '' };
  }
  function afterCall(c, k, st) {
    var cs = st.companyState[c.id] || {}, hist = (cs.scoreHistory || []).slice(-1)[0];
    var html = '<div class="done-line">' + C.icon('check') + '<span>Appel consigné : <strong>' + esc(k.disposition) + '</strong>' + (hist ? ', score ' + hist.from + ' à ' + hist.to + ' (version précédente conservée)' : '') + '.</span></div>';
    if (cs.consentWithdrawn) html += '<p class="notice">' + C.icon('lock') + '<span>La personne a retiré son consentement (Loi 25) : ' + (cs.consentWithdrawn === 'tout' ? 'aucun contact, renseignements minimisés.' : 'aucun courriel; le téléphone reste soumis aux barrières.') + '</span></p>';
    if (k.disposition !== 'a accepté le questionnaire') {
      return html + '<p class="fineprint">' + (k.disposition === 'refus' || k.disposition === 'retiré de la liste' ? (k.disposition === 'retiré de la liste' ? 'Le numéro est désormais bloqué pour tous les rôles.' : 'Refus d’opportunité consigné; le contact reste permis plus tard.') : cs.callbackDate ? 'Rappel prévu le ' + U.date(cs.callbackDate) + ' : il arrivera dans la boîte de réception.' : 'Prochaine action proposée selon la disposition.') + '</p>' + (k.disposition !== 'retiré de la liste' && !cs.consentWithdrawn ? '<div class="actions">' + C.btn('Préparer un nouvel appel', 'callReset', { variant: 'ghost', small: true, data: { id: c.id }, key: 'call-reset' }) + '</div>' : '');
    }
    html += '<h4 class="sub-h">Lien de collecte : questionnaire de sortie</h4>';
    var em = E.emailOf(c, st), basis = em ? E.emailBasis(c, em, st) : 'aucun';
    if (k.intake === 'needEmail') html += '<form class="mini-form inline-form" data-ui-form="contact" data-id="' + c.id + '"><label class="field field-inline"><span>Courriel fourni à l’appel</span><input type="email" name="email" required placeholder="nom@entreprise.example" data-key="contact-email"></label><button type="submit" class="btn btn-quiet btn-sm">Consigner le courriel</button></form>';
    else if (k.intake === 'ready') html += '<div class="intake-card"><p>Fondement d’envoi : ' + C.chip(E.BASIS_LABEL[basis], BASIS_TONE[basis]) + ' consigné par la disposition, valable 6 mois. Le lien est un message : il passe la barrière LCAP.</p><ul class="checks"><li class="ok">' + C.icon('check') + '<span><strong>Mentions obligatoires</strong> raison sociale, adresse postale, désabonnement fonctionnel (60 jours)</span></li><li class="ok">' + C.icon('check') + '<span><strong>Marque</strong> La Firme CTE, jamais NexusCRM</span></li><li class="ok">' + C.icon('check') + '<span><strong>Expiration</strong> 14 jours, révocable, jeton lié à un seul destinataire</span></li></ul><div class="actions">' + C.btn('Envoyer le questionnaire (simulé)', 'intakeSend', { variant: 'primary', data: { id: c.id }, key: 'intake-send' }) + '</div></div>';
    else if (k.intake === 'sent') html += '<div class="intake-card"><p>Envoyé (simulé) à ' + esc(em ? em.value : '') + '. Expire le ' + U.date(k.linkExpires) + '; rappels J+3 et J+7, chacun repassant la barrière.</p><p class="linkline"><code>' + esc(k.link) + '</code>' + C.btn('Copier le lien', 'copy', { ui: true, small: true, variant: 'quiet', icon: 'copy', data: { text: k.link } }) + '</p><div class="actions">' + C.btn('Voir le questionnaire côté cédant', 'intake-preview', { ui: true, variant: 'primary', icon: 'eye', data: { id: c.id }, key: 'intake-preview' }) + '</div></div>';
    else if (k.intake === 'expired') html += '<p class="notice">' + C.icon('clock') + '<span>Le lien a expiré le ' + U.date(k.linkExpires) + ' sans réponse. ' + (basis === 'aucun' || basis === 'supprime' ? 'Le fondement d’envoi n’est plus valide : aucun nouvel envoi.' : 'Renvoyez-le si le fondement est toujours valide.') + '</span></p>' + (basis !== 'aucun' && basis !== 'supprime' ? C.btn('Renvoyer le questionnaire (simulé)', 'intakeSend', { variant: 'quiet', data: { id: c.id }, key: 'intake-resend' }) : '');
    else if (k.intake === 'revoked') html += '<p class="notice">' + C.icon('lock') + '<span>Lien révoqué : la personne a retiré son consentement.</span></p>';
    else if (k.intake === 'completed') {
      var open = (k.conflictList || []).filter(function (x) { return !k.conflicts[x.id]; }).length, a = k.answers || {};
      html += '<p class="notice">' + esc(c.name) + ' a complété le questionnaire. ' + (cs.emailBasis === 'expres' ? 'Le fondement du courriel passe à consentement exprès (preuve : libellé, date, jeton).' : 'Aucun consentement exprès : le fondement reste « demande d’information ».') + '</p>' +
        '<table class="ledger"><thead><tr><th scope="col">Champ mis à jour</th><th scope="col">Valeur</th><th scope="col">Provenance</th></tr></thead><tbody>' + D.INTAKE_FORM.filter(function (f) { return a[f.key]; }).map(function (f) { return '<tr><th scope="row">' + esc(f.field) + '</th><td>' + esc(a[f.key]) + '</td><td>' + C.chip('Déclaré par le client', 'warn') + '</td></tr>'; }).join('') + '</tbody></table>' +
        ((k.conflictList || []).length ? '<h4 class="sub-h">Conflits à résoudre (règles de préséance)</h4><ul class="conflicts">' + k.conflictList.map(function (x) { var ch = k.conflicts[x.id]; return '<li><span class="cf-field">' + esc(x.field) + '</span><div class="cf-opts">' + ['a', 'b'].map(function (s) { var o = x[s]; return '<button type="button" class="cf-opt' + (ch === s ? ' is-chosen' : '') + '" data-action="conflictResolve" data-id="' + c.id + '" data-c="' + x.id + '" data-choice="' + s + '" aria-pressed="' + (ch === s) + '"><strong>' + esc(o.value) + '</strong><span>' + esc(o.src) + ', rang ' + o.rank + '</span></button>'; }).join('') + '</div></li>'; }).join('') + '</ul>' : '');
      var adv = cs.advisor || cs.advisorHint;
      if (adv) {
        var others = st.leads.filter(function (o) { return o.id !== c.id && (st.companyState[o.id] || {}).advisor === adv; }).length + (S.P.identity() ? S.mandates().filter(function (m) { return m.profile.cpa === adv; }).length : 0);
        html += '<h4 class="sub-h">Relation proposée</h4><div class="relation">' + C.chip('conseille_par', '') + '<span>' + esc(adv) + ' conseille ' + esc(c.name) + '.' + (others ? ' Ce cabinet conseille aussi ' + others + ' autre' + (others > 1 ? 's' : '') + ' entreprise' + (others > 1 ? 's' : '') + ' suivie' + (others > 1 ? 's' : '') + ' : c’est une rencontre plutôt que des appels.' : ' Si ce cabinet conseille plusieurs entreprises de la liste, c’est une rencontre plutôt que douze appels.') + '</span>' + (k.relation ? '<span class="ex-state">' + (k.relation === 'yes' ? 'Confirmée' : 'Écartée') + '</span>' : C.btn('Confirmer', 'relationConfirm', { small: true, variant: 'ok', data: { id: c.id, d: 'yes' } }) + C.btn('Écarter', 'relationConfirm', { small: true, variant: 'quiet', data: { id: c.id, d: 'no' } })) + '</div>';
      }
      if (k.booked) {
        var due = S.absNow() >= U.absMin(k.booked.date, k.booked.min);
        html += '<div class="done-line">' + C.icon('check') + '<span><strong>Audit de sortie planifié</strong> ' + esc(k.booked.type) + ', ' + U.dateLong(k.booked.date) + ' à ' + U.time(k.booked.min) + '. Rappels J-1 et H-2 dans la boîte de réception.</span></div>';
        if (!k.auditDone) html += auditForm(c, st, due);
      } else html += '<div class="actions">' + C.btn('Planifier l’audit de sortie', 'bookAudit', { variant: 'primary', data: { id: c.id }, blocked: open ? 'Résolvez les ' + open + ' conflits avant de planifier l’audit.' : null, key: 'book' }) + '</div>';
    }
    return html;
  }
  function auditForm(c, st, due) {
    var d = auditDefaults(c, st), k = st.companyState[c.id].call;
    var f = function (name, label, val, hint) { return C.field(label, C.input(name, val, { mode: 'decimal' }), { hint: hint }); };
    return '<form class="audit-form" data-ui-form="audit" data-id="' + c.id + '"><h4 class="sub-h">Consigner l’audit de sortie</h4><p class="cell-sub">Faits recueillis en rencontre : ils alimentent le moteur d’acceptation, puis le mandat s’il est accepté.</p><div class="form-grid">' +
      f('revenueEst', 'Chiffre d’affaires estimé ($)', d.revenueEst) + f('ebitdaEst', 'BAIIA normalisé estimé ($)', d.ebitdaEst) + f('priceMultiple', 'Attente de prix du cédant (multiple du BAIIA)', d.priceMultiple) +
      C.field('Qualité des états financiers', C.select('engagement', ['Avis au lecteur', 'Mission d’examen', 'Audit'], d.engagement)) + C.field('Dépendance au dirigeant', C.select('dependency', ['faible', 'moyenne', 'élevée'], d.dependency)) +
      f('topClientPct', 'Premier client (% des ventes)', d.topClientPct) + f('recurringPct', 'Ventes récurrentes (%)', d.recurringPct) + f('propertyValue', 'Valeur de l’immeuble ($, vide si locataire)', d.propertyValue) +
      f('marketRent', 'Loyer marchand annuel ($)', d.marketRent) + f('rentPaid', 'Loyer payé annuel ($)', d.rentPaid) + f('ownerAge', 'Âge du cédant', d.ownerAge) + C.field('Société immobilière', C.input('propco', d.propco)) + '</div>' +
      '<div class="actions">' + (due ? '<button type="submit" class="btn btn-primary" data-key="audit-submit">Consigner l’audit</button>' : C.btn('Consigner l’audit', null, { variant: 'primary', blocked: 'L’audit est prévu le ' + U.date(k.booked.date) + ' à 10 h : avancez l’horloge (Labo de test) pour le consigner.', key: 'audit-submit' }) + C.btn('Avancer l’horloge jusqu’à l’audit', 'clock-to', { ui: true, variant: 'ghost', icon: 'clock', data: { date: k.booked.date, time: k.booked.min + 60 }, key: 'audit-clock' })) + '</div></form>';
  }

  function acceptancePanel(c, st) {
    var acc = E.acceptance(c, st), cs = st.companyState[c.id] || {}, done = cs.acceptance;
    if (!acc) return '';
    var tone = { faible: 'block', moyen: 'warn', bon: 'ok' };
    var weak = acc.inputs.filter(function (i) { return i.status === 'faible'; });
    var lbl = function (id) { return D.ACCEPTANCE_OPTIONS.filter(function (o) { return o.id === id; })[0].label; };
    var html = '<h3 class="sub-h">Moteur d’acceptation du mandat</h3><p class="muted">Question posée : faut-il prendre ce mandat ? La réponse n’est pas une valeur; c’est l’économie attendue du dossier pour le cédant et pour la firme.</p>' +
      '<table class="ledger"><thead><tr><th scope="col">Critère</th><th scope="col">Constat</th><th scope="col">Lecture</th></tr></thead><tbody>' + acc.inputs.map(function (i) { return '<tr><th scope="row">' + esc(i.label) + '</th><td>' + esc(i.value) + (i.note ? '<span class="cell-sub">' + esc(i.note) + '</span>' : '') + '</td><td>' + C.chip(i.status === 'faible' ? 'Faible' : i.status === 'moyen' ? 'Moyen' : 'Favorable', tone[i.status]) + '</td></tr>'; }).join('') + '</tbody></table>' +
      C.ai('Moteur d’acceptation (règles)', 'Moyenne', '<p>Suggestion : <strong>' + esc(lbl(acc.suggestion)) + '</strong>. ' + (weak.length ? weak.length + ' critère' + (weak.length > 1 ? 's' : '') + ' faible' + (weak.length > 1 ? 's' : '') + ' (' + esc(weak.map(function (w) { return w.label.toLowerCase(); }).join(', ')) + ').' : 'Aucun critère faible.') + (acc.suggestion === 'preparation' ? ' Plan proposé : rapport d’évaluation, réduction de la dépendance au dirigeant, états plus fiables, réévaluation dans 9 mois.' : '') + ' Accepter crée un mandat qui suit le même processus que les autres dossiers.</p>', '', { source: 'rules' });
    if (done) {
      var mm = cs.mandateId && S.mandate(cs.mandateId);
      html += '<div class="done-line">' + C.icon('check') + '<span><strong>Décision : ' + esc(lbl(done.decision)) + '</strong> par ' + esc(done.by) + ' le ' + U.date(done.date) + '. Justification : ' + esc(done.rationale) + (mm ? ' Mandat créé : <a href="#/dossier/' + mm.id + '/retraitement">' + esc(mm.codename + ' (' + mm.code + ')') + '</a>.' : '') + '</span></div>';
    } else {
      var rat = acc.suggestion === 'preparation' ? 'Préparation de 9 mois avant mandat de vente : réduire la dépendance au dirigeant, passer à une mission d’examen et ramener l’attente de prix vers la fourchette de marché.' : acc.suggestion === 'refuser' ? 'Trop de critères faibles pour un mandat rentable à court terme.' : 'Mandat de vente : critères favorables, conditions à préciser au contrat.';
      html += '<form class="accept-form" data-ui-form="acceptance" data-id="' + c.id + '"><fieldset><legend>Décision de la courtière</legend><div class="radios">' + D.ACCEPTANCE_OPTIONS.map(function (o) { return '<label class="radio"><input type="radio" name="decision" value="' + o.id + '"' + (o.id === acc.suggestion ? ' checked' : '') + '><span>' + esc(o.label) + '</span></label>'; }).join('') + '</div></fieldset>' +
        '<label class="field"><span>Justification et conditions (consignées au journal)</span><textarea name="rationale" rows="3">' + esc(rat) + '</textarea></label>' +
        '<div class="actions">' + (S.P.decideMandate() ? '<button type="submit" class="btn btn-primary" data-key="accept-submit"><span>Consigner la décision</span></button>' : C.btn('Consigner la décision', null, { variant: 'primary', blocked: 'Seule la courtière responsable rend la décision d’acceptation.' })) + '</div></form>' +
        '<p class="fineprint">Refuser un mandat ne signifie jamais que l’entreprise est invendable. Toute décision autre qu’un refus crée un mandat (de vente ou de préparation) prérempli à partir de la piste et de l’audit.</p>';
    }
    return html;
  }

  UI.VIEWS.radar = function (r) {
    var st = S.get(), preset = st.radar.preset;
    var list = st.leads.map(function (c) { return { c: c, sc: E.radarScore(c, st) }; }).filter(function (x) { return preset === 'all' || (x.c.preset || []).indexOf(preset) >= 0; }).sort(function (a, b) { return b.sc.total - a.sc.total; });
    var c = S.lead(r.parts[0] || st.radar.selected) || st.leads[0];
    if (!c) return '<div class="page"><header class="page-head"><h1>Radar de relève</h1></header>' + C.empty('Aucune piste', 'Créez une piste pour commencer.', '<button type="button" class="btn btn-primary" data-ui="lead-new">Nouvelle piste</button>') + '</div>';
    var sc = E.radarScore(c, st), cs = st.companyState[c.id] || {};
    var stageId = cs.stage || c.stage, stage = D.PROSPECT_STAGES.filter(function (s) { return s.id === stageId; })[0] || D.PROSPECT_STAGES[0];
    var rows = list.map(function (x) {
      var k = x.c, cs2 = st.companyState[k.id] || {}, phone = E.phoneOf(k);
      var reach = cs2.consentWithdrawn === 'tout' ? ['block', 'lock', 'Retrait Loi 25'] : !phone ? ['warn', 'alert', 'Sans téléphone'] : E.isDnc(phone.value, st) ? ['block', 'lock', 'Liste interne d’exclusion'] : !phone.business ? ['warn', 'phone', 'Ligne personnelle : vérification LNNTE requise'] : ['ok', 'phone', 'Appelable'];
      return '<li><a href="#/radar/' + k.id + '" class="r-row' + (k.id === c.id ? ' is-sel' : '') + '"' + (k.id === c.id ? ' aria-current="true"' : '') + ' title="' + esc(cs2.lastTouch ? 'Contacté le ' + U.date(cs2.lastTouch) : k.reason) + '"><span class="r-score tier-' + x.sc.tier.toLowerCase() + '" title="' + esc(x.sc.tier) + '"><strong>' + x.sc.total + '</strong></span><span class="r-main"><span class="r-name">' + esc(k.name) + '</span></span><span class="state-i state-' + reach[0] + '" title="' + esc(reach[2]) + '" aria-label="' + esc(reach[2]) + '">' + C.icon(reach[1]) + '</span></a></li>';
    }).join('');
    var badges = ['Prospect vendeur'].concat(c.audit || cs.audit ? ['Audit de sortie tenu'] : []).concat(c.manual ? ['Saisie manuelle'] : []);
    var owner = cs.owner || c.owner, sig = (c.signals || [])[0];
    var work = (stageId === 'audit_tenu' || cs.acceptance) && E.acceptance(c, st) ? acceptancePanel(c, st) : callFlow(c, st);
    var tools = C.btn('', 'lead-edit', { ui: true, small: true, variant: 'ghost', icon: 'edit', data: { id: c.id }, key: 'lead-edit', label: 'Modifier la fiche' }) + C.btn('', 'leadDelete', { small: true, variant: 'ghost', icon: 'trash', data: { id: c.id }, key: 'lead-del', label: 'Supprimer la piste', blocked: cs.mandateId ? 'Cette piste a produit un mandat : elle ne peut pas être supprimée.' : null });
    var headInfo = 'NEQ ' + esc(c.neq) + ', ' + esc(c.city) + ', ' + esc(c.region) + '. SCIAN ' + esc(c.scian) + ' : ' + esc(c.scianLabel) + '. ' + badges.map(esc).join(', ') + '. Étape : ' + esc(stage.label) + '. ' + (owner ? 'Propriétaire : ' + esc(D.TEAM[owner].name) : 'Non réclamé') + '. Données REQ au ' + U.date(c.reqFresh) + (sig ? ', ' + esc(sig.channel) : '') + '. Un signal indique quelque chose à vérifier, jamais une intention de vendre confirmée.';
    var facts = C.more('Score ' + sc.total + ' : ventilation', scoreTable(sc) + (cs.scoreHistory ? '<p class="cell-sub">Historique : ' + cs.scoreHistory.map(function (h) { return U.date(h.date) + ', ' + h.from + ' à ' + h.to + ' (' + h.why + ')'; }).join('; ') + '.</p>' : ''), { icon: 'chev' }) +
      C.more('Signaux et immeuble', ((c.signals || []).length ? '<ul class="signals">' + c.signals.map(function (s) { var t = D.SIGNAL_TYPES[s.type]; return '<li><span class="sig-w">' + esc(t.level) + '</span><span><strong>' + esc(t.label) + '</strong> ' + esc(s.detail) + '<span class="cell-sub">Détecté le ' + U.date(s.date) + ', canal ' + esc(s.channel) + '</span></span></li>'; }).join('') + '</ul>' : '<p class="cell-sub">Aucun signal actif.</p>') +
        '<h3 class="sub-h">Immeuble</h3><p>' + esc(cs.propertyOwner ? cs.propertyOwner.value + ' (' + cs.propertyOwner.src + ')' : c.building) + '</p>' + (cs.exitHorizon ? '<h3 class="sub-h">Horizon de sortie</h3><p>' + esc(cs.exitHorizon.value) + ' (' + esc(cs.exitHorizon.src) + ')</p>' : ''), { icon: 'chev', meta: (c.signals || []).length ? String(c.signals.length) : '' }) +
      C.more('Coordonnées et provenance', contacts(c, st).length ? '<div class="table-wrap"><table class="ledger"><thead><tr><th scope="col">Point de contact</th><th scope="col">Source</th><th scope="col">Fondement et statut</th></tr></thead><tbody>' + contacts(c, st).map(function (k) { return contactRow(c, k, st); }).join('') + '</tbody></table></div>' : '<p class="cell-sub">Aucun point de contact.</p>', { icon: 'chev', meta: String(contacts(c, st).length) });
    var detail = '<article class="sheet r-detail" aria-labelledby="r-title"><a class="r-back" href="#/radar">' + C.icon('M15 6l-6 6 6 6') + 'File</a><header class="r-head"><div class="r-head-main"><h2 id="r-title">' + esc(c.name) + ' ' + C.info(headInfo, c.name) + '</h2><span class="r-tools">' + tools + '</span></div>' +
      '<div class="r-big tier-' + sc.tier.toLowerCase() + '" title="Score ' + sc.total + ', ' + esc(sc.tier) + '"><strong>' + sc.total + '</strong><span>' + sc.tier + '</span></div></header>' +
      '<section class="r-work" aria-label="Travail sur ce prospect">' + work + '</section>' + facts + '</article>';
    var presetSel = '<label class="field field-inline seg-select"><span class="sr-only">Segment</span><select data-change="radar-preset" data-key="radar-preset" title="Segment enregistré">' + D.PRESETS.map(function (p) { return '<option value="' + p.id + '"' + (preset === p.id ? ' selected' : '') + '>' + esc(p.label) + '</option>'; }).join('') + '</select></label>';
    return '<div class="page"><header class="page-head page-head-row"><h1>Radar ' + C.info('Signaux détectés au Registraire des entreprises, classés par un score dont chaque composante est visible. Chaque piste suit le même flux : barrière de conformité, appel, extraction révisée, questionnaire, audit de sortie et décision d’acceptation. Corpus d’évaluation : 18 400 entreprises, résultats partiels sous le seuil de 25 000; signaux d’administrateurs actifs sur 4 180 entreprises surveillées; scores recalculés à l’horloge de démonstration (décroissance sur 180 jours).', 'Radar de relève') + '</h1>' + presetSel +
      C.btn('', 'lead-new', { ui: true, variant: 'quiet', icon: 'plus', key: 'lead-new', label: 'Nouvelle piste' }) + '</header>' +
      '<div class="radar-grid' + (r.parts[0] ? ' has-sel' : '') + '"><section class="sheet r-list" aria-label="File priorisée"><h2 class="sr-only">File priorisée</h2>' + (rows ? '<ul>' + rows + '</ul>' : C.empty('Aucune piste', 'Choisissez un autre segment.')) + '</section>' + detail + '</div></div>';
  };
  UI.UIA['radar-preset'] = function (p) { UI.run('radarPreset', { id: p.value }); };

  /* ---------- interactions propres au radar ---------- */
  UI.UIA['copy'] = function (p) { U.copyText(p.text).then(function (ok) { UI.toast(ok ? 'Lien copié dans le presse-papiers.' : 'Copie impossible : sélectionnez le lien manuellement.', ok ? '' : 'err'); }); };
  UI.UIA['intake-preview'] = function (p) {
    var c = S.lead(p.id), st = S.get(), d = intakeDefaults(c, st);
    UI.modal('<div class="intake-preview"><p class="ip-brand">La Firme CTE</p><h2 id="modal-title">Questionnaire de sortie</h2><p class="muted">Aperçu côté cédant, sans compte. La page n’affiche aucune donnée interne : ni score, ni signal, ni note. Les réponses sont modifiables pour tester les conflits.</p>' +
      '<div class="ip-notice"><h3>Avis de collecte (Loi 25)</h3><p>La Firme CTE recueille ces renseignements pour préparer une première analyse de votre entreprise. Ils peuvent être traités hors Québec par nos fournisseurs d’hébergement et d’IA, après évaluation des facteurs relatifs à la vie privée. Vous pouvez y accéder et les faire rectifier. Responsable : Catherine Pelletier, responsable de la protection des renseignements personnels.</p></div>' +
      '<form data-ui-form="intake" data-id="' + p.id + '"><fieldset class="ip-fields"><legend>Vos réponses (préremplies pour la démo)</legend>' + D.INTAKE_FORM.map(function (f) { return '<label class="field"><span>' + esc(f.field) + '</span><input type="text" name="a-' + f.key + '" value="' + esc(d[f.key] || '') + '"></label>'; }).join('') + '</fieldset>' +
      '<fieldset class="ip-consent"><legend>Consentements, jamais précochés ni regroupés</legend><label class="check"><input type="checkbox" name="cem"><span>J’accepte de recevoir des messages électroniques commerciaux de La Firme CTE au sujet du transfert de mon entreprise. Je peux retirer ce consentement en tout temps.</span></label><label class="check"><input type="checkbox" name="notice"><span>J’ai pris connaissance de l’avis de collecte ci-dessus.</span></label></fieldset>' +
      '<div class="modal-actions"><button type="button" class="btn btn-quiet" data-ui="modal-close">Fermer</button><button type="submit" class="btn btn-primary">Soumettre au nom du cédant (simulé)</button></div></form></div>', { wide: true });
  };
  UI.UIA['dictate'] = function (p) {
    var SR = g.SpeechRecognition || g.webkitSpeechRecognition;
    if (dict.on) { try { dict.rec.stop(); } catch (e) { /* ignoré */ } dict.on = null; UI.render(); return; }
    if (!SR || !(g.Caps && g.Caps.recognition())) { UI.toast(g.Caps ? g.Caps.recognitionReason() : 'Reconnaissance vocale indisponible.', 'err'); return; } // vérifié au moniteur d'API (browser-speech) avant de démarrer
    try {
      var rec = new SR(); rec.lang = 'fr-CA'; rec.continuous = true; rec.interimResults = false;
      rec.onresult = function (ev) { var t = ''; for (var i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) t += ev.results[i][0].transcript; if (t) { var k = S.call(p.id); S.dispatch('callNotes', { id: p.id, value: (k.notes ? k.notes + ' ' : '') + t.trim() }); UI.render(); } };
      var t0 = Date.now(), logged = false, log = function (ok) { if (logged) return; logged = true; g.Caps.record('browser-speech', 'listen', { seconds: Math.round((Date.now() - t0) / 100) / 10 }); };
      rec.onerror = function () { log(false); dict.on = null; UI.toast('Dictée interrompue : poursuivez au clavier.', 'err'); UI.render(); };
      rec.onend = function () { log(true); dict.on = null; UI.render(); };
      rec.start(); dict.rec = rec; dict.on = p.id; UI.render(); UI.toast('Dictée en cours (fr-CA). Le texte s’ajoute aux notes.');
    } catch (e) { dict.on = null; UI.toast('Reconnaissance vocale indisponible : saisissez les notes au clavier.', 'err'); }
  };
  UI.UIA['call-ai'] = function (p) { g.AI.extraction(p.id); };
  UI.FORMS.intake = function (f) { var a = {}; D.INTAKE_FORM.forEach(function (x) { var el = f.elements['a-' + x.key]; if (el) a[x.key] = el.value.trim(); }); var res = UI.run('intakeSubmit', { id: f.getAttribute('data-id'), answers: a, cem: f.elements.cem.checked, notice: f.elements.notice.checked }); if (res.ok) UI.closeModal(); };
  UI.FORMS.acceptance = function (f) { var dec = f.querySelector('input[name="decision"]:checked'); var res = UI.run('acceptance', { id: f.getAttribute('data-id'), decision: dec ? dec.value : '', rationale: f.elements.rationale.value }); if (res.ok && res.id) UI.toast(res.msg + ' Ouvrez-le depuis Dossiers.', ''); };
  UI.FORMS.audit = function (f) { var facts = {}; ['revenueEst', 'ebitdaEst', 'priceMultiple', 'engagement', 'dependency', 'topClientPct', 'recurringPct', 'propertyValue', 'marketRent', 'rentPaid', 'ownerAge', 'propco'].forEach(function (k) { facts[k] = f.elements[k] ? f.elements[k].value : ''; }); UI.run('auditRecord', { id: f.getAttribute('data-id'), facts: facts }); };
  UI.FORMS.contact = function (f) { UI.run('contactAdd', { id: f.getAttribute('data-id'), email: f.elements.email.value.trim() }); };
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-ui-form]'); if (!f) return;
    e.preventDefault();
    var kind = f.getAttribute('data-ui-form');
    if (UI.FORMS[kind]) UI.FORMS[kind](f);
  });
})(window);
