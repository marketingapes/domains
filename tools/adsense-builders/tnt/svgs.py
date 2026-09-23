INK = "#1d2b1f"; CREAM = "#fff8ec"; LIME = "#7cb518"; TOM = "#ff5a36"; MUS = "#ffc93c"; BER = "#7a2e5c"
S = f'stroke="{INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"'
S4 = f'stroke="{INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"'


def wrap(title, alt, inner, w=1200, h=675, bg="#ffe9d6"):
    from html import escape
    title, alt = escape(title, quote=False), escape(alt, quote=False)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-labelledby="t d">'
            f'<title id="t">{title}</title><desc id="d">{alt}</desc>'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>' + inner + '</svg>')


def confetti(seed, w=1200, h=675, n=18):
    import random
    r = random.Random(seed)
    out = []
    cols = [TOM, LIME, MUS, BER, "#ffffff"]
    for _ in range(n):
        x, y = r.randint(20, w - 20), r.randint(20, h - 20)
        c = r.choice(cols)
        if r.random() < .5:
            out.append(f'<circle cx="{x}" cy="{y}" r="{r.randint(5,10)}" fill="{c}" opacity=".8"/>')
        else:
            out.append(f'<path d="M{x-10} {y}h20M{x} {y-10}v20" stroke="{c}" stroke-width="5" stroke-linecap="round" opacity=".9"/>')
    return ''.join(out)


def dumbbell(x, y, s=1, rot=0, col=BER):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})">'
            f'<rect x="-70" y="-8" width="140" height="16" rx="6" fill="#9aa39c" {S}/>'
            f'<rect x="-95" y="-32" width="30" height="64" rx="8" fill="{col}" {S}/>'
            f'<rect x="65" y="-32" width="30" height="64" rx="8" fill="{col}" {S}/>'
            f'<rect x="-112" y="-22" width="20" height="44" rx="6" fill="{col}" {S}/>'
            f'<rect x="92" y="-22" width="20" height="44" rx="6" fill="{col}" {S}/></g>')


def face(x, y, r=60, skin="#f2b58a", hair=INK):
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="{skin}" {S}/>'
            f'<path d="M{x-r} {y-8} q{r*.2} {-r*1.2} {r} {-r} q{r*.8} {-r*.2} {r} {r*.9} q-{r*.4} -{r*.6} -{r} -{r*.5} q-{r*.6} 0 -{r} {r*.6}z" fill="{hair}"/>'
            f'<circle cx="{x-r*.35}" cy="{y+4}" r="6" fill="{INK}"/><circle cx="{x+r*.35}" cy="{y+4}" r="6" fill="{INK}"/>'
            f'<path d="M{x-r*.3} {y+r*.35} q{r*.3} {r*.3} {r*.6} 0" fill="none" {S4}/>'
            f'<circle cx="{x-r*.6}" cy="{y+r*.3}" r="9" fill="{TOM}" opacity=".45"/><circle cx="{x+r*.6}" cy="{y+r*.3}" r="9" fill="{TOM}" opacity=".45"/>')


def steam(x, y, n=3):
    return ''.join(f'<path d="M{x+i*40} {y} q-18 -30 0 -60 q18 -30 0 -60" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity=".9"/>' for i in range(n))


def fajitas(t, a):
    i = confetti(1)
    i += f'<ellipse cx="600" cy="600" rx="520" ry="50" fill="#f3cfa8"/>'
    # pan
    i += f'<rect x="170" y="210" width="640" height="360" rx="30" fill="#b9c2bb" {S}/><rect x="200" y="240" width="580" height="300" rx="18" fill="#dfe5e0" {S4}/>'
    import random
    r = random.Random(7)
    for k in range(26):
        x, y = r.randint(230, 720), r.randint(270, 490)
        c = r.choice([TOM, LIME, "#f6d36b", "#c98b4a", "#c98b4a", "#e04b2a"])
        rot = r.randint(-60, 60)
        i += f'<rect x="{x}" y="{y}" width="70" height="20" rx="10" fill="{c}" {S4} transform="rotate({rot} {x+35} {y+10})"/>'
    for k in range(6):
        x, y = r.randint(240, 720), r.randint(280, 500)
        i += f'<path d="M{x} {y} q30 -30 60 0" fill="none" stroke="#f4e6f0" stroke-width="10" stroke-linecap="round"/><path d="M{x} {y} q30 -30 60 0" fill="none" stroke="{BER}" stroke-width="3"/>'
    i += steam(420, 200)
    # tortillas stack
    for k in range(4):
        i += f'<ellipse cx="960" cy="{520-k*16}" rx="150" ry="46" fill="#f5deb0" {S4}/>'
    i += '<circle cx="920" cy="455" r="6" fill="#c98b4a"/><circle cx="1000" cy="465" r="5" fill="#c98b4a"/><circle cx="960" cy="440" r="4" fill="#c98b4a"/>'
    # lime
    i += f'<circle cx="1010" cy="250" r="62" fill="{LIME}" {S}/><circle cx="1010" cy="250" r="44" fill="#d7ecb4" {S4}/>'
    i += ''.join(f'<path d="M1010 250 L{1010+40*__import__("math").cos(k*1.047):.0f} {250+40*__import__("math").sin(k*1.047):.0f}" {S4}/>' for k in range(6))
    # salsa bowl
    i += f'<path d="M60 330 h180 q0 110 -90 110 q-90 0 -90 -110z" fill="#ffffff" {S}/><ellipse cx="150" cy="330" rx="90" ry="22" fill="{TOM}" {S4}/>'
    i += '<circle cx="120" cy="326" r="6" fill="#7cb518"/><circle cx="170" cy="332" r="6" fill="#fff8ec"/>'
    return wrap(t, a, i)


def oats(t, a):
    i = confetti(2)
    i += '<ellipse cx="600" cy="610" rx="540" ry="44" fill="#e9d6b8"/>'
    def jar(x, fill_top, topping):
        g = f'<rect x="{x}" y="180" width="200" height="400" rx="34" fill="#ffffff" fill-opacity=".85" {S}/>'
        g += f'<rect x="{x+14}" y="330" width="172" height="236" rx="22" fill="#f3e3c3"/>'
        g += f'<rect x="{x+14}" y="300" width="172" height="46" fill="{fill_top}"/>'
        g += f'<rect x="{x+14}" y="420" width="172" height="30" fill="#fbf4e6"/>'
        for k in range(10):
            g += f'<ellipse cx="{x+30+ (k*37)%160}" cy="{360+ (k*53)%190}" rx="9" ry="5" fill="#d9bf8f"/>'
        g += f'<rect x="{x-6}" y="150" width="212" height="44" rx="12" fill="{MUS}" {S}/>'
        g += topping
        return g
    i += jar(170, "#f6e7c9", '<circle cx="230" cy="290" r="22" fill="#fff3c4" stroke="#1d2b1f" stroke-width="4"/><circle cx="290" cy="286" r="22" fill="#fff3c4" stroke="#1d2b1f" stroke-width="4"/><path d="M220 305 q60 -30 120 0" fill="#b0763c"/>')
    i += jar(500, "#f2b6c8", ''.join(f'<circle cx="{540+k*30}" cy="{292 - (k%2)*10}" r="15" fill="{c}" stroke="#1d2b1f" stroke-width="4"/>' for k, c in enumerate(["#7a2e5c", "#e04b2a", "#3d4f9c", "#e04b2a", "#7a2e5c"])))
    i += jar(830, "#f0d9a8", '<path d="M870 300 q40 -40 80 0z" fill="#d7ecb4" stroke="#1d2b1f" stroke-width="4"/><path d="M950 300 q40 -40 80 0z" fill="#ff8a6a" stroke="#1d2b1f" stroke-width="4"/>')
    # spoon
    i += f'<g transform="rotate(-25 1100 470)"><ellipse cx="1100" cy="400" rx="30" ry="44" fill="#cfd6d1" {S}/><rect x="1092" y="440" width="16" height="150" rx="8" fill="#cfd6d1" {S}/></g>'
    # oat bag
    i += f'<path d="M40 330 h110 l14 250 h-138z" fill="#f5deb0" {S}/><rect x="56" y="420" width="80" height="60" rx="10" fill="{LIME}" {S4}/>'
    return wrap(t, a, i, bg="#e7f3d6")


def chili(t, a):
    i = confetti(3)
    i += '<ellipse cx="600" cy="615" rx="540" ry="40" fill="#f0c7b3"/>'
    i += steam(470, 190, 4)
    i += f'<path d="M300 270 h600 v210 q0 110 -110 110 h-380 q-110 0 -110 -110z" fill="{BER}" {S}/>'
    i += f'<rect x="250" y="250" width="700" height="46" rx="20" fill="#9b4a7a" {S}/>'
    i += f'<ellipse cx="600" cy="260" rx="320" ry="30" fill="#b8321a"/>'
    import random
    r = random.Random(3)
    for k in range(22):
        x = r.randint(310, 880); y = r.randint(245, 275)
        i += f'<ellipse cx="{x}" cy="{y}" rx="12" ry="7" fill="{r.choice(["#3a1f14", "#8a2b1a", "#f6d36b", "#5a2a18"])}"/>'
    i += f'<rect x="230" y="310" width="50" height="30" rx="14" fill="#9b4a7a" {S4}/><rect x="920" y="310" width="50" height="30" rx="14" fill="#9b4a7a" {S4}/>'
    # spoon
    i += f'<path d="M760 250 L930 80" stroke="#c98b4a" stroke-width="22" stroke-linecap="round"/><path d="M760 250 L930 80" fill="none" {S4}/>'
    # cans
    for x, c in [(60, "#3a3a3a"), (150, TOM)]:
        i += f'<rect x="{x}" y="420" width="80" height="160" rx="10" fill="#d8dcd9" {S}/><rect x="{x}" y="460" width="80" height="70" fill="{c}" {S4}/>'
    # small bowl
    i += f'<path d="M960 470 h200 q0 110 -100 110 q-100 0 -100 -110z" fill="#ffffff" {S}/><ellipse cx="1060" cy="470" rx="100" ry="24" fill="#b8321a" {S4}/><ellipse cx="1060" cy="462" rx="40" ry="14" fill="#ffffff"/>'
    i += '<path d="M1040 460 l10 -8M1070 462 l8 -9" stroke="#7cb518" stroke-width="6" stroke-linecap="round"/>'
    # jalapeno
    i += f'<path d="M1010 330 q90 -40 150 30 q-80 10 -150 -30z" fill="{LIME}" {S}/><path d="M1010 330 q-20 -20 -10 -40" fill="none" {S4}/>'
    return wrap(t, a, i, bg="#ffe3d3")


def eggcups(t, a):
    i = confetti(4)
    i += '<ellipse cx="600" cy="615" rx="540" ry="40" fill="#e9d6b8"/>'
    i += f'<rect x="210" y="230" width="640" height="340" rx="36" fill="#9aa39c" {S}/>'
    import random
    r = random.Random(4)
    for row in range(3):
        for col in range(4):
            cx, cy = 300 + col * 152, 300 + row * 100
            i += f'<ellipse cx="{cx}" cy="{cy}" rx="62" ry="38" fill="#6f7a73" {S4}/>'
            i += f'<ellipse cx="{cx}" cy="{cy-8}" rx="56" ry="32" fill="#f7c948" {S4}/>'
            for k in range(4):
                i += f'<circle cx="{cx + r.randint(-35,35)}" cy="{cy - 8 + r.randint(-16,16)}" r="6" fill="{r.choice([LIME, TOM, "#3f7a2a"])}"/>'
    # eggs bowl
    i += f'<path d="M880 400 h240 q0 150 -120 150 q-120 0 -120 -150z" fill="#ffffff" {S}/>'
    for x, y in [(940, 380), (1000, 370), (1060, 384)]:
        i += f'<ellipse cx="{x}" cy="{y}" rx="34" ry="44" fill="#f7ead6" {S4}/>'
    # whisk
    i += f'<g transform="rotate(30 1000 180)"><rect x="990" y="60" width="20" height="100" rx="10" fill="{TOM}" {S4}/>'
    i += ''.join(f'<path d="M1000 160 q{dx} 60 0 120 q{-dx} -60 0 -120" fill="none" stroke="{INK}" stroke-width="4"/>' for dx in (-50, -25, 25, 50)) + '</g>'
    # board with pepper
    i += f'<rect x="30" y="420" width="170" height="130" rx="20" fill="#d9a066" {S}/><path d="M70 470 q40 -30 90 0 q-45 40 -90 0z" fill="{TOM}" {S4}/>'
    return wrap(t, a, i, bg="#fff1c7")


def salmon(t, a):
    i = confetti(5)
    i += '<ellipse cx="600" cy="620" rx="540" ry="36" fill="#cfe3c6"/>'
    def bowl(cx, s):
        g = f'<g transform="translate({cx} 400) scale({s})">'
        g += f'<path d="M-240 0 h480 q0 200 -240 200 q-240 0 -240 -200z" fill="#3d6f8e" {S}/><path d="M-200 60 h400" stroke="#ffffff" stroke-width="6" stroke-dasharray="14 14" opacity=".6"/>'
        g += f'<ellipse cx="0" cy="0" rx="240" ry="54" fill="#fbfbf6" {S}/>'
        g += f'<path d="M-160 -20 q70 -70 150 -20 q10 30 -30 44 q-90 10 -120 -24z" fill="#ff8a5c" {S4}/>'
        g += ''.join(f'<path d="M{-140+k*30} -30 l16 30" stroke="#ffffff" stroke-width="5"/>' for k in range(4))
        g += ''.join(f'<ellipse cx="{40+k*28}" cy="{-8 + (k%2)*14}" rx="14" ry="10" fill="{LIME}" {S4}/>' for k in range(5))
        g += ''.join(f'<circle cx="{-40+k*44}" cy="28" r="17" fill="#d7ecb4" {S4}/>' for k in range(4))
        g += ''.join(f'<rect x="{130+k*10}" y="{-30+k*12}" width="60" height="9" rx="4" fill="{TOM}" transform="rotate(-20 160 0)"/>' for k in range(3))
        g += ''.join(f'<ellipse cx="{-100+k*47}" cy="{-40 + (k%3)*8}" rx="3" ry="2" fill="{INK}"/>' for k in range(6))
        g += '</g>'
        return g
    i += bowl(360, 1) + bowl(880, .85)
    i += f'<path d="M620 160 L1000 380" stroke="#c98b4a" stroke-width="16" stroke-linecap="round"/><path d="M650 140 L1030 360" stroke="#c98b4a" stroke-width="16" stroke-linecap="round"/>'
    return wrap(t, a, i, bg="#dff0f5")


def protein(t, a):
    i = confetti(6)
    i += '<ellipse cx="600" cy="620" rx="520" ry="36" fill="#e9d6b8"/>'
    i += f'<path d="M600 160 v400" {S}/><path d="M520 580 h160 l-20 -30 h-120z" fill="{BER}" {S}/>'
    i += f'<circle cx="600" cy="150" r="22" fill="{MUS}" {S}/>'
    i += f'<g transform="rotate(-6 600 200)"><rect x="240" y="192" width="720" height="18" rx="9" fill="{MUS}" {S}/>'
    i += f'<path d="M300 210 l-60 150 M300 210 l60 150 M900 210 l-60 150 M900 210 l60 150" {S4} fill="none"/>'
    i += f'<path d="M210 360 h180 q0 50 -90 50 q-90 0 -90 -50z" fill="#ffffff" {S}/>'
    i += f'<path d="M810 360 h180 q0 50 -90 50 q-90 0 -90 -50z" fill="#ffffff" {S}/></g>'
    # plate content on left pan (tilted down left)
    i += f'<ellipse cx="258" cy="358" rx="34" ry="24" fill="#ffffff" {S4}/><circle cx="258" cy="358" r="12" fill="{MUS}"/>'
    i += f'<path d="M290 360 q30 -40 70 -14 q0 26 -40 30z" fill="#e0a36c" {S4}/>'
    i += ''.join(f'<ellipse cx="{230+k*18}" cy="384" rx="9" ry="6" fill="#5a2a18"/>' for k in range(5))
    i += dumbbell(900, 300, .6)
    # notebook
    i += f'<rect x="920" y="420" width="220" height="170" rx="14" fill="#ffffff" {S}/>'
    i += ''.join(f'<rect x="{950+k*45}" y="{560-h}" width="30" height="{h}" fill="{c}" {S4}/>' for k, (h, c) in enumerate([(40, LIME), (70, MUS), (100, TOM), (80, LIME)]))
    i += f'<path d="M60 560 q40 -120 110 -130" fill="none" stroke="{LIME}" stroke-width="10" stroke-linecap="round"/><circle cx="175" cy="428" r="18" fill="{TOM}" {S4}/>'
    return wrap(t, a, i, bg="#f4ecff")


def grocery(t, a):
    i = confetti(7)
    i += '<ellipse cx="600" cy="620" rx="540" ry="34" fill="#e2d4bd"/>'
    # items in cart
    i += f'<rect x="330" y="170" width="70" height="140" rx="12" fill="#ffffff" {S}/><path d="M330 200 h70" {S4}/><rect x="340" y="230" width="50" height="40" fill="{LIME}"/>'
    i += f'<rect x="420" y="200" width="120" height="100" rx="10" fill="#f5deb0" {S}/>'
    i += ''.join(f'<ellipse cx="{445+k*36}" cy="215" rx="16" ry="20" fill="#fff4e0" {S4}/>' for k in range(3))
    i += f'<path d="M560 230 q60 -80 130 -20 q-10 60 -80 70 q-50 0 -50 -50z" fill="#f2a58a" {S}/><circle cx="660" cy="220" r="10" fill="#ffffff" {S4}/>'
    i += f'<rect x="700" y="210" width="90" height="90" rx="14" fill="#ffffff" {S}/><rect x="700" y="236" width="90" height="30" fill="{TOM}"/>'
    i += f'<rect x="800" y="230" width="80" height="70" rx="10" fill="#f4f1e6" {S}/>'
    i += f'<rect x="600" y="140" width="60" height="90" rx="8" fill="#d8dcd9" {S4}/><rect x="600" y="165" width="60" height="36" fill="{BER}"/>'
    # cart
    i += f'<path d="M140 150 h90 l70 320 h520 l60 -210 h-620" fill="none" {S}/>'
    i += f'<path d="M270 300 h610 l-50 170 h-520z" fill="#cfe7f3" fill-opacity=".7" {S}/>'
    i += ''.join(f'<path d="M{330+k*80} 300 l-10 170" stroke="{INK}" stroke-width="3" opacity=".5"/>' for k in range(7))
    i += f'<path d="M310 470 l-20 60 h540" fill="none" {S}/>'
    i += f'<circle cx="360" cy="570" r="30" fill="{MUS}" {S}/><circle cx="780" cy="570" r="30" fill="{MUS}" {S}/>'
    # clipboard
    i += f'<rect x="940" y="160" width="210" height="300" rx="16" fill="#d9a066" {S}/><rect x="960" y="190" width="170" height="250" rx="8" fill="#ffffff" {S4}/><rect x="1000" y="170" width="90" height="36" rx="10" fill="#9aa39c" {S4}/>'
    for k in range(5):
        y = 230 + k * 42
        i += f'<rect x="975" y="{y}" width="22" height="22" rx="5" fill="{MUS}" {S4}/><path d="M1010 {y+11} h100" stroke="{INK}" stroke-width="5" stroke-linecap="round" opacity=".6"/>'
        if k < 3:
            i += f'<path d="M978 {y+10} l7 8 l14 -18" fill="none" stroke="{TOM}" stroke-width="6" stroke-linecap="round"/>'
    return wrap(t, a, i, bg="#fff3dc")


def safety(t, a):
    i = confetti(8)
    i += '<ellipse cx="600" cy="625" rx="540" ry="30" fill="#c9dce4"/>'
    i += f'<rect x="300" y="60" width="460" height="560" rx="30" fill="#e8eef0" {S}/>'
    i += f'<rect x="330" y="90" width="400" height="500" rx="16" fill="#ffffff" {S4}/>'
    for y in (220, 360, 480):
        i += f'<path d="M340 {y} h380" stroke="#9fb3bb" stroke-width="6"/>'
    cols = [(TOM, "MON"), (LIME, "TUE"), (MUS, "WED"), (BER, "THU")]
    k = 0
    for y in (160, 300):
        for x in (360, 540):
            c, lab = cols[k]; k += 1
            i += f'<rect x="{x}" y="{y}" width="150" height="60" rx="12" fill="#f6f6f2" {S4}/><rect x="{x}" y="{y}" width="150" height="16" rx="6" fill="{c}"/>'
            i += f'<rect x="{x+40}" y="{y+26}" width="70" height="24" rx="4" fill="#fff3c4" stroke="{INK}" stroke-width="3"/><text x="{x+75}" y="{y+44}" font-family="sans-serif" font-size="16" font-weight="700" text-anchor="middle" fill="{INK}">{lab}</text>'
    i += f'<ellipse cx="450" cy="440" rx="80" ry="28" fill="#fbe0c8" {S4}/><ellipse cx="630" cy="440" rx="60" ry="30" fill="#d7ecb4" {S4}/>'
    i += f'<rect x="760" y="80" width="30" height="120" rx="10" fill="#9aa39c" {S4}/>'
    # thermometer
    i += f'<rect x="870" y="120" width="60" height="330" rx="30" fill="#ffffff" {S}/><rect x="888" y="330" width="24" height="100" rx="12" fill="#3d8ec9"/><circle cx="900" cy="470" r="50" fill="#3d8ec9" {S}/>'
    i += ''.join(f'<path d="M930 {170+k*40} h24" {S4}/>' for k in range(6))
    i += f'<text x="980" y="360" font-family="sans-serif" font-size="40" font-weight="800" fill="{INK}">40&#176;F</text>'
    # calendar
    i += f'<rect x="60" y="180" width="200" height="200" rx="16" fill="#ffffff" {S}/><rect x="60" y="180" width="200" height="50" rx="16" fill="{TOM}" {S4}/>'
    for rr in range(3):
        for cc in range(4):
            x, y = 85 + cc * 45, 255 + rr * 40
            i += f'<circle cx="{x}" cy="{y}" r="8" fill="#d8dcd9"/>'
    i += f'<circle cx="85" cy="255" r="18" fill="none" stroke="{LIME}" stroke-width="6"/><circle cx="220" cy="295" r="18" fill="none" stroke="{TOM}" stroke-width="6"/>'
    return wrap(t, a, i, bg="#e3f1f6")


def mealprep(t, a):
    i = confetti(9)
    i += f'<rect x="0" y="470" width="1200" height="205" fill="#d9a066"/><path d="M0 470 h1200" {S}/>'
    i += f'<rect x="60" y="60" width="180" height="230" rx="10" fill="#ffffff" {S}/><rect x="120" y="44" width="60" height="30" rx="8" fill="{TOM}" {S4}/>'
    for k in range(5):
        y = 110 + k * 34
        i += f'<rect x="80" y="{y}" width="18" height="18" rx="4" fill="{MUS}" stroke="{INK}" stroke-width="3"/><path d="M110 {y+9} h110" stroke="{INK}" stroke-width="4" opacity=".5"/>'
    # timer
    i += f'<circle cx="400" cy="200" r="90" fill="{MUS}" {S}/><circle cx="400" cy="200" r="66" fill="#ffffff" {S4}/><path d="M400 200 V150 M400 200 L440 220" {S}/><rect x="385" y="96" width="30" height="20" rx="4" fill="{INK}"/>'
    # pot on counter
    i += steam(640, 240, 3)
    i += f'<path d="M580 280 h240 v140 q0 50 -50 50 h-140 q-50 0 -50 -50z" fill="#9aa39c" {S}/><ellipse cx="700" cy="280" rx="120" ry="18" fill="#fbfbf6" {S4}/>'
    # tray
    i += f'<rect x="870" y="340" width="300" height="120" rx="14" fill="#b9c2bb" {S}/>'
    import random
    r = random.Random(9)
    for k in range(14):
        x, y = r.randint(890, 1130), r.randint(360, 430)
        i += f'<rect x="{x}" y="{y}" width="30" height="26" rx="8" fill="{r.choice([TOM, LIME, "#f39c3a", "#3f7a2a"])}" stroke="{INK}" stroke-width="3"/>'
    # containers
    for k in range(4):
        x = 90 + k * 260
        i += f'<rect x="{x}" y="500" width="220" height="130" rx="18" fill="#ffffff" fill-opacity=".85" {S}/><path d="M{x+110} 510 v110" stroke="{INK}" stroke-width="4"/>'
        i += f'<ellipse cx="{x+55}" cy="570" rx="40" ry="34" fill="#fbf4e6" stroke="{INK}" stroke-width="3"/>'
        i += f'<rect x="{x+130}" y="535" width="36" height="30" rx="8" fill="#e0a36c" stroke="{INK}" stroke-width="3"/><circle cx="{x+180}" cy="590" r="16" fill="{LIME}" stroke="{INK}" stroke-width="3"/>'
    return wrap(t, a, i, bg="#fdf0e0")


def fullbody(t, a):
    i = confetti(10)
    i += f'<rect x="0" y="520" width="1200" height="155" fill="#c8b59a"/><path d="M0 520 h1200" {S}/>'
    # calendar
    i += f'<rect x="850" y="70" width="280" height="220" rx="16" fill="#ffffff" {S}/><rect x="850" y="70" width="280" height="50" rx="16" fill="{LIME}" {S4}/>'
    days = ["M", "T", "W", "T", "F", "S", "S"]
    for k, d in enumerate(days):
        x = 870 + k * 37
        i += f'<text x="{x+12}" y="160" font-family="sans-serif" font-size="22" font-weight="800" text-anchor="middle" fill="{INK}">{d}</text>'
        if k in (0, 2, 4):
            i += f'<circle cx="{x+12}" cy="210" r="16" fill="{TOM}" {S4}/><path d="M{x+4} 210 l6 7 l10 -14" fill="none" stroke="#ffffff" stroke-width="4"/>'
        else:
            i += f'<circle cx="{x+12}" cy="210" r="10" fill="#e0e5e1"/>'
    # bench
    i += f'<rect x="80" y="430" width="300" height="36" rx="12" fill="{BER}" {S}/><path d="M120 466 v60 M340 466 v60" {S}/>'
    i += dumbbell(230, 400, .7, 0, TOM)
    # band
    i += f'<path d="M1020 360 q60 80 0 170 q-60 -90 0 -170z" fill="none" stroke="{LIME}" stroke-width="14"/>'
    # person goblet squat
    px, py = 620, 300
    i += f'<path d="M{px-70} {py+120} q-40 60 -110 80 l0 110 h40 l10 -80 q70 -20 110 -60z" fill="#3d4f9c" {S}/>'
    i += f'<path d="M{px+70} {py+120} q40 60 110 80 l0 110 h-40 l-10 -80 q-70 -20 -110 -60z" fill="#3d4f9c" {S}/>'
    i += f'<path d="M{px-80} {py-10} q80 -40 160 0 l10 150 h-180z" fill="{TOM}" {S}/>'
    i += f'<path d="M{px-70} {py+20} q10 70 70 70 q60 0 70 -70" fill="none" stroke="#f2b58a" stroke-width="30" stroke-linecap="round"/>'
    # kettlebell
    i += f'<path d="M{px-28} {py+50} q28 -50 56 0" fill="none" stroke="{INK}" stroke-width="12"/><circle cx="{px}" cy="{py+85}" r="40" fill="{INK}"/>'
    i += face(px, py - 80, 58)
    i += f'<ellipse cx="{px-150}" cy="{py+312}" rx="40" ry="14" fill="#ffffff" {S4}/><ellipse cx="{px+150}" cy="{py+312}" rx="40" ry="14" fill="#ffffff" {S4}/>'
    return wrap(t, a, i, bg="#eaf5da")


def overload(t, a):
    i = confetti(11)
    i += f'<rect x="0" y="560" width="1200" height="115" fill="#e2d4bd"/><path d="M0 560 h1200" {S}/>'
    cols = [LIME, MUS, TOM, BER, "#3d4f9c"]
    for k in range(5):
        x = 260 + k * 170
        h = 60 + k * 80
        i += f'<rect x="{x}" y="{560-h}" width="170" height="{h}" rx="10" fill="{cols[k]}" {S}/>'
        for j in range(h // 40):
            i += f'<path d="M{x+10} {560-h+30+j*40} h150" stroke="{INK}" stroke-width="3" opacity=".25"/>'
        i += f'<circle cx="{x+85}" cy="{560-h+28}" r="14" fill="#ffffff" {S4}/>'
    # figure on step 4
    fx, fy = 855, 150
    i += f'<path d="M{fx-30} {fy+60} h60 l10 90 h-80z" fill="{TOM}" {S}/>'
    i += f'<path d="M{fx-20} {fy+150} l-14 70 M{fx+20} {fy+150} l20 60" {S}/>'
    i += f'<path d="M{fx+30} {fy+80} l60 -40" {S}/>'
    i += dumbbell(fx + 100, fy + 30, .35, -30, INK)
    i += face(fx, fy + 20, 36)
    # notebook
    i += f'<rect x="40" y="420" width="200" height="130" rx="10" fill="#ffffff" {S}/><path d="M60 460 h150 M60 490 h120 M60 520 h140" stroke="{INK}" stroke-width="5" opacity=".5"/><rect x="40" y="420" width="24" height="130" fill="{TOM}" {S4}/>'
    # arrow
    i += f'<path d="M140 330 Q500 60 1080 110" fill="none" stroke="{INK}" stroke-width="6" stroke-dasharray="4 16" stroke-linecap="round"/><path d="M1060 90 l30 20 l-34 16" fill="none" {S}/>'
    return wrap(t, a, i, bg="#fff6d6")


def habits(t, a):
    i = confetti(12)
    i += f'<rect x="0" y="540" width="1200" height="135" fill="#c8b59a"/><path d="M0 540 h1200" {S}/>'
    i += f'<rect x="120" y="60" width="520" height="400" rx="20" fill="#ffffff" {S}/><rect x="120" y="60" width="520" height="70" rx="20" fill="{BER}" {S4}/>'
    i += f'<circle cx="200" cy="60" r="12" fill="{INK}"/><circle cx="560" cy="60" r="12" fill="{INK}"/>'
    for rr in range(4):
        for cc in range(7):
            x, y = 150 + cc * 68, 160 + rr * 72
            i += f'<rect x="{x}" y="{y}" width="56" height="56" rx="10" fill="#f6f6f2" stroke="{INK}" stroke-width="3"/>'
            idx = rr * 7 + cc
            if idx < 19 and idx != 9:
                i += f'<path d="M{x+12} {y+30} l10 12 l22 -26" fill="none" stroke="{LIME}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'
    # sneakers
    for dx in (0, 150):
        x = 700 + dx
        i += f'<path d="M{x} 520 v-50 q0 -20 30 -20 q20 30 60 30 q50 10 60 40 z" fill="{TOM}" {S}/><path d="M{x-4} 520 h156" stroke="#ffffff" stroke-width="12"/><path d="M{x-4} 520 h156" fill="none" {S4}/>'
        i += f'<path d="M{x+36} 462 l24 10 M{x+44} 452 l22 12" {S4}/>'
    # table with fruit + bottle
    i += f'<rect x="960" y="360" width="220" height="20" rx="6" fill="#d9a066" {S}/><path d="M990 380 v160 M1150 380 v160" {S}/>'
    i += f'<path d="M980 330 h110 q0 40 -55 40 q-55 0 -55 -40z" fill="#ffffff" {S4}/>'
    i += f'<circle cx="1010" cy="318" r="20" fill="{TOM}" {S4}/><circle cx="1050" cy="314" r="20" fill="{MUS}" {S4}/><path d="M1030 300 q20 -30 40 -10 q-20 20 -40 10z" fill="{LIME}" {S4}/>'
    i += f'<rect x="1110" y="250" width="44" height="110" rx="14" fill="#8fd0e8" {S}/><rect x="1116" y="232" width="32" height="24" rx="6" fill="{INK}"/>'
    return wrap(t, a, i, bg="#f0e4ee")


ARTICLE_SVG = {
    "sheet-pan-chicken-fajitas": fajitas, "protein-overnight-oats": oats, "turkey-black-bean-chili": chili,
    "egg-muffin-cups": eggcups, "salmon-rice-bowls": salmon, "how-much-protein-do-you-need": protein,
    "high-protein-grocery-list": grocery, "meal-prep-food-safety": safety, "sunday-meal-prep-plan": mealprep,
    "beginner-full-body-workout": fullbody, "progressive-overload-explained": overload, "habits-that-stick": habits,
}


def hero():
    t = "Toned 'N Tasty kitchen gym"
    a = "Illustration of a cheerful cook in an apron flipping a pan of vegetables with one hand and lifting a dumbbell with the other, in a bright kitchen with a fruit bowl, a pot of steaming chili and a kettlebell on the floor."
    i = confetti(20, 1600, 900, 30)
    i += f'<circle cx="1180" cy="260" r="220" fill="{MUS}" opacity=".6"/>'
    i += f'<rect x="0" y="690" width="1600" height="210" fill="#d9a066"/><path d="M0 690 h1600" {S}/>'
    # shelves / window
    i += f'<rect x="90" y="90" width="360" height="260" rx="20" fill="#cfe7f3" {S}/><path d="M270 90 v260 M90 220 h360" {S}/>'
    i += f'<rect x="1150" y="120" width="360" height="20" rx="6" fill="{BER}" {S4}/>'
    for k, c in enumerate([TOM, LIME, MUS, "#ffffff"]):
        i += f'<rect x="{1170+k*80}" y="{50}" width="56" height="70" rx="10" fill="{c}" {S4}/>'
    # counter items: pot
    i += steam(250, 560, 3)
    i += f'<path d="M180 580 h240 v90 q0 20 -20 20 h-200 q-20 0 -20 -20z" fill="{BER}" {S}/><ellipse cx="300" cy="580" rx="125" ry="18" fill="#b8321a" {S4}/>'
    # fruit bowl
    i += f'<path d="M1200 640 h220 q0 50 -110 50 q-110 0 -110 -50z" fill="#ffffff" {S}/>'
    i += f'<circle cx="1260" cy="620" r="30" fill="{TOM}" {S4}/><circle cx="1320" cy="610" r="30" fill="{MUS}" {S4}/><circle cx="1375" cy="624" r="28" fill="{LIME}" {S4}/>'
    # kettlebell on floor
    i += f'<path d="M1420 770 q40 -70 80 0" fill="none" stroke="{INK}" stroke-width="16"/><circle cx="1460" cy="810" r="54" fill="{INK}"/><text x="1460" y="822" font-family="sans-serif" font-size="30" font-weight="800" fill="#fff" text-anchor="middle">12</text>'
    # person
    px, py = 800, 330
    i += f'<path d="M{px-110} {py+80} q110 -50 220 0 l30 330 h-280z" fill="{TOM}" {S}/>'
    i += f'<path d="M{px-80} {py+130} h160 l20 280 h-200z" fill="#ffffff" {S}/><path d="M{px-60} {py+250} h120" stroke="{LIME}" stroke-width="10"/>'
    i += f'<rect x="{px-100}" y="{py+410}" width="80" height="170" rx="20" fill="#3d4f9c" {S}/><rect x="{px+20}" y="{py+410}" width="80" height="170" rx="20" fill="#3d4f9c" {S}/>'
    # left arm with pan
    i += f'<path d="M{px-110} {py+110} q-120 30 -170 -40" fill="none" stroke="#f2b58a" stroke-width="40" stroke-linecap="round"/>'
    i += f'<path d="M{px-290} {py+60} l-150 -40" stroke="{INK}" stroke-width="18" stroke-linecap="round"/>'
    i += f'<ellipse cx="{px-510}" cy="{py+10}" rx="120" ry="30" fill="#6f7a73" {S}/>'
    for k, c in enumerate([LIME, TOM, MUS, LIME, TOM]):
        i += f'<rect x="{px-590+k*34}" y="{py-80-(k%3)*30}" width="30" height="18" rx="8" fill="{c}" {S4} transform="rotate({k*25} {px-575+k*34} {py-70})"/>'
    # right arm with dumbbell raised
    i += f'<path d="M{px+110} {py+110} q110 0 120 -140" fill="none" stroke="#f2b58a" stroke-width="40" stroke-linecap="round"/>'
    i += dumbbell(px + 232, py - 60, .8, -80, LIME)
    i += face(px, py, 80)
    i += f'<path d="M{px-90} {py-50} q90 -60 180 0 l-10 -40 q-80 -40 -160 0z" fill="#ffffff" {S4}/>'
    return wrap(t, a, i, 1600, 900, "#ffe9d6")


def og():
    t = "Toned 'N Tasty"
    a = "Share card reading Toned 'N Tasty, eat well, train hard, stop guessing, with an illustrated fork and dumbbell crossed over a plate."
    i = confetti(21, 1200, 630, 24)
    i += f'<circle cx="990" cy="300" r="170" fill="#ffffff" {S}/><circle cx="990" cy="300" r="125" fill="{CREAM}" {S4}/>'
    i += f'<g transform="rotate(40 990 300)"><rect x="980" y="150" width="20" height="300" rx="10" fill="#cfd6d1" {S}/>'
    i += ''.join(f'<rect x="{962+k*15}" y="120" width="10" height="80" rx="5" fill="#cfd6d1" {S4}/>' for k in range(4)) + '</g>'
    i += dumbbell(990, 300, .9, 40, TOM)
    i += f'<text x="80" y="260" font-family="Trebuchet MS, sans-serif" font-size="96" font-weight="800" fill="{INK}">Toned &#8217;N</text>'
    i += f'<text x="80" y="370" font-family="Trebuchet MS, sans-serif" font-size="110" font-weight="800" fill="{TOM}" stroke="{INK}" stroke-width="3">Tasty</text>'
    i += f'<text x="84" y="450" font-family="Trebuchet MS, sans-serif" font-size="30" font-weight="700" fill="{INK}">Eat well. Train hard. Stop guessing.</text>'
    return wrap(t, a, i, 1200, 630, "#e7f3d6")


def logo():
    t = "Toned &#8217;N Tasty logo"
    a = "Round badge with a fork and a dumbbell crossed."
    i = f'<circle cx="60" cy="60" r="54" fill="{MUS}" {S}/>'
    i += f'<g transform="rotate(-40 60 60)"><rect x="24" y="55" width="72" height="10" rx="4" fill="{INK}"/><rect x="18" y="42" width="12" height="36" rx="4" fill="{TOM}" {S4}/><rect x="90" y="42" width="12" height="36" rx="4" fill="{TOM}" {S4}/></g>'
    i += f'<g transform="rotate(40 60 60)"><rect x="56" y="28" width="8" height="70" rx="4" fill="{INK}"/><path d="M50 16 v20 q10 8 20 0 v-20" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/></g>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-labelledby="t"><title id="t">{t}</title>' + i + '</svg>')


def notfound():
    t = "Empty plate"
    a = "Illustration of an empty plate with a fork and a crumb, and a question mark."
    i = f'<ellipse cx="300" cy="200" rx="200" ry="120" fill="#ffffff" {S}/><ellipse cx="300" cy="200" rx="140" ry="80" fill="{CREAM}" {S4}/>'
    i += f'<circle cx="330" cy="210" r="8" fill="#c98b4a"/><text x="300" y="225" font-family="Trebuchet MS, sans-serif" font-size="110" font-weight="800" fill="{TOM}" text-anchor="middle" stroke="{INK}" stroke-width="3">?</text>'
    i += f'<rect x="530" y="80" width="16" height="240" rx="8" fill="#cfd6d1" {S4}/>'
    return wrap(t, a, i, 600, 400, "#e7f3d6")
