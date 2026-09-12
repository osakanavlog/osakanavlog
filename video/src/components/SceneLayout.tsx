import React from 'react';
import {AbsoluteFill} from 'remotion';
import {PADDING} from '../theme';
import {useSceneOpacity} from './anim';

/**
 * 各シーンの共通枠。
 * シーンの尺を受け取り、入り／終わりのフェードを自動で当てる。
 */
export const SceneLayout: React.FC<{
  durationInFrames: number;
  children: React.ReactNode;
  justify?: React.CSSProperties['justifyContent'];
  align?: React.CSSProperties['alignItems'];
}> = ({durationInFrames, children, justify = 'center', align = 'flex-start'}) => {
  const opacity = useSceneOpacity(durationInFrames);

  return (
    <AbsoluteFill
      style={{
        padding: `${PADDING}px ${PADDING}px ${PADDING - 40}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: justify,
        alignItems: align,
        opacity,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
