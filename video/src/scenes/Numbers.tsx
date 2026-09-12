import React from 'react';
import {numbers, draftMode} from '../content';
import {colors, fontSize} from '../theme';
import {SceneLayout} from '../components/SceneLayout';
import {Heading, Kicker} from '../components/Typography';
import {StatCounter} from '../components/StatCounter';
import {useEnter} from '../components/anim';

export const Numbers: React.FC<{durationInFrames: number}> = ({durationInFrames}) => {
  const noteEnter = useEnter(360);
  const hasPlaceholder = numbers.items.some((n) => n.value === null);

  return (
    <SceneLayout durationInFrames={durationInFrames}>
      <Kicker>{numbers.kicker}</Kicker>
      <Heading tone="light">{numbers.heading}</Heading>

      <div style={{display: 'flex', gap: 48, marginTop: 96, width: '100%'}}>
        {numbers.items.map((n, i) => (
          <StatCounter
            key={n.label}
            value={n.value}
            unit={n.unit}
            label={n.label}
            delay={130 + i * 50}
          />
        ))}
      </div>

      {draftMode && hasPlaceholder ? (
        <div
          style={{
            marginTop: 70,
            fontSize: fontSize.caption,
            color: colors.onLightMuted,
            opacity: noteEnter,
          }}
        >
          ※ 数値は未入力です。src/content.ts の numbers に実数を入れるとカウントアップ表示になります。
        </div>
      ) : null}
    </SceneLayout>
  );
};
