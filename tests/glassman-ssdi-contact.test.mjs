import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  }
});
test('contact mapping never splits an ambiguous full name or grants email outreach consent',()=>{
  const intake=readFileSync(new URL('intake.js',root),'utf8');
  assert.match(intake,/first_name: first, last_name: last, email: val\('email'\)/);
  assert.doesNotMatch(intake,/parts\[0\]|full\.split|consent_email/);
  assert.match(intake,/if \(pending \|\| completed\) return/);
});
test('calls and optional Marketing Apes texts have separate future consent proof',()=>{
  const intake=readFileSync(new URL('intake.js',root),'utf8');
  assert.match(intake,/Marketing Apes and Jeffrey Glassman Injury Lawyers/);
  assert.match(intake,/Text messages \(optional\)/);
  assert.match(intake,/sms: \{ granted: !!\(document.getElementById\('consent_sms'\)/);
  assert.doesNotMatch(intake,/sms: \{ granted: clickwrap/);
  assert.match(intake,/glassman-ssdi-002-consent-marketing-apes-2026-11-05-v1/);
  assert.match(intake,/version: consentVersion \+ '-sms', method: 'checkbox', captured_at:/);
  assert.match(intake,/Reply STOP to stop texts or HELP for help/);
  assert.match(intake,/Text consent is optional and is not a condition of a purchase or service/);
  const smsInput = intake.match(/<input type="checkbox" id="consent_sms"[^>]*>/)?.[0];
  assert.ok(smsInput, 'SMS has its own checkbox');
  assert.doesNotMatch(smsInput,/\b(?:checked|required)\b/, 'SMS starts unchecked and is optional');
  const callText = intake.match(/var callText = '([^']+)';/)?.[1];
  assert.ok(callText);
  assert.match(callText,/Marketing Apes and Jeffrey Glassman Injury Lawyers/);
  assert.doesNotMatch(callText,/text messages|may call or text/);
  assert.match(intake,/calls: \{ granted: clickwrap \|\| .*text: callDisclosure/);
  assert.match(intake,/sms: \{ granted: !!.*\.checked, text: smsDisclosure/);
  assert.match(intake,/version: consentVersion \+ '-calls', method: clickwrap \? 'clickwrap_submit' : 'checkbox', captured_at:/);
  assert.doesNotMatch(intake,/glassman-ssdi-002-consent-clickwrap-2026-11-05/);

});
test('generate_lead fires only for real first-time leads',()=>{
  const intake=readFileSync(new URL('intake.js',root),'utf8');
  assert.match(intake,/if \(j && !isTest && j\.mode !== 'test' && j\.status !== 'duplicate'\) push\('generate_lead', \{ lead_id: j\.receipt_id \}\)/);
  assert.match(intake,/succeed\(j\);/);
});
