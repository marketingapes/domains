(() => {'use strict';
// Go Referral private Perspective. The session lives in memory only; every value is written with textContent.
const base='https://perspective-s3b8.onrender.com/portal/go-referral', el=id=>document.getElementById(id);
let session='',email='',generation=0,busy=false;
const fields=['scope','invoice-total','invoice-detail','invoice-status','invoice-date','invoice-source','spend','spend-note','submissions','package-delivered','package-note','spend-coverage','marketing-note','intake-note','optin-count','optin-detail','consent-count','consent-detail','call-count','call-detail','text-count','text-detail','status-check','day-hint','calls-hint','calls-other','handoff-note','dq-summary','generated'];
const lists=['channel-breakdown','spend-day-body','status-body','form-body','day-body','calls-body','texts-body','attempt-body','confirmed-body','dq-list'];
const say=s=>el('status').textContent=s;
const text=(id,v)=>el(id).textContent=v??'Unavailable';
const whole=v=>Number.isInteger(v)&&v>=0;
const count=v=>whole(v)?v.toLocaleString('en-US'):'Unavailable';
const money=v=>typeof v==='number'&&Number.isFinite(v)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v):'Unavailable';
const people=n=>whole(n)?`${count(n)} ${n===1?'person':'people'}`:'Unavailable';
function cell(tag,value,cls){const c=document.createElement(tag);c.textContent=value;if(cls)c.className=cls;if(tag==='th')c.setAttribute('scope','row');return c;}
function row(body,label,values,cls){const tr=document.createElement('tr');if(cls)tr.className=cls;tr.append(cell('th',label),...values.map(v=>Array.isArray(v)?cell('td',v[0],v[1]):cell('td',v,'num')));el(body).append(tr);}
function rows(body,items,valueKey='count',labelKey='label'){for(const i of Array.isArray(items)?items:[])row(body,String(i[labelKey]??''),[count(i[valueKey])]);}
function lock(){generation++;session='';busy=false;el('report').hidden=true;el('intake-detail').hidden=true;el('handoff-detail').hidden=true;el('sign-in').hidden=false;el('verify').hidden=true;el('code').value='';for(const id of fields)text(id,'');for(const id of lists)el(id).replaceChildren();say('Sign-in required. No private data loaded.');}
async function request(path,body,token){const r=await fetch(base+path,{method:body?'POST':'GET',credentials:'omit',cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok){const e=new Error('Unavailable');e.status=r.status;throw e;}return r.json();}
function marketing(i,m){
 text('invoice-total',i.available?money(i.invoice_total):'Unavailable');text('invoice-detail',i.available?i.description:(i.note||'Invoice reporting has not been connected.'));
 text('invoice-status',i.available?i.status:'Unavailable');text('invoice-date',i.available?`Invoice ${i.invoice_number} · ${i.invoice_date}`:'');text('invoice-source',i.available?`Invoice source: ${i.source}.`:'');
 const p=i.available&&i.package?i.package:null;
 text('package-delivered',p?(whole(p.qualified_delivered)?`${count(p.qualified_delivered)} of ${count(p.qualified_leads)}`:'Not counted'):'Unavailable');text('package-note',p?(whole(p.qualified_delivered)?'':p.delivered_note):'');
 text('spend',m.available?money(m.spend):'Unavailable');
 text('spend-note',m.available?`${m.period_start} to ${m.period_end} · ${m.timezone} · ${m.source}`:(m.note||''));
 text('submissions',m.available?count(m.platform_leads):'Unavailable');
 text('spend-coverage',m.available?`${count(m.days_with_spend)} days loaded, ${m.period_start} to ${m.period_end}, in the ad account's time zone (${m.timezone}). Copied from Meta on ${m.as_of||'an unrecorded date'}. Days outside this range are not loaded.`:'No spend is loaded.');
 text('marketing-note',m.available?m.note:'');
 if(m.available){const line=document.createElement('p');line.className='channel';line.textContent=`${m.channel} · Facebook campaign ${m.platform_campaign_id} · ${count(m.impressions)} impressions · ${count(m.clicks)} link clicks · ${money(m.platform_leads>0?m.spend/m.platform_leads:null)} per platform lead (not per qualified lead)`;el('channel-breakdown').append(line);
  for(const d of Array.isArray(m.by_day)?m.by_day:[])row('spend-day-body',String(d.date),[money(d.spend),count(d.impressions),count(d.clicks),count(d.platform_leads)]);
  row('spend-day-body','Total loaded',[money(m.spend),count(m.impressions),count(m.clicks),count(m.platform_leads)],'total');}
}
function intake(n){
 text('intake-note',n.note);el('intake-detail').hidden=!n.available;if(!n.available)return;
 const o=n.opt_ins||{},s=n.sofia||{};
 text('optin-count',count(o.submissions));text('optin-detail',`Lead form submissions from ${people(o.people)}. One person can submit more than once.`);
 text('consent-count',count(o.consent_calls));text('consent-detail',`Submissions with consent to calls. ${count(o.consent_sms)} also consented to texts.`);
 text('call-count',count(s.call_attempts));text('call-detail',`Calls Sofia placed to ${people(s.people_called)}. An attempt includes calls that rang out or reached voicemail.`);
 text('text-count',count(s.texts_sent));text('text-detail',`Texts sent to ${people(s.people_texted)} before a call. ${people(s.people_opted_out)} replied STOP.`);
 rows('status-body',n.lead_status);const c=n.checks||{};row('status-body','Total people',[count(c.status_total)],'total');
 text('status-check',c.status_total_matches_people===true?'The statuses add up to the number of people who opted in.':'Check needed: the statuses do not add up to the number of people who opted in. Treat this table as unverified.');
 rows('form-body',o.by_form);rows('day-body',o.by_day,'submissions','date');
 text('day-hint',`Dates are ${n.timezone}. First opt-in ${o.first_at||'unknown'}, latest ${o.last_at||'unknown'} (UTC). Days with no opt-ins are not listed.`);
 text('calls-hint',`${count(s.call_reports)} of Sofia's calls with these people have a call report. A report exists only when Sofia summarised the call, so this is fewer than the ${count(s.call_attempts)} attempts.`);
 for(const [title,items] of [['Who called',s.call_direction],['Screening result',s.call_outcomes],['How the call ended',s.call_endings]]){row('calls-body',title,[''],'total');rows('calls-body',items);}
 rows('texts-body',s.text_statuses);
 text('calls-other',whole(s.calls_not_tied_to_a_lead)?`${count(s.calls_not_tied_to_a_lead)} other calls on Sofia's line are left out. ${s.calls_not_tied_note||''}`:'');
}
function handoff(h){
 text('handoff-note',h.note);el('handoff-detail').hidden=!h.available;
 const dq=h.dq_review||{};text('dq-summary',dq.summary||'Proposed only.');
 for(const r of Array.isArray(dq.requirements)?dq.requirements:[]){const li=document.createElement('li'),b=document.createElement('b');b.textContent=`${r.label}: `;li.append(b,document.createTextNode(String(r.detail??'')));el('dq-list').append(li);}
 if(!h.available)return;
 const t=h.transfers||{},r=h.receipts||{},f=h.firm_feedback||{};
 row('attempt-body','Transfers Sofia started',[count(t.attempts)]);row('attempt-body','People with a started transfer',[count(t.people)]);row('attempt-body','Lead posts attempted',[count(r.post_attempts)]);
 const known=v=>whole(v)?count(v):'Not connected';
 row('confirmed-body','Transfers confirmed answered',[known(t.confirmed_answered),[t.confirmed_note||'','meaning']]);
 row('confirmed-body','Lead posts accepted by the receiving system',[whole(r.accepted)?`${count(r.accepted)} of ${count(r.post_attempts)}`:'No posts attempted',[`${r.note||''}${whole(r.without_response_code)&&r.without_response_code>0?` ${count(r.without_response_code)} ${r.without_response_code===1?'attempt has':'attempts have'} no response code stored.`:''}`,'meaning']]);
 row('confirmed-body','Leads the firm reported as accepted',[known(f.accepted),[f.note||'','meaning']]);
 row('confirmed-body','Leads the firm reported as disqualified',[known(f.disqualified),['','meaning']]);
 row('confirmed-body','Signed cases',[known(f.signed),['','meaning']]);
}
function render(data){if(data.schema!=='go-referral.perspective/v1'||data.client?.id!=='go-referral'||data.campaign_id!=='BTL-SSDI-001')throw new Error('Wrong report');
 for(const id of lists)el(id).replaceChildren();
 text('scope',data.scope||'');marketing(data.invoice||{},data.marketing||{});intake(data.intake||{});handoff(data.handoff||{});text('generated',data.generated_at);
 el('report').hidden=false;el('sign-in').hidden=true;el('verify').hidden=true;}
async function load(){if(!session||busy)return;busy=true;const g=generation,t=session;say('Loading private report…');try{const d=await request('/report',null,t);if(g!==generation||session!==t)return;render(d);say('Private report loaded.');}catch(e){if(g!==generation)return;if(e.status===401||e.status===403){lock();say(e.status===401?'Session expired. Sign in again.':'Reporting is not included in your access.');}else{el('report').hidden=true;say('Report unavailable. No new data loaded.');}}finally{if(g===generation)busy=false;}}
el('sign-in').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;const g=++generation;email=el('email').value.trim();say('Requesting sign-in code…');try{await request('/login',{email});if(g!==generation)return;el('sign-in').hidden=true;el('verify').hidden=false;say('If your email is approved, check it for a sign-in code.');}catch(e){if(g===generation)say('Sign-in unavailable. This reporting workspace may not be configured yet.');}finally{if(g===generation)busy=false;}});
el('verify').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;const g=generation;say('Checking code…');try{const d=await request('/verify',{email,code:el('code').value});if(g!==generation)return;if(!d.session)throw new Error('No session');session=d.session;el('code').value='';busy=false;await load();}catch(e){if(g===generation)say('Code could not be verified. Try again.');}finally{if(g===generation)busy=false;}});
el('back').addEventListener('click',lock);el('lock').addEventListener('click',lock);el('refresh').addEventListener('click',load);window.addEventListener('pagehide',lock);lock();
})();
