#!/usr/bin/env node
// tools/stock-domains.mjs — Domain stocking v1 (generator + injector + auditor + report)
//
//   node tools/stock-domains.mjs            # stock all 14 canonical tenants, write stocking/report.{json,md}
//   node tools/stock-domains.mjs --check    # no writes; exit 1 if any generated output has drifted from source
//
// What it does, per canonical tenant (portfolio.json — LEE is not in it and is never touched):
//   * copies shared/ee/bootstrap.js  ->  <tenant>/ee/bootstrap.js  (verbatim)
//   * derives <tenant>/ee/site.json  from  <tenant>/domain.json    (statuses only — no identifiers, no secrets)
//   * injects into each page: an inline window.EE_SITE block + <script src="/ee/bootstrap.js" defer>
//     and the dynamic experience socket <div id="ee-experience" data-ee-socket="primary" hidden>
//   * audits web foundation, identity, campaign coupling and safety hooks; classifies STOCKED / PARTIAL / BLOCKED
//
// Foundation v1.2 is READ ONLY here. This tool never opens domain.json for writing, never touches
// portfolio.json, domain.schema.json, validate.py or foundation.sha256.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECK = process.argv.includes('--check');
const VERSION = 'stocking-v1';
const HEAD_START = '<!-- ee:stocking v1 -->', HEAD_END = '<!-- /ee:stocking -->';
const SOCKET_START = '<!-- ee:socket -->', SOCKET_END = '<!-- /ee:socket -->';
const SKIP_DIRS = new Set(['campaigns', 'assets', 'ee', 'HTML-Tools', 'portal', 'preview', 'social-preview', 'node_modules']);
const FROZEN = ['portfolio.json', 'domain.schema.json', 'validate.py', 'foundation.sha256'];

const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));
const json = p => JSON.parse(read(p));

// ---------------------------------------------------------------------------------------------- tenants
const portfolio = json('portfolio.json');
const TENANTS = portfolio.tenants.slice().sort();
if (TENANTS.length !== 14) throw new Error(`portfolio.json must hold exactly 14 tenants, got ${TENANTS.length}`);
if (TENANTS.includes('LEE')) throw new Error('LEE must not be a canonical tenant');
const folder = t => t.toLowerCase();
const manifests = Object.fromEntries(TENANTS.map(t => [t, json(`${folder(t)}/domain.json`)]));
const frozenBefore = Object.fromEntries([...FROZEN, ...TENANTS.map(t => `${folder(t)}/domain.json`)].map(p => [p, sha(fs.readFileSync(path.join(ROOT, p)))]));

// ------------------------------------------------------------------------------------- socket mapping
// play socket -> manifest leaf path(s). The first path is the primary status source.
const SOCKETS = {
  web_dynamic_experience: ['web.site'],
  email_human: ['communications.email_human'],
  email_transactional: ['communications.email_transactional'],
  email_bulk: ['communications.email_bulk'],
  sms: ['communications.sms'],
  phone: ['communications.phone'],
  vapi_sofia: ['communications.vapi'],
  facebook: ['social.facebook'],
  instagram: ['social.instagram'],
  tiktok: ['social.tiktok'],
  youtube: ['social.youtube'],
  linkedin: ['social.linkedin'],
  x: ['social.x'],
  threads: ['social.threads'],
  pinterest: ['social.pinterest'],
  meta_ads: ['paid_media.meta_ad_account', 'paid_media.meta_dataset'],
  google_ads: ['paid_media.google_ads'],
  tiktok_ads: ['paid_media.tiktok_ads'],
  affiliate_api_feeds: [],            // no Foundation v1.2 leaf — socket declared by the stocking layer only
  commerce: ['commerce.processor'],
  ga4_gtm: ['measurement.gtm_web', 'measurement.ga4_measurement', 'measurement.gtm_server'],
  bigquery: ['measurement.bigquery', 'data.bigquery'],
  drive: ['data.drive'],
  consent: ['safety.consent'],
  suppression: ['safety.suppression'],
  kill_switch: ['safety.kill_switch'],
  production_gate: ['safety.production_gates']
};
const IDENTITY_KEYS = ['e164', 'assistant_id', 'container_id', 'measurement_id', 'property_id', 'dataset_id', 'page_id', 'account_id', 'channel_id', 'handle', 'address', 'hook_id', 'scenario_id', 'ad_account_id', 'customer_id', 'advertiser_id', 'sms_identity', 'cloudflare_zone_id', 'folder_id', 'table', 'dataset'];
const leaf = (m, p) => p.split('.').reduce((o, k) => (o && typeof o === 'object') ? o[k] : undefined, m);

function deriveSite(t) {
  const m = manifests[t];
  const live = m.hostname.current_hosting_matches_intent === true
    && leaf(m, 'web.site.activation_state') === 'ON' && leaf(m, 'web.render.activation_state') === 'ON';
  const sockets = {};
  for (const [name, paths] of Object.entries(SOCKETS)) {
    const primary = paths[0] ? leaf(m, paths[0]) : null;
    const s = {
      connection_status: primary ? primary.connection_status : 'MISSING',
      activation_state: primary ? primary.activation_state : 'OFF',
      source: paths[0] || null,
      hook: 'present'
    };
    if (primary && 'owner_tenant_id' in primary) {
      s.owner_tenant_id = primary.owner_tenant_id;
      s.shared_with = primary.shared_with || [];
      // an identifier is only ever this tenant's own; a shared value is referenced by owner, never copied
      if (primary.owner_tenant_id && primary.owner_tenant_id !== t) s.shared_from = primary.owner_tenant_id;
    }
    if (paths.length > 1) s.also = paths.slice(1).map(p => { const l = leaf(m, p); return { source: p, connection_status: l?.connection_status ?? 'MISSING', activation_state: l?.activation_state ?? 'OFF' }; });
    if (!paths[0]) s.note = 'no Foundation v1.2 leaf; socket declared by the stocking layer only';
    if (name === 'web_dynamic_experience') s.socket = { element: '#ee-experience', attribute: 'data-ee-socket="primary"', api: 'window.EE.experience.mount({id, render})' };
    if (name === 'production_gate') s.gates = primary.gates;
    sockets[name] = s;
  }
  const config = {
    tenant_id: m.tenant_id,
    domain_id: m.domain_id,
    brand: m.brand_name,
    canonical_url: `https://${m.hostname.intended_canonical_hostname}/`,
    production_gate: live ? 'live' : 'preview',
    production_gates: leaf(m, 'safety.production_gates.gates') || [],
    kill_switch: 'OFF',
    kill_switch_source: leaf(m, 'safety.kill_switch.connection_status'),
    consent_store: leaf(m, 'safety.consent.connection_status'),
    suppression_source: leaf(m, 'safety.suppression.connection_status'),
    events_contract: leaf(m, 'measurement.canonical_events.contract') || 'ee_*',
    stocking: VERSION
  };
  const site = {
    schema: 'marketingapes.domain.stocking/v1',
    foundation: 'marketingapes.domain.foundation/v1.2',
    derived_from: { file: `${folder(t)}/domain.json`, sha256: frozenBefore[`${folder(t)}/domain.json`] },
    tenant_id: m.tenant_id,
    domain_id: m.domain_id,
    brand: m.brand_name,
    canonical_url: config.canonical_url,
    hosting: { intended: m.hostname.intended_hosting, current: m.hostname.current_hosting_state, matches_intent: m.hostname.current_hosting_matches_intent, render_service: leaf(m, 'web.render.service') },
    production_gate: config.production_gate,
    kill_switch: { hook: 'present', state: 'OFF', connection_status: config.kill_switch_source },
    event_bootstrap: { script: '/ee/bootstrap.js', api: 'window.EE.track(name, props)', load_event: 'ee_page_context', contract: config.events_contract,
      required_fields: ['tenant_id', 'domain_id', 'session_id', 'landing_page_url'], optional_fields: ['campaign_id', 'variant_id', 'utm_*', 'gclid', 'fbclid', 'ttclid', 'msclkid', 'wbraid', 'gbraid'],
      campaign_required: false },
    experience_socket: sockets.web_dynamic_experience.socket,
    sockets,
    policy: 'UNKNOWN DOES NOT MEAN BORROW. Identifiers live in domain.json; this file carries statuses only.'
  };
  return { config, site };
}

// ---------------------------------------------------------------------------------------------- pages
function pagesFor(t) {
  const dir = folder(t), out = [];
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    const p = path.join(ROOT, dir, f), st = fs.statSync(p);
    if (st.isFile() && f.endsWith('.html')) out.push(`${dir}/${f}`);
    else if (st.isDirectory() && !SKIP_DIRS.has(f) && !f.startsWith('publishing-check') && fs.existsSync(path.join(p, 'index.html'))) out.push(`${dir}/${f}/index.html`);
  }
  return out.sort();
}
const headBlock = cfg => `${HEAD_START}<script>window.EE_SITE=Object.freeze(${JSON.stringify(cfg)});</script><script src="/ee/runtime.js" defer></script><script src="/ee/bootstrap.js" defer></script>${HEAD_END}`;
const socketBlock = t => `${SOCKET_START}<div id="ee-experience" data-ee-socket="primary" data-tenant-id="${t}" hidden></div>${SOCKET_END}`;
function replaceBetween(html, start, end, block) {
  const a = html.indexOf(start), b = html.indexOf(end);
  return (a >= 0 && b > a) ? html.slice(0, a) + block + html.slice(b + end.length) : null;
}
function inject(html, t, cfg) {
  const problems = [];
  let out = replaceBetween(html, HEAD_START, HEAD_END, headBlock(cfg));
  if (out === null) {
    const i = html.search(/<\/head\s*>/i);
    if (i < 0) problems.push('no </head>');
    else out = html.slice(0, i) + headBlock(cfg) + '\n' + html.slice(i);
  }
  if (out === null) return { html, problems };
  let out2 = replaceBetween(out, SOCKET_START, SOCKET_END, socketBlock(t));
  if (out2 === null) {
    const i = out.search(/<\/body\s*>/i);
    if (i < 0) problems.push('no </body>');
    else out2 = out.slice(0, i) + socketBlock(t) + '\n' + out.slice(i);
  }
  return { html: out2 ?? out, problems };
}

// ---------------------------------------------------------------------------------------------- audits
const SECRET_PATTERNS = [/hooks\.zapier\.com\/hooks\/catch\//, /hook\.[a-z0-9-]+\.make\.com\//i, /\bsk-[A-Za-z0-9]{16,}/, /\bAKIA[0-9A-Z]{16}\b/, /\bAIza[0-9A-Za-z_-]{30,}/, /\bxox[abp]-[A-Za-z0-9-]+/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bBearer\s+[A-Za-z0-9._-]{20,}/, /\b(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{8,}['"]/i];
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function siteFiles(t) {
  const dir = folder(t), out = [];
  (function walk(rel) {
    for (const f of fs.readdirSync(path.join(ROOT, rel))) {
      const r = `${rel}/${f}`, st = fs.statSync(path.join(ROOT, r));
      if (st.isDirectory()) { if (!SKIP_DIRS.has(f) && !f.startsWith('publishing-check')) walk(r); }
      else if (/\.(html?|js|mjs|json|txt|xml)$/.test(f) && f !== 'domain.json') out.push(r);
    }
  })(dir);
  return out;
}
// every identity value each tenant OWNS, from the frozen manifests
function identityIndex() {
  const idx = [];
  for (const t of TENANTS) (function walk(node, trail) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    for (const [k, v] of Object.entries(node)) {
      if (IDENTITY_KEYS.includes(k) && typeof v === 'string' && v.length >= 6 && !/^(lead_database|render|cloudflare|siteground)$/.test(v)) {
        const owner = node.owner_tenant_id || t;
        idx.push({ value: v, key: k, path: trail.join('.'), declared_by: t, owner, shared_with: node.shared_with || [] });
      } else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, [...trail, k]);
    }
  })(manifests[t], []);
  return idx;
}
const IDENTITY = identityIndex();
function borrowedIn(t, files) {
  const hits = [], links = [];
  const declaredHere = new Set(IDENTITY.filter(i => i.declared_by === t).map(i => i.value));
  for (const rel of files) {
    const text = read(rel);
    for (const i of IDENTITY) {
      if (i.owner === t || declaredHere.has(i.value)) continue; // own, or claimed in this tenant's manifest
      const re = new RegExp(escapeRe(i.value), 'g');
      if (!re.test(text)) continue;
      const claimedBothEnds = i.shared_with.includes(t) && IDENTITY.some(j => j.declared_by === t && j.value === i.value && j.owner === i.owner);
      if (claimedBothEnds) continue;
      // a social page/account id that only appears inside an outbound link to that network is a link, not an identity
      const linkOnly = ['page_id', 'account_id', 'channel_id', 'handle'].includes(i.key)
        && text.split(i.value).slice(0, -1).every(before => /https?:\/\/[a-z.]*(facebook|instagram|tiktok|youtube|linkedin|x|twitter|threads|pinterest)\.(com|net)\/[^"'\s]*$/i.test(before.slice(-120)));
      (linkOnly ? links : hits).push({ file: rel, value: i.value, key: i.key, owner: i.owner, path: i.path });
    }
  }
  return { hits, links };
}
function metaAudit(html, t) {
  const m = manifests[t], want = `https://${m.hostname.intended_canonical_hostname}/`;
  const get = re => { const x = html.match(re); return x ? x[1] : null; };
  const canonical = get(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || get(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const a = {
    title: !!get(/<title>([^<]+)<\/title>/i),
    viewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    description: /<meta[^>]+name=["']description["']/i.test(html),
    canonical, canonical_ok: canonical === want,
    og_title: /<meta[^>]+property=["']og:title["']/i.test(html),
    og_url: /<meta[^>]+property=["']og:url["']/i.test(html),
    twitter_card: /<meta[^>]+name=["']twitter:card["']/i.test(html),
    noindex: /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html),
    cross_brand: []
  };
  const title = (get(/<title>([^<]+)<\/title>/i) || '') + ' ' + (get(/property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) || '');
  for (const o of TENANTS) {
    if (o === t) continue;
    const ob = manifests[o].brand_name, mine = m.brand_name;
    if (mine.includes(ob)) continue; // "Law Firm Marketing Apes" legitimately contains "Marketing Apes"
    if (new RegExp(`\\b${escapeRe(ob)}\\b`).test(title)) a.cross_brand.push(o);
  }
  return a;
}

// ---------------------------------------------------------------------------------------------- run
const bootstrapSrc = read('shared/ee/bootstrap.js');
// The older shared tracking helper is a legacy dependency of DIHAC and LFMA pages. DIHAC's copy is the source;
// LFMA serves the same bytes locally instead of loading it cross-origin from the legacy host.
const LEGACY_TRACKING = { source: 'dihac/assets/js/tracking.js', copies: ['lfma/assets/js/tracking.js'] };
// F9: a tenant whose LIVE domain is served from a different source tree is not STOCKED until the deployed path converges.
const LIVE_SOURCE_DIVERGENCE = {
  NIL: 'live nearestinjurylawyers.com is served from marketingapes/nil-site (root); this tree deploys nil-site-staging only',
  BTL: 'live besttortlawyers.com is served from SiteGround; the Phillips funnel is not mirrored in this tree'
};
const results = [], writes = [], drift = [];
function emit(rel, content) {
  const abs = path.join(ROOT, rel);
  const current = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (current === content) return;
  if (CHECK) drift.push(rel);
  else { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, content); writes.push(rel); }
}

for (const rel of LEGACY_TRACKING.copies) emit(rel, read(LEGACY_TRACKING.source));
for (const t of TENANTS) {
  const dir = folder(t), m = manifests[t];
  const { config, site } = deriveSite(t);
  const r = { tenant_id: t, domain_id: m.domain_id, brand: m.brand_name, folder: dir, status: null, structural_gaps: [], notes: [], missing_external: [], pages: [], identity: { borrowed: [] } };

  // 1. generated runtime
  emit(`${dir}/ee/bootstrap.js`, bootstrapSrc);
  emit(`${dir}/ee/site.json`, JSON.stringify(site, null, 2) + '\n');

  // 2. pages: inject config + bootstrap + socket
  if (!exists(`${dir}/index.html`)) { r.status = 'BLOCKED'; r.structural_gaps.push('index.html missing — site cannot serve'); results.push(r); continue; }
  for (const rel of pagesFor(t)) {
    const html = read(rel);
    const { html: next, problems } = inject(html, t, config);
    if (problems.length) { r.pages.push({ file: rel, stocked: false, problems }); if (rel.endsWith(`${dir}/index.html`)) r.structural_gaps.push(`index.html: ${problems.join(', ')}`); continue; }
    emit(rel, next);
    r.pages.push({ file: rel, stocked: true });
  }

  // 3. web foundation audit on the (stocked) homepage
  const home = CHECK ? read(`${dir}/index.html`) : inject(read(`${dir}/index.html`), t, config).html;
  const meta = metaAudit(home, t);
  r.web = meta;
  if (!meta.title) r.structural_gaps.push('homepage has no <title>');
  if (!meta.viewport) r.structural_gaps.push('homepage has no viewport meta (mobile baseline)');
  if (!meta.canonical_ok) r.structural_gaps.push(`homepage canonical is ${meta.canonical || 'missing'}, expected https://${m.hostname.intended_canonical_hostname}/`);
  if (!meta.og_title) r.structural_gaps.push('homepage has no og:title');
  if (!meta.description) r.notes.push('homepage has no meta description');
  if (meta.cross_brand.length) r.structural_gaps.push(`homepage title/site_name names another tenant's brand: ${meta.cross_brand.join(', ')}`);
  if (!home.includes(HEAD_START)) r.structural_gaps.push('event bootstrap not injected');
  if (!home.includes('data-ee-socket="primary"')) r.structural_gaps.push('dynamic experience socket missing');
  r.production_gate = config.production_gate;
  r.noindex = meta.noindex;

  // 4. identity + campaign coupling audit over the tenant's own site files (legacy page code included)
  const files = siteFiles(t).filter(f => !f.includes('/ee/'));
  const borrowed = borrowedIn(t, files);
  r.identity.borrowed = borrowed.hits;
  r.identity.outbound_links = borrowed.links;
  if (borrowed.hits.length) {
    const summary = [...new Set(borrowed.hits.map(h => `${h.owner}.${h.key}=${h.value}`))];
    r.structural_gaps.push(`borrowed identity in page code (not claimed from both ends): ${summary.join('; ')}`);
  }
  if (borrowed.links.length) r.notes.push(`outbound links to another tenant's social account (link only, not identity): ${[...new Set(borrowed.links.map(h => `${h.owner}.${h.key}`))].join(', ')}`);
  const campaignHits = [], campaignPages = [], hookHits = [], legacyCtx = [], placeholders = [];
  for (const rel of files) {
    const text = read(rel);
    const c = text.match(/\bCAMPAIGN\s*=\s*['"][A-Za-z0-9_-]{3,}['"]|\bcampaign_id\s*:\s*['"][A-Za-z0-9_-]{3,}['"]/g);
    if (c) (rel === `${dir}/index.html` ? campaignHits : campaignPages).push(`${rel}: ${c[0]}`);
    if (SECRET_PATTERNS.slice(0, 2).some(p => p.test(text))) hookHits.push(rel);
    if (/event\s*:\s*['"]ee_page_context['"]/.test(text) && !text.includes(HEAD_START + '<script>window.EE_SITE')) legacyCtx.push(rel);
    if (/GTM-PENDING/.test(text)) placeholders.push(rel);
  }
  if (campaignHits.length) r.structural_gaps.push(`homepage hardcodes a campaign (the domain face must not depend on one): ${campaignHits.join('; ')}`);
  if (campaignPages.length) r.notes.push(`campaign landing pages carry their own campaign id (legitimate — a campaign attaches to the domain): ${campaignPages.join('; ')}`);
  if (hookHits.length) r.notes.push(`legacy webhook URLs are embedded in page code (${hookHits.length} file(s)); Foundation treats hook URLs as secrets — move to hook IDs resolved server-side: ${hookHits.join(', ')}`);
  if (legacyCtx.filter(f => f.includes('/ee/') === false).length) {
    const l = legacyCtx.filter(f => read(f).includes("event:'ee_page_context'") || read(f).includes('event: "ee_page_context"') || /event:\s*'ee_page_context'/.test(read(f)));
    if (l.length) r.notes.push(`legacy inline ee_page_context push present (bootstrap de-duplicates by emitting ee_context_update instead): ${l.join(', ')}`);
  }
  if (placeholders.length) r.notes.push(`GTM-PENDING placeholder in: ${placeholders.join(', ')}`);
  const ownGtm = leaf(m, 'measurement.gtm_web');
  if (ownGtm && ownGtm.connection_status === 'VERIFIED' && ownGtm.container_id && !home.includes(ownGtm.container_id)) {
    r.notes.push(`homepage does not load its VERIFIED gtm_web container ${ownGtm.container_id} (no GTM on the face; ee_* events have no delivery path here)`);
  }

  // 5. secrets scan on everything the stocking layer generates/injects
  const generated = [`${dir}/ee/bootstrap.js`, `${dir}/ee/site.json`];
  const secretHits = [];
  for (const rel of generated) { const text = CHECK ? (exists(rel) ? read(rel) : '') : (rel.endsWith('.js') ? bootstrapSrc : JSON.stringify(site)); if (SECRET_PATTERNS.some(p => p.test(text))) secretHits.push(rel); }
  if (SECRET_PATTERNS.some(p => p.test(headBlock(config)))) secretHits.push('EE_SITE block');
  if (secretHits.length) r.structural_gaps.push(`secret-like material in generated output: ${secretHits.join(', ')}`);

  // 6. remaining external capabilities (provider / Kyle action) — never a reason to stop
  for (const [name, s] of Object.entries(site.sockets)) {
    if (['MISSING', 'NEEDS_AUTH'].includes(s.connection_status)) r.missing_external.push(`${name}: ${s.connection_status}`);
  }
  if (!m.hostname.current_hosting_matches_intent) r.missing_external.push(`dns_cutover: ${m.hostname.current_hosting_state} -> ${m.hostname.intended_hosting} (human, DNS)`);
  if (leaf(m, 'measurement.canonical_events.connection_status') === 'MISSING') r.missing_external.push('canonical_events: MISSING in Foundation (bootstrap now emits ee_*; flip the leaf once observed in GA4/BigQuery)');

  // F9: deployed path. PROVEN only when this tree is what the live domain serves; DIVERGED blocks STOCKED.
  if (LIVE_SOURCE_DIVERGENCE[t]) { r.deployed_path = 'DIVERGED'; r.structural_gaps.push(`deployed path diverged: ${LIVE_SOURCE_DIVERGENCE[t]}`); }
  else r.deployed_path = m.hostname.current_hosting_matches_intent ? 'PROVEN' : 'UNPROVEN';
  r.status = r.structural_gaps.length ? 'PARTIAL' : 'STOCKED';
  results.push(r);
}

// LEE: excluded by name — prove it was left alone
const leeTouched = exists('lee/ee') || (exists('lee/index.html') && read('lee/index.html').includes(HEAD_START));
if (leeTouched) throw new Error('LEE is excluded from the portfolio and must not be stocked');

// Foundation must not have moved
const frozenAfter = Object.fromEntries(Object.keys(frozenBefore).map(p => [p, sha(fs.readFileSync(path.join(ROOT, p)))]));
const mutated = Object.keys(frozenBefore).filter(p => frozenBefore[p] !== frozenAfter[p]);
if (mutated.length) throw new Error(`Foundation mutation detected: ${mutated.join(', ')}`);
const hashFileOk = read('foundation.sha256').trim().split('\n').every(line => { const [h, p] = line.trim().split(/\s+/); return frozenAfter[p] === h; });

// ---------------------------------------------------------------------------------------------- report
const counts = { STOCKED: 0, PARTIAL: 0, BLOCKED: 0 };
for (const r of results) counts[r.status]++;
const report = {
  schema: 'marketingapes.domain.stocking-report/v1',
  play: 'SECOND PLAY — STOCK ALL 14 DOMAINS',
  foundation: { schema: 'marketingapes.domain.foundation/v1.2', frozen_commit: 'c8c04430efff970777c1ec8102cbbb4238a4b482', hashes_intact: hashFileOk, mutated: [] },
  tenants: { canonical: TENANTS, count: TENANTS.length, excluded: ['LEE'] },
  shared_components: {
    added: ['shared/ee/bootstrap.js (canonical event bootstrap + experience socket API + safety hooks)', 'tools/stock-domains.mjs (generator / injector / auditor)', 'tests/domain-stocking.test.mjs'],
    reused: ['ee_page_context dataLayer convention (kg, lfma/engine, ma/order)', 'ee_* event contract (measurement.canonical_events)', 'sessionStorage ee_* attribution keys (dihac/assets/js/tracking.js)', 'data-cta-id CTA convention (DOMAINS.md)', 'campaign-system "generated files are committed" pattern', 'tools/verify-foundation.py + node --test tests/*.test.mjs']
  },
  summary: counts,
  results
};
const md = [];
md.push('# Domain stocking report — v1', '', `Foundation v1.2 frozen at \`${report.foundation.frozen_commit}\` — hashes intact: **${hashFileOk ? 'YES' : 'NO'}**. Tenants: ${TENANTS.length}/14 canonical, LEE excluded.`, '',
  `**STOCKED ${counts.STOCKED} · PARTIAL ${counts.PARTIAL} · BLOCKED ${counts.BLOCKED}**`, '',
  'STOCKED = structurally ready (builds, identity, metadata, event bootstrap, experience socket, safety hooks) AND the deployed path is not diverged. PARTIAL = a structural gap remains in existing page code that needs a content decision, or the live domain is served from another source tree (deployed path DIVERGED). BLOCKED = the site cannot serve. Missing *external* capabilities never block; they are listed per tenant.', '',
  '| tenant | domain | status | gate | deployed path | pages stocked | structural gaps | missing external |', '|---|---|---|---|---|---|---|---|');
for (const r of results) md.push(`| ${r.tenant_id} | ${r.domain_id} | **${r.status}** | ${r.production_gate || '-'} | ${r.deployed_path || '-'} | ${r.pages.filter(p => p.stocked).length}/${r.pages.length} | ${r.structural_gaps.length} | ${r.missing_external.length} |`);
for (const r of results) {
  md.push('', `## ${r.tenant_id} — ${r.brand} (${r.domain_id}) — ${r.status}`, '');
  md.push(`- production gate: \`${r.production_gate}\`${r.noindex ? ' (noindex)' : ''} · pages stocked: ${r.pages.filter(p => p.stocked).map(p => p.file.replace(`${r.folder}/`, '')).join(', ') || 'none'}`);
  const skipped = r.pages.filter(p => !p.stocked); if (skipped.length) md.push(`- pages skipped: ${skipped.map(p => `${p.file} (${p.problems.join(', ')})`).join('; ')}`);
  if (r.structural_gaps.length) { md.push('- structural gaps:'); r.structural_gaps.forEach(g => md.push(`  - ${g}`)); }
  if (r.notes.length) { md.push('- notes:'); r.notes.forEach(n => md.push(`  - ${n}`)); }
  md.push('- remaining external capabilities (provider / Kyle action):'); (r.missing_external.length ? r.missing_external : ['none']).forEach(x => md.push(`  - ${x}`));
}
md.push('', '## How to re-run', '', '```sh', 'node tools/stock-domains.mjs            # regenerate + re-audit', 'node tools/stock-domains.mjs --check    # drift gate (used by tests)', 'python3 tools/verify-foundation.py      # frozen hashes + frozen validator', 'node --test tests/*.test.mjs', '```', '');
emit('stocking/report.json', JSON.stringify(report, null, 2) + '\n');
emit('stocking/REPORT.md', md.join('\n'));

// ---------------------------------------------------------------------------------------------- exit
console.log(`DOMAIN STOCKING ${CHECK ? '--check' : ''}: ${TENANTS.length}/14 tenants · STOCKED ${counts.STOCKED} · PARTIAL ${counts.PARTIAL} · BLOCKED ${counts.BLOCKED} · foundation hashes ${hashFileOk ? 'intact' : 'DRIFTED'}`);
for (const r of results) console.log(`  ${r.status.padEnd(7)} ${r.tenant_id.padEnd(5)} ${r.domain_id.padEnd(30)} gaps=${r.structural_gaps.length} external=${r.missing_external.length}`);
if (CHECK) {
  if (drift.length) { console.error('DRIFT — generated outputs differ from source:\n  ' + drift.join('\n  ')); process.exit(1); }
  console.log('no drift');
} else if (writes.length) console.log(`wrote ${writes.length} file(s)`);
if (!hashFileOk || counts.BLOCKED) process.exit(2);
