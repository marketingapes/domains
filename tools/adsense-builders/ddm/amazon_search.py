"""Homepage smart search for Discount Deal Me (Nov 2026 redesign, v2: one box).

We have no Amazon Product Advertising API, so this never shows Amazon prices, ratings, images
or "cheapest" claims for an item. It turns the shopper's query into a tagged Amazon search:
a budget written in the query ("under $100", "$50-$100") becomes Amazon's own price filter
(rh=p_36, in cents) and results are sorted by price, low to high. Below the box it shows
matching live deals and verified codes from our own CJ/Impact data, with their images.

The Associates tag is the TNT tag (coupons.AMAZON_TAG, Kyle's call on Nov 15 2026).
"""
import html, re
from urllib.parse import urlencode

from coupons import AMAZON_TAG

E = html.escape
JS_V = "20261120c"
AMAZON_SEARCH = "https://www.amazon.com/s"
ASSOCIATES_LINE = "As an Amazon Associate, Discount Deal Me earns from qualifying purchases."
BUTTON = "Find the best Amazon offers"
PLACEHOLDER = "What are you shopping for? e.g. air fryer under $100"
EXAMPLES = ["air fryer under $100", "carry-on suitcase", "wireless earbuds under $50", "standing desk $150-$300",
            "dog bed large", "kids headphones under $30", "coffee maker"]

_NUM = r"\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:k\b)?"


def parse(q):
    """Python twin of parse() in assets/amazon-search.js: (keywords, min_dollars, max_dollars)."""
    s = " " + q.lower() + " "
    lo = hi = None
    m = re.search(r"(?:between\s+)?\$\s*(\d+(?:\.\d+)?)\s*(?:-|to|and|–)\s*\$?\s*(\d+(?:\.\d+)?)", s) or \
        re.search(r"between\s+(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*(\d+(?:\.\d+)?)", s) or \
        re.search(r"(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:dollars|bucks|usd)", s)
    if m:
        lo, hi = sorted([float(m.group(1)), float(m.group(2))])
        s = s.replace(m.group(0), " ")
    else:
        m = re.search(r"(?:under|below|less than|max|up to|at most|<)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars|bucks|usd)?", s)
        if m:
            hi = float(m.group(1)); s = s.replace(m.group(0), " ")
        m2 = re.search(r"(?:over|above|more than|at least|min|>)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars|bucks|usd)?", s)
        if m2:
            lo = float(m2.group(1)); s = s.replace(m2.group(0), " ")
    words = " ".join(s.replace("$", " ").split())
    return words, lo, hi


def search_url(q):
    words, lo, hi = parse(q)
    params = [("k", words)]
    if lo or hi:
        params.append(("rh", f"p_36:{int(round(lo * 100)) if lo else ''}-{int(round(hi * 100)) if hi else ''}"))
    params += [("s", "price-asc-rank"), ("tag", AMAZON_TAG)]
    return AMAZON_SEARCH + "?" + urlencode(params)


def form():
    ex = "".join(f'<a class="ex" href="/?q={E(x.replace(" ", "+").replace("$", "%24"))}#find" data-q="{E(x)}">{E(x)}</a>' for x in EXAMPLES)
    return f'''<form class="smart" id="amz-form" action="{AMAZON_SEARCH}" method="get" target="_blank" data-tag="{E(AMAZON_TAG)}" data-amz="{AMAZON_SEARCH}" role="search">
<input type="hidden" name="tag" value="{E(AMAZON_TAG)}"><input type="hidden" name="s" value="price-asc-rank">
<label class="sr-only" for="amz-q">What are you shopping for?</label>
<span class="smart-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span>
<input id="amz-q" name="k" type="search" placeholder="{E(PLACEHOLDER)}" autocomplete="off" enterkeyhint="search" required>
<button class="btn btn-amz" type="submit">{BUTTON}</button>
</form>
<p class="smart-hint" id="amz-hint">Add a budget like &ldquo;under $100&rdquo; or &ldquo;$50-$100&rdquo; and we&rsquo;ll filter Amazon by price, lowest first.</p>
<p class="ex-row"><span>Popular:</span>{ex}</p>
<p class="fine amz-fine">Opens Amazon in a new tab. Amazon sets every price; we don&rsquo;t track or show Amazon prices. {ASSOCIATES_LINE} Links are affiliate links (#ad).</p>'''


def script():
    return f'<script src="/assets/amazon-search.js?v={JS_V}" defer></script>\n'


JS = r"""
// Discount Deal Me smart search: one box -> tagged Amazon search (budget parsed into Amazon's own
// price filter, sorted by price), plus matching deals and verified codes from our own feeds.
// No Amazon prices, ratings or images are fetched or shown.
(function(){
  var f=document.getElementById('amz-form'); if(!f) return;
  var TAG=f.getAttribute('data-tag'), BASE=f.getAttribute('data-amz'), input=f.elements.k;
  var hint=document.getElementById('amz-hint');
  var head=document.getElementById('offers-h'), sub=document.getElementById('offers-sub'), grid=document.getElementById('offers-grid'), codes=document.getElementById('offers-codes');
  var STOP={'a':1,'an':1,'the':1,'for':1,'and':1,'with':1,'of':1,'to':1,'in':1,'on':1,'my':1,'best':1,'cheap':1,'inch':1,'buy':1,'new':1,'good':1,'top':1};
  function parse(q){
    var s=' '+String(q).toLowerCase()+' ', lo=null, hi=null, m;
    m=s.match(/(?:between\s+)?\$\s*(\d+(?:\.\d+)?)\s*(?:-|to|and|\u2013)\s*\$?\s*(\d+(?:\.\d+)?)/)||s.match(/between\s+(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*(\d+(?:\.\d+)?)/)||s.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:dollars|bucks|usd)/);
    if(m){lo=Math.min(+m[1],+m[2]);hi=Math.max(+m[1],+m[2]);s=s.replace(m[0],' ');}
    else{
      m=s.match(/(?:under|below|less than|max|up to|at most|<)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars|bucks|usd)?/);
      if(m){hi=+m[1];s=s.replace(m[0],' ');}
      m=s.match(/(?:over|above|more than|at least|min|>)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars|bucks|usd)?/);
      if(m){lo=+m[1];s=s.replace(m[0],' ');}
    }
    return {words:s.replace(/\$/g,' ').replace(/\s+/g,' ').trim(),lo:lo,hi:hi};
  }
  function build(q){
    var p=parse(q); if(!p.words) return '';
    var u=new URLSearchParams(); u.set('k',p.words);
    if(p.lo||p.hi) u.set('rh','p_36:'+(p.lo?Math.round(p.lo*100):'')+'-'+(p.hi?Math.round(p.hi*100):''));
    u.set('s','price-asc-rank'); u.set('tag',TAG);
    return BASE+'?'+u.toString();
  }
  window.DDM_AMZ={parse:parse,build:build};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function ends(iso){if(!iso)return 'Ongoing';var d=new Date(iso);return 'Ends '+d.toLocaleDateString('en-US',{month:'short',day:'numeric'});}
  var feeds=null;
  function load(){
    if(!feeds){
      var j=function(u){return fetch(u,{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});};
      feeds=Promise.all([j('/data/deals.json'),j('/data/coupons.json')]);
    }
    return feeds;
  }
  function toks(words){return words.toLowerCase().split(/[^a-z0-9]+/).filter(function(t){return t.length>2&&!STOP[t]&&!/^\d+$/.test(t);});}
  function hits(text,ts){text=(text||'').toLowerCase();var n=0;ts.forEach(function(t){if(text.indexOf(t)>-1)n++;});return n;}
  function card(d){
    return '<article class="ocard"><a class="ocard-img" rel="sponsored nofollow noopener" target="_blank" href="'+esc(String(d.url).replace('sid=ddm-finder','sid=ddm-home-match'))+'"><img src="'+esc(d.image||'/images/photos/hero-640.webp')+'" alt="" loading="lazy" decoding="async" width="720" height="450"></a>'+
      '<div class="ocard-body"><p class="ocard-store">'+(d._m?'<span class="ocard-match">Matches your search</span> ':'')+esc(d.merchant)+'</p><h3 class="ocard-title">'+esc(d.title)+'</h3><p class="ocard-meta"><span>'+esc(ends(d.ends))+'</span><span>'+(d.code?'Code '+esc(d.code):'No code needed')+'</span></p>'+
      '<a class="ocard-go" rel="sponsored nofollow noopener" target="_blank" href="'+esc(String(d.url).replace('sid=ddm-finder','sid=ddm-home-match'))+'">Get deal at '+esc(d.merchant)+' <span class="adchip-sm">#ad</span></a></div></article>';
  }
  function render(words,data){
    var ts=toks(words), now=Date.now(), need=Math.min(2,ts.length);
    var deals=(data[0]&&data[0].deals||[]).filter(function(d){return !d.ends||Date.parse(d.ends)>now;});
    var stores=data[1]&&data[1].stores||[];
    var dm=[], cm=[];
    if(ts.length){
      deals.forEach(function(d){var n=hits([d.merchant,d.title,d.category,d.summary_ai,d.network_terms].join(' '),ts);if(n>=need)dm.push({n:n,d:d});});
      stores.forEach(function(s){var live=(s.codes||[]).filter(function(c){return !c.ends||Date.parse(c.ends)>now;});if(!live.length)return;
        var n=hits([s.name].concat(live.map(function(c){return c.title+' '+c.terms;})).join(' '),ts);if(n>=need)cm.push({n:n,s:s,live:live});});
    }
    dm.sort(function(a,b){return b.n-a.n||b.d.score-a.d.score;}); cm.sort(function(a,b){return b.n-a.n;});
    var list=dm.map(function(x){return x.d;}).slice(0,9), matched=list.length>0, ids={};
    list.forEach(function(d){ids[d.id]=1;d._m=1;});
    var rest=deals.slice().sort(function(a,b){return b.score-a.score;}).filter(function(d){return !ids[d.id];}), imgs={};
    list.forEach(function(d){imgs[d.image]=1;});
    rest.forEach(function(d){if(list.length<9&&!imgs[d.image]){d._m=0;imgs[d.image]=1;ids[d.id]=1;list.push(d);}});
    rest.forEach(function(d){if(list.length<9&&!ids[d.id]){d._m=0;list.push(d);}});
    head.textContent=matched?'Other offers for \u201c'+words+'\u201d':'Other offers worth a look';
    sub.textContent=matched?(dm.length+' live deal'+(dm.length>1?'s':'')+' from stores we work with match'+(dm.length>1?'':'es')+' your search, followed by today\u2019s top-scoring deals. Terms and end dates come from each store\u2019s affiliate program.'):'No partner-store deals match \u201c'+words+'\u201d right now, so here are today\u2019s top-scoring deals.';
    grid.innerHTML=list.map(card).join('');
    codes.innerHTML=cm.slice(0,4).map(function(x){return '<a class="codechip" href="'+esc(x.s.page)+'"><b>'+esc(x.s.name)+'</b><span>'+x.live.length+' verified code'+(x.live.length>1?'s':'')+'</span></a>';}).join('');
    codes.hidden=!cm.length;
  }
  function run(q,open){
    var url=build(q); if(!url){input.focus();return false;}
    var p=parse(q);
    if(hint) hint.innerHTML='Amazon search: <b>'+esc(p.words)+'</b>'+(p.lo&&p.hi?', $'+p.lo+'\u2013$'+p.hi:p.hi?', up to $'+p.hi:p.lo?', from $'+p.lo:'')+', lowest price first. <a rel="sponsored nofollow noopener" target="_blank" href="'+esc(url)+'">Open again &#8599;</a>';
    if(open){var w=window.open(url,'_blank');if(w){try{w.opener=null;}catch(x){}}else{location.href=url;}}
    load().then(function(d){render(p.words,d);});
    try{(window.dataLayer=window.dataLayer||[]).push({event:'ddm_amazon_search',has_budget:!!(p.lo||p.hi)});}catch(e){}
    return true;
  }
  f.addEventListener('submit',function(e){e.preventDefault();if(run(input.value,true)){var o=document.getElementById('offers');if(o&&o.scrollIntoView)setTimeout(function(){o.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});},150);}});
  [].forEach.call(document.querySelectorAll('[data-q]'),function(el){
    el.addEventListener('click',function(e){e.preventDefault();input.value=el.getAttribute('data-q');run(input.value,false);
      var o=document.getElementById('offers');if(o&&o.scrollIntoView)o.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
  });
  var q=new URLSearchParams(location.search).get('q'); if(q){input.value=q;run(q,false);}
  // carousel: auto-advance unless reduced motion; pause on hover/focus; arrows
  [].forEach.call(document.querySelectorAll('[data-carousel]'),function(c){
    var track=c.querySelector('.car-track'); if(!track) return;
    [].forEach.call(track.children,function(el){var e=el.getAttribute('data-ends');if(e&&Date.parse(e)<Date.now())el.hidden=true;});
    function step(dir){var w=track.firstElementChild?track.firstElementChild.getBoundingClientRect().width+14:300;
      var max=track.scrollWidth-track.clientWidth-4; var to=track.scrollLeft+dir*w; if(dir>0&&track.scrollLeft>=max)to=0;
      track.scrollTo({left:to,behavior:'smooth'});}
    var prev=c.querySelector('[data-prev]'), next=c.querySelector('[data-next]');
    if(prev)prev.addEventListener('click',function(){step(-1);}); if(next)next.addEventListener('click',function(){step(1);});
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var paused=false, t=setInterval(function(){if(!paused&&!document.hidden)step(1);},4500);
    ['mouseenter','focusin','touchstart'].forEach(function(ev){c.addEventListener(ev,function(){paused=true;},{passive:true});});
    ['mouseleave','focusout'].forEach(function(ev){c.addEventListener(ev,function(){paused=false;});});
  });
})();
"""
