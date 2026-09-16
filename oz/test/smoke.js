'use strict';
// サーバを起動し、実際の WebSocket で一通り動かす通し試験。
// 確認するのは、入場・同期・入力検証・視界・対戦・コインの移動。

const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT) || 8789;
let failures = 0;
function check(label, cond, extra) {
  const mark = cond ? 'OK  ' : 'NG  ';
  if (!cond) failures++;
  console.log(mark + label + (extra !== undefined ? '  … ' + extra : ''));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client(name) {
  const ws = new WebSocket('ws://127.0.0.1:' + PORT);
  const c = { ws, name, msgs: [], snaps: [], welcome: null, duel: null, end: null, toasts: [] };
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    c.msgs.push(m);
    if (m.t === 'welcome') c.welcome = m;
    if (m.t === 's') c.snaps.push(m);
    if (m.t === 'duel') c.duel = m.view;
    if (m.t === 'duelEnd') c.end = m;
    if (m.t === 'toast') c.toasts.push(m.text);
  });
  c.send = (o) => ws.send(JSON.stringify(o));
  c.ready = new Promise((res) => ws.on('open', () => { c.send({ t: 'hello', name, device: 'dev_test_' + name }); const iv = setInterval(() => { if (c.welcome) { clearInterval(iv); res(); } }, 20); }));
  return c;
}

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), OZ_BOTS: '200' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  server.stdout.on('data', () => {});
  await sleep(700);

  // --- 入場 ---
  const a = client('あかり'); const b = client('ばんり');
  await Promise.all([a.ready, b.ready]);
  check('入場して welcome を受け取る', !!a.welcome && !!b.welcome);
  check('札 48 枚が配られる', a.welcome.cards.length === 48, a.welcome.cards.length + ' 枚');
  check('セッション資格情報が短命', a.welcome.session.expires - Date.now() <= 10 * 60 * 1000 + 500);
  check('初期の保証レベルは AL1', a.welcome.session.assurance === 'AL1');

  // --- 同期 ---
  await sleep(600);
  const rate = a.snaps.length / 0.6;
  check('スナップショットが 20 Hz 前後で届く', rate > 14 && rate < 26, rate.toFixed(0) + ' Hz');
  const hasMid = a.snaps.some((s) => s.mid !== undefined);
  check('中景が間引いて届く', hasMid && a.snaps.filter((s) => s.mid).length < a.snaps.length);
  const bytesPerTick = JSON.stringify(a.snaps[a.snaps.length - 1]).length;
  check('1 tick の下り量が小さい', bytesPerTick < 4000, bytesPerTick + ' B');

  // --- 移動と予測の突き合わせ ---
  const start = a.snaps[a.snaps.length - 1].me.slice();
  for (let i = 1; i <= 20; i++) { a.send({ t: 'in', seq: i, dx: 1, dy: 0 }); await sleep(50); }
  await sleep(200);
  const end = a.snaps[a.snaps.length - 1].me;
  const moved = Math.hypot(end[0] - start[0], end[1] - start[1]);
  check('入力どおり移動する', moved > 3 && moved < 6, moved.toFixed(2) + ' m');
  check('ack が進む', a.snaps[a.snaps.length - 1].ack >= 20, 'ack=' + a.snaps[a.snaps.length - 1].ack);

  // --- 入力検証 ---
  const rejBefore = a.snaps[a.snaps.length - 1].rej;
  const pos0 = a.snaps[a.snaps.length - 1].me.slice();
  for (let i = 21; i <= 60; i++) a.send({ t: 'in', seq: i, dx: 30, dy: 30 }); // 一気に大量＋過大ベクトル
  await sleep(300);
  const pos1 = a.snaps[a.snaps.length - 1].me;
  const jump = Math.hypot(pos1[0] - pos0[0], pos1[1] - pos0[1]);
  check('速度超過は棄却され瞬間移動しない', jump < 2.5, jump.toFixed(2) + ' m');
  check('棄却が記録される', a.snaps[a.snaps.length - 1].rej > rejBefore);

  // --- 遠景（0.5 Hz なので少し待つ） ---
  await sleep(2200);
  const crowdSnap = a.snaps.filter((s) => s.crowd !== undefined).pop();
  const crowdTotal = crowdSnap ? crowdSnap.crowd.reduce((t, v, i) => (i % 2 ? t + v : t), 0) : 0;
  check('遠景は密度格子として届く', !!crowdSnap && crowdSnap.crowd.length > 0, (crowdSnap ? crowdSnap.crowd.length / 2 : 0) + ' セルに ' + crowdTotal + ' 体');
  check('遠景は個体の名前を含まない', !!crowdSnap && crowdSnap.crowd.every((v) => typeof v === 'number'));

  // --- 視界。相手の位置まで歩いてから確認する ---
  let seq = 100;
  for (let i = 0; i < 400; i++) {
    const sa = a.snaps[a.snaps.length - 1], sb = b.snaps[b.snaps.length - 1];
    const dx = sb.me[0] - sa.me[0], dy = sb.me[1] - sa.me[1];
    const d = Math.hypot(dx, dy);
    if (d < 3.5) break;
    a.send({ t: 'in', seq: ++seq, dx: dx / d, dy: dy / d });
    await sleep(50);
  }
  await sleep(250);
  const sa = a.snaps[a.snaps.length - 1], sb = b.snaps[b.snaps.length - 1];
  const gap = Math.hypot(sb.me[0] - sa.me[0], sb.me[1] - sa.me[1]);
  check('相手のそばまで歩ける', gap < 5, gap.toFixed(2) + ' m');
  const seesB = sa.near.some((e) => e[5] === 'ばんり');
  check('近くの相手が近傍に入る', seesB, '近傍 ' + sa.near.length + ' 体');
  const bSeesA = sb.near.some((e) => e[5] === 'あかり');
  check('相手からも見えている（双方向）', bSeesA);

  // --- AL2 の要求 ---
  a.toasts.length = 0;
  a.send({ t: 'duel', cpu: true });           // confirm なし
  await sleep(200);
  check('確認なしの賭けは拒否される', a.toasts.some((t) => t.includes('AL2')), a.toasts.join(' / '));

  // --- CPU との対戦を最後まで ---
  a.send({ t: 'duel', cpu: true, confirm: true });
  await sleep(300);
  check('対戦ルームが開く', !!a.duel && a.duel.hand.length === 8, a.duel ? a.duel.hand.length + ' 枚' : 'なし');
  check('場に 8 枚', a.duel.field.length === 8);

  const coinsBefore = a.snaps[a.snaps.length - 1].coins;
  let guard = 0;
  while (!a.end && guard++ < 120) {
    const v = a.duel;
    if (v && v.turn === v.you && v.phase !== 'over') {
      if (v.phase === 'play') {
        const match = v.hand.find((id) => v.field.some((f) => a.welcome.cards[f].m === a.welcome.cards[id].m));
        a.send({ t: 'kk', action: { type: 'play', card: match !== undefined ? match : v.hand[0] } });
      } else if (v.phase === 'chooseHand') {
        a.send({ t: 'kk', action: { type: 'choose', card: v.pending.matches[0] } });
      } else if (v.phase === 'koikoi') {
        a.send({ t: 'kk', action: { type: 'agari' } });
      }
    }
    await sleep(120);
  }
  check('対局が決着する', !!a.end, a.end ? a.end.result.reason : 'タイムアウト');
  if (a.end) {
    const r = a.end.result;
    check('結果に勝敗と文が入る', r.winner === null || (typeof r.points === 'number' && r.points > 0), JSON.stringify({ winner: r.winner, points: r.points, coins: r.coins }));
    await sleep(200);
    const coinsAfter = a.snaps[a.snaps.length - 1].coins;
    check('コインが動く（アカウントは動かない）', r.winner === null ? coinsAfter === coinsBefore : coinsAfter !== coinsBefore, coinsBefore + ' → ' + coinsAfter);
  }

  // --- 対人の申し込み ---
  b.toasts.length = 0;
  a.send({ t: 'duel', confirm: true });
  await sleep(300);
  const gotReq = b.msgs.some((m) => m.t === 'duelReq');
  check('近くの相手へ申し込みが届く', gotReq);
  if (gotReq) {
    b.send({ t: 'duelAns', accept: true, confirm: true });
    await sleep(400);
    check('両者が同じルームに入る', !!a.duel && !!b.duel && a.duel.field.length === b.duel.field.length);
    check('相手の手札は枚数しか見えない', b.duel.oppHandCount === 8 && b.duel.hand.length === 8);
    a.send({ t: 'quitDuel' });
    await sleep(300);
    check('中断すると両者に通知される', !!a.end && !!b.end);
  }

  a.ws.close(); b.ws.close();
  await sleep(200);
  server.kill();
  console.log('\n' + (failures === 0 ? 'すべて通過' : failures + ' 件が失敗'));
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
