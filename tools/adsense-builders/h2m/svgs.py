# Original SVG illustrations for Hair 2 Makeup. Composed from small drawn parts.
PINK = "#e0559c"; PLUM = "#3b1f3a"; PEACH = "#ffc9a8"; CREAM = "#fff5ee"
GOLD = "#f2b33d"; MINT = "#7fd1c0"; LILAC = "#b89cf0"; CORAL = "#ff7a6b"
BLUSH = "#ffd9e8"; SKY = "#cfe8ff"; WHITE = "#ffffff"
SKINS = ["#f5c9a6", "#d9a07a", "#a86b4a", "#6e4330", "#f0d2b8"]
HAIRS = ["#3b1f3a", "#6b3a1f", "#c77d3a", "#1c1512", "#e8c07a"]


def wrap(w, h, title, desc, body, bg=CREAM):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" '
            f'aria-labelledby="t d"><title id="t">{title}</title><desc id="d">{desc}</desc>'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>\n')


def blob(x, y, s, color, op=1):
    return (f'<path transform="translate({x} {y}) scale({s})" fill="{color}" opacity="{op}" '
            'd="M60-80C110-70 150-20 140 40S80 140 10 130-120 90-130 20-90-90 60-80Z"/>')


def sparkle(x, y, s=1, color=GOLD):
    return (f'<path transform="translate({x} {y}) scale({s})" fill="{color}" '
            'd="M0-24C3-8 8-3 24 0 8 3 3 8 0 24-3 8-8 3-24 0-8-3-3-8 0-24Z"/>')


def dots(x, y, n, color, gap=26, r=5):
    return "".join(f'<circle cx="{x + i * gap}" cy="{y + (i % 2) * 14}" r="{r}" fill="{color}"/>' for i in range(n))


def face(x, y, s=1, skin=SKINS[0], hair=HAIRS[0], style="bun", eyes="closed", mouth="smile", flip=False):
    tr = f"translate({x} {y}) scale({-s if flip else s} {s})"
    back = ""; front = ""
    if style == "bun":
        back = f'<circle cx="0" cy="-118" r="42" fill="{hair}"/><ellipse cx="0" cy="-40" rx="96" ry="92" fill="{hair}"/>'
        front = f'<path d="M-88-40C-80-110 80-110 88-40 60-80-40-90-88-40Z" fill="{hair}"/>'
    elif style == "long":
        back = f'<path d="M-100-40C-110-140 110-140 100-40L118 150H-118Z" fill="{hair}"/>'
        front = f'<path d="M-90-30C-90-120 90-120 90-30 50-90-10-70-90-30Z" fill="{hair}"/>'
    elif style == "curls":
        back = "".join(f'<circle cx="{cx}" cy="{cy}" r="38" fill="{hair}"/>' for cx, cy in
                       [(-80, -60), (-60, -110), (0, -130), (60, -110), (80, -60), (-95, 0), (95, 0), (-90, 50), (90, 50)])
        front = "".join(f'<circle cx="{cx}" cy="{cy}" r="26" fill="{hair}"/>' for cx, cy in [(-50, -85), (0, -95), (50, -85)])
    elif style == "bob":
        back = f'<path d="M-104-30C-110-140 110-140 104-30L100 60H-100Z" fill="{hair}"/>'
        front = f'<path d="M-96-40C-80-120 80-120 96-40 30-60-30-60-96-40Z" fill="{hair}"/>'
    elif style == "wave":
        back = f'<path d="M-100-40C-110-140 110-140 100-40C130 20 90 60 120 120 80 150 40 110 0 130-40 110-80 150-120 120-90 60-130 20-100-40Z" fill="{hair}"/>'
        front = f'<path d="M-92-30C-86-120 92-120 92-30 40-100-40-40-92-30Z" fill="{hair}"/>'
    if eyes == "closed":
        e = (f'<path d="M-44 0q14 12 28 0M16 0q14 12 28 0" stroke="{PLUM}" stroke-width="5" fill="none" stroke-linecap="round"/>'
             f'<path d="M-44 0l-8-6M44 0l8-6" stroke="{PLUM}" stroke-width="4" stroke-linecap="round"/>')
    else:
        e = (f'<circle cx="-30" cy="0" r="9" fill="{PLUM}"/><circle cx="30" cy="0" r="9" fill="{PLUM}"/>'
             f'<circle cx="-27" cy="-3" r="3" fill="{WHITE}"/><circle cx="33" cy="-3" r="3" fill="{WHITE}"/>')
    m = {"smile": f'<path d="M-20 38q20 22 40 0" stroke="{PINK}" stroke-width="7" fill="none" stroke-linecap="round"/>',
         "o": f'<ellipse cx="0" cy="42" rx="11" ry="14" fill="{PINK}"/>',
         "grin": f'<path d="M-26 32q26 34 52 0Z" fill="{PINK}"/>'}[mouth]
    return (f'<g transform="{tr}">{back}<rect x="-26" y="70" width="52" height="60" rx="20" fill="{skin}"/>'
            f'<ellipse cx="0" cy="0" rx="82" ry="94" fill="{skin}"/>{front}{e}'
            f'<circle cx="-50" cy="30" r="15" fill="{CORAL}" opacity=".45"/><circle cx="50" cy="30" r="15" fill="{CORAL}" opacity=".45"/>{m}'
            f'<path d="M-70 140q70-40 140 0v60h-140Z" fill="{PINK}"/></g>')


def brush(x, y, rot=0, s=1, handle=PLUM, tip=PINK):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><rect x="-9" y="0" width="18" height="150" rx="9" fill="{handle}"/>'
            f'<rect x="-12" y="-22" width="24" height="30" rx="4" fill="#c9c3cf"/>'
            f'<path d="M-14-20C-20-60-8-90 0-100 8-90 20-60 14-20Z" fill="{tip}"/></g>')


def lipstick(x, y, s=1, color=CORAL, rot=0):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><rect x="-24" y="0" width="48" height="80" rx="6" fill="{PLUM}"/>'
            f'<rect x="-20" y="-26" width="40" height="30" rx="3" fill="{GOLD}"/>'
            f'<path d="M-15-26V-60L15-78V-26Z" fill="{color}"/></g>')


def compact(x, y, s=1, color=LILAC):
    return (f'<g transform="translate({x} {y}) scale({s})"><ellipse cx="0" cy="0" rx="70" ry="62" fill="{color}"/>'
            f'<ellipse cx="0" cy="-4" rx="52" ry="44" fill="{PEACH}"/><ellipse cx="-16" cy="-16" rx="14" ry="8" fill="{WHITE}" opacity=".6"/></g>')


def bottle(x, y, s=1, color=MINT, label="", cap=PLUM):
    lab = f'<text x="0" y="40" font-family="sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="{PLUM}">{label}</text>' if label else ""
    return (f'<g transform="translate({x} {y}) scale({s})"><rect x="-40" y="-20" width="80" height="130" rx="18" fill="{color}"/>'
            f'<rect x="-30" y="15" width="60" height="42" rx="6" fill="{WHITE}" opacity=".8"/>{lab}'
            f'<rect x="-14" y="-52" width="28" height="34" rx="4" fill="{cap}"/><rect x="-6" y="-70" width="26" height="14" rx="3" fill="{cap}"/></g>')


def mirror(x, y, r=120, frame=GOLD, bulbs=True):
    b = ""
    if bulbs:
        import math
        for i in range(10):
            a = math.pi * (1.05 + i * 0.1)
            b += f'<circle cx="{x + (r + 30) * math.cos(a):.1f}" cy="{y + (r + 30) * math.sin(a):.1f}" r="12" fill="#fff3b0" stroke="{GOLD}" stroke-width="3"/>'
    return (f'<circle cx="{x}" cy="{y}" r="{r + 16}" fill="{frame}"/><circle cx="{x}" cy="{y}" r="{r}" fill="{SKY}"/>'
            f'<path d="M{x - r * .5} {y - r * .3}l{r * .4}-{r * .4}M{x - r * .35} {y}l{r * .6}-{r * .6}" stroke="{WHITE}" stroke-width="10" stroke-linecap="round" opacity=".7"/>{b}')


def clock(x, y, r=90, hour=7, minute=0, face_c=WHITE, rim=PINK):
    import math
    ma = math.radians(minute * 6 - 90); ha = math.radians((hour % 12) * 30 + minute * .5 - 90)
    ticks = "".join(f'<circle cx="{x + (r - 16) * math.cos(math.radians(i * 30)):.1f}" cy="{y + (r - 16) * math.sin(math.radians(i * 30)):.1f}" r="4" fill="{PLUM}"/>' for i in range(12))
    return (f'<circle cx="{x}" cy="{y}" r="{r + 12}" fill="{rim}"/><circle cx="{x}" cy="{y}" r="{r}" fill="{face_c}"/>{ticks}'
            f'<line x1="{x}" y1="{y}" x2="{x + r * .5 * math.cos(ha):.1f}" y2="{y + r * .5 * math.sin(ha):.1f}" stroke="{PLUM}" stroke-width="9" stroke-linecap="round"/>'
            f'<line x1="{x}" y1="{y}" x2="{x + r * .75 * math.cos(ma):.1f}" y2="{y + r * .75 * math.sin(ma):.1f}" stroke="{PLUM}" stroke-width="6" stroke-linecap="round"/>'
            f'<circle cx="{x}" cy="{y}" r="8" fill="{GOLD}"/>')


def calendar(x, y, s=1, mark=PINK, marked=(9,)):
    cells = ""
    for i in range(20):
        cx = -110 + (i % 5) * 55; cy = -10 + (i // 5) * 45
        fill = mark if i in marked else "#f3e6ef"
        cells += f'<rect x="{cx}" y="{cy}" width="44" height="34" rx="6" fill="{fill}"/>'
        if i in marked:
            cells += f'<path d="M{cx + 10} {cy + 18}l8 8 16-18" stroke="{WHITE}" stroke-width="5" fill="none" stroke-linecap="round"/>'
    return (f'<g transform="translate({x} {y}) scale({s})"><rect x="-130" y="-90" width="280" height="270" rx="22" fill="{WHITE}"/>'
            f'<rect x="-130" y="-90" width="280" height="64" rx="22" fill="{PLUM}"/><rect x="-130" y="-50" width="280" height="24" fill="{PLUM}"/>'
            f'<rect x="-80" y="-110" width="14" height="44" rx="7" fill="{GOLD}"/><rect x="86" y="-110" width="14" height="44" rx="7" fill="{GOLD}"/>{cells}</g>')


def curling_iron(x, y, rot=0, s=1, body=PINK):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><rect x="-22" y="0" width="44" height="150" rx="18" fill="{body}"/>'
            f'<rect x="-14" y="-230" width="28" height="235" rx="14" fill="#c9c3cf"/><rect x="-26" y="-200" width="20" height="190" rx="8" fill="{PLUM}"/>'
            f'<circle cx="0" cy="40" r="8" fill="{GOLD}"/><path d="M0 150q20 60-30 100" stroke="{PLUM}" stroke-width="7" fill="none"/></g>')


def wand(x, y, rot=0, s=1, body=LILAC):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><rect x="-22" y="0" width="44" height="150" rx="18" fill="{body}"/>'
            f'<path d="M-20 0L-8-240H8L20 0Z" fill="#c9c3cf"/><circle cx="0" cy="-242" r="10" fill="{PLUM}"/>'
            f'<circle cx="0" cy="40" r="8" fill="{GOLD}"/><path d="M0 150q20 60-30 100" stroke="{PLUM}" stroke-width="7" fill="none"/></g>')


def straightener(x, y, rot=0, s=1, body=MINT):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><path d="M-6 0L-40-230Q-40-250-20-248L-4-40Z" fill="{body}"/>'
            f'<path d="M6 0L40-230Q40-250 20-248L4-40Z" fill="{body}"/><rect x="-38" y="-240" width="16" height="120" rx="6" fill="#c9c3cf" transform="rotate(-8 -30 -180)"/>'
            f'<rect x="22" y="-240" width="16" height="120" rx="6" fill="#c9c3cf" transform="rotate(8 30 -180)"/><circle cx="0" cy="-4" r="12" fill="{PLUM}"/></g>')


def dryer(x, y, s=1, body=CORAL):
    return (f'<g transform="translate({x} {y}) scale({s})"><rect x="-40" y="20" width="56" height="150" rx="22" fill="{body}"/>'
            f'<rect x="-110" y="-60" width="220" height="110" rx="55" fill="{body}"/><rect x="100" y="-44" width="60" height="78" rx="14" fill="{PLUM}"/>'
            f'<circle cx="-50" cy="-5" r="30" fill="{WHITE}" opacity=".5"/>'
            f'<path d="M180-20q20 10 0 20t0 20M210-30q20 14 0 28t0 28" stroke="{SKY}" stroke-width="7" fill="none" stroke-linecap="round"/></g>')


def spray(x, y, s=1, color=LILAC):
    return (f'<g transform="translate({x} {y}) scale({s})"><rect x="-36" y="-10" width="72" height="170" rx="16" fill="{color}"/>'
            f'<rect x="-22" y="-44" width="44" height="38" rx="6" fill="{PLUM}"/><rect x="-8" y="-60" width="30" height="18" rx="4" fill="{PLUM}"/>'
            + dots(40, -54, 3, SKY, gap=18, r=5) + '</g>')


def phone(x, y, s=1, bubbles=(("", PINK), ("", LILAC), ("", MINT))):
    b = ""
    for i, (_, c) in enumerate(bubbles):
        bx = -60 if i % 2 == 0 else -20
        b += f'<rect x="{bx}" y="{-110 + i * 70}" width="120" height="50" rx="16" fill="{c}"/>'
        b += f'<rect x="{bx + 14}" y="{-96 + i * 70}" width="80" height="8" rx="4" fill="{WHITE}" opacity=".8"/><rect x="{bx + 14}" y="{-80 + i * 70}" width="54" height="8" rx="4" fill="{WHITE}" opacity=".8"/>'
    return (f'<g transform="translate({x} {y}) scale({s})"><rect x="-90" y="-170" width="180" height="340" rx="30" fill="{PLUM}"/>'
            f'<rect x="-76" y="-150" width="152" height="296" rx="18" fill="{WHITE}"/>{b}</g>')


def camera(x, y, s=1, body=PLUM):
    return (f'<g transform="translate({x} {y}) scale({s})"><rect x="-120" y="-70" width="240" height="160" rx="24" fill="{body}"/>'
            f'<rect x="-70" y="-100" width="80" height="40" rx="10" fill="{body}"/><circle cx="0" cy="10" r="58" fill="#c9c3cf"/>'
            f'<circle cx="0" cy="10" r="40" fill="{SKY}"/><circle cx="-12" cy="-2" r="10" fill="{WHITE}"/><rect x="70" y="-54" width="30" height="20" rx="5" fill="{GOLD}"/></g>')


def flash(x, y, s=1):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0-60L-30 10H0L-14 70 40-10H8L24-60Z" fill="{GOLD}"/>'


def bag(x, y, s=1, color=PINK):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M-60-40q0-60 60-60t60 60" stroke="{PLUM}" stroke-width="12" fill="none"/>'
            f'<rect x="-130" y="-40" width="260" height="170" rx="30" fill="{color}"/><rect x="-130" y="10" width="260" height="14" fill="{PLUM}" opacity=".25"/>'
            f'<rect x="-20" y="0" width="40" height="34" rx="8" fill="{GOLD}"/></g>')


def jar(x, y, s=1, color=BLUSH, lid=MINT):
    return (f'<g transform="translate({x} {y}) scale({s})"><rect x="-60" y="-20" width="120" height="90" rx="20" fill="{color}"/>'
            f'<rect x="-66" y="-46" width="132" height="34" rx="10" fill="{lid}"/></g>')


def drop(x, y, s=1, color=SKY):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0-50C20-20 34 0 34 18A34 34 0 0 1-34 18C-34 0-20-20 0-50Z" fill="{color}"/>'


def comb(x, y, rot=0, s=1, color=GOLD):
    teeth = "".join(f'<rect x="{-100 + i * 14}" y="0" width="7" height="46" rx="3" fill="{color}"/>' for i in range(15))
    return f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><rect x="-110" y="-30" width="220" height="34" rx="14" fill="{color}"/>{teeth}</g>'


def pins(x, y, s=1):
    return "".join(f'<path transform="translate({x + i * 26} {y}) scale({s})" d="M0 0v80M10 0v70q0 16-10 10" stroke="{PLUM}" stroke-width="5" fill="none" stroke-linecap="round"/>' for i in range(4))


def card(x, y, w, h, rows, color=WHITE, tick=PINK):
    out = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22" fill="{color}"/>'
    for i in range(rows):
        ry = y + 40 + i * ((h - 60) / max(rows, 1))
        out += f'<rect x="{x + 28}" y="{ry - 14}" width="28" height="28" rx="7" fill="{tick}"/><path d="M{x + 34} {ry}l6 7 12-14" stroke="{WHITE}" stroke-width="4" fill="none"/>'
        out += f'<rect x="{x + 72}" y="{ry - 6}" width="{w - 110 - (i % 3) * 30}" height="12" rx="6" fill="#ecdbe6"/>'
    return out


def dress(x, y, s=1, color=WHITE, trim=GOLD):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M0-160v-20" stroke="{PLUM}" stroke-width="5"/><path d="M-30-180q30-20 60 0" stroke="{PLUM}" stroke-width="5" fill="none"/>'
            f'<path d="M-40-150L-30-60-120 160H120L30-60 40-150Q0-130-40-150Z" fill="{color}" stroke="{PLUM}" stroke-width="4"/>'
            f'<rect x="-34" y="-72" width="68" height="14" rx="7" fill="{trim}"/></g>')


def bouquet(x, y, s=1):
    fl = "".join(f'<circle cx="{cx}" cy="{cy}" r="26" fill="{c}"/><circle cx="{cx}" cy="{cy}" r="9" fill="{GOLD}"/>'
                 for cx, cy, c in [(-40, -20, PINK), (0, -44, WHITE), (40, -20, LILAC), (-20, 14, CORAL), (24, 12, BLUSH)])
    return f'<g transform="translate({x} {y}) scale({s})"><path d="M-20 30L0 140 20 30Z" fill="{MINT}"/>{fl}</g>'


def sun(x, y, r=50):
    import math
    rays = "".join(f'<line x1="{x + (r + 12) * math.cos(a):.1f}" y1="{y + (r + 12) * math.sin(a):.1f}" x2="{x + (r + 34) * math.cos(a):.1f}" y2="{y + (r + 34) * math.sin(a):.1f}" stroke="{GOLD}" stroke-width="8" stroke-linecap="round"/>'
                   for a in [i * math.pi / 4 for i in range(8)])
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{GOLD}"/>{rays}'


def thermo(x, y, s=1, level=.6):
    h = 200
    return (f'<g transform="translate({x} {y}) scale({s})"><rect x="-22" y="-{h}" width="44" height="{h + 20}" rx="22" fill="{WHITE}" stroke="{PLUM}" stroke-width="5"/>'
            f'<rect x="-10" y="-{h * level:.0f}" width="20" height="{h * level:.0f}" rx="10" fill="{CORAL}"/><circle cx="0" cy="30" r="36" fill="{CORAL}" stroke="{PLUM}" stroke-width="5"/>'
            + "".join(f'<line x1="22" y1="-{30 + i * 40}" x2="42" y2="-{30 + i * 40}" stroke="{PLUM}" stroke-width="4"/>' for i in range(5)) + '</g>')


def table_top(y, w, color=PEACH):
    return f'<rect x="0" y="{y}" width="{w}" height="400" fill="{color}"/><rect x="0" y="{y}" width="{w}" height="18" fill="{PLUM}" opacity=".15"/>'


def label(x, y, txt, size=34, color=PLUM, anchor="middle", weight=800):
    return f'<text x="{x}" y="{y}" font-family="Georgia, serif" font-size="{size}" font-weight="{weight}" fill="{color}" text-anchor="{anchor}">{txt}</text>'


# ---------------------------------------------------------------- scenes
W, H = 1200, 675


def scene(slug):
    S = {}
    S["bridal-trial-run-guide"] = (
        "Bridal trial at the vanity",
        "A bride with an updo looks into a bulb-lit mirror while brushes, a lipstick, a veil pin and a notepad with checkmarks sit on the table.",
        blob(220, 200, 2.2, BLUSH) + blob(1000, 180, 1.6, SKY, .7) + mirror(760, 300, 170)
        + face(760, 300, .9, SKINS[1], HAIRS[1], "bun", "open") + table_top(520, W)
        + face(330, 350, 1.1, SKINS[1], HAIRS[1], "bun", "closed", flip=True)
        + brush(560, 560, -70, .9) + brush(600, 600, -60, .8, tip=LILAC) + lipstick(980, 600, .9)
        + card(1020, 420, 160, 200, 3) + sparkle(120, 110, 1.3) + sparkle(1100, 90) + sparkle(560, 130, .8, PINK))
    S["how-to-book-a-hair-and-makeup-artist"] = (
        "Booking a hair and makeup artist",
        "A phone showing a message thread next to a calendar with the event date circled and a pen, plus a deposit receipt.",
        blob(300, 330, 2.6, BLUSH) + blob(930, 330, 2.2, "#e9e1ff") + phone(340, 340, 1.1)
        + calendar(820, 330, 1.25, marked=(12,)) + f'<rect x="560" y="440" width="150" height="190" rx="12" fill="{WHITE}" transform="rotate(-8 635 535)"/>'
        + f'<path d="M585 490h90M585 520h70M585 550h80" stroke="#e4cfe0" stroke-width="10" stroke-linecap="round" transform="rotate(-8 635 535)"/>'
        + label(640, 610, "PAID", 30, PINK) + sparkle(560, 120, 1.2) + sparkle(1100, 580, .9, PINK) + sparkle(120, 600, .8))
    S["how-to-brief-your-stylist"] = (
        "Briefing a stylist with a mood board",
        "A cork mood board pinned with polaroid-style sketches of hairstyles and colour swatches, beside a stylist character holding a comb.",
        blob(620, 330, 3.2, BLUSH) + f'<rect x="300" y="110" width="600" height="420" rx="26" fill="#d9a877"/><rect x="320" y="130" width="560" height="380" rx="18" fill="#e8c095"/>'
        + "".join(f'<g transform="rotate({r} {px + 80} {py + 90})"><rect x="{px}" y="{py}" width="160" height="180" rx="8" fill="{WHITE}"/><rect x="{px + 12}" y="{py + 12}" width="136" height="120" fill="{c}"/>'
                  f'<circle cx="{px + 80}" cy="{py + 8}" r="10" fill="{CORAL}"/></g>' for px, py, r, c in [(350, 160, -6, SKY), (530, 150, 4, BLUSH), (710, 170, -3, "#e9e1ff")])
        + face(430, 250, .38, SKINS[0], HAIRS[4], "wave") + face(610, 240, .38, SKINS[2], HAIRS[3], "bun") + face(790, 260, .38, SKINS[3], HAIRS[0], "curls")
        + "".join(f'<circle cx="{420 + i * 70}" cy="440" r="26" fill="{c}"/>' for i, c in enumerate([PINK, CORAL, PEACH, LILAC, GOLD, MINT]))
        + face(1040, 400, .9, SKINS[4], HAIRS[2], "bob", "open", "grin") + comb(1040, 610, -10, .6)
        + sparkle(180, 140, 1.2) + sparkle(160, 520, .8, PINK))
    S["event-day-prep-timeline"] = (
        "Event-day prep timeline",
        "A large clock beside a winding path of stops marked with a hairdryer, a brush, a dress and a camera, showing the order of the morning.",
        blob(260, 320, 2.4, "#fde7c7") + clock(250, 320, 150, 8, 30)
        + f'<path d="M470 560C600 560 580 380 720 380S860 180 1000 180" stroke="{PLUM}" stroke-width="10" fill="none" stroke-dasharray="4 22" stroke-linecap="round"/>'
        + "".join(f'<circle cx="{cx}" cy="{cy}" r="62" fill="{c}"/>' for cx, cy, c in [(480, 560, BLUSH), (720, 380, "#e9e1ff"), (1000, 180, SKY), (1060, 520, "#fde7c7")])
        + dryer(480, 555, .28) + brush(720, 400, 30, .45) + dress(1000, 205, .3) + camera(1060, 520, .38)
        + sparkle(620, 110, 1.1) + sparkle(1150, 380, .8, PINK) + sparkle(120, 600, .9, PINK))
    S["skin-prep-before-an-event"] = (
        "Skin prep countdown",
        "A relaxed character in a headband with a cooling face mask beside a water glass, a moisturiser jar, a sunscreen bottle and a small calendar countdown.",
        blob(420, 330, 3, "#dff5ef") + face(420, 330, 1.3, SKINS[2], HAIRS[3], "curls")
        + f'<rect x="330" y="200" width="180" height="26" rx="13" fill="{PINK}"/>'
        + f'<ellipse cx="420" cy="330" rx="70" ry="80" fill="{MINT}" opacity=".2"/>'
        + jar(800, 470, 1.1) + bottle(980, 430, 1.1, CORAL, "SPF") + drop(700, 300, 1.2) + drop(760, 220, .8)
        + f'<rect x="870" y="110" width="220" height="150" rx="20" fill="{WHITE}"/>' + label(980, 175, "7 DAYS", 38, PINK) + label(980, 225, "to go", 28)
        + sparkle(160, 120, 1.1) + sparkle(640, 590, .8, PINK))
    S["long-wear-makeup-that-lasts"] = (
        "Long-wear makeup layers",
        "A cut-away diagram of makeup layers from skincare to primer, base, powder and setting spray, next to a smiling character dancing under a disco ball.",
        blob(860, 330, 2.6, "#e9e1ff") + "".join(f'<rect x="120" y="{150 + i * 80}" width="460" height="70" rx="16" fill="{c}"/>' + label(350, 197 + i * 80, t, 30)
                                                  for i, (c, t) in enumerate([(SKY, "setting spray"), (WHITE, "powder where needed"), (PEACH, "thin base layers"), (BLUSH, "primer"), ("#dff5ef", "skincare")]))
        + f'<circle cx="860" cy="120" r="60" fill="#c9c3cf"/>' + "".join(f'<rect x="{830 + (i % 3) * 22}" y="{80 + (i // 3) * 22}" width="18" height="18" fill="{WHITE}" opacity=".7"/>' for i in range(9))
        + f'<line x1="860" y1="0" x2="860" y2="60" stroke="{PLUM}" stroke-width="4"/>'
        + face(880, 420, 1, SKINS[3], HAIRS[3], "long", "closed", "grin") + spray(1080, 470, .8)
        + sparkle(700, 160, .9) + sparkle(1040, 180, 1.1, PINK) + sparkle(640, 580, .8))
    S["prom-hair-and-makeup-planning"] = (
        "Prom night hair and makeup",
        "Two friends with glam hair pose in front of a string of lights and a sign shaped like a star, holding a clutch bag and a corsage.",
        f'<rect width="{W}" height="{H}" fill="#2b1840"/>' + "".join(f'<circle cx="{60 + i * 90}" cy="{60 + (i % 2) * 24}" r="12" fill="{[GOLD, PINK, MINT][i % 3]}"/>' for i in range(14))
        + f'<path d="M0 50Q600 130 1200 50" stroke="#c9c3cf" stroke-width="3" fill="none"/>'
        + sparkle(600, 250, 3, GOLD) + face(420, 360, 1.05, SKINS[0], HAIRS[4], "wave", "open", "grin")
        + face(780, 360, 1.05, SKINS[3], HAIRS[3], "curls", "open", "smile") + bag(560, 590, .45, LILAC)
        + bouquet(900, 560, .6) + sparkle(160, 460, 1, PINK) + sparkle(1080, 380, 1.2, MINT))
    S["heat-styling-without-damage"] = (
        "Heat styling without damage",
        "A heat protectant spray misting over a lock of hair beside a thermometer showing a moderate setting and a curling iron resting on a heat mat.",
        blob(330, 330, 2.6, "#fde7c7") + f'<path d="M280 120C200 250 380 330 290 460S300 620 360 640" stroke="{HAIRS[2]}" stroke-width="60" fill="none" stroke-linecap="round"/>'
        + f'<path d="M300 120C220 250 400 330 310 460" stroke="#e0a060" stroke-width="10" fill="none" opacity=".6"/>'
        + spray(560, 280, 1) + dots(430, 230, 5, SKY, gap=-28, r=8) + thermo(800, 470, 1, .45)
        + label(720, 650, "go lower first", 28) + f'<rect x="900" y="560" width="280" height="60" rx="20" fill="{LILAC}"/>'
        + curling_iron(1040, 520, 80, .7) + sparkle(1100, 120, 1.1) + sparkle(140, 580, .8, PINK))
    S["curling-iron-vs-wand-vs-straightener"] = (
        "Curling iron, wand and flat iron side by side",
        "Three hot tools standing upright like characters: a clamp curling iron, a tapered wand and a flat iron, each with the curl shape it makes beneath it.",
        blob(600, 330, 3.4, BLUSH) + curling_iron(300, 360, 0, 1.05) + wand(600, 360, 0, 1.05) + straightener(900, 390, 0, 1.05)
        + f'<path d="M260 600q20-30 40 0t40 0t40 0" stroke="{HAIRS[1]}" stroke-width="14" fill="none" stroke-linecap="round"/>'
        + f'<path d="M560 590c30-40 50 40 80 0" stroke="{HAIRS[1]}" stroke-width="14" fill="none" stroke-linecap="round"/>'
        + f'<path d="M860 600q40-30 80 0" stroke="{HAIRS[1]}" stroke-width="14" fill="none" stroke-linecap="round"/>'
        + sparkle(120, 120, 1.2) + sparkle(1080, 120, 1, PINK) + sparkle(1100, 560, .8))
    S["makeup-for-photos-and-flash"] = (
        "Makeup for photos and flash",
        "A camera with a flash bolt pointed at a smiling character, with a small photo print showing the same face looking even and glowing.",
        blob(380, 340, 2.4, SKY) + camera(300, 360, 1.3) + flash(300, 150, 1.4)
        + f'<path d="M430 300L640 260M430 360L640 360M430 420L640 460" stroke="{GOLD}" stroke-width="6" stroke-dasharray="14 14"/>'
        + face(820, 350, 1.15, SKINS[2], HAIRS[0], "long", "open", "grin")
        + f'<g transform="rotate(8 1080 520)"><rect x="990" y="420" width="180" height="210" rx="8" fill="{WHITE}"/><rect x="1005" y="435" width="150" height="150" fill="#e9e1ff"/></g>'
        + face(1080, 520, .4, SKINS[2], HAIRS[0], "long", "open", "smile") + sparkle(1100, 120, 1.1, PINK) + sparkle(560, 600, .9))
    S["event-day-emergency-kit"] = (
        "Event-day emergency kit",
        "An open makeup bag spilling out useful items: bobby pins, blotting papers, a mini hairspray, a lipstick, cotton buds and a compact.",
        blob(600, 360, 3.4, "#dff5ef") + bag(600, 380, 1.6, PINK)
        + pins(250, 520, 1) + lipstick(420, 600, .9, PINK, -20) + compact(800, 590, .8) + spray(960, 470, .7)
        + f'<rect x="150" y="360" width="120" height="90" rx="10" fill="{WHITE}" transform="rotate(-12 210 405)"/><rect x="170" y="340" width="120" height="90" rx="10" fill="{BLUSH}" transform="rotate(-4 230 385)"/>'
        + "".join(f'<g transform="rotate({r} {cx} 200)"><rect x="{cx - 5}" y="140" width="10" height="120" rx="5" fill="{WHITE}"/><ellipse cx="{cx}" cy="140" rx="12" ry="16" fill="{WHITE}"/><ellipse cx="{cx}" cy="260" rx="12" ry="16" fill="{WHITE}"/></g>' for cx, r in [(1040, 20), (1080, 30)])
        + sparkle(600, 110, 1.3) + sparkle(160, 140, .9, PINK))
    S["updo-or-hair-down"] = (
        "Updo or hair down",
        "Two versions of the same character side by side, one with a sleek updo and one with loose waves, with a sun and a breeze on one side.",
        blob(330, 340, 2.4, "#e9e1ff") + blob(870, 340, 2.4, BLUSH) + face(330, 330, 1.2, SKINS[1], HAIRS[1], "bun", "open", "smile")
        + face(870, 330, 1.2, SKINS[1], HAIRS[1], "wave", "open", "grin") + label(330, 640, "up", 44, PINK) + label(870, 640, "down", 44, PINK)
        + sun(600, 120, 40) + f'<path d="M560 330q40-20 80 0M560 370q40-20 80 0M560 410q40-20 80 0" stroke="{SKY}" stroke-width="10" fill="none" stroke-linecap="round"/>'
        + pins(150, 110, .7) + sparkle(1080, 120, 1.1))
    S["hair-prep-before-an-event"] = (
        "Hair prep in the weeks before an event",
        "A calendar strip with icons for a trim, a colour appointment and a wash day, and a character with freshly blown-out hair holding a round brush.",
        blob(800, 360, 2.8, "#fde7c7") + calendar(300, 330, 1.3, marked=(2, 9, 17))
        + face(820, 330, 1.2, SKINS[4], HAIRS[2], "bob", "open", "grin")
        + f'<g transform="translate(1040 420) rotate(25)"><rect x="-12" y="0" width="24" height="170" rx="12" fill="{PLUM}"/><rect x="-40" y="-140" width="80" height="150" rx="40" fill="{CORAL}"/>'
        + "".join(f'<line x1="-48" y1="{-120 + i * 22}" x2="48" y2="{-120 + i * 22}" stroke="{WHITE}" stroke-width="5"/>' for i in range(6)) + '</g>'
        + comb(620, 600, 0, .6, LILAC) + sparkle(1100, 120, 1.1) + sparkle(560, 110, .9, PINK))
    t, d, body = S[slug]
    return wrap(W, H, t, d, body)


SCENE_SLUGS = ["bridal-trial-run-guide", "how-to-book-a-hair-and-makeup-artist", "how-to-brief-your-stylist",
               "event-day-prep-timeline", "skin-prep-before-an-event", "long-wear-makeup-that-lasts",
               "prom-hair-and-makeup-planning", "heat-styling-without-damage", "curling-iron-vs-wand-vs-straightener",
               "makeup-for-photos-and-flash", "event-day-emergency-kit", "updo-or-hair-down", "hair-prep-before-an-event"]


def hero():
    w, h = 1600, 900
    body = (blob(300, 260, 3.4, BLUSH) + blob(1320, 250, 2.8, "#e9e1ff") + blob(800, 820, 4, "#fde7c7", .8)
            + mirror(800, 360, 230) + face(800, 380, 1.3, SKINS[2], HAIRS[3], "curls", "open", "grin")
            + f'<rect x="0" y="650" width="{w}" height="250" fill="{PEACH}"/><rect x="0" y="650" width="{w}" height="22" fill="{PLUM}" opacity=".15"/>'
            + face(260, 500, 1.1, SKINS[0], HAIRS[4], "bun", "closed", "smile")
            + brush(210, 690, -55, 1, tip=PINK) + curling_iron(1320, 600, 0, 1) + dryer(1440, 250, .6)
            + lipstick(560, 760, 1, CORAL) + lipstick(640, 770, .9, PINK, 10) + compact(1020, 770, 1)
            + bottle(460, 760, .8, MINT) + spray(1180, 720, .8) + bouquet(1500, 760, .8)
            + sparkle(120, 120, 1.6) + sparkle(1500, 100, 1.3, PINK) + sparkle(560, 110, 1, MINT) + sparkle(1060, 110, 1.2))
    return wrap(w, h, "Hair 2 Makeup vanity scene",
                "Illustration of a bulb-lit vanity mirror reflecting a smiling woman with curls, a friend with a bun, and a table of brushes, lipsticks, a compact, a curling iron and a hairdryer.", body)


def og():
    w, h = 1200, 630
    body = (blob(1010, 320, 2.2, BLUSH) + mirror(1010, 300, 125, bulbs=True) + face(1010, 320, .75, SKINS[1], HAIRS[1], "bun", "open", "grin")
            + label(80, 250, "Hair 2 Makeup", 80, PLUM, "start") + label(80, 330, "Event hair &amp; makeup, planned calmly", 32, PINK, "start", 700)
            + lipstick(120, 520, 1, CORAL) + brush(250, 470, 30, .9) + compact(420, 520, .8) + sparkle(640, 110, 1.2) + sparkle(620, 520, .9, PINK))
    return wrap(w, h, "Hair 2 Makeup", "Share card with the Hair 2 Makeup name, a vanity mirror and makeup tools.", body)


def logo():
    body = (f'<circle cx="60" cy="60" r="56" fill="{PINK}"/>'
            f'<path d="M38 88V32M38 60h28M66 32v56" stroke="{WHITE}" stroke-width="9" stroke-linecap="round"/>'
            f'<path d="M80 30v30l8-10v30" stroke="{GOLD}" stroke-width="7" stroke-linecap="round" fill="none"/>'
            + sparkle(96, 26, .5, GOLD))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-labelledby="t"><title id="t">Hair 2 Makeup logo</title>{body}</svg>\n')
