#!/usr/bin/env python3
"""Original SVG illustrations for Pillow Exchange."""
import os
OUT = '/home/user/domains/px/images'
os.makedirs(OUT, exist_ok=True)

NIGHT = '#232a5c'; NIGHT2 = '#1a1f47'; CREAM = '#fff8ec'; MOON = '#ffd98a'; LAV = '#b9a7ff'
LAVS = '#ece6ff'; PEACH = '#ffb59e'; MINT = '#9fe3cf'; SKIN = '#ffc9a8'; SKIN2 = '#c98b6b'; INK = NIGHT
S = f'stroke="{INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"'


def svg(name, w, h, title, desc, body):
    doc = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-labelledby="t d">
<title id="t">{title}</title>
<desc id="d">{desc}</desc>
{body}
</svg>
'''
    open(os.path.join(OUT, name + '.svg'), 'w').write(doc)


def stars(pts, c=MOON):
    out = ''
    for x, y, r in pts:
        out += f'<path d="M{x} {y-r} L{x+r*.3} {y-r*.3} L{x+r} {y} L{x+r*.3} {y+r*.3} L{x} {y+r} L{x-r*.3} {y+r*.3} L{x-r} {y} L{x-r*.3} {y-r*.3}Z" fill="{c}"/>'
    return out


def moon(cx, cy, r, bg):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{MOON}"/><circle cx="{cx+r*.45}" cy="{cy-r*.25}" r="{r*.85}" fill="{bg}"/>'


def pillow(x, y, w, h, fill=CREAM, face=False, sad=False, stroke=True):
    # puffy rectangle with pinched corners
    c = 0.18
    d = (f'M{x+w*c} {y} Q{x+w/2} {y-h*.12} {x+w*(1-c)} {y} Q{x+w+w*.04} {y-h*.06} {x+w} {y+h*c} '
         f'Q{x+w+w*.03} {y+h/2} {x+w} {y+h*(1-c)} Q{x+w+w*.04} {y+h+h*.06} {x+w*(1-c)} {y+h} '
         f'Q{x+w/2} {y+h+h*.12} {x+w*c} {y+h} Q{x-w*.04} {y+h+h*.06} {x} {y+h*(1-c)} '
         f'Q{x-w*.03} {y+h/2} {x} {y+h*c} Q{x-w*.04} {y-h*.06} {x+w*c} {y}Z')
    out = f'<path d="{d}" fill="{fill}" {S if stroke else ""}/>'
    if face:
        ex, ey = x + w / 2, y + h / 2
        out += f'<circle cx="{ex-w*.12}" cy="{ey-h*.05}" r="{max(4,w*.022)}" fill="{INK}"/><circle cx="{ex+w*.12}" cy="{ey-h*.05}" r="{max(4,w*.022)}" fill="{INK}"/>'
        if sad:
            out += f'<path d="M{ex-w*.08} {ey+h*.2} Q{ex} {ey+h*.08} {ex+w*.08} {ey+h*.2}" fill="none" {S}/>'
        else:
            out += f'<path d="M{ex-w*.08} {ey+h*.1} Q{ex} {ey+h*.22} {ex+w*.08} {ey+h*.1}" fill="none" {S}/>'
            out += f'<ellipse cx="{ex-w*.2}" cy="{ey+h*.08}" rx="{w*.045}" ry="{h*.05}" fill="{PEACH}" opacity=".8"/><ellipse cx="{ex+w*.2}" cy="{ey+h*.08}" rx="{w*.045}" ry="{h*.05}" fill="{PEACH}" opacity=".8"/>'
    return out


def zs(x, y, s=1.0, c='#fff'):
    return (f'<text x="{x}" y="{y}" font-family="Fredoka,Trebuchet MS,sans-serif" font-weight="700" font-size="{48*s}" fill="{c}">z</text>'
            f'<text x="{x+34*s}" y="{y-40*s}" font-family="Fredoka,Trebuchet MS,sans-serif" font-weight="700" font-size="{64*s}" fill="{c}">Z</text>'
            f'<text x="{x+80*s}" y="{y-96*s}" font-family="Fredoka,Trebuchet MS,sans-serif" font-weight="700" font-size="{80*s}" fill="{c}">Z</text>')


def sleepy_head(cx, cy, r, hair='#5a3d8a', skin=SKIN, closed=True):
    out = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{skin}" {S}/>'
    out += f'<path d="M{cx-r} {cy-r*.1} Q{cx-r*.9} {cy-r*1.2} {cx} {cy-r} Q{cx+r*.9} {cy-r*1.1} {cx+r} {cy-r*.1} Q{cx+r*.5} {cy-r*.55} {cx} {cy-r*.5} Q{cx-r*.5} {cy-r*.55} {cx-r} {cy-r*.1}Z" fill="{hair}" {S}/>'
    out += f'<path d="M{cx-r*.5} {cy+r*.1} q{r*.15} {r*.15} {r*.3} 0" fill="none" {S}/><path d="M{cx+r*.2} {cy+r*.1} q{r*.15} {r*.15} {r*.3} 0" fill="none" {S}/>'
    out += f'<path d="M{cx-r*.12} {cy+r*.45} q{r*.12} {r*.1} {r*.24} 0" fill="none" {S}/>'
    out += f'<ellipse cx="{cx-r*.62}" cy="{cy+r*.35}" rx="{r*.16}" ry="{r*.1}" fill="{PEACH}"/><ellipse cx="{cx+r*.62}" cy="{cy+r*.35}" rx="{r*.16}" ry="{r*.1}" fill="{PEACH}"/>'
    return out


def night_bg(w, h, c1=NIGHT, c2=NIGHT2):
    return (f'<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient></defs>'
            f'<rect width="{w}" height="{h}" fill="url(#bg)"/>')


def room_bg(w, h, wall=LAVS, floor='#d9ccff'):
    return f'<rect width="{w}" height="{h}" fill="{wall}"/><rect y="{h*.78}" width="{w}" height="{h*.22}" fill="{floor}"/>'


def bed(x, y, w, frame='#8a6ad8', sheet='#fff', h=90):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22" fill="{sheet}" {S}/>'
            f'<rect x="{x-20}" y="{y+h-10}" width="{w+40}" height="46" rx="14" fill="{frame}" {S}/>'
            f'<rect x="{x-10}" y="{y+h+30}" width="22" height="40" fill="{frame}" {S}/><rect x="{x+w-12}" y="{y+h+30}" width="22" height="40" fill="{frame}" {S}/>')


# ---------------- hero (1600x900)
body = night_bg(1600, 900)
body += stars([(140, 120, 16), (360, 70, 10), (560, 170, 14), (980, 90, 12), (1180, 200, 9), (1480, 110, 18), (260, 300, 8), (1400, 330, 10), (800, 60, 8)])
body += moon(1270, 210, 110, NIGHT)
body += '<path d="M0 760 Q400 700 800 740 T1600 720 V900 H0Z" fill="#2f3778"/>'
# window frame hint
body += f'<rect x="90" y="360" width="260" height="300" rx="130" fill="none" stroke="{LAV}" stroke-width="8" opacity=".5"/>'
# bed
body += f'<rect x="300" y="560" width="1000" height="150" rx="40" fill="#8a6ad8" {S}/>'
body += f'<rect x="260" y="430" width="70" height="330" rx="30" fill="#6e53c4" {S}/><rect x="1270" y="520" width="60" height="240" rx="28" fill="#6e53c4" {S}/>'
# pillow stack
body += pillow(350, 430, 300, 110, LAV) + pillow(365, 360, 280, 100, MINT) + pillow(380, 300, 260, 90, CREAM, face=False)
# head on pillow
body += sleepy_head(520, 290, 70, hair='#7a4a2a')
# duvet patchwork
body += f'<path d="M560 330 Q900 280 1290 360 L1300 600 Q900 640 560 600Z" fill="{PEACH}" {S}/>'
for i, (x, c) in enumerate([(640, MOON), (780, LAV), (920, MINT), (1060, CREAM), (1180, MOON)]):
    body += f'<rect x="{x}" y="{390 + (i%2)*60}" width="90" height="70" rx="12" fill="{c}" stroke="{INK}" stroke-width="4" stroke-dasharray="10 8" transform="rotate({(i%3-1)*4} {x+45} {420})"/>'
# cat on duvet
body += f'<ellipse cx="1120" cy="330" rx="90" ry="48" fill="#ffab5c" {S}/><circle cx="1195" cy="300" r="40" fill="#ffab5c" {S}/>'
body += f'<path d="M1170 272 l6 -30 l18 22Z M1205 266 l16 -26 l6 30Z" fill="#ffab5c" {S}/>'
body += f'<path d="M1180 300 q8 6 16 0 M1204 300 q8 6 16 0" fill="none" {S}/><path d="M1030 350 q-50 20 -30 -30" fill="none" stroke="#ffab5c" stroke-width="18" stroke-linecap="round"/>'
body += zs(620, 230, 1.1)
# slippers
body += f'<ellipse cx="420" cy="800" rx="60" ry="24" fill="{PEACH}" {S}/><ellipse cx="520" cy="815" rx="60" ry="24" fill="{PEACH}" {S}/>'
svg('hero', 1600, 900, 'A cosy night of sleep', 'A smiling sleeper tucked under a patchwork duvet on a stack of plump pillows, with a crescent moon, stars, a sleepy cat and floating Zs.', body)

# ---------------- og (1200x630)
body = night_bg(1200, 630)
body += stars([(100, 90, 14), (300, 60, 9), (1100, 520, 12), (980, 80, 10), (60, 500, 8)])
body += moon(1030, 170, 90, NIGHT)
body += pillow(700, 230, 300, 110, CREAM) + pillow(640, 320, 380, 170, LAV, face=True)
body += (f'<text x="80" y="300" font-family="Fredoka,Trebuchet MS,sans-serif" font-weight="700" font-size="92" fill="#fff">Pillow</text>'
         f'<text x="80" y="400" font-family="Fredoka,Trebuchet MS,sans-serif" font-weight="700" font-size="92" fill="{MOON}">Exchange</text>'
         f'<text x="84" y="470" font-family="Nunito,Arial,sans-serif" font-weight="800" font-size="34" fill="{LAVS}">Sleep on it before you commit.</text>')
svg('og', 1200, 630, 'Pillow Exchange', 'Pillow Exchange share card: the brand name beside a smiling lavender pillow under a crescent moon.', body)

# ---------------- logo (200x200)
body = f'<circle cx="100" cy="100" r="96" fill="{NIGHT}"/>'
body += pillow(30, 80, 140, 80, LAV, face=True)
body += f'<circle cx="140" cy="55" r="26" fill="{MOON}"/><circle cx="152" cy="47" r="22" fill="{NIGHT}"/>'
body += stars([(55, 50, 9)])
svg('logo', 200, 200, 'Pillow Exchange logo', 'A smiling lavender pillow with a crescent moon on a midnight circle.', body)

W, H = 1200, 675

# ---------------- side sleeper
body = room_bg(W, H, '#e8e1ff', '#cbbcff')
body += f'<rect x="850" y="70" width="220" height="220" rx="110" fill="{NIGHT}"/>' + moon(960, 180, 60, NIGHT) + stars([(900, 120, 8), (1030, 250, 7)])
body += bed(120, 380, 900)
body += pillow(150, 250, 250, 150, CREAM)
# body lying on side: torso & legs
body += f'<path d="M330 330 Q520 260 720 320 Q880 360 980 400 L980 440 Q820 440 700 420 Q520 420 360 420Z" fill="{PEACH}" {S}/>'
body += f'<path d="M380 380 Q470 350 560 390" fill="none" {S}/>'
body += sleepy_head(290, 280, 62, hair='#3b2a5c', skin=SKIN2)
# alignment dotted line
body += f'<path d="M200 285 L1000 330" stroke="#e0772f" stroke-width="6" stroke-dasharray="4 16" stroke-linecap="round"/>'
body += f'<circle cx="200" cy="285" r="10" fill="#e0772f"/><circle cx="1000" cy="330" r="10" fill="#e0772f"/>'
# knee pillow
body += pillow(820, 330, 90, 70, MINT)
# ruler measuring gap
body += f'<rect x="90" y="250" width="30" height="150" rx="6" fill="{MOON}" {S}/>' + ''.join(f'<path d="M90 {265+i*20} h14" {S}/>' for i in range(7))
svg('side-sleeper-pillows', W, H, 'Side sleeping with the right pillow height', 'A person asleep on their side with a thick pillow keeping the head level with the spine, a dotted alignment line, a small pillow between the knees and a ruler showing the gap.', body)

# ---------------- back sleeper
body = night_bg(W, H, '#2c3470', NIGHT2) + stars([(120, 90, 12), (400, 60, 8), (700, 110, 10), (1080, 70, 14)]) + moon(960, 150, 70, '#2a3169')
body += bed(100, 390, 1000, frame='#6e53c4', sheet=LAVS)
body += pillow(130, 330, 260, 90, CREAM)
body += f'<path d="M210 395 Q260 360 300 380" fill="none" stroke="{LAV}" stroke-width="16" stroke-linecap="round"/>'  # neck roll
body += sleepy_head(250, 330, 58, hair='#8a4b2a')
body += f'<path d="M300 350 Q600 330 1040 360 L1050 420 Q600 440 300 420Z" fill="{MINT}" {S}/>'
body += pillow(760, 330, 120, 60, PEACH)  # knee pillow under covers bump
body += f'<path d="M700 356 Q820 290 940 356" fill="none" {S}/>'
body += zs(330, 260, .8)
svg('back-sleeper-pillows', W, H, 'Back sleeping with neck support', 'A person asleep on their back with a medium pillow and a small roll supporting the curve of the neck, a pillow under the knees, and stars outside.', body)

# ---------------- stomach sleeper
body = room_bg(W, H, '#fff1e6', '#ffd9c7')
body += f'<rect x="80" y="60" width="240" height="180" rx="16" fill="#bfe7ff" {S}/><path d="M200 60 v180 M80 150 h240" {S}/>'
body += bed(100, 380, 1000, frame='#e0772f', sheet='#fff')
body += pillow(140, 360, 250, 50, LAV)  # thin pillow
body += sleepy_head(260, 345, 55, hair='#2d2d2d', skin=SKIN)
body += f'<path d="M300 360 Q600 330 1040 370 L1050 420 Q600 430 300 420Z" fill="{MINT}" {S}/>'
body += pillow(560, 390, 180, 30, CREAM)  # hip pillow
# cat curled
body += f'<ellipse cx="930" cy="330" rx="70" ry="38" fill="#9aa0b8" {S}/><circle cx="880" cy="320" r="30" fill="#9aa0b8" {S}/><path d="M862 298 l2 -24 l16 16Z M890 294 l14 -20 l4 24Z" fill="#9aa0b8" {S}/><path d="M868 322 q6 5 12 0 M884 322 q6 5 12 0" fill="none" stroke="{INK}" stroke-width="4"/>'
body += zs(900, 260, .6, NIGHT)
svg('stomach-sleeper-pillows', W, H, 'Stomach sleeping on a thin pillow', 'A person sleeping face down on a thin soft lavender pillow, with a flat cushion under the hips and a grey cat curled on the duvet.', body)

# ---------------- combination
body = night_bg(W, H, '#303a7c', NIGHT2) + stars([(80, 80, 10), (1120, 90, 12), (600, 50, 8)])
body += pillow(380, 430, 440, 150, CREAM)
for i, (cx, col, rot) in enumerate([(300, MINT, -8), (600, LAV, 0), (900, PEACH, 8)]):
    body += f'<g transform="rotate({rot} {cx} 250)">'
    body += f'<rect x="{cx-90}" y="150" width="180" height="200" rx="40" fill="{col}" {S}/>'
    body += sleepy_head(cx, 150, 55, hair=['#3b2a5c', '#8a4b2a', '#2d2d2d'][i])
    body += '</g>'
body += f'<path d="M380 120 Q450 40 520 110" fill="none" stroke="{MOON}" stroke-width="8" stroke-linecap="round"/><path d="M520 110 l-26 -4 l14 -20Z" fill="{MOON}"/>'
body += f'<path d="M680 110 Q750 40 820 120" fill="none" stroke="{MOON}" stroke-width="8" stroke-linecap="round"/><path d="M820 120 l-4 -26 l-20 14Z" fill="{MOON}"/>'
body += (f'<text x="230" y="410" font-family="Fredoka,sans-serif" font-size="34" fill="#fff" font-weight="600">back</text>'
         f'<text x="560" y="410" font-family="Fredoka,sans-serif" font-size="34" fill="#fff" font-weight="600">side</text>'
         f'<text x="840" y="410" font-family="Fredoka,sans-serif" font-size="34" fill="#fff" font-weight="600">front</text>')
svg('combination-sleeper-pillows', W, H, 'A night of changing positions', 'The same sleeper shown three times in back, side and front poses with curved arrows between them above a rectangular pillow.', body)

# ---------------- fills explained: cross-section
body = f'<rect width="{W}" height="{H}" fill="{LAVS}"/>'
body += pillow(110, 110, 980, 460, '#fff')
cells = [(170, 170, '#fff4d6'), (480, 170, '#e9f2ff'), (790, 170, '#f3ecff'), (170, 380, '#fff'), (480, 380, '#e8fbf3'), (790, 380, '#fbecd9')]
for x, y, c in cells:
    body += f'<rect x="{x}" y="{y}" width="240" height="170" rx="18" fill="{c}" {S}/>'
# feathers
for i in range(3):
    fx, fy = 210 + i * 70, 200 + (i % 2) * 40
    body += f'<path d="M{fx} {fy+100} Q{fx+10} {fy+40} {fx+40} {fy}" fill="none" {S}/><path d="M{fx+40} {fy} Q{fx-10} {fy+30} {fx+5} {fy+80} Q{fx+50} {fy+50} {fx+40} {fy}Z" fill="{MOON}" stroke="{INK}" stroke-width="3"/>'
# memory foam block with dent
body += f'<path d="M510 220 h180 v100 h-180Z" fill="#b8d4ff" {S}/><path d="M540 220 Q600 270 660 220" fill="#e9f2ff" {S}/>'
# latex pinholes
body += f'<rect x="820" y="210" width="180" height="110" rx="14" fill="{LAV}" {S}/>' + ''.join(f'<circle cx="{850+ (i%5)*30}" cy="{235+ (i//5)*30}" r="7" fill="{LAVS}"/>' for i in range(15))
# fibre puffs
for i in range(6):
    body += f'<circle cx="{215+(i%3)*70}" cy="{430+(i//3)*60}" r="{26+(i%2)*6}" fill="#fff" stroke="{INK}" stroke-width="3" stroke-dasharray="6 5"/>'
# shredded foam
import random
random.seed(7)
for i in range(14):
    x = 510 + random.randint(0, 170); y = 400 + random.randint(0, 110)
    body += f'<rect x="{x}" y="{y}" width="{random.randint(22,40)}" height="{random.randint(14,24)}" rx="4" fill="{MINT}" stroke="{INK}" stroke-width="3" transform="rotate({random.randint(-40,40)} {x} {y})"/>'
# buckwheat hulls
for i in range(22):
    x = 815 + random.randint(0, 180); y = 405 + random.randint(0, 110)
    body += f'<path d="M{x} {y} l12 -18 l12 18Z" fill="#b07a3a" stroke="{INK}" stroke-width="2.5" transform="rotate({random.randint(0,120)} {x+12} {y-6})"/>'
labels = [(290, 'down &amp; feather', 165), (600, 'memory foam', 165), (910, 'latex', 165), (290, 'fibre', 575), (600, 'shredded foam', 575), (910, 'buckwheat', 575)]
for x, t, y in labels:
    body += f'<text x="{x}" y="{y-12 if y<300 else 372}" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="600" font-size="30" fill="{NIGHT}">{t}</text>'
svg('pillow-fills-explained', W, H, 'Inside a pillow: six common fills', 'A pillow opened like a cross-section with six compartments showing feathers, a memory foam block with a dent, pin-cored latex, fibre puffs, shredded foam and buckwheat hulls.', body)

# ---------------- loft & firmness
body = f'<rect width="{W}" height="{H}" fill="#fffdf8"/>'
body += ''.join(f'<path d="M0 {y} H{W}" stroke="#e3def6" stroke-width="2"/>' for y in range(75, H, 50))
body += ''.join(f'<path d="M{x} 0 V{H}" stroke="#e3def6" stroke-width="2"/>' for x in range(50, W, 50))
body += f'<rect x="0" y="560" width="{W}" height="115" fill="{LAVS}"/><path d="M0 560 H{W}" {S}/>'
for i, (x, h, col, sink) in enumerate([(150, 70, MINT, 20), (480, 140, MOON, 40), (820, 220, PEACH, 50)]):
    body += pillow(x, 560 - h, 250, h, col)
    body += f'<path d="M{x+70} {560-h} Q{x+125} {560-h+sink} {x+180} {560-h}" fill="#fff" stroke="{INK}" stroke-width="4"/>'
    body += sleepy_head(x + 125, 560 - h + sink - 50, 48, hair=['#3b2a5c', '#8a4b2a', '#2d2d2d'][i])
    body += f'<text x="{x+125}" y="630" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="600" font-size="34" fill="{NIGHT}">{["low","medium","high"][i]}</text>'
body += f'<rect x="1100" y="200" width="44" height="360" rx="8" fill="{MOON}" {S}/>' + ''.join(f'<path d="M1100 {220+i*30} h{24 if i%2 else 14}" {S}/>' for i in range(12))
body += f'<path d="M1122 150 v40" {S}/><path d="M1108 170 l14 -24 l14 24" fill="none" {S}/>'
svg('pillow-loft-and-firmness', W, H, 'Low, medium and high loft pillows', 'Three pillows of increasing height on a measuring grid, each with a sleepy cartoon head pressing a dent into it, and a ruler beside them.', body)

# ---------------- wash
body = room_bg(W, H, '#e1f7ef', '#bfe9da')
body += f'<rect x="360" y="110" width="440" height="470" rx="40" fill="#fff" {S}/><rect x="360" y="110" width="440" height="90" rx="40" fill="{LAVS}" {S}/>'
body += f'<circle cx="430" cy="155" r="16" fill="{PEACH}" {S}/><circle cx="480" cy="155" r="16" fill="{MINT}" {S}/><rect x="600" y="140" width="150" height="30" rx="10" fill="{NIGHT}"/>'
body += f'<circle cx="580" cy="380" r="150" fill="#bfe0ff" {S}/><circle cx="580" cy="380" r="118" fill="#d8ecff" stroke="{INK}" stroke-width="4"/>'
body += f'<g transform="rotate(-18 580 380)">' + pillow(490, 330, 180, 100, CREAM, face=True) + '</g>'
body += f'<circle cx="520" cy="460" r="22" fill="#d6f25a" {S}/><path d="M500 452 q20 14 40 0" fill="none" stroke="#fff" stroke-width="4"/><circle cx="650" cy="310" r="22" fill="#d6f25a" {S}/><path d="M630 318 q20 -14 40 0" fill="none" stroke="#fff" stroke-width="4"/>'
for x, y, r in [(860, 150, 26), (900, 230, 16), (820, 90, 14), (300, 200, 20), (260, 120, 12), (940, 340, 22)]:
    body += f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" fill-opacity=".7" stroke="{INK}" stroke-width="3"/><circle cx="{x-r*.35}" cy="{y-r*.35}" r="{r*.2}" fill="#fff"/>'
body += f'<path d="M860 460 H1140" stroke="{INK}" stroke-width="4"/><path d="M960 460 l-6 20 M1040 460 l6 20" stroke="{INK}" stroke-width="4"/>'
body += f'<rect x="950" y="478" width="110" height="80" rx="8" fill="#fff" {S}/><path d="M968 520 h30 l6 -20 h12 l6 20 h20" fill="none" stroke="{INK}" stroke-width="4"/><text x="1005" y="548" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="600" font-size="20" fill="{INK}">30&#176;</text>'
body += f'<rect x="120" y="470" width="120" height="100" rx="14" fill="{PEACH}" {S}/><rect x="150" y="440" width="60" height="36" rx="8" fill="{PEACH}" {S}/><text x="180" y="530" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="600" font-size="24" fill="{INK}">mild</text>'
svg('how-to-wash-a-pillow', W, H, 'Washing a pillow', 'A front-loading washing machine with a smiling pillow tumbling inside next to two tennis balls, bubbles floating up, a detergent bottle labelled mild and a care label pinned to a line.', body)

# ---------------- replace
body = room_bg(W, H, '#fff4d6', '#ffe3a3')
body += f'<rect x="880" y="70" width="200" height="190" rx="14" fill="#fff" {S}/><rect x="880" y="70" width="200" height="44" rx="14" fill="{PEACH}" {S}/>'
body += ''.join(f'<rect x="{900+(i%5)*34}" y="{128+(i//5)*40}" width="24" height="24" rx="4" fill="{LAVS}"/>' for i in range(15))
body += f'<path d="M1006 170 l12 14 l22 -30" fill="none" stroke="#e0772f" stroke-width="7" stroke-linecap="round"/>'
body += f'<circle cx="200" cy="170" r="90" fill="#fff" {S}/><path d="M200 170 V115 M200 170 L240 190" {S}/>'
# old sad folded pillow
body += f'<path d="M150 470 Q300 400 470 470 L470 540 Q300 560 150 540Z" fill="#e8dcb8" {S}/><path d="M150 470 Q300 430 470 470" fill="none" {S}/>'
body += f'<path d="M260 500 q8 -8 16 0 M330 500 q8 -8 16 0" fill="none" {S}/><path d="M285 530 q20 -14 40 0" fill="none" {S}/>'
body += f'<ellipse cx="210" cy="520" rx="20" ry="12" fill="#d9c890"/><ellipse cx="420" cy="505" rx="24" ry="14" fill="#d9c890"/>'
body += f'<path d="M180 400 q10 -24 20 0 q10 -24 20 0" fill="none" stroke="{INK}" stroke-width="4"/>'
# new happy pillow
body += pillow(640, 360, 360, 200, '#fff', face=True)
body += stars([(620, 340, 18), (1030, 380, 14), (820, 320, 10)], '#e0772f')
body += f'<path d="M500 470 H600" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><path d="M590 455 l18 15 l-18 15" fill="none" {S}/>'
svg('when-to-replace-your-pillow', W, H, 'Time for a new pillow', 'A tired, stained and flattened old pillow with a droopy face next to a plump smiling new pillow, with a wall clock and a calendar with a date ticked.', body)

# ---------------- travel
body = f'<rect width="{W}" height="{H}" fill="#cfd6f2"/>'
body += f'<rect x="120" y="70" width="380" height="480" rx="170" fill="#e8ecfb" {S}/><rect x="150" y="100" width="320" height="420" rx="150" fill="{NIGHT}"/>'
body += stars([(230, 180, 12), (400, 230, 9), (300, 420, 7)]) + moon(360, 190, 45, NIGHT)
body += '<ellipse cx="250" cy="360" rx="80" ry="26" fill="#fff" opacity=".85"/><ellipse cx="380" cy="440" rx="70" ry="22" fill="#fff" opacity=".85"/>'
# seat
body += f'<rect x="560" y="120" width="400" height="520" rx="60" fill="#5a67b8" {S}/><rect x="600" y="140" width="320" height="120" rx="40" fill="#6d7bd0" {S}/>'
# person
body += f'<path d="M620 640 Q620 420 760 400 Q900 420 900 640Z" fill="{PEACH}" {S}/>'
body += f'<path d="M660 360 Q760 470 860 360 Q880 400 850 420 Q760 480 670 420 Q640 400 660 360Z" fill="{MINT}" {S}/>'  # wrap pillow
body += sleepy_head(770, 300, 72, hair='#3b2a5c', skin=SKIN2)
body += f'<rect x="712" y="282" width="116" height="36" rx="16" fill="{LAV}" {S}/><path d="M700 290 L712 296 M840 296 L852 290" {S}/>'  # eye mask
body += zs(860, 240, .7, NIGHT)
body += f'<rect x="980" y="480" width="150" height="110" rx="18" fill="{MOON}" {S}/><path d="M1020 480 v-30 h70 v30" fill="none" {S}/>'
svg('travel-pillows', W, H, 'Sleeping on a night flight', 'A traveller asleep in an aeroplane window seat wearing a wrap-style travel pillow and eye mask, with clouds, stars and a crescent moon outside the window.', body)

# ---------------- sleep hygiene
body = night_bg(W, H, '#3a3f86', '#262b63')
body += f'<rect x="760" y="70" width="330" height="260" rx="20" fill="#1a1f47" {S}/><path d="M925 70 v260 M760 200 h330" stroke="{INK}" stroke-width="6"/>' + moon(860, 140, 40, '#1a1f47') + stars([(1010, 120, 10), (1040, 260, 8), (820, 270, 7)])
body += f'<path d="M740 60 q40 150 0 290 h-40 V60Z" fill="{LAV}" {S}/><path d="M1110 60 q-40 150 0 290 h40 V60Z" fill="{LAV}" {S}/>'
body += f'<rect x="0" y="520" width="{W}" height="155" fill="#4b4f9a"/>'
body += bed(420, 390, 640, frame='#8a6ad8', sheet=LAVS)
body += pillow(450, 350, 200, 70, CREAM)
body += f'<path d="M520 400 Q760 350 1040 400 L1050 470 Q760 490 520 470Z" fill="{PEACH}" {S}/>'
# bedside table + lamp + book
body += f'<rect x="180" y="400" width="190" height="170" rx="14" fill="#c7a36a" {S}/><path d="M180 480 h190" {S}/>'
body += f'<path d="M275 400 v-90" {S}/><path d="M215 310 h120 l-25 -80 h-70Z" fill="{MOON}" {S}/>'
body += f'<circle cx="275" cy="330" r="130" fill="{MOON}" opacity=".15"/>'
body += f'<rect x="200" y="380" width="110" height="22" rx="4" fill="{MINT}" {S}/>'
# thermometer
body += f'<rect x="90" y="170" width="30" height="170" rx="15" fill="#fff" {S}/><circle cx="105" cy="350" r="26" fill="#7fb6ff" {S}/><rect x="98" y="270" width="14" height="80" fill="#7fb6ff"/>'
# phone charging across room
body += f'<rect x="1120" y="560" width="46" height="80" rx="8" fill="{NIGHT2}" {S}/><path d="M1143 560 q0 -40 -40 -40 h-60" fill="none" stroke="{INK}" stroke-width="4"/><path d="M1138 590 l10 -12 v10 l10 -12" fill="none" stroke="{MINT}" stroke-width="4"/>'
svg('sleep-hygiene-basics', W, H, 'A calm bedroom for sleep', 'A calm bedroom at dusk with a warm bedside lamp and closed book, a phone charging across the room, a thermometer reading cool, and a crescent moon in the curtained window.', body)

# ---------------- hot sleepers
body = f'<rect width="{W}" height="{H}" fill="#e1f3ff"/>'
# grumpy sun being waved away
body += f'<circle cx="190" cy="170" r="80" fill="#ffb347" {S}/>' + ''.join(f'<path d="M{190+110*__import__("math").cos(a/8*6.283)} {170+110*__import__("math").sin(a/8*6.283)} L{190+140*__import__("math").cos(a/8*6.283)} {170+140*__import__("math").sin(a/8*6.283)}" {S}/>' for a in range(8))
body += f'<path d="M160 160 l20 6 M220 160 l-20 6" {S}/><path d="M165 210 q25 -18 50 0" fill="none" {S}/><path d="M230 120 q10 -14 14 0 q4 14 -14 14Z" fill="#7fb6ff" stroke="{INK}" stroke-width="3"/>'
body += f'<path d="M300 250 L380 330" stroke="{INK}" stroke-width="5" stroke-dasharray="6 12"/>'
# pillow with airflow
body += pillow(380, 300, 520, 230, '#fff', face=True)
for i in range(4):
    y = 330 + i * 50
    body += f'<path d="M300 {y} q60 -30 120 0 t120 0 t120 0 t120 0 t120 0 t120 0" fill="none" stroke="#7fb6ff" stroke-width="7" stroke-linecap="round" opacity=".8"/>'
# fan
body += f'<circle cx="1020" cy="380" r="110" fill="#fff" {S}/>'
for a in (0, 120, 240):
    body += f'<path d="M1020 380 q60 -90 0 -95 q-40 10 0 95Z" fill="{MINT}" stroke="{INK}" stroke-width="4" transform="rotate({a} 1020 380)"/>'
body += f'<circle cx="1020" cy="380" r="16" fill="{NIGHT}"/><path d="M1020 490 v90 M960 590 h120" {S}/>'
# snowflake
body += f'<g transform="translate(980 120)" stroke="{NIGHT}" stroke-width="6" stroke-linecap="round">' + ''.join(f'<path d="M0 0 L0 -50 M0 -30 l-12 -12 M0 -30 l12 -12" transform="rotate({a})"/>' for a in range(0, 360, 60)) + '</g>'
svg('pillows-for-hot-sleepers', W, H, 'Keeping a pillow cool', 'A smiling pillow with wavy blue airflow lines passing through it, a mint fan blowing, a snowflake, and a grumpy sweating sun being shooed away.', body)

# ---------------- trying a new pillow
body = room_bg(W, H, '#f3ecff', '#dccfff')
body += bed(560, 390, 540, frame='#8a6ad8', sheet='#fff')
body += pillow(600, 280, 330, 140, MOON, face=True)
body += f'<path d="M930 300 l60 -40" stroke="{INK}" stroke-width="4"/><rect x="980" y="226" width="80" height="50" rx="10" fill="#fff" {S} transform="rotate(-20 1020 250)"/><text x="1012" y="262" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="600" font-size="22" fill="{INK}" transform="rotate(-20 1020 250)">new!</text>'
# bedside table
body += f'<rect x="90" y="360" width="400" height="210" rx="16" fill="#c7a36a" {S}/>'
# notebook with grid
body += f'<g transform="rotate(-6 280 280)"><rect x="130" y="170" width="320" height="200" rx="10" fill="#fff" {S}/>'
for r in range(3):
    for c in range(7):
        x = 150 + c * 42; y = 200 + r * 52
        body += f'<rect x="{x}" y="{y}" width="30" height="30" rx="5" fill="{LAVS}" stroke="{INK}" stroke-width="3"/>'
        if r * 7 + c < 10:
            body += f'<path d="M{x+6} {y+16} l7 8 l12 -16" fill="none" stroke="#3bb592" stroke-width="4" stroke-linecap="round"/>'
body += '</g>'
body += f'<rect x="420" y="160" width="14" height="140" rx="4" fill="{MOON}" {S} transform="rotate(30 427 230)"/>'
# alarm clock
body += f'<circle cx="190" cy="460" r="60" fill="{PEACH}" {S}/><circle cx="190" cy="460" r="44" fill="#fff" {S}/><path d="M190 460 v-28 M190 460 l20 10" {S}/><circle cx="150" cy="400" r="16" fill="{PEACH}" {S}/><circle cx="230" cy="400" r="16" fill="{PEACH}" {S}/>'
body += f'<text x="330" y="480" font-family="Fredoka,sans-serif" font-weight="700" font-size="42" fill="{NIGHT}">14 nights</text>'
svg('trying-a-new-pillow', W, H, 'Trialling a new pillow for two weeks', 'A bedside table with a notebook showing a two-week tick chart, a pencil and an alarm clock, next to a bed with a smiling new pillow wearing a tag.', body)
print('ok', len(os.listdir(OUT)))
