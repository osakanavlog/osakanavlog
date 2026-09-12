// vault の中から、ある文章に関連するノートを関連度順に探す。
//
// 素の部分一致検索と違い、複数の語がどれだけ一致するかで順位を付ける。
// 会話への自動注入（obsidian-recall フック）と recall コマンドが共有する。

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const SKIP_DIRS = new Set(['.obsidian', '.trash', '.git', '.smart-env', 'node_modules']);
const MAX_NOTES = 2000; // 走査するノート数の上限（大きい vault で重くならないように）
const MAX_BYTES = 200 * 1024; // 1 ファイルの読み込み上限

// 単独では手がかりにならない語。日本語は助詞などが語に混ざりやすいので広めに落とす。
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'you', 'are', 'was', 'his', 'her',
  'から', 'まで', 'こと', 'もの', 'これ', 'それ', 'あれ', 'ここ', 'そこ', 'ため',
  'よう', 'とき', 'ところ', 'ください', 'します', 'です', 'ます', 'して', 'した',
  'teach', 'について', 'どう', 'なに', 'どこ',
]);

// 文章から手がかりになる語を取り出す。
// 日本語は分かち書きされないので、漢字・カタカナの連なりをそのまま語として扱う。
export function tokenize(text) {
  const terms = new Set();

  for (const m of String(text).matchAll(/[A-Za-z][A-Za-z0-9_-]{2,}/g)) {
    const word = m[0].toLowerCase();
    if (!STOP_WORDS.has(word)) terms.add(word);
  }
  for (const m of String(text).matchAll(/[一-鿿々-〇]{2,}/g)) {
    if (!STOP_WORDS.has(m[0])) terms.add(m[0]);
  }
  for (const m of String(text).matchAll(/[゠-ヿｦ-ﾟ]{3,}/g)) {
    if (!STOP_WORDS.has(m[0])) terms.add(m[0]);
  }
  return [...terms];
}

function collectNotes(root, exclude) {
  const notes = [];
  const walk = (dir, depth) => {
    if (depth > 8 || notes.length >= MAX_NOTES) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (notes.length >= MAX_NOTES) return;
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      const rel = relative(root, full);
      if (exclude.some((ex) => rel === ex || rel.startsWith(`${ex}/`))) continue;
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name.endsWith('.md')) notes.push({ path: full, rel });
    }
  };
  walk(root, 0);
  return notes;
}

// 関連するノートを関連度順に返す。
// 一致した語の種類の多さを最優先し、次に出現回数で並べる。
export function rank(root, text, { exclude = [], limit = 3, excerptsPerNote = 2 } = {}) {
  const terms = tokenize(text);
  if (!terms.length) return { terms, results: [] };

  const scored = [];
  for (const note of collectNotes(root, exclude)) {
    let body;
    try {
      if (statSync(note.path).size > MAX_BYTES) continue;
      body = readFileSync(note.path, 'utf8');
    } catch {
      continue;
    }

    const haystack = body.toLowerCase();
    const title = basename(note.rel, '.md').toLowerCase();
    let score = 0;
    const matched = [];

    for (const term of terms) {
      const needle = term.toLowerCase();
      const inTitle = title.includes(needle);
      // 1 つの語で長文が独占しないよう、本文の加点は 5 回までに抑える
      const hits = Math.min(haystack.split(needle).length - 1, 5);
      if (!inTitle && !hits) continue;
      matched.push(term);
      score += (inTitle ? 5 : 0) + hits;
    }

    if (!matched.length) continue;
    scored.push({ ...note, score, matched, body });
  }

  scored.sort((a, b) => b.matched.length - a.matched.length || b.score - a.score);

  const results = scored.slice(0, limit).map((note) => {
    const lines = note.body.split('\n');
    const excerpts = [];
    for (const line of lines) {
      if (excerpts.length >= excerptsPerNote) break;
      const trimmed = line.trim();
      // 見出しや区切りは抜粋にしない（ノート名で分かるうえ、中身の情報がない）
      if (trimmed.length < 4 || trimmed.startsWith('---') || trimmed.startsWith('#')) continue;
      if (note.matched.some((t) => trimmed.toLowerCase().includes(t.toLowerCase()))) {
        excerpts.push(trimmed.slice(0, 160));
      }
    }
    return { rel: note.rel, score: note.score, matched: note.matched, excerpts };
  });

  return { terms, results };
}
