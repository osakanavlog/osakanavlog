# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業する際の手引きです。

## プロジェクト概要

「おさかなvlog」は、魚との暮らしや旬のおさかな料理を紹介する vlog サイトです。
ビルド工程を持たない静的サイトで、`index.html` をブラウザで開けばそのまま表示できます。

| ファイル | 説明 |
| --- | --- |
| `index.html` | トップページ |
| `style.css` | スタイルシート |
| `scripts/check.py` | 静的チェック（標準ライブラリのみ） |

## 守るべき方針

- **標準言語は日本語。** ページの本文、`<title>`、`<meta name="description">`、
  README などの利用者向けの文章はすべて日本語で書き、`<html lang="ja">` を維持すること。
- **依存パッケージを追加しない。** これはこのサイトの売りであり、
  `package.json` や npm / pip のパッケージ、ビルドツールは導入しない。
  ツールが必要な場合は Python の標準ライブラリで書くこと。
- **CSS は `style.css` に集約する。** 色・角丸・最大幅などは `:root` の
  カスタムプロパティ（`--color-primary` など）を使い、値を直接書かない。
- レイアウトはレスポンシブを保つ（動画一覧は CSS Grid の `auto-fill`）。
- 見出しの階層と `aria-label` などのアクセシビリティ属性を崩さない。

## チェックとプレビュー

変更後は必ずチェックを実行すること:

```sh
python3 scripts/check.py
```

検査内容は、HTML タグの対応、`<html lang="ja">` の有無、ページ内リンク（`#id`）の
リンク先の存在、参照しているローカルファイルの存在、CSS の波かっこの対応です。

表示を確認する場合:

```sh
python3 -m http.server
```

ブラウザで <http://localhost:8000> を開きます。

## セッション開始フック

`.claude/hooks/session-start.sh` は Claude Code on the web のセッション開始時に実行され、
`python3` の存在確認と `scripts/check.py` への実行権限付与を行います。
インストールする依存パッケージはありません。
