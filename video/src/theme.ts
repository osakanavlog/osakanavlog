/**
 * 配色・タイポグラフィのトークン。
 * ブランドカラーが決まっている場合は colors だけ差し替えれば全体に反映される。
 */
export {fontFamily} from './font';

export const colors = {
  /** 基調色（深い藍 — 三次の夜明け前の空） */
  base: '#07202C',
  baseDeep: '#04141C',
  /** 面の色 */
  surface: 'rgba(255, 255, 255, 0.06)',
  surfaceSolid: '#0E3446',
  /** 明るい背景のシーン用 */
  light: '#F2F8FA',
  lightSurface: '#FFFFFF',
  /** アクセント（川の水色） */
  accent: '#2FC6DE',
  /** サブアクセント（中国山地の緑） */
  accent2: '#8FD694',
  /** 文字色 */
  onDark: '#ECF6FA',
  onDarkMuted: '#8FB2C0',
  onLight: '#0B2A38',
  onLightMuted: '#55747F',
} as const;

export const fontSize = {
  kicker: 28,
  display: 132,
  h1: 92,
  h2: 64,
  h3: 44,
  lead: 38,
  body: 30,
  caption: 24,
} as const;

/** 画面外周の余白 */
export const PADDING = 140;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
