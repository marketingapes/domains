"""Tiny cartoon SVG kit for Tossed Brew illustrations."""
import math, random

INK = "#2a1a0e"
SW = 4
_id = [0]

def uid(p="c"):
    _id[0] += 1
    return f"{p}{_id[0]}"

def svg(w, h, title, body, desc=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-labelledby="t d">'
            f'<title id="t">{title}</title><desc id="d">{desc or title}</desc>'
            f'<g stroke-linejoin="round" stroke-linecap="round">{body}</g></svg>\n')

def bg(w, h, c1, c2, blobs=()):
    g = uid("g")
    s = (f'<defs><linearGradient id="{g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c1}"/>'
         f'<stop offset="1" stop-color="{c2}"/></linearGradient></defs><rect width="{w}" height="{h}" fill="url(#{g})"/>')
    for (x, y, r, c, o) in blobs:
        s += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" opacity="{o}"/>'
    return s

def floor(w, h, y, c):
    return f'<path d="M0 {y} Q{w/2} {y-30} {w} {y} L{w} {h} L0 {h} Z" fill="{c}"/>'

# ---------- glasses ----------
SHAPES = {
    # path, top_y, bowl_bottom_y, rim_halfwidth, stem
    "pint":   ("M-42 0 L42 0 L55 -170 L-55 -170 Z", -170, 0, 55, False),
    "nonic":  ("M-40 0 L40 0 L47 -128 Q58 -145 51 -160 L53 -176 L-53 -176 L-51 -160 Q-58 -145 -47 -128 Z", -176, 0, 53, False),
    "tulip":  ("M-8 -46 C-64 -60 -64 -150 -36 -172 C-40 -182 -46 -190 -46 -198 L46 -198 C46 -190 40 -182 36 -172 C64 -150 64 -60 8 -46 Z", -198, -46, 46, True),
    "snifter":("M-10 -40 C-82 -52 -82 -150 -34 -166 L-34 -172 L34 -172 L34 -166 C82 -150 82 -52 10 -40 Z", -172, -40, 34, True),
    "pilsner":("M-20 0 L20 0 L40 -225 L-40 -225 Z", -225, 0, 40, False),
    "weizen": ("M-24 0 L24 0 C28 -80 20 -120 34 -170 C44 -205 38 -225 36 -238 L-36 -238 C-38 -225 -44 -205 -34 -170 C-20 -120 -28 -80 -24 0 Z", -238, 0, 36, False),
    "teku":   ("M-8 -52 L-50 -98 L-40 -176 L-48 -192 L48 -192 L40 -176 L50 -98 L8 -52 Z", -192, -52, 48, True),
    "stange": ("M-24 0 L24 0 L24 -175 L-24 -175 Z", -175, 0, 24, False),
    "mug":    ("M-48 0 Q-50 0 -50 -6 L-50 -160 L50 -160 L50 -6 Q50 0 44 0 Z", -160, 0, 50, False),
}

def glass(kind, x, y, s=1.0, beer="#f0a53a", fill=0.78, foam=26, face=False, rot=0, foamc="#fffaf0", mood="happy"):
    path, top, bot, rim, stem = SHAPES[kind]
    cid = uid("clip")
    level = bot - fill * (bot - top)
    out = f'<g transform="translate({x} {y}) rotate({rot}) scale({s})">'
    out += f'<defs><clipPath id="{cid}"><path d="{path}"/></clipPath></defs>'
    if stem:
        out += f'<rect x="-6" y="{bot}" width="12" height="{-bot-8}" fill="#e9f3f7" stroke="{INK}" stroke-width="{SW}"/>'
        out += f'<ellipse cx="0" cy="-5" rx="40" ry="8" fill="#e9f3f7" stroke="{INK}" stroke-width="{SW}"/>'
    if kind == "mug":
        out += f'<path d="M50 -130 C92 -130 92 -40 50 -40" fill="none" stroke="{INK}" stroke-width="16"/>'
        out += f'<path d="M50 -130 C92 -130 92 -40 50 -40" fill="none" stroke="#e9f3f7" stroke-width="8"/>'
    out += f'<path d="{path}" fill="#eef7fa"/>'
    out += f'<g clip-path="url(#{cid})"><rect x="-90" y="{level}" width="180" height="{bot-level+2}" fill="{beer}"/>'
    out += f'<rect x="-90" y="{level-foam}" width="180" height="{foam}" fill="{foamc}"/>'
    # bubbles
    rnd = random.Random(int(x * 7 + y * 3))
    for _ in range(7):
        bx = rnd.uniform(-rim * 0.6, rim * 0.6); by = rnd.uniform(level + 10, bot - 10)
        if by < bot - 4:
            out += f'<circle cx="{bx:.0f}" cy="{by:.0f}" r="{rnd.uniform(2,4.5):.1f}" fill="#fff" opacity=".55"/>'
    out += f'<rect x="{-rim*0.62:.0f}" y="{top+14}" width="8" height="{(bot-top)*0.7:.0f}" rx="4" fill="#fff" opacity=".45"/></g>'
    ftop = level - foam
    if ftop <= top + 6:
        n = max(3, int(rim / 14))
        for i in range(n + 1):
            cx = -rim + i * (2 * rim / n)
            out += f'<circle cx="{cx:.0f}" cy="{top+2}" r="{rim/n*1.25:.0f}" fill="{foamc}" stroke="{INK}" stroke-width="{SW}"/>'
        out += f'<rect x="{-rim+2}" y="{top-2}" width="{2*rim-4}" height="10" fill="{foamc}"/>'
    out += f'<path d="{path}" fill="none" stroke="{INK}" stroke-width="{SW}"/>'
    if face:
        fy = (level + bot) / 2 if bot - level > 60 else level + 30
        r_, g_, b_ = (int(beer[i:i+2], 16) for i in (1, 3, 5))
        out += face_svg(0, fy, mood, "#fff7ea" if (r_ * 299 + g_ * 587 + b_ * 114) / 1000 < 90 else INK)
    out += '</g>'
    return out

def face_svg(x, y, mood="happy", ec=INK):
    s = f'<g transform="translate({x} {y})">'
    s += f'<ellipse cx="-14" cy="-6" rx="4.5" ry="6" fill="{ec}"/><ellipse cx="14" cy="-6" rx="4.5" ry="6" fill="{ec}"/>'
    s += '<circle cx="-12" cy="-8" r="1.6" fill="#fff"/><circle cx="16" cy="-8" r="1.6" fill="#fff"/>'
    s += '<circle cx="-24" cy="6" r="6" fill="#ff8f8f" opacity=".55"/><circle cx="24" cy="6" r="6" fill="#ff8f8f" opacity=".55"/>'
    if mood == "sniff":
        s += f'<ellipse cx="0" cy="10" rx="5" ry="4" fill="{ec}"/>'
    else:
        s += f'<path d="M-10 6 Q0 18 10 6" fill="#8a2e22" stroke="{ec}" stroke-width="3"/>'
    return s + '</g>'

# ---------- props ----------
def hop(x, y, s=1.0, rot=0):
    o = f'<g transform="translate({x} {y}) rotate({rot}) scale({s})">'
    o += f'<path d="M0 -44 Q2 -60 -6 -70" fill="none" stroke="#4d6b22" stroke-width="4"/>'
    o += f'<path d="M-4 -62 Q-34 -80 -40 -56 Q-18 -48 -4 -62 Z" fill="#7fb241" stroke="{INK}" stroke-width="3"/>'
    rows = [(-36, [0]), (-24, [-10, 10]), (-10, [-16, 0, 16]), (4, [-10, 10]), (18, [0])]
    shades = ["#8cc04b", "#9fd05a", "#7fb241", "#6fa336", "#5f8f2f"]
    for i, (ry, xs) in enumerate(rows):
        for rx in xs:
            o += f'<path d="M{rx-12} {ry-6} Q{rx} {ry+22} {rx+12} {ry-6} Q{rx} {ry-12} {rx-12} {ry-6} Z" fill="{shades[i]}" stroke="{INK}" stroke-width="3"/>'
    return o + '</g>'

def wheat(x, y, s=1.0, rot=0):
    o = f'<g transform="translate({x} {y}) rotate({rot}) scale({s})">'
    o += f'<path d="M0 0 L0 -120" stroke="#b98a2c" stroke-width="4"/>'
    for i in range(6):
        yy = -60 - i * 12
        o += f'<ellipse cx="-8" cy="{yy}" rx="6" ry="11" transform="rotate(-25 -8 {yy})" fill="#f2c14e" stroke="{INK}" stroke-width="2.5"/>'
        o += f'<ellipse cx="8" cy="{yy}" rx="6" ry="11" transform="rotate(25 8 {yy})" fill="#f2c14e" stroke="{INK}" stroke-width="2.5"/>'
    o += f'<ellipse cx="0" cy="-134" rx="6" ry="12" fill="#f2c14e" stroke="{INK}" stroke-width="2.5"/>'
    return o + '</g>'

def bubbles(x, y, w, h, n, seed=1, c="#fff", op=.6):
    r = random.Random(seed); o = ""
    for _ in range(n):
        o += f'<circle cx="{x + r.uniform(0,w):.0f}" cy="{y + r.uniform(0,h):.0f}" r="{r.uniform(4,14):.0f}" fill="none" stroke="{c}" stroke-width="3" opacity="{op}"/>'
    return o

def sparkle(x, y, s=1, c="#fff"):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0 -18 L4 -4 L18 0 L4 4 L0 18 L-4 4 L-18 0 L-4 -4 Z" fill="{c}" stroke="{INK}" stroke-width="2"/>'

def bottle(x, y, s=1.0, color="#6b3a1a", label="#f6e7c8", cap="#c2415a", rot=0, xmark=False):
    o = f'<g transform="translate({x} {y}) rotate({rot}) scale({s})">'
    o += f'<path d="M-30 0 L30 0 Q34 0 34 -6 L34 -110 Q34 -140 12 -155 L12 -200 L-12 -200 L-12 -155 Q-34 -140 -34 -110 L-34 -6 Q-34 0 -30 0 Z" fill="{color}" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<rect x="-15" y="-212" width="30" height="14" rx="3" fill="{cap}" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<rect x="-34" y="-95" width="68" height="55" fill="{label}" stroke="{INK}" stroke-width="3"/>'
    o += f'<circle cx="0" cy="-67" r="14" fill="none" stroke="{INK}" stroke-width="3"/>'
    o += f'<rect x="-24" y="-135" width="7" height="100" rx="3" fill="#fff" opacity=".35"/>'
    if xmark:
        o += f'<g stroke="#d7263d" stroke-width="12"><path d="M-50 -170 L50 -20"/><path d="M50 -170 L-50 -20"/></g>'
    return o + '</g>'

def can(x, y, s=1.0, color="#e8962e", stripe="#fff7ea", rot=0, art="hop"):
    o = f'<g transform="translate({x} {y}) rotate({rot}) scale({s})">'
    o += f'<path d="M-32 0 L32 0 Q36 0 36 -8 L36 -112 L-36 -112 L-36 -8 Q-36 0 -32 0 Z" fill="{color}" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<path d="M-34 -112 L-30 -122 L30 -122 L34 -112 Z" fill="#cfd8dc" stroke="{INK}" stroke-width="3"/>'
    o += f'<rect x="-36" y="-80" width="72" height="30" fill="{stripe}" stroke="{INK}" stroke-width="3"/>'
    if art == "hop":
        o += f'<circle cx="0" cy="-65" r="9" fill="#7fb241" stroke="{INK}" stroke-width="2.5"/>'
    else:
        o += f'<path d="M-14 -65 L14 -65" stroke="{INK}" stroke-width="4"/>'
    o += f'<rect x="-26" y="-106" width="6" height="96" rx="3" fill="#fff" opacity=".35"/>'
    return o + '</g>'

def cheese(x, y, s=1.0):
    o = f'<g transform="translate({x} {y}) scale({s})">'
    o += f'<path d="M-60 0 L60 0 L60 -40 L-60 0 Z" fill="#f7c948" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<path d="M-60 0 L60 -40 L40 -52 Z" fill="#fde28a" stroke="{INK}" stroke-width="{SW}"/>'
    for cx, cy, r in [(30, -14, 7), (45, -26, 4), (10, -6, 4)]:
        o += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#e0a92a"/>'
    return o + '</g>'

def chili(x, y, s=1.0, rot=0):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><path d="M-50 0 Q0 30 60 -20 Q20 10 -50 -14 Z" fill="#d7263d" stroke="{INK}" stroke-width="{SW}"/>'
            f'<path d="M-50 -7 Q-62 -10 -66 -24" fill="none" stroke="#4d8a2a" stroke-width="7"/><path d="M-20 -2 Q10 6 36 -8" stroke="#fff" stroke-width="4" opacity=".5"/></g>')

def oyster(x, y, s=1.0):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M-50 0 Q-60 -34 -20 -40 Q10 -50 40 -30 Q62 -12 44 4 Q0 18 -50 0 Z" fill="#d8d2c4" stroke="{INK}" stroke-width="{SW}"/>'
            f'<ellipse cx="-2" cy="-14" rx="30" ry="15" fill="#efe9dd" stroke="{INK}" stroke-width="3"/><ellipse cx="0" cy="-14" rx="16" ry="8" fill="#bfb49c"/></g>')

def lemon(x, y, r=40, c="#ffd23f", rim="#f2b705"):
    o = f'<g transform="translate({x} {y})"><circle r="{r}" fill="{rim}" stroke="{INK}" stroke-width="{SW}"/><circle r="{r*0.82:.0f}" fill="{c}"/>'
    for i in range(8):
        a = i * math.pi / 4
        o += f'<path d="M0 0 L{r*0.78*math.cos(a):.0f} {r*0.78*math.sin(a):.0f}" stroke="#fff4c2" stroke-width="3"/>'
    return o + '</g>'

def cherries(x, y, s=1.0):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M-20 -10 Q-10 -60 10 -70 M20 -8 Q18 -50 10 -70" fill="none" stroke="#4d6b22" stroke-width="4"/>'
            f'<path d="M10 -70 Q30 -84 40 -66 Q22 -60 10 -70 Z" fill="#7fb241" stroke="{INK}" stroke-width="3"/>'
            f'<circle cx="-20" cy="0" r="18" fill="#b0132b" stroke="{INK}" stroke-width="{SW}"/><circle cx="22" cy="4" r="18" fill="#c2182f" stroke="{INK}" stroke-width="{SW}"/>'
            f'<circle cx="-26" cy="-6" r="4" fill="#fff" opacity=".6"/><circle cx="16" cy="-2" r="4" fill="#fff" opacity=".6"/></g>')

def bean(x, y, s=1.0, rot=0):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><ellipse rx="16" ry="22" fill="#5a3218" stroke="{INK}" stroke-width="3"/>'
            f'<path d="M0 -20 Q-8 -6 0 0 Q8 6 0 20" fill="none" stroke="#2a1a0e" stroke-width="3"/></g>')

def choc(x, y, s=1.0, rot=0):
    o = f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><rect x="-60" y="-36" width="120" height="72" rx="6" fill="#6b3a1a" stroke="{INK}" stroke-width="{SW}"/>'
    for i in range(3):
        for j in range(2):
            o += f'<rect x="{-52 + i*36}" y="{-28 + j*34}" width="30" height="26" rx="3" fill="#7d4722" stroke="#4a2810" stroke-width="2"/>'
    return o + '</g>'

def barrel(x, y, s=1.0):
    o = f'<g transform="translate({x} {y}) scale({s})">'
    o += f'<path d="M-60 0 Q-80 -90 -60 -180 L60 -180 Q80 -90 60 0 Z" fill="#a0612f" stroke="{INK}" stroke-width="{SW}"/>'
    for xx in (-30, 0, 30):
        o += f'<path d="M{xx} 0 Q{xx*1.15} -90 {xx} -180" fill="none" stroke="#7a4520" stroke-width="3"/>'
    for yy, w in ((-30, 66), (-150, 66), (-90, 74)):
        o += f'<path d="M{-w} {yy} Q0 {yy+8} {w} {yy}" fill="none" stroke="#3b3b3b" stroke-width="9"/>'
    o += f'<ellipse cx="0" cy="-180" rx="60" ry="12" fill="#c07a3e" stroke="{INK}" stroke-width="{SW}"/>'
    return o + '</g>'

def kettle(x, y, s=1.0):
    o = f'<g transform="translate({x} {y}) scale({s})">'
    for i, fx in enumerate((-50, -20, 10, 40)):
        o += f'<path d="M{fx} 30 Q{fx-8} 14 {fx+6} 0 Q{fx+2} 14 {fx+14} 18 Q{fx+16} 26 {fx+8} 30 Z" fill="#ff9f1c" stroke="#d7263d" stroke-width="2.5"/>'
    o += f'<rect x="-90" y="26" width="180" height="16" rx="4" fill="#3b3b3b" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<path d="M-80 0 L-86 -150 L86 -150 L80 0 Z" fill="#c9d3d8" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<ellipse cx="0" cy="-150" rx="86" ry="14" fill="#b76a23" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<path d="M-86 -120 Q-112 -120 -110 -96 Q-100 -92 -84 -100" fill="none" stroke="{INK}" stroke-width="6"/>'
    o += f'<path d="M86 -120 Q112 -120 110 -96 Q100 -92 84 -100" fill="none" stroke="{INK}" stroke-width="6"/>'
    o += '<rect x="-66" y="-136" width="10" height="120" rx="5" fill="#fff" opacity=".5"/>'
    for sx in (-40, 0, 40):
        o += f'<path d="M{sx} -172 q-16 -22 0 -44 q16 -22 0 -44" fill="none" stroke="#fff" stroke-width="7" opacity=".85"/>'
    return o + '</g>'

def fermenter(x, y, s=1.0, bub=True):
    o = f'<g transform="translate({x} {y}) scale({s})">'
    o += f'<path d="M-62 0 L62 0 L72 -170 L-72 -170 Z" fill="#f4f1ea" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<path d="M-66 -110 L66 -110 L62 -8 L-58 -8 Z" fill="#e8b04a" opacity=".85"/>'
    o += f'<rect x="-80" y="-184" width="160" height="18" rx="5" fill="#e2e8ea" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<rect x="-6" y="-214" width="12" height="32" fill="#cfd8dc" stroke="{INK}" stroke-width="3"/>'
    o += f'<path d="M-4 -214 Q-24 -226 -14 -244 Q0 -258 14 -244 Q24 -226 4 -214" fill="#e9f3f7" stroke="{INK}" stroke-width="3"/>'
    if bub:
        o += '<circle cx="0" cy="-270" r="6" fill="none" stroke="#fff" stroke-width="3"/><circle cx="10" cy="-292" r="4" fill="none" stroke="#fff" stroke-width="3"/>'
    o += f'<rect x="-40" y="-72" width="80" height="36" rx="4" fill="#fff7ea" stroke="{INK}" stroke-width="3"/><path d="M-26 -54 L26 -54" stroke="{INK}" stroke-width="3"/>'
    return o + '</g>'

def spray(x, y, s=1.0, c="#4fb3bf"):
    o = f'<g transform="translate({x} {y}) scale({s})">'
    o += f'<path d="M-36 0 L36 0 L36 -110 Q36 -130 16 -134 L-16 -134 Q-36 -130 -36 -110 Z" fill="{c}" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<rect x="-14" y="-156" width="28" height="24" fill="#f4f1ea" stroke="{INK}" stroke-width="3"/>'
    o += f'<path d="M-14 -156 L-14 -176 L46 -176 L46 -160 L14 -156 Z" fill="#f4f1ea" stroke="{INK}" stroke-width="3"/>'
    o += f'<path d="M14 -150 Q24 -130 12 -120" fill="none" stroke="{INK}" stroke-width="4"/>'
    o += f'<rect x="-24" y="-90" width="48" height="50" rx="4" fill="#fff" stroke="{INK}" stroke-width="3"/><path d="M-12 -65 l8 8 l16 -18" fill="none" stroke="#5f8f2f" stroke-width="5"/>'
    for i, (dx, dy) in enumerate(((66, -186), (78, -170), (70, -154), (88, -182))):
        o += f'<circle cx="{dx}" cy="{dy}" r="{3+i%2*2}" fill="#bfe7ec" stroke="{INK}" stroke-width="1.5"/>'
    return o + '</g>'

def brush(x, y, s=1.0, rot=0):
    o = f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><rect x="-10" y="-150" width="20" height="110" rx="8" fill="#e8962e" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<rect x="-22" y="-44" width="44" height="18" rx="4" fill="#f4f1ea" stroke="{INK}" stroke-width="3"/>'
    for i in range(7):
        o += f'<path d="M{-18+i*6} -26 L{-20+i*6.6:.0f} 0" stroke="#3b7fa0" stroke-width="3"/>'
    return o + '</g>'

def pin(x, y, s=1.0, c="#d7263d"):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M0 0 C-10 -20 -30 -34 -30 -56 A30 30 0 0 1 30 -56 C30 -34 10 -20 0 0 Z" fill="{c}" stroke="{INK}" stroke-width="{SW}"/>'
            f'<circle cx="0" cy="-56" r="11" fill="#fff" stroke="{INK}" stroke-width="3"/></g>')

def van(x, y, s=1.0, c="#4fb3bf"):
    o = f'<g transform="translate({x} {y}) scale({s})">'
    o += f'<path d="M-90 -10 L-90 -80 Q-90 -96 -74 -96 L50 -96 Q66 -96 76 -80 L96 -46 L96 -10 Z" fill="{c}" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<rect x="-76" y="-84" width="36" height="30" rx="4" fill="#e9f3f7" stroke="{INK}" stroke-width="3"/><rect x="-32" y="-84" width="36" height="30" rx="4" fill="#e9f3f7" stroke="{INK}" stroke-width="3"/>'
    o += f'<path d="M14 -84 L50 -84 Q58 -84 64 -74 L76 -54 L14 -54 Z" fill="#e9f3f7" stroke="{INK}" stroke-width="3"/>'
    o += f'<rect x="-90" y="-44" width="186" height="10" fill="#fff7ea" opacity=".8"/>'
    for wx in (-56, 60):
        o += f'<circle cx="{wx}" cy="-8" r="18" fill="#3b3b3b" stroke="{INK}" stroke-width="{SW}"/><circle cx="{wx}" cy="-8" r="7" fill="#cfd8dc"/>'
    return o + '</g>'

def brewery(x, y, s=1.0, c="#c4733a"):
    o = f'<g transform="translate({x} {y}) scale({s})">'
    o += f'<rect x="60" y="-190" width="44" height="190" rx="18" fill="#cfd8dc" stroke="{INK}" stroke-width="{SW}"/><rect x="112" y="-160" width="44" height="160" rx="18" fill="#dfe6e9" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<path d="M-110 0 L-110 -120 L-20 -190 L70 -120 L70 0 Z" fill="{c}" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<path d="M-124 -112 L-20 -198 L84 -112" fill="none" stroke="{INK}" stroke-width="10"/>'
    o += f'<rect x="-44" y="-70" width="48" height="70" rx="4" fill="#5a3218" stroke="{INK}" stroke-width="3"/>'
    o += f'<rect x="-94" y="-100" width="36" height="34" fill="#ffe29a" stroke="{INK}" stroke-width="3"/><rect x="20" y="-100" width="36" height="34" fill="#ffe29a" stroke="{INK}" stroke-width="3"/>'
    o += f'<rect x="-66" y="-150" width="92" height="30" rx="6" fill="#fff7ea" stroke="{INK}" stroke-width="3"/>'
    o += f'<path d="M-44 -135 h48" stroke="{INK}" stroke-width="4"/>'
    return o + '</g>'

def fridge(x, y, s=1.0):
    o = f'<g transform="translate({x} {y}) scale({s})">'
    o += f'<rect x="-110" y="-330" width="220" height="330" rx="16" fill="#e9f3f7" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<rect x="-94" y="-314" width="188" height="298" rx="8" fill="#cfe8f0" stroke="{INK}" stroke-width="3"/>'
    for sy in (-220, -120):
        o += f'<rect x="-94" y="{sy}" width="188" height="8" fill="#fff" stroke="{INK}" stroke-width="2"/>'
    cols = ["#e8962e", "#5f8f2f", "#c2415a", "#3b7fa0", "#f2c14e"]
    k = 0
    for sy in (-220, -120, -16):
        for cx in (-66, -22, 22, 66):
            o += can(cx, sy, 0.52, cols[k % 5]); k += 1
    o += f'<path d="M110 -330 L200 -300 L200 -30 L110 0 Z" fill="#dfeef3" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<rect x="178" y="-220" width="10" height="60" rx="5" fill="#9aa9ae"/>'
    return o + '</g>'

def sun(x, y, r=60):
    o = f'<g transform="translate({x} {y})">'
    for i in range(12):
        a = i * math.pi / 6
        o += f'<path d="M{(r+12)*math.cos(a):.0f} {(r+12)*math.sin(a):.0f} L{(r+38)*math.cos(a):.0f} {(r+38)*math.sin(a):.0f}" stroke="#f2a007" stroke-width="8"/>'
    o += f'<circle r="{r}" fill="#ffd23f" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<path d="M-22 8 Q0 26 22 8" fill="none" stroke="{INK}" stroke-width="4"/><circle cx="-18" cy="-10" r="5" fill="{INK}"/><circle cx="18" cy="-10" r="5" fill="{INK}"/>'
    return o + '</g>'

def thermo(x, y, s=1.0, level=.3, c="#3b7fa0"):
    o = f'<g transform="translate({x} {y}) scale({s})"><rect x="-16" y="-200" width="32" height="190" rx="16" fill="#fff" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<rect x="-7" y="{-20-170*level:.0f}" width="14" height="{170*level+10:.0f}" fill="{c}"/><circle cy="0" r="26" fill="{c}" stroke="{INK}" stroke-width="{SW}"/>'
    for i in range(6):
        o += f'<path d="M16 {-40-i*28} h14" stroke="{INK}" stroke-width="3"/>'
    return o + '</g>'

def magnifier(x, y, s=1.0, rot=-30):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><rect x="-10" y="40" width="20" height="90" rx="8" fill="#c4733a" stroke="{INK}" stroke-width="{SW}"/>'
            f'<circle r="46" fill="#dff4fa" fill-opacity=".6" stroke="{INK}" stroke-width="10"/><path d="M-24 -18 Q-18 -30 -4 -34" stroke="#fff" stroke-width="6" fill="none"/></g>')

def wheel(x, y, r=90):
    cols = ["#f2c14e", "#e8962e", "#c4733a", "#6b3a1a", "#7fb241", "#c2415a", "#4fb3bf", "#f7a1b0"]
    o = f'<g transform="translate({x} {y})">'
    n = len(cols)
    for i, c in enumerate(cols):
        a0 = 2 * math.pi * i / n; a1 = 2 * math.pi * (i + 1) / n
        o += (f'<path d="M0 0 L{r*math.cos(a0):.1f} {r*math.sin(a0):.1f} A{r} {r} 0 0 1 {r*math.cos(a1):.1f} {r*math.sin(a1):.1f} Z" '
              f'fill="{c}" stroke="{INK}" stroke-width="3"/>')
    o += f'<circle r="{r*0.38:.0f}" fill="#fff7ea" stroke="{INK}" stroke-width="3"/>'
    return o + '</g>'

def tap(x, y, s=1.0, handle="#c2415a", stream="#f0a53a"):
    o = f'<g transform="translate({x} {y}) scale({s})">'
    o += f'<rect x="-160" y="-30" width="200" height="40" rx="12" fill="#cfd8dc" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<path d="M20 -10 L40 -10 Q60 -10 60 10 L60 40 L44 40 L44 16 Q44 8 36 8 L20 8 Z" fill="#dfe6e9" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<rect x="12" y="-120" width="26" height="96" rx="10" fill="{handle}" stroke="{INK}" stroke-width="{SW}" transform="rotate(18 25 -24)"/>'
    o += f'<path d="M52 40 Q56 120 70 200" fill="none" stroke="{stream}" stroke-width="12"/>'
    return o + '</g>'

def plate(x, y, rx=150, ry=40):
    return (f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#fff" stroke="{INK}" stroke-width="{SW}"/>'
            f'<ellipse cx="{x}" cy="{y}" rx="{rx*0.72:.0f}" ry="{ry*0.62:.0f}" fill="#f4f1ea"/>')

def string_lights(w, y0, sag=50, n=14, seed=3):
    r = random.Random(seed)
    o = f'<path d="M0 {y0} Q{w/2} {y0+sag*2} {w} {y0}" fill="none" stroke="{INK}" stroke-width="3"/>'
    cols = ["#ffd23f", "#ff9f1c", "#f7a1b0", "#bfe7ec", "#9fd05a"]
    for i in range(1, n):
        t = i / n
        px = w * t; py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * (y0 + sag * 2) + t * t * y0
        c = cols[i % len(cols)]
        o += f'<circle cx="{px:.0f}" cy="{py+14:.0f}" r="22" fill="{c}" opacity=".25"/><ellipse cx="{px:.0f}" cy="{py+14:.0f}" rx="9" ry="12" fill="{c}" stroke="{INK}" stroke-width="2.5"/>'
    return o

def shelf(x, y, w):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="22" rx="4" fill="#a0612f" stroke="{INK}" stroke-width="{SW}"/>'
            f'<path d="M{x+30} {y+22} L{x+50} {y+60} M{x+w-30} {y+22} L{x+w-50} {y+60}" stroke="{INK}" stroke-width="6"/>')

def grain_pile(x, y, s=1.0, seed=5):
    r = random.Random(seed)
    o = f'<g transform="translate({x} {y}) scale({s})"><path d="M-90 0 Q-60 -60 0 -70 Q60 -60 90 0 Z" fill="#e8c77a" stroke="{INK}" stroke-width="{SW}"/>'
    for _ in range(22):
        gx = r.uniform(-70, 70); gy = r.uniform(-55, -8)
        if abs(gx) < 80 - (-gy):
            o += f'<ellipse cx="{gx:.0f}" cy="{gy:.0f}" rx="6" ry="3.5" transform="rotate({r.randint(0,180)} {gx:.0f} {gy:.0f})" fill="#c9983f"/>'
    return o + '</g>'
