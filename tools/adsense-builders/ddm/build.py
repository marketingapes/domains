import os, re, html, sys
sys.path.insert(0, os.path.dirname(__file__))
import svgs
from articles1 import A as A1
from articles2 import A as A2

OUT = "/home/user/domains/ddm"
HOST = "https://discountdealme.com"
BRAND = "Discount Deal Me"
EMAIL = "hello@discountdealme.com"
UPDATED = "2026-09-23"
UPDATED_H = "September 23, 2026"
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


def head(title, desc, path, og_image="/images/og.svg", og_type="website", extra=""):
    full = f"{title} | {BRAND}" if title != BRAND else f"{BRAND} | Offers worth the click"
    e = html.escape
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{HOST}{path}">
<meta name="google-adsense-account" content="ca-pub-5194583669093303">
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
<meta name="theme-color" content="#f4511e">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Nunito+Sans:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=20260923">
{extra}</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={GTM}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<a class="skip" href="#main">Skip to content</a>
'''


def nav(active=""):
    def a(href, label, key):
        cur = ' aria-current="page"' if key == active else ""
        return f'<a href="{href}"{cur}>{label}</a>'
    return f'''<header class="site-head">
<div class="wrap head-inner">
<a class="logo" href="/" aria-label="{BRAND} home"><img src="/images/logo.svg" alt="" width="40" height="40"><span>Discount<b>Deal</b>Me</span></a>
<nav aria-label="Main">{a("/articles/", "Articles", "articles")}{a("/about/", "About", "about")}{a("/contact/", "Contact", "contact")}<a class="nav-pill" href="/deal-checklist/">Deal checklist</a></nav>
</div>
</header>
'''


FOOT = f'''<footer class="site-foot">
<div class="wrap foot-grid">
<div><a class="logo logo-foot" href="/"><img src="/images/logo.svg" alt="" width="36" height="36"><span>Discount<b>Deal</b>Me</span></a>
<p class="foot-tag">Offers worth the click. Plain-English guides to spotting real deals, stacking discounts and keeping more of your money.</p></div>
<nav aria-label="Site"><h2 class="foot-h">Site</h2><a href="/articles/">Articles</a><a href="/about/">About</a><a href="/contact/">Contact</a></nav>
<nav aria-label="Tools"><h2 class="foot-h">Tools</h2><a href="/deal-checklist/">Deal checklist</a><a href="/guides/checkout-comparison/">Checkout worksheet</a><a href="/offers/">Current offers <small>(#ad)</small></a></nav>
<nav aria-label="Legal"><h2 class="foot-h">Legal</h2><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav>
</div>
<div class="wrap foot-base"><p>&copy;2026 {BRAND}. Published by Marketing Apes. General shopping information only; always check current terms with the retailer.</p></div>
</footer>
<script src="/assets/site.js?v=20260923" defer></script>
</body>
</html>
'''


def page(title, desc, path, body, active="", **kw):
    return head(title, desc, path, **kw) + nav(active) + f'<main id="main">\n{body}\n</main>\n' + FOOT


def words(s):
    t = re.sub(r"<[^>]+>", " ", s)
    return len(re.findall(r"[A-Za-z0-9'’-]+", t))


def card(a, big=False):
    return f'''<a class="card{' card-big' if big else ''}" href="/articles/{a["slug"]}/">
<span class="card-img"><img src="/images/{a["slug"]}.svg" alt="" loading="lazy" width="1200" height="675"></span>
<span class="card-body"><span class="pill">{a["cat"]}</span><span class="card-title">{a["title"]}</span><span class="card-desc">{a["desc"]}</span><span class="card-more">Read the guide <span aria-hidden="true">&rarr;</span></span></span>
</a>'''


def write(rel, content):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(content)


def article_page(a):
    mins = max(4, round(words(a["body"]) / 220))
    faq = "".join(f'<details><summary>{html.escape(q)}</summary><p>{html.escape(ans)}</p></details>' for q, ans in a["faq"])
    rel = "".join(card(BY[s]) for s in a["related"])
    ld = ('{"@context":"https://schema.org","@type":"Article","headline":' + repr_json(a["title"]) +
          ',"datePublished":"2026-09-23","dateModified":"2026-09-23","author":{"@type":"Organization","name":"The Discount Deal Me team"},'
          '"publisher":{"@type":"Organization","name":"Discount Deal Me"},"image":"' + HOST + f'/images/{a["slug"]}.svg","mainEntityOfPage":"{HOST}/articles/{a["slug"]}/"' + '}')
    body = f'''<article class="wrap article">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/articles/">Articles</a> <span aria-hidden="true">/</span> <span>{a["short"]}</span></nav>
<header class="art-head">
<span class="pill">{a["cat"]}</span>
<h1>{a["title"]}</h1>
<p class="byline">By The Discount Deal Me team &middot; Last updated <time datetime="{UPDATED}">{UPDATED_H}</time> &middot; {mins} min read</p>
</header>
<figure class="art-hero"><img src="/images/{a["slug"]}.svg" alt="{html.escape(svgs.ART[a["slug"]][0])}" width="1200" height="675"></figure>
<div class="prose">
{a["body"]}
<section class="faq" aria-labelledby="faq-h"><h2 id="faq-h">Frequently asked questions</h2>{faq}</section>
<div class="art-foot">Discount Deal Me writes general shopping guides. We do not publish coupon codes, and we are not affiliated with the stores mentioned in general terms. Always check current prices and terms with the retailer.</div>
</div>
<section class="related" aria-labelledby="rel-h"><h2 id="rel-h">Related articles</h2><div class="grid grid-3">{rel}</div></section>
</article>
<script type="application/ld+json">{ld}</script>'''
    return page(a["title"], a["desc"], f'/articles/{a["slug"]}/', body, "articles",
                og_image=f'/images/{a["slug"]}.svg', og_type="article")


def repr_json(s):
    import json
    return json.dumps(s)


def home():
    feat = ARTS[0]
    rest = "".join(card(a) for a in ARTS[1:])
    body = f'''<section class="hero">
<div class="wrap hero-grid">
<div class="hero-copy">
<p class="eyebrow">Smart shopping, minus the hype</p>
<h1>Offers worth <span class="squiggle">the click.</span></h1>
<p class="lede">Discount Deal Me is a friendly field guide to paying less without getting played. We explain how to spot a real deal, stack discounts the store will actually accept, track prices, read return policies and keep a budget that survives sale season.</p>
<p class="hero-ctas"><a class="btn" href="/articles/">Browse the guides</a><a class="btn btn-ghost" href="#deal-meter">Try the Deal-o-Meter</a></p>
</div>
<figure class="hero-art"><img src="/images/hero.svg" alt="Two cheerful walking price-tag characters wave outside a striped-awning shop, surrounded by floating coupons, coins and shopping bags." width="1600" height="900"></figure>
</div>
</section>

<section class="wrap meter-wrap" id="deal-meter" aria-labelledby="meter-h">
<div class="meter">
<div class="meter-intro">
<p class="eyebrow">Interactive tool</p>
<h2 id="meter-h">The Deal-o-Meter</h2>
<p>Sale tags measure the discount against their own "was" price. The Deal-o-Meter measures it against what the item <em>usually</em> costs, then adds the extras that change your real total. Everything runs in your browser; nothing is sent anywhere.</p>
<ol class="mini-steps"><li>Type the tag's "was" and "now" prices.</li><li>Add what it usually sells for, if you know.</li><li>Include any extra code, shipping and cashback.</li></ol>
</div>
<form class="meter-form" id="meter-form" novalidate>
<div class="field"><label for="m-was">Tag says it was ($)</label><input id="m-was" name="was" type="number" inputmode="decimal" min="0" step="0.01" placeholder="e.g. 120"></div>
<div class="field"><label for="m-now">Sale price now ($)</label><input id="m-now" name="now" type="number" inputmode="decimal" min="0" step="0.01" placeholder="e.g. 84"></div>
<div class="field"><label for="m-usual">It usually sells for ($) <small>optional</small></label><input id="m-usual" name="usual" type="number" inputmode="decimal" min="0" step="0.01" placeholder="e.g. 89"></div>
<div class="field"><label for="m-code">Extra code (% off) <small>optional</small></label><input id="m-code" name="code" type="number" inputmode="decimal" min="0" max="100" step="1" placeholder="e.g. 10"></div>
<div class="field"><label for="m-ship">Shipping &amp; fees ($)</label><input id="m-ship" name="ship" type="number" inputmode="decimal" min="0" step="0.01" placeholder="e.g. 9.99"></div>
<div class="field"><label for="m-cb">Cashback (%) <small>optional</small></label><input id="m-cb" name="cb" type="number" inputmode="decimal" min="0" max="100" step="0.5" placeholder="e.g. 3"></div>
<div class="meter-out" aria-live="polite" id="meter-out">
<div class="gauge" aria-hidden="true"><div class="gauge-fill" id="gauge-fill"></div></div>
<p class="verdict" id="verdict">Fill in the first two boxes to see the real discount.</p>
<dl class="stats">
<div><dt>Tag discount</dt><dd id="o-tag">&ndash;</dd></div>
<div><dt>You actually pay</dt><dd id="o-total">&ndash;</dd></div>
<div><dt>After cashback</dt><dd id="o-net">&ndash;</dd></div>
<div><dt>vs usual price</dt><dd id="o-real">&ndash;</dd></div>
</dl>
</div>
<button type="reset" class="btn btn-small btn-ghost">Clear</button>
</form>
</div>
</section>

<section class="wrap" aria-labelledby="feat-h">
<div class="sec-head"><p class="eyebrow">Start here</p><h2 id="feat-h">Fresh guides from the deal desk</h2><p>Every guide is written from scratch for everyday shoppers. No fake reviews, no invented coupon codes, no "top 10" lists of products we have never held.</p></div>
<div class="feature">{card(feat, big=True)}</div>
<div class="grid grid-3">{rest}</div>
</section>

<section class="wrap principles" aria-labelledby="prin-h">
<h2 id="prin-h">How we think about deals</h2>
<div class="grid grid-4">
<div class="prin"><span class="prin-ico" aria-hidden="true">&#128269;</span><h3>Baseline first</h3><p>A discount is only meaningful against what something usually costs, not against the biggest number on the tag.</p></div>
<div class="prin"><span class="prin-ico" aria-hidden="true">&#129534;</span><h3>Total, not headline</h3><p>Shipping, fees, subscriptions and return costs are part of the price. We always count the whole checkout.</p></div>
<div class="prin"><span class="prin-ico" aria-hidden="true">&#128682;</span><h3>Know the exit</h3><p>A cheaper price with no returns can be the costlier choice. We read the policy before we cheer.</p></div>
<div class="prin"><span class="prin-ico" aria-hidden="true">&#128176;</span><h3>Money kept</h3><p>The best deal is often the purchase you skip. Savings count when they stay in your account.</p></div>
</div>
</section>

<section class="wrap tools" aria-labelledby="tools-h">
<h2 id="tools-h">Printable tools</h2>
<div class="grid grid-2">
<a class="tool" href="/deal-checklist/"><strong>The deal checklist</strong><span>Four quick checks to run before you pay: same item, final total, promo restrictions and return terms.</span></a>
<a class="tool" href="/guides/checkout-comparison/"><strong>Checkout comparison worksheet</strong><span>Compare two sellers side by side, including shipping and return policies, on one printable page.</span></a>
</div>
<p class="disclose"><strong>#ad</strong> We also keep a short <a href="/offers/">offers page</a> with a few affiliate links. If you buy through them, Discount Deal Me may earn a commission at no extra cost to you. Articles on this site do not contain affiliate links.</p>
</section>'''
    return page(BRAND, "Discount Deal Me is a friendly guide to smart shopping: how to spot a real deal, stack coupons, track prices, use cashback, read return policies and budget for sales.", "/", body, "home")


def articles_index():
    cats = []
    for a in ARTS:
        if a["cat"] not in cats:
            cats.append(a["cat"])
    chips = '<button type="button" class="chip is-on" data-cat="all" aria-pressed="true">All</button>' + "".join(
        f'<button type="button" class="chip" data-cat="{html.escape(c)}" aria-pressed="false">{c}</button>' for c in cats)
    cards = "".join(card(a).replace('<a class="card"', f'<a class="card" data-cat="{html.escape(a["cat"])}"', 1) for a in ARTS)
    body = f'''<section class="wrap page-head">
<p class="eyebrow">The deal desk</p>
<h1>All articles</h1>
<p class="lede">Twelve practical guides to paying less with fewer surprises. Start with <a href="/articles/how-to-spot-a-real-deal/">how to spot a real deal</a>, or filter by topic.</p>
<div class="chips" role="group" aria-label="Filter articles by topic">{chips}</div>
</section>
<section class="wrap" aria-label="Article list"><div class="grid grid-3" id="art-grid">{cards}</div></section>
<section class="wrap narrow">
<h2>What you'll find here</h2>
<p>Discount Deal Me covers the mechanics of shopping well: how reference prices work, the order discounts are applied in, how cashback tracking can break, what a restocking fee is, how pack sizes hide price changes and how to keep sale season from swallowing a budget. Each guide includes a table or checklist you can use straight away, a short FAQ and links to related guides.</p>
<p>We do not publish coupon codes, product rankings or star ratings. Codes go stale fast and rankings require hands-on product testing we do not do. Instead, we focus on skills that work at any store, on any day.</p>
</section>'''
    return page("Articles", "Every Discount Deal Me guide in one place: spotting real deals, coupon stacking, price tracking, cashback, returns, sale seasons, unit pricing and budgeting.", "/articles/", body, "articles")


def about():
    body = f'''<section class="wrap page-head narrow">
<p class="eyebrow">About us</p>
<h1>We read the small print so the big print doesn't fool you</h1>
<p class="lede">Discount Deal Me is a small publication about shopping well. Our tagline is "offers worth the click", and most of what we write is about working out which offers actually are.</p>
</section>
<section class="wrap narrow prose">
<figure class="inline-fig"><img src="/images/how-to-spot-a-real-deal.svg" alt="A cheerful price-tag character inspecting a 'was / now' sale tag through a giant magnifying glass" width="1200" height="675"></figure>
<h2>What we do</h2>
<p>We write plain-English guides to the mechanics of saving money when you shop: how reference prices work, how coupons and cashback combine, how to read a return policy in a minute, how to use price history, and how to keep a budget that holds up during sale season. The aim is to give you skills you can use at any store, rather than a list of codes that will be out of date by tomorrow.</p>
<h2>Who writes it</h2>
<p>Articles are written and edited by the Discount Deal Me team. The site is published by Marketing Apes, a US digital marketing company. We do not claim special credentials, and we do not present opinions as expert testimony. Where a topic touches on money management, such as credit card rewards or budgeting, we keep to general, widely accepted information and say clearly that it is not personal financial advice.</p>
<h2>Our editorial rules</h2>
<ul class="checklist">
<li><strong>No invented coupon codes.</strong> We never publish a code we cannot stand behind, which in practice means we do not publish codes in articles at all.</li>
<li><strong>No fake testing or reviews.</strong> We do not claim to have tested products, and we do not publish star ratings, testimonials or rankings.</li>
<li><strong>Examples are labelled.</strong> When we use numbers to explain the math, we say they are illustrative and keep them round.</li>
<li><strong>Tendencies, not promises.</strong> Store policies and sale patterns change. We describe what is common and tell you to check the current terms.</li>
<li><strong>Corrections welcome.</strong> If something is wrong or out of date, <a href="/contact/">tell us</a> and we will review it.</li>
</ul>
<h2>How the site is funded</h2>
<p>Discount Deal Me shows advertising served by Google AdSense, which helps keep the guides free. Ads are placed automatically and are not endorsements. We also maintain a separate, clearly labelled <a href="/offers/">offers page</a> containing a small number of affiliate links; if you buy through those links we may earn a commission at no extra cost to you. Our articles do not contain affiliate links, and advertisers do not review or approve what we write.</p>
<h2>Get in touch</h2>
<p>Questions, corrections and topic ideas are always welcome. Visit the <a href="/contact/">contact page</a> or email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</section>'''
    return page("About", "About Discount Deal Me: who writes our smart-shopping guides, our editorial rules (no invented codes, no fake reviews) and how the site is funded.", "/about/", body, "about")


def contact():
    body = f'''<section class="wrap page-head narrow">
<p class="eyebrow">Contact</p>
<h1>Say hello to the deal desk</h1>
<p class="lede">The quickest way to reach us is email: <a class="big-mail" href="mailto:{EMAIL}">{EMAIL}</a></p>
</section>
<section class="wrap narrow prose">
<h2>Good reasons to write</h2>
<ul class="checklist">
<li><strong>Corrections.</strong> Spotted something inaccurate or out of date? Include the page link and what should change.</li>
<li><strong>Topic ideas.</strong> Tell us which shopping question you would like a plain-English guide on.</li>
<li><strong>Questions about an article.</strong> If something we wrote is unclear, we would like to know.</li>
<li><strong>Advertising or partnership enquiries.</strong> Please put "Partnership" in the subject line.</li>
<li><strong>Privacy requests.</strong> See our <a href="/privacy/">privacy policy</a> for what we collect and how to ask about it.</li>
</ul>
<h2>What we can't help with</h2>
<p>We are not a retailer and are not connected to the stores discussed in our guides, so we cannot help with orders, deliveries, refunds or account problems at a particular shop. Please contact that retailer directly. We also do not send coupon codes on request or give personal financial advice.</p>
<h2>What happens next</h2>
<p>A person on the Discount Deal Me team reads every message. We try to reply to questions and corrections, though we cannot promise a reply to every topic suggestion. We will only use your email address to respond to you.</p>
<p>This site does not use a contact form; email keeps things simple and means we do not store form submissions.</p>
</section>'''
    return page("Contact", "Contact Discount Deal Me by email for corrections, topic ideas, questions about our smart-shopping guides, partnership enquiries or privacy requests.", "/contact/", body, "contact")


def privacy():
    body = f'''<section class="wrap page-head narrow">
<p class="eyebrow">Legal</p>
<h1>Privacy policy</h1>
<p class="byline">Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></p>
</section>
<section class="wrap narrow prose">
<p>This policy explains what information is collected when you visit discountdealme.com ("Discount Deal Me", "we", "us"), how it is used, and the choices you have. The site is published by Marketing Apes.</p>
<h2>Information we collect</h2>
<p><strong>Information you send us.</strong> If you email us, we receive your email address and whatever you include in your message. We use it only to reply and to keep a record of the conversation.</p>
<p><strong>Information collected automatically.</strong> Like most websites, our hosting provider and the tools described below receive technical information when you visit, such as your IP address, browser type, device type, pages visited, referring page and the date and time of your visit.</p>
<p>The articles, about, contact and tools pages do not include sign-up or lead forms. The Deal-o-Meter calculator on our home page runs entirely in your browser; the numbers you type are not sent to us.</p>
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
<h2>Affiliate links</h2>
<p>Our separate <a href="/offers/">offers page</a> contains affiliate links marked #ad. When you click one, the affiliate network and retailer may set cookies to record that you came from our site, so a commission can be credited if you make a purchase. Their use of that information is governed by their own privacy policies.</p>
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
<p class="eyebrow">Legal</p>
<h1>Terms of use</h1>
<p class="byline">Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></p>
</section>
<section class="wrap narrow prose">
<p>By using discountdealme.com you agree to these terms. If you do not agree, please do not use the site.</p>
<h2>General information only</h2>
<p>Discount Deal Me publishes general information about shopping, discounts and budgeting. It is not financial, legal or tax advice, and it is not tailored to your circumstances. Store prices, policies, promotions and laws change often and vary by location. Always check current prices and terms directly with the retailer or relevant authority before relying on anything you read here.</p>
<h2>No guarantee of offers</h2>
<p>We do not sell products and are not responsible for the goods, services, prices or policies of any retailer. Examples on this site are illustrative. Where we link to third-party offers, the retailer's terms apply, and offers may change or end without notice.</p>
<h2>Advertising and affiliate links</h2>
<p>The site displays ads served by Google AdSense and contains a clearly labelled offers page with affiliate links. We may earn money from ads and qualifying purchases. This does not change the price you pay. Ads are not endorsements.</p>
<h2>Intellectual property</h2>
<p>The text, illustrations and design of this site are owned by or licensed to the publisher. You may share links and quote brief excerpts with attribution. You may print our checklists and worksheets for personal use. Please do not republish full articles or illustrations without permission.</p>
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


def notfound():
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page not found | {BRAND}</title>
<meta name="description" content="This page could not be found on Discount Deal Me.">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Nunito+Sans:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=20260923">
</head>
<body>
{nav()}<main id="main" class="wrap nf">
<img src="/images/free-trials-and-subscription-traps.svg" alt="A price-tag character tiptoeing past a mousetrap" width="1200" height="675">
<h1>This deal has expired.</h1>
<p class="lede">The page you were looking for isn't here. It may have moved, or the link may be mistyped.</p>
<p class="hero-ctas"><a class="btn" href="/">Back to the home page</a><a class="btn btn-ghost" href="/articles/">Browse articles</a></p>
</main>
{FOOT}'''


CSS = r"""
:root{--ink:#22223b;--ink-2:#4a4a68;--tang:#f4511e;--tang-d:#c83b0f;--cream:#fff7ea;--paper:#ffffff;--mint:#2ec4b6;--mint-d:#138a7f;--sun:#ffd23f;--lilac:#b8a1ff;--pink:#ff8fab;--sky:#9ad1ff;--line:#22223b;--r:18px;--shadow:6px 6px 0 var(--ink);--head:'Bricolage Grotesque','Arial Rounded MT Bold',system-ui,sans-serif;--body:'Nunito Sans',system-ui,-apple-system,'Segoe UI',sans-serif}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--cream);color:var(--ink);font-family:var(--body);font-size:1.0625rem;line-height:1.65;overflow-x:hidden}
img{max-width:100%;height:auto;display:block}
a{color:var(--tang-d);text-underline-offset:3px;text-decoration-thickness:2px}
a:hover{color:var(--ink)}
:focus-visible{outline:3px solid var(--mint-d);outline-offset:3px;border-radius:6px}
h1,h2,h3{font-family:var(--head);line-height:1.12;letter-spacing:-.02em;margin:0 0 .5em}
h1{font-size:clamp(2.1rem,7vw,3.8rem);font-weight:800}
h2{font-size:clamp(1.5rem,4.5vw,2.1rem);font-weight:800}
h3{font-size:1.2rem}
p{margin:0 0 1em}
.wrap{width:100%;max-width:1160px;margin:0 auto;padding:0 16px}
.narrow{max-width:780px}
.skip{position:absolute;left:-999px;top:0;background:var(--ink);color:#fff;padding:8px 12px;z-index:10}
.skip:focus{left:8px}
.eyebrow{font-family:var(--head);font-weight:800;text-transform:uppercase;letter-spacing:.12em;font-size:.8rem;color:var(--tang-d);margin-bottom:.4em}
.lede{font-size:1.15rem;color:var(--ink-2);max-width:62ch}
/* header */
.site-head{background:var(--paper);border-bottom:3px solid var(--ink);position:sticky;top:0;z-index:5}
.head-inner{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;padding-bottom:10px}
.logo{display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--ink);font-family:var(--head);font-weight:800;font-size:1.25rem}
.logo img{width:40px;height:40px;transition:transform .3s}
.logo:hover img{transform:rotate(-14deg) scale(1.08)}
.logo b{color:var(--tang)}
.site-head nav{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center}
.site-head nav a{color:var(--ink);text-decoration:none;font-weight:700;padding:4px 2px;border-bottom:3px solid transparent}
.site-head nav a:hover,.site-head nav a[aria-current]{border-color:var(--tang)}
.site-head nav a.nav-pill{background:var(--sun);border:2px solid var(--ink);border-radius:999px;padding:4px 12px;box-shadow:3px 3px 0 var(--ink);transition:transform .15s,box-shadow .15s}
.site-head nav a.nav-pill:hover{transform:translate(-2px,-2px);box-shadow:5px 5px 0 var(--ink);border-color:var(--ink)}
/* buttons */
.btn{display:inline-block;background:var(--tang);color:#fff;font-family:var(--head);font-weight:800;text-decoration:none;padding:.8em 1.3em;border:3px solid var(--ink);border-radius:14px;box-shadow:var(--shadow);transition:transform .15s,box-shadow .15s;cursor:pointer;font-size:1rem}
.btn:hover{color:#fff;transform:translate(-3px,-3px);box-shadow:9px 9px 0 var(--ink)}
.btn:active{transform:translate(3px,3px);box-shadow:2px 2px 0 var(--ink)}
.btn-ghost{background:var(--paper);color:var(--ink)}
.btn-ghost:hover{color:var(--ink);background:var(--sun)}
.btn-small{padding:.5em 1em;font-size:.9rem;box-shadow:3px 3px 0 var(--ink)}
.hero-ctas{display:flex;flex-wrap:wrap;gap:14px;margin-top:1.4em}
/* hero */
.hero{padding:32px 0 24px;background:radial-gradient(circle at 85% 10%,#ffe89a 0,transparent 40%),var(--cream)}
.hero-grid{display:grid;gap:24px;align-items:center}
.squiggle{color:var(--tang);background:linear-gradient(transparent 70%,var(--sun) 70%);padding:0 .1em}
.hero-art{margin:0;border:3px solid var(--ink);border-radius:26px;overflow:hidden;box-shadow:var(--shadow);background:var(--paper);transform:rotate(1deg);transition:transform .3s}
.hero-art:hover{transform:rotate(-.5deg) scale(1.01)}
@media(min-width:900px){.hero{padding:56px 0 40px}.hero-grid{grid-template-columns:1fr 1.15fr;gap:48px}}
/* meter */
.meter-wrap{margin-top:24px;margin-bottom:56px}
.meter{background:var(--paper);border:3px solid var(--ink);border-radius:26px;box-shadow:var(--shadow);padding:20px;display:grid;gap:20px;position:relative;overflow:hidden}
.meter::before{content:"";position:absolute;inset:0 0 auto 0;height:12px;background:repeating-linear-gradient(90deg,var(--tang) 0 24px,var(--sun) 24px 48px,var(--mint) 48px 72px,var(--lilac) 72px 96px)}
.meter-intro{padding-top:8px}
.mini-steps{padding-left:1.2em;color:var(--ink-2)}
.meter-form{display:grid;grid-template-columns:1fr;gap:12px}
.field label{display:block;font-weight:700;font-size:.95rem;margin-bottom:4px}
.field small{font-weight:400;color:var(--ink-2)}
.field input{width:100%;font:inherit;padding:.6em .8em;border:2px solid var(--ink);border-radius:12px;background:var(--cream);transition:box-shadow .15s,background .15s}
.field input:focus{background:#fff;box-shadow:4px 4px 0 var(--mint);outline:none}
.meter-out{grid-column:1/-1;background:var(--cream);border:2px dashed var(--ink);border-radius:18px;padding:16px}
.gauge{height:22px;border:2px solid var(--ink);border-radius:999px;background:#fff;overflow:hidden}
.gauge-fill{height:100%;width:0;background:linear-gradient(90deg,var(--pink),var(--sun),var(--mint));transition:width .5s cubic-bezier(.3,1.4,.5,1)}
.verdict{font-family:var(--head);font-weight:800;font-size:1.2rem;margin:.7em 0}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0}
.stats div{background:#fff;border:2px solid var(--ink);border-radius:12px;padding:8px 10px}
.stats dt{font-size:.8rem;color:var(--ink-2);font-weight:700}
.stats dd{margin:0;font-family:var(--head);font-weight:800;font-size:1.25rem}
.meter-form button{justify-self:start}
@media(min-width:640px){.meter-form{grid-template-columns:1fr 1fr}.stats{grid-template-columns:repeat(4,1fr)}}
@media(min-width:960px){.meter{grid-template-columns:.8fr 1.2fr;padding:36px;gap:36px}.meter-form{grid-template-columns:repeat(3,1fr)}}
/* sections & cards */
.sec-head{max-width:720px;margin-bottom:24px}
.grid{display:grid;gap:22px}
@media(min-width:640px){.grid-2,.grid-3{grid-template-columns:1fr 1fr}.grid-4{grid-template-columns:1fr 1fr}}
@media(min-width:960px){.grid-3{grid-template-columns:repeat(3,1fr)}.grid-4{grid-template-columns:repeat(4,1fr)}}
.card{display:flex;flex-direction:column;background:var(--paper);color:var(--ink);text-decoration:none;border:3px solid var(--ink);border-radius:var(--r);overflow:hidden;box-shadow:var(--shadow);transition:transform .2s,box-shadow .2s}
.card:hover{color:var(--ink);transform:translate(-3px,-4px) rotate(-.6deg);box-shadow:10px 10px 0 var(--tang)}
.card-img{display:block;border-bottom:3px dashed var(--ink);background:var(--cream);overflow:hidden}
.card-img img{transition:transform .4s}
.card:hover .card-img img{transform:scale(1.05)}
.card-body{display:flex;flex-direction:column;gap:6px;padding:16px 18px 18px;flex:1}
.card-title{font-family:var(--head);font-weight:800;font-size:1.2rem;line-height:1.2}
.card-desc{color:var(--ink-2);font-size:.95rem}
.card-more{margin-top:auto;font-weight:700;color:var(--tang-d)}
.pill{display:inline-block;align-self:flex-start;background:var(--sun);border:2px solid var(--ink);border-radius:999px;padding:1px 10px;font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
.feature{margin-bottom:22px}
@media(min-width:800px){.card-big{flex-direction:row}.card-big .card-img{flex:1.2;border-bottom:0;border-right:3px dashed var(--ink)}.card-big .card-body{flex:1;justify-content:center;padding:28px}.card-big .card-title{font-size:1.8rem}}
.principles{margin:64px auto}
.prin{background:var(--paper);border:3px solid var(--ink);border-radius:var(--r);padding:20px;transition:transform .2s,background .2s}
.prin:nth-child(1){background:#e6f8f6}.prin:nth-child(2){background:#fff2c4}.prin:nth-child(3){background:#f0eaff}.prin:nth-child(4){background:#ffe7ee}
.prin:hover{transform:rotate(-1.5deg)}
.prin-ico{font-size:2rem;display:block;margin-bottom:6px}
.prin p{margin:0;color:var(--ink-2)}
.tools{margin-bottom:64px}
.tool{display:block;background:var(--paper);border:3px dashed var(--ink);border-radius:var(--r);padding:20px;text-decoration:none;color:var(--ink);transition:background .2s,transform .2s}
.tool:hover{background:var(--sun);color:var(--ink);transform:translateY(-3px)}
.tool strong{display:block;font-family:var(--head);font-size:1.25rem}
.tool span{color:var(--ink-2)}
.disclose{margin-top:18px;font-size:.95rem;color:var(--ink-2)}
/* page heads */
.page-head{padding-top:40px;padding-bottom:16px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 8px}
.chip{font:inherit;font-weight:700;font-size:.9rem;background:var(--paper);border:2px solid var(--ink);border-radius:999px;padding:4px 14px;cursor:pointer;transition:background .15s,transform .15s}
.chip:hover{transform:translateY(-2px)}
.chip.is-on{background:var(--ink);color:#fff}
.card[hidden]{display:none}
/* article */
.article{padding-top:24px;padding-bottom:40px}
.crumbs{font-size:.9rem;color:var(--ink-2);margin-bottom:18px}
.crumbs a{color:var(--ink-2)}
.art-head{max-width:820px}
.art-head h1{font-size:clamp(1.9rem,6vw,3.1rem);margin-top:.35em}
.byline{color:var(--ink-2);font-size:.95rem}
.art-hero{margin:18px 0 28px;border:3px solid var(--ink);border-radius:24px;overflow:hidden;box-shadow:var(--shadow);background:var(--paper)}
.prose{max-width:760px}
.prose h2{margin-top:1.6em;position:relative;padding-left:.2em}
.prose h2::before{content:"";position:absolute;left:-14px;top:.25em;width:6px;height:.9em;background:var(--tang);border-radius:3px}
.prose ul,.prose ol{padding-left:1.3em}
.prose li{margin-bottom:.4em}
.checklist{list-style:none;padding:16px 18px!important;background:var(--paper);border:3px solid var(--ink);border-radius:var(--r)}
.checklist li{position:relative;padding-left:32px}
.checklist li::before{content:"";position:absolute;left:0;top:.3em;width:18px;height:18px;border:2px solid var(--ink);border-radius:5px;background:var(--mint);box-shadow:2px 2px 0 var(--ink)}
.steps{counter-reset:s;list-style:none;padding-left:0!important}
.steps li{counter-increment:s;position:relative;padding-left:48px;margin-bottom:.9em}
.steps li::before{content:counter(s);position:absolute;left:0;top:0;width:34px;height:34px;display:grid;place-items:center;background:var(--sun);border:2px solid var(--ink);border-radius:50%;font-family:var(--head);font-weight:800}
.table-wrap{overflow-x:auto;margin:1.2em 0 1.6em;border:3px solid var(--ink);border-radius:var(--r);background:var(--paper)}
table{border-collapse:collapse;width:100%;font-size:.95rem;min-width:520px}
caption{text-align:left;font-family:var(--head);font-weight:800;padding:12px 14px;background:var(--sun);border-bottom:3px solid var(--ink)}
th,td{padding:10px 14px;text-align:left;vertical-align:top;border-bottom:1px solid #e3dccd}
th{background:#fff7ea;font-weight:800}
tbody tr:hover{background:#fffbe9}
.calc{margin:1.2em 0;background:var(--ink);color:#fff;border-radius:var(--r);padding:18px 20px}
.calc figcaption{font-family:var(--head);font-weight:800;color:var(--sun);margin-bottom:8px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.95rem;margin:0}
.note-inline,.art-foot{background:#e6f8f6;border:2px solid var(--ink);border-left:10px solid var(--mint);border-radius:12px;padding:12px 16px;margin:1.2em 0;font-size:.95rem}
.art-foot{background:#fff;border-left-color:var(--lilac);color:var(--ink-2)}
.faq details{background:var(--paper);border:2px solid var(--ink);border-radius:14px;margin-bottom:10px;transition:box-shadow .15s}
.faq details[open]{box-shadow:4px 4px 0 var(--lilac)}
.faq summary{cursor:pointer;font-weight:800;padding:12px 16px;list-style:none;position:relative;padding-right:44px}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";position:absolute;right:16px;top:8px;font-family:var(--head);font-size:1.4rem}
.faq details[open] summary::after{content:"\2212"}
.faq details p{padding:0 16px 12px;margin:0}
.related{margin-top:48px}
.inline-fig{margin:0 0 1.5em;border:3px solid var(--ink);border-radius:20px;overflow:hidden}
.big-mail{font-family:var(--head);font-weight:800;font-size:1.3rem;word-break:break-all}
/* footer */
.site-foot{background:var(--ink);color:#f1eee6;margin-top:40px;padding:40px 0 24px;border-top:6px solid var(--tang)}
.site-foot a{color:#fff;text-decoration:none}
.site-foot a:hover{color:var(--sun);text-decoration:underline}
.foot-grid{display:grid;gap:24px}
.foot-grid nav{display:flex;flex-direction:column;gap:6px}
.foot-h{font-size:.85rem;text-transform:uppercase;letter-spacing:.12em;color:var(--sun);margin:0 0 4px}
.logo-foot{color:#fff}
.logo-foot b{color:var(--sun)}
.foot-tag{color:#d8d4ea;margin-top:10px;max-width:36ch}
.foot-base{margin-top:28px;padding-top:16px;border-top:1px solid #45456a;font-size:.85rem;color:#c9c5dc}
.foot-base p{margin:0}
@media(min-width:760px){.foot-grid{grid-template-columns:2fr 1fr 1fr 1fr}}
/* 404 */
.nf{text-align:center;padding-top:40px;padding-bottom:40px;max-width:720px}
.nf img{border:3px solid var(--ink);border-radius:24px;margin:0 auto 24px;box-shadow:var(--shadow)}
.nf .hero-ctas{justify-content:center}
@media(prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
"""

JS = r"""
(function(){
  // Deal-o-Meter
  var f=document.getElementById('meter-form');
  if(f){
    var $=function(id){return document.getElementById(id)};
    var num=function(n){var v=parseFloat(f.elements[n].value);return isFinite(v)&&v>=0?v:null};
    var money=function(v){return '$'+v.toFixed(2)};
    var pct=function(v){return Math.round(v)+'%'};
    function calc(){
      var was=num('was'),now=num('now'),usual=num('usual'),code=num('code')||0,ship=num('ship')||0,cb=num('cb')||0;
      var fill=$('gauge-fill'),v=$('verdict');
      if(now===null||!was){fill.style.width='0';v.textContent='Fill in the first two boxes to see the real discount.';['o-tag','o-total','o-net','o-real'].forEach(function(i){$(i).textContent='–'});return;}
      code=Math.min(code,100);cb=Math.min(cb,100);
      var afterCode=now*(1-code/100),total=afterCode+ship,net=total-afterCode*cb/100;
      var tag=(was-now)/was*100;
      $('o-tag').textContent=pct(tag);$('o-total').textContent=money(total);$('o-net').textContent=money(net);
      var base=usual||was,real=(base-net)/base*100;
      $('o-real').textContent=usual?(real>=0?pct(real)+' less':pct(-real)+' more'):'add usual price';
      fill.style.width=Math.max(0,Math.min(100,real*2))+'%';
      var msg;
      if(!usual){msg='The tag says '+pct(tag)+' off. Add what it usually sells for to see if that holds up.';}
      else if(real<=0){msg='Plot twist: with extras, this costs the same or more than usual. Not a deal.';}
      else if(real<5){msg='Meh. About the normal price once everything is counted.';}
      else if(real<15){msg='A modest real saving. Good if it was already on your list.';}
      else if(real<30){msg='Solid! A genuine discount against the usual price.';}
      else {msg='Big real discount. Double-check it is the identical item and the seller is legit.';}
      v.textContent=msg;
    }
    f.addEventListener('input',calc);
    f.addEventListener('reset',function(){setTimeout(calc,0)});
    f.addEventListener('submit',function(e){e.preventDefault();calc()});
  }
  // Article filter chips
  var chips=document.querySelectorAll('.chip');
  if(chips.length){
    chips.forEach(function(c){c.addEventListener('click',function(){
      var cat=c.getAttribute('data-cat');
      chips.forEach(function(o){var on=o===c;o.classList.toggle('is-on',on);o.setAttribute('aria-pressed',on?'true':'false')});
      document.querySelectorAll('#art-grid .card').forEach(function(card){card.hidden=!(cat==='all'||card.getAttribute('data-cat')===cat)});
    })});
  }
})();
"""


def main():
    svgs.write_all(os.path.join(OUT, "images"))
    write("assets/site.css", CSS.strip() + "\n")
    write("assets/site.js", JS.strip() + "\n")
    write("index.html", home())
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
Allow: /offers/
Allow: /guides/
Allow: /deal-checklist/
Disallow: /preview/

User-agent: Mediapartners-Google
Allow: /

Sitemap: {HOST}/sitemap.xml
""")
    urls = ["/", "/articles/"] + [f'/articles/{a["slug"]}/' for a in ARTS] + ["/about/", "/contact/", "/privacy/", "/terms/", "/deal-checklist/", "/guides/checkout-comparison/", "/offers/"]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
        f"  <url><loc>{HOST}{u}</loc><lastmod>{UPDATED}</lastmod></url>\n" for u in urls) + "</urlset>\n"
    write("sitemap.xml", sm)
    write("_redirects", "/preview/*  /  301\n/preview    /  301\n")


if __name__ == "__main__":
    main()
