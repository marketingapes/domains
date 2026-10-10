"""Pull joined CJ link-search offers for the DDM property (website 101511733).

Usage: python3 cj_pull.py <out.json> [promotion types...]

Credentials: CJ_API_TOKEN from the environment, or, if that is not set, read in-process
from a Render env group (RENDER_API_KEY + RENDER_ENV_GROUP_ID). The token is never printed
or written to disk. The output holds no EPC or commission fields.
"""
import json, os, sys, datetime, urllib.request, urllib.parse, xml.etree.ElementTree as ET

PROPERTY = "101511733"
DROP = {"link-code-html", "link-code-javascript", "seven-day-epc", "three-month-epc", "sale-commission", "click-commission", "lead-commission"}


def get(url, tok):
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + tok})
    return urllib.request.urlopen(req, timeout=60).read()


def token():
    if os.environ.get("CJ_API_TOKEN"):
        return os.environ["CJ_API_TOKEN"]
    key, grp = os.environ.get("RENDER_API_KEY"), os.environ.get("RENDER_ENV_GROUP_ID")
    if not (key and grp):
        sys.exit("Set CJ_API_TOKEN, or RENDER_API_KEY and RENDER_ENV_GROUP_ID.")
    eg = json.loads(get(f"https://api.render.com/v1/env-groups/{grp}", key))
    for z in eg.get("envVars", []):
        z = z.get("envVar", z)
        if z.get("key") == "CJ_API_TOKEN":
            return z["value"]
    sys.exit("CJ_API_TOKEN not found in the Render env group.")


def main(out, types):
    tok, rows = token(), []
    for pt in types:
        for page in range(1, 60):
            q = urllib.parse.urlencode({"website-id": PROPERTY, "advertiser-ids": "joined", "promotion-type": pt,
                                        "records-per-page": "100", "page-number": page})
            x = ET.fromstring(get("https://link-search.api.cj.com/v2/link-search?" + q, tok))
            links = x.findall(".//link")
            for l in links:
                rows.append({ch.tag: (ch.text or "").strip() for ch in l if ch.tag not in DROP})
            if len(links) < 100:
                break
    data = {"pulled_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
            "website_id": PROPERTY, "links": rows}
    json.dump(data, open(out, "w"), indent=1)
    print(f"pulled {len(rows)} links from {len({r['advertiser-id'] for r in rows})} advertisers")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:] or ["sale/discount", "coupon", "free shipping"])
