from svglib import *

W, H = 1200, 675
IMG = {}


def art(slug, title, desc, body, bg=CREAM):
    IMG[slug] = (svg(W, H, title, desc, body, bg), desc)


# 1 first week with a new dog
b = (window(820, 90) + floor(W, H, 470) + rug(560, 560, 330, 55, BUTTER)
     + f'<rect x="120" y="90" width="230" height="250" rx="16" fill="#fff" {S}/>'
     + f'<rect x="120" y="90" width="230" height="56" rx="16" fill="{CORAL}" {S}/>'
     + f'<text x="235" y="128" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="26" fill="#fff">WEEK 1</text>'
     + ''.join(f'<rect x="{140+(i%4)*52}" y="{165+(i//4)*80}" width="40" height="56" rx="8" fill="{MINT if i<5 else CREAM}" {S}/>' for i in range(7))
     + ''.join(f'<path d="M{148+(i%4)*52},{195+(i//4)*80} l8,9 l16,-18" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>' for i in range(5))
     + f'<ellipse cx="930" cy="560" rx="170" ry="48" fill="{BLUE}" {S}/><ellipse cx="930" cy="545" rx="130" ry="30" fill="#dbe8f7" {S}/>'
     + dog(560, 560, 1.25) + bowl(300, 600, 0.9) + bowl(170, 600, 0.9, MINT, water=True)
     + bone(960, 530, 0.7, -15) + heart(700, 250, 1.1) + heart(760, 200, 0.7))
art('first-week-with-a-new-dog', 'A new dog settling in at home',
    'A happy blue-grey dog stands on a yellow rug in a living room beside food and water bowls, a dog bed with a bone, and a week-one calendar with five days ticked off.', b)

# 2 new cat safe room
b = (window(840, 80, 250, 200) + floor(W, H, 460, '#efe4f3')
     + f'<rect x="80" y="60" width="220" height="400" rx="10" fill="{WOOD}" {S}/><rect x="95" y="75" width="190" height="385" fill="#e8c29f" {S}/><circle cx="265" cy="270" r="10" fill="{BUTTER}" {S}/>'
     + f'<path d="M430,600 L430,390 L760,390 L760,600 Z" fill="#d7a878" {S}/>'
     + f'<path d="M430,390 L380,330 L700,330 L760,390 Z" fill="#e7bd8f" {S}/><path d="M760,390 L820,320 L820,540 L760,600" fill="#c4935f" {S}/>'
     + f'<rect x="480" y="430" width="220" height="170" fill="#3b3f55" {S}/>'
     + cat(590, 600, 0.95)
     + f'<path d="M430,390 L360,470 M760,390" fill="none" {S}/>'
     + f'<rect x="870" y="520" width="230" height="80" rx="14" fill="{BLUE}" {S}/><path d="M885,520 q30,-25 60,0 q30,-25 60,0 q30,-25 60,0" fill="#e9dcc6" {S}/>'
     + bowl(220, 610, 0.8, CORAL, water=True) + bowl(340, 610, 0.8, BUTTER)
     + sparkle(880, 420, 0.8) + sparkle(1060, 440, 0.6, PINK))
art('bringing-home-a-new-cat', 'A new cat peeking out of a cardboard box',
    'An orange tabby cat sits safely inside a cardboard box hideout in a quiet room, with a litter box, food and water bowls and a closed door nearby.', b)

# 3 loose leash walking
b = (sun(1050, 120) + cloud(260, 120) + cloud(700, 90, 0.8)
     + f'<rect x="0" y="430" width="{W}" height="245" fill="{GRASS}"/><path d="M0,560 Q400,480 700,540 T1200,500 V675 H0 Z" fill="#f1e3d3" {S}/>'
     + tree(140, 450, 1.1) + tree(1080, 440, 0.9)
     + dog(560, 590, 1.1, flip=False)
     + f'<path d="M680,470 Q760,560 830,430 L900,120" fill="none" stroke="{CORAL}" stroke-width="10" stroke-linecap="round"/>'
     + f'<rect x="880" y="60" width="50" height="80" rx="20" fill="#f3c9a6" {S}/>'
     + f'<text x="760" y="610" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="{INK}">slack “J” = loose leash</text>'
     + paw(380, 630, 0.9, INK, .25) + paw(300, 600, 0.9, INK, .25) + paw(220, 630, 0.9, INK, .25))
art('loose-leash-walking', 'A dog walking on a loose leash',
    'A blue-grey dog trots along a park path with a relaxed, J-shaped leash curving up to the handler’s hand, trees and sunshine in the background.', b, SKY)

# 4 crate training
b = (window(90, 90, 220, 190) + floor(W, H, 470)
     + f'<rect x="380" y="200" width="480" height="370" rx="18" fill="none" {S}/>'
     + f'<rect x="380" y="200" width="480" height="370" rx="18" fill="#e7eef7" opacity=".6"/>'
     + f'<rect x="400" y="500" width="440" height="60" rx="16" fill="{PINK}" {S}/>'
     + dog(600, 560, 0.95, lying=True, tongue=False, eyes_closed=True)
     + ''.join(f'<line x1="{x}" y1="200" x2="{x}" y2="570" stroke="{INK}" stroke-width="5"/>' for x in range(420, 860, 55))
     + f'<path d="M860,210 L1040,150 L1040,510 L860,560 Z" fill="none" stroke="{INK}" stroke-width="5"/>'
     + ''.join(f'<line x1="{860+i*36}" y1="{210-i*12}" x2="{860+i*36}" y2="{560-i*10}" stroke="{INK}" stroke-width="4"/>' for i in range(1, 5))
     + f'<rect x="380" y="180" width="480" height="30" rx="10" fill="{BLUE}" {S}/>'
     + f'<circle cx="1000" cy="230" r="0" />'
     + f'<text x="720" y="140" font-family="Arial, sans-serif" font-size="46" font-weight="700" fill="{BLUE}">z</text><text x="760" y="100" font-family="Arial, sans-serif" font-size="60" font-weight="700" fill="{BLUE}">Z</text>'
     + bone(1060, 600, 0.8, 20, BUTTER) + plant(200, 560, 1.0))
art('crate-training-step-by-step', 'A dog napping in an open crate',
    'A relaxed dog naps with eyes closed on a pink blanket inside a wire crate whose door stands open, with a chew bone and a potted plant nearby.', b)

# 5 enrichment on a budget
tin = (f'<rect x="120" y="430" width="360" height="170" rx="20" fill="#c7ccd6" {S}/>'
       + ''.join(f'<circle cx="{180+(i%4)*80}" cy="{475+(i//4)*80}" r="30" fill="{c}" {S}/>'
                 for i, c in enumerate([BLUE, CORAL, MINT, BUTTER, PINK, BUTTER, BLUE, CORAL])))
b = (floor(W, H, 400, '#f6ead8') + tin
     + f'<path d="M780,600 L780,400 L1080,400 L1080,600 Z" fill="#d7a878" {S}/><path d="M780,400 L840,340 L1120,340 L1080,400 Z" fill="#e7bd8f" {S}/>'
     + f'<path d="M800,430 l40,30 M900,420 l-20,40 M1000,440 l30,20" stroke="{INK}" stroke-width="4"/>'
     + dog(640, 600, 1.0, flip=False, tongue=False)
     + ''.join(f'<circle cx="{x}" cy="{y}" r="7" fill="#b5835a" {S}/>' for x, y in [(520, 630), (560, 650), (730, 640), (470, 645), (900, 640), (950, 655)])
     + f'<path d="M760,410 q14,-18 28,0 q14,-18 28,0" fill="none" {S}/>'
     + sparkle(300, 330) + sparkle(1000, 250, 0.7, PINK)
     + f'<text x="600" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="{INK}">sniff • search • shred</text>')
art('dog-enrichment-on-a-budget', 'A dog doing DIY enrichment games',
    'A dog sniffs out kibble scattered on the floor next to a muffin-tin puzzle with colourful balls and a cardboard box ready to be shredded.', b)

# 6 indoor cat play
b = (window(70, 70, 260, 230) + floor(W, H, 500, '#e8def4')
     + f'<rect x="900" y="170" width="40" height="330" fill="#e7bd8f" {S}/><rect x="840" y="150" width="200" height="40" rx="14" fill="{BLUE}" {S}/>'
     + f'<rect x="860" y="330" width="170" height="36" rx="14" fill="{BLUE}" {S}/><rect x="820" y="490" width="240" height="40" rx="14" fill="{BLUE}" {S}/>'
     + cat(940, 150, 0.55, coat='#6b6f80', stripe='#4a4d5c', chest='#e6e6ea')
     + f'<g transform="rotate(-18 520 470)">{cat(520, 560, 1.05)}</g>'
     + f'<path d="M300,80 Q480,120 610,300" fill="none" stroke="{INK}" stroke-width="3"/>'
     + f'<rect x="200" y="60" width="120" height="14" rx="7" fill="{WOOD}" {S} transform="rotate(20 260 67)"/>'
     + f'<path d="M610,300 q30,10 40,45 q-25,-5 -40,-45 M610,300 q-10,30 -40,40 q10,-30 40,-40" fill="{PINK}" {S}/>'
     + sparkle(700, 250, 0.7) + sparkle(420, 330, 0.5, MINT))
art('indoor-cat-play-and-enrichment', 'A cat pouncing on a feather wand toy',
    'An orange tabby cat leaps toward a pink feather on a wand toy while a grey cat watches from the top of a cat tree by the window.', b)

# 7 dog teeth
b = (f'<circle cx="600" cy="360" r="300" fill="#dff1ea"/>'
     + dog(540, 610, 1.5, tongue=False)
     + f'<g transform="rotate(-30 900 300)"><rect x="760" y="280" width="300" height="34" rx="17" fill="{BLUE}" {S}/>'
     + f'<rect x="1000" y="250" width="70" height="34" rx="6" fill="#fff" {S}/>'
     + ''.join(f'<line x1="{1008+i*12}" y1="250" x2="{1008+i*12}" y2="232" stroke="{INK}" stroke-width="4"/>' for i in range(6)) + '</g>'
     + f'<rect x="120" y="520" width="200" height="60" rx="24" fill="{MINT}" {S}/><rect x="320" y="535" width="30" height="30" rx="4" fill="{CORAL}" {S}/>'
     + f'<text x="220" y="559" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="{INK}">PET PASTE</text>'
     + sparkle(760, 330, 0.9) + sparkle(820, 420, 0.6, '#fff') + sparkle(250, 200, 0.7, PINK))
art('brushing-your-dogs-teeth', 'A grinning dog with a toothbrush and pet toothpaste',
    'A big smiling blue-grey dog beside a giant toothbrush and a tube of pet-safe toothpaste, with sparkles for clean teeth.', b)

# 8 nail trimming
b = (f'<rect x="0" y="0" width="{W}" height="{H}" fill="#fbeee4"/>'
     + f'<g transform="translate(470 360)">'
     + f'<ellipse cx="0" cy="40" rx="150" ry="120" fill="{BLUEFUR}" {S}/>'
     + f'<ellipse cx="0" cy="70" rx="70" ry="55" fill="{PINK}" {S}/>'
     + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="30" ry="26" fill="{PINK}" {S}/>' for x, y in [(-95, -20), (-35, -55), (35, -55), (95, -20)])
     + ''.join(f'<path d="M{x-10},{y-22} Q{x},{y-70} {x+12},{y-24}" fill="#fff" {S}/><path d="M{x-5},{y-26} Q{x},{y-48} {x+6},{y-27}" fill="{PINK}"/>' for x, y in [(-95, -20), (-35, -55), (35, -55), (95, -20)])
     + '</g>'
     + f'<g transform="translate(870 300) rotate(25)"><rect x="-20" y="0" width="40" height="190" rx="18" fill="{CORAL}" {S}/>'
     + f'<rect x="30" y="0" width="40" height="190" rx="18" fill="{CORAL}" {S} transform="rotate(12 30 0)"/>'
     + f'<path d="M-15,0 L10,-80 L45,0 Z" fill="#c7ccd6" {S}/><circle cx="15" cy="10" r="10" fill="{INK}"/></g>'
     + f'<rect x="100" y="470" width="140" height="150" rx="20" fill="#e9f3fb" {S}/><rect x="90" y="450" width="160" height="34" rx="12" fill="{BUTTER}" {S}/>'
     + bone(170, 560, 0.55, 0, '#c98f5f')
     + f'<line x1="330" y1="200" x2="610" y2="200" stroke="{CORAL}" stroke-width="5" stroke-dasharray="12 10"/>'
     + f'<text x="470" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="{INK}">trim the tip, skip the quick</text>')
art('trimming-dog-and-cat-nails', 'A paw with nails and a pair of pet nail clippers',
    'A close-up of a pet paw with pink toe beans and light nails showing the pink quick inside, next to nail clippers and a jar of treats.', b)

# 9 road trip
b = (sun(160, 120, 55) + cloud(620, 110) + cloud(980, 150, 0.7)
     + f'<path d="M0,420 Q300,330 600,400 T1200,380 V675 H0 Z" fill="{GRASS}" {S}/>'
     + f'<rect x="0" y="540" width="{W}" height="135" fill="#5b5f73"/><line x1="0" y1="608" x2="{W}" y2="608" stroke="#fff" stroke-width="8" stroke-dasharray="50 40"/>'
     + f'<path d="M300,540 L300,430 Q310,360 400,350 L520,280 Q560,262 640,262 L760,262 Q820,262 850,330 L900,350 Q960,360 960,430 L960,540 Z" fill="{CORAL}" {S}/>'
     + f'<path d="M540,300 Q565,285 640,285 L640,350 L480,350 Z" fill="{SKY}" {S}/><path d="M665,285 L760,285 Q800,285 820,350 L665,350 Z" fill="{SKY}" {S}/>'
     + dog(690, 395, 0.45, tongue=True)
     + f'<rect x="480" y="215" width="240" height="50" rx="10" fill="{BUTTER}" {S}/><line x1="480" y1="265" x2="720" y2="265" {S}/>'
     + f'<circle cx="420" cy="545" r="52" fill="{INK}"/><circle cx="420" cy="545" r="22" fill="#c7ccd6"/>'
     + f'<circle cx="840" cy="545" r="52" fill="{INK}"/><circle cx="840" cy="545" r="22" fill="#c7ccd6"/>'
     + f'<path d="M1080,470 c-40,-60 -30,-110 20,-110 c50,0 60,50 20,110 l-20,30 Z" fill="{BLUE}" {S}/><circle cx="1100" cy="405" r="16" fill="#fff" {S}/>')
art('road-trips-with-pets', 'A dog riding in a car on a road trip',
    'A coral car with luggage on the roof drives along a sunny road, a happy dog visible through the back window and a map pin marking the destination.', b, SKY)

# 10 dog meets cat
b = (window(470, 60, 260, 190) + floor(W, H, 480, '#f1e3d3')
     + dog(300, 600, 1.0, tongue=True)
     + cat(930, 600, 0.95, flip=True)
     + f'<rect x="560" y="330" width="16" height="280" rx="6" fill="#fff" {S}/><rect x="780" y="330" width="16" height="280" rx="6" fill="#fff" {S}/>'
     + f'<rect x="560" y="340" width="236" height="16" rx="6" fill="#fff" {S}/><rect x="560" y="560" width="236" height="16" rx="6" fill="#fff" {S}/>'
     + ''.join(f'<line x1="{x}" y1="356" x2="{x}" y2="560" stroke="{INK}" stroke-width="4"/>' for x in range(600, 780, 30))
     + heart(640, 290, 0.9) + heart(700, 250, 0.6, CORAL) + heart(740, 300, 0.7)
     + f'<rect x="1030" y="300" width="130" height="30" rx="10" fill="{WOOD}" {S}/>')
art('introducing-a-dog-and-a-cat', 'A dog and a cat meeting through a baby gate',
    'A friendly dog and an orange tabby cat regard each other calmly through a white baby gate, with small hearts floating above.', b)

# 11 senior dog
b = (f'<rect x="0" y="0" width="{W}" height="{H}" fill="#e9e6f5"/>' + window(830, 70, 260, 210, '#3c4a78')
     + f'<circle cx="1020" cy="130" r="30" fill="{BUTTER}"/><circle cx="1032" cy="122" r="26" fill="#3c4a78"/>'
     + ''.join(f'<circle cx="{x}" cy="{y}" r="3" fill="#fff"/>' for x, y in [(870, 110), (920, 200), (960, 100), (880, 240)])
     + floor(W, H, 470, '#efe2d0')
     + f'<rect x="80" y="520" width="1040" height="60" rx="10" fill="{MINT}" {S}/>'
     + f'<ellipse cx="560" cy="560" rx="300" ry="70" fill="{BLUE}" {S}/><ellipse cx="560" cy="540" rx="250" ry="42" fill="#dbe8f7" {S}/>'
     + dog(540, 560, 1.05, lying=True, tongue=False, grey=True, coat='#9aa7b8')
     + f'<path d="M140,400 L140,520 L300,520 Z" fill="{WOOD}" {S}/>'
     + f'<rect x="220" y="200" width="16" height="200" fill="{INK}"/><path d="M180,200 L276,200 L256,140 L200,140 Z" fill="{BUTTER}" {S}/>'
     + f'<ellipse cx="228" cy="410" rx="50" ry="12" fill="{INK}"/>'
     + heart(820, 360, 0.8))
art('caring-for-a-senior-dog', 'An older dog resting on a supportive bed',
    'A grey-muzzled senior dog rests on a thick blue bed on a non-slip runner, with a small ramp, a warm lamp and a moonlit window.', b)

# 12 litter boxes
def box(x, y, c):
    return (f'<rect x="{x}" y="{y}" width="230" height="90" rx="14" fill="{c}" {S}/>'
            f'<path d="M{x+14},{y} q28,-24 56,0 q28,-24 56,0 q28,-24 56,0 q16,-14 34,0" fill="#e9dcc6" {S}/>')
b = (floor(W, H, 450, '#eef1f6') + window(90, 80, 220, 180)
     + box(120, 520, BLUE) + box(470, 520, MINT) + box(820, 520, CORAL)
     + cat(590, 520, 0.85, coat='#6b6f80', stripe='#4a4d5c', chest='#e6e6ea')
     + cat(960, 520, 0.8)
     + f'<g transform="translate(260 430) rotate(-20)"><rect x="-8" y="-90" width="16" height="90" rx="6" fill="{WOOD}" {S}/><path d="M-40,0 h80 l-10,50 h-60 Z" fill="{BUTTER}" {S}/></g>'
     + f'<text x="880" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="{INK}">2 cats → 3 boxes</text>')
art('litter-box-setup-that-works', 'Two cats and three litter boxes',
    'Two cats, one grey and one orange, sit beside three colourful litter boxes in a row, illustrating the one-box-per-cat-plus-one rule of thumb, with a litter scoop.', b)

# 13 pet first-aid kit
b = (f'<rect x="0" y="0" width="{W}" height="{H}" fill="#fdecea"/>'
     + f'<rect x="330" y="200" width="540" height="360" rx="30" fill="{CORAL}" {S}/><rect x="520" y="150" width="160" height="70" rx="20" fill="none" stroke="{INK}" stroke-width="14"/>'
     + f'<rect x="560" y="300" width="80" height="200" rx="10" fill="#fff" {S}/><rect x="500" y="360" width="200" height="80" rx="10" fill="#fff" {S}/>'
     + f'<rect x="90" y="420" width="180" height="60" rx="30" fill="#fff" {S} transform="rotate(-15 180 450)"/>'
     + f'<g transform="translate(1000 420)"><rect x="-50" y="-100" width="100" height="160" rx="16" fill="{BLUE}" {S}/><rect x="-30" y="-130" width="60" height="34" rx="8" fill="#fff" {S}/></g>'
     + dog(180, 660, 0.55, flip=False) + cat(1080, 660, 0.5, flip=True)
     + paw(160, 150, 1.2, CORAL, .5) + paw(1040, 140, 1.0, BLUE, .5))
art('pet-first-aid-kit-checklist', 'A pet first-aid kit',
    'A coral first-aid case with a white cross, a roll of bandage and a blue bottle, with a small dog and cat looking on.', b)

# 14 heat safety
b = (sun(1000, 150, 90) + f'<rect x="0" y="420" width="{W}" height="255" fill="{GRASS}"/>'
     + tree(250, 470, 1.5)
     + f'<ellipse cx="260" cy="520" rx="260" ry="50" fill="#6fb567" opacity=".6"/>'
     + dog(320, 560, 0.95, lying=True, tongue=True)
     + f'<ellipse cx="620" cy="560" rx="100" ry="30" fill="#9fd0f2" {S}/>'
     + bowl(760, 600, 0.9, BLUE, water=True)
     + f'<rect x="880" y="470" width="220" height="130" rx="10" fill="#5b5f73" {S}/>'
     + f'<text x="990" y="545" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#fff">HOT PAVEMENT</text>'
     + f'<path d="M920,450 q10,-20 0,-40 M990,450 q10,-20 0,-40 M1060,450 q10,-20 0,-40" fill="none" stroke="{CORAL}" stroke-width="6" stroke-linecap="round"/>')
art('keeping-pets-cool-in-hot-weather', 'A dog resting in the shade on a hot day',
    'A dog lies in the shade of a big tree beside a paddling pool and water bowl while the sun blazes and heat shimmers off the pavement.', b, SKY)

# ---------- home hero 1600x900, og, logo
hb = (f'<rect width="1600" height="900" fill="{SKY}"/>' + sun(1380, 160, 80) + cloud(300, 150, 1.2) + cloud(850, 110, 0.9)
      + f'<path d="M0,560 Q400,440 800,520 T1600,480 V900 H0 Z" fill="{GRASS}" {S}/>'
      + f'<path d="M0,760 Q500,660 900,720 T1600,700 V900 H0 Z" fill="#f1e3d3" {S}/>'
      + f'<path d="M1090,560 L1090,330 L1250,210 L1410,330 L1410,560 Z" fill="#fff" {S}/><path d="M1060,340 L1250,190 L1440,340" fill="none" stroke="{CORAL}" stroke-width="26" stroke-linecap="round"/>'
      + f'<rect x="1215" y="430" width="70" height="130" rx="30" fill="{BLUE}" {S}/><circle cx="1250" cy="330" r="34" fill="{BUTTER}" {S}/>'
      + f'<rect x="80" y="520" width="480" height="70" rx="12" fill="#e7bd8f" {S}/>'
      + ''.join(f'<line x1="{x}" y1="520" x2="{x}" y2="590" stroke="{INK}" stroke-width="3"/>' for x in range(140, 560, 60))
      + cat(330, 522, 0.9, eyes='closed')
      + tree(1520, 600, 1.2)
      + dog(760, 820, 1.55)
      + ball(1080, 790, 34) + bone(450, 800, 0.9, -20)
      + f'<path d="M1180,110 l40,60 l-60,20 Z" fill="{PINK}" {S}/><path d="M1200,190 q-20,60 20,120 q20,40 -10,80" fill="none" stroke="{INK}" stroke-width="3"/>'
      + heart(560, 380, 1.2) + heart(630, 320, 0.8, CORAL) + sparkle(980, 400, 1.1) + paw(1320, 800, 1.2, INK, .2) + paw(1440, 770, 1.2, INK, .2))
HERO = svg(1600, 900, 'For Pets Like Blue', 'Blue, a happy blue-grey dog, stands in a sunny garden with a ball and a bone while an orange cat naps on a fence and a little house sits behind.', hb, SKY)

ob = (f'<rect width="1200" height="630" fill="{CREAM}"/><circle cx="1020" cy="520" r="260" fill="{SKY}"/><circle cx="120" cy="80" r="140" fill="#fde4d6"/>'
      + dog(930, 600, 1.1) + cat(560, 600, 0.75, flip=True)
      + f'<text x="70" y="220" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="700" font-size="84" fill="{INK}">For Pets</text>'
      + f'<text x="70" y="315" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="700" font-size="84" fill="{CORAL}">Like Blue</text>'
      + f'<text x="72" y="380" font-family="Arial, sans-serif" font-size="32" fill="{INK}">Practical, warm dog &amp; cat care</text>'
      + paw(90, 470, 1.4, BLUE, .6))
OG = svg(1200, 630, 'For Pets Like Blue', 'Share card with the For Pets Like Blue name, a blue-grey dog and an orange cat.', ob)

LOGO = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-labelledby="lt">'
        '<title id="lt">For Pets Like Blue</title>'
        f'<circle cx="32" cy="32" r="30" fill="{BLUE}"/>'
        f'<g fill="#fff"><ellipse cx="32" cy="40" rx="11" ry="9"/><circle cx="19" cy="28" r="5"/><circle cx="27" cy="20" r="5"/>'
        f'<circle cx="37" cy="20" r="5"/><circle cx="45" cy="28" r="5"/></g>'
        f'<path d="M32,44 c-6,-4 -4,-9 0,-6 c4,-3 6,2 0,6z" fill="{CORAL}"/></svg>\n')

NOTFOUND = svg(800, 450, 'Lost dog sniffing', 'A dog sniffing the ground following paw prints that lead off the page.',
               f'<rect width="800" height="450" fill="{SKY}"/><rect y="330" width="800" height="120" fill="{GRASS}"/>'
               + dog(330, 420, 0.9, tongue=False) + ''.join(paw(520 + i * 60, 400 - (i % 2) * 20, 0.7, INK, .35) for i in range(5))
               + f'<text x="600" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="90" fill="{CORAL}">?</text>', SKY)
