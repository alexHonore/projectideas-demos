'use strict';
const TRACKS = [
 ['Arabic (Eastern)','Lebanese · Levantine','ar-LB','Arab','مرحبا','Marhaba','بيروت','Beirut'],
 ['Arabic (Moroccan)','Casablanca · Darija','ary','Arab','السلام عليكم','Salam alaykum','الدار البيضاء','Casablanca'],
 ['Arabic (Egyptian)','Cairo · Colloquial','ar-EG','Arab','أهلاً','Ahlan','القاهرة','Cairo'],
 ['Arabic (Modern Standard)','Formal register','ar','Arab','مرحباً','Marhaban','العربية','A new city'],
 ['Chinese (Cantonese)','Hong Kong · Cantonese','yue-HK','Hant','你好','néih hóu','香港','Hong Kong'],
 ['Chinese (Mandarin)','Mandarin · Simplified / Traditional','zh-CN','Hans','你好','nǐ hǎo','北京','Beijing'],
 ['Chinese (Simplified)','Mandarin · Simplified writing','zh-CN','Hans','你好','nǐ hǎo','上海','Shanghai'],
 ['English','United States · US / GB','en-US','Latn','Hello','Hello','New York','New York'],
 ['Danish','Denmark','da-DK','Latn','Hej','Hej','København','Copenhagen'],
 ['French','France · FR / CA','fr-FR','Latn','Bonjour','Bonjour','Paris','Paris'],
 ['German','Germany','de-DE','Latn','Hallo','Hallo','Berlin','Berlin'],
 ['Greek','Greece','el-GR','Grek','Γεια σας','Yia sas','Αθήνα','Athens'],
 ['Haitian Creole','Haiti · Kreyòl','ht-HT','Latn','Bonjou','Bonjou','Pòtoprens','Port-au-Prince'],
 ['Hebrew','Israel','he-IL','Hebr','שלום','Shalom','תל אביב','Tel Aviv'],
 ['Hindi','India','hi-IN','Deva','नमस्ते','Namaste','दिल्ली','Delhi'],
 ['Italian','Italy','it-IT','Latn','Ciao','Ciao','Roma','Rome'],
 ['Japanese','Japan · Polite everyday speech','ja-JP','Jpan','こんにちは','Konnichiwa','東京','Tokyo'],
 ['Korean','South Korea · Polite register','ko-KR','Kore','안녕하세요','Annyeonghaseyo','서울','Seoul'],
 ['Portuguese (Brazilian)','Brazil','pt-BR','Latn','Olá','Olá','Rio de Janeiro','Rio de Janeiro'],
 ['Portuguese (European)','Portugal','pt-PT','Latn','Olá','Olá','Lisboa','Lisbon'],
 ['Romanian','Romania','ro-RO','Latn','Bună ziua','Bună ziua','București','Bucharest'],
 ['Russian','Russia','ru-RU','Cyrl','Здравствуйте','Zdravstvuyte','Москва','Moscow'],
 ['Spanish (Latin American)','Mexico · Regional options','es-MX','Latn','¡Hola!','Hola','Ciudad de México','Mexico City'],
 ['Spanish (Spain-Castilian)','Spain · Castilian','es-ES','Latn','¡Hola!','Hola','Madrid','Madrid'],
 ['Swahili','Tanzania · TZ / KE','sw-TZ','Latn','Habari','Habari','Dar es Salaam','Dar es Salaam'],
 ['Kinyarwanda','Rwanda','rw-RW','Latn','Muraho','Muraho','Kigali','Kigali'],
 ['Swedish','Sweden','sv-SE','Latn','Hej','Hej','Stockholm','Stockholm'],
 ['Lingala','DR Congo · DRC / Congo','ln-CD','Latn','Mbote','Mbote','Kinshasa','Kinshasa'],
 ['Ukrainian','Ukraine','uk-UA','Cyrl','Добрий день','Dobryi den','Київ','Kyiv'],
 ['Vietnamese','Northern · North / South','vi-VN','Latn','Xin chào','Xin chào','Hà Nội','Hanoi']
].map((v,id)=>({id,name:v[0],region:v[1],locale:v[2],script:v[3],hello:v[4],roman:v[5],cityNative:v[6],city:v[7]}));
const PHRASES = {
 23: {ask:'¿Qué te pongo?',order:'Un café con leche, por favor.',thanks:'Muchas gracias.',askMeaning:'What can I get you?',orderMeaning:'A coffee with milk, please.',thanksMeaning:'Thank you very much.',reply:'¡Claro! ¿Para tomar aquí o para llevar?',follow:'Para tomar aquí, gracias.',bye:'¡Perfecto! Aquí tienes tu café. ¡Que lo disfrutes!'},
 22: {ask:'¿Qué vas a tomar?',order:'Un café con leche, por favor.',thanks:'Muchas gracias.',askMeaning:'What would you like to drink?',orderMeaning:'A coffee with milk, please.',thanksMeaning:'Thank you very much.',reply:'¡Claro! ¿Para tomar aquí o para llevar?',follow:'Para tomar aquí, gracias.',bye:'¡Muy bien! Aquí está tu café.'},
 9: {ask:'Vous désirez ?',order:'Un café au lait, s’il vous plaît.',thanks:'Merci beaucoup.',askMeaning:'What would you like?',orderMeaning:'A coffee with milk, please.',thanksMeaning:'Thank you very much.',reply:'Bien sûr ! Sur place ou à emporter ?',follow:'Sur place, merci.',bye:'Voilà votre café. Bonne journée !'},
 7: {ask:'What can I get you?',order:'A coffee with milk, please.',thanks:'Thank you very much.',askMeaning:'What can I get you?',orderMeaning:'A coffee with milk, please.',thanksMeaning:'Thank you very much.',reply:'Of course! For here or to go?',follow:'For here, thanks.',bye:'Here you are. Enjoy your coffee!'},
 16: {ask:'何になさいますか？',order:'カフェラテを一つお願いします。',thanks:'ありがとうございます。',askMeaning:'What would you like?',orderMeaning:'One café latte, please.',thanksMeaning:'Thank you very much.',reply:'店内でお召し上がりですか？',follow:'はい、店内で。',bye:'どうぞ。ありがとうございます。'},
 1: {ask:'شنو بغيتي؟',order:'بغيت قهوة بالحليب، عافاك.',thanks:'شكراً بزاف.',askMeaning:'What would you like?',orderMeaning:'A coffee with milk, please.',thanksMeaning:'Thank you very much.',romanOrder:'Bghit qhwa b lḥlib, ʿafak.',reply:'واخا، مرحبا.',follow:'شكراً بزاف.',bye:'بالصحة!'}
};
const MISSIONS = [
 {id:0,title:'Hello, new world',desc:'Introduce yourself with confidence',icon:'wave',time:5,type:'First connections',art:'park',complete:true},
 {id:1,title:'A table for two',desc:'Say hello and find a seat',icon:'coffee',time:6,type:'Everyday moments',art:'cafe',complete:true},
 {id:2,title:'Your usual, please',desc:'Order a drink and make it yours',icon:'coffee',time:8,type:'Everyday moments',art:'cafe',complete:false},
 {id:3,title:'The scenic route',desc:'Find your way, one question at a time',icon:'compass',time:7,type:'Out and about',art:'park',complete:false},
 {id:4,title:'A little local knowledge',desc:'Ask for a recommendation',icon:'chat',time:8,type:'Out and about',art:'cafe',complete:false},
 {id:5,title:'See you on Saturday',desc:'Make plans with a new friend',icon:'calendar',time:6,type:'First connections',art:'park',complete:false},
 {id:6,title:'Something for everyone',desc:'Shop at the neighbourhood market',icon:'bag',time:9,type:'Everyday moments',art:'cafe',complete:false},
 {id:7,title:'Tell me your story',desc:'Share a little about your world',icon:'spark',time:10,type:'First connections',art:'park',complete:false}
];
const AUDIO = [
 {id:0,title:'Small talk, big connections',sub:'Everyday conversations',chapter:'01 · A friendly hello',color:'lilac',icon:'chat',minutes:12},
 {id:1,title:'One coffee, countless stories',sub:'The café collection',chapter:'02 · Your regular order',color:'peach',icon:'coffee',minutes:18},
 {id:2,title:'The city is your classroom',sub:'Out and about',chapter:'03 · Finding your way',color:'green',icon:'compass',minutes:15},
 {id:3,title:'Good company',sub:'People & everyday life',chapter:'04 · Making plans',color:'yellow',icon:'sun',minutes:21}
];
const SOURCES = {en:'English',fr:'Français',es:'Español',ru:'Русский'};
const TEACH = {
 en:{listen:'Listen to the scene',hear:'What is your partner asking?',choose:'Choose the meaning',anticipate:'Your turn. What would you say?',hint:'Think of a polite way to order a coffee with milk.',reveal:'Reveal an example',compare:'Try it out loud, at your own pace.',next:'Continue',greet:'Say hello to someone new.',meaning:'Hello',orderMeaning:'A coffee with milk, please.',askMeaning:'What would you like?',thanksMeaning:'Thank you very much.',help:'A small hint',done:'A little braver. A little further.',finish:'Finish practice',self:'How did that feel?',easy:'Comfortable',again:'One more try',conversation:'Try a conversation'},
 fr:{listen:'Écoutez la scène',hear:'Que vous demande votre partenaire ?',choose:'Choisissez le sens',anticipate:'À vous. Que diriez-vous ?',hint:'Pensez à une façon polie de commander un café au lait.',reveal:'Voir un exemple',compare:'Essayez à voix haute, à votre rythme.',next:'Continuer',greet:'Saluez une nouvelle personne.',meaning:'Bonjour',orderMeaning:'Un café au lait, s’il vous plaît.',askMeaning:'Que désirez-vous ?',thanksMeaning:'Merci beaucoup.',help:'Un petit indice',done:'Un peu plus à l’aise. Un peu plus loin.',finish:'Terminer',self:'Comment vous sentez-vous ?',easy:'À l’aise',again:'Réessayer',conversation:'Essayez une conversation'},
 es:{listen:'Escucha la escena',hear:'¿Qué pregunta tu compañero?',choose:'Elige el significado',anticipate:'Tu turno. ¿Qué dirías?',hint:'Piensa en una forma amable de pedir un café con leche.',reveal:'Ver un ejemplo',compare:'Inténtalo en voz alta, a tu ritmo.',next:'Continuar',greet:'Saluda a alguien nuevo.',meaning:'Hola',orderMeaning:'Un café con leche, por favor.',askMeaning:'¿Qué te gustaría?',thanksMeaning:'Muchas gracias.',help:'Una pequeña pista',done:'Un poco más de confianza.',finish:'Terminar',self:'¿Cómo te has sentido?',easy:'Con confianza',again:'Intentar de nuevo',conversation:'Prueba una conversación'},
 ru:{listen:'Послушайте диалог',hear:'О чём спрашивает собеседник?',choose:'Выберите значение',anticipate:'Ваша очередь. Что бы вы сказали?',hint:'Попросите кофе с молоком вежливо.',reveal:'Показать пример',compare:'Попробуйте произнести вслух в своём темпе.',next:'Продолжить',greet:'Поздоровайтесь с новым знакомым.',meaning:'Здравствуйте',orderMeaning:'Кофе с молоком, пожалуйста.',askMeaning:'Что бы вы хотели?',thanksMeaning:'Большое спасибо.',help:'Небольшая подсказка',done:'Ещё немного увереннее.',finish:'Завершить',self:'Как вы себя чувствуете?',easy:'Уверенно',again:'Ещё раз',conversation:'Попробуйте диалог'}
};
