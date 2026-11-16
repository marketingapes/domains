#!/usr/bin/env python3
"""Copy tools/ee-click/ee-click.js into each site and add its script tag to every live page.

Idempotent. Run from the repo root: python3 tools/ee-click/sync.py
Pages under preview/, publishing-check*, tests/ and client or Phillips lanes are skipped.
"""
import pathlib, re, shutil

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "tools/ee-click/ee-click.js"
# site -> (excluded top-level folders, forms on/off)
SITES = {
    "fplb": ((), True), "ddm": ((), True), "h2m": ((), True), "px": ((), True),
    "cgg": ((), True), "kg": ((), True),
    "ma": (("phillips", "glassman-proposal", "glassman-ssdi", "btl-ssdi", "campaign-sprint"), True),
    # BTL: own pages only. Intake forms keep their existing payloads (form fields off).
    "btl": None,
}
BTL_ONLY = ("index.html", "404.html", "privacy-policy", "terms-and-conditions", "sms-terms", "ssdi", "paraquat")
ALWAYS_SKIP = ("preview", "tests", "data", "assets", "images")
# Byte-pinned or generator-owned files (tests compare them exactly).
PINNED = {"px/guides/pillow-cover-fit/index.html"}


def tag(site, forms):
    extra = "" if forms else ' data-ee-forms="off"'
    return f'<script src="/assets/ee-click.js?v=1" defer data-site="{site}"{extra}></script>'


def pages(site):
    base = ROOT / site
    for f in sorted(base.rglob("*.html")):
        top = f.relative_to(base).parts[0]
        if top in ALWAYS_SKIP or top.startswith("publishing-check") or f.relative_to(ROOT).as_posix() in PINNED:
            continue
        if site == "btl":
            if top not in BTL_ONLY:
                continue
        elif top in SITES[site][0]:
            continue
        yield f


def main():
    changed = 0
    for site, cfg in SITES.items():
        forms = cfg[1] if cfg else False
        dest = ROOT / site / "assets/ee-click.js"
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists() or dest.read_bytes() != SRC.read_bytes():
            shutil.copyfile(SRC, dest)
        t = tag(site, forms)
        for f in pages(site):
            html = f.read_text(encoding="utf-8")
            if "/assets/ee-click.js" in html or "</head>" not in html or 'http-equiv="refresh"' in html:
                continue
            f.write_text(html.replace("</head>", t + "\n</head>", 1), encoding="utf-8")
            changed += 1
    print(f"ee-click: tagged {changed} pages")


if __name__ == "__main__":
    main()
