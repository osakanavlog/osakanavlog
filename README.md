# みそしる山田

おさかなvlog のサイトです。記事（動画ノート）は **Obsidian** で書き、静的な HTML に変換して公開します。

## 構成

```
vault/            … Obsidian の vault（ここだけを手で編集する）
├── videos/       … 動画ノート 1 本 = 1 ファイル
├── templates/    … 新規ノート用テンプレート
└── assets/       … 画像などの添付ファイル
tools/build.mjs   … vault からサイトを生成するスクリプト（依存パッケージなし）
index.html        … トップページ。動画一覧はマーカーの間に自動生成される
videos/           … 動画ごとのページ（自動生成）
assets/           … vault/assets のコピー（自動生成）
```

## 使いかた

1. Obsidian で `vault` フォルダを Vault として開く（詳しい設定は [vault/README.md](vault/README.md)）
2. `vault/videos/` にノートを書く。下書きのあいだは `draft: true`
3. 公開するときは `draft: false` にして、リポジトリのルートで次を実行する

```sh
npm run build   # または node tools/build.mjs
```

4. 更新された `index.html` / `videos/` / `assets/` をコミットする

Node.js 18 以上があれば動きます。インストールする依存パッケージはありません。

## 生成されるもの

`npm run build` は `vault/videos/*.md` を読み、公開日の新しい順に並べて

- `index.html` の `<!-- build:videos:start -->` 〜 `<!-- build:videos:end -->` の間に動画一覧を書き出し
- `videos/<タイトル>.html` に動画ごとのページを作り直し
- `vault/assets/` の添付ファイルを `assets/` へコピーします

`index.html` の一覧部分と `videos/` 以下は毎回上書きされるので、直接編集せずノート側を直してください。

ノートのフロントマター（`title` / `date` / `summary` / `thumbnail` / `youtube` / `tags` / `draft`）と、対応している Markdown 記法については [vault/README.md](vault/README.md) にまとめています。
