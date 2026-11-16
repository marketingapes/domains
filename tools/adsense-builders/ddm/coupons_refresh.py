"""Turn a coupons_pull.py snapshot into coupons_feed.json and extend price_history.json.

Usage: python3 coupons_refresh.py <pull.json> [--price-log DIR]

Rules (the only way a code or offer reaches the site):
  * Codes come only from a network code field: CJ `coupon-code`, Impact `DefaultPromoCode` or an Impact
    PromoCode record, Awin `voucher.code`. Nothing is typed by hand.
  * Records that ended before the pull are dropped. Records that start within 21 days are kept as
    "upcoming" and shown with their start date; later ones wait for a future pull.
  * A record with no end date is dropped if the network last updated it over a year ago, or if its own
    name names a season or event that is already over (policy `stale_words`).
  * coupons_policy.json can remove stores or records and set display names. It cannot add anything.
  * No EPC, commission or account identifiers are written.

Price history: every pull adds one observation per product (CJ product search price and sale price) to
price_history.json as runs [first_seen, last_seen, price, sale_price]. --price-log (or DDM_PRICE_LOG) points
at a directory outside the repo that keeps a copy, so days recorded on unmerged refresh branches are not lost.
"""
import datetime, json, os, re, sys, unicodedata
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
PROPERTY = "101511733"
SID = "ddm-coupons"
UPCOMING_DAYS = 21
STALE_DAYS = 365
OFFERS_PER_STORE = 12
HISTORY_KEEP_DAYS = 400
CJ_HOSTS = ("dpbolvw.net", "jdoqocy.com", "tkqlhce.com", "anrdoezrs.net", "kqzyfj.com")


def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower().replace("&", " and ").replace("'", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def z(dt):
    return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def cj_time(s):
    # Same convention as refresh_deals.py: CJ link-search times are treated as UTC.
    s = (s or "").strip()
    if not s or s == "null":
        return ""
    return datetime.datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S").strftime("%Y-%m-%dT%H:%M:%SZ")


def iso_time(s):
    s = (s or "").strip()
    if not s:
        return ""
    try:
        return z(datetime.datetime.fromisoformat(s.replace("Z", "+00:00")))
    except ValueError:
        return ""


def tracked(url, key, value):
    if not url:
        return ""
    return url + ("&" if "?" in url else "?") + f"{key}={value}"


def clean(s):
    return " ".join(re.sub(r"<[^>]+>", " ", s or "").split())


CODE_IN_TEXT = re.compile(r"\bcode\b\s*[:\-]?\s*[\"“'\[]?([A-Za-z0-9]{4,})", re.I)


def code_conflict(code, *texts):
    """True when the store's own text names a different code than the code field."""
    named = {m.group(1).upper() for t in texts for m in CODE_IN_TEXT.finditer(t or "")}
    named -= {"FIELD", "OFFER", "ORDER", "NEEDED", "REQUIRED", "WHEN", "WITH", "WILL", "ONLY", "SITEWIDE", "BELOW", "ABOVE", "THIS", "FROM"}
    return bool(code) and bool(named) and code.upper() not in named


class Window:
    def __init__(self, checked_at):
        self.now = checked_at
        dt = datetime.datetime.fromisoformat(checked_at.replace("Z", "+00:00"))
        self.horizon = z(dt + datetime.timedelta(days=UPCOMING_DAYS))
        self.stale_before = dt - datetime.timedelta(days=STALE_DAYS)

    def state(self, starts, ends):
        if ends and ends <= self.now:
            return None
        if starts and starts > self.now:
            return "upcoming" if starts <= self.horizon else None
        return "live"


def main(pull_path, price_log=None):
    pull = json.load(open(pull_path))
    policy = json.load(open(os.path.join(HERE, "coupons_policy.json")))
    checked_at = pull["pulled_at_utc"].replace("+00:00", "Z")
    W = Window(checked_at)
    stale_re = re.compile(policy["stale_words"], re.I)
    region_re = re.compile(policy.get("region_words") or r"(?!x)x")
    dated_stale_re = re.compile(policy.get("dated_stale_words") or r"(?!x)x", re.I)
    excl = {(x["network"], x["name"]) for x in policy["exclude"]}
    names = policy["display_names"]
    hides = policy["hide_records"]
    stores, notes = {}, []

    def store(network, adv_id, raw_name, url, category=""):
        name = names.get(raw_name, raw_name).strip()
        slug = slugify(name)
        s = stores.setdefault(slug, {"slug": slug, "name": name, "networks": [], "url": "", "category": category,
                                     "store_link": "", "store_link_network": "", "records": [], "advertiser_names": []})
        if raw_name.strip() not in s["advertiser_names"]:
            s["advertiser_names"].append(raw_name.strip())
        if not any(n["network"] == network and n["advertiser_id"] == adv_id for n in s["networks"]):
            s["networks"].append({"network": network, "advertiser_id": adv_id})
        if url and not s["url"]:
            s["url"] = url
        if category and not s["category"]:
            s["category"] = category
        return s

    def hidden(network, campaign, *texts):
        for h in hides:
            if h["network"] == network and h["campaign"] == campaign and any(h["match"] == t for t in texts if t):
                return h["reason"]
        return None

    # ---------------- CJ
    cj = pull.get("cj") or {}
    advs = {a["id"]: a for a in cj.get("advertisers", [])}
    for r in cj.get("links", []):
        raw = r.get("advertiser-name", "").strip()
        if ("CJ", raw) in excl or r.get("relationship-status") != "joined":
            continue
        assert f"-{PROPERTY}-" in r["clickUrl"] and urlparse(r["clickUrl"]).hostname.split(".", 1)[-1] in CJ_HOSTS, r["clickUrl"]
        a = advs.get(r["advertiser-id"], {})
        s = store("CJ", r["advertiser-id"], raw, a.get("url", ""), a.get("category", ""))
        link = tracked(r["clickUrl"], "sid", SID)
        if r.get("_store_link_only") or not r.get("promotion-type"):
            if not s["store_link"]:
                s["store_link"], s["store_link_network"] = link, "CJ"
            continue
        starts, ends = cj_time(r.get("promotion-start-date")), cj_time(r.get("promotion-end-date"))
        st = W.state(starts, ends)
        title = clean(r.get("link-name"))
        if not st:
            continue
        countries = (r.get("targeted-countries") or "").strip()
        if countries and countries != "null" and "US" not in countries.upper().replace(",", " ").split():
            notes.append(f"CJ {raw}: dropped '{title[:60]}' (targeted at {countries}, not the US)"); continue
        if region_re.search(title + " " + (r.get("description") or "")):
            notes.append(f"CJ {raw}: dropped '{title[:60]}' (says it is for another region)"); continue
        why = hidden("CJ", raw, clean(r.get("coupon-code")), title)
        if why:
            notes.append(f"CJ {raw}: hid '{title[:50]}' ({why})"); continue
        if code_conflict(clean(r.get("coupon-code")), title, r.get("description")):
            notes.append(f"CJ {raw}: dropped '{title[:50]}' (text names a different code than the code field)"); continue
        if ends and dated_stale_re.search(title + " " + (r.get("description") or "")):
            notes.append(f"CJ {raw}: dropped '{title[:50]}' (names a season or event that is over)"); continue
        if not ends:
            try:
                upd = datetime.datetime.strptime(r.get("last-updated", ""), "%a %b %d %H:%M:%S UTC %Y").replace(tzinfo=datetime.timezone.utc)
            except ValueError:
                upd = None
            if upd and upd < W.stale_before:
                notes.append(f"CJ {raw}: dropped '{title[:60]}' (no end date, not updated since {upd:%Y-%m-%d})"); continue
            if stale_re.search(title):
                notes.append(f"CJ {raw}: dropped '{title[:60]}' (no end date, names a past season/event)"); continue
        code = clean(r.get("coupon-code"))
        s["records"].append({"id": "cj-" + r["link-id"], "network": "CJ", "code": code, "code_field": "CJ coupon-code" if code else "",
                             "title": title, "terms": clean(r.get("description")) or title,
                             "type": r.get("promotion-type", ""), "starts": starts, "ends": ends, "state": st, "link": link,
                             "updated": r.get("last-updated", "")})

    # ---------------- Impact
    im = pull.get("impact") or {}
    camps = {c["id"]: c for c in im.get("campaigns", [])}
    assigned = {}
    for p in im.get("promo_codes", []):
        if p.get("state") == "ACTIVE" and p.get("code"):
            assigned.setdefault(p["deal_id"], []).append(p["code"])
    STRUCT = ("DiscountPercent", "DiscountAmount", "MinimumPurchaseAmount", "Gift")
    for c in camps.values():
        if c["status"] != "Active" or ("Impact", c["name"]) in excl or not c.get("tracking_link"):
            continue
        s = store("Impact", c["id"], c["name"], c.get("url", ""))
        if not s["store_link"]:
            s["store_link"], s["store_link_network"] = tracked(c["tracking_link"], "subId1", SID), "Impact"
    for d in im.get("deals", []):
        c = camps.get(str(d.get("CampaignId")))
        if not c or c["status"] != "Active" or ("Impact", c["name"]) in excl or d.get("State") != "ACTIVE":
            continue
        s = stores[slugify(names.get(c["name"], c["name"]).strip())]
        starts, ends = iso_time(d.get("StartDate")), iso_time(d.get("EndDate"))
        st = W.state(starts, ends)
        if not st:
            continue
        name, desc = clean(d.get("Name")), clean(d.get("Description"))
        codes = [clean(d.get("DefaultPromoCode"))] if clean(d.get("DefaultPromoCode")) else []
        codes += [x for x in assigned.get(str(d.get("Id")), []) if x not in codes]
        why = hidden("Impact", c["name"], name, *codes)
        if why:
            notes.append(f"Impact {c['name']}: hid '{name[:50]}' ({why})"); continue
        if codes and code_conflict(codes[0], name, desc):
            notes.append(f"Impact {c['name']}: dropped '{name[:50]}' (text names a different code than the code field)"); continue
        if ends and dated_stale_re.search(name + " " + desc):
            notes.append(f"Impact {c['name']}: dropped '{name[:50]}' (names a season or event that is over)"); continue
        if not ends and stale_re.search(name + " " + desc):
            notes.append(f"Impact {c['name']}: dropped '{name[:50]}' (no end date, names a past season/event)"); continue
        has_struct = any(clean(d.get(k)) not in ("", "0", "0.00") for k in STRUCT) or d.get("Type") in ("FREE_SHIPPING", "BOGO", "GIFT_WITH_PURCHASE")
        if not codes and not (has_struct and (desc or name)):
            continue
        if re.fullmatch(r"[A-Z0-9]{5,}", name) and desc and not codes:
            name = desc  # a bare code-like label with no code field: show the description instead
        for i, code in enumerate(codes or [""]):
            s["records"].append({"id": f"impact-{d.get('Id')}" + (f"-{i}" if i else ""), "network": "Impact", "code": code,
                                 "code_field": ("Impact DefaultPromoCode" if i == 0 and d.get("DefaultPromoCode") else "Impact PromoCode") if code else "",
                                 "title": name, "terms": desc or name, "type": clean(d.get("Type")).replace("_", " ").title(),
                                 "min_purchase": clean(d.get("MinimumPurchaseAmount")), "starts": starts, "ends": ends, "state": st,
                                 "link": s["store_link"] if s["store_link_network"] == "Impact" else tracked(c["tracking_link"], "subId1", SID),
                                 "updated": d.get("DateLastUpdated", "")})

    # ---------------- Awin (only when the API answered)
    aw = pull.get("awin") or {}
    for p in aw.get("promotions", []):
        adv = p.get("advertiser") or {}
        raw = (adv.get("name") or "").strip()
        if not raw or ("Awin", raw) in excl or not p.get("urlTracking"):
            continue
        s = store("Awin", str(adv.get("id")), raw, "")
        starts, ends = iso_time(p.get("startDate")), iso_time(p.get("endDate"))
        st = W.state(starts, ends)
        if not st:
            continue
        code = clean((p.get("voucher") or {}).get("code"))
        link = tracked(p["urlTracking"], "clickref", SID)
        if not s["store_link"]:
            s["store_link"], s["store_link_network"] = link, "Awin"
        s["records"].append({"id": f"awin-{p.get('promotionId')}", "network": "Awin", "code": code, "code_field": "Awin voucher code" if code else "",
                             "title": clean(p.get("title")), "terms": clean(p.get("terms")) or clean(p.get("description")) or clean(p.get("title")),
                             "type": clean(p.get("type")).title(), "starts": starts, "ends": ends, "state": st, "link": link, "updated": ""})

    # ---------------- per-store tidy: one row per code, capped offers, page indexability
    out = []
    for s in stores.values():
        codes, offers, seen_codes, seen_offers = [], [], {}, set()
        key_end = lambda r: (r["state"] != "live", r["ends"] or "9999", r["id"])
        for r in sorted(s["records"], key=key_end):
            if r["code"]:
                k = r["code"].upper()
                if k in seen_codes:
                    continue
                seen_codes[k] = 1; codes.append(r)
            else:
                k = re.sub(r"[^a-z0-9]+", " ", r["title"].lower()).strip()
                if k in seen_offers:
                    continue
                seen_offers.add(k); offers.append(r)
        offers = offers[:OFFERS_PER_STORE]
        live_codes = sum(1 for r in codes if r["state"] == "live")
        live_offers = sum(1 for r in offers if r["state"] == "live")
        if not s["store_link"]:
            s["store_link"] = (codes + offers)[0]["link"] if codes or offers else ""
        if not s["store_link"]:
            continue
        host = urlparse(s["url"]).hostname or ""
        out.append({"slug": s["slug"], "name": s["name"], "networks": sorted({n["network"] for n in s["networks"]}), "advertiser_names": sorted(s["advertiser_names"]),
                    "domain": host[4:] if host.startswith("www.") else host, "category": s["category"],
                    "store_link": s["store_link"], "codes": codes, "offers": offers,
                    "live_codes": live_codes, "live_offers": live_offers,
                    "indexable": live_codes >= 1 or live_offers >= 3})
    out.sort(key=lambda s: s["name"].lower())
    slugs = [s["slug"] for s in out]
    assert len(slugs) == len(set(slugs)), "duplicate store slug"
    feed = {"checked_at": checked_at,
            "sources": {"CJ": f"CJ link-search for DDM property {PROPERTY} (joined advertisers)" if cj.get("links") else f"CJ: {cj.get('status', 'no data')}",
                        "Impact": "Impact campaign deals and promo codes (active contracts)" if im.get("campaigns") else f"Impact: {im.get('status', 'no data')}",
                        "Awin": "Awin joined promotions" if aw.get("promotions") else f"Awin: {aw.get('status', 'no data')}"},
            "stores": out}
    json.dump(feed, open(os.path.join(HERE, "coupons_feed.json"), "w"), indent=1, ensure_ascii=False)
    print(f"{len(out)} store pages, {sum(1 for s in out if s['live_codes'])} with live codes "
          f"({sum(s['live_codes'] for s in out)} codes), {sum(1 for s in out if s['indexable'])} indexable, checked_at {checked_at}")
    for n in notes:
        print("note", n)
    prices(pull, {s["slug"]: s for s in out}, names, excl, checked_at, price_log or os.environ.get("DDM_PRICE_LOG"))


# ---------------------------------------------------------------- price history
def _num(v):
    try:
        f = round(float(v), 2)
        return f if f > 0 else None
    except (TypeError, ValueError):
        return None


def _merge_runs(a, b):
    pts = {}
    for f, l, p, s in a + b:
        pts[f] = (p, s); pts[l] = (p, s)
    out = []
    for d in sorted(pts):
        p, s = pts[d]
        if out and out[-1][2] == p and out[-1][3] == s:
            out[-1][1] = d
        else:
            out.append([d, d, p, s])
    return out


def _merge_hist(a, b):
    if not b:
        return a
    a["check_dates"] = sorted(set(a.get("check_dates", [])) | set(b.get("check_dates", [])))
    for k, v in b.get("products", {}).items():
        if k not in a["products"]:
            a["products"][k] = v
        else:
            a["products"][k]["runs"] = _merge_runs(a["products"][k]["runs"], v["runs"])
    return a


def prices(pull, stores, names, excl, checked_at, price_log):
    path = os.path.join(HERE, "price_history.json")
    hist = json.load(open(path)) if os.path.exists(path) else {"products": {}, "check_dates": []}
    hist.setdefault("products", {}); hist.setdefault("check_dates", [])
    log_file = os.path.join(price_log, "price_history.json") if price_log else None
    if log_file and os.path.exists(log_file):
        hist = _merge_hist(hist, json.load(open(log_file)))
    day = (datetime.datetime.fromisoformat(checked_at.replace("Z", "+00:00")) - datetime.timedelta(hours=8)).strftime("%Y-%m-%d")
    n = 0
    for p in (pull.get("cj") or {}).get("products", []):
        raw = (p.get("advertiser") or "").strip()
        slug = slugify(names.get(raw, raw).strip())
        if ("CJ", raw) in excl or slug not in stores or not p.get("id"):
            continue
        price, sale = _num(p.get("price")), _num(p.get("sale_price"))
        if price is None and sale is None:
            continue
        if sale is not None and price is not None and sale >= price:
            sale = None
        click = p.get("click_url") or ""
        if click and not (f"-{PROPERTY}" in click and urlparse(click).hostname.split(".", 1)[-1] in CJ_HOSTS):
            click = ""
        k = f"cj:{p['advertiser_id']}:{p['id']}"
        e = hist["products"].setdefault(k, {"runs": []})
        e.update({"title": clean(p.get("title"))[:160], "store": slug, "link": p.get("link", ""), "click_url": click,
                  "currency": p.get("currency") or "USD", "source": "CJ product search"})
        e["runs"] = _merge_runs(e["runs"], [[day, day, price, sale]])
        n += 1
    hist["check_dates"] = sorted(set(hist["check_dates"]) | {day})
    cutoff = (datetime.date.fromisoformat(day) - datetime.timedelta(days=HISTORY_KEEP_DAYS)).isoformat()
    hist["products"] = {k: v for k, v in sorted(hist["products"].items()) if v["runs"] and v["runs"][-1][1] >= cutoff}
    hist["about"] = ("Observed prices from network product feeds. Each run is [first_seen, last_seen, price, sale_price] in "
                     "America/Los_Angeles dates; sale_price is the store's own sale price when it is below price. "
                     "Only days in check_dates were observed.")
    hist["updated_at"] = checked_at
    txt = json.dumps(hist, separators=(",", ":"), ensure_ascii=False, sort_keys=True)
    open(path, "w").write(txt + "\n")
    if log_file:
        os.makedirs(price_log, exist_ok=True)
        open(log_file, "w").write(txt + "\n")
    print(f"price history: {n} products observed on {day}; {len(hist['products'])} tracked; {len(hist['check_dates'])} check day(s)")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("pull")
    ap.add_argument("--price-log")
    a = ap.parse_args()
    main(a.pull, a.price_log)
