import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalize, renderPages, renderBundle, renderCss, GATES, PREVIEW_CSP} from '../build.mjs';
import {absoluteWebUrl, pageMetadata, campaignPageUrl, absoluteHtmlReferences} from '../metadata.mjs';

const raw = () => JSON.parse(readFileSync(new URL('../campaigns/btl-paraquat.json', import.meta.url), 'utf8'));
const live = () => {
  const c = raw(); c.status = 'live';
  c.intake.webhook = 'https://intake.example.test/receipt';
  c.delivery.transfer = {number:'+15555550100', kind:'firm', label:'Test', source:'isolated test'};
  c.gates = Object.fromEntries(GATES.map(([key]) => [key, {by:'test', at:'2026-11-22', evidence:'synthetic only'}]));
  return normalize(c);
};

test('actual generated preview pages have one complete absolute metadata set and retain isolation', () => {
  const c = normalize(raw());
  for (const [file, html] of Object.entries(renderPages(c))) {
    const canonical = campaignPageUrl(c, file);
    for (const marker of ['<title>', 'name="description"', 'rel="canonical"', 'property="og:url"', 'property="og:image"', 'name="twitter:card"']) {
      assert.equal(html.split(marker).length - 1, 1, `${file}: ${marker}`);
    }
    assert.ok(html.includes(`rel="canonical" href="${canonical}"`), file);
    assert.ok(html.includes(`property="og:url" content="${canonical}"`), file);
    assert.ok(html.includes('property="og:image" content="https://besttortlawyers.com/assets/og-btl.jpg"'), file);
    assert.ok(html.includes(`content="${PREVIEW_CSP}"`), file);
    assert.ok(html.includes('content="noindex,follow"'), file);
    assert.ok(html.includes('href="quiz.html"'), 'preview navigation must remain local');
    assert.ok(html.includes('src="/assets/btl-seal.svg"'), 'preview resources must remain local');
    assert.ok(!html.includes('href="tel:'), 'preview cannot dial');
  }
});

test('live generated HTML and hero CSS resolve web references to full domain URLs', () => {
  const c = live();
  for (const [file, html] of Object.entries(renderPages(c))) {
    const tags = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    const refs = [...tags.matchAll(/\b(?:href|src|poster)="([^"]*)"/g)].map(m => m[1]);
    assert.ok(refs.every(ref => /^(?:https:\/\/|#|tel:|mailto:|data:)/.test(ref)), `${file}: ${refs.filter(ref => !/^(?:https:\/\/|#|tel:|mailto:|data:)/.test(ref))}`);
    assert.ok(html.includes(`href="https://besttortlawyers.com/c/${c.slug}/quiz.html"`));
    assert.ok(html.includes('href="tel:'), 'existing live phone behavior is preserved');
  }
  assert.ok(renderCss(c).includes('url(https://besttortlawyers.com/assets/paraquat-field-usda-nrcs.jpg)'));
});

test('channel drafts preserve existing queries and absolute third-party image origins', () => {
  const c = normalize({...raw(), landing:{quiz:'https://besttortlawyers.com/check/?variant=A#quiz'}, images:{...raw().images, ad_quiz:'https://cdn.example.test/creative.jpg'}});
  const meta = renderBundle(c)['meta.json'];
  const url = new URL(meta.ads[0].link);
  assert.equal(url.searchParams.get('variant'), 'A');
  assert.equal(url.searchParams.get('utm_source'), 'facebook');
  assert.equal(url.hash, '#quiz');
  assert.equal(meta.ads[0].image, 'https://cdn.example.test/creative.jpg');
  assert.equal(meta.ads[0].status, 'PAUSED');
});

test('URL rewriting handles srcset, queries and protocol URLs without changing scripts or special links', () => {
  const html = '<a href="next.html?a=1&amp;b=2">Next</a><img srcset="/img/a.jpg 1x, https://cdn.example.test/b.jpg 2x"><a href="#step">Step</a><a href="mailto:hello@example.test">Mail</a><script>const x=\'<a href="keep.html">\';</script>';
  const out = absoluteHtmlReferences(html, 'https://tenant.example/c/demo/quiz.html');
  assert.ok(out.includes('href="https://tenant.example/c/demo/next.html?a=1&amp;b=2"'));
  assert.ok(out.includes('srcset="https://tenant.example/img/a.jpg 1x, https://cdn.example.test/b.jpg 2x"'));
  assert.ok(out.includes('href="#step"') && out.includes('href="mailto:hello@example.test"'));
  assert.ok(out.includes('<script>const x=\'<a href="keep.html">\';</script>'));
});

test('metadata escapes copy, rejects unsafe URLs and never invents image dimensions', () => {
  const html = pageMetadata({title:'A < B',description:'One "quote" & more',url:'https://tenant.example/c/demo/',siteName:'Tenant',image:'https://cdn.example.test/share.jpg',imageAlt:'A & B'});
  assert.ok(html.includes('<title>A &lt; B</title>'));
  assert.ok(html.includes('One &quot;quote&quot; &amp; more'));
  assert.ok(!html.includes('og:image:width'));
  assert.throws(() => absoluteWebUrl('javascript:alert(1)', 'https://tenant.example/'), /HTTPS/);
  assert.throws(() => absoluteWebUrl('https://user:secret@tenant.example/', 'https://tenant.example/'), /credentials/);
  assert.equal(campaignPageUrl({domain_id:'tenant.example',slug:'demo'}), 'https://tenant.example/c/demo/');
  assert.throws(() => campaignPageUrl({domain_id:'tenant.example/path',slug:'demo'}), /hostname/);
});
