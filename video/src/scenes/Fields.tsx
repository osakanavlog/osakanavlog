import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {fields} from '../content';
import {colors, fontSize} from '../theme';
import {riseUp, useEnter} from '../components/anim';
import {SceneLayout} from '../components/SceneLayout';
import {Heading, Kicker, Lead} from '../components/Typography';

/** 手がける場所を 3 つ並べる。施工事例の写真を入れる場所でもある */
export const Fields: React.FC<{durationInFrames: number}> = ({durationInFrames}) => {
  const frame = useCurrentFrame();

  return (
    <SceneLayout durationInFrames={durationInFrames}>
      <Kicker>{fields.kicker}</Kicker>
      <Heading>{fields.heading}</Heading>
      <Lead size={fontSize.body}>{fields.lead}</Lead>

      <div style={{display: 'flex', gap: 40, marginTop: 64, width: '100%'}}>
        {fields.items.map((item, i) => (
          <FieldCard
            key={item.title}
            title={item.title}
            text={item.text}
            photo={fields.photos[i] ?? ''}
            delay={130 + i * 46}
            /** じわっと寄る。3 枚が少しずつずれて動く */
            drift={interpolate(frame, [0, durationInFrames], [0, -10 - i * 4])}
          />
        ))}
      </div>
    </SceneLayout>
  );
};

const FieldCard: React.FC<{
  title: string;
  text: string;
  photo: string;
  delay: number;
  drift: number;
}> = ({title, text, photo, delay, drift}) => {
  const enter = useEnter(delay);

  return (
    <div
      style={{
        flex: 1,
        opacity: enter,
        transform: `${riseUp(enter, 34)} translateY(${drift}px)`,
      }}
    >
      <div
        style={{
          aspectRatio: '4 / 3',
          borderRadius: 16,
          overflow: 'hidden',
          background: photo ? undefined : 'rgba(255,255,255,0.05)',
          border: photo ? 'none' : `2px dashed rgba(224,162,90,0.45)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.onDarkMuted,
          fontSize: fontSize.caption,
          letterSpacing: '0.14em',
        }}
      >
        {photo ? (
          <Img src={staticFile(photo)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        ) : (
          '施工事例の写真'
        )}
      </div>

      <div
        style={{
          marginTop: 26,
          fontSize: fontSize.h3,
          fontWeight: 700,
          color: colors.onDark,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 12,
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
