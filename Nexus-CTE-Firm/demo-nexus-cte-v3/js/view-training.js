/* Nexus CTE V3 — Salle de formation : cursus, barrière de prospection, examen de la Section 8, jeu de rôle vocal. */
(function (g) {
  'use strict';
  var D = g.DATA, U = g.U, E = g.E, S = g.S, UI = g.UI, C = UI.C, esc = U.esc;

  var ROLEPLAY = [
    { line: 'Écoutez, je suis pas mal occupé. Puis mon comptable s’occupe de tout ça.', options: [
      { t: 'Parfait, je vous rappelle dans six mois.', s: 0, fb: 'Vous laissez filer la conversation sans valeur pour le cédant.' },
      { t: 'Tant mieux, il sera essentiel. Nous travaillons avec lui : il prépare les chiffres, nous trouvons les acheteurs. Savez-vous ce que vaudrait l’entreprise aujourd’hui ?', s: 2, fb: 'Vous respectez le comptable et posez la question de valeur plutôt que de vente (C7.5 L3, C7.2 L4).' },
      { t: 'Les comptables ne connaissent rien aux transactions.', s: 0, fb: 'Dénigrer le prescripteur ferme la porte : il influence la décision.' }] },
    { line: 'Combien vous pensez qu’elle vaut, ma shop ?', options: [
      { t: 'À l’oreille, je dirais 2 millions.', s: 0, fb: 'Aucune valeur sans états financiers fiables : c’est une règle de la firme.' },
      { t: 'Je ne peux pas vous donner un chiffre honnête sans vos états financiers. Je peux vous envoyer un questionnaire de 10 minutes pour une première analyse.', s: 2, fb: 'Vous refusez d’inventer une valeur et méritez le droit d’envoyer le lien de collecte (C7.2 L6).' },
      { t: 'Ça dépend du marché.', s: 1, fb: 'Vrai, mais sans prochaine étape.' }] },
    { line: 'Correct, envoyez-moi ça par courriel.', options: [
      { t: 'Je vous l’envoie tout de suite, et je note que vous acceptez de le recevoir.', s: 2, fb: 'La disposition « a accepté le questionnaire » consigne le fondement de l’envoi.' },
      { t: 'Je vous inscris à notre infolettre aussi.', s: 0, fb: 'Accepter un questionnaire n’est pas un consentement général au marketing.' },
      { t: 'Je vous l’envoie quand j’aurai le temps.', s: 0, fb: 'Chaque carte ouverte a une prochaine action datée.' }] }
  ];
  var rp = { i: 0, score: 0, log: [], speaking: false };

  function speak(text) {
    try {
      if (!(g.Caps ? g.Caps.speech() : 'speechSynthesis' in g)) return false; // inclut la vérification du moniteur d'API (browser-tts)
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-CA'; u.rate = 1;
      var voices = g.Caps && !g.Caps.voices() ? [] : (speechSynthesis.getVoices() || []);
      var v = voices.filter(function (x) { return /fr-CA/i.test(x.lang); })[0] || voices.filter(function (x) { return /^fr/i.test(x.lang); })[0];
      if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
      if (g.Caps && g.Caps.record) g.Caps.record('browser-tts', 'speak', { chars: text.length });
      return true;
    } catch (e) { return false; }
  }

  function roleplay() {
    var done = rp.i >= ROLEPLAY.length;
    var html = '<div class="rp">';
    if (!done) {
      var t = ROLEPLAY[rp.i];
      html += '<p class="rp-turn">Réplique ' + (rp.i + 1) + ' sur ' + ROLEPLAY.length + ', cédant pressé et attaché à son entreprise</p><blockquote class="rp-line">« ' + esc(t.line) + ' »</blockquote>' +
        '<div class="actions">' + C.btn('Écouter la réplique', null, { small: true, variant: 'quiet', icon: 'M5 9v6h4l5 4V5L9 9z' }).replace('<button', '<button data-ui="rp-speak"') + (g.Caps && !g.Caps.speech() ? '<span class="state-i state-warn" title="' + U.esc(g.Caps.speechReason()) + '" aria-label="' + U.esc(g.Caps.speechReason()) + '">' + C.icon('pause') + '</span>' : '') + '</div>' +
        '<ol class="rp-opts">' + t.options.map(function (o, i) { return '<li><button type="button" class="rp-opt" data-ui="rp-pick" data-i="' + i + '">' + esc(o.t) + '</button></li>'; }).join('') + '</ol>';
    } else html += '<p class="big-line"><strong>' + rp.score + ' sur ' + ROLEPLAY.length * 2 + '</strong> selon la grille publiée : écoute, question de valeur, aucune valeur inventée, consentement consigné.</p>' + C.btn('Rejouer', null, { small: true, variant: 'quiet' }).replace('<button', '<button data-ui="rp-reset"');
    if (rp.log.length) html += '<ul class="rp-log">' + rp.log.map(function (l) { return '<li class="' + (l.s === 2 ? 'ok' : l.s === 1 ? 'mid' : 'no') + '">' + C.icon(l.s === 2 ? 'check' : 'alert') + '<span>' + esc(l.fb) + '</span></li>'; }).join('') + '</ul>';
    return html + '<p class="fineprint">Synthèse vocale du navigateur, voix française si disponible; sinon la réplique reste écrite. Outil de préparation : une simulation ne prédit pas la réaction d’un vrai cédant.</p></div>';
  }

  UI.VIEWS.formation = function () {
    var st = S.get(), t = st.training.jg;
    var cards = D.CURRICULUM.map(function (s) { return '<li class="cur ' + s.color + '"><span class="cur-n">Section ' + s.id + '</span><strong>' + esc(s.title) + '</strong><span>' + s.chapters + ' chapitres, ' + s.lessons + ' leçons</span>' + (s.gate ? C.chip('Obligatoire avant la prospection', 'brass') : '') + '</li>'; }).join('');
    var team = [['cp', true, true, 'Fondatrice : exemption consignée au journal'], ['mt', true, true, 'Aucun outil de prospection pour le rôle analyste'], ['sl', true, true, 'Sections 1 et 8 réussies'], ['jg', t.s1, t.s8, t.s8 ? 'Outils d’appel débloqués' : 'Outils d’appel débloqués après la Section 1 et la Section 8 : 3 chapitres restants']];
    var tick = function (ok, n) { return '<span class="state-i state-' + (ok ? 'ok' : 'warn') + '" title="Section ' + n + (ok ? ' réussie' : ' à faire') + '" aria-label="Section ' + n + (ok ? ' réussie' : ' à faire') + '">' + (ok ? C.icon('check') : '<b>' + n + '</b>') + '</span>'; };
    var gate = '<ul class="rows gate-rows">' + team.map(function (r) { var open = r[1] && r[2]; return '<li><span class="row-title">' + C.person(r[0]) + '</span><span class="row-acts">' + tick(r[1], 1) + tick(r[2], 8) + '</span><span class="state-i state-' + (open ? 'ok' : 'block') + '" title="' + esc(r[3]) + '" aria-label="' + esc(r[3]) + '">' + C.icon(open ? 'phone' : 'lock') + '</span></li>'; }).join('') + '</ul>';
    var exam = t.s8 ? '<div class="done-line">' + C.icon('check') + '<span><strong>Examen réussi</strong> ' + t.attempts.slice(-1).map(function (a) { return a.score + ' sur ' + a.total; }).join('') + ' ' + C.info('Les outils d’appel de Jérémie Gosselin sont débloqués : essayez « Voir comme : Agent vendeur » puis Distribution Fecteau au radar.', 'Examen réussi') + '</span></div>' +
      C.more('Réponses', '<ol class="exam-answers">' + D.EXAM_S8.map(function (q) { return '<li><strong>' + esc(q.q) + '</strong><span>' + esc(q.options[q.a]) + '. ' + esc(q.why) + '</span></li>'; }).join('') + '</ol>') :
      '<form data-ui-form="exam" class="exam">' + D.EXAM_S8.map(function (q, i) { return '<fieldset><legend>' + (i + 1) + '. ' + esc(q.q) + '</legend>' + q.options.map(function (o, j) { return '<label class="radio"><input type="radio" name="q' + i + '" value="' + j + '"><span>' + esc(o) + '</span></label>'; }).join('') + '</fieldset>'; }).join('') +
      (t.attempts.length ? '<p class="txt-brick">Dernière tentative : ' + t.attempts.slice(-1)[0].score + ' sur 5.</p>' : '') + '<button type="submit" class="btn btn-primary" data-key="exam-submit">Soumettre l’examen de Jérémie</button></form>';
    var coaching = '<div class="coach"><p><strong>60 % de vos appels se terminent sur l’objection « mon comptable s’en occupe ».</strong> Révisez C7.5 L3 et rejouez « L’objection ».</p><p class="cell-sub">Données : 12 appels sur 20 du 5 au 23 octobre, objections étiquetées à la disposition. Comparé à votre propre historique, jamais classé publiquement.</p></div>';
    var F = function (title, body, o) { return C.section(title, body, Object.assign({ fold: true }, o)); };
    var next = t.s8 ? '' : '<div class="next-one">' + C.icon('M4 6l8-3 8 3-8 3zM8 8v5c0 1.5 2 3 4 3s4-1.5 4-3V8') + '<strong>Section 8 de Jérémie</strong><span class="muted">' + (t.attempts.length ? 'Dernière tentative : ' + t.attempts.slice(-1)[0].score + ' sur 5' : '5 questions · 80 %') + '</span>' + C.btn('Passer l’examen', 'fold-open', { ui: true, small: true, variant: 'primary', icon: 'arrow', data: { id: 'f-exam' }, key: 'exam-open' }) + '</div>';
    return '<div class="page"><header class="page-head page-head-row"><h1>Formation ' + C.info('Transformer une recrue en agent compétent en quelques semaines. Huit sections, 61 chapitres, 227 leçons; les Sections 1 et 8 ouvrent les outils de prospection. Cette démo contient un examen court et un jeu de rôle, pas les 227 leçons.', 'Formation') + '</h1></header>' +
      C.section('Accès aux outils d’appel', gate + next, { hid: 'h-gate', sub: 'Les points d’expérience ne débloquent jamais un outil : seuls les examens des Sections 1 et 8 le font. Un certificat documente une formation interne, pas un permis professionnel. Jérémie Gosselin : ' + esc(team[3][3]) + '.' }) +
      '<div class="folds">' +
      F('Examen de la Section 8', exam, { hid: 'h-exam', id: 'f-exam', icon: 'check', sub: 'Version courte de démonstration : 5 questions, seuil de 80 %. Les réponses ne sont révélées qu’après la réussite.', meta: t.s8 ? '<span class="chip chip-ok">Réussi</span>' : '' }) +
      F('Jeu de rôle vocal', '<div id="rp-host">' + roleplay() + '</div>', { hid: 'h-rp', icon: 'mic', sub: 'Simulation en français du Québec : cédant pressé, objection du CPA.' }) +
      F('Coaching', coaching, { hid: 'h-coach', icon: 'spark', sub: 'Chaque recommandation affiche les données qui la déclenchent.', meta: '60 %' }) +
      F('Cursus', '<ul class="curriculum">' + cards + '</ul>', { hid: 'h-cur', icon: 'doc', sub: 'Annexe B du dossier maître : 18, 27, 21, 29, 33, 42, 36 et 21 leçons.', meta: '8 sections' }) +
      '</div></div>';
  };

  UI.UIA['rp-speak'] = function () {
    var ok = speak(ROLEPLAY[Math.min(rp.i, ROLEPLAY.length - 1)].line);
    if (!ok) UI.toast(g.Caps ? g.Caps.speechReason() : 'Synthèse vocale indisponible : la réplique reste écrite.', 'err');
    else if (g.Caps && !g.Caps.voices()) UI.toast('Aucune voix française installée (simulation du Labo) : voix par défaut du navigateur.');
  };
  UI.UIA['rp-pick'] = function (p) { var t = ROLEPLAY[rp.i], o = t.options[+p.i]; rp.score += o.s; rp.log.push({ s: o.s, fb: o.fb }); rp.i++; refreshRp(); };
  UI.UIA['rp-reset'] = function () { rp = { i: 0, score: 0, log: [] }; refreshRp(); };
  function refreshRp() { var h = document.getElementById('rp-host'); if (h) { h.innerHTML = roleplay(); U.typoTree(h); var b = h.querySelector('.rp-opt') || h.querySelector('button'); if (b) b.focus(); } }
  UI.FORMS = UI.FORMS || {};
  UI.FORMS.exam = function (f) {
    var score = 0, missing = 0;
    D.EXAM_S8.forEach(function (q, i) { var c = f.querySelector('input[name="q' + i + '"]:checked'); if (!c) missing++; else if (+c.value === q.a) score++; });
    if (missing) { UI.toast('Répondez aux ' + missing + ' questions restantes.', 'err'); return; }
    UI.run('exam', { score: score });
  };
})(window);
