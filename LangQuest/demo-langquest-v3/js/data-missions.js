/* LangQuest V3 — missions, intents, recall contexts.
   Phrases were written for this demo and are labelled "awaiting native review" in the app.
   Intent patterns are matched after normalisation (lower case, accents folded, punctuation removed). */
'use strict';

/* Repair intents: asking to slow down or repeat works in the target language,
   and (as a safety net) in the learner's instruction language. */
LQ.REPAIR = {
  slower: { any: ['mas despacio', 'despacio', 'mas lento', 'slower', 'slowly', 'more slowly', 'plus lentement', 'moins vite', 'b chwiya', 'bchwiya', 'شوية', 'medlennee', 'медленнее', 'yukkuri', 'ゆっくり', 'lentement'] },
  repeat: { any: ['como', 'perdona', 'perdon', 'repite', 'repetir', 'otra vez', 'again', 'repeat', 'sorry', 'pardon', 'repeter', 'quoi', 'n3am', 'عاود', '3awed', 'mou ichido', 'もう一度', 'повторите', 'what'] },
  dunno: { any: ['no entiendo', 'no comprendo', 'i dont understand', 'je ne comprends pas', 'je comprends pas', 'ma fhemtch', 'مافهمتش', 'wakaranai', 'わかりません', 'не понимаю'] }
};

LQ.MISSIONS = [
  /* ───────────── Spanish (Spain-Castilian) · Madrid ───────────── */
  {
    id: 'es-hello', kind: 'greet', track: 'es-spain', chapter: { n: 1, en: 'Lavapiés mornings', fr: 'Matins à Lavapiés' }, minutes: 4,
    title: { en: 'Say hello at La Corrala', fr: 'Dire bonjour à La Corrala' }, scene: 'madrid-cafe', character: 'lucia', status: 'playable',
    skills: ['greet_politely', 'introduce_self', 'respond_unexpected', 'thank_and_close'],
    outcome: { en: 'Greet Lucía, say your name and where you’re from.', fr: 'Saluer Lucía, dire ton nom et d’où tu viens.' },
    focus: { en: 'Greetings and introductions', fr: 'Salutations et présentations' },
    context: {
      setup: { en: 'Your first morning in Lavapiés. You step into Café La Corrala, two doors from your rental.', fr: 'Ton premier matin à Lavapiés. Tu entres au Café La Corrala, à deux portes de ta location.' },
      line: { t: '¡Hola! ¿Qué tal?', m: { en: 'Hi! How’s it going?', fr: 'Salut ! Ça va ?' } },
      question: { en: 'What is Lucía doing?', fr: 'Que fait Lucía ?' },
      options: [{ icon: 'wave', m: { en: 'Greeting you', fr: 'Elle te salue' }, ok: true }, { icon: 'coin', m: { en: 'Asking you to pay', fr: 'Elle te demande de payer' } }, { icon: 'cup', m: { en: 'Taking your order', fr: 'Elle prend ta commande' } }],
      after: { en: '¿Qué tal? is the everyday “how’s it going?” in Spain.', fr: '¿Qué tal? est le « ça va ? » de tous les jours en Espagne.' }
    },
    expressions: [
      { id: 'es-hola-que-tal', t: '¡Hola! ¿Qué tal?', m: { en: 'Hi! How’s it going?', fr: 'Salut ! Ça va ?' } },
      { id: 'es-muy-bien', t: 'Muy bien, ¿y tú?', m: { en: 'Very well, and you?', fr: 'Très bien, et toi ?' } },
      { id: 'es-me-llamo', t: 'Me llamo {name}.', m: { en: 'My name is {name}.', fr: 'Je m’appelle {name}.' } },
      { id: 'es-mucho-gusto', t: 'Mucho gusto.', m: { en: 'Nice to meet you.', fr: 'Enchanté·e.' }, note: { en: 'Works for everyone; encantado / encantada changes with gender.', fr: 'Convient à tout le monde ; encantado / encantada varie selon le genre.' } }
    ],
    anticipate: [
      { prompt: { en: 'Lucía says ¡Hola! ¿Qué tal? Answer that you’re very well, and ask her back.', fr: 'Lucía dit ¡Hola! ¿Qué tal? Réponds que ça va très bien, et retourne-lui la question.' }, expr: 'es-muy-bien' },
      { prompt: { en: 'Tell her your name.', fr: 'Dis-lui ton nom.' }, expr: 'es-me-llamo' },
      { prompt: { en: 'Say it’s nice to meet her.', fr: 'Dis que tu es enchanté·e.' }, expr: 'es-mucho-gusto' }
    ],
    roleplay: {
      start: 't1', turns: {
        t1: { say: { t: '¡Hola! ¿Qué tal?', m: { en: 'Hi! How’s it going?', fr: 'Salut ! Ça va ?' } }, hint: { en: 'Say you’re well: “Muy bien, ¿y tú?”', fr: 'Dis que ça va : « Muy bien, ¿y tú? »' }, suggest: ['Muy bien, ¿y tú?', 'Bien, gracias.'],
          expect: [{ intent: 'es_fine', skill: 'greet_politely', next: 't2', reply: { t: '¡Muy bien también!', m: { en: 'Very well too!', fr: 'Très bien aussi !' } } }] },
        t2: { say: { t: 'No te había visto antes. ¿Cómo te llamas?', m: { en: 'I hadn’t seen you before. What’s your name?', fr: 'Je ne t’avais jamais vu·e. Comment tu t’appelles ?' } }, hint: { en: 'Me llamo… / Soy…', fr: 'Me llamo… / Soy…' }, suggest: ['Me llamo {name}.', 'Soy {name}.'],
          expect: [{ intent: 'es_name', skill: 'introduce_self', next: 't3', reply: { t: '¡Mucho gusto, {name}! Yo soy Lucía.', m: { en: 'Nice to meet you, {name}! I’m Lucía.', fr: 'Enchantée, {name} ! Moi, c’est Lucía.' } } }] },
        t3: { say: { t: '¿Y de dónde eres?', m: { en: 'And where are you from?', fr: 'Et tu viens d’où ?' } }, unexpected: true, hint: { en: 'Soy de… (I’m from…)', fr: 'Soy de… (Je viens de…)' }, suggest: ['Soy de Montreal.', 'Soy de Canadá.'],
          expect: [{ intent: 'es_from', skill: 'respond_unexpected', next: 't4', reply: { t: '¡Qué bien! Te va a encantar el barrio.', m: { en: 'How nice! You’re going to love the neighbourhood.', fr: 'Super ! Tu vas adorer le quartier.' } } }] },
        t4: { say: { t: 'Bueno, ¡que tengas un buen día!', m: { en: 'Well, have a good day!', fr: 'Bon, bonne journée !' } }, hint: { en: '“Gracias, ¡hasta luego!”', fr: '« Gracias, ¡hasta luego! »' }, suggest: ['Gracias, ¡hasta luego!'],
          expect: [{ intent: 'es_thanks_bye', skill: 'thank_and_close', next: null, reply: { t: '¡Hasta luego!', m: { en: 'See you later!', fr: 'À plus tard !' } } }] }
      }
    },
    recall: {
      'es-hola-que-tal': { scene: 'madrid-plaza', character: 'carmen', line: { t: '¡Buenos días!', m: { en: 'Good morning!', fr: 'Bonjour !' } }, task: { en: 'Carmen the florist waves across the plaza. Say hi and ask how it’s going.', fr: 'Carmen, la fleuriste, te fait signe. Salue-la et demande-lui comment ça va.' } },
      'es-muy-bien': { scene: 'madrid-plaza', character: 'carmen', line: { t: '¿Qué tal estás?', m: { en: 'How are you?', fr: 'Comment tu vas ?' } }, task: { en: 'Carmen asks how you are. Say you’re very well, and ask her back.', fr: 'Carmen te demande comment tu vas. Réponds très bien, et retourne la question.' } },
      'es-me-llamo': { scene: 'madrid-terrace', character: 'andres', line: { t: '¿A nombre de quién?', m: { en: 'Under what name?', fr: 'À quel nom ?' } }, task: { en: 'Andrés is writing down a table reservation. Tell him your name.', fr: 'Andrés note une réservation. Dis-lui ton nom.' } },
      'es-mucho-gusto': { scene: 'madrid-plaza', character: 'carmen', line: { t: 'Soy Carmen, la de las flores.', m: { en: 'I’m Carmen, the flower lady.', fr: 'Je suis Carmen, la fleuriste.' } }, task: { en: 'Carmen introduces herself. Say it’s nice to meet her.', fr: 'Carmen se présente. Dis que tu es enchanté·e.' } }
    }
  },
  {
    id: 'es-cafe', kind: 'order', track: 'es-spain', chapter: { n: 1, en: 'Lavapiés mornings', fr: 'Matins à Lavapiés' }, minutes: 7, flagship: true,
    title: { en: 'Order a café con leche', fr: 'Commander un café con leche' }, scene: 'madrid-cafe', character: 'lucia', status: 'playable',
    skills: ['greet_politely', 'request_item', 'choose_option', 'respond_unexpected', 'ask_price', 'thank_and_close'],
    outcome: { en: 'Order your coffee your way, handle a surprise question, ask the price and pay.', fr: 'Commander ton café à ta façon, gérer une question imprévue, demander le prix et payer.' },
    focus: { en: 'Polite requests, either/or answers, prices', fr: 'Demandes polies, choix, prix' },
    context: {
      setup: { en: 'Café La Corrala, Lavapiés. Friday, 9:10 a.m. The espresso machine hisses and Lucía looks up from the counter.', fr: 'Café La Corrala, Lavapiés. Vendredi, 9 h 10. La machine à espresso siffle et Lucía lève les yeux du comptoir.' },
      line: { t: '¡Buenos días! ¿Qué te pongo?', m: { en: 'Good morning! What can I get you?', fr: 'Bonjour ! Qu’est-ce que je te sers ?' } },
      question: { en: 'What is Lucía asking you?', fr: 'Que te demande Lucía ?' },
      options: [{ icon: 'cup', m: { en: 'What you’d like to order', fr: 'Ce que tu veux commander' }, ok: true }, { icon: 'pin', m: { en: 'Where you’re from', fr: 'D’où tu viens' } }, { icon: 'clock', m: { en: 'How long you’re staying', fr: 'Combien de temps tu restes' } }],
      after: { en: '¿Qué te pongo? (literally “what do I put you?”) is the everyday café question in Spain.', fr: '¿Qué te pongo? (littéralement « qu’est-ce que je te mets ? ») est la question de comptoir typique en Espagne.' }
    },
    expressions: [
      { id: 'es-buenos-dias', t: 'Buenos días.', m: { en: 'Good morning.', fr: 'Bonjour (le matin).' }, note: { en: 'Said until lunchtime, around 2 p.m. in Spain.', fr: 'On le dit jusqu’au déjeuner, vers 14 h en Espagne.' } },
      { id: 'es-cafe-con-leche', t: 'Un café con leche, por favor.', m: { en: 'A coffee with milk, please.', fr: 'Un café au lait, s’il te plaît.' }, note: { en: 'Half espresso, half hot milk: Madrid’s default morning coffee.', fr: 'Moitié espresso, moitié lait chaud : le café du matin à Madrid.' },
        words: [['Un', { en: 'a', fr: 'un' }], ['café', { en: 'coffee', fr: 'café' }], ['con', { en: 'with', fr: 'avec' }], ['leche', { en: 'milk', fr: 'lait' }], ['por favor', { en: 'please', fr: 's’il te plaît' }]] },
      { id: 'es-para-aqui', t: 'Para tomar aquí.', m: { en: 'For here.', fr: 'Sur place.' }, note: { en: 'To go is “para llevar”.', fr: 'À emporter se dit « para llevar ».' } },
      { id: 'es-cuanto-es', t: '¿Cuánto es?', m: { en: 'How much is it?', fr: 'C’est combien ?' } }
    ],
    anticipate: [
      { prompt: { en: 'Lucía asks what you’d like. Ask politely for a coffee with milk.', fr: 'Lucía te demande ce que tu veux. Demande poliment un café au lait.' }, expr: 'es-cafe-con-leche' },
      { prompt: { en: 'She asks if it’s for here. Say you’ll drink it here.', fr: 'Elle demande si c’est sur place. Dis que tu le bois ici.' }, expr: 'es-para-aqui' },
      { prompt: { en: 'You’re ready to pay. Ask how much it is.', fr: 'Tu es prêt·e à payer. Demande combien c’est.' }, expr: 'es-cuanto-es' },
      { prompt: { en: 'From memory now: say good morning, then order your coffee.', fr: 'De mémoire : dis bonjour, puis commande ton café.' }, graduated: true, model: { t: 'Buenos días. Un café con leche, por favor.', m: { en: 'Good morning. A coffee with milk, please.', fr: 'Bonjour. Un café au lait, s’il te plaît.' } }, ids: ['es-buenos-dias', 'es-cafe-con-leche'] }
    ],
    roleplay: {
      start: 't1', turns: {
        t1: { say: { t: '¡Buenos días! ¿Qué te pongo?', m: { en: 'Good morning! What can I get you?', fr: 'Bonjour ! Qu’est-ce que je te sers ?' } },
          clarify: { t: 'Perdona, no te he entendido. ¿Qué te pongo?', m: { en: 'Sorry, I didn’t catch that. What can I get you?', fr: 'Pardon, je n’ai pas compris. Qu’est-ce que je te sers ?' } },
          hint: { en: 'Ask for “un café con leche” and add “por favor”.', fr: 'Demande « un café con leche » et ajoute « por favor ».' }, suggest: ['Un café con leche, por favor.', 'Me pones un cortado, por favor.', '¿Tenéis leche de avena?'],
          also: [{ intent: 'es_greet_only', skill: 'greet_politely' }],
          expect: [
            { intent: 'es_oat', skill: 'request_item', next: 't1b', reply: { t: 'Sí, tenemos de avena y de soja.', m: { en: 'Yes, we have oat and soy.', fr: 'Oui, on a avoine et soja.' } }, partial: true },
            { intent: 'es_order_coffee', skill: 'request_item', next: 't2', reply: { t: '¡Marchando!', m: { en: 'Coming right up!', fr: 'Ça arrive !' } } },
            { intent: 'es_greet_only', skill: 'greet_politely', next: 't1', reply: { t: '¡Buenos días! Dime, ¿qué te pongo?', m: { en: 'Good morning! Tell me, what can I get you?', fr: 'Bonjour ! Dis-moi, qu’est-ce que je te sers ?' } }, stay: true }
          ] },
        t1b: { say: { t: '¿Te lo pongo con avena?', m: { en: 'Shall I make it with oat milk?', fr: 'Je te le fais au lait d’avoine ?' } }, hint: { en: 'Say yes: “Sí, por favor.”', fr: 'Dis oui : « Sí, por favor. »' }, suggest: ['Sí, por favor.', 'No, con leche normal.'],
          expect: [
            { intent: 'es_no', skill: 'choose_option', next: 't2', set: { milk: 'regular' }, reply: { t: 'Vale, con leche normal.', m: { en: 'OK, regular milk.', fr: 'D’accord, lait normal.' } } },
            { intent: 'es_yes', skill: 'choose_option', next: 't2', set: { milk: 'oat' }, reply: { t: 'Perfecto, un café con leche de avena.', m: { en: 'Perfect, a coffee with oat milk.', fr: 'Parfait, un café au lait d’avoine.' } } }
          ] },
        t2: { say: { t: '¿Para tomar aquí o para llevar?', m: { en: 'For here or to go?', fr: 'Sur place ou à emporter ?' } },
          clarify: { t: 'Perdona, ¿aquí o para llevar?', m: { en: 'Sorry, here or to go?', fr: 'Pardon, ici ou à emporter ?' } },
          hint: { en: 'Choose: “para tomar aquí” or “para llevar”.', fr: 'Choisis : « para tomar aquí » ou « para llevar ».' }, suggest: ['Para tomar aquí.', 'Para llevar, por favor.'],
          expect: [
            { intent: 'es_to_go', skill: 'choose_option', next: 't3', set: { where: 'to-go' }, reply: { t: 'Vale, te lo pongo para llevar.', m: { en: 'OK, I’ll make it to go.', fr: 'D’accord, je te le prépare à emporter.' } } },
            { intent: 'es_here', skill: 'choose_option', next: 't3', set: { where: 'here' }, reply: { t: 'Pues siéntate donde quieras, ahora te lo llevo.', m: { en: 'Sit wherever you like, I’ll bring it over.', fr: 'Assieds-toi où tu veux, je te l’apporte.' } } }
          ] },
        t3: { say: { t: '¿Quieres algo de comer? Hoy tenemos tostada con tomate y cruasanes.', m: { en: 'Anything to eat? Today we have toast with tomato, and croissants.', fr: 'Tu veux manger quelque chose ? Aujourd’hui on a des tartines à la tomate et des croissants.' } }, unexpected: true,
          clarify: { t: 'Digo que si quieres algo de comer.', m: { en: 'I’m asking if you want something to eat.', fr: 'Je demande si tu veux manger quelque chose.' } },
          hint: { en: 'Say “No, gracias” or ask for “una tostada”.', fr: 'Dis « No, gracias » ou demande « una tostada ».' }, suggest: ['No, gracias.', 'Una tostada, por favor.', 'Un cruasán.'],
          expect: [
            { intent: 'es_toast', skill: 'respond_unexpected', next: 't4', set: { food: 'toast' }, reply: { t: 'Una tostada con tomate, perfecto.', m: { en: 'Toast with tomato, perfect.', fr: 'Une tartine à la tomate, parfait.' } } },
            { intent: 'es_croissant', skill: 'respond_unexpected', next: 't4', set: { food: 'croissant' }, reply: { t: 'Un cruasán, ahora mismo.', m: { en: 'One croissant, right away.', fr: 'Un croissant, tout de suite.' } } },
            { intent: 'es_no', skill: 'respond_unexpected', next: 't4', set: { food: 'none' }, reply: { t: 'Muy bien.', m: { en: 'Very good.', fr: 'Très bien.' } } }
          ] },
        t4: { say: { t: 'Aquí tienes.', m: { en: 'Here you go.', fr: 'Voilà.' } }, hint: { en: 'Ask the price: “¿Cuánto es?”', fr: 'Demande le prix : « ¿Cuánto es? »' }, suggest: ['¿Cuánto es?', '¿Qué te debo?'],
          clarify: { t: '¿Necesitas algo más?', m: { en: 'Do you need anything else?', fr: 'Il te faut autre chose ?' } },
          expect: [
            { intent: 'es_price', skill: 'ask_price', next: 't5', reply: v => ({ t: 'Son ' + LQ.esPrice(v).words + '.', m: { en: 'That’s ' + LQ.esPrice(v).num + '.', fr: 'Ça fait ' + LQ.esPrice(v).numFr + '.' } }) },
            { intent: 'es_thanks_bye', skill: 'thank_and_close', next: 't5', reply: v => ({ t: '¡De nada! Son ' + LQ.esPrice(v).words + '.', m: { en: 'You’re welcome! That’s ' + LQ.esPrice(v).num + '.', fr: 'De rien ! Ça fait ' + LQ.esPrice(v).numFr + '.' } }), note: 'thanked-before-price' }
          ] },
        t5: { say: null, hint: { en: 'Pay and thank her: “Gracias, ¡hasta luego!”', fr: 'Paie et remercie-la : « Gracias, ¡hasta luego! »' }, suggest: ['Gracias, ¡hasta luego!', 'Muchas gracias.'],
          expect: [{ intent: 'es_thanks_bye', skill: 'thank_and_close', next: null, reply: { t: '¡A ti! Que tengas un buen día.', m: { en: 'Thank you! Have a good day.', fr: 'Merci à toi ! Bonne journée.' } } }] }
      }
    },
    recall: {
      'es-cafe-con-leche': { scene: 'madrid-terrace', character: 'andres', line: { t: 'Buenas, ¿qué le pongo?', m: { en: 'Hello, what can I get you? (formal)', fr: 'Bonjour, qu’est-ce que je vous sers ? (vouvoiement)' } }, task: { en: 'A terrace near El Retiro. Andrés uses the formal usted. Order a coffee with milk.', fr: 'Une terrasse près du Retiro. Andrés vouvoie. Commande un café au lait.' } },
      'es-para-aqui': { scene: 'madrid-plaza', character: 'carmen', line: { t: '¿Es para llevar?', m: { en: 'Is it to go?', fr: 'C’est à emporter ?' } }, task: { en: 'A churros stand on the plaza. Say you’ll eat here.', fr: 'Un stand de churros sur la place. Dis que tu manges sur place.' } },
      'es-cuanto-es': { scene: 'madrid-plaza', character: 'carmen', line: { t: 'Aquí tienes tus flores.', m: { en: 'Here are your flowers.', fr: 'Voici tes fleurs.' } }, task: { en: 'You’re buying flowers from Carmen. Ask how much they are.', fr: 'Tu achètes des fleurs à Carmen. Demande combien elles coûtent.' } },
      'es-buenos-dias': { scene: 'madrid-terrace', character: 'andres', line: { t: '¡Buenos días!', m: { en: 'Good morning!', fr: 'Bonjour !' } }, task: { en: 'Andrés greets you at 10 a.m. Greet him back.', fr: 'Andrés te salue à 10 h. Réponds-lui.' } }
    }
  },
  {
    id: 'es-metro', kind: 'way', track: 'es-spain', chapter: { n: 2, en: 'Getting around', fr: 'Se déplacer' }, minutes: 8,
    title: { en: 'Find the metro at Tirso de Molina', fr: 'Trouver le métro à Tirso de Molina' }, scene: 'madrid-plaza', character: 'carmen', status: 'playable',
    skills: ['ask_directions', 'repair_misunderstanding', 'confirm_understanding', 'thank_and_close'],
    outcome: { en: 'Ask the way, get a fast speaker to slow down, and check the directions back.', fr: 'Demander le chemin, faire ralentir quelqu’un qui parle vite, et vérifier les indications.' },
    focus: { en: 'Directions and asking for slower speech', fr: 'Indications et faire ralentir' },
    context: {
      setup: { en: 'Plaza de Tirso de Molina. Flower stalls line the square. You need the metro to get to Sol.', fr: 'Place Tirso de Molina. Les stands de fleurs bordent la place. Tu dois prendre le métro pour Sol.' },
      line: { t: '¿Te puedo ayudar?', m: { en: 'Can I help you?', fr: 'Je peux t’aider ?' } },
      question: { en: 'What is Carmen offering?', fr: 'Que propose Carmen ?' },
      options: [{ icon: 'hand', m: { en: 'To help you', fr: 'De t’aider' }, ok: true }, { icon: 'flower', m: { en: 'Flowers on sale', fr: 'Des fleurs en promo' } }, { icon: 'clock', m: { en: 'The time', fr: 'L’heure' } }]
    },
    expressions: [
      { id: 'es-donde-metro', t: 'Perdona, ¿dónde está el metro?', m: { en: 'Excuse me, where is the metro?', fr: 'Pardon, où est le métro ?' } },
      { id: 'es-mas-despacio', t: '¿Puedes repetir más despacio, por favor?', m: { en: 'Can you repeat that more slowly, please?', fr: 'Tu peux répéter plus lentement, s’il te plaît ?' }, note: { en: 'The most useful sentence in any language.', fr: 'La phrase la plus utile, dans toutes les langues.' } },
      { id: 'es-todo-recto', t: '¿Todo recto y a la izquierda?', m: { en: 'Straight ahead and to the left?', fr: 'Tout droit puis à gauche ?' } },
      { id: 'es-muchas-gracias', t: '¡Muchas gracias!', m: { en: 'Thank you very much!', fr: 'Merci beaucoup !' } }
    ],
    anticipate: [
      { prompt: { en: 'Ask Carmen where the metro is.', fr: 'Demande à Carmen où est le métro.' }, expr: 'es-donde-metro' },
      { prompt: { en: 'She answers far too fast. Ask her to repeat more slowly.', fr: 'Elle répond beaucoup trop vite. Demande-lui de répéter plus lentement.' }, expr: 'es-mas-despacio' },
      { prompt: { en: 'Check what you understood: straight ahead and to the left?', fr: 'Vérifie ce que tu as compris : tout droit puis à gauche ?' }, expr: 'es-todo-recto' }
    ],
    roleplay: {
      start: 't1', turns: {
        t1: { say: { t: '¿Te puedo ayudar?', m: { en: 'Can I help you?', fr: 'Je peux t’aider ?' } }, hint: { en: 'Ask: “¿Dónde está el metro?”', fr: 'Demande : « ¿Dónde está el metro? »' }, suggest: ['Perdona, ¿dónde está el metro?', 'Busco el metro.'],
          clarify: { t: 'Perdona, ¿qué buscas?', m: { en: 'Sorry, what are you looking for?', fr: 'Pardon, tu cherches quoi ?' } },
          expect: [{ intent: 'es_where_metro', skill: 'ask_directions', next: 't2', reply: null }] },
        t2: { say: { t: 'Sí, claro. Mira, cruzas la plaza, sigues todo recto unos cincuenta metros y la entrada está a la izquierda, justo al lado del quiosco.', m: { en: 'Sure. Look, you cross the plaza, keep going straight about fifty metres, and the entrance is on the left, right next to the kiosk.', fr: 'Bien sûr. Regarde, tu traverses la place, tu continues tout droit une cinquantaine de mètres et l’entrée est à gauche, juste à côté du kiosque.' } }, fast: true, hideText: true,
          hint: { en: 'Too fast? Ask: “¿Puedes repetir más despacio?”', fr: 'Trop rapide ? Demande : « ¿Puedes repetir más despacio? »' }, suggest: ['¿Puedes repetir más despacio, por favor?', '¿Está lejos?', '¿Todo recto y a la izquierda?'],
          clarify: { t: 'Que está muy cerca, ¿eh?', m: { en: 'It’s really close, you know?', fr: 'C’est tout près, hein ?' } },
          repairNext: 't3',
          expect: [
            { intent: 'es_far', skill: 'ask_directions', next: 't2', stay: true, reply: { t: 'Qué va, son dos minutos andando.', m: { en: 'Not at all, it’s a two-minute walk.', fr: 'Pas du tout, c’est à deux minutes à pied.' } } },
            { intent: 'es_confirm_dir', skill: 'confirm_understanding', next: 't4', reply: { t: '¡Eso es!', m: { en: 'That’s it!', fr: 'C’est ça !' } } }
          ] },
        t3: { say: { t: 'Claro. Cruzas la plaza… todo recto… y la entrada está a la izquierda.', m: { en: 'Of course. You cross the plaza… straight ahead… and the entrance is on the left.', fr: 'Bien sûr. Tu traverses la place… tout droit… et l’entrée est à gauche.' } }, slow: true,
          hint: { en: 'Check it back: “¿Todo recto y a la izquierda?”', fr: 'Vérifie : « ¿Todo recto y a la izquierda? »' }, suggest: ['¿Todo recto y a la izquierda?', 'Vale, gracias.'],
          expect: [
            { intent: 'es_confirm_dir', skill: 'confirm_understanding', next: 't4', reply: { t: '¡Eso es!', m: { en: 'That’s it!', fr: 'C’est ça !' } } },
            { intent: 'es_thanks_bye', skill: 'thank_and_close', next: null, reply: { t: '¡De nada! ¡Buen viaje!', m: { en: 'You’re welcome! Have a good trip!', fr: 'De rien ! Bon trajet !' } } }
          ] },
        t4: { say: { t: '¿Algo más?', m: { en: 'Anything else?', fr: 'Autre chose ?' } }, hint: { en: 'Thank her: “¡Muchas gracias!”', fr: 'Remercie-la : « ¡Muchas gracias! »' }, suggest: ['No, ¡muchas gracias!'],
          expect: [{ intent: 'es_thanks_bye', skill: 'thank_and_close', next: null, reply: { t: '¡De nada! ¡Buen viaje!', m: { en: 'You’re welcome! Have a good trip!', fr: 'De rien ! Bon trajet !' } } },
            { intent: 'es_no', skill: 'thank_and_close', next: null, reply: { t: '¡Pues buen viaje!', m: { en: 'Well, have a good trip!', fr: 'Alors bon trajet !' } } }] }
      }
    },
    recall: {
      'es-mas-despacio': { scene: 'madrid-terrace', character: 'andres', line: { t: 'Tenemos tortilla, croquetas, pimientos de padrón y ensaladilla.', m: { en: 'We have tortilla, croquettes, padrón peppers and potato salad.', fr: 'On a de la tortilla, des croquettes, des pimientos de padrón et de la salade russe.' } }, task: { en: 'Andrés rattles off the menu. Ask him to repeat more slowly.', fr: 'Andrés récite le menu à toute vitesse. Demande-lui de répéter plus lentement.' } },
      'es-donde-metro': { scene: 'madrid-terrace', character: 'andres', line: { t: '¿Necesita algo más?', m: { en: 'Do you need anything else? (formal)', fr: 'Il vous faut autre chose ? (vouvoiement)' } }, task: { en: 'Leaving the terrace, ask Andrés where the metro is.', fr: 'En quittant la terrasse, demande à Andrés où est le métro.' } },
      'es-todo-recto': { scene: 'madrid-cafe', character: 'lucia', line: { t: 'La farmacia está todo recto, a la izquierda.', m: { en: 'The pharmacy is straight ahead, on the left.', fr: 'La pharmacie est tout droit, à gauche.' } }, task: { en: 'Lucía tells you where the pharmacy is. Check it back.', fr: 'Lucía t’indique la pharmacie. Vérifie ce que tu as compris.' } },
      'es-muchas-gracias': { scene: 'madrid-cafe', character: 'lucia', line: { t: 'Te he guardado el periódico.', m: { en: 'I saved the newspaper for you.', fr: 'Je t’ai gardé le journal.' } }, task: { en: 'Lucía kept the newspaper for you. Thank her warmly.', fr: 'Lucía t’a gardé le journal. Remercie-la chaleureusement.' } }
    }
  },
  { id: 'es-plans', kind: 'plans', track: 'es-spain', chapter: { n: 3, en: 'Plans with friends', fr: 'Projets entre amis' }, minutes: 8, title: { en: 'Make plans for Saturday', fr: 'Prévoir samedi' }, scene: 'madrid-terrace', character: 'lucia', status: 'preview',
    skills: ['request_item', 'respond_unexpected'], outcome: { en: 'Suggest a time and place, accept or decline an invitation.', fr: 'Proposer une heure et un lieu, accepter ou refuser une invitation.' },
    previewNote: { en: 'Script drafted in the Content Factory and waiting for native review. It becomes playable once a Castilian reviewer approves it.', fr: 'Script rédigé dans la Fabrique de contenu, en attente de relecture native. Il deviendra jouable après validation par un relecteur castillan.' } },
  {
    id: 'es-market', kind: 'shop', track: 'es-spain', chapter: { n: 3, en: 'Plans with friends', fr: 'Projets entre amis' }, minutes: 8,
    title: { en: 'Fruit at Mercado de San Fernando', fr: 'Des fruits au marché de San Fernando' }, scene: 'madrid-plaza', character: 'rafa', status: 'playable',
    skills: ['request_item', 'respond_unexpected', 'choose_option', 'ask_price', 'thank_and_close'],
    outcome: { en: 'Ask for quantities, answer “for today or the weekend?”, say you’re done and pay.', fr: 'Demander des quantités, répondre « pour aujourd’hui ou le week-end ? », dire que c’est tout et payer.' },
    focus: { en: 'Quantities, “nothing else”, prices', fr: 'Quantités, « rien d’autre », prix' },
    context: {
      setup: { en: 'Mercado de San Fernando, Saturday morning. Rafa’s fruit stall is piled with tomatoes and Valencia oranges.', fr: 'Marché de San Fernando, samedi matin. Le stand de Rafa déborde de tomates et d’oranges de Valence.' },
      line: { t: '¡Buenas! ¿Qué te pongo?', m: { en: 'Hi! What can I get you?', fr: 'Bonjour ! Qu’est-ce que je te sers ?' } },
      question: { en: 'What is Rafa asking?', fr: 'Que demande Rafa ?' },
      options: [{ icon: 'cup', m: { en: 'What you’d like', fr: 'Ce que tu veux' }, ok: true }, { icon: 'bookmark', m: { en: 'If you brought a bag', fr: 'Si tu as un sac' } }, { icon: 'clock', m: { en: 'The time', fr: 'L’heure' } }],
      after: { en: 'Market stalls ask the same “¿Qué te pongo?” as cafés: one phrase, many places.', fr: 'Les marchés posent le même « ¿Qué te pongo? » que les cafés : une phrase, plein d’endroits.' }
    },
    expressions: [
      { id: 'es-medio-kilo', t: 'Medio kilo de tomates, por favor.', m: { en: 'Half a kilo of tomatoes, please.', fr: 'Un demi-kilo de tomates, s’il te plaît.' } },
      { id: 'es-maduros', t: '¿Están maduros?', m: { en: 'Are they ripe?', fr: 'Elles sont mûres ?' } },
      { id: 'es-nada-mas', t: 'Nada más, gracias.', m: { en: 'Nothing else, thanks.', fr: 'Rien d’autre, merci.' } },
      { id: 'es-cuanto-todo', t: '¿Cuánto es todo?', m: { en: 'How much is it all?', fr: 'Ça fait combien en tout ?' } }
    ],
    anticipate: [
      { prompt: { en: 'Ask Rafa for half a kilo of tomatoes.', fr: 'Demande à Rafa un demi-kilo de tomates.' }, expr: 'es-medio-kilo' },
      { prompt: { en: 'Ask if they’re ripe.', fr: 'Demande si elles sont mûres.' }, expr: 'es-maduros' },
      { prompt: { en: 'He asks “¿Algo más?”. Say nothing else, thanks.', fr: 'Il demande « ¿Algo más? ». Dis rien d’autre, merci.' }, expr: 'es-nada-mas' },
      { prompt: { en: 'Ask how much it is altogether.', fr: 'Demande combien ça fait en tout.' }, expr: 'es-cuanto-todo' }
    ],
    roleplay: {
      start: 't1', turns: {
        t1: { say: { t: '¡Buenas! ¿Qué te pongo?', m: { en: 'Hi! What can I get you?', fr: 'Bonjour ! Qu’est-ce que je te sers ?' } }, hint: { en: 'Ask for “medio kilo de tomates” or some “naranjas”.', fr: 'Demande « medio kilo de tomates » ou des « naranjas ».' }, suggest: ['Medio kilo de tomates, por favor.', 'Un kilo de naranjas.', '¿Están maduros los tomates?'],
          clarify: { t: 'Perdona, ¿qué te pongo?', m: { en: 'Sorry, what can I get you?', fr: 'Pardon, je te sers quoi ?' } },
          expect: [
            { intent: 'es_ripe', skill: 'respond_unexpected', next: 't1', stay: true, reply: { t: 'Sí, son de hoy. ¿Cuántos te pongo?', m: { en: 'Yes, picked today. How many would you like?', fr: 'Oui, du jour. Je t’en mets combien ?' } } },
            { intent: 'es_oranges', skill: 'request_item', next: 't2', set: { item: 'oranges' }, reply: { t: 'Las naranjas de Valencia están buenísimas.', m: { en: 'The Valencia oranges are excellent.', fr: 'Les oranges de Valence sont excellentes.' } } },
            { intent: 'es_tomatoes', skill: 'request_item', next: 't2', set: { item: 'tomatoes' }, reply: { t: 'Medio kilo, marchando.', m: { en: 'Half a kilo, coming up.', fr: 'Un demi-kilo, ça arrive.' } } }
          ] },
        t2: { say: { t: '¿Son para hoy o para el fin de semana?', m: { en: 'Are they for today or for the weekend?', fr: 'C’est pour aujourd’hui ou pour le week-end ?' } }, unexpected: true, hint: { en: 'Say “para hoy” or “para el fin de semana”.', fr: 'Dis « para hoy » ou « para el fin de semana ».' }, suggest: ['Para hoy.', 'Para el fin de semana.'],
          clarify: { t: 'Que si son para hoy o para el fin de semana.', m: { en: 'I mean: are they for today or for the weekend?', fr: 'Je veux dire : pour aujourd’hui ou pour le week-end ?' } },
          expect: [
            { intent: 'es_weekend', skill: 'choose_option', next: 't3', set: { when: 'weekend' }, reply: { t: 'Entonces te los pongo un poco más verdes.', m: { en: 'Then I’ll give you slightly greener ones.', fr: 'Alors je te les mets un peu plus verts.' } } },
            { intent: 'es_today', skill: 'choose_option', next: 't3', set: { when: 'today' }, reply: { t: 'Pues te pongo los más maduros.', m: { en: 'Then I’ll give you the ripest ones.', fr: 'Alors je te mets les plus mûrs.' } } }
          ] },
        t3: { say: { t: '¿Algo más?', m: { en: 'Anything else?', fr: 'Autre chose ?' } }, hint: { en: '“Nada más, gracias.” Or add a lemon: “y un limón”.', fr: '« Nada más, gracias. » Ou ajoute un citron : « y un limón ».' }, suggest: ['Nada más, gracias.', 'Y un limón, por favor.'],
          expect: [
            { intent: 'es_more', skill: 'request_item', next: 't3', stay: true, set: { lemon: true }, reply: { t: 'Un limón… ¡ese te lo regalo!', m: { en: 'A lemon… that one’s on the house!', fr: 'Un citron… celui-là, c’est cadeau !' } } },
            { intent: 'es_nothing_else', skill: 'thank_and_close', next: 't4', reply: { t: 'Muy bien.', m: { en: 'Very good.', fr: 'Très bien.' } } }
          ] },
        t4: { say: { t: 'Aquí tienes.', m: { en: 'Here you go.', fr: 'Voilà.' } }, hint: { en: 'Ask: “¿Cuánto es todo?”', fr: 'Demande : « ¿Cuánto es todo? »' }, suggest: ['¿Cuánto es todo?'],
          expect: [{ intent: 'es_price', skill: 'ask_price', next: 't5', reply: v => v.item === 'oranges' ? { t: 'Son dos euros.', m: { en: 'That’s two euros.', fr: 'Ça fait deux euros.' } } : { t: 'Son un euro con cincuenta.', m: { en: 'That’s one euro fifty.', fr: 'Ça fait un euro cinquante.' } } }] },
        t5: { say: null, hint: { en: '“Gracias, ¡hasta el sábado!”', fr: '« Gracias, ¡hasta el sábado! »' }, suggest: ['Gracias, ¡hasta el sábado!'],
          expect: [{ intent: 'es_thanks_bye', skill: 'thank_and_close', next: null, reply: { t: '¡A ti! ¡Hasta el sábado!', m: { en: 'Thank you! See you Saturday!', fr: 'Merci à toi ! À samedi !' } } }] }
      }
    },
    recall: {
      'es-medio-kilo': { scene: 'madrid-cafe', character: 'lucia', line: { t: 'Hoy hago gazpacho. ¿Me traes tomates?', m: { en: 'I’m making gazpacho today. Will you bring me tomatoes?', fr: 'Je fais un gaspacho aujourd’hui. Tu m’apportes des tomates ?' } }, task: { en: 'Lucía sends you to the market. Ask a vendor for half a kilo of tomatoes.', fr: 'Lucía t’envoie au marché. Demande un demi-kilo de tomates.' } },
      'es-maduros': { scene: 'madrid-plaza', character: 'carmen', line: { t: 'Mira qué melocotones.', m: { en: 'Look at these peaches.', fr: 'Regarde ces pêches.' } }, task: { en: 'A neighbour shows you peaches. Ask if they’re ripe.', fr: 'Une voisine te montre des pêches. Demande si elles sont mûres.' } },
      'es-nada-mas': { scene: 'madrid-cafe', character: 'lucia', line: { t: '¿Algo más?', m: { en: 'Anything else?', fr: 'Autre chose ?' } }, task: { en: 'Lucía asks if you want anything else. Say nothing else, thanks.', fr: 'Lucía demande si tu veux autre chose. Dis rien d’autre, merci.' } },
      'es-cuanto-todo': { scene: 'madrid-terrace', character: 'andres', line: { t: 'Dos cañas y una de bravas.', m: { en: 'Two small beers and a plate of patatas bravas.', fr: 'Deux demis et une portion de patatas bravas.' } }, task: { en: 'On the terrace, ask Andrés how much it is altogether.', fr: 'En terrasse, demande à Andrés combien ça fait en tout.' } }
    }
  },

  /* ───────────── Arabic (Moroccan) · Casablanca · taught from French ───────────── */
  {
    id: 'ary-cafe', kind: 'order', track: 'ar-moroccan', chapter: { n: 1, en: 'Maârif mornings', fr: 'Matins au Maârif' }, minutes: 7, flagship: true,
    title: { en: 'Order a nss-nss in Maârif', fr: 'Commander un nss-nss au Maârif' }, scene: 'casablanca-cafe', character: 'youssef', status: 'playable',
    skills: ['greet_politely', 'request_item', 'respond_unexpected', 'ask_price', 'thank_and_close'],
    outcome: { en: 'Answer “labas?”, order your coffee, handle a question and pay.', fr: 'Répondre à « labas ? », commander ton café, gérer une question et payer.' },
    focus: { en: 'Greetings, requests, prices in dirhams', fr: 'Salutations, demandes, prix en dirhams' },
    context: {
      setup: { fr: 'Maârif, Casablanca. Fin de matinée. Les chaises de la terrasse du Café Zahra font face à la rue. Youssef essuie le comptoir.', en: 'Maârif, Casablanca. Late morning. The terrace chairs at Café Zahra face the street. Youssef is wiping the counter.' },
      line: { t: 'السلام! لاباس؟', r: 'Salam! Labas?', m: { fr: 'Salut ! Ça va ?', en: 'Hi! How are you?' } },
      question: { fr: 'Que dit Youssef ?', en: 'What does Youssef say?' },
      options: [{ icon: 'wave', m: { fr: 'Il te salue et demande si ça va', en: 'He greets you and asks how you are' }, ok: true }, { icon: 'coin', m: { fr: 'Il demande l’addition', en: 'He asks for the bill' } }, { icon: 'door', m: { fr: 'Il annonce que c’est fermé', en: 'He says it’s closed' } }],
      after: { fr: '« Labas ? » veut dire « ça va ? ». On répond souvent « labas, l-hamdulillah ».', en: '“Labas?” means “how are you?”. People often answer “labas, l-hamdulillah”.' }
    },
    expressions: [
      { id: 'ary-labas', t: 'لاباس، الحمد لله.', r: 'Labas, l-hamdulillah.', m: { fr: 'Ça va, Dieu merci.', en: 'I’m fine, thank God.' }, note: { fr: 'Formule de politesse courante, utilisée par tout le monde.', en: 'An everyday courtesy phrase, used by everyone.' } },
      { id: 'ary-bghit-nss', t: 'بغيت واحد نص نص، عافاك.', r: 'Bghit wa7d nss-nss, 3afak.', m: { fr: 'Je voudrais un nss-nss, s’il te plaît.', en: 'I’d like a nss-nss, please.' }, note: { fr: 'Nss-nss (« moitié-moitié ») : moitié café, moitié lait chaud.', en: 'Nss-nss (“half-half”): half coffee, half hot milk.' },
        words: [['بغيت / bghit', { fr: 'je veux', en: 'I want' }], ['واحد / wa7d', { fr: 'un', en: 'one' }], ['نص نص / nss-nss', { fr: 'moitié-moitié', en: 'half-half' }], ['عافاك / 3afak', { fr: 's’il te plaît', en: 'please' }]] },
      { id: 'ary-bch7al', t: 'بشحال؟', r: 'Bch7al?', m: { fr: 'C’est combien ?', en: 'How much?' } },
      { id: 'ary-chokran', t: 'شكرا بزاف.', r: 'Chokran bzzaf.', m: { fr: 'Merci beaucoup.', en: 'Thank you very much.' }, note: { fr: '« Merci » s’entend aussi souvent : le mélange darija–français est naturel à Casablanca.', en: '“Merci” is common too: mixing Darija and French is natural in Casablanca.' } }
    ],
    anticipate: [
      { prompt: { fr: 'Youssef te demande « labas ? ». Réponds que ça va.', en: 'Youssef asks “labas?”. Say you’re fine.' }, expr: 'ary-labas' },
      { prompt: { fr: 'Commande poliment un nss-nss.', en: 'Politely order a nss-nss.' }, expr: 'ary-bghit-nss' },
      { prompt: { fr: 'Demande combien ça coûte.', en: 'Ask how much it is.' }, expr: 'ary-bch7al' },
      { prompt: { fr: 'De mémoire : remercie Youssef chaleureusement.', en: 'From memory: thank Youssef warmly.' }, expr: 'ary-chokran', graduated: true }
    ],
    roleplay: {
      start: 't1', turns: {
        t1: { say: { t: 'السلام! لاباس؟', r: 'Salam! Labas?', m: { fr: 'Salut ! Ça va ?', en: 'Hi! How are you?' } }, hint: { fr: 'Réponds : « Labas, l-hamdulillah. »', en: 'Answer: “Labas, l-hamdulillah.”' }, suggest: ['Labas, l-hamdulillah.', 'Salam, labas.'],
          clarify: { t: 'لاباس عليك؟', r: 'Labas 3lik?', m: { fr: 'Tout va bien pour toi ?', en: 'All good with you?' } },
          expect: [{ intent: 'ary_fine', skill: 'greet_politely', next: 't2', reply: null }] },
        t2: { say: { t: 'الحمد لله. آش بغيتي؟', r: 'L-hamdulillah. Ach bghiti?', m: { fr: 'Tant mieux. Qu’est-ce que tu veux ?', en: 'Good. What would you like?' } }, hint: { fr: 'Commande : « Bghit wa7d nss-nss, 3afak. »', en: 'Order: “Bghit wa7d nss-nss, 3afak.”' }, suggest: ['Bghit wa7d nss-nss, 3afak.', 'Wa7d atay, 3afak.'],
          clarify: { t: 'سمح ليا، آش بغيتي؟', r: 'Sme7 lia, ach bghiti?', m: { fr: 'Pardon, tu veux quoi ?', en: 'Sorry, what would you like?' } },
          expect: [
            { intent: 'ary_tea', skill: 'request_item', next: 't2b', set: { drink: 'tea' }, reply: { t: 'أتاي بالنعناع؟', r: 'Atay b n3na3?', m: { fr: 'Du thé à la menthe ?', en: 'Mint tea?' } } },
            { intent: 'ary_order', skill: 'request_item', next: 't3', set: { drink: 'nss' }, reply: { t: 'واخا.', r: 'Wakha.', m: { fr: 'D’accord.', en: 'OK.' } } }
          ] },
        t2b: { say: null, hint: { fr: 'Dis oui : « Iyeh, 3afak. »', en: 'Say yes: “Iyeh, 3afak.”' }, suggest: ['Iyeh, 3afak.', 'Wakha.'],
          expect: [{ intent: 'ary_yes', skill: 'choose_option', next: 't3', reply: { t: 'واخا.', r: 'Wakha.', m: { fr: 'D’accord.', en: 'OK.' } } }] },
        t3: { say: { t: 'بغيتي شي حاجة معاه؟', r: 'Bghiti chi 7aja m3ah?', m: { fr: 'Tu veux quelque chose avec ?', en: 'Do you want something with it?' } }, unexpected: true,
          hint: { fr: 'Dis « la, chokran » ou demande un msemmen.', en: 'Say “la, chokran” or ask for a msemmen.' }, suggest: ['La, chokran.', 'Wa7d msemmen, 3afak.'],
          clarify: { t: 'شي مسمن؟ شي بغرير؟', r: 'Chi msemmen? Chi baghrir?', m: { fr: 'Un msemmen ? Un baghrir ?', en: 'A msemmen? A baghrir?' } },
          expect: [
            { intent: 'ary_msemmen', skill: 'respond_unexpected', next: 't4', set: { food: 'msemmen' }, reply: { t: 'مسمن سخون، دابا.', r: 'Msemmen skhoun, daba.', m: { fr: 'Un msemmen bien chaud, tout de suite.', en: 'A hot msemmen, right away.' } } },
            { intent: 'ary_baghrir', skill: 'respond_unexpected', next: 't4', set: { food: 'baghrir' }, reply: { t: 'بغرير، دابا.', r: 'Baghrir, daba.', m: { fr: 'Un baghrir, tout de suite.', en: 'A baghrir, right away.' } } },
            { intent: 'ary_no', skill: 'respond_unexpected', next: 't4', set: { food: 'none' }, reply: { t: 'مزيان.', r: 'Mzyan.', m: { fr: 'Très bien.', en: 'Fine.' } } }
          ] },
        t4: { say: { t: 'تفضل.', r: 'Tfeddel.', m: { fr: 'Voilà, je t’en prie.', en: 'Here you go.' } }, hint: { fr: 'Demande le prix : « Bch7al? »', en: 'Ask the price: “Bch7al?”' }, suggest: ['Bch7al?', 'Bch7al, 3afak?'],
          expect: [{ intent: 'ary_price', skill: 'ask_price', next: 't5', reply: v => (v.food && v.food !== 'none') ? { t: 'تمنطاش الدرهم.', r: 'Tmentach l-dirham.', m: { fr: 'Dix-huit dirhams.', en: 'Eighteen dirhams.' } } : { t: 'طناش الدرهم.', r: 'Tnach l-dirham.', m: { fr: 'Douze dirhams.', en: 'Twelve dirhams.' } } }] },
        t5: { say: null, hint: { fr: 'Paie et remercie : « Chokran bzzaf! »', en: 'Pay and thank him: “Chokran bzzaf!”' }, suggest: ['Chokran bzzaf!', 'Merci, bslama.'],
          expect: [{ intent: 'ary_thanks', skill: 'thank_and_close', next: null, reply: { t: 'بالصحة! بسلامة.', r: 'Bssa7a! Bslama.', m: { fr: 'À ta santé ! Au revoir.', en: 'Enjoy! Goodbye.' } } }] }
      }
    },
    recall: {
      'ary-bghit-nss': { scene: 'casablanca-cafe', character: 'salma', line: { t: 'آش غادي تشرب؟', r: 'Ach ghadi tchrb?', m: { fr: 'Tu vas boire quoi ?', en: 'What are you going to drink?' } }, task: { fr: 'Salma t’invite après ses cours. Commande un nss-nss.', en: 'Salma treats you after her classes. Order a nss-nss.' } },
      'ary-labas': { scene: 'casablanca-cafe', character: 'salma', line: { t: 'سلام! لاباس؟', r: 'Salam! Labas?', m: { fr: 'Salut ! Ça va ?', en: 'Hi! How are you?' } }, task: { fr: 'Salma arrive. Réponds à son « labas ? ».', en: 'Salma arrives. Answer her “labas?”.' } },
      'ary-bch7al': { scene: 'casablanca-cafe', character: 'salma', line: { t: 'شوف هاد الكتاب!', r: 'Chouf had l-ktab!', m: { fr: 'Regarde ce livre !', en: 'Look at this book!' } }, task: { fr: 'Chez un bouquiniste avec Salma : demande le prix du livre.', en: 'At a second-hand bookseller with Salma: ask the price of the book.' } },
      'ary-chokran': { scene: 'casablanca-cafe', character: 'salma', line: { t: 'هاك، هادي ليك.', r: 'Hak, hadi lik.', m: { fr: 'Tiens, c’est pour toi.', en: 'Here, this is for you.' } }, task: { fr: 'Salma t’offre un croquis du Maârif. Remercie-la.', en: 'Salma gives you a sketch of Maârif. Thank her.' } }
    }
  },
  {
    id: 'ary-hanout', kind: 'shop', track: 'ar-moroccan', chapter: { n: 1, en: 'Maârif mornings', fr: 'Matins au Maârif' }, minutes: 8,
    title: { en: 'Groceries at the hanout', fr: 'Courses chez l’épicier (hanout)' }, scene: 'casablanca-cafe', character: 'brahim', status: 'playable',
    skills: ['request_item', 'respond_unexpected', 'ask_price', 'thank_and_close'],
    outcome: { en: 'Ask for bread, check if there’s mint, say that’s all and pay.', fr: 'Demander du pain, vérifier s’il y a de la menthe, dire que c’est tout et payer.' },
    focus: { en: 'Requests, “do you have…?”, “that’s all”', fr: 'Demandes, « tu as… ? », « c’est tout »' },
    context: {
      setup: { fr: 'Le hanout du coin, au Maârif. Brahim range des bouteilles derrière son comptoir. Il est ouvert jusqu’à minuit.', en: 'The corner hanout in Maârif. Brahim is stacking bottles behind the counter. He’s open until midnight.' },
      line: { t: 'السلام! آش خصك؟', r: 'Salam! Ach khassek?', m: { fr: 'Salut ! Qu’est-ce qu’il te faut ?', en: 'Hi! What do you need?' } },
      question: { fr: 'Que demande Brahim ?', en: 'What is Brahim asking?' },
      options: [{ icon: 'cup', m: { fr: 'Ce qu’il te faut', en: 'What you need' }, ok: true }, { icon: 'wave', m: { fr: 'Si tu vas bien', en: 'If you’re well' } }, { icon: 'clock', m: { fr: 'L’heure', en: 'The time' } }],
      after: { fr: '« Khassek » : « il te faut ». La question de tous les commerces du quartier.', en: '“Khassek”: “you need”. Every shop in the neighbourhood asks it.' }
    },
    expressions: [
      { id: 'ary-3tini-khobz', t: 'عطيني جوج خبزات، عافاك.', r: '3tini jouj khobzat, 3afak.', m: { fr: 'Donne-moi deux pains, s’il te plaît.', en: 'Give me two loaves of bread, please.' } },
      { id: 'ary-wach-3ndek', t: 'واش عندك النعناع؟', r: 'Wach 3ndek n-n3na3?', m: { fr: 'Tu as de la menthe ?', en: 'Do you have mint?' }, note: { fr: '« Wach » ouvre une question oui/non.', en: '“Wach” opens a yes/no question.' } },
      { id: 'ary-safi', t: 'صافي، هادشي.', r: 'Safi, hadchi.', m: { fr: 'C’est tout.', en: 'That’s all.' } },
      { id: 'ary-ch7al-hadchi', t: 'شحال هادشي؟', r: 'Ch7al hadchi?', m: { fr: 'Ça fait combien, tout ça ?', en: 'How much is all this?' } }
    ],
    anticipate: [
      { prompt: { fr: 'Demande deux pains, poliment.', en: 'Ask for two loaves of bread, politely.' }, expr: 'ary-3tini-khobz' },
      { prompt: { fr: 'Demande s’il a de la menthe.', en: 'Ask if he has mint.' }, expr: 'ary-wach-3ndek' },
      { prompt: { fr: 'Dis que c’est tout.', en: 'Say that’s all.' }, expr: 'ary-safi' },
      { prompt: { fr: 'Demande combien ça fait.', en: 'Ask how much it comes to.' }, expr: 'ary-ch7al-hadchi' }
    ],
    roleplay: {
      start: 't1', turns: {
        t1: { say: { t: 'السلام! آش خصك؟', r: 'Salam! Ach khassek?', m: { fr: 'Salut ! Qu’est-ce qu’il te faut ?', en: 'Hi! What do you need?' } }, hint: { fr: '« 3tini jouj khobzat, 3afak. »', en: '“3tini jouj khobzat, 3afak.”' }, suggest: ['3tini jouj khobzat, 3afak.', 'Bghit l-bid, 3afak.'],
          clarify: { t: 'سمح ليا، آش خصك؟', r: 'Sme7 lia, ach khassek?', m: { fr: 'Pardon, il te faut quoi ?', en: 'Sorry, what do you need?' } },
          expect: [
            { intent: 'ary_eggs', skill: 'request_item', next: 't2', set: { item: 'eggs' }, reply: { t: 'واخا، ستة ديال البيض.', r: 'Wakha, stta dyal l-bid.', m: { fr: 'D’accord, six œufs.', en: 'OK, six eggs.' } } },
            { intent: 'ary_bread', skill: 'request_item', next: 't2', set: { item: 'bread' }, reply: { t: 'واخا، جوج خبزات.', r: 'Wakha, jouj khobzat.', m: { fr: 'D’accord, deux pains.', en: 'OK, two loaves.' } } }
          ] },
        t2: { say: { t: 'شي حاجة خرى؟', r: 'Chi 7aja khra?', m: { fr: 'Autre chose ?', en: 'Anything else?' } }, hint: { fr: 'Demande la menthe : « Wach 3ndek n-n3na3? » ou dis « Safi, hadchi ».', en: 'Ask for mint: “Wach 3ndek n-n3na3?” or say “Safi, hadchi”.' }, suggest: ['Wach 3ndek n-n3na3?', 'Safi, hadchi.'],
          expect: [
            { intent: 'ary_mint', skill: 'respond_unexpected', next: 't2', stay: true, set: { mint: true }, reply: { t: 'إيه، نعناع مزيان، ديال اليوم.', r: 'Iyeh, n3na3 mzyan, dyal lyoum.', m: { fr: 'Oui, de la bonne menthe, du jour.', en: 'Yes, good mint, fresh today.' } } },
            { intent: 'ary_safi', skill: 'thank_and_close', next: 't3', reply: { t: 'مزيان.', r: 'Mzyan.', m: { fr: 'Très bien.', en: 'Fine.' } } }
          ] },
        t3: { say: { t: 'تفضل.', r: 'Tfeddel.', m: { fr: 'Voilà.', en: 'Here you go.' } }, hint: { fr: '« Ch7al hadchi? »', en: '“Ch7al hadchi?”' }, suggest: ['Ch7al hadchi?'],
          expect: [{ intent: 'ary_price', skill: 'ask_price', next: 't4', reply: v => v.mint ? { t: 'طناش درهم.', r: 'Tnach drahm.', m: { fr: 'Douze dirhams.', en: 'Twelve dirhams.' } } : { t: 'سبعة دراهم.', r: 'Sb3a drahm.', m: { fr: 'Sept dirhams.', en: 'Seven dirhams.' } } }] },
        t4: { say: null, hint: { fr: '« Chokran, bslama! »', en: '“Chokran, bslama!”' }, suggest: ['Chokran, bslama!'],
          expect: [{ intent: 'ary_thanks', skill: 'thank_and_close', next: null, reply: { t: 'بسلامة! الله يعاونك.', r: 'Bslama! Llah y3awnek.', m: { fr: 'Au revoir ! Que Dieu t’aide.', en: 'Goodbye! God help you.' } } }] }
      }
    },
    recall: {
      'ary-3tini-khobz': { scene: 'casablanca-cafe', character: 'youssef', line: { t: 'غادي للحانوت؟', r: 'Ghadi l-7anout?', m: { fr: 'Tu vas à l’épicerie ?', en: 'Going to the shop?' } }, task: { fr: 'Youssef te demande de lui ramener du pain. Demande deux pains au vendeur.', en: 'Youssef asks you to bring bread. Ask the vendor for two loaves.' } },
      'ary-wach-3ndek': { scene: 'casablanca-cafe', character: 'salma', line: { t: 'نديرو أتاي؟', r: 'Ndiro atay?', m: { fr: 'On fait du thé ?', en: 'Shall we make tea?' } }, task: { fr: 'Salma veut faire du thé. Demande au café s’il y a de la menthe.', en: 'Salma wants to make tea. Ask at the café if they have mint.' } },
      'ary-safi': { scene: 'casablanca-cafe', character: 'youssef', line: { t: 'شي حاجة خرى؟', r: 'Chi 7aja khra?', m: { fr: 'Autre chose ?', en: 'Anything else?' } }, task: { fr: 'Youssef demande si tu veux autre chose. Dis que c’est tout.', en: 'Youssef asks if you want anything else. Say that’s all.' } },
      'ary-ch7al-hadchi': { scene: 'casablanca-cafe', character: 'salma', line: { t: 'هاد الكتوبة زوينين!', r: 'Had l-ktouba zwinin!', m: { fr: 'Ces livres sont beaux !', en: 'These books are lovely!' } }, task: { fr: 'Au bouquiniste avec Salma : demande combien coûtent les livres.', en: 'At the bookseller with Salma: ask how much the books are.' } }
    }
  },

  /* ───────────── French · Québec (Montréal) ───────────── */
  {
    id: 'fr-mileend', kind: 'order', track: 'french', region: 'ca', chapter: { n: 1, en: 'Mile End', fr: 'Mile End' }, minutes: 7, flagship: true,
    title: { en: 'A café au lait in Mile End', fr: 'Un café au lait dans le Mile End' }, scene: 'montreal-cafe', character: 'emilie', status: 'playable',
    skills: ['request_item', 'choose_option', 'respond_unexpected', 'ask_price', 'thank_and_close'],
    outcome: { en: 'Order in Québec French, choose “pour apporter”, handle a chocolatine offer and pay.', fr: 'Commander en français québécois, choisir « pour apporter », gérer une offre de chocolatine et payer.' },
    focus: { en: 'Québec vocabulary: pour apporter, chocolatine', fr: 'Vocabulaire québécois' },
    context: {
      setup: { en: 'Mile End, Montréal. A cold October morning; maple leaves on the outdoor staircases. Émilie is at the counter.', fr: 'Mile End, Montréal. Un matin froid d’octobre ; des feuilles d’érable sur les escaliers extérieurs.' },
      line: { t: 'Allô! Qu’est-ce que je te sers?', m: { en: 'Hi! What can I get you?', es: '¡Hola! ¿Qué te pongo?', ru: 'Привет! Что тебе принести?' } },
      question: { en: 'What is Émilie asking?', ru: 'О чём спрашивает Эмили?' },
      options: [{ icon: 'cup', m: { en: 'What you’d like', ru: 'Что вы хотите' }, ok: true }, { icon: 'snow', m: { en: 'If you’re cold', ru: 'Не холодно ли вам' } }, { icon: 'pin', m: { en: 'Where you live', ru: 'Где вы живёте' } }],
      after: { en: 'In Québec, “allô” is a common friendly hello, not just for the phone.', ru: 'В Квебеке «allô» — обычное дружеское приветствие, не только по телефону.' }
    },
    expressions: [
      { id: 'fr-cafe-au-lait', t: 'Un café au lait, s’il vous plaît.', m: { en: 'A café au lait, please.', ru: 'Кофе с молоком, пожалуйста.' } },
      { id: 'fr-pour-apporter', t: 'Pour apporter, s’il vous plaît.', m: { en: 'To go, please.', ru: 'С собой, пожалуйста.' }, note: { en: 'Québec says “pour apporter”; in France you’ll hear “à emporter”.', ru: 'В Квебеке говорят «pour apporter», во Франции — «à emporter».' } },
      { id: 'fr-combien', t: 'C’est combien?', m: { en: 'How much is it?', ru: 'Сколько стоит?' } },
      { id: 'fr-bonne-journee', t: 'Merci, bonne journée!', m: { en: 'Thanks, have a good day!', ru: 'Спасибо, хорошего дня!' } }
    ],
    anticipate: [
      { prompt: { en: 'Émilie asks what you’d like. Order a café au lait politely.', ru: 'Эмили спрашивает, что вы хотите. Вежливо закажите кофе с молоком.' }, expr: 'fr-cafe-au-lait' },
      { prompt: { en: 'Say it’s to go, the Québec way.', ru: 'Скажите «с собой» по-квебекски.' }, expr: 'fr-pour-apporter' },
      { prompt: { en: 'Ask how much it is.', ru: 'Спросите, сколько это стоит.' }, expr: 'fr-combien' }
    ],
    roleplay: {
      start: 't1', turns: {
        t1: { say: { t: 'Allô! Qu’est-ce que je te sers?', m: { en: 'Hi! What can I get you?', ru: 'Привет! Что тебе принести?' } }, hint: { en: 'Order: “Un café au lait, s’il vous plaît.”', ru: 'Закажите: «Un café au lait, s’il vous plaît.»' }, suggest: ['Un café au lait, s’il vous plaît.', 'Un allongé, s’il te plaît.'],
          clarify: { t: 'Pardon, qu’est-ce que tu prends?', m: { en: 'Sorry, what are you having?', ru: 'Простите, что будешь?' } },
          expect: [{ intent: 'fr_order', skill: 'request_item', next: 't2', reply: { t: 'Parfait.', m: { en: 'Perfect.', ru: 'Отлично.' } } }] },
        t2: { say: { t: 'Pour ici ou pour apporter?', m: { en: 'For here or to go?', ru: 'Здесь или с собой?' } }, hint: { en: '“Pour ici” or “pour apporter”.', ru: '«Pour ici» или «pour apporter».' }, suggest: ['Pour apporter, s’il vous plaît.', 'Pour ici.'],
          expect: [
            { intent: 'fr_to_go', skill: 'choose_option', next: 't3', set: { where: 'to-go' }, reply: { t: 'Pas de problème.', m: { en: 'No problem.', ru: 'Без проблем.' } } },
            { intent: 'fr_here', skill: 'choose_option', next: 't3', set: { where: 'here' }, reply: { t: 'Installe-toi, je te l’apporte.', m: { en: 'Have a seat, I’ll bring it over.', ru: 'Садись, я принесу.' } } }
          ] },
        t3: { say: { t: 'Veux-tu une chocolatine avec ça? Elles sortent du four.', m: { en: 'Want a chocolatine with that? They’re fresh out of the oven.', ru: 'Хочешь шоколатину? Только из печи.' } }, unexpected: true,
          hint: { en: 'A chocolatine is a pain au chocolat. Say “Oui, merci!” or “Non, merci.”', ru: 'Шоколатина — это круассан с шоколадом. Скажите «Oui, merci!» или «Non, merci.»' }, suggest: ['Oui, merci!', 'Non, merci.'],
          expect: [
            { intent: 'fr_no', skill: 'respond_unexpected', next: 't4', set: { food: 'none' }, reply: { t: 'Correct!', m: { en: 'All good!', ru: 'Хорошо!' } } },
            { intent: 'fr_yes', skill: 'respond_unexpected', next: 't4', set: { food: 'chocolatine' }, reply: { t: 'Bon choix!', m: { en: 'Good choice!', ru: 'Хороший выбор!' } } }
          ] },
        t4: { say: { t: 'Et voilà!', m: { en: 'There you go!', ru: 'Вот, пожалуйста!' } }, hint: { en: 'Ask: “C’est combien?”', ru: 'Спросите: «C’est combien?»' }, suggest: ['C’est combien?', 'Ça fait combien?'],
          expect: [{ intent: 'fr_price', skill: 'ask_price', next: 't5', reply: v => v.food === 'chocolatine' ? { t: 'Ça va faire 7,50 $.', m: { en: 'That’ll be $7.50.', ru: 'С тебя 7,50 $.' } } : { t: 'Ça va faire 4,25 $.', m: { en: 'That’ll be $4.25.', ru: 'С тебя 4,25 $.' } } }] },
        t5: { say: null, hint: { en: '“Merci, bonne journée!”', ru: '«Merci, bonne journée!»' }, suggest: ['Merci, bonne journée!'],
          expect: [{ intent: 'fr_thanks', skill: 'thank_and_close', next: null, reply: { t: 'Toi aussi! Bonne journée!', m: { en: 'You too! Have a good day!', ru: 'И тебе! Хорошего дня!' } } }] }
      }
    },
    recall: {
      'fr-pour-apporter': { scene: 'montreal-cafe', character: 'emilie', line: { t: 'Une poutine, c’est pour ici?', m: { en: 'One poutine, is that for here?', ru: 'Одна путин — здесь?' } }, task: { en: 'At a casse-croûte on Saint-Laurent. Say it’s to go.', ru: 'В закусочной на Сен-Лоран. Скажите, что с собой.' } },
      'fr-cafe-au-lait': { scene: 'montreal-cafe', character: 'emilie', line: { t: 'Comme d’habitude?', m: { en: 'The usual?', ru: 'Как обычно?' } }, task: { en: 'Émilie asks if it’s the usual. Order your café au lait.', ru: 'Эмили спрашивает «как обычно?». Закажите кофе с молоком.' } },
      'fr-combien': { scene: 'montreal-cafe', character: 'emilie', line: { t: 'Les bagels sont tout chauds.', m: { en: 'The bagels are still warm.', ru: 'Бейглы ещё тёплые.' } }, task: { en: 'At a bagel shop on Fairmount: ask how much it is.', ru: 'В бейгельной на Фэрмаунт: спросите цену.' } },
      'fr-bonne-journee': { scene: 'montreal-cafe', character: 'emilie', line: { t: 'Bonne fin de semaine!', m: { en: 'Have a good weekend!', ru: 'Хороших выходных!' } }, task: { en: 'Leaving, thank Émilie and wish her a good day.', ru: 'Уходя, поблагодарите Эмили и пожелайте хорошего дня.' } }
    }
  },
  {
    id: 'fr-paris', kind: 'order', track: 'french', region: 'fr', chapter: { n: 2, en: 'Canal Saint-Martin', fr: 'Canal Saint-Martin' }, minutes: 7,
    title: { en: 'A café crème by the canal', fr: 'Un café crème au bord du canal', ru: 'Кофе со сливками у канала' }, scene: 'paris-cafe', character: 'theo', status: 'playable',
    skills: ['request_item', 'choose_option', 'respond_unexpected', 'ask_price', 'thank_and_close'],
    outcome: { en: 'Order in Paris French: “sur place ou à emporter ?”, a croissant offer and the bill.', ru: 'Заказать по-парижски: «здесь или с собой?», предложение круассана и счёт.' },
    focus: { en: 'Paris vocabulary: à emporter, l’addition', ru: 'Парижская лексика: à emporter, l’addition' },
    context: {
      setup: { en: 'Canal Saint-Martin, Paris. A grey October morning. Théo is wiping the zinc counter.', ru: 'Канал Сен-Мартен, Париж. Серое октябрьское утро. Тео протирает цинковую стойку.' },
      line: { t: 'Bonjour ! Qu’est-ce que je vous sers ?', m: { en: 'Good morning! What can I get you?', ru: 'Здравствуйте! Что вам принести?' } },
      question: { en: 'What is Théo asking?', ru: 'О чём спрашивает Тео?' },
      options: [{ icon: 'cup', m: { en: 'What you’d like', ru: 'Что вы хотите' }, ok: true }, { icon: 'umbrella', m: { en: 'If it’s raining', ru: 'Идёт ли дождь' } }, { icon: 'pin', m: { en: 'Where you live', ru: 'Где вы живёте' } }],
      after: { en: 'In Paris you’ll hear the formal “vous” from waiters; Montréal baristas often say “tu”.', ru: 'В Париже официанты говорят «vous»; в Монреале бариста часто говорят «tu».' }
    },
    expressions: [
      { id: 'fr-cafe-creme', t: 'Un café crème, s’il vous plaît.', m: { en: 'A café crème, please.', ru: 'Кофе со сливками, пожалуйста.' } },
      { id: 'fr-sur-place', t: 'Sur place, merci.', m: { en: 'For here, thanks.', ru: 'Здесь, спасибо.' }, note: { en: 'To go is “à emporter” in Paris (“pour apporter” in Québec).', ru: 'С собой в Париже: «à emporter» (в Квебеке «pour apporter»).' } },
      { id: 'fr-addition', t: 'L’addition, s’il vous plaît.', m: { en: 'The bill, please.', ru: 'Счёт, пожалуйста.' } },
      { id: 'fr-merci-paris', t: 'Merci, bonne journée !', m: { en: 'Thanks, have a good day!', ru: 'Спасибо, хорошего дня!' } }
    ],
    anticipate: [
      { prompt: { en: 'Order a café crème, politely.', ru: 'Вежливо закажите кофе со сливками.' }, expr: 'fr-cafe-creme' },
      { prompt: { en: 'Say it’s for here.', ru: 'Скажите, что здесь.' }, expr: 'fr-sur-place' },
      { prompt: { en: 'Ask for the bill.', ru: 'Попросите счёт.' }, expr: 'fr-addition' }
    ],
    roleplay: {
      start: 't1', turns: {
        t1: { say: { t: 'Bonjour ! Qu’est-ce que je vous sers ?', m: { en: 'Good morning! What can I get you?', ru: 'Здравствуйте! Что вам принести?' } }, hint: { en: '“Un café crème, s’il vous plaît.”', ru: '«Un café crème, s’il vous plaît.»' }, suggest: ['Un café crème, s’il vous plaît.', 'Un express, s’il vous plaît.'],
          clarify: { t: 'Pardon ? Qu’est-ce que je vous sers ?', m: { en: 'Sorry? What can I get you?', ru: 'Простите? Что вам принести?' } },
          expect: [{ intent: 'fr_order', skill: 'request_item', next: 't2', reply: { t: 'Très bien.', m: { en: 'Very good.', ru: 'Хорошо.' } } }] },
        t2: { say: { t: 'Sur place ou à emporter ?', m: { en: 'For here or to go?', ru: 'Здесь или с собой?' } }, hint: { en: '“Sur place” or “à emporter”.', ru: '«Sur place» или «à emporter».' }, suggest: ['Sur place, merci.', 'À emporter.'],
          expect: [{ intent: 'fr_to_go', skill: 'choose_option', next: 't3', set: { where: 'to-go' }, reply: null }, { intent: 'fr_here', skill: 'choose_option', next: 't3', set: { where: 'here' }, reply: { t: 'Installez-vous, je vous l’apporte.', m: { en: 'Have a seat, I’ll bring it over.', ru: 'Садитесь, я принесу.' } } }] },
        t3: { say: { t: 'Avec un croissant ? Ils sortent du four.', m: { en: 'With a croissant? They’re fresh out of the oven.', ru: 'С круассаном? Только из печи.' } }, unexpected: true, hint: { en: '“Oui, avec plaisir !” or “Non, merci.”', ru: '«Oui, avec plaisir !» или «Non, merci.»' }, suggest: ['Oui, avec plaisir !', 'Non, merci.'],
          expect: [{ intent: 'fr_no', skill: 'respond_unexpected', next: 't4', set: { food: 'none' }, reply: { t: 'Entendu.', m: { en: 'Understood.', ru: 'Понял.' } } }, { intent: 'fr_yes', skill: 'respond_unexpected', next: 't4', set: { food: 'croissant' }, reply: { t: 'Bon choix.', m: { en: 'Good choice.', ru: 'Хороший выбор.' } } }] },
        t4: { say: { t: 'Et voilà.', m: { en: 'There you are.', ru: 'Вот, пожалуйста.' } }, hint: { en: '“L’addition, s’il vous plaît.”', ru: '«L’addition, s’il vous plaît.»' }, suggest: ['L’addition, s’il vous plaît.', 'Je vous dois combien ?'],
          expect: [{ intent: 'fr_bill', skill: 'ask_price', next: 't5', reply: v => v.food === 'croissant' ? { t: 'Ça fera 4,50 €.', m: { en: 'That’ll be €4.50.', ru: 'С вас 4,50 €.' } } : { t: 'Ça fera 3,20 €.', m: { en: 'That’ll be €3.20.', ru: 'С вас 3,20 €.' } } }] },
        t5: { say: null, hint: { en: '“Merci, bonne journée !”', ru: '«Merci, bonne journée !»' }, suggest: ['Merci, bonne journée !'],
          expect: [{ intent: 'fr_thanks', skill: 'thank_and_close', next: null, reply: { t: 'Bonne journée à vous !', m: { en: 'Have a good day!', ru: 'Хорошего дня!' } } }] }
      }
    },
    recall: {
      'fr-cafe-creme': { scene: 'montreal-cafe', character: 'emilie', line: { t: 'Bonjour ! Qu’est-ce que je vous sers ?', m: { en: 'Hello! What can I get you?', ru: 'Здравствуйте! Что вам принести?' } }, task: { en: 'A Parisian visitor’s order at Émilie’s café in Montréal: ask for a café crème.', ru: 'В монреальском кафе Эмили закажите кофе со сливками.' } },
      'fr-sur-place': { scene: 'paris-cafe', character: 'theo', line: { t: 'C’est pour emporter ?', m: { en: 'Is it to go?', ru: 'С собой?' } }, task: { en: 'At a boulangerie: say you’ll eat it here.', ru: 'В булочной скажите, что поедите здесь.' } },
      'fr-addition': { scene: 'paris-cafe', character: 'theo', line: { t: 'Tout s’est bien passé ?', m: { en: 'Was everything all right?', ru: 'Всё понравилось?' } }, task: { en: 'Dinner is over. Ask for the bill.', ru: 'Ужин окончен. Попросите счёт.' } },
      'fr-merci-paris': { scene: 'paris-cafe', character: 'theo', line: { t: 'Voici votre monnaie.', m: { en: 'Here’s your change.', ru: 'Ваша сдача.' } }, task: { en: 'Thank Théo and wish him a good day.', ru: 'Поблагодарите Тео и пожелайте хорошего дня.' } }
    }
  },

  /* ───────────── Japanese · Tokyo ───────────── */
  {
    id: 'ja-cafe', kind: 'order', track: 'japanese', chapter: { n: 1, en: 'Shimokitazawa', fr: 'Shimokitazawa' }, minutes: 7, flagship: true,
    title: { en: 'A latte in Shimokitazawa', fr: 'Un latte à Shimokitazawa' }, scene: 'tokyo-cafe', character: 'haruto', status: 'playable',
    skills: ['request_item', 'choose_option', 'respond_unexpected', 'ask_price', 'thank_and_close'],
    outcome: { en: 'Order politely, choose for here, pick a size and pay.', fr: 'Commander poliment, choisir sur place, une taille et payer.' },
    focus: { en: 'Polite requests with ください', fr: 'Demandes polies' },
    context: {
      setup: { en: 'A narrow street in Shimokitazawa, light rain. A small café with a wooden counter and a record playing.', fr: 'Une ruelle de Shimokitazawa, petite pluie. Un café au comptoir en bois, un vinyle tourne.' },
      line: { t: 'いらっしゃいませ。ご注文はお決まりですか？', r: 'Irasshaimase. Go-chūmon wa o-kimari desu ka?', m: { en: 'Welcome! Have you decided what you’d like?', fr: 'Bienvenue ! Vous avez choisi ?' } },
      question: { en: 'What is Haruto asking?', fr: 'Que demande Haruto ?' },
      options: [{ icon: 'cup', m: { en: 'If you’re ready to order', fr: 'Si vous êtes prêt·e à commander' }, ok: true }, { icon: 'umbrella', m: { en: 'If you need an umbrella', fr: 'Si vous voulez un parapluie' } }, { icon: 'clock', m: { en: 'What time it is', fr: 'Quelle heure il est' } }],
      after: { en: 'いらっしゃいませ (irasshaimase) is the welcome you hear entering any shop.', fr: 'いらっしゃいませ (irasshaimase) est l’accueil entendu dans tous les commerces.' }
    },
    expressions: [
      { id: 'ja-latte', t: 'カフェラテをひとつください。', r: 'Kafe rate o hitotsu kudasai.', m: { en: 'One café latte, please.', fr: 'Un café latte, s’il vous plaît.' } },
      { id: 'ja-tennai', t: '店内で。', r: 'Tennai de.', m: { en: 'For here.', fr: 'Sur place.' }, note: { en: 'To go: 持ち帰りで (mochikaeri de).', fr: 'À emporter : 持ち帰りで (mochikaeri de).' } },
      { id: 'ja-ikura', t: 'いくらですか？', r: 'Ikura desu ka?', m: { en: 'How much is it?', fr: 'C’est combien ?' } },
      { id: 'ja-arigatou', t: 'ありがとうございます。', r: 'Arigatō gozaimasu.', m: { en: 'Thank you very much.', fr: 'Merci beaucoup.' } }
    ],
    anticipate: [
      { prompt: { en: 'Order one café latte, politely.', fr: 'Commandez un café latte, poliment.' }, expr: 'ja-latte' },
      { prompt: { en: 'Say it’s for here.', fr: 'Dites que c’est sur place.' }, expr: 'ja-tennai' },
      { prompt: { en: 'Ask how much it is.', fr: 'Demandez combien c’est.' }, expr: 'ja-ikura' }
    ],
    roleplay: {
      start: 't1', turns: {
        t1: { say: { t: 'いらっしゃいませ。ご注文はお決まりですか？', r: 'Irasshaimase. Go-chūmon wa o-kimari desu ka?', m: { en: 'Welcome! Have you decided?', fr: 'Bienvenue ! Vous avez choisi ?' } }, hint: { en: '“Kafe rate o hitotsu kudasai.”', fr: '« Kafe rate o hitotsu kudasai. »' }, suggest: ['カフェラテをひとつください。', 'Kafe rate o kudasai.'],
          expect: [{ intent: 'ja_order', skill: 'request_item', next: 't2', reply: { t: 'かしこまりました。', r: 'Kashikomarimashita.', m: { en: 'Certainly.', fr: 'Très bien.' } } }] },
        t2: { say: { t: '店内でお召し上がりですか？', r: 'Tennai de o-meshiagari desu ka?', m: { en: 'Will you have it here?', fr: 'C’est pour consommer sur place ?' } }, hint: { en: '“Hai, tennai de.” or “Mochikaeri de.”', fr: '« Hai, tennai de. » ou « Mochikaeri de. »' }, suggest: ['はい、店内で。', 'Mochikaeri de.'],
          expect: [
            { intent: 'ja_to_go', skill: 'choose_option', next: 't3', set: { where: 'to-go' }, reply: null },
            { intent: 'ja_here', skill: 'choose_option', next: 't3', set: { where: 'here' }, reply: null }
          ] },
        t3: { say: { t: 'サイズはいかがなさいますか？', r: 'Saizu wa ikaga nasaimasu ka?', m: { en: 'What size would you like?', fr: 'Quelle taille souhaitez-vous ?' } }, unexpected: true, hint: { en: 'Say a size: “M de.” (medium)', fr: 'Donnez une taille : « M de. »' }, suggest: ['Mで。', 'S de.', 'L de.'],
          expect: [
            { intent: 'ja_size_l', skill: 'respond_unexpected', next: 't4', set: { size: 'L' }, reply: null },
            { intent: 'ja_size', skill: 'respond_unexpected', next: 't4', set: { size: 'M' }, reply: null }
          ] },
        t4: { say: { t: 'お待たせしました。', r: 'O-matase shimashita.', m: { en: 'Thank you for waiting.', fr: 'Merci d’avoir patienté.' } }, hint: { en: '“Ikura desu ka?”', fr: '« Ikura desu ka? »' }, suggest: ['いくらですか？'],
          expect: [{ intent: 'ja_price', skill: 'ask_price', next: 't5', reply: v => v.size === 'L' ? { t: '六百円です。', r: 'Roppyaku en desu.', m: { en: 'That’s 600 yen.', fr: 'Ça fait 600 yens.' } } : { t: '五百五十円です。', r: 'Gohyaku gojū en desu.', m: { en: 'That’s 550 yen.', fr: 'Ça fait 550 yens.' } } }] },
        t5: { say: null, hint: { en: '“Arigatō gozaimasu.”', fr: '« Arigatō gozaimasu. »' }, suggest: ['ありがとうございます。'],
          expect: [{ intent: 'ja_thanks', skill: 'thank_and_close', next: null, reply: { t: 'ありがとうございました！', r: 'Arigatō gozaimashita!', m: { en: 'Thank you very much!', fr: 'Merci beaucoup !' } } }] }
      }
    },
    recall: {
      'ja-latte': { scene: 'tokyo-cafe', character: 'haruto', line: { t: 'こんにちは。何になさいますか？', r: 'Konnichiwa. Nani ni nasaimasu ka?', m: { en: 'Hello. What will you have?', fr: 'Bonjour. Que prendrez-vous ?' } }, task: { en: 'A different café near the station. Order a latte.', fr: 'Un autre café près de la gare. Commandez un latte.' } },
      'ja-tennai': { scene: 'tokyo-cafe', character: 'haruto', line: { t: 'お持ち帰りですか？', r: 'O-mochikaeri desu ka?', m: { en: 'Is it to take away?', fr: 'C’est à emporter ?' } }, task: { en: 'At a bakery: say you’ll eat it here.', fr: 'Dans une boulangerie : dites que c’est sur place.' } },
      'ja-ikura': { scene: 'tokyo-cafe', character: 'haruto', line: { t: 'こちらの傘はいかがですか？', r: 'Kochira no kasa wa ikaga desu ka?', m: { en: 'How about this umbrella?', fr: 'Que pensez-vous de ce parapluie ?' } }, task: { en: 'Buying an umbrella in the rain: ask how much it is.', fr: 'Sous la pluie, vous achetez un parapluie : demandez le prix.' } },
      'ja-arigatou': { scene: 'tokyo-cafe', character: 'haruto', line: { t: 'レシートです。', r: 'Reshīto desu.', m: { en: 'Here is your receipt.', fr: 'Voici votre ticket.' } }, task: { en: 'Haruto hands you the receipt. Thank him.', fr: 'Haruto vous tend le ticket. Remerciez-le.' } }
    }
  },

  /* ───────────── English · Brooklyn · taught from Russian or French ───────────── */
  {
    id: 'en-cafe', kind: 'order', track: 'english', chapter: { n: 1, en: 'Fort Greene', fr: 'Fort Greene', ru: 'Форт-Грин' }, minutes: 7, flagship: true,
    title: { en: 'A latte in Fort Greene', fr: 'Un latte à Fort Greene', ru: 'Латте в Форт-Грине' }, scene: 'brooklyn-cafe', character: 'jordan', status: 'playable',
    skills: ['request_item', 'respond_unexpected', 'choose_option', 'ask_price', 'thank_and_close'],
    outcome: { en: 'Order, handle the size question, choose to go and pay.', fr: 'Commander, gérer la question de la taille, choisir à emporter et payer.', ru: 'Заказать, ответить про размер, выбрать «с собой» и расплатиться.' },
    focus: { ru: 'Вежливые просьбы: Can I get…?', fr: 'Demandes polies : Can I get… ?', en: 'Polite requests: Can I get…?' },
    context: {
      setup: { ru: 'Форт-Грин, Бруклин. Пятница, утро. В кофейне тихо играет музыка, Джордан за стойкой.', fr: 'Fort Greene, Brooklyn. Vendredi matin. Musique douce, Jordan est derrière le comptoir.', en: 'Fort Greene, Brooklyn. Friday morning. Quiet music; Jordan is behind the counter.' },
      line: { t: 'Hey there! What can I get started for you?', m: { ru: 'Привет! Что вам приготовить?', fr: 'Salut ! Qu’est-ce que je te prépare ?', en: 'Hey there! What can I get started for you?' } },
      question: { ru: 'О чём спрашивает Джордан?', fr: 'Que demande Jordan ?', en: 'What is Jordan asking?' },
      options: [{ icon: 'cup', m: { ru: 'Что вы будете заказывать', fr: 'Ce que tu veux commander', en: 'What you’ll order' }, ok: true }, { icon: 'door', m: { ru: 'Когда кафе закрывается', fr: 'À quelle heure ça ferme', en: 'When they close' } }, { icon: 'pin', m: { ru: 'Откуда вы', fr: 'D’où tu viens', en: 'Where you’re from' } }],
      after: { ru: '«What can I get started for you?» — типичный вопрос бариста в США.', fr: '« What can I get started for you? » : la question typique des baristas aux États-Unis.', en: 'A typical American barista question.' }
    },
    expressions: [
      { id: 'en-latte', t: 'Can I get a latte, please?', m: { ru: 'Можно мне латте, пожалуйста?', fr: 'Je pourrais avoir un latte, s’il te plaît ?', en: 'Can I get a latte, please?' } },
      { id: 'en-to-go', t: 'To go, please.', m: { ru: 'С собой, пожалуйста.', fr: 'À emporter, s’il te plaît.', en: 'To go, please.' } },
      { id: 'en-how-much', t: 'How much is that?', m: { ru: 'Сколько с меня?', fr: 'Ça fait combien ?', en: 'How much is that?' } },
      { id: 'en-thanks', t: 'Thanks, have a good one!', m: { ru: 'Спасибо, хорошего дня!', fr: 'Merci, bonne journée !', en: 'Thanks, have a good one!' }, note: { ru: '«Have a good one» — непринуждённое «хорошего дня».', fr: '« Have a good one » : un « bonne journée » décontracté.' } }
    ],
    anticipate: [
      { prompt: { ru: 'Попросите латте вежливо.', fr: 'Demande poliment un latte.' }, expr: 'en-latte' },
      { prompt: { ru: 'Скажите, что возьмёте с собой.', fr: 'Dis que c’est à emporter.' }, expr: 'en-to-go' },
      { prompt: { ru: 'Спросите, сколько это стоит.', fr: 'Demande combien ça coûte.' }, expr: 'en-how-much' }
    ],
    roleplay: {
      start: 't1', turns: {
        t1: { say: { t: 'Hey there! What can I get started for you?', m: { ru: 'Привет! Что вам приготовить?', fr: 'Salut ! Qu’est-ce que je te prépare ?' } }, hint: { ru: '«Can I get a latte, please?»', fr: '« Can I get a latte, please? »' }, suggest: ['Can I get a latte, please?', 'A cappuccino, please.'],
          expect: [{ intent: 'en_order', skill: 'request_item', next: 't2', reply: { t: 'Sure thing.', m: { ru: 'Конечно.', fr: 'Bien sûr.' } } }] },
        t2: { say: { t: 'What size: small, medium or large?', m: { ru: 'Какой размер: маленький, средний или большой?', fr: 'Quelle taille : petit, moyen ou grand ?' } }, unexpected: true, hint: { ru: 'Скажите размер: «Medium, please.»', fr: 'Donne une taille : « Medium, please. »' }, suggest: ['Medium, please.', 'Small.', 'Large, please.'],
          expect: [{ intent: 'en_size_large', skill: 'respond_unexpected', next: 't3', set: { size: 'large' }, reply: null }, { intent: 'en_size', skill: 'respond_unexpected', next: 't3', set: { size: 'regular' }, reply: null }] },
        t3: { say: { t: 'For here or to go?', m: { ru: 'Здесь или с собой?', fr: 'Sur place ou à emporter ?' } }, hint: { ru: '«To go, please.» или «For here.»', fr: '« To go, please. » ou « For here. »' }, suggest: ['To go, please.', 'For here.'],
          expect: [{ intent: 'en_to_go', skill: 'choose_option', next: 't4', set: { where: 'to-go' }, reply: null }, { intent: 'en_here', skill: 'choose_option', next: 't4', set: { where: 'here' }, reply: null }] },
        t4: { say: { t: 'Here you go!', m: { ru: 'Пожалуйста!', fr: 'Et voilà !' } }, hint: { ru: '«How much is that?»', fr: '« How much is that? »' }, suggest: ['How much is that?'],
          expect: [{ intent: 'en_price', skill: 'ask_price', next: 't5', reply: v => v.size === 'large' ? { t: 'That’ll be five twenty-five.', m: { ru: 'С вас 5,25 доллара.', fr: 'Ça fera 5,25 $.' } } : { t: 'That’ll be four seventy-five.', m: { ru: 'С вас 4,75 доллара.', fr: 'Ça fera 4,75 $.' } } }] },
        t5: { say: null, hint: { ru: '«Thanks, have a good one!»', fr: '« Thanks, have a good one! »' }, suggest: ['Thanks, have a good one!'],
          expect: [{ intent: 'en_thanks', skill: 'thank_and_close', next: null, reply: { t: 'You too! Have a good one!', m: { ru: 'И вам! Хорошего дня!', fr: 'Toi aussi ! Bonne journée !' } } }] }
      }
    },
    recall: {
      'en-latte': { scene: 'brooklyn-cafe', character: 'jordan', line: { t: 'Morning! The usual?', m: { ru: 'Доброе утро! Как обычно?', fr: 'Salut ! Comme d’habitude ?' } }, task: { ru: 'Другой день, другая кофейня. Закажите латте.', fr: 'Un autre jour, un autre café. Commande un latte.' } },
      'en-to-go': { scene: 'brooklyn-cafe', character: 'jordan', line: { t: 'Is that for here?', m: { ru: 'Это здесь?', fr: 'C’est sur place ?' } }, task: { ru: 'В бейгельной: скажите, что с собой.', fr: 'Chez un vendeur de bagels : dis que c’est à emporter.' } },
      'en-how-much': { scene: 'brooklyn-cafe', character: 'jordan', line: { t: 'These are fresh today.', m: { ru: 'Они сегодня свежие.', fr: 'Ils sont frais du jour.' } }, task: { ru: 'На фермерском рынке: спросите цену яблок.', fr: 'Au marché fermier : demande le prix des pommes.' } },
      'en-thanks': { scene: 'brooklyn-cafe', character: 'jordan', line: { t: 'Here’s your change.', m: { ru: 'Ваша сдача.', fr: 'Voici ta monnaie.' } }, task: { ru: 'Поблагодарите и попрощайтесь.', fr: 'Remercie et dis au revoir.' } }
    }
  }
];

/* Intent patterns. "any" = at least one must appear; "all" = every group must match one;
   "not" = any of these blocks the intent (e.g. a negated order fails the request). */
LQ.INTENTS = {
  es_fine: { any: ['bien', 'genial', 'que tal', 'hola', 'todo bien', 'regular', 'fenomenal'] },
  es_name: { any: ['me llamo', 'soy', 'mi nombre es', 'llamo'] },
  es_from: { any: ['soy de', 'de canada', 'canada', 'montreal', 'quebec', 'francia', 'mexico', 'estados unidos', 'de aqui', 'vengo de', 'de '] },
  es_thanks_bye: { any: ['gracias', 'hasta luego', 'adios', 'chao', 'hasta manana', 'igualmente', 'buen dia'] },
  es_greet_only: { any: ['buenos dias', 'hola', 'buenas'] },
  es_order_coffee: { any: ['cafe', 'cortado', 'americano', 'solo', 'con leche', 'manchado', 'capuchino', 'cafelito', 'leche'], not: ['no quiero', 'no me pongas', 'nada de cafe', 'sin cafe'] },
  es_oat: { any: ['avena', 'soja', 'leche vegetal', 'sin lactosa', 'almendra'] },
  es_yes: { any: ['si', 'vale', 'perfecto', 'venga', 'claro', 'por favor', 'eso'], not: ['no'] },
  es_no: { any: ['no gracias', 'no', 'nada', 'nada mas', 'solo el cafe', 'normal', 'esta bien asi'] },
  es_here: { any: ['aqui', 'tomar aqui', 'para aqui', 'me quedo', 'para tomar'] },
  es_to_go: { any: ['llevar', 'para llevar'] },
  es_toast: { any: ['tostada', 'tomate', 'pan con tomate'] },
  es_croissant: { any: ['cruasan', 'croissant', 'cruasanes', 'medialuna'] },
  es_price: { any: ['cuanto', 'que te debo', 'que le debo', 'la cuenta', 'cobras', 'cuanto es', 'precio'] },
  es_tomatoes: { any: ['tomate', 'tomates', 'medio kilo', 'kilo'] },
  es_oranges: { any: ['naranja', 'naranjas'] },
  es_ripe: { any: ['maduro', 'maduros', 'madura', 'maduras'] },
  es_today: { any: ['hoy', 'ahora', 'esta noche', 'para hoy'] },
  es_weekend: { any: ['fin de semana', 'sabado', 'domingo', 'manana'] },
  es_nothing_else: { any: ['nada mas', 'nada', 'eso es todo', 'ya esta', 'no gracias', 'es todo'] },
  es_more: { any: ['limon', 'limones', 'ajo', 'tambien', 'y un', 'y una', 'ademas'], not: ['nada mas'] },
  es_where_metro: { any: ['metro', 'estacion', 'donde esta', 'sol', 'busco'] },
  es_far: { any: ['lejos', 'cerca', 'cuanto tiempo'] },
  es_confirm_dir: { any: ['recto', 'izquierda', 'al lado', 'quiosco'] },
  ary_fine: { any: ['labas', 'bikhir', 'bkhir', 'hamdulillah', 'hamdoulillah', 'hamdullah', 'hamdoulah', 'lhamdulillah', 'salam', 'لاباس', 'بخير', 'الحمد', 'سلام', 'ca va', 'cava', 'bien'] },
  ary_order: { any: ['nss', 'nos nos', 'nousnous', 'nous nous', 'qahwa', '9ahwa', 'kahwa', 'qhwa', 'cafe', 'قهوة', 'نص', 'kahwa'], not: ['ma bghitch', 'مابغيتش'] },
  ary_tea: { any: ['atay', 'atai', 'the', 'أتاي', 'اتاي', 'تاي'] },
  ary_yes: { any: ['iyeh', 'iyyeh', 'ah', 'wakha', 'oui', 'نعم', 'اه', 'واخا', 'إيه', 'ايه', 'n3am', 'naam', '3afak'] },
  ary_no: { any: ['la', 'lla', 'safi', 'non', 'لا', 'صافي', 'chokran', 'merci', 'walo', 'والو'] },
  ary_bread: { any: ['khobz', 'khobza', 'khobzat', 'khbz', 'خبز', 'خبزات', 'pain'] },
  ary_eggs: { any: ['bid', 'l bid', 'bida', 'بيض', 'البيض', 'oeufs', 'oeuf'] },
  ary_mint: { any: ['n3na3', 'na3na3', 'nanaa', 'na3na', 'نعناع', 'النعناع', 'menthe'] },
  ary_safi: { any: ['safi', 'hadchi', 'صافي', 'هادشي', 'cest tout', 'walo', 'la chokran'] },
  ary_msemmen: { any: ['msemmen', 'msmen', 'msemen', 'مسمن'] },
  ary_baghrir: { any: ['baghrir', 'beghrir', 'بغرير'] },
  ary_price: { any: ['bch7al', 'bchhal', 'bechhal', 'bshal', 'ch7al', 'chhal', 'بشحال', 'شحال', 'combien', 'bch', 'ch7al hadchi'] },
  ary_thanks: { any: ['chokran', 'choukran', 'shukran', 'merci', 'baraka', 'شكرا', 'بارك', 'bslama', 'بسلامة'] },
  fr_order: { any: ['cafe', 'allonge', 'latte', 'cappuccino', 'espresso', 'au lait', 'the', 'express', 'noisette', 'creme'], not: ['pas de cafe', 'veux pas'] },
  fr_here: { any: ['ici', 'sur place', 'pour ici'] },
  fr_to_go: { any: ['apporter', 'emporter', 'pour emporter', 'pour apporter'] },
  fr_yes: { any: ['oui', 'ouais', 'volontiers', 'avec plaisir', 'chocolatine', 'croissant', 'pourquoi pas'], not: ['non'] },
  fr_bill: { any: ['addition', 'laddition', 'combien', 'je vous dois', 'payer', 'la note'] },
  fr_no: { any: ['non', 'non merci', 'ca va aller', 'pas aujourdhui', 'pas de chocolatine'] },
  fr_price: { any: ['combien', 'ca fait combien', 'je vous dois', 'je te dois', 'le prix'] },
  fr_thanks: { any: ['merci', 'bonne journee', 'bonne fin de journee', 'au revoir', 'salut', 'bye'] },
  ja_order: { any: ['ラテ', 'カフェラテ', 'コーヒー', 'カプチーノ', 'latte', 'rate', 'kohi', 'koohii', 'kōhī', 'coffee', 'kafe'] },
  ja_here: { any: ['店内', 'はい', 'ここ', 'tennai', 'hai', 'koko'] },
  ja_to_go: { any: ['持ち帰り', 'テイクアウト', 'mochikaeri', 'takeout', 'teikuauto'] },
  ja_size: { any: ['s', 'm', 'エス', 'エム', 'ショート', 'トール', 'small', 'medium', 'regular', '普通', 'futsuu'] },
  ja_size_l: { any: ['l', 'エル', 'グランデ', 'large', '大きい', 'ookii'] },
  ja_price: { any: ['いくら', 'ikura', 'お会計', 'okaikei', 'kaikei'] },
  ja_thanks: { any: ['ありがとう', 'arigatou', 'arigato', 'arigatō', 'どうも', 'domo', 'doumo'] },
  en_order: { any: ['latte', 'coffee', 'cappuccino', 'americano', 'cold brew', 'drip', 'espresso', 'tea'], not: ['dont want', 'no coffee'] },
  en_size: { any: ['small', 'medium', 'regular', 'tall'] },
  en_size_large: { any: ['large', 'big', 'grande'] },
  en_here: { any: ['for here', 'here'] },
  en_to_go: { any: ['to go', 'takeaway', 'take away', 'go'] },
  en_price: { any: ['how much', 'what do i owe', 'total', 'price', 'cost'] },
  en_thanks: { any: ['thanks', 'thank you', 'have a good one', 'have a good day', 'bye', 'cheers'] }
};

/* Spanish price helper for Lucía's café (euros). Coffee 1,80; oat +0,30; toast 2,00; croissant 1,60.
   Tea is 1,50 (used in free conversation; see LQ.PACKS['es-spain'].prices). */
LQ.esPrice = v => {
  let cents = 180 + (v.milk === 'oat' ? 30 : 0) + (v.food === 'toast' ? 200 : v.food === 'croissant' ? 160 : 0);
  const words = { 180: 'un euro con ochenta', 210: 'dos euros con diez', 380: 'tres euros con ochenta', 410: 'cuatro euros con diez', 340: 'tres euros con cuarenta', 370: 'tres euros con setenta' };
  const num = '€' + (cents / 100).toFixed(2);
  return { cents, words: words[cents] || (cents / 100).toFixed(2).replace('.', ',') + ' euros', num, numFr: (cents / 100).toFixed(2).replace('.', ',') + ' €' };
};

/* "First words" micro-lessons for tracks whose full missions are still in production.
   Built from each track's hello/thanks pair so every one of the 30 tracks is genuinely playable. */
LQ.firstWords = track => {
  const local = track.local || { name: 'A neighbour', role: 'who lives nearby' };
  const hello = { t: track.hello.t, r: track.hello.r, m: { en: 'Hello', fr: 'Bonjour', es: 'Hola', ru: 'Здравствуйте' } };
  const thanks = { t: track.thanks.t, r: track.thanks.r, m: { en: 'Thank you', fr: 'Merci', es: 'Gracias', ru: 'Спасибо' } };
  return {
    id: 'fw-' + track.id, kind: 'first', track: track.id, chapter: { n: 0, en: 'First words', fr: 'Premiers mots', es: 'Primeras palabras', ru: 'Первые слова' }, minutes: 3, firstWords: true,
    title: { en: 'First words in ' + track.city, fr: 'Premiers mots à ' + track.city, es: 'Primeras palabras en ' + track.city, ru: 'Первые слова: ' + track.city }, scene: 'plaza', character: null, local, status: 'playable',
    skills: ['greet_politely', 'thank_and_close'],
    outcome: { en: 'Hear, anticipate and say hello and thank you.', fr: 'Entendre, anticiper et dire bonjour et merci.', es: 'Escuchar, anticipar y decir hola y gracias.', ru: 'Услышать, предугадать и сказать «здравствуйте» и «спасибо».' },
    focus: { en: 'Hello and thank you', fr: 'Bonjour et merci', es: 'Hola y gracias', ru: 'Здравствуйте и спасибо' },
    context: {
      setup: { en: local.name + ', ' + local.role + ', smiles and greets you.', fr: local.name + ' vous sourit et vous salue.', es: local.name + ' te sonríe y te saluda.', ru: local.name + ' улыбается и здоровается с вами.' },
      line: hello,
      question: { en: 'What did ' + local.name + ' say?', fr: 'Qu’a dit ' + local.name + ' ?', es: '¿Qué dijo ' + local.name + '?', ru: 'Что сказал(а) ' + local.name + '?' },
      options: [{ icon: 'wave', m: { en: 'Hello', fr: 'Bonjour', es: 'Hola', ru: 'Здравствуйте' }, ok: true }, { icon: 'door', m: { en: 'Goodbye', fr: 'Au revoir', es: 'Adiós', ru: 'До свидания' } }, { icon: 'coin', m: { en: 'How much?', fr: 'Combien ?', es: '¿Cuánto?', ru: 'Сколько?' } }]
    },
    expressions: [Object.assign({ id: 'fw-' + track.id + '-hello' }, hello), Object.assign({ id: 'fw-' + track.id + '-thanks' }, thanks)],
    anticipate: [
      { prompt: { en: local.name + ' greets you. Greet them back.', fr: local.name + ' vous salue. Répondez.', es: local.name + ' te saluda. Responde.', ru: local.name + ' здоровается. Ответьте.' }, expr: 'fw-' + track.id + '-hello' },
      { prompt: { en: local.name + ' points you to the café. Thank them.', fr: local.name + ' vous indique le café. Remerciez.', es: local.name + ' te indica el café. Dale las gracias.', ru: local.name + ' показывает вам кафе. Поблагодарите.' }, expr: 'fw-' + track.id + '-thanks' }
    ],
    roleplay: null
  };
};

LQ.missionsFor = (trackId) => {
  const track = LQ.trackById(trackId);
  const own = LQ.MISSIONS.filter(m => m.track === trackId && (m.status === 'playable' || m.status === 'preview'));
  return [LQ.firstWords(track)].concat(own, LQ.templateMissions(trackId), LQ.factoryMissions ? LQ.factoryMissions(trackId) : []);
};
LQ.missionById = id => {
  if (!id) return null;
  if (id.startsWith('fw-')) { const t = LQ.trackById(id.slice(3)); return t ? LQ.firstWords(t) : null; }
  if (id.startsWith('tg-')) { const mt = /^tg-(.+)-(greet|order|way)$/.exec(id); return mt && LQ.trackById(mt[1]) ? (LQ.templateMissions(mt[1]).find(m => m.id === id) || LQ.buildTemplate(mt[1], mt[2])) : null; }
  if (id.startsWith('fx-')) return LQ.factoryMission ? LQ.factoryMission(id) : null;
  return LQ.MISSIONS.find(m => m.id === id) || null;
};
LQ.expressionById = id => {
  if (!id) return null;
  if (id.startsWith('pk-')) return LQ.packExpression(id);
  if (id.startsWith('c-')) return LQ.customExpression ? LQ.customExpression(id) : null;
  if (id.startsWith('fx-')) { const m = LQ.missionById(id.replace(/-(hello|fine|name|bye|thanks|coffee|tea|howmuch|where|slower)$/, '')); const e = m && m.expressions.find(x => x.id === id); return e ? { e, m } : null; }
  for (const m of LQ.MISSIONS) { const e = (m.expressions || []).find(x => x.id === id); if (e) return { e, m }; }
  if (id.startsWith('fw-')) { const tid = id.slice(3).replace(/-(hello|thanks)$/, ''); const t = LQ.trackById(tid); if (!t) return null; const m = LQ.firstWords(t); const e = m.expressions.find(x => x.id === id); if (e) return { e, m }; }
  return null;
};
