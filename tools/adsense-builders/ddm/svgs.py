# Original SVG illustrations for Discount Deal Me.
INK = "#22223b"; TANG = "#f4511e"; CREAM = "#fff7ea"; MINT = "#2ec4b6"
SUN = "#ffd23f"; LILAC = "#b8a1ff"; PINK = "#ff8fab"; SKY = "#9ad1ff"; W = "#ffffff"
FONT = "'Bricolage Grotesque', 'Arial Rounded MT Bold', Arial, sans-serif"


def dee(x, y, s=1.0, rot=0, color=TANG, arm="wave"):
    """Dee, the walking price-tag mascot."""
    arms = {
        "wave": f'<path d="M78 0 Q105 -20 112 -48" stroke="{INK}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="112" cy="-52" r="9" fill="{W}" stroke="{INK}" stroke-width="5"/>',
        "point": f'<path d="M78 5 L125 -5" stroke="{INK}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="130" cy="-6" r="9" fill="{W}" stroke="{INK}" stroke-width="5"/>',
        "hold": f'<path d="M78 8 Q100 10 108 -8" stroke="{INK}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="110" cy="-12" r="9" fill="{W}" stroke="{INK}" stroke-width="5"/>',
        "up": f'<path d="M78 -5 Q95 -40 88 -70" stroke="{INK}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="87" cy="-75" r="9" fill="{W}" stroke="{INK}" stroke-width="5"/>',
    }[arm]
    return f'''<g transform="translate({x} {y}) rotate({rot}) scale({s})">
  <path d="M5 45 L0 85" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M45 45 L50 85" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>
  <ellipse cx="-6" cy="88" rx="16" ry="8" fill="{INK}"/><ellipse cx="56" cy="88" rx="16" ry="8" fill="{INK}"/>
  <path d="M-62 20 Q-85 25 -92 45" stroke="{INK}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="-94" cy="50" r="9" fill="{W}" stroke="{INK}" stroke-width="5"/>
  {arms}
  <path d="M-95 0 L-58 -47 L70 -47 Q82 -47 82 -35 L82 35 Q82 47 70 47 L-58 47 Z" fill="{color}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
  <circle cx="-55" cy="0" r="10" fill="{CREAM}" stroke="{INK}" stroke-width="5"/>
  <circle cx="5" cy="-10" r="11" fill="{W}"/><circle cx="40" cy="-10" r="11" fill="{W}"/>
  <circle cx="8" cy="-8" r="6" fill="{INK}"/><circle cx="43" cy="-8" r="6" fill="{INK}"/>
  <path d="M8 14 Q23 30 40 14" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="-12" cy="10" r="6" fill="{PINK}" opacity=".8"/><circle cx="60" cy="10" r="6" fill="{PINK}" opacity=".8"/>
</g>'''


def confetti(seed, w, h, n=18):
    import random
    r = random.Random(seed)
    cols = [TANG, MINT, SUN, LILAC, PINK, SKY]
    out = []
    for i in range(n):
        x, y = r.randint(20, w - 20), r.randint(20, h - 20)
        c = r.choice(cols)
        k = r.randint(0, 2)
        if k == 0:
            out.append(f'<circle cx="{x}" cy="{y}" r="{r.randint(4,9)}" fill="{c}" opacity=".7"/>')
        elif k == 1:
            out.append(f'<rect x="{x}" y="{y}" width="14" height="6" rx="3" fill="{c}" opacity=".7" transform="rotate({r.randint(0,180)} {x} {y})"/>')
        else:
            out.append(f'<path d="M{x} {y-8} L{x+3} {y-2} L{x+9} {y} L{x+3} {y+2} L{x} {y+8} L{x-3} {y+2} L{x-9} {y} L{x-3} {y-2} Z" fill="{c}" opacity=".8"/>')
    return "\n".join(out)


def wrap(title, desc, body, w=1200, h=675, bg=CREAM, seed=1):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-labelledby="t d">
<title id="t">{title}</title>
<desc id="d">{desc}</desc>
<rect width="{w}" height="{h}" fill="{bg}"/>
{confetti(seed, w, h)}
{body}
</svg>
'''


def tag(x, y, s=1, fill=W, label="", rot=0, fs=34):
    t = f'<text x="10" y="12" font-family="{FONT}" font-size="{fs}" font-weight="800" fill="{INK}" text-anchor="middle">{label}</text>' if label else ""
    return f'''<g transform="translate({x} {y}) rotate({rot}) scale({s})"><path d="M-80 0 L-50 -40 L70 -40 Q80 -40 80 -30 L80 30 Q80 40 70 40 L-50 40 Z" fill="{fill}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/><circle cx="-48" cy="0" r="8" fill="{CREAM}" stroke="{INK}" stroke-width="4"/>{t}</g>'''


def coin(x, y, r=26, fill=SUN):
    return f'<g><circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{INK}" stroke-width="5"/><circle cx="{x}" cy="{y}" r="{r*0.62:.0f}" fill="none" stroke="{INK}" stroke-width="3" opacity=".5"/><text x="{x}" y="{y + r*0.35:.0f}" font-family="{FONT}" font-size="{r:.0f}" font-weight="800" text-anchor="middle" fill="{INK}">$</text></g>'


def ground(y, w, color=MINT):
    return f'<path d="M0 {y} Q{w*0.25} {y-30} {w*0.5} {y} T{w} {y} V{y+400} H0 Z" fill="{color}" opacity=".35"/>'


ART = {}

ART["how-to-spot-a-real-deal"] = ("A cheerful price-tag character inspecting a 'was / now' sale tag through a giant magnifying glass",
    ground(560, 1200) + f'''
<rect x="560" y="120" width="440" height="330" rx="28" fill="{W}" stroke="{INK}" stroke-width="6"/>
<rect x="560" y="120" width="440" height="70" rx="28" fill="{SUN}" stroke="{INK}" stroke-width="6"/>
<text x="780" y="168" font-family="{FONT}" font-size="36" font-weight="800" text-anchor="middle" fill="{INK}">SALE!</text>
<text x="620" y="265" font-family="{FONT}" font-size="44" font-weight="800" fill="{INK}" opacity=".45">WAS</text>
<rect x="740" y="232" width="200" height="40" rx="10" fill="{LILAC}"/><path d="M730 255 L950 245" stroke="{TANG}" stroke-width="10" stroke-linecap="round"/>
<text x="620" y="360" font-family="{FONT}" font-size="44" font-weight="800" fill="{INK}">NOW</text>
<rect x="760" y="325" width="140" height="44" rx="10" fill="{MINT}"/>
<text x="780" y="420" font-family="{FONT}" font-size="24" font-weight="700" text-anchor="middle" fill="{INK}" opacity=".7">"Was" according to whom?</text>
<circle cx="800" cy="260" r="120" fill="{SKY}" opacity=".35" stroke="{INK}" stroke-width="12"/>
<path d="M885 345 L990 450" stroke="{INK}" stroke-width="28" stroke-linecap="round"/>
<path d="M740 200 Q760 185 790 185" stroke="{W}" stroke-width="10" fill="none" stroke-linecap="round"/>
''' + dee(300, 420, 1.5, -6, arm="point") + '''
<g transform="translate(120 140)"><circle r="40" fill="#ffd23f" stroke="#22223b" stroke-width="5"/><text y="16" font-family="Arial" font-size="48" font-weight="900" text-anchor="middle" fill="#22223b">?</text></g>
''')

ART["coupon-stacking-explained"] = ("A price-tag character balancing on top of a wobbly tower of three different coupons",
    ground(580, 1200, SUN) + f'''
<g transform="rotate(-3 600 520)">
<rect x="380" y="470" width="440" height="110" rx="14" fill="{MINT}" stroke="{INK}" stroke-width="6" stroke-dasharray="18 10"/>
<text x="600" y="540" font-family="{FONT}" font-size="40" font-weight="800" text-anchor="middle" fill="{INK}">STORE COUPON</text></g>
<g transform="rotate(4 600 400)">
<rect x="410" y="350" width="380" height="105" rx="14" fill="{LILAC}" stroke="{INK}" stroke-width="6" stroke-dasharray="18 10"/>
<text x="600" y="416" font-family="{FONT}" font-size="36" font-weight="800" text-anchor="middle" fill="{INK}">MANUFACTURER</text></g>
<g transform="rotate(-5 600 290)">
<rect x="450" y="240" width="300" height="95" rx="14" fill="{PINK}" stroke="{INK}" stroke-width="6" stroke-dasharray="18 10"/>
<text x="600" y="300" font-family="{FONT}" font-size="36" font-weight="800" text-anchor="middle" fill="{INK}">CASHBACK</text></g>
''' + dee(610, 140, 0.95, 4, arm="up") + f'''
<g transform="translate(150 230) rotate(-25)"><circle cx="0" cy="0" r="22" fill="none" stroke="{INK}" stroke-width="7"/><circle cx="0" cy="70" r="22" fill="none" stroke="{INK}" stroke-width="7"/><path d="M16 14 L120 70 M16 56 L120 0" stroke="{INK}" stroke-width="8" stroke-linecap="round"/></g>
<path d="M140 380 q20 -20 40 0 t40 0 t40 0" stroke="{TANG}" stroke-width="6" fill="none" stroke-dasharray="4 10" stroke-linecap="round"/>
{coin(1000, 300, 40)}{coin(1060, 390, 30, MINT)}{coin(960, 450, 26, PINK)}
''')

ART["price-tracking-basics"] = ("A computer screen showing a price-history line chart with a bell alert ringing at the lowest dip, as a price-tag character points to it",
    ground(590, 1200, LILAC) + f'''
<rect x="360" y="90" width="620" height="400" rx="26" fill="{INK}"/>
<rect x="385" y="115" width="570" height="340" rx="14" fill="{W}"/>
<rect x="620" y="490" width="100" height="60" fill="{INK}"/><rect x="560" y="545" width="220" height="24" rx="12" fill="{INK}"/>
<path d="M420 400 H930 M420 400 V150" stroke="{INK}" stroke-width="4" opacity=".3"/>
<path d="M430 220 L500 240 L560 200 L620 300 L680 250 L740 370 L800 280 L860 230 L920 250" stroke="{TANG}" stroke-width="10" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="740" cy="370" r="16" fill="{MINT}" stroke="{INK}" stroke-width="5"/>
<path d="M420 300 H930" stroke="{MINT}" stroke-width="4" stroke-dasharray="14 10"/>
<g transform="translate(1040 150) rotate(15)"><path d="M-45 40 Q-45 -40 0 -45 Q45 -40 45 40 L58 55 H-58 Z" fill="{SUN}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><circle cx="0" cy="68" r="12" fill="{INK}"/><circle cx="0" cy="-52" r="8" fill="{INK}"/></g>
<path d="M1100 110 q20 20 0 40 M1120 90 q35 40 0 80" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
''' + dee(180, 430, 1.2, 0, arm="point"))

ART["cashback-portals-and-card-rewards"] = ("Coins flowing out of a phone and back into a smiling piggy bank while a price-tag character cheers",
    ground(580, 1200, MINT) + f'''
<rect x="170" y="130" width="210" height="380" rx="34" fill="{INK}"/><rect x="188" y="170" width="174" height="290" rx="12" fill="{SKY}"/>
<rect x="210" y="200" width="130" height="30" rx="8" fill="{W}"/><rect x="210" y="250" width="130" height="80" rx="10" fill="{SUN}"/>
<text x="275" y="302" font-family="{FONT}" font-size="34" font-weight="800" text-anchor="middle" fill="{INK}">BUY</text>
<rect x="210" y="350" width="90" height="16" rx="8" fill="{W}"/><rect x="210" y="380" width="120" height="16" rx="8" fill="{W}"/>
<path d="M390 260 C 520 120, 700 120, 800 260" stroke="{INK}" stroke-width="5" fill="none" stroke-dasharray="6 14" stroke-linecap="round"/>
{coin(480, 185, 30)}{coin(600, 150, 34)}{coin(720, 190, 30)}
<g transform="translate(900 400)">
<ellipse cx="0" cy="0" rx="180" ry="130" fill="{PINK}" stroke="{INK}" stroke-width="7"/>
<ellipse cx="170" cy="-10" rx="40" ry="34" fill="{PINK}" stroke="{INK}" stroke-width="6"/><circle cx="160" cy="-12" r="6" fill="{INK}"/><circle cx="182" cy="-12" r="6" fill="{INK}"/>
<path d="M-70 -120 L-40 -170 L-10 -125" fill="{PINK}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
<rect x="-60" y="-138" width="90" height="16" rx="8" fill="{INK}"/>
<circle cx="80" cy="-40" r="10" fill="{INK}"/><path d="M60 10 Q90 35 120 10" stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round"/>
<rect x="-110" y="110" width="40" height="50" rx="10" fill="{PINK}" stroke="{INK}" stroke-width="6"/><rect x="70" y="110" width="40" height="50" rx="10" fill="{PINK}" stroke="{INK}" stroke-width="6"/>
<path d="M-180 -10 q-40 -20 -30 20" stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round"/>
</g>
''' + dee(560, 520, 0.8, -8, color=SUN, arm="up"))

ART["return-policies-decoded"] = ("A cardboard parcel with a big U-turn arrow, a long receipt with a calendar, and a price-tag character holding an alarm clock",
    ground(590, 1200, SKY) + f'''
<g transform="translate(470 250)">
<path d="M0 60 L180 0 L360 60 L180 120 Z" fill="#e8b27a" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
<path d="M0 60 V260 L180 330 V120 Z" fill="#d99a5b" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
<path d="M360 60 V260 L180 330 V120 Z" fill="#c88745" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
<path d="M90 30 L270 90 L270 150" stroke="{W}" stroke-width="18" fill="none" opacity=".7"/>
<rect x="40" y="170" width="90" height="60" rx="6" fill="{W}" stroke="{INK}" stroke-width="4" transform="skewY(20)"/>
</g>
<path d="M880 170 Q1000 170 1000 280 Q1000 390 880 390 L840 390" stroke="{TANG}" stroke-width="26" fill="none" stroke-linecap="round"/>
<path d="M860 350 L800 390 L860 430" stroke="{TANG}" stroke-width="26" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<g transform="translate(130 110) rotate(-6)">
<path d="M0 0 H200 V380 L180 395 L160 380 L140 395 L120 380 L100 395 L80 380 L60 395 L40 380 L20 395 L0 380 Z" fill="{W}" stroke="{INK}" stroke-width="5"/>
<rect x="25" y="30" width="150" height="14" rx="7" fill="{INK}" opacity=".7"/>
<rect x="25" y="70" width="110" height="10" rx="5" fill="{INK}" opacity=".3"/><rect x="25" y="95" width="130" height="10" rx="5" fill="{INK}" opacity=".3"/>
<rect x="25" y="140" width="150" height="120" rx="10" fill="{CREAM}" stroke="{INK}" stroke-width="4"/>
<rect x="25" y="140" width="150" height="32" rx="10" fill="{TANG}"/>
<g fill="{INK}" opacity=".5">{''.join(f'<rect x="{38+ (i%5)*27}" y="{185 + (i//5)*25}" width="16" height="14" rx="3"/>' for i in range(15))}</g>
<circle cx="146" cy="242" r="16" fill="none" stroke="{MINT}" stroke-width="6"/>
<rect x="25" y="290" width="150" height="10" rx="5" fill="{INK}" opacity=".3"/><rect x="25" y="315" width="90" height="10" rx="5" fill="{INK}" opacity=".3"/>
</g>
''' + dee(1030, 520, 0.8, 5, arm="hold") + f'''
<g transform="translate(1130 470)"><circle r="34" fill="{SUN}" stroke="{INK}" stroke-width="6"/><path d="M0 -18 V0 L14 10" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="-26" cy="-30" r="10" fill="{INK}"/><circle cx="26" cy="-30" r="10" fill="{INK}"/></g>
''')

months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]
mcols = [SKY, PINK, MINT, LILAC, SUN, SKY, SUN, MINT, TANG, TANG, LILAC, PINK]
def _cal():
    out = []
    for i, m in enumerate(months):
        x = 420 + (i % 4) * 170; y = 150 + (i // 4) * 145
        out.append(f'<rect x="{x}" y="{y}" width="150" height="125" rx="16" fill="{W}" stroke="{INK}" stroke-width="5"/><rect x="{x}" y="{y}" width="150" height="38" rx="16" fill="{mcols[i]}" stroke="{INK}" stroke-width="5"/><text x="{x+75}" y="{y+29}" font-family="{FONT}" font-size="24" font-weight="800" text-anchor="middle" fill="{INK}">{m}</text>')
    icons = {
        0: '<path d="M0 -26 V26 M-22 -13 L22 13 M-22 13 L22 -13" stroke="#22223b" stroke-width="6" stroke-linecap="round"/>',
        1: '<path d="M0 22 L-24 -2 A13 13 0 0 1 0 -18 A13 13 0 0 1 24 -2 Z" fill="#ff8fab" stroke="#22223b" stroke-width="4"/>',
        4: '<path d="M-20 20 L0 -24 L20 20 Z" fill="#2ec4b6" stroke="#22223b" stroke-width="4"/>',
        6: '<circle r="16" fill="#ffd23f" stroke="#22223b" stroke-width="4"/><path d="M0 -30 V-22 M0 22 V30 M-30 0 H-22 M22 0 H30" stroke="#22223b" stroke-width="4"/>',
        7: '<rect x="-22" y="-20" width="44" height="36" rx="4" fill="#9ad1ff" stroke="#22223b" stroke-width="4"/><path d="M-22 -8 H22" stroke="#22223b" stroke-width="4"/>',
        9: '<path d="M0 -24 Q24 0 0 24 Q-24 0 0 -24 Z" fill="#f4511e" stroke="#22223b" stroke-width="4"/>',
        10: '<rect x="-24" y="-18" width="48" height="36" rx="4" fill="#f4511e" stroke="#22223b" stroke-width="4"/><path d="M-24 -4 H24 M0 -18 V18" stroke="#22223b" stroke-width="4"/>',
        11: '<rect x="-22" y="-14" width="44" height="36" rx="4" fill="#2ec4b6" stroke="#22223b" stroke-width="4"/><path d="M0 -14 V22 M-22 0 H22 M0 -14 q-18 -18 -18 0 M0 -14 q18 -18 18 0" stroke="#22223b" stroke-width="4" fill="none"/>',
    }
    for i, ic in icons.items():
        x = 420 + (i % 4) * 170 + 75; y = 150 + (i // 4) * 145 + 85
        out.append(f'<g transform="translate({x} {y})">{ic}</g>')
    return "".join(out)
ART["seasonal-sale-calendar"] = ("A colourful twelve-month wall calendar with little seasonal icons as a price-tag character flips to the next page",
    ground(600, 1200, SUN) + f'<rect x="395" y="110" width="710" height="485" rx="30" fill="{INK}" opacity=".12"/>' + _cal() + dee(200, 440, 1.25, -4, arm="up"))

ART["unit-price-math"] = ("A balance scale weighing one big jar against three small jars under a supermarket shelf label, with a price-tag character holding a calculator",
    ground(590, 1200, LILAC) + f'''
<rect x="300" y="520" width="600" height="30" rx="10" fill="{INK}"/>
<path d="M600 520 V180" stroke="{INK}" stroke-width="16" stroke-linecap="round"/>
<path d="M360 220 L840 180" stroke="{INK}" stroke-width="14" stroke-linecap="round"/>
<circle cx="600" cy="200" r="18" fill="{SUN}" stroke="{INK}" stroke-width="6"/>
<path d="M360 220 L300 340 M360 220 L420 340" stroke="{INK}" stroke-width="4"/><path d="M280 340 H440 Q430 370 360 370 Q290 370 280 340 Z" fill="{SKY}" stroke="{INK}" stroke-width="5"/>
<path d="M840 180 L780 300 M840 180 L900 300" stroke="{INK}" stroke-width="4"/><path d="M760 300 H920 Q910 330 840 330 Q770 330 760 300 Z" fill="{SKY}" stroke="{INK}" stroke-width="5"/>
<rect x="315" y="210" width="90" height="130" rx="18" fill="{SUN}" stroke="{INK}" stroke-width="6"/><rect x="310" y="195" width="100" height="26" rx="8" fill="{TANG}" stroke="{INK}" stroke-width="5"/><rect x="330" y="250" width="60" height="40" rx="6" fill="{W}"/>
{''.join(f'<rect x="{772 + i*50}" y="245" width="40" height="55" rx="10" fill="{SUN}" stroke="{INK}" stroke-width="5"/><rect x="{768 + i*50}" y="235" width="48" height="14" rx="5" fill="{TANG}" stroke="{INK}" stroke-width="4"/>' for i in range(3))}
<g transform="translate(830 420)"><rect x="-150" y="-50" width="300" height="100" rx="10" fill="{W}" stroke="{INK}" stroke-width="5"/><rect x="-150" y="-50" width="110" height="100" rx="10" fill="{SUN}" stroke="{INK}" stroke-width="5"/>
<text x="-95" y="12" font-family="{FONT}" font-size="30" font-weight="800" text-anchor="middle" fill="{INK}">per oz</text>
<rect x="-20" y="-25" width="140" height="16" rx="8" fill="{INK}" opacity=".6"/><rect x="-20" y="8" width="100" height="12" rx="6" fill="{INK}" opacity=".3"/></g>
''' + dee(160, 450, 1.0, 0, color=MINT, arm="hold") + f'''
<g transform="translate(275 420) rotate(10)"><rect x="-30" y="-44" width="60" height="88" rx="10" fill="{INK}"/><rect x="-22" y="-36" width="44" height="22" rx="4" fill="{MINT}"/>{''.join(f'<rect x="{-22 + (i%3)*16}" y="{-6 + (i//3)*14}" width="12" height="10" rx="2" fill="{W}"/>' for i in range(9))}</g>
''')

ART["budgeting-for-deal-hunters"] = ("A row of labelled cash envelopes and a glass savings jar as a price-tag character drops a coin in",
    ground(590, 1200, PINK) + ''.join(
        f'<g transform="translate({120 + i*190} {300 + (i%2)*30}) rotate({(-4, 3, -2, 5)[i]})"><rect x="0" y="0" width="160" height="110" rx="10" fill="{c}" stroke="{INK}" stroke-width="5"/><path d="M0 0 L80 60 L160 0" fill="none" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/><rect x="20" y="75" width="120" height="24" rx="6" fill="{W}"/><text x="80" y="94" font-family="{FONT}" font-size="20" font-weight="800" text-anchor="middle" fill="{INK}">{lbl}</text></g>'
        for i, (c, lbl) in enumerate([(SKY, "GROCERIES"), (SUN, "GIFTS"), (MINT, "HOME"), (LILAC, "FUN")])) + f'''
<g transform="translate(960 200)">
<path d="M-110 60 Q-120 330 -90 360 H90 Q120 330 110 60 Z" fill="{SKY}" opacity=".45" stroke="{INK}" stroke-width="7"/>
<rect x="-120" y="30" width="240" height="40" rx="12" fill="{MINT}" stroke="{INK}" stroke-width="6"/>
{coin(-50, 320, 28)}{coin(10, 330, 28)}{coin(60, 300, 28)}{coin(-20, 270, 28)}{coin(40, 250, 28)}
<rect x="-70" y="140" width="140" height="44" rx="8" fill="{W}" stroke="{INK}" stroke-width="4"/>
<text x="0" y="172" font-family="{FONT}" font-size="26" font-weight="800" text-anchor="middle" fill="{INK}">SAVED</text>
</g>
{coin(960, 110, 26)}
<path d="M960 145 V195" stroke="{INK}" stroke-width="4" stroke-dasharray="6 8"/>
''' + dee(820, 130, 0.7, -10, arm="hold"))

ART["price-matching-and-price-adjustments"] = ("Two little shopfronts facing each other with matching price tags and an equals sign between them, while a price-tag character acts as referee",
    ground(600, 1200, MINT) + ''.join(f'''<g transform="translate({x} 170)">
<rect x="0" y="80" width="300" height="330" fill="{W}" stroke="{INK}" stroke-width="6"/>
<path d="M-20 80 H320 L300 0 H0 Z" fill="{c}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
{''.join(f'<path d="M{20+i*56} 80 q28 40 56 0" fill="{W if i%2 else c}" stroke="{INK}" stroke-width="5"/>' for i in range(5))}
<rect x="40" y="170" width="220" height="130" rx="8" fill="{SKY}" opacity=".5" stroke="{INK}" stroke-width="5"/>
<rect x="110" y="320" width="80" height="90" fill="{INK}" opacity=".85"/>
</g>''' for x, c in [(90, TANG), (810, LILAC)]) + tag(240, 250, 0.9, SUN, "", -8) + tag(960, 250, 0.9, SUN, "", 8) + f'''
<rect x="545" y="260" width="110" height="24" rx="12" fill="{INK}"/><rect x="545" y="305" width="110" height="24" rx="12" fill="{INK}"/>
''' + dee(600, 460, 0.9, 0, color=SUN, arm="up"))

ART["free-trials-and-subscription-traps"] = ("A credit card sitting on a comic mousetrap beside a calendar with a circled renewal date, while a price-tag character tiptoes past holding an alarm clock",
    ground(590, 1200, SUN) + f'''
<g transform="translate(360 430)">
<rect x="0" y="0" width="420" height="90" rx="12" fill="#e8b27a" stroke="{INK}" stroke-width="6"/>
<path d="M40 10 Q210 -150 380 10" stroke="#9aa0a6" stroke-width="12" fill="none"/>
<rect x="170" y="-10" width="80" height="30" rx="6" fill="#9aa0a6" stroke="{INK}" stroke-width="5"/>
<g transform="translate(120 -110) rotate(-8)"><rect x="0" y="0" width="200" height="126" rx="14" fill="{LILAC}" stroke="{INK}" stroke-width="6"/><rect x="0" y="28" width="200" height="24" fill="{INK}"/><rect x="18" y="72" width="44" height="32" rx="6" fill="{SUN}" stroke="{INK}" stroke-width="3"/><rect x="80" y="84" width="96" height="10" rx="5" fill="{W}"/></g>
</g>
<g transform="translate(830 120)"><rect x="0" y="0" width="260" height="250" rx="20" fill="{W}" stroke="{INK}" stroke-width="6"/><rect x="0" y="0" width="260" height="60" rx="20" fill="{TANG}" stroke="{INK}" stroke-width="6"/>
<text x="130" y="42" font-family="{FONT}" font-size="30" font-weight="800" text-anchor="middle" fill="{W}">TRIAL</text>
{''.join(f'<rect x="{22 + (i%6)*38}" y="{80 + (i//6)*38}" width="26" height="24" rx="4" fill="{INK}" opacity=".2"/>' for i in range(24))}
<circle cx="203" cy="206" r="24" fill="none" stroke="{TANG}" stroke-width="7"/><text x="130" y="-20" font-family="{FONT}" font-size="26" font-weight="800" text-anchor="middle" fill="{INK}">renews day 30?</text></g>
''' + dee(170, 420, 1.0, -8, color=MINT, arm="hold") + f'''
<g transform="translate(280 350)"><circle r="34" fill="{SUN}" stroke="{INK}" stroke-width="6"/><path d="M0 -18 V0 L14 10" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="-26" cy="-30" r="10" fill="{INK}"/><circle cx="26" cy="-30" r="10" fill="{INK}"/></g>
<path d="M235 300 l-12 -18 M285 290 l0 -22 M330 305 l14 -16" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>
''')

ART["open-box-refurbished-and-renewed"] = ("An opened cardboard box revealing a laptop, surrounded by grade badges A, B and C and a warranty shield, with a price-tag character peeking in",
    ground(590, 1200, SKY) + f'''
<g transform="translate(420 300)">
<path d="M0 0 H380 V260 H0 Z" fill="#d99a5b" stroke="{INK}" stroke-width="6"/>
<path d="M0 0 L-70 -70 L300 -70 L380 0 Z" fill="#e8b27a" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
<path d="M380 0 L450 -60 L440 60 L380 90 Z" fill="#c88745" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
<g transform="translate(60 -150)"><rect x="0" y="0" width="260" height="170" rx="14" fill="{INK}"/><rect x="14" y="14" width="232" height="138" rx="6" fill="{MINT}"/><path d="M60 110 L110 60 L150 95 L190 50" stroke="{W}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
<rect x="0" y="40" width="380" height="36" fill="{SUN}" opacity=".7"/>
</g>
''' + ''.join(f'<g transform="translate({x} {y})"><circle r="46" fill="{c}" stroke="{INK}" stroke-width="6"/><text y="17" font-family="{FONT}" font-size="50" font-weight="800" text-anchor="middle" fill="{INK}">{g}</text></g>' for x, y, c, g in [(960, 180, MINT, "A"), (1070, 300, SUN, "B"), (980, 420, PINK, "C")]) + f'''
<g transform="translate(250 190)"><path d="M0 -70 L60 -45 V10 Q60 60 0 85 Q-60 60 -60 10 V-45 Z" fill="{LILAC}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><path d="M-25 5 L-5 28 L30 -15" stroke="{INK}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
''' + dee(200, 470, 0.85, 8, arm="point"))

ART["free-shipping-thresholds"] = ("A delivery van driving along a progress bar toward a free-shipping flag, with a shopping cart and a price-tag character running alongside",
    ground(600, 1200, LILAC) + f'''
<rect x="120" y="180" width="960" height="44" rx="22" fill="{W}" stroke="{INK}" stroke-width="6"/>
<rect x="126" y="186" width="640" height="32" rx="16" fill="{MINT}"/>
<path d="M1040 100 V230" stroke="{INK}" stroke-width="8"/><path d="M1040 100 L1130 125 L1040 150 Z" fill="{TANG}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<text x="1045" y="85" font-family="{FONT}" font-size="30" font-weight="800" text-anchor="middle" fill="{INK}">FREE</text>
<g transform="translate(560 300)">
<rect x="0" y="40" width="300" height="160" rx="16" fill="{SUN}" stroke="{INK}" stroke-width="6"/>
<path d="M300 90 H390 L440 150 V200 H300 Z" fill="{SUN}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
<path d="M320 105 H380 L415 150 H320 Z" fill="{SKY}" stroke="{INK}" stroke-width="5"/>
<circle cx="80" cy="205" r="38" fill="{INK}"/><circle cx="80" cy="205" r="15" fill="{W}"/><circle cx="360" cy="205" r="38" fill="{INK}"/><circle cx="360" cy="205" r="15" fill="{W}"/>
''' + tag(150, 120, 0.8, W, "", 0) + f'''
<path d="M-40 80 H-120 M-30 130 H-150 M-40 180 H-100" stroke="{INK}" stroke-width="7" stroke-linecap="round" opacity=".5"/>
</g>
<g transform="translate(350 390)"><path d="M-80 0 H-50 L-20 110 H100 L125 20 H-40" fill="none" stroke="{INK}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><path d="M-35 20 H125 L100 110 H-20 Z" fill="{PINK}" opacity=".6"/><circle cx="0" cy="140" r="16" fill="{INK}"/><circle cx="85" cy="140" r="16" fill="{INK}"/>
<rect x="-10" y="-20" width="50" height="45" rx="6" fill="{MINT}" stroke="{INK}" stroke-width="5"/><rect x="50" y="-5" width="45" height="30" rx="6" fill="{SKY}" stroke="{INK}" stroke-width="5"/></g>
''' + dee(170, 470, 0.8, -6, arm="wave"))


def hero():
    body = f'''
<rect width="1600" height="900" fill="{CREAM}"/>
<circle cx="1350" cy="170" r="110" fill="{SUN}"/>
<g fill="{SKY}" opacity=".6"><rect x="60" y="320" width="140" height="380" rx="10"/><rect x="220" y="240" width="120" height="460" rx="10"/><rect x="1260" y="360" width="150" height="340" rx="10"/><rect x="1430" y="280" width="120" height="420" rx="10"/></g>
<g fill="{W}" opacity=".8">{''.join(f'<rect x="{x}" y="{y}" width="26" height="30" rx="4"/>' for x in (90, 140, 245, 295, 1290, 1350, 1455, 1505) for y in (380, 450, 520))}</g>
<path d="M0 700 Q400 640 800 700 T1600 700 V900 H0 Z" fill="{MINT}"/>
<path d="M0 760 Q400 720 800 770 T1600 760 V900 H0 Z" fill="{INK}" opacity=".08"/>
<g transform="translate(470 250)">
<rect x="0" y="80" width="660" height="400" fill="{W}" stroke="{INK}" stroke-width="8"/>
<path d="M-40 80 H700 L660 -10 H0 Z" fill="{TANG}" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>
{''.join(f'<path d="M{-40+i*74} 80 q37 55 74 0" fill="{W if i%2 else TANG}" stroke="{INK}" stroke-width="6"/>' for i in range(10))}
<rect x="200" y="-80" width="260" height="70" rx="16" fill="{SUN}" stroke="{INK}" stroke-width="7"/>
<text x="330" y="-32" font-family="{FONT}" font-size="40" font-weight="800" text-anchor="middle" fill="{INK}">DEALS?</text>
<rect x="40" y="190" width="250" height="180" rx="10" fill="{SKY}" opacity=".5" stroke="{INK}" stroke-width="6"/>
<rect x="370" y="190" width="250" height="180" rx="10" fill="{SKY}" opacity=".5" stroke="{INK}" stroke-width="6"/>
{tag(165, 280, 0.9, SUN, "?", -10, 50)}{tag(495, 280, 0.9, PINK, "%", 8, 50)}
<rect x="0" y="400" width="660" height="80" fill="{LILAC}" stroke="{INK}" stroke-width="8"/>
</g>
{dee(340, 660, 1.6, -4, arm="wave")}
{dee(1250, 650, 1.1, 6, color=MINT, arm="up")}
<g transform="translate(1100 620)"><path d="M-40 0 H80 L70 110 H-30 Z" fill="{PINK}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/><path d="M-5 0 Q20 -50 45 0" stroke="{INK}" stroke-width="7" fill="none"/></g>
<g transform="translate(1000 650)"><path d="M-40 0 H60 L55 90 H-35 Z" fill="{SUN}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/><path d="M-10 0 Q10 -40 30 0" stroke="{INK}" stroke-width="7" fill="none"/></g>
<g transform="translate(160 120) rotate(-12)"><rect x="0" y="0" width="220" height="100" rx="12" fill="{W}" stroke="{INK}" stroke-width="6" stroke-dasharray="16 10"/><text x="110" y="62" font-family="{FONT}" font-size="36" font-weight="800" text-anchor="middle" fill="{TANG}">COUPON</text></g>
<g transform="translate(1180 330) rotate(10)"><rect x="0" y="0" width="200" height="90" rx="12" fill="{LILAC}" stroke="{INK}" stroke-width="6" stroke-dasharray="16 10"/><text x="100" y="58" font-family="{FONT}" font-size="34" font-weight="800" text-anchor="middle" fill="{INK}">CASH BACK</text></g>
{coin(1480, 560, 34)}{coin(420, 180, 28, MINT)}{coin(1180, 110, 24, PINK)}
{confetti(99, 1600, 600, 30)}
'''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-labelledby="t d">
<title id="t">Discount Deal Me: a cheerful shopping street</title>
<desc id="d">Two walking price-tag characters wave outside a striped-awning shop with a sign asking "Deals?", surrounded by floating coupons, coins and shopping bags.</desc>
{body}
</svg>
'''


def og():
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-labelledby="t">
<title id="t">Discount Deal Me — offers worth the click</title>
<rect width="1200" height="630" fill="{TANG}"/>
<circle cx="1050" cy="120" r="200" fill="{SUN}" opacity=".9"/>
<path d="M0 520 Q300 470 600 520 T1200 520 V630 H0 Z" fill="{INK}"/>
{confetti(7, 1200, 460, 22)}
<text x="70" y="230" font-family="{FONT}" font-size="104" font-weight="800" fill="{W}">Discount</text>
<text x="70" y="340" font-family="{FONT}" font-size="104" font-weight="800" fill="{INK}">Deal Me</text>
<text x="74" y="420" font-family="{FONT}" font-size="40" font-weight="700" fill="{W}">offers worth the click</text>
{dee(900, 330, 1.5, 6, color=SUN, arm="wave")}
</svg>
'''


def logo():
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-labelledby="t">
<title id="t">Discount Deal Me logo</title>
<g transform="rotate(-18 32 32)"><path d="M4 32 L18 14 H54 Q60 14 60 20 V44 Q60 50 54 50 H18 Z" fill="{TANG}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>
<circle cx="19" cy="32" r="4.5" fill="{CREAM}" stroke="{INK}" stroke-width="3"/>
<circle cx="34" cy="28" r="3.2" fill="{INK}"/><circle cx="46" cy="28" r="3.2" fill="{INK}"/>
<path d="M33 37 Q40 43 47 37" stroke="{INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>
</svg>
'''


def write_all(outdir):
    import os
    os.makedirs(outdir, exist_ok=True)
    for i, (slug, (alt, body)) in enumerate(ART.items()):
        with open(os.path.join(outdir, f"{slug}.svg"), "w") as f:
            f.write(wrap(alt, alt + ". Illustration by Discount Deal Me.", body, seed=i + 3))
    open(os.path.join(outdir, "hero.svg"), "w").write(hero())
    open(os.path.join(outdir, "og.svg"), "w").write(og())
    open(os.path.join(outdir, "logo.svg"), "w").write(logo())
