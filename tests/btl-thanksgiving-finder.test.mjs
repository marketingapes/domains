import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, 'btl', p), 'utf8');
const TAG = 'tonedntastyne-20'; // TNT Associates tag, as on the other Amazon finder pages
const AMZ = 'https://www.amazon.com/s';
const html = read('thanksgiving/index.html');
const js = read('assets/price-finder.js');
const css = read('assets/thanksgiving.css');

test('BTL Thanksgiving finder: a holiday extra kept apart from intake. No form to us, no tag manager or ad pixels, not indexed', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/besttortlawyers\.com\/thanksgiving\/">/);
  assert.match(html, /<meta name="robots" content="noindex,follow">/);
  assert.ok(!read('sitemap.xml').includes('/thanksgiving/'), 'a noindex page stays out of the sitemap');
  assert.equal([...html.matchAll(/<h1[ >]/g)].length, 1);
  assert.equal([...html.matchAll(/<form[ >]/g)].length, 1, 'the only form is the Amazon search');
  // The site tag container loads the ad pixels, so this page leaves it out (owner's call, 2026-11-24).
  assert.doesNotMatch(html, /googletagmanager|GTM-[A-Z0-9]+/, 'no tag manager, so no ad pixels fire here');
  assert.match(html, /<script src="\/assets\/ee-click\.js\?v=1" defer data-site="btl"><\/script>/);
  assert.doesNotMatch(html, /fbq\(|connect\.facebook\.net|analytics\.tiktok\.com|ttq\./, 'no ad pixels on a shopping page');
  assert.doesNotMatch(html, /adsbygoogle|google-adsense-account/, 'legal brands never carry AdSense');
  assert.doesNotMatch(html, /lead_destination|hook\.us2\.make\.com|type="tel"|type="email"/, 'collects nothing');
  // Legal-safety wording: no claim, outcome or qualification language on this page.
  assert.doesNotMatch(html, /\bqualify\b|\bqualified\b|compensation|settlement|case review|free consultation|you may be owed|no fee/i);
  assert.match(html, /Attorney advertising\./);
  assert.match(html, /does not create an attorney-client relationship/);
  assert.match(html, /It has nothing to do with any legal claim/);
  for (const m of html.matchAll(/<img [^>]*>/g)) {
    assert.match(m[0], /width="\d+" height="\d+"/, m[0]);
    assert.ok(fs.existsSync(path.join(ROOT, 'btl', m[0].match(/src="([^"]+)"/)[1])));
  }
});

test('BTL Thanksgiving finder: Amazon rules. Tagged links, disclosure by the button, no prices, ratings, Amazon images or promises', () => {
  assert.match(html, /<form class="tf-form" id="amz-form"[^>]*data-site="btl"[^>]*data-tag="tonedntastyne-20"[^>]*data-amz="https:\/\/www\.amazon\.com\/s"/);
  assert.match(html, /<input type="hidden" name="tag" value="tonedntastyne-20">/);
  assert.match(html, /<input type="hidden" name="s" value="price-asc-rank">/);
  const links = [...html.matchAll(/<a [^>]*href="https:\/\/www\.amazon\.com[^"]*"[^>]*>/g)];
  assert.equal(links.length, 1);
  assert.match(links[0][0], /tag=tonedntastyne-20/);
  assert.match(links[0][0], /rel="sponsored nofollow noopener"/);
  const result = html.match(/<section class="tf-result"[\s\S]*?<\/section>/)[0];
  assert.match(result, /As an Amazon Associate we earn from qualifying purchases\./);
  assert.match(html, /<p class="tf-disclose"><strong>As an Amazon Associate we earn from qualifying purchases\.<\/strong>/);
  assert.match(html, /sorted by price, low to high/);
  assert.match(html, /We do not check, track or show Amazon prices/);
  assert.doesNotMatch(html, /media-amazon\.com|ssl-images-amazon|images-na\.ssl/i);
  assert.doesNotMatch(html, /cheapest|best price|best deal|lowest price guarantee|we found|price match|★|stars? rating/i);
  assert.doesNotMatch(html, /\d+\s?% off|\bsave \$|\bwas \$/i);
  for (const s of [html, js, css]) assert.doesNotMatch(s, /AI[- ]generated|AI summary|—/);
});

const api = () => {
  const window = {};
  vm.runInNewContext(js, { window, document: { getElementById: () => null }, URLSearchParams, parseFloat, String, Math, RegExp, location: { search: '', pathname: '/thanksgiving/' } });
  return window.PRICE_FINDER;
};

test('BTL Thanksgiving finder: links are tagged and sorted low to high, and the script holds no tag, address or network call', () => {
  const pf = api();
  const u = (o) => new URL(pf.link(o, TAG, AMZ));
  let x = u({ q: 'roasting pan with rack', max: '40' });
  assert.equal(x.origin + x.pathname, AMZ);
  assert.equal(x.searchParams.get('k'), 'roasting pan with rack');
  assert.equal(x.searchParams.get('rh'), 'p_36:-4000');
  assert.equal(x.searchParams.get('s'), 'price-asc-rank');
  assert.equal(x.searchParams.get('tag'), TAG);
  assert.equal(u({ q: 'folding chairs', min: '120', max: '40' }).searchParams.get('rh'), 'p_36:4000-12000');
  assert.equal(pf.link({ q: '' }, TAG, AMZ), '');
  assert.equal(pf.link({ q: 'gravy boat' }, '', AMZ), '');
  assert.doesNotMatch(js, /tonedntastyne-20/);
  assert.doesNotMatch(js, /https?:\/\//);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon/);
  assert.doesNotMatch(js, /addEventListener\('(keydown|keyup|keypress)'/);
  assert.match(js, /prefers-reduced-motion: reduce/);
});

test('BTL Thanksgiving finder: every example, in the page and in each group, builds a tagged price-sorted link', () => {
  const pf = api();
  const sets = JSON.parse(html.match(/data-sets='([^']+)'/)[1]);
  const radios = [...html.matchAll(/<input type="radio" name="set" value="([^"]*)"( checked)?>/g)];
  assert.deepEqual(radios.map((m) => m[1]), Object.keys(sets));
  assert.deepEqual(radios.filter((m) => m[2]).map((m) => m[1]), ['']);
  const shipped = [...html.matchAll(/<a class="pf-chip" href="([^"]+)" data-fill='([^']+)'>([^<]+)<\/a>/g)];
  assert.equal(shipped.length, sets[''].length);
  shipped.forEach(([, href, fill, label], i) => {
    assert.equal(label, sets[''][i][0]);
    assert.deepEqual(JSON.parse(fill), sets[''][i][1]);
    assert.equal(href.replaceAll('&amp;', '&'), '/thanksgiving/?' + new URLSearchParams(sets[''][i][1]).toString());
  });
  for (const [group, list] of Object.entries(sets)) {
    assert.ok(list.length >= 4, group);
    for (const [label, p] of list) {
      assert.deepEqual(Object.keys(p).filter((k) => !['q', 'min', 'max'].includes(k)), [], label);
      const x = new URL(pf.link(p, TAG, AMZ));
      assert.equal(x.searchParams.get('tag'), TAG, label);
      assert.equal(x.searchParams.get('s'), 'price-asc-rank', label);
    }
  }
  for (const m of css.matchAll(/min-height:\s*(\d+)px/g)) assert.ok(Number(m[1]) >= 48, `min-height ${m[1]}px`);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('BTL Thanksgiving finder: a search fills the result link, picking an example keeps the chosen group, an email link opens ready', () => {
  const run = (search, fields) => {
    const elements = Object.fromEntries(Object.entries({ k: '', set: '', min: '', max: '', ...fields }).map(([k, v]) => [k, { value: v, focus() {} }]));
    const handlers = {};
    const attrs = { href: 'x' };
    const nodes = {
      matches: { hidden: true, offsetWidth: 0, classList: { add() {}, remove() {} }, scrollIntoView() {} },
      'm-query': { textContent: '', kids: [], appendChild(n) { this.kids.push(n); } },
      'm-amz': { get href() { return attrs.href; }, set href(v) { attrs.href = v; }, removeAttribute() {}, addEventListener() {}, focus() {} },
      'm-error': { hidden: true, textContent: '' },
    };
    const form = {
      getAttribute: (a) => ({ 'data-tag': TAG, 'data-amz': AMZ, 'data-site': 'btl' })[a],
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
    vm.runInNewContext(js, { window, document, URLSearchParams, parseFloat, String, Math, RegExp, JSON, location: { search, pathname: '/thanksgiving/' } });
    if (!search) handlers.submit({ preventDefault() {} });
    return { url: new URL(attrs.href).searchParams, shown: !nodes.matches.hidden, text: nodes['m-query'].kids.map((k) => k.textContent).join(''), layer: window.dataLayer, set: elements.set.value };
  };
  const typed = run('', { k: 'gravy boat', set: 'table', max: '25' });
  assert.equal(typed.shown, true);
  assert.equal(typed.url.get('k'), 'gravy boat', 'the idea group never changes the search words');
  assert.equal(typed.url.get('rh'), 'p_36:-2500');
  assert.equal(typed.text, 'gravy boat, up to $25, sorted by price, low to high');
  assert.deepEqual(JSON.parse(JSON.stringify(typed.layer)), [{
    event: 'price_finder_search', site: 'btl', tool: 'price_finder', page: '/thanksgiving/', search_term: 'gravy boat', group: 'table', budget_min: '', budget_max: 25, search_source: 'typed',
  }]);
  const linked = run('?q=roasting+pan+with+rack&max=40&utm_source=gmass&utm_medium=email', { set: 'cooking' });
  assert.equal(linked.shown, true);
  assert.equal(linked.set, 'cooking', 'a fill keeps the chosen idea group');
  assert.equal(linked.url.get('k'), 'roasting pan with rack');
  assert.equal(linked.url.get('rh'), 'p_36:-4000');
});
