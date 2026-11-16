"""Pull store codes, offers and product prices for DDM from the affiliate networks.

Usage: python3 coupons_pull.py <out.json>

Sources (all read-only API calls):
  CJ      advertiser-lookup (joined) + link-search for DDM property 101511733 (coupon, sale/discount,
          free shipping) + product search (current price / sale price) for stores that get a page.
  Impact  joined campaigns, each campaign's Deals, and the PromoCodes assigned to this account.
  Awin    joined programmes and active vouchers/promotions. Skipped with a note if the token is refused.

Credentials: CJ_API_TOKEN, CJ_COMPANY_ID, IMPACT_ACCOUNT_SID, IMPACT_AUTH_TOKEN, AWIN_API_TOKEN,
AWIN_PUBLISHER_ID from the environment, or read in-process from the Render env group
(RENDER_API_KEY + RENDER_ENV_GROUP_ID, default affiliate-network-private). Values are never printed,
logged or written to disk; error text is redacted before it is printed. The output holds no EPC,
commission or account identifiers.
"""
import base64, datetime, json, os, re, sys, time, urllib.parse, urllib.request, urllib.error
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
PROPERTY = "101511733"
KEYS = ["CJ_API_TOKEN", "CJ_COMPANY_ID", "IMPACT_ACCOUNT_SID", "IMPACT_AUTH_TOKEN", "AWIN_API_TOKEN", "AWIN_PUBLISHER_ID"]
DROP = {"link-code-html", "link-code-javascript", "seven-day-epc", "three-month-epc", "sale-commission",
        "click-commission", "lead-commission", "ad-content"}
PRODUCTS_PER_STORE = int(os.environ.get("DDM_PRODUCTS_PER_STORE", "60"))
SECRETS = []


def redact(s):
    s = str(s)
    for v in SECRETS:
        if v and len(v) >= 6:
            s = s.replace(v, "<redacted>")
    return re.sub(r"\(\.\.\.[^)]*\)", "(...redacted)", s)


def creds():
    env = {k: os.environ[k] for k in KEYS if os.environ.get(k)}
    if len(env) < len(KEYS):
        key = os.environ.get("RENDER_API_KEY")
        grp = os.environ.get("RENDER_ENV_GROUP_ID", "evg-db27t9vlot8c73e6l2cg")
        if not key:
            sys.exit("Set the network keys, or RENDER_API_KEY (+ RENDER_ENV_GROUP_ID).")
        req = urllib.request.Request(f"https://api.render.com/v1/env-groups/{grp}",
                                     headers={"Authorization": "Bearer " + key, "Accept": "application/json"})
        for z in json.loads(urllib.request.urlopen(req, timeout=60).read()).get("envVars", []):
            z = z.get("envVar", z)
            if z.get("key") in KEYS and z.get("key") not in env:
                env[z["key"]] = z["value"]
    SECRETS.extend(v for k, v in env.items() if k.endswith(("TOKEN", "SID")))
    return env


def http(url, headers, data=None, timeout=90):
    req = urllib.request.Request(url, data=data, headers=headers)
    for attempt in range(3):
        try:
            return urllib.request.urlopen(req, timeout=timeout).read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 2:
                time.sleep(3 * (attempt + 1)); continue
            raise


# ---------------------------------------------------------------- CJ
def cj(env, policy):
    H = {"Authorization": "Bearer " + env["CJ_API_TOKEN"]}
    advs = []
    for page in range(1, 20):
        q = urllib.parse.urlencode({"requestor-cid": env["CJ_COMPANY_ID"], "advertiser-ids": "joined",
                                    "records-per-page": "100", "page-number": page})
        x = ET.fromstring(http("https://advertiser-lookup.api.cj.com/v2/advertiser-lookup?" + q, H))
        rows = x.findall(".//advertiser")
        for a in rows:
            d = {c.tag: (c.text or "").strip() for c in a}
            cat = a.find("primary-category")
            advs.append({"id": d.get("advertiser-id"), "name": d.get("advertiser-name"), "url": d.get("program-url"),
                         "status": d.get("account-status"), "relationship": d.get("relationship-status"),
                         "category": (cat.findtext("child") or cat.findtext("parent") or "").strip() if cat is not None else ""})
        if len(rows) < 100:
            break
    links = []
    for pt in ["coupon", "sale/discount", "free shipping"]:
        for page in range(1, 80):
            q = urllib.parse.urlencode({"website-id": PROPERTY, "advertiser-ids": "joined", "promotion-type": pt,
                                        "records-per-page": "100", "page-number": page})
            x = ET.fromstring(http("https://link-search.api.cj.com/v2/link-search?" + q, H))
            ls = x.findall(".//link")
            for l in ls:
                links.append({ch.tag: (ch.text or "").strip() for ch in l if ch.tag not in DROP})
            if len(ls) < 100:
                break
    # Text links with no promotion type: used only as a plain store link when a store has nothing else.
    for page in range(1, 40):
        q = urllib.parse.urlencode({"website-id": PROPERTY, "advertiser-ids": "joined", "link-type": "Text Link",
                                    "records-per-page": "100", "page-number": page})
        x = ET.fromstring(http("https://link-search.api.cj.com/v2/link-search?" + q, H))
        ls = x.findall(".//link")
        for l in ls:
            r = {ch.tag: (ch.text or "").strip() for ch in l if ch.tag not in DROP}
            if not r.get("promotion-type"):
                r["_store_link_only"] = True
                links.append(r)
        if len(ls) < 100:
            break
    seen, uniq = set(), []
    for r in links:
        if r["link-id"] in seen:
            continue
        seen.add(r["link-id"]); uniq.append(r)
    # Products (current price + sale price) for stores with links on this property that are not excluded.
    excluded = {x["name"] for x in policy["exclude"] if x["network"] == "CJ"}
    want = sorted({r["advertiser-id"] for r in uniq if r.get("advertiser-name") not in excluded})
    products, perrs = [], []
    GH = dict(H, **{"Content-Type": "application/json"})
    for a in want:
        q = ('{ products(companyId: "%s", partnerIds: ["%s"], limit: %d) { resultList { id title brand link imageLink '
             'advertiserId advertiserName price { amount currency } salePrice { amount currency } '
             'linkCode(pid: "%s") { clickUrl } } } }') % (env["CJ_COMPANY_ID"], a, PRODUCTS_PER_STORE, PROPERTY)
        try:
            r = json.loads(http("https://ads.api.cj.com/query", GH, data=json.dumps({"query": q}).encode()))
        except Exception as e:
            perrs.append(f"{a}: {redact(e)}"); continue
        if r.get("errors"):
            perrs.append(f"{a}: {redact(r['errors'][0].get('message', ''))[:160]}")
        for p in (((r.get("data") or {}).get("products") or {}).get("resultList") or []):
            price = (p.get("price") or {})
            sale = (p.get("salePrice") or {})
            products.append({"network": "CJ", "advertiser_id": str(p.get("advertiserId") or a), "advertiser": p.get("advertiserName"),
                             "id": p.get("id"), "title": (p.get("title") or "").strip(), "brand": p.get("brand") or "",
                             "link": p.get("link") or "", "image": p.get("imageLink") or "",
                             "click_url": ((p.get("linkCode") or {}).get("clickUrl") or ""),
                             "price": price.get("amount"), "sale_price": sale.get("amount"),
                             "currency": price.get("currency") or sale.get("currency") or "USD"})
    return {"website_id": PROPERTY, "advertisers": advs, "links": uniq, "products": products, "product_errors": perrs}


# ---------------------------------------------------------------- Impact
def impact(env):
    sid = env["IMPACT_ACCOUNT_SID"]
    auth = "Basic " + base64.b64encode(f"{sid}:{env['IMPACT_AUTH_TOKEN']}".encode()).decode()
    H = {"Authorization": auth, "Accept": "application/json"}
    base = f"https://api.impact.com/Mediapartners/{sid}"
    clean = lambda o: json.loads(json.dumps(o).replace(sid, "ACCOUNT"))
    out = {"campaigns": [], "deals": [], "promo_codes": [], "errors": []}
    camps = json.loads(http(base + "/Campaigns?PageSize=500", H)).get("Campaigns", [])
    for c in camps:
        out["campaigns"].append({"id": c["CampaignId"], "name": c.get("CampaignName"), "advertiser": c.get("AdvertiserName"),
                                 "url": c.get("AdvertiserUrl") or c.get("CampaignUrl"), "status": c.get("ContractStatus"),
                                 "tracking_link": c.get("TrackingLink") or "", "shipping_regions": c.get("ShippingRegions") or [],
                                 "description": (c.get("CampaignDescription") or "").strip()})
        if c.get("ContractStatus") != "Active":
            continue
        try:
            for d in json.loads(http(f"{base}/Campaigns/{c['CampaignId']}/Deals?PageSize=500", H)).get("Deals", []):
                d = clean(d); d.pop("Uri", None)
                out["deals"].append(d)
        except Exception as e:
            out["errors"].append(f"deals {c['CampaignId']}: {redact(e)}")
    try:
        for p in json.loads(http(base + "/PromoCodes?PageSize=500", H)).get("PromoCodes", []):
            p = clean(p)
            out["promo_codes"].append({"code": p.get("Code"), "state": p.get("State"), "campaign_id": str((p.get("Program") or {}).get("Id")),
                                       "deal_id": str((p.get("Deal") or {}).get("Id")), "deal_name": (p.get("Deal") or {}).get("Name"),
                                       "created": p.get("CreatedDate")})
    except Exception as e:
        out["errors"].append(f"promo codes: {redact(e)}")
    return out


# ---------------------------------------------------------------- Awin
def awin(env):
    pid = env["AWIN_PUBLISHER_ID"].strip()
    H = {"Authorization": "Bearer " + env["AWIN_API_TOKEN"].strip(), "Accept": "application/json", "Content-Type": "application/json"}
    out = {"status": "ok", "programmes": [], "promotions": []}
    try:
        progs = json.loads(http(f"https://api.awin.com/publishers/{pid}/programmes?relationship=joined", H))
        out["programmes"] = [{"id": str(p.get("id")), "name": p.get("name"), "url": p.get("displayUrl"),
                              "region": (p.get("primaryRegion") or {}).get("countryCode")} for p in progs]
        page = 1
        while True:
            body = {"filters": {"membership": "joined", "status": "active", "regionCodes": ["US"]}, "pagination": {"page": page, "pageSize": 200}}
            r = json.loads(http(f"https://api.awin.com/publisher/{pid}/promotions", H, data=json.dumps(body).encode()))
            for p in r.get("data", []):
                out["promotions"].append({k: p.get(k) for k in ("promotionId", "type", "title", "description", "terms", "startDate",
                                                                "endDate", "url", "urlTracking", "voucher", "advertiser", "regions")})
            if len(r.get("data", [])) < 200:
                break
            page += 1
    except urllib.error.HTTPError as e:
        out["status"] = f"skipped: Awin API returned HTTP {e.code} (token refused or expired)"
    except Exception as e:
        out["status"] = f"skipped: {redact(e)[:200]}"
    return out


def main(out_path):
    env = creds()
    policy = json.load(open(os.path.join(HERE, "coupons_policy.json")))
    started = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    data = {"pulled_at_utc": started}
    for name, fn in (("cj", lambda: cj(env, policy)), ("impact", lambda: impact(env)), ("awin", lambda: awin(env))):
        try:
            data[name] = fn()
        except Exception as e:
            data[name] = {"status": f"failed: {redact(e)[:200]}"}
    raw = json.dumps(data, indent=1, ensure_ascii=False)
    for v in SECRETS:
        assert not v or v not in raw, "a credential leaked into the pull output"
    open(out_path, "w").write(raw)
    c, i, a = data.get("cj", {}), data.get("impact", {}), data.get("awin", {})
    print(f"CJ: {len(c.get('advertisers', []))} joined advertisers, {len(c.get('links', []))} links, {len(c.get('products', []))} products"
          f"{' (' + str(len(c.get('product_errors', []))) + ' product errors)' if c.get('product_errors') else ''}")
    print(f"Impact: {len(i.get('campaigns', []))} campaigns, {len(i.get('deals', []))} deals, {len(i.get('promo_codes', []))} promo codes"
          f"{', errors: ' + str(len(i.get('errors', []))) if i.get('errors') else ''}")
    print(f"Awin: {a.get('status')}, {len(a.get('programmes', []))} programmes, {len(a.get('promotions', []))} promotions")


if __name__ == "__main__":
    main(sys.argv[1])
