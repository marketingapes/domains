export const stages = ['Ad', 'Page', 'Intake', 'Consent', 'Handoff', 'Report'];
const routeNames = {form: 'Traditional form', call: 'Call-first', ai: 'Sofia AI intake'};
const eventNames = {ad_view:'Ad concept viewed',page_view:'Landing concept viewed',intake_start:'Intake example started',intake_complete:'Prequalification information captured',consent_granted:'Connection permission demonstrated',consent_declined:'Connection permission declined',transfer_attempt:'Synthetic transfer attempted',transfer_accepted:'Synthetic intake acknowledgement',transfer_unavailable:'Synthetic intake unavailable',fallback_queued:'Synthetic follow-up assigned',handoff_stopped:'Handoff stopped'};
export function createState(identity='branded',route='form') {
  return {identity,route,stage:0,consent:false,unavailable:false,outcome:null,answers:null,events:['ad_view']};
}
export function transition(state,action,answers=null) {
  const s={...state,events:[...state.events]};
  const move=(stage,event)=>{s.stage=stage;s.events.push(event);};
  if(action==='page'&&s.stage===0) move(1,'page_view');
  else if(action==='intake'&&s.stage===1) move(2,'intake_start');
  else if(action==='capture'&&s.stage===2&&answers) {
    const allowed={jurisdiction:['Arizona','Other state'],timing:['Within the last 30 days','More than 30 days ago'],injury:['Injury reported','Injury unclear'],representation:['No current attorney reported','Current attorney reported']};
    if(!Object.entries(allowed).every(([key,values])=>values.includes(answers[key]))) return state;
    s.answers=Object.fromEntries(Object.keys(allowed).map(key=>[key,answers[key]]));move(3,'intake_complete');
  } else if(action==='agree'&&s.stage===3) s.consent=!s.consent;
  else if(action==='connect'&&s.stage===3&&s.consent) {move(4,'consent_granted');s.events.push('transfer_attempt');}
  else if(action==='decline'&&s.stage===3) {s.consent=false;s.outcome='Permission declined';move(5,'consent_declined');}
  else if(action==='accepted'&&s.stage===4&&!s.unavailable) {s.outcome='Intake acknowledged — synthetic';move(5,'transfer_accepted');}
  else if(action==='unavailable'&&s.stage===4&&!s.unavailable) {s.unavailable=true;s.events.push('transfer_unavailable');}
  else if(action==='fallback'&&s.stage===4&&s.unavailable) {s.outcome='Follow-up assigned — synthetic';move(5,'fallback_queued');}
  else if(action==='stop'&&s.stage===4&&s.unavailable) {s.outcome='Handoff stopped';move(5,'handoff_stopped');}
  else return state;
  return s;
}

if(typeof document!=='undefined') {
  let state=createState();
  const screen=document.querySelector('#screen');
  const identityName=()=>state.identity==='branded'?'Phillips Law Group / concept':'MVA Help / unbranded concept';
  const action=(id,label,secondary=false,disabled=false)=>`<button class="button ${secondary?'secondary':'primary'}" type="button" data-action="${id}" ${disabled?'disabled':''}>${label}</button>`;
  const frame=(label,title,body)=>`<p class="eyebrow">${label}</p><h3 tabindex="-1" id="screen-title">${title}</h3>${body}`;
  const packet=()=>`<dl class="packet"><div><dt>Example identity</dt><dd>${identityName()}</dd></div><div><dt>Route + source</dt><dd>${routeNames[state.route]} / Demo MVA ad 01</dd></div>${Object.entries(state.answers||{}).map(([key,value])=>`<div><dt>${{jurisdiction:'Reported state',timing:'Incident timing',injury:'Injury context',representation:'Representation'}[key]}</dt><dd>${value}</dd></div>`).join('')}<div><dt>Connection permission</dt><dd>${state.consent?'Granted in synthetic example':'Not granted'}</dd></div><div><dt>Legal eligibility / case acceptance</dt><dd>Firm review required</dd></div></dl>`;
  function render(focus=false) {
    document.querySelector('#route-label').textContent=routeNames[state.route].toUpperCase();
    document.querySelectorAll('.progress li').forEach((el,i)=>{el.classList.toggle('done',i<state.stage);if(i===state.stage)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
    if(state.stage===0) screen.innerHTML=frame('01 / Ad concept','What attracts the right inquiry?',`<p>Compare this message with your approved case profile. Neither identity option is presented as a proven winner.</p><div class="sample-ad"><div class="ad-visual"><img src="./journey.svg" alt="Original conceptual road illustration, not a real accident"></div><div class="ad-copy"><span class="sample-label">SYNTHETIC AD / ${identityName()}</span><strong>After a car accident?<br>Understand your next step.</strong><p>Explore a short intake process. The firm reviews whether it can help. No outcome is promised.</p></div></div><p class="disclaimer">Concept copy for review. Not a published advertisement or a claim of legal eligibility.</p><div class="actions">${action('page','Open the landing concept →')}</div>`);
    else if(state.stage===1) screen.innerHTML=frame('02 / Landing concept',state.identity==='branded'?'An MVA inquiry for Phillips.':'A first step after an MVA.',`<span class="sample-label">${identityName()}</span><p>Collect enough context for a useful first conversation. An inquiry or prequalification does not establish eligibility or mean the firm has accepted a case.</p><div class="notice">Chosen route: <b>${routeNames[state.route]}</b>. ${state.route==='form'?'A short, structured form.':state.route==='call'?'A simulated incoming call and intake conversation.':'Sofia identifies herself as an AI assistant and gathers initial information.'}</div><p>This demonstration uses only fixed sample answers. Do not enter personal or case information.</p><div class="actions">${action('intake',state.route==='call'?'Simulate the first call →':state.route==='ai'?'Meet Sofia in the example →':'Try the sample form →')}</div>`);
    else if(state.stage===2) {
      const intro=state.route==='ai'?`<div class="dialogue"><span class="speaker">SOFIA / SCRIPTED AI EXAMPLE</span><p>“Hi, I’m Sofia, an AI intake assistant. I can gather initial information for the firm to review. I cannot give legal advice or decide whether the firm accepts your case.”</p><p>“What state was the incident in, and when did it happen? Did you report an injury? Do you already have an attorney?”</p></div>`:state.route==='call'?`<div class="dialogue"><span class="speaker">CALL-FIRST / SCRIPTED CONVERSATION</span><p>“Thanks for reaching out. Let’s gather a little context for intake. The firm will review whether it can help.”</p><p>No call is placed, no audio is recorded and no phone number is collected.</p></div>`:`<p>A traditional intake form, using fixed synthetic answers. In production, the firm must approve questions and data handling before launch.</p>`;
      const fields=[['jurisdiction','Reported state',['Arizona','Other state']],['timing','Incident timing',['Within the last 30 days','More than 30 days ago']],['injury','Injury context',['Injury reported','Injury unclear']],['representation','Representation',['No current attorney reported','Current attorney reported']]];
      screen.innerHTML=frame('03 / Prequalification information',state.route==='ai'?'A conversation with a clear boundary.':state.route==='call'?'The first call needs an owner.':'Useful context. Minimal friction.',`${intro}<div class="fixture-fields">${fields.map(([id,label,opts])=>`<label for="${id}">${label}<select id="${id}">${opts.map(o=>`<option>${o}</option>`).join('')}</select></label>`).join('')}</div><p class="notice">These answers are information for human review. They do not produce an automated legal eligibility decision.</p><div class="actions">${action('capture','Review connection permission →')}</div>`);
    } else if(state.stage===3) screen.innerHTML=frame('04 / Disclosure + consent','Permission before the handoff.',`${packet()}<p>In a live campaign, the firm must approve the identity, destination, contact and recording disclosures. This example demonstrates a separate connection choice; it is not a production consent form.</p>${state.route==='ai'?'<p class="notice">Sofia is an AI assistant. This conversation is scripted. No recording, transcript service or runtime AI is connected.</p>':''}<label class="consent-label"><input id="connection-consent" type="checkbox" ${state.consent?'checked':''}><span>For this synthetic example, demonstrate permission to share the sample intake context and connect to the firm’s intake team.</span></label><div class="actions">${action('connect','Simulate the handoff →',false,!state.consent)}${action('decline','Decline permission',true)}</div>`);
    else if(state.stage===4&&!state.unavailable) screen.innerHTML=frame('05 / Handoff','Make intake ownership visible.',`<p>The proposed packet goes to the designated firm intake owner. A production handoff requires a verified destination, available staff, acknowledged receipt and a response policy.</p>${packet()}<div class="notice">Simulated destination: Firm intake team. No dialing, transfer or delivery occurs.</div><p>Choose an outcome to see how the workflow records acknowledgement or handles unavailable staff.</p><div class="actions">${action('accepted','Simulate intake acknowledgement →')}${action('unavailable','Simulate unavailable intake',true)}</div>`);
    else if(state.stage===4) screen.innerHTML=frame('05 / Exception handling','No answer cannot be the end.',`<p class="notice">Synthetic exception: the firm’s intake team is unavailable. No connection was completed.</p><p>Proposed fallback: assign the firm’s intake owner a follow-up task with source, sample context and consent status. The actual response-time policy must be agreed before launch.</p><p>No callback is scheduled in this demo. Do not imply that a queued follow-up is an accepted lead or a signed case.</p><div class="actions">${action('fallback','Simulate assigned follow-up →')}${action('stop','Stop the handoff',true)}</div>`);
    else screen.innerHTML=frame('06 / Reporting','Activity is visible. Outcomes need evidence.',`<p class="notice"><b>${state.outcome}</b>. All records below are synthetic events from this single walkthrough.</p>${packet()}<ol class="event-ledger">${state.events.map((e,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span><b>${eventNames[e]}</b><span>Synthetic</span></li>`).join('')}</ol><p><b>Verified signed cases:</b> Unknown · <b>Media spend:</b> Unverified<br><b>Collected revenue:</b> Unknown · <b>Cost per signed / ROI:</b> Unavailable</p><p>No real firm acknowledgement, signed outcome or revenue feed is connected. A production report must reconcile source and spend with intake dispositions and verified firm outcomes.</p><div class="actions">${action('reset','Start another example ↺')}</div>`);
    if(focus) document.querySelector('#screen-title')?.focus({preventScroll:true});
  }
  function reset(){state=createState(document.querySelector('[name="identity"]:checked').value,document.querySelector('[name="route"]:checked').value);render();}
  document.querySelector('#reset').addEventListener('click',reset);
  document.querySelectorAll('.controls input').forEach(el=>el.addEventListener('change',reset));
  screen.addEventListener('change',event=>{if(event.target.id==='connection-consent'){state=transition(state,'agree');screen.querySelector('[data-action="connect"]').disabled=!state.consent;}});
  screen.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
    const command=button.dataset.action;if(command==='reset'){reset();return;}
    const answers=command==='capture'?Object.fromEntries(['jurisdiction','timing','injury','representation'].map(key=>[key,screen.querySelector('#'+key).value])):null;
    state=transition(state,command,answers);render(true);
  });
  render();
}
