import React from 'react';
import {about} from '../content';
import {colors, fontSize} from '../theme';
import {riseUp, useEnter} from '../components/anim';
import {SceneLayout} from '../components/SceneLayout';
import {Heading, Kicker, Lead} from '../components/Typography';

export const About: React.FC<{durationInFrames: number}> = ({durationInFrames}) => (
  <SceneLayout durationInFrames={durationInFrames}>
    <div style={{display: 'flex', gap: 90, width: '100%', alignItems: 'flex-start'}}>
      <div style={{flex: 1.1}}>
        <Kicker>{about.kicker}</Kicker>
        <Heading>{about.heading}</Heading>
        <Lead size={fontSize.body}>{about.lead}</Lead>
      </div>

      <div style={{flex: 1, marginTop: 24}}>
        {about.facts.map((f, i) => (
          <FactRow key={f.label} label={f.label} value={f.value} delay={170 + i * 55} />
        ))}
      </div>
    </div>
  </SceneLayout>
);

const FactRow: React.FC<{label: string; value: string; delay: number}> = ({label, value, delay}) => {
  const enter = useEnter(delay);
  const filled = value.trim().length > 0;

  return (
    <div
      style={{
        display: 'flex',
        gap: 32,
        padding: '26px 0',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        opacity: enter,
        transform: riseUp(enter, 18),
      }}
    >
      <div
        style={{
          width: 190,
          flexShrink: 0,
          fontSize: fontSize.caption,
          letterSpacing: '0.1em',
          color: colors.accent,
          fontWeight: 700,
          paddingTop: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: fontSize.body,
          lineHeight: 1.6,
          color: filled ? colors.onDark : colors.onDarkMuted,
          fontStyle: filled ? 'normal' : 'italic',
        }}
      >
        {filled ? value : '—（未入力）'}
      </div>
    </div>
  );
};
