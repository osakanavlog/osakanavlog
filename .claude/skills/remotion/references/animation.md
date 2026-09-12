# アニメーションとシーン構成

## interpolate — 値を線形に動かす

```tsx
const x = interpolate(
  frame,
  [0, 30],        // 入力レンジ（フレーム）
  [-200, 0],      // 出力レンジ
  {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}
);
```

- `extrapolate*: 'clamp'` はほぼ常に付ける。付けないとレンジ外で値が伸び続ける。
- 入力レンジは単調増加でなければならない。
- 複数区間も書ける: `interpolate(frame, [0, 30, 60, 90], [0, 1, 1, 0])`（フェードイン→維持→フェードアウト）。
- イージングは `Easing`（`remotion` から import）。`Easing.bezier(0.4, 0, 0.2, 1)` など。

## spring — 自然な動き

```tsx
const scale = spring({
  frame,
  fps,
  config: {damping: 200},   // 200 でオーバーシュートなし。小さいほど弾む
  durationInFrames: 20,     // 任意。尺を固定したいとき
});
```

`spring()` は既定で 0 → 1 を返すので、`interpolate(scale, [0, 1], [0.8, 1])` のように繋いで使う。

## 遅延させる

```tsx
const delay = 15;
const progress = spring({frame: frame - delay, fps, config: {damping: 200}});
```

リスト項目を順に出すときは `frame - index * 5` のようにずらす。

## Sequence — 時間軸を区切る

```tsx
<Sequence from={0} durationInFrames={60}>
  <Title />      {/* この中では useCurrentFrame() が 0 から始まる */}
</Sequence>
<Sequence from={60} durationInFrames={90}>
  <Body />
</Sequence>
```

`<Sequence>` の内側では時間がローカル化される（`from` が 0 になる）ので、各シーンを独立して書ける。

## Series — 連番で並べる

`from` を手計算したくないとき:

```tsx
<Series>
  <Series.Sequence durationInFrames={60}><SceneA /></Series.Sequence>
  <Series.Sequence durationInFrames={90}><SceneB /></Series.Sequence>
</Series>
```

## トランジション

`@remotion/transitions` を入れると、シーン間のワイプやフェードが書ける。

```tsx
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}><SceneA /></TransitionSeries.Sequence>
  <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
  <TransitionSeries.Sequence durationInFrames={90}><SceneB /></TransitionSeries.Sequence>
</TransitionSeries>
```

トランジションの尺は前後のシーンから差し引かれる点に注意（合計尺が縮む）。

## 素材の読み込み

```tsx
import {Img, Audio, OffthreadVideo, staticFile} from 'remotion';

<Img src={staticFile('fish.png')} />
<OffthreadVideo src={staticFile('clip.mp4')} />
<Audio src={staticFile('bgm.mp3')} volume={0.4} />
```

- 画像は `<Img>`。読み込み完了までフレームを確定させない。
- 動画は `<OffthreadVideo>`（書き出し時に高速・正確）。プレビュー中心なら `<Video>` でもよい。
- 音量をフェードさせる: `volume={(f) => interpolate(f, [0, 30], [0, 1], {extrapolateRight: 'clamp'})}`
- 素材のトリミング props はバージョンによって名前が異なる（新しめ: `trimBefore` / `trimAfter`、以前: `startFrom` / `endAt`）。使う前にインストール済みバージョンの型定義を確認する。

## フォント

```tsx
import {loadFont} from '@remotion/google-fonts/NotoSansJP';
const {fontFamily} = loadFont();
```

日本語を扱うので Noto Sans JP など日本語フォントを明示的に読み込む。システムフォント頼みだとレンダリング環境で字形が変わる。

## 非同期データ

```tsx
const [handle] = useState(() => delayRender('データ取得'));
useEffect(() => {
  fetchData().then((d) => {
    setData(d);
    continueRender(handle);
  }).catch((e) => cancelRender(e));
}, [handle]);
```

Composition の尺をデータから決めたい場合は `calculateMetadata` を使うほうが素直:

```tsx
<Composition
  id="MyVideo"
  component={MyVideo}
  fps={30}
  width={1920}
  height={1080}
  durationInFrames={150}
  calculateMetadata={async ({props}) => {
    const seconds = await getDuration(props.src);
    return {durationInFrames: Math.round(seconds * 30)};
  }}
/>
```

## 乱数

```tsx
import {random} from 'remotion';
const jitter = random(`bubble-${i}`) * 20;   // seed が同じなら常に同じ値
```
