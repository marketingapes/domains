"""Glassman SSDI ad images: the BTL SSDI door images (btl/assets/ssdi/ads/) with the Glassman logo in place of
the Best Tort Lawyers label, the form image's state line set to Glassman's excluded states and the quiz image's
age range set to Glassman's 48–64 (Dan, Oct 27).
Run from the repo root on macOS (Arial, rsvg-convert): python3 btl/glassman/ssdi/brand_ads.py"""
import os, subprocess, sys, tempfile
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageMath

ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
TEXT = (224, 232, 244)
HEAD = (255, 255, 255)

def luma(p):
    r, g, b = p
    return 0.299 * r + 0.587 * g + 0.114 * b

def fill(im, rects, radius=22, region=None):
    """Repaint the rectangles (or a given mask) from the pixels around them (normalized blur).
    Other light text nearby is left out of the sources so it can't bleed in."""
    if region is None:
        region = Image.new("L", im.size, 0)
        d = ImageDraw.Draw(region)
        for r in rects:
            d.rectangle(r, fill=255)
    text = im.convert("L").point(lambda v: 255 if v > 85 else 0).filter(ImageFilter.MaxFilter(9))
    keep = ImageChops.invert(ImageChops.lighter(region, text))
    den = keep.filter(ImageFilter.GaussianBlur(radius)).convert("F")
    bands = []
    for band in im.split():
        num = ImageChops.multiply(band, keep).filter(ImageFilter.GaussianBlur(radius)).convert("F")
        bands.append(ImageMath.lambda_eval(lambda a: a["n"] * 255.0 / (a["d"] + 0.01), n=num, d=den).convert("L"))
    est = Image.merge("RGB", bands)
    noise = Image.effect_noise(im.size, 5).convert("L").point(lambda v: v - 128 + 128)
    est = Image.merge("RGB", [ImageChops.add(b, noise, 1.0, -128) for b in est.split()])
    return Image.composite(est, im, region.filter(ImageFilter.GaussianBlur(2)))

def draw_line(im, text, size, ink_left, ink_top):
    f = ImageFont.truetype(ARIAL, size=size)
    bb = f.getbbox(text)
    ImageDraw.Draw(im).text((ink_left - bb[0], ink_top - bb[1]), text, font=f, fill=TEXT)

def swap_word(im, new, ink_left, ink_top, ink_right, ink_bottom):
    """Repaint a headline word (only its own glyph pixels, so no patch shows) and draw the
    replacement at the same ink height, left edge and baseline."""
    box = (ink_left - 6, ink_top - 6, ink_right + 7, ink_bottom + 7)
    glyphs = im.crop(box).convert("L").point(lambda v: 255 if v > 110 else 0).filter(ImageFilter.MaxFilter(7))
    region = Image.new("L", im.size, 0)
    region.paste(glyphs, box[:2])
    im = fill(im, None, region=region)
    height = ink_bottom - ink_top
    size = min((s / 10 for s in range(400, 1400)),
               key=lambda s: abs((lambda b: b[3] - b[1])(ImageFont.truetype(ARIAL_BOLD, size=s).getbbox(new)) - height))
    f = ImageFont.truetype(ARIAL_BOLD, size=size)
    bb = f.getbbox(new)
    ImageDraw.Draw(im).text((ink_left - bb[0], ink_bottom - bb[3]), new, font=f, fill=HEAD)
    return im

def build(src, dst, vertical, form, logo_png, logo_w, quiz=False):
    im = Image.open(src).convert("RGB")
    top = 256 if vertical else 81
    label = [(68, top - 8, 434, top + 28), (68, top + 36, 182, top + 52)]
    im = fill(im, label)
    if quiz:  # headline "SSDI help for adults 54–63" (BTL's range); measured ink box of "54–63"
        if vertical:
            im = swap_word(im, "48–64", 80, 1030, 334, 1098)
        else:
            im = swap_word(im, "48–64", 794, 636, 990, 689)
    if form:
        if vertical:   # line 2 of the subhead: "available in CA or CO."
            box, text, size, left, ink_top = (68, 1216, 604, 1276), "available in ND, SD, AK or HI.", 52.2, 77, 1226
        else:          # line 2 of the subhead: "CA or CO."
            box, text, size, left, ink_top = (68, 726, 274, 774), "ND, SD, AK or HI.", 40.2, 77, 735
        im = fill(im, [box])
        draw_line(im, text, size, left, ink_top)
    logo = Image.open(logo_png).convert("RGBA")
    logo = logo.resize((logo_w, round(logo.height * logo_w / logo.width)), Image.LANCZOS)
    # soft shade under the logo so the white wordmark holds on lighter photo areas
    shade = Image.new("L", im.size, 0)
    ImageDraw.Draw(shade).rounded_rectangle((40, top - 40, 75 + logo_w + 40, top - 12 + logo.height + 40), 40, fill=110)
    shade = shade.filter(ImageFilter.GaussianBlur(28))
    im = Image.composite(Image.new("RGB", im.size, (8, 14, 26)), im, shade)
    im.paste(logo, (75, top - 12), logo)
    im.save(dst, quality=92, subsampling=0)

if __name__ == "__main__":
    src, out = "btl/assets/ssdi/ads", "btl/assets/glassman-ssdi/ads"
    logo_png = os.path.join(tempfile.mkdtemp(), "logo.png")
    subprocess.run(["rsvg-convert", "-w", "1200", "btl/glassman-ssdi/img/logo.svg", "-o", logo_png], check=True)
    for door in ("quiz", "sofia", "form"):
        for size, vertical in (("1080x1080", False), ("1080x1920", True)):
            build(f"{src}/ssdi-{door}-{size}.jpg", f"{out}/glassman-ssdi-{door}-{size}.jpg", vertical, door == "form", logo_png, 440,
                  quiz=door == "quiz")
