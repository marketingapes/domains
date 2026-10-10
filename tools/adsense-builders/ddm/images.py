"""Discount Deal Me images: manifest lookup for the builder, plus a fetch/convert step.

images.json lists every image with its source and license:
  - "cj-product-feed": product images from the advertiser's CJ product feed (property 101511733),
    used to promote that advertiser's offer under its affiliate program terms.
  - "unsplash": free photos under the Unsplash License (https://unsplash.com/license).
No banners are self-hosted (CJ banners must be served unmodified from CJ's tracked URL), and no
characters, mascots or third-party logos are used.

Files (committed, so refresh PRs keep them):
  ddm/images/deals/<link_id>.webp        720x450 deal card image
  ddm/images/deals/cat-<category>.webp   720x450 category fallback for deals without their own image
  ddm/images/photos/<slug>-1200.webp / -640.webp   guide photos (1200x675 / 640x360)
  ddm/images/photos/hero-1200.webp / -640.webp     homepage hero (1200x800 / 640x427)

Usage:
  python3 images.py fetch [--cache DIR]   create any missing WebP file (downloads the source, or reads DIR/<key>)
  python3 images.py check                 list live deals that fall back to a category image
"""
import io, json, os, re, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("DDM_OUT") or os.path.join(HERE, "..", "..", "..", "ddm")
M = json.load(open(os.path.join(HERE, "images.json")))

DEAL_W, DEAL_H = 720, 450
GUIDE = [(1200, 675), (640, 360)]
HERO = [(1200, 800), (640, 427)]


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def link_id(d):
    return str(d["id"]).split("-")[-1]


def _exists(rel):
    return os.path.exists(os.path.join(OUT, rel.lstrip("/")))


def deal_image(d):
    """(src, alt, fit, is_fallback) for a deal card. Falls back to the category photo."""
    lid = link_id(d)
    m = M["deals"].get(lid)
    rel = f"/images/deals/{lid}.webp"
    if m and _exists(rel):
        return rel, m["alt"], m.get("fit", "cover"), False
    c = M["categories"].get(d["category"])
    rel = f'/images/deals/cat-{slug(d["category"])}.webp'
    if c and _exists(rel):
        return rel, c["alt"], "cover", True
    return "/images/photos/hero-640.webp", M["hero"]["alt"], "cover", True  # new category with no photo yet


def deal_img_tag(d):
    src, alt, fit, _ = deal_image(d)
    return (f'<div class="deal-media{" is-contain" if fit == "contain" else ""}"><img src="{src}" alt="{_esc(alt)}" '
            f'loading="lazy" decoding="async" width="{DEAL_W}" height="{DEAL_H}"></div>')


def guide_img(slug_, size="1200"):
    return f"/images/photos/{slug_}-{size}.webp"


def guide_alt(slug_):
    return M["guides"][slug_]["alt"]


def hero():
    return M["hero"]


def credit_names():
    """Unsplash photographers, linked to the photo pages, for the About page."""
    seen = {}
    for m in [M["hero"], *M["guides"].values(), *M["categories"].values(), *M["deals"].values()]:
        if m["source"] == "unsplash" and m["author"] not in seen:
            seen[m["author"]] = m["page"]
    links = [f'<a href="{p}" rel="nofollow noopener">{_esc(a)}</a>' for a, p in sorted(seen.items(), key=lambda x: x[0].lower())]
    return ", ".join(links[:-1]) + " and " + links[-1]


def _esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------------------------------------------------------- fetch / convert
def _source_bytes(key, m, cache):
    if cache:
        p = os.path.join(cache, key.replace(":", "_").replace("/", "_").replace(" ", "_"))
        if os.path.exists(p):
            return open(p, "rb").read()
    url = m["src"]
    if m["source"] == "unsplash":
        url = url.split("?")[0] + "?w=1800&q=85&fm=jpg"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (DDM image fetch)"})
    return urllib.request.urlopen(req, timeout=60).read()


def _render(raw, w, h, fit):
    from PIL import Image, ImageOps
    im = Image.open(io.BytesIO(raw))
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        bg.alpha_composite(im)
        im = bg
    im = im.convert("RGB")
    if fit == "contain":
        box = (int(w * 0.9), int(h * 0.86))
        im.thumbnail(box, Image.LANCZOS)
        canvas = Image.new("RGB", (w, h), (255, 255, 255))
        canvas.paste(im, ((w - im.width) // 2, (h - im.height) // 2))
        return canvas
    return ImageOps.fit(im, (w, h), Image.LANCZOS, centering=(0.5, 0.5))


def _save(im, rel, q=78):
    p = os.path.join(OUT, rel.lstrip("/"))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    im.save(p, "WEBP", quality=q, method=6)


def jobs():
    yield "hero", M["hero"], [(f"/images/photos/hero-{w}.webp", w, h, "cover") for w, h in HERO]
    for s, m in M["guides"].items():
        yield f"guide:{s}", m, [(f"/images/photos/{s}-{w}.webp", w, h, "cover") for w, h in GUIDE]
    for c, m in M["categories"].items():
        yield f"cat:{c}", m, [(f"/images/deals/cat-{slug(c)}.webp", DEAL_W, DEAL_H, "cover")]
    for i, m in M["deals"].items():
        yield f"deal:{i}", m, [(f"/images/deals/{i}.webp", DEAL_W, DEAL_H, m.get("fit", "cover"))]


def fetch(cache=None):
    made = failed = 0
    for key, m, outs in jobs():
        todo = [o for o in outs if not _exists(o[0])]
        if not todo:
            continue
        try:
            raw = _source_bytes(key, m, cache)
        except Exception as ex:  # keep going: the builder falls back to the category image
            print(f"  could not fetch {key}: {type(ex).__name__}")
            failed += 1
            continue
        for rel, w, h, fit in todo:
            _save(_render(raw, w, h, fit), rel)
            made += 1
            print("  wrote", rel)
    print(f"images: {made} written, {failed} failed")
    return failed


def check():
    import deals
    fb = [d for d in deals.deals() if deal_image(d)[3]]
    for d in fb:
        print(f'  {d["id"]} {d["merchant"]}: no own image, using the {d["category"]} category photo')
    print(f"images: {len(fb)} live deal(s) use a category fallback")
    return fb


if __name__ == "__main__":
    sys.path.insert(0, HERE)
    a = sys.argv[1:]
    if not a or a[0] not in ("fetch", "check"):
        print(__doc__)
        sys.exit(2)
    if a[0] == "fetch":
        cache = a[a.index("--cache") + 1] if "--cache" in a else None
        sys.exit(1 if fetch(cache) else 0)
    check()
