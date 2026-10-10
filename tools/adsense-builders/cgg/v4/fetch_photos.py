#!/usr/bin/env python3
"""v4 one-off: add energetic, licence-checked photos (swings, sand, night range, crazy golf after dark) to v4/photos/.
Reuses the v3 helpers (licence assert: CC0 / public domain / CC BY only; WebP 800w/1600w(/2400w) with size caps).
The v4 build merges v3/photos + v4/photos; credits for both are rendered on /credits/."""
import io, json, pathlib, re, sys
from PIL import Image
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "v3"))
import fetch_photos as v3f

v3f.OUT = HERE / "photos"; v3f.OUT.mkdir(exist_ok=True)
v3f.WIDE = {"swing-sunset", "range-night-targets"}

# key, Commons title, crop (l,t,r,b fractions) or None, alt
COMMONS = [
 ("swing-sunset", "File:Golf swing sunset.jpg", None, "A golfer silhouetted mid-swing against a blazing sunset"),
 ("bunker-blast", "File:Wedge out of sand golf.jpg", (0, .1, 1, 1), "A golfer blasting a wedge out of a bunker in a spray of sand"),
 ("swing-fairway", "File:Golf Swing - Sun Rivers.jpg", None, "A golfer at the top of the follow-through on a wide fairway under a big sky"),
 ("mini-night", "File:Mini Golf Course.jpg", None, "A floodlit mini golf course at dusk"),
 ("range-night-targets", "File:Driving range-3.jpg", None, "A three-storey driving range at night with glowing targets on the outfield"),
 ("range-tiers-night", "File:国分寺セントラルゴルフ - panoramio.jpg", None, "Floodlit tiers of a driving range at night behind the net"),
 ("ball-pyramid", "File:Golf Stack.jpg", None, "A pyramid of range balls stacked on the grass"),
 ("range-buckets", "File:2009 US Open - Nike golf balls (3648699153).jpg", None, "Buckets of practice balls on the range grass"),
 ("ball-and-bucket", "File:Golf balls driving range.jpg", None, "A ball in the grass in front of a bucket of range balls"),
]


def main():
    credits = {}
    for key, title, crop, alt in COMMONS:
        ii, meta = v3f.commons_meta(title)
        assert re.match(r"^(CC0|Public domain|CC BY [0-9.]+)$", meta["license"]), (title, meta["license"])
        im = Image.open(io.BytesIO(v3f.get(ii.get("thumburl") or ii["url"])))
        if crop:
            l, t, r, b = crop; im = im.crop((int(l * im.width), int(t * im.height), int(r * im.width), int(b * im.height)))
        sizes = v3f.save(key, im)
        credits[key] = {"alt": alt, "source": "Wikimedia Commons", "title": title, **meta, "sizes": sizes}
        print(key, meta["license"], meta["artist"][:40], sizes)
    (v3f.OUT / "credits.json").write_text(json.dumps(credits, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
