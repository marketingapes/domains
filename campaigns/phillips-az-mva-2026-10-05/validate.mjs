import assert from 'node:assert/strict';
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
 const m=read('manifest.json');off(m,['activation','calls_enabled','form_submissions_enabled','buyer_delivery_enabled','deploy_enabled']);assert.equal(m.spend_authorized_usd,0);assert.equal(m.approved_budget_usd,null);
 assert.equal(new Intl.DateTimeFormat('en-US',{timeZone:'America/Phoenix',hour:'2-digit',hour12:false}).format(new Date(m.target_review_time)),'06');assert.equal(new Date(m.target_review_time).getUTCDay(),1);
 assert.equal(m.production.repository,'marketingapes/nil-site');assert.equal(m.production.website_endpoint,'https://legal-web-lead.onrender.com/api/v1/nil/web-lead');assert.ok(m.do_not_activate.some(x=>x.campaign_id==='24318918184'));
 for(const c of m.channels)off(c,['activation']);
 const website=[['W1','52603475744195','https://nearestinjurylawyers.com/mva-pi/'],['W2','52603492387395','https://nearestinjurylawyers.com/mva-pi/talk-to-sofia/'],['W3','52603492428795','https://nearestinjurylawyers.com/mva-pi/quiz/']];
 const meta=parseCSV(fs.readFileSync(path.join(dir,'meta-build-sheet.csv'),'utf8'));
 assert.deepEqual(meta.headers,['channel','path','existing_campaign_id','existing_ad_id','status','activation','primary_text','headline','description','cta','destination','review']);assert.equal(meta.rows.length,6);
 const allowed=new Map([...website.map(([p,id,url])=>[id,{campaign:'52603475656795',channel:'meta_website',path:p,url}]),['120254654776180231',{campaign:'120254654770780231',channel:'meta_native',path:'native',url:'existing form held'}],['120254654778590231',{campaign:'120254654771580231',channel:'meta_native',path:'native',url:'existing form held'}],['120254652218910231',{campaign:'120254652215690231',channel:'meta_call',path:'call',url:'existing tracker held pending reconciliation'}]]);
 assert.equal(new Set(meta.rows.map(r=>r.existing_ad_id)).size,6,'duplicate Meta IDs');
 for(const r of meta.rows){const expected=allowed.get(r.existing_ad_id);assert.ok(expected,'unknown Meta route ID');assert.equal(r.existing_campaign_id,expected.campaign);assert.equal(r.channel,expected.channel);assert.equal(r.path,expected.path);assert.equal(r.destination,expected.url);assert.equal(r.status,'PAUSED');assert.equal(r.activation,'false');text(r.primary_text,2000);text(r.headline,40);text(r.description,125);assert.equal(r.cta,r.channel==='meta_call'?'CALL_NOW':'LEARN_MORE');}
 const g=read('google-build.json');off(g,['activation']);off(g.shared,['conversion_uploads_enabled','customer_match','remarketing']);assert.equal(g.shared.status,'PAUSED');assert.equal(g.shared.approved_budget,null);assert.deepEqual(g.shared.sensitive_audiences,[]);assert.deepEqual(g.pmax.audience_signals,[]);off(g.pmax,['new_asset_uploads','url_expansion','text_automation','image_automation','video_automation']);off(g.search,['search_partners','display','ai_max_expansion']);
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
 const support=read('tiktok-youtube-organic-build.json');off(support,['activation']);off(support.organic,['publication_enabled']);off(support.followup,['email_enabled','sms_enabled']);assert.equal(support.tiktok_paid.status,'PAUSED_REVIEW_SPEC');assert.equal(support.youtube.paid_status,'HOLD_NO_ACCOUNT_BUILD');assert.equal(support.tiktok_paid.approved_budget,null);assert.equal(support.tiktok_paid.campaign_id,null);assert.equal(support.tiktok_paid.adgroup_id,null);assert.deepEqual(support.tiktok_paid.sensitive_audiences,[]);
 const a=read('asset-manifest.json');off(a,['activation']);assert.equal(a.assets.length,6);
 for(const x of a.assets){assert.equal(x.repository,'marketingapes/nil-site');assert.match(x.sha256,/^[a-f0-9]{64}$/);assert.ok(Number.isInteger(x.bytes)&&x.bytes>0);assert.ok(!path.isAbsolute(x.path)&&!x.path.split('/').includes('..'));}
 let assetVerification='NOT RUN: external nil-site asset bytes; pass --assets-root to verify presence, size and SHA256.';
 if(assetsRoot){assert.ok(fs.statSync(assetsRoot).isDirectory(),'asset root missing');for(const x of a.assets){const b=fs.readFileSync(path.join(assetsRoot,x.path));assert.equal(hash(b),x.sha256,`asset hash ${x.path}`);assert.equal(b.length,x.bytes,`asset size ${x.path}`);}assetVerification=`PASS: ${a.assets.length} source assets present; sizes and SHA256 verified.`;}
 const preview=fs.readFileSync(path.join(dir,'review.html'),'utf8');assert.match(preview,/connect-src 'none'/);assert.match(preview,/form-action 'none'/);assert.doesNotMatch(preview,/<form\b|<script\b|tel:|<iframe\b/i);
 const l=read('landing-variants.json');off(l,['activation']);assert.equal(l.owner,'marketingapes/nil-site');assert.deepEqual(l.variants.map(x=>[x.path,x.url]),website.map(([p,_,url])=>[p,url]));for(const v of l.variants){assert.equal(v.robots,'noindex,nofollow');assert.equal(v.legal_review,'pending-attorney-review');assert.equal(v.geography,'Arizona');}
 return {packageVerification:'PASS: self-contained CSV structure/copy, exact routes, paused flags, safety contracts, consent, date, asset manifest and inert preview checks.',assetVerification};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);assert.ok(args.length===0||(args.length===2&&args[0]==='--assets-root'),'Usage: node validate.mjs [--assets-root /path/to/nil-site]');
 const result=validatePackage(packageDir,{assetsRoot:args[1]});console.log(result.packageVerification);console.log(result.assetVerification);console.log('No network, calls or submissions.');
}
