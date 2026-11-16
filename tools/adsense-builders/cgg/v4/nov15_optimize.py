#!/usr/bin/env python3
"""CGG optimisation pass, 15 Nov 2026 (Black Friday push, speed, SEO).

Runs on the generated site in <repo>/cgg after build_v4.py and affiliate_overlay.py.
Idempotent: every insert is guarded by a data-cgg="nov15-*" marker or a re-runnable regex.

  * Deferred tags: GTM, gtag and (content pages only) AdSense load on first interaction
    or 3.5 s after window load. AdSense is NOT loaded on deal pages (DEAL_PAGES).
  * Hero image preload (after the stylesheet). The italic-font preload stays (measured: removing it slowed FCP).
  * Contrast fixes (ink text on flag orange, darker --flag-d) and heading order
    (footer column labels and the "On this page" label are no longer h4s).
  * Shorter titles and meta descriptions.
  * Gift guide: dated "Live now" strip, under-$50 and stocking-stuffer sections, CJ deep links.
  * New dated page /black-friday-golf-deals-2026/ (no AdSense, disclosure, schema, sitemap).
  * Gear boxes with issued affiliate links on game and drill pages; side-game strip on guides
    and drills; Vegas, Bingo Bango Bongo, Snake and the deals page in the footer; deals link
    in the ticker; BreadcrumbList on articles and the gift guide.

Prices: copied from the merchants' own pages on CHECKED_H. Nothing is estimated.
Tracking links: only links issued under CJ PID 101511730 (The Indoor Golf Shop 17315782,
Vice Golf 14054834). The Indoor Golf Shop link accepts CJ's `url` deep-link parameter
(verified: lands on the target page). The Vice link ignores `url` and always opens Vice's
ball personalisation page, so Vice copy says so; a Vice Black Friday deep link has to be
generated in the CJ dashboard.
"""
import html, json, pathlib, re, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / "cgg"
CHECKED = "2026-11-15"
CHECKED_H = "15 November 2026"
BF_SLUG = "black-friday-golf-deals-2026"
DEAL_PAGES = {"offers/index.html", "gear/index.html", f"{BF_SLUG}/index.html"}
PUB = "ca-pub-5194583669093303"

IGS = "https://www.dpbolvw.net/click-101511730-17315782"
VICE = "https://www.tkqlhce.com/click-101511730-14054834"


def igs(sid, dest=None):
    u = f"{IGS}?sid=cgg-{sid}"
    if dest:
        u += "&url=" + urllib.parse.quote(dest, safe="")
    return u


def vice(sid):
    return f"{VICE}?sid=cgg-{sid}"


def a_aff(href, offer, label, cls="btn aff-btn"):
    return (f'<a class="{cls}" href="{html.escape(href, quote=True)}" rel="sponsored noopener" target="_blank" '
            f'data-offer="{offer}">{label}</a> <span class="aff-tag">Affiliate link</span>')


IGS_BF = "https://shopindoorgolf.com/collections/black-friday-golf-simulator-deals"
IGS_GREENS = "https://shopindoorgolf.com/collections/indoor-putting-greens"
P = "https://shopindoorgolf.com/products/"

# (name, sale, was, product url) as listed on shopindoorgolf.com on CHECKED
IGS_DEALS = [
    ("SkyTrak ST MAX Launch Monitor", "$1,695.00", "$2,995.00", P + "skytrak-stmax-launch-monitor", "skytrak"),
    ("Rapsodo MLM2PRO Mobile Launch Monitor &amp; Golf Simulator", "$549.99", "$699.99", P + "rapsodo-mlm2pro-mobile-launch-monitor-golf-simulator", "mlm2pro"),
    ("Garmin Approach G82 Golf GPS &amp; Launch Monitor", "$499.99", "$599.99", P + "garmin-approach-g82-golf-gps-launch-monitor", "g82"),
    ("Rapsodo Mobile Launch Monitor (MLM)", "$129.99", "$199.99", P + "rapsodo-mobile-launch-monitor-mlm", "mlm"),
    ("SIG10 Golf Simulator Enclosure", "$1,499.99", "$1,999.99", P + "sig10-golf-simulator-enclosure", "sig10"),
    ("SIGPRO Softy LITE 4&prime; x 5&prime; Golf Mat", "$554.99", "$739.99", P + "sigpro-softy-lite-4-x-5-golf-mat", "softy-lite"),
    ("10&prime; x 7&prime; Rounded Golf Net", "$79.99", "$99.99", P + "10-x-7-rounded-golf-net", "net-10x7"),
    ("Perfect Practice Putting Green", "$179.99", "$199.99", P + "perfect-practice-putting-green", "perfect-practice"),
    ("Big Moss Competitor Putting Green &amp; Chipping Mat", "$199.00", "$235.00", P + "big-moss-competitor-putting-green-chipping-mat", "big-moss-competitor"),
]
# as listed on vicegolf.com/black-friday-deals on CHECKED
VICE_DEALS = [
    ("24-Ball Variety Pack", "$67.50", "$89.99"),
    ("Vice Pro golf balls, 6 dozen", "$179.94", "$239.94"),
    ("Vice Horizon Rangefinder", "$140.00", "$199.99"),
]

TITLES = {
    "index.html": ("Golf Side Games, Drills &amp; Gear | Crazy Golf Game",
                   "Rules and free score helpers for Wolf, Nassau, Skins and Vegas, practice drills that feel like games, honest gear picks and a golf clubhouse."),
    "about/index.html": (None, "Who makes Crazy Golf Game: an independent golf magazine about side games, drills, backyard courses and gear, and how the site is funded."),
    "articles/backyard-mini-golf-course/index.html": ("Build a Backyard Mini Golf Course (Lawn-Safe) | CGG",
        "A step-by-step plan for a backyard mini golf course: layout, cups, borders and keeping the grass healthy."),
    "articles/beginner-trick-shots/index.html": ("Beginner Golf Trick Shots to Learn in an Afternoon",
        "Safe putting and chipping trick shots for casual golfers: the double-bank, stair-step, cup bounce, putter flip and how to film them."),
    "articles/casual-golfer-gear-guide/index.html": ("Gear for Casual Golfers: What's Worth Owning | CGG",
        "A no-hype guide to casual golf gear: putters, balls, putting mats, backyard kits and bags, and what you can happily skip."),
    "articles/designing-mini-golf-holes/index.html": ("How to Design a Mini Golf Hole: Par, Flow and Fun",
        "How to design memorable mini golf holes: setting par, balancing skill and luck, angles and levels, pacing and testing a layout."),
    "articles/diy-mini-golf-obstacles/index.html": ("15 DIY Mini Golf Obstacles From Household Stuff",
        "Tunnels, ramps, windmills and bank walls built from cardboard, pool noodles, buckets and scrap wood, with tips to make each play fair."),
    "articles/indoor-mini-golf-course/index.html": ("Indoor Mini Golf: Turn Your Living Room Into a Course",
        "Set up a safe indoor mini golf course with furniture, books, tape and cardboard, plus a sample nine-hole layout and floor-saving tips."),
    "articles/mini-golf-date-night/index.html": ("Mini Golf Date Night: Ideas and Friendly Wagers | CGG",
        "Why mini golf makes a great date, how to plan one, playful wagers that aren't awkward, and an at-home version for a night in."),
    "articles/mini-golf-party-games/index.html": ("12 Mini Golf Party Games for Unpredictable Rounds",
        "Mini golf party games: wrong-hand holes, alternate shot, challenge cards, scramble teams, blind putts and more, for any group size."),
    "articles/mini-golf-putting-tips/index.html": ("Mini Golf Putting Tips: Banks, Slopes and Bumpers",
        None),
    "articles/mini-golf-rules-and-etiquette/index.html": ("Mini Golf Rules, Scoring and Etiquette | CGG",
        "Mini golf rules explained plainly: order of play, stroke limits, out-of-bounds balls, scoring, ties and the etiquette that keeps it fun."),
    "articles/mini-golf-tournament-at-home/index.html": ("How to Run a Mini Golf Tournament at Home or Work",
        "Host a mini golf tournament: formats, handicaps, brackets, scorekeeping, prizes and a run-of-show for a party, office social or fundraiser."),
    "articles/mini-golf-with-kids/index.html": ("Mini Golf With Kids: Age-by-Age Tips | CGG",
        "Make mini golf fun for toddlers, young kids and tweens: realistic expectations, simple scoring, safety habits and keeping attention."),
    "articles/putting-practice-games/index.html": ("10 Putting Practice Games That Feel Like Play | CGG",
        "Fun putting games for golfers and families: ladder, around the clock, gate drill, lag bowling, H-O-R-S-E and more, with scoring."),
    "clubhouse/index.html": (None, "The Crazy Golf Game clubhouse: follow @crazygolfgame on X and Facebook, share your group's side games and house rules, and talk golf."),
    "credits/index.html": (None, "Credits and licences for the photos on Crazy Golf Game: Wikimedia Commons (CC0, public domain, CC BY) and the Library of Congress."),
    "games/bingo-bango-bongo/index.html": ("Bingo Bango Bongo Golf: Rules, Scoring &amp; Scorecard",
        "How to play Bingo Bango Bongo: a point for first on the green, closest to the pin and first in the hole, plus a free points tracker."),
    "games/index.html": ("Golf Side Games &amp; Betting Games: Rules + Scorecards",
        "Rules and free score helpers for golf side games: Wolf, Nassau, Skins, Bingo Bango Bongo, Vegas and Snake, plus scrambles and more."),
    "games/nassau/index.html": ("Nassau Golf Bet: Rules, Presses and Scoring | CGG",
        "The Nassau golf bet explained: front nine, back nine and overall, match play scoring, how presses work, and a free match tracker."),
    "games/skins/index.html": ("Skins Golf Game Rules + Free Skins Calculator | CGG",
        "How to play Skins in golf: winning a hole outright, carryovers, validation, net skins with handicaps, and a free skins calculator."),
    "games/vegas/index.html": ("Vegas Golf Game: Rules, Birdie Flip &amp; Calculator",
        "How to play Vegas golf: team numbers from partners' scores, the birdie flip, scores of 10 or more, and a free hole-by-hole calculator."),
    "games/wolf/index.html": ("Wolf Golf Game: Rules, Scoring and Strategy | CGG",
        "How to play Wolf in golf: the rotating Wolf, picking a partner or going Lone Wolf, points, blind Wolf, and a printable points sheet."),
    "gear/index.html": ("Golf Gear &amp; Gift Picks: Mats, Simulators, Balls | CGG",
        "Golf gear picks by category: putting mats, launch monitors and home simulators, golf balls, backyard sets, and what to skip."),
    "get-better/fairway-corridor/index.html": ("Driving Range Drill: The Fairway Corridor | CGG",
        "A driving range drill that turns a bucket into a round: two targets, 14 tee shots with a routine, fairways hit and your miss."),
    "get-better/index.html": ("Golf Practice Drills: Putting, Chipping, Driving | CGG",
        "Golf drills that feel like games: a putting ladder for distance control, a chipping ladder with Par 18, and a fairway corridor."),
    "get-better/landing-spot-ladder/index.html": ("Chipping Drill: The Landing Spot Ladder | CGG",
        "A chipping drill for picking a landing spot and the right club: towel targets, landing-to-roll ratios and the Par 18 game."),
    "get-better/putting-ladder-drill/index.html": ("Putting Ladder Drill: Fix Distance Control | CGG",
        "A putting ladder drill for distance control: setup, a scoring game that makes it competitive, and a short-putt circle to stop three-putts."),
    "offers/index.html": ("Golf Gift Guide 2026 + Black Friday Picks | CGG",
        f"Golf gifts for every budget: under $50, stocking stuffers, backyard games, putting greens and simulators, with Black Friday prices checked {CHECKED_H}."),
}


def rd(rel):
    return (SITE / rel).read_text(encoding="utf8")


def wr(rel, s):
    p = SITE / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s, encoding="utf8")


def pages():
    out = []
    for p in sorted(SITE.rglob("index.html")):
        rel = p.relative_to(SITE).as_posix()
        if rel.startswith("preview/"):
            continue
        out.append(rel)
    return out


# ---------------------------------------------------------------- head: tags
TAGS_RE = re.compile(
    r'(?:<script async src="https://pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js\?client=' + PUB + r'" crossorigin="anonymous"></script>\n)?'
    r'<script>window\.dataLayer=window\.dataLayer\|\|\[\];</script>\n'
    r'<script>\(function\(w,d,s,l,i\).*?\'GTM-K8TXN9\'\);</script>\n'
    r'<script async src="https://www\.googletagmanager\.com/gtag/js\?id=G-6W2RXNMMXR"></script><script>.*?</script>\n', re.S)
DEFERRED_RE = re.compile(r'<script>window\.dataLayer=.*?</script>\n<script data-cgg="nov15-tags">.*?</script>\n', re.S)


def tags(ads):
    ads_js = (f"add('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={PUB}',1);" if ads else "")
    return ('<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}'
            'gtag("js",new Date());gtag("config","G-6W2RXNMMXR");</script>\n'
            '<script data-cgg="nov15-tags">/* Tags and ads load on first interaction or 3.5 s after load, so the page paints first. */'
            "(function(w,d){var done=0,ev=['scroll','pointerdown','keydown','touchstart','mousemove'];"
            "function add(src,co){var s=d.createElement('script');s.async=true;s.src=src;if(co)s.crossOrigin='anonymous';d.head.appendChild(s);}"
            "function go(){if(done)return;done=1;ev.forEach(function(e){w.removeEventListener(e,go,true);});"
            "w.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});"
            "add('https://www.googletagmanager.com/gtm.js?id=GTM-K8TXN9');"
            "add('https://www.googletagmanager.com/gtag/js?id=G-6W2RXNMMXR');" + ads_js + "}"
            "ev.forEach(function(e){w.addEventListener(e,go,{capture:true,passive:true,once:true});});"
            "function later(){setTimeout(go,3500);}"
            "if(d.readyState==='complete')later();else w.addEventListener('load',later);})(window,document);</script>\n")


def fix_head(rel, h):
    ads = rel not in DEAL_PAGES
    if DEFERRED_RE.search(h):
        h = DEFERRED_RE.sub(lambda m: tags(ads), h, count=1)
    else:
        h, n = TAGS_RE.subn(lambda m: tags(ads), h, count=1)
        assert n == 1, f"{rel}: tag block not found"
    # Italic font preload is KEPT: the hero H1s are italic, and dropping the preload measured
    # +0.4 s FCP on mobile Lighthouse (1.1 s -> 1.5 s on the home page, 2 runs each).
    roman = '<link rel="preload" href="/assets/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>\n'
    italic = '<link rel="preload" href="/assets/fonts/archivo-italic-latin.woff2" as="font" type="font/woff2" crossorigin>\n'
    if italic not in h and roman in h:
        h = h.replace(roman, roman + italic, 1)
    # hero preload
    h = re.sub(r'<link rel="preload" as="image"[^>]*data-cgg="nov15-hero">\n', "", h)
    if 'data-cgg="nov15-hero"' not in h:
        m = re.search(r'<img src="([^"]+)" srcset="([^"]+)" sizes="([^"]+)"[^>]*fetchpriority="high"', h)
        if m:
            link = (f'<link rel="preload" as="image" href="{m.group(1)}" imagesrcset="{m.group(2)}" '
                    f'imagesizes="{m.group(3)}" fetchpriority="high" data-cgg="nov15-hero">\n')
            h = h.replace('<link rel="stylesheet" href="/assets/v4.css">\n', '<link rel="stylesheet" href="/assets/v4.css">\n' + link, 1)
    return h


# ---------------------------------------------------------------- titles
def fix_meta(rel, h):
    if rel not in TITLES:
        return h
    t, d = TITLES[rel]
    if t:
        assert len(html.unescape(t)) <= 60, (rel, len(html.unescape(t)))
        h = re.sub(r"<title>.*?</title>", f"<title>{t}</title>", h, count=1, flags=re.S)
    if d:
        assert len(html.unescape(d)) <= 160, (rel, len(html.unescape(d)))
        h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{d}">', h, count=1)
    return h


# ---------------------------------------------------------------- headings, footer, ticker
def fix_chrome(rel, h):
    h = re.sub(r'(<aside class="toc[^"]*">)<h4>(.*?)</h4>', r'\1<p class="toc-h">\2</p>', h)
    i, j = h.find('<footer class="ftr">'), h.find("</footer>")
    if i != -1 and j != -1:
        f = h[i:j].replace("<h4>", '<p class="fh">').replace("</h4>", "</p>")
        if "/games/vegas/" not in f:
            f = f.replace('<li><a href="/games/skins/">Skins</a></li>',
                          '<li><a href="/games/skins/">Skins</a></li><li><a href="/games/vegas/">Vegas</a></li>'
                          '<li><a href="/games/bingo-bango-bongo/">Bingo Bango Bongo</a></li><li><a href="/games/snake/">Snake</a></li>', 1)
        if BF_SLUG not in f:
            f = f.replace('<li><a href="/offers/">Gift Guide 2026</a></li>',
                          f'<li><a href="/offers/">Gift Guide 2026</a></li><li><a href="/{BF_SLUG}/">Black Friday deals</a></li>', 1)
        h = h[:i] + f + h[j:]
    if 'data-cgg="nov15-tick"' not in h:
        h = re.sub(r'(<div class="tick"[^>]*>)',
                   rf'\1<span data-cgg="nov15-tick"><a href="/{BF_SLUG}/">Black Friday golf deals: prices checked {CHECKED_H}</a></span>', h, count=1)
    return h


# ---------------------------------------------------------------- schema
def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj) + "</script>\n"


def crumbs(*items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": "https://crazygolfgame.com" + u} for i, (n, u) in enumerate(items)]}


def add_ld(h, obj, marker):
    if f'"{marker}"' in h or marker in h:
        return h
    s = ld(obj).replace('<script type="application/ld+json">', f'<script type="application/ld+json" data-cgg="{marker}">')
    return h.replace("</head>", s + "</head>", 1)


def article_crumbs(rel, h):
    if not re.match(r"articles/[^/]+/index\.html$", rel) or '"BreadcrumbList"' in h:
        return h
    t = re.search(r'"@type": "Article", "headline": "([^"]+)"', h)
    slug = rel.split("/")[1]
    return add_ld(h, crumbs(("Home", "/"), ("Guides", "/articles/"), (html.unescape(t.group(1)) if t else slug, f"/articles/{slug}/")), "nov15-crumbs")


# ---------------------------------------------------------------- gear boxes + side-game strip
NOTE = ('<p class="aff-note">#ad: we may earn a commission if you buy through this link, at no extra cost to you. '
        '<a href="/offers/#disclosure">How this works</a>.</p>')


def gbox(title, body, link):
    return (f'<aside class="aff-box" data-cgg="nov15-gear"><p class="aff-label">#ad &middot; Gear for the game</p>'
            f'<h3>{title}</h3><p>{body}</p><p class="aff-cta">{link}</p>{NOTE}</aside>\n')


VICE_NOTE = "Our Vice link opens Vice's ball personalisation page; its Black Friday deals are in the main menu."
GEAR = {
    "games/wolf/index.html": gbox("Lone Wolf pays in sleeves",
        f"Settle Wolf in golf balls, not cash. Vice Golf sells balls by the dozen and prints names on them, so the winner's prize can say so. "
        f"On {CHECKED_H} Vice's Black Friday page listed its 24-Ball Variety Pack at $67.50 (was $89.99). {VICE_NOTE}",
        a_aff(vice("game-wolf-gear"), "vice-golf", "Shop Vice Golf balls")),
    "games/nassau/index.html": gbox("Loser of the press buys the sleeve",
        f"Nassau stakes work best when nobody minds losing them. A dozen balls is the classic. On {CHECKED_H} Vice's Black Friday page "
        f"listed Vice Pro balls at $179.94 for 6 dozen (was $239.94). {VICE_NOTE}",
        a_aff(vice("game-nassau-gear"), "vice-golf", "Shop Vice Golf balls")),
    "games/bingo-bango-bongo/index.html": gbox("A Bongo prize worth chasing",
        f"Bongo goes to the first ball in the hole, so the prize should be a ball. Vice Golf personalises balls; a sleeve with the winner's name "
        f"on it is the best trash-talk trophy there is. {VICE_NOTE}",
        a_aff(vice("game-bbb-gear"), "vice-golf", "Personalise Vice balls")),
    "games/skins/index.html": gbox("Skins are won on the green",
        f"Most skins carry over because someone missed from four feet. A home putting green fixes that over winter. On {CHECKED_H} "
        "The Indoor Golf Shop listed the Perfect Practice Putting Green at $179.99 (was $199.99).",
        a_aff(igs("game-skins-gear", IGS_GREENS), "indoor-golf-shop", "Compare indoor putting greens")),
    "games/snake/index.html": gbox("Stop holding the Snake",
        f"The Snake goes to whoever three-putts last, so the cure is lag putting. On {CHECKED_H} The Indoor Golf Shop listed the "
        "Big Moss Competitor Putting Green &amp; Chipping Mat at $199.00 (was $235.00).",
        a_aff(igs("game-snake-gear", P + "big-moss-competitor-putting-green-chipping-mat"), "indoor-golf-shop", "See the Big Moss Competitor")),
    "games/vegas/index.html": gbox("Keep your number starting with a 4",
        f"Vegas punishes the blow-up hole, and most blow-ups start off the tee. A phone-sized launch monitor turns a range bucket into feedback. "
        f"On {CHECKED_H} The Indoor Golf Shop listed the Rapsodo Mobile Launch Monitor (MLM) at $129.99 (was $199.99).",
        a_aff(igs("game-vegas-gear", P + "rapsodo-mobile-launch-monitor-mlm"), "indoor-golf-shop", "See the Rapsodo MLM")),
    "get-better/putting-ladder-drill/index.html": gbox("A ladder you can leave set up",
        f"The ladder works on carpet, but a putting green with real roll lets you run it every night. On {CHECKED_H} The Indoor Golf Shop "
        "listed the Perfect Practice Putting Green at $179.99 (was $199.99).",
        a_aff(igs("drill-ladder-gear", IGS_GREENS), "indoor-golf-shop", "Compare indoor putting greens")),
    "get-better/landing-spot-ladder/index.html": gbox("Chip at home without wrecking the lawn",
        f"A putting green with a chipping fringe lets you practise landing spots in the garage. On {CHECKED_H} The Indoor Golf Shop listed the "
        "Big Moss Competitor Putting Green &amp; Chipping Mat at $199.00 (was $235.00).",
        a_aff(igs("drill-chipping-gear", P + "big-moss-competitor-putting-green-chipping-mat"), "indoor-golf-shop", "See the Big Moss Competitor")),
    "get-better/fairway-corridor/index.html": gbox("Know where your corridor misses go",
        f"The corridor drill tells you whether you hit the fairway; a launch monitor tells you why you didn't. On {CHECKED_H} The Indoor Golf Shop "
        "listed the Rapsodo MLM2PRO at $549.99 (was $699.99).",
        a_aff(igs("drill-corridor-gear", P + "rapsodo-mlm2pro-mobile-launch-monitor-golf-simulator"), "indoor-golf-shop", "See the Rapsodo MLM2PRO")),
}
GAMES = [("Wolf", "/games/wolf/"), ("Nassau", "/games/nassau/"), ("Skins", "/games/skins/"), ("Vegas", "/games/vegas/"),
         ("Bingo Bango Bongo", "/games/bingo-bango-bongo/"), ("Snake", "/games/snake/")]


def strip(rel):
    here = "/" + rel.replace("index.html", "")
    links = " ".join(f'<a href="{u}">{n}</a>' for n, u in GAMES if u != here)
    return (f'<aside class="sidegames" data-cgg="nov15-sidegames"><p class="sg-h">Got a group? <em>Put something on it.</em></p>'
            f'<p class="sg-links">{links}</p><p class="small">Rules, scoring and a free scorecard for each. Points, not dollars.</p></aside>\n')


def gear_and_strip(rel, h):
    marker = '<section class="faq"'
    if rel in GEAR and 'data-cgg="nov15-gear"' not in h:
        h = h.replace(marker, GEAR[rel] + marker, 1)
    is_guide = re.match(r"(articles|get-better)/[^/]+/index\.html$", rel)
    if is_guide and 'data-cgg="nov15-sidegames"' not in h:
        h = h.replace(marker, strip(rel) + marker, 1)
    return h


# ---------------------------------------------------------------- gift guide
def live_strip(prefix):
    vice_rows = "".join(f"<li>{n}: <b>{s}</b> <s>{w}</s></li>" for n, s, w in VICE_DEALS)
    pick = [IGS_DEALS[0], IGS_DEALS[1], IGS_DEALS[7], IGS_DEALS[6]]
    igs_rows = "".join(f"<li>{n}: <b>{s}</b> <s>{w}</s></li>" for n, s, w, _, _ in pick)
    return f'''<section class="live-now" id="live-now" data-cgg="nov15-live" aria-labelledby="live-h">
<p class="live-tag"><span class="dot" aria-hidden="true"></span>Live now &middot; prices checked {CHECKED_H}</p>
<h2 id="live-h">Black Friday golf sales that are <em>already on</em></h2>
<div class="live-grid">
<div class="live-card"><h3>Vice Golf Black Friday</h3><ul>{vice_rows}</ul>
<p class="small">Sale price, then Vice's own &ldquo;was&rdquo; price, as shown on vicegolf.com/black-friday-deals on {CHECKED_H}. Vice lists 3-for-2 on all gloves (live now), new ball drops from 16 November and an apparel sale from 21 November.</p>
<p class="aff-cta">{a_aff(vice(prefix + "-live-vice"), "vice-golf", "Shop Vice Golf")}</p>
<p class="small">{VICE_NOTE}</p></div>
<div class="live-card"><h3>The Indoor Golf Shop holiday sale</h3><ul>{igs_rows}</ul>
<p class="small">Sale price, then the shop's compare-at price, as listed on shopindoorgolf.com on {CHECKED_H}. The shop's 9 November announcement says its Holiday Sale runs through 14 December.</p>
<p class="aff-cta">{a_aff(igs(prefix + "-live-igs", IGS_BF), "indoor-golf-shop", "See the Black Friday deals")}</p></div>
</div>
<p class="note">Prices change often and every retailer sets its own. Check the price in your basket before you buy.</p>
</section>
'''


def gift_guide():
    rel = "offers/index.html"
    h = rd(rel)
    h = re.sub(r"Updated \d+ \w+ 2026", f"Updated {CHECKED_H}", h, count=1)
    if 'data-cgg="nov15-live"' not in h:
        h = h.replace('<nav class="gift-jump"', live_strip("gift") + f'<p class="bf-link"><a class="more" href="/{BF_SLUG}/">Every Black Friday golf deal we can link to, dated</a></p>\n<nav class="gift-jump"', 1)
        h = h.replace('<a href="#under-50">Under $50</a>', '<a href="#live-now">Live now</a> <a href="#under-50">Under $50</a> <a href="#stocking-stuffers">Stocking stuffers</a>', 1)
        h = h.replace('<h2 id="under-50">Under $50: stocking stuffers for putters</h2>', '<h2 id="under-50">Golf gifts under $50</h2>', 1)
        h = h.replace("Check the minimum order and personalisation cut-off dates if you need delivery before the holidays.</p>",
                      f"Check the minimum order and personalisation cut-off dates if you need delivery before the holidays. On {CHECKED_H} Vice's Black Friday page listed Vice Pro balls at $179.94 for 6 dozen (was $239.94), which works out to $29.99 a dozen. {VICE_NOTE}</p>", 1)
        stock = f'''
<h2 id="stocking-stuffers">Golf stocking stuffers</h2>
<p>Stocking stuffers should be small, used every round and a little bit cheeky. These all fit in a stocking:</p>
<ul class="checklist">
<li><strong>A sleeve of personalised balls.</strong> Their name, a nickname or a running joke from the group chat.</li>
<li><strong>A ball marker and a pocket of tees.</strong> Cheap, and nobody ever has enough.</li>
<li><strong>A printed side-game card and an invite.</strong> Print our free <a href="/games/wolf/">Wolf scorecard</a> or <a href="/games/nassau/">Nassau tracker</a>, write &ldquo;Saturday. You&rsquo;re in.&rdquo; on it, and you have a gift that costs nothing and gets used.</li>
<li><strong>Foam practice balls.</strong> For the living-room course and the hallway putting ladder in our <a href="/get-better/putting-ladder-drill/">putting ladder drill</a>.</li>
<li><strong>A Snake token.</strong> Any rubber snake will do. Whoever three-putts last carries it. Rules: <a href="/games/snake/">Snake</a>.</li>
</ul>
<div class="gift-card">
  <h3>Vice Golf: personalised balls</h3>
  <p>Vice prints names and logos on its golf balls; our link opens the personalisation page. Order early, because personalised items take longer to ship.</p>
  <p class="aff-cta">{a_aff(vice("gift-guide-stocking"), "vice-golf", "Personalise Vice balls")}</p>
</div>
'''
        h = h.replace('\n<h2 id="backyard">', stock + '\n<h2 id="backyard">', 1)
        h = h.replace(igs("gift-guide-indoor") + '"', igs("gift-guide-indoor", IGS_GREENS) + '"', 1)
        h = h.replace("so you can compare sizes and features in one place.</p>",
                      f"so you can compare sizes and features in one place. On {CHECKED_H} it listed the Perfect Practice Putting Green at $179.99 (was $199.99) and the Big Moss Competitor Putting Green &amp; Chipping Mat at $199.00 (was $235.00).</p>", 1)
        h = h.replace(igs("gift-guide-simulators") + '"', igs("gift-guide-simulators", IGS_BF) + '"', 1)
        h = h.replace("with options from entry level to full home-studio builds.</p>",
                      f"with options from entry level to full home-studio builds. On {CHECKED_H} its Black Friday collection listed the SkyTrak ST MAX launch monitor at $1,695.00 (was $2,995.00) and the Rapsodo MLM2PRO at $549.99 (was $699.99).</p>", 1)
        h = h.replace("Golf retailers often start promotions earlier in the month. A few habits help you buy well:</p>",
                      f'Golf retailers often start promotions earlier in the month, and this year several already have: see our dated <a href="/{BF_SLUG}/">Black Friday golf deals 2026</a> page. A few habits help you buy well:</p>', 1)
        h = h.replace('<p class="note">Prices, stock and promotions change often and are set by each retailer. Check the retailer\'s site before you buy.</p>',
                      f'<p class="note">Prices on this page were checked on {CHECKED_H}. Prices, stock and promotions change often and are set by each retailer. Check the retailer\'s site before you buy.</p>', 1)
        h = h.replace('<section class="dhero gift"><div class="wrap"><div class="in"><div>',
                      '<section class="dhero gift"><div class="wrap"><div class="in"><div>\n  <p class="crumbs"><a href="/">Home</a> / <a href="/gear/">Gear &amp; Gifts</a> / <span>Gift Guide 2026</span></p>', 1)
    h = add_ld(h, crumbs(("Home", "/"), ("Gear & Gifts", "/gear/"), ("Gift Guide 2026", "/offers/")), "nov15-crumbs")
    h = add_ld(h, {"@context": "https://schema.org", "@type": "Article", "headline": "Crazy Golf Gift Guide 2026",
                   "description": html.unescape(TITLES[rel][1]), "image": "https://crazygolfgame.com/images/photos/glove-balls-putter-1600.webp",
                   "datePublished": "2026-10-09", "dateModified": CHECKED, "mainEntityOfPage": "https://crazygolfgame.com/offers/",
                   "author": {"@type": "Organization", "name": "The Crazy Golf Game team"},
                   "publisher": {"@type": "Organization", "name": "Crazy Golf Game", "logo": {"@type": "ImageObject", "url": "https://crazygolfgame.com/images/brand/mark-v4.png"}}}, "nov15-article")
    sections = [("Live now: Black Friday golf sales", "#live-now"), ("Golf gifts under $50", "#under-50"), ("Golf stocking stuffers", "#stocking-stuffers"),
                ("Backyard and party games", "#backyard"), ("Indoor putting mats and greens", "#indoor"), ("Simulators and launch monitors", "#simulators"),
                ("Experience gifts", "#experiences")]
    h = add_ld(h, {"@context": "https://schema.org", "@type": "ItemList", "name": "Crazy Golf Gift Guide 2026",
                   "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "url": "https://crazygolfgame.com/offers/" + a} for i, (n, a) in enumerate(sections)]}, "nov15-itemlist")
    wr(rel, h)


def gear_page():
    rel = "gear/index.html"
    h = rd(rel)
    # match the closing quote so an already deep-linked href is left alone on re-runs
    h = h.replace(igs("gear-pillar-mats") + '"', igs("gear-pillar-mats", IGS_GREENS) + '"', 1)
    h = h.replace(igs("gear-pillar-sim") + '"', igs("gear-pillar-sim", IGS_BF) + '"', 1)
    if 'data-cgg="nov15-live"' not in h:
        h = h.replace('<section class="sec tight" style="padding-top:0">', '<section class="sec tight" style="padding-top:0">' + live_strip("gear"), 1)
    wr(rel, h)


# ---------------------------------------------------------------- Black Friday page
def bf_page():
    rel = f"{BF_SLUG}/index.html"
    src = rd("offers/index.html")
    url = f"https://crazygolfgame.com/{BF_SLUG}/"
    title = "Black Friday Golf Deals 2026 (Prices Checked) | CGG"
    desc = f"Black Friday 2026 golf deals with prices copied from Vice Golf and The Indoor Golf Shop on {CHECKED_H}: balls, launch monitors, putting greens."
    head_end = src.index("</head>")
    head = src[:head_end]
    head = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", head, flags=re.S)
    head = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', head)
    head = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">', head)
    head = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">', head)
    head = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="Black Friday Golf Deals 2026">', head)
    head = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{desc}">', head)
    head = re.sub(r'<meta property="og:image" content="[^"]*">', '<meta property="og:image" content="https://crazygolfgame.com/images/og/range-buckets.jpg">', head)
    head = re.sub(r'<script type="application/ld\+json"[^>]*>.*?</script>\n', "", head, flags=re.S)
    head = re.sub(r'<link rel="preload" as="image"[^>]*data-cgg="nov15-hero">\n', "", head)
    hero_img = ('<img src="/images/photos/range-buckets-800.webp" srcset="/images/photos/range-buckets-800.webp 800w, /images/photos/range-buckets-1600.webp 1600w" '
                'sizes="(max-width:860px) 100vw, 560px" width="800" height="536" alt="Buckets of range balls lined up on a practice ground" fetchpriority="high" decoding="async">')
    head = head.replace('<link rel="stylesheet" href="/assets/v4.css">\n',
                        '<link rel="stylesheet" href="/assets/v4.css">\n<link rel="preload" as="image" href="/images/photos/range-buckets-800.webp" imagesrcset="/images/photos/range-buckets-800.webp 800w, /images/photos/range-buckets-1600.webp 1600w" imagesizes="(max-width:860px) 100vw, 560px" fetchpriority="high" data-cgg="nov15-hero">\n', 1)
    schema = (ld(crumbs(("Home", "/"), ("Gear & Gifts", "/gear/"), ("Black Friday Golf Deals 2026", f"/{BF_SLUG}/")))
              + ld({"@context": "https://schema.org", "@type": "Article", "headline": "Black Friday Golf Deals 2026", "description": desc,
                    "image": "https://crazygolfgame.com/images/photos/range-buckets-1600.webp", "datePublished": CHECKED, "dateModified": CHECKED,
                    "mainEntityOfPage": url, "author": {"@type": "Organization", "name": "The Crazy Golf Game team"},
                    "publisher": {"@type": "Organization", "name": "Crazy Golf Game", "logo": {"@type": "ImageObject", "url": "https://crazygolfgame.com/images/brand/mark-v4.png"}}})
              + ld({"@context": "https://schema.org", "@type": "ItemList", "name": "Black Friday golf deals 2026",
                    "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": html.unescape(n)} for i, n in enumerate([d[0] for d in VICE_DEALS] + [d[0] for d in IGS_DEALS])]}))
    pre_main = src[head_end:src.index("<main")]
    post_main = src[src.index("</main>") + len("</main>"):]
    vice_rows = "".join(f"<tr><td>{n}</td><td><b>{s}</b></td><td><s>{w}</s></td></tr>" for n, s, w in VICE_DEALS)
    igs_rows = "".join(f'<tr><td>{n}</td><td><b>{s}</b></td><td><s>{w}</s></td><td>{a_aff(igs("bf-" + k, u), "indoor-golf-shop", "View", "aff-link")}</td></tr>'
                       for n, s, w, u, k in IGS_DEALS)
    main = f'''<main id="main">
<section class="dhero gift"><div class="wrap"><div class="in"><div>
  <p class="crumbs"><a href="/">Home</a> / <a href="/gear/">Gear &amp; Gifts</a> / <span>Black Friday deals</span></p>
  <p class="kicker">#ad &middot; Deals &middot; Prices checked {CHECKED_H}</p>
  <h1>Black Friday Golf Deals <em>2026</em></h1>
  <p class="stamp">Only sales we can link to. Only prices we saw on the shop's own page.</p>
  <p class="lead">Black Friday is Friday 27 November 2026 and Cyber Monday is Monday 30 November. Two of the golf shops we work with already have their sales running. Here is what they listed on {CHECKED_H}, with the date, so you know how fresh it is.</p>
</div><div class="ph-col"><figure class="ph r43">{hero_img}<figcaption class="cred">Illustrative photo, not a product we link to. Photo: Brian J. McDermott / <a href="https://commons.wikimedia.org/wiki/File:2009_US_Open_-_Nike_golf_balls_(3648699153).jpg" rel="noopener">Wikimedia Commons</a>, <a href="https://creativecommons.org/licenses/by/2.0" rel="license noopener">CC BY 2.0</a></figcaption></figure></div></div></div></section>
<div class="wrap narrow prose page-body">
<div class="aff-disclosure big" id="disclosure" data-aff="disclosure">
  <p><strong>#ad &middot; Affiliate disclosure.</strong> This page contains affiliate links, each labelled &ldquo;Affiliate link&rdquo;. If you buy through one, Crazy Golf Game (published by Marketing Apes LLC) may earn a commission. You pay the same price. We have not used every product listed; we copy the shop's own price and &ldquo;was&rdquo; price on the date shown. Partners do not see or approve this page.</p>
</div>
<p class="note"><strong>How we check:</strong> we open each shop's sale page and copy the listed sale price and the shop's own comparison (&ldquo;was&rdquo; or compare-at) price. We update this page by hand, so a price can change after the date shown. Always check the price in your basket.</p>

<h2 id="vice">Vice Golf: Black Friday is live</h2>
<p>Vice sells golf balls, clubs, bags and rangefinders direct. Its Black Friday page says &ldquo;daily deals&rdquo; and lists 3-for-2 on all gloves (live now) and more drops to come: new ball drops from 16 November and an apparel sale from 21 November.</p>
<div class="table-wrap"><table>
<thead><tr><th>Item (as listed by Vice)</th><th>Sale price</th><th>Was</th></tr></thead>
<tbody>{vice_rows}</tbody></table></div>
<p class="small">Source: vicegolf.com/black-friday-deals, checked {CHECKED_H}. Ball prices on that page are shown for 6 dozen; $179.94 for 6 dozen Vice Pro is $29.99 a dozen.</p>
<div class="gift-card">
  <h3>Shop Vice Golf</h3>
  <p>{VICE_NOTE}</p>
  <p class="aff-cta">{a_aff(vice("bf-vice"), "vice-golf", "Go to Vice Golf")}</p>
</div>

<h2 id="indoor-golf-shop">The Indoor Golf Shop: holiday sale on launch monitors, greens and nets</h2>
<p>The Indoor Golf Shop specialises in home golf: launch monitors, simulator enclosures, hitting mats, nets and putting greens. Its 9 November announcement says the Holiday Sale runs through 14 December.</p>
<div class="table-wrap"><table>
<thead><tr><th>Item (as listed by the shop)</th><th>Sale price</th><th>Was</th><th>Link</th></tr></thead>
<tbody>{igs_rows}</tbody></table></div>
<p class="small">Source: shopindoorgolf.com product pages and its Black Friday collection, checked {CHECKED_H}. &ldquo;Was&rdquo; is the shop's own compare-at price.</p>
<div class="gift-card">
  <h3>Browse the whole Black Friday collection</h3>
  <p>More than a hundred items were in the shop's Black Friday collection when we checked, from golf nets to full simulator packages.</p>
  <p class="aff-cta">{a_aff(igs("bf-igs-collection", IGS_BF), "indoor-golf-shop", "See the Black Friday collection")}</p>
</div>

<h2 id="before-you-buy">Before you buy a big golf gift</h2>
<ul class="checklist">
<li><strong>Measure the room.</strong> Launch monitors and enclosures list minimum ceiling height, width and depth. Check with a full swing in mind.</li>
<li><strong>Read what's included.</strong> Some launch monitors need a subscription for full features.</li>
<li><strong>Check the return policy and shipping time.</strong> Big parcels and personalised balls take longer, and returns on large items can cost money.</li>
<li><strong>Buy for the golfer, not the discount.</strong> If they won't use it every week, a smaller gift wins.</li>
</ul>

<h2 id="free">The best free gift in golf</h2>
<p>A standing Saturday game. Print a <a href="/games/wolf/">Wolf scorecard</a>, a <a href="/games/nassau/">Nassau tracker</a> or a <a href="/games/skins/">Skins calculator</a>, put it in a card, and invite them. More gift ideas by budget are in our <a href="/offers/">Crazy Golf Gift Guide 2026</a>.</p>

<section class="faq" aria-labelledby="faq-h">
<h2 id="faq-h">Frequently asked questions</h2>
<details><summary>When is Black Friday 2026?</summary><p>Friday 27 November 2026. Cyber Monday is Monday 30 November 2026.</p></details>
<details><summary>Are these the lowest prices of the year?</summary><p>We can't promise that. We only show what each shop listed on the date we checked, next to the shop's own &ldquo;was&rdquo; price.</p></details>
<details><summary>Do you earn money from these links?</summary><p>Yes. Links marked &ldquo;Affiliate link&rdquo; may earn us a commission if you buy, at no extra cost to you.</p></details>
</section>
<p class="note">Prices checked {CHECKED_H}. Prices, stock and promotions change often and are set by each retailer.</p>
</div>
</main>'''
    wr(rel, head + schema + pre_main + main + post_main)


# ---------------------------------------------------------------- css
CSS_MARK = "/* nov15: contrast, headings, live-now, side games */"
CSS = CSS_MARK + """
:root{--flag-d:#C8340F}
.btn,.btn-light,.aff-btn,.prose a.btn,.prose2 a.btn,.prose a.aff-btn{color:var(--ink)!important}
.btn:hover,.aff-btn:hover,.prose a.btn:hover,.prose2 a.btn:hover,.prose a.aff-btn:hover{color:#fff!important}
.btn-ghost{color:var(--ink)!important}.btn-ghost:hover{color:#fff!important}
.btn-line{color:#fff!important}.btn-line:hover{color:var(--ink)!important}
.btn-dark{color:#fff!important}.btn-dark:hover{color:var(--ink)!important}
.util{color:var(--ink)}.tick a{color:var(--ink);border-bottom-color:rgba(13,20,16,.55)}.tick span::after{background:var(--ink)}
.hdr nav a.cta{color:var(--ink)}.hdr nav a.cta:hover{color:var(--ink);background:#fff}
.bet .odds{color:var(--ink)}.socials a:hover{color:var(--ink)}
.ftr .fh{font:800 .76rem/1 var(--f);font-stretch:80%;font-style:normal;letter-spacing:.14em;text-transform:uppercase;color:var(--flag);margin:8px 0 16px}
.toc .toc-h{font:800 .74rem/1 var(--f);font-style:normal;letter-spacing:.12em;text-transform:uppercase;color:var(--ink);margin:0 0 12px}
.live-now{background:var(--ink);color:#E9ECE6;border-radius:4px;padding:26px 24px 18px;margin:28px 0;box-shadow:8px 8px 0 var(--flag)}
.live-now h2{color:#fff;margin:6px 0 16px}.live-now h2 em{color:var(--flag)}
.live-tag{display:inline-flex;align-items:center;gap:8px;font:800 .72rem/1 var(--f);font-stretch:80%;letter-spacing:.12em;text-transform:uppercase;color:var(--ink);background:var(--volt);padding:6px 9px;border-radius:2px;margin:0}
.live-tag .dot{width:8px;height:8px;border-radius:50%;background:var(--flag)}
.live-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}@media (max-width:760px){.live-grid{grid-template-columns:1fr}}
.live-card{background:var(--ink-2);border-top:3px solid var(--flag);padding:16px 16px 12px;border-radius:0 0 3px 3px}
.live-card h3{color:#fff;margin:0 0 10px}.live-card ul{margin:0 0 10px;padding-left:18px}.live-card li{margin:4px 0}
.live-card b{color:var(--volt)}.live-card s{color:#9AA39C;margin-left:4px}
.live-now .small,.live-now .note{color:#BFC4BD;font-size:.82rem}
.live-now a:not(.btn){color:#fff}
.aff-note{font-size:.8rem;color:var(--muted);margin:10px 0 0}
.sidegames{border:3px solid var(--ink);border-radius:4px;padding:18px 20px;margin:34px 0;background:var(--paper)}
.sidegames .sg-h{font:900 italic 1.3rem/1.1 var(--f);font-stretch:70%;text-transform:uppercase;margin:0 0 8px}.sidegames .sg-h em{color:var(--flag-d)}
.sidegames .sg-links{display:flex;flex-wrap:wrap;gap:8px 14px;margin:0 0 6px;font-weight:800}
.aff-link{font-weight:800}
.bf-link{margin:0 0 18px}
"""


def css():
    p = SITE / "assets/v4.css"
    s = p.read_text(encoding="utf8")
    if CSS_MARK in s:
        s = s[:s.index(CSS_MARK)]
    p.write_text(s.rstrip("\n") + "\n" + CSS, encoding="utf8")


# ---------------------------------------------------------------- sitemap
def sitemap():
    p = SITE / "sitemap.xml"
    s = p.read_text(encoding="utf8")
    s = re.sub(r"<lastmod>[^<]*</lastmod>", f"<lastmod>{CHECKED}</lastmod>", s)
    if BF_SLUG not in s:
        s = s.replace("</urlset>", f"  <url><loc>https://crazygolfgame.com/{BF_SLUG}/</loc><lastmod>{CHECKED}</lastmod></url>\n</urlset>")
    p.write_text(s, encoding="utf8")


def main():
    gift_guide()
    gear_page()
    for rel in pages():
        if rel == f"{BF_SLUG}/index.html":
            continue
        h = rd(rel)
        h = fix_head(rel, h)
        h = fix_meta(rel, h)
        h = fix_chrome(rel, h)
        h = article_crumbs(rel, h)
        h = gear_and_strip(rel, h)
        wr(rel, h)
    bf_page()   # built from the finished gift guide, so it inherits the new chrome
    h = rd(f"{BF_SLUG}/index.html")
    wr(f"{BF_SLUG}/index.html", fix_head(f"{BF_SLUG}/index.html", h))
    css()
    sitemap()


if __name__ == "__main__":
    main()
