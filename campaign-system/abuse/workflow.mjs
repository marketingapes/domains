import { createOrder, draftInvoice, createPaymentAuthority, createBuildQueue, loadPackage, loadTemplates, readiness } from './machine.mjs';
import { createDraftWorker, draftHandlers } from './worker.mjs';
import { readFileSync } from 'node:fs';

export function createLocalWorkflow({ store, now = () => Date.now() }) {
  const pkg = loadPackage();
  const read = name => JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
  const authority = createPaymentAuthority({ mode:'fixture',now,readSettlement:q => store.get(`fixture-settlement:${q.invoice_id}`) });
  const queue = createBuildQueue(store,authority);
  const worker = createDraftWorker({ store,queue,handlers:draftHandlers({ templates:loadTemplates(),blueprint:read('./make/disabled-blueprint.json'),sofia:read('./sofia/config.draft.json') }) });
  const orderKey = id => `local-order:${pkg.tenant}:${id}`;
  return { queue,worker,
    async create({ order_id, contact_ref }) {
      const order = createOrder({orderId:order_id,firmId:pkg.firm.id,contactRef:contact_ref});
      const invoice = draftInvoice(order);
      const value = {order,invoice};
      await store.setNx(orderKey(order.order_id),value);
      const saved=await store.get(orderKey(order.order_id));
      if (JSON.stringify(saved)!==JSON.stringify(value)) throw Error('order_id_content_conflict');
      await store.setNx(`local-invoice:${invoice.invoice_id}`,value);
      await store.setNx('local-order-index:'+order.order_id,{order_id:order.order_id});
      return { ...saved,payment:{status:'unverified',real_payment:null},activation:false };
    },
    async get(id) { const value = await store.get(orderKey(id)); if(!value) throw Error('order_not_found');return value; },
    async status(id) {
      const value=await this.get(id);const jobs=await queue.status(value.order);
      const payment=await store.get(`fixture-settlement:${value.invoice.invoice_id}`);
      return {...value,jobs,payment:{status:payment?'FIXTURE settlement only':'unverified',real_payment:null},readiness:readiness(),activation:false};
    },
    async runFixture(id) {
      const {order,invoice}=await this.get(id);
      const timestamp=new Date(now()).toISOString();
      await store.set(`fixture-settlement:${invoice.invoice_id}`,{status:'settled',source:'processor_settlement',tenant:order.tenant,firm_id:order.firm_id,campaign_id:order.campaign_id,order_id:order.order_id,invoice_id:invoice.invoice_id,amount_cents:invoice.total_cents,currency:invoice.currency,reference:'FIXTURE-'+invoice.invoice_id,fixture:true,received_at:timestamp,verified_at:timestamp,verified_by:'local-fictional-ledger'});
      const proof=await authority.verify(order,invoice,'FIXTURE-'+invoice.invoice_id);
      await queue.enqueue(order,invoice,proof);
      const result=await worker.run(order);
      return {...result,status:await this.status(id),notice:'FICTIONAL SETTLEMENT — no invoice sent, payment processed or provider job run'};
    },
  };
}
