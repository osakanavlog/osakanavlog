#!/usr/bin/env python3
"""おさかなvlog の静的チェック（標準ライブラリのみ / 依存パッケージ不要）。

実行: python3 scripts/check.py
すべてのチェックに通れば終了コード 0、問題があれば 1 を返します。
"""

from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 終了タグを持たない HTML の void 要素。
VOID_ELEMENTS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}

errors: list[str] = []


def fail(path: Path, message: str) -> None:
    errors.append(f"{path.relative_to(ROOT)}: {message}")


class DocumentParser(HTMLParser):
    """開始タグと終了タグの対応、lang 属性、id / href を集める。"""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, int]] = []
        self.mismatches: list[str] = []
        self.html_lang: str | None = None
        self.ids: set[str] = set()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)

        if tag == "html":
            self.html_lang = attributes.get("lang")
        if "id" in attributes and attributes["id"]:
            self.ids.add(attributes["id"])
        if tag == "a" and attributes.get("href"):
            self.hrefs.append(attributes["href"])
        if tag == "link" and attributes.get("href"):
            self.hrefs.append(attributes["href"])

        if tag not in VOID_ELEMENTS:
            self.stack.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag: str) -> None:
        if tag in VOID_ELEMENTS:
            return
        if not self.stack:
            self.mismatches.append(f"{self.getpos()[0]} 行目: 対応する開始タグのない </{tag}>")
            return
        open_tag, line = self.stack.pop()
        if open_tag != tag:
            self.mismatches.append(
                f"{self.getpos()[0]} 行目: </{tag}> が {line} 行目の <{open_tag}> と対応していません"
            )


def check_html(path: Path) -> None:
    parser = DocumentParser()
    parser.feed(path.read_text(encoding="utf-8"))
    parser.close()

    for message in parser.mismatches:
        fail(path, message)
    for tag, line in parser.stack:
        fail(path, f"{line} 行目: <{tag}> が閉じられていません")

    # このサイトの標準言語は日本語。
    if parser.html_lang != "ja":
        fail(path, f'<html lang="ja"> が必要です（現在: {parser.html_lang!r}）')

    for href in parser.hrefs:
        if href.startswith("#"):
            anchor = href[1:]
            if anchor and anchor not in parser.ids:
                fail(path, f'リンク先 "{href}" に対応する id がありません')
        elif not re.match(r"^(https?:|mailto:|tel:|//)", href):
            target = (path.parent / href.split("#", 1)[0]).resolve()
            if not target.exists():
                fail(path, f'リンク先のファイル "{href}" が見つかりません')


def check_css(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    # コメントを除いてから波かっこの対応を数える。
    stripped = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    if stripped.count("{") != stripped.count("}"):
        fail(path, f'波かっこの数が合いません（{{ = {stripped.count("{")} / }} = {stripped.count("}")}）')


def main() -> int:
    html_files = sorted(ROOT.glob("*.html"))
    css_files = sorted(ROOT.glob("*.css"))

    if not html_files:
        print("チェック対象の HTML ファイルが見つかりません", file=sys.stderr)
        return 1

    for path in html_files:
        check_html(path)
    for path in css_files:
        check_css(path)

    checked = len(html_files) + len(css_files)
    if errors:
        print(f"{checked} 件のファイルを検査し、{len(errors)} 件の問題が見つかりました:\n", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print(f"OK: {checked} 件のファイルはすべてチェックを通過しました")
    return 0


if __name__ == "__main__":
    sys.exit(main())
