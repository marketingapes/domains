"""/coupons/ store pages, /how-we-verify-codes/ and the /deal-checker/ page for Discount Deal Me.

Called from build.py main(). Reads only committed data: coupons_feed.json and price_history.json
(both written by coupons_refresh.py from network records). Output does not depend on the clock:
expiry and "starts soon" states are applied in the reader's browser by assets/tools.js.
No AdSense on any of these pages (deal / coupon pages).
"""
import datetime, html, json, os, re
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
FEED = json.load(open(os.path.join(HERE, "coupons_feed.json")))
HIST = json.load(open(os.path.join(HERE, "price_history.json")))
CHECKED = FEED["checked_at"]
PT = ZoneInfo("America/Los_Angeles")
E = html.escape
TOOLS_V = "20261115a"
# Amazon Associates tag used for Amazon search links on /deal-checker/. Empty = no Amazon links.
AMAZON_TAG = "tonedntastyne-20"  # Kyle, Nov 15 2026: DDM uses the TNT tag for now
# Optional live lookup backend (tools/ddm-deal-checker-worker). Empty = static data only.
CHECKER_API = "https://ddm-deal-checker.kyleg-188.workers.dev"
# "Email me when it drops" form. Off until a price-drop email job exists and Kyle approves the wording.
PRICE_ALERTS = False
PRICE_ALERT_CONSENT_VERSION = "DDM_PRICE_ALERT_2026-11-15_V1"
PRICE_ALERT_CONSENT = ("Yes, email me if Discount Deal Me records a lower price for this item, plus occasional deal alerts. "
                       "Some emails include affiliate links (#ad). Unsubscribe any time with one click.")
FAR_FUTURE_YEARS = 3


def _dt(s):
    return datetime.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)


def pt_full(s):
    d = _dt(s).astimezone(PT)
    return d.strftime("%b %-d, %Y, %-I:%M %p ") + d.tzname()


def pt_day(s):
    return _dt(s).astimezone(PT).strftime("%b %-d, %Y")


MONTH = _dt(CHECKED).astimezone(PT).strftime("%B %Y")
MON_SHORT = _dt(CHECKED).astimezone(PT).strftime("%b %Y")


def far(ends):
    return bool(ends) and (_dt(ends) - _dt(CHECKED)).days > 365 * FAR_FUTURE_YEARS


def end_text(r):
    if not r["ends"]:
        return "No end date published"
    if far(r["ends"]):
        return f"No firm end date (network lists {_dt(r['ends']).year})"
    return "Ends " + pt_day(r["ends"])


def checked_line(extra="", networks=None):
    nets = " and ".join(sorted(networks or {n for s in FEED["stores"] for n in s["networks"]}))
    return (f'<p class="feed-status"><span class="dot" aria-hidden="true"></span>'
            f'<span>Last checked <time datetime="{CHECKED}" data-checked>{pt_full(CHECKED)}</time></span>'
            f'<span>Source: {E(nets)} affiliate network records</span>{extra}'
            f'<a href="/how-we-verify-codes/">How we verify codes</a></p>')


DISCLOSE = ('<p class="disclose"><b>#ad</b> Store links on this page are affiliate links. If you buy, Discount Deal Me may earn a '
            'commission at no extra cost to you. It never changes which codes we list or the order they appear in.</p>')


def code_row(s, r):
    dates = []
    if r["starts"] and r["state"] == "upcoming":
        dates.append(f'<span data-starts-label>Starts {pt_day(r["starts"])}</span>')
    dates.append(f'<span class="meta-end">{E(end_text(r))}</span>')
    if r.get("min_purchase"):
        dates.append(f'<span>Minimum purchase ${E(r["min_purchase"])} (network field)</span>')
    ends_attr = r["ends"] if r["ends"] and not far(r["ends"]) else ""
    code = r["code"]
    codebox = (f'<div class="code"><span class="code-label">Code</span><code>{E(code)}</code>'
               f'<button type="button" class="code-copy" data-copy="{E(code)}">Copy</button></div>') if code else ""
    btn = f'Use code at {E(s["name"])}' if code else f'Get offer at {E(s["name"])}'
    src = f'{r["network"]} record {E(r["id"].split("-", 1)[1])}' + (f', code from the {E(r["code_field"])} field' if code else "")
    return f'''<article class="cp-row{' is-upcoming' if r["state"] == "upcoming" else ''}" data-cp="{E(r["id"])}" data-ends="{ends_attr}" data-starts="{r["starts"] if r["state"] == "upcoming" else ""}">
<div class="cp-main"><h3 class="cp-title">{E(r["title"])}</h3>
<p class="deal-meta">{"".join(dates)}</p>
<p class="terms"><strong>Terms as published by {E(s["name"])}:</strong> {E(r["terms"])}</p>
<p class="cp-src">Source: {src}. Last checked {pt_day(CHECKED)}.</p></div>
<div class="cp-side">{codebox}<a class="btn btn-deal btn-small" rel="sponsored nofollow noopener" target="_blank" data-offer="{E(r["id"])}" href="{E(r["link"])}">{btn} <span aria-hidden="true">&#8599;</span></a></div>
</article>'''


def store_title(s):
    n = s["live_codes"]
    if n:
        return f'{s["name"]} Promo Codes, {MON_SHORT}: {n} Network-Checked Code{"s" if n != 1 else ""}'
    return f'{s["name"]} Coupons & Deals, {MON_SHORT}'


def store_desc(s):
    bits = []
    if s["live_codes"]:
        bits.append(f'{s["live_codes"]} {s["name"]} promo code{"s" if s["live_codes"] != 1 else ""}')
    if s["live_offers"]:
        bits.append(f'{s["live_offers"]} offer{"s" if s["live_offers"] != 1 else ""}')
    lead = (" and ".join(bits) + " from the store's official affiliate program") if bits else f'No verified {s["name"]} codes right now'
    return f'{lead}, with start and end dates and the full terms. Expired codes are hidden. Last checked {pt_day(CHECKED)}.'


def jsonld(s, path, host):
    crumbs = {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": host + "/"},
        {"@type": "ListItem", "position": 2, "name": "Coupons", "item": host + "/coupons/"},
        {"@type": "ListItem", "position": 3, "name": s["name"], "item": host + path}]}
    pg = {"@type": "WebPage", "name": store_title(s), "url": host + path, "dateModified": CHECKED,
          "about": {"@type": "Organization", "name": s["name"], **({"url": "https://" + s["domain"]} if s["domain"] else {})}}
    live = [r for r in s["codes"] + s["offers"] if r["state"] == "live"]
    if live:
        pg["mainEntity"] = {"@type": "ItemList", "numberOfItems": len(live), "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "item": {"@type": "Offer", "name": r["title"][:150], "description": r["terms"][:300],
                                                            **({"validFrom": r["starts"]} if r["starts"] else {}),
                                                            **({"priceValidUntil": r["ends"][:10]} if r["ends"] and not far(r["ends"]) else {}),
                                                            "seller": {"@type": "Organization", "name": s["name"]}}}
            for i, r in enumerate(live[:20])]}
    return '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@graph": [crumbs, pg]}, ensure_ascii=False).replace("</", "<\\/") + "</script>\n"


def tools_css():
    return f'<link rel="stylesheet" href="/assets/tools.css?v={TOOLS_V}">\n'


def tools_js():
    return f'<script src="/assets/tools.js?v={TOOLS_V}" defer></script>\n'


def store_page(B, s):
    path = f'/coupons/{s["slug"]}/'
    live_codes = [r for r in s["codes"] if r["state"] == "live"]
    up = [r for r in s["codes"] + s["offers"] if r["state"] == "upcoming"]
    offers = [r for r in s["offers"] if r["state"] == "live"]
    others = [o for o in FEED["stores"] if o["slug"] != s["slug"] and o["live_codes"]][:8]
    codes_html = "".join(code_row(s, r) for r in live_codes)
    nocode = (f'<div class="empty cp-empty" data-cp-empty {"hidden" if live_codes else ""}><h2>No verified {E(s["name"])} codes right now</h2>'
              f'<p>{E(s["name"])} has no active promo code in its affiliate feed as of our last check. We never post codes from forums or guesses, '
              f'so this list stays empty until the store publishes one.' + (' The store\'s current offers are below.' if offers else '') + '</p>'
              f'<p><a class="btn btn-ghost btn-small" rel="sponsored nofollow noopener" target="_blank" data-offer="store-{E(s["slug"])}" href="{E(s["store_link"])}">Visit {E(s["name"])} <span aria-hidden="true">&#8599;</span></a> '
              f'<a class="btn btn-ghost btn-small" href="/deals/">See today\'s live deals</a></p></div>')
    sec_up = (f'<section class="wrap section cp-sec" aria-labelledby="up-h"><h2 id="up-h">Starting soon</h2><p class="sec-lede">Published by {E(s["name"])} ahead of time. These move up to the list above on their start date.</p>'
              + "".join(code_row(s, r) for r in up) + '</section>') if up else ""
    sec_off = (f'<section class="wrap section cp-sec" aria-labelledby="off-h"><h2 id="off-h">Current {E(s["name"])} offers (no code needed)</h2>'
               + "".join(code_row(s, r) for r in offers) + '</section>') if offers else ""
    rel = ("<section class=\"wrap section cp-sec\"><h2>Other stores with verified codes</h2><ul class=\"cp-links\">" +
           "".join(f'<li><a href="/coupons/{o["slug"]}/">{E(o["name"])} promo codes</a> <small>{o["live_codes"]} code{"s" if o["live_codes"] != 1 else ""}</small></li>' for o in others) +
           '</ul><p><a href="/coupons/">All stores</a></p></section>') if others else ""
    nets = " and ".join(s["networks"])
    body = f'''<section class="wrap page-head">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/coupons/">Coupons</a> <span aria-hidden="true">/</span> <span>{E(s["name"])}</span></nav>
<h1>{E(s["name"])} promo codes</h1>
<p class="lede">Only codes and offers that {E(s["name"])} publishes to us through the {E(nets)} affiliate network, with the store's own terms and dates. Codes past their end date disappear automatically.</p>
{checked_line(networks=s["networks"])}
{DISCLOSE}
</section>
<section class="wrap section cp-sec" aria-labelledby="codes-h">
<h2 id="codes-h">Verified {E(s["name"])} codes <span class="cp-count" data-cp-count>{len(live_codes)}</span></h2>
<div class="cp-list" data-cp-list>{codes_html}</div>
{nocode}
</section>
{sec_up}
{sec_off}
<section class="wrap section cp-sec narrow-sec"><h2>About these {E(s["name"])} codes</h2>
<p>"Verified" here means the code came from {E(s["name"])}'s own record in the {E(nets)} affiliate network and was active when we last checked, {pt_full(CHECKED)}. We copy the code, dates and terms exactly as published and do not add savings estimates, success rates or reviews. We have not tested each code at checkout, so a store can still limit a code to certain items, first orders or regions. If a code fails, <a href="/contact/">tell us</a> and we will recheck it. <a href="/how-we-verify-codes/">Read how we verify codes</a>.</p>
<p>Comparing prices? Paste a product link into our <a href="/deal-checker/">deal checker</a> to see the price history we have recorded.</p>
</section>
{rel}'''
    robots = "" if s["indexable"] else '<meta name="robots" content="noindex,follow">\n'
    return B.page(store_title(s), store_desc(s), path, body, "coupons", robots=robots, ads=False,
                  extra=tools_css() + jsonld(s, path, B.HOST)).replace("</body>", tools_js() + "</body>")


def index_page(B):
    with_codes = [s for s in FEED["stores"] if s["live_codes"]]
    cards = "".join(f'''<a class="cp-card" href="/coupons/{s["slug"]}/" data-name="{E(s["name"].lower())}"><span class="cp-card-name">{E(s["name"])}</span>
<span class="cp-card-n"><b data-store-count="{E(s["slug"])}">{s["live_codes"]}</b> verified code{"s" if s["live_codes"] != 1 else ""}</span>
<span class="cp-card-net">{E(" + ".join(s["networks"]))}</span></a>''' for s in with_codes)
    az = "".join(f'<li data-name="{E(s["name"].lower())}"><a href="/coupons/{s["slug"]}/">{E(s["name"])}</a> <small>{(str(s["live_codes"]) + " code" + ("s" if s["live_codes"] != 1 else "")) if s["live_codes"] else ("offers" if s["live_offers"] else "no codes right now")}</small></li>' for s in FEED["stores"])
    total = sum(s["live_codes"] for s in FEED["stores"])
    body = f'''<section class="wrap page-head">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span>Coupons</span></nav>
<h1>Verified promo codes</h1>
<p class="lede">Codes straight from each store's affiliate program, never scraped, guessed or crowd-sourced. {total} live codes from {len(with_codes)} stores as of our last check. If a store has nothing active, we say so.</p>
{checked_line()}
{DISCLOSE}
<form class="finder-search cp-filter" role="search" onsubmit="return false"><label class="sr-only" for="cp-q">Find a store</label><input id="cp-q" type="search" placeholder="Find a store" autocomplete="off" data-cp-filter></form>
</section>
<section class="wrap section cp-sec" aria-labelledby="wc-h"><h2 id="wc-h">Stores with verified codes</h2><div class="cp-grid">{cards}</div></section>
<section class="wrap section cp-sec" aria-labelledby="az-h"><h2 id="az-h">All partner stores A to Z</h2><ul class="cp-az">{az}</ul>
<p class="smart-note">These are stores Discount Deal Me is approved to promote through CJ and Impact. A store appears here because we have a live affiliate relationship with it, not because we rate it.</p></section>'''
    return B.page("Verified Promo Codes and Coupons", f"{total} promo codes from {len(with_codes)} stores, taken only from official affiliate-program records, with dates and terms. Expired codes are hidden automatically.",
                  "/coupons/", body, "coupons", ads=False, extra=tools_css()).replace("</body>", tools_js() + "</body>")


def verify_page(B):
    body = f'''<section class="wrap page-head narrow">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span>How we verify codes</span></nav>
<h1>How we verify codes</h1>
<p class="lede">Short version: every code on Discount Deal Me comes from the store itself, through its affiliate program. We do not post codes we found on forums, social media or other coupon sites.</p>
</section>
<section class="wrap section narrow prose">
<h2>Where codes come from</h2>
<p>Stores that work with us publish their promotions to affiliate networks: <strong>CJ</strong> (Commission Junction) and <strong>Impact</strong>. Each promotion is a record with a code field, a start date, an end date and terms written by the store. Our refresh job reads those records through the networks' official APIs and copies the code, dates and terms exactly.</p>
<h2>What "verified" means here</h2>
<ul>
<li>The code is in the store's own record, in the network's code field. We never type a code in by hand.</li>
<li>The record was active, and not past its end date, at our last check. Every page shows when that was.</li>
<li>Codes that pass their end date are hidden by your browser at that moment, even between our checks.</li>
<li>A code with no end date is dropped if the store has not updated it in over a year, or if its own name points to a season or event that is over (for example a "Memorial Day" code in November).</li>
<li>We remove codes that were clearly made for another website, codes aimed only at other countries, and records whose code and description disagree.</li>
</ul>
<h2>What it does not mean</h2>
<p>We have not placed a test order with every code. A store can still limit a code to some items, first orders or a minimum spend, and those limits are in the terms we show. We do not publish savings estimates, "success rates", user votes or reviews, because we do not have honest data for them.</p>
<h2>When a store has no codes</h2>
<p>We say "No verified codes right now" and show the store's current no-code offers if it has any. Pages with very little on them are kept out of search results until there is something useful to show.</p>
<h2>How we make money</h2>
<p>Store links are affiliate links (#ad). If you buy, we may earn a commission from the store. It never changes your price, which codes we list, or their order. More detail is in <a href="/how-we-pick-deals/#money">how we pick deals</a>.</p>
<h2>Found a code that does not work?</h2>
<p><a href="/contact/">Tell us</a> which store and code. We recheck it against the network and remove it if the store has withdrawn it.</p>
<p class="checked">Last check of all store records: <time datetime="{CHECKED}">{pt_full(CHECKED)}</time>. <a href="/coupons/">Browse verified codes</a>.</p>
</section>'''
    return B.page("How We Verify Codes", "Every Discount Deal Me promo code comes from the store's own affiliate-network record. Here is what verified means, what it doesn't, and how we handle expired codes.",
                  "/how-we-verify-codes/", body, "coupons", ads=False)


# ---------------------------------------------------------------- deal checker
def checker_data():
    """Public data for /deal-checker/: products with observed price runs, plus live codes per store."""
    stores = {s["slug"]: s for s in FEED["stores"]}
    prods = []
    for k, p in sorted(HIST["products"].items()):
        s = stores.get(p["store"])
        if not s:
            continue
        prods.append({"id": k, "t": p["title"], "s": p["store"], "u": p.get("link", ""), "c": (p["click_url"] + ("&" if "?" in p["click_url"] else "?") + "sid=ddm-checker") if p.get("click_url") else "",
                      "cur": p.get("currency", "USD"), "r": p["runs"]})
    st = {s["slug"]: {"n": s["name"], "d": s["domain"], "l": s["store_link"].replace("sid=ddm-coupons", "sid=ddm-checker").replace("subId1=ddm-coupons", "subId1=ddm-checker"),
                      "codes": [{"code": r["code"], "t": r["title"], "e": r["ends"] if not far(r["ends"]) else "", "st": r["starts"] if r["state"] == "upcoming" else ""}
                                for r in s["codes"]]} for s in FEED["stores"]}
    return {"about": "Prices observed by Discount Deal Me from CJ product search. runs = [first_seen, last_seen, price, sale_price] (America/Los_Angeles dates). "
                     "Only the dates in check_dates were observed. Links are affiliate links (#ad).",
            "updated_at": HIST.get("updated_at", CHECKED), "check_dates": HIST.get("check_dates", []),
            "verdict_rules": {"min_check_days": 3, "min_span_days": 14}, "amazon_tag": AMAZON_TAG, "products": prods, "stores": st}


def coupons_public():
    return {"checked_at": CHECKED, "sources": FEED["sources"], "disclosure": "Store links are affiliate links (#ad).",
            "stores": [{"slug": s["slug"], "name": s["name"], "advertiser_names": s.get("advertiser_names", []), "networks": s["networks"], "page": f'/coupons/{s["slug"]}/',
                        "codes": [{k: r[k] for k in ("id", "code", "title", "terms", "starts", "ends", "state", "network")} for r in s["codes"]],
                        "offers": [{k: r[k] for k in ("id", "title", "terms", "starts", "ends", "state", "network")} for r in s["offers"]]} for s in FEED["stores"]]}


def checker_page(B):
    days = HIST.get("check_dates", [])
    first = datetime.date.fromisoformat(days[0]).strftime("%b %-d, %Y") if days else "today"
    nprod = len(HIST["products"])
    alert = ""
    if PRICE_ALERTS:
        alert = f'''<form class="signup-form dc-alert" data-signup="price-alert" action="{B.SIGNUP_HOOK}" method="post" novalidate hidden>
<h3>Email me if the price drops</h3>
<input type="hidden" name="domain_id" value="ddm"><input type="hidden" name="form" value="price-alert"><input type="hidden" name="consent_version" value="{PRICE_ALERT_CONSENT_VERSION}"><input type="hidden" name="watch_product" value="">
<div class="hp" aria-hidden="true"><label for="pa-web">Leave this empty</label><input id="pa-web" name="website" type="text" tabindex="-1" autocomplete="off"></div>
<div class="signup-row"><label class="sr-only" for="pa-email">Email address</label><input id="pa-email" name="email" type="email" required autocomplete="email" placeholder="you@email.com"><button class="btn" type="submit">Watch this price</button></div>
<label class="signup-consent"><input type="checkbox" name="consent" value="yes" required> <span data-consent-text>{E(PRICE_ALERT_CONSENT)}</span></label>
<p class="signup-fine">We keep your email in a private list used only for Discount Deal Me emails. We never sell it. See our <a href="/privacy/#email-list">privacy policy</a>.</p>
<p class="signup-msg" role="status" aria-live="polite"></p></form>'''
    body = f'''<section class="wrap page-head">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span>Deal checker</span></nav>
<h1>Is this a real deal?</h1>
<p class="lede">Paste a product link or type a product name. We show the price we last saw, the price history we have actually recorded, a plain verdict, and verified codes or cheaper picks from stores we work with.</p>
<p class="feed-status"><span class="dot" aria-hidden="true"></span><span><b>{nprod:,}</b> products tracked</span><span>Price log started {first}</span><span>Last price check <time datetime="{HIST.get("updated_at", CHECKED)}">{pt_full(HIST.get("updated_at", CHECKED))}</time></span><a href="#how">How the verdict works</a></p>
{DISCLOSE.replace("Store links on this page", "Store and product links on this page").replace("</p>", (" As an Amazon Associate, Discount Deal Me earns from qualifying purchases.</p>" if AMAZON_TAG else "</p>"))}
</section>
<section class="wrap section dc" aria-label="Deal checker">
<form class="finder-search dc-form" id="dc-form" role="search"><label class="sr-only" for="dc-q">Product link or name</label><input id="dc-q" name="q" type="search" placeholder="Paste a product link, or try &quot;stand mixer&quot;" autocomplete="off"><button class="btn" type="submit">Check price</button></form>
<p class="dc-try">Try: <button type="button" class="linklike" data-dc-try="KitchenAid hand mixer">KitchenAid hand mixer</button> &middot; <button type="button" class="linklike" data-dc-try="dash cam">dash cam</button> &middot; <button type="button" class="linklike" data-dc-try="flea and tick">flea and tick</button> &middot; <button type="button" class="linklike" data-dc-try="coffee">coffee</button></p>
<div id="dc-out" class="dc-out" aria-live="polite"></div>
{alert}
<p class="smart-note">The check runs in your browser over our <a href="/data/price-check.json">public price log</a>. Nothing you paste is sent to us{" except to our live lookup service when we have no match" if CHECKER_API else ""}.</p>
</section>
<section class="wrap section narrow prose" id="how">
<h2>How the verdict works</h2>
<p>The verdict is rule-based, not written by AI. It only uses prices we recorded ourselves from stores' affiliate product feeds.</p>
<ul>
<li><strong>Not enough history yet</strong>: we have seen this item on fewer than 3 days, or over less than 14 days. We show the current price and say so instead of guessing.</li>
<li><strong>Lowest price we have recorded</strong>: today's price matches or beats every price we have logged for it.</li>
<li><strong>Below its usual price</strong>: at least 5% under the middle (median) of the prices we logged.</li>
<li><strong>About its usual price</strong>: within 5% of that median.</li>
<li><strong>Higher than usual</strong>: more than 5% above it. Waiting may pay off.</li>
</ul>
<p>When a store marks an item down, its feed often lists a regular price next to the sale price. We show that as "the store's listed regular price". It is the store's claim, and we have not checked it against past prices.</p>
<p>We started logging prices on {first}, so most items will say "not enough history yet" for the first couple of weeks. The log grows with every daily refresh. We track {nprod:,} products from {len({p["store"] for p in HIST["products"].values()})} partner stores today; links to other stores will show their verified codes if we work with them.</p>
<h2>What we never do</h2>
<p>We do not invent "was" prices, savings percentages, ratings or reviews. If we have no data for something, the checker says so.</p>
</section>'''
    cfg = json.dumps({"api": CHECKER_API, "amazonTag": AMAZON_TAG})
    return B.page("Is This a Real Deal? Price Checker", "Paste a product link or name to see its current price, the price history we have actually recorded, a plain fair-price verdict, and verified codes or alternatives.",
                  "/deal-checker/", body, "checker", ads=False, extra=tools_css() + f'<script>window.DDM_CHECKER={cfg};</script>\n').replace("</body>", tools_js() + "</body>")


def pages(B):
    out = {"coupons/index.html": index_page(B), "how-we-verify-codes/index.html": verify_page(B), "deal-checker/index.html": checker_page(B),
           "data/coupons.json": json.dumps(coupons_public(), indent=1, ensure_ascii=False) + "\n",
           "data/price-check.json": json.dumps(checker_data(), separators=(",", ":"), ensure_ascii=False) + "\n",
           "assets/tools.css": TOOLS_CSS.strip() + "\n", "assets/tools.js": TOOLS_JS.strip() + "\n"}
    for s in FEED["stores"]:
        out[f'coupons/{s["slug"]}/index.html'] = store_page(B, s)
    urls = [("/coupons/", CHECKED[:10]), ("/how-we-verify-codes/", CHECKED[:10]), ("/deal-checker/", CHECKED[:10])] + [
        (f'/coupons/{s["slug"]}/', CHECKED[:10]) for s in FEED["stores"] if s["indexable"]]
    out["sitemap-tools.xml"] = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
                                "".join(f"  <url><loc>{B.HOST}{u}</loc><lastmod>{d}</lastmod></url>\n" for u, d in urls) + "</urlset>\n")
    return out


TOOLS_CSS = r"""
.cp-sec{padding-top:8px}
.cp-sec h2{font-size:1.25rem;margin:0 0 12px;display:flex;align-items:center;gap:10px}
.cp-count{font-size:.8rem;font-weight:700;background:var(--surface-2);border:1px solid var(--line);border-radius:999px;padding:2px 10px;color:var(--ink-2)}
.cp-list{display:flex;flex-direction:column;gap:12px}
.cp-row{display:grid;grid-template-columns:1fr 280px;gap:16px;align-items:start;background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:16px 18px;box-shadow:var(--shadow);margin-bottom:12px}
.cp-row.is-upcoming{background:var(--surface)}
.cp-title{font-size:1.02rem;margin:0 0 6px;line-height:1.35}
.cp-row .terms{font-size:.875rem;color:var(--ink-2);margin:6px 0}
.cp-src{font-size:.78rem;color:var(--ink-3);margin:4px 0 0}
.cp-side{display:flex;flex-direction:column;gap:8px}
.cp-side .btn{width:100%}
.cp-empty{margin:4px 0 0}
.cp-links,.cp-az{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px 18px}
.cp-links small,.cp-az small{color:var(--ink-3)}
.cp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
.cp-card{display:flex;flex-direction:column;gap:4px;background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:14px 16px;text-decoration:none;color:var(--ink);box-shadow:var(--shadow)}
.cp-card:hover{border-color:var(--acc)}
.cp-card-name{font-weight:700}
.cp-card-n{font-size:.9rem;color:var(--ink-2)}
.cp-card-n b{color:var(--acc)}
.cp-card-net{font-size:.75rem;color:var(--ink-3)}
.cp-filter{max-width:420px;margin-top:8px}
.dc-form{max-width:720px}
.dc-try{font-size:.875rem;color:var(--ink-2);margin:8px 0 18px}
.dc-out{display:flex;flex-direction:column;gap:14px;max-width:900px}
.dc-card{background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:18px;box-shadow:var(--shadow)}
.dc-card h2,.dc-card h3{margin:0 0 6px;font-size:1.1rem;line-height:1.35}
.dc-store{font-size:.8rem;font-weight:600;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em}
.dc-price{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;margin:8px 0}
.dc-price b{font-size:1.7rem}
.dc-price s{color:var(--ink-3)}
.dc-verdict{display:inline-flex;align-items:center;gap:8px;font-weight:700;border-radius:999px;padding:4px 12px;font-size:.9rem;background:var(--surface-2);border:1px solid var(--line)}
.dc-verdict.is-good{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
.dc-verdict.is-bad{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
.dc-note{font-size:.875rem;color:var(--ink-2);margin:8px 0}
.dc-tag{font-size:.72rem;font-weight:700;border:1px solid var(--line-2);border-radius:6px;padding:1px 6px;color:var(--ink-2);margin-left:6px}
.dc-alts{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-direction:column;gap:8px}
.dc-alts li{display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--line);padding-top:8px;font-size:.9rem}
.dc-alts a{color:var(--ink)}
.dc-spark{width:100%;max-width:520px;height:64px;display:block;margin:8px 0}
.dc-codes{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.dc-codes .code{flex:1 1 220px}
@media (max-width:720px){.cp-row{grid-template-columns:1fr}.dc-price b{font-size:1.4rem}.dc-alts li{flex-direction:column;gap:2px}}
"""

TOOLS_JS = r"""
// Discount Deal Me: coupon pages (expiry, starts-soon, store filter) and the deal checker.
// Reads only /data/price-check.json from this site, plus an optional lookup API if one is configured.
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var NOW=Date.now();
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};

  // ----- coupon rows: hide expired, promote started ones, update counts
  var list=$('[data-cp-list]');
  $$('.cp-row').forEach(function(row){
    var e=row.getAttribute('data-ends'),s=row.getAttribute('data-starts');
    if(e&&Date.parse(e)<=NOW){row.hidden=true;return;}
    if(s&&Date.parse(s)<=NOW&&list&&$('.code',row)){row.classList.remove('is-upcoming');var l=$('[data-starts-label]',row);if(l)l.remove();list.appendChild(row);}
  });
  if(list){
    var n=$$('.cp-row',list).filter(function(r){return !r.hidden}).length;
    var c=$('[data-cp-count]');if(c)c.textContent=n;
    var em=$('[data-cp-empty]');if(em)em.hidden=n>0;
  }
  $$('.cp-sec').forEach(function(sec){var rows=$$('.cp-row',sec);if(rows.length&&rows.every(function(r){return r.hidden})&&!sec.contains(list))sec.hidden=true;});
  // index page: recount live codes in the reader's browser (codes can expire between our checks)
  if($('[data-store-count]')&&window.fetch)fetch('/data/coupons.json',{credentials:'omit'}).then(function(r){return r.json()}).then(function(d){
    d.stores.forEach(function(s){var el=$('[data-store-count="'+s.slug+'"]');if(!el)return;
      var n=s.codes.filter(function(c){return (!c.ends||Date.parse(c.ends)>NOW)&&(!c.starts||c.state!=='upcoming'||Date.parse(c.starts)<=NOW)}).length;
      el.textContent=n;var card=el.closest('.cp-card');if(card&&!n)card.hidden=true;});
  }).catch(function(){});
  var f=$('[data-cp-filter]');
  if(f)f.addEventListener('input',function(){var q=f.value.trim().toLowerCase();$$('[data-name]').forEach(function(el){el.hidden=q&&el.getAttribute('data-name').indexOf(q)<0;});});

  // ----- deal checker
  var form=$('#dc-form');if(!form||!window.fetch)return;
  var CFG=window.DDM_CHECKER||{},out=$('#dc-out'),input=$('#dc-q'),DATA=null;
  var money=function(v,cur){return (cur&&cur!=='USD'?cur+' ':'$')+Number(v).toFixed(2)};
  var day=function(d){var p=d.split('-');return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1]+' '+(+p[2])+', '+p[0]};
  var eff=function(run){return run[3]!=null?run[3]:run[2]};
  function load(){return DATA?Promise.resolve(DATA):fetch('/data/price-check.json',{credentials:'omit'}).then(function(r){return r.json()}).then(function(d){
    DATA=d;d.products.forEach(function(p){p._h=(p.t+' '+((d.stores[p.s]||{}).n||'')).toLowerCase();});return d;});}
  var STOP=/^(the|a|an|and|for|with|in|of|to|on|by|at|is|it|this|that|from|new|best|buy|sale|deal|deals|price|www|com|html|https?|products?|p|dp|item|shop|us|en)$/;
  function tokens(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(function(t){return t.length>1&&!STOP.test(t)});}
  function host(u){try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return ''}}
  function storeFor(h){if(!h)return null;for(var k in DATA.stores){var d=DATA.stores[k].d;if(d&&(h===d||h.slice(-d.length-1)==='.'+d))return k;}return null;}
  function search(q){
    var isUrl=/^https?:\/\//i.test(q.trim())||/^[a-z0-9-]+\.[a-z]{2,}\//i.test(q.trim());
    var url=isUrl?(/^https?:/i.test(q.trim())?q.trim():'https://'+q.trim()):'';
    var st=url?storeFor(host(url)):null,res=[];
    if(url){
      var path='';try{path=new URL(url).pathname.replace(/\/$/,'').toLowerCase()}catch(e){}
      DATA.products.forEach(function(p){if(!p.u)return;var pp='';try{pp=new URL(p.u).pathname.replace(/\/$/,'').toLowerCase()}catch(e){}
        var id=p.id.split(':').pop().toLowerCase();
        if((pp&&path&&pp===path&&host(p.u)===host(url))||(id.length>4&&url.toLowerCase().indexOf(id)>-1))res.push({p:p,score:2});});
      if(!res.length){var tk=tokens(decodeURIComponent((function(){try{return new URL(url).pathname}catch(e){return ''}})()));res=rank(tk,st);}
      return {url:url,store:st,res:res};
    }
    return {store:null,res:rank(tokens(q),null)};
  }
  function rank(tk,st){
    if(!tk.length)return [];
    var r=[];DATA.products.forEach(function(p){if(st&&p.s!==st)return;var m=0;tk.forEach(function(t){if(p._h.indexOf(t)>-1||p._h.indexOf(t.replace(/s$/,''))>-1)m++});
      var sc=m/tk.length;if(sc>=(tk.length>=3?0.75:0.99))r.push({p:p,score:sc});});
    r.sort(function(a,b){return b.score-a.score||eff(last(a.p))-eff(last(b.p))});return r.slice(0,8);
  }
  function last(p){return p.r[p.r.length-1]}
  function median(a){var s=a.slice().sort(function(x,y){return x-y}),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2}
  function verdict(p){
    var rule=DATA.verdict_rules,lastRun=last(p),first=p.r[0][0],lastDay=lastRun[1];
    var seen=DATA.check_dates.filter(function(d){return d>=first&&d<=lastDay});
    var span=(Date.parse(lastDay)-Date.parse(first))/864e5;
    var cur=eff(lastRun);
    if(seen.length<rule.min_check_days||span<rule.min_span_days)return {k:'none',t:'Not enough history yet',why:'We first recorded this item on '+day(first)+' and have checked it on '+seen.length+' day'+(seen.length===1?'':'s')+'. A verdict needs at least '+rule.min_check_days+' days of checks over '+rule.min_span_days+' days.'};
    var obs=[];seen.forEach(function(d){for(var i=0;i<p.r.length;i++){if(d>=p.r[i][0]&&d<=p.r[i][1]){obs.push(eff(p.r[i]));break;}}});
    var lo=Math.min.apply(null,obs),med=median(obs);
    var base={lo:lo,med:med,n:obs.length,from:first};
    if(cur<=lo)return Object.assign(base,{k:'good',t:'Lowest price we have recorded'});
    if(cur<=med*0.95)return Object.assign(base,{k:'good',t:'Below its usual price'});
    if(cur<=med*1.05)return Object.assign(base,{k:'ok',t:'About its usual price'});
    return Object.assign(base,{k:'bad',t:'Higher than usual'});
  }
  function spark(p){
    var pts=[];p.r.forEach(function(r){pts.push([Date.parse(r[0]),eff(r)]);if(r[1]!==r[0])pts.push([Date.parse(r[1]),eff(r)]);});
    if(pts.length<2)return '';
    var x0=pts[0][0],x1=pts[pts.length-1][0]||x0+1,ys=pts.map(function(q){return q[1]}),y0=Math.min.apply(null,ys),y1=Math.max.apply(null,ys);if(y1===y0){y1+=1;y0-=1;}
    var d=pts.map(function(q,i){return (i?'L':'M')+((q[0]-x0)/(x1-x0||1)*500+10).toFixed(1)+' '+(54-(q[1]-y0)/(y1-y0)*44).toFixed(1)}).join(' ');
    return '<svg class="dc-spark" viewBox="0 0 520 64" role="img" aria-label="Recorded price over time"><path d="'+d+'" fill="none" stroke="#ea580c" stroke-width="2"/></svg>';
  }
  function codesFor(slug){
    var s=DATA.stores[slug];if(!s)return '';
    var live=s.codes.filter(function(c){return (!c.e||Date.parse(c.e)>NOW)&&(!c.st||Date.parse(c.st)<=NOW)});
    if(!live.length)return '<p class="dc-note">No verified '+esc(s.n)+' codes right now. <a href="/coupons/'+slug+'/">See the store page</a>.</p>';
    return '<p class="dc-note"><b>Verified '+esc(s.n)+' codes</b> (from the store\u2019s affiliate feed):</p><div class="dc-codes">'+live.slice(0,3).map(function(c){
      return '<div class="code"><span class="code-label">Code</span><code>'+esc(c.code)+'</code><button type="button" class="code-copy" data-copy="'+esc(c.code)+'">Copy</button></div>'}).join('')+
      '</div><p class="dc-note"><a href="/coupons/'+slug+'/">Terms and all '+esc(s.n)+' codes</a></p>';
  }
  function amazon(q){if(!CFG.amazonTag)return '';q=/^https?:|\//.test(q)?tokens(q).join(' '):q;if(!q)return '';return '<li><span>Compare on Amazon<span class="dc-tag">#ad</span> <small>(we don\u2019t track Amazon prices)</small></span><a rel="sponsored nofollow noopener" target="_blank" href="https://www.amazon.com/s?k='+encodeURIComponent(q)+'&tag='+encodeURIComponent(CFG.amazonTag)+'">Search Amazon &#8599;</a></li>';}
  function render(q,r){
    if(!r.res.length){
      var s=r.store?DATA.stores[r.store]:null,h='';
      h+='<div class="dc-card"><h2>We don\u2019t have price data for that yet</h2><p class="dc-note">We only show prices we have recorded ourselves, so we won\u2019t guess. '+
        (s?'It looks like a <b>'+esc(s.n)+'</b> link, a store we work with.':'Try a shorter product name, or paste a link from a store we track.')+'</p>'+
        (s?codesFor(r.store)+'<p><a class="btn btn-ghost btn-small" rel="sponsored nofollow noopener" target="_blank" href="'+esc(s.l)+'">Visit '+esc(s.n)+' &#8599;</a></p>':'')+
        (CFG.amazonTag&&amazon(q)?'<ul class="dc-alts">'+amazon(q)+'</ul>':'')+'</div>';
      out.innerHTML=h;return;
    }
    var best=r.res[0].p,s=DATA.stores[best.s]||{n:best.s},lr=last(best),v=verdict(best),cur=eff(lr);
    var exact=r.res[0].score>=2;
    var h='<div class="dc-card">'+(exact?'':'<p class="dc-note"><b>Closest match we track.</b> It may not be the exact item you meant; we only show items we have recorded.</p>')+'<span class="dc-store">'+esc(s.n)+'</span><h2>'+esc(best.t)+'</h2>'+
      '<div class="dc-price"><b>'+money(cur,best.cur)+'</b>'+(lr[3]!=null?'<span><s>'+money(lr[2],best.cur)+'</s> store\u2019s listed regular price (the store\u2019s claim, not checked by us)</span>':'')+
      '<span class="dc-note">Last seen '+day(lr[1])+' in the store\u2019s affiliate product feed</span></div>'+
      '<span class="dc-verdict'+(v.k==='good'?' is-good':v.k==='bad'?' is-bad':'')+'">'+esc(v.t)+'</span><span class="dc-tag" title="Decided by fixed rules, not AI">Rule-based</span>'+
      (v.why?'<p class="dc-note">'+esc(v.why)+'</p>':'<p class="dc-note">Lowest we recorded: '+money(v.lo,best.cur)+'. Typical (median): '+money(v.med,best.cur)+'. Based on '+v.n+' check days since '+day(v.from)+'.</p>'+spark(best))+
      codesFor(best.s)+
      (best.c?'<p><a class="btn btn-deal" rel="sponsored nofollow noopener" target="_blank" data-offer="checker-'+esc(best.id)+'" href="'+esc(best.c)+'">See it at '+esc(s.n)+' &#8599;</a></p>':'')+'</div>';
    var alts=r.res.slice(1).filter(function(a){return a.p.c});
    if(alts.length||CFG.amazonTag){
      h+='<div class="dc-card"><h3>Other matches from stores we work with</h3><ul class="dc-alts">'+alts.map(function(a){var p=a.p,l=last(p),st=DATA.stores[p.s]||{n:p.s};
        return '<li><a rel="sponsored nofollow noopener" target="_blank" href="'+esc(p.c)+'">'+esc(p.t)+'</a><span><b>'+money(eff(l),p.cur)+'</b> at '+esc(st.n)+'<span class="dc-tag">#ad</span></span></li>'}).join('')+amazon(best.t.split(',')[0])+'</ul>'+
        '<p class="dc-note">Prices as last recorded by us. Check the final price at the store.</p></div>';
    }
    out.innerHTML=h;
    var al=$('.dc-alert');if(al){al.hidden=false;al.elements.watch_product.value=best.id;}
  }
  function live(q){
    if(!CFG.api)return Promise.resolve(null);
    return fetch(CFG.api.replace(/\/$/,'')+'/check?q='+encodeURIComponent(q),{credentials:'omit'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null});
  }
  function run(q){
    q=(q||'').trim();if(!q){out.innerHTML='';return;}
    out.innerHTML='<p class="dc-note">Checking\u2026</p>';
    load().then(function(){
      var r=search(q);
      if(r.res.length||!CFG.api){render(q,r);return;}
      live(q).then(function(d){
        if(d&&d.products&&d.products.length){d.products.forEach(function(p){p._h=p.t.toLowerCase();if(!DATA.stores[p.s])DATA.stores[p.s]={n:p.n||p.s,codes:[],l:''};});
          render(q,{res:d.products.map(function(p){return {p:p,score:1}})});
          out.insertAdjacentHTML('beforeend','<p class="dc-note">Live lookup from our partner stores\u2019 product feeds. History starts when we first record an item.'+(d.ai_note?' <span class="ai-tag">AI summary</span> '+esc(d.ai_note):'')+'</p>');}
        else render(q,r);
      });
    }).catch(function(){out.innerHTML='<p class="dc-note">Could not load price data. Please try again.</p>';});
    try{history.replaceState(null,'','?q='+encodeURIComponent(q))}catch(e){}
  }
  form.addEventListener('submit',function(e){e.preventDefault();run(input.value)});
  $$('[data-dc-try]').forEach(function(b){b.addEventListener('click',function(){input.value=b.getAttribute('data-dc-try');run(input.value)})});
  out.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.code-copy');if(!b)return;var c=b.getAttribute('data-copy');
    var done=function(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy'},1600)};if(navigator.clipboard)navigator.clipboard.writeText(c).then(done,function(){});else done();});
  var q0=new URLSearchParams(location.search).get('q');if(q0){input.value=q0;run(q0);}
})();
"""
