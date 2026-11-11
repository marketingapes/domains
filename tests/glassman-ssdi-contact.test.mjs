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
  assert.match(intake,/var conversion = !otherOptions && j && !isTest && j\.mode !== 'test' && j\.status !== 'duplicate';/);
  assert.match(intake,/else if \(conversion\) push\('generate_lead', \{ lead_id: j\.receipt_id, eventCallback:/);
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
test('attribution keeps the landing ad click IDs and platform cookie IDs, never contact data', () => {
  const intake = readFileSync(new URL('intake.js', root), 'utf8');
  const start = intake.indexOf("var AK = 'ee_attr_glassman_ssdi'");
  const block = intake.slice(start, intake.indexOf('function fieldErr(', start));
  assert.ok(start > 0, 'landing attribution store present');
  for (const k of ['fbclid', 'gclid', 'gbraid', 'wbraid', 'ttclid']) assert.ok(block.includes("'" + k + "'"), k + ' captured');
  for (const c of ["cookie('_fbp')", "cookie('_fbc')", "cookie('_ttp')", "cookie('_gcl_aw')", "cookie('_ga')"]) assert.ok(block.includes(c), c + ' read');
  assert.match(block, /localStorage\.setItem\(AK/);
  assert.match(block, /90 \* 864e5/);
  assert.doesNotMatch(block, /email|phone|first_name|last_name|answers|screening\.|val\(/);
  assert.match(intake, /attribution: tracking\(\),/);
  for (const file of ['index.html', 'quiz/index.html', 'talk-to-sofia/index.html']) {
    assert.match(readFileSync(new URL(file, root), 'utf8'), /intake\.js\?v=20261111-exact-time/);
  }
});
test('every saved request ends on a thank-you page; a phone the intake cannot dial is stopped in the browser', () => {
  const intake = readFileSync(new URL('intake.js', root), 'utf8');
  assert.match(intake, /if \(phone && !e164\(val\('phone'\)\)\) \{ fieldErr\('phone', 'Please enter a 10-digit US mobile number\.'\)/);
  assert.match(intake, /'\/glassman\/ssdi\/thank-you\/' \+ \(otherOptions \? 'other-options\/' : ''\) \+ \(isTest \? '\?test=1' : ''\)/);
  assert.match(intake, /new CustomEvent\('ee:thank-you', \{ cancelable: true/);
  assert.match(intake, /thankYou\(conversion, j\);/);
  // what travels to the thank-you page: kind, time, receipt, real, timestamp. Never contact or screening data.
  const rec = intake.slice(intake.indexOf("sessionStorage.setItem('ee_ssdi_thanks'"), intake.indexOf('at: Date.now() }));'));
  assert.ok(rec.length > 0);
  assert.doesNotMatch(rec, /contact|email|phone|first|last|state|screening|answers/);
  for (const [file, kind, pid] of [['thank-you/index.html', 'callback', 'glassman-ssdi-thank-you'], ['thank-you/other-options/index.html', 'other_options', 'glassman-ssdi-thank-you-other-options']]) {
    const html = readFileSync(new URL(file, root), 'utf8');
    assert.match(html, new RegExp('<main data-thank-you="' + kind + '">'));
    assert.match(html, new RegExp('<meta name="ee-page-id" content="' + pid + '">'));
    assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
    assert.match(html, /GTM-PHC7459M/);
    assert.match(html, /<section id="networkTools"[^>]+hidden/);
    assert.match(html, /thank-you\/network\.js\?v=/);
    assert.match(html, /thank-you\/thanks\.js\?v=/);
    assert.doesNotMatch(html, /intake\.js|generate_lead|oaiq|ttq\.track|fbq\(/, 'thank-you pages never re-send conversions');
    assert.match(html, /ATTORNEY ADVERTISING/);
  }
  const oo = readFileSync(new URL('thank-you/other-options/index.html', root), 'utf8');
  assert.doesNotMatch(oo, /data-sofia-tel="\+1|data-sofia-call/, 'no Glassman Sofia line on the other-options page');
  assert.match(oo, /received by Marketing Apes/);
  const network = readFileSync(new URL('thank-you/network.js', root), 'utf8');
  assert.match(network, /callback: '',\s*other_options: ''/, 'network slot ships empty until Kyle approves a tool');
  const thanks = readFileSync(new URL('thank-you/thanks.js', root), 'utf8');
  assert.match(thanks, /sessionStorage\.removeItem\('ee_ssdi_thanks'\)/);
  assert.match(thanks, /fresh: !!\(rec && rec\.real === true && !test\)/);
  assert.doesNotMatch(thanks, /generate_lead|fbq|ttq|oaiq/);
});

test('outside intake hours the pages ask for an exact callback day, time and zone as an unconfirmed request', () => {
  const js = readFileSync(new URL('intake.js', root), 'utf8');
  for (const key of ['preferred_date', 'preferred_time', 'timezone', 'preferred_at_eastern', 'preferred_utc', 'preferred_label']) assert.match(js, new RegExp(key));
  assert.match(js, /not a booked appointment/);
  assert.match(js, /RL\.inHours\(new Date\(\)\) && !forced/);
  assert.doesNotMatch(js, /dataLayer\.push\([^)]*preferred_/);
});
