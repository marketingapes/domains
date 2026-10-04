"""Build a self-contained read-only walkthrough; never impersonate server authorization."""
from pathlib import Path
import base64,json,argparse,html as escape_html
root=Path(__file__).resolve().parents[2]
assets=root/'lfma/portal/prototypes/phillips-current'
html=(assets/'index.html').read_text()
for css in ['portal.css','prototype.css']:
 html=html.replace(f'<link rel="stylesheet" href="{css}">','<style>'+(assets/css).read_text()+'</style>')
for name,mime in [('ma-logo.png','image/png')]:
 html=html.replace(f'src="{name}"','src="data:'+mime+';base64,'+base64.b64encode((assets/name).read_bytes()).decode()+'"')
parser=argparse.ArgumentParser();parser.add_argument('--owner-projection');args=parser.parse_args()
# Exact staged image; owner review artifact contains no private workbook ID, evidence URLs or recipient identities.
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

if args.owner_projection:
 projection=json.loads(Path(args.owner_projection).read_text())
 if projection.get('mode')!='PRIVATE_READ_ONLY_SHEET' or projection.get('decisions_enabled') is not False: raise ValueError('Read-only verified projection required')
 observed=sorted(set(row['observed_at'] for row in projection['current_state']))
 note='Verified read-only workbook snapshot · Source observed '+', '.join(observed)+' · Not a continuous live connection'
 html=html.replace('Read-only prototype · Private workbook is not connected · No live results',escape_html.escape(note))
 cards=''.join('<article><h3>'+escape_html.escape(row['workstream_id'].replace('_',' ').title())+'</h3><p>'+escape_html.escape(row['safe_summary'])+'</p><strong>'+escape_html.escape(row['status'].replace('_',' '))+'</strong><p class="version">Source observed '+escape_html.escape(row['observed_at'])+'</p></article>' for row in projection['current_state'])
 html=html.replace('<div class="journey">','<div class="journey"><div class="eyebrow">VERIFIED SOURCE SNAPSHOT</div><h2>Current operating picture</h2><p>These records were read from the private operating workbook and their version/content hashes verified. They describe planning and held work; live performance is not established.</p><div class="cards">'+cards+'</div></div><div class="journey">',1)
 html=html.replace('The private operating workbook is ready. Its current-state feed is not connected to this preview. Lead-level records stay in a separate protected source.','A read-only snapshot of the private operating workbook was retrieved and verified. Source observation time is preserved above; fetching it does not make it a fresh live report. Lead-level records stay separate.')
 html=html.replace('This preview uses synthetic reviewers. Real assignments and approvers are not configured.','No tasks are assigned to the snapshot reviewer in the source. Real assignees and approvers remain blank. The artwork below is a review sample, not an assigned request.')
 html=html.replace('<h3>Review Phillips MVA creative</h3>','<h3>Creative review sample</h3>')
 out.write_text(html)
 print('Verified owner snapshot included; no source URLs or decisions exported')
