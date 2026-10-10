#!/usr/bin/env python3
"""Crazy Golf Game brand marks (v3). Text is converted to outlines from the OFL fonts in /tmp/fonts
(Fraunces, Libre Franklin) so the SVGs render the same everywhere without web fonts.
Source TTFs (OFL): https://github.com/google/fonts/raw/main/ofl/fraunces/Fraunces%5BSOFT,WONK,opsz,wght%5D.ttf
and https://github.com/google/fonts/raw/main/ofl/librefranklin/LibreFranklin%5Bwght%5D.ttf (download to /tmp/fonts/).
Run once to regenerate v3/brand/*.svg; the build copies them into cgg/images/."""
import math, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "brand"; OUT.mkdir(exist_ok=True)
SRC = pathlib.Path("/tmp/fonts")

GREEN, GREEN_D, LINEN, SAND, BRASS, CHAR = "#1E3A2F", "#132820", "#F4EFE6", "#D8C8A4", "#B08D4A", "#1F2326"


def load(fn, axes):
    f = TTFont(SRC / fn)
    return instancer.instantiateVariableFont(f, axes)


SERIF = load("Fraunces.ttf", {"wght": 600, "opsz": 96, "SOFT": 0, "WONK": 0})
SERIF_R = load("Fraunces.ttf", {"wght": 500, "opsz": 144, "SOFT": 0, "WONK": 0})
SANS = load("LibreFranklin.ttf", {"wght": 600})


def glyph_path(font, ch, transform):
    gs = font.getGlyphSet(); cmap = font.getBestCmap()
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs, ntos=lambda v: ("%.1f" % v).rstrip("0").rstrip("."))
    gs[name].draw(TransformPen(pen, transform))
    return pen.getCommands(), gs[name].width


def text_line(font, s, x, y, size, tracking=0.0):
    """Return svg path data for s with baseline at (x,y), font-size px, tracking in em."""
    upm = font["head"].unitsPerEm; k = size / upm
    gs = font.getGlyphSet(); cmap = font.getBestCmap()
    d = []; cx = x
    for ch in s:
        if ch == " ":
            cx += gs[cmap[32]].width * k + tracking * size; continue
        cmd, adv = glyph_path(font, ch, (k, 0, 0, -k, cx, y))
        d.append(cmd); cx += adv * k + tracking * size
    return " ".join(d), cx - x - tracking * size


def width(font, s, size, tracking=0.0):
    return text_line(font, s, 0, 0, size, tracking)[1]


def text_arc(font, s, cx, cy, r, size, tracking, center_deg, bottom=False):
    """Glyphs along a circle. Top text reads clockwise, bottom text counter-clockwise (upright)."""
    upm = font["head"].unitsPerEm; k = size / upm
    gs = font.getGlyphSet(); cmap = font.getBestCmap()
    advs = [(gs[cmap[ord(c)]].width * k) + tracking * size for c in s]
    total = sum(advs) - tracking * size
    span = total / r  # radians
    d = []
    if not bottom:
        a = math.radians(center_deg) - span / 2
        for c, adv in zip(s, advs):
            mid = a + (adv - tracking * size) / 2 / r
            if c != " ":
                cmd, w = glyph_path(font, c, (1, 0, 0, 1, 0, 0))
                ang = mid
                ca, sa = math.cos(ang), math.sin(ang)
                # place glyph: rotate so its baseline is tangent; glyph origin at its left edge
                px, py = cx + r * math.sin(ang), cy - r * math.cos(ang)
                hw = w * k / 2
                # transform: scale(k,-k), translate(-w/2 baseline), rotate(ang), translate(px,py)
                a_, b_, c_, d_ = k * ca, k * sa, k * sa, -k * ca
                e_ = px - hw * ca
                f_ = py - hw * sa
                cmd, _ = glyph_path(font, c, (a_, b_, c_, d_, e_, f_))
                d.append(cmd)
            a += adv / r
    else:
        a = math.radians(center_deg) + span / 2
        for c, adv in zip(s, advs):
            mid = a - (adv - tracking * size) / 2 / r
            if c != " ":
                _, w = glyph_path(font, c, (1, 0, 0, 1, 0, 0))
                ang = mid
                ca, sa = math.cos(ang), math.sin(ang)
                px, py = cx + r * math.sin(ang), cy - r * math.cos(ang)
                hw = w * k / 2
                # upright along the bottom: rotate by ang+180
                a_, b_, c_, d_ = -k * ca, -k * sa, -k * sa, k * ca
                e_ = px + hw * ca
                f_ = py + hw * sa
                cmd, _ = glyph_path(font, c, (a_, b_, c_, d_, e_, f_))
                d.append(cmd)
            a -= adv / r
    return " ".join(d)


def seal(fg=GREEN, bg=LINEN, accent=BRASS, size=120):
    c = size / 2
    top = text_arc(SANS, "CRAZY GOLF GAME", c, c, 44.5, 9.4, 0.13, 0)
    bot = text_arc(SANS, "THE GAME WITHIN THE GAME", c, c, 51.6, 6.4, 0.12, 180, bottom=True)
    # monogram CG
    cg_w = width(SERIF_R, "CG", 40, -0.02)
    cg, _ = text_line(SERIF_R, "CG", c - cg_w / 2, c + 14.5, 40, -0.02)
    # flagstick rising out of the G with a pennant
    stick_x = c + cg_w / 2 - 6.5
    flag = (f'<path d="M{stick_x:.2f} {c - 13:.2f} V{c - 29.5:.2f}" stroke="{fg}" stroke-width="1.5" stroke-linecap="round"/>'
            f'<path d="M{stick_x + .7:.2f} {c - 29.5:.2f} L{stick_x + 10:.2f} {c - 26.6:.2f} L{stick_x + .7:.2f} {c - 23.7:.2f} Z" fill="{accent}"/>')
    dots = "".join(f'<circle cx="{c + r * math.sin(math.radians(a)):.2f}" cy="{c - r * math.cos(math.radians(a)):.2f}" r="1.5" fill="{accent}"/>' for a, r in ((96, 47.5), (264, 47.5)))
    return (f'<circle cx="{c}" cy="{c}" r="{c - 1}" fill="{bg}" stroke="{fg}" stroke-width="2"/>'
            f'<circle cx="{c}" cy="{c}" r="{c - 5}" fill="none" stroke="{fg}" stroke-width=".7"/>'
            f'<circle cx="{c}" cy="{c}" r="34" fill="none" stroke="{fg}" stroke-width=".9"/>'
            f'<path d="{top}" fill="{fg}"/><path d="{bot}" fill="{fg}"/>{dots}'
            f'<path d="{cg}" fill="{fg}"/>{flag}')


def svg(w, h, body, title="Crazy Golf Game"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} {h:.1f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>\n')


def lockup(dark=True):
    fg = GREEN if dark else LINEN
    bg = LINEN if dark else GREEN_D
    sub = "#5B6B62" if dark else "#C9BFA8"
    size = 120
    word, ww = text_line(SERIF, "Crazy Golf Game", 0, 0, 58, -0.012)
    tag, tw = text_line(SANS, "GOLF  \u00b7  GAMES  \u00b7  CLUBHOUSE", 0, 0, 13, 0.32)
    # NB: \u00b7 may be absent; fall back handled below
    gap = 26; x0 = size + gap
    W = x0 + max(ww, tw) + 4
    body = (f'<g>{seal(fg=fg, bg=bg, accent=BRASS)}</g>'
            f'<g transform="translate({x0},70)"><path d="{word}" fill="{fg}"/></g>'
            f'<g transform="translate({x0 + 2},98)"><path d="{tag}" fill="{sub}"/></g>')
    return svg(W, size, body)


def mark(dark=True):
    fg = GREEN if dark else LINEN
    bg = LINEN if dark else GREEN_D
    return svg(120, 120, seal(fg=fg, bg=bg))


def favicon():
    # simplified for 16-48px: solid green disc, linen CG, brass pennant
    c = 32
    cg_w = width(SERIF_R, "CG", 30, -0.03)
    cg, _ = text_line(SERIF_R, "CG", c - cg_w / 2, c + 10.5, 30, -0.03)
    body = (f'<circle cx="32" cy="32" r="31" fill="{GREEN}"/><circle cx="32" cy="32" r="27.5" fill="none" stroke="{SAND}" stroke-width="1.2"/>'
            f'<path d="{cg}" fill="{LINEN}"/>')
    return svg(64, 64, body)


def main():
    (OUT / "logo-v3.svg").write_text(lockup(True))
    (OUT / "logo-v3-light.svg").write_text(lockup(False))
    (OUT / "mark-v3.svg").write_text(mark(True))
    (OUT / "mark-v3-light.svg").write_text(mark(False))
    (OUT / "favicon-v3.svg").write_text(favicon())
    print("brand marks written")


if __name__ == "__main__":
    main()
