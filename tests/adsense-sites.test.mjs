// Enforces docs/ADSENSE-SITE-SPEC.md for the non-legal AdSense brands.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = 'ca-pub-5194583669093303';
const ADS_LINE = /google\.com, pub-5194583669093303, DIRECT, f08c47fec0942fa0/;
const HOSTS = {
  cgg: 'crazygolfgame.com', wiwc: 'whatisworkingcapital.com',
  fplb: 'forpetslikeblue.com', px: 'pillowexchange.com', ddm: 'discountdealme.com',
  toss: 'tosssports.com', ri: 'researchinvestigation.com',
  tbrew: 'tossedbrew.com', h2m: 'hair2makeup.com', tnd: 'thenearestdentists.com',
};
// tnt and sliq are built but held by the owner (branch claude/adsense-tnt-sliq-held).
const LEGAL = ['btl', 'dihac', 'nil', 'lfma', 'lee'];
const BANNED = /we tested|hands-on test|our testing|our lab|example\.com|coming soon|website preview/i;
// Allow selecting a subset while a brand is being built: ADSENSE_BRANDS=cgg,tnt
const ONLY = process.env.ADSENSE_BRANDS ? process.env.ADSENSE_BRANDS.split(',') : null;
const BRANDS = Object.keys(HOSTS).filter(b => !ONLY || ONLY.includes(b));

const read = p => fs.readFileSync(p, 'utf8');
const text = html => html
  .replace(/<(script|style|svg|nav|header|footer)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const words = s => (s.match(/[A-Za-z0-9'’-]+/g) || []).length;

function newPages(dir) {
  const out = ['index.html', 'about/index.html', 'contact/index.html', 'privacy/index.html',
    'terms/index.html', 'articles/index.html'];
  const art = path.join(dir, 'articles');
  if (fs.existsSync(art)) {
    for (const s of fs.readdirSync(art)) {
      if (fs.existsSync(path.join(art, s, 'index.html'))) out.push(`articles/${s}/index.html`);
    }
  }
  return out;
}

function resolves(dir, href) {
  const clean = href.split(/[?#]/)[0];
  if (!clean || clean === '/') return fs.existsSync(path.join(dir, 'index.html'));
  const p = path.join(dir, clean);
  return (fs.existsSync(p) && fs.statSync(p).isFile()) || fs.existsSync(path.join(p, 'index.html'));
}

for (const b of BRANDS) {
  const dir = path.join(ROOT, b);
  const host = HOSTS[b];

  test(`${b}: required files exist`, () => {
    for (const f of [...newPages(dir), 'assets/site.css', 'images/hero.svg', 'images/og.svg',
      'images/logo.svg', 'robots.txt', 'sitemap.xml', 'ads.txt', '_redirects', '404.html']) {
      assert.ok(fs.existsSync(path.join(dir, f)), `${b}/${f} missing`);
    }
  });

  test(`${b}: home is a real page, not a preview redirect`, () => {
    const html = read(path.join(dir, 'index.html'));
    assert.doesNotMatch(html, /location\.replace|http-equiv="refresh"|\/preview\//i);
    assert.ok(words(text(html)) >= 250, 'home page needs real copy');
  });

  test(`${b}: every new page carries AdSense + canonical + description`, () => {
    for (const rel of newPages(dir)) {
      const html = read(path.join(dir, rel));
      assert.ok(html.includes(`adsbygoogle.js?client=${PUB}`), `${rel} missing AdSense script`);
      assert.ok(html.includes(`name="google-adsense-account" content="${PUB}"`), `${rel} missing account meta`);
      assert.match(html, new RegExp(`rel="canonical" href="https://${host.replace('.', '\\.')}/`), `${rel} canonical`);
      assert.match(html, /<meta name="description" content="[^"]{40,}"/, `${rel} description`);
      assert.match(html, /name="viewport"/, `${rel} viewport`);
      assert.doesNotMatch(html, BANNED, `${rel} contains banned phrase`);
      assert.match(html, /href="\/privacy\/"/, `${rel} footer privacy link`);
    }
  });

  test(`${b}: at least 12 substantial, illustrated articles`, () => {
    const arts = newPages(dir).filter(p => /^articles\/[^/]+\/index\.html$/.test(p));
    assert.ok(arts.length >= 12, `only ${arts.length} articles`);
    for (const rel of arts) {
      const html = read(path.join(dir, rel));
      const slug = rel.split('/')[1];
      assert.ok(words(text(html)) >= 700, `${rel} has ${words(text(html))} words`);
      assert.ok(fs.existsSync(path.join(dir, 'images', `${slug}.svg`)), `images/${slug}.svg missing`);
      assert.ok(html.includes(`/images/${slug}.svg`), `${rel} does not show its hero image`);
      assert.ok((html.match(/<h2/g) || []).length >= 4, `${rel} needs 4+ H2`);
    }
  });

  test(`${b}: no paragraph is copy-pasted across articles`, () => {
    const seen = new Map();
    for (const rel of newPages(dir).filter(p => p.startsWith('articles/') && p !== 'articles/index.html')) {
      for (const m of read(path.join(dir, rel)).matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
        const t = text(m[1]);
        if (t.length < 140) continue;
        assert.ok(!seen.has(t) || seen.get(t) === rel, `duplicate paragraph in ${rel} and ${seen.get(t)}`);
        seen.set(t, rel);
      }
    }
  });

  test(`${b}: internal links and images resolve`, () => {
    for (const rel of newPages(dir)) {
      const html = read(path.join(dir, rel));
      for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
        if (m[1].startsWith('//')) continue;
        assert.ok(resolves(dir, m[1]), `${rel} -> ${m[1]} is broken`);
      }
    }
  });

  test(`${b}: privacy policy has the AdSense disclosures`, () => {
    const html = read(path.join(dir, 'privacy/index.html'));
    assert.match(html, /adssettings\.google\.com/);
    assert.match(html, /policies\.google\.com\/technologies\/partner-sites/);
    assert.match(html, /cookie/i);
  });

  test(`${b}: robots, sitemap, ads.txt, redirects`, () => {
    const robots = read(path.join(dir, 'robots.txt'));
    assert.match(robots, /^Allow: \/$/m);
    assert.match(robots, /Disallow: \/preview\//);
    assert.doesNotMatch(robots, /^Disallow: \/$/m);
    assert.match(robots, new RegExp(`Sitemap: https://${host}/sitemap\\.xml`));
    assert.match(read(path.join(dir, 'ads.txt')), ADS_LINE);
    assert.match(read(path.join(dir, '_redirects')), /\/preview\/\*\s+\/\s+301/);
    const sm = read(path.join(dir, 'sitemap.xml'));
    for (const rel of newPages(dir)) {
      const url = `https://${host}/${rel.replace(/index\.html$/, '')}`;
      assert.ok(sm.includes(`<loc>${url}</loc>`), `sitemap missing ${url}`);
    }
    assert.doesNotMatch(sm, /\/preview\//);
  });
}

if (!ONLY) {
  test('legal brands never carry AdSense', () => {
    for (const b of LEGAL) {
      const dir = path.join(ROOT, b);
      if (!fs.existsSync(dir)) continue;
      const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
        e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
      for (const f of walk(dir)) assert.doesNotMatch(read(f), /adsbygoogle|google-adsense-account/, f);
    }
  });

  test('kylegosselin.com home carries the AdSense tag and ads.txt', () => {
    const html = read(path.join(ROOT, 'kg', 'index.html'));
    assert.ok(html.includes(`adsbygoogle.js?client=${PUB}`));
    assert.match(read(path.join(ROOT, 'kg', 'ads.txt')), ADS_LINE);
  });
}
