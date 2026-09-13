// Local REST API プラグイン経由の動作を実際に叩いて確かめる。
//
//   node .claude/tools/obsidian.mjs verify
//
// 接続・認証から、ノートの作成・読み戻し・追記・検索・削除までを順に実行する。
// 使うのは自分で作った検証用ノート 1 枚だけで、最後に必ず消す。
// 既存のノートには一切触れない。

import { call, DEFAULT_ENDPOINTS, probe } from './obsidian-rest.mjs';

const OK = '✓';
const NG = '✗';
const WARN = '!';

const encodePath = (p) => p.split('/').filter(Boolean).map(encodeURIComponent).join('/');

function reason(result) {
  if (result.code === 'ECONNREFUSED') return '接続を拒否されました（待ち受けていません）';
  if (result.code === 'ETIMEDOUT') return 'タイムアウトしました';
  return result.error || '不明なエラー';
}

export async function verify() {
  const key = process.env.OBSIDIAN_API_KEY;
  if (!key) {
    console.error('OBSIDIAN_API_KEY が設定されていません。');
    console.error('プラグイン設定で API キーを発行し、環境変数に設定してから再実行してください。');
    return 1;
  }

  // 1. 接続と認証
  const candidates = process.env.OBSIDIAN_API_URL ? [process.env.OBSIDIAN_API_URL] : DEFAULT_ENDPOINTS;
  let endpoint = null;
  const tried = [];
  for (const candidate of candidates) {
    const result = await probe(candidate, key);
    tried.push(result);
    if (result.reachable && result.status !== 401) {
      endpoint = result;
      break;
    }
  }

  if (!endpoint) {
    console.log(`${NG} 接続`);
    for (const t of tried) {
      console.log(`    ${t.endpoint} → ${t.status === 401 ? 'API キーが拒否されました（401）' : reason(t)}`);
    }
    console.log('\n直し方:');
    if (tried.some((t) => t.status === 401)) {
      console.log('- プラグイン設定の API キーと OBSIDIAN_API_KEY が一致しているか確認してください。');
    } else {
      console.log('- Obsidian が起動していて Local REST API プラグインが有効か確認してください。');
    }
    return 1;
  }

  process.env.OBSIDIAN_API_URL = endpoint.endpoint; // 以降の呼び出しを繋がった先に固定する
  console.log(`${OK} 接続       ${endpoint.endpoint}（HTTP ${endpoint.status}）`);
  if (endpoint.endpoint.startsWith('https:') && !endpoint.certTrusted) {
    console.log(`${WARN} 証明書     自己署名です。MCP 接続が拒否される場合は HTTP ポートを使ってください`);
  }

  const name = `_claude-verify-${Date.now()}.md`;
  const marker = `verifytoken${Date.now().toString(36)}`;
  const path = encodePath(name);
  let failed = 0;
  let created = false;

  try {
    // 2. 一覧の取得
    const listed = await call('GET', '/vault/');
    if (listed.status === 200) {
      let count = '?';
      try {
        const parsed = JSON.parse(listed.text);
        count = (parsed.files || parsed || []).length;
      } catch { /* 件数が読めなくても一覧自体は通っている */ }
      console.log(`${OK} 一覧取得   vault 直下 ${count} 件`);
    } else {
      console.log(`${NG} 一覧取得   HTTP ${listed.status}`);
      failed++;
    }

    // 3. 作成
    const body = `# 検証用ノート\n\nこれは動作確認のために作られたノートです。\n目印: ${marker}\n`;
    const put = await call('PUT', `/vault/${path}`, { body });
    if (put.status >= 200 && put.status < 300) {
      created = true;
      console.log(`${OK} 作成       ${name}`);
    } else {
      console.log(`${NG} 作成       HTTP ${put.status} ${put.text.slice(0, 120)}`);
      return ++failed;
    }

    // 4. 読み戻し（書いた内容が本当に入っているか）
    const got = await call('GET', `/vault/${path}`, { accept: 'text/markdown' });
    if (got.status === 200 && got.text.includes(marker)) {
      console.log(`${OK} 読み戻し   書いた内容が一致しました`);
    } else {
      console.log(`${NG} 読み戻し   HTTP ${got.status}（目印が見つかりません）`);
      failed++;
    }

    // 5. 追記
    const appended = await call('POST', `/vault/${path}`, { body: '\n追記できました。\n' });
    const afterAppend = await call('GET', `/vault/${path}`, { accept: 'text/markdown' });
    if (appended.status >= 200 && appended.status < 300 && afterAppend.text.includes('追記できました')) {
      console.log(`${OK} 追記       末尾に追加されました`);
    } else {
      console.log(`${NG} 追記       HTTP ${appended.status}`);
      failed++;
    }

    // 6. 検索（作ったばかりのノートが引けるか）
    const searched = await call('POST', '/search/simple/', { query: { query: marker, contextLength: '40' } });
    if (searched.status === 200 && searched.text.includes(name)) {
      console.log(`${OK} 検索       作成したノートが見つかりました`);
    } else if (searched.status === 200) {
      console.log(`${WARN} 検索       API は応答しましたが作成直後のノートは出ませんでした`);
      console.log('             （索引の更新待ちの可能性があります。しばらく後に再実行してください）');
    } else {
      console.log(`${NG} 検索       HTTP ${searched.status}`);
      failed++;
    }

    // 7. デイリーノート（コア/Periodic Notes プラグインが要る）
    const daily = await call('GET', '/periodic/daily/', { accept: 'text/markdown' });
    if (daily.status === 200) console.log(`${OK} デイリー   今日のノートが取得できました`);
    else if (daily.status === 404) console.log(`${WARN} デイリー   今日のノートがありません（daily コマンドは作成から行います）`);
    else {
      console.log(`${WARN} デイリー   HTTP ${daily.status}`);
      console.log('             （デイリーノート系プラグインが無効だと daily コマンドは使えません）');
    }
  } finally {
    // 8. 後片付け。作った検証用ノートは必ず消す。
    if (created) {
      const deleted = await call('DELETE', `/vault/${path}`);
      if (deleted.status >= 200 && deleted.status < 300) {
        console.log(`${OK} 後片付け   ${name} を削除しました`);
      } else {
        console.log(`${WARN} 後片付け   ${name} を削除できませんでした（HTTP ${deleted.status}）`);
        console.log(`             vault 直下に残っているので手で消してください`);
      }
    }
  }

  console.log(`\n${failed ? `${failed} 件の問題があります。` : 'REST API 経由の読み書きは正常に動いています。'}`);
  if (!failed) {
    console.log('\nMCP 側は別に確認が要ります:');
    console.log('  claude mcp list          obsidian が接続できているか');
    console.log('  そのうえで Claude に「Obsidian の MCP ツールでノートを1件読んで」と頼む');
  }
  return failed;
}
