import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildInquiry,emailLink,sendToRelay} from '../ma/inquiry-form.mjs';
const html=await readFile(new URL('../ma/index.html',import.meta.url),'utf8');
const id='ma-inquiry-11111111-1111-4111-8111-111111111111';
const values={contact_name:'Review Test',email:'qa@example.invalid',company:'Synthetic Company',engagement:'white-label',notes:'Synthetic QA only. Please do not send.'};
test('two primary business destinations, official social links and no public webhook',()=>{
 for(const url of ['https://lawfirmmarketingapes.com/','https://leadapes.com/','https://www.facebook.com/137455619624058','https://www.instagram.com/marketingapes/','https://www.linkedin.com/company/marketing-apes']) assert.equal(html.split(`href="${url}"`).length-1,url === 'https://lawfirmmarketingapes.com/' ? 2 : 1);
 assert.doesNotMatch(html,/hook\.\w+\.make\.com|\$\d|fully autonomous|guaranteed/i);
});
test('inquiry is validated and distinguishes preparation from delivery',()=>{
 assert.throws(()=>buildInquiry({...values,email:'broken'},id));
 assert.throws(()=>buildInquiry({...values,notes:'short'},id));
 assert.throws(()=>buildInquiry({...values,company_website:'bot'},id));
 const payload=buildInquiry(values,id);assert.equal(payload.tenant_id,'MA');assert.equal(payload.submission_id,id);assert.equal(payload.automatic_contact_authorized,false);
 assert.match(decodeURIComponent(emailLink(payload)),/Synthetic QA only/);assert.match(html,/Nothing is sent automatically/);
});
test('future relay fails closed without a matching durable receipt, retaining ID for retries',async()=>{
 const p=buildInquiry(values,id);let calls=0;
 await assert.rejects(sendToRelay(p,{endpoint:'https://hook.invalid',fetchImpl:()=>{calls++;}}));assert.equal(calls,0);
 const attempts=[];const mock=async(url,options)=>{attempts.push(JSON.parse(options.body));return {ok:true,json:async()=>({status:attempts.length===1?'accepted':'duplicate',submission_id:id,receipt_id:'synthetic-receipt'})}};
 const first=await sendToRelay(p,{endpoint:'/api/inquiry',fetchImpl:mock});const retry=await sendToRelay(p,{endpoint:'/api/inquiry',fetchImpl:mock});assert.equal(first.receipt_id,retry.receipt_id);assert.equal(attempts[0].submission_id,attempts[1].submission_id);
 await assert.rejects(sendToRelay(p,{endpoint:'/api/inquiry',fetchImpl:async()=>({ok:true,json:async()=>({status:'accepted',submission_id:'wrong',receipt_id:'r'})})}));
 await assert.rejects(sendToRelay(p,{endpoint:'/api/inquiry',fetchImpl:async()=>({ok:false})}));
 await assert.rejects(sendToRelay(p,{endpoint:'/api/inquiry',fetchImpl:async()=>{throw new Error('network')}}));
});
