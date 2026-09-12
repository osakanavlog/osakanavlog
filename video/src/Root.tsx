import React from 'react';
import {Composition} from 'remotion';
import {IntemaPR} from './IntemaPR';
import {TOTAL_FRAMES} from './timeline';
import {FPS, HEIGHT, WIDTH} from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    {/* 本編：1920x1080 / 30fps / 5400 フレーム = 3 分ちょうど */}
    <Composition
      id="IntemaPR"
      component={IntemaPR}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />

  </>
);
