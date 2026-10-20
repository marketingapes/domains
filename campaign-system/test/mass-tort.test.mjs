import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,symlink,mkdir,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createMassTortKit,validateMassTortKit,kitSnapshot} from '../mass-tort.mjs';
import {dryRun,run} from '../mass-tort-cli.mjs';
const draft=()=>createMassTortKit({topic:'talc',start:'2026-11-01',campaignId:'fixture-talc-001'});
const stamp=k=>{k.evidence.snapshot=kitSnapshot(k);return k;};
function approve(k,group) {
  for(const a of Object.values(k.evidence[group])) Object.assign(a,{verified:true,evidenceRef:'private-review/fixture-receipt',reviewer:'Fixture reviewer',reviewedAt:'2026-10-20T10:00:00Z'});
  return stamp(k);
}
function review() {
  const k=draft();
  k.firm.name='Fixture Firm';k.firm.color='#731a42';
  for(const p of k.pages) {p.previewRef=`review/${p.path}.html`;p.copyVersion='copy-v1';}
  for(const c of k.concepts) Object.assign(c,{headline:'Fixture headline',body:'Fixture copy for validation only',imageRef:'review/image.png',videoStoryboardRef:'review/storyboard.pdf'});
  k.bindings.existingTestLine={id:'fixture-line',revision:'line-v1'};
  k.reporting.sampleRef='review/labeled-sample.json';
  return approve(k,'review');
}
function launch() {
  const k=review();k.templateOnly=false;
  Object.assign(k.firm,{id:'fixture-firm',logoRef:'assets/fixture-logo.svg'});
  Object.assign(k.identity,{tenantId:'fixture-tenant',domainId:'fixture-domain'});
  k.geography.included=['Fixture jurisdiction'];
  Object.assign(k.screening,{version:'rules-v1',qualifies:['Fixture approved rule'],disqualifies:['Fixture approved exclusion']});
  Object.assign(k.consent,{version:'consent-v1',callsText:'Fixture calls consent',smsText:'Fixture optional SMS consent'});
  for(const [key,b] of Object.entries(k.bindings)) if(typeof b==='object') Object.assign(b,{id:`fixture-${key}`,revision:'fixture-v1'});
  for(const [key,b] of Object.entries(k.destinations)) if(typeof b==='object') Object.assign(b,{id:`fixture-${key}`,revision:'fixture-v1'});
  k.destinations.timezone='America/New_York';
  k.reporting.actualRef='private-review/fixture-reconciliation';
  k.budget={mediaCents:100,approvalRef:'private-review/fixture-budget'};
  for(const c of k.concepts)c.videoRef='review/fixture-video.mp4';
  return approve(k,'launch');
}
test('named MASS_TORT only: rejects MVA, PI, SSDI, auto/truck, custom and unsupported topics',()=>{
  for(const topic of ['mva','personal-injury','ssdi','auto','truck','custom','sexual-abuse',undefined]) assert.throws(()=>createMassTortKit({topic,start:'2026-11-01',campaignId:'fixture-001'}));
  for(const topic of ['paraquat','talc','roundup']) {
    const k=createMassTortKit({topic,start:'2026-11-01',campaignId:`fixture-${topic}`});
    assert.deepEqual(k.screening.qualifies,[]);assert.deepEqual(k.screening.disqualifies,[]);
    assert.equal(k.budget.mediaCents,null);assert.equal(k.consent.version,'');
  }
});
test('committed template is reproducible and honestly DRAFT',async()=>{
  const k=JSON.parse(await readFile(new URL('../examples/mass-tort.draft.json',import.meta.url)));
  assert.deepEqual(k,createMassTortKit({topic:'talc',start:'2026-11-01',campaignId:'template-talc-review-001'}));
  const r=validateMassTortKit(k);assert.equal(r.status,'DRAFT');assert.equal(r.launchReady,false);assert.deepEqual(r.errors,[]);
});
test('unknown fields, malformed types and borrowed products fail closed without throwing',()=>{
  for(const mutate of [k=>k.product='MVA',k=>k.product='SSDI',k=>k.brand='nil',k=>k.screening.topic='paraquat',k=>k.identity.source='make:btl-paraquat-web',k=>k.consent.method='submit_button_disclosure',k=>k.bindings.makeHook.url='secret',k=>k.pages=null,k=>k.evidence.launch={},k=>k.screening.qualifies=[{}],k=>delete k.firm]) {
    const k=draft();mutate(k);assert.equal(validateMassTortKit(k).status,'INVALID');
  }
  for(const input of [null,[],{},'MVA'])assert.equal(validateMassTortKit(input).status,'INVALID');
});
test('review readiness needs real deliverable references, a labeled test line and current review evidence',()=>{
  const k=review();assert.equal(validateMassTortKit(k).status,'REVIEW_READY');
  assert.equal(validateMassTortKit(k).launchReady,false);
  k.concepts[0].imageRef='';stamp(k);assert.equal(validateMassTortKit(k).reviewReady,false);
});
test('launch readiness requires every launch prerequisite, not a status flag or review approval',()=>{
  const k=launch();assert.equal(validateMassTortKit(k).status,'LAUNCH_READY');
  for(const key of Object.keys(k.evidence.launch)) {
    const c=structuredClone(k);c.evidence.launch[key].verified=false;
    assert.equal(validateMassTortKit(c).launchReady,false,key);
  }
  for(const mutate of [c=>c.templateOnly=true,c=>c.screening.version='',c=>c.consent.version='',c=>c.bindings.vapiAssistant.id='',c=>c.destinations.calendar.id='',c=>c.destinations.timezone='bad-zone',c=>c.budget.mediaCents=null,c=>c.reporting.actualRef='',c=>c.firm.logoRef='']) {
    const c=structuredClone(k);mutate(c);stamp(c);assert.equal(validateMassTortKit(c).launchReady,false);
  }
});
test('any content change invalidates evidence, JSON key ordering does not',()=>{
  const k=launch();
  for(const mutate of [c=>c.screening.qualifies.push('Changed rule'),c=>c.consent.callsText+=' changed',c=>c.bindings.makeScenario.revision='changed',c=>c.destinations.firm.id='changed',c=>c.pages[0].copyVersion='changed']) {
    const c=structuredClone(k);mutate(c);assert.equal(validateMassTortKit(c).reviewReady,false);assert.equal(validateMassTortKit(c).launchReady,false);
  }
  assert.equal(kitSnapshot(k),kitSnapshot(Object.fromEntries(Object.entries(k).reverse())));
});
test('cross-campaign evidence, missing consent and a sample passed off as actual reporting block launch',()=>{
  const moved=launch();moved.campaignId='fixture-talc-002';moved.identity.source='btl:mass-tort:fixture-talc-002';
  for(const p of moved.pages)p.pageId=`${moved.campaignId}-${p.path}`;
  assert.equal(validateMassTortKit(moved).reviewReady,false);
  for(const field of ['version','callsText','smsText']) {
    const k=launch();k.consent[field]='';stamp(k);assert.equal(validateMassTortKit(k).launchReady,false);
  }
  const sample=launch();sample.reporting.actualRef=sample.reporting.sampleRef;stamp(sample);
  assert.equal(validateMassTortKit(sample).launchReady,false);
});
test('unsafe public reporting, remote assets/endpoints and known Make gaps cannot pass',()=>{
  for(const mutate of [k=>k.reporting.publicMinCohort=9,k=>k.reporting.maxAgeMinutes=16,k=>k.reporting.unknownValues='zero',k=>k.reporting.publicAggregatesOnly=false,k=>k.bindings.makeHook.id='https://hook.example/secret',k=>k.firm.logoRef='../borrowed.svg',k=>k.firm.color='red;display:none']) {
    const k=launch();mutate(k);stamp(k);assert.equal(validateMassTortKit(k).status,'INVALID');
  }
  const k=launch();k.bindings.makeScenario.id='6437227';stamp(k);
  assert.equal(validateMassTortKit(k).launchReady,false);
});
test('dry run reuses all three studio modes, escapes firm brand, emits source IDs and never sets activation',()=>{
  const k=draft();k.firm.name='<script>evil()</script>';k.firm.color='#731a42';
  const r=dryRun(k);
  assert.deepEqual(r.manifest.pages.map(p=>p.studioMode),['open','prequalify','ai']);
  assert.equal(r.manifest.firmBrand.name,k.firm.name);assert.equal(r.manifest.activation,false);
  assert.equal(r.manifest.identity.source,'btl:mass-tort:fixture-talc-001');
  for(const name of ['form.html','quiz.html','sofia.html']) {
    assert.match(r.assets[name],/&lt;script&gt;evil\(\)&lt;\/script&gt;/);
    assert.match(r.assets[name],/#731a42/);assert.match(r.assets[name],/Preview only/);
    assert.doesNotMatch(r.assets[name],/fetch\(|XMLHttpRequest|tel:|https:\/\/hook/);
  }
});
test('one command emits local assets/checklist; gate fails; overwrite and repository output are refused',async()=>{
  const parent=await mkdtemp(join(tmpdir(),'btl-kit-test-'));
  try {
    const input=fileURLToPath(new URL('../examples/mass-tort.draft.json',import.meta.url)),output=join(parent,'review');
    assert.equal(await run([input,output,'LAUNCH_READY']),1);
    const m=JSON.parse(await readFile(join(output,'manifest.json')));
    assert.equal(m.dryRun,true);assert.ok(m.checklist.launch.persistentReceipt);
    assert.equal(JSON.parse(await readFile(join(output,'readiness.json'))).status,'DRAFT');
    await assert.rejects(run([input,output]),/EEXIST/);
    await assert.rejects(run([input,fileURLToPath(new URL('../should-not-write',import.meta.url))]),/outside the repository/);
    assert.equal(await readFile(join(output,'sofia.html'),'utf8').then(x=>x.includes('No AI service is connected')),true);
  } finally {await rm(parent,{recursive:true,force:true});}
});
test('canonical output confinement rejects symlinks into the repo and live/generated subtrees before writes',async()=>{
  const parent=await mkdtemp(join(tmpdir(),'btl-kit-symlink-'));
  const input=fileURLToPath(new URL('../examples/mass-tort.draft.json',import.meta.url));
  try {
    for(const [name,destination] of [['repo','../../'],['generated','../../btl/campaigns/'],['live','../../btl/paraquat/']]) {
      const link=join(parent,name),source=fileURLToPath(new URL(destination,import.meta.url));
      await symlink(source,link,'dir');
      // Test both a new direct child and a path with multiple missing parents.
      for(const suffix of ['should-not-write','missing-parent/review']) {
        await assert.rejects(run([input,join(link,suffix)]),/outside the repository/);
        await assert.rejects(access(join(source,suffix.split('/')[0])),{code:'ENOENT'});
      }
    }
    const outside=join(parent,'outside');await mkdir(outside);
    const alias=join(parent,'outside-alias');await symlink(outside,alias,'dir');
    assert.equal(await run([input,join(alias,'review')]),0);
    assert.equal(JSON.parse(await readFile(join(outside,'review','manifest.json'))).dryRun,true);
    await assert.rejects(run([input,join(alias,'review')]),{code:'EEXIST'});
    await assert.rejects(run([input,join(outside,'absent-parent','review')]),{code:'ENOENT'});
    await assert.rejects(access(join(outside,'absent-parent')),{code:'ENOENT'});
  } finally {await rm(parent,{recursive:true,force:true});}
});
