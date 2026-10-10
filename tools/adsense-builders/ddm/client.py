# Browser code for Discount Deal Me. No network calls except reading /data/deals.json from this site.
JS = r"""
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var NOW=Date.now();
  var HOUR=36e5;

  // ---------- real-discount calculator
  var f=document.getElementById('meter-form');
  if(f){
    var g=function(id){return document.getElementById(id)};
    var num=function(n){var v=parseFloat(f.elements[n].value);return isFinite(v)&&v>=0?v:null};
    var money=function(v){return '$'+v.toFixed(2)};
    var pct=function(v){return Math.round(v)+'%'};
    var calc=function(){
      var was=num('was'),now=num('now'),usual=num('usual'),code=num('code')||0,ship=num('ship')||0,cb=num('cb')||0;
      var fill=g('gauge-fill'),v=g('verdict');
      if(now===null||!was){fill.style.width='0';v.textContent='Enter the first two prices to see the real discount.';['o-tag','o-total','o-net','o-real'].forEach(function(i){g(i).textContent='\u2013'});return;}
      code=Math.min(code,100);cb=Math.min(cb,100);
      var afterCode=now*(1-code/100),total=afterCode+ship,net=total-afterCode*cb/100;
      var tag=(was-now)/was*100;
      g('o-tag').textContent=pct(tag);g('o-total').textContent=money(total);g('o-net').textContent=money(net);
      var base=usual||was,real=(base-net)/base*100;
      g('o-real').textContent=usual?(real>=0?pct(real)+' less':pct(-real)+' more'):'add usual price';
      fill.style.width=Math.max(0,Math.min(100,real*2))+'%';
      var msg;
      if(!usual){msg='The tag says '+pct(tag)+' off. Add what it usually sells for to check that number.';}
      else if(real<=0){msg='With extras counted, this costs the same as or more than usual. Not a real discount.';}
      else if(real<5){msg='About the normal price once everything is counted.';}
      else if(real<15){msg='A modest real saving. Worth it if the item was already on your list.';}
      else if(real<30){msg='A genuine discount against the usual price.';}
      else {msg='A large real discount. Confirm it is the identical item and a reputable seller.';}
      v.textContent=msg;
    };
    f.addEventListener('input',calc);
    f.addEventListener('reset',function(){setTimeout(calc,0)});
    f.addEventListener('submit',function(e){e.preventDefault();calc()});
  }

  // ---------- guide filter chips
  var gchips=$$('.chip[data-cat]');
  gchips.forEach(function(c){c.addEventListener('click',function(){
    var cat=c.getAttribute('data-cat');
    gchips.forEach(function(o){var on=o===c;o.classList.toggle('is-on',on);o.setAttribute('aria-pressed',on?'true':'false')});
    $$('#art-grid .gcard').forEach(function(card){card.hidden=!(cat==='all'||card.getAttribute('data-cat')===cat)});
  })});

  // ---------- deal time handling (all pages)
  var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function endLabel(iso){
    if(!iso) return {t:'Ongoing',soon:false};
    var ms=Date.parse(iso)-NOW;
    if(ms<=0) return {t:'Ended',soon:true};
    if(ms<48*HOUR){var h=Math.floor(ms/HOUR),m=Math.floor(ms%HOUR/6e4);return {t:'Ends in '+(h?h+'h ':'')+m+'m',soon:true};}
    var d=new Date(iso);return {t:'Ends '+MON[d.getMonth()]+' '+d.getDate(),soon:ms<72*HOUR};
  }
  function expired(iso){return !!iso&&Date.parse(iso)<=NOW}
  $$('[data-ends]').forEach(function(el){
    var iso=el.getAttribute('data-ends');
    if(expired(iso)){el.hidden=true;return;}
    var lab=el.querySelector('[data-end-label]');
    if(lab){var L=endLabel(iso);lab.textContent=L.t;lab.classList.toggle('is-soon',L.soon);}
  });
  $$('.deal-grid[data-limit]').forEach(function(grid){
    var lim=+grid.getAttribute('data-limit'),shown=0;
    $$('.deal',grid).forEach(function(c){if(c.hidden)return;if(shown>=lim)c.hidden=true;else shown++;});
    var empty=grid.parentNode.querySelector('.empty');if(empty)empty.hidden=shown>0;
  });
  $$('.ending-list,[data-side-deals]').forEach(function(list){
    var n=0;$$('li',list).forEach(function(li){if(!li.hidden)n++;});
    if(!n){var p=document.createElement('li');p.textContent='No deals ending soon right now.';list.appendChild(p);}
  });
  // copy-code buttons
  $$('.code-copy').forEach(function(b){b.addEventListener('click',function(){
    var c=b.getAttribute('data-copy');
    var done=function(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy'},1600)};
    if(navigator.clipboard)navigator.clipboard.writeText(c).then(done,function(){});else done();
  })});
  // affiliate click measurement for deal cards (event pages and the partner page carry their own)
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('.deal a[rel~="sponsored"]');
    if(a)(window.dataLayer=window.dataLayer||[]).push({event:'affiliate_click',offer:a.getAttribute('data-offer'),href:a.href});
  });

  // ---------- feed status, counts and finder
  var needFeed=$('[data-live-count]')||$('#deal-grid');
  if(!needFeed||!window.fetch)return;
  fetch('/data/deals.json',{credentials:'omit'}).then(function(r){return r.json()}).then(function(feed){
    var live=feed.deals.filter(function(d){return !expired(d.ends)});
    $$('[data-live-count]').forEach(function(el){el.textContent=live.length});
    $$('[data-cat-count]').forEach(function(el){var c=el.getAttribute('data-cat-count');el.textContent=live.filter(function(d){return !c||d.category===c}).length});
    var age=(NOW-Date.parse(feed.checked_at))/864e5;
    if(age>3)$$('.feed-status').forEach(function(s){s.classList.add('is-stale');var t=s.querySelector('[data-checked]');if(t)t.textContent+=' ('+Math.floor(age)+' days ago)';});
    if($('#deal-grid'))finder(feed);
  }).catch(function(){});

  function finder(feed){
    var grid=$('#deal-grid'),cards=$$('.deal',grid),byId={};
    feed.deals.forEach(function(d){d._hay=[d.merchant,d.title,d.category,d.region,d.summary_ai,d.network_terms].join(' ').toLowerCase();byId[d.id]=d;});
    var form=$('#finder-form'),input=$('#fq'),interp=$('#interpreted'),count=$('#result-count'),empty=$('#finder-empty');
    var tEnd=$('#f-ending'),tNo=$('#f-nocode'),tLoc=$('#f-nolocal'),sort=$('#f-sort'),chips=$$('.chip[data-fcat]');
    var st={q:'',cat:''};
    var CATS={'Kitchen':/\b(kitchen|mixer|mixers|blender|cookware|appliance|appliances|toaster|kettle|food processor|espresso|kitchenaid|t-fal|tfal)\b/,
      'Home':/\b(home|iron|steam|fan|fans|laundry|household)\b/,
      'Coffee & food':/\b(coffee|tea|food|snack|snacks|peet'?s)\b/,
      'Experiences':/\b(ticket|tickets|things to do|experience|experiences|aquarium|observatory|bowling|movie|movies|cinema|date night|attraction|attractions)\b/,
      'Memberships':/\b(membership|memberships|costco|bj'?s|warehouse club)\b/,
      'Apparel':/\b(sock|socks|apparel|clothing|clothes)\b/,
      'Pets':/\b(pet|pets|dog|dogs|cat|cats|flea|tick)\b/};
    var PLACES=[[/\b(nyc|new york|manhattan|new jersey|nj)\b/,'NYC area','new york'],[/\b(boston|massachusetts|northeast)\b/,'Boston and Northeast','boston'],[/\b(la|los angeles|socal|southern california|long beach|orange county|san diego)\b/,'Southern California','southern california']];
    var GENERIC=/\b(kitchen|home|household|food|coffee|apparel|clothing|clothes|pets?|experiences?|things to do|memberships?|tickets?|appliances?)\b/g;
    var STOP=/\b(deal|deals|on|for|the|a|an|and|with|in|at|to|me|show|find|best|good|any|some|off|sale|sales|discount|discounts|near|that|are|is|of|i|want|cheap)\b/g;
    function parse(q){
      var s=' '+q.toLowerCase()+' ',p={terms:[],notes:[]};
      if(/\b(today|tonight)\b/.test(s)){p.hours=24;p.notes.push('ending within 24 hours');s=s.replace(/\b(ending|ends|today|tonight)\b/g,' ');}
      else if(/\b(ending soon|ends soon|ending|expiring|last chance|this week|soon)\b/.test(s)){p.hours=/this week/.test(s)?168:72;p.notes.push('ending within '+(p.hours===168?'7 days':'72 hours'));s=s.replace(/\b(ending soon|ends soon|ending|expiring|last chance|this week|soon)\b/g,' ');}
      if(/\b(no code|without (a )?code|no coupon|codeless)\b/.test(s)){p.noCode=true;p.notes.push('no code needed');s=s.replace(/\b(no code|without (a )?code|no coupon|codeless)\b/g,' ');}
      else if(/\b(code|codes|coupon|coupons|promo code)\b/.test(s)){p.hasCode=true;p.notes.push('has a code');s=s.replace(/\b(promo code|code|codes|coupon|coupons)\b/g,' ');}
      if(/free ship/.test(s)){p.freeShip=true;p.notes.push('free shipping');s=s.replace(/free shipping|free ship\w*/g,' ');}
      var m=s.match(/(\d{1,2})\s*(%|percent)/);if(m){p.minPct=+m[1];p.notes.push(m[1]+'% off or more');s=s.replace(m[0],' ');}
      var u=s.match(/under \$?\d+/);if(u){p.notes.push('we don\u2019t have item prices, so "'+u[0]+'" was ignored');s=s.replace(u[0],' ');}
      for(var c in CATS){if(CATS[c].test(s)){p.cat=c;p.notes.push('category: '+c);s=s.replace(GENERIC,' ');break;}}
      PLACES.forEach(function(pl){if(pl[0].test(s)){p.place=pl;p.notes.push('near '+pl[1]);s=s.replace(new RegExp(pl[0].source,'g'),' ');}});
      p.terms=s.replace(STOP,' ').split(/[^a-z0-9$&']+/).filter(function(t){return t.length>1});
      if(p.terms.length)p.notes.push('matching "'+p.terms.join(' ')+'"');
      return p;
    }
    function match(d,p){
      if(expired(d.ends))return false;
      var cat=st.cat||p.cat;if(cat&&d.category!==cat)return false;
      var hrs=tEnd.checked?72:p.hours;if(hrs&&(!d.ends||Date.parse(d.ends)-NOW>hrs*HOUR))return false;
      if((tNo.checked||p.noCode)&&d.code)return false;
      if(p.hasCode&&!d.code)return false;
      if(tLoc.checked&&d.conditions.indexOf('local')>-1)return false;
      if(p.freeShip&&!(d.kind==='free_shipping'||/free shipping/i.test(d.network_terms+' '+d.title)))return false;
      if(p.minPct&&!(d.pct>=p.minPct))return false;
      if(p.place&&!(d._hay.indexOf(p.place[2])>-1||d._hay.indexOf(p.place[1].toLowerCase())>-1))return false;
      for(var i=0;i<p.terms.length;i++){var t=p.terms[i],t2=t.replace(/s$/,'');if(d._hay.indexOf(t)<0&&d._hay.indexOf(t2)<0)return false;}
      return true;
    }
    function apply(push){
      var p=parse(st.q),vis=[];
      cards.forEach(function(c){var d=byId[c.getAttribute('data-deal')];var ok=d?match(d,p):false;c.hidden=!ok;if(ok)vis.push([c,d]);});
      var k=sort.value;
      vis.sort(function(a,b){
        if(k==='ending')return (a[1].ends?Date.parse(a[1].ends):9e15)-(b[1].ends?Date.parse(b[1].ends):9e15);
        if(k==='newest')return Date.parse(b[1].starts||0)-Date.parse(a[1].starts||0);
        return b[1].score-a[1].score;
      });
      vis.forEach(function(v){grid.appendChild(v[0])});
      count.textContent=vis.length+(vis.length===1?' deal':' deals')+' shown, sorted by '+sort.options[sort.selectedIndex].text.toLowerCase();
      empty.hidden=vis.length>0;
      if(st.q&&p.notes.length){interp.hidden=false;interp.innerHTML='';var b=document.createElement('b');b.textContent='Showing: ';interp.appendChild(b);interp.appendChild(document.createTextNode(p.notes.join(' \u00b7 ')));}
      else interp.hidden=true;
      chips.forEach(function(c){var on=c.getAttribute('data-fcat')===(st.cat||p.cat||'');c.classList.toggle('is-on',on);c.setAttribute('aria-pressed',on?'true':'false')});
      if(push!==false&&history.replaceState){var u=new URLSearchParams();if(st.q)u.set('q',st.q);if(st.cat)u.set('cat',st.cat);if(tEnd.checked)u.set('ending','1');if(tNo.checked)u.set('nocode','1');if(k!=='score')u.set('sort',k);history.replaceState(null,'',location.pathname+(u.toString()?'?'+u:'')+location.hash);}
    }
    var qs=new URLSearchParams(location.search);
    st.q=qs.get('q')||'';st.cat=qs.get('cat')||'';input.value=st.q;
    tEnd.checked=qs.get('ending')==='1';tNo.checked=qs.get('nocode')==='1';if(qs.get('sort'))sort.value=qs.get('sort');
    form.addEventListener('submit',function(e){e.preventDefault();st.q=input.value.trim();st.cat='';apply();});
    input.addEventListener('input',function(){st.q=input.value.trim();apply();});
    chips.forEach(function(c){c.addEventListener('click',function(){st.cat=c.getAttribute('data-fcat');apply();})});
    [tEnd,tNo,tLoc,sort].forEach(function(x){x.addEventListener('change',function(){apply()})});
    $('#finder-reset').addEventListener('click',function(){st.q='';st.cat='';input.value='';tEnd.checked=tNo.checked=tLoc.checked=false;sort.value='score';apply();});
    apply(false);
    if(location.hash){var t=document.getElementById(location.hash.slice(1));if(t&&!t.hidden)t.scrollIntoView();}
  }
})();
"""

SIGNUP_JS = r"""
// Discount Deal Me email sign-up. Sends one form-encoded POST (no CORS preflight)
// to a private Make webhook that appends a row to the DDM Subscribers sheet.
(function () {
  var forms = document.querySelectorAll('form[data-signup]');
  if (!forms.length) return;
  function track(ev, p) { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: ev }, p || {})); }
  forms.forEach(function (form) {
    var msg = form.querySelector('.signup-msg');
    var btn = form.querySelector('button[type=submit]');
    var sent = false;
    function say(t, err) { msg.textContent = t; msg.classList.toggle('is-err', !!err); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sent) return;
      var email = form.elements.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say('Please enter a valid email address.', true); form.elements.email.focus(); return; }
      if (!form.elements.consent.checked) { say('Please tick the box to confirm you want our emails.', true); return; }
      if (form.elements.website.value) { say('Thanks!'); return; }
      var q = new URLSearchParams(location.search);
      var body = new URLSearchParams(new FormData(form));
      body.set('email', email);
      body.set('consent', 'yes');
      body.set('consent_text', form.querySelector('[data-consent-text]').textContent.trim());
      body.set('page_url', location.href);
      body.set('referrer', document.referrer || '');
      body.set('user_agent', navigator.userAgent || '');
      ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (q.get(k)) body.set(k, q.get(k)); });
      sent = true; btn.disabled = true; say('Signing you up…');
      fetch(form.action, { method: 'POST', body: body, keepalive: true })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); })
        .then(function () {
          track('email_signup', { form: form.elements.form.value });
          form.querySelector('.signup-row').hidden = true;
          form.querySelector('.signup-consent').hidden = true;
          say('You\u2019re on the list. Watch your inbox for our next deal email.');
        })
        .catch(function () { sent = false; btn.disabled = false; say('That didn\u2019t go through. Please try again in a moment.', true); });
    });
  });
})();
"""
