# インテリアマツヤマ（インテマ）PR動画

広島県三次市のカーテン工事・プチリフォーム店
**有限会社インテリアマツヤマ（[intema-jp.com](https://intema-jp.com/)）** の会社紹介動画です。
[Remotion](https://www.remotion.dev/) で組み立てた 3 分（1920×1080 / 30fps / 5400 フレーム）の動画で、
BGM もこのリポジトリ内のスクリプトで生成したオリジナル曲です。

## 使い方

```bash
cd video
npm install
npm run studio     # ブラウザでプレビュー（Remotion Studio）
npm run render     # out/intema-pr.mp4 に書き出し
npm run bgm        # BGM を作り直す（public/bgm.wav → mp3 に変換）
```

## 内容について

テキストは公式サイトの記載にもとづいています。次の項目だけ**確認・追記をお願いします**。
`src/content.ts` の該当箇所に `// 要確認` を入れてあります。

| 項目 | 状態 |
| --- | --- |
| 設立年月 | 未記入（`about.facts` に入力すると会社概要の表に自動で出ます） |
| 代表者名 | 未記入（同上） |
| 電話番号 | 未記入（`closing.tel` に入力するとラストに出ます） |
| 「創業33年」 | サイトの記載をそのまま使用。現在の年数に合わせてご確認ください（`strengths` と `numbers`） |

値が空の項目は動画に表示されないので、未記入のままでも破綻しません。

## 差し替えるところ

編集するのは **`src/content.ts` の 1 ファイルだけ**です。

| 項目 | 内容 |
| --- | --- |
| `company` | 社名・英字表記・キャッチコピー |
| `opening` | 冒頭のコピー |
| `region` | 対応エリアと 3 つの切り口 |
| `about` | 紹介文と会社概要の表 |
| `services` | 事業内容 3 つ（カーテン／壁紙・内装工事／プチリフォーム） |
| `process` | ご相談から施工・保証までの 4 ステップ |
| `strengths` | 選ばれる理由 3 つ |
| `numbers` | 数字（`value` を書き換えるとカウントアップの到達値が変わります） |
| `fields` | 手がけるところ 3 つ＋施工事例の写真 |
| `closing` | 締めのメッセージと連絡先 |

色は `src/theme.ts` の `colors`、シーンの尺は `src/timeline.ts` の `durationInFrames`
（合計がそのまま動画の長さになります）。

## 構成（合計 5400 フレーム = 3 分）

| # | シーン | 尺 | 内容 |
| --- | --- | --- | --- |
| 01 | オープニング | 12 秒 | ロゴ・社名・キャッチコピー |
| 02 | 対応エリア | 20 秒 | 三次市＋4 市町、住まい／施設／距離 |
| 03 | 私たちについて | 23 秒 | 紹介文＋会社概要 |
| 04 | 事業内容 | 25 秒 | カード 3 枚を順にフォーカス |
| 05 | 仕事の進め方 | 25 秒 | 4 ステップ（線が伸びる） |
| 06 | 選ばれる理由 | 27 秒 | 33 年／シンプル価格／1 年保証 |
| 07 | 数字で見る | 20 秒 | カウントアップ（明るい背景） |
| 08 | 手がけるところ | 18 秒 | 住まい／学校・事務所／病院・公共施設 |
| 09 | クロージング | 10 秒 | 連絡先 |

## 写真を入れる

施工事例の写真を `public/` に置き、`src/content.ts` の `fields.photos` にファイル名を書くと、
シーン 08 の 3 枚のカードに入ります。

```ts
photos: ['works/living.jpg', 'works/school.jpg', 'works/hospital.jpg'],
```

空のままだと「施工事例の写真」と書かれた枠が出ます。

## ロゴ

`src/components/Logo.tsx` はカーテンのドレープをイメージした**仮のシンボル**です。
正式なロゴがある場合は `public/logo.svg` などに置いて、中身を
`<Img src={staticFile('logo.svg')} />` に差し替えてください。

## BGM

`public/bgm.mp3` は `tools/make-bgm.mjs` が合成したオリジナル曲です（既成曲は使っていません）。
112BPM の長調で、動画の 9 シーンに合わせて鳴る楽器を切り替えています
（オープニングは静か → 中盤で厚く → 「数字で見る」で一度引く → ラストで余韻）。

作り直す場合:

```bash
npm run bgm
npx remotion ffmpeg -y -i public/bgm.wav -codec:a libmp3lame -b:a 192k public/bgm.mp3
```

曲調を変えたいときは `tools/make-bgm.mjs` の `BPM`、コード進行（`LOOP_A` / `LOOP_B`）、
編成（`arrangement`）、メロディ（`LEAD_PHRASE`）あたりを触ってください。
音量は `src/IntemaPR.tsx` の `<Audio volume={0.72} />` で調整できます。

## フォントについて

日本語フォント（Noto Sans JP / SIL Open Font License 1.1）を `public/fonts/` に同梱しています。
Google Fonts から都度読み込むと数百リクエストが発生し、ネットワーク環境によっては
文字が豆腐（□）になるため、自前で持つ方式にしています。ライセンスは `public/fonts/OFL.txt`。

## レンダリング時のメモ

Remotion は初回レンダリング時に Chrome Headless Shell を自動ダウンロードします。
取得できない環境では、手元の Chrome / Chromium を指定できます。

```bash
npx remotion render IntemaPR out/intema-pr.mp4 --browser-executable=/path/to/chrome
```

軽く確認したいときは `npm run preview`（50% 解像度）、
サムネイルだけなら `npm run still` を使ってください。
