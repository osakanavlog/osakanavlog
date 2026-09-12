import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {PLACED} from './timeline';
import {fontFamily} from './theme';
import {Background} from './components/Background';
import {Chrome} from './components/Chrome';
import {Opening} from './scenes/Opening';
import {Region} from './scenes/Region';
import {About} from './scenes/About';
import {Services} from './scenes/Services';
import {Process} from './scenes/Process';
import {Strengths} from './scenes/Strengths';
import {Numbers} from './scenes/Numbers';
import {Voices} from './scenes/Voices';
import {Closing} from './scenes/Closing';

const SCENE_COMPONENTS: Record<string, React.FC<{durationInFrames: number}>> = {
  opening: Opening,
  region: Region,
  about: About,
  services: Services,
  process: Process,
  strengths: Strengths,
  numbers: Numbers,
  voices: Voices,
  closing: Closing,
};

export const IntemizePR: React.FC = () => (
  <AbsoluteFill style={{fontFamily}}>
    <Background />

    {PLACED.map((scene) => {
      const Scene = SCENE_COMPONENTS[scene.id];
      return (
        <Sequence
          key={scene.id}
          name={scene.chapter}
          from={scene.from}
          durationInFrames={scene.durationInFrames}
        >
          <Scene durationInFrames={scene.durationInFrames} />
        </Sequence>
      );
    })}

    <Chrome />

    {/*
      BGM を付ける場合:
      1. public/bgm.mp3 に音源を置く（著作権の許諾があるものだけ）
      2. 下の 2 行のコメントを外す
      import {Audio, staticFile} from 'remotion';
      <Audio src={staticFile('bgm.mp3')} volume={(f) => interpolate(f, [0, 60], [0, 0.35], {extrapolateRight: 'clamp'})} />
    */}
  </AbsoluteFill>
);
