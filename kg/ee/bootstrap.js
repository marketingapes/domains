/*!
 * Evolution Engine — domain stocking bootstrap (v1.1, QA/QC round 2)
 * Source of truth: shared/ee/bootstrap.js  (copied verbatim to <tenant>/ee/bootstrap.js by tools/stock-domains.mjs)
 *
 * One dependency-free script every canonical domain loads. It gives a site four things:
 *   1. Canonical event bootstrap  — window.EE.track(name, props) pushes ee_* events onto window.dataLayer
 *                                    with tenant_id, domain_id, session_id, campaign_id (optional),
 *                                    variant_id (optional), landing_page_url, UTMs and click IDs.
 *                                    System-owned fields are RESERVED: event props can never override them.
 *   2. Dynamic experience socket  — window.EE.experience.mount({id, render}) renders into
 *                                    <div id="ee-experience" data-ee-socket="primary" hidden>.
 *   3. Shared safety hooks        — window.EE.safety.{consent, suppression, killSwitch, productionGate}
 *                                    and window.EE.outbound.allowed(). Hooks exist on every domain.
 *   4. Gated hooks                — window.EE.hooks.url(name) / .post(name, body). A hook URL is only ever
 *                                    handed out when the outbound gate passes: kill switch OFF, production gate
 *                                    live, consent evidence recorded, suppression truth known, and the runtime's
 *                                    tenant matches this page's tenant. There is no ungated path to a URL.
 *
 * FAIL CLOSED: no EE_SITE, an invalid EE_SITE, an unknown kill-switch state, or a runtime built for another
 * tenant means: no events leave the page, no hook URL is resolvable, no experience mounts.
 *
 * Configuration comes ONLY from the inline `window.EE_SITE` block the stocking tool injects into the page,
 * derived from that tenant's own <tenant>/domain.json. Nothing in here names another tenant.
 * No secrets, no webhook URLs, no pixels, no network calls of its own. Delivery is whatever GTM/GA4 the page loads.
 *
 * window.EE is installed as a non-writable property and frozen. A legacy script that already defined
 * window.EE (e.g. the older shared tracking.js) is preserved under EE.legacy; a legacy script that loads
 * later registers itself with EE.registerLegacy(api). Neither can overwrite the stocked API.
 */
(function (w, d) {
  'use strict';
  if (w.EE && w.EE.__stocked) return; // idempotent

  var VERSION = 'stocking-v1.1';
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'];
  var CLICK_KEYS = ['gclid', 'gbraid', 'wbraid', 'dclid', 'fbclid', 'ttclid', 'msclkid', 'li_fat_id', 'twclid', 'epik', 'rdt_cid'];
  // `ee_campaign` / `ee_variant` name an Evolution Engine campaign. A bare `?campaign_id=` on the URL is the
  // ad platform's campaign id (Meta/Google), which page code records as platform_campaign_id - never conflated.
  var CAMPAIGN_KEYS = ['ee_campaign'];
  var VARIANT_KEYS = ['ee_variant'];
  // System-owned event fields. Event props may never override these (F7).
  var RESERVED = ['event', 'event_id', 'event_ts', 'ee_system_id', 'ee_bootstrap_version', 'tenant_id', 'domain_id', 'brand',
    'session_id', 'page_view_id', 'campaign_id', 'variant_id', 'landing_page_url', 'page_url', 'page_path', 'page_type', 'referrer',
    'production_gate', 'consent_state', 'kill_switch', 'ee_blocked', 'ee_rejected_props'];

  var legacy = (w.EE && typeof w.EE === 'object' && !w.EE.__stocked) ? w.EE : null; // legacy API loaded before us
  var SITE = w.EE_SITE;

  function install(api) {
    try { Object.defineProperty(w, 'EE', { value: api, writable: false, configurable: false, enumerable: true }); }
    catch (e) { w.EE = api; }
    return api;
  }
  function meta(name) {
    var el = d.querySelector && d.querySelector('meta[name="' + name + '"]');
    return el ? (el.getAttribute('content') || '') : '';
  }
  function clip(v) { return v == null ? null : String(v).slice(0, 300); }
  function trim(o) { var out = {}; for (var k in o) if (o[k] !== undefined && o[k] !== null && o[k] !== '') out[k] = o[k]; return out; }
  function freezeDeep(o) { Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object' && !Object.isFrozen(o[k]) && k !== 'legacy') freezeDeep(o[k]); }); return Object.freeze(o); }

  // ---- F10: EE_SITE is the only source of identity. Missing or malformed => fail closed. ----------------
  var siteOk = !!(SITE && typeof SITE === 'object'
    && typeof SITE.tenant_id === 'string' && /^[A-Z][A-Z0-9]{1,11}$/.test(SITE.tenant_id)
    && typeof SITE.domain_id === 'string' && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(SITE.domain_id));
  var killState = siteOk ? String(SITE.kill_switch || '').toUpperCase() : 'UNKNOWN';
  if (killState !== 'ON' && killState !== 'OFF') killState = 'UNKNOWN';           // unknown truth fails closed
  if (meta('ee-kill-switch').toUpperCase() === 'ON') killState = 'ON';            // a page may only tighten, never loosen

  if (!siteOk) {
    var reason = 'EE_SITE missing or invalid - bootstrap failed closed';
    try { if (w.console && w.console.warn) w.console.warn('[EE] ' + reason); } catch (e) { /* no console */ }
    var blocked = function () { return { ee_blocked: true, reason: reason }; };
    var deny = function () { return { allowed: false, reason: reason }; };
    var reject = function () { return Promise.reject(Object.assign(new Error(reason), { name: 'EESiteMissing' })); };
    install(freezeDeep({
      __stocked: false, __failed: reason, version: VERSION, context: Object.freeze({}), legacy: legacy || {},
      track: blocked, setCampaign: blocked, registerLegacy: function () { return false; },
      hooks: { url: function () { return null; }, configured: function () { return false; }, why: function () { return reason; }, post: reject },
      safety: {
        killSwitch: { state: function () { return 'UNKNOWN'; }, trip: blocked, source: 'UNKNOWN' },
        productionGate: { state: function () { return 'preview'; }, isLive: function () { return false; }, gates: [] },
        consent: { state: function () { return 'none'; }, store: 'UNKNOWN', record: function () { throw new Error(reason); } },
        suppression: { source: 'UNKNOWN', use: function () {}, check: function () { return { checked: false, suppressed: true, source: 'UNKNOWN', reason: reason }; } }
      },
      outbound: { allowed: deny },
      experience: { socket: function () { return null; }, mount: function () { return { mounted: false, reason: reason }; }, unmount: function () { return false; } }
    }));
    return;
  }

  var PAGE = w.EE_PAGE || {};           // optional per-page overrides: {campaign_id, variant_id, page_type}
  function id(prefix) {
    var rand;
    try {
      if (w.crypto && w.crypto.randomUUID) return prefix + '_' + w.crypto.randomUUID();
      var b = new Uint32Array(2); w.crypto.getRandomValues(b);
      rand = b[0].toString(36) + b[1].toString(36);
    } catch (e) { rand = Math.random().toString(36).slice(2); }
    return prefix + '_' + Date.now().toString(36) + '_' + rand;
  }
  function store(kind) { try { return kind === 'local' ? w.localStorage : w.sessionStorage; } catch (e) { return null; } }
  function get(k, kind) { var s = store(kind); try { return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function set(k, v, kind) { var s = store(kind); try { if (s) s.setItem(k, v); } catch (e) { /* storage blocked */ } }
  var params = (function () { try { return new URLSearchParams(w.location.search); } catch (e) { return { get: function () { return null; } }; } })();

  // ---- identity: tenant + domain come from the injected config, never from the hostname ----------------
  var tenantId = SITE.tenant_id;
  var domainId = SITE.domain_id;

  // ---- session + landing page (first URL of the session) ---------------------------------------------
  var sessionId = get('ee_session_id');
  if (!sessionId) { sessionId = id('ses'); set('ee_session_id', sessionId); set('ee_landing_page_url', w.location.href); }
  var landingPageUrl = get('ee_landing_page_url') || w.location.href;
  var pageViewId = id('pv');

  // ---- attribution: UTMs + click IDs, first-touch per session -----------------------------------------
  function captureKeys(keys) {
    var out = {};
    keys.forEach(function (k) {
      var v = params.get(k);
      if (v) { out[k] = clip(v); set('ee_' + k, out[k]); }
      else { var s = get('ee_' + k); if (s) out[k] = s; }
    });
    return out;
  }
  var utms = captureKeys(UTM_KEYS);
  var clickIds = captureKeys(CLICK_KEYS);

  // ---- campaign + variant: OPTIONAL. A campaign attaches to a domain; it never defines it. ------------
  function firstOf(keys) { for (var i = 0; i < keys.length; i++) { var v = params.get(keys[i]); if (v) return clip(v); } return null; }
  var campaignId = clip(PAGE.campaign_id) || firstOf(CAMPAIGN_KEYS) || meta('ee-campaign-id') || get('ee_campaign_id') || null;
  var variantId = clip(PAGE.variant_id) || firstOf(VARIANT_KEYS) || meta('ee-variant-id') || get('ee_variant_id') || null;
  if (campaignId) set('ee_campaign_id', campaignId);
  if (variantId) set('ee_variant_id', variantId);

  var pageType = clip(PAGE.page_type) || meta('ee-page-type') || (function () {
    var p = w.location.pathname || '/';
    return (p === '/' || /\/index\.html?$/.test(p)) ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\.html?$/, '').replace(/\//g, '_') || 'home';
  })();

  // ---- safety state ------------------------------------------------------------------------------------
  var productionGate = String(SITE.production_gate || 'preview').toLowerCase() === 'live' ? 'live' : 'preview';
  var consentState = 'none';
  var suppressionChecker = null;
  var lastBlock = {};

  var context = {
    ee_system_id: 'evolution_engine',
    ee_bootstrap_version: VERSION,
    tenant_id: tenantId,
    domain_id: domainId,
    brand: clip(SITE.brand) || null,
    session_id: sessionId,
    page_view_id: pageViewId,
    campaign_id: campaignId,
    variant_id: variantId,
    landing_page_url: landingPageUrl,
    page_url: w.location.href,
    page_path: w.location.pathname,
    page_type: pageType,
    referrer: d.referrer || '',
    production_gate: productionGate
  };
  for (var k in utms) context[k] = utms[k];
  for (var c in clickIds) context[c] = clickIds[c];
  function snapshot() { return Object.freeze(Object.assign({}, context)); }

  function push(payload) { w.dataLayer = w.dataLayer || []; w.dataLayer.push(payload); return payload; }

  function track(eventName, props) {
    if (!eventName || !/^ee_[a-z0-9_]+$/.test(eventName)) throw new Error('EE.track: event names are ee_snake_case');
    var safe = {}, rejected = [];
    if (props && typeof props === 'object') {
      Object.keys(props).forEach(function (key) { if (RESERVED.indexOf(key) >= 0) rejected.push(key); else safe[key] = props[key]; });
    }
    var payload = trim(Object.assign({}, context, safe, {
      event: eventName,
      event_id: id('evt'),
      event_ts: new Date().toISOString(),
      consent_state: consentState,
      kill_switch: killState
    }));
    if (rejected.length) payload.ee_rejected_props = rejected;
    if (killState !== 'OFF') { payload.ee_blocked = true; return payload; } // kill switch: nothing leaves the page
    return push(payload);
  }

  function hasLegacyContext() {
    var dl = w.dataLayer || [];
    for (var i = 0; i < dl.length; i++) if (dl[i] && dl[i].event === 'ee_page_context') return true;
    return false;
  }

  // ---- runtime (hook map) validation: built for THIS tenant or not trusted at all (F10) -----------------
  var mismatchReported = false;
  function runtime() {
    var r = w.EE_RUNTIME;
    if (!r || typeof r !== 'object') return { ok: false, reason: 'runtime not loaded', hooks: {} };
    if (r.tenant_id !== tenantId) {
      if (!mismatchReported) { mismatchReported = true; track('ee_runtime_mismatch', { runtime_tenant: clip(r.tenant_id) }); }
      return { ok: false, reason: 'runtime tenant mismatch: ' + clip(r.tenant_id), hooks: {} };
    }
    return { ok: true, hooks: (r.hooks && typeof r.hooks === 'object') ? r.hooks : {} };
  }

  var EE = {
    __stocked: true,
    version: VERSION,
    legacy: legacy ? Object.assign({}, legacy) : {},
    registerLegacy: function (api) {
      if (!api || typeof api !== 'object') return false;
      Object.keys(api).forEach(function (key) { EE.legacy[key] = api[key]; });
      return true;
    },
    track: track,
    setCampaign: function (cid, vid) {
      context.campaign_id = clip(cid) || null; context.variant_id = clip(vid) || null;
      if (context.campaign_id) set('ee_campaign_id', context.campaign_id);
      if (context.variant_id) set('ee_variant_id', context.variant_id);
      return snapshot();
    },
    safety: {
      killSwitch: {
        state: function () { return killState; },
        trip: function (reason) { var wasOff = killState === 'OFF'; if (wasOff) track('ee_kill_switch', { reason: clip(reason) || 'manual' }); killState = 'ON'; return killState; },
        source: SITE.kill_switch_source || 'MISSING'
      },
      productionGate: {
        state: function () { return productionGate; },
        isLive: function () { return productionGate === 'live'; },
        gates: Object.freeze((SITE.production_gates || []).slice())
      },
      consent: {
        state: function () { return consentState; },
        store: SITE.consent_store || 'MISSING',
        record: function (evidence) {
          evidence = evidence || {};
          if (!evidence.surface || !evidence.consent_text_id) throw new Error('EE.safety.consent.record needs {surface, consent_text_id}');
          consentState = 'recorded';
          var rec = trim({ surface: clip(evidence.surface), consent_text_id: clip(evidence.consent_text_id), consent_version: clip(evidence.consent_version), method: clip(evidence.method) || 'checkbox', evidence_store: SITE.consent_store || 'MISSING' });
          set('ee_consent_last', JSON.stringify(rec));
          return track('ee_consent_evidence', rec);
        }
      },
      suppression: {
        source: (typeof SITE.suppression_source === 'string') ? SITE.suppression_source : 'UNKNOWN',
        use: function (fn) { suppressionChecker = typeof fn === 'function' ? fn : null; },
        check: function (identity) {
          if (!suppressionChecker) return { checked: false, suppressed: false, source: EE.safety.suppression.source, reason: 'no suppression checker registered for this tenant' };
          try { var r = suppressionChecker(identity || {}); return Object.assign({ checked: true, suppressed: false, source: 'page' }, r || {}); }
          catch (e) { return { checked: false, suppressed: true, source: 'error', reason: String(e && e.message || e) }; }
        }
      }
    },
    outbound: {
      // The single gate every outbound action passes. Unknown truth fails closed (F6).
      allowed: function (identity) {
        var deny = function (why) { return { allowed: false, reason: why }; };
        if (killState !== 'OFF') return deny('kill_switch ' + killState);
        if (productionGate !== 'live') return deny('production_gate ' + productionGate);
        if (consentState !== 'recorded') return deny('no consent evidence recorded');
        var src = EE.safety.suppression.source;
        if (src === 'UNKNOWN') return deny('suppression truth unknown');
        var s = EE.safety.suppression.check(identity);
        if (s.suppressed) return deny('suppressed');
        var declaredAbsent = (src === 'MISSING' || src === 'NOT_APPLICABLE');
        if (!s.checked && !declaredAbsent) return deny('suppression source ' + src + ' declared but no check ran');
        return { allowed: true, reason: 'ok', suppression: s.checked ? 'checked' : 'not_connected:' + src };
      }
    },
    hooks: {
      // Hook URLs are secrets. They never live in the repo: Render injects them at build time into
      // /ee/runtime.js (window.EE_RUNTIME.hooks) from env vars named EE_HOOK_<TENANT>_<NAME>.
      // url() is the ONLY way to obtain one, and it passes the outbound gate first - there is no bypass.
      configured: function (name) { var rt = runtime(); var h = rt.ok && rt.hooks[name]; return typeof h === 'string' && /^https:\/\//.test(h); },
      why: function (name) { return lastBlock[name] || null; },
      url: function (name, identity) {
        var rt = runtime();
        if (!rt.ok) { lastBlock[name] = rt.reason; track('ee_outbound_blocked', { hook: clip(name), reason: rt.reason }); return null; }
        var gate = EE.outbound.allowed(identity);
        if (!gate.allowed) { lastBlock[name] = gate.reason; track('ee_outbound_blocked', { hook: clip(name), reason: gate.reason }); return null; }
        var h = rt.hooks[name];
        if (!(typeof h === 'string' && /^https:\/\//.test(h))) { lastBlock[name] = 'hook not configured'; track('ee_hook_missing', { hook: clip(name) }); return null; }
        lastBlock[name] = null;
        return h;
      },
      post: function (name, body, opts) {
        opts = opts || {};
        var url = EE.hooks.url(name, opts.identity);
        if (!url) return Promise.reject(Object.assign(new Error(lastBlock[name] || 'blocked'), { name: /not configured/.test(lastBlock[name] || '') ? 'HookMissing' : 'OutboundBlocked', hook: name, reason: lastBlock[name] }));
        var isForm = !!(w.URLSearchParams && body instanceof w.URLSearchParams) || !!(w.FormData && body instanceof w.FormData);
        var payload = (body && typeof body === 'object' && !isForm) ? Object.assign({ tenant_id: tenantId, domain_id: domainId, session_id: sessionId }, body) : body;
        var init = { method: 'POST', keepalive: true, body: (isForm || typeof payload === 'string') ? payload : JSON.stringify(payload) };
        if (opts.mode) init.mode = opts.mode;
        if (!isForm) init.headers = opts.headers || { 'Content-Type': opts.contentType || 'application/json' };
        return (opts.fetch || w.fetch)(url, init);
      }
    },
    experience: {
      socket: function (name) {
        return d.querySelector('[data-ee-socket="' + (name || 'primary') + '"]') || d.getElementById('ee-experience');
      },
      mount: function (opts) {
        opts = opts || {};
        if (!opts.id || typeof opts.render !== 'function') throw new Error('EE.experience.mount needs {id, render(el, ctx)}');
        if (killState !== 'OFF') return { mounted: false, reason: 'kill_switch ' + killState };
        if (opts.requires_live && productionGate !== 'live') return { mounted: false, reason: 'production_gate ' + productionGate };
        var el = EE.experience.socket(opts.socket);
        if (!el) return { mounted: false, reason: 'no socket' };
        el.setAttribute('data-ee-experience', opts.id);
        opts.render(el, snapshot());
        el.hidden = false;
        track('ee_experience_mount', { experience_id: clip(opts.id), socket: clip(opts.socket) || 'primary' });
        return { mounted: true, el: el };
      },
      unmount: function (name) {
        var el = EE.experience.socket(name);
        if (!el) return false;
        var xid = el.getAttribute('data-ee-experience');
        el.innerHTML = ''; el.hidden = true; el.removeAttribute('data-ee-experience');
        if (xid) track('ee_experience_unmount', { experience_id: xid });
        return true;
      }
    }
  };
  // EE.context is always a fresh frozen snapshot: system-owned identifiers cannot be mutated from outside (F7).
  Object.defineProperty(EE, 'context', { get: snapshot, enumerable: true });
  install(freezeDeep(EE));

  // ---- load event: keep the existing `ee_page_context` convention, never double it ---------------------
  if (hasLegacyContext()) track('ee_context_update', { context_source: 'bootstrap' });
  else track('ee_page_context', { context_source: 'bootstrap' });
})(window, document);
