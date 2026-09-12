# Obsidian 連携

Claude Code と Obsidian vault をつなぐ仕組みです。2 つの部分からできています。

1. **自動記録** — チャットの内容をフックが vault に書き残す（設定すれば勝手に動く）
2. **読み書き** — Claude が vault を検索・参照し、頼まれればノートを書く（CLI とスキル）

接続方法は 2 通りあります。**Obsidian 起動中なら Local REST API プラグイン経由（MCP）**が本筋で、
プラグインを使わない・Obsidian を閉じている場合は vault のファイルを直接読み書きします。

## 設定

### 記録だけなら設定は要りません

vault の場所は自動で見つけます。優先順位は次のとおりです。

1. 環境変数 `OBSIDIAN_VAULT`
2. **Obsidian 自身の設定ファイル**（`obsidian.json`）に登録された vault
   — 開いているもの、次に最近使ったものを選びます
3. よくある置き場所の走査（`.obsidian` を持つフォルダ）

つまり **Obsidian で一度でも vault を開いていれば、何も設定しなくてもチャットの記録が残ります。**
ローカルの Claude Code でこのリポジトリを開き直すだけです。

vault が複数ある場合は上の順で 1 つ選び、`doctor` が他の候補も表示します。
別の vault を使いたいときだけ `OBSIDIAN_VAULT` で指定してください。

### 全プロジェクトで記録する

`.claude/settings.json` のフックは**このリポジトリで作業したときだけ**動きます。
他のプロジェクトでの会話も記録したい場合は、ユーザー設定に登録します。

```bash
node .claude/tools/obsidian.mjs install     # 登録
node .claude/tools/obsidian.mjs uninstall   # 解除
```

install がやること:

- フック本体を `~/.claude/obsidian/` に複製する
  （このリポジトリを移動・削除しても動き続けます）
- `~/.claude/settings.json` にフックを登録する
  （既にある他のフックや設定はそのまま残します）

反映には Claude Code の再起動が必要です。uninstall は自分が登録したフックだけを消し、
他のフックと記録済みのノートは残します。

プロジェクト設定とユーザー設定の両方に登録されていても、同じ内容は二重に記録されません。

### プラグインも使う場合

Local REST API プラグイン経由（MCP）にするときだけ、setup を実行します。
API キーは標準入力から渡します（コマンドライン引数では受け取りません。シェル履歴に残るためです）。

```bash
read -rs OBSIDIAN_API_KEY && export OBSIDIAN_API_KEY
echo "$OBSIDIAN_API_KEY" | node .claude/tools/obsidian.mjs setup
```

`--vault` は省略できます（自動検出）。別の vault を使うときだけ `--vault ~/path/to/Vault` を付けます。

setup がやること:

1. 繋がる接続先を探す（HTTPS 27124 → HTTP 27123 の順）
2. **MCP が確実に通る方を選ぶ** — HTTPS の証明書が自己署名なら HTTP を優先する
3. `.mcp.json` の url を選んだ接続先に更新する
4. `.claude/settings.local.json`（git 管理外）に環境変数を保存する
5. 点検結果を表示する

API キーが保存されるのは `.claude/settings.local.json` だけです。`.mcp.json` には
`${OBSIDIAN_API_KEY}` の形で参照が入るので、リポジトリにキーは入りません。
キーが拒否された場合は保存しません。

### 点検する

```bash
node .claude/tools/obsidian.mjs doctor
```

```
✓ vault      /Users/me/Documents/MyVault（ノート 312 件・obsidian.json）
✓ APIキー    設定済み（末尾 ee86）
✓ 接続       http://127.0.0.1:27123（HTTP 200）
✓ MCP設定    http://127.0.0.1:27123/mcp/
✓ 自動記録   フック 4 件を登録済み
✓ ローカル設定 settings.local.json に env を保存済み

問題ありません。
```

問題があれば、その行と直し方が出ます。うまく動かないときは最初にこれを実行してください。
問題が 1 件以上あると終了コードは 1 になります。

### 手で設定する

`.claude/settings.local.json` に直接書いても同じです。

```json
{
  "env": {
    "OBSIDIAN_VAULT": "~/Documents/MyVault",
    "OBSIDIAN_API_KEY": "（プラグインが発行したキー）",
    "OBSIDIAN_API_URL": "http://127.0.0.1:27123"
  }
}
```

`OBSIDIAN_API_KEY` を設定しなければ、vault のファイルを直接読み書きする動作になります
（Obsidian が閉じていても動きます）。

### `claude mcp add` について

このリポジトリでは不要です。`.mcp.json` が登録を済ませており、そちらは `${VAR}` 展開が
効くのでキーが設定ファイルに残りません。全プロジェクトで使いたい場合だけ user スコープで
追加してください。

```bash
claude mcp add --transport http obsidian http://127.0.0.1:27123/mcp/ \
  -s user --header "Authorization: Bearer $OBSIDIAN_API_KEY"
```

`${VAR}` 展開が効くのは `.mcp.json`（project スコープ）だけなので、local / user スコープでは
キーが `~/.claude.json` に平文で保存されます。

### 証明書について

プラグインの HTTPS は自己署名証明書です。MCP クライアントが拒否する可能性があるため、
setup は HTTP ポートが使えるならそちらを選びます。HTTPS しか使えない環境では、
プラグインからエクスポートした証明書を `NODE_EXTRA_CA_CERTS` に指定してください。

接続できているかは `claude mcp list` でも確認できます。

### 任意の環境変数

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `OBSIDIAN_CLAUDE_FOLDER` | `Claude` | 会話ログの保存先フォルダ |
| `OBSIDIAN_LOG_MAX_CHARS` | `8000` | ログ 1 発言あたりの最大文字数 |
| `OBSIDIAN_DAILY_FOLDER` | vault 直下 | デイリーノートのフォルダ |
| `OBSIDIAN_READ_MAX` | `40000` | `read` で表示する最大文字数 |
| `OBSIDIAN_API_KEY` | なし | 設定すると CLI が REST API 経由になる |
| `OBSIDIAN_API_URL` | `https://127.0.0.1:27124` | REST API の URL |

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

## vault の運用ルール

`.claude/skills/obsidian/SKILL.md` に、Claude が vault を触るときの規約を書いています。

- **外部に原本があるものは持ち込まない** — Google Docs / Spreadsheet / Notion / Backlog などの
  内容をコピーせず、リンク付きカードだけ置く。外部リソースは memory に file ID と URL を記録する。
- **確認なしに既存カードを削除しない**
- **列名・ファイル名は変更しない**
- **Done に移すときは `- [x]` にして完了日を追記**（例: `✅ 2026-05-21`）
- **新しいカードは原則、最初の列の末尾に追加**

## 共通の注意

- Claude Code on the web などクラウド実行のセッションは、手元の vault にも `127.0.0.1` にも
  届きません。この仕組みはローカルで動かす Claude Code 向けです。
- `node` が必要です（Claude Code と同じ環境に入っていれば十分）。
- `.obsidian` や `.trash` などのフォルダは検索対象から外しています。

## 止めたいとき

`OBSIDIAN_VAULT` を外すと自動記録も読み書きも動かなくなります。自動記録だけ止めるなら
`.claude/settings.json` の `hooks` を削除してください。登録内容は `/hooks` でも確認できます。
