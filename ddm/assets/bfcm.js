(function(){
  'use strict';
  var NOW=Date.now(),MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  // Countdowns to Black Friday / Cyber Monday (targets are 12:00 AM Pacific).
  $$('[data-countdown]').forEach(function(el){
    var t=Date.parse(el.getAttribute('data-target')),end=Date.parse(el.getAttribute('data-end'));
    var clock=el.querySelector('.cd-clock'),msg=el.querySelector('[data-cd-msg]'),lab=el.querySelector('.cd-label');
    function tick(){
      var now=Date.now();
      if(now>=t){
        var live=now<end;el.classList.add(live?'is-live':'is-after');
        clock.hidden=true;lab.hidden=true;msg.hidden=false;msg.textContent=el.getAttribute(live?'data-live':'data-after');return false;
      }
      var s=Math.floor((t-now)/6e4),d=Math.floor(s/1440),h=Math.floor(s%1440/60),m=s%60;
      el.querySelector('[data-cd="d"]').textContent=d;el.querySelector('[data-cd="h"]').textContent=h;el.querySelector('[data-cd="m"]').textContent=m;
      return true;
    }
    if(tick()){var iv=setInterval(function(){if(!tick())clearInterval(iv)},30000);}
  });
  // Deals that have not started yet keep a "Starts" label; ended deals are removed.
  $$('.bf-deal').forEach(function(card){
    var e=card.getAttribute('data-ends'),s=card.getAttribute('data-starts');
    if(e&&Date.parse(e)<=NOW){card.hidden=true;return;}
    var sl=card.querySelector('[data-start-label]');
    if(sl&&(!s||Date.parse(s)<=NOW))sl.parentNode.removeChild(sl);
    else if(sl){var d=new Date(s);sl.textContent='Starts '+MON[d.getMonth()]+' '+d.getDate();}
  });
  $$('.bf-grid').forEach(function(g){
    var any=$$('.bf-deal',g).some(function(c){return !c.hidden});
    var empty=g.parentNode.querySelector('.grid-empty');
    if(!any){g.hidden=true;if(empty)empty.hidden=false;}
  });
})();
