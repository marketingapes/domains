import { createHash } from 'node:crypto';
import { WORKBOOK, canonicalRow, verifyRow } from './sheet-contract.mjs';
export const SCHEMA = Object.freeze({
 CurrentState:['state_id','tenant_id','workstream_id','status','safe_summary','observed_at','source_updated_at','evidence_url','evidence_visibility','freshness_status','owner_id','next_action','blocker','budget_usd','duration_days','meta_website_usd','google_search_usd','item_version','content_hash'],
 Tasks:['task_id','tenant_id','state_id','title','assignee_id','status','priority','due_at','acceptance_criteria','evidence_url','approval_request_id','updated_at','item_version','content_hash'],
 ApprovalRequests:['request_id','tenant_id','task_id','action_type','exact_scope','proposed_change','risk','estimated_cost','currency','approver_id','status','created_at','expires_at','evidence_url','item_version','content_hash','target_item_id','target_item_version','target_content_hash'],
 ApprovalLog:['event_id','request_id','tenant_id','actor_id','decision','decided_at','approved_scope_hash','evidence_url','idempotency_key','item_version','content_hash','target_item_id','target_item_version','target_content_hash']
});
const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };
export function decodeTab(name, values) {
 const [headers,...cells] = values || [];
 if(JSON.stringify(headers)!==JSON.stringify(SCHEMA[name]))fail(503,'Workbook schema changed; mapping requires review.');
 const types={numeric:headers.filter(h=>/^(item_version|target_item_version|budget_usd|duration_days|meta_website_usd|google_search_usd|estimated_cost)$/.test(h)),dates:headers.filter(h=>/_at$/.test(h))};
 const seen=new Set();
 return cells.filter(c=>c.some(v=>v!=='' && v!=null)).map(c=>{
  if(c.length>headers.length)fail(503,'Unexpected source columns.');
  if(!verifyRow(headers,c,types))fail(503,'Workbook content hash invalid; projection held.');
  const normalized=JSON.parse(canonicalRow(headers,c,types));normalized.content_hash=c[headers.indexOf('content_hash')];
  const id=normalized[headers[0]];if(!id||seen.has(id)||!Number.isInteger(normalized.item_version)||normalized.item_version<1)fail(503,'Invalid or duplicate source item.');seen.add(id);return normalized;
 });
}
function safeText(value){
 // This PII-free operating source is not a raw lead adapter. Withhold suspicious text;
 // owner-controlled safe summaries still require a reviewed publication scope.
 if(typeof value!=='string'||/https?:\/\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?\d[\s().-]*){10,}/i.test(value))return 'Summary withheld pending review.';
 return value;
}
function verifyActor(a,now){
 if(!a||a.serverVerified!==true||a.access!=='OWNER_READ_ONLY'||a.tenantId!=='phillips'||!a.subject||!Array.isArray(a.stateIds)||!Array.isArray(a.taskIds)||!Number.isFinite(Date.parse(a.expiresAt))||Date.parse(a.expiresAt)<=now.getTime())fail(401,'Verified owner read-only scope required.');
}
// readRange must be injected by an already-authorized server connector. No token/grant,
// browser credential, direct public Sheets URL, Sheets writer or decision method exists here.
export function createReadOnlySheetAdapter({enabled=false,readRange,resolveActor,now=()=>new Date()}={}){
 return {read:async context=>{
  if(!enabled)fail(503,'Read-only adapter disabled.');
  const a=await resolveActor(context);verifyActor(a,now());
  const names=Object.keys(SCHEMA);
  const responses=await Promise.all(names.map(async sheet_name=>{
   const r=await readRange({spreadsheet_id:WORKBOOK.spreadsheetId,sheet_name,range:'A1:Z501',value_render_option:'UNFORMATTED_VALUE'});
   if(r?.isError)fail(503,'Authorized workbook read failed.');
   return decodeTab(sheet_name,(r?.structuredContent||r).values);
  }));
  const fresh=await resolveActor(context);verifyActor(fresh,now());
  if(fresh.subject!==a.subject||fresh.tenantId!==a.tenantId||JSON.stringify(fresh.stateIds)!==JSON.stringify(a.stateIds)||JSON.stringify(fresh.taskIds)!==JSON.stringify(a.taskIds))fail(401,'Read scope changed.');
  const tabs=Object.fromEntries(names.map((n,i)=>[n,responses[i]]));
  for(const request of tabs.ApprovalRequests){
   const target=tabs.Tasks.find(t=>t.task_id===request.target_item_id&&t.tenant_id===request.tenant_id);
   if(!target||request.task_id!==target.task_id||request.target_item_version!==target.item_version||request.target_content_hash!==target.content_hash)fail(503,'Request target binding is stale; projection held.');
  }
  const states=tabs.CurrentState.filter(s=>s.tenant_id===a.tenantId&&a.stateIds.includes(s.state_id));
  const tasks=tabs.Tasks.filter(t=>t.tenant_id===a.tenantId&&a.taskIds.includes(t.task_id)&&t.assignee_id===a.subject);
  const taskIds=new Set(tasks.map(t=>t.task_id));
  const requests=tabs.ApprovalRequests.filter(r=>r.tenant_id===a.tenantId&&taskIds.has(r.task_id)&&r.approver_id===a.subject);
  const plan=states.find(s=>s.workstream_id==='campaign'&&s.status==='planned_not_live');
  const revision=createHash('sha256').update(JSON.stringify(names.map(n=>tabs[n].map(r=>[r[SCHEMA[n][0]],r.item_version,r.content_hash])))).digest('hex');
  return {mode:'PRIVATE_READ_ONLY_SHEET',read_at:now().toISOString(),sheet_revision:revision,
   decisions_enabled:false,execution_authorized:false,
   plan:plan?{total_usd:plan.budget_usd,duration_days:plan.duration_days,meta_website_usd:plan.meta_website_usd,google_search_usd:plan.google_search_usd,status:plan.status,source_updated_at:plan.source_updated_at||null}:null,
   current_state:states.map(s=>({state_id:s.state_id,workstream_id:s.workstream_id,status:s.status,
    safe_summary:['campaign_assets','lead_intake','engine'].includes(s.workstream_id)?'Build prepared for review. No release is verified.':safeText(s.safe_summary),
    observed_at:s.observed_at,source_updated_at:s.source_updated_at||null,freshness_status:s.freshness_status,item_version:s.item_version,content_hash:s.content_hash})),
   tasks:tasks.map(t=>({task_id:t.task_id,title:safeText(t.title),status:t.status,priority:t.priority,due_at:t.due_at||null,acceptance_criteria:safeText(t.acceptance_criteria),item_version:t.item_version,content_hash:t.content_hash})),
   approval_requests:requests.map(r=>({request_id:r.request_id,task_id:r.task_id,status:r.status,action_type:r.action_type,
    exact_scope:safeText(r.exact_scope),proposed_change:safeText(r.proposed_change),risk:safeText(r.risk),estimated_cost:r.estimated_cost,currency:r.currency,expires_at:r.expires_at||null,
    target_item_version:r.target_item_version,target_content_hash:r.target_content_hash,decisions_enabled:false})),
   // ApprovalLog cells are not authoritative decisions; durable actor-authenticated audit is pending.
   review_history:[],review_history_status:'not_connected'};
 }};
}
