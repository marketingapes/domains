import {emptyExperience} from './campaign-experience.mjs';
// Operator-only adapter for the existing planning contract. No provider calls or activation.
import {createHash} from 'node:crypto';
import {topics} from './catalog.mjs';
import {createPlan} from './model.mjs';

export const SCHEMA = 'btl.mass-tort-kit/v1';
export const REVIEW_CHECKS = {
  pagesPolished: 'Review all three branded pages at mobile and desktop sizes',
  adPreviews: 'Review all three concepts, image previews and video storyboard previews',
  existingTestLine: 'Verify the existing test line binding and clearly label it test/demo',
  honestSampleReport: 'Review a labeled sample report; unknown metrics remain null'
};
export const LAUNCH_CHECKS = {
  firmCriteria: 'Firm approves this tort’s screening rules, exclusions and escalation to human review',
  geography: 'Firm approves included and excluded geography',
  copy: 'Firm approves all page/ad copy and disclosures',
  consent: 'Firm approves exact version and channel texts; visible affirmative choice, no prechecked/hidden grant',
  bindings: 'Verify existing tenant-scoped Make, Vapi, BigQuery and Perspective bindings and revisions',
  persistentReceipt: 'Verify durable save before acknowledgement with a persistent lead receipt',
  leadCallOutcome: 'Reconcile the same isolated submission/lead through call ID and persisted outcome',
  scheduling: 'Verify calendar booking receipt, timezone and failure/fallback handling',
  handoff: 'Verify answered transfer or confirmed firm delivery receipt and fallback',
  safeguards: 'Verify consent enforcement, stable retry dedupe, opt-out suppression and synthetic exclusion',
  actualReporting: 'Reconcile actual leads, calls, outcomes and spend with source receipts',
  publicReportPrivacy: 'Verify aggregates only, cohort >=10, freshness <=15 minutes, unknowns null and no PII',
  budget: 'Obtain campaign-specific budget approval; catalog estimate is not authorization',
  activation: 'Obtain explicit activation approval separately from review readiness'
};
const attestation = () => ({snapshot:'', verified:false, evidenceRef:'', reviewer:'', reviewedAt:''});
const checks = names => Object.fromEntries(Object.keys(names).map(k=>[k,attestation()]));
const binding = () => ({id:'', revision:''});
const allowedTopics = topics.filter(t=>t.mdl!==null).map(t=>t.id);

export function createMassTortKit({topic, start, campaignId}={}) {
  if (!allowedTopics.includes(topic)) throw Error('MASS_TORT requires a named mass-tort catalog topic; MVA, SSDI, PI and custom plans are not supported.');
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(campaignId||'')) throw Error('Choose a unique lowercase campaign ID (3–80 characters).');
  const plan = createPlan({brand:'btl', topic, start, campaignClass:'major_mass_tort'});
  return {
    schema:SCHEMA, product:'MASS_TORT', brand:plan.brand, topic:plan.topic,
    campaignId, start:plan.start, templateOnly:true,
    identity:{tenantId:'', domainId:'', source:`btl:mass-tort:${campaignId}`, submissionKey:'submission_id', leadKey:'lead_id', dedupeScope:'tenant+domain+campaign+submission'},
    firm:{id:'', name:'', logoRef:'', color:'#153b51'},
    geography:{included:[], excluded:[]},
    screening:{topic, version:'', qualifies:[], disqualifies:[], humanReviewRequired:true},
    consent:{version:'', callsText:'', smsText:'', method:'explicit_unchecked_channel_choice'},
    pages:[['form','open'],['quiz','prequalify'],['sofia','ai']].map(([path,studioMode])=>({path,studioMode,pageId:`${campaignId}-${path}`,previewRef:'',copyVersion:''})),
    concepts:['education','process','human-review'].map(id=>({id,headline:'',body:'',imageRef:'',videoStoryboardRef:'',videoRef:''})),
    bindings:{intakeContract:'btl.intake.web/v1',makeScenario:binding(),makeHook:binding(),vapiAssistant:binding(),existingTestLine:binding(),bigQuery:binding(),perspective:binding()},
    destinations:{calendar:binding(),transfer:binding(),firm:binding(),fallback:binding(),timezone:''},
    reporting:{sampleRef:'',actualRef:'',sampleLabel:'SYNTHETIC SAMPLE — not production performance',unknownValues:'null',publicMinCohort:10,maxAgeMinutes:15,publicAggregatesOnly:true},
    budget:{mediaCents:null,approvalRef:''},
    evidence:{snapshot:'',review:checks(REVIEW_CHECKS),launch:checks(LAUNCH_CHECKS)}
  };
}

// Content-bound attestations: changing rules, consent, destinations, copy or bindings invalidates evidence.
// Stable key order means harmless JSON formatting/key ordering changes do not invalidate reviews.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
export function kitSnapshot(kit) {
  const {evidence,...content}=kit;
  return createHash('sha256').update(JSON.stringify(canonical(content))).digest('hex');
}
const present = s => typeof s==='string' && s.trim().length>0 && !/\b(TODO|TBD|PLACEHOLDER|EXAMPLE)\b/i.test(s);
const ref = s => present(s) && !/^(https?:|data:|javascript:)/i.test(s) && !/[\r\n]/.test(s);
function shape(value, exemplar, path, errors) {
  if (Array.isArray(exemplar)) {
    if (!Array.isArray(value)) {errors.push(`${path}: expected array`);return;}
    for (const [i,v] of value.entries()) shape(v,exemplar[0]??'',`${path}[${i}]`,errors);
  } else if (exemplar && typeof exemplar==='object') {
    if (!value || typeof value!=='object' || Array.isArray(value)) {errors.push(`${path}: expected object`);return;}
    for (const key of Object.keys(value)) if (!Object.hasOwn(exemplar,key)) errors.push(`${path}.${key}: unknown field`);
    for (const [key,v] of Object.entries(exemplar)) {
      if (!Object.hasOwn(value,key)) errors.push(`${path}.${key}: required field`);
      else shape(value[key],v,`${path}.${key}`,errors);
    }
  } else if (exemplar===null) {
    if (value!==null && (!Number.isSafeInteger(value)||value<0)) errors.push(`${path}: expected nonnegative integer or null`);
  } else if (typeof value!==typeof exemplar) errors.push(`${path}: expected ${typeof exemplar}`);
}

export function validateMassTortKit(kit) {
  const errors=[],reviewBlockers=[],launchBlockers=[];
  let exemplar;
  try {exemplar=createMassTortKit({topic:kit?.topic,start:kit?.start,campaignId:kit?.campaignId});}
  catch(e) {errors.push(e.message);}
  if (exemplar) {
    const base={...kit};delete base.experience;
    shape(base,exemplar,'kit',errors);
    if(kit?.experience!==undefined)shape(kit.experience,{...emptyExperience(),faqs:[{question:'',answer:'',approvalRef:''}]},'kit.experience',errors);
  }
  const result=()=>({schema:SCHEMA,status:errors.length?'INVALID':reviewBlockers.length?'DRAFT':launchBlockers.length?'REVIEW_READY':'LAUNCH_READY',reviewReady:!errors.length&&!reviewBlockers.length,launchReady:!errors.length&&!reviewBlockers.length&&!launchBlockers.length,errors,reviewBlockers,launchBlockers});
  if(errors.length) return result();
  const requireValue=(ok,message,target=launchBlockers)=>{if(!ok)target.push(message);};
  if(kit.experience) {
    const e=kit.experience;
    requireValue(e.headline.length<=180&&e.intro.length<=800&&e.faqs.length<=12&&e.nextSteps.length<=8&&e.nextSteps.every(s=>present(s)&&s.length<=300),'Campaign experience copy exceeds review limits',errors);
    requireValue(!e.imageRef||/^[a-z0-9][a-z0-9_/-]*\.(png|webp|jpg)$/i.test(e.imageRef)&&!e.imageRef.split('/').includes('..'),'Experience image must be a local owned asset reference',errors);
    requireValue(!e.imageRef||present(e.imageAlt),'Descriptive image alt text required',errors);
    requireValue((!e.faqs.length||present(e.faqVersion))&&e.faqs.every(f=>present(f.question)&&present(f.answer)&&ref(f.approvalRef)&&f.question.length<=240&&f.answer.length<=1200),'Every FAQ requires a question, approved answer and review reference',errors);
  }
  requireValue(kit.schema===SCHEMA && kit.product==='MASS_TORT' && kit.brand==='btl','Only btl.mass-tort-kit/v1, BTL and MASS_TORT are supported',errors);
  requireValue(kit.screening.topic===kit.topic,'Screening topic mismatch; never copy another tort’s criteria',errors);
  requireValue(kit.screening.humanReviewRequired===true,'Firm human review must remain required',errors);
  requireValue(kit.identity.source===`btl:mass-tort:${kit.campaignId}` && kit.identity.submissionKey==='submission_id' && kit.identity.leadKey==='lead_id' && kit.identity.dedupeScope==='tenant+domain+campaign+submission','Identity/source must be campaign isolated with stable submission and persistent lead keys',errors);
  requireValue(kit.bindings.intakeContract==='btl.intake.web/v1','Unsupported intake contract',errors);
  requireValue(kit.consent.method==='explicit_unchecked_channel_choice','Consent must be explicit, channel-specific and unchecked',errors);
  requireValue(/^#[0-9a-f]{6}$/i.test(kit.firm.color),'Firm color must be a six-digit hex color',errors);
  requireValue(kit.firm.logoRef===''||/^[a-z0-9][a-z0-9_/-]*\.(svg|png|webp|jpg)$/i.test(kit.firm.logoRef)&&!kit.firm.logoRef.split('/').includes('..'),'Logo must be an approved local asset reference',errors);
  requireValue(kit.reporting.unknownValues==='null' && kit.reporting.publicMinCohort>=10 && kit.reporting.maxAgeMinutes>0 && kit.reporting.maxAgeMinutes<=15 && kit.reporting.publicAggregatesOnly,'Reporting privacy/freshness policy is unsafe',errors);
  // These files are public configuration: opaque IDs/repo references only, no endpoints or claimant data.
  requireValue(!/https?:\/\/|Bearer\s|-----BEGIN|\bsk_[a-z0-9]+/i.test(JSON.stringify(kit)),'Public kit must contain references/IDs, never URLs, tokens or keys',errors);
  requireValue(kit.pages.length===3 && exemplar.pages.every(p=>kit.pages.some(v=>v.path===p.path&&v.studioMode===p.studioMode&&v.pageId===p.pageId)),'Exactly three campaign-specific form/quiz/Sofia paths must map to existing studio modes',errors);
  requireValue(kit.concepts.length===3 && new Set(kit.concepts.map(c=>c.id)).size===3,'Exactly three distinct ad concepts are required',errors);
  const snapshot=kitSnapshot(kit),reviewed=kit.evidence.snapshot===snapshot;
  const attest=(group,names,target)=>{
    for(const [key,label] of Object.entries(names)) {
      const a=kit.evidence[group][key];
      requireValue(reviewed && a.snapshot===snapshot && a.verified===true && ref(a.evidenceRef) && present(a.reviewer) && /^\d{4}-\d{2}-\d{2}T/.test(a.reviewedAt) && Number.isFinite(Date.parse(a.reviewedAt)),`${group}.${key}: ${label} (individual current snapshot + evidence + reviewer + date required)`,target);
    }
  };
  for(const p of kit.pages) requireValue(ref(p.previewRef)&&present(p.copyVersion),`pages.${p.path}: polished preview reference and copy version required`,reviewBlockers);
  for(const c of kit.concepts) requireValue(present(c.headline)&&present(c.body)&&ref(c.imageRef)&&ref(c.videoStoryboardRef),`concepts.${c.id}: copy, image preview and video storyboard required`,reviewBlockers);
  requireValue(ref(kit.bindings.existingTestLine.id)&&ref(kit.bindings.existingTestLine.revision),'Existing labeled test line ID/revision required; never provision a number',reviewBlockers);
  requireValue(ref(kit.reporting.sampleRef)&&kit.reporting.sampleLabel==='SYNTHETIC SAMPLE — not production performance','Honest labeled sample report required',reviewBlockers);
  requireValue(present(kit.firm.id)&&present(kit.firm.name)&&ref(kit.firm.logoRef),'Firm identity, display name and approved logo reference required for branded review',reviewBlockers);
  attest('review',REVIEW_CHECKS,reviewBlockers);
  requireValue(kit.templateOnly===false,'Replace template placeholders and explicitly confirm campaign-specific configuration');
  requireValue(present(kit.identity.tenantId)&&present(kit.identity.domainId),'Bound tenant/domain identity required; never borrow a tenant');
  requireValue(kit.geography.included.length>0 && kit.geography.included.every(present) && kit.geography.excluded.every(present),'Explicit included geography and exclusions required (empty exclusions means none, subject to firm approval)');
  requireValue(present(kit.screening.version)&&kit.screening.qualifies.length>0&&kit.screening.disqualifies.length>0&&[...kit.screening.qualifies,...kit.screening.disqualifies].every(present),'Versioned campaign-specific qualifications and disqualifications required');
  requireValue(present(kit.consent.version)&&present(kit.consent.callsText)&&present(kit.consent.smsText),'Exact consent version and calls/SMS text required');
  for(const [key,b] of Object.entries(kit.bindings)) if(typeof b==='object') requireValue(ref(b.id)&&ref(b.revision),`bindings.${key}: verified existing ID/revision required`);
  for(const [key,b] of Object.entries(kit.destinations)) if(typeof b==='object') requireValue(ref(b.id)&&ref(b.revision),`destinations.${key}: verified existing ID/revision required`);
  try {new Intl.DateTimeFormat('en',{timeZone:kit.destinations.timezone});requireValue(present(kit.destinations.timezone),'Scheduling timezone required');} catch {launchBlockers.push('Valid scheduling timezone required');}
  requireValue(ref(kit.reporting.actualRef)&&kit.reporting.actualRef!==kit.reporting.sampleRef,'Actual reconciled reporting reference required, separate from the synthetic sample');
  requireValue(Number.isSafeInteger(kit.budget.mediaCents)&&kit.budget.mediaCents>0&&ref(kit.budget.approvalRef),'Explicit media budget and approval required; no inherited pricing');
  for(const c of kit.concepts) requireValue(ref(c.videoRef),`concepts.${c.id}: final video deliverable required`);
  // The audited revision cannot satisfy these checks by merely copying its scenario ID.
  if(kit.bindings.makeScenario.id==='6437227') requireValue(/remediation/i.test(kit.evidence.launch.persistentReceipt.evidenceRef)&&/remediation/i.test(kit.evidence.launch.leadCallOutcome.evidenceRef),'Make 6437227 lacks outboundVapi/save-before-ack guarantee: require explicit remediation receipts for this revision');
  attest('launch',LAUNCH_CHECKS,launchBlockers);
  return result();
}
