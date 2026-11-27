import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

test('FPLB offers page uses verified Awin publisher and Purr and Mutt merchant', () => {
  const html = fs.readFileSync(path.join(ROOT, 'fplb/offers/index.html'), 'utf8');
  assert.match(html, /awinmid=31868/);
  assert.match(html, /awinaffid=2572337/);
  assert.match(html, /clickref=fplb-home/);
  assert.match(html, /rel="sponsored/);
  assert.match(html, /awinmid=113600/);
  assert.match(html, /awinmid=89689/);
  assert.match(html, /awinmid=87939/);
});

test('DDM offers page uses verified Awin publisher and Tayst merchant', () => {
  const html = fs.readFileSync(path.join(ROOT, 'ddm/offers/index.html'), 'utf8');
  assert.match(html, /awinmid=90529/);
  assert.match(html, /awinaffid=2572337/);
  assert.match(html, /clickref=ddm-home/);
  assert.match(html, /rel="sponsored/);
  assert.match(html, /awinmid=62217/);
  assert.match(html, /awinmid=60295/);
  // 111756 (Design It Yourself Gift Baskets) is not a joined Awin programme; 33247 is.
  assert.doesNotMatch(html, /awinmid=111756/);
  assert.match(html, /awinmid=33247/);
});

test('DDM offers page uses CJ links from the DDM CJ property (101511733) only', () => {
  const html = fs.readFileSync(path.join(ROOT, 'ddm/offers/index.html'), 'utf8');
  const cj = [...html.matchAll(/href="(https:\/\/www\.(?:dpbolvw\.net|jdoqocy\.com|tkqlhce\.com|anrdoezrs\.net|kqzyfj\.com)\/click-[^"]+)"/g)].map((m) => m[1]);
  assert.equal(cj.length, 3);
  for (const href of cj) assert.match(href, /\/click-101511733-/);
  assert.match(html, /click-101511733-15204586/); // Groupon deal of the day
  assert.match(html, /click-101511733-17166872/); // All-Clad.com (Home & Cook)
  assert.match(html, /click-101511733-15733888/); // M&M's evergreen
});

test('DDM email sign-up is consented, honeypotted and present on home, offers and guides', () => {
  for (const rel of ['ddm/index.html', 'ddm/offers/index.html', 'ddm/articles/how-to-spot-a-real-deal/index.html']) {
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.equal((html.match(/data-signup="/g) || []).length, 1, rel);
    assert.match(html, /name="consent" value="yes" required/, rel);
    assert.match(html, /name="website"/, rel);
    assert.match(html, /Unsubscribe any time/, rel);
    assert.match(html, /\/privacy\/#email-list/, rel);
    assert.match(html, /\/assets\/signup\.js/, rel);
  }
  const privacy = fs.readFileSync(path.join(ROOT, 'ddm/privacy/index.html'), 'utf8');
  assert.match(privacy, /id="email-list"/);
  assert.ok(fs.existsSync(path.join(ROOT, 'ddm/assets/signup.js')));
});

test('CGG offers page is the Crazy Golf Gift Guide with issued, sponsored links only', () => {
  const html = fs.readFileSync(path.join(ROOT, 'cgg/offers/index.html'), 'utf8');
  assert.match(html, /Crazy Golf <em>Gift Guide<\/em> 2026/);
  // CJ links under the CGG property PID and the Impact Best Choice Products link
  assert.match(html, /click-101511730-14054834\?sid=cgg-/);
  assert.match(html, /click-101511730-17315782\?sid=cgg-/);
  assert.match(html, /bestchoiceproducts\.sjv\.io\/c\/335485\//);
  // every offer link stays sponsored and tagged
  const links = html.match(/<a [^>]*data-offer="[^"]+"[^>]*>/g) || [];
  assert.ok(links.length >= 4);
  for (const a of links) assert.match(a, /rel="sponsored nofollow noopener"/);
  // no unfinished cards, and the retired single-offer page is gone
  assert.doesNotMatch(html, /TODO\(Kyle\)|data-todo|aff-todo/);
  assert.doesNotMatch(html, /Flextail|awinmid=60295|cgg-flex/i);
});

test('preview pages point at /offers/ with sponsored rel', () => {
  for (const slug of ['fplb', 'ddm', 'cgg']) {
    const html = fs.readFileSync(path.join(ROOT, slug, 'preview/index.html'), 'utf8');
    assert.match(html, /href="\/offers\/"/);
    assert.match(html, /rel="sponsored"/);
    }
});

test('offer heroes exist', () => {
  for (const slug of ['fplb', 'ddm']) {
    assert.ok(fs.existsSync(path.join(ROOT, slug, 'offers/hero.jpg')));
    const html = fs.readFileSync(path.join(ROOT, slug, 'offers/index.html'), 'utf8');
    assert.match(html, /hero\.jpg/);
    assert.match(html, /affiliate_click/);
  }
  // CGG's gift guide uses a credited WebP hero photo; affiliate_click tracking ships in site.js on every page
  const cgg = fs.readFileSync(path.join(ROOT, 'cgg/offers/index.html'), 'utf8');
  const hero = cgg.match(/<section class="dhero gift">[\s\S]*?src="(\/images\/photos\/[^"]+\.webp)"/);
  assert.ok(hero, 'gift guide hero photo');
  assert.ok(fs.existsSync(path.join(ROOT, 'cgg', hero[1])));
  assert.match(cgg, /<script src="\/assets\/site\.js" defer><\/script>/);
  assert.match(fs.readFileSync(path.join(ROOT, 'cgg/assets/site.js'), 'utf8'), /affiliate_click/);
});

test('robots allow /offers/ on FPLB, DDM and CGG', () => {
  for (const slug of ['fplb', 'ddm', 'cgg']) {
    const robots = fs.readFileSync(path.join(ROOT, slug, 'robots.txt'), 'utf8');
    assert.match(robots, /Allow: \/offers\//);
  }
});

test('offer and portrait pages reuse existing brand GTM containers', () => {
  const fplb = fs.readFileSync(path.join(ROOT, 'fplb/offers/index.html'), 'utf8');
  const guide = fs.readFileSync(path.join(ROOT, 'fplb/guides/pet-portrait-selection/index.html'), 'utf8');
  const ddm = fs.readFileSync(path.join(ROOT, 'ddm/offers/index.html'), 'utf8');
  const cgg = fs.readFileSync(path.join(ROOT, 'cgg/offers/index.html'), 'utf8');
  assert.match(fplb, /GTM-MV4SK9DN/);
  assert.match(guide, /GTM-MV4SK9DN/);
  assert.match(ddm, /GTM-W3D26R29/);
  assert.match(cgg, /GTM-K8TXN9/);
  assert.match(fplb, /affiliate_click/);
});


test('H2M offers page has no untagged Amazon links and keeps tracked Awin links', () => {
  const html = fs.readFileSync(path.join(ROOT, 'h2m/offers/index.html'), 'utf8');
  const amazonHrefs = [...html.matchAll(/href="([^"]*amazon\.com[^"]*)"/gi)].map((m) => m[1]);
  assert.equal(amazonHrefs.length, 0, 'no Amazon hrefs until an H2M tracking ID exists');
  assert.doesNotMatch(html, /tag=TAG_PENDING/);
  assert.doesNotMatch(html, /tonedntastyne-20/);
  for (const asin of ['B0B89P16MC', 'B096SVJZSW', 'B0170GOCVO', 'B00062ADKO']) {
    assert.match(html, new RegExp(`TODO\\(Kyle\\)[\\s\\S]*${asin}[\\s\\S]*H2M_AMAZON_TAG`));
  }
  const awin = [...html.matchAll(/href="(https:\/\/www\.awin1\.com\/cread\.php[^"]+)"/g)].map((m) => m[1]);
  assert.equal(awin.length, 6);
  for (const href of awin) {
    assert.match(href, /awinaffid=2572337/);
    assert.match(href, /clickref=h2m-offers-/);
  }
  const aff = html.match(/<a [^>]*data-sid="h2m-offers-[^"]+"[^>]*>/g) || [];
  assert.equal(aff.length, 6);
  for (const a of aff) assert.match(a, /rel="sponsored nofollow noopener"/);
  // Do not add an Amazon Associate line in visible copy
  const visible = html.replace(/<!--[\s\S]*?-->/g, '');
  assert.doesNotMatch(visible, /As an Amazon Associate/);
});

test('CGG and KG have consented, honeypotted brand-tagged signup forms', () => {
  const pages = [
    ['cgg/index.html', 'cgg', 'cgg-weekly-slice-v1'],
    ['cgg/clubhouse/index.html', 'cgg', 'cgg-weekly-slice-v1'],
    ['kg/index.html', 'kg', 'kg-build-updates-v1'],
  ];
  for (const [rel, brand, version] of pages) {
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.equal((html.match(/data-signup="/g) || []).length, 1, rel);
    assert.match(html, new RegExp(`name="brand" value="${brand}"`), rel);
    assert.match(html, /name="consent" value="yes" required/, rel);
    assert.doesNotMatch(html, /name="consent"[^>]*checked/, rel);
    assert.match(html, /name="website"/, rel);
    assert.match(html, new RegExp(`name="consent_version" value="${version}"`), rel);
    assert.match(html, /\/privacy\/#email-list/, rel);
    assert.match(html, /\/assets\/signup\.js/, rel);
    assert.match(html, /action="https:\/\/hook\.us2\.make\.com\/[a-z0-9]+"/, rel);
  }
  const cggPrivacy = fs.readFileSync(path.join(ROOT, 'cgg/privacy/index.html'), 'utf8');
  const kgPrivacy = fs.readFileSync(path.join(ROOT, 'kg/privacy/index.html'), 'utf8');
  assert.match(cggPrivacy, /id="email-list"/);
  assert.match(kgPrivacy, /id="email-list"/);
  assert.ok(fs.existsSync(path.join(ROOT, 'cgg/assets/signup.js')));
  assert.ok(fs.existsSync(path.join(ROOT, 'kg/assets/signup.js')));
  const js = fs.readFileSync(path.join(ROOT, 'cgg/assets/signup.js'), 'utf8');
  assert.match(js, /is_test/);
  assert.match(js, /signup_test/);
  assert.doesNotMatch(js, /GMass|gmass|send email|welcome/i);
});

test('signup success hides the form fields even when CSS uses display:flex', () => {
  for (const js of ['cgg/assets/signup.js', 'kg/assets/signup.js']) {
    assert.match(fs.readFileSync(path.join(ROOT, js), 'utf8'), /classList\.add\('is-done'\)/);
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'cgg/assets/v4.css'), 'utf8'), /form\[data-signup\]\.is-done/);
  assert.match(fs.readFileSync(path.join(ROOT, 'kg/assets/story.css'), 'utf8'), /form\[data-signup\]\.is-done/);
});
