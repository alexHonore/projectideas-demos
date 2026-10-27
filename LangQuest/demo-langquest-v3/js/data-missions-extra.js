/* LangQuest V3 — extra hand-written branching missions for the deep courses (Japanese,
   English, French in both regions). Demo-authored, not native-reviewed. Same shape as
   data-missions.js; the template engine adds greet / order / way where a kind is missing. */
'use strict';
(function () {
  const L3 = (en, fr, ru) => ru === undefined ? { en, fr } : { en, fr, ru };
  LQ.MISSIONS.push(
    /* ───────────── Japanese · a konbini at night ───────────── */
    {
      id: 'ja-konbini', kind: 'shop', track: 'japanese', chapter: { n: 2, en: 'Errands in Setagaya', fr: 'Courses à Setagaya' }, minutes: 6,
      title: { en: 'A bento at the konbini', fr: 'Un bento au konbini' }, scene: 'kiosk', character: null, local: { name: 'Sora', role: 'the night-shift clerk' }, status: 'playable',
      skills: ['respond_unexpected', 'choose_option', 'thank_and_close'],
      outcome: { en: 'Answer the clerk’s quick questions: heat the bento, bag or no bag, and how you’ll pay.', fr: 'Répondre aux questions rapides du vendeur : réchauffer le bento, sac ou pas, et le paiement.' },
      focus: { en: 'Yes please / I’m fine: お願いします and 大丈夫です', fr: 'Oui merci / ça ira : お願いします et 大丈夫です' },
      context: {
        setup: { en: '11 p.m. in a Setagaya konbini. You put a bento on the counter. Sora scans it.', fr: '23 h dans un konbini de Setagaya. Vous posez un bento sur le comptoir. Sora le scanne.' },
        line: { t: 'お弁当、温めますか？', r: 'O-bentō, atatamemasu ka?', m: { en: 'Shall I heat up your bento?', fr: 'Je vous réchauffe le bento ?' } },
        question: { en: 'What is Sora asking?', fr: 'Que demande Sora ?' },
        options: [{ icon: 'flame', m: { en: 'Whether to heat it up', fr: 'S’il faut le réchauffer' }, ok: true }, { icon: 'coin', m: { en: 'The price', fr: 'Le prix' } }, { icon: 'clock', m: { en: 'When the shop closes', fr: 'L’heure de fermeture' } }],
        after: { en: 'Konbini staff ask this with every bento. Two answers cover almost everything: お願いします (yes, please) and 大丈夫です (no, I’m fine).', fr: 'On vous le demande pour chaque bento. Deux réponses suffisent presque toujours : お願いします (oui, s’il vous plaît) et 大丈夫です (non, ça ira).' }
      },
      expressions: [
        { id: 'ja-onegai', t: 'はい、お願いします。', r: 'Hai, onegai shimasu.', m: { en: 'Yes, please.', fr: 'Oui, s’il vous plaît.' } },
        { id: 'ja-daijoubu', t: '大丈夫です。', r: 'Daijōbu desu.', m: { en: 'I’m fine (no, thank you).', fr: 'Ça ira (non merci).' }, note: { en: 'Literally “it’s fine”: the polite way to decline.', fr: 'Littéralement « ça va » : la façon polie de refuser.' } },
        { id: 'ja-kaado', t: 'カードで。', r: 'Kādo de.', m: { en: 'By card.', fr: 'Par carte.' }, note: { en: 'Cash: 現金で (genkin de).', fr: 'En liquide : 現金で (genkin de).' } }
      ],
      anticipate: [
        { prompt: { en: 'Sora offers to heat your bento. Say yes, please.', fr: 'Sora propose de réchauffer le bento. Dites oui, s’il vous plaît.' }, expr: 'ja-onegai' },
        { prompt: { en: 'Sora asks if you need a bag. Politely decline.', fr: 'Sora demande si vous voulez un sac. Refusez poliment.' }, expr: 'ja-daijoubu' },
        { prompt: { en: 'Say you’ll pay by card.', fr: 'Dites que vous payez par carte.' }, expr: 'ja-kaado' }
      ],
      roleplay: {
        start: 't1', turns: {
          t1: { say: { t: 'お弁当、温めますか？', r: 'O-bentō, atatamemasu ka?', m: { en: 'Shall I heat up your bento?', fr: 'Je vous réchauffe le bento ?' } }, hint: { en: '“Hai, onegai shimasu.” or “Daijōbu desu.”', fr: '« Hai, onegai shimasu. » ou « Daijōbu desu. »' }, suggest: ['はい、お願いします。', 'Daijōbu desu.'],
            clarify: { t: '温めますか？', r: 'Atatamemasu ka?', m: { en: 'Heat it up?', fr: 'Je le réchauffe ?' } },
            expect: [{ intent: 'ja_decline', skill: 'respond_unexpected', next: 't2', set: { heat: 'no' }, reply: { t: 'かしこまりました。', r: 'Kashikomarimashita.', m: { en: 'Certainly.', fr: 'Très bien.' } } },
              { intent: 'ja_please', skill: 'respond_unexpected', next: 't2', set: { heat: 'yes' }, reply: { t: '少々お待ちください。', r: 'Shōshō o-machi kudasai.', m: { en: 'One moment, please.', fr: 'Un instant, s’il vous plaît.' } } }] },
          t2: { say: { t: '袋はご利用ですか？', r: 'Fukuro wa go-riyō desu ka?', m: { en: 'Would you like a bag?', fr: 'Vous voulez un sac ?' } }, unexpected: true, hint: { en: '“Daijōbu desu.” (no bag) or “Onegai shimasu.”', fr: '« Daijōbu desu. » (pas de sac) ou « Onegai shimasu. »' }, suggest: ['大丈夫です。', 'はい、お願いします。'],
            clarify: { t: '袋、ご利用ですか？', r: 'Fukuro, go-riyō desu ka?', m: { en: 'A bag?', fr: 'Un sac ?' } },
            expect: [{ intent: 'ja_decline', skill: 'respond_unexpected', next: 't3', set: { bag: 'no' }, reply: null }, { intent: 'ja_please', skill: 'respond_unexpected', next: 't3', set: { bag: 'yes' }, reply: { t: '三円になります。', r: 'San-en ni narimasu.', m: { en: 'That’s 3 yen for the bag.', fr: 'Le sac fait 3 yens.' } } }] },
          t3: { say: { t: 'お支払いはどうなさいますか？', r: 'O-shiharai wa dō nasaimasu ka?', m: { en: 'How would you like to pay?', fr: 'Comment souhaitez-vous payer ?' } }, hint: { en: '“Kādo de.” or “Genkin de.”', fr: '« Kādo de. » ou « Genkin de. »' }, suggest: ['カードで。', '現金で。'],
            clarify: { t: 'お支払いは？', r: 'O-shiharai wa?', m: { en: 'Payment?', fr: 'Le paiement ?' } },
            expect: [{ intent: 'ja_card', skill: 'choose_option', next: 't4', set: { pay: 'card' }, reply: { t: 'こちらにタッチしてください。', r: 'Kochira ni tacchi shite kudasai.', m: { en: 'Please tap here.', fr: 'Approchez la carte ici.' } } },
              { intent: 'ja_cash', skill: 'choose_option', next: 't4', set: { pay: 'cash' }, reply: v => ({ t: v.bag === 'yes' ? '五百二十三円です。' : '五百二十円です。', r: v.bag === 'yes' ? 'Gohyaku nijūsan en desu.' : 'Gohyaku nijū en desu.', m: { en: v.bag === 'yes' ? 'That’s 523 yen.' : 'That’s 520 yen.', fr: v.bag === 'yes' ? 'Ça fait 523 yens.' : 'Ça fait 520 yens.' } }) }] },
          t4: { say: null, hint: { en: '“Arigatō gozaimasu.”', fr: '« Arigatō gozaimasu. »' }, suggest: ['ありがとうございます。'],
            expect: [{ intent: 'ja_thanks', skill: 'thank_and_close', next: null, reply: { t: 'ありがとうございました。', r: 'Arigatō gozaimashita.', m: { en: 'Thank you very much.', fr: 'Merci beaucoup.' } } }] }
        }
      },
      recall: {
        'ja-onegai': { scene: 'tokyo-cafe', character: 'haruto', line: { t: 'お水、お持ちしましょうか？', r: 'O-mizu, o-mochi shimashō ka?', m: { en: 'Shall I bring you some water?', fr: 'Je vous apporte de l’eau ?' } }, task: { en: 'Back at the café, Haruto offers water. Say yes, please.', fr: 'De retour au café, Haruto propose de l’eau. Dites oui, s’il vous plaît.' } },
        'ja-daijoubu': { scene: 'station', character: null, local: { name: 'Sora', role: 'a station attendant' }, line: { t: 'お手伝いしましょうか？', r: 'O-tetsudai shimashō ka?', m: { en: 'Can I help you?', fr: 'Je peux vous aider ?' } }, task: { en: 'At the station someone offers help you don’t need. Decline politely.', fr: 'À la gare, on vous propose une aide inutile. Refusez poliment.' } },
        'ja-kaado': { scene: 'tokyo-cafe', character: 'haruto', line: { t: 'お会計はどうされますか？', r: 'O-kaikei wa dō saremasu ka?', m: { en: 'How will you settle the bill?', fr: 'Comment réglez-vous ?' } }, task: { en: 'Paying at the café: say by card.', fr: 'Au café, pour payer : dites par carte.' } }
      }
    },

    /* ───────────── English (US) · a Brooklyn bodega ───────────── */
    {
      id: 'en-bodega', kind: 'shop', track: 'english', chapter: { n: 2, en: 'Around the block', fr: 'Dans le quartier', ru: 'По соседству' }, minutes: 6,
      title: { en: 'A sandwich at the bodega', fr: 'Un sandwich à la bodega', ru: 'Сэндвич в бодеге' }, scene: 'kiosk', character: null, local: { name: 'Rosa', role: 'behind the bodega counter' }, status: 'playable',
      skills: ['request_item', 'choose_option', 'respond_unexpected', 'thank_and_close'],
      outcome: { en: 'Order a breakfast sandwich, choose the bread, answer the quick “salt, pepper, ketchup?” and wrap up.', fr: 'Commander un sandwich du matin, choisir le pain, répondre au rapide « salt, pepper, ketchup? » et conclure.', ru: 'Заказать сэндвич, выбрать хлеб, ответить на быстрый вопрос «salt, pepper, ketchup?» и закончить.' },
      focus: { en: 'Fast New York counter talk', fr: 'Le parler rapide du comptoir new-yorkais', ru: 'Быстрая речь у прилавка в Нью-Йорке' },
      context: {
        setup: { en: '8 a.m., a corner bodega in Bed-Stuy. A cat sleeps on the chips. Rosa is at the grill.', fr: '8 h, une bodega au coin d’une rue de Bed-Stuy. Un chat dort sur les chips. Rosa est au grill.', ru: '8 утра, бодега на углу в Бед-Стай. На чипсах спит кот. Роза у гриля.' },
        line: { t: 'Morning! What can I get you?', m: { en: 'Morning! What can I get you?', fr: 'Bonjour ! Je te sers quoi ?', ru: 'Доброе утро! Что вам?' } },
        question: { en: 'What is Rosa asking?', fr: 'Que demande Rosa ?', ru: 'О чём спрашивает Роза?' },
        options: [{ icon: 'cup', m: { en: 'What you’d like', fr: 'Ce que tu veux', ru: 'Что вы хотите' }, ok: true }, { icon: 'pin', m: { en: 'Where you live', fr: 'Où tu habites', ru: 'Где вы живёте' } }, { icon: 'clock', m: { en: 'What time it is', fr: 'L’heure', ru: 'Который час' } }],
        after: { en: 'The bodega classic is a “bacon, egg and cheese”, often just “B.E.C.”.', fr: 'Le classique de la bodega : le « bacon, egg and cheese », souvent juste « B.E.C. ».', ru: 'Классика бодеги — «bacon, egg and cheese», часто просто «B.E.C.».' }
      },
      expressions: [
        { id: 'en-bec', t: 'Can I get a bacon, egg and cheese?', m: { en: 'Can I get a bacon, egg and cheese?', fr: 'Je peux avoir un bacon, œuf, fromage ?', ru: 'Можно сэндвич с беконом, яйцом и сыром?' } },
        { id: 'en-on-a-roll', t: 'On a roll, please.', m: { en: 'On a roll, please.', fr: 'Dans un petit pain, s’il te plaît.', ru: 'На булочке, пожалуйста.' }, note: { en: 'Or “on a bagel”.', fr: 'Ou « on a bagel ».', ru: 'Или «on a bagel».' } },
        { id: 'en-thats-it', t: 'That’s it, thanks.', m: { en: 'That’s it, thanks.', fr: 'C’est tout, merci.', ru: 'Это всё, спасибо.' } }
      ],
      anticipate: [
        { prompt: { en: 'Order the bodega classic.', fr: 'Commande le classique de la bodega.', ru: 'Закажите классику бодеги.' }, expr: 'en-bec' },
        { prompt: { en: 'Rosa asks “roll or bagel?”. Choose the roll.', fr: 'Rosa demande « roll or bagel? ». Choisis le petit pain.', ru: 'Роза спрашивает «roll or bagel?». Выберите булочку.' }, expr: 'en-on-a-roll' },
        { prompt: { en: '“Anything else?” Say that’s all.', fr: '« Anything else? » Dis que c’est tout.', ru: '«Anything else?» Скажите, что это всё.' }, expr: 'en-thats-it' }
      ],
      roleplay: {
        start: 't1', turns: {
          t1: { say: { t: 'Morning! What can I get you?', m: { en: 'Morning! What can I get you?', fr: 'Bonjour ! Je te sers quoi ?', ru: 'Доброе утро! Что вам?' } }, hint: { en: '“Can I get a bacon, egg and cheese?”', fr: '« Can I get a bacon, egg and cheese? »', ru: '«Can I get a bacon, egg and cheese?»' }, suggest: ['Can I get a bacon, egg and cheese?', 'Just an egg and cheese, please.'],
            clarify: { t: 'Sorry, what was that?', m: { en: 'Sorry, what was that?', fr: 'Pardon, quoi ?', ru: 'Простите, что?' } },
            expect: [{ intent: 'en_sandwich', skill: 'request_item', next: 't2', reply: { t: 'You got it.', m: { en: 'You got it.', fr: 'Ça marche.', ru: 'Без проблем.' } } }] },
          t2: { say: { t: 'Roll or bagel?', fast: true, m: { en: 'Roll or bagel?', fr: 'Petit pain ou bagel ?', ru: 'Булочка или бейгл?' } }, fast: true, hint: { en: '“On a roll, please.” or “On a bagel.”', fr: '« On a roll, please. » ou « On a bagel. »', ru: '«On a roll, please.» или «On a bagel.»' }, suggest: ['On a roll, please.', 'A bagel, please.'],
            clarify: { t: 'Roll or bagel, hon?', m: { en: 'Roll or bagel, hon?', fr: 'Petit pain ou bagel ?', ru: 'Булочка или бейгл?' } },
            expect: [{ intent: 'en_bagel', skill: 'choose_option', next: 't3', set: { bread: 'bagel' }, reply: null }, { intent: 'en_roll', skill: 'choose_option', next: 't3', set: { bread: 'roll' }, reply: null }] },
          t3: { say: { t: 'Salt, pepper, ketchup?', fast: true, m: { en: 'Salt, pepper, ketchup?', fr: 'Sel, poivre, ketchup ?', ru: 'Соль, перец, кетчуп?' } }, fast: true, unexpected: true, hint: { en: '“Yeah, everything.” or “Just salt and pepper.” or “No, thanks.”', fr: '« Yeah, everything. » ou « No, thanks. »', ru: '«Yeah, everything.» или «No, thanks.»' }, suggest: ['Yeah, everything.', 'No ketchup, thanks.'],
            clarify: { t: 'S-P-K? Salt, pepper, ketchup?', m: { en: 'Salt, pepper, ketchup?', fr: 'Sel, poivre, ketchup ?', ru: 'Соль, перец, кетчуп?' } },
            expect: [{ intent: 'en_plain', skill: 'respond_unexpected', next: 't4', set: { spk: 'none' }, reply: { t: 'Plain. Got it.', m: { en: 'Plain. Got it.', fr: 'Nature. Compris.', ru: 'Без всего. Понял.' } } },
              { intent: 'en_everything', skill: 'respond_unexpected', next: 't4', set: { spk: 'all' }, reply: { t: 'The works.', m: { en: 'The works.', fr: 'Avec tout.', ru: 'Со всем.' } } }] },
          t4: { say: { t: 'Anything else?', m: { en: 'Anything else?', fr: 'Autre chose ?', ru: 'Что-нибудь ещё?' } }, hint: { en: '“That’s it, thanks.”', fr: '« That’s it, thanks. »', ru: '«That’s it, thanks.»' }, suggest: ['That’s it, thanks.', 'And a coffee, please.'],
            clarify: { t: 'Anything else for you?', m: { en: 'Anything else for you?', fr: 'Autre chose ?', ru: 'Что-нибудь ещё?' } },
            expect: [{ intent: 'en_thats_it', skill: 'thank_and_close', next: null, reply: { t: 'Six fifty. Have a good one!', m: { en: '$6.50. Have a good one!', fr: '6,50 $. Bonne journée !', ru: '6,50 $. Хорошего дня!' } } },
              { intent: 'en_order', skill: 'request_item', next: 't4', stay: true, set: { coffee: true }, reply: { t: 'Coffee, regular? Sure.', m: { en: 'Coffee, milk and sugar? Sure.', fr: 'Un café, lait et sucre ? Pas de souci.', ru: 'Кофе с молоком и сахаром? Конечно.' } } }] }
        }
      },
      recall: {
        'en-bec': { scene: 'brooklyn-cafe', character: 'jordan', line: { t: 'Hey! We’ve got breakfast sandwiches now. Want one?', m: { en: 'Hey! We have breakfast sandwiches now. Want one?', fr: 'Salut ! On a des sandwichs du matin maintenant. Tu en veux un ?', ru: 'Привет! У нас теперь есть сэндвичи. Хотите?' } }, task: { en: 'Jordan’s café now has sandwiches. Order a bacon, egg and cheese.', fr: 'Le café de Jordan fait des sandwichs. Commande un bacon, egg and cheese.', ru: 'В кафе Джордана теперь есть сэндвичи. Закажите bacon, egg and cheese.' } },
        'en-on-a-roll': { scene: 'plaza', character: null, local: { name: 'Rosa', role: 'at a food cart' }, line: { t: 'Roll or bagel?', m: { en: 'Roll or bagel?', fr: 'Petit pain ou bagel ?', ru: 'Булочка или бейгл?' } }, task: { en: 'A food cart in the park. Choose the roll.', fr: 'Un food truck au parc. Choisis le petit pain.', ru: 'Фудкорт в парке. Выберите булочку.' } },
        'en-thats-it': { scene: 'brooklyn-cafe', character: 'jordan', line: { t: 'Anything else today?', m: { en: 'Anything else today?', fr: 'Autre chose aujourd’hui ?', ru: 'Что-нибудь ещё сегодня?' } }, task: { en: 'At the café: say that’s all.', fr: 'Au café : dis que c’est tout.', ru: 'В кафе скажите, что это всё.' } }
      }
    },

    /* ───────────── French (Québec) · a Montréal dépanneur ───────────── */
    {
      id: 'fr-depanneur', kind: 'shop', track: 'french', region: 'ca', chapter: { n: 3, en: 'Plateau errands', fr: 'Courses sur le Plateau', ru: 'Покупки на Плато' }, minutes: 6,
      title: { en: 'Milk at the dépanneur', fr: 'Du lait au dépanneur', ru: 'Молоко в «депанёре»' }, scene: 'kiosk', character: null, local: { name: 'Mathieu', role: 'au comptoir du dépanneur' }, status: 'playable',
      skills: ['request_item', 'respond_unexpected', 'ask_price', 'thank_and_close'],
      outcome: { en: 'Ask where something is, answer the bag question, ask the price and thank Mathieu, in Québec French.', fr: 'Demander où se trouve un article, répondre pour le sac, demander le prix et remercier Mathieu, en français québécois.', ru: 'Спросить, где товар, ответить про пакет, узнать цену и поблагодарить Матьё — по-квебекски.' },
      focus: { en: 'Québec everyday words: dépanneur, sac, ça va faire', fr: 'Mots du quotidien au Québec', ru: 'Квебекские слова: dépanneur, sac, ça va faire' },
      context: {
        setup: { en: 'A dépanneur on rue Rachel, Montréal. Snow boots by the door. Mathieu looks up from his phone.', fr: 'Un dépanneur rue Rachel, à Montréal. Des bottes près de la porte. Mathieu lève les yeux de son téléphone.', ru: 'Депанёр на улице Рашель, Монреаль. У двери зимние ботинки. Матьё отрывается от телефона.' },
        line: { t: 'Allô ! Je peux-tu t’aider ?', m: { en: 'Hi! Can I help you?', fr: 'Bonjour ! Je peux t’aider ?', ru: 'Привет! Чем помочь?' } },
        question: { en: 'What is Mathieu asking?', fr: 'Que demande Mathieu ?', ru: 'О чём спрашивает Матьё?' },
        options: [{ icon: 'hand', m: { en: 'If he can help you', fr: 'S’il peut t’aider', ru: 'Может ли он помочь' }, ok: true }, { icon: 'snow', m: { en: 'If it’s snowing', fr: 'S’il neige', ru: 'Идёт ли снег' } }, { icon: 'coin', m: { en: 'The price of milk', fr: 'Le prix du lait', ru: 'Сколько стоит молоко' } }],
        after: { en: '“Je peux-tu…?” is spoken Québec French: the “-tu” marks a yes/no question.', fr: '« Je peux-tu… ? » : en québécois parlé, « -tu » marque la question.', ru: '«Je peux-tu…?» — разговорный квебекский: «-tu» делает фразу вопросом.' }
      },
      expressions: [
        { id: 'fr-vous-avez-lait', t: 'Avez-vous du lait ?', m: { en: 'Do you have milk?', ru: 'У вас есть молоко?', fr: 'Avez-vous du lait ?' } },
        { id: 'fr-pas-de-sac', t: 'Pas besoin de sac, merci.', m: { en: 'No need for a bag, thanks.', ru: 'Пакет не нужен, спасибо.', fr: 'Pas besoin de sac, merci.' } },
        { id: 'fr-ca-fait-combien', t: 'Ça fait combien ?', m: { en: 'How much is it?', ru: 'Сколько с меня?', fr: 'Ça fait combien ?' } }
      ],
      anticipate: [
        { prompt: { en: 'Ask Mathieu if they have milk.', ru: 'Спросите Матьё, есть ли молоко.', fr: 'Demandez s’il y a du lait.' }, expr: 'fr-vous-avez-lait' },
        { prompt: { en: 'He offers a bag. Say you don’t need one.', ru: 'Он предлагает пакет. Скажите, что не нужно.', fr: 'Il propose un sac. Dites que ce n’est pas nécessaire.' }, expr: 'fr-pas-de-sac' },
        { prompt: { en: 'Ask how much it is.', ru: 'Спросите, сколько это стоит.', fr: 'Demandez combien ça coûte.' }, expr: 'fr-ca-fait-combien' }
      ],
      roleplay: {
        start: 't1', turns: {
          t1: { say: { t: 'Allô ! Je peux-tu t’aider ?', m: { en: 'Hi! Can I help you?', ru: 'Привет! Чем помочь?', fr: 'Bonjour ! Je peux t’aider ?' } }, hint: { en: '“Avez-vous du lait ?”', ru: '«Avez-vous du lait ?»', fr: '« Avez-vous du lait ? »' }, suggest: ['Avez-vous du lait ?', 'Je cherche du lait.'],
            clarify: { t: 'Pardon ? Tu cherches quoi ?', m: { en: 'Sorry? What are you looking for?', ru: 'Простите? Что вы ищете?', fr: 'Pardon ? Tu cherches quoi ?' } },
            expect: [{ intent: 'fr_looking', skill: 'request_item', next: 't2', reply: { t: 'Oui, dans le frigo au fond, à gauche.', m: { en: 'Yes, in the fridge at the back, on the left.', ru: 'Да, в холодильнике в глубине, слева.', fr: 'Oui, dans le frigo au fond, à gauche.' } } }] },
          t2: { say: { t: 'Veux-tu un sac avec ça ?', m: { en: 'Do you want a bag with that?', ru: 'Пакет нужен?', fr: 'Tu veux un sac ?' } }, unexpected: true, hint: { en: '“Pas besoin de sac, merci.” or “Oui, s’il vous plaît.”', ru: '«Pas besoin de sac, merci.» или «Oui, s’il vous plaît.»', fr: '« Pas besoin de sac, merci. »' }, suggest: ['Pas besoin de sac, merci.', 'Oui, un sac, s’il vous plaît.'],
            clarify: { t: 'Un sac ?', m: { en: 'A bag?', ru: 'Пакет?', fr: 'Un sac ?' } },
            expect: [{ intent: 'fr_no_bag', skill: 'respond_unexpected', next: 't3', set: { bag: 'no' }, reply: { t: 'Parfait.', m: { en: 'Perfect.', ru: 'Отлично.', fr: 'Parfait.' } } }, { intent: 'fr_yes', skill: 'respond_unexpected', next: 't3', set: { bag: 'yes' }, reply: { t: 'Pas de trouble.', m: { en: 'No problem.', ru: 'Без проблем.', fr: 'Pas de problème.' } } }] },
          t3: { say: null, hint: { en: '“Ça fait combien ?”', ru: '«Ça fait combien ?»', fr: '« Ça fait combien ? »' }, suggest: ['Ça fait combien ?'],
            expect: [{ intent: 'fr_price', skill: 'ask_price', next: 't4', reply: v => v.bag === 'yes' ? { t: 'Ça va faire 4,35 $, avec le sac.', m: { en: 'That’ll be $4.35, with the bag.', ru: 'С вас 4,35 $, с пакетом.', fr: 'Ça fera 4,35 $, avec le sac.' } } : { t: 'Ça va faire 4,25 $.', m: { en: 'That’ll be $4.25.', ru: 'С вас 4,25 $.', fr: 'Ça fera 4,25 $.' } } }] },
          t4: { say: null, hint: { en: '“Merci, bonne journée !”', ru: '«Merci, bonne journée !»', fr: '« Merci, bonne journée ! »' }, suggest: ['Merci, bonne journée !'],
            expect: [{ intent: 'fr_thanks', skill: 'thank_and_close', next: null, reply: { t: 'Bonne journée, là !', m: { en: 'Have a good one!', ru: 'Хорошего дня!', fr: 'Bonne journée !' } } }] }
        }
      },
      recall: {
        'fr-vous-avez-lait': { scene: 'montreal-cafe', character: 'emilie', line: { t: 'Il te manque quelque chose ?', m: { en: 'Are you missing something?', ru: 'Вам чего-то не хватает?', fr: 'Il te manque quelque chose ?' } }, task: { en: 'At Émilie’s café: ask if they have milk for your coffee.', ru: 'В кафе Эмили спросите, есть ли молоко для кофе.', fr: 'Au café d’Émilie : demandez s’il y a du lait.' } },
        'fr-pas-de-sac': { scene: 'plaza', character: null, local: { name: 'Mathieu', role: 'au marché Jean-Talon' }, line: { t: 'Je te mets ça dans un sac ?', m: { en: 'Shall I put that in a bag?', ru: 'Положить в пакет?', fr: 'Je vous mets ça dans un sac ?' } }, task: { en: 'At Jean-Talon market: say you don’t need a bag.', ru: 'На рынке Жан-Талон скажите, что пакет не нужен.', fr: 'Au marché Jean-Talon : dites que vous n’avez pas besoin de sac.' } },
        'fr-ca-fait-combien': { scene: 'montreal-cafe', character: 'emilie', line: { t: 'Et voilà ta chocolatine !', m: { en: 'Here’s your chocolatine!', ru: 'Вот ваша шоколадная булочка!', fr: 'Et voilà ta chocolatine !' } }, task: { en: 'Ask Émilie how much it is.', ru: 'Спросите Эмили, сколько это стоит.', fr: 'Demandez à Émilie combien ça fait.' } }
      }
    },

    /* ───────────── French (France) · the Aligre market ───────────── */
    {
      id: 'fr-marche', kind: 'shop', track: 'french', region: 'fr', chapter: { n: 3, en: 'Marché d’Aligre', fr: 'Marché d’Aligre', ru: 'Рынок Алигр' }, minutes: 7,
      title: { en: 'Tomatoes at the Aligre market', fr: 'Des tomates au marché d’Aligre', ru: 'Помидоры на рынке Алигр' }, scene: 'plaza', character: null, local: { name: 'Sandrine', role: 'maraîchère au marché d’Aligre' }, status: 'playable',
      skills: ['request_item', 'respond_unexpected', 'ask_price', 'thank_and_close'],
      outcome: { en: 'Ask for a kilo of tomatoes, answer “avec ceci ?”, ask the price and thank Sandrine.', fr: 'Demander un kilo de tomates, répondre à « avec ceci ? », demander le prix et remercier Sandrine.', ru: 'Попросить килограмм помидоров, ответить на «avec ceci ?», узнать цену и поблагодарить Сандрин.' },
      focus: { en: 'Market French: je voudrais, avec ceci, ce sera tout', fr: 'Le français du marché', ru: 'Рыночный французский: je voudrais, avec ceci, ce sera tout' },
      context: {
        setup: { en: 'Saturday morning at the Marché d’Aligre, Paris 12e. Crates of tomatoes, a radio, Sandrine calling out prices.', fr: 'Samedi matin au marché d’Aligre, Paris 12e. Des cagettes de tomates, une radio, Sandrine annonce les prix.', ru: 'Субботнее утро на рынке Алигр, 12-й округ Парижа. Ящики помидоров, радио, Сандрин выкрикивает цены.' },
        line: { t: 'Bonjour ! Qu’est-ce qu’il vous faut ?', m: { en: 'Hello! What do you need?', ru: 'Здравствуйте! Что вам нужно?', fr: 'Bonjour ! Qu’est-ce qu’il vous faut ?' } },
        question: { en: 'What is Sandrine asking?', fr: 'Que demande Sandrine ?', ru: 'О чём спрашивает Сандрин?' },
        options: [{ icon: 'flower', m: { en: 'What you need', fr: 'Ce qu’il vous faut', ru: 'Что вам нужно' }, ok: true }, { icon: 'umbrella', m: { en: 'If it will rain', fr: 'S’il va pleuvoir', ru: 'Будет ли дождь' } }, { icon: 'route', m: { en: 'Where the metro is', fr: 'Où est le métro', ru: 'Где метро' } }],
        after: { en: '“Qu’est-ce qu’il vous faut ?” is the market version of “what can I get you?”.', fr: '« Qu’est-ce qu’il vous faut ? » : la version marché de « que puis-je pour vous ? ».', ru: '«Qu’est-ce qu’il vous faut ?» — рыночный вариант «что вам предложить?».' }
      },
      expressions: [
        { id: 'fr-kilo-tomates', t: 'Je voudrais un kilo de tomates, s’il vous plaît.', m: { en: 'I’d like a kilo of tomatoes, please.', ru: 'Мне килограмм помидоров, пожалуйста.', fr: 'Je voudrais un kilo de tomates, s’il vous plaît.' } },
        { id: 'fr-ce-sera-tout', t: 'Ce sera tout, merci.', m: { en: 'That’ll be all, thanks.', ru: 'Это всё, спасибо.', fr: 'Ce sera tout, merci.' } },
        { id: 'fr-je-vous-dois', t: 'Je vous dois combien ?', m: { en: 'How much do I owe you?', ru: 'Сколько я вам должен?', fr: 'Je vous dois combien ?' } }
      ],
      anticipate: [
        { prompt: { en: 'Ask for a kilo of tomatoes, politely.', ru: 'Вежливо попросите килограмм помидоров.', fr: 'Demandez poliment un kilo de tomates.' }, expr: 'fr-kilo-tomates' },
        { prompt: { en: '“Avec ceci ?” Say that’s all.', ru: '«Avec ceci ?» Скажите, что это всё.', fr: '« Avec ceci ? » Dites que c’est tout.' }, expr: 'fr-ce-sera-tout' },
        { prompt: { en: 'Ask how much you owe.', ru: 'Спросите, сколько вы должны.', fr: 'Demandez combien vous devez.' }, expr: 'fr-je-vous-dois' }
      ],
      roleplay: {
        start: 't1', turns: {
          t1: { say: { t: 'Bonjour ! Qu’est-ce qu’il vous faut ?', m: { en: 'Hello! What do you need?', ru: 'Здравствуйте! Что вам нужно?', fr: 'Bonjour ! Qu’est-ce qu’il vous faut ?' } }, hint: { en: '“Je voudrais un kilo de tomates.”', ru: '«Je voudrais un kilo de tomates.»', fr: '« Je voudrais un kilo de tomates. »' }, suggest: ['Je voudrais un kilo de tomates, s’il vous plaît.', 'Des tomates, s’il vous plaît.'],
            clarify: { t: 'Pardon ? Qu’est-ce que je vous mets ?', m: { en: 'Sorry? What shall I give you?', ru: 'Простите? Что вам положить?', fr: 'Pardon ? Qu’est-ce que je vous mets ?' } },
            expect: [{ intent: 'fr_tomatoes', skill: 'request_item', next: 't2', reply: { t: 'Un kilo de tomates. Elles sont belles, hein ?', m: { en: 'A kilo of tomatoes. Lovely, aren’t they?', ru: 'Килограмм помидоров. Хороши, правда?', fr: 'Un kilo de tomates. Elles sont belles, hein ?' } } }] },
          t2: { say: { t: 'Avec ceci ?', fast: true, m: { en: 'Anything else?', ru: 'Что-нибудь ещё?', fr: 'Avec ceci ?' } }, fast: true, unexpected: true, hint: { en: '“Ce sera tout, merci.” or ask for something else: “Et des fraises.”', ru: '«Ce sera tout, merci.» или попросите ещё: «Et des fraises.»', fr: '« Ce sera tout, merci. »' }, suggest: ['Ce sera tout, merci.', 'Et une barquette de fraises.'],
            clarify: { t: 'Avec ceci ? Autre chose ?', m: { en: 'Anything else?', ru: 'Ещё что-нибудь?', fr: 'Avec ceci ? Autre chose ?' } },
            expect: [{ intent: 'fr_thats_all', skill: 'respond_unexpected', next: 't3', reply: null },
              { intent: 'fr_strawberries', skill: 'respond_unexpected', next: 't2', stay: true, set: { more: 'fraises' }, reply: { t: 'Une barquette de fraises. Et avec ça ?', m: { en: 'A punnet of strawberries. Anything else?', ru: 'Коробочка клубники. Что-то ещё?', fr: 'Une barquette de fraises. Et avec ça ?' } } }] },
          t3: { say: null, hint: { en: '“Je vous dois combien ?”', ru: '«Je vous dois combien ?»', fr: '« Je vous dois combien ? »' }, suggest: ['Je vous dois combien ?'],
            expect: [{ intent: 'fr_price', skill: 'ask_price', next: 't4', reply: v => v.more ? { t: 'Ça vous fera 7,50 €.', m: { en: 'That’ll be €7.50.', ru: 'С вас 7,50 €.', fr: 'Ça vous fera 7,50 €.' } } : { t: 'Ça vous fera 3,20 €.', m: { en: 'That’ll be €3.20.', ru: 'С вас 3,20 €.', fr: 'Ça vous fera 3,20 €.' } } }] },
          t4: { say: null, hint: { en: '“Merci, bonne journée !”', ru: '«Merci, bonne journée !»', fr: '« Merci, bonne journée ! »' }, suggest: ['Merci, bonne journée !'],
            expect: [{ intent: 'fr_thanks', skill: 'thank_and_close', next: null, reply: { t: 'Merci à vous, bon week-end !', m: { en: 'Thank you, have a good weekend!', ru: 'Спасибо вам, хороших выходных!', fr: 'Merci à vous, bon week-end !' } } }] }
        }
      },
      recall: {
        'fr-kilo-tomates': { scene: 'paris-cafe', character: 'theo', line: { t: 'Je vous prépare une salade ? Il me faut des tomates…', m: { en: 'Shall I make you a salad? I need tomatoes…', ru: 'Приготовить вам салат? Мне нужны помидоры…', fr: 'Je vous prépare une salade ? Il me faut des tomates…' } }, task: { en: 'Théo jokes he’s out of tomatoes. Ask for a kilo, as at the market.', ru: 'Тео шутит, что помидоры кончились. Попросите килограмм, как на рынке.', fr: 'Théo n’a plus de tomates. Demandez-en un kilo, comme au marché.' } },
        'fr-ce-sera-tout': { scene: 'paris-cafe', character: 'theo', line: { t: 'Et avec ceci ?', m: { en: 'Anything else?', ru: 'Что-нибудь ещё?', fr: 'Et avec ceci ?' } }, task: { en: 'At the café, Théo asks if you want anything else. Say that’s all.', ru: 'В кафе Тео спрашивает, нужно ли что-то ещё. Скажите, что это всё.', fr: 'Au café, Théo demande autre chose. Dites que c’est tout.' } },
        'fr-je-vous-dois': { scene: 'plaza', character: null, local: { name: 'Sandrine', role: 'au marché' }, line: { t: 'Voilà vos fraises !', m: { en: 'Here are your strawberries!', ru: 'Вот ваша клубника!', fr: 'Voilà vos fraises !' } }, task: { en: 'Another stall: ask how much you owe.', ru: 'Другой прилавок: спросите, сколько вы должны.', fr: 'Un autre stand : demandez combien vous devez.' } }
      }
    }
  );
  Object.assign(LQ.INTENTS, {
    ja_please: { any: ['お願いします', 'おねがいします', 'お願い', 'onegai', 'はい', 'hai', 'ええ', 'yes please'], not: ['大丈夫', 'だいじょうぶ', 'daijoubu', 'daijobu', 'いいえ', 'iie', '結構', 'kekkou'] },
    ja_decline: { any: ['大丈夫', 'だいじょうぶ', 'daijoubu', 'daijobu', 'daijōbu', 'いいえ', 'iie', '結構', 'けっこう', 'kekkou', 'いらない', 'iranai', 'なし', 'nashi'] },
    ja_card: { any: ['カード', 'kaado', 'kado', 'kādo', 'card', 'スイカ', 'suica', 'パスモ', 'pasmo', 'ic', 'クレジット', 'paypay'] },
    ja_cash: { any: ['現金', 'げんきん', 'genkin', 'cash', 'お金'] },
    en_sandwich: { any: ['bacon egg and cheese', 'bacon egg', 'egg and cheese', 'bec', 'b e c', 'sandwich', 'bacon', 'breakfast'], not: ['no sandwich', 'dont want', 'do not want'] },
    en_roll: { any: ['roll', 'kaiser', 'hero', 'bread'] },
    en_bagel: { any: ['bagel', 'everything bagel'] },
    en_plain: { any: ['no', 'nothing', 'plain', 'none', 'without', 'nah', 'no thanks', 'just salt', 'just pepper', 'no ketchup'] },
    en_everything: { any: ['everything', 'all of it', 'the works', 'yes', 'yeah', 'yep', 'sure', 'salt', 'pepper', 'ketchup', 'please'] },
    en_thats_it: { any: ['thats it', 'that s it', 'thats all', 'that is all', 'thats everything', 'nothing else', 'im good', 'i m good', 'all good', 'no thanks', 'no thank you', 'thats it thanks'] },
    fr_looking: { any: ['lait', 'avez vous', 'vous avez', 'je cherche', 'est ce que vous avez', 'il y a', 'y a tu', 'ou est', 'ou sont'], not: ['pas de lait'] },
    fr_no_bag: { any: ['pas besoin', 'pas de sac', 'non merci', 'non', 'ca va', 'ca va aller', 'pas necessaire', 'jai un sac'] },
    fr_tomatoes: { any: ['tomate', 'tomates', 'un kilo', 'je voudrais', 'il me faut', 'je vais prendre', 'donnez moi'], not: ['pas de tomates'] },
    fr_thats_all: { any: ['ce sera tout', 'cest tout', 'c est tout', 'rien dautre', 'rien d autre', 'ca sera tout', 'ca ira', 'cest bon', 'non merci'] },
    fr_strawberries: { any: ['fraise', 'fraises', 'barquette', 'et des', 'aussi', 'pommes', 'salade'] }
  });
  LQ.EXPR_SKILL = Object.assign(LQ.EXPR_SKILL || {}, {
    'ja-onegai': 'respond_unexpected', 'ja-daijoubu': 'respond_unexpected', 'ja-kaado': 'choose_option',
    'en-bec': 'request_item', 'en-on-a-roll': 'choose_option', 'en-thats-it': 'thank_and_close',
    'fr-vous-avez-lait': 'request_item', 'fr-pas-de-sac': 'respond_unexpected', 'fr-ca-fait-combien': 'ask_price',
    'fr-kilo-tomates': 'request_item', 'fr-ce-sera-tout': 'respond_unexpected', 'fr-je-vous-dois': 'ask_price'
  });
})();
