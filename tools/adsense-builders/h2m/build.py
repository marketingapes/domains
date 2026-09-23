import os, html, sys
sys.path.insert(0, os.path.dirname(__file__))
import svgs
from articles1 import A as A1
from articles2 import A as A2

OUT = "/home/user/domains/h2m"
HOST = "hair2makeup.com"
BRAND = "Hair 2 Makeup"
EMAIL = "hello@hair2makeup.com"
UPDATED = "2026-09-23"
UPDATED_H = "23 September 2026"
ARTS = A1 + A2
BY = {a["slug"]: a for a in ARTS}
ORDER = ["event-day-prep-timeline", "bridal-trial-run-guide", "how-to-book-a-hair-and-makeup-artist", "how-to-brief-your-stylist",
         "updo-or-hair-down", "long-wear-makeup-that-lasts", "skin-prep-before-an-event", "makeup-for-photos-and-flash",
         "heat-styling-without-damage", "curling-iron-vs-wand-vs-straightener", "hair-prep-before-an-event",
         "prom-hair-and-makeup-planning", "event-day-emergency-kit"]
assert sorted(ORDER) == sorted(BY), set(BY) ^ set(ORDER)

GTM_HEAD = """<script>window.dataLayer=window.dataLayer||[];</script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-W8W9RSWL');</script>"""
GTM_BODY = """<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-W8W9RSWL" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>"""


def esc(s):
    return html.escape(s, quote=True)


def head(title, desc, path, og_image="/images/og.svg", noindex=False, extra=""):
    full = f"{title} | {BRAND}" if title != BRAND else f"{BRAND} | Event hair &amp; makeup, planned calmly"
    robots = '<meta name="robots" content="noindex">\n' if noindex else ""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{full}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="https://{HOST}{path}">
{robots}<meta name="google-adsense-account" content="ca-pub-5194583669093303">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5194583669093303" crossorigin="anonymous"></script>
{GTM_HEAD}
<meta property="og:type" content="{'article' if path.startswith('/articles/') and path != '/articles/' else 'website'}">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="https://{HOST}{path}">
<meta property="og:image" content="https://{HOST}{og_image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#e0559c">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&amp;family=DM+Sans:wght@400;500;700&amp;display=swap">
<link rel="stylesheet" href="/assets/site.css">
{extra}</head>
<body>
{GTM_BODY}
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="/"><img src="/images/logo.svg" alt="" width="40" height="40"><span>Hair <b>2</b> Makeup</span></a>
    <nav aria-label="Main">
      <a href="/">Home</a>
      <a href="/articles/">Articles</a>
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
    </nav>
  </div>
</header>
"""


FOOT = f"""<footer class="site-footer">
  <div class="wrap foot">
    <div>
      <a class="brand" href="/"><img src="/images/logo.svg" alt="" width="36" height="36"><span>Hair <b>2</b> Makeup</span></a>
      <p>Friendly, practical guides to hair and makeup for weddings, proms and every big night in between.</p>
    </div>
    <nav aria-label="Footer">
      <a href="/articles/">Articles</a>
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
      <a href="/privacy/">Privacy</a>
      <a href="/terms/">Terms</a>
    </nav>
  </div>
  <p class="wrap copy">&copy;2026 {BRAND}. General information only; always patch-test products and follow your stylist's advice.</p>
</footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
"""


def page(path, title, desc, main, **kw):
    return head(title, desc, path, **kw) + f'<main id="main">\n{main}\n</main>\n' + FOOT


def card(a, big=False):
    return f"""<a class="card{' card--big' if big else ''}" href="/articles/{a['slug']}/">
  <span class="card-img"><img src="/images/{a['slug']}.svg" alt="" loading="lazy" width="1200" height="675"></span>
  <span class="card-body"><span class="tag">{a['cat']}</span><span class="card-title">{a['short']}</span><span class="card-desc">{esc(a['desc'])}</span></span>
</a>"""


def write(rel, content):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(content)


# ------------------------------------------------------------------ images
for s in svgs.SCENE_SLUGS:
    write(f"images/{s}.svg", svgs.scene(s))
write("images/hero.svg", svgs.hero())
write("images/og.svg", svgs.og())
write("images/logo.svg", svgs.logo())

# ------------------------------------------------------------------ articles
for a in ARTS:
    faq = "".join(f"<details><summary>{q}</summary><p>{ans}</p></details>" for q, ans in a["faq"])
    rel = "".join(f'<li><a href="/articles/{r}/"><img src="/images/{r}.svg" alt="" loading="lazy" width="120" height="68"><span>{BY[r]["short"]}</span></a></li>' for r in a["related"])
    main = f"""<article class="article wrap narrow">
  <p class="crumbs"><a href="/">Home</a> / <a href="/articles/">Articles</a> / {a['cat']}</p>
  <span class="tag">{a['cat']}</span>
  <h1>{a['title']}</h1>
  <p class="byline">By the {BRAND} team &middot; Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></p>
  <figure class="hero-fig"><img src="/images/{a['slug']}.svg" alt="Illustration: {esc(a['short'])}" width="1200" height="675"></figure>
  <div class="prose">
  {a['intro']}
  {a['body']}
  <h2>Frequently asked questions</h2>
  <div class="faq">{faq}</div>
  <p class="note">General information only. Patch-test new products and follow your stylist's advice for your own hair and skin.</p>
  </div>
  <aside class="related"><h2>Related articles</h2><ul>{rel}</ul></aside>
</article>"""
    write(f"articles/{a['slug']}/index.html", page(f"/articles/{a['slug']}/", a["title"], a["desc"], main, og_image=f"/images/{a['slug']}.svg"))

# ------------------------------------------------------------------ articles index
cats = []
for s in ORDER:
    if BY[s]["cat"] not in cats:
        cats.append(BY[s]["cat"])
filters = '<button class="chip is-on" data-cat="all" type="button">All</button>' + "".join(f'<button class="chip" data-cat="{c}" type="button">{c}</button>' for c in cats)
cards = "".join(f'<div class="grid-item" data-cat="{BY[s]["cat"]}">{card(BY[s])}</div>' for s in ORDER)
main = f"""<section class="wrap page-head">
  <h1>All articles</h1>
  <p class="lede">Every guide on {BRAND}, from booking a stylist and planning your trial to curling technique, long-wear makeup and packing an emergency kit. Pick a topic or scroll the lot.</p>
  <div class="chips" role="group" aria-label="Filter by topic">{filters}</div>
</section>
<section class="wrap grid" id="article-grid">{cards}</section>"""
write("articles/index.html", page("/articles/", "Articles", "All Hair 2 Makeup guides to event hair and makeup: bridal trials, booking a stylist, prep timelines, skin prep, long-wear makeup, heat styling and tools.", main))

# ------------------------------------------------------------------ home
feat = ORDER[:6]
home_main = f"""<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow">Weddings &middot; proms &middot; parties &middot; photo days</p>
      <h1>Event hair and makeup, <em>planned calmly</em>.</h1>
      <p class="lede">{BRAND} is a friendly guide to looking and feeling like your best self on the big day. We explain how to book and brief a stylist, how trial runs work, how to plan the morning minute by minute, and how to make curls and lipstick last until the last song.</p>
      <p class="cta-row"><a class="btn" href="#timeline">Build your prep timeline</a><a class="btn btn--ghost" href="/articles/">Browse the guides</a></p>
    </div>
    <figure class="hero-art"><img src="/images/hero.svg" alt="Illustration of a bulb-lit vanity mirror, two smiling friends and a table of brushes, lipsticks and hot tools" width="1600" height="900"></figure>
  </div>
</section>

<section class="wrap section">
  <div class="section-head"><h2>Start here</h2><p>Our most useful guides for anyone with an event on the calendar.</p></div>
  <div class="grid">{''.join(f'<div class="grid-item">{card(BY[s], i == 0)}</div>' for i, s in enumerate(feat))}</div>
  <p class="center"><a class="btn btn--ghost" href="/articles/">See all {len(ARTS)} articles</a></p>
</section>

<section class="widget-band" id="timeline">
  <div class="wrap widget-grid">
    <div class="widget-intro">
      <h2>Event-day prep timeline builder</h2>
      <p>Tell us when everyone needs to be ready, how many people are getting styled and how many artists are coming. We will work backwards and sketch a schedule, including setup time and a buffer for the inevitable dropped curl.</p>
      <p class="small">Timings are general planning estimates, not quotes. Always confirm real timings with your own stylist, because pace varies with the artist, the hair and the look.</p>
    </div>
    <form class="tl-form" id="tl-form" onsubmit="return false">
      <div class="field"><label for="tl-ready">Ready-by time</label><input id="tl-ready" type="time" value="13:00" required></div>
      <div class="field"><label for="tl-people">People getting styled</label><input id="tl-people" type="number" min="1" max="12" value="4"></div>
      <div class="field"><label for="tl-service">Services per person</label><select id="tl-service"><option value="both">Hair and makeup</option><option value="hair">Hair only</option><option value="makeup">Makeup only</option></select></div>
      <div class="field"><label for="tl-artists">Artists coming</label><select id="tl-artists"><option value="1">One artist (does everything)</option><option value="2" selected>Two: hair stylist + makeup artist</option></select></div>
      <div class="field"><label for="tl-look">Hair complexity</label><select id="tl-look"><option value="simple">Simple waves or blow-out</option><option value="detailed" selected>Detailed updos</option></select></div>
      <div class="field"><label for="tl-buffer">Buffer (minutes)</label><input id="tl-buffer" type="number" min="0" max="120" step="5" value="30"></div>
      <div class="field field--wide check"><input id="tl-main" type="checkbox" checked><label for="tl-main">One person is the guest of honour (bride, prom star, birthday) and needs extra time</label></div>
      <button class="btn field--wide" id="tl-go" type="button">Build my timeline</button>
    </form>
    <div class="tl-out" id="tl-out" aria-live="polite"></div>
  </div>
</section>

<section class="wrap section two-col">
  <div>
    <h2>What you will find here</h2>
    <p>Getting ready for a big event involves more decisions than people expect. Who should you book, and how far ahead? What do you bring to a trial? Should your hair be up or down with a halter neckline? Why did your powder look white in the flash photos? Our articles answer those questions in plain language, with checklists and tables you can actually use on the day.</p>
    <p>We cover <a href="/articles/how-to-book-a-hair-and-makeup-artist/">booking</a> and <a href="/articles/how-to-brief-your-stylist/">briefing a stylist</a>, <a href="/articles/bridal-trial-run-guide/">trial runs</a>, <a href="/articles/event-day-prep-timeline/">prep timelines</a>, <a href="/articles/skin-prep-before-an-event/">skin prep</a>, <a href="/articles/long-wear-makeup-that-lasts/">long-wear makeup</a>, <a href="/articles/heat-styling-without-damage/">heat styling</a> and the <a href="/articles/curling-iron-vs-wand-vs-straightener/">tools</a> that make it all happen.</p>
  </div>
  <div class="promise">
    <h2>Our promise</h2>
    <ul class="ticks">
      <li>Practical advice you can use, not hype.</li>
      <li>We talk about product types and techniques, never fake rankings or made-up reviews.</li>
      <li>We are honest about what depends on your hair, your skin and your stylist.</li>
      <li>For anything medical, like skin conditions or allergies, we point you to a qualified professional.</li>
    </ul>
  </div>
</section>"""
write("index.html", page("/", BRAND, "Friendly guides to event hair and makeup: booking and briefing a stylist, bridal trial runs, prep timelines, skin prep, long-wear makeup and heat styling, plus a free prep timeline builder.", home_main))

# ------------------------------------------------------------------ about
about = f"""<section class="wrap narrow prose page-head">
  <h1>About {BRAND}</h1>
  <figure class="hero-fig"><img src="/images/og.svg" alt="{BRAND} illustration with a vanity mirror and makeup tools" width="1200" height="630"></figure>
  <p class="lede">{BRAND} exists to make getting ready for a big event feel exciting rather than stressful.</p>
  <p>Weddings, proms, milestone birthdays, graduations and photo shoots all come with the same set of questions. How early do I book? What does a trial involve? How do I explain the look I want? How long will everything take on the morning? Will my makeup survive a hot dance floor? The answers are scattered across forums and social posts, often mixed with sales pitches. We wanted one calm, well-organised place that explains it all clearly.</p>
  <h2>What we write about</h2>
  <p>Our guides cover the full journey of event hair and makeup: finding and booking an artist, putting together a brief, bridal and prom trial runs, prep timelines for the day, skin and hair preparation in the weeks before, long-wear makeup techniques, photographing well, heat-styling safely and choosing between common hot tools. Each article is written to be practical, with checklists, tables and answers to the questions people actually ask.</p>
  <h2>How we write</h2>
  <ul>
    <li><strong>Written by the {BRAND} team.</strong> We research each topic using widely accepted guidance, product instructions and general industry practice.</li>
    <li><strong>No invented claims.</strong> We do not publish fake reviews, testimonials, ratings or statistics, and we do not claim to have tested products we have not.</li>
    <li><strong>Categories, not rankings.</strong> We explain how to choose a type of product or tool, rather than pushing particular brands.</li>
    <li><strong>Honest limits.</strong> Hair and skin vary. Where something depends on your stylist, your hair type or your health, we say so. We are not medical professionals, and our content is not medical or dermatological advice.</li>
    <li><strong>Kept up to date.</strong> Each article shows the date it was last reviewed.</li>
  </ul>
  <h2>Advertising</h2>
  <p>This site is free to read and is supported by advertising, including ads served by Google. Advertisers do not choose or review our articles. You can read more in our <a href="/privacy/">privacy policy</a>.</p>
  <h2>Say hello</h2>
  <p>Spotted something that could be clearer, or have a question you would like us to cover? We would love to hear from you on our <a href="/contact/">contact page</a>.</p>
</section>"""
write("about/index.html", page("/about/", "About", f"About {BRAND}: who we are, what we write about, and how we create practical, honest guides to event hair and makeup.", about))

# ------------------------------------------------------------------ contact
contact = f"""<section class="wrap narrow prose page-head">
  <h1>Contact us</h1>
  <p class="lede">The easiest way to reach the {BRAND} team is by email: <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
  <p>We read every message and aim to reply within a few working days.</p>
  <h2>Good reasons to write</h2>
  <ul>
    <li><strong>Corrections:</strong> if something in an article is unclear, out of date or wrong, tell us which page and what you noticed.</li>
    <li><strong>Topic ideas:</strong> a question about event hair or makeup you would like us to explain.</li>
    <li><strong>Feedback on the timeline builder:</strong> suggestions to make it more useful.</li>
    <li><strong>Privacy requests:</strong> questions about data or cookies, as described in our <a href="/privacy/">privacy policy</a>.</li>
    <li><strong>Advertising or partnership enquiries.</strong></li>
  </ul>
  <h2>What we can't help with</h2>
  <p>We are an information site, not a salon, so we cannot book appointments for you, recommend a specific local stylist or give personal medical advice about skin reactions or scalp conditions. If you have a reaction to a product, stop using it and speak to a pharmacist, doctor or dermatologist.</p>
  <p>Please don't send sensitive personal information such as health details or payment information by email.</p>
</section>"""
write("contact/index.html", page("/contact/", "Contact", f"Contact the {BRAND} team by email with corrections, topic ideas, privacy requests or partnership enquiries.", contact))

# ------------------------------------------------------------------ privacy
privacy = f"""<section class="wrap narrow prose page-head">
  <h1>Privacy policy</h1>
  <p class="byline">Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></p>
  <p>This policy explains what information is collected when you visit {HOST} (the "site"), how it is used and the choices you have. If you have questions, email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
  <h2>Information we collect</h2>
  <p>We do not ask you to create an account, and the site has no sign-up or contact forms. If you email us, we receive your email address and whatever you choose to include, and we use it only to reply. Like most websites, our hosting provider and the services described below may automatically collect technical information such as your IP address, browser type, device, pages visited and the time of your visit.</p>
  <p>The prep timeline builder on our home page runs entirely in your browser. The times and numbers you enter are not sent to us.</p>
  <h2>Cookies</h2>
  <p>Cookies are small text files stored on your device. We and our partners use cookies and similar technologies to keep the site working, understand how it is used and show advertising. You can control or delete cookies through your browser settings; blocking some cookies may affect how the site works.</p>
  <h2>Advertising and Google AdSense</h2>
  <p>This site uses Google AdSense to show ads. In connection with this:</p>
  <ul>
    <li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</li>
    <li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visits to this site and/or other sites on the Internet.</li>
    <li>You may opt out of personalised advertising by visiting Google's <a href="https://adssettings.google.com" rel="noopener">Ads Settings</a>. You can also opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info" rel="noopener">www.aboutads.info</a>.</li>
    <li>To learn more, see <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">How Google uses information from sites or apps that use its services</a>.</li>
  </ul>
  <p>Where required by law, for example for visitors in the UK or European Economic Area, you may be asked for consent before personalised ads or non-essential cookies are used, and you can change your choice at any time.</p>
  <h2>Analytics</h2>
  <p>We use Google Tag Manager and Google Analytics to understand how visitors use the site, such as which pages are popular and how people arrive here. These tools use cookies and collect information like pages viewed, approximate location and device type. You can learn about Google's practices at the link above and can install the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Google Analytics opt-out browser add-on</a>.</p>
  <h2>How we use information</h2>
  <ul>
    <li>To operate, maintain and improve the site.</li>
    <li>To show advertising that helps keep the site free.</li>
    <li>To respond to emails you send us.</li>
    <li>To keep the site secure and prevent abuse.</li>
  </ul>
  <p>We do not sell your personal information.</p>
  <h2>Your rights</h2>
  <p>Depending on where you live, you may have rights to access, correct or delete personal information, or to object to certain processing. To make a request, email <a href="mailto:{EMAIL}">{EMAIL}</a>. For information held by Google, use the tools Google provides.</p>
  <h2>Children</h2>
  <p>This site is intended for a general audience and is not directed at children under 13. We do not knowingly collect personal information from children.</p>
  <h2>External links</h2>
  <p>Our articles may link to other websites. We are not responsible for their privacy practices, so please read their policies.</p>
  <h2>Changes to this policy</h2>
  <p>We may update this policy from time to time. The date at the top shows when it was last changed.</p>
  <h2>Contact</h2>
  <p>Questions about privacy: <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</section>"""
write("privacy/index.html", page("/privacy/", "Privacy policy", f"How {BRAND} uses cookies, Google AdSense advertising and Google Analytics, and how you can opt out of personalised ads.", privacy))

# ------------------------------------------------------------------ terms
terms = f"""<section class="wrap narrow prose page-head">
  <h1>Terms of use</h1>
  <p class="byline">Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></p>
  <p>By using {HOST} (the "site") you agree to these terms. If you do not agree, please do not use the site.</p>
  <h2>General information only</h2>
  <p>Everything on this site is general information about hair, makeup and event planning. It is not professional, medical or dermatological advice. Hair and skin vary from person to person: always read product labels, patch-test new products, follow the manufacturer's instructions for hot tools, and seek advice from a qualified professional about skin, scalp or allergy concerns.</p>
  <h2>Timeline builder</h2>
  <p>The prep timeline builder produces rough planning estimates. It is not a quote or a guarantee of how long any service will take. Confirm timings with your own stylist or artist.</p>
  <h2>Use of content</h2>
  <p>The articles and illustrations on this site are owned by {BRAND}. You may share links and quote brief extracts with credit and a link back. Please do not copy whole articles or illustrations without permission.</p>
  <h2>Advertising and links</h2>
  <p>The site shows advertising, including ads from Google. We do not endorse advertised products or services. Links to other websites are provided for convenience, and we are not responsible for their content.</p>
  <h2>Accuracy</h2>
  <p>We work to keep content accurate and current, but we cannot guarantee it is complete or error-free. If you spot a mistake, please <a href="/contact/">let us know</a>.</p>
  <h2>Limitation of liability</h2>
  <p>To the extent permitted by law, {BRAND} is not liable for any loss or damage arising from your use of the site or reliance on its content.</p>
  <h2>Changes</h2>
  <p>We may update these terms. Continued use of the site after changes means you accept the updated terms.</p>
  <h2>Contact</h2>
  <p>Questions: <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</section>"""
write("terms/index.html", page("/terms/", "Terms of use", f"The terms of use for {HOST}: general information only, how you may use our content, advertising and limitations.", terms))

# ------------------------------------------------------------------ 404
nf = f"""<section class="wrap narrow page-head center">
  <h1>Oops, this page wandered off</h1>
  <p class="lede">Like a bobby pin on a dance floor, the page you wanted has gone missing.</p>
  <p><a class="btn" href="/">Back to home</a> <a class="btn btn--ghost" href="/articles/">Browse articles</a></p>
</section>"""
write("404.html", page("/404.html", "Page not found", f"The page you were looking for on {BRAND} could not be found. Head back home or browse our hair and makeup guides.", nf, noindex=True))

# ------------------------------------------------------------------ contact.html (legacy)
write("contact.html", f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact | {BRAND}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="https://{HOST}/contact/">
<meta http-equiv="refresh" content="0; url=/contact/">
</head>
<body>
<p>Our contact page has moved: <a href="/contact/">{HOST}/contact/</a>.</p>
</body>
</html>
""")

# ------------------------------------------------------------------ text files
write("robots.txt", f"""User-agent: *
Allow: /
Disallow: /preview/

User-agent: Mediapartners-Google
Allow: /

Sitemap: https://{HOST}/sitemap.xml
""")
write("_redirects", "/preview/*  /  301\n/preview    /  301\n")
write("ads.txt", "google.com, pub-5194583669093303, DIRECT, f08c47fec0942fa0\n")
urls = ["/", "/articles/"] + [f"/articles/{s}/" for s in ORDER] + ["/about/", "/contact/", "/privacy/", "/terms/"]
sm = "".join(f"  <url><loc>https://{HOST}{u}</loc><lastmod>{UPDATED}</lastmod></url>\n" for u in urls)
write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{sm}</urlset>\n')

# ------------------------------------------------------------------ css/js
here = os.path.dirname(__file__)
for n in ("site.css", "site.js"):
    with open(os.path.join(here, n)) as f:
        write(f"assets/{n}", f.read())
print("built", len(ARTS), "articles")
