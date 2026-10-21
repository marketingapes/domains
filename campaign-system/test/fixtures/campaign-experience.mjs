import {createMassTortKit} from '../../mass-tort.mjs';
import {emptyExperience} from '../../campaign-experience.mjs';
// Operational QA copy only. No approved legal criteria, testimonials or caller histories.
export function experienceFixture(topic='paraquat') {
 const k=createMassTortKit({topic,start:'2026-11-01',campaignId:`synthetic-${topic}-experience`});
 Object.assign(k.identity,{tenantId:'fixture-btl',domainId:'fixture-domain'});
 Object.assign(k.firm,{id:'btl',name:'Best Tort Lawyers · synthetic review',logoRef:'btl/assets/btl-seal.svg',color:'#153b51'});
 k.screening={topic,version:`synthetic-${topic}-questions-v1`,qualifies:[`Synthetic ${topic} question: would you like a human intake review?`],disqualifies:[`Synthetic ${topic} question: is any information still uncertain?`],humanReviewRequired:true};
 k.consent={version:'synthetic-consent-v1',method:'explicit_unchecked_channel_choice',callsText:'Synthetic example only: I choose a callback preview. No call will be placed.',smsText:'Synthetic example only: I choose the optional SMS preview. No message will be sent.'};
 k.geography={included:['Synthetic review area · no accepted jurisdiction implied'],excluded:[]};
 k.experience={...emptyExperience(),headline:topic==='paraquat'?'Paraquat questions. A human next step.':`${topic} questions. A human next step.`,intro:'Explore the form, quiz or Sofia demonstration with fictional details. Each path uses the same campaign information and preserves your answers while this page stays open.',imageRef:topic==='paraquat'?'btl/assets/paraquat-field-usda-nrcs.jpg':'',imageAlt:topic==='paraquat'?'Rows of soybean plants across an agricultural landscape.':'',faqVersion:'synthetic-operational-faq-v1',nextSteps:['Review the campaign questions using fictional answers.','Preview the shared handoff to a human reviewer.','Live service requires verified intake and voice connections.'],faqs:[{question:'Can this demonstration request a callback?',answer:'No. It prepares a local preview only. No callback, SMS or firm submission is sent.',approvalRef:'synthetic-qa/operational-copy-v1'},{question:'Does answering the quiz decide eligibility?',answer:'No. Only a human reviewer can assess a real inquiry. This demonstration makes no legal eligibility decision.',approvalRef:'synthetic-qa/operational-copy-v1'}]};
 return k;
}
