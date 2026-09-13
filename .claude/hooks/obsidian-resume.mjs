#!/usr/bin/env node
// セッション開始時に、同じプロジェクトの前回までのやり取りを会話に差し込む。
//
// 記録はセッションごとに独立したノートに残るが、それだけでは次のセッションが
// 白紙から始まる。直前の結論を持ち込むことで、続きから始められるようにする。
//
// 環境変数
//   OBSIDIAN_RESUME        off にすると無効
//   OBSIDIAN_RESUME_LIMIT  遡るセッション数（既定: 2）
//
// 失敗してもセッションを止めないよう、常に終了コード 0 で終わる。

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveVault } from '../tools/obsidian-vault.mjs';

const MAX_CHARS = 1200; // 会話に差し込む量の上限
const MAX_ANSWER = 400; // 1 セッションあたりの回答の引用量

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.+)$/);
    if (kv) fields[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return fields;
}

// ノートの中の最後の 👤 / 🤖 ブロックを取り出す。
function lastExchange(text) {
  const body = text.replace(/^---\n[\s\S]*?\n---/, '');
  const blocks = body.split(/\n## /).slice(1);
  let question = '';
  let answer = '';

  for (const block of blocks) {
    const content = block.replace(/^[^\n]*\n/, '').trim();
    if (!content) continue;
    if (block.startsWith('👤')) {
      question = content;
      answer = ''; // 新しい質問が来たら、それ以前の回答は捨てる
    } else if (block.startsWith('🤖')) {
      answer = content;
    }
  }
  return { question, answer };
}

try {
  if ((process.env.OBSIDIAN_RESUME || '').toLowerCase() === 'off') process.exit(0);

  let payload = {};
  try {
    payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    process.exit(0);
  }

  const found = resolveVault();
  if (!found || !found.exists) process.exit(0);

  const dir = join(found.path, process.env.OBSIDIAN_CLAUDE_FOLDER || 'Claude');
  if (!existsSync(dir)) process.exit(0);

  const project = (process.env.CLAUDE_PROJECT_DIR || process.cwd()).split(/[\\/]/).pop();
  const limit = Number(process.env.OBSIDIAN_RESUME_LIMIT) || 2;

  const notes = readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const path = join(dir, name);
      return { path, mtime: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 30); // 直近のノートだけ見る

  const sessions = [];
  for (const note of notes) {
    if (sessions.length >= limit) break;
    let text;
    try {
      text = readFileSync(note.path, 'utf8');
    } catch {
      continue;
    }
    const fields = frontmatter(text);
    if (fields.project !== project) continue;
    if (fields.session_id && fields.session_id === payload.session_id) continue; // 今のセッション

    const { question, answer } = lastExchange(text);
    if (!question && !answer) continue;
    sessions.push({ created: fields.created || '', question, answer });
  }

  if (!sessions.length) process.exit(0);

  const blocks = [];
  let used = 0;
  for (const session of sessions) {
    const block = [
      `## ${session.created}`,
      session.question ? `依頼: ${session.question.split('\n')[0].slice(0, 200)}` : '',
      session.answer ? `結果: ${session.answer.slice(0, MAX_ANSWER)}` : '',
    ].filter(Boolean).join('\n');
    if (used + block.length > MAX_CHARS) break;
    blocks.push(block);
    used += block.length;
  }
  if (!blocks.length) process.exit(0);

  const context = [
    `このプロジェクト（${project}）での前回までのやり取りです。`,
    '続きから始められるよう参考にしてください。既に終わった作業を繰り返さないこと。',
    '内容が古い可能性があるので、実際のファイルで確かめてから動くこと。',
    '',
    ...blocks,
  ].join('\n');

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
    suppressOutput: true,
  }));
} catch {
  // 差し込みに失敗してもセッションは止めない
}

process.exit(0);
