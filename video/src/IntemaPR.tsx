import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
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
import {Fields} from './scenes/Fields';
import {Closing} from './scenes/Closing';

const SCENE_COMPONENTS: Record<string, React.FC<{durationInFrames: number}>> = {
  opening: Opening,
  region: Region,
  about: About,
  services: Services,
  process: Process,
  strengths: Strengths,
  numbers: Numbers,
  fields: Fields,
  closing: Closing,
};

export const IntemaPR: React.FC = () => (
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
      BGM。tools/make-bgm.mjs で生成したオリジナル曲（public/bgm.mp3）。
      作り直すときは `npm run bgm` → mp3 に変換。
    */}
    <Audio src={staticFile('bgm.mp3')} volume={0.72} />
  </AbsoluteFill>
);
