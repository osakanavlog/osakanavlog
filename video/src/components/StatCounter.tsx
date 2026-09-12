import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {colors, fontSize} from '../theme';
import {riseUp, useEnter} from './anim';

/**
 * 数値のカウントアップ。
 * value が null のときは「未入力」のプレースホルダーを表示する
 * （事実が確認できていない数字を出さないため）。
 */
export const StatCounter: React.FC<{
  value: number | null;
  unit: string;
  label: string;
  delay?: number;
}> = ({value, unit, label, delay = 0}) => {
  const frame = useCurrentFrame();
  const enter = useEnter(delay);

  const counted =
    value === null
      ? null
      : Math.round(
          interpolate(frame, [delay + 6, delay + 46], [0, value], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: (t) => 1 - Math.pow(1 - t, 3),
          }),
        );

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12,
        opacity: enter,
        transform: riseUp(enter, 34),
      }}
    >
      <div style={{display: 'flex', alignItems: 'baseline', gap: 8, minHeight: 132}}>
        {counted === null ? (
          <span
            style={{
              display: 'inline-block',
              minWidth: 150,
              padding: '10px 22px',
              borderRadius: 14,
              border: `3px dashed ${colors.onLightMuted}`,
              color: colors.onLightMuted,
              fontSize: 56,
              fontWeight: 900,
              textAlign: 'center',
            }}
          >
            —
          </span>
        ) : (
          <span
            style={{
              fontSize: 132,
              fontWeight: 900,
              lineHeight: 1,
              color: colors.onLight,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {counted}
          </span>
        )}
        <span style={{fontSize: 40, fontWeight: 700, color: colors.accent}}>{unit}</span>
      </div>
      <span style={{fontSize: fontSize.body, color: colors.onLightMuted}}>{label}</span>
      <span
        style={{
          display: 'block',
          width: `${Math.round(enter * 100)}%`,
          height: 3,
          background: 'rgba(11,42,56,0.14)',
        }}
      />
    </div>
  );
};
