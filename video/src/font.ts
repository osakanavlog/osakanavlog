/**
 * 日本語フォントの読み込み。
 *
 * Google Fonts から都度取得すると、
 *  - サブセットごとに数百リクエストが飛ぶ
 *  - レンダリング環境のネットワーク事情で欠落する（豆腐になる）
 * ため、フォント本体を public/fonts に置いて自前で読み込む。
 *
 * Noto Sans JP (SIL Open Font License 1.1) — public/fonts/OFL.txt を参照。
 */
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';

export const fontFamily = '"Noto Sans JP"';

const handle = delayRender('日本語フォントの読み込み', {timeoutInMilliseconds: 60000});

const font = new FontFace(
  'Noto Sans JP',
  `url(${staticFile('fonts/NotoSansJP.woff2')}) format('woff2')`,
  {weight: '100 900', style: 'normal', display: 'block'},
);

font
  .load()
  .then((loaded) => {
    document.fonts.add(loaded);
    continueRender(handle);
  })
  .catch((err) => {
    cancelRender(err);
  });
