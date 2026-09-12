/**
 * ============================================================
 *  この動画のテキストは、すべてこのファイルに入っています。
 *  ここだけを書き換えれば内容が差し替わります。
 * ============================================================
 *
 *  BtoC（一般のお客様向け）と BtoB（法人・施設向け）の 2 本を、
 *  同じ構成・同じ尺で出し分けています。
 *    - 共通の情報 … company
 *    - 出し分ける情報 … btoc / btob
 *
 *  内容は公式サイト https://intema-jp.com/ の記載と、
 *  いただいた会社情報にもとづいています。
 */

export type Audience = 'btoc' | 'btob';

/** 制作中の目印。true の間は画面右上に DRAFT バッジが出ます */
export const draftMode = false;

/** ---------------- 共通：会社の基本情報 ---------------- */
export const company = {
  name: '株式会社インテマイズ',
  /** ロゴ的に添える英字表記 */
  nameEn: 'INTEMIZE',
  /** 拠点。オープニングとラストに出ます */
  city: '広島県三次市',
};

/** 会社概要の表。value が空の行は表示されません */
export const facts = [
  {label: '社名', value: '株式会社インテマイズ'},
  {label: '所在地', value: '広島県三次市甲奴町西野 553-9'},
  {label: '設立', value: '1986年'},
  {label: '代表者', value: '松山和雄'},
  {label: '事業内容', value: '内装仕上工事業\nオフィスリノベーション／カーテン・窓まわり\n壁紙・天井・床の内装工事'},
  {label: '対応エリア', value: '広島県内全域（県外では山口県の施工実績あり）'},
];

export type Content = {
  opening: {kicker: string; lines: string[]; tagline: string};
  region: {kicker: string; heading: string; lead: string; points: {label: string; text: string}[]};
  about: {kicker: string; heading: string; lead: string};
  services: {kicker: string; heading: string; items: {no: string; title: string; text: string}[]};
  process: {
    kicker: string;
    heading: string;
    lead: string;
    steps: {no: string; title: string; text: string}[];
  };
  strengths: {kicker: string; heading: string; items: {no: string; title: string; text: string}[]};
  numbers: {
    kicker: string;
    heading: string;
    items: {value: number | null; unit: string; label: string}[];
  };
  fields: {
    kicker: string;
    heading: string;
    lead: string;
    items: {title: string; text: string}[];
    /** public/ に置いた施工写真のファイル名。空だと枠だけ出ます */
    photos: string[];
  };
  /** ブログ記事の紹介。空配列にするとシーンごと静かな締めに変わります */
  topics: {kicker: string; heading: string; items: {title: string; note: string}[]};
  closing: {message: string; url: string; tel: string; email: string};
};

/** ============================================================
 *  BtoC：一般のお客様向け
 *  ============================================================ */
const btoc: Content = {
  opening: {
    kicker: 'FOR YOUR HOME',
    lines: ['カーテンから、', '部屋は変わる。'],
    tagline: '好きな部屋に、しよう。',
  },
  region: {
    kicker: 'OUR AREA',
    heading: '広島県内、\nどこへでも。',
    lead: '広島県三次市を拠点に、県内全域へ伺います。\n遠方では山口県での施工実績もあります。',
    points: [
      {label: '住まい', text: '一戸建てもマンションも。\n一部屋だけのご相談から\nお受けしています。'},
      {label: '窓まわり', text: 'オーダーカーテン、ブラインド、\nロールスクリーン。\n採寸から取り付けまで。'},
      {label: '内装', text: '壁紙や床の張り替え、\n照明や家具えらびまで\nまとめてご相談ください。'},
    ],
  },
  about: {
    kicker: 'ABOUT US',
    heading: '私たちについて',
    lead: 'カーテン、壁紙、床、照明、家具。\n部屋をつくる要素をまとめてお任せいただける、\n三次の内装仕上げ工事店です。',
  },
  services: {
    kicker: 'SERVICES',
    heading: 'できること',
    items: [
      {
        no: '01',
        title: 'カーテン・窓まわり',
        text: 'オーダーカーテン、\nウッドブラインド、\nバーチカルブラインドも。',
      },
      {
        no: '02',
        title: '壁紙・床の張り替え',
        text: '壁紙（クロス）、天井、\n床材の張り替え。\n内装仕上げの専門です。',
      },
      {
        no: '03',
        title: 'プチリフォーム',
        text: '照明や家具まで含めて、\n部屋をまとめて\nコーディネートします。',
      },
    ],
  },
  process: {
    kicker: 'HOW WE WORK',
    heading: 'ご相談から、仕上がりまで',
    lead: 'はじめての方でも迷わないよう、この流れでお手伝いします。',
    steps: [
      {no: '01', title: 'ご相談', text: '「ここをきれいにしたい」\nから伺います。'},
      {no: '02', title: '採寸・ご提案', text: 'お部屋で採寸し、\n生地やプランをご提案。'},
      {no: '03', title: 'お見積り', text: 'シンプル価格で、\nわかりやすく。'},
      {no: '04', title: '施工・保証', text: '取り付けたあとも\n1年間の保証つき。'},
    ],
  },
  strengths: {
    kicker: 'OUR STRENGTHS',
    heading: '選ばれる理由',
    items: [
      {
        no: '01',
        title: 'まとめて頼める',
        text: 'カーテンも壁紙も床も、照明や家具まで。\n窓口ひとつで、部屋が仕上がります。',
      },
      {
        no: '02',
        title: 'シンプル価格',
        text: '見積りをわかりやすく。\n何にいくらかかるのかが、はじめから見えます。',
      },
      {
        no: '03',
        title: '全ての工事に1年保証',
        text: '納めて終わりにしません。\n施工後1年間は保証つきでお使いいただけます。',
      },
    ],
  },
  numbers: {
    kicker: 'BY THE NUMBERS',
    heading: '数字で見るインテマイズ',
    items: [
      {value: 23, unit: '市町', label: '広島県内全域に対応'},
      {value: 1, unit: '年', label: '全工事の保証期間'},
      {value: 5, unit: '分野', label: 'カーテン・壁紙・床・照明・家具'},
    ],
  },
  fields: {
    kicker: 'OUR WORK',
    heading: '手がけるところ',
    lead: '一部屋のカーテン替えから、住まいまるごとのリニューアルまで。',
    items: [
      {title: '一戸建て', text: 'リビング／寝室／子ども部屋\n新築も、住み替えも'},
      {title: 'マンション', text: '窓の形に合わせた採寸\n管理規約に沿った施工'},
      {title: '店舗・オフィス', text: '小さなお店の内装も\nお気軽にご相談ください'},
    ],
    photos: ['', '', ''],
  },
  topics: {
    kicker: 'FROM OUR BLOG',
    heading: 'ブログより',
    items: [
      {
        title: '思い出のカーテンを新しい暮らしへ。\n全面リフォーム後のご自宅に取付しました',
        note: '施工事例',
      },
      {title: 'カーテンを選ぶ時に', note: '選び方のはなし'},
    ],
  },
  closing: {
    message: 'まずは、窓ひとつからでも。',
    url: 'https://intema-jp.com/',
    tel: '', // 載せない方針のため空のまま
    email: '',
  },
};

/** ============================================================
 *  BtoB：法人・施設向け
 *  ============================================================ */
const btob: Content = {
  opening: {
    kicker: 'FOR YOUR WORKPLACE',
    lines: ['はたらく場所を、', '整える。'],
    tagline: 'オフィスも、施設も、窓まわりから内装まで。',
  },
  region: {
    kicker: 'OUR AREA',
    heading: '広島県全域、\n県外へも。',
    lead: '広島県三次市を拠点に、県内全域の事業所・施設へ伺います。\n遠方では山口県での施工実績もあります。',
    points: [
      {label: 'オフィス', text: '会議室から執務室まで。\n内装も什器も照明も、\n一社にまとめられます。'},
      {label: '施設', text: '学校・事務所・病院・公共施設の\n修繕やリニューアルも\n手がけています。'},
      {label: '賃貸物件', text: 'マンション・アパートの\n原状回復や設備更新も\nご相談ください。'},
    ],
  },
  about: {
    kicker: 'ABOUT US',
    heading: '私たちについて',
    lead: '窓まわり、壁紙、床、照明、什器。\nはたらく場所をつくる要素をまとめてお任せいただける、\n三次の内装仕上げ工事店です。',
  },
  services: {
    kicker: 'SERVICES',
    heading: '事業内容',
    items: [
      {
        no: '01',
        title: 'オフィス\nリノベーション',
        text: '内装から照明・什器まで。\nはたらく場所を\nまとめて更新します。',
      },
      {
        no: '02',
        title: '内装仕上工事',
        text: '壁紙（クロス）、天井、\n床材の張り替え。\n本業として請けています。',
      },
      {
        no: '03',
        title: '窓まわり',
        text: 'ブラインド、\nロールスクリーン、カーテン。\n遮光・防炎のご相談にも。',
      },
    ],
  },
  process: {
    kicker: 'HOW WE WORK',
    heading: 'ご相談から、引き渡しまで',
    lead: '業務を止めないことを前提に、この流れで進めます。',
    steps: [
      {no: '01', title: 'ご相談・現地調査', text: '使い方を伺い、\n現地を確認します。'},
      {no: '02', title: 'プランのご提案', text: '仕様と工程を\nあわせてご提案。'},
      {no: '03', title: 'お見積り', text: '内訳の見えるかたちで\nお出しします。'},
      {no: '04', title: '施工・保証', text: '引き渡し後も\n1年間の保証つき。'},
    ],
  },
  strengths: {
    kicker: 'OUR STRENGTHS',
    heading: '選ばれる理由',
    items: [
      {
        no: '01',
        title: '一社で完結する',
        text: '内装も窓まわりも照明も什器も。\n窓口をひとつにまとめられます。',
      },
      {
        no: '02',
        title: '内訳の見える見積り',
        text: '何にいくらかかるのかを明示します。\n稟議にそのまま出せるかたちで。',
      },
      {
        no: '03',
        title: '全ての工事に1年保証',
        text: '引き渡して終わりにしません。\n施工後1年間は保証つきです。',
      },
    ],
  },
  numbers: {
    kicker: 'BY THE NUMBERS',
    heading: '数字で見るインテマイズ',
    items: [
      {value: 23, unit: '市町', label: '広島県内全域に対応'},
      {value: 2, unit: '県', label: '広島・山口での施工実績'},
      {value: 1, unit: '年', label: '全工事の保証期間'},
    ],
  },
  fields: {
    kicker: 'OUR WORK',
    heading: '手がけるところ',
    lead: '一室の改装から、施設まるごとのリニューアルまで。',
    items: [
      {title: 'オフィス', text: '執務室・会議室・応接\n内装と什器をまとめて'},
      {title: '学校・公共施設', text: '教室・職員室・庁舎\n遮光や防炎のご相談も'},
      {title: '病院・福祉施設', text: '修繕・リニューアル\n長く使う場所の内装に'},
    ],
    photos: ['', '', ''],
  },
  topics: {
    kicker: 'FROM OUR BLOG',
    heading: '事務所の、こんな困りごとも',
    items: [
      {
        title: '合皮チェアがボロボロに…\nそんな事務所にコクヨ「ミトラ2」を11台入れてみた話',
        note: '什器の入れ替え事例', // 要確認：ブログ記事のタイトル表記
      },
      {title: 'カーテンを選ぶ時に', note: '窓まわりの選び方'},
    ],
  },
  closing: {
    message: 'オフィスのことも、まずはご相談から。',
    url: 'https://intema-jp.com/',
    tel: '',
    email: '',
  },
};

export const getContent = (audience: Audience): Content => (audience === 'btob' ? btob : btoc);

export const AUDIENCE_LABEL: Record<Audience, string> = {
  btoc: '一般のお客様向け',
  btob: '法人・施設向け',
};
