#!/usr/bin/env python3
"""Generate the Phillips 5-lane page photos with Leonardo and drop them into the page image slots.

Reads LEONARDO_API_KEY from the environment (source ~/.phillips5.env first). Never prints the key.
Usage: python3 leonardo_gen.py [--dry-run] [lane ...]
Each slot: generate 2 candidates -> save both under imagery/out/<lane>/ -> crop the first to the slot size
(sips) into the served path. Review the candidates and swap if the first is weak.
"""
import json, os, subprocess, sys, time, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(os.path.dirname(__file__), 'out')
API = 'https://cloud.leonardo.ai/api/rest/v1'
MODEL = '05ce0082-2d80-4a2d-8653-4d1c85e2418e'  # Lucid Realism
NEG = ('blood, gore, injury, bruise, graphic, violence, distress, crying, fear, menace, handcuffs, prison bars, '
       'text, words, letters, watermark, logo, brand badge, car badge, uber, lyft, cartoon, illustration, '
       'deformed hands, extra fingers, lowres')

# slot -> (gen w, gen h, final w, final h)
SIZES = {'hero': (1472, 832, 1600, 900), 'hero-900': (832, 1120, 900, 1200), 'card-1': (1024, 768, 800, 600),
         'card-2': (1024, 768, 800, 600), 'card-3': (1024, 768, 800, 600), 'band': (1536, 672, 1600, 700)}

BTL = 'warm golden-hour light, cream and soft gold tones, gentle film grain, calm, dignified, shallow depth of field, photoreal editorial photography'
NIL = 'cool navy blue dusk tones with subtle teal accents, clean modern, calm, photoreal editorial photography'

RIDE = {
  'hero': 'a confident woman walking on a bright city sidewalk seen from behind, morning light, open space, hopeful',
  'hero-900': 'a confident woman walking on a bright city sidewalk seen from behind, morning light, vertical composition',
  'card-1': 'close-up of hands holding a smartphone showing a generic street map, daylight city street softly blurred behind',
  'card-2': 'a calm apartment window at morning with sheer curtains and a plant, soft light, peaceful',
  'card-3': 'two women having a supportive conversation at a cafe table, faces soft and turned away, warm and kind',
  'band': 'a quiet tree-lined city street in morning light, wide and peaceful, no cars in focus',
}
LANES = {
  'btl/sex-abuse-la-county': (BTL, {
    'hero': 'Los Angeles skyline at sunrise seen from a hillside, soft haze, hopeful and quiet',
    'hero-900': 'Los Angeles skyline at sunrise with palm trees, vertical composition, soft haze',
    'card-1': 'an adult sitting by a sunlit window holding a cup of tea, seen from the side, peaceful',
    'card-2': 'quiet California courthouse steps with columns in warm afternoon light, no people',
    'card-3': 'an open journal and a pen on a wooden table beside a window, soft morning light',
    'band': 'wide view of the San Gabriel mountains above Los Angeles at golden hour, calm',
  }),
  'btl/sex-abuse-ca-womens-prisons': (BTL, {
    'hero': 'California Central Valley farmland at dawn, long open road, warm light, sense of freedom',
    'hero-900': 'a woman walking on an open country road toward the sunrise seen from behind, vertical composition',
    'card-1': 'hands wrapped around a coffee mug by a bright window, calm morning',
    'card-2': 'California state courthouse columns in warm light, dignified, no people',
    'card-3': 'a woman standing in an open field at sunrise seen from behind, arms relaxed, peaceful',
    'band': 'wide golden California hills at dawn with soft mist, peaceful',
  }),
  'btl/rideshare-sex-abuse': (BTL, RIDE),
  'nil/rideshare-sex-abuse': (NIL, RIDE),
  'nil/mva-pi': (NIL, {
    'hero': 'a calm city intersection at dusk with soft headlight bokeh, blue hour, no damaged vehicles',
    'hero-900': 'a composed person on a phone call standing beside a parked car at a roadside at dusk, unhurt, vertical composition',
    'card-1': 'a composed adult on the phone beside a parked car on a quiet street, unhurt, early evening',
    'card-2': 'a physical therapy session in a bright clinic, therapist guiding a patient stretch, hopeful',
    'card-3': 'paperwork and a smartphone on a kitchen table in morning light, organized, calm',
    'band': 'a highway curving through hills at blue hour with light trails, wide and calm',
  }),
}
EXTRA = {'nil/assets/sofia/sofia-nil-portrait.jpg': (NIL, 'professional portrait of a friendly woman in her early thirties, '
         'warm smile, navy blazer, soft studio light, navy background with subtle teal rim light, head and shoulders', 576, 1024, 440, 784)}


def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={'Authorization': 'Bearer ' + os.environ['LEONARDO_API_KEY'],
                                          'Content-Type': 'application/json', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def generate(prompt, w, h, n=2):
    gid = call('POST', '/generations', {'modelId': MODEL, 'prompt': prompt, 'negative_prompt': NEG,
                                        'num_images': n, 'width': w, 'height': h})['sdGenerationJob']['generationId']
    for _ in range(40):
        time.sleep(8)
        g = call('GET', f'/generations/{gid}')['generations_by_pk']
        if g['status'] == 'COMPLETE':
            return [i['url'] for i in g['generated_images']]
        if g['status'] == 'FAILED':
            raise RuntimeError(f'generation {gid} failed')
    raise TimeoutError(gid)


def place(urls, stem, dest, fw, fh):
    os.makedirs(os.path.dirname(stem), exist_ok=True)
    cands = []
    for i, u in enumerate(urls):
        p = f'{stem}-{i}.jpg'
        urllib.request.urlretrieve(u, p)
        cands.append(p)
    tmp = stem + '-final.jpg'
    subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '78', '--resampleHeightWidthMax',
                    str(max(fw, fh) * 2), cands[0], '--out', tmp], check=True, capture_output=True)
    # scale to cover then center-crop
    subprocess.run(['sips', '--resampleWidth', str(fw), tmp], check=True, capture_output=True)
    h = int(subprocess.run(['sips', '-g', 'pixelHeight', tmp], capture_output=True, text=True).stdout.split()[-1])
    if h < fh:
        subprocess.run(['sips', '--resampleHeight', str(fh), tmp], check=True, capture_output=True)
    subprocess.run(['sips', '-c', str(fh), str(fw), tmp, '--out', dest], check=True, capture_output=True)
    return cands


def main():
    dry = '--dry-run' in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    jobs = []
    for lane, (style, slots) in LANES.items():
        if only and not any(o in lane for o in only):
            continue
        tenant, slug = lane.split('/')
        for slot, scene in slots.items():
            gw, gh, fw, fh = SIZES[slot]
            jobs.append((f'{scene}, {style}, no text', gw, gh, fw, fh,
                         os.path.join(OUT, tenant, slug, slot), os.path.join(ROOT, tenant, 'assets', 'lanes', slug, f'{slot}.jpg')))
    for dest, (style, scene, gw, gh, fw, fh) in EXTRA.items():
        if not only or any(o in dest for o in only):
            jobs.append((f'{scene}, {style}, no text', gw, gh, fw, fh, os.path.join(OUT, 'nil', 'sofia'), os.path.join(ROOT, dest)))
    if dry:
        for j in jobs:
            print(os.path.relpath(j[6], ROOT), f'{j[1]}x{j[2]} -> {j[3]}x{j[4]}', '|', j[0][:90])
        print(len(jobs), 'jobs')
        return
    me = call('GET', '/me')['user_details'][0]
    print('tokens before:', me.get('apiSubscriptionTokens'), me.get('apiPaidTokens'))
    for prompt, gw, gh, fw, fh, stem, dest in jobs:
        try:
            place(generate(prompt, gw, gh), stem, dest, fw, fh)
            print('ok ', os.path.relpath(dest, ROOT))
        except Exception as e:  # keep going; placeholders stay in place
            print('ERR', os.path.relpath(dest, ROOT), type(e).__name__, e)
    me = call('GET', '/me')['user_details'][0]
    print('tokens after:', me.get('apiSubscriptionTokens'), me.get('apiPaidTokens'))


if __name__ == '__main__':
    main()
