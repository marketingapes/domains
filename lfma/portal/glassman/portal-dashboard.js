/* Authenticated, read-only reporting. No fixtures, writes, provider URLs or durable browser storage. */
(() => {
'use strict';
const CAMPAIGN='GLASSMAN-SSDI-002',RECEIPT=/^BTLK-[0-9A-F]{10}$/;
const known=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'));
const stamp=v=>typeof v==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&!Number.isNaN(Date.parse(v));
const str=(v,n=1000)=>typeof v==='string'&&v.length<=n;
const optional=(v,check)=>v===null||check(v);
const channelKey=v=>typeof v==='string'&&/^[a-z0-9_:-]{1,80}$/.test(v);
const channels={meta:'Meta',google:'Google Ads',bing:'Bing',tiktok:'TikTok',openai:'ChatGPT',direct_or_unknown:'Direct or unknown'};
const stages={received:'Received by firm',contacted:'Contacted by firm',intake_complete:'Intake complete',declined:'Declined',signed:'Signed',closed_lost:'Closed / not retained'};
const label=v=>channels[v]||v.replace(/^other:/,'Other: ');
function validMarketing(d){
 return d&&d.schema==='glassman.marketing-report/v1'&&d.campaign_id===CAMPAIGN&&stamp(d.generated_at)&&d.timezone==='America/New_York'&&
 d.range&&day(d.range.start)&&day(d.range.end)&&d.range.start<=d.range.end&&typeof d.spend_visible==='boolean'&&
 Array.isArray(d.rows)&&d.rows.length<=10000&&new Set(d.rows.map(r=>r?.date+'|'+r?.channel)).size===d.rows.length&&
 d.rows.every(r=>r&&day(r.date)&&r.date>=d.range.start&&r.date<=d.range.end&&channelKey(r.channel)&&optional(r.leads,integer)&&optional(r.spend,known)&&optional(r.impressions,integer)&&optional(r.clicks,integer)&&optional(r.source,v=>str(v,200))&&optional(r.loaded_at,stamp))&&
 d.coverage&&str(d.coverage.note,3000)&&Array.isArray(d.coverage.channels)&&d.coverage.channels.every(c=>c&&channelKey(c.channel)&&str(c.label,100)&&typeof c.spend_loaded==='boolean'&&typeof c.leads_loaded==='boolean');
}
function validStatus(d){
 return d&&d.schema==='glassman.lead-status/v1'&&d.campaign_id===CAMPAIGN&&stamp(d.generated_at)&&d.capabilities&&d.capabilities.can_update===false&&str(d.capabilities.reason,1000)&&
 Array.isArray(d.leads)&&d.leads.length<=500&&new Set(d.leads.map(l=>l?.receipt_id)).size===d.leads.length&&
 d.leads.every(l=>l&&RECEIPT.test(l.receipt_id)&&(l.stage===null||Object.hasOwn(stages,l.stage))&&optional(l.stage_date,day)&&optional(l.loaded_at,stamp)&&optional(l.lawruler_lead_id,v=>str(v,100))&&optional(l.source_note,v=>str(v,1000))&&optional(l.reported_by,v=>str(v,200)));
}
window.GlassmanDashboard=function({request,getSession,getGeneration,lock,openActivity}){
 const $=id=>document.getElementById(id),node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n),number=n=>n.toLocaleString('en-US');
 const date=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
 const when=d=>d?new Date(d).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'})+' ET':'Unknown';
 const sum=(rs,key)=>rs.reduce((s,r)=>s+(known(r[key])?r[key]:0),0);
 let report=null,leads=[],outcomes=null,marketingVersion=0,statusVersion=0;
 function active(v,g,kind){return v===(kind==='marketing'?marketingVersion:statusVersion)&&g===getGeneration()&&!!getSession();}
 const metric=(title,value,note)=>{const card=node('article',undefined,'metric-card');card.append(node('h3',title),node('strong',value),node('p',note));return card;};
 function clearMarketing(){report=null;$('daily-chart').setAttribute('aria-label','No marketing detail loaded');$('report-period').disabled=false;$('report-channel').disabled=false;for(const id of ['marketing-kpis','daily-chart','spend-bars','performance-body'])$(id).replaceChildren();for(const id of ['marketing-window','marketing-scope','daily-note','coverage-label','marketing-source'])$(id).textContent='';$('marketing-freshness').textContent='Not loaded';$('marketing-feedback').textContent='Marketing report requires signed-in access.';}
 function clearStatus(){statusVersion++;leads=[];outcomes=null;for(const id of ['status-counts','status-cards'])$(id).replaceChildren();$('status-feedback').textContent='Lead status requires contact access.';$('status-capability').textContent='Status updates are not enabled. No case records are changed by this portal.';$('status-filter').value='all';}
 function clear(){marketingVersion++;clearMarketing();clearStatus();$('report-channel').replaceChildren();const o=node('option','All channels');o.value='all';$('report-channel').append(o);$('report-channel').value='all';}
 function summarize(rows){
  const spendRows=rows.filter(r=>known(r.spend)),leadRows=rows.filter(r=>integer(r.leads)),clickRows=rows.filter(r=>integer(r.clicks)),impressionRows=rows.filter(r=>integer(r.impressions));
  const matched=rows.filter(r=>known(r.spend)&&integer(r.leads)),ctrRows=rows.filter(r=>integer(r.clicks)&&integer(r.impressions));
  return {spend:spendRows.length?sum(spendRows,'spend'):null,leads:leadRows.length?sum(leadRows,'leads'):null,clicks:clickRows.length?sum(clickRows,'clicks'):null,impressions:impressionRows.length?sum(impressionRows,'impressions'):null,cpl:sum(matched,'leads')?sum(matched,'spend')/sum(matched,'leads'):null,ctr:sum(ctrRows,'impressions')?sum(ctrRows,'clicks')/sum(ctrRows,'impressions')*100:null};
 }
 const show=(v,fmt=number)=>v===null?'Unknown':fmt(v);
 function renderMarketing(){
  if(!report)return;const selected=$('report-channel').value,rows=report.rows.filter(r=>selected==='all'||r.channel===selected),tot=summarize(rows);
  const visible=new Map(report.coverage.channels.filter(c=>selected==='all'||c.channel===selected).map(c=>[c.channel,c]));
  for(const r of rows)if(!visible.has(r.channel))visible.set(r.channel,{channel:r.channel,label:label(r.channel),spend_loaded:false,leads_loaded:false});
  $('marketing-window').textContent=date(report.range.start)+'–'+date(report.range.end)+' · Eastern reporting dates';
  $('marketing-kpis').replaceChildren(metric('Loaded ad spend',report.spend_visible?show(tot.spend,money):'Restricted','Source records only; incomplete coverage is possible'),metric('Saved requests',show(tot.leads),'Deduplicated non-test requests in this selection'),metric('Cost / request',report.spend_visible?show(tot.cpl,money):'Restricted','Only matched dates with loaded spend and request counts'),metric('Ad clicks',report.spend_visible?show(tot.clicks):'Restricted',report.spend_visible?show(tot.impressions)+' impressions · '+show(tot.ctr,n=>n.toFixed(2)+'%')+' CTR':'Ad metrics are not included in your access'));
  $('marketing-scope').textContent=report.coverage.note;
  const byDay=new Map();for(const r of rows){if(!byDay.has(r.date))byDay.set(r.date,[]);byDay.get(r.date).push(r);}
  const daily=[...byDay].sort(([a],[b])=>a.localeCompare(b)).map(([d,rs])=>({date:d,count:rs.some(r=>integer(r.leads))?sum(rs,'leads'):null}));
  const chart=$('daily-chart');chart.replaceChildren();chart.setAttribute('aria-label','Recorded requests by date: '+(daily.map(d=>date(d.date)+' '+(d.count??'unknown')).join('; ')||'no loaded records'));
  if(!daily.length)chart.append(node('p','No loaded records for this selection.','chart-empty'));
  const max=Math.max(...daily.map(d=>d.count||0),1);for(const d of daily){const col=node('div',undefined,'chart-column'),track=node('div',undefined,'chart-track'),bar=node('div',undefined,'chart-bar'+(d.count===null?' unknown':''));bar.style.height=((d.count||0)/max*100)+'%';bar.setAttribute('aria-hidden','true');bar.append(node('span',d.count===null?'?':String(d.count)));track.append(bar);col.append(track,node('span',date(d.date),'chart-date'));chart.append(col);}
  $('daily-note').textContent='Only dates returned by the source are shown. Missing data is not zero requests.';
  const body=$('performance-body'),bars=$('spend-bars');body.replaceChildren();bars.replaceChildren();let loaded=0;
  for(const [id,c] of visible){const rs=rows.filter(r=>r.channel===id),t=summarize(rs),tr=node('tr'),name=node('th');name.scope='row';name.append(node('strong',c.label),node('small',c.spend_loaded?'Spend records loaded':'Spend not loaded'));tr.append(name);
   const values=[report.spend_visible?show(t.spend,money):'Restricted',report.spend_visible?show(t.impressions):'Restricted',report.spend_visible?show(t.clicks):'Restricted',report.spend_visible?show(t.ctr,n=>n.toFixed(2)+'%'):'Restricted',show(t.leads),report.spend_visible?show(t.cpl,money):'Restricted'];for(const v of values)tr.append(node('td',v));body.append(tr);
   if(c.spend_loaded)loaded++;const item=node('div',undefined,'spend-item'),head=node('div',undefined,'spend-item-head');head.append(node('strong',c.label),node('span',report.spend_visible?show(t.spend,money):'Restricted'));item.append(head);const track=node('div',undefined,'spend-track'),bar=node('div',undefined,'spend-fill '+(id==='google'?'teal':'blue'));bar.style.width=report.spend_visible&&tot.spend&&t.spend!==null?t.spend/tot.spend*100+'%':'0%';track.append(bar);item.append(track);bars.append(item);
  }
  if(!visible.size){const tr=node('tr'),td=node('td','No channel records loaded.');td.colSpan=7;tr.append(td);body.append(tr);}
  $('coverage-label').textContent=loaded+' of '+visible.size+' channels have spend records';
  const times=rows.map(r=>r.loaded_at).filter(Boolean).sort();$('marketing-freshness').textContent=times.length?'Latest spend load: '+when(times.at(-1)):'Spend freshness unknown';
  $('marketing-source').textContent=[...new Set(rows.map(r=>r.source).filter(Boolean))].join(' · ')||'No ad source records loaded';
 }
 async function overviewFallback(v,g){
  try{const d=await request('/web-summary?v=2',null,getSession());if(!active(v,g,'marketing'))return true;
   const total=d?.schema==='glassman.web-summary/v2'?d.totals?.real_leads:d?.schema==='glassman.web-summary/v1'?d.web_requests:null;
   if(d?.campaign_id!==CAMPAIGN||!stamp(d.generated_at)||!integer(total))return false;
   $('marketing-kpis').replaceChildren(metric('Saved requests',number(total),'All recorded dates · existing overview total'),metric('Ad spend','Restricted / unavailable','Detailed marketing access is not enabled'),metric('Cost / request','Unknown','No aligned spend data in this overview'),metric('Ad clicks','Unknown','Not available in this overview'));
   $('marketing-window').textContent='All recorded dates · overview totals only';$('report-period').disabled=true;$('report-channel').disabled=true;
   $('marketing-feedback').textContent='Showing the existing overview total. Detailed marketing access or its connection is not enabled.';
   $('marketing-scope').textContent='This count comes from the existing authenticated overview. Its existing test-exclusion rules apply. It is not filtered to the selected period; no ad metrics are inferred.';
   $('daily-chart').setAttribute('aria-label','Daily breakdown unavailable in this overview');$('daily-chart').replaceChildren(node('p','Daily breakdown unavailable in this overview.','chart-empty'));$('marketing-freshness').textContent='Detailed source freshness unavailable';return true;
  }catch(e){if(!active(v,g,'marketing'))return true;if(e.status===401){lock();return true;}return false;}
 }
 async function loadMarketing(g=getGeneration()){
  if(!getSession())return;const v=++marketingVersion;clearMarketing();$('marketing-feedback').textContent='Loading source-backed marketing report…';
  try{const days=['7','30','90'].includes($('report-period').value)?$('report-period').value:'30';const d=await request('/marketing-report?days='+days,null,getSession());if(!active(v,g,'marketing'))return;if(!validMarketing(d))throw Error('Invalid report');report=d;
   const prev=$('report-channel').value,keys=new Map(d.coverage.channels.map(c=>[c.channel,c.label]));for(const r of d.rows)if(!keys.has(r.channel))keys.set(r.channel,label(r.channel));$('report-channel').replaceChildren();for(const [value,title] of [['all','All channels'],...keys]){const opt=node('option',title);opt.value=value;$('report-channel').append(opt);}$('report-channel').value=keys.has(prev)?prev:'all';renderMarketing();$('marketing-feedback').textContent='Report generated '+when(d.generated_at)+'. Source freshness may be older.';
  }catch(e){if(!active(v,g,'marketing'))return;if(e.status===401){lock();return;}clearMarketing();if((e.status===403||e.status===404)&&await overviewFallback(v,g))return;if(!active(v,g,'marketing'))return;$('marketing-feedback').textContent=e.status===403?'Marketing details are not included in your access.':e.status===404?'The detailed marketing connection is not enabled yet. No demonstration figures are substituted.':'Marketing data could not be loaded. Change the period to retry.';}
 }
 function renderStatus(){
  if(!outcomes)return;const records=new Map(outcomes.leads.map(l=>[l.receipt_id,l])),filter=$('status-filter').value;
  const counts=$('status-counts');counts.replaceChildren();const reported=leads.filter(l=>records.get(l.receipt_id)?.stage!==null&&records.get(l.receipt_id)?.stage!==undefined).length;
  for(const [value,title] of [[leads.length-reported,'Awaiting update'],[reported,'Reported outcomes'],[leads.filter(l=>records.get(l.receipt_id)?.stage==='signed').length,'Reported signed'],[leads.length,'Accessible leads']]){const c=node('div',undefined,'status-count');c.append(node('strong',String(value)),node('span',title));counts.append(c);}
  const cards=$('status-cards');cards.replaceChildren();let shown=0;
  for(const lead of leads){const record=records.get(lead.receipt_id),stage=record?.stage||null;if(filter==='waiting'&&stage||filter==='reported'&&!stage)continue;shown++;const card=node('article',undefined,'status-card'),head=node('div',undefined,'status-card-top'),identity=node('div');
   identity.append(node('h3',(lead.first_name+' '+lead.last_name).trim()||'Lead'),node('p',lead.receipt_id,'lead-ref'));head.append(identity,node('span',stage?'Reported: '+stages[stage]:'Awaiting firm update','lead-status status-'+(stage==='signed'?'retained':stage?'review':'waiting')));card.append(head);
   card.append(node('p',lead.lawruler_lead_id?'CRM record reference captured. This is not proof of intake acceptance.':'No verified CRM record ID captured.','evidence-line'));
   const info=node('div',undefined,'next-step');info.append(node('span','Firm outcome','small-label'),node('p',stage?'Firm reported '+stages[stage].toLowerCase()+(record.stage_date?' on '+date(record.stage_date):'')+'.':'No linked firm outcome is available. This does not mean the firm has not acted.'));card.append(info);
   if(stage){const proof=node('details');proof.append(node('summary','Outcome source'),node('p',record.source_note||'Firm outcome record'),node('p','Loaded '+when(record.loaded_at)));card.append(proof);}
   const update=node('button','Update status','update-status');update.type='button';update.disabled=true;update.title=outcomes.capabilities.reason;card.append(update);const activity=node('button','View evidence','secondary');activity.type='button';activity.addEventListener('click',()=>{if(getSession()&&leads.some(l=>l.receipt_id===lead.receipt_id))openActivity(lead);});card.append(activity,node('p','Updates are not connected. No changes will be saved.','metric-note'));cards.append(card);
  }
  if(!shown)cards.append(node('div','No accessible leads match this status.','empty-state'));
 }
 async function setLeads(next,g=getGeneration()){
  if(!getSession()){clearStatus();return;}
  const v=++statusVersion;leads=next;outcomes=null;for(const id of ['status-counts','status-cards'])$(id).replaceChildren();$('status-feedback').textContent='Loading reported firm outcomes…';
  try{const d=await request('/lead-status',null,getSession());if(!active(v,g,'status'))return;if(!validStatus(d))throw Error('Invalid statuses');const allowed=new Set(leads.map(l=>l.receipt_id));outcomes={...d,leads:d.leads.filter(l=>allowed.has(l.receipt_id))};renderStatus();$('status-capability').textContent=d.capabilities.reason;$('status-feedback').textContent='Firm outcomes refreshed '+when(d.generated_at)+'. Only records linked to your accessible leads are shown.';
  }catch(e){if(!active(v,g,'status'))return;if(e.status===401||e.status===403){lock();return;}outcomes=null;for(const id of ['status-counts','status-cards'])$(id).replaceChildren();$('status-feedback').textContent=e.status===403?'Lead status is not included in your access.':e.status===404?'The firm-outcome connection is not enabled yet. No assumed statuses are shown.':'Firm outcomes could not be loaded. No unverified status is shown.';}
 }
 $('report-period').addEventListener('change',()=>loadMarketing());$('report-channel').addEventListener('change',renderMarketing);$('status-filter').addEventListener('change',renderStatus);
 return {loadMarketing,setLeads,clear,clearStatus};
};
})();
