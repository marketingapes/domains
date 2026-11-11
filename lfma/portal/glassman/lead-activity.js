/* Read-only Glassman activity. No provider URLs, sends, analytics or persistent storage. */
(() => {
"use strict";
const CAMPAIGN="GLASSMAN-SSDI-002",SCHEMA="glassman.lead-activity/v1";
const RECEIPT=/^BTLK-[0-9A-F]{10}$/,ID=/^[A-Za-z0-9_-]{1,100}$/;
const KINDS=["lead","sms","email","call","callback","handoff"];
const STATES=["recorded","queued","scheduled","skipped","sent","delivered","received","failed","ended","attempted","confirmed","unknown"];
const DIRECTIONS=["inbound","outbound","internal","unknown"];
const COVERAGE=["available","not_connected","not_captured","restricted","unmatched","unavailable"];
const str=(v,n=20000)=>typeof v==="string"&&v.length<=n;
const stamp=v=>typeof v==="string"&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&!Number.isNaN(Date.parse(v));
const optional=v=>v===null||str(v);
function valid(d,receipt){
 return d&&d.schema===SCHEMA&&d.campaign_id===CAMPAIGN&&d.receipt_id===receipt&&stamp(d.generated_at)&&
  Array.isArray(d.events)&&d.events.length<=500&&new Set(d.events.map(e=>e&&e.id)).size===d.events.length&&
  d.events.every(e=>e&&ID.test(e.id)&&KINDS.includes(e.kind)&&STATES.includes(e.status)&&DIRECTIONS.includes(e.direction)&&
   str(e.title,160)&&stamp(e.recorded_at)&&(e.occurred_at===null||stamp(e.occurred_at))&&str(e.source,100)&&str(e.source_event_id,160)&&
   str(e.evidence,600)&&optional(e.body)&&optional(e.transcript)&&optional(e.summary)&&
   (e.recording_id===null||ID.test(e.recording_id)))&&
  Array.isArray(d.coverage)&&d.coverage.every(c=>c&&str(c.label,100)&&COVERAGE.includes(c.status)&&str(c.note,600))&&
  typeof d.truncated==="boolean";
}
window.GlassmanLeadActivity=function({request,getSession,getGeneration,lock}){
 const el=id=>document.getElementById(id);
 let selected=null,data=null,version=0,objectURLs=[],players=[];
 const when=v=>new Date(v).toLocaleString("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",second:"2-digit"})+" ET";
 function stopAudio(){for(const p of players){p.pause();p.removeAttribute("src");p.load();}players=[];for(const u of objectURLs)URL.revokeObjectURL(u);objectURLs=[];}
 function wipe(){stopAudio();data=null;el("activity-events").replaceChildren();el("activity-coverage").replaceChildren();el("activity-status").textContent="";}
 function clear(){version++;selected=null;wipe();el("activity-title").textContent="";el("activity-contact").textContent="";el("activity-filter").value="all";el("lead-activity").hidden=true;}
 function current(v,g,r){return v===version&&g===getGeneration()&&getSession()&&selected?.receipt_id===r;}
 function textNode(tag,text,cls){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;}
 function disclosure(label,value,parent){if(!value)return;const d=document.createElement("details");d.append(textNode("summary",label),textNode("pre",value));parent.append(d);}
 async function audioFor(event,button,holder){
  const v=version,g=getGeneration(),r=selected.receipt_id;if(button.disabled)return;button.disabled=true;
  button.textContent="Loading recording…";
  try{
   const response=await request("/lead-activity/"+encodeURIComponent(r)+"/recordings/"+encodeURIComponent(event.recording_id),null,getSession(),true);
   if(!current(v,g,r))return;
   const mime=(response.headers.get("content-type")||"").split(";")[0];
   if(!["audio/mpeg","audio/mp4","audio/wav","audio/x-wav","audio/ogg","audio/webm"].includes(mime))throw new Error("Unexpected audio");
   const bytes=await response.blob();if(!current(v,g,r))return;
   if(bytes.size>25000000)throw new Error("Recording too large");
   const url=URL.createObjectURL(bytes);objectURLs.push(url);
   const player=document.createElement("audio");player.controls=true;player.preload="none";player.src=url;player.setAttribute("aria-label","Call recording");players.push(player);
   holder.append(player);button.remove();
  }catch(e){
   if(!current(v,g,r))return;
   if(e.status===401||e.status===403){lock();return;}
   button.textContent="Recording unavailable. Try again";button.disabled=false;
  }
 }
 function render(){
  stopAudio();const list=el("activity-events");list.replaceChildren();
  const filter=el("activity-filter").value;
  const rows=data.events.filter(e=>filter==="all"||e.kind===filter).sort((a,b)=>Date.parse(b.occurred_at||b.recorded_at)-Date.parse(a.occurred_at||a.recorded_at)||a.id.localeCompare(b.id));
  if(!rows.length)list.append(textNode("li",data.events.length?"No activity of this type was captured.":"No linked activity was captured for this lead.","empty-state"));
  for(const e of rows){
   const li=document.createElement("li");li.className="event event-"+e.kind;
   li.append(textNode("p",e.kind.toUpperCase()+" · "+e.status+" · "+e.direction,"event-label"),textNode("h4",e.title));
   li.append(textNode("p",when(e.occurred_at||e.recorded_at)+(e.occurred_at?"":" · time recorded; event time unavailable"),"event-time"));
   li.append(textNode("p",e.evidence));
   disclosure("Message",e.body,li);disclosure("Transcript",e.transcript,li);disclosure("Summary",e.summary,li);
   if(e.recording_id){const b=textNode("button","Load recording");b.type="button";b.addEventListener("click",()=>audioFor(e,b,li));li.append(b);}
   const proof=document.createElement("details");proof.className="provenance";proof.append(textNode("summary","Source evidence"),textNode("p",e.source+" · event "+e.source_event_id),textNode("p","Recorded "+when(e.recorded_at)));li.append(proof);list.append(li);
  }
  const coverage=el("activity-coverage");coverage.replaceChildren(textNode("h4","What this timeline covers"));
  for(const c of data.coverage)coverage.append(textNode("p",c.label+": "+c.status.replaceAll("_"," ")+". "+c.note));
  el("activity-status").textContent="Updated "+when(data.generated_at)+". "+(data.truncated?"Showing the latest 500 events; older activity is not included.":"Only linked source records are shown. Missing evidence is not a negative outcome.");
 }
 async function open(lead){
  if(!getSession()||!RECEIPT.test(lead.receipt_id))return;
  clear();selected=lead;const v=version,g=getGeneration(),r=lead.receipt_id;
  el("lead-activity").hidden=false;el("activity-title").textContent=((lead.first_name+" "+lead.last_name).trim()||"Lead")+" · "+r;
  el("activity-contact").textContent=[lead.phone,lead.email].filter(Boolean).join(" · ");el("activity-status").textContent="Loading recorded activity…";
  el("activity-title").focus();
  try{const d=await request("/lead-activity/"+encodeURIComponent(r),null,getSession());
   if(!current(v,g,r))return;if(!valid(d,r))throw new Error("Unexpected activity");data=d;render();
  }catch(e){
   if(!current(v,g,r))return;
   if(e.status===401||e.status===403){lock();return;}
   wipe();
   el("activity-status").textContent=e.status===403?"Detailed activity is not included in your access.":e.status===404?"The activity connection is not available for this lead yet.":"Activity could not be loaded. Close and reopen the lead to retry.";
  }
 }
 function reconcile(leads){if(selected&&!leads.some(l=>l.receipt_id===selected.receipt_id))clear();}
 el("activity-close").addEventListener("click",()=>{clear();el("lead-search").focus();});
 el("activity-filter").addEventListener("change",()=>{if(data){version++;render();}});
 return {open,clear,reconcile};
};
})();
