import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html = await readFile(new URL('../ma/tex/talk/index.html', import.meta.url), 'utf8');
const js = await readFile(new URL('../ma/tex/talk/talk.js', import.meta.url), 'utf8');
const home = await readFile(new URL('../ma/index.html', import.meta.url), 'utf8');

test('talk page is Tex campaign order, not a fake closer', () => {
  assert.match(html, /Hi, I’m Tex/);
  assert.match(html, /court-appointed emotional support algorithm/);
  assert.match(html, /\$7,500/);
  assert.match(js, /PRICE = 7500/);
  assert.match(js, /If you confirm this now/);
  assert.match(js, /tex_campaign_order/);
  assert.match(js, /Not clients tomorrow/);
  assert.match(home, /\/tex\/talk\//);
});
