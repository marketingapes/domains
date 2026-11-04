from pathlib import Path
import re
base=Path('btl/review/phillips-rideshare-20261104');out=base/'disclaimer-under-form-review';out.mkdir(exist_ok=True)
for name in ['form','quiz','sofia']:
 s=(base/(name+'.html')).read_text()
 disclosure=re.search(r'<div class="firm-disclaimer" role="note">[\s\S]*?</div>',s).group()
 s=s.replace(disclosure,'',1)
 s=re.sub(r'<div class="kit-preview" role="note">[\s\S]*?</div>','<div class="kit-preview" role="note"><b>Preview only.</b> Smaller disclaimer below the form; differs from Michael’s very-top / 12-point instruction. Test data only · no leads or calls.</div>',s,count=1)
 note='<aside class="under-form-legal"><p class="legal-review-label">Proposed placement · preview only</p>'+disclosure+'<a class="current-placement" href="../'+name+'.html">Compare current top-of-page placement ↗</a></aside>'
 marker=r'(<button[^>]*id="again"[^>]*>[\s\S]*?</button></div>)'
 s,count=re.subn(marker,lambda m:m[1]+note,s,count=1);assert count==1,name
 s=s.replace('<title>','<title>Smaller disclaimer placement review · ',1)
 s=s.replace('href="assets/','href="../assets/').replace('src="assets/','src="../assets/').replace('href="experiences.css"','href="../experiences.css"').replace('src="preview.js"','src="../preview.js"').replace('src="quiz-data.js"','src="../quiz-data.js"')
 s=s.replace('</head>','<link rel="stylesheet" href="placement.css"></head>')
 (out/(name+'.html')).write_text(s)
(out/'placement.css').write_text('''/* Review alternative: smaller than the firm's 12pt instruction, below the form. */
.under-form-legal{margin-top:18px;padding-top:12px;border-top:1px solid #e6e1da;text-align:left}.legal-review-label{font:600 9px/1.5 var(--sans);letter-spacing:.03em;text-transform:uppercase;color:#76521e;margin:0 0 6px}.under-form-legal .firm-disclaimer{position:static;background:transparent;color:#626873;padding:0;border:0;font:11px/1.5 "Times New Roman",Times,serif}.current-placement{display:inline-block;margin-top:8px;color:#76521e;font:11px/1.5 var(--sans)}.kit-preview{font-size:11px;line-height:1.55;padding:9px 16px}.kit-preview b{font-weight:800}.talk .under-form-legal .firm-disclaimer{color:#626873}.talk .under-form-legal{color:#15171c}@media(max-width:520px){.kit-preview{font-size:10px;padding:8px 14px}}
''')
(out/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; form-action 'none'; frame-src 'none'"><title>Phillips smaller disclaimer review</title><style>body{font:17px/1.6 Arial,sans-serif;color:#15171c;background:#faf8f5;max-width:840px;padding:40px 20px;margin:auto}h1{line-height:1.15}section{padding:24px;border:1px solid #e6e1da;border-radius:18px;background:white;margin:20px 0}a{display:inline-block;color:#8a1a1a;padding:10px 0;margin-right:18px}small{color:#76521e}</style><small>PREVIEW ONLY</small><h1>Smaller disclaimer.<br>Under the form.</h1><p>This alternative retains the exact nationwide wording but proposes 11px Roman text beneath the form. It differs from Michael’s written requirement for very-top placement and 12-point Roman type. This placement is provided for Phillips to review and request changes.</p><section><h2>Proposed placement</h2><a href="form.html">Callback →</a><a href="quiz.html">Claim Check →</a><a href="sofia.html">Sofia →</a><p>On Claim Check, complete the sample questions to see the contact form and disclaimer. On Sofia, open “Explore a callback instead.”</p></section><section><h2>Current versions remain available</h2><a href="../form.html">Original top placement →</a><a href="../disclaimer-review/">Above-fold alternative →</a></section><p>Use test details only. No calling, real submissions, advertising or retainer workflows are activated. The current placement remains available for comparison.</p></html>''')

# Clean campaign presentation on the three examples; controls stay unavailable.
for name in ['form','quiz','sofia']:
 p=out/(name+'.html');s=p.read_text()
 s=re.sub(r'<div class="kit-preview" role="note">[\s\S]*?</div>','',s,count=1)
 s=re.sub(r'<p class="legal-review-label">[\s\S]*?</p>','',s)
 s=re.sub(r'<a class="current-placement"[\s\S]*?</a>','',s)
 s=re.sub(r'<div class="receipt" id="done"[\s\S]*?</button></div>','',s)
 s=s.replace('data-preview=', 'data-kind=')
 replacements={
 'Smaller disclaimer placement review · ':'',
 ' · Phillips Law Group preview':' · Phillips Law Group',
 '(602) 693-1461 · preview':'(602) 693-1461<small>Calling unavailable here</small>',
 'Calling is disabled in this preview':'Calling unavailable',
 'This preview does not send a callback request.':'',
 'Preview my callback request':'Request a callback',
 'This is a preview: no contact request will be sent.':'',
 'Use test details only. No AI prequalification, intake handoff or retainer workflow is connected.':'This form is not connected. No request will be sent.',
 'Phillips Law Group · automated preview':'Phillips Law Group · automated',
 'Automated screening is not legal advice. This preview sends nothing to the firm. Use test details only.':'Automated screening is not legal advice or a case decision.',
 'Sofia · AI intake preview':'Sofia · AI intake',
 'Explore a short, non-graphic conversation with an AI intake assistant, followed by a person at Phillips Law Group. Calling, recording and transfers are off in this preview.':'A short, non-graphic conversation with an AI intake assistant can help you understand the questions the firm reviews. A person at Phillips Law Group makes any case decision.',
 'Talk to Sofia · preview only':'Talk to Sofia',
 '(602) 693-1461 · rideshare setup pending':'Calling unavailable here',
 'Explore a callback instead':'Request a callback',
 'See the form · nothing is sent':'Leave your name and number',
 'Proposed rideshare use of the existing 602 line is pending. No call, recording, transfer or retainer request starts here.':'Calling is unavailable from this page.',
 'Preview a private callback':'Request a private callback',
 'Use test details. A real intake connection would require the firm’s approval and testing.':'Share a few basics without describing what happened.',
 'The proposed handoff':'Phillips Law Group’s intake team',
 'Intake and any retainer workflow would be coordinated with Phillips before being connected.':'A person at the firm reviews potential matters and discusses any next steps. Screening does not determine legal eligibility.',
 'Callback preview':'Request a callback',
 'Claim Check preview':'Private Claim Check',
 'Sofia preview':'Meet Sofia',
 'This is a design preview, not legal advice or a case decision.':'This page is not legal advice or a case decision.',
 'Sofia is an AI intake assistant, not an attorney; calling and recording are disabled.':'Sofia is an AI intake assistant, not an attorney.',
 'src="../preview.js"':'src="interactions.js"',
 }
 for a,b in replacements.items():s=s.replace(a,b)
 s=s.replace('id="send" type="submit"','id="send" type="submit" disabled aria-disabled="true"')
 p.write_text(s)
with (out/'placement.css').open('a') as f:f.write('\n/* Unavailable controls remain visibly disabled at the interaction. */\n.top-call.off{display:flex;flex-direction:column;align-items:center;line-height:1.3;background:#363a42;padding-block:8px}.top-call.off small{font-size:9px;font-weight:500;opacity:.85}.submit[disabled]{cursor:not-allowed;opacity:.52;box-shadow:none}.review-note{font-size:12px;line-height:1.5;color:#626873}.call-block .voice-off{opacity:.55;cursor:not-allowed}\n')
source=(base/'preview.js').read_text()
needle='var copy=window.REVIEW_RESULTS[result]'
assert needle in source
source=source.replace(needle,"var copy={QUALIFIED:['Your answers may be appropriate for further review.','Only the firm can decide whether it can help.'],FIRM_REVIEW:['Your answers need a closer look.','A person would need to review the uncertain details.'],NOT_A_FIT:['Thank you for checking.','These answers may fall outside this campaign’s criteria. This is not a legal opinion about your situation.']}[result]")
source=source.replace('This is a preview; nothing has been sent.','No request has been sent.').replace("textContent='Preview result'","textContent='Check complete'")
source=source[:source.index("var form=document.querySelector")]+"document.querySelectorAll('form[data-kind]').forEach(function(form){form.addEventListener('submit',function(e){e.preventDefault();e.stopImmediatePropagation();var note=form.querySelector('.review-note');if(note){note.textContent='This form is not connected. No request has been sent.';note.setAttribute('role','status')}},true)});\n})();\n"
(out/'interactions.js').write_text(source)
p=out/'index.html';s=p.read_text().replace('open “Explore a callback instead.”','open “Request a callback.”').replace('Use test details only. No calling, real submissions, advertising or retainer workflows are activated.','The three examples have clean campaign presentation, with unavailable calls and submissions identified at the controls. No calling, real submissions, advertising or retainer workflows are activated.');p.write_text(s)
