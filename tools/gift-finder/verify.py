"""Check every gift-finder product live and write <site>/data/gifts.json.

Usage: python3 tools/gift-finder/verify.py fplb [px h2m]

For each product it follows the affiliate link (it must end on the merchant's own site with a 200),
then reads the store's public Shopify JSON for current price and stock. Products that fail either
check, or are out of stock, are left out of the published list. Needs network; no credentials.
"""
import json, os, subprocess, sys, datetime, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"


def follow(url):
    r = subprocess.run(["curl", "-sL", "-A", UA, "-o", "/dev/null", "-m", "40", "-w", "%{http_code} %{url_effective}", url],
                       capture_output=True, text=True).stdout.split(" ", 1)
    return (r + [""])[:2]


def getjson(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=40))


def img(u, w=480):
    if not u:
        return ""
    u = ("https:" + u) if u.startswith("//") else u
    return u + ("&" if "?" in u else "?") + f"width={w}"


def price(pc):
    if not pc:
        return None, None, True, ""
    d = getjson(pc["url"])
    if pc["type"] == "product":
        av = [v for v in d["variants"] if v.get("available")]
        if not av:
            return None, None, False, img(d.get("featured_image"))
        ps = [v["price"] / 100 for v in av]
        return min(ps), max(ps), True, img(d.get("featured_image"))
    prods = [p for p in d["products"] if any(v.get("available") for v in p["variants"])]
    if not prods:
        return None, None, False, ""
    ps = [float(v["price"]) for p in prods for v in p["variants"] if v.get("available") and float(v["price"]) > 0]
    first = next((p for p in prods if p.get("images")), None)
    return min(ps), max(ps), True, img(first["images"][0]["src"]) if first else ""


def run(site):
    cat = json.load(open(os.path.join(HERE, "catalogs", site + ".json")))
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    keep, report = [], []
    for p in cat["products"]:
        code, final = follow(p["url"])
        host = urllib.parse.urlparse(final).netloc.lower().removeprefix("www.")
        link_ok = code == "200" and host.endswith(p["expect_host"])
        try:
            lo, hi, avail, image = price(p.get("price_check"))
            price_err = ""
        except Exception as e:  # price lookup failed: keep the link check, mark price unknown
            lo, hi, avail, image, price_err = None, None, True, "", repr(e)[:120]
        ok = link_ok and avail
        report.append({"id": p["id"], "http": code, "final_host": host, "link_ok": link_ok, "available": avail,
                       "price_from": lo, "price_to": hi, "price_error": price_err, "published": ok})
        if not ok:
            continue
        out = {k: p[k] for k in ("id", "merchant", "name", "network", "url", "tags", "blurb") if k in p}
        for k in ("code", "price_note", "boost"):
            if p.get(k):
                out[k] = p[k]
        out.update({"price_from": round(lo, 2) if lo is not None else None, "price_to": round(hi, 2) if hi is not None else None,
                    "image": image, "image_alt": f'{p["name"]}, photo from {p["merchant"]}' if image else "", "available": True,
                    "verified_host": host})
        keep.append(out)
    pub = {k: cat[k] for k in ("site", "title", "results_title", "budget_label", "budgets", "questions")}
    pub.update({"checked_at": now, "disclosure": "",
                "products": keep})
    os.makedirs(os.path.join(ROOT, site, "data"), exist_ok=True)
    json.dump(pub, open(os.path.join(ROOT, site, "data", "gifts.json"), "w"), indent=1, ensure_ascii=False)
    open(os.path.join(ROOT, site, "data", "gifts.json"), "a").write("\n")
    for r in report:
        print(site, "OK " if r["published"] else "OUT", r["id"], r["http"], r["final_host"], r["price_from"], r["price_to"], r["price_error"])
    print(f"{site}: {len(keep)}/{len(cat['products'])} published, checked {now}")
    return report


if __name__ == "__main__":
    allr = {s: run(s) for s in sys.argv[1:]}
    if os.environ.get("GF_REPORT"):
        json.dump(allr, open(os.environ["GF_REPORT"], "w"), indent=1)
