"""Tiny illustration kit for For Pets Like Blue: flat, rounded, ink-outlined."""
INK = '#2d3142'
CORAL = '#ef8354'
BLUE = '#4f86c6'
BLUEFUR = '#8fa9c9'
BLUEDARK = '#5f7ea3'
CREAM = '#fdf7f4'
BUTTER = '#ffd166'
MINT = '#8fd3b6'
PINK = '#f7a6b8'
SKY = '#cfe6f7'
GINGER = '#f2a65a'
GINGERDARK = '#d9823b'
GRASS = '#9ed48f'
WOOD = '#c98f5f'
WHITE = '#ffffff'

S = f'stroke="{INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"'


def svg(w, h, title, desc, body, bg=CREAM):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
            f'role="img" aria-labelledby="t d"><title id="t">{title}</title><desc id="d">{desc}</desc>'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>\n')


def dog(x, y, s=1.0, coat=BLUEFUR, ear=BLUEDARK, flip=False, tongue=True, collar=CORAL,
        belly='#dfe7f1', muzzle='#e9eef5', grey=False, lying=False, eyes_closed=False):
    sx = -s if flip else s
    t = f'<g transform="translate({x} {y}) scale({sx} {s})">'
    if lying:
        # dog lying down, head up
        t += (f'<path d="M-120,-40 Q-175,-50 -185,-95" fill="none" stroke="{INK}" stroke-width="22" stroke-linecap="round"/>'
              f'<path d="M-120,-40 Q-175,-50 -185,-95" fill="none" stroke="{coat}" stroke-width="13" stroke-linecap="round"/>'
              f'<ellipse cx="-20" cy="-50" rx="120" ry="50" fill="{coat}" {S}/>'
              f'<ellipse cx="-70" cy="-22" rx="45" ry="22" fill="{coat}" {S}/>'
              f'<rect x="40" y="-24" width="95" height="24" rx="12" fill="{coat}" {S}/>'
              f'<rect x="20" y="-18" width="95" height="20" rx="10" fill="{coat}" {S}/>')
        hx, hy = 95, -120
    else:
        t += (f'<path d="M-100,-120 Q-150,-150 -135,-200" fill="none" stroke="{INK}" stroke-width="22" stroke-linecap="round"/>'
              f'<path d="M-100,-120 Q-150,-150 -135,-200" fill="none" stroke="{coat}" stroke-width="13" stroke-linecap="round"/>'
              f'<rect x="-92" y="-95" width="30" height="95" rx="14" fill="{coat}" {S}/>'
              f'<rect x="38" y="-95" width="30" height="95" rx="14" fill="{coat}" {S}/>'
              f'<ellipse cx="-10" cy="-110" rx="110" ry="55" fill="{coat}" {S}/>'
              f'<ellipse cx="0" cy="-88" rx="62" ry="22" fill="{belly}"/>'
              f'<rect x="-58" y="-95" width="30" height="95" rx="14" fill="{coat}" {S}/>'
              f'<rect x="72" y="-95" width="30" height="95" rx="14" fill="{coat}" {S}/>'
              f'<ellipse cx="-40" cy="-130" rx="28" ry="18" fill="{ear}" opacity=".55"/>')
        hx, hy = 95, -175
    # head
    t += (f'<circle cx="{hx}" cy="{hy}" r="56" fill="{coat}" {S}/>'
          f'<ellipse cx="{hx+45}" cy="{hy+17}" rx="36" ry="26" fill="{muzzle}" {S}/>'
          f'<ellipse cx="{hx+74}" cy="{hy+8}" rx="12" ry="9" fill="{INK}"/>')
    if grey:
        t += f'<ellipse cx="{hx+38}" cy="{hy+22}" rx="22" ry="14" fill="#f4f4f4" opacity=".9"/>'
        t += f'<path d="M{hx+2},{hy-30} q12,-8 24,0" fill="none" stroke="#f4f4f4" stroke-width="6" stroke-linecap="round"/>'
    if eyes_closed:
        t += f'<path d="M{hx+8},{hy-6} q9,8 18,0" fill="none" {S}/>'
    else:
        t += (f'<circle cx="{hx+17}" cy="{hy-6}" r="8" fill="{INK}"/>'
              f'<circle cx="{hx+20}" cy="{hy-9}" r="2.6" fill="#fff"/>')
    t += f'<path d="M{hx+46},{hy+32} q10,8 22,-2" fill="none" {S}/>'
    if tongue:
        t += f'<path d="M{hx+52},{hy+35} q4,22 14,0" fill="{PINK}" {S}/>'
    t += f'<path d="M{hx-30},{hy-40} Q{hx-62},{hy-35} {hx-54},{hy+25} Q{hx-34},{hy+14} {hx-12},{hy-38} Z" fill="{ear}" {S}/>'
    if collar:
        t += (f'<path d="M{hx-45},{hy+35} Q{hx-20},{hy+60} {hx+15},{hy+52}" fill="none" stroke="{INK}" stroke-width="16" stroke-linecap="round"/>'
              f'<path d="M{hx-45},{hy+35} Q{hx-20},{hy+60} {hx+15},{hy+52}" fill="none" stroke="{collar}" stroke-width="9" stroke-linecap="round"/>'
              f'<circle cx="{hx-12}" cy="{hy+66}" r="9" fill="{BUTTER}" {S}/>')
    return t + '</g>'


def cat(x, y, s=1.0, coat=GINGER, stripe=GINGERDARK, flip=False, chest=CREAM, eyes='open'):
    sx = -s if flip else s
    t = f'<g transform="translate({x} {y}) scale({sx} {s})">'
    t += (f'<path d="M-40,-12 Q-125,-10 -112,-95" fill="none" stroke="{INK}" stroke-width="22" stroke-linecap="round"/>'
          f'<path d="M-40,-12 Q-125,-10 -112,-95" fill="none" stroke="{coat}" stroke-width="13" stroke-linecap="round"/>'
          f'<ellipse cx="0" cy="-70" rx="62" ry="72" fill="{coat}" {S}/>'
          f'<path d="M-50,-95 q18,6 30,-4 M-58,-65 q20,6 32,-4 M-55,-35 q18,6 28,-2" fill="none" stroke="{stripe}" stroke-width="7" stroke-linecap="round"/>'
          f'<ellipse cx="20" cy="-72" rx="30" ry="46" fill="{chest}"/>'
          f'<ellipse cx="4" cy="-4" rx="20" ry="11" fill="{coat}" {S}/>'
          f'<ellipse cx="40" cy="-4" rx="20" ry="11" fill="{coat}" {S}/>'
          f'<path d="M-22,-196 L-30,-248 L10,-212 Z" fill="{coat}" {S}/>'
          f'<path d="M28,-214 L62,-244 L60,-192 Z" fill="{coat}" {S}/>'
          f'<path d="M-20,-205 L-24,-234 L0,-213 Z M34,-214 L54,-232 L53,-202 Z" fill="{PINK}"/>'
          f'<circle cx="18" cy="-168" r="50" fill="{coat}" {S}/>'
          f'<path d="M5,-212 l4,14 M18,-216 l0,16 M31,-212 l-4,14" stroke="{stripe}" stroke-width="6" stroke-linecap="round"/>')
    if eyes == 'open':
        t += (f'<ellipse cx="0" cy="-172" rx="7" ry="10" fill="{INK}"/><ellipse cx="38" cy="-172" rx="7" ry="10" fill="{INK}"/>'
              f'<circle cx="2" cy="-176" r="2.5" fill="#fff"/><circle cx="40" cy="-176" r="2.5" fill="#fff"/>')
    else:
        t += f'<path d="M-7,-170 q7,7 14,0 M31,-170 q7,7 14,0" fill="none" {S}/>'
    t += (f'<path d="M12,-156 h12 l-6,7 Z" fill="{PINK}" {S}/>'
          f'<path d="M18,-149 q-6,8 -13,3 M18,-149 q6,8 13,3" fill="none" {S}/>'
          f'<path d="M-6,-152 h-34 M-6,-146 l-32,8 M42,-152 h34 M42,-146 l32,8" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>')
    return t + '</g>'


def sun(x, y, r=60):
    rays = ''.join(
        f'<rect x="{x-6}" y="{y-r-38}" width="12" height="26" rx="6" fill="{BUTTER}" transform="rotate({a} {x} {y})"/>'
        for a in range(0, 360, 45))
    return rays + f'<circle cx="{x}" cy="{y}" r="{r}" fill="{BUTTER}" {S}/>'


def cloud(x, y, s=1.0):
    return (f'<g transform="translate({x} {y}) scale({s})" fill="#fff" {S}>'
            f'<path d="M-80,20 Q-95,-15 -55,-20 Q-45,-60 0,-50 Q40,-75 60,-30 Q100,-30 90,20 Z"/></g>')


def tree(x, y, s=1.0):
    return (f'<g transform="translate({x} {y}) scale({s})">'
            f'<rect x="-14" y="-120" width="28" height="120" rx="8" fill="{WOOD}" {S}/>'
            f'<circle cx="0" cy="-170" r="75" fill="{MINT}" {S}/>'
            f'<circle cx="-45" cy="-130" r="45" fill="{MINT}" {S}/>'
            f'<circle cx="48" cy="-128" r="45" fill="{MINT}" {S}/></g>')


def plant(x, y, s=1.0):
    return (f'<g transform="translate({x} {y}) scale({s})">'
            f'<path d="M0,-60 Q-50,-120 -40,-170 Q-5,-120 0,-60 Z M0,-60 Q40,-140 60,-150 Q45,-90 0,-60 Z M0,-60 Q0,-150 10,-190 Q25,-120 0,-60 Z" fill="{MINT}" {S}/>'
            f'<path d="M-40,-60 h80 l-12,60 h-56 Z" fill="{CORAL}" {S}/></g>')


def bowl(x, y, s=1.0, color=BLUE, food='#b5835a', water=False):
    fill = '#9fd0f2' if water else food
    return (f'<g transform="translate({x} {y}) scale({s})">'
            f'<ellipse cx="0" cy="-40" rx="62" ry="14" fill="{fill}" {S}/>'
            f'<path d="M-62,-40 L-48,0 H48 L62,-40" fill="{color}" {S}/>'
            f'<ellipse cx="0" cy="-40" rx="62" ry="14" fill="none" {S}/></g>')


def ball(x, y, r=26, color=CORAL):
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" {S}/>'
            f'<path d="M{x-r+4},{y-6} Q{x},{y+14} {x+r-4},{y-6}" fill="none" stroke="#fff" stroke-width="4"/>')


def heart(x, y, s=1.0, color=PINK):
    return (f'<path transform="translate({x} {y}) scale({s})" d="M0,12 C-30,-10 -18,-38 0,-22 C18,-38 30,-10 0,12 Z" fill="{color}" {S}/>')


def sparkle(x, y, s=1.0, color=BUTTER):
    return (f'<path transform="translate({x} {y}) scale({s})" d="M0,-24 Q4,-4 24,0 Q4,4 0,24 Q-4,4 -24,0 Q-4,-4 0,-24 Z" fill="{color}" {S}/>')


def paw(x, y, s=1.0, color=INK, op=1):
    return (f'<g transform="translate({x} {y}) scale({s})" fill="{color}" opacity="{op}">'
            f'<ellipse cx="0" cy="8" rx="16" ry="13"/><circle cx="-17" cy="-10" r="7"/><circle cx="-6" cy="-19" r="7"/>'
            f'<circle cx="7" cy="-19" r="7"/><circle cx="18" cy="-10" r="7"/></g>')


def floor(w, h, y, color='#f1e3d3'):
    return f'<rect x="0" y="{y}" width="{w}" height="{h-y}" fill="{color}"/><line x1="0" y1="{y}" x2="{w}" y2="{y}" {S}/>'


def window(x, y, w=260, h=220, sky=SKY):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{sky}" {S}/>'
            f'<line x1="{x+w/2}" y1="{y}" x2="{x+w/2}" y2="{y+h}" {S}/>'
            f'<line x1="{x}" y1="{y+h/2}" x2="{x+w}" y2="{y+h/2}" {S}/>'
            f'<rect x="{x-14}" y="{y+h}" width="{w+28}" height="16" rx="6" fill="{WOOD}" {S}/>')


def rug(x, y, rx=260, ry=40, color=CORAL):
    return (f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{color}" {S}/>'
            f'<ellipse cx="{x}" cy="{y}" rx="{rx-40}" ry="{ry-14}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="10 10"/>')


def bone(x, y, s=1.0, rot=0, color='#fff'):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})" fill="{color}" {S}>'
            f'<path d="M-40,-8 H40 A12,12 0 1 1 48,-20 A12,12 0 1 1 48,20 A12,12 0 1 1 40,8 H-40 A12,12 0 1 1 -48,20 A12,12 0 1 1 -48,-20 A12,12 0 1 1 -40,-8 Z"/></g>')
