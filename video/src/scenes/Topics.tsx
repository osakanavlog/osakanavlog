import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useContent} from '../ContentContext';
import {colors, fontSize} from '../theme';
import {riseUp, useEnter} from '../components/anim';
import {SceneLayout} from '../components/SceneLayout';
import {Heading, Kicker} from '../components/Typography';

/**
 * ブログ記事の紹介。相手に「もっと見たい」と思ってもらうための導線。
 * content.ts の topics.items を空にすると、このシーンは見出しだけになる。
 */
export const Topics: React.FC<{durationInFrames: number}> = ({durationInFrames}) => {
  const {topics, closing} = useContent();
  const frame = useCurrentFrame();

  const urlOpacity = interpolate(frame, [durationInFrames - 110, durationInFrames - 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <SceneLayout durationInFrames={durationInFrames}>
      <Kicker>{topics.kicker}</Kicker>
      <Heading>{topics.heading}</Heading>

      <div style={{marginTop: 56, width: '100%'}}>
        {topics.items.map((item, i) => (
          <TopicRow key={item.title} title={item.title} note={item.note} delay={70 + i * 48} />
        ))}
      </div>

      {closing.url ? (
        <div
          style={{
            marginTop: 44,
            fontSize: fontSize.caption,
            letterSpacing: '0.08em',
            color: colors.onDarkMuted,
            opacity: urlOpacity,
          }}
        >
          ほかの記事・施工事例は {closing.url} から
        </div>
      ) : null}
    </SceneLayout>
  );
};

const TopicRow: React.FC<{title: string; note: string; delay: number}> = ({title, note, delay}) => {
  const enter = useEnter(delay);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 36,
        padding: '30px 0',
        borderTop: '1px solid rgba(255,255,255,0.13)',
        opacity: enter,
        transform: riseUp(enter, 22),
      }}
    >
      <span
        style={{
          flexShrink: 0,
          marginTop: 10,
          padding: '6px 18px',
          borderRadius: 999,
          border: `2px solid ${colors.accent}`,
          color: colors.accent,
          fontSize: 22,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {note}
      </span>
      <span
        style={{
          fontSize: fontSize.h3,
          lineHeight: 1.5,
          fontWeight: 700,
          color: colors.onDark,
          whiteSpace: 'pre-line',
        }}
      >
        {title}
      </span>
    </div>
  );
};
