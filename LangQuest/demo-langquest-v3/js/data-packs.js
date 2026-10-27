/* LangQuest V3 — phrase packs: one set of language-independent concepts (spec §2.2,
   "reusable communicative intents"), realised per course. Each entry is [target, romanisation]
   or a plain string for Latin-script courses. Written for this demo; NOT native-reviewed.
   Varieties stay distinct: Darija is Darija, Cantonese is Cantonese, Kreyòl is Kreyòl. */
'use strict';
LQ.CONCEPTS = {
  hello: { en: 'Hello!', fr: 'Bonjour !', es: '¡Hola!', ru: 'Здравствуйте!' },
  thanks: { en: 'Thank you.', fr: 'Merci.', es: 'Gracias.', ru: 'Спасибо.' },
  fine: { en: 'I’m fine, thanks. And you?', fr: 'Ça va, merci. Et toi ?', es: 'Bien, gracias. ¿Y tú?', ru: 'Хорошо, спасибо. А вы?' },
  name: { en: 'My name is {name}.', fr: 'Je m’appelle {name}.', es: 'Me llamo {name}.', ru: 'Меня зовут {name}.' },
  bye: { en: 'Goodbye!', fr: 'Au revoir !', es: '¡Adiós!', ru: 'До свидания!' },
  coffee: { en: 'A coffee, please.', fr: 'Un café, s’il vous plaît.', es: 'Un café, por favor.', ru: 'Кофе, пожалуйста.' },
  tea: { en: 'A tea, please.', fr: 'Un thé, s’il vous plaît.', es: 'Un té, por favor.', ru: 'Чай, пожалуйста.' },
  howmuch: { en: 'How much is it?', fr: 'C’est combien ?', es: '¿Cuánto es?', ru: 'Сколько стоит?' },
  where: { en: 'Excuse me, where is the station?', fr: 'Pardon, où est la gare ?', es: 'Perdone, ¿dónde está la estación?', ru: 'Извините, где вокзал?' },
  slower: { en: 'More slowly, please.', fr: 'Plus lentement, s’il vous plaît.', es: 'Más despacio, por favor.', ru: 'Медленнее, пожалуйста.' },
  c_howareyou: { en: 'How are you?', fr: 'Comment ça va ?', es: '¿Cómo estás?', ru: 'Как дела?' },
  c_name: { en: 'What’s your name?', fr: 'Comment tu t’appelles ?', es: '¿Cómo te llamas?', ru: 'Как тебя зовут?' },
  c_nice: { en: 'Nice to meet you!', fr: 'Enchanté·e !', es: '¡Mucho gusto!', ru: 'Очень приятно!' },
  c_what: { en: 'What would you like?', fr: 'Qu’est-ce que vous prenez ?', es: '¿Qué va a tomar?', ru: 'Что будете?' },
  c_here: { en: 'Here you go.', fr: 'Voilà.', es: 'Aquí tiene.', ru: 'Вот, пожалуйста.' },
  c_price: { en: 'That’s {price}.', fr: 'Ça fait {price}.', es: 'Son {price}.', ru: 'С вас {price}.' },
  c_way: { en: 'Go straight, then turn left.', fr: 'Tout droit, puis à gauche.', es: 'Todo recto y luego a la izquierda.', ru: 'Прямо, потом налево.' },
  c_welcome: { en: 'You’re welcome!', fr: 'De rien !', es: '¡De nada!', ru: 'Не за что!' },
  c_sorry: { en: 'Sorry, I didn’t understand.', fr: 'Pardon, je n’ai pas compris.', es: 'Perdón, no he entendido.', ru: 'Простите, я не понял(а).' }
};
LQ.LEARNER_CONCEPTS = ['hello', 'fine', 'name', 'bye', 'thanks', 'coffee', 'tea', 'howmuch', 'where', 'slower'];
LQ.CHAR_CONCEPTS = ['c_howareyou', 'c_name', 'c_nice', 'c_what', 'c_here', 'c_price', 'c_way', 'c_welcome', 'c_sorry'];

const P = (o) => o;
LQ.PACKS = {
  'ar-eastern': P({ price: [3, 'USD'], fine: ['منيح، شكراً. وإنت؟', 'mnīḥ, shukran. w-inta?'], name: ['إسمي {name}', 'ismi {name}'], bye: ['مع السلامة', 'maʿ is-salāme'], coffee: ['بدي قهوة، لو سمحت', 'baddi ahwe, law samaḥt'], tea: ['بدي شاي، لو سمحت', 'baddi shāy, law samaḥt'], howmuch: ['قديش؟', 'addēsh?'], where: ['عفواً، وين المحطة؟', 'ʿafwan, wēn il-maḥaṭṭa?'], slower: ['شوي شوي، لو سمحت', 'shwayy shwayy, law samaḥt'],
    c_howareyou: ['كيفك؟', 'kīfak?'], c_name: ['شو اسمك؟', 'shu ismak?'], c_nice: ['تشرفنا!', 'tsharrafna!'], c_what: ['شو بتحب تشرب؟', 'shu btḥebb teshrab?'], c_here: ['تفضل', 'tfaḍḍal'], c_price: ['بتلات دولار', 'b-tlēt dolār'], c_way: ['دغري، وبعدين عالشمال', 'dighri, w baʿdēn ʿash-shmāl'], c_welcome: ['عفواً!', 'ʿafwan!'], c_sorry: ['عفواً، ما فهمت', 'ʿafwan, ma fhimt'] }),
  'ar-moroccan': P({ price: [10, 'MAD'], character: 'salma', fine: ['لاباس، الحمد لله. ونتا؟', 'Labas, l-hamdulillah. W nta?'], name: ['سميتي {name}', 'Smiti {name}'], bye: ['بسلامة', 'Bslama'], coffee: ['بغيت واحد القهوة، عافاك', 'Bghit wa7d l-qahwa, 3afak'], tea: ['بغيت واحد أتاي، عافاك', 'Bghit wa7d atay, 3afak'], howmuch: ['بشحال؟', 'Bch7al?'], where: ['سمح ليا، فين لاگار؟', 'Sme7 lia, fin lagar?'], slower: ['بشوية عليا، عافاك', 'B chwiya 3lia, 3afak'],
    c_howareyou: ['لاباس عليك؟', 'Labas 3lik?'], c_name: ['شنو سميتك؟', 'Chnu smitek?'], c_nice: ['متشرفين!', 'Mtcharfin!'], c_what: ['آش بغيتي؟', 'Ach bghiti?'], c_here: ['تفضل', 'Tfeddel'], c_price: ['عشرة دراهم', '3achra drahm'], c_way: ['سير نيشان، ومن بعد على ليسر', 'Sir nichan, w mn b3d 3la lisr'], c_welcome: ['مرحبا!', 'Mer7ba!'], c_sorry: ['سمح ليا، ما فهمتش', 'Sme7 lia, ma fhemtch'] }),
  'ar-egyptian': P({ price: [20, 'EGP'], fine: ['كويس، الحمد لله. وإنت؟', 'kwayyis, il-ḥamdu lillāh. w inta?'], name: ['اسمي {name}', 'ismi {name}'], bye: ['مع السلامة', 'maʿa s-salāma'], coffee: ['عايز قهوة، لو سمحت', 'ʿāyiz ʾahwa, law samaḥt'], tea: ['عايز شاي، لو سمحت', 'ʿāyiz shāy, law samaḥt'], howmuch: ['بكام؟', 'bi-kām?'], where: ['لو سمحت، فين المحطة؟', 'law samaḥt, fēn il-maḥaṭṭa?'], slower: ['براحة شوية، لو سمحت', 'bi-rāḥa shwayya, law samaḥt'],
    c_howareyou: ['إزيك؟', 'izzayyak?'], c_name: ['اسمك إيه؟', 'ismak ēh?'], c_nice: ['اتشرفنا!', 'itsharrafna!'], c_what: ['تحب تشرب إيه؟', 'tiḥebb tishrab ēh?'], c_here: ['اتفضل', 'itfaḍḍal'], c_price: ['عشرين جنيه', 'ʿishrīn ginēh'], c_way: ['على طول، وبعدين شمال', 'ʿala ṭūl, w baʿdēn shimāl'], c_welcome: ['العفو!', 'il-ʿafw!'], c_sorry: ['معلش، مش فاهم', 'maʿlesh, mish fāhim'] }),
  'ar-msa': P({ price: [2, 'JOD'], fine: ['بخير، شكراً. وأنت؟', 'bi-khayr, shukran. wa-anta?'], name: ['اسمي {name}', 'ismī {name}'], bye: ['مع السلامة', 'maʿa as-salāma'], coffee: ['أريد قهوة، من فضلك', 'urīdu qahwa, min faḍlik'], tea: ['أريد شاياً، من فضلك', 'urīdu shāyan, min faḍlik'], howmuch: ['كم الثمن؟', 'kam ath-thaman?'], where: ['عفواً، أين المحطة؟', 'ʿafwan, ayna al-maḥaṭṭa?'], slower: ['ببطء من فضلك', 'bi-buṭʾ min faḍlik'],
    c_howareyou: ['كيف حالك؟', 'kayfa ḥāluk?'], c_name: ['ما اسمك؟', 'mā ismuk?'], c_nice: ['تشرفنا!', 'tasharrafnā!'], c_what: ['ماذا تريد أن تشرب؟', 'mādhā turīdu an tashrab?'], c_here: ['تفضل', 'tafaḍḍal'], c_price: ['الثمن ديناران', 'ath-thaman dīnārān'], c_way: ['امشِ إلى الأمام، ثم انعطف يساراً', 'imshi ilā al-amām, thumma inʿaṭif yasāran'], c_welcome: ['عفواً!', 'ʿafwan!'], c_sorry: ['عفواً، لم أفهم', 'ʿafwan, lam afham'] }),
  'zh-cantonese': P({ price: [20, 'HKD'], fine: ['幾好，多謝。你呢？', 'géi hóu, dō jeh. néih nē?'], name: ['我叫{name}', 'ngóh giu {name}'], bye: ['拜拜', 'bāai baai'], coffee: ['唔該，一杯咖啡', 'm̀h gōi, yāt būi ga fē'], tea: ['唔該，一杯奶茶', 'm̀h gōi, yāt būi náaih chàh'], howmuch: ['幾多錢？', 'géi dō chín?'], where: ['唔該，港鐵站喺邊度？', 'm̀h gōi, góng tit jaahm hái bīn douh?'], slower: ['講慢啲，唔該', 'góng maahn dī, m̀h gōi'],
    c_howareyou: ['你好嗎？', 'néih hóu ma?'], c_name: ['你叫咩名？', 'néih giu mē méng?'], c_nice: ['好高興認識你！', 'hóu gōu hing yihng sīk néih!'], c_what: ['想飲咩？', 'séung yám mē?'], c_here: ['畀你。', 'béi néih.'], c_price: ['二十蚊。', 'yih sahp mān.'], c_way: ['直行，然後轉左。', 'jihk hàahng, yìhn hauh jyun jó.'], c_welcome: ['唔使客氣！', 'm̀h sái haak hei!'], c_sorry: ['唔好意思，我唔明。', 'm̀h hóu yi si, ngóh m̀h mìhng.'] }),
  'zh-mandarin': P({ price: [20, 'CNY'], fine: ['很好，谢谢。你呢？', 'hěn hǎo, xièxie. nǐ ne?'], name: ['我叫{name}', 'wǒ jiào {name}'], bye: ['再见！', 'zàijiàn!'], coffee: ['请给我一杯咖啡', 'qǐng gěi wǒ yì bēi kāfēi'], tea: ['请给我一杯茶', 'qǐng gěi wǒ yì bēi chá'], howmuch: ['多少钱？', 'duōshao qián?'], where: ['请问，地铁站在哪儿？', 'qǐngwèn, dìtiězhàn zài nǎr?'], slower: ['请说慢一点', 'qǐng shuō màn yìdiǎn'],
    c_howareyou: ['你好吗？', 'nǐ hǎo ma?'], c_name: ['你叫什么名字？', 'nǐ jiào shénme míngzi?'], c_nice: ['很高兴认识你！', 'hěn gāoxìng rènshi nǐ!'], c_what: ['你想喝什么？', 'nǐ xiǎng hē shénme?'], c_here: ['给你。', 'gěi nǐ.'], c_price: ['二十块。', 'èrshí kuài.'], c_way: ['一直走，然后左转。', 'yìzhí zǒu, ránhòu zuǒ zhuǎn.'], c_welcome: ['不客气！', 'bú kèqi!'], c_sorry: ['不好意思，我没听懂。', 'bù hǎoyìsi, wǒ méi tīng dǒng.'] }),
  english: P({ price: [3.5, 'USD'], fine: 'I’m good, thanks. And you?', name: 'My name is {name}.', bye: 'See you later!', coffee: 'A coffee, please.', tea: 'A tea, please.', howmuch: 'How much is it?', where: 'Excuse me, where’s the subway station?', slower: 'Could you say that more slowly, please?',
    c_howareyou: 'How’s it going?', c_name: 'What’s your name?', c_nice: 'Nice to meet you!', c_what: 'What can I get you?', c_here: 'Here you go.', c_price: 'That’s three fifty.', c_way: 'Go straight, then turn left.', c_welcome: 'You’re welcome!', c_sorry: 'Sorry, I didn’t catch that.' }),
  danish: P({ price: [40, 'DKK'], fine: 'Godt, tak. Og dig?', name: 'Jeg hedder {name}.', bye: 'Hej hej!', coffee: 'En kaffe, tak.', tea: 'En te, tak.', howmuch: 'Hvad koster det?', where: 'Undskyld, hvor er stationen?', slower: 'Kan du tale lidt langsommere?',
    c_howareyou: 'Hvordan går det?', c_name: 'Hvad hedder du?', c_nice: 'Hyggeligt at møde dig!', c_what: 'Hvad skulle det være?', c_here: 'Værsgo.', c_price: 'Det bliver 40 kroner.', c_way: 'Ligeud, og så til venstre.', c_welcome: 'Selv tak!', c_sorry: 'Undskyld, det forstod jeg ikke.' }),
  french: P({ price: [3, 'EUR'], fine: 'Ça va bien, merci. Et toi ?', name: 'Je m’appelle {name}.', bye: 'Au revoir !', coffee: 'Un café, s’il vous plaît.', tea: 'Un thé, s’il vous plaît.', howmuch: 'C’est combien ?', where: 'Excusez-moi, où est la station de métro ?', slower: 'Plus lentement, s’il vous plaît.',
    c_howareyou: 'Comment ça va ?', c_name: 'Comment tu t’appelles ?', c_nice: 'Enchanté !', c_what: 'Qu’est-ce que je vous sers ?', c_here: 'Voilà.', c_price: 'Ça fait trois euros.', c_way: 'Tout droit, puis à gauche.', c_welcome: 'Je vous en prie !', c_sorry: 'Pardon, je n’ai pas compris.' }),
  german: P({ price: [3, 'EUR'], fine: 'Gut, danke. Und dir?', name: 'Ich heiße {name}.', bye: 'Tschüss!', coffee: 'Einen Kaffee, bitte.', tea: 'Einen Tee, bitte.', howmuch: 'Was kostet das?', where: 'Entschuldigung, wo ist der Bahnhof?', slower: 'Langsamer, bitte.',
    c_howareyou: 'Wie geht’s?', c_name: 'Wie heißt du?', c_nice: 'Freut mich!', c_what: 'Was darf’s sein?', c_here: 'Bitte schön.', c_price: 'Das macht drei Euro.', c_way: 'Geradeaus und dann links.', c_welcome: 'Gern geschehen!', c_sorry: 'Entschuldigung, das habe ich nicht verstanden.' }),
  greek: P({ price: [2, 'EUR'], fine: ['Καλά, ευχαριστώ. Εσύ;', 'Kalá, efcharistó. Esý?'], name: ['Με λένε {name}.', 'Me léne {name}.'], bye: ['Αντίο!', 'Adío!'], coffee: ['Έναν καφέ, παρακαλώ.', 'Énan kafé, parakaló.'], tea: ['Ένα τσάι, παρακαλώ.', 'Éna tsái, parakaló.'], howmuch: ['Πόσο κάνει;', 'Póso kánei?'], where: ['Συγγνώμη, πού είναι ο σταθμός;', 'Signómi, poú eínai o stathmós?'], slower: ['Πιο αργά, παρακαλώ.', 'Pio argá, parakaló.'],
    c_howareyou: ['Τι κάνεις;', 'Ti káneis?'], c_name: ['Πώς σε λένε;', 'Pós se léne?'], c_nice: ['Χάρηκα!', 'Chárika!'], c_what: ['Τι θα πάρετε;', 'Ti tha párete?'], c_here: ['Ορίστε.', 'Oríste.'], c_price: ['Δύο ευρώ.', 'Dýo evró.'], c_way: ['Ευθεία και μετά αριστερά.', 'Eftheía kai metá aristerá.'], c_welcome: ['Παρακαλώ!', 'Parakaló!'], c_sorry: ['Συγγνώμη, δεν κατάλαβα.', 'Signómi, den katálava.'] }),
  'haitian-creole': P({ price: [100, 'HTG'], fine: 'Byen, mèsi. E ou menm?', name: 'Mwen rele {name}.', bye: 'Orevwa!', coffee: 'Yon kafe, souple.', tea: 'Yon te, souple.', howmuch: 'Konbyen li koute?', where: 'Eskize m, kote estasyon tap-tap la ye?', slower: 'Pale pi dousman, souple.',
    c_howareyou: 'Kijan ou ye?', c_name: 'Kijan ou rele?', c_nice: 'Mwen kontan fè konesans ou!', c_what: 'Kisa ou vle bwè?', c_here: 'Men li.', c_price: 'Sa fè san goud.', c_way: 'Ale tou dwat, apre sa vire agoch.', c_welcome: 'Pa gen pwoblèm!', c_sorry: 'Eskize m, mwen pa konprann.' }),
  hebrew: P({ price: [10, 'ILS'], fine: ['טוב, תודה. ואתה?', 'tov, toda. ve-ata?'], name: ['קוראים לי {name}.', 'kor’im li {name}.'], bye: ['להתראות!', 'lehitra’ot!'], coffee: ['קפה אחד, בבקשה.', 'kafe ekhad, bevakasha.'], tea: ['תה אחד, בבקשה.', 'te ekhad, bevakasha.'], howmuch: ['כמה זה עולה?', 'kama ze ole?'], where: ['סליחה, איפה התחנה?', 'slikha, eifo ha-takhana?'], slower: ['לאט יותר, בבקשה.', 'le’at yoter, bevakasha.'],
    c_howareyou: ['מה נשמע?', 'ma nishma?'], c_name: ['איך קוראים לך?', 'eikh kor’im lekha?'], c_nice: ['נעים מאוד!', 'na’im me’od!'], c_what: ['מה תרצה לשתות?', 'ma tirtse lishtot?'], c_here: ['בבקשה.', 'bevakasha.'], c_price: ['עשרה שקלים.', 'asara shkalim.'], c_way: ['ישר, ואז שמאלה.', 'yashar, ve-az smola.'], c_welcome: ['בכיף!', 'be-kef!'], c_sorry: ['סליחה, לא הבנתי.', 'slikha, lo hevanti.'] }),
  hindi: P({ price: [20, 'INR'], fine: ['मैं ठीक हूँ, धन्यवाद। और आप?', 'main ṭhīk hūn, dhanyavād. aur āp?'], name: ['मेरा नाम {name} है।', 'merā nām {name} hai.'], bye: ['फिर मिलेंगे!', 'phir milenge!'], coffee: ['एक कॉफ़ी दीजिए।', 'ek kŏfī dījie.'], tea: ['एक चाय दीजिए।', 'ek chāy dījie.'], howmuch: ['कितने का है?', 'kitne kā hai?'], where: ['माफ़ कीजिए, स्टेशन कहाँ है?', 'māf kījie, sṭeshan kahān hai?'], slower: ['थोड़ा धीरे बोलिए।', 'thoṛā dhīre bolie.'],
    c_howareyou: ['आप कैसे हैं?', 'āp kaise hain?'], c_name: ['आपका नाम क्या है?', 'āpkā nām kyā hai?'], c_nice: ['आपसे मिलकर खुशी हुई!', 'āpse milkar khushī huī!'], c_what: ['क्या लेंगे?', 'kyā lenge?'], c_here: ['लीजिए।', 'lījie.'], c_price: ['बीस रुपये।', 'bīs rupaye.'], c_way: ['सीधे जाइए, फिर बाएँ मुड़िए।', 'sīdhe jāie, phir bāen muṛie.'], c_welcome: ['कोई बात नहीं!', 'koī bāt nahīn!'], c_sorry: ['माफ़ कीजिए, मैं समझा नहीं।', 'māf kījie, main samjhā nahīn.'] }),
  italian: P({ price: [2, 'EUR'], fine: 'Bene, grazie. E tu?', name: 'Mi chiamo {name}.', bye: 'Arrivederci!', coffee: 'Un caffè, per favore.', tea: 'Un tè, per favore.', howmuch: 'Quanto costa?', where: 'Scusi, dov’è la stazione?', slower: 'Più lentamente, per favore.',
    c_howareyou: 'Come stai?', c_name: 'Come ti chiami?', c_nice: 'Piacere!', c_what: 'Cosa prendi?', c_here: 'Ecco a te.', c_price: 'Sono due euro.', c_way: 'Sempre dritto, poi a sinistra.', c_welcome: 'Prego!', c_sorry: 'Scusa, non ho capito.' }),
  japanese: P({ price: [300, 'JPY'], fine: ['元気です。あなたは？', 'Genki desu. Anata wa?'], name: ['私は{name}です。', 'Watashi wa {name} desu.'], bye: ['またね！', 'Mata ne!'], coffee: ['コーヒーをください。', 'Kōhī o kudasai.'], tea: ['お茶をください。', 'O-cha o kudasai.'], howmuch: ['いくらですか？', 'Ikura desu ka?'], where: ['すみません、駅はどこですか？', 'Sumimasen, eki wa doko desu ka?'], slower: ['もう少しゆっくりお願いします。', 'Mō sukoshi yukkuri onegai shimasu.'],
    c_howareyou: ['お元気ですか？', 'O-genki desu ka?'], c_name: ['お名前は？', 'O-namae wa?'], c_nice: ['よろしくお願いします！', 'Yoroshiku onegai shimasu!'], c_what: ['何にしますか？', 'Nani ni shimasu ka?'], c_here: ['どうぞ。', 'Dōzo.'], c_price: ['三百円です。', 'Sanbyaku en desu.'], c_way: ['まっすぐ行って、左です。', 'Massugu itte, hidari desu.'], c_welcome: ['どういたしまして。', 'Dō itashimashite.'], c_sorry: ['すみません、よくわかりませんでした。', 'Sumimasen, yoku wakarimasen deshita.'] }),
  korean: P({ price: [3000, 'KRW'], fine: ['잘 지내요. 감사합니다.', 'jal jinaeyo. gamsahamnida.'], name: ['제 이름은 {name}입니다.', 'je ireumeun {name}imnida.'], bye: ['안녕히 계세요!', 'annyeonghi gyeseyo!'], coffee: ['커피 한 잔 주세요.', 'keopi han jan juseyo.'], tea: ['차 한 잔 주세요.', 'cha han jan juseyo.'], howmuch: ['얼마예요?', 'eolmayeyo?'], where: ['실례합니다, 역이 어디예요?', 'sillyehamnida, yeogi eodiyeyo?'], slower: ['천천히 말해 주세요.', 'cheoncheonhi malhae juseyo.'],
    c_howareyou: ['잘 지내세요?', 'jal jinaeseyo?'], c_name: ['이름이 뭐예요?', 'ireumi mwoyeyo?'], c_nice: ['만나서 반가워요!', 'mannaseo bangawoyo!'], c_what: ['뭐 드릴까요?', 'mwo deurilkkayo?'], c_here: ['여기 있어요.', 'yeogi isseoyo.'], c_price: ['삼천 원이에요.', 'samcheon wonieyo.'], c_way: ['쭉 가서 왼쪽이에요.', 'jjuk gaseo oenjjogieyo.'], c_welcome: ['천만에요!', 'cheonmaneyo!'], c_sorry: ['죄송해요, 잘 못 알아들었어요.', 'joesonghaeyo, jal mot aradeureosseoyo.'] }),
  'pt-brazil': P({ price: [5, 'BRL'], fine: 'Tudo bem, obrigado. E você?', name: 'Meu nome é {name}.', bye: 'Tchau!', coffee: 'Um café, por favor.', tea: 'Um chá, por favor.', howmuch: 'Quanto custa?', where: 'Com licença, onde fica a estação?', slower: 'Mais devagar, por favor.',
    c_howareyou: 'Tudo bem?', c_name: 'Qual é o seu nome?', c_nice: 'Prazer!', c_what: 'O que vai querer?', c_here: 'Aqui está.', c_price: 'São cinco reais.', c_way: 'Siga reto e depois vire à esquerda.', c_welcome: 'De nada!', c_sorry: 'Desculpe, não entendi.' }),
  'pt-europe': P({ price: [0.7, 'EUR'], fine: 'Estou bem, obrigado. E tu?', name: 'Chamo-me {name}.', bye: 'Até logo!', coffee: 'Um café, se faz favor.', tea: 'Um chá, se faz favor.', howmuch: 'Quanto é?', where: 'Desculpe, onde é a estação?', slower: 'Mais devagar, se faz favor.',
    c_howareyou: 'Como estás?', c_name: 'Como te chamas?', c_nice: 'Muito prazer!', c_what: 'O que deseja?', c_here: 'Aqui tem.', c_price: 'São setenta cêntimos.', c_way: 'Sempre em frente e depois à esquerda.', c_welcome: 'De nada!', c_sorry: 'Desculpe, não percebi.' }),
  romanian: P({ price: [10, 'RON'], fine: 'Bine, mulțumesc. Și tu?', name: 'Mă numesc {name}.', bye: 'La revedere!', coffee: 'O cafea, vă rog.', tea: 'Un ceai, vă rog.', howmuch: 'Cât costă?', where: 'Scuzați-mă, unde este gara?', slower: 'Mai încet, vă rog.',
    c_howareyou: 'Ce mai faci?', c_name: 'Cum te cheamă?', c_nice: 'Încântat de cunoștință!', c_what: 'Ce doriți?', c_here: 'Poftim.', c_price: 'Zece lei.', c_way: 'Mergeți drept înainte, apoi la stânga.', c_welcome: 'Cu plăcere!', c_sorry: 'Scuze, nu am înțeles.' }),
  russian: P({ price: [200, 'RUB'], fine: ['Хорошо, спасибо. А вы?', 'Khorosho, spasibo. A vy?'], name: ['Меня зовут {name}.', 'Menya zovut {name}.'], bye: ['До свидания!', 'Do svidaniya!'], coffee: ['Кофе, пожалуйста.', 'Kofe, pozhaluysta.'], tea: ['Чай, пожалуйста.', 'Chay, pozhaluysta.'], howmuch: ['Сколько стоит?', 'Skol’ko stoit?'], where: ['Извините, где метро?', 'Izvinite, gde metro?'], slower: ['Медленнее, пожалуйста.', 'Medlenneye, pozhaluysta.'],
    c_howareyou: ['Как дела?', 'Kak dela?'], c_name: ['Как вас зовут?', 'Kak vas zovut?'], c_nice: ['Очень приятно!', 'Ochen’ priyatno!'], c_what: ['Что будете пить?', 'Chto budete pit’?'], c_here: ['Пожалуйста.', 'Pozhaluysta.'], c_price: ['Двести рублей.', 'Dvesti rubley.'], c_way: ['Прямо, потом налево.', 'Pryamo, potom nalevo.'], c_welcome: ['Не за что!', 'Ne za chto!'], c_sorry: ['Простите, я не понял.', 'Prostite, ya ne ponyal.'] }),
  'es-latam': P({ price: [25, 'MXN'], fine: 'Bien, gracias. ¿Y usted?', name: 'Me llamo {name}.', bye: '¡Hasta luego!', coffee: 'Un café, por favor.', tea: 'Un té, por favor.', howmuch: '¿Cuánto cuesta?', where: 'Disculpe, ¿dónde está la estación del metro?', slower: 'Más despacio, por favor.',
    c_howareyou: '¿Cómo está?', c_name: '¿Cómo se llama?', c_nice: '¡Mucho gusto!', c_what: '¿Qué le sirvo?', c_here: 'Aquí tiene.', c_price: 'Son veinticinco pesos.', c_way: 'Siga derecho y luego a la izquierda.', c_welcome: '¡De nada!', c_sorry: 'Perdón, no le entendí.' }),
  'es-spain': P({ price: [2, 'EUR'], prices: { coffee: ['Son un euro con ochenta.', '', 1.8], tea: ['Son un euro con cincuenta.', '', 1.5] }, fine: 'Muy bien, ¿y tú?', name: 'Me llamo {name}.', bye: '¡Hasta luego!', coffee: 'Un café con leche, por favor.', tea: 'Un té, por favor.', howmuch: '¿Cuánto es?', where: 'Perdona, ¿dónde está el metro?', slower: 'Más despacio, por favor.',
    c_howareyou: '¿Qué tal?', c_name: '¿Cómo te llamas?', c_nice: '¡Mucho gusto!', c_what: '¿Qué te pongo?', c_here: 'Aquí tienes.', c_price: 'Son dos euros.', c_way: 'Todo recto y luego a la izquierda.', c_welcome: '¡De nada!', c_sorry: 'Perdona, no te he entendido.' }),
  swahili: P({ price: [1000, 'TZS'], fine: 'Nzuri, asante. Na wewe?', name: 'Jina langu ni {name}.', bye: 'Kwaheri!', coffee: 'Kahawa moja, tafadhali.', tea: 'Chai moja, tafadhali.', howmuch: 'Bei gani?', where: 'Samahani, kituo cha basi kiko wapi?', slower: 'Polepole, tafadhali.',
    c_howareyou: 'Habari yako?', c_name: 'Jina lako nani?', c_nice: 'Nimefurahi kukutana nawe!', c_what: 'Unataka nini?', c_here: 'Hii hapa.', c_price: 'Shilingi elfu moja.', c_way: 'Nenda moja kwa moja, halafu kushoto.', c_welcome: 'Karibu!', c_sorry: 'Samahani, sijaelewa.' }),
  kinyarwanda: P({ price: [500, 'RWF'], fine: 'Ni meza, murakoze. Nawe?', name: 'Nitwa {name}.', bye: 'Murabeho!', coffee: 'Ndashaka ikawa, nyamuneka.', tea: 'Ndashaka icyayi, nyamuneka.', howmuch: 'Ni angahe?', where: 'Mbabarira, gare iri he?', slower: 'Buhoro buhoro, nyamuneka.',
    c_howareyou: 'Amakuru?', c_name: 'Witwa nde?', c_nice: 'Nishimiye kukumenya!', c_what: 'Urashaka iki?', c_here: 'Dore.', c_price: 'Ni amafaranga magana atanu.', c_way: 'Genda ugororotse, hanyuma ukate ibumoso.', c_welcome: 'Nta kibazo!', c_sorry: 'Mbabarira, sinumvise.' }),
  swedish: P({ price: [30, 'SEK'], fine: 'Bra, tack. Och du?', name: 'Jag heter {name}.', bye: 'Hej då!', coffee: 'En kaffe, tack.', tea: 'Ett te, tack.', howmuch: 'Vad kostar det?', where: 'Ursäkta, var ligger stationen?', slower: 'Lite långsammare, tack.',
    c_howareyou: 'Hur mår du?', c_name: 'Vad heter du?', c_nice: 'Trevligt att träffas!', c_what: 'Vad får det vara?', c_here: 'Varsågod.', c_price: 'Det blir trettio kronor.', c_way: 'Rakt fram och sedan till vänster.', c_welcome: 'Ingen orsak!', c_sorry: 'Förlåt, jag förstod inte.' }),
  lingala: P({ price: [1000, 'CDF'], fine: 'Nazali malamu, matondo. Yo boni?', name: 'Nkombo na ngai {name}.', bye: 'Tokomonana!', coffee: 'Kafe moko, palado.', tea: 'Ti moko, palado.', howmuch: 'Ntalo boni?', where: 'Limbisa ngai, gare ezali wapi?', slower: 'Malembe, palado.',
    c_howareyou: 'Ozali malamu?', c_name: 'Nkombo na yo nani?', c_nice: 'Nasepeli koyeba yo!', c_what: 'Olingi nini?', c_here: 'Yango oyo.', c_price: 'Ezali mille francs.', c_way: 'Kende semba, sima kende na loboko ya mwasi.', c_welcome: 'Likambo te!', c_sorry: 'Limbisa ngai, nayoki te.' }),
  ukrainian: P({ price: [60, 'UAH'], fine: ['Добре, дякую. А ви?', 'Dobre, dyakuyu. A vy?'], name: ['Мене звати {name}.', 'Mene zvaty {name}.'], bye: ['До побачення!', 'Do pobachennya!'], coffee: ['Каву, будь ласка.', 'Kavu, bud’ laska.'], tea: ['Чай, будь ласка.', 'Chay, bud’ laska.'], howmuch: ['Скільки коштує?', 'Skil’ky koshtuye?'], where: ['Перепрошую, де вокзал?', 'Pereproshuyu, de vokzal?'], slower: ['Повільніше, будь ласка.', 'Povil’nishe, bud’ laska.'],
    c_howareyou: ['Як справи?', 'Yak spravy?'], c_name: ['Як вас звати?', 'Yak vas zvaty?'], c_nice: ['Дуже приємно!', 'Duzhe pryyemno!'], c_what: ['Що будете?', 'Shcho budete?'], c_here: ['Прошу.', 'Proshu.'], c_price: ['Шістдесят гривень.', 'Shistdesyat hryven’.'], c_way: ['Прямо, потім ліворуч.', 'Pryamo, potim livoruch.'], c_welcome: ['Нема за що!', 'Nema za shcho!'], c_sorry: ['Вибачте, я не зрозумів.', 'Vybachte, ya ne zrozumiv.'] }),
  vietnamese: P({ price: [20000, 'VND'], fine: 'Tôi khỏe, cảm ơn. Còn bạn?', name: 'Tôi tên là {name}.', bye: 'Tạm biệt!', coffee: 'Cho tôi một cốc cà phê.', tea: 'Cho tôi một cốc trà.', howmuch: 'Bao nhiêu tiền?', where: 'Xin lỗi, nhà ga ở đâu?', slower: 'Làm ơn nói chậm hơn.',
    c_howareyou: 'Bạn khỏe không?', c_name: 'Bạn tên là gì?', c_nice: 'Rất vui được gặp bạn!', c_what: 'Bạn uống gì?', c_here: 'Đây ạ.', c_price: 'Hai mươi nghìn đồng.', c_way: 'Đi thẳng, rồi rẽ trái.', c_welcome: 'Không có gì!', c_sorry: 'Xin lỗi, tôi không hiểu.' })
};
LQ.PACKS['zh-simplified'] = LQ.PACKS['zh-mandarin']; // Simplified is a script track sharing Mandarin speech assets (spec §2)

/* Locals for template missions in the five deep courses (the others are defined on the track). */
Object.assign(LQ.trackById('japanese'), { local: { name: 'Aoi', role: 'your neighbour on Chazawa-dōri' } });
Object.assign(LQ.trackById('english'), { local: { name: 'Maya', role: 'your neighbour on DeKalb Avenue' } });
Object.assign(LQ.trackById('french'), { local: { name: 'Margaux', role: 'a neighbour in your building' } });
Object.assign(LQ.trackById('ar-moroccan'), { local: { name: 'Salma', role: 'Youssef’s niece, an architecture student' } });
Object.assign(LQ.trackById('es-spain'), { local: { name: 'Pilar', role: 'your neighbour on the corrala stairs' } });

/* A pack entry as a phrase object {t, r, m} with concept meanings in the four instruction languages. */
/* Slot filling for any phrase object {t, r, m:{lang: text}}: replaces {name}, {price}, … */
LQ.fillSlots = (p, vars) => {
  if (!p) return p;
  const f = x => typeof x === 'string' ? x.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null && vars[k] !== '' ? vars[k] : m) : x;
  const out = Object.assign({}, p, { t: f(p.t), r: f(p.r) });
  if (p.m && typeof p.m === 'object') out.m = Object.fromEntries(Object.entries(p.m).map(([k, v]) => [k, f(v)])); else out.m = f(p.m);
  return out;
};
/* Address the learner by name where a vocative is natural in the script ("¡Mucho gusto, Alex!"). */
LQ.withName = (p, name, tid) => {
  const tr = LQ.trackById(tid);
  if (!p || !name || !tr || !['Latn', 'Cyrl', 'Grek'].includes(tr.script)) return p;
  const add = x => typeof x === 'string' && x ? x.replace(/\s*([!.?;]*)\s*$/, (m, end) => ', ' + name + (end || '!')) : x;
  return Object.assign({}, p, { t: add(p.t), r: p.r ? add(p.r) : p.r, m: p.m && typeof p.m === 'object' ? Object.fromEntries(Object.entries(p.m).map(([k, v]) => [k, add(v)])) : add(p.m) });
};
/* The price line for what was ordered. Packs may price items separately (Lucía's café:
   coffee 1,80 €, tea 1,50 €, matching the hand-written café mission); otherwise one pack price. */
LQ.packPrice = (tid, item) => {
  const pk = LQ.PACKS[tid], per = pk && pk.prices && item && pk.prices[item];
  if (!per) return LQ.packPhrase(tid, 'c_price');
  const amt = per[2].toLocaleString('en-US', { minimumFractionDigits: per[2] % 1 ? 2 : 0 }) + ' ' + pk.price[1];
  return { t: per[0], r: per[1] || '', m: Object.fromEntries(Object.entries(LQ.CONCEPTS.c_price).map(([k, v]) => [k, v.replace('{price}', amt)])) };
};
LQ.packPhrase = (tid, concept) => {
  const pk = LQ.PACKS[tid], tr = LQ.trackById(tid);
  let v = concept === 'hello' ? [tr.hello.t, tr.hello.r] : concept === 'thanks' ? [tr.thanks.t, tr.thanks.r] : pk && pk[concept];
  if (!v) return null;
  if (typeof v === 'string') v = [v, ''];
  let m = LQ.CONCEPTS[concept];
  if (concept === 'c_price') { const amt = pk.price[0].toLocaleString('en-US') + ' ' + pk.price[1]; m = Object.fromEntries(Object.entries(m).map(([k, s]) => [k, s.replace('{price}', amt)])); }
  return { t: v[0], r: v[1] || '', m };
};
