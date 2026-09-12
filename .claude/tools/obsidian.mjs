#!/usr/bin/env node
// Obsidian vault を検索・読み書きするための CLI。Claude Code から Bash で呼ぶ。
//
//   node .claude/tools/obsidian.mjs <コマンド> [引数]
//
// 2 つの動かし方がある。
//   ファイル直読み  OBSIDIAN_VAULT だけ設定。Obsidian が閉じていても動く。全コマンド対応
//   REST API 経由   OBSIDIAN_API_KEY も設定。Obsidian 起動中の vault を Local REST API で操作
//                   （links / tags は vault 全体の走査が要るので常にファイル直読み）
//
// 環境変数
//   OBSIDIAN_VAULT         vault のルートパス
//   OBSIDIAN_API_KEY       Local REST API プラグインの API キー（設定すると REST 経由になる）
//   OBSIDIAN_API_URL       REST API の URL（既定: https://127.0.0.1:27124）
//   OBSIDIAN_DAILY_FOLDER  デイリーノートのフォルダ（既定: vault 直下、ファイル直読み時のみ）
//   OBSIDIAN_READ_MAX      read で表示する最大文字数（既定: 40000）

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { resolveVault } from './obsidian-vault.mjs';

const SKIP_DIRS = new Set(['.obsidian', '.trash', '.git', '.smart-env', 'node_modules']);
const READ_MAX = Number(process.env.OBSIDIAN_READ_MAX) || 40000;

function die(message) {
  console.error(message);
  process.exit(1);
}

function vaultRoot() {
  const found = resolveVault();
  if (!found) {
    die('vault が見つかりません。Obsidian で vault を開いたことがあるか確認するか、'
      + 'OBSIDIAN_VAULT にパスを設定してください。');
  }
  if (!found.exists) die(`vault が見つかりません: ${found.path}`);
  return found.path;
}

// vault 内の .md をすべて列挙する（更新が新しい順）。
function allNotes(root) {
  const notes = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) notes.push({ path: full, rel: relative(root, full), mtime: statSync(full).mtimeMs });
    }
  };
  walk(root);
  return notes.sort((a, b) => b.mtime - a.mtime);
}

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, inline] = arg.slice(2).split('=');
      if (inline !== undefined) flags[key] = inline;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[key] = argv[++i];
      else flags[key] = true;
    } else positional.push(arg);
  }
  return { flags, positional };
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function fmtDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// パス・ファイル名・部分一致の順でノートを 1 枚に絞り込む。
function resolveNote(root, query) {
  if (!query) die('ノートを指定してください。');
  for (const candidate of [query, `${query}.md`]) {
    const full = join(root, candidate);
    if (existsSync(full) && statSync(full).isFile()) return { path: full, rel: relative(root, full) };
  }
  const notes = allNotes(root);
  const needle = query.toLowerCase().replace(/\.md$/, '');
  const byName = notes.filter((n) => basename(n.rel, '.md').toLowerCase() === needle);
  const hits = byName.length ? byName : notes.filter((n) => n.rel.toLowerCase().includes(needle));
  if (hits.length === 0) die(`ノートが見つかりません: ${query}`);
  if (hits.length > 1 && byName.length !== 1) {
    console.error(`候補が複数あります。パスを指定してください:\n${hits.slice(0, 10).map((n) => `  ${n.rel}`).join('\n')}`);
    process.exit(1);
  }
  return hits[0];
}

function frontmatterTags(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];
  const block = match[1];
  const inline = block.match(/^tags:\s*\[(.+)\]\s*$/m);
  if (inline) return inline[1].split(',').map((t) => t.trim().replace(/['"]/g, '')).filter(Boolean);
  const listStart = block.match(/^tags:\s*$/m);
  if (!listStart) return [];
  const after = block.slice(block.indexOf(listStart[0]) + listStart[0].length);
  const tags = [];
  for (const line of after.split('\n').slice(1)) {
    const item = line.match(/^\s+-\s+(.+?)\s*$/);
    if (!item) break;
    tags.push(item[1].replace(/['"]/g, ''));
  }
  return tags;
}

function noteTags(text) {
  const inline = [...text.matchAll(/(^|\s)#([\p{L}\p{N}_/-]+)/gu)].map((m) => m[2]);
  return [...new Set([...frontmatterTags(text), ...inline])];
}

const commands = {
  // 全文検索。すべての語を含むノートを、該当行つきで返す。
  search(root, { flags, positional }) {
    const terms = positional.map((t) => t.toLowerCase()).filter(Boolean);
    if (!terms.length) die('検索語を指定してください。');
    const limit = Number(flags.limit) || 20;
    const wantTag = flags.tag ? String(flags.tag).replace(/^#/, '').toLowerCase() : null;

    const results = [];
    for (const note of allNotes(root)) {
      const text = readFileSync(note.path, 'utf8');
      const haystack = `${note.rel}\n${text}`.toLowerCase();
      if (!terms.every((t) => haystack.includes(t))) continue;
      if (wantTag && !noteTags(text).some((t) => t.toLowerCase() === wantTag)) continue;

      const lines = text.split('\n');
      const hits = [];
      for (let i = 0; i < lines.length && hits.length < 3; i++) {
        if (terms.some((t) => lines[i].toLowerCase().includes(t))) {
          hits.push(`    ${i + 1}: ${lines[i].trim().slice(0, 200)}`);
        }
      }
      results.push(`  ${note.rel}\n${hits.join('\n') || '    (ファイル名が一致)'}`);
      if (results.length >= limit) break;
    }

    if (!results.length) return console.log('該当なし');
    console.log(`${results.length} 件:\n${results.join('\n')}`);
  },

  // ノートを読む。
  read(root, { positional }) {
    const note = resolveNote(root, positional[0]);
    const text = readFileSync(note.path, 'utf8');
    console.log(`# ${note.rel}\n`);
    console.log(text.length > READ_MAX ? `${text.slice(0, READ_MAX)}\n\n[...${text.length - READ_MAX} 文字省略]` : text);
  },

  // ノート一覧（更新が新しい順）。
  list(root, { flags, positional }) {
    const limit = Number(flags.limit) || 30;
    const prefix = positional[0] ? positional[0].toLowerCase() : null;
    const notes = allNotes(root).filter((n) => !prefix || n.rel.toLowerCase().startsWith(prefix));
    if (!notes.length) return console.log('ノートがありません');
    console.log(notes.slice(0, limit).map((n) => `  ${fmtDate(new Date(n.mtime))}  ${n.rel}`).join('\n'));
    if (notes.length > limit) console.log(`  ... 他 ${notes.length - limit} 件`);
  },

  // 新しいノートを作る。本文は標準入力から。
  new: (root, { flags, positional }) => {
    const title = positional.join(' ').trim();
    if (!title) die('タイトルを指定してください。');
    const safe = title.replace(/[\\/:*?"<>|]/g, '-');
    const folder = flags.folder ? String(flags.folder) : '';
    const path = join(root, folder, `${safe}.md`);
    if (existsSync(path) && !flags.force) die(`すでに存在します: ${relative(root, path)}（上書きは --force）`);

    const tags = flags.tags ? String(flags.tags).split(',').map((t) => t.trim()).filter(Boolean) : [];
    const body = readStdin().trim();
    const frontmatter = ['---', `created: ${fmtDate()}`, ...(tags.length ? ['tags:', ...tags.map((t) => `  - ${t}`)] : []), '---'];

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${frontmatter.join('\n')}\n\n# ${title}\n\n${body}\n`, 'utf8');
    console.log(`作成: ${relative(root, path)}`);
  },

  // 既存ノートの末尾に追記。本文は標準入力から。
  append(root, { flags, positional }) {
    const note = resolveNote(root, positional[0]);
    const body = readStdin().trim();
    if (!body) die('追記する内容を標準入力から渡してください。');
    const heading = flags.heading ? `\n## ${flags.heading}\n` : '';
    appendFileSync(note.path, `\n${heading}\n${body}\n`, 'utf8');
    console.log(`追記: ${note.rel}`);
  },

  // 今日のデイリーノートに追記（なければ作成）。
  daily(root, { flags }) {
    const date = fmtDate();
    const folder = process.env.OBSIDIAN_DAILY_FOLDER || '';
    const path = join(root, folder, `${date}.md`);
    const body = readStdin().trim();
    if (!body) die('追記する内容を標準入力から渡してください。');

    mkdirSync(dirname(path), { recursive: true });
    if (!existsSync(path)) writeFileSync(path, `---\ncreated: ${date}\n---\n\n# ${date}\n`, 'utf8');
    const heading = flags.heading ? `\n## ${flags.heading}\n` : '';
    appendFileSync(path, `\n${heading}\n${body}\n`, 'utf8');
    console.log(`追記: ${relative(root, path)}`);
  },

  // 発リンクと被リンク（バックリンク）を出す。
  links(root, { positional }) {
    const note = resolveNote(root, positional[0]);
    const text = readFileSync(note.path, 'utf8');
    const outgoing = [...new Set([...text.matchAll(/\[\[([^\]|#]+)/g)].map((m) => m[1].trim()))];

    const name = basename(note.rel, '.md').toLowerCase();
    const backlinks = allNotes(root)
      .filter((n) => n.path !== note.path)
      .filter((n) => [...readFileSync(n.path, 'utf8').matchAll(/\[\[([^\]|#]+)/g)]
        .some((m) => m[1].trim().toLowerCase().split('/').pop() === name))
      .map((n) => n.rel);

    console.log(`# ${note.rel}`);
    console.log(`\n発リンク (${outgoing.length}):\n${outgoing.map((l) => `  [[${l}]]`).join('\n') || '  なし'}`);
    console.log(`\n被リンク (${backlinks.length}):\n${backlinks.map((l) => `  ${l}`).join('\n') || '  なし'}`);
  },

  // vault 内のタグを使用数つきで出す。
  tags(root, { flags }) {
    const counts = new Map();
    for (const note of allNotes(root)) {
      for (const tag of noteTags(readFileSync(note.path, 'utf8'))) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    if (!counts.size) return console.log('タグがありません');
    const limit = Number(flags.limit) || 50;
    console.log([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
      .map(([tag, count]) => `  #${tag}  (${count})`).join('\n'));
  },
};

const [command, ...argv] = process.argv.slice(2);
const META_COMMANDS = new Set(['doctor', 'setup']);
if (!command || command === 'help' || (!commands[command] && !META_COMMANDS.has(command))) {
  console.log(`使い方: node .claude/tools/obsidian.mjs <コマンド>

  search <語> [--tag t] [--limit n]   全文検索（該当行つき）
  read <ノート>                        ノートを読む
  list [パス接頭辞] [--limit n]        更新が新しい順に一覧
  new <タイトル> [--folder f] [--tags a,b] [--force]
                                       新規ノート作成（本文は標準入力）
  append <ノート> [--heading 見出し]   末尾に追記（本文は標準入力）
  daily [--heading 見出し]             今日のデイリーノートに追記
  links <ノート>                       発リンクと被リンク
  tags [--limit n]                     タグ一覧

  doctor                               設定と接続を点検して直し方を出す
  setup --vault <パス>                 繋がる接続先を探して設定を書く
                                       （API キーは標準入力か OBSIDIAN_API_KEY から）

OBSIDIAN_VAULT に vault のパスが必要です。OBSIDIAN_API_KEY も設定すると
Local REST API 経由になります（links / tags は常にファイル直読み）。`);
  process.exit(command && command !== 'help' ? 1 : 0);
}

// OBSIDIAN_API_KEY があれば Local REST API 経由（Obsidian 起動中の vault を直接操作）。
// links / tags は vault 全体の走査が要るので、常にファイルを直接読む。
const args_ = parseArgs(argv);
if (META_COMMANDS.has(command)) {
  const setupModule = await import('./obsidian-setup.mjs');
  if (command === 'doctor') process.exit((await setupModule.doctor()) > 0 ? 1 : 0);
  await setupModule.setup(args_, readStdin());
  process.exit(0);
}

const REST_COMMANDS = new Set(['search', 'read', 'list', 'new', 'append', 'daily']);
const STDIN_COMMANDS = new Set(['new', 'append', 'daily']);
const args = args_;

if (process.env.OBSIDIAN_API_KEY && REST_COMMANDS.has(command)) {
  const { rest } = await import('./obsidian-rest.mjs');
  try {
    await rest[command](args, STDIN_COMMANDS.has(command) ? readStdin() : '');
  } catch (error) {
    die(error.message);
  }
} else {
  if (process.env.OBSIDIAN_API_KEY && !process.env.OBSIDIAN_VAULT) {
    die(`${command} は vault のファイルを直接読む必要があります。OBSIDIAN_VAULT にパスも設定してください。`);
  }
  commands[command](vaultRoot(), args);
}
