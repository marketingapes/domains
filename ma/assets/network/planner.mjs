export const INDUSTRIES = { services:'Service business', legal:'Law firm / legal services', agency:'Agency / marketing team', other:'Another business' };
export const STAGES = { manual:'Mostly manual', mixed:'A few tools, disconnected', connected:'Connected systems to improve' };
const plans = {
 response: {
  title:'Sofia + lead response',
  summary:'Build a clear path from a new inquiry to a useful conversation and a human handoff.',
  firstStep:'Choose one lead source and map who responds, what they need to know, and where a qualified inquiry goes.',
  weeks:['Map your inquiry sources, response process, permission requirements, and handoff owner.','Configure Sofia for a bounded conversation and connect capture to your existing contact record.','Test real-world scenarios: no answer, repeat inquiry, wrong fit, opt-out, and human escalation.','Launch on one approved channel. Review response, handoff, and appointment outcomes before expanding.'],
  metrics:['Time to first response','Qualified conversations reaching the right person','Attended appointments / agreed next steps'],
  scope:['Website + conversion page','Sofia conversation + human handoff','Follow-up + outcome reporting']
 },
 campaigns: {
  title:'Website + paid marketing plan',
  summary:'Connect your ads, landing page, lead response, and reporting around one specific offer.',
  firstStep:'Choose one audience, one offer, one approved budget, and one outcome that makes the campaign worthwhile.',
  weeks:['Confirm the offer, audience, assets, ad-account access, budget, and conversion destination.','Build the campaign landing page, campaign creative, capture, and follow-up path.','Verify test leads reach the right place and conversion reporting measures the agreed outcome.','Launch the approved campaign. Review lead quality and cost per outcome; change one variable at a time.'],
  metrics:['Cost per qualified inquiry','Inquiry-to-appointment conversion','Cost per attended appointment / agreed outcome'],
  scope:['Ads + campaign creative','Domain landing page + capture','Sofia / follow-up + attribution']
 },
 operations: {
  title:'AI integration + automation plan',
  summary:'Turn a repetitive process into a connected system with clear owners and visible exceptions.',
  firstStep:'Choose one repetitive workflow and document its trigger, inputs, required decisions, and finished result.',
  weeks:['Map the current process, record time spent, and identify the systems and people involved.','Connect the smallest useful workflow with permissions and a clear human approval point.','Test missing data, duplicate requests, failures, and recovery before real use.','Launch with a named owner. Measure time saved and errors; expand only after the first process is reliable.'],
  metrics:['Time spent per completed task','Tasks completed without manual rework','Exceptions resolved by the assigned owner'],
  scope:['AI integration + workflow','Connected tools + human approvals','Monitoring + ongoing iteration']
 }
};
export function buildPlan({goal,industry,stage}) {
 if(!plans[goal]||!INDUSTRIES[industry]||!STAGES[stage]) throw new Error('Choose a business type, priority, and starting point.');
 const p=plans[goal];
 return {...p,industry:INDUSTRIES[industry],stage:STAGES[stage],weeks:[...p.weeks],metrics:[...p.metrics],scope:[...p.scope],firstStep:stage==='connected'?'Audit your existing workflow and its outcomes before replacing any working part. '+p.firstStep:p.firstStep};
}
export function exportPlan(p) {
 return ['Marketing Apes','Your AI marketing agency.','',p.title,p.industry+' | '+p.stage,'',p.summary,'','START HERE',p.firstStep,'','YOUR FIRST 30 DAYS',...p.weeks.map((s,i)=>'Week '+(i+1)+': '+s),'','MEASURE',...p.metrics.map(s=>'- '+s),'','SCOPE TO DISCUSS',...p.scope.map(s=>'- '+s),'','A guided starter plan, not a quote or guarantee. Scope, access, ad spend, usage, and timeline are agreed before work begins.','Discuss this plan: kyleg@marketingapes.com | 619-736-0356','https://marketingapes.com'].join('\n');
}
