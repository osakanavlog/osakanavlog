---
name: apple-style-site
description: Apple.com 風（Apple design / Human Interface Guidelines 系）のミニマルで余白が広く、巨大な見出しとスクロール演出を持つプロダクトサイト・LP を作るためのデザインシステム。「Apple っぽいサイト」「アップル風 LP」「apple design」「HIG」「プロダクト紹介ページ」「ヒーローセクションをかっこよく」などの依頼で使う。HTML/CSS のトークン、タイポグラフィスケール、モーション、コンポーネント実装を提供する。
---

# Apple スタイルのサイト制作

Apple の Web デザインは「1画面 = 1メッセージ」「巨大なタイポグラフィ」「無彩色の背景でプロダクトを主役にする」「静かなスクロールモーション」で成立している。見た目を真似るのではなく、この4つの原則を守ることで結果的に Apple 的な品質になる。

## 使い方

1. `references/tokens.css` をプロジェクトの CSS 先頭にコピーし、ブランドに合わせてアクセント色だけ差し替える。
2. `references/patterns.md` から必要なセクション（ヒーロー / 機能訴求 / 仕様表 / CTA）を組む。
3. モーションを付けるときは `references/motion.md` を読む。`prefers-reduced-motion` の対応は必須。
4. 完成形の雰囲気は `examples/hero-section.html` をブラウザで開いて確認する。

## 守るべき5原則

1. **1セクション1メッセージ。** 1画面に見出しは1つ、本文は2〜3行まで。伝えたいことが2つあるならセクションを2つに割る。情報を詰め込んだ時点で Apple 風ではなくなる。
2. **見出しは大きく、字間は詰める。** デスクトップのヒーローは 56〜96px、`font-weight: 600`、`letter-spacing: -0.015em 〜 -0.03em`、`line-height: 1.05`。小さい文字ほど字間は広げる（本文は 0、キャプションは +0.01em）。
3. **色は白・薄グレー・黒の3枚のみ。** `#ffffff` / `#f5f5f7` / `#000000` を全幅セクションで交互に敷き、アクセント色はボタンとリンクだけに使う。カード全部に色を付けない。
4. **余白は「多すぎる」と感じる量が正解。** セクション上下は最低 96px、デスクトップでは 120〜160px。要素間は 8 の倍数で刻む。
5. **影と枠線を使わない。** カードは `#f5f5f7` の面と角丸（18〜28px）で分離する。`box-shadow` はモーダルとスティッキーヘッダー以外では使わない。

## 実装の型

```html
<section class="section section--light">
  <div class="wrap">
    <p class="eyebrow">Eyebrow</p>
    <h2 class="headline">見出しはここに1行で。</h2>
    <p class="subhead">補足は2行まで。詳細は次のセクションに送る。</p>
    <a class="btn btn--primary" href="#">詳しく見る</a>
  </div>
</section>
```

- セクションは**全幅**（`section` は背景色を持ち、内側の `.wrap` が `max-width: 980px; margin-inline: auto;`）。
- テキスト中心のセクションは中央寄せ、仕様やリストは左寄せ。混在させない。
- ボタンは pill（`border-radius: 980px`）、`padding: 12px 22px`、hover は色を1段明るくするだけ。拡大縮小させない。
- リンクは下線なし・アクセント色、hover で下線を出す。

## ナビゲーション

高さ 44〜48px の固定ヘッダー。`backdrop-filter: saturate(180%) blur(20px)` と半透明背景（`rgba(255,255,255,0.72)`）で下のコンテンツを透かす。リンクは 12px / `font-weight: 400`、hover で不透明度を上げる。モバイルでは項目を畳んでハンバーガーにし、開いたら全画面のシートにする。

## タイポグラフィ（日本語混植）

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro JP", "SF Pro Display",
  "Helvetica Neue", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic",
  Meiryo, sans-serif;
```

日本語は欧文より字面が大きく見えるため、和文見出しは欧文より **1段小さく**、`letter-spacing` は `-0.01em` 程度に留める（詰めすぎると濁点が潰れる）。本文 `line-height` は欧文 1.47 に対し和文は 1.7〜1.8。約物の食い込みが気になる場合は `font-feature-settings: "palt" 1;` を見出しにだけ当てる。

## ダークモード

`prefers-color-scheme: dark` で背景 `#000000`、セクション面 `#1d1d1f`、本文 `#f5f5f7`、二次テキスト `#86868b`、アクセントは `#2997ff`（明度を上げる）。グレーの階調をそのまま反転させると沈むので、トークン側で個別に定義する（`references/tokens.css` に定義済み）。

## アクセシビリティ

- 本文の二次テキスト `#86868b` は白背景でコントラスト比 3.5:1 程度。**12px 以下では使わない**（`#6e6e73` に落とす）。
- フォーカスリングを消さない。`:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`
- スクロール連動で現れるテキストは、モーション無効時には最初から表示されている状態にする（`opacity: 1` がデフォルト、JS が付けたクラスでアニメーションさせる）。

## やってはいけないこと

- Apple のロゴ、製品画像、フォント（SF Pro の Web 配布）、スクリーンショットを転用しない。**「Apple 風のデザイン言語」を使うのであって、Apple のサイトを複製するのではない。** Apple 製品の紹介でもない限り、Apple の名前やマークをページに出さない。
- グラデーション背景、複数のアクセント色、ドロップシャドウ付きカード、斜めの区切り、絵文字アイコンは Apple 的ではない。
- 1画面に3カラム以上の情報を並べない（仕様表を除く）。
