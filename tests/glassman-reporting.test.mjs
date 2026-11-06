import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summary } from '../btl/glassman/reporting/model.js';
const dir = new URL('../btl/glassman/reporting/', import.meta.url);
const read = name => readFileSync(new URL(name, dir), 'utf8');
const good = () => ({schema: 'glassman-reporting-summary/v1', status: 'ok', client: 'glassman', refresh_mode: 'on_demand',
  source_as_of: '2026-11-06T03:00:00Z', counts: {recorded_web_intake_events: 3, production_web_intake_events: 0, synthetic_test_events: 3},
  limit: {event_bound: 900, reached: false}, freshness: {status: 'fresh'}});
const now = Date.parse('2026-11-06T04:00:00Z');
test('fresh, stale and bounded counts preserve zero production and exclude test events', () => {
  assert.deepEqual(summary(good(), now), {total:3, production:0, synthetic:3, asOf:'2026-11-06T03:00:00Z', bound:900, limited:false, stale:false});
  assert.equal(summary(good(), now+2*86400000).stale, true);
  assert.equal(summary({...good(), limit:{event_bound:3,reached:true}}, now).limited, true);
});
test('invalid schemas, tenants, numbers, count relationships and dates fail closed', () => {
  for (const patch of [{schema:'other'}, {client:'plg'}, {refresh_mode:'auto'}, {counts:null}, {source_as_of:'tomorrow'}, {source_as_of:'2027-01-01T00:00:00Z'}, {limit:{event_bound:2,reached:false}}]) assert.throws(() => summary({...good(),...patch}, now));
  for (const n of [true, -1, 1.5, '3', NaN, Infinity, 10000001]) assert.throws(() => summary({...good(),counts:{...good().counts, recorded_web_intake_events:n}}, now));
  assert.throws(() => summary({...good(),counts:{...good().counts,production_web_intake_events:3}}, now));
});
test('public reporting assets contain no private identifiers or embedded counts and have a narrow CSP', () => {
  for (const file of ['index.html','model.js','reporting.js','reporting.css']) {
    assert.doesNotMatch(read(file), /1KWy3H5x|docs\.google\.com|sheets\.googleapis|GLASSMAN-SSDI-002|raw_lead_events|last_make_execution|localStorage|sessionStorage|document\.cookie|console\./i, file);
  }
  const html = read('index.html');
  assert.match(html, /connect-src https:\/\/perspective-s3b8\.onrender\.com;/);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /id="summary" hidden/);
  assert.match(html, /id="production"><\/span>/);
  assert.match(html, /on demand|on-demand/);
});
