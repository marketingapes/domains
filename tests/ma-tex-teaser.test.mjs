import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html = await readFile(new URL('../ma/tex/index.html', import.meta.url), 'utf8');
const intro = await readFile(new URL('../ma/intro/index.html', import.meta.url), 'utf8');
const home = await readFile(new URL('../ma/index.html', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('../ma/sitemap.xml', import.meta.url), 'utf8');

test('teaser page keeps Tex identity and the Kyle insight', () => {
  assert.match(html, /AI avatar built by Grok and Kyle/);
  assert.match(html, /THEN AI LEARNED ABOUT KYLE/);
  assert.match(html, /ape-shit/);
  assert.match(html, /first digital launch/);
  assert.match(html, /fourteen behind it/);
  assert.doesNotMatch(html, /\bRex\b/);
});

test('opt-in emails Kyle and does not fake a list vendor', () => {
  assert.match(html, /mailto:kyleg@marketingapes\.com/);
  assert.match(html, /type="email"/);
  assert.match(html, /id="email"/);
  assert.doesNotMatch(html, /mailchimp|hubspot|GTM-PENDING|autoplay|\$\d/i);
});

test('teaser video is present with poster and no autoplay', () => {
  assert.match(html, /src="\/tex\/tex-teaser-vertical\.mp4"/);
  assert.match(html, /poster="\/tex\/tex-teaser-vertical\.jpg"/);
  assert.doesNotMatch(html, /tex-teaser\.mp4/);
  assert.doesNotMatch(html, /autoplay/i);
});

test('intro and home point at /tex/; sitemap lists it', () => {
  assert.match(intro, /href="\/tex\/"/);
  assert.match(home, /href="\/tex\/"/);
  assert.match(home, /id="planner"/);
  assert.match(sitemap, /https:\/\/marketingapes\.com\/tex\//);
});
