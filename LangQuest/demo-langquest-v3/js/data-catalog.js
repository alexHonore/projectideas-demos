/* LangQuest V3 — catalog data: tracks, instruction languages, skills, characters.
   All people, places and scripts are fictional demo content written for this demo.
   Target-language phrases have NOT been native-reviewed; the app labels them so. */
'use strict';
window.LQ = window.LQ || {};

LQ.DEMO_DATE = '2026-10-23'; // Friday, October 23, 2026 (fixed demo clock)
LQ.DEMO_TIME = '09:10';

/* Instruction (source) languages. Order follows the spec's production priority. */
LQ.SOURCES = [
  { code: 'en', name: 'English', native: 'English', tier: 1, voice: ['en-US', 'en-GB', 'en-CA'] },
  { code: 'fr', name: 'French', native: 'Français', tier: 1, voice: ['fr-CA', 'fr-FR'] },
  { code: 'es', name: 'Spanish', native: 'Español', tier: 2, voice: ['es-ES', 'es-MX', 'es-US'] },
  { code: 'ru', name: 'Russian', native: 'Русский', tier: 2, voice: ['ru-RU'] },
  { code: 'pt', name: 'Portuguese', native: 'Português', tier: 3, voice: ['pt-BR', 'pt-PT'] },
  { code: 'de', name: 'German', native: 'Deutsch', tier: 3, voice: ['de-DE'] },
  { code: 'ar', name: 'Arabic', native: 'العربية', tier: 3, voice: ['ar-SA'] },
  { code: 'zh', name: 'Chinese', native: '中文', tier: 3, voice: ['zh-CN'] },
  { code: 'ja', name: 'Japanese', native: '日本語', tier: 3, voice: ['ja-JP'] }
];

/* Pronunciation-assessment status, grounded in the build spec §8.5:
   'documented'  = a provider documents assessment for this locale (still needs validation)
   'none'        = spec states no validated scorer covers this variety
   'unverified'  = not yet checked against provider documentation */
LQ.ASSESS = {
  documented: { label: 'Provider documents assessment', detail: 'A speech provider documents pronunciation assessment for this locale. It still needs a native-speaker validation run before LangQuest shows any score.' },
  unverified: { label: 'Not yet validated', detail: 'No provider has been validated for this locale yet. Practice uses reference audio, recording and self-comparison.' },
  none: { label: 'No validated scorer', detail: 'No validated acoustic scorer exists for this variety. LangQuest never borrows another language’s scorer: practice uses native reference audio, recording and self-comparison.' }
};

/* The 30 course entries, names preserved exactly from the spec (§2). */
const T = (id, num, name, o) => Object.assign({ id, num, name, rtl: false, script: 'Latn', scriptModes: null, regions: null, assess: 'unverified', never: [] }, o);
LQ.TRACKS = [
  T('ar-eastern', 1, 'Arabic (Eastern)', { variety: 'Levantine Arabic', internal: 'ar-levant', glyph: 'ش', script: 'Arab', rtl: true, scriptModes: ['native', 'roman', 'both'],
    regions: [{ id: 'lb', label: 'Lebanese (Beirut)', locale: 'ar-LB', note: 'Documented default for this demo' }, { id: 'sy', label: 'Syrian (Damascus)', locale: 'ar-SY' }, { id: 'ps', label: 'Palestinian', locale: 'ar-PS' }, { id: 'jo', label: 'Jordanian (Amman)', locale: 'ar-JO' }],
    tts: ['ar-LB', 'ar-SY', 'ar-JO', 'ar-PS'], sr: 'ar-LB', never: ['ar-SA', 'ar'], city: 'Beirut',
    hello: { t: 'مرحبا', r: 'marḥaba' }, thanks: { t: 'شكراً', r: 'shukran' }, local: { name: 'Rami', role: 'runs a bookshop in Mar Mikhael' },
    note: '“Eastern” is an umbrella, not one accent. The region you choose decides the voice and wording.' }),
  T('ar-moroccan', 2, 'Arabic (Moroccan)', { variety: 'Moroccan Darija', internal: 'ary', glyph: 'د', script: 'Arab', rtl: true, scriptModes: ['native', 'roman', 'both'],
    regions: [{ id: 'casa', label: 'Casablanca', locale: 'ar-MA', note: 'Default' }, { id: 'rabat', label: 'Rabat', locale: 'ar-MA' }, { id: 'marrakech', label: 'Marrakech', locale: 'ar-MA' }],
    tts: ['ary', 'ary-MA'], sr: 'ar-MA', never: ['ar-SA', 'ar', 'ar-EG'], city: 'Casablanca', assess: 'none',
    hello: { t: 'السلام', r: 'salam' }, thanks: { t: 'شكرا', r: 'chokran' },
    note: 'Arabic script and Latin Darija (Arabizi) are both offered. Natural French code-switching is taught, never Modern Standard Arabic as a stand-in.' }),
  T('ar-egyptian', 3, 'Arabic (Egyptian)', { variety: 'Egyptian Colloquial Arabic', internal: 'arz', glyph: 'ج', script: 'Arab', rtl: true, scriptModes: ['native', 'roman', 'both'],
    tts: ['ar-EG'], sr: 'ar-EG', never: ['ar-SA', 'ar'], city: 'Cairo', assess: 'documented',
    hello: { t: 'أهلاً', r: 'ahlan' }, thanks: { t: 'شكراً', r: 'shukran' }, local: { name: 'Mona', role: 'a pharmacist in Zamalek' },
    note: 'Colloquial Cairene speech, kept separate from Modern Standard Arabic.' }),
  T('ar-msa', 4, 'Arabic (Modern Standard)', { variety: 'Modern Standard Arabic', internal: 'arb', glyph: 'ض', script: 'Arab', rtl: true, scriptModes: ['native', 'roman', 'both'],
    tts: ['ar-SA', 'ar'], sr: 'ar-SA', city: 'Amman',
    hello: { t: 'مرحباً', r: 'marḥaban' }, thanks: { t: 'شكراً', r: 'shukran' }, local: { name: 'Layla', role: 'a radio news presenter' },
    note: 'Formal register for news and writing. It does not replace the colloquial Arabic courses.' }),
  T('zh-cantonese', 5, 'Chinese (Cantonese)', { variety: 'Cantonese (Hong Kong)', internal: 'yue', glyph: '粵', script: 'Hant', scriptModes: ['native', 'roman', 'both'],
    tts: ['zh-HK', 'yue-HK'], sr: 'zh-HK', never: ['zh-CN', 'zh-TW'], city: 'Hong Kong', assess: 'documented',
    hello: { t: '你好', r: 'néih hóu' }, thanks: { t: '唔該', r: 'm̀h gōi' }, local: { name: 'Ka-yan', role: 'a tram-stop flower seller in Sheung Wan' },
    note: 'Traditional characters with optional Jyutping. Cantonese is never voiced by a Mandarin voice.' }),
  T('zh-mandarin', 6, 'Chinese (Mandarin)', { variety: 'Mandarin (Putonghua)', internal: 'cmn', glyph: '普', script: 'Hans', scriptModes: ['native', 'roman', 'both'],
    tts: ['zh-CN'], sr: 'zh-CN', never: ['zh-HK'], city: 'Beijing', assess: 'documented',
    hello: { t: '你好', r: 'nǐ hǎo' }, thanks: { t: '谢谢', r: 'xièxie' }, local: { name: 'Lin Wei', role: 'a hutong noodle-shop owner' },
    note: 'Simplified characters by default, Traditional optional, Pinyin with tone marks.' }),
  T('zh-simplified', 7, 'Chinese (Simplified)', { variety: 'Mandarin speech, Simplified script focus', internal: 'cmn-Hans', glyph: '简', script: 'Hans', scriptModes: ['native', 'roman', 'both'],
    tts: ['zh-CN'], sr: 'zh-CN', never: ['zh-HK'], city: 'Shanghai', assess: 'documented', sharesWith: 'zh-mandarin',
    hello: { t: '你好', r: 'nǐ hǎo' }, thanks: { t: '谢谢', r: 'xièxie' }, local: { name: 'Zhou Min', role: 'a stationery-shop owner' },
    note: 'Simplified is a writing system, not a spoken language. This track shares Mandarin audio and focuses on reading and writing.' }),
  T('english', 8, 'English', { variety: 'American English', internal: 'en', glyph: 'W',
    regions: [{ id: 'us', label: 'United States', locale: 'en-US', note: 'Default' }, { id: 'gb', label: 'United Kingdom', locale: 'en-GB' }],
    tts: ['en-US'], sr: 'en-US', city: 'Brooklyn', sources: ['ru', 'fr', 'es'],
    hello: { t: 'Hello', r: '' }, thanks: { t: 'Thank you', r: '' },
    note: 'Taught from French, Spanish, Russian and other languages, not as an English-only course.' }),
  T('danish', 9, 'Danish', { variety: 'Danish', internal: 'da', glyph: 'Ø', tts: ['da-DK'], sr: 'da-DK', city: 'Copenhagen', assess: 'documented',
    hello: { t: 'Hej', r: '' }, thanks: { t: 'Tak', r: '' }, local: { name: 'Freja', role: 'a bike mechanic in Nørrebro' } }),
  T('french', 10, 'French', { variety: 'French', internal: 'fr', glyph: 'É',
    regions: [{ id: 'fr', label: 'France (Paris)', locale: 'fr-FR', note: 'Default' }, { id: 'ca', label: 'Québec (Montréal)', locale: 'fr-CA' }],
    tts: ['fr-FR'], sr: 'fr-FR', city: 'Montréal', assess: 'documented', sources: ['en', 'es', 'ru'],
    hello: { t: 'Bonjour', r: '' }, thanks: { t: 'Merci', r: '' },
    note: 'Regional pronunciation and vocabulary: Québec French says “pour apporter” where Paris says “à emporter”.' }),
  T('german', 11, 'German', { variety: 'German', internal: 'de', glyph: 'ß', tts: ['de-DE'], sr: 'de-DE', city: 'Berlin',
    hello: { t: 'Hallo', r: '' }, thanks: { t: 'Danke', r: '' }, local: { name: 'Jonas', role: 'a bakery apprentice in Kreuzberg' } }),
  T('greek', 12, 'Greek', { variety: 'Modern Greek', internal: 'el', glyph: 'Ω', script: 'Grek', scriptModes: ['native', 'roman', 'both'], tts: ['el-GR'], sr: 'el-GR', city: 'Athens',
    hello: { t: 'Γεια σας', r: 'yia sas' }, thanks: { t: 'Ευχαριστώ', r: 'efcharistó' }, local: { name: 'Eleni', role: 'runs a periptero kiosk in Pangrati' } }),
  T('haitian-creole', 13, 'Haitian Creole', { variety: 'Haitian Creole (Kreyòl)', internal: 'ht', glyph: 'Ò', tts: ['ht-HT', 'ht'], sr: 'ht-HT', never: ['fr-FR', 'fr-CA'], city: 'Port-au-Prince', assess: 'none',
    hello: { t: 'Bonjou', r: '' }, thanks: { t: 'Mèsi', r: '' }, local: { name: 'Wideline', role: 'a market vendor in Pétion-Ville' },
    note: 'Real Kreyòl with Haitian orthography. Never a “French accent mode”.' }),
  T('hebrew', 14, 'Hebrew', { variety: 'Modern Hebrew', internal: 'he', glyph: 'ש', script: 'Hebr', rtl: true, scriptModes: ['native', 'roman', 'both'], tts: ['he-IL'], sr: 'he-IL', city: 'Tel Aviv',
    hello: { t: 'שלום', r: 'shalom' }, thanks: { t: 'תודה', r: 'toda' }, local: { name: 'Noa', role: 'a café owner on Dizengoff Street' } }),
  T('hindi', 15, 'Hindi', { variety: 'Hindi', internal: 'hi', glyph: 'ह', script: 'Deva', scriptModes: ['native', 'roman', 'both'], tts: ['hi-IN'], sr: 'hi-IN', city: 'Delhi',
    hello: { t: 'नमस्ते', r: 'namaste' }, thanks: { t: 'धन्यवाद', r: 'dhanyavaad' }, local: { name: 'Arjun', role: 'a chai stall owner in Lajpat Nagar' } }),
  T('italian', 16, 'Italian', { variety: 'Italian', internal: 'it', glyph: 'È', tts: ['it-IT'], sr: 'it-IT', city: 'Bologna',
    hello: { t: 'Buongiorno', r: '' }, thanks: { t: 'Grazie', r: '' }, local: { name: 'Giulia', role: 'a librarian near Piazza Maggiore' } }),
  T('japanese', 17, 'Japanese', { variety: 'Japanese (Tokyo)', internal: 'ja', glyph: 'あ', script: 'Jpan', scriptModes: ['native', 'roman', 'both'], tts: ['ja-JP'], sr: 'ja-JP', city: 'Tokyo',
    hello: { t: 'こんにちは', r: 'konnichiwa' }, thanks: { t: 'ありがとうございます', r: 'arigatō gozaimasu' },
    note: 'Kana and kanji with optional romaji; polite everyday speech first.' }),
  T('korean', 18, 'Korean', { variety: 'Korean (Seoul)', internal: 'ko', glyph: '한', script: 'Kore', scriptModes: ['native', 'roman', 'both'], tts: ['ko-KR'], sr: 'ko-KR', city: 'Seoul',
    hello: { t: '안녕하세요', r: 'annyeonghaseyo' }, thanks: { t: '감사합니다', r: 'gamsahamnida' }, local: { name: 'Ji-woo', role: 'a convenience-store clerk in Mapo' } }),
  T('pt-brazil', 19, 'Portuguese (Brazilian)', { variety: 'Brazilian Portuguese', internal: 'pt-BR', glyph: 'Ã', tts: ['pt-BR'], sr: 'pt-BR', never: ['pt-PT'], city: 'Salvador', assess: 'documented',
    hello: { t: 'Oi', r: '' }, thanks: { t: 'Obrigado', r: '' }, local: { name: 'Thiago', role: 'a capoeira teacher in Rio Vermelho' } }),
  T('pt-europe', 20, 'Portuguese (European)', { variety: 'European Portuguese', internal: 'pt-PT', glyph: 'Õ', tts: ['pt-PT'], sr: 'pt-PT', never: ['pt-BR'], city: 'Porto', assess: 'documented',
    hello: { t: 'Olá', r: '' }, thanks: { t: 'Obrigado', r: '' }, local: { name: 'Inês', role: 'a tram driver in Porto' } }),
  T('romanian', 21, 'Romanian', { variety: 'Romanian', internal: 'ro', glyph: 'Ț', tts: ['ro-RO'], sr: 'ro-RO', city: 'Cluj-Napoca',
    hello: { t: 'Bună ziua', r: '' }, thanks: { t: 'Mulțumesc', r: '' }, local: { name: 'Andrei', role: 'a student barista in Cluj' } }),
  T('russian', 22, 'Russian', { variety: 'Russian', internal: 'ru', glyph: 'Ж', script: 'Cyrl', scriptModes: ['native', 'roman', 'both'], tts: ['ru-RU'], sr: 'ru-RU', city: 'Saint Petersburg',
    hello: { t: 'Здравствуйте', r: 'zdravstvuyte' }, thanks: { t: 'Спасибо', r: 'spasibo' }, local: { name: 'Olga', role: 'a museum guide on Vasilyevsky Island' } }),
  T('es-latam', 23, 'Spanish (Latin American)', { variety: 'Latin American Spanish', internal: 'es-419', glyph: 'Ñ',
    regions: [{ id: 'mx', label: 'Mexico (Ciudad de México)', locale: 'es-MX', note: 'Default' }, { id: 'co', label: 'Colombia (Bogotá)', locale: 'es-CO' }, { id: 'ar', label: 'Argentina (Buenos Aires)', locale: 'es-AR' }],
    tts: ['es-MX', 'es-US', 'es-419'], sr: 'es-MX', never: ['es-ES'], city: 'Ciudad de México', assess: 'documented',
    hello: { t: '¡Hola!', r: '' }, thanks: { t: 'Gracias', r: '' }, local: { name: 'Valeria', role: 'sells tamales near Parque México' },
    note: 'A pan-Latin American base with regional markers. There is no single “universal” accent.' }),
  T('es-spain', 24, 'Spanish (Spain-Castilian)', { variety: 'Castilian Spanish', internal: 'es-ES', glyph: 'ñ', tts: ['es-ES'], sr: 'es-ES', never: ['es-MX', 'es-US', 'es-419'], city: 'Madrid', assess: 'documented', sources: ['en', 'fr', 'ru'],
    hello: { t: '¡Hola!', r: '' }, thanks: { t: 'Gracias', r: '' },
    note: 'Castilian voice and vocabulary, kept distinct from Latin American Spanish.' }),
  T('swahili', 25, 'Swahili', { variety: 'Swahili', internal: 'sw', glyph: 'Ng',
    regions: [{ id: 'tz', label: 'Tanzania (Dar es Salaam)', locale: 'sw-TZ', note: 'Default' }, { id: 'ke', label: 'Kenya (Nairobi)', locale: 'sw-KE' }],
    tts: ['sw-TZ', 'sw-KE', 'sw'], sr: 'sw-TZ', city: 'Dar es Salaam',
    hello: { t: 'Habari', r: '' }, thanks: { t: 'Asante', r: '' }, local: { name: 'Amani', role: 'a dala-dala conductor' } }),
  T('kinyarwanda', 26, 'Kinyarwanda', { variety: 'Kinyarwanda', internal: 'rw', glyph: 'Rw', tts: ['rw-RW', 'rw'], sr: 'rw-RW', city: 'Kigali', assess: 'none',
    hello: { t: 'Muraho', r: '' }, thanks: { t: 'Murakoze', r: '' }, local: { name: 'Aline', role: 'a coffee cooperative guide' },
    note: 'Needs native-validated speech. Automated scoring support is limited, and the app says so.' }),
  T('swedish', 27, 'Swedish', { variety: 'Swedish', internal: 'sv', glyph: 'Å', tts: ['sv-SE'], sr: 'sv-SE', city: 'Gothenburg',
    hello: { t: 'Hej', r: '' }, thanks: { t: 'Tack', r: '' }, local: { name: 'Elsa', role: 'a ferry deckhand' } }),
  T('lingala', 28, 'Lingala', { variety: 'Lingala', internal: 'ln', glyph: 'Ɛ',
    regions: [{ id: 'cd', label: 'DR Congo (Kinshasa)', locale: 'ln-CD', note: 'Default' }, { id: 'cg', label: 'Republic of the Congo (Brazzaville)', locale: 'ln-CG' }],
    tts: ['ln-CD', 'ln'], sr: 'ln-CD', never: ['fr-FR', 'sw-TZ'], city: 'Kinshasa', assess: 'none',
    hello: { t: 'Mbote', r: '' }, thanks: { t: 'Matondo', r: '' }, local: { name: 'Patrick', role: 'a tailor in Matonge' },
    note: 'Community-recorded native speech is essential. Never substituted with French or Swahili.' }),
  T('ukrainian', 29, 'Ukrainian', { variety: 'Ukrainian', internal: 'uk', glyph: 'Ї', script: 'Cyrl', scriptModes: ['native', 'roman', 'both'], tts: ['uk-UA'], sr: 'uk-UA', city: 'Lviv',
    hello: { t: 'Добрий день', r: 'dobryi den' }, thanks: { t: 'Дякую', r: 'dyakuyu' }, local: { name: 'Oksana', role: 'a pastry chef near Rynok Square' } }),
  T('vietnamese', 30, 'Vietnamese', { variety: 'Vietnamese', internal: 'vi', glyph: 'Ơ',
    regions: [{ id: 'north', label: 'Northern (Hà Nội)', locale: 'vi-VN', note: 'Default' }, { id: 'south', label: 'Southern (Sài Gòn)', locale: 'vi-VN' }],
    tts: ['vi-VN'], sr: 'vi-VN', city: 'Hà Nội',
    hello: { t: 'Xin chào', r: '' }, thanks: { t: 'Cảm ơn', r: '' }, local: { name: 'Minh', role: 'a phở cook in the Old Quarter' },
    note: 'Tone-aware coaching is only shown where a scorer is validated.' })
];
LQ.trackById = id => LQ.TRACKS.find(t => t.id === id);
LQ.SCRIPT_NAMES = { Latn: 'Latin', Arab: 'Arabic', Hant: 'Traditional Chinese', Hans: 'Simplified Chinese', Grek: 'Greek', Hebr: 'Hebrew', Deva: 'Devanagari', Jpan: 'Kana and kanji', Kore: 'Hangul', Cyrl: 'Cyrillic' };
LQ.SCRIPT_MODE_LABEL = {
  native: { Arab: 'Arabic script', Hant: 'Characters', Hans: 'Characters', Jpan: 'Kana and kanji', Kore: 'Hangul', Cyrl: 'Cyrillic', Grek: 'Greek', Hebr: 'Hebrew', Deva: 'Devanagari' },
  roman: { 'ar-moroccan': 'Latin Darija (Arabizi)', 'zh-cantonese': 'Jyutping', 'zh-mandarin': 'Pinyin', 'zh-simplified': 'Pinyin', japanese: 'Romaji', korean: 'Romanization' }
};
LQ.REGION_GROUPS = [
  { id: 'all', label: 'All' },
  { id: 'mena', label: 'Arabic varieties', ids: ['ar-eastern', 'ar-moroccan', 'ar-egyptian', 'ar-msa'] },
  { id: 'asia', label: 'Asia', ids: ['zh-cantonese', 'zh-mandarin', 'zh-simplified', 'hindi', 'japanese', 'korean', 'vietnamese'] },
  { id: 'europe', label: 'Europe', ids: ['danish', 'french', 'german', 'greek', 'italian', 'pt-europe', 'romanian', 'russian', 'es-spain', 'swedish', 'ukrainian', 'hebrew'] },
  { id: 'americas', label: 'Americas', ids: ['english', 'haitian-creole', 'pt-brazil', 'es-latam'] },
  { id: 'africa', label: 'Africa', ids: ['swahili', 'kinyarwanda', 'lingala'] },
  { id: 'rtl', label: 'Right-to-left', ids: ['ar-eastern', 'ar-moroccan', 'ar-egyptian', 'ar-msa', 'hebrew'] },
  { id: 'missions', label: 'Has full missions', ids: ['es-spain', 'ar-moroccan', 'french', 'japanese', 'english'] }
];

/* Reusable can-do skills (spec §3.4). Descriptors paraphrase CEFR-style can-do
   statements; LangQuest does not claim official CEFR certification. */
LQ.SKILLS = {
  greet_politely: { en: 'Greet people politely', fr: 'Saluer poliment', ru: 'Вежливо здороваться', can: { en: 'I can greet someone and answer “how are you?”', fr: 'Je peux saluer quelqu’un et répondre à « ça va ? »', ru: 'Я могу поздороваться и ответить на «как дела?»' } },
  introduce_self: { en: 'Introduce yourself', fr: 'Se présenter', ru: 'Представиться', can: { en: 'I can say my name and where I’m from.', fr: 'Je peux dire mon nom et d’où je viens.', ru: 'Я могу назвать своё имя и откуда я.' } },
  request_item: { en: 'Ask for what you want', fr: 'Demander ce qu’on veut', ru: 'Просить то, что нужно', can: { en: 'I can order a drink or food in a café.', fr: 'Je peux commander une boisson ou à manger au café.', ru: 'Я могу заказать напиток или еду в кафе.' } },
  choose_option: { en: 'Answer either/or questions', fr: 'Répondre à un choix', ru: 'Отвечать на вопросы с выбором', can: { en: 'I can choose between options someone offers me.', fr: 'Je peux choisir entre des options proposées.', ru: 'Я могу выбрать из предложенных вариантов.' } },
  respond_unexpected: { en: 'Handle a surprise question', fr: 'Réagir à une question imprévue', ru: 'Реагировать на неожиданный вопрос', can: { en: 'I can answer a simple question I didn’t expect.', fr: 'Je peux répondre à une question simple imprévue.', ru: 'Я могу ответить на простой неожиданный вопрос.' } },
  ask_price: { en: 'Ask the price', fr: 'Demander le prix', ru: 'Спросить цену', can: { en: 'I can ask how much something costs and understand the answer.', fr: 'Je peux demander combien ça coûte et comprendre la réponse.', ru: 'Я могу спросить, сколько это стоит, и понять ответ.' } },
  thank_and_close: { en: 'Thank and say goodbye', fr: 'Remercier et prendre congé', ru: 'Поблагодарить и попрощаться', can: { en: 'I can thank someone and end a conversation politely.', fr: 'Je peux remercier et terminer poliment une conversation.', ru: 'Я могу поблагодарить и вежливо закончить разговор.' } },
  ask_directions: { en: 'Ask the way', fr: 'Demander son chemin', ru: 'Спросить дорогу', can: { en: 'I can ask where a place is.', fr: 'Je peux demander où se trouve un lieu.', ru: 'Я могу спросить, где находится место.' } },
  repair_misunderstanding: { en: 'Ask for a repeat or slower speech', fr: 'Faire répéter ou ralentir', ru: 'Попросить повторить или говорить медленнее', can: { en: 'I can ask someone to repeat or slow down, and keep going.', fr: 'Je peux demander de répéter ou de ralentir, et continuer.', ru: 'Я могу попросить повторить или говорить медленнее и продолжить разговор.' } },
  confirm_understanding: { en: 'Check you understood', fr: 'Vérifier qu’on a compris', ru: 'Уточнить, правильно ли понял', can: { en: 'I can repeat key information back to check it.', fr: 'Je peux reformuler l’essentiel pour vérifier.', ru: 'Я могу переспросить ключевую информацию.' } }
};
LQ.SKILL_STATES = [
  { id: 'not_attempted', en: 'Not tried yet', fr: 'Pas encore essayé', ru: 'Ещё не пробовали', rank: 0 },
  { id: 'emerging', en: 'Emerging', fr: 'En émergence', ru: 'Появляется', rank: 1, why: { en: 'Tried with help (a hint, a reveal or a suggested reply).', fr: 'Essayé avec de l’aide (indice, réponse révélée ou suggestion).', ru: 'Пробовали с подсказкой.' } },
  { id: 'practiced', en: 'Practiced', fr: 'Pratiqué', ru: 'Отработано', rank: 2, why: { en: 'Done in a conversation, with some help.', fr: 'Réussi en conversation, avec un peu d’aide.', ru: 'Получилось в разговоре с небольшой помощью.' } },
  { id: 'independent', en: 'Independent', fr: 'Autonome', ru: 'Самостоятельно', rank: 3, why: { en: 'Done in a conversation with no hints.', fr: 'Réussi en conversation sans indice.', ru: 'Получилось в разговоре без подсказок.' } },
  { id: 'durable', en: 'Durable', fr: 'Durable', ru: 'Закреплено', rank: 4, why: { en: 'Recalled again at least a day later, in a different scene.', fr: 'Retrouvé au moins un jour plus tard, dans une autre scène.', ru: 'Вспомнили как минимум через день в другой ситуации.' } }
];

/* Recurring characters (distinct from the mascot). Portrait params drive js/art.js. */
LQ.CHARACTERS = {
  lucia: { name: 'Lucía Moreno', track: 'es-spain', role: { en: 'Barista at Café La Corrala', fr: 'Barista au Café La Corrala' }, place: 'Lavapiés, Madrid', variety: 'Castilian Spanish (Madrid)',
    voice: { pitch: 1.08, rate: 1 }, personality: { en: 'Quick, warm, teases regulars about their “usual”.', fr: 'Rapide, chaleureuse, taquine les habitués sur leur « comme d’habitude ».' },
    look: { skin: '#C98E66', hair: 'bun', hairColor: '#2B1A14', top: '#3149E0', accent: 'earrings', bg: '#FFE3A3' },
    story: [{ after: 'es-hello', en: 'Grew up two streets away; took over the café from her aunt in 2021.', fr: 'A grandi deux rues plus loin ; a repris le café de sa tante en 2021.' }, { after: 'es-cafe', en: 'Keeps a notebook of every regular’s order. You’re in it now.', fr: 'Note la commande de chaque habitué dans un carnet. Tu y es maintenant.' }] },
  andres: { name: 'Andrés Gil', track: 'es-spain', role: { en: 'Waiter on a terrace near El Retiro', fr: 'Serveur en terrasse près du Retiro' }, place: 'Retiro, Madrid', variety: 'Castilian Spanish (Madrid)',
    voice: { pitch: 0.9, rate: 1 }, personality: { en: 'Formal, uses usted, secretly loves football talk.', fr: 'Formel, vouvoie, adore parler foot.' },
    look: { skin: '#E2B08C', hair: 'short', hairColor: '#5A3A22', top: '#1B1F3B', accent: 'apron', bg: '#CFE6D8' }, story: [] },
  carmen: { name: 'Carmen Ruiz', track: 'es-spain', role: { en: 'Florist on Plaza de Tirso de Molina', fr: 'Fleuriste place Tirso de Molina' }, place: 'Tirso de Molina, Madrid', variety: 'Castilian Spanish (Madrid)',
    voice: { pitch: 1.02, rate: 1.12 }, personality: { en: 'Talks fast, gives directions with her hands.', fr: 'Parle vite, indique le chemin avec les mains.' },
    look: { skin: '#B97A57', hair: 'curly', hairColor: '#3A2418', top: '#E5375F', accent: 'glasses', bg: '#FFD0D8' },
    story: [{ after: 'es-metro', en: 'Has sold flowers on this plaza for 31 years and knows every bus line by heart.', fr: 'Vend des fleurs sur cette place depuis 31 ans et connaît toutes les lignes de bus.' }] },
  youssef: { name: 'Youssef El Amrani', track: 'ar-moroccan', role: { en: 'Runs Café Zahra', fr: 'Tient le Café Zahra' }, place: 'Maârif, Casablanca', variety: 'Moroccan Darija (Casablanca)',
    voice: { pitch: 0.95, rate: 1 }, personality: { en: 'Easygoing, mixes Darija and French, knows the whole street.', fr: 'Décontracté, mélange darija et français, connaît toute la rue.' },
    look: { skin: '#A8714F', hair: 'short', hairColor: '#1F1410', top: '#12805C', accent: 'beard', bg: '#D6E8FF' },
    story: [{ after: 'ary-cafe', en: 'Opened Café Zahra with his sister; the terrace chairs face the street “so nobody misses anything”.', fr: 'A ouvert le Café Zahra avec sa sœur ; les chaises font face à la rue « pour ne rien rater ».' }] },
  salma: { name: 'Salma El Amrani', track: 'ar-moroccan', role: { en: 'Youssef’s niece, architecture student', fr: 'Nièce de Youssef, étudiante en architecture' }, place: 'Casablanca', variety: 'Moroccan Darija (Casablanca)',
    voice: { pitch: 1.1, rate: 1 }, personality: { en: 'Curious, sketches the art-deco buildings downtown.', fr: 'Curieuse, dessine les immeubles art déco du centre-ville.' },
    look: { skin: '#B07A55', hair: 'long', hairColor: '#24160F', top: '#FFC83D', accent: 'none', bg: '#FFE3A3' }, story: [] },
  emilie: { name: 'Émilie Gagnon', track: 'french', role: { en: 'Barista at Café des Escaliers', fr: 'Barista au Café des Escaliers' }, place: 'Mile End, Montréal', variety: 'Québec French',
    voice: { pitch: 1.05, rate: 1 }, personality: { en: 'Chatty, recommends the chocolatines straight from the oven.', fr: 'Jasante, recommande les chocolatines qui sortent du four.' },
    look: { skin: '#F0C8A8', hair: 'bob', hairColor: '#B5562B', top: '#12805C', accent: 'toque', bg: '#FFD9B8' },
    story: [{ after: 'fr-mileend', en: 'Plays fiddle in a trad band on Thursdays at a bar on Saint-Laurent.', fr: 'Joue du violon dans un groupe trad le jeudi, dans un bar de Saint-Laurent.' }] },
  haruto: { name: 'Haruto Sato', track: 'japanese', role: { en: 'Barista at a small café in Shimokitazawa', fr: 'Barista dans un petit café de Shimokitazawa' }, place: 'Shimokitazawa, Tokyo', variety: 'Japanese (Tokyo, polite)',
    voice: { pitch: 0.95, rate: 0.95 }, personality: { en: 'Calm, precise, collects vinyl records.', fr: 'Calme, précis, collectionne les vinyles.' },
    look: { skin: '#EAC4A0', hair: 'wavy', hairColor: '#1A1A22', top: '#191C32', accent: 'none', bg: '#DCE3FF' },
    story: [{ after: 'ja-cafe', en: 'Picks the morning record by the weather. Today: rain, so jazz.', fr: 'Choisit le disque du matin selon la météo. Aujourd’hui : pluie, donc jazz.' }] },
  rafa: { name: 'Rafa Ortega', track: 'es-spain', role: { en: 'Greengrocer at Mercado de San Fernando', fr: 'Primeur au marché de San Fernando' }, place: 'Lavapiés, Madrid', variety: 'Castilian Spanish (Madrid)',
    voice: { pitch: 0.92, rate: 1.05 }, personality: { en: 'Jokes with everyone and slips regulars a free lemon.', fr: 'Plaisante avec tout le monde et glisse un citron aux habitués.' },
    look: { skin: '#D9A27A', hair: 'short', hairColor: '#6B6B6B', top: '#12805C', accent: 'apron', bg: '#FFD9B8' },
    story: [{ after: 'es-market', en: 'Has run the stall since the market reopened as a neighbourhood co-op.', fr: 'Tient le stand depuis la réouverture du marché en coopérative de quartier.' }] },
  brahim: { name: 'Brahim Ouazzani', track: 'ar-moroccan', role: { en: 'Runs the corner hanout', fr: 'Tient le hanout du coin' }, place: 'Maârif, Casablanca', variety: 'Moroccan Darija (Casablanca)',
    voice: { pitch: 0.9, rate: 1 }, personality: { en: 'Knows every regular’s order by heart; open until midnight.', fr: 'Connaît la commande de chaque habitué par cœur ; ouvert jusqu’à minuit.' },
    look: { skin: '#9C6646', hair: 'buzz', hairColor: '#2A1A12', top: '#3149E0', accent: 'beard', bg: '#D6E8FF' },
    story: [{ after: 'ary-hanout', en: 'Came from Taroudant at sixteen and took over his uncle’s shop.', fr: 'Arrivé de Taroudant à seize ans, il a repris l’épicerie de son oncle.' }] },
  theo: { name: 'Théo Marchand', track: 'french', role: { en: 'Waiter at Café du Canal', fr: 'Serveur au Café du Canal', ru: 'Официант в Café du Canal' }, place: 'Canal Saint-Martin, Paris', variety: 'French (Paris)',
    voice: { pitch: 1, rate: 1.05 }, personality: { en: 'Dry humour; remembers your croissant.', fr: 'Humour pince-sans-rire ; se souvient de votre croissant.', ru: 'Сухой юмор; помнит ваш круассан.' },
    look: { skin: '#E8BE9A', hair: 'wavy', hairColor: '#3A2418', top: '#191C32', accent: 'apron', bg: '#DCE3FF' },
    story: [{ after: 'fr-paris', en: 'Studies sound engineering at night and records the canal at dawn.', fr: 'Étudie l’ingénierie du son le soir et enregistre le canal à l’aube.', ru: 'По вечерам изучает звукорежиссуру и на рассвете записывает канал.' }] },
  jordan: { name: 'Jordan Ellis', track: 'english', role: { en: 'Barista in Fort Greene', fr: 'Barista à Fort Greene', ru: 'Бариста в Форт-Грине' }, place: 'Fort Greene, Brooklyn', variety: 'American English (New York)',
    voice: { pitch: 1, rate: 1.05 }, personality: { en: 'Friendly, talks fast, always asks about size.', fr: 'Sympathique, parle vite, demande toujours la taille.', ru: 'Дружелюбный, говорит быстро, всегда уточняет размер.' },
    look: { skin: '#6E4530', hair: 'buzz', hairColor: '#120C08', top: '#FFC83D', accent: 'none', bg: '#CFE6D8' },
    story: [{ after: 'en-cafe', en: 'Moved from Philadelphia for art school; draws the regulars on the cups.', fr: 'Venu de Philadelphie pour les beaux-arts ; dessine les habitués sur les gobelets.', ru: 'Переехал из Филадельфии ради художественной школы и рисует постоянных гостей на стаканах.' }] }
};

/* Seeded sample learner. Montréal-based, bilingual, learning two courses. */
LQ.SAMPLE_LEARNER = { name: 'Camille', city: 'Montréal', ui: 'en', defaultSource: 'en' };
