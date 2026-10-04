"""Offline private-source -> minimized review and owner-only local viewer.
No network, dispatch or public full-record output. Pass exact private source/hash.
"""
import argparse,hashlib,json,pathlib,os,re,html,tempfile
ap=argparse.ArgumentParser();ap.add_argument('source',type=pathlib.Path);ap.add_argument('--sha256',required=True);ap.add_argument('--safe-output',required=True,type=pathlib.Path);ap.add_argument('--private-viewer',required=True,type=pathlib.Path);args=ap.parse_args()
raw=args.source.read_bytes();assert hashlib.sha256(raw).hexdigest()==args.sha256,'Private source hash mismatch'
x=json.loads(raw);assert x['summary']['coverage_complete'] is False
rows=x['dispatch_events'];assert len(rows)==135 and len(x['firm_intakes'])==384
# Full record output must stay outside every Git checkout, owner-only.
private=args.private_viewer.resolve()
assert private.is_relative_to(pathlib.Path(tempfile.gettempdir()).resolve()),'Private viewer must use non-synced system temporary storage, not workspace/cloud directories'
assert not any((p/'.git').exists() for p in [private.parent,*private.parents]),'Private output cannot be in Git'
private.parent.mkdir(parents=True,exist_ok=True);os.chmod(private.parent,0o700)
def stamp(v):
 if not v:return None
 assert isinstance(v,str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?',v),'Unrecognized timestamp; hold for source review'
 return v
statuses={'Turned Down','Contacted','Chasing','Converted'}
public=[]
for i,r in enumerate(rows):
 assert r['dispatch_channel'] in {'api','email'},'Unexpected channel field; hold for review'
 campaign=r['campaign_scope'];assert campaign in {'mva','la','ca_juvenile_detention'}
 received=stamp(r.get('received_at'));sent=stamp(r.get('dispatch_at_local') or r.get('dispatch_at') or r.get('sent_at'))
 public.append({'display_id':f'HISTORY-{i+1:03d}','campaign':campaign,'received_at':received,'received_semantics':'Source-recorded receipt timestamp' if received else 'Not recorded','dispatch_at':sent,'dispatch_timezone_basis':'Source local; timezone inferred from workbook' if r.get('dispatch_at_local') else 'UTC timestamp' if sent else 'Not recorded','channel':r['dispatch_channel'],'dispatch_state':'Source-logged API success' if r['dispatch_channel']=='api' else 'Recorded sent email','firm_match':'Explicit current-report crosswalk' if r.get('firm_match_status')=='matched_current_report' else 'Unmatched / candidate only','firm_status':r.get('external_outcome') if r.get('external_outcome') in statuses else 'Unknown','signed':'Not verified','test_flag':r.get('test_flag') is True,'duplicate_flag':r.get('duplicate_flag') is True,'repeated_source_dispatch':r.get('repeat_source_lead_dispatch') is True,'creative_attribution':'Historical campaign reference only; individual attribution unavailable'})
assert sum(r['dispatch_at'] is not None for r in public)==97
assert sum(r['firm_match']=='Explicit current-report crosswalk' for r in public)==96
safe={'schema':'phillips.deidentified-dispatch-history/v1','mode':'DEIDENTIFIED_HISTORICAL_REVIEW','coverage':'INCOMPLETE','private_source_sha256':args.sha256,'private_bytes_verified_locally':True,'received_timestamp_rows':sum(r['received_at'] is not None for r in public),'dispatch_timestamp_rows':97,'dispatch_evidence_events':135,'unique_people_total':None,'actual_signed_total':None,'current_campaign_totals':False,'outbound_enabled':False,'rows':public}
args.safe_output.write_text(json.dumps(safe,indent=2)+'\n')
# This file deliberately contains private records; never upload it to Library/Git.
sections=[]
labels={'dispatch_events':'Dispatch evidence ·135 events, not unique people','firm_intakes':'Separate firm report ·384 intakes; not all sent by Kyle','exceptions':'Data quality ·77 exceptions','transfer_notifications':'Excluded transfer notifications ·28 source claims, unverified'}
for k,label in labels.items():
 records=x[k];cards=[]
 for i,r in enumerate(records):
  # Source is already minimized; retain exact timestamps/status/flags/provenance privately.
  cards.append('<details><summary>'+html.escape(f'{i+1:03d} · '+str(r.get('name') or r.get('type') or 'Record'))+' </summary><pre>'+html.escape(json.dumps(r,indent=2,ensure_ascii=False))+'</pre></details>')
 sections.append('<section id="'+k+'"><h2>'+html.escape(label)+'</h2>'+''.join(cards)+'</section>')
nav=''.join('<a href="#'+k+'">'+html.escape(k.replace('_',' '))+'</a>' for k in labels)
page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'"><title>Phillips private historical records</title><style>*{box-sizing:border-box;overflow-wrap:anywhere}body{font:16px system-ui;margin:0;background:#f4f6fb;color:#17203c}main{max-width:1100px;margin:auto;padding:28px}section{background:white;border:1px solid #dce1ec;border-radius:16px;padding:24px;margin:24px 0}nav{display:flex;gap:16px;flex-wrap:wrap}a{color:#4935a3}details{border-top:1px solid #dce1ec;padding:14px 0}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px ui-monospace;line-height:1.6}.notice{background:#fff2d4;padding:18px;border-radius:12px}</style></head><body><main><h1>Phillips private historical records</h1><p class="notice">OWNER-PRIVATE LOCAL VIEW · Contains contact identifiers. Keep this local file private; do not upload, deploy or share. No live connection or actions. Coverage is incomplete. Recorded sent/API-success events are not firm receipt, unique people, accepted matters or Signed. Converted and retainer-sent are not executed-retainer proof.</p><p>Source hash verified: HASH. Latest firm report October4,2026. Firm-created dates May12–September23 are separate from lead received and dispatch dates. Unknown dates remain unknown; candidate-only phone matching is not an identity join. 28 transfer notifications stay excluded.</p>NAVSECTIONS</main></body></html>'''.replace('HASH',args.sha256).replace('NAV',nav).replace('SECTIONS',''.join(sections))
private.write_text(page);os.chmod(private,0o600)
print(json.dumps({'private_hash_verified':True,'safe_rows':len(public),'dated_dispatch_rows':97,'received_timestamp_rows':safe['received_timestamp_rows'],'firm_crosswalk_rows':96,'private_viewer_sections':{k:len(x[k]) for k in labels},'private_mode':oct(private.stat().st_mode&0o777),'private_directory_mode':oct(private.parent.stat().st_mode&0o777)}))
