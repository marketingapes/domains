import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {renderOnboardingPage, buildOnboarding, ONBOARDING_CSP} from '../build.mjs';

const kit = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(kit, '..');
const html = renderOnboardingPage();

test('onboarding is a standalone private request preview with no provider capability', () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.ok(html.includes(`content="${ONBOARDING_CSP}"`));
  for (const directive of ["default-src 'none'", "connect-src 'none'", "form-action 'none'", "frame-src 'none'", "object-src 'none'", "base-uri 'none'"]) assert.ok(ONBOARDING_CSP.includes(directive));
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href="https?:|<img[^>]+src="https?:|href="(?:tel|mailto):/i);
  assert.doesNotMatch(html, /localStorage|sessionStorage|navigator\.sendBeacon|XMLHttpRequest|\bfetch\s*\(/);
  assert.doesNotMatch(html, /transitionTrustedOrder|evaluateTrustedPayment|payment_reconciled|invoice_issued/);
  assert.match(html, /LOCAL_DRAFT_NOT_SUBMITTED/);
  assert.match(html, /Information stays in this tab until you download it/);
  assert.match(html, /invoice:false,payment:false,build:false,publish:false,spend:false,contact:false/);
});

test('the generated browser program parses without imports or privileged server transitions', () => {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  assert.equal(scripts.length, 1, 'one self-contained script');
  assert.doesNotThrow(()=>new Script(scripts[0], {filename:'generated-onboarding.js'}));
  assert.doesNotMatch(scripts[0], /\bimport\s|node:crypto|createHash/);
  assert.match(scripts[0], /const BTL_ORDER/);
  assert.match(scripts[0], /validateOrderRequest\(raw\)/);
  assert.match(scripts[0], /URL\.revokeObjectURL/);
  assert.match(scripts[0], /lastRaw===serialized/);
  assert.match(scripts[0], /if\(draft\)\{draft=null;lastRaw=null;releaseDownload\(\)/);
});

test('four request steps cover required inputs without inventing claim criteria or payment', () => {
  const panels = [...html.matchAll(/data-panel="(\d)"/g)].map(m=>m[1]);
  assert.deepEqual(panels,['0','1','2','3']);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size, ids.length, 'unique IDs support labels and error targeting');
  for (const id of ['commercial-model','topic','states','excluded-states','criteria-source','criteria-version','qualifiers','exclusions','firm-name','contact-name','contact-email','billing-name','billing-email','intake-mode','intake-endpoint','intake-hours','timezone','capacity','distribution','alternate-routing','media','duration','scope-ack','prepare','download']) assert.ok(ids.includes(id),id);
  for (const id of ['topic','states','firm-name','contact-name','contact-email','billing-name','billing-email']) assert.match(html,new RegExp(`id="${id}"[^>]+data-required="true"`));
  assert.match(html,/value="pending">Not ready — route this request for review/);
  assert.match(html,/No suggested legal or medical thresholds are filled in automatically/);
  assert.match(html,/Ad targeting and browsing behavior do not establish case eligibility/);
  assert.doesNotMatch(html,/>Pay (?:now|invoice)|>Mark paid|>Launch now|>Send invoice/i);
  assert.match(html,/>Prepare request /);
});

test('all proposed commercial models stay reviewable and sharing permission remains separate', () => {
  for (const model of ['managed_campaign','qualified_lead_program','network_membership','founding_partner']) assert.match(html,new RegExp(`<option value="${model}">`));
  assert.match(html, /No campaign fee or advertising budget is automatically added/);
  assert.match(html, /proposed \$150\/month example is under review/);
  assert.match(html, /Media and guaranteed leads are not included/);
  assert.match(html, /These do not grant permission to share a person’s information/);
  assert.match(html, /the person’s separate permission/);
  assert.match(html, /No automatic redistribution is enabled here/);
  assert.match(html, /Consumer screening is free/);
});

test('the onboarding generator writes to its private preview directory and leaves public campaign files alone', () => {
  const publicDir=join(root,'btl','c');
  const snapshot = path => existsSync(path) ? readdirSync(path,{recursive:true}).filter(p=>!p.endsWith('/')).sort().map(p=>{const f=join(path,p);try{return[p,readFileSync(f).toString('base64')];}catch{return[p,'directory'];}}) : [];
  const before=snapshot(publicDir);
  const receipt=buildOnboarding();
  assert.equal(receipt.mode,'LOCAL_DRAFT_NOT_SUBMITTED');
  assert.equal(receipt.provider_actions,false);
  assert.equal(receipt.pages,'campaign-kit/out/onboarding/preview/index.html');
  assert.equal(readFileSync(join(root,receipt.pages),'utf8'),html);
  assert.deepEqual(snapshot(publicDir),before);
});
