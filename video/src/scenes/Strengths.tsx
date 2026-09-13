import React from 'react';
import {Sequence} from 'remotion';
import {useContent} from '../ContentContext';
import {colors, fontSize} from '../theme';
import {riseUp, useEnter, useSceneOpacity} from '../components/anim';
import {SceneLayout} from '../components/SceneLayout';
import {Heading, Kicker} from '../components/Typography';

/** 強みは 1 つずつ大きく見せる。テロップ的に順送りする */
export const Strengths: React.FC<{durationInFrames: number}> = ({durationInFrames}) => {
  const {strengths} = useContent();
  const start = 60;
  const per = Math.floor((durationInFrames - start) / strengths.items.length);

  return (
    <SceneLayout durationInFrames={durationInFrames}>
      <Kicker>{strengths.kicker}</Kicker>
      <Heading>{strengths.heading}</Heading>

      <div style={{position: 'relative', width: '100%', height: 420, marginTop: 60}}>
        {strengths.items.map((item, i) => (
          <Sequence key={item.no} from={start + i * per} durationInFrames={per} layout="none">
            <StrengthItem
              no={item.no}
              title={item.title}
              text={item.text}
              durationInFrames={per}
              total={strengths.items.length}
              index={i}
            />
          </Sequence>
        ))}
      </div>
    </SceneLayout>
  );
};

const StrengthItem: React.FC<{
  no: string;
  title: string;
  text: string;
  durationInFrames: number;
  total: number;
  index: number;
}> = ({no, title, text, durationInFrames, total, index}) => {
  const opacity = useSceneOpacity(durationInFrames, 16, 16);
  const enter = useEnter(4, 26);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 70,
        opacity,
      }}
    >
      <div
        style={{
          fontSize: 250,
          fontWeight: 900,
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: `3px ${colors.accent}`,
          transform: riseUp(enter, 40),
          flexShrink: 0,
        }}
      >
        {no}
      </div>

      <div style={{transform: riseUp(enter, 30), opacity: enter}}>
        <div
          style={{
            fontSize: fontSize.h1,
            fontWeight: 900,
            lineHeight: 1.3,
            color: colors.onDark,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 30,
            maxWidth: 900,
            fontSize: fontSize.lead,
            lineHeight: 1.8,
            color: colors.onDarkMuted,
            whiteSpace: 'pre-line',
          }}
        >
          {text}
        </div>
      </div>

      {/* 何番目かのインジケーター */}
      <div style={{position: 'absolute', right: 0, bottom: 0, display: 'flex', gap: 10}}>
        {Array.from({length: total}).map((_, i) => (
          <span
            key={i}
            style={{
              width: i === index ? 40 : 12,
              height: 6,
              borderRadius: 3,
              background: i === index ? colors.accent : 'rgba(255,255,255,0.22)',
            }}
          />
        ))}
      </div>
    </div>
  );
};
