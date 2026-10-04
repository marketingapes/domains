// Server-side only. Disabled by default; never use the synthetic review session.
// No routing, dispatch, replay, outbound contact or workbook mutation.
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const proof=v=>typeof v==='string'&&v.trim().length>0;
const date=v=>{if(v===null)return null;if(!proof(v)||!/^\d{4}-\d{2}-\d{2}T/.test(v)||!Number.isFinite(Date.parse(v)))fail(503,'Historical timestamp invalid.');return new Date(v).toISOString().slice(0,10);};
const campaigns=new Set(['mva','la','handoff','unassigned']);
export function validateHistory(batch){
 if(batch?.schema!=='phillips.private-history/v1'||batch.tenant_id!=='phillips'||batch.mode!=='OWNER_PRIVATE_SOURCE'||!proof(batch.source_snapshot_ref)||!proof(batch.observed_at)||!Array.isArray(batch.rows)||batch.rows.length>10000)fail(503,'Verified private history source required.');
 date(batch.observed_at);
 if(!['PARTIAL','COMPLETE_VERIFIED'].includes(batch.coverage?.status)||!Number.isInteger(batch.coverage.source_row_count)||batch.coverage.source_row_count<batch.rows.length||!proof(batch.coverage.scope)||!proof(batch.coverage.reconciliation_ref))fail(503,'History coverage proof required.');
 if(batch.coverage.status==='COMPLETE_VERIFIED'&&batch.coverage.source_row_count!==batch.rows.length)fail(503,'Complete coverage mismatch.');
 const keys=new Set();
 for(const r of batch.rows){if(!proof(r.private_record_id)||keys.has(r.private_record_id)||!campaigns.has(r.campaign)||!proof(r.source_row_ref))fail(503,'Ambiguous historical record.');keys.add(r.private_record_id);
  for(const [at,ref] of [['received_at','received_evidence_ref'],['sent_at','sent_evidence_ref']]){date(r[at]??null);if(r[at]&&!proof(r[ref]))fail(503,'Timestamp evidence required.');}
  if(r.sent_at&&!['API_DELIVERY','EMAIL_SEND','TRANSFER_COMPLETED','SOURCE_REPORTED_SENT'].includes(r.sent_kind))fail(503,'Sent semantics required.');
  if(r.signed_at){date(r.signed_at);if(r.retainer_executed!==true||!proof(r.executed_retainer_ref))fail(503,'Signed proof required.');}
  if(r.ad_preview&&(!['MATCHED','REPRESENTATIVE'].includes(r.ad_preview.kind)||!proof(r.ad_preview.asset_ref)||!proof(r.ad_preview.evidence_ref)))fail(503,'Ad preview provenance required.');
  if(r.ad_preview?.kind==='MATCHED'&&(!proof(r.ad_id)||!proof(r.ad_preview.ad_id)||r.ad_id!==r.ad_preview.ad_id))fail(503,'Ad match evidence required.');
 }
 return batch;
}
export function projectDeidentifiedHistory(batch){
 validateHistory(batch);
 // Static review: days only, no source IDs/URLs/contact fields or freeform statuses.
 const rows=batch.rows.map((r,i)=>({display_id:`HISTORY-${String(i+1).padStart(4,'0')}`,campaign:r.campaign,received_day:date(r.received_at??null),sent_day:date(r.sent_at??null),sent_kind:r.sent_at?r.sent_kind:null,firm_receipt_verified:r.firm_receipt_verified===true&&proof(r.firm_receipt_evidence_ref),signed_day:r.signed_at?date(r.signed_at):null,ad_preview_kind:r.ad_preview?.kind??'UNVERIFIED'}));
 return {mode:'DEIDENTIFIED_HISTORICAL_REVIEW',coverage:{status:batch.coverage.status,scope:'Phillips historical snapshot',source_row_count:batch.coverage.source_row_count,rows_in_view:rows.length,all_records_claim:batch.coverage.status==='COMPLETE_VERIFIED'},observed_day:date(batch.observed_at),counts:{received:rows.filter(r=>r.received_day).length,sent:rows.filter(r=>r.sent_day).length,verified_firm_receipts:rows.filter(r=>r.firm_receipt_verified).length,signed:rows.filter(r=>r.signed_day).length},rows,current_campaign_totals:false,outbound_enabled:false};
}
export function createOwnerHistoryReader({enabled=false,resolveOwner,readPrivateSnapshot,now=()=>new Date()}={}){
 async function authorize(context){if(!enabled)fail(503,'Private history disabled.');const a=await resolveOwner(context);if(!a||a.mode!=='VERIFIED_OWNER_SESSION'||a.tenant_id!=='phillips'||a.owner!==true||!proof(a.subject)||!Array.isArray(a.scopes)||!a.scopes.includes('phillips:history:read')||!Number.isFinite(Date.parse(a.expires_at))||Date.parse(a.expires_at)<=now().getTime())fail(401,'Verified owner history scope required.');return a;}
 return {async view(context){const a=await authorize(context);const batch=validateHistory(await readPrivateSnapshot());const fresh=await authorize(context);if(fresh.subject!==a.subject)fail(401,'Owner session changed.');return projectDeidentifiedHistory(batch);}};
}
