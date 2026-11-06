// Only allow validated aggregate counts and timestamps to enter the view.
export function summary(value, now = Date.now()) {
  if (!value || value.schema !== 'glassman-reporting-summary/v1' || value.status !== 'ok' || value.client !== 'glassman' || value.campaign_id !== 'GLASSMAN-SSDI-002' || value.refresh_mode !== 'on_demand') throw Error('Invalid summary');
  const c = value.counts;
  const keys = ['recorded_web_intake_events', 'production_web_intake_events', 'synthetic_test_events'];
  if (!c || keys.some(k => !Number.isSafeInteger(c[k]) || c[k] < 0 || c[k] > 10000000) || c[keys[0]] !== c[keys[1]] + c[keys[2]]) throw Error('Invalid counts');
  const asOf = value.source_as_of;
  if (typeof asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(asOf) || !Number.isFinite(Date.parse(asOf)) || Date.parse(asOf) > now + 300000) throw Error('Invalid time');
  const bound = value.limit?.event_bound;
  if (!Number.isSafeInteger(bound) || bound < 1 || bound > 100000 || c[keys[0]] > bound || value.limit.reached !== (c[keys[0]] === bound)) throw Error('Invalid bound');
  return { total: c[keys[0]], production: c[keys[1]], synthetic: c[keys[2]], asOf, bound, limited: c[keys[0]] === bound,
    stale: now - Date.parse(asOf) > 86400000 || value.freshness?.status === 'stale' };
}
