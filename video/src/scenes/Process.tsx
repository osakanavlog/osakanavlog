import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useContent} from '../ContentContext';
import {colors, fontSize} from '../theme';
import {riseUp, useEnter} from '../components/anim';
import {SceneLayout} from '../components/SceneLayout';
import {Heading, Kicker, Lead} from '../components/Typography';

/** 4 ステップを、線が伸びるのに合わせて順に出す */
export const Process: React.FC<{durationInFrames: number}> = ({durationInFrames}) => {
  const {process: processContent} = useContent();
  const frame = useCurrentFrame();
  const steps = processContent.steps;
  const start = 170;
  const per = (durationInFrames - start - 90) / steps.length;

  const lineProgress = interpolate(frame, [start, start + per * steps.length], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <SceneLayout durationInFrames={durationInFrames}>
      <Kicker>{processContent.kicker}</Kicker>
      <Heading>{processContent.heading}</Heading>
      <Lead size={fontSize.body}>{processContent.lead}</Lead>

      <div style={{position: 'relative', width: '100%', marginTop: 90}}>
        {/* 背景のガイド線 */}
        <div
          style={{
            position: 'absolute',
            top: 26,
            left: 0,
            width: '100%',
            height: 2,
            background: 'rgba(255,255,255,0.12)',
          }}
        />
        {/* 伸びていく線 */}
        <div
          style={{
            position: 'absolute',
            top: 25,
            left: 0,
            width: `${lineProgress * 100}%`,
            height: 4,
            background: colors.accent,
          }}
        />

        <div style={{display: 'flex', gap: 40}}>
          {steps.map((s, i) => (
            <Step key={s.no} no={s.no} title={s.title} text={s.text} delay={start + i * per} />
          ))}
        </div>
      </div>
    </SceneLayout>
  );
};

const Step: React.FC<{no: string; title: string; text: string; delay: number}> = ({
  no,
  title,
  text,
  delay,
}) => {
  const enter = useEnter(delay);
  return (
    <div style={{flex: 1, opacity: enter, transform: riseUp(enter, 26)}}>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: colors.accent,
          color: '#2B2320',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: 24,
        }}
      >
        {no}
      </div>
      <div
        style={{
          marginTop: 30,
          fontSize: fontSize.h3,
          fontWeight: 700,
          color: colors.onDark,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: fontSize.body,
          lineHeight: 1.75,
          color: colors.onDarkMuted,
          whiteSpace: 'pre-line',
        }}
      >
        {text}
      </div>
    </div>
  );
};
