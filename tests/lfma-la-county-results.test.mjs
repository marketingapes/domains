import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../lfma/results/la-county/index.html',import.meta.url),'utf8');
test('public aggregate report has no collection or private portal dependencies',()=>{
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/form-action 'none'/);
 assert.match(html,/script-src 'none'/);
 assert.doesNotMatch(html,/<script\b|<form\b|<iframe\b|docs\.google\.com|sheets\.google\.com|mailto:|tel:/i);
 // The existing logo asset is permitted; private navigation is not.
 const hrefs=[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(hrefs.every(h=>!h.startsWith('/phillips/')&&!h.startsWith('/portal/')));
 assert.ok(hrefs.every(h=>h.startsWith('#')||h.startsWith('/')||h==='results.css'));
});
test('recorded statuses remain distinct from signed outcomes and unique people',()=>{
 assert.match(html,/CRM-reported/);
 assert.match(html,/distinct intake IDs do not establish unique people/i);
 assert.match(html,/Sent is not signed/);
 assert.match(html,/Confirmed signed cases[\s\S]*?<dd>Not verified<\/dd>/);
 assert.match(html,/18 ÷ 81 recorded intakes = 22\.2%/);
 assert.match(html,/18 ÷ 66 = <strong>27\.3%/);
 assert.match(html,/not signed-case conversion rates/);
});
test('costs preserve cohort boundaries',()=>{
 assert.match(html,/Current-launch spend cannot be divided by historical conversions/);
 assert.match(html,/Cost per confirmed signed case[\s\S]*?<dd>Not calculable<\/dd>/);
 assert.match(html,/Missing confirmation is not a zero-case result/);
});
