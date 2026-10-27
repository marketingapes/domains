// One-off campaign offer fixture export. Reuses the existing kit, never changes it.
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {normalize,renderPages,renderCss,PREVIEW_CSP} from '../../campaign-kit/build.mjs';
const out=new URL('../../ma/campaign-sprint/demo/',import.meta.url);
const raw=JSON.parse(readFileSync(new URL('../../campaign-kit/campaigns/btl-paraquat.json',import.meta.url)));
Object.assign(raw,{campaign_id:'DEMO-SPRINT-001',slug:'sprint-demo',status:'draft',publish:false,images:{},evidence:{},gates:{},intake:{webhook:null,trustedform:false},landing:null,
 tort:{name:'Your approved tort',headline:'A clear first step. Built around your firm.',lede:'FICTIONAL WALKTHROUGH. This demonstrates a campaign experience, not an approved case assessment.'},
 brand:{name:'Best Tort Lawyers · demonstration',logo:'btl-seal.svg',phone_tel:'+15555550100',phone_display:'No calls in this demo',privacy_url:'../#pilot',terms_url:'../#offer',fee_line:'Demonstration only.',tagline:'No inquiry is sent.',trust:[['DEMO','Fictional information'],['3 paths','One campaign'],['Human','Review boundary'],['No calls','Walkthrough only']]},
 sofia:{phone_tel:'+15555550100',phone_display:'Simulated conversation · no call',transcript:[['s','Hello, this is Sofia, an AI assistant. How can I help today?'],['c','I would like to understand the next step.'],['s','I can explain the process. Before discussing an existing inquiry, identity would need to be verified.'],['c','What happens after the questions?'],['s','Your firm’s approved criteria guide the review. A human decides the next step. No acceptance or transfer is promised.']]},
 delivery:{mode:'scheduled_callback'},criteria:{qualifies:['DEMO ONLY: no eligibility decision'],disqualifies:[]},
 quiz:[{key:'demo_path',q:'Which fictional path would you like to explore?',options:[{value:'guided',label:'Guided review example',signal:'unsure'},{value:'human',label:'Human review example',signal:'unsure'}]},
 {key:'demo_region',q:'Which sample geography should the demo display?',options:[{value:'region_a',label:'Example region A',signal:'neutral'},{value:'region_b',label:'Example region B',signal:'neutral'}]},
 {key:'demo_next',q:'What should the fictional journey show next?',options:[{value:'review',label:'Request human review',signal:'unsure'},{value:'unknown',label:'Leave outcome unknown',signal:'unsure'}]}],
 form_fields:[{key:'demo_route',label:'Fictional next step',options:[{value:'review',label:'Human review demonstration'}]}],
 ads:[{door:'form',headline:'A clear first step',primary_text:'A direct route to initial human review. Illustrative copy; firm approval required.',cta:'LEARN_MORE'},{door:'quiz',headline:'Questions, one at a time',primary_text:'A guided way to understand the process. Illustrative copy; firm approval required.',cta:'LEARN_MORE'},{door:'sofia',headline:'Prefer a conversation?',primary_text:'See a call-assisted intake concept. No call is connected in this demonstration.',cta:'LEARN_MORE'}],
 copy:{ads:{eyebrow:'DRAFT CONCEPTS',h1:'Three draft messages. One review standard.',lede:'Illustrative ad concepts connected to fictional experiences. No ad account, targeting or spend is enabled.',chips:['Facebook-first pilot','Concepts only','Firm approval required']},index:{eyebrow:'DEMONSTRATION',h1:'Explore the three paths.',lede:'A fictional campaign experience. No live intake, call or transfer.',chips:['Fictional data only','No legal assessment','No sending']},
 form:{eyebrow:'FORM WALKTHROUGH',h1:'A direct path to a human review.',lede:'Fixed fictional fields demonstrate the layout. You cannot enter claimant details here.',chips:['Fixed demo values','No callback','No submission']},
 quiz:{eyebrow:'QUIZ WALKTHROUGH',h1:'One clear question at a time.',lede:'These are demonstration choices, not questions about your health or legal situation.',chips:['Non-personal choices','No case assessment','No submission']},
 sofia:{eyebrow:'SOFIA WALKTHROUGH',h1:'A conversation with a clear boundary.',lede:'Click through a fictional dialogue. No audio, microphone, live assistant or transfer is connected.',chips:['Scripted dialogue','Identity before personal history','Human review']},
 proof:null,steps:[['Ad','Approved message'],['Page','Choose an experience'],['Intake','Firm criteria and consent'],['Review','Human next step']],sofia_steps:[['Introduce','Identify the AI assistant'],['Verify','No prior personal context before verification'],['Collect','Approved questions only'],['Handoff','Only an approved, staffed destination']]}});
const c=normalize(raw);
// All externally surfaced metadata describes the fixture, never the live kit promise.
const previewMetadata={
 'index.html':['Fictional campaign paths | Marketing Apes demo','Explore a fictional campaign preview. No lead submission, callbacks or live calls.'],
 'form.html':['Fictional form preview | Marketing Apes demo','Fixed fictional form preview only. No inquiry is sent and no callbacks or live calls are requested.'],
 'quiz.html':['Fictional quiz preview | Marketing Apes demo','Explore non-personal demonstration choices. No case assessment, inquiry submission or calls.'],
 'sofia.html':['Fictional Sofia walkthrough | Marketing Apes demo','Click through a scripted fictional Sofia conversation. No live calls, assistant connection, recording or transfer.'],
 'ads.html':['Fictional ad concepts | Marketing Apes demo','Draft ad concepts for fictional preview experiences. No published ads, live calls or activated campaign.']
};
for(const [name,original] of Object.entries(renderPages(c))){
 let html=original.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link[^>]*href="https:[^"]*"[^>]*>/g,'')
 .replace(PREVIEW_CSP,"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'")
 .replace('noindex,follow','noindex,nofollow').replace(/\+15555550100/g,'DEMO-NO-DIAL')
 .replace(/<div class="kit-preview"[\s\S]*?<\/div>/,'<div class="kit-preview" role="note"><b>FICTIONAL DEMONSTRATION</b> · No live intake, calls or tracking. <a href="../#demo">Return to campaign sprint</a></div>')
 .replace(/<input\b[^>]*>/g,tag=>tag.includes('checkbox')?tag.replace(/>$/,' disabled>'):tag.replace(/ autocomplete="[^"]*"/g,'').replace(/ required/g,'').replace(/>$/,' readonly value="Fictional example" autocomplete="off">'))
 .replace(/<textarea[^>]*>[\s\S]*?<\/textarea>/g,'<p class="fine">No free-text or claimant details are collected in this demonstration.</p>')
 .replace(/<button class="copybtn"[^>]*>[\s\S]*?<\/button>/g,'<button class="copybtn" id="next-turn" type="button">Show next simulated turn</button>')
 .replace(/<div class="ok" id="done"[\s\S]*?<\/div>/g,'<div class="ok" id="done" hidden role="status"></div>')
 .replace(/<div class="consent">[\s\S]*?<\/div>/g,'<div class="consent"><p class="fine">CONSENT PLACEHOLDER · The firm must review purpose-specific disclosures before any live contact. No consent is collected in this demo.</p></div>')
 .replace(/<label for="note">[\s\S]*?<\/label>/g,'')
 .replace('Each ad lands on its own page so we know which door produced the claim. All channels are drafts and paused until approved.','Each draft concept links to its corresponding simulated experience. These are not published ads or created campaigns.')
 .replace(/Eligibility check/g,'Fictional walkthrough').replace(/Request a callback/g,'Form walkthrough')
 .replace('24/7 · recorded','Scripted example · not recorded').replace(/Tap to call/g,'No call connected')
 .replace(/Request my callback/g,'Simulate review handoff').replace(/Submit my answers/g,'Simulate review handoff')
 .replace(/By submitting you agree to the[\s\S]*?<\/p>/g,'This demonstration does not collect consent, submit an inquiry or create an agreement.</p>')
 .replace(/Sofia is an AI intake assistant; calls are recorded\./g,'Sofia dialogue is simulated; no call or recording exists.')
 .replace('Two minutes online, or one call. Either way, you will know your next step today.','This is a fictional walkthrough. Actual campaign behavior requires review and verified integrations.')
 .replace(/Check my claim/g,'Explore the quiz').replace(/Call now/g,'Sofia walkthrough').replace(/>Privacy</g,'>Discuss privacy review<').replace(/>Terms</g,'>Review offer scope<')
 .replace('Talk to someone now','Sofia walkthrough').replace('Request a callback','Form walkthrough').replace('Talk to us now','Sofia walkthrough').replace('Case check','Quiz walkthrough')
 .replace('</head>','<link rel="stylesheet" href="fixture.css"><script src="fixture.js" defer></script></head>');
 const [previewTitle,previewDescription]=previewMetadata[name];
 html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>'+previewTitle+'</title>')
  .replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+previewDescription+'">')
  .replace(/<meta property="og:title" content="[^"]*">/,'<meta property="og:title" content="'+previewTitle+'">')
  .replace(/<meta property="og:description" content="[^"]*">/,'<meta property="og:description" content="'+previewDescription+'">');
 if(name==='sofia.html')html=html.replace('<div class="chat">','<p id="sofia-announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></p><div class="chat" aria-label="Fictional Sofia conversation">');
 if(name==='ads.html')html=html.replace('<div class="ads">','<p class="in">Choose a draft concept: <a href="quiz.html">Quiz concept → experience</a> · <a href="form.html">Form concept → experience</a> · <a href="sofia.html">Sofia concept → walkthrough</a></p><div class="ads">');
 writeFileSync(new URL(name,out),html.split('\n').map(line=>line.trimEnd()).join('\n'));
}
writeFileSync(new URL('site.css',out),renderCss(c));
copyFileSync(new URL('../../btl/assets/btl-seal.svg',import.meta.url),new URL('btl-seal.svg',out));
