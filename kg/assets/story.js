/* kylegosselin.com story build: CTA tracking, reveal, chapter index. No dependencies. */
(function(){
  var d=document; d.documentElement.classList.add('js');
  window.dataLayer=window.dataLayer||[];
  function gtagSafe(){ if(typeof window.gtag==='function'){ window.gtag.apply(null,arguments); } }

  // CTA click events: data-cta="call|book|x|..." -> GA4 event + Evolution Engine dataLayer event
  d.addEventListener('click',function(e){
    var el=e.target.closest&&e.target.closest('[data-cta]'); if(!el) return;
    var cta=el.getAttribute('data-cta'), loc=el.getAttribute('data-loc')||'', href=el.getAttribute('href')||'';
    var name={call:'call_my_ai',book:'book_call',x:'follow_x'}[cta]||('cta_'+cta);
    gtagSafe('event',name,{cta_location:loc,link_url:href,transport_type:'beacon'});
    window.dataLayer.push({event:'ee_cta_click',cta_id:cta+(loc?'_'+loc:''),cta_text:(el.textContent||'').trim().slice(0,80),destination:href,tenant_id:'KG',domain:'kylegosselin.com',landing_page_url:location.href});
  });

  // Reveal on scroll
  var els=d.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}})},{rootMargin:'0px 0px -8% 0px'});
    els.forEach(function(el){io.observe(el)});
  } else { els.forEach(function(el){el.classList.add('in')}); }
  window.addEventListener('beforeprint',function(){els.forEach(function(el){el.classList.add('in')})});

  // Chapter index highlight
  var links=[].slice.call(d.querySelectorAll('.toc a'));
  if(links.length&&'IntersectionObserver' in window){
    var map={}; links.forEach(function(a){map[a.getAttribute('href').slice(1)]=a});
    var co=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting&&map[x.target.id]){links.forEach(function(a){a.removeAttribute('aria-current')});map[x.target.id].setAttribute('aria-current','true');}})},{rootMargin:'-45% 0px -50% 0px'});
    d.querySelectorAll('section.chapter[id]').forEach(function(s){co.observe(s)});
  }

  // Signup: UI only. No endpoint is wired yet, so nothing is sent or stored.
  var f=d.getElementById('signup');
  if(f){ f.addEventListener('submit',function(e){ e.preventDefault();
    var o=f.querySelector('output'); if(o) o.textContent='The list isn\u2019t open yet. Nothing was sent. Follow @kylepractor on X and you\u2019ll see it first.';
    gtagSafe('event','signup_attempt',{cta_location:'work_with_me'});
  }); }

  var y=d.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
})();
