import os, json, html, sys
sys.path.insert(0, os.path.dirname(__file__))
from arts1 import ARTS as A1
from arts2 import ARTS as A2
from arts3 import ARTS as A3
import svgs

OUT = "/home/user/domains/tnt"
HOST = "tonedntasty.com"
BRAND = "Toned 'N Tasty"
PUB = "ca-pub-5194583669093303"
DATE = "2026-09-23"
DATE_H = "September 23, 2026"
EMAIL = "lindsay@tonedntasty.com"
ARTS = A1 + A2 + A3
BY = {a["slug"]: a for a in ARTS}
CAT = {"recipe": "Recipe", "nutrition": "Nutrition & meal prep", "training": "Training", "habits": "Habits"}


def esc(s):
    return html.escape(s, quote=True)


def head(title, desc, path, og_img="/images/og.svg", extra=""):
    url = f"https://{HOST}{path}"
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)} | {esc(BRAND)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta name="google-adsense-account" content="{PUB}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={PUB}" crossorigin="anonymous"></script>
<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);}})(window,document,'script','dataLayer','GTM-PNQ67NM');</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-D593ZH6Y9E"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag("js",new Date());gtag("config","G-D593ZH6Y9E");</script>
<meta property="og:type" content="website">
<meta property="og:site_name" content="{esc(BRAND)}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="https://{HOST}{og_img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffc93c">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&amp;family=Nunito+Sans:ital,wght@0,400;0,700;0,800;1,400&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
{extra}</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PNQ67NM" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<a class="skip" href="#main">Skip to content</a>
"""


def nav(active=""):
    def a(href, label, key):
        cur = ' aria-current="page"' if key == active else ''
        return f'<a href="{href}"{cur}>{label}</a>'
    return f"""<header class="site-head"><div class="wrap">
<a class="logo" href="/"><img src="/images/logo.svg" alt="" width="40" height="40">Toned &rsquo;N Tasty</a>
<nav class="nav" aria-label="Main">{a('/', 'Home', 'home')}{a('/articles/', 'Articles', 'articles')}{a('/about/', 'About', 'about')}{a('/contact/', 'Contact', 'contact')}</nav>
</div></header>
"""


FOOT = f"""<footer class="site-foot"><div class="wrap">
<nav aria-label="Footer"><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/articles/">All articles</a></nav>
<p>Eat well. Train hard. Stop guessing.</p>
<p>Content on this site is general information, not medical, dietary or fitness advice for your individual situation.</p>
<p>&copy; 2026 Toned &rsquo;N Tasty. All rights reserved.</p>
</div></footer>
"""


def page(title, desc, path, body, active="", og_img="/images/og.svg", extra="", script=False):
    js = '<script src="/assets/site.js" defer></script>\n' if script else ''
    return head(title, desc, path, og_img, extra) + nav(active) + body + FOOT + js + "</body>\n</html>\n"


def write(rel, content):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(content)


def card(a):
    return f"""<article class="card"><a href="/articles/{a['slug']}/"><img src="/images/{a['slug']}.svg" alt="{esc(a['alt'])}" width="1200" height="675" loading="lazy"><div class="body"><span class="chip {a['cat']}">{CAT[a['cat']]}</span><h3>{esc(a['short'])}</h3><p>{esc(a['card'])}</p></div></a></article>"""


# ---------- images ----------
for a in ARTS:
    write(f"images/{a['slug']}.svg", svgs.ARTICLE_SVG[a['slug']](a['short'], a['alt']))
write("images/hero.svg", svgs.hero())
write("images/og.svg", svgs.og())
write("images/logo.svg", svgs.logo())
write("images/empty-plate.svg", svgs.notfound())

# ---------- articles ----------
for a in ARTS:
    path = f"/articles/{a['slug']}/"
    faq = "".join(f"<details><summary>{esc(q)}</summary><p>{esc(ans)}</p></details>" for q, ans in a["faq"])
    rel = "".join(f'<li><a href="/articles/{r}/">{esc(BY[r]["title"])}</a></li>' for r in a["related"])
    ld = {
        "@context": "https://schema.org", "@type": "Article", "headline": a["title"], "description": a["desc"],
        "image": f"https://{HOST}/images/{a['slug']}.svg", "datePublished": DATE, "dateModified": DATE,
        "author": {"@type": "Organization", "name": "The Toned 'N Tasty team"},
        "publisher": {"@type": "Organization", "name": BRAND, "logo": {"@type": "ImageObject", "url": f"https://{HOST}/images/logo.svg"}},
        "mainEntityOfPage": f"https://{HOST}{path}",
    }
    fq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": ans}} for q, ans in a["faq"]]}
    extra = f'<script type="application/ld+json">{json.dumps(ld)}</script>\n<script type="application/ld+json">{json.dumps(fq)}</script>\n'
    body = f"""<main id="main" class="page"><div class="narrow">
<p class="crumbs"><a href="/">Home</a> / <a href="/articles/">Articles</a> / {CAT[a['cat']]}</p>
<article>
<div class="article-top">
<span class="chip {a['cat']}">{CAT[a['cat']]}</span>
<h1>{esc(a['title'])}</h1>
<div class="meta"><span>By the Toned &rsquo;N Tasty team</span><span aria-hidden="true">&bull;</span><span>Last updated <time datetime="{DATE}">{DATE_H}</time></span></div>
</div>
<figure class="art-hero"><img src="/images/{a['slug']}.svg" alt="{esc(a['alt'])}" width="1200" height="675"></figure>
{a['body']}
<section class="faq" aria-labelledby="faq-h"><h2 id="faq-h">Frequently asked questions</h2>{faq}</section>
<section class="related" aria-labelledby="rel-h"><h2 id="rel-h">Related articles</h2><ul>{rel}</ul></section>
</article>
</div></main>
"""
    write(f"articles/{a['slug']}/index.html", page(a["title"], a["desc"], path, body, "articles", f"/images/{a['slug']}.svg", extra))

# ---------- articles index ----------
groups = ""
for key, label, blurb in [
    ("recipe", "Recipes", "Real recipes with full ingredient lists and steps, built around a solid serving of protein."),
    ("nutrition", "Nutrition & meal prep", "How much protein, what to buy, how to prep, and how to store it safely."),
    ("training", "Training", "Beginner-friendly strength training and the principles that keep you progressing."),
    ("habits", "Habits", "The unglamorous part that makes everything else work."),
]:
    items = [a for a in ARTS if a["cat"] == key]
    groups += f'<section class="band"><div class="wrap"><h2>{label}</h2><p>{blurb}</p><div class="cards">{"".join(card(a) for a in items)}</div></div></section>\n'
body = f"""<main id="main">
<section class="hero"><div class="wrap"><h1>All <span>articles</span></h1><p class="lede">Every recipe, guide and plan on Toned &rsquo;N Tasty, grouped by topic. Start anywhere: each article links to the ones that pair well with it. Recipes include full ingredient lists and step-by-step method, and the training guides are written for people starting out or starting again.</p></div></section>
{groups}</main>
"""
write("articles/index.html", page("Articles: recipes, meal prep and beginner training",
      "Browse every Toned 'N Tasty article: high-protein recipes, meal prep guides, beginner strength training plans and habit-building advice.",
      "/articles/", body, "articles"))

# ---------- home ----------
feat = ["sheet-pan-chicken-fajitas", "protein-overnight-oats", "beginner-full-body-workout",
        "sunday-meal-prep-plan", "how-much-protein-do-you-need", "turkey-black-bean-chili"]
body = f"""<main id="main">
<section class="hero"><div class="wrap hero-grid">
<div>
<span class="chip">Fitness + food</span>
<h1>Fork in one hand. <span>Iron in the other.</span></h1>
<p class="lede">Toned &rsquo;N Tasty is a free recipe and training site for people who want to get stronger without living on plain chicken and rice. Eat well, train hard, stop guessing.</p>
<p><a class="btn" href="/articles/">Browse the articles</a> <a class="btn alt" href="#bowl">Spin a bowl</a></p>
</div>
<div class="hero-art"><img src="/images/hero.svg" alt="Illustration of a cheerful cook flipping a pan of vegetables with one hand and lifting a dumbbell with the other in a bright kitchen." width="1600" height="900"></div>
</div></section>

<section class="band lime"><div class="wrap">
<h2>Start here</h2>
<p>New to the site? These six pieces cover the basics: two dependable recipes, a meal prep system, a first strength program and the protein question everyone asks.</p>
<div class="cards">{"".join(card(BY[s]) for s in feat)}</div>
<p style="margin-top:22px"><a class="btn" href="/articles/">See all {len(ARTS)} articles</a></p>
</div></section>

<section class="band" id="bowl"><div class="wrap">
<h2>Spin-a-Bowl: dinner decided in one click</h2>
<p>Stuck on what to cook? Spin for a random protein, base, vegetable and sauce. Lock the parts you like and spin again for the rest. The protein number is a rough estimate from typical portions, just to give you a feel for how a bowl adds up.</p>
<div class="bowl">
<div class="bowl-grid">
<div class="slot" id="slot-protein"><div class="lab">Protein</div><div class="val" aria-live="polite">&nbsp;</div><label><input type="checkbox" id="lock-protein"> Lock protein</label></div>
<div class="slot" id="slot-base"><div class="lab">Base</div><div class="val" aria-live="polite">&nbsp;</div><label><input type="checkbox" id="lock-base"> Lock base</label></div>
<div class="slot" id="slot-veg"><div class="lab">Vegetables</div><div class="val" aria-live="polite">&nbsp;</div><label><input type="checkbox" id="lock-veg"> Lock vegetables</label></div>
<div class="slot" id="slot-sauce"><div class="lab">Sauce</div><div class="val" aria-live="polite">&nbsp;</div><label><input type="checkbox" id="lock-sauce"> Lock sauce</label></div>
</div>
<div class="bowl-actions"><button class="btn" id="bowl-spin" type="button">Spin again</button><a class="btn alt" href="/articles/salmon-rice-bowls/">See a full bowl recipe</a></div>
<p class="bowl-out" id="bowl-out" aria-live="polite">Press spin to build a bowl.</p>
</div>
</div></section>

<section class="band tomato"><div class="wrap">
<h2>What we believe</h2>
<div class="pillars">
<div class="pillar"><h3>Food you actually want</h3><p>Plans fail when they ask you to eat things you hate. We start from meals people genuinely enjoy, like fajitas, chili and noodle bowls, and make them work harder for you with more protein and more vegetables.</p></div>
<div class="pillar"><h3>The least training that works</h3><p>You don't need ninety minutes and a full gym. Three well-planned full-body sessions a week, with a little more weight or a few more reps over time, will take a beginner a long way.</p></div>
<div class="pillar"><h3>No guessing, no hype</h3><p>We explain the why behind every recommendation, use general guidelines from recognised bodies, and say plainly when something depends on you. No miracle foods, no magic supplements, no fake reviews.</p></div>
</div>
</div></section>

<section class="band"><div class="narrow">
<h2>How to use this site</h2>
<p>If you cook, start with the recipes. Each one lists every ingredient and step, gives a rough protein estimate, and suggests how to turn leftovers into lunches. Pair them with the <a href="/articles/sunday-meal-prep-plan/">90-minute meal prep plan</a> and you will have most of your week covered.</p>
<p>If you train, or want to, the <a href="/articles/beginner-full-body-workout/">beginner full-body workout</a> is a complete three-day plan, and <a href="/articles/progressive-overload-explained/">progressive overload explained</a> shows you how to keep improving. If you have tried and stopped before, read <a href="/articles/habits-that-stick/">how to build habits that stick</a> first. It is the least glamorous article here and probably the most useful.</p>
<div class="note">Everything on Toned &rsquo;N Tasty is general information for healthy adults. It is not medical, dietary or fitness advice for your personal situation. If you have a health condition, are pregnant, or are unsure whether a change is right for you, talk to a doctor or registered dietitian first.</div>
</div></section>
</main>
"""
write("index.html", page("High-protein recipes, meal prep and beginner training",
      "Toned 'N Tasty shares high-protein recipes, simple meal prep plans, beginner strength training and habit tips. Eat well, train hard, stop guessing.",
      "/", body, "home", script=True))

# ---------- about ----------
body = f"""<main id="main" class="page"><div class="narrow">
<h1>About Toned &rsquo;N Tasty</h1>
<p class="lead">Toned &rsquo;N Tasty is a small, independent website about the overlap between food and fitness: cooking meals with plenty of protein that still taste like something, and training in a way that fits into a normal week.</p>
<h2>Why this site exists</h2>
<p>A lot of fitness content makes eating well sound like a punishment and training sound like a second job. Most people don't quit because they lack willpower; they quit because the plan never fitted their life. We would rather start from the meals you already like and the time you actually have, then build from there.</p>
<h2>What you will find here</h2>
<ul>
<li><strong>Recipes</strong> with complete ingredient lists and step-by-step method, written to be cooked on a weeknight and reheated at lunch.</li>
<li><strong>Nutrition and meal prep guides</strong> that explain widely accepted guidelines in plain language, including how to store food safely.</li>
<li><strong>Beginner training plans</strong> built around simple, proven movement patterns and gradual progression.</li>
<li><strong>Habit advice</strong> for the moment when motivation runs out.</li>
</ul>
<h2>How we write</h2>
<p>Articles are written by the Toned &rsquo;N Tasty team. We don't invent test results, ratings, testimonials or expert credentials, and we don't rank products we haven't used. When we cite a guideline, such as a protein recommendation or a safe cooking temperature, we describe where it comes from, and we use rounded, approximate figures where values vary between brands and foods. Each article shows the date it was last updated.</p>
<h2>Not medical advice</h2>
<p>We are not your doctor, dietitian or personal trainer. The content here is general information intended for healthy adults. Please speak to a qualified professional before making significant changes to your diet or exercise routine, particularly if you have a medical condition, an injury, or are pregnant.</p>
<h2>Advertising</h2>
<p>This site is free to read and is supported by advertising, including ads served by Google. Ads are clearly separate from our articles, and advertisers have no say over what we write. You can read more in our <a href="/privacy/">privacy policy</a>.</p>
<h2>Say hello</h2>
<p>Spotted a mistake, cooked one of the recipes, or want to suggest a topic? We would love to hear from you on the <a href="/contact/">contact page</a>.</p>
</div></main>
"""
write("about/index.html", page("About us", "About Toned 'N Tasty: an independent food and fitness site sharing high-protein recipes, meal prep guides and beginner strength training.", "/about/", body, "about"))

# ---------- contact ----------
body = f"""<main id="main" class="page"><div class="narrow">
<h1>Contact us</h1>
<p class="lead">The best way to reach Toned &rsquo;N Tasty is by email. We read every message, and we reply as soon as we can.</p>
<div class="box"><h2 style="margin-top:.2em">Email</h2><p><a href="mailto:{EMAIL}">{EMAIL}</a></p></div>
<h2>What to write to us about</h2>
<ul>
<li><strong>Corrections:</strong> if you think something in an article is wrong or out of date, tell us which article and what you noticed. We review corrections carefully and update the page and its date.</li>
<li><strong>Recipe questions:</strong> substitutions, allergies, or a step that didn't make sense.</li>
<li><strong>Topic ideas:</strong> recipes you would like to see with more protein, or training questions you would like answered.</li>
<li><strong>Privacy requests:</strong> questions about the data described in our <a href="/privacy/">privacy policy</a>.</li>
<li><strong>Business enquiries:</strong> advertising or partnership questions.</li>
</ul>
<h2>What we can't help with</h2>
<p>We can't give personal medical, nutrition or injury advice by email. If you have symptoms, a health condition, or questions about medication or pregnancy, please contact your doctor or a registered dietitian.</p>
</div></main>
"""
write("contact/index.html", page("Contact", "Contact the Toned 'N Tasty team by email with corrections, recipe questions, topic ideas, privacy requests or business enquiries.", "/contact/", body, "contact"))

# ---------- privacy ----------
body = f"""<main id="main" class="page"><div class="narrow">
<h1>Privacy policy</h1>
<p><strong>Last updated:</strong> <time datetime="{DATE}">{DATE_H}</time></p>
<p>This policy explains what information is collected when you visit {HOST} ("Toned &rsquo;N Tasty", "we", "us"), how it is used, and the choices you have. If you have questions, email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
<h2>Information we collect</h2>
<p>We don't require you to create an account, and the site has no sign-up forms. If you email us, we receive your email address and whatever you choose to include, and we use it only to reply. Like most websites, our hosting provider and the third-party services described below automatically receive technical information such as your IP address, browser type, device type, pages visited and the date and time of your visit.</p>
<h2>Cookies and advertising</h2>
<p>This site is supported by advertising served by Google AdSense. In connection with those ads:</p>
<ul>
<li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</li>
<li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visits to this site and/or other sites on the Internet.</li>
<li>You may opt out of personalised advertising by visiting Google's <a href="https://adssettings.google.com" rel="noopener">Ads Settings</a>. You can also opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info" rel="noopener">www.aboutads.info</a>.</li>
<li>To learn more, see <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">How Google uses information from sites or apps that use its services</a>.</li>
</ul>
<p>If you opt out of personalised advertising, you may still see ads, but they will not be based on your browsing history. Depending on where you live, you may be shown a consent message that lets you choose how cookies are used before any non-essential cookies are set.</p>
<h2>Analytics</h2>
<p>We use Google Analytics and Google Tag Manager to understand how visitors use the site, for example which articles are read most. These tools use cookies and similar technologies to collect information such as pages viewed, time on page, approximate location derived from your IP address, and the website that referred you. We use this information in aggregate to improve the site. You can prevent Google Analytics from using your data by installing the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Google Analytics opt-out browser add-on</a>.</p>
<h2>Managing cookies</h2>
<p>Most browsers let you block or delete cookies through their settings. Blocking cookies won't stop you reading the site, although some features, such as remembering your ad preferences, may not work.</p>
<h2>How we use and share information</h2>
<p>We use information to run and improve the site, show advertising, respond to messages and keep the site secure. We don't sell your personal information. Information is shared only with the service providers described above, or where required by law.</p>
<h2>Your rights</h2>
<p>Depending on where you live, you may have rights to access, correct or delete personal information, or to object to certain processing. To make a request about information we hold, such as an email you sent us, contact us at <a href="mailto:{EMAIL}">{EMAIL}</a>. For data held by Google, use the tools linked above.</p>
<h2>Children</h2>
<p>This site is intended for adults and is not directed at children under 13. We don't knowingly collect personal information from children.</p>
<h2>Links to other sites</h2>
<p>Articles may link to other websites. We are not responsible for their privacy practices, so please read their policies.</p>
<h2>Changes to this policy</h2>
<p>We may update this policy from time to time. When we do, we will change the "last updated" date at the top of this page.</p>
</div></main>
"""
write("privacy/index.html", page("Privacy policy", "Toned 'N Tasty privacy policy: what information is collected, how Google AdSense advertising cookies and Google Analytics are used, and how to opt out.", "/privacy/", body))

# ---------- terms ----------
body = f"""<main id="main" class="page"><div class="narrow">
<h1>Terms of use</h1>
<p><strong>Last updated:</strong> <time datetime="{DATE}">{DATE_H}</time></p>
<p>By using {HOST} you agree to these terms. If you don't agree, please don't use the site.</p>
<h2>General information only</h2>
<p>Everything on Toned &rsquo;N Tasty, including recipes, nutrition guides and training plans, is general information for healthy adults. It is not medical, nutritional, dietary or fitness advice for your individual situation, and it does not create any professional relationship. Always consult a qualified healthcare professional before starting a new diet or exercise program, especially if you have a medical condition, injury, allergy or are pregnant.</p>
<h2>Exercise and food safety</h2>
<p>Physical activity involves some risk of injury. You are responsible for exercising within your own limits, using appropriate equipment and stopping if you feel pain, dizziness or discomfort. When cooking, follow safe food-handling practices, check ingredients for allergens, and use a food thermometer where we recommend a temperature. Nutrition figures on the site are approximate estimates.</p>
<h2>Accuracy</h2>
<p>We work to keep content accurate and up to date, but we make no guarantees that it is complete, current or error-free. Guidelines change, and individual needs vary. If you spot an error, please <a href="/contact/">let us know</a>.</p>
<h2>Intellectual property</h2>
<p>The text, illustrations and design of this site belong to Toned &rsquo;N Tasty unless stated otherwise. You may share links to our pages and print articles for personal, non-commercial use. Please don't republish our content without permission.</p>
<h2>Advertising and third-party links</h2>
<p>The site displays advertising from third parties, including Google. We don't endorse advertised products, and we are not responsible for the content of third-party websites that we link to or that appear in ads.</p>
<h2>Limitation of liability</h2>
<p>To the fullest extent permitted by law, Toned &rsquo;N Tasty is not liable for any loss or injury arising from your use of the site or reliance on its content.</p>
<h2>Changes</h2>
<p>We may update these terms at any time by posting a new version on this page with a new "last updated" date.</p>
<h2>Contact</h2>
<p>Questions about these terms can be sent to <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</div></main>
"""
write("terms/index.html", page("Terms of use", "The terms of use for Toned 'N Tasty, including our not-medical-advice notice, exercise and food safety responsibilities, and content use.", "/terms/", body))

# ---------- 404 ----------
nf = head("Page not found", "The page you were looking for on Toned 'N Tasty could not be found. Browse our recipes, meal prep guides and training articles instead.", "/404.html",
          extra='<meta name="robots" content="noindex">\n') + nav() + """<main id="main" class="page"><div class="narrow" style="text-align:center">
<img src="/images/empty-plate.svg" alt="Illustration of an empty plate with a question mark on it." width="600" height="400" style="margin:24px auto;max-width:420px">
<h1>This plate is empty</h1>
<p class="lead">We couldn't find that page. It may have moved, or the link may have a typo.</p>
<p><a class="btn" href="/">Back to home</a> <a class="btn alt" href="/articles/">Browse articles</a></p>
</div></main>
""" + FOOT + "</body>\n</html>\n"
write("404.html", nf)

# ---------- contact.html (legacy) ----------
write("contact.html", f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact | {esc(BRAND)}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="https://{HOST}/contact/">
<meta http-equiv="refresh" content="0; url=/contact/">
</head>
<body>
<p>Our contact page has moved. <a href="/contact/">Go to the contact page</a>.</p>
</body>
</html>
""")

# ---------- robots, redirects, ads, sitemap ----------
write("robots.txt", f"""User-agent: *
Allow: /
Disallow: /preview/

User-agent: Mediapartners-Google
Allow: /

Sitemap: https://{HOST}/sitemap.xml
""")
write("_redirects", "/preview/*  /  301\n/preview    /  301\n")
write("ads.txt", "google.com, pub-5194583669093303, DIRECT, f08c47fec0942fa0\n")
urls = ["/", "/about/", "/contact/", "/privacy/", "/terms/", "/articles/"] + [f"/articles/{a['slug']}/" for a in ARTS]
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
for u in urls:
    sm += f"  <url><loc>https://{HOST}{u}</loc><lastmod>{DATE}</lastmod></url>\n"
sm += "</urlset>\n"
write("sitemap.xml", sm)
print("built", len(ARTS), "articles")
