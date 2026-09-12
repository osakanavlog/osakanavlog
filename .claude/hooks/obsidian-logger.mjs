#!/usr/bin/env node
// Claude Code とのチャット内容を Obsidian vault に Markdown として記録するフック。
//
// 環境変数
//   OBSIDIAN_VAULT         vault のルートパス
//                          未設定なら Obsidian の設定から自動検出する
//   OBSIDIAN_CLAUDE_FOLDER vault 内の保存先フォルダ（既定: Claude）
//   OBSIDIAN_LOG_MAX_CHARS 1 発言あたりの最大文字数（既定: 8000）
//
// 引数にフックイベント名を受け取る（例: UserPromptSubmit）。
// 記録に失敗してもセッションを止めないよう、常に終了コード 0 で終わる。

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveVault } from '../tools/obsidian-vault.mjs';

const MAX_CHARS = Number(process.env.OBSIDIAN_LOG_MAX_CHARS) || 8000;

const pad = (n) => String(n).padStart(2, '0');

function stamp(d) {
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    compact: `${pad(d.getHours())}${pad(d.getMinutes())}`,
  };
}

function truncate(text) {
  if (text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS)}\n\n> [!note] 長いため ${MAX_CHARS} 文字で省略しました。`;
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

// セッション ID ごとに 1 ノート。既存ノートはファイル名の末尾で探す。
function noteFor(dir, sessionId, now) {
  const sid = String(sessionId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 8) || 'unknown';
  const suffix = `-${sid}.md`;

  if (existsSync(dir)) {
    const found = readdirSync(dir).find((f) => f.endsWith(suffix));
    if (found) return join(dir, found);
  } else {
    mkdirSync(dir, { recursive: true });
  }

  const s = stamp(now);
  const note = join(dir, `${s.date}-${s.compact}-${sid}.md`);
  const project = (process.env.CLAUDE_PROJECT_DIR || process.cwd()).split(/[\\/]/).pop();
  writeFileSync(
    note,
    [
      '---',
      `created: ${s.date} ${s.time}`,
      `session_id: ${sessionId || 'unknown'}`,
      `project: ${JSON.stringify(project)}`, // ディレクトリ名に : や " が入っても YAML が壊れないように
      'tags:',
      '  - claude-code',
      '---',
      '',
      `# Claude ${s.date} ${s.time} — ${project}`,
      '',
      `[[${s.date}]]`,
      '',
    ].join('\n'),
    'utf8',
  );
  return note;
}

// 直近のアシスタント発言（最後のユーザー発言より後ろ）をトランスクリプトから取り出す。
function lastAssistantText(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return '';

  const lines = readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
  const chunks = [];

  for (let i = lines.length - 1; i >= 0; i--) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (entry.isSidechain) continue; // サブエージェントの会話は記録しない

    // ツールの実行結果も type:"user" で記録される。これはターンの区切りではないので、
    // 実際のユーザー発言だけで遡上を止める（止めないと本文の前半が欠ける）。
    if (entry.type === 'user') {
      const content = entry.message?.content;
      const isToolResult = Array.isArray(content) && content.some((b) => b?.type === 'tool_result');
      if (!isToolResult) break;
      continue;
    }
    if (entry.type !== 'assistant') continue;

    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;
    const text = content
      .filter((block) => block?.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('\n')
      .trim();
    if (text) chunks.unshift(text);
  }

  return chunks.join('\n\n');
}

try {
  // OBSIDIAN_VAULT がなくても、Obsidian の設定から vault を見つける
  const found = resolveVault();
  if (!found || !found.exists) process.exit(0);
  const vault = found.path;

  let payload = {};
  try {
    payload = JSON.parse(readStdin() || '{}');
  } catch {
    payload = {};
  }

  const event = process.argv[2] || payload.hook_event_name || '';
  if (!payload.session_id) process.exit(0); // セッションが特定できないときは記録しない

  const now = new Date();
  const s = stamp(now);
  const dir = join(vault, process.env.OBSIDIAN_CLAUDE_FOLDER || 'Claude');
  const note = noteFor(dir, payload.session_id, now);
  const append = (body) => appendFileSync(note, body, 'utf8');

  if (event === 'UserPromptSubmit') {
    const prompt = String(payload.prompt || '').trim();
    if (prompt) append(`\n## 👤 ${s.time}\n\n${truncate(prompt)}\n`);
  } else if (event === 'Stop') {
    const answer = lastAssistantText(payload.transcript_path);
    if (answer) append(`\n## 🤖 ${s.time}\n\n${truncate(answer)}\n`);
  } else if (event === 'SessionEnd') {
    append(`\n---\n\nセッション終了: ${s.date} ${s.time}\n`);
  }
  // SessionStart はノートを作るだけ（noteFor で済んでいる）
} catch {
  // 記録の失敗でセッションを止めない
}

process.exit(0);
