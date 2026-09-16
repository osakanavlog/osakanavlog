"""レンダリング結果のデノイズ。

このビルドの Blender は OpenImageDenoise 非搭載のため、Cycles 側では
デノイズできない。少ないサンプルでレンダリングし、ここで後処理する。

使い方: denoise.py <入力png> <出力png> [強さ]
"""
import sys
import cv2
import numpy as np


def denoise(src_path, dst_path, strength=3.0):
    img = cv2.imread(src_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise SystemExit(f"読み込めません: {src_path}")

    # アルファは分離しておく(ノイズ除去の対象は色のみ)
    alpha = None
    if img.ndim == 3 and img.shape[2] == 4:
        alpha = img[:, :, 3]
        img = img[:, :, :3]

    # Non-local means。レンダリングノイズのような細かい粒には効きが良く、
    # エッジ（建具の目地など）は残る
    out = cv2.fastNlMeansDenoisingColored(
        img, None,
        h=strength,          # 輝度側の強さ
        hColor=strength,     # 色ノイズ側の強さ
        templateWindowSize=7,
        searchWindowSize=21,
    )

    # 平滑化で失われた細部を少し戻す
    blur = cv2.GaussianBlur(out, (0, 0), 1.6)
    out = cv2.addWeighted(out, 1.35, blur, -0.35, 0)

    if alpha is not None:
        out = np.dstack([out, alpha])

    cv2.imwrite(dst_path, out)
    print(f"denoised -> {dst_path}  (h={strength})")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    s = float(sys.argv[3]) if len(sys.argv) > 3 else 3.0
    denoise(sys.argv[1], sys.argv[2], s)
