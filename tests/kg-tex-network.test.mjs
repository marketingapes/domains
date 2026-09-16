import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const home = await readFile(new URL('../kg/index.html', import.meta.url), 'utf8');
const now = await readFile(new URL('../kg/now/index.html', import.meta.url), 'utf8');
const posts = await readFile(new URL('../docs/tex-network-posts.md', import.meta.url), 'utf8');

test('KG home and now point at the Tex launch page', () => {
  assert.match(home, /https:\/\/marketingapes\.com\/tex\//);
  assert.match(home, /tex-teaser\.mp4/);
  assert.match(now, /https:\/\/marketingapes\.com\/tex\//);
  assert.match(home, /fourteen behind it/);
  assert.doesNotMatch(home, /\bRex\b/);
});

test('paste posts exist for Claude and LinkedIn', () => {
  assert.match(posts, /https:\/\/marketingapes\.com\/tex\//);
  assert.match(posts, /LinkedIn — Kyle Gosselin/);
  assert.match(posts, /LinkedIn — Marketing Apes/);
  assert.match(posts, /tex-teaser-vertical\.mp4/);
});
