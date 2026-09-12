import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {PLACED, TOTAL_FRAMES} from '../timeline';
import {colors, fontSize, PADDING} from '../theme';
import {company, draftMode} from '../content';

/**
 * 動画全体に常時表示されるフレーム（進行バー・章名・社名・DRAFT 表示）。
 * オープニングとクロージングでは邪魔にならないよう薄くする。
 */
export const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const current = PLACED.find((s) => frame >= s.from && frame < s.to) ?? PLACED[0];
  const isEdge = current.id === 'opening' || current.id === 'closing';
  const tone = current.tone;

  const opacity = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) * (isEdge ? 0 : 1);

  const fg = tone === 'dark' ? colors.onDark : colors.onLight;
  const muted = tone === 'dark' ? colors.onDarkMuted : colors.onLightMuted;
  const progress = frame / TOTAL_FRAMES;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: 56,
          left: PADDING,
          right: PADDING,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity,
          fontSize: fontSize.caption,
          letterSpacing: '0.12em',
          color: muted,
        }}
      >
        <span style={{fontWeight: 700, color: fg}}>{company.name}</span>
        <span>{current.chapter}</span>
      </div>

      {/* 進行バー */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '100%',
          height: 5,
          background: tone === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(11,42,56,0.10)',
          opacity,
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: colors.accent,
          }}
        />
      </div>

      {draftMode ? <DraftBadge /> : null}
    </AbsoluteFill>
  );
};

const DraftBadge: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: 44,
      right: 44,
      padding: '10px 22px',
      borderRadius: 999,
      background: '#FFC400',
      color: '#2A1D00',
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: '0.08em',
    }}
  >
    DRAFT — 要テキスト差し替え
  </div>
);
