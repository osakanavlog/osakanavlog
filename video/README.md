# 株式会社インテマイズ PR動画（BtoC / BtoB）

広島県三次市の内装仕上げ工事店 **株式会社インテマイズ**（[intema-jp.com](https://intema-jp.com/)）の
会社紹介動画です。[Remotion](https://www.remotion.dev/) で組み立てた 2 分 30 秒
（1920×1080 / 30fps / 4500 フレーム）の動画を、**相手に合わせて 2 本**書き出せます。

| 書き出し | Composition ID | 想定する相手 |
| --- | --- | --- |
| `out/intemize-pr-btoc.mp4` | `PR-BtoC` | 一般のお客様（住まいのカーテン・内装） |
| `out/intemize-pr-btob.mp4` | `PR-BtoB` | 法人・施設（オフィスリノベーション・内装工事） |

構成・尺・BGM・デザインは共通で、**テキストだけが切り替わります**。

## 使い方

```bash
cd video
npm install
npm run studio        # ブラウザでプレビュー（2 本とも一覧に出ます）
npm run render        # BtoC / BtoB を続けて書き出し
npm run render:btob   # 片方だけ
npm run bgm           # BGM を作り直す
```

## 2 本の違い

| | BtoC | BtoB |
| --- | --- | --- |
| 冒頭 | カーテンから、部屋は変わる。 | はたらく場所を、整える。 |
| エリア | 広島県内、どこへでも。 | 広島県全域、県外へも。 |
| 事業内容 | カーテン・窓まわり／壁紙・床／プチリフォーム | オフィスリノベーション／内装仕上工事／窓まわり |
| 進め方 | ご相談 → 採寸・ご提案 → お見積り → 施工・保証 | ご相談・現地調査 → プランのご提案 → お見積り → 施工・保証 |
| 強み | まとめて頼める／シンプル価格／1 年保証 | 一社で完結する／内訳の見える見積り／1 年保証 |
| 数字 | 23 市町／1 年／5 分野 | 23 市町／2 県／1 年 |
| 手がけるところ | 一戸建て／マンション／店舗・オフィス | オフィス／学校・公共施設／病院・福祉施設 |
| ブログ | 施工事例・カーテンの選び方 | 事務所の什器入れ替え事例 |
| 締め | まずは、窓ひとつからでも。 | オフィスのことも、まずはご相談から。 |

## 差し替えるところ

編集するのは **`src/content.ts` の 1 ファイルだけ**です。

- `company` / `facts` … 共通の会社情報（社名・所在地・設立・代表者・事業内容・対応エリア）
- `btoc` … BtoC 版のテキスト一式
- `btob` … BtoB 版のテキスト一式

どちらも同じ形（`Content` 型）なので、片方を書き換えてももう一方は影響を受けません。
色は `src/theme.ts` の `colors` で変えられます。

## 構成（合計 4500 フレーム = 2 分 30 秒）

| # | シーン | 尺 | 開始 |
| --- | --- | --- | --- |
| 01 | オープニング | 10 秒 | 0:00 |
| 02 | 対応エリア | 15 秒 | 0:10 |
| 03 | 私たちについて | 17 秒 | 0:25 |
| 04 | 事業内容 | 20 秒 | 0:42 |
| 05 | 仕事の進め方 | 19 秒 | 1:02 |
| 06 | 選ばれる理由 | 21 秒 | 1:21 |
| 07 | 数字で見る | 14 秒 | 1:42 |
| 08 | 手がけるところ | 15 秒 | 1:56 |
| 09 | ブログより | 10 秒 | 2:11 |
| 10 | クロージング | 9 秒 | 2:21 |

尺を変えるときは `src/timeline.ts` の `durationInFrames` を調整してください。
合計がそのまま動画の長さになります。あわせて `tools/make-bgm.mjs` の `DURATION` と
`arrangement` の小節区切りも合わせると、BGM の盛り上がりがシーンと揃います。

## 施工写真を入れる

シーン 08「手がけるところ」に 3 枚の写真枠があります。
`public/works/` に画像を置き、`src/content.ts` の `fields.photos` にファイル名を書いてください。

```ts
photos: ['works/office.jpg', 'works/school.jpg', 'works/hospital.jpg'],
```

空のままだと「施工事例の写真」と書かれた枠が出ます。
BtoC / BtoB でそれぞれ別の写真を指定できます。

## 未確認の項目

| 項目 | 状態 |
| --- | --- |
| 社名 | いただいた指示どおり「株式会社インテマイズ」で作成。公開情報上は旧社名（有限会社インテリアマツヤマ）のままなので、登記・表記の切り替え時期をご確認ください |
| 電話番号 | 載せない方針のため `closing.tel` を空にしています |
| ブログ記事のタイトル | 検索結果から拾った表記です。正確なタイトルに差し替えてください（`topics.items`） |
| 「23 市町」 | 広島県の市町数（14 市 9 町）を根拠にしています |

## ロゴ

`src/components/Logo.tsx` はカーテンのドレープをイメージした**仮のシンボル**です。
正式なロゴがある場合は `public/logo.svg` などに置いて、中身を
`<Img src={staticFile('logo.svg')} />` に差し替えてください。

## BGM

`public/bgm.mp3` は `tools/make-bgm.mjs` が合成したオリジナル曲です（既成曲は使っていません）。
112BPM の長調・150 秒ちょうど（70 小節）で、動画のシーンに合わせて鳴る楽器を
切り替えています（冒頭は静か → 中盤で厚く → 「数字で見る」で一度引く → ラストで余韻）。

```bash
npm run bgm
npx remotion ffmpeg -y -i public/bgm.wav -codec:a libmp3lame -b:a 192k public/bgm.mp3
```

曲調は `tools/make-bgm.mjs` の `BPM`・コード進行（`LOOP_A` / `LOOP_B`）・
編成（`arrangement`）・メロディ（`LEAD_PHRASE`）で調整できます。
音量は `src/PRVideo.tsx` の `<Audio volume={0.72} />` で変えられます。

## フォントについて

日本語フォント（Noto Sans JP / SIL Open Font License 1.1）を `public/fonts/` に同梱しています。
Google Fonts から都度読み込むと数百リクエストが発生し、ネットワーク環境によっては
文字が豆腐（□）になるため、自前で持つ方式にしています。ライセンスは `public/fonts/OFL.txt`。

## レンダリング時のメモ

Remotion は初回レンダリング時に Chrome Headless Shell を自動ダウンロードします。
取得できない環境では、手元の Chrome / Chromium を指定できます。

```bash
npx remotion render PR-BtoB out/intemize-pr-btob.mp4 --browser-executable=/path/to/chrome
```
