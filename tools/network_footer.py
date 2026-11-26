#!/usr/bin/env python3
"""Add the Marketing Apes Network line to the footer of every HTML page.

Usage: python3 tools/network_footer.py <site_folder> [<site_folder> ...] [--check]

- Idempotent: pages that already mention the Marketing Apes Network are skipped.
- Inserts a small, static (never sticky or fixed) line just before </body>.
- Preserves each file's bytes and line endings; only the one line is added.
- Skips fragments without a </body> tag.
- --check reports what would change without writing.
"""
import pathlib
import sys

MARKER = "data-ma-network"
SNIPPET = (
    '<div data-ma-network style="text-align:center;font-size:12px;line-height:1.5;'
    'padding:16px 12px;opacity:.75">'
    'This site is part of the '
    '<a href="https://marketingapes.com/network/" style="color:inherit;text-decoration:underline">'
    'Marketing Apes Network</a>.'
    "</div>"
)


def process(folder: pathlib.Path, check: bool) -> tuple[int, int, int]:
    added = skipped = fragments = 0
    for page in sorted(folder.rglob("*.html")):
        if ".git" in page.parts or "node_modules" in page.parts:
            continue
        raw = page.read_bytes()
        low = raw.lower()
        if (MARKER.encode() in raw or b"marketingapes.com/network" in low
                or b"marketing apes network" in low):
            skipped += 1
            continue
        idx = low.rfind(b"</body>")
        if idx == -1:
            fragments += 1
            continue
        nl = b"\r\n" if b"\r\n" in raw else b"\n"
        if not check:
            page.write_bytes(raw[:idx] + SNIPPET.encode() + nl + raw[idx:])
        added += 1
    return added, skipped, fragments


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check = "--check" in sys.argv
    total = 0
    for name in args:
        folder = pathlib.Path(name)
        if not folder.is_dir():
            print(f"{name}: missing")
            continue
        a, s, f = process(folder, check)
        total += a
        print(f"{name}: added {a}, already had it {s}, fragments skipped {f}")
    print(f"TOTAL pages {'to change' if check else 'changed'}: {total}")


if __name__ == "__main__":
    main()
