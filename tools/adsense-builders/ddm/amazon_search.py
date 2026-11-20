"""Homepage "find it on Amazon" search builder for Discount Deal Me (Nov 2026 redesign).

We have no Amazon Product Advertising API, so this never shows Amazon prices, ratings or
"cheapest" claims for an item. It only turns the shopper's own inputs (keywords, budget,
size, must-have features, use) into a tagged Amazon search URL that Amazon itself filters
and sorts, and it surfaces matching deals and verified codes from our own network data.

The Associates tag is the TNT tag (coupons.AMAZON_TAG, Kyle's call on Nov 15 2026).
"""
import html

from coupons import AMAZON_TAG

E = html.escape
JS_V = "20261120a"
AMAZON_SEARCH = "https://www.amazon.com/s"
ASSOCIATES_LINE = "As an Amazon Associate, Discount Deal Me earns from qualifying purchases."

FEATURES = ["Wireless", "Rechargeable", "Waterproof", "Compact", "Quiet", "Stainless steel", "Dishwasher safe", "Large capacity"]
USES = [("", "Any use"), ("gift", "A gift"), ("everyday", "Everyday use"), ("travel", "Travel"), ("kids", "Kids"),
        ("pets", "Pets"), ("kitchen", "Kitchen"), ("home office", "Home office"), ("outdoor", "Outdoors"), ("gym", "Gym and fitness")]
SORTS = [("price-asc-rank", "Price: low to high"), ("", "Amazon's featured order"), ("review-rank", "Customer review"), ("date-desc-rank", "Newest arrivals")]
EXAMPLES = [
    ("Air fryer, under $100", {"q": "air fryer", "max": "100", "feat": "Dishwasher safe"}),
    ("Carry-on suitcase", {"q": "carry-on suitcase", "size": "22 x 14 x 9", "use": "travel"}),
    ("Kids' headphones, under $30", {"q": "headphones", "max": "30", "use": "kids", "feat": "Wireless"}),
    ("Standing desk, 48 inch", {"q": "standing desk", "size": "48 inch", "use": "home office"}),
    ("Dog bed, large", {"q": "dog bed", "size": "large", "use": "pets", "feat": "Waterproof"}),
]


def example_url(p):
    from urllib.parse import urlencode
    return "/?" + urlencode(p) + "#find"


def search_url(q, lo=None, hi=None, sort="price-asc-rank"):
    """Same rules as assets/amazon-search.js. Used for the no-JS fallback and tests."""
    from urllib.parse import urlencode
    params = [("k", " ".join(q.split()))]
    if lo or hi:
        params.append(("rh", f"p_36:{int(round(float(lo) * 100)) if lo else ''}-{int(round(float(hi) * 100)) if hi else ''}"))
    if sort:
        params.append(("s", sort))
    params.append(("tag", AMAZON_TAG))
    return AMAZON_SEARCH + "?" + urlencode(params)


def form():
    feats = "".join(f'<label class="fchip"><input type="checkbox" name="feat" value="{E(f)}"><span>{E(f)}</span></label>' for f in FEATURES)
    uses = "".join(f'<option value="{E(v)}">{E(l)}</option>' for v, l in USES)
    sorts = "".join(f'<option value="{E(v)}">{E(l)}</option>' for v, l in SORTS)
    ex = "".join(f'<a class="ex" href="{E(example_url(p))}" data-fill=\'{E(__import__("json").dumps(p))}\'>{E(l)}</a>' for l, p in EXAMPLES)
    return f'''<form class="finder-card" id="amz-form" action="{AMAZON_SEARCH}" method="get" target="_blank" rel="sponsored" data-tag="{E(AMAZON_TAG)}" data-amz="{AMAZON_SEARCH}" novalidate>
<input type="hidden" name="tag" value="{E(AMAZON_TAG)}">
<div class="fc-row fc-main">
<label class="fc-field fc-q"><span>What are you shopping for?</span><input name="k" id="amz-q" type="search" placeholder="e.g. air fryer, carry-on suitcase, desk lamp" autocomplete="off" required></label>
</div>
<div class="fc-row fc-grid">
<label class="fc-field"><span>Budget min ($)</span><input name="min" type="number" inputmode="decimal" min="0" step="1" placeholder="0"></label>
<label class="fc-field"><span>Budget max ($)</span><input name="max" type="number" inputmode="decimal" min="0" step="1" placeholder="Any"></label>
<label class="fc-field"><span>Size <small>optional</small></span><input name="size" type="text" placeholder="e.g. queen, 6 qt, 48 inch" autocomplete="off"></label>
<label class="fc-field"><span>Used for</span><select name="use">{uses}</select></label>
</div>
<fieldset class="fc-feats"><legend>Must-haves <small>optional</small></legend><div class="fchips">{feats}</div>
<label class="fc-field fc-more"><span class="sr-only">Other must-haves</span><input name="more" type="text" placeholder="Anything else? e.g. 2 slot, USB-C, BPA free" autocomplete="off"></label></fieldset>
<div class="fc-row fc-go">
<label class="fc-field fc-sort"><span>Sort Amazon results by</span><select name="s">{sorts}</select></label>
<button class="btn btn-go" type="submit">Find matches <span aria-hidden="true">&#8594;</span></button>
</div>
</form>
<p class="ex-row"><span>Try:</span>{ex}</p>'''


def results():
    return f'''<section class="matches" id="matches" aria-live="polite" hidden>
<div class="m-amz">
<p class="kicker">Your Amazon search</p>
<p class="m-query" id="m-query"></p>
<a class="btn btn-amz" id="m-amz" rel="sponsored nofollow noopener" target="_blank" href="{E(search_url("deals"))}">Check on Amazon <span class="adchip-sm">#ad</span> <span aria-hidden="true">&#8599;</span></a>
<p class="fine">Amazon sets every price and does the filtering and sorting. We don&rsquo;t see or track Amazon prices, so we never show them. {ASSOCIATES_LINE}</p>
</div>
<div class="m-ours">
<p class="kicker">From stores we work with</p>
<ul class="m-list" id="m-deals"></ul>
<p class="fine" id="m-none" hidden>No live deals or verified codes from our partner stores match this search right now. <a href="/deals/">Browse all live deals</a> or <a href="/coupons/">every verified code</a>.</p>
<p class="fine">Deals and codes come from the merchants&rsquo; affiliate programs (CJ and Impact). Links are affiliate links (#ad).</p>
</div>
</section>'''


def script():
    return f'<script src="/assets/amazon-search.js?v={JS_V}" defer></script>\n'


JS = r"""
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
"""
