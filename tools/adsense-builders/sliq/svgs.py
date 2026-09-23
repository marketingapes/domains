"""Original SVG illustrations for Smart Life Insurance Quote."""

INK = "#0d3b3e"
TEAL = "#2ec4b6"
DEEP = "#13807a"
MINT = "#d9f5f1"
CORAL = "#ff7a59"
SUN = "#ffc857"
CREAM = "#fff8ef"
LILAC = "#b9b3ea"
SKY = "#e6f7fb"
SKIN = ["#f2c7a5", "#c68b62", "#8d5a3b", "#f6d3b8", "#a86f4c"]


def wrap(w, h, title, desc, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" '
            f'aria-labelledby="t d"><title id="t">{title}</title><desc id="d">{desc}</desc>'
            f'{body}</svg>\n')


def person(x, y, s=1.0, skin=SKIN[0], shirt=CORAL, hair=INK, pants=INK, arms="down", smile=True):
    """Simple friendly character; (x, y) is the feet baseline centre."""
    g = [f'<g transform="translate({x} {y}) scale({s})">']
    # legs
    g.append(f'<rect x="-22" y="-70" width="16" height="70" rx="8" fill="{pants}"/>')
    g.append(f'<rect x="6" y="-70" width="16" height="70" rx="8" fill="{pants}"/>')
    g.append(f'<ellipse cx="-14" cy="0" rx="14" ry="6" fill="{INK}"/><ellipse cx="14" cy="0" rx="14" ry="6" fill="{INK}"/>')
    # arms
    if arms == "up":
        g.append(f'<path d="M-30 -130 L-58 -185" stroke="{shirt}" stroke-width="16" stroke-linecap="round"/>')
        g.append(f'<path d="M30 -130 L58 -185" stroke="{shirt}" stroke-width="16" stroke-linecap="round"/>')
        g.append(f'<circle cx="-60" cy="-190" r="9" fill="{skin}"/><circle cx="60" cy="-190" r="9" fill="{skin}"/>')
    elif arms == "wave":
        g.append(f'<path d="M-30 -130 L-44 -80" stroke="{shirt}" stroke-width="16" stroke-linecap="round"/>')
        g.append(f'<path d="M30 -130 L62 -175" stroke="{shirt}" stroke-width="16" stroke-linecap="round"/>')
        g.append(f'<circle cx="-45" cy="-74" r="9" fill="{skin}"/><circle cx="64" cy="-181" r="9" fill="{skin}"/>')
    elif arms == "hold":
        g.append(f'<path d="M-30 -130 L-44 -100 L-10 -95" stroke="{shirt}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
        g.append(f'<path d="M30 -130 L44 -100 L10 -95" stroke="{shirt}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
    else:
        g.append(f'<path d="M-30 -130 L-42 -78" stroke="{shirt}" stroke-width="16" stroke-linecap="round"/>')
        g.append(f'<path d="M30 -130 L42 -78" stroke="{shirt}" stroke-width="16" stroke-linecap="round"/>')
        g.append(f'<circle cx="-43" cy="-72" r="9" fill="{skin}"/><circle cx="43" cy="-72" r="9" fill="{skin}"/>')
    # torso
    g.append(f'<rect x="-32" y="-145" width="64" height="85" rx="26" fill="{shirt}"/>')
    # head
    g.append(f'<circle cx="0" cy="-178" r="30" fill="{skin}"/>')
    g.append(f'<path d="M-31 -182 C-30 -215 30 -218 31 -184 C20 -198 -10 -200 -31 -182Z" fill="{hair}"/>')
    g.append(f'<circle cx="-10" cy="-178" r="3.5" fill="{INK}"/><circle cx="10" cy="-178" r="3.5" fill="{INK}"/>')
    if smile:
        g.append(f'<path d="M-10 -165 Q0 -156 10 -165" stroke="{INK}" stroke-width="3" fill="none" stroke-linecap="round"/>')
    g.append(f'<circle cx="-18" cy="-167" r="4" fill="{CORAL}" opacity=".35"/><circle cx="18" cy="-167" r="4" fill="{CORAL}" opacity=".35"/>')
    g.append('</g>')
    return "".join(g)


def cloud(x, y, s=1.0):
    return (f'<g transform="translate({x} {y}) scale({s})" fill="#fff">'
            '<ellipse cx="0" cy="0" rx="60" ry="26"/><ellipse cx="-34" cy="8" rx="36" ry="20"/>'
            '<ellipse cx="36" cy="8" rx="40" ry="20"/><ellipse cx="6" cy="-18" rx="34" ry="24"/></g>')


def sun(x, y, r=46):
    rays = "".join(
        f'<rect x="-4" y="{-r-30}" width="8" height="18" rx="4" fill="{SUN}" transform="rotate({a})"/>'
        for a in range(0, 360, 30))
    return f'<g transform="translate({x} {y})">{rays}<circle r="{r}" fill="{SUN}"/></g>'


def umbrella(x, y, s=1.0, canopy=TEAL, stripe=DEEP, stick=170):
    return (f'<g transform="translate({x} {y}) scale({s})">'
            f'<path d="M0 0 L0 {stick} Q0 {stick+26} -24 {stick+26} Q-44 {stick+26} -44 {stick+6}" stroke="{INK}" stroke-width="10" fill="none" stroke-linecap="round"/>'
            f'<path d="M-170 0 Q-170 -150 0 -150 Q170 -150 170 0 Q142 -24 113 0 Q85 -24 57 0 Q28 -24 0 0 Q-28 -24 -57 0 Q-85 -24 -113 0 Q-142 -24 -170 0Z" fill="{canopy}"/>'
            f'<path d="M-57 0 Q-60 -110 0 -150 Q-20 -80 -57 0Z M57 0 Q60 -110 0 -150 Q20 -80 57 0Z" fill="{stripe}" opacity=".55"/>'
            f'<circle cx="0" cy="-156" r="9" fill="{INK}"/></g>')


def bg(w, h, sky=SKY, ground=MINT, gy=None):
    gy = gy or int(h * 0.78)
    return (f'<rect width="{w}" height="{h}" fill="{sky}"/>'
            f'<path d="M0 {gy} Q{w*0.25} {gy-40} {w*0.5} {gy} T{w} {gy} V{h} H0Z" fill="{ground}"/>')


def house(x, y, s=1.0, wall=CREAM, roof=CORAL):
    return (f'<g transform="translate({x} {y}) scale({s})">'
            f'<rect x="-80" y="-110" width="160" height="110" fill="{wall}" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M-100 -105 L0 -185 L100 -105Z" fill="{roof}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
            f'<rect x="-20" y="-60" width="40" height="60" fill="{TEAL}" stroke="{INK}" stroke-width="4"/>'
            f'<rect x="-66" y="-88" width="34" height="30" fill="{SKY}" stroke="{INK}" stroke-width="4"/>'
            f'<rect x="32" y="-88" width="34" height="30" fill="{SKY}" stroke="{INK}" stroke-width="4"/></g>')


def doc(x, y, w=110, h=140, fill="#fff", lines=4, rot=0, check=False):
    ls = "".join(f'<rect x="16" y="{30+i*22}" width="{w-32 - (i%2)*20}" height="8" rx="4" fill="{MINT}"/>' for i in range(lines))
    ck = (f'<circle cx="{w-22}" cy="{h-24}" r="16" fill="{TEAL}"/><path d="M{w-30} {h-24} l6 7 l12 -14" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' if check else "")
    return (f'<g transform="translate({x} {y}) rotate({rot})"><rect width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{INK}" stroke-width="4"/>'
            f'<rect x="16" y="12" width="{w*0.45}" height="10" rx="5" fill="{INK}"/>{ls}{ck}</g>')


def heart(x, y, s=1.0, c=CORAL):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0 12 C-30 -10 -18 -34 0 -20 C18 -34 30 -10 0 12Z" fill="{c}"/>'


# --------------------------------------------------------------------------- brand art

def hero():
    b = [bg(1600, 900, sky="#dff4f7", ground="#bfeee6", gy=700)]
    b.append(sun(1380, 150, 70))
    b.append(cloud(260, 150, 1.3) + cloud(980, 110, 1.0) + cloud(640, 230, .7))
    b.append('<path d="M0 760 Q400 640 800 740 T1600 720 V900 H0Z" fill="#9fe3d8"/>')
    b.append(house(1310, 700, 1.25))
    b.append(f'<rect x="1440" y="560" width="16" height="140" fill="{INK}"/><circle cx="1448" cy="540" r="54" fill="{DEEP}"/><circle cx="1418" cy="575" r="36" fill="{TEAL}"/>')
    # big umbrella over family
    b.append(umbrella(640, 330, 2.1, stick=95))
    b.append(person(470, 730, 1.35, SKIN[1], CORAL, INK, arms="wave"))
    b.append(person(640, 730, 1.45, SKIN[0], LILAC, "#6b3d2e"))
    b.append(person(790, 730, .95, SKIN[3], SUN, "#b0552f", arms="up"))
    # dog
    b.append(f'<g transform="translate(900 700)"><ellipse cx="0" cy="0" rx="46" ry="26" fill="#c98b5a"/>'
             f'<circle cx="46" cy="-22" r="24" fill="#c98b5a"/><ellipse cx="56" cy="-40" rx="9" ry="16" fill="{INK}" transform="rotate(25 56 -40)"/>'
             f'<circle cx="54" cy="-24" r="3.5" fill="{INK}"/><circle cx="70" cy="-16" r="5" fill="{INK}"/>'
             f'<rect x="-34" y="10" width="12" height="28" rx="6" fill="#c98b5a"/><rect x="20" y="10" width="12" height="28" rx="6" fill="#c98b5a"/>'
             f'<path d="M-44 -6 Q-70 -30 -60 -46" stroke="#c98b5a" stroke-width="10" fill="none" stroke-linecap="round"/></g>')
    # floating quote cards / paper planes
    b.append(doc(1030, 250, 120, 150, rot=-10, check=True))
    b.append(f'<g transform="translate(160 420) rotate(-12)"><path d="M0 0 L120 30 L20 50Z" fill="#fff" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/><path d="M20 50 L40 30 L120 30" stroke="{INK}" stroke-width="4" fill="none"/></g>')
    b.append('<path d="M290 420 Q360 380 420 400" stroke="#0d3b3e" stroke-width="3" stroke-dasharray="8 10" fill="none"/>')
    b.append(heart(1200, 420, 1.6) + heart(250, 600, 1.1, SUN) + heart(1080, 520, .9, TEAL))
    # rain drops bouncing off umbrella
    for i, (x, y) in enumerate([(330, 120), (420, 70), (540, 40), (760, 50), (870, 100), (940, 160)]):
        b.append(f'<path d="M{x} {y} q-8 14 0 20 q8 -6 0 -20z" fill="#7cc7e0"/>')
    return wrap(1600, 900, "A family sheltered under a big teal umbrella",
                "Two adults, a child and a dog stand under a giant umbrella on a green hill while light rain bounces off; a house, a sunny sky and a checked-off quote sheet sit nearby.", "".join(b))


def og():
    b = [f'<rect width="1200" height="630" fill="{INK}"/>',
         f'<circle cx="1040" cy="120" r="190" fill="{DEEP}"/>',
         f'<circle cx="160" cy="600" r="160" fill="{DEEP}" opacity=".6"/>',
         umbrella(930, 330, 1.35, canopy=TEAL),
         heart(930, 300, 1.4, SUN),
         f'<text x="80" y="250" font-family="Georgia, serif" font-size="70" font-weight="700" fill="#fff">Smart Life</text>',
         f'<text x="80" y="335" font-family="Georgia, serif" font-size="70" font-weight="700" fill="{SUN}">Insurance Quote</text>',
         f'<text x="80" y="410" font-family="Arial, sans-serif" font-size="30" fill="{MINT}">Life insurance, explained plainly.</text>',
         f'<rect x="80" y="450" width="220" height="10" rx="5" fill="{CORAL}"/>']
    return wrap(1200, 630, "Smart Life Insurance Quote", "Share card with the brand name beside a teal umbrella and a yellow heart.", "".join(b))


def logo():
    b = [f'<circle cx="32" cy="32" r="30" fill="{INK}"/>',
         f'<path d="M10 34 Q10 12 32 12 Q54 12 54 34 Q48 29 43 34 Q37 29 32 34 Q27 29 21 34 Q15 29 10 34Z" fill="{TEAL}"/>',
         f'<path d="M32 34 V48 Q32 53 27 53" stroke="{SUN}" stroke-width="4" fill="none" stroke-linecap="round"/>',
         heart(32, 25, .38, SUN)]
    return wrap(64, 64, "Smart Life Insurance Quote logo", "A teal umbrella with a small yellow heart inside a dark circle.", "".join(b))


# --------------------------------------------------------------------------- article art (1200x675)

def a_term_whole():
    b = [bg(1200, 675)]
    b.append(sun(1080, 100, 40) + cloud(200, 90) + cloud(640, 70, .7))
    # fork in the road
    b.append(f'<path d="M600 675 L560 520 Q540 470 380 430 L120 380 L150 360 L400 405 Q575 440 600 480 Q625 440 800 405 L1050 360 L1080 380 L820 430 Q660 470 640 520 L600 675Z" fill="#f3e3c8"/>')
    # signpost
    b.append(f'<rect x="590" y="330" width="20" height="220" fill="{INK}"/>')
    b.append(f'<path d="M420 330 H585 V380 H420 L395 355Z" fill="{CORAL}" stroke="{INK}" stroke-width="4"/>')
    b.append(f'<path d="M615 330 H780 L805 355 L780 380 H615Z" fill="{TEAL}" stroke="{INK}" stroke-width="4"/>')
    b.append(f'<text x="500" y="364" text-anchor="middle" font-family="Arial" font-weight="700" font-size="24" fill="#fff">TERM</text>')
    b.append(f'<text x="700" y="364" text-anchor="middle" font-family="Arial" font-weight="700" font-size="24" fill="{INK}">WHOLE</text>')
    # left: hourglass + calendar
    b.append(f'<g transform="translate(230 250)"><rect x="-60" y="-10" width="120" height="16" rx="6" fill="{INK}"/><rect x="-60" y="180" width="120" height="16" rx="6" fill="{INK}"/>'
             f'<path d="M-45 6 H45 Q45 70 6 93 Q45 116 45 180 H-45 Q-45 116 -6 93 Q-45 70 -45 6Z" fill="#fff" stroke="{INK}" stroke-width="5"/>'
             f'<path d="M-30 30 H30 Q25 70 0 86 Q-25 70 -30 30Z" fill="{SUN}"/><path d="M-34 176 Q0 130 34 176Z" fill="{SUN}"/><rect x="-2" y="90" width="4" height="60" fill="{SUN}"/></g>')
    # right: tree with piggy bank
    b.append(f'<rect x="950" y="230" width="30" height="200" fill="#8a5a3b"/>'
             f'<circle cx="965" cy="200" r="95" fill="{DEEP}"/><circle cx="900" cy="240" r="60" fill="{TEAL}"/><circle cx="1035" cy="235" r="62" fill="{TEAL}"/>')
    b.append(f'<g transform="translate(1040 470)"><ellipse cx="0" cy="0" rx="62" ry="46" fill="#f7a8b8" stroke="{INK}" stroke-width="4"/>'
             f'<circle cx="58" cy="-6" r="16" fill="#f7a8b8" stroke="{INK}" stroke-width="4"/><rect x="-18" y="-50" width="36" height="8" rx="4" fill="{INK}"/>'
             f'<circle cx="20" cy="-14" r="4" fill="{INK}"/><rect x="-40" y="36" width="14" height="22" fill="#f7a8b8" stroke="{INK}" stroke-width="4"/><rect x="24" y="36" width="14" height="22" fill="#f7a8b8" stroke="{INK}" stroke-width="4"/>'
             f'<circle cx="0" cy="-80" r="16" fill="{SUN}" stroke="{INK}" stroke-width="4"/></g>')
    b.append(person(600, 660, .95, SKIN[2], LILAC, INK, arms="wave"))
    return wrap(1200, 675, "A person at a fork in the road between term and whole life",
                "A signpost points left to TERM, marked by an hourglass, and right to WHOLE, marked by a tree and a piggy bank.", "".join(b))


def a_universal():
    b = [bg(1200, 675, sky="#efeafd", ground="#dcd6fb")]
    b.append(cloud(180, 100, .8) + cloud(1000, 80, .9))
    # mixing desk with sliders
    b.append(f'<rect x="280" y="300" width="640" height="260" rx="28" fill="{INK}"/>')
    labels = [("PREMIUM", 0.35), ("COVER", 0.6), ("CASH VALUE", 0.45)]
    for i, (lab, pos) in enumerate(labels):
        cx = 400 + i * 200
        b.append(f'<rect x="{cx-8}" y="340" width="16" height="160" rx="8" fill="#285e61"/>')
        ky = 340 + (1 - pos) * 160
        b.append(f'<rect x="{cx-34}" y="{ky-14}" width="68" height="28" rx="10" fill="{[CORAL, TEAL, SUN][i]}" stroke="#fff" stroke-width="3"/>')
        b.append(f'<text x="{cx}" y="535" text-anchor="middle" font-family="Arial" font-weight="700" font-size="20" fill="#fff">{lab}</text>')
    # gauge
    b.append(f'<g transform="translate(600 220)"><path d="M-110 0 A110 110 0 0 1 110 0" stroke="#fff" stroke-width="26" fill="none"/>'
             f'<path d="M-110 0 A110 110 0 0 1 -40 -102" stroke="{CORAL}" stroke-width="26" fill="none"/>'
             f'<path d="M-40 -102 A110 110 0 0 1 60 -92" stroke="{SUN}" stroke-width="26" fill="none"/>'
             f'<path d="M60 -92 A110 110 0 0 1 110 0" stroke="{TEAL}" stroke-width="26" fill="none"/>'
             f'<path d="M0 0 L50 -70" stroke="{INK}" stroke-width="8" stroke-linecap="round"/><circle r="14" fill="{INK}"/></g>')
    b.append(person(170, 620, 1.0, SKIN[4], TEAL, "#3b2a20", arms="up"))
    # coin jar
    b.append(f'<g transform="translate(1040 600)"><rect x="-70" y="-170" width="140" height="170" rx="24" fill="#fff" opacity=".85" stroke="{INK}" stroke-width="5"/>'
             f'<rect x="-78" y="-190" width="156" height="26" rx="8" fill="{INK}"/>'
             + "".join(f'<ellipse cx="{-35 + (j%3)*35}" cy="{-24 - (j//3)*24}" rx="28" ry="10" fill="{SUN}" stroke="{INK}" stroke-width="3"/>' for j in range(9)) + '</g>')
    return wrap(1200, 675, "Adjusting the sliders on a universal life policy",
                "A person reaches up beside a control desk whose three sliders are labelled premium, cover and cash value, under a gauge, next to a jar of coins.", "".join(b))


def a_how_much():
    b = [bg(1200, 675, sky="#fff4e0", ground="#ffe2b8")]
    b.append(sun(1080, 110, 44) + cloud(240, 110, .8))
    cols = [("D", CORAL, "Debt"), ("I", TEAL, "Income"), ("M", LILAC, "Mortgage"), ("E", SUN, "Education")]
    heights = [110, 260, 200, 140]
    base = 560
    for i, ((L, c, word), hgt) in enumerate(zip(cols, heights)):
        x = 360 + i * 150
        b.append(f'<rect x="{x}" y="{base-hgt}" width="120" height="{hgt}" rx="14" fill="{c}" stroke="{INK}" stroke-width="5"/>')
        b.append(f'<text x="{x+60}" y="{base-hgt+64}" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="54" fill="{INK}">{L}</text>')
        b.append(f'<text x="{x+60}" y="{base+34}" text-anchor="middle" font-family="Arial" font-weight="700" font-size="20" fill="{INK}">{word}</text>')
    # tape measure
    b.append(f'<g transform="translate(250 560)"><rect x="-40" y="-300" width="30" height="300" fill="{SUN}" stroke="{INK}" stroke-width="4"/>'
             + "".join(f'<rect x="-40" y="{-300 + k*30}" width="14" height="4" fill="{INK}"/>' for k in range(10)) +
             f'<circle cx="-25" cy="10" r="40" fill="{CORAL}" stroke="{INK}" stroke-width="5"/><circle cx="-25" cy="10" r="12" fill="{INK}"/></g>')
    b.append(person(1000, 640, 1.0, SKIN[0], DEEP, "#6b3d2e", arms="wave"))
    b.append(f'<path d="M360 250 Q600 120 960 230" stroke="{INK}" stroke-width="4" stroke-dasharray="10 12" fill="none"/>')
    b.append(heart(600, 150, 1.4))
    return wrap(1200, 675, "Measuring how much life insurance you need with DIME",
                "Four coloured blocks labelled Debt, Income, Mortgage and Education stand at different heights next to a big tape measure and a waving person.", "".join(b))


def a_riders():
    b = [f'<rect width="1200" height="675" fill="#fff1ea"/>',
         '<path d="M0 520 H1200 V675 H0Z" fill="#f6d6c8"/>']
    # pizza
    b.append(f'<g transform="translate(560 360)"><circle r="230" fill="#f0b86a" stroke="{INK}" stroke-width="6"/><circle r="195" fill="{SUN}"/>'
             + "".join(f'<path d="M0 0 L{230*__import__("math").cos(a*3.14159/3):.0f} {230*__import__("math").sin(a*3.14159/3):.0f}" stroke="{INK}" stroke-width="4"/>' for a in range(6)) + '</g>')
    # toppings: heart, shield, rattle, calendar, clock
    b.append(heart(470, 280, 1.3))
    b.append(f'<path d="M640 240 L690 258 V300 Q690 335 640 355 Q590 335 590 300 V258Z" fill="{TEAL}" stroke="{INK}" stroke-width="4"/>')
    b.append(f'<g transform="translate(480 440)"><circle r="26" fill="{LILAC}" stroke="{INK}" stroke-width="4"/><rect x="18" y="14" width="46" height="12" rx="6" fill="{LILAC}" stroke="{INK}" stroke-width="4" transform="rotate(35)"/></g>')
    b.append(f'<g transform="translate(640 420)"><rect x="-36" y="-30" width="72" height="66" rx="8" fill="#fff" stroke="{INK}" stroke-width="4"/><rect x="-36" y="-30" width="72" height="18" fill="{CORAL}" stroke="{INK}" stroke-width="4"/>'
             f'<path d="M-18 8 l12 12 l24 -26" stroke="{DEEP}" stroke-width="6" fill="none" stroke-linecap="round"/></g>')
    b.append(f'<g transform="translate(560 350)"><circle r="30" fill="#fff" stroke="{INK}" stroke-width="4"/><path d="M0 -18 V0 L14 10" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/></g>')
    # chef
    b.append(person(960, 620, 1.1, SKIN[1], "#fff", INK, arms="wave", pants=DEEP))
    b.append(f'<g transform="translate(960 405)"><rect x="-26" y="-30" width="52" height="34" fill="#fff" stroke="{INK}" stroke-width="4"/><circle cx="-20" cy="-40" r="18" fill="#fff" stroke="{INK}" stroke-width="4"/><circle cx="0" cy="-50" r="20" fill="#fff" stroke="{INK}" stroke-width="4"/><circle cx="20" cy="-40" r="18" fill="#fff" stroke="{INK}" stroke-width="4"/></g>')
    b.append(f'<rect x="140" y="170" width="170" height="200" rx="14" fill="#fff" stroke="{INK}" stroke-width="4"/><text x="225" y="210" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="26" fill="{INK}">Toppings</text>'
             + "".join(f'<rect x="165" y="{235+k*30}" width="{110 - k*12}" height="10" rx="5" fill="{[CORAL, TEAL, LILAC, SUN][k]}"/>' for k in range(4)))
    return wrap(1200, 675, "A pizza with rider toppings", "A cheerful chef stands beside a pizza whose toppings are small icons: a heart, a shield, a baby rattle, a calendar and a clock, representing optional riders.", "".join(b))


def a_beneficiaries():
    b = [bg(1200, 675, sky="#eaf8f2", ground="#c7eedd")]
    b.append(cloud(1000, 90, .9) + sun(160, 110, 40))
    # tree
    b.append(f'<path d="M600 560 V330 M600 420 L460 300 M600 400 L760 290 M600 340 L600 230" stroke="#8a5a3b" stroke-width="22" stroke-linecap="round" fill="none"/>')
    b.append(f'<circle cx="600" cy="220" r="150" fill="{TEAL}" opacity=".35"/>')
    for (x, y, c, sk) in [(460, 290, CORAL, SKIN[0]), (760, 280, SUN, SKIN[2]), (600, 200, LILAC, SKIN[1]), (380, 200, TEAL, SKIN[3]), (820, 190, CORAL, SKIN[4])]:
        b.append(f'<circle cx="{x}" cy="{y}" r="44" fill="{c}" stroke="{INK}" stroke-width="4"/><circle cx="{x}" cy="{y-8}" r="18" fill="{sk}"/><path d="M{x-24} {y+30} Q{x} {y+2} {x+24} {y+30}" fill="{sk}"/>')
    b.append(f'<path d="M380 244 L440 270 M820 234 L780 262" stroke="#8a5a3b" stroke-width="8"/>')
    # gift box being handed
    b.append(person(260, 640, 1.0, SKIN[1], DEEP, INK, arms="hold"))
    b.append(f'<g transform="translate(260 575)"><rect x="-40" y="-40" width="80" height="60" fill="{CORAL}" stroke="{INK}" stroke-width="4"/><rect x="-6" y="-40" width="12" height="60" fill="{SUN}"/><path d="M0 -40 Q-30 -70 -20 -40 M0 -40 Q30 -70 20 -40" stroke="{SUN}" stroke-width="7" fill="none"/></g>')
    # name tags
    b.append(f'<g transform="translate(900 470) rotate(-6)"><rect width="200" height="110" rx="14" fill="#fff" stroke="{INK}" stroke-width="4"/>'
             f'<text x="20" y="42" font-family="Arial" font-weight="700" font-size="22" fill="{INK}">Primary</text><rect x="20" y="56" width="150" height="10" rx="5" fill="{TEAL}"/>'
             f'<text x="20" y="92" font-family="Arial" font-size="18" fill="{INK}">Contingent</text></g>')
    return wrap(1200, 675, "A family tree with a gift being handed on",
                "A family tree whose branches hold portraits of relatives, a person holding a wrapped gift and a name tag marked primary and contingent.", "".join(b))


def a_medical_exam():
    b = [f'<rect width="1200" height="675" fill="#eef7fb"/>', '<rect y="520" width="1200" height="155" fill="#d6ecf3"/>']
    # window & clock
    b.append(f'<rect x="80" y="80" width="220" height="170" rx="10" fill="{SKY}" stroke="{INK}" stroke-width="5"/><path d="M190 80 V250 M80 165 H300" stroke="{INK}" stroke-width="5"/>' + cloud(150, 130, .45))
    b.append(f'<g transform="translate(1060 140)"><circle r="60" fill="#fff" stroke="{INK}" stroke-width="6"/><path d="M0 -38 V0 L28 16" stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round"/></g>')
    # chair + seated applicant
    b.append(f'<rect x="380" y="430" width="170" height="24" rx="10" fill="{DEEP}"/><rect x="520" y="300" width="24" height="150" rx="10" fill="{DEEP}"/><rect x="392" y="450" width="14" height="80" fill="{INK}"/><rect x="524" y="450" width="14" height="80" fill="{INK}"/>')
    b.append(f'<g transform="translate(460 430)"><rect x="-30" y="-120" width="64" height="100" rx="24" fill="{SUN}"/><circle cx="0" cy="-150" r="30" fill="{SKIN[2]}"/>'
             f'<path d="M-31 -154 C-30 -186 30 -190 31 -156 C20 -170 -10 -172 -31 -154Z" fill="{INK}"/><circle cx="-10" cy="-150" r="3.5" fill="{INK}"/><circle cx="10" cy="-150" r="3.5" fill="{INK}"/>'
             f'<path d="M-10 -137 Q0 -129 10 -137" stroke="{INK}" stroke-width="3" fill="none"/><rect x="-10" y="-20" width="90" height="18" rx="9" fill="{INK}"/><rect x="60" y="-20" width="18" height="100" rx="9" fill="{INK}"/>'
             f'<path d="M-30 -95 L-90 -60" stroke="{SUN}" stroke-width="16" stroke-linecap="round"/><rect x="-108" y="-84" width="44" height="30" rx="6" fill="{CORAL}" stroke="{INK}" stroke-width="3"/></g>')
    # examiner
    b.append(person(740, 600, 1.05, SKIN[0], "#fff", "#6b3d2e", arms="hold", pants=TEAL))
    b.append(doc(705, 470, 72, 90, lines=2, check=True))
    # table with cup, tubes
    b.append(f'<rect x="880" y="420" width="240" height="18" rx="6" fill="{INK}"/><rect x="900" y="438" width="14" height="100" fill="{INK}"/><rect x="1086" y="438" width="14" height="100" fill="{INK}"/>')
    b.append(f'<path d="M915 350 H965 L958 420 H922Z" fill="#fff" stroke="{INK}" stroke-width="4"/><rect x="920" y="370" width="40" height="30" fill="#8fd3f0" opacity=".7"/>')
    for k, c in enumerate([CORAL, LILAC, SUN]):
        b.append(f'<rect x="{1000+k*30}" y="340" width="18" height="80" rx="9" fill="#fff" stroke="{INK}" stroke-width="3"/><rect x="{1000+k*30}" y="340" width="18" height="18" rx="4" fill="{c}"/>')
    # scale
    b.append(f'<rect x="230" y="560" width="120" height="30" rx="10" fill="#fff" stroke="{INK}" stroke-width="4"/><circle cx="290" cy="575" r="8" fill="{TEAL}"/>')
    return wrap(1200, 675, "A relaxed paramedical exam at home", "A seated person has their blood pressure taken while an examiner holds a clipboard; a glass of water, sample tubes, a scale and a wall clock are nearby.", "".join(b))


def a_underwriting():
    b = [f'<rect width="1200" height="675" fill="#f4f1ff"/>', '<rect y="540" width="1200" height="135" fill="#e2dcfb"/>']
    # staircase of rating classes
    classes = ["Preferred+", "Preferred", "Standard+", "Standard", "Table"]
    for i, c in enumerate(classes):
        x = 620 + i * 110
        top = 220 + i * 60
        b.append(f'<rect x="{x}" y="{top}" width="110" height="{540-top}" fill="{[TEAL, "#5fd3c8", SUN, "#ffb070", CORAL][i]}" stroke="{INK}" stroke-width="4"/>')
        b.append(f'<text x="{x+55}" y="{top+34}" text-anchor="middle" font-family="Arial" font-weight="700" font-size="17" fill="{INK}">{c}</text>')
    # folders
    b.append(f'<g transform="translate(140 300)"><path d="M0 0 H90 L110 20 H260 V220 H0Z" fill="{SUN}" stroke="{INK}" stroke-width="5"/></g>')
    b.append(doc(170, 250, 200, 230, lines=6, rot=-4))
    # magnifier
    b.append(f'<g transform="translate(370 330)"><circle r="90" fill="#fff" fill-opacity=".45" stroke="{INK}" stroke-width="14"/><rect x="58" y="58" width="30" height="120" rx="12" fill="{INK}" transform="rotate(-45 58 58)"/>'
             f'{heart(0, 0, 1.3)}</g>')
    b.append(cloud(1000, 110, .8) + cloud(420, 90, .6))
    b.append(person(560, 620, .9, SKIN[3], LILAC, INK, arms="wave"))
    return wrap(1200, 675, "Underwriting: a magnifying glass and a staircase of rating classes",
                "A large magnifying glass hovers over an application file while a staircase of steps is labelled Preferred Plus, Preferred, Standard Plus, Standard and Table.", "".join(b))


def a_compare():
    b = [bg(1200, 675, sky="#fff6ea", ground="#ffe5c6")]
    # balance scale
    b.append(f'<rect x="590" y="200" width="20" height="340" fill="{INK}"/><path d="M520 560 H680 L650 530 H550Z" fill="{INK}"/>')
    b.append(f'<path d="M360 220 H840" stroke="{INK}" stroke-width="12" stroke-linecap="round"/><circle cx="600" cy="210" r="18" fill="{SUN}" stroke="{INK}" stroke-width="4"/>')
    for x in (360, 840):
        b.append(f'<path d="M{x} 220 L{x-70} 360 M{x} 220 L{x+70} 360" stroke="{INK}" stroke-width="4"/><path d="M{x-90} 360 H{x+90} Q{x+80} 410 {x} 410 Q{x-80} 410 {x-90} 360Z" fill="{TEAL}" stroke="{INK}" stroke-width="4"/>')
    b.append(doc(310, 250, 90, 110, lines=3, rot=-6))
    b.append(doc(800, 250, 90, 110, lines=3, rot=6))
    # checklist
    b.append(f'<g transform="translate(80 150)"><rect width="200" height="260" rx="16" fill="#fff" stroke="{INK}" stroke-width="5"/>'
             + "".join(f'<rect x="22" y="{40+k*52}" width="26" height="26" rx="6" fill="{MINT}" stroke="{INK}" stroke-width="3"/><path d="M27 {53+k*52} l6 7 l12 -14" stroke="{DEEP}" stroke-width="4" fill="none"/><rect x="62" y="{48+k*52}" width="{110-k*8}" height="10" rx="5" fill="{LILAC}"/>' for k in range(4)) + '</g>')
    b.append(person(1020, 640, 1.0, SKIN[4], CORAL, INK, arms="wave"))
    b.append(f'<g transform="translate(1085 452)"><rect x="-6" y="-60" width="12" height="60" fill="{INK}"/><circle cy="-66" r="16" fill="{SUN}" stroke="{INK}" stroke-width="4"/></g>')
    return wrap(1200, 675, "Comparing two life insurance quotes on a balance scale",
                "Two quote sheets sit on either side of a balance scale beside a comparison checklist and a person ready to weigh the details.", "".join(b))


def a_life_stages():
    b = [bg(1200, 675, sky="#e8f6ff", ground="#cdeedd", gy=560)]
    b.append(f'<path d="M-20 600 C200 420 360 640 560 470 S900 330 1220 420" stroke="#f3e3c8" stroke-width="70" fill="none" stroke-linecap="round"/>')
    b.append(f'<path d="M-20 600 C200 420 360 640 560 470 S900 330 1220 420" stroke="#fff" stroke-width="6" stroke-dasharray="20 22" fill="none"/>')
    pins = [(130, 500, "grad"), (360, 540, "rings"), (560, 460, "stroller"), (820, 380, "house"), (1070, 390, "chair")]
    for x, y, kind in pins:
        b.append(f'<path d="M{x} {y} L{x} {y-90}" stroke="{INK}" stroke-width="5"/><circle cx="{x}" cy="{y-130}" r="46" fill="#fff" stroke="{INK}" stroke-width="5"/>')
        cy = y - 130
        if kind == "grad":
            b.append(f'<path d="M{x-32} {cy-4} L{x} {cy-20} L{x+32} {cy-4} L{x} {cy+12}Z" fill="{INK}"/><path d="M{x+26} {cy-2} V{cy+20}" stroke="{SUN}" stroke-width="4"/>')
        elif kind == "rings":
            b.append(f'<circle cx="{x-12}" cy="{cy+4}" r="16" fill="none" stroke="{SUN}" stroke-width="7"/><circle cx="{x+12}" cy="{cy+4}" r="16" fill="none" stroke="{SUN}" stroke-width="7"/>')
        elif kind == "stroller":
            b.append(f'<path d="M{x-28} {cy-18} H{x+18} A22 22 0 0 1 {x-28} {cy+8}Z" fill="{CORAL}"/><circle cx="{x-18}" cy="{cy+20}" r="8" fill="{INK}"/><circle cx="{x+12}" cy="{cy+20}" r="8" fill="{INK}"/><path d="M{x+18} {cy-18} L{x+30} {cy-30}" stroke="{INK}" stroke-width="4"/>')
        elif kind == "house":
            b.append(f'<path d="M{x-26} {cy+22} V{cy-2} L{x} {cy-24} L{x+26} {cy-2} V{cy+22}Z" fill="{TEAL}" stroke="{INK}" stroke-width="3"/><rect x="{x-7}" y="{cy+6}" width="14" height="16" fill="{INK}"/>')
        else:
            b.append(f'<path d="M{x-20} {cy-26} V{cy+10} H{x+20} M{x-20} {cy+10} L{x-26} {cy+26} M{x+20} {cy+10} L{x+26} {cy+26} M{x-34} {cy+28} Q{x} {cy+40} {x+34} {cy+28}" stroke="{LILAC}" stroke-width="7" fill="none" stroke-linecap="round"/>')
    b.append(sun(1080, 110, 44) + cloud(300, 120, .9) + cloud(720, 90, .7))
    b.append(person(250, 660, .75, SKIN[1], TEAL, INK, arms="wave"))
    return wrap(1200, 675, "A winding road through life's milestones",
                "A path winds past signposts showing a graduation cap, wedding rings, a stroller, a house and a rocking chair.", "".join(b))


def a_stay_home():
    b = [f'<rect width="1200" height="675" fill="#fff5ef"/>', f'<rect y="530" width="1200" height="145" fill="#f4dccd"/>']
    b.append(f'<rect x="90" y="90" width="260" height="190" rx="12" fill="#fff" stroke="{INK}" stroke-width="5"/>'
             + "".join(f'<rect x="{110+(k%7)*34}" y="{130+(k//7)*34}" width="26" height="26" rx="4" fill="{[MINT, SUN, LILAC, "#ffd0c2"][k%4]}"/>' for k in range(28))
             + f'<rect x="90" y="90" width="260" height="30" rx="12" fill="{CORAL}"/>')
    # juggling items arc
    b.append(f'<path d="M430 300 Q600 60 770 300" stroke="{INK}" stroke-width="3" stroke-dasharray="8 10" fill="none"/>')
    b.append(f'<g transform="translate(460 220)"><path d="M-40 0 H40 V30 Q40 50 20 50 H-20 Q-40 50 -40 30Z" fill="{INK}"/><rect x="40" y="6" width="30" height="8" rx="4" fill="{INK}"/></g>')
    b.append(f'<g transform="translate(600 130)"><rect x="-30" y="-30" width="60" height="60" rx="10" fill="{SUN}" stroke="{INK}" stroke-width="4"/><text y="12" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="34" fill="{INK}">A</text></g>')
    b.append(f'<g transform="translate(740 220)"><path d="M-44 -10 H44 L34 40 H-34Z" fill="{LILAC}" stroke="{INK}" stroke-width="4"/><path d="M-30 -10 Q-10 -30 10 -14 Q26 -30 34 -10" fill="#fff" stroke="{INK}" stroke-width="3"/></g>')
    b.append(heart(600, 260, 1.2))
    b.append(person(600, 620, 1.15, SKIN[3], TEAL, "#7a3e22", arms="up"))
    b.append(person(820, 620, .65, SKIN[3], CORAL, "#7a3e22", arms="wave"))
    b.append(f'<g transform="translate(1030 530)"><rect x="-70" y="-120" width="140" height="120" rx="12" fill="#fff" stroke="{INK}" stroke-width="5"/><circle cy="-60" r="40" fill="{SKY}" stroke="{INK}" stroke-width="5"/><circle cy="-60" r="18" fill="{TEAL}"/></g>')
    return wrap(1200, 675, "A stay-at-home parent juggling the household", "A parent juggles a cooking pot, an alphabet block and a laundry basket while a child waves; a busy calendar and a washing machine are in the background.", "".join(b))


def a_group():
    b = [bg(1200, 675, sky="#eaf4ff", ground="#d3e6f5")]
    # office building
    b.append(f'<rect x="100" y="140" width="330" height="430" fill="#fff" stroke="{INK}" stroke-width="6"/>'
             + "".join(f'<rect x="{130+(k%4)*72}" y="{170+(k//4)*72}" width="48" height="48" fill="{[SKY, MINT][k%2]}" stroke="{INK}" stroke-width="3"/>' for k in range(20))
             + f'<rect x="230" y="490" width="70" height="80" fill="{TEAL}" stroke="{INK}" stroke-width="5"/>')
    b.append(umbrella(265, 140, .55, canopy=LILAC, stripe="#7e75cf"))
    # person walking out with own umbrella
    b.append(person(760, 610, 1.1, SKIN[2], SUN, INK, arms="wave"))
    b.append(umbrella(830, 260, .75))
    b.append(f'<path d="M470 600 Q560 560 640 600" stroke="{INK}" stroke-width="4" stroke-dasharray="10 10" fill="none"/><path d="M630 588 l14 12 l-18 6" stroke="{INK}" stroke-width="4" fill="none"/>')
    b.append(f'<g transform="translate(1010 470)"><rect x="-60" y="-40" width="120" height="90" rx="12" fill="{CORAL}" stroke="{INK}" stroke-width="5"/><rect x="-24" y="-60" width="48" height="24" rx="8" fill="none" stroke="{INK}" stroke-width="5"/><rect x="-60" y="-6" width="120" height="10" fill="{INK}"/></g>')
    b.append(cloud(700, 110, .9) + cloud(1050, 150, .6))
    return wrap(1200, 675, "Leaving an office building with your own umbrella", "An office building has a small umbrella on its roof, representing workplace cover, while a person walks away carrying their own umbrella and briefcase.", "".join(b))


def a_claims():
    b = [f'<rect width="1200" height="675" fill="#eefaf6"/>', f'<rect y="500" width="1200" height="175" fill="#cfeee3"/>']
    # desk
    b.append(f'<rect x="200" y="420" width="800" height="26" rx="8" fill="{INK}"/><rect x="240" y="446" width="20" height="160" fill="{INK}"/><rect x="940" y="446" width="20" height="160" fill="{INK}"/>')
    b.append(doc(300, 270, 120, 150, lines=4, rot=-5))
    b.append(doc(450, 250, 120, 170, lines=5, check=True))
    # envelope
    b.append(f'<g transform="translate(640 320)"><rect width="170" height="100" rx="8" fill="#fff" stroke="{INK}" stroke-width="4"/><path d="M0 0 L85 58 L170 0" stroke="{INK}" stroke-width="4" fill="none"/>{heart(130, 70, .6, CORAL)}</g>')
    # mug
    b.append(f'<g transform="translate(880 350)"><rect x="-30" y="0" width="60" height="70" rx="10" fill="{SUN}" stroke="{INK}" stroke-width="4"/><path d="M30 16 Q54 16 54 36 Q54 54 30 54" stroke="{INK}" stroke-width="5" fill="none"/>'
             f'<path d="M-10 -10 Q-18 -26 -8 -40 M8 -10 Q0 -26 10 -40" stroke="{DEEP}" stroke-width="4" fill="none" stroke-linecap="round"/></g>')
    # plant & window
    b.append(f'<rect x="820" y="80" width="260" height="200" rx="12" fill="{SKY}" stroke="{INK}" stroke-width="5"/>' + sun(1000, 150, 30) + cloud(890, 200, .45))
    b.append(f'<g transform="translate(140 500)"><path d="M-40 0 H40 L30 90 H-30Z" fill="{CORAL}" stroke="{INK}" stroke-width="4"/><path d="M0 0 Q-50 -60 -20 -120 M0 0 Q40 -70 20 -130 M0 0 Q0 -60 0 -100" stroke="{DEEP}" stroke-width="8" fill="none" stroke-linecap="round"/>'
             f'<ellipse cx="-20" cy="-120" rx="20" ry="12" fill="{TEAL}"/><ellipse cx="20" cy="-130" rx="20" ry="12" fill="{TEAL}"/><ellipse cx="0" cy="-102" rx="16" ry="10" fill="{TEAL}"/></g>')
    b.append(person(1100, 650, .9, SKIN[4], LILAC, "#3b2a20", arms="wave"))
    return wrap(1200, 675, "Calmly organising paperwork for a life insurance claim", "A tidy desk holds a claim form with a check mark, a second document, an envelope with a heart and a warm mug, beside a potted plant and a sunny window.", "".join(b))


ARTICLE_ART = {
    "term-vs-whole-life-insurance": a_term_whole,
    "universal-life-insurance-explained": a_universal,
    "how-much-life-insurance-do-i-need": a_how_much,
    "life-insurance-riders-explained": a_riders,
    "choosing-life-insurance-beneficiaries": a_beneficiaries,
    "life-insurance-medical-exam": a_medical_exam,
    "how-life-insurance-underwriting-works": a_underwriting,
    "how-to-compare-life-insurance-quotes": a_compare,
    "life-insurance-through-life-stages": a_life_stages,
    "life-insurance-for-stay-at-home-parents": a_stay_home,
    "group-life-insurance-vs-individual-policy": a_group,
    "how-life-insurance-claims-work": a_claims,
}
