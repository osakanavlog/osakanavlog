# デザイン言語プリセット

各プリセットは「何が本質か → トークン → 組み方 → やってはいけないこと」の順。**1プロジェクトで1つだけ選ぶ。**

---

## <a id="muji"></a>MUJI（無印良品）系 — 静けさ・素材・引き算

**本質:** 主張しないこと。色は素材の色、文字は小さく、余白が広い。買わせようとしない態度そのものがデザイン。

```css
:root {
  --bg: #ffffff;
  --bg-warm: #f7f5f2;      /* 生成りの面 */
  --text: #333333;         /* 純黒にしない */
  --text-muted: #767676;
  --accent: #7f0019;       /* えんじ。ロゴと重要な導線のみ */
  --line: #e3e0da;
  --radius: 0;             /* 角丸はほぼ使わない（2px まで） */
  --font: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", Meiryo,
          Helvetica, Arial, sans-serif;
  --fs-body: 14px;         /* 本文は小さめ */
  --fs-h2: clamp(18px, 2.4vw, 24px);   /* 見出しも大きくしない */
  --lh-body: 1.9;          /* 行間は広い */
  --space-section: clamp(56px, 8vw, 112px);
}
```

**組み方:** 写真は自然光・低彩度・引きの構図。商品は等間隔グリッドに小さく並べる。見出しは本文より 1.5 倍程度までしか大きくしない（強い階層を作らない）。区切り線は 1px の暖色グレー。文章は説明的で丁寧に。

**禁止:** 高彩度の色、太いウェイト、影、アニメーション、感嘆符。

---

## <a id="nike"></a>Nike 系 — 熱量・コントラスト・動き

**本質:** 全画面の写真/動画に、太くて大きい大文字の見出しを叩き込む。余白は狭く、文字は画面いっぱいに。

```css
:root {
  --bg: #ffffff;
  --bg-invert: #111111;
  --text: #111111;
  --accent: #fa5400;       /* 差し色は 1 色、面積は小さく */
  --font: "Helvetica Neue", Helvetica, Arial, "Hiragino Kaku Gothic ProN", sans-serif;
  --fs-hero: clamp(40px, 11vw, 140px);
  --lh-hero: 0.92;          /* 詰める */
  --ls-hero: -0.03em;
  --weight-hero: 800;
  --radius-pill: 999px;     /* ボタンだけ完全な pill */
}
```

**組み方:** ヒーローは 100vh の写真 + 中央または左下の巨大見出し（大文字・2〜4語）+ 黒い pill ボタン。セクション間に余白を取らず、全幅ブロックを**隙間なく**積む。商品グリッドはカード境界なし、hover で画像だけ 1.03 倍。数字（記録・サイズ）は大きく太く。

**禁止:** 長い説明文、淡い色、細いフォント、装飾的な罫線。和文見出しは大文字化できないので、代わりにウェイトと字詰めで強さを出す。

---

## <a id="airbnb"></a>Airbnb 系 — 親しみ・角丸・カード

**本質:** やわらかい角丸と余白の効いたカード、写真の丸みと明るい配色で「安心して予約できる」空気を作る。

```css
:root {
  --bg: #ffffff;
  --text: #222222;
  --text-muted: #717171;
  --accent: #ff385c;
  --line: #dddddd;
  --radius: 12px;
  --radius-media: 12px;
  --radius-pill: 999px;
  --shadow-hover: 0 6px 16px rgba(0,0,0,.12);   /* hover だけ影を出す */
  --font: "Circular", -apple-system, "Hiragino Sans", "Yu Gothic", sans-serif;
  --fs-body: 15px;
  --lh-body: 1.6;
}
```

**組み方:** 検索バーは pill + 影付きで常に最上部。カードは画像 `border-radius: 12px` + 影なし、hover でのみ影。情報は「タイトル / 補足（グレー） / 価格（太字）」の3行に固定。アイコンは線画で統一。フィルタは pill のチップ列。

**禁止:** 角丸の値をバラバラにすること、カードに常時影を付けること、赤を広い面積に使うこと。

---

## <a id="stripe"></a>Stripe 系 — 精密・階調・開発者向け

**本質:** 細部の精度で信頼を作る。彩度の高いグラデーションを**背景の一部だけ**に使い、コンテンツは徹底的に整列させる。

```css
:root {
  --bg: #ffffff;
  --bg-deep: #0a2540;
  --text: #0a2540;
  --text-muted: #425466;
  --accent: #635bff;
  --line: #e6ebf1;
  --radius: 8px;
  --shadow-card: 0 2px 5px -1px rgba(50,50,93,.25), 0 1px 3px -1px rgba(0,0,0,.3);
  --font: -apple-system, "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif;
  --font-mono: "SF Mono", "JetBrains Mono", Consolas, monospace;
  --fs-h1: clamp(32px, 5vw, 56px);
  --lh-body: 1.6;
}
```

**組み方:** ヒーロー背景に斜めに切ったグラデーション面（`clip-path: polygon(...)`）。2カラムで左に説明・右にコードブロック（等幅・行番号・ハイライト）。数値や API 名は等幅フォント。カードは薄い影 + 8px 角丸。リンクは紫、hover で明度を上げる。

**禁止:** グラデーションを 2 箇所以上で使う、コードブロックをスクリーンショット画像にする、余白を詰める。

---

## <a id="editorial"></a>Editorial / 北欧・雑誌系 — 文字組みで見せる

**本質:** 写真と余白と**セリフ体**。グリッドを崩して非対称に配置し、読み物としての流れを作る。

```css
:root {
  --bg: #fbfaf8;
  --text: #1a1a1a;
  --text-muted: #6b6b6b;
  --accent: #1a1a1a;                    /* 差し色を使わないのが最も強い */
  --font-serif: "Times New Roman", "Hiragino Mincho ProN", "Yu Mincho", serif;
  --font-sans: Helvetica, Arial, "Hiragino Sans", sans-serif;
  --fs-h1: clamp(32px, 6vw, 72px);
  --lh-h1: 1.1;
  --measure: 34em;                      /* 本文の行長 */
  --radius: 0;
}
```

**組み方:** 見出しは明朝/セリフ、キャプションと日付はサンセリフの小さい大文字。本文は 1 カラム `max-width: 34em` で中央。画像は時々本文幅を**はみ出させる**（`margin-inline: calc(-1 * var(--bleed))`）ことでリズムを作る。ドロップキャップ、罫線1本、ページ番号のような小さな仕掛けが効く。

**禁止:** 中央揃えの長文、影、カード化、セリフとサンセリフを 3 書体以上混ぜること。

---

## <a id="luxury"></a>Aesop / ラグジュアリー系 — 抑制・非対称・間

**本質:** 情報を出さない勇気。画面の 7 割が余白で、小さな文字が非対称に置かれる。

```css
:root {
  --bg: #fffef9;
  --bg-alt: #333330;
  --text: #333330;
  --accent: #333330;
  --font: "Times New Roman", "Hiragino Mincho ProN", serif;
  --fs-body: 15px;
  --lh-body: 1.8;
  --ls-label: 0.16em;   /* 英字ラベルは極端に字間を開ける */
  --radius: 0;
  --space-section: clamp(80px, 12vw, 180px);
}
```

**組み方:** ナビは左上に小さく。商品は 1 画面 1 点。ラベルは大文字・字間 0.16em・11px。写真は少なく、1枚を大きく。動きは 400ms の fade のみ。

**禁止:** セール訴求、バッジ、複数カラムの詰め込み、太字。

---

## 混ぜてよい範囲

- **配色だけ差し替える**（例: Apple の構造で MUJI の色）→ 可。
- **角丸と影のルールを混ぜる**（Airbnb の角丸 + UNIQLO のフラット）→ 不可。破綻する。
- 1ページ内でセクションごとに言語を変える → 不可。
