#!/usr/bin/env node
// Obsidian の vault（vault/videos/*.md）からサイトを生成するスクリプト。
// 依存パッケージなし。`node tools/build.mjs` または `npm run build` で実行する。

import { readdir, readFile, writeFile, mkdir, rm, cp, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VAULT_VIDEOS = path.join(ROOT, "vault", "videos");
const VAULT_ASSETS = path.join(ROOT, "vault", "assets");
const OUT_VIDEOS = path.join(ROOT, "videos");
const OUT_ASSETS = path.join(ROOT, "assets");
const INDEX = path.join(ROOT, "index.html");

const START = "<!-- build:videos:start -->";
const END = "<!-- build:videos:end -->";

/* ------------------------------------------------------------------ *
 * フロントマター（YAML のうちサイトで使う範囲のみ）
 * ------------------------------------------------------------------ */

function splitFrontMatter(raw) {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) return { meta: {}, body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: text };
  const yaml = text.slice(4, end + 1);
  const body = text.slice(text.indexOf("\n", end + 1) + 1);
  return { meta: parseYaml(yaml), body };
}

function parseScalar(value) {
  const v = value.trim();
  if (v === "" || v === "~" || v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^".*"$/s.test(v) || /^'.*'$/s.test(v)) return v.slice(1, -1);
  if (/^\[.*\]$/s.test(v)) {
    const inner = v.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((item) => parseScalar(item));
  }
  return v;
}

function parseYaml(yaml) {
  const meta = {};
  let currentKey = null;
  for (const line of yaml.split("\n")) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
      meta[currentKey].push(parseScalar(listItem[1]));
      continue;
    }
    const pair = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!pair) continue;
    currentKey = pair[1];
    const value = pair[2].trim();
    meta[currentKey] = value === "" ? [] : parseScalar(value);
  }
  return meta;
}

/* ------------------------------------------------------------------ *
 * Markdown（Obsidian 記法を含む最小サブセット）
 * ------------------------------------------------------------------ */

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 埋め込み画像・リンク解決に使う。slug -> ページ情報
function renderInline(text, ctx) {
  const codeSpans = [];
  let out = escapeHtml(text);

  // インラインコードは先に退避して、内部を装飾対象から外す
  out = out.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(code);
    return `\u0000CODE${codeSpans.length - 1}\u0000`;
  });

  // 画像埋め込み ![[file.png]] / ![alt](src)
  out = out.replace(/!\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g, (_, file, alt) =>
    `<img src="${ctx.assetPath(file.trim())}" alt="${alt ? alt.trim() : ""}" loading="lazy">`
  );
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_, alt, src) => `<img src="${src}" alt="${alt}" loading="lazy">`);

  // Obsidian の内部リンク [[ノート名]] / [[ノート名|表示名]]
  out = out.replace(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
    const link = ctx.linkTo(target.trim());
    // 別名がなければリンク先ノートのタイトルを使う（ファイル名をそのまま出さない）
    const label = (alias || link?.title || target).trim();
    return link ? `<a href="${link.href}">${label}</a>` : label;
  });

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const external = /^https?:\/\//.test(href);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${href}"${attrs}>${label}</a>`;
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

  return out.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => `<code>${codeSpans[Number(i)]}</code>`);
}

function renderMarkdown(body, ctx) {
  const lines = body.split("\n");
  const html = [];
  let list = null; // "ul" | "ol"
  let inCode = false;
  let codeBuffer = [];
  let paragraph = [];

  const closeList = () => {
    if (list) {
      html.push(`</${list}>`);
      list = null;
    }
  };
  const closeParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${renderInline(paragraph.join(" "), ctx)}</p>`);
      paragraph = [];
    }
  };
  const flush = () => {
    closeParagraph();
    closeList();
  };

  for (const line of lines) {
    const fence = line.match(/^\s*```(.*)$/);
    if (fence) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCode = false;
      } else {
        flush();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (line.trim() === "") {
      flush();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flush();
      // ノート内の見出しはページ見出し（h1/h2）の下に入るので 1 段下げる
      const level = Math.min(heading[1].length + 1, 6);
      html.push(`<h${level}>${renderInline(heading[2], ctx)}</h${level}>`);
      continue;
    }

    if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      flush();
      html.push("<hr>");
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flush();
      html.push(`<blockquote><p>${renderInline(quote[1], ctx)}</p></blockquote>`);
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      closeParagraph();
      const kind = ul ? "ul" : "ol";
      if (list !== kind) {
        closeList();
        html.push(`<${kind}>`);
        list = kind;
      }
      html.push(`<li>${renderInline((ul || ol)[1], ctx)}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }

  if (inCode && codeBuffer.length) {
    html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }
  flush();
  return html.join("\n");
}

/* ------------------------------------------------------------------ *
 * ノートの読み込み
 * ------------------------------------------------------------------ */

function slugify(name) {
  // 先頭の日付（2026-07-01-...）を落とし、URL に使えない文字を整理する
  const base = name.replace(/\.md$/i, "").replace(/^\d{4}-\d{2}-\d{2}[-_ ]*/, "");
  const slug = base
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]/gu, "");
  return slug || base.trim().toLowerCase();
}

function formatDate(value) {
  const text = String(value ?? "").trim();
  const m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return text;
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}

function youtubeId(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const m = text.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : text;
}

function firstParagraph(body) {
  for (const block of body.split(/\n\s*\n/)) {
    const text = block.trim();
    if (!text || text.startsWith("#") || text.startsWith("!") || text.startsWith(">")) continue;
    return text.replace(/\n/g, " ");
  }
  return "";
}

async function loadNotes() {
  if (!existsSync(VAULT_VIDEOS)) {
    throw new Error(`vault が見つかりません: ${path.relative(ROOT, VAULT_VIDEOS)}`);
  }
  const files = (await readdir(VAULT_VIDEOS)).filter((f) => f.toLowerCase().endsWith(".md"));
  const notes = [];

  for (const file of files) {
    const raw = await readFile(path.join(VAULT_VIDEOS, file), "utf8");
    const { meta, body } = splitFrontMatter(raw);
    if (meta.draft === true) continue;

    const noteName = file.replace(/\.md$/i, "");
    const title = meta.title || noteName.replace(/^\d{4}-\d{2}-\d{2}[-_ ]*/, "");
    notes.push({
      file,
      noteName,
      title: String(title),
      slug: meta.slug ? String(meta.slug) : slugify(file),
      date: meta.date ? String(meta.date) : "",
      summary: meta.summary ? String(meta.summary) : firstParagraph(body),
      thumbnail: meta.thumbnail ? String(meta.thumbnail) : "",
      youtube: youtubeId(meta.youtube),
      tags: Array.isArray(meta.tags) ? meta.tags.filter(Boolean).map(String) : [],
      body,
    });
  }

  notes.sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title));
  return notes;
}

/* ------------------------------------------------------------------ *
 * 出力
 * ------------------------------------------------------------------ */

function thumbnailFor(note, prefix, { placeholder = true } = {}) {
  if (note.thumbnail) {
    const src = /^https?:\/\//.test(note.thumbnail)
      ? note.thumbnail
      : `${prefix}assets/${note.thumbnail.replace(/^.*[/\\]/, "")}`;
    return `<img class="thumbnail" src="${escapeHtml(src)}" alt="${escapeHtml(note.title)}" loading="lazy">`;
  }
  if (note.youtube) {
    const src = `https://i.ytimg.com/vi/${encodeURIComponent(note.youtube)}/hqdefault.jpg`;
    return `<img class="thumbnail" src="${src}" alt="${escapeHtml(note.title)}" loading="lazy">`;
  }
  // 一覧ではカードの高さをそろえるため、画像がなくてもプレースホルダーを置く
  return placeholder ? `<div class="thumbnail" aria-hidden="true"></div>` : "";
}

function renderCard(note) {
  const href = `videos/${encodeURIComponent(note.slug)}.html`;
  const tags = note.tags.length
    ? `\n          <ul class="tag-list">${note.tags
        .map((tag) => `<li>#${escapeHtml(tag)}</li>`)
        .join("")}</ul>`
    : "";
  return `        <li class="video-card">
          <a class="video-card-link" href="${href}">
            ${thumbnailFor(note, "")}
            <h3>${escapeHtml(note.title)}</h3>
          </a>
          <p class="video-date"><time datetime="${escapeHtml(note.date)}">${escapeHtml(formatDate(note.date))}</time></p>
          <p>${escapeHtml(note.summary)}</p>${tags}
        </li>`;
}

function renderVideoPage(note, ctx) {
  const embed = note.youtube
    ? `      <div class="video-embed">
        <iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(note.youtube)}"
          title="${escapeHtml(note.title)}" loading="lazy" allowfullscreen
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
      </div>\n`
    : "";
  const cover = embed ? "" : thumbnailFor(note, "../", { placeholder: false });
  const tags = note.tags.length
    ? `      <ul class="tag-list">${note.tags.map((tag) => `<li>#${escapeHtml(tag)}</li>`).join("")}</ul>\n`
    : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(note.summary)}">
  <title>${escapeHtml(note.title)} — おさかなvlog</title>
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <h1 class="site-title"><a href="../index.html">おさかなvlog</a></h1>
      <nav class="site-nav" aria-label="メインナビゲーション">
        <ul>
          <li><a href="../index.html#latest">最新の動画</a></li>
          <li><a href="../index.html#about">このブログについて</a></li>
          <li><a href="../index.html#contact">お問い合わせ</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main class="container">
    <article class="video-article">
      <h2>${escapeHtml(note.title)}</h2>
      <p class="video-date"><time datetime="${escapeHtml(note.date)}">${escapeHtml(formatDate(note.date))}</time></p>
${embed}${cover ? `      ${cover}\n` : ""}${tags}${renderMarkdown(note.body, ctx)
    .split("\n")
    .map((line) => (line ? `      ${line}` : line))
    .join("\n")}
      <p class="back-link"><a href="../index.html#latest">← 動画一覧にもどる</a></p>
    </article>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>&copy; 2026 おさかなvlog</p>
    </div>
  </footer>
</body>
</html>
`;
}

async function copyAssets() {
  if (!existsSync(VAULT_ASSETS)) return 0;
  const entries = (await readdir(VAULT_ASSETS)).filter((name) => !name.startsWith("."));
  if (entries.length === 0) return 0;
  await mkdir(OUT_ASSETS, { recursive: true });
  let count = 0;
  for (const name of entries) {
    const from = path.join(VAULT_ASSETS, name);
    if (!(await stat(from)).isFile()) continue;
    await cp(from, path.join(OUT_ASSETS, name));
    count += 1;
  }
  return count;
}

async function main() {
  const notes = await loadNotes();
  if (notes.length === 0) {
    console.warn("警告: 公開できるノートがありません（draft: true のみ？）");
  }

  // ノート名 / slug からページ URL を引けるようにしておく（[[wikilink]] 用）
  const byName = new Map();
  for (const note of notes) {
    for (const key of [note.noteName, note.title, note.slug]) {
      if (!byName.has(key)) byName.set(key, note);
    }
  }
  const ctx = {
    assetPath: (file) => `../assets/${encodeURIComponent(file.replace(/^.*[/\\]/, ""))}`,
    linkTo: (target) => {
      const note = byName.get(target);
      return note ? { href: `./${encodeURIComponent(note.slug)}.html`, title: note.title } : null;
    },
  };

  // index.html の一覧をマーカーの間に差し込む
  const index = await readFile(INDEX, "utf8");
  const start = index.indexOf(START);
  const end = index.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`index.html に ${START} / ${END} のマーカーが見つかりません`);
  }
  const cards = notes.map(renderCard).join("\n");
  // 終了マーカーの字下げはそのまま残す
  const endIndent = index.slice(index.lastIndexOf("\n", end) + 1, end);
  const nextIndex =
    index.slice(0, start + START.length) +
    (cards ? `\n${cards}` : "") +
    `\n${endIndent}` +
    index.slice(end);
  await writeFile(INDEX, nextIndex);

  // 動画ページは毎回作り直す（削除したノートのページを残さないため）
  await rm(OUT_VIDEOS, { recursive: true, force: true });
  await mkdir(OUT_VIDEOS, { recursive: true });
  for (const note of notes) {
    await writeFile(path.join(OUT_VIDEOS, `${note.slug}.html`), renderVideoPage(note, ctx));
  }

  const assets = await copyAssets();
  console.log(`ビルド完了: 動画 ${notes.length} 件 / 添付ファイル ${assets} 件`);
  for (const note of notes) {
    console.log(`  - ${note.date || "日付なし"}  ${note.title}  →  videos/${note.slug}.html`);
  }
}

main().catch((error) => {
  console.error(`ビルドに失敗しました: ${error.message}`);
  process.exit(1);
});
