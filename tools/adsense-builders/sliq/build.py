import os, sys, html
sys.path.insert(0, os.path.dirname(__file__))
from svgs import hero, og, logo, ARTICLE_ART
from articles1 import ARTICLES_1
from articles2 import ARTICLES_2

OUT = "/home/user/domains/sliq"
HOST = "smartlifeinsurancequote.com"
BRAND = "Smart Life Insurance Quote"
EMAIL = "sofia@smartlifeinsurancequote.com"
UPDATED = "2026-09-23"
UPDATED_H = "23 September 2026"
PUB = "ca-pub-5194583669093303"
ARTICLES = ARTICLES_1 + ARTICLES_2
BY = {a["slug"]: a for a in ARTICLES}


def w(rel, content):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(content)


def head(title, desc, path, og_image="/images/og.svg", noindex=False, extra=""):
    full = f"{title} | {BRAND}" if title != BRAND else f"{BRAND} | Life insurance, explained plainly"
    e = html.escape
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="https://{HOST}{path}">
{'<meta name="robots" content="noindex">' if noindex else ''}
<meta name="google-adsense-account" content="{PUB}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={PUB}" crossorigin="anonymous"></script>
<meta property="og:type" content="{'article' if path.startswith('/articles/') and path != '/articles/' else 'website'}">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{e(full)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="https://{HOST}{path}">
<meta property="og:image" content="https://{HOST}{og_image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0d3b3e">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&amp;family=Nunito:wght@400;600;800&amp;display=swap">
<link rel="stylesheet" href="/assets/site.css">
{extra}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap nav-wrap">
    <a class="brand" href="/" aria-label="{BRAND} home"><img src="/images/logo.svg" alt="" width="40" height="40"><span>Smart Life <em>Insurance Quote</em></span></a>
    <nav aria-label="Main">
      <a href="/articles/">Articles</a>
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
    </nav>
  </div>
</header>
"""


FOOT = f"""<footer class="site-footer">
  <div class="wrap foot-grid">
    <div>
      <a class="brand brand-foot" href="/"><img src="/images/logo.svg" alt="" width="36" height="36"><span>Smart Life <em>Insurance Quote</em></span></a>
      <div class="foot-note">Plain-English guides to life insurance. Educational information only, not insurance, legal, tax or financial advice. We do not sell insurance or quote premiums.</div>
    </div>
    <nav aria-label="Footer">
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
      <a href="/privacy/">Privacy</a>
      <a href="/terms/">Terms</a>
      <a href="/articles/">All articles</a>
    </nav>
  </div>
  <div class="wrap foot-bottom"><p>&copy;2026 {BRAND}. All rights reserved.</p></div>
</footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
"""

NOTE = ('<div class="ymyl" role="note"><strong>Educational information, not professional advice.</strong> '
        'Policies and rules vary by insurer and state; check details with a licensed professional.</div>')


def card(a):
    return f"""<li class="card">
  <a href="/articles/{a['slug']}/">
    <span class="card-art"><img src="/images/{a['slug']}.svg" alt="" loading="lazy" width="1200" height="675"></span>
    <span class="card-body"><span class="tag">{a['tag']}</span><strong>{html.escape(a['title'])}</strong><span class="card-text">{html.escape(a['card'])}</span><span class="card-go">Read the guide &rarr;</span></span>
  </a>
</li>"""


# ----------------------------------------------------------------------------- CSS / JS
CSS = r"""
:root{
  --ink:#0d3b3e; --ink-soft:#35595b; --teal:#2ec4b6; --deep:#13807a; --link:#0b6b64;
  --mint:#d9f5f1; --cream:#fff8ef; --coral:#ff7a59; --coral-dk:#c2462a; --sun:#ffc857; --lilac:#b9b3ea;
  --paper:#ffffff; --line:#e3ece9; --radius:22px; --shadow:0 10px 30px rgba(13,59,62,.10);
  --display:"Fraunces", Georgia, "Times New Roman", serif;
  --body:"Nunito", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--cream);color:var(--ink);font-family:var(--body);font-size:1.0625rem;line-height:1.7;overflow-x:hidden}
img{max-width:100%;height:auto;display:block}
a{color:var(--link);text-underline-offset:3px}
a:hover{color:var(--coral-dk)}
.wrap{width:100%;max-width:1120px;margin:0 auto;padding:0 16px}
.skip{position:absolute;left:-999px;top:0;background:var(--ink);color:#fff;padding:8px 14px;z-index:10}
.skip:focus{left:8px;top:8px}
h1,h2,h3{font-family:var(--display);line-height:1.2;color:var(--ink);letter-spacing:-.01em}
h1{font-size:clamp(2rem,6vw,3.3rem);margin:.2em 0 .35em}
h2{font-size:clamp(1.45rem,3.6vw,2rem);margin:1.8em 0 .5em}
h3{font-size:1.2rem;margin:1.4em 0 .4em}
:focus-visible{outline:3px solid var(--coral);outline-offset:3px;border-radius:6px}

/* header */
.site-header{background:var(--paper);border-bottom:3px solid var(--ink);z-index:5}
.nav-wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:10px;padding-bottom:10px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-family:var(--display);font-weight:800;font-size:1.1rem;line-height:1.1}
.brand em{font-style:normal;color:var(--deep)}
.brand img{width:40px;height:40px;transition:transform .3s}
.brand:hover img{transform:rotate(-12deg) scale(1.06)}
.site-header nav{display:flex;gap:4px;flex-wrap:wrap}
.site-header nav a{font-weight:800;text-decoration:none;color:var(--ink);padding:6px 12px;border-radius:999px;transition:background .2s,color .2s}
.site-header nav a:hover{background:var(--mint);color:var(--ink)}

/* hero */
.hero{background:linear-gradient(180deg,#dff4f7 0%,var(--cream) 100%);padding:36px 0 20px}
.hero-grid{display:grid;gap:24px;align-items:center}
.eyebrow{display:inline-block;background:var(--sun);color:var(--ink);font-weight:800;font-size:.85rem;padding:4px 12px;border-radius:999px;transform:rotate(-2deg)}
.hero p.lede{font-size:1.2rem;color:var(--ink-soft);max-width:34em}
.hero-art{border-radius:28px;overflow:hidden;border:3px solid var(--ink);box-shadow:8px 8px 0 var(--ink);background:#dff4f7}
.btn{display:inline-block;background:var(--coral);color:var(--ink);font-weight:800;text-decoration:none;padding:12px 22px;border-radius:999px;border:3px solid var(--ink);box-shadow:4px 4px 0 var(--ink);transition:transform .15s, box-shadow .15s}
.btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--ink);color:var(--ink)}
.btn.alt{background:var(--paper)}
.btn-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:18px}

/* sections */
section{padding:28px 0}
.band{background:var(--paper);border-top:3px solid var(--ink);border-bottom:3px solid var(--ink)}
.pill-list{display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:16px 0}
.pill-list a{display:inline-block;background:var(--mint);color:var(--ink);text-decoration:none;font-weight:700;padding:6px 14px;border-radius:999px;border:2px solid var(--ink);transition:background .2s,transform .2s}
.pill-list a:hover{background:var(--sun);transform:rotate(-2deg)}
.two-col{display:grid;gap:22px}

/* cards */
.cards{list-style:none;padding:0;margin:18px 0;display:grid;gap:22px;grid-template-columns:1fr}
.card a{display:flex;flex-direction:column;height:100%;background:var(--paper);border:3px solid var(--ink);border-radius:var(--radius);overflow:hidden;text-decoration:none;color:var(--ink);box-shadow:5px 5px 0 var(--ink);transition:transform .2s, box-shadow .2s}
.card a:hover{transform:translate(-3px,-3px) rotate(-.4deg);box-shadow:9px 9px 0 var(--teal);color:var(--ink)}
.card-art{display:block;border-bottom:3px solid var(--ink);background:var(--mint)}
.card-art img{width:100%;aspect-ratio:16/9;object-fit:cover;transition:transform .35s}
.card a:hover .card-art img{transform:scale(1.04)}
.card-body{display:flex;flex-direction:column;gap:6px;padding:16px 18px 18px}
.card-body strong{font-family:var(--display);font-size:1.2rem;line-height:1.25}
.card-text{color:var(--ink-soft);font-size:.98rem}
.card-go{margin-top:auto;font-weight:800;color:var(--link)}
.tag{align-self:flex-start;background:var(--sun);font-size:.78rem;font-weight:800;padding:2px 10px;border-radius:999px;border:2px solid var(--ink)}

/* widget */
.widget{background:var(--paper);border:3px solid var(--ink);border-radius:28px;box-shadow:8px 8px 0 var(--teal);padding:22px 18px}
.widget h2{margin-top:0}
.widget .fields{display:grid;gap:14px;grid-template-columns:1fr}
.widget label{display:block;font-weight:800;font-size:.95rem;margin-bottom:4px}
.widget .hint{display:block;font-weight:600;color:var(--ink-soft);font-size:.83rem}
.widget input{width:100%;font:inherit;padding:10px 12px;border:2px solid var(--ink);border-radius:12px;background:var(--cream);color:var(--ink)}
.widget input:focus{border-color:var(--deep);background:#fff}
.dime-out{margin-top:18px;background:var(--mint);border:2px dashed var(--ink);border-radius:18px;padding:16px}
.dime-total{font-family:var(--display);font-size:clamp(1.8rem,7vw,2.6rem);font-weight:800;margin:0;line-height:1.1}
.dime-bars{display:grid;gap:8px;margin:14px 0 6px}
.dime-bar{display:grid;grid-template-columns:92px 1fr auto;gap:8px;align-items:center;font-size:.9rem;font-weight:700}
.dime-track{display:block;height:14px;background:#fff;border:2px solid var(--ink);border-radius:999px;overflow:hidden}
.dime-fill{display:block;height:100%;width:0;transition:width .4s}
.fill-d{background:var(--coral)}.fill-i{background:var(--teal)}.fill-m{background:var(--lilac)}.fill-e{background:var(--sun)}
.small{font-size:.88rem;color:var(--ink-soft)}

/* article */
.article-head{padding-top:28px}
.crumbs{font-size:.9rem;color:var(--ink-soft)}
.crumbs a{color:var(--ink-soft)}
.meta{color:var(--ink-soft);font-size:.95rem;margin:0 0 16px}
.article-hero{border:3px solid var(--ink);border-radius:26px;overflow:hidden;box-shadow:7px 7px 0 var(--ink);margin:10px 0 24px;background:var(--mint)}
.prose{max-width:760px}
.prose .lede{font-size:1.18rem;color:var(--ink-soft)}
.prose ul,.prose ol{padding-left:1.3em}
.prose li{margin:.35em 0}
.ymyl{background:#fff3d6;border:2px solid var(--ink);border-left:10px solid var(--sun);border-radius:14px;padding:12px 14px;font-size:.95rem;margin:14px 0}
.table-wrap{margin:22px 0;overflow-x:auto;background:var(--paper);border:3px solid var(--ink);border-radius:18px}
table{border-collapse:collapse;width:100%;min-width:520px;font-size:.95rem}
caption{text-align:left;font-family:var(--display);font-weight:800;padding:12px 14px;font-size:1.05rem}
th,td{padding:10px 14px;border-top:1px solid var(--line);text-align:left;vertical-align:top}
thead th{background:var(--ink);color:#fff}
tbody th{background:var(--mint)}
.checklist{background:var(--paper);border:3px solid var(--ink);border-radius:20px;padding:16px 18px;margin:24px 0;box-shadow:5px 5px 0 var(--sun)}
.checklist-title{font-family:var(--display);font-weight:800;font-size:1.1rem;margin:0 0 6px}
.checklist ul{list-style:none;padding-left:0;margin:0}
.checklist li{position:relative;padding-left:34px}
.checklist li::before{content:"";position:absolute;left:0;top:.25em;width:20px;height:20px;border:2px solid var(--ink);border-radius:6px;background:var(--mint)}
.checklist li::after{content:"";position:absolute;left:6px;top:.45em;width:7px;height:11px;border:solid var(--deep);border-width:0 3px 3px 0;transform:rotate(45deg)}
ol.steps{counter-reset:s;list-style:none;padding-left:0}
ol.steps li{counter-increment:s;position:relative;padding-left:48px;margin:.8em 0}
ol.steps li::before{content:counter(s);position:absolute;left:0;top:0;width:34px;height:34px;border-radius:50%;background:var(--teal);border:2px solid var(--ink);font-weight:800;display:grid;place-items:center;font-size:.95rem}
.diagram{margin:24px 0}
.flow{display:grid;gap:10px}
.flow-box{background:var(--paper);border:3px solid var(--ink);border-radius:16px;padding:10px 14px}
.flow-box strong{display:block;font-family:var(--display)}
.flow-box span{font-size:.92rem;color:var(--ink-soft)}
.flow-box.teal{background:var(--mint)} .flow-box.coral{background:#ffe3da}
.flow-arrow{text-align:center;font-size:1.6rem;font-weight:800;transform:rotate(90deg)}
.flow-split{display:grid;gap:10px}
figcaption{font-size:.88rem;color:var(--ink-soft);margin-top:8px}
.timeline ol{list-style:none;padding:0;margin:20px 0;display:grid;gap:12px}
.timeline li{position:relative;background:var(--paper);border:3px solid var(--ink);border-radius:16px;padding:10px 14px 10px 44px}
.timeline li strong{display:block;font-family:var(--display)}
.timeline li span:last-child{font-size:.92rem;color:var(--ink-soft)}
.tl-dot{position:absolute;left:14px;top:16px;width:18px;height:18px;border-radius:50%;background:var(--coral);border:2px solid var(--ink)}
.timeline li:nth-child(2n) .tl-dot{background:var(--teal)} .timeline li:nth-child(3n) .tl-dot{background:var(--sun)}
.faq details{background:var(--paper);border:3px solid var(--ink);border-radius:16px;padding:12px 16px;margin:10px 0;transition:box-shadow .2s}
.faq details:hover{box-shadow:4px 4px 0 var(--teal)}
.faq summary{cursor:pointer;font-weight:800}
.faq details p{margin:.6em 0 0}
.related{margin-top:30px}
.related .cards{grid-template-columns:1fr}

/* pages */
.page{padding:30px 0 50px}
.page .prose h2:first-of-type{margin-top:1.2em}
.contact-card{background:var(--paper);border:3px solid var(--ink);border-radius:22px;padding:20px;box-shadow:6px 6px 0 var(--coral);margin:18px 0}
.contact-card .email{font-family:var(--display);font-size:clamp(1.05rem,4.5vw,1.5rem);font-weight:800;word-break:break-all}

/* footer */
.site-footer{background:var(--ink);color:#e6f4f2;margin-top:40px;padding:30px 0 16px}
.site-footer a{color:#fff}
.site-footer a:hover{color:var(--sun)}
.brand-foot{color:#fff}
.brand-foot em{color:var(--teal)}
.foot-grid{display:grid;gap:18px}
.foot-note{font-size:.9rem;color:#c7e4e0;max-width:34em}
.site-footer nav{display:flex;flex-wrap:wrap;gap:8px 18px;font-weight:700}
.foot-bottom{border-top:1px solid rgba(255,255,255,.2);margin-top:18px;padding-top:12px;font-size:.88rem}

@media (min-width:640px){
  .site-header{position:sticky;top:0}
  .cards{grid-template-columns:repeat(2,1fr)}
  .widget .fields{grid-template-columns:repeat(2,1fr)}
  .flow{grid-template-columns:1fr auto 1fr auto 1.4fr;align-items:center}
  .flow-arrow{transform:none}
  .related .cards{grid-template-columns:repeat(3,1fr)}
}
@media (min-width:900px){
  .hero-grid{grid-template-columns:1fr 1.15fr}
  .cards{grid-template-columns:repeat(3,1fr)}
  .two-col{grid-template-columns:1fr 1fr}
  .foot-grid{grid-template-columns:1.4fr 1fr}
  .widget{padding:28px}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
"""

JS = r"""(function(){
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
"""


# ----------------------------------------------------------------------------- pages
def home():
    feat = "\n".join(card(a) for a in ARTICLES[:6])
    more = "\n".join(card(a) for a in ARTICLES[6:])
    fields = [
        ("debt", "Debts + final expenses", "Car loans, cards, funeral costs (not the mortgage)", 25000),
        ("income", "Annual income to replace", "Your yearly take-home or gross pay", 60000),
        ("years", "Years of income", "Until your youngest is independent, say", 15),
        ("mortgage", "Mortgage balance", "What is left on the home loan", 250000),
        ("kids", "Number of children", "Who you would fund education for", 2),
        ("edu", "Education per child", "Your own goal for each child", 50000),
        ("existing", "Existing life cover", "Including work cover (minus)", 120000),
        ("savings", "Savings your family could use", "Investments or cash (minus)", 30000),
    ]
    fhtml = "\n".join(
        f'<div><label for="{i}">{l}<span class="hint">{h}</span></label><input id="{i}" name="{i}" type="number" inputmode="numeric" min="0" step="any" value="{v}"></div>'
        for i, l, h, v in fields)
    body = head(BRAND, "Life insurance explained plainly: term vs whole vs universal, how much cover you might need, riders, beneficiaries, underwriting and the quote process.", "/") + f"""
<main id="main">
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <span class="eyebrow">Life insurance, minus the jargon</span>
      <h1>Understand your cover before anyone quotes you a price.</h1>
      <p class="lede">Smart Life Insurance Quote is a free library of plain-English guides. We explain how term, whole and universal life work, how much cover people typically think about, what riders and beneficiaries really mean, and what happens between asking for a quote and getting a policy.</p>
      <div class="btn-row"><a class="btn" href="/articles/">Browse the guides</a><a class="btn alt" href="#estimator">Try the DIME estimator</a></div>
    </div>
    <div class="hero-art"><img src="/images/hero.svg" alt="A family and their dog shelter under a giant teal umbrella on a green hill while rain bounces off." width="1600" height="900"></div>
  </div>
</section>

<section>
  <div class="wrap two-col">
    <div>
      <h2>Why this site exists</h2>
      <p>Life insurance is one of those purchases people know they should think about and then put off, mostly because the language is confusing. Words like <em>contestability</em>, <em>per stirpes</em> and <em>participation rate</em> make a simple idea sound complicated. The simple idea is this: if people rely on you, money can take care of them if you are not around.</p>
      <p>Our guides break each topic into small pieces, with tables, checklists and questions to ask. We do not sell policies, we do not publish premium tables and we do not rank insurers. That keeps the focus where it should be: helping you understand the choices so any conversation with an insurer or licensed agent is quicker and clearer.</p>
    </div>
    <div>
      <h2>Where to start</h2>
      <p>New to all of this? Read <a href="/articles/term-vs-whole-life-insurance/">term vs whole life</a> first, then work out a ballpark figure with <a href="/articles/how-much-life-insurance-do-i-need/">how much cover do I need</a>. When you are ready to talk to insurers, <a href="/articles/how-to-compare-life-insurance-quotes/">how to compare quotes</a> and <a href="/articles/how-life-insurance-underwriting-works/">how underwriting works</a> explain what happens next.</p>
      <ul class="pill-list" aria-label="Topics">
        <li><a href="/articles/term-vs-whole-life-insurance/">Policy types</a></li>
        <li><a href="/articles/life-insurance-riders-explained/">Riders</a></li>
        <li><a href="/articles/choosing-life-insurance-beneficiaries/">Beneficiaries</a></li>
        <li><a href="/articles/life-insurance-medical-exam/">Medical exam</a></li>
        <li><a href="/articles/life-insurance-through-life-stages/">Life stages</a></li>
        <li><a href="/articles/how-life-insurance-claims-work/">Claims</a></li>
      </ul>
    </div>
  </div>
</section>

<section class="band" id="estimator">
  <div class="wrap two-col">
    <div>
      <h2>The DIME estimator</h2>
      <p>DIME stands for <strong>D</strong>ebt, <strong>I</strong>ncome, <strong>M</strong>ortgage and <strong>E</strong>ducation. It is a quick way to turn a vague worry into a rough number you can think about. Change any box and the estimate updates instantly. Nothing you type leaves your browser.</p>
      <div class="ymyl" role="note"><strong>A rough educational estimate, not a recommendation.</strong> It ignores inflation, taxes, survivor benefits and your partner's income. It is not a quote and says nothing about price.</div>
      <p class="small">Want the reasoning behind each box? Read <a href="/articles/how-much-life-insurance-do-i-need/">How much life insurance do I need?</a></p>
    </div>
    <form class="widget" id="dime" aria-labelledby="dime-h">
      <h2 id="dime-h">Rough cover estimate</h2>
      <div class="fields">
{fhtml}
      </div>
      <div class="dime-out" aria-live="polite">
        <p class="small">Rough DIME estimate, rounded up to the nearest 50,000</p>
        <p class="dime-total"><span id="dime-total">0</span></p>
        <div class="dime-bars">
          <div class="dime-bar"><span>Debt</span><span class="dime-track"><span class="dime-fill fill-d" id="fill-d"></span></span><span id="amt-d">0</span></div>
          <div class="dime-bar"><span>Income</span><span class="dime-track"><span class="dime-fill fill-i" id="fill-i"></span></span><span id="amt-i">0</span></div>
          <div class="dime-bar"><span>Mortgage</span><span class="dime-track"><span class="dime-fill fill-m" id="fill-m"></span></span><span id="amt-m">0</span></div>
          <div class="dime-bar"><span>Education</span><span class="dime-track"><span class="dime-fill fill-e" id="fill-e"></span></span><span id="amt-e">0</span></div>
        </div>
        <p class="small">Total need before subtracting existing cover and savings: <span id="dime-gross">0</span>. Amounts are in whatever currency you typed.</p>
      </div>
    </form>
  </div>
</section>

<section>
  <div class="wrap">
    <h2>Featured guides</h2>
    <ul class="cards">
{feat}
    </ul>
    <h2>More to explore</h2>
    <ul class="cards">
{more}
    </ul>
  </div>
</section>

<section>
  <div class="wrap prose">
    <h2>How we write</h2>
    <p>Every guide is written by the Smart Life Insurance Quote team in plain language, reviewed against publicly available regulator and consumer resources, and dated so you know when it was last updated. Life insurance rules vary by state and by insurer, so we explain how things commonly work and flag where details differ. When a decision depends on your health, finances or family, the right next step is a conversation with a licensed insurance professional, and our guides will help you ask better questions.</p>
    {NOTE}
  </div>
</section>
</main>
""" + FOOT
    return body


def article(a):
    slug = a["slug"]
    faq = "\n".join(f"<details><summary>{html.escape(q)}</summary><p>{html.escape(ans)}</p></details>" for q, ans in a["faq"])
    rel = "\n".join(card(BY[s]) for s in a["related"])
    import json
    ld = {
        "@context": "https://schema.org", "@type": "Article", "headline": a["title"],
        "description": a["desc"], "dateModified": UPDATED, "datePublished": UPDATED,
        "image": f"https://{HOST}/images/{slug}.svg",
        "author": {"@type": "Organization", "name": f"The {BRAND} team"},
        "publisher": {"@type": "Organization", "name": BRAND},
        "mainEntityOfPage": f"https://{HOST}/articles/{slug}/",
    }
    extra = f'<script type="application/ld+json">{json.dumps(ld)}</script>\n'
    return head(a["title"], a["desc"], f"/articles/{slug}/", og_image=f"/images/{slug}.svg", extra=extra) + f"""
<main id="main">
<article class="wrap article-head">
  <p class="crumbs"><a href="/">Home</a> / <a href="/articles/">Articles</a> / {html.escape(a['short'])}</p>
  <span class="tag">{a['tag']}</span>
  <h1>{html.escape(a['title'])}</h1>
  <p class="meta">By the {BRAND} team &middot; Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></p>
  <div class="article-hero"><img src="/images/{slug}.svg" alt="{html.escape(ARTICLE_ALT[slug])}" width="1200" height="675"></div>
  <div class="prose">
    {NOTE}
{a['body']}
    <section class="faq" aria-labelledby="faq-h">
      <h2 id="faq-h">Frequently asked questions</h2>
{faq}
    </section>
  </div>
  <section class="related" aria-labelledby="rel-h">
    <h2 id="rel-h">Related articles</h2>
    <ul class="cards">
{rel}
    </ul>
  </section>
</article>
</main>
""" + FOOT


ARTICLE_ALT = {}


def articles_index():
    cards = "\n".join(card(a) for a in ARTICLES)
    return head("All articles", "Every Smart Life Insurance Quote guide in one place: policy types, how much cover, riders, beneficiaries, underwriting, quotes, life stages and claims.", "/articles/") + f"""
<main id="main" class="page">
  <div class="wrap">
    <p class="crumbs"><a href="/">Home</a> / Articles</p>
    <h1>All life insurance guides</h1>
    <p class="prose">Twelve plain-English guides covering how policies work, how people size their cover, what happens during underwriting and quotes, and how claims are paid. Each one ends with an FAQ and links to related reading.</p>
    <ul class="cards">
{cards}
    </ul>
    {NOTE}
  </div>
</main>
""" + FOOT


def about():
    return head("About us", "Who is behind Smart Life Insurance Quote, what the site covers, how the guides are written and how the site is funded.", "/about/") + f"""
<main id="main" class="page">
  <div class="wrap prose">
    <p class="crumbs"><a href="/">Home</a> / About</p>
    <h1>About Smart Life Insurance Quote</h1>
    <p class="lede">Smart Life Insurance Quote is an independent educational website that explains life insurance in plain English. It is published by Marketing Apes LLC and written by the Smart Life Insurance Quote team.</p>
    <h2>What we do</h2>
    <p>We write guides that help people understand life insurance before they talk to an insurer or agent: the difference between term, whole and universal life, ways to estimate how much cover might be useful, what riders do, how to name beneficiaries, what the medical exam and underwriting involve, how to compare quotes fairly and how claims are paid. Our home page also has a simple DIME estimator for a rough, educational ballpark figure.</p>
    <h2>What we do not do</h2>
    <ul>
      <li>We are not an insurance company, agency or broker, and we do not sell policies on this site.</li>
      <li>We do not publish premium prices, rank insurers or claim to have tested products.</li>
      <li>We do not give personal insurance, financial, legal or tax advice.</li>
    </ul>
    <h2>How the guides are written</h2>
    <p>Each article is researched from publicly available sources such as state insurance regulators, the National Association of Insurance Commissioners and insurers' own published policy explanations. We explain how things commonly work, point out where rules vary by insurer or state, and date every page. We avoid invented statistics, testimonials and product ratings. If you spot something that looks wrong or out of date, please tell us through the <a href="/contact/">contact page</a> and we will review it.</p>
    <h2>How the site is funded</h2>
    <p>This site may display advertising served by Google AdSense. Advertisers do not write or review our content, and ads do not influence what we publish. You can read how advertising cookies work in our <a href="/privacy/">privacy policy</a>.</p>
    {NOTE}
  </div>
</main>
""" + FOOT


def contact():
    return head("Contact", "How to contact the Smart Life Insurance Quote team with corrections, topic suggestions or general questions about the site.", "/contact/") + f"""
<main id="main" class="page">
  <div class="wrap prose">
    <p class="crumbs"><a href="/">Home</a> / Contact</p>
    <h1>Contact us</h1>
    <p class="lede">We would love to hear from you, whether you spotted an error, want a topic covered or have a question about the site.</p>
    <div class="contact-card">
      <p>Email the Smart Life Insurance Quote team:</p>
      <p class="email"><a href="mailto:{EMAIL}">{EMAIL}</a></p>
      <p class="small">We aim to reply within a few business days.</p>
    </div>
    <h2>Good things to write about</h2>
    <ul>
      <li><strong>Corrections.</strong> Tell us which page and what looks wrong, with a source if you have one.</li>
      <li><strong>Topic ideas.</strong> Questions about life insurance you would like explained in plain English.</li>
      <li><strong>Accessibility.</strong> Anything on the site that is hard to read or use.</li>
      <li><strong>Advertising or partnerships.</strong> General business enquiries about the site.</li>
    </ul>
    <h2>What we cannot help with</h2>
    <p>We cannot give personal advice, provide quotes, review your policy or handle claims. For questions about an existing policy or a claim, contact your insurer directly. For complaints about an insurer or agent, your state insurance department can help. Please do not send medical details, policy numbers or other sensitive personal information by email.</p>
    {NOTE}
  </div>
</main>
""" + FOOT


def privacy():
    return head("Privacy policy", "How Smart Life Insurance Quote handles data, including cookies, Google AdSense advertising, Google Analytics and how to opt out of personalised ads.", "/privacy/") + f"""
<main id="main" class="page">
  <div class="wrap prose">
    <p class="crumbs"><a href="/">Home</a> / Privacy</p>
    <h1>Privacy policy</h1>
    <p class="meta">Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></p>
    <p>This policy explains how Smart Life Insurance Quote (smartlifeinsurancequote.com), published by Marketing Apes LLC, handles information when you visit the site. The educational pages on this site do not ask you to create an account or submit personal details.</p>
    <h2>Information collected automatically</h2>
    <p>Like most websites, our hosting provider and the services described below may receive technical information such as your IP address, browser type, device type, pages visited, referring page and the date and time of your visit. This is used to deliver the site, keep it secure and understand which pages are useful.</p>
    <h2>Cookies</h2>
    <p>Cookies are small text files stored by your browser. We and our partners may use cookies and similar technologies for advertising, analytics and basic site functionality. You can control or delete cookies in your browser settings; blocking some cookies may affect how the site works.</p>
    <h2>Advertising and Google AdSense</h2>
    <ul>
      <li>This site uses Google AdSense to show advertising. Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website and other websites.</li>
      <li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visits to this site and/or other sites on the Internet.</li>
      <li>You may opt out of personalised advertising by visiting Google's <a href="https://adssettings.google.com" rel="noopener">Ads Settings</a> at adssettings.google.com. You can also opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info" rel="noopener">www.aboutads.info</a>.</li>
      <li>To learn more, see <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">How Google uses information from sites or apps that use its services</a>.</li>
    </ul>
    <p>Where required by law, for example for visitors in the European Economic Area or the United Kingdom, a consent message may ask for your choices before personalised advertising cookies are used.</p>
    <h2>Analytics</h2>
    <p>We may use Google Analytics, loaded directly or through Google Tag Manager, to understand how visitors use the site, such as which pages are viewed and for how long. Google Analytics uses cookies and collects information such as pages visited and approximate location. You can prevent Google Analytics from using your data by installing the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Google Analytics opt-out browser add-on</a>.</p>
    <h2>The DIME estimator</h2>
    <p>The estimator on the home page runs entirely in your browser. The numbers you type are not sent to us or stored by us.</p>
    <h2>Email</h2>
    <p>If you email us, we use your email address and message only to reply and to improve the site. Please do not send sensitive personal, medical or financial information.</p>
    <h2>Children</h2>
    <p>This site is intended for adults and is not directed at children under 13. We do not knowingly collect personal information from children.</p>
    <h2>Your choices and rights</h2>
    <p>Depending on where you live, you may have rights to access, correct or delete personal information, or to opt out of certain uses such as targeted advertising. To make a request, contact us at the address below.</p>
    <h2>Changes and contact</h2>
    <p>We may update this policy and will change the date at the top when we do. Questions: <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
  </div>
</main>
""" + FOOT


def terms():
    return head("Terms of use", "The terms for using Smart Life Insurance Quote, including our educational-only disclaimer, content ownership, third-party links and limitation of liability.", "/terms/") + f"""
<main id="main" class="page">
  <div class="wrap prose">
    <p class="crumbs"><a href="/">Home</a> / Terms</p>
    <h1>Terms of use</h1>
    <p class="meta">Last updated <time datetime="{UPDATED}">{UPDATED_H}</time></p>
    <p>By using smartlifeinsurancequote.com (the "site"), published by Marketing Apes LLC, you agree to these terms. If you do not agree, please do not use the site.</p>
    <h2>Educational information only</h2>
    <p>Everything on this site is general educational information about life insurance. It is not insurance, financial, legal, tax or medical advice and does not take your personal circumstances into account. We are not an insurer, agent or broker and do not sell insurance on this site. Policy features, underwriting rules and laws vary by insurer and by state and change over time. Before making decisions, consult a licensed insurance professional or other qualified adviser.</p>
    <h2>The DIME estimator</h2>
    <p>The estimator provides a rough illustration based only on the numbers you enter. It is not a quote, an offer of insurance or a recommendation of any amount or product.</p>
    <h2>Accuracy</h2>
    <p>We work to keep articles accurate and dated, but we do not guarantee that all content is complete, current or error-free. If you spot a mistake, please let us know.</p>
    <h2>Content ownership</h2>
    <p>The text, illustrations and design of this site are owned by Marketing Apes LLC unless stated otherwise. You may share links and quote short passages with attribution. Please do not republish whole articles or images without permission.</p>
    <h2>Third-party links and advertising</h2>
    <p>The site may link to third-party websites and may display advertising from third parties. We do not control and are not responsible for their content, products or privacy practices.</p>
    <h2>Limitation of liability</h2>
    <p>To the fullest extent permitted by law, Marketing Apes LLC is not liable for any loss or damage arising from your use of, or reliance on, the site or its content.</p>
    <h2>Changes and contact</h2>
    <p>We may update these terms from time to time. Questions: <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
  </div>
</main>
""" + FOOT


def notfound():
    return head("Page not found", "The page you were looking for could not be found on Smart Life Insurance Quote. Try the articles list or the home page.", "/404.html", noindex=True) + """
<main id="main" class="page">
  <div class="wrap prose" style="text-align:center">
    <img src="/images/hero.svg" alt="" width="1600" height="900" style="max-width:520px;margin:0 auto;border:3px solid #0d3b3e;border-radius:24px">
    <h1>Caught in the rain?</h1>
    <p class="lede">We could not find that page. It may have moved, or the link may be mistyped.</p>
    <div class="btn-row" style="justify-content:center"><a class="btn" href="/">Back to home</a><a class="btn alt" href="/articles/">Browse all guides</a></div>
  </div>
</main>
""" + FOOT


def main():
    # images
    w("images/hero.svg", hero())
    w("images/og.svg", og())
    w("images/logo.svg", logo())
    import re
    for a in ARTICLES:
        svg = ARTICLE_ART[a["slug"]]()
        w(f"images/{a['slug']}.svg", svg)
        ARTICLE_ALT[a["slug"]] = re.search(r'<desc id="d">(.*?)</desc>', svg).group(1)
    w("assets/site.css", CSS.strip() + "\n")
    w("assets/site.js", JS)
    w("index.html", home())
    w("about/index.html", about())
    w("contact/index.html", contact())
    w("privacy/index.html", privacy())
    w("terms/index.html", terms())
    w("articles/index.html", articles_index())
    for a in ARTICLES:
        w(f"articles/{a['slug']}/index.html", article(a))
    w("404.html", notfound())
    w("contact.html", f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact | {BRAND}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="https://{HOST}/contact/">
<meta http-equiv="refresh" content="0;url=/contact/">
</head>
<body>
<p>Our contact page has moved: <a href="/contact/">go to the contact page</a>.</p>
</body>
</html>
""")
    w("robots.txt", f"""User-agent: *
Allow: /
Disallow: /preview/

User-agent: Mediapartners-Google
Allow: /

Sitemap: https://{HOST}/sitemap.xml
""")
    w("_redirects", "/preview/*  /  301\n/preview    /  301\n")
    w("ads.txt", "google.com, pub-5194583669093303, DIRECT, f08c47fec0942fa0\n")
    urls = ["", "articles/", "about/", "contact/", "privacy/", "terms/"] + [f"articles/{a['slug']}/" for a in ARTICLES]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sm.append(f"  <url><loc>https://{HOST}/{u}</loc><lastmod>{UPDATED}</lastmod></url>")
    sm.append("</urlset>")
    w("sitemap.xml", "\n".join(sm) + "\n")


if __name__ == "__main__":
    main()
    print("built", len(ARTICLES), "articles")
