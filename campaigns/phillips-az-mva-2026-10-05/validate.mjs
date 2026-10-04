import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
const m=read('manifest.json');
assert.equal(m.activation,false);assert.equal(m.spend_authorized_usd,0);assert.equal(m.approved_budget_usd,null);
for(const f of ['calls_enabled','form_submissions_enabled','buyer_delivery_enabled','deploy_enabled']) assert.equal(m[f],false);
assert.equal(new Intl.DateTimeFormat('en-US',{timeZone:'America/Phoenix',hour:'2-digit',hour12:false}).format(new Date(m.target_review_time)),'06');
assert.equal(new Date(m.target_review_time).getUTCDay(),1);
assert.equal(m.production.repository,'marketingapes/nil-site');assert.ok(m.do_not_activate.some(x=>x.campaign_id==='24318918184'));
for(const c of m.channels) assert.equal(c.activation,false);
const g=read('google-build.json');
for(const h of g.pmax.headlines)assert.ok(h.length<=30,h);for(const h of g.pmax.long_headlines)assert.ok(h.length<=90,h);for(const d of g.pmax.descriptions)assert.ok(d.length<=90,d);
assert.equal(g.shared.conversion_uploads_enabled,false);assert.deepEqual(g.pmax.audience_signals,[]);
assert.equal(g.pmax.campaign_id,'24313118384');assert.equal(g.search.campaign_id,'24313116842');assert.equal(g.pmax.groups.length,3);
const n=read('native-form-review.json');assert.equal(n.existing_delivery_mode,'receipt_only_hold');assert.equal(n.callback_enabled,false);assert.equal(n.buyer_delivery_enabled,false);for(const p of n.permission_fields)assert.equal(p.default,false);
assert.equal(crypto.createHash('sha256').update(n.draft_disclosure).digest('hex'),n.disclosure_sha256);
const t=read('tracking-intake-contract.json');assert.equal(t.routing.automated_eligibility_rejection,false);assert.equal(t.routing.phone_route.phillips,'+16022003976');assert.equal(t.routing.website_gate_independent_of_native,true);
for(const f of ['lead_id','claim_id','gclid','fbclid','ttclid','consent_sha256','trustedform_cert_url'])assert.ok(t.fields.includes(f));
const a=read('asset-manifest.json');const sibling=path.resolve(dir,'../../..','nil-site');
if(!fs.existsSync(sibling))console.log('Asset byte verification skipped: sibling nil-site checkout unavailable. Manifest remains source evidence only.');
if(fs.existsSync(sibling))for(const x of a.assets){const b=fs.readFileSync(path.join(sibling,x.path));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),x.sha256);assert.equal(b.length,x.bytes);}
const preview=fs.readFileSync(path.join(dir,'review.html'),'utf8');assert.match(preview,/connect-src 'none'/);assert.match(preview,/form-action 'none'/);assert.doesNotMatch(preview,/<form\b|<script\b|tel:|<iframe\b/i);
const l=read('landing-variants.json');for(const v of l.variants){assert.equal(v.robots,'noindex,nofollow');assert.equal(v.legal_review,'pending-attorney-review');assert.equal(v.geography,'Arizona');}
console.log('PASS: offline safety, exact campaign identity, date/time, copy limits, consent defaults/hash, tracking fields, source asset hashes, inert preview and landing review markers. No network or submissions.');
