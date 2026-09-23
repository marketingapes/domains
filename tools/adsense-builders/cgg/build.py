#!/usr/bin/env python3
"""Builds the Crazy Golf Game AdSense content site into /home/user/domains/cgg."""
import html, os, re, sys, pathlib
sys.path.insert(0, os.path.dirname(__file__))
import svgs

SRC = pathlib.Path(__file__).parent
OUT = pathlib.Path("/home/user/domains/cgg")
HOST = "https://crazygolfgame.com"
BRAND = "Crazy Golf Game"
EMAIL = "info@crazygolfgame.com"
UPDATED = "2026-09-23"
UPDATED_H = "23 September 2026"

GTM_HEAD = """<script>window.dataLayer=window.dataLayer||[];</script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-K8TXN9');</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-6W2RXNMMXR"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","G-6W2RXNMMXR");</script>"""
GTM_BODY = '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K8TXN9" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>'


def esc(s):
    return html.escape(s, quote=True)


def head(title, desc, path, og_image="og.svg", robots=None, extra=""):
    full = title if title.endswith(BRAND) else f"{title} | {BRAND}"
    r = f'\n<meta name="robots" content="{robots}">' if robots else ""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(full)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{HOST}{path}">{r}
<meta name="google-adsense-account" content="ca-pub-5194583669093303">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5194583669093303" crossorigin="anonymous"></script>
{GTM_HEAD}
<meta property="og:type" content="{'article' if path.startswith('/articles/') and path != '/articles/' else 'website'}">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{HOST}{path}">
<meta property="og:image" content="{HOST}/images/{og_image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0e3b2c">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:ital,wght@0,400;0,600;0,800;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">{extra}
</head>
"""


def nav(active=""):
    def a(href, label, key):
        cur = ' aria-current="page"' if key == active else ""
        return f'<a href="{href}"{cur}>{label}</a>'
    return f"""<body>
{GTM_BODY}
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="logo" href="/" aria-label="{BRAND} home"><img src="/images/logo.svg" alt="{BRAND}" width="260" height="40"></a>
    <nav aria-label="Main">
      {a('/articles/', 'Articles', 'articles')}
      {a('/about/', 'About', 'about')}
      {a('/contact/', 'Contact', 'contact')}
    </nav>
  </div>
</header>
<main id="main">
"""


FOOT = f"""</main>
<footer class="site-footer">
  <div class="wrap foot">
    <div>
      <img src="/images/logo.svg" alt="" width="234" height="36" class="foot-logo">
      <p>Mini golf ideas, party games, backyard builds and putting fun for casual golfers. An independent publication, not a golf venue.</p>
    </div>
    <nav aria-label="Footer">
      <a href="/articles/">Articles</a>
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
      <a href="/privacy/">Privacy</a>
      <a href="/terms/">Terms</a>
    </nav>
  </div>
  <p class="wrap copy">&copy;2026 {BRAND}. All rights reserved.</p>
</footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
"""


# ---------------------------------------------------------------- articles
def parse(fp):
    raw = fp.read_text()
    meta_s, rest = raw.split("\n---\n", 1)
    body, faq_s = rest.split("---FAQ---", 1)
    meta = {}
    for line in meta_s.strip().splitlines():
        k, v = line.split(":", 1)
        meta[k.strip()] = v.strip()
    meta["slug"] = fp.stem
    meta["body"] = body.strip()
    meta["faq"] = [tuple(l.split("|", 1)) for l in faq_s.strip().splitlines() if "|" in l]
    meta["related"] = [s.strip() for s in meta["related"].split(",")]
    return meta


ORDER = ["backyard-mini-golf-course", "mini-golf-party-games", "mini-golf-putting-tips", "diy-mini-golf-obstacles",
         "indoor-mini-golf-course", "mini-golf-with-kids", "beginner-trick-shots", "mini-golf-date-night",
         "designing-mini-golf-holes", "putting-practice-games", "mini-golf-rules-and-etiquette",
         "mini-golf-tournament-at-home", "casual-golfer-gear-guide"]


def card(a, h="h3"):
    return f"""<a class="card" href="/articles/{a['slug']}/">
  <span class="card-img"><img src="/images/{a['slug']}.svg" alt="{esc(a['alt'])}" loading="lazy" width="1200" height="675"></span>
  <span class="card-body"><span class="tag">{esc(a['tag'])}</span><{h}>{esc(a['title'])}</{h}><span class="teaser">{esc(a['card'])}</span></span>
</a>"""


def article_page(a, by_slug):
    faq = "\n".join(f'<details><summary>{esc(q)}</summary><p>{esc(ans)}</p></details>' for q, ans in a["faq"])
    rel = "\n".join(card(by_slug[s]) for s in a["related"])
    words = len(re.findall(r"[A-Za-z0-9'’-]+", re.sub(r"<[^>]+>", " ", a["body"])))
    mins = max(3, round(words / 220))
    import json
    ld = json.dumps({"@context": "https://schema.org", "@type": "Article", "headline": a["title"], "description": a["desc"],
                     "image": f"{HOST}/images/{a['slug']}.svg", "dateModified": UPDATED, "datePublished": UPDATED,
                     "author": {"@type": "Organization", "name": f"The {BRAND} team"},
                     "publisher": {"@type": "Organization", "name": BRAND}, "mainEntityOfPage": f"{HOST}/articles/{a['slug']}/"})
    return head(a["title"], a["desc"], f"/articles/{a['slug']}/", f"{a['slug']}.svg",
                extra=f'\n<script type="application/ld+json">{ld}</script>') + nav("articles") + f"""
<article class="article">
  <div class="wrap narrow">
    <p class="crumbs"><a href="/">Home</a> / <a href="/articles/">Articles</a> / <span>{esc(a['tag'])}</span></p>
    <h1>{esc(a['title'])}</h1>
    <p class="byline">By the {BRAND} team &middot; Last updated <time datetime="{UPDATED}">{UPDATED_H}</time> &middot; {mins} min read</p>
  </div>
  <figure class="hero-fig wrap">
    <img src="/images/{a['slug']}.svg" alt="{esc(a['alt'])}" width="1200" height="675">
  </figure>
  <div class="wrap narrow prose">
{a['body']}
    <section class="faq" aria-labelledby="faq-h">
      <h2 id="faq-h">Frequently asked questions</h2>
{faq}
    </section>
    <p class="note">Play safe: swing low near people, pets and windows, and follow any posted course rules.</p>
  </div>
  <section class="related wrap" aria-labelledby="rel-h">
    <h2 id="rel-h">Related articles</h2>
    <div class="grid">
{rel}
    </div>
  </section>
</article>
""" + FOOT


# ---------------------------------------------------------------- static pages
def home(arts):
    featured = "\n".join(card(a) for a in arts[:6])
    return head(f"{BRAND}: Mini Golf Ideas, Party Games and Backyard Courses",
                "Fun guides for mini golf and casual golf: backyard and living-room courses, DIY obstacles, party games, trick shots, putting practice and family tips.",
                "/") + nav() + f"""
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="kicker">Mini golf &middot; fun golf &middot; zero dress code</p>
      <h1>Golf, but make it <span class="squiggle">crazy</span>.</h1>
      <p class="lead">Build a windmill from a cereal box, turn the hallway into a par four, and settle family arguments with a putt-off. Crazy Golf Game is a free collection of guides for people who love the silly side of golf.</p>
      <p class="cta-row"><a class="btn" href="/articles/">Browse all guides</a> <a class="btn btn-ghost" href="#hole-generator">Spin a crazy hole</a></p>
    </div>
    <div class="hero-art"><img src="/images/hero.svg" alt="A colourful crazy golf course with a volcano, a loop-the-loop, a pink windmill, flamingos and a smiling golf ball rolling toward the 18th flag" width="1600" height="900"></div>
  </div>
</section>

<section class="wrap intro-strip">
  <div class="pill-card"><strong>Build it</strong><span>Backyard and indoor courses from stuff you already own.</span></div>
  <div class="pill-card"><strong>Play it</strong><span>Rules, putting tips and games that keep everyone laughing.</span></div>
  <div class="pill-card"><strong>Share it</strong><span>Date nights, kids' parties and tournaments with trophies.</span></div>
</section>

<section class="wrap section" aria-labelledby="feat-h">
  <div class="section-head"><h2 id="feat-h">Fresh off the green</h2><a href="/articles/">All {len(arts)} articles &rarr;</a></div>
  <div class="grid">
{featured}
  </div>
</section>

<section class="wrap section generator" id="hole-generator" aria-labelledby="gen-h">
  <div class="gen-card">
    <div class="gen-copy">
      <h2 id="gen-h">The Crazy Hole Generator</h2>
      <p>Stuck for ideas? Pick where you are playing and spin. You will get a random obstacle, a silly twist and a suggested par. Build it, play it, then spin again for the next hole.</p>
      <label for="gen-where">Where are you playing?</label>
      <select id="gen-where">
        <option value="yard">Backyard or park</option>
        <option value="home">Living room or hallway</option>
        <option value="course">At a mini golf course (twists only)</option>
      </select>
      <button type="button" class="btn" id="gen-spin">Spin a hole</button>
    </div>
    <div class="gen-out" aria-live="polite">
      <div class="gen-ball" aria-hidden="true"></div>
      <p class="gen-num">Hole <span id="gen-hole">1</span></p>
      <dl>
        <dt>Obstacle</dt><dd id="gen-obstacle">Press spin to build your first hole.</dd>
        <dt>Twist</dt><dd id="gen-twist">&mdash;</dd>
        <dt>Par</dt><dd id="gen-par">&mdash;</dd>
      </dl>
    </div>
  </div>
</section>

<section class="wrap section two-col">
  <div class="prose">
    <h2>Why crazy golf is the best kind of golf</h2>
    <p>Regular golf asks for patience, a lot of land and a fair amount of money. Crazy golf, also called mini golf or adventure golf, asks for a putter, a ball and a sense of humour. It is one of the few games where a grandparent, a six-year-old and a competitive teenager can play on genuinely equal terms, because a lucky bounce off a windmill blade is worth just as much as years of practice.</p>
    <p>That is what this site is about. We write practical, down-to-earth guides to the fun side of golf: how to build a <a href="/articles/backyard-mini-golf-course/">backyard course</a> without wrecking the lawn, how to make <a href="/articles/diy-mini-golf-obstacles/">DIY obstacles</a> from the recycling bin, which <a href="/articles/mini-golf-party-games/">party games</a> level the field, and how to <a href="/articles/mini-golf-putting-tips/">read a bank shot</a> like the smug uncle who always wins.</p>
    <p>We are an independent publication, not a golf venue, so we do not take bookings. When you are ready to play at a real course, check its own website for opening times and house rules.</p>
  </div>
  <aside class="side-box">
    <h3>Start here</h3>
    <ul>
      <li><a href="/articles/indoor-mini-golf-course/">Rainy day? Build a living-room course</a></li>
      <li><a href="/articles/mini-golf-with-kids/">Playing with little ones</a></li>
      <li><a href="/articles/mini-golf-tournament-at-home/">Host a tournament with trophies</a></li>
      <li><a href="/articles/putting-practice-games/">Putting games that feel like play</a></li>
      <li><a href="/practice-session-planner/">Plan a focused practice session</a></li>
    </ul>
    <p class="small"><strong>#ad</strong> We also keep one clearly labelled partner offer for outdoor days on our <a href="/offers/" rel="sponsored">offers page</a>. If you buy through it we may earn a commission.</p>
  </aside>
</section>
""" + FOOT


def articles_index(arts):
    cards = "\n".join(card(a, "h2") for a in arts)
    return head("All Articles", "Every Crazy Golf Game guide in one place: backyard and indoor course builds, obstacles, party games, putting tips, trick shots, kids and tournaments.",
                "/articles/") + nav("articles") + f"""
<section class="wrap page-head">
  <h1>All articles</h1>
  <p class="lead">{len(arts)} guides to mini golf, backyard courses and fun golf games. Pick a topic, grab a putter, and go.</p>
</section>
<section class="wrap section">
  <div class="grid">
{cards}
  </div>
</section>
""" + FOOT


def simple(title, desc, path, active, inner, h1=None):
    return head(title, desc, path) + nav(active) + f"""
<section class="wrap narrow page-head">
  <h1>{h1 or esc(title)}</h1>
</section>
<div class="wrap narrow prose page-body">
{inner}
</div>
""" + FOOT


ABOUT = f"""<p class="lead">Crazy Golf Game is a small online magazine about the fun side of golf: mini golf, adventure golf, backyard courses, putting games and trick shots.</p>
<img class="inline-art" src="/images/mini-golf-party-games.svg" alt="Friends celebrating at a mini golf party with balloons and challenge cards" width="1200" height="675">
<h2>What we cover</h2>
<p>We write practical guides for people who play golf for laughs rather than handicaps. That means building courses at home, inventing obstacles, running parties and tournaments, helping kids enjoy their first round, and a few techniques that will quietly make you the person to beat on a family outing. Every article is written to be useful on its own, with steps, checklists and FAQs you can act on the same afternoon.</p>
<h2>What we are not</h2>
<p>We are not a golf course, mini golf venue or booking service. We do not sell tee times, run a physical course or take reservations. If you want to play at a commercial course, visit that course's own website for prices, opening hours and house rules. We also do not rank or review specific products; when we talk about gear, we explain categories and what to look for.</p>
<h2>How we write</h2>
<ul class="checklist">
<li>Articles are written by the {BRAND} team and reviewed for clarity and safety before publishing.</li>
<li>We stick to general, widely known information about rules and technique, and we say so when something varies by course.</li>
<li>We do not invent statistics, reviews, testimonials or expert credentials.</li>
<li>We update articles when we find a clearer way to explain something; each one shows its last-updated date.</li>
<li>Safety comes first, especially for indoor play and anything involving children.</li>
</ul>
<h2>How the site is funded</h2>
<p>{BRAND} is free to read. It is supported by advertising, including ads served by Google AdSense, and occasionally by a clearly labelled partner offer on our <a href="/offers/">offers page</a>. Advertising never decides what we write about. You can read more in our <a href="/privacy/">privacy policy</a> and <a href="/terms/">terms of use</a>.</p>
<h2>Who runs it</h2>
<p>{BRAND} is published by Marketing Apes LLC. Got an idea for a hole, a correction or a game we should write about? We would love to hear from you on our <a href="/contact/">contact page</a>.</p>
"""

CONTACT = f"""<p class="lead">Questions, corrections, or a brilliant home-made obstacle you want to show off? Email us.</p>
<div class="contact-card">
  <p class="small">Email</p>
  <p class="email"><a href="mailto:{EMAIL}">{EMAIL}</a></p>
  <p class="small">We read every message and aim to reply within a few working days.</p>
</div>
<h2>Good things to write to us about</h2>
<ul class="checklist">
<li><strong>Corrections:</strong> spotted something inaccurate or unclear in an article? Tell us which page and what needs fixing.</li>
<li><strong>Ideas:</strong> party games, obstacles or course-building tricks you would like us to cover.</li>
<li><strong>Your builds:</strong> describe the backyard or living-room hole you made; we love hearing about them.</li>
<li><strong>Advertising and partnerships:</strong> please include your company name and what you have in mind.</li>
<li><strong>Privacy requests:</strong> questions about data or cookies, as described in our <a href="/privacy/">privacy policy</a>.</li>
</ul>
<h2>Please note</h2>
<p>{BRAND} is an independent website, not a golf venue. We cannot take bookings, sell tee times or answer questions about a specific course's prices or opening hours. Please contact that course directly.</p>
<p>We do not offer professional coaching, and we cannot give advice about injuries or medical conditions. If golf or any physical activity causes you pain, please speak to a qualified professional.</p>
"""

PRIVACY = f"""<p class="small">Last updated: <time datetime="{UPDATED}">{UPDATED_H}</time></p>
<p>This privacy policy explains what information is collected when you visit crazygolfgame.com ("{BRAND}", "we", "us"), how it is used, and the choices you have. {BRAND} is published by Marketing Apes LLC.</p>
<h2>Information we collect</h2>
<p>We do not ask you to create an account, and there are no forms on this site that collect personal information. If you email us, we receive your email address and whatever you choose to include in your message, and we use it only to reply to you.</p>
<p>Like most websites, our hosting provider and the third-party services described below automatically receive technical information when you visit, such as your IP address, browser type, device type, pages viewed, referring page and the date and time of your visit.</p>
<h2>Cookies</h2>
<p>Cookies are small text files stored on your device by your browser. We and our partners use cookies and similar technologies (such as local storage and pixels) to keep the site working, understand how it is used, and show advertising. You can block or delete cookies in your browser settings; the site will still work, although some ads may be less relevant.</p>
<h2>Advertising and Google AdSense</h2>
<p>We use Google AdSense to show ads on this site. In line with Google's requirements:</p>
<ul>
<li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</li>
<li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visits to this site and/or other sites on the Internet.</li>
<li>You may opt out of personalised advertising by visiting Google's <a href="https://adssettings.google.com" rel="noopener">Ads Settings</a> at https://adssettings.google.com. You can also opt out of some third-party vendors' use of cookies for personalised advertising by visiting <a href="https://www.aboutads.info" rel="noopener">www.aboutads.info</a>.</li>
<li>Learn more about <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">how Google uses information from sites or apps that use its services</a>.</li>
</ul>
<p>If you are in a region where consent is required before personalised ads are shown (such as the European Economic Area or the United Kingdom), you may be shown a consent message provided through Google's certified consent tools, and you can change your choice at any time.</p>
<h2>Analytics</h2>
<p>We use Google Analytics and Google Tag Manager to understand how visitors use the site, for example which articles are popular and how people find us. These tools use cookies and collect information such as pages visited, time on page, approximate location derived from IP address, and device and browser details. This information is aggregated and helps us improve our content. You can learn more at <a href="https://policies.google.com/privacy" rel="noopener">Google's privacy policy</a> and can install the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Google Analytics opt-out browser add-on</a>.</p>
<h2>Affiliate links</h2>
<p>Our <a href="/offers/">offers page</a> contains a clearly labelled affiliate link. If you click it, the partner may use cookies to record that you came from us so that we can earn a commission if you make a purchase.</p>
<h2>How we use information</h2>
<ul>
<li>To operate, secure and improve the website.</li>
<li>To understand which content is useful.</li>
<li>To show advertising that helps keep the site free.</li>
<li>To reply to messages you send us.</li>
</ul>
<p>We do not sell personal information that we collect directly, and we keep emails only as long as needed to respond and keep reasonable records.</p>
<h2>Your choices and rights</h2>
<p>Depending on where you live, you may have rights to access, correct or delete personal information, or to object to certain processing, including under laws such as the GDPR and California privacy laws. To make a request, email us at <a href="mailto:{EMAIL}">{EMAIL}</a>. You can also control cookies through your browser and the opt-out links above.</p>
<h2>Children</h2>
<p>This site is written for a general audience, including families. It is not directed at children under 13, and we do not knowingly collect personal information from them. If you believe a child has sent us personal information, contact us and we will delete it.</p>
<h2>Links to other websites</h2>
<p>We sometimes link to other websites. Their privacy practices are their own, so please review their policies.</p>
<h2>Changes to this policy</h2>
<p>We may update this policy from time to time. The date at the top shows when it was last changed.</p>
<h2>Contact</h2>
<p>Questions about this policy? Email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
"""

TERMS = f"""<p class="small">Last updated: <time datetime="{UPDATED}">{UPDATED_H}</time></p>
<p>These terms apply to your use of crazygolfgame.com ("{BRAND}"), published by Marketing Apes LLC. By using the site, you agree to them.</p>
<h2>Content is for general information and fun</h2>
<p>Our articles share general ideas for recreational mini golf, backyard courses, games and practice. They are not professional coaching, safety certification or medical advice. Rules at commercial courses vary, and posted course rules always take priority over anything you read here.</p>
<h2>Play safely</h2>
<p>You are responsible for how you use the ideas on this site. Supervise children, keep swings low indoors and around people, pets and windows, use soft balls where appropriate, and check that any obstacle you build is stable. Get permission before building on property you do not own. We are not responsible for damage or injury arising from projects or games described on the site.</p>
<h2>We are not a venue</h2>
<p>{BRAND} does not operate a golf course and does not take bookings or payments for play.</p>
<h2>Intellectual property</h2>
<p>The text and illustrations on this site are owned by {BRAND} unless otherwise noted. You may share links and short quotations with attribution. Please do not republish whole articles or illustrations without permission. You are welcome to print a page for personal, non-commercial use, such as a scorecard idea for a family party.</p>
<h2>Advertising and affiliate links</h2>
<p>The site shows ads, including ads from Google AdSense, and may contain clearly labelled affiliate links. We are not responsible for the products, services or content of advertisers or linked websites. See our <a href="/privacy/">privacy policy</a> for how advertising cookies work.</p>
<h2>No warranty</h2>
<p>We work to keep content accurate and up to date, but the site is provided "as is" without warranties of any kind. To the fullest extent allowed by law, we are not liable for any loss arising from use of the site.</p>
<h2>Changes</h2>
<p>We may update these terms. The date above shows the latest version. Continued use of the site means you accept the updated terms.</p>
<h2>Contact</h2>
<p>Questions about these terms? Email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
"""

NOT_FOUND = head("Page not found", "This page could not be found on Crazy Golf Game. Try our articles on mini golf, backyard courses and party games.", "/404.html", robots="noindex") + nav() + """
<section class="wrap narrow page-head center">
  <img class="lost-ball" src="/images/mini-golf-putting-tips.svg" alt="A golf ball bouncing off a wall toward a cup" width="1200" height="675">
  <h1>Lost ball!</h1>
  <p class="lead">That page rolled into the water hazard. Take a one-stroke penalty and try again from the tee.</p>
  <p class="cta-row"><a class="btn" href="/">Back to the first tee</a> <a class="btn btn-ghost" href="/articles/">Browse articles</a></p>
</section>
""" + FOOT

CONTACT_HTML = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact | {BRAND}</title>
<meta name="description" content="The Crazy Golf Game contact page has moved. Continue to /contact/ to email the team.">
<link rel="canonical" href="{HOST}/contact/">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0;url=/contact/">
</head>
<body>
<p>Our contact page has moved. <a href="/contact/">Continue to the contact page</a>.</p>
</body>
</html>
"""

ROBOTS = """User-agent: *
Allow: /
Allow: /ads.txt
Allow: /offers/
Allow: /practice-session-planner/
Disallow: /preview/

User-agent: Mediapartners-Google
Allow: /

Sitemap: https://crazygolfgame.com/sitemap.xml
"""

REDIRECTS = """/preview/*  /  301
/preview    /  301
"""


def main():
    arts_all = {fp.stem: parse(fp) for fp in (SRC / "articles").glob("*.txt")}
    arts = [arts_all[s] for s in ORDER]
    assert len(arts) == len(arts_all)
    (OUT / "images").mkdir(exist_ok=True)
    (OUT / "assets").mkdir(exist_ok=True)
    for s, fn in svgs.ARTICLE_SVGS.items():
        (OUT / "images" / f"{s}.svg").write_text(fn())
    (OUT / "images/hero.svg").write_text(svgs.hero())
    (OUT / "images/og.svg").write_text(svgs.og())
    (OUT / "images/logo.svg").write_text(svgs.logo())
    for name in ("site.css", "site.js"):
        (OUT / "assets" / name).write_text((SRC / name).read_text())

    def put(rel, content):
        p = OUT / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content)

    put("index.html", home(arts))
    put("articles/index.html", articles_index(arts))
    for a in arts:
        put(f"articles/{a['slug']}/index.html", article_page(a, arts_all))
    put("about/index.html", simple("About Crazy Golf Game", "About Crazy Golf Game: an independent magazine about mini golf, backyard courses, party games and putting fun. Who we are, how we write and how the site is funded.", "/about/", "about", ABOUT, "About Crazy Golf Game"))
    put("contact/index.html", simple("Contact", "Contact the Crazy Golf Game team by email with corrections, article ideas, backyard builds, partnership or privacy questions.", "/contact/", "contact", CONTACT, "Say hello"))
    put("privacy/index.html", simple("Privacy Policy", "How Crazy Golf Game uses cookies, Google AdSense advertising and Google Analytics, and how to opt out of personalised ads.", "/privacy/", "", PRIVACY))
    put("terms/index.html", simple("Terms of Use", "The terms of use for Crazy Golf Game, including safety notes for home-made courses, intellectual property and advertising.", "/terms/", "", TERMS))
    put("404.html", NOT_FOUND)
    put("contact.html", CONTACT_HTML)
    put("robots.txt", ROBOTS)
    put("_redirects", REDIRECTS)
    put("ads.txt", "google.com, pub-5194583669093303, DIRECT, f08c47fec0942fa0\n")
    urls = ["/", "/articles/"] + [f"/articles/{a['slug']}/" for a in arts] + ["/about/", "/contact/", "/privacy/", "/terms/", "/practice-session-planner/", "/offers/"]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sm += "".join(f"  <url><loc>{HOST}{u}</loc><lastmod>{UPDATED}</lastmod></url>\n" for u in urls)
    put("sitemap.xml", sm + "</urlset>\n")
    for a in arts:
        t = re.sub(r"<[^>]+>", " ", a["body"] + " ".join(q + " " + x for q, x in a["faq"]))
        print(a["slug"], len(re.findall(r"[A-Za-z0-9'’-]+", t)))


if __name__ == "__main__":
    main()
