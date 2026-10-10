"""Merge a CJ link-search pull with the editorial layer into deals_feed.json.

Usage: python3 refresh_deals.py <cj_pull.json> [--min-hours N]

Deals ending within N hours of the pull (default 12) are left out, and deals that have
not started yet are skipped until a later refresh.

<cj_pull.json> is {"pulled_at_utc": ISO, "website_id": "101511733", "links": [ ...CJ link-search rows... ]}.
The pull is made outside the repo (it needs the CJ token). This script never reads credentials,
never writes EPC or commission figures, and drops any editorial deal the network no longer returns
or that has already ended. Run build.py afterwards to regenerate the site.
"""
import json, os, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
PROPERTY = "101511733"


def iso(cj):
    cj = (cj or "").strip()
    if not cj:
        return ""
    return datetime.datetime.strptime(cj[:19], "%Y-%m-%d %H:%M:%S").strftime("%Y-%m-%dT%H:%M:%SZ")


def main(pull_path, min_hours=12.0):
    pull = json.load(open(pull_path))
    assert pull.get("website_id") == PROPERTY, "pull must come from the DDM CJ property"
    rows = {}
    for r in pull["links"]:
        rows.setdefault(r["link-id"], r)
    ed = json.load(open(os.path.join(HERE, "deals_editorial.json")))
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    now = now_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    cutoff = (now_dt + datetime.timedelta(hours=min_hours)).strftime("%Y-%m-%dT%H:%M:%SZ")
    out, dropped = [], []
    for e in ed["deals"]:
        r = rows.get(e["link_id"])
        if not r or r.get("relationship-status") != "joined":
            dropped.append((e["link_id"], "not returned by network"))
            continue
        ends = iso(r.get("promotion-end-date"))
        if ends and ends <= now:
            dropped.append((e["link_id"], "ended"))
            continue
        if ends and ends <= cutoff:
            dropped.append((e["link_id"], f"ends within {min_hours:g}h ({ends})"))
            continue
        starts = iso(r.get("promotion-start-date"))
        if starts and starts > now:
            dropped.append((e["link_id"], f"not started yet ({starts})"))
            continue
        assert f"/click-{PROPERTY}-" in r["clickUrl"], r["clickUrl"]
        out.append(dict(e, network={
            "name": "CJ", "advertiser_id": r["advertiser-id"], "advertiser_name": r["advertiser-name"],
            "link_name": r["link-name"].strip(), "terms": " ".join(r.get("description", "").split()),
            "promotion_type": r.get("promotion-type", ""), "code": (r.get("coupon-code") or "").strip(),
            "starts": iso(r.get("promotion-start-date")), "ends": ends,
            "click_url": r["clickUrl"], "destination": r.get("destination", ""),
        }))
    feed = {"source": f"CJ link-search, DDM property {PROPERTY}", "checked_at": pull["pulled_at_utc"].replace("+00:00", "Z"), "deals": out}
    json.dump(feed, open(os.path.join(HERE, "deals_feed.json"), "w"), indent=1, ensure_ascii=False)
    print(f"{len(out)} deals written, checked_at {feed['checked_at']}")
    for d in dropped:
        print("dropped", *d)


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("pull")
    ap.add_argument("--min-hours", type=float, default=12.0)
    a = ap.parse_args()
    main(a.pull, a.min_hours)
