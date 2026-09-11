/*!
 * Evolution Engine — domain stocking bootstrap (v1)
 * Source of truth: shared/ee/bootstrap.js  (copied verbatim to <tenant>/ee/bootstrap.js by tools/stock-domains.mjs)
 *
 * One dependency-free script every canonical domain loads. It gives a site three things:
 *   1. Canonical event bootstrap  — window.EE.track(name, props) pushes ee_* events onto window.dataLayer
 *                                    with tenant_id, domain_id, session_id, campaign_id (optional),
 *                                    variant_id (optional), landing_page_url, UTMs and click IDs.
 *   2. Dynamic experience socket  — window.EE.experience.mount({id, render}) renders into
 *                                    <div id="ee-experience" data-ee-socket="primary" hidden>.
 *   3. Shared safety hooks        — window.EE.safety.{consent, suppression, killSwitch, productionGate}
 *                                    and window.EE.outbound.allowed(). Hooks exist on every domain; they
 *                                    are OFF unless the tenant manifest says the capability is connected.
 *
 * Configuration comes ONLY from the inline `window.EE_SITE` block the stocking tool injects into the page,
 * which is derived from that tenant's own <tenant>/domain.json. Nothing in here names another tenant.
 * No secrets, no webhook URLs, no pixels, no network calls. Delivery is whatever GTM/GA4 the page already loads.
 */
(function (w, d) {
  'use strict';
  if (w.EE && w.EE.__stocked) return; // idempotent

  var SITE = w.EE_SITE || {};
  var PAGE = w.EE_PAGE || {};           // optional per-page overrides: {campaign_id, variant_id, page_type}
  var VERSION = 'stocking-v1';
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'];
  var CLICK_KEYS = ['gclid', 'gbraid', 'wbraid', 'dclid', 'fbclid', 'ttclid', 'msclkid', 'li_fat_id', 'twclid', 'epik', 'rdt_cid'];
  // `ee_campaign` / `ee_variant` name an Evolution Engine campaign. A bare `?campaign_id=` on the URL is the
  // ad platform's campaign id (Meta/Google), which page code records as platform_campaign_id - never conflated.
  var CAMPAIGN_KEYS = ['ee_campaign'];
  var VARIANT_KEYS = ['ee_variant'];

  function id(prefix) {
    var rand;
    try {
      if (w.crypto && w.crypto.randomUUID) return prefix + '_' + w.crypto.randomUUID();
      var b = new Uint32Array(2); w.crypto.getRandomValues(b);
      rand = b[0].toString(36) + b[1].toString(36);
    } catch (e) { rand = Math.random().toString(36).slice(2); }
    return prefix + '_' + Date.now().toString(36) + '_' + rand;
  }
  function meta(name) {
    var el = d.querySelector && d.querySelector('meta[name="' + name + '"]');
    return el ? (el.getAttribute('content') || '') : '';
  }
  function store(kind) {
    try { return kind === 'local' ? w.localStorage : w.sessionStorage; } catch (e) { return null; }
  }
  function get(k, kind) { var s = store(kind); try { return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function set(k, v, kind) { var s = store(kind); try { if (s) s.setItem(k, v); } catch (e) { /* storage blocked */ } }
  function clip(v) { return v == null ? null : String(v).slice(0, 300); }
  function trim(o) { var out = {}; for (var k in o) if (o[k] !== undefined && o[k] !== null && o[k] !== '') out[k] = o[k]; return out; }

  var params = (function () { try { return new URLSearchParams(w.location.search); } catch (e) { return { get: function () { return null; } }; } })();

  // ---- identity: tenant + domain come from the injected config, never from the hostname ----------------
  var tenantId = clip(SITE.tenant_id) || null;
  var domainId = clip(SITE.domain_id) || null;

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

  // ---- safety hooks -----------------------------------------------------------------------------------
  var killTripped = String(SITE.kill_switch || meta('ee-kill-switch') || 'OFF').toUpperCase() === 'ON';
  var productionGate = String(SITE.production_gate || meta('ee-production-gate') || 'preview').toLowerCase(); // 'preview' | 'live'
  var consentState = 'none';
  var suppressionChecker = null;

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

  function push(payload) {
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(payload);
    return payload;
  }

  function track(eventName, props) {
    if (!eventName || !/^ee_[a-z0-9_]+$/.test(eventName)) throw new Error('EE.track: event names are ee_snake_case');
    var payload = trim(Object.assign({}, context, {
      event: eventName,
      event_id: id('evt'),
      event_ts: new Date().toISOString(),
      consent_state: consentState,
      kill_switch: killTripped ? 'ON' : 'OFF'
    }, props || {}));
    if (killTripped) { payload.ee_blocked = true; return payload; } // kill switch: nothing leaves the page
    return push(payload);
  }

  function hasLegacyContext() {
    var dl = w.dataLayer || [];
    for (var i = 0; i < dl.length; i++) if (dl[i] && dl[i].event === 'ee_page_context') return true;
    return false;
  }

  var EE = {
    __stocked: true,
    version: VERSION,
    context: context,
    track: track,
    setCampaign: function (cid, vid) {
      context.campaign_id = clip(cid) || null; context.variant_id = clip(vid) || null;
      if (context.campaign_id) set('ee_campaign_id', context.campaign_id);
      if (context.variant_id) set('ee_variant_id', context.variant_id);
      return context;
    },
    safety: {
      killSwitch: {
        state: function () { return killTripped ? 'ON' : 'OFF'; },
        trip: function (reason) { killTripped = true; return track('ee_kill_switch', { reason: clip(reason) || 'manual' }); },
        source: SITE.kill_switch_source || 'MISSING'
      },
      productionGate: {
        state: function () { return productionGate; },
        isLive: function () { return productionGate === 'live'; },
        gates: SITE.production_gates || []
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
        source: SITE.suppression_source || 'MISSING',
        use: function (fn) { suppressionChecker = typeof fn === 'function' ? fn : null; },
        check: function (identity) {
          if (!suppressionChecker) return { checked: false, suppressed: false, source: SITE.suppression_source || 'MISSING', reason: 'no suppression source connected for this tenant' };
          try { var r = suppressionChecker(identity || {}); return Object.assign({ checked: true, suppressed: false, source: 'page' }, r || {}); }
          catch (e) { return { checked: false, suppressed: true, source: 'error', reason: String(e && e.message || e) }; }
        }
      }
    },
    hooks: {
      // Hook URLs are secrets. They never live in the repo: Render injects them at build time into
      // /ee/runtime.js (window.EE_RUNTIME.hooks) from env vars named EE_HOOK_<TENANT>_<NAME>. Page code
      // asks for a hook by NAME; an unconfigured hook fails closed with an ee_hook_missing event.
      url: function (name) {
        var r = w.EE_RUNTIME, h = r && r.hooks && r.hooks[name];
        return (typeof h === 'string' && /^https:\/\//.test(h)) ? h : null;
      },
      configured: function (name) { return !!EE.hooks.url(name); },
      post: function (name, body, opts) {
        opts = opts || {};
        var url = EE.hooks.url(name);
        if (killTripped) return Promise.reject(Object.assign(new Error('kill_switch ON'), { name: 'KillSwitch', hook: name }));
        if (!url) { track('ee_hook_missing', { hook: clip(name) }); return Promise.reject(Object.assign(new Error('hook not configured: ' + name), { name: 'HookMissing', hook: name })); }
        var payload = (body && typeof body === 'object' && !(body instanceof w.URLSearchParams || false)) ? Object.assign({ tenant_id: tenantId, domain_id: domainId, session_id: sessionId }, body) : body;
        var init = { method: 'POST', keepalive: true, body: opts.form ? payload : JSON.stringify(payload) };
        if (opts.mode) init.mode = opts.mode;
        init.headers = opts.headers || (opts.form ? undefined : { 'Content-Type': opts.contentType || 'application/json' });
        return (opts.fetch || w.fetch)(url, init);
      }
    },
    outbound: {
      // Any future outbound action (email, SMS, call, webhook) must pass this gate first.
      allowed: function (identity) {
        if (killTripped) return { allowed: false, reason: 'kill_switch ON' };
        if (productionGate !== 'live') return { allowed: false, reason: 'production_gate ' + productionGate };
        var s = EE.safety.suppression.check(identity);
        if (s.suppressed) return { allowed: false, reason: 'suppressed' };
        if (consentState !== 'recorded') return { allowed: false, reason: 'no consent evidence recorded' };
        return { allowed: true, reason: 'ok' };
      }
    },
    experience: {
      socket: function (name) {
        return d.querySelector('[data-ee-socket="' + (name || 'primary') + '"]') || d.getElementById('ee-experience');
      },
      mount: function (opts) {
        opts = opts || {};
        if (!opts.id || typeof opts.render !== 'function') throw new Error('EE.experience.mount needs {id, render(el, ctx)}');
        if (killTripped) return { mounted: false, reason: 'kill_switch ON' };
        if (opts.requires_live && productionGate !== 'live') return { mounted: false, reason: 'production_gate ' + productionGate };
        var el = EE.experience.socket(opts.socket);
        if (!el) return { mounted: false, reason: 'no socket' };
        el.setAttribute('data-ee-experience', opts.id);
        opts.render(el, context);
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
  w.EE = EE;

  // ---- load event: keep the existing `ee_page_context` convention, never double it ---------------------
  if (hasLegacyContext()) track('ee_context_update', { context_source: 'bootstrap' });
  else track('ee_page_context', { context_source: 'bootstrap' });
})(window, document);
