import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../btl/glassman/ssdi/', import.meta.url);
test('all active Glassman forms have explicit accessible required contact fields', () => {
  for (const file of ['index.html', 'quiz/index.html', 'talk-to-sofia/index.html']) {
    const html=readFileSync(new URL(file,root),'utf8');
    for (const [id,autocomplete] of [['first_name','given-name'],['last_name','family-name'],['email','email']]) {
      assert.ok(html.includes('label for="'+id+'"'));
      const input=html.match(new RegExp('<input id="'+id+'"[^>]+>'))?.[0];
      assert.ok(input);assert.match(input,/\brequired\b/);assert.ok(input.includes('autocomplete="'+autocomplete+'"'));
      assert.ok(input.includes('aria-describedby="'+id+'-e"'));
      assert.ok(html.includes('id="'+id+'-e" aria-live="polite"'));
    }
    assert.match(html,/<input id="email"[^>]+type="email"/);
    assert.doesNotMatch(html,/<input id="full_name"/);
    assert.doesNotMatch(html,/Never<\/b><span>sold|Never sold|It is not sold/);
    assert.match(html,/Marketing Apes will ask your permission before referring your inquiry to another law firm/);
    assert.match(html,/Your requested time is a preference, not a confirmed appointment/);
    assert.doesNotMatch(html,/Sofia calls you\.|calls you at the time you pick|usually means within minutes|She books a time/);
    assert.match(html,/Call for an automated intake conversation/);
    assert.match(html,/Or request a callback/);
    assert.match(html,/A live transfer may be offered when available/);
    assert.match(html,/Your chosen time is a preference, not a confirmed appointment/);
    assert.doesNotMatch(html,/24\/7|same call|Call any time|24 to 48 hours|you’re connected/);
    assert.doesNotMatch(html,/glassman-ssdi-form-1080x1080\.jpg/);
    if (file !== 'index.html') assert.match(html,/glassman-ssdi-form-1254x1254\.jpg[^" ]*" width="1254" height="1254"/);



  }
  const image=readFileSync(new URL('../../assets/glassman-ssdi/ads/glassman-ssdi-form-1254x1254.jpg',root));
  assert.equal(image.length,115224);
  assert.equal(createHash('sha256').update(image).digest('hex'),'a824eef320684a990a2f84432d518e46a7e40f036db310bc2c8f1d3b4a4901b5');
});
test('contact mapping never splits an ambiguous full name or grants email outreach consent',()=>{
  const intake=readFileSync(new URL('intake.js',root),'utf8');
  assert.match(intake,/first_name: first, last_name: last, email: val\('email'\)/);
  assert.doesNotMatch(intake,/parts\[0\]|full\.split|consent_email/);
  assert.match(intake,/if \(pending \|\| completed\) return/);
});
test('one tap-to-agree line covers calls and texts, with no consent checkbox on the live pages',()=>{
  const intake=readFileSync(new URL('intake.js',root),'utf8');
  assert.match(intake,/glassman-ssdi-002-consent-marketing-apes-2026-11-06-v1/);
  assert.doesNotMatch(intake,/glassman-ssdi-002-consent-clickwrap-2026-11-05|id="consent_sms"/);
  const body = intake.match(/var consentBody = '([^']+)';/)?.[1];
  assert.ok(body);
  for (const re of [/Marketing Apes and Jeffrey Glassman Injury Lawyers/,/may call and text you/,/AI or prerecorded voice/,/Calls are recorded/,
    /Consent is not a condition of any purchase or service/,/Msg frequency varies/,/Msg & data rates may apply/,/Reply STOP to opt out, HELP for help/]) assert.match(body,re);
  assert.match(intake,/var agreed = clickwrap \|\| !!\(callsBox && callsBox\.checked\);/);
  assert.match(intake,/calls: \{ granted: agreed, text: callDisclosure/);
  assert.match(intake,/sms: \{ granted: agreed, text: callDisclosure/);
  assert.match(intake,/version: consentVersion \+ '-calls', method: clickwrap \? 'clickwrap_submit' : 'checkbox', captured_at:/);
  assert.match(intake,/version: consentVersion \+ '-sms', method: clickwrap \? 'clickwrap_submit' : 'checkbox', captured_at:/);
  assert.match(intake,/href="https:\/\/besttortlawyers\.com\/sms-terms\/">SMS Terms/);
  for (const file of ['index.html', 'quiz/index.html', 'talk-to-sofia/index.html']) {
    const html=readFileSync(new URL(file,root),'utf8');
    assert.match(html,/data-consent="clickwrap" data-button="Request my free call"/);
    assert.match(html,/id="submitBtn">Request my free call /);
    assert.doesNotMatch(html,/type="checkbox"/);
  }
});
test('generate_lead fires only for real first-time leads',()=>{
  const intake=readFileSync(new URL('intake.js',root),'utf8');
  assert.match(intake,/if \(j && !isTest && j\.mode !== 'test' && j\.status !== 'duplicate'\) push\('generate_lead', \{ lead_id: j\.receipt_id \}\)/);
  assert.match(intake,/succeed\(j\);/);
});
test('TikTok SubmitForm fires only for real first-time leads, keyed by receipt, with no contact data',()=>{
  const intake=readFileSync(new URL('intake.js',root),'utf8');
  const line=intake.split('\n').find(l=>l.includes("ttq.track('SubmitForm'"));
  assert.ok(line,'SubmitForm call present');
  assert.match(intake,/if \(!otherOptions && j && !isTest && j\.mode !== 'test' && j\.status !== 'duplicate' && window\.ttq && typeof window\.ttq\.track === 'function'\)/);
  assert.match(line,/\{ content_name: CAMPAIGN \}, \{ event_id: j\.receipt_id \}/);
  assert.doesNotMatch(line,/email|phone|first|last|answers|screening|state/);
  assert.equal((intake.match(/ttq\.track\(/g)||[]).length,1);
});
test('OpenAI lead_created loads the SDK only at a real first-time lead, with no contact data',()=>{
  const intake=readFileSync(new URL('intake.js',root),'utf8');
  const i=intake.indexOf("oaiq.min.js");
  assert.ok(i>0,'OpenAI SDK referenced');
  const block=intake.slice(intake.lastIndexOf("if (!otherOptions && j && !isTest && j.mode !== 'test' && j.status !== 'duplicate') {",i), intake.indexOf("form.dispatchEvent(new CustomEvent('ee:lead-saved'",i));
  assert.match(block,/^if \(!otherOptions && j && !isTest && j\.mode !== 'test' && j\.status !== 'duplicate'\) \{/);
  assert.match(block,/oaiq\('measure', 'lead_created', \{ type: 'customer_action', amount: 0, currency: 'USD' \}\)/);
  assert.doesNotMatch(block,/email|phone|first_name|last_name|answers|screening|debug/);
  assert.equal((intake.match(/oaiq\.min\.js/g)||[]).length,1,'SDK is not loaded anywhere else (no page-view load)');
  assert.ok(intake.indexOf('function succeed(')<i,'SDK load lives inside succeed(), after a stored receipt');
});
