#!/bin/bash
# Claude Code on the web のセッション開始時に実行されるフック。
# このサイトは依存パッケージを持たない静的サイトなので、
# インストール作業は行わず、必要なコマンドの確認のみを行う。
set -euo pipefail

# ローカル環境では何もしない（リモートセッション専用）。
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

if ! command -v python3 > /dev/null 2>&1; then
  echo "python3 が見つかりません。チェックスクリプトとプレビュー用サーバーに必要です。" >&2
  exit 1
fi

# git clone では実行ビットが失われる場合があるため毎回付与する（冪等）。
chmod +x scripts/check.py

echo "セットアップ完了: $(python3 --version)"
echo "チェック: python3 scripts/check.py"
echo "プレビュー: python3 -m http.server"
