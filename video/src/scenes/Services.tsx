import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useContent} from '../ContentContext';
import {colors} from '../theme';
import {SceneLayout} from '../components/SceneLayout';
import {Heading, Kicker} from '../components/Typography';
import {Card} from '../components/Card';

/**
 * 3 枚のカードを出したあと、時間をかけて 1 枚ずつフォーカスを移していく。
 * 25 秒間ずっと同じ絵にならないようにするための仕掛け。
 */
export const Services: React.FC<{durationInFrames: number}> = ({durationInFrames}) => {
  const {services} = useContent();
  const frame = useCurrentFrame();
  const focusStart = 250;
  const per = (durationInFrames - focusStart - 40) / services.items.length;
  /** 小数のフォーカス位置。カード間をなめらかに移動する */
  const focusPos = (frame - focusStart) / per - 0.5;

  return (
    <SceneLayout durationInFrames={durationInFrames}>
      <Kicker>{services.kicker}</Kicker>
      <Heading>{services.heading}</Heading>

      <div style={{display: 'flex', gap: 40, marginTop: 80, width: '100%', alignItems: 'stretch'}}>
        {services.items.map((item, i) => {
          const weight =
            frame < focusStart ? 1 : Math.max(0, Math.min(1, 1 - Math.abs(focusPos - i)));
          return (
            <div
              key={item.no}
              style={{
                display: 'flex',
                flex: 1,
                transform: `scale(${1 + weight * 0.04})`,
                filter: `saturate(${0.55 + weight * 0.45}) brightness(${0.74 + weight * 0.26})`,
                outline: `2px solid ${colors.accent}`,
                outlineColor: `rgba(224,162,90,${frame < focusStart ? 0 : weight * 0.9})`,
                outlineOffset: 6,
                borderRadius: 22,
                opacity: interpolate(frame, [110 + i * 24, 145 + i * 24], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
              }}
            >
              <Card no={item.no} title={item.title} text={item.text} delay={110 + i * 24} />
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 46,
          fontSize: 24,
          letterSpacing: '0.1em',
          color: colors.onDarkMuted,
          opacity: interpolate(frame, [200, 240], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        {String(services.items.length).padStart(2, '0')} SERVICES
      </div>
    </SceneLayout>
  );
};
