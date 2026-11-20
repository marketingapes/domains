"""Black Friday / Cyber Monday 2026 hub and holiday gift guides for Discount Deal Me.

Data: bfcm_data.json (CJ deals from DDM property 101511733 + curated Amazon ASINs).
Amazon rules followed here (no Product Advertising API access yet):
  * no Amazon prices, star ratings, review counts or images are shown; every Amazon button says
    "Check price on Amazon" and links to amazon.com/dp/<ASIN>?tag=<tag>;
  * the exact disclosure "As an Amazon Associate I earn from qualifying purchases." is on every page
    that carries an Amazon link;
  * no "was" or list prices anywhere.
These pages are deal pages, so they never load AdSense.
"""
import datetime, html, json, os
import deals as D
import images

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(HERE, "bfcm_data.json")))
AMZ = DATA["amazon"]
AMAZON_TAG = AMZ["tag"]
AMAZON_DISCLOSURE = "As an Amazon Associate I earn from qualifying purchases."
PULLED_AT = DATA["cj_pulled_at"]
BF_START = "2026-11-27T08:00:00Z"   # Fri Nov 27, 12:00 AM PT
BF_END = "2026-11-28T08:00:00Z"
CM_START = "2026-11-30T08:00:00Z"   # Mon Nov 30, 12:00 AM PT
CM_END = "2026-12-01T08:00:00Z"
E = html.escape

GUIDES = [
    # slug, title, short, intro, budget?
    ("under-25", "Gifts under $25", "Under $25", "Stocking stuffers, game-night picks and small upgrades that people actually use.", True),
    ("under-50", "Gifts under $50", "Under $50", "Everyday-carry gear, kitchen workhorses and pet favorites in the middle price band.", True),
    ("under-100", "Gifts under $100", "Under $100", "Bigger-ticket tech and kitchen gifts that still come in under $100.", True),
    ("for-mom", "Gifts for Mom", "For Mom", "Cozy, useful and a little indulgent: gifts for the mom who says she doesn't need anything.", False),
    ("for-dad", "Gifts for Dad", "For Dad", "Tools, drinkware and grilling gear for the dad who is hard to shop for.", False),
    ("for-teens", "Gifts for teens", "For teens", "Speakers, cameras, chargers and games that teens tend to put to use.", False),
    ("for-pets", "Gifts for pets", "For pets", "Toys, grooming tools and beds for dogs and cats, plus live pet-store deals.", False),
    ("for-the-kitchen", "Gifts for the kitchen", "For the kitchen", "Cookware and tools for the person who hosts every holiday, plus this week's KitchenAid deals.", False),
]
GUIDE = {g[0]: g for g in GUIDES}


def _dt(s):
    return datetime.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc) if s else None


def pt(iso, fmt="%b %-d, %-I:%M %p"):
    # November 2026 is all Pacific Standard Time (UTC-8).
    return (_dt(iso) - datetime.timedelta(hours=8)).strftime(fmt).replace(":00 ", " ")


def pulled_human():
    return pt(PULLED_AT, "%b %-d, %Y, %-I:%M %p") + " PT"


def live_deals(page=None):
    at = _dt(PULLED_AT)
    out = []
    for d in DATA["deals"]:
        end = _dt(d["network"]["ends"])
        if end and end <= at:
            continue
        if page and page not in d["pages"]:
            continue
        s, parts = D.score(d, at=at)
        out.append(dict(d, id="cj-" + d["link_id"], score=s, score_parts=parts))
    return sorted(out, key=lambda d: (-d["score"], d["network"]["ends"] or "9999"))


def products(guide=None, kind=None):
    return [p for p in AMZ["products"] if (not guide or guide in p["guides"]) and (not kind or p["kind"] == kind)]


def amazon_url(asin):
    return f"https://www.amazon.com/dp/{asin}?tag={AMAZON_TAG}"


def tracked(d, sid):
    return d["network"]["click_url"] + "?sid=" + sid


def _img(d):
    key = d.get("image", "")
    if key.startswith("cat-"):
        cat = images.M["categories"].get(d["category"]) or {}
        return f"/images/deals/{key}.webp", cat.get("alt", "")
    m = images.M["deals"].get(key) or {}
    return f"/images/deals/{key}.webp", m.get("alt", "")


def end_label(iso):
    return ("Ends " + pt(iso) + " PT") if iso else "Ongoing"


def deal_card(d, sid):
    n = d["network"]
    code = n["code"]
    src, alt = _img(d)
    starts = n["starts"] if n["starts"] and _dt(n["starts"]) > _dt(PULLED_AT) else ""
    meta = [f'<span class="meta-end" data-end-label>{end_label(n["ends"])}</span>']
    if starts:
        meta.insert(0, f'<span class="meta-start" data-start-label>Starts {pt(starts, "%b %-d")}</span>')
    meta.append('<span>Code needed</span>' if code else '<span>No code needed</span>')
    if d.get("region"):
        meta.append(f'<span>{E(d["region"])}</span>')
    codebox = (f'<div class="code"><span class="code-label">Code</span><code>{E(code)}</code>'
               f'<button type="button" class="code-copy" data-copy="{E(code)}">Copy</button></div>') if code else ""
    return f'''<article class="deal bf-deal" data-deal="{d["id"]}" data-cat="{E(d["category"])}" data-ends="{n["ends"] or ""}" data-starts="{starts}" data-score="{d["score"]}">
<div class="deal-media"><img src="{src}" alt="{E(alt)}" loading="lazy" decoding="async" width="640" height="400"></div><div class="deal-top"><span class="deal-merchant">{E(d["merchant"])}</span><span class="deal-cat">{E(d["category"])}</span>{D.score_badge(d)}</div>
<h3 class="deal-title">{E(d["title"])}</h3>
<p class="deal-meta">{"".join(meta)}</p>
<p class="ai"><span class="ai-tag" title="Written by an AI model from the network terms below. Numbers and dates are checked against those terms.">AI summary</span> {E(d["summary_ai"])}</p>
{codebox}<div class="deal-actions"><a class="btn btn-deal" rel="sponsored nofollow noopener" target="_blank" data-offer="{d["id"]}" href="{E(tracked(d, sid))}">Get deal at {E(d["merchant"])} <span aria-hidden="true">&#8599;</span></a></div>
<details class="deal-details"><summary>Network terms and score breakdown</summary>
<p class="terms"><strong>Terms as published by {E(d["merchant"])} through {n["name"]}:</strong> {E(n["terms"] or n["link_name"])}</p>
{D.breakdown(d)}
<p class="checked">Checked against the {n["name"]} affiliate feed <time datetime="{PULLED_AT}">{pulled_human()}</time>. We did not verify individual product prices.</p>
</details>
</article>'''


def pick_card(p, sid=""):
    return f'''<article class="pick" data-asin="{p["asin"]}">
<div class="pick-top"><span class="pick-mark" aria-hidden="true">{E(p["brand"][:1])}</span><span class="deal-merchant">{E(p["brand"])}</span><span class="deal-cat">{E(p["kind"])}</span></div>
<h3 class="pick-title">{E(p["name"])}</h3>
<p class="pick-why">{E(p["blurb"])}</p>
<a class="btn btn-deal btn-amz" rel="sponsored nofollow noopener" target="_blank" data-offer="amz-{p["asin"]}" href="{E(amazon_url(p["asin"]))}">Check price on Amazon <span aria-hidden="true">&#8599;</span></a>
<p class="pick-fine"><b>#ad</b> Amazon affiliate link</p>
</article>'''


def store_card(o):
    return f'''<article class="store">
<div class="store-top"><span class="deal-merchant">{E(o["merchant"])}</span><span class="deal-cat">Partner store</span></div>
<h3 class="deal-title">{E(o["title"])}</h3>
<p>{E(o["blurb"])}</p>
<a class="btn btn-ghost" rel="sponsored nofollow noopener" target="_blank" data-offer="{o["id"]}" href="{E(o["href"])}">Visit {E(o["merchant"])} <span aria-hidden="true">&#8599;</span></a>
<p class="store-net"><b>#ad</b> Affiliate link via Awin</p>
</article>'''


def countdown(target, end, label, live, after, cls=""):
    return (f'<div class="countdown {cls}" data-countdown data-target="{target}" data-end="{end}" data-live="{E(live)}" data-after="{E(after)}">'
            f'<p class="cd-label">{E(label)}</p>'
            f'<p class="cd-clock" aria-live="off"><span><b data-cd="d">&ndash;</b><small>days</small></span><span><b data-cd="h">&ndash;</b><small>hours</small></span><span><b data-cd="m">&ndash;</b><small>min</small></span></p>'
            f'<p class="cd-msg" data-cd-msg hidden></p></div>')


def disclosure(amazon=True):
    a = f' {AMAZON_DISCLOSURE}' if amazon else ""
    return (f'<p class="disclose bf-disclose"><b>#ad</b>{a} The store deals on this page are affiliate links too (CJ and Awin). '
            'Buying through any of them never changes your price, and commission is never part of a Deal Score.</p>')


def explainer(full=True):
    rules = D.SCORE_RULES
    body = f'''<section class="wrap section explainer" id="really-a-deal" aria-labelledby="rad-h">
<p class="kicker">Before you click</p>
<h2 id="rad-h">Is it really a deal?</h2>
<p class="lede">Black Friday is when "was" prices get the most creative. Here is how we judge offers on this page, and how to check anything else you find.</p>
<div class="rad-grid">
<div class="rad-col">
<h3>Store deals get a Deal Score</h3>
<p>Every store deal above has a 0&ndash;100 <a href="/how-we-pick-deals/#deal-score">Deal Score</a> built from the merchant's own network terms:</p>
<ul class="rad-list">
<li><b>Savings size</b> (up to {rules["savings_max"]} points). Percent off counts most. "Up to" offers count at {int(rules["upto_factor"]*100)}% because only some items get the top discount.</li>
<li><b>Certainty</b> (up to {rules["certainty_max"]}). Points come off for "select items", first-order-only, sign-ups, minimum spends and local-only vouchers.</li>
<li><b>Ease</b> (up to 15). No code beats a code, and a code beats an email sign-up.</li>
<li><b>Deadline clarity</b> (up to 15). A real end date within 45 days scores highest.</li>
</ul>
<p>What we earn is never part of the score. Open "Network terms and score breakdown" on any card to see the math.</p>
</div>
<div class="rad-col">
<h3>Amazon picks don't get a score</h3>
<p>We don't have verified price history for Amazon listings, so we don't score them or show their prices. We picked them because they are well-known products with a long record of strong customer ratings. Before you buy, run the 60-second check:</p>
<ol class="rad-list">
<li><b>Ignore the "was" price.</b> List prices are often a number nobody paid. Compare with what the item sold for over the past month, using a price tracker or the store's own history.</li>
<li><b>Check who sells it.</b> "Ships from and sold by Amazon.com" or the brand's own store is safer than an unknown third-party seller.</li>
<li><b>Count the whole cost.</b> Shipping, tax, and return shipping can wipe out a small discount.</li>
<li><b>Check the return window.</b> Holiday purchases often get extended returns, but not every seller offers them.</li>
</ol>
</div>
</div>
<p class="rad-cta"><a class="btn btn-ghost" href="/#calculator">Use the real-discount calculator</a> <a class="linklike" href="/articles/how-to-spot-a-real-deal/">How to spot a real deal</a> <a class="linklike" href="/deal-checklist/">Printable deal checklist</a></p>
</section>'''
    if full:
        return body
    return f'''<section class="wrap section explainer explainer-mini" aria-labelledby="rad-h">
<h2 id="rad-h">Is it really a deal?</h2>
<p>Store deals here carry a published <a href="/how-we-pick-deals/#deal-score">Deal Score</a> (savings, certainty, ease and deadline; never our commission). Amazon picks don't, because we don't show Amazon prices we can't verify. Before you buy: ignore the "was" price, check who sells it, count shipping and returns, and compare with last month's price. <a href="/black-friday/#really-a-deal">Read the full check</a>.</p>
</section>'''


def crumbs(*items):
    parts = ['<a href="/">Home</a>']
    for href, label in items:
        parts.append(f'<a href="{href}">{E(label)}</a>' if href else f'<span>{E(label)}</span>')
    return '<nav class="crumbs" aria-label="Breadcrumb">' + ' <span aria-hidden="true">/</span> '.join(parts) + '</nav>'


def guide_cards(exclude=None):
    out = []
    for slug, title, short, intro, _ in GUIDES:
        if slug == exclude:
            continue
        n = len(products(slug)) + len(live_deals(slug))
        out.append(f'<a class="gg-card" href="/gifts/{slug}/"><span class="gg-short">{E(short)}</span><span class="gg-title">{E(title)}</span><span class="gg-desc">{E(intro)}</span><span class="gg-n">{n} picks and deals</span></a>')
    return '<div class="gg-grid">' + "".join(out) + '</div>'


def alerts(signup, form_id, where):
    return signup(form_id, title="Price-drop alerts for Black Friday",
                  lede=f"Get an email when the deals we track on {where} go live, get bigger, or are about to end. Short, no spam, unsubscribe any time.",
                  cls="signup-bf")


EXTRA = '<link rel="stylesheet" href="/assets/bfcm.css?v=20261120b">\n'
JS = '<script src="/assets/bfcm.js?v=20261115" defer></script>'


def ld(obj):
    return f'<script type="application/ld+json">{json.dumps(obj)}</script>'


def breadcrumb_ld(host, items):
    return ld({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": host + u} for i, (u, n) in enumerate(items)]})


def faq_ld(qas):
    return ld({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qas]})


def faq_html(qas):
    return '<div class="faq">' + "".join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in qas) + '</div>'


FINE = (f'<section class="wrap section bf-fine"><p><b>How this page works.</b> Store deals come from merchants\' own affiliate listings for Discount Deal Me on the CJ network '
        f'(checked {"{checked}"}), and each one disappears from this page when its network end time passes. Amazon products are curated: we opened every product page on amazon.com '
        'to confirm the link goes to the item named here. We have not tested these products ourselves. Prices, stock and deal terms can change at any time; the price at checkout is the one that counts. '
        f'{AMAZON_DISCLOSURE}</p></section>')


def fine():
    return FINE.replace("{checked}", pulled_human())


def black_friday(page, signup, host):
    bf = live_deals("black-friday")
    picks = []
    for g in GUIDES:
        for p in products(g[0]):
            if p not in picks:
                picks.append(p)
                break
    picks = picks[:8]
    qas = [
        ("When is Black Friday 2026?", "Black Friday is Friday, November 27, 2026. Cyber Monday is Monday, November 30, 2026. Many stores, including several below, start their sales earlier."),
        ("Why don't you show Amazon prices?", "Amazon prices change constantly and we don't have a verified live price feed, so every Amazon pick links to the product page where you see the current price before you buy."),
        ("What happens when a deal ends?", "Each store deal carries the end time from the merchant's network listing. Your browser hides it as soon as that time passes, so you won't see expired offers here."),
        ("Do you earn money from these links?", "Yes. Store and Amazon links are affiliate links (#ad). If you buy, we may earn a commission at no extra cost to you. It never changes your price or a deal's score."),
    ]
    body = f'''<section class="wrap page-head bf-head">
{crumbs((None, "Black Friday 2026"))}
<p class="kicker">Black Friday 2026 &middot; Friday, Nov 27</p>
<h1>Black Friday deals, checked before you click</h1>
<p class="lede">Live store deals from official affiliate feeds, each with a published Deal Score and an end time that removes it when it expires. Plus gift guides by budget and by person, with Amazon picks you can price-check in one click.</p>
{countdown(BF_START, BF_END, "Black Friday starts in", "Black Friday is on now. The deals below are live until their own end times.", "Black Friday is over. Deals below stay until their own end times; see Cyber Monday next.")}
<p class="jump">Jump to: <a href="#gift-guides">Gift guides</a> <a href="#live-deals">Live deals ({len(bf)})</a> <a href="#amazon-picks">Amazon picks</a> <a href="/gift-planner/">Gift budget planner</a> <a href="#really-a-deal">Is it really a deal?</a> <a href="/cyber-monday/">Cyber Monday</a></p>
{disclosure()}
</section>
<section class="wrap section bf-dates" aria-labelledby="dates-h">
<h2 id="dates-h">Key dates</h2>
<ol class="dates">
<li><b>Now</b><span>Early sales are live: KitchenAid's Black Friday Event, Groupon's early Black Friday page, Click &amp; Grow and pet-store holiday codes.</span></li>
<li><b>Nov 19&ndash;25</b><span>Peet's early sale: 20% off sitewide with code EARLYBIRD.</span></li>
<li><b>Fri Nov 27</b><span>Black Friday. Peet's runs 25% off sitewide (code BFCM2026) Nov 26&ndash;29 plus a daily 30% doorbuster bundle Nov 27&ndash;29.</span></li>
<li><b>Sat Nov 28</b><span>Small Business Saturday.</span></li>
<li><b>Mon Nov 30</b><span>Cyber Monday. <a href="/cyber-monday/">See the Cyber Monday page</a>.</span></li>
</ol>
</section>
<section class="wrap section" id="gift-guides" aria-labelledby="gg-h">
<div class="sec-head"><h2 id="gg-h">Gift guides</h2><p>By budget and by person. Each mixes Amazon picks with live store deals. Planning a whole list? Try the <a href="/gift-planner/">gift budget planner</a>.</p></div>
{guide_cards()}
</section>
<section class="wrap section" id="live-deals" aria-labelledby="ld-h">
<div class="sec-head"><h2 id="ld-h">Live Black Friday deals</h2><p>Sorted by Deal Score. Checked against the CJ feed {pulled_human()}.</p></div>
<div class="deal-grid bf-grid">{"".join(deal_card(d, "ddm-bf-hub") for d in bf)}</div>
<p class="grid-empty" hidden>Every deal in this list has ended. Check the <a href="/deals/">deal finder</a> for what's live now.</p>
</section>
<section class="wrap section" id="amazon-picks" aria-labelledby="ap-h">
<div class="sec-head"><h2 id="ap-h">Amazon gift picks</h2><p>One from each gift guide. {AMAZON_DISCLOSURE}</p></div>
<div class="pick-grid">{"".join(pick_card(p) for p in picks)}</div>
</section>
{explainer()}
<div class="wrap">{alerts(signup, "bf-hub", "our Black Friday page")}</div>
<section class="wrap section narrow-sec"><h2>Black Friday questions</h2>{faq_html(qas)}</section>
{fine()}
{JS}
{breadcrumb_ld(host, [("/", "Home"), ("/black-friday/", "Black Friday 2026")])}
{faq_ld(qas)}'''
    return page("Black Friday deals 2026", "Black Friday 2026 deals from official affiliate feeds, each with a published Deal Score and real end times, plus gift guides under $25, $50 and $100 and Amazon picks.", "/black-friday/", body, "bf", own_signup=True, extra=EXTRA, ads=False)


def cyber_monday(page, signup, host):
    cm = live_deals("cyber-monday")
    tech = products(kind="Tech")
    qas = [
        ("When is Cyber Monday 2026?", "Monday, November 30, 2026, the Monday after Black Friday (Friday, November 27)."),
        ("Are Cyber Monday deals better than Black Friday?", "Not by default. Some stores run the same discount across the whole weekend; Peet's, for example, lists 25% off with the same code for both. Compare the Deal Score and the end time, not the name of the sale."),
        ("Why don't you show Amazon prices?", "We don't have a verified live Amazon price feed, so each pick links to Amazon, where you see the current price before you buy."),
    ]
    body = f'''<section class="wrap page-head bf-head">
{crumbs(("/black-friday/", "Black Friday 2026"), (None, "Cyber Monday"))}
<p class="kicker">Cyber Monday 2026 &middot; Monday, Nov 30</p>
<h1>Cyber Monday deals, scored and timed</h1>
<p class="lede">Store deals that run through Cyber Monday, from official affiliate feeds, plus tech gifts you can price-check on Amazon. Every deal disappears when its end time passes.</p>
{countdown(CM_START, CM_END, "Cyber Monday starts in", "Cyber Monday is on now. Deals below are live until their own end times.", "Cyber Monday is over. Any deal still shown below is live until its own end time.")}
<p class="jump">Jump to: <a href="#cm-deals">Live deals ({len(cm)})</a> <a href="#tech-picks">Tech picks</a> <a href="#really-a-deal">Is it really a deal?</a> <a href="/black-friday/">Black Friday</a></p>
{disclosure()}
</section>
<section class="wrap section" id="cm-deals" aria-labelledby="cm-h">
<div class="sec-head"><h2 id="cm-h">Deals that run through Cyber Monday</h2><p>Sorted by Deal Score. Checked against the CJ feed {pulled_human()}.</p></div>
<div class="deal-grid bf-grid">{"".join(deal_card(d, "ddm-cm-hub") for d in cm)}</div>
<p class="grid-empty" hidden>Every deal in this list has ended. Check the <a href="/deals/">deal finder</a> for what's live now.</p>
</section>
<section class="wrap section" id="tech-picks" aria-labelledby="tp-h">
<div class="sec-head"><h2 id="tp-h">Tech gift picks on Amazon</h2><p>{AMAZON_DISCLOSURE}</p></div>
<div class="pick-grid">{"".join(pick_card(p) for p in tech)}</div>
</section>
<section class="wrap section" aria-labelledby="gg-h">
<div class="sec-head"><h2 id="gg-h">Still shopping? Gift guides</h2></div>
{guide_cards()}
</section>
{explainer()}
<div class="wrap">{alerts(signup, "cm-hub", "our Cyber Monday page")}</div>
<section class="wrap section narrow-sec"><h2>Cyber Monday questions</h2>{faq_html(qas)}</section>
{fine()}
{JS}
{breadcrumb_ld(host, [("/", "Home"), ("/black-friday/", "Black Friday 2026"), ("/cyber-monday/", "Cyber Monday")])}
{faq_ld(qas)}'''
    return page("Cyber Monday deals 2026", "Cyber Monday 2026 (Mon Nov 30) deals from official affiliate feeds with a published Deal Score and real end times, plus tech gift picks to price-check on Amazon.", "/cyber-monday/", body, "bf", own_signup=True, extra=EXTRA, ads=False)


def gifts_index(page, signup, host):
    body = f'''<section class="wrap page-head bf-head">
{crumbs(("/black-friday/", "Black Friday 2026"), (None, "Gift guides"))}
<p class="kicker">Holiday 2026</p>
<h1>Holiday gift guides</h1>
<p class="lede">Gift ideas by budget and by person. Each guide pairs well-known Amazon products with live store deals from our affiliate feeds, and nothing shows a price we can't verify.</p>
{countdown(BF_START, BF_END, "Black Friday starts in", "Black Friday is on now.", "Black Friday is over. Cyber Monday is Nov 30.", "countdown-slim")}
{disclosure()}
</section>
<section class="wrap section">{guide_cards()}</section>
{explainer(full=False)}
<div class="wrap">{alerts(signup, "gifts-index", "our gift guides")}</div>
{fine()}
{JS}
{breadcrumb_ld(host, [("/", "Home"), ("/black-friday/", "Black Friday 2026"), ("/gifts/", "Gift guides")])}'''
    return page("Holiday gift guides 2026", "Holiday 2026 gift guides by budget (under $25, $50, $100) and by person (Mom, Dad, teens, pets, the kitchen), with live deals and Amazon picks.", "/gifts/", body, "gifts", own_signup=True, extra=EXTRA, ads=False)


def gift_guide(slug, page, signup, host):
    _, title, short, intro, budget = GUIDE[slug]
    ps = products(slug)
    ds = live_deals(slug)
    stores = [o for o in DATA["awin"] if slug in o["pages"]]
    if budget:
        how = ("We sorted these by the price we saw on Amazon on Nov 15, 2026. We don't publish that price, because it changes; "
               "tap \"Check price on Amazon\" for today's price, and skip anything that has crept over budget.")
    else:
        how = "We picked well-known products with a long record of strong customer ratings. We haven't tested them ourselves."
    store_sec = (f'<section class="wrap section" aria-labelledby="st-h"><div class="sec-head"><h2 id="st-h">Partner store</h2></div>'
                 f'<div class="store-grid">{"".join(store_card(o) for o in stores)}</div></section>') if stores else ""
    deal_sec = (f'''<section class="wrap section" aria-labelledby="sd-h">
<div class="sec-head"><h2 id="sd-h">Live store deals that fit this list</h2><p>Sorted by Deal Score. Checked against the CJ feed {pulled_human()}.</p></div>
<div class="deal-grid bf-grid">{"".join(deal_card(d, "ddm-gifts-" + slug) for d in ds)}</div>
<p class="grid-empty" hidden>The store deals for this guide have ended. The Amazon picks above are still here.</p>
</section>''') if ds else ""
    body = f'''<section class="wrap page-head bf-head">
{crumbs(("/gifts/", "Gift guides"), (None, title))}
<p class="kicker">Holiday gift guide</p>
<h1>{E(title)}</h1>
<p class="lede">{E(intro)} {len(ps)} Amazon picks{f" and {len(ds)} live store deals" if ds else ""}.</p>
{countdown(BF_START, BF_END, "Black Friday starts in", "Black Friday is on now.", "Black Friday is over. Cyber Monday is Nov 30.", "countdown-slim")}
{disclosure()}
</section>
<section class="wrap section" aria-labelledby="pk-h">
<div class="sec-head"><h2 id="pk-h">Picks on Amazon</h2><p>{E(how)}</p></div>
<div class="pick-grid">{"".join(pick_card(p) for p in ps)}</div>
</section>
{deal_sec}
{store_sec}
{explainer(full=False)}
<section class="wrap section" aria-labelledby="mg-h"><div class="sec-head"><h2 id="mg-h">More gift guides</h2></div>{guide_cards(exclude=slug)}</section>
<div class="wrap">{alerts(signup, "gifts-" + slug, "this gift guide")}</div>
{fine()}
{JS}
{breadcrumb_ld(host, [("/", "Home"), ("/gifts/", "Gift guides"), ("/gifts/" + slug + "/", title)])}'''
    desc = f"{title} for the 2026 holidays: {len(ps)} Amazon picks to price-check and {len(ds)} live store deals with a published Deal Score. No fake 'was' prices."
    return page(title + " (2026)", desc, f"/gifts/{slug}/", body, "gifts", own_signup=True, extra=EXTRA, ads=False)


def pages(page, signup, host):
    out = {"black-friday/index.html": black_friday(page, signup, host),
           "cyber-monday/index.html": cyber_monday(page, signup, host),
           "gifts/index.html": gifts_index(page, signup, host)}
    for g in GUIDES:
        out[f"gifts/{g[0]}/index.html"] = gift_guide(g[0], page, signup, host)
    return out


URLS = ["/black-friday/", "/cyber-monday/", "/gifts/"] + [f"/gifts/{g[0]}/" for g in GUIDES]

CSS = r"""
.bf-head .kicker{color:#b45309;font-weight:700;letter-spacing:.02em}
.countdown{margin:18px 0 8px;padding:16px 18px;border:1px solid #fde68a;background:#fffbeb;border-radius:12px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 20px}
.countdown .cd-label{margin:0;font-weight:700;color:#92400e}
.countdown .cd-clock{margin:0;display:flex;gap:10px}
.countdown .cd-clock span{display:flex;flex-direction:column;align-items:center;min-width:58px;padding:6px 8px;background:#fff;border:1px solid #fde68a;border-radius:8px}
.countdown .cd-clock b{font-size:1.5rem;line-height:1.1;font-variant-numeric:tabular-nums;color:#0b1020}
.countdown .cd-clock small{font-size:.72rem;color:#6b7489;text-transform:uppercase;letter-spacing:.04em}
.countdown .cd-msg{margin:0;font-weight:600;color:#92400e}
.countdown.is-live,.countdown.is-after{background:#f6f7f9;border-color:#e3e6ec}
.countdown-slim{padding:10px 14px}
.countdown-slim .cd-clock b{font-size:1.15rem}
.jump{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.95rem;margin:10px 0}
.jump a{font-weight:600}
.bf-disclose{margin-top:10px}
.sec-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 16px;margin-bottom:14px}
.sec-head h2{margin:0}
.sec-head p{margin:0;color:#6b7489;font-size:.92rem}
.dates{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.dates li{display:grid;grid-template-columns:120px 1fr;gap:12px;padding:10px 14px;border:1px solid #e3e6ec;border-radius:10px;background:#fff}
.dates b{color:#b45309}
@media (max-width:560px){.dates li{grid-template-columns:1fr;gap:2px}}
.bf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.meta-start{font-weight:700;color:#0e6e8c}
.pick-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
.pick{display:flex;flex-direction:column;gap:8px;padding:16px;border:1px solid #e3e6ec;border-radius:12px;background:#fff}
.pick-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pick-mark{width:30px;height:30px;border-radius:8px;background:#0b1020;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:.95rem}
.pick-title{font-size:1.05rem;line-height:1.3;margin:0}
.pick-why{margin:0;color:#475066;font-size:.94rem}
.pick-price{margin:0;color:#6b7489;font-size:.82rem}
.pick .btn-amz{margin-top:auto;align-self:flex-start}
.pick-fine{margin:0;color:#6b7489;font-size:.78rem}
.gg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.gg-card{display:flex;flex-direction:column;gap:4px;padding:16px;border:1px solid #e3e6ec;border-radius:12px;background:#fff;text-decoration:none;color:inherit;transition:border-color .15s,box-shadow .15s}
.gg-card:hover{border-color:#b45309;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.gg-short{font-size:.78rem;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:.04em}
.gg-title{font-weight:700;font-size:1.08rem}
.gg-desc{color:#475066;font-size:.9rem}
.gg-n{margin-top:auto;color:#6b7489;font-size:.82rem}
.explainer{border-top:1px solid #e3e6ec}
.rad-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
@media (max-width:820px){.rad-grid{grid-template-columns:1fr}}
.rad-col{padding:18px;border:1px solid #e3e6ec;border-radius:12px;background:#fff}
.rad-col h3{margin-top:0}
.rad-list{padding-left:20px}
.rad-list li{margin:6px 0}
.rad-cta{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;margin-top:16px}
.explainer-mini p{max-width:860px}
.store-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.bf-fine p{font-size:.85rem;color:#6b7489;max-width:900px}
.faq details{border:1px solid #e3e6ec;border-radius:10px;padding:10px 14px;margin:8px 0;background:#fff}
.faq summary{font-weight:600;cursor:pointer}
.bfcm-banner a{font-weight:700}
"""

CLIENT_JS = r"""
(function(){
  'use strict';
  var NOW=Date.now(),MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  // Countdowns to Black Friday / Cyber Monday (targets are 12:00 AM Pacific).
  $$('[data-countdown]').forEach(function(el){
    var t=Date.parse(el.getAttribute('data-target')),end=Date.parse(el.getAttribute('data-end'));
    var clock=el.querySelector('.cd-clock'),msg=el.querySelector('[data-cd-msg]'),lab=el.querySelector('.cd-label');
    function tick(){
      var now=Date.now();
      if(now>=t){
        var live=now<end;el.classList.add(live?'is-live':'is-after');
        clock.hidden=true;lab.hidden=true;msg.hidden=false;msg.textContent=el.getAttribute(live?'data-live':'data-after');return false;
      }
      var s=Math.floor((t-now)/6e4),d=Math.floor(s/1440),h=Math.floor(s%1440/60),m=s%60;
      el.querySelector('[data-cd="d"]').textContent=d;el.querySelector('[data-cd="h"]').textContent=h;el.querySelector('[data-cd="m"]').textContent=m;
      return true;
    }
    if(tick()){var iv=setInterval(function(){if(!tick())clearInterval(iv)},30000);}
  });
  // Deals that have not started yet keep a "Starts" label; ended deals are removed.
  $$('.bf-deal').forEach(function(card){
    var e=card.getAttribute('data-ends'),s=card.getAttribute('data-starts');
    if(e&&Date.parse(e)<=NOW){card.hidden=true;return;}
    var sl=card.querySelector('[data-start-label]');
    if(sl&&(!s||Date.parse(s)<=NOW))sl.parentNode.removeChild(sl);
    else if(sl){var d=new Date(s);sl.textContent='Starts '+MON[d.getMonth()]+' '+d.getDate();}
  });
  $$('.bf-grid').forEach(function(g){
    var any=$$('.bf-deal',g).some(function(c){return !c.hidden});
    var empty=g.parentNode.querySelector('.grid-empty');
    if(!any){g.hidden=true;if(empty)empty.hidden=false;}
  });
})();
"""
