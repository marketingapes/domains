import { createHash, randomUUID } from 'node:crypto';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const scopeHash = item => hash([item.tenant_id, item.item_id, item.assigned_to, item.action, item.version,
  item.artifact_sha256, item.artifact_ref, item.campaign_id, item.title, item.summary]);
const error = (status, message) => Object.assign(new Error(message), { status });
export function memoryAudit() {
  let revision = 0; const events = [];
  return {
    snapshot: async () => ({ revision, events: structuredClone(events) }),
    append: async (expected, event) => {
      if (revision !== expected) throw error(409, 'Audit changed; refresh before deciding.');
      events.push(structuredClone(event)); revision++; return revision;
    }
  };
}
// Neither Sheets cells nor caller-supplied actor values are an authorization boundary.
// The sole runnable implementation uses server-owned synthetic identities and ephemeral audit.
export function createReviewService({ enabled = false, mode, readCurrent, resolveActor,
  audit, now = () => new Date() } = {}) {
  async function actor(context) {
    if (!enabled || mode !== 'LOCAL_MOCK_ONLY') throw error(503, 'Prototype disabled.');
    const a = await resolveActor(context);
    if (!a || a.mode !== 'LOCAL_MOCK_ONLY' || !a.subject || !a.tenantId ||
        !Array.isArray(a.itemIds) || !Array.isArray(a.actions) ||
        !Number.isFinite(Date.parse(a.expiresAt)) || Date.parse(a.expiresAt) <= now().getTime())
      throw error(401, 'Verified recipient session required.');
    return a;
  }
  const owns = (a, i) => i.tenant_id === a.tenantId && i.assigned_to === a.subject && a.itemIds.includes(i.item_id) && a.actions.includes(i.action);
  function project(i, events) {
    const digest = scopeHash(i);
    const latest = events.filter(e => e.item_id === i.item_id).at(-1);
    // Explicit allowlist: names/phone/email and arbitrary workbook columns never pass through.
    return { item_id: i.item_id, title: i.title, action: i.action, version: i.version,
      artifact_sha256: i.artifact_sha256,
      summary: i.summary, content_hash: digest,
      decision: latest?.approved_scope_hash === digest ? latest.decision : 'pending',
      stale_decision: Boolean(latest && latest.approved_scope_hash !== digest) };
  }
  async function view(context) {
    const a = await actor(context), current = await readCurrent(), snapshot = await audit.snapshot();
    if (current.mode !== 'LOCAL_MOCK_ONLY' || current.tenant_id !== a.tenantId) throw error(503, 'Unsupported source mode.');
    const visible = current.items.filter(i => owns(a, i));
    const ids = new Set(visible.map(i => i.item_id));
    return { mode: 'LOCAL_MOCK_ONLY', actor: a.subject, source_label: current.source_label,
      source_as_of: current.source_as_of, sheet_revision: current.sheet_revision,
      audit_revision: snapshot.revision, items: visible.map(i => project(i, snapshot.events)),
      events: snapshot.events.filter(e => ids.has(e.item_id)).map(e => ({
        event_id: e.event_id, item_id: e.item_id, actor_id: e.actor_id, decision: e.decision,
        decided_at: e.decided_at, item_version: e.item_version, approved_scope_hash: e.approved_scope_hash
      })) };
  }
  async function decide(context, input) {
    const allowedKeys = ['item_id','decision','content_hash','sheet_revision','audit_revision','idempotency_key'];
    if (!input || Object.keys(input).some(k => !allowedKeys.includes(k)) ||
        !['approved','changes_requested'].includes(input.decision) ||
        !/^[a-zA-Z0-9_-]{8,128}$/.test(input.idempotency_key || '')) throw error(400, 'Invalid review request.');
    const a = await actor(context), current = await readCurrent(), snapshot = await audit.snapshot();
    if (current.mode !== 'LOCAL_MOCK_ONLY' || current.tenant_id !== a.tenantId) throw error(503, 'Unsupported source mode.');
    const item = current.items.find(i => i.item_id === input.item_id && owns(a, i));
    if (!item) throw error(404, 'Review item unavailable.');
    const fingerprint = hash([a.subject, input.item_id, input.decision, input.content_hash, input.sheet_revision]);
    const prior = snapshot.events.find(e => e.idempotency_key === input.idempotency_key);
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw error(409, 'Review key already used.');
      // A replay cannot resurrect approval after source/version or recipient changes.
      if (input.content_hash !== scopeHash(item) || input.sheet_revision !== current.sheet_revision)
        throw error(409, 'Source changed; refresh before deciding.');
      return { event_id: prior.event_id, duplicate: true, execution_authorized: false };
    }
    if (input.content_hash !== scopeHash(item) || input.sheet_revision !== current.sheet_revision ||
        input.audit_revision !== snapshot.revision) throw error(409, 'Source or audit changed; refresh before deciding.');
    // Recheck identity/source after awaited reads; do not record a stale or revoked decision.
    const freshActor = await actor(context), fresh = await readCurrent();
    const freshItem = fresh.items.find(i => i.item_id === item.item_id && owns(freshActor, i));
    if (fresh.mode !== 'LOCAL_MOCK_ONLY' || fresh.tenant_id !== a.tenantId || freshActor.tenantId !== a.tenantId || freshActor.subject !== a.subject || !freshItem ||
        scopeHash(freshItem) !== input.content_hash || fresh.sheet_revision !== input.sheet_revision)
      throw error(409, 'Review scope changed; refresh before deciding.');
    const event = { event_id: randomUUID(), tenant_id: a.tenantId, request_id: item.item_id,
      item_id: item.item_id, actor_id: a.subject, decision: input.decision, decided_at: now().toISOString(),
      item_version: item.version, approved_scope_hash: input.content_hash, evidence_url: item.artifact_ref,
      sheet_revision: current.sheet_revision, idempotency_key: input.idempotency_key, fingerprint,
      mode: 'LOCAL_MOCK_ONLY', execution_authorized: false };
    await audit.append(snapshot.revision, event);
    return { event_id: event.event_id, duplicate: false, execution_authorized: false };
  }
  return { view, decide };
}
