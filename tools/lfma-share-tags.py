#!/usr/bin/env python3
"""Give every public lawfirmmarketingapes.com page a controlled share preview (Open Graph + X card).

Run from the repo root:  python3 tools/lfma-share-tags.py
It is safe to run again: it only adds tags a page is missing and repoints share images that do not exist.
Pages marked noindex are previews and tools not meant to be shared, so they are left alone.
To give one page its own preview, add it to PAGES below (or write the tags in the page by hand).
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'lfma'
SITE = 'https://lawfirmmarketingapes.com'
DEFAULT = dict(image='/assets/share/default.jpg',
               alt='Law Firm Marketing Apes. One Gorilla + AI. Marketing and intake, with the loop closed.')
PAGES = {
    'index.html': dict(
        title='Who answers your intake line at 9 PM this Black Friday?',
        description='Call Sofia, our AI intake assistant, at (619) 539-1455 and play a client. The Holiday Sprint: one tort, three landing pages, $2,500 flat, through December 1.',
        image='/assets/share/holiday-sprint.jpg',
        alt='Who answers at 9 PM? Call Sofia, an AI intake assistant, at (619) 539-1455.'),
}

def attr(s): return s.replace('"', '&quot;').strip()
def has(html, key): return re.search(r'<meta[^>]+(?:property|name)="%s"' % re.escape(key), html) is not None
def exists(url):
    path = url.replace(SITE, '')
    return (ROOT / path.lstrip('/')).is_file() or (ROOT / (path.lstrip('/') + '.b64')).is_file()

changed = 0
for f in sorted(ROOT.rglob('*.html')):
    html = f.read_text(encoding='utf-8'); before = html
    if re.search(r'<meta[^>]*robots[^>]*noindex|<meta[^>]*noindex[^>]*robots', html, re.I) or '</head>' not in html: continue
    rel = f.relative_to(ROOT).as_posix(); page = PAGES.get(rel, {})
    title = page.get('title') or attr(re.search(r'<title>(.*?)</title>', html, re.S).group(1))
    m = re.search(r'<meta[^>]+name="description"[^>]+content="([^"]*)"', html)
    description = page.get('description') or (m.group(1) if m else title + '. From Law Firm Marketing Apes.')
    m = re.search(r'<link[^>]+rel="canonical"[^>]+href="([^"]*)"', html)
    url = m.group(1) if m else SITE + '/' + re.sub(r'(^|/)index\.html$', r'\1', rel)
    image = SITE + page.get('image', DEFAULT['image']); alt = page.get('alt', DEFAULT['alt'])
    # a share image that points at a file this site does not have gets the default
    for key in ('og:image', 'twitter:image'):
        m = re.search(r'(<meta[^>]+(?:property|name)="%s"[^>]+content=")([^"]*)(")' % key, html)
        if m and m.group(2).startswith(SITE) and not exists(m.group(2)):
            html = html.replace(m.group(0), m.group(1) + image + m.group(3))
            html = re.sub(r'(<meta property="og:image:height" content=")\d+(")', r'\g<1>630\2', html)
    want = [('property', 'og:type', 'website'), ('property', 'og:site_name', 'Law Firm Marketing Apes'),
            ('property', 'og:title', title), ('property', 'og:description', description), ('property', 'og:url', url),
            ('property', 'og:image', image), ('property', 'og:image:width', '1200'), ('property', 'og:image:height', '630'),
            ('property', 'og:image:alt', alt), ('name', 'twitter:card', 'summary_large_image'),
            ('name', 'twitter:title', title), ('name', 'twitter:description', description), ('name', 'twitter:image', image)]
    had_image = has(before, 'og:image')
    add = [(k, n, v) for k, n, v in want if not has(html, n) and not (had_image and n.startswith('og:image:'))]
    if add:
        block = ''.join('<meta %s="%s" content="%s">\n' % (k, n, attr(v)) for k, n, v in add)
        html = html.replace('</head>', block + '</head>', 1)
    if html != before:
        f.write_text(html, encoding='utf-8'); changed += 1; print('updated', rel, '(+%d tags)' % len(add))
print(changed, 'pages updated')
