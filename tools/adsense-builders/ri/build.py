#!/usr/bin/env python3
"""Builds the Research Investigation content site into /home/user/domains/ri/."""
import os, re, html, json
import svgs
from articles_a import ARTICLES as A1
from articles_b import ARTICLES as A2

OUT = "/home/user/domains/ri"
HOST = "researchinvestigation.com"
BRAND = "Research Investigation"
EMAIL = "hello@researchinvestigation.com"
UPDATED = "2026-09-23"
UPDATED_H = "23 September 2026"
ARTICLES = A1 + A2
BY_SLUG = {a["slug"]: a for a in ARTICLES}

GTM_HEAD = """<script>window.dataLayer=window.dataLayer||[];</script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-N3B29SZD');</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-RGJRR0CW8T"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","G-RGJRR0CW8T");</script>"""
GTM_BODY = '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-N3B29SZD" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>'

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=Special+Elite&display=swap" rel="stylesheet">')

CATS = {
    "reviews": "Reviews &amp; records",
    "hire": "Hiring &amp; renting",
    "online": "Shops &amp; sellers",
    "money": "Money &amp; fine print",
}


def esc(s):
    return html.escape(s, quote=True)


def head(title, desc, path, image="/images/og.svg", noindex=False, extra=""):
    full = f"{title} | {BRAND}" if title != BRAND else f"{BRAND} | Know before you buy"
    robots = '<meta name="robots" content="noindex">\n' if noindex else ""
    canon = "" if noindex else f'<link rel="canonical" href="https://{HOST}{path}">\n'
    ads = "" if noindex else ('<meta name="google-adsense-account" content="ca-pub-5194583669093303">\n'
                              '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5194583669093303" crossorigin="anonymous"></script>\n')
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(full)}</title>
<meta name="description" content="{esc(desc)}">
{robots}{canon}{ads}<meta property="og:type" content="{'article' if path.startswith('/articles/') and path != '/articles/' else 'website'}">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="https://{HOST}{path}">
<meta property="og:image" content="https://{HOST}{image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1b2440">
<link rel="icon" href="/images/favicon.svg" type="image/svg+xml">
{FONTS}
<link rel="stylesheet" href="/assets/site.css?v=20260923">
{GTM_HEAD}
{extra}</head>
"""


def nav(active=""):
    def item(href, label, key):
        cur = ' aria-current="page"' if key == active else ""
        return f'<li><a href="{href}"{cur}>{label}</a></li>'
    return f"""<body>
{GTM_BODY}
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap head-row">
    <a class="logo" href="/" aria-label="{BRAND} home"><img src="/images/logo.svg" alt="{BRAND}" width="252" height="40"></a>
    <nav aria-label="Main">
      <ul class="nav">
        {item('/', 'Home', 'home')}
        {item('/articles/', 'Articles', 'articles')}
        {item('/about/', 'About', 'about')}
        {item('/contact/', 'Contact', 'contact')}
      </ul>
    </nav>
  </div>
</header>
"""


FOOT = f"""<footer class="site-foot">
  <div class="wrap foot-grid">
    <div>
      <p class="foot-brand">{BRAND}</p>
      <p class="foot-tag">Know before you buy. Plain-language guides to researching products, sellers, contractors and landlords.</p>
    </div>
    <nav aria-label="Footer">
      <ul class="foot-links">
        <li><a href="/articles/">Articles</a></li>
        <li><a href="/about/">About</a></li>
        <li><a href="/contact/">Contact</a></li>
        <li><a href="/privacy/">Privacy</a></li>
        <li><a href="/terms/">Terms</a></li>
      </ul>
    </nav>
  </div>
  <div class="wrap foot-small">
    <p>&copy; 2026 {BRAND}. General consumer information only &mdash; not legal, financial or professional advice.</p>
  </div>
</footer>
<script src="/assets/site.js?v=20260923" defer></script>
</body>
</html>
"""


def write(rel, content):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(content)


def card(a, h="h3"):
    return f"""<article class="card card--{a['cat']}">
  <a class="card-link" href="/articles/{a['slug']}/">
    <div class="card-img"><img src="/images/{a['slug']}.svg" alt="{esc(a['alt'])}" width="600" height="338" loading="lazy"></div>
    <div class="card-body">
      <p class="tab">{CATS[a['cat']]}</p>
      <{h}>{esc(a['title'])}</{h}>
      <span class="card-desc">{esc(a['desc'])}</span>
      <span class="more">Open the case file &rarr;</span>
    </div>
  </a>
</article>"""


def slugify(t):
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:48]


def article_page(a):
    body = a["body"]
    toc = []
    def add_id(m):
        t = re.sub(r"<[^>]+>", "", m.group(1))
        i = slugify(t)
        toc.append((i, t))
        return f'<h2 id="{i}">{m.group(1)}</h2>'
    body = re.sub(r"<h2>(.*?)</h2>", add_id, body)
    words = len(re.findall(r"[A-Za-z0-9'’-]+", re.sub(r"<[^>]+>", " ", body)))
    mins = max(4, round(words / 220))
    faq = "".join(f'<details><summary>{esc(q)}</summary><p>{a_}</p></details>' for q, a_ in a["faq"])
    rel = "".join(card(BY_SLUG[s]) for s in a["related"])
    toc_html = "".join(f'<li><a href="#{i}">{esc(t)}</a></li>' for i, t in toc)
    ld = {
        "@context": "https://schema.org", "@type": "Article", "headline": a["title"],
        "description": a["desc"], "dateModified": UPDATED, "datePublished": UPDATED,
        "author": {"@type": "Organization", "name": f"The {BRAND} team"},
        "publisher": {"@type": "Organization", "name": BRAND},
        "image": f"https://{HOST}/images/{a['slug']}.svg",
        "mainEntityOfPage": f"https://{HOST}/articles/{a['slug']}/",
    }
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", x)}} for q, x in a["faq"]]}
    extra = f'<script type="application/ld+json">{json.dumps(ld)}</script>\n<script type="application/ld+json">{json.dumps(faq_ld)}</script>\n'
    return (head(a["title"], a["desc"], f"/articles/{a['slug']}/", f"/images/{a['slug']}.svg", extra=extra) + nav("articles") + f"""<main id="main">
<article class="post">
  <div class="wrap post-top">
    <p class="crumbs"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/articles/">Articles</a> <span aria-hidden="true">/</span> <span>{CATS[a['cat']]}</span></p>
    <p class="tab tab--{a['cat']}">{CATS[a['cat']]}</p>
    <h1>{esc(a['title'])}</h1>
    <p class="dek">{a['dek']}</p>
    <p class="byline">By the {BRAND} team &middot; Last updated <time datetime="{UPDATED}">{UPDATED_H}</time> &middot; {mins} min read</p>
  </div>
  <figure class="wrap post-hero">
    <img src="/images/{a['slug']}.svg" alt="{esc(a['alt'])}" width="1200" height="675">
  </figure>
  <div class="wrap post-grid">
    <aside class="toc" aria-label="On this page">
      <p class="toc-h">In this case file</p>
      <ol>{toc_html}<li><a href="#faq">FAQ</a></li></ol>
    </aside>
    <div class="prose">
      <div class="note"><strong>Heads up:</strong> this is general consumer information to help you ask better questions. It is not legal, financial or professional advice, and rules differ by country and state &mdash; check the official source for where you live.</div>
      {body}
      <section class="faq" id="faq">
        <h2>Frequently asked questions</h2>
        {faq}
      </section>
    </div>
  </div>
  <section class="wrap related" aria-labelledby="rel-h">
    <h2 id="rel-h">Related articles</h2>
    <div class="grid grid--3">{rel}</div>
    <p class="center"><a class="btn btn--ghost" href="/articles/">All articles</a></p>
  </section>
</article>
</main>
""" + FOOT)


WIDGET = """<section class="scorer wrap" id="scorer" aria-labelledby="scorer-h">
  <div class="scorer-head">
    <p class="tab">Interactive</p>
    <h2 id="scorer-h">The before-you-buy red-flag scorer</h2>
    <p>Pick what you are about to pay for, tick every warning sign you have noticed, and get a plain-language read on how carefully to proceed. Nothing you tick leaves your browser.</p>
  </div>
  <div class="scorer-box">
    <div class="scorer-tabs" role="tablist" aria-label="What are you checking?">
      <button type="button" role="tab" aria-selected="true" data-kind="shop">Online shop</button>
      <button type="button" role="tab" aria-selected="false" data-kind="trade">Contractor</button>
      <button type="button" role="tab" aria-selected="false" data-kind="rent">Rental</button>
      <button type="button" role="tab" aria-selected="false" data-kind="private">Private seller</button>
    </div>
    <fieldset class="flags" id="flags">
      <legend class="sr-only">Red flags you have noticed</legend>
    </fieldset>
    <div class="verdict" id="verdict" aria-live="polite">
      <div class="meter" aria-hidden="true"><span id="meter-fill"></span></div>
      <p class="verdict-title" id="verdict-title">No flags ticked yet</p>
      <p id="verdict-text">That is a good start, but silence is not proof. Run the basic checks anyway.</p>
      <p class="verdict-read" id="verdict-read"></p>
    </div>
    <p class="scorer-foot"><button type="button" class="btn btn--ghost btn--sm" id="reset">Clear ticks</button> <span>A rough guide, not a guarantee. One serious flag can be enough to walk away.</span></p>
  </div>
</section>"""


def home():
    feat = "".join(card(a) for a in ARTICLES[:6])
    return (head(BRAND, "Know before you buy: plain-language guides to researching products, online shops, contractors, landlords and sellers, reading reviews critically and spotting scams.", "/") + nav("home") + f"""<main id="main">
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="stamp">Case open</p>
      <h1>Know before you buy.</h1>
      <p class="lede">Research Investigation is a free library of practical guides for the ten minutes before you hand over money: how to read reviews without being fooled, check a contractor&rsquo;s licence, research a landlord, test whether an online shop is real, and pay in a way you can undo if it goes wrong.</p>
      <p class="hero-ctas"><a class="btn" href="#scorer">Score a purchase</a> <a class="btn btn--ghost" href="/articles/">Browse the case files</a></p>
    </div>
    <div class="hero-art"><img src="/images/hero.svg" alt="Illustrated town scene: a detective holds a giant magnifying glass over a mystery box with a question-mark price tag while a partner ticks a checklist" width="1600" height="900"></div>
  </div>
</section>

<section class="wrap steps" aria-labelledby="method-h">
  <h2 id="method-h">The three-question method</h2>
  <p class="section-lede">Almost every guide on this site comes back to the same three questions. Ask them before any purchase that would hurt to lose.</p>
  <ol class="step-cards">
    <li><span class="step-n">1</span><h3>Who am I really dealing with?</h3><p>A name on a website is not an identity. Look for a registered business, a licence number, a physical address and a track record you can check somewhere the seller does not control.</p></li>
    <li><span class="step-n">2</span><h3>What do independent sources say?</h3><p>Reviews on the seller&rsquo;s own page are the least useful evidence there is. Cross-check complaint databases, recall lists, court and licensing records, and the spread of opinions on neutral platforms.</p></li>
    <li><span class="step-n">3</span><h3>If this goes wrong, how do I get my money back?</h3><p>The payment method, the written contract and the return policy decide your options later. Sort them out before you pay, not after.</p></li>
  </ol>
</section>

{WIDGET}

<section class="wrap featured" aria-labelledby="feat-h">
  <div class="section-row"><h2 id="feat-h">Fresh case files</h2><a class="link-arrow" href="/articles/">All {len(ARTICLES)} articles &rarr;</a></div>
  <div class="grid grid--3">{feat}</div>
</section>

<section class="wrap promise" aria-labelledby="promise-h">
  <div class="promise-card">
    <h2 id="promise-h">What you will (and won&rsquo;t) find here</h2>
    <div class="two-col">
      <div>
        <h3>You will find</h3>
        <ul class="ticks">
          <li>Step-by-step research routines you can do yourself, for free, in an evening.</li>
          <li>The official places to look things up: licensing boards, recall lists, business registers and complaint databases.</li>
          <li>Honest notes on what each check can and cannot tell you.</li>
        </ul>
      </div>
      <div>
        <h3>You won&rsquo;t find</h3>
        <ul class="crosses">
          <li>Star ratings, &ldquo;best of&rdquo; rankings or winners picked for you.</li>
          <li>Sponsored reviews or paid placements dressed up as advice.</li>
          <li>Invented statistics. Where the evidence runs out, we say so.</li>
        </ul>
      </div>
    </div>
  </div>
</section>
</main>
""" + FOOT)


def articles_index():
    groups = ""
    for k, label in CATS.items():
        items = [a for a in ARTICLES if a["cat"] == k]
        if not items:
            continue
        groups += f'<section class="cat-group" aria-labelledby="cat-{k}"><h2 id="cat-{k}">{label}</h2><div class="grid grid--3">{"".join(card(a) for a in items)}</div></section>'
    return (head("All articles", "Every Research Investigation guide in one place: reading reviews, spotting fakes, vetting contractors and landlords, checking online shops, recalls, warranties and safe ways to pay.", "/articles/") + nav("articles") + f"""<main id="main">
<section class="page-top wrap">
  <p class="tab">The archive</p>
  <h1>All case files</h1>
  <p class="lede">{len(ARTICLES)} practical guides to researching a purchase before you commit. Each one ends with a checklist or table you can use straight away, and every guide is written and maintained by the {BRAND} team. Start with the topic closest to the decision in front of you, or read the reviews section first &mdash; it underpins everything else.</p>
</section>
<div class="wrap">{groups}</div>
</main>
""" + FOOT)


def simple(path, title, desc, active, inner):
    return head(title, desc, path) + nav(active) + f'<main id="main"><div class="wrap page">{inner}</div></main>\n' + FOOT


ABOUT = f"""<p class="tab">About us</p>
<h1>About {BRAND}</h1>
<p class="lede">We write the guides we wished existed the first time we hired a builder, rented a flat sight unseen, or bought something expensive from a shop we had never heard of.</p>
<img class="page-art" src="/images/og.svg" alt="A manila case file labelled Research Investigation beside a magnifying glass" width="1200" height="630">
<h2>What this site is for</h2>
<p>{BRAND} is a free, independent library of consumer research guides. The idea is simple: most bad purchases are not caused by bad luck but by a check that nobody thought to make. A licence number that was never looked up. A review page that was never compared with a complaint database. A deposit paid by bank transfer instead of by card. Our articles walk through those checks one at a time, in plain language, so you can make them yourself.</p>
<p>We cover products, online shops, private sellers, tradespeople and contractors, landlords and rental listings, and the fine print that decides what happens when something goes wrong &mdash; warranties, returns, subscriptions and payment protection.</p>
<h2>How we write</h2>
<ul class="ticks">
  <li><strong>Method over verdicts.</strong> We do not rank products or hand out stars. We explain how to research a decision so that the conclusion is yours.</li>
  <li><strong>Official sources first.</strong> Where a government register, recall list or licensing board exists, we point you to it and explain what it does and does not show.</li>
  <li><strong>No invented evidence.</strong> We do not claim to have tested products, we do not publish made-up statistics, and we do not quote experts who do not exist. If something is uncertain or varies by location, we say so.</li>
  <li><strong>Written by the team.</strong> Articles are credited to &ldquo;the {BRAND} team&rdquo; because they are researched, written and edited collectively.</li>
</ul>
<h2>What we are not</h2>
<p>We are not lawyers, financial advisers or a regulator, and nothing on this site is legal, financial or professional advice. We cannot investigate individual companies or disputes on your behalf. Consumer rules differ between countries and between US states, and they change; each article tells you where to confirm the current rules for your area.</p>
<h2>How the site is funded</h2>
<p>The site is supported by advertising served by Google AdSense. Advertisers do not choose, see or approve our articles, and an advert appearing next to a guide is not an endorsement. We do not accept payment for coverage. You can read more in our <a href="/privacy/">privacy policy</a>.</p>
<h2>Corrections</h2>
<p>If you spot something out of date or wrong &mdash; a register that has moved, a rule that has changed &mdash; please tell us at <a href="mailto:{EMAIL}">{EMAIL}</a>. We review every correction and update the article and its &ldquo;last updated&rdquo; date when we make a change.</p>
<p>{BRAND} is operated by Marketing Apes LLC.</p>
"""

CONTACT = f"""<p class="tab">Get in touch</p>
<h1>Contact {BRAND}</h1>
<p class="lede">The best way to reach the team is by email: <a class="big-mail" href="mailto:{EMAIL}">{EMAIL}</a></p>
<div class="two-col">
  <div class="panel">
    <h2>Good reasons to write</h2>
    <ul class="ticks">
      <li>A correction: a link has moved, a rule has changed, or we got something wrong.</li>
      <li>A topic request: a kind of purchase or seller you would like a research guide for.</li>
      <li>A scam pattern you have seen that other readers should know about (please leave out personal details).</li>
      <li>Questions about advertising on the site or about our <a href="/privacy/">privacy policy</a>.</li>
    </ul>
  </div>
  <div class="panel">
    <h2>What we can&rsquo;t do</h2>
    <ul class="crosses">
      <li>Investigate a specific company, seller or person for you.</li>
      <li>Give legal, financial or professional advice on your situation.</li>
      <li>Recover money or contact a business on your behalf.</li>
    </ul>
  </div>
</div>
<h2>If you think you have been scammed</h2>
<p>Act quickly and report it to the organisations that can actually help. Contact your bank or card issuer first &mdash; the sooner they know, the more options they may have. Then report to the official channel for your country:</p>
<ul>
  <li>United States: the Federal Trade Commission at <a href="https://reportfraud.ftc.gov/" rel="noopener">ReportFraud.ftc.gov</a>, and the FBI&rsquo;s Internet Crime Complaint Center at <a href="https://www.ic3.gov/" rel="noopener">ic3.gov</a> for online fraud.</li>
  <li>United Kingdom: Report Fraud (formerly Action Fraud) via <a href="https://www.actionfraud.police.uk/" rel="noopener">actionfraud.police.uk</a>, and Citizens Advice for consumer help.</li>
  <li>Elsewhere: your national consumer protection agency or police fraud unit.</li>
</ul>
<h2>Response times</h2>
<p>We read every message, but we are a small team and cannot promise a personal reply to each one. Corrections are prioritised. Please do not send passwords, card numbers, account details or copies of identity documents by email.</p>
"""

PRIVACY = f"""<p class="tab">Legal</p>
<h1>Privacy policy</h1>
<p class="byline">Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></p>
<p>This policy explains what information is collected when you visit {HOST} (&ldquo;{BRAND}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), why, and the choices you have. {BRAND} is operated by Marketing Apes LLC. If you have a question about this policy, email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
<h2>Information we collect</h2>
<p>We do not ask you to create an account, and the site has no sign-up or comment forms. We receive information in two ways:</p>
<ul>
  <li><strong>Information you send us.</strong> If you email us, we receive your email address and whatever you include in the message. We use it only to reply and to improve the site, and we do not sell it.</li>
  <li><strong>Information collected automatically.</strong> Like most websites, our hosting provider and the third-party services described below receive technical data such as your IP address, browser type, device type, pages visited, referring page and the date and time of your visit.</li>
</ul>
<p>The interactive red-flag scorer on our home page runs entirely in your browser. The boxes you tick are not sent to us or stored on our servers.</p>
<h2>Cookies and advertising</h2>
<p>We use Google AdSense to show advertising, which helps keep the site free. Cookies are small text files placed on your device. In connection with advertising:</p>
<ul>
  <li>Third-party vendors, including Google, use cookies to serve ads based on a user&rsquo;s prior visits to this website and other websites.</li>
  <li>Google&rsquo;s use of advertising cookies enables it and its partners to serve ads to our users based on their visits to this site and/or other sites on the Internet.</li>
  <li>You may opt out of personalised advertising by visiting Google&rsquo;s <a href="https://adssettings.google.com" rel="noopener">Ads Settings</a> (adssettings.google.com). You can also opt out of some third-party vendors&rsquo; use of cookies for personalised advertising at <a href="https://www.aboutads.info" rel="noopener">www.aboutads.info</a> (and, in the EU/UK, <a href="https://www.youronlinechoices.eu" rel="noopener">youronlinechoices.eu</a>).</li>
  <li>If you opt out of personalised ads, you may still see ads, but they will be based on general factors such as the page content rather than your browsing history.</li>
</ul>
<p>For more detail, see <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">How Google uses information from sites or apps that use its services</a> and Google&rsquo;s <a href="https://policies.google.com/technologies/ads" rel="noopener">advertising policies</a>.</p>
<p>Where the law requires consent for non-essential cookies (for example in the European Economic Area, the UK and Switzerland), a consent message provided through Google&rsquo;s certified consent tools may be shown, and personalised advertising will only be used in line with your choice.</p>
<h2>Analytics</h2>
<p>We use Google Analytics and Google Tag Manager to understand how visitors use the site &mdash; for example which articles are read and how people arrive. These tools use cookies and similar technologies to collect usage data on Google&rsquo;s behalf. We use the reports in aggregate and do not try to identify individual visitors. You can prevent Google Analytics from using your data with the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Google Analytics opt-out browser add-on</a>, or by blocking cookies in your browser settings.</p>
<h2>How to control cookies</h2>
<p>Most browsers let you block or delete cookies in their settings. Blocking cookies will not stop you reading the site, although ads may be less relevant.</p>
<h2>Legal bases and your rights</h2>
<p>Where data protection laws such as the GDPR, UK GDPR or US state privacy laws (for example the California Consumer Privacy Act) apply, you may have rights to access, correct or delete personal information, to object to or restrict certain processing, and to opt out of the &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal information for targeted advertising. To make a request, email <a href="mailto:{EMAIL}">{EMAIL}</a>. You can also use the advertising opt-outs above at any time.</p>
<h2>Children</h2>
<p>This site is written for adults making purchasing decisions and is not directed at children under 13 (or under 16 in the EEA and UK). We do not knowingly collect personal information from children.</p>
<h2>Retention and security</h2>
<p>We keep emails only as long as needed to deal with your message and any follow-up. Analytics and advertising data are retained according to Google&rsquo;s settings and policies. No website can guarantee perfect security, so please never send sensitive information such as passwords or card numbers by email.</p>
<h2>Links to other sites</h2>
<p>Our articles link to government registers and other websites. We are not responsible for their privacy practices, so please read their policies.</p>
<h2>Changes to this policy</h2>
<p>We may update this policy from time to time. The &ldquo;last updated&rdquo; date at the top shows when it last changed.</p>
<h2>Contact</h2>
<p>Questions about privacy: <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
"""

TERMS = f"""<p class="tab">Legal</p>
<h1>Terms of use</h1>
<p class="byline">Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></p>
<p>By using {HOST} you agree to these terms. If you do not agree, please do not use the site.</p>
<h2>General information only</h2>
<p>Everything on {BRAND} is general consumer information, provided to help you research purchases and ask better questions. It is not legal, financial, tax, insurance or other professional advice, and it does not create any professional relationship. Laws and official procedures differ between countries and states and change over time. Before relying on anything you read here, check the current rules with the relevant official body or a qualified professional.</p>
<h2>No guarantees</h2>
<p>We work to keep our guides accurate and up to date, but we do not guarantee that the content is complete, current or free of errors. Following a checklist on this site reduces risk; it cannot eliminate it. You remain responsible for your own purchasing decisions.</p>
<h2>Third-party sites and advertising</h2>
<p>We link to external websites, including government registers and complaint databases, for your convenience. We do not control those sites and are not responsible for their content or availability. Advertisements on the site are served by third parties; an advert is not an endorsement by {BRAND}.</p>
<h2>Intellectual property</h2>
<p>The text, illustrations and design of this site belong to {BRAND} unless stated otherwise. You may share links to our pages and quote short extracts with attribution. Please do not republish whole articles or illustrations without written permission.</p>
<h2>Acceptable use</h2>
<p>Do not attempt to disrupt the site, access it by automated means that place an unreasonable load on it, or use it for any unlawful purpose.</p>
<h2>Limitation of liability</h2>
<p>To the fullest extent permitted by law, {BRAND} and Marketing Apes LLC are not liable for any loss or damage arising from your use of, or reliance on, the site. Nothing in these terms limits liability that cannot be limited by law.</p>
<h2>Changes</h2>
<p>We may update these terms. Continued use of the site after a change means you accept the updated terms.</p>
<h2>Contact</h2>
<p>Questions about these terms: <a href="mailto:{EMAIL}">{EMAIL}</a>. See also our <a href="/privacy/">privacy policy</a>.</p>
"""


def page404():
    return (head("Page not found", "The page you were looking for could not be found on Research Investigation.", "/404.html", noindex=True) + nav("") + """<main id="main"><div class="wrap page nf">
<p class="stamp">Case cold</p>
<h1>We searched everywhere. This page isn&rsquo;t here.</h1>
<p class="lede">The link may be old, or the page may have moved. The trail picks up again from one of these:</p>
<p class="hero-ctas"><a class="btn" href="/">Back to the home page</a> <a class="btn btn--ghost" href="/articles/">Browse all articles</a></p>
</div></main>
""" + FOOT)


def main():
    os.makedirs(os.path.join(OUT, "images"), exist_ok=True)
    write("images/hero.svg", svgs.hero())
    write("images/og.svg", svgs.og())
    write("images/logo.svg", svgs.logo())
    write("images/favicon.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><title>Research Investigation</title>' + svgs.magnifier(34, 34, 24, 40, inner=svgs.check(-11, 0, 0.8)) + '</svg>\n')
    for a in ARTICLES:
        write(f"images/{a['slug']}.svg", svgs.ARTICLE_SVGS[a["slug"]]())
        write(f"articles/{a['slug']}/index.html", article_page(a))
    write("index.html", home())
    write("articles/index.html", articles_index())
    write("about/index.html", simple("/about/", "About us", f"About {BRAND}: an independent library of plain-language guides to researching purchases, sellers, contractors and landlords before you pay.", "about", ABOUT))
    write("contact/index.html", simple("/contact/", "Contact", f"Contact the {BRAND} team by email for corrections, topic requests and questions, plus where to report a scam in the US and UK.", "contact", CONTACT))
    write("privacy/index.html", simple("/privacy/", "Privacy policy", f"How {BRAND} handles information, cookies, Google AdSense advertising and Google Analytics, and how to opt out of personalised ads.", "", PRIVACY))
    write("terms/index.html", simple("/terms/", "Terms of use", f"The terms for using {BRAND}: general consumer information only, no professional advice, third-party links and liability.", "", TERMS))
    write("404.html", page404())
    write("contact.html", f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact | {BRAND}</title>
<meta name="description" content="The {BRAND} contact page has moved to /contact/.">
<meta http-equiv="refresh" content="0;url=/contact/">
<link rel="canonical" href="https://{HOST}/contact/">
</head>
<body>
<p>The contact page has moved. <a href="/contact/">Continue to Contact {BRAND}</a>.</p>
</body>
</html>
""")
    write("robots.txt", f"User-agent: *\nAllow: /\nDisallow: /preview/\n\nUser-agent: Mediapartners-Google\nAllow: /\n\nSitemap: https://{HOST}/sitemap.xml\n")
    write("_redirects", "/preview/*  /  301\n/preview    /  301\n")
    write("ads.txt", "google.com, pub-5194583669093303, DIRECT, f08c47fec0942fa0\n")
    urls = ["/", "/articles/", "/about/", "/contact/", "/privacy/", "/terms/"] + [f"/articles/{a['slug']}/" for a in ARTICLES]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        sm += f"  <url><loc>https://{HOST}{u}</loc><lastmod>{UPDATED}</lastmod></url>\n"
    write("sitemap.xml", sm + "</urlset>\n")
    import shutil
    here = os.path.dirname(os.path.abspath(__file__))
    for f in ("site.css", "site.js"):
        os.makedirs(os.path.join(OUT, "assets"), exist_ok=True)
        shutil.copy(os.path.join(here, f), os.path.join(OUT, "assets", f))
    # word counts
    for a in ARTICLES:
        t = re.sub(r"<[^>]+>", " ", a["body"] + " ".join(q + " " + x for q, x in a["faq"]))
        print(a["slug"], len(re.findall(r"[A-Za-z0-9'’-]+", t)))


if __name__ == "__main__":
    main()
