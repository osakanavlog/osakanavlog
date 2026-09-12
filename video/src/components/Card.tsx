import React from 'react';
import {colors, fontSize} from '../theme';
import {riseUp, useEnter} from './anim';

export const Card: React.FC<{
  no?: string;
  title: string;
  text: string;
  delay?: number;
  tone?: 'dark' | 'light';
}> = ({no, title, text, delay = 0, tone = 'dark'}) => {
  const enter = useEnter(delay);
  const isDark = tone === 'dark';

  return (
    <div
      style={{
        flex: 1,
        padding: '48px 44px',
        borderRadius: 20,
        background: isDark ? colors.surface : colors.lightSurface,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(11,42,56,0.08)'}`,
        opacity: enter,
        transform: riseUp(enter, 36),
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {no ? (
        <span
          style={{
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: '0.1em',
            color: colors.accent,
          }}
        >
          {no}
        </span>
      ) : null}
      <h3
        style={{
          margin: 0,
          fontSize: fontSize.h3,
          fontWeight: 700,
          lineHeight: 1.35,
          color: isDark ? colors.onDark : colors.onLight,
          whiteSpace: 'pre-line',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: fontSize.body,
          lineHeight: 1.8,
          color: isDark ? colors.onDarkMuted : colors.onLightMuted,
          whiteSpace: 'pre-line',
        }}
      >
        {text}
      </p>
    </div>
  );
};
