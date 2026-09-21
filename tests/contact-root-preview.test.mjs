import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BRANDS = ['ddm','fplb','px','cgg','toss','ri','sliq'];

for (const slug of BRANDS) {
  test(`${slug} root sends visitors to preview`, () => {
    const html = fs.readFileSync(path.join(ROOT, slug, 'index.html'), 'utf8');
    assert.match(html, /\/preview\//);
    assert.match(html, /location\.replace/);
    assert.ok(fs.existsSync(path.join(ROOT, slug, 'contact.html')), `${slug}/contact.html keeps the old contact page`);
    assert.ok(fs.existsSync(path.join(ROOT, slug, 'preview', 'index.html')));
  });
}
