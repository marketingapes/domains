import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, 'fplb', p), 'utf8');
const TAG = 'tonedntastyne-20'; // TNT Associates tag, the same one fplb/amazon-dog-deals uses
const AMZ = 'https://www.amazon.com/s';
const html = read('price-finder/index.html');
const js = read('assets/price-finder.js');
const css = read('assets/price-finder.css');

test('FPLB price finder: branded page with the shared header and footer, canonical, in the sitemap', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/forpetslikeblue\.com\/price-finder\/">/);
  assert.match(html, /<header class="fplb-head">/);
  assert.match(html, /<footer class="fplb-foot">/);
  const gift = read('gift-finder/index.html');
  const part = (h, re) => h.match(re)[0];
  assert.equal(part(html, /<header class="fplb-head">[\s\S]*?<\/header>/), part(gift, /<header class="fplb-head">[\s\S]*?<\/header>/));
  assert.equal(part(html, /<footer class="fplb-foot">[\s\S]*?<\/footer>/), part(gift, /<footer class="fplb-foot">[\s\S]*?<\/footer>/));
  assert.equal([...html.matchAll(/<h1[ >]/g)].length, 1);
  assert.match(html, /<h1 id="pf-h">Tell Blue what your pet needs\. <em>See Amazon’s lowest prices first\.<\/em><\/h1>/);
  assert.match(html, /GTM-MV4SK9DN/);
  assert.match(html, /<script src="\/assets\/ee-click\.js\?v=1" defer data-site="fplb"><\/script>/);
  assert.doesNotMatch(html, /adsbygoogle\.js/, 'shopping page: no AdSense loader');
  assert.ok(read('sitemap.xml').includes('https://forpetslikeblue.com/price-finder/'));
  // Load order: page styles before the brand kit, as brand.css asks.
  assert.ok(html.indexOf('/assets/site.css') < html.indexOf('/assets/price-finder.css'));
  assert.ok(html.indexOf('/assets/price-finder.css') < html.indexOf('/assets/brand.css'));
  for (const m of html.matchAll(/<img [^>]*>/g)) {
    assert.match(m[0], /width="\d+" height="\d+"/, m[0]);
    const src = m[0].match(/src="([^"]+)"/)[1];
    assert.ok(fs.existsSync(path.join(ROOT, 'fplb', src)), `missing ${src}`);
  }
});

test('FPLB price finder: Amazon rules. Tagged links, disclosure by the button, no prices, ratings, Amazon images or promises', () => {
  assert.match(html, /<form class="pf-form" id="amz-form"[^>]*data-tag="tonedntastyne-20"[^>]*data-amz="https:\/\/www\.amazon\.com\/s"/);
  assert.match(html, /<input type="hidden" name="tag" value="tonedntastyne-20">/);
  assert.match(html, /<input type="hidden" name="s" value="price-asc-rank">/);
  const links = [...html.matchAll(/<a [^>]*href="https:\/\/www\.amazon\.com[^"]*"[^>]*>/g)];
  assert.equal(links.length, 1);
  for (const m of links) {
    assert.match(m[0], /tag=tonedntastyne-20/);
    assert.match(m[0], /rel="sponsored nofollow noopener"/);
    assert.match(m[0], /target="_blank"/);
  }
  const result = html.match(/<section class="pf-result"[\s\S]*?<\/section>/)[0];
  assert.match(result, /As an Amazon Associate we earn from qualifying purchases\./);
  assert.match(html, /<p class="fplb-disclose"><strong>As an Amazon Associate we earn from qualifying purchases\.<\/strong>/);
  assert.match(html, /sorted by price, low to high/);
  assert.match(html, /We do not check, track or show Amazon prices/);
  assert.doesNotMatch(html, /media-amazon\.com|ssl-images-amazon|images-na\.ssl|amazon[^"']*\.(png|svg|jpg)/i, 'no Amazon images or logos');
  assert.doesNotMatch(html, /cheapest|best price|best deal|lowest price guarantee|we found|price match|★|stars? rating/i);
  assert.doesNotMatch(html, /\d+\s?% off|\bsave \$|\bwas \$/i);
  // Example budgets are the only dollar figures on the page.
  const main = html.match(/<main[\s\S]*?<\/main>/)[0].replace(/<p class="pf-ex"[\s\S]*?<\/p>/, '').replace(/<b aria-hidden="true">\$<\/b>/g, '');
  assert.doesNotMatch(main, /\$\d/);
  for (const s of [html, js, css]) assert.doesNotMatch(s, /AI[- ]generated|AI summary|—/);
  assert.doesNotMatch(html, /vet[- ]approved|recommended by vets|safe for/i);
  assert.match(html, /Nothing here is veterinary advice\./);
});

test('FPLB price finder: the pet row is optional and nothing is picked by default', () => {
  const row = html.match(/<div class="pf-row" role="radiogroup"[\s\S]*?<\/div>/)[0];
  const radios = [...row.matchAll(/<input type="radio" name="use" value="([^"]*)"( checked)?>/g)];
  assert.deepEqual(radios.map((m) => m[1]), ['', 'dogs', 'cats', 'birds', 'fish', 'small pets']);
  assert.deepEqual(radios.filter((m) => m[2]).map((m) => m[1]), ['']);
  for (const m of css.matchAll(/min-height:\s*(\d+)px/g)) assert.ok(Number(m[1]) >= 48, `min-height ${m[1]}px`);
  assert.match(css, /\.pf-bar input \{[^}]*font:\s*500 1\.08rem/, 'inputs stay at 16px or more so iOS does not zoom');
});

const api = () => {
  const window = {};
  vm.runInNewContext(js, { window, document: { getElementById: () => null }, URLSearchParams, parseFloat, String, Math, RegExp, location: { search: '', pathname: '/price-finder/' } });
  return window.FPLB_PF;
};

test('FPLB price finder: links are tagged, sorted low to high, and carry the pet and the budget', () => {
  const pf = api();
  assert.equal(pf.sort, 'price-asc-rank');
  const u = (o) => new URL(pf.link(o, TAG, AMZ));
  let x = u({ q: 'treats', use: 'dogs', max: '15' });
  assert.equal(x.origin + x.pathname, AMZ);
  assert.equal(x.searchParams.get('k'), 'treats for dogs');
  assert.equal(x.searchParams.get('rh'), 'p_36:-1500');
  assert.equal(x.searchParams.get('s'), 'price-asc-rank');
  assert.equal(x.searchParams.get('tag'), TAG);
  x = u({ q: 'orthopedic bed', use: 'dogs', min: '40', max: '120' });
  assert.equal(x.searchParams.get('rh'), 'p_36:4000-12000');
  x = u({ q: 'cat tree', use: 'cats', min: '80', max: '30' });
  assert.equal(x.searchParams.get('k'), 'cat tree', 'a pet already named in the words is not repeated');
  assert.equal(x.searchParams.get('rh'), 'p_36:3000-8000', 'swapped budget is put in order');
  assert.equal(u({ q: 'dog food', use: 'dogs' }).searchParams.get('k'), 'dog food');
  assert.equal(u({ q: 'hay', use: 'small pets' }).searchParams.get('k'), 'hay for small pets');
  assert.equal(u({ q: '  cat   litter ' }).searchParams.get('k'), 'cat litter');
  assert.equal(u({ q: 'cat litter' }).searchParams.get('rh'), null);
  assert.equal(pf.link({ q: '' }, TAG, AMZ), '');
  assert.equal(pf.link({ q: 'bed' }, '  ', AMZ), '', 'no tag, no link');
  assert.equal(pf.describe({ max: '15' }), 'up to $15, sorted by price, low to high');
  assert.equal(pf.describe({ min: '40', max: '120' }), 'between $40 and $120, sorted by price, low to high');
  assert.equal(pf.scrub('bed for jane.doe@example.com call 555-123-4567'), 'bed for [email] call [number]');
  assert.equal(pf.scrub('x'.repeat(300)).length, 100);
});

test('FPLB price finder: the script has no tag, no Amazon address and no network calls, and records nothing while typing', () => {
  assert.doesNotMatch(js, /tonedntastyne-20/);
  assert.doesNotMatch(js, /https?:\/\//);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon/);
  assert.doesNotMatch(js, /addEventListener\('(keydown|keyup|keypress)'/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /removeAttribute\('data-ee-orig'\)/);
});

test('FPLB price finder: every example chip, in the page and in each pet set, builds a tagged price-sorted link', () => {
  const pf = api();
  const sets = JSON.parse(html.match(/data-sets='([^']+)'/)[1]);
  assert.deepEqual(Object.keys(sets), ['', 'dogs', 'cats', 'birds', 'fish', 'small pets']);
  const shipped = [...html.matchAll(/<a class="pf-chip" href="([^"]+)" data-fill='([^']+)'>([^<]+)<\/a>/g)];
  assert.equal(shipped.length, sets[''].length);
  shipped.forEach(([, href, fill, label], i) => {
    assert.equal(label, sets[''][i][0]);
    assert.deepEqual(JSON.parse(fill), sets[''][i][1]);
    assert.equal(href.replaceAll('&amp;', '&'), '/price-finder/?' + new URLSearchParams(sets[''][i][1]).toString());
  });
  for (const [pet, list] of Object.entries(sets)) {
    assert.ok(list.length >= 4, pet);
    for (const [label, p] of list) {
      assert.deepEqual(Object.keys(p).filter((k) => !['q', 'use', 'min', 'max'].includes(k)), [], label);
      if (pet) assert.equal(p.use, pet, `${label} keeps the picked pet`);
      const x = new URL(pf.link(p, TAG, AMZ));
      assert.equal(x.searchParams.get('tag'), TAG, label);
      assert.equal(x.searchParams.get('s'), 'price-asc-rank', label);
    }
  }
});

test('FPLB price finder: a search fills the result link, and an email link opens ready to go', () => {
  const run = (search, fields) => {
    const elements = Object.fromEntries(Object.entries({ k: '', use: '', min: '', max: '', ...fields }).map(([k, v]) => [k, { value: v, focus() {} }]));
    const handlers = {};
    const attrs = { href: 'x' };
    const nodes = {
      matches: { hidden: true, offsetWidth: 0, classList: { add() {}, remove() {} }, scrollIntoView() {} },
      'm-query': { textContent: '', kids: [], appendChild(n) { this.kids.push(n); } },
      'm-amz': { get href() { return attrs.href; }, set href(v) { attrs.href = v; }, removeAttribute() {}, addEventListener() {}, focus() {} },
      'm-error': { hidden: true, textContent: '' },
    };
    const form = {
      getAttribute: (a) => ({ 'data-tag': TAG, 'data-amz': AMZ })[a],
      elements,
      addEventListener: (t, fn) => { handlers[t] = fn; },
      reset() { for (const el of Object.values(elements)) el.value = ''; },
    };
    const window = {};
    const document = {
      activeElement: null,
      getElementById: (id) => (id === 'amz-form' ? form : nodes[id] || null),
      createElement: () => ({ textContent: '' }),
      createTextNode: (t) => ({ textContent: t }),
    };
    vm.runInNewContext(js, { window, document, URLSearchParams, parseFloat, String, Math, RegExp, JSON, location: { search, pathname: '/price-finder/' } });
    if (!search) handlers.submit({ preventDefault() {} });
    return { url: new URL(attrs.href).searchParams, shown: !nodes.matches.hidden, text: nodes['m-query'].kids.map((k) => k.textContent).join(''), layer: window.dataLayer };
  };
  const typed = run('', { k: 'chew toys', use: 'dogs', max: '20' });
  assert.equal(typed.shown, true);
  assert.equal(typed.url.get('k'), 'chew toys for dogs');
  assert.equal(typed.url.get('rh'), 'p_36:-2000');
  assert.equal(typed.url.get('tag'), TAG);
  assert.equal(typed.text, 'chew toys for dogs, up to $20, sorted by price, low to high');
  assert.deepEqual(JSON.parse(JSON.stringify(typed.layer)), [{
    event: 'fplb_price_finder_search', tool: 'price_finder', page: '/price-finder/', search_term: 'chew toys for dogs', pet: 'dogs', budget_min: '', budget_max: 20, search_source: 'typed',
  }]);
  const linked = run('?q=gifts&use=dogs&max=25&utm_source=gmass&utm_medium=email', {});
  assert.equal(linked.shown, true);
  assert.equal(linked.url.get('k'), 'gifts for dogs');
  assert.equal(linked.url.get('rh'), 'p_36:-2500');
  assert.equal(linked.layer[0].search_source, 'link');
});
