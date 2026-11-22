// Pillow Exchange swap marketplace pages (px/). AdSense stays off marketplace pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PX = path.resolve(import.meta.dirname, '..', 'px');
const read = (p) => fs.readFileSync(path.join(PX, p), 'utf8');
const MARKET = ['index.html', 'post/index.html', 'listing/index.html', 'my-swaps/index.html', 'account/index.html', 'rules/index.html'];

for (const rel of MARKET) {
  test(`px market ${rel}: no AdSense, has API meta, exchange script and click capture`, () => {
    const html = read(rel);
    assert.doesNotMatch(html, /adsbygoogle|google-adsense-account/);
    assert.match(html, /<meta name="px-api" content="https:\/\/[a-z0-9.-]+\.onrender\.com">/);
    assert.match(html, /<script src="\/assets\/exchange\.js\?v=\d+" defer><\/script>/);
    assert.match(html, /<script src="\/assets\/ee-click\.js\?v=1" defer data-site="px"/);
    assert.match(html, /href="\/rules\/"/);
    assert.doesNotMatch(html, /\/preview\//);
  });
}

test('px market: guides, articles and deals stay reachable from the home page', () => {
  const html = read('index.html');
  for (const href of ['/guides/', '/articles/', '/offers/', '/gift-finder/']) assert.ok(html.includes(`href="${href}"`), href);
  assert.ok(fs.existsSync(path.join(PX, 'guides/index.html')));
  assert.match(read('guides/index.html'), /adsbygoogle\.js\?client=ca-pub-5194583669093303/);
});

test('px market: example listings are labelled and their photos exist', () => {
  assert.match(read('index.html'), /badge-demo">Example</);
  for (const f of ['mustard-velvet', 'cream-knit', 'lumbar-mudcloth', 'navy-stripe', 'sage-linen', 'tartan-holiday', 'blush-boucle', 'boho-fringe']) {
    assert.ok(fs.existsSync(path.join(PX, 'images/demo', `${f}.jpg`)), f);
  }
});

test('px market: old /preview/ exchange page is retired', () => {
  const html = read('preview/index.html');
  assert.match(html, /noindex/);
  assert.match(html, /http-equiv="refresh" content="0; url=\/"/);
  assert.match(html, /id="ee-form" hidden/);
  assert.doesNotMatch(html, /Shop The Exchange/);
});

test('px market: front end escapes user content', () => {
  const js = read('assets/exchange.js');
  assert.match(js, /function esc\(/);
  assert.doesNotMatch(js, /innerHTML\s*=\s*[^;]*\bl\.(title|description|want)\b(?![^;]*esc)/);
});
