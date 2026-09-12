# Obsidian 連携

Claude Code と Obsidian vault をつなぐ仕組みです。2 つの部分からできています。

1. **自動記録** — チャットの内容をフックが vault に書き残す（設定すれば勝手に動く）
2. **読み書き** — Claude が vault を検索・参照し、頼まれればノートを書く（CLI とスキル）

## 設定

どちらも `OBSIDIAN_VAULT` に vault のルートパスを渡すだけで有効になります。
未設定なら自動記録は何もせず、読み書きツールはパスが必要だと答えて終了します。

`.claude/settings.local.json`（gitignore 済み・個人用）に書く方法：

```json
{
  "env": {
    "OBSIDIAN_VAULT": "~/Documents/MyVault"
  }
}
```

反映されない場合は、シェルの環境変数として渡してください。

```bash
export OBSIDIAN_VAULT="$HOME/Documents/MyVault"
```

### 任意の環境変数

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `OBSIDIAN_CLAUDE_FOLDER` | `Claude` | 会話ログの保存先フォルダ |
| `OBSIDIAN_LOG_MAX_CHARS` | `8000` | ログ 1 発言あたりの最大文字数 |
| `OBSIDIAN_DAILY_FOLDER` | vault 直下 | デイリーノートのフォルダ |
| `OBSIDIAN_READ_MAX` | `40000` | `read` で表示する最大文字数 |

---

## 1. 自動記録（フック）

`.claude/settings.json` に登録した 4 つのフックが `.claude/hooks/obsidian-logger.mjs` を呼びます。
セッション 1 本につきノート 1 枚で、質問と回答が時刻つきで追記されていきます。

| フック | タイミング | 記録される内容 |
| --- | --- | --- |
| `SessionStart` | セッション開始 | ノートを作成（frontmatter と見出し） |
| `UserPromptSubmit` | プロンプト送信 | 自分の発言（`## 👤 HH:MM`） |
| `Stop` | Claude の応答終了 | Claude の発言（`## 🤖 HH:MM`） |
| `SessionEnd` | セッション終了 | 終了時刻 |

出力されるノート（`<vault>/Claude/2026-09-12-1037-sess_abc.md`）:

```markdown
---
created: 2026-09-12 10:37
session_id: sess_abcdef123456
project: osakanavlog
tags:
  - claude-code
---

# Claude 2026-09-12 10:37 — osakanavlog

[[2026-09-12]]

## 👤 10:37

水槽の記事を追加して

## 🤖 10:37

index.html に記事カードを追加しました。
```

冒頭の `[[2026-09-12]]` はデイリーノートへのリンクです。`tags: claude-code` と
`session_id` が入っているので、Dataview や検索でまとめて辿れます。

### 仕様と制限

- 記録されるのは本文テキストだけです。ツールの実行内容やサブエージェント（`isSidechain`）の
  やり取りは含めていません。
- 書き込みに失敗してもフックは常に終了コード 0 で終わるので、セッションは止まりません。
- ノートはセッション ID（先頭 8 文字）で紐づけます。フックを途中で有効にした場合は、
  その時点からのやり取りが新しいノートに記録されます。

---

## 2. 読み書き（CLI とスキル）

`.claude/tools/obsidian.mjs` が vault を操作する CLI で、`.claude/skills/obsidian/SKILL.md` が
Claude に使いどころを教えるスキルです。「前にメモしたはず」「Obsidian に記録して」のような
場面で Claude がこのツールを使います。

```bash
node .claude/tools/obsidian.mjs <コマンド> [引数]
```

### 知識の呼び出し

| コマンド | 説明 |
| --- | --- |
| `search <語> [--tag t] [--limit n]` | 全文検索。語は複数指定で AND。該当行つきで返す |
| `read <ノート>` | ノートを読む |
| `list [パス接頭辞] [--limit n]` | 更新が新しい順に一覧 |
| `links <ノート>` | 発リンクと被リンク（バックリンク） |
| `tags [--limit n]` | タグを使用数つきで一覧 |

ノートはパス・ファイル名・部分一致の順で解決します。候補が複数あるときは一覧を出して止まります。

### 書き込み

本文は標準入力から渡します。

```bash
echo "本文" | node .claude/tools/obsidian.mjs new "タイトル" --folder Notes --tags 飼育,メモ
echo "本文" | node .claude/tools/obsidian.mjs append 海水魚メモ --heading 比重
echo "本文" | node .claude/tools/obsidian.mjs daily --heading 作業ログ
```

- `new` は frontmatter と `# タイトル` を付けて作成。既存なら失敗します（`--force` で上書き）。
- `append` は既存ノートの末尾に追記。
- `daily` は今日の日付のノートに追記（なければ作成）。

### 権限

読み取り側（`search` / `read` / `list` / `links` / `tags`）は `.claude/settings.json` で
許可済みなので確認なしに動きます。書き込み側（`new` / `append` / `daily`）は毎回確認が出ます
— 個人の vault を書き換える操作なので、意図的にそうしています。

確認を省きたい場合は `.claude/settings.local.json` に追加してください。

```json
{
  "permissions": {
    "allow": ["Bash(node \"$CLAUDE_PROJECT_DIR/.claude/tools/obsidian.mjs\" append:*)"]
  }
}
```

---

## 共通の注意

- Claude Code on the web などクラウド実行のセッションは、手元の vault に触れません。
  この仕組みはローカルで動かす Claude Code 向けです。
- `node` が必要です（Claude Code と同じ環境に入っていれば十分）。
- `.obsidian` や `.trash` などのフォルダは検索対象から外しています。

## 止めたいとき

`OBSIDIAN_VAULT` を外すと自動記録も読み書きも動かなくなります。自動記録だけ止めるなら
`.claude/settings.json` の `hooks` を削除してください。登録内容は `/hooks` でも確認できます。
