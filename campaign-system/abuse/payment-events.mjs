// Signed normalized relay seam, NOT a claim of Stripe/QuickBooks native webhook compatibility.
// No keys, connector, HTTP listener or network client is installed. Tests inject ephemeral keys.
import { verify, createPublicKey, createHash } from 'node:crypto';
const sha = x => createHash('sha256').update(x).digest('hex');
export function createPaymentEventAdapter({ store, resolveInvoice, publicKeys = {}, now = () => Date.now() }) {
  return Object.freeze({
    async receive({ raw, signature, keyId }) {
      if (typeof raw !== 'string' || Buffer.byteLength(raw) > 32768) throw Error('payment_body_invalid');
      if (!Object.hasOwn(publicKeys, keyId)) throw Error('payment_signing_key_unconfigured');
      const key = createPublicKey(publicKeys[keyId]);
      if (key.asymmetricKeyType !== 'ed25519' || !/^[0-9a-f]{128}$/.test(signature || '') || !verify(null, Buffer.from(raw), key, Buffer.from(signature,'hex'))) throw Error('payment_signature_invalid');
      const e = JSON.parse(raw);
      const allowed = ['schema','event_id','tenant','firm_id','campaign_id','order_id','invoice_id','reference','amount_cents','currency','status','source','occurred_at','fixture'];
      if (Object.keys(e).some(k => !allowed.includes(k)) || e.schema !== 'btl.payment-relay/v1' || !/^pay-[a-zA-Z0-9_-]{8,80}$/.test(e.event_id || '') || !/^[A-Za-z0-9_-]{6,80}$/.test(e.reference || '') || typeof e.fixture !== 'boolean' || !Number.isSafeInteger(e.amount_cents) || e.amount_cents <= 0) throw Error('payment_event_invalid');
      const time = Date.parse(e.occurred_at);
      if (!Number.isFinite(time) || time > now() + 30000 || now() - time > 300000) throw Error('payment_event_stale');
      if (!['settled','refunded','disputed'].includes(e.status) || !['processor_settlement','bank_statement'].includes(e.source)) throw Error('payment_status_invalid');
      const match = await resolveInvoice(e.invoice_id);
      if (!match || ['tenant','firm_id','campaign_id','order_id'].some(k => e[k] !== match.order[k]) || e.currency !== match.invoice.currency || (e.status === 'settled' && e.amount_cents !== match.invoice.total_cents)) throw Error('payment_invoice_scope_mismatch');
      const scope = sha(JSON.stringify([e.tenant,e.campaign_id,e.invoice_id,e.fixture]));
      const eventKey = `payment:v1:${scope}:event:${e.event_id}`;
      const saved = { sha256: sha(raw), event: e, received_at: new Date(now()).toISOString(), verified_by: 'configured-ed25519-relay' };
      await store.setNx(eventKey, saved);
      const stored = await store.get(eventKey);
      if (!stored || stored.sha256 !== saved.sha256) throw Error('payment_event_replay_conflict');
      // Refund/dispute is a monotone hold: later settled replays cannot clear it.
      if (e.status !== 'settled') await store.setNx(`payment:v1:${scope}:hold`, { event_id:e.event_id, status:e.status });
      await store.setNx(`payment:v1:${scope}:settlement:${e.reference}`, stored);
      return { accepted:true, event_id:e.event_id, fixture:e.fixture, activation:false, settlement_scope:scope };
    },
    async readSettlement(query, { fixture = false } = {}) {
      const scope = sha(JSON.stringify([query.tenant,query.campaign_id,query.invoice_id,fixture]));
      if (await store.get(`payment:v1:${scope}:hold`)) return null;
      const receipt = await store.get(`payment:v1:${scope}:settlement:${query.reference}`);
      if (!receipt || receipt.event.status !== 'settled') return null;
      return { ...receipt.event, received_at:receipt.event.occurred_at, verified_at:receipt.received_at, verified_by:receipt.verified_by };
    },
  });
}
