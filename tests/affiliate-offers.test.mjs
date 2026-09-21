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
