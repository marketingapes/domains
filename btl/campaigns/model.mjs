import {brands,topics,VERSION,intakeModes} from './catalog.mjs';
function date(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Choose a valid date.');const d=new Date(s+'T00:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==s)throw Error('Choose a valid date.');return d;}
function text(s,max=100){return String(s??'').trim().slice(0,max);}
export function createPlan(input={}){
 const topic=topics.find(x=>x.id===input.topic),brand=brands.find(x=>x.id===input.brand);
 if(!topic||!brand)throw Error('Choose a listed brand and campaign.');
 const start=date(input.start),radius=Number(input.radius??50);
 if(!Number.isFinite(radius)||radius<1||radius>500)throw Error('Radius must be between 1 and 500 miles.');
 const tier=input.tier|| (topic.id==='mva'?'major':'standard');
 if(!['major','standard'].includes(tier))throw Error('Choose a listed media tier.');
 const requestedClass=input.campaignClass || (topic.id==='mva'?'mva':topic.id==='personal-injury'?'personal_injury':tier==='major'?'major_mass_tort':'standard');
 if(!['mva','personal_injury','major_mass_tort','standard'].includes(requestedClass))throw Error('Choose a campaign category.');
 const campaignClass=topic.id==='mva'?'mva':topic.id==='personal-injury'?'personal_injury':requestedClass;
 const mediaCents=campaignClass==='standard'?500000:1000000;
 const lines=value=>text(value,2500).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const criteria={qualifies:lines(input.qualifies),disqualifies:lines(input.disqualifies),verified:false};
 const base=Math.floor(mediaCents/14),extra=mediaCents%14;
 const schedule=Array.from({length:14},(_,i)=>({day:i+1,date:new Date(+start+i*86400000).toISOString().slice(0,10),budgetCents:base+(i<extra?1:0),task:i===0?'Verify delivery and record the baseline':i===6?'Review first-week spend and returned outcomes':i===13?'Close sprint and document the next test':'Review pacing, routing and returned outcomes',status:'planned'}));
 return {schemaVersion:2,catalogVersion:VERSION,id:[brand.id,topic.id,input.start].join('-'),status:'draft',live:false,brand:brand.id,topic:topic.id,title:topic.name,firm:text(input.firm),start:input.start,end:schedule[13].date,geo:{location:text(input.location),radiusMiles:topic.id==='mva'?radius:null,excluded:text(input.excludedGeo,500),verified:false},criteria,pages:intakeModes.map(x=>({...x,status:"preview",live:false})),campaignClass,mediaCents,tier:mediaCents===1000000?"major":"standard",managementMonthlyCents:250000,pricingStatus:'catalog_estimate_existing_terms_apply',variant:input.variant==='educational'?'educational':'direct',schedule,launchRequirements:['Confirm client agreement, scope and payment allocation','Confirm firm identity, geography, eligibility and disclosures','Approve copy and channel suitability','Verify inquiry destination and consent-aware follow-up','Test a complete inquiry through buyer receipt','Confirm measurement and budget authorization'],research:topic.source,qualificationReview:topic.review};
}
export function pacing(plan,asOf,actualCents){
 const d=date(asOf);if(!Number.isSafeInteger(actualCents)||actualCents<0)throw Error('Actual spend must be a nonnegative amount.');
 const elapsedDays=Math.max(0,Math.min(14,Math.floor((+d-+date(plan.start))/86400000)+1));
 const targetCents=plan.schedule.slice(0,elapsedDays).reduce((s,r)=>s+r.budgetCents,0),remainingCents=Math.max(0,plan.mediaCents-actualCents);
 return {source:'manual_input',elapsedDays,targetCents,actualCents,remainingCents,varianceCents:actualCents-targetCents,overspendCents:Math.max(0,actualCents-plan.mediaCents),remainingDays:14-elapsedDays};
}
