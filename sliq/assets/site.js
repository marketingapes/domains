(function(){
  var form=document.getElementById('dime');
  if(!form)return;
  var ids=['debt','income','years','mortgage','kids','edu','existing','savings'];
  function val(id){var el=document.getElementById(id);var n=parseFloat(String(el.value).replace(/[^0-9.]/g,''));return isFinite(n)&&n>0?n:0;}
  function fmt(n){return Math.round(n).toLocaleString('en-US');}
  function calc(){
    var d=val('debt'), i=val('income')*Math.min(val('years'),50), m=val('mortgage'), e=val('kids')*val('edu');
    var gross=d+i+m+e, net=Math.max(0,gross-val('existing')-val('savings'));
    var rounded=net>0?Math.ceil(net/50000)*50000:0;
    document.getElementById('dime-total').textContent=fmt(rounded);
    document.getElementById('dime-gross').textContent=fmt(gross);
    var parts={d:d,i:i,m:m,e:e};
    Object.keys(parts).forEach(function(k){
      var pct=gross>0?(parts[k]/gross*100):0;
      document.getElementById('fill-'+k).style.width=pct.toFixed(1)+'%';
      document.getElementById('amt-'+k).textContent=fmt(parts[k]);
    });
  }
  ids.forEach(function(id){document.getElementById(id).addEventListener('input',calc);});
  form.addEventListener('submit',function(ev){ev.preventDefault();calc();});
  calc();
})();
