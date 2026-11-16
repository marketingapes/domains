"""Offline affiliate inventory, not an approval or profitability oracle.
Inputs are existing public catalogs. No credentials/network calls. Fail-closed
publication requires separately supplied, dated merchant/property evidence.
"""
import argparse, datetime as dt, json, pathlib, urllib.parse
UTC=dt.timezone.utc

def timestamp(value):
    try:
        d=dt.datetime.fromisoformat(value.replace('Z','+00:00'))
        return d.astimezone(UTC) if d.tzinfo else None
    except (ValueError,AttributeError): return None

def safe_url(value):
    try:
        p=urllib.parse.urlsplit(value)
        return p.scheme=='https' and bool(p.hostname) and not p.username and not p.password
    except ValueError: return False

def eligibility(row, approvals, now):
    reasons=[]
    a=approvals.get(row['key'],{})
    checked=timestamp(a.get('verified_at'))
    if not (a.get('status')=='approved' and a.get('property')==row['property']
            and a.get('evidence_ref') and checked and dt.timedelta(0)<=now-checked<=dt.timedelta(days=7)):
        reasons.append('current_merchant_property_approval_missing')
    if not safe_url(row['affiliate_url']): reasons.append('invalid_https_link')
    for field in ('starts_at','ends_at'):
        if row[field] and not timestamp(row[field]): reasons.append('invalid_'+field)
    start,end=timestamp(row['starts_at']),timestamp(row['ends_at'])
    if start and start>now: reasons.append('not_started')
    if end and end<=now: reasons.append('expired')
    seen=timestamp(row['source_checked_at'])
    if not seen or not dt.timedelta(0)<=now-seen<=dt.timedelta(hours=24): reasons.append('stale_source')
    if row['availability'] is False: reasons.append('unavailable')
    return reasons

def build(ddm,fplb,approvals,now):
    rows=[]
    for source,items,property_,path in [(ddm,ddm.get('deals',[]),'discountdealme.com','ddm/data/deals.json'),
                                      (fplb,fplb.get('products',[]),'forpetslikeblue.com','fplb/data/gifts.json')]:
        for item in items:
            key=property_+':'+item['id']
            row={'key':key,'source_id':item['id'],'property':property_,
                 'network':item.get('network','unknown'),'merchant':item.get('merchant',''),
                 'title':item.get('title',item.get('name','')),'affiliate_url':item.get('url',''),
                 'source_path':path,'source_checked_at':source.get('checked_at'),
                 'record_type':'merchant_promotion' if property_=='discountdealme.com' else 'product_or_collection',
                 'category':item.get('category','Pets'),'tags':item.get('tags',item.get('gift_for',[])),
                 'starts_at':item.get('starts'),'ends_at':item.get('ends'),
                 'availability':item.get('available'),
                 'price':None, # source catalog timestamp is not price verification evidence
                 'price_display':'See current merchant price',
                 'commission':None,'confirmed_revenue':None,'profit':None,
                 'approval_status':approvals.get(key,{}).get('status','unverified'),
                 'promotion_text':item.get('network_terms','')}
            reasons=eligibility(row,approvals,now)
            row['publication_eligible']=not reasons
            row['hold_reasons']=reasons
            rows.append(row)
    keys=[r['key'] for r in rows]
    if len(set(keys))!=len(keys): raise ValueError('Duplicate source/property key')
    return {'schema_version':'affiliate-master/v1','built_at':now.isoformat(),
            'mode':'review_inventory','count':len(rows),'eligible_count':sum(r['publication_eligible'] for r in rows),
            'disclosure':'Affiliate links may earn commission. Eligibility does not guarantee commission, price or profit.',
            'offers':rows}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--ddm',required=True);p.add_argument('--fplb',required=True)
    p.add_argument('--approvals');p.add_argument('--output',required=True);p.add_argument('--now')
    a=p.parse_args();now=timestamp(a.now) if a.now else dt.datetime.now(UTC)
    if not now: p.error('now must include timezone')
    approvals=json.loads(pathlib.Path(a.approvals).read_text()) if a.approvals else {}
    result=build(json.loads(pathlib.Path(a.ddm).read_text()),json.loads(pathlib.Path(a.fplb).read_text()),approvals,now)
    target=pathlib.Path(a.output);target.parent.mkdir(parents=True,exist_ok=True)
    temp=target.with_suffix('.tmp');temp.write_text(json.dumps(result,indent=2)+'\n');temp.replace(target)
    print(json.dumps({'count':result['count'],'eligible_count':result['eligible_count']}))
