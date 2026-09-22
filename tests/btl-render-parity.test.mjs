/**
 * BTL must be a faithful replacement for the SiteGround property before DNS
 * moves. These checks are about the hosting swap, not about design: they fail
 * when the Render candidate would serve a 404, a dead asset, or another
 * tenant's identity on a path the old property served.
 *
 * The cross-tenant phone check is marked `todo` on purpose. It is a real,
 * currently-failing finding that needs a phone number BTL owns, which is
 * Kyle's to supply — recording it as todo keeps it visible on every run
 * instead of quietly passing, without turning the build red for something
 * code cannot fix.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BTL = path.join(ROOT, 'btl');
const HOST = 'https://besttortlawyers.com';

const htmlFiles = (function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
})(BTL);

/** A path as the browser would ask for it -> the file Render would serve. */
function resolves(urlPath) {
  const clean = urlPath.split(/[?#]/)[0];
  const target = path.join(BTL, clean);
  return fs.existsSync(target) && fs.statSync(target).isFile()
      || fs.existsSync(path.join(target, 'index.html'));
}

function redirectRules() {
  const raw = fs.readFileSync(path.join(BTL, '_redirects'), 'utf8');
  return raw.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const [from, to, code] = l.split(/\s+/); return { from, to, code }; });
}

function redirected(urlPath) {
  return redirectRules().some(r =>
    r.from.endsWith('/*') ? urlPath.startsWith(r.from.slice(0, -1)) : r.from === urlPath);
}

test('every sitemap URL is a file this site actually serves', () => {
  const xml = fs.readFileSync(path.join(BTL, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(locs.length > 0, 'sitemap declares no URLs');
  for (const loc of locs) {
    assert.ok(loc.startsWith(HOST), `sitemap points off-host: ${loc}`);
    const p = loc.slice(HOST.length) || '/';
    assert.ok(resolves(p), `sitemap advertises ${p}, which would 404`);
  }
});

test('a sitemap URL is never one that only redirects', () => {
  const xml = fs.readFileSync(path.join(BTL, 'sitemap.xml'), 'utf8');
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const p = m[1].slice(HOST.length) || '/';
    if (p === '/') continue;
    assert.ok(!redirected(p), `sitemap lists ${p}, which _redirects sends elsewhere`);
  }
});

test('every redirect lands somewhere that exists', () => {
  const rules = redirectRules();
  assert.ok(rules.length > 0, '_redirects declares no rules');
  for (const r of rules) {
    assert.equal(r.code, '301', `${r.from} should be a permanent redirect`);
    assert.ok(resolves(r.to), `${r.from} redirects to ${r.to}, which does not exist`);
  }
});

test('the 404 page never sends a visitor to another 404', () => {
  const html = fs.readFileSync(path.join(BTL, '404.html'), 'utf8');
  const targets = new Set();
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) targets.add(m[1]);
  for (const m of html.matchAll(/'(\/[a-z0-9-]+\/)'/g)) targets.add(m[1]);
  assert.ok(targets.size > 0, '404 page offers nowhere to go');
  for (const t of targets) {
    assert.ok(resolves(t) || redirected(t), `404 page links to ${t}, which would 404 again`);
  }
});

test('the 404 page carries only BTL’s own declared container', () => {
  const html = fs.readFileSync(path.join(BTL, '404.html'), 'utf8');
  const declared = JSON.parse(fs.readFileSync(path.join(BTL, 'domain.json'), 'utf8'))
    .measurement.gtm_web.container_id;
  for (const m of html.matchAll(/GTM-[A-Z0-9]+/g)) {
    assert.equal(m[0], declared, `404 page carries ${m[0]}, not BTL's declared container`);
  }
  assert.doesNotMatch(html, /hooks\.zapier\.com|hook\.[a-z0-9]+\.make\.com/,
    'the 404 page must not post to a lead lane');
  assert.match(html, /noindex/, 'the 404 page must stay out of the index');
});

test('no page references a same-origin file that is not in the tree', () => {
  const missing = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    for (const m of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)) {
      const p = m[1];
      if (!resolves(p) && !redirected(p)) missing.push(`${path.relative(ROOT, file)} -> ${p}`);
    }
  }
  assert.deepEqual(missing, [], `dead same-origin references:\n${missing.join('\n')}`);
});

test('the campaign estate stays out of the index', () => {
  const campaigns = htmlFiles.filter(f => f.includes(`${path.sep}campaigns${path.sep}`));
  assert.ok(campaigns.length > 40, 'expected the campaign estate to be present');
  for (const f of campaigns) {
    assert.match(fs.readFileSync(f, 'utf8'), /name=["']robots["'][^>]*noindex/i,
      `${path.relative(ROOT, f)} would be indexable`);
  }
});

test('BTL uses no phone number another tenant owns', { todo:
  'BTL pages use +16026931461, declared owner_tenant_id NIL. Needs a BTL-owned number.' }, () => {
  const foreign = [];
  for (const slug of fs.readdirSync(ROOT)) {
    const dj = path.join(ROOT, slug, 'domain.json');
    if (slug === 'btl' || !fs.existsSync(dj)) continue;
    const phone = JSON.parse(fs.readFileSync(dj, 'utf8')).communications?.phone;
    if (phone?.e164) foreign.push({ owner: phone.owner_tenant_id ?? slug, e164: phone.e164 });
  }
  const hits = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    for (const { owner, e164 } of foreign) {
      const digits = e164.replace(/\D/g, '').slice(-10);
      const loose = new RegExp(`\\(?${digits.slice(0,3)}\\)?[ .-]?${digits.slice(3,6)}[ .-]?${digits.slice(6)}`);
      if (html.includes(e164) || loose.test(html)) hits.push(`${path.relative(ROOT, file)} uses ${owner}'s ${e164}`);
    }
  }
  assert.deepEqual([...new Set(hits)], [], hits.join('\n'));
});

/**
 * What Google actually knows about this property, pulled from the Search
 * Console URL Inspection and Search Analytics APIs on 2026-09-22 for
 * sc-domain:besttortlawyers.com over the preceding six months. These are not
 * guesses about which paths matter — they are the paths that drew impressions,
 * so they are the ones a hosting swap can lose.
 *
 * Host is dropped on purpose: Google reports the same page under both the
 * apex and www, and `_redirects` is matched on the path.
 */
const RANKING_PATHS = Object.freeze([
  { path: '/',                           impressions: 78, position: 2.2 },
  { path: '/dupixent/',                  impressions: 55, position: 8.4 },
  { path: '/demo/',                      impressions: 37, position: 2.0 },
  { path: '/texas-storm-damage-claims/', impressions: 35, position: 2.7 },
  { path: '/privacy-policy.html',        impressions:  0, position: null }
]);

test('every BTL path Google ranks still resolves after the hosting swap', () => {
  const lost = RANKING_PATHS
    .filter(p => !resolves(p.path) && !redirected(p.path))
    .map(p => `${p.path} (${p.impressions} impressions, avg position ${p.position})`);
  // /demo/ and /texas-storm-damage-claims/ are expected to be listed here until
  // their content is exported; the assertion below scopes this test to the rest
  // so a regression on a covered path still turns the build red.
  const KNOWN_GAPS = ['/demo/', '/texas-storm-damage-claims/'];
  const regressions = lost.filter(l => !KNOWN_GAPS.some(g => l.startsWith(g)));
  assert.deepEqual(regressions, [],
    `these ranking paths would 404 on Render:\n${regressions.join('\n')}`);
});

test('the ranking paths with no home in this repo are exported before cutover', { todo:
  '/demo/ (37 impressions, avg position 2.0) and /texas-storm-damage-claims/ '
  + '(35 impressions, avg position 2.7) rank in Google\'s top three and exist '
  + 'nowhere in this repo. Needs the content exported from SiteGround.' }, () => {
  const homeless = ['/demo/', '/texas-storm-damage-claims/']
    .filter(p => !resolves(p) && !redirected(p));
  assert.deepEqual(homeless, [], homeless.join('\n'));
});

test('the phillips-law holding redirect covers the whole measured estate', () => {
  // Search Console reports 35 distinct /phillips-law/arizona-injury-lawyers/
  // URLs with impressions, including a full Spanish (/es/) set. The single
  // wildcard below is what stands between all of them and a 404, so assert it
  // is still there rather than trusting the file to stay unedited.
  const rule = redirectRules().find(r => r.from === '/phillips-law/*');
  assert.ok(rule, '/phillips-law/* redirect is gone; 35 ranking URLs would 404');
  assert.equal(rule.code, '301', 'the phillips-law holding redirect must be a 301');
});

test('every BTL canonical points at the declared apex, never www', () => {
  // Search Console (2026-09-22) reports the live SiteGround property split
  // across both hosts: the apex is "Duplicate without user-selected canonical"
  // and Google picked https://www.besttortlawyers.com/ for itself. The Render
  // candidate resolves that by declaring the apex everywhere, which is also
  // what domain.json's intended_canonical_hostname says. Keep it that way.
  const declared = JSON.parse(fs.readFileSync(path.join(BTL, 'domain.json'), 'utf8'))
    .hostname.intended_canonical_hostname;
  const wrong = [];
  for (const file of htmlFiles) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/rel="canonical"[^>]*href="([^"]+)"/g)) {
      const host = new URL(m[1]).hostname;
      if (host !== declared) wrong.push(`${path.relative(ROOT, file)} -> ${host}`);
    }
  }
  assert.deepEqual(wrong, [], `canonicals off the declared hostname:\n${wrong.join('\n')}`);

  const sitemap = fs.readFileSync(path.join(BTL, 'sitemap.xml'), 'utf8');
  for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    assert.equal(new URL(m[1]).hostname, declared,
      `sitemap advertises ${m[1]} off the declared hostname`);
  }
});
