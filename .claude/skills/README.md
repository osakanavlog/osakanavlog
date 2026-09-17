# デザインスキル

このリポジトリに入っている Claude Code 用スキル。該当する依頼のときに自動で読み込まれる。明示的に使いたいときは「apple-style-site スキルで」のように名前で呼ぶ。

| スキル | 使う場面 |
| --- | --- |
| `apple-style-site` | プロダクト紹介 / LP。巨大な見出し、広い余白、白・グレー・黒の全幅セクション、静かなスクロール演出 |
| `uniqlo-style-site` | EC / 商品一覧 / カタログ。角丸ゼロのフラットな面、赤 1 色、密なグリッド、価格タイポグラフィ |
| `premium-site-design` | 上記以外のテイスト（MUJI / Nike / Airbnb / Stripe / エディトリアル / ラグジュアリー）と、全テイスト共通の土台・出荷前チェックリスト |

## 構成

```
.claude/skills/
├── apple-style-site/
│   ├── SKILL.md                    原則と実装の型
│   ├── references/tokens.css       そのままコピーして使える CSS 変数
│   ├── references/patterns.md      セクション別の HTML/CSS
│   ├── references/motion.md        スクロール演出とモーション設計
│   └── examples/hero-section.html  ブラウザで開ける完成デモ
├── uniqlo-style-site/
│   ├── SKILL.md
│   ├── references/tokens.css
│   ├── references/patterns.md
│   └── examples/lookbook.html
└── premium-site-design/
    ├── SKILL.md
    └── references/
        ├── design-languages.md     ブランド別プリセット
        ├── foundations.md          余白・タイプスケール・日本語組版・配色
        └── quality-checklist.md    出荷前チェックリスト
```

## デモの確認

```sh
python3 -m http.server 8000
# http://localhost:8000/.claude/skills/apple-style-site/examples/hero-section.html
# http://localhost:8000/.claude/skills/uniqlo-style-site/examples/lookbook.html
```

## ブランドの扱い

いずれも**デザイン言語（グリッド・配色の構造・タイポグラフィの扱い方）を学んで自分のサイトに適用する**ためのもの。各社のロゴ・商標・独自書体・商品写真・コピーは使わない。デモページにも実在ブランドの資産は一切含めていない。
