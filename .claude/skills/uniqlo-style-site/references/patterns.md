# UNIQLO スタイルのパターン集

`tokens.css` を読み込んでいる前提。すべて角丸 0・影なし。

## 0. ベース

```css
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--font);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}
img { display: block; width: 100%; height: auto; }
.wrap { max-width: var(--wrap); margin-inline: auto; padding-inline: var(--edge); }
.label {
  font-size: var(--fs-label); text-transform: uppercase;
  letter-spacing: var(--ls-label); color: var(--text-muted);
}
```

## 1. 商品グリッド

```html
<ul class="grid">
  <li class="product">
    <a class="product__link" href="#">
      <div class="product__media">
        <img src="a.jpg" alt="クルーネックT ホワイト">
        <img class="product__media--alt" src="a2.jpg" alt="" aria-hidden="true">
      </div>
      <p class="product__badges"><span class="badge badge--sale">限定価格</span></p>
      <h3 class="product__name">クルーネックT（半袖）</h3>
      <p class="product__price">
        <strong class="price price--sale">¥1,290</strong>
        <s class="price__was">¥1,990</s>
        <span class="price__tax">税込</span>
      </p>
    </a>
  </li>
</ul>
```

```css
.grid {
  display: grid; gap: var(--gap-sm) var(--gap-sm);
  grid-template-columns: repeat(2, 1fr);
  margin: 0; padding: 0; list-style: none;
}
@media (min-width: 600px)  { .grid { grid-template-columns: repeat(3, 1fr); gap: var(--gap); } }
@media (min-width: 1024px) { .grid { grid-template-columns: repeat(4, 1fr); gap: var(--gap-md); } }
@media (min-width: 1440px) { .grid { grid-template-columns: repeat(5, 1fr); } }

.product__link { display: block; color: inherit; text-decoration: none; }
.product__media { position: relative; aspect-ratio: var(--ratio-product); background: var(--bg-subtle); overflow: hidden; }
.product__media img { height: 100%; object-fit: cover; }
.product__media--alt { position: absolute; inset: 0; opacity: 0; transition: opacity var(--dur) var(--ease); }
.product__link:hover .product__media--alt,
.product__link:focus-visible .product__media--alt { opacity: 1; }

.product__name { font-size: var(--fs-sm); font-weight: 400; line-height: var(--lh-name); margin: var(--gap-sm) 0 var(--gap-xs); }
.product__badges { margin: var(--gap-sm) 0 0; display: flex; gap: var(--gap-xs); }
```

画像の比率はページ全体で1つに固定する。`object-fit: cover` で必ず埋め、余白を出さない。

## 2. 価格

```css
.product__price { margin: 0; display: flex; align-items: baseline; gap: var(--gap-xs); flex-wrap: wrap; }
.price { font-size: var(--fs-price); font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: 0; }
.price--sale { color: var(--brand); }
.price__was { font-size: var(--fs-label); color: var(--text-muted); font-variant-numeric: tabular-nums; }
.price__tax { font-size: var(--fs-label); color: var(--text-muted); }
```

```js
const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });
yen.format(1290); // → ￥1,290
```

## 3. バッジ

```css
.badge {
  display: inline-block; padding: 2px 6px; border-radius: 0;
  font-size: var(--fs-label); letter-spacing: var(--ls-label);
  background: var(--bg-invert); color: var(--text-on-invert);
}
.badge--sale { background: var(--brand); color: #fff; }
.badge--outline { background: transparent; color: var(--text); box-shadow: inset 0 0 0 1px var(--line-strong); }
```

## 4. キャンペーンバナー（写真 + 四角いテキストブロック）

```html
<section class="banner">
  <img src="campaign.jpg" alt="">
  <div class="banner__box">
    <p class="label">NEW ARRIVAL</p>
    <h2 class="banner__title">春の定番を、もう一度。</h2>
    <p class="banner__text">軽くて乾きやすい素材に刷新しました。</p>
    <a class="textlink" href="#">商品を見る</a>
  </div>
</section>
```

```css
.banner { position: relative; }
.banner img { aspect-ratio: var(--ratio-banner); object-fit: cover; }
.banner__box { background: var(--bg); padding: var(--gap-lg); }
@media (min-width: 768px) {
  .banner__box {
    position: absolute; left: var(--edge); bottom: var(--edge);
    max-width: 380px; padding: var(--gap-xl);
  }
}
.banner__title { font-size: var(--fs-h2); font-weight: 700; line-height: var(--lh-tight); letter-spacing: var(--ls-head); margin: var(--gap-sm) 0; }
.banner__text { margin: 0 0 var(--gap-md); color: var(--text-muted); }
.textlink { color: var(--text); font-size: var(--fs-body); text-decoration: none; border-bottom: 1px solid var(--line-strong); padding-bottom: 2px; }
.textlink:hover { color: var(--brand); border-color: var(--brand); }
```

モバイルでは重ねずに写真の**下**に置く。重ねたまま縮めると文字が読めなくなる。

## 5. ヘッダー（ユーティリティ行 + カテゴリ行）

```css
.header { position: sticky; top: 0; z-index: 40; background: var(--bg); border-bottom: 1px solid var(--line); }
.header__utility { display: flex; align-items: center; justify-content: space-between; padding-block: var(--gap-sm); }
.header__logo { display: inline-block; background: var(--brand); color: #fff; font-weight: 700; font-size: var(--fs-nav); letter-spacing: var(--ls-label); padding: 6px 8px; text-decoration: none; }
.header__cats { display: flex; gap: var(--gap-lg); overflow-x: auto; scroll-snap-type: x proximity; padding-block: var(--gap-sm); margin: 0; list-style: none; -webkit-overflow-scrolling: touch; }
.header__cats::-webkit-scrollbar { display: none; }
.header__cats a { scroll-snap-align: start; white-space: nowrap; font-size: var(--fs-nav); letter-spacing: var(--ls-label); text-transform: uppercase; color: var(--text); text-decoration: none; padding-bottom: 4px; border-bottom: 2px solid transparent; }
.header__cats a[aria-current="page"], .header__cats a:hover { border-color: var(--brand); }
```

ロゴは**赤い正方形/長方形のタイル**に白文字が UNIQLO 的（Kashiwa Sato のグリッド由来）。自分のブランド名で作ること。

## 6. フィルタ・ソート行

商品グリッドの上に 1 行。左に件数（`124件`、等幅数字）、右にソートのセレクト。区切りはヘアライン。ボタンは四角、`box-shadow: inset 0 0 0 1px var(--line-strong)`。

```css
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--gap); padding-block: var(--gap); border-bottom: 1px solid var(--line); font-size: var(--fs-sm); }
.toolbar select { font: inherit; border: 1px solid var(--line-strong); border-radius: 0; background: var(--bg); color: var(--text); padding: 6px 8px; }
```

## 7. CTA ボタン

```css
.btn { display: inline-block; border: 0; border-radius: 0; padding: 14px 32px; font-size: var(--fs-body); font-weight: 700; text-decoration: none; cursor: pointer; transition: background-color var(--dur) var(--ease); }
.btn--primary { background: var(--brand); color: #fff; }
.btn--primary:hover { background: var(--brand-dark); }
.btn--ghost { background: transparent; color: var(--text); box-shadow: inset 0 0 0 1px var(--line-strong); }
.btn--block { display: block; width: 100%; text-align: center; }
:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
```

モバイルの主要 CTA は幅いっぱい（`--btn-block`）。

## 8. フッター

リンクを 2〜4 列のリストに整列。見出しは 12px 大文字ラベル、リンクは 13px。最下部に言語・地域切り替えと法務表記を 11px `--text-muted` で。装飾は罫線 1 本のみ。
