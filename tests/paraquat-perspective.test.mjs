import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {cleanFeed,allowedEndpoint}=require('../btl/paraquat/perspective/perspective.js');
const fixture=()=>({schema:'paraquat-perspective/v1',campaign_id:'PARAQUAT-PILOT-001',synthetic:false,as_of:'2026-10-13T12:00:00Z',counts:{leads:3,calls:2,followups:1},connections:{intake:true,sofia:true,ad_spend:false},sources:[{key:'form',count:3}],statuses:[{key:'review',count:3}]});
test('public projection retains only allowlisted aggregate fields',()=>{
 const f=fixture();f.name='Private claimant';f.recording_url='https://private.example/audio';f.leads=[{phone:'private'}];f.sources.push({key:'Private claimant',count:1});f.statuses.push({key:'<script>',count:1});f.counts.email='private@example.test';
 const p=cleanFeed(f);assert.equal(p.counts.leads,3);assert.equal(p.sources.length,1);assert.equal(p.statuses.length,1);assert.doesNotMatch(JSON.stringify(p),/Private|recording|phone|email|script/);
});
test('unverified sources and bad counts are unavailable, never fabricated zero',()=>{
 const f=fixture();f.connections={};const p=cleanFeed(f);assert.deepEqual(p.counts,{leads:null,calls:null,followups:null});assert.deepEqual(p.sources,[]);
 f.connections={intake:true,sofia:true};f.counts={leads:-1,calls:'2',followups:Infinity};assert.deepEqual(cleanFeed(f).counts,{leads:null,calls:null,followups:null});
});
test('reject other campaigns and synthetic feeds in connected mode',()=>{
 assert.throws(()=>cleanFeed({...fixture(),campaign_id:'PHILLIPS'}));assert.throws(()=>cleanFeed({...fixture(),synthetic:true}));
 assert.equal(allowedEndpoint('https://legal-web-lead.onrender.com/api/v1/portal/paraquat/overview'),true);
 for(const u of ['https://evil.example/overview','http://legal-web-lead.onrender.com/api/v1/portal/paraquat/overview','https://legal-web-lead.onrender.com/api/v1/portal/phillips/leads','https://legal-web-lead.onrender.com/api/v1/portal/paraquat/overview?token=secret'])assert.equal(allowedEndpoint(u),false);
});
test('all three existing pages link to each other and Perspective; static phone fallback is correct',async()=>{
 for(const p of ['btl/paraquat/index.html','btl/paraquat/talk-to-sofia/index.html','btl/paraquat/quiz/index.html']){
 const h=await readFile(new URL('../'+p,import.meta.url),'utf8');for(const path of ['/paraquat/','/paraquat/talk-to-sofia/','/paraquat/quiz/','/paraquat/perspective/'])assert.ok(h.includes('href="'+path),p+' '+path);
 assert.doesNotMatch(h,/12029329700/);
 }
});
