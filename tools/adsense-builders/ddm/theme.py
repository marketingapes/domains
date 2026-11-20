# Discount Deal Me design system (2026-11 refresh v2). Light, shopping-tool look: white surfaces, crisp cards,
# warm orange primary action, teal links, green for savings. Inter headings and body, JetBrains Mono codes.
CSS = r"""
:root{--bg:#ffffff;--surface:#f7f8fa;--surface-2:#eff1f4;--line:#e3e6ea;--line-2:#cfd4da;--ink:#0f1419;--ink-2:#46505c;--ink-3:#6b7480;--acc:#f59e0b;--acc-ink:#b45309;--acc-t:#fff7e8;--brand:#ff9f1a;--brand-2:#f08c00;--link:#0e6e8c;--ok:#067d62;--save:#067d62;--save-t:#e9f7f2;--warn:#c2410c;--warn-t:#fff4ed;--night:#0f1419;--night-2:#1c2530;--r:12px;--r-lg:16px;--shadow:0 1px 2px rgba(15,20,25,.05),0 1px 3px rgba(15,20,25,.08);--shadow-lg:0 10px 28px -10px rgba(15,20,25,.18);--font:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;--display:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;--mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);font-size:1rem;line-height:1.6;font-feature-settings:'cv11','ss01';-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{max-width:100%;height:auto;display:block}
a{color:var(--ink);text-decoration-color:var(--line-2);text-underline-offset:3px;text-decoration-thickness:1px}
a:hover{text-decoration-color:var(--ink)}
:focus-visible{outline:2px solid var(--acc);outline-offset:2px;border-radius:6px}
h1,h2,h3{line-height:1.15;letter-spacing:-.025em;margin:0 0 .5em;font-weight:700}
h1{font-size:clamp(2rem,5vw,3.25rem);font-weight:800;letter-spacing:-.035em}
h2{font-size:clamp(1.35rem,3vw,1.75rem)}
h3{font-size:1.1rem}
p{margin:0 0 1em}
.num,.score b,.stats dd{font-variant-numeric:tabular-nums}
.wrap{width:100%;max-width:1200px;margin:0 auto;padding:0 20px}
.narrow{max-width:800px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.skip{position:absolute;left:-999px;top:0;background:var(--ink);color:#fff;padding:8px 12px;z-index:10}
.skip:focus{left:8px}
.kicker{font-size:.75rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin:0 0 .5em}
.lede{font-size:1.125rem;color:var(--ink-2);max-width:64ch}
.fine{font-size:.85rem;color:var(--ink-3)}
/* top bar + header */
.topbar{background:var(--ink);color:#d4d4d8;font-size:.8rem}
.topbar-inner{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;padding-top:7px;padding-bottom:7px;text-align:center}
.topbar b{color:#fff}.topbar a{color:#fff;text-decoration-color:#71717a}
.site-head{background:rgba(255,255,255,.92);backdrop-filter:saturate(1.5) blur(8px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}
.head-inner{display:flex;align-items:center;gap:12px 24px;padding-top:12px;padding-bottom:12px;flex-wrap:wrap}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-weight:700;font-size:1.05rem;letter-spacing:-.02em}
.logo img{width:32px;height:32px;border-radius:8px}
.main-nav{display:flex;gap:4px;flex-wrap:nowrap;overflow-x:auto;order:3;width:100%;margin:0 -8px;scrollbar-width:none}
.main-nav a{white-space:nowrap;text-decoration:none;color:var(--ink-2);font-weight:500;font-size:.925rem;padding:6px 10px;border-radius:8px}
.main-nav a:hover{color:var(--ink);background:var(--surface-2)}
.main-nav a[aria-current]{color:var(--ink);background:var(--surface-2)}
.head-search{margin-left:auto;display:flex;align-items:center;border:1px solid var(--line);border-radius:10px;background:var(--surface);overflow:hidden}
.head-search input{border:0;background:transparent;font:inherit;font-size:.9rem;padding:8px 12px;width:160px;outline:none}
.head-search button{border:0;background:transparent;padding:8px 12px;cursor:pointer;color:var(--ink-2);font:inherit}
@media(min-width:900px){.main-nav{order:0;width:auto;margin:0}.head-search input{width:220px}}
@media(max-width:520px){.main-nav{gap:0;margin:0 -6px}.main-nav a{padding:6px 7px;font-size:.86rem}.head-search{display:none}.head-inner{padding-top:10px;padding-bottom:8px}}
/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--ink);color:#fff;font:inherit;font-weight:600;font-size:.95rem;text-decoration:none;padding:.7em 1.15em;border:1px solid var(--ink);border-radius:10px;cursor:pointer;transition:background .15s,box-shadow .15s;line-height:1.2}
.btn:hover{background:#27272a;color:#fff}
.btn-ghost{background:#fff;color:var(--ink);border-color:var(--line-2)}
.btn-ghost:hover{background:var(--surface-2);color:var(--ink)}
.btn-small{padding:.5em .9em;font-size:.875rem}
.btn-deal{background:var(--acc);border-color:var(--acc)}
.btn-deal:hover{background:var(--acc-ink);border-color:var(--acc-ink)}
.linklike{background:none;border:0;padding:0;font:inherit;color:var(--ink);text-decoration:underline;cursor:pointer}
.hero-ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:1.4em}
/* feed status */
.feed-status{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:.85rem;color:var(--ink-2);margin:0 0 18px}
.feed-status b{color:var(--ink)}
.feed-status a{color:var(--ink-2)}
.dot{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 4px rgba(21,128,61,.12);display:inline-block;animation:pulse 2.4s infinite}
@keyframes pulse{50%{box-shadow:0 0 0 7px rgba(21,128,61,0)}}
.feed-status.is-stale .dot{background:var(--ink-3);box-shadow:none;animation:none}
/* hero */
.hero{border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--surface) 0,#fff 100%)}
.hero-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:32px;padding-top:40px;padding-bottom:44px}
.hero h1{max-width:16ch}
.big-search{display:flex;gap:8px;margin:24px 0 10px;max-width:620px;background:#fff;border:1px solid var(--line-2);border-radius:14px;padding:6px;box-shadow:var(--shadow)}
.big-search input{flex:1;min-width:0;border:0;font:inherit;font-size:1rem;padding:10px 12px;outline:none;background:transparent}
.try{font-size:.875rem;color:var(--ink-3);display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}
.try a{color:var(--ink-2);background:#fff;border:1px solid var(--line);border-radius:999px;padding:2px 10px;text-decoration:none}
.try a:hover{border-color:var(--ink-3)}
.hero-panel{background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:22px;box-shadow:var(--shadow)}
.pipeline{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:14px}
.pipeline li{display:grid;grid-template-columns:28px 1fr;gap:12px}
.pipeline b{display:block;font-size:.95rem}
.pipeline p{margin:2px 0 0;font-size:.875rem;color:var(--ink-2)}
.step{width:28px;height:28px;border-radius:8px;background:var(--surface-2);display:grid;place-items:center;font-weight:700;font-size:.8rem;color:var(--ink-2)}
.panel-link{font-size:.875rem;font-weight:600}
@media(min-width:960px){.hero-grid{grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);align-items:center;padding-top:64px;padding-bottom:64px;gap:56px}}
/* sections */
.section{margin-top:56px;margin-bottom:8px}
.sec-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:18px;flex-wrap:wrap}
.sec-head h2{margin:0}
.sec-link{font-size:.9rem;font-weight:600;white-space:nowrap}
.sec-lede{color:var(--ink-2);margin-top:-6px;max-width:70ch}
.split{display:grid;gap:40px}
@media(min-width:960px){.split{grid-template-columns:1.2fr 1fr}}
/* deal cards */
.deal-grid{display:grid;gap:16px}
@media(min-width:680px){.deal-grid{grid-template-columns:1fr 1fr}}
@media(min-width:1040px){.deal-grid{grid-template-columns:repeat(3,1fr)}}
.deal{display:flex;flex-direction:column;gap:10px;background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:18px;box-shadow:var(--shadow);transition:border-color .15s,box-shadow .15s;scroll-margin-top:90px}
.deal:hover{border-color:var(--line-2);box-shadow:var(--shadow-lg)}
.deal:target{border-color:var(--acc);box-shadow:0 0 0 3px var(--acc-t)}
.deal[hidden]{display:none}
.deal-top{display:flex;align-items:center;gap:8px;min-height:44px}
.deal-merchant{font-weight:700;font-size:.9rem}
.deal-cat{font-size:.75rem;color:var(--ink-3);background:var(--surface-2);border-radius:999px;padding:2px 8px;white-space:nowrap}
.score{margin-left:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:52px;padding:4px 8px;border-radius:10px;background:var(--surface-2);line-height:1}
.score b{font-size:1.15rem;font-weight:800}
.score small{font-size:.6rem;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em;margin-top:3px;white-space:nowrap}
.score.is-high{background:var(--acc-t)}
.score.is-high b{color:var(--acc-ink)}
.deal-title{font-size:1.15rem;line-height:1.3;margin:0;letter-spacing:-.015em}
.deal-meta{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.8rem;color:var(--ink-3);margin:0}
.deal-meta span+span::before{content:"";display:inline-block;width:3px;height:3px;border-radius:50%;background:var(--line-2);margin-right:12px;vertical-align:middle}
.meta-end.is-soon{color:var(--acc-ink);font-weight:600}
.ai{font-size:.9rem;color:var(--ink-2);margin:0;line-height:1.55}
.ai-tag{display:inline-flex;align-items:center;gap:4px;font-size:.68rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-2);border:1px solid var(--line-2);border-radius:6px;padding:1px 6px;margin-right:4px;vertical-align:1px;white-space:nowrap}
.ai-tag::before{content:"";width:6px;height:6px;border-radius:2px;background:var(--acc);transform:rotate(45deg)}
.code{display:flex;align-items:center;gap:8px;border:1px dashed var(--line-2);border-radius:10px;padding:6px 6px 6px 12px;background:var(--surface)}
.code-label{font-size:.75rem;color:var(--ink-3)}
.code code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;font-size:.95rem;letter-spacing:.04em}
.code-copy{margin-left:auto;border:1px solid var(--line-2);background:#fff;border-radius:8px;font:inherit;font-size:.8rem;font-weight:600;padding:4px 10px;cursor:pointer}
.deal-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:auto}
.deal-actions .btn{flex:1 1 auto}
.deal-more{font-size:.85rem;font-weight:600}
.deal-details{border-top:1px solid var(--line);padding-top:8px;font-size:.85rem}
.deal-details summary{cursor:pointer;color:var(--ink-2);font-weight:500;list-style:none}
.deal-details summary::-webkit-details-marker{display:none}
.deal-details summary::after{content:" +";color:var(--ink-3)}
.deal-details[open] summary::after{content:" \2212"}
.terms{color:var(--ink-2);margin:10px 0}
.checked{color:var(--ink-3);margin:8px 0 0;font-size:.8rem}
.score-table{width:100%;border-collapse:collapse;font-size:.8rem;min-width:0}
.score-table th,.score-table td{padding:6px 4px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;background:none}
.score-table th{font-weight:600;white-space:nowrap}
.score-table td:nth-child(2){color:var(--ink-2)}
.score-table .num{text-align:right;white-space:nowrap}
.score-table .total th,.score-table .total td{border-bottom:0;font-weight:700;color:var(--ink)}
.empty{padding:40px 20px;text-align:center;border:1px dashed var(--line-2);border-radius:var(--r-lg);color:var(--ink-2)}
/* ending list + categories */
.ending-list{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden}
.ending-list li{display:grid;grid-template-columns:1fr auto;grid-template-areas:"m s" "t s" "e s";gap:0 12px;padding:12px 16px;border-bottom:1px solid var(--line);align-items:center}
.ending-list li:last-child{border-bottom:0}
.ending-list li[hidden]{display:none}
.er-merchant{grid-area:m;font-size:.75rem;color:var(--ink-3);font-weight:600}
.ending-list a{grid-area:t;font-weight:600;text-decoration:none}
.ending-list a:hover{text-decoration:underline}
.er-end{grid-area:e;font-size:.8rem;color:var(--ink-3)}
.ending-list .score{grid-area:s}
.cats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
.cat{display:flex;justify-content:space-between;align-items:center;border:1px solid var(--line);border-radius:10px;padding:12px 14px;text-decoration:none;font-weight:600;font-size:.925rem}
.cat:hover{border-color:var(--ink-3)}
.cat b{font-size:.8rem;color:var(--ink-3);font-weight:600}
.note-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;font-size:.9rem;color:var(--ink-2);margin:0 0 12px}
.note-card b{color:var(--ink)}
/* guides */
.guide-grid{display:grid;gap:16px}
@media(min-width:680px){.guide-grid{grid-template-columns:1fr 1fr}}
@media(min-width:1040px){.guide-grid{grid-template-columns:repeat(3,1fr)}.guide-grid .gcard-big{grid-column:span 3;flex-direction:row}.guide-grid .gcard-big .gcard-img{flex:1.1;border-bottom:0;border-right:1px solid var(--line)}.guide-grid .gcard-big .gcard-body{flex:1;justify-content:center;padding:32px}.guide-grid .gcard-big .gcard-title{font-size:1.6rem}}
.guide-grid-3 .gcard-big{grid-column:auto}
.gcard{display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;text-decoration:none;color:var(--ink);transition:border-color .15s,box-shadow .15s}
.gcard:hover{border-color:var(--line-2);box-shadow:var(--shadow-lg)}
.gcard[hidden]{display:none}
.gcard-img{display:block;border-bottom:1px solid var(--line);background:var(--surface-2)}
.gcard-body{display:flex;flex-direction:column;gap:6px;padding:16px 18px 20px}
.gcard-cat{font-size:.72rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--acc-ink)}
.gcard-title{font-weight:700;font-size:1.05rem;line-height:1.3;letter-spacing:-.015em}
.gcard-desc{color:var(--ink-2);font-size:.9rem}
/* calculator */
.calc-card{border:1px solid var(--line);border-radius:var(--r-lg);padding:24px;display:grid;gap:24px;background:var(--surface)}
.mini-steps{padding-left:1.2em;color:var(--ink-2);font-size:.925rem}
.meter-form{display:grid;grid-template-columns:1fr;gap:12px}
.field label{display:block;font-weight:600;font-size:.85rem;margin-bottom:4px}
.field small{font-weight:400;color:var(--ink-3)}
.field input{width:100%;font:inherit;padding:.6em .8em;border:1px solid var(--line-2);border-radius:10px;background:#fff}
.field input:focus{outline:2px solid var(--acc);outline-offset:0;border-color:transparent}
.meter-out{grid-column:1/-1;background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:16px}
.gauge{height:8px;border-radius:999px;background:var(--surface-2);overflow:hidden}
.gauge-fill{height:100%;width:0;background:var(--acc);transition:width .4s ease}
.verdict{font-weight:600;margin:.8em 0}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0}
.stats div{border:1px solid var(--line);border-radius:10px;padding:8px 10px}
.stats dt{font-size:.75rem;color:var(--ink-3)}
.stats dd{margin:0;font-weight:700;font-size:1.15rem}
.meter-form button{justify-self:start}
@media(min-width:640px){.meter-form{grid-template-columns:1fr 1fr}.stats{grid-template-columns:repeat(4,1fr)}}
@media(min-width:960px){.calc-card{grid-template-columns:.8fr 1.2fr;padding:36px;gap:40px}.meter-form{grid-template-columns:repeat(3,1fr)}}
/* trust */
.trust{display:grid;gap:24px;border-top:1px solid var(--line);padding-top:40px}
.rules{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.rules li{border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;color:var(--ink-2);font-size:.925rem}
.rules b{display:block;color:var(--ink);margin-bottom:2px}
@media(min-width:900px){.trust{grid-template-columns:1fr 1.4fr}.rules{grid-template-columns:1fr 1fr}}
/* page heads, crumbs */
.page-head{padding-top:32px;padding-bottom:12px}
.crumbs{font-size:.85rem;color:var(--ink-3);margin-bottom:14px}
.crumbs a{color:var(--ink-3)}
.disclose{font-size:.875rem;color:var(--ink-2);background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:10px 14px;max-width:820px}
.adchip{display:inline-block;font-size:.75rem;font-weight:600;border:1px solid var(--line-2);border-radius:999px;padding:2px 10px;color:var(--ink-2)}
/* finder */
.finder{margin-top:8px}
.finder-bar{position:sticky;top:61px;z-index:5;background:rgba(255,255,255,.96);backdrop-filter:blur(6px);padding:12px 0;border-bottom:1px solid var(--line);margin-bottom:18px}
.finder-search{display:flex;gap:8px;max-width:720px}
.finder-search input{flex:1;min-width:0;font:inherit;border:1px solid var(--line-2);border-radius:10px;padding:10px 12px}
.interpreted{font-size:.85rem;color:var(--ink-2);margin:8px 0 0}
.interpreted b{color:var(--ink)}
.chips{display:flex;gap:6px;margin:12px 0 8px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.chip{font:inherit;font-size:.85rem;font-weight:500;background:#fff;border:1px solid var(--line);border-radius:999px;padding:5px 12px;cursor:pointer;white-space:nowrap;color:var(--ink-2)}
.chip b{font-weight:600;color:var(--ink-3);margin-left:2px}
.chip:hover{border-color:var(--ink-3)}
.chip.is-on{background:var(--ink);border-color:var(--ink);color:#fff}
.chip.is-on b{color:#a1a1aa}
.toggles{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;font-size:.875rem;color:var(--ink-2)}
.toggle{display:flex;align-items:center;gap:6px;cursor:pointer}
.toggle input{accent-color:var(--ink);width:16px;height:16px}
.sort{margin-left:auto;display:flex;align-items:center;gap:8px}
.sort select{font:inherit;font-size:.875rem;border:1px solid var(--line-2);border-radius:8px;padding:5px 8px;background:#fff}
.result-count{font-size:.8rem;color:var(--ink-3);margin:10px 0 0}
.smart-note{font-size:.85rem;color:var(--ink-3);margin-top:20px}
@media(max-width:899px){.finder-bar{top:97px}}
.narrow-sec{max-width:800px}
/* articles */
.article{padding-top:24px;padding-bottom:40px}
.art-head{max-width:820px;margin-bottom:8px}
.art-head h1{font-size:clamp(1.9rem,4.5vw,2.75rem);margin-top:.35em}
.byline{color:var(--ink-3);font-size:.875rem}
.art-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:40px;margin-top:16px}
.art-layout>*{min-width:0}
@media(min-width:1040px){.art-layout{grid-template-columns:minmax(0,1fr) 300px}.art-side{position:sticky;top:90px;align-self:start}}
.art-hero{margin:0 0 28px;border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden}
.art-side{display:grid;gap:16px}
/* images */
.deal{overflow:hidden}
.deal-media{margin:-18px -18px 2px;aspect-ratio:16/10;overflow:hidden;border-bottom:1px solid var(--line);background:var(--surface-2)}
.deal-media.is-contain{background:#fff}
.deal-media img{display:block;width:100%;height:100%;object-fit:cover}
.gcard-img img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover}
@media(min-width:1040px){.guide-grid .gcard-big .gcard-img img{height:100%;min-height:300px}}
.hero-photo{margin:-22px -22px 18px;aspect-ratio:2/1;overflow:hidden;border-radius:var(--r-lg) var(--r-lg) 0 0;border-bottom:1px solid var(--line);background:var(--surface-2)}
.hero-photo img{display:block;width:100%;height:100%;object-fit:cover}
.hero-panel{overflow:hidden}
.art-hero img{display:block;width:100%;height:auto}
.art-diagram{margin:28px 0;border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;background:var(--surface)}
.art-diagram img{display:block;width:100%;height:auto}
.art-diagram figcaption{padding:10px 14px;font-size:.85rem;color:var(--ink-3);border-top:1px solid var(--line)}
.side-card{border:1px solid var(--line);border-radius:var(--r-lg);padding:16px;background:#fff}
.side-p{font-size:.875rem;color:var(--ink-2)}
.side-deals{list-style:none;margin:0 0 12px;padding:0}
.side-deals li{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.side-deals li[hidden]{display:none}
.side-deals a{text-decoration:none;font-weight:600;font-size:.875rem;line-height:1.35}
.side-deals a span{display:block;font-size:.72rem;color:var(--ink-3);font-weight:600}
.side-tool{display:block;padding:8px 0;border-bottom:1px solid var(--line);font-size:.9rem;font-weight:500;text-decoration:none}
.side-tool:last-child{border-bottom:0}
.prose{max-width:720px;font-size:1.0625rem;line-height:1.75}
.prose h2{margin-top:1.8em;font-size:1.5rem}
.prose h3{margin-top:1.4em}
.prose ul,.prose ol{padding-left:1.3em}
.prose li{margin-bottom:.4em}
.checklist{list-style:none;padding:0!important;margin:1.2em 0}
.checklist li{position:relative;padding:12px 14px 12px 44px;border:1px solid var(--line);border-radius:var(--r);margin-bottom:8px;background:#fff}
.checklist li::before{content:"";position:absolute;left:14px;top:16px;width:18px;height:18px;border-radius:5px;background:var(--acc-t);border:1px solid #fed7aa}
.checklist li::after{content:"";position:absolute;left:20px;top:19px;width:5px;height:9px;border:solid var(--acc-ink);border-width:0 2px 2px 0;transform:rotate(45deg)}
.steps{counter-reset:s;list-style:none;padding-left:0!important}
.steps li{counter-increment:s;position:relative;padding-left:44px;margin-bottom:.9em}
.steps li::before{content:counter(s);position:absolute;left:0;top:2px;width:28px;height:28px;display:grid;place-items:center;background:var(--surface-2);border-radius:8px;font-weight:700;font-size:.85rem}
.table-wrap{overflow-x:auto;margin:1.2em 0 1.6em;border:1px solid var(--line);border-radius:var(--r)}
table{border-collapse:collapse;width:100%;font-size:.925rem;min-width:520px}
caption{text-align:left;font-weight:600;padding:12px 14px;background:var(--surface);border-bottom:1px solid var(--line);font-size:.875rem}
th,td{padding:10px 14px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}
thead th{background:var(--surface);font-weight:600;font-size:.85rem;color:var(--ink-2)}
tbody tr:last-child td{border-bottom:0}
td.num,th.num{text-align:right}
.calc{margin:1.2em 0;background:var(--ink);color:#fff;border-radius:var(--r);padding:18px 20px}
.calc figcaption{font-weight:600;color:#fdba74;margin-bottom:8px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9rem;margin:0}
.note-inline,.art-foot{background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--acc);border-radius:10px;padding:12px 16px;margin:1.2em 0;font-size:.925rem}
.art-foot{border-left-color:var(--line-2);color:var(--ink-2)}
.faq details{border:1px solid var(--line);border-radius:var(--r);margin-bottom:8px;background:#fff}
.faq summary{cursor:pointer;font-weight:600;padding:12px 16px;list-style:none;position:relative;padding-right:44px}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";position:absolute;right:16px;top:10px;color:var(--ink-3);font-size:1.2rem}
.faq details[open] summary::after{content:"\2212"}
.faq details p{padding:0 16px 12px;margin:0;color:var(--ink-2)}
.related{margin-top:56px}
.big-mail{font-weight:700;font-size:1.2rem;word-break:break-all}
/* event pages */
.status-pill{display:inline-flex;align-items:center;gap:8px;font-size:.85rem;font-weight:600;background:var(--acc-t);color:var(--acc-ink);border-radius:999px;padding:4px 12px;margin:0 0 6px}
.status-pill .dot{background:var(--acc);box-shadow:0 0 0 4px rgba(234,88,12,.15)}
.glance{border:1px solid var(--line);border-radius:var(--r-lg);padding:22px;margin:0 0 28px;background:#fff;box-shadow:var(--shadow)}
.glance h2{margin-top:0}
.glance-tiles{display:grid;gap:8px;margin:0 0 16px}
.glance-tiles div{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px}
.glance-tiles b{display:block;font-size:1.35rem;letter-spacing:-.02em}
.glance-tiles span{font-size:.85rem;color:var(--ink-2);line-height:1.4;display:block}
@media(min-width:640px){.glance-tiles{grid-template-columns:repeat(3,1fr)}}
.deal-facts{margin:0 0 16px;padding-left:1.2em}
.deal-facts li{margin:.3em 0}
.deal-ctas{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 4px}
.ended-banner{background:var(--ink);color:#fff;border-radius:var(--r-lg);padding:18px 20px;margin:0 0 24px}
.ended-banner a{color:#fff}
.event .disclose{margin-bottom:18px}
/* partner stores */
.feature-store{display:grid;gap:24px;align-items:center;border:1px solid var(--line);border-radius:var(--r-lg);padding:16px;margin-top:16px}
.feature-img{border-radius:var(--r);overflow:hidden;aspect-ratio:4/3;background:var(--surface-2)}
.feature-img img{width:100%;height:100%;object-fit:cover}
.feature-copy{padding:8px}
.feature-copy h2{margin:.3em 0 .4em}
@media(min-width:900px){.feature-store{grid-template-columns:1.1fr 1fr;padding:20px}}
.store-grid{display:grid;gap:16px;margin-top:16px}
@media(min-width:680px){.store-grid{grid-template-columns:1fr 1fr}}
@media(min-width:1040px){.store-grid{grid-template-columns:repeat(3,1fr)}}
.store{border:1px solid var(--line);border-radius:var(--r-lg);padding:18px;display:flex;flex-direction:column;gap:8px;background:#fff}
.store[hidden]{display:none}
.store p{color:var(--ink-2);font-size:.925rem;margin:0}
.store .btn{align-self:flex-start;margin-top:auto}
.store-top{display:flex;gap:8px;align-items:center}
.store-net{font-size:.75rem!important;color:var(--ink-3)!important}
.store-alert{border-color:#fed7aa;background:var(--acc-t)}
.store-alert h2{font-size:1.2rem;margin:0}
/* checklist page */
.checklist-layout{display:grid;gap:28px}
@media(min-width:860px){.checklist-layout{grid-template-columns:1fr 280px;align-items:start}}
.tick{display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);font-size:.925rem}
.tick input{width:18px;height:18px;accent-color:var(--ink)}
.print-card .btn{margin-top:12px}
@media print{.site-head,.topbar,.site-foot,.btn{display:none!important}}
/* footer */
.site-foot{background:var(--surface);border-top:1px solid var(--line);margin-top:72px;padding:40px 0 28px;color:var(--ink-2);font-size:.9rem}
.site-foot a{color:var(--ink-2);text-decoration:none}
.site-foot a:hover{color:var(--ink);text-decoration:underline}
.foot-grid{display:grid;gap:24px}
.foot-grid nav{display:flex;flex-direction:column;gap:6px}
.foot-h{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--ink);margin:0 0 4px;font-weight:600}
.logo-foot{color:var(--ink)!important}
.foot-tag{margin-top:10px;max-width:40ch}
.foot-base{margin-top:28px;padding-top:16px;border-top:1px solid var(--line);font-size:.8rem;color:var(--ink-3)}
.foot-base p{margin:0}
@media(min-width:760px){.foot-grid{grid-template-columns:2fr 1fr 1fr 1fr}}
/* 404 */
.nf{text-align:center;padding-top:64px;padding-bottom:40px;max-width:720px}
.nf .hero-ctas{justify-content:center}
/* email sign-up */
.signup{background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:clamp(18px,4vw,32px);display:grid;gap:16px;margin:8px 0 40px;box-shadow:var(--shadow)}
.signup h2{font-size:clamp(1.3rem,3vw,1.6rem);margin:0 0 .25em}
.signup p{margin:0;color:var(--ink-2)}
.signup-row{display:flex;gap:8px;flex-wrap:wrap}
.signup-row input{flex:1 1 220px;min-height:46px;padding:10px 14px;border:1px solid var(--line-2);border-radius:10px;font:inherit;background:#fff}
.signup-row .btn{min-height:46px}
.signup-consent{display:flex;gap:10px;align-items:flex-start;font-size:.85rem;line-height:1.45;margin-top:12px;cursor:pointer;color:var(--ink-2)}
.signup-consent input{width:18px;height:18px;margin-top:1px;flex:0 0 auto;accent-color:var(--ink)}
.signup-fine{font-size:.8rem;color:var(--ink-3)!important;margin-top:8px!important}
.signup-msg{font-weight:600;margin-top:8px!important;color:var(--ok)!important}
.signup-msg.is-err{color:#b91c1c!important}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.signup-foot{box-shadow:none;margin:0 0 32px}
.home-signup{margin-top:56px}
@media (min-width:860px){.signup{grid-template-columns:1fr 1.3fr;align-items:start}}
/* ===== 2026-11 refresh layer (v2: light shopping tool) ===== */
h1,h2,h3,.deal-title,.gcard-title,.logo,.ocard-title{font-family:var(--display)}
h1,h2,h3{letter-spacing:-.022em}
h1{font-weight:800}
a{color:var(--link);text-decoration-color:rgba(14,110,140,.3)}
a:hover{text-decoration-color:var(--link)}
.kicker{color:var(--acc-ink);letter-spacing:.06em}
.btn{background:var(--night);border-color:var(--night);border-radius:10px}
.btn:hover{background:var(--night-2);border-color:var(--night-2)}
.btn-ghost{background:#fff;color:var(--ink);border-color:var(--line-2)}
.btn-ghost:hover{background:var(--surface);border-color:var(--ink-3);color:var(--ink)}
.btn-deal{background:var(--night);border-color:var(--night)}
.btn-amz{background:linear-gradient(180deg,#ffb84d,var(--brand));border:1px solid var(--brand-2);color:#0f1419;font-weight:700;box-shadow:0 1px 0 rgba(255,255,255,.4) inset,0 1px 2px rgba(15,20,25,.12)}
.btn-amz:hover{background:linear-gradient(180deg,#ffad33,var(--brand-2));border-color:#d97a00;color:#0f1419}
.adchip-sm{font-size:.66rem;font-weight:700;border:1px solid currentColor;border-radius:999px;padding:0 6px;opacity:.75;vertical-align:1px}
/* header */
.site-head{background:rgba(255,255,255,.94);border-bottom-color:var(--line)}
.logo{font-weight:800;letter-spacing:-.03em;color:var(--ink)}
.main-nav a{font-weight:500;color:var(--ink-2);border-radius:999px;padding:6px 10px;font-size:.9rem}
.main-nav a:hover{background:var(--surface-2);color:var(--ink)}
.main-nav a[aria-current]{background:var(--acc-t);color:var(--acc-ink)}
.head-search{border-radius:999px;background:var(--surface)}
.head-search input{padding-left:16px}
@media(max-width:899px){.main-nav{-webkit-mask-image:linear-gradient(90deg,#000 85%,transparent);mask-image:linear-gradient(90deg,#000 85%,transparent);padding-right:24px}}
/* holiday strip */
.bfcm-banner{background:var(--acc-t);color:var(--ink-2);font-size:.85rem;border:0;border-bottom:1px solid #fde3b5;margin:0;padding:0;max-width:none;border-radius:0}
.bfcm-inner{padding-top:8px;padding-bottom:8px}
.bfcm-banner p{margin:0;display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center;justify-content:center;text-align:center}
.bfcm-banner strong{color:var(--ink);font-weight:600}
.bfcm-banner a{color:var(--link);font-weight:600;text-decoration:none}
.bfcm-banner a:hover{text-decoration:underline}
/* smart search hero */
.hero-smart{background:linear-gradient(180deg,#fff 0,var(--surface) 100%);border-bottom:1px solid var(--line);padding-bottom:22px}
.smart-wrap{max-width:860px;text-align:center;padding-top:34px;padding-bottom:4px}
.hero-smart h1{font-size:clamp(1.9rem,4.6vw,3rem);margin:0 auto .25em;max-width:22ch;letter-spacing:-.035em}
.hero-smart .lede{margin:0 auto 18px;font-size:clamp(1rem,1.6vw,1.12rem);color:var(--ink-2)}
.smart{display:flex;align-items:center;gap:8px;background:#fff;border:2px solid var(--ink);border-radius:16px;padding:6px 6px 6px 14px;box-shadow:0 12px 30px -14px rgba(15,20,25,.25);text-align:left}
.smart:focus-within{border-color:var(--brand-2);box-shadow:0 0 0 4px rgba(255,159,26,.25),0 12px 30px -14px rgba(15,20,25,.25)}
.smart-ico{color:var(--ink-3);display:flex}
.smart input{flex:1;min-width:0;border:0;outline:none;font:inherit;font-size:1.12rem;padding:12px 6px;background:transparent;color:var(--ink)}
.smart .btn-amz{min-height:52px;padding:0 1.3em;font-size:1rem;border-radius:12px;white-space:nowrap}
@media(max-width:640px){.smart{flex-wrap:wrap;padding:6px}.smart-ico{display:none}.smart input{flex-basis:100%;padding:12px 10px}.smart .btn-amz{flex:1 1 100%}}
.smart-hint{font-size:.88rem;color:var(--ink-2);margin:12px 0 0}
.smart-hint b{color:var(--ink)}
.ex-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;margin:12px 0 0;font-size:.85rem;color:var(--ink-3)}
.ex-row a{color:var(--ink);text-decoration:none;background:#fff;border:1px solid var(--line-2);border-radius:999px;padding:5px 12px;font-weight:500}
.ex-row a:hover{border-color:var(--brand-2);background:var(--acc-t)}
.amz-fine{margin:10px auto 0;max-width:80ch;font-size:.76rem}
.offers .sec-lede{margin:6px 0 0}
@media(max-width:640px){.ex-row{flex-wrap:nowrap;overflow-x:auto;justify-content:flex-start;scrollbar-width:none;margin-left:-20px;margin-right:-20px;padding:0 20px}.ex-row::-webkit-scrollbar{display:none}.ex-row a{white-space:nowrap}.ex-row>span{display:none}.hero-smart .lede{font-size:.98rem}}
/* category shortcuts */
.cat-row{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:20px;padding-top:18px;padding-bottom:4px;scrollbar-width:none}
.cat-row::-webkit-scrollbar{display:none}
@media(min-width:1040px){.cat-row{justify-content:center}}
.ctile{position:relative;flex:0 0 150px;height:96px;border-radius:14px;overflow:hidden;text-decoration:none;scroll-snap-align:start;background:var(--surface-2);box-shadow:var(--shadow)}
.ctile img{width:100%;height:100%;object-fit:cover;transition:transform .3s}
.ctile:hover img{transform:scale(1.06)}
.ctile>span{position:absolute;inset:auto 0 0 0;padding:22px 10px 8px;background:linear-gradient(180deg,transparent,rgba(15,20,25,.78));color:#fff;display:flex;flex-direction:column;line-height:1.2}
.ctile b{font-size:.92rem}
.ctile small{font-size:.72rem;opacity:.85}
/* other offers */
.offers{margin-top:28px}
.ogrid{display:grid;gap:14px;grid-template-columns:repeat(2,minmax(0,1fr))}
@media(min-width:900px){.ogrid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.ocard{display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;transition:box-shadow .15s,border-color .15s,transform .15s}
.ocard:hover{box-shadow:var(--shadow-lg);border-color:var(--line-2);transform:translateY(-2px)}
.ocard[hidden]{display:none}
.ocard-img{display:block;aspect-ratio:16/10;background:var(--surface-2);overflow:hidden}
.ocard-img img{width:100%;height:100%;object-fit:cover}
.ocard-img.is-contain{background:#fff}.ocard-img.is-contain img{object-fit:contain}
.ocard-body{display:flex;flex-direction:column;gap:4px;padding:12px 14px 14px;flex:1}
.ocard-store{margin:0;font-size:.74rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3)}
.ocard-match{display:inline-block;background:var(--save-t);color:var(--save);border-radius:6px;padding:1px 6px;margin-right:4px;letter-spacing:.02em}
.ocard-title{margin:0;font-size:.98rem;line-height:1.3;font-weight:700;color:var(--ink)}
.ocard-meta{margin:2px 0 8px;display:flex;flex-wrap:wrap;gap:2px 10px;font-size:.78rem;color:var(--ink-3)}
.ocard-go{margin-top:auto;font-weight:700;font-size:.88rem;text-decoration:none;color:var(--link)}
.ocard-go:hover{text-decoration:underline}
.codechips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
.codechips[hidden]{display:none}
.codechip{display:flex;gap:8px;align-items:center;border:1px dashed var(--save);background:var(--save-t);border-radius:999px;padding:6px 14px;text-decoration:none;color:var(--ink);font-size:.88rem}
.codechip span{color:var(--save);font-weight:600}
.hero-facts{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 22px;font-size:.84rem;color:var(--ink-3)}
.hero-facts b{color:var(--ink);font-variant-numeric:tabular-nums}
/* carousel */
.car-nav{display:flex;gap:6px}
.car-btn{width:38px;height:38px;border-radius:50%;border:1px solid var(--line-2);background:#fff;font:inherit;font-size:1rem;cursor:pointer;color:var(--ink)}
.car-btn:hover{border-color:var(--ink-3)}
.car-track{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(240px,calc((100% - 42px)/4));gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:2px 2px 10px;scrollbar-width:thin}
.car-track>*{scroll-snap-align:start}
@media(max-width:640px){.car-track{grid-auto-columns:78%}}
/* season tiles with photos */
.stiles{display:grid;gap:14px;grid-template-columns:repeat(2,minmax(0,1fr))}
@media(min-width:900px){.stiles{grid-template-columns:repeat(4,minmax(0,1fr))}}
.stile{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;text-decoration:none;color:var(--ink);background:#fff;transition:box-shadow .15s,transform .15s}
.stile:hover{box-shadow:var(--shadow-lg);transform:translateY(-2px)}
.stile img{aspect-ratio:16/10;width:100%;object-fit:cover}
.stile-body{display:flex;flex-direction:column;gap:3px;padding:12px 14px 16px}
.stile b{font-family:var(--display);font-size:1.08rem}
.stile-body>span:last-child{font-size:.85rem;color:var(--ink-2)}
.season-date{font-size:.7rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--warn)}
/* deal cards */
.deal:hover{border-color:var(--line-2)}
.score.is-high{background:var(--save-t)}
.score.is-high b{color:var(--save)}
.meta-end.is-soon{color:var(--warn)}
.code{border-color:#9ad8c4;background:var(--save-t)}
.code code{font-family:var(--mono);color:var(--save)}
.chip.is-on{background:var(--night);border-color:var(--night)}
/* codes + tool card */
.code-stores{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.code-stores a{display:flex;justify-content:space-between;gap:8px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:12px 14px;text-decoration:none;font-weight:600;font-size:.92rem;color:var(--ink);background:#fff}
.code-stores a:hover{border-color:var(--save)}
.code-stores a span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.code-stores b{font-size:.75rem;font-weight:700;color:var(--save);background:var(--save-t);border-radius:999px;padding:2px 8px;white-space:nowrap}
.tool-card{border-radius:var(--r-lg);padding:24px;background:var(--acc-t);border:1px solid #fde3b5;align-self:start}
.tool-card h3{font-size:1.3rem}
.tool-card p{color:var(--ink-2)}
/* how it works */
.how-steps{list-style:none;margin:0;padding:0;display:grid;gap:12px}
@media(min-width:860px){.how-steps{grid-template-columns:repeat(3,1fr)}}
.how-steps li{border:1px solid var(--line);border-radius:var(--r-lg);padding:20px;background:var(--surface)}
.how-steps b{display:block;font-family:var(--display);font-size:1.06rem;margin:10px 0 4px}
.how-steps p{margin:0;color:var(--ink-2);font-size:.92rem}
.how-n{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--brand);color:var(--ink);font-weight:800;font-size:.85rem}
/* layout helpers */
.split>div{min-width:0}
@media(min-width:900px){.finder-bar{top:68px}}
@media(max-width:1179px){.head-search{display:none}}
@media(min-width:1180px){.main-nav{order:0;width:auto;margin:0}.head-search input{width:150px}}
@media(min-width:900px) and (max-width:1179px){.main-nav{order:0;width:auto;margin:0 0 0 auto}}
@media(max-width:640px){.bfcm-banner{font-size:.78rem}.bfcm-banner a[href="/gifts/"],.bfcm-banner a[href="/gift-planner/"]{display:none}.smart-wrap{padding-top:28px}.section{margin-top:40px}}
.site-foot{background:var(--surface);border-top:1px solid var(--line)}
.foot-base p+p{margin-top:4px}
.page-head h1{font-size:clamp(2rem,4.6vw,3rem)}
.disclose{border-left:3px solid var(--brand)}
@media(prefers-reduced-motion:reduce){.ocard:hover,.stile:hover{transform:none}.ctile:hover img{transform:none}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
"""
