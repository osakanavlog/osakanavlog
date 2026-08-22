# おさかなvlog

魚との暮らしや、旬のおさかな料理を動画で紹介する vlog サイトです。

## 特長

- **標準言語は日本語**（`<html lang="ja">`）
- 依存パッケージ不要の静的サイト（HTML / CSS のみ・JavaScript なし）
- モバイルからデスクトップまでのレスポンシブ対応
- OS の設定に追従する**ライト / ダークテーマ**（`prefers-color-scheme`）
- 画像ファイル不要 — サムネイルは inline SVG とグラデーションで表現

## ファイル構成

| ファイル | 説明 |
| --- | --- |
| `index.html` | トップページ（日本語） |
| `style.css` | スタイルシート |

## デザインについて

海をイメージしたブルーを基調に、CSS カスタムプロパティでトークンを定義しています。
色を変えたい場合は `style.css` の `:root`（ライト）と
`@media (prefers-color-scheme: dark)` 内の `:root`（ダーク）を編集してください。

```css
:root {
  --sea-600: #0a7ea4; /* キーカラー */
  --bg:      var(--sea-50);
  --surface: #ffffff;
  --text:    #12262f;
}
```

カード類は `--card-hue`（色相の数値）を要素側で指定することで、
サムネイルの背景・タグ・ホバー時の枠線の色がまとめて切り替わります。

```html
<article class="video-card" style="--card-hue: 152;"> … </article>
```

### アクセシビリティ

- 「本文へスキップ」リンクとキーボード操作用のフォーカスリング
- 固定ヘッダーに隠れないよう `scroll-padding-top` を画面幅に応じて調整
- `prefers-reduced-motion: reduce` でアニメーション（泡・ホバー）を停止

## 使い方

`index.html` をブラウザで開くだけで表示できます。

ローカルサーバーで確認する場合:

```sh
python3 -m http.server
```

ブラウザで <http://localhost:8000> を開いてください。
