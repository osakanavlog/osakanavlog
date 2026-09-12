// 記録と呼び出しを全プロジェクトで有効にする（ユーザー設定へのインストール）。
//
//   node .claude/tools/obsidian.mjs install     ~/.claude/settings.json にフックを登録
//   node .claude/tools/obsidian.mjs uninstall   登録を解除
//
// プロジェクト設定（.claude/settings.json）のフックはこのリポジトリで作業したときだけ
// 動く。全プロジェクトで第二の脳として使いたい場合にこれを使う。フック本体は
// ~/.claude/obsidian/ に複製するので、このリポジトリを移動・削除しても動き続ける。

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = dirname(fileURLToPath(import.meta.url));
const claudeDir = dirname(toolsDir); // <repo>/.claude
const hooksDir = join(claudeDir, 'hooks');

// 複製するフック本体（これ自体は import のパスだけ書き換える）
const HOOK_SCRIPTS = ['obsidian-logger.mjs', 'obsidian-recall.mjs'];
// フックが読み込むモジュール（そのまま複製する）
const MODULES = ['obsidian-vault.mjs', 'obsidian-search.mjs'];

// どのイベントで何を呼ぶか。logger は引数でイベント名を受け取る。
const REGISTRATIONS = [
  { event: 'SessionStart', script: 'obsidian-logger.mjs', arg: 'SessionStart' },
  { event: 'UserPromptSubmit', script: 'obsidian-logger.mjs', arg: 'UserPromptSubmit' },
  { event: 'UserPromptSubmit', script: 'obsidian-recall.mjs', arg: '' },
  { event: 'Stop', script: 'obsidian-logger.mjs', arg: 'Stop' },
  { event: 'SessionEnd', script: 'obsidian-logger.mjs', arg: 'SessionEnd' },
];

const installDir = () => join(homedir(), '.claude', 'obsidian');
const settingsPath = () => join(homedir(), '.claude', 'settings.json');

// 自分が登録したフックかどうかの目印
const isOurs = (entry) => {
  const text = JSON.stringify(entry);
  return HOOK_SCRIPTS.some((name) => text.includes(name));
};

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

  for (const name of MODULES) copyFileSync(join(toolsDir, name), join(dir, name));
  for (const name of HOOK_SCRIPTS) {
    // 複製先ではモジュールが同じディレクトリに並ぶので、import のパスを合わせる
    const source = readFileSync(join(hooksDir, name), 'utf8').replace(/from '\.\.\/tools\//g, "from './");
    writeFileSync(join(dir, name), source, 'utf8');
  }
  console.log(`複製: ${dir}`);

  const settings = readSettings();
  settings.hooks = settings.hooks || {};

  // 既存のフックは残し、自分が前に入れたものだけ置き換える
  for (const event of new Set(REGISTRATIONS.map((r) => r.event))) {
    settings.hooks[event] = (settings.hooks[event] || []).filter((entry) => !isOurs(entry));
  }
  for (const { event, script, arg } of REGISTRATIONS) {
    settings.hooks[event].push({
      hooks: [{
        type: 'command',
        command: `node "${join(dir, script)}"${arg ? ` ${arg}` : ''}`,
        timeout: 10,
      }],
    });
  }

  writeSettings(settings);
  console.log(`登録: ${settingsPath()}`);
  console.log('  記録   SessionStart / UserPromptSubmit / Stop / SessionEnd');
  console.log('  呼び出し UserPromptSubmit');
  console.log('\n全プロジェクトで、会話が記録され、関連するノートが会話に差し込まれます。');
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
