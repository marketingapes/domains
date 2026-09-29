#!/usr/bin/env python3
"""Phillips 5-lane Vapi apply — read-only inventory by default; --create makes the two DRAFT assistants.

Env: VAPI_PRIVATE_KEY (required), TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN (optional, 202 ownership check).
Never prints keys. Never PATCHes existing assistants. Never binds phone numbers. Never places calls.
Writes a rollback/inventory note to vapi/inventory-<date>.json (IDs and names only, no secrets).
"""
import base64, datetime, json, os, sys, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = 'https://api.vapi.ai'
LIVE_NIL = '57f80d14-772c-4ad3-a795-362390a6f556'  # 'NIL — INBOUND — Sofia', bound to +1 602-693-1461 (verified 2026-09-29)
NUMBERS = {'+12029329700': 'BTL canonical', '+16026931461': 'NIL', '+12138787408': 'BTL Paraquat (temp)'}
PLACEHOLDER = '+18888888888'


def vapi(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={'Authorization': 'Bearer ' + os.environ['VAPI_PRIVATE_KEY'],
                                          'Content-Type': 'application/json', 'User-Agent': 'curl/8.7.1'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'{method} {path} -> {e.code}: {e.read().decode()[:600]}') from None


def twilio_owns(number):
    sid, tok = os.environ.get('TWILIO_ACCOUNT_SID'), os.environ.get('TWILIO_AUTH_TOKEN')
    if not (sid and tok):
        return 'NOT CHECKED (no Twilio creds)'
    url = f'https://api.twilio.com/2010-04-01/Accounts/{sid}/IncomingPhoneNumbers.json?' + urllib.parse.urlencode({'PhoneNumber': number})
    req = urllib.request.Request(url, headers={'User-Agent': 'curl/8.7.1', 'Authorization': 'Basic ' + base64.b64encode(f'{sid}:{tok}'.encode()).decode()})
    with urllib.request.urlopen(req, timeout=30) as r:
        found = json.load(r).get('incoming_phone_numbers', [])
    if not found:
        return 'NOT IN THIS TWILIO ACCOUNT'
    n = found[0]
    return f"OWNED (friendly_name={n.get('friendly_name')!r}, voice_url host={urllib.parse.urlparse(n.get('voice_url') or '').netloc or '-'})"


def inventory():
    assistants = vapi('GET', '/assistant?limit=200')
    phones = vapi('GET', '/phone-number?limit=100')
    names = {a['id']: a.get('name') for a in assistants}
    inv = {'at': datetime.datetime.now().isoformat(timespec='seconds'), 'phones': [], 'assistants': [
        {'id': a['id'], 'name': a.get('name'), 'updatedAt': a.get('updatedAt'),
         'toolIds': (a.get('model') or {}).get('toolIds', [])} for a in assistants]}
    for p in phones:
        num = p.get('number')
        row = {'number': num, 'id': p['id'], 'provider': p.get('provider'), 'assistantId': p.get('assistantId'),
               'assistantName': names.get(p.get('assistantId')), 'label': NUMBERS.get(num)}
        if num in ('+12029329700',):
            row['twilio'] = twilio_owns(num)
        inv['phones'].append(row)
    if not any(p['number'] == '+12029329700' for p in inv['phones']):
        inv['phones'].append({'number': '+12029329700', 'label': 'BTL canonical', 'vapi': 'NOT IMPORTED IN VAPI',
                              'twilio': twilio_owns('+12029329700')})
    path = os.path.join(HERE, f"inventory-{inv['at'][:10]}.json")
    json.dump(inv, open(path, 'w'), indent=1)
    return inv, assistants, path


def find_btl_paraquat(assistants):
    for a in assistants:
        n = (a.get('name') or '').lower()
        if 'paraquat' in n and ('v4' in n or 'btl' in n):
            return a
    return None


def draft(fn, src):
    d = json.load(open(os.path.join(HERE, fn)))
    d.pop('_draft', None)
    m = src.get('model') or {}
    d['model']['provider'], d['model']['model'] = m.get('provider'), m.get('model')
    for k in ('transcriber', 'serverUrl', 'server'):
        if src.get(k) and k not in d:
            d[k] = src[k]
    if 'voice' not in d and src.get('voice'):
        d['voice'] = src['voice']
    return d


def transfer_tool(name, description):
    for t in vapi('GET', '/tool?limit=200'):
        if (t.get('function') or {}).get('name') == name:
            return t['id']  # reuse — never create duplicates on re-run
    return vapi('POST', '/tool', {'type': 'transferCall', 'function': {'name': name, 'description': description},
                                  'destinations': [{'type': 'number', 'number': PLACEHOLDER,
                                                    'message': 'Connecting you now. Please hold.',
                                                    'description': 'DRAFT placeholder — Phillips line pending (Kyle gate)'}]})['id']


def main():
    inv, assistants, path = inventory()
    print('inventory ->', os.path.relpath(path, HERE))
    for p in inv['phones']:
        print(' ', p['number'], '->', p.get('assistantName') or p.get('assistantId') or p.get('vapi'), '|', p.get('twilio', ''))
    if '--create' not in sys.argv:
        return
    btl_src = find_btl_paraquat(assistants)
    nil_src = next((a for a in assistants if a['id'] == LIVE_NIL), None)
    if not (btl_src and nil_src):
        sys.exit(f'missing source assistant to copy model from: btl={bool(btl_src)} nil={bool(nil_src)}')
    existing = {a.get('name') for a in assistants}
    made = {}
    for fn, src, tool in (('btl-sofia-phillips-5l.assistant.json', btl_src, 'transfer_btl_phillips_5l'),
                          ('nil-sofia-phillips-5l.assistant.json', nil_src, 'transfer_nil_phillips_5l')):
        body = draft(fn, src)
        if body['name'] in existing:
            print('exists, skipped:', body['name'])
            continue
        body['model']['toolIds'] = [transfer_tool(tool, 'Transfer a consenting, potentially qualified caller to the reviewing firm intake line.')]
        a = vapi('POST', '/assistant', body)
        made[body['name']] = a['id']
        print('created', a['id'], body['name'])
    json.dump({'created': made, 'bound_numbers': 'NONE'}, open(os.path.join(HERE, 'created.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
