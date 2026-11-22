#!/usr/bin/env python3
"""Add the Marketing Apes Network footer line to a site folder (idempotent).

Usage (from the repo root):  python3 tools/ma-network/apply_footer.py <folder> <hostname> [<folder> <hostname> ...]

Rules:
- Pages that already contain the marker are left alone, so re-running is safe.
- Pages with a <footer> get the line as the last child of their last footer.
- The site homepage (and a short list of public pages) without a footer get a small
  standalone <footer> before </body>.
- Preview, campaign, client, review and portal folders are skipped, as are redirect pages.
Generators under tools/adsense-builders emit the same snippet, so rebuilds keep it.
"""
import glob, os, re, sys

NETWORK_URL = "https://marketingapes.com/marketing-apes-network/"
MARKER = "<!-- ma-network-footer -->"
EXCLUDED = re.compile(
    r"(^|/)(preview|staged|phillips[^/]*|plg[^/]*|glassman[^/]*|campaigns?|campaign-[^/]*|"
    r"go-referral[^/]*|portal[^/]*|review[^/]*|[^/]*-review|publishing-check[^/]*|report[^/]*|"
    r"proposals?)(/|$)", re.I)
# Public pages that have no <footer> but should still carry the line.
STANDALONE_OK = {"index.html", "deals/index.html"}
# smartlifeinsurancequote.com serves its live page from /preview/ (the root redirects there).
SITE_EXTRA = {"sliq": {"preview/index.html"}}
# Pages whose bytes or link rules are pinned by tests (see tests/affiliate-guides.test.mjs and
# tests/lfma-la-county-results.test.mjs). Leave them untouched.
PINNED = {"px/guides/pillow-cover-fit/index.html", "lfma/results/la-county/index.html"}


def line(host):
    return (f'{MARKER}<p class="ma-network" style="flex:1 1 100%;grid-column:1/-1;width:100%;max-width:none;'
            f'box-sizing:border-box;margin:16px 0 0;font-size:12px;line-height:1.5;text-align:center;opacity:.85">'
            f'<a href="{NETWORK_URL}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">'
            f'{host} is part of the Marketing Apes Network</a></p>')


def standalone(host):
    return (f'{MARKER}<footer class="ma-network-foot" style="width:100%;box-sizing:border-box;padding:16px;'
            f'margin:0;font:12px/1.5 system-ui,-apple-system,sans-serif;text-align:center;opacity:.85">'
            f'<a href="{NETWORK_URL}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">'
            f'{host} is part of the Marketing Apes Network</a></footer>')


def apply(folder, host):
    standalone_paths = STANDALONE_OK | SITE_EXTRA.get(os.path.basename(folder), set())
    changed, skipped = [], []
    for path in sorted(glob.glob(f"{folder}/**/*.html", recursive=True)):
        rel = path[len(folder) + 1:]
        if f"{os.path.basename(folder)}/{rel}" in PINNED:
            skipped.append((rel, "pinned by a test")); continue
        if EXCLUDED.search(os.path.dirname(rel) + "/") and rel not in standalone_paths:
            skipped.append((rel, "excluded folder")); continue
        html = open(path, encoding="utf-8", newline="").read()
        if MARKER in html or "marketing-apes-network" in html:
            skipped.append((rel, "already has it")); continue
        if re.search(r'http-equiv=["\']refresh', html, re.I):
            skipped.append((rel, "redirect page")); continue
        idx = html.rfind("</footer>")
        if idx != -1 and re.search(r"<footer\b", html):
            html = html[:idx] + line(host) + "\n" + html[idx:]
        elif rel in standalone_paths and "</body>" in html:
            idx = html.rfind("</body>")
            html = html[:idx] + standalone(host) + "\n" + html[idx:]
        else:
            skipped.append((rel, "no footer")); continue
        open(path, "w", encoding="utf-8", newline="").write(html)
        changed.append(rel)
    return changed, skipped


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or len(args) % 2:
        sys.exit(__doc__)
    for folder, host in zip(args[::2], args[1::2]):
        c, s = apply(folder.rstrip("/"), host)
        print(f"{folder}: {len(c)} pages updated, {len(s)} skipped")
