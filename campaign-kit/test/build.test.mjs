import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalize, renderPages, renderBundle, renderCss} from '../build.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'campaigns');
const configs = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => [f, JSON.parse(readFileSync(join(dir, f), 'utf8'))]);
const base = configs[0][1];

test('every shipped campaign config validates and renders five pages + css', () => {
  for (const [f, raw] of configs) {
    const c = normalize(raw), pages = renderPages(c);
    assert.deepEqual(Object.keys(pages).sort(), ['ads.html', 'form.html', 'index.html', 'quiz.html', 'sofia.html'], f);
    assert.match(renderCss(c), new RegExp(c.campaign_id));
    for (const [n, html] of Object.entries(pages)) {
      assert.match(html, /<meta name="robots" content="noindex,follow">/, `${f} ${n} must stay noindex`);
      assert.ok(html.includes(c.campaign_id), `${f} ${n} carries campaign_id`);
      assert.ok(html.includes(c.gtm), `${f} ${n} loads GTM`);
      assert.ok(html.includes(`tel:${c.sofia.phone_tel}`), `${f} ${n} links the Sofia line`);
    }
  }
});

test('lead pages post btl.intake.web/v1 form-encoded to the configured webhook, with consent required', () => {
  const c = normalize(base), p = renderPages(c);
  for (const n of ['quiz.html', 'form.html']) {
    assert.ok(p[n].includes(c.intake.webhook), n);
    assert.ok(p[n].includes("schema:'btl.intake.web/v1'"), n);
    assert.ok(p[n].includes('new URLSearchParams({payload:'), n);
    assert.ok(p[n].includes('ok=ok&&f.consent_call.checked'), `${n} blocks submit without call consent`);
    assert.ok(p[n].includes('api.trustedform.com/trustedform.js'), `${n} loads TrustedForm`);
    assert.ok(p[n].includes("if(!r.ok) throw Error"), `${n} only shows success on 2xx`);
  }
  assert.ok(!p['index.html'].includes('trustedform.js'));
  assert.ok(p['quiz.html'].includes('"request_type":"quiz_inquiry"'));
  assert.ok(p['form.html'].includes('"request_type":"web_inquiry"'));
});

test('config text is escaped in HTML', () => {
  const c = normalize({...base, tort: {...base.tort, name: '<script>x</script>', headline: '"><img src=x onerror=1>'}});
  const html = renderPages(c)['index.html'];
  assert.ok(!html.includes('<script>x</script>'));
  assert.ok(!html.includes('<img src=x onerror=1>'));
});

test('bad configs are refused with a reason', () => {
  assert.throws(() => normalize({...base, campaign_id: 'lower'}), /campaign_id/);
  assert.throws(() => normalize({...base, sofia: {phone_tel: '555'}}), /sofia.phone_tel/);
  assert.throws(() => normalize({...base, delivery: {mode: 'live_transfer'}}), /transfer_number/);
  assert.throws(() => normalize({...base, quiz: base.quiz.slice(0, 2)}), /quiz: 3-10/);
  assert.throws(() => normalize({...base, quiz: [{...base.quiz[0], options: [{label: 'x', value: 'x', signal: 'maybe'}, ...base.quiz[0].options]}, ...base.quiz.slice(1)]}), /signal/);
  assert.throws(() => normalize({...base, criteria: {qualifies: []}}), /criteria/);
});

test('channel bundle is paused drafts only and budgets split the media total', () => {
  for (const [f, raw] of configs) {
    const c = normalize(raw), b = renderBundle(c);
    assert.equal(b['meta.json'].campaign.status, 'PAUSED', f);
    assert.ok(b['meta.json'].ads.every(a => a.status === 'PAUSED' && a.link.includes('utm_campaign=' + encodeURIComponent(c.campaign_id))), f);
    assert.equal(b['google-search.json'].campaign.status, 'PAUSED', f);
    assert.equal(b['tiktok.json'].campaign.operation_status, 'DISABLE', f);
    assert.equal(b['openai-ads.json'].campaign.status, 'paused', f);
    assert.ok(b['google-search.json'].responsive_search_ad.headlines.every(h => h.length <= 30), `${f} RSA headline length`);
    const daily = ['meta.json', 'google-search.json', 'tiktok.json', 'openai-ads.json'].reduce((s, k) => s + b[k].campaign.daily_budget_usd, 0);
    assert.ok(Math.abs(daily * c.budget.days - c.budget.media_total_usd) <= c.budget.days * 4, `${f} daily budgets ≈ media total`);
    assert.match(b['LAUNCH.md'], /BUILT-NOT-LIVE/, `${f} cannot claim launch-ready while gates are open`);
  }
});
