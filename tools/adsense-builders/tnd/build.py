import os, sys, json, html
sys.path.insert(0, os.path.dirname(__file__))
import arts1, arts2, arts3, arts4, svgs

OUT = "/home/user/domains/tnd"
HOST = "thenearestdentists.com"
BRAND = "The Nearest Dentists"
EMAIL = "hello@thenearestdentists.com"
UPDATED = "2026-09-23"
UPDATED_H = "September 23, 2026"
GTM = "GTM-WMKQ52BL"
ARTS = arts1.A + arts2.A + arts3.A + arts4.A
BY = {a["slug"]: a for a in ARTS}

def w(rel, content):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(content)

def esc(s): return html.escape(s, quote=True)

def head(title, desc, path, og_img="/images/og.svg", noindex=False, extra=""):
    full = f"{title} | {BRAND}" if title != BRAND else f"{BRAND} | Dental health, explained plainly"
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(full)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="https://{HOST}{path}">
{'<meta name="robots" content="noindex">' if noindex else ''}
<meta name="google-adsense-account" content="ca-pub-5194583669093303">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5194583669093303" crossorigin="anonymous"></script>
<script>window.dataLayer=window.dataLayer||[];</script>
<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);}})(window,document,'script','dataLayer','{GTM}');</script>
<meta property="og:type" content="website">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{esc(full)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="https://{HOST}{path}">
<meta property="og:image" content="https://{HOST}{og_img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1f9d92">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
{extra}</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={GTM}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<a class="skip" href="#main">Skip to content</a>
'''

def nav(cur=""):
    def a(href, label, key):
        c = ' aria-current="page"' if key == cur else ''
        return f'<a href="{href}"{c}>{label}</a>'
    return f'''<header class="site-head"><div class="wrap">
<a class="brand" href="/"><img src="/images/logo.svg" alt="" width="40" height="40">{BRAND}</a>
<nav class="nav" aria-label="Main">{a("/","Home","home")}{a("/articles/","Articles","articles")}{a("/about/","About","about")}{a("/contact/","Contact","contact")}</nav>
</div></header>
'''

FOOT = f'''<footer class="site-foot"><div class="wrap foot-grid">
<div><strong>{BRAND}</strong><br><span class="small">Plain-English dental health information. Educational only, not dental or medical advice. We are not a dentist directory or a booking service. In an emergency, call 911 or go to the nearest emergency room.</span></div>
<ul class="foot-links small">
<li><a href="/articles/">Articles</a></li><li><a href="/about/">About</a></li><li><a href="/contact/">Contact</a></li><li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms</a></li>
</ul>
<p class="small" style="margin:0">&copy;2026 {BRAND}. All rights reserved.</p>
</div></footer>
'''

def page(title, desc, path, body, cur="", noindex=False, og_img="/images/og.svg", extra_head="", scripts=""):
    return head(title, desc, path, og_img, noindex, extra_head) + nav(cur) + body + FOOT + scripts + "</body>\n</html>\n"

NOTE = '<aside class="note"><strong>Educational information only.</strong> This is not dental or medical advice. Ask a licensed dentist about your own situation.</aside>'

def card(a, level="h3"):
    return f'''<a class="card" href="/articles/{a["slug"]}/"><img src="/images/{a["slug"]}.svg" alt="{esc(a["alt"])}" width="1200" height="675" loading="lazy"><div class="body"><span class="tag">{a["tag"]}</span><{level}>{a["title"]}</{level}><p>{a["blurb"]}</p></div></a>'''

# ---------- images ----------
for slug, inner in svgs.S.items():
    w(f"images/{slug}.svg", svgs.wrap(1200, 675, esc(BY[slug]["alt"]), inner))
w("images/hero.svg", svgs.wrap(1600, 900, "A sunny street with a friendly dental office, trees and smiling tooth characters walking by", svgs.HERO))
w("images/og.svg", svgs.wrap(1200, 630, "The Nearest Dentists: dental health, explained plainly", svgs.OG))
w("images/logo.svg", svgs.LOGO)
assert set(svgs.S) == set(BY), set(svgs.S) ^ set(BY)

# ---------- articles ----------
for a in ARTS:
    path = f"/articles/{a['slug']}/"
    faq = "".join(f"<details><summary>{q}</summary><p>{ans}</p></details>" for q, ans in a["faq"])
    rel = "".join(f'<li><a href="/articles/{r}/">{BY[r]["title"]}</a></li>' for r in a["related"])
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": a["title"], "description": a["desc"],
          "image": f"https://{HOST}/images/{a['slug']}.svg", "dateModified": UPDATED,
          "author": {"@type": "Organization", "name": f"{BRAND} team"},
          "publisher": {"@type": "Organization", "name": BRAND}, "mainEntityOfPage": f"https://{HOST}{path}"}
    fld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": ans}} for q, ans in a["faq"]]}
    extra = f'<script type="application/ld+json">{json.dumps(ld)}</script>\n<script type="application/ld+json">{json.dumps(fld)}</script>\n'
    body = f'''<main id="main">
<div class="article-head"><div class="narrow">
<div class="crumbs"><a href="/">Home</a> / <a href="/articles/">Articles</a> / {a["tag"]}</div>
<h1>{a["title"]}</h1>
<div class="meta">By {BRAND} team &middot; Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></div>
<img class="hero-img" src="/images/{a["slug"]}.svg" alt="{esc(a["alt"])}" width="1200" height="675">
</div></div>
<article class="narrow prose">
{NOTE}
{a["body"]}
<section class="faq"><h2>Frequently asked questions</h2>{faq}</section>
<nav class="related" aria-label="Related articles"><h2 style="margin-top:0">Related articles</h2><ul>{rel}</ul></nav>
</article>
</main>
'''
    w(f"articles/{a['slug']}/index.html", page(a["title"], a["desc"], path, body, "articles", og_img=f"/images/{a['slug']}.svg", extra_head=extra))

# ---------- articles index ----------
groups = []
for t in ["Finding a dentist", "Visits", "Procedures", "Kids' teeth", "Emergencies", "Paying for care", "Everyday care"]:
    items = [a for a in ARTS if a["tag"] == t]
    if items:
        groups.append(f'<h2>{t}</h2><div class="cards">{"".join(card(a) for a in items)}</div>')
body = f'''<main id="main">
<div class="article-head"><div class="wrap">
<h1>Dental health articles</h1>
<p class="lead" style="max-width:44rem">Plain-English guides to choosing a dentist, understanding visits and procedures, caring for kids' teeth, handling emergencies and paying for care. Every article is written by {BRAND} team and last reviewed {UPDATED_H}.</p>
{NOTE}
</div></div>
<div class="wrap" style="padding-bottom:40px">{"".join(groups)}</div>
</main>
'''
w("articles/index.html", page("Dental Health Articles", "Browse every guide from The Nearest Dentists: choosing a dentist, checkups, fillings, crowns, root canals, kids' teeth, emergencies and dental costs.", "/articles/", body, "articles"))

# ---------- home ----------
featured = ["dental-emergency-guide", "how-to-choose-a-dentist", "what-happens-at-a-dental-checkup", "root-canal-treatment-explained", "kids-first-dental-visit", "understanding-dental-costs"]
body = f'''<main id="main">
<section class="hero"><div class="wrap hero-grid">
<div>
<span class="kicker">Dental health, explained plainly</span>
<h1>Less mystery, more smiles.</h1>
<p class="lead">{BRAND} explains the dental stuff nobody has time to explain in the chair: how to pick a dentist, what happens at a checkup, what fillings, crowns and root canals really involve, how to look after little teeth, and what to do when something goes wrong.</p>
<p><a class="btn" href="/articles/">Browse the guides</a> <a class="btn alt" href="#triage">Emergency checker</a></p>
</div>
<div class="hero-art"><img src="/images/hero.svg" alt="A sunny street with a friendly dental office, trees and smiling tooth characters walking by" width="1600" height="900"></div>
</div></section>

<section class="block"><div class="wrap">
<h2 style="margin-top:0">Start here</h2>
<p style="max-width:48rem">Every guide on this site is written in plain language by {BRAND} team, using widely accepted guidance from dental and public health organisations. We do not rank dentists, sell appointments or quote prices. Our aim is simpler: help you walk into your next appointment knowing the right questions to ask.</p>
<div class="cards">{"".join(card(BY[s]) for s in featured)}</div>
<p class="center" style="margin-top:24px"><a class="btn alt" href="/articles/">See all {len(ARTS)} articles</a></p>
</div></section>

<section class="block tint" id="triage"><div class="narrow">
<h2 style="margin-top:0">Is this a dental emergency?</h2>
<p>Tick anything that matches what is happening right now. This quick checker only sorts symptoms into general urgency levels; it cannot diagnose anything, and it is not a substitute for a dentist, doctor or emergency service. <strong>If you are worried, contact a dentist or seek emergency care anyway.</strong></p>
<form class="triage" id="triage-form" onsubmit="return false">
<fieldset><legend>Serious warning signs</legend><div class="grid">
<label><input type="checkbox" name="r" value="breath">Trouble breathing or swallowing</label>
<label><input type="checkbox" name="r" value="swell">Swelling spreading across the face, toward the eye or down the neck</label>
<label><input type="checkbox" name="r" value="fever">Fever or feeling very unwell with facial swelling</label>
<label><input type="checkbox" name="r" value="bleed">Mouth bleeding that has not slowed after 15 minutes of firm pressure</label>
<label><input type="checkbox" name="r" value="jaw">Possible broken jaw, jaw that will not close, or a head injury</label>
</div></fieldset>
<fieldset><legend>Urgent dental problems</legend><div class="grid">
<label><input type="checkbox" name="u" value="knock">An adult (permanent) tooth has been knocked out</label>
<label><input type="checkbox" name="u" value="loose">A tooth is loose or pushed out of place after an injury</label>
<label><input type="checkbox" name="u" value="pain">Severe or throbbing toothache, or pain that wakes you up</label>
<label><input type="checkbox" name="u" value="gum">Swollen gum, a pimple-like bump or a bad taste near a tooth</label>
<label><input type="checkbox" name="u" value="break">A large break in a tooth, or a broken tooth that hurts</label>
</div></fieldset>
<fieldset><legend>Less urgent, but still worth a call</legend><div class="grid">
<label><input type="checkbox" name="m" value="filling">Lost filling or crown without much pain</label>
<label><input type="checkbox" name="m" value="chip">Small chip with no pain</label>
<label><input type="checkbox" name="m" value="sens">Mild sensitivity to hot or cold</label>
<label><input type="checkbox" name="m" value="wire">Poking brace wire or loose bracket</label>
</div></fieldset>
<button class="btn" type="button" id="triage-btn">Check urgency</button>
<button class="btn alt" type="reset" id="triage-reset">Clear</button>
<div id="triage-out" aria-live="polite"></div>
</form>
<p class="small">Knocked-out adult tooth? Hold it by the crown, rinse briefly if dirty, try to put it back or keep it in milk, and see a dentist right away. Read the full <a href="/articles/dental-emergency-guide/">dental emergency guide</a>.</p>
</div></section>

<section class="block"><div class="wrap">
<h2 style="margin-top:0">What you will find here</h2>
<div class="pillars">
<div class="pillar"><h3>Finding and choosing a dentist</h3><p>How to shortlist practices, check a licence, ask the right first-call questions and spot red flags, whether you are new in town or ready for a change.</p></div>
<div class="pillar"><h3>Procedures, demystified</h3><p>Cleanings, X-rays, fillings, crowns and root canals explained step by step, including what recovery normally feels like and when to call the office.</p></div>
<div class="pillar"><h3>Kids' teeth</h3><p>From the first tooth and first visit to sealants, sports mouthguards and teenage habits, with age-by-age advice you can use tonight at bath time.</p></div>
<div class="pillar"><h3>Paying for care</h3><p>No made-up price lists. Instead, the factors that move a bill up or down, insurance jargon decoded, and lower-cost places to look for care.</p></div>
</div>
<p style="max-width:48rem;margin-top:28px">A quick word on what we are not: {BRAND} is an educational website. We are not a dental practice, a directory of dentists or an appointment booking service, and nothing here replaces an exam by a licensed dentist. When you are ready to find care, our guide to <a href="/articles/how-to-choose-a-dentist/">choosing a dentist</a> walks you through doing it yourself, and our guide to <a href="/articles/understanding-dental-costs/">paying for dental care</a> explains how to ask for a clear estimate before treatment starts.</p>
</div></section>
</main>
'''
w("index.html", page(BRAND, "Friendly, plain-English dental health guides: choosing a dentist, checkups, fillings, crowns, root canals, kids' teeth, emergencies and paying for care.", "/", body, "home", scripts='<script src="/assets/site.js" defer></script>\n'))

# ---------- about ----------
body = f'''<main id="main"><div class="article-head"><div class="narrow"><h1>About {BRAND}</h1></div></div>
<div class="narrow prose">
<p>{BRAND} is an independent educational website about dental health. We write clear, practical guides for people who want to understand their teeth, their options and their dental visits a little better, without jargon and without a sales pitch.</p>
<h2>What we cover</h2>
<p>Our articles explain how to find and choose a dentist, what happens during checkups and cleanings, how common procedures such as fillings, crowns and root canals work, how to care for children's teeth at each age, what to do in a dental emergency, and how dental costs and insurance generally work. We describe the factors that affect costs rather than quoting prices, because fees vary widely by location, practice and the specifics of each case.</p>
<h2>What we are not</h2>
<p>We are not a dental practice, and we do not provide diagnosis or treatment. We are not a directory of dentists, we do not rank or recommend individual practices, and we do not book appointments. Everything on this site is general educational information and is not a substitute for advice from a licensed dentist or doctor who can examine you. If you have severe symptoms such as spreading facial swelling, difficulty breathing or swallowing, or uncontrolled bleeding, call 911 or go to the nearest emergency room.</p>
<h2>How we write</h2>
<ul>
<li>Articles are written by {BRAND} team and are based on widely accepted guidance from dental and public health organisations.</li>
<li>We do not invent statistics, ratings, testimonials or prices, and we do not claim to have tested products.</li>
<li>Where guidance differs or is changing, we say so and suggest asking your dentist.</li>
<li>Each article shows the date it was last updated. We review content periodically and correct mistakes promptly.</li>
</ul>
<h2>How the site is funded</h2>
<p>{BRAND} is supported by advertising served by Google AdSense. Advertisers do not write or approve our articles, and ads do not influence what we publish. You can read how ads and cookies work on our <a href="/privacy/">privacy policy</a> page.</p>
<h2>Get in touch</h2>
<p>Spotted an error or have a topic you would like us to explain? We would love to hear from you on our <a href="/contact/">contact page</a>.</p>
</div></main>
'''
w("about/index.html", page("About Us", "About The Nearest Dentists: an independent, plain-English dental health information site. Educational only; not a dentist directory or booking service.", "/about/", body, "about"))

# ---------- contact ----------
body = f'''<main id="main"><div class="article-head"><div class="narrow"><h1>Contact us</h1></div></div>
<div class="narrow prose">
<p>The easiest way to reach {BRAND} team is by email: <a href="mailto:{EMAIL}"><strong>{EMAIL}</strong></a>. We read every message and aim to reply within a few business days.</p>
<h2>Good reasons to write</h2>
<ul>
<li>You spotted something inaccurate, unclear or out of date in one of our articles.</li>
<li>You have a dental topic you would like us to explain in plain English.</li>
<li>You have a question about our privacy policy or terms.</li>
<li>You have a press, partnership or advertising enquiry.</li>
</ul>
<h2>What we cannot help with</h2>
<p>We are an educational website, not a dental practice, directory or booking service. We cannot diagnose symptoms, give personal dental or medical advice, recommend a specific dentist, or book or change appointments. Please contact a licensed dentist for questions about your own teeth.</p>
<aside class="note"><strong>Dental emergency?</strong> Do not email us. For trouble breathing or swallowing, spreading facial swelling, uncontrolled bleeding or a jaw or head injury, call 911 or go to the nearest emergency room. For other urgent problems, call a dentist.</aside>
<h2>Before you write</h2>
<p>To help us reply quickly, include the page address if your message is about a specific article, and please do not send personal health details we do not need.</p>
</div></main>
'''
w("contact/index.html", page("Contact", "Contact The Nearest Dentists by email with corrections, topic ideas or questions about the site. We cannot give personal dental advice or book appointments.", "/contact/", body, "contact"))

# ---------- privacy ----------
body = f'''<main id="main"><div class="article-head"><div class="narrow"><h1>Privacy policy</h1><div class="meta">Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></div></div></div>
<div class="narrow prose">
<p>This policy explains what information {BRAND} ({HOST}) collects when you visit, how it is used, and the choices you have. If you have questions, email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
<h2>Information we collect</h2>
<p>We do not ask you to create an account and we do not have forms on this site. If you email us, we receive your email address and whatever you choose to include, and we use it only to reply. Like most websites, our hosting provider and the services described below automatically receive technical information such as your IP address, browser type, device, pages viewed and referring site.</p>
<h2>Advertising and cookies</h2>
<p>This site uses Google AdSense to show advertisements. Cookies are small text files stored on your device.</p>
<ul>
<li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</li>
<li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visits to this site and/or other sites on the Internet.</li>
<li>You may opt out of personalised advertising by visiting Google's <a href="https://adssettings.google.com" rel="noopener">Ads Settings</a> (adssettings.google.com). You can also opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info" rel="noopener">www.aboutads.info</a>.</li>
<li>To learn more, read <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">How Google uses information from sites or apps that use its services</a>.</li>
</ul>
<p>Where required by law, such as for visitors in the European Economic Area, the UK and Switzerland, a consent message may ask for your choices about cookies before personalised ads are shown. Where you decline, Google may show non-personalised ads, which still use cookies for purposes such as frequency capping and fraud prevention.</p>
<h2>Analytics</h2>
<p>We use Google Tag Manager and Google Analytics to understand how visitors use the site, such as which pages are popular and how people find us. These tools use cookies and similar technologies to collect usage information, which Google processes on our behalf. You can learn more in Google's privacy policy and opt out using the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Google Analytics opt-out browser add-on</a>.</p>
<h2>Managing cookies</h2>
<p>Most browsers let you block or delete cookies in their settings. Blocking cookies may change the ads you see but will not stop you reading our articles.</p>
<h2>Health information</h2>
<p>Reading our articles does not require you to share any health information. Please do not email us personal health details; we cannot give personal advice.</p>
<h2>Children</h2>
<p>This site is intended for adults, including parents looking for information about children's teeth. We do not knowingly collect personal information from children under 13.</p>
<h2>Your rights</h2>
<p>Depending on where you live, you may have rights to access, correct or delete personal information we hold about you, or to object to certain processing. Email us to make a request.</p>
<h2>Changes</h2>
<p>We may update this policy from time to time. The date at the top shows when it last changed.</p>
</div></main>
'''
w("privacy/index.html", page("Privacy Policy", "How The Nearest Dentists uses cookies, Google AdSense advertising and Google Analytics, and how to opt out of personalised ads.", "/privacy/", body))

# ---------- terms ----------
body = f'''<main id="main"><div class="article-head"><div class="narrow"><h1>Terms of use</h1><div class="meta">Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></div></div></div>
<div class="narrow prose">
<p>By using {HOST} you agree to these terms. If you do not agree, please do not use the site.</p>
<h2>Educational information only</h2>
<p>Content on {BRAND} is general educational information about dental health. It is not dental, medical or financial advice, it does not create a dentist-patient relationship, and it is not a substitute for an examination by a licensed professional. Always ask a qualified dentist or doctor about your own situation. Never ignore professional advice or delay seeking it because of something you read here. In an emergency, call 911 or go to the nearest emergency room.</p>
<h2>No directory or booking service</h2>
<p>We do not list, rank, endorse or book appointments with dentists or practices. Any mention of types of providers or organisations is for general information.</p>
<h2>Accuracy</h2>
<p>We work to keep articles accurate and up to date, but dental guidance changes and individual situations vary. Content is provided "as is" without warranties of any kind. Costs, insurance rules and public programmes differ by plan and location; confirm details with the relevant provider.</p>
<h2>Advertising and links</h2>
<p>The site displays advertising served by third parties such as Google. We do not control advertisers' products, services or websites, and ads are not endorsements. Links to other websites are provided for convenience; we are not responsible for their content.</p>
<h2>Intellectual property</h2>
<p>Text and illustrations on this site belong to {BRAND} unless otherwise noted. You may share links and short quotations with attribution. Please do not republish whole articles or illustrations without permission.</p>
<h2>Limitation of liability</h2>
<p>To the fullest extent permitted by law, {BRAND} is not liable for any loss or damage arising from your use of, or reliance on, the site.</p>
<h2>Changes and contact</h2>
<p>We may update these terms; the date above shows the latest version. Questions: <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</div></main>
'''
w("terms/index.html", page("Terms of Use", "Terms of use for The Nearest Dentists: educational dental information only, not professional advice, and not a directory or booking service.", "/terms/", body))

# ---------- 404 ----------
body = f'''<main id="main"><section class="block"><div class="narrow center">
<img src="/images/dental-emergency-guide.svg" alt="A surprised tooth character with a bandage" width="1200" height="675" style="border-radius:24px;margin-bottom:12px">
<h1>Oops, that page has gone missing</h1>
<p>Like a lost filling, this page is not where it should be. Try the <a href="/">home page</a> or browse all our <a href="/articles/">dental health articles</a>.</p>
</div></section></main>
'''
w("404.html", page("Page Not Found", "The page you were looking for could not be found on The Nearest Dentists. Browse our dental health articles instead.", "/404.html", body, noindex=True))

# ---------- contact.html ----------
w("contact.html", f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact | {BRAND}</title><meta name="robots" content="noindex">
<link rel="canonical" href="https://{HOST}/contact/"><meta http-equiv="refresh" content="0; url=/contact/"></head>
<body><p>Our contact page has moved. <a href="/contact/">Go to the contact page</a>.</p></body></html>
''')

# ---------- robots, sitemap, ads, redirects ----------
w("robots.txt", f"User-agent: *\nAllow: /\nDisallow: /preview/\n\nUser-agent: Mediapartners-Google\nAllow: /\n\nSitemap: https://{HOST}/sitemap.xml\n")
w("_redirects", "/preview/*  /  301\n/preview    /  301\n")
w("ads.txt", "google.com, pub-5194583669093303, DIRECT, f08c47fec0942fa0\n")
urls = ["/", "/articles/", "/about/", "/contact/", "/privacy/", "/terms/"] + [f"/articles/{a['slug']}/" for a in ARTS]
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
    f"  <url><loc>https://{HOST}{u}</loc><lastmod>{UPDATED}</lastmod></url>\n" for u in urls) + "</urlset>\n"
w("sitemap.xml", sm)
print("built", len(ARTS), "articles")
