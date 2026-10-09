#!/usr/bin/env python3
"""CGG v4 rebrand ("Scratch & Fire", draft 2026-10-09). Local draft only.

Layers on top of v3/build_v3.py: same content, IA, score helpers and photo credits pipeline, new brand system.
- Wordmark: CRAZY knocked out of a flag-orange slanted badge + GOLF GAME in heavy condensed italic (outlined SVG).
- Type: Archivo only (self-hosted variable woff2, width 62-100, weight 400-900).
- Colour: ink + turf + chalk, flag orange (#FF4B1F) heat, volt (#D7FF3A) for tiny highlights.
- Layout: angled hero/section cuts, tilted photo cards with offset shadows, ticker band, bets wall.
- Voice: cheeky, golfer-to-golfer, never mean, never invented facts.
Runs from build.py after affiliate_overlay. Idempotent.
"""
import html, importlib.util, json, pathlib, re, shutil, sys
HERE = pathlib.Path(__file__).resolve().parent
V3DIR = HERE.parent / "v3"
_spec = importlib.util.spec_from_file_location("build_v3", V3DIR / "build_v3.py")
b = importlib.util.module_from_spec(_spec); sys.modules["build_v3"] = b; _spec.loader.exec_module(b)
from content_games import GAMES, MORE_GAMES  # noqa: E402  (path set by build_v3)
from content_drills import DRILLS  # noqa: E402
import affiliate_overlay as ov  # noqa: E402

E = b.E; HOST = b.HOST; BRAND = b.BRAND; X_URL = b.X_URL; FB_URL = b.FB_URL
SITE = b.SITE

# ------------------------------------------------------------------ photos: v3 library + v4 action shots
V4_CREDITS = json.loads((HERE / "photos" / "credits.json").read_text())
b.CREDITS.update(V4_CREDITS)
b.ARTIST_FIX.update({"bunker-blast": "22563 (Pixabay)"})
b.ART_PHOTO.update({"mini-golf-date-night": "mini-night", "beginner-trick-shots": "ball-and-bucket"})
b.GAME_PHOTO.update({"wolf": "swing-fairway", "vegas": "range-night-targets"})
b.DRILL_PHOTO.update({"fairway-corridor": "range-tiers-night"})
b.PILLARS[:] = [
    ("games", "/games/", "Games Within the Game", "Wolf, Nassau, Skins, Vegas, Snake. Proper rules, honest scoring and a card that does the maths so nobody has to.", "bunker-blast"),
    ("better", "/get-better/", "Get Better", "Drills with a score, so practice stops feeling like homework and starts feeling like a grudge match.", "ball-pyramid"),
    ("gear", "/gear/", "Gear &amp; Gifts", "What's worth buying, what's a future garage ornament, and a Gift Guide for the golfer who has everything.", "clubs-in-bag"),
    ("club", "/clubhouse/", "The Clubhouse", "Your group's house rules, this week's arguments, and where to find us on X and Facebook.", "range-tiers-night"),
]
DEFAULT_OG = "og/swing-sunset.jpg"

# ------------------------------------------------------------------ chrome
b.FONT_PRELOAD = ('<link rel="preload" href="/assets/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>\n'
                  '<link rel="preload" href="/assets/fonts/archivo-italic-latin.woff2" as="font" type="font/woff2" crossorigin>')
b.ICONS = ('<link rel="icon" href="/images/brand/favicon-v4.svg" type="image/svg+xml">\n<link rel="icon" href="/images/brand/favicon-32.png" sizes="32x32" type="image/png">\n'
           '<link rel="apple-touch-icon" href="/images/brand/apple-touch-icon.png">')
_v3_head = b.head


def head(title, desc, path, og=DEFAULT_OG, ld=None):
    if og == "og/green-aerial-bunkers.jpg":
        og = DEFAULT_OG
    return _v3_head(title, desc, path, og, ld).replace("/assets/v3.css", "/assets/v4.css").replace('content="#132820"', 'content="#0D1410"')


b.head = head

TICKER = ["Golf is a serious game. This is not a serious website.", '<a href="/games/wolf/">Lone Wolf is a lifestyle</a>',
          "Three-putt? That's the Snake. Pay up.", '<a href="/offers/">Gift Guide 2026</a>', "Rules good enough to end the car-park argument",
          "Skins carry over. Grudges carry further.", '<a href="/get-better/">Practice, but with a scoreboard</a>', '<a href="' + X_URL + '" rel="noopener">@crazygolfgame</a>']


def header(active=""):
    links = "\n      ".join(f'<a href="{h}"{" aria-current=\"page\"" if k == active else ""}>{t}</a>' for k, h, t in b.NAV)
    items = "".join(f"<span>{t}</span>" for t in TICKER)
    return f"""<body>
{b.GTM_BODY}
<a class="skip" href="#main">Skip to content</a>
<div class="util"><div class="tick">{items}<span aria-hidden="true">{'</span><span aria-hidden="true">'.join(re.sub(r'<a [^>]*>|</a>', '', t) for t in TICKER)}</span></div></div>
<header class="hdr">
  <div class="wrap in">
    <a class="brand" href="/" aria-label="{BRAND} home"><img src="/images/brand/logo-v4-light.svg" alt="{BRAND}" width="268" height="33"></a>
    <nav aria-label="Main">
      {links}
      <a class="cta" href="/offers/">Gift Guide</a>
    </nav>
  </div>
</header>
"""


b.header = header

b.FOOTER = f"""<footer class="ftr">
  <div class="wrap">
    <div class="cols">
      <div class="brandcol">
        <img src="/images/brand/logo-v4-stacked-light.svg" alt="{BRAND}" width="210" height="78">
        <div class="quip">Golf, with the volume up.</div>
        <div>For people who love golf and the games inside it. An independent publication, not a golf venue.</div>
        <div class="socials"><a href="{X_URL}" rel="noopener">{b.X_SVG}@crazygolfgame</a><a href="{FB_URL}" rel="noopener">{b.FB_SVG}Facebook</a></div>
      </div>
      <div><h4>Play</h4><ul><li><a href="/games/">Games Within the Game</a></li><li><a href="/games/wolf/">Wolf</a></li><li><a href="/games/nassau/">Nassau</a></li><li><a href="/games/skins/">Skins</a></li><li><a href="/games/#crazy-golf">Crazy golf &amp; backyard</a></li></ul></div>
      <div><h4>Improve &amp; gear</h4><ul><li><a href="/get-better/">Get Better</a></li><li><a href="/get-better/putting-ladder-drill/">Putting ladder</a></li><li><a href="/practice-session-planner/">Practice planner</a></li><li><a href="/gear/">Gear &amp; Gifts</a></li><li><a href="/offers/">Gift Guide 2026</a></li></ul></div>
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


def newsletter(where):
    return f"""<div class="nl">
  <h3>The Weekly Slice</h3>
  <p>One short email a week: a game to try on Saturday, a drill worth ten minutes, one gear note. Shorter than your pre-shot routine.</p>
  <form data-newsletter action="#" method="post">
    <label class="sr" for="nl-{where}">Email address</label>
    <input id="nl-{where}" type="email" name="email" placeholder="Your email address" autocomplete="email" required>
    <button class="btn" type="submit">I'm in</button>
  </form>
  <p class="msg" aria-live="polite"></p>
  <p class="small">No spam. Unsubscribe any time, no hard feelings.<br><span class="todo-pill" data-todo="Newsletter form is UI-only: connect a consented list (CGG GMass/ESP + consent record) before launch">TODO(Kyle): connect a consented list before launch</span></p>
</div>"""


b.newsletter = newsletter

# pillar heroes: same structure, louder copy
HERO_COPY = {
    "Games Within the Game": ("Pillar 01 &middot; Games", "Games within <em>the game</em>",
        "Golf has always had games hiding inside it. The Saturday four plays Wolf, the regulars run a Nassau, and every group has someone who swears they never three-putt until Snake is on. Here are the rules, the scoring and a scorecard for each, plus the crazy golf and backyard games where a lot of us started.", "bunker-blast"),
    "Get Better (and enjoy it)": ("Pillar 02 &middot; Get better", "Get better <em>(and enjoy it)</em>",
        "Practice doesn't have to be a bucket of balls on autopilot. Every drill here has a target, a score to beat and a game version you can play against the friend who talks too much. Start with whatever is costing you the most shots.", "ball-pyramid"),
    "Gear &amp; Gifts, honestly": ("Pillar 03 &middot; Gear", "Gear &amp; gifts, <em>no infomercial</em>",
        "Most golfers own more gear than they use. We'd rather help you buy one thing you'll use every week than ten things for the garage. Here's what we'd look at by category, the stores we link to, and what you can safely skip.", "range-buckets"),
    "The Clubhouse": ("Pillar 04 &middot; Clubhouse", "The <em>Clubhouse</em>",
        "The best part of a round is the walk between shots and the argument afterwards about whose ball was closer. The Clubhouse keeps that going: your group's games, your questions, and the rulings nobody asked for.", "range-tiers-night"),
    "All guides": ("The library", "All the <em>guides</em>", None, "mini-night"),
}
_v3_pillar_hero = b.pillar_hero


def pillar_hero(kick, h1, lede, trail, key):
    if h1 in HERO_COPY:
        k2, h2, l2, key2 = HERO_COPY[h1]
        return _v3_pillar_hero(k2, h2, l2 or lede, trail, key2)
    return _v3_pillar_hero(kick, h1, lede, trail, key)


b.pillar_hero = pillar_hero

_v3_tool = b.tool_html
b.tool_html = lambda kind: _v3_tool(kind).replace("<span>Crazy Golf Game &middot; Scorecard</span>", "<span>Official-ish scorecard</span>")

COPY = [
    ('<span class="kick">Games within the game</span>', '<span class="kick">Side game &middot; bring a pencil</span>'),
    ("<h2>Side games, explained properly</h2>", "<h2>Side games, <em>explained properly</em></h2>"),
    ("<h2>Pick a game for your group</h2>", "<h2>Pick your <em>poison</em></h2>"),
    ('<span class="kick">More formats</span><h2>Other games worth knowing</h2>', '<span class="kick">More formats</span><h2>More ways to <em>raise the stakes</em></h2>'),
    ('<span class="kick">Off the course</span>', '<span class="kick">Off the course &middot; where the name comes from</span>'),
    ("<h2>Start with one of these</h2>", "<h2>Pick a drill. <em>Keep score.</em></h2>"),
    ("<h2>Worth the money if you'll use it</h2>", "<h2>Worth it <em>if you'll use it</em></h2>"),
    ("<h2>What you can skip</h2>", "<h2>What you can <em>skip</em></h2>"),
    ('<h2 id="faq">Questions people ask</h2>', '<h2 id="faq">Questions people <em>actually</em> ask</h2>'),
    ("<h2>Play next</h2>", "<h2>Play this <em>next</em></h2>"),
    ("<h2>Put it under pressure</h2>", "<h2>Now put it <em>under pressure</em></h2>"),
    ("<h2>More drills</h2>", "<h2>More <em>drills</em></h2>"),
    ('<span class="kick">Join in</span><h2>Follow along</h2>', '<span class="kick">Join in</span><h2>Come argue <em>with us</em></h2>'),
    ("<h3>Talk golf: this week's questions</h3>", "<h3>This week's arguments</h3>"),
    ("<h2>Clubhouse rules</h2>", "<h2>Clubhouse <em>rules</em></h2>"),
    ("<li>Be kind. Every golfer was a beginner once.</li>", "<li>Be kind. Every golfer was a beginner once, and most of us still are on the greens.</li>"),
    ("<h2>Guides for this pillar</h2>", "<h2>Guides for <em>this pillar</em></h2>"),
    ("<h2>Gear guides</h2>", "<h2>Gear <em>guides</em></h2>"),
    ("Everything stays in your browser; nothing is saved or sent.", "Everything stays in your browser; nothing is saved or sent. Your secrets are safe."),
    ("/images/brand/mark-v3.png", "/images/brand/mark-v4.png"),
]
_v3_page = b.page


def apply_copy(doc):
    for a, c in COPY:
        doc = doc.replace(a, c)
    return doc


def page(title, desc, path, active, body, ld=None, og=DEFAULT_OG):
    return apply_copy(_v3_page(title, desc, path, active, body, ld, og))


b.page = page


# ------------------------------------------------------------------ home
def bet_card(slug, title, line, tag):
    return f'<a class="bet" href="/games/{slug}/" style="text-decoration:none"><span class="odds">{tag}</span><b>{title}</b><p>{line}</p></a>'


def home(cards):
    wolf = next(g for g in GAMES if g["slug"] == "wolf")
    ladder = DRILLS[0]
    index = "".join(f"""<a class="icard" href="{u}">{b.fig(k2, "r45", "(max-width:560px) 100vw, (max-width:1000px) 50vw, 300px", cap=False)}<span class="num">0{i}</span><h3>{t}</h3><p>{d}</p><span class="more">Get in</span></a>"""
                    for i, (k, u, t, d, k2) in enumerate(b.PILLARS, 1))
    latest = b.article_cards(["mini-golf-date-night", "backyard-mini-golf-course", "beginner-trick-shots"], cards)
    ld = [{"@context": "https://schema.org", "@type": "WebSite", "name": BRAND, "url": f"{HOST}/"},
          {"@context": "https://schema.org", "@type": "Organization", "name": BRAND, "url": f"{HOST}/", "logo": f"{HOST}/images/brand/mark-v4.png", "sameAs": [X_URL, FB_URL]}]
    hero_key = "swing-sunset"
    bets = "".join([
        bet_card("wolf", "Wolf", "Pick a partner after their drive, or go Lone Wolf and bet on yourself. Ego is part of the format.", "4 players"),
        bet_card("snake", "Snake", "Three-putt and you hold the snake. Hold it on 18 and you pay. Suddenly every two-footer has a pulse.", "2 to 6"),
        bet_card("skins", "Skins", "Win a hole outright, take the skin. Tie, and it rolls over. Four ties later, a tap-in is worth a fortune.", "2 to 6"),
        bet_card("vegas", "Vegas", "Your team's two scores glued into one number. A 4 and a 5 is 45. An 8 is a disaster you can see from space.", "2 v 2"),
        bet_card("bingo-bango-bongo", "Bingo Bango Bongo", "First on the green, closest to the pin, first in the hole. The 24-handicap can win this. That's the point.", "3 to 6"),
        bet_card("nassau", "Nassau", "Front nine, back nine, overall: three bets in one. A terrible front nine is just a plot twist.", "2 or 2 v 2"),
    ])
    body = f"""<section class="hero4"><div class="bg">{b.img(hero_key, "100vw", eager=True, alt="A golfer silhouetted mid-swing against a blazing sunset")}</div>
<span class="stamp" aria-hidden="true">Chaos, but with rules</span>
<div class="wrap in"><div class="copy">
<span class="kick lt">Golf, with the volume up</span>
<h1>Keep golf <span class="badge"><i>crazy.</i></span></h1>
<p class="lede">Wolf with the regulars. Skins that carry for six holes. A putting ladder that ends in a grudge match. Crazy Golf Game is for golfers who play the game inside the game: rules that settle arguments, practice with a scoreboard, and gear talk without the infomercial.</p>
<div class="btns"><a class="btn" href="/games/">Pick Saturday's game</a><a class="btn btn-line" href="/get-better/">Fix my putting</a></div>
<div class="facts"><span><b>14</b>side-game formats</span><span><b>6</b>scorecards that do the maths</span><span><b>3</b>drills with a score</span><span><b>0</b>swing gurus</span></div>
</div></div>
<p class="cred">{b.credit_html(hero_key)}</p></section>

<section class="sec"><div class="wrap manifesto">
<div><span class="kick">The crazy manifesto</span><h2>Crazy is a <em>compliment</em> here.</h2>
<p class="lede">Golf has a reputation: quiet, collared, slightly afraid of fun. The game never agreed. Golfers have been inventing bets, partner swaps and ridiculous penalties for as long as two of them have shared a tee. That's the golf we're here for, whether you're scratch or still counting on your fingers.</p>
<p><a class="more" href="/about/">Who's behind this</a></p></div>
<ul class="vs" aria-label="Out with the old, in with the crazy">
<li><s>Suffering in silence</s><i>&rarr;</i><span>Friendly trash talk</span></li>
<li><s>A bucket on autopilot</s><i>&rarr;</i><span>Practice with a scoreboard</span></li>
<li><s>A new driver to fix it</s><i>&rarr;</i><span>A putting mat you'll use</span></li>
<li><s>One bad score ruins the day</s><i>&rarr;</i><span>Three bets keep it alive</span></li>
<li><s>Golf is for members</s><i>&rarr;</i><span>Golf is for whoever shows up</span></li>
</ul></div></section>

<section class="sec ink cut-top cut-bot"><div class="wrap">
<div class="sec-head"><div><span class="kick lt">Weird bets, legally speaking</span><h2>Side games for <em>every kind of chaos</em></h2><p>Real formats with real rules. Each one has a full page, a worked example and a scorecard that does the adding up.</p></div><a class="more" href="/games/">All side games</a></div>
<div class="bets">{bets}</div>
<p class="small" style="margin-top:28px;color:#8E948D">Playing for money? Keep it friendly and legal where you live. The best stake is one nobody minds losing.</p>
</div></section>

<section class="sec"><div class="wrap">
<div class="sec-head"><div><span class="kick">Four ways in</span><h2>Pick your <em>lane</em></h2></div></div>
<div class="index4">{index}</div></div></section>

<section class="sec paper"><div class="wrap split">
<div class="ph-col">{b.fig("swing-fairway", "r43 tilt")}</div>
<div><span class="kick">Game of the week</span><h2>Wolf: pick a partner. <em>Or go rogue.</em></h2>
<p>{E(wolf['lede'])}</p>
<ol class="steps"><li>The Wolf rotates every hole.</li><li>After each drive, the Wolf picks that player as a partner, or waits for the next one and hopes.</li><li>Or goes Lone Wolf for bigger points. Win and you're a legend; lose and everyone else gets paid.</li></ol>
<p><a class="btn" href="/games/wolf/">Full rules + the Wolf card</a></p></div>
</div></section>

<section class="sec"><div class="wrap duo">
<article class="story">{b.fig("putter-by-green", "r43")}
<span class="kick" style="margin-top:24px">Drill of the week &middot; Putting</span><h3>{E(ladder['name'])}</h3>
<div class="meta"><span><b>Time</b> {E(ladder['time'])}</span><span><b>You need</b> {E(ladder['need'])}</span></div>
<p>{E(ladder['lede'])}</p>
<p><a class="more" href="/get-better/putting-ladder-drill/">Climb the ladder</a></p></article>
<article class="story">{b.fig("indoor-putters", "r43")}
<span class="kick" style="margin-top:24px">Gear note</span><h3>A putting mat you'll actually use</h3>
<div class="meta"><span><b>Best for</b> winter practice</span><span><b>Check</b> length and speed</span></div>
<p>If you buy one piece of practice gear this winter, make it a putting surface long enough for the ladder drill. Measure the hallway first, then decide whether you want a ball return. (Then tell your household it's furniture.)</p>
<p class="aff-cta">{ov.aff("indoor-golf-shop", "home-gear-pick", "Compare putting mats")}</p>
{b.disclosure(short=True)}
<p><a class="more" href="/gear/">All gear picks</a> &nbsp; <a class="more" href="/offers/">Gift Guide 2026</a></p></article>
</div></section>

<section class="sec turf cut-top"><div class="wrap split rev">
<div class="ph-col">{b.fig("mini-night", "r43 tilt-r")}</div>
<div><span class="kick lt">Where the name comes from</span><h2>Crazy golf: <em>the original chaos</em></h2>
<p>Windmills, loop-the-loops, a hole that goes through a fibreglass dinosaur. Mini golf is where a lot of us fell for the game, and it's still the best way to get a non-golfer hooked. Build a backyard nine, run a living-room tournament, or let the <a href="/games/#hole-generator">Crazy Hole Generator</a> design something unreasonable.</p>
<p><a class="btn" href="/games/#crazy-golf">Crazy golf &amp; backyard games</a></p></div>
</div></section>

<section class="sec"><div class="wrap">
<div class="sec-head"><div><span class="kick">Fresh off the scorecard</span><h2>Guides worth <em>stealing ideas from</em></h2></div><a class="more" href="/articles/">All guides</a></div>
<div class="grid">{latest}</div></div></section>

<section class="sec dark cut-top"><div class="wrap join"><div>
<img class="seal" src="/images/brand/mark-v4.svg" alt="" width="110" height="110">
<span class="kick lt">The Clubhouse</span><h2>Talk golf. <em>Talk trash.</em> Nicely.</h2>
<p>Tell us the game your group plays, ask a rules question, or settle whether the Wolf should hit first. We're on X as @crazygolfgame and on Facebook.</p>
{b.socials()}
<p style="margin-top:24px"><a class="btn" href="/clubhouse/">Visit the Clubhouse</a></p>
</div>{newsletter("home")}</div></section>"""
    return page("Golf Side Games, Drills and Gear for Golf Lovers",
                "Crazy Golf Game is for people who love golf and the games inside the game: rules and score helpers for Wolf, Nassau and Skins, practice drills that feel like games, honest gear picks and a golf clubhouse.",
                "/", "", body, ld, b.og_for(hero_key))


b.home = home


# ------------------------------------------------------------------ re-chrome (strip v3 or v4 head bits first, then reuse v3 logic)
STRIP_V = [r'<link rel="preload" href="/assets/fonts/[^"]+\.woff2" as="font" type="font/woff2" crossorigin>\n?',
           r'<link rel="icon" href="/images/brand/favicon-v[34]\.svg" type="image/svg\+xml">\n?',
           r'<link rel="icon" href="/images/brand/favicon-32\.png" sizes="32x32" type="image/png">\n?',
           r'<link rel="apple-touch-icon" href="/images/brand/apple-touch-icon\.png">\n?',
           r'<link rel="stylesheet" href="/assets/v[34]\.css">\n?']
_v3_rechrome = b.rechrome


def rechrome(doc, active="", rel=""):
    for pat in STRIP_V:
        doc = re.sub(pat, "", doc)
    doc = _v3_rechrome(doc, active, rel)
    doc = doc.replace("/assets/v3.css", "/assets/v4.css").replace('content="#132820"', 'content="#0D1410"')
    doc = doc.replace("/images/og/green-aerial-bunkers.jpg", "/images/" + DEFAULT_OG)
    if rel == "offers/index.html" and '<p class="stamp"' not in doc:
        doc = doc.replace("<h1>Crazy Golf Gift Guide 2026</h1>", '<h1>Crazy Golf <em>Gift Guide</em> 2026</h1>\n  <p class="stamp">For the golfer who has everything (except a putting stroke)</p>', 1)
    return apply_copy(doc)


b.rechrome = rechrome


def plate_svg():
    mark = (HERE / "brand" / "mark-v4.svg").read_text()
    inner = re.sub(r"<title>.*?</title>", "", re.search(r"<svg[^>]*>(.*)</svg>", mark, re.S).group(1))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675" role="img" aria-label="Crazy Golf Game">'
            '<rect width="1200" height="675" fill="#0D1410"/><path d="M0 600 L1200 520 V675 H0Z" fill="#FF4B1F"/>'
            f'<g transform="translate(472 210) scale(2)">{inner}</g></svg>\n')


b.plate_svg = plate_svg


# ------------------------------------------------------------------ practice-session planner (hand-made page, restyled; copy and #ad section kept verbatim)
def planner(doc):
    if "/assets/v4.css" in doc and 'class="planner"' in doc:
        return rechrome(doc, "better", "practice-session-planner/index.html")
    hero = re.search(r'<div class="hero">(.*?)</div><div class="grid">', doc, re.S).group(1)
    grid = re.search(r'<div class="grid">(.*?)</div><p class="note">', doc, re.S).group(1)
    note = re.search(r'</div>(<p class="note">Published.*?</p>)', doc, re.S).group(1)
    after = re.search(r'(<section><h2>After the session</h2>.*?</section>)', doc, re.S).group(1)
    hero = hero.replace('<p class="eyebrow">', '<p class="kicker">')
    grid = grid.replace('<button type="button" onclick="window.print()">', '<button type="button" class="btn" onclick="window.print()">')
    title = re.search(r"<h1>(.*?)</h1>", hero).group(1)
    desc = re.search(r'<meta name="description" content="([^"]*)">', doc).group(1)
    trail = [("Home", "/"), ("Get Better", "/get-better/"), ("Practice planner", "/practice-session-planner/")]
    body = f"""<section class="dhero"><div class="wrap">{b.crumbs_html(trail)}<div style="max-width:880px">{hero}</div></div></section>
<div class="wrap sec tight"><div class="planner">{grid}</div>
<div class="prose2" style="max-width:780px;margin-top:48px">{after}
<p><a class="more" href="/get-better/">Drills with a score</a> &nbsp; <a class="more" href="/get-better/putting-ladder-drill/">The Putting Ladder</a></p>
{note}</div></div>"""
    body = body.replace('<a class="cta" rel="sponsored" href="/offers/">', '<a class="btn btn-dark" rel="sponsored" href="/offers/">')
    out = page(html.unescape(title).rstrip("."), html.unescape(desc), "/practice-session-planner/", "better", body, [b.crumbs_ld(trail)], b.og_for("ball-pyramid"))
    out = out.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="article">')
    return rechrome(out, "better", "practice-session-planner/index.html")  # same head order as re-runs


# ------------------------------------------------------------------ main
def main():
    b.SITE = SITE
    b.main()
    img_dir = SITE / "images"; assets = SITE / "assets"
    for f in (HERE / "photos").glob("*.webp"):
        shutil.copy(f, img_dir / "photos" / f.name)
    for f in (HERE / "og").glob("*.jpg"):
        shutil.copy(f, img_dir / "og" / f.name)
    for f in (HERE / "brand").iterdir():
        shutil.copy(f, img_dir / "brand" / f.name)
    for f in (HERE / "fonts").iterdir():
        shutil.copy(f, assets / "fonts" / f.name)
    shutil.copy(HERE / "v4.css", assets / "v4.css")
    shutil.copy(HERE / "brand" / "mark-v4.svg", img_dir / "logo.svg")
    # drop v3-only assets so nothing stale ships
    (assets / "v3.css").unlink(missing_ok=True)
    for n in ["fraunces-latin.woff2", "fraunces-italic-latin.woff2", "librefranklin-latin.woff2", "OFL-Fraunces.txt", "OFL-LibreFranklin.txt"]:
        (assets / "fonts" / n).unlink(missing_ok=True)
    for f in list((img_dir / "brand").glob("*v3*")):
        f.unlink()
    p = SITE / "practice-session-planner" / "index.html"
    p.write_text(planner(p.read_text()))
    print("v4 layer applied:", len(b.CREDITS), "photos credited")


if __name__ == "__main__":
    main()
