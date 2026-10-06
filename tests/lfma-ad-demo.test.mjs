import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSessionController,configProblems,normalizePhone,validEmail,safePlaybackUrl,simulationReceipt,UNCONNECTED,TRANSPORT_OPERATIONS} from '../lfma/demo/ad-to-intake/adapter.mjs';
import {integrationConfig,transport} from '../lfma/demo/ad-to-intake/integration-config.mjs';
import {createFakeTransport,FAKE_CONFIG} from './fixtures/lfma-ad-demo-fake-transport.mjs';
const root=new URL('../lfma/demo/ad-to-intake/',import.meta.url);
const read=f=>readFileSync(new URL(f,root),'utf8');
const html=read('index.html'),js=read('demo.mjs'),adapter=read('adapter.mjs'),config=read('integration-config.mjs');
const participant={name:'Test Person',email:'test@example.com'};
const fictional={'Reported state':'Arizona'};
const tick=()=>new Promise(r=>setTimeout(r,10));

function ready(ctl,{phone='602-555-0100'}={}){
 ctl.setParticipant(participant);ctl.setFictionalCase(fictional);ctl.setConsent({phoneContact:true,recording:true,sms:false});ctl.setLeadPhone(phone);
}

test('shipped configuration is unconnected, binds no transport and hardcodes no provider identity',()=>{
 assert.equal(integrationConfig,UNCONNECTED);assert.equal(transport,null);
 assert.ok(configProblems(integrationConfig,transport).length>=3);
 assert.doesNotMatch(html+js+adapter+config,/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|document\.cookie|history\.(push|replace)State|location\.(hash|search)\s*=|vapi\.ai|api\.vapi|hook\.[a-z0-9]+\.make|hooks\.zapier|onrender\.com|twilio|assistantId|api[_-]?key|mailto:|<form|<script[^>]+src="http/i);
 assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);assert.match(html,/media-src 'none'/);assert.match(html,/noindex,nofollow/);
});

test('unconnected controller never touches a transport and cannot reach a live state',async()=>{
 const ctl=createSessionController({config:UNCONNECTED,transport:null});ready(ctl);
 const r=await ctl.start();
 assert.equal(r.reason,'integration_not_configured');assert.equal(ctl.snapshot().state,'not_connected');assert.equal(ctl.snapshot().connected,false);
 assert.deepEqual(await ctl.startVerification('480-555-0101'),{ok:false,reason:'unavailable'});
 assert.deepEqual(await ctl.requestTransfer(),{ok:false});
 // A transport alone without a verified contract stays unconnected.
 const fake=createFakeTransport();const c2=createSessionController({config:UNCONNECTED,transport:fake});ready(c2);
 await c2.start();assert.equal(fake.calls.length,0);
});

test('consent is explicit and separate; nothing defaults on',()=>{
 for(const id of ['c-phone','c-recording','c-sms'])assert.match(html,new RegExp(`<input type="checkbox" id="${id}">`));
 assert.doesNotMatch(html,/checked/);
 const ctl=createSessionController({config:FAKE_CONFIG,transport:createFakeTransport()});
 ctl.setParticipant(participant);ctl.setFictionalCase(fictional);ctl.setLeadPhone('602-555-0100');
 assert.ok(ctl.startBlockers().some(b=>/Phone contact consent/.test(b)));
 ctl.setConsent({phoneContact:true,recording:false,sms:false});
 assert.ok(ctl.startBlockers().some(b=>/recording consent/.test(b)));
 ctl.setConsent({phoneContact:true,recording:true,sms:false});
 assert.deepEqual(ctl.startBlockers(),[]);
});

test('starting twice creates one session and starting requires real evidence',async()=>{
 const fake=createFakeTransport({statuses:['starting']});const ctl=createSessionController({config:FAKE_CONFIG,transport:fake});ready(ctl);
 const [a,b]=[ctl.start(),ctl.start()];await Promise.all([a,b]);await ctl.start();
 assert.equal(fake.calls.filter(c=>c.op==='createSession').length,1);
 await tick();assert.equal(ctl.snapshot().state,'starting');
 assert.equal(fake.calls.find(c=>c.op==='createSession').args[0].leadPhone,'+16025550100');
});

test('identity, consent or answer changes discard stale sessions and late responses',async()=>{
 const fake=createFakeTransport({holdCreate:true});const ctl=createSessionController({config:FAKE_CONFIG,transport:fake});ready(ctl);
 const p=ctl.start();assert.equal(ctl.snapshot().state,'starting');
 ctl.setParticipant({name:'Someone Else',email:'else@example.com'});
 fake.release();await p;await tick();
 const s=ctl.snapshot();assert.equal(s.state,'not_connected');assert.equal(s.hasSession,false);assert.equal(s.receipt,null);
 assert.equal(fake.calls.filter(c=>c.op==='launchVoice').length,0);
 for(const change of [()=>ctl.setConsent({phoneContact:true,recording:true,sms:true}),()=>ctl.setFictionalCase({x:'y'}),()=>ctl.reset()]){
  const g=ctl.snapshot().generation;change();assert.ok(ctl.snapshot().generation>g);
 }
 assert.equal(ctl.snapshot().hasParticipant,false);
});

test('unavailable backend fails honestly and retry starts a fresh session',async()=>{
 const fake=createFakeTransport({throwOn:'createSession'});const ctl=createSessionController({config:FAKE_CONFIG,transport:fake});ready(ctl);
 await ctl.start();assert.equal(ctl.snapshot().state,'failed');assert.match(ctl.snapshot().error,/unavailable/);
 fake.throwOn=null;fake.statuses=['in_call'];await ctl.start();await tick();
 assert.equal(ctl.snapshot().state,'in_call');assert.equal(fake.calls.filter(c=>c.op==='createSession').length,2);
});

test('receiving phone must be valid, different and verified; a request is not a completed transfer',async()=>{
 const fake=createFakeTransport({statuses:['in_call']});const ctl=createSessionController({config:FAKE_CONFIG,transport:fake});ready(ctl);
 await ctl.start();await tick();
 assert.deepEqual(await ctl.requestTransfer(),{ok:false});
 assert.equal((await ctl.startVerification('123')).reason,'invalid_phone');
 assert.equal((await ctl.startVerification('(602) 555-0100')).reason,'same_as_lead');
 assert.equal((await ctl.startVerification('480-555-0101')).ok,true);
 fake.verifyResult='failed';assert.equal((await ctl.confirmVerification('000000')).ok,false);assert.equal(ctl.snapshot().verification,'failed');
 await ctl.startVerification('480-555-0101');fake.verifyResult='verified';assert.equal((await ctl.confirmVerification('123456')).ok,true);
 fake.transferResult='failed';await ctl.requestTransfer();assert.equal(ctl.snapshot().transfer,'failed');
 const c2=createSessionController({config:FAKE_CONFIG,transport:createFakeTransport({statuses:['in_call'],verifyResult:'verified'})});ready(c2);
 await c2.start();await tick();await c2.startVerification('480-555-0101');await c2.confirmVerification('1');await c2.requestTransfer();
 assert.equal(c2.snapshot().transfer,'requested');
 const browser=createSessionController({config:{...FAKE_CONFIG,voicePath:'browser'},transport:createFakeTransport({statuses:['in_call']})});ready(browser);
 await browser.start();await tick();assert.equal(browser.snapshot().transferSupported,false);
 assert.equal((await browser.startVerification('480-555-0101')).reason,'unavailable');
});

test('receipts use only returned data; pending/failed recordings and foreign playback are labelled',async()=>{
 const fake=createFakeTransport({statuses:['ready'],receipt:{recording:{state:'processing'},transfer:{state:'failed'}}});
 const ctl=createSessionController({config:FAKE_CONFIG,transport:fake});ready(ctl);await ctl.start();await tick();await tick();
 const r=ctl.snapshot().receipt;
 assert.equal(r.recording.state,'processing');assert.equal(r.summary,null);assert.equal(r.perspective,null);assert.equal(r.transfer,'failed');assert.equal(r.sms,'unknown');
 const f2=createFakeTransport({statuses:['ready'],receipt:{recording:{state:'ready',playbackUrl:'https://storage.provider.example/raw.wav'}}});
 const c2=createSessionController({config:FAKE_CONFIG,transport:f2});ready(c2);await c2.start();await tick();await tick();
 assert.equal(c2.snapshot().receipt.recording.state,'blocked');assert.equal(c2.snapshot().receipt.recording.playbackUrl,null);
 assert.equal(safePlaybackUrl(FAKE_CONFIG,FAKE_CONFIG.origin+'/r/1'),FAKE_CONFIG.origin+'/r/1');
 const sim=simulationReceipt(fictional);assert.equal(sim.mode,'simulation');assert.equal(sim.summary,null);assert.equal(sim.transfer,'simulation');
});

test('phone and email validation',()=>{
 assert.equal(normalizePhone('(602) 555-0100'),'+16025550100');assert.equal(normalizePhone('+1 602 555 0100'),'+16025550100');
 for(const bad of ['','123','0025550100','6020550100','602-555-01000','602x5550100'])assert.equal(normalizePhone(bad),null);
 assert.ok(validEmail('a@b.co'));assert.ok(!validEmail('a@b'));assert.ok(!validEmail('nope'));
 assert.deepEqual(TRANSPORT_OPERATIONS.filter(op=>typeof createFakeTransport()[op]!=='function'),[]);
});

test('conference copy, disclosures and scope boundaries are present',()=>{
 for(let i=0;i<5;i++)assert.ok(html.includes(`data-step="${i}"`));
 for(const text of ['CAN YOUR<br>AGENCY','TRY THE DEMO','Start demo','Pretend you are your ideal potential client. Use the fictional case answers for this demo.','Sofia is an AI agent, not a person.','not consent to a call, recording or text messages','One man + AI.','Interested in this for your firm? <b>Talk to Kyle.</b>','Reply READY','A requested transfer is not a completed transfer','Simulation','Official Marketing Apes logo'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/\$2,500|\$10,000|offer-strip|18 CRM|signed case|\$38|guarantee|lower CPA/i);
 const css=read('demo.css');assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/animation:none!important/);
 assert.deepEqual(readFileSync(new URL('../lfma/assets/portal/ape-logo.jpg',import.meta.url)),readFileSync(new URL('../ma/assets/network/ape-logo.jpg',import.meta.url)));
});
