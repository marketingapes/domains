import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {clamp, parseHash} from '../ma/intro/intro.mjs';

const html = await readFile(new URL('../ma/intro/index.html', import.meta.url), 'utf8');
const home = await readFile(new URL('../ma/index.html', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('../ma/sitemap.xml', import.meta.url), 'utf8');
const css = await readFile(new URL('../ma/intro/intro.css', import.meta.url), 'utf8');

const headlines = [
  'Is your business',
  'Site. Ads. Creative. Follow-up.',
  'Websites + paid ads + creative + AI + automation',
  'One priority. Four weeks. Real outcomes.',
  'Meet Sofia. Your next',
  'No invented clients. No invented revenue.',
  'Your domain. Your brand. Your accounts.',
  'Big plans? Let’s get to',
];

test('intro has all eight locked headlines in HTML', () => {
  for (const line of headlines) assert.match(html, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal([...html.matchAll(/data-slide="/g)].length, 8);
});

test('slide 8 CTAs are exact live contacts', () => {
  assert.match(html, /href="tel:\+16197360356"/);
  assert.match(html, /href="\/#planner"/);
  assert.match(html, /href="mailto:kyleg@marketingapes\.com"/);
});

test('intro does not invent proof, pixels, or unfinished routes', () => {
  assert.doesNotMatch(html, /vapi/i);
  assert.doesNotMatch(html, /GTM-PENDING|\$\d|GTM-[A-Z0-9]+/);
  assert.doesNotMatch(html, /\/pricing\/|\/order\/|\/anti-agency\//);
});

test('homepage planner and contacts stay; nav points at /intro/', () => {
  assert.match(home, /id="planner"/);
  assert.match(home, /tel:\+16197360356/);
  assert.match(home, /mailto:kyleg@marketingapes\.com/);
  assert.match(home, /href="\/intro\/"/);
});

test('sitemap lists intro only as the new public URL', () => {
  assert.match(sitemap, /https:\/\/marketingapes\.com\/intro\//);
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
