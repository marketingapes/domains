import assert from 'node:assert/strict';
import {validateExpansion} from './validate-expansion.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
export const packageDir=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');

// Strict RFC4180-style records: quoted commas/newlines and escaped quotes are
// accepted; malformed quoting, duplicate headers and ragged rows fail closed.
export function parseCSV(text){
 const records=[];let record=[],field='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c==='"'){assert.equal(field,'','quote inside unquoted field');assert.equal(closed,false,'quote after closing quote');quoted=true;continue;}
  if(c===','||c==='\r'||c==='\n'){
   record.push(field);field='';closed=false;
   if(c!==','){records.push(record);record=[];if(c==='\r'&&text[i+1]==='\n')i++;}continue;
  }
  assert.equal(closed,false,'characters after closing quote');field+=c;
 }
 assert.equal(quoted,false,'unterminated quoted field');
 if(field||record.length||closed){record.push(field);records.push(record);}
 assert.ok(records.length>1,'CSV requires header and data');
 const headers=records.shift();assert.equal(new Set(headers).size,headers.length,'duplicate CSV header');assert.ok(headers.every(Boolean),'empty CSV header');
 return {headers,rows:records.map(r=>{assert.equal(r.length,headers.length,'CSV row width');return Object.fromEntries(headers.map((h,i)=>[h,r[i]]));})};
}
export function validatePackage(dir=packageDir,{assetsRoot}={}){
 const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
 const off=(o,fields)=>{for(const f of fields)assert.equal(o[f],false,`${f} must be false`);};
 const text=(s,max)=>assert.ok(typeof s==='string'&&s.length>0&&s.length<=max,`copy length exceeds ${max}: ${s}`);
 const m=read('manifest.json');off(m,['activation','calls_enabled','form_submissions_enabled','buyer_delivery_enabled','deploy_enabled']);assert.equal(m.spend_authorized_usd,0);assert.equal(m.approved_budget_usd,null);const plan=m.owner_confirmed_media_plan;assert.equal(plan.total_usd,5000);assert.equal(plan.duration_days,14);assert.equal(plan.meta_website_usd,3000);assert.equal(plan.google_search_usd,2000);assert.equal(plan.meta_website_campaign_id,'52603475656795');assert.equal(plan.google_search_campaign_id,'24313116842');off(plan,['platform_settings_applied','launch_authorized_now']);
 assert.equal(new Intl.DateTimeFormat('en-US',{timeZone:'America/Phoenix',hour:'2-digit',hour12:false}).format(new Date(m.target_review_time)),'06');assert.equal(new Date(m.target_review_time).getUTCDay(),1);
 assert.equal(m.production.repository,'marketingapes/nil-site');assert.equal(m.production.website_endpoint,'https://legal-web-lead.onrender.com/api/v1/nil/web-lead');assert.ok(m.do_not_activate.some(x=>x.campaign_id==='24318918184'));
 for(const c of m.channels)off(c,['activation']);
 const website=[['W1','52603475744195','https://nearestinjurylawyers.com/mva-pi/'],['W2','52603492387395','https://nearestinjurylawyers.com/mva-pi/talk-to-sofia/'],['W3','52603492428795','https://nearestinjurylawyers.com/mva-pi/quiz/']];
 const meta=parseCSV(fs.readFileSync(path.join(dir,'meta-build-sheet.csv'),'utf8'));
 assert.deepEqual(meta.headers,['channel','path','existing_campaign_id','existing_ad_id','status','activation','primary_text','headline','description','cta','destination','review']);assert.equal(meta.rows.length,6);
 const allowed=new Map([...website.map(([p,id,url])=>[id,{campaign:'52603475656795',channel:'meta_website',path:p,url}]),['120254654776180231',{campaign:'120254654770780231',channel:'meta_native',path:'native',url:'existing form held'}],['120254654778590231',{campaign:'120254654771580231',channel:'meta_native',path:'native',url:'existing form held'}],['120254652218910231',{campaign:'120254652215690231',channel:'meta_call',path:'call',url:'existing tracker held pending reconciliation'}]]);
 assert.equal(new Set(meta.rows.map(r=>r.existing_ad_id)).size,6,'duplicate Meta IDs');
 for(const r of meta.rows){const expected=allowed.get(r.existing_ad_id);assert.ok(expected,'unknown Meta route ID');assert.equal(r.existing_campaign_id,expected.campaign);assert.equal(r.channel,expected.channel);assert.equal(r.path,expected.path);assert.equal(r.destination,expected.url);assert.equal(r.status,'PAUSED');assert.equal(r.activation,'false');text(r.primary_text,2000);text(r.headline,40);text(r.description,125);assert.equal(r.cta,r.channel==='meta_call'?'CALL_NOW':'LEARN_MORE');}
 const g=read('google-build.json');off(g,['activation']);off(g.shared,['conversion_uploads_enabled','customer_match','remarketing']);assert.equal(g.shared.status,'PAUSED');assert.equal(g.shared.approved_budget,null);assert.deepEqual(g.shared.sensitive_audiences,[]);assert.deepEqual(g.pmax.audience_signals,[]);off(g.pmax.audience_policy,['signals_are_targeting_limits','retargeting_only','eligibility_verified','sensitive_interest_remarketing_allowed']);const fp=g.shared.platform_feedback_policy;assert.equal(fp.status,'HOLD_EVENT_SPECIFIC_POLICY_PRIVACY_REVIEW');assert.equal(fp.internal_signed_reporting_separate,true);off(fp,['hashed_identifiers_establish_permission','click_id_import_blanket_exemption','sensitive_enhanced_conversion_uploads_allowed']);off(g.pmax,['new_asset_uploads','url_expansion','text_automation','image_automation','video_automation']);off(g.search,['search_partners','display','ai_max_expansion']);
 assert.equal(g.pmax.campaign_id,'24313118384');assert.equal(g.search.campaign_id,'24313116842');assert.equal(g.search.primary_destination_path,'W1');assert.equal(g.search.primary_destination_variants,1);
 assert.deepEqual(g.pmax.groups.map(x=>[x.id,x.path,x.final_url]),[['6754661608','W1',website[0][2]],['6754661503','W2',website[1][2]],['6754661833','W3',website[2][2]]]);
 assert.equal(g.pmax.headlines.length,15);assert.equal(g.pmax.long_headlines.length,5);assert.equal(g.pmax.descriptions.length,5);g.pmax.headlines.forEach(h=>text(h,30));g.pmax.long_headlines.forEach(h=>text(h,90));g.pmax.descriptions.forEach(h=>text(h,90));
 const rsa=parseCSV(fs.readFileSync(path.join(dir,'google-rsa-review.csv'),'utf8'));
 assert.deepEqual(rsa.headers,['Campaign ID','Ad group ID','Ad ID','Ad type','Status','Final URL',...Array.from({length:15},(_,i)=>`Headline ${i+1}`),...Array.from({length:4},(_,i)=>`Description ${i+1}`)]);assert.equal(rsa.rows.length,3);
 assert.deepEqual(rsa.rows.map(r=>[r['Ad group ID'],r['Ad ID']]),[['203621828871','826676232387'],['200795346196','826676256447'],['199437080774','826676256462']]);
 for(const r of rsa.rows){assert.equal(r['Campaign ID'],g.search.campaign_id);assert.equal(r.Status,'Paused');assert.equal(r['Ad type'],'Responsive search ad');assert.equal(r['Final URL'],website[0][2]);for(let i=1;i<=15;i++)text(r[`Headline ${i}`],30);for(let i=1;i<=4;i++)text(r[`Description ${i}`],90);}
 const n=read('native-form-review.json');off(n,['activation','callback_enabled','buyer_delivery_enabled','sms_enabled','email_enabled']);assert.equal(n.existing_page_id,'1275847145612714');assert.equal(n.existing_form_id,'3518249671686937');assert.equal(n.existing_delivery_mode,'receipt_only_hold');assert.equal(n.new_form_id,null);for(const p of n.permission_fields)assert.equal(p.default,false);assert.equal(hash(n.draft_disclosure),n.disclosure_sha256);
 assert.ok(n.questions_excluded.includes('injury'));assert.ok(n.questions_excluded.includes('medical care'));
 const t=read('tracking-intake-contract.json');off(t,['activation']);off(t.routing,['automated_eligibility_rejection','buyer_delivery_enabled','calls_enabled','sms_enabled','email_enabled']);assert.equal(t.routing.human_review_required,true);assert.equal(t.routing.phone_route.nil,'+16026931461');assert.equal(t.routing.phone_route.phillips,'+16022003976');assert.equal(t.routing.website_gate_independent_of_native,true);assert.equal(t.routing.website_endpoint,m.production.website_endpoint);assert.equal(t.routing.native_nil.page_id,n.existing_page_id);assert.equal(t.routing.native_nil.form_id,n.existing_form_id);assert.equal(t.routing.native_nil.mode,'receipt_only_hold');assert.equal(t.routing.native_nil.source_verifier,'PENDING');assert.equal(t.routing.native_nil.callback_policy_enabled,false);assert.equal(t.routing.native_btl.page_id,'222081604317115');assert.equal(t.routing.native_btl.form_id,'2292029301564102');
 for(const f of ['lead_id','claim_id','gclid','fbclid','ttclid','consent_sha256','trustedform_cert_url'])assert.ok(t.fields.includes(f));
 const ai=read('ai-intake-review.json');off(ai,['activation','calls_enabled','sms_enabled','email_enabled','buyer_delivery_enabled']);assert.equal(ai.optional_private_health_questions.length,2);for(const q of ai.optional_private_health_questions){assert.equal(q.required,false);assert.equal(q.scope,'private_intake_human_review_only');assert.equal(q.ad_platform_collection,false);assert.equal(q.automated_eligibility_decision,false);}
 const support=read('tiktok-youtube-organic-build.json');off(support,['activation']);off(support.organic,['publication_enabled']);off(support.followup,['email_enabled','sms_enabled']);assert.equal(support.tiktok_paid.status,'INELIGIBLE_US_PERSONAL_INJURY');assert.equal(support.tiktok_paid.policy_eligibility,'INELIGIBLE');off(support.tiktok_paid,['paid_activation_allowed','educational_acquisition_workaround_allowed']);assert.equal(support.tiktok_paid.destination,null);assert.equal(support.tiktok_paid.caption,null);const paidTikTok=m.channels.find(c=>c.row_id==='tiktok-paid');assert.equal(paidTikTok.status,'INELIGIBLE_US_PERSONAL_INJURY');assert.equal(paidTikTok.policy_eligibility,'INELIGIBLE');assert.equal(support.youtube.paid_status,'HOLD_NO_ACCOUNT_BUILD');assert.equal(support.tiktok_paid.approved_budget,null);assert.equal(support.tiktok_paid.campaign_id,null);assert.equal(support.tiktok_paid.adgroup_id,null);assert.deepEqual(support.tiktok_paid.sensitive_audiences,[]);
 const a=read('asset-manifest.json');off(a,['activation']);assert.equal(a.assets.length,6);
 for(const x of a.assets){assert.equal(x.repository,'marketingapes/nil-site');assert.match(x.sha256,/^[a-f0-9]{64}$/);assert.ok(Number.isInteger(x.bytes)&&x.bytes>0);assert.ok(!path.isAbsolute(x.path)&&!x.path.split('/').includes('..'));}
 let assetVerification='NOT RUN: external nil-site asset bytes; pass --assets-root to verify presence, size and SHA256.';
 if(assetsRoot){assert.ok(fs.statSync(assetsRoot).isDirectory(),'asset root missing');for(const x of a.assets){const b=fs.readFileSync(path.join(assetsRoot,x.path));assert.equal(hash(b),x.sha256,`asset hash ${x.path}`);assert.equal(b.length,x.bytes,`asset size ${x.path}`);}assetVerification=`PASS: ${a.assets.length} source assets present; sizes and SHA256 verified.`;}
 const preview=fs.readFileSync(path.join(dir,'review.html'),'utf8');assert.match(preview,/connect-src 'none'/);assert.match(preview,/form-action 'none'/);assert.doesNotMatch(preview,/<form\b|<script\b|tel:|<iframe\b/i);
 const l=read('landing-variants.json');off(l,['activation']);assert.equal(l.owner,'marketingapes/nil-site');assert.deepEqual(l.variants.map(x=>[x.path,x.url]),website.map(([p,_,url])=>[p,url]));for(const v of l.variants){assert.equal(v.robots,'noindex,nofollow');assert.equal(v.legal_review,'pending-attorney-review');assert.equal(v.geography,'Arizona');}
 const produced=read('rendered-assets.json');off(produced,['activation','publication_enabled','upload_enabled']);assert.equal(produced.status,'RENDERED_REVIEW_ONLY');assert.equal(produced.legal_review,'pending-attorney-review');assert.equal(produced.source_logo_sha256,a.assets[0].sha256);assert.equal(produced.assets.length,14);
 assert.equal(produced.assets.filter(x=>x.kind==='still').length,6);assert.equal(produced.assets.filter(x=>x.kind==='video').length,3);assert.equal(produced.assets.filter(x=>x.kind==='poster').length,3);
 for(const x of produced.assets){assert.ok(x.file.startsWith('rendered/')&&!x.file.split('/').includes('..'));const bytes=fs.readFileSync(path.join(dir,x.file));assert.equal(bytes.length,x.bytes,'rendered size');assert.equal(hash(bytes),x.sha256,'rendered hash');if(x.kind==='video'){assert.equal(x.duration_seconds,20);assert.equal(x.codec,'h264');assert.equal(x.pixel_format,'yuv420p');assert.equal(x.audio,'none');}}
 for(const v of l.variants){const html=fs.readFileSync(path.join(dir,'landing-previews',v.path+'.html'),'utf8');assert.ok(html.includes(v.title));assert.match(html,/noindex,nofollow/);assert.match(html,/review pending/i);assert.match(html,/connect-src 'none'/);assert.doesNotMatch(html,/<form\b|<script\b|<input\b|<iframe\b|tel:/i);}
 const full=fs.readFileSync(path.join(dir,'phillips-mva-full-sprint-review.html'),'utf8');assert.match(full,/media-src data:/);assert.match(full,/connect-src 'none'/);assert.doesNotMatch(full,/<form\b|<script\b|<input\b|<iframe\b|tel:/i);assert.match(full,/data:video\/mp4;base64,/);assert.match(full,/landing-W3/);
 validateExpansion(dir);
 return {packageVerification:'PASS: self-contained CSV structure/copy, exact routes, paused flags, safety contracts, consent, date, asset manifest and inert preview checks.',assetVerification};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);assert.ok(args.length===0||(args.length===2&&args[0]==='--assets-root'),'Usage: node validate.mjs [--assets-root /path/to/nil-site]');
 const result=validatePackage(packageDir,{assetsRoot:args[1]});console.log(result.packageVerification);console.log(result.assetVerification);console.log('No network, calls or submissions.');
}
