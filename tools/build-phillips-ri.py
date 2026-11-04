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
