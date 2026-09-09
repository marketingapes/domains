import test from 'node:test';
import assert from 'node:assert/strict';
import {addMobileUx, MARKER, STYLE} from '../tools/apply-lfma-mobile-ux.mjs';
import {addPolish, LINK} from '../tools/apply-lfma-polish.mjs';
// Structural fixture built from inspected current selectors and field semantics.
// Not a substitute for final-page, production-browser or backend validation.
export const fixture=`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Request a Campaign | Law Firm Marketing Apes</title></head><body><div class="wrap">
<div class="topbar"><span class="brand">Law Firm Marketing Apes</span><span class="step-of">Step 1 of 3</span></div>
  <h1>Tell us the campaign you need.</h1>
<p class="lede">We build the landing page, the ads, the intake and routing, then run a two-week sprint.</p>
<div class="flow">${['You send this brief','We send scope + invoice','Payment starts the build','We build and test','Launch after approval','Two-week sprint and reporting'].map((s,i)=>`<div class="fstep"><span class="fn">${i+1}</span><span class="ft">${s}</span></div>`).join('')}</div>
  <form id="briefForm">
<h2>Who's asking</h2>
<div class="field"><label for="firm">Firm <span class="req">Required</span></label><input type="text" id="firm" name="firm" required></div>
<div class="field"><label for="name">Your name <span class="req">Required</span></label><input type="text" id="name" name="name" required></div>
<div class="field"><label for="email">Email <span class="req">Required</span></label><input type="email" id="email" name="email" required></div>
<h2>The campaign</h2>
<div class="field"><label for="tort">Case type <span class="req">Required</span></label><select id="tort" name="tort" required><option value="">Choose one...</option><option>Car accidents (MVA)</option><option>General personal injury</option></select></div>
<div class="field"><label for="geo">States or metros <span class="req">Required</span></label><input type="text" id="geo" name="geo" placeholder="Arizona - statewide" required></div>
<div class="field"><label for="no">What you don't take <span class="req">Required</span></label><span class="hint">The most valuable answer on this page. Anything you name here never reaches your desk.</span><textarea id="no" name="no" placeholder="Existing representation, excluded claim types..." required></textarea></div>
<div class="field"><label for="budget">Media budget <span class="req">Required</span></label><span class="hint">Ad spend is paid directly to the platform, separate from our fee.</span><select id="budget" name="budget" required><option value="">Choose one...</option><option>$2,500 - two weeks</option><option>$5,000 - two weeks</option><option>$10,000 - two weeks</option><option>Not sure - recommend one</option></select></div>
<h2>How leads reach you</h2>
<div class="opts">
<label class="opt"><input type="radio" name="intake" value="self"><span><span class="opt-h">We run intake<span class="tag">Included</span></span><span class="opt-d">Leads land in the system and your team works them from there.</span></span></label>
<label class="opt"><input type="radio" name="intake" value="deliver" checked><span><span class="opt-h">Deliver to our intake team<span class="tag">Included</span></span><span class="opt-d">Agree on where inquiries go and how after-hours inquiries are handled.</span></span></label>
<label class="opt"><input type="radio" name="intake" value="ai"><span><span class="opt-h">A.I. prequalifies first<span class="tag up">Add-on</span></span><span class="opt-d">Our assistant calls in about a minute, qualifies by claim type in English or Spanish, and only warm-transfers what matches your criteria.</span></span></label>
</div>
<div class="field"><label for="line">Your intake line for live transfers</label><input type="text" id="line" name="line" placeholder="(602) 555-0148"></div>
<div class="field"><label for="hours">Intake hours</label><input type="text" id="hours" name="hours" placeholder="Mon-Fri 8am-6pm MST"></div>
    <div class="money"><span class="money-h">How the money works</span><p><strong>Media and service fees stay separate.</strong> Advertising runs in your ad account.</p><p>Review your scope and invoice before the build. Nothing is charged on this form.</p></div>
<button class="submit" type="submit">Send the brief</button><p class="after">Review the scope and invoice before committing.</p></form>
<div id="sent" hidden><h2>Receipt</h2><p>Fixture success state.</p></div>
  <footer><p class="disc">Marketing Apes is a marketing company, not a law firm. No guaranteed number of leads or signed cases. This is an offline UX preview.</p></footer></div>
<script>window.fixtureOnly=true;</script></body></html>`;
const out=addMobileUx(fixture);
test('groups the same fields into three semantic sections',()=>assert.equal((out.match(/<fieldset class="brief-section">/g)||[]).length,3));
test('keeps existing script bytes intact',()=>assert.deepEqual(out.match(/<script[^>]*>[\s\S]*?<\/script>/g),fixture.match(/<script[^>]*>[\s\S]*?<\/script>/g)));
test('retains every named field, value, required flag and radio selection',()=>{
 const signature=s=>[...s.matchAll(/<(input|textarea|select|button)\b[^>]*>/g)].map(m=>[m[1],...(m[0].match(/(?:name|value)="[^"]*"|\brequired\b|\bchecked\b/g)||[])]);
 assert.deepEqual(signature(out),signature(fixture));
});
test('preserves every select option exactly',()=>assert.deepEqual(out.match(/<option\b[^>]*>[\s\S]*?<\/option>/g),fixture.match(/<option\b[^>]*>[\s\S]*?<\/option>/g)));
test('replaces the inaccurate progress label',()=>{assert.doesNotMatch(out,/Step 1 of 3/);assert.match(out,/>Campaign brief</);});
test('uses native collapsed process disclosure',()=>{assert.match(out,/<details class="campaign-process"><summary>/);assert.doesNotMatch(out,/<details[^>]+open/);});
test('adds a keyboard skip target and single main landmark',()=>{assert.match(out,/href="#campaign-main"/);assert.equal((out.match(/<main /g)||[]).length,1);});
test('uses contact autofill and a distinct telephone transfer input',()=>{assert.match(out,/id="email"[^>]*autocomplete="email"/);assert.match(out,/type="tel" id="line"[^>]*autocomplete="off"/);});
test('keeps receipt hidden until existing code changes it',()=>assert.match(out,/<div id="sent" hidden>/));
test('does not introduce a second post or runtime script',()=>{assert.equal((out.match(/<script\b/g)||[]).length,1);assert.doesNotMatch(STYLE,/@import|url\(|position\s*:\s*(fixed|sticky)/);});
test('is idempotent',()=>assert.equal(addMobileUx(out),out));
test('also accepts already-polished original markup',()=>{assert.equal(addMobileUx(addPolish(fixture)),out);assert.equal(out.split(LINK).length,2);});
test('refuses partial and foreign patches',()=>{assert.throws(()=>addMobileUx(fixture+MARKER));assert.throws(()=>addMobileUx(fixture.replace('<form','<main><form')));});
test('refuses a changed schema instead of forcing it',()=>assert.throws(()=>addMobileUx(fixture.replace('id="firm"','id="company"'))));
test('refuses attributes already modified by another editor',()=>assert.throws(()=>addMobileUx(fixture.replace('id="email"','id="email" autocomplete="email"'))));
test('refuses missing or duplicate required anchors',()=>{assert.throws(()=>addMobileUx(fixture.replace('<h2>The campaign</h2>','')));assert.throws(()=>addMobileUx(fixture.replace('<footer>','<footer><footer>')));});

import {mkdtemp, mkdir, writeFile, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const script=new URL('../tools/apply-lfma-mobile-ux.mjs',import.meta.url).pathname;
async function makeTree(){const root=await mkdtemp(join(tmpdir(),'lfma-ux-test-'));await mkdir(join(root,'lfma/campaign'),{recursive:true});await mkdir(join(root,'lfma/assets'));await writeFile(join(root,'lfma/campaign/index.html'),fixture);await writeFile(join(root,'lfma/assets/campaign-polish-v1.css'),'/* fixture */');return root;}
test('CLI dry run does not write page changes',async()=>{const root=await makeTree();const result=spawnSync(process.execPath,[script,root],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/DRY RUN/);assert.equal(await readFile(join(root,'lfma/campaign/index.html'),'utf8'),fixture);});
test('CLI apply stores private rollback outside site tree and is repeat-safe',async()=>{const root=await makeTree();const result=spawnSync(process.execPath,[script,root,'--apply'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.equal(await readFile(join(root,'lfma/campaign/index.html'),'utf8'),out);const backup=result.stdout.match(/Rollback copy: (.+)/)[1];assert.equal(backup.startsWith(root),false);assert.equal(await readFile(backup,'utf8'),fixture);const repeat=spawnSync(process.execPath,[script,root,'--apply'],{encoding:'utf8'});assert.equal(repeat.status,0,repeat.stderr);assert.match(repeat.stdout,/Already applied/);});
