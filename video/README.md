# インテマイズ PR動画

広島県三次市の「インテマイズ」を紹介する 3 分（1920×1080 / 30fps / 5400 フレーム）の
会社紹介動画を、[Remotion](https://www.remotion.dev/) で組み立てたものです。

> **⚠️ 現状は「構成案」です。**
> 会社の公開情報が確認できなかったため、社名・所在地（三次市）以外のテキストは
> すべて仮の文言が入っています。画面右上に黄色い `DRAFT` バッジが出ている間は、
> **そのまま公開しないでください。**

## 使い方

```bash
cd video
npm install
npm run studio     # ブラウザでプレビュー（Remotion Studio）
npm run render     # out/intemize-pr.mp4 に書き出し
```

## 差し替えるところ

編集するのは **`src/content.ts` の 1 ファイルだけ**です。
`// TODO` が付いている項目を実際の情報に置き換えてください。

| 項目 | 内容 |
| --- | --- |
| `company` | 社名・英文表記・キャッチコピー |
| `opening` | 冒頭のコピー |
| `region` | 三次市の紹介文（3 項目） |
| `about` | 会社紹介文と、会社データ（設立・代表者・事業内容など） |
| `services` | 事業内容 3 つ |
| `process` | 仕事の流れ 4 ステップ |
| `strengths` | 強み 3 つ |
| `numbers` | 数字（`value` に数値を入れるとカウントアップします。`null` の間は「—」表示） |
| `voices` | 社員のコメント 2 名分 |
| `closing` | 締めのメッセージと連絡先 |

すべて入力し終えたら `draftMode` を `false` にすると、`DRAFT` バッジが消えます。

色を変えたい場合は `src/theme.ts` の `colors`、
シーンの尺を変えたい場合は `src/timeline.ts` の `durationInFrames` を調整します
（`durationInFrames` の合計がそのまま動画の長さになります）。

## 構成（合計 5400 フレーム = 3 分）

| # | シーン | 尺 | 内容 |
| --- | --- | --- | --- |
| 01 | オープニング | 12 秒 | ロゴ・社名・キャッチコピー |
| 02 | 三次から | 20 秒 | まちの紹介 3 項目 |
| 03 | 私たちについて | 23 秒 | 会社紹介文＋会社データ |
| 04 | 事業内容 | 25 秒 | カード 3 枚（順にフォーカス） |
| 05 | 仕事の進め方 | 25 秒 | 4 ステップ（線が伸びる） |
| 06 | 選ばれる理由 | 27 秒 | 強みを 1 つずつ大きく |
| 07 | 数字で見る | 20 秒 | カウントアップ（明るい背景） |
| 08 | はたらく人 | 18 秒 | 社員コメント 2 名 |
| 09 | クロージング | 10 秒 | 連絡先 |

## 素材の差し替え

- **ロゴ**：`src/components/Logo.tsx` は「三つの川の合流」をイメージした仮のシンボルです。
  正式なロゴがある場合は `public/logo.svg` などに置いて、`<Img src={staticFile('logo.svg')} />` に差し替えてください。
- **写真**：`public/` に置いて `staticFile()` で参照します。
  社員写真は `src/scenes/Voices.tsx` の `PHOTO` と書かれた円、
  事業の写真は `src/components/Card.tsx` に差し込めます。
- **BGM**：`public/bgm.mp3` を置き、`src/IntemizePR.tsx` 末尾のコメントを外してください。
  **必ず利用許諾のある音源を使ってください。**

## フォントについて

日本語フォント（Noto Sans JP / SIL Open Font License 1.1）を `public/fonts/` に同梱しています。
Google Fonts から都度読み込むと数百リクエストが発生し、ネットワーク環境によっては
文字が豆腐（□）になるため、自前で持つ方式にしています。ライセンスは `public/fonts/OFL.txt`。

## レンダリング時のメモ

Remotion は初回レンダリング時に Chrome Headless Shell を自動ダウンロードします。
ネットワーク制限などで取得できない環境では、手元の Chrome / Chromium を指定できます。

```bash
npx remotion render IntemizePR out/intemize-pr.mp4 \
  --browser-executable=/path/to/chrome
```

確認用に軽く書き出したいときは `npm run preview`（50% 解像度）、
サムネイルだけ欲しいときは `npm run still` を使ってください。
