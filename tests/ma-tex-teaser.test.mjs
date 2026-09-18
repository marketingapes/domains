import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html = await readFile(new URL('../ma/tex/index.html', import.meta.url), 'utf8');
const intro = await readFile(new URL('../ma/intro/index.html', import.meta.url), 'utf8');
const home = await readFile(new URL('../ma/index.html', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('../ma/sitemap.xml', import.meta.url), 'utf8');

test('teaser keeps Tex identity and the live access story', () => {
  assert.match(html, /READY FOR THE FUTURE/);
  assert.match(html, /tool connected/i);
  assert.match(html, /started in legal/i);
  assert.match(html, /Evolution/);
  assert.match(html, /first digital launch/i);
  assert.match(html, /AI AVATAR BUILT BY AI AND KYLE/i);
  assert.match(html, /Kyle stopped touching the buttons/i);
  assert.match(html, /MA_ACCESS_REACH_20260917/);
  assert.doesNotMatch(html, /\bRex\b/);
  assert.doesNotMatch(html, /aria-label="Main navigation"/);
});

test('teaser follow-up is user-initiated and exposes no provider capability', () => {
  assert.match(html, /mailto:kyleg@marketingapes\.com/);
  assert.match(html, /No automatic signup/i);
  assert.doesNotMatch(html, /hook\.us2\.make\.com|TEX_HOOK|mode:\s*['"]no-cors['"]|fetch\s*\(\s*TEX_HOOK/i);
  assert.doesNotMatch(html, /mailchimp|hubspot|GTM-PENDING/i);
});

test('teaser video is present with poster and no autoplay capability', () => {
  assert.match(html, /src="\/tex\/tex-teaser-vertical\.mp4"/);
  assert.match(html, /poster="\/tex\/tex-teaser-vertical\.jpg"/);
  assert.doesNotMatch(html, /tex-teaser\.mp4/);
  assert.doesNotMatch(html, /\bautoplay\b/i);
});

test('teaser does not publish unverified economics or unfinished order routes', () => {
  assert.doesNotMatch(html, /\$\d|\/order\//);
  assert.match(html, /No invented proof/i);
});

test('intro and home point at the Tex asset family; sitemap lists it', () => {
  assert.match(intro, /href="\/tex\/"/);
  assert.match(home, /tex-teaser-vertical\.mp4/);
  assert.match(sitemap, /https:\/\/marketingapes\.com\/tex\//);
});
