"""Build the shared gift finder into a site: copies the component and writes /gift-finder/.

Usage: python3 tools/gift-finder/build.py fplb [px h2m]

Run verify.py first (it writes <site>/data/gifts.json). The page reuses the site's own head,
header and footer from <site>/about/index.html, so it inherits AdSense, GTM and navigation.
Reproducible: running it twice gives the same files.
"""
import html, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
E = html.escape

SITES = {
    "fplb": {"host": "https://forpetslikeblue.com", "brand": "For Pets Like Blue", "v": "20261115a",
             "kicker": "Holiday gift finder", "h1": "Blue's pet gift finder",
             "lede": "Tell us about your dog or cat and your budget. Blue's finder picks gifts from our own checked list of partner stores, with today's prices and holiday codes.",
             "desc": "Find a holiday gift for your dog or cat by size, what they love and your budget. Picks come only from checked partner stores with current prices.",
             "skin": "--gf-acc:#c4532a;--gf-on-acc:#fff;--gf-ink:#231c15;--gf-muted:#5b4f43;--gf-line:#eadfcd;--gf-soft:#fbf6ee;--gf-radius:22px;--gf-font:'Inter',system-ui,sans-serif;--gf-display:'Fraunces',Georgia,serif",
             "banner_old": "Start with the current <a href=\"/offers/\">offers page</a> (portraits, food, wellness).</p>",
             "banner_new": "Start with the current <a href=\"/offers/\">offers page</a> (portraits, food, wellness).<!-- gift-finder --> Or let <a href=\"/gift-finder/\">Blue's pet gift finder</a> pick by pet, size and budget.</p>"},
    "px": {"host": "https://pillowexchange.com", "brand": "Pillow Exchange", "v": "20261115a",
           "kicker": "Holiday gift finder", "h1": "Sleep gift finder",
           "lede": "Pick who it's for, what keeps them up at night and your budget. We'll match a sleep gift from our checked partner list, with today's prices.",
           "desc": "Find a sleep gift by who it's for, what keeps them up and your budget: silk pillowcases, eye masks, cooling bedding, guest beds and blackout curtains.",
           "skin": "--gf-acc:#4b3bc4;--gf-on-acc:#fff;--gf-ink:#1d2140;--gf-muted:#4f557a;--gf-line:#e6e1f5;--gf-soft:#ece6ff;--gf-radius:22px;--gf-font:'Nunito',system-ui,sans-serif;--gf-display:'Fredoka','Trebuchet MS',sans-serif",
           "banner_old": "Pair with the <a href=\"/pillow-shopping-checklist/\">pillow checklist</a>.</p>",
           "banner_new": "Pair with the <a href=\"/pillow-shopping-checklist/\">pillow checklist</a>.<!-- gift-finder --> Shopping for someone else? Try the <a href=\"/gift-finder/\">sleep gift finder</a>.</p>"},
    "h2m": {"host": "https://hair2makeup.com", "brand": "Hair2Makeup", "v": "20261115a",
            "kicker": "Holiday gift finder", "h1": "Gift set finder",
            "lede": "Choose their hair and skin type and your budget. We'll match gift sets from our checked partner list, with today's prices.",
            "desc": "Find a beauty gift set by hair type, skin type and budget: silk pillowcase sets, eye masks and human hair wigs from checked partner stores.",
            "skin": "--gf-acc:#8a2c3b;--gf-on-acc:#fff;--gf-ink:#141414;--gf-muted:#5a5652;--gf-line:#e3ded8;--gf-soft:#f6f3ef;--gf-radius:16px;--gf-font:'Inter',system-ui,sans-serif;--gf-display:'Playfair Display',Georgia,serif",
            "banner_old": "(Holiday Party Glam Kit + Hair Tool Gift Guide).</p>",
            "banner_new": "(Holiday Party Glam Kit + Hair Tool Gift Guide).<!-- gift-finder --> New: match a gift to their hair and skin with the <a href=\"/gift-finder/\">gift set finder</a>.</p>"},
}


def read(p):
    return open(p, encoding="utf-8").read()


def write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w", encoding="utf-8").write(s)


def page(site):
    c = SITES[site]
    shell = read(os.path.join(ROOT, site, "about", "index.html"))
    shell = shell.replace(' aria-current="page"', "")
    head, rest = shell.split('<main id="main">', 1)
    foot = rest.split("</main>", 1)[1]
    url = c["host"] + "/gift-finder/"
    title = f'{c["h1"]} | {c["brand"]}'
    head = re.sub(r"<title>.*?</title>", f"<title>{E(title)}</title>", head, count=1, flags=re.S)
    head = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + E(c["desc"]) + m.group(2), head, count=1)
    head = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), head, count=1)
    head = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), head)
    head = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + E(title) + m.group(2), head)
    head = re.sub(r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + E(c["desc"]) + m.group(2), head)
    head = re.sub(r'(<meta name="twitter:title" content=")[^"]*(")', lambda m: m.group(1) + E(title) + m.group(2), head)
    head = re.sub(r'(<meta name="twitter:description" content=")[^"]*(")', lambda m: m.group(1) + E(c["desc"]) + m.group(2), head)
    head = re.sub(r'<script type="application/ld\+json">.*?</script>\s*', "", head, flags=re.S)
    # Gift finders are shopping pages: AdSense stays on content pages only (Kyle's rule, Nov 16 2026).
    head = re.sub(r'<script[^>]*adsbygoogle\.js[^>]*></script>\s*', "", head)
    head = head.replace("</head>", f'<link rel="stylesheet" href="/assets/gift-finder.css?v={c["v"]}">\n<style>#gift-finder,.gf-hero,.gf-how{{{c["skin"]}}}</style>\n</head>', 1)
    main = f'''<main id="main">
<div class="gf-wrap">
<section class="gf-hero">
<p class="gf-kicker">{E(c["kicker"])}</p>
<h1>{E(c["h1"])}</h1>
<p>{E(c["lede"])}</p>

</section>
<div id="gift-finder" data-site="{site}"><p class="gf-empty">Loading gift ideas&hellip;</p></div>
<noscript><p class="gf-empty">The gift finder needs JavaScript. You can still browse our <a href="/offers/">partner offers</a>.</p></noscript>
<section class="gf-how">
<h2>How the finder picks</h2>
<ul>
<li>It only shows products from partner stores we already link to, and every link was opened to confirm it lands on the store's own page.</li>
<li>Prices and stock come from each store's site when we last checked. Out-of-stock items are left out.</li>
<li>Picks are ranked by how many of your answers they match, then by fit for your budget.</li>
<li>Your answers stay in this browser tab. Nothing is sent to us.</li>
</ul>
</section>
</div>
<script src="/assets/gift-finder.js?v={c["v"]}" defer></script>
</main>'''
    return head + main + foot


def sitemap(site):
    p = os.path.join(ROOT, site, "sitemap.xml")
    s = read(p)
    loc = SITES[site]["host"] + "/gift-finder/"
    if loc not in s:
        s = s.replace("</urlset>", f"  <url><loc>{loc}</loc><lastmod>2026-11-15</lastmod></url>\n</urlset>")
        write(p, s)


def banner(site):
    p = os.path.join(ROOT, site, "index.html")
    s = read(p)
    c = SITES[site]
    if "<!-- gift-finder -->" not in s:
        assert c["banner_old"] in s, f"{site}: homepage banner text changed"
        write(p, s.replace(c["banner_old"], c["banner_new"], 1))


def build(site):
    shutil.copyfile(os.path.join(HERE, "gift-finder.js"), os.path.join(ROOT, site, "assets", "gift-finder.js"))
    shutil.copyfile(os.path.join(HERE, "gift-finder.css"), os.path.join(ROOT, site, "assets", "gift-finder.css"))
    write(os.path.join(ROOT, site, "gift-finder", "index.html"), page(site))
    sitemap(site)
    banner(site)
    print(f"{site}: built /gift-finder/")


if __name__ == "__main__":
    for s in sys.argv[1:]:
        build(s)
