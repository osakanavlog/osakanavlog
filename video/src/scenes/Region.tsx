import React from 'react';
import {useContent} from '../ContentContext';
import {colors, fontSize} from '../theme';
import {riseUp, useEnter} from '../components/anim';
import {SceneLayout} from '../components/SceneLayout';
import {Heading, Kicker, Lead} from '../components/Typography';

export const Region: React.FC<{durationInFrames: number}> = ({durationInFrames}) => {
  const {region} = useContent();

  return (
  <SceneLayout durationInFrames={durationInFrames}>
    <Kicker>{region.kicker}</Kicker>
    <Heading>{region.heading}</Heading>
    <Lead>{region.lead}</Lead>

    <div style={{display: 'flex', gap: 56, marginTop: 72, width: '100%'}}>
      {region.points.map((p, i) => (
        <Point key={p.label} label={p.label} text={p.text} delay={150 + i * 70} />
      ))}
    </div>
  </SceneLayout>
  );
};

const Point: React.FC<{label: string; text: string; delay: number}> = ({label, text, delay}) => {
  const enter = useEnter(delay);
  return (
    <div
      style={{
        flex: 1,
        opacity: enter,
        transform: riseUp(enter, 30),
        borderTop: `3px solid ${colors.accent}`,
        paddingTop: 26,
      }}
    >
      <div
        style={{
          fontSize: fontSize.h3,
          fontWeight: 900,
          color: colors.onDark,
          marginBottom: 16,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: fontSize.body,
          lineHeight: 1.8,
          color: colors.onDarkMuted,
          whiteSpace: 'pre-line',
        }}
      >
        {text}
      </div>
    </div>
  );
};
