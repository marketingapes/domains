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
    assert.ok(fs.existsSync(path.join(ROOT, slug, 'contact.html')));
    const redir = fs.readFileSync(path.join(ROOT, slug, '_redirects'), 'utf8');
    assert.match(redir, /\/preview\/ 301/);
  });
  test(`${slug} preview is indexable and form can find an endpoint`, () => {
    const html = fs.readFileSync(path.join(ROOT, slug, 'preview', 'index.html'), 'utf8');
    assert.match(html, /index,follow/);
    assert.doesNotMatch(html, /noindex,nofollow/);
    const js = fs.readFileSync(path.join(ROOT, slug, 'preview', 'intake.js'), 'utf8');
    assert.match(js, /INTAKE_ENDPOINT\|\|C\.ENDPOINT/);
    const cfg = fs.readFileSync(path.join(ROOT, slug, 'preview', 'config.js'), 'utf8');
    assert.match(cfg, /"ENDPOINT"\s*:\s*"https:\/\//);
  });
}

for (const slug of BRANDS) {
  test(`${slug} robots allows preview`, () => {
    const robots = fs.readFileSync(path.join(ROOT, slug, 'robots.txt'), 'utf8');
    assert.match(robots, /Allow: \/preview\//);
    assert.doesNotMatch(robots, /<<<<<<</);
  });
  test(`${slug} declares existing AdSense publisher`, () => {
    const ads = fs.readFileSync(path.join(ROOT, slug, 'ads.txt'), 'utf8');
    assert.match(ads, /google\.com, pub-5194583669093303, DIRECT, f08c47fec0942fa0/);
    const robots = fs.readFileSync(path.join(ROOT, slug, 'robots.txt'), 'utf8');
    assert.match(robots, /Allow: \/ads\.txt/);
  });
}
