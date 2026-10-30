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
