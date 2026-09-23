INK="#0e3b4a"; TEAL="#1f9d92"; TEALD="#137a71"; MINT="#dff5f1"; SUN="#ffc94d"; CORAL="#ff7a6b"; SKY="#cdeefc"; CREAM="#fffaf1"; PINK="#ffb3c1"; BLUE="#7cc7f0"

TOOTH_D="M-80,-60 C-80,-122 -30,-122 0,-96 C30,-122 80,-122 80,-60 C80,-10 70,20 60,60 C50,112 30,122 20,80 C12,50 -12,50 -20,80 C-30,122 -50,112 -60,60 C-70,20 -80,-10 -80,-60 Z"

def tooth(cx, cy, s=1.0, face="smile", fill="#ffffff", rot=0, extra=""):
    eyes = f'<circle cx="-28" cy="-34" r="10" fill="{INK}"/><circle cx="28" cy="-34" r="10" fill="{INK}"/><circle cx="-24" cy="-38" r="3.5" fill="#fff"/><circle cx="32" cy="-38" r="3.5" fill="#fff"/>'
    if face == "smile":
        mouth = f'<path d="M-24,-6 Q0,22 24,-6" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>'
    elif face == "grin":
        mouth = f'<path d="M-26,-8 Q0,30 26,-8 Z" fill="{CORAL}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
    elif face == "calm":
        eyes = f'<path d="M-38,-34 Q-28,-26 -18,-34" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><path d="M18,-34 Q28,-26 38,-34" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>'
        mouth = f'<path d="M-18,-4 Q0,12 18,-4" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>'
    elif face == "oops":
        mouth = f'<ellipse cx="0" cy="2" rx="10" ry="12" fill="{INK}"/>'
    else:
        mouth = ""
    cheeks = f'<ellipse cx="-50" cy="-8" rx="12" ry="7" fill="{PINK}" opacity=".8"/><ellipse cx="50" cy="-8" rx="12" ry="7" fill="{PINK}" opacity=".8"/>'
    return (f'<g transform="translate({cx},{cy}) rotate({rot}) scale({s})">'
            f'<path d="{TOOTH_D}" fill="{fill}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
            f'<path d="M-58,-72 C-56,-96 -36,-104 -20,-96" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".9"/>'
            f'{eyes}{mouth}{cheeks}{extra}</g>')

def sparkle(x, y, s=1, c=SUN):
    return f'<path transform="translate({x},{y}) scale({s})" d="M0,-24 L6,-6 L24,0 L6,6 L0,24 L-6,6 L-24,0 L-6,-6 Z" fill="{c}"/>'

def cloud(x, y, s=1):
    return f'<g transform="translate({x},{y}) scale({s})" fill="#fff"><ellipse cx="0" cy="0" rx="60" ry="28"/><ellipse cx="-40" cy="10" rx="40" ry="22"/><ellipse cx="42" cy="10" rx="44" ry="22"/><ellipse cx="10" cy="-18" rx="36" ry="26"/></g>'

def wrap(w, h, title, inner, bg=MINT):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-labelledby="t">'
            f'<title id="t">{title}</title><rect width="{w}" height="{h}" fill="{bg}"/>{inner}</svg>\n')

def dots(w, h, c="#ffffff", op=".5"):
    out = []
    for i in range(0, w, 80):
        for j in range(0, h, 80):
            out.append(f'<circle cx="{i+ (40 if (j//80)%2 else 0)}" cy="{j}" r="4"/>')
    return f'<g fill="{c}" opacity="{op}">{"".join(out)}</g>'

S = {}

# 1 choose a dentist: map with pins, magnifier, clipboard
S["how-to-choose-a-dentist"] = f'''
{dots(1200,675)}
<g transform="translate(90,120)">
 <path d="M0,40 L200,0 L400,40 L600,0 L600,440 L400,480 L200,440 L0,480 Z" fill="#fff" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
 <path d="M200,0 L200,440 M400,40 L400,480" stroke="{INK}" stroke-width="4" opacity=".25"/>
 <path d="M20,300 C120,260 180,340 280,280 S460,200 580,240" fill="none" stroke="{BLUE}" stroke-width="22" stroke-linecap="round"/>
 <path d="M60,120 L560,380 M300,40 L240,460" stroke="{SUN}" stroke-width="14" stroke-linecap="round"/>
 <rect x="70" y="330" width="70" height="60" rx="8" fill="{TEAL}" opacity=".5"/><rect x="430" y="90" width="90" height="70" rx="8" fill="{TEAL}" opacity=".5"/>
 <g fill="{CORAL}" stroke="{INK}" stroke-width="5"><path d="M150,200 c0,-40 60,-40 60,0 c0,30 -30,60 -30,60 s-30,-30 -30,-60z"/><path d="M370,300 c0,-40 60,-40 60,0 c0,30 -30,60 -30,60 s-30,-30 -30,-60z"/><path d="M470,150 c0,-40 60,-40 60,0 c0,30 -30,60 -30,60 s-30,-30 -30,-60z"/></g>
 <g fill="#fff"><circle cx="180" cy="200" r="11"/><circle cx="400" cy="300" r="11"/><circle cx="500" cy="150" r="11"/></g>
</g>
<g transform="translate(830,120) rotate(6)">
 <rect x="0" y="0" width="260" height="340" rx="22" fill="{SUN}" stroke="{INK}" stroke-width="6"/>
 <rect x="80" y="-18" width="100" height="40" rx="10" fill="{INK}"/>
 <rect x="24" y="40" width="212" height="280" rx="12" fill="#fff"/>
 <g stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round">
  <path d="M44,90 l14,14 26,-28"/><path d="M44,170 l14,14 26,-28"/><path d="M44,250 l14,14 26,-28"/>
 </g>
 <g stroke="{TEAL}" stroke-width="10" stroke-linecap="round"><path d="M104,94 H210"/><path d="M104,174 H196"/><path d="M104,254 H214"/></g>
</g>
{tooth(700, 470, 0.95, "grin")}
<g transform="translate(610,300) rotate(-25)"><circle cx="0" cy="0" r="62" fill="{SKY}" fill-opacity=".6" stroke="{INK}" stroke-width="12"/><rect x="-10" y="60" width="20" height="110" rx="10" fill="{INK}"/></g>
{sparkle(1110,560,1.2)}{sparkle(60,600,.9,CORAL)}
'''

# 2 checkup: dental chair + lamp + tray
S["what-happens-at-a-dental-checkup"] = f'''
<rect y="520" width="1200" height="155" fill="{SKY}"/>
<g transform="translate(700,40)"><path d="M0,0 V120" stroke="{INK}" stroke-width="12"/><ellipse cx="0" cy="150" rx="120" ry="44" fill="{SUN}" stroke="{INK}" stroke-width="7"/><ellipse cx="0" cy="160" rx="80" ry="22" fill="#fff8d6"/><path d="M-120,200 L-260,480 H260 L120,200 Z" fill="{SUN}" opacity=".22"/></g>
<g stroke="{INK}" stroke-width="7" stroke-linejoin="round">
 <rect x="400" y="560" width="120" height="30" rx="10" fill="{TEALD}"/>
 <rect x="440" y="470" width="40" height="100" fill="{TEALD}"/>
 <path d="M300,470 H760 Q800,470 820,430 L880,330 Q900,300 870,290 L840,280 Q815,275 800,300 L750,400 H330 Q300,400 300,430 Z" fill="{TEAL}"/>
 <path d="M300,430 L220,470 Q200,480 210,500 L220,520 Q230,530 250,520 L320,470" fill="{TEAL}"/>
</g>
{tooth(700, 280, 0.9, "grin", rot=-18)}
<g transform="translate(140,250)">
 <rect x="0" y="0" width="200" height="16" rx="8" fill="{INK}"/><rect x="92" y="16" width="16" height="260" fill="{INK}"/>
 <g stroke="{INK}" stroke-width="6" stroke-linecap="round"><path d="M30,-10 V-90"/><path d="M80,-10 V-100"/><path d="M130,-10 V-95"/></g>
 <circle cx="30" cy="-104" r="20" fill="{SKY}" stroke="{INK}" stroke-width="6"/>
 <path d="M80,-100 q0,-24 18,-30" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>
 <path d="M130,-95 q10,-18 -4,-32" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>
</g>
<g font-family="Arial" font-weight="700" font-size="34" fill="{TEALD}"><text x="960" y="170">3</text><text x="1010" y="130">2</text><text x="1060" y="180">3</text></g>
{sparkle(960,300,1.1)}{sparkle(1100,360,.8,CORAL)}{sparkle(80,120,.8)}
'''

# 3 cleaning: toothbrush, scaler, bubbles
S["teeth-cleaning-explained"] = f'''
{dots(1200,675,"#ffffff",".6")}
<g fill="#fff" stroke="{BLUE}" stroke-width="5">{''.join(f'<circle cx="{x}" cy="{y}" r="{r}"/>' for x,y,r in [(180,160,34),(260,90,20),(980,140,40),(1060,250,22),(900,560,28),(300,560,18),(140,420,26),(1080,470,16)])}</g>
<g transform="translate(250,450) rotate(-30)">
 <rect x="0" y="0" width="520" height="56" rx="28" fill="{CORAL}" stroke="{INK}" stroke-width="7"/>
 <rect x="360" y="-100" width="160" height="100" rx="16" fill="#fff" stroke="{INK}" stroke-width="7"/>
 <g stroke="{BLUE}" stroke-width="12" stroke-linecap="round">{''.join(f'<path d="M{380+i*22},-88 V-12"/>' for i in range(6))}</g>
</g>
{tooth(640, 330, 1.25, "grin")}
<g transform="translate(900,470) rotate(35)">
 <rect x="-12" y="-200" width="24" height="260" rx="12" fill="#c9d6da" stroke="{INK}" stroke-width="6"/>
 <path d="M0,-200 q0,-60 30,-70" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round"/>
 <rect x="-18" y="-80" width="36" height="90" rx="12" fill="{TEAL}"/>
</g>
{sparkle(540,160,1.3)}{sparkle(770,180,1)}{sparkle(820,420,.8,"#fff")}
'''

# 4 fillings: cutaway molar with cavity + curing light
S["dental-fillings-explained"] = f'''
<rect width="1200" height="675" fill="{CREAM}"/>
<circle cx="1050" cy="120" r="200" fill="{MINT}"/>
<g transform="translate(470,360) scale(1.9)">
 <path d="{TOOTH_D}" fill="#fff" stroke="{INK}" stroke-width="5"/>
 <path d="M-60,-58 C-60,-100 -24,-104 0,-84 C24,-104 60,-100 60,-58 C60,-20 52,10 44,50 C40,80 30,84 22,56 C14,34 -14,34 -22,56 C-30,84 -40,80 -44,50 C-52,10 -60,-20 -60,-58Z" fill="#fff4dc"/>
 <path d="M-26,-50 C-26,-70 26,-70 26,-50 C26,-20 16,10 0,40 C-16,10 -26,-20 -26,-50Z" fill="{PINK}" stroke="{CORAL}" stroke-width="3"/>
 <path d="M-4,-104 C8,-90 26,-86 34,-92 L30,-70 C18,-66 2,-72 -6,-84 Z" fill="{TEAL}" stroke="{INK}" stroke-width="3"/>
</g>
<g transform="translate(560,110) rotate(28)">
 <rect x="0" y="0" width="80" height="330" rx="30" fill="{INK}"/>
 <rect x="10" y="40" width="60" height="30" rx="10" fill="{BLUE}"/>
 <path d="M40,330 L40,380" stroke="{INK}" stroke-width="30" stroke-linecap="round"/>
 <path d="M40,395 L0,520 H80 Z" fill="{BLUE}" opacity=".45"/>
</g>
<g transform="translate(870,440)">
 <rect x="0" y="0" width="230" height="150" rx="20" fill="#fff" stroke="{INK}" stroke-width="6"/>
 <circle cx="60" cy="75" r="36" fill="#f3f3f3" stroke="{INK}" stroke-width="5"/>
 <circle cx="170" cy="75" r="36" fill="{SUN}" stroke="{INK}" stroke-width="5"/>
</g>
{tooth(160, 540, 0.6, "smile")}
{sparkle(300,140,1)}{sparkle(1080,300,.9,CORAL)}
'''

# 5 crowns
S["dental-crowns-explained"] = f'''
{dots(1200,675)}
<ellipse cx="600" cy="610" rx="360" ry="40" fill="{TEAL}" opacity=".25"/>
<g transform="translate(600,470)" stroke="{INK}" stroke-width="7" stroke-linejoin="round">
 <path d="M-70,-40 C-70,-80 70,-80 70,-40 L60,20 C50,110 30,130 18,80 C10,50 -10,50 -18,80 C-30,130 -50,110 -60,20 Z" fill="#fff4dc"/>
 <path d="M-110,20 H110" stroke="{PINK}" stroke-width="26" stroke-linecap="round"/>
</g>
<g transform="translate(600,230)">
 <path d="M-120,40 C-130,-40 -100,-110 -40,-100 C-20,-96 -10,-80 0,-80 C10,-80 20,-96 40,-100 C100,-110 130,-40 120,40 Q0,70 -120,40 Z" fill="#fff" stroke="{INK}" stroke-width="7"/>
 <path d="M-86,-40 C-80,-70 -60,-84 -40,-80" fill="none" stroke="{SKY}" stroke-width="10" stroke-linecap="round"/>
 <g fill="{INK}"><circle cx="-36" cy="-10" r="11"/><circle cx="36" cy="-10" r="11"/></g>
 <path d="M-22,18 Q0,40 22,18" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>
</g>
<g stroke="{TEALD}" stroke-width="8" stroke-linecap="round" stroke-dasharray="4 22"><path d="M600,330 V380"/><path d="M500,320 L470,370"/><path d="M700,320 L730,370"/></g>
<g transform="translate(150,420)">
 <path d="M0,0 H220 L200,120 Q110,160 20,120 Z" fill="{SUN}" stroke="{INK}" stroke-width="6"/>
 <path d="M30,20 Q110,70 190,20" fill="none" stroke="#fff" stroke-width="10" opacity=".7"/>
 <rect x="80" y="130" width="60" height="70" rx="10" fill="{SUN}" stroke="{INK}" stroke-width="6"/>
</g>
{tooth(990, 470, 0.7, "grin")}
{sparkle(430,120,1.3)}{sparkle(780,110,1)}{sparkle(820,210,.7,CORAL)}
'''

# 6 root canal: cutaway with pulp and canals, files
S["root-canal-treatment-explained"] = f'''
<rect width="1200" height="675" fill="{SKY}"/>
<path d="M0,470 C200,430 400,500 600,460 S1000,430 1200,470 V675 H0 Z" fill="{PINK}"/>
<path d="M0,520 C260,500 500,560 760,520 S1100,510 1200,530 V675 H0 Z" fill="#f4d9c6"/>
<g transform="translate(600,330) scale(2.1)">
 <path d="{TOOTH_D}" fill="#fff" stroke="{INK}" stroke-width="4"/>
 <path d="M-62,-58 C-62,-102 -24,-106 0,-86 C24,-106 62,-102 62,-58 C62,-18 54,14 46,54 C40,90 30,94 22,60 C14,36 -14,36 -22,60 C-30,94 -40,90 -46,54 C-54,14 -62,-18 -62,-58Z" fill="#fff4dc"/>
 <path d="M-30,-60 C-30,-78 30,-78 30,-60 C30,-40 24,-26 16,-14 L30,70 C31,78 26,80 24,72 L6,-6 H-6 L-24,72 C-26,80 -31,78 -30,70 L-16,-14 C-24,-26 -30,-40 -30,-60Z" fill="{CORAL}" stroke="{INK}" stroke-width="2.5"/>
 <g fill="{INK}"><circle cx="-12" cy="-52" r="4"/><circle cx="12" cy="-52" r="4"/></g>
 <path d="M-8,-42 Q0,-36 8,-42" fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>
</g>
<g transform="translate(250,100) rotate(-15)"><rect x="-10" y="0" width="20" height="200" fill="#c9d6da" stroke="{INK}" stroke-width="4"/><rect x="-24" y="-60" width="48" height="70" rx="10" fill="{SUN}" stroke="{INK}" stroke-width="5"/><path d="M-10,40 l20,10 M-10,80 l20,10 M-10,120 l20,10 M-10,160 l20,10" stroke="{INK}" stroke-width="3"/></g>
<g transform="translate(950,100) rotate(15)"><rect x="-10" y="0" width="20" height="200" fill="#c9d6da" stroke="{INK}" stroke-width="4"/><rect x="-24" y="-60" width="48" height="70" rx="10" fill="{TEAL}" stroke="{INK}" stroke-width="5"/><path d="M-10,40 l20,10 M-10,80 l20,10 M-10,120 l20,10 M-10,160 l20,10" stroke="{INK}" stroke-width="3"/></g>
{sparkle(150,380,.9)}{sparkle(1060,360,1.1)}
'''

# 7 x-rays: lightbox with film
xray_teeth = ''.join(f'<path transform="translate({x},{y}) scale(.34)" d="{TOOTH_D}" fill="#e8f4ff" opacity=".9"/>' for x,y in [(-230,-60),(-150,-60),(-70,-60),(10,-60),(90,-60),(170,-60),(250,-60)])
xray_low = ''.join(f'<path transform="translate({x},{y}) scale(.34) rotate(180)" d="{TOOTH_D}" fill="#e8f4ff" opacity=".9"/>' for x,y in [(-230,70),(-150,70),(-70,70),(10,70),(90,70),(170,70),(250,70)])
S["dental-x-rays-explained"] = f'''
<rect width="1200" height="675" fill="{INK}"/>
{dots(1200,675,"#ffffff",".08")}
<g transform="translate(560,320)">
 <rect x="-380" y="-230" width="760" height="460" rx="30" fill="{TEAL}" stroke="#fff" stroke-width="8"/>
 <rect x="-340" y="-190" width="680" height="380" rx="16" fill="#1c2c36"/>
 <rect x="-340" y="-190" width="680" height="380" rx="16" fill="{BLUE}" opacity=".18"/>
 {xray_teeth}{xray_low}
 <path d="M-320,0 H320" stroke="#1c2c36" stroke-width="16"/>
 <circle cx="-90" cy="-70" r="14" fill="{CORAL}" opacity=".9"/>
 <circle cx="-90" cy="-70" r="30" fill="none" stroke="{SUN}" stroke-width="5" stroke-dasharray="8 8"/>
</g>
<g transform="translate(1030,470)"><rect x="-60" y="-40" width="120" height="84" rx="18" fill="{SUN}" stroke="#fff" stroke-width="6"/><rect x="-36" y="-18" width="72" height="40" rx="8" fill="{INK}"/><path d="M60,0 C120,0 110,120 60,140" fill="none" stroke="#fff" stroke-width="6"/></g>
{tooth(1030, 200, 0.55, "grin")}
{sparkle(120,580,1,SUN)}{sparkle(1110,600,.7,CORAL)}
'''

# 8 kids first visit
S["kids-first-dental-visit"] = f'''
<rect width="1200" height="675" fill="#fde7ef"/>
<g opacity=".5">{''.join(f'<rect x="{i*120}" y="0" width="60" height="675" fill="#fff"/>' for i in range(10))}</g>
<rect y="560" width="1200" height="115" fill="{SUN}"/>
<g transform="translate(560,380)">
 <path d="M-170,190 V40 Q-170,-60 -70,-60 H70 Q170,-60 170,40 V190 Z" fill="{TEAL}" stroke="{INK}" stroke-width="7"/>
 <circle cx="0" cy="-140" r="90" fill="#f2c9a5" stroke="{INK}" stroke-width="7"/>
 <path d="M-90,-160 Q-80,-250 0,-240 Q90,-250 90,-150 Q60,-200 0,-200 Q-60,-200 -90,-160Z" fill="#6b3d2a" stroke="{INK}" stroke-width="6"/>
 <g fill="{INK}"><circle cx="-30" cy="-140" r="9"/><circle cx="30" cy="-140" r="9"/></g>
 <path d="M-26,-104 Q0,-84 26,-104" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>
 <path d="M-160,60 Q-60,140 -10,70" fill="none" stroke="{INK}" stroke-width="30" stroke-linecap="round"/>
 <path d="M160,60 Q60,140 10,70" fill="none" stroke="{INK}" stroke-width="30" stroke-linecap="round"/>
</g>
{tooth(560, 360, 0.7, "grin")}
<g transform="translate(930,120)">
 <ellipse cx="0" cy="0" rx="70" ry="86" fill="{CORAL}" stroke="{INK}" stroke-width="6"/>
 <path d="M0,86 l-10,16 h20 z" fill="{CORAL}" stroke="{INK}" stroke-width="4"/>
 <path d="M0,102 C-20,180 30,240 -10,330" fill="none" stroke="{INK}" stroke-width="4"/>
 <ellipse cx="-26" cy="-30" rx="12" ry="22" fill="#fff" opacity=".6"/>
</g>
<g transform="translate(1030,200)"><ellipse cx="0" cy="0" rx="56" ry="70" fill="{BLUE}" stroke="{INK}" stroke-width="6"/><path d="M0,70 C20,160 -30,210 10,300" fill="none" stroke="{INK}" stroke-width="4"/></g>
<g transform="translate(180,470) rotate(-20)"><rect x="0" y="0" width="200" height="30" rx="15" fill="{BLUE}" stroke="{INK}" stroke-width="5"/><rect x="150" y="-44" width="60" height="44" rx="10" fill="#fff" stroke="{INK}" stroke-width="5"/></g>
{tooth(200, 250, 0.45, "smile", fill="#fff")}
{sparkle(360,120,1)}{sparkle(780,110,.8,SUN)}
'''

# 9 kids by age: growth chart
steps = [(170,0.32,"grin"),(390,0.46,"smile"),(620,0.6,"grin"),(870,0.78,"smile")]
chars = ''.join(tooth(x, 540-120*s-40, s, f) for x,s,f in steps)
brushes = ''.join(f'<g transform="translate({x+70*s+30},{560}) rotate(-80)"><rect x="0" y="0" width="{140*s+60}" height="{20*s+8}" rx="8" fill="{c}" stroke="{INK}" stroke-width="4"/><rect x="{140*s+40}" y="-{24*s+8}" width="{36*s+12}" height="{24*s+8}" rx="5" fill="#fff" stroke="{INK}" stroke-width="4"/></g>' for (x,s,f),c in zip(steps,[CORAL,SUN,BLUE,TEAL]))
S["kids-teeth-care-by-age"] = f'''
<rect width="1200" height="675" fill="{CREAM}"/>
<g transform="translate(1080,40)"><rect x="0" y="0" width="70" height="540" rx="14" fill="#fff" stroke="{INK}" stroke-width="6"/>{''.join(f'<path d="M0,{40+i*50} h{30 if i%2 else 45}" stroke="{INK}" stroke-width="5"/>' for i in range(10))}<rect x="12" y="300" width="46" height="228" rx="10" fill="{CORAL}"/></g>
<rect y="580" width="1200" height="95" fill="{TEAL}"/>
<path d="M60,580 Q300,520 560,560 T1050,520" fill="none" stroke="{SUN}" stroke-width="10" stroke-dasharray="2 24" stroke-linecap="round"/>
{brushes}
{chars}
{sparkle(120,120,1)}{sparkle(520,90,.8,CORAL)}{sparkle(900,120,1.1)}
'''

# 10 emergency: bandaged tooth, milk, clock, phone
S["dental-emergency-guide"] = f'''
<rect width="1200" height="675" fill="#ffe9e4"/>
<g fill="none" stroke="{CORAL}" stroke-width="10" opacity=".35"><circle cx="600" cy="340" r="220"/><circle cx="600" cy="340" r="300"/></g>
{tooth(560, 360, 1.25, "oops", extra=f'<g transform="rotate(-20)"><rect x="-54" y="-86" width="108" height="34" rx="14" fill="#f6d7b0" stroke="{INK}" stroke-width="5"/><g fill="#d9b58a"><circle cx="-12" cy="-69" r="4"/><circle cx="4" cy="-69" r="4"/><circle cx="20" cy="-69" r="4"/></g></g>')}
<g transform="translate(180,300)">
 <path d="M-70,-120 H70 L55,170 Q0,190 -55,170 Z" fill="#fff" stroke="{INK}" stroke-width="7"/>
 <path d="M-64,-40 H64 L55,170 Q0,190 -55,170 Z" fill="#fdfdf6"/>
 <path d="M-64,-40 Q0,-20 64,-40" fill="none" stroke="{INK}" stroke-width="4" opacity=".4"/>
 <text x="0" y="80" text-anchor="middle" font-family="Arial" font-weight="700" font-size="34" fill="{BLUE}">MILK</text>
</g>
<g transform="translate(960,190)">
 <circle r="110" fill="#fff" stroke="{INK}" stroke-width="8"/>
 <g stroke="{INK}" stroke-width="6" stroke-linecap="round">{''.join(f'<path transform="rotate({a})" d="M0,-92 V-80"/>' for a in range(0,360,30))}<path d="M0,0 V-66"/><path d="M0,0 L48,26"/></g>
 <circle r="10" fill="{CORAL}"/>
 <path d="M-90,-120 l-30,-24 M90,-120 l30,-24" stroke="{INK}" stroke-width="8" stroke-linecap="round"/>
</g>
<g transform="translate(980,470) rotate(12)">
 <rect x="-60" y="-100" width="120" height="200" rx="22" fill="{TEAL}" stroke="{INK}" stroke-width="7"/>
 <rect x="-44" y="-74" width="88" height="140" rx="8" fill="#fff"/>
 <path d="M-18,-20 q-8,30 18,48 l12,-10 -14,-14 -8,6 q-10,-8 -8,-22 l10,-2 -2,-20 z" fill="{CORAL}"/>
 <path d="M80,-80 q30,20 0,60 M100,-100 q50,40 0,100" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>
</g>
{sparkle(340,120,1,SUN)}{sparkle(760,600,.8,SUN)}
'''

# 11 costs: tooth piggy bank, calculator, receipt
S["understanding-dental-costs"] = f'''
{dots(1200,675)}
<g transform="translate(830,80) rotate(4)">
 <path d="M0,0 H250 V480 l-25,-20 -25,20 -25,-20 -25,20 -25,-20 -25,20 -25,-20 -25,20 -25,-20 -25,20 Z" fill="#fff" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
 {''.join(f'<rect x="30" y="{50+i*56}" width="{120 if i%2 else 150}" height="14" rx="7" fill="{TEAL if i!=6 else CORAL}" opacity=".7"/><rect x="190" y="{50+i*56}" width="34" height="14" rx="7" fill="{INK}" opacity=".35"/>' for i in range(7))}
</g>
<g transform="translate(460,390)">
 <ellipse cx="0" cy="0" rx="260" ry="190" fill="{PINK}" stroke="{INK}" stroke-width="8"/>
 <ellipse cx="250" cy="-10" rx="44" ry="54" fill="#ff9fb2" stroke="{INK}" stroke-width="7"/>
 <g fill="{INK}"><ellipse cx="240" cy="-10" rx="8" ry="12"/><ellipse cx="266" cy="-10" rx="8" ry="12"/><circle cx="150" cy="-80" r="13"/></g>
 <path d="M-40,-180 l30,-40 30,40" fill="{PINK}" stroke="{INK}" stroke-width="7"/>
 <rect x="-60" y="-196" width="120" height="16" rx="8" fill="{INK}"/>
 <g fill="{PINK}" stroke="{INK}" stroke-width="7"><rect x="-170" y="150" width="60" height="70" rx="16"/><rect x="100" y="150" width="60" height="70" rx="16"/></g>
 <path d="M-258,-20 q-60,-20 -40,-70" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>
 {tooth(-40, 20, 0.6, "smile")}
</g>
<g transform="translate(470,60)"><circle r="46" fill="{SUN}" stroke="{INK}" stroke-width="6"/><circle r="30" fill="none" stroke="{INK}" stroke-width="4" opacity=".4"/></g>
<g transform="translate(90,70) rotate(-8)">
 <rect x="0" y="0" width="190" height="260" rx="22" fill="{TEAL}" stroke="{INK}" stroke-width="6"/>
 <rect x="22" y="22" width="146" height="60" rx="10" fill="{MINT}"/>
 {''.join(f'<rect x="{22+(i%3)*52}" y="{100+(i//3)*48}" width="40" height="36" rx="8" fill="{"#fff" if i!=8 else SUN}"/>' for i in range(9))}
</g>
{sparkle(720,90,.9)}{sparkle(110,560,1.1,CORAL)}
'''

# 12 anxiety: tooth with headphones, calm waves, hand signal
S["managing-dental-anxiety"] = f'''
<rect width="1200" height="675" fill="#e7e4fb"/>
<g fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity=".8">
 <path d="M0,540 C150,500 250,580 400,540 S650,500 800,540 S1050,580 1200,540"/>
 <path d="M0,610 C150,570 250,650 400,610 S650,570 800,610 S1050,650 1200,610"/>
</g>
{tooth(560, 330, 1.35, "calm", extra=f'<path d="M-100,-40 C-100,-170 100,-170 100,-40" fill="none" stroke="{INK}" stroke-width="14"/><rect x="-122" y="-60" width="44" height="80" rx="18" fill="{CORAL}" stroke="{INK}" stroke-width="6"/><rect x="78" y="-60" width="44" height="80" rx="18" fill="{CORAL}" stroke="{INK}" stroke-width="6"/>')}
<g fill="{TEALD}" font-family="Arial" font-size="60" font-weight="700"><text x="780" y="170">&#9834;</text><text x="860" y="110">&#9835;</text><text x="330" y="140">&#9834;</text></g>
<g transform="translate(990,380)">
 <path d="M-50,120 V-10 Q-50,-30 -34,-30 Q-20,-30 -20,-10 V-90 Q-20,-110 -4,-110 Q12,-110 12,-90 V-110 Q12,-130 28,-130 Q44,-130 44,-110 V-90 Q44,-108 60,-108 Q76,-108 76,-88 V-60 Q76,-78 90,-78 Q104,-78 104,-58 V40 Q104,120 40,140 H-20 Q-50,140 -50,120Z" fill="#f2c9a5" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
 <rect x="-66" y="140" width="190" height="60" rx="16" fill="{TEAL}" stroke="{INK}" stroke-width="6"/>
</g>
<g transform="translate(170,420)"><circle r="80" fill="{SUN}" stroke="{INK}" stroke-width="6"/><path d="M-40,0 H40 M0,-40 V40" stroke="#fff" stroke-width="0"/><text x="0" y="14" text-anchor="middle" font-family="Arial" font-weight="700" font-size="40" fill="{INK}">4 · 6</text></g>
{sparkle(740,300,.8,"#fff")}{sparkle(1100,120,1,SUN)}
'''

# 13 brushing & flossing: brush at 45 deg, floss C, sand timer
S["brushing-and-flossing-guide"] = f'''
<rect width="1200" height="675" fill="{MINT}"/>
<path d="M0,420 Q300,380 600,420 T1200,420 V675 H0 Z" fill="{PINK}"/>
{tooth(380, 330, 1.2, "grin")}
{tooth(700, 330, 1.2, "smile")}
<path d="M470,230 C520,300 520,380 470,460" fill="none" stroke="{BLUE}" stroke-width="0"/>
<g stroke="{TEALD}" stroke-width="7" fill="none" stroke-linecap="round">
 <path d="M548,120 C548,200 520,280 560,360 C590,420 600,300 600,230"/>
 <path d="M548,120 C540,60 520,40 500,30"/>
</g>
<g transform="translate(900,470) rotate(-45)">
 <rect x="0" y="-18" width="320" height="36" rx="18" fill="{CORAL}" stroke="{INK}" stroke-width="6"/>
 <rect x="-110" y="-60" width="110" height="60" rx="12" fill="#fff" stroke="{INK}" stroke-width="6"/>
 <g stroke="{BLUE}" stroke-width="10" stroke-linecap="round">{''.join(f'<path d="M{-96+i*20},-50 V-10"/>' for i in range(5))}</g>
</g>
<path d="M860,300 A80,80 0 0 1 920,360" fill="none" stroke="{INK}" stroke-width="5" stroke-dasharray="6 8"/>
<text x="930" y="300" font-family="Arial" font-weight="700" font-size="40" fill="{INK}">45°</text>
<g transform="translate(130,140)">
 <rect x="-60" y="-20" width="120" height="20" rx="8" fill="{INK}"/><rect x="-60" y="200" width="120" height="20" rx="8" fill="{INK}"/>
 <path d="M-46,0 H46 Q46,70 6,100 Q46,130 46,200 H-46 Q-46,130 -6,100 Q-46,70 -46,0Z" fill="#fff" stroke="{INK}" stroke-width="6"/>
 <path d="M-30,20 H30 Q24,60 0,86 Q-24,60 -30,20Z" fill="{SUN}"/>
 <path d="M-30,190 Q0,150 30,190Z" fill="{SUN}"/>
 <text x="0" y="270" text-anchor="middle" font-family="Arial" font-weight="700" font-size="34" fill="{INK}">2 min</text>
</g>
{sparkle(1080,120,1)}{sparkle(300,110,.8,CORAL)}
'''

HERO = f'''
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{SKY}"/><stop offset="1" stop-color="{MINT}"/></linearGradient></defs>
<rect width="1600" height="900" fill="url(#sky)"/>
<circle cx="1380" cy="170" r="100" fill="{SUN}"/>
<g stroke="{SUN}" stroke-width="12" stroke-linecap="round">{''.join(f'<path transform="translate(1380,170) rotate({a})" d="M0,-130 V-160"/>' for a in range(0,360,40))}</g>
{cloud(260,150,1.3)}{cloud(820,110,1)}{cloud(1120,260,.8)}
<path d="M0,640 C300,600 500,660 800,630 S1300,600 1600,640 V900 H0 Z" fill="#9edbc9"/>
<rect y="700" width="1600" height="200" fill="#bfe8dc"/>
<rect y="760" width="1600" height="70" fill="#8fa9b0"/>
<g stroke="#fff" stroke-width="8" stroke-dasharray="50 40"><path d="M0,795 H1600"/></g>
<g transform="translate(560,300)" stroke="{INK}" stroke-width="8" stroke-linejoin="round">
 <rect x="0" y="100" width="520" height="340" fill="#fff"/>
 <path d="M-30,110 L260,-20 L550,110 Z" fill="{TEAL}"/>
 <rect x="200" y="260" width="120" height="180" rx="10" fill="{SUN}"/>
 <circle cx="296" cy="352" r="8" fill="{INK}"/>
 <rect x="40" y="170" width="120" height="100" rx="10" fill="{SKY}"/>
 <rect x="360" y="170" width="120" height="100" rx="10" fill="{SKY}"/>
 <path d="M100,170 V270 M40,220 H160 M420,170 V270 M360,220 H480" stroke-width="5"/>
 <rect x="30" y="300" width="130" height="30" rx="10" fill="{CORAL}"/>
 <rect x="360" y="300" width="130" height="30" rx="10" fill="{CORAL}"/>
 <rect x="130" y="110" width="260" height="46" rx="23" fill="{CORAL}"/>
</g>
<text x="820" y="444" text-anchor="middle" font-family="Arial" font-weight="700" font-size="28" fill="#fff">DENTAL CARE</text>
{tooth(820, 210, 0.75, "grin")}
<g transform="translate(160,560)"><rect x="-14" y="0" width="28" height="160" fill="#8a5a3c"/><circle cx="0" cy="-30" r="90" fill="{TEAL}"/><circle cx="-50" cy="10" r="60" fill="#27b3a5"/><circle cx="50" cy="0" r="66" fill="#27b3a5"/></g>
<g transform="translate(1420,560)"><rect x="-14" y="0" width="28" height="160" fill="#8a5a3c"/><circle cx="0" cy="-30" r="90" fill="{TEAL}"/><circle cx="-50" cy="10" r="60" fill="#27b3a5"/><circle cx="50" cy="0" r="66" fill="#27b3a5"/></g>
{tooth(360, 690, 0.8, "grin", rot=-6)}
{tooth(1240, 700, 0.6, "smile", rot=8)}
{tooth(470, 740, 0.42, "grin", rot=5)}
<g transform="translate(360,690)"><path d="M70,-40 L140,-120" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><rect x="120" y="-190" width="44" height="80" rx="10" fill="#fff" stroke="{INK}" stroke-width="6" transform="rotate(40 142 -150)"/></g>
<g transform="translate(1100,660)"><path d="M-60,0 C-60,-50 0,-50 0,0 C0,30 -30,70 -30,70 S-60,30 -60,0Z" fill="{CORAL}" stroke="{INK}" stroke-width="6"/><circle cx="-30" cy="-4" r="12" fill="#fff"/></g>
{sparkle(1000,240,1.4)}{sparkle(470,230,1)}{sparkle(1480,420,1.1,"#fff")}{sparkle(120,380,.9,"#fff")}
'''

OG = f'''
{dots(1200,630)}
<rect x="40" y="40" width="1120" height="550" rx="40" fill="#fff" stroke="{INK}" stroke-width="8"/>
{tooth(300, 330, 1.35, "grin")}
<g transform="translate(410,160)"><path d="M-40,0 C-40,-50 40,-50 40,0 C40,40 0,90 0,90 S-40,40 -40,0Z" fill="{CORAL}" stroke="{INK}" stroke-width="6"/><circle cx="0" cy="-4" r="14" fill="#fff"/></g>
<text x="520" y="290" font-family="Arial Rounded MT Bold, Arial" font-weight="700" font-size="74" fill="{INK}">The Nearest</text>
<text x="520" y="380" font-family="Arial Rounded MT Bold, Arial" font-weight="700" font-size="74" fill="{TEALD}">Dentists</text>
<text x="524" y="450" font-family="Arial" font-size="32" fill="{INK}">Dental health, explained plainly</text>
{sparkle(1080,140,1.2)}{sparkle(1060,500,.9,CORAL)}
'''

LOGO = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-labelledby="t"><title id="t">The Nearest Dentists logo: a smiling tooth with a map pin</title>
<circle cx="60" cy="60" r="58" fill="{TEAL}"/>
<g transform="translate(58,64) scale(.36)"><path d="{TOOTH_D}" fill="#fff" stroke="{INK}" stroke-width="9"/><circle cx="-28" cy="-34" r="11" fill="{INK}"/><circle cx="28" cy="-34" r="11" fill="{INK}"/><path d="M-24,-6 Q0,22 24,-6" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round"/></g>
<path d="M86,14 c-12,0 -18,9 -18,17 c0,12 18,28 18,28 s18,-16 18,-28 c0,-8 -6,-17 -18,-17z" fill="{CORAL}" stroke="{INK}" stroke-width="3"/><circle cx="86" cy="31" r="6" fill="#fff"/>
</svg>
'''
