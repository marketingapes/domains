import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');

const CODEX_WORKSHEETS = {
  'ddm/guides/checkout-comparison/index.html':
    '1e621c789ea0470e43b0601f43fbc23243065dbf9b399e864f5bf83f8e306622',
  'px/guides/pillow-cover-fit/index.html':
    '85fbf42d6acbfdc9ac6f16e331399748cd8e2929d828ab276964203746af505a',
};

test('Codex worksheet paths keep the PR 63 bytes', () => {
  for (const [rel, expected] of Object.entries(CODEX_WORKSHEETS)) {
    const local = fs.readFileSync(path.join(ROOT, rel));
    const sha = createHash('sha256').update(local).digest('hex');
    assert.equal(sha, expected);
  }
});

test('FPLB portrait guide is useful, disclosed, and does not add a new tracker URL', () => {
  const html = fs.readFileSync(path.join(ROOT, 'fplb/guides/pet-portrait-selection/index.html'), 'utf8');
  assert.match(html, /Choose a pet portrait from the photo you have/);
  assert.match(html, /#ad/);
  assert.match(html, /rel="sponsored"/);
  assert.match(html, /href="\/offers\/"/);
  assert.match(html, /awinaffid=2572337|publisher 2572337/);
  assert.match(html, /31868/);
  assert.match(html, /fplb-home/);
  assert.doesNotMatch(html, /awin1\.com\/cread\.php/);
  assert.doesNotMatch(html, /15%|EPC|\$1\.25/);
});

test('FPLB shopping checklist points at the portrait guide', () => {
  const html = fs.readFileSync(path.join(ROOT, 'fplb/pet-shopping-checklist/index.html'), 'utf8');
  assert.match(html, /href="\/guides\/pet-portrait-selection\/"/);
});

test('CGG planner carries no sponsored links and sends readers to the drills', () => {
  const html = fs.readFileSync(path.join(ROOT, 'cgg/practice-session-planner/index.html'), 'utf8');
  // the page promises "no affiliate purchase links or sponsored product recommendations"; keep that true
  assert.match(html, /no affiliate purchase links or sponsored product recommendations/);
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  assert.ok(main.length > 500);
  assert.doesNotMatch(main, /rel="sponsored|#ad|data-offer/i);
  assert.doesNotMatch(html, /Flextail|60295|cgg-flex|awin1\.com/i);
  assert.match(html, /href="\/get-better\/putting-ladder-drill\/"/);
  assert.match(html, /window\.print\(\)/);
});

test('CGG ships no unfinished placeholders or email capture that is not connected', () => {
  for (const rel of ['index.html', 'clubhouse/index.html', 'offers/index.html']) {
    const html = fs.readFileSync(path.join(ROOT, 'cgg', rel), 'utf8');
    assert.doesNotMatch(html, /TODO\(Kyle\)|data-todo/);
    assert.doesNotMatch(html, /type="email"|data-newsletter/);
  }
  const home = fs.readFileSync(path.join(ROOT, 'cgg/index.html'), 'utf8');
  assert.match(home, /In the works/);
  assert.match(home, /Follow @crazygolfgame on X/);
});

test('DDM deal checklist adds Tayst discovery without editing Codex worksheet path', () => {
  const html = fs.readFileSync(path.join(ROOT, 'ddm/deal-checklist/index.html'), 'utf8');
  assert.match(html, /href="\/guides\/checkout-comparison\/"/);
  assert.match(html, /href="\/offers\/"/);
  assert.match(html, /90529/);
  assert.match(html, /ddm-home/);
  assert.match(html, /#ad/);
  assert.doesNotMatch(html, /awin1\.com\/cread\.php/);
});

test('FPLB robots and sitemap allow the portrait guide', () => {
  const robots = fs.readFileSync(path.join(ROOT, 'fplb/robots.txt'), 'utf8');
  assert.match(robots, /Allow: \/guides\/pet-portrait-selection\//);
  const sitemap = fs.readFileSync(path.join(ROOT, 'fplb/sitemap.xml'), 'utf8');
  assert.match(sitemap, /https:\/\/forpetslikeblue\.com\/guides\/pet-portrait-selection\//);
});
