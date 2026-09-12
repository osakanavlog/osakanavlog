import React from 'react';
import {Composition} from 'remotion';
import {PRVideo} from './PRVideo';
import {TOTAL_FRAMES} from './timeline';
import {FPS, HEIGHT, WIDTH} from './theme';

/**
 * 同じ構成・同じ尺（1920x1080 / 30fps / 5400 フレーム = 3 分）で、
 * 相手に合わせて 2 本を書き出せるようにしている。
 */
export const RemotionRoot: React.FC = () => (
  <>
    {/* 一般のお客様向け */}
    <Composition
      id="PR-BtoC"
      component={PRVideo}
      defaultProps={{audience: 'btoc' as const}}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />

    {/* 法人・施設向け */}
    <Composition
      id="PR-BtoB"
      component={PRVideo}
      defaultProps={{audience: 'btob' as const}}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  </>
);
