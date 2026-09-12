import {colors} from './theme';

export type SceneTone = 'dark' | 'light';

export type SceneDef = {
  id: string;
  /** 章タイトル（進行バーに表示） */
  chapter: string;
  durationInFrames: number;
  tone: SceneTone;
  /** 背景（CSS の background 値） */
  background: string;
};

const navy = (angle: number, glow: string) =>
  `radial-gradient(120% 90% at ${angle}% 10%, ${glow} 0%, rgba(0,0,0,0) 60%), linear-gradient(160deg, ${colors.base} 0%, ${colors.baseDeep} 100%)`;

/**
 * 30fps / 合計 5400 フレーム = ちょうど 3 分。
 * 尺を変える場合は durationInFrames を調整してください（合計が動画の長さになります）。
 */
export const SCENES: SceneDef[] = [
  {id: 'opening', chapter: 'OPENING', durationInFrames: 360, tone: 'dark', background: navy(50, 'rgba(224,162,90,0.30)')},
  {id: 'region', chapter: '対応エリア', durationInFrames: 600, tone: 'dark', background: navy(18, 'rgba(156,180,155,0.24)')},
  {id: 'about', chapter: '私たちについて', durationInFrames: 690, tone: 'dark', background: navy(82, 'rgba(224,162,90,0.20)')},
  {id: 'services', chapter: '事業内容', durationInFrames: 750, tone: 'dark', background: navy(50, 'rgba(224,162,90,0.17)')},
  {id: 'process', chapter: '仕事の進め方', durationInFrames: 750, tone: 'dark', background: navy(15, 'rgba(224,162,90,0.19)')},
  {id: 'strengths', chapter: '選ばれる理由', durationInFrames: 810, tone: 'dark', background: navy(85, 'rgba(156,180,155,0.22)')},
  {
    id: 'numbers',
    chapter: '数字で見る',
    durationInFrames: 600,
    tone: 'light',
    background: `radial-gradient(110% 80% at 70% 0%, #FFFFFF 0%, rgba(255,255,255,0) 55%), linear-gradient(170deg, ${colors.light} 0%, #E8DCCA 100%)`,
  },
  {id: 'fields', chapter: '手がけるところ', durationInFrames: 540, tone: 'dark', background: navy(30, 'rgba(224,162,90,0.19)')},
  {id: 'closing', chapter: 'CLOSING', durationInFrames: 300, tone: 'dark', background: navy(50, 'rgba(224,162,90,0.36)')},
];

export type PlacedScene = SceneDef & {from: number; to: number};

export const PLACED: PlacedScene[] = (() => {
  let cursor = 0;
  return SCENES.map((s) => {
    const placed = {...s, from: cursor, to: cursor + s.durationInFrames};
    cursor += s.durationInFrames;
    return placed;
  });
})();

export const TOTAL_FRAMES = PLACED[PLACED.length - 1].to;

/** シーンの切り替わりで背景をクロスフェードさせる長さ */
export const CROSSFADE = 20;
