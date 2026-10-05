"""Owner-run projector: original Phillips Sheets exports -> deidentified Client Perspective input.

Reads .xlsx exports of the three original workbooks (MVA, MVA daily spend, LA County) from
non-synced temporary storage and writes `ee.phillips_client_perspective/v1` JSON for the protected
report-inputs endpoint. Nothing is fetched or sent.

What leaves this script:
- explicit source IDs (firm intake/matter IDs, lead/platform IDs), dates, delivery evidence,
  categorical firm status and turn-down reason (category only), UTM/ad identifiers;
- daily spend/delivery numbers per source tab, with gaps and sheet-total cross-checks;
- counts of call and raw-intake logs.
What never leaves: names, phones, emails, locations, ages, narratives/details, recordings, notes,
IP addresses, click IDs, form free text. Notes columns are dropped because they contain names.

Rules: every original record is kept with its sheet/tab/row; records merge only on an explicit
shared source ID; a merge that would join two different records of the same tab is held as
ambiguous; phone/name similarity is never used. Missing spend days stay missing. Converted,
Retainer Sent and platform "signed" markers are not counted as signed.
"""
import argparse, collections, datetime as dt, json, os, pathlib, re, tempfile

import openpyxl

SCHEMA = "ee.phillips_client_perspective/v1"
VERSION = "2026-10-04.1"
# Exact workbook IDs of the three original sources. Their exports are the only accepted inputs.
WORKBOOKS = {
    "mva": "1KcJS5nBn7A-06rFfPzbMd9sRsRnSfeaI-W7bCpB-oNE",
    "mva_daily": "1IL3Y6HBAW5vtJUM--_B5rXmZLy2FORwFFn7WJTiWLb0",
    "la_county": "1evjypO4qyNiJ3J4rr-VadB4KvcjzSkwDr0bygYLYZLc",
}
CAMPAIGNS = {
    "mva": "Arizona MVA",
    "la_county": "LA County",
    "deadleads": "Deadleads (firm intakes)",
    "other": "Other Phillips intakes",
}
# Owner-confirmed plan carried in PR228's campaign-portal-config.json. Only MVA has one.
MVA_PLAN = {"total_usd": 5000, "duration_days": 14, "allocation": {"meta_website_usd": 3000, "google_search_usd": 2000},
            "observed_at": "2026-10-04T18:17:33Z", "source": "Owner-confirmed plan, observed 2026-10-04",
            "note": "Planned next flight. No spend for this flight appears in any source yet."}

SIGNED_NOTE = "Not verified: no executed-retainer reference in any source."
TEST_CHANNELS = re.compile(r"^TEST/SPAM", re.I)
ID_RE = re.compile(r"^(INT-\d{6,}|MAT-\d{6,}|FBL\d{10,}|PLG[A-Z0-9]{6,}|\d{12,20})$")


def table(path, tab):
    ws = openpyxl.load_workbook(path, read_only=True, data_only=True)[tab]
    rows = list(ws.iter_rows(values_only=True))
    head = [str(h).strip() if h is not None else "" for h in rows[0]]
    out = []
    for n, r in enumerate(rows[1:], start=2):
        if any(c not in (None, "") for c in r):
            out.append((n, dict(zip(head, r))))
    return out


def text(v):
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def day(v):
    """Date-only value or None. Unparseable text is reported, never guessed."""
    if isinstance(v, dt.datetime):
        return v.date().isoformat()
    if isinstance(v, dt.date):
        return v.isoformat()
    s = text(v)
    if not s or s.lower() == "none" or s in {"—", "-"}:
        return None
    m = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})", s)
    if m:
        y = int(m[3]) + (2000 if len(m[3]) == 2 else 0)
        return dt.date(y, int(m[1]), int(m[2])).isoformat()
    m = re.fullmatch(r"(\d{4}-\d{2}-\d{2})(?:[T ].*)?", s)
    return m[1] if m else None


def local_time(v):
    """Source-local timestamp string (no timezone conversion) or None."""
    if isinstance(v, dt.datetime):
        return v.strftime("%Y-%m-%dT%H:%M")
    s = text(v)
    m = s and re.fullmatch(r"(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?", s)
    return f"{m[1]}T{m[2]}" if m else None


def source_id(v):
    """Explicit ID or None. Float cells lost precision in the sheet and are not usable IDs."""
    if isinstance(v, float):
        return None
    s = text(v)
    return s if s and ID_RE.fullmatch(s) else None


def category(v):
    """Firm turn-down reason category only. 'Category — narrative' keeps the category."""
    s = text(v)
    return s.split(" — ")[0].strip()[:60] if s else None


def money(v):
    return round(float(v), 2) if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def count(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


class Projector:
    def __init__(self, paths, modified):
        self.paths = paths
        self.modified = modified
        self.sources = []
        self.records = []
        self.issues = collections.defaultdict(list)

    def source(self, wb, tab, label, rows, period=None):
        sid = f"{wb}:{tab}"
        self.sources.append({"source_id": sid, "workbook": wb, "sheet_id": WORKBOOKS[wb], "tab": tab, "label": label,
                             "rows": len(rows), "period": period, "workbook_modified_at": self.modified.get(wb)})
        return sid

    # ---- leads ---------------------------------------------------------------------------------

    def litify_row(self, sid, n, r, campaign):
        status = text(r.get("Status"))
        return {
            "source": sid, "row": n, "campaign": campaign,
            "ids": {k: v for k, v in {"intake": source_id(r.get("Intake: Intake Name")), "matter": source_id(r.get("Matter")),
                                       "lead": source_id(r.get("Lead/Call ID"))}.items() if v},
            "case_type": text(r.get("Case Type")), "source_label": text(r.get("Source")),
            "created_date": day(r.get("Intake: Created Date")),
            "channel": text(r.get("Channel")), "sent_logged": local_time(r.get("Sent/Logged")) or day(r.get("Sent/Logged")),
            "firm_status": status, "turn_down_reason": category(r.get("Turn Down Reason")),
            "retainer_sent_date": day(r.get("Retainer Sent Date by Source")),
            "co_counsel_status": text(r.get("Co Counsel Status")),
            "replacement_requested": text(r.get("Replacement Requested?")),
            "float_id": isinstance(r.get("Lead/Call ID"), float),
        }

    def load(self):
        P = self.paths
        # MVA workbook: current lead ledger, API delivery log, Meta lead-ad export, call log, spend, raw intake log.
        rows = table(P["mva"], "All_leads")
        sid = self.source("mva", "All_leads", "MVA lead ledger", rows)
        self.records += [self.litify_row(sid, n, r, "mva") for n, r in rows]

        rows = table(P["mva"], "sent_records")
        sid = self.source("mva", "sent_records", "MVA API delivery log", rows,
                          self.period([day(r.get("timestamp")) for _, r in rows]))
        for n, r in rows:
            self.records.append({"source": sid, "row": n, "campaign": "mva",
                                 "ids": {k: v for k, v in {"lead": source_id(r.get("LeadID")), "intake": source_id(r.get("Litify Intake"))}.items() if v},
                                 "delivery": {"sent_at": local_time(r.get("timestamp")), "api_success": r.get("is_success") is True,
                                              "firm_record_id_returned": bool(text(r.get("intakeID")))},
                                 "firm_status": text(r.get("Litify Status (7/13 sync)")), "firm_status_as_of": "2026-07-13",
                                 "turn_down_reason": category(r.get("Turn Down Reason")),
                                 "test_marker": bool(re.search(r"\btest\b", str(r.get("Turn Down Details / Notes") or ""), re.I))})

        fb = {}
        for tab in ("fb_lead", "fb_lead_updated"):
            rows = table(P["mva"], tab)
            self.source("mva", tab, "Meta lead-ad export", rows, self.period([day(r.get("created_time")) for _, r in rows]))
            for n, r in rows:
                pid = re.sub(r"^l:", "", text(r.get("id")) or "")
                if pid:
                    fb.setdefault(pid, {"ad_id": text(r.get("ad_id")), "adset_id": text(r.get("adset_id")), "campaign_id": text(r.get("campaign_id")),
                                        "campaign_name": text(r.get("campaign_name")), "form_id": text(r.get("form_id")),
                                        "created_at": local_time(text(r.get("created_time"))), "source": f"mva:{tab}", "row": n,
                                        "platform_status": set()})["platform_status"].add(text(r.get("lead_status")))
        self.fb = fb

        rows = table(P["mva"], "Vapi")
        self.calls = {"source": self.source("mva", "Vapi", "AI intake call log", rows, self.period([day(r.get("started_at_az")) for _, r in rows])),
                      "records": len(rows),
                      "by_direction": dict(collections.Counter(text(r.get("direction")) or "unrecorded" for _, r in rows)),
                      "by_ended_reason": dict(collections.Counter(text(r.get("ended_reason")) or "unrecorded" for _, r in rows)),
                      "by_outcome": dict(collections.Counter(text(r.get("outcome_tag")) or "unrecorded" for _, r in rows)),
                      "transferred": sum(str(r.get("transferred")).upper() == "TRUE" for _, r in rows),
                      "linked_to_leads": 0,
                      "note": "Call log rows carry no explicit lead ID, so no call is attached to a lead. Linking by phone would be a guess."}

        self.raw_logs = []
        for wb, tab, col, src in (("mva", "Raw", "date", "source"), ("la_county", "RAW", "DATE", None)):
            rows = table(P[wb], tab)
            sid = self.source(wb, tab, "Raw intake event log", rows, self.period([day(r.get(col)) for _, r in rows]))
            self.raw_logs.append({"source": sid, "campaign": "mva" if wb == "mva" else "la_county", "events": len(rows),
                                  "by_source": dict(collections.Counter(text(r.get(src)) or "unlabelled" for _, r in rows)) if src else None,
                                  "period": self.period([day(r.get(col)) for _, r in rows]),
                                  "note": "Event counts only. Payloads hold contact details and are not projected; events are not unique people."})

        # MVA daily spend workbook: daily spend, older lead ledger, firm-side intake export, older delivery log.
        rows = table(P["mva_daily"], "All_Leads")
        sid = self.source("mva_daily", "All_Leads", "MVA lead ledger (July snapshot)", rows)
        self.records += [self.litify_row(sid, n, r, "mva") for n, r in rows]

        rows = table(P["mva_daily"], "RAW")
        sid = self.source("mva_daily", "RAW", "Phillips intake export (all Marketing Apes sources)", rows,
                          self.period([day(r.get("Intake: Created Date")) for _, r in rows]))
        for n, r in rows:
            ct = text(r.get("Case Type")) or ""
            camp = ("deadleads" if "Deadleads" in (text(r.get("Source")) or "") else
                    "la_county" if ct.startswith("Sex Abuse") else "mva" if ct.startswith("Auto") else "other")
            rec = self.litify_row(sid, n, r, camp)
            rec["firm_export"] = True
            self.records.append(rec)

        rows = table(P["mva_daily"], "sent_records")
        sid = self.source("mva_daily", "sent_records", "MVA API delivery log (older copy)", rows,
                          self.period([day(r.get("timestamp")) for _, r in rows]))
        for n, r in rows:
            self.records.append({"source": sid, "row": n, "campaign": "mva",
                                 "ids": {k: v for k, v in {"lead": source_id(r.get("LeadID")), "intake": source_id(r.get("Litify Intake"))}.items() if v},
                                 "delivery": {"sent_at": local_time(r.get("timestamp")), "api_success": r.get("is_success") is True,
                                              "firm_record_id_returned": bool(text(r.get("intakeID")))},
                                 "firm_status": text(r.get("Litify Status (7/13 sync)")), "firm_status_as_of": "2026-07-13",
                                 "turn_down_reason": category(r.get("Turn Down Reason")),
                                 "test_marker": bool(re.search(r"\btest\b", str(r.get("Turn Down Details / Notes") or ""), re.I))})

        # LA County workbook.
        rows = table(P["la_county"], "All_Leads")
        sid = self.source("la_county", "All_Leads", "LA County lead ledger", rows,
                          self.period([day(r.get("Can")) for _, r in rows]))
        for n, r in rows:
            utm = {k: text(r.get(f"utm_{k}")) for k in ("source", "medium", "campaign", "content", "id")}
            self.records.append({"source": sid, "row": n, "campaign": "la_county",
                                 "ids": {k: v for k, v in {"lead": source_id(r.get("ID")), "intake": source_id(r.get("Intake: Intake Name"))}.items() if v},
                                 "case_type": text(r.get("Case Type")), "submitted_at": local_time(r.get("Can")),
                                 "created_date": day(r.get("Intake:CreatedDate")), "sent_logged": day(r.get("Sent Date")),
                                 "contacted": text(r.get("Contacted")), "preferred_contact": text(r.get("Preffered method of comm")),
                                 "firm_status": text(r.get("Status")), "turn_down_reason": category(r.get("Turn Down reason")),
                                 "retainer_agreement": text(r.get("Retainer Agreement")),
                                 "utm": {k: v for k, v in utm.items() if v} or None})

        rows = table(P["la_county"], "sent_records")
        sid = self.source("la_county", "sent_records", "LA County API delivery log", rows)
        for n, r in rows:
            self.records.append({"source": sid, "row": n, "campaign": "la_county",
                                 "ids": {k: v for k, v in {"lead": source_id(r.get("LeadId"))}.items() if v},
                                 "delivery": {"sent_at": None, "api_success": r.get("is Success") is True,
                                              "firm_record_id_returned": bool(text(r.get("IntakeId")))}})

    @staticmethod
    def period(days):
        d = sorted(x for x in days if x)
        return {"start": d[0], "end": d[-1]} if d else None

    # ---- deduplication -------------------------------------------------------------------------

    def group(self):
        parent = list(range(len(self.records)))

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i
        owner = {}
        for i, rec in enumerate(self.records):
            for kind, v in rec["ids"].items():
                key = v  # IDs are globally distinct formats (INT-/MAT-/FBL/PLG/digits)
                if key in owner:
                    parent[find(i)] = find(owner[key])
                else:
                    owner[key] = i
        groups = collections.defaultdict(list)
        for i in range(len(self.records)):
            groups[find(i)].append(self.records[i])
        out = []
        for members in groups.values():
            tabs = collections.Counter(m["source"] for m in members)
            if len(members) > 1 and max(tabs.values()) > 1:
                # Two records from one tab would be joined: hold each separately, unresolved.
                gid = "AMB-" + "-".join(sorted({v for m in members for v in m["ids"].values()}))[:60]
                for m in members:
                    out.append(([m], {"state": "ambiguous", "group": gid,
                                      "reason": "Explicit IDs would join different records from the same tab; held unresolved."}))
                self.issues["ambiguous"].append({"group": gid, "records": len(members)})
            else:
                out.append((members, {"state": "merged" if len(members) > 1 else "single", "basis": "shared explicit source ID" if len(members) > 1 else None}))
        return out

    # ---- lead view -----------------------------------------------------------------------------

    def lead(self, members, dedupe, index):
        ids = {}
        for m in members:
            for k, v in m["ids"].items():
                ids.setdefault(k, [])
                if v not in ids[k]:
                    ids[k].append(v)
        camps = {m["campaign"] for m in members if not m.get("firm_export")} or {m["campaign"] for m in members}
        campaign = sorted(camps)[0] if len(camps) == 1 else "mva" if "mva" in camps else sorted(camps)[0]
        first = lambda key: next((m[key] for m in members if m.get(key)), None)
        delivery = [dict(m["delivery"], source=m["source"], row=m["row"]) for m in members if m.get("delivery")]
        statuses = []
        for m in members:
            if m.get("firm_status"):
                statuses.append({"status": m["firm_status"], "turn_down_reason": m.get("turn_down_reason"), "source": m["source"], "row": m["row"],
                                 "as_of": m.get("firm_status_as_of") or self.modified.get(m["source"].split(":")[0], "")[:10] or None})
        statuses.sort(key=lambda s: s["as_of"] or "", reverse=True)
        distinct = {s["status"] for s in statuses}
        channel = first("channel")
        test = any(m.get("test_marker") for m in members) or bool(channel and TEST_CHANNELS.search(channel)) or \
            any("test" in (m.get("source_label") or "").lower() for m in members)
        spam = any((m.get("turn_down_reason") or "") == "Spam" for m in members) or bool(channel and "SPAM" in channel)

        attribution = None
        fbid = next((v[3:] for v in ids.get("lead", []) if v.startswith("FBL")), None)
        if fbid and fbid in self.fb:
            f = self.fb[fbid]
            attribution = {"state": "platform_record", "platform": "meta", "campaign_id": f["campaign_id"], "campaign_name": f["campaign_name"],
                           "adset_id": f["adset_id"], "ad_id": f["ad_id"], "form_id": f["form_id"], "source": f["source"], "row": f["row"],
                           "platform_lead_status": sorted(s for s in f["platform_status"] if s)}
        elif first("utm"):
            attribution = {"state": "utm_reported", **first("utm")}
        elif channel and channel.startswith("CALL-IN"):
            attribution = {"state": "call_tracking_label", "label": first("source_label")}

        contact = []
        if first("contacted"):
            contact.append({"kind": "contacted_column", "value": first("contacted"), "note": "Source column; who made contact is not recorded."})
        if first("preferred_contact"):
            contact.append({"kind": "preferred_channel", "value": first("preferred_contact")})
        if channel and channel.startswith("CALL-IN"):
            contact.append({"kind": "inbound_call", "value": channel})
        if any(s["status"] in {"Chasing", "Auto Chasing"} for s in statuses):
            contact.append({"kind": "firm_follow_up", "value": "Firm status Chasing", "note": "Attempt counts are only in narrative notes and are not projected."})

        signed_markers = [s for s in (attribution or {}).get("platform_lead_status", []) if s.lower() == "signed"]
        retainer = {"sent_date": first("retainer_sent_date"), "agreement_flag": first("retainer_agreement"),
                    "platform_signed_marker": bool(signed_markers), "signed": "unverified", "note": SIGNED_NOTE}

        current = statuses[0]["status"] if statuses else None
        handoff_state = ("api_success" if any(d["api_success"] for d in delivery) else
                         "not_sent" if channel and ("NOT SENT" in channel or "UNSENT" in channel) else
                         "delivered_per_ledger" if channel and channel.startswith("DELIVERED") else
                         "inbound_call" if channel and channel.startswith("CALL-IN") else
                         "firm_record_only" if all(m.get("firm_export") for m in members) else "unknown")
        lead = {
            "key": f"L{index:04d}", "campaign": campaign, "ids": ids,
            "source_records": [{"source": m["source"], "row": m["row"]} for m in members],
            "dedupe": dedupe, "case_type": first("case_type"),
            # Which kinds of original record exist for this lead; a delivery-log row with no ledger row
            # sharing its ID stays its own record rather than being guessed onto one.
            "record_basis": sorted({"firm_export" if m.get("firm_export") else "delivery_log" if m.get("delivery") else "lead_ledger" for m in members}),
            "submitted_at": first("submitted_at") or (self.fb.get(fbid) or {}).get("created_at"),
            "firm_created_date": first("created_date"),
            "handoff": {"state": handoff_state, "ledger_channel": channel, "ledger_sent": first("sent_logged"), "deliveries": delivery,
                        "firm_receipt": "firm_record_exists" if ids.get("intake") else "unknown",
                        "note": "API success and ledger entries show sending, not firm acceptance."},
            "contact": contact, "attribution": attribution or {"state": "unavailable"},
            "firm": {"current_status": current, "turn_down_reason": statuses[0]["turn_down_reason"] if statuses else None,
                     "history": statuses, "conflict": len(distinct) > 1, "retainer": retainer},
            "excluded": "test" if test else "spam" if spam else None,
            "float_id_unusable": any(m.get("float_id") for m in members),
        }
        lead["next_action"] = self.next_action(lead)
        if lead["firm"]["conflict"]:
            self.issues["status_conflict"].append(lead["key"])
        if lead["float_id_unusable"]:
            self.issues["float_id"].append(lead["key"])
        return lead

    @staticmethod
    def next_action(lead):
        s = (lead["firm"]["current_status"] or "").lower()
        h = lead["handoff"]["state"]
        if lead["excluded"]:
            return {"owner": None, "action": "None — excluded from totals", "kind": "excluded"}
        if h == "not_sent":
            return {"owner": "Marketing Apes", "action": "Deliver to Phillips or close as unsent", "kind": "delivery"}
        if not s or "no intake" in s or "never appeared" in s or "not in litify" in s:
            return {"owner": "Phillips", "action": "Confirm whether an intake exists and report its status", "kind": "missing_feedback"}
        if s in {"converted", "approved", "docs out"} or lead["firm"]["retainer"]["sent_date"] or lead["firm"]["retainer"]["agreement_flag"]:
            if s == "turned down":
                return {"owner": None, "action": "None — closed by firm", "kind": "closed"}
            return {"owner": "Phillips", "action": "Confirm signed retainer with an executed-retainer reference", "kind": "signed_proof"}
        if s in {"chasing", "auto chasing", "contacted", "pending referral"}:
            return {"owner": "Phillips", "action": "Report the contact outcome", "kind": "missing_feedback"}
        if s == "turned down":
            return {"owner": None, "action": "None — closed by firm", "kind": "closed"}
        return {"owner": "Phillips", "action": "Clarify status", "kind": "missing_feedback"}

    # ---- spend ---------------------------------------------------------------------------------

    def daily_spend(self, wb, tab, cols):
        rows = table(self.paths[wb], tab)
        days, sheet_total = [], None
        for n, r in rows:
            d = r.get("Date")
            if isinstance(d, str) and d.upper().startswith("TOTAL"):
                sheet_total = {"label": d, "row": n, "spend_usd": money(r.get(cols["total"]))}
                continue
            date = day(d)
            if not date:
                self.issues["spend_unparsed_row"].append({"source": f"{wb}:{tab}", "row": n})
                continue
            entry = {"date": date, "row": n, "status": text(r.get("Status")),
                     "spend": {k: money(r.get(c)) for k, c in cols["spend"].items()},
                     "delivery": {k: count(r.get(c)) for k, c in cols["delivery"].items()}}
            days.append(entry)
        days.sort(key=lambda e: e["date"])
        sid = self.source(wb, tab, "Daily spend", rows, self.period([e["date"] for e in days]))
        total = round(sum(e["spend"]["total"] or 0 for e in days), 2)
        missing = []
        if days:
            d0, d1 = dt.date.fromisoformat(days[0]["date"]), dt.date.fromisoformat(days[-1]["date"])
            have = {e["date"] for e in days}
            missing = [(d0 + dt.timedelta(i)).isoformat() for i in range((d1 - d0).days + 1) if (d0 + dt.timedelta(i)).isoformat() not in have]
        blank = [e["date"] for e in days if e["spend"]["total"] is None]
        by = {k: round(sum(e["spend"][k] or 0 for e in days), 2) for k in cols["spend"] if k != "total"}
        return {"source": sid, "period": self.period([e["date"] for e in days]), "days_reported": len(days), "days_missing": missing,
                "days_blank": blank, "total_usd": total, "by_channel": by,
                "sheet_total": sheet_total, "sheet_total_matches": None if not sheet_total or sheet_total["spend_usd"] is None
                else abs(sheet_total["spend_usd"] - total) < 0.01, "daily": days}

    def marketing_tab(self):
        rows = table(self.paths["mva"], "Marketing")
        by_day = collections.defaultdict(float)
        campaigns = collections.defaultdict(lambda: {"spend_usd": 0.0, "impressions": 0, "clicks": 0, "leads": 0, "days": 0})
        for n, r in rows:
            d = day(r.get("Date"))
            sp = money(r.get("Spend")) or 0
            by_day[d] += sp
            c = campaigns[(text(r.get("Platform")), text(r.get("Campaign")))]
            c["spend_usd"] += sp
            c["days"] += 1
            for k, col in (("impressions", "Impressions"), ("clicks", "Clicks"), ("leads", "Leads")):
                c[k] += count(r.get(col)) or 0
        sid = self.source("mva", "Marketing", "Platform performance by campaign", rows, self.period(list(by_day)))
        return sid, {d: round(v, 2) for d, v in by_day.items()}, [
            {"platform": p, "campaign": name, **{k: round(v, 2) if isinstance(v, float) else v for k, v in vals.items()},
             "platform_leads_note": "Platform-reported; not reconciled to delivered leads."}
            for (p, name), vals in sorted(campaigns.items(), key=lambda kv: -kv[1]["spend_usd"])]

    # ---- assemble ------------------------------------------------------------------------------

    def build(self, now):
        self.load()
        grouped = self.group()
        leads = [self.lead(m, d, i + 1) for i, (m, d) in enumerate(sorted(grouped, key=lambda g: (g[0][0]["campaign"], g[0][0]["source"], g[0][0]["row"])))]

        mva_spend = self.daily_spend("mva_daily", "Ad_Spend_numbers", {
            "spend": {"google": "Google Spend", "meta_btl": "Meta BTL Spend", "meta_rt": "Meta RT Spend", "total": "Total Spend"},
            "delivery": {"google_impressions": "Google Impr", "google_clicks": "Google Clicks", "google_conversions": "Google Conv",
                         "meta_impressions": "Meta Impr", "meta_clicks": "Meta Clicks", "meta_leads": "Meta Leads"}, "total": "Total Spend"})
        la_spend = self.daily_spend("la_county", "Ad_Spend_numbers", {
            "spend": {"meta": "Spend", "total": "Spend"},
            "delivery": {"impressions": "Impressions", "reach": "Reach", "clicks": "Clicks", "link_clicks": "Link Clicks",
                         "landing_page_views": "Landing Page Views", "meta_leads": "Meta Leads"}, "total": "Spend"})
        mk_source, mk_by_day, mk_campaigns = self.marketing_tab()
        primary = {e["date"]: e["spend"]["total"] for e in mva_spend["daily"]}
        overlap = sorted(set(primary) & set(mk_by_day))
        differing = [{"date": d, "daily_sheet_usd": primary[d], "marketing_tab_usd": mk_by_day[d]}
                     for d in overlap if primary[d] is not None and abs(primary[d] - mk_by_day[d]) >= 0.01]
        corroboration = {"source": mk_source, "period": self.period(list(mk_by_day)), "total_usd": round(sum(mk_by_day.values()), 2),
                         "overlap_days": len(overlap), "days_differing": differing,
                         "note": "Second spend source for the same campaign. Shown for comparison; never added to the primary total."}

        creative = {
            "mva": [{"label": "Arizona MVA · August 2026 campaign artwork", "asset": "phillips-mva-august-2026-historical-creative.jpeg",
                     "limits": "Planned August 24 launch. Delivery and individual lead attribution unavailable."}],
            "la_county": [{"label": "LA County · May 2026 Facebook preview", "asset": "phillips-la-county-may-2026-facebook-preview.png",
                           "limits": "Historical campaign association. Individual lead attribution unavailable."}],
        }

        campaigns = []
        for key, label in CAMPAIGNS.items():
            mine = [l for l in leads if l["campaign"] == key]
            counted = [l for l in mine if not l["excluded"]]
            if not mine and key not in ("mva", "la_county"):
                continue
            spend = mva_spend if key == "mva" else la_spend if key == "la_county" else None
            gaps = []
            if spend:
                if spend["days_missing"]:
                    gaps.append({"kind": "spend_days_missing", "detail": f"{len(spend['days_missing'])} day(s) inside the reported period have no spend row.", "dates": spend["days_missing"]})
                if spend["days_blank"]:
                    gaps.append({"kind": "spend_days_blank", "detail": f"{len(spend['days_blank'])} day(s) have a row but no spend value.", "dates": spend["days_blank"]})
                if spend["sheet_total_matches"] is False:
                    gaps.append({"kind": "sheet_total_mismatch", "detail": f"Sheet TOTAL row ({spend['sheet_total']['spend_usd']}) differs from the sum of daily rows ({spend['total_usd']})."})
                gaps.append({"kind": "spend_after_period", "detail": f"No spend source covers dates after {spend['period']['end']}."})
            else:
                gaps.append({"kind": "spend_unavailable", "detail": "No spend source exists for these intakes; they were not generated by a tracked paid campaign in these workbooks."})
            if key == "mva":
                gaps.append({"kind": "calls_unlinked", "detail": "AI intake calls are logged without lead IDs and are not attached to leads."})
                if differing:
                    gaps.append({"kind": "spend_sources_differ", "detail": f"Marketing tab and daily spend sheet differ on {len(differing)} of {len(overlap)} overlapping day(s)."})
            no_date = sum(1 for l in counted if not (l["submitted_at"] or l["firm_created_date"] or l["handoff"]["ledger_sent"]))
            if no_date:
                gaps.append({"kind": "lead_dates_missing", "detail": f"{no_date} lead(s) have no submission, firm-created or sent date in any source."})
            unattr = sum(1 for l in counted if l["attribution"]["state"] == "unavailable")
            if unattr:
                gaps.append({"kind": "attribution_unavailable", "detail": f"{unattr} lead(s) have no explicit ad, UTM or call-tracking record."})

            status_counts = collections.Counter(l["firm"]["current_status"] or "No status" for l in counted)
            missing_feedback = [{"lead": l["key"], "ids": l["ids"], "status": l["firm"]["current_status"], "action": l["next_action"]["action"], "owner": l["next_action"]["owner"]}
                                for l in counted if l["next_action"]["kind"] in ("missing_feedback", "signed_proof", "delivery")]
            data_issues = [{"kind": "status_conflict", "detail": f"{sum(1 for l in mine if l['firm']['conflict'])} lead(s) show different firm statuses in different sources; latest source shown, all kept."}] \
                if any(l["firm"]["conflict"] for l in mine) else []
            amb = [l for l in mine if l["dedupe"]["state"] == "ambiguous"]
            if amb:
                data_issues.append({"kind": "ambiguous_match", "detail": f"{len(amb)} record(s) held unresolved: explicit IDs conflict within one tab."})
            firm_dups = sum(1 for l in mine if (l["firm"]["turn_down_reason"] or "") == "Duplicate")
            if firm_dups:
                data_issues.append({"kind": "firm_marked_duplicate", "detail": f"{firm_dups} intake(s) closed by the firm as Duplicate. Not merged: no shared explicit ID."})
            floats = sum(1 for l in mine if l["float_id_unusable"])
            if floats:
                data_issues.append({"kind": "id_precision_lost", "detail": f"{floats} lead ID(s) are stored as numbers and lost precision; not used for matching."})
            data_issues += [{"kind": g["kind"], "detail": g["detail"]} for g in gaps]

            campaigns.append({
                "key": key, "label": label, "default": key == "mva",
                "planned_budget": dict(state="known", **MVA_PLAN) if key == "mva" else {"state": "unknown", "note": "No planned budget in any source."},
                "spend": ({k: spend[k] for k in ("source", "period", "days_reported", "days_missing", "days_blank", "total_usd", "by_channel", "sheet_total", "sheet_total_matches")}
                          | {"state": "known_partial" if spend["days_missing"] or spend["days_blank"] else "known"}) if spend else {"state": "unknown"},
                "spend_corroboration": corroboration if key == "mva" else None,
                "daily": spend["daily"] if spend else [],
                "performance": mk_campaigns if key == "mva" else None,
                "coverage_gaps": gaps,
                "leads_summary": {"records": len(mine), "counted": len(counted), "excluded": len(mine) - len(counted),
                                  "statuses": dict(status_counts.most_common()),
                                  "handoff": dict(collections.Counter(l["handoff"]["state"] for l in counted)),
                                  "retainer_sent_or_flagged": sum(1 for l in counted if l["firm"]["retainer"]["sent_date"] or l["firm"]["retainer"]["agreement_flag"]),
                                  "signed_verified": None, "signed_note": SIGNED_NOTE},
                "calls": self.calls if key == "mva" else None,
                "raw_intake_logs": [r for r in self.raw_logs if r["campaign"] == key],
                "creative": creative.get(key, []),
                "next_steps": {"missing_feedback": missing_feedback, "data_issues": data_issues},
            })
        return {"schema": SCHEMA, "projector_version": VERSION, "generated_at": now,
                "privacy": "Deidentified: no names, phones, emails, locations, ages, narratives, notes, IPs or click IDs.",
                "dedupe_policy": "Records merge only on a shared explicit source ID. Conflicts within one tab are held unresolved. Phone or name similarity is never used.",
                "sources": self.sources, "campaigns": campaigns, "leads": leads}


FORBIDDEN_KEYS = {"name", "full_name", "client", "phone", "phone_number", "email", "details", "location", "age", "ip", "clid", "notes", "raw"}


def assert_deidentified(obj, path="$"):
    if isinstance(obj, dict):
        for k, v in obj.items():
            assert k.lower() not in FORBIDDEN_KEYS, f"forbidden key {path}.{k}"
            assert_deidentified(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            assert_deidentified(v, f"{path}[{i}]")
    elif isinstance(obj, str):
        assert not re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", obj), f"email-like value at {path}"
        assert not re.search(r"\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b", obj), f"phone-like value at {path}"


def main():
    ap = argparse.ArgumentParser()
    for k in WORKBOOKS:
        ap.add_argument(f"--{k.replace('_', '-')}", required=True, type=pathlib.Path)
    ap.add_argument("--modified", required=True, help="JSON {workbook: modifiedTime} from Drive metadata")
    ap.add_argument("--output", required=True, type=pathlib.Path)
    ap.add_argument("--now", default=dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    a = ap.parse_args()
    out = a.output.resolve()
    tmp = pathlib.Path(tempfile.gettempdir()).resolve()
    for p in [out, *(getattr(a, k).resolve() for k in WORKBOOKS)]:
        # Inputs hold claimant data; the output is protected. Both stay in non-synced temp storage, outside Git.
        assert p.is_relative_to(tmp) or p.is_relative_to(pathlib.Path("/private/tmp")), f"{p} must be in system temporary storage"
        assert not any((q / ".git").exists() for q in p.parents), f"{p} is inside a Git checkout"
    paths = {k: getattr(a, k) for k in WORKBOOKS}
    result = Projector(paths, json.loads(a.modified)).build(a.now)
    assert_deidentified(result)
    out.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(out, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(result, f, indent=1)
    summary = {c["key"]: {"leads": c["leads_summary"]["counted"], "excluded": c["leads_summary"]["excluded"], "spend": c["spend"].get("total_usd"),
                          "spend_period": c["spend"].get("period"), "gaps": len(c["coverage_gaps"]), "missing_feedback": len(c["next_steps"]["missing_feedback"])}
               for c in result["campaigns"]}
    print(json.dumps({"output": str(out), "sources": len(result["sources"]), "source_rows": sum(s["rows"] for s in result["sources"]),
                      "leads": len(result["leads"]), "campaigns": summary}, indent=1))


if __name__ == "__main__":
    main()
