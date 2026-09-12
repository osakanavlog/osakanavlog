#!/usr/bin/env node
// 送信されたプロンプトに関連する vault のノートを探し、会話に差し込む。
//
// 記録（会話 → vault）の逆方向。蓄積した知識が、こちらから探しにいかなくても
// 会話に戻ってくるようにするための仕組み。
//
// 環境変数
//   OBSIDIAN_RECALL          off にすると無効
//   OBSIDIAN_RECALL_EXCLUDE  除外するフォルダ（カンマ区切り。既定は会話ログのフォルダ）
//   OBSIDIAN_RECALL_LIMIT    差し込むノート数（既定: 3）
//
// 失敗してもセッションを止めないよう、常に終了コード 0 で終わる。

import { readFileSync } from 'node:fs';
import { resolveVault } from '../tools/obsidian-vault.mjs';
import { rank } from '../tools/obsidian-search.mjs';

const MAX_CHARS = 1500; // 会話に差し込む量の上限

try {
  if ((process.env.OBSIDIAN_RECALL || '').toLowerCase() === 'off') process.exit(0);

  let payload = {};
  try {
    payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    process.exit(0);
  }

  const prompt = String(payload.prompt || '').trim();
  if (prompt.length < 4) process.exit(0);

  const found = resolveVault();
  if (!found || !found.exists) process.exit(0);

  // 会話ログは除外する。除外しないと、自分が書いたログを自分で読み返すだけになる。
  const logFolder = process.env.OBSIDIAN_CLAUDE_FOLDER || 'Claude';
  const exclude = [
    logFolder,
    ...(process.env.OBSIDIAN_RECALL_EXCLUDE || '').split(',').map((s) => s.trim()).filter(Boolean),
  ];

  const limit = Number(process.env.OBSIDIAN_RECALL_LIMIT) || 3;
  const { results } = rank(found.path, prompt, { exclude, limit });
  if (!results.length) process.exit(0);

  const blocks = [];
  let used = 0;
  for (const note of results) {
    const block = `## ${note.rel}\n${note.excerpts.map((e) => `- ${e}`).join('\n')}`;
    if (used + block.length > MAX_CHARS) break;
    blocks.push(block);
    used += block.length;
  }
  if (!blocks.length) process.exit(0);

  const context = [
    'ユーザーの Obsidian vault に、この質問に関連するノートがありました。',
    '関係がなければ無視してかまいません。内容を使って答えるときは、',
    'どのノートから引いたかを示してください。',
    '',
    ...blocks,
  ].join('\n');

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: context },
    suppressOutput: true,
  }));
} catch {
  // 差し込みに失敗してもセッションは止めない
}

process.exit(0);
