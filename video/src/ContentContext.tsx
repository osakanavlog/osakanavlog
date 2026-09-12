import React, {createContext, useContext, useMemo} from 'react';
import {Audience, Content, getContent} from './content';

const ContentContext = createContext<Content | null>(null);

export const ContentProvider: React.FC<{audience: Audience; children: React.ReactNode}> = ({
  audience,
  children,
}) => {
  const value = useMemo(() => getContent(audience), [audience]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
};

/** 各シーンはここからテキストを受け取る（BtoC / BtoB の出し分けはここで吸収される） */
export const useContent = (): Content => {
  const value = useContext(ContentContext);
  if (!value) {
    throw new Error('useContent は ContentProvider の内側で呼んでください');
  }
  return value;
};
