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
  assert.match(html, /#ad/);
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
  assert.match(html, /#ad/);
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

test('CGG offers page uses Flextail Awin tracking', () => {
  const html = fs.readFileSync(path.join(ROOT, 'cgg/offers/index.html'), 'utf8');
  assert.match(html, /awinmid=60295/);
  assert.match(html, /awinaffid=2572337/);
  assert.match(html, /rel="sponsored/);
  assert.match(html, /#ad/);
});

test('preview pages point at /offers/ with sponsored rel', () => {
  for (const slug of ['fplb', 'ddm', 'cgg']) {
    const html = fs.readFileSync(path.join(ROOT, slug, 'preview/index.html'), 'utf8');
    assert.match(html, /href="\/offers\/"/);
    assert.match(html, /rel="sponsored"/);
    assert.match(html, /#ad/);
  }
});

test('offer heroes exist', () => {
  for (const slug of ['fplb', 'ddm', 'cgg']) {
    assert.ok(fs.existsSync(path.join(ROOT, slug, 'offers/hero.jpg')));
    const html = fs.readFileSync(path.join(ROOT, slug, 'offers/index.html'), 'utf8');
    assert.match(html, /hero\.jpg/);
    assert.match(html, /affiliate_click/);
  }
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
