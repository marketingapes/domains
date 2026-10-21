// Proposed browser -> server contract only. Browser fields are untrusted, never authorization.
// Render must resolve approved campaign content and validate tenant/lead linkage before Vapi use.
export function createHandoff(config, {mode, submissionId, answers, contact, calls, sms}) {
 const source={open:'form',prequalify:'quiz',ai:'sofia'}[mode];
 return {
  schema:'btl.intake.web/v1',spec_version:'btl.sofia-context/proposed-v1',
  campaign_id:config.campaignId,tenant_id:config.identity.tenantId,domain_id:config.identity.domainId,
  brand_name:config.brandName,firm_name:config.firmName,tort_name:config.tortName,
  source:config.identity.source,source_path:source,
  page_id:config.pages.find(p=>p.studioMode===mode).pageId,
  submission_id:submissionId,lead_id:null,
  question_bank_version:config.screeningVersion,faq_version:config.faqVersion,
  prior_answers:answers.map(a=>({question_id:a.question_id,value:a.answer,source:a.source,confirmed_at:a.confirmed_at})),
  consent_record_id:null,consent_scope:{calls,sms},context_status:'untrusted_local_demo',
  request_type:source==='form'?'callback_request':source==='quiz'?'quiz_inquiry':'sofia_preview',
  contact:contact?{full_name:contact.name,phone_example:contact.phone,story:contact.story}:null,
  consent:{version:config.consent.version,method:'explicit_unchecked_channel_choice',calls:{granted:calls,text:config.consent.callsText},sms:{granted:sms,text:config.consent.smsText}},
  test:{synthetic:true,suppress:['outbound_calls','sms','email','buyer_delivery','ad_events']},
  dry_run:true,activation:false,transport:'none',receipt:null,human_review_required:true
 };
}
