#!/usr/bin/env python3
"""CGG v3 rebrand ("Clubhouse editorial", draft 2026-10-09).

Runs after build.py + affiliate_overlay.py (replaces the v2 layer in the pipeline). Keeps the v2 content and
information architecture (pillars, side games, drills, guides, gift guide) and applies the v3 brand system:
outlined seal/wordmark, Fraunces + Libre Franklin (self-hosted), linen/green/sand palette, licence-checked
photography with credits. Re-chromes every generated page, regroups /articles/, writes /credits/, and
extends sitemap.xml. Idempotent.
"""
import html, json, pathlib, re, shutil, sys
HERE = pathlib.Path(__file__).resolve().parent
V2 = HERE.parent / "v2"
sys.path.insert(0, str(V2)); sys.path.insert(0, str(HERE.parent))
from content_games import GAMES, MORE_GAMES
from content_drills import DRILLS
import affiliate_overlay as ov

ROOT = HERE.parents[3]
SITE = ROOT / "cgg"
HOST = "https://crazygolfgame.com"
BRAND = "Crazy Golf Game"
EMAIL = "info@crazygolfgame.com"
TODAY = "2026-10-09"
X_URL = "https://x.com/crazygolfgame"
FB_URL = "https://www.facebook.com/518877748158905"
E = lambda s: html.escape(s, quote=True)

src_build = (HERE.parent / "build.py").read_text()
GTM_HEAD = re.search(r'GTM_HEAD = """(.*?)"""', src_build, re.S).group(1)
GTM_BODY = re.search(r"GTM_BODY = '(.*?)'\n", src_build).group(1)

CREDITS = json.loads((HERE / "photos" / "credits.json").read_text())
ARTIST_FIX = {"scorecard-vintage": "Braswell Memorial Library (via Digital Public Library of America)",
              "bag-on-fairway": "bluesbby (Flickr)",
              "clubhouse-pines": "A. E. Crane, U.S. Department of Transportation (National Archives)"}

ART_PILLAR = {
    "games": ["mini-golf-party-games", "backyard-mini-golf-course", "indoor-mini-golf-course", "diy-mini-golf-obstacles",
              "designing-mini-golf-holes", "mini-golf-tournament-at-home", "mini-golf-with-kids", "mini-golf-date-night",
              "mini-golf-rules-and-etiquette"],
    "better": ["mini-golf-putting-tips", "putting-practice-games", "beginner-trick-shots"],
    "gear": ["casual-golfer-gear-guide"],
}
ART_PHOTO = {
    "mini-golf-party-games": "mini-three-holes", "backyard-mini-golf-course": "mini-windmill", "indoor-mini-golf-course": "mini-indoor",
    "diy-mini-golf-obstacles": "mini-pyramid", "designing-mini-golf-holes": "mini-ramps", "mini-golf-tournament-at-home": "scorecard-cart",
    "mini-golf-with-kids": "ball-red-tee", "mini-golf-date-night": "green-at-sun", "mini-golf-rules-and-etiquette": "scorecard-vintage",
    "mini-golf-putting-tips": "ball-on-tee", "putting-practice-games": "indoor-putters", "beginner-trick-shots": "ball-macro",
    "casual-golfer-gear-guide": "clubs-in-bag",
}
GAME_PHOTO = {"wolf": "green-aerial-flag", "nassau": "links-pebble-beach", "skins": "ball-by-cup",
              "bingo-bango-bongo": "green-aerial-sand", "vegas": "tee-box-view", "snake": "putt-to-cup"}
DRILL_PHOTO = {"putting-ladder-drill": "ball-on-green", "landing-spot-ladder": "green-aerial-heart", "fairway-corridor": "driver-at-address"}
PILLARS = [
    ("games", "/games/", "Games Within the Game", "Wolf, Nassau, Skins, Vegas and the rest: proper rules, fair scoring and a card to keep it on.", "green-aerial-sand"),
    ("better", "/get-better/", "Get Better", "Practice with a scorecard. Drills for putting, the short game, driving and course management.", "putting-stance"),
    ("gear", "/gear/", "Gear &amp; Gifts", "What's worth buying, what isn't, and the Gift Guide 2026 for the golfer who has everything.", "clubs-in-bag"),
    ("club", "/clubhouse/", "The Clubhouse", "Your group's house rules, this week's arguments, and where to find us on X and Facebook.", "clubhouse-pines"),
]
X_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-7.5 8.6L23 22h-6.8l-5.3-6.9L4.8 22H1.7l8-9.2L1 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z"/></svg>'
FB_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4H13.5V8.9c0-.6.3-.9.5-.9z"/></svg>'

V2_IMAGES = (["logo-v2.svg", "logo-v2-light.svg", "hero-v2.svg", "og-v2.svg"] + [f"icon-{k}.svg" for k in ["games", "better", "gear", "club", "mat", "ball", "yard", "sim"]]
             + [f"game-{g['slug']}.svg" for g in GAMES] + [f"drill-{d['slug']}.svg" for d in DRILLS])


# ------------------------------------------------------------------ photo helpers
def artist(key):
    return ARTIST_FIX.get(key, CREDITS[key]["artist"])


def credit_html(key, short=True):
    c = CREDITS[key]
    lic = c["license"]
    lic_txt = f'<a href="{E(c["license_url"])}" rel="license noopener">{E(lic)}</a>' if c.get("license_url") and lic.startswith("CC") else E(lic if lic != "No known restrictions on publication" else "no known restrictions")
    src = "Library of Congress" if c["source"] == "Library of Congress" else "Wikimedia Commons"
    return f'Photo: {E(artist(key))} / <a href="{E(c["page"])}" rel="noopener">{src}</a>, {lic_txt}'


def srcset(key):
    sz = CREDITS[key]["sizes"]
    return ", ".join(f"/images/photos/{key}-{w}.webp {v[0]}w" for w, v in sorted(sz.items(), key=lambda kv: int(kv[0])))


def img(key, sizes="100vw", eager=False, alt=None, w=None):
    c = CREDITS[key]; s800 = c["sizes"]["800"]
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<img src="/images/photos/{key}-800.webp" srcset="{srcset(key)}" sizes="{sizes}" '
            f'width="{s800[0]}" height="{s800[1]}" alt="{E(alt if alt is not None else c["alt"])}" {load} decoding="async">')


def fig(key, ratio="r32", sizes="(max-width:860px) 100vw, 50vw", eager=False, cap=True, alt=None):
    return f'<figure class="ph {ratio}">{img(key, sizes, eager, alt)}' + (f'<figcaption class="cred">{credit_html(key)}</figcaption>' if cap else "") + "</figure>"


def og_for(key):
    return f"og/{key}.jpg"


# ------------------------------------------------------------------ chrome
FONT_PRELOAD = ('<link rel="preload" href="/assets/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>\n'
                '<link rel="preload" href="/assets/fonts/librefranklin-latin.woff2" as="font" type="font/woff2" crossorigin>')
ICONS = ('<link rel="icon" href="/images/brand/favicon-v3.svg" type="image/svg+xml">\n<link rel="icon" href="/images/brand/favicon-32.png" sizes="32x32" type="image/png">\n'
         '<link rel="apple-touch-icon" href="/images/brand/apple-touch-icon.png">')


def head(title, desc, path, og="og/green-aerial-bunkers.jpg", ld=None):
    full = title if title.endswith(BRAND) else f"{title} | {BRAND}"
    lds = "".join(f'\n<script type="application/ld+json">{json.dumps(x)}</script>' for x in (ld or []))
    otype = "article" if path.count("/") >= 3 else "website"
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(full)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{HOST}{path}">
<meta name="google-adsense-account" content="ca-pub-5194583669093303">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5194583669093303" crossorigin="anonymous"></script>
{GTM_HEAD}
<meta property="og:type" content="{otype}">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{HOST}{path}">
<meta property="og:image" content="{HOST}/images/{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@crazygolfgame">
<meta name="theme-color" content="#132820">
{ICONS}
{FONT_PRELOAD}
<link rel="stylesheet" href="/assets/v3.css">{lds}
</head>
"""


NAV = [("games", "/games/", "Games"), ("better", "/get-better/", "Get Better"), ("gear", "/gear/", "Gear &amp; Gifts"),
       ("club", "/clubhouse/", "Clubhouse"), ("guides", "/articles/", "Guides")]


def header(active=""):
    links = "\n      ".join(f'<a href="{h}"{" aria-current=\"page\"" if k == active else ""}>{t}</a>' for k, h, t in NAV)
    return f"""<body>
{GTM_BODY}
<a class="skip" href="#main">Skip to content</a>
<div class="util"><div class="wrap"><span class="l">Rules, drills and gear for people who love the game</span><span class="r"><a href="/offers/">Gift Guide 2026</a><a href="{X_URL}" rel="noopener">@crazygolfgame</a></span></div></div>
<header class="hdr">
  <div class="wrap in">
    <a class="brand" href="/" aria-label="{BRAND} home"><img src="/images/brand/logo-v3.svg" alt="{BRAND}" width="250" height="47"></a>
    <nav aria-label="Main">
      {links}
      <a class="cta" href="/offers/">Gift Guide</a>
    </nav>
  </div>
</header>
"""


FOOTER = f"""<footer class="ftr">
  <div class="wrap">
    <div class="cols">
      <div class="brandcol">
        <img src="/images/brand/mark-v3-light.svg" alt="{BRAND} seal" width="96" height="96">
        <div>For people who love golf and the games inside it. An independent publication, not a golf venue.</div>
        <div class="socials"><a href="{X_URL}" rel="noopener">{X_SVG}@crazygolfgame</a><a href="{FB_URL}" rel="noopener">{FB_SVG}Facebook</a></div>
      </div>
      <div><h4>Play</h4><ul><li><a href="/games/">Games Within the Game</a></li><li><a href="/games/wolf/">Wolf</a></li><li><a href="/games/nassau/">Nassau</a></li><li><a href="/games/skins/">Skins</a></li><li><a href="/games/#crazy-golf">Crazy golf &amp; backyard</a></li></ul></div>
      <div><h4>Improve &amp; gear</h4><ul><li><a href="/get-better/">Get Better</a></li><li><a href="/get-better/putting-ladder-drill/">Putting ladder</a></li><li><a href="/gear/">Gear &amp; Gifts</a></li><li><a href="/offers/">Gift Guide 2026</a></li></ul></div>
      <div><h4>Clubhouse</h4><ul><li><a href="/clubhouse/">Talk golf</a></li><li><a href="/articles/">All guides</a></li><li><a href="/about/">About</a></li><li><a href="/contact/">Contact</a></li><li><a href="/credits/">Photo credits</a></li></ul></div>
    </div>
    <div class="legal"><span>&copy;2026 {BRAND}. Published by Marketing Apes LLC. <a href="/privacy/">Privacy</a> &middot; <a href="/terms/">Terms</a></span><span>Some pages contain labelled affiliate links (#ad).</span></div>
  </div>
</footer>
<script src="/assets/site.js" defer></script>
<script src="/assets/games.js" defer></script>
</body>
</html>
"""


def crumbs_ld(trail):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": f"{HOST}{u}"} for i, (n, u) in enumerate(trail)]}


def crumbs_html(trail):
    parts = [f'<a href="{u}">{E(n)}</a>' for n, u in trail[:-1]] + [f"<span>{E(trail[-1][0])}</span>"]
    return '<p class="crumbs2">' + " &nbsp;/&nbsp; ".join(parts) + "</p>"


def page(title, desc, path, active, body, ld=None, og="og/green-aerial-bunkers.jpg"):
    return head(title, desc, path, og, ld) + header(active) + '<main id="main">\n' + body + "\n</main>\n" + FOOTER


def disclosure(short=False):
    if short:
        return '<p class="aff-disclosure"><strong>#ad</strong> Links marked &ldquo;Affiliate link&rdquo; may earn us a commission at no extra cost to you. <a href="/offers/#disclosure">How this works</a>.</p>'
    return ('<div class="aff-disclosure" id="disclosure"><strong>#ad &middot; Affiliate disclosure.</strong> Some links on this page are affiliate links, each labelled '
            '&ldquo;Affiliate link&rdquo;. If you buy through one, Crazy Golf Game (Marketing Apes LLC) may earn a commission. You pay the same price. '
            'We describe categories and what to check; we have not used every product these stores sell. Partners do not see or approve what we write.</div>')


def newsletter(where):
    return f"""<div class="nl">
  <h3>The Clubhouse Note</h3>
  <p>One short email a week: a game to try on Saturday, a drill worth ten minutes, and one gear note. That's it.</p>
  <form data-newsletter action="#" method="post">
    <label class="sr" for="nl-{where}">Email address</label>
    <input id="nl-{where}" type="email" name="email" placeholder="Your email address" autocomplete="email" required>
    <button class="btn" type="submit">Join</button>
  </form>
  <p class="msg" aria-live="polite"></p>
  <p class="small">No spam, unsubscribe any time.<br><span class="todo-pill" data-todo="Newsletter form is UI-only: connect a consented list (CGG GMass/ESP + consent record) before launch">TODO(Kyle): connect a consented list before launch</span></p>
</div>"""


def socials():
    return f'<div class="socials"><a href="{X_URL}" rel="noopener">{X_SVG}Follow @crazygolfgame</a><a href="{FB_URL}" rel="noopener">{FB_SVG}Facebook</a></div>'


# ------------------------------------------------------------------ cards
def card_from_cache(slug, snippet):
    tag = re.search(r'<span class="tag">(.*?)</span>', snippet, re.S).group(1)
    title = re.search(r"<h2>(.*?)</h2>", snippet, re.S).group(1)
    teaser = re.search(r'<span class="teaser">(.*?)</span>', snippet, re.S).group(1)
    key = ART_PHOTO[slug]
    return (f'<a class="card" href="/articles/{slug}/">\n  <span class="card-img">{img(key, "(max-width:600px) 100vw, (max-width:900px) 50vw, 380px")}</span>\n'
            f'  <span class="card-body"><span class="tag">{tag}</span><h3>{title}</h3><span class="teaser">{teaser}</span></span>\n</a>')


def article_cards(slugs, cards):
    return "\n".join(cards[s] for s in slugs if s in cards)


def game_card(g):
    return (f'<a class="gcard" href="/games/{g["slug"]}/"><div class="tags"><span>{E(g["players"].split(" (")[0])} players</span><span>{E(g["sub"])}</span></div>'
            f'<h3>{E(g["name"])}</h3><p>{E(g["lede"].split(". ")[0])}.</p></a>')


def drill_card(d):
    return (f'<a class="gcard" href="/get-better/{d["slug"]}/"><div class="tags"><span>{E(d["area"])}</span><span>{E(d["time"])}</span></div>'
            f'<h3>{E(d["name"])}</h3><p>{E(d["lede"].split(". ")[0])}.</p></a>')


def ledger(games):
    rows = []
    for i, g in enumerate(games, 1):
        rows.append(f'<a href="/games/{g["slug"]}/"><span class="n">No.&nbsp;{i}</span><span class="t">{E(g["name"])}</span>'
                    f'<span class="d">{E(g["lede"].split(". ")[0])}.</span><span class="p">{E(g["players"].split(" (")[0])} players &middot; {E(g["sub"])}</span><span class="go" aria-hidden="true">&rarr;</span></a>')
    return '<div class="ledger">' + "".join(rows) + "</div>"


TOOLS = {
    "skins": ("Skins card", '<div class="row"><label>Players, comma separated <input type="text" name="players" value="Ana, Ben, Cal, Dee"></label><label>How many <select name="count"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></label></div>', "Enter each player's score per hole. Lowest score outright wins the skin; ties carry over."),
    "nassau": ("Nassau match card", '<div class="row"><label>Side A <input type="text" name="a" value="Ana"></label><label>Side B <input type="text" name="b" value="Ben"></label></div>', "Pick the result of each hole. Front, back and overall update as you go."),
    "vegas": ("Vegas card", '<div class="row"><label>Players: team one first two, team two last two <input type="text" name="players" value="Ana, Ben, Cal, Dee" size="28"></label></div>', "Enter par and each score. Lower digit goes first; an opponent's birdie flips your number."),
    "wolf": ("Wolf card: rotation and points", '<div class="row"><label>Players in tee order on hole 1 <input type="text" name="players" value="Ana, Ben, Cal, Dee" size="28"></label><label>Wolf hits <select name="order"><option value="first">first</option><option value="last">last</option></select></label><button type="button" class="btn btn-ghost no-print" data-print>Print card</button></div>', "Rotation repeats every four holes. Enter points per hole using the table on this page."),
    "snake": ("Snake card", '<div class="row"><label>Players <input type="text" name="players" value="Ana, Ben, Cal, Dee"></label><label>How many <select name="count"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></label><label>Stake per snake <input type="number" name="stake" value="1" min="0" step="0.5" style="width:5em"></label></div>', "Mark who three-putted on each hole (the last one if two did)."),
    "bbb": ("Bingo Bango Bongo card", '<div class="row"><label>Players <input type="text" name="players" value="Ana, Ben, Cal, Dee"></label><label>How many <select name="count"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></label></div>', "Pick who earned each point on every hole."),
}


def tool_html(kind):
    t, ctrl, note = TOOLS[kind]
    return f"""<section class="tool" data-tool="{kind}" aria-labelledby="tool-h">
  <div class="card-top"><h3 id="tool-h">{t}</h3><span>Crazy Golf Game &middot; Scorecard</span></div>
  {ctrl}
  <p class="note">{note} Everything stays in your browser; nothing is saved or sent.</p>
  <div class="tbl"></div>
  <div class="out" aria-live="polite"></div>
</section>"""


def faq_html(faq):
    return '<section class="faq"><h2 id="faq">Questions people ask</h2>' + "".join(
        f"<details><summary>{E(q)}</summary><p>{E(a)}</p></details>" for q, a in faq) + "</section>"


def article_ld(title, desc, path, key):
    return {"@context": "https://schema.org", "@type": "Article", "headline": title, "description": desc,
            "image": f"{HOST}/images/{og_for(key)}", "datePublished": TODAY, "dateModified": TODAY,
            "author": {"@type": "Organization", "name": f"The {BRAND} team"},
            "publisher": {"@type": "Organization", "name": BRAND, "logo": {"@type": "ImageObject", "url": f"{HOST}/images/brand/mark-v3.png"}},
            "mainEntityOfPage": f"{HOST}{path}"}


# ------------------------------------------------------------------ pages
def detail_hero(trail, kick, name, lede, glance, key):
    g = "".join(f"<div><b>{E(k)}</b><span>{E(v)}</span></div>" for k, v in glance)
    return f"""<section class="dhero"><div class="wrap">{crumbs_html(trail)}<div class="in"><div>
<span class="kick">{kick}</span>
<h1>{E(name)}</h1>
<p class="lede">{E(lede)}</p>
<div class="glance">{g}</div>
</div><div class="ph-col">{fig(key, "r43", "(max-width:860px) 100vw, 560px", eager=True)}</div></div></div></section>"""


def game_page(g):
    by = {x["slug"]: x for x in GAMES}
    path = f"/games/{g['slug']}/"; key = GAME_PHOTO[g["slug"]]
    trail = [("Home", "/"), ("Games", "/games/"), (g["name"], path)]
    toc = "".join(f'<li><a href="#s{i}">{E(h)}</a></li>' for i, (h, _) in enumerate(g["sections"])) + '<li><a href="#helper">The scorecard</a></li><li><a href="#faq">Questions</a></li>'
    secs = "".join(f'<h2 id="s{i}">{E(h)}</h2>\n{b}\n' for i, (h, b) in enumerate(g["sections"]))
    rel = "".join(game_card(by[s]) for s in g["related"])
    body = detail_hero(trail, "Games within the game", g["name"], g["lede"],
                       [("Players", g["players"]), ("Length", g["time"]), ("Best for", g["best"]), ("Stakes", g["stakes"])], key) + f"""
<div class="wrap sec tight"><div class="body2"><article class="prose2">
<div class="rule warn"><p><strong>House rules vary.</strong> This is the common way to play {E(g['name'])}. Settle the details (points, stakes, handicaps) on the first tee, before anyone has hit a shot they'd like to renegotiate.</p></div>
{secs}
<div class="example">{g['example']}</div>
<h2 id="helper">The scorecard</h2>
{tool_html(g['tool'])}
{faq_html(g['faq'])}
<p class="note">Playing for money? Keep it friendly and legal where you live. The best stake is one nobody minds losing.</p>
</article>
<aside class="toc no-print"><h4>On this page</h4><ol>{toc}</ol><p style="margin:22px 0 0"><a class="more" href="/games/">All games</a></p></aside></div>
<section class="sec tight no-print"><div class="sec-head"><h2>Play next</h2><a class="more" href="/games/">All side games</a></div><div class="grid3">{rel}</div></section></div>"""
    ld = [article_ld(g["title"], g["desc"], path, key), crumbs_ld(trail)]
    return page(g["title"], g["desc"], path, "games", body, ld, og_for(key))


def drill_page(d):
    by = {x["slug"]: x for x in GAMES}
    path = f"/get-better/{d['slug']}/"; key = DRILL_PHOTO[d["slug"]]
    trail = [("Home", "/"), ("Get Better", "/get-better/"), (d["name"], path)]
    toc = "".join(f'<li><a href="#s{i}">{E(h)}</a></li>' for i, (h, _) in enumerate(d["sections"])) + '<li><a href="#faq">Questions</a></li>'
    secs = "".join(f'<h2 id="s{i}">{E(h)}</h2>\n{b}\n' for i, (h, b) in enumerate(d["sections"]))
    others = "".join(drill_card(x) for x in DRILLS if x["slug"] != d["slug"])
    games = "".join(game_card(by[s]) for s in d["related_games"])
    body = detail_hero(trail, f"Get better &middot; {E(d['area'])}", d["name"], d["lede"],
                       [("Skill", d["area"]), ("Time", d["time"]), ("You need", d["need"]), ("Level", d["level"])], key) + f"""
<div class="wrap sec tight"><div class="body2"><article class="prose2">
{secs}
{faq_html(d['faq'])}
<p class="note">General practice ideas for recreational golfers, not personal coaching. If something hurts, stop and see a qualified professional.</p>
</article>
<aside class="toc"><h4>On this page</h4><ol>{toc}</ol><p style="margin:22px 0 0"><a class="more" href="/practice-session-planner/">Plan a session</a></p></aside></div>
<section class="sec tight"><div class="sec-head"><h2>More drills</h2><a class="more" href="/get-better/">Get Better</a></div><div class="grid3">{others}</div></section>
<section class="sec tight"><div class="sec-head"><div><h2>Put it under pressure</h2><p>Side games that test the same skill when it counts.</p></div></div><div class="grid3">{games}</div></section></div>"""
    ld = [article_ld(d["title"], d["desc"], path, key), crumbs_ld(trail)]
    return page(d["title"], d["desc"], path, "better", body, ld, og_for(key))


def pillar_hero(kick, h1, lede, trail, key):
    return f"""<section class="phero3"><div class="bg">{img(key, "100vw", eager=True, alt="")}</div><div class="wrap in">{crumbs_html(trail)}
<span class="kick lt">{kick}</span><h1>{h1}</h1><p class="lede">{lede}</p></div>
<p class="cred">{credit_html(key)}</p></section>"""


def games_pillar(cards):
    trail = [("Home", "/"), ("Games", "/games/")]
    more = "".join(f'<div class="gcard"><h3>{E(n)}</h3><p>{E(t)}</p></div>' for n, t in MORE_GAMES)
    gen = """<section class="generator" id="hole-generator" aria-labelledby="gen-h"><div class="gen-card"><div class="gen-copy">
<span class="kick">For the backyard</span>
<h3 id="gen-h">The Crazy Hole Generator</h3>
<p>Pick where you're playing and draw a hole: an obstacle, a twist and a par. Build it, play it, draw again.</p>
<label for="gen-where">Where are you playing?</label>
<select id="gen-where"><option value="yard">Backyard or park</option><option value="home">Living room or hallway</option><option value="course">At a mini golf course (twists only)</option></select>
<button type="button" class="btn" id="gen-spin">Draw a hole</button></div>
<div class="gen-out" aria-live="polite"><div class="gen-ball" aria-hidden="true"></div><p class="gen-num">Hole <span id="gen-hole">1</span></p>
<dl><dt>Obstacle</dt><dd id="gen-obstacle">Press the button to draw your first hole.</dd><dt>Twist</dt><dd id="gen-twist">&mdash;</dd><dt>Par</dt><dd id="gen-par">&mdash;</dd></dl></div></div></section>"""
    body = pillar_hero("Pillar one", "Games Within the Game",
        "Golf has always had games inside it. The Saturday four plays Wolf, the regulars run a Nassau, and every group has someone who swears they never three-putt until Snake is on. Here are the rules, the scoring and a proper scorecard for each, plus the crazy golf and backyard games where a lot of us started.", trail, "green-aerial-sand") + f"""
<div class="wrap">
<section class="sec tight"><div class="sec-head"><div><span class="kick">On the course</span><h2>Side games, explained properly</h2><p>Each page has the rules, the scoring, a worked example, the usual house rules and a scorecard that does the adding up.</p></div></div>
{ledger(GAMES)}</section>
<section class="sec tight"><div class="prose2">
<h2>Pick a game for your group</h2>
<table><thead><tr><th>Your group</th><th>Try</th><th>Why</th></tr></thead><tbody>
<tr><td>Two players</td><td><a href="/games/nassau/">Nassau</a> + <a href="/games/snake/">Snake</a></td><td>Three bets keep a match alive; Snake adds pressure on the greens.</td></tr>
<tr><td>Three players</td><td><a href="/games/skins/">Skins</a> or <a href="/games/bingo-bango-bongo/">Bingo Bango Bongo</a></td><td>Every-player-for-themselves games that work with odd numbers.</td></tr>
<tr><td>Four players, similar ability</td><td><a href="/games/wolf/">Wolf</a> or <a href="/games/vegas/">Vegas</a></td><td>Changing partners (Wolf) or big team swings (Vegas).</td></tr>
<tr><td>Four players, mixed ability</td><td><a href="/games/bingo-bango-bongo/">Bingo Bango Bongo</a> or net <a href="/games/skins/">Skins</a></td><td>Points that don't depend on total score, or handicaps on the hardest holes.</td></tr>
<tr><td>Big group or society day</td><td>Scramble variants, Stableford</td><td>Fast, forgiving formats where everyone finishes.</td></tr>
</tbody></table>
<blockquote>Agree on the game, the points and any stakes on the first tee. Every golf argument we've ever heard started with &ldquo;I thought we said&hellip;&rdquo;</blockquote>
</div></section>
<section class="sec tight"><div class="sec-head"><div><span class="kick">More formats</span><h2>Other games worth knowing</h2></div></div><div class="grid2">{more}</div></section>
<section class="sec tight" id="crazy-golf"><div class="sec-head"><div><span class="kick">Off the course</span><h2>Crazy golf, backyard and indoor games</h2><p>Where the name comes from: mini golf, putting games and courses you build yourself. Archive photographs by John Margolies, Library of Congress.</p></div><a class="more" href="/articles/">All guides</a></div>
<div class="grid">{article_cards(ART_PILLAR['games'], cards)}</div>
{gen}
</section></div>"""
    ld = [crumbs_ld(trail), {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Games Within the Game", "url": f"{HOST}/games/"}]
    return page("Golf Side Games: Rules for Wolf, Nassau, Skins, Vegas and More",
                "Rules, scoring and free score helpers for golf side games: Wolf, Nassau, Skins, Bingo Bango Bongo, Vegas and Snake, plus Rabbit, Hammer, scrambles and backyard crazy golf games.",
                "/games/", "games", body, ld, og_for("green-aerial-sand"))


def better_pillar(cards):
    trail = [("Home", "/"), ("Get Better", "/get-better/")]
    body = pillar_hero("Pillar two", "Get Better (and enjoy it)",
        "Practice doesn't have to be a bucket of balls on autopilot. Every drill here has a target, a way to keep score and a game version you can play against a friend. Start with the part of your game that costs you the most shots.", trail, "putting-stance") + f"""
<div class="wrap">
<section class="sec tight"><div class="sec-head"><div><span class="kick">Drills with a scorecard</span><h2>Start with one of these</h2></div><a class="more" href="/practice-session-planner/">Plan a practice session</a></div>
<div class="grid3">{"".join(f'<div>{fig(DRILL_PHOTO[d["slug"]], "r32", "(max-width:600px) 100vw, 380px", cap=False)}<div style="margin-top:18px">{drill_card(d)}</div></div>' for d in DRILLS)}</div></section>
<section class="sec tight"><div class="body2"><div class="prose2">
<h2 id="putting">Putting</h2>
<p>For most club golfers, the quickest way to lower scores is fewer three-putts. That's mostly distance control from long range plus confidence inside four feet. Start with the <a href="/get-better/putting-ladder-drill/">Putting Ladder</a>, then read <a href="/articles/mini-golf-putting-tips/">reading banks and slopes</a> and the ten <a href="/articles/putting-practice-games/">putting practice games</a>.</p>
<h2 id="short-game">Short game</h2>
<p>Pick a landing spot, choose the club that rolls the ball the rest of the way, and keep it low when you can. The <a href="/get-better/landing-spot-ladder/">Landing Spot Ladder</a> and its Par 18 game teach exactly that.</p>
<h2 id="driving">Driving</h2>
<p>Fairways beat distance for most of us. The <a href="/get-better/fairway-corridor/">Fairway Corridor</a> turns range time into fourteen real tee shots and shows you what your typical miss actually is.</p>
<h2 id="course-management">Course management</h2>
<p>The cheapest strokes to save are the ones you give away with decisions. A few habits that help almost everyone:</p>
<ul class="checklist">
<li><strong>Aim at the middle of the green</strong> unless you have a short iron and a safe miss. Pins near edges are traps.</li>
<li><strong>Play to your miss.</strong> If your shots usually curve right, aim left of centre and let the shape bring it back.</li>
<li><strong>Take your medicine.</strong> A sideways chip back to the fairway beats a hero shot through the trees.</li>
<li><strong>Club up when in doubt.</strong> Most amateurs come up short of the green far more often than long.</li>
<li><strong>Lay up to a number you like,</strong> not to an awkward half wedge.</li>
</ul>
<h2 id="fun">Skills that are just fun</h2>
<p>Trick shots won't lower your handicap, but they will make you better with your hands. Start with the <a href="/articles/beginner-trick-shots/">beginner trick shots</a>.</p>
</div><aside class="toc"><h4>By skill</h4><ol><li><a href="#putting">Putting</a></li><li><a href="#short-game">Short game</a></li><li><a href="#driving">Driving</a></li><li><a href="#course-management">Course management</a></li><li><a href="#fun">Just for fun</a></li></ol></aside></div></section>
<section class="sec tight"><div class="sec-head"><h2>Guides for this pillar</h2><a class="more" href="/articles/">All guides</a></div><div class="grid">{article_cards(ART_PILLAR['better'], cards)}</div></section>
<p class="note">General practice ideas for recreational golfers, not personal coaching.</p></div>"""
    return page("Golf Practice Drills and Games: Putting, Chipping, Driving",
                "Golf practice drills that feel like games: a putting ladder for distance control, a landing-spot chipping ladder with Par 18, a driving range fairway corridor, and course management habits.",
                "/get-better/", "better", body, [crumbs_ld(trail)], og_for("putting-stance"))


def pick(key, title, text, offer, place, label, who):
    return f"""<div class="pick">{fig(key, "r43", "200px", cap=False)}<div>
<h3>{title}</h3><p>{text}</p><p class="small"><strong>Good for:</strong> {who}</p><p class="aff-cta">{ov.aff(offer, place, label)}</p></div></div>"""


def gear_pillar(cards):
    trail = [("Home", "/"), ("Gear & Gifts", "/gear/")]
    body = pillar_hero("Pillar three", "Gear &amp; Gifts, honestly",
        "Most golfers own more gear than they use. We'd rather help you buy one thing you'll use every week than ten things for the garage. Here's what we'd look at by category, the stores we link to, and what you can safely skip.", trail, "clubs-in-bag") + f"""
<div class="wrap">
<section class="sec tight">{disclosure()}</section>
<section class="sec tight" style="padding-top:0"><div class="sec-head"><div><span class="kick">Picks by category</span><h2>Worth the money if you'll use it</h2></div><a class="btn" href="/offers/">Gift Guide 2026</a></div>
<div>
{pick("indoor-putters", "Putting mat or home green", "The most-used piece of practice gear for most golfers. Check length (longer allows lag practice), surface speed and whether you want a ball return. Measure your space first.", "indoor-golf-shop", "gear-pillar-mats", "Compare putting mats", "Anyone who wants to stop three-putting")}
{pick("driver-at-address", "Launch monitor or home simulator", "A big purchase that only makes sense with the space and the habit to use it. Check ceiling height and room depth against the maker's requirements, and whether full features need a subscription.", "indoor-golf-shop", "gear-pillar-sim", "Browse simulators and launch monitors", "Regular golfers with a garage or spare room")}
{pick("ball-macro", "Golf balls", "For casual golf, bright or matte coloured balls are easier to find. For your main game, pick one model and stick with it so every short-game shot reacts the same way.", "vice-golf", "gear-pillar-balls", "See Vice Golf balls", "Everyone; personalised sleeves make good gifts")}
{pick("mini-windmill", "Backyard and kids' sets", "Portable cups, flags and kids' clubs turn a lawn into a course. Look for an age range on the box and parts that pack away.", "best-choice-products", "gear-pillar-yard", "Browse backyard game sets", "Families and party hosts")}
</div></section>
<section class="sec tight"><div class="prose2" style="max-width:780px">
<h2>What you can skip</h2>
<ul class="checklist">
<li><strong>Gadgets that promise a new swing.</strong> A couple of alignment sticks do most of what they do.</li>
<li><strong>Premium balls for practice and mini golf.</strong> A basic ball rolls fine on a short putt.</li>
<li><strong>A full new set before you know you love the game.</strong> Rent, borrow or start with a half set.</li>
<li><strong>Anything you would only use once a year.</strong></li>
</ul>
<h2>How we choose stores</h2>
<p>We link to retailers whose range matches what we write about and whose affiliate programme we've joined. A link never decides what goes in an article. If a category doesn't have a store we trust, we explain what to look for and leave it unlinked.</p>
</div></section>
<section class="sec tight"><div class="sec-head"><h2>Gear guides</h2></div><div class="grid">{article_cards(ART_PILLAR['gear'], cards)}</div></section>
<p class="note">Photos show the category, not the specific products sold by the linked stores.</p></div>"""
    return page("Golf Gear and Gift Picks: Putting Mats, Simulators, Balls and Backyard Sets",
                "Honest golf gear picks by category: putting mats, launch monitors and home simulators, golf balls and backyard sets, what to skip, and our Crazy Golf Gift Guide 2026.",
                "/gear/", "gear", body, [crumbs_ld(trail)], og_for("clubs-in-bag"))


def clubhouse():
    trail = [("Home", "/"), ("Clubhouse", "/clubhouse/")]
    subj = "My%20group%27s%20game"
    body = pillar_hero("Pillar four", "The Clubhouse",
        "The best part of a round is often the walk between shots and the argument afterwards about whose ball was closer. The Clubhouse is where we talk golf with you: your group's games, your questions, and what's going on in the game.", trail, "clubhouse-pines") + f"""
<div class="wrap">
<section class="sec tight on-light"><div class="join"><div>
<span class="kick">Join in</span><h2>Follow along</h2>
<p class="lede">Most weeks we share a game, a drill or a question on X and Facebook. Reply, argue, and tell us how your group plays it.</p>
{socials()}
</div>{newsletter("club")}</div></section>
<section class="sec tight"><div class="sec-head"><div><span class="kick">Post your game</span><h2>Does your group play something we haven't covered?</h2></div></div>
<div class="grid2">
<div class="prompt"><h3>Send us your house rules</h3><p>Every group has a twist: a special Wolf points table, a rule for the 19th hole, a name for the shot that hits the cart path. Tell us the game, how you score it and how many play. We read everything and may write it up (we'll ask before using your name).</p>
<p><a class="btn" href="mailto:{EMAIL}?subject={subj}">Email your game</a> &nbsp; <a class="more" href="{X_URL}" rel="noopener">Or post it and tag @crazygolfgame</a></p></div>
<div class="prompt"><h3>Talk golf: this week's questions</h3>
<q>What's the one side game your group always comes back to, and why?</q>
<q>Wolf: should the Wolf hit first or last?</q>
<q>What's the best piece of practice gear you actually use every week?</q>
<p class="small" style="margin-top:12px">Answer on <a href="{X_URL}" rel="noopener">X</a> or <a href="{FB_URL}" rel="noopener">Facebook</a>.</p></div>
</div></section>
<section class="sec tight"><div class="split"><div class="ph-col">{fig("bag-on-fairway", "r32")}</div><div class="prose2">
<h2>Clubhouse rules</h2>
<ul class="checklist"><li>Be kind. Every golfer was a beginner once.</li><li>Keep bets friendly and legal where you live.</li><li>No spam or selling in replies.</li><li>Corrections welcome: if we got a rule wrong, <a href="/contact/">tell us</a>.</li></ul>
<h3>New here? Start with</h3>
<p><a href="/games/">Games Within the Game</a> if you want a better Saturday, <a href="/get-better/">Get Better</a> if you want lower scores, and the <a href="/offers/">Gift Guide 2026</a> if someone in your life is impossible to buy for.</p>
</div></div></section></div>"""
    return page("The Clubhouse: Talk Golf With Crazy Golf Game",
                "Join the Crazy Golf Game clubhouse: follow @crazygolfgame on X and our Facebook page, share your group's side games and house rules, and answer this week's golf questions.",
                "/clubhouse/", "club", body, [crumbs_ld(trail)], og_for("clubhouse-pines"))


def home(cards):
    wolf = next(g for g in GAMES if g["slug"] == "wolf")
    ladder = DRILLS[0]
    index = "".join(f"""<a class="icard" href="{u}">{fig(k2, "r43", "(max-width:560px) 100vw, (max-width:1000px) 50vw, 280px", cap=False)}<span class="num">No.&nbsp;{i}</span><h3>{t}</h3><p>{d}</p><span class="more">Explore</span></a>"""
                    for i, (k, u, t, d, k2) in enumerate(PILLARS, 1))
    latest = article_cards(["mini-golf-party-games", "backyard-mini-golf-course", "designing-mini-golf-holes"], cards)
    ld = [{"@context": "https://schema.org", "@type": "WebSite", "name": BRAND, "url": f"{HOST}/"},
          {"@context": "https://schema.org", "@type": "Organization", "name": BRAND, "url": f"{HOST}/", "logo": f"{HOST}/images/brand/mark-v3.png", "sameAs": [X_URL, FB_URL]}]
    hero_key = "green-aerial-bunkers"
    body = f"""<section class="hero3"><div class="bg">{img(hero_key, "100vw", eager=True, alt="Aerial view of a green ringed by bunkers and pine trees")}</div>
<div class="wrap in"><div class="copy">
<span class="kick lt">For people who love the game</span>
<h1>Golf is better with <em>something on it.</em></h1>
<p class="lede">The Saturday Wolf. Skins with the regulars. A putting ladder before work. Crazy Golf Game is about the games inside the game: rules good enough to settle an argument, practice with a scorecard, and gear we'd actually buy.</p>
<div class="btns"><a class="btn btn-light" href="/games/">Find a game for Saturday</a><a class="btn btn-line" href="/get-better/">Get better this week</a></div>
<div class="facts"><span><b>14</b>side-game formats</span><span><b>6</b>scorecards that do the maths</span><span><b>3</b>drills with a score</span></div>
</div></div>
<p class="cred">{credit_html(hero_key)}</p></section>

<section class="sec"><div class="wrap">
<div class="sec-head"><div><span class="kick">Four ways in</span><h2>What you'll find here</h2></div></div>
<div class="index4">{index}</div></div></section>

<section class="sec paper"><div class="wrap split">
<div class="ph-col">{fig("green-aerial-flag", "r43")}</div>
<div><span class="kick">Game of the week</span><h2>Wolf: pick a partner, or go it alone</h2>
<p>{E(wolf['lede'])}</p>
<ol class="steps"><li>The Wolf rotates every hole.</li><li>After each drive, the Wolf picks that player as a partner, or waits for the next one.</li><li>Or goes Lone Wolf for bigger points. Win and you're a hero; lose and everyone else gets paid.</li></ol>
<p><a class="btn" href="/games/wolf/">Full rules and the Wolf card</a></p></div>
</div></section>

<section class="sec"><div class="wrap">
<div class="sec-head"><div><span class="kick">The rule book</span><h2>Side games, explained properly</h2><p>Rules, scoring, a worked example and a scorecard that does the adding up.</p></div><a class="more" href="/games/">All games</a></div>
{ledger(GAMES)}
</div></section>

<section class="sec paper"><div class="wrap duo">
<article class="story">{fig("putter-by-green", "r43")}
<span class="kick" style="margin-top:22px">Drill of the week &middot; Putting</span><h3>{E(ladder['name'])}</h3>
<div class="meta"><span><b>Time</b> {E(ladder['time'])}</span><span><b>You need</b> {E(ladder['need'])}</span></div>
<p>{E(ladder['lede'])}</p>
<p><a class="more" href="/get-better/putting-ladder-drill/">Try the drill</a></p></article>
<article class="story">{fig("indoor-putters", "r43")}
<span class="kick" style="margin-top:22px">Gear note</span><h3>A putting mat you'll actually use</h3>
<div class="meta"><span><b>Best for</b> winter practice</span><span><b>Check</b> length and speed</span></div>
<p>If you buy one piece of practice gear this winter, make it a putting surface long enough for the ladder drill. Measure the hallway first, then decide whether you want a ball return.</p>
<p class="aff-cta">{ov.aff("indoor-golf-shop", "home-gear-pick", "Compare putting mats")}</p>
{disclosure(short=True)}
<p><a class="more" href="/gear/">All gear picks</a> &nbsp; <a class="more" href="/offers/">Gift Guide 2026</a></p></article>
</div></section>

<section class="sec"><div class="wrap">
<div class="sec-head"><div><span class="kick">Where the name comes from</span><h2>Crazy golf, backyard courses and party games</h2><p>Mini golf is where a lot of us fell for the game. Build a backyard nine, run a living-room tournament, or draw a random hole with the <a href="/games/#hole-generator">Crazy Hole Generator</a>. Archive photographs: John Margolies, Library of Congress.</p></div><a class="more" href="/articles/">All guides</a></div>
<div class="grid">{latest}</div></div></section>

<section class="sec dark"><div class="wrap join"><div>
<img class="seal" src="/images/brand/mark-v3-light.svg" alt="" width="84" height="84">
<span class="kick lt">The Clubhouse</span><h2>Talk golf with us</h2>
<p>Tell us the game your group plays, ask a rules question, or settle whether the Wolf should hit first. We're on X as @crazygolfgame and on Facebook.</p>
{socials()}
<p style="margin-top:22px"><a class="btn btn-light" href="/clubhouse/">Visit the Clubhouse</a></p>
</div>{newsletter("home")}</div></section>"""
    return page("Golf Side Games, Drills and Gear for Golf Lovers",
                "Crazy Golf Game is for people who love golf and the games inside the game: rules and score helpers for Wolf, Nassau and Skins, practice drills that feel like games, honest gear picks and a golf clubhouse.",
                "/", "", body, ld, og_for(hero_key))


def articles_index(cards):
    groups = [("Games Within the Game", "/games/", ART_PILLAR["games"]), ("Get Better", "/get-better/", ART_PILLAR["better"]), ("Gear &amp; Gifts", "/gear/", ART_PILLAR["gear"])]
    secs = "".join(f'<section class="sec tight"><div class="sec-head"><h2>{t}</h2><a class="more" href="{u}">Go to pillar</a></div><div class="grid">{article_cards(s, cards)}</div></section>' for t, u, s in groups)
    new = ('<section class="sec tight"><div class="sec-head"><h2>Side-game rules</h2><a class="more" href="/games/">Games</a></div>' + ledger(GAMES) +
           '</section><section class="sec tight"><div class="sec-head"><h2>Drills</h2><a class="more" href="/get-better/">Get Better</a></div><div class="grid3">' + "".join(drill_card(d) for d in DRILLS) + "</div></section>")
    trail = [("Home", "/"), ("Guides", "/articles/")]
    body = pillar_hero("The library", "All guides", f"Every Crazy Golf Game guide, sorted by pillar: {len(cards)} guides on mini golf and backyard games, putting and practice, and gear, plus the side-game rules and drills.", trail, "scorecard-vintage") + f'<div class="wrap">{new}{secs}</div>'
    return page("All Guides", "Every Crazy Golf Game guide in one place, sorted into games, practice and gear: side-game rules, drills, backyard and indoor mini golf, putting tips and more.", "/articles/", "guides", body, [crumbs_ld(trail)], og_for("scorecard-vintage"))


def credits_page():
    trail = [("Home", "/"), ("Photo credits", "/credits/")]
    items = "".join(f'<li><img src="/images/photos/{k}-800.webp" alt="" width="120" height="80" loading="lazy"><div><strong>{E(c["alt"])}</strong><br>{credit_html(k)}.'
                    + (f' {E(c["credit_line"])}.' if c["source"] == "Library of Congress" else "") + "</div></li>" for k, c in CREDITS.items())
    body = f"""<section class="wrap narrow page-head">{crumbs_html(trail)}<h1>Photo credits</h1>
<p class="lead">The photographs on Crazy Golf Game come from Wikimedia Commons and the Library of Congress. We only use images that are in the public domain, dedicated to it (CC0), or licensed for commercial use with attribution (CC BY). Each one is credited below and next to where it appears. Images are resized and cropped for the web; no other changes are made.</p></section>
<div class="wrap narrow page-body"><ul class="credits">{items}</ul>
<p class="note">The mini golf photographs are from the John Margolies Roadside America photograph archive (1972-2008) at the Library of Congress, which lists no known restrictions on publication. Photos show places and categories, not the specific products sold by the stores we link to. People who appear in photos are not members of our community or endorsers. Spot a credit we got wrong? <a href="/contact/">Tell us</a>.</p></div>"""
    return page("Photo Credits", "Credits and licences for the photographs used on Crazy Golf Game: Wikimedia Commons (CC0, public domain and CC BY) and the Library of Congress John Margolies archive.",
                "/credits/", "", body, [crumbs_ld(trail)])


# ------------------------------------------------------------------ re-chrome existing pages
HEAD_STRIP = [r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\n?', r'<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\n?',
              r'<link href="https://fonts\.googleapis\.com/css2[^"]*" rel="stylesheet">\n?', r'<link rel="stylesheet" href="/assets/(?:site|v2)\.css">\n?',
              r'<link rel="icon" href="/images/logo\.svg" type="image/svg\+xml">\n?']


def photo_figure(key, slug, sizes="(max-width:1240px) 100vw, 1200px"):
    """Article hero: WebP photo via <picture>; /images/<slug>.svg stays as the <img> fallback (brand plate)."""
    c = CREDITS[key]
    return (f'<figure class="hero-fig wrap">\n    <picture><source type="image/webp" srcset="{srcset(key)}" sizes="{sizes}">'
            f'<img src="/images/{slug}.svg" alt="{E(c["alt"])}" width="1200" height="675" fetchpriority="high"></picture>\n'
            f'    <figcaption class="cred">{credit_html(key)}</figcaption>\n  </figure>')


def rechrome(doc, active="", rel=""):
    for pat in HEAD_STRIP:
        doc = re.sub(pat, "", doc)
    if "/assets/v3.css" not in doc:
        doc = doc.replace("</head>", f"{ICONS}\n{FONT_PRELOAD}\n<link rel=\"stylesheet\" href=\"/assets/v3.css\">\n</head>", 1)
    doc = re.sub(r'<meta name="theme-color" content="[^"]*">', '<meta name="theme-color" content="#132820">', doc)
    hdr = header(active)
    hdr_block = hdr[hdr.index('<div class="util">'):]
    doc = re.sub(r'(?:<div class="util">.*?</div></div>\n)?<header class="(?:site-header|hdr)">.*?</header>\n?', lambda m: hdr_block, doc, count=1, flags=re.S)
    foot = FOOTER[:FOOTER.index("</footer>") + len("</footer>")]
    doc = re.sub(r'<footer class="(?:site-footer|ftr)">.*?</footer>', lambda m: foot, doc, count=1, flags=re.S)
    if "/assets/games.js" not in doc and "/assets/site.js" in doc:
        doc = doc.replace('<script src="/assets/site.js" defer></script>', '<script src="/assets/site.js" defer></script>\n<script src="/assets/games.js" defer></script>')
    # article hero photo + og image
    m = re.match(r"articles/([^/]+)/index\.html$", rel)
    if m and m.group(1) in ART_PHOTO:
        slug = m.group(1); key = ART_PHOTO[slug]
        doc = re.sub(r'<figure class="hero-fig wrap">.*?</figure>', lambda _: photo_figure(key, slug), doc, count=1, flags=re.S)
        doc = re.sub(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{HOST}/images/{og_for(key)}">', doc)
    elif rel == "offers/index.html":
        k = "glove-balls-putter"
        doc = re.sub(r'\n?<figure class="hero-fig">.*?</figure>', "", doc, count=1, flags=re.S)
        photo = (f'<figure class="ph r43">{img(k, "(max-width:860px) 100vw, 560px", eager=True)}'
                 f'<figcaption class="cred">Illustrative photo, not a product we link to. {credit_html(k)}</figcaption></figure>')
        doc = re.sub(r'<section class="wrap narrow page-head gift-head">(.*?)</section>',
                     lambda mm: f'<section class="dhero gift"><div class="wrap"><div class="in"><div>{mm.group(1)}</div><div class="ph-col">{photo}</div></div></div></section>',
                     doc, count=1, flags=re.S)
        doc = re.sub(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{HOST}/images/{og_for(k)}">', doc)
    elif rel == "about/index.html":
        k = "mini-three-holes"
        doc = re.sub(r'<(?:img class="inline-art"[^>]*|figure class="ph r169 inline-fig">.*?</figure)>', lambda _: f'<figure class="ph r169 inline-fig">{img(k, "(max-width:820px) 100vw, 780px")}<figcaption class="cred">{credit_html(k)}</figcaption></figure>', doc, count=1, flags=re.S)
    if 'og:image" content="' in doc and re.search(r'og:image" content="[^"]*\.svg"', doc):
        doc = re.sub(r'<meta property="og:image" content="[^"]*\.svg">', f'<meta property="og:image" content="{HOST}/images/og/green-aerial-bunkers.jpg">', doc)
    # related-article cards inside guides
    def recard(mm):
        slug = mm.group(1)
        if slug not in ART_PHOTO:
            return mm.group(0)
        return f'<a class="card" href="/articles/{slug}/">\n  <span class="card-img">{img(ART_PHOTO[slug], "(max-width:600px) 100vw, (max-width:900px) 50vw, 380px")}</span>'
    doc = re.sub(r'<a class="card" href="/articles/([^/]+)/">\s*<span class="card-img">.*?</span>', recard, doc, flags=re.S)
    return doc


def plate_svg():
    """Non-illustrative brand plate kept at /images/<slug>.svg (fallback behind article photos)."""
    mark = (HERE / "brand" / "mark-v3-light.svg").read_text()
    inner = re.search(r"<svg[^>]*>(.*)</svg>", mark, re.S).group(1)
    inner = re.sub(r"<title>.*?</title>", "", inner)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675" role="img" aria-label="Crazy Golf Game">'
            '<rect width="1200" height="675" fill="#1E3A2F"/><rect x="24" y="24" width="1152" height="627" fill="none" stroke="#C2A465" stroke-width="1" opacity=".5"/>'
            f'<g transform="translate(510 247.5) scale(1.5)">{inner}</g></svg>\n')


def main():
    img_dir = SITE / "images"
    (img_dir / "photos").mkdir(parents=True, exist_ok=True)
    (img_dir / "og").mkdir(exist_ok=True)
    (img_dir / "brand").mkdir(exist_ok=True)
    (SITE / "assets" / "fonts").mkdir(parents=True, exist_ok=True)
    for f in (HERE / "photos").glob("*.webp"):
        shutil.copy(f, img_dir / "photos" / f.name)
    for f in (HERE / "og").glob("*.jpg"):
        shutil.copy(f, img_dir / "og" / f.name)
    for f in (HERE / "brand").iterdir():
        shutil.copy(f, img_dir / "brand" / f.name)
    for f in (HERE / "fonts").iterdir():
        shutil.copy(f, SITE / "assets" / "fonts" / f.name)
    shutil.copy(HERE / "v3.css", SITE / "assets" / "v3.css")
    shutil.copy(V2 / "games.js", SITE / "assets" / "games.js")
    # brand marks replace the old cartoon art at the legacy paths the tests and old pages expect
    shutil.copy(HERE / "brand" / "mark-v3.svg", img_dir / "logo.svg")
    plate = plate_svg()
    for name in ["hero.svg", "og.svg"] + [f"{s}.svg" for s in ART_PHOTO]:
        (img_dir / name).write_text(plate)
    for name in V2_IMAGES:
        (img_dir / name).unlink(missing_ok=True)
    for name in ["v2.css"]:
        (SITE / "assets" / name).unlink(missing_ok=True)

    raw = json.loads((V2 / "_cards.json").read_text())
    cards = {s: card_from_cache(s, snip) for s, snip in raw.items()}

    def put(rel, content):
        p = SITE / rel; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(content)

    active_for = lambda rel: ("guides" if rel.startswith("articles/") else "")
    generated = {"index.html", "articles/index.html", "games/index.html", "get-better/index.html", "gear/index.html", "clubhouse/index.html", "credits/index.html"} | \
        {f"games/{g['slug']}/index.html" for g in GAMES} | {f"get-better/{d['slug']}/index.html" for d in DRILLS}
    for p in SITE.rglob("*.html"):
        rel = p.relative_to(SITE).as_posix()
        if rel.startswith(("preview/", "practice-session-planner/")) or rel == "contact.html" or rel in generated:
            continue
        d = p.read_text()
        if '<header class="site-header">' in d or '<header class="hdr">' in d:
            p.write_text(rechrome(d, active_for(rel), rel))

    put("index.html", home(cards))
    put("articles/index.html", articles_index(cards))
    put("games/index.html", games_pillar(cards))
    put("get-better/index.html", better_pillar(cards))
    put("gear/index.html", gear_pillar(cards))
    put("clubhouse/index.html", clubhouse())
    put("credits/index.html", credits_page())
    for g in GAMES:
        put(f"games/{g['slug']}/index.html", game_page(g))
    for d in DRILLS:
        put(f"get-better/{d['slug']}/index.html", drill_page(d))

    sm = (SITE / "sitemap.xml").read_text()
    new_urls = ["/games/", "/get-better/", "/gear/", "/clubhouse/", "/credits/"] + [f"/games/{g['slug']}/" for g in GAMES] + [f"/get-better/{d['slug']}/" for d in DRILLS]
    add = "".join(f"  <url><loc>{HOST}{u}</loc><lastmod>{TODAY}</lastmod></url>\n" for u in new_urls if f"<loc>{HOST}{u}</loc>" not in sm)
    for u in ["/", "/articles/"]:
        sm = re.sub(rf"(<loc>{re.escape(HOST + u)}</loc><lastmod>)[^<]+", rf"\g<1>{TODAY}", sm)
    sm = sm.replace("</urlset>", add + "</urlset>")
    (SITE / "sitemap.xml").write_text(sm)
    print("v3 built:", len(new_urls), "pillar/game/drill/credit URLs;", len(CREDITS), "photos")


if __name__ == "__main__":
    main()
