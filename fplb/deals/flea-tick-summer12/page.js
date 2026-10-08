(function(){
  var CODE='SUMMER12';
  function copied(b){var t=b.textContent;b.textContent='Copied ✓';b.classList.add('ok');setTimeout(function(){b.textContent=t;b.classList.remove('ok');},1500);}
  document.querySelectorAll('[data-copy]').forEach(function(b){
    b.addEventListener('click',function(){
      var done=function(){copied(b);(window.dataLayer||[]).push({event:'code_copy',code:CODE});};
      if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(CODE).then(done,fb);}else fb();
      function fb(){var t=document.createElement('textarea');t.value=CODE;t.setAttribute('readonly','');t.style.position='absolute';t.style.left='-9999px';document.body.appendChild(t);t.select();try{document.execCommand('copy');done();}catch(e){}document.body.removeChild(t);}
    });
  });
  document.querySelectorAll('a[rel~="sponsored"]').forEach(function(a){
    a.addEventListener('click',function(){(window.dataLayer||[]).push({event:'affiliate_click',offer:a.getAttribute('data-offer'),href:a.href});});
  });
  var els=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -10% 0px',threshold:.12});
    els.forEach(function(el){io.observe(el);});
  } else { els.forEach(function(el){el.classList.add('in');}); }
  var pill=document.getElementById('pill'),hero=document.querySelector('.hero'),deal=document.getElementById('deal');
  function sync(){
    var past=hero.getBoundingClientRect().bottom<0;
    var r=deal.getBoundingClientRect(),inDeal=r.top<window.innerHeight*.75&&r.bottom>0;
    var show=past&&!inDeal;
    pill.classList.toggle('show',show);
    document.body.classList.toggle('pill-on',show);
    pill.setAttribute('aria-hidden',show?'false':'true');
    pill.querySelectorAll('a,button').forEach(function(x){x.tabIndex=show?0:-1;});
  }
  window.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',sync);sync();
})();
