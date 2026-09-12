import React from 'react';
import {interpolate} from 'remotion';
import {colors} from '../theme';
import {useEnter} from './anim';

/**
 * カーテンのドレープ（ひだ）をイメージした仮のシンボル。
 * 正式なロゴがある場合は public/logo.svg などに置いて、
 * この中身を <Img src={staticFile('logo.svg')} /> に差し替えてください。
 */
export const Logo: React.FC<{size?: number; delay?: number}> = ({size = 160, delay = 0}) => {
  const enter = useEnter(delay, 34);

  /** ひだが 1 本ずつ垂れ下がってくる */
  const drape = (i: number) => {
    const local = Math.max(0, Math.min(1, (enter - i * 0.12) / 0.64));
    return interpolate(local, [0, 1], [0, 1]);
  };

  const folds = [
    {x: 24, color: colors.accent},
    {x: 48, color: colors.onDark},
    {x: 72, color: colors.accent2},
    {x: 96, color: colors.accent},
  ];

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="インテリアマツヤマ">
      {/* カーテンレール */}
      <line
        x1={14}
        y1={24}
        x2={106}
        y2={24}
        stroke={colors.onDark}
        strokeWidth={5}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - Math.min(1, enter * 1.6)}
      />
      {folds.map((f, i) => {
        const p = drape(i);
        const bottom = 24 + p * 76;
        const bow = 14 * p * (i % 2 === 0 ? 1 : -1);
        return (
          <path
            key={f.x}
            d={`M${f.x} 24 Q ${f.x + bow} ${(24 + bottom) / 2}, ${f.x} ${bottom}`}
            stroke={f.color}
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
            opacity={p}
          />
        );
      })}
    </svg>
  );
};
