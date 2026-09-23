"""Original SVG illustrations for Crazy Golf Game. Built from small reusable shape helpers."""
import math

INK = "#0e3b2c"; GRASS = "#3fb56b"; FAIR = "#2f9e5b"; SKY = "#bfeaff"; SUN = "#ffc93c"
PINK = "#ff5c8a"; ORANGE = "#ff8a3d"; PURPLE = "#7b5cff"; CREAM = "#fff8e7"; WOOD = "#b9793f"
BLUE = "#3d8bfd"; TEAL = "#20c1b0"; SKIN = ["#f2c49b", "#c98b5e", "#8d5a3b", "#ffd9b8"]


def wrap(w, h, title, body, sid):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" '
            f'aria-labelledby="{sid}-t"><title id="{sid}-t">{title}</title>{body}</svg>\n')


def sky(w, h, top=SKY, bottom="#e8f8ff"):
    return (f'<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/>'
            f'<stop offset="1" stop-color="{bottom}"/></linearGradient></defs><rect width="{w}" height="{h}" fill="url(#sk)"/>')


def sun(x, y, r=60):
    rays = "".join(
        f'<line x1="{x + math.cos(a) * (r + 12):.0f}" y1="{y + math.sin(a) * (r + 12):.0f}" '
        f'x2="{x + math.cos(a) * (r + 34):.0f}" y2="{y + math.sin(a) * (r + 34):.0f}" stroke="{SUN}" stroke-width="8" stroke-linecap="round"/>'
        for a in [i * math.pi / 6 for i in range(12)])
    return f'<g>{rays}<circle cx="{x}" cy="{y}" r="{r}" fill="{SUN}"/><circle cx="{x-18}" cy="{y-6}" r="6" fill="{INK}"/><circle cx="{x+18}" cy="{y-6}" r="6" fill="{INK}"/><path d="M{x-20} {y+16} q20 18 40 0" stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round"/></g>'


def cloud(x, y, s=1.0):
    return (f'<g transform="translate({x} {y}) scale({s})" fill="#fff"><ellipse cx="0" cy="0" rx="70" ry="34"/>'
            f'<ellipse cx="-50" cy="12" rx="44" ry="26"/><ellipse cx="55" cy="10" rx="50" ry="28"/><ellipse cx="10" cy="-24" rx="42" ry="30"/></g>')


def hill(y, color, w=1200, amp=40, phase=0):
    pts = " ".join(f"{x},{y + amp * math.sin((x / w) * math.pi * 2 + phase):.0f}" for x in range(0, w + 1, 50))
    return f'<polygon points="0,2000 {pts} {w},2000" fill="{color}"/>'


def flag(x, y, color=PINK, h=150, num=None):
    n = f'<text x="{x+30}" y="{y-h+34}" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-weight="700" font-size="26" fill="#fff" text-anchor="middle">{num}</text>' if num else ""
    return (f'<g><ellipse cx="{x}" cy="{y}" rx="30" ry="10" fill="{INK}"/><rect x="{x-3}" y="{y-h}" width="6" height="{h}" rx="3" fill="#f5f5f5" stroke="{INK}" stroke-width="2"/>'
            f'<path d="M{x+3} {y-h} l70 22 l-70 24 z" fill="{color}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>{n}</g>')


def ball(x, y, r=18, face=False, color="#fff"):
    s = f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" stroke="{INK}" stroke-width="{max(2, r/8):.0f}"/>'
    if face:
        s += (f'<circle cx="{x-r*.35:.0f}" cy="{y-r*.15:.0f}" r="{r*.12:.1f}" fill="{INK}"/><circle cx="{x+r*.35:.0f}" cy="{y-r*.15:.0f}" r="{r*.12:.1f}" fill="{INK}"/>'
              f'<path d="M{x-r*.4:.0f} {y+r*.25:.0f} q{r*.4:.0f} {r*.4:.0f} {r*.8:.0f} 0" stroke="{INK}" stroke-width="{max(2, r/10):.0f}" fill="none" stroke-linecap="round"/>'
              f'<circle cx="{x-r*.6:.0f}" cy="{y+r*.2:.0f}" r="{r*.13:.1f}" fill="{PINK}" opacity=".6"/><circle cx="{x+r*.6:.0f}" cy="{y+r*.2:.0f}" r="{r*.13:.1f}" fill="{PINK}" opacity=".6"/>')
    else:
        s += "".join(f'<circle cx="{x+dx*r:.0f}" cy="{y+dy*r:.0f}" r="{r*.08:.1f}" fill="#cfd8d3"/>' for dx, dy in [(-.3, -.3), (.3, -.2), (0, .3), (-.4, .2), (.35, .35), (0, -.5)])
    return s


def putter(x, y, ang=-20, length=170, color=INK, head=PURPLE):
    return (f'<g transform="translate({x} {y}) rotate({ang})"><rect x="-4" y="{-length}" width="8" height="{length}" rx="4" fill="{color}"/>'
            f'<rect x="-6" y="{-length}" width="12" height="44" rx="5" fill="{INK}"/><rect x="-6" y="-8" width="46" height="18" rx="6" fill="{head}" stroke="{INK}" stroke-width="3"/></g>')


def person(x, y, shirt=PINK, skin=SKIN[0], hair=INK, s=1.0, putt=True, pants=BLUE, face_dir=1, hat=None):
    g = f'<g transform="translate({x} {y}) scale({s})">'
    g += f'<rect x="-24" y="-80" width="18" height="80" rx="9" fill="{pants}"/><rect x="6" y="-80" width="18" height="80" rx="9" fill="{pants}"/>'
    g += f'<ellipse cx="-15" cy="0" rx="18" ry="8" fill="{INK}"/><ellipse cx="15" cy="0" rx="18" ry="8" fill="{INK}"/>'
    g += f'<rect x="-34" y="-180" width="68" height="110" rx="30" fill="{shirt}" stroke="{INK}" stroke-width="3"/>'
    g += f'<circle cx="0" cy="-222" r="40" fill="{skin}" stroke="{INK}" stroke-width="3"/>'
    g += f'<path d="M-40 -228 q4 -46 44 -40 q40 4 36 40 q-20 -22 -80 0z" fill="{hair}"/>'
    if hat:
        g += f'<path d="M-42 -238 q42 -60 84 0 z" fill="{hat}" stroke="{INK}" stroke-width="3"/><rect x="{-6 + 30*face_dir}" y="-242" width="40" height="10" rx="5" fill="{hat}" stroke="{INK}" stroke-width="3" transform="translate({-20 if face_dir>0 else -20} 0)"/>'
    g += f'<circle cx="{-12+8*face_dir}" cy="-222" r="5" fill="{INK}"/><circle cx="{12+8*face_dir}" cy="-222" r="5" fill="{INK}"/>'
    g += f'<path d="M{-12+8*face_dir} -204 q12 12 24 0" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>'
    if putt:
        g += f'<path d="M-26 -160 q10 50 {18*face_dir+8} 64" stroke="{skin}" stroke-width="16" fill="none" stroke-linecap="round"/>'
        g += f'<path d="M26 -160 q-6 50 {18*face_dir-8} 64" stroke="{skin}" stroke-width="16" fill="none" stroke-linecap="round"/>'
        g += putter(18 * face_dir, 0, ang=-8 * face_dir, length=110)
    else:
        g += f'<path d="M-30 -160 q-40 -20 -46 -70" stroke="{skin}" stroke-width="16" fill="none" stroke-linecap="round"/>'
        g += f'<path d="M30 -160 q40 -20 46 -70" stroke="{skin}" stroke-width="16" fill="none" stroke-linecap="round"/>'
    return g + '</g>'


def tree(x, y, s=1.0, c="#2e8b57"):
    return (f'<g transform="translate({x} {y}) scale({s})"><rect x="-12" y="-90" width="24" height="90" fill="{WOOD}"/>'
            f'<circle cx="0" cy="-130" r="60" fill="{c}"/><circle cx="-40" cy="-100" r="40" fill="{c}"/><circle cx="40" cy="-100" r="40" fill="{c}"/>'
            f'<circle cx="-18" cy="-150" r="14" fill="#fff" opacity=".18"/></g>')


def windmill(x, y, s=1.0, body=PINK, blades=SUN, rot=15):
    bl = "".join(f'<rect x="-12" y="-150" width="24" height="140" rx="10" fill="{blades}" stroke="{INK}" stroke-width="4" transform="rotate({rot + i*90})"/>' for i in range(4))
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M-80 0 L-55 -230 L55 -230 L80 0 Z" fill="{body}" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M-70 -230 L0 -290 L70 -230 Z" fill="{PURPLE}" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M-28 0 v-50 a28 28 0 0 1 56 0 v50 z" fill="{INK}"/><rect x="-20" y="-170" width="40" height="40" rx="6" fill="{CREAM}" stroke="{INK}" stroke-width="4"/>'
            f'<g transform="translate(0 -245)">{bl}<circle r="16" fill="{INK}"/></g></g>')


def flamingo(x, y, s=1.0):
    return (f'<g transform="translate({x} {y}) scale({s})"><line x1="0" y1="0" x2="0" y2="-90" stroke="{INK}" stroke-width="5"/>'
            f'<line x1="0" y1="-50" x2="18" y2="-70" stroke="{INK}" stroke-width="5"/><ellipse cx="0" cy="-115" rx="50" ry="32" fill="{PINK}" stroke="{INK}" stroke-width="4"/>'
            f'<path d="M35 -125 q30 -40 5 -90 q-10 -20 10 -30" stroke="{PINK}" stroke-width="16" fill="none" stroke-linecap="round"/>'
            f'<circle cx="50" cy="-248" r="18" fill="{PINK}" stroke="{INK}" stroke-width="4"/><path d="M64 -250 l24 8 l-20 12 z" fill="{INK}"/><circle cx="48" cy="-254" r="4" fill="{INK}"/></g>')


def balloon(x, y, c):
    return (f'<g><path d="M{x} {y+60} q-10 40 6 90" stroke="{INK}" stroke-width="2" fill="none"/><ellipse cx="{x}" cy="{y}" rx="40" ry="52" fill="{c}" stroke="{INK}" stroke-width="3"/>'
            f'<ellipse cx="{x-14}" cy="{y-18}" rx="8" ry="14" fill="#fff" opacity=".45"/><path d="M{x-6} {y+52} l6 10 l6 -10z" fill="{c}"/></g>')


def board(x, y, w, h, ang=0, c=WOOD):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{c}" stroke="{INK}" stroke-width="4" transform="rotate({ang} {x+w/2} {y+h/2})"/>'


def path_dash(d, c=SUN, w=7):
    return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-dasharray="14 14"/>'


def sparkle(x, y, s=1, c=SUN):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0 -24 L6 -6 L24 0 L6 6 L0 24 L-6 6 L-24 0 L-6 -6 Z" fill="{c}" stroke="{INK}" stroke-width="2"/>'


def green_patch(cx, cy, rx, ry, c=FAIR):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{c}" stroke="{INK}" stroke-width="4"/>'


# ---------------------------------------------------------------- article heroes
W, H = 1200, 675


def a_backyard():
    b = sky(W, H) + sun(1060, 110) + cloud(250, 110) + cloud(640, 80, .8)
    b += f'<rect x="0" y="250" width="{W}" height="120" fill="#e9d3a8"/>' + "".join(f'<rect x="{x}" y="230" width="44" height="150" rx="10" fill="#f3e2bf" stroke="{INK}" stroke-width="3"/>' for x in range(10, 1200, 60))
    b += f'<rect x="0" y="370" width="{W}" height="305" fill="{GRASS}"/>'
    b += tree(110, 420, 1.1) + tree(1110, 430, .9, "#2a9d6a")
    b += f'<path d="M150 620 C 350 560, 300 470, 560 470 S 900 560, 1030 470" stroke="{FAIR}" stroke-width="90" fill="none" stroke-linecap="round"/>'
    b += f'<path d="M150 620 C 350 560, 300 470, 560 470 S 900 560, 1030 470" stroke="{WOOD}" stroke-width="104" fill="none" stroke-linecap="round" opacity=".0"/>'
    b += "".join(f'<rect x="{x}" y="{y}" width="60" height="14" rx="6" fill="{c}" stroke="{INK}" stroke-width="3"/>' for x, y, c in [(420, 410, ORANGE), (500, 406, PURPLE), (580, 410, TEAL), (700, 590, ORANGE), (780, 596, PINK)])
    b += flag(1030, 470, PINK, 150, "9") + ball(190, 612, 16)
    # gnome
    b += (f'<g transform="translate(860 420)"><path d="M-30 0 L0 -110 L30 0 Z" fill="{PINK}" stroke="{INK}" stroke-width="4"/><circle cx="0" cy="-20" r="22" fill="{SKIN[0]}" stroke="{INK}" stroke-width="3"/>'
          f'<path d="M-24 -10 q24 60 48 0 z" fill="#fff" stroke="{INK}" stroke-width="3"/><rect x="-26" y="0" width="52" height="40" rx="12" fill="{BLUE}" stroke="{INK}" stroke-width="3"/></g>')
    # picnic table
    b += f'<g transform="translate(300 390)"><rect x="-90" y="-50" width="180" height="20" rx="6" fill="{WOOD}" stroke="{INK}" stroke-width="3"/><line x1="-60" y1="-30" x2="-80" y2="20" stroke="{INK}" stroke-width="8"/><line x1="60" y1="-30" x2="80" y2="20" stroke="{INK}" stroke-width="8"/><rect x="-40" y="-78" width="36" height="28" rx="4" fill="{SUN}" stroke="{INK}" stroke-width="3"/></g>'
    b += person(250, 640, TEAL, SKIN[1], INK, .75)
    return wrap(W, H, "A backyard mini golf course winding across a lawn past a gnome and a picnic table to a pink flag", b, "backyard")


def a_obstacles():
    b = f'<rect width="{W}" height="{H}" fill="{CREAM}"/>' + f'<rect x="0" y="420" width="{W}" height="255" fill="#7c5cff" opacity=".18"/>'
    b += f'<rect x="60" y="440" width="1080" height="190" rx="30" fill="{FAIR}" stroke="{INK}" stroke-width="5"/>'
    b += windmill(240, 520, .85, "#c9a26b", SUN)
    b += f'<path d="M430 560 a60 60 0 0 1 120 0 v30 h-120z" fill="#d9b58a" stroke="{INK}" stroke-width="4"/><path d="M455 590 v-30 a35 35 0 0 1 70 0 v30z" fill="{INK}"/>'
    b += f'<text x="490" y="640" font-family="Arial" font-size="0">.</text>'
    b += f'<path d="M620 600 L800 520 L800 540 L620 610z" fill="{WOOD}" stroke="{INK}" stroke-width="4"/><rect x="780" y="520" width="60" height="80" rx="6" fill="#9aa3ad" stroke="{INK}" stroke-width="4"/>'
    b += f'<g transform="translate(960 560)"><path d="M-60 -60 h120 l-20 100 h-80z" fill="{ORANGE}" stroke="{INK}" stroke-width="4" transform="rotate(-90 0 0)"/><ellipse cx="-50" cy="0" rx="18" ry="56" fill="{INK}"/></g>'
    b += "".join(f'<rect x="{x}" y="300" width="{w}" height="{h}" rx="4" fill="{c}" stroke="{INK}" stroke-width="3"/>' for x, w, h, c in [(700, 40, 120, PINK), (744, 34, 110, BLUE), (782, 44, 125, SUN)])
    b += f'<g transform="translate(1000 330)"><rect x="-70" y="-20" width="140" height="90" rx="10" fill="#d9b58a" stroke="{INK}" stroke-width="4"/><path d="M-70 -20 l30 -30 h140 l-30 30z" fill="#e8c9a0" stroke="{INK}" stroke-width="4"/><text x="0" y="40" text-anchor="middle" font-family="Arial" font-weight="700" font-size="26" fill="{INK}">MAZE</text></g>'
    b += f'<g transform="translate(160 260)"><circle r="46" fill="{TEAL}" stroke="{INK}" stroke-width="4"/><rect x="-10" y="40" width="20" height="60" fill="{INK}"/></g>'
    b += path_dash("M120 600 Q 300 470 470 580 T 780 590 T 950 560", PINK)
    b += ball(120, 600, 16) + sparkle(560, 200, 1.3) + sparkle(420, 120, .9, PINK) + sparkle(880, 150, 1, TEAL)
    b += f'<g transform="translate(560 330) rotate(-12)"><rect x="-80" y="-24" width="160" height="48" rx="24" fill="{SUN}" stroke="{INK}" stroke-width="4"/><circle cx="-50" r="8" fill="{INK}"/><circle cx="-20" r="8" fill="{INK}"/><circle cx="10" r="8" fill="{INK}"/><circle cx="40" r="8" fill="{INK}"/></g>'
    return wrap(W, H, "Home-made mini golf obstacles: a cardboard windmill, a tunnel, a plank ramp, a book wall and a bucket on its side", b, "obstacles")


def a_rules():
    b = f'<rect width="{W}" height="{H}" fill="#e7f7ee"/>' + "".join(f'<circle cx="{x}" cy="{y}" r="6" fill="{FAIR}" opacity=".25"/>' for x in range(40, 1200, 80) for y in range(40, 675, 80))
    b += f'<g transform="translate(420 340) rotate(-6)"><rect x="-260" y="-230" width="520" height="460" rx="24" fill="#fff" stroke="{INK}" stroke-width="6"/>'
    b += f'<rect x="-260" y="-230" width="520" height="80" rx="24" fill="{PINK}" stroke="{INK}" stroke-width="6"/><text x="0" y="-178" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial" font-weight="700" font-size="40" fill="#fff">SCORECARD</text>'
    for i in range(5):
        y = -120 + i * 64
        b += f'<line x1="-230" y1="{y+30}" x2="230" y2="{y+30}" stroke="#cfe3d7" stroke-width="3"/><text x="-220" y="{y+14}" font-family="Arial" font-weight="700" font-size="30" fill="{INK}">{i+1}</text>'
        b += f'<text x="-120" y="{y+14}" font-family="Arial" font-size="28" fill="#4c6b5f">par {[2,3,2,3,2][i]}</text>'
        b += f'<text x="60" y="{y+14}" font-family="Comic Sans MS,Arial" font-size="34" fill="{BLUE}">{[2,3,1,4,2][i]}</text><text x="160" y="{y+14}" font-family="Comic Sans MS,Arial" font-size="34" fill="{PINK}">{[3,3,2,3,2][i]}</text>'
    b += f'<circle cx="60" cy="0" r="30" fill="none" stroke="{ORANGE}" stroke-width="5"/></g>'
    b += f'<g transform="translate(700 520) rotate(-40)"><rect x="0" y="-12" width="240" height="24" fill="{SUN}" stroke="{INK}" stroke-width="4"/><path d="M240 -12 l40 12 l-40 12z" fill="{SKIN[0]}" stroke="{INK}" stroke-width="4"/><rect x="-30" y="-12" width="30" height="24" fill="{PINK}" stroke="{INK}" stroke-width="4"/></g>'
    b += green_patch(960, 560, 200, 60) + flag(1000, 560, SUN, 260, "?") + ball(900, 548, 22, True) + ball(1080, 560, 18)
    b += f'<g transform="translate(900 200) rotate(8)"><rect x="-70" y="-50" width="140" height="100" rx="8" fill="{PURPLE}" stroke="{INK}" stroke-width="5"/><rect x="-60" y="-40" width="120" height="80" rx="4" fill="none" stroke="#fff" stroke-width="3"/><text x="0" y="12" text-anchor="middle" font-family="Arial" font-weight="700" font-size="28" fill="#fff">RULES</text></g>'
    return wrap(W, H, "A mini golf scorecard with pencil, a little rule book and a smiling golf ball beside a yellow flag", b, "rules")


def a_putting():
    b = f'<rect width="{W}" height="{H}" fill="#dff3ff"/>'
    b += f'<rect x="80" y="170" width="1040" height="440" rx="40" fill="{FAIR}" stroke="{INK}" stroke-width="6"/>'
    b += f'<rect x="80" y="170" width="1040" height="36" rx="18" fill="{WOOD}" stroke="{INK}" stroke-width="5"/><rect x="80" y="574" width="1040" height="36" rx="18" fill="{WOOD}" stroke="{INK}" stroke-width="5"/>'
    b += f'<rect x="560" y="330" width="40" height="280" rx="10" fill="{WOOD}" stroke="{INK}" stroke-width="5"/>'
    b += path_dash("M240 480 L580 210 L940 470", SUN, 8)
    b += f'<circle cx="580" cy="220" r="26" fill="none" stroke="{SUN}" stroke-width="5"/>'
    b += ball(240, 480, 22, True) + f'<ellipse cx="960" cy="480" rx="34" ry="14" fill="{INK}"/>' + flag(960, 480, PINK, 150)
    b += putter(200, 520, -18, 260, INK, PINK)
    b += "".join(f'<path d="M{700+i*40} 360 q10 -20 20 0" stroke="#bff0cf" stroke-width="4" fill="none"/>' for i in range(5))
    b += f'<text x="600" y="120" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial" font-weight="700" font-size="46" fill="{INK}">angle in = angle out</text>'
    return wrap(W, H, "A putter and smiling ball on a mini golf green with a dotted line banking off the top wall around a divider into the cup", b, "putting")


def a_party():
    b = f'<rect width="{W}" height="{H}" fill="#fff0f5"/>'
    b += "".join(f'<path d="M{x} 0 l30 60 l30 -60z" fill="{c}"/>' for x, c in zip(range(0, 1200, 60), [PINK, SUN, TEAL, PURPLE, ORANGE] * 5))
    b += f'<path d="M0 0 Q600 90 1200 0" stroke="{INK}" stroke-width="3" fill="none"/>'
    b += balloon(120, 200, PINK) + balloon(200, 170, SUN) + balloon(1080, 190, TEAL) + balloon(1000, 230, PURPLE)
    b += f'<rect x="0" y="500" width="{W}" height="175" fill="{GRASS}"/>'
    b += person(420, 600, SUN, SKIN[2], INK, 1.0, putt=False, pants=PURPLE) + person(760, 610, TEAL, SKIN[0], "#8b4513", 1.0, True, BLUE, -1)
    b += flag(980, 600, ORANGE, 170, "7") + ball(700, 600, 16)
    for i, (t, c) in enumerate([("Wrong hand!", PINK), ("Eyes closed", SUN), ("Sing it!", TEAL)]):
        x = 380 + i * 170; y = 330 + i * 16
        b += f'<g transform="translate({x+70} {y-200}) rotate({-10+i*10})"><rect x="-90" y="-56" width="180" height="112" rx="14" fill="#fff" stroke="{INK}" stroke-width="4"/><rect x="-90" y="-56" width="180" height="28" rx="14" fill="{c}"/><text x="0" y="22" text-anchor="middle" font-family="Arial" font-weight="700" font-size="24" fill="{INK}">{t}</text></g>'
    b += sparkle(300, 380, 1.2) + sparkle(900, 390, 1, PINK) + sparkle(560, 460, .8, PURPLE)
    return wrap(W, H, "A mini golf party with bunting, balloons, two friends celebrating and a fan of challenge cards reading wrong hand, eyes closed and sing it", b, "party")


def a_indoor():
    b = f'<rect width="{W}" height="{H}" fill="#f7e9d7"/><rect x="0" y="0" width="{W}" height="400" fill="#fde3b8"/>'
    b += "".join(f'<rect x="{x}" y="0" width="40" height="400" fill="#fbd9a3"/>' for x in range(0, 1200, 80))
    b += f'<rect x="760" y="60" width="300" height="200" rx="10" fill="#bfeaff" stroke="{INK}" stroke-width="6"/><line x1="910" y1="60" x2="910" y2="260" stroke="{INK}" stroke-width="6"/>'
    b += "".join(f'<line x1="{x}" y1="80" x2="{x-30}" y2="{240}" stroke="#7cc6ee" stroke-width="4"/>' for x in range(800, 1060, 40))
    b += f'<rect x="0" y="400" width="{W}" height="275" fill="#c98b5e"/>' + "".join(f'<line x1="0" y1="{y}" x2="{W}" y2="{y}" stroke="#b27749" stroke-width="3"/>' for y in range(440, 675, 45))
    b += f'<ellipse cx="560" cy="560" rx="460" ry="100" fill="{TEAL}" stroke="{INK}" stroke-width="5"/>'
    b += f'<g transform="translate(140 430)"><rect x="-10" y="-150" width="340" height="120" rx="30" fill="{PURPLE}" stroke="{INK}" stroke-width="5"/><rect x="-40" y="-100" width="400" height="110" rx="30" fill="{PURPLE}" stroke="{INK}" stroke-width="5"/><rect x="20" y="-80" width="140" height="60" rx="20" fill="#9b82ff" stroke="{INK}" stroke-width="4"/><rect x="180" y="-80" width="140" height="60" rx="20" fill="#9b82ff" stroke="{INK}" stroke-width="4"/></g>'
    b += f'<g transform="translate(600 520)"><rect x="-140" y="-70" width="280" height="24" rx="6" fill="{WOOD}" stroke="{INK}" stroke-width="4"/><rect x="-126" y="-46" width="18" height="70" fill="{WOOD}" stroke="{INK}" stroke-width="3"/><rect x="108" y="-46" width="18" height="70" fill="{WOOD}" stroke="{INK}" stroke-width="3"/><rect x="-40" y="-104" width="50" height="34" rx="6" fill="{PINK}" stroke="{INK}" stroke-width="3"/></g>'
    b += f'<g transform="translate(930 560) rotate(90)"><path d="M-30 -40 h60 l-8 80 h-44z" fill="{SUN}" stroke="{INK}" stroke-width="4"/></g><ellipse cx="970" cy="560" rx="12" ry="26" fill="{INK}"/>'
    b += "".join(f'<rect x="{x}" y="590" width="80" height="24" rx="12" fill="{c}" stroke="{INK}" stroke-width="3"/>' for x, c in [(300, PINK), (390, ORANGE)])
    b += path_dash("M240 540 Q 420 600 600 545 T 930 560", "#fff")
    b += ball(240, 540, 16, color="#ffe066")
    b += f'<g transform="translate(1080 470)"><ellipse cx="0" cy="40" rx="50" ry="14" fill="{INK}" opacity=".2"/><ellipse cx="0" cy="0" rx="46" ry="36" fill="#7a5230"/><circle cx="-30" cy="-30" r="26" fill="#7a5230"/><circle cx="-40" cy="-34" r="5" fill="#fff"/><path d="M-52 -50 l-6 -20 l16 10z" fill="#7a5230"/><path d="M42 -6 q30 -20 20 -40" stroke="#7a5230" stroke-width="10" fill="none" stroke-linecap="round"/></g>'
    return wrap(W, H, "A living room turned into a mini golf course: the ball travels under the coffee table past cushion walls to a cup on its side while the dog watches", b, "indoor")


def a_kids():
    b = sky(W, H, "#ffe1ec", "#fff6e0") + cloud(200, 120, .8) + cloud(950, 90, .7)
    b += hill(430, "#6fd08e", amp=30) + hill(470, GRASS, amp=24, phase=2)
    b += green_patch(700, 560, 420, 80)
    b += person(420, 600, ORANGE, SKIN[0], "#6b3b1a", 1.05, True, BLUE, 1) + person(560, 610, SUN, SKIN[0], "#6b3b1a", .62, True, PINK, 1)
    b += ball(700, 596, 20, True, "#ffe066") + flag(980, 570, TEAL, 180, "1")
    b += f'<g transform="translate(160 520)"><ellipse cx="0" cy="0" rx="90" ry="60" fill="{BLUE}" stroke="{INK}" stroke-width="5"/><circle cx="60" cy="-50" r="40" fill="{BLUE}" stroke="{INK}" stroke-width="5"/><circle cx="72" cy="-58" r="8" fill="#fff"/><circle cx="74" cy="-58" r="4" fill="{INK}"/><path d="M-90 0 q-40 -20 -40 -60" stroke="{BLUE}" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M40 -90 q10 -30 30 -20" stroke="{INK}" stroke-width="4" fill="none"/></g>'
    b += sparkle(760, 420, 1) + sparkle(820, 380, .7, PINK) + sparkle(640, 360, .6, PURPLE)
    b += "".join(f'<circle cx="{x}" cy="{y}" r="10" fill="{c}"/>' for x, y, c in [(1100, 520, PINK), (1130, 560, SUN), (1080, 600, PURPLE)])
    return wrap(W, H, "A grown-up and a small child putting together toward a teal flag, with a smiling yellow ball and a friendly whale obstacle", b, "kids")


def a_date():
    b = f'<defs><linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a7a"/><stop offset=".6" stop-color="#ff7aa2"/><stop offset="1" stop-color="#ffc98a"/></linearGradient></defs><rect width="{W}" height="{H}" fill="url(#dusk)"/>'
    b += "".join(f'<circle cx="{x}" cy="{y}" r="3" fill="#fff"/>' for x, y in [(120, 60), (300, 110), (520, 40), (760, 90), (980, 50), (1120, 130), (420, 150)])
    b += f'<circle cx="1000" cy="120" r="46" fill="#fff4c2"/><circle cx="1020" cy="110" r="46" fill="#3b2a7a" opacity=".0"/>'
    b += f'<path d="M0 200 Q 300 260 600 200 T 1200 200" stroke="{INK}" stroke-width="3" fill="none"/>'
    b += "".join(f'<circle cx="{x}" cy="{200 + 34*math.sin((x/1200)*2*math.pi*2 - .0):.0f}" r="11" fill="{c}" stroke="{INK}" stroke-width="2"/>' for x, c in zip(range(30, 1200, 70), [SUN, PINK, TEAL, "#fff4c2"] * 6))
    b += f'<rect x="0" y="470" width="{W}" height="205" fill="#2a8f58"/>' + green_patch(600, 560, 520, 70, "#3fb56b")
    b += person(430, 610, PINK, SKIN[1], INK, .95, True, PURPLE, 1) + person(760, 610, TEAL, SKIN[3], "#c28a2c", .95, False, BLUE, -1)
    b += f'<path d="M920 560 c -20 -30 -60 -10 -40 20 l40 30 l40 -30 c 20 -30 -20 -50 -40 -20z" fill="{INK}"/>' + flag(920, 560, PINK, 170)
    b += ball(560, 596, 16)
    b += f'<path d="M600 300 c -24 -36 -72 -12 -48 24 l48 36 l48 -36 c 24 -36 -24 -60 -48 -24z" fill="{PINK}" stroke="{INK}" stroke-width="4"/>'
    return wrap(W, H, "A couple playing mini golf at dusk under string lights, one celebrating a putt toward a heart-shaped hole", b, "date")


def a_trick():
    b = f'<rect width="{W}" height="{H}" fill="#eef1ff"/>' + "".join(f'<line x1="{x}" y1="0" x2="{x-200}" y2="{H}" stroke="#dde3ff" stroke-width="30"/>' for x in range(0, 1500, 120))
    b += f'<rect x="0" y="520" width="{W}" height="155" fill="{GRASS}"/>'
    b += person(300, 600, PURPLE, SKIN[2], INK, 1.05, False, INK, 1, hat=SUN)
    b += f'<g transform="translate(376 322) rotate(-70)"><rect x="-4" y="-160" width="8" height="160" rx="4" fill="{INK}"/><rect x="-6" y="-10" width="46" height="18" rx="6" fill="{SUN}" stroke="{INK}" stroke-width="3"/></g>'
    b += path_dash("M390 300 q 20 -80 40 -20 q 20 -70 40 -10", PINK, 5) + ball(470, 250, 16)
    b += board(640, 420, 20, 110, 25) + board(880, 330, 20, 110, -25)
    b += path_dash("M560 580 L660 480 L880 380 L1030 560", SUN, 7)
    b += ball(560, 580, 16, True) + f'<ellipse cx="1040" cy="580" rx="36" ry="14" fill="{INK}"/>' + flag(1040, 580, TEAL, 150)
    b += f'<g transform="translate(160 470)"><rect x="-40" y="-60" width="80" height="120" rx="14" fill="{INK}"/><rect x="-32" y="-50" width="64" height="94" rx="8" fill="#5dd0ff"/><circle cx="0" cy="52" r="5" fill="#fff"/><circle cx="24" cy="-40" r="8" fill="#ff4d4d"/></g>'
    b += sparkle(760, 180, 1.3) + sparkle(1100, 150, .9, PINK) + sparkle(620, 120, .7, TEAL)
    return wrap(W, H, "A golfer in a yellow cap bouncing a ball on a putter while another ball banks off two angled boards into a cup, filmed on a phone", b, "trick")


def a_design():
    b = f'<rect width="{W}" height="{H}" fill="#1d4f8f"/>' + "".join(f'<line x1="{x}" y1="0" x2="{x}" y2="{H}" stroke="#2c63a8" stroke-width="2"/>' for x in range(0, 1200, 40)) + "".join(f'<line x1="0" y1="{y}" x2="{W}" y2="{y}" stroke="#2c63a8" stroke-width="2"/>' for y in range(0, 675, 40))
    b += f'<path d="M140 560 L140 200 Q140 140 200 140 L620 140 Q680 140 680 200 L680 330 L1000 330 Q1060 330 1060 390 L1060 560 Q1060 600 1020 600 L180 600 Q140 600 140 560 Z" fill="none" stroke="#fff" stroke-width="6"/>'
    b += f'<path d="M240 520 L240 240 L580 240 L580 430 L960 430 L960 520 Z" fill="{FAIR}" opacity=".85" stroke="#fff" stroke-width="4" stroke-dasharray="10 8"/>'
    b += f'<rect x="420" y="380" width="120" height="30" fill="{SUN}" stroke="{INK}" stroke-width="3" transform="rotate(-12 480 395)"/><text x="480" y="370" text-anchor="middle" font-family="Arial" font-size="22" fill="#fff">RAMP</text>'
    b += ball(290, 480, 16) + f'<circle cx="900" cy="480" r="16" fill="{INK}" stroke="#fff" stroke-width="3"/>' + flag(900, 480, PINK, 120)
    b += path_dash("M290 480 L300 290 L520 280 L700 470 L880 480", SUN, 5)
    b += f'<line x1="140" y1="630" x2="1060" y2="630" stroke="#fff" stroke-width="3"/><text x="600" y="660" text-anchor="middle" font-family="Arial" font-size="22" fill="#fff">6.5 m</text>'
    b += f'<g transform="translate(1030 200)"><rect x="-90" y="-60" width="180" height="120" rx="12" fill="#fff" stroke="{INK}" stroke-width="4"/><text x="0" y="-12" text-anchor="middle" font-family="Arial" font-weight="700" font-size="30" fill="{INK}">HOLE 4</text><text x="0" y="30" text-anchor="middle" font-family="Arial" font-size="28" fill="{PINK}">PAR 3</text></g>'
    b += f'<g transform="translate(820 150) rotate(35)"><rect x="0" y="-14" width="260" height="28" fill="{SUN}" stroke="{INK}" stroke-width="4"/><path d="M260 -14 l40 14 l-40 14z" fill="{SKIN[0]}" stroke="{INK}" stroke-width="4"/><rect x="-26" y="-14" width="26" height="28" fill="{PINK}" stroke="{INK}" stroke-width="4"/></g>'
    return wrap(W, H, "A blueprint-style plan of a dogleg mini golf hole with a ramp, a dotted ball path, a measurement line and a par 3 label", b, "design")


def a_practice():
    b = f'<rect width="{W}" height="{H}" fill="#fff6e0"/>'
    b += f'<rect x="80" y="300" width="1040" height="300" rx="30" fill="{FAIR}" stroke="{INK}" stroke-width="6"/>'
    cx, cy = 780, 450
    b += f'<circle cx="{cx}" cy="{cy}" r="22" fill="{INK}"/>' + flag(cx, cy, PINK, 170)
    for i in range(8):
        a = i * math.pi / 4
        b += ball(int(cx + math.cos(a) * 120), int(cy + math.sin(a) * 90), 13)
    for i, x in enumerate([200, 290, 380, 470]):
        b += f'<g transform="translate({x} 540)"><rect x="-5" y="-30" width="10" height="30" fill="{[SUN,ORANGE,PINK,PURPLE][i]}" stroke="{INK}" stroke-width="2"/><ellipse cx="0" cy="-30" rx="12" ry="5" fill="{[SUN,ORANGE,PINK,PURPLE][i]}" stroke="{INK}" stroke-width="2"/><text x="0" y="30" text-anchor="middle" font-family="Arial" font-size="20" fill="#fff">{i+1}m</text></g>'
    b += ball(140, 520, 14, True)
    b += f'<g transform="translate(220 170)"><circle r="80" fill="#fff" stroke="{INK}" stroke-width="6"/><circle r="6" fill="{INK}"/><line x1="0" y1="0" x2="0" y2="-56" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><line x1="0" y1="0" x2="40" y2="20" stroke="{PINK}" stroke-width="6" stroke-linecap="round"/><rect x="-14" y="-104" width="28" height="18" rx="4" fill="{INK}"/></g>'
    b += f'<text x="220" y="290" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial" font-weight="700" font-size="30" fill="{INK}">15:00</text>'
    b += f'<g transform="translate(620 150)"><rect x="-150" y="-70" width="300" height="140" rx="16" fill="#fff" stroke="{INK}" stroke-width="5"/><text x="0" y="-20" text-anchor="middle" font-family="Arial" font-weight="700" font-size="28" fill="{INK}">STREAK</text><text x="0" y="46" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial" font-weight="700" font-size="64" fill="{PINK}">12</text></g>'
    return wrap(W, H, "A putting green with balls arranged like a clock around the cup, a ladder of coloured tees, a timer and a streak counter", b, "practice")


def a_gear():
    b = f'<rect width="{W}" height="{H}" fill="#fdf1e6"/>' + "".join(f'<circle cx="{x}" cy="{y}" r="4" fill="#f2d8bf"/>' for x in range(30, 1200, 60) for y in range(30, 675, 60))
    b += f'<g transform="translate(600 360) rotate(-8)"><rect x="-420" y="-80" width="840" height="160" rx="20" fill="{FAIR}" stroke="{INK}" stroke-width="6"/><circle cx="360" cy="0" r="24" fill="{INK}"/><path d="M380 -80 a80 80 0 0 1 0 160" fill="#2a8a50" stroke="{INK}" stroke-width="5"/><line x1="-400" y1="0" x2="320" y2="0" stroke="#fff" stroke-width="3" stroke-dasharray="16 14"/></g>'
    b += putter(260, 600, 60, 360, INK, PURPLE)
    b += "".join(ball(x, y, 26, False, c) for x, y, c in [(760, 560, "#fff"), (830, 590, SUN), (900, 555, PINK), (970, 590, TEAL), (1040, 560, ORANGE)])
    b += "".join(f'<g transform="translate({x} 150) rotate({r})"><rect x="-6" y="-40" width="12" height="60" rx="3" fill="{c}" stroke="{INK}" stroke-width="3"/><ellipse cx="0" cy="-40" rx="16" ry="6" fill="{c}" stroke="{INK}" stroke-width="3"/></g>' for x, r, c in [(160, -20, PINK), (220, 15, SUN), (280, -5, TEAL), (340, 25, PURPLE)])
    b += f'<g transform="translate(980 170)"><path d="M-70 -60 h140 l-10 150 h-120z" fill="{PURPLE}" stroke="{INK}" stroke-width="5"/><path d="M-40 -60 q40 -60 80 0" stroke="{INK}" stroke-width="8" fill="none"/><rect x="-40" y="-10" width="80" height="40" rx="8" fill="{SUN}" stroke="{INK}" stroke-width="4"/></g>'
    b += f'<g transform="translate(580 150)"><rect x="-80" y="-50" width="160" height="100" rx="14" fill="#fff" stroke="{INK}" stroke-width="5"/><text x="0" y="-8" text-anchor="middle" font-family="Arial" font-weight="700" font-size="24" fill="{INK}">FIT FIRST</text><text x="0" y="28" text-anchor="middle" font-family="Arial" font-size="22" fill="{PINK}">33–35 in?</text></g>'
    return wrap(W, H, "A flat-lay of casual golf gear: a putter, colourful balls, a roll-out putting mat, tees and a small carry bag", b, "gear")


def a_tournament():
    b = sky(W, H, "#fff1c9", "#fff9ea")
    b += "".join(f'<rect x="{x}" y="{y}" width="12" height="20" rx="3" fill="{c}" transform="rotate({r} {x} {y})"/>' for x, y, c, r in [(100, 80, PINK, 20), (240, 140, TEAL, -30), (420, 60, PURPLE, 45), (820, 70, ORANGE, -15), (980, 150, PINK, 60), (1120, 90, SUN, 10), (700, 160, TEAL, 30), (560, 110, PINK, -45)])
    b += f'<rect x="0" y="560" width="{W}" height="115" fill="{GRASS}"/>'
    b += f'<g transform="translate(360 560)"><rect x="-90" y="-160" width="180" height="160" fill="{SUN}" stroke="{INK}" stroke-width="5"/><text x="0" y="-60" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial" font-weight="700" font-size="80" fill="{INK}">1</text>'
    b += f'<rect x="-270" y="-100" width="180" height="100" fill="#d7dde3" stroke="{INK}" stroke-width="5"/><text x="-180" y="-30" text-anchor="middle" font-family="Arial" font-weight="700" font-size="60" fill="{INK}">2</text>'
    b += f'<rect x="90" y="-70" width="180" height="70" fill="{ORANGE}" stroke="{INK}" stroke-width="5"/><text x="180" y="-18" text-anchor="middle" font-family="Arial" font-weight="700" font-size="50" fill="{INK}">3</text></g>'
    b += f'<g transform="translate(360 400)"><path d="M-60 -120 h120 q0 90 -60 100 q-60 -10 -60 -100z" fill="{SUN}" stroke="{INK}" stroke-width="5"/><path d="M-60 -100 q-50 0 -40 40 q10 20 40 10" fill="none" stroke="{INK}" stroke-width="6"/><path d="M60 -100 q50 0 40 40 q-10 20 -40 10" fill="none" stroke="{INK}" stroke-width="6"/><rect x="-12" y="-22" width="24" height="30" fill="{SUN}" stroke="{INK}" stroke-width="4"/><rect x="-44" y="8" width="88" height="24" rx="4" fill="{WOOD}" stroke="{INK}" stroke-width="4"/>{ball(0, -72, 20)}</g>'
    b += ball(180, 440, 24, True) + ball(540, 470, 24, True, "#ffe066")
    b += f'<g transform="translate(900 330)"><rect x="-210" y="-190" width="420" height="330" rx="16" fill="#fff" stroke="{INK}" stroke-width="6"/>'
    for i, y in enumerate([-150, -90, -30, 30, 90]):
        b += f'<rect x="-190" y="{y-18}" width="110" height="36" rx="6" fill="{[PINK,TEAL,PURPLE,ORANGE,BLUE][i]}"/>'
    b += f'<path d="M-80 -150 h40 v60 h-40 M-40 -120 h40" stroke="{INK}" stroke-width="4" fill="none"/><path d="M-80 -30 h40 v60 h-40 M-40 0 h40" stroke="{INK}" stroke-width="4" fill="none"/><path d="M0 -120 h40 v120 h-40 M40 -60 h40" stroke="{INK}" stroke-width="4" fill="none"/>'
    b += f'<rect x="80" y="-78" width="110" height="36" rx="6" fill="{SUN}" stroke="{INK}" stroke-width="3"/><text x="135" y="-52" text-anchor="middle" font-family="Arial" font-weight="700" font-size="20" fill="{INK}">CHAMP</text></g>'
    return wrap(W, H, "A winners podium with a golf-cup trophy, cheering golf balls and a tournament bracket board", b, "tournament")


ARTICLE_SVGS = {
    "backyard-mini-golf-course": a_backyard, "diy-mini-golf-obstacles": a_obstacles,
    "mini-golf-rules-and-etiquette": a_rules, "mini-golf-putting-tips": a_putting,
    "mini-golf-party-games": a_party, "indoor-mini-golf-course": a_indoor,
    "mini-golf-with-kids": a_kids, "mini-golf-date-night": a_date,
    "beginner-trick-shots": a_trick, "designing-mini-golf-holes": a_design,
    "putting-practice-games": a_practice, "casual-golfer-gear-guide": a_gear,
    "mini-golf-tournament-at-home": a_tournament,
}


def hero():
    w, h = 1600, 900
    b = sky(w, h, "#9fe0ff", "#e9f9ff") + sun(1420, 140, 70) + cloud(300, 130) + cloud(820, 90, .9) + cloud(1150, 230, .6)
    b += hill(470, "#7fd99a", w, 40) + hill(540, "#56c47c", w, 36, 2) + f'<rect x="0" y="600" width="{w}" height="300" fill="{GRASS}"/>'
    b += f'<path d="M-20 820 C 300 700, 420 860, 700 760 S 1100 640, 1300 720 S 1560 800, 1640 700" stroke="{FAIR}" stroke-width="120" fill="none" stroke-linecap="round"/>'
    b += f'<path d="M-20 820 C 300 700, 420 860, 700 760 S 1100 640, 1300 720 S 1560 800, 1640 700" stroke="#fff" stroke-width="4" fill="none" stroke-dasharray="20 20" opacity=".6"/>'
    b += windmill(1120, 620, 1.1)
    # loop
    b += f'<g transform="translate(560 640)"><circle cx="0" cy="-110" r="100" fill="none" stroke="{TEAL}" stroke-width="30"/><circle cx="0" cy="-110" r="100" fill="none" stroke="{INK}" stroke-width="4"/><circle cx="0" cy="-110" r="70" fill="none" stroke="{INK}" stroke-width="4"/><rect x="-160" y="-16" width="320" height="30" rx="10" fill="{TEAL}" stroke="{INK}" stroke-width="4"/></g>'
    # volcano
    b += f'<g transform="translate(260 640)"><path d="M-150 0 L-50 -190 L50 -190 L150 0 Z" fill="{ORANGE}" stroke="{INK}" stroke-width="5"/><path d="M-50 -190 q20 30 50 0 q20 30 50 0" fill="#ff5c3a" stroke="{INK}" stroke-width="4"/><path d="M-20 -200 q-30 -60 10 -90 q10 30 30 10 q20 -40 -10 -60" fill="{SUN}" stroke="{INK}" stroke-width="4"/><path d="M-40 0 v-50 a40 40 0 0 1 80 0 v50z" fill="{INK}"/></g>'
    b += flamingo(1420, 700, .9) + flamingo(1500, 690, .7)
    b += tree(80, 600, .9) + tree(1560, 580, .7, "#2a9d6a")
    b += person(760, 830, PINK, SKIN[1], INK, 1.2, True, PURPLE, 1)
    b += ball(930, 822, 30, True)
    b += path_dash("M960 822 Q 1100 780 1250 760", SUN, 8)
    b += f'<ellipse cx="1300" cy="750" rx="40" ry="14" fill="{INK}"/>' + flag(1300, 750, SUN, 200, "18")
    b += sparkle(660, 300, 1.4) + sparkle(980, 360, 1, PINK) + sparkle(420, 330, .9, PURPLE)
    return wrap(w, h, "A colourful crazy golf course with a volcano, a loop-the-loop, a pink windmill, flamingos and a smiling golf ball rolling toward the 18th flag", b, "hero")


def og():
    w, h = 1200, 630
    b = f'<rect width="{w}" height="{h}" fill="{INK}"/><circle cx="1050" cy="120" r="260" fill="{FAIR}"/><circle cx="120" cy="620" r="200" fill="{PINK}" opacity=".85"/>'
    b += windmill(980, 560, .9) + ball(820, 540, 44, True) + flag(640, 600, SUN, 130)
    b += f'<text x="80" y="230" font-family="Fredoka,Arial Rounded MT Bold,Arial" font-weight="700" font-size="100" fill="{SUN}">Crazy Golf</text>'
    b += f'<text x="80" y="340" font-family="Fredoka,Arial Rounded MT Bold,Arial" font-weight="700" font-size="100" fill="#fff">Game</text>'
    b += f'<text x="84" y="410" font-family="Nunito,Arial,sans-serif" font-size="36" fill="#cdeedd">Mini golf ideas, games and backyard builds</text>'
    return wrap(w, h, "Crazy Golf Game share card with a windmill, a smiling golf ball and a flag", b, "og")


def logo():
    b = (f'<circle cx="40" cy="40" r="34" fill="#fff" stroke="{INK}" stroke-width="5"/><circle cx="29" cy="36" r="4" fill="{INK}"/><circle cx="49" cy="36" r="4" fill="{INK}"/>'
         f'<path d="M27 49 q13 12 26 0" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="66" y="4" width="5" height="60" fill="{INK}"/><path d="M71 6 l28 10 l-28 10z" fill="{PINK}" stroke="{INK}" stroke-width="3"/>'
         f'<text x="112" y="54" font-family="Fredoka,Arial Rounded MT Bold,Arial,sans-serif" font-weight="700" font-size="38" fill="{INK}" textLength="395" lengthAdjust="spacingAndGlyphs">Crazy Golf <tspan fill="{PINK}">Game</tspan></text>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 80" role="img" aria-labelledby="logo-t"><title id="logo-t">Crazy Golf Game logo</title>{b}</svg>\n'
