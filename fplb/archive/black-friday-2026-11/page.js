/* Blue's Black Friday Picks: copy codes, track affiliate clicks, reveal on scroll. No sends. */
(function(){
  function copied(b){var t=b.textContent;b.textContent='Copied ✓';b.classList.add('ok');setTimeout(function(){b.textContent=t;b.classList.remove('ok');},1500);}
  document.querySelectorAll('[data-copy]').forEach(function(b){
    b.addEventListener('click',function(){
      var code=b.getAttribute('data-copy');
      var done=function(){copied(b);(window.dataLayer||[]).push({event:'code_copy',code:code,page:'black-friday'});};
      function fb(){var t=document.createElement('textarea');t.value=code;t.setAttribute('readonly','');t.style.position='absolute';t.style.left='-9999px';document.body.appendChild(t);t.select();try{document.execCommand('copy');done();}catch(e){}document.body.removeChild(t);}
      if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(code).then(done,fb);}else fb();
    });
  });
  document.querySelectorAll('a[rel~="sponsored"]').forEach(function(a){
    a.addEventListener('click',function(){(window.dataLayer||[]).push({event:'affiliate_click',offer:a.getAttribute('data-offer'),page:'black-friday',href:a.href});});
  });
  var els=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -10% 0px',threshold:.12});
    els.forEach(function(el){io.observe(el);});
  } else { els.forEach(function(el){el.classList.add('in');}); }
})();
