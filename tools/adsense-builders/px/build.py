#!/usr/bin/env python3
"""Stitch Pillow Exchange pages: shared head/header/footer around per-page content."""
import json, os, re, html

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = '/home/user/domains/px'
HOST = 'https://pillowexchange.com'
BRAND = 'Pillow Exchange'
UPDATED = '2026-09-23'
UPDATED_H = '23 September 2026'
PUB = 'ca-pub-5194583669093303'
GTM = 'GTM-MGXD56R2'


def esc(s):
    return html.escape(s, quote=True)


def head(title, desc, path, og_image='/images/og.svg', og_type='website', extra=''):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)} | {BRAND}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{HOST}{path}">
<meta name="google-adsense-account" content="{PUB}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={PUB}" crossorigin="anonymous"></script>
<script>window.dataLayer=window.dataLayer||[];</script>
<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);}})(window,document,'script','dataLayer','{GTM}');</script>
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="{og_type}">
<meta property="og:url" content="{HOST}{path}">
<meta property="og:image" content="{HOST}{og_image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#232a5c">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&amp;family=Nunito:ital,wght@0,400;0,600;0,800;1,400&amp;display=swap">
<link rel="stylesheet" href="/assets/site.css">
{extra}</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={GTM}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap head-row">
    <a class="logo" href="/" aria-label="{BRAND} home"><img src="/images/logo.svg" alt="" width="40" height="40"><span>Pillow<b>Exchange</b></span></a>
    <nav aria-label="Main">
      <a href="/articles/">Articles</a>
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
    </nav>
  </div>
</header>
'''


FOOT = f'''<footer class="site-foot">
  <div class="wrap foot-row">
    <div>
      <a class="logo logo-foot" href="/"><img src="/images/logo.svg" alt="" width="32" height="32"><span>Pillow<b>Exchange</b></span></a>
      <p class="tag">Sleep on it before you commit.</p>
    </div>
    <nav aria-label="Footer">
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
      <a href="/privacy/">Privacy</a>
      <a href="/terms/">Terms</a>
      <a href="/articles/">Articles</a>
    </nav>
  </div>
  <p class="wrap copy">&copy;2026 {BRAND}. General sleep and bedding information only &mdash; not medical advice.</p>
</footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
'''


def write(rel, content):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        f.write(content)


def load_articles():
    arts = []
    d = os.path.join(HERE, 'articles')
    for fn in sorted(os.listdir(d)):
        if not fn.endswith('.html'):
            continue
        raw = open(os.path.join(d, fn)).read()
        meta_s, body = raw.split('\n---\n', 1)
        meta = json.loads(meta_s)
        meta['slug'] = fn[:-5]
        meta['body'] = body
        arts.append(meta)
    arts.sort(key=lambda a: a['order'])
    return arts


def card(a, h='h3'):
    return f'''<a class="card" href="/articles/{a['slug']}/">
  <span class="card-img"><img src="/images/{a['slug']}.svg" alt="{esc(a['alt'])}" loading="lazy" width="1200" height="675"></span>
  <span class="card-body"><span class="kicker">{esc(a['kicker'])}</span><{h}>{esc(a['title'])}</{h}><span class="excerpt">{esc(a['excerpt'])}</span><span class="more">Read the guide &rarr;</span></span>
</a>'''


def build_articles(arts):
    by = {a['slug']: a for a in arts}
    for a in arts:
        rel = ''.join(f'<li>{card(by[s], "h3")}</li>' for s in a['related'])
        ld = json.dumps({
            "@context": "https://schema.org", "@type": "Article", "headline": a['title'],
            "description": a['description'], "image": f"{HOST}/images/{a['slug']}.svg",
            "dateModified": UPDATED, "author": {"@type": "Organization", "name": f"The {BRAND} team"},
            "publisher": {"@type": "Organization", "name": BRAND}}, ensure_ascii=False)
        page = head(a['title'], a['description'], f"/articles/{a['slug']}/", f"/images/{a['slug']}.svg", 'article',
                    f'<script type="application/ld+json">{ld}</script>\n')
        page += f'''<main id="main">
<article class="article">
  <div class="wrap narrow">
    <p class="crumbs"><a href="/">Home</a> / <a href="/articles/">Articles</a> / <span>{esc(a['kicker'])}</span></p>
    <h1>{esc(a['title'])}</h1>
    <p class="byline">By the {BRAND} team &middot; Last updated <time datetime="{UPDATED}">{UPDATED_H}</time> &middot; {a['minutes']} min read</p>
  </div>
  <figure class="hero-fig wrap">
    <img src="/images/{a['slug']}.svg" alt="{esc(a['alt'])}" width="1200" height="675">
  </figure>
  <div class="wrap narrow prose">
{a['body'].strip()}
    <aside class="note" role="note"><strong>Good to know:</strong> this is general information about pillows and sleep habits, not medical advice. Ongoing pain, numbness, snoring with pauses in breathing, or sleep problems that last for weeks are worth raising with a doctor or physiotherapist.</aside>
  </div>
  <section class="wrap related" aria-labelledby="rel-h">
    <h2 id="rel-h">Related articles</h2>
    <ul class="cards cards-3">{rel}</ul>
  </section>
</article>
</main>
'''
        page += FOOT
        write(f"articles/{a['slug']}/index.html", page)


def build_index(arts):
    cards = ''.join(f'<li>{card(a, "h2")}</li>' for a in arts)
    page = head('Sleep & pillow articles', 'Every Pillow Exchange guide in one place: pillows by sleep position, fills explained, washing and care, when to replace, travel pillows and sleep habits.', '/articles/')
    page += f'''<main id="main">
<section class="page-head">
  <div class="wrap narrow">
    <p class="eyebrow">The reading pile</p>
    <h1>All articles</h1>
    <p class="lede">Plain-English guides to choosing, using and looking after a pillow &mdash; plus the small habits around it that make a night go better. Start with your sleep position, or jump to whatever is keeping you up.</p>
  </div>
</section>
<section class="wrap">
  <ul class="cards">{cards}</ul>
</section>
<section class="wrap narrow prose">
  <h2>Printable extras</h2>
  <p>Heading out to compare pillows in person or online? Take the <a href="/pillow-shopping-checklist/">pillow shopping checklist</a>. Buying a new case for an odd-sized pillow? The <a href="/guides/pillow-cover-fit/">pillow cover fit log</a> walks you through measuring first.</p>
</section>
</main>
'''
    page += FOOT
    write('articles/index.html', page)
    return arts


def build_simple(rel, path, title, desc, inner):
    page = head(title, desc, path) + f'<main id="main">\n{inner}\n</main>\n' + FOOT
    write(rel, page)


def main():
    arts = load_articles()
    build_articles(arts)
    build_index(arts)
    pages = json.load(open(os.path.join(HERE, 'pages.json')))
    for p in pages:
        inner = open(os.path.join(HERE, 'pages', p['file'])).read()
        if '{{FEATURED}}' in inner:
            feat = ''.join(f'<li>{card(a, "h3")}</li>' for a in arts[:6])
            inner = inner.replace('{{FEATURED}}', feat)
        if '{{MORE}}' in inner:
            more = ''.join(f'<li><a href="/articles/{a["slug"]}/">{esc(a["title"])}</a></li>' for a in arts[6:])
            inner = inner.replace('{{MORE}}', more)
        build_simple(p['out'], p['path'], p['title'], p['desc'], inner)
    # sitemap
    urls = ['/', '/articles/'] + [f"/articles/{a['slug']}/" for a in arts] + ['/about/', '/contact/', '/privacy/', '/terms/',
            '/pillow-shopping-checklist/', '/guides/pillow-cover-fit/']
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sm += ''.join(f'  <url><loc>{HOST}{u}</loc><lastmod>{UPDATED}</lastmod></url>\n' for u in urls)
    sm += '</urlset>\n'
    write('sitemap.xml', sm)
    # word counts
    for a in arts:
        t = re.sub(r'<[^>]+>', ' ', a['body'])
        print(a['slug'], len(re.findall(r"[A-Za-z0-9'’-]+", t)))


if __name__ == '__main__':
    main()
