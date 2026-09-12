/**
 * 配色・タイポグラフィのトークン。
 * ブランドカラーが決まっている場合は colors だけ差し替えれば全体に反映される。
 */
export {fontFamily} from './font';

export const colors = {
  /** 基調色（濃い木の色） */
  base: '#2B2320',
  baseDeep: '#191311',
  /** 面の色 */
  surface: 'rgba(255, 255, 255, 0.07)',
  surfaceSolid: '#3A2F2A',
  /** 明るい背景のシーン用（生成りのリネン） */
  light: '#F7F1E8',
  lightSurface: '#FFFFFF',
  /** アクセント（陽のあたる麻色） */
  accent: '#E0A25A',
  /** サブアクセント（くすんだ緑） */
  accent2: '#9CB49B',
  /** 文字色 */
  onDark: '#F6EFE6',
  onDarkMuted: '#BBA895',
  onLight: '#2B2320',
  onLightMuted: '#7B6A5B',
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
