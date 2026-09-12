# 書き出しと埋め込み

## render の主なオプション

```bash
npx remotion render MyVideo out/video.mp4
npx remotion render MyVideo out/video.mp4 --props='{"title":"あじをさばく"}'
npx remotion render MyVideo out/clip.mp4 --frames=0-59      # 一部だけ
npx remotion render MyVideo out/video.mp4 --concurrency=4   # 並列数
npx remotion render MyVideo out/video.webm --codec=vp8
npx remotion render MyVideo out/anim.gif --codec=gif --every-nth-frame=2
npx remotion render MyVideo out/video.mp4 --crf=18          # 画質（低いほど高画質・大容量）
npx remotion render MyVideo out/video.mp4 --scale=0.5       # 確認用に低解像度で
```

- `--codec=h264`（既定）/ `vp8` / `vp9` / `prores` / `gif` / `mp3` / `wav`。
- 透過が必要なら `--codec=vp9 --pixel-format=yuva420p`（WebM）。
- 静止画は `npx remotion still <id> out/thumb.png --frame=60`。サムネイル生成に便利。

## Composition の一覧

```bash
npx remotion compositions
```

ID が分からないときはこれで確認する。`--props` で尺が変わる Composition もあるので注意。

## Remotion Player（サイトへの埋め込み）

書き出した MP4 を置くのが一番軽いが、props で内容を差し替えたい場合は `@remotion/player` を使う。

```tsx
import {Player} from '@remotion/player';

<Player
  component={MyVideo}
  inputProps={{title: 'おさかなvlog'}}
  durationInFrames={150}
  fps={30}
  compositionWidth={1920}
  compositionHeight={1080}
  style={{width: '100%'}}
  controls
/>
```

Player は React アプリ内で動く。このリポジトリのような静的 HTML サイトに組み込むなら、
**書き出した MP4 を `<video>` タグで置く**ほうが構成を壊さずに済む。

## よくあるトラブル

| 症状 | 原因と対処 |
| --- | --- |
| プレビューでは動くが書き出すと静止している | CSS transition / animation を使っている。`useCurrentFrame()` ベースに書き換える |
| フレームごとに絵がちらつく | `Math.random()` や `Date.now()` を使っている。`random(seed)` に置き換える |
| 画像・動画が一部のフレームで欠ける | `<img>` `<video>` を直接使っている。`<Img>` `<OffthreadVideo>` に置き換える |
| `delayRender` のタイムアウト | 非同期処理が終わっていない。`continueRender` の呼び忘れ、または `delayRender(label, {timeoutInMilliseconds})` で延長 |
| 書き出しが極端に遅い | `--concurrency` を調整。確認段階は `--scale=0.5` や `--frames` で範囲を絞る |
| CI / コンテナで Chrome が無い | `npx remotion browser ensure` で Chrome Headless Shell を用意する |
| 日本語が豆腐（□）になる | 日本語フォントを `@remotion/google-fonts` などで明示的に読み込む |

## 音声のみ / 音声なし

```bash
npx remotion render MyVideo out/audio.mp3 --codec=mp3
npx remotion render MyVideo out/video.mp4 --muted
```
