(() => {
"use strict";
const base="https://perspective-s3b8.onrender.com/portal/glassman";
const el=id=>document.getElementById(id);
let email="",session="",timer,generation=0,matchRows=[],verifiedUser=null,expiryTimer;
const isKyle=()=>!!session&&verifiedUser?.email==="kyleg@marketingapes.com"&&Array.isArray(verifiedUser.sections)&&verifiedUser.sections.includes("leads")&&verifiedUser.contact===true;
const intake=window.GlassmanLeadIntake?window.GlassmanLeadIntake({request,getSession:()=>session,getGeneration:()=>generation,canView:isKyle,lock}):null;
function openActivity(lead){if(!isKyle())return;intake?.clear();activity?.open(lead);}
const activity=window.GlassmanLeadActivity?window.GlassmanLeadActivity({request,getSession:()=>session,getGeneration:()=>generation,lock}):null;
const dashboard=window.GlassmanDashboard?window.GlassmanDashboard({request,getSession:()=>session,getGeneration:()=>generation,lock,openActivity}):null;
let leadRows=[];
const status=text=>{el("status").textContent=text;};
const TEXT_IDS=["web-count","test-count","source-time","generated-time","contacted-count","contacted-note","cpl-value","cpl-note","range","spend-note"];
const TABLES=["funnel-body","day-body","channel-body","door-body","outcome-body","spend-list"];
const V2_PARTS=["contacted-card","cpl-card","range","detail"];
const CHANNELS={meta:"Meta (Facebook, Instagram)",google:"Google",bing:"Bing",tiktok:"TikTok",openai:"ChatGPT",direct_or_unknown:"Direct or unknown"};
const OUTCOMES=[["QUALIFIED","Qualified"],["FIRM_REVIEW","Firm review"],["NOT_A_FIT","Not a fit"],["other","Other result"],["not_screened","Not screened on the page"]];
const FUNNEL=[["leads","Requests received"],["contacted","Text or call activity recorded"],["texted","Sent a text"],["called","Called by the assistant"],
 ["transfer_attempted","Live transfer attempted"],["transfer_connected","Legacy transfer signal (unverified)"],["callback_booked","Assistant callback scheduled"],
 ["callback_sent_to_firm","Callback request sent to the firm"],["sent_to_firm_crm","Posting recorded for the firm's case system (LawRuler)"],
 ["held_not_a_fit","Held: not a fit"],["not_yet_contacted","No follow-up recorded"]];
const DOORS={callback_form:"Callback form",quiz:"Eligibility quiz",talk_to_sofia:"Talk to Sofia",meta_form:"Meta lead form",other:"Other"};
const RESULTS={QUALIFIED:"Qualified",FIRM_REVIEW:"Firm review",NOT_A_FIT:"Not a fit"};
const STATUSES={delivered_to_firm_crm:"Posted to LawRuler",live_transfer:"Legacy transfer signal (unverified)",callback_request_sent_to_firm:"Callback request sent to the firm",
 transfer_attempted_not_connected:"Transfer attempt recorded",called_not_transferred:"Call report recorded",queued_for_call:"Queued for a call",
 texted_not_called:"Text sent marker recorded",held_not_a_fit:"Held: not a fit",stored_no_contact:"No follow-up recorded"};
const MATCH_HEAD=["Received (Eastern)","First name","Last name","Phone","Email","State","Channel","Way in","Page result","Status","Callback asked for (Eastern)","LawRuler lead ID","Posted to LawRuler (Eastern)","Our reference"];
function lock(){
 generation++;session="";verifiedUser=null;clearTimeout(timer);clearTimeout(expiryTimer);intake?.clear();if(dashboard)dashboard.clear();
 el("metrics").hidden=true;el("sign-in").hidden=false;el("verify").hidden=true;
 for(const id of TEXT_IDS)el(id).textContent="";
 for(const id of TABLES)el(id).replaceChildren();
 for(const id of V2_PARTS)el(id).hidden=true;
 el("v1-note").hidden=true;
 clearMatch();
 el("work-status").textContent="Lead details appear only when your signed-in access includes them.";
 el("code").value="";status("Sign-in required. No private data loaded.");
}
function clearMatch(){intake?.clear();if(dashboard)dashboard.clearStatus();leadRows=[];if(activity)activity.clear();el("lead-search").value="";matchRows=[];el("match").hidden=true;el("match-body").replaceChildren();el("match-count").textContent="";}
async function request(path,body,token,raw=false){
 const response=await fetch(base+path,{method:body?"POST":"GET",mode:"cors",credentials:"omit",cache:"no-store",
 headers:{...(body?{"Content-Type":"application/json"}:{}),...(token?{Authorization:"Bearer "+token}:{})},
 ...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok){const e=new Error("Unavailable");e.status=response.status;throw e;}
 return raw?response:response.json();
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
function showV2(d){
 const t=d.totals,h=d.handoff,s=d.spend;
 el("web-count").textContent=String(t.real_leads);el("test-count").textContent=String(t.test_records);
 el("contacted-count").textContent=String(h.contacted);
 el("contacted-note").textContent=h.called+" call reports · "+h.not_yet_contacted+" without recorded follow-up. These records do not prove a person was reached.";
 if(!s.visible){el("cpl-value").textContent="—";el("cpl-note").textContent="Spend is not included in your access.";}
 else if(!money(t.cpl_on_spend_days)){el("cpl-value").textContent="Not loaded";el("cpl-note").textContent="No cost per lead until ad spend is loaded for days with leads.";}
 else{el("cpl-value").textContent=usd(t.cpl_on_spend_days);el("cpl-note").textContent=usd(t.spend_loaded)+" loaded spend over "+t.leads_on_spend_days+" leads on those days";}
 el("range").textContent=t.first_day?"Leads from "+day(t.first_day)+" to "+day(t.last_day)+" (Eastern time).":"No real leads yet.";
 el("source-time").textContent=time(t.last_lead_at);el("generated-time").textContent=time(d.generated_at);
 fill("funnel-body",FUNNEL.map(([k,label])=>[label,String(h[k])]),"No requests yet.",2);
 fill("day-body",d.by_day.map(r=>[day(r.date),channel(r.channel),String(r.leads),!s.visible?"—":r.spend===null?"Not loaded":usd(r.spend),cplText(r.spend,r.cpl,s.visible,r.leads)]),"No leads yet.",5,2);
 fill("channel-body",d.by_channel.map(r=>[channel(r.channel),String(r.leads),!s.visible?"—":r.spend===null?"Not loaded":usd(r.spend),
  !s.visible?"—":r.spend===null?"Not loaded":r.cpl===null?(r.lead_days_missing_spend?"Partial spend":"—"):usd(r.cpl)]),"No leads yet.",4);
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
   text(r.door)&&text(r.status)&&textOrNull(r.web_outcome)&&textOrNull(r.requested_callback_eastern)&&textOrNull(r.lawruler_lead_id)&&textOrNull(r.lawruler_at));
}
function showMatch(d){
 leadRows=d.leads;
 matchRows=d.leads.map(r=>[eastern(r.received_at),r.first_name,r.last_name,r.phone,r.email,r.state,channel(r.channel),DOORS[r.door]||"Other",
  r.web_outcome?RESULTS[r.web_outcome]||"Other result":"Not screened on the page",STATUSES[r.status]||"No follow-up recorded",r.requested_callback_eastern||"",
  r.lawruler_lead_id||"",r.lawruler_lead_id?eastern(r.lawruler_at):"",r.receipt_id]);
 renderMatch();
 el("match-csv").hidden=!matchRows.length;el("match").hidden=false;
 el("work-status").textContent="Contact list loaded. Additional details are available only with approved access. No messages or calls are sent from this view.";
 if(activity)activity.reconcile(d.leads);intake?.reconcile(d.leads);
}
function renderMatch(){
 const query=el("lead-search").value.trim().toLowerCase(),digits=query.replace(/\D/g,"");
 const rows=matchRows.map((m,index)=>({m,index})).filter(({m})=>!query||m.join(" ").toLowerCase().includes(query)||(digits.length>=3&&m[3].replace(/\D/g,"").includes(digits)));
 const body=el("match-body");body.replaceChildren();
 if(!rows.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=12;td.textContent=matchRows.length?"No matching leads. Try another search.":"No real leads yet.";tr.append(td);body.append(tr);}
 for(const {m,index} of rows){
  const cells=[m[0],(m[1]+" "+m[2]).trim()||"Not given",m[3]||"Not given",m[4]||"Not given",m[5]||"—",m[6],m[7],m[8],
   m[9]+(m[10]?" · callback asked for "+m[10]:""),m[11]||"No verified ID",m[13]];
  const tr=document.createElement("tr");
  cells.forEach((value,i)=>{const td=document.createElement(i?"td":"th");if(!i)td.scope="row";if(i===8)td.className="wrap";td.textContent=value;tr.append(td);});
  const td=document.createElement("td"),button=document.createElement("button");button.type="button";button.textContent="View activity";
  button.addEventListener("click",()=>{if(activity)openActivity(leadRows[index]);else el("work-status").textContent="Activity view unavailable. Reload the page to try again.";});if(isKyle()){
   td.append(button);const full=document.createElement("button");full.type="button";full.textContent="View full intake";
   full.addEventListener("click",()=>{if(!isKyle())return;activity?.clear();intake?.open(leadRows[index]);});td.append(full);
  }tr.append(td);body.append(tr);
 }
 const posted=matchRows.filter(m=>m[11]).length;
 el("match-count").textContent=(query?rows.length+" matching of ":"")+matchRows.length+(matchRows.length===1?" lead":" leads")+" · "+posted+" with a LawRuler lead ID"+(matchRows.length>=500?" · showing the newest 500":"");
}

async function loadMatch(g){
 try{
  const d=await request("/lead-list",null,session);
  if(g!==generation||!session)return;
  if(!validMatch(d))throw new Error("Unexpected lead list");
  showMatch(d);if(dashboard&&isKyle())await dashboard.setLeads(d.leads,g);
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
  if(dashboard&&isKyle()){
   el("legacy-report").hidden=true;el("marketing-report").hidden=false;
   el("metrics").hidden=false;status("Connected. The report refreshes every minute.");
   await dashboard.loadMarketing(g);
  }else{
   el("legacy-report").hidden=false;el("marketing-report").hidden=true;
   const d=await request("/web-summary?v=2",null,session);
   if(g!==generation||!session)return;
   if(validV2(d))showV2(d);else if(validV1(d))showV1(d);else throw new Error("Unexpected report");
   el("metrics").hidden=false;status("Connected. The report refreshes every minute.");
  }
  if(g!==generation||!session)return;
  await loadMatch(g);
 }catch(e){
  if(g!==generation)return;
  if(e.status===401||e.status===403){lock();return;}
  status("Refresh failed. Any displayed figures are from the previous successful refresh.");
 }
 if(g===generation&&session)timer=setTimeout(()=>refresh(g),60000);
}
el("sign-in").addEventListener("submit",async e=>{
 e.preventDefault();const button=e.submitter||e.target.querySelector('button[type="submit"]');if(!button||button.disabled)return;button.disabled=true;
 const g=generation;email=el("email").value.trim().toLowerCase();
 try{await request("/login",{email});if(g!==generation)return;el("sign-in").hidden=true;el("verify").hidden=false;status("Check your email for a code.");}
 catch{if(g===generation)status("Sign-in unavailable. Confirm approved access with Kyle.");}
 finally{button.disabled=false;}
});
el("verify").addEventListener("submit",async e=>{
 e.preventDefault();const button=e.submitter||e.target.querySelector('button[type="submit"]');if(!button||button.disabled)return;button.disabled=true;const g=generation;
 try{const d=await request("/verify",{email,code:el("code").value.trim()});if(g!==generation)return;
 if(typeof d.session!=="string"||!d.session)throw new Error("No session");
 session=d.session;verifiedUser=d.user||null;expiryTimer=setTimeout(lock,12*60*60*1000);el("code").value="";el("verify").hidden=true;await refresh(g);}
 catch{if(g===generation)status("Could not verify code. Try again or change email to request a new one.");}
 finally{button.disabled=false;}
});
el("lead-search").addEventListener("input",renderMatch);
el("back").addEventListener("click",lock);el("lock").addEventListener("click",lock);el("match-csv").addEventListener("click",downloadMatch);
window.addEventListener("hashchange",()=>{intake?.clear();activity?.clear();});
window.addEventListener("popstate",()=>{intake?.clear();activity?.clear();});
window.addEventListener("pagehide",lock);window.addEventListener("pageshow",e=>{if(e.persisted)lock();});
})();
