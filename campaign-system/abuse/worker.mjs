import { BUILD_STEPS, checkAdsAgainstPages, checkTemplates, readiness } from './machine.mjs';
import { createHash } from 'node:crypto';
// Only deterministic local artifact handlers. No provider action handlers are accepted by the CLI.
export function createDraftWorker({ store, queue, handlers, maxAttempts = 3 }) {
  return { async run(order) {
    const results = [];
    for (const step of BUILD_STEPS) {
      const lockKey = `draft-worker:${order.tenant}:${order.campaign_id}:${order.spec_revision}:${order.order_id}:${step}`;
      const locked = await store.withLock(lockKey, async () => {
        const job = (await queue.status(order)).jobs.find(j => j.step === step);
        if (job.state === 'done') return { step, duplicate:true };
        if (job.state !== 'queued' || job.fixture !== true) throw Error('draft_worker_requires_fixture_job');
        const attemptKey = lockKey + ':attempts';
        const attempts = (await store.get(attemptKey)) || 0;
        if (attempts >= maxAttempts) return { step, state:'failed', owner:'intake-operations', reason:'retry_limit' };
        await store.set(attemptKey, attempts + 1);
        try {
          const artifact = await handlers[step](order);
          const digest = createHash('sha256').update(JSON.stringify(artifact)).digest('hex');
          const evidence = `local:sha256:${digest}`;
          await store.setNx(`artifact:${digest}`, { step, artifact, fixture:true, provider_effect:false });
          await queue.complete(order, step, evidence);
          return { step, state:'done', evidence, fixture:true };
        } catch (e) {
          await store.set(lockKey + ':failure', { reason:e.message, attempt:attempts + 1, owner:'intake-operations' });
          return { step, state:'failed', owner:'intake-operations', reason:e.message };
        }
      });
      results.push(locked.busy ? {step,state:'busy'} : locked.value);
    }
    return { results, activation:false, fixture:true };
  }};
}
export const draftHandlers = ({ templates, blueprint, sofia }) => ({
  pages: () => checkAdsAgainstPages().links,
  ads: () => checkAdsAgainstPages(),
  sofia_context: () => sofia,
  templates: () => ({ validation:checkTemplates(), templates, blueprint }),
  perspective: () => ({ source:'existing private backend adapter', runtime_evidence:null, provider_verified:false }),
  readiness: () => readiness(),
});
