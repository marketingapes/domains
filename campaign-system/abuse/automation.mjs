import { createHash } from 'node:crypto';
import { loadTemplates } from './machine.mjs';
const sha = x => createHash('sha256').update(x).digest('hex');
export function classifyReply(text) {
  const word=String(text||'').trim().toUpperCase();
  if (['STOP','STOPALL','UNSUBSCRIBE','CANCEL','END','QUIT'].includes(word)) return {action:'suppress_shared_registry_before_ack',send:false};
  if(word==='START')return{action:'human_review_of_explicit_resubscribe_do_not_clear_suppression',send:false};
  if(word==='HELP')return{action:'draft_help_reply_matching_consent_and_suppression',send:false};
  return{action:'human_review',send:false};
}

/** Consumes the existing authenticated call-bound context, never a raw quiz/client object. */
export async function loadSofiaInstructions({ adapter, binding }) {
  const context = await adapter.context(binding); // existing authenticated call↔lead boundary
  const bank = adapter.campaign.question_bank;
  if (context.question_bank.id !== bank.id || context.question_bank.version !== bank.version) throw Error('question_bank_version_mismatch');
  return sofiaInstructions({ ...context, call_id:binding.call_id, question_bank:bank });
}
export function sofiaInstructions(context) {
  const stop = reason => ({ allowed:false, dispatch:'disabled', reason, action:'stop_and_request_human', recording:'off' });
  if (!context || context.schema !== 'btl.abuse.sofia-context/v1' || context.suppression !== 'clear') return stop('context_or_suppression_unverified');
  if (context.dispatch !== 'disabled' || context.eligibility !== 'not_assessed' || context.human_review !== 'required' || !context.consent?.calls) return stop('context_contract_invalid');
  if (!context.call_id || !context.lead_id || !context.consent?.consent_record_id) return stop('bound_identity_or_consent_missing');
  const questions = context.question_bank?.questions || [];
  const answered = new Map((context.prior_answers || []).map(a => [a.question_id,a]));
  if (!questions.length || [...answered.keys()].some(id => !questions.some(q => q.question_id === id))) return stop('question_provenance_invalid');
  return { allowed:true, dispatch:'disabled', lead_id:context.lead_id, call_id:context.call_id,
    recording:'off_until_separate_recording_consent_and_provider_receipt', criteria_status:context.criteria_status,
    opening:'I’m Sofia, an AI intake assistant for Phillips Law Group, a law firm. A person reviews every request. You can stop or ask for a person at any time.',
    confirm:[...answered.values()].map(a => ({question_id:a.question_id,answer_id:a.answer_id,source:a.source,confirmed_at:a.confirmed_at})),
    ask:questions.filter(q => !answered.has(q.question_id)), human_review:'required', eligibility:'not_assessed',
    never:['ask for narrative or medical details','make a legal eligibility decision','claim an answered transfer without a receipt','start recording from a generic calls checkbox'],
  };
}

/** Outbox preparation ONLY. No network/sender dependency exists in this module. */
export function createDraftOutbox({ store, contextForLead, suppressionForLead, now = () => new Date(), templates = loadTemplates() }) {
  return { async prepare({ lead_id, template_id, event_id, values = {} }) {
    const template = templates.templates.find(t => t.template_id === template_id);
    if (!template || !/^EV-[a-zA-Z0-9-]{8,100}$/.test(event_id || '')) throw Error('message_template_or_event_invalid');
    const context = await contextForLead(lead_id);
    if (!context || context.lead_id !== lead_id || !context.events?.some(e => e.event_id === event_id && e.type === template.trigger)) throw Error('message_trigger_unverified');
    const suppression = await suppressionForLead(lead_id);
    if (suppression !== 'clear') return { prepared:false, reason:'suppressed_or_unverified', send:false };
    if (template.requires_consent === 'sms' && context.consent?.sms !== true) return { prepared:false, reason:'sms_consent_missing', send:false };
    if (template.channel === 'email' && context.consent?.email !== true) return { prepared:false, reason:'email_consent_missing', send:false };
    if (template.template_id === 'sms-opt-out-confirmation') return { prepared:false, reason:'transactional_opt_out_exception_not_approved', send:false };
    if (template.channel === 'sms') {
      if (!context.timezone) return { prepared:false,reason:'timezone_unverified',send:false };
      let hour; try { hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:context.timezone,hour:'numeric',hourCycle:'h23'}).format(now())); } catch { return {prepared:false,reason:'timezone_unverified',send:false}; }
      if (hour < 8 || hour >= 20) return { prepared:false,reason:'quiet_hours_defer',send:false };
    }
    const key = `draft-outbox:${sha(JSON.stringify([context.tenant,context.campaign_id,lead_id,template_id,event_id]))}`;
    const allowed = { first_name:'Friend', lead_id, reason:'Review required', unsubscribe_link:'[UNCONNECTED private opt-out link]' };
    // No claimant-supplied text is interpolated. Sensitive values cannot leak into previews.
    const render = s => (s || '').replace(/\{\{([a-z_]+)\}\}/g, (_,key) => allowed[key] || '[PENDING]');
    const draft = { schema:'btl.draft-message/v1', key, lead_id, campaign_id:context.campaign_id, event_id, template_id,
      subject:render(template.subject),body:render(template.body), channel:template.channel, send:false,
      prepared_at:now().toISOString(),fixture:context.simulated === true, status:'draft_not_sendable', attempts:0,
      retry_policy:{max_retries:2,minutes:[10,60],same_provider_idempotency_key:true,on_unknown_delivery:'reconcile_before_retry'}, failure_owner:'intake-operations' };
    const created = await store.setNx(key,draft);
    return { prepared:true, duplicate:!created, draft:await store.get(key), send:false };
  }};
}
