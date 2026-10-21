import {createHandoff} from './handoff-contract.mjs';
// Consumer demonstration UI inside the existing page template. Memory only, no transport.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
export const emptyExperience = () => ({headline:'',intro:'',imageRef:'',imageAlt:'',faqVersion:'',nextSteps:[],faqs:[]});
export const experienceCSS = `input{width:100%;font:inherit;padding:12px;border:1px solid #bac9d7;border-radius:8px}input[type=checkbox]{width:22px;height:22px;vertical-align:middle;margin-right:10px}fieldset{border:0;padding:0;margin:0;min-width:0}legend{font-weight:700}nav{display:flex;flex-wrap:wrap;gap:8px}nav button{margin:0}button[aria-pressed=true]{outline:3px solid #bd7a16;outline-offset:2px}button:disabled{opacity:.65;cursor:default}input,select,textarea,button,summary{scroll-margin-top:20px}a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:3px solid #a46b13;outline-offset:3px}.hero-media{margin:22px 0}.hero-media img{display:block;width:100%;height:auto;max-height:300px;object-fit:cover;border-radius:12px}.brand-logo{width:42px;height:42px;vertical-align:middle;margin-right:10px}.hero-media figcaption{font-size:13px}.requirements{border-left:4px solid #bd7a16;padding:12px;background:#fff2d0}summary{cursor:pointer;font-weight:650;padding:12px 0;min-height:44px}details{border-bottom:1px solid #dce3eb}h1,p,h2,h3,pre{overflow-wrap:anywhere}pre{white-space:pre-wrap;font-size:13px}button{background:#183149}nav button{font-size:14px;padding:12px}#handoff{border-top:1px solid #dce3eb;margin-top:20px}[hidden]{display:none!important}.skip{position:absolute;left:-999px}.skip:focus{left:16px;top:10px;background:white;padding:10px;z-index:2}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}`;
export function experienceMarkup(c, mode, assets = {}, topicName=c.topic) {
 const e=c.experience||emptyExperience();
 const questions=[...c.screening.qualifies.map((text,i)=>({id:`qualifies-${i}`,text})),...c.screening.disqualifies.map((text,i)=>({id:`disqualifies-${i}`,text}))];
 const faq=e.faqs.filter(f=>f.approvalRef.trim());
 const fallback='This question is outside the approved information. A human intake reviewer must answer it. No request has been sent.';
 const logo=assets.logo?`<img class="brand-logo" src="${esc(assets.logo)}" width="42" height="42" alt="${esc(c.firm.name||'Configured firm')} logo">`:'<span class="muted"> · Firm logo assembly required</span>';
 const media=assets.image?`<figure class="hero-media"><img src="${esc(assets.image)}" ${assets.small?`srcset="${esc(assets.small)} 900w, ${esc(assets.image)} 1600w" sizes="(max-width:750px) 100vw, 1050px"`:''} width="1600" height="1066" alt="${esc(e.imageAlt)}" decoding="async" fetchpriority="high"><figcaption>Campaign illustration · no client or outcome endorsement. ${esc(assets.credit||'')}</figcaption></figure>`:`<p class="requirements">Image configuration required: select an owned, approved image for ${esc(c.topic)} and provide descriptive alt text. No client or victim image is assumed.</p>`;
 const qhtml=questions.map(q=>`<label for="${q.id}">${esc(q.text)}</label><select id="${q.id}" data-answer="${q.id}" required><option value="">Choose an answer</option><option>Yes</option><option>No</option><option>Not sure</option></select>`).join('');
 const action=`<nav aria-label="Choose an intake path">${[['open','Form / callback'],['prequalify','Quiz first'],['ai','Sofia first']].map(([v,label])=>`<button type="button" data-mode="${v}" aria-pressed="${v===mode}">${label}</button>`).join('')}</nav>
 <p class="notice"><strong>Demonstration · synthetic details only.</strong> Sofia is an AI assistant preview. No AI service is connected. No voice service is connected. This page does not send contact details, request a real callback or place a call.</p>
 <h2 id="path-heading"></h2><section id="voice-preview" hidden><h3>Sofia voice demonstration</h3><p>No microphone or voice service is connected. Preview a scripted prompt from this campaign’s question set.</p><div class="chat" id="voice-prompt" role="status">Choose “Preview Sofia prompt” to begin.</div><button id="voice-next" type="button">Preview Sofia prompt</button></section><form id="intake-demo"><fieldset id="screening"><legend>Campaign screening · human review required</legend>${qhtml||'<p class="requirements">Screening configuration required. Add questions reviewed for this tort and firm before intake can be prepared.</p>'}</fieldset>
 <div id="contact"><label for="contact-name">Fictional name</label><input id="contact-name" autocomplete="off" maxlength="100" required><label for="contact-phone">Fictional callback number</label><input id="contact-phone" type="tel" inputmode="tel" autocomplete="off" maxlength="30" required pattern="[+0-9() .-]{7,30}" aria-describedby="phone-help"><p id="phone-help" class="muted">Use a synthetic number such as 202-555-0100.</p><label for="story">Example account (optional)</label><textarea id="story" maxlength="1000" placeholder="Fictional sample details only"></textarea>
 <fieldset><legend>Contact choices · not a live authorization</legend><label><input id="calls-consent" type="checkbox" required ${!c.consent.callsText||!c.consent.version?'disabled':''}>${esc(c.consent.callsText||'Calls consent configuration required; handoff unavailable.')}</label><label><input id="sms-consent" type="checkbox" ${!c.consent.smsText||!c.consent.version?'disabled':''}>${esc(c.consent.smsText||'SMS is unavailable; no approved text configured.')}</label><p class="muted">Consent version: ${esc(c.consent.version||'Not configured')}. Neither choice is preselected.</p></fieldset></div>
 <button id="demo-action" type="submit"></button><button type="button" id="clear-demo">Clear demo answers</button><p id="demo-status" role="status" tabindex="-1"></p></form>
 <section id="handoff" hidden aria-labelledby="handoff-heading"><h3 id="handoff-heading">Local handoff preview</h3><p>No backend is bound. Nothing was submitted or saved to a firm. The payload below is synthetic, stays in memory and requires human review.</p><div id="answer-summary"></div><details><summary>Inspect proposed payload · local review only</summary><pre id="payload"></pre></details><button type="button" id="continue-sofia">Continue with Sofia preview</button></section>`;
 const sidebar=`<section class="card"><h2>Next steps</h2>${e.nextSteps.length?`<ol>${e.nextSteps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:'<p class="requirements">Campaign next steps require firm configuration.</p>'}<p>Live handoff requires a durable saved lead receipt, verified routing and a human review destination.</p></section><section class="card"><h2>Approved information</h2>${faq.map((f,i)=>`<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p><p class="muted">Supplied review reference (unverified here): ${esc(f.approvalRef)}</p></details>`).join('')||'<p>No approved answers are configured for this campaign.</p>'}<label for="faq-choice">Choose a question</label><select id="faq-choice"><option value="">Select approved information</option>${faq.map((f,i)=>`<option value="${i}">${esc(f.question)}</option>`).join('')}<option value="human">My question is not listed</option></select><p id="faq-answer" role="status">${fallback}</p><p class="muted">Approved information only. No open-ended legal advice or eligibility decision.</p></section>`;
 return {action,media,logo,sidebar,script:`(${runDemo.toString()})(${json({mode,questions,faq,fallback,campaignId:c.campaignId,topic:c.topic,identity:c.identity,brandName:'Best Tort Lawyers',firmName:c.firm.name,tortName:topicName,faqVersion:e.faqVersion,screeningVersion:c.screening.version,consent:c.consent,pages:c.pages})},${createHandoff.toString()});`};
}
function runDemo(config, createHandoff) {
 const $=id=>document.getElementById(id), form=$('intake-demo');
 let mode=config.mode, submissionId=null, fingerprint=null, promptIndex=0;
 const confirmations=new Map();
 const headings={open:'Tell us what happened',prequalify:'Prequalification',ai:'AI-assisted intake'};
 const labels={open:'Prepare callback handoff preview',prequalify:'Review answers for Sofia',ai:'Prepare Sofia handoff preview'};
 const status=text=>{$('demo-status').textContent=text;$('demo-status').focus();};
 const answers=()=>config.questions.map(q=>({question_id:q.id,question:q.text,answer:$(q.id).value,...(confirmations.get(q.id)||{source:null,confirmed_at:null})}));
 function switchMode(next) {
  document.querySelector('.eyebrow').textContent=config.tortName+' · '+headings[next];document.title=config.tortName+' · '+headings[next]+' · '+config.firmName;
  mode=next;$('voice-preview').hidden=mode!=='ai';$('path-heading').textContent=headings[mode];$('demo-action').textContent=labels[mode];
  $('contact').hidden=mode==='prequalify';
  for(const input of $('contact').querySelectorAll('input,textarea'))input.disabled=mode==='prequalify'||(input.id==='calls-consent'&&(!config.consent.callsText||!config.consent.version))||(input.id==='sms-consent'&&(!config.consent.smsText||!config.consent.version));
  for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
  $('continue-sofia').hidden=mode==='ai';
  $('handoff').hidden=true;
  $('demo-status').textContent=mode==='ai'?'Sofia voice is unavailable here. This scripted demonstration retains answers from the form and quiz; no microphone is accessed.':'';
 }
 for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>switchMode(b.dataset.mode));
 function invalidate(){fingerprint=null;submissionId=null;$('handoff').hidden=true;$('demo-status').textContent='Answers changed. Review the updated handoff before continuing.';}
 form.addEventListener('input',event=>{if(event.target.dataset.answer)confirmations.set(event.target.id,{source:{open:'form',prequalify:'quiz',ai:'sofia'}[mode],confirmed_at:new Date().toISOString()});invalidate();});
 form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!config.questions.length)return status('Screening configuration required. No handoff was prepared.');
  if(mode!=='prequalify'&&(!config.consent.version||!config.consent.callsText))return status('Approved calls consent is missing. No handoff was prepared.');
  if(!form.reportValidity())return;
  const selected=answers();
  const contact=mode==='prequalify'?null:{name:$('contact-name').value.trim(),phone:$('contact-phone').value.trim(),story:$('story').value.trim()};
  if(contact&&(!contact.name||contact.phone.replace(/\D/g,'').length<7))return status('Enter a fictional name and valid synthetic callback number.');
  const content=JSON.stringify({selected,contact,calls:!$('calls-consent').disabled&&$('calls-consent').checked,sms:!$('sms-consent').disabled&&$('sms-consent').checked,mode});
  if(fingerprint===content)return status('This unchanged preview is already prepared. Nothing was sent; the same submission ID is retained.');
  fingerprint=content;
  submissionId=globalThis.crypto?.randomUUID?.()||'demo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const payload=createHandoff(config,{mode,submissionId,answers:selected,contact,calls:!$('calls-consent').disabled&&$('calls-consent').checked,sms:!$('sms-consent').disabled&&$('sms-consent').checked});
  $('answer-summary').replaceChildren();
  for(const answer of selected){const p=document.createElement('p');p.textContent=config.questions.find(q=>q.id===answer.question_id).text+': '+answer.answer;$('answer-summary').append(p);}
  $('payload').textContent=JSON.stringify(payload,null,2);$('handoff').hidden=false;
  status(mode==='ai'?'Scripted Sofia preview: the human reviewer would receive these answers. Voice is unconnected; no call was placed.':'Local preview prepared. No callback requested, no lead saved and no eligibility decision made.');
 });
 $('voice-next').addEventListener('click',()=>{const q=config.questions[promptIndex++%config.questions.length];$('voice-prompt').textContent=q?'Sofia scripted prompt: '+q.text:'Campaign questions are not configured. A human reviewer must supply them.';});
 $('continue-sofia').addEventListener('click',()=>{switchMode('ai');$('path-heading').tabIndex=-1;$('path-heading').focus();});
 $('clear-demo').addEventListener('click',()=>{form.reset();confirmations.clear();$('answer-summary').replaceChildren();promptIndex=0;$('voice-prompt').textContent='Choose “Preview Sofia prompt” to begin.';invalidate();$('payload').textContent='';status('Demo answers cleared from this page.');});
 $('faq-choice').addEventListener('change',()=>{$('faq-answer').textContent=config.faq[$('faq-choice').value]?.answer||config.fallback;});
 switchMode(mode);
}
