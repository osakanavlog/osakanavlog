'use strict';
// 花札こいこい。対戦ルームの権威実装。
// 設計図 04 章「対戦ルーム」に対応する。決定論的に進み、同じ種から同じ展開になる。
// 賭けの対象はコインのみ。アカウントと権限は移転しない。

const { CARDS, cardValue, byTag } = require('./cards.js');

const HIKARI = CARDS.filter((c) => c.type === 'hikari').map((c) => c.id);
const AME = byTag('ame');          // 柳に小野道風
const SAKAZUKI = byTag('sakazuki'); // 菊に盃
const MAKU = CARDS.find((c) => c.m === 3 && c.type === 'hikari').id; // 桜に幕
const TSUKI = byTag('tsuki');       // 芒に月
const INOSHIKACHO = [byTag('ino'), byTag('shika'), byTag('cho')];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 取り札から出来役を求める。
function evaluate(pile) {
  const set = new Set(pile);
  const cards = pile.map((id) => CARDS[id]);
  const hikari = pile.filter((id) => HIKARI.includes(id));
  const tane = cards.filter((c) => c.type === 'tane').length;
  const tan = cards.filter((c) => c.type === 'tan').length;
  const kasu = cards.filter((c) => c.type === 'kasu').length;
  const aka = cards.filter((c) => c.tan === 'aka').length;
  const ao = cards.filter((c) => c.tan === 'ao').length;
  const out = [];

  // 光役。柳（雨）を含むかどうかで名前と点が変わる。
  const hasAme = hikari.includes(AME);
  const n = hikari.length;
  if (n === 5) out.push({ name: '五光', points: 10 });
  else if (n === 4 && !hasAme) out.push({ name: '四光', points: 8 });
  else if (n === 4 && hasAme) out.push({ name: '雨四光', points: 7 });
  else if (n === 3 && !hasAme) out.push({ name: '三光', points: 5 });

  if (INOSHIKACHO.every((id) => set.has(id))) out.push({ name: '猪鹿蝶', points: 5 });
  if (aka >= 3) out.push({ name: '赤短', points: 5 });
  if (ao >= 3) out.push({ name: '青短', points: 5 });
  if (set.has(MAKU) && set.has(SAKAZUKI)) out.push({ name: '花見で一杯', points: 5 });
  if (set.has(TSUKI) && set.has(SAKAZUKI)) out.push({ name: '月見で一杯', points: 5 });

  if (tane >= 5) out.push({ name: `タネ${tane}`, points: 1 + (tane - 5) });
  if (tan >= 5) out.push({ name: `タン${tan}`, points: 1 + (tan - 5) });
  if (kasu >= 10) out.push({ name: `カス${kasu}`, points: 1 + (kasu - 10) });

  return { list: out, total: out.reduce((s, y) => s + y.points, 0) };
}

class KoiKoi {
  // seats: [{ id, name, cpu }] の 2 要素。席 0 が親。
  constructor(seats, seed, wager) {
    this.seats = seats;
    this.wager = wager;
    this.rng = mulberry32(seed);
    this.seed = seed;
    this.wager = wager;
    this.log = [];
    this.result = null;

    const deck = CARDS.map((c) => c.id);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    this.hands = [deck.splice(0, 8), deck.splice(0, 8)];
    this.field = deck.splice(0, 8);
    this.deck = deck;
    this.piles = [[], []];
    this.koi = [0, 0];
    this.scores = [0, 0];
    this.turn = 0;
    this.phase = 'play';
    this.pending = null;
    this.turnStartScore = 0;
    this.say('場に 8 枚。手札は各 8 枚。親は ' + seats[0].name + '。');
  }

  say(text) {
    this.log.push(text);
    if (this.log.length > 40) this.log.shift();
  }

  seatOf(playerId) {
    return this.seats.findIndex((s) => s.id === playerId);
  }

  // 観戦者ごとの可視状態。相手の手札は枚数だけ見せる。
  view(seat) {
    const me = seat === 0 || seat === 1 ? seat : 0;
    const opp = 1 - me;
    return {
      you: me,
      phase: this.phase,
      turn: this.turn,
      wager: this.wager,
      field: this.field.slice(),
      hand: this.hands[me].slice(),
      oppHandCount: this.hands[opp].length,
      deckCount: this.deck.length,
      piles: [this.piles[0].slice(), this.piles[1].slice()],
      yaku: [evaluate(this.piles[0]), evaluate(this.piles[1])],
      koi: this.koi.slice(),
      seats: this.seats.map((s) => ({ name: s.name, cpu: !!s.cpu })),
      pending: this.pending ? { card: this.pending.card, matches: this.pending.matches } : null,
      log: this.log.slice(-8),
      result: this.result,
    };
  }

  // 行動の適用。戻り値は { ok } または { ok:false, error }。
  act(seat, action) {
    if (this.phase === 'over') return { ok: false, error: '対局は終了しています' };
    if (seat !== this.turn) return { ok: false, error: '手番ではありません' };

    if (this.phase === 'play') {
      if (action.type !== 'play') return { ok: false, error: '札を選んでください' };
      const idx = this.hands[seat].indexOf(action.card);
      if (idx < 0) return { ok: false, error: 'その札は手札にありません' };
      this.hands[seat].splice(idx, 1);
      this.turnStartScore = evaluate(this.piles[seat]).total;
      this.playCard(seat, action.card, '手札');
      return { ok: true };
    }

    if (this.phase === 'chooseHand') {
      if (action.type !== 'choose') return { ok: false, error: '取る札を選んでください' };
      if (!this.pending.matches.includes(action.card)) return { ok: false, error: 'その札は場にありません' };
      this.capture(seat, [this.pending.card, action.card]);
      this.pending = null;
      this.drawPhase(seat);
      return { ok: true };
    }

    if (this.phase === 'koikoi') {
      if (action.type === 'agari') { this.finish(seat); return { ok: true }; }
      if (action.type === 'koikoi') {
        this.koi[seat] += 1;
        this.say(this.seats[seat].name + ' が「こいこい」を宣言。');
        this.endTurn();
        return { ok: true };
      }
      return { ok: false, error: 'あがりかこいこいを選んでください' };
    }
    return { ok: false, error: '不正な操作です' };
  }

  playCard(seat, card, from) {
    const matches = this.field.filter((f) => CARDS[f].m === CARDS[card].m);
    const name = CARDS[card].label;
    if (matches.length === 0) {
      this.field.push(card);
      this.say(`${this.seats[seat].name}：${name}（${from}）を場に出した。`);
      this.drawPhase(seat);
    } else if (matches.length === 1) {
      this.capture(seat, [card, matches[0]]);
      this.drawPhase(seat);
    } else if (matches.length === 3) {
      this.capture(seat, [card, ...matches]);
      this.drawPhase(seat);
    } else {
      // 同月 2 枚。手札から出した場合だけ取る側を選ばせる。
      if (from === '手札') {
        this.pending = { card, matches };
        this.phase = 'chooseHand';
        this.say(`${this.seats[seat].name}：${name}。同月が 2 枚ある。どちらを取るか選ぶ。`);
      } else {
        const pick = matches.slice().sort((a, b) => cardValue(b) - cardValue(a))[0];
        this.capture(seat, [card, pick]);
        this.drawPhase(seat);
      }
    }
  }

  capture(seat, ids) {
    for (const id of ids) {
      const i = this.field.indexOf(id);
      if (i >= 0) this.field.splice(i, 1);
    }
    this.piles[seat].push(...ids);
    this.say(`${this.seats[seat].name}：${ids.map((i) => CARDS[i].label).join('・')} を取った。`);
  }

  drawPhase(seat) {
    if (this.deck.length === 0) { this.afterTurn(seat); return; }
    const card = this.deck.shift();
    this.playCard2(seat, card);
  }

  playCard2(seat, card) {
    const matches = this.field.filter((f) => CARDS[f].m === CARDS[card].m);
    if (matches.length === 0) {
      this.field.push(card);
      this.say(`${this.seats[seat].name}：山から ${CARDS[card].label}。場に置いた。`);
    } else if (matches.length === 3) {
      this.capture(seat, [card, ...matches]);
    } else {
      const pick = matches.slice().sort((a, b) => cardValue(b) - cardValue(a))[0];
      this.capture(seat, [card, pick]);
    }
    this.afterTurn(seat);
  }

  afterTurn(seat) {
    const { total, list } = evaluate(this.piles[seat]);
    this.scores[seat] = total;
    if (total > this.turnStartScore) {
      this.phase = 'koikoi';
      this.say(`${this.seats[seat].name} に役ができた：${list.map((y) => y.name).join('・')}（${total}文）`);
      return;
    }
    this.endTurn();
  }

  endTurn() {
    if (this.hands[0].length === 0 && this.hands[1].length === 0) {
      this.phase = 'over';
      this.result = { winner: null, points: 0, coins: 0, reason: '手札が尽きた（引き分け）', yaku: [] };
      this.say('手札が尽きた。引き分け。');
      return;
    }
    this.turn = 1 - this.turn;
    this.phase = 'play';
  }

  finish(seat) {
    const { total, list } = evaluate(this.piles[seat]);
    let points = total;
    const mults = [];
    if (total >= 7) { points *= 2; mults.push('7文以上で2倍'); }
    if (this.koi[1 - seat] > 0) { points *= 2; mults.push('こいこい返しで2倍'); }
    this.phase = 'over';
    this.result = {
      winner: seat,
      points,
      coins: points * this.wager, // 実際の移動量は台帳側で相手の残高に合わせて丸める
      reason: mults.length ? mults.join(' / ') : '出来役そのまま',
      yaku: list,
    };
    this.say(`${this.seats[seat].name} があがり。${total}文 → ${points}文（${this.result.reason}）`);
  }

  // CPU の手。強くはないが、取れるなら価値の高い札を取りに行く。
  cpuAction(seat) {
    if (this.phase === 'play') {
      const hand = this.hands[seat];
      let best = hand[0], bestScore = -1;
      for (const card of hand) {
        const matches = this.field.filter((f) => CARDS[f].m === CARDS[card].m);
        let s = 0;
        if (matches.length > 0) {
          s = 10 + Math.max(...matches.map(cardValue)) + cardValue(card);
          if (matches.length === 3) s += 6;
        } else {
          s = 5 - cardValue(card); // 捨てるなら価値の低い札から
        }
        if (s > bestScore) { bestScore = s; best = card; }
      }
      return { type: 'play', card: best };
    }
    if (this.phase === 'chooseHand') {
      const pick = this.pending.matches.slice().sort((a, b) => cardValue(b) - cardValue(a))[0];
      return { type: 'choose', card: pick };
    }
    if (this.phase === 'koikoi') {
      const total = evaluate(this.piles[seat]).total;
      const left = this.hands[seat].length;
      if (total >= 5 || left <= 2 || this.koi[1 - seat] > 0) return { type: 'agari' };
      return { type: 'koikoi' };
    }
    return null;
  }
}

module.exports = { KoiKoi, evaluate };
