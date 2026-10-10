"""Event deal pages for Discount Deal Me. Each event is data plus a shared template.

The KitchenAid Harvest Event page (first published 2026-10-10) switches itself to an
"ended" state in the reader's browser after the network end time.
"""
import html, json
e = html.escape

KA_SID = "ddm-site-20261010"
KA_MAIN = "https://www.anrdoezrs.net/click-101511733-17342552-1787624400000?sid=" + KA_SID
KA_MIXERS = "https://www.tkqlhce.com/click-101511733-17342535-1787624400000?sid=" + KA_SID
KA_REFURB = "https://www.dpbolvw.net/click-101511733-17360704-1790993713000?sid=" + KA_SID
KA_ROWS = [
    ('Stand mixers', 'Up to $120 off', 'ka-mixers', 'https://www.tkqlhce.com/click-101511733-17342535-1787624400000?sid=ddm-site-20261010', 'See stand mixers'),
    ('Stand mixer attachments', 'Up to 30% off', 'ka-attach', 'https://www.jdoqocy.com/click-101511733-17342536-1787624400000?sid=ddm-site-20261010', 'See stand mixer attachments'),
    ('Stand mixer bowls', 'Up to 25% off', 'ka-bowls', 'https://www.dpbolvw.net/click-101511733-17342539-1787624401000?sid=ddm-site-20261010', 'See stand mixer bowls'),
    ('Food processors', 'Up to 35% off', 'ka-fp', 'https://www.tkqlhce.com/click-101511733-17342541-1787624401000?sid=ddm-site-20261010', 'See food processors'),
    ('Food choppers', 'Up to 20% off', 'ka-chop', 'https://www.kqzyfj.com/click-101511733-17342543-1787624401000?sid=ddm-site-20261010', 'See food choppers'),
    ('Blenders', 'Up to 20% off', 'ka-blend', 'https://www.dpbolvw.net/click-101511733-17342550-1787624400000?sid=ddm-site-20261010', 'See blenders'),
    ('Hand mixers', 'Up to 25% off', 'ka-hand', 'https://www.tkqlhce.com/click-101511733-17342542-1787624400000?sid=ddm-site-20261010', 'See hand mixers'),
    ('Hand blenders', 'Up to 25% off', 'ka-handblend', 'https://www.tkqlhce.com/click-101511733-17342546-1787624400000?sid=ddm-site-20261010', 'See hand blenders'),
    ('GO Cordless', 'Up to 25% off', 'ka-go', 'https://www.anrdoezrs.net/click-101511733-17342549-1787624401000?sid=ddm-site-20261010', 'See go cordless'),
    ('Countertop ovens', 'Up to $80 off', 'ka-oven', 'https://www.tkqlhce.com/click-101511733-17342540-1787624400000?sid=ddm-site-20261010', 'See countertop ovens'),
    ('Toasters', 'Up to $40 off', 'ka-toast', 'https://www.dpbolvw.net/click-101511733-17342544-1787624400000?sid=ddm-site-20261010', 'See toasters'),
    ('Kettles', 'Up to $50 off', 'ka-kettle', 'https://www.jdoqocy.com/click-101511733-17342545-1787624401000?sid=ddm-site-20261010', 'See kettles'),
    ('Coffee', 'Up to $250 off', 'ka-coffee', 'https://www.kqzyfj.com/click-101511733-17342548-1787624400000?sid=ddm-site-20261010', 'See coffee'),
]

STYLE = """<style>
.is-ended .live-only{display:none!important}
.ended-only{display:none}
.is-ended .ended-only{display:block}
.is-ended .status-pill{background:var(--surface-2);color:var(--ink-2)}
.is-ended .status-pill .dot{background:var(--ink-3);animation:none}
</style>
"""


def kitchenaid(head, nav, foot):
    rows = "".join(
        f'<tr><td>{e(cat)}</td><td><strong>{e(off)}</strong> select models</td><td><a rel="sponsored nofollow noopener" data-offer="{oid}" href="{e(href)}">{e(label)}</a></td></tr>'
        for cat, off, oid, href, label in KA_ROWS)
    body = f"""<main id="main" data-deal-end="2026-10-11T03:59:00Z" data-refurb-end="2026-10-13T03:59:00Z">
<article class="wrap article event">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/deals/">Live deals</a> <span aria-hidden="true">/</span> <span>KitchenAid Harvest Event</span></nav>
<header class="art-head">
<p class="status-pill" role="status"><span class="dot" aria-hidden="true"></span><span id="deal-status">Ends Sat Oct 10, 8:59 PM PT</span></p>
<h1>KitchenAid Harvest Event: up to 25% off select countertop appliances</h1>
<p class="byline">By the Discount Deal Me team &middot; Checked against KitchenAid's affiliate promo terms on <time datetime="2026-10-10">October 10, 2026</time></p>
</header>
<p class="disclose"><strong>#ad &middot; Affiliate links.</strong> Discount Deal Me may earn a commission if you buy through the KitchenAid links on this page, at no extra cost to you. It does not change the price, and KitchenAid did not review this page.</p>
<div class="ended-banner ended-only" id="ended-banner">
<h2>This sale has ended</h2>
<p>KitchenAid's Harvest Event ended on Saturday, October 10, 2026 at 11:59 PM ET (8:59 PM PT). The prices and percentages below are no longer available, so we've removed the shopping links. See <a href="/deals/">today's live deals</a> or sign up below to hear about the next one.</p>
</div>
<div class="art-layout">
<div class="art-main prose">
<section class="glance" aria-labelledby="deal-h">
<h2 id="deal-h">The deal at a glance</h2>
<div class="glance-tiles">
<div><b>Up to 25%</b><span>off select countertop appliances</span></div>
<div><b>Up to $120</b><span>off select stand mixers</span></div>
<div><b>No code</b><span>prices are marked on kitchenaid.com</span></div>
</div>
<ul class="deal-facts">
<li><strong>Ends Saturday, October 10, 2026 at 11:59 PM ET (8:59 PM PT).</strong> <span class="live-only" id="countdown"></span></li>
<li>Only valid for new orders on kitchenaid.com. Excludes closeout, commercial and refurbished models. While supplies last; KitchenAid says the offer is subject to change.</li>
<li><strong>Select models only, so check the price in your cart before you buy.</strong></li>
</ul>
<div class="deal-ctas live-only">
<a class="btn" rel="sponsored nofollow noopener" data-offer="ka-harvest-main" href="{e(KA_MAIN)}">See the countertop appliance sale</a>
<a class="btn btn-ghost" rel="sponsored nofollow noopener" data-offer="ka-harvest-mixers" href="{e(KA_MIXERS)}">See stand mixer deals</a>
</div>
</section>

<section class="live-only">
<h2>Every Harvest Event category, in one table</h2>
<p>These are the category offers KitchenAid lists for the Harvest Event through its affiliate program. "Up to" is the biggest discount in the category, not what every model gets, and all of them end at the same time as the main sale.</p>
<div class="table-wrap"><table>
<caption>KitchenAid Harvest Event categories (select models, new orders on kitchenaid.com)</caption>
<thead><tr><th>Category</th><th>Offer</th><th>Link</th></tr></thead>
<tbody>
{rows}
</tbody></table></div>
</section>

<h2>Stand mixer: tilt-head or bowl-lift?</h2>
<p>If a stand mixer is the reason you're here, the first decision is the style. These points come from KitchenAid's own stand mixer guides.</p>
<ul class="checklist">
<li><strong>Tilt-head</strong> mixers hinge back so you can reach the bowl and swap beaters. KitchenAid lists them in 3.4, 4.5 and 5 quart sizes, and they sit about 2.5 to 3 inches shorter than bowl-lift models, which matters if your upper cabinets hang low.</li>
<li><strong>Bowl-lift</strong> mixers keep the head fixed and raise the bowl with a lever. KitchenAid lists them from 4.5 to 8 quarts and pitches them at big batches and heavy, dense mixes like bread dough. A spiral dough hook comes with select bowl-lift models only.</li>
<li><strong>Measure first.</strong> Check the height against the space under your cabinets, and pick a bowl size for the batches you actually make.</li>
</ul>

<h2>Already own a KitchenAid mixer?</h2>
<p>KitchenAid says its power-hub attachments fit all of its stand mixers, regardless of age. The one exception it calls out: the ice cream maker and the precise heat mixing bowl don't fit the Artisan Mini.<span class="live-only"> If your mixer still works, a discounted attachment (up to 30% off select models) or a second bowl (up to 25% off select bowls) may be the better buy than a new mixer during this sale.</span></p>

<h2>Before you check out</h2>
<ul class="checklist">
<li><strong>Compare the cart price, not the badge.</strong> "Up to" means some models get less, or nothing. Note the price you'd pay and compare it with what the same model number sells for elsewhere.</li>
<li><strong>Match the model number.</strong> Size, bowl capacity, color and included accessories can differ between models that look alike.</li>
<li><strong>Refurbished isn't part of this sale.</strong> The Harvest Event excludes refurbished, closeout and commercial models.</li>
<li><strong>Read the return terms.</strong> KitchenAid advertises free delivery and 60-day returns on its small appliances, with restrictions and exclusions. Read its return policy page before you buy.</li>
</ul>
<p>Our <a href="/articles/how-to-spot-a-real-deal/">guide to spotting a real deal</a> and the short <a href="/deal-checklist/">deal checklist</a> walk through these checks in more detail.</p>

<section class="glance" id="refurb" aria-labelledby="refurb-h">
<h2 id="refurb-h">Open to refurbished?</h2>
<p>KitchenAid is running a separate refurbished sale: up to 50% off select refurbished countertop appliances, listed through <strong>Monday, October 12, 2026 at 11:59 PM ET (8:59 PM PT)</strong>. It excludes in-home delivery products and applies only to select refurbished orders on kitchenaid.com. Check the warranty that comes with a refurbished unit before you buy.</p>
<p class="refurb-live"><a class="btn btn-ghost" rel="sponsored nofollow noopener" data-offer="ka-refurb" href="{e(KA_REFURB)}">See the refurbished sale</a></p>
<p class="refurb-ended" hidden><strong>This refurbished sale has also ended.</strong></p>
</section>

<div class="art-foot">Offer details come from KitchenAid's promotion terms published through its affiliate program (CJ), checked on October 10, 2026. This sale needs no code, and Discount Deal Me does not set or verify individual prices. Always check the current price and terms on kitchenaid.com. KitchenAid is a trademark of its owner; Discount Deal Me is not affiliated with KitchenAid beyond the affiliate links disclosed above.</div>
</div>
<aside class="art-side" aria-label="More deals">
<div class="side-card"><p class="kicker">Keep looking</p><p class="side-p">The deal finder lists every live offer we track, ranked by Deal Score.</p><a class="btn btn-small" href="/deals/">Open the deal finder</a></div>
<div class="side-card"><p class="kicker">Before you buy</p><a class="side-tool" href="/#calculator">Real-discount calculator</a><a class="side-tool" href="/deal-checklist/">Deal checklist</a></div>
</aside>
</div>
</article>
</main>
"""
    script = """<script>
(function(){
  var main=document.getElementById('main');
  var end=Date.parse(main.getAttribute('data-deal-end'));
  var refurbEnd=Date.parse(main.getAttribute('data-refurb-end'));
  var status=document.getElementById('deal-status');
  var cd=document.getElementById('countdown');
  function update(){
    var now=Date.now();
    if(now>=end){
      document.body.classList.add('is-ended');
      status.textContent='Sale ended Sat Oct 10, 8:59 PM PT';
      document.title='Ended: KitchenAid Harvest Event (Oct 10, 2026) | Discount Deal Me';
      if(now>=refurbEnd){
        var r=document.getElementById('refurb');
        r.querySelector('.refurb-live').hidden=true;
        r.querySelector('.refurb-ended').hidden=false;
      }
      return true;
    }
    var mins=Math.floor((end-now)/60000), h=Math.floor(mins/60), m=mins%60;
    if(h<48) cd.textContent='('+(h?h+' hr ':'')+m+' min left)';
    return false;
  }
  if(!update()){ var t=setInterval(function(){ if(update()) clearInterval(t); },30000); }
  document.querySelectorAll('a[rel~="sponsored"]').forEach(function(a){
    a.addEventListener('click',function(e){
      if(Date.now()>=end && a.getAttribute('data-offer')!=='ka-refurb'){ e.preventDefault(); return; }
      (window.dataLayer=window.dataLayer||[]).push({event:'affiliate_click',offer:a.getAttribute('data-offer'),href:a.href});
    });
  });
})();
</script>
"""
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": "KitchenAid Harvest Event: up to 25% off select countertop appliances",
          "datePublished": "2026-10-10", "dateModified": "2026-10-10", "author": {"@type": "Organization", "name": "The Discount Deal Me team"},
          "publisher": {"@type": "Organization", "name": "Discount Deal Me"}, "mainEntityOfPage": "https://discountdealme.com/deals/kitchenaid-harvest-event/"}
    h = head("KitchenAid Harvest Event: Up to 25% Off Select Countertop Appliances (Ends Oct 10)",
             "KitchenAid's Harvest Event: up to 25% off select countertop appliances and up to $120 off select stand mixers, no code. Ends Sat Oct 10, 2026 at 11:59 PM ET (8:59 PM PT). What to check before you buy.",
             "/deals/kitchenaid-harvest-event/", og_type="article", extra=STYLE)
    h = h.replace("<title>KitchenAid Harvest Event: Up to 25% Off Select Countertop Appliances (Ends Oct 10) | Discount Deal Me</title>",
                  "<title>KitchenAid Harvest Event: Up to 25% Off Select Countertop Appliances (Ends Oct 10) | Discount Deal Me</title>")
    tail = foot.replace("<script src=\"/assets/site.js", script + f'<script type="application/ld+json">{json.dumps(ld)}</script>\n<script src="/assets/site.js', 1)
    return h + nav("deals") + body + tail
