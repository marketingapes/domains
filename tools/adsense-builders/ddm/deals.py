"""Deal feed, Deal Score and deal-card markup for Discount Deal Me.

The Deal Score is a published, shopper-side formula (see /how-we-pick-deals/). It never uses
commission, EPC or any other number about what Discount Deal Me earns.
"""
import math
import datetime, html, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
FEED = json.load(open(os.path.join(HERE, "deals_feed.json")))
CHECKED_AT = FEED["checked_at"]

CATEGORY_ORDER = ["Kitchen", "Home", "Coffee & food", "Experiences", "Memberships", "Apparel", "Pets"]

# ---- Deal Score -----------------------------------------------------------------------------
SCORE_RULES = {
    "savings_max": 45, "pct_cap": 60, "usd_cap": 300, "usd_max": 35, "upto_factor": 0.75,
    "flat": {"price_from": 12, "perk": 12, "free_shipping": 10},
    "certainty_max": 25,
    "penalties": {"select": 6, "new_customers": 6, "signup": 6, "min_spend": 4, "membership": 4,
                  "local": 4, "refurbished": 3, "restrictions": 3, "marketplace": 3},
    "ease": {"no_code": 15, "code": 11, "signup": 6},
    "deadline": {"within_45_days": 15, "within_1_year": 8, "longer_or_none": 4},
}
PENALTY_LABELS = {"select": "select items only", "new_customers": "first order / new customers only", "signup": "requires an email sign-up",
                  "min_spend": "minimum spend", "membership": "membership purchase", "local": "local / regional only",
                  "refurbished": "refurbished items", "restrictions": "restrictions apply", "marketplace": "voucher sold through a marketplace"}


def _dt(s):
    return datetime.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc) if s else None


def score(d, at=None):
    R = SCORE_RULES
    at = at or _dt(CHECKED_AT)
    v = d["value"]; k = v["kind"]
    if k == "pct":
        sav = min(v["amount"], R["pct_cap"]) / R["pct_cap"] * R["savings_max"]
        how = f'{v["amount"]}% off'
    elif k == "usd":
        sav = min(v["amount"], R["usd_cap"]) / R["usd_cap"] * R["usd_max"]
        how = f'${v["amount"]} off (no item price, so it counts for less than a % discount)'
    else:
        sav = R["flat"][k]
        how = {"price_from": f'fixed low price (from ${v.get("amount")})', "perk": "perk or bonus, not a price cut", "free_shipping": "free shipping"}[k]
    if v.get("upto"):
        sav *= R["upto_factor"]; how += ', "up to" (best case, x0.75)'
    conds = list(d.get("conditions", [])) + (["marketplace"] if d.get("sold_by") == "marketplace" else [])
    cert = max(0, R["certainty_max"] - sum(R["penalties"][c] for c in conds))
    code = d["network"].get("code")
    ease = R["ease"]["signup"] if "signup" in conds else R["ease"]["code" if code else "no_code"]
    end = _dt(d["network"].get("ends"))
    if end and (end - at).days <= 45:
        dl = R["deadline"]["within_45_days"]; dl_how = "clear end date within 45 days"
    elif end and (end - at).days <= 366:
        dl = R["deadline"]["within_1_year"]; dl_how = "end date within a year"
    else:
        dl = R["deadline"]["longer_or_none"]; dl_how = "ongoing or open-ended"
    parts = [
        {"key": "savings", "label": "Savings size", "points": round(sav, 1), "max": R["savings_max"], "why": how},
        {"key": "certainty", "label": "Certainty", "points": cert, "max": R["certainty_max"], "why": ", ".join(PENALTY_LABELS[c] for c in conds) or "no extra conditions"},
        {"key": "ease", "label": "Ease", "points": ease, "max": 15, "why": "sign-up needed" if "signup" in conds else ("code needed" if code else "no code needed")},
        {"key": "deadline", "label": "Deadline clarity", "points": dl, "max": 15, "why": dl_how},
    ]
    return int(math.floor(sum(p["points"] for p in parts) + 0.5 + 1e-9)), parts  # half-up, matches Math.round


def band(s):
    return "Excellent" if s >= 80 else "Strong" if s >= 65 else "Fair" if s >= 50 else "Modest"


# ---- Feed ------------------------------------------------------------------------------------
def deals(now=None):
    now = now or _dt(CHECKED_AT)
    out = []
    for d in FEED["deals"]:
        end = _dt(d["network"].get("ends"))
        if end and end <= now:
            continue
        s, parts = score(d)
        out.append(dict(d, id="cj-" + d["link_id"], score=s, score_parts=parts))
    return sorted(out, key=lambda d: (-d["score"], d["network"]["ends"] or "9999"))


def tracked(d, sid):
    return d["network"]["click_url"] + "?sid=" + sid


def public_feed():
    """The JSON the site serves at /data/deals.json. No commission or EPC data exists in it."""
    items = []
    for d in deals():
        n = d["network"]
        items.append({
            "id": d["id"], "merchant": d["merchant"], "title": d["title"], "category": d["category"],
            "region": d.get("region", ""), "sold_by": d["sold_by"], "kind": d["value"]["kind"],
            "pct": d["value"].get("amount") if d["value"]["kind"] == "pct" else None,
            "usd": d["value"].get("amount") if d["value"]["kind"] == "usd" else None,
            "upto": bool(d["value"].get("upto")), "conditions": d.get("conditions", []),
            "code": n["code"], "starts": n["starts"], "ends": n["ends"],
            "score": d["score"], "score_parts": d["score_parts"],
            "summary_ai": d["summary_ai"], "network_terms": n["terms"], "network": n["name"],
            "url": tracked(d, "ddm-finder"), "event_page": d.get("event_page", ""),
        })
    return {"source": FEED["source"], "checked_at": CHECKED_AT, "score_formula": "/how-we-pick-deals/#deal-score",
            "disclosure": "Links are affiliate links. Discount Deal Me may earn a commission; it never changes your price or the Deal Score.",
            "count": len(items), "deals": items}


# ---- Markup ----------------------------------------------------------------------------------
E = html.escape


def human_end(iso):
    if not iso:
        return "Ongoing"
    dt = _dt(iso) - datetime.timedelta(hours=7)  # PT (PDT, UTC-7) for the static fallback text; JS replaces it in the reader's own zone
    return "Ends " + dt.strftime("%b %-d, %-I:%M %p").replace(":00 ", " ") + " PT"


def score_badge(d):
    hi = " is-high" if d["score"] >= 70 else ""
    return (f'<span class="score{hi}" title="Deal Score {d["score"]}/100 ({band(d["score"])}). See how it is calculated.">'
            f'<b>{d["score"]}</b><small>Deal Score</small></span>')


def breakdown(d):
    rows = "".join(f'<tr><th scope="row">{p["label"]}</th><td>{E(p["why"])}</td><td class="num">{p["points"]:g}/{p["max"]}</td></tr>' for p in d["score_parts"])
    return (f'<table class="score-table"><caption class="sr-only">Deal Score breakdown</caption><tbody>{rows}'
            f'<tr class="total"><th scope="row">Deal Score</th><td>{band(d["score"])}</td><td class="num">{d["score"]}/100</td></tr></tbody></table>')


def card(d, sid, compact=False, heading="h3"):
    n = d["network"]
    code = n["code"]
    meta = [f'<span class="meta-end" data-end-label>{human_end(n["ends"])}</span>']
    meta.append('<span>Code needed</span>' if code else '<span>No code needed</span>')
    if d.get("region"):
        meta.append(f'<span>{E(d["region"])}</span>')
    codebox = (f'<div class="code"><span class="code-label">Code</span><code>{E(code)}</code>'
               f'<button type="button" class="code-copy" data-copy="{E(code)}">Copy</button></div>') if code else ""
    event = f'<a class="deal-more" href="{d["event_page"]}">Read our full breakdown</a>' if d.get("event_page") else ""
    return f'''<article class="deal{' deal-compact' if compact else ''}" id="{d["id"] if not compact else ""}" data-deal="{d["id"]}" data-cat="{E(d["category"])}" data-ends="{n["ends"]}" data-score="{d["score"]}" data-code="{1 if code else 0}" data-local="{1 if "local" in d.get("conditions", []) else 0}">
<div class="deal-top"><span class="deal-merchant">{E(d["merchant"])}</span><span class="deal-cat">{E(d["category"])}</span>{score_badge(d)}</div>
<{heading} class="deal-title">{E(d["title"])}</{heading}>
<p class="deal-meta">{"".join(meta)}</p>
<p class="ai"><span class="ai-tag" title="Written by an AI model from the network terms below. Numbers and dates are checked against those terms.">AI summary</span> {E(d["summary_ai"])}</p>
{codebox}<div class="deal-actions"><a class="btn btn-deal" rel="sponsored nofollow noopener" target="_blank" data-offer="{d["id"]}" href="{E(tracked(d, sid))}">Get deal at {E(d["merchant"])} <span aria-hidden="true">&#8599;</span></a>{event}</div>
<details class="deal-details"><summary>Network terms and score breakdown</summary>
<p class="terms"><strong>Terms as published by {E(d["merchant"])} through {n["name"]}:</strong> {E(n["terms"] or n["link_name"])}</p>
{breakdown(d)}
<p class="checked">Checked against the {n["name"]} affiliate feed <time datetime="{CHECKED_AT}" data-checked>{checked_human()}</time>. We did not verify individual product prices.</p>
</details>
</article>'''


def checked_human():
    dt = _dt(CHECKED_AT) - datetime.timedelta(hours=7)
    return dt.strftime("%b %-d, %Y, %-I:%M %p PT")
