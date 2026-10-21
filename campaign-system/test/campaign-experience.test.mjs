import test from 'node:test';
import assert from 'node:assert/strict';
import {createMassTortKit,validateMassTortKit,kitSnapshot} from '../mass-tort.mjs';
import {emptyExperience} from '../campaign-experience.mjs';
import {dryRun,resolveOwnedAssets} from '../mass-tort-cli.mjs';
import {createHandoff} from '../handoff-contract.mjs';
const kit=()=>createMassTortKit({topic:'paraquat',start:'2026-11-01',campaignId:'fixture-paraquat-demo'});
test('optional experience keeps reviewed v1 kits valid and rejects malformed/unsafe content',()=>{
 const k=kit();assert.deepEqual(validateMassTortKit(k).errors,[]);
 k.experience=emptyExperience();assert.deepEqual(validateMassTortKit(k).errors,[]);
 for(const change of [e=>e.faqs=null,e=>e.imageRef='../private.jpg',e=>e.imageRef='https://unsafe.invalid/a.jpg',e=>e.faqs=[{question:'A?',answer:'B',approvalRef:''}],e=>e.faqs=[{question:'A?',answer:'B',approvalRef:'review/v1'}],e=>e.extra='unknown',e=>e.headline='x'.repeat(181),e=>{e.imageRef='btl/assets/paraquat-field-usda-nrcs.jpg';e.imageAlt='';}]){
  const c=structuredClone(k);change(c.experience);assert.ok(validateMassTortKit(c).errors.length);
 }
});
test('content changes invalidate evidence; tort/firm profiles do not inherit experience or screening',()=>{
 const k=kit(),before=kitSnapshot(k);k.experience={...emptyExperience(),headline:'Synthetic campaign'};
 assert.notEqual(kitSnapshot(k),before);
 const other=createMassTortKit({topic:'talc',start:k.start,campaignId:'fixture-talc-demo'});
 assert.equal(other.experience,undefined);assert.deepEqual(other.screening.qualifies,[]);
 assert.deepEqual(resolveOwnedAssets(other),{});
 for(const topic of ['mva','ssdi'])assert.throws(()=>createMassTortKit({topic,start:k.start,campaignId:'fixture-other'}));
});
test('same campaign config renders all three modes with escaped copy and owned assets; other torts need assets',()=>{
 const k=kit();k.firm.id='btl';k.firm.name='Best Tort Lawyers';k.firm.logoRef='btl/assets/btl-seal.svg';
 k.experience={...emptyExperience(),headline:'Synthetic <headline>',imageRef:'btl/assets/paraquat-field-usda-nrcs.jpg',imageAlt:'Soybean rows · landscape',faqVersion:'fixture-faq-v1',faqs:[{question:'What happens next?',answer:'A human reviews the sample.',approvalRef:'synthetic-review/v1'}],nextSteps:['Human review is required']};
 k.screening.qualifies=['Synthetic question'];
 const r=dryRun(k);assert.deepEqual(r.readiness.errors,[]);
 for(const name of ['form','quiz','sofia']) {
  const h=r.assets[name+'.html'];assert.match(h,/Synthetic &lt;headline&gt;/);assert.match(h,/srcset="data:image\/jpeg/);assert.match(h,/data:image\/svg\+xml/);assert.match(h,/Soybean rows/);assert.match(h,/A human reviews the sample/);assert.match(h,/human intake reviewer must answer/);assert.match(h,/prefers-reduced-motion/);assert.match(h,/btl.sofia-context\/proposed-v1/);assert.doesNotMatch(h,/fetch\(|localStorage|sessionStorage|sendBeacon|tel:|getUserMedia/);
 }
 const other=structuredClone(k);other.topic='talc';other.screening.topic='talc';
 assert.match(dryRun(other).assets['form.html'],/Image configuration required/);
});
test('proposed handoff preserves answer provenance and exact consent without claiming a saved lead or live binding',()=>{
 const config={...kit(),brandName:'Best Tort Lawyers',firmName:'Fixture firm',tortName:'Paraquat',screeningVersion:'fixture-questions-v1',faqVersion:'fixture-faq-v1'};
 config.consent={version:'fixture-consent-v1',callsText:'Synthetic calls choice',smsText:'Synthetic SMS choice'};
 const answer={question_id:'qualifies-0',answer:'Not sure',source:'quiz',confirmed_at:'2026-10-21T01:00:00.000Z'};
 const data=createHandoff(config,{mode:'ai',submissionId:'demo-001',answers:[answer],contact:null,calls:true,sms:false});
 assert.equal(data.spec_version,'btl.sofia-context/proposed-v1');assert.equal(data.source_path,'sofia');assert.equal(data.tenant_id,config.identity.tenantId);
 assert.deepEqual(data.prior_answers,[{question_id:'qualifies-0',value:'Not sure',source:'quiz',confirmed_at:answer.confirmed_at}]);
 assert.equal(data.lead_id,null);assert.equal(data.consent_record_id,null);assert.equal(data.receipt,null);assert.equal(data.transport,'none');assert.equal(data.activation,false);
 assert.equal(data.context_status,'untrusted_local_demo');assert.deepEqual(data.consent_scope,{calls:true,sms:false});assert.ok(data.test.suppress.includes('outbound_calls'));
});
