// Discount Deal Me: coupon pages (expiry, starts-soon, store filter) and the deal checker.
// Reads only /data/price-check.json from this site, plus an optional lookup API if one is configured.
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var NOW=Date.now();
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};

  // ----- coupon rows: hide expired, promote started ones, update counts
  var list=$('[data-cp-list]');
  $$('.cp-row').forEach(function(row){
    var e=row.getAttribute('data-ends'),s=row.getAttribute('data-starts');
    if(e&&Date.parse(e)<=NOW){row.hidden=true;return;}
    if(s&&Date.parse(s)<=NOW&&list&&$('.code',row)){row.classList.remove('is-upcoming');var l=$('[data-starts-label]',row);if(l)l.remove();list.appendChild(row);}
  });
  if(list){
    var n=$$('.cp-row',list).filter(function(r){return !r.hidden}).length;
    var c=$('[data-cp-count]');if(c)c.textContent=n;
    var em=$('[data-cp-empty]');if(em)em.hidden=n>0;
  }
  $$('.cp-sec').forEach(function(sec){var rows=$$('.cp-row',sec);if(rows.length&&rows.every(function(r){return r.hidden})&&!sec.contains(list))sec.hidden=true;});
  // index page: recount live codes in the reader's browser (codes can expire between our checks)
  if($('[data-store-count]')&&window.fetch)fetch('/data/coupons.json',{credentials:'omit'}).then(function(r){return r.json()}).then(function(d){
    d.stores.forEach(function(s){var el=$('[data-store-count="'+s.slug+'"]');if(!el)return;
      var n=s.codes.filter(function(c){return (!c.ends||Date.parse(c.ends)>NOW)&&(!c.starts||c.state!=='upcoming'||Date.parse(c.starts)<=NOW)}).length;
      el.textContent=n;var card=el.closest('.cp-card');if(card&&!n)card.hidden=true;});
  }).catch(function(){});
  var f=$('[data-cp-filter]');
  if(f)f.addEventListener('input',function(){var q=f.value.trim().toLowerCase();$$('[data-name]').forEach(function(el){el.hidden=q&&el.getAttribute('data-name').indexOf(q)<0;});});

  // ----- deal checker
  var form=$('#dc-form');if(!form||!window.fetch)return;
  var CFG=window.DDM_CHECKER||{},out=$('#dc-out'),input=$('#dc-q'),DATA=null;
  var money=function(v,cur){return (cur&&cur!=='USD'?cur+' ':'$')+Number(v).toFixed(2)};
  var day=function(d){var p=d.split('-');return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1]+' '+(+p[2])+', '+p[0]};
  var eff=function(run){return run[3]!=null?run[3]:run[2]};
  function load(){return DATA?Promise.resolve(DATA):fetch('/data/price-check.json',{credentials:'omit'}).then(function(r){return r.json()}).then(function(d){
    DATA=d;d.products.forEach(function(p){p._h=(p.t+' '+((d.stores[p.s]||{}).n||'')).toLowerCase();});return d;});}
  var STOP=/^(the|a|an|and|for|with|in|of|to|on|by|at|is|it|this|that|from|new|best|buy|sale|deal|deals|price|www|com|html|https?|products?|p|dp|item|shop|us|en)$/;
  function tokens(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(function(t){return t.length>1&&!STOP.test(t)});}
  function host(u){try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return ''}}
  function storeFor(h){if(!h)return null;for(var k in DATA.stores){var d=DATA.stores[k].d;if(d&&(h===d||h.slice(-d.length-1)==='.'+d))return k;}return null;}
  function search(q){
    var isUrl=/^https?:\/\//i.test(q.trim())||/^[a-z0-9-]+\.[a-z]{2,}\//i.test(q.trim());
    var url=isUrl?(/^https?:/i.test(q.trim())?q.trim():'https://'+q.trim()):'';
    var st=url?storeFor(host(url)):null,res=[];
    if(url){
      var path='';try{path=new URL(url).pathname.replace(/\/$/,'').toLowerCase()}catch(e){}
      DATA.products.forEach(function(p){if(!p.u)return;var pp='';try{pp=new URL(p.u).pathname.replace(/\/$/,'').toLowerCase()}catch(e){}
        var id=p.id.split(':').pop().toLowerCase();
        if((pp&&path&&pp===path&&host(p.u)===host(url))||(id.length>4&&url.toLowerCase().indexOf(id)>-1))res.push({p:p,score:2});});
      if(!res.length){var tk=tokens(decodeURIComponent((function(){try{return new URL(url).pathname}catch(e){return ''}})()));res=rank(tk,st);}
      return {url:url,store:st,res:res};
    }
    return {store:null,res:rank(tokens(q),null)};
  }
  function rank(tk,st){
    if(!tk.length)return [];
    var r=[];DATA.products.forEach(function(p){if(st&&p.s!==st)return;var m=0;tk.forEach(function(t){if(p._h.indexOf(t)>-1||p._h.indexOf(t.replace(/s$/,''))>-1)m++});
      var sc=m/tk.length;if(sc>=(tk.length>=3?0.75:0.99))r.push({p:p,score:sc});});
    r.sort(function(a,b){return b.score-a.score||eff(last(a.p))-eff(last(b.p))});return r.slice(0,8);
  }
  function last(p){return p.r[p.r.length-1]}
  function median(a){var s=a.slice().sort(function(x,y){return x-y}),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2}
  function verdict(p){
    var rule=DATA.verdict_rules,lastRun=last(p),first=p.r[0][0],lastDay=lastRun[1];
    var seen=DATA.check_dates.filter(function(d){return d>=first&&d<=lastDay});
    var span=(Date.parse(lastDay)-Date.parse(first))/864e5;
    var cur=eff(lastRun);
    if(seen.length<rule.min_check_days||span<rule.min_span_days)return {k:'none',t:'Not enough history yet',why:'We first recorded this item on '+day(first)+' and have checked it on '+seen.length+' day'+(seen.length===1?'':'s')+'. A verdict needs at least '+rule.min_check_days+' days of checks over '+rule.min_span_days+' days.'};
    var obs=[];seen.forEach(function(d){for(var i=0;i<p.r.length;i++){if(d>=p.r[i][0]&&d<=p.r[i][1]){obs.push(eff(p.r[i]));break;}}});
    var lo=Math.min.apply(null,obs),med=median(obs);
    var base={lo:lo,med:med,n:obs.length,from:first};
    if(cur<=lo)return Object.assign(base,{k:'good',t:'Lowest price we have recorded'});
    if(cur<=med*0.95)return Object.assign(base,{k:'good',t:'Below its usual price'});
    if(cur<=med*1.05)return Object.assign(base,{k:'ok',t:'About its usual price'});
    return Object.assign(base,{k:'bad',t:'Higher than usual'});
  }
  function spark(p){
    var pts=[];p.r.forEach(function(r){pts.push([Date.parse(r[0]),eff(r)]);if(r[1]!==r[0])pts.push([Date.parse(r[1]),eff(r)]);});
    if(pts.length<2)return '';
    var x0=pts[0][0],x1=pts[pts.length-1][0]||x0+1,ys=pts.map(function(q){return q[1]}),y0=Math.min.apply(null,ys),y1=Math.max.apply(null,ys);if(y1===y0){y1+=1;y0-=1;}
    var d=pts.map(function(q,i){return (i?'L':'M')+((q[0]-x0)/(x1-x0||1)*500+10).toFixed(1)+' '+(54-(q[1]-y0)/(y1-y0)*44).toFixed(1)}).join(' ');
    return '<svg class="dc-spark" viewBox="0 0 520 64" role="img" aria-label="Recorded price over time"><path d="'+d+'" fill="none" stroke="#ea580c" stroke-width="2"/></svg>';
  }
  function codesFor(slug){
    var s=DATA.stores[slug];if(!s)return '';
    var live=s.codes.filter(function(c){return (!c.e||Date.parse(c.e)>NOW)&&(!c.st||Date.parse(c.st)<=NOW)});
    if(!live.length)return '<p class="dc-note">No verified '+esc(s.n)+' codes right now. <a href="/coupons/'+slug+'/">See the store page</a>.</p>';
    return '<p class="dc-note"><b>Verified '+esc(s.n)+' codes</b> (from the store\u2019s affiliate feed):</p><div class="dc-codes">'+live.slice(0,3).map(function(c){
      return '<div class="code"><span class="code-label">Code</span><code>'+esc(c.code)+'</code><button type="button" class="code-copy" data-copy="'+esc(c.code)+'">Copy</button></div>'}).join('')+
      '</div><p class="dc-note"><a href="/coupons/'+slug+'/">Terms and all '+esc(s.n)+' codes</a></p>';
  }
  function amazon(q){if(!CFG.amazonTag)return '';q=/^https?:|\//.test(q)?tokens(q).join(' '):q;if(!q)return '';return '<li><span>Compare on Amazon<span class="dc-tag">#ad</span> <small>(we don\u2019t track Amazon prices)</small></span><a rel="sponsored nofollow noopener" target="_blank" href="https://www.amazon.com/s?k='+encodeURIComponent(q)+'&tag='+encodeURIComponent(CFG.amazonTag)+'">Search Amazon &#8599;</a></li>';}
  function render(q,r){
    if(!r.res.length){
      var s=r.store?DATA.stores[r.store]:null,h='';
      h+='<div class="dc-card"><h2>We don\u2019t have price data for that yet</h2><p class="dc-note">We only show prices we have recorded ourselves, so we won\u2019t guess. '+
        (s?'It looks like a <b>'+esc(s.n)+'</b> link, a store we work with.':'Try a shorter product name, or paste a link from a store we track.')+'</p>'+
        (s?codesFor(r.store)+'<p><a class="btn btn-ghost btn-small" rel="sponsored nofollow noopener" target="_blank" href="'+esc(s.l)+'">Visit '+esc(s.n)+' &#8599;</a></p>':'')+
        (CFG.amazonTag&&amazon(q)?'<ul class="dc-alts">'+amazon(q)+'</ul>':'')+'</div>';
      out.innerHTML=h;return;
    }
    var best=r.res[0].p,s=DATA.stores[best.s]||{n:best.s},lr=last(best),v=verdict(best),cur=eff(lr);
    var exact=r.res[0].score>=2;
    var h='<div class="dc-card">'+(exact?'':'<p class="dc-note"><b>Closest match we track.</b> It may not be the exact item you meant; we only show items we have recorded.</p>')+'<span class="dc-store">'+esc(s.n)+'</span><h2>'+esc(best.t)+'</h2>'+
      '<div class="dc-price"><b>'+money(cur,best.cur)+'</b>'+(lr[3]!=null?'<span><s>'+money(lr[2],best.cur)+'</s> store\u2019s listed regular price (the store\u2019s claim, not checked by us)</span>':'')+
      '<span class="dc-note">Last seen '+day(lr[1])+' in the store\u2019s affiliate product feed</span></div>'+
      '<span class="dc-verdict'+(v.k==='good'?' is-good':v.k==='bad'?' is-bad':'')+'">'+esc(v.t)+'</span><span class="dc-tag" title="Decided by fixed rules, not AI">Rule-based</span>'+
      (v.why?'<p class="dc-note">'+esc(v.why)+'</p>':'<p class="dc-note">Lowest we recorded: '+money(v.lo,best.cur)+'. Typical (median): '+money(v.med,best.cur)+'. Based on '+v.n+' check days since '+day(v.from)+'.</p>'+spark(best))+
      codesFor(best.s)+
      (best.c?'<p><a class="btn btn-deal" rel="sponsored nofollow noopener" target="_blank" data-offer="checker-'+esc(best.id)+'" href="'+esc(best.c)+'">See it at '+esc(s.n)+' &#8599;</a></p>':'')+'</div>';
    var alts=r.res.slice(1).filter(function(a){return a.p.c});
    if(alts.length||CFG.amazonTag){
      h+='<div class="dc-card"><h3>Other matches from stores we work with</h3><ul class="dc-alts">'+alts.map(function(a){var p=a.p,l=last(p),st=DATA.stores[p.s]||{n:p.s};
        return '<li><a rel="sponsored nofollow noopener" target="_blank" href="'+esc(p.c)+'">'+esc(p.t)+'</a><span><b>'+money(eff(l),p.cur)+'</b> at '+esc(st.n)+'<span class="dc-tag">#ad</span></span></li>'}).join('')+amazon(best.t.split(',')[0])+'</ul>'+
        '<p class="dc-note">Prices as last recorded by us. Check the final price at the store.</p></div>';
    }
    out.innerHTML=h;
    var al=$('.dc-alert');if(al){al.hidden=false;al.elements.watch_product.value=best.id;}
  }
  function live(q){
    if(!CFG.api)return Promise.resolve(null);
    return fetch(CFG.api.replace(/\/$/,'')+'/check?q='+encodeURIComponent(q),{credentials:'omit'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null});
  }
  function run(q){
    q=(q||'').trim();if(!q){out.innerHTML='';return;}
    out.innerHTML='<p class="dc-note">Checking\u2026</p>';
    load().then(function(){
      var r=search(q);
      if(r.res.length||!CFG.api){render(q,r);return;}
      live(q).then(function(d){
        if(d&&d.products&&d.products.length){d.products.forEach(function(p){p._h=p.t.toLowerCase();if(!DATA.stores[p.s])DATA.stores[p.s]={n:p.n||p.s,codes:[],l:''};});
          render(q,{res:d.products.map(function(p){return {p:p,score:1}})});
          out.insertAdjacentHTML('beforeend','<p class="dc-note">Live lookup from our partner stores\u2019 product feeds. History starts when we first record an item.'+(d.ai_note?' <span class="ai-tag">AI summary</span> '+esc(d.ai_note):'')+'</p>');}
        else render(q,r);
      });
    }).catch(function(){out.innerHTML='<p class="dc-note">Could not load price data. Please try again.</p>';});
    try{history.replaceState(null,'','?q='+encodeURIComponent(q))}catch(e){}
  }
  form.addEventListener('submit',function(e){e.preventDefault();run(input.value)});
  $$('[data-dc-try]').forEach(function(b){b.addEventListener('click',function(){input.value=b.getAttribute('data-dc-try');run(input.value)})});
  out.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.code-copy');if(!b)return;var c=b.getAttribute('data-copy');
    var done=function(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy'},1600)};if(navigator.clipboard)navigator.clipboard.writeText(c).then(done,function(){});else done();});
  var q0=new URLSearchParams(location.search).get('q');if(q0){input.value=q0;run(q0);}
})();
