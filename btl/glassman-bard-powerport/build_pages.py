#!/usr/bin/env python3
"""Generates the Glassman SSDI pages from one shell so every page is a full landing page.
Run from btl/glassman-ssdi/: python3 build_pages.py  (regenerates index/quiz/sofia/form)."""
import re

GTM = '''<!-- Google Tag Manager (BTL web container GTM-PHC7459M). Non-identifying events only: ee_page_view, ee_lead_submit_attempt, ee_lead_submit_success (page_id, campaign_id, door). No PII pushed. -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PHC7459M');</script>
<!-- End Google Tag Manager -->
<script>window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'ee_page_view',page_id:'%(pid)s',campaign_id:'GLASSMAN-BARD-POWERPORT-001',tenant_id:'glassman'});</script>'''

HEAD = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>%(title)s</title>
<meta name="description" content="%(desc)s">
<meta name="robots" content="noindex,follow">
<meta property="og:title" content="%(title)s"><meta property="og:type" content="website"><meta property="og:image" content="https://besttortlawyers.com/glassman-bard-powerport/img/boston.jpg">
<link rel="icon" href="img/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Open+Sans:wght@400;600;700&display=swap">
<link rel="stylesheet" href="site.css?v=2">
%(extra_head)s
''' + GTM + '''
</head><body>
<div class="bar"><div class="in"><span><b>No Fee Unless We Win.</b> Free consultation, 24/7.</span><a href="tel:+16177777777">(617) 777-7777</a></div></div>
<div class="nav"><div class="in"><a href="./" aria-label="Jeffrey Glassman Injury Lawyers"><img src="img/logo.svg" alt="Jeffrey Glassman Injury Lawyers"></a><nav class="links"><a href="quiz.html">Case check</a><a href="form.html">Request a callback</a><a class="call" href="sofia.html">Talk to us now</a></nav></div></div>
'''

TRUST = '''<div class="trust"><div class="in">
  <div><b>$500M+</b><span>Won for clients</span></div>
  <div><b>30+</b><span>Years serving clients</span></div>
  <div><b>1,000+</b><span>Five-star Google reviews</span></div>
  <div><b>25,000+</b><span>Injured people helped</span></div>
  <div><b>No fee</b><span>Unless we win</span></div>
</div></div>'''

TEAM = '''<section class="team"><div class="in">
  <figure><img src="img/team.jpg" alt="The attorneys of Jeffrey Glassman Injury Lawyers" loading="lazy"><figcaption>The Glassman team, One International Place, Boston</figcaption></figure>
  <div>
    <p class="eyebrow dark">Why people choose Glassman for device claims</p>
    <h2 class="sec">A device that was supposed to help. We hold them to it.</h2>
    <p>The Bard PowerPort was implanted to make treatment easier. Lawsuits allege the catheter material can crack, break, and migrate, and that the port raises the risk of serious infection and blood clots. Our team has recovered more than $25 million in defective device cases and handles these claims from the first call to resolution.</p>
    <ul class="checks">
      <li><b>A person reviews your situation</b> within one business day, not a form.</li>
      <li><b>We watch the deadlines.</b> Device claims have filing limits that vary by state. We track them.</li>
      <li><b>No fee unless we win.</b> You pay nothing up front, and nothing unless we recover for you.</li>
    </ul>
    <blockquote class="quote">They took my case seriously from the first call and kept me informed at every step.<cite>Google review of the firm, paraphrased</cite></blockquote>
  </div>
</div></section>'''

STEPS = '''<section><div class="in">
  <h2 class="sec center">What happens after you reach out</h2>
  <div class="steps">
    <div><b>You tell us the basics</b><span>When the port went in, what went wrong, and what treatment followed. Two minutes.</span></div>
    <div><b>We review</b><span>A member of the team looks at your situation and your filing deadlines.</span></div>
    <div><b>We call you back</b><span>With a clear next step and exactly what we'd need from you.</span></div>
    <div><b>We handle the claim</b><span>Records, filing, the claim itself. You focus on your health.</span></div>
  </div>
</div></section>'''

CLOSE = '''<section class="close"><div class="in center">
  <p class="eyebrow">Gotta Get Glassman</p>
  <h2 class="sec">Ready when you are.</h2>
  <p>Two minutes online, or one call. Either way, you'll know your next step today.</p>
  <p class="ctas"><a class="cta" href="%(a_href)s">%(a_text)s</a><a class="cta alt" href="%(b_href)s">%(b_text)s</a></p>
</div></section>'''

FOOT = '''<footer><div class="in">
  <div>Jeffrey Glassman Injury Lawyers · One International Place, Suite 1810, Boston, MA 02110 · (617) 777-7777 · <a href="https://www.jeffreysglassman.com/">jeffreysglassman.com</a></div>
  <div>Attorney advertising. Prior results do not guarantee a similar outcome. This page is not legal advice and does not create an attorney-client relationship. Not affiliated with Becton Dickinson or C. R. Bard. Sofia is an AI intake assistant; calls are recorded.</div>
</div></footer>
</body></html>
'''

def hero(eyebrow, h1, lede, chips, card):
    return f'''<header class="hero"><div class="in hero-grid">
  <div class="hero-copy">
    <p class="eyebrow">{eyebrow}</p>
    <h1>{h1}</h1>
    <p class="lede">{lede}</p>
    <ul class="chips">{''.join(f'<li>{c}</li>' for c in chips)}</ul>
  </div>
  <div class="hero-card">{card}</div>
</div></header>'''

CONSENT = '''<div class="consent">
  <label><input type="checkbox" id="c_call" name="consent_call"> <span>I agree that Jeffrey Glassman Injury Lawyers and its service providers may call me at the number above about my disability inquiry, including by automated dialing or an AI assistant. Consent is not a condition of service.</span></label>
  <label><input type="checkbox" id="c_sms" name="consent_sms"> <span>I agree to receive text messages about my case. Msg &amp; data rates may apply. Reply STOP to opt out.</span></label>
</div>
<span class="err" id="cerr"></span>'''

STATES = '<select id="state" name="state" required><option value="">Choose</option><option>MA</option><option>NH</option><option>RI</option><option>CT</option><option>ME</option><option>VT</option><option>NY</option><option value="other">Other</option></select>'

# ---------- QUIZ ----------
quiz_card = f'''<div class="card" id="quiz" data-campaign="GLASSMAN-BARD-POWERPORT-001" data-door="quiz">
  <div class="card-head"><span class="k">Eligibility check</span><span class="count" id="count">1 of 6</span></div>
  <div class="prog"><i id="bar"></i></div>
  <div class="q on" data-k="status"><h2 class="qh">Was a Bard PowerPort or similar port catheter implanted?</h2><p class="qs">Often placed for chemotherapy or long-term IV treatment.</p>
    <div class="opts"><button data-v="bard">Yes, a Bard PowerPort</button><button data-v="port_unknown">Yes, a port, not sure which brand</button><button data-v="no">No</button></div></div>
  <div class="q" data-k="condition"><h2 class="qh">Roughly when was it implanted?</h2><p class="qs">A year or a range is fine.</p>
    <div class="opts"><button data-v="yes_12">2010 or later</button><button data-v="yes_short">Before 2010</button><button data-v="unsure">Not sure</button></div></div>
  <div class="q" data-k="work"><h2 class="qh">What went wrong?</h2><p class="qs">In plain words. No records needed.</p>
    <div class="opts"><button data-v="yes_5of10">Infection or sepsis</button><button data-v="clot">Blood clot</button><button data-v="fracture">The catheter broke, cracked or moved</button><button data-v="none">Nothing serious</button></div></div>
  <div class="q" data-k="age"><h2 class="qh">Did it lead to surgery to remove it, or a hospital stay?</h2><p class="qs">Either one counts.</p>
    <div class="opts"><button data-v="yes">Yes, removed</button><button data-v="yes">Yes, hospitalized</button><button data-v="no">No</button></div></div>
  <div class="q" data-k="denial_timing"><h2 class="qh">When did the problem happen?</h2><p class="qs">Filing deadlines vary by state. We check this first.</p>
    <div class="opts"><button data-v="under_60">Within the last 2 years</button><button data-v="over_60">2 to 10 years ago</button><button data-v="na">More than 10 years ago</button></div></div>
  <div class="q" data-k="lawyer"><h2 class="qh">Is another lawyer already handling this claim?</h2><p class="qs">Last one.</p>
    <div class="opts"><button data-v="no">No</button><button data-v="yes">Yes</button></div></div>
  <div class="q" data-k="result">
    <div id="res"></div>
    <form id="cap" novalidate>
      <div class="grid2">
        <div class="f"><label for="first">First name</label><input id="first" name="first_name" autocomplete="given-name" required><span class="err"></span></div>
        <div class="f"><label for="last">Last name</label><input id="last" name="last_name" autocomplete="family-name" required><span class="err"></span></div>
        <div class="f"><label for="phone">Best phone</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required><span class="err"></span></div>
        <div class="f"><label for="state">State you live in</label>{STATES}<span class="err"></span></div>
      </div>
      {CONSENT}
      <button class="cta wide" type="submit" id="send">Send my answers to the team</button>
      <p class="fine">By submitting you agree to the firm's <a href="https://www.jeffreysglassman.com/">privacy policy and terms</a>. Attorney advertising. This check is not a case decision; a lawyer reviews every inquiry.</p>
    </form>
    <div class="ok" id="done" hidden><b>Received.</b>A member of the disability team will call you back. If you'd rather talk now, call <a href="tel:+16614713263">(661) 471-3263</a>.</div>
  </div>
  <p class="backrow"><button class="back" id="back" hidden>← Back</button></p>
</div>'''

quiz_js = r'''<script>
(function(){
  var WEBHOOK="https://hook.us2.make.com/7iit9nlnwuxmvt5ry1p7tq1vlryp5bkc", PID='glassman-bard-quiz';
  var qs=[].slice.call(document.querySelectorAll('.q')), i=0, a={}, bar=document.getElementById('bar'), back=document.getElementById('back'), count=document.getElementById('count');
  var utm={}; try{new URL(location.href).searchParams.forEach(function(v,k){ if(/^(utm_|fbclid|gclid)/.test(k)) utm[k]=v; });}catch(e){}
  function score(){ var hadPort=a.status!=='no'; var injury=a.work!=='none'; var strong=hadPort&&injury&&a.age==='yes'&&a.lawyer==='no'; var urgent=strong&&a.denial_timing==='under_60'; return a.lawyer==='yes'?'represented':(strong?(urgent?'strong_urgent':'strong'):'review'); }
  function show(n){ qs[i].classList.remove('on'); i=n; qs[i].classList.add('on'); var last=qs.length-1; bar.style.width=Math.round(100*i/last)+'%'; count.textContent=(i<last?(i+1)+' of 6':'Your result'); back.hidden=(i===0||i===last);
    document.getElementById('quiz').scrollIntoView({behavior:'smooth',block:'start'});
    if(qs[i].dataset.k==='result'){ var s=score(), t={
      strong_urgent:'<h2 class="qh">Your answers point to a possible Bard PowerPort claim.</h2><p class="qs">Recent injuries have the clearest path. Leave your details and the team calls you today.</p>',
      strong:'<h2 class="qh">Your answers point to a possible Bard PowerPort claim.</h2><p class="qs">A lawyer makes the final call, but this is worth a conversation. Leave your details and the team calls you back.</p>',
      review:'<h2 class="qh">Your situation needs a closer look.</h2><p class="qs">Some answers need a person to review them. Leave your details and the team will follow up if it\'s a fit.</p>',
      represented:'<h2 class="qh">You already have a lawyer on this claim.</h2><p class="qs">We don\'t step on another firm\'s case. If that changes, we\'re here.</p>'};
      document.getElementById('res').innerHTML=t[s]; a.result=s; document.getElementById('cap').hidden=(s==='represented'); } }
  qs.forEach(function(q,idx){ q.querySelectorAll('.opts button').forEach(function(b){ b.addEventListener('click',function(){ a[q.dataset.k]=b.dataset.v; show(idx+1); }); }); });
  back.addEventListener('click',function(){ show(Math.max(0,i-1)); });
  function v(id,ok,m){ var el=document.getElementById(id), e=el.parentNode.querySelector('.err'); e.textContent=ok?'':m; el.setAttribute('aria-invalid',ok?'false':'true'); return ok; }
  document.getElementById('cap').addEventListener('submit',function(ev){ ev.preventDefault(); var f=ev.target, ok=true;
    ok=v('first',f.first_name.value.trim().length>1,'Enter your first name')&ok; ok=v('last',f.last_name.value.trim().length>1,'Enter your last name')&ok;
    ok=v('phone',/^\D*(\d\D*){10}$/.test(f.phone.value),'Enter a 10-digit phone number')&ok; ok=v('state',!!f.state.value,'Choose your state')&ok;
    var ce=document.getElementById('cerr'); ce.textContent=f.consent_call.checked?'':'Please agree to be called so the team can reach you'; ok=ok&&f.consent_call.checked; if(!ok) return;
    var p={campaign_id:'GLASSMAN-BARD-POWERPORT-001',door:'quiz',received_at:new Date().toISOString(),page:location.href,answers:a,
      lead:{first_name:f.first_name.value.trim(),last_name:f.last_name.value.trim(),phone:f.phone.value.replace(/\D/g,''),state:f.state.value},
      consent:{call:f.consent_call.checked,sms:f.consent_sms.checked,text:'Agreed on page '+location.pathname+' at '+new Date().toISOString()},source:utm};
    document.getElementById('send').disabled=true; try{window.dataLayer.push({event:'ee_lead_submit_attempt',page_id:PID,campaign_id:'GLASSMAN-BARD-POWERPORT-001',door:'quiz'});}catch(e){}
    fetch(WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),keepalive:true}).catch(function(){}).then(function(){ f.hidden=true; document.getElementById('done').hidden=false; try{window.dataLayer.push({event:'ee_lead_submit_success',page_id:PID,campaign_id:'GLASSMAN-BARD-POWERPORT-001',door:'quiz'});}catch(e){} });
  });
})();
</script>'''

# ---------- FORM ----------
form_card = f'''<div class="card">
  <div class="card-head"><span class="k">Request a callback</span><span class="count">Takes a minute</span></div>
  <form id="f" novalidate data-campaign="GLASSMAN-BARD-POWERPORT-001" data-door="form">
    <div class="grid2">
      <div class="f"><label for="first">First name</label><input id="first" name="first_name" autocomplete="given-name" required><span class="err"></span></div>
      <div class="f"><label for="last">Last name</label><input id="last" name="last_name" autocomplete="family-name" required><span class="err"></span></div>
      <div class="f"><label for="phone">Best phone</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required><span class="err"></span></div>
      <div class="f"><label for="email">Email (optional)</label><input id="email" name="email" type="email" autocomplete="email"><span class="err"></span></div>
      <div class="f"><label for="state">State you live in</label>{STATES}<span class="err"></span></div>
      <div class="f"><label for="status">What happened with the port?</label><select id="status" name="status" required><option value="">Choose</option><option value="infection">Infection or sepsis</option><option value="clot">Blood clot</option><option value="fracture">Catheter broke, cracked or moved</option><option value="other">Something else</option></select><span class="err"></span></div>
      <div class="f"><label for="work">Was it removed or did you go to the hospital?</label><select id="work" name="work" required><option value="">Choose</option><option value="removed">Removed by surgery</option><option value="hospital">Hospital stay</option><option value="both">Both</option><option value="no">Neither / not sure</option></select><span class="err"></span></div>
      <div class="f"><label for="when">Best time to call</label><select id="when" name="best_time"><option>Morning</option><option>Afternoon</option><option>Evening</option><option>Any time</option></select><span class="err"></span></div>
    </div>
    <div class="f" style="margin-top:14px"><label for="note">Anything you want the team to know (optional)</label><textarea id="note" name="note" rows="2" placeholder="No medical details needed here."></textarea><span class="err"></span></div>
    {CONSENT}
    <button class="cta wide" type="submit" id="send">Request my callback</button>
    <p class="fine">By submitting you agree to the firm's <a href="https://www.jeffreysglassman.com/">privacy policy and terms</a>. Attorney advertising. Not legal advice. Not affiliated with Becton Dickinson or C. R. Bard.</p>
  </form>
  <div class="ok" id="done" hidden><b>Received.</b>The disability team will call you at the time you chose. If you'd rather talk now, call <a href="tel:+16614713263">(661) 471-3263</a>.</div>
</div>'''

form_js = r'''<script>
(function(){
  var WEBHOOK="https://hook.us2.make.com/7iit9nlnwuxmvt5ry1p7tq1vlryp5bkc", PID='glassman-bard-form';
  var utm={}; try{new URL(location.href).searchParams.forEach(function(v,k){ if(/^(utm_|fbclid|gclid)/.test(k)) utm[k]=v; });}catch(e){}
  function v(id,ok,m){ var el=document.getElementById(id), e=el.parentNode.querySelector('.err'); e.textContent=ok?'':m; el.setAttribute('aria-invalid',ok?'false':'true'); return ok; }
  document.getElementById('f').addEventListener('submit',function(ev){ ev.preventDefault(); var f=ev.target, ok=true;
    ok=v('first',f.first_name.value.trim().length>1,'Enter your first name')&ok; ok=v('last',f.last_name.value.trim().length>1,'Enter your last name')&ok;
    ok=v('phone',/^\D*(\d\D*){10}$/.test(f.phone.value),'Enter a 10-digit phone number')&ok;
    ok=v('email',!f.email.value||/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value),'Check the email address')&ok;
    ok=v('state',!!f.state.value,'Choose your state')&ok; ok=v('status',!!f.status.value,'Choose one')&ok; ok=v('work',!!f.work.value,'Choose one')&ok;
    var ce=document.getElementById('cerr'); ce.textContent=f.consent_call.checked?'':'Please agree to be called so the team can reach you'; ok=ok&&f.consent_call.checked; if(!ok) return;
    var p={campaign_id:'GLASSMAN-BARD-POWERPORT-001',door:'form',received_at:new Date().toISOString(),page:location.href,
      lead:{first_name:f.first_name.value.trim(),last_name:f.last_name.value.trim(),phone:f.phone.value.replace(/\D/g,''),email:f.email.value.trim(),state:f.state.value},
      answers:{status:f.status.value,work:f.work.value,best_time:f.best_time.value,note:f.note.value.trim()},
      consent:{call:f.consent_call.checked,sms:f.consent_sms.checked,text:'Agreed on page '+location.pathname+' at '+new Date().toISOString()},
      trustedform:(f.xxTrustedFormCertUrl&&f.xxTrustedFormCertUrl.value)||'',source:utm};
    document.getElementById('send').disabled=true; try{window.dataLayer.push({event:'ee_lead_submit_attempt',page_id:PID,campaign_id:'GLASSMAN-BARD-POWERPORT-001',door:'form'});}catch(e){}
    fetch(WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),keepalive:true}).catch(function(){}).then(function(){ f.hidden=true; document.getElementById('done').hidden=false; try{window.dataLayer.push({event:'ee_lead_submit_success',page_id:PID,campaign_id:'GLASSMAN-BARD-POWERPORT-001',door:'form'});}catch(e){} });
  });
})();
</script>'''

# ---------- SOFIA ----------
sofia_card = '''<div class="card phonecard">
  <div class="card-head"><span class="k">Talk to Sofia</span><span class="count">24/7 · recorded</span></div>
  <p class="num" id="num">(661) 471-3263</p>
  <p class="ctas"><a class="cta" href="tel:+16614713263" data-door="sofia" data-campaign="GLASSMAN-BARD-POWERPORT-001">Tap to call</a><button class="copybtn" id="copy" type="button">Copy number</button></p>
  <div class="chat">
    <div class="msg s">Hi, I'm Sofia, an AI intake assistant for Jeffrey Glassman Injury Lawyers. This call is recorded. You're calling about a Bard PowerPort, the implanted port catheter, is that right?</div>
    <div class="msg c">Yes. It got infected and they had to take it out.</div>
    <div class="msg s">I'm sorry to hear that. Roughly when was the port implanted?</div>
    <div class="msg c">Around 2019.</div>
    <div class="msg s">And it led to surgery to remove it, or a hospital stay?</div>
    <div class="msg c">Both. Four days in the hospital.</div>
    <div class="msg s">It looks like you may qualify. Can I get your name and the best number, and connect you with the team now?</div>
  </div>
</div>'''

sofia_js = '''<script>
document.getElementById('copy').addEventListener('click',function(){var b=this,t='(661) 471-3263';function d(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy number'},1500)}
try{navigator.clipboard.writeText(t).then(d,function(){var r=document.createRange();r.selectNodeContents(document.getElementById('num'));var s=getSelection();s.removeAllRanges();s.addRange(r)})}catch(e){}});
</script>'''

# ---------- INDEX ----------
index_card = '''<div class="card doorsmini">
  <div class="card-head"><span class="k">Start here</span><span class="count">Pick one</span></div>
  <a class="door-row" href="quiz.html"><span class="n">1</span><span><b>Check my case</b><small>Six questions, two minutes, instant result</small></span><span class="arr">→</span></a>
  <a class="door-row" href="sofia.html"><span class="n">2</span><span><b>Talk to someone now</b><small>Call (661) 471-3263, any time</small></span><span class="arr">→</span></a>
  <a class="door-row" href="form.html"><span class="n">3</span><span><b>Request a callback</b><small>Send your details, pick a time</small></span><span class="arr">→</span></a>
  <p class="fine" style="margin:14px 0 0">Every path ends with a person on our disability team reviewing your situation.</p>
</div>'''

DOORS = '''<section><div class="in">
  <h2 class="sec center">Three ways to start. One team behind all of them.</h2>
  <div class="doors">
    <a class="door" href="quiz.html"><img src="img/ad-quiz.jpg" alt="" loading="lazy"><div class="body"><span class="k">Two minutes</span><h3>Six quick questions</h3><p>Infection, clot, or a port that broke? See where you stand right away.</p><span class="btn gold">Take the quiz</span></div></a>
    <a class="door" href="sofia.html"><img src="img/ad-sofia.jpg" alt="" loading="lazy"><div class="body"><span class="k">Right now</span><h3>Talk it through</h3><p>Call and tell Sofia what happened. She connects you with the team.</p><span class="btn">Call now</span></div></a>
    <a class="door" href="form.html"><img src="img/ad-form.jpg" alt="" loading="lazy"><div class="body"><span class="k">On your schedule</span><h3>Request a callback</h3><p>Send a few details and pick the time. The team calls you.</p><span class="btn">Start the form</span></div></a>
  </div>
</div></section>'''

PAGES = {
 'index.html': dict(pid='glassman-bard-home', title='Bard PowerPort Injury Claims · Jeffrey Glassman Injury Lawyers', desc='Infection, blood clot, or a port catheter that broke or moved? Check your Bard PowerPort case in two minutes or talk to the team at Jeffrey Glassman Injury Lawyers. No fee unless we win.',
   hero=hero('Bard PowerPort · implanted port catheter','Infection, blood clot, or a port that broke? Find out where you stand.','Thousands of people had a Bard PowerPort implanted for chemo or long-term treatment. Some suffered infections, blood clots, or catheter pieces that broke off and moved. If that happened to you, you may have a claim, and we don\'t get paid unless you do.',['No fee unless we win','A person calls you back','Deadlines tracked for you'], index_card),
   body=TRUST+DOORS+TEAM+STEPS+CLOSE%dict(a_href='quiz.html',a_text='Check my eligibility',b_href='sofia.html',b_text='Talk to someone now'), js=''),
 'quiz.html': dict(pid='glassman-bard-quiz', title='Bard PowerPort Case Check · Jeffrey Glassman Injury Lawyers', desc='Six quick questions about your port catheter and what happened. See your next step right away.',
   hero=hero('Bard PowerPort · two-minute check','Six questions. Then you know your next step.','Answer six quick questions about your port catheter and what happened. No medical records, no Social Security number, no cost.',['No fee unless we win','Instant result','A person reviews every answer'], quiz_card),
   body=TRUST+TEAM+STEPS+CLOSE%dict(a_href='sofia.html',a_text='Talk to someone now',b_href='form.html',b_text='Request a callback'), js=quiz_js),
 'sofia.html': dict(pid='glassman-bard-sofia', title='Talk to Sofia · Bard PowerPort · Jeffrey Glassman Injury Lawyers', desc='Call and tell us what happened with your port. Sofia, our AI intake assistant, asks a few yes/no questions and connects you with the team.',
   hero=hero('Bard PowerPort · talk it through','Tell us what happened. We listen first.','Sofia is our intake assistant. She\'s an AI, she says so, and the call is recorded. She asks a few yes/no questions about your port, then hands you to a person on the team.',['Answers 24/7','No medical records asked','A person takes over'], sofia_card),
   body=TRUST+'''<section><div class="in"><h2 class="sec center">What to expect on the call</h2><div class="steps">
    <div><b>She tells you what she is</b><span>An AI assistant, and that the call is recorded. No surprises.</span></div>
    <div><b>Four yes/no questions</b><span>When the port went in, what went wrong, whether it was removed, whether you have a lawyer.</span></div>
    <div><b>Name, number, state</b><span>That's all she collects. No medical details, no Social Security number.</span></div>
    <div><b>A person takes over</b><span>Sofia introduces you to the disability team and steps out.</span></div></div></div></section>'''+TEAM+CLOSE%dict(a_href='quiz.html',a_text='Check my eligibility',b_href='form.html',b_text='Request a callback'), js=sofia_js),
 'form.html': dict(pid='glassman-bard-form', title='Request a Callback · Bard PowerPort · Jeffrey Glassman Injury Lawyers', desc='Tell us what happened with your Bard PowerPort and the team calls you back at the time you choose.',
   hero=hero('Bard PowerPort · request a callback','Tell us what happened. We\'ll call you back.','A member of the team reviews what you send and calls at the time you choose. No fee unless we win.',['Pick your time','One business day','No fee unless we win'], form_card),
   body=TRUST+TEAM+STEPS+CLOSE%dict(a_href='quiz.html',a_text='Check my eligibility',b_href='sofia.html',b_text='Talk to someone now'), js=form_js),
}

ADS_BODY = '''<section><div class="in">
  <h2 class="sec center">The campaign. Facebook and Instagram, your brand.</h2>
  <p class="sub center" style="margin-inline:auto">Three ads, one per way in. Each lands on its own page so we know which door produced the claim. Built, reviewed by Meta, paused until you say go.</p>
  <div class="ads">
    <div class="ad"><img src="img/ad-quiz.jpg" alt="Ad: Had a port catheter implanted?"><div class="meta"><span class="tag">Door 1</span><span class="tag">Quiz</span><b>Had a port catheter implanted?</b><span>Infection, blood clot, or a catheter that broke or moved? Answer six quick questions and find out where you stand. No fee unless we win.</span></div></div>
    <div class="ad"><img src="img/ad-sofia.jpg" alt="Ad: Talk it through with Sofia"><div class="meta"><span class="tag">Door 2</span><span class="tag">Call</span><b>Talk it through with Sofia</b><span>Prefer to talk? Call and tell us what happened with your port. Sofia, our AI intake assistant, listens, asks a few questions, and connects you with the team.</span></div></div>
    <div class="ad"><img src="img/ad-form.jpg" alt="Ad: Start your port catheter case review"><div class="meta"><span class="tag">Door 3</span><span class="tag">Form</span><b>Start your port catheter case review</b><span>Infection, clot, fracture or migration? Tell Jeffrey Glassman Injury Lawyers what happened and the team calls you back.</span></div></div>
  </div>
</div></section>'''
PAGES['ads.html'] = dict(pid='glassman-bard-ads', title='Bard PowerPort Campaign Ads · Jeffrey Glassman Injury Lawyers', desc='The three ads behind the Glassman Bard PowerPort campaign, one per way in.',
   hero=hero('Bard PowerPort · the campaign','Three ads. Three doors. One team.','Every ad is in your brand and lands on its own page: the case check, Sofia, or the callback form. Spend starts even and moves weekly toward the door producing signed cases.',['Facebook + Instagram','Per-door tracking','Paused until you say go'], index_card),
   body=ADS_BODY+TRUST+STEPS+CLOSE%dict(a_href='quiz.html',a_text='Check my eligibility',b_href='sofia.html',b_text='Talk to someone now'), js='')

for name, p in PAGES.items():
    extra = '<!-- PRODUCTION: TrustedForm script goes here (xxTrustedFormCertUrl). -->' if name=='form.html' else ''
    html = HEAD % dict(pid=p['pid'], title=p['title'], desc=p['desc'], extra_head=extra) + p['hero'] + p['body'] + p['js'] + FOOT
    open(name,'w').write(html); print('wrote', name, len(html))
