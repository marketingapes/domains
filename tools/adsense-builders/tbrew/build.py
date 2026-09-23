import os, sys, html
sys.path.insert(0, os.path.dirname(__file__))
from content_a import ARTICLES_A
from content_b import ARTICLES_B
import scenes
from svg import svg

OUT = "/home/user/domains/tbrew"
HOST = "tossedbrew.com"
BRAND = "Tossed Brew"
DATE = "2026-09-23"
DATE_H = "23 September 2026"
EMAIL = "hello@tossedbrew.com"
ARTS = ARTICLES_A + ARTICLES_B
BY = {a["slug"]: a for a in ARTS}

GTM_HEAD = """<script>window.dataLayer=window.dataLayer||[];</script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PFJV3F');</script>"""
GTM_BODY = '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PFJV3F" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>'

def w(rel, s):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(s)

def head(title, desc, path, img="/images/og.svg", robots=None, extra=""):
    t = html.escape(title); d = html.escape(desc)
    r = f'<meta name="robots" content="{robots}">\n' if robots else ""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t} | {BRAND}</title>
<meta name="description" content="{d}">
{r}<link rel="canonical" href="https://{HOST}{path}">
<meta name="google-adsense-account" content="ca-pub-5194583669093303">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5194583669093303" crossorigin="anonymous"></script>
{GTM_HEAD}
<meta property="og:type" content="{'article' if path.startswith('/articles/') and path != '/articles/' else 'website'}">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="https://{HOST}{path}">
<meta property="og:image" content="https://{HOST}{img}">
<meta name="theme-color" content="#e8962e">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Nunito:wght@400;600;800&display=swap">
<link rel="stylesheet" href="/assets/site.css">
{extra}</head>
<body>
{GTM_BODY}
<a class="skip" href="#main">Skip to content</a>
<header class="site-head"><div class="wrap head-row">
<a class="logo" href="/"><img src="/images/logo.svg" alt="Tossed Brew home" width="180" height="48"></a>
<nav aria-label="Main"><ul>
<li><a href="/articles/">Articles</a></li>
<li><a href="/about/">About</a></li>
<li><a href="/contact/">Contact</a></li>
</ul></nav>
</div></header>
"""

FOOT = f"""<footer class="site-foot"><div class="wrap">
<div class="foot-grid">
<div><img src="/images/logo.svg" alt="Tossed Brew" width="160" height="43"><div class="foot-blurb">The beer, and where to find it. Friendly guides to styles, pairing, glassware, homebrewing and brewery trips.</div></div>
<nav aria-label="Footer"><ul>
<li><a href="/articles/">Articles</a></li><li><a href="/about/">About</a></li><li><a href="/contact/">Contact</a></li>
<li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms</a></li>
</ul></nav>
</div>
<div class="responsible"><strong>Drink responsibly.</strong> Tossed Brew is written for adults of legal drinking age (21+ in the US). Know your limits, never drink and drive, and skip alcohol if you are pregnant, taking medication that interacts with it, or in recovery. In the US, free, confidential help is available from the SAMHSA National Helpline at 1-800-662-4357.</div>
<div class="copy">©2026 {BRAND} · tossedbrew.com</div>
</div></footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
"""

def card(a, level="h3"):
    return (f'<article class="card"><a href="/articles/{a["slug"]}/">'
            f'<img src="/images/{a["slug"]}.svg" alt="{html.escape(a["alt"])}" width="1200" height="675" loading="lazy">'
            f'<div class="card-body"><span class="tag">{a["tag"]}</span><{level}>{html.escape(a["short"])}</{level}>'
            f'<span class="blurb">{html.escape(a["desc"])}</span></div></a></article>')

def words(s):
    import re
    t = re.sub(r"<[^>]+>", " ", s)
    return len(re.findall(r"[A-Za-z0-9'’-]+", t))

def article_page(a):
    body = a["body"].replace("{FIG}", a["fig"])
    mins = max(4, round(words(body) / 220))
    faq = "".join(f'<details><summary>{html.escape(q)}</summary><p>{html.escape(ans)}</p></details>' for q, ans in a["faq"])
    rel = "".join(card(BY[s]) for s in a["related"])
    import json
    ld = json.dumps({"@context": "https://schema.org", "@type": "Article", "headline": a["title"], "description": a["desc"],
                     "image": f"https://{HOST}/images/{a['slug']}.svg", "datePublished": DATE, "dateModified": DATE,
                     "author": {"@type": "Organization", "name": "The Tossed Brew team"},
                     "publisher": {"@type": "Organization", "name": BRAND}})
    return head(a["title"], a["desc"], f"/articles/{a['slug']}/", f"/images/{a['slug']}.svg",
                extra=f'<script type="application/ld+json">{ld}</script>\n') + f"""<main id="main" class="wrap article">
<p class="crumbs"><a href="/">Home</a> › <a href="/articles/">Articles</a> › {html.escape(a['short'])}</p>
<h1>{html.escape(a['title'])}</h1>
<p class="meta"><span class="tag">{a['tag']}</span> By The Tossed Brew team · Last updated <time datetime="{DATE}">{DATE_H}</time> · {mins} min read</p>
<figure class="hero-fig"><img src="/images/{a['slug']}.svg" alt="{html.escape(a['alt'])}" width="1200" height="675"></figure>
<div class="prose">
{body}
<h2>Frequently asked questions</h2>
<div class="faq">{faq}</div>
<aside class="note-box"><strong>Enjoy responsibly.</strong> This guide is general information for adults of legal drinking age. It is not medical or legal advice; follow local laws and your own health needs.</aside>
</div>
<section class="related"><h2>Related articles</h2><div class="cards cards-3">{rel}</div></section>
</main>
""" + FOOT

HOME_INTRO = """
<section class="hero"><div class="wrap hero-grid">
<div class="hero-copy">
<p class="eyebrow">Beer styles · pairing · brewery trips</p>
<h1>The beer, <span>and where to find it.</span></h1>
<p class="lede">Tossed Brew is a friendly field guide for curious beer drinkers. We explain what the words on the tap list mean, which glass to grab, what to eat alongside, how to brew your first batch at home, and how to plan a brewery day that everyone gets home from safely.</p>
<p class="cta-row"><a class="btn" href="#picker">Find a style to try</a> <a class="btn btn-ghost" href="/articles/">Browse all guides</a></p>
</div>
<figure class="hero-art"><img src="/images/hero.svg" alt="Four smiling cartoon beer glasses clinking at a wooden taproom bar in front of hop fields and a small brewery" width="1600" height="900"></figure>
</div></section>
"""

HOME_BODY = """
<section class="wrap intro-grid">
<div>
<h2>Good beer is easier to enjoy when you know what you are looking at</h2>
<p>Craft beer has never had more variety, and that can be overwhelming. A single taproom board might list a Helles, a cold IPA, a gose and a barrel-aged imperial stout, with no explanation of how they differ. Our guides turn that jargon into plain English so you can order with confidence, find new favourites and skip the ones that are not for you.</p>
<p>Everything here is written by the Tossed Brew team from widely published brewing knowledge and style references. We do not sell rankings, we do not invent tasting scores, and we will never pretend a beer is “the best” when taste is personal. Instead we focus on the stuff that genuinely helps: how styles are made, what flavours to expect, how storage and pouring change what ends up in your glass, and how to keep a day out fun and safe.</p>
</div>
<ul class="topics">
<li><span class="dot" style="background:#f2b640"></span><strong>Styles explained</strong> — lagers, ales, IPAs, stouts and sours, without the snobbery.</li>
<li><span class="dot" style="background:#c2415a"></span><strong>Food pairing</strong> — simple rules that make both the beer and the dinner better.</li>
<li><span class="dot" style="background:#4fb3bf"></span><strong>Glassware &amp; pouring</strong> — small changes that bring out aroma and a proper head.</li>
<li><span class="dot" style="background:#7fb241"></span><strong>Homebrew basics</strong> — equipment, sanitation and your very first batch.</li>
<li><span class="dot" style="background:#c4733a"></span><strong>Brewery trips</strong> — routes, rides, etiquette and bringing beer home.</li>
<li><span class="dot" style="background:#6b3a1a"></span><strong>Tasting like a pro</strong> — look, smell, sip, and put words to what you notice.</li>
</ul>
</section>

<section class="picker-wrap" id="picker"><div class="wrap">
<div class="picker">
<div class="picker-head"><h2>Which beer style should I try?</h2>
<p>Answer four quick questions and we will suggest a style to look for on your next visit, with the glass to use and a food idea. It runs entirely in your browser; nothing is sent anywhere.</p></div>
<form id="style-picker" class="picker-form">
<fieldset><legend>1. Which flavours sound good?</legend>
<label><input type="radio" name="flavour" value="bready" required> Bread, crackers, honey</label>
<label><input type="radio" name="flavour" value="citrus"> Citrus, pine, tropical fruit</label>
<label><input type="radio" name="flavour" value="roast"> Coffee, chocolate, toast</label>
<label><input type="radio" name="flavour" value="tart"> Tart, lemony, fruity</label>
<label><input type="radio" name="flavour" value="spice"> Banana, clove, pepper</label>
</fieldset>
<fieldset><legend>2. How do you feel about bitterness?</legend>
<label><input type="radio" name="bitter" value="1" required> Keep it low</label>
<label><input type="radio" name="bitter" value="2"> A little is nice</label>
<label><input type="radio" name="bitter" value="3"> Bring it on</label>
</fieldset>
<fieldset><legend>3. How strong?</legend>
<label><input type="radio" name="strength" value="1" required> Light and sessionable</label>
<label><input type="radio" name="strength" value="2"> Middle of the road</label>
<label><input type="radio" name="strength" value="3"> Big, slow sipper</label>
</fieldset>
<fieldset><legend>4. What's the occasion?</legend>
<label><input type="radio" name="occasion" value="sun" required> Hot day outside</label>
<label><input type="radio" name="occasion" value="dinner"> With dinner</label>
<label><input type="radio" name="occasion" value="cozy"> Cosy evening in</label>
</fieldset>
<div class="picker-actions"><button type="submit" class="btn">Pour my suggestion</button> <button type="button" class="btn btn-ghost" id="picker-random">Surprise me</button></div>
</form>
<div id="picker-result" class="picker-result" aria-live="polite" hidden></div>
</div>
</div></section>
"""

def home():
    feat = "".join(card(a) for a in ARTS)
    return head("Beer styles, pairing and brewery trips", "Tossed Brew explains beer styles, food pairing, glassware, homebrewing basics and brewery-trip planning in plain English, plus a picker to find your next beer style.", "/") + \
        '<main id="main">' + HOME_INTRO + HOME_BODY + f"""
<section class="wrap"><div class="section-head"><h2>Fresh from the taps: our guides</h2><a href="/articles/">See all articles →</a></div>
<div class="cards">{feat}</div></section>
<section class="wrap promise">
<h2>Our promise to you</h2>
<p>Beer is best enjoyed with good company, good food and a clear head. That is why every guide on Tossed Brew includes practical safety notes where they matter, from standard-drink maths on our brewery trip planner to chemical safety in our sanitising guide. If something we have written looks wrong or out of date, please <a href="/contact/">tell us</a> and we will fix it.</p>
</section>
</main>
""" + FOOT

def articles_index():
    cards = "".join(card(a, "h2") for a in ARTS)
    return head("All beer guides", "Every Tossed Brew guide in one place: beer styles, IPAs, stouts, sours, food pairing, glassware, tasting, homebrewing, sanitising, storage, pouring and brewery trips.", "/articles/") + f"""<main id="main" class="wrap">
<p class="crumbs"><a href="/">Home</a> › Articles</p>
<h1>All beer guides</h1>
<p class="lede">Twelve plain-English guides to understanding, choosing, serving and even brewing beer. Start with <a href="/articles/beer-styles-explained/">beer styles explained</a> if you are new, or jump straight to what you are curious about.</p>
<div class="cards">{cards}</div>
</main>
""" + FOOT

def simple(title, desc, path, inner):
    return head(title, desc, path) + f'<main id="main" class="wrap page"><p class="crumbs"><a href="/">Home</a> › {html.escape(title)}</p><div class="prose">{inner}</div></main>\n' + FOOT

ABOUT = f"""<h1>About Tossed Brew</h1>
<figure class="hero-fig"><img src="/images/hero.svg" alt="Cartoon beer glasses cheering at a taproom bar" width="1600" height="900"></figure>
<p>Tossed Brew is an independent beer education site. Our tagline, “the beer, and where to find it,” sums up what we care about: understanding what is in the glass, and getting out to the breweries, bars and bottle shops where good beer is poured.</p>
<h2>What we cover</h2>
<p>We write practical guides to beer styles, food pairing, glassware, pouring, storage, tasting, homebrewing basics and planning brewery trips. The aim is to answer the questions people actually ask at the bar: What is the difference between a stout and a porter? Why does my beer taste skunky? How many breweries can we fit into a Saturday? Our <a href="/articles/">articles page</a> lists everything we have published.</p>
<h2>How we write</h2>
<p>Every article is written by the Tossed Brew team and based on widely published brewing science, historical sources and style guidelines. We describe categories and techniques rather than ranking specific products, and we do not publish invented tasting scores, reviews or testimonials. Where facts vary (for example typical alcohol ranges for a style) we give approximate ranges and say so. We review and update articles when we learn something new; each page shows its last-updated date.</p>
<h2>Drinking responsibly</h2>
<p>Tossed Brew is for adults of legal drinking age. We believe that enjoying beer and being responsible go together: taste small pours, eat real food, drink water, arrange a safe ride home before the first round, and never drink and drive. Alcohol is not for everyone. If you are pregnant, taking medication, managing a health condition or in recovery, speak with a medical professional and choose what is right for you. Many of our guides, including <a href="/articles/brewery-trip-planning/">brewery trip planning</a>, include standard-drink maths to help you pace yourself.</p>
<h2>Advertising</h2>
<p>Tossed Brew is free to read and is supported by advertising served by Google AdSense. Advertisers do not choose or review our content. See our <a href="/privacy/">privacy policy</a> for how ads and cookies work on this site.</p>
<h2>Say hello</h2>
<p>Spotted an error, have a question or want to suggest a topic? Visit our <a href="/contact/">contact page</a> or email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
"""

CONTACT = f"""<h1>Contact Tossed Brew</h1>
<p>We would love to hear from you. The best way to reach the Tossed Brew team is by email:</p>
<p class="big-email"><a href="mailto:{EMAIL}">{EMAIL}</a></p>
<h2>Good reasons to write</h2>
<ul>
<li><strong>Corrections.</strong> If something in an article is inaccurate or out of date, tell us which page and what needs fixing.</li>
<li><strong>Topic ideas.</strong> Questions you would like answered about beer styles, pairing, glassware, homebrewing or brewery trips.</li>
<li><strong>Privacy requests.</strong> Questions about the data described in our <a href="/privacy/">privacy policy</a>.</li>
<li><strong>Advertising or partnership questions.</strong> We will reply if it fits our editorial standards; we do not sell rankings or reviews.</li>
</ul>
<h2>Please note</h2>
<p>We are an information site, not a brewery or a shop, so we cannot take orders, ship beer or answer questions about a specific brewery's stock. For those, contact the brewery directly. We cannot offer medical, legal or licensing advice. We aim to reply within a few working days.</p>
"""

PRIVACY = f"""<h1>Privacy Policy</h1>
<p class="meta">Last updated: <time datetime="{DATE}">{DATE_H}</time></p>
<p>This policy explains what information is collected when you visit tossedbrew.com (“Tossed Brew”, “we”, “us”), how it is used, and the choices you have. If you have questions, email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
<h2>Information we collect</h2>
<p>We do not ask you to create an account and there are no forms on this site. If you email us, we receive your email address and whatever you choose to include, and we use it only to reply. Like most websites, our hosting provider and the services described below automatically receive standard technical information such as your IP address, browser type, device type, pages visited, referring page and the date and time of your visit.</p>
<h2>Cookies</h2>
<p>Cookies are small text files stored on your device. We and our partners use cookies and similar technologies (such as local storage and web beacons) to keep the site working, to measure how it is used, and to show advertising.</p>
<h2>Advertising and Google AdSense</h2>
<p>This site uses Google AdSense to show ads. In connection with that:</p>
<ul>
<li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website and other websites.</li>
<li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visits to this site and/or other sites on the Internet.</li>
<li>You may opt out of personalised advertising by visiting Google's <a href="https://adssettings.google.com" rel="noopener">Ads Settings</a>. You can also opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info" rel="noopener">www.aboutads.info</a> (and, in Europe, <a href="https://www.youronlinechoices.eu" rel="noopener">www.youronlinechoices.eu</a>).</li>
<li>To learn more, read <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">How Google uses information from sites or apps that use its services</a>.</li>
</ul>
<p>If you are in the European Economic Area, the UK or Switzerland, you may be asked for consent before personalised ads or non-essential cookies are used, and you can change your choice at any time. Where required, non-personalised ads may be shown instead.</p>
<h2>Analytics</h2>
<p>We use Google Tag Manager and Google Analytics to understand how visitors use the site, for example which pages are popular and how people arrive. These tools use cookies and collect information such as pages viewed, approximate location derived from your IP address, and device details. The data is aggregated and helps us improve our guides. You can learn more at <a href="https://policies.google.com/privacy" rel="noopener">Google's privacy policy</a> and opt out using the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Google Analytics opt-out browser add-on</a>.</p>
<h2>The style picker</h2>
<p>The “Which beer style should I try?” picker on our home page runs entirely in your browser. Your answers are not sent to us or stored.</p>
<h2>Managing cookies</h2>
<p>Most browsers let you block or delete cookies through their settings. Blocking cookies may affect how some parts of the site or ads work.</p>
<h2>Age</h2>
<p>This site is intended for adults of legal drinking age and is not directed at children. We do not knowingly collect personal information from children under 13 (or the equivalent minimum age in your country). If you believe a child has sent us information, contact us and we will delete it.</p>
<h2>Your rights</h2>
<p>Depending on where you live, you may have rights to access, correct or delete personal information about you, or to object to certain processing. Contact us at <a href="mailto:{EMAIL}">{EMAIL}</a> and we will respond as required by applicable law.</p>
<h2>Links to other sites</h2>
<p>Our articles may link to other websites. Their privacy practices are their own, so please review their policies.</p>
<h2>Changes</h2>
<p>We may update this policy from time to time. The “last updated” date above shows when it last changed.</p>
<h2>Contact</h2>
<p>Email <a href="mailto:{EMAIL}">{EMAIL}</a> with any privacy question or request.</p>
"""

TERMS = f"""<h1>Terms of Use</h1>
<p class="meta">Last updated: <time datetime="{DATE}">{DATE_H}</time></p>
<p>By using tossedbrew.com you agree to these terms. If you do not agree, please do not use the site.</p>
<h2>Age requirement</h2>
<p>Tossed Brew discusses alcoholic beverages and is intended only for adults of legal drinking age where they live (21 or older in the United States). Please drink responsibly and never drink and drive.</p>
<h2>Information only</h2>
<p>Our content is general information for enjoyment and education. It is not medical, legal, health, safety or licensing advice. Homebrewing and alcohol laws vary by location, and you are responsible for following the laws that apply to you. Brewing involves hot liquids, pressurised containers and cleaning chemicals; follow manufacturer instructions and take appropriate safety precautions.</p>
<h2>Accuracy</h2>
<p>We work to keep our guides accurate and current, but we make no warranty that the content is complete, error-free or suitable for your particular situation. Brewery opening hours, policies and products change; always check with the business directly.</p>
<h2>Intellectual property</h2>
<p>The text and illustrations on this site are owned by Tossed Brew unless otherwise noted. You may share links and short quotations with attribution. Please do not republish full articles or images without permission.</p>
<h2>Advertising and third-party links</h2>
<p>The site displays ads served by third parties, including Google. We are not responsible for the content of ads or of external websites we link to, and a link is not an endorsement.</p>
<h2>Limitation of liability</h2>
<p>To the fullest extent permitted by law, Tossed Brew is not liable for any loss or damage arising from your use of the site or reliance on its content.</p>
<h2>Changes</h2>
<p>We may update these terms at any time. Continued use of the site after changes means you accept the updated terms.</p>
<h2>Contact</h2>
<p>Questions about these terms? Email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
"""

def page404():
    return head("Page not found", "This page could not be found on Tossed Brew. Browse our beer guides on styles, pairing, glassware, homebrewing and brewery trips instead.", "/404.html", robots="noindex") + """<main id="main" class="wrap page center">
<img class="lost" src="/images/beer-glassware-guide.svg" alt="A shelf of cartoon beer glasses" width="1200" height="675">
<h1>Well, that glass is empty.</h1>
<p class="lede">We could not find the page you were looking for. It may have moved, or the link may have a typo.</p>
<p class="cta-row"><a class="btn" href="/">Back to the home page</a> <a class="btn btn-ghost" href="/articles/">Browse all guides</a></p>
</main>
""" + FOOT

def main():
    for a in ARTS:
        w(f"images/{a['slug']}.svg", svg(1200, 675, a["alt"], scenes.SCENES[a["slug"]]()))
        w(f"articles/{a['slug']}/index.html", article_page(a))
    w("images/hero.svg", scenes.hero())
    w("images/og.svg", scenes.og())
    w("images/logo.svg", scenes.logo())
    w("index.html", home())
    w("articles/index.html", articles_index())
    w("about/index.html", simple("About Tossed Brew", "Tossed Brew is an independent beer education site covering styles, pairing, glassware, homebrewing and brewery trips, written by the Tossed Brew team.", "/about/", ABOUT))
    w("contact/index.html", simple("Contact", "How to contact the Tossed Brew team by email with corrections, topic ideas, privacy requests or partnership questions.", "/contact/", CONTACT))
    w("privacy/index.html", simple("Privacy Policy", "How Tossed Brew uses cookies, Google AdSense advertising and Google Analytics, how to opt out of personalised ads, and how to contact us about your data.", "/privacy/", PRIVACY))
    w("terms/index.html", simple("Terms of Use", "The terms for using tossedbrew.com, including the legal drinking age requirement, information-only disclaimer and intellectual property.", "/terms/", TERMS))
    w("404.html", page404())
    w("contact.html", f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact | {BRAND}</title><meta name="robots" content="noindex">
<link rel="canonical" href="https://{HOST}/contact/"><meta http-equiv="refresh" content="0; url=/contact/"></head>
<body><p>Our contact page has moved to <a href="/contact/">tossedbrew.com/contact/</a>.</p></body></html>
""")
    w("robots.txt", f"User-agent: *\nAllow: /\nDisallow: /preview/\n\nUser-agent: Mediapartners-Google\nAllow: /\n\nSitemap: https://{HOST}/sitemap.xml\n")
    w("_redirects", "/preview/*  /  301\n/preview    /  301\n")
    w("ads.txt", "google.com, pub-5194583669093303, DIRECT, f08c47fec0942fa0\n")
    urls = ["", "articles/", "about/", "contact/", "privacy/", "terms/"] + [f"articles/{a['slug']}/" for a in ARTS]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sm += "".join(f"  <url><loc>https://{HOST}/{u}</loc><lastmod>{DATE}</lastmod></url>\n" for u in urls)
    w("sitemap.xml", sm + "</urlset>\n")
    with open(os.path.join(os.path.dirname(__file__), "site.css")) as f: w("assets/site.css", f.read())
    with open(os.path.join(os.path.dirname(__file__), "site.js")) as f: w("assets/site.js", f.read())
    for a in ARTS:
        print(a["slug"], words(a["body"].replace("{FIG}", a["fig"])))

main()
