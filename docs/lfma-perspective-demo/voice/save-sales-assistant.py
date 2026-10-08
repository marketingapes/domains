"""Save the authorized isolated assistant; no calls, bindings or credential writes."""
import pathlib,json,urllib.request,urllib.error,datetime,hashlib
root=pathlib.Path(__file__).parent
keys={}
for line in pathlib.Path('/Users/kylegosselin/.phillips5.env').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        k,v=line.split('=',1);keys[k]=v.strip().strip('"').strip("'")
headers={'Authorization':'Bearer '+keys['VAPI_API_KEY'],'Content-Type':'application/json','User-Agent':'curl/8.7.1'}
def request(path,method='GET',payload=None):
    data=json.dumps(payload).encode() if payload is not None else None
    with urllib.request.urlopen(urllib.request.Request('https://api.vapi.ai/'+path,headers=headers,data=data,method=method),timeout=30) as response:
        return response.status,json.load(response)
def phone_bindings():
    _,rows=request('phone-number?limit=200')
    return {r['id']:{k:r.get(k) for k in ['number','assistantId','squadId','updatedAt']} for r in rows}
payload=json.loads((root/'sales-assistant.draft.json').read_text())
assert len(payload['name'])<=40
assert payload['model']['tools']==[{'type':'endCall'}]
assert not payload.get('credentials') and not payload.get('server')
assert payload['artifactPlan']['recordingEnabled'] is False
receipt={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'callsPlaced':False,'routingChanged':False,'credentialsAdded':False,'webConnected':False}
try:
    before=phone_bindings()
    status,rows=request('assistant?limit=200')
    existing=[r for r in rows if r.get('name')==payload['name']]
    if existing:
        if len(existing)!=1 or existing[0].get('model',{}).get('messages')!=payload['model']['messages']:
            raise RuntimeError('Existing named assistant differs; no overwrite or duplicate created')
        saved=existing[0];receipt['createStatus']='reused identical existing saved assistant'
    else:
        status,saved=request('assistant','POST',payload)
        if status!=201:raise RuntimeError('Create did not return201')
        receipt['createStatus']=status
    receipt['assistantId']=saved['id']
    _,readback=request('assistant/'+saved['id'])
    checks={'name':readback.get('name')==payload['name'],'model':all(readback.get('model',{}).get(k)==payload['model'][k] for k in ['provider','model','messages']),'voice':all(readback.get('voice',{}).get(k)==v for k,v in payload['voice'].items()),'transcriber':all(readback.get('transcriber',{}).get(k)==v for k,v in payload['transcriber'].items()),'nativeEndCallOnly':[t.get('type') for t in readback.get('model',{}).get('tools',[])]==['endCall'],'noExternalToolIds':not readback.get('model',{}).get('toolIds'),'noExternalServer':not readback.get('server'),'serverMessagesDisabled':readback.get('serverMessages')==[],'recordingOff':readback.get('artifactPlan',{}).get('recordingEnabled') is False,'transcriptOff':readback.get('artifactPlan',{}).get('transcriptPlan',{}).get('enabled') is False,'phoneBindingsUnchanged':before==phone_bindings(),'notBound':all(p.get('assistantId')!=saved['id'] for p in before.values())}
    receipt.update({'name':readback['name'],'verifiedByGet':True,'checks':checks,'promptSha256':hashlib.sha256(payload['model']['messages'][0]['content'].encode()).hexdigest(),'result':'PASS' if all(checks.values()) else 'VERIFY REQUIRED'})
    (root/'saved-assistant-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt,indent=2))
except urllib.error.HTTPError as error:
    receipt.update({'result':'BLOCKED','httpStatus':error.code,'action':'assistant save or readback'})
    if error.code==400:
        body=error.read().decode();receipt['validationError']=body[:2000]
    (root/'saved-assistant-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2));raise SystemExit(1)
except Exception as error:
    receipt.update({'result':'BLOCKED','error':str(error)[:250]});(root/'saved-assistant-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2));raise SystemExit(1)
