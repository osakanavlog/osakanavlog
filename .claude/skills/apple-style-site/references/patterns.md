# Apple スタイルのセクションパターン

`tokens.css` を読み込んでいる前提。すべて全幅セクション + 内側 `.wrap` の構造で書く。

## 0. ベース

```css
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--fs-body);
  line-height: var(--lh-body-ja);
  color: var(--text-primary);
  background: var(--surface-white);
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: var(--wrap); margin-inline: auto; padding-inline: var(--gutter); }
.section { padding-block: var(--section-y); }
.section--gray { background: var(--surface-gray); }
.section--dark { background: #000; color: var(--text-on-dark); }
.headline {
  font-size: var(--fs-headline);
  font-weight: 600;
  letter-spacing: var(--ls-headline);
  line-height: var(--lh-headline);
  margin: 0 0 var(--space-2);
}
.subhead { font-size: var(--fs-body-lg); color: var(--text-secondary); margin: 0; }
.eyebrow {
  font-size: var(--fs-caption);
  font-weight: 600;
  color: var(--accent);
  letter-spacing: var(--ls-caption);
  margin: 0 0 var(--space-1);
}
```

## 1. ヒーロー

1行の見出し + 1行のサブ + CTA、そして下に大きなビジュアル。テキストは中央寄せ。

```html
<section class="hero">
  <div class="wrap">
    <h1 class="hero__title">静かに、速く。</h1>
    <p class="hero__sub">余計なものを削ぎ落とした新しい体験。</p>
    <p class="hero__actions">
      <a class="btn btn--primary" href="#buy">購入する</a>
      <a class="link link--chevron" href="#more">詳しく見る</a>
    </p>
  </div>
  <div class="hero__visual"><img src="product.jpg" alt="" width="2000" height="1200"></div>
</section>
```

```css
.hero { text-align: center; padding-top: calc(var(--header-h) + var(--space-8)); }
.hero__title {
  font-size: var(--fs-display);
  font-weight: 600;
  letter-spacing: var(--ls-display);
  line-height: var(--lh-display);
  margin: 0 0 var(--space-2);
}
.hero__sub { font-size: var(--fs-body-lg); color: var(--text-secondary); margin: 0 0 var(--space-3); }
.hero__actions { display: flex; gap: var(--space-3); justify-content: center; align-items: center; flex-wrap: wrap; }
.hero__visual img { display: block; width: 100%; height: auto; margin-top: var(--space-6); }
```

画像は**背景を敷かず**に置く（プロダクト写真は白/黒背景で切り抜き済みのものを使う）。切り抜けない場合はセクション背景を写真の背景色に合わせる。

## 2. ボタンとリンク

```css
.btn {
  display: inline-block;
  border: 0;
  border-radius: var(--radius-pill);
  padding: 12px 22px;
  font-size: var(--fs-body);
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-standard);
}
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover { background: var(--accent-hover); }
.btn--secondary { background: transparent; color: var(--accent); box-shadow: inset 0 0 0 1px currentColor; }
.link { color: var(--accent-link); text-decoration: none; }
.link:hover { text-decoration: underline; }
.link--chevron::after { content: " ›"; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }
```

hover で `transform: scale()` を掛けない。色の変化だけで足りる。

## 3. 交互セクション（ストーリーを積む）

白 → グレー → 白 → 黒 の順で全幅セクションを積む。各セクションは「見出し1・本文2〜3行・図版1」。

```css
.feature { display: grid; gap: var(--space-6); align-items: center; }
@media (min-width: 834px) {
  .feature { grid-template-columns: 1fr 1fr; }
  .feature--reverse .feature__media { order: -1; }
}
```

テキスト列は最大 46em ではなく **32em 程度**で折り返す。Apple の本文は短い。

## 4. カードグリッド（最大3枚）

```css
.cards { display: grid; gap: var(--space-2); grid-template-columns: 1fr; margin: 0; padding: 0; list-style: none; }
@media (min-width: 834px) { .cards { grid-template-columns: repeat(3, 1fr); } }
.card {
  background: var(--surface-card);
  border-radius: var(--radius-card-lg);
  padding: var(--space-4);
  /* box-shadow は使わない。面の色で分離する */
}
.card h3 { font-size: var(--fs-title); font-weight: 600; letter-spacing: var(--ls-headline); margin: 0 0 var(--space-1); }
.card p { color: var(--text-secondary); margin: 0; }
```

4枚以上並べたくなったら、それは「一覧ページ」であってヒーロー配下のカードではない。横スクロールのカードレール（`scroll-snap-type: x mandatory;` + `scroll-snap-align: center;`）にする。

## 5. 仕様表（Tech Specs）

情報密度を上げてよい唯一の場所。ヘアラインで区切り、ラベルは `--text-secondary`、値は `--text-primary`。

```css
.specs { border-top: 1px solid var(--hairline); }
.specs__row { display: grid; gap: var(--space-2); padding: var(--space-3) 0; border-bottom: 1px solid var(--hairline); }
@media (min-width: 834px) { .specs__row { grid-template-columns: 240px 1fr; } }
.specs__label { color: var(--text-secondary); font-size: var(--fs-caption); }
.specs__value { font-variant-numeric: tabular-nums; }
```

## 6. スティッキーヘッダー

```css
.header {
  position: sticky; top: 0; z-index: 50;
  height: var(--header-h);
  display: flex; align-items: center;
  background: var(--header-bg);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--hairline);
}
.header nav ul { display: flex; gap: var(--space-3); margin: 0; padding: 0; list-style: none; }
.header a { font-size: var(--fs-nav); color: var(--text-primary); opacity: 0.8; text-decoration: none; }
.header a:hover { opacity: 1; }
```

`backdrop-filter` 非対応ブラウザ向けに `background` は必ず半透明色で指定しておく（ぼけなくても読める）。

## 7. フッター

`--fs-caption` サイズ、`--text-secondary`、リンクは複数列のリストにまとめる。法務表記は最後に 12px で。装飾は一切入れない。
