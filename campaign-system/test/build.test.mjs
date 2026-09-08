import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {brands,topics} from '../catalog.mjs';
test('every brand has a safe studio, topic pages and identical shared model',()=>{
 for(const b of brands){
  assert.ok(fs.existsSync(`${b.id}/campaigns/index.html`),`${b.id} studio missing`);
  assert.equal(fs.readFileSync(`${b.id}/campaigns/model.mjs`,'utf8'),fs.readFileSync('campaign-system/model.mjs','utf8'));
  for(const t of topics){const h=fs.readFileSync(`${b.id}/campaigns/${t.id}/index.html`,'utf8');assert.match(h,/noindex/);assert.match(h,/Campaign preview/);assert.ok(!h.includes('<form'));assert.ok(h.includes(t.name));}
 }
});
