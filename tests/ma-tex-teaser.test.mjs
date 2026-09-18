import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html = await readFile(new URL('../ma/tex/index.html', import.meta.url), 'utf8');
const intro = await readFile(new URL('../ma/intro/index.html', import.meta.url), 'utf8');
const home = await readFile(new URL('../ma/index.html', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('../ma/sitemap.xml', import.meta.url), 'utf8');

test('teaser page keeps Tex identity and the Kyle insight', () => {
  assert.match(html, /READY FOR THE FUTURE/);
  assert.match(html, /tool connected/);
  assert.match(html, /started in legal/i);
  assert.match(html, /Evolution/);
  assert.match(html, /first digital launch/);
  assert.doesNotMatch(html, /\bRex\b/);
  assert.doesNotMatch(html, /aria-label="Main navigation"/);
  const formAt = html.indexOf('id="want-more"');
  const videoAt = html.indexOf('tex-teaser-vertical.mp4');
  assert.ok(formAt > -1 && videoAt > formAt, 'form stacks above video');
});

test('opt-in emails Kyle and does not fake a list vendor', () => {
  assert.match(html, /type="email"/);
  assert.match(html, /id="email"/);
  assert.match(html, /product = 'tex-launch'/);
  assert.match(html, /hook\.us2\.make\.com/);
  assert.match(html, /name="utm_source"/);
  assert.match(html, /name="gclid"/);
  assert.match(html, /name="fbclid"/);
  assert.match(html, /notify_email = 'kyleg@marketingapes\.com'/);
  assert.doesNotMatch(html, /mailchimp|hubspot|GTM-PENDING|autoplay|\$\d|window\.location\.href = 'mailto:/i);
});

test('teaser video is present with poster and no autoplay', () => {
  assert.match(html, /src="\/tex\/tex-teaser-vertical\.mp4"/);
  assert.match(html, /poster="\/tex\/tex-teaser-vertical\.jpg"/);
  assert.doesNotMatch(html, /tex-teaser\.mp4/);
  assert.doesNotMatch(html, /autoplay/i);
});

test('intro and home point at /tex/; sitemap lists it', () => {
  assert.match(intro, /href="\/tex\/"/);
  assert.match(home, /tex-intro-18s\.mp4/);
  assert.match(sitemap, /https:\/\/marketingapes\.com\/tex\//);
});
