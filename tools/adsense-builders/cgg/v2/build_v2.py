#!/usr/bin/env python3
"""CGG v2 redesign generator (draft 2026-10-09).

Runs after build.py and affiliate_overlay.py. Writes new pillar/game/drill/clubhouse pages,
re-chromes every generated page with the v2 header/footer/fonts, regroups /articles/ by pillar,
and extends sitemap.xml. Idempotent.
"""
import html, json, pathlib, re, shutil, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE)); sys.path.insert(0, str(HERE.parent))
import art
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
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">'
OLD_FONTS = '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:ital,wght@0,400;0,600;0,800;1,400&display=swap" rel="stylesheet">'
GTM_HEAD = ov.__dict__.get("GTM_HEAD")  # not defined there; read from build.py below
E = lambda s: html.escape(s, quote=True)

src_build = (HERE.parent / "build.py").read_text()
GTM_HEAD = re.search(r'GTM_HEAD = """(.*?)"""', src_build, re.S).group(1)
GTM_BODY = re.search(r"GTM_BODY = '(.*?)'\n", src_build).group(1)

ART_PILLAR = {
    "games": ["mini-golf-party-games", "backyard-mini-golf-course", "indoor-mini-golf-course", "diy-mini-golf-obstacles",
              "designing-mini-golf-holes", "mini-golf-tournament-at-home", "mini-golf-with-kids", "mini-golf-date-night",
              "mini-golf-rules-and-etiquette"],
    "better": ["mini-golf-putting-tips", "putting-practice-games", "beginner-trick-shots"],
    "gear": ["casual-golfer-gear-guide"],
}
PILLARS = [
    ("games", "/games/", "Games Within the Game", "Wolf, Nassau, Skins, Vegas and more: rules, scoring and score helpers, plus backyard and crazy golf games."),
    ("better", "/get-better/", "Get Better", "Drills and practice games by skill: putting, short game, driving and course management."),
    ("gear", "/gear/", "Gear &amp; Gifts", "Honest picks for practice gear, balls and backyard sets, plus the Gift Guide 2026."),
    ("club", "/clubhouse/", "Clubhouse", "Talk golf, share your group's game, and follow along on X and Facebook."),
]
X_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-7.5 8.6L23 22h-6.8l-5.3-6.9L4.8 22H1.7l8-9.2L1 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z"/></svg>'
FB_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4H13.5V8.9c0-.6.3-.9.5-.9z"/></svg>'


def head(title, desc, path, og="og-v2.svg", ld=None):
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
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@crazygolfgame">
<meta name="theme-color" content="#0f2f24">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{FONTS}
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/v2.css">{lds}
</head>
"""


def header(active=""):
    items = [("games", "/games/", "Games"), ("better", "/get-better/", "Get Better"), ("gear", "/gear/", "Gear &amp; Gifts"),
             ("club", "/clubhouse/", "Clubhouse"), ("guides", "/articles/", "Guides")]
    links = "\n      ".join(f'<a href="{h}"{" aria-current=\"page\"" if k == active else ""}>{t}</a>' for k, h, t in items)
    return f"""<body>
{GTM_BODY}
<a class="skip" href="#main">Skip to content</a>
<header class="hdr">
  <div class="wrap in">
    <a class="brand" href="/" aria-label="{BRAND} home"><img src="/images/logo-v2.svg" alt="{BRAND}" width="208" height="37"></a>
    <nav aria-label="Main">
      {links}
      <a class="cta" href="/offers/">Gift Guide 2026</a>
    </nav>
  </div>
</header>
"""


FOOTER = f"""<footer class="ftr">
  <div class="wrap">
    <div class="cols">
      <div>
        <img src="/images/logo-v2-light.svg" alt="{BRAND}" width="220" height="39">
        <p>For people who love golf and the games inside the game. An independent publication, not a golf venue.</p>
        <div class="socials"><a href="{X_URL}" rel="noopener">{X_SVG}@crazygolfgame</a><a href="{FB_URL}" rel="noopener">{FB_SVG}Facebook</a></div>
      </div>
      <div><h4>Play</h4><ul><li><a href="/games/">Games Within the Game</a></li><li><a href="/games/wolf/">Wolf</a></li><li><a href="/games/nassau/">Nassau</a></li><li><a href="/games/skins/">Skins</a></li><li><a href="/games/#crazy-golf">Crazy golf &amp; backyard</a></li></ul></div>
      <div><h4>Improve &amp; gear</h4><ul><li><a href="/get-better/">Get Better</a></li><li><a href="/get-better/putting-ladder-drill/">Putting ladder</a></li><li><a href="/gear/">Gear &amp; Gifts</a></li><li><a href="/offers/">Gift Guide 2026</a></li></ul></div>
      <div><h4>Clubhouse</h4><ul><li><a href="/clubhouse/">Talk golf</a></li><li><a href="/articles/">All guides</a></li><li><a href="/about/">About</a></li><li><a href="/contact/">Contact</a></li><li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms</a></li></ul></div>
    </div>
    <div class="legal"><span>&copy;2026 {BRAND}. Published by Marketing Apes LLC. All rights reserved.</span><span>Some pages contain labelled affiliate links (#ad).</span></div>
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
    return '<p class="crumbs2">' + " / ".join(parts) + "</p>"


def page(title, desc, path, active, body, ld=None, og="og-v2.svg"):
    return head(title, desc, path, og, ld) + header(active) + '<main id="main">\n' + body + "\n</main>\n" + FOOTER


def aff_btn(offer, place, label):
    return ov.aff(offer, place, label)


def disclosure(short=False):
    if short:
        return '<p class="aff-disclosure"><strong>#ad</strong> Links marked &ldquo;Affiliate link&rdquo; may earn us a commission at no extra cost to you. <a href="/offers/#disclosure">How this works</a>.</p>'
    return ('<div class="aff-disclosure" id="disclosure"><strong>#ad &middot; Affiliate disclosure.</strong> Some links on this page are affiliate links, each labelled '
            '&ldquo;Affiliate link&rdquo;. If you buy through one, Crazy Golf Game (Marketing Apes LLC) may earn a commission. You pay the same price. '
            'We describe categories and what to check; we have not used every product these stores sell. Partners do not see or approve what we write.</div>')


def newsletter(where):
    return f"""<div class="nl">
  <h3 style="margin-top:0;color:#fff">The Clubhouse note</h3>
  <p style="margin:.2em 0 12px;color:#d7ecdf">A short weekly email: one game to try, one drill, one gear note worth knowing.</p>
  <form data-newsletter action="#" method="post">
    <label class="sr" for="nl-{where}">Email address</label>
    <input id="nl-{where}" type="email" name="email" placeholder="you@example.org" autocomplete="email" required>
    <button class="btn" type="submit">Join the list</button>
  </form>
  <p class="msg" aria-live="polite"></p>
  <p class="small">No spam, unsubscribe any time. <span class="todo-pill" data-todo="Newsletter form is UI-only: connect a consented list (CGG GMass/ESP + consent record) before launch">TODO(Kyle): connect a consented list before launch</span></p>
</div>"""


def socials():
    return f'<div class="socials"><a href="{X_URL}" rel="noopener">{X_SVG}Follow @crazygolfgame</a><a href="{FB_URL}" rel="noopener">{FB_SVG}Crazy Golf Game on Facebook</a></div>'


def article_cards(slugs, cards):
    return "\n".join(cards[s] for s in slugs if s in cards)


def game_card(g):
    return f"""<a class="gcard" href="/games/{g['slug']}/"><div class="tags"><span>{E(g['players'].split(' (')[0])} players</span><span>{E(g['sub'])}</span></div><h3>{E(g['name'])}</h3><p>{E(g['lede'].split('. ')[0])}.</p></a>"""


def drill_card(d):
    return f"""<a class="gcard" href="/get-better/{d['slug']}/"><div class="tags"><span class="hot">{E(d['area'])}</span><span>{E(d['time'])}</span></div><h3>{E(d['name'])}</h3><p>{E(d['lede'].split('. ')[0])}.</p></a>"""


TOOLS = {
    "skins": ("Skins calculator", '<div class="row"><label>Players (comma separated) <input type="text" name="players" value="Ana, Ben, Cal, Dee"></label><label>How many <select name="count"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></label></div>', "Enter each player's score per hole. Lowest score outright wins the skin; ties carry over."),
    "nassau": ("Nassau match tracker", '<div class="row"><label>Side A <input type="text" name="a" value="Ana"></label><label>Side B <input type="text" name="b" value="Ben"></label></div>', "Pick the result of each hole. Front, back and overall update as you go."),
    "vegas": ("Vegas calculator", '<div class="row"><label>Players: team 1 first two, team 2 last two <input type="text" name="players" value="Ana, Ben, Cal, Dee" size="28"></label></div>', "Enter par and each score. Lower digit goes first; an opponent's birdie flips your number."),
    "wolf": ("Wolf rotation and points sheet", '<div class="row"><label>Players in tee order on hole 1 <input type="text" name="players" value="Ana, Ben, Cal, Dee" size="28"></label><label>Wolf hits <select name="order"><option value="first">first</option><option value="last">last</option></select></label><button type="button" class="btn btn-ghost no-print" data-print>Print sheet</button></div>', "Rotation repeats every four holes. Enter points per hole using the table on this page."),
    "snake": ("Snake tracker", '<div class="row"><label>Players <input type="text" name="players" value="Ana, Ben, Cal, Dee"></label><label>How many <select name="count"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></label><label>Stake per snake <input type="number" name="stake" value="1" min="0" step="0.5" style="width:5em"></label></div>', "Mark who three-putted on each hole (the last one if two did)."),
    "bbb": ("Bingo Bango Bongo points", '<div class="row"><label>Players <input type="text" name="players" value="Ana, Ben, Cal, Dee"></label><label>How many <select name="count"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></label></div>', "Pick who earned each point on every hole."),
}


def tool_html(kind):
    t, ctrl, note = TOOLS[kind]
    return f"""<section class="tool" data-tool="{kind}" aria-labelledby="tool-h">
  <h3 id="tool-h">{t}</h3>
  {ctrl}
  <p class="note">{note} Everything stays in your browser; nothing is saved or sent.</p>
  <div class="tbl"></div>
  <div class="out" aria-live="polite"></div>
</section>"""


def faq_html(faq):
    return '<section class="faq"><h2 id="faq">Frequently asked questions</h2>' + "".join(
        f"<details><summary>{E(q)}</summary><p>{E(a)}</p></details>" for q, a in faq) + "</section>"


# ------------------------------------------------------------------ pages
def game_page(g):
    by = {x["slug"]: x for x in GAMES}
    path = f"/games/{g['slug']}/"
    trail = [("Home", "/"), ("Games", "/games/"), (g["name"], path)]
    toc = "".join(f'<li><a href="#s{i}">{E(h)}</a></li>' for i, (h, _) in enumerate(g["sections"])) + '<li><a href="#helper">Score helper</a></li><li><a href="#faq">FAQ</a></li>'
    secs = "".join(f'<h2 id="s{i}">{E(h)}</h2>\n{b}\n' for i, (h, b) in enumerate(g["sections"]))
    rel = "".join(game_card(by[s]) for s in g["related"])
    ld = [{"@context": "https://schema.org", "@type": "Article", "headline": g["title"], "description": g["desc"],
           "image": f"{HOST}/images/game-{g['slug']}.svg", "datePublished": TODAY, "dateModified": TODAY,
           "author": {"@type": "Organization", "name": f"The {BRAND} team"}, "publisher": {"@type": "Organization", "name": BRAND},
           "mainEntityOfPage": f"{HOST}{path}"}, crumbs_ld(trail)]
    body = f"""<section class="phero"><div class="wrap">{crumbs_html(trail)}<div class="in"><div>
<span class="kick">Games within the game</span>
<h1>{E(g['name'])}</h1>
<p class="lede">{E(g['lede'])}</p>
<div class="glance"><div><b>Players</b><span>{E(g['players'])}</span></div><div><b>Length</b><span>{E(g['time'])}</span></div><div><b>Best for</b><span>{E(g['best'])}</span></div><div><b>Stakes</b><span>{E(g['stakes'])}</span></div></div>
</div><div class="badge-art"><img src="/images/game-{g['slug']}.svg" alt="{E(g['name'])} badge" width="300" height="300"></div></div></div></section>
<div class="wrap sec tight"><div class="body2"><article class="prose2">
<div class="rule warn"><p><strong>House rules vary.</strong> These are common ways to play {E(g['name'])}. Agree on the details (points, stakes, handicaps) on the first tee, before anyone hits.</p></div>
{secs}
<div class="example">{g['example']}</div>
<h2 id="helper">Score helper</h2>
{tool_html(g['tool'])}
{faq_html(g['faq'])}
<p class="note">Playing for money? Keep it friendly and legal where you live. The best stake is one nobody minds losing.</p>
</article>
<aside class="toc no-print"><h4>On this page</h4><ol>{toc}</ol><p style="margin:14px 0 0"><a class="btn btn-dark" href="/games/">All games</a></p></aside></div>
<section class="sec tight no-print"><div class="sec-head"><h2>Play next</h2></div><div class="grid3">{rel}</div></section></div>"""
    return page(g["title"], g["desc"], path, "games", body, ld, f"game-{g['slug']}.svg")


def drill_page(d):
    by = {x["slug"]: x for x in GAMES}
    path = f"/get-better/{d['slug']}/"
    trail = [("Home", "/"), ("Get Better", "/get-better/"), (d["name"], path)]
    toc = "".join(f'<li><a href="#s{i}">{E(h)}</a></li>' for i, (h, _) in enumerate(d["sections"])) + '<li><a href="#faq">FAQ</a></li>'
    secs = "".join(f'<h2 id="s{i}">{E(h)}</h2>\n{b}\n' for i, (h, b) in enumerate(d["sections"]))
    others = "".join(drill_card(x) for x in DRILLS if x["slug"] != d["slug"])
    games = "".join(game_card(by[s]) for s in d["related_games"])
    ld = [{"@context": "https://schema.org", "@type": "Article", "headline": d["title"], "description": d["desc"],
           "image": f"{HOST}/images/drill-{d['slug']}.svg", "datePublished": TODAY, "dateModified": TODAY,
           "author": {"@type": "Organization", "name": f"The {BRAND} team"}, "publisher": {"@type": "Organization", "name": BRAND},
           "mainEntityOfPage": f"{HOST}{path}"}, crumbs_ld(trail)]
    body = f"""<section class="phero"><div class="wrap">{crumbs_html(trail)}<div class="in"><div>
<span class="kick">Get better &middot; {E(d['area'])}</span>
<h1>{E(d['name'])}</h1>
<p class="lede">{E(d['lede'])}</p>
<div class="glance"><div><b>Skill</b><span>{E(d['area'])}</span></div><div><b>Time</b><span>{E(d['time'])}</span></div><div><b>You need</b><span>{E(d['need'])}</span></div><div><b>Level</b><span>{E(d['level'])}</span></div></div>
</div><div class="badge-art"><img src="/images/drill-{d['slug']}.svg" alt="{E(d['name'])} badge" width="300" height="300"></div></div></div></section>
<div class="wrap sec tight"><div class="body2"><article class="prose2">
{secs}
{faq_html(d['faq'])}
<p class="note">General practice ideas for recreational golfers, not personal coaching. If something hurts, stop and see a qualified professional.</p>
</article>
<aside class="toc"><h4>On this page</h4><ol>{toc}</ol><p style="margin:14px 0 0"><a class="btn btn-dark" href="/practice-session-planner/">Plan a session</a></p></aside></div>
<section class="sec tight"><div class="sec-head"><h2>More drills</h2></div><div class="grid3">{others}</div></section>
<section class="sec tight"><div class="sec-head"><h2>Put it under pressure</h2><p>Games that test the same skill on the course.</p></div><div class="grid3">{games}</div></section></div>"""
    return page(d["title"], d["desc"], path, "better", body, ld, f"drill-{d['slug']}.svg")


def pillar_hero(kick, h1, lede, trail, img):
    return f"""<section class="phero"><div class="wrap">{crumbs_html(trail)}<div class="in"><div>
<span class="kick">{kick}</span><h1>{h1}</h1><p class="lede">{lede}</p></div>
<div class="badge-art"><img src="/images/{img}" alt="" width="300" height="300"></div></div></div></section>"""


def games_pillar(cards):
    trail = [("Home", "/"), ("Games", "/games/")]
    more = "".join(f'<div class="gcard"><h3>{E(n)}</h3><p>{E(t)}</p></div>' for n, t in MORE_GAMES)
    gen = """<section class="generator" id="hole-generator" aria-labelledby="gen-h"><div class="gen-card"><div class="gen-copy">
<h3 id="gen-h">The Crazy Hole Generator</h3>
<p>Pick where you're playing and spin for a random obstacle, a silly twist and a par. Build it, play it, spin again.</p>
<label for="gen-where">Where are you playing?</label>
<select id="gen-where"><option value="yard">Backyard or park</option><option value="home">Living room or hallway</option><option value="course">At a mini golf course (twists only)</option></select>
<button type="button" class="btn" id="gen-spin">Spin a hole</button></div>
<div class="gen-out" aria-live="polite"><div class="gen-ball" aria-hidden="true"></div><p class="gen-num">Hole <span id="gen-hole">1</span></p>
<dl><dt>Obstacle</dt><dd id="gen-obstacle">Press spin to build your first hole.</dd><dt>Twist</dt><dd id="gen-twist">&mdash;</dd><dt>Par</dt><dd id="gen-par">&mdash;</dd></dl></div></div></section>"""
    body = pillar_hero("Pillar one", "Games Within the Game",
        "Golf has always had games inside it. Saturday foursomes play Wolf, regulars run a Nassau, and every group has someone who swears they never three-putt until Snake is on. Here are the rules, the scoring and a score helper for each, plus our favourite backyard and crazy golf games.", trail, "game-wolf.svg") + f"""
<div class="wrap">
<section class="sec tight"><div class="sec-head"><div><span class="kick">On the course</span><h2>Side games, explained properly</h2><p>Each page covers the rules, scoring, a worked example, common house rules and a free score helper.</p></div></div>
<div class="grid3">{"".join(game_card(g) for g in GAMES)}</div></section>
<section class="sec tight"><div class="prose2" style="max-width:none">
<h2>Pick a game for your group</h2>
<table><thead><tr><th>Your group</th><th>Try</th><th>Why</th></tr></thead><tbody>
<tr><td>Two players</td><td><a href="/games/nassau/">Nassau</a> + <a href="/games/snake/">Snake</a></td><td>Three bets keep a match alive; Snake adds pressure on the greens.</td></tr>
<tr><td>Three players</td><td><a href="/games/skins/">Skins</a> or <a href="/games/bingo-bango-bongo/">Bingo Bango Bongo</a></td><td>Every-player-for-themselves games that work with odd numbers.</td></tr>
<tr><td>Four players, similar ability</td><td><a href="/games/wolf/">Wolf</a> or <a href="/games/vegas/">Vegas</a></td><td>Changing partners (Wolf) or big team swings (Vegas).</td></tr>
<tr><td>Four players, mixed ability</td><td><a href="/games/bingo-bango-bongo/">Bingo Bango Bongo</a> or net <a href="/games/skins/">Skins</a></td><td>Points that don't depend on total score, or handicaps on the hardest holes.</td></tr>
<tr><td>Big group or society day</td><td>Scramble variants, Stableford</td><td>Fast, forgiving formats where everyone finishes.</td></tr>
</tbody></table>
<div class="rule"><p><strong>The one rule that matters:</strong> agree on the game, the points and any stakes on the first tee. Every golf argument we've ever heard started with "I thought we said&hellip;"</p></div>
</div></section>
<section class="sec tight"><div class="sec-head"><div><span class="kick">More formats</span><h2>Other games worth knowing</h2></div></div><div class="grid2">{more}</div></section>
<section class="sec tight" id="crazy-golf"><div class="sec-head"><div><span class="kick">Off the course</span><h2>Crazy golf, backyard and indoor games</h2><p>Where the name comes from: mini golf, putting games and courses you build yourself.</p></div><a href="/articles/">All guides &rarr;</a></div>
<div class="grid">{article_cards(ART_PILLAR['games'], cards)}</div>
{gen}
</section></div>"""
    ld = [crumbs_ld(trail), {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Games Within the Game", "url": f"{HOST}/games/"}]
    return page("Golf Side Games: Rules for Wolf, Nassau, Skins, Vegas and More",
                "Rules, scoring and free score helpers for golf side games: Wolf, Nassau, Skins, Bingo Bango Bongo, Vegas and Snake, plus Rabbit, Hammer, scrambles and backyard crazy golf games.",
                "/games/", "games", body, ld, "game-wolf.svg")


def better_pillar(cards):
    trail = [("Home", "/"), ("Get Better", "/get-better/")]
    body = pillar_hero("Pillar two", "Get Better (and enjoy it)",
        "Practice doesn't have to be a bucket of balls on autopilot. Each drill here has a clear target, a way to score it, and a game version you can play with a friend. Pick the part of your game that costs you the most shots and start there.", trail, "drill-putting-ladder-drill.svg") + f"""
<div class="wrap">
<section class="sec tight"><div class="sec-head"><div><span class="kick">Drills with a scorecard</span><h2>Start with one of these</h2></div><a href="/practice-session-planner/">Plan a practice session &rarr;</a></div>
<div class="grid3">{"".join(drill_card(d) for d in DRILLS)}</div></section>
<section class="sec tight"><div class="prose2" style="max-width:none">
<h2 id="putting">Putting</h2>
<p>For most club golfers, the fastest way to lower scores is fewer three-putts. That's mostly distance control on long putts plus confidence inside four feet. Start with the <a href="/get-better/putting-ladder-drill/">Putting Ladder</a>, then read <a href="/articles/mini-golf-putting-tips/">reading banks and slopes</a> and the ten <a href="/articles/putting-practice-games/">putting practice games</a>.</p>
<h2 id="short-game">Short game</h2>
<p>Pick a landing spot, choose the club that rolls the ball the rest of the way, and keep the ball low when you can. The <a href="/get-better/landing-spot-ladder/">Landing Spot Ladder</a> and its Par 18 game teach exactly that.</p>
<h2 id="driving">Driving</h2>
<p>Fairways beat distance for most players. The <a href="/get-better/fairway-corridor/">Fairway Corridor</a> turns range time into 14 real tee shots and shows you your typical miss.</p>
<h2 id="course-management">Course management</h2>
<p>The cheapest strokes to save are the ones you give away with decisions. A few habits that help almost everyone:</p>
<ul class="checklist">
<li><strong>Aim at the middle of the green</strong> unless you have a short iron and a safe miss. Pins near edges are traps.</li>
<li><strong>Play to your miss.</strong> If your shots usually curve right, aim left of centre and let your shape bring it back.</li>
<li><strong>Take the penalty when you're in trouble.</strong> A sideways chip back to the fairway beats a hero shot through trees.</li>
<li><strong>Club up when in doubt.</strong> Most amateurs come up short of the green far more often than long.</li>
<li><strong>Know when to lay up.</strong> Leave yourself a full-swing yardage you like, not an awkward half wedge.</li>
</ul>
<h2 id="fun">Skills that are just fun</h2>
<p>Trick shots won't lower your handicap, but they will make you better with your hands. Start with the <a href="/articles/beginner-trick-shots/">beginner trick shots</a>.</p>
</div></section>
<section class="sec tight"><div class="sec-head"><h2>Guides for this pillar</h2></div><div class="grid">{article_cards(ART_PILLAR['better'], cards)}</div></section>
<p class="note">General practice ideas for recreational golfers, not personal coaching.</p></div>"""
    return page("Golf Practice Drills and Games: Putting, Chipping, Driving",
                "Golf practice drills that feel like games: a putting ladder for distance control, a landing-spot chipping ladder with Par 18, a driving range fairway corridor, and course management habits.",
                "/get-better/", "better", body, [crumbs_ld(trail)], "drill-putting-ladder-drill.svg")


def pick(icon, title, text, offer, place, label, who):
    return f"""<div class="pick"><img class="ico" src="/images/icon-{icon}.svg" alt="" width="72" height="72"><div>
<h3>{title}</h3><p>{text}</p><p class="small"><strong>Good for:</strong> {who}</p><p class="aff-cta">{aff_btn(offer, place, label)}</p></div></div>"""


def gear_pillar(cards):
    trail = [("Home", "/"), ("Gear & Gifts", "/gear/")]
    body = pillar_hero("Pillar three", "Gear &amp; Gifts, honestly",
        "Most golfers own more gear than they use. We'd rather help you buy one thing you'll use every week than ten things for the garage. Here is what we'd look at by category, the stores we link to, and what you can safely skip.", trail, "game-skins.svg") + f"""
<div class="wrap">
<section class="sec tight">{disclosure()}</section>
<section class="sec tight"><div class="sec-head"><div><span class="kick">Picks by category</span><h2>Worth the money if you'll use it</h2></div><a class="btn" href="/offers/">Gift Guide 2026 &rarr;</a></div>
<div class="grid2">
{pick("mat", "Putting mat or home green", "The most-used piece of practice gear for most golfers. Check length (longer allows lag practice), surface speed and whether you want a ball return. Measure your space first.", "indoor-golf-shop", "gear-pillar-mats", "Compare putting mats", "Anyone who wants to stop three-putting")}
{pick("sim", "Launch monitor or home simulator", "A big purchase that only makes sense with the space and the habit to use it. Check ceiling height and room depth against the maker's requirements, and whether full features need a subscription.", "indoor-golf-shop", "gear-pillar-sim", "Browse simulators and launch monitors", "Regular golfers with a garage or spare room")}
{pick("ball", "Golf balls", "For casual golf, bright or matte coloured balls are easier to find. For your main game, pick one model and stick with it so every short-game shot reacts the same way.", "vice-golf", "gear-pillar-balls", "See Vice Golf balls", "Everyone; personalised sleeves make good gifts")}
{pick("yard", "Backyard and kids' sets", "Portable cups, flags and kids' clubs turn a lawn into a course. Look for an age range on the box and parts that pack away.", "best-choice-products", "gear-pillar-yard", "Browse backyard game sets", "Families and party hosts")}
</div></section>
<section class="sec tight"><div class="prose2" style="max-width:none">
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
<section class="sec tight"><div class="sec-head"><h2>Gear guides</h2></div><div class="grid">{article_cards(ART_PILLAR['gear'], cards)}</div></section></div>"""
    return page("Golf Gear and Gift Picks: Putting Mats, Simulators, Balls and Backyard Sets",
                "Honest golf gear picks by category: putting mats, launch monitors and home simulators, golf balls and backyard sets, what to skip, and our Crazy Golf Gift Guide 2026.",
                "/gear/", "gear", body, [crumbs_ld(trail)], "game-skins.svg")


def clubhouse():
    trail = [("Home", "/"), ("Clubhouse", "/clubhouse/")]
    subj = "My%20group%27s%20game"
    body = pillar_hero("Pillar four", "The Clubhouse",
        "Golf is a social game. The best part of a round is often the walk between shots and the argument afterwards about whose ball was closer. The Clubhouse is where we talk golf with you: your group's games, your questions, and what's going on in the game.", trail, "icon-club.svg") + f"""
<div class="wrap">
<section class="sec tight"><div class="join light"><div>
<span class="kick">Join in</span><h2>Follow along</h2>
<p>We share a game, a drill or a question most weeks on X and Facebook. Reply, argue, and tell us how your group plays it.</p>
{socials()}
</div><div style="background:var(--ink);border-radius:22px;padding:6px">{newsletter("club")}</div></div></section>
<section class="sec tight"><div class="sec-head"><div><span class="kick">Post your game</span><h2>Does your group play something we haven't covered?</h2></div></div>
<div class="grid2">
<div class="prompt"><h3>Send us your house rules</h3><p>Every group has a twist: a special Wolf points table, a rule for the 19th hole, a name for the shot that hits the cart path. Tell us the game, how you score it and how many play. We read everything and may write it up (we'll ask before using your name).</p>
<p><a class="btn" href="mailto:{EMAIL}?subject={subj}">Email your game</a> <a class="btn btn-ghost" href="{X_URL}" rel="noopener">Post it and tag @crazygolfgame</a></p></div>
<div class="prompt"><h3>Talk golf: questions for this week</h3>
<p><q>What's the one side game your group always comes back to, and why?</q></p>
<p><q>Wolf: should the Wolf hit first or last?</q></p>
<p><q>What's the best piece of practice gear you actually use every week?</q></p>
<p class="small">Answer on <a href="{X_URL}" rel="noopener">X</a> or <a href="{FB_URL}" rel="noopener">Facebook</a>.</p></div>
</div></section>
<section class="sec tight"><div class="prose2" style="max-width:none">
<h2>Clubhouse rules</h2>
<ul class="checklist"><li>Be kind. Every golfer was a beginner once.</li><li>Keep bets friendly and legal where you live.</li><li>No spam or selling in replies.</li><li>Corrections welcome: if we got a rule wrong, <a href="/contact/">tell us</a>.</li></ul>
<h2>New here? Start with</h2>
<p>The <a href="/games/">Games Within the Game</a> pillar if you want a better Saturday, <a href="/get-better/">Get Better</a> if you want lower scores, and the <a href="/offers/">Gift Guide 2026</a> if someone in your life is impossible to buy for.</p>
</div></section></div>"""
    return page("The Clubhouse: Talk Golf With Crazy Golf Game",
                "Join the Crazy Golf Game clubhouse: follow @crazygolfgame on X and our Facebook page, share your group's side games and house rules, and answer this week's golf questions.",
                "/clubhouse/", "club", body, [crumbs_ld(trail)], "og-v2.svg")


def home(cards):
    wolf = next(g for g in GAMES if g["slug"] == "wolf")
    ladder = DRILLS[0]
    pillars = "".join(f"""<a class="pcard" href="{u}"><img class="ico" src="/images/icon-{k}.svg" alt="" width="52" height="52"><h3>{t}</h3><p>{d}</p><span class="go">Explore &rarr;</span></a>""" for k, u, t, d in PILLARS)
    latest = article_cards(["mini-golf-party-games", "backyard-mini-golf-course", "putting-practice-games"], cards)
    ld = [{"@context": "https://schema.org", "@type": "WebSite", "name": BRAND, "url": f"{HOST}/"},
          {"@context": "https://schema.org", "@type": "Organization", "name": BRAND, "url": f"{HOST}/", "logo": f"{HOST}/images/logo-v2.svg", "sameAs": [X_URL, FB_URL]}]
    body = f"""<section class="hero2"><div class="wrap in"><div>
<span class="kick">Golf, played for fun</span>
<h1>Golf is better with a <em>game on</em>.</h1>
<p class="lede">Crazy Golf Game is for people who love golf and the games inside the game: Wolf on Saturday, skins with the regulars, a putting ladder before work, a backyard nine with the kids. Rules you can settle an argument with, drills that make practice fun, honest gear talk, and a clubhouse to swap stories.</p>
<div class="btns"><a class="btn" href="/games/">Find a game for Saturday</a><a class="btn btn-ghost" href="/get-better/">Get better this week</a></div>
<div class="chips"><span>Rules for 14 formats</span><span>Free score helpers</span><span>Drills by skill</span><span>Since 2010 on X</span></div>
</div><div class="art"><img src="/images/hero-v2.svg" alt="Illustrated golf hole at golden hour with a flag, a ball on the fringe and a scorecard of side games" width="640" height="520"></div></div></section>

<section class="sec"><div class="wrap">
<div class="sec-head"><div><span class="kick">Four ways in</span><h2>What you'll find here</h2></div></div>
<div class="pillars">{pillars}</div></div></section>

<section class="sec alt"><div class="wrap">
<div class="feature"><div class="fart"><img src="/images/game-wolf.svg" alt="Wolf game badge" width="320" height="320"></div><div class="fbody">
<span class="kick">Game of the week</span><h2>Wolf: pick a partner, or go it alone</h2>
<p>{E(wolf['lede'])}</p>
<ol class="mini-steps"><li>Rotate who's the Wolf every hole.</li><li>The Wolf picks a partner straight after that player's drive, or passes.</li><li>Go Lone Wolf for bigger points. Win and you're a hero; lose and everyone else scores.</li></ol>
<p><a class="btn" href="/games/wolf/">Full rules + printable sheet</a></p></div></div>
</div></section>

<section class="sec"><div class="wrap grid2">
<div class="feature" style="grid-template-columns:1fr"><div class="fbody">
<span class="kick">Drill of the week &middot; Putting</span><h2>{E(ladder['name'])}</h2>
<p>{E(ladder['lede'])}</p>
<p class="small"><strong>Time:</strong> {E(ladder['time'])} &middot; <strong>You need:</strong> {E(ladder['need'])}</p>
<p><a class="btn btn-dark" href="/get-better/putting-ladder-drill/">Try the drill</a></p></div></div>
<div class="feature" style="grid-template-columns:1fr"><div class="fbody">
<span class="kick">Gear pick</span><h2>A putting mat you'll actually use</h2>
<p>If you only buy one piece of practice gear this winter, make it a putting mat long enough for the ladder drill. Check the length against your hallway, then decide whether you want a ball return.</p>
<p class="aff-cta">{aff_btn("indoor-golf-shop", "home-gear-pick", "Compare putting mats")}</p>
{disclosure(short=True)}
<p><a href="/gear/">All gear picks</a> &middot; <a href="/offers/">Gift Guide 2026</a></p></div></div>
</div></section>

<section class="sec alt"><div class="wrap">
<div class="sec-head"><div><span class="kick">Where the name comes from</span><h2>Crazy golf, backyard courses and party games</h2><p>Mini golf is where a lot of us fell for the game. Build a backyard nine, run a living-room tournament, or spin a random hole with the <a href="/games/#hole-generator">Crazy Hole Generator</a>.</p></div><a href="/articles/">All guides &rarr;</a></div>
<div class="grid">{latest}</div></div></section>

<section class="sec dark"><div class="wrap join"><div>
<span class="kick" style="color:var(--lime)">The Clubhouse</span><h2>Talk golf with us</h2>
<p>Tell us the game your group plays, ask a rules question, or argue about whether the Wolf should hit first. We're on X as @crazygolfgame and on Facebook.</p>
{socials()}
<p style="margin-top:16px"><a class="btn" href="/clubhouse/">Visit the Clubhouse</a></p>
</div>{newsletter("home")}</div></section>"""
    return page(f"Golf Side Games, Drills and Gear for Golf Lovers",
                "Crazy Golf Game is for people who love golf and the games inside the game: rules and score helpers for Wolf, Nassau and Skins, practice drills that feel like games, honest gear picks and a golf clubhouse.",
                "/", "", body, ld, "og-v2.svg")


def articles_index(cards):
    groups = [("Games Within the Game", "/games/", ART_PILLAR["games"]), ("Get Better", "/get-better/", ART_PILLAR["better"]), ("Gear &amp; Gifts", "/gear/", ART_PILLAR["gear"])]
    secs = "".join(f'<section class="sec tight"><div class="sec-head"><h2>{t}</h2><a href="{u}">Go to pillar &rarr;</a></div><div class="grid">{article_cards(s, cards)}</div></section>' for t, u, s in groups)
    new = '<section class="sec tight"><div class="sec-head"><h2>Side-game rules and drills</h2></div><div class="grid3">' + "".join(game_card(g) for g in GAMES) + "".join(drill_card(d) for d in DRILLS) + "</div></section>"
    trail = [("Home", "/"), ("Guides", "/articles/")]
    body = pillar_hero("Library", "All guides", f"Every Crazy Golf Game guide, sorted by pillar: {len(cards)} guides on mini golf and backyard games, putting and practice, and gear, plus our side-game rules and drills.", trail, "icon-games.svg") + f'<div class="wrap">{new}{secs}</div>'
    return page("All Guides", "Every Crazy Golf Game guide in one place, sorted into games, practice and gear: side-game rules, drills, backyard and indoor mini golf, putting tips and more.", "/articles/", "guides", body, [crumbs_ld(trail)])


# ------------------------------------------------------------------ re-chrome existing pages
def rechrome(doc, active=""):
    doc = doc.replace(OLD_FONTS, FONTS)
    if "/assets/v2.css" not in doc:
        doc = doc.replace('<link rel="stylesheet" href="/assets/site.css">', '<link rel="stylesheet" href="/assets/site.css">\n<link rel="stylesheet" href="/assets/v2.css">')
    hdr = header(active)
    hdr_block = hdr[hdr.index('<header class="hdr">'):]
    doc = re.sub(r'<header class="(?:site-header|hdr)">.*?</header>\n?', hdr_block, doc, count=1, flags=re.S)
    foot = FOOTER[:FOOTER.index("</footer>") + len("</footer>")]
    doc = re.sub(r'<footer class="(?:site-footer|ftr)">.*?</footer>', foot, doc, count=1, flags=re.S)
    if "/assets/games.js" not in doc and "/assets/site.js" in doc:
        doc = doc.replace('<script src="/assets/site.js" defer></script>', '<script src="/assets/site.js" defer></script>\n<script src="/assets/games.js" defer></script>')
    return doc


def main():
    img = SITE / "images"
    (img / "logo-v2.svg").write_text(art.logo())
    (img / "logo-v2-light.svg").write_text(art.logo(light=True))
    (img / "hero-v2.svg").write_text(art.hero())
    (img / "og-v2.svg").write_text(art.hero())
    for k in ["games", "better", "gear", "club", "mat", "ball", "yard", "sim"]:
        (img / f"icon-{k}.svg").write_text(art.icon(k))
    for g in GAMES:
        (img / f"game-{g['slug']}.svg").write_text(art.badge(g["name"], g["sub"], g["color"], g["glyph"]))
    for d in DRILLS:
        (img / f"drill-{d['slug']}.svg").write_text(art.badge(d["name"], d["area"] + " drill", d["color"], d["glyph"]))
    shutil.copy(HERE / "v2.css", SITE / "assets" / "v2.css")
    shutil.copy(HERE / "games.js", SITE / "assets" / "games.js")
    css = (SITE / "assets" / "v2.css").read_text()
    if ".sr{" not in css:
        (SITE / "assets" / "v2.css").write_text(css + "\n.sr{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}\n")

    # card snippets from the existing generated articles index (v1 markup) or cache
    cache = HERE / "_cards.json"
    idx = (SITE / "articles" / "index.html").read_text()
    found = {m.group(1): m.group(0) for m in re.finditer(r'<a class="card" href="/articles/([^/]+)/">.*?</a>', idx, re.S)}
    if len(found) >= 13:
        cache.write_text(json.dumps(found, indent=0))
    cards = json.loads(cache.read_text())

    def put(rel, content):
        p = SITE / rel; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(content)

    # re-chrome existing pages first (so new pages are not touched twice)
    active_for = lambda rel: ("guides" if rel.startswith("articles/") else "about" if rel.startswith("about") else "")
    for p in SITE.rglob("*.html"):
        rel = p.relative_to(SITE).as_posix()
        if rel.startswith(("preview/", "practice-session-planner/")) or rel == "contact.html":
            continue
        d = p.read_text()
        if '<header class="site-header">' in d or '<header class="hdr">' in d:
            p.write_text(rechrome(d, active_for(rel)))

    put("index.html", home(cards))
    put("articles/index.html", articles_index(cards))
    put("games/index.html", games_pillar(cards))
    put("get-better/index.html", better_pillar(cards))
    put("gear/index.html", gear_pillar(cards))
    put("clubhouse/index.html", clubhouse())
    for g in GAMES:
        put(f"games/{g['slug']}/index.html", game_page(g))
    for d in DRILLS:
        put(f"get-better/{d['slug']}/index.html", drill_page(d))

    # sitemap
    sm = (SITE / "sitemap.xml").read_text()
    new_urls = ["/games/", "/get-better/", "/gear/", "/clubhouse/"] + [f"/games/{g['slug']}/" for g in GAMES] + [f"/get-better/{d['slug']}/" for d in DRILLS]
    add = "".join(f"  <url><loc>{HOST}{u}</loc><lastmod>{TODAY}</lastmod></url>\n" for u in new_urls if f"<loc>{HOST}{u}</loc>" not in sm)
    for u in ["/", "/articles/"]:
        sm = re.sub(rf"(<loc>{re.escape(HOST + u)}</loc><lastmod>)[^<]+", rf"\g<1>{TODAY}", sm)
    sm = sm.replace("</urlset>", add + "</urlset>")
    (SITE / "sitemap.xml").write_text(sm)
    print("v2 built:", len(new_urls), "new URLs")


if __name__ == "__main__":
    main()
