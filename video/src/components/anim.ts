import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

/** 遅延つきの登場アニメーション（0 → 1） */
export const useEnter = (delay = 0, durationInFrames = 22) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: {damping: 200},
    durationInFrames,
  });
};

/**
 * シーン単位の表示率。
 * 入りでフェードイン、終わりでフェードアウトする 0→1→0 の値。
 */
export const useSceneOpacity = (sceneDuration: number, fadeIn = 14, fadeOut = 14) => {
  const frame = useCurrentFrame();
  return interpolate(
    frame,
    [0, fadeIn, sceneDuration - fadeOut, sceneDuration],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
};

/** 登場値から transform 文字列を作る（下から持ち上げる定番の動き） */
export const riseUp = (enter: number, distance = 28) =>
  `translateY(${interpolate(enter, [0, 1], [distance, 0])}px)`;
