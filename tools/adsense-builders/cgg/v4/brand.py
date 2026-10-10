#!/usr/bin/env python3
"""Crazy Golf Game brand marks (v4, "Scratch & Fire").
One heavy condensed italic (Archivo, OFL) outlined to SVG paths, so the marks render identically without web fonts.
'CRAZY' sits knocked out of a flag-orange slanted badge: the craziness is the badge of honour.
Source TTFs (OFL), download to /tmp/fonts/: https://github.com/google/fonts/raw/main/ofl/archivo/Archivo-Italic%5Bwdth,wght%5D.ttf
Run once to regenerate v4/brand/*.svg; the build copies them into cgg/images/brand/."""
import math, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "brand"; OUT.mkdir(exist_ok=True)
SRC = pathlib.Path("/tmp/fonts")
FLAG, INK, CHALK, TURF, VOLT = "#FF4B1F", "#0D1410", "#F6F3EC", "#0E3B2A", "#D7FF3A"
SLANT = math.tan(math.radians(12))

HEAVY = instancer.instantiateVariableFont(TTFont(SRC / "Archivo-Italic.ttf"), {"wght": 900, "wdth": 70})
BOLD = instancer.instantiateVariableFont(TTFont(SRC / "Archivo.ttf"), {"wght": 700, "wdth": 100})


def text(font, s, x, y, size, tracking=0.0):
    upm = font["head"].unitsPerEm; k = size / upm
    gs = font.getGlyphSet(); cmap = font.getBestCmap(); d = []; cx = x
    for ch in s:
        g = gs[cmap[ord(ch)]]
        if ch != " ":
            pen = SVGPathPen(gs, ntos=lambda v: ("%.1f" % v).rstrip("0").rstrip("."))
            g.draw(TransformPen(pen, (k, 0, 0, -k, cx, y)))
            d.append(pen.getCommands())
        cx += g.width * k + tracking * size
    return " ".join(d), cx - x - tracking * size


def bounds(font, s, size):
    """ink bounds (xmin, xmax) of the string at origin 0, size px."""
    from fontTools.pens.boundsPen import BoundsPen
    upm = font["head"].unitsPerEm; k = size / upm; gs = font.getGlyphSet(); cmap = font.getBestCmap()
    xs = []; cx = 0
    for ch in s:
        g = gs[cmap[ord(ch)]]
        if ch != " ":
            bp = BoundsPen(gs); g.draw(bp)
            if bp.bounds: xs += [cx + bp.bounds[0] * k, cx + bp.bounds[2] * k]
        cx += g.width * k
    return min(xs), max(xs)


def badge(x, y_top, w, h, fill):
    """slanted parallelogram (12deg) starting at x on the baseline."""
    o = h * SLANT
    return f'<path d="M{x + o:.1f} {y_top:.1f}H{x + o + w:.1f}L{x + w:.1f} {y_top + h:.1f}H{x:.1f}Z" fill="{fill}"/>'


def svg(w, h, body, title="Crazy Golf Game"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} {h:.1f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>\n')


CAP = 0.73  # Archivo cap height / size (approx)


def lockup(dark_bg=False):
    """Horizontal: [CRAZY] badge + GOLF GAME, one baseline."""
    size = 64; cap = size * CAP; padx = 14; pady = 10
    fg = CHALK if dark_bg else INK
    x0, x1 = bounds(HEAVY, "CRAZY", size)
    bw = (x1 - x0) + padx * 2; bh = cap + pady * 2
    base = pady + cap + 2  # baseline y
    crazy, _ = text(HEAVY, "CRAZY", padx - x0 + pady * SLANT, base, size)
    gx = bw + bh * SLANT + 12
    g0, g1 = bounds(HEAVY, "GOLF GAME", size)
    golf, _ = text(HEAVY, "GOLF GAME", gx - g0, base, size, 0.004)
    W = gx + (g1 - g0) + 6
    body = badge(0, 0, bw, bh, FLAG) + f'<path d="{crazy}" fill="{CHALK if not dark_bg else INK}"/>'.replace(f'fill="{INK}"', f'fill="{INK}"') + f'<path d="{golf}" fill="{fg}"/>'
    # CRAZY is always knocked out in white-ish chalk for punch, whatever the background
    body = badge(0, 0, bw, bh, FLAG) + f'<path d="{crazy}" fill="#FFFFFF"/>' + f'<path d="{golf}" fill="{fg}"/>'
    return svg(W, bh, body)


def stacked(dark_bg=False):
    """Stacked: CRAZY badge over GOLF GAME (footer, social, OG)."""
    fg = CHALK if dark_bg else INK
    s2 = 74; cap2 = s2 * CAP
    g0, g1 = bounds(HEAVY, "GOLF GAME", s2); gw = g1 - g0
    s1 = 60; cap1 = s1 * CAP; padx = 14; pady = 9
    c0, c1 = bounds(HEAVY, "CRAZY", s1)
    bw = (c1 - c0) + padx * 2; bh = cap1 + pady * 2
    crazy, _ = text(HEAVY, "CRAZY", padx - c0 + pady * SLANT, pady + cap1 + 1.5, s1)
    y2 = bh + 12 + cap2
    golf, _ = text(HEAVY, "GOLF GAME", -g0, y2, s2)
    W = max(gw, bw + bh * SLANT) + 4; H = y2 + 4
    body = badge(0, 0, bw, bh, FLAG) + f'<path d="{crazy}" fill="#FFFFFF"/><path d="{golf}" fill="{fg}"/>'
    return svg(W, H, body)


def mark(bg=FLAG, fg="#FFFFFF"):
    """Standalone mark: CG knocked out of the slanted flag badge; a ball-dot is the full stop."""
    size = 62; cap = size * CAP; S = 128.0
    c0, c1 = bounds(HEAVY, "CG", size); r = 4.4
    inner = (c1 - c0) + 4 + 2 * r            # CG + gap + ball
    h = cap + 26; o = h * SLANT; bw = inner + 20
    x = (S - bw - o) / 2; y = (S - h) / 2
    cg, _ = text(HEAVY, "CG", 0, 0, size)
    # centre the slanted text block in the slanted badge (shift right by half the slant offset)
    tx = x + 10 - c0 + o / 2 - 2; ty = y + h / 2 + cap / 2
    dot = f'<circle cx="{tx + c1 + 4 + r - 1.5:.1f}" cy="{ty - r:.1f}" r="{r}" fill="{fg}"/>'
    body = badge(x, y, bw, h, bg) + f'<g transform="translate({tx:.1f} {ty:.1f})"><path d="{cg}" fill="{fg}"/></g>' + dot
    return svg(S, S, body)


def favicon():
    size = 44; cap = size * CAP
    c0, c1 = bounds(HEAVY, "CG", size); w = c1 - c0
    cg, _ = text(HEAVY, "CG", 32 - (c0 + w / 2), 32 + cap / 2, size)
    return svg(64, 64, f'<rect width="64" height="64" rx="12" fill="{FLAG}"/><path d="{cg}" fill="#FFFFFF"/>')


def main():
    (OUT / "logo-v4.svg").write_text(lockup(False))
    (OUT / "logo-v4-light.svg").write_text(lockup(True))
    (OUT / "logo-v4-stacked.svg").write_text(stacked(False))
    (OUT / "logo-v4-stacked-light.svg").write_text(stacked(True))
    (OUT / "mark-v4.svg").write_text(mark())
    (OUT / "mark-v4-ink.svg").write_text(mark(bg=INK, fg=FLAG))
    (OUT / "favicon-v4.svg").write_text(favicon())
    for p in sorted(OUT.glob("*.svg")): print(p.name, p.stat().st_size)


if __name__ == "__main__":
    main()
