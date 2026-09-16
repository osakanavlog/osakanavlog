'use strict';
// 花札 48 枚の定義。
// type: 'hikari'(光) | 'tane'(種) | 'tan'(短冊) | 'kasu'(カス)
// tan: 'aka'(赤短) | 'ao'(青短) | 'plain'(素短冊)
// id は 0..47 で固定。通信では id のみを送り、意味は welcome で配る一覧から引く。

const MONTHS = [
  { m: 1,  name: '松',   season: '一月' },
  { m: 2,  name: '梅',   season: '二月' },
  { m: 3,  name: '桜',   season: '三月' },
  { m: 4,  name: '藤',   season: '四月' },
  { m: 5,  name: '菖蒲', season: '五月' },
  { m: 6,  name: '牡丹', season: '六月' },
  { m: 7,  name: '萩',   season: '七月' },
  { m: 8,  name: '芒',   season: '八月' },
  { m: 9,  name: '菊',   season: '九月' },
  { m: 10, name: '紅葉', season: '十月' },
  { m: 11, name: '柳',   season: '十一月' },
  { m: 12, name: '桐',   season: '十二月' },
];

const DEF = [
  // 一月・松
  { m: 1, type: 'hikari', label: '松に鶴' },
  { m: 1, type: 'tan', tan: 'aka', label: '松に赤短' },
  { m: 1, type: 'kasu', label: '松のカス' },
  { m: 1, type: 'kasu', label: '松のカス' },
  // 二月・梅
  { m: 2, type: 'tane', label: '梅に鶯' },
  { m: 2, type: 'tan', tan: 'aka', label: '梅に赤短' },
  { m: 2, type: 'kasu', label: '梅のカス' },
  { m: 2, type: 'kasu', label: '梅のカス' },
  // 三月・桜
  { m: 3, type: 'hikari', label: '桜に幕' },
  { m: 3, type: 'tan', tan: 'aka', label: '桜に赤短' },
  { m: 3, type: 'kasu', label: '桜のカス' },
  { m: 3, type: 'kasu', label: '桜のカス' },
  // 四月・藤
  { m: 4, type: 'tane', label: '藤に不如帰' },
  { m: 4, type: 'tan', tan: 'plain', label: '藤の短冊' },
  { m: 4, type: 'kasu', label: '藤のカス' },
  { m: 4, type: 'kasu', label: '藤のカス' },
  // 五月・菖蒲
  { m: 5, type: 'tane', label: '菖蒲に八橋' },
  { m: 5, type: 'tan', tan: 'plain', label: '菖蒲の短冊' },
  { m: 5, type: 'kasu', label: '菖蒲のカス' },
  { m: 5, type: 'kasu', label: '菖蒲のカス' },
  // 六月・牡丹
  { m: 6, type: 'tane', label: '牡丹に蝶', tag: 'cho' },
  { m: 6, type: 'tan', tan: 'ao', label: '牡丹に青短' },
  { m: 6, type: 'kasu', label: '牡丹のカス' },
  { m: 6, type: 'kasu', label: '牡丹のカス' },
  // 七月・萩
  { m: 7, type: 'tane', label: '萩に猪', tag: 'ino' },
  { m: 7, type: 'tan', tan: 'plain', label: '萩の短冊' },
  { m: 7, type: 'kasu', label: '萩のカス' },
  { m: 7, type: 'kasu', label: '萩のカス' },
  // 八月・芒
  { m: 8, type: 'hikari', label: '芒に月', tag: 'tsuki' },
  { m: 8, type: 'tane', label: '芒に雁' },
  { m: 8, type: 'kasu', label: '芒のカス' },
  { m: 8, type: 'kasu', label: '芒のカス' },
  // 九月・菊
  { m: 9, type: 'tane', label: '菊に盃', tag: 'sakazuki' },
  { m: 9, type: 'tan', tan: 'ao', label: '菊に青短' },
  { m: 9, type: 'kasu', label: '菊のカス' },
  { m: 9, type: 'kasu', label: '菊のカス' },
  // 十月・紅葉
  { m: 10, type: 'tane', label: '紅葉に鹿', tag: 'shika' },
  { m: 10, type: 'tan', tan: 'ao', label: '紅葉に青短' },
  { m: 10, type: 'kasu', label: '紅葉のカス' },
  { m: 10, type: 'kasu', label: '紅葉のカス' },
  // 十一月・柳
  { m: 11, type: 'hikari', label: '柳に小野道風', tag: 'ame' },
  { m: 11, type: 'tane', label: '柳に燕' },
  { m: 11, type: 'tan', tan: 'plain', label: '柳の短冊' },
  { m: 11, type: 'kasu', label: '柳のカス' },
  // 十二月・桐
  { m: 12, type: 'hikari', label: '桐に鳳凰' },
  { m: 12, type: 'kasu', label: '桐のカス' },
  { m: 12, type: 'kasu', label: '桐のカス' },
  { m: 12, type: 'kasu', label: '桐のカス' },
];

const CARDS = DEF.map((c, id) => ({
  id,
  m: c.m,
  type: c.type,
  tan: c.tan || null,
  tag: c.tag || null,
  label: c.label,
  monthName: MONTHS[c.m - 1].name,
  season: MONTHS[c.m - 1].season,
}));

// 取り札としての優先度。同月 2 枚から自動で選ぶ場面で使う。
const VALUE = { hikari: 4, tane: 3, tan: 2, kasu: 1 };
function cardValue(id) { return VALUE[CARDS[id].type]; }
function byTag(tag) { return CARDS.find((c) => c.tag === tag).id; }

module.exports = { CARDS, MONTHS, cardValue, byTag };
