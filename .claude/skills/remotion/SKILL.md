---
name: remotion
description: Remotion（React で動画を作るフレームワーク）で動画を作る・編集する・書き出すときに使う。Composition の作成、useCurrentFrame / interpolate / spring によるアニメーション、Sequence や TransitionSeries での構成、音声・画像・動画素材の読み込み、remotion studio でのプレビュー、remotion render での書き出し、@remotion/player の埋め込みなど。「動画を作りたい」「オープニングを作って」「字幕を入れて」「MP4 に書き出して」「Remotion」「動画テンプレート」といった依頼で使用する。Use for Remotion video creation, compositions, frame-based animation, rendering to MP4/GIF, and Remotion Player embedding.
---

# Remotion

Remotion は React のコンポーネントとして動画を記述し、フレーム単位でレンダリングして MP4 などに書き出すフレームワーク。
このリポジトリは「おさかなvlog」なので、オープニング、タイトルカード、字幕、サムネイル用の静止画などを Remotion で作ることを想定している。

## 最重要ルール（ここを外すと壊れる）

Remotion のレンダラーは **各フレームを独立して、並列に、順不同で** 描画する。したがって:

1. **アニメーションは必ず `useCurrentFrame()` の純粋な関数として書く。**
   CSS の `transition` / `animation`、`setTimeout`、`setInterval`、`requestAnimationFrame` は使わない（プレビューでは動いて見えても書き出すと止まる）。
2. **乱数は `Math.random()` ではなく `random(seed)`（`remotion` から import）を使う。** フレームごとに値が変わると映像がちらつく。
3. **モジュールスコープの値を書き換えない。** フレーム間で状態を持ち越さない。
4. **素材は `<Img>` `<Audio>` `<OffthreadVideo>` を使う。** 素の `<img>` `<video>` `<audio>` だと読み込み完了を待たずにフレームが確定してしまう。
5. **`public/` の素材は `staticFile("name.png")` で参照する。** `import` や相対パスの直書きはしない。
6. **`durationInFrames` は 1 以上の整数。** 秒からの計算では必ず `Math.round()` する。
7. **非同期処理は `delayRender()` / `continueRender()` で囲む。** そうしないとデータ到着前に描画される。

## 基本構造

```
src/
  index.ts      # registerRoot(RemotionRoot)
  Root.tsx      # <Composition> を並べる
  MyVideo.tsx   # 動画本体のコンポーネント
public/         # 画像・音声・動画素材（staticFile で参照）
```

```tsx
// src/Root.tsx
import {Composition} from 'remotion';
import {MyVideo} from './MyVideo';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="MyVideo"              // render 時に指定する ID
    component={MyVideo}
    durationInFrames={150}    // 30fps で 5 秒
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{title: 'おさかなvlog'}}
  />
);
```

```tsx
// src/MyVideo.tsx
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';

export const MyVideo: React.FC<{title: string}> = ({title}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const opacity = interpolate(frame, [0, fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#0b3d63', justifyContent: 'center', alignItems: 'center'}}>
      <h1 style={{color: 'white', fontSize: 96, opacity}}>{title}</h1>
    </AbsoluteFill>
  );
};
```

- `<AbsoluteFill>` は `position: absolute` で画面全体を覆う `div`。重ね合わせは基本これで行う。
- レイアウトは通常の CSS（flexbox / grid）で組む。単位は px 固定でよい（キャンバスサイズが固定のため）。

## 作業の進め方

1. **既存プロジェクトの確認。** `package.json` に `remotion` があるか、`src/Root.tsx` があるかを見る。なければ `npx create-video@latest` で雛形を作る（テンプレート選択は対話式なので、非対話なら `--blank` などを指定）。
2. **Composition を決める。** 解像度・fps・尺を先に決める。vlog のタイトルなら 1920x1080 / 30fps、SNS 縦型なら 1080x1920。
3. **コンポーネントを書く。** 上の「最重要ルール」を守る。
4. **確認する。** `npx remotion studio` でプレビュー（ブラウザが開く）。ヘッドレス環境では代わりに `npx remotion still <id> out/frame.png --frame=<n>` で任意フレームを画像化して確認するとよい。
5. **書き出す。** `npx remotion render <composition-id> out/video.mp4`

## よく使うコマンド

```bash
npx remotion studio                          # プレビュー（Remotion Studio）
npx remotion compositions                    # Composition の一覧
npx remotion render MyVideo out/video.mp4    # 動画を書き出し
npx remotion still MyVideo out/thumb.png --frame=60   # 静止画（サムネ）を書き出し
npx remotion render MyVideo out/video.mp4 --props='{"title":"あじをさばく"}'
```

## 参考資料

- アニメーション・シーン構成・素材の扱い: `references/animation.md`
- 書き出しオプション・Player 埋め込み・トラブルシューティング: `references/rendering.md`

## 迷ったら

Remotion は API の変更が比較的多い（特に `<Audio>` / `<OffthreadVideo>` のトリミング系 props や CLI のサブコマンド）。
インストール済みのバージョンを `npx remotion versions` または `package.json` で確認し、挙動が想定と違う場合は https://www.remotion.dev/docs を参照する。
