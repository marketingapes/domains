// Deterministic Make/Render routing contract. No HTTP or provider calls.
export function planMakeEvent(event, { laFormIds = [], suppression = 'unverified' } = {}) {
  const stop = reason => ({accepted:false,reason,dispatch:'disabled',action:'human_review',provider_calls:0});
  if (!laFormIds.length) return stop('la_form_allowlist_unconfigured');
  if (!event || event.tenant !== 'BTL' || event.campaign_id !== 'btl-ca-abuse-la-county-v1' || event.program_id !== 'la-county-juvenile-detention') return stop('campaign_or_program_not_allowed');
  if (!laFormIds.includes(event.form_id)) return stop('form_not_allowlisted');
  if (!event.lead_id || !event.event_id || !event.submission_id) return stop('stable_identity_required');
  if (!event.consent_record_id || event.calls_consent !== true) return stop('consent_missing');
  if (suppression !== 'clear') return stop('suppressed_or_unverified');
  return {accepted:true,dispatch:'disabled',action:'persist_adapter_receipt_then_human_review',provider_calls:0,
    correlation:{tenant:event.tenant,campaign_id:event.campaign_id,lead_id:event.lead_id,event_id:event.event_id,submission_id:event.submission_id},
    sofia_context:'only after authenticated assistant/call/lead binding and fresh shared suppression',
    call_id:null,document_id:null,completion_receipt:null};
}
