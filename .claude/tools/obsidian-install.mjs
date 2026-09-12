// 会話の記録を全プロジェクトで有効にする（ユーザー設定へのインストール）。
//
//   node .claude/tools/obsidian.mjs install     ~/.claude/settings.json にフックを登録
//   node .claude/tools/obsidian.mjs uninstall   登録を解除
//
// プロジェクト設定（.claude/settings.json）のフックはこのリポジトリで作業したときだけ
// 動く。全プロジェクトで記録したい場合にこれを使う。フック本体は
// ~/.claude/obsidian/ に複製するので、このリポジトリを移動・削除しても動き続ける。

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EVENTS = ['SessionStart', 'UserPromptSubmit', 'Stop', 'SessionEnd'];
const toolsDir = dirname(fileURLToPath(import.meta.url));
const claudeDir = dirname(toolsDir); // <repo>/.claude

const installDir = () => join(homedir(), '.claude', 'obsidian');
const settingsPath = () => join(homedir(), '.claude', 'settings.json');
const loggerPath = () => join(installDir(), 'obsidian-logger.mjs');

// 自分が登録したフックかどうかの目印
const isOurs = (entry) => JSON.stringify(entry).includes('obsidian-logger.mjs');

function readSettings() {
  const path = settingsPath();
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    console.error(`${path} が JSON として読めません。手で直してから再実行してください。`);
    process.exit(1);
  }
}

function writeSettings(settings) {
  mkdirSync(dirname(settingsPath()), { recursive: true });
  writeFileSync(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}

export function install() {
  const dir = installDir();
  mkdirSync(dir, { recursive: true });

  // フック本体を複製する。import のパスだけ複製先に合わせて書き換える。
  copyFileSync(join(toolsDir, 'obsidian-vault.mjs'), join(dir, 'obsidian-vault.mjs'));
  const logger = readFileSync(join(claudeDir, 'hooks', 'obsidian-logger.mjs'), 'utf8')
    .replace("from '../tools/obsidian-vault.mjs'", "from './obsidian-vault.mjs'");
  writeFileSync(loggerPath(), logger, 'utf8');
  console.log(`複製: ${dir}`);

  const settings = readSettings();
  settings.hooks = settings.hooks || {};

  for (const event of EVENTS) {
    // 既存のフックは残し、自分が前に入れたものだけ置き換える
    const others = (settings.hooks[event] || []).filter((entry) => !isOurs(entry));
    others.push({
      hooks: [{
        type: 'command',
        command: `node "${loggerPath()}" ${event}`,
        timeout: 10,
      }],
    });
    settings.hooks[event] = others;
  }

  writeSettings(settings);
  console.log(`登録: ${settingsPath()}（${EVENTS.join(' / ')}）`);
  console.log('\n全プロジェクトの会話が Obsidian に記録されるようになりました。');
  console.log('反映には Claude Code の再起動が必要です。');
  console.log('解除するには uninstall を実行してください。');
}

export function uninstall() {
  const settings = readSettings();
  let removed = 0;

  for (const event of Object.keys(settings.hooks || {})) {
    const before = settings.hooks[event].length;
    settings.hooks[event] = settings.hooks[event].filter((entry) => !isOurs(entry));
    removed += before - settings.hooks[event].length;
    if (!settings.hooks[event].length) delete settings.hooks[event];
  }
  if (settings.hooks && !Object.keys(settings.hooks).length) delete settings.hooks;

  writeSettings(settings);
  console.log(`解除: ${settingsPath()}（フック ${removed} 件を削除）`);

  const dir = installDir();
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    console.log(`削除: ${dir}`);
  }
  console.log('\n記録済みのノートはそのまま残ります。');
}
