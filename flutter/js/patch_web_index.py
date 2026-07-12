#!/usr/bin/env python3
"""Inject the content-hashed Vite entry script into web/index.html."""

import json
import re
import sys
from pathlib import Path
from typing import Optional

JS_DIR = Path(__file__).resolve().parent
DIST_DIR = JS_DIR.parent / "web" / "js" / "dist"
MANIFEST_PATH = DIST_DIR / "manifest.json"
INDEX_HTML_PATH = JS_DIR.parent / "web" / "index.html"
MARKER = "<!-- vite-js-entry -->"
SCRIPT_PATTERN = re.compile(
    r"(\s*"
    + re.escape(MARKER)
    + r'\s*\n\s*<script crossorigin src=")js/dist/[^"]+("></script>)',
    re.MULTILINE,
)


def find_vite_entry(manifest: dict) -> Optional[dict]:
    for value in manifest.values():
        if value.get("isEntry") and "file" in value:
            return value
    return None


def main() -> int:
    if not MANIFEST_PATH.is_file():
        print(f"error: missing Vite manifest at {MANIFEST_PATH}", file=sys.stderr)
        return 1

    if not INDEX_HTML_PATH.is_file():
        print(f"error: missing web index at {INDEX_HTML_PATH}", file=sys.stderr)
        return 1

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    entry = find_vite_entry(manifest)
    if entry is None:
        print(
            f"error: no Vite entry with isEntry=true found in {MANIFEST_PATH}",
            file=sys.stderr,
        )
        return 1

    src_path = f"js/dist/{entry['file']}"
    html = INDEX_HTML_PATH.read_text(encoding="utf-8")

    if MARKER not in html:
        print(
            f"error: marker {MARKER!r} not found in {INDEX_HTML_PATH}", file=sys.stderr
        )
        return 1

    new_html, count = SCRIPT_PATTERN.subn(rf"\1{src_path}\2", html, count=1)
    if count != 1:
        print(
            f"error: expected to patch exactly one Vite script tag, got {count}",
            file=sys.stderr,
        )
        return 1

    INDEX_HTML_PATH.write_text(new_html, encoding="utf-8", newline="\n")
    print(f"patched {INDEX_HTML_PATH}: Vite entry -> {src_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
