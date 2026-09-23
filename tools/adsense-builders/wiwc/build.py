#!/usr/bin/env python3
"""Stitch the What Is Working Capital site together from fragments."""
import json, os, re, glob, html

SRC = os.path.dirname(os.path.abspath(__file__))
OUT = '/home/user/domains/wiwc'
HOST = 'whatisworkingcapital.com'
BRAND = 'What Is Working Capital'
EMAIL = 'hello@whatisworkingcapital.com'
UPDATED = '2026-09-23'
UPDATED_H = 'September 23, 2026'
GTM = 'GTM-WT5DSB'
PUB = 'ca-pub-5194583669093303'

CATS = {
    'basics': ('Basics', 'chip'),
    'cycle': ('The cash cycle', 'chip gold'),
    'financing': ('Financing', 'chip coral'),
    'planning': ('Planning', 'chip sky'),
}


def head(title, desc, path, og='/images/og.svg', extra='', noindex=False):
    url = f'https://{HOST}{path}'
    robots = '<meta name="robots" content="noindex">\n' if noindex else ''
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} | {BRAND}</title>
<meta name="description" content="{html.escape(desc)}">
{robots}<link rel="canonical" href="{url}">
<meta name="google-adsense-account" content="{PUB}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={PUB}" crossorigin="anonymous"></script>
<script>window.dataLayer=window.dataLayer||[];</script>
<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);}})(window,document,'script','dataLayer','{GTM}');</script>
<meta property="og:type" content="website">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="https://{HOST}{og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#16202e">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&display=swap">
<link rel="stylesheet" href="/assets/site.css">
{extra}</head>
'''


def header(active=''):
    def a(href, label, key):
        cur = ' aria-current="page"' if key == active else ''
        return f'<a href="{href}"{cur}>{label}</a>'
    return f'''<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={GTM}" height="0" width="0" style="display:none;visibility:hidden" title="Tag Manager"></iframe></noscript>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/"><img src="/images/logo.svg" alt="" width="40" height="40"><span>{BRAND}<small>Small-business finance in plain English</small></span></a>
    <nav class="nav" aria-label="Main">
      {a('/', 'Home', 'home')}
      {a('/articles/', 'Articles', 'articles')}
      {a('/about/', 'About', 'about')}
      {a('/contact/', 'Contact', 'contact')}
    </nav>
  </div>
</header>
'''


def footer(script=False):
    js = '<script src="/assets/site.js" defer></script>\n' if script else ''
    return f'''<footer class="site-footer">
  <div class="wrap">
    <ul class="footer-links">
      <li><a href="/articles/">Articles</a></li>
      <li><a href="/about/">About</a></li>
      <li><a href="/contact/">Contact</a></li>
      <li><a href="/privacy/">Privacy</a></li>
      <li><a href="/terms/">Terms</a></li>
    </ul>
    <p class="small">Educational information only, not financial, tax, legal or lending advice. Talk to a qualified professional about your own situation.</p>
    <p class="small">&copy;2026 {BRAND}. All rights reserved.</p>
  </div>
</footer>
{js}</body>
</html>
'''


def write(rel, content):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        f.write(content)


def load_articles():
    arts = []
    for fp in sorted(glob.glob(os.path.join(SRC, 'art', '*.html'))):
        raw = open(fp).read()
        m = re.match(r'<!--META\s*(\{.*?\})\s*-->\s*', raw, re.S)
        meta = json.loads(m.group(1))
        meta['body'] = raw[m.end():]
        meta['words'] = len(re.findall(r"[A-Za-z0-9'’-]+", re.sub(r'<[^>]+>', ' ', meta['body'])))
        arts.append(meta)
    arts.sort(key=lambda a: a['order'])
    return arts


def card(a, h='h3'):
    label, cls = CATS[a['cat']]
    return f'''<a class="card" href="/articles/{a['slug']}/">
  <div class="thumb"><img src="/images/{a['slug']}.svg" alt="{html.escape(a['alt'])}" width="1200" height="675" loading="lazy"></div>
  <div class="body"><span class="{cls}">{label}</span><{h}>{a['title']}</{h}><p>{a['blurb']}</p></div>
</a>'''


def build_article(a, by_slug):
    path = f"/articles/{a['slug']}/"
    label, cls = CATS[a['cat']]
    ld = {
        '@context': 'https://schema.org', '@type': 'Article',
        'headline': html.unescape(a['title']), 'description': a['desc'],
        'image': f"https://{HOST}/images/{a['slug']}.svg",
        'dateModified': UPDATED, 'datePublished': UPDATED,
        'author': {'@type': 'Organization', 'name': f'The {BRAND} team'},
        'publisher': {'@type': 'Organization', 'name': BRAND},
        'mainEntityOfPage': f'https://{HOST}{path}',
    }
    extra = f'<script type="application/ld+json">{json.dumps(ld)}</script>\n'
    mins = max(4, round(a['words'] / 220))
    related = '\n'.join(card(by_slug[s]) for s in a['related'])
    page = head(html.unescape(a['title']), a['desc'], path, og=f"/images/{a['slug']}.svg", extra=extra)
    page += header('articles')
    page += f'''<main id="main">
<article class="narrow">
  <div class="article-top">
    <p class="crumbs"><a href="/">Home</a> / <a href="/articles/">Articles</a> / {label}</p>
    <span class="{cls}">{label}</span>
    <h1>{a['title']}</h1>
    <div class="meta"><span>By the {BRAND} team</span><span>Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></span><span>{mins} min read</span></div>
  </div>
  <figure class="hero-fig"><img src="/images/{a['slug']}.svg" alt="{html.escape(a['alt'])}" width="1200" height="675"></figure>
  <div class="note" role="note"><strong>Educational, not advice.</strong> Examples use made-up round numbers. Check decisions with an accountant or adviser who knows your business.</div>
  <div class="prose">
{a['body']}
  </div>
  <section class="related" aria-labelledby="rel-h">
    <h2 id="rel-h">Related articles</h2>
    <div class="grid">
{related}
    </div>
  </section>
</article>
</main>
'''
    page += footer(script=('ccc-calc' in a['body']))
    write(f"articles/{a['slug']}/index.html", page)


def simple_page(rel, path, title, desc, active, body, script=False):
    page = head(title, desc, path) + header(active) + f'<main id="main">\n{body}\n</main>\n' + footer(script)
    write(rel, page)


def main():
    arts = load_articles()
    by_slug = {a['slug']: a for a in arts}
    for a in arts:
        for s in a['related']:
            assert s in by_slug, (a['slug'], s)
        build_article(a, by_slug)
        print(f"{a['slug']:45s} {a['words']}")

    pages = {}
    for fp in glob.glob(os.path.join(SRC, 'pages', '*.html')):
        raw = open(fp).read()
        m = re.match(r'<!--META\s*(\{.*?\})\s*-->\s*', raw, re.S)
        meta = json.loads(m.group(1))
        body = raw[m.end():]
        # placeholders
        body = body.replace('{{FEATURED}}', '\n'.join(card(by_slug[s]) for s in meta.get('featured', [])))
        if '{{ALL}}' in body:
            chunks = []
            for key, (label, cls) in CATS.items():
                items = [a for a in arts if a['cat'] == key]
                if not items:
                    continue
                chunks.append(f'<section class="section" aria-labelledby="cat-{key}"><div class="wrap"><div class="section-head"><h2 id="cat-{key}" class="cat-title">{label}</h2><span class="{cls}">{len(items)} articles</span></div><div class="grid">\n' + '\n'.join(card(a) for a in items) + '\n</div></div></section>')
            body = body.replace('{{ALL}}', '\n'.join(chunks))
        body = body.replace('{{EMAIL}}', EMAIL).replace('{{UPDATED}}', UPDATED_H).replace('{{COUNT}}', str(len(arts)))
        simple_page(meta['out'], meta['path'], meta['title'], meta['desc'], meta.get('active', ''), body, meta.get('script', False))
        pages[meta['path']] = meta

    # 404
    page = head('Page not found', 'That page could not be found on What Is Working Capital. Try the article library or the home page instead.', '/404.html', noindex=True)
    page += header() + '''<main id="main"><section class="page-head"><div class="narrow" style="text-align:center">
<img src="/images/hero.svg" alt="" width="1600" height="900" style="border:2px solid #16202e;border-radius:22px;margin:0 auto 20px">
<h1>This page has a liquidity problem</h1>
<p style="margin-inline:auto">We looked through every current asset and could not find it. The link may be old or mistyped.</p>
<p><a class="btn" href="/">Back to home</a> <a class="btn alt" href="/articles/">Browse articles</a></p>
</div></section></main>
''' + footer()
    write('404.html', page)

    write('contact.html', f'''<!doctype html>
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
<p>Our contact page has moved to <a href="/contact/">/contact/</a>.</p>
</body>
</html>
''')

    write('robots.txt', f'''User-agent: *
Allow: /
Disallow: /preview/

User-agent: Mediapartners-Google
Allow: /

Sitemap: https://{HOST}/sitemap.xml
''')
    write('_redirects', '/preview/*  /  301\n/preview    /  301\n')
    write('ads.txt', 'google.com, pub-5194583669093303, DIRECT, f08c47fec0942fa0\n')

    urls = ['/', '/articles/'] + [f"/articles/{a['slug']}/" for a in arts] + ['/about/', '/contact/', '/privacy/', '/terms/']
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sm.append(f'  <url><loc>https://{HOST}{u}</loc><lastmod>{UPDATED}</lastmod></url>')
    sm.append('</urlset>')
    write('sitemap.xml', '\n'.join(sm) + '\n')

    # images
    for fp in glob.glob(os.path.join(SRC, 'img', '*.svg')):
        with open(fp) as f:
            write('images/' + os.path.basename(fp), f.read())


if __name__ == '__main__':
    main()
