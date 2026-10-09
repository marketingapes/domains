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
  assert.match(html, /awinmid=111756/);
});

test('CGG offers page is the Crazy Golf Gift Guide with labelled, issued affiliate links only', () => {
  const html = fs.readFileSync(path.join(ROOT, 'cgg/offers/index.html'), 'utf8');
  assert.match(html, /Crazy Golf <em>Gift Guide<\/em> 2026/);
  // CJ links under the CGG property PID and the Impact Best Choice Products link
  assert.match(html, /click-101511730-14054834\?sid=cgg-/);
  assert.match(html, /click-101511730-17315782\?sid=cgg-/);
  assert.match(html, /bestchoiceproducts\.sjv\.io\/c\/335485\//);
  // every affiliate link is sponsored and labelled, and the page carries the disclosure
  const links = html.match(/<a [^>]*data-offer="[^"]+"[^>]*>/g) || [];
  assert.ok(links.length >= 4);
  for (const a of links) assert.match(a, /rel="sponsored noopener"/);
  assert.equal((html.match(/class="aff-tag">Affiliate link</g) || []).length, links.length);
  assert.match(html, /id="disclosure"/);
  assert.match(html, /#ad/);
  // no unfinished cards, and the retired single-offer page is gone
  assert.doesNotMatch(html, /TODO\(Kyle\)|data-todo|aff-todo/);
  assert.doesNotMatch(html, /Flextail|awinmid=60295|cgg-flex/i);
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
