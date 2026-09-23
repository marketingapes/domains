import os, sys, json, html
sys.path.insert(0, os.path.dirname(__file__))
import svgs
from articles_a import ARTICLES as A1
from articles_b import ARTICLES as A2
from articles_c import ARTICLES as A3

OUT = "/home/user/domains/toss"
HOST = "https://tosssports.com"
BRAND = "Toss Sports"
UPDATED = "2026-09-23"
UPDATED_H = "September 23, 2026"
EMAIL = "hello@tosssports.com"
ARTICLES = A1 + A2 + A3
BY = {a["slug"]: a for a in ARTICLES}

GTM_HEAD = """<script>window.dataLayer=window.dataLayer||[];</script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-WKC7VWDX');</script>"""
GTM_BODY = '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WKC7VWDX" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>'


def w(rel, content):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(content)


def esc(s):
    return html.escape(s, quote=True)


def head(title, desc, path, og_img="/images/og.svg", og_type="website", extra=""):
    url = HOST + path
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)} | {BRAND}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta name="google-adsense-account" content="ca-pub-5194583669093303">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5194583669093303" crossorigin="anonymous"></script>
{GTM_HEAD}
<meta property="og:site_name" content="{BRAND}">
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{HOST}{og_img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#13263a">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=1">
{extra}</head>
<body>
{GTM_BODY}
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap head-row">
    <a class="logo" href="/" aria-label="{BRAND} home"><img src="/images/logo.svg" alt="{BRAND}" width="190" height="40"></a>
    <nav aria-label="Main">
      <a href="/articles/">Articles</a>
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
    </nav>
  </div>
</header>
"""


def foot(script=False):
    js = '<script src="/assets/site.js?v=1" defer></script>\n' if script else ""
    return f"""<footer class="site-foot">
  <div class="wrap foot-row">
    <div>
      <img src="/images/logo.svg" alt="" width="150" height="32" class="foot-logo">
      <p>Plain-English rules, league tips and game-day know-how for grown-ups who still like to play.</p>
    </div>
    <nav aria-label="Footer">
      <a href="/articles/">Articles</a>
      <a href="/game-day-checklist/">Game-day checklist</a>
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
      <a href="/privacy/">Privacy</a>
      <a href="/terms/">Terms</a>
    </nav>
  </div>
  <p class="wrap copy">&copy;2026 {BRAND}. Published by Marketing Apes LLC.</p>
</footer>
{js}</body>
</html>
"""


def card(a, h="h3"):
    return f"""<a class="card" href="/articles/{a['slug']}/">
  <span class="card-img"><img src="/images/{a['slug']}.svg" alt="{esc(a['alt'])}" width="1200" height="675" loading="lazy"></span>
  <span class="card-body"><span class="tag tag-{a['cat']}">{a['cat_label']}</span><{h}>{esc(a['title'])}</{h}><span class="card-dek">{esc(a['dek'])}</span></span>
</a>"""


# ------------------------------------------------------------------ home
def home():
    feat = [BY[s] for s in ["how-to-find-an-adult-rec-league", "cornhole-rules-and-scoring", "pickleball-rules-for-beginners",
                            "joining-a-league-as-a-free-agent", "how-bowling-scoring-works", "how-to-start-a-rec-league"]]
    sports = [("Cornhole", "cornhole-rules-and-scoring", "cornhole"), ("Kickball", "kickball-rules-for-adult-leagues", "kickball"),
              ("Pickleball", "pickleball-rules-for-beginners", "pickleball"), ("Bowling", "how-bowling-scoring-works", "bowling"),
              ("Dodgeball", "dodgeball-rules-explained", "dodgeball"), ("Flag football", "flag-football-rules-for-beginners", "flag")]
    chips = "".join(f'<a class="chip chip-{c}" href="/articles/{s}/">{n}</a>' for n, s, c in sports)
    body = head("Adult rec sports rules, leagues and team names",
                "Toss Sports explains adult rec league sports in plain English: cornhole, kickball, pickleball, bowling, dodgeball and flag football rules, plus how to find or start a league.",
                "/")
    body += f"""<main id="main">
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="kicker">Adult rec &amp; social sports</p>
      <h1>Play again. <span class="hl">Make friends.</span> Know the rules.</h1>
      <p class="lede">Toss Sports is a field guide for grown-ups who want a weeknight game: how to find a league, how the rules actually work, what to pack, and what to call your team.</p>
      <div class="hero-cta"><a class="btn" href="/articles/">Browse the guides</a><a class="btn btn-ghost" href="#namegen">Name my team</a></div>
    </div>
    <figure class="hero-art"><img src="/images/hero.svg" alt="Adults playing cornhole, pickleball, kickball and bowling in a sunny park under bunting" width="1600" height="900"></figure>
  </div>
</section>

<section class="wrap sports-row" aria-labelledby="sports-h">
  <h2 id="sports-h" class="section-title">Pick a sport, learn the rules</h2>
  <div class="chips">{chips}</div>
</section>

<section class="wrap" aria-labelledby="feat-h">
  <div class="section-head"><h2 id="feat-h" class="section-title">Start here</h2><a class="more" href="/articles/">All articles &rarr;</a></div>
  <div class="grid">{''.join(card(a) for a in feat)}</div>
</section>

<section class="namegen-wrap" id="namegen" aria-labelledby="gen-h">
  <div class="wrap namegen">
    <div class="gen-intro">
      <p class="kicker">Tiny tool</p>
      <h2 id="gen-h">Team-name generator</h2>
      <p>Registration closes tonight and your team is still called &ldquo;Team 7&rdquo;? Pick a sport and a mood, then hit the button. Everything runs in your browser; nothing is sent anywhere. Tap a name to copy it.</p>
      <p class="small">Want to pick a name with more thought? Read <a href="/articles/how-to-pick-a-team-name/">how to pick a team name everyone likes</a>.</p>
    </div>
    <form class="gen-box" id="gen-form" onsubmit="return false">
      <label for="gen-sport">Sport</label>
      <select id="gen-sport">
        <option value="any">Any sport</option><option value="cornhole">Cornhole</option><option value="kickball">Kickball</option>
        <option value="pickleball">Pickleball</option><option value="bowling">Bowling</option><option value="dodgeball">Dodgeball</option>
        <option value="flag">Flag football</option><option value="softball">Softball</option><option value="volleyball">Volleyball</option>
      </select>
      <fieldset>
        <legend>Mood</legend>
        <label class="pill"><input type="radio" name="vibe" value="pun" checked> Punny</label>
        <label class="pill"><input type="radio" name="vibe" value="fierce"> Fierce-ish</label>
        <label class="pill"><input type="radio" name="vibe" value="wholesome"> Wholesome</label>
      </fieldset>
      <label for="gen-word">Optional: a word to work in (office, street, pet&hellip;)</label>
      <input id="gen-word" type="text" maxlength="18" placeholder="e.g. Maple">
      <button class="btn" type="button" id="gen-go">Generate names</button>
      <ul class="gen-out" id="gen-out" aria-live="polite"></ul>
      <p class="gen-note" id="gen-note" role="status"></p>
    </form>
  </div>
</section>

<section class="wrap about-strip" aria-labelledby="why-h">
  <div>
    <h2 id="why-h" class="section-title">Why adult rec sports are worth the Tuesday night</h2>
    <p>Most of us stopped playing organised sport when school or college ended, not because we stopped enjoying it but because the structure disappeared. Nobody books the field, nobody makes the schedule, and nobody texts you on the day. A rec league puts that structure back. You get a regular reason to leave the house, a group of people who expect to see you, and a low-stakes way to be bad at something new.</p>
    <p>The sports on this site were picked because they are the ones adults actually join in large numbers: bar-friendly games like cornhole and bowling, nostalgic playground games like kickball and dodgeball, and fast-growing court games like pickleball. We explain the common rules, point out where local leagues tend to differ, and share the practical stuff nobody tells you, like what a free-agent sign-up actually means and what to put in your bag.</p>
  </div>
  <div class="tips">
    <h3>Three things we believe</h3>
    <ul class="ticks">
      <li><strong>Showing up beats being good.</strong> Most social leagues care more about reliable players than talented ones.</li>
      <li><strong>Your league's rulebook wins.</strong> Our explainers cover common rules; always check the local version before game day.</li>
      <li><strong>Everyone was new once.</strong> Ask questions, learn the lingo, and buy the next round if you want to.</li>
    </ul>
    <p class="small">Organising game day for your team? Our printable <a href="/game-day-checklist/">game-day checklist</a> keeps the logistics in one place.</p>
  </div>
</section>
</main>
"""
    body += foot(script=True)
    w("index.html", body)


# ------------------------------------------------------------------ articles
def article(a):
    rel = [BY[s] for s in a["related"]]
    faq = "".join(f'<details><summary>{esc(q)}</summary><p>{ans}</p></details>' for q, ans in a["faq"])
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": a["title"], "description": a["desc"],
          "image": f"{HOST}/images/{a['slug']}.svg", "datePublished": UPDATED, "dateModified": UPDATED,
          "author": {"@type": "Organization", "name": "The Toss Sports team"},
          "publisher": {"@type": "Organization", "name": BRAND, "logo": {"@type": "ImageObject", "url": f"{HOST}/images/logo.svg"}},
          "mainEntityOfPage": f"{HOST}/articles/{a['slug']}/"}
    faqld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": html.unescape(__import__('re').sub('<[^>]+>', '', ans))}} for q, ans in a["faq"]]}
    extra = f'<script type="application/ld+json">{json.dumps(ld)}</script>\n<script type="application/ld+json">{json.dumps(faqld)}</script>\n'
    words = len(__import__('re').findall(r"[A-Za-z0-9'’-]+", __import__('re').sub('<[^>]+>', ' ', a["body"])))
    mins = max(4, round(words / 220))
    note = ""
    if a.get("health"):
        note = '<p class="note"><strong>Heads up:</strong> this is general, educational information for recreational players, not medical or professional advice. If you have an injury, a health condition, or pain that does not settle, talk to a qualified health professional before playing.</p>'
    s = head(a["title"], a["desc"], f"/articles/{a['slug']}/", og_img=f"/images/{a['slug']}.svg", og_type="article", extra=extra)
    s += f"""<main id="main" class="art-main">
<article class="wrap article">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/articles/">Articles</a> <span aria-hidden="true">/</span> <span>{a['cat_label']}</span></nav>
  <header class="art-head">
    <span class="tag tag-{a['cat']}">{a['cat_label']}</span>
    <h1>{esc(a['title'])}</h1>
    <p class="lede">{esc(a['dek'])}</p>
    <p class="meta">By the Toss Sports team &middot; Last updated <time datetime="{UPDATED}">{UPDATED_H}</time> &middot; {mins} min read</p>
  </header>
  <figure class="art-hero"><img src="/images/{a['slug']}.svg" alt="{esc(a['alt'])}" width="1200" height="675"></figure>
  {note}
  <div class="prose">
{a['body']}
  <section class="faq" aria-labelledby="faq-h">
    <h2 id="faq-h">FAQ</h2>
    {faq}
  </section>
  </div>
</article>
<section class="wrap related" aria-labelledby="rel-h">
  <h2 id="rel-h" class="section-title">Related articles</h2>
  <div class="grid grid-3">{''.join(card(r) for r in rel)}</div>
</section>
</main>
"""
    s += foot()
    w(f"articles/{a['slug']}/index.html", s)
    return words


def articles_index():
    cats = []
    for a in ARTICLES:
        if (a["cat"], a["cat_label"]) not in cats:
            cats.append((a["cat"], a["cat_label"]))
    filt = '<button type="button" class="chip is-on" data-filter="all" aria-pressed="true">All</button>' + "".join(
        f'<button type="button" class="chip chip-f" data-filter="{c}" aria-pressed="false">{l}</button>' for c, l in cats)
    cards = "".join(f'<div class="card-wrap" data-cat="{a["cat"]}">{card(a, "h2")}</div>' for a in ARTICLES)
    s = head("All articles: rules, leagues, team names and game day",
             "Every Toss Sports guide in one place: rules explainers for cornhole, kickball, pickleball, bowling, dodgeball and flag football, plus league, captain and game-day advice.",
             "/articles/")
    s += f"""<main id="main">
<section class="wrap page-head">
  <p class="kicker">The playbook</p>
  <h1>All articles</h1>
  <p class="lede">Rules explainers, league how-tos and game-day advice, written for adults who play for fun. Filter by topic or scroll the lot. Each guide covers the common rules; your local league's rulebook always has the final say.</p>
  <div class="chips filters" role="group" aria-label="Filter articles by topic">{filt}</div>
</section>
<section class="wrap"><div class="grid" id="art-grid">{cards}</div></section>
</main>
"""
    s += foot(script=True)
    w("articles/index.html", s)


# ------------------------------------------------------------------ static pages
def page(path, title, desc, inner):
    s = head(title, desc, path)
    s += f'<main id="main"><div class="wrap page">{inner}</div></main>\n' + foot()
    w(path.strip("/") + "/index.html", s)


def about():
    page("/about/", "About Toss Sports",
         "Who writes Toss Sports, what we cover, how we research our rules explainers, and how to tell us when a league near you plays it differently.",
         f"""<p class="kicker">About us</p><h1>About Toss Sports</h1>
<div class="about-grid"><div class="prose">
<p class="lede">Toss Sports is a small editorial site about adult recreational and social sports: the leagues that run on weeknights in parks, gyms, bowling centres and bar patios, where the aim is a good game and a good hang afterwards.</p>
<h2>What we cover</h2>
<p>We write plain-English explainers for the games adults most often sign up for: cornhole, kickball, pickleball, bowling, dodgeball and flag football. Alongside the rules, we cover the parts of rec sports that nobody hands you a manual for, such as finding a league when you have just moved to a new city, signing up alone as a free agent, captaining a team without becoming its unpaid admin, starting a league from scratch, and packing a sensible game-day bag.</p>
<h2>How we write</h2>
<p>Articles are written and edited by the Toss Sports team. For rules content we start from the published rulebooks of the major governing and league bodies for each sport, then describe the version most social leagues play and flag where house rules commonly differ. We do not run product tests, we do not rank gear, and we do not invent statistics or quotes. Where a detail varies from league to league, we say so and point you to your own league's rulebook, because that is the document your referee or organiser will actually use.</p>
<p>Every article shows the date it was last updated. Rules change (pickleball in particular updates its official rulebook every year), so if something looks out of date, please tell us.</p>
<h2>Who is behind the site</h2>
<p>Toss Sports is published by Marketing Apes LLC, a small US digital publishing and marketing company. The site is supported by advertising, which is how we keep the articles free to read. Advertising never decides what we write about or what we say.</p>
<h2>Get in touch</h2>
<p>Spotted a mistake, play a variant we should mention, or want to suggest a sport? Email us at <a href="mailto:{EMAIL}">{EMAIL}</a> or see the <a href="/contact/">contact page</a>.</p>
</div>
<figure class="side-art"><img src="/images/how-to-be-a-good-rec-league-captain.svg" alt="A rec league team cheering together around their captain" width="1200" height="675"></figure></div>""")


def contact():
    page("/contact/", "Contact Toss Sports",
         "How to reach the Toss Sports team by email: corrections, rule variants from your league, topic suggestions, advertising and privacy questions.",
         f"""<p class="kicker">Say hello</p><h1>Contact us</h1>
<div class="prose">
<p class="lede">The best way to reach us is email: <a class="big-mail" href="mailto:{EMAIL}">{EMAIL}</a></p>
<h2>Good reasons to write</h2>
<ul class="ticks">
<li><strong>Corrections.</strong> If a rule, measurement or definition in one of our articles looks wrong, tell us which article and what you think it should say. A link to the rulebook you are using helps a lot.</li>
<li><strong>Your league's house rules.</strong> Local variants are the best part of rec sports. If your kickball league bans bunting or your cornhole night plays to 15, we would love to hear about it.</li>
<li><strong>Topic ideas.</strong> Want an explainer on a sport or situation we have not covered yet? Suggest it.</li>
<li><strong>Privacy requests.</strong> Questions about cookies or data can go to the same address; see our <a href="/privacy/">privacy policy</a>.</li>
<li><strong>Advertising and partnerships.</strong> Put &ldquo;Partnership&rdquo; in the subject line.</li>
</ul>
<h2>What we cannot help with</h2>
<p>We are an information site, not a league operator, so we cannot register you for a team, refund league fees, settle disputes between teams, or change a result. Please contact your league organiser directly for anything about a specific league, schedule or payment. We also cannot give medical advice about injuries.</p>
<p>We read every message and aim to reply within a few working days.</p>
</div>""")


def privacy():
    page("/privacy/", "Privacy policy",
         "How Toss Sports uses cookies, Google AdSense advertising and Google Analytics / Tag Manager, how to opt out of personalised ads, and how to contact us.",
         f"""<p class="kicker">Legal</p><h1>Privacy policy</h1>
<div class="prose">
<p class="meta">Last updated: <time datetime="{UPDATED}">{UPDATED_H}</time></p>
<p>This policy explains what information is collected when you visit tosssports.com (&ldquo;Toss Sports&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), which is published by Marketing Apes LLC. We have kept it as short and plain as we can.</p>
<h2>Information we collect</h2>
<p>We do not ask you to create an account and our articles have no sign-up forms. If you email us, we receive your email address and whatever you choose to include in your message, and we use it only to reply. Like most websites, our hosting provider automatically records basic technical data such as IP address, browser type and the pages requested, for security and to keep the site running.</p>
<p>The team-name generator on our home page runs entirely in your browser. The options you pick and the names it produces are not sent to us.</p>
<h2>Cookies and advertising</h2>
<p>We use Google AdSense to show advertising, which pays for the site. Cookies are small text files stored by your browser. In relation to advertising:</p>
<ul>
<li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website and other websites.</li>
<li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visits to this site and/or other sites on the Internet.</li>
<li>You may opt out of personalised advertising by visiting Google <a href="https://adssettings.google.com" rel="nofollow">Ads Settings</a>. You can also opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info" rel="nofollow">www.aboutads.info</a>.</li>
<li>If you opt out, you may still see ads, but they will not be personalised based on your browsing.</li>
</ul>
<p>For more detail, see <a href="https://policies.google.com/technologies/partner-sites" rel="nofollow">How Google uses information from sites or apps that use its services</a>. Where required by law (for example in the UK and European Economic Area), you will be asked for consent before personalised advertising cookies are used, and you can change your choice at any time.</p>
<h2>Analytics</h2>
<p>We use Google Tag Manager and Google Analytics to understand how the site is used, for example which articles are read and roughly where visitors come from. These tools use cookies and similar technologies and collect information such as pages viewed, time on page, device type and approximate location. We use this only in aggregate to improve the site. You can block these cookies in your browser settings or install the <a href="https://tools.google.com/dlpage/gaoptout" rel="nofollow">Google Analytics opt-out browser add-on</a>.</p>
<h2>Your choices</h2>
<p>Most browsers let you view, block and delete cookies. Blocking cookies will not stop you reading any article. Depending on where you live, you may have rights to access, correct or delete personal information we hold about you; email us and we will help.</p>
<h2>Children</h2>
<p>Toss Sports is written for adults and is not directed at children under 13. We do not knowingly collect personal information from children.</p>
<h2>Links to other sites</h2>
<p>Our articles occasionally link to governing bodies and other websites. Their privacy practices are their own; please read their policies.</p>
<h2>Changes and contact</h2>
<p>If we change this policy we will update the date at the top of the page. Questions or requests: <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</div>""")


def terms():
    page("/terms/", "Terms of use",
         "The terms for using Toss Sports: our articles are general information about recreational sports, your league's rules come first, and play is at your own risk.",
         f"""<p class="kicker">Legal</p><h1>Terms of use</h1>
<div class="prose">
<p class="meta">Last updated: <time datetime="{UPDATED}">{UPDATED_H}</time></p>
<p>By using tosssports.com you agree to these terms. The site is published by Marketing Apes LLC.</p>
<h2>General information only</h2>
<p>Our articles explain common rules and practices for recreational sports. Leagues, venues and governing bodies set their own rules and update them regularly, so always check the current rulebook for your league. Nothing on this site is medical, legal, financial or other professional advice.</p>
<h2>Playing safely</h2>
<p>Sport carries a risk of injury. You are responsible for deciding whether an activity is right for you, for following your venue's safety rules, and for seeking professional advice where appropriate. We are not responsible for injuries, losses or disputes arising from games you play.</p>
<h2>Our content</h2>
<p>The text and illustrations on Toss Sports are our original work and are protected by copyright. You are welcome to share links, quote short passages with attribution, and print articles or the game-day checklist for your own team's use. Please do not republish whole articles or our illustrations without permission.</p>
<h2>Tools on the site</h2>
<p>The team-name generator produces random combinations of words for fun. Check that any name you pick is suitable for your league and does not infringe anyone else's trademark before you put it on a shirt.</p>
<h2>Advertising and links</h2>
<p>The site shows ads served by Google and may link to other websites. We do not control and are not responsible for third-party ads or websites. See our <a href="/privacy/">privacy policy</a> for how advertising cookies work.</p>
<h2>Availability and changes</h2>
<p>We may update articles, change these terms or pause the site at any time. The &ldquo;last updated&rdquo; date above shows when these terms last changed. To the fullest extent permitted by law, the site is provided &ldquo;as is&rdquo; without warranties of any kind.</p>
<h2>Contact</h2>
<p>Questions about these terms: <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</div>""")


def misc():
    w("404.html", f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page not found | {BRAND}</title>
<meta name="description" content="That page missed the board. Head back to the Toss Sports home page or browse all articles.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=1">
</head>
<body>
<header class="site-head"><div class="wrap head-row"><a class="logo" href="/" aria-label="{BRAND} home"><img src="/images/logo.svg" alt="{BRAND}" width="190" height="40"></a>
<nav aria-label="Main"><a href="/articles/">Articles</a><a href="/about/">About</a><a href="/contact/">Contact</a></nav></div></header>
<main id="main"><div class="wrap page notfound">
<img src="/images/404.svg" alt="A beanbag flying past a cornhole board" width="800" height="500">
<h1>Airball! That page missed the board.</h1>
<p class="lede">The page you were looking for has moved or never existed. Try the home page or the full list of guides.</p>
<p><a class="btn" href="/">Back to home</a> <a class="btn btn-ghost" href="/articles/">All articles</a></p>
</div></main>
""" + foot())
    w("contact.html", f"""<!doctype html>
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
<p>Our contact page has moved: <a href="/contact/">tosssports.com/contact/</a></p>
</body>
</html>
""")
    w("robots.txt", f"User-agent: *\nAllow: /\nDisallow: /preview/\n\nUser-agent: Mediapartners-Google\nAllow: /\n\nSitemap: {HOST}/sitemap.xml\n")
    w("_redirects", "/preview/*  /  301\n/preview    /  301\n")
    w("ads.txt", "google.com, pub-5194583669093303, DIRECT, f08c47fec0942fa0\n")
    urls = ["/", "/articles/", "/about/", "/contact/", "/privacy/", "/terms/", "/game-day-checklist/"] + [f"/articles/{a['slug']}/" for a in ARTICLES]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sm += "".join(f"  <url><loc>{HOST}{u}</loc><lastmod>{UPDATED}</lastmod></url>\n" for u in urls)
    sm += "</urlset>\n"
    w("sitemap.xml", sm)


def images():
    for slug, fn in svgs.ARTICLE_SVGS.items():
        w(f"images/{slug}.svg", fn())
    w("images/hero.svg", svgs.hero())
    w("images/og.svg", svgs.og())
    w("images/logo.svg", svgs.logo())
    w("images/404.svg", svgs.notfound())


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    for f in ("site.css", "site.js"):
        w(f"assets/{f}", open(os.path.join(here, f)).read())
    images()
    home(); about(); contact(); privacy(); terms(); articles_index(); misc()
    missing = [a["slug"] for a in ARTICLES if a["slug"] not in svgs.ARTICLE_SVGS]
    assert not missing, missing
    for a in ARTICLES:
        for r in a["related"]:
            assert r in BY, (a["slug"], r)
        n = article(a)
        print(f"{n:5d}  {a['slug']}")
