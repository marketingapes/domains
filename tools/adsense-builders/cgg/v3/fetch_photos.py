#!/usr/bin/env python3
"""One-off: download licence-checked photos, crop, and write optimised WebP (800w + 1600w) into v3/photos/.
Sources: Wikimedia Commons (CC0 / public domain / CC BY only, no share-alike) and the Library of Congress
John Margolies Roadside America archive ("No known restrictions on publication").
Credits are written to v3/photos/credits.json and rendered on /credits/. Re-run only to refresh images."""
import io, json, pathlib, subprocess, re, urllib.parse
from PIL import Image, ImageOps

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "photos"; OUT.mkdir(exist_ok=True)
UA = "cgg-draft/1.0 (info@crazygolfgame.com)"

# key, source, id, crop (l,t,r,b fractions) or None, alt text
COMMONS = [
 ("green-aerial-bunkers", "File:Putting green at the Royal Canberra Golf Club 3.JPG", None, "Aerial view of a putting green ringed by bunkers and pine trees"),
 ("green-aerial-flag", "File:Putting green at the Royal Canberra Golf Club 4.JPG", None, "Aerial view of a green with a kidney-shaped bunker and the flag in the hole"),
 ("green-aerial-sand", "File:Putting green at the Royal Canberra Golf Club 1.JPG", None, "Aerial view of a green with two round bunkers"),
 ("green-aerial-heart", "File:Putting green at the Royal Canberra Golf Club 5.JPG", None, "Aerial view of a raised green guarded by two bunkers"),
 ("links-pebble-beach", "File:Pebble Beach Golf Links 02.jpg", None, "A green and bunkers above the sea at Pebble Beach Golf Links"),
 ("ball-by-cup", "File:Golf ball near hole.jpg", None, "A golf ball resting a few inches from the hole"),
 ("tee-box-view", "File:Tee box at The Ridges at Village Creek State Park golf course near Wynne, Arkansas.jpg", None, "View down a tree-lined fairway from the tee box"),
 ("putt-to-cup", "File:Golf putting on green.jpg", None, "A putter and ball on the green a short way from the cup"),
 ("putting-stance", "File:Golf putter on green.jpg", None, "A golfer's shoes and putter at address on the green, with the hole in the foreground"),
 ("ball-on-green", "File:Golf ball on the green.jpg", None, "A golf ball on a smooth green with pine trees behind"),
 ("driver-at-address", "File:Golf-driver 1.jpg", None, "A driver behind a teed-up ball on a misty morning"),
 ("clubs-in-bag", "File:Golf bag and clubs.jpg", None, "Irons standing in a golf bag"),
 ("glove-balls-putter", "File:Golf balls and glove.jpg", None, "A golf glove, a ball and a putter laid out on the grass"),
 ("clubhouse-pines", "File:Alabama's Coastal Connection - Lone Golfer at Isle Dauphin Country Club - NARA - 7716837.jpg", None, "A clubhouse behind a bunker and tall pines at Isle Dauphin Country Club"),
 ("scorecard-vintage", "File:Benvenue Country Club, Rocky Mount, N.C. Golf Score Card - DPLA - 2ee7d8c8e1eb03c2ce2308b51db72e3f (page 2).jpg", None, "A vintage golf scorecard from Benvenue Country Club"),
 ("scorecard-cart", "File:Score card (golf).jpg", None, "A scorecard clipped to a golf cart"),
 ("bag-on-fairway", "File:Lonely golf bag, waiting... (49848623301).jpg", None, "A stand bag on a hillside fairway under a big sky"),
 ("putter-by-green", "File:Golf putter by green.jpg", None, "A putter beside a ball on the fringe of a green"),
 ("ball-on-tee", "File:Golf ball with tee.jpg", None, "A ball on a tee in freshly mown grass"),
 ("ball-macro", "File:Golf-ball up close.jpg", None, "Close-up of the dimples on a golf ball"),
 ("indoor-putters", "File:Indoor golf in Japan 2.jpg", None, "Putters lined up on an indoor carpet putting surface"),
 ("ball-red-tee", "File:Golf on the tee.jpg", None, "A ball on a red tee in the grass"),
 ("green-at-sun", "File:Golfing on green sun.jpg", None, "A green with the flag and hills under a bright sky"),
]
LOC = [
 ("mini-three-holes", "2017705405", "03200/03295", "Three holes at Rich's miniature golf, Wyoming, Pennsylvania (1984)"),
 ("mini-pyramid", "2017704567", "02400/02454", "Pyramid hole at Royal Oak miniature golf, Royal Oak, Michigan (1986)"),
 ("mini-ramps", "2017705205", "03000/03094", "Golf ramps at Penguin Turtle miniature golf, Lenox, Massachusetts (1984)"),
 ("mini-windmill", "2017704560", "02400/02447", "Windmill hole at Royal Oak miniature golf, Royal Oak, Michigan (1986)"),
 ("mini-indoor", "2017712918", "10800/10833", "Homowack indoor miniature golf, Mamakating, New York (1977)"),
]


def get(url):
    return subprocess.run(["curl", "-sfL", "--retry", "3", "-m", "120", "-A", UA, url], capture_output=True, check=True).stdout


def commons_meta(title):
    q = urllib.parse.urlencode({"action": "query", "format": "json", "titles": title, "prop": "imageinfo",
                                "iiprop": "url|size|extmetadata", "iiurlwidth": 2560})
    p = next(iter(json.loads(get("https://commons.wikimedia.org/w/api.php?" + q))["query"]["pages"].values()))
    ii = p["imageinfo"][0]; m = ii["extmetadata"]
    v = lambda k: re.sub(r"<[^>]+>", "", m.get(k, {}).get("value", "")).strip()
    return ii, {"artist": v("Artist") or v("Credit"), "license": v("LicenseShortName"), "license_url": v("LicenseUrl"),
                "page": ii["descriptionurl"], "credit_line": v("Credit")}


def trim_slide(im):
    """LOC Margolies scans include a black slide mount; trim dark borders."""
    g = ImageOps.grayscale(im); w, h = g.size; px = g.load()
    def dark_col(x): return sum(px[x, y] for y in range(0, h, 7)) / len(range(0, h, 7)) < 45
    def dark_row(y): return sum(px[x, y] for x in range(0, w, 7)) / len(range(0, w, 7)) < 45
    l = 0
    while l < w // 4 and dark_col(l): l += 1
    r = w - 1
    while r > w * 3 // 4 and dark_col(r): r -= 1
    t = 0
    while t < h // 4 and dark_row(t): t += 1
    b = h - 1
    while b > h * 3 // 4 and dark_row(b): b -= 1
    pad = 8
    return im.crop((l + pad, t + pad, r - pad, b - pad))


WIDE = {"green-aerial-bunkers"}


def save(key, im):
    im = ImageOps.exif_transpose(im).convert("RGB")
    out = {}
    for w in ((800, 1600, 2400) if key in WIDE else (800, 1600)):
        x = im.copy()
        if x.width > w:
            x = x.resize((w, round(x.height * w / x.width)), Image.LANCZOS)
        fn = OUT / f"{key}-{w}.webp"
        cap = {800: 90_000, 1600: 230_000, 2400: 320_000}[w]
        for q in (74, 66, 58, 50, 44):
            x.save(fn, "WEBP", quality=q, method=6)
            if fn.stat().st_size <= cap:
                break
        while fn.stat().st_size > cap * 1.15 and x.width > w * 0.6:
            x = x.resize((int(x.width * .85), int(x.height * .85)), Image.LANCZOS)
            x.save(fn, "WEBP", quality=60, method=6)
        out[w] = [x.width, x.height, fn.stat().st_size]
    return out


def main():
    credits = {}
    for key, title, crop, alt in COMMONS:
        ii, meta = commons_meta(title)
        lic = meta["license"]
        assert re.match(r"^(CC0|Public domain|CC BY [0-9.]+)$", lic), (title, lic)
        im = Image.open(io.BytesIO(get(ii.get("thumburl") or ii["url"])))
        if crop:
            l, t, r, b = crop; im = im.crop((int(l * im.width), int(t * im.height), int(r * im.width), int(b * im.height)))
        sizes = save(key, im)
        credits[key] = {"alt": alt, "source": "Wikimedia Commons", "title": title, **meta, "sizes": sizes}
        print(key, lic, sizes)
    for key, item, path, alt in LOC:
        sid = path.replace("/", ":")
        try:
            raw = get(f"https://tile.loc.gov/image-services/iiif/service:pnp:mrg:{sid}/full/pct:100/0/default.jpg")
        except Exception:
            raw = get(f"https://tile.loc.gov/storage-services/service/pnp/mrg/{path}v.jpg")
        im = trim_slide(Image.open(io.BytesIO(raw)).convert("RGB"))
        sizes = save(key, im)
        credits[key] = {"alt": alt, "source": "Library of Congress", "title": alt, "artist": "John Margolies",
                        "license": "No known restrictions on publication",
                        "license_url": "https://www.loc.gov/rr/print/res/723_marg.html",
                        "page": f"https://www.loc.gov/item/{item}/",
                        "credit_line": "John Margolies Roadside America photograph archive (1972-2008), Library of Congress, Prints and Photographs Division",
                        "sizes": sizes}
        print(key, sizes)
    (OUT / "credits.json").write_text(json.dumps(credits, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
