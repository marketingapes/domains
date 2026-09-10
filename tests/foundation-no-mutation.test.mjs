// Foundation v1.2 guard: the campaign-system build must never write tenant state.
//
// campaign-system/build.mjs used to inject a `campaign_studio` object into
// <brand>/domain.json. Under v1.2 that key is invalid by shape, so running the
// campaign build silently invalidated 6 of the 14 frozen manifests. This test
// runs the real build in a throwaway tree and fails if any manifest moves a byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CANON = ['btl','nil','dihac','lfma','ma','kg','sliq','cgg','ddm','fplb','px','ri','tnt','toss'];
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

test('campaign-system build does not mutate any tenant domain.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-build-'));
  try {
    fs.cpSync(path.join(ROOT, 'campaign-system'), path.join(tmp, 'campaign-system'), {recursive: true});
    const before = {};
    // every folder holding a domain.json, canonical or not (lee included)
    for (const d of fs.readdirSync(ROOT)) {
      const src = path.join(ROOT, d, 'domain.json');
      if (!fs.existsSync(src)) continue;
      fs.mkdirSync(path.join(tmp, d), {recursive: true});
      fs.copyFileSync(src, path.join(tmp, d, 'domain.json'));
      before[d] = sha(src);
    }
    for (const t of CANON) {
      assert.ok(before[t], `${t}/domain.json must exist to be guarded`);
    }

    execFileSync(process.execPath, ['campaign-system/build.mjs'], {cwd: tmp, stdio: 'pipe'});

    const moved = [];
    for (const [d, hash] of Object.entries(before)) {
      if (sha(path.join(tmp, d, 'domain.json')) !== hash) moved.push(d);
    }
    assert.deepEqual(moved, [], `campaign build mutated domain.json for: ${moved.join(', ')}`);
  } finally {
    fs.rmSync(tmp, {recursive: true, force: true});
  }
});

test('no tenant manifest declares campaign or runtime state', () => {
  const FORBIDDEN = ['campaign_id','campaigns','campaign_studio','active_campaign',
                     'lead_lane','buyer','buyer_id','offer','budget','routing','route'];
  const hunt = (node, trail = []) => {
    if (Array.isArray(node)) return node.flatMap((v, i) => hunt(v, [...trail, i]));
    if (node && typeof node === 'object') {
      return Object.entries(node).flatMap(([k, v]) =>
        FORBIDDEN.includes(k) ? [[...trail, k].join('.')] : hunt(v, [...trail, k]));
    }
    return [];
  };
  for (const t of CANON) {
    const hits = hunt(JSON.parse(fs.readFileSync(path.join(ROOT, t, 'domain.json'))));
    assert.deepEqual(hits, [], `${t}/domain.json carries campaign/runtime keys: ${hits.join(', ')}`);
  }
});
