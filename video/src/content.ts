/**
 * ============================================================
 *  この動画のテキストは、すべてこのファイルに入っています。
 *  ここだけを書き換えれば内容が差し替わります。
 * ============================================================
 *
 *  ⚠️ 「TODO:」が付いている項目は、実際の会社情報に差し替えてください。
 *     （公開情報から事実を確認できなかったため、仮の文言が入っています）
 *
 *  すべて差し替え終わったら draftMode を false にすると、
 *  画面右上の「DRAFT」表示が消えます。
 */

export const draftMode = true;

/** ---------------- 会社の基本情報 ---------------- */
export const company = {
  name: 'インテマイズ',
  /** ロゴ的に出す英字表記。正式な英語表記に差し替えてください */
  nameEn: 'INTEMIZE', // TODO: 正式な英文表記を確認
  /** キャッチコピー（案）。自社の言葉に差し替えてください */
  tagline: '地域とともに、次の一歩を。', // TODO
  /** 英字サブコピー */
  taglineEn: 'From Miyoshi, Hiroshima.',
  city: '広島県三次市',
};

/** ---------------- 01 オープニング ---------------- */
export const opening = {
  kicker: 'COMPANY PROFILE',
  lines: ['三次から、', 'まだ見ぬ価値を。'], // TODO: 2行のコピー
};

/** ---------------- 02 まちの紹介（三次市） ---------------- */
export const region = {
  kicker: 'OUR HOME',
  heading: '三つの川が出会うまちで。',
  lead: '広島県の北部、中国山地に抱かれた三次市。\n三つの川が合流するこの土地で、私たちは事業を営んでいます。',
  points: [
    {label: '交通', text: '中国自動車道と松江自動車道が交わる、\n中国地方のほぼ中心。'},
    {label: '環境', text: '豊かな自然と、まちの暮らしが\n近い距離で共存しています。'},
    {label: 'ひと', text: '顔の見える関係のなかで、\n仕事を積み重ねてきました。'}, // TODO: 自社の言葉に
  ],
};

/** ---------------- 03 会社概要 ---------------- */
export const about = {
  kicker: 'ABOUT US',
  heading: '私たちについて',
  lead: 'ここに会社の紹介文が入ります。\n創業の経緯、大切にしている考え方、\nお客様との関わり方などを 3〜4 行で。', // TODO
  /** 会社データ。value を空文字にすると、その行は「—」で表示されます */
  facts: [
    {label: '社名', value: 'インテマイズ'},
    {label: '所在地', value: '広島県三次市'}, // TODO: 番地まで
    {label: '設立', value: ''}, // TODO
    {label: '代表者', value: ''}, // TODO
    {label: '事業内容', value: ''}, // TODO
  ],
};

/** ---------------- 04 事業内容 ---------------- */
export const services = {
  kicker: 'SERVICES',
  heading: '事業内容',
  /** 3つを想定。増減も可能です */
  items: [
    {
      no: '01',
      title: '事業の名前', // TODO
      text: 'その事業が、誰の\nどんな困りごとを\n解決しているのかを書きます。', // TODO
    },
    {
      no: '02',
      title: '事業の名前', // TODO
      text: '提供している価値を\n具体的に、\n短い言葉で。', // TODO
    },
    {
      no: '03',
      title: '事業の名前', // TODO
      text: '写真を入れる場合は\npublic/ に置いて\n差し替えてください。', // TODO
    },
  ],
};

/** ---------------- 05 仕事の進め方 ---------------- */
export const process = {
  kicker: 'HOW WE WORK',
  heading: '仕事の進め方',
  lead: 'ご相談から納品まで、私たちはこの流れで進めます。', // TODO
  steps: [
    {no: '01', title: 'ご相談', text: 'まずはお話を伺います。'}, // TODO
    {no: '02', title: 'ご提案', text: '最適な進め方を考えます。'}, // TODO
    {no: '03', title: '実行', text: '責任をもって形にします。'}, // TODO
    {no: '04', title: 'フォロー', text: '納品後も伴走します。'}, // TODO
  ],
};

/** ---------------- 06 強み ---------------- */
export const strengths = {
  kicker: 'OUR STRENGTHS',
  heading: '選ばれる理由',
  items: [
    {no: '01', title: '強みの見出し', text: 'その強みが、お客様にとって何の得になるのかまで書くと伝わります。'}, // TODO
    {no: '02', title: '強みの見出し', text: '他社との違いを、比較ではなく自分たちの言葉で。'}, // TODO
    {no: '03', title: '強みの見出し', text: '実績や体制など、裏付けになる事実を添えてください。'}, // TODO
  ],
};

/**
 * ---------------- 07 数字 ----------------
 * value に数値を入れると、カウントアップ表示になります。
 * null のままだと「—」のプレースホルダー表示になります（事実未確認のため既定は null）。
 */
export const numbers = {
  kicker: 'BY THE NUMBERS',
  heading: '数字で見るインテマイズ',
  items: [
    {value: null as number | null, unit: '年', label: '創業からの歩み'}, // TODO
    {value: null as number | null, unit: '名', label: '従業員数'}, // TODO
    {value: null as number | null, unit: '件', label: '年間の実績'}, // TODO
    {value: null as number | null, unit: '%', label: 'リピート率'}, // TODO
  ],
};

/** ---------------- 08 はたらく人 ---------------- */
export const voices = {
  kicker: 'PEOPLE',
  heading: 'はたらく人',
  lead: '社員のことばを載せる場所です。', // TODO
  items: [
    {quote: 'ここに社員のコメントが入ります。\n実際に話してもらった言葉を、\nそのまま使うのがいちばん伝わります。', name: '氏名', role: '部署・職種'}, // TODO
    {quote: '2人目のコメント。\n入社のきっかけや、\n仕事のやりがいなど。', name: '氏名', role: '部署・職種'}, // TODO
  ],
};

/** ---------------- 09 クロージング ---------------- */
export const closing = {
  message: 'お問い合わせ、お待ちしています。',
  /** 空文字にすると非表示になります */
  url: '', // TODO: 例 https://example.co.jp
  tel: '', // TODO
  email: '', // TODO
};
