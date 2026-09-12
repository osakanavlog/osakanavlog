import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {company} from '../content';
import {useContent} from '../ContentContext';
import {colors, fontSize} from '../theme';
import {riseUp, useEnter} from '../components/anim';
import {useSceneOpacity} from '../components/anim';
import {Logo} from '../components/Logo';

export const Opening: React.FC<{durationInFrames: number}> = ({durationInFrames}) => {
  const {opening} = useContent();
  const frame = useCurrentFrame();
  const sceneOpacity = useSceneOpacity(durationInFrames, 10, 20);

  const nameEnter = useEnter(34);
  const taglineEnter = useEnter(74);
  const cityEnter = useEnter(104);

  /** 全体をごくゆっくり寄せて、静止画に見えないようにする */
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.045]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity: sceneOpacity,
        transform: `scale(${zoom})`,
      }}
    >
      <div
        style={{
          marginBottom: 40,
          fontSize: 22,
          letterSpacing: '0.34em',
          fontWeight: 700,
          color: colors.onDarkMuted,
          opacity: interpolate(frame, [6, 30], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          textIndent: '0.34em',
        }}
      >
        {opening.kicker}
      </div>

      <Logo size={180} delay={0} />

      <div
        style={{
          marginTop: 44,
          fontSize: fontSize.kicker,
          letterSpacing: '0.5em',
          fontWeight: 500,
          color: colors.accent,
          opacity: interpolate(frame, [20, 44], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          textIndent: '0.5em',
        }}
      >
        {company.nameEn}
      </div>

      <h1
        style={{
          margin: '18px 0 0',
          fontSize: fontSize.display,
          fontWeight: 900,
          letterSpacing: '0.04em',
          color: colors.onDark,
          opacity: nameEnter,
          transform: riseUp(nameEnter, 30),
        }}
      >
        {company.name}
      </h1>

      <p
        style={{
          margin: '30px 0 0',
          fontSize: fontSize.h3,
          fontWeight: 500,
          lineHeight: 1.5,
          textAlign: 'center',
          color: colors.onDark,
          opacity: taglineEnter,
          transform: riseUp(taglineEnter, 24),
          whiteSpace: 'pre-line',
        }}
      >
        {opening.lines.join('\n')}
      </p>

      <p
        style={{
          margin: '22px 0 0',
          fontSize: fontSize.body,
          color: colors.onDarkMuted,
          opacity: cityEnter,
        }}
      >
        {opening.tagline}
      </p>

      <div
        style={{
          marginTop: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: fontSize.caption,
          letterSpacing: '0.2em',
          color: colors.onDarkMuted,
          opacity: cityEnter,
        }}
      >
        <span style={{width: 40, height: 1, background: colors.onDarkMuted}} />
        {company.city}
        <span style={{width: 40, height: 1, background: colors.onDarkMuted}} />
      </div>
    </AbsoluteFill>
  );
};
