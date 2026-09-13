'use strict';
// OZ プロトタイプのサーバ。
// 役割は三つ。① 静的配信 ② 区画シミュレーションの tick ③ 対戦ルームの仲介。
// 設計図で「別層」に置いたもの（ID 発行・台帳・ゲートウェイ）は、
// このプロトタイプでは同一プロセス内の別モジュールとして最小実装している。

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { World, TICK_HZ, SIZE, NEAR_R, MID_R, GRID, CELL, BUILDINGS, DUEL_RANGE } = require('./world.js');
const { KoiKoi } = require('./koikoi.js');
const { CARDS } = require('./cards.js');

const PORT = Number(process.env.PORT) || 8787;
const BOTS = Number(process.env.OZ_BOTS) || 900;
const SESSION_MS = 10 * 60 * 1000;   // セッション資格情報の有効期間（設計図 03 章）
const WAGER = 2;   // 1 文あたりの賭け金。払いは 文 × WAGER。

const PUBLIC = path.join(__dirname, '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const rel = url === '/' ? '/index.html' : url;
  const file = path.join(PUBLIC, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403).end('forbidden'); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('見つかりません'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});

const wss = new WebSocketServer({ server });
const world = new World(BOTS);
const conns = new Map();   // playerId -> { ws, player, session }
const rooms = new Map();   // roomId -> { game, seats:[playerId|null], cpu:boolean }
let nextId = 1, nextRoom = 1;

function send(ws, obj) {
  if (ws.readyState !== ws.OPEN) return 0;
  const s = JSON.stringify(obj);
  ws.send(s);
  return s.length;
}
function toPlayer(id, obj) {
  const c = conns.get(id);
  if (c) c.player.bytesOut += send(c.ws, obj);
}
function toast(id, text, kind) { toPlayer(id, { t: 'toast', text, kind: kind || 'info' }); }

// ---- セッション資格情報（設計図 03 章の簡約版） -------------------------
// 端末が保持する鍵の代わりに端末 ID を用い、10 分で失効する短命トークンを発行する。
// 保証レベルは操作ごとに要求し、セッション全体には昇格させない。
function issueSession(deviceId) {
  return {
    device: deviceId,
    token: 'ses_' + Math.random().toString(36).slice(2, 12),
    issued: Date.now(),
    expires: Date.now() + SESSION_MS,
    scope: ['world.enter', 'world.chat', 'duel.invite'],
    assurance: 'AL1',
  };
}
function sessionValid(s) { return s && Date.now() < s.expires; }

// ---- 対戦ルーム ---------------------------------------------------------
function startDuel(aId, bId) {
  const a = conns.get(aId), b = bId ? conns.get(bId) : null;
  const roomId = 'r' + (nextRoom++);
  const seats = [
    { id: aId, name: a.player.name, cpu: false },
    b ? { id: bId, name: b.player.name, cpu: false } : { id: 'cpu', name: 'OZ の対戦相手', cpu: true },
  ];
  const game = new KoiKoi(seats, (Date.now() ^ (nextRoom * 2654435761)) >>> 0, WAGER);
  const room = { id: roomId, game, seats };
  rooms.set(roomId, room);
  a.player.duel = roomId;
  if (b) b.player.duel = roomId;
  pushRoom(room);
  maybeCpu(room);
  return room;
}

function pushRoom(room) {
  room.seats.forEach((s, i) => { if (!s.cpu) toPlayer(s.id, { t: 'duel', room: room.id, view: room.game.view(i) }); });
}

function maybeCpu(room) {
  const g = room.game;
  if (g.phase === 'over') return;
  const seat = g.turn;
  if (!room.seats[seat].cpu) return;
  setTimeout(() => {
    if (!rooms.has(room.id) || g.phase === 'over') return;
    const action = g.cpuAction(seat);
    if (action) g.act(seat, action);
    pushRoom(room);
    if (g.phase === 'over') endDuel(room); else maybeCpu(room);
  }, 750);
}

function endDuel(room) {
  const g = room.game;
  const r = g.result;
  // 台帳にあたる処理。動くのはコインだけで、アカウントも権限も移転しない。
  if (r && r.winner !== null) {
    const win = room.seats[r.winner], lose = room.seats[1 - r.winner];
    const winConn = conns.get(win.id), loseConn = conns.get(lose.id);
    // 払える範囲までしか動かさない。台帳は残高を負にしない。
    const amount = loseConn ? Math.min(r.coins, loseConn.player.coins) : r.coins;
    r.coins = amount;
    if (loseConn) loseConn.player.coins -= amount;
    if (winConn) winConn.player.coins += amount;
    // プロトタイプの都合。遊び続けられるよう、賭けられない残高になったら補充する。
    if (loseConn && loseConn.player.coins < WAGER) {
      loseConn.player.coins = 10;
      toast(lose.id, 'コインを 10 枚補充しました（プロトタイプのため）', 'info');
    }
  }
  room.seats.forEach((s, i) => {
    const c = conns.get(s.id);
    if (!c) return;
    c.player.duel = null;
    const youWon = r && r.winner !== null ? r.winner === i : null;
    toPlayer(s.id, { t: 'duelEnd', result: r, coins: c.player.coins, youWon, seat: i });
  });
  rooms.delete(room.id);
}

// ---- 接続 ---------------------------------------------------------------
wss.on('connection', (ws) => {
  let entry = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString().slice(0, 4096)); } catch { return; }

    if (msg.t === 'hello') {
      const name = String(msg.name || '名無し').slice(0, 12);
      const id = 'p' + (nextId++);
      const session = issueSession(String(msg.device || 'dev_unknown').slice(0, 40));
      const player = world.join(id, name);
      entry = { ws, player, session };
      conns.set(id, entry);
      send(ws, {
        t: 'welcome',
        id, name,
        session: { token: session.token, expires: session.expires, assurance: session.assurance, scope: session.scope },
        cards: CARDS,
        world: { size: SIZE, tickHz: TICK_HZ, nearR: NEAR_R, midR: MID_R, grid: GRID, cell: CELL, buildings: BUILDINGS, duelRange: DUEL_RANGE, wager: WAGER },
        coins: player.coins,
        spawn: [player.x, player.y],
      });
      broadcastToast(`${name} が入場しました`);
      return;
    }

    if (!entry) return;
    const p = entry.player;

    if (!sessionValid(entry.session)) {
      // 失効後は入場中の操作も受け付けない。再入場で新しい資格情報を取り直す。
      toast(p.id, 'セッション資格情報が失効しました。再読み込みしてください。', 'error');
      return;
    }

    switch (msg.t) {
      case 'in':
        world.input(p, msg);
        break;

      case 'chat': {
        const text = String(msg.text || '').slice(0, 60);
        if (!text) break;
        p.chat = text; p.chatUntil = Date.now() + 6000;
        break;
      }

      case 'duel': {
        // 賭けを伴う操作は AL2 を要求する。confirm は生体／PIN の再確認にあたる。
        if (!msg.confirm) { toast(p.id, '賭けを伴う操作には AL2（再確認）が必要です', 'error'); break; }
        if (p.duel) break;
        if (p.coins < WAGER) { toast(p.id, 'コインが足りません', 'error'); break; }
        if (msg.cpu) { startDuel(p.id, null); break; }
        const target = world.nearestPlayer(p);
        if (!target) { toast(p.id, `半径 ${DUEL_RANGE} m 以内に相手がいません`, 'error'); break; }
        const tc = conns.get(target.id);
        if (!tc || tc.player.coins < WAGER) { toast(p.id, '相手のコインが足りません', 'error'); break; }
        tc.pendingFrom = p.id;
        toPlayer(target.id, { t: 'duelReq', from: p.id, name: p.name, wager: WAGER });
        toast(p.id, `${target.name} に対戦を申し込みました`, 'info');
        break;
      }

      case 'duelAns': {
        const fromId = entry.pendingFrom;
        entry.pendingFrom = null;
        if (!fromId || !conns.has(fromId)) break;
        if (!msg.accept) { toast(fromId, `${p.name} は対戦を断りました`, 'info'); break; }
        if (!msg.confirm) { toast(p.id, '賭けを伴う操作には AL2（再確認）が必要です', 'error'); break; }
        if (conns.get(fromId).player.duel || p.duel) break;
        startDuel(fromId, p.id);
        break;
      }

      case 'kk': {
        const room = rooms.get(p.duel);
        if (!room) break;
        const seat = room.seats.findIndex((s) => s.id === p.id);
        const res = room.game.act(seat, msg.action || {});
        if (!res.ok) { toast(p.id, res.error, 'error'); break; }
        pushRoom(room);
        if (room.game.phase === 'over') endDuel(room); else maybeCpu(room);
        break;
      }

      case 'quitDuel': {
        const room = rooms.get(p.duel);
        if (!room) break;
        room.game.phase = 'over';
        room.game.result = { winner: null, points: 0, coins: 0, reason: '対局が中断されました', yaku: [] };
        endDuel(room);
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!entry) return;
    const p = entry.player;
    const room = rooms.get(p.duel);
    if (room) {
      room.game.phase = 'over';
      room.game.result = { winner: null, points: 0, coins: 0, reason: '相手が退出しました', yaku: [] };
      endDuel(room);
    }
    conns.delete(p.id);
    world.leave(p.id);
    broadcastToast(`${p.name} が退出しました`);
  });
});

function broadcastToast(text) {
  for (const [id] of conns) toast(id, text, 'info');
}

// ---- tick ---------------------------------------------------------------
// 近傍は毎 tick（20 Hz）、中景は 8 tick ごと（2.5 Hz）、遠景は 40 tick ごと（0.5 Hz）。
setInterval(() => {
  world.step();
  const wantMid = world.tick % 8 === 0;
  const wantCrowd = world.tick % 40 === 0;
  for (const [id, c] of conns) {
    const snap = world.view(c.player, wantMid, wantCrowd);
    snap.coins = c.player.coins;
    snap.ses = Math.max(0, Math.round((c.session.expires - Date.now()) / 1000));
    snap.rej = c.player.violations;
    c.player.bytesOut += send(c.ws, snap);
    if (world.tick % 20 === 0) {
      // 直近 1 秒の下り量を返し、クライアントの帯域計に表示する
      send(c.ws, { t: 'bw', bytes: c.player.bytesOut });
      c.player.bytesOut = 0;
    }
  }
}, 1000 / TICK_HZ);

server.listen(PORT, () => {
  console.log(`OZ プロトタイプ起動: http://localhost:${PORT}`);
  console.log(`区画 ${SIZE}×${SIZE} m / 群衆ボット ${BOTS} 体 / ${TICK_HZ} Hz`);
});
