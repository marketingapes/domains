/** Deterministic staging compiler: no network, credentials, model calls or provider writes. */
const LIMITS = Object.freeze({firm_name:160,tort:200,target_states:300,qualification_criteria:3000,brand:500,public_assets:500,crm:100,delivery_method:100,intake_destination:500,intake_hours:300,integration_notes:3000});
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const choices = Object.freeze({consultation:['Request a conversation','A straightforward form to start a conversation with the firm.'],sofia:['Meet Sofia','An AI-assisted introduction for basic questions and callback preferences.'],quiz:['Start with a few questions','A short introduction based on the firm’s reviewed campaign criteria.']});
function normalize(raw){
 if(!raw || typeof raw!=='object' || Array.isArray(raw))throw new Error('Campaign brief must be an object.');
 const brief={};
 for(const [key,max] of Object.entries(LIMITS)){
  const v=raw[key]??'';
  if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw new Error(`Invalid ${key}.`);
  brief[key]=v.trim();
 }
 for(const key of ['firm_name','tort','target_states'])if(!brief[key])throw new Error(`Please complete ${key.replaceAll('_',' ')}.`);
 return brief;
}
function fingerprint(text){let hash=2166136261;for(const char of text){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');}
function renderLanding(brief,path){
 const [cta,explain]=choices[path], firm=escape(brief.firm_name),tort=escape(brief.tort),geo=escape(brief.target_states);
 const initials=escape(brief.firm_name.split(/\s+/).map(x=>x[0]).join('').slice(0,3).toUpperCase());
 const accent=brief.brand.match(/(?:^|\s)(#[a-f\d]{6})(?=\s|$)/i)?.[1]||'#166c57';
 const questions=path==='quiz'?'<ol><li>Where are you located?</li><li>What would you like the firm to review?</li><li>What is the best way to contact you?</li></ol>':path==='sofia'?'<p>“Hi, I’m Sofia, an AI assistant. I can help collect a little information for the firm.”</p>':'<p>Name · email · phone · a short description of your inquiry</p>';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'"><title>${firm} · ${tort} campaign concept</title><style>*{box-sizing:border-box}body{margin:0;color:#172923;background:#f4f6f3;font:17px/1.6 system-ui,sans-serif}.notice{background:#172923;color:white;padding:12px 5vw;font-size:13px}header,main,footer{max-width:1050px;margin:auto;padding:28px 6vw}.brand{display:flex;align-items:center;gap:16px;font-weight:750}.mark{background:${accent};color:white;padding:12px;border-radius:14px}h1{font-size:clamp(36px,6vw,70px);line-height:1.08;letter-spacing:-.04em;margin:24px 0}h2{font-size:25px;line-height:1.2}.eyebrow{font-weight:750;color:${accent};text-transform:uppercase;font-size:13px;letter-spacing:.12em}.layout{display:grid;grid-template-columns:1.2fr 1fr;gap:36px;margin:35px 0}.card{padding:28px;background:white;border:1px solid #d4dfd7;border-radius:22px;box-shadow:0 8px 40px #18342608}.cta{padding:16px;border-radius:12px;background:${accent};color:white;text-align:center;font-weight:700}.fine{font-size:13px;color:#52665b}footer{border-top:1px solid #d4dfd7}@media(max-width:700px){.layout{grid-template-columns:1fr;gap:16px}header,main,footer{padding:22px 5vw}}</style></head><body><div class="notice">Campaign concept · not a live intake page · no information is collected</div><header><div class="brand"><span class="mark">${initials}</span>${firm}</div></header><main><span class="eyebrow">${geo} · ${tort}</span><h1>Start a conversation about ${tort}.</h1><p>Connect with ${firm} to discuss your questions and next steps.</p><div class="layout"><section><h2>A clearer first step.</h2><p>${explain}</p><p>This draft shows the campaign experience before the firm reviews its language, criteria and integrations.</p><p class="fine">Geography supplied by the firm: ${geo}. Case eligibility and representation are determined by the firm, not this preview.</p></section><section class="card"><span class="eyebrow">${path==='sofia'?'AI introduction concept':'Intake concept'}</span><h2>${cta}</h2>${questions}<div class="cta">${cta} · preview only</div><p class="fine">${path==='sofia'?'Voice, calling and scheduling are not connected.':'Form fields and submissions are not connected.'} Nothing is sent from this page.</p></section></div></main><footer><strong>${firm}</strong><p class="fine">Draft campaign material for review. No results or legal eligibility are promised. Approved copy, disclosures, consent capture, tracking and lead delivery must be configured and tested before publication.</p></footer></body></html>`;
}
export function createCampaignBundle(raw){
 const brief=normalize(raw),id='draft-'+fingerprint(JSON.stringify(brief));
 const missing=[];
 for(const [key,label] of [['qualification_criteria','Firm-approved qualification criteria'],['brand','Brand direction'],['crm','CRM choice'],['delivery_method','Delivery method'],['intake_destination','Intake destination'],['intake_hours','Hours and timezone']])if(!brief[key])missing.push(label);
 const manifest={schema:'lfma.campaign_build_request.v1',campaign_id:id,status:'preview_generated',environment:'local_staging',brief,offer:{currency:'USD',service_fee:2500,media_budget:7500,total:10000},pages:Object.keys(choices).map(kind=>({kind,file:`${id}-${kind}.html`,status:'concept_generated',published:false})),channels:['facebook_instagram','google_search','google_pmax','tiktok','openai_ads'].map(channel=>({channel,status:'not_provisioned',account_id:null})),integration:{status:'not_connected',crm:brief.crm||null,delivery:brief.delivery_method||null},missing_details:missing,requires_before_launch:['Firm review of copy and qualification criteria','Account-specific campaign configuration and platform eligibility','Connected intake, consent, attribution and verified end-to-end test','Approved budget and launch instruction'],receipt:{server_job_id:null,persisted:false},activity:{advertising_activated:false,messages_sent:false,invoice_created:false}};
 return {manifest,pages:Object.fromEntries(Object.keys(choices).map(kind=>[kind,renderLanding(brief,kind)]))};
}
export function mountCampaignPreview(root,raw){
 const bundle=createCampaignBundle(raw),doc=root.ownerDocument;
 root.replaceChildren();root.hidden=false;
 function text(tag,value){const node=doc.createElement(tag);node.textContent=value;return node;}
 root.append(text('h3','Your campaign preview is built'),text('p','Three branded concepts generated from your brief. These are local review drafts, not published pages or connected campaigns. The email request is handled separately.'));
 const frame=doc.createElement('iframe');frame.title='Branded campaign page preview';frame.setAttribute('sandbox','');frame.style.cssText='width:100%;height:620px;border:1px solid #59665e;border-radius:14px;background:white';frame.srcdoc=bundle.pages.consultation;
 const tabs=doc.createElement('div');tabs.className='actions';
 function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),link=doc.createElement('a');link.href=url;link.download=name;doc.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 for(const kind of Object.keys(choices)){const button=text('button',kind==='consultation'?'Form page':kind==='sofia'?'Sofia page':'Quiz page');button.type='button';button.className='btn ghost small';button.addEventListener('click',()=>{frame.srcdoc=bundle.pages[kind];});tabs.append(button);}
 root.append(tabs,frame);
 const downloads=doc.createElement('div');downloads.className='actions';
 for(const kind of Object.keys(choices)){const button=text('button','Download '+kind+' HTML');button.type='button';button.className='btn ghost small';button.addEventListener('click',()=>download(`${bundle.manifest.campaign_id}-${kind}.html`,bundle.pages[kind],'text/html'));downloads.append(button);}
 const json=text('button','Download campaign brief');json.type='button';json.className='btn ghost small';json.addEventListener('click',()=>download(`${bundle.manifest.campaign_id}.json`,JSON.stringify(bundle.manifest,null,2),'application/json'));downloads.append(json);root.append(downloads);
 root.append(text('p',bundle.manifest.missing_details.length?'Still needed: '+bundle.manifest.missing_details.join(' · '):'Brief details supplied. Firm review, account setup and connection tests still required.'));
 return bundle;
}
