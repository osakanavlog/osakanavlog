# みそしる山田

「おさかなvlog」— 魚との暮らしや料理を紹介する動画日記サイトです。

## サイト

- `index.html` — トップページ
- `style.css` — スタイル

ブラウザで `index.html` を開けばそのまま表示できます。

## Obsidian 連携

Claude Code と Obsidian vault をつないでいます。**チャットの記録は設定不要**で、
Obsidian で一度でも vault を開いていれば自動で見つけて書き残します。

```bash
node .claude/tools/obsidian.mjs doctor    # 状態を点検
node .claude/tools/obsidian.mjs install   # 全プロジェクトの会話を記録する
node .claude/tools/obsidian.mjs setup     # プラグイン(MCP)も使う場合
```

このリポジトリでの会話は設定なしで記録されます。他のプロジェクトでも記録するには
`install` を実行してください。

- **自動記録** — チャットの内容がセッションごとのノートに書き残される
- **読み書き** — Claude が vault を検索して答え、頼めばノートを作成・追記する

詳しくは [docs/obsidian.md](docs/obsidian.md) を参照してください。
