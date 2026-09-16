'use strict';
// 区画サーバ。設計図 02・04 章に対応する権威シミュレーション。
// ・固定 tick 20 Hz。クライアントは同じ歩幅で予測し、サーバが確定させる。
// ・関心管理は近傍／中景／遠景の三段階。遠景は個体を送らず密度格子として送る。
// ・移動量はサーバが毎 tick 検証する。端末の申告した座標は一切採用しない。

const TICK_HZ = 20;
const DT = 1 / TICK_HZ;
const SPEED = 4.2;          // m/s
const SIZE = 900;           // 区画の一辺 (m)
const NEAR_R = 30;          // 近傍：個体として 20 Hz
const MID_R = 200;          // 中景：代表点として 5 Hz
const NEAR_CAP = 120;
const MID_CAP = 400;
const GRID = 18;            // 遠景の密度格子 (50 m 四方)
const CELL = SIZE / GRID;
const MAX_INPUT_PER_TICK = 4;
const DUEL_RANGE = 10;

// 建物。矩形で当たり判定を持つ。
const BUILDINGS = [
  { x: 450, y: 450, w: 110, h: 110, name: '中央広場の塔' },
  { x: 230, y: 290, w: 100, h: 70, name: '役場窓口' },
  { x: 665, y: 255, w: 90, h: 90, name: '交換所' },
  { x: 240, y: 665, w: 110, h: 75, name: '翻訳ブース' },
  { x: 680, y: 665, w: 100, h: 100, name: '対戦場' },
];

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function resolveBuildings(x, y, r) {
  for (const b of BUILDINGS) {
    const hx = b.w / 2 + r, hy = b.h / 2 + r;
    const dx = x - b.x, dy = y - b.y;
    if (Math.abs(dx) < hx && Math.abs(dy) < hy) {
      // めり込みの浅い軸へ押し出す
      const px = hx - Math.abs(dx), py = hy - Math.abs(dy);
      if (px < py) x = b.x + Math.sign(dx || 1) * hx;
      else y = b.y + Math.sign(dy || 1) * hy;
    }
  }
  return [clamp(x, 2, SIZE - 2), clamp(y, 2, SIZE - 2)];
}

let botSeq = 0;
const BOT_NAMES = ['アバター', '来場者', '通行人', '見物人', '観客'];

class Bot {
  constructor() {
    this.id = 'b' + (++botSeq);
    this.name = BOT_NAMES[botSeq % BOT_NAMES.length] + botSeq;
    // 初期配置も定常分布に合わせる。起動直後から広場が混んでいるように。
    if (Math.random() < 0.62) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 130;
      this.x = 450 + Math.cos(a) * r; this.y = 450 + Math.sin(a) * r;
    } else {
      this.x = Math.random() * SIZE; this.y = Math.random() * SIZE;
    }
    this.hue = Math.floor(Math.random() * 360);
    this.dir = 0;
    this.speed = 1.4 + Math.random() * 2.2;
    this.pickTarget();
  }
  pickTarget() {
    // 半数は中央広場へ寄る。群衆密度に偏りを作るため。
    if (Math.random() < 0.62) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 130;
      this.tx = 450 + Math.cos(a) * r; this.ty = 450 + Math.sin(a) * r;
    } else {
      this.tx = Math.random() * SIZE; this.ty = Math.random() * SIZE;
    }
    this.wait = 0;
  }
  step() {
    if (this.wait > 0) { this.wait -= DT; return; }
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) { this.wait = Math.random() * 4; this.pickTarget(); return; }
    this.dir = Math.atan2(dy, dx);
    const nx = this.x + (dx / d) * this.speed * DT;
    const ny = this.y + (dy / d) * this.speed * DT;
    const [rx, ry] = resolveBuildings(nx, ny, 0.6);
    if (Math.hypot(rx - this.x, ry - this.y) < 0.001) this.pickTarget();
    this.x = rx; this.y = ry;
  }
}

class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.x = 450 + (Math.random() - 0.5) * 36;
    this.y = 525 + (Math.random() - 0.5) * 36;
    this.hue = Math.floor(Math.random() * 360);
    this.dir = 0;
    this.queue = [];
    this.lastSeq = 0;
    this.ackSeq = 0;
    this.coins = 100;
    this.chat = null;
    this.chatUntil = 0;
    this.duel = null;       // 対戦中のルーム ID
    this.violations = 0;    // 速度超過などの棄却回数
    this.bytesOut = 0;
  }
}

class World {
  constructor(botCount) {
    this.tick = 0;
    this.players = new Map();
    this.bots = Array.from({ length: botCount }, () => new Bot());
    this.events = [];
  }

  join(id, name) {
    const p = new Player(id, name);
    this.players.set(id, p);
    return p;
  }
  leave(id) { this.players.delete(id); }

  // 端末からの入力。座標ではなく方向だけを受け取る。
  input(p, msg) {
    if (p.queue.length > 16) return;
    p.queue.push(msg);
  }

  step() {
    this.tick++;
    for (const b of this.bots) b.step();

    for (const p of this.players.values()) {
      const batch = p.queue.splice(0, MAX_INPUT_PER_TICK);
      if (p.queue.length > 0) {
        // 1 tick に処理できる以上の入力は破棄する（入力の水増し対策）
        p.violations += p.queue.length;
        p.queue.length = 0;
      }
      for (const inp of batch) {
        if (typeof inp.seq !== 'number' || inp.seq <= p.ackSeq) continue;
        let dx = Number(inp.dx) || 0, dy = Number(inp.dy) || 0;
        const len = Math.hypot(dx, dy);
        if (len > 1.0001) { dx /= len; dy /= len; p.violations++; } // 入力ベクトルの正規化を強制
        if (p.duel) { dx = 0; dy = 0; }                            // 対戦中は動かさない
        if (dx || dy) p.dir = Math.atan2(dy, dx);
        const nx = p.x + dx * SPEED * DT;
        const ny = p.y + dy * SPEED * DT;
        const [rx, ry] = resolveBuildings(nx, ny, 0.6);
        p.x = rx; p.y = ry;
        p.ackSeq = inp.seq;
      }
    }
  }

  // 遠景の密度格子。個体は送らない。
  crowdGrid(viewer) {
    const cells = [];
    const counts = new Int16Array(GRID * GRID);
    const push = (e) => {
      if (Math.hypot(e.x - viewer.x, e.y - viewer.y) <= MID_R) return;
      const cx = Math.min(GRID - 1, Math.floor(e.x / CELL));
      const cy = Math.min(GRID - 1, Math.floor(e.y / CELL));
      counts[cy * GRID + cx]++;
    };
    for (const b of this.bots) push(b);
    for (const p of this.players.values()) if (p !== viewer) push(p);
    for (let i = 0; i < counts.length; i++) if (counts[i]) cells.push(i, counts[i]);
    return cells;
  }

  // 視界の構築。距離で三段階に振り分ける。
  view(p, wantMid, wantCrowd) {
    const near = [], mid = [];
    const consider = (e, isPlayer) => {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d <= NEAR_R) {
        if (near.length < NEAR_CAP) {
          // 群衆ボットは名前も発言も持たないので、末尾の項目を落として送る
          const row = [
            e.id,
            Math.round(e.x * 100) / 100,
            Math.round(e.y * 100) / 100,
            Math.round(e.dir * 100) / 100,
            e.hue,
          ];
          if (isPlayer) {
            row.push(e.name);
            if (e.chatUntil > Date.now()) row.push(e.chat);
          }
          near.push(row);
        }
      } else if (wantMid && d <= MID_R) {
        if (mid.length < MID_CAP) mid.push([Math.round(e.x), Math.round(e.y), e.hue]);
      }
    };
    for (const b of this.bots) consider(b, false);
    for (const q of this.players.values()) if (q !== p) consider(q, true);

    const snap = {
      t: 's',
      k: this.tick,
      ack: p.ackSeq,
      me: [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100],
      near,
      pop: this.bots.length + this.players.size,
    };
    if (wantMid) snap.mid = mid;
    if (wantCrowd) snap.crowd = this.crowdGrid(p);
    return snap;
  }

  nearestPlayer(p) {
    let best = null, bd = DUEL_RANGE;
    for (const q of this.players.values()) {
      if (q === p || q.duel) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bd) { bd = d; best = q; }
    }
    return best;
  }
}

module.exports = { World, TICK_HZ, DT, SIZE, NEAR_R, MID_R, GRID, CELL, BUILDINGS, DUEL_RANGE, SPEED };
