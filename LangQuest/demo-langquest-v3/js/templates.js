/* LangQuest V3 — one template mission engine for every course.
   A template (greet / order / way) plus a phrase set (a course pack, or a studio draft that
   overrides it) yields a full mission in the same shape as the hand-written ones:
   context → phrases → anticipation → branching role-play → feedback → recall in a new scene. */
'use strict';
(function () {
  const T4 = (en, fr, es, ru) => ({ en, fr, es, ru });
  const fill = (o, v) => { if (!o) return o; const out = {}; Object.entries(o).forEach(([k, s]) => { out[k] = s.replace(/\{(\w+)\}/g, (m, key) => v[key] != null ? v[key] : m); }); return out; };
  LQ.TEMPLATE_KINDS = ['greet', 'order', 'way'];
  LQ.TEMPLATE_INFO = {
    greet: { label: 'Meet a neighbour', skills: ['greet_politely', 'introduce_self', 'thank_and_close'], scene: 'plaza', minutes: 5,
      concepts: ['hello', 'fine', 'name', 'bye'], chars: ['c_howareyou', 'c_name', 'c_nice'],
      title: T4('Meet {local}, your neighbour', 'Rencontrer {local}, votre voisin·e', 'Conoce a {local}, del barrio', 'Знакомство с соседом: {local}'),
      outcome: T4('Greet {local}, answer “how are you?”, say your name and say goodbye.', 'Saluer {local}, répondre à « ça va ? », dire votre nom et prendre congé.', 'Saluda a {local}, responde a «¿qué tal?», di tu nombre y despídete.', 'Поздороваться с {local}, ответить на «как дела?», назвать себя и попрощаться.'),
      focus: T4('Greetings and introductions', 'Salutations et présentations', 'Saludos y presentaciones', 'Приветствия и знакомство'),
      setup: T4('{local}, {role}, waves at you on your street in {city}.', '{local} vous fait signe dans votre rue, à {city}.', '{local} te saluda con la mano en tu calle de {city}.', '{local} машет вам рукой на вашей улице ({city}).'),
      question: T4('What is {local} doing?', 'Que fait {local} ?', '¿Qué hace {local}?', 'Что делает {local}?'),
      options: [['wave', T4('Greeting you', 'Vous salue', 'Te saluda', 'Здоровается'), true], ['coin', T4('Asking the price', 'Demande le prix', 'Pregunta el precio', 'Спрашивает цену')], ['pin', T4('Giving directions', 'Indique le chemin', 'Da indicaciones', 'Объясняет дорогу')]],
      prompts: { hello: T4('{local} greets you. Greet them back.', '{local} vous salue. Répondez.', '{local} te saluda. Responde.', '{local} здоровается. Ответьте.'), fine: T4('{local} asks how you are. Say you’re fine and ask back.', '{local} demande comment ça va. Répondez et retournez la question.', '{local} te pregunta qué tal. Responde y pregúntale.', '{local} спрашивает, как дела. Ответьте и спросите в ответ.'), name: T4('Tell {local} your name.', 'Dites votre nom à {local}.', 'Dile tu nombre a {local}.', 'Назовите {local} своё имя.'), bye: T4('Say goodbye.', 'Dites au revoir.', 'Despídete.', 'Попрощайтесь.') } },
    order: { label: 'Order a drink', skills: ['request_item', 'ask_price', 'thank_and_close'], scene: 'kiosk', minutes: 6,
      concepts: ['coffee', 'tea', 'howmuch', 'thanks'], chars: ['c_what', 'c_here', 'c_price', 'c_welcome'],
      title: T4('Order at a café in {city}', 'Commander au café, à {city}', 'Pedir en un café de {city}', 'Заказ в кафе ({city})'),
      outcome: T4('Order a coffee or a tea, ask the price and thank {local}.', 'Commander un café ou un thé, demander le prix et remercier {local}.', 'Pide un café o un té, pregunta el precio y da las gracias a {local}.', 'Заказать кофе или чай, спросить цену и поблагодарить {local}.'),
      focus: T4('Requests and prices', 'Demandes et prix', 'Pedidos y precios', 'Просьбы и цены'),
      setup: T4('A small café near the market in {city}. {local} is behind the counter.', 'Un petit café près du marché, à {city}. {local} est au comptoir.', 'Un pequeño café cerca del mercado, en {city}. {local} está en la barra.', 'Маленькое кафе у рынка ({city}). За стойкой {local}.'),
      question: T4('What is {local} asking?', 'Que demande {local} ?', '¿Qué pregunta {local}?', 'О чём спрашивает {local}?'),
      options: [['cup', T4('What you’d like', 'Ce que vous voulez', 'Qué quieres', 'Что вы хотите'), true], ['user', T4('Your name', 'Votre nom', 'Tu nombre', 'Ваше имя')], ['pin', T4('Where the station is', 'Où est la gare', 'Dónde está la estación', 'Где вокзал')]],
      prompts: { coffee: T4('{local} asks what you’d like. Order a coffee.', '{local} demande ce que vous voulez. Commandez un café.', '{local} te pregunta qué quieres. Pide un café.', '{local} спрашивает, что вы хотите. Закажите кофе.'), howmuch: T4('Ask how much it is.', 'Demandez combien c’est.', 'Pregunta cuánto es.', 'Спросите, сколько стоит.'), thanks: T4('Thank {local}.', 'Remerciez {local}.', 'Da las gracias a {local}.', 'Поблагодарите {local}.') } },
    way: { label: 'Ask the way', skills: ['ask_directions', 'repair_misunderstanding', 'thank_and_close'], scene: 'station', minutes: 6,
      concepts: ['where', 'slower', 'thanks'], chars: ['c_way', 'c_welcome'],
      title: T4('Find the station in {city}', 'Trouver la gare, à {city}', 'Encontrar la estación en {city}', 'Найти вокзал ({city})'),
      outcome: T4('Ask the way, get {local} to slow down, and thank them.', 'Demander le chemin, faire ralentir {local} et remercier.', 'Pregunta el camino, haz que {local} hable más despacio y da las gracias.', 'Спросить дорогу, попросить {local} говорить медленнее и поблагодарить.'),
      focus: T4('Directions and asking for slower speech', 'Indications et faire ralentir', 'Indicaciones y pedir que hablen más despacio', 'Дорога и просьба говорить медленнее'),
      setup: T4('You’re looking for the station in {city}. {local} is waiting at the crossing.', 'Vous cherchez la gare, à {city}. {local} attend au passage piéton.', 'Buscas la estación en {city}. {local} espera en el cruce.', 'Вы ищете вокзал ({city}). {local} ждёт на перекрёстке.'),
      question: T4('What is {local} telling you?', 'Que vous dit {local} ?', '¿Qué te dice {local}?', 'Что говорит {local}?'),
      options: [['route', T4('The way to go', 'Le chemin à suivre', 'El camino', 'Как пройти'), true], ['coin', T4('A price', 'Un prix', 'Un precio', 'Цену')], ['user', T4('Their name', 'Son nom', 'Su nombre', 'Своё имя')]],
      prompts: { where: T4('Ask {local} where the station is.', 'Demandez à {local} où est la gare.', 'Pregúntale a {local} dónde está la estación.', 'Спросите у {local}, где вокзал.'), slower: T4('{local} answers fast. Ask them to speak more slowly.', '{local} répond vite. Demandez de parler plus lentement.', '{local} contesta rápido. Pídele que hable más despacio.', '{local} отвечает быстро. Попросите говорить медленнее.'), thanks: T4('Thank {local}.', 'Remerciez {local}.', 'Da las gracias a {local}.', 'Поблагодарите {local}.') } }
  };
  const HINT = T4('Try: “{t}”', 'Essayez : « {t} »', 'Prueba: «{t}»', 'Попробуйте: «{t}»');
  const hint = p => fill(HINT, { t: (p.r && /[^\u0000-ɏ]/.test(p.t)) ? p.t + ' (' + p.r + ')' : p.t });
  const RECALL = {
    hello: ['kiosk', 'c_what', T4('At the café, {local} greets you again. Say hello first.', 'Au café, {local} vous salue de nouveau. Dites bonjour d’abord.', 'En el café, {local} te saluda otra vez. Saluda primero.', 'В кафе {local} снова здоровается. Сначала поздоровайтесь.')],
    fine: ['kiosk', 'c_howareyou', T4('Back at the café, {local} asks how you are.', 'De retour au café, {local} vous demande comment ça va.', 'De vuelta en el café, {local} te pregunta qué tal.', 'Снова в кафе: {local} спрашивает, как дела.')],
    name: ['station', 'c_name', T4('At the station, someone new asks your name.', 'À la gare, quelqu’un de nouveau demande votre nom.', 'En la estación, alguien nuevo te pregunta tu nombre.', 'На вокзале новый знакомый спрашивает ваше имя.')],
    bye: ['station', 'c_welcome', T4('Your train is here. Say goodbye.', 'Votre train arrive. Dites au revoir.', 'Llega tu tren. Despídete.', 'Пришёл ваш поезд. Попрощайтесь.')],
    coffee: ['station', 'c_what', T4('A kiosk on the station platform. Order a coffee.', 'Un kiosque sur le quai de la gare. Commandez un café.', 'Un quiosco en el andén. Pide un café.', 'Киоск на перроне. Закажите кофе.')],
    tea: ['station', 'c_what', T4('The kiosk has tea. Order one.', 'Le kiosque a du thé. Commandez-en un.', 'El quiosco tiene té. Pide uno.', 'В киоске есть чай. Закажите.')],
    howmuch: ['plaza', 'c_here', T4('At the market, a vendor hands you fruit. Ask the price.', 'Au marché, on vous tend des fruits. Demandez le prix.', 'En el mercado te dan fruta. Pregunta el precio.', 'На рынке вам протягивают фрукты. Спросите цену.')],
    thanks: ['plaza', 'c_here', T4('A neighbour returns your umbrella. Thank them.', 'Un voisin vous rend votre parapluie. Remerciez-le.', 'Un vecino te devuelve el paraguas. Dale las gracias.', 'Сосед возвращает вам зонт. Поблагодарите.')],
    where: ['kiosk', 'c_here', T4('Leaving the café, ask where the station is.', 'En quittant le café, demandez où est la gare.', 'Al salir del café, pregunta dónde está la estación.', 'Выходя из кафе, спросите, где вокзал.')],
    slower: ['kiosk', 'c_price', T4('The cashier talks fast. Ask them to speak more slowly.', 'La caissière parle vite. Demandez de ralentir.', 'La cajera habla rápido. Pídele que hable más despacio.', 'Кассир говорит быстро. Попросите говорить медленнее.')]
  };
  LQ.CONCEPT_SKILL = { hello: 'greet_politely', fine: 'greet_politely', name: 'introduce_self', bye: 'thank_and_close', thanks: 'thank_and_close', coffee: 'request_item', tea: 'request_item', howmuch: 'ask_price', where: 'ask_directions', slower: 'repair_misunderstanding' };

  /* Pack intents: registered per phrase group so distinctive words are computed against siblings. */
  LQ.PK = LQ.PK || {};
  function registerGroup(gid, tid, phraseOf, extra) {
    LQ.LEARNER_CONCEPTS.forEach(c => {
      const p = phraseOf(c); if (!p) return;
      LQ.PK['pk:' + gid + ':' + c] = { gid, tid, concept: c, variants: [p.t, p.r].concat((extra && extra[c]) || []).filter(Boolean) };
    });
  }
  LQ.registerPackIntents = registerGroup;
  LQ.LEARNER_CONCEPTS && Object.keys(LQ.PACKS).forEach(tid => registerGroup(tid, tid, c => LQ.packPhrase(tid, c)));

  /* Build a mission from a template and a phrase source. opts: {id, gid, phrase(c), local, character, title, scene, factory, chapter, extra} */
  LQ.buildTemplate = function (tid, kind, opts) {
    opts = opts || {};
    const track = LQ.trackById(tid), info = LQ.TEMPLATE_INFO[kind], pk = LQ.PACKS[tid] || {};
    const phrase = opts.phrase || (c => LQ.packPhrase(tid, c));
    const gid = opts.gid || tid;
    const charId = opts.character !== undefined ? opts.character : (pk.character || null);
    const local = opts.local || (charId ? { name: LQ.CHARACTERS[charId].name.split(' ')[0], role: U2(LQ.CHARACTERS[charId].role) } : track.local) || { name: 'A neighbour', role: 'who lives nearby' };
    const vars = { local: local.name, role: local.role, city: track.city };
    const I = c => 'pk:' + gid + ':' + c;
    const exId = c => (opts.exprPrefix || ('pk-' + tid + '-')) + c;
    const P = c => { const p = phrase(c); return p ? Object.assign({}, p) : { t: '…', r: '', m: LQ.CONCEPTS[c] }; };
    const id = opts.id || ('tg-' + tid + '-' + kind);
    const sk = c => LQ.CONCEPT_SKILL[c];
    const br = Object.assign({ skip: true, alt: true, early: true, fast: true }, opts.branches || {});
    /* The price follows what was ordered when the pack prices items; a studio draft has one price line. */
    const priceFor = opts.phrase ? P('c_price') : (v => LQ.packPrice(tid, v.drink) || P('c_price'));
    /* "Nice to meet you" uses the name the learner actually gave, where a vocative is natural. */
    const niceTo = v => LQ.withName(P('c_nice'), v.name, tid);
    let roleplay;
    if (kind === 'greet') roleplay = { start: 't1', turns: {
      t1: { say: P('hello'), hint: hint(P('hello')), suggest: [P('hello').t, P('name').t], clarify: P('c_sorry'),
        expect: [{ intent: I('name'), skill: 'introduce_self', next: 't4', reply: niceTo, set: { path: 'skipped-small-talk' } }, { intent: I('hello'), skill: 'greet_politely', next: 't2', reply: P('c_howareyou') }] },
      t2: { say: null, hint: hint(P('fine')), suggest: [P('fine').t], clarify: P('c_howareyou'), expect: [{ intent: I('fine'), skill: 'greet_politely', next: 't3', reply: P('c_name') }] },
      t3: { say: null, unexpected: true, hint: hint(P('name')), suggest: [P('name').t], clarify: P('c_name'), expect: [{ intent: I('name'), skill: 'introduce_self', next: 't4', reply: niceTo }] },
      t4: { say: null, hint: hint(P('bye')), suggest: [P('bye').t, P('thanks').t], clarify: P('c_sorry'), expect: [{ intent: I('bye'), skill: 'thank_and_close', next: null, reply: P('bye') }, { intent: I('thanks'), skill: 'thank_and_close', next: null, reply: P('c_welcome') }] } } };
    if (kind === 'order') roleplay = { start: 't1', turns: {
      t1: { say: P('c_what'), hint: hint(P('coffee')), suggest: [P('coffee').t, P('tea').t], clarify: P('c_what'),
        expect: [{ intent: I('tea'), skill: 'request_item', next: 't2', set: { drink: 'tea' }, reply: P('c_here') }, { intent: I('coffee'), skill: 'request_item', next: 't2', set: { drink: 'coffee' }, reply: P('c_here') }] },
      t2: { say: null, hint: hint(P('howmuch')), suggest: [P('howmuch').t], clarify: P('c_sorry'),
        expect: [{ intent: I('howmuch'), skill: 'ask_price', next: 't3', reply: priceFor }, { intent: I('thanks'), skill: 'thank_and_close', next: 't3', reply: priceFor, note: 'thanked-before-price' }] },
      t3: { say: null, hint: hint(P('thanks')), suggest: [P('thanks').t, P('bye').t], clarify: P('c_sorry'),
        expect: [{ intent: I('thanks'), skill: 'thank_and_close', next: null, reply: P('c_welcome') }, { intent: I('bye'), skill: 'thank_and_close', next: null, reply: P('c_welcome') }] } } };
    if (kind === 'way') roleplay = { start: 't1', turns: {
      t1: { say: P('hello'), hint: hint(P('where')), suggest: [P('where').t], clarify: P('c_sorry'), also: [{ intent: I('hello'), skill: 'greet_politely' }],
        expect: [{ intent: I('where'), skill: 'ask_directions', next: 't2', reply: null }] },
      t2: { say: P('c_way'), fast: true, hideText: true, repairNext: 't3', hint: hint(P('slower')), suggest: [P('slower').t, P('thanks').t], clarify: P('c_way'),
        expect: [{ intent: I('slower'), skill: 'repair_misunderstanding', next: 't3', reply: null }, { intent: I('thanks'), skill: 'thank_and_close', next: null, reply: P('c_welcome'), set: { understoodFast: true } }] },
      t3: { say: P('c_way'), slow: true, hint: hint(P('thanks')), suggest: [P('thanks').t, P('bye').t], clarify: P('c_way'),
        expect: [{ intent: I('thanks'), skill: 'thank_and_close', next: null, reply: P('c_welcome') }, { intent: I('bye'), skill: 'thank_and_close', next: null, reply: P('c_welcome') }] } } };
    const contextLine = kind === 'greet' ? P('hello') : kind === 'order' ? P('c_what') : P('c_way');
    const recall = {};
    info.concepts.forEach(c => { const r = RECALL[c]; recall[exId(c)] = { scene: r[0], character: charId, local, line: P(r[1]), task: fill(r[2], vars) }; });
    const m = {
      id, track: tid, kind, template: kind, templated: true, factory: !!opts.factory, chapter: opts.chapter || { n: LQ.templateChapter(tid), en: 'Around ' + track.city, fr: 'Autour de ' + track.city, es: 'Por ' + track.city, ru: 'Город: ' + track.city },
      minutes: info.minutes, title: opts.title || fill(info.title, vars), scene: opts.scene || info.scene, character: charId, local: charId ? null : local, status: 'playable',
      skills: info.skills.slice(), outcome: fill(info.outcome, vars), focus: info.focus,
      context: { setup: fill(info.setup, vars), line: contextLine, question: fill(info.question, vars), options: info.options.map(o => ({ icon: o[0], m: o[1], ok: !!o[2] })) },
      expressions: info.concepts.map(c => Object.assign({ id: exId(c), concept: c }, P(c))),
      anticipate: Object.entries(info.prompts).map(([c, pr]) => ({ prompt: fill(pr, vars), expr: exId(c) })),
      roleplay, recall, provenance: opts.provenance || null, gid, branches: br
    };
    /* Branch switches (editable in the studio's mission editor). */
    const T = roleplay.turns;
    if (kind === 'greet' && !br.skip) T.t1.expect = T.t1.expect.filter(x => x.intent !== I('name'));
    if (kind === 'order' && !br.alt) { T.t1.expect = T.t1.expect.filter(x => x.intent !== I('tea')); T.t1.suggest = [P('coffee').t]; }
    if (kind === 'order' && !br.early) T.t2.expect = T.t2.expect.filter(x => x.note !== 'thanked-before-price');
    if (kind === 'way' && !br.fast) { Object.assign(T.t2, { fast: false, hideText: false, repairNext: null }); }
    return m;
  };
  /* Template missions follow a course's hand-written chapters (chapter 1 when it has none). */
  LQ.templateChapter = (tid) => 1 + Math.max(0, ...LQ.MISSIONS.filter(m => m.track === tid && m.chapter).map(m => m.chapter.n));
  function U2(o) { return o ? (o.en || Object.values(o)[0]) : ''; }

  const cache = {};
  LQ.templateMissions = (tid) => {
    if (cache[tid]) return cache[tid];
    const own = LQ.MISSIONS.filter(m => m.track === tid && m.status === 'playable').map(m => m.kind);
    const list = LQ.TEMPLATE_KINDS.filter(k => !own.includes(k)).map(k => LQ.buildTemplate(tid, k));
    cache[tid] = list; return list;
  };
  LQ.packExpression = (id) => {
    const mt = /^pk-(.+)-(hello|fine|name|bye|thanks|coffee|tea|howmuch|where|slower)$/.exec(id || '');
    if (!mt || !LQ.trackById(mt[1])) return null;
    const tid = mt[1], c = mt[2];
    const kind = LQ.TEMPLATE_KINDS.find(k => LQ.TEMPLATE_INFO[k].concepts.includes(c));
    const m = LQ.templateMissions(tid).find(x => x.template === kind) || LQ.buildTemplate(tid, kind);
    const e = m.expressions.find(x => x.id === id) || Object.assign({ id, concept: c }, LQ.packPhrase(tid, c));
    return { e, m };
  };
})();
