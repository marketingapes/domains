import test from 'node:test';import assert from 'node:assert/strict';import {createPlan} from '../model.mjs';
const pages=await import('../pages.mjs').catch(()=>({}));
test('produces three distinct standalone intake previews without external submissions',()=>{
 assert.equal(typeof pages.renderIntakePage,'function');
 const p=createPlan({topic:'mva',brand:'btl',start:'2026-09-14',qualifies:'Injury reported',disqualifies:'Outside agreed service area',firm:'<script>alert(1)</script>'});
 const variants=['prequalify','open','ai'].map(m=>pages.renderIntakePage(p,m));
 for(const h of variants){assert.match(h,/noindex/);assert.match(h,/Preview only/);assert.ok(!h.includes('<script>alert(1)</script>'));assert.ok(!h.includes('fetch('));assert.ok(!h.includes('action="http'));assert.match(h,/Injury reported/);}
 assert.match(variants[0],/Prequalification/);assert.match(variants[1],/Tell us what happened/);assert.match(variants[2],/AI-assisted intake/);assert.match(variants[2],/scripted demonstration/);
 assert.throws(()=>pages.renderIntakePage(p,'unknown'));
});
