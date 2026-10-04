// Private, offline review only. No transport, provider action or ad feedback.
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const proof=v=>typeof v==='string'&&v.trim().length>0;
export function reviewConversation(record){
 const checks={identity:proof(record.lead_id),source:proof(record.source_receipt_ref),permission:record.contact_permission===true&&proof(record.consent_receipt_ref),two_way:record.two_way_prospect_contact===true&&proof(record.contact_evidence_ref),human:record.human_reviewed===true&&proof(record.reviewer_ref),criteria:record.firm_criteria_agreed===true&&record.human_confirmed_criteria_met===true&&proof(record.criteria_version),outcome:proof(record.private_outcome_ref)};
 const missing=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
 const qualified=missing.length===0;
 return {lead_id:record.lead_id??null,qualified_live_conversation:qualified,signed:qualified&&record.retainer_executed===true&&proof(record.retainer_evidence_ref)&&validDate(record.retainer_executed_date),missing,platform_export_allowed:false};
}
export function countConversations(records){
 // Conflicting snapshots are held, never silently choose an earlier positive row.
 const grouped=new Map();for(const record of records){if(!proof(record.lead_id))continue;const rows=grouped.get(record.lead_id)??[];rows.push(reviewConversation(record));grouped.set(record.lead_id,rows);}
 let qualified=0,signed=0;const held=[];
 for(const [id,rows] of grouped){if(rows.some(r=>JSON.stringify(r)!==JSON.stringify(rows[0]))){held.push(id);continue;}if(rows[0].qualified_live_conversation)qualified++;if(rows[0].signed)signed++;}
 return {qualified_live_conversations:qualified,signed,held_conflicting_lead_ids:held,platform_export_allowed:false};
}
