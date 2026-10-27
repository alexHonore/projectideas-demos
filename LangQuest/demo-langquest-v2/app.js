// LangQuest v2 — Conversation-First Mobile Language Learning Engine
// 30 Authentic Language Tracks with Spoken Dialogue & SRS Engine

const ALL_TRACKS = [
  { id: "fr-CA", name: "French (Québec)", flag: "🇨🇦", region: "Montréal · Québec", level: "B1 Conversational", greeting: "Bonjour ! Qu'est-ce que je vous sers aujourd'hui ?", city: "Montréal", targetReply: "Un café au lait d'avoine, s'il vous plaît.", speaker: "Élodie", avatar: "👩🏻‍🍳", place: "Café Saint-Henri", choices: ["Un café au lait d'avoine, s'il vous plaît.", "Deux croissants aux amandes pour emporter.", "Une table pour deux près de la fenêtre."], followup: "Parfait ! Sur place ou pour emporter ?", finalReply: "Sur place, merci beaucoup !", finish: "C'est noté ! Installez-vous, je vous apporte ça tout de suite." },
  { id: "fr-FR", name: "French (France)", flag: "🇫🇷", region: "Paris · Saint-Germain", level: "B1 Intermediate", greeting: "Bonjour ! Une table en terrasse ou à l'intérieur ?", city: "Paris", targetReply: "En terrasse, s'il vous plaît.", speaker: "Élodie", avatar: "👩🏻‍🍳", place: "Café de Flore", choices: ["En terrasse, s'il vous plaît.", "À l'intérieur au comptoir.", "Juste un espresso debout."], followup: "Très bien, installez-vous à la table 5. Vous désirez ?", finalReply: "Un café crème et un croissant chaud, s'il vous plaît.", finish: "Tout de suite ! Voilà pour vous, bonne dégustation." },
  { id: "es-MX", name: "Spanish (Mexico)", flag: "🇲🇽", region: "Ciudad de México · Condesa", level: "B1 Conversational", greeting: "¡Hola, buenas tardes! ¿Qué te preparamos hoy?", city: "CDMX", targetReply: "Un café con leche de avena, por favor.", speaker: "Mateo", avatar: "👨🏽‍🍳", place: "Café Nin", choices: ["Un café con leche de avena, por favor.", "¿Me recomiendas un pan dulce?", "Una mesa para dos personas, por favor."], followup: "¿Para tomar aquí o para llevar?", finalReply: "Para tomar aquí, muchas gracias.", finish: "¡Excelente! Enseguida te lo llevamos a tu mesa." },
  { id: "es-ES", name: "Spanish (Spain)", flag: "🇪🇸", region: "Madrid · Malasaña", level: "A2 Elementary", greeting: "¡Buenas! ¿Qué te pongo hoy?", city: "Madrid", targetReply: "Un café con leche y una tostada con tomate, por favor.", speaker: "Carlos", avatar: "🧔🏻", place: "Café Comercial", choices: ["Un café con leche, por favor.", "Un cortado con leche fría.", "¿Tenéis leche vegetal?"], followup: "¡Marchando! ¿Para tomar aquí o para llevar?", finalReply: "Para tomar aquí en la barra.", finish: "¡Perfecto! Aquí lo tienes, que lo disfrutes." },
  { id: "it-IT", name: "Italian (Standard)", flag: "🇮🇹", region: "Roma · Trastevere", level: "A2 Elementary", greeting: "Buongiorno! Cosa desidera prendere al banco?", city: "Roma", targetReply: "Un cappuccino e un cornetto alla crema, per favore.", speaker: "Marco", avatar: "👨🏻‍🍳", place: "Bar San Calisto", choices: ["Un cappuccino e un cornetto alla crema, per favore.", "Un espresso doppio al banco.", "Un bicchiere d'acqua frizzante, grazie."], followup: "Certamente! Vuole aggiungere un po' di cacao sopra?", finalReply: "Sì, grazie, un po' di cacao.", finish: "Ecco a Lei! Buona giornata e buon proseguimento." },
  { id: "de-DE", name: "German (Standard)", flag: "🇩🇪", region: "Berlin · Mitte", level: "A2 Elementary", greeting: "Hallo! Was darf es heute für Sie sein?", city: "Berlin", targetReply: "Einen Hafer-Cappuccino bitte.", speaker: "Hannah", avatar: "👩🏼", place: "The Barn Berlin", choices: ["Einen Hafer-Cappuccino bitte.", "Einen Espresso zum Hier-Trinken.", "Haben Sie frische Croissants?"], followup: "Sehr gerne! Zum Hier-Trinken oder zum Mitnehmen?", finalReply: "Zum Hier-Trinken, danke sehr.", finish: "Alles klar! Nehmen Sie gerne Platz, kommt gleich." },
  { id: "ja-JP", name: "Japanese (Tokyo)", flag: "🇯🇵", region: "Tokyo · Shibuya", level: "A1 Everyday Polite", greeting: "いらっしゃいませ！何になさいますか？ (Konnichiwa! Nani ni shimasu ka?)", city: "Tokyo", targetReply: "カフェラテを一つお願いします。 (Kafe rate o hitotsu onegaishimasu.)", speaker: "Kenji", avatar: "👨🏻", place: "Fuglen Shibuya", choices: ["カフェラテを一つお願いします。", "ホットコーヒーのSサイズをください。", "店内で飲めますか？"], followup: "かしこまりました。店内でお召し上がりですか？ (Inside or to-go?)", finalReply: "はい、店内でお願いします。 (For here, please.)", finish: "ありがとうございます！すぐにお持ちいたします。" },
  { id: "ar-LB", name: "Arabic (Levantine)", flag: "🇱🇧", region: "Beirut · Hamra", level: "A2 Conversational", greeting: "Marhaba! Shou baddak tishrab elyoum?", city: "Beirut", targetReply: "Ahweh ma3 haleeb, 3afak.", speaker: "Nour", avatar: "👩🏻", place: "Café Younes", choices: ["Ahweh ma3 haleeb, 3afak.", "Finjen ahweh lebneniyeh.", "3andkon croissant?"], followup: "Tekram! Hon aw takeaway?", finalReply: "Hon, shukran ktir.", finish: "Ahla w sahla! Daqaye2 w betkoun 3andak." },
  { id: "ar-MA", name: "Arabic (Moroccan)", flag: "🇲🇦", region: "Casablanca · Maarif", level: "A2 Darija", greeting: "Salam alaykum! Ash bghiti lyouma?", city: "Casablanca", targetReply: "Bghit qhwa nss-nss, 3afak.", speaker: "Yassine", avatar: "👨🏽", place: "Café Maure", choices: ["Bghit qhwa nss-nss, 3afak.", "Atay b n3na3, lah ikhallik.", "Sh7al had l-qhwa?"], followup: "Wakha marhba! Hna wla a emporter?", finalReply: "Hna, shukran bezzef.", finish: "Bssaha w raha! Daba njiha lik." },
  { id: "ar-EG", name: "Arabic (Egyptian)", flag: "🇪🇬", region: "Cairo · Zamalek", level: "A1 Colloquial", greeting: "Ahlan wa sahlan! Teshrob eh el-naharda?", city: "Cairo", targetReply: "Ahwa mazboot, law samaht.", speaker: "Ahmed", avatar: "👨🏽", place: "El Fishawy", choices: ["Ahwa mazboot, law samaht.", "Shai b na3na3, min fadlak.", "Mumken tarabeza barra?"], followup: "Men 3enaya! Hena walla take-away?", finalReply: "Hena law samaht, shukran.", finish: "Tamam ya basha, hala2 tkon 3andak!" },
  { id: "ar-MSA", name: "Arabic (Modern Standard)", flag: "🌐", region: "Pan-Arab · Formal", level: "B1 Literary", greeting: "Marhaban bik! Matha turoodu an tatanaawal?", city: "Dubai", targetReply: "Qahwah ma'a al-haleeb, min fadlik.", speaker: "Layla", avatar: "👩🏻", place: "Al Majlis", choices: ["Qahwah ma'a al-haleeb, min fadlik.", "Shay bil-na'na', shukran.", "Hal ladaykum wajabaat khafeefah?"], followup: "Bikulli suroor. Hal hunaka ayyu talab akhar?", finalReply: "Kalla, hatha yakfee, shukran jazeelan.", finish: "Tafaddal bil-juloos, satakoon jahizatan khilala daqaa'iq." },
  { id: "zh-CN", name: "Chinese (Mandarin)", flag: "🇨🇳", region: "Beijing · Chaoyang", level: "A2 Conversational", greeting: "您好！请问需要喝点什么？ (Nǐ hǎo! Qǐngwèn xūyào hē diǎn shénme?)", city: "Beijing", targetReply: "请给我一杯燕麦拿铁。 (Qǐng gěi wǒ yì bēi yànmài nátiě.)", speaker: "Mei", avatar: "👩🏻", place: "Sanlitun Café", choices: ["请给我一杯燕麦拿铁。", "一杯美式咖啡，热的。", "请问这里可以坐吗？"], followup: "好的，请问在店里喝还是带走？ (Here or to-go?)", finalReply: "在店里喝，谢谢。 (For here, thanks.)", finish: "好的，请您稍坐，马上为您做好！" },
  { id: "yue-HK", name: "Chinese (Cantonese)", flag: "🇭🇰", region: "Hong Kong · Central", level: "A2 Colloquial", greeting: "你好！想飲啲咩呀？ (Néih hóu! Séung yám dī mē a?)", city: "Hong Kong", targetReply: "唔該一杯熱奶茶。 (M̀h'gōi yāt būi yiht náaih'chàh.)", speaker: "Wing", avatar: "👨🏻", place: "Lan Fong Yuen", choices: ["唔該一杯熱奶茶。", "一個菠蘿油，熱奶茶走甜。", "行街定堂食？"], followup: "好呀！堂食定係拎走？ (For here or takeaway?)", finalReply: "堂食唔該，多謝！ (For here, thank you!)", finish: "好嘅，搵個位坐低先，陣間送過嚟！" },
  { id: "en-US", name: "English (US / Global)", flag: "🇺🇸", region: "New York · SoHo", level: "B2 Fluency", greeting: "Hey there! What can I get started for you today?", city: "New York", targetReply: "I'll have an iced oat milk latte, please.", speaker: "Emma", avatar: "👩🏼", place: "Devoción Coffee", choices: ["I'll have an iced oat milk latte, please.", "Just a drip coffee with a splash of milk.", "Could I see your pastry selection?"], followup: "Awesome! Is that for here or to go?", finalReply: "For here, thanks so much!", finish: "You got it! Have a seat and we'll call your name shortly." },
  { id: "pt-BR", name: "Portuguese (Brazilian)", flag: "🇧🇷", region: "Rio de Janeiro · Ipanema", level: "A2 Elementary", greeting: "Olá, tudo bem? O que vai querer hoje?", city: "Rio", targetReply: "Um pingado e um pão de queijo, por favor.", speaker: "Lucas", avatar: "👨🏽", place: "Confeitaria Colombo", choices: ["Um pingado e um pão de queijo, por favor.", "Um café com leite bem quentinho.", "Tem mesa lá fora?"], followup: "Com certeza! É para tomar aqui ou viagem?", finalReply: "Pra tomar aqui mesmo, obrigado!", finish: "Perfeito! Já levo na sua mesa, fique à vontade." },
  { id: "pt-PT", name: "Portuguese (European)", flag: "🇵🇹", region: "Lisboa · Chiado", level: "A2 Elementary", greeting: "Bom dia! O que vai desejar ao balcão?", city: "Lisboa", targetReply: "Uma bica e um pastel de nata, se faz favor.", speaker: "Inês", avatar: "👩🏻", place: "A Brasileira", choices: ["Uma bica e um pastel de nata, se faz favor.", "Um galão com torrada.", "Queria uma mesa para dois."], followup: "Com certeza. Quer a bica em chávena escaldada?", finalReply: "Sim, por favor, muito obrigado.", finish: "Com certeza, sai já um café fresquinho!" },
  { id: "ru-RU", name: "Russian (Standard)", flag: "🇷🇺", region: "Saint Petersburg", level: "A2 Everyday", greeting: "Здравствуйте! Что для вас приготовить?", city: "St. Petersburg", targetReply: "Капучино на овсяном молоке, пожалуйста.", speaker: "Dmitry", avatar: "👨🏼", place: "Bake & Coffee", choices: ["Капучино на овсяном молоке, пожалуйста.", "Двойной эспрессо и круассан.", "Можно столик у окна?"], followup: "С удовольствием! Здесь будете или с собой?", finalReply: "Здесь, спасибо большое.", finish: "Отлично! Присаживайтесь, скоро всё принесём." },
  { id: "ko-KR", name: "Korean (Standard)", flag: "🇰🇷", region: "Seoul · Hongdae", level: "A1 Polite Register", greeting: "안녕하세요! 주문하시겠어요? (Annyeonghaseyo! Jumunhashigessoyo?)", city: "Seoul", targetReply: "따뜻한 아메리카노 한 잔 부탁드려요. (Ttatteut-han amerikano han jan butakdeuryeoyo.)", speaker: "Min-ji", avatar: "👩🏻", place: "Anthracite Coffee", choices: ["따뜻한 아메리카노 한 잔 부탁드려요.", "아이스 바닐라 라떼 한 잔 주세요.", "매장에서 마시고 갈게요."], followup: "네! 드시고 가세요, 테이크아웃이세요? (For here or to-go?)", finalReply: "먹고 갈게요, 감사합니다. (For here, thank you.)", finish: "네, 진동벨 울리면 픽업대로 와주세요!" },
  { id: "el-GR", name: "Greek (Standard)", flag: "🇬🇷", region: "Athens · Plaka", level: "A2 Everyday", greeting: "Geia sas! Ti tha parageilete simera?", city: "Athens", targetReply: "Ena freddo espresso sketo, parakalo.", speaker: "Nikos", avatar: "👨🏻", place: "Dioskouri Café", choices: ["Ena freddo espresso sketo, parakalo.", "Ena elliniko me oligi zahari.", "Ehete kapoio trapezi ekso?"], followup: "Bebaios! Gia edo i paketo?", finalReply: "Gia edo, efharisto poli.", finish: "Teleia! Kathiste kai sas to fernoume amesos." },
  { id: "hi-IN", name: "Hindi (Standard)", flag: "🇮🇳", region: "Delhi · Connaught Place", level: "A1 Conversational", greeting: "Namaste! Aap kya lena pasand karenge?", city: "Delhi", targetReply: "Ek cup masala chai aur samosa, kripya.", speaker: "Priya", avatar: "👩🏽", place: "Chai Point", choices: ["Ek cup masala chai aur samosa, kripya.", "Ek cold coffee de dijiye.", "Kya yahan baithne ki jagah hai?"], followup: "Ji bilkul! Yahan piyenge ya le jaenge?", finalReply: "Yahi piyenge, dhanyavaad.", finish: "Bahut badhiya! Bas do minute mein laati hoon." },
  { id: "ht-HT", name: "Haitian Creole", flag: "🇭🇹", region: "Port-au-Prince · Pétion-Ville", level: "A2 Conversational", greeting: "Bonjou! Kisa m ka sèvi w jodi a?", city: "Pétion-Ville", targetReply: "M ta renmen yon bon ti kafe ak lèt, tanpri.", speaker: "Jean", avatar: "👨🏾", place: "Kafe Kreyòl", choices: ["M ta renmen yon bon ti kafe ak lèt, tanpri.", "Ban mwen yon ji fre, silvouplè.", "Èske gen yon plas bò fenèt la?"], followup: "Pa gen pwoblèm! W ap bwè l isit la oswa pou pote ale?", finalReply: "M ap bwè l isit la, mèsi anpil.", finish: "Rete chita la, m ap pote l pou ou touswit!" },
  { id: "sw-TZ", name: "Swahili", flag: "🇹🇿", region: "Dar es Salaam · Masaki", level: "A1 Everyday", greeting: "Habari za asubuhi! Nikusaidie nini leo?", city: "Dar es Salaam", targetReply: "Naomba kahawa ya maziwa, tafadhali.", speaker: "Amina", avatar: "👩🏾", place: "Zanzibar Spices Café", choices: ["Naomba kahawa ya maziwa, tafadhali.", "Chai ya rangi na mandazi mawili.", "Naweza kukaa hapa?"], followup: "Vizuri sana! Utakunywa hapa au unaondoka nayo?", finalReply: "Nitakunywa hapa, asante sana.", finish: "Karibu sana! Kaa utulize, inakuja sasa hivi." },
  { id: "he-IL", name: "Hebrew (Modern)", flag: "🇮🇱", region: "Tel Aviv · Neve Tzedek", level: "A2 Conversational", greeting: "Shalom! Ma efshar lehavi lachem hayom?", city: "Tel Aviv", targetReply: "Kafé hafoukh gadol im halav shibolet shual, bevakasha.", speaker: "Noa", avatar: "👩🏻", place: "Café Levinsky", choices: ["Kafé hafoukh gadol im halav shibolet shual, bevakasha.", "Espresso katsar ve-kruasan.", "Yesh makom bashevet behutz?"], followup: "Afla! Leshevet po o lakachat?", finalReply: "Leshevet po, toda raba.", finish: "Sababa legamre! Tshevu, ze miyad magi'a." },
  { id: "da-DK", name: "Danish", flag: "🇩🇰", region: "København · Nørrebro", level: "A2 Conversational", greeting: "Hej! Hvad må jeg servere for dig i dag?", city: "Copenhagen", targetReply: "En havremælks latte og en kardemommebolle, tak.", speaker: "Frederik", avatar: "👨🏼", place: "Coffee Collective", choices: ["En havremælks latte og en kardemommebolle, tak.", "Bare en sort kaffe, tak.", "Må vi sidde ved vinduet?"], followup: "Lige præcis! Skal det nydes her eller tages med?", finalReply: "Vi drikker det her, tusind tak.", finish: "Så gerne! Tag plads, så kommer det om lidt." },
  { id: "sv-SE", name: "Swedish", flag: "🇸🇪", region: "Stockholm · Södermalm", level: "A2 Conversational", greeting: "Hej! Vad får det lov att vara för fika idag?", city: "Stockholm", targetReply: "En havrelatte och en kanelbulle, tack.", speaker: "Astrid", avatar: "👩🏼", place: "Drop Coffee", choices: ["En havrelatte och en kanelbulle, tack.", "En bryggkaffe med påtår.", "Kan man sitta på innergården?"], followup: "Vad gott! Ska det vara här eller för avhämtning?", finalReply: "Här, tack så mycket.", finish: "Toppen! Slå dig ner så ropar vi när det är klart." },
  { id: "ro-RO", name: "Romanian", flag: "🇷🇴", region: "București · Centrul Vechi", level: "A2 Conversational", greeting: "Bună ziua! Cu ce vă pot servi astăzi?", city: "Bucharest", targetReply: "Un cappuccino cu lapte de ovăz, vă rog.", speaker: "Ioana", avatar: "👩🏻", place: "Origo Coffee", choices: ["Un cappuccino cu lapte de ovăz, vă rog.", "Un espresso dublu și un croissant.", "Aveți o masă liberă afară?"], followup: "Sigur că da! Serviți aici sau la pachet?", finalReply: "Aici, vă mulțumesc frumos.", finish: "Perfect! Luați loc, vine imediat comanda dumneavoastră." },
  { id: "uk-UA", name: "Ukrainian", flag: "🇺🇦", region: "Kyiv · Podil", level: "A2 Conversational", greeting: "Доброго дня! Що для вас приготувати? (Dobroho dnya! Shcho pryhotuvaty?)", city: "Kyiv", targetReply: "Капучино на вівсяному молоці, будь ласка. (Kapuchyno na vivsyanomu molotsi, bud laska.)", speaker: "Oksana", avatar: "👩🏻", place: "Kaffa Kyiv", choices: ["Капучино на вівсяному молоці, будь ласка.", "Фільтр-каву та свіжий круасан.", "Чи є у вас вільний столик біля вікна?"], followup: "Чудово! Тут будете чи з собою? (Here or to-go?)", finalReply: "Тут, щиро дякую. (Here, thank you!)", finish: "Чудово! Сідайте, зараз все принесемо." },
  { id: "vi-VN", name: "Vietnamese", flag: "🇻🇳", region: "Hà Nội · Old Quarter", level: "A1 Conversational", greeting: "Xin chào! Bạn muốn dùng gì hôm nay ạ?", city: "Hanoi", targetReply: "Cho tôi một cà phê sữa đá, làm ơn.", speaker: "Linh", avatar: "👩🏻", place: "Cộng Cà Phê", choices: ["Cho tôi một cà phê sữa đá, làm ơn.", "Một cà phê trứng nóng thơm ngon.", "Có bàn ngồi trên lầu không ạ?"], followup: "Dạ được ạ! Bạn uống ở đây hay mang đi?", finalReply: "Uống ở đây, cảm ơn bạn nhiều.", finish: "Dạ vâng, bạn cứ lên bàn ngồi, em mang lên ngay ạ!" },
  { id: "rw-RW", name: "Kinyarwanda", flag: "🇷🇼", region: "Kigali · Kimihurura", level: "A1 Everyday", greeting: "Muraho neza! Ni iki mbagaburira uyu munsi?", city: "Kigali", targetReply: "Mumpa ikawa irimo amata, ndabinginze.", speaker: "Keza", avatar: "👩🏾", place: "Question Coffee Kigali", choices: ["Mumpa ikawa irimo amata, ndabinginze.", "Icyayi cy'amababi n'umugati.", "Nshobora kwicara hanze?"], followup: "Ni byiza cyane! Murayinywera hano cyangwa muragenda nayo?", finalReply: "Turi buyinywere hano, murakoze cyane.", finish: "Birasobanutse! Nimwicare, ndahita mbizanira vuba." },
  { id: "ln-CD", name: "Lingala", flag: "🇨🇩", region: "Kinshasa · Gombe", level: "A1 Everyday", greeting: "Mbote na yo! Olingi komela nini lelo?", city: "Kinshasa", targetReply: "Napesi mposa ya café na miliki, s'il vous plaît.", speaker: "Fally", avatar: "👨🏾", place: "Café de la Gombe", choices: ["Napesi mposa ya café na miliki, s'il vous plaît.", "Mayi ya malili na beignet.", "Esika ya kovanda eza?"], followup: "Malamu mingi! Okomela awa to o komema na nzela?", finalReply: "Nkomela kaka awa, matondi mingi.", finish: "Kitoko makasi! Vanda malamu, nayei nango sikoyo." }
];

const VOCAB_DATABASE = [
  { term: "Un café allongé", phonetic: "/œ̃ ka.fe a.lɔ̃.ʒe/", meaning: "An Americano (espresso with hot water)", usage: "Deux cafés allongés pour la table 4 !", mastered: true },
  { term: "L'addition, s'il vous plaît", phonetic: "/la.di.sjɔ̃ sil vu plɛ/", meaning: "The bill, please", usage: "Excusez-moi, l'addition, s'il vous plaît.", mastered: false },
  { term: "C'est délicieux", phonetic: "/sɛ de.li.sjø/", meaning: "It is delicious", usage: "Ce croissant aux amandes est délicieux.", mastered: true },
  { term: "À emporter", phonetic: "/a ɑ̃.pɔʁ.te/", meaning: "To go / Takeaway", usage: "Sur place ou à emporter ?", mastered: true },
  { term: "Une table près de la fenêtre", phonetic: "/yn tabl pʁɛ də la fə.nɛtʁ/", meaning: "A table by the window", usage: "Avez-vous une table libre près de la fenêtre ?", mastered: false },
  { term: "Je vous en prie", phonetic: "/ʒə vu.z‿ɑ̃ pʁi/", meaning: "You are very welcome", usage: "Merci pour le service ! — Je vous en prie !", mastered: true }
];

let activeTrack = ALL_TRACKS[0];
let activeCardIndex = 0;
let isAudioPlaying = false;
let audioTimer = null;
let currentSeconds = 154; // 02:34
const totalSeconds = 490; // 08:10
let conversationStep = 0; // 0: initial, 1: after user reply 1, 2: after user reply 2 (complete)
let audioPlaybackSpeed = 1.0;

document.addEventListener("DOMContentLoaded", () => {
  setupDeviceSwitcher();
  setupBottomNav();
  setupCourseDropdown();
  renderMissionChat();
  setupAudioPlayer();
  setupFlashcardSRS();
  setupHomeHero();
});

// Toast notification helper
function showToast(msg) {
  const toast = document.getElementById("toast-notify");
  if (!toast) return;
  toast.innerHTML = `<span style="margin-right:6px">✨</span>${msg}`;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

// Device Viewport Switcher (iPhone 16 Pro frame vs Fullscreen)
function setupDeviceSwitcher() {
  const btnPhone = document.getElementById("btn-phone-view");
  const btnFluid = document.getElementById("btn-fluid-view");

  if (btnPhone) {
    btnPhone.addEventListener("click", () => {
      document.body.classList.remove("mode-fluid");
      document.body.classList.add("mode-phone");
      btnPhone.classList.add("active");
      btnFluid.classList.remove("active");
    });
  }

  if (btnFluid) {
    btnFluid.addEventListener("click", () => {
      document.body.classList.remove("mode-phone");
      document.body.classList.add("mode-fluid");
      btnFluid.classList.add("active");
      btnPhone.classList.remove("active");
    });
  }
}

// Bottom Nav handling
function setupBottomNav() {
  const navTabs = document.querySelectorAll(".nav-tab");
  const panes = document.querySelectorAll(".tab-pane");

  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const paneName = tab.getAttribute("data-pane");
      const targetPaneId = "pane-" + paneName;
      navTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      panes.forEach(p => p.classList.add("hidden"));
      const targetPane = document.getElementById(targetPaneId);
      if (targetPane) targetPane.classList.remove("hidden");

      // Scroll top
      const scrollEl = document.querySelector(".scroll-content");
      if (scrollEl) scrollEl.scrollTop = 0;
    });
  });
}

// Home Quick Shortcuts
function setupHomeHero() {
  window.startMissionFromHome = function() {
    document.querySelector('[data-pane="missions"]').click();
  };
  window.openRecallTab = function() {
    document.querySelector('[data-pane="notebook"]').click();
  };
  window.openAudioPlayerFromHome = function() {
    document.querySelector('[data-pane="audio"]').click();
    if (!isAudioPlaying) toggleAudioPlay();
  };
  window.quickFlipWord = function(term, meaning) {
    document.querySelector('[data-pane="notebook"]').click();
    showToast(`Loaded "${term}" into spaced recall.`);
  };
}

// 30-Course Catalog Dropdown Setup
function setupCourseDropdown() {
  const trigger = document.getElementById("course-trigger");
  const menu = document.getElementById("course-menu");
  const list = document.getElementById("course-dropdown-list");
  const flagEl = document.getElementById("cur-flag");
  const nameEl = document.getElementById("cur-lang-name");
  const levelEl = document.getElementById("cur-lang-level");

  // Populate all 30 tracks dynamically with search filter
  function renderDropdownTracks(tracks) {
    list.innerHTML = tracks.map(t => `
      <div class="dropdown-item ${t.id === activeTrack.id ? 'active' : ''}" data-id="${t.id}">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:20px;">${t.flag}</span>
          <div>
            <strong style="color:#fff; font-size:13px; display:block;">${t.name}</strong>
            <small style="color:var(--text-muted); font-size:11px;">${t.region}</small>
          </div>
        </div>
        <span class="badge-active" style="font-size:10px; padding:3px 8px; border-radius:12px; background:rgba(99,102,241,0.2); color:#a5b4fc;">
          ${t.level.split(' ')[0]}
        </span>
      </div>
    `).join("");

    list.querySelectorAll(".dropdown-item").forEach(el => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-id");
        switchTrack(id);
        menu.classList.add("hidden");
      });
    });
  }

  // Prepend search bar inside dropdown header
  if (menu && !menu.querySelector(".dropdown-search-wrap")) {
    const searchWrap = document.createElement("div");
    searchWrap.className = "dropdown-search-wrap";
    searchWrap.style.padding = "4px 4px 8px 4px";
    searchWrap.innerHTML = `
      <input type="text" id="track-search-input" placeholder="Search 30 languages (e.g. French, Spanish, Japanese)..." 
        style="width:100%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:8px 12px; color:#fff; font-size:12px; outline:none;" />
    `;
    const scrollContainer = document.getElementById("course-dropdown-list");
    menu.insertBefore(searchWrap, scrollContainer);

    const input = searchWrap.querySelector("input");
    input.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = ALL_TRACKS.filter(t => t.name.toLowerCase().includes(q) || t.region.toLowerCase().includes(q));
      renderDropdownTracks(filtered);
    });
  }

  renderDropdownTracks(ALL_TRACKS);

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    menu.classList.add("hidden");
  });
}

// Switch Active Language Track
function switchTrack(trackId) {
  const found = ALL_TRACKS.find(t => t.id === trackId);
  if (!found) return;
  activeTrack = found;

  // Update Header UI
  document.getElementById("cur-flag").textContent = found.flag;
  document.getElementById("cur-lang-name").textContent = found.name;
  document.getElementById("cur-lang-level").textContent = `${found.level} ▾`;

  // Update Mission Hero
  const homeHeroTitle = document.getElementById("home-mission-title");
  if (homeHeroTitle) homeHeroTitle.textContent = `${found.place} · First Spoken Interaction`;

  // Reset conversation
  conversationStep = 0;
  renderMissionChat();

  // Update Audio Episode
  document.getElementById("audio-title").textContent = `Ep 1: The Spoken Order (${found.city})`;
  document.getElementById("audio-track-desc").textContent = `${found.name} Immersive Dialogue Series`;
  document.getElementById("sub-active-text").textContent = `"${found.greeting}"`;

  // Update Spaced Recall Card
  document.getElementById("card-term").textContent = found.targetReply;
  document.getElementById("card-phonetic").textContent = `Native Spoken Target · ${found.name}`;
  document.getElementById("card-meaning").textContent = found.targetReply;
  document.getElementById("card-usage").textContent = `"${found.greeting}" — "${found.targetReply}"`;

  showToast(`Switched learning track to ${found.name} ${found.flag}`);
}

// Spoken Audio Synthesizer (Web Speech API with graceful fallback)
window.playAudioText = function(text, langCode = null) {
  const targetLang = langCode || activeTrack.id;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
    showToast(`Playing native pronunciation (${targetLang})`);
  } else {
    playChime();
    showToast(`Audio: "${text}"`);
  }
};

function playChime(freq = 587.33) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

// Mission Dialogue Chat & Voice Input
function renderMissionChat() {
  const avatarEl = document.getElementById("mission-avatar");
  const charNameEl = document.getElementById("mission-char-name");
  const stream = document.getElementById("chat-stream");
  const promptTitle = document.getElementById("speech-turn-prompt");
  const chipsContainer = document.getElementById("reply-chips-container");
  const micLabel = document.getElementById("mic-status-label");

  if (!stream) return;

  avatarEl.textContent = activeTrack.avatar;
  charNameEl.textContent = `${activeTrack.speaker} · Host at ${activeTrack.place}`;

  if (conversationStep === 0) {
    stream.innerHTML = `
      <div class="chat-bubble character">
        <div class="bubble-speaker">${activeTrack.speaker} (${activeTrack.city})</div>
        <div class="bubble-text">"${activeTrack.greeting}"</div>
        <button class="btn-listen-voice" onclick="playAudioText('${activeTrack.greeting.replace(/'/g, "\\'")}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          Listen Native
        </button>
      </div>
    `;

    promptTitle.textContent = `Your Turn: Order politely in ${activeTrack.name}`;
    chipsContainer.innerHTML = activeTrack.choices.map(c => `
      <button class="prompt-chip" onclick="submitReply('${c.replace(/'/g, "\\'")}')">
        <span>🗣️</span> "${c}"
      </button>
    `).join("");

    micLabel.textContent = "Tap Mic to Speak & Score Accent";
  }
}

// User submits speech turn
window.submitReply = function(userText) {
  const stream = document.getElementById("chat-stream");
  const promptTitle = document.getElementById("speech-turn-prompt");
  const chipsContainer = document.getElementById("reply-chips-container");
  const micLabel = document.getElementById("mic-status-label");

  // Play audio of user phrase
  playAudioText(userText);

  // User speech bubble
  const userBubble = document.createElement("div");
  userBubble.className = "chat-bubble user";
  userBubble.innerHTML = `
    <div class="bubble-speaker">You (Learner)</div>
    <div class="bubble-text">"${userText}"</div>
    <div style="margin-top:6px; display:flex; align-items:center; gap:6px;">
      <span style="font-size:10px; background:rgba(16,185,129,0.25); color:#6ee7b7; padding:2px 8px; border-radius:12px; font-weight:700;">
        🎯 98% Pronunciation Match
      </span>
      <span style="font-size:10px; color:#c7d2fe;">Pimsleur Intonation Score</span>
    </div>
  `;
  stream.appendChild(userBubble);
  stream.scrollTop = stream.scrollHeight;

  conversationStep++;

  if (conversationStep === 1) {
    // Character replies with follow-up
    setTimeout(() => {
      const followBubble = document.createElement("div");
      followBubble.className = "chat-bubble character";
      followBubble.innerHTML = `
        <div class="bubble-speaker">${activeTrack.speaker}</div>
        <div class="bubble-text">"${activeTrack.followup}"</div>
        <button class="btn-listen-voice" onclick="playAudioText('${activeTrack.followup.replace(/'/g, "\\'")}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          Listen Native
        </button>
      `;
      stream.appendChild(followBubble);
      stream.scrollTop = stream.scrollHeight;

      promptTitle.textContent = `Respond: Clarify your preference`;
      chipsContainer.innerHTML = `
        <button class="prompt-chip" onclick="submitReply('${activeTrack.finalReply.replace(/'/g, "\\'")}')">
          <span>🗣️</span> "${activeTrack.finalReply}"
        </button>
      `;
    }, 600);
  } else if (conversationStep >= 2) {
    // Mission completed!
    setTimeout(() => {
      const finishBubble = document.createElement("div");
      finishBubble.className = "chat-bubble character";
      finishBubble.innerHTML = `
        <div class="bubble-speaker">${activeTrack.speaker}</div>
        <div class="bubble-text">"${activeTrack.finish}"</div>
        <div style="margin-top:10px; padding:10px 12px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); border-radius:10px;">
          <strong style="color:#6ee7b7; font-size:12px; display:block;">🎉 Mission Complete! Full Spoken Dialogue Passed</strong>
          <span style="color:#e2e8f0; font-size:11px;">+50 XP earned · Spoken fluency level: B1 Confident</span>
        </div>
      `;
      stream.appendChild(finishBubble);
      stream.scrollTop = stream.scrollHeight;

      // Increment XP
      const xp = document.getElementById("xp-num");
      if (xp) xp.textContent = parseInt(xp.textContent) + 50;

      promptTitle.textContent = `Mission Complete! Try another track or review vocab.`;
      chipsContainer.innerHTML = `
        <button class="prompt-chip" onclick="resetMissionChat()">
          <span>🔄</span> Practice Again
        </button>
        <button class="prompt-chip" onclick="openRecallTab()">
          <span>📓</span> Open Recall Notebook
        </button>
      `;

      showToast("🎉 Mission Accomplished! +50 XP");
    }, 700);
  }
};

window.resetMissionChat = function() {
  conversationStep = 0;
  renderMissionChat();
};

// Push to Talk Mic Button
window.handleMicClick = function() {
  const micBtn = document.getElementById("btn-talk-mic");
  const micLabel = document.getElementById("mic-status-label");

  micBtn.classList.add("active-record");
  micLabel.textContent = "Listening to your accent... Speak now";
  playChime(659.25);

  setTimeout(() => {
    micBtn.classList.remove("active-record");
    micLabel.textContent = "Pronunciation Score: 98% (Native Intonation Verified!)";
    const phrase = conversationStep === 0 ? activeTrack.targetReply : activeTrack.finalReply;
    submitReply(phrase);
  }, 1900);
};

// Audio Player
function setupAudioPlayer() {
  const playBtn = document.getElementById("btn-audio-main-play");
  if (playBtn) playBtn.addEventListener("click", toggleAudioPlay);
}

function toggleAudioPlay() {
  const icon = document.getElementById("audio-play-icon");
  isAudioPlaying = !isAudioPlaying;

  if (isAudioPlaying) {
    icon.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
    showToast(`Streaming hands-free track: ${activeTrack.name}`);
    playAudioText(activeTrack.greeting);
    clearInterval(audioTimer);
    audioTimer = setInterval(updateAudioProgress, 1000 / audioPlaybackSpeed);
  } else {
    icon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
    clearInterval(audioTimer);
    if ('speechSynthesis' in window) window.speechSynthesis.pause();
  }
}

function updateAudioProgress() {
  currentSeconds += 1;
  if (currentSeconds > totalSeconds) currentSeconds = 0;

  const pct = (currentSeconds / totalSeconds) * 100;
  const fill = document.getElementById("audio-scrub-fill");
  if (fill) fill.style.width = pct + "%";

  const min = Math.floor(currentSeconds / 60);
  const sec = currentSeconds % 60;
  const timeEl = document.getElementById("audio-current-time");
  if (timeEl) timeEl.textContent = `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;

  // Subtitle updates according to time segments
  const subEl = document.getElementById("sub-active-text");
  if (subEl) {
    if (currentSeconds % 12 < 4) {
      subEl.textContent = `"${activeTrack.greeting}"`;
    } else if (currentSeconds % 12 < 8) {
      subEl.textContent = `"${activeTrack.targetReply}"`;
    } else {
      subEl.textContent = `"${activeTrack.followup}"`;
    }
  }
}

window.adjustAudioTime = function(deltaSeconds) {
  currentSeconds = Math.max(0, Math.min(totalSeconds, currentSeconds + deltaSeconds));
  updateAudioProgress();
  showToast(`Scrubbed ${deltaSeconds > 0 ? '+' : ''}${deltaSeconds}s`);
};

window.handleScrub = function(event) {
  const scrubber = event.currentTarget;
  const rect = scrubber.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, clickX / rect.width));
  currentSeconds = Math.floor(pct * totalSeconds);
  updateAudioProgress();
};

window.setSpeed = function(speed, btn) {
  audioPlaybackSpeed = speed;
  document.querySelectorAll(".speed-pill").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");
  if (isAudioPlaying) {
    clearInterval(audioTimer);
    audioTimer = setInterval(updateAudioProgress, 1000 / audioPlaybackSpeed);
  }
  showToast(`Audio speed set to ${speed}x`);
};

window.addPhraseToNotebook = function() {
  const currentSub = document.getElementById("sub-active-text").textContent.replace(/"/g, "");
  VOCAB_DATABASE.unshift({
    term: currentSub,
    phonetic: `Spoken Phrase · ${activeTrack.name}`,
    meaning: "Saved from live audio transcript",
    usage: currentSub,
    mastered: false
  });
  renderVocabList();
  showToast(`Saved "${currentSub}" to Spaced Recall!`);
};

// Spaced Repetition Flashcards & Notebook
function setupFlashcardSRS() {
  renderCard(0);
  renderVocabList();
}

function renderCard(index) {
  if (index >= VOCAB_DATABASE.length) index = 0;
  activeCardIndex = index;
  const card = VOCAB_DATABASE[activeCardIndex];

  document.getElementById("card-term").textContent = card.term;
  document.getElementById("card-phonetic").textContent = card.phonetic;
  document.getElementById("card-meaning").textContent = card.meaning;
  document.getElementById("card-usage").textContent = `"${card.usage}"`;

  const wrap = document.getElementById("flashcard-flip-wrap");
  if (wrap) wrap.classList.remove("flipped");
}

window.flipFlashcard = function() {
  const wrap = document.getElementById("flashcard-flip-wrap");
  wrap.classList.toggle("flipped");
  playChime(440);
};

window.nextCard = function(quality) {
  const wrap = document.getElementById("flashcard-flip-wrap");
  wrap.classList.remove("flipped");

  let msg = "Card reviewed";
  if (quality === 'hard') msg = "Scheduled for review tomorrow (1d)";
  if (quality === 'good') msg = "Memory interval extended to 3 days (3d)";
  if (quality === 'easy') msg = "Mastered! Scheduled in 7 days (7d)";

  showToast(msg);
  setTimeout(() => {
    activeCardIndex = (activeCardIndex + 1) % VOCAB_DATABASE.length;
    renderCard(activeCardIndex);
  }, 250);
};

function renderVocabList() {
  const countEl = document.getElementById("saved-vocab-count");
  if (countEl) countEl.textContent = VOCAB_DATABASE.length;

  const container = document.querySelector(".notebook-list-section");
  if (!container) return;

  const header = `<h4>Saved Vocabulary (<span id="saved-vocab-count">${VOCAB_DATABASE.length}</span> Phrases)</h4>`;
  const rows = VOCAB_DATABASE.slice(0, 6).map(v => `
    <div class="vocab-row">
      <div>
        <strong style="color:#fff; font-size:13px;">${v.term}</strong><br>
        <small style="color:var(--text-muted); font-size:11px;">${v.meaning}</small>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button class="btn-listen-mini" onclick="playAudioText('${v.term.replace(/'/g, "\\'")}')" style="background:none; border:none; color:var(--primary-indigo); cursor:pointer; font-size:14px;">🔊</button>
        <span class="v-pill" style="font-size:10px; padding:2px 8px; border-radius:10px; background:${v.mastered ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}; color:${v.mastered ? '#6ee7b7' : '#fcd34d'};">
          ${v.mastered ? 'Mastered' : 'Due Soon'}
        </span>
      </div>
    </div>
  `).join("");

  container.innerHTML = header + rows;
}
