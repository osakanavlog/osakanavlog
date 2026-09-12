import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {company} from '../content';
import {useContent} from '../ContentContext';
import {colors, fontSize} from '../theme';
import {riseUp, useEnter, useSceneOpacity} from '../components/anim';
import {Logo} from '../components/Logo';

export const Closing: React.FC<{durationInFrames: number}> = ({durationInFrames}) => {
  const {closing} = useContent();
  const frame = useCurrentFrame();
  const opacity = useSceneOpacity(durationInFrames, 18, 26);
  const nameEnter = useEnter(26);
  const msgEnter = useEnter(58);

  const contacts = [closing.url, closing.tel, closing.email].filter((c) => c.trim().length > 0);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
        transform: `scale(${interpolate(frame, [0, durationInFrames], [1.03, 1])})`,
      }}
    >
      <Logo size={140} delay={0} />

      <h2
        style={{
          margin: '36px 0 0',
          fontSize: fontSize.h1,
          fontWeight: 900,
          letterSpacing: '0.04em',
          color: colors.onDark,
          opacity: nameEnter,
          transform: riseUp(nameEnter, 24),
        }}
      >
        {company.name}
      </h2>

      <div
        style={{
          marginTop: 14,
          fontSize: fontSize.caption,
          letterSpacing: '0.4em',
          color: colors.accent,
          opacity: nameEnter,
          textIndent: '0.4em',
        }}
      >
        {company.nameEn}
      </div>

      <p
        style={{
          margin: '48px 0 0',
          fontSize: fontSize.lead,
          color: colors.onDarkMuted,
          opacity: msgEnter,
          transform: riseUp(msgEnter, 18),
        }}
      >
        {closing.message}
      </p>

      {contacts.length > 0 ? (
        <div
          style={{
            marginTop: 30,
            display: 'flex',
            gap: 40,
            fontSize: fontSize.body,
            color: colors.onDark,
            opacity: msgEnter,
          }}
        >
          {contacts.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
      ) : (
        <div
          style={{
            marginTop: 30,
            padding: '14px 30px',
            border: `2px dashed ${colors.onDarkMuted}`,
            borderRadius: 12,
            fontSize: fontSize.caption,
            color: colors.onDarkMuted,
            opacity: msgEnter,
          }}
        >
          連絡先を src/content.ts の closing に入力してください
        </div>
      )}

      <div
        style={{
          marginTop: 56,
          fontSize: fontSize.caption,
          letterSpacing: '0.2em',
          color: colors.onDarkMuted,
          opacity: msgEnter,
        }}
      >
        {company.city}
      </div>
    </AbsoluteFill>
  );
};
