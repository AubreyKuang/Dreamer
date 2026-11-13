"use strict";

const palettes = [
  {name:"桃色天光", icon:"☼", sky:[59,72,124], mid:[136,126,167], line:[255,188,148], cloud:[255,179,154], shadow:[107,89,138], hills:[103,91,141], water:[37,45,91], light:[255,223,167], weather:"晨光 · 微风"},
  {name:"翡翠极夜", icon:"☾", sky:[15,26,56], mid:[46,89,121], line:[119,196,183], cloud:[110,187,187], shadow:[39,63,108], hills:[43,75,109], water:[13,42,66], light:[177,255,215], weather:"夜色 · 极光"},
  {name:"花吹雪", icon:"✿", sky:[82,88,144], mid:[168,135,177], line:[254,191,201], cloud:[253,168,194], shadow:[124,86,151], hills:[122,83,136], water:[67,44,92], light:[255,211,226], weather:"春暮 · 落花"},
  {name:"群星落海", icon:"✦", sky:[18,25,56], mid:[64,62,124], line:[158,146,207], cloud:[158,146,215], shadow:[54,51,106], hills:[74,68,132], water:[25,35,81], light:[211,207,255], weather:"深夜 · 星雨"}
];
const iceWhispers = [
  "今天，有哪一刻让你松了口气？",
  "有些烦恼像风，拂过就好，不必把它留在心里。",
  "这一片天，你最喜欢哪种颜色？",
  "可以慢一点。风会等你。",
  "现在，你想多听一会儿什么声音？",
  "没想明白的事，可以先放一放。",
  "今天有哪件小事，让你笑了一下？",
  "有些念头来去如云，看看它就好。",
  "此刻，你想留住哪一点光？",
  "累了就停一会儿。冰面还在这里。",
  "今晚，想给自己留几分钟安静吗？",
  "想不出答案，也可以继续看云。",
  "今天有没有一件事，已经做得够好了？",
  "有些事可以留到明天。这一刻是你的。",
  "如果可以歇一歇，你想在哪里坐一会儿？",
  "走了这么远，也可以只为看看风景。",
  "想把哪件小事，暂时交给风？",
  "一小会儿的自在，也算自在。",
  "你喜欢月光落在冰上，还是落在云里？",
  "有些事松开一点，手里就有地方接住光。",
  "最近，有没有做过一件单纯喜欢的小事？",
  "今天过得平平常常，也很好。",
  "如果现在什么都不用做，你想看哪里？",
  "不急着成为谁。先看看这一朵云。"
];
function dreamFor(word) {
  const n = textHash(word.toLowerCase());
  const i = /极光|aurora|北极/i.test(word) ? 1 : /花|春|樱|petal|flower|sakura/i.test(word) ? 2 :
    /星|月|夜|moon|star|night/i.test(word) ? 3 : /霞|晨|日|云|sun|cloud|dawn/i.test(word) ? 0 : n%palettes.length;
  const base = palettes[i];
  return {...base,index:i,seed:n%4096+1,word, name:["晚霞","极光","花海","星雨"].includes(word)?base.name:word, whale:/鲸|whale/i.test(word)};
}
const peachFeastSource="李白《春夜宴从弟桃花园序》";
const redCliffSource="苏轼《前赤壁赋》";
const peachNight={weather:"春夜 · 花月",sky:[30,35,86],mid:[92,69,129],
  line:[185,125,157],cloud:[202,151,198],water:[30,49,93],light:[255,215,185],peachNight:true};
const chapters = [
  {at:0, name:"海棠渡", icon:"✿", weather:"晨光 · 花瓣", index:0, seed:45,
    lines:[
      [0,"一瓣海棠，落在冰上。"],
      [115,"迟日江山丽，\n春风花草香。","杜甫《绝句二首·其一》"],
      [255,"你俯身去拾。\n风先一步，把它轻轻推远了。"]
    ]},
  {at:450, name:"海雾深处", icon:"≋", weather:"潮声 · 雾起", index:2, seed:109, painting:1,
    sky:[48,57,99], mid:[155,117,158], line:[237,178,158], cloud:[229,159,187], shadow:[94,84,143], hills:[97,114,151], water:[41,47,81], light:[255,217,180],
    lines:[
      [0,"起雾了。看不清远处，\n就先看看脚边这点光。"],
      [105,"白鸟贴着雾飞。\n翅尖一低，冰里便亮了一小片。"],
      [180,"蒹葭苍苍，白露为霜。\n所谓伊人，在水一方。","《诗经·秦风·蒹葭》",null,"reeds"],
      [255,"气蒸云梦泽，\n波撼岳阳城。","孟浩然《望洞庭湖赠张丞相》"],
      [410,"鸟向远处飞去。\n雾的另一边，有什么缓缓吐出一口气。"],
      [540,"冰下，有影。"]
    ]},
  {at:1080, name:"北冥有鱼", icon:"◒", weather:"深海 · 鲲游", index:1, seed:193, painting:2,
    sky:[21,34,77], mid:[56,119,139], line:[139,205,194], cloud:[135,180,223], shadow:[77,62,133], hills:[56,91,125], water:[16,44,75], light:[196,255,223],
    lines:[
      [35,"北冥有鱼，\n其名为鲲。","《庄子·逍遥游》"],
      [150,"青光亮了。\n此刻，有什么让你想多看一眼？"],
      [280,"它抬起背脊。\n几颗水珠停在你眼前，映着同一轮月亮。"],
      [430,"海上生明月，\n天涯共此时。","张九龄《望月怀远》"],
      [490,"银台出倒景，\n白浪翻长鲸。","李白《游泰山六首·其四》",null,"silver-terrace"],
      [555,"鲲游过月亮。\n你低下头，它却还在冰里。"]
    ]},
  {at:1740, name:"天接云涛", icon:"☁", weather:"云浪 · 天河", index:2, seed:313, painting:3,
    sky:[60,69,135], mid:[162,125,168], line:[255,205,165], cloud:[250,165,174], shadow:[112,107,180], hills:[125,110,164], water:[69,61,115], light:[255,231,186],
    lines:[
      [40,"天接云涛连海雾，\n星河欲转千帆舞。","李清照《渔家傲》"],
      [180,"鲲在云里一翻身，几尾飞鱼衔着海棠，\n从云浪里跃了出来。"],
      [310,"蝶停在肩。要在这里多待一会儿吗？"],
      [430,"留连戏蝶时时舞，\n自在娇莺恰恰啼。","杜甫《江畔独步寻花》"],
      [575,"你把肩放低。\n蝴蝶借了一点风，飞进桃色的云里。"],
      [625,"大鹏一日同风起，\n扶摇直上九万里。","李白《上李邕》","flight"],
      [700,"鹤群散入云霞。你沿着一缕金光落下，\n冰刀又轻轻碰到了冰。"]
    ]},
  {at:2470, name:"天河星原", icon:"✦", weather:"星雨 · 长夜", index:3, seed:411, painting:4,
    sky:[18,25,68], mid:[77,67,141], line:[159,145,202], cloud:[164,150,230], shadow:[66,62,136], hills:[83,90,155], water:[25,37,84], light:[218,222,255],
    lines:[
      [45,"鲲往更深的夜里去了。\n围巾上，多了一瓣海棠。"],
      [185,"银烛秋光冷画屏，\n轻罗小扇扑流萤。","杜牧《秋夕》"],
      [320,"有一只萤火虫落在袖口。\n你放慢了，它也放慢了。"],
      [455,"灯，一盏盏远了。\n今天，有什么可以轻轻放下？"],
      [590,"我挥一挥衣袖，\n不带走一片云彩。","徐志摩《再别康桥》","wave"],
      [775,"冰上只剩两道浅浅的弧线。天快亮了。"]
    ]},
  {at:3430, name:"灯火葳蕤", icon:"❋", weather:"林雾 · 灯影", index:4, seed:803, painting:5, forest:true,
    sky:[29,43,68], mid:[83,102,122], line:[185,146,143], cloud:[163,170,177], shadow:[57,73,112], hills:[55,86,94], water:[24,53,64], light:[255,210,145],
    lines:[
      [25,"林子深处，有一盏灯还亮着。"],
      [190,"平林漠漠烟如织。","《菩萨蛮》"],
      [355,"树影一摇，\n倒映在冰上的灯火也轻轻晃了一下。"],
      [530,"想在这一盏灯旁，多留一会儿吗？"],
      [635,"深林人不知，\n明月来相照。","王维《竹里馆》",null,"bamboo-moon"],
      [720,"风从林梢过去。\n你回头时，那些灯还亮着。"]
    ]},
  {at:4300, name:"蓝田日暖", icon:"☼", weather:"晴岚 · 玉光", index:5, seed:966, painting:6, jade:true,
    sky:[57,97,136], mid:[130,177,178], line:[249,202,155], cloud:[233,211,186], shadow:[91,116,148], hills:[97,155,147], water:[39,94,105], light:[255,225,161],
    lines:[
      [24,"林子尽头，一束日光落在了冰上。"],
      [192,"蓝田日暖玉生烟。","李商隐《锦瑟》"],
      [374,"玉色的山脚下，雾薄得像一层纱。"],
      [563,"今天，有什么让你觉得暖了一点？"],
      [760,"你慢慢滑过去。\n那一点暖意，也跟了上来。"]
    ]},
  {at:5220,name:"桃源深处",icon:"✿",weather:"桃雨 · 溪声",index:2,seed:1103,painting:7,grove:true,
    sky:[75,80,137],mid:[163,133,180],line:[255,210,181],cloud:[249,176,199],shadow:[89,96,148],hills:[77,112,127],water:[52,77,109],light:[255,223,180],
    lines:[
      [24,"转过山脚，溪上漂来一瓣桃花。"],
      [190,"忽逢桃花林，\n夹岸数百步。","陶渊明《桃花源记》"],
      [270,"桃之夭夭，\n灼灼其华。","《诗经·周南·桃夭》",null,"peach-ode"],
      [360,"花影落进溪里，水把它轻轻带远了。"],
      [530,"左边有桃树下的石径，右边是浮花浅湾。\n可以转向贴岸，也可以沿溪心滑过去。",null,"groveBanks"],
      [714,"芳草鲜美，\n落英缤纷。","陶渊明《桃花源记》","groveBanksResult"],
      [850,"夫天地者，万物之逆旅也；\n光阴者，百代之过客也。",peachFeastSource,"peachNight","feast-1"],
      [965,"而浮生若梦，为欢几何？\n古人秉烛夜游，良有以也。",peachFeastSource,null,"feast-2"],
      [1080,"况阳春召我以烟景，\n大块假我以文章。",peachFeastSource,null,"feast-3"],
      [1195,"会桃花之芳园，\n序天伦之乐事。",peachFeastSource,null,"feast-4"],
      [1310,"开琼筵以坐花，\n飞羽觞而醉月。",peachFeastSource,"petalShower","feast-7"],
      [1450,"我歌月徘徊，\n我舞影零乱。","李白《月下独酌四首·其一》",null,"moon-dance"],
      [1590,"桃花流水窅然去，\n别有天地非人间。","李白《山中问答》",null,"hidden-valley"]
    ]},
  {at:7040,name:"归园田居",icon:"❧",weather:"田风 · 炊烟",index:0,seed:1261,painting:8,farmland:true,
    sky:[93,135,166],mid:[182,191,169],line:[255,215,151],cloud:[246,218,170],shadow:[112,139,159],hills:[108,149,117],water:[49,81,77],light:[255,229,167],
    lines:[
      [25,"沿着溪边再走一程，\n便看见了田和几户人家。"],
      [171,"阡陌交通，\n鸡犬相闻。","陶渊明《桃花源记》"],
      [322,"种豆南山下，\n草盛豆苗稀。","陶渊明《归园田居·其三》"],
      [491,"风从豆畦吹来。\n今天，想在什么地方坐到天晚？"],
      [700,"采菊东篱下，\n悠然见南山。","陶渊明《饮酒·其五》"],
      [774,"昔我往矣，杨柳依依。\n今我来思，雨雪霏霏。","《诗经·小雅·采薇》",null,"returning"],
      [848,"屋顶的烟慢慢淡了，山还在原处。"]
    ]},
  {at:8060,name:"不系之舟",icon:"☾",weather:"夜江 · 孤灯",index:3,seed:1559,painting:9,river:true,
    sky:[22,30,66],mid:[63,73,118],line:[140,119,153],cloud:[158,154,193],shadow:[48,56,104],hills:[49,64,104],water:[24,39,71],light:[218,214,242],
    lines:[
      [25,"黄州。夜深了，岸上只剩一盏灯。"],
      [170,"小舟从此逝，\n江海寄余生。","苏轼《临江仙·夜归临皋》"],
      [248,"山花如绣颊，\n江火似流萤。","李白《夜下征虏亭》",null,"river-fireflies"],
      [330,"江心也有人赶路。\n可以转向那盏船灯，也可以继续顺流。"],
      [420,"我自飘零\n亦是行人",null,"passingBoat"],
      [510,"惠州。雨停了，屋檐还在滴水。\n你隔着江，看见一扇亮着的窗。"],
      [600,"峨眉山月半轮秋，\n影入平羌江水流。","李白《峨眉山月歌》",null,"emei-moon"],
      [700,"儋州。海风比江风更咸，\n远处那盏灯，摇得快要看不见。",null,"riverPier"],
      [978,"浮云游子意，\n落日故人情。","李白《送友人》","riverPierResult","wandering-cloud"],
      [1065,"天快亮了。那条船还在远处，\n与你隔着一片安静的水。",null,"riverDawn","7"]
    ]},
  {at:9260,name:"赤壁赋",icon:"☾",weather:"清风 · 明月",index:3,seed:1783,painting:10,river:true,redCliff:true,
    sky:[16,36,62],mid:[48,102,121],line:[153,186,175],cloud:[181,213,205],shadow:[45,75,112],hills:[53,93,104],water:[19,55,77],light:[224,239,211],
    lines:[
      [25,"清风徐来，\n水波不兴。",redCliffSource],
      [165,"白露横江，\n水光接天。",redCliffSource],
      [315,"惟江上之清风，\n与山间之明月。",redCliffSource],
      [437,"船桨一停，\n水上的月光就慢慢合拢了。",null,null,"oar-rest"],
      [565,"取之无禁，\n用之不竭。",redCliffSource,null,"4"],
      [800,"是造物者之无尽藏也，\n而吾与子之所共适。",redCliffSource,null,"5"]
    ]},
  {at:10280,name:"春江花月夜",icon:"☾",weather:"春江 · 银花",index:3,seed:1913,painting:11,river:true,moonRiver:true,
    sky:[24,43,89],mid:[74,119,154],line:[170,213,215],cloud:[209,229,234],shadow:[93,80,146],hills:[54,89,113],water:[27,62,103],light:[228,243,251],
    lines:[
      [83,"绕过最后一道山影，\n江面忽然开阔了。",null,null,"river-opens"],
      [195,"春江潮水连海平，\n海上明月共潮生。","张若虚《春江花月夜》"],
      [318,"花影散在水上。\n可以停船等它合拢，也可以继续顺流。",null,"moonReflection","drift-a-little"],
      [440,"江流宛转绕芳甸，\n月照花林皆似霰。","张若虚《春江花月夜》"],
      [562,"碎光随小舟拉长，\n江面上拖着一条银带。",null,"moonReflectionResult"],
      [680,"江天一色无纤尘，\n皎皎空中孤月轮。","张若虚《春江花月夜》"],
      [820,"不知乘月几人归，\n落月摇情满江树。","张若虚《春江花月夜》"]
    ]},
  {at:11180,name:"李凭箜篌引",icon:"♫",weather:"花洲 · 寻弦",index:1,seed:2053,painting:12,harp:true,
    sky:[29,22,72],mid:[85,64,140],line:[178,121,163],cloud:[202,157,215],shadow:[53,59,125],hills:[64,66,113],water:[29,44,82],light:[248,216,178],
    lines:[
      [25,"花洲深处，\n有一根弦轻轻响了。"],
      [180,"吴丝蜀桐张高秋，\n空山凝云颓不流。","李贺《李凭箜篌引》"],
      [340,"昆山玉碎凤凰叫，\n芙蓉泣露香兰笑。","李贺《李凭箜篌引》","harpListen"],
      [510,"哪一岸先亮起来，\n弦声就从那一岸传来。",null,"harpResult"],
      [680,"女娲炼石补天处，\n石破天惊逗秋雨。","李贺《李凭箜篌引》","harpDuet"]
    ]},
  {at:12080,name:"镜湖飞渡",icon:"✦",weather:"镜湖 · 月影",index:3,seed:2203,painting:13,mirrorLake:true,
    sky:[24,36,85],mid:[80,97,164],line:[224,164,190],cloud:[207,187,228],shadow:[68,77,145],hills:[65,91,137],water:[37,58,111],light:[249,226,189],
    lines:[
      [25,"我欲因之梦吴越，\n一夜飞度镜湖月。","李白《梦游天姥吟留别》"],
      [185,"湖月照我影，\n送我至剡溪。","李白《梦游天姥吟留别》"],
      [345,"脚著谢公屐，\n身登青云梯。","李白《梦游天姥吟留别》"],
      [520,"霓为衣兮风为马，\n云之君兮纷纷而来下。","李白《梦游天姥吟留别》","flight"],
      [690,"湖面又近了。\n云散开，那轮月还在等你。",null,"mirrorLanding"]
    ]},
  {at:12980,name:"寒江独钓",icon:"◒",weather:"水墨 · 江雪",index:3,seed:2377,painting:14,river:true,ink:true,
    sky:[234,234,234],mid:[222,222,222],line:[242,242,242],cloud:[244,244,244],shadow:[106,106,106],hills:[125,125,125],water:[189,189,189],light:[248,248,248],
    lines:[
      [25,"千山鸟飞绝，\n万径人踪灭。","柳宗元《江雪》"],
      [215,"孤舟蓑笠翁，\n独钓寒江雪。","柳宗元《江雪》"],
      [430,"雾凇沆砀，\n天与云与山与水，上下一白。","张岱《湖心亭看雪》",null,"snow-white"],
      [610,"湖上影子，惟长堤一痕、\n湖心亭一点、与余舟一芥、\n舟中人两三粒而已。","张岱《湖心亭看雪》",null,"lake-shadows"],
      [805,"雪落得很轻。\n你听见船桨拨开水的声音。"]
    ]}
];
const original = {...palettes[0],...chapters[0],word:"",whale:false};
let chapterIndex=0, routeDistance=0, routePosition=0, routeMode=true, nextLine=0, storyTime=0, storyUntil=0, nextStoryAt=0, waveUntil=0;
let flight=null, flightWind=0;
let petalShowerAt=null;
const cloudChapter=3;
const forestChapter=chapters.findIndex(chapter=>chapter.forest);
const jadeChapter=chapters.findIndex(chapter=>chapter.jade);
const groveChapter=chapters.findIndex(chapter=>chapter.grove);
const farmChapter=chapters.findIndex(chapter=>chapter.farmland);
const riverChapter=chapters.findIndex(chapter=>chapter.river);
const redCliffChapter=chapters.findIndex(chapter=>chapter.redCliff);
const moonRiverChapter=chapters.findIndex(chapter=>chapter.moonRiver);
const harpChapter=chapters.findIndex(chapter=>chapter.harp);
const mirrorLakeChapter=chapters.findIndex(chapter=>chapter.mirrorLake);
const inkChapter=chapters.findIndex(chapter=>chapter.ink);
const flightVerse=chapters[cloudChapter].lines.findIndex(line=>line[3]==="flight");
