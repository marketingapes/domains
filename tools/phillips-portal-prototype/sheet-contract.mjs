import { createHash } from 'node:crypto';
export const WORKBOOK = Object.freeze({ spreadsheetId: '1FET1WpeS8bDfPJlkym3lNXYLBaFBhwOtz4kUTl_hDe8',
  mode: 'read_only', tabs: { CurrentState:111482516, Tasks:1163790120, ApprovalRequests:1987353151, ApprovalLog:61984614 } });
// Matches the owner-created workbook contract. Callers must supply the complete actual headers,
// numeric/date column sets and unformatted cells; never infer schema or coerce arbitrary fields.
export function canonicalRow(headers, cells, { numeric = [], dates = [] } = {}) {
  if (!Array.isArray(headers) || new Set(headers).size !== headers.length || headers.some(h => typeof h !== 'string' || !h))
    throw new Error('Exact unique workbook headers required.');
  const row = {};
  for (const name of [...headers].filter(h => h !== 'content_hash').sort()) {
    let value = cells[headers.indexOf(name)] ?? '';
    if (value !== '' && numeric.includes(name)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Unformatted numeric value required: ' + name);
    }
    if (value !== '' && dates.includes(name)) {
      let date;
      if (typeof value === 'number') date = new Date(Date.UTC(1899,11,30) + value * 86400_000);
      else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)) date = new Date(value);
      else throw new Error('Explicit UTC/offset date or Sheets serial required: ' + name);
      if (!Number.isFinite(date.getTime())) throw new Error('Invalid date: ' + name);
      value = date.toISOString().replace(/\.\d{3}Z$/, 'Z');
    }
    if (!['string','number','boolean'].includes(typeof value)) throw new Error('Scalar cell required: ' + name);
    row[name] = value;
  }
  return JSON.stringify(row);
}
export function rowHash(headers, cells, types) { return createHash('sha256').update(canonicalRow(headers,cells,types)).digest('hex'); }
export function verifyRow(headers, cells, types) {
  const at = headers.indexOf('content_hash');
  return at >= 0 && /^[a-f0-9]{64}$/.test(cells[at] || '') && rowHash(headers,cells,types) === cells[at];
}
// No network client or Sheets write adapter. Exact rows/headers, verified server identity,
// access scope and an atomic authoritative audit store are prerequisites to runtime integration.
