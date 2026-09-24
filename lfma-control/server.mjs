import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 10000);
const AUDIT_HOOK = process.env.LFMA_AUDIT_WEBHOOK_URL || '';
const INVOICE_HOOK = process.env.LFMA_INVOICE_WEBHOOK_URL || '';

const OFFERS = Object.freeze({
  LFMA_AUDIT_400: { qbo_item_id: '50', amount_usd: 400, name: 'LFMA Legal Channel Audit' },
  LFMA_FIX_1500: { qbo_item_id: '51', amount_usd: 1500, name: 'LFMA Fix This' },
  LFMA_CONNECT_5000: { qbo_item_id: '52', amount_usd: 5000, name: 'LFMA Connect the System' }
});

const allowedOrigins = new Set([
  'https://lawfirmmarketingapes.com',
  'https://www.lawfirmmarketingapes.com'
]);

const buckets = new Map();
function rateOk(ip){
  const now = Date.now(), windowMs = 60_000, max = 12;
  const old = buckets.get(ip) || [];
  const fresh = old.filter(t => now - t < windowMs);
  fresh.push(now); buckets.set(ip, fresh);
  return fresh.length <= max;
}
function headers(origin){
  const h = {'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
  if (origin && (allowedOrigins.has(origin) || origin.endsWith('.onrender.com'))) {
    h['access-control-allow-origin'] = origin;
    h['vary'] = 'Origin';
    h['access-control-allow-methods'] = 'POST,OPTIONS';
    h['access-control-allow-headers'] = 'Content-Type';
  }
  return h;
}
function send(res,status,obj,origin){ res.writeHead(status,headers(origin)); res.end(JSON.stringify(obj)); }
async function body(req){
  let raw=''; for await (const c of req){ raw += c; if(raw.length>64_000) throw new Error('too_large'); }
  return JSON.parse(raw || '{}');
}
function clean(v,n=500){ return typeof v==='string' ? v.trim().slice(0,n) : ''; }
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
async function forward(url,payload){
  if(!url) throw new Error('not_configured');
  const r = await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok) throw new Error('upstream_'+r.status);
  return r;
}
const server = http.createServer(async (req,res)=>{
  const origin = req.headers.origin || '';
  const u = new URL(req.url || '/', 'http://localhost');
  if(req.method==='OPTIONS'){ res.writeHead(204,headers(origin)); return res.end(); }
  if(req.method==='GET' && u.pathname==='/health') return send(res,200,{ok:true,service:'lfma-control'},origin);
  if(req.method!=='POST') return send(res,404,{ok:false,error:'not_found'},origin);
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  if(!rateOk(ip)) return send(res,429,{ok:false,error:'rate_limited'},origin);
  try{
    const p = await body(req);
    const honeypot = clean(p.company_fax,100);
    if(honeypot) return send(res,200,{ok:true},origin);

    if(u.pathname==='/api/marketing-check'){
      const payload = {
        kind:'lfma_marketing_check',
        tenant_id:'LFMA',
        domain_id:'lawfirmmarketingapes.com',
        name:clean(p.name,120),
        firm:clean(p.firm,160),
        email:clean(p.email,200),
        website:clean(p.website,300),
        channel:clean(p.channel,80),
        problem:clean(p.problem,2000),
        source_url:clean(p.source_url,500),
        utm_source:clean(p.utm_source,100),
        utm_medium:clean(p.utm_medium,100),
        utm_campaign:clean(p.utm_campaign,150),
        submitted_at:new Date().toISOString()
      };
      if(!payload.name || !payload.firm || !validEmail(payload.email) || !payload.channel) {
        return send(res,400,{ok:false,error:'missing_required'},origin);
      }
      await forward(AUDIT_HOOK,payload);
      return send(res,200,{ok:true,next:'/audit/thanks.html'},origin);
    }

    if(u.pathname==='/api/invoice-request'){
      const offer = OFFERS[clean(p.offer_id,80)];
      const payload = {
        kind:'lfma_invoice_request',
        tenant_id:'LFMA',
        domain_id:'lawfirmmarketingapes.com',
        offer_id:clean(p.offer_id,80),
        qbo_item_id:offer?.qbo_item_id || null,
        amount_usd:offer?.amount_usd || null,
        offer_name:offer?.name || null,
        name:clean(p.name,120),
        firm:clean(p.firm,160),
        email:clean(p.email,200),
        website:clean(p.website,300),
        scope:clean(p.scope,2000),
        invoice_authorized:p.invoice_authorized === true,
        source_url:clean(p.source_url,500),
        submitted_at:new Date().toISOString()
      };
      if(!offer || !payload.name || !payload.firm || !validEmail(payload.email) || !payload.invoice_authorized) {
        return send(res,400,{ok:false,error:'invalid_request'},origin);
      }
      await forward(INVOICE_HOOK,payload);
      return send(res,200,{ok:true,offer_name:offer.name,amount_usd:offer.amount_usd},origin);
    }
    return send(res,404,{ok:false,error:'not_found'},origin);
  }catch(e){
    const code = e?.message==='too_large' ? 413 : (e?.message==='not_configured' ? 503 : 500);
    return send(res,code,{ok:false,error:code===503?'not_configured':'server_error'},origin);
  }
});
server.listen(PORT,()=>console.log('lfma-control listening on '+PORT));
