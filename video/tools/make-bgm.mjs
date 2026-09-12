/**
 * PR動画用のオリジナルBGMを生成する。
 *
 *   node tools/make-bgm.mjs
 *   → public/bgm.wav を書き出す（あとで mp3 に変換）
 *
 * 既成曲は使わず、すべてこのスクリプトで合成している。
 * 明るい長調・112BPM・16分のきらきらしたアルペジオで「ワクワク」した質感を狙い、
 * 動画の9シーンの切り替わりに合わせて編成（鳴っている楽器）を変えている。
 */
import {writeFileSync} from 'node:fs';

const SR = 44100;
const DURATION = 180; // 動画と同じ3分
const N = SR * DURATION;
const BPM = 112;
const SPB = 60 / BPM; // 1拍の秒数
const BAR = SPB * 4; // 1小節の秒数
const TOTAL_BARS = Math.floor(DURATION / BAR); // 84小節

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

/* ------------------------------------------------------------------ *
 * コード進行
 * ------------------------------------------------------------------ */

// C / G / Am / F（明るく前に進む定番）
const LOOP_A = [
  {root: 48, tones: [60, 64, 67]}, // C
  {root: 43, tones: [59, 62, 67]}, // G
  {root: 45, tones: [60, 64, 69]}, // Am
  {root: 41, tones: [57, 60, 65]}, // F
];
// F / G / Am / C（サビ用のリフト）
const LOOP_B = [
  {root: 41, tones: [57, 60, 65]},
  {root: 43, tones: [59, 62, 67]},
  {root: 45, tones: [60, 64, 69]},
  {root: 48, tones: [60, 64, 67]},
];

const chordAt = (bar) => (bar >= 49 && bar < 62 ? LOOP_B : LOOP_A)[bar % 4];

/* ------------------------------------------------------------------ *
 * 編成（どの小節で何を鳴らすか）— 動画のシーン割りに対応
 * ------------------------------------------------------------------ */

const arrangement = (bar) => {
  if (bar < 6) return {pad: 0.95, pluck: 0.3, bass: 0, drums: 0, bell: 0.85, lead: 0}; // オープニング
  if (bar < 15) return {pad: 0.8, pluck: 0.85, bass: 0.7, drums: 0.45, bell: 0.35, lead: 0}; // 対応エリア
  if (bar < 26) return {pad: 0.7, pluck: 0.9, bass: 0.9, drums: 0.8, bell: 0.3, lead: 0}; // 会社概要
  if (bar < 49) return {pad: 0.62, pluck: 0.9, bass: 0.95, drums: 0.95, bell: 0.3, lead: 0.9}; // 事業・進め方
  if (bar < 62) return {pad: 0.7, pluck: 0.95, bass: 1, drums: 1, bell: 0.4, lead: 1}; // 強み（サビ）
  if (bar < 71) return {pad: 1, pluck: 0.5, bass: 0.45, drums: 0.18, bell: 0.75, lead: 0.5}; // 数字（間）
  if (bar < 80) return {pad: 0.7, pluck: 0.95, bass: 1, drums: 1, bell: 0.4, lead: 1}; // 手がけるところ
  return {pad: 1, pluck: 0.4, bass: 0.5, drums: 0.12, bell: 0.95, lead: 0.35}; // クロージング
};

/** 編成が切り替わる小節（アクセントを置く） */
const SECTION_STARTS = [6, 15, 26, 49, 62, 71, 80];

/* ------------------------------------------------------------------ *
 * 音源
 * ------------------------------------------------------------------ */

const buses = {
  pad: new Float32Array(N),
  pluck: new Float32Array(N),
  bass: new Float32Array(N),
  drums: new Float32Array(N),
  bell: new Float32Array(N),
  lead: new Float32Array(N),
};

/** 倍音を足し合わせた1周期分の波形テーブル（パッド用・毎サンプルのsinを避ける） */
const makeTable = (harmonics) => {
  const size = 2048;
  const t = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const ph = (i / size) * 2 * Math.PI;
    let v = 0;
    for (let h = 0; h < harmonics.length; h++) {
      v += harmonics[h] * Math.sin(ph * (h + 1));
    }
    t[i] = v;
  }
  return t;
};

const PAD_TABLE = makeTable([1, 0.5, 0.33, 0.16, 0.1, 0.05, 0.03]);

const readTable = (table, phase) => {
  const size = table.length;
  const p = phase * size;
  const i0 = Math.floor(p) % size;
  const i1 = (i0 + 1) % size;
  const f = p - Math.floor(p);
  return table[i0] * (1 - f) + table[i1] * f;
};

/** やわらかいパッド。ゆっくり立ち上がってゆっくり消える */
const addPad = (t, freq, gain, dur) => {
  const start = Math.floor(t * SR);
  const len = Math.floor((dur + 0.9) * SR);
  const detune = [0.9965, 1, 1.0035];
  const attack = 0.55;
  const release = 0.85;
  const phases = [0, 0.33, 0.66];
  for (let i = 0; i < len; i++) {
    const s = start + i;
    if (s < 0 || s >= N) continue;
    const x = i / SR;
    const env =
      Math.min(1, x / attack) * (x > dur ? Math.max(0, 1 - (x - dur) / release) : 1);
    if (env <= 0) continue;
    let v = 0;
    for (let d = 0; d < 3; d++) {
      phases[d] = (phases[d] + (freq * detune[d]) / SR) % 1;
      v += readTable(PAD_TABLE, phases[d]);
    }
    buses.pad[s] += v * env * gain * 0.045;
  }
};

/** マリンバ／ベルに近い減衰音。曲の推進力はこれが担う */
const addPluck = (bus, t, freq, gain, dur = 0.5, decay = 7) => {
  const start = Math.floor(t * SR);
  const len = Math.floor(dur * SR);
  for (let i = 0; i < len; i++) {
    const s = start + i;
    if (s < 0 || s >= N) continue;
    const x = i / SR;
    const env = Math.exp(-x * decay) * (1 - Math.exp(-x * 500));
    const w = 2 * Math.PI * x;
    const v =
      Math.sin(w * freq) +
      0.4 * Math.sin(w * freq * 2) +
      0.16 * Math.sin(w * freq * 3.01) +
      0.07 * Math.sin(w * freq * 4.02);
    bus[s] += v * env * gain * 0.2;
  }
};

/** 長く伸びる鐘。区切りのアクセントに使う */
const addBell = (t, freq, gain, dur = 3.2) => {
  const start = Math.floor(t * SR);
  const len = Math.floor(dur * SR);
  for (let i = 0; i < len; i++) {
    const s = start + i;
    if (s < 0 || s >= N) continue;
    const x = i / SR;
    const env = Math.exp(-x * 1.5) * (1 - Math.exp(-x * 300));
    const w = 2 * Math.PI * x;
    const v =
      Math.sin(w * freq) +
      0.5 * Math.sin(w * freq * 2.76) +
      0.25 * Math.sin(w * freq * 5.4) +
      0.12 * Math.sin(w * freq * 8.9);
    buses.bell[s] += v * env * gain * 0.09;
  }
};

/** まるいベース */
const addBass = (t, freq, gain, dur) => {
  const start = Math.floor(t * SR);
  const len = Math.floor((dur + 0.12) * SR);
  for (let i = 0; i < len; i++) {
    const s = start + i;
    if (s < 0 || s >= N) continue;
    const x = i / SR;
    const env =
      (1 - Math.exp(-x * 220)) * (x > dur ? Math.max(0, 1 - (x - dur) / 0.12) : 1) * Math.exp(-x * 0.7);
    const w = 2 * Math.PI * x;
    const v = Math.sin(w * freq) + 0.3 * Math.sin(w * freq * 2) + 0.1 * Math.sin(w * freq * 3);
    buses.bass[s] += Math.tanh(v * 0.9) * env * gain * 0.3;
  }
};

const addKick = (t, gain) => {
  const start = Math.floor(t * SR);
  const len = Math.floor(0.35 * SR);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const s = start + i;
    if (s < 0 || s >= N) continue;
    const x = i / SR;
    const f = 46 + 110 * Math.exp(-x * 42);
    phase += f / SR;
    const env = Math.exp(-x * 9) * (1 - Math.exp(-x * 900));
    buses.drums[s] += Math.sin(2 * Math.PI * phase) * env * gain * 0.65;
  }
};

const addClap = (t, gain) => {
  const start = Math.floor(t * SR);
  const len = Math.floor(0.24 * SR);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const s = start + i;
    if (s < 0 || s >= N) continue;
    const x = i / SR;
    const burst = x < 0.02 ? 1 : Math.exp(-(x - 0.02) * 26);
    const noise = Math.random() * 2 - 1;
    lp += (noise - lp) * 0.45; // ざらつきを少し落とす
    buses.drums[s] += (noise - lp) * burst * gain * 0.3;
  }
};

const addHat = (t, gain, open = false) => {
  const start = Math.floor(t * SR);
  const len = Math.floor((open ? 0.18 : 0.05) * SR);
  let hp = 0;
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const s = start + i;
    if (s < 0 || s >= N) continue;
    const x = i / SR;
    const env = Math.exp(-x * (open ? 16 : 70));
    const noise = Math.random() * 2 - 1;
    hp = 0.86 * (hp + noise - prev); // ハイパス
    prev = noise;
    buses.drums[s] += hp * env * gain * 0.16;
  }
};

/** 場面転換の直前に入れる上昇ノイズ */
const addRiser = (t, dur, gain) => {
  const start = Math.floor(t * SR);
  const len = Math.floor(dur * SR);
  let hp = 0;
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const s = start + i;
    if (s < 0 || s >= N) continue;
    const p = i / len;
    const noise = Math.random() * 2 - 1;
    const k = 0.55 + 0.42 * p; // だんだん明るく
    hp = k * (hp + noise - prev);
    prev = noise;
    buses.drums[s] += hp * p * p * gain * 0.14;
  }
};

/* ------------------------------------------------------------------ *
 * 譜面を並べる
 * ------------------------------------------------------------------ */

// サビのメロディ（4小節 = 16拍。[開始拍, 音高, 長さ拍]）
const LEAD_PHRASE = [
  [0, 76, 1], [1, 79, 0.5], [1.5, 76, 0.5], [2, 72, 1.5], [3.5, 74, 0.5],
  [4, 74, 1], [5, 71, 0.5], [5.5, 74, 0.5], [6, 79, 2],
  [8, 72, 1], [9, 76, 1], [10, 81, 1.5], [11.5, 79, 0.5],
  [12, 77, 1], [13, 76, 1], [14, 72, 2],
];

// アルペジオの並び順（8分音符×8＝1小節）
const ARP = [0, 1, 2, 1, 3, 2, 1, 2]; // 3 は最低音の1オクターブ上

for (let bar = 0; bar < TOTAL_BARS; bar++) {
  const barT = bar * BAR;
  const mix = arrangement(bar);
  const chord = chordAt(bar);
  const isSectionStart = SECTION_STARTS.includes(bar) || bar === 0;

  // --- パッド：小節いっぱい伸ばす
  if (mix.pad > 0) {
    for (const tone of chord.tones) {
      addPad(barT, midi(tone), mix.pad, BAR * 0.95);
    }
  }

  // --- ベース：頭と3拍目の裏
  if (mix.bass > 0) {
    addBass(barT, midi(chord.root), mix.bass, SPB * 1.6);
    addBass(barT + SPB * 2.5, midi(chord.root), mix.bass * 0.75, SPB * 1.2);
  }

  // --- アルペジオ：8分音符で回す
  if (mix.pluck > 0) {
    for (let i = 0; i < 8; i++) {
      const t = barT + i * SPB * 0.5;
      const idx = ARP[i];
      const note = idx === 3 ? chord.tones[0] + 12 : chord.tones[idx];
      const accent = i % 2 === 0 ? 1 : 0.68;
      addPluck(buses.pluck, t, midi(note + 12), mix.pluck * accent, 0.5, 7.5);
    }
    // きらきらした裏拍の装飾（16分）
    if (mix.pluck > 0.8) {
      addPluck(buses.pluck, barT + SPB * 3.75, midi(chord.tones[2] + 24), mix.pluck * 0.4, 0.3, 12);
    }
  }

  // --- メロディ
  if (mix.lead > 0) {
    const phraseBar = bar % 4;
    for (const [beat, note, len] of LEAD_PHRASE) {
      if (Math.floor(beat / 4) !== phraseBar) continue;
      const t = barT + (beat % 4) * SPB;
      addPluck(buses.lead, t, midi(note), mix.lead * 0.9, Math.min(len * SPB + 0.5, 1.6), 3.4);
    }
  }

  // --- ドラム
  if (mix.drums > 0) {
    const d = mix.drums;
    addKick(barT, d);
    addKick(barT + SPB * 2, d * 0.92);
    if (d > 0.7) addKick(barT + SPB * 3.5, d * 0.6);
    addClap(barT + SPB, d * 0.9);
    addClap(barT + SPB * 3, d * 0.9);
    const hatStep = d > 0.7 ? 0.25 : 0.5; // 濃い場面は16分
    for (let b = 0; b < 4; b += hatStep) {
      const open = d > 0.7 && Math.abs(b - 3.5) < 1e-6;
      addHat(barT + b * SPB, d * (b % 1 === 0 ? 0.9 : 0.55), open);
    }
  }

  // --- 区切りのアクセント
  if (isSectionStart) {
    addBell(barT, midi(chord.tones[2] + 12), Math.max(0.5, mix.bell));
    if (mix.drums > 0.3) addHat(barT, 1.2, true);
  }
  if (mix.bell > 0.5 && bar % 4 === 0) {
    addBell(barT, midi(chord.tones[0] + 12), mix.bell * 0.8);
  }

  // --- 次のセクションへの助走
  if (SECTION_STARTS.includes(bar + 1)) {
    addRiser(barT + BAR * 0.5, BAR * 0.5, 1);
  }
}

// 終わりの余韻
addBell(TOTAL_BARS * BAR - BAR, midi(72), 1.1, 5.5);
addBell(TOTAL_BARS * BAR - BAR, midi(79), 0.8, 5.5);

/* ------------------------------------------------------------------ *
 * 空間系と書き出し
 * ------------------------------------------------------------------ */

/** コムフィルタ＋オールパスの簡易リバーブ */
const reverb = (input, seed) => {
  const out = new Float32Array(N);
  const combs = [1487, 1601, 1723, 1861].map((d) => d + seed);
  const fbs = [0.79, 0.77, 0.75, 0.73];
  for (let c = 0; c < combs.length; c++) {
    const d = combs[c];
    const buf = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp += (y - lp) * 0.42; // 高域を丸める
      buf[idx] = input[i] + lp * fbs[c];
      idx = (idx + 1) % d;
      out[i] += y * 0.25;
    }
  }
  for (const d of [225 + seed, 556 + seed]) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      const x = out[i];
      buf[idx] = x + y * 0.5;
      out[i] = y - x * 0.5;
      idx = (idx + 1) % d;
    }
  }
  return out;
};

const DRY = {pad: 0.55, pluck: 0.9, bass: 1, drums: 1, bell: 0.55, lead: 0.85};
const WET = {pad: 0.5, pluck: 0.2, bass: 0, drums: 0.06, bell: 0.55, lead: 0.28};

const sendL = new Float32Array(N);
const sendR = new Float32Array(N);
const dry = new Float32Array(N);

for (const [name, buf] of Object.entries(buses)) {
  const d = DRY[name];
  const w = WET[name];
  for (let i = 0; i < N; i++) {
    dry[i] += buf[i] * d;
    if (w > 0) {
      sendL[i] += buf[i] * w;
      sendR[i] += buf[i] * w;
    }
  }
}

// 左右でリバーブの長さを変えて自然な広がりを作る
const revL = reverb(sendL, 0);
const revR = reverb(sendR, 37);

const left = new Float32Array(N);
const right = new Float32Array(N);
const FADE_IN = 1.2 * SR;
const FADE_OUT = 4.5 * SR;

for (let i = 0; i < N; i++) {
  let l = dry[i] + revL[i] * 0.55;
  let r = dry[i] + revR[i] * 0.55;
  let g = 1;
  if (i < FADE_IN) g *= i / FADE_IN;
  if (i > N - FADE_OUT) g *= (N - i) / FADE_OUT;
  left[i] = Math.tanh(l * 0.85 * g);
  right[i] = Math.tanh(r * 0.85 * g);
}

// ピークを揃える
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const norm = peak > 0 ? 0.89 / peak : 1;

const bytes = Buffer.alloc(44 + N * 4);
bytes.write('RIFF', 0);
bytes.writeUInt32LE(36 + N * 4, 4);
bytes.write('WAVE', 8);
bytes.write('fmt ', 12);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(2, 22);
bytes.writeUInt32LE(SR, 24);
bytes.writeUInt32LE(SR * 4, 28);
bytes.writeUInt16LE(4, 32);
bytes.writeUInt16LE(16, 34);
bytes.write('data', 36);
bytes.writeUInt32LE(N * 4, 40);

for (let i = 0; i < N; i++) {
  bytes.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(left[i] * norm * 32767))), 44 + i * 4);
  bytes.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(right[i] * norm * 32767))), 46 + i * 4);
}

writeFileSync('public/bgm.wav', bytes);
console.log(`public/bgm.wav を書き出しました（${DURATION}秒 / ${TOTAL_BARS}小節 / ${BPM}BPM / ピーク ${(peak * norm).toFixed(2)}）`);
