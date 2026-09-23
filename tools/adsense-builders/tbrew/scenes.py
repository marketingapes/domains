from svg import *

W, H = 1200, 675

def scene_styles():
    b = bg(W, H, "#ffe9c7", "#ffd79a", [(160, 140, 120, "#fff", .35), (1060, 120, 160, "#fff", .3)])
    b += floor(W, H, 560, "#c98b52")
    b += wheat(90, 560, 1.5, -12) + wheat(130, 565, 1.3, 8)
    cols = [("pilsner", "#f7d56a"), ("weizen", "#f2b640"), ("tulip", "#d9822b"), ("nonic", "#9b4a1c"), ("pint", "#2a150a")]
    for i, (k, c) in enumerate(cols):
        x = 270 + i * 170
        b += glass(k, x, 560, 1.25 if k != "weizen" else 1.1, c, .8, 28, face=(i in (1, 3)), foamc="#f3e2c3" if c == "#2a150a" else "#fffaf0")
    b += hop(1110, 470, 1.4, 20) + hop(1060, 520, 1.1, -15)
    b += '<path d="M260 610 L1000 610" stroke="#2a1a0e" stroke-width="5"/><path d="M1000 610 l-20 -12 m20 12 l-20 12" stroke="#2a1a0e" stroke-width="5" fill="none"/>'
    b += '<text x="260" y="650" font-family="Georgia,serif" font-size="28" fill="#2a1a0e">pale</text><text x="930" y="650" font-family="Georgia,serif" font-size="28" fill="#2a1a0e">dark</text>'
    return b

def scene_ipa():
    b = bg(W, H, "#e7f5d6", "#c8e6a8", [(600, 330, 300, "#fff", .35)])
    b += floor(W, H, 580, "#8fbf5a")
    for i, (x, y, r, s) in enumerate([(120, 90, 20, 1), (320, 60, -30, .9), (520, 110, 15, 1.1), (760, 70, -10, 1), (980, 100, 35, .95), (1120, 230, -25, .8), (80, 300, 10, .8)]):
        b += hop(x, y, s, r)
    b += glass("pint", 300, 580, 1.3, "#f2b640", .8, 26, face=True)
    b += glass("tulip", 510, 580, 1.25, "#f7d56a", .8, 30)
    b += glass("teku", 720, 580, 1.25, "#f4cf57", .82, 26, face=True)
    b += glass("pint", 920, 580, 1.3, "#e39a2e", .8, 26)
    b += lemon(1080, 540, 58, "#ff8a65", "#e2574c") + lemon(160, 560, 44, "#ff8a65", "#e2574c")
    return b

def scene_stout():
    b = bg(W, H, "#3b2314", "#241408", [(200, 120, 180, "#5a3218", .6), (1000, 520, 220, "#5a3218", .5)])
    b += floor(W, H, 580, "#6b3a1a")
    b += glass("pint", 470, 580, 1.55, "#1a0d06", .8, 32, face=True, foamc="#f1dcb4")
    b += glass("nonic", 700, 580, 1.4, "#3d1c0b", .8, 22, foamc="#e8cfa2")
    b += choc(930, 540, 1.2, -12)
    for (x, y, r) in [(200, 560, 20), (250, 540, -30), (160, 520, 60), (1060, 420, 10), (1110, 460, -40), (300, 575, 80)]:
        b += bean(x, y, 1.1, r)
    b += bubbles(420, 250, 100, 180, 8, 4, "#f1dcb4", .35)
    for x, y in [(120, 120), (1080, 150), (620, 90)]:
        b += sparkle(x, y, 1.2, "#ffd23f")
    return b

def scene_sour():
    b = bg(W, H, "#ffe3ea", "#ffc2d1", [(950, 160, 170, "#fff", .4), (240, 200, 120, "#fff", .35)])
    b += floor(W, H, 580, "#e8a0b4")
    b += barrel(260, 580, 1.4)
    b += glass("tulip", 600, 580, 1.55, "#e0457b", .8, 28, face=True, foamc="#ffe4ee")
    b += glass("stange", 800, 580, 1.3, "#f7d56a", .85, 18)
    b += cherries(960, 560, 1.3) + lemon(1090, 520, 50) + lemon(460, 590, 36)
    b += bubbles(520, 120, 200, 160, 9, 7, "#fff", .7)
    return b

def scene_pairing():
    b = bg(W, H, "#fff1d6", "#ffe0ad", [(1050, 100, 140, "#fff", .4)])
    b += '<path d="M0 430 L1200 430 L1200 675 L0 675 Z" fill="#a0612f"/><path d="M0 430 L1200 430" stroke="#2a1a0e" stroke-width="5"/>'
    for yy in (480, 540, 600):
        b += f'<path d="M0 {yy} Q600 {yy+10} 1200 {yy}" stroke="#8a5227" stroke-width="3" fill="none"/>'
    b += plate(330, 540, 190, 55) + cheese(290, 540, 1.1) + oyster(430, 540, .9)
    b += plate(840, 560, 150, 45) + chili(840, 555, 1.2, -8)
    b += glass("tulip", 600, 520, 1.1, "#d9822b", .8, 26, face=True)
    b += glass("pint", 1070, 540, 1.05, "#1a0d06", .8, 26, foamc="#f1dcb4")
    b += glass("weizen", 110, 520, .95, "#f2c14e", .8, 30)
    for x, y in [(200, 120), (700, 90), (480, 200)]:
        b += sparkle(x, y, 1, "#ffd23f")
    return b

def scene_glassware():
    b = bg(W, H, "#e6f4f7", "#c9e7ee", [(600, 300, 360, "#fff", .35)])
    b += shelf(60, 330, 1080) + shelf(60, 610, 1080)
    top = [("pint", "#f2b640"), ("tulip", "#d9822b"), ("snifter", "#3d1c0b"), ("teku", "#f4cf57")]
    for i, (k, c) in enumerate(top):
        b += glass(k, 190 + i * 270, 330, 1.05, c, .75, 22, face=(i == 1), foamc="#f1dcb4" if k == "snifter" else "#fffaf0")
    bot = [("pilsner", "#f7d56a"), ("weizen", "#f2c14e"), ("stange", "#f4e08a"), ("mug", "#e8a33a")]
    for i, (k, c) in enumerate(bot):
        b += glass(k, 190 + i * 270, 610, 1.0, c, .8, 26, face=(i == 3))
    return b

def scene_tasting():
    b = bg(W, H, "#f3ecff", "#dccfff", [(260, 160, 150, "#fff", .4), (980, 520, 160, "#fff", .3)])
    b += floor(W, H, 590, "#b9a3e8")
    b += wheel(930, 250, 150)
    b += glass("tulip", 470, 590, 1.6, "#e39a2e", .8, 30)
    b += glass("pint", 260, 590, 1.3, "#f2b640", .8, 26, face=True, rot=12, mood="sniff")
    b += '<path d="M330 330 q20 -30 60 -20 M340 360 q30 -20 60 -6" fill="none" stroke="#fff" stroke-width="6" opacity=".9"/>'
    b += magnifier(760, 520, 1.2, -35)
    b += '<rect x="880" y="470" width="190" height="130" rx="10" fill="#fff" stroke="#2a1a0e" stroke-width="4" transform="rotate(6 975 535)"/>'
    for i in range(4):
        b += f'<path d="M905 {505+i*24} h{130 - i*18}" stroke="#b9a3e8" stroke-width="6" transform="rotate(6 975 535)"/>'
    return b

def scene_homebrew():
    b = bg(W, H, "#ffe8d1", "#ffd0a3", [(300, 150, 170, "#fff", .35)])
    b += '<rect x="0" y="0" width="1200" height="120" fill="#fff" opacity=".25"/>'
    b += floor(W, H, 600, "#c98b52")
    b += kettle(340, 540, 1.35)
    b += fermenter(800, 600, 1.3)
    b += grain_pile(1060, 600, 1.0) + hop(1060, 440, 1.0, 20) + hop(1130, 480, .8, -30)
    b += thermo(580, 600, .9, .45, "#d7263d")
    return b

def scene_clean():
    b = bg(W, H, "#dff6f3", "#b7ebe4", [(600, 330, 320, "#fff", .45)])
    b += floor(W, H, 590, "#7fcfc3")
    b += fermenter(600, 590, 1.45, bub=False)
    b += spray(300, 590, 1.3)
    b += brush(920, 600, 1.4, 20)
    b += bubbles(80, 80, 1040, 420, 34, 11, "#fff", .9)
    for x, y, s in [(460, 170, 1.4), (760, 130, 1.1), (840, 300, 1.6), (180, 250, 1)]:
        b += sparkle(x, y, s, "#fff")
    return b

def scene_trip():
    b = bg(W, H, "#e3f2d9", "#cfe8bf", [])
    b += '<rect x="60" y="50" width="1080" height="575" rx="28" fill="#f7f0dc" stroke="#2a1a0e" stroke-width="5"/>'
    b += '<path d="M60 420 Q300 360 520 470 T1140 400 L1140 597 Q1140 625 1112 625 L88 625 Q60 625 60 597 Z" fill="#bfe7ec"/>'
    b += '<path d="M120 120 Q260 80 360 180 T600 260 T860 200 T1080 330" fill="none" stroke="#2a1a0e" stroke-width="18"/>'
    b += '<path d="M120 120 Q260 80 360 180 T600 260 T860 200 T1080 330" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="18 16"/>'
    b += '<path d="M160 300 q40 -40 80 0 q40 -40 80 0" fill="#9fd05a" stroke="#2a1a0e" stroke-width="3"/>'
    b += '<path d="M860 520 q40 -50 90 0" fill="#9fd05a" stroke="#2a1a0e" stroke-width="3"/>'
    b += pin(360, 180, 1.2) + pin(600, 262, 1.2, "#e8962e") + pin(860, 200, 1.2, "#5f8f2f")
    b += brewery(1000, 560, .9)
    b += van(420, 560, 1.1)
    b += glass("pint", 180, 575, .75, "#f2b640", .8, 22, face=True)
    return b

def scene_storage():
    b = bg(W, H, "#e8f1ff", "#cfe0fb", [])
    b += floor(W, H, 610, "#9bb7e0")
    b += sun(930, 150, 64)
    b += '<path d="M900 230 L840 420 M940 240 L930 420 M980 230 L1010 410" stroke="#ffd23f" stroke-width="10" opacity=".7"/>'
    b += bottle(930, 610, 1.1, "#cfe6c9", "#fff7ea", "#5f8f2f", 0, xmark=True)
    b += fridge(360, 610, 1.3)
    b += thermo(690, 610, 1.0, .18, "#3b7fa0")
    b += bottle(1090, 610, .9, "#6b3a1a")
    return b

def scene_pour():
    b = bg(W, H, "#fff0d9", "#ffd9a8", [(820, 200, 200, "#fff", .35)])
    b += '<rect x="0" y="0" width="1200" height="90" fill="#6b3a1a"/><rect x="0" y="90" width="1200" height="14" fill="#2a1a0e"/>'
    b += '<rect x="340" y="104" width="40" height="120" fill="#cfd8dc" stroke="#2a1a0e" stroke-width="4"/>'
    b += tap(540, 250, 1.6, "#c2415a")
    b += glass("pint", 670, 600, 1.5, "#f2b640", .62, 20, rot=-35)
    b += '<path d="M520 430 A170 170 0 0 1 660 330" fill="none" stroke="#c2415a" stroke-width="5" stroke-dasharray="12 10"/>'
    b += '<text x="455" y="400" font-family="Georgia,serif" font-size="44" font-weight="700" fill="#c2415a">45°</text>'
    b += glass("pint", 1000, 600, 1.2, "#f2b640", .75, 32, face=True)
    b += floor(W, H, 612, "#a0612f")
    return b

SCENES = {
    "beer-styles-explained": scene_styles, "ipa-styles-guide": scene_ipa, "stouts-vs-porters": scene_stout,
    "sour-beer-guide": scene_sour, "beer-food-pairing": scene_pairing, "beer-glassware-guide": scene_glassware,
    "how-to-taste-beer": scene_tasting, "homebrewing-basics": scene_homebrew, "cleaning-and-sanitizing": scene_clean,
    "brewery-trip-planning": scene_trip, "beer-storage-freshness": scene_storage, "how-to-pour-beer": scene_pour,
}

def hero():
    w, h = 1600, 900
    b = bg(w, h, "#ffcf8a", "#ffe9c7", [(1300, 170, 110, "#fff4d6", .9)])
    # hills with hop rows
    b += '<path d="M0 470 Q300 360 620 440 T1200 400 T1600 440 L1600 900 L0 900 Z" fill="#9fd05a"/>'
    b += '<path d="M0 520 Q400 440 800 510 T1600 490 L1600 900 L0 900 Z" fill="#7fb241"/>'
    for i in range(9):
        x = 80 + i * 180
        b += f'<path d="M{x} 520 L{x} 400" stroke="#6b3a1a" stroke-width="5"/>'
        b += f'<path d="M{x} 405 L{x+180} 405" stroke="#6b3a1a" stroke-width="2"/>'
    b += brewery(1250, 560, 1.25)
    b += string_lights(1600, 40, 60, 18)
    # bar counter
    b += '<rect x="0" y="600" width="1600" height="300" fill="#a0612f"/><rect x="-10" y="585" width="1620" height="34" rx="8" fill="#c4733a" stroke="#2a1a0e" stroke-width="5"/>'
    for yy in (680, 760, 840):
        b += f'<path d="M0 {yy} Q800 {yy+12} 1600 {yy}" stroke="#8a5227" stroke-width="4" fill="none"/>'
    # characters cheersing
    b += glass("pint", 520, 590, 1.9, "#f2b640", .8, 30, face=True, rot=10)
    b += glass("tulip", 760, 590, 1.9, "#e0457b", .8, 30, face=True, rot=-6)
    b += glass("nonic", 1000, 590, 1.8, "#1a0d06", .8, 28, face=True, rot=-12, foamc="#f1dcb4")
    b += glass("weizen", 250, 590, 1.35, "#f2c14e", .8, 30, face=True, rot=6)
    b += '<g fill="#fffaf0" stroke="#2a1a0e" stroke-width="3"><circle cx="650" cy="230" r="16"/><circle cx="690" cy="200" r="11"/><circle cx="620" cy="195" r="9"/><circle cx="900" cy="230" r="13"/><circle cx="870" cy="195" r="9"/></g>'
    for x, y in [(560, 150), (780, 120), (980, 170)]:
        b += sparkle(x, y, 1.4, "#ffd23f")
    b += hop(140, 180, 1.6, -20) + hop(1480, 300, 1.3, 25) + wheat(1450, 600, 1.4, 10) + wheat(1500, 605, 1.2, -8)
    b += pin(1250, 300, 1.4)
    return svg(w, h, "Cartoon beer glasses clinking at a sunny taproom bar", b,
               "Four smiling cartoon beer glasses — a wheat beer, a pint, a pink sour in a tulip and a stout — cheers at a wooden bar in front of hop fields and a small brewery marked with a map pin.")

def og():
    w, h = 1200, 630
    b = bg(w, h, "#3b2314", "#241408", [(1000, 120, 220, "#5a3218", .6)])
    b += glass("pint", 900, 560, 1.7, "#f2b640", .8, 30, face=True, rot=10)
    b += glass("tulip", 1080, 560, 1.5, "#e0457b", .8, 28, face=True, rot=-8)
    b += hop(120, 110, 1.2, -20)
    b += '<text x="80" y="330" textLength="600" lengthAdjust="spacingAndGlyphs" font-family="Georgia,serif" font-size="96" font-weight="700" fill="#ffcf8a">Tossed Brew</text>'
    b += '<text x="84" y="410" font-family="Georgia,serif" font-size="44" fill="#fff7ea">The beer, and where to find it</text>'
    b += '<text x="84" y="520" font-family="Arial,sans-serif" font-size="28" fill="#e8c77a">tossedbrew.com</text>'
    return svg(w, h, "Tossed Brew — the beer, and where to find it", b)

def logo():
    b = glass("pint", 38, 72, .36, "#f2b640", .8, 30)
    b += hop(66, 36, .38, 25)
    b += '<text x="86" y="53" textLength="118" lengthAdjust="spacingAndGlyphs" font-family="Georgia,serif" font-size="32" font-weight="700" fill="#2a1a0e">Tossed</text>'
    b += '<text x="214" y="53" textLength="80" lengthAdjust="spacingAndGlyphs" font-family="Georgia,serif" font-size="32" font-weight="700" fill="#b8561c">Brew</text>'
    return svg(300, 80, "Tossed Brew", b)
