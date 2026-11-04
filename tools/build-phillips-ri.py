from pathlib import Path
import shutil
source=Path('btl/review/phillips-rideshare-20261104');pages=source/'disclaimer-under-form-review';out=Path('btl/phillips/ri');out.mkdir(parents=True,exist_ok=True)
for name in ['phillips-logo.webp','plg-reference.css']:
 dest=out/'assets'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source/'assets'/name,dest)
for name in ['hero.jpg','sofia.jpg','team.webp']:
 dest=out/'assets/phillips-rideshare'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source/'assets/phillips-rideshare'/name,dest)
for name in ['experiences.css','quiz-data.js']:shutil.copy2(source/name,out/name)
shutil.copy2(pages/'placement.css',out/'presentation.css');shutil.copy2(pages/'interactions.js',out/'interactions.js')
paths={'form':'','quiz':'claim-check/','sofia':'talk-to-sofia/'}
for name,route in paths.items():
 s=(pages/(name+'.html')).read_text()
 s=s.replace('href="../assets/','href="/phillips/ri/assets/').replace('src="../assets/','src="/phillips/ri/assets/')
 s=s.replace('href="../experiences.css"','href="/phillips/ri/experiences.css"').replace('href="placement.css"','href="/phillips/ri/presentation.css"').replace('src="../quiz-data.js"','src="/phillips/ri/quiz-data.js"').replace('src="interactions.js"','src="/phillips/ri/interactions.js"')
 for old,new in [('index.html','/phillips/ri/'),('form.html','/phillips/ri/'),('quiz.html','/phillips/ri/claim-check/'),('sofia.html','/phillips/ri/talk-to-sofia/')]:s=s.replace('href="'+old+'"','href="'+new+'"')
 s=s.replace('</head>','<link rel="canonical" href="https://besttortlawyers.com/phillips/ri/'+route+'"></head>')
 dest=out/route/'index.html';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(s)

# Confirmed shared complex-tort route; callback/AI controls stay guarded.
for route in paths.values():
 dest=out/route/'index.html';s=dest.read_text()
 s=s.replace('<span class="top-call off">(602) 693-1461<small>Calling unavailable here</small></span>', '<a class="top-call" href="tel:+16026006247">(602) 600-6247<small>Phillips intake</small></a>')
 s=s.replace('<div class="btn-call voice-off" aria-disabled="true">Calling unavailable</div>', '<a class="btn-call" href="tel:+16026006247">Call Phillips intake · (602) 600-6247</a>')
 s=s.replace('<p class="call-note">Calling is unavailable from this page.</p>', '<p class="call-note">Sofia’s AI call connection is not available here yet. You can call the firm directly.</p><a class="cb-button direct-intake" href="tel:+16026006247">Call Phillips intake · (602) 600-6247</a>')
 s=s.replace('Calling unavailable here','AI calling not connected')
 s=s.replace('</body>','<style>.top-call,.btn-call,.direct-intake{text-decoration:none}.direct-intake{display:flex;justify-content:center;margin-top:12px}.top-call small{display:block}</style></body>')
 dest.write_text(s)

for door in ['quiz','sofia','form']:
 for size in ['ad','story']:
  shutil.copy2(source/'assets/phillips-rideshare'/f'{size}-{door}.jpg',out/'assets/phillips-rideshare'/f'{size}-{door}.jpg')
disclaimer='DISCLAIMER: This advertisement is not for legal services related to an incident that occurred in California, Colorado, Texas or that a California, Colorado, or Texas court would have jurisdiction over.'
cards=[]
for door,title in [('quiz','Private claim check'),('sofia','Meet Sofia'),('form','Private callback')]:
 cards.append(f'<article><h2>{title}</h2><a class="destination" href="/phillips/ri/{paths[door]}">Open landing page →</a><figure><a href="/phillips/ri/assets/phillips-rideshare/ad-{door}.jpg"><img src="/phillips/ri/assets/phillips-rideshare/ad-{door}.jpg" alt="{title} feed ad concept" width="1080" height="1080"></a><figcaption>Feed · 1080 × 1080</figcaption></figure><figure><a href="/phillips/ri/assets/phillips-rideshare/story-{door}.jpg"><img src="/phillips/ri/assets/phillips-rideshare/story-{door}.jpg" alt="{title} story ad concept" width="1080" height="1920" loading="lazy"></a><figcaption>Story · 1080 × 1920</figcaption></figure></article>')
gallery=out/'ads';gallery.mkdir(exist_ok=True)
(gallery/'index.html').write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><meta http-equiv="Content-Security-Policy" content="default-src &#39;self&#39;; img-src &#39;self&#39;; style-src &#39;self&#39; &#39;unsafe-inline&#39;; script-src &#39;none&#39;; connect-src &#39;none&#39;; form-action &#39;none&#39;"><link rel="canonical" href="https://besttortlawyers.com/phillips/ri/ads/"><title>Phillips rideshare · Ad creative review</title><style>body{margin:0;background:#f7f5f1;color:#262727;font:16px/1.6 Arial,sans-serif}.firm-disclaimer{background:white;padding:16px 24px;font:16px/1.5 "Times New Roman",serif}.wrap{max-width:1240px;margin:auto;padding:32px 24px}header{display:flex;align-items:center;gap:18px}header img{width:100px}h1{font-size:clamp(32px,5vw,52px);line-height:1.1;letter-spacing:-1px}h2{font-size:24px;margin-top:0}a{color:#a52426}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}article{background:white;border-radius:16px;padding:20px;box-shadow:0 8px 30px #00000008}figure{margin:24px 0 0}figure img{width:100%;height:auto;border:1px solid #e2ded8;box-sizing:border-box}figcaption{font-size:13px;color:#686868}.status{border-left:4px solid #a52426;padding:12px 18px;background:white;margin:28px 0}.destination{font-weight:bold}nav{display:flex;flex-wrap:wrap;gap:20px;margin:24px 0}@media(max-width:800px){.grid{grid-template-columns:1fr}.wrap{padding:24px 16px}article{padding:16px}}</style></head><body><div class="firm-disclaimer">'+disclaimer+'</div><div class="wrap"><header><img src="/phillips/ri/assets/phillips-logo.webp" alt="Phillips Law Group"><span>Rideshare campaign · PLG-RIDESHARE-SA-001</span></header><h1>Three ways to start.<br>One Phillips team.</h1><p>Six creative concepts paired with the three campaign landing pages. Open an image to review or download it at full size.</p><div class="status"><b>Creative review — no ads launched.</b> Direct calls use the confirmed shared Phillips intake route, (602) 600-6247. Web callbacks and Sofia’s AI connection remain unavailable pending end-to-end delivery verification. The landing pages show Kyle’s proposed under-form disclaimer placement; it has not been confirmed against Michael’s written top-of-page requirement.</div><nav><a href="/phillips/ri/">Callback page</a><a href="/phillips/ri/claim-check/">Claim check</a><a href="/phillips/ri/talk-to-sofia/">Sofia page</a></nav><main class="grid">'+''.join(cards)+'</main><footer><p>ATTORNEY ADVERTISING. Creative concepts only. No firm approval, representation or outcome is implied. Sofia is an AI assistant, not an attorney. For confidential support: RAINN, 1-800-656-4673. In an emergency, call 911.</p></footer></div></body></html>')
