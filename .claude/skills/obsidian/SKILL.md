---
name: obsidian
description: Obsidian vault の知識を検索・参照したり、メモやノートを書き込んだりする。「Obsidianに記録して/メモして」「ノートを作って」「デイリーノートに書いて」「vaultから探して」「前に書いたメモ」「自分のメモにあったはず」など、ユーザー個人の蓄積された知識に触れる場面で使う。プロジェクトのコードではなくユーザーの知識ベースが対象。
---

# Obsidian vault の読み書き

`.claude/tools/obsidian.mjs` を Bash から呼んで vault を操作する。
呼び出しは必ずこの形（権限設定がこの表記に一致している）:

```bash
node "$CLAUDE_PROJECT_DIR/.claude/tools/obsidian.mjs" <コマンド> [引数]
```

`OBSIDIAN_VAULT` が未設定ならツールは vault のパスが必要だと答えて終了する。
その場合はユーザーに `docs/obsidian-log.md` の設定手順を案内すること。

## 知識を呼び出す

| やりたいこと | コマンド |
| --- | --- |
| 全文検索（該当行つき） | `search <語> [--tag t] [--limit n]` |
| ノートを読む | `read <ノート>` |
| 最近のノート一覧 | `list [パス接頭辞] [--limit n]` |
| 関連ノートを辿る | `links <ノート>` |
| タグ一覧 | `tags` |

検索語は複数書ける（AND 条件）。ノートはパス・ファイル名・部分一致の順で解決する。

## 書き込む

本文は標準入力から渡す。

```bash
echo "本文" | node "$CLAUDE_PROJECT_DIR/.claude/tools/obsidian.mjs" new "タイトル" --folder Notes --tags 飼育,メモ
echo "本文" | node "$CLAUDE_PROJECT_DIR/.claude/tools/obsidian.mjs" append <ノート> --heading 見出し
echo "本文" | node "$CLAUDE_PROJECT_DIR/.claude/tools/obsidian.mjs" daily --heading 作業ログ
```

- `new` は frontmatter（`created`、指定があれば `tags`）と `# タイトル` を付けて作る。既存なら失敗する（`--force` で上書き）。
- `append` は既存ノートの末尾に足す。
- `daily` は今日の日付のノートに足す（なければ作る）。

## 使い方の指針

- **知識の呼び出しを先に**。ユーザーが過去のメモや自分の知識に言及したら、推測で答えずまず `search` する。
  「前に調べた」「メモした気がする」「うちのやり方」などは検索の合図。
- **答える前に出典を示す**。vault の内容を使って答えたときは、どのノートから引いたかを `Notes/水槽の立ち上げ.md`
  のように示す。ノートに書かれていないことは、書かれていないと言う。
- **書き込みは頼まれたときだけ**。会話の自動記録は別のフックが担当している（`docs/obsidian-log.md`）。
  このツールで書くのは、ユーザーが記録・メモ・ノート作成を求めたときに限る。
- **新規作成より追記を優先**。同じ話題のノートが既にあるなら `search` で見つけて `append` する。
  ノートが乱立すると知識ベースとして使いにくくなる。
- **リンクを張る**。関連するノートがあれば本文に `[[ノート名]]` を入れて辿れるようにする。
- 書いたあとは、どのノートにどう書いたかを 1 行で報告する。
