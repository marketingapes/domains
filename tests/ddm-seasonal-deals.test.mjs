import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PAGES = { halloween: 'ddm/deals/halloween/index.html', pets: 'ddm/deals/pet-supplies/index.html' };
const CJ = /href="(https:\/\/www\.(?:dpbolvw\.net|jdoqocy\.com|tkqlhce\.com|anrdoezrs\.net|kqzyfj\.com)\/click-[^"]+)"/g;

for (const [name, file] of Object.entries(PAGES)) {
  test(`DDM ${name} page: CJ links on property 101511733 with the dated site SID, sponsored rel, disclosure`, () => {
    const html = read(file);
    const links = [...html.matchAll(CJ)].map((m) => m[1]);
    assert.ok(links.length >= 5);
    for (const href of links) {
      assert.match(href, /\/click-101511733-\d+-\d+\?sid=ddm-site-20261013$/);
    }
    for (const m of html.matchAll(/<a [^>]*href="https:\/\/www\.(?:dpbolvw|jdoqocy|tkqlhce|anrdoezrs|kqzyfj)[^>]*>/g)) {
      assert.match(m[0], /rel="sponsored nofollow noopener"/);
    }
    assert.match(html, /#ad/);
    assert.match(html, /may earn a commission/);
    assert.match(html, /AI summary/);
    assert.equal((html.match(/data-signup="/g) || []).length, 1);
    assert.match(html, /GTM-W3D26R29/);
    for (const m of html.matchAll(/<article class="deal"[^>]*>/g)) assert.match(m[0], /data-ends="20\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ"/);
    for (const m of html.matchAll(/<img src="(\/images\/deals\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(ROOT, 'ddm', m[1])), m[1]);
  });
}

test('DDM Halloween page: real network codes and end times, ended state after Nov 1', () => {
  const html = read(PAGES.halloween);
  assert.match(html, /rel="canonical" href="https:\/\/discountdealme\.com\/deals\/halloween\/"/);
  assert.match(html, /data-page-end="2026-11-02T04:59:00Z"/);
  assert.match(html, /Halloween 2026 deals have ended/);
  for (const [id, code, ends] of [['17357453', 'HALLOWEEN', '2026-11-02T04:59:00Z'], ['17174428', 'MONSTER', '2026-10-19T07:00:00Z'],
    ['17178579', 'CAULDRON', '2026-10-27T07:00:00Z'], ['17361218', 'SPOOKY', '2026-11-01T06:59:00Z']]) {
    assert.match(html, new RegExp(`id="cj-${id}"[^>]*data-ends="${ends}"`));
    assert.match(html, new RegExp(`data-copy="${code}"`));
  }
  assert.match(html, /data-starts="2026-10-29T07:00:00Z"/);
});

test('DDM pet page: DISCOVER ends Oct 14 11:30 AM PT and ongoing codes keep the page useful', () => {
  const html = read(PAGES.pets);
  assert.match(html, /id="cj-17364986"[^>]*data-ends="2026-10-14T18:30:00Z"/);
  assert.match(html, /click-101511733-17364986-/);
  assert.match(html, /data-copy="DISCOVER"/);
  assert.match(html, /data-copy="SUMMER12"/);
  assert.match(html, /data-copy="SAVE15"/);
  assert.match(html, /Ongoing pet codes/);
});

test('DDM seasonal pages are linked from /deals/ and /offers/ and listed in the sitemap', () => {
  const sm = read('ddm/sitemap.xml');
  for (const p of ['/deals/halloween/', '/deals/pet-supplies/']) {
    assert.match(read('ddm/deals/index.html'), new RegExp(`href="${p}"`));
    assert.match(read('ddm/offers/index.html'), new RegExp(`href="${p}"`));
    assert.match(sm, new RegExp(`discountdealme\\.com${p}<`));
  }
  assert.match(read('ddm/offers/index.html'), /data-expires="2026-11-02T04:59:00Z"/);
});
