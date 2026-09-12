// Obsidian Local REST API プラグイン経由で vault を操作するバックエンド。
// obsidian.mjs から OBSIDIAN_API_KEY が設定されているときに使われる。
//
//   OBSIDIAN_API_KEY  プラグインが発行する API キー（必須）
//   OBSIDIAN_API_URL  既定: https://127.0.0.1:27124
//
// プラグインの証明書は自己署名なので TLS 検証は行わない（curl -k 相当）。
// 接続先は既定でループバックに限られる。

import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const BASE = process.env.OBSIDIAN_API_URL || 'https://127.0.0.1:27124';

function fail(message) {
  const error = new Error(message);
  error.handled = true;
  throw error;
}

function call(method, path, { body, query, accept = 'application/json' } = {}) {
  const url = new URL(path, BASE);
  for (const [key, value] of Object.entries(query || {})) url.searchParams.set(key, value);

  const isHttps = url.protocol === 'https:';
  const options = {
    method,
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: `${url.pathname}${url.search}`,
    headers: {
      Authorization: `Bearer ${process.env.OBSIDIAN_API_KEY}`,
      Accept: accept,
      ...(body === undefined ? {} : { 'Content-Type': 'text/markdown; charset=utf-8' }),
    },
    ...(isHttps ? { rejectUnauthorized: false } : {}),
  };

  return new Promise((resolve, reject) => {
    const req = (isHttps ? httpsRequest : httpRequest)(options, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, text }));
    });
    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error(`${BASE} に接続できません。Obsidian が起動していて Local REST API プラグインが有効か確認してください。`));
      } else reject(err);
    });
    if (body !== undefined) req.write(body);
    req.end();
  });
}

async function expectOk(res, context) {
  if (res.status === 401) fail('API キーが拒否されました（401）。OBSIDIAN_API_KEY を確認してください。');
  if (res.status === 404) return null;
  if (res.status >= 400) fail(`${context} に失敗しました（HTTP ${res.status}）: ${res.text.slice(0, 200)}`);
  return res;
}

const encodePath = (p) => p.split('/').filter(Boolean).map(encodeURIComponent).join('/');

// ディレクトリを再帰的に辿ってノートのパスを集める。
async function listNotes(dir = '', depth = 0, acc = []) {
  if (depth > 5 || acc.length > 500) return acc;
  const res = await expectOk(await call('GET', `/vault/${dir ? `${encodePath(dir)}/` : ''}`), 'ファイル一覧の取得');
  if (!res) return acc;

  let files = [];
  try {
    const parsed = JSON.parse(res.text);
    files = parsed.files || parsed || [];
  } catch {
    fail('ファイル一覧の応答を解釈できませんでした。');
  }

  for (const entry of files) {
    if (typeof entry !== 'string') continue;
    if (entry.startsWith('.')) continue;
    const rel = dir ? `${dir}/${entry}` : entry;
    if (entry.endsWith('/')) await listNotes(rel.slice(0, -1), depth + 1, acc);
    else if (entry.endsWith('.md')) acc.push(rel);
  }
  return acc;
}

// パス・ファイル名・部分一致の順でノートを 1 枚に絞り込む。
async function resolveNote(query) {
  if (!query) fail('ノートを指定してください。');
  const direct = query.endsWith('.md') ? query : `${query}.md`;
  const res = await call('GET', `/vault/${encodePath(direct)}`, { accept: 'text/markdown' });
  if (res.status === 200) return direct;

  const notes = await listNotes();
  const needle = query.toLowerCase().replace(/\.md$/, '');
  const byName = notes.filter((n) => n.split('/').pop().replace(/\.md$/, '').toLowerCase() === needle);
  const hits = byName.length ? byName : notes.filter((n) => n.toLowerCase().includes(needle));

  if (!hits.length) fail(`ノートが見つかりません: ${query}`);
  if (hits.length > 1 && byName.length !== 1) {
    fail(`候補が複数あります。パスを指定してください:\n${hits.slice(0, 10).map((n) => `  ${n}`).join('\n')}`);
  }
  return hits[0];
}

export const rest = {
  async search({ flags, positional }) {
    const query = positional.join(' ').trim();
    if (!query) fail('検索語を指定してください。');
    const limit = Number(flags.limit) || 20;

    const res = await expectOk(
      await call('POST', '/search/simple/', { query: { query, contextLength: '120' } }),
      '検索',
    );
    let results = [];
    try {
      const parsed = JSON.parse(res.text);
      results = Array.isArray(parsed) ? parsed : parsed.results || [];
    } catch {
      fail('検索結果を解釈できませんでした。');
    }
    if (!results.length) return console.log('該当なし');

    console.log(`${Math.min(results.length, limit)} 件:`);
    for (const hit of results.slice(0, limit)) {
      const contexts = (hit.matches || []).slice(0, 3)
        .map((m) => `    ${String(m.context || '').replace(/\s+/g, ' ').trim().slice(0, 200)}`);
      console.log(`  ${hit.filename}\n${contexts.join('\n') || '    (ファイル名が一致)'}`);
    }
  },

  async read({ positional }) {
    const path = await resolveNote(positional[0]);
    const res = await expectOk(await call('GET', `/vault/${encodePath(path)}`, { accept: 'text/markdown' }), '読み込み');
    if (!res) fail(`ノートが見つかりません: ${positional[0]}`);
    const max = Number(process.env.OBSIDIAN_READ_MAX) || 40000;
    console.log(`# ${path}\n`);
    console.log(res.text.length > max ? `${res.text.slice(0, max)}\n\n[...${res.text.length - max} 文字省略]` : res.text);
  },

  async list({ flags, positional }) {
    const limit = Number(flags.limit) || 30;
    const prefix = positional[0] ? positional[0].toLowerCase() : null;
    const notes = (await listNotes()).filter((n) => !prefix || n.toLowerCase().startsWith(prefix));
    if (!notes.length) return console.log('ノートがありません');
    console.log(notes.slice(0, limit).map((n) => `  ${n}`).join('\n'));
    if (notes.length > limit) console.log(`  ... 他 ${notes.length - limit} 件`);
  },
};

// new / append / daily は本文を標準入力から受け取る。

rest.new = async function createNote({ flags, positional }, stdin) {
  const title = positional.join(' ').trim();
  if (!title) fail('タイトルを指定してください。');
  const safe = title.replace(/[\\/:*?"<>|]/g, '-');
  const folder = flags.folder ? `${String(flags.folder).replace(/\/$/, '')}/` : '';
  const path = `${folder}${safe}.md`;

  if (!flags.force) {
    const existing = await call('GET', `/vault/${encodePath(path)}`, { accept: 'text/markdown' });
    if (existing.status === 200) fail(`すでに存在します: ${path}（上書きは --force）`);
  }

  const date = new Date().toISOString().slice(0, 10);
  const tags = flags.tags ? String(flags.tags).split(',').map((t) => t.trim()).filter(Boolean) : [];
  const frontmatter = ['---', `created: ${date}`, ...(tags.length ? ['tags:', ...tags.map((t) => `  - ${t}`)] : []), '---'];
  const body = `${frontmatter.join('\n')}\n\n# ${title}\n\n${stdin.trim()}\n`;

  await expectOk(await call('PUT', `/vault/${encodePath(path)}`, { body }), '作成');
  console.log(`作成: ${path}`);
};

rest.append = async function appendNote({ flags, positional }, stdin) {
  const body = stdin.trim();
  if (!body) fail('追記する内容を標準入力から渡してください。');
  const path = await resolveNote(positional[0]);
  const heading = flags.heading ? `\n## ${flags.heading}\n` : '';
  await expectOk(await call('POST', `/vault/${encodePath(path)}`, { body: `\n${heading}\n${body}\n` }), '追記');
  console.log(`追記: ${path}`);
};

rest.daily = async function appendDaily({ flags }, stdin) {
  const body = stdin.trim();
  if (!body) fail('追記する内容を標準入力から渡してください。');
  const heading = flags.heading ? `\n## ${flags.heading}\n` : '';
  await expectOk(await call('POST', '/periodic/daily/', { body: `\n${heading}\n${body}\n` }), 'デイリーノートへの追記');
  console.log('追記: 今日のデイリーノート');
};
