import React from 'react';
import {colors, fontSize} from '../theme';
import {riseUp, useEnter} from './anim';

type ToneProps = {tone?: 'dark' | 'light'};

const textColor = (tone: 'dark' | 'light') => (tone === 'dark' ? colors.onDark : colors.onLight);
const mutedColor = (tone: 'dark' | 'light') => (tone === 'dark' ? colors.onDarkMuted : colors.onLightMuted);

/** セクション上部の小さな英字ラベル */
export const Kicker: React.FC<{children: React.ReactNode; delay?: number}> = ({
  children,
  delay = 0,
}) => {
  const enter = useEnter(delay);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        opacity: enter,
        transform: riseUp(enter, 14),
      }}
    >
      <span
        style={{
          display: 'block',
          width: interpolateWidth(enter),
          height: 3,
          background: colors.accent,
        }}
      />
      <span
        style={{
          fontSize: fontSize.kicker,
          fontWeight: 700,
          letterSpacing: '0.22em',
          color: colors.accent,
        }}
      >
        {children}
      </span>
    </div>
  );
};

const interpolateWidth = (enter: number) => `${Math.round(enter * 64)}px`;

/** セクション見出し */
export const Heading: React.FC<{children: React.ReactNode; delay?: number; size?: number} & ToneProps> = ({
  children,
  delay = 4,
  size = fontSize.h2,
  tone = 'dark',
}) => {
  const enter = useEnter(delay);
  return (
    <h2
      style={{
        margin: '24px 0 0',
        fontSize: size,
        lineHeight: 1.24,
        fontWeight: 900,
        letterSpacing: '0.02em',
        color: textColor(tone),
        opacity: enter,
        transform: riseUp(enter, 26),
        whiteSpace: 'pre-line',
      }}
    >
      {children}
    </h2>
  );
};

/** 本文リード */
export const Lead: React.FC<{children: React.ReactNode; delay?: number; size?: number} & ToneProps> = ({
  children,
  delay = 10,
  size = fontSize.lead,
  tone = 'dark',
}) => {
  const enter = useEnter(delay);
  return (
    <p
      style={{
        margin: '28px 0 0',
        maxWidth: 1480,
        fontSize: size,
        lineHeight: 1.85,
        fontWeight: 400,
        color: mutedColor(tone),
        opacity: enter,
        transform: riseUp(enter, 20),
        whiteSpace: 'pre-line',
      }}
    >
      {children}
    </p>
  );
};
