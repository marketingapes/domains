// Discount Deal Me: build a tagged Amazon search from the shopper's specifics and surface
// matching deals and verified codes from our own feeds. No Amazon prices are fetched or shown.
(function(){
  var f=document.getElementById('amz-form'); if(!f) return;
  var TAG=f.getAttribute('data-tag'), BASE=f.getAttribute('data-amz');
  var box=document.getElementById('matches'), q=document.getElementById('m-query'), a=document.getElementById('m-amz');
  var list=document.getElementById('m-deals'), none=document.getElementById('m-none');
  var STOP={'a':1,'an':1,'the':1,'for':1,'and':1,'with':1,'of':1,'to':1,'in':1,'on':1,'my':1,'under':1,'best':1,'cheap':1,'inch':1};
  function v(n){var el=f.elements[n];return el&&el.value!=null?String(el.value).trim():'';}
  function feats(){return [].map.call(f.querySelectorAll('input[name=feat]:checked'),function(i){return i.value.toLowerCase();});}
  function money(x){var n=parseFloat(x);return n>0?Math.round(n*100):'';}
  function words(){
    var use=v('use');
    return [v('k'),v('size')].concat(feats(),[v('more')],use?['for '+use]:[]).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  }
  function build(){
    var k=words(); if(!k) return '';
    var p=new URLSearchParams(); p.set('k',k);
    var lo=money(v('min')),hi=money(v('max'));
    if(lo&&hi&&lo>hi){var t=lo;lo=hi;hi=t;}
    if(lo||hi) p.set('rh','p_36:'+lo+'-'+hi);
    if(v('s')) p.set('s',v('s'));
    p.set('tag',TAG);
    return BASE+'?'+p.toString();
  }
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function describe(){
    var bits=['<b>'+esc(words())+'</b>'], lo=parseFloat(v('min')), hi=parseFloat(v('max'));
    if(lo>0&&hi>0) bits.push('between $'+Math.min(lo,hi)+' and $'+Math.max(lo,hi));
    else if(hi>0) bits.push('up to $'+hi); else if(lo>0) bits.push('from $'+lo);
    var s=f.elements.s; if(s&&s.value) bits.push('sorted by '+s.options[s.selectedIndex].text.toLowerCase());
    return bits.join(', ');
  }
  var feeds=null;
  function load(){
    if(feeds) return feeds;
    function j(u){return fetch(u,{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});}
    feeds=Promise.all([j('/data/deals.json'),j('/data/coupons.json')]);
    return feeds;
  }
  function tokens(){
    return (v('k')+' '+feats().join(' ')+' '+v('more')).toLowerCase().split(/[^a-z0-9]+/).filter(function(t){return t.length>2&&!STOP[t];});
  }
  function hits(text,toks){text=(text||'').toLowerCase();var n=0;toks.forEach(function(t){if(text.indexOf(t)>-1)n++;});return n;}
  function render(data){
    var toks=tokens(), now=Date.now(), rows=[], need=Math.min(2,toks.length);
    var deals=data[0]&&data[0].deals||[], stores=data[1]&&data[1].stores||[];
    if(toks.length){
      deals.forEach(function(d){
        if(d.ends&&Date.parse(d.ends)<now) return;
        var n=hits([d.merchant,d.title,d.category,d.summary_ai,d.network_terms].join(' '),toks);
        if(n>=need) rows.push({n:n+0.5,html:'<li><span class="m-tag">Deal</span><div><b>'+esc(d.merchant)+'</b> '+esc(d.title)+'</div><a rel="sponsored nofollow noopener" target="_blank" href="'+esc(String(d.url).replace('sid=ddm-finder','sid=ddm-home-match'))+'">Get deal <span class="adchip-sm">#ad</span></a></li>'});
      });
      stores.forEach(function(s){
        var live=(s.codes||[]).filter(function(c){return !c.ends||Date.parse(c.ends)>now;});
        if(!live.length) return;
        var n=hits([s.name].concat(live.map(function(c){return c.title+' '+c.terms;})).join(' '),toks);
        if(n>=need) rows.push({n:n,html:'<li><span class="m-tag m-code">Codes</span><div><b>'+esc(s.name)+'</b> '+live.length+' verified code'+(live.length>1?'s':'')+'</div><a href="'+esc(s.page)+'">See codes</a></li>'});
      });
    }
    rows.sort(function(x,y){return y.n-x.n;});
    list.innerHTML=rows.slice(0,5).map(function(r){return r.html;}).join('');
    none.hidden=rows.length>0;
  }
  function run(scroll){
    var url=build(); if(!url){f.elements.k.focus();return;}
    a.href=url; q.innerHTML=describe(); box.hidden=false;
    load().then(render);
    if(scroll&&box.scrollIntoView) box.scrollIntoView({behavior:'smooth',block:'nearest'});
    try{(window.dataLayer=window.dataLayer||[]).push({event:'ddm_amazon_search',has_budget:!!(v('min')||v('max')),features:feats().length,use:v('use')||'any'});}catch(e){}
  }
  function fill(p){
    f.reset();
    ['k','min','max','size','use','more'].forEach(function(n){var key=n==='k'?'q':n;if(p[key]!=null&&f.elements[n])f.elements[n].value=p[key];});
    if(p.feat){[].forEach.call(f.querySelectorAll('input[name=feat]'),function(i){i.checked=String(p.feat).toLowerCase().split('|').indexOf(i.value.toLowerCase())>-1;});}
  }
  f.addEventListener('submit',function(e){e.preventDefault();run(true);});
  [].forEach.call(document.querySelectorAll('[data-fill]'),function(el){
    el.addEventListener('click',function(e){e.preventDefault();try{fill(JSON.parse(el.getAttribute('data-fill')));run(true);}catch(x){}});
  });
  var sp=new URLSearchParams(location.search);
  if(sp.get('q')&&!sp.get('k')){var p={};sp.forEach(function(val,key){p[key]=val;});fill(p);run(false);}
})();
