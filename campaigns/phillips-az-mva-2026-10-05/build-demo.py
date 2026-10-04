"""Assemble isolated landing previews and one self-contained offline review file."""
from pathlib import Path
import base64, html, json
root=Path(__file__).resolve().parent
logo_path=root.parent.parent.parent/"nil-site/assets/phillips-logo.webp"
logo="data:image/webp;base64,"+base64.b64encode(logo_path.read_bytes()).decode()
variants=json.loads((root/"landing-variants.json").read_text())["variants"]
dest=root/"landing-previews";dest.mkdir(exist_ok=True)
style="""*{box-sizing:border-box}body{margin:0;background:#f6ede3;color:#17191b;font:18px/1.6 Arial,sans-serif}main{max-width:1040px;margin:auto;padding:clamp(20px,5vw,70px)}header{display:flex;align-items:center;gap:24px;flex-wrap:wrap}header img{width:160px;height:auto}h1{font-size:clamp(36px,6vw,64px);line-height:1.08}h2{line-height:1.25}.badge{color:#a91526;font-weight:bold}aside{border:1px solid #a91526;padding:20px}a{color:#a91526;overflow-wrap:anywhere}.paths{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:20px}.paths article{padding:24px;background:#fffdf9;border-top:4px solid #a91526}footer{margin-top:44px;padding-top:24px;border-top:1px solid #b5a699}"""
csp="default-src 'none'; img-src data:; style-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'"
parts=[]
for v in variants:
    path=v["path"]
    content={
      "W1":'<h2>Choose how to start</h2><div class="paths"><article><h3>Understand the process</h3><p>Share basic information, preserve uncertainty and let people review legal questions.</p></article><article><h3>Meet Sofia</h3><p>Sofia is an AI intake assistant. Her role is to organize facts, not give legal advice.</p></article><article><h3>Guided facts</h3><p>A few neutral questions prepare an inquiry for human review. No automatic eligibility decision.</p></article></div>',
      "W2":'<h2>Sofia is an AI intake assistant</h2><p>She is not a lawyer. She asks one clear question at a time and can organize basic facts for human review. She cannot determine legal eligibility, estimate value or promise representation.</p><h2>Before any future contact</h2><p>Source, contact and recording permissions, recipient eligibility and staffed receiving hours must be verified. Missing permissions or hours leaves contact held.</p>',
      "W3":'<h2>Questions for later private intake</h2><ol><li>What type of vehicle incident would you like to discuss?</li><li>Where did it happen?</li><li>When did it happen, approximately?</li><li>What would you like the intake team to know?</li><li>Which permitted contact method and time would you prefer?</li></ol><p>Optional injury/symptom and treatment-history questions may be skipped or answered unsure. Answers remain private for human review, never Meta collection, targeting or AI eligibility.</p>',
    }[path]
    body=f'<main><header><img src="{logo}" alt="Phillips Law Group"><p class="badge">ARIZONA · {path} · REVIEW ONLY</p></header><h1>{html.escape(v["hero"])}</h1><p>Nearest Injury Lawyers is a lead-generation and matching service, not a law firm. Sofia is AI; attorneys review legal questions.</p><aside><strong>Offline landing preview.</strong> Attorney review pending. No form, callback, transfer, live assistant or data capture. Production PR13 files remain unchanged.</aside>{content}<h2>{html.escape(v["cta"])}</h2><p>This review copy has no live intake control. A later release requires reviewed permissions, routing and staffed hours.</p><nav aria-label="Review variants"><a href="W1.html">W1 overview</a> · <a href="W2.html">W2 disclosed AI</a> · <a href="W3.html">W3 guided facts</a></nav><footer>Attorney advertising. No representation or outcome guaranteed. Questions concerning representation receive human review.</footer></main>'
    document=f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="{html.escape(v["description"],quote=True)}"><meta http-equiv="Content-Security-Policy" content="{csp}"><title>{html.escape(v["title"])}</title><style>{style}</style></head><body>{body}</body></html>'
    (dest/f'{path}.html').write_text(document)
    inline=body
    for target in ["W1","W2","W3"]:
        inline=inline.replace(f'href="{target}.html"',f'href="#landing-{target}"')
    parts.append(f'<details id="landing-{path}"><summary>{path} landing preview</summary>{inline}</details>')

demo=(root/"review.html").read_text()
demo=demo.replace('href="phillips-mva-full-sprint-review.html"','href="#rendered-assets"')
demo=demo.replace("style-src 'unsafe-inline'; connect-src","img-src data:; media-src data:; style-src 'unsafe-inline'; connect-src")
demo=demo.replace("</style>","details{margin:24px 0;padding:18px;border:1px solid #b5a699}summary{cursor:pointer;font-weight:bold}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.5 monospace}.asset-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:24px}.asset-grid img,.asset-grid video{width:100%;height:auto}video{max-height:680px}details main{padding:20px}details img{max-width:160px}details header{display:flex;align-items:center;gap:24px;flex-wrap:wrap}figure{margin:0}figcaption{font-size:14px}</style>")
files=['manifest.json','meta-build-sheet.csv','google-rsa-review.csv','google-build.json','tiktok-youtube-organic-build.json','native-form-review.json','ai-intake-review.json','tracking-intake-contract.json','landing-variants.json','asset-manifest.json','creative-brief.md','README.md','rendered-assets.json','offline-system-receipt.json']
specs=[]
for f in files:
    demo=demo.replace(f'href="{f}"',f'href="#spec-{f}"')
    specs.append(f'<details id="spec-{f}"><summary>{html.escape(f)}</summary><pre>{html.escape((root/f).read_text())}</pre></details>')
assets=json.loads((root/"rendered-assets.json").read_text())["assets"]
gallery=[]
for a in assets:
    if a["kind"] not in ["still","video"]:continue
    data=base64.b64encode((root/a["file"]).read_bytes()).decode()
    if a["kind"]=="video":
        tag=f'<video controls preload="metadata" aria-label="{a["width"]} by {a["height"]} silent review video"><source src="data:video/mp4;base64,{data}" type="video/mp4"></video>'
    else:
        tag=f'<img src="data:image/jpeg;base64,{data}" alt="{html.escape(a["alt"],quote=True)}">'
    gallery.append(f'<figure>{tag}<figcaption>{a["width"]} × {a["height"]} · rendered review draft · no upload</figcaption></figure>')
extra='<section id="rendered-assets"><h2>Rendered campaign artwork and silent videos</h2><p>Six still formats and three 20-second H.264 motion masters are built. Original logo bytes preserved. No voice/music, live calls or uploads. Placement, brand and attorney approval remain pending.</p><div class="asset-grid">'+''.join(gallery)+'</div></section><section><h2>Isolated landing previews</h2><p>Three complete review HTML variants; frozen production paths untouched.</p>'+''.join(parts)+'</section><section><h2>Embedded build specifications</h2>'+''.join(specs)+'</section>'
demo=demo.replace("</main></html>",extra+"</main></html>")
demo=demo.replace('New Phillips video is still a production brief, not a rendered master.','Three silent Phillips video masters and six artwork formats are now rendered for review.')
demo=demo.replace('The saved three-file replay patch is locally recovered and tested; it is not remotely published or deployed.','Private replay hardening and the default-off offline outcome planner are built and tested. Production bindings and deployments remain held.')
demo=demo.replace('No browser/mobile execution QA performed.','Local browser/mobile QA passed.')
(root/"phillips-mva-full-sprint-review.html").write_text(demo)
print(root/"phillips-mva-full-sprint-review.html")
