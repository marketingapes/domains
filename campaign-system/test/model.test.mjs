import test from 'node:test';
import assert from 'node:assert/strict';
const mod = await import('../model.mjs').catch(()=>({}));
test('builds a fourteen day MVA plan without silently launching or billing',()=>{
 assert.equal(typeof mod.createPlan,'function');
 const p=mod.createPlan({topic:'mva',brand:'btl',firm:'Example Firm',location:'Phoenix, AZ',start:'2026-09-14'});
 assert.equal(p.geo.radiusMiles,50); assert.equal(p.status,'draft'); assert.equal(p.end,'2026-09-27');
 assert.equal(p.mediaCents,1000000); assert.equal(p.managementMonthlyCents,250000);
 assert.equal(p.schedule.length,14); assert.equal(p.schedule.reduce((s,x)=>s+x.budgetCents,0),1000000);
 assert.equal(p.live,false);
});
test('requires valid catalog inputs, dates and radius; ignores unknown sensitive fields',()=>{
 assert.equal(typeof mod.createPlan,'function');
 for(const bad of [{topic:'unknown'},{brand:'evil'},{start:'2026-02-30'},{radius:0},{radius:501}]) assert.throws(()=>mod.createPlan({topic:'mva',brand:'btl',start:'2026-09-14',...bad}));
 const p=mod.createPlan({topic:'talc',brand:'nil',start:'2026-09-14',phone:'123',radius:40});
 assert.equal(p.geo.radiusMiles,null); assert.equal(p.mediaCents,500000); assert.equal(p.phone,undefined);
});
test('pacing distinguishes manual actuals from planned spend and handles completed sprints',()=>{
 assert.equal(typeof mod.pacing,'function');
 const p=mod.createPlan({topic:'talc',brand:'lfma',start:'2026-09-14'});
 assert.equal(mod.pacing(p,'2026-09-13',0).elapsedDays,0);
 assert.equal(mod.pacing(p,'2026-09-27',500000).remainingCents,0);
 assert.equal(mod.pacing(p,'2026-10-01',550000).overspendCents,50000);
 assert.throws(()=>mod.pacing(p,'2026-09-15',-1));
});
test('supports either structured media tier without confusing monthly fees',()=>{
 const p=mod.createPlan({topic:'custom',brand:'ma',start:'2026-09-14',tier:'major'});
 assert.equal(p.mediaCents,1000000);assert.equal(p.tier,'major');
 assert.throws(()=>mod.createPlan({topic:'talc',brand:'ma',start:'2026-09-14',tier:'bogus'}));
});
