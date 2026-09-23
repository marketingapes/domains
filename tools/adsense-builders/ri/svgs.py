# Original SVG illustrations for Research Investigation.
INK = "#1b2440"; PAPER = "#fbf5e9"; MANILA = "#f3d58d"; RED = "#d9483b"
TEAL = "#1f8a80"; SKY = "#cfe6f2"; SUN = "#ffc94a"; PINK = "#f4a7a0"; LILAC = "#b9b3e6"
MINT = "#bfe6cf"; SKIN = "#f1c7a0"; SKIN2 = "#b97a52"; GREY = "#8a90a6"


def wrap(w, h, title, desc, body, bg=SKY):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" '
            f'aria-labelledby="t d"><title id="t">{title}</title><desc id="d">{desc}</desc>'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>\n')


def magnifier(x, y, r, angle=40, lens="#e8f6fb", rim=INK, handle=RED, inner=""):
    return (f'<g transform="translate({x} {y}) rotate({angle})">'
            f'<rect x="{r*0.85}" y="{-r*0.16}" width="{r*1.3}" height="{r*0.32}" rx="{r*0.14}" fill="{handle}" stroke="{INK}" stroke-width="{max(3,r*0.06)}"/>'
            f'<rect x="{r*0.9}" y="{-r*0.2}" width="{r*0.22}" height="{r*0.4}" rx="4" fill="{INK}"/>'
            f'<circle r="{r}" fill="{lens}" stroke="{rim}" stroke-width="{max(6,r*0.14)}"/>'
            f'<g transform="rotate({-angle})">{inner}</g>'
            f'<path d="M{-r*0.55} {-r*0.3} A{r*0.65} {r*0.65} 0 0 1 {-r*0.15} {-r*0.62}" stroke="#fff" stroke-width="{max(4,r*0.1)}" fill="none" stroke-linecap="round" opacity=".85"/>'
            f'</g>')


def star(x, y, r, fill=SUN, stroke=INK, sw=3):
    import math
    pts = []
    for i in range(10):
        a = math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append(f"{x + rr*math.cos(a):.1f},{y - rr*math.sin(a):.1f}")
    return f'<polygon points="{" ".join(pts)}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'


def stars(x, y, r, n, total=5, gap=None):
    gap = gap or r * 2.3
    return "".join(star(x + i*gap, y, r, SUN if i < n else "#fff") for i in range(total))


def lines(x, y, w, n, gap=18, color=GREY, sw=6, ragged=True):
    out = []
    for i in range(n):
        ww = w * (0.6 if (ragged and i == n-1) else (0.9 if i % 2 else 1))
        out.append(f'<line x1="{x}" y1="{y+i*gap}" x2="{x+ww:.0f}" y2="{y+i*gap}" stroke="{color}" stroke-width="{sw}" stroke-linecap="round"/>')
    return "".join(out)


def paper(x, y, w, h, n=5, fill="#fff", rot=0, extra=""):
    return (f'<g transform="rotate({rot} {x+w/2} {y+h/2})"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{INK}" stroke-width="5"/>'
            f'{lines(x+24, y+36, w-48, n, gap=max(16,(h-60)/max(n,1)))}{extra}</g>')


def check(x, y, s=1, color=TEAL):
    return f'<path d="M{x} {y} l{10*s} {10*s} l{20*s} {-22*s}" stroke="{color}" stroke-width="{7*s}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'


def cross(x, y, s=1, color=RED):
    return (f'<path d="M{x} {y} l{20*s} {20*s} M{x+20*s} {y} l{-20*s} {20*s}" stroke="{color}" stroke-width="{7*s}" stroke-linecap="round"/>')


def clipboard(x, y, w, h, items, rot=0):
    """items: list of 'y'/'n' marks"""
    rows = ""
    gap = (h - 80) / len(items)
    for i, it in enumerate(items):
        yy = y + 70 + i * gap
        rows += f'<rect x="{x+24}" y="{yy}" width="30" height="30" rx="6" fill="#fff" stroke="{INK}" stroke-width="4"/>'
        rows += check(x+29, yy+14, 0.8) if it == "y" else (cross(x+29, yy+6, 0.9) if it == "n" else "")
        rows += f'<line x1="{x+70}" y1="{yy+15}" x2="{x+w-30}" y2="{yy+15}" stroke="{GREY}" stroke-width="6" stroke-linecap="round"/>'
    return (f'<g transform="rotate({rot} {x+w/2} {y+h/2})"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="#b5835a" stroke="{INK}" stroke-width="5"/>'
            f'<rect x="{x+12}" y="{y+28}" width="{w-24}" height="{h-40}" rx="8" fill="#fff" stroke="{INK}" stroke-width="4"/>'
            f'<rect x="{x+w/2-45}" y="{y-12}" width="90" height="36" rx="10" fill="{GREY}" stroke="{INK}" stroke-width="5"/>{rows}</g>')


def person(x, y, s=1, coat=TEAL, skin=SKIN, hat=None, hair=INK, arm_up=False, face="smile", legs=INK):
    """Standing person, feet at (x,y), roughly 300*s tall."""
    k = lambda v: v * s
    hat_svg = ""
    if hat == "fedora":
        hat_svg = (f'<ellipse cx="0" cy="{k(-262)}" rx="{k(58)}" ry="{k(12)}" fill="{INK}"/>'
                   f'<path d="M{k(-36)} {k(-262)} Q{k(-34)} {k(-312)} 0 {k(-306)} Q{k(34)} {k(-312)} {k(36)} {k(-262)}Z" fill="{INK}"/>'
                   f'<rect x="{k(-36)}" y="{k(-276)}" width="{k(72)}" height="{k(10)}" fill="{RED}"/>')
    elif hat == "hardhat":
        hat_svg = (f'<path d="M{k(-44)} {k(-258)} Q{k(-44)} {k(-310)} 0 {k(-310)} Q{k(44)} {k(-310)} {k(44)} {k(-258)}Z" fill="{SUN}" stroke="{INK}" stroke-width="{k(5)}"/>'
                   f'<rect x="{k(-56)}" y="{k(-262)}" width="{k(112)}" height="{k(12)}" rx="{k(5)}" fill="{SUN}" stroke="{INK}" stroke-width="{k(5)}"/>')
    elif hat == "hair":
        hat_svg = f'<path d="M{k(-41)} {k(-240)} Q{k(-44)} {k(-292)} 0 {k(-290)} Q{k(44)} {k(-292)} {k(41)} {k(-240)} Q{k(10)} {k(-266)} {k(-41)} {k(-240)}Z" fill="{hair}"/>'
    elif hat == "long":
        hat_svg = f'<path d="M{k(-42)} {k(-190)} Q{k(-54)} {k(-300)} 0 {k(-298)} Q{k(54)} {k(-300)} {k(42)} {k(-190)} L{k(30)} {k(-240)} Q0 {k(-275)} {k(-30)} {k(-240)}Z" fill="{hair}"/>'
    mouth = (f'<path d="M{k(-12)} {k(-222)} Q0 {k(-210)} {k(12)} {k(-222)}" stroke="{INK}" stroke-width="{k(4)}" fill="none" stroke-linecap="round"/>' if face == "smile"
             else f'<ellipse cx="0" cy="{k(-218)}" rx="{k(7)}" ry="{k(9)}" fill="{INK}"/>' if face == "o"
             else f'<line x1="{k(-10)}" y1="{k(-219)}" x2="{k(10)}" y2="{k(-219)}" stroke="{INK}" stroke-width="{k(4)}" stroke-linecap="round"/>')
    arm_r = (f'<path d="M{k(34)} {k(-160)} Q{k(80)} {k(-190)} {k(84)} {k(-236)}" stroke="{coat}" stroke-width="{k(24)}" fill="none" stroke-linecap="round"/>'
             f'<circle cx="{k(84)}" cy="{k(-240)}" r="{k(13)}" fill="{skin}"/>') if arm_up else (
             f'<path d="M{k(34)} {k(-160)} Q{k(56)} {k(-110)} {k(52)} {k(-80)}" stroke="{coat}" stroke-width="{k(24)}" fill="none" stroke-linecap="round"/>'
             f'<circle cx="{k(52)}" cy="{k(-74)}" r="{k(13)}" fill="{skin}"/>')
    return (f'<g transform="translate({x} {y})">'
            f'<rect x="{k(-26)}" y="{k(-90)}" width="{k(20)}" height="{k(90)}" rx="{k(8)}" fill="{legs}"/>'
            f'<rect x="{k(6)}" y="{k(-90)}" width="{k(20)}" height="{k(90)}" rx="{k(8)}" fill="{legs}"/>'
            f'<ellipse cx="{k(-18)}" cy="0" rx="{k(20)}" ry="{k(8)}" fill="{INK}"/><ellipse cx="{k(18)}" cy="0" rx="{k(20)}" ry="{k(8)}" fill="{INK}"/>'
            f'<path d="M{k(-40)} {k(-80)} L{k(-34)} {k(-170)} Q0 {k(-190)} {k(34)} {k(-170)} L{k(40)} {k(-80)}Z" fill="{coat}" stroke="{INK}" stroke-width="{k(4)}"/>'
            f'<path d="M{k(-34)} {k(-160)} Q{k(-56)} {k(-110)} {k(-52)} {k(-80)}" stroke="{coat}" stroke-width="{k(24)}" fill="none" stroke-linecap="round"/>'
            f'<circle cx="{k(-52)}" cy="{k(-74)}" r="{k(13)}" fill="{skin}"/>{arm_r}'
            f'<rect x="{k(-10)}" y="{k(-196)}" width="{k(20)}" height="{k(22)}" fill="{skin}"/>'
            f'<circle cx="0" cy="{k(-236)}" r="{k(40)}" fill="{skin}" stroke="{INK}" stroke-width="{k(3)}"/>'
            f'<circle cx="{k(-14)}" cy="{k(-240)}" r="{k(5)}" fill="{INK}"/><circle cx="{k(14)}" cy="{k(-240)}" r="{k(5)}" fill="{INK}"/>'
            f'{mouth}{hat_svg}</g>')


def cloud(x, y, s=1, fill="#fff"):
    return (f'<g transform="translate({x} {y}) scale({s})" fill="{fill}"><ellipse cx="0" cy="0" rx="70" ry="30"/>'
            f'<ellipse cx="-40" cy="8" rx="46" ry="24"/><ellipse cx="44" cy="6" rx="50" ry="26"/><ellipse cx="6" cy="-20" rx="44" ry="30"/></g>')


def ground(w, h, y, color=MINT):
    return f'<path d="M0 {y} Q{w*0.25} {y-24} {w*0.5} {y} T{w} {y} V{h} H0Z" fill="{color}"/>'


def stamp(x, y, text, rot=-12, color=RED, size=34):
    w = len(text) * size * 0.72 + 30
    return (f'<g transform="rotate({rot} {x} {y})" opacity=".92"><rect x="{x-w/2}" y="{y-size*0.95}" width="{w}" height="{size*1.5}" rx="8" fill="none" stroke="{color}" stroke-width="6"/>'
            f'<text x="{x}" y="{y+size*0.12}" text-anchor="middle" font-family="Courier New, monospace" font-weight="700" font-size="{size}" fill="{color}" letter-spacing="3">{text}</text></g>')


def bubble(x, y, w, h, content="", fill="#fff", tail="left"):
    tx = x + 30 if tail == "left" else x + w - 30
    return (f'<g><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22" fill="{fill}" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M{tx-14} {y+h-2} L{tx - (20 if tail=="left" else -20)} {y+h+34} L{tx+14} {y+h-2}Z" fill="{fill}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
            f'<rect x="{tx-16}" y="{y+h-10}" width="32" height="10" fill="{fill}"/><g transform="translate({x} {y})">{content}</g></g>')


def house(x, y, w, h, wall=PINK, roof=RED, door=TEAL):
    return (f'<g><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{wall}" stroke="{INK}" stroke-width="6"/>'
            f'<path d="M{x-24} {y+4} L{x+w/2} {y-h*0.6} L{x+w+24} {y+4}Z" fill="{roof}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
            f'<rect x="{x+w*0.4}" y="{y+h*0.45}" width="{w*0.2}" height="{h*0.55}" fill="{door}" stroke="{INK}" stroke-width="5"/>'
            f'<rect x="{x+w*0.1}" y="{y+h*0.2}" width="{w*0.2}" height="{w*0.2}" fill="{SKY}" stroke="{INK}" stroke-width="5"/>'
            f'<rect x="{x+w*0.7}" y="{y+h*0.2}" width="{w*0.2}" height="{w*0.2}" fill="{SKY}" stroke="{INK}" stroke-width="5"/></g>')


# ---------------------------------------------------------------- scenes

def hero():
    W, H = 1600, 900
    b = ''
    b += f'<circle cx="1380" cy="170" r="90" fill="{SUN}"/>'
    b += cloud(260, 150, 1.3) + cloud(900, 110, 1) + cloud(1180, 300, 0.8)
    # town skyline
    b += f'<rect x="80" y="400" width="160" height="330" fill="{LILAC}" stroke="{INK}" stroke-width="6"/>'
    for r in range(4):
        for c in range(2):
            b += f'<rect x="{108+c*62}" y="{430+r*70}" width="40" height="44" fill="{SUN if (r+c)%3==0 else SKY}" stroke="{INK}" stroke-width="4"/>'
    b += house(290, 520, 220, 210, PINK, RED, TEAL)
    # shop
    b += f'<rect x="1150" y="470" width="330" height="260" fill="#fff" stroke="{INK}" stroke-width="6"/>'
    for i in range(6):
        b += f'<path d="M{1140+i*58} 470 h58 v40 a29 29 0 0 1 -58 0z" fill="{RED if i%2==0 else "#fff"}" stroke="{INK}" stroke-width="5"/>'
    b += f'<rect x="1180" y="560" width="150" height="110" fill="{SKY}" stroke="{INK}" stroke-width="5"/>'
    b += f'<rect x="1360" y="560" width="90" height="170" fill="{TEAL}" stroke="{INK}" stroke-width="5"/>'
    b += f'<rect x="1210" y="420" width="220" height="44" rx="10" fill="{INK}"/><text x="1320" y="451" text-anchor="middle" font-family="Georgia,serif" font-size="26" fill="{SUN}" font-weight="700">SUPER DEALS!!!</text>'
    b += ground(W, H, 730, MINT)
    # giant box on the ground being examined
    b += f'<g transform="translate(640 560)"><path d="M0 60 L130 0 L300 50 L170 110Z" fill="#e7b877" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    b += f'<path d="M0 60 L170 110 L170 260 L0 200Z" fill="{MANILA}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    b += f'<path d="M170 110 L300 50 L300 200 L170 260Z" fill="#e0b56c" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    b += f'<path d="M60 88 l0 140" stroke="{RED}" stroke-width="10"/>'
    b += f'<g transform="translate(230 120) rotate(-8)"><rect x="-10" y="0" width="120" height="60" rx="8" fill="#fff" stroke="{INK}" stroke-width="5"/><circle cx="4" cy="30" r="7" fill="{INK}"/><text x="58" y="41" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="28" fill="{RED}">$$?</text></g></g>'
    # floating review stars
    b += f'<g transform="translate(700 250)">{bubble(0,0,300,110, stars(50,56,22,5))}</g>'
    b += f'<g transform="translate(1000 330)">{bubble(0,0,200,80, stars(36,42,14,1), tail="right")}</g>'
    # detective with giant magnifier
    b += person(520, 790, 1.35, coat="#c98d4b", hat="fedora", arm_up=True, face="o")
    b += magnifier(760, 420, 110, 200, inner=stars(-70, 0, 18, 3, gap=36))
    # sidekick with clipboard
    b += person(1080, 800, 1.05, coat=TEAL, hat="long", hair="#6b3b2a", skin=SKIN2)
    b += clipboard(1110, 560, 150, 190, ["y", "n", "y", ""], rot=8)
    b += stamp(250, 820, "CHECK FIRST", -6, INK, 36)
    return wrap(W, H, "A detective examines a mystery box under a magnifying glass",
                "Illustrated town scene: a detective in a fedora holds a giant magnifying glass over a cardboard box with a question-mark price tag, next to a shop shouting super deals, while a partner ticks items on a clipboard.", b)


def og():
    W, H = 1200, 630
    b = f'<rect x="60" y="80" width="560" height="470" rx="22" fill="{MANILA}" stroke="{INK}" stroke-width="7"/>'
    b += f'<path d="M60 120 v-40 a22 22 0 0 1 22 -22 h170 l30 40 z" fill="{MANILA}" stroke="{INK}" stroke-width="7"/>'
    b += f'<text x="110" y="250" font-family="Georgia,serif" font-weight="700" font-size="64" fill="{INK}">Research</text>'
    b += f'<text x="110" y="330" font-family="Georgia,serif" font-weight="700" font-size="64" fill="{INK}">Investigation</text>'
    b += f'<text x="110" y="400" font-family="Courier New,monospace" font-weight="700" font-size="30" fill="{RED}">KNOW BEFORE YOU BUY</text>'
    b += stamp(470, 490, "CASE FILE", -10, RED, 30)
    b += magnifier(860, 300, 150, 35, inner=check(-45, 0, 3.2))
    b += star(1080, 110, 34) + star(700, 560, 24, "#fff")
    return wrap(W, H, "Research Investigation: know before you buy",
                "A manila case file labelled Research Investigation beside a large magnifying glass containing a check mark.", b, bg=SKY)


def logo():
    b = magnifier(40, 40, 26, 40, inner=check(-12, 0, 0.9))
    b += f'<text x="100" y="48" font-family="Georgia,serif" font-weight="700" font-size="31" textLength="330" lengthAdjust="spacingAndGlyphs" fill="{INK}">Research Investigation</text>'
    return wrap(440, 90, "Research Investigation logo", "A magnifying glass with a check mark, beside the words Research Investigation.", b, bg="none").replace('<rect width="440" height="90" fill="none"/>', '')


def a_reviews():
    W, H = 1200, 675
    b = ground(W, H, 600, MINT)
    # phone with review list
    b += f'<rect x="120" y="70" width="330" height="560" rx="40" fill="{INK}"/><rect x="140" y="110" width="290" height="480" rx="18" fill="#fff"/>'
    for i, n in enumerate([5, 3, 1, 4]):
        yy = 130 + i * 115
        b += f'<rect x="156" y="{yy}" width="258" height="100" rx="12" fill="{PAPER}" stroke="{INK}" stroke-width="3"/>'
        b += stars(180, yy + 26, 11, n, gap=26) + lines(172, yy + 55, 220, 3, gap=15, sw=5)
    # histogram board
    b += f'<rect x="560" y="90" width="340" height="300" rx="20" fill="#fff" stroke="{INK}" stroke-width="6"/>'
    for i, v in enumerate([230, 60, 40, 55, 120]):
        yy = 125 + i * 52
        b += star(600, yy + 16, 14) + f'<text x="620" y="{yy+26}" font-family="Georgia" font-size="26" font-weight="700" fill="{INK}">{5-i}</text>'
        b += f'<rect x="650" y="{yy}" width="{v}" height="32" rx="8" fill="{[TEAL,LILAC,LILAC,PINK,RED][i]}" stroke="{INK}" stroke-width="3"/>'
    b += magnifier(760, 300, 80, 30, inner=stars(-52, 0, 10, 3, gap=26))
    b += person(1020, 620, 1.25, coat="#c98d4b", hat="fedora", face="smile")
    b += bubble(930, 110, 200, 90, f'<text x="100" y="58" text-anchor="middle" font-family="Georgia" font-size="40" font-weight="700" fill="{INK}">Hmm…</text>', tail="right")
    return wrap(W, H, "Reading reviews critically", "A phone showing a mix of five-, three- and one-star reviews, a rating histogram with a magnifying glass over the three-star row, and a detective thinking hmm.", b)


def a_fake():
    W, H = 1200, 675
    b = ground(W, H, 590, MINT)
    b += f'<rect x="0" y="0" width="{W}" height="120" fill="{LILAC}" opacity=".5"/>'
    xs = [150, 330, 510, 690, 870]
    for i, x in enumerate(xs):
        b += person(x, 610, 0.95, coat=[PINK, SUN, PINK, SUN, PINK][i], hat="hair", face="smile")
        # identical signs
        b += f'<rect x="{x-75}" y="{250}" width="150" height="70" rx="10" fill="#fff" stroke="{INK}" stroke-width="5"/>' + stars(x - 56, 285, 11, 5, gap=28)
        b += f'<line x1="{x}" y1="320" x2="{x}" y2="330" stroke="{INK}" stroke-width="6"/>'
    # magnifier reveals robot face on middle one
    robot = (f'<rect x="-40" y="-38" width="80" height="70" rx="12" fill="{GREY}" stroke="{INK}" stroke-width="5"/>'
             f'<circle cx="-16" cy="-8" r="9" fill="{RED}"/><circle cx="16" cy="-8" r="9" fill="{RED}"/>'
             f'<rect x="-20" y="12" width="40" height="8" fill="{INK}"/><line x1="0" y1="-38" x2="0" y2="-56" stroke="{INK}" stroke-width="5"/><circle cx="0" cy="-60" r="7" fill="{SUN}"/>')
    b += magnifier(510, 370, 78, -30, lens="#e8f6fb", inner=robot)
    b += stamp(1040, 200, "COPY", 12, RED, 44) + stamp(1040, 320, "COPY", -8, RED, 44)
    b += f'<text x="1040" y="440" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="30" fill="{INK}">"Best ever!!!"</text>'
    b += f'<text x="1040" y="480" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="30" fill="{INK}">"Best ever!!!"</text>'
    return wrap(W, H, "Spotting fake reviews", "A line of identical smiling reviewers holding five-star signs; a magnifying glass over one reveals a robot face, next to COPY stamps and repeated 'Best ever' quotes.", b)


def a_contractor():
    W, H = 1200, 675
    b = f'<circle cx="1080" cy="100" r="60" fill="{SUN}"/>' + cloud(300, 90, 0.9)
    b += ground(W, H, 590, MINT)
    b += house(420, 330, 330, 260, PINK, RED, TEAL)
    # ladder
    b += f'<g stroke="{INK}" stroke-width="7" stroke-linecap="round"><line x1="760" y1="590" x2="700" y2="230"/><line x1="820" y1="590" x2="760" y2="230"/>'
    for i in range(7):
        yy = 560 - i * 50; b += f'<line x1="{760 - i*8.3}" y1="{yy}" x2="{820 - i*8.3}" y2="{yy}"/>'
    b += '</g>'
    b += person(930, 610, 1.1, coat=SUN, hat="hardhat", skin=SKIN2, face="smile")
    # toolbox
    b += f'<rect x="990" y="545" width="120" height="60" rx="8" fill="{RED}" stroke="{INK}" stroke-width="5"/><path d="M1025 545 v-20 h50 v20" fill="none" stroke="{INK}" stroke-width="6"/>'
    b += person(290, 620, 1.1, coat=TEAL, hat="long", hair="#6b3b2a", arm_up=True)
    b += clipboard(40, 180, 170, 230, ["y", "y", "n", ""], rot=-8)
    b += magnifier(390, 330, 44, 200)
    b += bubble(840, 180, 250, 90, f'<text x="105" y="58" text-anchor="middle" font-family="Georgia" font-size="28" font-weight="700" fill="{INK}">Licence?</text>' + check(180, 44, 1), tail="right")
    return wrap(W, H, "Vetting a contractor", "A homeowner with a clipboard checklist and magnifying glass meets a contractor in a hard hat beside a house with a ladder and a toolbox.", b)


def a_licenses():
    W, H = 1200, 675
    b = ground(W, H, 610, MINT)
    # license card
    b += f'<g transform="rotate(-6 380 330)"><rect x="140" y="180" width="480" height="300" rx="24" fill="#fff" stroke="{INK}" stroke-width="7"/>'
    b += f'<rect x="140" y="180" width="480" height="60" rx="24" fill="{TEAL}"/><rect x="140" y="215" width="480" height="25" fill="{TEAL}"/>'
    b += f'<text x="380" y="222" text-anchor="middle" font-family="Courier New" font-weight="700" font-size="28" fill="#fff">LICENSE</text>'
    b += f'<rect x="170" y="270" width="120" height="150" rx="10" fill="{SKY}" stroke="{INK}" stroke-width="4"/><circle cx="230" cy="325" r="30" fill="{SKIN}"/><path d="M185 420 q45 -70 90 0z" fill="{TEAL}"/>'
    b += lines(320, 290, 250, 5, gap=28) + f'<circle cx="560" cy="430" r="34" fill="{SUN}" stroke="{INK}" stroke-width="5"/>{star(560,430,18,RED,INK,2)}</g>'
    # umbrella = insurance
    b += f'<g transform="translate(840 240)"><path d="M-170 0 A170 150 0 0 1 170 0 Q127 -24 85 0 Q42 -24 0 0 Q-42 -24 -85 0 Q-127 -24 -170 0Z" fill="{RED}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    b += f'<path d="M0 -150 V0" stroke="{INK}" stroke-width="4"/><path d="M0 0 V230 q0 30 -30 30 q-26 0 -26 -26" stroke="{INK}" stroke-width="9" fill="none" stroke-linecap="round"/></g>'
    b += f'<g transform="translate(840 390)"><path d="M0 -70 L70 -45 V10 Q70 70 0 100 Q-70 70 -70 10 V-45Z" fill="{MINT}" stroke="{INK}" stroke-width="6"/>{check(-28,10,1.6)}</g>'
    b += magnifier(560, 470, 70, 30, inner=lines(-40, -10, 80, 2, gap=20))
    b += stamp(1010, 590, "VERIFIED", -6, TEAL, 34)
    return wrap(W, H, "Checking licences and insurance", "A contractor licence card with a gold seal under a magnifying glass, next to a red umbrella and a shield with a check mark representing insurance cover.", b)


def a_landlord():
    W, H = 1200, 675
    b = cloud(900, 90, 1) + ground(W, H, 600, MINT)
    b += f'<rect x="120" y="170" width="300" height="430" fill="{LILAC}" stroke="{INK}" stroke-width="6"/>'
    for r in range(5):
        for c in range(3):
            b += f'<rect x="{145+c*92}" y="{195+r*72}" width="64" height="48" fill="{SUN if (r*3+c)%4==0 else SKY}" stroke="{INK}" stroke-width="4"/>'
    b += f'<rect x="235" y="540" width="70" height="60" fill="{TEAL}" stroke="{INK}" stroke-width="5"/>'
    # listing card with mask
    b += f'<g transform="rotate(5 700 300)"><rect x="520" y="120" width="360" height="330" rx="20" fill="#fff" stroke="{INK}" stroke-width="6"/>'
    b += f'<rect x="545" y="145" width="310" height="150" rx="10" fill="{SKY}"/>' + house(640, 210, 120, 80, PINK, RED, TEAL)
    b += f'<text x="700" y="345" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="40" fill="{RED}">$ way too low!</text>'
    b += lines(560, 385, 280, 3, gap=20) + '</g>'
    b += f'<g transform="translate(870 140)"><path d="M-60 0 Q0 -30 60 0 Q60 40 20 44 Q0 30 -20 44 Q-60 40 -60 0Z" fill="{INK}"/><ellipse cx="-26" cy="10" rx="14" ry="9" fill="#fff"/><ellipse cx="26" cy="10" rx="14" ry="9" fill="#fff"/></g>'
    # key
    b += f'<g transform="translate(560 540) rotate(-20)"><circle r="34" fill="{SUN}" stroke="{INK}" stroke-width="6"/><circle r="12" fill="{MINT}" stroke="{INK}" stroke-width="4"/><rect x="30" y="-10" width="120" height="20" fill="{SUN}" stroke="{INK}" stroke-width="5"/><rect x="120" y="8" width="14" height="22" fill="{SUN}" stroke="{INK}" stroke-width="4"/><rect x="95" y="8" width="14" height="16" fill="{SUN}" stroke="{INK}" stroke-width="4"/></g>'
    b += person(1030, 620, 1.1, coat="#c98d4b", hat="fedora", arm_up=True, face="o")
    b += magnifier(1110, 330, 60, 210)
    return wrap(W, H, "Researching a landlord and rental listing", "An apartment block beside a rental listing with a suspiciously low price and a masked figure peeking out, a set of keys, and a detective examining it through a magnifying glass.", b)


def a_store():
    W, H = 1200, 675
    b = ground(W, H, 620, MINT)
    b += f'<rect x="110" y="80" width="760" height="500" rx="24" fill="#fff" stroke="{INK}" stroke-width="7"/>'
    b += f'<rect x="110" y="80" width="760" height="70" rx="24" fill="{LILAC}"/><rect x="110" y="120" width="760" height="30" fill="{LILAC}"/>'
    b += "".join(f'<circle cx="{150+i*34}" cy="115" r="11" fill="{c}" stroke="{INK}" stroke-width="3"/>' for i, c in enumerate([RED, SUN, MINT]))
    b += f'<rect x="270" y="96" width="560" height="40" rx="20" fill="#fff" stroke="{INK}" stroke-width="4"/>'
    b += f'<text x="300" y="124" font-family="Courier New" font-weight="700" font-size="22" fill="{INK}">https://brand-name-0ffical-sale.shop</text>'
    # product tiles
    for i in range(3):
        x = 150 + i * 235
        b += f'<rect x="{x}" y="190" width="205" height="250" rx="14" fill="{PAPER}" stroke="{INK}" stroke-width="4"/>'
        b += f'<circle cx="{x+102}" cy="280" r="55" fill="{[PINK,SKY,SUN][i]}" stroke="{INK}" stroke-width="4"/>'
        b += f'<rect x="{x+30}" y="370" width="145" height="40" rx="8" fill="{RED}"/><text x="{x+102}" y="398" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="22" fill="#fff">-90% TODAY</text>'
    b += f'<rect x="150" y="470" width="680" height="80" rx="12" fill="{SKY}"/>' + lines(180, 500, 600, 2, gap=24)
    # hook on sale tag
    b += f'<path d="M1020 0 V260 q0 60 -50 60 q-50 0 -50 -50" stroke="{INK}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M920 270 l-18 22 l30 4z" fill="{INK}"/>'
    b += magnifier(560, 118, 70, 20, inner=f'<text x="0" y="8" text-anchor="middle" font-family="Courier New" font-weight="700" font-size="24" fill="{RED}">0ffical</text>')
    b += person(1060, 640, 1.05, coat=TEAL, hat="hair", face="o", arm_up=True)
    return wrap(W, H, "Is this online store legit?", "A browser window for a shop with a misspelled web address and ninety-percent-off tiles, a fishing hook dangling nearby, and a magnifying glass over the address bar.", b)


def a_secondhand():
    W, H = 1200, 675
    b = f'<circle cx="1090" cy="100" r="55" fill="{SUN}"/>' + ground(W, H, 590, "#e6d8b8")
    # cafe building
    b += f'<rect x="60" y="230" width="360" height="360" fill="#fff" stroke="{INK}" stroke-width="6"/>'
    for i in range(6):
        b += f'<path d="M{50+i*64} 230 h64 v40 a32 32 0 0 1 -64 0z" fill="{TEAL if i%2==0 else "#fff"}" stroke="{INK}" stroke-width="5"/>'
    b += f'<rect x="90" y="330" width="170" height="130" fill="{SKY}" stroke="{INK}" stroke-width="5"/><rect x="290" y="330" width="100" height="260" fill="{RED}" stroke="{INK}" stroke-width="5"/>'
    b += f'<text x="240" y="215" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="34" fill="{INK}">CAFE · busy &amp; bright</text>'
    # bike
    b += f'<g stroke="{INK}" stroke-width="8" fill="none"><circle cx="640" cy="540" r="50"/><circle cx="800" cy="540" r="50"/><path d="M640 540 L700 460 L780 460 L800 540 M700 460 L720 540 L780 460 M690 445 h30 M780 460 l-10 -30 h30" stroke-linejoin="round"/></g>'
    b += person(520, 610, 1.05, coat=PINK, hat="long", hair="#6b3b2a", arm_up=False, face="smile")
    b += person(930, 610, 1.05, coat=SUN, hat="hair", skin=SKIN2, face="smile")
    # phone chat
    b += f'<g transform="translate(980 110) rotate(8)"><rect width="170" height="300" rx="24" fill="{INK}"/><rect x="12" y="30" width="146" height="250" rx="10" fill="#fff"/>'
    b += f'<rect x="22" y="50" width="100" height="36" rx="12" fill="{SKY}"/><rect x="48" y="100" width="100" height="36" rx="12" fill="{MINT}"/><rect x="22" y="150" width="110" height="36" rx="12" fill="{SKY}"/><rect x="40" y="200" width="108" height="50" rx="12" fill="{MINT}"/></g>'
    b += bubble(560, 130, 290, 110, f'<text x="145" y="50" text-anchor="middle" font-family="Georgia" font-size="26" font-weight="700" fill="{INK}">Can I check the</text><text x="145" y="84" text-anchor="middle" font-family="Georgia" font-size="26" font-weight="700" fill="{INK}">serial number?</text>')
    return wrap(W, H, "Buying second-hand safely", "Two people meet outside a busy cafe to inspect a used bicycle; one asks to check the serial number, and a phone shows their chat history.", b)


def a_company():
    W, H = 1200, 675
    b = ground(W, H, 610, MINT)
    b += f'<rect x="80" y="110" width="280" height="500" fill="{SKY}" stroke="{INK}" stroke-width="6"/>'
    for r in range(6):
        for c in range(3):
            b += f'<rect x="{105+c*85}" y="{135+r*72}" width="60" height="48" fill="#fff" stroke="{INK}" stroke-width="4"/>'
    b += f'<rect x="160" y="80" width="120" height="34" fill="{INK}"/><text x="220" y="104" text-anchor="middle" font-family="Courier New" font-weight="700" font-size="20" fill="{SUN}">ACME INC</text>'
    # filing cabinet
    b += f'<rect x="470" y="250" width="240" height="360" rx="10" fill="{GREY}" stroke="{INK}" stroke-width="6"/>'
    for i in range(3):
        b += f'<rect x="490" y="{270+i*112}" width="200" height="96" rx="8" fill="#c7cbd8" stroke="{INK}" stroke-width="4"/><rect x="565" y="{300+i*112}" width="50" height="14" rx="6" fill="{INK}"/>'
    # open drawer with folders
    b += f'<path d="M455 250 L725 250 L760 180 L420 180Z" fill="#c7cbd8" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
    for i, c in enumerate([MANILA, PINK, MANILA, MINT]):
        b += f'<rect x="{460+i*62}" y="{110+(i%2)*14}" width="80" height="90" rx="6" fill="{c}" stroke="{INK}" stroke-width="4" transform="rotate({-6+i*4} {500+i*62} 150)"/>'
    b += magnifier(900, 250, 90, 150, inner=f'<text x="0" y="-6" text-anchor="middle" font-family="Courier New" font-weight="700" font-size="22" fill="{INK}">COMPLAINTS</text><text x="0" y="24" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="30" fill="{RED}">x 37</text>')
    # gavel
    b += f'<g transform="translate(950 520) rotate(-30)"><rect x="-70" y="-26" width="140" height="52" rx="10" fill="#8a5a3c" stroke="{INK}" stroke-width="5"/><rect x="-10" y="26" width="20" height="120" rx="8" fill="#b5835a" stroke="{INK}" stroke-width="5"/></g>'
    b += f'<rect x="870" y="600" width="170" height="24" rx="6" fill="#8a5a3c" stroke="{INK}" stroke-width="4"/>'
    return wrap(W, H, "Researching a company", "An office tower labelled ACME, an open filing cabinet overflowing with folders, a magnifying glass reading 'complaints', and a judge's gavel.", b)


def a_recalls():
    W, H = 1200, 675
    b = f'<rect x="0" y="0" width="{W}" height="{H}" fill="{PAPER}"/>'
    # shelves
    for i in range(3):
        y = 220 + i * 160
        b += f'<rect x="80" y="{y}" width="700" height="18" fill="#b5835a" stroke="{INK}" stroke-width="4"/>'
    # products shelf 1: boxes/jars
    items = [(120, 110, PINK), (250, 150, SKY), (410, 120, MINT), (560, 170, SUN)]
    for x, w, c in items:
        b += f'<rect x="{x}" y="{220-110}" width="{w-30}" height="110" rx="8" fill="{c}" stroke="{INK}" stroke-width="4"/>'
    # shelf 2: toy car & teddy
    b += f'<g transform="translate(140 330)"><rect x="0" y="20" width="160" height="40" rx="16" fill="{RED}" stroke="{INK}" stroke-width="4"/><path d="M30 20 q20 -40 60 -40 q30 0 44 40z" fill="{RED}" stroke="{INK}" stroke-width="4"/><circle cx="40" cy="62" r="18" fill="{INK}"/><circle cx="125" cy="62" r="18" fill="{INK}"/></g>'
    b += f'<g transform="translate(470 300)"><circle cx="0" cy="40" r="44" fill="#c98d4b" stroke="{INK}" stroke-width="4"/><circle cx="0" cy="-20" r="32" fill="#c98d4b" stroke="{INK}" stroke-width="4"/><circle cx="-26" cy="-46" r="12" fill="#c98d4b" stroke="{INK}" stroke-width="4"/><circle cx="26" cy="-46" r="12" fill="#c98d4b" stroke="{INK}" stroke-width="4"/><circle cx="-10" cy="-24" r="4" fill="{INK}"/><circle cx="10" cy="-24" r="4" fill="{INK}"/></g>'
    b += f'<g transform="translate(640 300)"><rect x="-40" y="-40" width="80" height="120" rx="12" fill="{SKY}" stroke="{INK}" stroke-width="4"/><rect x="-20" y="-58" width="40" height="22" fill="{GREY}" stroke="{INK}" stroke-width="4"/></g>'
    # shelf 3: stroller
    b += f'<g transform="translate(260 490)" stroke="{INK}" stroke-width="6" fill="none"><path d="M0 0 h140 a70 70 0 0 1 -140 0z" fill="{LILAC}"/><path d="M140 0 l40 -60"/><circle cx="20" cy="80" r="18" fill="{INK}"/><circle cx="130" cy="80" r="18" fill="{INK}"/></g>'
    # warning triangle on toy car
    b += f'<g transform="translate(230 250)"><path d="M0 -50 L48 36 H-48Z" fill="{SUN}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><rect x="-5" y="-18" width="10" height="30" rx="4" fill="{INK}"/><circle cx="0" cy="24" r="6" fill="{INK}"/></g>'
    # recall notice board
    b += f'<rect x="850" y="90" width="280" height="380" rx="16" fill="#fff" stroke="{INK}" stroke-width="6"/><rect x="850" y="90" width="280" height="70" rx="16" fill="{RED}"/><rect x="850" y="130" width="280" height="30" fill="{RED}"/>'
    b += f'<text x="990" y="140" text-anchor="middle" font-family="Courier New" font-weight="700" font-size="36" fill="#fff">RECALL</text>' + lines(880, 200, 220, 6, gap=34)
    b += person(990, 660, 0.95, coat=TEAL, hat="hair", hair="#6b3b2a", face="o")
    b += magnifier(760, 520, 60, 200)
    return wrap(W, H, "Checking product recalls", "Store shelves holding a toy car with a yellow warning triangle, a teddy bear, a baby bottle and a stroller, beside a red recall notice board and a shopper reading it.", b)


def a_warranty():
    W, H = 1200, 675
    b = f'<rect width="{W}" height="{H}" fill="{LILAC}" opacity=".35"/>' + ground(W, H, 620, MINT)
    # long receipt curling
    b += f'<path d="M150 60 H400 V480 Q400 560 330 560 Q260 560 260 620 H150Z" fill="#fff" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    b += lines(180, 110, 190, 10, gap=34, sw=5)
    b += f'<path d="M150 60 l20 -14 l20 14 l20 -14 l20 14 l20 -14 l20 14 l20 -14 l20 14 l20 -14 l20 14 l20 -14 l20 14" fill="none" stroke="{INK}" stroke-width="5"/>'
    # tiny print magnified
    b += magnifier(360, 330, 95, 40, inner=f'<text x="0" y="-18" text-anchor="middle" font-family="Georgia" font-size="19" fill="{INK}">Returns within</text><text x="0" y="10" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="26" fill="{RED}">14 days</text><text x="0" y="36" text-anchor="middle" font-family="Georgia" font-size="17" fill="{INK}">unopened only*</text>')
    # box
    b += f'<g transform="translate(640 380)"><path d="M0 60 L120 0 L280 50 L160 110Z" fill="#e7b877" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><path d="M0 60 L160 110 L160 240 L0 190Z" fill="{MANILA}" stroke="{INK}" stroke-width="6"/><path d="M160 110 L280 50 L280 180 L160 240Z" fill="#e0b56c" stroke="{INK}" stroke-width="6"/></g>'
    # calendar
    b += f'<g transform="translate(860 80)"><rect width="250" height="230" rx="16" fill="#fff" stroke="{INK}" stroke-width="6"/><rect width="250" height="56" rx="16" fill="{TEAL}"/><rect y="30" width="250" height="26" fill="{TEAL}"/>'
    for r in range(4):
        for c in range(5):
            b += f'<rect x="{20+c*44}" y="{72+r*38}" width="32" height="26" rx="5" fill="{PAPER}" stroke="{INK}" stroke-width="2"/>'
    b += f'<circle cx="168" cy="161" r="26" fill="none" stroke="{RED}" stroke-width="6"/></g>'
    b += stamp(990, 370, "WARRANTY", 8, TEAL, 30)
    return wrap(W, H, "Warranties and return policies", "A long curling receipt with fine print magnified to read 'returns within 14 days, unopened only', a cardboard box and a calendar with a date circled in red.", b)


def a_car():
    W, H = 1200, 675
    b = f'<circle cx="1070" cy="100" r="55" fill="{SUN}"/>' + cloud(250, 100, 0.9)
    b += f'<rect x="0" y="540" width="{W}" height="135" fill="{GREY}"/>' + "".join(f'<rect x="{40+i*160}" y="600" width="90" height="12" fill="#fff"/>' for i in range(8))
    # car
    b += f'<g transform="translate(180 330)"><path d="M0 160 V110 Q0 80 40 76 L130 66 L200 10 Q220 0 250 0 H420 Q450 0 470 20 L530 76 L600 86 Q640 92 640 130 V160Z" fill="{TEAL}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
    b += f'<path d="M215 70 L260 24 H330 V70Z M350 70 V24 H440 L490 70Z" fill="{SKY}" stroke="{INK}" stroke-width="5"/>'
    b += f'<path d="M0 90 L-40 -10 L120 60" fill="{TEAL}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    b += f'<circle cx="130" cy="170" r="52" fill="{INK}"/><circle cx="130" cy="170" r="22" fill="{GREY}"/><circle cx="510" cy="170" r="52" fill="{INK}"/><circle cx="510" cy="170" r="22" fill="{GREY}"/></g>'
    # VIN plate magnified
    b += magnifier(420, 250, 95, 150, inner=f'<rect x="-78" y="-26" width="156" height="52" rx="6" fill="#fff" stroke="{INK}" stroke-width="3"/><text x="0" y="9" text-anchor="middle" font-family="Courier New" font-weight="700" font-size="21" fill="{INK}">VIN 1HG…</text>')
    b += clipboard(890, 170, 190, 280, ["y", "y", "n", "y"], rot=6)
    b += stamp(990, 500, "HISTORY", -5, RED, 30)
    return wrap(W, H, "Checking a used car's history", "A teal used car with its hood raised on a road, a magnifying glass over the vehicle identification number, and a clipboard of history checks.", b)


def a_pay():
    W, H = 1200, 675
    b = ground(W, H, 610, MINT)
    # credit card with shield
    b += f'<g transform="rotate(-8 300 300)"><rect x="100" y="180" width="400" height="250" rx="26" fill="{TEAL}" stroke="{INK}" stroke-width="7"/><rect x="100" y="230" width="400" height="44" fill="{INK}"/>'
    b += f'<rect x="140" y="300" width="70" height="52" rx="8" fill="{SUN}" stroke="{INK}" stroke-width="4"/>' + lines(140, 390, 240, 1, color="#fff", sw=8, ragged=False) + '</g>'
    b += f'<g transform="translate(470 200)"><path d="M0 -80 L80 -52 V10 Q80 80 0 112 Q-80 80 -80 10 V-52Z" fill="{MINT}" stroke="{INK}" stroke-width="7"/>{check(-34,12,2)}</g>'
    # gift cards fanned with warning
    for i, c in enumerate([PINK, SUN, LILAC]):
        b += f'<rect x="{620+i*40}" y="{330-i*20}" width="200" height="130" rx="16" fill="{c}" stroke="{INK}" stroke-width="5" transform="rotate({-10+i*10} {720+i*40} {395-i*20})"/>'
    b += f'<g transform="translate(900 280)"><path d="M0 -60 L56 40 H-56Z" fill="{SUN}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><rect x="-6" y="-24" width="12" height="36" rx="4" fill="{INK}"/><circle cx="0" cy="26" r="7" fill="{INK}"/></g>'
    # money flying to hooded figure
    for i in range(3):
        b += f'<g transform="translate({960+i*40} {150-i*30}) rotate({-15+i*10})"><rect width="80" height="44" rx="6" fill="{MINT}" stroke="{INK}" stroke-width="4"/><circle cx="40" cy="22" r="11" fill="none" stroke="{INK}" stroke-width="3"/></g>'
    b += f'<g transform="translate(1110 610)"><path d="M-60 0 Q-66 -150 0 -180 Q66 -150 60 0Z" fill="{INK}"/><circle cx="0" cy="-200" r="46" fill="{INK}"/><ellipse cx="-14" cy="-198" rx="8" ry="5" fill="{SUN}"/><ellipse cx="14" cy="-198" rx="8" ry="5" fill="{SUN}"/></g>'
    b += f'<path d="M760 120 q120 -70 220 0" stroke="{RED}" stroke-width="7" fill="none" stroke-dasharray="14 10"/>'
    b += stamp(300, 560, "PROTECTED", -4, TEAL, 32)
    return wrap(W, H, "The safest ways to pay", "A credit card beside a green shield with a check mark, contrasted with fanned gift cards under a warning triangle and cash flying towards a hooded scammer.", b)


ARTICLE_SVGS = {
    "read-reviews-critically": a_reviews,
    "spot-fake-reviews": a_fake,
    "vet-a-contractor": a_contractor,
    "check-licenses-and-insurance": a_licenses,
    "research-a-landlord": a_landlord,
    "is-this-online-store-legit": a_store,
    "buy-secondhand-safely": a_secondhand,
    "research-a-company": a_company,
    "check-product-recalls": a_recalls,
    "warranties-and-return-policies": a_warranty,
    "used-car-history-check": a_car,
    "safest-ways-to-pay": a_pay,
}
