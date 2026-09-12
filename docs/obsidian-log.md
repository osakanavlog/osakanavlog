# Claude のチャットを Obsidian に記録する

Claude Code とのやり取りを、Obsidian vault の Markdown ノートとして自動で書き残します。
セッション 1 本につきノート 1 枚で、質問と回答が時刻つきで追記されていきます。

## 仕組み

`.claude/settings.json` に登録した 4 つのフックが `.claude/hooks/obsidian-logger.mjs` を呼びます。

| フック | タイミング | 記録される内容 |
| --- | --- | --- |
| `SessionStart` | セッション開始 | ノートを作成（frontmatter と見出し） |
| `UserPromptSubmit` | プロンプト送信 | 自分の発言（`## 👤 HH:MM`） |
| `Stop` | Claude の応答終了 | Claude の発言（`## 🤖 HH:MM`） |
| `SessionEnd` | セッション終了 | 終了時刻 |

## 設定

`OBSIDIAN_VAULT` に vault のルートパスを渡すだけです。未設定・存在しないパスのときは
フックは何もせずに終了するので、設定しなければ記録は始まりません。

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
| `OBSIDIAN_CLAUDE_FOLDER` | `Claude` | vault 内の保存先フォルダ |
| `OBSIDIAN_LOG_MAX_CHARS` | `8000` | 1 発言あたりの最大文字数。超えた分は省略 |

## 出力されるノート

`<vault>/Claude/2026-09-12-1037-sess_abc.md`

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

## 仕様と制限

- 記録されるのは本文テキストだけです。ツールの実行内容やサブエージェント（`isSidechain`）の
  やり取りは含めていません。
- 書き込みに失敗してもフックは常に終了コード 0 で終わるので、セッションは止まりません。
- ノートはセッション ID（先頭 8 文字）で紐づけます。フックを途中で有効にした場合は、
  その時点からのやり取りが新しいノートに記録されます。
- Claude Code on the web などクラウド実行のセッションは、手元の vault に書き込めません。
  この仕組みはローカルで動かす Claude Code 向けです。
- `node` が必要です（Claude Code と同じ環境に入っていれば十分）。

## 止めたいとき

`OBSIDIAN_VAULT` を外すと記録されなくなります。フックごと消す場合は
`.claude/settings.json` の `hooks` を削除してください。登録内容は `/hooks` でも確認できます。
