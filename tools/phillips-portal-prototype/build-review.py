"""Build a self-contained read-only walkthrough; never impersonate server authorization."""
from pathlib import Path
import base64,json
root=Path(__file__).resolve().parents[2]
assets=root/'lfma/portal/prototypes/phillips-current'
html=(assets/'index.html').read_text()
for css in ['portal.css','prototype.css']:
 html=html.replace(f'<link rel="stylesheet" href="{css}">','<style>'+(assets/css).read_text()+'</style>')
for name,mime in [('ma-logo.png','image/png')]:
 html=html.replace(f'src="{name}"','src="data:'+mime+';base64,'+base64.b64encode((assets/name).read_bytes()).decode()+'"')
fixture=json.loads((root/'tools/phillips-portal-prototype/fixture.json').read_text())
# Exact staged image; public artifact contains no private workbook ID, evidence URLs or recipient identities.
html=html.replace('<div id="task-list"></div>','<article><h3>Review Phillips MVA creative</h3><p>Exact staged artwork. Current firm approval remains unverified.</p><img class="review-image" alt="Staged Phillips MVA Meta square creative" src="data:image/jpeg;base64,'+base64.b64encode((assets/'review-asset.jpg').read_bytes()).decode()+'"><p>Read-only walkthrough. Version-bound review decisions are available only in the explicitly enabled local mock runner.</p></article>')
html=html.replace('<label>Demo recipient <select id="persona"><option value="demo-reviewer">Demo creative reviewer</option><option value="demo-operator">Demo operations reviewer</option></select></label>','')
html=html.replace('Local demo decisions only. This audit is held in memory and disappears when the preview stops. Decisions bind the reviewed version and content hash; they do not authorize spending, publishing or outreach.','Read-only walkthrough. No decisions are submitted or recorded here. In the local mock runner, demo decisions bind the reviewed version and content hash; they do not authorize campaign execution.')
html=html.replace('<div id="audit-list"></div>','<p>No verified review history is connected.</p>')
html=html.replace('Loading preview…','Read-only prototype · Private workbook is not connected · No live results')
js="document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==button.dataset.tab);}));"
html=html.replace('<script src="app.js" defer></script>','').replace('</body>','<script>'+js+'</script></body>')
out=root/'lfma/portal/prototypes/phillips-current/client-perspective-preview.html'
out.write_text(html)
print(out)
