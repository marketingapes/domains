#!/usr/bin/env python3
"""CGG monetisation pass, 25 Nov 2026 (runs after build_v4.py, nov15_optimize.py and
nov15b_affiliate_links.py). Idempotent: every insert is marked data-cgg="nov25-*".

Usage: python3 nov25_monetize.py [--ads] [--aff] [--disclosure]   (no flag = all three)

--ads         Manual in-content AdSense units on CONTENT pages only (never deal pages:
              /offers/, /gear/, /black-friday-golf-deals-2026/). Same pattern as the PR 511
              homepage unit: labelled <aside>, reserved-height slot to limit CLS, and an
              <ins class="adsbygoogle"> that stays empty until a real slot ID is set in
              cgg/assets/cgg-ads.js (CGG_AD_SLOT). The data-cgg="nov15-tags" lazy loader is
              untouched and still injects adsbygoogle.js, which drains the push() queue.
              Articles: after the intro, mid-article, end of article (3).
              Games and drills: after the first section, mid-page, end of article (3).
              Hubs: after the first section and before the partner box (2).
              Home: one more before the signup block (PR 511 already adds the top one).
              Practice planner: one, below the planner tool.
              About, contact, privacy, terms, credits, 404 and /preview/ get no units.
--aff         Adds joined-network offers where they fit (CJ PID 101511730, Impact 335485).
              No invented prices: promo wording and end dates come from the CJ link feed
              pulled 25 Nov 2026 and are quoted as the network lists them.
              Also makes every affiliate link rel="sponsored nofollow noopener".
--disclosure  One-line affiliate disclosure near the top of every page with affiliate
              links, plus the /offers/#disclosure section the partner boxes already link to.
"""
import datetime as dt, html, pathlib, re, sys, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[4] / "cgg"
q = lambda u: urllib.parse.quote(u, safe="")
PUB = "ca-pub-5194583669093303"
DEAL = {"offers/index.html", "gear/index.html", "black-friday-golf-deals-2026/index.html"}
NO_ADS = {"about/index.html", "contact/index.html", "contact.html", "privacy/index.html",
          "terms/index.html", "credits/index.html", "404.html"}
HUBS = {"articles/index.html", "games/index.html", "get-better/index.html", "clubhouse/index.html"}

def pages():
    for p in sorted(ROOT.rglob("*.html")):
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith("preview/"):
            continue
        yield rel, p

# ------------------------------------------------------------------ ads
def unit(n, wrap=False):
    a = (f'<aside class="cgg-ad" aria-label="Advertisement" data-cgg="nov25-ad">'
         f'<p class="cgg-ad__label">Advertisement</p><div class="cgg-ad__slot">'
         f'<ins class="adsbygoogle" style="display:block" data-ad-client="{PUB}" '
         f'data-ad-format="auto" data-full-width-responsive="true" data-cgg-ad="u{n}"></ins>'
         f'</div></aside>')
    return f'<div class="wrap">{a}</div>\n' if wrap else a + "\n"

ADS_JS = '<script src="/assets/cgg-ads.js" defer></script>'

def h2_positions(s, start, end):
    """Content H2s in s[start:end], skipping FAQ headings and anything inside an aside."""
    out = []
    for m in re.finditer(r"<h2[ >]", s[start:end]):
        i = start + m.start()
        before = s[start:i]
        if before.count("<aside") > before.count("</aside>"):
            continue
        if re.search(r'<section class="faq[^>]*>(?:(?!</section>).)*$', before, re.S):
            continue
        out.append(i)
    return out

def insert_many(s, items):
    for i, txt in sorted(items, key=lambda x: -x[0]):
        s = s[:i] + txt + s[i:]
    return s

def mid_index(n):
    return min(n - 1, 1 + max(2, n // 2))

def ads_for(rel, s):
    if rel in DEAL or rel in NO_ADS or 'data-cgg="nov25-ad"' in s:
        return s, 0
    if f"adsbygoogle.js?client={PUB}" not in s:
        return s, 0  # page does not run the AdSense loader
    items = []
    if rel.startswith("articles/") and rel != "articles/index.html":
        a = s.index('<div class="wrap narrow prose">')
        e = s.index('<section class="related', a)
        e = s.rindex("</div>", a, e)
        hs = h2_positions(s, a, e)
        items.append((hs[0], unit(1)))
        if len(hs) >= 4:
            items.append((hs[mid_index(len(hs))], unit(2)))
        items.append((e, unit(3)))
    elif re.match(r"(games|get-better)/[^/]+/index\.html$", rel):
        a = s.index('<article class="prose2">')
        e = s.index("</article>", a)
        hs = h2_positions(s, a, e)
        items.append((hs[1], unit(1)))
        if len(hs) >= 4:
            items.append((hs[mid_index(len(hs))], unit(2)))
        items.append((e, unit(3)))
    elif rel in HUBS:
        m = s.index('<main id="main">')
        secs = [x.start() for x in re.finditer(r'<section class="sec tight', s[m:])]
        items.append((m + secs[1], unit(1)))
        hub = s.index('<div class="wrap" data-cgg="nov15b-hub"')
        items.append((hub, unit(2, wrap=True)))
    elif rel == "index.html":
        i = s.index('<section class="sec dark cut-top"><div class="wrap join">')
        items.append((i, unit(2, wrap=True)))
    elif rel == "practice-session-planner/index.html":
        i = s.index('<div class="prose2" style="max-width:780px;margin-top:48px">')
        items.append((i, unit(1)))
    else:
        return s, 0
    s = insert_many(s, items)
    if ADS_JS not in s:
        s = s.replace("</body>", ADS_JS + "\n</body>", 1)
    return s, len(items)

# ------------------------------------------------------------------ affiliates
CJ = "https://www.anrdoezrs.net/click-101511730-"
def cj(link_id, sid, url=None):
    u = f"{CJ}{link_id}?sid=cgg-{sid}"
    return u + (f"&url={q(url)}" if url else "")
GP = "https://golfpartner.sjv.io/c/335485/1433527/17026"
def gp(sid, dest): return f"{GP}?subId1=cgg-{sid}&u={q(dest)}"
GP_DRIVERS = "https://golfpartnerusa.com/collections/drivers"
GP_WEDGES = "https://golfpartnerusa.com/collections/wedges"
GP_SETS = "https://golfpartnerusa.com/collections/club-set"
CAL_GOLF = "https://www.calendars.com/calendars/shop-by-category/sports/golf"
VICE_GLOVES = "https://www.vicegolf.com/collections/golf-gloves"

def a(href, offer, label, cls="btn aff-btn"):
    return (f'<a class="{cls}" href="{html.escape(href, quote=True)}" rel="sponsored nofollow noopener" '
            f'target="_blank" data-offer="{offer}">{label}</a>')

def box(title, body, links):
    ctas = "".join(f'<p class="aff-cta">{l}</p>' for l in links)
    return (f'<aside class="aff-box" data-cgg="nov25-aff"><p class="aff-label">Partner pick</p>'
            f'<h3>{title}</h3><p>{body}</p>{ctas}</aside>\n')

def card(title, body, links, extra=""):
    ctas = " ".join(links)
    return (f'<div class="gift-card" data-cgg="nov25-aff">\n  <h3>{title}</h3>\n  <p>{body}</p>{extra}\n'
            f'  <p class="aff-cta">{ctas}</p>\n</div>\n')

GROUPON_TTD = "15204626"   # CJ: Groupon Local - Things To Do
MMS_EV = "15733888"        # CJ: Evergreen Link for M&M's
CAL_SPORTS = "11016345"    # CJ: Calendars.com Sports Category text link (deep link to golf)

CONTENT_BOXES = {
    "get-better/fairway-corridor/index.html": box(
        "Driver keeps leaving the corridor?",
        "Before buying new, try a different head for less. GOLF Partner is a used-club shop that ships pre-owned drivers from Japan and grades each club by condition.",
        [a(gp("corridor-drivers", GP_DRIVERS), "golf-partner", "Browse pre-owned drivers")]),
    "get-better/landing-spot-ladder/index.html": box(
        "One wedge you trust",
        "The ladder is easier with a single wedge you know well. GOLF Partner sells pre-owned wedges shipped from Japan, each graded by condition, so trying a different loft costs less than new.",
        [a(gp("ladder-wedges", GP_WEDGES), "golf-partner", "Browse pre-owned wedges")]),
    "articles/beginner-trick-shots/index.html": box(
        "A designated trick-shot wedge",
        "Keep your good wedge for the course. A graded pre-owned wedge from GOLF Partner, a used-club shop that ships from Japan, makes a fine club for the silly stuff.",
        [a(gp("trick-wedges", GP_WEDGES), "golf-partner", "Browse pre-owned wedges")]),
    "articles/mini-golf-date-night/index.html": box(
        "Find the course first",
        "Groupon's Things to Do section lists local activity deals by city. Search yours for mini golf, adventure golf or a driving range before you book the date.",
        [a(cj(GROUPON_TTD, "datenight-groupon"), "groupon", "Browse Things to Do on Groupon")]),
    "articles/mini-golf-with-kids/index.html": box(
        "Planning the family outing?",
        "Check Groupon's Things to Do listings for your area before you go. Family attractions and mini golf courses near you may have a deal running.",
        [a(cj(GROUPON_TTD, "kids-groupon"), "groupon", "See local Things to Do")]),
    "articles/mini-golf-tournament-at-home/index.html": box(
        "Prizes with the winner's name on them",
        "M&amp;M&rsquo;S sells personalised M&amp;M&rsquo;S, so the champion's name (or the runner-up's trash talk) can go straight onto the prize table.",
        [a(cj(MMS_EV, "tournament-mms"), "mms", "Personalise M&amp;M&rsquo;S")]),
    "articles/mini-golf-party-games/index.html": box(
        "Party favours that keep score",
        "Personalised M&amp;M&rsquo;S make easy take-home favours: print the course name, the date or the worst score of the night on them.",
        [a(cj(MMS_EV, "party-mms"), "mms", "Personalise M&amp;M&rsquo;S")]),
}

def add_after_first_box(s, txt):
    m = re.search(r'<aside class="aff-box"(?:(?!</aside>).)*</aside>\n?', s, re.S)
    if m:
        return s[:m.end()] + txt + s[m.end():]
    i = s.index('<section class="faq')
    return s[:i] + txt + s[i:]

def pt_date(utc):
    """CJ end dates are UTC; return the last full Pacific day the promo runs."""
    t = dt.datetime.strptime(utc, "%Y-%m-%d %H:%M") - dt.timedelta(minutes=1) - dt.timedelta(hours=8)
    return f"{t.day} {t:%b} {t.year}"

IGS_PROMOS = [  # (CJ link id, promo text exactly as listed in CJ, CJ end date UTC or None)
    ("17390379", "Up to $1,300 off SkyTrak", "2026-12-06 08:00"),
    ("17390378", "Up to $3,000 off Uneekor", "2026-12-15 08:00"),
    ("17390380", "Up to $1,000 off Garmin", "2026-12-29 08:00"),
    ("17390377", "Up to $7,000 off Foresight Sports with 1 yr free Foresight+ Silver &amp; Course Pass", "2026-12-01 08:00"),
    ("17380308", "FlightScope up to $750 off", "2026-12-01 08:00"),
    ("17390384", "Up to $600 off G-TRAK", "2026-12-15 08:00"),
    ("17390382", "Up to $300 off Rapsodo", "2026-12-01 08:00"),
    ("17380295", "Up to 25% off select golf mats and enclosures", "2026-12-15 08:00"),
    ("17371112", "Up to 25% off select golf hitting strips, nets, screens &amp; accessories", "2026-12-15 08:00"),
    ("17125067", "Save up to $550 off DIY golf simulator bundles", None),
]

def bf_section():
    rows = "".join(
        f'<tr><td>{t}</td><td>{pt_date(e) if e else "No end date listed"}</td>'
        f'<td>{a(cj(i, "bf-igs-" + i), "indoor-golf-shop", "View", "aff-link")}</td></tr>'
        for i, t, e in IGS_PROMOS)
    return (
        '<section data-cgg="nov25-aff">\n'
        '<h2 id="network-promos">More Black Friday promos from our golf partners</h2>\n'
        '<p>These come straight from the promotions our partners publish to affiliates. We list the wording and the end date exactly as the network shows them (CJ feed, pulled 25 November 2026), converted to Pacific time. We have not checked each product price, so confirm the final price on the shop\'s page.</p>\n'
        '<h3>The Indoor Golf Shop</h3>\n'
        '<div class="table-wrap"><table>\n<thead><tr><th>Promotion (as listed by the shop)</th><th>Runs through (PT)</th><th>Link</th></tr></thead>\n'
        f'<tbody>{rows}</tbody></table></div>\n'
        + card("Calendars.com: Black Friday on golf calendars",
               "Calendars.com lists this Black Friday promotion to affiliates: &ldquo;Up to 70% off everything &amp; an extra 20% off calendars (orders $50+)&rdquo; with code <b>BLACKFRI</b>, from 26 November through 28 November 2026 (PT). On 25 November its golf page listed 2027 calendars such as Golf Courses and a Golf Trivia daily desk calendar.",
               [a(cj("17394651", "bf-calendars"), "calendars-com", "Shop Calendars.com Black Friday"),
                a(cj(CAL_SPORTS, "bf-cal-golf", CAL_GOLF), "calendars-com", "See golf calendars", "btn btn-ghost aff-btn")])
        + card("Groupon: Black Friday Weekend",
               "Groupon lists &ldquo;Save up to 80% and get 10% cashback in Groupon Bucks&rdquo; with code <b>BLACKFRIDAY</b>, from 9 PM PT on 26 November to 8:59 PM PT on 29 November 2026. Search your city for mini golf, a driving range or a lesson to gift.",
               [a(cj("17392150", "bf-groupon"), "groupon", "Go to Groupon Black Friday")])
        + '</section>\n\n')

def offers_stocking():
    return (card("Calendars.com: a golf calendar for the desk",
                 "A cheap gift that gets looked at every day. On 25 November 2026 the Calendars.com golf page listed 2027 golf calendars including famous-course wall calendars and a Golf Trivia daily desk calendar.",
                 [a(cj(CAL_SPORTS, "gift-cal-golf", CAL_GOLF), "calendars-com", "See golf calendars")])
            + card("M&amp;M&rsquo;S: personalised sweets for the 19th hole",
                   "M&amp;M&rsquo;S sells personalised M&amp;M&rsquo;S. Put a nickname, a club logo or the group's running joke on them.",
                   [a(cj(MMS_EV, "gift-mms"), "mms", "Personalise M&amp;M&rsquo;S")]))

def offers_experiences():
    return (card("Groupon: golf you can gift as a day out",
                 "Groupon's Things to Do section lists local activity deals by city. Search yours for mini golf, a driving range bay or a lesson.",
                 [a(cj(GROUPON_TTD, "gift-groupon"), "groupon", "Browse Things to Do")])
            + card("GOLF Partner: a pre-owned upgrade",
                   "GOLF Partner is a used-club shop that ships pre-owned clubs from Japan and grades each one by condition. Good for a first proper wedge, a driver to try or a starter set.",
                   [a(gp("gift-exp-wedges", GP_WEDGES), "golf-partner", "Pre-owned wedges"),
                    a(gp("gift-exp-drivers", GP_DRIVERS), "golf-partner", "Pre-owned drivers", "btn btn-ghost aff-btn"),
                    a(gp("gift-exp-sets", GP_SETS), "golf-partner", "Club sets", "btn btn-ghost aff-btn")]))

GEAR_PICKS = (
    '<div class="pick" data-cgg="nov25-aff"><figure class="ph r43"><img src="/images/photos/glove-balls-putter-800.webp" srcset="/images/photos/glove-balls-putter-800.webp 800w, /images/photos/glove-balls-putter-1600.webp 1156w" sizes="200px" width="800" height="600" alt="A golf glove, a ball and a putter on the grass" loading="lazy" decoding="async"></figure><div>\n'
    '<h3>Golf gloves</h3><p>Gloves wear out faster than anything else in the bag, so a spare is never wasted. Vice sells gloves direct; on 15 November 2026 its Black Friday page listed 3-for-2 on all gloves.</p><p class="small"><strong>Good for:</strong> Stocking stuffers and regular players</p>'
    f'<p class="aff-cta">{a(cj("15735305", "gear-vice-gloves", VICE_GLOVES), "vice-golf", "See Vice gloves")}</p></div></div>\n'
    '<div class="pick" data-cgg="nov25-aff"><figure class="ph r43"><img src="/images/photos/links-pebble-beach-800.webp" srcset="/images/photos/links-pebble-beach-800.webp 800w" sizes="200px" width="800" height="533" alt="A links golf course on the coast" loading="lazy" decoding="async"></figure><div>\n'
    '<h3>Golf calendars</h3><p>A small gift that hangs around all year. On 25 November 2026 Calendars.com listed 2027 golf calendars, from famous-course wall calendars to a Golf Trivia daily desk calendar.</p><p class="small"><strong>Good for:</strong> Office golfers and Secret Santa</p>'
    f'<p class="aff-cta">{a(cj(CAL_SPORTS, "gear-cal-golf", CAL_GOLF), "calendars-com", "See golf calendars")}</p></div></div>\n')

def aff_for(rel, s):
    n = 0
    if 'data-cgg="nov25-aff"' not in s:
        if rel in CONTENT_BOXES:
            s = add_after_first_box(s, CONTENT_BOXES[rel]); n += 1
        elif rel == "articles/casual-golfer-gear-guide/index.html":
            m = re.search(r'(<aside class="aff-box" data-cgg="nov15b-gp">(?:(?!</aside>).)*?)(</aside>)', s, re.S)
            extra = (f'<p class="aff-cta" data-cgg="nov25-aff">{a(gp("gear-guide-wedges", GP_WEDGES), "golf-partner", "Pre-owned wedges", "btn btn-ghost aff-btn")} '
                     f'{a(gp("gear-guide-drivers", GP_DRIVERS), "golf-partner", "Pre-owned drivers", "btn btn-ghost aff-btn")}</p>')
            s = s[:m.end(1)] + extra + s[m.end(1):]; n += 2
        elif rel == "offers/index.html":
            i = s.index('<h2 id="backyard">'); s = s[:i] + offers_stocking() + "\n" + s[i:]
            i = s.index('<h2 id="black-friday">'); s = s[:i] + offers_experiences() + "\n" + s[i:]
            n += 4
        elif rel == "gear/index.html":
            i = s.index("</div></section>", s.index('<div class="pick" data-cgg="nov15b-gp">'))
            s = s[:i] + GEAR_PICKS + s[i:]
            m = re.search(r'(<div class="pick" data-cgg="nov15b-gp">(?:(?!</div></div>).)*?)(</p></div></div>)', s, re.S)
            extra = (f' {a(gp("gear-pillar-wedges", GP_WEDGES), "golf-partner", "Wedges", "btn btn-ghost aff-btn")}'
                     f' {a(gp("gear-pillar-drivers", GP_DRIVERS), "golf-partner", "Drivers", "btn btn-ghost aff-btn")}')
            s = s[:m.end(1)] + extra + s[m.end(1):]
            n += 4
        elif rel == "black-friday-golf-deals-2026/index.html":
            i = s.index('<h2 id="before-you-buy">'); s = s[:i] + bf_section() + s[i:]
            n += len(IGS_PROMOS) + 3
    s = s.replace('rel="sponsored noopener"', 'rel="sponsored nofollow noopener"')
    return s, n

# ------------------------------------------------------------------ disclosure
DISC = ('<div class="wrap" data-cgg="nov25-disclosure"><p class="aff-disclosure slim">Some links on this page are affiliate links. '
        'If you buy through one, we may earn a commission at no extra cost to you. '
        '<a href="/offers/#disclosure">How this works</a>.</p></div>\n')
DISC_SECTION = (
    '<section id="disclosure" class="aff-disclosure big" data-cgg="nov25-disclosure" aria-labelledby="disc-h">\n'
    '<h2 id="disc-h">How our affiliate links work</h2>\n'
    '<p>Crazy Golf Game is published by Marketing Apes LLC. Some links on this site are affiliate links through networks such as CJ and Impact. '
    'If you click one and buy something, the shop may pay us a commission. It costs you nothing extra and never changes the price you pay. '
    'Affiliate links are marked as sponsored in the page code, and the shops we link to never see or approve what we write. '
    'Prices and promotions are the shop&rsquo;s own, shown with the date we saw them.</p>\n'
    '<p>Pages with articles and game rules may also show Google ads, which are labelled &ldquo;Advertisement&rdquo;. Shopping pages like this one carry no ads.</p>\n'
    '</section>\n')

def disclosure_for(rel, s):
    if 'data-cgg="nov25-disclosure"' in s or 'rel="sponsored' not in s:
        return s, 0
    s = s.replace('<main id="main">\n', '<main id="main">\n' + DISC, 1)
    if rel == "offers/index.html":
        i = s.index("</main>")
        i = s.rindex("</div>", 0, i)
        s = s[:i] + DISC_SECTION + s[i:]
    return s, 1

def main():
    flags = set(sys.argv[1:]) or {"--ads", "--aff", "--disclosure"}
    tot = {"ads": 0, "aff": 0, "disc": 0}
    for rel, p in pages():
        s0 = s = p.read_text(encoding="utf-8")
        if "--ads" in flags:
            s, k = ads_for(rel, s); tot["ads"] += k
            if k: print(f"ads  {k}  {rel}")
        if "--aff" in flags:
            s, k = aff_for(rel, s); tot["aff"] += k
            if k: print(f"aff  {k}  {rel}")
        if "--disclosure" in flags:
            s, k = disclosure_for(rel, s); tot["disc"] += k
        if s != s0:
            p.write_text(s, encoding="utf-8")
    print(tot)

if __name__ == "__main__":
    main()
