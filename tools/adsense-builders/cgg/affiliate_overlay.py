#!/usr/bin/env python3
"""CGG affiliate overlay (draft 2026-10-09).

Runs AFTER build.py on the generated site in <repo>/cgg. Idempotent: every
insert is guarded by a marker, so running it twice changes nothing.

What it does
  * Replaces the off-theme Flextail /offers/ page with "Crazy Golf Gift Guide 2026".
  * Adds "Gift Guide" to the main + footer nav on every generated page.
  * Adds an FTC-style #ad disclosure + labelled affiliate callouts to six guides.
  * Updates home / about / privacy copy that described the old single offer.
  * Bumps sitemap <lastmod> for touched URLs.

Tracking links: ONLY links already issued by the networks are used.
  CJ  (CGG property PID 101511730): The Indoor Golf Shop, Vice Golf. `sid` = CJ's
      standard per-click shopper/sub-ID parameter, used for page-level reporting.
  Impact (partner 335485): Best Choice Products base link from the Impact API.
      `subId1` = Impact's standard sub-ID parameter.
Anything without an issued link is rendered as a visible TODO placeholder.
Before deploy: `rg -n "TODO\\(Kyle\\)|data-todo" cgg/` must return nothing.
"""
import html, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
SITE = ROOT / "cgg"
TODAY = "2026-10-09"
TODAY_H = "9 October 2026"

LINKS = {
    "indoor-golf-shop": ("The Indoor Golf Shop", "https://www.dpbolvw.net/click-101511730-17315782?sid=cgg-{p}"),
    "vice-golf": ("Vice Golf", "https://www.tkqlhce.com/click-101511730-14054834?sid=cgg-{p}"),
    "best-choice-products": ("Best Choice Products", "https://bestchoiceproducts.sjv.io/c/335485/2873487/33479?subId1=cgg-{p}"),
}
TODOS = {
    "mms-personalized": "M&M's (CJ 2603623, joined): generate a CJ link under CGG PID 101511730",
    "groupon": "Groupon (CJ 5840172, joined): generate a CJ link under CGG PID 101511730 (existing link is the DDM PID)",
    "golf-partner": "GOLF Partner (Impact 17026, active): generate an Impact tracking link",
}


def aff(offer, page, label):
    name, url = LINKS[offer]
    href = html.escape(url.format(p=page), quote=True)
    return (f'<a class="btn aff-btn" href="{href}" rel="sponsored noopener" target="_blank" '
            f'data-offer="{offer}">{html.escape(label)}</a> <span class="aff-tag">Affiliate link</span>')


def todo(key, label):
    return (f'<span class="aff-todo" data-todo="{html.escape(TODOS[key], quote=True)}">'
            f'TODO(Kyle): {html.escape(label)} &middot; {html.escape(TODOS[key])}</span>')


def box(offer, page, title, body, label):
    return (f'\n<aside class="aff-box" data-aff="{offer}">\n  <p class="aff-label">#ad &middot; Partner pick</p>\n'
            f'  <h3>{title}</h3>\n  <p>{body}</p>\n  <p class="aff-cta">{aff(offer, page, label)}</p>\n</aside>\n')


ART_DISCLOSURE = ('<div class="aff-disclosure" data-aff="disclosure"><strong>#ad</strong> This guide contains affiliate links, '
                  'marked &ldquo;Affiliate link&rdquo;. If you buy through one we may earn a commission, at no extra cost to you. '
                  '<a href="/offers/#disclosure">How this works</a>.</div>')

# slug -> list of (h2 text whose section the box closes, box html)
ARTICLE_BOXES = {
    "casual-golfer-gear-guide": [
        ("Balls: brightness and purpose", box("vice-golf", "gear-balls", "Bright balls you can actually find",
            "If your backyard course eats white balls, Vice Golf sells coloured and matte-finish balls and offers personalisation, which makes a tidy small gift. Pick a bright colour for lawns and flower beds.",
            "See Vice Golf balls")),
        ("Putting mats and practice aids", box("indoor-golf-shop", "gear-mats", "Where to compare putting mats and greens",
            "The Indoor Golf Shop carries roll-out putting mats and larger home putting greens from several brands in one place, so you can compare length, ball returns and surface speed side by side before you buy.",
            "Compare putting mats")),
        ("Backyard mini golf kits", box("best-choice-products", "gear-kits", "Backyard and kids' game sets",
            "Best Choice Products stocks backyard games and kids' golf sets that pack away into a box, a handy shortcut if you want cups, flags and a few obstacles without building everything from scratch.",
            "Browse backyard game sets")),
    ],
    "putting-practice-games": [
        ("Practising at home without a green", box("indoor-golf-shop", "putting-games", "Want a proper surface for these games?",
            "Ladder drills and lag games work best on a mat long enough for a few distances. The Indoor Golf Shop lists mats and indoor greens by length, which is the first thing to check against the space you have.",
            "Find a mat that fits your room")),
    ],
    "backyard-mini-golf-course": [
        ("Step 2: Choose your cups", box("best-choice-products", "backyard-cups", "Short on time? Start with a set",
            "Homemade cups are half the fun, but a ready-made backyard golf or lawn-game set gives you weatherproof cups and flags on day one. Best Choice Products has several outdoor game sets worth a look.",
            "See backyard game sets")),
    ],
    "mini-golf-with-kids": [
        ("Bringing the fun home", box("best-choice-products", "kids-home", "A kids' golf set for the garden",
            "Plastic kids' golf sets with oversized heads and soft balls make the backyard round safe for little swingers. Best Choice Products sells kids' sets alongside other outdoor play gear; check the age range on the box.",
            "Browse kids' golf sets")),
    ],
    "indoor-mini-golf-course": [
        ("Pick the right balls and putters", box("indoor-golf-shop", "indoor-mats", "Make the hallway hole permanent",
            "If the living-room course becomes a weekly habit, a roll-out putting mat gives you one smooth, repeatable hole that stores under the sofa. The Indoor Golf Shop groups mats by size and features.",
            "Look at indoor putting mats")),
    ],
    "mini-golf-tournament-at-home": [
        ("Prizes and awards", box("vice-golf", "tournament-prizes", "A prize golfers will actually use",
            "Next to the homemade trophy, a sleeve of personalised golf balls is a fun runner-up prize. Vice Golf offers personalisation and bright colours that are easy to spot on a backyard course.",
            "See personalised balls")),
    ],
}

NAV_OLD = '<a href="/articles/"{cur}>Articles</a>'


def add_nav(doc, current=False):
    if 'data-nav="gift-guide"' in doc:
        return doc
    cur = ' aria-current="page"' if current else ""
    def main_nav(m):
        block = m.group(0)
        return re.sub(r'(<a href="/articles/"[^>]*>Articles</a>)',
                      r'\1\n      <a href="/offers/" data-nav="gift-guide"' + cur + '>Gift Guide</a>', block, count=1)
    doc = re.sub(r'<nav aria-label="Main">.*?</nav>', main_nav, doc, count=1, flags=re.S)
    doc = re.sub(r'(<nav aria-label="Footer">\s*<a href="/articles/">Articles</a>)',
                 r'\1\n      <a href="/offers/" data-nav="gift-guide-foot">Gift Guide</a>', doc, count=1)
    return doc


def patch_article(slug, boxes):
    p = SITE / "articles" / slug / "index.html"
    doc = p.read_text()
    if 'data-aff="disclosure"' not in doc:
        doc = re.sub(r'(<p class="byline">.*?</p>)', r'\1\n    ' + ART_DISCLOSURE, doc, count=1, flags=re.S)
    for h2, b in boxes:
        offer = re.search(r'data-aff="([^"]+)"', b).group(1)
        marker = f'<h2>{h2}</h2>'
        i = doc.find(marker)
        assert i >= 0, (slug, h2)
        j = doc.find("<h2", i + len(marker))
        section = doc[i:j]
        if f'data-aff="{offer}"' in section:
            continue
        doc = doc[:j] + b.lstrip("\n") + "\n" + doc[j:]
    if slug == "casual-golfer-gear-guide":
        doc = doc.replace(
            '<p>Occasionally we point readers to a partner offer related to days outdoors. Those pages are clearly labelled as advertising, and you can find our current one on the <a href="/offers/">offers page</a> (#ad). Nothing in this guide depends on buying anything.</p>',
            '<p>Where a category above has a partner pick, it is marked #ad and the link is labelled. For seasonal ideas sorted by budget, see our <a href="/offers/">Crazy Golf Gift Guide 2026</a> (#ad). Nothing in this guide depends on buying anything.</p>')
    # visible updated date for edited guides
    doc = doc.replace('Last updated <time datetime="2026-09-23">23 September 2026</time>',
                      f'Last updated <time datetime="{TODAY}">{TODAY_H}</time>')
    doc = doc.replace('"dateModified": "2026-09-23"', f'"dateModified": "{TODAY}"')
    p.write_text(doc)


def template_parts():
    ref = (SITE / "about" / "index.html").read_text()
    top = ref[:ref.index('<main id="main">') + len('<main id="main">')]
    bottom = ref[ref.index("</main>"):]
    return top, bottom


def gift_guide():
    top, bottom = template_parts()
    title = "Crazy Golf Gift Guide 2026: Putting, Backyard and Simulator Gifts"
    desc = ("Golf gift ideas for every budget: stocking stuffers under $50, backyard and party games, indoor putting mats "
            "and big-ticket home simulators, plus how to shop Black Friday golf deals.")
    top = re.sub(r"<title>.*?</title>", f"<title>{html.escape(title)} | Crazy Golf Game</title>", top, flags=re.S)
    top = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{html.escape(desc, quote=True)}">', top)
    top = top.replace('href="https://crazygolfgame.com/about/"', 'href="https://crazygolfgame.com/offers/"')
    top = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{html.escape(title, quote=True)}">', top)
    top = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{html.escape(desc, quote=True)}">', top)
    top = top.replace('content="https://crazygolfgame.com/about/"', 'content="https://crazygolfgame.com/offers/"')
    top = top.replace('/images/og.svg"', '/images/casual-golfer-gear-guide.svg"')
    top = top.replace('<a href="/about/" aria-current="page">About</a>', '<a href="/about/">About</a>')
    top = add_nav(top, current=True)
    bottom = add_nav(bottom)
    P = "gift-guide"
    body = f"""
<section class="wrap narrow page-head gift-head">
  <p class="kicker">#ad &middot; Gift guide &middot; Updated {TODAY_H}</p>
  <h1>Crazy Golf Gift Guide 2026</h1>
  <p class="lead">Gifts for the putt-putt champion, the backyard course builder and the friend who has started talking about launch monitors. Sorted by budget, with a few tips for shopping the Black Friday and Cyber Monday golf sales.</p>
</section>
<div class="wrap narrow prose page-body">
<div class="aff-disclosure big" id="disclosure" data-aff="disclosure">
  <p><strong>#ad &middot; Affiliate disclosure.</strong> This page contains affiliate links. Every one is labelled &ldquo;Affiliate link&rdquo;. If you buy through one, Crazy Golf Game (published by Marketing Apes LLC) may earn a commission. You pay the same price. We have not used every product in these stores; we describe the type of gift and what to check before you buy. Partners do not see or approve this page.</p>
</div>
<figure class="hero-fig"><img src="/images/casual-golfer-gear-guide.svg" alt="Illustration of a putter, bright golf balls, a putting mat and a small flag laid out like gifts" width="1200" height="675"></figure>
<nav class="gift-jump" aria-label="Gift guide sections">
  <a href="#under-50">Under $50</a> <a href="#backyard">Backyard &amp; party</a> <a href="#indoor">Indoor putting</a> <a href="#simulators">Big-ticket simulators</a> <a href="#experiences">Experiences</a> <a href="#black-friday">Black Friday tips</a>
</nav>

<h2 id="under-50">Under $50: stocking stuffers for putters</h2>
<p>Small golf gifts land best when they are personal or slightly silly. A few ideas that suit casual players as well as regular golfers:</p>
<ul class="checklist">
<li><strong>Bright or personalised golf balls.</strong> Coloured balls are easier to find on a lawn, and a name or in-joke printed on the ball makes a sleeve feel like a real present.</li>
<li><strong>A ball marker and a tee pouch.</strong> Cheap, pocket-sized and used every round.</li>
<li><strong>Foam practice balls.</strong> Perfect for the living-room course in our <a href="/articles/indoor-mini-golf-course/">indoor mini golf guide</a>, and kinder to the furniture.</li>
<li><strong>A DIY tournament kit.</strong> Print a scorecard, add a spray-painted trophy and a deck of challenge cards from our <a href="/articles/mini-golf-party-games/">party games list</a>.</li>
<li><strong>Golf-themed sweets.</strong> Personalised chocolate in golf colours is a fun stocking filler for the 19th hole.</li>
</ul>
<div class="gift-card">
  <h3>Vice Golf: coloured and personalised balls</h3>
  <p>Vice Golf sells golf balls in several colours and finishes and offers personalisation. Check the minimum order and personalisation cut-off dates if you need delivery before the holidays.</p>
  <p class="aff-cta">{aff("vice-golf", P + "-under50", "Shop Vice Golf balls")}</p>
</div>
<div class="gift-card">
  <h3>Personalised golf-colour chocolates</h3>
  <p>A bag of personalised sweets in club colours is a light-hearted add-on to any golf gift.</p>
  <p class="aff-cta">{todo("mms-personalized", "link pending")}</p>
</div>

<h2 id="backyard">Backyard and party games</h2>
<p>For families and hosts, the best golf gift is often one everyone can play. Backyard sets with portable cups, flags and soft-edged obstacles turn a lawn into a course in minutes, and pack away when the grass needs mowing. Our <a href="/articles/backyard-mini-golf-course/">backyard course guide</a> explains how to lay out nine holes without damaging the lawn.</p>
<div class="table-wrap"><table>
<thead><tr><th>Who it is for</th><th>Look for</th><th>Skip</th></tr></thead>
<tbody>
<tr><td>Young children</td><td>Plastic clubs, oversized heads, soft balls, an age range on the box</td><td>Real metal clubs cut down to size</td></tr>
<tr><td>Party hosts</td><td>Several cups and flags, quick setup, a carry bag</td><td>Sets with lots of single-use gadgets</td></tr>
<tr><td>Mixed groups</td><td>Lawn games that pair with putting, such as target or toss games</td><td>Anything that needs a perfectly flat lawn</td></tr>
</tbody></table></div>
<div class="gift-card">
  <h3>Best Choice Products: backyard and kids' game sets</h3>
  <p>A large catalogue of outdoor games, kids' play sets and garden gear in one shop, handy if you are buying for several people at once.</p>
  <p class="aff-cta">{aff("best-choice-products", P + "-backyard", "Browse backyard game sets")}</p>
</div>

<h2 id="indoor">Indoor putting: mats and home greens</h2>
<p>A putting mat is the gift that gets used every week through winter. Before choosing one, check three things against the room it will live in:</p>
<ol>
<li><strong>Length.</strong> Short mats are fine for holing short putts; a longer mat lets you practise distance control and the lag games in our <a href="/articles/putting-practice-games/">putting practice guide</a>.</li>
<li><strong>Ball return.</strong> Handy for solo practice, though some players prefer a flat cup that behaves more like a real hole.</li>
<li><strong>Storage.</strong> Roll-up mats tuck behind a sofa; larger fixed greens need a dedicated corner or garage space.</li>
</ol>
<div class="gift-card">
  <h3>The Indoor Golf Shop: putting mats and greens</h3>
  <p>A specialist retailer for indoor golf, with putting mats and larger home greens from several brands, so you can compare sizes and features in one place.</p>
  <p class="aff-cta">{aff("indoor-golf-shop", P + "-indoor", "Compare putting mats and greens")}</p>
</div>

<h2 id="simulators">Big-ticket: simulators, launch monitors and hitting nets</h2>
<p>If someone in the family is serious about getting better (or just loves gadgets), a home simulator or launch monitor is the headline gift. It is also the purchase where a little homework saves the most money and frustration.</p>
<ul class="checklist">
<li><strong>Measure the room first.</strong> Every simulator lists minimum ceiling height, width and depth. Check them against your space with a full swing in mind, not just standing room.</li>
<li><strong>Net or impact screen?</strong> A hitting net with a launch monitor is the simpler start; a full enclosure with a screen and projector is a bigger project.</li>
<li><strong>Know the running costs.</strong> Some launch monitors and simulator software need a subscription for full features. Read what is included.</li>
<li><strong>Plan the floor.</strong> A hitting mat that protects joints and the floor matters as much as the electronics.</li>
<li><strong>Allow for delivery and setup.</strong> Large packages can take longer to arrive and assemble, so order well before the holidays.</li>
</ul>
<div class="gift-card">
  <h3>The Indoor Golf Shop: simulator packages and launch monitors</h3>
  <p>Simulator packages, launch monitors, nets and hitting mats in one store, with options from entry level to full home-studio builds.</p>
  <p class="aff-cta">{aff("indoor-golf-shop", P + "-simulators", "Browse simulator packages")}</p>
</div>

<h2 id="experiences">Experience gifts and the friend getting serious</h2>
<p>Not every gift needs wrapping. A round at a local adventure golf course or an hour in a driving-range bay is a great date night or family outing; our <a href="/articles/mini-golf-date-night/">mini golf date night guide</a> has ideas to make it an event. For the friend graduating from putt-putt to the real thing, a good pre-owned club is a thoughtful upgrade.</p>
<div class="gift-card">
  <h3>Local mini golf and driving-range deals</h3>
  <p>Deal sites often list discounted rounds and bay time at local venues; check the expiry date and booking rules before gifting.</p>
  <p class="aff-cta">{todo("groupon", "link pending")}</p>
</div>
<div class="gift-card">
  <h3>Pre-owned clubs</h3>
  <p>Inspected second-hand clubs are a sensible first step into full-size golf before committing to a new set.</p>
  <p class="aff-cta">{todo("golf-partner", "link pending")}</p>
</div>

<h2 id="black-friday">How to shop the Black Friday and Cyber Monday golf sales</h2>
<p>In 2026, Black Friday falls on Friday 27 November and Cyber Monday on Monday 30 November. Golf retailers often start promotions earlier in the month. A few habits help you buy well:</p>
<ul class="checklist">
<li><strong>Make the list now.</strong> Decide who you are buying for and which tier above fits before the sales start, so a countdown timer does not decide for you.</li>
<li><strong>Read the return policy.</strong> Especially for mats, nets and simulators: large items can be costly to send back.</li>
<li><strong>Check shipping cut-offs.</strong> Personalised items and big parcels need extra time before the holidays.</li>
<li><strong>Size for the player.</strong> Kids' clubs go by height; putters by stance. Our <a href="/articles/casual-golfer-gear-guide/">casual golfer gear guide</a> explains what matters.</li>
<li><strong>Keep the gift receipt.</strong> Golfers are fussy about putters. Let them swap it.</li>
</ul>

<section class="faq" aria-labelledby="faq-h">
<h2 id="faq-h">Frequently asked questions</h2>
<details><summary>What is a good golf gift for a beginner?</summary><p>Something that makes practice fun: bright balls, a short putting mat, or a backyard set they can play with family. Save expensive clubs until they know they love the game.</p></details>
<details><summary>Is a home golf simulator worth it?</summary><p>For a regular golfer with the right space, it can mean year-round practice. Measure your room against the manufacturer's requirements and budget for the mat, net or screen and any software subscription.</p></details>
<details><summary>Do you earn money from these links?</summary><p>Yes. Links marked &ldquo;Affiliate link&rdquo; may earn us a commission if you buy, at no extra cost to you. That helps keep Crazy Golf Game free to read.</p></details>
</section>
<p class="note">Prices, stock and promotions change often and are set by each retailer. Check the retailer's site before you buy.</p>
</div>
"""
    return top + body + bottom


CSS_MARK = "/* aff-overlay */"
CSS = CSS_MARK + """
.aff-disclosure{background:var(--paper);border:3px dashed var(--ink);border-radius:14px;padding:10px 14px;font-size:.92rem;margin:12px 0 4px}
.aff-disclosure.big{font-size:1rem}.aff-disclosure p{margin:0}
.aff-box,.gift-card{background:var(--paper);border:3px solid var(--ink);border-radius:var(--radius);box-shadow:var(--shadow);padding:18px 20px;margin:22px 0}
.aff-box{background:#fffdf3}
.aff-label{font-family:var(--display);font-weight:600;font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--pink-d);margin:0 0 4px}
.aff-box h3,.gift-card h3{margin:0 0 6px}
.aff-cta{margin:10px 0 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.aff-tag{font-size:.8rem;font-weight:800;border:2px solid var(--ink);border-radius:999px;padding:2px 8px;background:var(--sun)}
.aff-todo{display:inline-block;font-family:monospace;font-size:.85rem;background:#ffe0ea;border:2px dashed var(--pink-d);border-radius:10px;padding:6px 10px;color:var(--pink-d)}
.gift-jump{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 8px}
.gift-jump a{font-family:var(--display);font-weight:600;text-decoration:none;border:3px solid var(--ink);border-radius:999px;padding:6px 12px;background:var(--sky);color:var(--ink)}
.gift-jump a:hover{background:var(--sun)}
.page-body h2[id]{scroll-margin-top:90px}
"""

JS_MARK = "/* aff-overlay: affiliate click tracking */"
JS = JS_MARK + """
(function () {
  var links = document.querySelectorAll('a[rel~="sponsored"]');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function () {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({event: 'affiliate_click', offer: this.getAttribute('data-offer'), href: this.href, page: location.pathname});
    });
  }
})();
"""


def main():
    # 1. gift guide replaces Flextail offers page
    (SITE / "offers" / "index.html").write_text(gift_guide())
    old_img = SITE / "offers" / "hero.jpg"
    if old_img.exists():
        old_img.unlink()
    # 2. nav on every generated page (skip /preview/, /offers/ done above)
    for p in SITE.rglob("*.html"):
        rel = p.relative_to(SITE).as_posix()
        if rel.startswith("preview/") or rel.startswith("offers/"):
            continue
        d = p.read_text()
        if '<nav aria-label="Main">' in d:
            p.write_text(add_nav(d))
    # 3. articles
    for slug, boxes in ARTICLE_BOXES.items():
        patch_article(slug, boxes)
    # 4. copy that described the old single offer
    rep = {
        "index.html": ('<p class="small"><strong>#ad</strong> We also keep one clearly labelled partner offer for outdoor days on our <a href="/offers/" rel="sponsored">offers page</a>. If you buy through it we may earn a commission.</p>',
                       '<p class="small"><strong>#ad</strong> Shopping for a golfer? Our <a href="/offers/">Crazy Golf Gift Guide 2026</a> sorts ideas by budget. It contains labelled affiliate links; if you buy through one we may earn a commission.</p>'),
        "about/index.html": ('and occasionally by a clearly labelled partner offer on our <a href="/offers/">offers page</a>.',
                             'and by clearly labelled affiliate links in some guides and our <a href="/offers/">gift guide</a>. If you buy through one, we may earn a commission at no extra cost to you.'),
        "privacy/index.html": ('<p>Our <a href="/offers/">offers page</a> contains a clearly labelled affiliate link. If you click it,',
                               '<p>Our <a href="/offers/">gift guide</a> and some articles contain affiliate links, each labelled &ldquo;Affiliate link&rdquo; and marked #ad. If you click one,'),
    }
    for rel, (a, b) in rep.items():
        p = SITE / rel
        d = p.read_text()
        if a in d:
            p.write_text(d.replace(a, b))
    # 5. css / js
    css = SITE / "assets" / "site.css"
    if CSS_MARK not in css.read_text():
        css.write_text(css.read_text().rstrip() + "\n\n" + CSS)
    for js in (SITE / "assets" / "site.js", pathlib.Path(__file__).parent / "site.js"):
        if JS_MARK not in js.read_text():
            js.write_text(js.read_text().rstrip() + "\n\n" + JS)
    # 6. sitemap lastmod for touched URLs
    sm = SITE / "sitemap.xml"
    s = sm.read_text()
    for u in ["/", "/offers/", "/about/", "/privacy/"] + [f"/articles/{k}/" for k in ARTICLE_BOXES]:
        s = re.sub(rf"(<loc>https://crazygolfgame\.com{re.escape(u)}</loc><lastmod>)[^<]+", rf"\g<1>{TODAY}", s)
    sm.write_text(s)
    print("overlay applied")


if __name__ == "__main__":
    main()
