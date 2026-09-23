import os, re, json, html
import images
from arts1 import ARTS as A1
from arts2 import ARTS as A2
from arts3 import ARTS as A3

OUT = '/home/user/domains/fplb'
HOST = 'forpetslikeblue.com'
BRAND = 'For Pets Like Blue'
EMAIL = 'blue@forpetslikeblue.com'
PUB = 'ca-pub-5194583669093303'
GTM = 'GTM-MV4SK9DN'
UPDATED = '2026-09-23'
UPDATED_H = 'September 23, 2026'
ARTS = A1 + A2 + A3
BY = {a['slug']: a for a in ARTS}


def w(rel, s):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        f.write(s)


def esc(s):
    return html.escape(s, quote=True)


def head(title, desc, path, og_img='/images/og.svg', typ='website', extra=''):
    full = f'{title} | {BRAND}' if title != BRAND else f'{BRAND} | Practical, warm dog & cat care'
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(full)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="https://{HOST}{path}">
<meta name="google-adsense-account" content="{PUB}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={PUB}" crossorigin="anonymous"></script>
<script>window.dataLayer=window.dataLayer||[];</script>
<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);}})(window,document,'script','dataLayer','{GTM}');</script>
<meta property="og:site_name" content="{BRAND}">
<meta property="og:type" content="{typ}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="https://{HOST}{path}">
<meta property="og:image" content="https://{HOST}{og_img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#fdf7f4">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap">
<link rel="stylesheet" href="/assets/site.css">
{extra}</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={GTM}" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>
<a class="skip" href="#main">Skip to content</a>
'''


def header(active=''):
    def li(href, label, key):
        cur = ' aria-current="page"' if key == active else ''
        return f'<li><a href="{href}"{cur}>{label}</a></li>'
    return f'''<header class="site-head"><div class="wrap">
<a class="brand" href="/"><img src="/images/logo.svg" alt="" width="40" height="40"><span>For Pets <b>Like Blue</b></span></a>
<nav class="site-nav" aria-label="Main"><ul>{li("/", "Home", "home")}{li("/articles/", "Articles", "articles")}{li("/about/", "About", "about")}{li("/contact/", "Contact", "contact")}</ul></nav>
</div></header>
'''


FOOT = f'''<footer class="site-foot"><div class="wrap">
<p><strong>For Pets Like Blue</strong> — practical, warm care guides for dogs and cats.</p>
<ul><li><a href="/about/">About</a></li><li><a href="/contact/">Contact</a></li><li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms</a></li><li><a href="/articles/">All articles</a></li></ul>
<p>Our guides are general information, not veterinary advice. Always talk to your vet about your own pet’s health.</p>
<p>© 2026 For Pets Like Blue. All rights reserved.</p>
</div></footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
'''


def page(title, desc, path, active, main, **kw):
    return head(title, desc, path, **kw) + header(active) + f'<main id="main">\n{main}\n</main>\n' + FOOT


def card(a, h='h3'):
    return (f'<a class="card" href="/articles/{a["slug"]}/" data-cat="{a["cat"].replace(" ", "-")}">'
            f'<img src="/images/{a["slug"]}.svg" alt="" width="1200" height="675" loading="lazy">'
            f'<div class="card-body"><span class="tag {a["cat"].replace(" ", "-")}">{a["cat"]}</span>'
            f'<{h}>{esc(a["short"][0].upper() + a["short"][1:])}</{h}><p>{esc(a["teaser"])}</p></div></a>')


VET_NOTE = ('<aside class="note vet" role="note"><strong>Talk to your vet.</strong> This guide is general information for '
            'healthy pets, not veterinary advice. Every animal is different — if you are worried about your pet’s health, '
            'or anything here does not match what you are seeing, contact your vet.</aside>')


def words(s):
    t = re.sub(r'<[^>]+>', ' ', s)
    return len(re.findall(r"[A-Za-z0-9'’-]+", t))


# ---------------- images
os.makedirs(f'{OUT}/images', exist_ok=True)
for slug, (s, d) in images.IMG.items():
    w(f'images/{slug}.svg', s)
w('images/hero.svg', images.HERO)
w('images/og.svg', images.OG)
w('images/logo.svg', images.LOGO)
w('images/lost-dog.svg', images.NOTFOUND)

# ---------------- articles
for a in ARTS:
    assert a['slug'] in images.IMG, a['slug']
    for r in a['related']:
        assert r in BY, r
    wc = words(a['body']) + sum(words(q) + words(x) for q, x in a['faq'])
    mins = max(4, round(wc / 220))
    faq = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(x)}</p></details>' for q, x in a['faq'])
    rel = ''.join(card(BY[r], 'h3') for r in a['related'])
    ld = {
        '@context': 'https://schema.org', '@type': 'Article', 'headline': a['title'],
        'description': a['desc'], 'image': f'https://{HOST}/images/{a["slug"]}.svg',
        'datePublished': UPDATED, 'dateModified': UPDATED,
        'author': {'@type': 'Organization', 'name': f'The {BRAND} team'},
        'publisher': {'@type': 'Organization', 'name': BRAND, 'logo': {'@type': 'ImageObject', 'url': f'https://{HOST}/images/logo.svg'}},
        'mainEntityOfPage': f'https://{HOST}/articles/{a["slug"]}/',
    }
    faqld = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': x}} for q, x in a['faq']]}
    extra = (f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n'
             f'<script type="application/ld+json">{json.dumps(faqld, ensure_ascii=False)}</script>\n')
    alt = images.IMG[a['slug']][1]
    main = f'''<article class="wrap narrow">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/articles/">Articles</a> › {esc(a["cat"])}</nav>
<span class="tag {a["cat"].replace(" ", "-")}">{a["cat"]}</span>
<h1>{esc(a["title"])}</h1>
<p class="byline">By the For Pets Like Blue team · Updated <time datetime="{UPDATED}">{UPDATED_H}</time> · {mins} min read</p>
<figure class="hero-fig"><img src="/images/{a["slug"]}.svg" alt="{esc(alt)}" width="1200" height="675"></figure>
{VET_NOTE if a["health"] else ""}
<div class="prose">
{a["body"].strip()}
</div>
<section class="faq" aria-labelledby="faq-h"><h2 id="faq-h">Frequently asked questions</h2>
{faq}
</section>
<section class="related" aria-labelledby="rel-h"><h2 id="rel-h">Related articles</h2>
<div class="cards">{rel}</div>
</section>
</article>'''
    w(f'articles/{a["slug"]}/index.html',
      page(a['title'], a['desc'], f'/articles/{a["slug"]}/', 'articles', main,
           og_img=f'/images/{a["slug"]}.svg', typ='article', extra=extra))

# ---------------- articles index
cats = []
for a in ARTS:
    if a['cat'] not in cats:
        cats.append(a['cat'])
chips = '<button type="button" class="chip" data-filter="all" aria-pressed="true">All</button>' + ''.join(
    f'<button type="button" class="chip" data-filter="{c.replace(" ", "-")}" aria-pressed="false">{c}</button>' for c in cats)
main = f'''<section class="band"><div class="wrap">
<span class="eyebrow">The library</span>
<h1>Dog and cat care articles</h1>
<p class="lead">Every guide here is written to be practical: clear steps, checklists you can print or screenshot, and honest notes about when a question belongs with your vet. Pick a topic below or filter by category.</p>
<p>We cover the everyday parts of living with a dog or cat — settling a new pet in, training with rewards, enrichment that does not cost a fortune, grooming jobs like teeth and nails, travel, hot-weather safety and looking after older animals. New guides are added over time, and existing ones are reviewed and updated.</p>
<div role="group" aria-label="Filter articles by category" class="chips">{chips}</div>
<div class="cards">{"".join(card(a, "h2") for a in ARTS)}</div>
</div></section>'''
w('articles/index.html', page('Dog & Cat Care Articles', 'Practical, friendly guides to dog and cat care: new pets, training, enrichment, grooming, travel, safety and senior pets, from the For Pets Like Blue team.', '/articles/', 'articles', main))

# ---------------- home
feat = ['first-week-with-a-new-dog', 'bringing-home-a-new-cat', 'loose-leash-walking', 'indoor-cat-play-and-enrichment',
        'dog-enrichment-on-a-budget', 'caring-for-a-senior-dog']
seg = lambda name, opts, default: ''.join(
    f'<label><input type="radio" name="{name}" value="{v}"{" checked" if v == default else ""}><span>{l}</span></label>' for v, l in opts)
main = f'''<section class="hero"><div class="wrap">
<div>
<span class="eyebrow">Dogs · Cats · Everyday care</span>
<h1>Practical, warm care for pets like Blue</h1>
<p class="lead">Friendly, step-by-step guides for the everyday parts of life with a dog or cat — from the nervous first week to the slow, sweet senior years.</p>
<div class="btn-row"><a class="btn" href="/articles/">Browse the guides</a><a class="btn alt" href="#boredom-buster">Try the boredom buster</a></div>
</div>
<div class="hero-art"><img src="/images/hero.svg" alt="Blue, a happy blue-grey dog, stands in a sunny garden with a ball and a bone while an orange cat naps on a fence." width="1600" height="900"></div>
</div></section>

<section class="band"><div class="wrap">
<h2>What you will find here</h2>
<p>Every pet is somebody’s Blue: the particular, quirky animal who sleeps in a funny position, has opinions about the vacuum cleaner and knows exactly when dinner is late. For Pets Like Blue is a small library of practical care guides written with that animal in mind. We focus on the things owners actually do at home — setting up a safe space, building routines, teaching manners with rewards, keeping busy minds entertained, and handling grooming jobs that nobody enjoys at first.</p>
<p>We keep our advice general and honest. We do not rank products or pretend to have tested gear. Instead, we explain how to choose categories of kit, what to look out for, and when a question really belongs with your vet. Health topics carry a clear “talk to your vet” note, because nobody knows your pet’s health better than the professional who examines them.</p>
<div class="pillars">
<div class="pillar"><h3>New pets</h3><p>First-week plans for dogs and cats, safe rooms, litter setups and slow introductions.</p></div>
<div class="pillar"><h3>Training</h3><p>Reward-based, step-by-step guides for loose-leash walking, crate training and more.</p></div>
<div class="pillar"><h3>Enrichment</h3><p>Sniffing games, hunting play and budget brain games made from household items.</p></div>
<div class="pillar"><h3>Care &amp; safety</h3><p>Teeth, nails, road trips, first-aid kits, hot weather and caring for older pets.</p></div>
</div>
</div></section>

<section class="band tint" id="boredom-buster"><div class="wrap home-widget">
<div>
<span class="eyebrow">Interactive</span>
<h2>The boredom buster</h2>
<p>Rainy afternoon? Zoomies at bedtime? Tell us who is bored, how much time you have and what kind of mood they are in, and we will suggest a quick game or enrichment idea you can do with things around the house.</p>
<p>Every idea links to a fuller guide. Keep safety in mind: supervise games with cardboard, paper or string, and count treats as part of the daily food allowance.</p>
</div>
<form class="widget" id="picker" aria-label="Boredom buster idea picker">
<fieldset><legend>Who is bored?</legend><div class="seg">{seg("pet", [("dog", "Dog"), ("cat", "Cat")], "dog")}</div></fieldset>
<fieldset><legend>How much time do you have?</legend><div class="seg">{seg("time", [("5", "5 min"), ("15", "15 min"), ("30", "30 min")], "15")}</div></fieldset>
<fieldset><legend>Their mood right now</legend><div class="seg">{seg("energy", [("calm", "Calm"), ("bouncy", "Bouncy")], "bouncy")}</div></fieldset>
<button class="btn" type="submit">Give me an idea</button>
<div class="idea" id="idea" aria-live="polite"><h3>Ready when you are</h3><p>Choose your options and press the button for a boredom-busting idea.</p></div>
</form>
</div></section>

<section class="band"><div class="wrap">
<h2>Featured guides</h2>
<p>A good place to start, whether you are bringing a pet home next weekend or looking for ways to make an old friend’s days a little easier.</p>
<div class="cards">{"".join(card(BY[s]) for s in feat)}</div>
<div class="btn-row"><a class="btn alt" href="/articles/">See all {len(ARTS)} articles</a></div>
</div></section>

<section class="band"><div class="wrap">
<h2>More from For Pets Like Blue</h2>
<div class="more-links">
<a href="/pet-shopping-checklist/">Pet shopping checklist<small>Write a better brief before your next pet purchase.</small></a>
<a href="/guides/pet-portrait-selection/">Choosing a pet portrait<small>How to pick a portrait style from the photo you have.</small></a>
<a href="/offers/" rel="sponsored">Current pet offers (#ad)<small>Affiliate page — we may earn a commission if you buy.</small></a>
</div>
</div></section>'''
w('index.html', page(BRAND, 'Practical, warm guides to dog and cat care: new-pet checklists, reward-based training, enrichment games, grooming, travel, hot-weather safety and senior pets.', '/', 'home', main))

# ---------------- about
main = f'''<section class="band"><div class="wrap narrow">
<span class="eyebrow">About us</span>
<h1>About For Pets Like Blue</h1>
<p class="lead">A friendly library of practical dog and cat care guides, written for the particular animal in your life.</p>
<h2>Why “Blue”?</h2>
<p>Every pet owner knows their animal is not a generic dog or cat. They are Blue, or Biscuit, or Mr Whiskers — with their own fears, favourite spots and funny habits. The name is a reminder that good care starts with the individual animal in front of you, not a one-size-fits-all rule.</p>
<h2>What we write about</h2>
<p>We publish practical, step-by-step guides on the everyday parts of life with dogs and cats: settling in a new pet, reward-based training, enrichment and play, grooming jobs like tooth brushing and nail trims, travelling together, staying safe in hot weather, building a first-aid kit, and caring for older pets.</p>
<p>Our articles are written by the For Pets Like Blue team and draw on widely accepted, mainstream pet care guidance. We aim to be clear about what is a firm safety rule (never give pets human painkillers; never leave them in a hot car) and what is a flexible rule of thumb.</p>
<h2>What we do not do</h2>
<ul>
<li>We do not diagnose, treat or give individual veterinary advice. Health-related articles carry a “talk to your vet” note.</li>
<li>We do not publish fake product rankings, invented reviews or made-up statistics. When we talk about gear, we explain categories and how to choose.</li>
<li>We do not claim credentials we do not have.</li>
</ul>
<h2>How the site is funded</h2>
<p>For Pets Like Blue is published by Marketing Apes LLC. The site is supported by advertising, including ads served by Google AdSense. Some pages, such as our <a href="/offers/" rel="sponsored">offers page</a>, contain affiliate links, which are clearly labelled; if you buy through them we may earn a commission at no extra cost to you. Advertising and affiliate relationships do not decide what our care guides say.</p>
<h2>Corrections and suggestions</h2>
<p>If you spot something that looks wrong or out of date, or there is a topic you would like us to cover, please <a href="/contact/">get in touch</a>. We review articles periodically and update them when guidance changes.</p>
</div></section>'''
w('about/index.html', page('About Us', 'Who is behind For Pets Like Blue, what we write about, how the site is funded, and our approach to honest, practical dog and cat care guides.', '/about/', 'about', main))

# ---------------- contact
main = f'''<section class="band"><div class="wrap narrow">
<span class="eyebrow">Say hello</span>
<h1>Contact For Pets Like Blue</h1>
<p class="lead">The best way to reach us is by email: <a href="mailto:{EMAIL}">{EMAIL}</a></p>
<h2>What to write to us about</h2>
<ul>
<li><strong>Corrections</strong> — if something in an article looks inaccurate or out of date, tell us which page and what you noticed.</li>
<li><strong>Topic ideas</strong> — questions about dog and cat care you would like a guide on.</li>
<li><strong>Accessibility</strong> — anything on the site that is hard to read or use.</li>
<li><strong>Privacy requests</strong> — questions about the data described in our <a href="/privacy/">privacy policy</a>.</li>
<li><strong>Business and advertising enquiries</strong>.</li>
</ul>
<h2>What we cannot help with</h2>
<p>We are not a veterinary practice and cannot give advice about an individual pet’s health, diagnose symptoms or recommend medication doses. If your pet is unwell, please contact your own vet. If it is an emergency, call your nearest emergency veterinary clinic straight away.</p>
<h2>Response times</h2>
<p>We read every message and aim to reply within a few working days. Please do not send sensitive personal information by email.</p>
</div></section>'''
w('contact/index.html', page('Contact', f'Contact the For Pets Like Blue team at {EMAIL} with corrections, topic ideas, accessibility feedback, privacy requests or business enquiries.', '/contact/', 'contact', main))

# ---------------- privacy
main = f'''<section class="band"><div class="wrap narrow">
<h1>Privacy policy</h1>
<p class="byline">Last updated: <time datetime="{UPDATED}">{UPDATED_H}</time></p>
<p>This policy explains what information is collected when you visit forpetslikeblue.com (“For Pets Like Blue”, “we”, “us”), how it is used and the choices you have. The site is published by Marketing Apes LLC.</p>
<h2>Information we collect</h2>
<p>You can read our articles without creating an account or giving us your name. Our content pages have no sign-up forms. If you email us, we receive your email address and whatever you include in your message, and we use it only to reply and keep a record of the conversation.</p>
<p>Like most websites, our hosting provider and the services described below automatically receive technical information such as your IP address, browser type, device type, referring page and the pages you visit.</p>
<h2>Cookies</h2>
<p>Cookies are small text files stored on your device. We and our partners use cookies and similar technologies to keep the site working, understand how it is used and show advertising.</p>
<h2>Advertising and Google AdSense</h2>
<p>We use Google AdSense to show ads on this site.</p>
<ul>
<li>Third-party vendors, including Google, use cookies to serve ads based on a user’s prior visits to this website or other websites.</li>
<li>Google’s use of advertising cookies enables it and its partners to serve ads to our users based on their visits to this site and/or other sites on the Internet.</li>
<li>You may opt out of personalised advertising by visiting Google’s <a href="https://adssettings.google.com" rel="noopener">Ads Settings</a>. You can also opt out of some third-party vendors’ use of cookies for personalised advertising at <a href="https://www.aboutads.info" rel="noopener">www.aboutads.info</a>.</li>
<li>To learn more, see <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">How Google uses information from sites or apps that use its services</a>.</li>
</ul>
<p>If you are in a region where consent is required for these cookies, such as the European Economic Area or the UK, you may be shown a consent message and can change your choices at any time.</p>
<h2>Analytics</h2>
<p>We use Google Tag Manager and Google Analytics to understand how visitors use the site, such as which articles are read and how people arrive. These tools use cookies and collect information like pages viewed, time on page, approximate location and device type. We use this information in aggregate to improve the site. You can install the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Google Analytics opt-out browser add-on</a> to prevent your data being used by Google Analytics.</p>
<h2>Affiliate links</h2>
<p>Some pages, such as our offers page, include affiliate links. If you click one, the retailer or affiliate network may set cookies to record that you came from our site. Their use of data is governed by their own privacy policies.</p>
<h2>How to control cookies</h2>
<p>Most browsers let you block or delete cookies in their settings. Blocking some cookies may affect how the site works, and you may still see ads — they will simply be less relevant.</p>
<h2>Children</h2>
<p>This site is intended for a general audience and is not directed at children under 13. We do not knowingly collect personal information from children.</p>
<h2>Your rights</h2>
<p>Depending on where you live, you may have rights to access, correct or delete personal information we hold about you, or to object to certain processing. To make a request, email us at the address below.</p>
<h2>Changes to this policy</h2>
<p>We may update this policy from time to time. The “last updated” date at the top shows when it last changed.</p>
<h2>Contact</h2>
<p>Questions about privacy? Email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</div></section>'''
w('privacy/index.html', page('Privacy Policy', 'How For Pets Like Blue uses cookies, Google AdSense advertising and Google Analytics, how to opt out of personalised ads, and how to contact us about your data.', '/privacy/', '', main))

# ---------------- terms
main = f'''<section class="band"><div class="wrap narrow">
<h1>Terms of use</h1>
<p class="byline">Last updated: <time datetime="{UPDATED}">{UPDATED_H}</time></p>
<p>By using forpetslikeblue.com you agree to these terms. If you do not agree, please do not use the site. The site is published by Marketing Apes LLC.</p>
<h2>General information, not veterinary advice</h2>
<p>The content on For Pets Like Blue is for general information and education only. It is not veterinary advice and is not a substitute for examination, diagnosis or treatment by a qualified veterinarian. Always seek the advice of your vet about your pet’s health. In an emergency, contact an emergency veterinary clinic immediately.</p>
<h2>Using our content</h2>
<p>All articles, illustrations and design on this site are owned by us or used with permission. You may read, share links to and print pages for personal, non-commercial use. Please do not copy, republish or sell our content without written permission.</p>
<h2>Accuracy</h2>
<p>We work to keep articles accurate and up to date, but pet care guidance changes and we cannot guarantee that every page is complete or current. You use the information at your own risk and should consider your own pet’s circumstances.</p>
<h2>Advertising and affiliate links</h2>
<p>The site shows advertising, including ads served by Google, and some pages contain labelled affiliate links. We are not responsible for the content, products or services of advertisers or third-party websites, and your dealings with them are between you and them.</p>
<h2>External links</h2>
<p>Links to other websites are provided for convenience. We do not control those sites and are not responsible for their content or privacy practices.</p>
<h2>Limitation of liability</h2>
<p>To the fullest extent permitted by law, For Pets Like Blue and Marketing Apes LLC are not liable for any loss or damage arising from your use of the site or reliance on its content.</p>
<h2>Changes</h2>
<p>We may update these terms at any time. Continued use of the site after changes means you accept the updated terms.</p>
<h2>Contact</h2>
<p>Questions about these terms? Email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</div></section>'''
w('terms/index.html', page('Terms of Use', 'The terms for using For Pets Like Blue, including our general-information disclaimer, content use, advertising and affiliate links, and liability.', '/terms/', '', main))

# ---------------- 404
nf = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page not found | {BRAND}</title>
<meta name="description" content="This page could not be found on For Pets Like Blue. Head back to the home page or browse our dog and cat care articles.">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
{header()}<main id="main"><section class="band"><div class="wrap narrow" style="text-align:center">
<img src="/images/lost-dog.svg" alt="A dog sniffing along a trail of paw prints" width="800" height="450" style="margin:0 auto 10px;border:3px solid #2d3142;border-radius:24px">
<h1>Oops — this trail went cold</h1>
<p class="lead">We could not find that page. It may have moved, or the link may be mistyped.</p>
<div class="btn-row" style="justify-content:center"><a class="btn" href="/">Back to home</a><a class="btn alt" href="/articles/">Browse articles</a></div>
</div></section></main>
{FOOT}'''
w('404.html', nf)

# ---------------- legacy contact.html
w('contact.html', f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact | {BRAND}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="https://{HOST}/contact/">
<meta http-equiv="refresh" content="0;url=/contact/">
</head>
<body>
<p>Our contact page has moved. <a href="/contact/">Go to the contact page</a>.</p>
</body>
</html>
''')

# ---------------- robots, redirects, sitemap
w('robots.txt', f'''User-agent: *
Allow: /
Allow: /ads.txt
Allow: /offers/
Allow: /guides/pet-portrait-selection/
Allow: /pet-shopping-checklist/
Disallow: /preview/

User-agent: Mediapartners-Google
Allow: /

Sitemap: https://{HOST}/sitemap.xml
''')
w('_redirects', '/preview/*  /  301\n/preview    /  301\n')
urls = ['/', '/articles/'] + [f'/articles/{a["slug"]}/' for a in ARTS] + ['/about/', '/contact/', '/privacy/', '/terms/',
        '/pet-shopping-checklist/', '/offers/', '/guides/pet-portrait-selection/']
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
    f'  <url><loc>https://{HOST}{u}</loc><lastmod>{UPDATED}</lastmod></url>\n' for u in urls) + '</urlset>\n'
w('sitemap.xml', sm)

for a in ARTS:
    print(a['slug'], words(a['body']) + sum(words(q) + words(x) for q, x in a['faq']))
