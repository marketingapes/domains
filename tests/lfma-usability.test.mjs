import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {improveUsability, UX_LINK} from '../tools/apply-lfma-usability.mjs';
export const fixture = `<!doctype html><html><head><link data-lfma-polish="v1"></head><body><div class="wrap">
<span class="step-of">Step 1 of 3</span><h1>Tell us the campaign you need.</h1><p class="lede">One brief. Scope before build.</p>
  <div class="flow">
${Array.from({length:6},(_,i)=>'    <div class="fstep"><span class="fn">'+(i+1)+'</span><span class="ft">Process '+(i+1)+'</span></div>').join('\n')}
  </div>

  <form id="briefForm">
<h2>Who's asking</h2>
<div class="field"><label for="firm">Firm</label><input type="text" id="firm" name="firm" required></div>
<div class="field"><label for="name">Name</label><input type="text" id="name" name="name" required></div>
<div class="field"><label for="email">Email</label><input type="email" id="email" name="email" required></div>
<h2>The campaign</h2>
<div class="field"><label for="tort">Case type</label><span class="hint">Choose your campaign.</span><select id="tort" name="tort" required><option value="">Choose</option><option>MVA</option></select></div>
<div class="field"><label for="geo">Market</label><input id="geo" name="geo" required></div>
<div class="field"><label for="no">Not accepted</label><span class="hint">Your exclusions.</span><textarea id="no" name="no" required></textarea></div>
<div class="field"><label for="budget">Budget</label><span class="hint">Media separately.</span><select id="budget" name="budget" required><option value="">Choose</option><option>$10,000</option></select></div>
<h2>How leads reach you</h2>
<div class="opts"><label class="opt"><input type="radio" name="intake" value="self">Self</label><label class="opt"><input type="radio" name="intake" value="deliver" checked>Delivery</label><label class="opt"><input type="radio" name="intake" value="ai">AI requested</label></div>
<div class="field"><label for="line">Transfer line</label><input type="text" id="line" name="line"></div>
<div class="field"><label for="hours">Hours</label><span class="hint">Office hours.</span><input type="text" id="hours" name="hours"></div>
    <div class="money">No payment here.</div><button type="submit">Send</button>
</form><div id="sent" hidden>Receipt</div>
  <footer>Terms</footer></div><script>const marker='unchanged'; /* receipt binding unchanged */</script></body></html>`;
const output = improveUsability(fixture);
const controls = html => [...html.matchAll(/<(?:input|select|textarea)\b[^>]*\bname="([^"]+)"[^>]*>/g)].map(m=>({name:m[1],value:m[0].match(/\bvalue="([^"]*)"/)?.[1],required:/\srequired(?:[\s>])/.test(m[0]),checked:/\schecked(?:[\s>])/.test(m[0])}));
test('adds one versioned style layer',()=>assert.equal(output.split(UX_LINK).length,2));
test('idempotent application',()=>assert.equal(improveUsability(output),output));
test('rejects wrong page',()=>assert.throws(()=>improveUsability('<html></html>')));
test('rejects changed process',()=>assert.throws(()=>improveUsability(fixture.replace('class="flow"','class="different"'))));
test('rejects partial installation',()=>assert.throws(()=>improveUsability(output.replace(UX_LINK,''))));
test('rejects partial form reorganization',()=>assert.throws(()=>improveUsability(fixture.replace("<h2>Who's asking</h2>",'<fieldset><legend>Firm</legend>'))));
test('preserves every form control name, value, requirement and default',()=>assert.deepEqual(controls(output),controls(fixture)));
test('preserves all script bytes',()=>assert.deepEqual(output.match(/<script[\s\S]*?<\/script>/g),fixture.match(/<script[\s\S]*?<\/script>/g)));
test('keeps one form and submit action',()=>{assert.equal((output.match(/<form\b/g)||[]).length,1); assert.equal((output.match(/type="submit"/g)||[]).length,1);});
test('three semantic groups',()=>{assert.equal((output.match(/<fieldset\b/g)||[]).length,3);assert.equal((output.match(/<\/fieldset>/g)||[]).length,3);assert.match(output,/<legend>03 \/ Lead delivery<\/legend>/);});
test('explanation follows form and receipt in DOM',()=>{assert.ok(output.indexOf('class="lfma-process"')>output.indexOf('id="sent"'));assert.match(output,/<summary>What happens after you send the brief<\/summary>/);});
test('keeps business money notice outside disclosure',()=>{assert.ok(output.indexOf('class="money"')<output.indexOf('</form>'));assert.ok(output.indexOf('class="money"')<output.indexOf('<details'));});
test('removes fake progress badge',()=>{assert.doesNotMatch(output,/Step 1 of 3/);assert.match(output,/<span class="step-of">Campaign brief<\/span>/);});
test('adds useful autocomplete and phone keyboard, not a new phone field',()=>{assert.match(output,/autocomplete="organization"/);assert.match(output,/autocomplete="email" inputmode="email"/);assert.match(output,/type="tel" id="line" name="line" inputmode="tel" autocomplete="off"/);assert.doesNotMatch(output,/name="phone"/);});
test('associates original hints with controls',()=>{for(const id of ['tort','no','budget','hours']){assert.ok(output.includes('id="help-'+id+'"'));assert.ok(output.includes('aria-describedby="help-'+id+'"'));}});
test('maintains hidden receipt region',()=>assert.ok(output.includes('id="sent" hidden')));
test('adds visible jump-to-form CTA',()=>assert.match(output,/href="#briefForm">Start your campaign brief/));
test('CSS has no network assets, fixed overlays, or small input font',async()=>{const css=await readFile(new URL('../lfma/assets/campaign-usability-v1.css',import.meta.url),'utf8');assert.doesNotMatch(css,/@import|url\(|position\s*:\s*(?:sticky|fixed)/i);assert.match(css,/font-size: 16px; min-height: 48px;/);assert.match(css,/\[hidden\] \{display: none !important;/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/focus-visible/);});
