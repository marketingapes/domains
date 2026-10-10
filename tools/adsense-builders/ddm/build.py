"""Discount Deal Me static-site builder (2026-10 redesign: modern, data-first deal site).

Run: python3 tools/adsense-builders/ddm/build.py   (writes into ./ddm)
Refresh deals first with refresh_deals.py when a new CJ pull is available.
Hand-maintained page that this builder does NOT touch: guides/checkout-comparison/ (byte-pinned by tests).
"""
import os, re, html, sys, json
sys.path.insert(0, os.path.dirname(__file__))
import svgs, deals, theme, client, events
from articles1 import A as A1
from articles2 import A as A2

OUT = os.environ.get("DDM_OUT") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "ddm")
HOST = "https://discountdealme.com"
BRAND = "Discount Deal Me"
EMAIL = "hello@discountdealme.com"
UPDATED = "2026-09-23"
UPDATED_H = "September 23, 2026"
SITE_UPDATED = "2026-10-10"
ARTS = A1 + A2
from extras import EXTRA
for _a in ARTS:
    _x = EXTRA.get(_a["slug"], "")
    if _a["slug"] == "seasonal-sale-calendar":
        _a["body"] = _a["body"].replace("<h2>A word on sales-tax", _x + "\n<h2>A word on sales-tax")
    else:
        _a["body"] += _x
BY = {a["slug"]: a for a in ARTS}
assert len(BY) == len(ARTS) == 12

GTM = "GTM-W3D26R29"
ASSET_V = "20261010"
e = html.escape

# Email opt-in. Posts form-encoded to a private Make webhook that appends one row
# to the "DDM Subscribers (GMass list)" Google Sheet. No emails are sent by it.
SIGNUP_HOOK = "https://hook.us2.make.com/slmuyswz99f297vw6uw4a79jlekuqof7"
SIGNUP_CONSENT_VERSION = "DDM_EMAIL_2026-10-09_V1"
SIGNUP_CONSENT = ("Yes, email me deal alerts and shopping guides from Discount Deal Me. "
                  "About one email a week, more around big sales. Some emails include affiliate links (#ad). "
                  "Unsubscribe any time with one click.")

LIVE = deals.deals()
CATS = [c for c in deals.CATEGORY_ORDER if any(d["category"] == c for d in LIVE)]


def signup(form_id, title="Get the deals worth your click", lede="One short email with the best-scoring deals we found and the ones to skip. About once a week, more around Black Friday and Cyber Monday.", cls=""):
    return f'''<section class="signup {cls}" id="alerts-{form_id}" aria-labelledby="{form_id}-h">
<div class="signup-copy"><p class="kicker">Deal alerts</p><h2 id="{form_id}-h">{title}</h2><p>{lede}</p></div>
<form class="signup-form" data-signup="{form_id}" action="{SIGNUP_HOOK}" method="post" novalidate>
<input type="hidden" name="domain_id" value="ddm"><input type="hidden" name="form" value="{form_id}"><input type="hidden" name="consent_version" value="{SIGNUP_CONSENT_VERSION}">
<div class="hp" aria-hidden="true"><label for="{form_id}-web">Leave this empty</label><input id="{form_id}-web" name="website" type="text" tabindex="-1" autocomplete="off"></div>
<div class="signup-row"><label class="sr-only" for="{form_id}-email">Email address</label><input id="{form_id}-email" name="email" type="email" required autocomplete="email" placeholder="you@email.com"><button class="btn" type="submit">Sign me up</button></div>
<label class="signup-consent"><input type="checkbox" name="consent" value="yes" required> <span data-consent-text>{e(SIGNUP_CONSENT)}</span></label>
<p class="signup-fine">We keep your email in a private list used only for Discount Deal Me emails. We never sell it. See our <a href="/privacy/#email-list">privacy policy</a>.</p>
<p class="signup-msg" role="status" aria-live="polite"></p>
</form>
</section>'''


def head(title, desc, path, og_image="/images/og.svg", og_type="website", extra="", robots=""):
    full = f"{title} | {BRAND}" if title != BRAND else f"{BRAND} | Live deals, scored and checked"
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{HOST}{path}">
{robots}<meta name="google-adsense-account" content="ca-pub-5194583669093303">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5194583669093303" crossorigin="anonymous"></script>
<script>window.dataLayer=window.dataLayer||[];</script>
<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);}})(window,document,'script','dataLayer','{GTM}');</script>
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:type" content="{og_type}">
<meta property="og:url" content="{HOST}{path}">
<meta property="og:image" content="{HOST}{og_image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v={ASSET_V}">
{extra}</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={GTM}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<a class="skip" href="#main">Skip to content</a>
'''


def nav(active=""):
    def a(href, label, key):
        cur = ' aria-current="page"' if key == active else ""
        return f'<a href="{href}"{cur}>{label}</a>'
    return f'''<div class="topbar"><div class="wrap topbar-inner"><span><b>#ad</b> Deal links are affiliate links. They never change your price or a deal's score.</span> <a href="/how-we-pick-deals/#money">How we make money</a></div></div>
<header class="site-head">
<div class="wrap head-inner">
<a class="logo" href="/" aria-label="{BRAND} home"><img src="/images/logo.svg" alt="" width="32" height="32"><span>Discount Deal Me</span></a>
<nav class="main-nav" aria-label="Main">{a("/deals/", "Live deals", "deals")}{a("/articles/", "Guides", "articles")}{a("/how-we-pick-deals/", "How we pick deals", "method")}{a("/about/", "About", "about")}</nav>
<form class="head-search" action="/deals/" method="get" role="search"><label class="sr-only" for="hs-q">Search deals</label><input id="hs-q" name="q" type="search" placeholder="Search live deals" autocomplete="off"><button type="submit" aria-label="Search">&#8594;</button></form>
</div>
</header>
'''


FOOT_LINKS = f'''<div class="wrap foot-grid">
<div><a class="logo logo-foot" href="/"><img src="/images/logo.svg" alt="" width="28" height="28"><span>Discount Deal Me</span></a>
<p class="foot-tag">Network-checked deals, scored with a published formula, summarized by labelled AI. Plus guides to paying less.</p></div>
<nav aria-label="Deals"><h2 class="foot-h">Deals</h2><a href="/deals/">Live deals</a><a href="/deals/?ending=1">Ending soon</a><a href="/offers/">Partner stores <small>(#ad)</small></a><a href="/how-we-pick-deals/">How we pick deals</a></nav>
<nav aria-label="Guides and tools"><h2 class="foot-h">Guides &amp; tools</h2><a href="/articles/">All guides</a><a href="/deal-checklist/">Deal checklist</a><a href="/guides/checkout-comparison/">Checkout worksheet</a><a href="/#calculator">Real-discount calculator</a></nav>
<nav aria-label="Company"><h2 class="foot-h">Company</h2><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav>
</div>
<div class="wrap foot-base"><p>&copy;2026 {BRAND}. Published by Marketing Apes.</p><p>Deal terms can change without notice; check the final price at checkout. Some links are affiliate links (#ad).</p></div>
</footer>
<script src="/assets/site.js?v={ASSET_V}" defer></script>
<script src="/assets/signup.js?v={ASSET_V}" defer></script>
</body>
</html>
'''
FOOT = (f'<footer class="site-foot">\n<div class="wrap foot-signup">{signup("footer", title="Deal alerts, minus the hype", lede="A short weekly email with the highest-scoring deals we found. Unsubscribe any time.", cls="signup-foot")}</div>\n' + FOOT_LINKS)
FOOT_NO_SIGNUP = '<footer class="site-foot">\n' + FOOT_LINKS


def page(title, desc, path, body, active="", own_signup=False, **kw):
    return head(title, desc, path, **kw) + nav(active) + f'<main id="main">\n{body}\n</main>\n' + (FOOT_NO_SIGNUP if own_signup else FOOT)


def words(s):
    t = re.sub(r"<[^>]+>", " ", s)
    return len(re.findall(r"[A-Za-z0-9'’-]+", t))


def repr_json(s):
    return json.dumps(s)


def write(rel, content):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(content)


def guide_card(a, big=False):
    return f'''<a class="gcard{' gcard-big' if big else ''}" href="/articles/{a["slug"]}/">
<span class="gcard-img"><img src="/images/{a["slug"]}.svg" alt="" loading="lazy" width="1200" height="675"></span>
<span class="gcard-body"><span class="gcard-cat">{a["cat"]}</span><span class="gcard-title">{a["title"]}</span><span class="gcard-desc">{a["desc"]}</span></span>
</a>'''


def feed_status(cls=""):
    stores = len({d["merchant"] for d in LIVE})
    return (f'<p class="feed-status {cls}"><span class="dot" aria-hidden="true"></span><span><b data-live-count>{len(LIVE)}</b> live deals from {stores} stores</span>'
            f'<span>Terms checked <time datetime="{deals.CHECKED_AT}" data-checked>{deals.checked_human()}</time></span>'
            f'<a href="/how-we-pick-deals/#checked">What "checked" means</a></p>')


# ---------------------------------------------------------------- home
def home():
    top = "".join(deals.card(d, "ddm-home-top") for d in LIVE[:9])
    ending = sorted([d for d in LIVE if d["network"]["ends"]], key=lambda d: d["network"]["ends"])[:6]
    ending_rows = "".join(
        f'<li data-deal="{d["id"]}" data-ends="{d["network"]["ends"]}"><span class="er-merchant">{e(d["merchant"])}</span><a href="/deals/?q={e(d["merchant"].split()[0].lower())}">{e(d["title"])}</a>'
        f'<span class="er-end" data-end-label>{deals.human_end(d["network"]["ends"])}</span>{deals.score_badge(d)}</li>' for d in ending)
    counts = {c: sum(1 for d in LIVE if d["category"] == c) for c in CATS}
    cats = "".join(f'<a class="cat" href="/deals/?cat={e(c)}"><span>{e(c)}</span><b data-cat-count="{e(c)}">{counts[c]}</b></a>' for c in CATS)
    guides = guide_card(ARTS[0], big=True) + "".join(guide_card(a) for a in ARTS[1:7])
    body = f'''<section class="hero">
<div class="wrap hero-grid">
<div class="hero-copy">
{feed_status()}
<h1>Today's best deals, scored and checked.</h1>
<p class="lede">We pull live offers straight from merchants' official affiliate programs, rank every one with a published Deal Score, and use AI to summarize the fine print. No invented codes, no made-up "was" prices, no fake reviews.</p>
<form class="big-search" action="/deals/" method="get" role="search">
<label class="sr-only" for="home-q">Search live deals</label>
<input id="home-q" name="q" type="search" placeholder='Try "kitchen ending soon" or "no code"' autocomplete="off">
<button class="btn" type="submit">Find deals</button>
</form>
<p class="try">Try: <a href="/deals/?q=ending+soon">ending soon</a> <a href="/deals/?q=kitchen">kitchen</a> <a href="/deals/?q=no+code">no code</a> <a href="/deals/?q=free+shipping">free shipping</a> <a href="/deals/?q=tickets">tickets</a></p>
</div>
<aside class="hero-panel" aria-label="How every deal is handled">
<ol class="pipeline">
<li><span class="step">1</span><div><b>Pulled from the source</b><p>Offers come from the merchant's own affiliate program feed, with the network's start and end dates.</p></div></li>
<li><span class="step">2</span><div><b>Scored by formula</b><p>A 0&ndash;100 Deal Score from savings size, certainty, ease and deadline. Our commission is never an input.</p></div></li>
<li><span class="step">3</span><div><b>Summarized by AI, labelled</b><p>Every summary is marked "AI summary" and sits next to the merchant's own terms.</p></div></li>
<li><span class="step">4</span><div><b>Expired deals disappear</b><p>Your browser hides a deal the moment its end time passes.</p></div></li>
</ol>
<a class="panel-link" href="/how-we-pick-deals/">Read the full method</a>
</aside>
</div>
</section>

<section class="wrap section" aria-labelledby="top-h">
<div class="sec-head"><div><p class="kicker">Ranked by Deal Score</p><h2 id="top-h">Top deals right now</h2></div><a class="sec-link" href="/deals/">See all {len(LIVE)} deals</a></div>
<div class="deal-grid" data-limit="6">{top}</div>
<p class="empty" hidden>Every deal in this snapshot has ended. <a href="/deals/">Check the deal finder</a> for the latest list.</p>
</section>

<section class="wrap section split" aria-labelledby="end-h">
<div>
<div class="sec-head"><div><p class="kicker">Clock is running</p><h2 id="end-h">Ending soonest</h2></div><a class="sec-link" href="/deals/?ending=1">All ending soon</a></div>
<ol class="ending-list">{ending_rows}</ol>
</div>
<div>
<div class="sec-head"><div><p class="kicker">Browse</p><h2>Deals by category</h2></div></div>
<div class="cats">{cats}</div>
<div class="note-card"><b>Why some big percentages score lower.</b> An "up to 50% off" is the best case on a few items, so it counts for 75% of its face value. A plain "40% off" counts in full. <a href="/how-we-pick-deals/#deal-score">See the formula</a>.</div>
</div>
</section>

<section class="wrap section" aria-labelledby="guides-h">
<div class="sec-head"><div><p class="kicker">Shopping guides</p><h2 id="guides-h">Know a real deal when you see one</h2></div><a class="sec-link" href="/articles/">All 12 guides</a></div>
<p class="sec-lede">Twelve plain-English guides to reference prices, coupon stacking, price tracking, cashback, returns and budgeting. They contain no affiliate links.</p>
<div class="guide-grid">{guides}</div>
</section>

<section class="wrap section" id="calculator" aria-labelledby="meter-h">
<div class="calc-card">
<div class="calc-intro">
<p class="kicker">Tool</p>
<h2 id="meter-h">Real-discount calculator</h2>
<p>A sale tag measures its discount against its own "was" price. This calculator measures it against what the item usually costs, then adds the extras that change your real total. It runs in your browser; nothing is sent anywhere.</p>
<ol class="mini-steps"><li>Enter the tag's "was" and "now" prices.</li><li>Add what it usually sells for, if you know.</li><li>Include any extra code, shipping and cashback.</li></ol>
</div>
<form class="meter-form" id="meter-form" novalidate>
<div class="field"><label for="m-was">Tag says it was ($)</label><input id="m-was" name="was" type="number" inputmode="decimal" min="0" step="0.01" placeholder="120"></div>
<div class="field"><label for="m-now">Sale price now ($)</label><input id="m-now" name="now" type="number" inputmode="decimal" min="0" step="0.01" placeholder="84"></div>
<div class="field"><label for="m-usual">Usually sells for ($) <small>optional</small></label><input id="m-usual" name="usual" type="number" inputmode="decimal" min="0" step="0.01" placeholder="89"></div>
<div class="field"><label for="m-code">Extra code (% off) <small>optional</small></label><input id="m-code" name="code" type="number" inputmode="decimal" min="0" max="100" step="1" placeholder="10"></div>
<div class="field"><label for="m-ship">Shipping &amp; fees ($)</label><input id="m-ship" name="ship" type="number" inputmode="decimal" min="0" step="0.01" placeholder="9.99"></div>
<div class="field"><label for="m-cb">Cashback (%) <small>optional</small></label><input id="m-cb" name="cb" type="number" inputmode="decimal" min="0" max="100" step="0.5" placeholder="3"></div>
<div class="meter-out" aria-live="polite" id="meter-out">
<div class="gauge" aria-hidden="true"><div class="gauge-fill" id="gauge-fill"></div></div>
<p class="verdict" id="verdict">Enter the first two prices to see the real discount.</p>
<dl class="stats">
<div><dt>Tag discount</dt><dd id="o-tag">&ndash;</dd></div>
<div><dt>You actually pay</dt><dd id="o-total">&ndash;</dd></div>
<div><dt>After cashback</dt><dd id="o-net">&ndash;</dd></div>
<div><dt>vs usual price</dt><dd id="o-real">&ndash;</dd></div>
</dl>
</div>
<button type="reset" class="btn btn-ghost btn-small">Clear</button>
</form>
</div>
</section>

<section class="wrap section" aria-labelledby="trust-h">
<div class="trust">
<div><p class="kicker">Our rules</p><h2 id="trust-h">What we will never do</h2><p>Discount Deal Me earns money when you buy through some links. These rules keep that from bending what we show you.</p><a class="sec-link" href="/how-we-pick-deals/">How we pick deals</a></div>
<ul class="rules">
<li><b>No invented codes or prices.</b> Every code and date comes from the merchant's affiliate program. We do not publish item prices we have not seen.</li>
<li><b>No fake reviews or user counts.</b> We do not claim to have tested products and we do not show ratings or "people bought" numbers.</li>
<li><b>Commission never sets the score.</b> The Deal Score uses shopper-side factors only, and the formula is public.</li>
<li><b>AI is labelled.</b> Summaries written by AI say so, sit beside the original terms, and are checked so their numbers match those terms.</li>
</ul>
</div>
</section>

<div class="wrap home-signup">{signup("home")}</div>'''
    ld = {"@context": "https://schema.org", "@type": "WebSite", "name": BRAND, "url": HOST + "/",
          "potentialAction": {"@type": "SearchAction", "target": HOST + "/deals/?q={search_term_string}", "query-input": "required name=search_term_string"}}
    body += f'\n<script type="application/ld+json">{json.dumps(ld)}</script>'
    return page(BRAND, "Live deals from official affiliate programs, ranked by a published Deal Score, with labelled AI summaries of the fine print. Plus plain-English guides to spotting a real deal.", "/", body, "home", own_signup=True)


# ---------------------------------------------------------------- deal finder
def deals_page():
    cards = "".join(deals.card(d, "ddm-finder") for d in LIVE)
    counts = {c: sum(1 for d in LIVE if d["category"] == c) for c in CATS}
    chips = '<button type="button" class="chip is-on" data-fcat="" aria-pressed="true">All <b data-cat-count="">' + str(len(LIVE)) + '</b></button>' + "".join(
        f'<button type="button" class="chip" data-fcat="{e(c)}" aria-pressed="false">{e(c)} <b data-cat-count="{e(c)}">{counts[c]}</b></button>' for c in CATS)
    body = f'''<section class="wrap page-head">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span>Live deals</span></nav>
<h1>Live deals</h1>
<p class="lede">Every offer below comes from a merchant's affiliate program feed and is ranked by our <a href="/how-we-pick-deals/#deal-score">Deal Score</a>. Search in plain English: try "kitchen deals ending soon", "no code", "30% off" or "tickets in LA".</p>
{feed_status("feed-status-page")}
<p class="disclose"><b>#ad</b> The "Get deal" buttons are affiliate links. If you buy, Discount Deal Me may earn a commission at no extra cost to you. It never changes the price or the Deal Score.</p>
</section>
<section class="wrap finder" aria-label="Deal finder">
<div class="finder-bar">
<form class="finder-search" id="finder-form" role="search"><label class="sr-only" for="fq">Search deals</label><input id="fq" name="q" type="search" placeholder="Search deals in plain English" autocomplete="off"><button class="btn" type="submit">Search</button></form>
<p class="interpreted" id="interpreted" aria-live="polite" hidden></p>
<div class="chips" role="group" aria-label="Filter by category">{chips}</div>
<div class="toggles">
<label class="toggle"><input type="checkbox" id="f-ending"> Ending within 72 hours</label>
<label class="toggle"><input type="checkbox" id="f-nocode"> No code needed</label>
<label class="toggle"><input type="checkbox" id="f-nolocal"> Hide local-only deals</label>
<label class="sort"><span>Sort</span><select id="f-sort"><option value="score">Deal Score</option><option value="ending">Ending soonest</option><option value="newest">Newest</option></select></label>
</div>
<p class="result-count" id="result-count" aria-live="polite"></p>
</div>
<div class="deal-grid deal-grid-finder" id="deal-grid">{cards}</div>
<div class="empty" id="finder-empty" hidden><h2>No live deals match that.</h2><p>Try fewer words, or <button type="button" class="linklike" id="finder-reset">clear all filters</button>. New deals are added as merchants publish them.</p></div>
<p class="smart-note">Search runs entirely in your browser over our <a href="/data/deals.json">public deal feed</a>. It understands categories, "ending soon", "no code", "free shipping", percentages and a few places. Nothing you type is sent to us.</p>
</section>
<section class="wrap section narrow-sec">
<h2>About these deals</h2>
<p>This page lists time-limited offers and ongoing store perks that merchants publish through the Commission Junction (CJ) affiliate network to Discount Deal Me. We keep the merchant's own wording in "Network terms" on every card, add a short summary written by AI, and score each offer the same way. We do not see or verify individual item prices, so always compare the price in your cart with other sellers. If a deal does not work as described, <a href="/contact/">tell us</a> and we will check it and remove it if needed.</p>
</section>'''
    return page("Live deals", "Search live deals from official affiliate programs, filter by category, ending soon or no code needed, and see a transparent Deal Score for every offer.", "/deals/", body, "deals")


# ---------------------------------------------------------------- method
def method_page():
    R = deals.SCORE_RULES
    pen = "".join(f'<tr><td>{deals.PENALTY_LABELS[k]}</td><td class="num">&minus;{v}</td></tr>' for k, v in R["penalties"].items())
    ex = LIVE[0]
    body = f'''<section class="wrap page-head narrow">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span>How we pick deals</span></nav>
<h1>How we pick, score and check deals</h1>
<p class="lede">Discount Deal Me is part software, part editorial. Here is exactly where the deals come from, how the Deal Score is calculated, what our AI does and does not do, and how we make money.</p>
</section>
<section class="wrap narrow prose">
<h2 id="sources">Where the deals come from</h2>
<p>Deals come from merchants' affiliate programs on the Commission Junction (CJ) network, through Discount Deal Me's own publisher account. Each offer arrives with the merchant's wording, a start and end date, any promo code, and a tracking link. We only list programs we have joined, and we only publish codes that the merchant issued to affiliates. We do not scrape coupon sites, and we do not accept user-submitted codes.</p>
<p>We then choose which offers to show. We skip offers that look stale (for example last year's holiday codes left running), offers aimed only at other countries, health products that need a doctor's input, software keys sold by third-party resellers, and anything we would not be comfortable buying ourselves.</p>
<h2 id="checked">What "checked" means</h2>
<p>The time next to "Terms checked" is the last time we pulled the offer from the network and confirmed it was still active for our account. It means the merchant was still publishing that offer, with those terms and that end date, at that moment. It does not mean we checked the price of every item, and merchants can change or end an offer early. Your browser hides a deal automatically once its end time passes.</p>
<h2 id="deal-score">The Deal Score (0&ndash;100)</h2>
<p>Every deal gets the same four-part score. The inputs are things that matter to you as a shopper. Our commission, the network's earnings-per-click figures and how much a merchant pays us are never inputs.</p>
<div class="table-wrap"><table>
<caption>Deal Score components</caption>
<thead><tr><th>Component</th><th>How it is scored</th><th class="num">Max</th></tr></thead>
<tbody>
<tr><td><b>Savings size</b></td><td>Percentage discounts: points rise in a straight line up to {R["pct_cap"]}% off. Dollar discounts: up to ${R["usd_cap"]} off, worth less than the same percentage because we don't know the item price. Free shipping, perks and fixed low prices get a small flat amount. Any "up to" figure counts at {R["upto_factor"]:.0%} because it is the best case.</td><td class="num">{R["savings_max"]}</td></tr>
<tr><td><b>Certainty</b></td><td>Starts at {R["certainty_max"]} and loses points for each condition in the table below.</td><td class="num">{R["certainty_max"]}</td></tr>
<tr><td><b>Ease</b></td><td>No code needed: {R["ease"]["no_code"]}. Code needed: {R["ease"]["code"]}. Requires an email sign-up: {R["ease"]["signup"]}.</td><td class="num">15</td></tr>
<tr><td><b>Deadline clarity</b></td><td>A clear end date within 45 days: {R["deadline"]["within_45_days"]}. Within a year: {R["deadline"]["within_1_year"]}. Ongoing or open-ended: {R["deadline"]["longer_or_none"]}.</td><td class="num">15</td></tr>
</tbody></table></div>
<div class="table-wrap"><table>
<caption>Certainty deductions</caption>
<thead><tr><th>Condition</th><th class="num">Points</th></tr></thead>
<tbody>{pen}</tbody></table></div>
<p>Bands: 80 and up is <b>Excellent</b>, 65&ndash;79 <b>Strong</b>, 50&ndash;64 <b>Fair</b>, under 50 <b>Modest</b>. A modest score is not a bad deal; it usually means the saving is small or comes with strings attached.</p>
<h3>Worked example</h3>
<p>Our current top-scoring deal is <b>{e(ex["merchant"])}: {e(ex["title"])}</b>. Open "Network terms and score breakdown" on any deal card to see the same table for that deal.</p>
{deals.breakdown(ex)}
<h2 id="ai">What the AI does</h2>
<p>Each deal has a one- or two-sentence summary marked <span class="ai-tag">AI summary</span>. It is written by an AI model from the merchant's network terms, to turn dense promotional wording into something you can scan. Before a summary is published, an automated check confirms that every number in it (percentages, dollar amounts, dates) appears in the merchant's terms; if it does not, our release checks fail and the update is not published. The original terms are always one click away on the card.</p>
<p>The search box on the <a href="/deals/">deal finder</a> is smart in a simpler way: it runs in your browser and recognises categories, "ending soon", "no code", "free shipping", percentages and a few places. It is not a chatbot and it does not send what you type anywhere.</p>
<p>AI does not choose which deals to list, does not set the score and does not write our <a href="/articles/">guides</a>' advice on its own; people decide what goes on the site and review changes before they are published.</p>
<h2 id="money">How we make money</h2>
<p>When you buy through a "Get deal" button, the affiliate network may pay Discount Deal Me a commission. You pay the same price. We also show ads served by Google AdSense. Merchants do not pay to be listed, cannot buy a higher score and do not review what we write. Our <a href="/articles/">guides</a> contain no affiliate links.</p>
<h2 id="mistakes">If a deal is wrong</h2>
<p>Merchants sometimes end offers early or change terms. If a deal does not work as described, <a href="/contact/">contact us</a> with the deal name and what happened. We check it against the network and remove or correct it.</p>
</section>'''
    return page("How we pick deals", "Where Discount Deal Me's deals come from, the exact Deal Score formula, what our AI summaries do, what 'checked' means and how the site makes money.", "/how-we-pick-deals/", body, "method")


# ---------------------------------------------------------------- articles
def sidebar():
    picks = "".join(f'<li data-ends="{d["network"]["ends"]}"><a href="/deals/#{d["id"]}"><span>{e(d["merchant"])}</span>{e(d["title"])}</a>{deals.score_badge(d)}</li>' for d in LIVE[:6])
    return f'''<aside class="art-side" aria-label="Live deals">
<div class="side-card"><p class="kicker">Live deals</p><ul class="side-deals" data-side-deals>{picks}</ul><a class="sec-link" href="/deals/">Open the deal finder</a></div>
<div class="side-card"><p class="kicker">Tools</p><a class="side-tool" href="/#calculator">Real-discount calculator</a><a class="side-tool" href="/deal-checklist/">Deal checklist</a><a class="side-tool" href="/guides/checkout-comparison/">Checkout worksheet</a></div>
</aside>'''


def article_page(a):
    mins = max(4, round(words(a["body"]) / 220))
    faq = "".join(f'<details><summary>{e(q)}</summary><p>{e(ans)}</p></details>' for q, ans in a["faq"])
    rel = "".join(guide_card(BY[s]) for s in a["related"])
    ld = ('{"@context":"https://schema.org","@type":"Article","headline":' + repr_json(a["title"]) +
          ',"datePublished":"2026-09-23","dateModified":"2026-09-23","author":{"@type":"Organization","name":"The Discount Deal Me team"},'
          '"publisher":{"@type":"Organization","name":"Discount Deal Me"},"image":"' + HOST + f'/images/{a["slug"]}.svg","mainEntityOfPage":"{HOST}/articles/{a["slug"]}/"' + '}')
    body = f'''<article class="wrap article">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/articles/">Guides</a> <span aria-hidden="true">/</span> <span>{a["short"]}</span></nav>
<header class="art-head">
<span class="gcard-cat">{a["cat"]}</span>
<h1>{a["title"]}</h1>
<p class="byline">By the Discount Deal Me team &middot; Updated <time datetime="{UPDATED}">{UPDATED_H}</time> &middot; {mins} min read &middot; No affiliate links in this guide</p>
</header>
<div class="art-layout">
<div class="art-main">
<figure class="art-hero"><img src="/images/{a["slug"]}.svg" alt="{e(svgs.ART[a["slug"]][0])}" width="1200" height="675"></figure>
<div class="prose">
{a["body"]}
<section class="faq" aria-labelledby="faq-h"><h2 id="faq-h">Frequently asked questions</h2>{faq}</section>
<div class="art-foot">Discount Deal Me writes general shopping guides. Guides contain no affiliate links and no coupon codes, and we are not affiliated with the stores mentioned in general terms. Always check current prices and terms with the retailer.</div>
</div>
</div>
{sidebar()}
</div>
<section class="related" aria-labelledby="rel-h"><h2 id="rel-h">Related guides</h2><div class="guide-grid guide-grid-3">{rel}</div></section>
</article>
<script type="application/ld+json">{ld}</script>'''
    return page(a["title"], a["desc"], f'/articles/{a["slug"]}/', body, "articles", og_image=f'/images/{a["slug"]}.svg', og_type="article")


def articles_index():
    cats = []
    for a in ARTS:
        if a["cat"] not in cats:
            cats.append(a["cat"])
    chips = '<button type="button" class="chip is-on" data-cat="all" aria-pressed="true">All</button>' + "".join(
        f'<button type="button" class="chip" data-cat="{e(c)}" aria-pressed="false">{c}</button>' for c in cats)
    cards = "".join(guide_card(a).replace('<a class="gcard"', f'<a class="gcard" data-cat="{e(a["cat"])}"', 1) for a in ARTS)
    body = f'''<section class="wrap page-head">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span>Guides</span></nav>
<h1>Shopping guides</h1>
<p class="lede">Twelve practical guides to paying less with fewer surprises. Start with <a href="/articles/how-to-spot-a-real-deal/">how to spot a real deal</a>, or filter by topic.</p>
<div class="chips" role="group" aria-label="Filter guides by topic">{chips}</div>
</section>
<section class="wrap" aria-label="Guide list"><div class="guide-grid guide-grid-3" id="art-grid">{cards}</div></section>
<section class="wrap narrow section">
<h2>What you'll find here</h2>
<p>Discount Deal Me covers the mechanics of shopping well: how reference prices work, the order discounts are applied in, how cashback tracking can break, what a restocking fee is, how pack sizes hide price changes and how to keep sale season from swallowing a budget. Each guide includes a table or checklist you can use straight away, a short FAQ and links to related guides.</p>
<p>Guides contain no affiliate links, coupon codes, product rankings or star ratings. Live offers live separately on the <a href="/deals/">deal finder</a>, where every link is labelled and every deal is scored the same way.</p>
</section>'''
    return page("Shopping guides", "Every Discount Deal Me guide in one place: spotting real deals, coupon stacking, price tracking, cashback, returns, sale seasons, unit pricing and budgeting.", "/articles/", body, "articles")


# ---------------------------------------------------------------- about / contact
def about():
    body = f'''<section class="wrap page-head narrow">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span>About</span></nav>
<h1>About Discount Deal Me</h1>
<p class="lede">Discount Deal Me is a small, independent deal site. We list live offers from merchants' official affiliate programs, score them with a formula anyone can read, and publish plain-English guides to shopping well.</p>
</section>
<section class="wrap narrow prose">
<h2>What we do</h2>
<p>Most deal sites are a wall of codes that may or may not work. We take a narrower approach. Offers come straight from the merchant's affiliate program, so the code, the dates and the terms are the merchant's own. Every deal gets the same <a href="/how-we-pick-deals/#deal-score">Deal Score</a>, a short summary of the fine print written by AI and clearly labelled, and an automatic end time so expired deals disappear. Alongside the deals, our <a href="/articles/">guides</a> explain how reference prices work, how coupons and cashback combine, how to read a return policy in a minute and how to keep a budget that survives sale season.</p>
<h2>Who runs it</h2>
<p>The site is published by Marketing Apes, a US digital marketing company. Software pulls and scores offers; people decide which merchants and deals to list, write and edit the guides, and review every change before it goes live. We do not claim special credentials, and we do not present opinions as expert testimony. Where a topic touches on money management, such as credit card rewards or budgeting, we keep to general, widely accepted information and say clearly that it is not personal financial advice.</p>
<h2>Our editorial rules</h2>
<ul class="checklist">
<li><strong>Only merchant-issued codes.</strong> Any code we show was issued by the merchant to affiliates through its program. We never publish codes from coupon aggregators or guesses.</li>
<li><strong>No fake testing or reviews.</strong> We do not claim to have tested products, and we do not publish star ratings, testimonials, rankings of products or "people bought this" counts.</li>
<li><strong>Commission does not set the score.</strong> The Deal Score uses shopper-side factors only. The formula is public.</li>
<li><strong>AI is labelled.</strong> AI-written summaries say so and sit beside the merchant's original terms.</li>
<li><strong>Corrections welcome.</strong> If something is wrong or out of date, <a href="/contact/">tell us</a> and we will review it.</li>
</ul>
<h2>How the site is funded</h2>
<p>Discount Deal Me earns affiliate commissions when you buy through the labelled deal links, and shows advertising served by Google AdSense. Neither changes the price you pay. Merchants do not pay to be listed and do not review what we write, and our guides contain no affiliate links. More detail is on <a href="/how-we-pick-deals/#money">how we make money</a>.</p>
<h2>Get in touch</h2>
<p>Questions, corrections and deal problems are always welcome. Visit the <a href="/contact/">contact page</a> or email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</section>'''
    return page("About", "About Discount Deal Me: an independent deal site that lists merchant-issued offers, scores them with a public formula, labels AI summaries and publishes plain-English shopping guides.", "/about/", body, "about")


def contact():
    body = f'''<section class="wrap page-head narrow">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span>Contact</span></nav>
<h1>Contact us</h1>
<p class="lede">The quickest way to reach us is email: <a class="big-mail" href="mailto:{EMAIL}">{EMAIL}</a></p>
</section>
<section class="wrap narrow prose">
<h2>Good reasons to write</h2>
<ul class="checklist">
<li><strong>A deal that didn't work.</strong> Tell us the merchant, the deal title and what happened at checkout. We check it against the network and fix or remove it.</li>
<li><strong>Corrections.</strong> Spotted something inaccurate or out of date in a guide? Include the page link and what should change.</li>
<li><strong>Topic ideas.</strong> Tell us which shopping question you would like a plain-English guide on.</li>
<li><strong>Advertising or partnership enquiries.</strong> Please put "Partnership" in the subject line. Partners cannot buy placement or a higher Deal Score.</li>
<li><strong>Privacy requests.</strong> See our <a href="/privacy/">privacy policy</a> for what we collect and how to ask about it.</li>
</ul>
<h2>What we can't help with</h2>
<p>We are not a retailer, so we cannot help with orders, deliveries, refunds or account problems at a particular shop. Please contact that retailer directly. We also do not send coupon codes on request or give personal financial advice.</p>
<h2>What happens next</h2>
<p>A person on the Discount Deal Me team reads every message. We try to reply to questions and corrections, though we cannot promise a reply to every topic suggestion. We will only use your email address to respond to you.</p>
<p>This site does not use a contact form; email keeps things simple and means we do not store form submissions.</p>
</section>'''
    return page("Contact", "Contact Discount Deal Me by email about a deal that didn't work, corrections, topic ideas, partnership enquiries or privacy requests.", "/contact/", body, "contact")


def privacy():
    body = f'''<section class="wrap page-head narrow">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span>Legal</span></nav>
<h1>Privacy policy</h1>
<p class="byline">Last updated <time datetime="2026-10-10">October 10, 2026</time></p>
</section>
<section class="wrap narrow prose">
<p>This policy explains what information is collected when you visit discountdealme.com ("Discount Deal Me", "we", "us"), how it is used, and the choices you have. The site is published by Marketing Apes.</p>
<h2>Information we collect</h2>
<p><strong>Information you send us.</strong> If you email us, we receive your email address and whatever you include in your message. We use it only to reply and to keep a record of the conversation.</p>
<p><strong>Information collected automatically.</strong> Like most websites, our hosting provider and the tools described below receive technical information when you visit, such as your IP address, browser type, device type, pages visited, referring page and the date and time of your visit.</p>
<p><strong>Email sign-up.</strong> If you join our email list, we collect your email address, the page and form you signed up from, the referring page and campaign tags if present, your browser type, the date and time, and the consent wording you agreed to. See <a href="#email-list">Our email list</a> below.</p>
<p>The site has no other sign-up or lead forms. The real-discount calculator on our home page and the search on our deal finder run entirely in your browser; what you type is not sent to us. The deal finder downloads our public deal list (/data/deals.json) from this site, like any other page file.</p>
<h2>Cookies and advertising</h2>
<p>We use Google AdSense to show ads. Please note:</p>
<ul>
<li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</li>
<li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visits to this site and/or other sites on the Internet.</li>
<li>You may opt out of personalised advertising by visiting Google <a href="https://adssettings.google.com" rel="noopener">Ads Settings</a>. You can also opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info" rel="noopener">www.aboutads.info</a>.</li>
<li>For more about how Google uses data, see <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">How Google uses information from sites or apps that use its services</a>.</li>
</ul>
<p>Where required by law, such as for visitors in the European Economic Area, the UK or Switzerland, ads may be shown through a consent management tool that asks for your choice before personalised advertising cookies are used. If you decline, Google may still show non-personalised ads, which use cookies for purposes such as frequency capping and fraud prevention.</p>
<h2>Analytics and tag management</h2>
<p>We use Google Tag Manager to load site measurement tools, which may include Google Analytics. These tools use cookies or similar technologies to help us understand how visitors use the site, for example which guides are read most, so we can improve it. Google processes this information under its own privacy policy. You can prevent Google Analytics from using your data with the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Google Analytics opt-out browser add-on</a>, and you can block or delete cookies in your browser settings.</p>
<h2 id="email-list">Our email list</h2>
<p>Joining is optional and needs you to tick the consent box. Your sign-up is sent through our automation provider (Make) and stored in a private Google Sheet that only Discount Deal Me can access. We use it only to send Discount Deal Me emails: deal alerts and shopping guides, roughly once a week and more often around major sales. Emails are sent from a Google Workspace mailbox using a mail-merge tool (GMass), which records opens, clicks and unsubscribes so we can honour opt-outs and stop sending to inactive addresses.</p>
<p>Some emails contain affiliate links marked #ad; if you buy through them we may earn a commission at no extra cost to you. We never sell or rent your email address and do not share it with advertisers. Every email has a one-click unsubscribe link, and you can also ask us to remove you by emailing <a href="mailto:{EMAIL}">{EMAIL}</a>. We delete addresses on request and remove ones that repeatedly bounce.</p>
<h2>Affiliate links</h2>
<p>The "Get deal" buttons on our <a href="/deals/">deal pages</a> and the links on our <a href="/offers/">partner stores page</a> are affiliate links, marked #ad. When you click one, the affiliate network and retailer may set cookies to record that you came from our site, so a commission can be credited if you make a purchase. Their use of that information is governed by their own privacy policies.</p>
<h2>How we use information</h2>
<ul>
<li>To operate, secure and improve the website.</li>
<li>To understand which content is useful.</li>
<li>To show advertising that helps fund the site.</li>
<li>To reply to messages you send us.</li>
</ul>
<p>We do not sell the personal information you send us by email. We do not knowingly collect information from children under 13, and the site is intended for a general adult audience.</p>
<h2>Your choices and rights</h2>
<p>You can control cookies through your browser settings and the opt-out links above. Depending on where you live, you may have rights to request access to, correction of, or deletion of personal information we hold about you, or to object to certain processing. To make a request, email <a href="mailto:{EMAIL}">{EMAIL}</a>. We may need to verify your request before acting on it.</p>
<h2>Data retention and security</h2>
<p>We keep emails for as long as needed to handle your enquiry and for reasonable record-keeping. Analytics and advertising data are retained according to the settings and policies of the providers named above. No method of transmission or storage is completely secure, but we take reasonable steps to protect information.</p>
<h2>Third-party links</h2>
<p>Our pages link to other websites, including retailers and government resources. We are not responsible for their privacy practices; please read their policies.</p>
<h2>Changes and contact</h2>
<p>We may update this policy from time to time and will change the "last updated" date above when we do. Questions about privacy can be sent to <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</section>'''
    return page("Privacy Policy", "How Discount Deal Me handles information: Google AdSense advertising cookies and opt-outs, Google Analytics and Tag Manager, affiliate links and your choices.", "/privacy/", body)


def terms():
    body = f'''<section class="wrap page-head narrow">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span>Legal</span></nav>
<h1>Terms of use</h1>
<p class="byline">Last updated <time datetime="2026-10-10">October 10, 2026</time></p>
</section>
<section class="wrap narrow prose">
<p>By using discountdealme.com you agree to these terms. If you do not agree, please do not use the site.</p>
<h2>General information only</h2>
<p>Discount Deal Me publishes general information about shopping, discounts and budgeting. It is not financial, legal or tax advice, and it is not tailored to your circumstances. Store prices, policies, promotions and laws change often and vary by location. Always check current prices and terms directly with the retailer or relevant authority before relying on anything you read here.</p>
<h2>No guarantee of offers</h2>
<p>We do not sell products and are not responsible for the goods, services, prices or policies of any retailer. Examples on this site are illustrative. Where we link to third-party offers, the retailer's terms apply, and offers may change or end without notice.</p>
<h2>Advertising and affiliate links</h2>
<p>The site displays ads served by Google AdSense, and our deal pages and partner stores page contain clearly labelled affiliate links. We may earn money from ads and qualifying purchases. This does not change the price you pay, and it is not an input to the Deal Score. Ads are not endorsements.</p>
<h2>Deal information, scores and AI summaries</h2>
<p>Deal terms, codes and dates come from merchants through their affiliate programs and are shown as published at the time we last checked them. Merchants can change or end offers at any time, and we do not verify individual item prices. The Deal Score is our own opinion, calculated with the formula on <a href="/how-we-pick-deals/">how we pick deals</a>. Short deal summaries marked "AI summary" are written by an AI model from the merchant's terms; the merchant's own terms and the retailer's checkout always take precedence.</p>
<h2>Intellectual property</h2>
<p>The text, graphics and design of this site are owned by or licensed to the publisher. You may share links and quote brief excerpts with attribution. You may print our checklists and worksheets for personal use. Please do not republish full articles or illustrations without permission.</p>
<h2>Acceptable use</h2>
<p>Please do not attempt to disrupt the site, scrape it in a way that burdens our servers, or use it for any unlawful purpose.</p>
<h2>Disclaimer and limitation of liability</h2>
<p>The site is provided "as is" without warranties of any kind. To the extent permitted by law, the publisher is not liable for any loss or damage arising from your use of the site or reliance on its content, including decisions about purchases.</p>
<h2>Links to other sites</h2>
<p>We link to third-party websites for convenience. We do not control them and are not responsible for their content or practices.</p>
<h2>Changes and contact</h2>
<p>We may update these terms and will change the date above when we do. Questions: <a href="mailto:{EMAIL}">{EMAIL}</a>. See also our <a href="/privacy/">privacy policy</a>.</p>
</section>'''
    return page("Terms of Use", "The terms of use for Discount Deal Me: general shopping information only, no guarantee of offers, advertising and affiliate disclosure, and content rights.", "/terms/", body)




# ---------------------------------------------------------------- offers (partner stores)
OFFERS = [
    {"id": "garden", "name": "Gardenreet", "what": "Outdoor lighting", "blurb": "Low-voltage path and spot lights. Check fixture type and shipping.", "cta": "See Gardenreet",
     "href": "https://www.awin1.com/cread.php?awinmid=62217&awinaffid=2572337&clickref=ddm-garden&ued=https%3A%2F%2Fwww.gardenreet.com%2F", "net": "Awin"},
    {"id": "flex", "name": "Flextail", "what": "Ultralight gear", "blurb": "Pumps, pillows, loungers. Check pack size before you order.", "cta": "See Flextail",
     "href": "https://www.awin1.com/cread.php?awinmid=60295&awinaffid=2572337&clickref=ddm-flex&ued=https%3A%2F%2Fwww.flextailgear.com%2F", "net": "Awin"},
    {"id": "gift", "name": "Gourmet Gift Basket Store", "what": "Food gifts", "blurb": "Ready-made gourmet and holiday baskets. Check what's inside, the delivery window and the shipping cutoff.", "cta": "See gift baskets",
     "href": "https://www.awin1.com/cread.php?awinmid=33247&awinaffid=2572337&clickref=ddm-gift&ued=https%3A%2F%2Fwww.gourmetgiftbasketstore.com%2F", "net": "Awin"},
    {"id": "cj-groupon", "name": "Groupon", "what": "Deal of the day", "blurb": "Local experiences, getaways and goods at Groupon's posted discounts. Check the fine print, expiry date and the business's own price before you buy.", "cta": "See today's Groupon deals",
     "href": "https://www.dpbolvw.net/click-101511733-15204586-1787000588000", "net": "CJ"},
    {"id": "cj-allclad", "name": "All-Clad", "what": "Cookware", "blurb": "Stainless and nonstick pans from All-Clad's own store. Compare the set price with the pieces you'd actually use, and check the warranty terms.", "cta": "See All-Clad",
     "href": "https://www.jdoqocy.com/click-101511733-17166872-1776205343000", "net": "CJ"},
    {"id": "cj-mms", "name": "M&M'S", "what": "Personalised candy gifts", "blurb": "Custom-printed M&M'S and gift tins. Allow for production time before holiday shipping cutoffs.", "cta": "See M&M'S gifts",
     "href": "https://www.dpbolvw.net/click-101511733-15733888", "net": "CJ"},
]
TAYST = "https://www.awin1.com/cread.php?awinmid=90529&awinaffid=2572337&clickref=ddm-home&ued=https%3A%2F%2Fwww.tayst.com%2Fpages%2Fcompostable-coffee-kcups"


def offers_page():
    cards = "".join(f'''<article class="store">
<div class="store-top"><span class="deal-merchant">{e(o["name"])}</span><span class="deal-cat">{e(o["what"])}</span></div>
<p>{e(o["blurb"])}</p>
<a class="btn btn-ghost" rel="sponsored nofollow noopener" data-offer="{o["id"]}" href="{e(o["href"])}">{e(o["cta"])} <span aria-hidden="true">&#8599;</span></a>
<p class="store-net">Affiliate link via {o["net"]}</p>
</article>''' for o in OFFERS)
    body = f'''<section class="wrap page-head">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span>Partner stores</span></nav>
<p class="adchip">#ad &middot; Sponsored</p>
<h1>Partner stores</h1>
<p class="lede">A short list of stores whose affiliate programs we have joined. These are store links, not time-limited deals; for those, use the <a href="/deals/">deal finder</a>. Commission possible. Your price does not change.</p>
</section>
<section class="wrap feature-store">
<div class="feature-img"><img src="/offers/hero.jpg" width="1400" height="1050" alt="A compostable coffee pod beside a mug on a walnut counter at dusk, a small lamp glowing in the window"></div>
<div class="feature-copy">
<span class="deal-merchant">Tayst</span>
<h2>Compostable coffee pods</h2>
<p>Compostable pods for single-serve machines. Check machine fit, pack size and your city's composting rules on the seller's page; composting rules vary by product and city.</p>
<a class="btn" rel="sponsored nofollow noopener" data-offer="tayst" href="{e(TAYST)}">See Tayst coffee <span aria-hidden="true">&#8599;</span></a>
<p class="store-net">Affiliate link via Awin</p>
</div>
</section>
<section class="wrap section">
<article class="store store-alert" data-expires="2026-10-11T03:59:00Z">
<div class="store-top"><span class="deal-merchant">KitchenAid</span><span class="deal-cat">Ending soon</span></div>
<h2>KitchenAid Harvest Event</h2>
<p>Up to 25% off select countertop appliances and up to $120 off select stand mixers on kitchenaid.com, no code. Ends Sat Oct 10 at 8:59 PM PT. Select models only, so check your cart price.</p>
<a class="btn btn-ghost" href="/deals/kitchenaid-harvest-event/">See the KitchenAid deal</a>
</article>
<div class="store-grid">{cards}</div>
</section>
<div class="wrap">{signup("offers")}</div>'''
    extra_js = '''<script>
document.querySelectorAll('[data-expires]').forEach(function(el){if(Date.now()>=Date.parse(el.getAttribute('data-expires')))el.hidden=true;});
window.dataLayer=window.dataLayer||[];
document.querySelectorAll('a[rel~="sponsored"]').forEach(function(a){
  a.addEventListener('click',function(){window.dataLayer.push({event:'affiliate_click',offer:a.getAttribute('data-offer'),href:a.href});});
});
</script>
'''
    html_ = page("Partner stores", "Stores Discount Deal Me partners with through affiliate programs: Tayst coffee, Gardenreet lighting, Flextail gear, gift baskets, Groupon, All-Clad and M&M'S. Disclosed affiliate links; your price does not change.", "/offers/", body, "", own_signup=True)
    return html_.replace("</main>\n", "</main>\n" + extra_js, 1)


# ---------------------------------------------------------------- deal checklist
def checklist_page():
    body = f'''<section class="wrap page-head narrow">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span>Deal checklist</span></nav>
<h1>Check the deal before you check out.</h1>
<p class="lede">A short worksheet for comparing the actual purchase, not just the discount headline.</p>
</section>
<section class="wrap narrow checklist-layout">
<div class="prose">
<h2>1. Compare the same item</h2><p>Match the model, quantity, condition and included accessories. A lower price for a smaller pack or refurbished item is not the same comparison as a new full-size product.</p>
<h2>2. Calculate the final total</h2><p>Check shipping, taxes, mandatory fees and recurring charges. Note whether a promotion requires a subscription, first order or minimum purchase. Read the current terms at the merchant before paying.</p>
<h2>3. Check the exit</h2><p>Look at the return window, return shipping responsibility, restocking fees and seller contact details. Save the order confirmation and the offer terms that influenced your decision.</p>
</div>
<aside class="side-card print-card"><h2>Your checklist</h2>
<label class="tick"><input type="checkbox"> <span>Same item and quantity</span></label>
<label class="tick"><input type="checkbox"> <span>Final checkout total</span></label>
<label class="tick"><input type="checkbox"> <span>Promotion restrictions</span></label>
<label class="tick"><input type="checkbox"> <span>Return terms and seller details</span></label>
<button type="button" class="btn btn-ghost btn-small" onclick="window.print()">Print this checklist</button>
<p class="fine">These checkboxes stay on this page; nothing is submitted or saved.</p></aside>
</section>
<section class="wrap narrow section">
<div class="note-card"><b>Compare two checkouts.</b> Use the printable <a href="/guides/checkout-comparison/">checkout and return-policy worksheet</a> to compare two sellers side by side.</div>
<div class="note-card"><b>#ad &middot; If the item is compostable coffee pods.</b> Match your machine, pack size and disposal rules to the exact product page before treating a headline as the checkout total. Our <a href="/offers/" rel="sponsored">partner stores page</a> lists a disclosed Tayst offer (Awin merchant 90529, tracking tag ddm-home). This checklist adds no tracking link and states no commission rate.</div>
<p class="fine">Published September 20, 2026, redesigned October 10, 2026. Prepared with AI assistance and reviewed for Marketing Apes.</p>
</section>'''
    return page("Deal checklist", "A four-point checklist to run before you pay: same item, final total, promotion restrictions and return terms. Printable, and nothing you tick is saved.", "/deal-checklist/", body, "")


# ---------------------------------------------------------------- 404
def notfound():
    body = f'''<section class="wrap nf">
<p class="kicker">404</p>
<h1>This page has expired, like most deals eventually do.</h1>
<p class="lede">The page you were looking for isn't here. It may have moved, or the link may be mistyped.</p>
<p class="hero-ctas"><a class="btn" href="/deals/">See live deals</a><a class="btn btn-ghost" href="/articles/">Browse guides</a></p>
</section>'''
    return head("Page not found", "This page could not be found on Discount Deal Me.", "/404.html", robots='<meta name="robots" content="noindex">\n') + nav() + f'<main id="main">{body}</main>\n' + FOOT


def main():
    svgs.write_all(os.path.join(OUT, "images"))
    write("assets/site.css", theme.CSS.strip() + "\n")
    write("assets/site.js", client.JS.strip() + "\n")
    write("assets/signup.js", client.SIGNUP_JS.strip() + "\n")
    write("data/deals.json", json.dumps(deals.public_feed(), indent=1, ensure_ascii=False) + "\n")
    write("index.html", home())
    write("deals/index.html", deals_page())
    write("how-we-pick-deals/index.html", method_page())
    write("deals/kitchenaid-harvest-event/index.html", events.kitchenaid(head, nav, FOOT))
    write("offers/index.html", offers_page())
    write("deal-checklist/index.html", checklist_page())
    write("articles/index.html", articles_index())
    for a in ARTS:
        write(f'articles/{a["slug"]}/index.html', article_page(a))
        print(a["slug"], words(a["body"]))
    write("about/index.html", about())
    write("contact/index.html", contact())
    write("privacy/index.html", privacy())
    write("terms/index.html", terms())
    write("404.html", notfound())
    write("contact.html", f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact | {BRAND}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="{HOST}/contact/">
<meta http-equiv="refresh" content="0;url=/contact/">
</head>
<body>
<p>The contact page has moved. <a href="/contact/">Continue to Contact {BRAND}</a>.</p>
</body>
</html>
''')
    write("robots.txt", f"""User-agent: *
Allow: /
Allow: /ads.txt
Allow: /deals/
Allow: /offers/
Allow: /guides/
Allow: /deal-checklist/
Disallow: /preview/

User-agent: Mediapartners-Google
Allow: /

Sitemap: {HOST}/sitemap.xml
""")
    urls = [("/", SITE_UPDATED), ("/deals/", SITE_UPDATED), ("/how-we-pick-deals/", SITE_UPDATED), ("/deals/kitchenaid-harvest-event/", SITE_UPDATED),
            ("/articles/", SITE_UPDATED)] + [(f'/articles/{a["slug"]}/', UPDATED) for a in ARTS] + [
            ("/about/", SITE_UPDATED), ("/contact/", SITE_UPDATED), ("/privacy/", SITE_UPDATED), ("/terms/", SITE_UPDATED),
            ("/deal-checklist/", SITE_UPDATED), ("/guides/checkout-comparison/", UPDATED), ("/offers/", SITE_UPDATED)]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
        f"  <url><loc>{HOST}{u}</loc><lastmod>{d}</lastmod></url>\n" for u, d in urls) + "</urlset>\n"
    write("sitemap.xml", sm)
    write("_redirects", "/preview/*  /  301\n/preview    /  301\n")


if __name__ == "__main__":
    main()
