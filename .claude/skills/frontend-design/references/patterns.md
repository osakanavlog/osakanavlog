# コンポーネント実装パターン

既存の `index.html` / `style.css` の書き味に合わせた実装例。

## セクション

```html
<section id="recipes" class="recipes">
  <h2>レシピ</h2>
  <p>...</p>
</section>
```

```css
.recipes h2 {
  border-left: 4px solid var(--color-primary);
  padding-left: 0.75rem;
}

.recipes {
  margin: 2.5rem 0;
}
```

見出しの左ボーダーはこのサイトのセクション見出しの型。新しいセクションでも踏襲する。
（`.videos h2, .about h2, .contact h2` のセレクタリストに足す形でもよい。）

## カード一覧

```html
<ul class="video-list">
  <li class="video-card">
    <div class="thumbnail" aria-hidden="true"></div>
    <h3>タイトル</h3>
    <p class="video-date">2026年7月1日</p>
    <p>説明文。</p>
  </li>
</ul>
```

- 並びは `ul` / `li` + `list-style: none`。意味のある一覧を `div` の羅列にしない。
- グリッドは `repeat(auto-fill, minmax(240px, 1fr))`。メディアクエリ不要で 1〜4 列に折り返る。
- サムネイルは `aspect-ratio: 16 / 9` で高さを確保。実画像に差し替えるときも同じ比率を維持し、`<img>` に `width` / `height` 属性を入れてレイアウトシフトを防ぐ。

```html
<img class="thumbnail" src="images/aji.jpg" width="640" height="360" alt="三枚におろしたあじ" loading="lazy">
```

## リンクカード（カード全体を押せるようにする）

```html
<li class="video-card">
  <div class="thumbnail" aria-hidden="true"></div>
  <h3><a class="card-link" href="videos/aji.html">旬のあじをさばく</a></h3>
  <p class="video-date">2026年6月20日</p>
</li>
```

```css
.video-card { position: relative; }

.card-link::after {
  content: "";
  position: absolute;
  inset: 0;           /* カード全体をクリック領域に */
  border-radius: var(--radius);
}

.video-card:focus-within {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

カード全体を `<a>` で包まない。見出しのリンクを疑似要素で広げるほうが、読み上げ時の情報量が適切になる。

## ボタン

```html
<a class="button" href="#contact">お問い合わせ</a>
<button class="button" type="submit">送信する</button>
```

```css
.button {
  display: inline-block;
  padding: 0.6rem 1.25rem;
  border: none;
  border-radius: var(--radius);
  background: var(--color-primary);
  color: #fff;
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

.button:hover { background: var(--color-primary-dark); }   /* :root にホバー用トークンを足して使う */

.button:focus-visible {
  outline: 3px solid var(--color-text);
  outline-offset: 2px;
}
```

ページ遷移は `<a>`、動作の実行は `<button>`。見た目が同じでもタグを使い分ける。

## フォーム

```html
<form class="contact-form" action="..." method="post">
  <div class="field">
    <label for="name">お名前</label>
    <input id="name" name="name" type="text" autocomplete="name" required>
  </div>
  <div class="field">
    <label for="message">メッセージ</label>
    <textarea id="message" name="message" rows="6" required></textarea>
  </div>
  <button class="button" type="submit">送信する</button>
</form>
```

- `label` と入力欄は `for` / `id` で必ず結ぶ。プレースホルダーをラベル代わりにしない。
- 入力欄の文字サイズは 16px 以上（iOS で自動ズームするため）。

## ナビゲーションの折り返し

現在のヘッダーは `flex-wrap: wrap` で、狭い画面ではタイトルの下にナビが回り込む。
ハンバーガーメニュー（JS 必須）を足す前に、まず折り返しで足りないか検討する。
項目が 5 つを超えるまでは折り返しで十分。

## アニメーション

```css
.video-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.video-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(10, 126, 164, 0.16);
}

@media (prefers-reduced-motion: reduce) {
  .video-card { transition: none; }
  .video-card:hover { transform: none; }
}
```

影の色は既存の `rgba(10, 126, 164, 0.08)`（プライマリ色の透過）に揃える。黒い影は使わない。

## ダークモード（必要になったら）

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0e1a1f;
    --color-surface: #16262d;
    --color-text: #e6eef1;
    --color-muted: #9fb3bb;
    --color-primary: #4bb8d8;   /* 暗背景でのコントラストを確保するため明るめに */
  }
}
```

トークンだけを差し替えれば済むよう、値の直書きを避けておくことが前提。
`.site-footer` など固定色で書かれている箇所はトークン化してから対応する。
