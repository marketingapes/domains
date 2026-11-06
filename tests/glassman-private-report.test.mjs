import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const js=readFileSync(new URL('../lfma/portal/glassman/reporting.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../lfma/portal/glassman/index.html',import.meta.url),'utf8');
test('report syntax and locked startup never load data',()=>{
 let requests=0;const elements=new Map();const handlers={};
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',hidden:true,textContent:'',addEventListener:(event,fn)=>{handlers[id+':'+event]=fn;}});return elements.get(id);};
 vm.runInNewContext(js,{document:{getElementById:element},window:{addEventListener(){}},fetch(){requests++;throw Error('unexpected');},setTimeout(){},clearTimeout(){},Date,Number,Error,String,JSON});
 assert.equal(requests,0);assert.equal(typeof handlers['sign-in:submit'],'function');
 assert.match(html,/id="metrics" hidden/);assert.match(html,/id="verify" hidden/);
});
test('sessions stay in memory; data uses textContent',()=>{
 assert.doesNotMatch(js,/localStorage|sessionStorage|innerHTML|document\.cookie/);
 assert.match(js,/credentials:"omit"/);assert.match(js,/cache:"no-store"/);
 assert.match(js,/generation/);assert.match(js,/e\.status===401\|\|e\.status===403/);
});
test('fixed HTTPS endpoint and strict campaign schema',()=>{
 assert.match(js,/https:\/\/perspective-s3b8\.onrender\.com\/portal\/glassman/);
 assert.match(js,/glassman\.web-summary\/v1/);assert.match(js,/GLASSMAN-SSDI-002/);
 assert.doesNotMatch(html,/docs\.google\.com|spreadsheets|\+1339|@marketingapes\.com/);
 assert.match(html,/not fully qualified leads or signed clients/);
});
