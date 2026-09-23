(function(){
  // Deal-o-Meter
  var f=document.getElementById('meter-form');
  if(f){
    var $=function(id){return document.getElementById(id)};
    var num=function(n){var v=parseFloat(f.elements[n].value);return isFinite(v)&&v>=0?v:null};
    var money=function(v){return '$'+v.toFixed(2)};
    var pct=function(v){return Math.round(v)+'%'};
    function calc(){
      var was=num('was'),now=num('now'),usual=num('usual'),code=num('code')||0,ship=num('ship')||0,cb=num('cb')||0;
      var fill=$('gauge-fill'),v=$('verdict');
      if(now===null||!was){fill.style.width='0';v.textContent='Fill in the first two boxes to see the real discount.';['o-tag','o-total','o-net','o-real'].forEach(function(i){$(i).textContent='–'});return;}
      code=Math.min(code,100);cb=Math.min(cb,100);
      var afterCode=now*(1-code/100),total=afterCode+ship,net=total-afterCode*cb/100;
      var tag=(was-now)/was*100;
      $('o-tag').textContent=pct(tag);$('o-total').textContent=money(total);$('o-net').textContent=money(net);
      var base=usual||was,real=(base-net)/base*100;
      $('o-real').textContent=usual?(real>=0?pct(real)+' less':pct(-real)+' more'):'add usual price';
      fill.style.width=Math.max(0,Math.min(100,real*2))+'%';
      var msg;
      if(!usual){msg='The tag says '+pct(tag)+' off. Add what it usually sells for to see if that holds up.';}
      else if(real<=0){msg='Plot twist: with extras, this costs the same or more than usual. Not a deal.';}
      else if(real<5){msg='Meh. About the normal price once everything is counted.';}
      else if(real<15){msg='A modest real saving. Good if it was already on your list.';}
      else if(real<30){msg='Solid! A genuine discount against the usual price.';}
      else {msg='Big real discount. Double-check it is the identical item and the seller is legit.';}
      v.textContent=msg;
    }
    f.addEventListener('input',calc);
    f.addEventListener('reset',function(){setTimeout(calc,0)});
    f.addEventListener('submit',function(e){e.preventDefault();calc()});
  }
  // Article filter chips
  var chips=document.querySelectorAll('.chip');
  if(chips.length){
    chips.forEach(function(c){c.addEventListener('click',function(){
      var cat=c.getAttribute('data-cat');
      chips.forEach(function(o){var on=o===c;o.classList.toggle('is-on',on);o.setAttribute('aria-pressed',on?'true':'false')});
      document.querySelectorAll('#art-grid .card').forEach(function(card){card.hidden=!(cat==='all'||card.getAttribute('data-cat')===cat)});
    })});
  }
})();
