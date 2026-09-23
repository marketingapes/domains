#!/usr/bin/env python3
"""Generate original SVG illustrations for What Is Working Capital."""
import os, math, json, re, glob

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(OUT, exist_ok=True)

INK = '#16202e'; GOLD = '#d4a72c'; GOLDS = '#f6e7b8'; MINT = '#2f9e78'; MINTS = '#d9f2e8'
CORAL = '#e8604c'; CORALS = '#fde2dc'; SKY = '#8ecae6'; SKYS = '#e2f2fa'; CREAM = '#faf7ef'
KRAFT = '#c9965a'; KRAFTD = '#a8773f'; SKIN1 = '#f2c7a5'; SKIN2 = '#b97a56'; SKIN3 = '#7a4b33'
S = f'stroke="{INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"'
S4 = f'stroke="{INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"'


def svg(w, h, title, desc, body, bg=SKYS):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-labelledby="t d">
<title id="t">{title}</title>
<desc id="d">{desc}</desc>
<rect width="{w}" height="{h}" fill="{bg}"/>
{body}
</svg>
'''


def sparkle(x, y, s=1, c=GOLD):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0 -22 L6 -6 L22 0 L6 6 L0 22 L-6 6 L-22 0 L-6 -6Z" fill="{c}" {S4}/>'


def cloud(x, y, s=1):
    return f'<g transform="translate({x} {y}) scale({s})"><path d="M-80 20 Q-80 -20 -40 -20 Q-30 -60 10 -55 Q50 -70 60 -25 Q100 -25 95 20 Z" fill="#fff" {S4}/></g>'


def coin(x, y, r=34, c=GOLD):
    return (f'<g transform="translate({x} {y})"><circle r="{r}" fill="{c}" {S}/>'
            f'<circle r="{r*0.68:.1f}" fill="none" stroke="{INK}" stroke-width="3" opacity=".5"/>'
            f'<text y="{r*0.36:.1f}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="{r*1.05:.0f}" fill="{INK}">$</text></g>')


def box(x, y, w, h, c=KRAFT, label=''):
    t = f'<text x="{x+w/2}" y="{y+h*0.72}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="{h*0.32:.0f}" fill="{INK}" opacity=".55">{label}</text>' if label else ''
    return (f'<g><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{c}" {S}/>'
            f'<rect x="{x+w/2-w*0.09}" y="{y}" width="{w*0.18}" height="{h*0.35}" fill="{GOLDS}" {S4}/>{t}</g>')


def invoice(x, y, w=110, h=140, rot=0, c='#fff', stamp=None):
    lines = ''.join(f'<line x1="{16}" y1="{40+i*20}" x2="{w-16 - (30 if i%2 else 0)}" y2="{40+i*20}" stroke="{INK}" stroke-width="4" opacity=".35"/>' for i in range(int((h-60)/20)))
    st = ''
    if stamp:
        st = f'<g transform="translate({w/2} {h-26}) rotate(-12)"><rect x="-38" y="-16" width="76" height="30" rx="6" fill="none" stroke="{stamp[1]}" stroke-width="4"/><text y="7" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="17" fill="{stamp[1]}">{stamp[0]}</text></g>'
    return (f'<g transform="translate({x} {y}) rotate({rot})"><path d="M0 0 H{w-24} L{w} 24 V{h} H0Z" fill="{c}" {S}/>'
            f'<path d="M{w-24} 0 V24 H{w}" fill="none" {S4}/><rect x="16" y="14" width="{w*0.4:.0f}" height="12" rx="4" fill="{GOLD}"/>{lines}{st}</g>')


def person(x, y, s=1, shirt=MINT, skin=SKIN1, hair=INK, arm='down', mood='smile', hairstyle='short', pants=INK):
    """Standing character; (x,y) = feet centre."""
    arms = {
        'down': f'<path d="M-44 -150 Q-70 -110 -62 -70" fill="none" {S} stroke-width="14"/><path d="M44 -150 Q70 -110 62 -70" fill="none" {S} stroke-width="14"/>',
        'up': f'<path d="M-44 -150 Q-80 -190 -70 -240" fill="none" {S} stroke-width="14"/><path d="M44 -150 Q80 -190 70 -240" fill="none" {S} stroke-width="14"/>',
        'wave': f'<path d="M-44 -150 Q-70 -110 -62 -70" fill="none" {S} stroke-width="14"/><path d="M44 -150 Q90 -170 88 -230" fill="none" {S} stroke-width="14"/>',
        'forward': f'<path d="M-44 -150 Q-70 -110 -62 -70" fill="none" {S} stroke-width="14"/><path d="M44 -150 Q80 -130 110 -135" fill="none" {S} stroke-width="14"/>',
        'both': f'<path d="M-44 -150 Q-80 -130 -110 -135" fill="none" {S} stroke-width="14"/><path d="M44 -150 Q80 -130 110 -135" fill="none" {S} stroke-width="14"/>',
    }[arm]
    arms_skin = arms.replace(f'stroke="{INK}" stroke-width="6"', f'stroke="{skin}" stroke-width="6"')
    mouth = {'smile': '<path d="M-12 -218 Q0 -206 12 -218" fill="none" stroke="#16202e" stroke-width="4" stroke-linecap="round"/>',
             'o': '<circle cx="0" cy="-214" r="6" fill="#16202e"/>',
             'flat': '<line x1="-10" y1="-214" x2="10" y2="-214" stroke="#16202e" stroke-width="4" stroke-linecap="round"/>'}[mood]
    hairp = {'short': f'<path d="M-36 -250 Q-38 -292 0 -294 Q38 -292 36 -250 Q20 -270 -36 -250Z" fill="{hair}"/>',
             'bun': f'<circle cx="0" cy="-298" r="16" fill="{hair}"/><path d="M-37 -245 Q-40 -290 0 -292 Q40 -290 37 -245 Q10 -272 -37 -245Z" fill="{hair}"/>',
             'long': f'<path d="M-40 -200 Q-46 -294 0 -294 Q46 -294 40 -200 L30 -200 Q34 -262 0 -266 Q-34 -262 -30 -200Z" fill="{hair}"/>',
             'cap': f'<path d="M-38 -254 Q-36 -294 0 -294 Q36 -294 38 -254Z" fill="{CORAL}" {S4}/><path d="M20 -256 H66" {S4} stroke-width="8"/>'}[hairstyle]
    return f'''<g transform="translate({x} {y}) scale({s})">
<rect x="-30" y="-80" width="24" height="80" rx="10" fill="{pants}"/><rect x="6" y="-80" width="24" height="80" rx="10" fill="{pants}"/>
<ellipse cx="-20" cy="-2" rx="22" ry="9" fill="{INK}"/><ellipse cx="20" cy="-2" rx="22" ry="9" fill="{INK}"/>
<g>{arms}</g><g>{arms_skin.replace('stroke-width="14"','stroke-width="8"')}</g>
<rect x="-46" y="-175" width="92" height="105" rx="30" fill="{shirt}" {S}/>
<circle cx="0" cy="-230" r="40" fill="{skin}" {S}/>
{hairp}
<circle cx="-14" cy="-232" r="5" fill="{INK}"/><circle cx="14" cy="-232" r="5" fill="{INK}"/>
<circle cx="-24" cy="-218" r="6" fill="{CORAL}" opacity=".45"/><circle cx="24" cy="-218" r="6" fill="{CORAL}" opacity=".45"/>
{mouth}
</g>'''


def ground(w, h, y, c=MINTS):
    return f'<path d="M0 {y} Q{w*0.25} {y-18} {w*0.5} {y} T{w} {y} V{h} H0Z" fill="{c}" {S}/>'


def shelf(x, y, w, h, rows=3):
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff" {S}/>']
    for i in range(1, rows):
        yy = y + h * i / rows
        out.append(f'<line x1="{x}" y1="{yy}" x2="{x+w}" y2="{yy}" {S}/>')
    return ''.join(out)


def van(x, y, s=1, c=CORAL, label=''):
    return f'''<g transform="translate({x} {y}) scale({s})">
<path d="M0 -150 H230 V-10 H0Z" fill="#fff" {S}/>
<path d="M230 -110 H300 L340 -60 V-10 H230Z" fill="{c}" {S}/>
<path d="M245 -98 H292 L322 -62 H245Z" fill="{SKYS}" {S4}/>
<text x="115" y="-70" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="34" fill="{INK}">{label}</text>
<circle cx="70" cy="-8" r="30" fill="{INK}"/><circle cx="70" cy="-8" r="12" fill="#ccc"/>
<circle cx="280" cy="-8" r="30" fill="{INK}"/><circle cx="280" cy="-8" r="12" fill="#ccc"/>
</g>'''


def plant(x, y, s=1):
    return f'''<g transform="translate({x} {y}) scale({s})">
<path d="M0 -60 Q-4 -120 0 -170" fill="none" stroke="{MINT}" stroke-width="10" stroke-linecap="round"/>
<path d="M0 -120 Q-60 -150 -70 -110 Q-30 -95 0 -120Z" fill="{MINT}" {S4}/>
<path d="M0 -150 Q60 -190 72 -140 Q30 -125 0 -150Z" fill="{MINT}" {S4}/>
<path d="M-40 -60 H40 L30 0 H-30Z" fill="{CORAL}" {S}/>
</g>'''


def _dedupe(tag):
    m = re.match(r'<([\w:-]+)(.*?)(/?)>$', tag, re.S)
    if not m:
        return tag
    attrs = re.findall(r'\s([\w:-]+)="([^"]*)"', m.group(2))
    d = {}
    for k, v in attrs:
        d.pop(k, None); d[k] = v
    return '<' + m.group(1) + ''.join(f' {k}="{v}"' for k, v in d.items()) + m.group(3) + '>'


def write(name, content):
    content = re.sub(r'<(?![/!?])[^>]+>', lambda m: _dedupe(m.group(0)), content)
    import xml.dom.minidom
    xml.dom.minidom.parseString(content)
    with open(os.path.join(OUT, name), 'w') as f:
        f.write(content)


W, H = 1200, 675

# ---------------- brand assets ----------------
logo = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-labelledby="t">
<title id="t">What Is Working Capital logo</title>
<rect x="2" y="2" width="60" height="60" rx="16" fill="{GOLD}" stroke="{INK}" stroke-width="4"/>
<path d="M12 44 L32 36 L52 44" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>
<path d="M32 36 V50" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>
<path d="M26 52 H38" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>
<circle cx="20" cy="30" r="9" fill="#fff" stroke="{INK}" stroke-width="3.5"/>
<text x="20" y="34.5" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="13" fill="{INK}">$</text>
<rect x="37" y="22" width="16" height="14" rx="2" fill="{MINT}" stroke="{INK}" stroke-width="3.5"/>
</svg>
'''
write('logo.svg', logo)

hero_body = f'''
{cloud(220, 140, 1.1)}{cloud(1280, 110, 0.9)}{sparkle(760, 90, 1.2)}{sparkle(1480, 300, 0.8, CORAL)}{sparkle(120, 360, 0.7, MINT)}
<circle cx="1420" cy="150" r="70" fill="{GOLD}" {S}/>
{ground(1600, 900, 720)}
<!-- shop -->
<g>
<rect x="420" y="260" width="620" height="470" fill="{CREAM}" {S}/>
<path d="M400 260 H1060 L1030 180 H430Z" fill="{CORAL}" {S}/>
<path d="M430 260 v40 a37 37 0 0 0 74 0 v-40 M504 260 v40 a37 37 0 0 0 74 0 v-40 M578 260 v40 a37 37 0 0 0 74 0 v-40 M652 260 v40 a37 37 0 0 0 74 0 v-40 M726 260 v40 a37 37 0 0 0 74 0 v-40 M800 260 v40 a37 37 0 0 0 74 0 v-40 M874 260 v40 a37 37 0 0 0 74 0 v-40 M948 260 v40 a37 37 0 0 0 74 0 v-40" fill="#fff" {S4}/>
<rect x="560" y="200" width="340" height="44" rx="10" fill="#fff" {S4}/>
<text x="730" y="232" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="28" fill="{INK}">THE LITTLE SHOP</text>
{shelf(460, 360, 230, 240, 3)}
{box(475, 380, 60, 55, KRAFT)}{box(545, 390, 50, 45, MINT)}{box(605, 375, 70, 60, KRAFT)}
{box(470, 460, 80, 55, GOLD)}{box(560, 465, 55, 50, KRAFT)}{box(625, 455, 55, 60, CORAL)}
{box(480, 540, 60, 55, KRAFT)}{box(560, 545, 110, 50, SKY)}
<rect x="720" y="560" width="290" height="170" rx="10" fill="{GOLD}" {S}/>
<rect x="760" y="510" width="90" height="60" rx="8" fill="#fff" {S}/>
<rect x="772" y="522" width="66" height="22" rx="4" fill="{MINTS}"/>
</g>
{person(900, 560, 0.95, shirt=MINT, skin=SKIN2, hair=INK, arm='wave', hairstyle='bun')}
<!-- jar of coins -->
<path d="M740 480 Q736 420 760 410 H830 Q854 420 850 480 V560 H740Z" fill="{SKYS}" opacity=".9" {S}/>
{coin(770, 520, 22)}{coin(815, 530, 22)}{coin(795, 492, 22)}
<!-- customer + coins flying -->
{person(250, 830, 1.0, shirt=SKY, skin=SKIN1, hair='#7a4b33', arm='forward', hairstyle='long', pants='#3b4658')}
<path d="M380 670 Q520 520 740 470" fill="none" stroke="{INK}" stroke-width="4" stroke-dasharray="4 16" stroke-linecap="round"/>
{coin(460, 580, 26)}{coin(580, 500, 26)}
<!-- van with bills -->
{van(1120, 830, 1.1, CORAL, 'SUPPLIES')}
{invoice(1180, 560, 90, 110, -10)}{invoice(1290, 540, 90, 110, 8)}
<path d="M1260 690 Q1150 640 1060 640" fill="none" stroke="{INK}" stroke-width="4" stroke-dasharray="4 16" stroke-linecap="round"/>
{plant(120, 830, 1.1)}{plant(1540, 830, 0.8)}
'''
write('hero.svg', svg(1600, 900, 'A busy little shop', 'A shopkeeper waves from behind a counter while a customer hands over coins that fly into a jar, shelves hold boxes of stock, and a supply van waits outside with bills to be paid.', hero_body))

og_body = f'''
{sparkle(1120, 290, 1.1)}{sparkle(90, 300, 0.8, CORAL)}
{ground(1200, 630, 520)}
<path d="M300 470 L900 390" {S} stroke-width="14"/>
<path d="M600 430 L560 520 H640Z" fill="{GOLD}" {S}/>
{coin(380, 400, 50)}{box(470, 348, 110, 90, KRAFT)}
{invoice(760, 272, 100, 125, 8)}
<text x="600" y="130" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="76" fill="{INK}">What Is Working Capital</text>
<text x="600" y="190" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" fill="{INK}">Small-business finance in plain English</text>
'''
write('og.svg', svg(1200, 630, 'What Is Working Capital', 'Share card: a coin, a box of stock and an invoice balanced on a see-saw under the site name.', og_body, bg=GOLDS))

# ---------------- article heroes ----------------
A = {}

A['what-is-working-capital'] = ('See-saw of assets and bills', f'''
{cloud(200, 120)}{sparkle(1040, 110, 1)}{ground(W, H, 560)}
<path d="M200 430 L1000 360" {S} stroke-width="16"/>
<path d="M600 398 L540 560 H660Z" fill="{GOLD}" {S}/>
<path d="M230 330 Q210 440 300 440 H380 Q470 440 450 330Z" fill="{KRAFT}" {S}/>
<path d="M240 330 Q340 290 440 330" fill="none" {S}/>
{coin(290, 300, 30)}{coin(350, 285, 30)}{box(380, 250, 70, 60, MINT)}{invoice(250, 190, 70, 90, -14)}
{invoice(800, 250, 90, 110, 6, CORALS)}{invoice(870, 230, 90, 110, -6, '#fff')}{invoice(830, 205, 90, 110, 3, GOLDS)}
{person(1080, 650, 0.5, shirt=CORAL, skin=SKIN2, arm='up', mood='o', hairstyle='short')}
<text x="330" y="500" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="30" fill="{INK}">assets</text>
<text x="880" y="430" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="30" fill="{INK}">bills</text>
''')

A['current-ratio-vs-quick-ratio'] = ('Three measuring cups', f'''
{sparkle(1080, 100, 0.9, CORAL)}{sparkle(120, 140, 0.8)}
<rect x="0" y="540" width="{W}" height="135" fill="{KRAFT}" {S}/>
<path d="M160 260 H400 L380 540 H180Z" fill="#fff" {S}/><path d="M172 360 H388 L380 540 H180Z" fill="{GOLDS}"/>
{box(200, 430, 70, 60, KRAFT)}{coin(320, 470, 30)}{invoice(250, 370, 60, 70, 10)}
<path d="M480 300 H700 L682 540 H498Z" fill="#fff" {S}/><path d="M488 400 H692 L682 540 H498Z" fill="{MINTS}"/>
{coin(550, 490, 30)}{invoice(600, 430, 60, 70, -8)}
<path d="M780 350 H980 L964 540 H796Z" fill="#fff" {S}/><path d="M788 460 H972 L964 540 H796Z" fill="{SKYS}"/>
{coin(880, 500, 30)}
<path d="M400 290 q40 0 40 40" fill="none" {S}/><path d="M700 330 q40 0 40 40" fill="none" {S}/><path d="M980 380 q40 0 40 40" fill="none" {S}/>
<text x="280" y="240" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="34" fill="{INK}">current</text>
<text x="590" y="280" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="34" fill="{INK}">quick</text>
<text x="880" y="330" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="34" fill="{INK}">cash</text>
''', GOLDS)

A['cash-conversion-cycle'] = ('Coin on a conveyor loop', f'''
{cloud(1050, 110, .8)}{ground(W, H, 590)}
<rect x="170" y="170" width="860" height="330" rx="165" fill="none" stroke="{INK}" stroke-width="40"/>
<rect x="170" y="170" width="860" height="330" rx="165" fill="none" stroke="{GOLD}" stroke-width="26" stroke-dasharray="30 18"/>
<!-- warehouse -->
<path d="M230 130 L320 80 L410 130 V240 H230Z" fill="{KRAFT}" {S}/><rect x="290" y="170" width="60" height="70" fill="{CREAM}" {S4}/>
<!-- mailbox -->
<rect x="780" y="80" width="140" height="90" rx="40" fill="{SKY}" {S}/><rect x="840" y="170" width="20" height="70" fill="{INK}"/>
{invoice(810, 50, 60, 70, -12)}
<!-- truck -->
{van(440, 600, 0.65, MINT, 'SUPPLIER')}
{coin(600, 170, 40)}{coin(1030, 340, 30)}{coin(170, 340, 30)}
<path d="M640 150 l30 20 -30 20" fill="none" {S}/>
<text x="600" y="355" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="46" fill="{INK}">DIO + DSO − DPO</text>
''')

A['negative-working-capital'] = ('Café counter and supplier van', f'''
{sparkle(1100, 90, .9)}
<rect x="0" y="560" width="{W}" height="115" fill="{KRAFT}" {S}/>
<rect x="80" y="120" width="620" height="440" fill="{CREAM}" {S}/>
<path d="M60 120 H720 L690 60 H90Z" fill="{MINT}" {S}/>
<text x="390" y="105" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="34" fill="#fff">CAFÉ</text>
<rect x="120" y="400" width="540" height="160" fill="{GOLD}" {S}/>
<path d="M200 360 h60 v40 h-60z M460 360 h60 v40 h-60z" fill="#fff" {S4}/>
<path d="M270 370 q20 0 20 15 q0 15 -20 15" fill="none" {S4}/>
<path d="M210 340 q10 -20 0 -40 M240 340 q10 -20 0 -40" fill="none" stroke="{INK}" stroke-width="4" opacity=".4"/>
{person(560, 400, 0.7, shirt=CORAL, skin=SKIN3, arm='forward', hairstyle='cap')}
{person(770, 640, 0.8, shirt=SKY, skin=SKIN1, arm='forward', hairstyle='long', hair='#c46a2f')}
{coin(720, 360, 24)}{coin(680, 330, 20)}
{van(880, 560, 0.75, CORAL, '')}
<path d="M960 400 v-120 h90 v120" fill="#fff" {S4}/>
<g>{''.join(f'<line x1="975" y1="{300+i*18}" x2="1035" y2="{300+i*18}" stroke="{INK}" stroke-width="4" opacity=".4"/>' for i in range(5))}</g>
<text x="1005" y="270" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="22" fill="{INK}">due in 30</text>
''', SKYS)

A['accounts-receivable-get-paid-faster'] = ('Mailbox full of invoices', f'''
{cloud(180, 110)}{sparkle(1080, 120, 1, MINT)}{ground(W, H, 580)}
<rect x="330" y="300" width="300" height="190" rx="95" fill="{CORAL}" {S}/>
<rect x="330" y="395" width="300" height="95" fill="{CORAL}" {S}/>
<rect x="455" y="490" width="50" height="120" fill="{INK}"/>
<path d="M620 310 V210 H700 V250 H640" fill="{GOLD}" {S}/>
{invoice(360, 210, 80, 100, -20)}{invoice(430, 190, 80, 100, 4)}{invoice(500, 205, 80, 100, 18)}
<circle cx="400" cy="420" r="10" fill="{INK}"/><circle cx="560" cy="420" r="10" fill="{INK}"/>
<path d="M440 450 Q480 480 520 450" fill="none" {S}/>
<path d="M720 260 Q860 160 980 230" fill="none" stroke="{INK}" stroke-width="4" stroke-dasharray="4 16" stroke-linecap="round"/>
<g transform="translate(980 230) rotate(-10)"><path d="M0 0 L140 -40 L60 30Z" fill="#fff" {S}/><path d="M60 30 L70 -12 L140 -40" fill="none" {S4}/></g>
{invoice(900, 380, 110, 140, 6, '#fff', ('PAID', MINT))}
''')

A['inventory-and-working-capital'] = ('Warehouse shelves full of boxes', f'''
{sparkle(1120, 80, .8, CORAL)}
<rect x="0" y="590" width="{W}" height="85" fill="#cfd6de" {S}/>
{shelf(120, 120, 520, 470, 3)}
{box(140, 160, 90, 110, KRAFT, '$')}{box(240, 180, 80, 90, KRAFT, '$')}{box(330, 150, 120, 120, KRAFT, '$')}{box(460, 170, 90, 100, GOLD, '$')}{box(560, 200, 60, 70, KRAFT)}
{box(140, 330, 110, 100, KRAFT, '$')}{box(260, 350, 90, 80, MINT)}{box(360, 320, 100, 110, KRAFT, '$')}{box(470, 340, 140, 90, KRAFT, '$')}
{box(140, 490, 150, 100, KRAFT, '$')}{box(300, 500, 90, 90, CORAL)}{box(400, 480, 110, 110, KRAFT, '$')}{box(520, 510, 100, 80, KRAFT)}
<!-- forklift -->
<g transform="translate(760 600)">
<rect x="0" y="-150" width="170" height="110" rx="14" fill="{GOLD}" {S}/>
<path d="M30 -150 V-250 H130 V-150" fill="none" {S}/>
<path d="M200 -300 V-20 M200 -40 H290" {S} stroke-width="10"/>
{box(215, -140, 90, 80, KRAFT, '$').replace('<g>','<g>')}
<circle cx="40" cy="-30" r="30" fill="{INK}"/><circle cx="140" cy="-30" r="30" fill="{INK}"/>
</g>
{person(840, 470, 0.45, shirt=MINT, skin=SKIN2, arm='down', mood='o', hairstyle='cap')}
<text x="1030" y="200" font-family="Georgia,serif" font-weight="700" font-size="80" fill="{INK}">?</text>
''', SKYS)

A['supplier-payment-terms'] = ('Handshake over a crate', f'''
{cloud(1040, 110, .9)}{sparkle(140, 110, .9)}{ground(W, H, 580)}
<!-- calendar -->
<g transform="translate(120 170)"><rect width="220" height="200" rx="14" fill="#fff" {S}/><rect width="220" height="54" rx="14" fill="{CORAL}" {S}/>
<text x="110" y="38" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="28" fill="#fff">NET 30</text>
{''.join(f'<rect x="{18+ (i%5)*40}" y="{70+(i//5)*40}" width="28" height="28" rx="6" fill="{MINTS if i!=9 else GOLD}" stroke="{INK}" stroke-width="3"/>' for i in range(15))}
</g>
{box(460, 430, 280, 160, KRAFT)}
{person(420, 600, 0.95, shirt=MINT, skin=SKIN1, arm='forward', hairstyle='short', hair='#7a4b33')}
{person(790, 600, 0.95, shirt=SKY, skin=SKIN3, arm='forward', hairstyle='bun')}
<circle cx="600" cy="465" r="26" fill="{GOLD}" {S4}/>
<g transform="translate(970 250) rotate(12)"><path d="M0 0 H120 L150 50 L120 100 H0Z" fill="{GOLD}" {S}/><circle cx="118" cy="50" r="10" fill="#fff" {S4}/>
<text x="52" y="66" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="44" fill="{INK}">2%</text></g>
''')

A['seasonal-cash-flow'] = ('Shop in winter and summer', f'''
<rect x="0" y="0" width="600" height="{H}" fill="#dfe8f3"/>
<rect x="600" y="0" width="600" height="{H}" fill="{GOLDS}"/>
<line x1="600" y1="0" x2="600" y2="{H}" {S}/>
{''.join(f'<circle cx="{40+i*53 % 560}" cy="{40+ (i*97)%440}" r="7" fill="#fff" {S4}/>' for i in range(16))}
<circle cx="1060" cy="120" r="60" fill="{GOLD}" {S}/>
<path d="M0 560 Q300 530 600 560 V{H} H0Z" fill="#fff" {S}/>
<path d="M600 560 Q900 530 1200 560 V{H} H600Z" fill="{MINTS}" {S}/>
<rect x="400" y="300" width="400" height="260" fill="{CREAM}" {S}/>
<path d="M380 300 H820 L790 240 H410Z" fill="{CORAL}" {S}/>
<rect x="430" y="360" width="140" height="130" fill="{SKYS}" {S4}/><rect x="630" y="360" width="140" height="200" fill="{MINT}" {S4}/>
<!-- winter: bench with snow -->
<path d="M120 500 H320 M140 500 V560 M300 500 V560 M120 470 H320" {S} stroke-width="10"/>
<path d="M120 462 Q220 440 320 462" fill="#fff" {S4}/>
{person(250, 640, 0.5, shirt=SKY, skin=SKIN1, arm='down', mood='flat', hairstyle='cap')}
<!-- summer: umbrella, shoppers -->
<path d="M960 560 V330" {S}/><path d="M860 340 Q960 250 1060 340Z" fill="{CORAL}" {S}/>
{person(900, 650, 0.55, shirt=MINT, skin=SKIN2, arm='wave', hairstyle='long')}
{person(1100, 650, 0.55, shirt=CORAL, skin=SKIN1, arm='forward', hairstyle='short')}
{coin(1010, 460, 22)}{coin(1150, 420, 22)}
''')

A['13-week-cash-flow-forecast'] = ('Thirteen-week wall chart', f'''
{sparkle(1110, 80, .8, MINT)}
<rect x="80" y="90" width="1040" height="470" rx="18" fill="#fff" {S}/>
<rect x="80" y="90" width="1040" height="60" rx="18" fill="{INK}"/>
{''.join(f'<text x="{80+40+i*77}" y="130" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="22" fill="#fff">W{i+1}</text>' for i in range(13))}
{''.join(f'<line x1="{80+78+i*77}" y1="150" x2="{80+78+i*77}" y2="560" stroke="{INK}" stroke-width="2" opacity=".2"/>' for i in range(12))}
<line x1="90" y1="420" x2="1110" y2="420" stroke="{CORAL}" stroke-width="5" stroke-dasharray="14 10"/>
<text x="1105" y="410" text-anchor="end" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="{CORAL}">minimum cash</text>
<path d="M120 300 L197 270 L274 330 L351 335 L428 430 L505 425 L582 480 L659 400 L736 330 L813 300 L890 260 L967 280 L1044 230" fill="none" stroke="{MINT}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>
{''.join(f'<circle cx="{x}" cy="{y}" r="10" fill="{GOLD}" {S4}/>' for x,y in [(120,300),(197,270),(274,330),(351,335),(428,430),(505,425),(582,480),(659,400),(736,330),(813,300),(890,260),(967,280),(1044,230)])}
<!-- ladder + person -->
<path d="M520 670 L560 470 M600 670 L640 470" {S}/>
{''.join(f'<line x1="{524+i*8}" y1="{650-i*40}" x2="{604+i*8}" y2="{650-i*40}" {S4}/>' for i in range(5))}
{person(600, 560, 0.45, shirt=CORAL, skin=SKIN3, arm='up', hairstyle='bun')}
''', GOLDS)

A['growth-eats-cash'] = ('Plant outgrowing its watering can', f'''
{cloud(200, 110)}{sparkle(1090, 90, 1)}{ground(W, H, 590)}
<path d="M760 590 Q740 380 780 120" fill="none" stroke="{MINT}" stroke-width="18" stroke-linecap="round"/>
{''.join(f'<path d="M{770 - (i%2)*0} {540-i*70} Q{700 if i%2 else 860} {510-i*70} {690 if i%2 else 870} {560-i*70} Q{740 if i%2 else 820} {565-i*70} {770} {540-i*70}Z" fill="{MINT}" {S4}/>' for i in range(6))}
<circle cx="780" cy="110" r="36" fill="{GOLD}" {S}/><text x="780" y="124" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="38" fill="{INK}">$</text>
<path d="M700 590 H860 L840 660 H720Z" fill="{CORAL}" {S}/>
<!-- watering can -->
<g transform="translate(300 420) rotate(-18)">
<rect x="0" y="0" width="200" height="150" rx="24" fill="{SKY}" {S}/>
<path d="M200 40 L330 -30 L345 -10 L210 80" fill="{SKY}" {S}/>
<path d="M30 0 Q100 -80 170 0" fill="none" {S} stroke-width="12"/>
<text x="100" y="95" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="40" fill="{INK}">CASH</text>
</g>
{''.join(f'<path d="M{620+i*22} {300+i*14} q6 14 0 22 q-6 -8 0 -22z" fill="{SKY}" {S4}/>' for i in range(4))}
{person(220, 650, 0.6, shirt=GOLD, skin=SKIN1, arm='forward', mood='o', hairstyle='short', hair='#c46a2f')}
''')

A['working-capital-financing-options'] = ('Row of financing doors', f'''
{sparkle(1120, 80, .8)}
<rect x="0" y="560" width="{W}" height="115" fill="{KRAFT}" {S}/>
{''.join(f'<g transform="translate({70+i*205} 180)"><rect width="160" height="380" rx="80" ry="60" fill="{c}" {S}/><circle cx="130" cy="200" r="10" fill="{INK}"/><rect x="20" y="40" width="120" height="36" rx="8" fill="#fff" {S4}/><text x="80" y="66" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="{INK}">{t}</text></g>' for i,(c,t) in enumerate([(MINT,'LINE'),(SKY,'LOAN'),(GOLD,'INVOICE'),(CORAL,'MCA'),('#b9a6e0','CARD')]))}
{person(600, 660, 0.72, shirt=CORAL, skin=SKIN2, arm='both', hairstyle='long', hair=INK)}
''', SKYS)

A['true-cost-of-short-term-financing'] = ('Magnifier over a price tag', f'''
{cloud(1040, 100, .8)}{sparkle(160, 110, .9, CORAL)}
<g transform="translate(260 180) rotate(-8)"><path d="M0 0 H360 L440 110 L360 220 H0Z" fill="{GOLD}" {S}/><circle cx="360" cy="110" r="18" fill="#fff" {S4}/>
<text x="170" y="135" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="80" fill="{INK}">1.30</text></g>
<g transform="translate(330 470) rotate(8)"><path d="M0 0 H140 L170 40 L140 80 H0Z" fill="{CORALS}" {S4}/><text x="70" y="52" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="28" fill="{INK}">fee</text></g>
<g transform="translate(520 490) rotate(-6)"><path d="M0 0 H140 L170 40 L140 80 H0Z" fill="{CORALS}" {S4}/><text x="70" y="52" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="28" fill="{INK}">fee</text></g>
<g transform="translate(720 460) rotate(10)"><path d="M0 0 H140 L170 40 L140 80 H0Z" fill="{CORALS}" {S4}/><text x="70" y="52" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="28" fill="{INK}">daily</text></g>
<circle cx="770" cy="330" r="150" fill="#fff" fill-opacity=".55" {S} stroke-width="16"/>
<path d="M875 440 L1010 590" {S} stroke-width="34"/><path d="M875 440 L1010 590" stroke="{KRAFTD}" stroke-width="20" stroke-linecap="round"/>
<text x="770" y="355" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="64" fill="{CORAL}">~110%</text>
''', GOLDS)

A['working-capital-peg-selling-a-business'] = ('Balance scale at a deal table', f'''
{sparkle(1110, 90, .9, MINT)}
<rect x="100" y="520" width="1000" height="40" rx="10" fill="{KRAFT}" {S}/><path d="M160 560 V670 M1040 560 V670" {S} stroke-width="14"/>
<path d="M600 520 V180" {S} stroke-width="12"/><path d="M540 520 H660" {S} stroke-width="12"/>
<path d="M360 200 H840" {S} stroke-width="12"/><circle cx="600" cy="185" r="16" fill="{GOLD}" {S4}/>
<path d="M360 200 L300 330 M360 200 L420 330 M840 200 L780 330 M840 200 L900 330" stroke="{INK}" stroke-width="4"/>
<path d="M280 330 H440 Q430 380 360 380 Q290 380 280 330Z" fill="{GOLD}" {S}/>
<path d="M760 330 H920 Q910 380 840 380 Q770 380 760 330Z" fill="{GOLD}" {S}/>
<g transform="translate(300 250)"><rect width="120" height="80" fill="{CREAM}" {S4}/><path d="M-10 0 H130 L110 -30 H10Z" fill="{CORAL}" {S4}/><rect x="45" y="35" width="30" height="45" fill="{MINT}" stroke="{INK}" stroke-width="3"/></g>
{box(770, 270, 60, 60, KRAFT)}{invoice(840, 240, 60, 80, 10)}
{person(200, 520, 0.55, shirt=MINT, skin=SKIN1, arm='forward', hairstyle='short', hair='#8a8a8a')}
{person(1000, 520, 0.55, shirt=SKY, skin=SKIN3, arm='forward', hairstyle='long')}
{invoice(520, 430, 80, 90, -8)}{coin(700, 480, 26)}
''', SKYS)

meta = {}
for fp in glob.glob(os.path.join(os.path.dirname(OUT), 'art', '*.html')):
    m = re.match(r'<!--META\s*(\{.*?\})', open(fp).read(), re.S)
    j = json.loads(m.group(1)); meta[j['slug']] = j
for slug, v in A.items():
    title, body = v[0], v[1]
    bg = v[2] if len(v) > 2 else SKYS
    assert slug in meta, slug
    write(f'{slug}.svg', svg(W, H, title, meta[slug]['alt'] + '.', body, bg))
missing = set(meta) - set(A)
assert not missing, missing
print('ok', len(A))
