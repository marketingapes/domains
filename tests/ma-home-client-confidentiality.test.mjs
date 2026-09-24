// MAKG-9 (2026-09-23): the public MA homepage must not name a client firm or publish a client's
// cohort results. Kyle can restore specific numbers deliberately; this guards against accidents.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../ma/index.html', import.meta.url), 'utf8');

test('MA homepage does not name the client firm or its cohort results', () => {
  assert.doesNotMatch(home, /phillips/i);
  assert.doesNotMatch(home, /\$3,880|39 leads|19 signed/);
  assert.match(home, /Cheap CPL is not a customer\./);
});
