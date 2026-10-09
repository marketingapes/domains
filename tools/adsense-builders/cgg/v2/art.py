"""Original SVG artwork for CGG v2 (no photos, no people)."""

def logo(light=False):
    ink = "#faf6ec" if light else "#0f2f24"
    sub = "#c6f06a" if light else "#1d6b45"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 64" role="img" aria-label="Crazy Golf Game">
<circle cx="30" cy="34" r="20" fill="#fff" stroke="{ink}" stroke-width="3"/>
<g fill="{ink}" opacity=".35"><circle cx="23" cy="28" r="2"/><circle cx="31" cy="25" r="2"/><circle cx="38" cy="30" r="2"/><circle cx="25" cy="37" r="2"/><circle cx="34" cy="38" r="2"/><circle cx="29" cy="45" r="2"/></g>
<path d="M44 4v34" stroke="{ink}" stroke-width="3" stroke-linecap="round"/><path d="M45 5l16 6-16 7z" fill="#e5483e"/>
<text x="72" y="33" font-family="Archivo,Arial Narrow,Arial,sans-serif" font-weight="900" font-size="26" letter-spacing="-.5" fill="{ink}">CRAZY GOLF</text>
<text x="73" y="53" font-family="Archivo,Arial,sans-serif" font-weight="800" font-size="13" letter-spacing="5.2" fill="{sub}">GAME &#183; EST. 2010</text>
</svg>'''


def hero():
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 520" role="img" aria-label="Illustrated golf hole at golden hour: a flag on a green, a ball on the fringe with a dotted putting line, and a small scorecard showing side games">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset=".55" stop-color="#ffe9b8"/><stop offset="1" stop-color="#e9f5df"/></linearGradient>
<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3cbf72"/><stop offset="1" stop-color="#1d6b45"/></linearGradient>
<linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a9d5c"/><stop offset="1" stop-color="#145238"/></linearGradient>
<radialGradient id="green" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#7ee39f"/><stop offset="1" stop-color="#2a9d5c"/></radialGradient>
<clipPath id="c"><rect width="640" height="520" rx="36"/></clipPath>
</defs>
<g clip-path="url(#c)">
<rect width="640" height="520" fill="url(#sky)"/>
<circle cx="470" cy="150" r="62" fill="#ffb13b" opacity=".85"/>
<path d="M0 260 C120 210 230 240 330 225 S540 190 640 215 V520 H0Z" fill="#8fd3a3" opacity=".7"/>
<g fill="#2f7d55" opacity=".8"><path d="M70 238 l14 -40 l14 40z"/><path d="M96 236 l11 -30 l11 30z"/><path d="M548 212 l15 -44 l15 44z"/><path d="M578 214 l11 -32 l11 32z"/></g>
<path d="M0 300 C160 260 260 300 380 285 S560 255 640 270 V520 H0Z" fill="url(#g1)"/>
<path d="M0 380 C140 350 300 372 420 360 S580 340 640 350 V520 H0Z" fill="url(#g2)"/>
<ellipse cx="400" cy="372" rx="180" ry="56" fill="url(#green)"/>
<ellipse cx="400" cy="372" rx="180" ry="56" fill="none" stroke="#c6f06a" stroke-width="3" opacity=".5"/>
<path d="M120 420 C150 400 210 398 250 410" fill="none" stroke="#f1e4c3" stroke-width="26" stroke-linecap="round" opacity=".9"/>
<ellipse cx="452" cy="376" rx="12" ry="5" fill="#0f2f24"/>
<path d="M452 376 V226" stroke="#faf6ec" stroke-width="5" stroke-linecap="round"/>
<path d="M454 228 l64 20 l-64 22z" fill="#e5483e"/>
<text x="470" y="254" font-family="Archivo,Arial,sans-serif" font-weight="900" font-size="15" fill="#fff">18</text>
<path d="M312 398 C350 392 410 386 446 378" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>
<circle cx="304" cy="400" r="11" fill="#fff" stroke="#0f2f24" stroke-width="2"/>
<g transform="translate(46 70) rotate(-6)">
<rect width="210" height="150" rx="14" fill="#faf6ec" stroke="#0f2f24" stroke-width="3"/>
<rect width="210" height="34" rx="14" fill="#0f2f24"/><rect y="20" width="210" height="14" fill="#0f2f24"/>
<text x="16" y="23" font-family="Archivo,Arial,sans-serif" font-weight="900" font-size="15" fill="#c6f06a" letter-spacing="1.5">TODAY'S GAMES</text>
<g font-family="Inter,Arial,sans-serif" font-size="14" font-weight="700" fill="#0f2f24">
<text x="16" y="62">Wolf</text><text x="150" y="62" fill="#1d6b45">+4</text>
<text x="16" y="88">Nassau</text><text x="150" y="88" fill="#1d6b45">1 up</text>
<text x="16" y="114">Skins</text><text x="150" y="114" fill="#e5483e">x3</text>
<text x="16" y="140">Snake</text><text x="150" y="140">&#9888;</text></g>
<path d="M14 70 H196 M14 96 H196 M14 122 H196" stroke="#0f2f24" stroke-opacity=".15"/>
</g>
</g>
</svg>'''


def icon(kind):
    paths = {
        "games": '<rect x="10" y="14" width="30" height="40" rx="5" fill="#fff" stroke="#0f2f24" stroke-width="3" transform="rotate(-10 25 34)"/><rect x="24" y="10" width="30" height="40" rx="5" fill="#c6f06a" stroke="#0f2f24" stroke-width="3" transform="rotate(8 39 30)"/><text x="33" y="38" font-family="Archivo,Arial" font-weight="900" font-size="16" fill="#0f2f24" transform="rotate(8 39 30)">W</text>',
        "better": '<circle cx="32" cy="32" r="24" fill="#fff" stroke="#0f2f24" stroke-width="3"/><circle cx="32" cy="32" r="15" fill="#dff1ea" stroke="#0f2f24" stroke-width="3"/><circle cx="32" cy="32" r="6" fill="#e5483e"/><path d="M50 10 L34 30" stroke="#0f2f24" stroke-width="3" stroke-linecap="round"/><path d="M50 10 l6 -2 -2 6z" fill="#0f2f24"/>',
        "gear": '<rect x="18" y="20" width="26" height="36" rx="8" fill="#ffc23a" stroke="#0f2f24" stroke-width="3"/><path d="M22 20 V8 M30 20 V5 M38 20 V9" stroke="#0f2f24" stroke-width="3" stroke-linecap="round"/><circle cx="22" cy="8" r="3" fill="#0f2f24"/><rect x="26" y="2" width="8" height="5" rx="2" fill="#0f2f24"/><circle cx="38" cy="9" r="3" fill="#0f2f24"/><path d="M18 34 H44" stroke="#0f2f24" stroke-width="3"/>',
        "club": '<path d="M8 14 h34 a6 6 0 0 1 6 6 v14 a6 6 0 0 1 -6 6 H22 l-9 8 v-8 H8 a6 6 0 0 1 -6 -6 V20 a6 6 0 0 1 6 -6z" fill="#fff" stroke="#0f2f24" stroke-width="3"/><path d="M26 28 h30 a6 6 0 0 1 6 6 v12 a6 6 0 0 1 -6 6 h-4 v7 l-8 -7 H26 a6 6 0 0 1 -6 -6 V34 a6 6 0 0 1 6 -6z" fill="#c6f06a" stroke="#0f2f24" stroke-width="3"/><g fill="#0f2f24"><circle cx="16" cy="27" r="2.5"/><circle cx="25" cy="27" r="2.5"/><circle cx="34" cy="27" r="2.5"/></g>',
        "mat": '<rect x="6" y="26" width="52" height="14" rx="7" fill="#2a9d5c" stroke="#0f2f24" stroke-width="3"/><circle cx="50" cy="33" r="3" fill="#0f2f24"/><circle cx="14" cy="33" r="4" fill="#fff" stroke="#0f2f24" stroke-width="2"/>',
        "ball": '<circle cx="32" cy="32" r="22" fill="#fff" stroke="#0f2f24" stroke-width="3"/><g fill="#0f2f24" opacity=".3"><circle cx="24" cy="24" r="3"/><circle cx="34" cy="22" r="3"/><circle cx="42" cy="30" r="3"/><circle cx="26" cy="36" r="3"/><circle cx="37" cy="40" r="3"/></g>',
        "yard": '<path d="M4 46 C20 36 44 36 60 46 V58 H4z" fill="#2a9d5c" stroke="#0f2f24" stroke-width="3"/><path d="M36 42 V12" stroke="#0f2f24" stroke-width="3"/><path d="M37 13 l14 5 -14 5z" fill="#e5483e"/><circle cx="18" cy="44" r="4" fill="#fff" stroke="#0f2f24" stroke-width="2"/>',
        "sim": '<rect x="6" y="10" width="52" height="34" rx="4" fill="#0f2f24"/><path d="M10 38 C24 20 36 18 54 16" stroke="#c6f06a" stroke-width="3" fill="none" stroke-dasharray="3 4"/><rect x="26" y="46" width="12" height="8" fill="#0f2f24"/><rect x="18" y="54" width="28" height="4" rx="2" fill="#0f2f24"/>',
    }
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">{paths[kind]}</svg>'


def badge(title, sub, color="#2a9d5c", glyph="W"):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="{title} badge">
<rect x="10" y="10" width="300" height="300" rx="40" fill="{color}"/>
<rect x="10" y="10" width="300" height="300" rx="40" fill="none" stroke="#0f2f24" stroke-width="6"/>
<circle cx="160" cy="138" r="78" fill="#faf6ec" stroke="#0f2f24" stroke-width="6"/>
<text x="160" y="166" text-anchor="middle" font-family="Archivo,Arial,sans-serif" font-weight="900" font-size="78" fill="#0f2f24">{glyph}</text>
<text x="160" y="258" text-anchor="middle" font-family="Archivo,Arial,sans-serif" font-weight="900" font-size="30" fill="#fff" letter-spacing="1">{title.upper()}</text>
<text x="160" y="288" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="700" font-size="16" fill="#0f2f24">{sub}</text>
</svg>'''
