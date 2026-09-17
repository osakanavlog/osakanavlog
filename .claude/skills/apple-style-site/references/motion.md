# Apple スタイルのモーション

原則: **動きは気づかれてはいけない。** 気づかれるのは「出現」ではなく「内容」。派手なイージング（bounce, elastic）は使わない。

## 1. スクロールで現れるテキスト・図版

`IntersectionObserver` で 1回だけクラスを付ける。CSS 側のデフォルトは「表示された状態」にしておき、JS が動いたときだけ初期状態を伏せる（JS 無効・モーション無効でも読める）。

```css
.reveal { opacity: 1; transform: none; }
.js .reveal { opacity: 0; transform: translateY(24px); }
.js .reveal.is-visible {
  opacity: 1;
  transform: none;
  transition: opacity var(--dur-slow) var(--ease-apple),
              transform var(--dur-slow) var(--ease-apple);
}
@media (prefers-reduced-motion: reduce) {
  .js .reveal { opacity: 1; transform: none; transition: none; }
}
```

```js
document.documentElement.classList.add('js');
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('is-visible');
    io.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
```

- 移動量は **16〜32px** まで。それ以上は「飛んできた」印象になる。
- 連続する要素は `transition-delay` を 60〜80ms ずつずらす（3要素まで。4つ目以降は同時で良い）。

## 2. スティッキーなスクロールシーン

長いスクロールで1つのビジュアルを段階的に見せる Apple の定番。`position: sticky` のステージ + 背の高いトラックで作る。

```css
.scene { position: relative; height: 300vh; }          /* トラック */
.scene__stage { position: sticky; top: 0; height: 100vh; display: grid; place-items: center; }
```

進捗は「トラックの上端がビューポート上端を通過した量 / (トラック高 - 100vh)」で 0〜1 に正規化し、`requestAnimationFrame` の中で CSS 変数に書き出す。スクロールハンドラ内でレイアウトを読むと jank が出るので、`getBoundingClientRect()` の読み取りは rAF の先頭でまとめる。

```js
const track = document.querySelector('.scene');
let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const r = track.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
    track.style.setProperty('--p', p.toFixed(4));
    ticking = false;
  });
}, { passive: true });
```

`prefers-reduced-motion: reduce` のときはトラック高を `auto` に戻し、各ステップを普通に縦積みで表示する。これを忘れると酔う人が読めないページになる。

## 3. 動画

- 自動再生するなら `muted playsinline autoplay loop preload="metadata"` と `poster` を必ず付ける。
- 回線が細い環境のために `poster` 画像だけで意味が通る構図にする。
- 音を出さない。Apple も出さない。

## 4. 画像・数値のトランジション

| 用途 | duration | easing |
| --- | --- | --- |
| hover の色変化 | 150〜200ms | `--ease-standard` |
| 開閉（アコーディオン） | 300〜400ms | `--ease-standard` |
| スクロール出現 | 600〜900ms | `--ease-apple` |
| 画面遷移風の拡大 | 500〜700ms | `--ease-apple` |

`transition: all` は書かない。プロパティを列挙する（`opacity`, `transform`, `background-color` のみ GPU に優しい）。

## 5. チェック

- [ ] `prefers-reduced-motion: reduce` で全アニメーションが無効になり、内容は全部見える
- [ ] JS を切ってもテキストが読める
- [ ] スクロール中に 60fps を維持（Performance パネルで long task がない）
- [ ] 出現アニメーションは1要素につき1回だけ（往復させない）
