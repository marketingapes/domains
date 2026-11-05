"""Seasonal deal pages for Discount Deal Me: /deals/halloween/ and /deals/pet-supplies/.

Every offer here comes from a CJ link-search record for DDM property 101511733 (pulled 2026-10-13).
Codes, dates and terms are the network's own; summaries are labelled AI and checked against them.
Each card carries data-ends, so site.js hides it in the reader's browser once it expires; cards with
data-starts show as "starts soon" until the network start time. The Halloween page switches to an
ended state after the last Halloween offer ends (Groupon's Spooky Sale, Nov 1 9:59 PM PT).
"""
import datetime, html, json
import deals as D

e = html.escape
SID = "ddm-site-20261013"
CHECKED = "2026-10-13T19:45:00Z"  # CJ link search, Oct 13 2026 12:45 PM PT
HALLOWEEN_END = "2026-11-02T04:59:00Z"  # Groupon Spooky Sale end = Sun Nov 1, 9:59 PM PT


def _deal(link_id, merchant, adv_id, adv_name, category, title, value, conditions, summary, code, starts, ends, click, dest, link_name, terms,
          sold_by="brand", region="", ptype="Coupon"):
    return {"link_id": link_id, "merchant": merchant, "sold_by": sold_by, "category": category, "title": title, "region": region,
            "value": value, "conditions": conditions, "summary_ai": summary,
            "network": {"name": "CJ", "advertiser_id": adv_id, "advertiser_name": adv_name, "link_name": link_name, "terms": terms,
                        "promotion_type": ptype, "code": code, "starts": starts, "ends": ends, "click_url": click, "destination": dest}}


HALLOWEEN = [
    _deal("17357453", "Groupon", "5840172", "Groupon North America", "Experiences", "Spooky Sale: up to 80% off with code HALLOWEEN",
          {"kind": "pct", "amount": 80, "upto": True}, ["select"],
          "Groupon's Spooky Sale covers Halloween experiences, costumes, party supplies and decor, plus food and drink, travel and beauty, at up to 80% off. Code HALLOWEEN works on eligible deals only, so check that it applies in your cart before you pay.",
          "HALLOWEEN", "2026-10-12T04:00:00Z", "2026-11-02T04:59:00Z", "https://www.anrdoezrs.net/click-101511733-17357453-1791802800000",
          "https://www.groupon.com/landing/halloween", "Halloween / Spooky Season Sale October 2026",
          "Spooky Sale Is Here! Frightfully good deals on the season's best - now up to 80% off! Use code HALLOWEEN on eligible deals. Halloween experiences, costumes, party supplies and decor, plus food & drink, travel and beauty.",
          sold_by="marketplace"),
    _deal("17340174", "Groupon", "5840172", "Groupon North America", "Experiences", "Universal Halloween Horror Nights tickets on Groupon",
          {"kind": "perk"}, ["select", "local"],
          "Groupon lists tickets for Universal Studios' Halloween Horror Nights on select nights through Nov 1, 2026. It's a ticket listing, not a stated discount, so compare the Groupon price with Universal's own before you buy.",
          "", "2026-07-31T07:00:00Z", "2026-11-01T06:59:00Z", "https://www.tkqlhce.com/click-101511733-17340174-1787099166000",
          "https://www.groupon.com/landing/universal-parks", "Universal Studios: Halloween Horror Nights: Select Nights through Nov 1, 2026",
          "Universal Studios: Halloween Horror Nights: Select Nights through Nov 1, 2026", sold_by="marketplace", region="Hollywood and Orlando", ptype="Sale/Discount"),
    _deal("17174428", "M&M'S", "2603623", "M&M's", "Coffee & food", "15% off Halloween items with code MONSTER",
          {"kind": "pct", "amount": 15, "upto": False}, ["select"],
          "M&M'S lists 15% off its Halloween items, such as gift jars and Halloween candy, with code MONSTER. The code is from M&M'S's affiliate record; if it's refused at checkout, it has been pulled early.",
          "MONSTER", "2025-10-15T07:00:00Z", "2026-10-19T07:00:00Z", "https://www.tkqlhce.com/click-101511733-17174428-1760072867000",
          "https://www.mms.com/en-us/shop/halloween-c.html", "Enjoy 15% Off Halloween With Code MONSTER", "Save 15% Off Halloween With Code MONSTER"),
    _deal("17178579", "M&M'S", "2603623", "M&M's", "Coffee & food", "15% off bulk candy with code CAULDRON",
          {"kind": "pct", "amount": 15, "upto": False}, ["select"],
          "M&M'S lists 15% off bulk candy bags with code CAULDRON, which is handy for trick-or-treat bowls. The code is from M&M'S's affiliate record; if it's refused at checkout, it has been pulled early.",
          "CAULDRON", "2025-10-20T03:17:00Z", "2026-10-27T07:00:00Z", "https://www.jdoqocy.com/click-101511733-17178579-1760764999000",
          "https://www.mms.com/en-us/shop/bulk-candy-bags-c.html", "Enjoy 15% Off Bulk Candy With Code CAULDRON", "Enjoy 15% Off Bulk candy with Code CAULDRON"),
    _deal("17361218", "Peet's Coffee", "2346375", "Peet's Coffee", "Coffee & food", "Halloween Sale: 15% off sitewide with code SPOOKY (Oct 29-31)",
          {"kind": "pct", "amount": 15, "upto": False}, [],
          "Peet's Halloween Sale takes 15% off sitewide at peets.com with code SPOOKY, but only from Oct 29 through Oct 31, 2026, and only for US orders.",
          "SPOOKY", "2026-10-29T07:00:00Z", "2026-11-01T06:59:00Z", "https://www.anrdoezrs.net/click-101511733-17361218-1791234560000",
          "https://www.peets.com/collections/all-coffees", "Peets.com Coffee Halloween Sale: 15% sitewide 10/29/26 - 10/31/26",
          "Peets.com Coffee Halloween Sale: 15% sitewide 10/29/26 - 10/31/26 Peets.com with code SPOOKY", region="US only"),
]

PETS = [
    _deal("17364986", "Budget Pet Care", "4250177", "Budget Pet Care", "Pets", "Columbus Day Sale: 35% off all pet supplies with code DISCOVER",
          {"kind": "pct", "amount": 35, "upto": False}, [],
          "Budget Pet Care's Columbus Day Sale takes 35% off all pet supplies with code DISCOVER, including the flea, tick and worming treatments it's known for. It ends Wednesday, Oct 14 at 11:30 AM PT.",
          "DISCOVER", "2026-10-12T12:01:00Z", "2026-10-14T18:30:00Z", "https://www.kqzyfj.com/click-101511733-17364986-1791833055000",
          "https://www.budgetpetcare.com/dog-flea-tick-and-worming-treatment-163.aspx", "Columbus Day Sale",
          "Your Pet's Favorites at Better Prices! Enjoy 35% OFF All Pet Supplies, Don't Miss Out! Use Code DISCOVER"),
    _deal("17364635", "Canada Pet Care", "4247933", "Canada Pet Care", "Pets", "35% off your entire order + free shipping with code TAKE35",
          {"kind": "pct", "amount": 35, "upto": False}, [],
          "Canada Pet Care takes 35% off the entire order and adds free shipping with code TAKE35 for its Columbus Day sale, through Thursday, Oct 15 at 11:29 AM PT.",
          "TAKE35", "2026-10-12T06:19:00Z", "2026-10-15T18:29:00Z", "https://www.anrdoezrs.net/click-101511733-17364635-1791813222000",
          "https://www.canadapetcare.com/heartgard-plus-for-dogs/heartwormers-treatment-34.aspx", "Columbus Day - 35% Off + Free Shipping",
          "Happy Discovery Day - Take 35% Off Entire Order + $0 Shipping. TAKE35"),
    _deal("17364563", "Best Vet Care", "4247934", "Best Vet Care", "Pets", "35% off pet supplies + free shipping, no code",
          {"kind": "pct", "amount": 35, "upto": False}, [],
          "Best Vet Care's Columbus Day sale takes 35% off any pet supplies with free shipping, and no code is needed. It runs through Thursday, Oct 15 at 11:29 AM PT.",
          "", "2026-10-12T05:03:00Z", "2026-10-15T18:29:00Z", "https://www.dpbolvw.net/click-101511733-17364563-1791644605000",
          "https://www.bestvetcare.com/", "Enjoy 35% OFF Columbus Day + Free Shipping",
          "Enjoy 35% OFF Deal on Your Purchase of Any Pet Supplies With Free Shipping", ptype="Sale/Discount"),
    _deal("17079095", "Budget Pet Care", "4250177", "Budget Pet Care", "Pets", "12% off sitewide + free shipping with code SUMMER12",
          {"kind": "pct", "amount": 12, "upto": False}, [],
          "An ongoing Budget Pet Care code: 12% off plus free shipping sitewide with SUMMER12, listed through Dec 30, 2027. Budget Pet Care names NexGard, Simparica Trio and Revolution Plus among the products it covers.",
          "SUMMER12", "2025-05-01T09:07:00Z", "2027-12-30T18:30:00Z", "https://www.anrdoezrs.net/click-101511733-17079095-1746115872000",
          "https://www.budgetpetcare.com/", "Biting Season is Back - SAVE BIG Today!",
          "Paw-tect Your Pet this Summer with 12% Off Nexgard, Simparica Trio, Revolution Plus & More + Free Shipping Sitewide! Use Code: SUMMER12"),
    _deal("15581166", "Budget Pet Care", "4250177", "Budget Pet Care", "Pets", "NexGard from $33 + an extra 15% off with code SAVE15",
          {"kind": "pct", "amount": 15, "upto": False}, ["select"],
          "Budget Pet Care lists NexGard chews from $33, plus an extra 15% off your order and free shipping with code SAVE15. It's listed through July 30, 2028. Match the chew size to your dog's weight.",
          "SAVE15", "2026-04-16T04:38:00Z", "2028-07-30T18:30:00Z", "https://www.jdoqocy.com/click-101511733-15581166-1776339579000",
          "https://www.budgetpetcare.com/nexgard-chewables-for-medium-dogs-10-24-lbs-blue-28mg-pack-137.aspx", "Nexgard Flea & Tick Protection",
          "Nexgard Chews That Dogs Love! Starts only at $33 + 15% Extra Off Your Order & Free Shipping. Use Coupon: SAVE15"),
]

STYLE = """<style>
.is-ended .live-only{display:none!important}
.ended-only{display:none}
.is-ended .ended-only{display:block}
.is-ended .status-pill{background:var(--surface-2);color:var(--ink-2)}
.is-ended .status-pill .dot{background:var(--ink-3);animation:none}
.deal .soon-note{display:none;margin:.25rem 0 0;font-weight:600;color:var(--accent-ink,#9a3b00)}
.deal.is-upcoming .soon-note{display:block}
.deal.is-upcoming .code-copy{display:none}
.season-grid{margin-top:1rem}
.season-note{font-size:.95rem}
</style>
"""

SCRIPT = """<script>
(function(){
  var now=Date.now();
  document.querySelectorAll('.deal[data-starts]').forEach(function(c){
    if(Date.parse(c.getAttribute('data-starts'))>now) c.classList.add('is-upcoming');
  });
  var main=document.getElementById('main'), endIso=main.getAttribute('data-page-end');
  var grids=document.querySelectorAll('.season-grid');
  function anyLive(){var n=0;grids.forEach(function(g){g.querySelectorAll('.deal').forEach(function(c){if(!c.hidden)n++;});});return n;}
  if((endIso&&now>=Date.parse(endIso))||!anyLive()){
    document.body.classList.add('is-ended');
    var s=document.getElementById('deal-status'); if(s) s.textContent=main.getAttribute('data-ended-label');
    if(endIso&&now>=Date.parse(endIso)) document.title='Ended: '+document.title;
  }
  document.querySelectorAll('.season-grid').forEach(function(g){
    var e=g.parentNode.querySelector('.season-empty'); if(!e) return;
    var n=0; g.querySelectorAll('.deal').forEach(function(c){if(!c.hidden)n++;}); e.hidden=n>0;
  });
})();
</script>
"""


def _now():
    return D._dt(CHECKED)


def _cards(items, sid):
    saved = D.CHECKED_AT
    D.CHECKED_AT = CHECKED
    try:
        out = []
        for d in items:
            s, parts = D.score(d, at=_now())
            d = dict(d, id="cj-" + d["link_id"], score=s, score_parts=parts)
            c = D.card(d, sid)
            st = d["network"]["starts"]
            if D._dt(st) > _now():
                start_pt = (D._dt(st) - datetime.timedelta(hours=7)).strftime("%a %b %-d")
                c = c.replace('<article class="deal"', f'<article class="deal" data-starts="{st}"', 1)
                c = c.replace('<p class="ai">', f'<p class="soon-note">Starts {start_pt} (PT). The code won\'t work before then.</p>\n<p class="ai">', 1)
            out.append(c)
        return "".join(out)
    finally:
        D.CHECKED_AT = saved


def _shell(head, nav, foot, *, path, title, h1, desc, crumb, status, page_end, ended_label, ended_html, intro, sections, ld_headline):
    body = f"""<main id="main" data-page-end="{page_end}" data-ended-label="{e(ended_label)}">
<article class="wrap article event">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/deals/">Live deals</a> <span aria-hidden="true">/</span> <span>{e(crumb)}</span></nav>
<header class="art-head">
<p class="status-pill" role="status"><span class="dot" aria-hidden="true"></span><span id="deal-status">{e(status)}</span></p>
<h1>{e(h1)}</h1>
<p class="byline">By the Discount Deal Me team &middot; Codes and dates checked against each store's CJ affiliate records on <time datetime="2026-10-13">October 13, 2026</time></p>
</header>
<p class="disclose"><strong>#ad &middot; Affiliate links.</strong> Discount Deal Me may earn a commission if you buy through the store links on this page, at no extra cost to you. It does not change the price or the Deal Score, and no store reviewed this page.</p>
<div class="ended-banner ended-only">{ended_html}</div>
{intro}
{sections}
<div class="art-foot">Offers, codes and dates come from each merchant's promotions published through the CJ affiliate network to Discount Deal Me, checked on October 13, 2026. Summaries marked "AI summary" were written by an AI model from those terms and checked against them. Each deal disappears from this page in your browser when its end time passes. We don't see or verify individual item prices, so always check your cart. Store names are trademarks of their owners.</div>
</article>
</main>
"""
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": ld_headline, "datePublished": "2026-10-13", "dateModified": "2026-10-13",
          "author": {"@type": "Organization", "name": "The Discount Deal Me team"}, "publisher": {"@type": "Organization", "name": "Discount Deal Me"},
          "mainEntityOfPage": "https://discountdealme.com" + path}
    h = head(title, desc, path, og_type="article", extra=STYLE)
    tail = foot.replace('<script src="/assets/site.js', f'<script type="application/ld+json">{json.dumps(ld)}</script>\n<script src="/assets/site.js', 1)
    tail = tail.replace("</body>", SCRIPT + "</body>", 1)
    return h + nav("deals") + body + tail


def halloween(head, nav, foot):
    intro = """<div class="art-main prose">
<p class="lede live-only">Halloween deals we could confirm in the stores' own affiliate records: Groupon's Spooky Sale, M&amp;M'S candy codes, Halloween Horror Nights tickets and a three-day Peet's sale. Each card says when it ends and disappears from this page once it does.</p>
</div>"""
    sections = f"""<section class="live-only" aria-labelledby="hw-h">
<h2 id="hw-h">Halloween deals, by Deal Score</h2>
<div class="deal-grid season-grid">{_cards(HALLOWEEN, SID)}</div>
<p class="season-empty empty" hidden>Every Halloween deal on this page has ended. See <a href="/deals/">today's live deals</a>.</p>
</section>
<div class="prose">
<h2>Before you check out</h2>
<ul class="checklist">
<li><strong>Codes apply to eligible items only.</strong> Groupon says HALLOWEEN works on eligible deals, and the M&amp;M'S codes cover Halloween items (MONSTER) and bulk candy (CAULDRON). Check the discount appears in your cart before you pay.</li>
<li><strong>Codes usually don't stack.</strong> Expect one code per order unless the store says otherwise.</li>
<li><strong>Order candy and costumes early.</strong> Shipping times matter more than the discount if it arrives after Oct 31.</li>
<li><strong>Local deals are local.</strong> Groupon experiences and Halloween Horror Nights tickets are for specific places and dates; read the voucher's fine print.</li>
</ul>
<p>Our <a href="/articles/coupon-stacking-explained/">guide to coupon stacking</a> and the <a href="/deal-checklist/">deal checklist</a> cover these checks in more detail.</p>
</div>"""
    ended = "<h2>Halloween 2026 deals have ended</h2><p>Every Halloween offer on this page ended by Sunday, November 1, 2026 at 9:59 PM PT, so we've hidden the codes and links. See <a href=\"/deals/\">today's live deals</a> or sign up below to hear about Black Friday and Cyber Monday.</p>"
    return _shell(head, nav, foot, path="/deals/halloween/", title="Halloween Deals 2026: Groupon, M&M'S and Peet's Codes",
                  h1="Halloween deals 2026: codes and sales that are actually live",
                  desc="Live Halloween 2026 deals checked against store affiliate records: Groupon's Spooky Sale (code HALLOWEEN), M&M'S codes MONSTER and CAULDRON, Halloween Horror Nights tickets and Peet's SPOOKY sale. Expired deals disappear automatically.",
                  crumb="Halloween deals", status="Live through Oct 31 \u00b7 last deal ends Nov 1, 9:59 PM PT", page_end=HALLOWEEN_END,
                  ended_label="Halloween 2026 deals have ended", ended_html=ended, intro=intro, sections=sections,
                  ld_headline="Halloween deals 2026: codes and sales that are actually live")


def pets(head, nav, foot):
    sales = [d for d in PETS if D._dt(d["network"]["ends"]) < D._dt("2026-11-01T00:00:00Z")]
    ongoing = [d for d in PETS if d not in sales]
    intro = """<div class="art-main prose">
<p class="lede">Pet-supply discounts from the stores' own affiliate records. The Columbus Day sales (35% off) end Oct 14 and 15; the ongoing codes underneath keep working after that.</p>
</div>"""
    sections = f"""<section aria-labelledby="ps-h">
<h2 id="ps-h">Limited-time pet sales</h2>
<div class="deal-grid season-grid">{_cards(sales, SID)}</div>
<p class="season-empty empty" hidden>These limited-time sales have ended. The ongoing codes below still work, and we add new pet sales as stores publish them.</p>
</section>
<section aria-labelledby="po-h">
<h2 id="po-h">Ongoing pet codes</h2>
<p class="season-note">These codes have no near-term end date in the network records. Stores can still change them, so check your cart total.</p>
<div class="deal-grid season-grid">{_cards(ongoing, SID)}</div>
</section>
<div class="prose">
<h2>Before you buy flea, tick or heartworm products</h2>
<ul class="checklist">
<li><strong>Match the weight band.</strong> Chews and spot-ons come in color-coded weight ranges; the wrong band means the wrong dose.</li>
<li><strong>Ask your vet.</strong> Some of these products need a prescription in the US, and your vet knows your pet's history. A discount isn't a reason to switch treatments.</li>
<li><strong>Compare per-dose cost.</strong> Pack sizes vary (1, 3, 6 or 12 doses), so divide the cart total by the number of doses.</li>
<li><strong>Check shipping time.</strong> Order before the current dose runs out.</li>
</ul>
<p>Our <a href="/articles/unit-price-math/">unit price guide</a> shows how to compare pack sizes.</p>
</div>"""
    return _shell(head, nav, foot, path="/deals/pet-supplies/", title="Pet Supply Deals: Live Codes for Flea, Tick and Pet Meds",
                  h1="Pet supply deals: live codes, checked",
                  desc="Live pet-supply deals from store affiliate records: Budget Pet Care's 35% off code DISCOVER (ends Oct 14, 11:30 AM PT), Canada Pet Care TAKE35, Best Vet Care 35% off, plus ongoing codes SUMMER12 and SAVE15.",
                  crumb="Pet supply deals", status="Updated Oct 13 \u00b7 35% off sales end Oct 14\u201315", page_end="",
                  ended_label="", ended_html="", intro=intro, sections=sections, ld_headline="Pet supply deals: live codes, checked")
