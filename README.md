# みそしる山田

「おさかなvlog」— 魚との暮らしや料理を紹介する動画日記サイトです。

## サイト

- `index.html` — トップページ
- `style.css` — スタイル

ブラウザで `index.html` を開けばそのまま表示できます。

## Obsidian 連携

Claude Code と Obsidian vault をつないでいます。設定は 1 コマンドです。

```bash
node .claude/tools/obsidian.mjs setup --vault ~/Documents/MyVault
node .claude/tools/obsidian.mjs doctor    # 点検
```

- **自動記録** — チャットの内容がセッションごとのノートに書き残される
- **読み書き** — Claude が vault を検索して答え、頼めばノートを作成・追記する

詳しくは [docs/obsidian.md](docs/obsidian.md) を参照してください。
