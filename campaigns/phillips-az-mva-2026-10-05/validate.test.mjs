import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {packageDir,parseCSV,validatePackage} from './validate.mjs';
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'phillips-package-'));fs.cpSync(packageDir,dir,{recursive:true});t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
function jsonEdit(dir,file,edit){const p=path.join(dir,file);const v=JSON.parse(fs.readFileSync(p,'utf8'));edit(v);fs.writeFileSync(p,JSON.stringify(v));}
function replace(dir,file,a,b){const p=path.join(dir,file);const s=fs.readFileSync(p,'utf8');assert.ok(s.includes(a));fs.writeFileSync(p,s.replace(a,b));}
test('complete package passes without any external repository and explicitly reports asset bytes not run',()=>{const r=validatePackage();assert.match(r.packageVerification,/PASS/);assert.match(r.assetVerification,/NOT RUN/);});
test('CSV accepts quoted commas, quotes, multiline values and CRLF',()=>{assert.deepEqual(parseCSV('a,b\r\n"one, two","three""four\nnext"\r\n').rows,[{a:'one, two',b:'three"four\nnext'}]);});
for(const [name,s] of [['unclosed quote','a,b\n"open,x'],['ragged row','a,b\nx'],['duplicate header','a,a\nx,y'],['trailing quote junk','a,b\n"x"junk,y'],['quote inside field','a,b\nx"y,z']])test(`CSV rejects ${name}`,()=>assert.throws(()=>parseCSV(s)));
const csvCases=[
 ['Meta missing column','meta-build-sheet.csv','channel,path,','channel,'],
 ['Meta overlength headline','meta-build-sheet.csv','Phillips Arizona Intake','X'.repeat(41)],
 ['Meta wrong campaign route','meta-build-sheet.csv','52603475656795','99999999999999'],
 ['Meta wrong ad identity','meta-build-sheet.csv','52603475744195','99999999999999'],
 ['Meta active status','meta-build-sheet.csv',',PAUSED,false,',',ACTIVE,false,'],
 ['Meta activation enabled','meta-build-sheet.csv',',PAUSED,false,',',PAUSED,true,'],
 ['Meta W2 wrong destination','meta-build-sheet.csv','https://nearestinjurylawyers.com/mva-pi/talk-to-sofia/','https://example.com/'],
 ['Search wrong route ID','google-rsa-review.csv','203621828871','999999999999'],
 ['Search enabled status','google-rsa-review.csv',',Paused,',',Enabled,'],
 ['Search overlength headline','google-rsa-review.csv','Phillips Law Group','X'.repeat(31)],
 ['Search overlength description','google-rsa-review.csv','Explore Arizona vehicle-accident intake options with Phillips Law Group.','X'.repeat(91)],
 ['Search non-W1 destination','google-rsa-review.csv','https://nearestinjurylawyers.com/mva-pi/','https://nearestinjurylawyers.com/mva-pi/quiz/']
];
for(const [name,file,a,b] of csvCases)test(`package rejects ${name}`,t=>{const d=fixture(t);replace(d,file,a,b);assert.throws(()=>validatePackage(d));});
const jsonCases=[
 ['PMax wrong group ID','google-build.json',v=>v.pmax.groups[0].id='unknown'],
 ['PMax enhancement enabled','google-build.json',v=>v.pmax.video_automation=true],
 ['Search scope misrepresented','google-build.json',v=>v.search.primary_destination_variants=3],
 ['Google enabled','google-build.json',v=>v.shared.status='ENABLED'],
 ['native wrong Page','native-form-review.json',v=>v.existing_page_id='unknown'],
 ['native callbacks enabled','native-form-review.json',v=>v.callback_enabled=true],
 ['native consent default enabled','native-form-review.json',v=>v.permission_fields[0].default=true],
 ['native disclosure tampered','native-form-review.json',v=>v.draft_disclosure+=' changed'],
 ['wrong intake phone route','tracking-intake-contract.json',v=>v.routing.phone_route.phillips='+16197360356'],
 ['automated rejection enabled','tracking-intake-contract.json',v=>v.routing.automated_eligibility_rejection=true],
 ['AI health question required','ai-intake-review.json',v=>v.optional_private_health_questions[0].required=true],
 ['AI health question targeting enabled','ai-intake-review.json',v=>v.optional_private_health_questions[0].ad_platform_collection=true],
 ['TikTok paid active','tiktok-youtube-organic-build.json',v=>v.tiktok_paid.status='ACTIVE'],
 ['organic publication enabled','tiktok-youtube-organic-build.json',v=>v.organic.publication_enabled=true],
 ['email follow-up enabled','tiktok-youtube-organic-build.json',v=>v.followup.email_enabled=true],
 ['asset invalid hash','asset-manifest.json',v=>v.assets[0].sha256='invalid'],
 ['asset traversal','asset-manifest.json',v=>v.assets[0].path='../private'],
];
for(const [name,file,edit] of jsonCases)test(`package rejects ${name}`,t=>{const d=fixture(t);jsonEdit(d,file,edit);assert.throws(()=>validatePackage(d));});
function assetsFixture(t){const d=fixture(t),assetRoot=path.join(d,'source-assets');const manifest=JSON.parse(fs.readFileSync(path.join(d,'asset-manifest.json'),'utf8'));for(const x of manifest.assets){const b=Buffer.from(`review test fixture ${x.path}`);const p=path.join(assetRoot,x.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);x.bytes=b.length;x.sha256=crypto.createHash('sha256').update(b).digest('hex');}fs.writeFileSync(path.join(d,'asset-manifest.json'),JSON.stringify(manifest));return {d,assetRoot,first:path.join(assetRoot,manifest.assets[0].path)};}
test('explicit asset verification passes presence, bytes and SHA256',t=>{const {d,assetRoot}=assetsFixture(t);assert.match(validatePackage(d,{assetsRoot:assetRoot}).assetVerification,/PASS: 6 source assets/);});
test('explicit missing asset root fails instead of skipping',t=>{const d=fixture(t);assert.throws(()=>validatePackage(d,{assetsRoot:path.join(d,'absent')}));});
test('explicit missing asset file fails instead of skipping',t=>{const {d,assetRoot,first}=assetsFixture(t);fs.unlinkSync(first);assert.throws(()=>validatePackage(d,{assetsRoot:assetRoot}));});
test('asset byte/hash mismatch fails',t=>{const {d,assetRoot,first}=assetsFixture(t);fs.writeFileSync(first,'tampered');assert.throws(()=>validatePackage(d,{assetsRoot:assetRoot}));});
test('asset size mismatch fails even with matching hash',t=>{const {d,assetRoot}=assetsFixture(t);jsonEdit(d,'asset-manifest.json',v=>v.assets[0].bytes++);assert.throws(()=>validatePackage(d,{assetsRoot:assetRoot}));});
