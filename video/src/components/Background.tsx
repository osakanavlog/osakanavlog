import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {CROSSFADE, PLACED} from '../timeline';
import {colors} from '../theme';

/**
 * 全シーンの背景を重ねて置き、グローバルなフレーム位置でクロスフェードする。
 * こうすることでシーンをまたいでも背景が途切れない。
 */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{background: colors.baseDeep}}>
      {PLACED.map((scene, i) => {
        const opacity =
          i === 0
            ? interpolate(frame, [scene.to - CROSSFADE, scene.to], [1, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
            : interpolate(
                frame,
                [scene.from - CROSSFADE, scene.from, scene.to - CROSSFADE, scene.to],
                [0, 1, 1, i === PLACED.length - 1 ? 1 : 0],
                {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
              );

        if (opacity <= 0) {
          return null;
        }

        return <AbsoluteFill key={scene.id} style={{background: scene.background, opacity}} />;
      })}
      <Grain />
    </AbsoluteFill>
  );
};

/** うっすらとした横線。のっぺりした単色を避けるための装飾 */
const Grain: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        'repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 4px)',
      pointerEvents: 'none',
    }}
  />
);
