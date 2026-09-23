# Original SVG illustrations for Toss Sports. Flat, playful, hand-built shapes.
INK = "#13263a"; TEAL = "#06bee1"; TANG = "#ff6b35"; LIME = "#c5f04a"; SUN = "#ffd23f"
CREAM = "#fff7e8"; GRASS = "#7ccf6b"; GRASS2 = "#5fb652"; SKY = "#bfeaf5"; BERRY = "#e84a7f"
PURP = "#7b5cff"; WOOD = "#e0a96d"; WOOD2 = "#c98a4b"; WHITE = "#ffffff"
SKINS = ["#f1c7a3", "#c68b5e", "#8d5a3b", "#f5d6b8", "#a86b44"]
HAIRS = ["#3b2416", "#1c1c1c", "#c7812e", "#6b3a1e", "#2a2a2a"]

POSES = {
    "stand": ([(-14, -145), (-26, -115), (-24, -88)], [(14, -145), (26, -115), (24, -88)],
              [(-8, -88), (-12, -45), (-14, 0)], [(8, -88), (12, -45), (14, 0)]),
    "cheer": ([(-14, -145), (-34, -172), (-38, -204)], [(14, -145), (34, -172), (38, -204)],
              [(-8, -88), (-16, -45), (-20, 0)], [(8, -88), (16, -45), (20, 0)]),
    "wave": ([(-14, -145), (-26, -115), (-24, -88)], [(14, -145), (36, -165), (44, -198)],
             [(-8, -88), (-12, -45), (-14, 0)], [(8, -88), (12, -45), (14, 0)]),
    "throw": ([(-14, -145), (-34, -130), (-50, -138)], [(14, -145), (38, -122), (62, -112)],
              [(-8, -88), (-26, -48), (-36, 0)], [(8, -88), (24, -46), (30, 0)]),
    "overhand": ([(-14, -145), (-36, -128), (-52, -112)], [(14, -145), (30, -176), (18, -206)],
                 [(-8, -88), (-26, -48), (-34, 0)], [(8, -88), (22, -46), (30, 0)]),
    "run": ([(-14, -145), (-32, -124), (-20, -104)], [(14, -145), (30, -160), (48, -150)],
            [(-8, -88), (-30, -56), (-50, -42)], [(8, -88), (20, -48), (8, -2)]),
    "kick": ([(-14, -145), (-40, -140), (-62, -150)], [(14, -145), (34, -128), (50, -140)],
             [(-8, -88), (-10, -45), (-14, 0)], [(8, -88), (42, -70), (74, -80)]),
    "reach": ([(-14, -145), (-34, -128), (-46, -104)], [(14, -145), (42, -122), (68, -96)],
              [(-8, -88), (-30, -52), (-28, 0)], [(8, -88), (34, -50), (56, -4)]),
    "hold": ([(-14, -145), (-30, -118), (-10, -110)], [(14, -145), (30, -118), (12, -108)],
             [(-8, -88), (-12, -45), (-14, 0)], [(8, -88), (12, -45), (14, 0)]),
    "lunge": ([(-14, -145), (-28, -118), (-30, -92)], [(14, -145), (28, -118), (30, -92)],
              [(-8, -88), (-40, -60), (-44, 0)], [(8, -88), (36, -40), (70, -6)]),
    "swing": ([(-14, -145), (-30, -120), (-26, -92)], [(14, -145), (22, -110), (30, -80)],
              [(-8, -88), (-12, -45), (-14, 0)], [(8, -88), (14, -52), (40, -64)]),
    "dodge": ([(-14, -145), (-40, -160), (-60, -176)], [(14, -145), (40, -150), (64, -150)],
              [(-8, -88), (-34, -60), (-60, -56)], [(8, -88), (22, -48), (18, 0)]),
    "paddle": ([(-14, -145), (-30, -122), (-26, -96)], [(14, -145), (36, -130), (58, -140)],
               [(-8, -88), (-20, -46), (-26, 0)], [(8, -88), (20, -46), (26, 0)]),
}


def pts(p):
    return " ".join(f"{x},{y}" for x, y in p)


def person(x, y, s=1.0, jersey=TANG, skin=0, hair=0, pose="stand", flip=False, shorts=INK,
           num=None, cap=False, extra=""):
    la, ra, ll, rl = POSES[pose]
    sk = SKINS[skin % len(SKINS)]; hr = HAIRS[hair % len(HAIRS)]
    tr = f"translate({x},{y}) scale({-s if flip else s},{s})"
    g = [f'<g transform="{tr}">']
    for leg in (ll, rl):
        g.append(f'<polyline points="{pts(leg)}" fill="none" stroke="{shorts}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>')
        fx, fy = leg[-1]
        g.append(f'<ellipse cx="{fx + 5}" cy="{fy}" rx="11" ry="6" fill="{WHITE}" stroke="{INK}" stroke-width="3"/>')
    g.append(f'<rect x="-19" y="-100" width="38" height="18" rx="6" fill="{shorts}"/>')
    g.append(f'<path d="M-20,-150 Q0,-158 20,-150 L22,-92 Q0,-86 -22,-92 Z" fill="{jersey}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    if num is not None:
        g.append(f'<text x="0" y="-108" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="22" fill="{WHITE}" transform="scale({-1 if flip else 1},1)">{num}</text>')
    for arm in (la, ra):
        g.append(f'<polyline points="{pts(arm)}" fill="none" stroke="{sk}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>')
    g.append(f'<rect x="-6" y="-160" width="12" height="12" fill="{sk}"/>')
    g.append(f'<circle cx="0" cy="-178" r="22" fill="{sk}" stroke="{INK}" stroke-width="3"/>')
    g.append(f'<path d="M-22,-182 Q-20,-206 0,-204 Q22,-204 22,-184 Q10,-194 -22,-182 Z" fill="{hr}"/>')
    if cap:
        g.append(f'<path d="M-23,-186 Q0,-214 23,-186 Z" fill="{jersey}" stroke="{INK}" stroke-width="3"/><path d="M18,-188 L40,-184" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>')
    g.append(f'<circle cx="-7" cy="-178" r="2.8" fill="{INK}"/><circle cx="8" cy="-178" r="2.8" fill="{INK}"/>')
    g.append(f'<path d="M-7,-168 Q1,-161 9,-168" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>')
    g.append(extra)
    g.append('</g>')
    return "".join(g)


def svg(w, h, title, desc, body, bg=CREAM):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-labelledby="t d">'
            f'<title id="t">{title}</title><desc id="d">{desc}</desc>'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>\n')


def sun(x, y, r=60):
    rays = "".join(f'<rect x="{-6}" y="{-r - 34}" width="12" height="22" rx="6" fill="{SUN}" transform="rotate({a})"/>' for a in range(0, 360, 30))
    return f'<g transform="translate({x},{y})">{rays}<circle r="{r}" fill="{SUN}" stroke="{INK}" stroke-width="4"/></g>'


def cloud(x, y, s=1):
    return (f'<g transform="translate({x},{y}) scale({s})" fill="{WHITE}" stroke="{INK}" stroke-width="3">'
            f'<path d="M0,40 Q-10,0 30,4 Q44,-26 80,-6 Q116,-20 124,18 Q150,24 140,40 Z"/></g>')


def ball(x, y, r, color, seam=True):
    s = f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" stroke="{INK}" stroke-width="4"/>'
    if seam:
        s += f'<path d="M{x - r * .7},{y - r * .3} Q{x},{y + r * .3} {x + r * .7},{y - r * .3}" fill="none" stroke="{INK}" stroke-width="3" opacity=".5"/>'
        s += f'<circle cx="{x - r * .35}" cy="{y - r * .4}" r="{r * .18}" fill="{WHITE}" opacity=".6"/>'
    return s


def wiffle(x, y, r=16):
    holes = "".join(f'<circle cx="{x + dx * r}" cy="{y + dy * r}" r="{r * .16}" fill="{INK}" opacity=".55"/>'
                    for dx, dy in [(-.4, -.3), (.35, -.35), (0, .1), (-.35, .45), (.4, .4)])
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{LIME}" stroke="{INK}" stroke-width="3"/>{holes}'


def bag(x, y, color, rot=0, s=1):
    return (f'<g transform="translate({x},{y}) rotate({rot}) scale({s})"><rect x="-18" y="-14" width="36" height="28" rx="8" fill="{color}" stroke="{INK}" stroke-width="3"/>'
            f'<path d="M-12,-8 L12,-8 M-12,0 L12,0 M-12,8 L12,8" stroke="{INK}" stroke-width="1.5" stroke-dasharray="3 3" opacity=".5"/></g>')


def board(x, y, s=1, color=TEAL):
    return (f'<g transform="translate({x},{y}) scale({s})">'
            f'<path d="M-70,0 L70,0 L52,-150 L-52,-150 Z" fill="{WOOD}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
            f'<path d="M-60,-10 L60,-10 L46,-140 L-46,-140 Z" fill="{color}" opacity=".85"/>'
            f'<ellipse cx="0" cy="-108" rx="20" ry="14" fill="{INK}"/>'
            f'<path d="M-70,0 L-70,14 L70,14 L70,0" fill="{WOOD2}" stroke="{INK}" stroke-width="4"/></g>')


def pin(x, y, s=1):
    return (f'<g transform="translate({x},{y}) scale({s})"><path d="M0,-100 C14,-100 14,-78 9,-66 C24,-46 26,-14 14,0 L-14,0 C-26,-14 -24,-46 -9,-66 C-14,-78 -14,-100 0,-100 Z" fill="{WHITE}" stroke="{INK}" stroke-width="4"/>'
            f'<path d="M-9,-72 L9,-72 M-10,-64 L10,-64" stroke="{TANG}" stroke-width="4"/></g>')


def cone(x, y, s=1, c=TANG):
    return (f'<g transform="translate({x},{y}) scale({s})"><path d="M-14,-44 L14,-44 L26,0 L-26,0 Z" fill="{c}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
            f'<rect x="-32" y="-4" width="64" height="8" rx="3" fill="{c}" stroke="{INK}" stroke-width="3"/><path d="M-19,-24 L19,-24" stroke="{WHITE}" stroke-width="6"/></g>')


def paddle(x, y, rot=0, c=BERRY):
    return (f'<g transform="translate({x},{y}) rotate({rot})"><rect x="-6" y="0" width="12" height="34" rx="4" fill="{INK}"/>'
            f'<rect x="-24" y="-52" width="48" height="56" rx="20" fill="{c}" stroke="{INK}" stroke-width="3"/></g>')


def grass(w, h, y):
    tufts = "".join(f'<path d="M{x},{y + 12} l6,-14 l6,14" fill="none" stroke="{GRASS2}" stroke-width="3"/>' for x in range(30, w, 140))
    return f'<rect x="0" y="{y}" width="{w}" height="{h - y}" fill="{GRASS}"/>{tufts}'


def arc(x1, y1, cx, cy, x2, y2, c=INK):
    return f'<path d="M{x1},{y1} Q{cx},{cy} {x2},{y2}" fill="none" stroke="{c}" stroke-width="4" stroke-dasharray="4 14" stroke-linecap="round"/>'


def bunting(x1, x2, y, n=10):
    cols = [TANG, TEAL, SUN, BERRY, LIME, PURP]
    step = (x2 - x1) / n
    s = f'<path d="M{x1},{y} Q{(x1 + x2) / 2},{y + 40} {x2},{y}" fill="none" stroke="{INK}" stroke-width="3"/>'
    for i in range(n):
        t = (i + .5) / n
        px = x1 + (x2 - x1) * t
        py = y + 40 * 4 * t * (1 - t) * .5 * 2 * .5 + 2
        s += f'<path d="M{px - step * .35},{py} L{px + step * .35},{py} L{px},{py + 34} Z" fill="{cols[i % 6]}" stroke="{INK}" stroke-width="2.5"/>'
    return s


def sparkle(x, y, c=SUN, s=1):
    return f'<path transform="translate({x},{y}) scale({s})" d="M0,-18 L5,-5 L18,0 L5,5 L0,18 L-5,5 L-18,0 L-5,-5 Z" fill="{c}" stroke="{INK}" stroke-width="2.5"/>'


# ---------------------------------------------------------------- scenes
W, H = 1200, 675


def a_find():
    b = grass(W, H, 470) + sun(1080, 110, 50) + cloud(120, 80) + cloud(560, 50, .8)
    # bulletin board
    b += f'<rect x="120" y="170" width="480" height="300" rx="14" fill="{WOOD}" stroke="{INK}" stroke-width="5"/><rect x="140" y="190" width="440" height="260" rx="8" fill="#f3d9b1"/>'
    b += f'<rect x="170" y="470" width="20" height="90" fill="{WOOD2}" stroke="{INK}" stroke-width="4"/><rect x="530" y="470" width="20" height="90" fill="{WOOD2}" stroke="{INK}" stroke-width="4"/>'
    flyers = [(165, 210, TEAL, -4), (300, 205, SUN, 3), (440, 215, BERRY, -2), (175, 330, LIME, 2), (310, 325, WHITE, -3), (445, 330, PURP, 4)]
    for fx, fy, c, r in flyers:
        b += f'<g transform="rotate({r},{fx + 55},{fy + 50})"><rect x="{fx}" y="{fy}" width="110" height="100" rx="6" fill="{c}" stroke="{INK}" stroke-width="3"/><circle cx="{fx + 55}" cy="{fy + 4}" r="6" fill="{TANG}" stroke="{INK}" stroke-width="2"/>'
        b += f'<rect x="{fx + 14}" y="{fy + 62}" width="80" height="8" rx="4" fill="{INK}" opacity=".35"/><rect x="{fx + 14}" y="{fy + 78}" width="56" height="8" rx="4" fill="{INK}" opacity=".35"/></g>'
    b += ball(220, 250, 20, TANG) + wiffle(355, 250, 18) + pin(495, 290, .55) + bag(230, 370, TANG) + ball(365, 370, 20, BERRY) + f'<ellipse cx="500" cy="372" rx="26" ry="14" fill="{WHITE}" stroke="{INK}" stroke-width="3"/>'
    # map with pins
    b += f'<g transform="translate(720,330) rotate(-6)"><rect width="340" height="220" rx="12" fill="{WHITE}" stroke="{INK}" stroke-width="4"/>'
    b += f'<path d="M0,80 Q120,40 200,110 T340,90" fill="none" stroke="{SKY}" stroke-width="22"/><path d="M60,0 L110,220 M0,160 L340,150" stroke="#e6e0d2" stroke-width="10"/>'
    b += f'<rect x="170" y="150" width="90" height="54" rx="10" fill="{GRASS}" opacity=".7"/>'
    for mx, my, c in [(90, 70, TANG), (230, 60, TEAL), (210, 160, BERRY), (300, 130, PURP)]:
        b += f'<path d="M{mx},{my} c-16,-20 -16,-44 0,-44 c16,0 16,24 0,44 Z" fill="{c}" stroke="{INK}" stroke-width="3"/><circle cx="{mx}" cy="{my - 28}" r="6" fill="{WHITE}"/>'
    b += '</g>'
    b += person(660, 610, 1.15, TEAL, 1, 1, "hold", num=None, extra=f'<rect x="-10" y="-130" width="22" height="34" rx="4" fill="{INK}"/><rect x="-7" y="-126" width="16" height="24" rx="2" fill="{SKY}"/>')
    b += sparkle(1110, 300) + sparkle(640, 150, LIME, .8)
    return svg(W, H, "Finding an adult rec league", "A park notice board covered in colourful league flyers beside a player checking a city map dotted with league pins.", b, SKY)


def a_cornhole():
    b = grass(W, H, 420) + sun(1060, 100, 46) + cloud(200, 70, .9) + bunting(0, 1200, 30, 14)
    b += board(300, 560, 1.15, TEAL) + board(930, 520, .85, TANG)
    b += bag(290, 470, TANG, 12) + bag(930, 470, TEAL, -8, .85) + bag(958, 505, TEAL, 20, .85) + bag(900, 435, TANG, -30, .85)
    b += arc(470, 330, 700, 120, 905, 420) + bag(700, 205, TANG, 35)
    b += person(470, 610, 1.3, TANG, 0, 2, "throw", num=7)
    b += person(1110, 600, 1.0, TEAL, 2, 1, "cheer", flip=True, num=3)
    b += f'<g transform="translate(560,560)"><rect x="-70" y="-30" width="140" height="60" rx="12" fill="{WHITE}" stroke="{INK}" stroke-width="4"/><text x="0" y="12" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="34" fill="{INK}">+3</text></g>'
    return svg(W, H, "Cornhole in action", "A player swings an underhand throw, the bag arcs toward the far board while a teammate cheers and a bag sits in the hole.", b, SKY)


def a_kickball():
    b = grass(W, H, 330) + sun(110, 90, 44) + cloud(820, 60)
    b += f'<path d="M600,640 L960,470 L600,360 L240,470 Z" fill="#d9a066" stroke="{INK}" stroke-width="4"/><path d="M600,610 L900,470 L600,390 L300,470 Z" fill="{GRASS}"/>'
    for bx, by in [(960, 470), (600, 360), (240, 470)]:
        b += f'<rect x="{bx - 18}" y="{by - 18}" width="36" height="36" fill="{WHITE}" stroke="{INK}" stroke-width="3" transform="rotate(45 {bx} {by})"/>'
    b += f'<path d="M580,630 L620,630 L630,646 L570,646 Z" fill="{WHITE}" stroke="{INK}" stroke-width="3"/>'
    b += f'<ellipse cx="600" cy="490" rx="40" ry="14" fill="#d9a066" stroke="{INK}" stroke-width="3"/>'
    b += person(640, 500, .9, TEAL, 3, 0, "reach", flip=True, num=12)
    b += f'<path d="M560,560 Q500,590 470,610" fill="none" stroke="{INK}" stroke-width="4" stroke-dasharray="3 12" stroke-linecap="round"/>'
    b += ball(520, 610, 24, BERRY)
    b += person(430, 660, 1.2, TANG, 1, 1, "kick", num=5)
    b += person(1000, 470, .75, TEAL, 0, 4, "hold", flip=True, cap=True) + person(200, 470, .75, TEAL, 2, 3, "hold", cap=True)
    b += person(1110, 520, .8, TANG, 4, 0, "cheer", flip=True)
    return svg(W, H, "Kickball game", "A pitcher rolls a red rubber ball toward home plate as a kicker swings a leg, with fielders spread around a dirt diamond.", b, SKY)


def a_pickle():
    b = f'<rect x="0" y="0" width="{W}" height="{H}" fill="{SKY}"/>' + sun(1090, 90, 42)
    b += f'<path d="M150,640 L1050,640 L900,300 L300,300 Z" fill="#3a8fc4" stroke="{INK}" stroke-width="5"/>'
    b += f'<path d="M225,470 L975,470 L940,395 L260,395 Z" fill="{LIME}" opacity=".55"/>'
    b += f'<path d="M150,640 L1050,640 L900,300 L300,300 Z M600,300 L600,395 M600,470 L600,640 M225,470 L975,470 M260,395 L940,395" fill="none" stroke="{WHITE}" stroke-width="5"/>'
    b += f'<path d="M240,432 L960,432" stroke="{INK}" stroke-width="6"/><path d="M240,432 L240,372 L960,372 L960,432" fill="none" stroke="{INK}" stroke-width="5"/>'
    b += "".join(f'<path d="M{x},372 L{x},432" stroke="{INK}" stroke-width="1.5" opacity=".5"/>' for x in range(260, 960, 22))
    b += f'<path d="M240,372 L960,372" stroke="{WHITE}" stroke-width="7"/>'
    b += person(470, 630, 1.25, BERRY, 0, 2, "paddle", num=None, extra=paddle(60, -142, 30, SUN))
    b += person(760, 340, .8, TEAL, 2, 1, "paddle", flip=True, extra=paddle(60, -142, 30, BERRY))
    b += arc(560, 440, 640, 250, 700, 300) + wiffle(610, 300, 16)
    b += f'<g transform="translate(1020,560)"><rect x="-80" y="-34" width="160" height="68" rx="14" fill="{WHITE}" stroke="{INK}" stroke-width="4"/><text x="0" y="14" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="34" fill="{INK}">4-2-1</text></g>'
    b += f'<text x="820" y="460" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="{INK}" opacity=".75">KITCHEN</text>'
    return svg(W, H, "Pickleball doubles court", "A pickleball court seen from the baseline with the non-volley kitchen shaded, two players with paddles and a holed ball in flight.", b, SKY)


def a_bowling():
    b = f'<rect width="{W}" height="{H}" fill="#2b1f4a"/>'
    for i in range(12):
        b += f'<circle cx="{60 + i * 100}" cy="60" r="10" fill="{[SUN, TEAL, BERRY][i % 3]}" opacity=".9"/>'
    b += f'<path d="M420,640 L780,640 L660,210 L540,210 Z" fill="{WOOD}" stroke="{INK}" stroke-width="4"/>'
    b += "".join(f'<path d="M{420 + i * 45},640 L{540 + i * 15},210" stroke="{WOOD2}" stroke-width="2"/>' for i in range(1, 8))
    b += f'<path d="M330,640 L420,640 L540,210 L520,210 Z" fill="{INK}" opacity=".6"/><path d="M780,640 L870,640 L680,210 L660,210 Z" fill="{INK}" opacity=".6"/>'
    for i, (px, py) in enumerate([(600, 255), (585, 245), (615, 245), (570, 235), (600, 235), (630, 235), (555, 225), (585, 225), (615, 225), (645, 225)][::-1]):
        b += pin(px, py, .32)
    b += "".join(f'<path d="M{590 + (i - 3) * 12},{460} l6,-12 l6,12 Z" fill="{TANG}"/>' for i in range(7))
    b += ball(640, 520, 38, PURP) + f'<circle cx="632" cy="505" r="5" fill="{INK}"/><circle cx="648" cy="505" r="5" fill="{INK}"/><circle cx="640" cy="522" r="5" fill="{INK}"/>'
    b += person(300, 650, 1.3, TEAL, 1, 0, "reach", num=None)
    b += f'<g transform="translate(900,120)"><rect width="260" height="130" rx="12" fill="{WHITE}" stroke="{INK}" stroke-width="4"/>'
    for i, m in enumerate(["X", "7 /", "9 -"]):
        b += f'<rect x="{12 + i * 82}" y="14" width="74" height="100" rx="6" fill="{CREAM}" stroke="{INK}" stroke-width="2"/><text x="{49 + i * 82}" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="26" fill="{INK}">{m}</text>'
    b += f'<text x="49" y="98" text-anchor="middle" font-family="Arial" font-weight="700" font-size="22" fill="{TANG}">20</text><text x="131" y="98" text-anchor="middle" font-family="Arial" font-weight="700" font-size="22" fill="{TANG}">39</text><text x="213" y="98" text-anchor="middle" font-family="Arial" font-weight="700" font-size="22" fill="{TANG}">48</text></g>'
    b += sparkle(120, 180, SUN) + sparkle(1080, 400, TEAL, .8)
    return svg(W, H, "Bowling lane and score sheet", "A bowler releases a purple ball down a wooden lane toward ten pins, with a score sheet showing a strike, a spare and an open frame.", b, "#2b1f4a")


def a_dodge():
    b = f'<rect width="{W}" height="{H}" fill="#ffe7c2"/><rect y="440" width="{W}" height="235" fill="{WOOD}"/>'
    b += "".join(f'<path d="M{x},440 L{x - 80},675" stroke="{WOOD2}" stroke-width="3"/>' for x in range(100, 1300, 120))
    b += f'<path d="M600,440 L600,675" stroke="{BERRY}" stroke-width="8"/>'
    for x in range(80, 1200, 190):
        b += f'<rect x="{x}" y="60" width="120" height="160" rx="8" fill="{SKY}" stroke="{INK}" stroke-width="4"/><path d="M{x + 60},60 L{x + 60},220 M{x},140 L{x + 120},140" stroke="{INK}" stroke-width="3"/>'
    b += person(260, 640, 1.2, TANG, 0, 0, "overhand", num=9)
    b += person(480, 620, 1.0, TANG, 3, 2, "stand", num=4)
    b += person(840, 600, 1.15, TEAL, 1, 1, "dodge", flip=True, num=21)
    b += person(1020, 640, 1.0, TEAL, 2, 3, "hold", flip=True, num=8, extra=ball(0, -112, 20, BERRY, False))
    b += arc(300, 380, 520, 260, 700, 330, INK) + ball(700, 330, 24, BERRY)
    b += ball(560, 250, 22, PURP) + ball(160, 660, 20, LIME) + ball(700, 655, 20, TANG)
    b += f'<path d="M725,300 l30,-10 M730,320 l34,0 M725,340 l30,10" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
    return svg(W, H, "Dodgeball in a gym", "Two teams on either side of a centre line in a gym; a foam ball flies toward a player who leans away while a teammate holds a caught ball.", b, "#ffe7c2")


def a_flag():
    b = grass(W, H, 250) + f'<rect width="{W}" height="250" fill="{SKY}"/>' + cloud(900, 60) + sun(140, 110, 46)
    for x in range(0, 1300, 170):
        b += f'<path d="M{x},250 L{x - 120},675" stroke="{WHITE}" stroke-width="6" opacity=".8"/>'
    b += person(560, 600, 1.35, TANG, 1, 1, "run", num=24, extra=f'<rect x="-24" y="-98" width="48" height="8" fill="{INK}"/><path d="M-22,-92 l-6,40 l10,0 Z" fill="{SUN}" stroke="{INK}" stroke-width="2"/>')
    b += f'<g transform="translate(640,372) rotate(-30)"><ellipse rx="30" ry="18" fill="#8a4b24" stroke="{INK}" stroke-width="4"/><path d="M-12,0 L12,0 M-6,-5 L-6,5 M0,-5 L0,5 M6,-5 L6,5" stroke="{WHITE}" stroke-width="2.5"/></g>'
    b += person(840, 610, 1.25, TEAL, 0, 2, "reach", flip=True, num=11)
    b += f'<g transform="translate(700,470) rotate(-25)"><path d="M0,0 L10,0 L18,70 L2,70 Z" fill="{SUN}" stroke="{INK}" stroke-width="3"/></g>'
    b += f'<path d="M690,440 l-20,-20 M720,445 l6,-28 M740,462 l26,-12" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
    b += person(250, 560, .85, TANG, 2, 0, "cheer", num=2)
    b += f'<path d="M1060,250 L1060,120 M1020,120 L1100,120" stroke="{SUN}" stroke-width="10" stroke-linecap="round"/>'
    return svg(W, H, "Flag football play", "A ball carrier sprints downfield as a defender reaches out and pulls a yellow flag from the runner's belt.", b, SKY)


def a_start():
    b = f'<rect width="{W}" height="{H}" fill="#e9f7fb"/>' + f'<rect y="520" width="{W}" height="155" fill="{GRASS}"/>'
    b += f'<g transform="translate(90,90)"><rect width="460" height="330" rx="16" fill="{WHITE}" stroke="{INK}" stroke-width="5"/><rect width="460" height="60" rx="16" fill="{TEAL}" stroke="{INK}" stroke-width="5"/>'
    for r in range(4):
        for c in range(5):
            fill = [CREAM, SUN, CREAM, LIME, CREAM][c] if (r + c) % 3 == 0 else CREAM
            b += f'<rect x="{20 + c * 86}" y="{80 + r * 60}" width="76" height="50" rx="6" fill="{fill}" stroke="{INK}" stroke-width="2"/>'
    b += f'<circle cx="{20 + 38 + 86}" cy="{80 + 25 + 60}" r="14" fill="{TANG}"/><circle cx="{20 + 38 + 86 * 3}" cy="{80 + 25 + 120}" r="14" fill="{BERRY}"/><circle cx="{58}" cy="{80 + 25 + 180}" r="14" fill="{PURP}"/>'
    b += f'<circle cx="60" cy="0" r="10" fill="{INK}"/><circle cx="400" cy="0" r="10" fill="{INK}"/></g>'
    b += person(760, 640, 1.35, SUN, 4, 1, "hold", num=None, extra=f'<rect x="-30" y="-140" width="44" height="58" rx="5" fill="{WOOD}" stroke="{INK}" stroke-width="3" transform="rotate(-10)"/><rect x="-24" y="-132" width="32" height="44" fill="{WHITE}" transform="rotate(-10)"/>')
    b += cone(930, 600) + cone(1010, 620, .9, SUN) + cone(1090, 600, 1, TEAL)
    b += f'<g transform="translate(1010,300)"><path d="M-50,-90 L50,-90 L40,-20 Q0,20 -40,-20 Z" fill="{SUN}" stroke="{INK}" stroke-width="5"/><path d="M-50,-80 Q-90,-70 -60,-30 M50,-80 Q90,-70 60,-30" fill="none" stroke="{INK}" stroke-width="5"/><rect x="-10" y="0" width="20" height="40" fill="{SUN}" stroke="{INK}" stroke-width="4"/><rect x="-44" y="40" width="88" height="26" rx="4" fill="{WOOD2}" stroke="{INK}" stroke-width="4"/></g>'
    b += f'<g transform="translate(620,180)"><circle r="30" fill="{TEAL}" stroke="{INK}" stroke-width="4"/><rect x="18" y="-14" width="50" height="22" rx="8" fill="{TEAL}" stroke="{INK}" stroke-width="4"/><path d="M-10,-28 Q-40,-80 -80,-60" fill="none" stroke="{TANG}" stroke-width="5"/></g>'
    b += sparkle(1110, 190) + sparkle(900, 160, LIME, .7)
    return svg(W, H, "Planning a new league", "An organiser holds a clipboard beside a big season calendar, a whistle, a row of cones and a gold trophy.", b, "#e9f7fb")


def a_names():
    b = f'<rect width="{W}" height="{H}" fill="#fff0da"/>' + f'<path d="M40,150 Q600,230 1160,150" fill="none" stroke="{INK}" stroke-width="5"/>'
    jer = [(170, TANG, "12"), (400, TEAL, "?"), (630, BERRY, "00"), (860, PURP, "!"), (1060, LIME, "7")]
    for x, c, n in jer:
        y = 150 + 80 * (1 - ((x - 600) / 560) ** 2) - 10
        b += f'<g transform="translate({x},{y})"><path d="M-70,20 L-30,0 Q0,18 30,0 L70,20 L92,74 L60,86 L56,64 L56,210 L-56,210 L-56,64 L-60,86 L-92,74 Z" fill="{c}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
        b += f'<rect x="-10" y="-10" width="8" height="26" fill="{WOOD}" stroke="{INK}" stroke-width="2"/>'
        b += f'<text x="0" y="150" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="64" fill="{WHITE}" stroke="{INK}" stroke-width="3">{n}</text></g>'
    b += f'<g transform="translate(600,520)"><circle cy="-30" r="56" fill="{SUN}" stroke="{INK}" stroke-width="5"/><rect x="-26" y="22" width="52" height="40" rx="8" fill="{WHITE}" stroke="{INK}" stroke-width="5"/><path d="M-18,-40 Q0,-10 18,-40" fill="none" stroke="{INK}" stroke-width="4"/></g>'
    b += "".join(f'<path d="M{600 + 110 * __import__("math").cos(a)},{490 + 110 * __import__("math").sin(a)} L{600 + 140 * __import__("math").cos(a)},{490 + 140 * __import__("math").sin(a)}" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>' for a in [-2.6, -2.2, -1.57, -0.94, -0.54])
    b += person(250, 660, 1.0, TEAL, 1, 0, "cheer") + person(950, 660, 1.0, TANG, 3, 2, "wave", flip=True)
    b += f'<g transform="translate(380,480)"><rect x="-80" y="-40" width="160" height="70" rx="20" fill="{WHITE}" stroke="{INK}" stroke-width="4"/><path d="M-30,30 L-50,60 L0,30" fill="{WHITE}" stroke="{INK}" stroke-width="4"/><text y="8" text-anchor="middle" font-family="Arial" font-weight="700" font-size="26" fill="{INK}">Hmm...</text></g>'
    b += sparkle(760, 420) + sparkle(1100, 420, TEAL)
    return svg(W, H, "Brainstorming team names", "Five blank team jerseys hang on a washing line above a glowing light bulb while two teammates brainstorm names.", b, "#fff0da")


def a_free():
    b = grass(W, H, 460) + f'<rect width="{W}" height="460" fill="{SKY}"/>' + cloud(140, 70) + sun(1080, 100, 44)
    for i, x in enumerate([620, 740, 860, 980, 1100]):
        b += person(x, 600, .95, PURP, i, i + 1, "wave" if i == 0 else "stand", flip=True, num=[3, 14, 8, 22, 5][i])
    b += f'<rect x="490" y="560" width="70" height="30" rx="6" fill="none" stroke="{INK}" stroke-width="4" stroke-dasharray="10 8"/>'
    b += person(250, 620, 1.2, WHITE, 2, 3, "wave", extra=f'<rect x="-16" y="-138" width="32" height="20" rx="4" fill="{WHITE}" stroke="{TANG}" stroke-width="3"/><rect x="-16" y="-138" width="32" height="7" fill="{TANG}"/>')
    b += f'<path d="M340,470 C400,440 440,480 500,450" fill="none" stroke="{INK}" stroke-width="4" stroke-dasharray="4 12" stroke-linecap="round"/><path d="M490,440 l14,10 l-16,8" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
    b += f'<g transform="translate(250,300)"><rect x="-90" y="-50" width="180" height="80" rx="20" fill="{WHITE}" stroke="{INK}" stroke-width="4"/><path d="M-20,30 L-10,62 L20,30" fill="{WHITE}" stroke="{INK}" stroke-width="4"/><text y="0" text-anchor="middle" font-family="Arial" font-weight="700" font-size="24" fill="{INK}">Room for</text><text y="24" text-anchor="middle" font-family="Arial" font-weight="700" font-size="24" fill="{INK}">one more?</text></g>'
    b += sparkle(560, 320) + ball(760, 640, 18, TANG)
    return svg(W, H, "Joining as a free agent", "A solo player with a name tag walks toward a waving team that has left an open spot in its line-up.", b, SKY)


def a_bag():
    b = f'<rect width="{W}" height="{H}" fill="#e7f4ff"/>' + f'<rect y="560" width="{W}" height="115" fill="#cfe1ef"/>'
    b += f'<path d="M300,560 L900,560 L960,380 Q600,330 240,380 Z" fill="{TEAL}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    b += f'<path d="M260,380 Q600,280 940,380" fill="none" stroke="{INK}" stroke-width="6"/><path d="M420,350 Q600,190 780,350" fill="none" stroke="{INK}" stroke-width="14" stroke-linecap="round"/>'
    # items popping out
    b += f'<g transform="translate(420,300) rotate(-12)"><rect x="-26" y="-110" width="52" height="130" rx="18" fill="{BERRY}" stroke="{INK}" stroke-width="4"/><rect x="-18" y="-130" width="36" height="26" rx="6" fill="{INK}"/><rect x="-26" y="-60" width="52" height="24" fill="{WHITE}" opacity=".7"/></g>'
    b += f'<g transform="translate(560,260) rotate(8)"><rect x="-22" y="-80" width="44" height="100" rx="10" fill="{SUN}" stroke="{INK}" stroke-width="4"/><rect x="-14" y="-96" width="28" height="18" rx="4" fill="{TANG}" stroke="{INK}" stroke-width="3"/><circle cy="-30" r="12" fill="{TANG}"/></g>'
    b += f'<g transform="translate(700,290) rotate(14)"><rect x="-44" y="-60" width="88" height="70" rx="10" fill="{WHITE}" stroke="{INK}" stroke-width="4"/><path d="M-10,-25 h20 M0,-35 v20" stroke="{BERRY}" stroke-width="8" stroke-linecap="round"/></g>'
    b += f'<g transform="translate(820,330) rotate(22)"><rect x="-40" y="-40" width="80" height="60" rx="10" fill="{LIME}" stroke="{INK}" stroke-width="4"/><path d="M-40,-10 h80" stroke="{INK}" stroke-width="3" stroke-dasharray="6 6"/></g>'
    b += f'<g transform="translate(160,560)"><path d="M0,0 L0,-40 Q0,-70 40,-70 L90,-60 Q130,-50 150,-20 L150,0 Z" fill="{WHITE}" stroke="{INK}" stroke-width="5"/><path d="M0,-6 L150,-6" stroke="{TANG}" stroke-width="10"/><path d="M40,-60 l20,20 M60,-64 l18,20" stroke="{INK}" stroke-width="3"/></g>'
    b += f'<g transform="translate(1040,560)"><path d="M-50,0 Q-60,-60 -20,-80 L30,-80 Q60,-60 50,0 Z" fill="{PURP}" stroke="{INK}" stroke-width="5"/><text y="-30" text-anchor="middle" font-family="Arial" font-weight="700" font-size="22" fill="{WHITE}">SPF</text></g>'
    b += bag(1010, 470, TANG, -20) + wiffle(980, 520, 16) + f'<rect x="120" y="440" width="120" height="40" rx="14" fill="{SUN}" stroke="{INK}" stroke-width="4" transform="rotate(-8 180 460)"/>'
    b += sparkle(300, 180) + sparkle(900, 150, TANG, .8)
    return svg(W, H, "Packing a game-day bag", "An open sports bag with a water bottle, sunscreen, first-aid kit, snacks, knee pads and sneakers spilling out around it.", b, "#e7f4ff")


def a_captain():
    b = grass(W, H, 380) + f'<rect width="{W}" height="380" fill="{SKY}"/>' + sun(1080, 90, 44) + cloud(300, 60, .8)
    b += f'<ellipse cx="600" cy="610" rx="420" ry="60" fill="{GRASS2}" opacity=".6"/>'
    cols = [TANG, TANG, TANG, TANG, TANG]
    for i, (x, f) in enumerate([(330, False), (460, False), (740, True), (870, True)]):
        b += person(x, 620, 1.05, cols[i], i, i + 1, "cheer", flip=f, num=[4, 17, 9, 30][i])
    b += person(600, 640, 1.25, TANG, 1, 2, "cheer", num=1, extra=f'<rect x="-34" y="-150" width="14" height="18" rx="3" fill="{SUN}" stroke="{INK}" stroke-width="2"/><text x="-27" y="-136" text-anchor="middle" font-family="Arial" font-weight="900" font-size="13" fill="{INK}">C</text>')
    b += sparkle(600, 250, SUN, 1.6) + sparkle(470, 300, LIME) + sparkle(730, 300, TEAL)
    b += f'<g transform="translate(1040,560)"><rect x="-60" y="-80" width="120" height="150" rx="10" fill="{WOOD}" stroke="{INK}" stroke-width="4"/><rect x="-48" y="-64" width="96" height="120" fill="{WHITE}"/>'
    b += "".join(f'<path d="M-36,{-44 + i * 24} l10,10 l18,-18" fill="none" stroke="{GRASS2}" stroke-width="5" stroke-linecap="round"/><rect x="0" y="{-44 + i * 24}" width="36" height="6" rx="3" fill="{INK}" opacity=".4"/>' for i in range(4)) + '</g>'
    return svg(W, H, "Captain leads a team cheer", "A captain wearing an armband stands in the middle of a team huddle as everyone throws their arms up, next to a clipboard of ticked tasks.", b, SKY)


def a_warm():
    b = grass(W, H, 400) + f'<rect width="{W}" height="400" fill="#ffe3cc"/>' + sun(600, 150, 70)
    b += f'<path d="M0,400 Q300,330 600,390 T1200,370 L1200,400 Z" fill="{GRASS2}"/>'
    b += person(230, 620, 1.2, TEAL, 0, 0, "lunge", num=None)
    b += person(560, 620, 1.2, BERRY, 2, 2, "swing", num=None)
    b += person(900, 620, 1.2, PURP, 3, 4, "cheer", flip=True)
    b += cone(390, 640, .8) + cone(740, 640, .8, SUN) + cone(1060, 640, .8, TEAL)
    b += f'<g transform="translate(1040,200)"><circle r="70" fill="{WHITE}" stroke="{INK}" stroke-width="6"/><rect x="-12" y="-96" width="24" height="20" rx="4" fill="{INK}"/><path d="M0,0 L0,-50 M0,0 L34,20" stroke="{TANG}" stroke-width="7" stroke-linecap="round"/><circle r="7" fill="{INK}"/></g>'
    b += f'<path d="M620,540 q30,-20 60,0" fill="none" stroke="{INK}" stroke-width="4" stroke-dasharray="4 10" stroke-linecap="round"/>'
    return svg(W, H, "Warming up before a game", "Three players warm up on a grass field doing a walking lunge, a leg swing and an arm reach, with cones and a stopwatch nearby.", b, "#ffe3cc")


def hero():
    Wd, Hd = 1600, 900
    b = f'<rect width="{Wd}" height="{Hd}" fill="{SKY}"/>' + sun(1380, 150, 80) + cloud(160, 110, 1.2) + cloud(760, 70, .9)
    b += f'<path d="M0,560 Q400,470 800,540 T1600,520 L1600,900 L0,900 Z" fill="{GRASS2}"/><path d="M0,620 Q500,560 900,610 T1600,600 L1600,900 L0,900 Z" fill="{GRASS}"/>'
    b += bunting(0, 1600, 30, 18)
    b += board(260, 800, 1.1, TEAL) + bag(262, 700, TANG, 15)
    b += person(520, 850, 1.45, TANG, 0, 2, "throw", num=7)
    b += arc(620, 640, 900, 350, 1180, 520) + bag(880, 440, TANG, 30, 1.3)
    b += person(820, 830, 1.3, BERRY, 2, 1, "paddle", extra=paddle(60, -142, 30, SUN)) + wiffle(960, 600, 18)
    b += person(1080, 860, 1.4, TEAL, 1, 0, "kick", flip=True, num=12) + ball(1000, 800, 30, BERRY)
    b += person(1350, 840, 1.3, PURP, 3, 4, "cheer", flip=True, num=3)
    b += pin(1500, 860, .9) + pin(1540, 850, .8) + ball(1460, 850, 26, INK, False)
    b += sparkle(700, 250, SUN, 1.4) + sparkle(1180, 300, LIME, 1.2) + sparkle(420, 330, TEAL)
    return svg(Wd, Hd, "Toss Sports: adult rec sports for everyone", "A sunny park full of adults playing cornhole, pickleball, kickball and bowling, under bunting flags with a beanbag flying through the air.", b, SKY)


def og():
    b = f'<rect width="1200" height="630" fill="{INK}"/>' + sun(1060, 120, 60)
    b += f'<path d="M0,470 Q600,400 1200,470 L1200,630 L0,630 Z" fill="{GRASS}"/>'
    b += f'<text x="90" y="250" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="120" fill="{LIME}">Toss</text><text x="90" y="370" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="120" fill="{WHITE}">Sports</text>'
    b += f'<text x="94" y="430" font-family="Arial,sans-serif" font-weight="700" font-size="34" fill="{TEAL}">Rules, leagues and game-day know-how</text>'
    b += bag(760, 300, TANG, 25, 2.2) + arc(640, 420, 700, 200, 760, 300, WHITE) + ball(940, 520, 36, BERRY) + wiffle(1060, 540, 26) + pin(1130, 600, .9)
    return svg(1200, 630, "Toss Sports", "The Toss Sports name above a flying beanbag, a kickball, a pickleball and a bowling pin.", b, INK)


def logo():
    b = (f'<g transform="translate(40,40)"><circle r="32" fill="{TANG}" stroke="{INK}" stroke-width="4"/>'
         f'<path d="M-20,-8 Q0,10 20,-8" fill="none" stroke="{INK}" stroke-width="4"/><path d="M-16,12 Q0,26 16,12" fill="none" stroke="{INK}" stroke-width="4"/>'
         f'<path d="M-48,-26 l-18,-6 M-50,-6 l-22,0 M-48,14 l-18,6" stroke="{TEAL}" stroke-width="5" stroke-linecap="round"/></g>'
         f'<text x="86" y="54" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="40" fill="{INK}">Toss<tspan fill="{TANG}"> Sports</tspan></text>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -4 450 88" role="img" aria-labelledby="t"><title id="t">Toss Sports logo</title>{b}</svg>\n')


def notfound():
    b = grass(800, 500, 360) + board(560, 440, .8, TEAL) + bag(220, 430, TANG, -30) + arc(260, 380, 360, 120, 470, 240) + person(170, 470, 1, TANG, 0, 2, "overhand", flip=False)
    b += f'<text x="470" y="210" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="80" fill="{INK}">404</text>'
    return svg(800, 500, "Missed the board", "A beanbag sails past the cornhole board, missing completely.", b, SKY)


ARTICLE_SVGS = {
    "how-to-find-an-adult-rec-league": a_find, "cornhole-rules-and-scoring": a_cornhole,
    "kickball-rules-for-adult-leagues": a_kickball, "pickleball-rules-for-beginners": a_pickle,
    "how-bowling-scoring-works": a_bowling, "dodgeball-rules-explained": a_dodge,
    "flag-football-rules-for-beginners": a_flag, "how-to-start-a-rec-league": a_start,
    "how-to-pick-a-team-name": a_names, "joining-a-league-as-a-free-agent": a_free,
    "game-day-bag-checklist": a_bag, "how-to-be-a-good-rec-league-captain": a_captain,
    "warm-up-routine-for-weekend-athletes": a_warm,
}
