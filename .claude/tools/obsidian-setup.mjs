// Obsidian 連携のセットアップと自己診断。
//
//   node .claude/tools/obsidian.mjs doctor   いまの状態を点検して、直し方を出す
//   node .claude/tools/obsidian.mjs setup    繋がるエンドポイントを探して設定を書く
//
// API キーはコマンドライン引数では受け取らない（シェル履歴に残るため）。
// 環境変数 OBSIDIAN_API_KEY か標準入力から渡す。

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { detectEndpoint, probe, DEFAULT_ENDPOINTS } from './obsidian-rest.mjs';

const OK = '✓';
const NG = '✗';
const WARN = '!';

const projectDir = () => process.env.CLAUDE_PROJECT_DIR || process.cwd();
const expandHome = (p) => (p.startsWith('~') ? join(homedir(), p.slice(1)) : p);

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined; // 壊れている
  }
}

function countNotes(root) {
  let count = 0;
  const walk = (dir, depth) => {
    if (depth > 6) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) walk(join(dir, entry.name), depth + 1);
      else if (entry.name.endsWith('.md')) count++;
    }
  };
  try {
    walk(root, 0);
  } catch { /* 読めないものは数えない */ }
  return count;
}

function reasonText(result) {
  if (result.code === 'ECONNREFUSED') return '接続を拒否されました（待ち受けていません）';
  if (result.code === 'ETIMEDOUT') return 'タイムアウトしました';
  return result.error || '不明なエラー';
}

export async function doctor() {
  const root = projectDir();
  const lines = [];
  const fixes = [];
  let failed = 0;

  // 1. vault
  const vaultRaw = process.env.OBSIDIAN_VAULT || '';
  const vault = vaultRaw ? expandHome(vaultRaw) : '';
  if (!vault) {
    lines.push(`${NG} vault      OBSIDIAN_VAULT が未設定`);
    fixes.push('OBSIDIAN_VAULT に vault のパスを設定してください（setup が書き込みます）。');
    failed++;
  } else if (!existsSync(vault)) {
    lines.push(`${NG} vault      パスが存在しません: ${vault}`);
    fixes.push(`${vault} が正しい vault のパスか確認してください。`);
    failed++;
  } else {
    lines.push(`${OK} vault      ${vault}（ノート ${countNotes(vault)} 件）`);
  }

  // 2. API キー
  const key = process.env.OBSIDIAN_API_KEY || '';
  if (!key) {
    lines.push(`${WARN} APIキー    未設定（ファイル直読みのみで動作）`);
  } else {
    lines.push(`${OK} APIキー    設定済み（末尾 ${key.slice(-4)}）`);
  }

  // 3. エンドポイント
  let detected = null;
  if (key) {
    detected = await detectEndpoint(key);
    if (!detected.reachable) {
      lines.push(`${NG} 接続       どのエンドポイントにも繋がりません`);
      for (const t of detected.tried) lines.push(`             ${t.endpoint} → ${reasonText(t)}`);
      fixes.push('Obsidian が起動していて Local REST API プラグインが有効か確認してください。');
      failed++;
    } else if (detected.status === 401) {
      lines.push(`${NG} 接続       ${detected.endpoint} は応答しましたが API キーが拒否されました（401）`);
      fixes.push('プラグイン設定のキーと OBSIDIAN_API_KEY が一致しているか確認してください。');
      failed++;
    } else {
      lines.push(`${OK} 接続       ${detected.endpoint}（HTTP ${detected.status}）`);

      // 4. 証明書（MCP 接続の可否に効く）
      if (detected.endpoint.startsWith('https:') && !detected.certTrusted) {
        lines.push(`${WARN} 証明書     自己署名です。MCP 接続が拒否される可能性があります`);
        fixes.push(
          'MCP が証明書で失敗する場合: プラグイン設定で非暗号化 HTTP を有効にし、\n'
          + `  .mcp.json の url を ${DEFAULT_ENDPOINTS[1]}/mcp/ に変える（setup が自動で行います）。`,
        );
      } else if (detected.endpoint.startsWith('https:')) {
        lines.push(`${OK} 証明書     検証を通りました`);
      }
    }
  }

  // 5. .mcp.json
  const mcpPath = join(root, '.mcp.json');
  const mcp = readJson(mcpPath);
  if (mcp === undefined) {
    lines.push(`${NG} MCP設定    .mcp.json が壊れています`);
    failed++;
  } else if (!mcp?.mcpServers?.obsidian) {
    lines.push(`${NG} MCP設定    .mcp.json に obsidian サーバーがありません`);
    failed++;
  } else {
    const url = mcp.mcpServers.obsidian.url || '';
    const expected = detected?.reachable ? `${detected.endpoint}/mcp/` : null;
    if (expected && url !== expected) {
      lines.push(`${WARN} MCP設定    url が繋がる先と違います: ${url}`);
      fixes.push(`.mcp.json の url を ${expected} にしてください（setup が自動で行います）。`);
    } else {
      lines.push(`${OK} MCP設定    ${url}`);
    }
  }

  // 6. フック
  const settings = readJson(join(root, '.claude', 'settings.json'));
  const hooks = Object.keys(settings?.hooks || {});
  if (hooks.length >= 4) lines.push(`${OK} 自動記録   フック ${hooks.length} 件を登録済み`);
  else {
    lines.push(`${NG} 自動記録   フックが登録されていません`);
    fixes.push('.claude/settings.json の hooks を確認してください。');
    failed++;
  }

  // 7. ローカル設定
  const localPath = join(root, '.claude', 'settings.local.json');
  const local = readJson(localPath);
  if (local?.env?.OBSIDIAN_VAULT) lines.push(`${OK} ローカル設定 settings.local.json に env を保存済み`);
  else lines.push(`${WARN} ローカル設定 settings.local.json に env がありません（シェルの環境変数で渡すなら不要）`);

  console.log(lines.join('\n'));
  if (fixes.length) console.log(`\n直し方:\n${fixes.map((f) => `- ${f}`).join('\n')}`);
  console.log(`\n${failed ? `${failed} 件の問題があります。` : '問題ありません。'}`);
  return failed;
}

export async function setup({ flags }, stdin) {
  const root = projectDir();
  const key = (stdin || '').trim() || process.env.OBSIDIAN_API_KEY || '';
  const vaultRaw = flags.vault ? String(flags.vault) : process.env.OBSIDIAN_VAULT || '';

  if (!vaultRaw) {
    console.error('vault のパスを渡してください: --vault ~/Documents/MyVault');
    process.exit(1);
  }
  if (!existsSync(expandHome(vaultRaw))) {
    console.error(`vault が見つかりません: ${expandHome(vaultRaw)}`);
    process.exit(1);
  }

  const env = { OBSIDIAN_VAULT: vaultRaw };
  if (key) {
    env.OBSIDIAN_API_KEY = key;
    console.log('繋がるエンドポイントを探しています...');
    const results = [];
    for (const candidate of DEFAULT_ENDPOINTS) results.push(await probe(candidate, key));
    const usable = results.filter((r) => r.reachable && r.status !== 401);

    // 証明書を検証できる HTTPS が最良。次点は MCP が確実に通る HTTP。
    const best = usable.find((r) => r.endpoint.startsWith('https:') && r.certTrusted)
      || usable.find((r) => r.endpoint.startsWith('http:'))
      || usable[0];

    if (best) {
      const chosen = best.endpoint;
      env.OBSIDIAN_API_URL = chosen;
      console.log(`  使用: ${chosen}`);
      if (chosen.startsWith('http:') && results[0].reachable) {
        console.log('  （HTTPS は自己署名証明書のため、MCP が確実に通る HTTP を選びました）');
      } else if (chosen.startsWith('https:') && !best.certTrusted) {
        console.log('  （HTTP が無効です。MCP が証明書で失敗する場合はプラグイン設定で HTTP を有効にしてください）');
      }

      const mcpPath = join(root, '.mcp.json');
      const mcp = readJson(mcpPath) || { mcpServers: {} };
      mcp.mcpServers = mcp.mcpServers || {};
      mcp.mcpServers.obsidian = {
        type: 'http',
        url: `${chosen}/mcp/`,
        headers: { Authorization: 'Bearer ${OBSIDIAN_API_KEY}' },
      };
      writeFileSync(mcpPath, `${JSON.stringify(mcp, null, 2)}\n`, 'utf8');
      console.log('  .mcp.json を更新しました');
    } else {
      const denied = results.some((r) => r.status === 401);
      if (denied) {
        // 拒否されたキーは保存しない（直したつもりで直っていない状態を作らないため）
        delete env.OBSIDIAN_API_KEY;
        console.log('  API キーが拒否されました。保存しません。プラグイン設定のキーを確認してください。');
      } else {
        console.log('  繋がりませんでした。ファイル直読みで設定します（Obsidian 起動後に再実行してください）。');
      }
    }
  }

  // API キーを含むので、gitignore 済みの settings.local.json にだけ書く
  const localPath = join(root, '.claude', 'settings.local.json');
  const local = readJson(localPath) || {};
  local.env = { ...(local.env || {}), ...env };
  writeFileSync(localPath, `${JSON.stringify(local, null, 2)}\n`, 'utf8');
  console.log(`  .claude/settings.local.json を更新しました（git 管理外）\n`);

  // 書いた設定で点検する
  Object.assign(process.env, env);
  await doctor();
}
