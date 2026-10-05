"""Writes three SYNTHETIC workbooks shaped like the original Phillips sources. No real records."""
import datetime as dt, sys, openpyxl
out = sys.argv[1]
LEDGER = ['Intake: Created Date', 'Intake: Intake Name', 'Case Type', 'Matter', 'Client', 'Source', 'Phone', 'Co Counsel Status', 'PLG QC Status',
          'Replacement Requested?', 'Replacement Reason', 'Date Replacement Requested', 'Retainer Sent Date by Source', 'Status', 'Turn Down Reason',
          'Turn Down Details', 'Age', 'Clid', 'Channel', 'Lead/Call ID', 'Sent/Logged']
SENT = ['timestamp', 'LeadID', 'Name', 'phone', 'email', 'message', 'log_id', 'is_success', 'intakeID', 'AccounteId', 'Litify Intake', 'Litify Status (7/13 sync)', 'Turn Down Reason', 'Turn Down Details / Notes']
FB = ['id', 'created_time', 'ad_id', 'ad_name', 'adset_id', 'adset_name', 'campaign_id', 'campaign_name', 'form_id', 'form_name', 'is_organic', 'platform', 'full_name', 'email', 'phone_number', 'lead_status']
D = lambda m, d: dt.datetime(2026, m, d)
def book(path, tabs):
    wb = openpyxl.Workbook(); wb.remove(wb.active)
    for name, head, rows in tabs:
        ws = wb.create_sheet(name); ws.append(head)
        for r in rows: ws.append(r)
    wb.save(path)
def ledger(day, intake, lead, status, channel, reason=None, **kw):
    r = dict.fromkeys(LEDGER); r.update({'Intake: Created Date': day, 'Intake: Intake Name': intake, 'Case Type': 'Auto (AA)', 'Client': 'SYNTHETIC PERSON',
         'Source': 'Marketing Apes', 'Phone': '(602) 555-0101', 'Status': status, 'Turn Down Reason': reason, 'Turn Down Details': 'SYNTHETIC NARRATIVE',
         'Channel': channel, 'Lead/Call ID': lead, 'Sent/Logged': day}); r.update(kw); return [r[h] for h in LEDGER]
book(f'{out}/mva.xlsx', [
    ('All_leads', LEDGER, [
        ledger(D(7, 8), 'INT-000000000001', 'FBL1000000000000001', 'Chasing', 'DELIVERED — FB Checklist'),
        ledger(D(7, 8), 'INT-000000000002', 'PLGSYNTH02', 'Turned Down', 'DELIVERED — LP Form', 'Client unresponsive'),
        ledger(D(7, 9), 'None', 'CallRail', None, 'CALL-IN — Google Ads', **{'Source': 'CallRail 1m — Search Exact'}),
        ledger(D(7, 9), 'None', 'FBL1000000000000009', 'NOT SENT — backlog', 'UNSENT FB LEAD'),
        ledger(D(7, 9), 'None', 'PLGSYNTH05', None, 'TEST/SPAM — TEST'),
        ledger(D(7, 10), 'INT-000000000006', 'PLGSYNTH06', 'Chasing', 'DELIVERED — LP Form'),
        ledger(D(7, 10), 'INT-000000000007', 'PLGSYNTH06', 'Turned Down', 'DELIVERED — LP Form', 'Duplicate'),
    ]),
    ('sent_records', SENT, [[D(7, 8), 'FBL1000000000000001', 'SYNTHETIC PERSON', '16025550101', 'synthetic@example.com', 'Success', None, True, 'a0C', '001', 'INT-000000000001', 'Chasing', None, None]]),
    ('Raw', ['date', 'source', 'raw', 'process', 'to'], [[D(7, 8), 'FBLEADAD', '{"phone":"6025550101"}', None, None]]),
    ('Marketing', ['Date', 'Platform', 'Campaign', 'Spend', 'Impressions', 'Clicks', 'CPC', 'Leads', 'CPL'],
     [[D(7, 1), 'Facebook Ads', 'Synthetic Checklist', 10, 100, 2, 5, 1, 10], [D(7, 2), 'Facebook Ads', 'Synthetic Checklist', 25, 100, 2, 5, 1, 10]]),
    ('fb_lead', FB, [['l:1000000000000001', '2026-07-08T10:00:00', '9001', 'FB-Optin', '9002', 'set', '9003', 'Synthetic Checklist', '9004', 'form', 'false', 'fb', 'SYNTHETIC PERSON', 'synthetic@example.com', '+16025550101', 'signed']]),
    ('fb_lead_updated', FB, []),
    ('Vapi', ['logged_at', 'call_id', 'direction', 'started_at_az', 'duration_sec', 'ended_reason', 'assistant', 'customer_phone', 'first_name', 'case_type', 'what_happened',
              'incident_date', 'injured', 'has_attorney', 'qualified', 'transferred', 'routing', 'outcome_tag', 'disqualify_reason', 'next_step_promised', 'callrail_recorded',
              'recording_url', 'source_campaign', 'vapi_cost'],
     [['x', 'c1', 'inbound', '2026-07-09 10:00', 60, 'customer-ended-call', 'a', '+16025550101', 'SYNTHETIC', 'auto', 'SYNTHETIC NARRATIVE', '', '', '', True, 'TRUE', 'phillips_send', 'qualified', '', '', '', 'https://example.invalid/rec', '', 0.1]]),
])
spend = ['Date', 'Day', 'Status', 'Google Spend', 'Meta BTL Spend', 'Meta RT Spend', 'Total Spend', 'Google Impr', 'Google Clicks', 'Google Conv', 'Meta Impr', 'Meta Clicks', 'Meta Leads', 'Notes']
book(f'{out}/az-mva.xlsx', [
    ('All_Leads', LEDGER, [ledger(D(7, 8), 'INT-000000000001', 'FBL1000000000000001', 'Turned Down', 'DELIVERED — FB Checklist', 'Not Looking To Hire A Lawyer')]),
    ('RAW', LEDGER[:17], [
        ledger(D(7, 8), 'INT-000000000001', None, 'Turned Down', None)[:17],
        [D(5, 12), 'INT-000000000100', 'Sex Abuse - Sexual Assault LA County', 'MAT-000000000100', 'SYNTHETIC PERSON', 'Marketing Apes', '213-555-0100', 'Pending Verification', None, 'No', None, None, D(5, 19), 'Converted', None, 'SYNTHETIC NARRATIVE', 40],
        [D(9, 1), 'INT-000000000200', 'Mass Tort - Weight Loss Drugs', None, 'SYNTHETIC PERSON', 'Marketing Apes Deadleads', '213-555-0101', None, None, None, None, None, None, 'Auto Chasing', None, None, None],
    ]),
    ('Ad_Spend_numbers', spend, [
        [D(7, 1), 'Wed', 'Active', 0, 10, 0, 10, 0, 0, 0, 100, 2, 1, 'Call from SYNTHETIC PERSON'],
        [D(7, 2), 'Thu', 'Active', 5, 20, 0, 25, 1, 1, 0, 100, 2, 1, None],
        [D(7, 4), 'Sat', 'Active', 0, 7.5, 0, 7.5, 0, 0, 0, 100, 2, 1, None],
        ['TOTAL (7/1–7/4)', None, None, None, None, None, 42.5, None, None, None, None, None, None, None],
    ]),
    ('sent_records', SENT, []),
])
LA = ['Can', 'ID', 'Name', 'Email', 'Phone', 'Location', 'Age', 'Best Time To Talk', 'Sexually Abused', 'Preffered method of comm', 'Details', 'Contacted', 'Sent Date',
      'Intake:CreatedDate', 'Case Type', 'Intake: Intake Name', 'Status', 'Turn Down reason', 'Retainer Agreement', 'CHECKBOX COPY', 'URL', 'utm_source', 'utm_medium',
      'utm_campaign', 'utm_id', 'utm_content', 'trust_term', 'clid', 'ip']
def la(when, lead, intake, status, reason=None, retainer=None):
    r = dict.fromkeys(LA); r.update({'Can': when, 'ID': lead, 'Name': 'SYNTHETIC PERSON', 'Email': 'synthetic@example.com', 'Phone': '213-555-0100', 'Location': 'Synthetic City',
         'Age': 40, 'Sexually Abused': 'Yes', 'Preffered method of comm': 'Text', 'Details': 'SYNTHETIC NARRATIVE', 'Contacted': 'Yes', 'Intake:CreatedDate': when,
         'Case Type': 'Sex Abuse - Sexual Assault LA County', 'Intake: Intake Name': intake, 'Status': status, 'Turn Down reason': reason, 'Retainer Agreement': retainer,
         'utm_source': 'facebook', 'utm_campaign': 'Synthetic LA', 'utm_content': 'Image-Ad_1', 'clid': 'fbclid-synthetic', 'ip': '203.0.113.9'}); return [r[h] for h in LA]
book(f'{out}/la-county.xlsx', [
    ('All_Leads', LA, [la(D(5, 12), 'PLGLASYN01', 'INT-000000000100', 'Converted', retainer='Yes'),
                       la(D(5, 13), 'PLGLASYN02', 'INT-000000000101', 'Turned Down', 'Do Not Qualify — SYNTHETIC NARRATIVE')]),
    ('RAW', ['DATE', 'DATA', 'DONE'], [[D(5, 12), '{"name":"SYNTHETIC PERSON"}', 'yes']]),
    ('Ad_Spend_numbers', ['Date', 'Day', 'Status', 'Spend', 'Impressions', 'Reach', 'Frequency', 'Clicks', 'Link Clicks', 'Landing Page Views', 'CTR (%)', 'CPC', 'CPM', 'Meta Leads', 'Meta CPL', 'Notes'],
     [[D(5, 12), 'Tue', 'Active', 30, 1000, 900, 1.1, 10, 8, 6, 1, 3, 30, 1, 30, None], [D(5, 13), 'Wed', 'Active', 20, 1000, 900, 1.1, 10, 8, 6, 1, 3, 30, 1, 20, None],
      ['TOTAL', None, None, 51, None, None, None, None, None, None, None, None, None, None, None, None]]),
    ('sent_records', ['LeadId', 'Name', 'phone', 'email', 'message', 'log id', 'is Success', 'IntakeId', 'Accountid'],
     [['PLGLASYN01', 'SYNTHETIC PERSON', '2135550100', 'synthetic@example.com', 'Success', None, True, 'a0C', '001'],
      ['PLGLASYN99', 'SYNTHETIC PERSON', '2135550199', 'synthetic@example.com', 'Success', None, True, 'a0C', '001']]),
])
# Synthetic Litify daily export and platform spend pull.
import csv, json
with open(f'{out}/litify.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f); w.writerow(LEDGER[:17])
    w.writerow(['10/1/2026', 'INT-000000000001', 'Auto (AA)', '', 'SYNTHETIC PERSON', 'Marketing Apes', '(602) 555-0101', '', '', 'No', '', '', '', 'Turned Down', 'Client unresponsive', 'SYNTHETIC NARRATIVE', ''])
    for i in range(3):
        w.writerow(['5/21/2026', f'INT-00000000030{i}', 'Mass Tort - Weight Loss Drugs', '', 'SYNTHETIC PERSON', 'Marketing Apes Deadleads', '(602) 555-0102', '', '', '', '', '', '', 'Turned Down', 'Bad Lead Gen', '', ''])
    w.writerow(['7/27/2026', 'INT-000000000400', 'Spam', '', 'SYNTHETIC PERSON', 'Marketing Apes', '(602) 555-0103', '', '', '', '', '', '', 'Turned Down', 'Spam', '', ''])
json.dump({"schema": "ee.provider_spend_pull/v1", "window": {"start": "2026-04-01", "end": "2026-10-04"}, "pulled_at": "2026-10-05T03:00:00Z",
           "accounts_checked": [{"platform": "meta", "account_id": "1", "result": "rows"}, {"platform": "meta", "account_id": "2", "result": "no rows returned (not proof of zero)"}],
           "rows": [{"platform": "google", "account_id": "1", "account": "Synthetic", "campaign_id": "11", "campaign": "GLP1-Vision", "month": "2026-04", "spend_usd": 200.0},
                    {"platform": "meta", "account_id": "1", "account": "Synthetic", "campaign_id": "12", "campaign": "LA County Sex Abuse", "month": "2026-05", "spend_usd": 100.0},
                    {"platform": "meta", "account_id": "1", "account": "Synthetic", "campaign_id": "13", "campaign": "PLG | AZ MVA-PI | Retargeting", "month": "2026-07", "spend_usd": 50.5},
                    {"platform": "meta", "account_id": "1", "account": "Synthetic", "campaign_id": "14", "campaign": "VS — Viatical", "month": "2026-05", "spend_usd": 5.0},
                    {"platform": "meta", "account_id": "1", "account": "Synthetic", "campaign_id": "15", "campaign": "Old campaign", "month": "2026-03", "spend_usd": 999.0}]}, open(f'{out}/spend.json', 'w'))
