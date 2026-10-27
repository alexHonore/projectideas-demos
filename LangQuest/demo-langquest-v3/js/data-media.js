/* LangQuest V3 — audio courses (Pimsleur-style scripts played with device voices),
   studio seed records, model routes and regression fixtures. All fictional. */
'use strict';

LQ.SKILLS.make_plans = { en: 'Make plans', fr: 'Faire des projets', ru: 'Договариваться о встрече', can: { en: 'I can accept an invitation and agree on a time.', fr: 'Je peux accepter une invitation et convenir d’une heure.', ru: 'Я могу принять приглашение и договориться о времени.' } };
Object.assign(LQ.EXPR_SKILL || (LQ.EXPR_SKILL = {}), {});

/* Full content for the "Make plans" mission. It stays a preview in the learner app until
   it is approved by a language reviewer and published in the Content studio. */
LQ.PLANS_CONTENT = {
  context: {
    setup: { en: 'Friday evening at La Corrala. Lucía is stacking chairs and turns to you.', fr: 'Vendredi soir à La Corrala. Lucía empile les chaises et se tourne vers toi.' },
    line: { t: 'Oye, ¿qué haces el sábado?', m: { en: 'Hey, what are you doing on Saturday?', fr: 'Dis, tu fais quoi samedi ?' } },
    question: { en: 'What does Lucía want to know?', fr: 'Que veut savoir Lucía ?' },
    options: [{ icon: 'calendar', m: { en: 'Your plans for Saturday', fr: 'Tes projets pour samedi' }, ok: true }, { icon: 'coin', m: { en: 'If you paid', fr: 'Si tu as payé' } }, { icon: 'pin', m: { en: 'Where you live', fr: 'Où tu habites' } }]
  },
  expressions: [
    { id: 'es-nada-especial', t: 'Nada especial, ¿por qué?', m: { en: 'Nothing special, why?', fr: 'Rien de spécial, pourquoi ?' } },
    { id: 'es-me-parece-genial', t: '¡Me parece genial!', m: { en: 'Sounds great!', fr: 'Ça me paraît génial !' } },
    { id: 'es-a-que-hora', t: '¿A qué hora?', m: { en: 'What time?', fr: 'À quelle heure ?' } },
    { id: 'es-nos-vemos', t: '¡Nos vemos el sábado!', m: { en: 'See you on Saturday!', fr: 'On se voit samedi !' } }
  ],
  anticipate: [
    { prompt: { en: 'Lucía asks about your Saturday. Say nothing special, and ask why.', fr: 'Lucía te demande pour samedi. Dis rien de spécial, et demande pourquoi.' }, expr: 'es-nada-especial' },
    { prompt: { en: 'Accept her invitation enthusiastically.', fr: 'Accepte son invitation avec enthousiasme.' }, expr: 'es-me-parece-genial' },
    { prompt: { en: 'Ask what time.', fr: 'Demande à quelle heure.' }, expr: 'es-a-que-hora' }
  ],
  roleplay: {
    start: 't1', turns: {
      t1: { say: { t: 'Oye, ¿qué haces el sábado?', m: { en: 'Hey, what are you doing on Saturday?', fr: 'Dis, tu fais quoi samedi ?' } }, hint: { en: '“Nada especial, ¿por qué?”', fr: '« Nada especial, ¿por qué? »' }, suggest: ['Nada especial, ¿por qué?', 'No sé todavía.'],
        expect: [{ intent: 'es_nothing', skill: 'respond_unexpected', next: 't2', reply: { t: 'Hay un concierto de flamenco en la plaza. ¿Te vienes?', m: { en: 'There’s a flamenco concert in the plaza. Want to come?', fr: 'Il y a un concert de flamenco sur la place. Tu viens ?' } } }] },
      t2: { say: null, hint: { en: 'Accept: “¡Me parece genial!” or decline: “No puedo, lo siento.”', fr: 'Accepte : « ¡Me parece genial! » ou refuse : « No puedo, lo siento. »' }, suggest: ['¡Me parece genial!', 'No puedo, lo siento.'],
        expect: [
          { intent: 'es_decline', skill: 'make_plans', next: null, set: { plan: 'declined' }, reply: { t: '¡Qué pena! Otra vez será.', m: { en: 'What a shame! Another time.', fr: 'Dommage ! Une autre fois.' } } },
          { intent: 'es_accept', skill: 'make_plans', next: 't3', set: { plan: 'accepted' }, reply: { t: '¡Genial!', m: { en: 'Great!', fr: 'Génial !' } } }
        ] },
      t3: { say: { t: '¿Quedamos antes para tomar algo?', m: { en: 'Shall we meet before for a drink?', fr: 'On se retrouve avant pour boire un verre ?' } }, hint: { en: 'Ask the time: “¿A qué hora?”', fr: 'Demande l’heure : « ¿A qué hora? »' }, suggest: ['Vale, ¿a qué hora?', '¿A qué hora?'],
        expect: [{ intent: 'es_what_time', skill: 'confirm_understanding', next: 't4', reply: { t: 'A las ocho, en la puerta del café.', m: { en: 'At eight, at the café door.', fr: 'À huit heures, devant le café.' } } }] },
      t4: { say: null, hint: { en: '“Perfecto, ¡nos vemos el sábado!”', fr: '« Perfecto, ¡nos vemos el sábado! »' }, suggest: ['Perfecto, ¡nos vemos el sábado!'],
        expect: [{ intent: 'es_see_you', skill: 'thank_and_close', next: null, reply: { t: '¡Hasta el sábado!', m: { en: 'See you Saturday!', fr: 'À samedi !' } } }] }
    }
  },
  recall: {
    'es-a-que-hora': { scene: 'madrid-terrace', character: 'andres', line: { t: 'Mañana hay partido.', m: { en: 'There’s a match tomorrow.', fr: 'Il y a un match demain.' } }, task: { en: 'Andrés mentions tomorrow’s match. Ask what time.', fr: 'Andrés parle du match de demain. Demande à quelle heure.' } },
    'es-me-parece-genial': { scene: 'madrid-plaza', character: 'carmen', line: { t: '¿Te guardo unas flores para el sábado?', m: { en: 'Shall I keep some flowers for you for Saturday?', fr: 'Je te garde des fleurs pour samedi ?' } }, task: { en: 'Carmen offers to keep flowers for you. Say that sounds great.', fr: 'Carmen propose de te garder des fleurs. Dis que c’est génial.' } }
  }
};
Object.assign(LQ.INTENTS, {
  es_nothing: { any: ['nada', 'nada especial', 'no se', 'libre', 'no tengo planes', 'por que', 'nothing'] },
  es_accept: { any: ['genial', 'me parece', 'vale', 'si', 'claro', 'me encantaria', 'por supuesto', 'venga', 'me apunto'], not: ['no puedo'] },
  es_decline: { any: ['no puedo', 'lo siento', 'no me va', 'otro dia', 'imposible'] },
  es_what_time: { any: ['a que hora', 'hora', 'cuando', 'donde'] },
  es_see_you: { any: ['nos vemos', 'perfecto', 'vale', 'hasta el sabado', 'hasta luego', 'genial'] }
});
Object.assign(LQ.EXPR_SKILL, { 'es-nada-especial': 'respond_unexpected', 'es-me-parece-genial': 'make_plans', 'es-a-que-hora': 'confirm_understanding', 'es-nos-vemos': 'thank_and_close' });

/* Applies studio publication state to the learner catalog. */
LQ.applyPublication = function () {
  const st = LQ.store && LQ.store.state; if (!st || !st.studio) return;
  const plans = LQ.MISSIONS.find(m => m.id === 'es-plans');
  const live = (st.studio.drafts || []).find(d => d.id === 'D-201' && d.status === 'published');
  if (live) { Object.assign(plans, LQ.PLANS_CONTENT, { status: 'playable', skills: ['respond_unexpected', 'make_plans', 'confirm_understanding', 'thank_and_close'], publishedAt: live.publishedAt }); }
  else { plans.status = 'preview'; delete plans.context; delete plans.expressions; delete plans.anticipate; delete plans.roleplay; delete plans.recall; plans.skills = ['make_plans', 'respond_unexpected']; }
};

/* ───────────── Audio courses ─────────────
   n = narrator (instruction language), s = target speaker, p = instructional pause (seconds). */
LQ.AUDIO = [
  { id: 'madrid-out-loud', track: 'es-spain', source: 'en', title: 'Madrid, out loud', by: 'LangQuest Studio', level: 'Beginner', scene: 'madrid-cafe', tint: '#3149E0',
    voiceNote: 'Script lesson: your device voices read the narrator (English) and the speakers (Castilian Spanish).', rights: 'LangQuest original script, free for every learner',
    chapters: [
      { id: 'ch1', title: 'Café mornings', lessons: [
        { id: 'madrid-l1', title: '¿Qué te pongo?', mission: 'es-cafe', speakers: 'Lucía (Madrid)', segs: [
          { n: 'Welcome to Madrid, out loud. In this lesson you’ll order a coffee the way people do in Madrid. Listen to Lucía at her café in Lavapiés.' },
          { s: '¡Buenos días! ¿Qué te pongo?', who: 'Lucía', g: 'Good morning! What can I get you?' },
          { n: 'She said: good morning, what can I get you? Listen again, more slowly.' },
          { s: '¿Qué te pongo?', who: 'Lucía', slow: true, g: 'What can I get you?' },
          { n: 'Here’s one way to answer. A coffee with milk, please.' },
          { s: 'Un café con leche, por favor.', g: 'A coffee with milk, please.' },
          { p: 3, cue: 'Repeat it' },
          { n: 'Now you. How would you say: a coffee with milk, please? Say it out loud before you hear it.' },
          { p: 5, cue: 'Your turn: say it before you hear it' },
          { s: 'Un café con leche, por favor.', g: 'A coffee with milk, please.' },
          { n: 'Lucía asks if it’s for here or to go.' },
          { s: '¿Para tomar aquí o para llevar?', who: 'Lucía', g: 'For here or to go?' },
          { n: 'For here is: para tomar aquí.' },
          { s: 'Para tomar aquí.', slow: true, g: 'For here.' },
          { p: 3, cue: 'Repeat it' },
          { n: 'From memory now: order your coffee, politely.' },
          { p: 5, cue: 'Your turn: order from memory' },
          { s: 'Un café con leche, por favor.', g: 'A coffee with milk, please.' },
          { n: 'And say you’ll have it here.' },
          { p: 4, cue: 'Your turn' },
          { s: 'Para tomar aquí.', g: 'For here.' },
          { n: 'That’s it for today. Next time: paying and saying thanks.' }
        ] },
        { id: 'madrid-l2', title: 'Paying and thanking', mission: 'es-cafe', speakers: 'Lucía (Madrid)', segs: [
          { n: 'In this lesson: asking the price and saying thanks. Lucía brings your coffee.' },
          { s: 'Aquí tienes.', who: 'Lucía', g: 'Here you go.' },
          { n: 'Here you go. To ask how much it is, say: ¿cuánto es?' },
          { s: '¿Cuánto es?', slow: true, g: 'How much is it?' },
          { p: 3, cue: 'Repeat it' },
          { n: 'Listen to her answer.' },
          { s: 'Son un euro con ochenta.', who: 'Lucía', g: 'That’s one euro eighty.' },
          { n: 'One euro eighty. How would you ask the price again?' },
          { p: 4, cue: 'Your turn' },
          { s: '¿Cuánto es?', g: 'How much is it?' },
          { n: 'Now thank her, and say see you later.' },
          { p: 4, cue: 'Your turn' },
          { s: 'Gracias, ¡hasta luego!', g: 'Thanks, see you later!' },
          { s: '¡A ti! Que tengas un buen día.', who: 'Lucía', g: 'Thank you! Have a good day.' },
          { n: 'Next chapter: getting around the city.' }
        ] }
      ] },
      { id: 'ch2', title: 'Getting around', lessons: [
        { id: 'madrid-l3', title: 'Where’s the metro?', mission: 'es-metro', speakers: 'Carmen (Madrid)', segs: [
          { n: 'Today you’ll ask the way, and ask someone to slow down.' },
          { s: 'Perdona, ¿dónde está el metro?', g: 'Excuse me, where is the metro?' },
          { p: 3, cue: 'Repeat it' },
          { n: 'Carmen answers, fast.' },
          { s: 'Cruzas la plaza, sigues todo recto y la entrada está a la izquierda.', who: 'Carmen', fast: true, g: 'You cross the plaza, go straight ahead, and the entrance is on the left.' },
          { n: 'Too fast? Ask her: can you repeat more slowly, please?' },
          { s: '¿Puedes repetir más despacio, por favor?', slow: true, g: 'Can you repeat more slowly, please?' },
          { p: 4, cue: 'Repeat it' },
          { n: 'Your turn, from memory: ask her to repeat more slowly.' },
          { p: 5, cue: 'Your turn: from memory' },
          { s: '¿Puedes repetir más despacio, por favor?', g: 'Can you repeat more slowly, please?' },
          { n: 'Then check: straight ahead and to the left?' },
          { p: 4, cue: 'Your turn' },
          { s: '¿Todo recto y a la izquierda?', g: 'Straight ahead and to the left?' },
          { n: 'See you at the next stop.' }
        ] }
      ] }
    ] },
  { id: 'montreal-cafe', track: 'french', region: 'ca', source: 'en', title: 'Montréal, one café at a time', by: 'LangQuest Studio', level: 'Beginner', scene: 'montreal-cafe', tint: '#12805C',
    voiceNote: 'Script lesson: device voices read the narrator (English) and Émilie (Québec French when your device has an fr-CA voice).', rights: 'LangQuest original script, free for every learner',
    chapters: [{ id: 'ch1', title: 'Mile End', lessons: [
      { id: 'montreal-l1', title: 'Pour ici ou pour apporter?', mission: 'fr-mileend', speakers: 'Émilie (Montréal)', segs: [
        { n: 'Welcome to Montréal, one café at a time. You’re in Mile End. Listen to Émilie.' },
        { s: 'Allô! Qu’est-ce que je te sers?', who: 'Émilie', g: 'Hi! What can I get you?' },
        { n: 'To order a café au lait, say:' },
        { s: 'Un café au lait, s’il vous plaît.', g: 'A café au lait, please.' },
        { p: 3, cue: 'Repeat it' },
        { n: 'She asks: for here, or to go?' },
        { s: 'Pour ici ou pour apporter?', who: 'Émilie', g: 'For here or to go?' },
        { n: 'In Québec, to go is “pour apporter”. Say: to go, please.' },
        { p: 4, cue: 'Your turn' },
        { s: 'Pour apporter, s’il vous plaît.', g: 'To go, please.' },
        { n: 'From memory: order your café au lait.' },
        { p: 5, cue: 'Your turn: from memory' },
        { s: 'Un café au lait, s’il vous plaît.', g: 'A café au lait, please.' },
        { n: 'À la prochaine!' }
      ] }] }] },
  { id: 'tokyo-cafe', track: 'japanese', source: 'en', title: 'Tokyo café basics', by: 'LangQuest Studio', level: 'Beginner', scene: 'tokyo-cafe', tint: '#2B3A8C',
    voiceNote: 'Script lesson: device voices read the narrator (English) and Haruto (Japanese).', rights: 'LangQuest original script, free for every learner',
    chapters: [{ id: 'ch1', title: 'Shimokitazawa', lessons: [
      { id: 'tokyo-l1', title: 'Ordering at a café', mission: 'ja-cafe', speakers: 'Haruto (Tokyo)', segs: [
        { n: 'Welcome. You’re in a small café in Shimokitazawa. Listen to the greeting.' },
        { s: 'いらっしゃいませ。', r: 'Irasshaimase.', who: 'Haruto', g: 'Welcome!' },
        { n: 'That’s the welcome you’ll hear in every shop. To order one café latte, please:' },
        { s: 'カフェラテをひとつください。', r: 'Kafe rate o hitotsu kudasai.', g: 'One café latte, please.' },
        { p: 4, cue: 'Repeat it' },
        { n: 'Ask how much it is.' },
        { p: 4, cue: 'Your turn' },
        { s: 'いくらですか？', r: 'Ikura desu ka?', g: 'How much is it?' },
        { n: 'And thank him.' },
        { p: 3, cue: 'Your turn' },
        { s: 'ありがとうございます。', r: 'Arigatō gozaimasu.', g: 'Thank you very much.' }
      ] }] }] },
  { id: 'brooklyn-talk', track: 'english', source: 'ru', title: 'Brooklyn at the counter', by: 'LangQuest Studio', level: 'Beginner', scene: 'brooklyn-cafe', tint: '#B5543B',
    voiceNote: 'Script lesson: device voices read the narrator (Russian) and Jordan (American English).', rights: 'LangQuest original script, free for every learner',
    chapters: [{ id: 'ch1', title: 'Fort Greene', lessons: [
      { id: 'brooklyn-l1', title: 'Small talk at the counter', mission: 'en-cafe', speakers: 'Jordan (Brooklyn)', segs: [
        { n: 'Добро пожаловать в Бруклин. Послушайте, что спрашивает бариста.' },
        { s: 'Hey there! What can I get started for you?', who: 'Jordan', g: 'Привет! Что вам приготовить?' },
        { n: 'Он спрашивает, что вам приготовить. Попросите латте:' },
        { s: 'Can I get a latte, please?', g: 'Можно мне латте, пожалуйста?' },
        { p: 4, cue: 'Повторите' },
        { n: 'Теперь бариста спрашивает про размер.' },
        { s: 'What size: small, medium or large?', who: 'Jordan', g: 'Какой размер?' },
        { n: 'Ответьте: средний, пожалуйста.' },
        { p: 4, cue: 'Ваша очередь' },
        { s: 'Medium, please.', g: 'Средний, пожалуйста.' },
        { n: 'И скажите, что возьмёте с собой.' },
        { p: 4, cue: 'Ваша очередь' },
        { s: 'To go, please.', g: 'С собой, пожалуйста.' },
        { n: 'До встречи!' }
      ] }] }] }
];
/* A new chapter waiting in the studio review queue. Publishing it adds it to "Madrid, out loud". */
LQ.AUDIO_DRAFT_CHAPTER = { collection: 'madrid-out-loud', chapter: { id: 'ch3', title: 'Plans with friends', lessons: [
  { id: 'madrid-l4', title: '¿Quedamos el sábado?', mission: 'es-plans', speakers: 'Lucía (Madrid)', segs: [
    { n: 'In this lesson: making plans. Lucía invites you to a concert on Saturday.' },
    { s: '¿Quedamos el sábado? Hay un concierto en la plaza.', who: 'Lucía', g: 'Shall we meet on Saturday? There’s a concert in the plaza.' },
    { n: 'To accept, say: sounds great!' },
    { s: '¡Me parece genial!', g: 'Sounds great!' },
    { p: 3, cue: 'Repeat it' },
    { n: 'Ask what time.' },
    { s: '¿A qué hora?', slow: true, g: 'What time?' },
    { p: 4, cue: 'Your turn' },
    { s: 'A las ocho, en la puerta del café.', who: 'Lucía', g: 'At eight, at the café door.' },
    { n: 'Say: perfect, see you Saturday.' },
    { p: 4, cue: 'Your turn' },
    { s: 'Perfecto, ¡nos vemos el sábado!', g: 'Perfect, see you Saturday!' }
  ] }] } };
LQ.audioCollections = () => {
  const st = LQ.store.state, out = JSON.parse(JSON.stringify(LQ.AUDIO));
  const ch3 = (st.studio.assets || []).find(a => a.id === 'A-1012');
  if (ch3 && ch3.published) out.find(c => c.id === 'madrid-out-loud').chapters.push(JSON.parse(JSON.stringify(LQ.AUDIO_DRAFT_CHAPTER.chapter)));
  const unpub = (st.studio.unpublishedCollections || []);
  const live = out.filter(c => !unpub.includes(c.id));
  (st.studio.assets || []).filter(a => a.published && a.kind === 'upload').forEach(a => {
    live.push({ id: 'up-' + a.id, track: a.track, source: a.source, title: a.collection || a.title, by: a.speaker || 'Uploaded by the content team', level: a.level || 'All levels', scene: (LQ.trackById(a.track) || {}).id === 'es-spain' ? 'madrid-cafe' : 'plaza', tint: '#7A4FD0', uploaded: true,
      voiceNote: 'Original uploaded recording, played unaltered.', rights: a.rightsNote || 'Rights recorded in the studio',
      chapters: [{ id: 'c1', title: a.chapter || 'Chapter 1', lessons: [{ id: 'up-' + a.id, title: a.title, upload: a.id, speakers: a.speaker || 'Not specified', duration: a.duration }] }] });
  });
  (st.studio.assets || []).filter(a => a.published && a.kind === 'archive').forEach(a => {
    let col = live.find(c => c.id === 'arc-' + a.collectionId);
    if (!col) { col = { id: 'arc-' + a.collectionId, track: a.track, source: a.source, title: a.collection, by: a.speaker, level: 'Beginner', scene: a.track === 'ar-moroccan' ? 'casablanca-cafe' : 'plaza', tint: '#12805C', archive: true, voiceNote: 'Original recording from the founder archive.', rights: a.rightsNote, chapters: [] }; live.push(col); }
    let ch = col.chapters.find(c => c.title === a.chapter); if (!ch) { ch = { id: 'c' + col.chapters.length, title: a.chapter, lessons: [] }; col.chapters.push(ch); }
    ch.lessons.push({ id: 'arc-' + a.id, title: a.title, archive: a.id, speakers: a.speaker, duration: a.duration });
  });
  return live;
};
LQ.lessonById = id => { for (const c of LQ.audioCollections()) for (const ch of c.chapters) for (const l of ch.lessons) if (l.id === id) return { c, ch, l }; return null; };
LQ.segSeconds = seg => seg.p ? seg.p : Math.max(1.2, (seg.n || seg.s || '').length * 0.075 / (seg.slow ? 0.75 : seg.fast ? 1.15 : 1)) + 0.4;
LQ.lessonSeconds = l => l.segs ? l.segs.reduce((a, s) => a + LQ.segSeconds(s), 0) : (l.duration || 0);

/* ───────────── Studio seed ───────────── */
LQ.STUDIO_ROLES = {
  content_editor: { label: 'Content editor', can: ['edit', 'bulk', 'transcribe', 'request_review', 'upload', 'factory'] },
  language_reviewer: { label: 'Language reviewer (es, ary, fr)', can: ['review'], langs: ['es-spain', 'ar-moroccan', 'french'] },
  native_reviewer: { label: 'Native reviewer, other 27 courses (demo)', can: ['review'], langs: LQ.TRACKS.map(t => t.id).filter(id => !['es-spain', 'ar-moroccan', 'french'].includes(id)), note: 'Stands in for the per-course native reviewers each of the other 27 courses needs.' },
  admin: { label: 'Administrator', can: ['edit', 'bulk', 'transcribe', 'request_review', 'rights', 'publish', 'upload', 'models', 'factory'] },
  support_readonly: { label: 'Support (read-only)', can: [] }
};
LQ.RIGHTS_BASIS = {
  original: { label: 'LangQuest original', publish: true },
  licensed: { label: 'Licensed with written agreement', publish: true },
  purchased: { label: 'Purchased copy (no redistribution rights)', publish: false, why: 'Owning a purchased course does not grant redistribution, public streaming or AI-processing rights. It can stay in private owner-only staging.' },
  unknown: { label: 'Unknown / not documented', publish: false, why: 'Rights are not documented. Record the licence, permitted uses and evidence before this can reach learners.' }
};
LQ.studioSeed = () => ({
  role: 'content_editor',
  assets: [
    { id: 'A-1001', kind: 'script', title: '¿Qué te pongo?', collection: 'Madrid, out loud', collectionId: 'madrid-out-loud', chapter: 'Café mornings', order: 1, track: 'es-spain', source: 'en', speaker: 'Device voice (synthetic) + narrator', duration: 0, size: 0.004, path: 'scripts/madrid/ch1-l1.json', rights: 'original', rightsNote: 'LangQuest original script', transcript: 'reviewed', review: 'approved', published: true, checksum: 'sha256:4c1e…9a07' },
    { id: 'A-1002', kind: 'script', title: 'Paying and thanking', collection: 'Madrid, out loud', collectionId: 'madrid-out-loud', chapter: 'Café mornings', order: 2, track: 'es-spain', source: 'en', speaker: 'Device voice (synthetic) + narrator', duration: 0, size: 0.003, path: 'scripts/madrid/ch1-l2.json', rights: 'original', rightsNote: 'LangQuest original script', transcript: 'reviewed', review: 'approved', published: true, checksum: 'sha256:b77d…12fe' },
    { id: 'A-1003', kind: 'script', title: 'Where’s the metro?', collection: 'Madrid, out loud', collectionId: 'madrid-out-loud', chapter: 'Getting around', order: 1, track: 'es-spain', source: 'en', speaker: 'Device voice (synthetic) + narrator', duration: 0, size: 0.003, path: 'scripts/madrid/ch2-l1.json', rights: 'original', rightsNote: 'LangQuest original script', transcript: 'reviewed', review: 'approved', published: true, checksum: 'sha256:0e93…c4b1' },
    { id: 'A-1012', kind: 'script', title: '¿Quedamos el sábado?', collection: 'Madrid, out loud', collectionId: 'madrid-out-loud', chapter: 'Plans with friends', order: 1, track: 'es-spain', source: 'en', speaker: 'Device voice (synthetic) + narrator', duration: 0, size: 0.003, path: 'scripts/madrid/ch3-l1.json', rights: 'original', rightsNote: 'LangQuest original script', transcript: 'reviewed', review: 'needed', published: false, checksum: 'sha256:7a52…e0d3' },
    { id: 'A-2001', kind: 'archive', title: 'Salam, labas?', collection: 'Darija au café', collectionId: 'darija-au-cafe', chapter: 'Salutations', order: 1, track: 'ar-moroccan', source: 'fr', speaker: 'Nadia B. (Casablanca), contracted speaker', duration: 592, size: 14.2, path: 'darija-au-cafe/01-salutations/01 Salam labas.mp3', rights: 'licensed', rightsNote: 'Recording agreement signed 2026-09-14: app distribution and AI transcription granted; synthetic voice not granted', transcript: 'draft', review: 'needed', published: false, checksum: 'sha256:91af…3c20' },
    { id: 'A-2002', kind: 'archive', title: 'Ach bghiti?', collection: 'Darija au café', collectionId: 'darija-au-cafe', chapter: 'Salutations', order: 2, track: 'ar-moroccan', source: 'fr', speaker: 'Nadia B. (Casablanca), contracted speaker', duration: 700, size: 16.8, path: 'darija-au-cafe/01-salutations/02 Ach bghiti.mp3', rights: 'licensed', rightsNote: 'Recording agreement signed 2026-09-14', transcript: 'none', review: 'none', published: false, checksum: 'sha256:5d02…a8e9' },
    { id: 'A-2003', kind: 'archive', title: 'Nss-nss, 3afak', collection: 'Darija au café', collectionId: 'darija-au-cafe', chapter: 'Au café', order: 1, track: 'ar-moroccan', source: 'fr', speaker: 'Nadia B. (Casablanca), contracted speaker', duration: 881, size: 21.1, path: 'darija-au-cafe/02-au-cafe/03 Nss-nss.mp3', rights: 'licensed', rightsNote: 'Recording agreement signed 2026-09-14', transcript: 'none', review: 'none', published: false, checksum: 'sha256:c3b8…77d1' },
    { id: 'A-2004', kind: 'archive', title: 'Bch7al?', collection: 'Darija au café', collectionId: 'darija-au-cafe', chapter: '', order: null, track: 'ar-moroccan', source: 'fr', speaker: 'Nadia B. (Casablanca), contracted speaker', duration: 767, size: 18.4, path: 'darija-au-cafe/02-au-cafe/04 Bch7al.mp3', rights: 'licensed', rightsNote: 'Recording agreement signed 2026-09-14', transcript: 'none', review: 'none', published: false, checksum: 'sha256:2fe4…b015' },
    { id: 'A-3001', kind: 'archive', title: 'Disc 1, Track 1', collection: 'Spanish course CDs (purchased 2019)', collectionId: 'spanish-cds', chapter: 'Disc 1', order: 1, track: 'es-spain', source: 'en', speaker: 'Unknown (commercial publisher)', duration: 2482, size: 58.3, path: 'spanish-cds-2019/Disc1/Track01.mp3', rights: 'purchased', rightsNote: 'Retail CD purchased by the founder; no licence for redistribution', transcript: 'none', review: 'none', published: false, checksum: 'sha256:e019…4d6a' },
    { id: 'A-3002', kind: 'archive', title: 'Disc 1, Track 2', collection: 'Spanish course CDs (purchased 2019)', collectionId: 'spanish-cds', chapter: 'Disc 1', order: 2, track: 'es-spain', source: 'en', speaker: 'Unknown (commercial publisher)', duration: 2590, size: 61.0, path: 'spanish-cds-2019/Disc1/Track02.mp3', rights: 'purchased', rightsNote: 'Retail CD purchased by the founder; no licence for redistribution', transcript: 'none', review: 'none', published: false, checksum: 'sha256:6b7c…0f92' },
    { id: 'A-3003', kind: 'archive', title: 'Disc 2, Track 1', collection: 'Spanish course CDs (purchased 2019)', collectionId: 'spanish-cds', chapter: 'Disc 2', order: 1, track: 'es-spain', source: 'en', speaker: 'Unknown (commercial publisher)', duration: 2368, size: 55.7, path: 'spanish-cds-2019/Disc2/Track01.mp3', rights: 'purchased', rightsNote: 'Retail CD purchased by the founder; no licence for redistribution', transcript: 'none', review: 'none', published: false, checksum: 'sha256:a4d1…91c3' },
    { id: 'A-4001', kind: 'archive', title: 'Bonjou vwazen', collection: 'Kreyòl nan katye a', collectionId: 'kreyol', chapter: '', order: null, track: '', source: '', speaker: 'Community recording, Pétion-Ville (consent form HT-014)', duration: 501, size: 88.4, path: 'kreyol-community/01 Bonjou vwazen.wav', rights: 'licensed', rightsNote: 'Community recording agreement HT-014', transcript: 'none', review: 'none', published: false, checksum: 'sha256:fd30…6e18' },
    { id: 'A-4002', kind: 'archive', title: 'Nan mache a', collection: 'Kreyòl nan katye a', collectionId: 'kreyol', chapter: '', order: null, track: '', source: '', speaker: 'Community recording, Pétion-Ville (consent form HT-015)', duration: 523, size: 92.0, path: 'kreyol-community/02 Nan mache a.wav', rights: 'licensed', rightsNote: 'Community recording agreement HT-015', transcript: 'none', review: 'none', published: false, checksum: 'sha256:83ce…d2a4' },
    { id: 'A-5001', kind: 'archive', title: 'Matonge tailors (interview)', collection: 'Lingala street voices', collectionId: 'lingala', chapter: 'Interviews', order: 1, track: 'lingala', source: 'fr', speaker: 'Interview, Matonge (consent pending)', duration: 1323, size: 31.5, path: 'lingala-tailors/Matonge interview.m4a', rights: 'unknown', rightsNote: 'Speaker consent form not yet returned', transcript: 'none', review: 'none', published: false, checksum: 'sha256:1a6f…ce57' }
  ],
  drafts: [
    { id: 'D-201', title: 'Make plans for Saturday', mission: 'es-plans', track: 'es-spain', source: 'en', intent: 'make_plans', kind: 'mission', status: 'review_needed', model: 'factory-large (route v3)', template: 'mission-brief v2.1', created: '2026-10-21', gates: { schema: true, semantic: true, native: false, rights: true, audio: true }, notes: [] },
    { id: 'D-202', title: 'Commander au café (variante)', mission: null, track: 'ar-moroccan', source: 'fr', intent: 'request_drink', kind: 'expressions', status: 'review_needed', model: 'factory-large (route v3)', template: 'expression-set v1.4', created: '2026-10-22', gates: { schema: true, semantic: false, native: false, rights: true, audio: false },
      expressions: [{ target: '…pending native reviewer…', meaning: 'Je voudrais un café, s’il vous plaît.', register: 'polite' }, { target: '…pending native reviewer…', meaning: 'Un nouss-nouss bien chaud, s’il te plaît.', register: 'friendly' }], notes: ['Semantic check waits for real Darija target text from a native reviewer.'] }
  ].concat(LQ.seedTemplateDrafts ? LQ.seedTemplateDrafts() : []),
  audit: [
    { at: '2026-10-20', who: 'Inès M. (admin)', role: 'admin', what: 'Imported 10 records from the founder archive (rclone reconciliation job J-118)' },
    { at: '2026-10-21', who: 'Content factory', role: 'system', what: 'Draft D-201 “Make plans for Saturday” generated (scripted in this demo)' },
    { at: '2026-10-22', who: 'Inès M. (admin)', role: 'admin', what: 'Marked A-3001–A-3003 as purchased copies: private staging only' },
    { at: '2026-10-22', who: 'Content factory', role: 'system', what: 'Draft D-202 generated for Arabic (Moroccan) from French; target text left for native reviewer' }
  ],
  models: {
    dialogue: { task: 'Character dialogue', route: 'dialogue-standard', version: 4, fallback: 'dialogue-backup', tested: '2026-10-20', varieties: 'all published' },
    evaluator: { task: 'Meaning evaluator', route: 'evaluator-small', version: 3, fallback: 'evaluator-backup', tested: '2026-10-20', varieties: 'all published' },
    hints: { task: 'Hints and translations', route: 'hints-multilingual', version: 2, fallback: 'none', tested: '2026-10-19', varieties: 'en, fr instruction' },
    factory: { task: 'Content factory drafts', route: 'factory-large', version: 3, fallback: 'none', tested: '2026-10-18', varieties: 'drafts only' }
  },
  candidates: [
    { id: 'dialogue-candidate-b', label: 'dialogue-candidate-b', covers: ['es-spain', 'ar-moroccan', 'french', 'japanese', 'english'], note: 'Lower latency in staging; needs regression before promotion.' },
    { id: 'dialogue-msa-only', label: 'dialogue-msa-only', covers: ['es-spain', 'french', 'japanese', 'english', 'ar-msa'], note: 'Strong on Modern Standard Arabic, untested on Darija.' }
  ],
  regression: null, uploads: [], unpublishedCollections: [], fxSeeded: !!LQ.seedTemplateDrafts
});

/* Regression fixtures: run against the local meaning matcher (production: against the candidate model). */
LQ.FIXTURES = [
  ['es-spain', 'es_order_coffee', 'Un café con leche, por favor', true], ['es-spain', 'es_order_coffee', 'Me pones un cortado', true], ['es-spain', 'es_order_coffee', 'Quería un café solo', true],
  ['es-spain', 'es_order_coffee', 'No quiero café', false], ['es-spain', 'es_oat', '¿Tenéis leche de avena?', true], ['es-spain', 'es_to_go', 'Para llevar', true], ['es-spain', 'es_price', '¿Qué te debo?', true],
  ['ar-moroccan', 'ary_order', 'Bghit wa7d nss-nss, 3afak', true], ['ar-moroccan', 'ary_order', 'بغيت واحد قهوة', true], ['ar-moroccan', 'ary_order', 'Ma bghitch qahwa', false], ['ar-moroccan', 'ary_thanks', 'Merci, bslama', true],
  ['french', 'fr_order', 'Un allongé, s’il te plaît', true], ['french', 'fr_to_go', 'À emporter', true], ['french', 'fr_to_go', 'Pour apporter', true],
  ['japanese', 'ja_order', 'カフェラテをください', true], ['japanese', 'ja_to_go', '持ち帰りで', true],
  ['english', 'en_order', 'I’ll have a cold brew', true], ['english', 'en_price', 'What do I owe you?', true]
];
