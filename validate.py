#!/usr/bin/env python3
"""marketingapes.domain.foundation/v1.2 validator.

FOUNDATION-DECLARED : deterministic manifest exists and parses.
FOUNDATION-CLEAN    : no campaign/runtime state, no undeclared cross-tenant identity sharing,
                      every unknown explicitly MISSING/NEEDS_AUTH/NOT_APPLICABLE,
                      no impossible activation, typed identifiers well-formed.
CONTRACT-COVERAGE   : every required capability category present for every tenant.
Missing capabilities do NOT fail CLEAN."""
import json, glob, re, sys

SCHEMA="marketingapes.domain.foundation/v1.2"
# The portfolio is a closed set. Not a count - a set. A validator that reports
# "13/14" and exits 0 has not validated anything; it has described a hole.
CANON=("BTL","NIL","DIHAC","LFMA","MA","KG","SLIQ","CGG","DDM","FPLB","PX","RI","TNT","TOSS")
CANONSET=frozenset(CANON)
CONN={"VERIFIED","CURRENT","MISSING","NEEDS_AUTH","NOT_APPLICABLE"}
ACT={"ON","OFF","NOT_APPLICABLE"}
ABSENT={"MISSING","NEEDS_AUTH","NOT_APPLICABLE"}

# (B) campaign / job / runtime keys never belong in a permanent domain manifest.
# Structural rejection lives in the schema (additionalProperties:false); this is defence in depth.
# Keys only - never scanned inside free-text notes.
FORBIDDEN={"campaign_id","campaignId","campaigns","active_campaign","campaign_studio",
           "lead_lane","buyer","buyer_id","offer","budget","routing","route"}

# contract coverage - the locked Universal Domain MCP surface
REQUIRED={
 "hostname":["intended_canonical_hostname","intended_hosting","current_hosting_state"],
 "web":["site","render","dns"],
 "communications":["email_human","email_transactional","email_bulk","phone","sms","voice","vapi"],
 "social":["facebook","instagram","tiktok","youtube","linkedin","x","threads","pinterest","other"],
 "paid_media":["meta_ad_account","meta_dataset","google_ads","tiktok_ads","other"],
 "measurement":["ga4_property","ga4_measurement","gtm_web","gtm_server","search_console","bigquery","canonical_events"],
 "data":["drive","github","bigquery","crm"],
 "automation":["mcp","render_control","make","webhooks"],
 "commerce":["processor"],
 "intake":["forms","shared_lane"],
 "safety":["consent","suppression","production_gates","kill_switch","secrets_policy"],
}

TYPED={("ga4_property","property_id"):(re.compile(r"^[0-9]{6,12}$"),"numeric GA4 property id"),
       ("ga4_measurement","measurement_id"):(re.compile(r"^G-[A-Z0-9]{6,12}$"),"G-XXXXXXXXXX"),
       ("gtm_web","container_id"):(re.compile(r"^GTM-[A-Z0-9]{4,12}$"),"GTM-XXXXXXX"),
       ("gtm_server","container_id"):(re.compile(r"^GTM-[A-Z0-9]{4,12}$"),"GTM-XXXXXXX")}

# (C) every execution identity where cross-domain borrowing would be dangerous
NS=[("web","dns","cloudflare_zone_id","cloudflare_zone"),
    ("communications","email_human","address","email_human"),
    ("communications","email_transactional","address","email_transactional"),
    ("communications","email_bulk","address","email_bulk"),
    ("communications","phone","e164","phone"),
    ("communications","sms","sms_identity","sms_identity"),
    ("communications","vapi","assistant_id","vapi_assistant"),
    ("social","facebook","page_id","facebook_page"),
    ("social","instagram","account_id","instagram"),
    ("social","tiktok","account_id","tiktok"),
    ("social","youtube","channel_id","youtube"),
    ("social","linkedin","page_id","linkedin"),
    ("social","x","handle","x"),
    ("social","threads","handle","threads"),
    ("social","pinterest","account_id","pinterest"),
    ("paid_media","meta_ad_account","ad_account_id","meta_ad_account"),
    ("paid_media","meta_dataset","dataset_id","meta_dataset"),
    ("paid_media","google_ads","customer_id","google_ads"),
    ("paid_media","tiktok_ads","advertiser_id","tiktok_ads"),
    ("measurement","ga4_property","property_id","ga4_property"),
    ("measurement","ga4_measurement","measurement_id","ga4_measurement"),
    ("measurement","gtm_web","container_id","gtm"),
    ("measurement","gtm_server","container_id","gtm"),
    ("measurement","bigquery","table","bigquery_table"),
    ("data","bigquery","dataset","bigquery_dataset"),
    ("automation","make","scenario_id","make_scenario"),
    ("automation","webhooks","hook_id","make_hook"),
    ("commerce","processor","account_id","commerce_account")]

def forbidden(node,path=""):
    if isinstance(node,dict):
        for k,v in node.items():
            p=f"{path}.{k}" if path else k
            if k in FORBIDDEN: yield p,k
            yield from forbidden(v,p)
    elif isinstance(node,list):
        for i,v in enumerate(node): yield from forbidden(v,f"{path}[{i}]")

def caps(node,path=""):
    if isinstance(node,dict):
        if "connection_status" in node: yield path,node
        for k,v in node.items(): yield from caps(v,f"{path}.{k}" if path else k)
    elif isinstance(node,list):
        for i,v in enumerate(node): yield from caps(v,f"{path}[{i}]")

def claims(o):
    """{ 'namespace:value': (path, capability) } - deduped per tenant."""
    out={}
    for sect,capn,field,ns in NS:
        c=o.get(sect,{}).get(capn,{})
        v=c.get(field) if isinstance(c,dict) else None
        if v: out[f"{ns}:{v}"]=(f"{sect}.{capn}",c)
    out[f"domain:{o['domain_id']}"]=("domain_id",None)
    return out

def load():
    """Parse every manifest ONCE, keyed by file path.

    Never key the collection by tenant_id while building it: a dict comprehension
    over tenant_id silently drops one of two files claiming the same tenant, and the
    validator then reports a clean 14/14 over 15 files. Parse first, then decide."""
    parsed=[]
    for f in sorted(glob.glob("domains/*.json")):
        try: parsed.append((f,json.load(open(f))))
        except Exception as e: return None,[f"{f}: does not parse - {e}"]
    fatal=[]
    byten={}
    for f,o in parsed:
        t=o.get("tenant_id")
        if not t: fatal.append(f"{f}: no tenant_id"); continue
        byten.setdefault(t,[]).append(f)
    # (2) duplicate tenant_id - identify BOTH file paths
    for t,files in sorted(byten.items()):
        if len(files)>1:
            fatal.append(f"duplicate tenant_id {t} claimed by {len(files)} files: "+", ".join(files))
    # (1) exact tenant set - missing, extra, and non-canonical all fail
    found=set(byten)
    for t in sorted(CANONSET-found):
        fatal.append(f"canonical tenant {t} has no manifest")
    for t in sorted(found-CANONSET):
        fatal.append(f"non-canonical tenant {t} present ({', '.join(byten[t])})")
    if fatal: return None,fatal
    return {o["tenant_id"]:o for _,o in parsed},[]

def main():
    objs,fatal=load()
    if fatal:
        print("  TENANT SET / MANIFEST INTEGRITY: FAIL")
        for e in fatal: print("    - "+e)
        print()
        print(f"  schema:               {SCHEMA}")
        print(f"  canonical tenants:    {len(CANON)} required")
        print("  FOUNDATION-DECLARED:  FAIL")
        print("  FOUNDATION-CLEAN:     not evaluated")
        print("  CONTRACT-COVERAGE:    not evaluated")
        return 1
    claimed={}
    for t,o in objs.items():
        for key,(path,c) in claims(o).items():
            claimed.setdefault(key,[]).append((t,path,c))

    results=[]
    for t,o in sorted(objs.items()):
        errs=[]; missing_cat=[]
        if o.get("schema")!=SCHEMA: errs.append(f"schema is {o.get('schema')}, expected {SCHEMA}")
        for p,k in forbidden(o): errs.append(f"campaign/runtime key '{k}' at {p}")
        # CONTRACT COVERAGE
        for sect,keys in REQUIRED.items():
            if sect not in o: missing_cat.append(sect); continue
            for k in keys:
                if k not in o[sect]: missing_cat.append(f"{sect}.{k}")
        cl=list(caps(o))
        for path,c in cl:
            cs,act=c["connection_status"],c["activation_state"]
            if cs not in CONN: errs.append(f"{path}: bad connection_status {cs}")
            if act not in ACT: errs.append(f"{path}: bad activation_state {act}")
            if cs in ("MISSING","NEEDS_AUTH") and act=="ON":
                errs.append(f"{path}: connection_status={cs} but activation_state=ON")
            name=path.split(".")[-1]
            for (cn,fld),(rx,human) in TYPED.items():
                if name==cn and c.get(fld) is not None and not rx.match(str(c[fld])):
                    errs.append(f"{path}.{fld}='{c[fld]}' is not {human}")
            ids=[v for k,v in c.items() if k not in
                 ("connection_status","activation_state","note","policy","owner_tenant_id",
                  "shared_with","rule","covers","gates","contract","health","debt")]
            if ids and any(v is None for v in ids) and cs not in ABSENT:
                errs.append(f"{path}: null identifier but connection_status={cs}")
        # (A) generic ownership / sharing across ALL identity-bearing capabilities
        for key,(path,c) in claims(o).items():
            owners=claimed[key]
            if c is None: continue
            # (3) phantom shared_with. Runs on EVERY identity, including one this
            # tenant uniquely claims - a share that no one on the other end claims
            # is a fiction, and a unique identity is exactly where it hides.
            for x in (c.get("shared_with") or []):
                if x not in CANONSET:
                    errs.append(f"{path} {key}: shared_with names {x}, not one of the canonical 14")
                    continue
                xo=objs.get(x)
                xc=claims(xo).get(key) if xo else None
                if xc is None:
                    errs.append(f"{path} {key}: phantom share - {x} does not claim this identity")
                    continue
                xcap=xc[1]
                if xcap is None: continue
                if xcap.get("owner_tenant_id")!=c.get("owner_tenant_id"):
                    errs.append(f"{path} {key}: {x} claims it but names owner "
                                f"{xcap.get('owner_tenant_id')}, not {c.get('owner_tenant_id')}")
            declared=c.get("owner_tenant_id")
            if declared and declared!=t and not any(ot==declared for ot,_,_ in owners):
                errs.append(f"{path} {key}: declares owner {declared} which does not claim it")
            if len(owners)>1:
                decl={oc.get("owner_tenant_id") for _,_,oc in owners if oc is not None}
                if len(decl)!=1:
                    errs.append(f"{path} {key}: shared by {[x[0] for x in owners]} with inconsistent owner {sorted(x for x in decl if x)}")
                    continue
                owner=decl.pop()
                oc=next((oc for ot,_,oc in owners if ot==owner and oc is not None),None)
                if oc is None:
                    errs.append(f"{path} {key}: declared owner {owner} does not claim it")
                else:
                    others=sorted({ot for ot,_,_ in owners if ot!=owner})
                    if sorted(oc.get("shared_with") or [])!=others:
                        errs.append(f"{path} {key}: owner {owner} shared_with={oc.get('shared_with')} does not match claimants {others}")
        if o["shared_infrastructure"]["canonical_control_plane"]!="Evolution Engine / Universal Domain MCP":
            errs.append("canonical control plane not declared")
        results.append((t,len(cl),errs,missing_cat))

    print(f"  {'TEN':<6}{'CAPS':<6}{'DECL':<7}{'CLEAN':<8}{'COVER':<8}ERRORS")
    print("  "+"-"*84)
    for t,n,errs,mc in results:
        print(f"  {t:<6}{n:<6}{'PASS':<7}{'PASS' if not errs else 'FAIL':<8}"
              f"{'PASS' if not mc else 'FAIL':<8}{'; '.join(errs) if errs else ('missing: '+', '.join(mc) if mc else '-')}")
    clean=sum(1 for _,_,e,_ in results if not e); cover=sum(1 for _,_,_,m in results if not m)
    print()
    print(f"  schema:               {SCHEMA}")
    print(f"  tenant set:           EXACT ({len(CANON)}/{len(CANON)} canonical, 0 extra)")
    print(f"  FOUNDATION-DECLARED:  {len(results)}/14")
    print(f"  FOUNDATION-CLEAN:     {clean}/14")
    print(f"  CONTRACT-COVERAGE:    {cover}/14")
    print(f"  capability leaves:    {results[0][1]} per object | {sum(r[1] for r in results)} total")
    print(f"  identity namespaces:  {len(sorted(set(n for *_,n in NS)))+1}")
    return 0 if (clean==len(CANON) and cover==len(CANON) and len(results)==len(CANON)) else 1

if __name__=="__main__": sys.exit(main())
