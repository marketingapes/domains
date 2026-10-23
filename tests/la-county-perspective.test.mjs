// LA County Perspective page (lfma/portal/la-county): private, Phillips sign-in only, ships no lead data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../lfma/portal/la-county/' + p, import.meta.url), 'utf8');

test('page is private and only talks to the Perspective hub', () => {
  const html = read('index.html');
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(html, /connect-src 'self' https:\/\/perspective-s3b8\.onrender\.com;/);
  assert.match(html, /data-client="plg"/);
  assert.match(html, /data-hub="https:\/\/perspective-s3b8\.onrender\.com"/);
  assert.doesNotMatch(html, /<script>(?!\s*<\/script>)/, 'no inline script');
});

test('runtime ships no lead data, needs a session and reads only /portal/plg/basic', () => {
  const js = read('app.js');
  assert.match(js, /'\/basic'/);
  assert.match(js, /if \(!session\) \{ feed = null; return render\(\); \}/);
  assert.match(js, /sessionStorage/);
  assert.doesNotMatch(js, /localStorage/);
  assert.doesNotMatch(js, /\b\d{3}[-.) ]\d{3}[-. ]\d{4}\b/, 'no phone numbers in source');
  assert.doesNotMatch(js, /innerHTML\s*=\s*[^;]*\$\{(?!esc\()/, 'interpolations into innerHTML are escaped by the view functions');
});
