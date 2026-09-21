// Deterministic simulator for the Make flow models under ops/make/.
//
// It is NOT a Make emulator. It models exactly the four behaviours that decide
// whether a receipt can be trusted:
//
//   1. module ORDER (what runs before the caller is told "ok")
//   2. FILTERS (a false filter stops that branch; downstream never runs)
//   3. ONERROR handlers (ignore = bundle dropped, resume = flow continues,
//      null = execution errors and everything after it is skipped)
//   4. SIDE EFFECTS (datastore writes, ledger rows, outbound sends, the
//      webhook response) and the order they land in
//
// Those four are enough to prove or disprove "a success response / a dedup
// marker means the work actually happened", which is the whole question.

export const OUTCOME = {
  COMPLETED: 'completed',
  FILTERED: 'filtered',
  DROPPED: 'dropped', // onerror: ignore — bundle discarded, no retry state
  ERRORED: 'errored', // no handler — execution fails here
};

/**
 * @param {object} model         flow model (see ops/make/*.flow.json)
 * @param {object} opts
 * @param {Set<string>} opts.fail  module ids that fail this run
 * @param {object} opts.store      persistent datastore, carried across runs
 * @param {object} opts.input      trigger bundle (call_id, tenant_id, ...)
 * @param {string} opts.now        ISO timestamp for this run
 */
export function runFlow(model, { fail = new Set(), store = {}, input = {}, now = '2026-09-20T12:00:00Z' } = {}) {
  const effects = [];
  const results = {};
  const nowMs = Date.parse(now);
  let outcome = OUTCOME.COMPLETED;
  let stoppedAt = null;

  const scope = { ...input, now };
  const resolve = (tpl) =>
    String(tpl).replace(/\{(\w+)\}/g, (_, k) => (scope[k] === undefined ? '' : String(scope[k])));

  const halt = (kind, id) => {
    outcome = kind;
    stoppedAt = id;
  };

  // A router's routes are independent branches. A filter or an ignored error
  // inside a route ends that route only; the next route still runs. An
  // unhandled error ends the whole execution, which is exactly why the patched
  // flows put resume handlers on the send modules.
  const steps = [];
  for (const step of model.steps) {
    if (step.kind === 'router' && Array.isArray(step.routes)) {
      steps.push({ ...step, routes: undefined });
      step.routes.forEach((route, i) => steps.push(...route.map((s) => ({ ...s, _route: `${step.id}.${i}` }))));
    } else {
      steps.push(step);
    }
  }

  let skippedRoute = null;

  for (const step of steps) {
    if (outcome !== OUTCOME.COMPLETED) break;

    // still inside a route that was filtered out?
    if (skippedRoute !== null) {
      if (step._route === skippedRoute) continue;
      skippedRoute = null;
    }

    const failed = fail.has(step.id);

    // A guard is a precondition on the step itself, not a Make filter: it
    // models "only write the delivered marker if the send actually returned
    // an id".
    if (step.guard && !evalGuard(step.guard, { results, store, input, nowMs, resolve })) {
      continue;
    }

    switch (step.kind) {
      case 'store.exists': {
        if (failed) {
          applyError(step, halt, results, (r) => { skippedRoute = r; });
          break;
        }
        const key = resolve(step.key);
        results[step.id] = { exist: Object.prototype.hasOwnProperty.call(store, key), key };
        break;
      }

      case 'store.get': {
        if (failed) {
          applyError(step, halt, results, (r) => { skippedRoute = r; });
          break;
        }
        const key = resolve(step.key);
        results[step.id] = { record: store[key] ?? null, key };
        break;
      }

      case 'store.put': {
        if (failed) {
          applyError(step, halt, results, (r) => { skippedRoute = r; });
          break;
        }
        const key = resolve(step.key);
        const value = Object.fromEntries(
          Object.entries(step.value || {}).map(([k, v]) => [k, typeof v === 'string' ? resolve(v) : v]),
        );
        store[key] = { ...value, written_at: now };
        results[step.id] = { key };
        effects.push({ type: 'store.put', id: step.id, key, value: store[key] });
        break;
      }

      case 'filter': {
        if (!evalGuard(step.expr, { results, store, input, nowMs, resolve })) {
          if (step._route) skippedRoute = step._route; // route-local skip
          else halt(OUTCOME.FILTERED, step.id);
        }
        break;
      }

      case 'setvars':
        results[step.id] = { ok: true };
        break;

      case 'query': // BigQuery lookup — enrichment only
        if (failed) {
          applyError(step, halt, results, (r) => { skippedRoute = r; });
          break;
        }
        results[step.id] = { rows: step.rows ?? [] };
        break;

      case 'send': {
        // outbound email / social post / CAPI — the thing a receipt claims
        if (failed) {
          results[step.id] = { id: '', failed: true };
          effects.push({ type: 'send.failed', id: step.id, channel: step.channel, to: step.to });
          applyError(step, halt, results, (r) => { skippedRoute = r; });
          break;
        }
        const messageId = `${step.channel}-${resolve('{call_id}') || 'x'}-${step.id}`;
        results[step.id] = { id: messageId, failed: false };
        effects.push({ type: 'send.ok', id: step.id, channel: step.channel, to: step.to, messageId });
        break;
      }

      case 'ledger': {
        if (failed) {
          applyError(step, halt, results, (r) => { skippedRoute = r; });
          break;
        }
        effects.push({
          type: 'ledger',
          id: step.id,
          channel: step.channel,
          // what the row actually records — the point of the whole exercise
          destination: resolveField(step.destination, { results, input, resolve }),
          status: resolveField(step.status, { results, input, resolve }),
        });
        break;
      }

      case 'respond': {
        effects.push({
          type: 'respond',
          id: step.id,
          status: resolveField(step.status, { results, input, resolve }),
          body: Object.fromEntries(
            Object.entries(step.body || {}).map(([k, v]) => [k, resolveField(v, { results, input, resolve })]),
          ),
        });
        break;
      }

      case 'router':
        break;

      default:
        throw new Error(`unknown step kind: ${step.kind}`);
    }
  }

  return { outcome, stoppedAt, effects, store, results };
}

function applyError(step, halt, results, skipRoute) {
  if (step.onerror === 'ignore') {
    // Ignore discards the bundle. Inside a router route that ends the route;
    // on the main line it ends the execution.
    if (step._route) return skipRoute(step._route);
    return halt(OUTCOME.DROPPED, step.id);
  }
  if (step.onerror === 'resume') {
    results[step.id] = { ...(results[step.id] || {}), resumed: true };
    return;
  }
  return halt(OUTCOME.ERRORED, step.id);
}

// Field values are either literals or "@<moduleId>.<field>" references, or
// "?<guard>:<a>:<b>" conditionals. Keeps the models declarative.
function resolveField(spec, ctx) {
  if (typeof spec !== 'string') return spec;
  if (spec.startsWith('@')) {
    const [id, field] = spec.slice(1).split('.');
    const got = ctx.results[id]?.[field];
    return got === undefined ? '' : got;
  }
  if (spec.startsWith('$')) {
    const v = ctx.input[spec.slice(1)];
    return v === undefined ? '' : v;
  }
  // "?<guard>|<whenTrue>|<whenFalse>" — pipe-separated because guards
  // themselves contain colons (e.g. "sent_ok:2").
  if (spec.startsWith('?')) {
    const [guard, a, b] = spec.slice(1).split('|');
    return evalGuard(guard, ctx) ? a : b;
  }
  return spec;
}

// Named predicates rather than an expression parser: every one of these maps
// to a filter that exists in the real blueprint, and naming them keeps the
// models readable next to the Make UI.
function evalGuard(expr, ctx) {
  const { results, input, nowMs, resolve } = ctx;

  if (expr.startsWith('not_exists:')) return results[expr.split(':')[1]]?.exist === false;
  if (expr.startsWith('exists:')) return results[expr.split(':')[1]]?.exist === true;

  if (expr.startsWith('sent_ok:')) {
    const r = results[expr.split(':')[1]];
    return Boolean(r && r.id && !r.failed);
  }
  if (expr.startsWith('sent_failed:')) {
    const r = results[expr.split(':')[1]];
    return Boolean(r && r.failed);
  }

  // lock is free, or was claimed longer ago than ttlMinutes (previous attempt died)
  if (expr.startsWith('lock_free_or_stale:')) {
    const [, id, ttl] = expr.split(':');
    const rec = results[id]?.record;
    if (!rec) return true;
    return nowMs - Date.parse(rec.claimed_at) >= Number(ttl) * 60_000;
  }

  if (expr.startsWith('input_eq:')) {
    const [, field, want] = expr.split(':');
    return String(input[field] ?? '') === want;
  }
  if (expr.startsWith('input_set:')) {
    const field = expr.split(':')[1];
    return String(input[field] ?? '') !== '';
  }
  if (expr.startsWith('input_in:')) {
    const [, field, list] = expr.split(':');
    return list.split('|').includes(String(input[field] ?? ''));
  }
  if (expr === 'always') return true;
  if (expr.startsWith('resolved:')) return resolve(`{${expr.split(':')[1]}}`) !== '';

  throw new Error(`unknown guard: ${expr}`);
}
