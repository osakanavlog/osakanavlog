import React from 'react';
import {Sequence} from 'remotion';
import {voices} from '../content';
import {colors, fontSize} from '../theme';
import {riseUp, useEnter, useSceneOpacity} from '../components/anim';
import {SceneLayout} from '../components/SceneLayout';
import {Heading, Kicker} from '../components/Typography';

export const Voices: React.FC<{durationInFrames: number}> = ({durationInFrames}) => {
  const start = 60;
  const per = Math.floor((durationInFrames - start) / voices.items.length);

  return (
    <SceneLayout durationInFrames={durationInFrames}>
      <Kicker>{voices.kicker}</Kicker>
      <Heading>{voices.heading}</Heading>

      <div style={{position: 'relative', width: '100%', height: 380, marginTop: 66}}>
        {voices.items.map((v, i) => (
          <Sequence key={v.name + i} from={start + i * per} durationInFrames={per} layout="none">
            <VoiceCard
              quote={v.quote}
              name={v.name}
              role={v.role}
              durationInFrames={per}
            />
          </Sequence>
        ))}
      </div>
    </SceneLayout>
  );
};

const VoiceCard: React.FC<{
  quote: string;
  name: string;
  role: string;
  durationInFrames: number;
}> = ({quote, name, role, durationInFrames}) => {
  const opacity = useSceneOpacity(durationInFrames, 16, 16);
  const enter = useEnter(4, 26);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 56,
        opacity,
        transform: riseUp(enter, 26),
      }}
    >
      {/* 顔写真の置き場所。public/ に画像を置いて <Img> に差し替えてください */}
      <div
        style={{
          width: 260,
          height: 260,
          borderRadius: '50%',
          flexShrink: 0,
          background: `linear-gradient(150deg, ${colors.accent} 0%, ${colors.accent2} 100%)`,
          opacity: 0.28,
          border: `2px solid ${colors.accent}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.onDark,
          fontSize: fontSize.caption,
          letterSpacing: '0.1em',
        }}
      >
        PHOTO
      </div>

      <div>
        <div
          style={{
            fontSize: 120,
            lineHeight: 0.6,
            fontWeight: 900,
            color: colors.accent,
            opacity: 0.5,
          }}
        >
          &ldquo;
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: fontSize.lead,
            lineHeight: 1.85,
            color: colors.onDark,
            whiteSpace: 'pre-line',
          }}
        >
          {quote}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: fontSize.caption,
            letterSpacing: '0.08em',
            color: colors.onDarkMuted,
          }}
        >
          {name}　/　{role}
        </div>
      </div>
    </div>
  );
};
