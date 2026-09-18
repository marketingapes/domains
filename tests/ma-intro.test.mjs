import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {clamp, parseHash} from '../ma/intro/intro.mjs';

const html = await readFile(new URL('../ma/intro/index.html', import.meta.url), 'utf8');
const home = await readFile(new URL('../ma/index.html', import.meta.url), 'utf8');
const plan = await readFile(new URL('../ma/plan/index.html', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('../ma/sitemap.xml', import.meta.url), 'utf8');
const css = await readFile(new URL('../ma/intro/intro.css', import.meta.url), 'utf8');

const headlines = [
  'Kyle “Tex” Gosselin.',
  'Test it until it',
  'J/k. Here’s the',
  'The system can run.',
  'Meet Sofia. She’s on',
  'No invented clients.',
  'Your ad accounts.',
  'I’m in this now.',
];

test('intro has all eight locked headlines in HTML', () => {
  for (const line of headlines) assert.match(html, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal([...html.matchAll(/data-slide="/g)].length, 8);
});

test('slide 8 CTAs are exact live contacts', () => {
  assert.match(html, /href="tel:\+16197360356"/);
  assert.match(html, /href="\/plan\/#planner"/);
  assert.match(html, /href="mailto:kyleg@marketingapes\.com"/);
});

test('intro does not invent proof, pixels, or unfinished routes', () => {
  assert.doesNotMatch(html, /vapi/i);
  assert.doesNotMatch(html, /GTM-PENDING|\$\d/);
  assert.doesNotMatch(html, /\/pricing\/|\/order\/|\/anti-agency\//);
});

test('story is Tex first-person: partner not a fake staff', () => {
  assert.match(html, /Kyle “Tex” Gosselin/);
  assert.match(html, /AI avatar built by AI and Kyle/);
  assert.match(html, /No fake staff/);
  assert.match(html, /J\/k/);
  assert.match(html, /AI as a partner/);
  assert.match(html, /Your ad accounts/);
  assert.doesNotMatch(html, /ROAS of|guaranteed|case study|layoff your/i);
});

test('intro pitch video is present with poster and no autoplay', () => {
  assert.match(html, /src="\/intro\/tex-pitch\.mp4"/);
  assert.match(html, /poster="\/intro\/tex-pitch\.jpg"/);
  assert.match(html, /AI avatar built by AI and Kyle/);
  assert.doesNotMatch(html, /autoplay/i);
});

test('homepage is the Tex video + form, not the eight-slide deck', () => {
  assert.match(home, /GTM-W3CTJQ/);
  assert.doesNotMatch(home, /GTM-PENDING/);
  assert.match(home, /ee_page_context/);
  assert.match(home, /tex-intro-18s\.mp4/);
  assert.match(home, /id="want-more"/);
  assert.match(home, /Hi, I['’]m Tex/);
  assert.match(home, /what can we build/i);
  assert.doesNotMatch(home, /data-slide="/);
  assert.doesNotMatch(home, /aria-label="Main navigation"/);
  assert.match(plan, /id="planner"/);
  assert.match(plan, /GTM-W3CTJQ/);
  assert.doesNotMatch(home, /generate_lead/);
});

test('sitemap lists intro only as the new public URL', () => {
  assert.match(sitemap, /https:\/\/marketingapes\.com\/intro\//);
});

test('intro pitch video is sized to fit the slide', () => {
  assert.match(css, /max-height:min\(38vh,260px\)/);
  assert.match(css, /\.pitch\{width:min\(30vw,360px\)/);
});

test('dark intro uses ink, lime, reduced-motion and visible focus', () => {
  assert.match(css, /--ink:\s*#14241f/);
  assert.match(css, /--lime:\s*#d2f48a/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
});

test('hash and clamp stay inside 1–8', () => {
  assert.equal(clamp(0), 1);
  assert.equal(clamp(9), 8);
  assert.equal(parseHash('#3'), 3);
  assert.equal(parseHash('#99'), 8);
  assert.equal(parseHash(''), 1);
});
