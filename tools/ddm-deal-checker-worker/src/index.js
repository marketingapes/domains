// Discount Deal Me deal-checker lookup (Cloudflare Worker scaffold, not deployed).
// GET /check?q=<product name or URL>  ->  { products: [...], source, checked_at, ai_note? }
// - Searches CJ product search for joined advertisers only, then keeps stores that have a /coupons/ page.
// - Keeps the CJ token server-side. Logs no queries, IPs or emails.
// - Store allow-list: src/stores.js (generated from coupons_feed.json by make_stores.py), refreshed from
//   the live site's /data/coupons.json when that file exists.
// - Returns only what the network returned: no invented history, savings or ratings.
// - Optional ai_note is generated only from the returned rows and is labelled "AI summary" by the site.

import EMBEDDED from './stores.js';

const STOP = new Set('the a an and for with in of to on by at is it this that from new best buy sale deal deals price www com html http https product products p dp item shop us en'.split(' '));

function tokens(q) {
  let s = q.trim();
  try { if (/^https?:\/\//i.test(s)) s = decodeURIComponent(new URL(s).pathname); } catch (_) {}
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((t) => t.length > 1 && !STOP.has(t)).slice(0, 8);
}

function cors(env, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': env.ALLOWED_ORIGIN,
    'cache-control': 'public, max-age=600', 'x-content-type-options': 'nosniff' } });
}

let storeCache = null;
async function stores(env) {
  if (storeCache && Date.now() - storeCache.at < 36e5) return storeCache.map;
  let list = EMBEDDED;
  try {
    const r = await fetch(env.SITE + '/data/coupons.json', { cf: { cacheTtl: 3600 } });
    if (r.ok) list = (await r.json()).stores;
  } catch (_) { /* keep the embedded list */ }
  const map = {};
  for (const s of list) for (const n of [s.name, ...(s.advertiser_names || [])]) map[n.toLowerCase()] = s.slug;
  storeCache = { at: Date.now(), map };
  return map;
}

const slugify = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return cors(env, {});
    if (url.pathname === '/' || url.pathname === '/health') return cors(env, { ok: true, service: 'ddm-deal-checker' });
    if (url.pathname !== '/check' || req.method !== 'GET') return cors(env, { error: 'not found' }, 404);
    if (env.RATE) {
      const { success } = await env.RATE.limit({ key: req.headers.get('cf-connecting-ip') || 'anon' });
      if (!success) return cors(env, { error: 'slow down' }, 429);
    }
    const q = (url.searchParams.get('q') || '').slice(0, 300);
    const tk = tokens(q);
    if (!tk.length) return cors(env, { products: [] });
    const gql = `{ products(companyId: "${env.CJ_COMPANY_ID}", partnerStatus: JOINED, keywords: ${JSON.stringify(tk)}, limit: 20) {
      resultList { id title link advertiserId advertiserName price { amount currency } salePrice { amount currency }
      linkCode(pid: "${env.CJ_PROPERTY}") { clickUrl } } } }`;
    const r = await fetch('https://ads.api.cj.com/query', { method: 'POST',
      headers: { authorization: 'Bearer ' + env.CJ_API_TOKEN, 'content-type': 'application/json' }, body: JSON.stringify({ query: gql }) });
    if (!r.ok) return cors(env, { products: [], error: 'lookup unavailable' }, 502);
    const data = await r.json();
    const allowed = await stores(env);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    const products = [];
    for (const p of data?.data?.products?.resultList || []) {
      const name = (p.advertiserName || '').trim();
      const slug = allowed[name.toLowerCase()] || null;
      if (!slug) continue;  // only stores we have a page for (brand-safety list applied at build time)
      const hay = ((p.title || '') + ' ' + name).toLowerCase();
      const hit = tk.filter((t) => hay.includes(t) || hay.includes(t.replace(/s$/, ''))).length;
      if (hit / tk.length < (tk.length >= 3 ? 0.75 : 0.99)) continue;  // CJ keyword search is loose; keep close matches only
      const price = parseFloat(p.price?.amount), sale = parseFloat(p.salePrice?.amount);
      if (!(price > 0) && !(sale > 0)) continue;
      const click = p.linkCode?.clickUrl || '';
      if (!click.includes('-' + env.CJ_PROPERTY)) continue;
      products.push({ id: `cj:${p.advertiserId}:${p.id}`, t: (p.title || '').slice(0, 160), s: slug, n: name, u: p.link || '',
        c: click + (click.includes('?') ? '&' : '?') + 'sid=ddm-checker-live', cur: p.price?.currency || 'USD',
        r: [[today, today, price > 0 ? price : sale, sale > 0 && price > 0 && sale < price ? sale : null]] });
    }
    const body = { source: 'CJ product search (live)', checked_at: new Date().toISOString(), products: products.slice(0, 8) };
    if (env.ENABLE_AI === 'true' && env.AI && products.length) {
      const rows = products.slice(0, 5).map((p) => `${p.t} | ${p.n} | $${p.r[0][3] ?? p.r[0][2]}`).join('\n');
      const out = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { max_tokens: 60, messages: [
        { role: 'system', content: 'In one plain sentence, say which listed item is cheapest. Use only the rows given. No history, no claims, no adjectives like "great".' },
        { role: 'user', content: rows }] }).catch(() => null);
      if (out?.response) body.ai_note = out.response.trim().slice(0, 240);
    }
    return cors(env, body);
  },
};
