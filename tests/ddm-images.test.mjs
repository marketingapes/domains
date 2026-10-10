import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'ddm');
const BUILDER = path.join(ROOT, 'tools/adsense-builders/ddm');
const read = (p) => fs.readFileSync(p, 'utf8');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const htmlPages = walk(SITE).filter((f) => f.endsWith('.html'));
const pub = JSON.parse(read(path.join(SITE, 'data/deals.json')));
const manifest = JSON.parse(read(path.join(BUILDER, 'images.json')));
const attr = (tag, a) => (tag.match(new RegExp(`\\s${a}="([^"]*)"`)) || [])[1];
const imgs = (html) => html.match(/<img\b[^>]*>/g) || [];
const isWebp = (f) => { const b = fs.readFileSync(f); return b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'; };

test('DDM images: every deal card has an optimized, lazy, sized WebP image with alt text', () => {
  for (const page of ['index.html', 'deals/index.html']) {
    const html = read(path.join(SITE, page));
    const cards = html.match(/<article class="deal"[\s\S]*?<\/article>/g) || [];
    assert.ok(cards.length >= 5, `${page} has deal cards`);
    for (const c of cards) {
      const tag = (c.match(/<div class="deal-media[^"]*"><img\b[^>]*>/) || [])[0];
      assert.ok(tag, `${page}: deal card without an image: ${c.slice(0, 120)}`);
      const src = attr(tag, 'src');
      assert.match(src, /^\/images\/(deals|photos)\/[\w-]+\.webp$/);
      assert.ok(fs.existsSync(path.join(SITE, src)), `${src} missing`);
      assert.equal(attr(tag, 'loading'), 'lazy');
      assert.equal(attr(tag, 'width'), '720');
      assert.equal(attr(tag, 'height'), '450');
      assert.ok((attr(tag, 'alt') || '').length > 8, `${src} needs alt text`);
    }
  }
});

test('DDM images: every live deal in the public feed has an image file, carried-over deals keep their own', () => {
  for (const d of pub.deals) {
    assert.ok(d.image && fs.existsSync(path.join(SITE, d.image)), `${d.id} has no image file`);
    const lid = d.id.replace(/^cj-/, '');
    if (manifest.deals[lid]) assert.equal(d.image, `/images/deals/${lid}.webp`, `${d.id} lost its own image`);
  }
});

test('DDM images: homepage hero and guide photos are WebP with srcset, sizes, alt and dimensions', () => {
  const home = read(path.join(SITE, 'index.html'));
  const hero = imgs(home).find((t) => t.includes('/images/photos/hero-1200.webp'));
  assert.ok(hero, 'homepage hero photo');
  assert.equal(attr(hero, 'fetchpriority'), 'high');
  assert.equal(attr(hero, 'loading'), undefined, 'hero is not lazy');
  assert.match(attr(hero, 'srcset'), /hero-640\.webp 640w/);
  for (const slug of Object.keys(manifest.guides)) {
    const html = read(path.join(SITE, `articles/${slug}/index.html`));
    const t = imgs(html).find((x) => x.includes(`/images/photos/${slug}-1200.webp`));
    assert.ok(t, `${slug} article photo`);
    assert.ok(attr(t, 'alt').length > 8);
    assert.ok(html.includes(`/images/${slug}.svg`), `${slug} keeps its diagram`);
  }
  const index = read(path.join(SITE, 'articles/index.html'));
  const cards = (index.match(/<span class="gcard-img"><img\b[^>]*>/g) || []);
  assert.ok(cards.length >= 12);
  for (const c of cards) {
    assert.match(attr(c, 'src'), /^\/images\/photos\/[\w-]+-640\.webp$/);
    assert.equal(attr(c, 'loading'), 'lazy');
    assert.ok(attr(c, 'alt').length > 8);
  }
});

test('DDM images: every <img> on the site has width, height and an alt attribute, and every local file exists', () => {
  for (const f of htmlPages) {
    for (const t of imgs(read(f))) {
      const where = `${path.relative(SITE, f)}: ${t.slice(0, 90)}`;
      assert.ok(attr(t, 'width') && attr(t, 'height'), `size missing in ${where}`);
      assert.notEqual(attr(t, 'alt'), undefined, `alt missing in ${where}`);
      const src = attr(t, 'src');
      if (src.startsWith('/')) assert.ok(fs.existsSync(path.join(SITE, src)), `missing file ${where}`);
    }
  }
});

test('DDM images: files are real, small WebP; manifest records source and license for each', () => {
  const files = [...walk(path.join(SITE, 'images/deals')), ...walk(path.join(SITE, 'images/photos')).filter((f) => f.endsWith('.webp'))];
  assert.ok(files.length >= 40);
  for (const f of files) {
    assert.ok(f.endsWith('.webp') && isWebp(f), `${f} is not WebP`);
    assert.ok(fs.statSync(f).size < 220 * 1024, `${path.basename(f)} is too large`);
  }
  const all = [['hero', manifest.hero], ...Object.entries(manifest.guides), ...Object.entries(manifest.categories), ...Object.entries(manifest.deals)];
  for (const [k, m] of all) {
    assert.ok(['cj-product-feed', 'unsplash'].includes(m.source), `${k}: unknown source ${m.source}`);
    assert.ok(m.alt && m.alt.length > 8, `${k}: alt`);
    assert.doesNotMatch(m.alt + ' ' + (m.product_title || ''), /mascot|character|cartoon|logo|Chuck E/i, `${k}: no characters or logos`);
    if (m.source === 'unsplash') {
      assert.match(m.page, /^https:\/\/unsplash\.com\/photos\/[\w-]+$/);
      assert.ok(m.author, `${k}: photographer`);
      assert.equal(m.license_url, 'https://unsplash.com/license');
      assert.match(m.src, /^https:\/\/images\.unsplash\.com\/photo-/, `${k}: free Unsplash image host (not plus.unsplash.com)`);
    } else {
      assert.ok(m.advertiser_id && m.product_id, `${k}: CJ advertiser and product`);
    }
  }
});

test('DDM images: refresh PR script keeps and backfills images', () => {
  const sh = read(path.join(BUILDER, 'refresh_pr.sh'));
  assert.match(sh, /images\.py fetch/);
  assert.match(sh, /images\.py check/);
  assert.match(sh, /git add -A ddm /);
  assert.ok(sh.indexOf('images.py fetch') < sh.indexOf('build.py'), 'images are prepared before the build');
});
