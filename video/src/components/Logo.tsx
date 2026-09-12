import React from 'react';
import {interpolate} from 'remotion';
import {colors} from '../theme';
import {useEnter} from './anim';

/**
 * 三次＝三つの川が合流するまち、をイメージした仮のシンボル。
 * 実際のロゴがある場合は public/logo.svg などに置いて、この中身を <Img> に差し替えてください。
 */
export const Logo: React.FC<{size?: number; delay?: number}> = ({size = 160, delay = 0}) => {
  const enter = useEnter(delay, 34);
  const draw = interpolate(enter, [0, 1], [1, 0]);

  const stroke = {
    fill: 'none',
    strokeWidth: 7,
    strokeLinecap: 'round' as const,
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: draw,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="インテマイズ">
      <path d="M12 22 C 52 22, 58 60, 108 60" stroke={colors.accent} {...stroke} />
      <path d="M12 60 L 108 60" stroke={colors.onDark} {...stroke} />
      <path d="M12 98 C 52 98, 58 60, 108 60" stroke={colors.accent2} {...stroke} />
      <circle cx="108" cy="60" r="7" fill={colors.accent} opacity={enter} />
    </svg>
  );
};
