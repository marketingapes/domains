import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const P=createRequire(import.meta.url)('../lfma/assets/portal/perspective.js');
function withDocument(layout,fn){
 const old=globalThis.document;
 const nodes=Object.fromEntries(['scoreboard','funnel','c-eyebrow','c-title','c-summary','c-state','c-links','freshness'].map(id=>[id,{textContent:'',innerHTML:''}]));
 globalThis.document={body:{getAttribute:key=>key==='data-layout'?layout:null},getElementById:id=>nodes[id]};
 try{return fn(nodes);}finally{globalThis.document=old;P._state.feed=null;}
}
test('results layout intersects existing permissions without granting lead or outcome access',()=>{
 withDocument('results-leads',()=>{
  P._state.feed={access:{sections:['overview','leads','litify','summary','proposals','requests']}};
  const original=JSON.stringify(P._state.feed);
  assert.deepEqual(P._allowedViews(),['overview','leads']);
  assert.equal(JSON.stringify(P._state.feed),original,'access records unchanged');
  P._state.feed.access.sections=['overview','summary'];
  assert.deepEqual(P._allowedViews(),['overview'],'no lead grant');
  P._state.feed.access.sections=['summary'];
  assert.deepEqual(P._allowedViews(),[],'removed section cannot broaden access');
 });
});
test('other layouts retain their existing authorized sections',()=>{
 withDocument(null,()=>{P._state.feed={access:{sections:['leads','summary']}};assert.deepEqual(P._allowedViews(),['leads','summary']);});
});
test('Converted stays a CRM count and cannot become verified signed or cost per signed',()=>{
 withDocument('results-leads',nodes=>{
  P._state.campaign='mva';
  P._state.feed={campaigns:[{id:'mva',overview:{leads:10,reached:4,transfers:2,signed:3,spend:90}}],leads:[]};
  const original=JSON.stringify(P._state.feed);
  P._renderOverview();
  assert.match(nodes.scoreboard.innerHTML,/Converted/);
  assert.match(nodes.scoreboard.innerHTML,/signed retainer not verified/);
  assert.doesNotMatch(nodes.scoreboard.innerHTML,/Cost per signed|>Signed</);
  assert.equal(nodes.funnel.innerHTML,'');
  assert.equal(JSON.stringify(P._state.feed),original,'no source record mutation');
 });
});
test('missing source totals stay unavailable, not fabricated zero',()=>{
 withDocument('results-leads',nodes=>{
  P._state.campaign='mva';P._state.feed={campaigns:[{id:'mva'}],leads:[]};P._renderOverview();
  assert.doesNotMatch(nodes.scoreboard.innerHTML,/>0</);
  assert.match(nodes.scoreboard.innerHTML,/—/);
 });
});
test('results header suppresses review links and narratives while preserving freshness',()=>{
 withDocument('results-leads',nodes=>{
  P._state.campaign='mva';P._state.feed={campaigns:[{id:'mva',summary:'Approve this campaign',links:[{url:'https://example.com',label:'Review page'}]}],sources:[],generated_at:'2026-11-03T17:00:00Z'};
  P._renderHead();assert.equal(nodes['c-summary'].textContent,'');assert.equal(nodes['c-links'].innerHTML,'');
  assert.match(nodes.freshness.innerHTML,/Data sources and freshness/);
  assert.match(nodes.freshness.innerHTML,/Last updated/);
 });
});
