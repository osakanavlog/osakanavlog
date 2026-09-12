// vault の場所を自動的に見つける。
//
// 優先順位
//   1. 環境変数 OBSIDIAN_VAULT
//   2. Obsidian 自身の設定ファイル（obsidian.json）に登録された vault
//   3. よくある置き場所の走査（.obsidian ディレクトリを持つフォルダ）
//
// 手で設定しなくても記録が残るようにするための仕組み。

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

export const expandHome = (p) => (p.startsWith('~') ? join(homedir(), p.slice(1)) : p);

// Obsidian が vault 一覧を保存している場所（OS ごと）
function obsidianConfigPaths() {
  const home = homedir();
  switch (platform()) {
    case 'darwin':
      return [join(home, 'Library', 'Application Support', 'obsidian', 'obsidian.json')];
    case 'win32':
      return [join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'obsidian', 'obsidian.json')];
    default:
      return [
        join(process.env.XDG_CONFIG_HOME || join(home, '.config'), 'obsidian', 'obsidian.json'),
        join(home, '.var', 'app', 'md.obsidian.Obsidian', 'config', 'obsidian', 'obsidian.json'), // Flatpak
        join(home, 'snap', 'obsidian', 'current', '.config', 'obsidian', 'obsidian.json'), // Snap
      ];
  }
}

// obsidian.json から vault を読む。開いているもの・最近使ったものを優先する。
function fromObsidianConfig() {
  for (const configPath of obsidianConfigPaths()) {
    if (!existsSync(configPath)) continue;
    let vaults;
    try {
      vaults = JSON.parse(readFileSync(configPath, 'utf8')).vaults;
    } catch {
      continue;
    }
    if (!vaults || typeof vaults !== 'object') continue;

    const entries = Object.values(vaults)
      .filter((v) => v && typeof v.path === 'string' && existsSync(v.path))
      .sort((a, b) => (Number(b.open) - Number(a.open)) || ((b.ts || 0) - (a.ts || 0)));

    if (entries.length) {
      return { path: entries[0].path, source: 'obsidian.json', all: entries.map((v) => v.path) };
    }
  }
  return null;
}

// vault は .obsidian ディレクトリを持つ。よくある置き場所を浅く走査する。
function fromCommonLocations() {
  const home = homedir();
  const roots = [
    home,
    join(home, 'Documents'),
    join(home, 'Obsidian'),
    join(home, 'Dropbox'),
    join(home, 'OneDrive'),
    join(home, 'Library', 'Mobile Documents', 'iCloud~md~obsidian', 'Documents'),
  ];

  const found = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    if (existsSync(join(root, '.obsidian'))) found.push(root);
    let entries = [];
    try {
      entries = readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const candidate = join(root, entry.name);
      if (existsSync(join(candidate, '.obsidian'))) found.push(candidate);
    }
  }

  const unique = [...new Set(found)];
  return unique.length ? { path: unique[0], source: '自動検出', all: unique } : null;
}

// vault のパスを決める。見つからなければ null。
export function resolveVault() {
  const fromEnv = process.env.OBSIDIAN_VAULT;
  if (fromEnv) {
    const path = expandHome(fromEnv);
    return { path, source: 'OBSIDIAN_VAULT', exists: existsSync(path), all: [path] };
  }
  const detected = fromObsidianConfig() || fromCommonLocations();
  return detected ? { ...detected, exists: true } : null;
}
