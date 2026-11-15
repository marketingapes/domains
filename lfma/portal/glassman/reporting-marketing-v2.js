(() => {
"use strict";
const base="https://perspective-s3b8.onrender.com/portal/glassman";
const el=id=>document.getElementById(id);
let email="",session="",timer,generation=0,matchRows=[],budgetFeed=null;
const status=text=>{el("status").textContent=text;};
const TEXT_IDS=["web-count","test-count","source-time","generated-time","contacted-count","contacted-note","cpl-value","cpl-note","range","spend-note","firm-note","connection-note","budget-total","budget-media","budget-fee","budget-spend","budget-remaining","budget-source","budget-coverage","budget-ratio"];
const TABLES=["funnel-body","day-body","channel-body","door-body","outcome-body","spend-list","firm-body","channel-chart","spend-chart","trend-chart","channel-breakdown"];
const V2_PARTS=["contacted-card","cpl-card","range","detail"];
const CHANNELS={meta:"Meta (Facebook, Instagram)",google:"Google",bing:"Bing",tiktok:"TikTok",openai:"ChatGPT",direct_or_unknown:"Direct or unknown"};
const OUTCOMES=[["QUALIFIED","Qualified"],["FIRM_REVIEW","Firm review"],["NOT_A_FIT","Not a fit"],["other","Other result"],["not_screened","Not screened on the page"]];
// A request is one saved submission. A call attempt is not a conversation, so neither is ever labelled "reached".
const FUNNEL=[["leads","Requests received"],["contacted","Requests with a call or text attempt"],["texted","Sent a text"],["called","Requests the assistant tried to call"],
 ["transfer_attempted","Live transfer attempted"],["transfer_connected","Requests marked as phone transfer (connection unverified)"],["callback_booked","Callback time booked"],
 ["callback_sent_to_firm","Callback request sent to the firm"],["sent_to_firm_crm","Requests posted to the firm's case system (LawRuler)"],
 ["held_not_a_fit","Held: not a fit"],["not_yet_contacted","Not yet contacted"]];
const ACTIVITY=["people","call_attempts","spoke_live","live_transfers","inbound_calls"];
const DOORS={callback_form:"Callback form",quiz:"Eligibility quiz",talk_to_sofia:"Talk to Sofia",meta_form:"Meta lead form",tiktok_form:"TikTok lead form",other:"Other"};
const RESULTS={QUALIFIED:"Qualified",FIRM_REVIEW:"Firm review",NOT_A_FIT:"Not a fit"};
const STATUSES={delivered_to_firm_crm:"Posted to LawRuler",live_transfer:"Transfer attempt; connection unverified",callback_request_sent_to_firm:"Callback request sent to the firm",
 transfer_attempted_not_connected:"Transfer tried, not connected",called_not_transferred:"Call attempted, not transferred",queued_for_call:"Queued for a call",
 texted_not_called:"Texted, not called yet",held_not_a_fit:"Held: not a fit",stored_no_contact:"Not yet contacted"};
const MATCH_HEAD=["Received (Eastern)","First name","Last name","Phone","Email","State","Channel","Way in","Page result","Status","Callback asked for (Eastern)","LawRuler lead ID","Posted to LawRuler (Eastern)","Our reference","Firm status","Firm status date","Platform campaign ID","Platform ad set ID","Platform ad ID"];
function lock(){
 generation++;session="";budgetFeed=null;clearTimeout(timer);
 el("metrics").hidden=true;el("sign-in").hidden=false;el("verify").hidden=true;
 for(const id of TEXT_IDS)el(id).textContent="";
 for(const id of TABLES)el(id).replaceChildren();
 for(const id of V2_PARTS)el(id).hidden=true;
 el("v1-note").hidden=true;el("firm-part").hidden=true;
 clearMatch();
 el("code").value="";status("Sign-in required. No private data loaded.");
}
function clearMatch(){matchRows=[];el("match").hidden=true;el("match-body").replaceChildren();el("match-count").textContent="";}
async function request(path,body,token){
 const response=await fetch(base+path,{method:body?"POST":"GET",mode:"cors",credentials:"omit",cache:"no-store",
 headers:{...(body?{"Content-Type":"application/json"}:{}),...(token?{Authorization:"Bearer "+token}:{})},
 ...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok){const e=new Error("Unavailable");e.status=response.status;throw e;}
 return response.json();
}
function time(value){const date=new Date(value);return value&&!Number.isNaN(date.valueOf())?date.toLocaleString():"Unavailable";}
const count=v=>Number.isInteger(v)&&v>=0;
const money=v=>typeof v==="number"&&Number.isFinite(v)&&v>=0;
const usd=v=>"$"+v.toFixed(2);
function day(value){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||""));
 return m?new Date(+m[1],+m[2]-1,+m[3]).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"Unknown date";
}
function channel(value){
 const v=String(value||"");
 return CHANNELS[v]||(v.startsWith("other:")?"Other: "+v.slice(6):v||"Unknown");
}
function validV2(d){
 const t=d.totals,h=d.handoff,q=d.quiz_outcomes,s=d.spend;
 return d.schema==="glassman.web-summary/v2"&&d.campaign_id==="GLASSMAN-SSDI-002"&&t&&count(t.real_leads)&&count(t.test_records)&&
  Array.isArray(d.by_day)&&Array.isArray(d.by_channel)&&Array.isArray(d.by_door)&&h&&q&&s&&Array.isArray(s.loaded)&&
  FUNNEL.every(([k])=>count(h[k]))&&OUTCOMES.every(([k])=>count(q[k]))&&
  d.by_day.every(r=>count(r.leads)&&(r.spend===null||money(r.spend))&&(r.cpl===null||money(r.cpl)))&&
  d.by_channel.every(r=>count(r.leads)&&(r.spend===null||money(r.spend))&&(r.cpl===null||money(r.cpl)))&&
  d.by_door.every(r=>typeof r.label==="string"&&count(r.leads));
}
// Added 2026-11-12. Both are optional: an older server, or a failed facts query, sends neither and the page says so.
function activityOf(d){const a=d.activity;return a&&ACTIVITY.every(k=>count(a[k]))?a:null;}
function firmOf(d){
 const f=d.firm;
 return f&&count(f.people_at_firm)&&count(f.lawruler_records)&&count(f.live_transfer_only)&&Array.isArray(f.statuses)&&f.statuses.length<=50&&
  f.statuses.every(r=>r&&typeof r.status==="string"&&count(r.people))?f:null;
}
function validV1(d){
 return d.schema==="glassman.web-summary/v1"&&d.campaign_id==="GLASSMAN-SSDI-002"&&
  Number.isInteger(d.web_requests)&&d.web_requests>=0&&Number.isInteger(d.test_requests)&&d.test_requests>=0;
}
function fill(id,rows,empty,cols,numFrom=1){
 const body=el(id);body.replaceChildren();
 if(!rows.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=cols;td.textContent=empty;tr.append(td);body.append(tr);return;}
 for(const cells of rows){
  const tr=document.createElement("tr");
  cells.forEach((text,i)=>{const td=document.createElement(i?"td":"th");if(!i)td.scope="row";td.textContent=text;if(i>=numFrom)td.className="num";tr.append(td);});
  body.append(tr);
 }
}
function cplText(spend,cpl,visible,leads){
 if(!visible)return "—";
 if(spend===null)return "Not loaded";
 return cpl===null?(leads?"—":"No leads"):usd(cpl);
}
// Native progress bars avoid external libraries and keep every value available as text.
function chart(id,rows,format,empty){
 const container=el(id);container.replaceChildren();
 if(!rows.length){const p=document.createElement("p");p.className="chart-empty";p.textContent=empty;container.append(p);return;}
 const maximum=Math.max(1,...rows.map(r=>r.value));
 for(const r of rows){const row=document.createElement("div"),label=document.createElement("div"),name=document.createElement("span"),value=document.createElement("strong"),bar=document.createElement("progress");
  row.className="chart-row";label.className="chart-label";name.textContent=r.label;value.textContent=format(r.value);label.append(name,value);
  bar.max=maximum;bar.value=r.value;bar.setAttribute("aria-label",r.label+": "+format(r.value));row.append(label,bar);container.append(row);}
}
function marketingCharts(d){
 const channels=d.by_channel;
 chart("channel-chart",channels.map(r=>({label:channel(r.channel),value:r.leads})).sort((a,b)=>b.value-a.value),String,"No submission rows returned.");
 chart("spend-chart",d.spend.visible?channels.filter(r=>money(r.spend)).map(r=>({label:channel(r.channel),value:r.spend})).sort((a,b)=>b.value-a.value):[],usd,d.spend.visible?"No spend rows loaded. Spend is unknown, not zero.":"Spend is not included in your access.");
 const days=new Map();
 for(const r of d.by_day){if(r.leads>0&&/^\d{4}-\d{2}-\d{2}$/.test(String(r.date)))days.set(r.date,(days.get(r.date)||0)+r.leads);}
 chart("trend-chart",[...days].sort(([a],[b])=>a.localeCompare(b)).slice(-14).map(([date,value])=>({label:day(date),value})),String,"No dated submission rows returned.");
 const box=el("channel-breakdown");box.replaceChildren();
 const keys=[...new Set(["meta","google","tiktok","openai",...channels.map(r=>r.channel)])];
 for(const key of keys){const r=channels.find(row=>row.channel===key),tile=document.createElement("article"),title=document.createElement("h4");tile.className="channel-tile";title.textContent=channel(key);tile.append(title);
  const lines=[r?r.leads+" submissions":"No submission rows returned",!d.spend.visible?"Spend not included in your access":r&&money(r.spend)?usd(r.spend)+" recorded spend":"Spend unknown / not loaded",r&&r.lead_days_missing_spend?r.lead_days_missing_spend+" submission dates missing spend":"Full source coverage not verified"];
  for(const line of lines){const p=document.createElement("p");p.textContent=line;tile.append(p);}box.append(tile);}
}
function showBudget(d){
 const visible=d.spend.visible;
 const rows=visible?d.spend.loaded:[];
 const valid=rows.length>0&&rows.every(r=>money(r.spend));
 const spent=valid?Math.round(rows.reduce((n,r)=>n+r.spend,0)*100)/100:null;
 for(const id of ["budget-total","budget-media","budget-fee","budget-remaining"])el(id).textContent=visible?"Not loaded":"—";
 el("budget-spend").textContent=spent===null?(visible?"Not loaded":"—"):usd(spent);
 const leads=d.totals&&d.totals.real_leads;
 el("budget-ratio").textContent=!visible?"—":spent!==null&&count(leads)&&leads>0?usd(spent/leads):"Not loaded";
 el("budget-source").textContent=visible?"Budget source unavailable":"Budget not included in your access.";
 const dates=rows.map(r=>r.date).filter(v=>/^\d{4}-\d{2}-\d{2}$/.test(v)).sort();
 el("budget-coverage").textContent=dates.length?"Recorded "+day(dates[0])+"–"+day(dates[dates.length-1])+". May include partial/account-local days; coverage not reconciled.":"No spend rows loaded.";
 if(!visible||!budgetFeed||!Array.isArray(budgetFeed.campaigns))return;
 const c=budgetFeed.campaigns.find(c=>c.id==="GLASSMAN-SSDI-002");
 if(!c||!c.budget||!money(c.budget.amount))return;
 el("budget-media").textContent=usd(c.budget.amount);
 el("budget-source").textContent=c.budget.note||"Campaign reporting budget";
 if(c.invoice&&money(c.invoice.total)){
  el("budget-total").textContent=usd(c.invoice.total);
  const fee=c.invoice.total-c.budget.amount;
  el("budget-fee").textContent=fee>=0?usd(fee):"Not loaded";
 }
 if(spent!==null){
  const remaining=Math.round((c.budget.amount-spent)*100)/100;
  el("budget-remaining").textContent=remaining>=0?usd(remaining):"Over budget by "+usd(-remaining);
 }
}
async function loadBudget(g){
 try{
  const data=await request("/feed",null,session);
  if(g!==generation||!session)return;
  budgetFeed=data;
 }catch(e){
  if(g!==generation)return;
  budgetFeed=null;
  if(e.status===401){lock();}
 }
}
function showV2(d){
 const t=d.totals,h=d.handoff,s=d.spend;
 marketingCharts(d);showBudget(d);
 el("marketing").hidden=false;el("handoff").hidden=false;el("intake-summary").hidden=false;
 el("web-count").textContent=String(t.real_leads);el("test-count").textContent=String(t.test_records);
 const a=activityOf(d),f=firmOf(d);
 el("contacted-count").textContent=String(a?a.call_attempts:h.called);
 el("contacted-note").textContent=a?a.spoke_live+" live conversations · "+a.live_transfers+" transfer attempts · "+h.not_yet_contacted+" requests not yet called"
  :h.called+" requests with a call attempt · "+h.not_yet_contacted+" not yet called · conversation count unavailable";
 el("cpl-value").textContent=s.visible?"Coverage review":"—";
 el("cpl-note").textContent=s.visible?"CPA withheld: source coverage and reporting windows must be verified before comparing costs.":"Spend is not included in your access.";
 el("connection-note").textContent="Submission totals: loaded. Outreach activity: "+(a?"available":"unavailable")+". Firm feedback: "+(f&&f.status_as_of?"latest report "+day(f.status_as_of):"no dated report available")+". Sheet synchronization, ad-platform event acceptance and signed cases are not verified by this view.";
 el("range").textContent=t.first_day?"Requests from "+day(t.first_day)+" to "+day(t.last_day)+" (Eastern time)."+
  (a?" "+t.real_leads+" requests map to "+a.people+" contact groups; these are matching keys, not verified unique people.":""):"No real requests yet.";
 el("source-time").textContent=time(t.last_lead_at);el("generated-time").textContent=time(d.generated_at);
 const steps=FUNNEL.map(([k,label])=>[label,String(h[k])]);
 if(a){steps.splice(1,0,["Matched contact groups (repeat requests grouped)",String(a.people)]);
  steps.splice(5,0,["Calls the assistant placed",String(a.call_attempts)],["Live conversations with the assistant",String(a.spoke_live)],["Calls people made to the assistant's line",String(a.inbound_calls)]);}
 fill("funnel-body",steps,"No requests yet.",2);
 if(f){
  fill("firm-body",[["Contact groups with handoff evidence",String(f.people_at_firm)],["Contact groups with a LawRuler ID",String(f.lawruler_records)],
   ["Handoff ledger groups without a LawRuler record ID",String(f.live_transfer_only)],
   ...f.statuses.map(r=>["Your latest status: "+r.status,String(r.people)])],"Nothing has been sent to your team yet.",2);
  el("firm-note").textContent=/^\d{4}-\d{2}-\d{2}$/.test(String(f.status_as_of||""))?"Statuses are from your intake team's disposition report of "+day(f.status_as_of)+".":"No disposition report has been loaded yet.";
 }else{el("firm-body").replaceChildren();el("firm-note").textContent="";}
 el("firm-part").hidden=!f;
 fill("day-body",d.by_day.map(r=>[day(r.date),channel(r.channel),String(r.leads),!s.visible?"—":r.spend===null?"Not loaded":usd(r.spend),s.visible?"Not verified":"—"]),"No leads yet.",5,2);
 fill("channel-body",d.by_channel.map(r=>[channel(r.channel),String(r.leads),!s.visible?"—":r.spend===null?"Not loaded":usd(r.spend),
  s.visible?"Not verified":"—"]),"No leads yet.",4);
 fill("door-body",d.by_door.map(r=>[r.label,String(r.leads)]),"No leads yet.",2);
 fill("outcome-body",OUTCOMES.map(([k,label])=>[label,String(d.quiz_outcomes[k])]),"No leads yet.",2);
 el("spend-note").textContent=typeof s.note==="string"?s.note:"";
 const list=el("spend-list");list.replaceChildren();
 for(const r of s.loaded){const li=document.createElement("li");
  li.textContent=day(r.date)+" · "+channel(r.channel)+": "+(money(r.spend)?usd(r.spend):"unknown")+" (from "+String(r.source||"unspecified")+", loaded "+time(r.loaded_at)+")";list.append(li);}
 for(const r of s.lead_days_missing_spend||[]){const li=document.createElement("li");
  li.textContent=day(r.date)+" · "+channel(r.channel)+": spend not loaded ("+r.leads+" leads)";list.append(li);}
 for(const id of V2_PARTS)el(id).hidden=false;el("v1-note").hidden=true;
}
function showV1(d){
 el("web-count").textContent=String(d.web_requests);el("test-count").textContent=String(d.test_requests);
 el("source-time").textContent=time(d.source_updated_at);el("generated-time").textContent=time(d.generated_at);
 for(const id of V2_PARTS)el(id).hidden=true;el("v1-note").hidden=false;
 el("detail").hidden=false;el("marketing").hidden=true;el("handoff").hidden=true;el("intake-summary").hidden=true;
}
function eastern(value){
 const date=new Date(value);
 return value&&!Number.isNaN(date.valueOf())?date.toLocaleString("en-US",{timeZone:"America/New_York",year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"";
}
const text=v=>typeof v==="string";
const textOrNull=v=>v===null||text(v);
function validMatch(d){
 return d.schema==="glassman.lead-list/v1"&&d.campaign_id==="GLASSMAN-SSDI-002"&&Array.isArray(d.leads)&&d.leads.length<=500&&
  d.leads.every(r=>r&&text(r.receipt_id)&&text(r.first_name)&&text(r.last_name)&&text(r.phone)&&text(r.email)&&text(r.state)&&text(r.channel)&&
   text(r.door)&&text(r.status)&&textOrNull(r.web_outcome)&&textOrNull(r.requested_callback_eastern)&&textOrNull(r.lawruler_lead_id)&&textOrNull(r.lawruler_at)&&
   ["platform_campaign_id","platform_adset_id","platform_ad_id"].every(k=>r[k]===undefined||r[k]===null||(text(r[k])&&/^[A-Za-z0-9_-]{1,100}$/.test(r[k])))&&
   (r.firm_status===undefined||textOrNull(r.firm_status))&&(r.firm_status_date===undefined||textOrNull(r.firm_status_date)));
}
function showMatch(d){
 matchRows=d.leads.map(r=>[eastern(r.received_at),r.first_name,r.last_name,r.phone,r.email,r.state,channel(r.channel),DOORS[r.door]||"Other",
  r.web_outcome?RESULTS[r.web_outcome]||"Other result":"Not screened on the page",STATUSES[r.status]||"Status unavailable",r.requested_callback_eastern||"",
  r.lawruler_lead_id||"",r.lawruler_lead_id?eastern(r.lawruler_at):"",r.receipt_id,r.firm_status||"",r.firm_status_date||"",r.platform_campaign_id||"",r.platform_adset_id||"",r.platform_ad_id||""]);
 const body=el("match-body");body.replaceChildren();
 if(!matchRows.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=13;td.textContent="No real leads yet.";tr.append(td);body.append(tr);}
 for(const m of matchRows){
  const cells=[m[0],(m[1]+" "+m[2]).trim()||"Not given",m[3]||"Not given",m[4]||"Not given",m[5]||"—",m[6],m[16]?"Campaign "+m[16]+" · Ad "+(m[18]||"not linked"):"Not linked / unavailable",m[7],m[8],
   m[9]+(m[10]?" · callback asked for "+m[10]:""),m[11]||"Not posted yet",m[14]||(m[11]?"No status reported yet":"—"),m[13]];
  const tr=document.createElement("tr");
  cells.forEach((value,i)=>{const td=document.createElement(i?"td":"th");if(!i)td.scope="row";if(i===8)td.className="wrap";td.textContent=value;tr.append(td);});
  body.append(tr);
 }
 const posted=matchRows.filter(m=>m[11]).length;
 el("match-count").textContent=matchRows.length+(matchRows.length===1?" lead":" leads")+" · "+posted+" with a LawRuler lead ID"+(d.leads.length>=500?" · showing the newest 500":"");
 el("match-csv").hidden=!matchRows.length;el("match").hidden=false;
}
async function loadMatch(g){
 try{
  const d=await request("/lead-list",null,session);
  if(g!==generation||!session)return;
  if(!validMatch(d))throw new Error("Unexpected lead list");
  showMatch(d);
 }catch(e){
  if(g!==generation)return;
  if(e.status===401){lock();return;}
  if(e.status===403||e.status===404||!matchRows.length){clearMatch();return;}
  el("match-count").textContent="Lead list refresh failed. This list is from the previous successful refresh.";
 }
}
function csvCell(value){let s=String(value);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function downloadMatch(){
 if(!session||!matchRows.length)return;
 const lines=[MATCH_HEAD,...matchRows].map(r=>r.map(csvCell).join(","));
 const url=URL.createObjectURL(new Blob(["\ufeff"+lines.join("\r\n")+"\r\n"],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download="glassman-ssdi-leads.csv";a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function refresh(g){
 try{
  const d=await request("/web-summary?v=2",null,session);
  if(g!==generation||!session)return;
  if(validV2(d)){if(d.spend.visible)await loadBudget(g);else budgetFeed=null;if(g!==generation||!session)return;showV2(d);}else if(validV1(d))showV1(d);else throw new Error("Unexpected report");
  el("metrics").hidden=false;status("Connected. The report refreshes every minute.");
  await loadMatch(g);
 }catch(e){
  if(g!==generation)return;
  if(e.status===401||e.status===403){lock();return;}
  status("Refresh failed. Any displayed figures are from the previous successful refresh.");
 }
 if(g===generation&&session)timer=setTimeout(()=>refresh(g),60000);
}
el("sign-in").addEventListener("submit",async e=>{
 e.preventDefault();const button=e.submitter;if(button.disabled)return;button.disabled=true;
 const g=generation;email=el("email").value.trim().toLowerCase();
 try{await request("/login",{email});if(g!==generation)return;el("sign-in").hidden=true;el("verify").hidden=false;status("Check your email for a code.");}
 catch{if(g===generation)status("Sign-in unavailable. Confirm approved access with Kyle.");}
 finally{button.disabled=false;}
});
el("verify").addEventListener("submit",async e=>{
 e.preventDefault();const button=e.submitter;if(button.disabled)return;button.disabled=true;const g=generation;
 try{const d=await request("/verify",{email,code:el("code").value.trim()});if(g!==generation)return;
 if(typeof d.session!=="string"||!d.session)throw new Error("No session");
 session=d.session;el("code").value="";el("verify").hidden=true;await refresh(g);}
 catch{if(g===generation)status("Could not verify code. Try again or change email to request a new one.");}
 finally{button.disabled=false;}
});
el("back").addEventListener("click",lock);el("lock").addEventListener("click",lock);el("match-csv").addEventListener("click",downloadMatch);
window.addEventListener("pagehide",lock);window.addEventListener("pageshow",e=>{if(e.persisted)lock();});
})();
