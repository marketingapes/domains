#!/usr/bin/env node
// Campaign kit: one campaign JSON -> a complete three-door lane on besttortlawyers.com plus the
// staged (never live) channel, voice, delivery, portal and launch files that go with it.
//
//   node campaign-kit/build.mjs campaign-kit/campaigns/<slug>.json   # one campaign
//   node campaign-kit/build.mjs --all                                 # every config in campaigns/
//   node campaign-kit/build.mjs --onboarding                          # firm request preview only
//
// Writes:
//   btl/c/<slug>/{index,quiz,sofia,form,ads}.html + site.css   public pages, always noindex
//   campaign-kit/out/<slug>/preview/…                           same pages when publish:false (not deployed)
//   campaign-kit/out/<slug>/*.json + LAUNCH.md + assets.json    internal bundle, not deployed
//   campaign-kit/BRIEF.md (checklist block)                     with --all, the read-first brief's status table
//
// Pages are PREVIEWS unless the config says status:"live" and every launch gate carries evidence. A preview has
// no GTM, no TrustedForm, no dialable phone link, no webhook and a connect-src 'none' CSP, so it cannot reach
// production. Nothing here calls an ad platform, Vapi, Make or a buyer; every channel file is a PAUSED draft.
import {readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ORDER_SCHEMA, browserOrderContractSource} from './order-contract.mjs';

const KIT = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(KIT, '..');
export const KIT_VERSION = '2026-10-26.2';

// ---------- defaults (Best Tort Lawyers house brand, BTL web container, BTL Meta assets) ----------
const BTL_BRAND = {
  name: 'Best Tort Lawyers', short: 'BTL', phone_display: '(213) 878-7408', phone_tel: '+12138787408',
  site_url: 'https://besttortlawyers.com', privacy_url: 'https://besttortlawyers.com/privacy-policy/',
  terms_url: 'https://besttortlawyers.com/terms-and-conditions/', logo: '/assets/btl-seal.svg',
  address: 'Best Tort Lawyers · a claim matching service operated by Marketing Apes LLC',
  advertising_note: 'Best Tort Lawyers is not a law firm and does not provide legal advice. Submitting an inquiry does not create an attorney-client relationship. Participating attorneys decide whether to take any claim.',
  team_name: 'the review team', fee_line: 'Free to check. No cost to you.',
  colors: {deep: '#0B1220', navy: '#111827', blue: '#2457E6', blue_ink: '#1d47bd', gold: '#C6A15B', gold_ink: '#8a6a2c', bg2: '#F6F1E7', line: '#D9D2C5', ok: '#17643A'},
  fonts: {display: 'Lora', body: 'Open Sans'},
  trust: [['24/7', 'Sofia answers any time'], ['2 min', 'To check your claim'], ['$0', 'Cost to you'], ['1 person', 'Reviews every inquiry']],
};
const DEFAULTS = {
  domain_id: 'besttortlawyers.com', status: 'draft',
  gtm: 'GTM-PHC7459M',
  intake: {webhook: null, trustedform: true},
  budget: {media_total_usd: 5000, days: 14},
  channels: {
    meta: {ad_account: 'act_411567125842274', page_id: '222081604317115', instagram_id: '17841464212888132', pixel_id: '673552078259404', objective: 'OUTCOME_LEADS', special_ad_categories: []},
    google: {customer_id: '6072919714', network: 'SEARCH', match: 'EXACT_AND_PHRASE'},
    tiktok: {advertiser_id: '7445082454647783425', objective: 'LEAD_GENERATION'},
    openai: {ad_account: 'adacct_69fbe2c8e0a081a1a4de498b5418243c'},
  },
  split: {meta: 0.55, google: 0.25, tiktok: 0.1, openai: 0.1},
};
const DOORS = ['quiz', 'sofia', 'form'];
const SIGNALS = ['good', 'bad', 'unsure', 'represented', 'neutral'];
const DELIVERY = ['live_transfer', 'scheduled_callback', 'api_webhook', 'email'];
const TRANSFER_KINDS = ['firm', 'internal', 'demo'];
// A gate passes only with evidence: config.gates.<key> = {by, at, evidence}.
export const GATES = [
  ['criteria_approved', 'Buyer criteria approved in writing'],
  ['copy_approved', 'Firm identity, disclosures and attorney-advertising copy signed off'],
  ['intake_receipt_tested', 'Test lead to intake.webhook returned a receipt and the stored record was found'],
  ['firm_transfer_tested', 'Live call transferred to the firm intake line (not a demo or internal line)'],
  ['trustedform_tested', 'TrustedForm certificate retained on a production test submission'],
  ['conversions_tested', 'Approved measurement verified for selected channels; policy-disabled channels documented'],
  ['portal_tested', 'Perspective portal shows the test lead'],
  ['billing', 'Invoice paid / media authorization on file'],
  ['activation_approved', 'Kyle approved activation in chat (exact campaign + budget)'],
];
const gateOk = (c, k) => { const g = c.gates?.[k]; return !!(g && g.by && g.at && g.evidence); };
const CLICK_IDS = /^(utm_|fbclid$|gclid$|gbraid$|wbraid$|ttclid$|msclkid$|oai_)/;

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const js = v => JSON.stringify(v).replace(/</g, '\\u003c');
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function merge(a, b) { const o = {...a}; for (const [k, v] of Object.entries(b ?? {})) o[k] = isObj(v) && isObj(a?.[k]) ? merge(a[k], v) : v; return o; }
const telOk = s => /^\+1\d{10}$/.test(s);

// ---------- validation ----------
export function normalize(raw) {
  const c = merge(DEFAULTS, raw);
  c.brand = merge(BTL_BRAND, raw.brand);
  const errs = [];
  const need = (cond, msg) => { if (!cond) errs.push(msg); };
  need(/^[A-Z0-9][A-Z0-9-]{3,60}$/.test(c.campaign_id ?? ''), 'campaign_id: UPPER-KEBAB, e.g. BTL-PARAQUAT-002');
  need(/^[a-z0-9][a-z0-9-]{1,60}$/.test(c.slug ?? ''), 'slug: lower-kebab');
  need(/^[a-z0-9_]{2,24}$/.test(c.tenant_id ?? ''), 'tenant_id: [a-z0-9_]{2,24}');
  need(c.tort?.name, 'tort.name required');
  need(telOk(c.brand.phone_tel), 'brand.phone_tel must be E.164 US');
  need(c.sofia && telOk(c.sofia.phone_tel), 'sofia.phone_tel must be E.164 US (the campaign voice line)');
  need(c.intake.webhook == null || /^https:\/\//.test(c.intake.webhook), 'intake.webhook must be https or null');
  need(Array.isArray(c.quiz) && c.quiz.length >= 3 && c.quiz.length <= 10, 'quiz: 3-10 questions');
  for (const [i, q] of (c.quiz ?? []).entries()) {
    need(/^[a-z][a-z0-9_]*$/.test(q.key ?? ''), `quiz[${i}].key`);
    need(q.q && Array.isArray(q.options) && q.options.length >= 2, `quiz[${i}] needs q + 2+ options`);
    for (const o of q.options ?? []) need(SIGNALS.includes(o.signal), `quiz[${i}] option "${o.label}" signal must be one of ${SIGNALS.join('|')}`);
  }
  need(new Set((c.quiz ?? []).map(q => q.key)).size === (c.quiz ?? []).length, 'quiz keys must be unique');
  need(Array.isArray(c.geo?.states) && c.geo.states.length, 'geo.states: at least one state (or ["US"])');
  need(DELIVERY.includes(c.delivery?.mode), `delivery.mode: ${DELIVERY.join('|')}`);
  need(!('transfer_number' in (c.delivery ?? {})), 'delivery.transfer_number is replaced by delivery.transfer {number, kind, label, source}');
  const t = c.delivery?.transfer, inbound = [c.sofia?.phone_tel, ...(c.sofia?.inbound_numbers ?? [])];
  if (t) {
    need(telOk(t.number ?? ''), 'delivery.transfer.number must be E.164 US');
    need(TRANSFER_KINDS.includes(t.kind), `delivery.transfer.kind: ${TRANSFER_KINDS.join('|')}`);
    need(!inbound.includes(t.number), 'delivery.transfer.number is a Sofia inbound line — the call would transfer to itself');
    need(t.source, 'delivery.transfer.source: where the destination was read (e.g. Vapi tool id + date)');
  }
  c.mode = c.status === 'live' ? 'live' : 'preview';
  if (c.mode === 'live') {
    const open = GATES.filter(([k]) => !gateOk(c, k)).map(([k]) => k);
    need(!open.length, `status "live" needs evidence on every gate; open: ${open.join(', ')}`);
    need(c.intake.webhook, 'status "live" needs intake.webhook');
    if (c.delivery?.mode === 'live_transfer') need(t?.kind === 'firm', 'status "live" with live_transfer needs delivery.transfer.kind "firm"');
  }
  if (c.delivery?.mode === 'api_webhook') need(/^https:\/\//.test(c.delivery.buyer_webhook ?? ''), 'delivery.buyer_webhook (https) required for api_webhook');
  need(Array.isArray(c.criteria?.qualifies) && c.criteria.qualifies.length, 'criteria.qualifies: list the buyer-approved criteria');
  if (errs.length) throw Error(`${c.slug ?? '?'}: invalid campaign config\n  - ` + errs.join('\n  - '));
  c.copy = copyDefaults(c);
  c.form_fields ??= c.quiz.slice(0, 2).map(q => ({key: q.key, label: q.q, options: q.options.map(o => ({value: o.value, label: o.label}))}));
  c.ads ??= adDefaults(c);
  return c;
}

function copyDefaults(c) {
  const t = c.tort, team = c.brand.team_name, d = t.descriptor ? ` · ${t.descriptor}` : '';
  const base = {
    index: {eyebrow: t.name + d, h1: t.headline ?? `Hurt after ${t.name}? Find out where you stand.`, lede: t.lede ?? `If ${t.name} affected you or someone you love, you may be able to file a claim. Check in two minutes, talk it through with Sofia, or ask for a callback.`, chips: [c.brand.fee_line.split('.')[0], 'A person reviews every inquiry', 'Deadlines checked first']},
    quiz: {eyebrow: `${t.name} · two-minute check`, h1: `${c.quiz.length} questions. Then you know your next step.`, lede: 'No medical records, no Social Security number, no cost.', chips: ['Instant result', 'A person reviews every answer', c.brand.fee_line.split('.')[0]]},
    sofia: {eyebrow: `${t.name} · talk it through`, h1: 'Tell us what happened. We listen first.', lede: `Sofia is an AI intake assistant. She says so, and the call is recorded. She asks a few yes/no questions, then connects you with ${team}.`, chips: ['Answers 24/7', 'No medical records asked', 'A person takes over']},
    form: {eyebrow: `${t.name} · request a callback`, h1: "Tell us what happened. We'll call you back.", lede: `Send a few details and pick a time. ${team[0].toUpperCase() + team.slice(1)} reviews what you send and calls you.`, chips: ['Pick your time', 'One business day', c.brand.fee_line.split('.')[0]]},
    ads: {eyebrow: `${t.name} · the campaign`, h1: 'Three ads. Three doors. One team.', lede: 'Each ad lands on its own page so we know which door produced the claim. Built, reviewed, paused until approved.', chips: ['Facebook + Instagram', 'Google, TikTok, ChatGPT drafts', 'Paused until approved']},
    steps: [['You tell us the basics', 'What happened, when, and what followed. Two minutes.'], ['We review', `${team[0].toUpperCase() + team.slice(1)} checks your answers and any filing deadlines.`], ['We call you back', 'With a clear next step and exactly what we need.'], ['A lawyer takes it from there', 'If the claim fits, a participating attorney handles it.']],
    sofia_steps: [['She tells you what she is', 'An AI assistant, and that the call is recorded.'], ['A few yes/no questions', 'The same questions as the online check.'], ['Name, number, state', 'That is all she collects. No medical details.'], ['A person takes over', `Sofia connects you with ${team} and steps out.`]],
  };
  return merge(base, c.copy);
}

function adDefaults(c) {
  const t = c.tort.name;
  return [
    {door: 'quiz', headline: `Affected by ${t}?`, primary_text: `Answer ${c.quiz.length} quick questions and see where you stand. ${c.brand.fee_line}`, cta: 'LEARN_MORE'},
    {door: 'sofia', headline: 'Talk it through with Sofia', primary_text: `Prefer to talk? Call and tell us what happened with ${t}. Sofia, an AI intake assistant, asks a few questions and connects you with a person.`, cta: 'CALL_NOW'},
    {door: 'form', headline: `Start your ${t} claim review`, primary_text: `Tell us what happened and ${c.brand.team_name} calls you back at a time you choose.`, cta: 'SIGN_UP'},
  ];
}

// ---------- page shell ----------
const PAGE_FILES = {index: 'index.html', quiz: 'quiz.html', sofia: 'sofia.html', form: 'form.html', ads: 'ads.html'};
const pid = (c, page) => `${c.slug}-${page}`;

function head(c, page, title, desc) {
  const b = c.brand, f = b.fonts, fam = [...new Set([f.display, f.body])].map(n => 'family=' + n.replace(/ /g, '+') + ':wght@400;600;700').join('&');
  const live = c.mode === 'live', tf = live && c.intake.trustedform && (page === 'quiz' || page === 'form') ? TRUSTEDFORM : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex,follow">
<meta name="campaign-kit" content="${esc(c.campaign_id)} · ${KIT_VERSION} · ${c.mode}">${live ? '' : `
<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">`}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website">${c.images?.og ? `<meta property="og:image" content="${esc(c.images.og)}">` : ''}
<link rel="icon" href="${esc(b.logo)}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fam}&display=swap">
<link rel="stylesheet" href="site.css?v=${KIT_VERSION}">
${live ? `<!-- Google Tag Manager (${esc(c.gtm)}). Non-identifying events only: ee_page_view, ee_door_click, ee_lead_submit_attempt, ee_lead_submit_success. No PII is pushed. -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${js(c.gtm)});</script>` : '<!-- PREVIEW: GTM, TrustedForm, phone dialing and lead sending are off. -->'}
<script>window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'ee_page_view',page_id:${js(pid(c, page))},campaign_id:${js(c.campaign_id)},tenant_id:${js(c.tenant_id)},domain_id:${js(c.domain_id)}});</script>
${tf}</head><body>
${live ? '' : '<div class="kit-preview" role="note"><b>Preview</b> · nothing on this page sends a lead, places a call or loads tracking.</div>\n'}<div class="bar"><div class="in"><span><b>${esc(b.fee_line)}</b> ${esc(b.tagline ?? 'Free consultation, 24/7.')}</span>${tel(c, c.sofia.phone_tel, c.sofia.phone_display, 'data-door="sofia"')}</div></div>
<div class="nav"><div class="in"><a href="./" class="brand" aria-label="${esc(b.name)}">${b.logo_wide ? `<img src="${esc(b.logo_wide)}" alt="${esc(b.name)}">` : `<span class="wordmark"><img src="${esc(b.logo)}" alt="" width="36" height="36">${esc(b.name)}</span>`}</a><nav class="links"><a href="quiz.html">Case check</a><a href="form.html">Request a callback</a><a class="call" href="sofia.html">Talk to us now</a></nav></div></div>
`;
}

// Previews may load the page's own files and Google Fonts, nothing else: no fetch, no form posts, no third-party scripts.
export const PREVIEW_CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'none'; form-action 'none'; frame-src 'none'";
// Live: a dialable link. Preview: the number as text, so tapping it never rings a production line.
const tel = (c, e164, label, attrs = '', cls = '') => c.mode === 'live'
  ? `<a href="tel:${esc(e164)}"${cls ? ` class="${cls}"` : ''}${attrs ? ' ' + attrs : ''}>${esc(label)}</a>`
  : `<span class="tel-off${cls ? ' ' + cls : ''}"${attrs ? ' ' + attrs : ''} title="Preview: calling is turned off">${esc(label)}</span>`;

// TrustedForm certificate script (public snippet). Writes xxTrustedFormCertUrl into each form on the page.
const TRUSTEDFORM = `<script>(function(){var tf=document.createElement('script');tf.type='text/javascript';tf.async=true;tf.src=('https:'==document.location.protocol?'https':'http')+'://api.trustedform.com/trustedform.js?field=xxTrustedFormCertUrl&use_tagged_consent=true&l='+new Date().getTime()+Math.random();var s=document.getElementsByTagName('script')[0];s.parentNode.insertBefore(tf,s);})();</script>
`;

const hero = (h, card) => `<header class="hero"><div class="in hero-grid">
  <div class="hero-copy"><p class="eyebrow">${esc(h.eyebrow)}</p><h1>${esc(h.h1)}</h1><p class="lede">${esc(h.lede)}</p>
  <ul class="chips">${h.chips.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <div class="hero-card">${card}</div>
</div></header>`;

const trust = c => `<div class="trust"><div class="in">${c.brand.trust.map(([b, s]) => `<div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')}</div></div>`;
const steps = (title, rows) => `<section><div class="in"><h2 class="sec center">${esc(title)}</h2><div class="steps">${rows.map(([b, s]) => `<div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')}</div></div></section>`;
const close = (c, a, b) => `<section class="close"><div class="in center"><p class="eyebrow">${esc(c.brand.name)}</p><h2 class="sec">Ready when you are.</h2><p>Two minutes online, or one call. Either way, you will know your next step today.</p>
  <p class="ctas"><a class="cta" href="${a[0]}">${esc(a[1])}</a><a class="cta alt" href="${b[0]}">${esc(b[1])}</a></p></div></section>`;
function proof(c) {
  const p = c.copy.proof;
  if (!p) return '';
  return `<section class="team"><div class="in">${c.images?.team ? `<figure><img src="${esc(c.images.team)}" alt="${esc(p.image_alt ?? '')}" loading="lazy"></figure>` : ''}<div>
  <p class="eyebrow dark">${esc(p.eyebrow)}</p><h2 class="sec">${esc(p.h2)}</h2><p>${esc(p.p)}</p>
  ${p.checks ? `<ul class="checks">${p.checks.map(([b, s]) => `<li><b>${esc(b)}</b> ${esc(s)}</li>`).join('')}</ul>` : ''}</div></div></section>`;
}
function foot(c) {
  const b = c.brand, na = c.tort.not_affiliated ? ` Not affiliated with ${esc(c.tort.not_affiliated)}.` : '';
  return `<footer><div class="in">
  <div>${esc(b.address)} · ${tel(c, b.phone_tel, b.phone_display)} · <a href="${esc(b.privacy_url)}">Privacy</a> · <a href="${esc(b.terms_url)}">Terms</a></div>
  <div>Attorney advertising. ${esc(b.advertising_note)}${na} Prior results do not guarantee a similar outcome. Sofia is an AI intake assistant; calls are recorded.</div>
</div></footer>
<script>document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[data-door]');if(!a)return;try{window.dataLayer.push({event:'ee_door_click',page_id:location.pathname,campaign_id:${js(c.campaign_id)},door:a.getAttribute('data-door')});}catch(x){}});</script>
</body></html>
`;
}

// ---------- doors ----------
function states(c) {
  const s = c.geo.states.includes('US') ? US_STATES : c.geo.states;
  return `<select id="state" name="state" required><option value="">Choose</option>${s.map(x => `<option>${esc(x)}</option>`).join('')}${c.geo.allow_other === false ? '' : '<option value="other">Other</option>'}</select>`;
}
const US_STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');

function consent(c) {
  const who = c.intake.consent_entity ?? `${c.brand.name}, participating law firms and their service providers`;
  return `<div class="consent">
  <label><input type="checkbox" id="c_call" name="consent_call" data-tf-element-role="consent-opt-in"> <span data-tf-element-role="consent-language">I agree that ${esc(who)} may call me at the number above about my ${esc(c.tort.name)} inquiry, including by automated dialing or an AI assistant. Consent is not a condition of service.</span></label>
  <label><input type="checkbox" id="c_sms" name="consent_sms"> <span>I agree to receive text messages about my inquiry. Msg &amp; data rates may apply. Reply STOP to opt out.</span></label>
</div><span class="err" id="cerr"></span>`;
}
const contactFields = (c, email) => `<div class="grid2">
  <div class="f"><label for="first">First name</label><input id="first" name="first_name" autocomplete="given-name" required><span class="err"></span></div>
  <div class="f"><label for="last">Last name</label><input id="last" name="last_name" autocomplete="family-name" required><span class="err"></span></div>
  <div class="f"><label for="phone">Best phone</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required><span class="err"></span></div>
  ${email ? '<div class="f"><label for="email">Email (optional)</label><input id="email" name="email" type="email" autocomplete="email"><span class="err"></span></div>' : ''}
  <div class="f"><label for="state">State you live in</label>${states(c)}<span class="err"></span></div>`;
const fine = c => `<p class="err" id="senderr" role="alert" hidden>That did not go through. Please try again, or call ${tel(c, c.sofia.phone_tel, c.sofia.phone_display)}.</p><p class="fine">By submitting you agree to the <a href="${esc(c.brand.privacy_url)}">privacy policy</a> and <a href="${esc(c.brand.terms_url)}">terms</a>. Attorney advertising. This is not a case decision; a person reviews every inquiry.</p>`;
const done = (c, msg) => `<div class="ok" id="done" hidden role="status"><b>Received.</b>${esc(msg)} If you would rather talk now, call ${tel(c, c.sofia.phone_tel, c.sofia.phone_display, 'data-door="sofia"')}.
  <span class="ref">Your reference: <b id="ref"></b>${c.mode === 'live' ? '' : ' <em>(preview — nothing was sent)</em>'}</span>
  <button type="button" class="back" id="again">Start a new request</button></div>`;

function quizCard(c) {
  const n = c.quiz.length;
  const qs = c.quiz.map((q, i) => `<div class="q${i ? '' : ' on'}" data-k="${esc(q.key)}"><h2 class="qh">${esc(q.q)}</h2>${q.hint ? `<p class="qs">${esc(q.hint)}</p>` : ''}
    <div class="opts">${q.options.map(o => `<button type="button" data-v="${esc(o.value)}" data-s="${esc(o.signal)}">${esc(o.label)}</button>`).join('')}</div></div>`).join('\n  ');
  return `<div class="card" id="quiz" data-campaign="${esc(c.campaign_id)}" data-door="quiz">
  <div class="card-head"><span class="k">Eligibility check</span><span class="count" id="count">1 of ${n}</span></div>
  <div class="prog"><i id="bar"></i></div>
  ${qs}
  <div class="q" data-k="result"><div id="res"></div>
    <form id="cap" novalidate data-kit>${contactFields(c, false)}</div>${consent(c)}
      <button class="cta wide" type="submit" id="send">Send my answers</button>${fine(c)}</form>
    ${done(c, `${c.brand.team_name[0].toUpperCase() + c.brand.team_name.slice(1)} will call you back.`)}
  </div>
  <p class="backrow"><button class="back" id="back" type="button" hidden>← Back</button></p>
</div>`;
}

function formCard(c) {
  const sel = c.form_fields.map(f => `<div class="f"><label for="ff_${esc(f.key)}">${esc(f.label)}</label><select id="ff_${esc(f.key)}" name="${esc(f.key)}" required><option value="">Choose</option>${f.options.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select><span class="err"></span></div>`).join('');
  return `<div class="card">
  <div class="card-head"><span class="k">Request a callback</span><span class="count">Takes a minute</span></div>
  <form id="f" novalidate data-kit data-campaign="${esc(c.campaign_id)}" data-door="form">${contactFields(c, true)}${sel}
    <div class="f"><label for="when">Best time to call</label><select id="when" name="best_time"><option>Morning</option><option>Afternoon</option><option>Evening</option><option>Any time</option></select><span class="err"></span></div></div>
    <div class="f" style="margin-top:14px"><label for="note">Anything you want us to know (optional)</label><textarea id="note" name="note" rows="2" placeholder="No medical details needed here."></textarea><span class="err"></span></div>
    ${consent(c)}<button class="cta wide" type="submit" id="send">Request my callback</button>${fine(c)}</form>
  ${done(c, 'We will call you at the time you chose.')}
</div>`;
}

function sofiaCard(c) {
  const s = c.sofia, t = s.transcript ?? [['s', `Hi, I'm Sofia, an AI intake assistant for ${c.brand.name}. This call is recorded. You're calling about ${c.tort.name}, is that right?`], ['c', 'Yes.'], ['s', c.quiz[0].q], ['c', c.quiz[0].options[0].label], ['s', 'Thank you. A few more quick questions, then I can connect you with a person on the team.']];
  return `<div class="card phonecard">
  <div class="card-head"><span class="k">Talk to Sofia</span><span class="count">24/7 · recorded</span></div>
  <p class="num" id="num">${esc(s.phone_display)}</p>
  <p class="ctas">${tel(c, s.phone_tel, 'Tap to call', 'data-door="sofia"', 'cta')}<button class="copybtn" id="copy" type="button">Copy number</button></p>
  <div class="chat">${t.map(([who, m]) => `<div class="msg ${who === 'c' ? 'c' : 's'}">${esc(m)}</div>`).join('')}</div>
</div>`;
}

const indexCard = c => `<div class="card doorsmini">
  <div class="card-head"><span class="k">Start here</span><span class="count">Pick one</span></div>
  <a class="door-row" href="quiz.html" data-door="quiz"><span class="n">1</span><span><b>Check my claim</b><small>${c.quiz.length} questions, two minutes, instant result</small></span><span class="arr">→</span></a>
  <a class="door-row" href="sofia.html" data-door="sofia"><span class="n">2</span><span><b>Talk to someone now</b><small>Call ${esc(c.sofia.phone_display)}, any time</small></span><span class="arr">→</span></a>
  <a class="door-row" href="form.html" data-door="form"><span class="n">3</span><span><b>Request a callback</b><small>Send your details, pick a time</small></span><span class="arr">→</span></a>
  <p class="fine" style="margin:14px 0 0">Every path ends with a person reviewing your situation.</p>
</div>`;

function doorsSection(c) {
  const img = d => c.images?.['ad_' + d] ? `<img src="${esc(c.images['ad_' + d])}" alt="" loading="lazy">` : '';
  const row = (d, k, h, p, btn, cls) => `<a class="door" href="${PAGE_FILES[d]}" data-door="${d}">${img(d)}<div class="body"><span class="k">${k}</span><h3>${h}</h3><p>${p}</p><span class="btn${cls}">${btn}</span></div></a>`;
  return `<section><div class="in"><h2 class="sec center">Three ways to start. One team behind all of them.</h2><div class="doors">
  ${row('quiz', 'Two minutes', `${c.quiz.length} quick questions`, 'See where you stand right away.', 'Take the check', ' gold')}
  ${row('sofia', 'Right now', 'Talk it through', 'Call and tell Sofia what happened. She connects you with a person.', 'Call now', '')}
  ${row('form', 'On your schedule', 'Request a callback', 'Send a few details and pick the time.', 'Start the form', '')}
</div></div></section>`;
}

function adsSection(c) {
  return `<section><div class="in"><h2 class="sec center">The ads, one per door</h2>
  <p class="sub center" style="margin-inline:auto">Each ad lands on its own page so we know which door produced the claim. All channels are drafts and paused until approved.</p>
  <div class="ads">${c.ads.map((a, i) => `<div class="ad">${c.images?.['ad_' + a.door] ? `<img src="${esc(c.images['ad_' + a.door])}" alt="Ad: ${esc(a.headline)}">` : ''}<div class="meta"><span class="tag">Door ${i + 1}</span><span class="tag">${esc(a.door)}</span><b>${esc(a.headline)}</b><span>${esc(a.primary_text)}</span></div></div>`).join('')}</div>
</div></section>`;
}

// ---------- client scripts ----------
// Same wire contract as the live Paraquat lane (btl/paraquat/intake.js): schema btl.intake.web/v1, sent
// form-encoded (payload=<json>&submission_id=<uuid>) so Make receives it without a CORS preflight.
// Receipts: success only when the webhook answers 2xx with JSON {status: received|accepted|duplicate, receipt_id}.
// The submission_id survives retries (sessionStorage) so a resend dedupes to the same receipt; the receipt is kept
// for 24h (localStorage) so a reload shows "Received" + the reference instead of an empty form.
// Preview builds have no webhook: the payload goes to window.__kitOutbox and the receipt is PREVIEW-…
const REQUEST_TYPE = {form: 'web_inquiry', quiz: 'quiz_inquiry', sofia: 'callback_request'};
export const RECEIPT_STATUSES = ['received', 'accepted', 'duplicate'];
export const consentVersion = c => `${c.slug}-consent-${c.consent_version ?? KIT_VERSION}`;
function captureJs(c, door, extra) {
  const live = c.mode === 'live';
  const cfg = {webhook: live ? c.intake.webhook : null, preview: !live, campaign_id: c.campaign_id, tenant_id: c.tenant_id, domain_id: c.domain_id, page_id: pid(c, door), door, request_type: REQUEST_TYPE[door], consent_version: consentVersion(c), statuses: RECEIPT_STATUSES};
  return `<script>
(function(){
  var C=${js(cfg)};
  var attr={}; try{new URL(location.href).searchParams.forEach(function(v,k){ if(${CLICK_IDS}.test(k)) attr[k]=v; });}catch(e){}
  attr.landing_path=location.pathname; try{attr.referrer_host=document.referrer?new URL(document.referrer).host:'';}catch(e){attr.referrer_host='';}
  function ck(n){var m=document.cookie.match('(?:^|; )'+n+'=([^;]*)');return m?decodeURIComponent(m[1]):'';}
  attr.fbp=ck('_fbp'); attr.fbc=ck('_fbc');
  var form=document.querySelector('form[data-kit]'), doneEl=document.getElementById('done'), SK='ee_sub_'+C.page_id, RK='ee_receipt_'+C.page_id;
  function v(id,ok,m){ var el=document.getElementById(id), e=el.parentNode.querySelector('.err'); if(e) e.textContent=ok?'':m; el.setAttribute('aria-invalid',ok?'false':'true'); return ok; }
  function ev(n){ try{window.dataLayer.push({event:n,page_id:C.page_id,campaign_id:C.campaign_id,door:C.door});}catch(e){} }
  function uuid(){ try{return crypto.randomUUID();}catch(e){return 's'+Date.now()+Math.random().toString(16).slice(2);} }
  function sid(){ try{var s=sessionStorage.getItem(SK); if(s) return s;}catch(e){} var u=uuid(); try{sessionStorage.setItem(SK,u);}catch(e){} return u; }
  function saveReceipt(r){ try{localStorage.setItem(RK,JSON.stringify(r));}catch(e){} }
  function loadReceipt(){ try{var r=JSON.parse(localStorage.getItem(RK)||'null'); if(r&&r.receipt_id&&Date.now()-Date.parse(r.at)<864e5) return r;}catch(e){} return null; }
  function showDone(r){ form.hidden=true; doneEl.hidden=false; document.getElementById('ref').textContent=r.receipt_id; }
  document.getElementById('again').addEventListener('click',function(){ try{localStorage.removeItem(RK);sessionStorage.removeItem(SK);}catch(e){} location.reload(); });
  function post(p){
    if(C.preview){ (window.__kitOutbox=window.__kitOutbox||[]).push(p); return Promise.resolve({status:'received',receipt_id:'PREVIEW-'+p.submission_id.replace(/-/g,'').slice(0,10).toUpperCase(),preview:true}); }
    var ctl=('AbortController' in window)?new AbortController():null, tm=setTimeout(function(){ if(ctl) ctl.abort(); },15000);
    return fetch(C.webhook,{method:'POST',body:new URLSearchParams({payload:JSON.stringify(p),submission_id:p.submission_id}),signal:ctl?ctl.signal:undefined})
      .then(function(r){ return r.text().then(function(t){ clearTimeout(tm); var j=null; try{j=JSON.parse(t);}catch(e){}
        if(!r.ok||!j||!(j.receipt_id||j.lead_id)||C.statuses.indexOf(j.status)<0) throw Error('no receipt'); return j; }); },
        function(e){ clearTimeout(tm); throw e; });
  }
  function send(f,screening){
    var ok=true;
    ok=v('first',f.first_name.value.trim().length>1,'Enter your first name')&ok; ok=v('last',f.last_name.value.trim().length>1,'Enter your last name')&ok;
    ok=v('phone',/^\\D*(\\d\\D*){10}$/.test(f.phone.value),'Enter a 10-digit phone number')&ok; ok=v('state',!!f.state.value,'Choose your state')&ok;
    if(f.email) ok=v('email',!f.email.value||/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(f.email.value),'Check the email address')&ok;
    [].forEach.call(f.querySelectorAll('select[required]'),function(s){ if(s.id!=='state') ok=v(s.id,!!s.value,'Choose one')&ok; });
    var ce=document.getElementById('cerr'); ce.textContent=f.consent_call.checked?'':'Please agree to be called so we can reach you'; ok=ok&&f.consent_call.checked; if(!ok) return;
    var first=f.first_name.value.trim(), last=f.last_name.value.trim(), d=f.phone.value.replace(/\\D/g,'').slice(-10), now=new Date().toISOString();
    var txt=function(sel){var el=f.querySelector(sel);return el?el.textContent.trim():'';};
    var p={schema:'btl.intake.web/v1',submission_id:sid(),tenant_id:C.tenant_id,domain_id:C.domain_id,campaign_id:C.campaign_id,page_id:C.page_id,door:C.door,request_type:C.request_type,
      contact:{full_name:first+' '+last,first_name:first,last_name:last,phone_e164:'+1'+d,email:f.email?f.email.value.trim():'',state:f.state.value},
      screening:screening,
      callback:{window:f.best_time?f.best_time.value:'',time_zone:(Intl.DateTimeFormat().resolvedOptions().timeZone||'')},
      consent:{version:C.consent_version,captured_at:now,page_url:location.href,method:'checkbox',calls:{granted:f.consent_call.checked,text:txt('[data-tf-element-role=consent-language]')},sms:{granted:f.consent_sms.checked,text:txt('#c_sms + span')}},
      trustedform_cert_url:(f.xxTrustedFormCertUrl&&f.xxTrustedFormCertUrl.value)||'',attribution:attr};
    if(C.preview||/[?&]ee_test=synthetic/.test(location.search)) p.test={synthetic:true};
    var btn=document.getElementById('send'), er=document.getElementById('senderr'); btn.disabled=true; er.hidden=true; ev('ee_lead_submit_attempt');
    post(p).then(function(j){
      var rec={receipt_id:j.receipt_id||j.lead_id,submission_id:p.submission_id,status:j.status,at:new Date().toISOString(),preview:!!j.preview};
      saveReceipt(rec); try{sessionStorage.removeItem(SK);}catch(e){} showDone(rec); ev('ee_lead_submit_success');
    }).catch(function(){ btn.disabled=false; er.hidden=false; ev('ee_lead_submit_error'); });
  }
${extra}
  var kept=loadReceipt(); if(kept){ if(typeof onRestore==='function') onRestore(kept); showDone(kept); }
})();
</script>`;
}

const quizVersion = c => `${c.slug}-quiz-${c.quiz_version ?? KIT_VERSION}`;
// signal -> outcome, same three outcomes as the Paraquat qualifier: bad/represented = NOT_A_FIT, unsure = FIRM_REVIEW.
const sigMap = c => Object.fromEntries(c.quiz.map(q => [q.key, Object.fromEntries(q.options.map(o => [o.value, o.signal]))]));
const OUTCOME_JS = `function outcome(a){ var dq=false,rv=false; Object.keys(a).forEach(function(k){ var s=(SIG[k]||{})[a[k]]; if(s==='bad'||s==='represented') dq=true; if(s==='unsure') rv=true; }); return dq?'NOT_A_FIT':rv?'FIRM_REVIEW':'QUALIFIED'; }`;

const QUIZ_EXTRA = (c) => `  var SIG=${js(sigMap(c))}; ${OUTCOME_JS}
  var qs=[].slice.call(document.querySelectorAll('.q')), i=0, a={}, bar=document.getElementById('bar'), back=document.getElementById('back'), count=document.getElementById('count'), N=${c.quiz.length};
  var RESULTS=${js(c.copy.results ?? {
    QUALIFIED: [`Your answers point to a possible ${c.tort.name} claim.`, 'You may potentially qualify for further review. A lawyer makes the final call. Leave your details and we call you back.'],
    FIRM_REVIEW: ['Your situation needs a closer look.', 'Some answers need a person to review them. Leave your details and we follow up if it is a fit.'],
    NOT_A_FIT: ['Thank you for explaining.', 'Based on what you shared, this does not match what this review is looking for right now. That is not a legal opinion about your situation.'],
  })};
  function show(n){ qs[i].classList.remove('on'); i=n; qs[i].classList.add('on'); var last=qs.length-1; bar.style.width=Math.round(100*i/last)+'%'; count.textContent=(i<last?(i+1)+' of '+N:'Your result'); back.hidden=(i===0||i===last);
    document.getElementById('quiz').scrollIntoView({behavior:'smooth',block:'start'});
    if(qs[i].dataset.k==='result'){ var r=outcome(a), t=RESULTS[r], res=document.getElementById('res'); res.innerHTML=''; var h=document.createElement('h2'); h.className='qh'; h.textContent=t[0]; var p=document.createElement('p'); p.className='qs'; p.textContent=t[1]; res.append(h,p); try{window.dataLayer.push({event:'ee_quiz_complete',page_id:C.page_id,campaign_id:C.campaign_id,door:'quiz',step_count:N});}catch(e){} } }
  qs.forEach(function(q,idx){ q.querySelectorAll('.opts button').forEach(function(b){ b.addEventListener('click',function(){ a[q.dataset.k]=b.dataset.v; show(idx+1); }); }); });
  back.addEventListener('click',function(){ show(Math.max(0,i-1)); });
  document.getElementById('cap').addEventListener('submit',function(e){ e.preventDefault(); var sc=Object.assign({},a,{web_outcome:outcome(a),quiz_version:${js(quizVersion(c))}}); send(e.target,sc); });
  function onRestore(){ qs[i].classList.remove('on'); i=qs.length-1; qs[i].classList.add('on'); bar.style.width='100%'; count.textContent='Your result'; back.hidden=true; var res=document.getElementById('res'), h=document.createElement('h2'); h.className='qh'; h.textContent='We already have your answers.'; res.replaceChildren(h); }`;

const FORM_EXTRA = (c) => `  var SIG=${js(sigMap(c))}; ${OUTCOME_JS}
  document.getElementById('f').addEventListener('submit',function(e){ e.preventDefault(); var f=e.target, a={};
    ${js(c.form_fields.map(x => x.key))}.forEach(function(k){ a[k]=f[k].value; });
    send(f,Object.assign({},a,{note:f.note.value.trim(),web_outcome:outcome(a),quiz_version:${js(quizVersion(c) + '-form')}})); });`;

const SOFIA_JS = c => `<script>
document.getElementById('copy').addEventListener('click',function(){var b=this;function d(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy number'},1500)}
try{navigator.clipboard.writeText(${js(c.sofia.phone_display)}).then(d,function(){var r=document.createRange();r.selectNodeContents(document.getElementById('num'));var s=getSelection();s.removeAllRanges();s.addRange(r)})}catch(e){}});
</script>`;

// ---------- pages ----------
export function renderPages(c) {
  const t = c.tort.name, b = c.brand.name, C = c.copy;
  const cl = {quiz: ['quiz.html', 'Check my claim'], sofia: ['sofia.html', 'Talk to someone now'], form: ['form.html', 'Request a callback']};
  const page = (key, title, desc, h, card, body, script = '') => head(c, key, title, desc) + hero(h, card) + body + script + foot(c);
  return {
    'index.html': page('index', `${t} Claims · ${b}`, C.index.lede, C.index, indexCard(c), trust(c) + doorsSection(c) + proof(c) + steps('What happens after you reach out', C.steps) + close(c, cl.quiz, cl.sofia)),
    'quiz.html': page('quiz', `${t} Claim Check · ${b}`, `${c.quiz.length} quick questions about ${t}. See your next step right away.`, C.quiz, quizCard(c), trust(c) + proof(c) + steps('What happens next', C.steps) + close(c, cl.sofia, cl.form), captureJs(c, 'quiz', QUIZ_EXTRA(c))),
    'sofia.html': page('sofia', `Talk to Sofia · ${t} · ${b}`, `Call and tell us what happened with ${t}. Sofia, an AI intake assistant, asks a few questions and connects you with a person.`, C.sofia, sofiaCard(c), trust(c) + steps('What to expect on the call', C.sofia_steps) + proof(c) + close(c, cl.quiz, cl.form), SOFIA_JS(c)),
    'form.html': page('form', `Request a Callback · ${t} · ${b}`, `Tell us what happened with ${t} and we call you back at the time you choose.`, C.form, formCard(c), trust(c) + proof(c) + steps('What happens next', C.steps) + close(c, cl.quiz, cl.sofia), captureJs(c, 'form', FORM_EXTRA(c))),
    'ads.html': page('ads', `${t} Campaign Ads · ${b}`, `The ads behind the ${t} campaign, one per door.`, C.ads, indexCard(c), adsSection(c) + trust(c) + steps('What happens after someone reaches out', C.steps) + close(c, cl.quiz, cl.sofia)),
  };
}

export function renderCss(c) {
  const k = c.brand.colors, f = c.brand.fonts;
  const vars = `:root{--navy:${k.navy};--deep:${k.deep};--blue:${k.blue};--blue-ink:${k.blue_ink};--gold:${k.gold};--gold-ink:${k.gold_ink};--bg2:${k.bg2};--line:${k.line};--ok:${k.ok};--display:"${f.display}",Georgia,serif;--body:"${f.body}",system-ui,-apple-system,sans-serif;--hero-img:${c.images?.hero ? `url(${c.images.hero})` : 'none'}}
.kit-preview{background:#fff4c2;color:#3d2e00;font:600 14px/1.4 var(--body);text-align:center;padding:8px max(16px,env(safe-area-inset-left,0px))}
.tel-off{font-weight:700;cursor:not-allowed}.cta.tel-off{opacity:.75}
.ok .ref{display:block;margin-top:10px;font-size:14px}.ok .ref em{font-style:normal;color:var(--muted)}.ok #again{margin-top:10px}
.nav{background:var(--navy)}.wordmark{display:inline-flex;align-items:center;gap:10px;color:#fff;font-family:var(--display);font-size:20px;font-weight:700;text-decoration:none}.nav .wordmark img{width:36px}.brand{text-decoration:none}
`;
  return readFileSync(join(KIT, 'base.css'), 'utf8') + '\n/* campaign-kit brand tokens: ' + c.campaign_id + ' */\n' + vars;
}

// ---------- creative assets: what is real, what is a placeholder, what is missing ----------
// Each slot resolves to a repo file under btl/ (or its committed .b64), measured from the file header,
// or to a creative that exists only inside Meta (config.meta_creatives.<door> = {image_hash, ad_id}).
export const ASSET_SLOTS = [
  ['hero', 'Page hero image', {minW: 1200}], ['og', 'Share image (og:image)', {w: 1200, h: 630}], ['team', 'Proof / team image', {optional: true}],
  ['ad_quiz', 'Meta feed ad · quiz door', {w: 1080, h: 1080}], ['ad_sofia', 'Meta feed ad · Sofia door', {w: 1080, h: 1080}], ['ad_form', 'Meta feed ad · form door', {w: 1080, h: 1080}],
  ['story_quiz', 'Stories/Reels 9:16 · quiz door', {w: 1080, h: 1920}], ['story_sofia', 'Stories/Reels 9:16 · Sofia door', {w: 1080, h: 1920}], ['story_form', 'Stories/Reels 9:16 · form door', {w: 1080, h: 1920}],
  ['tiktok_video', 'TikTok 9:16 video', {video: true}],
];
export function imageSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return {w: buf.readUInt32BE(16), h: buf.readUInt32BE(20)};
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i + 9 < buf.length;) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return {h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7)};
      i += 2 + len;
    }
  }
  if (buf.slice(0, 200).toString().includes('<svg')) return {vector: true};
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return {webp: true};
  return null;
}
function readRepoAsset(ref) {
  const path = ref.replace(/^https:\/\/besttortlawyers\.com/, '');
  if (!path.startsWith('/')) return {path, missing: 'not a besttortlawyers.com path'};
  const f = join(ROOT, 'btl', path);
  if (existsSync(f)) return {path, buf: readFileSync(f)};
  if (existsSync(f + '.b64')) return {path, buf: Buffer.from(readFileSync(f + '.b64', 'utf8'), 'base64')};
  return {path, missing: 'file not found in btl/'};
}
export function assetManifest(c) {
  const placeholders = new Set(c.placeholders ?? []);
  return ASSET_SLOTS.map(([slot, label, spec]) => {
    const ref = c.images?.[slot], door = slot.startsWith('ad_') ? slot.slice(3) : null, inMeta = door && c.meta_creatives?.[door];
    if (!ref) {
      if (inMeta) return {slot, label, status: 'ACTUAL', where: `Meta only · image_hash ${inMeta.image_hash} · ad ${inMeta.ad_id}`, note: 'Not in the repo; exists as an uploaded Meta creative'};
      return {slot, label, status: spec.optional ? 'NOT USED' : 'MISSING', where: null};
    }
    if (placeholders.has(slot)) return {slot, label, status: 'PLACEHOLDER', where: ref};
    if (spec.video) return {slot, label, status: 'UNVERIFIED', where: ref, note: 'Video files are not measured by the kit'};
    const a = readRepoAsset(ref);
    if (a.missing) return {slot, label, status: 'MISSING', where: ref, note: a.missing};
    const d = imageSize(a.buf);
    if (!d) return {slot, label, status: 'UNVERIFIED', where: a.path, note: 'Unknown image format'};
    if (d.vector || d.webp) return {slot, label, status: 'ACTUAL', where: a.path, size: d.vector ? 'vector' : 'webp'};
    const size = `${d.w}x${d.h}`;
    if (spec.w && (d.w !== spec.w || d.h !== spec.h)) return {slot, label, status: 'WRONG SIZE', where: a.path, size, note: `needs ${spec.w}x${spec.h}`};
    if (spec.minW && d.w < spec.minW) return {slot, label, status: 'WRONG SIZE', where: a.path, size, note: `needs at least ${spec.minW}px wide`};
    return {slot, label, status: 'ACTUAL', where: a.path, size};
  });
}

// ---------- the checklist: every row is WORKING, MISSING, UNTESTED or NOT CREATED, with its evidence ----------
// Integration rows come only from config.evidence.<key> = {status, note, source}; anything without evidence is UNTESTED.
export const STATUSES = ['WORKING', 'MISSING', 'UNTESTED', 'NOT CREATED'];
const EVIDENCE_ROWS = [
  ['intake', 'Intake webhook returns a receipt for this payload'], ['intake_durable', 'Receipt only after the lead is durably stored'],
  ['sofia_line', 'Sofia line answers with this campaign\'s assistant'], ['transfer', 'Transfer destination'],
  ['meta', 'Meta campaign + ads'], ['google', 'Google Search campaign'], ['tiktok', 'TikTok campaign'], ['openai', 'ChatGPT ads campaign'],
  ['tracking', 'GTM tags fire on the live pages'], ['portal', 'Perspective portal entry'],
];
export function checklist(c) {
  const rows = [];
  const add = (area, item, status, evidence) => rows.push({area, item, status, evidence});
  add('Pages', `5 pages (${c.publish === false ? 'preview only, not deployed' : 'btl/c/' + c.slug + '/'})`, 'WORKING', 'Built by the kit; unit tests + tests/campaign-kit.browser.cjs in CI');
  add('Pages', 'Preview cannot reach production', 'WORKING', 'No GTM, TrustedForm, dialable link or webhook; CSP connect-src none; tests/campaign-kit.browser.cjs fails on any request beyond itself + Google Fonts');
  add('Pages', 'Live build (production wiring)', c.mode === 'live' ? 'WORKING' : 'MISSING', c.mode === 'live' ? 'status live with every gate evidenced' : 'status is not "live"; the build refuses live while any gate below is open');
  for (const [k, item] of EVIDENCE_ROWS) {
    const e = c.evidence?.[k];
    if (!e) { add('Integration', item, ['meta', 'google', 'tiktok', 'openai'].includes(k) ? 'NOT CREATED' : 'UNTESTED', 'No evidence recorded in the config'); continue; }
    if (!STATUSES.includes(e.status)) throw Error(`${c.slug}: evidence.${k}.status must be one of ${STATUSES.join('|')}`);
    add('Integration', item, e.status, [e.note, e.source].filter(Boolean).join(' — '));
  }
  for (const a of assetManifest(c)) if (a.status !== 'NOT USED') add('Creative', a.label, a.status === 'ACTUAL' ? 'WORKING' : a.status === 'UNVERIFIED' ? 'UNTESTED' : 'MISSING', [a.status, a.size, a.where, a.note].filter(Boolean).join(' · '));
  for (const [k, label] of GATES) add('Gate', label, gateOk(c, k) ? 'WORKING' : 'MISSING', gateOk(c, k) ? `${c.gates[k].by} ${c.gates[k].at}: ${c.gates[k].evidence}` : 'No signed evidence');
  return rows;
}
const mdRows = rows => rows.map(r => `| ${r.area} | ${r.item} | **${r.status}** | ${String(r.evidence).replace(/\|/g, '/')} |`).join('\n');

// ---------- internal bundle: channels, voice, delivery, portal, tracking, launch ----------
export function renderBundle(c) {
  const usd = c.budget.media_total_usd, days = c.budget.days, base = `${c.domain_id === 'besttortlawyers.com' ? 'https://besttortlawyers.com' : 'https://' + c.domain_id}/c/${c.slug}/`;
  const landing = c.landing ?? (c.publish === false ? null : Object.fromEntries(DOORS.map(d => [d, base + PAGE_FILES[d]])));
  const url = (door, source, medium = 'paid') => landing?.[door] && `${landing[door]}?utm_source=${source}&utm_medium=${medium}&utm_campaign=${encodeURIComponent(c.campaign_id)}&utm_content=${door}`;
  const daily = ch => Math.max(1, Math.round((usd * c.split[ch]) / days));
  const name = (ch, extra = '') => `${c.campaign_id} | ${c.tort.name} | ${ch}${extra} | DRAFT PAUSED | campaign-kit ${KIT_VERSION}`;
  const states = c.geo.states.includes('US') ? ['US'] : c.geo.states;

  const meta = {
    status: 'PAUSED_DRAFT', note: 'Create via Ryze meta_ads.runGraphWrite with status PAUSED. Never activate without Kyle approval in chat.',
    ad_account: c.channels.meta.ad_account, page_id: c.channels.meta.page_id, instagram_id: c.channels.meta.instagram_id, pixel_id: c.channels.meta.pixel_id,
    campaign: {name: name('Meta', ' | 3 doors'), objective: c.channels.meta.objective, status: 'PAUSED', special_ad_categories: c.channels.meta.special_ad_categories, daily_budget_usd: daily('meta')},
    ad_sets: [{name: `${c.campaign_id} | ${states.join(',')} | 3 doors`, status: 'PAUSED', optimization_goal: 'OFFSITE_CONVERSIONS', promoted_object: {pixel_id: c.channels.meta.pixel_id, custom_event_type: 'LEAD'}, targeting: {geo_locations: states[0] === 'US' ? {countries: ['US']} : {regions_by_state_code: states}, age_min: c.geo.age_min ?? 25, publisher_platforms: ['facebook', 'instagram']}}],
    ads: c.ads.map(a => ({name: `${c.campaign_id} | door:${a.door}`, status: 'PAUSED', headline: a.headline, primary_text: a.primary_text, call_to_action: a.cta, link: url(a.door, 'facebook'), image: c.images?.['ad_' + a.door] ? 'https://besttortlawyers.com' + c.images['ad_' + a.door] : null, image_hash: c.meta_creatives?.[a.door]?.image_hash ?? null})),
    ...(landing ? {} : {landing_note: 'Preview-only campaign: no deployed kit landing page. Set config.landing.{quiz,sofia,form} before creating ads.'}),
  };
  const kw = c.keywords ?? [`${c.tort.name} lawsuit`, `${c.tort.name} lawyer`, `${c.tort.name} claim`, `${c.tort.name} attorney`];
  const google = {
    status: 'PAUSED_DRAFT', customer_id: c.channels.google.customer_id, note: 'Create via Ryze google_ads.runRawMutate with status PAUSED. Conversion = ee_lead_submit_success via GTM.',
    campaign: {name: name('Google Search'), advertising_channel_type: 'SEARCH', status: 'PAUSED', daily_budget_usd: daily('google'), geo: states},
    ad_group: {name: `${c.campaign_id} | core`, keywords: kw.flatMap(k => [{text: k, match: 'EXACT'}, {text: k, match: 'PHRASE'}]), negative_keywords: c.negative_keywords ?? ['jobs', 'settlement amounts reddit', 'free download']},
    responsive_search_ad: {final_url: url('quiz', 'google'), headlines: [`${c.tort.name} Claim Check`, 'Free 2-Minute Claim Check', 'Talk To Sofia 24/7', 'A Person Reviews Every Claim', 'No Cost To Check', `Hurt By ${c.tort.name}?`].map(h => h.slice(0, 30)), descriptions: [`Answer ${c.quiz.length} quick questions and see where you stand. A person reviews every inquiry.`, 'Prefer to talk? Call Sofia any time, or request a callback at a time you choose.'].map(d => d.slice(0, 90))},
    call_asset: {phone: c.sofia.phone_tel},
  };
  const tiktok = {status: 'PAUSED_DRAFT', advertiser_id: c.channels.tiktok.advertiser_id, note: 'Needs 9:16 video creative before it can be created. Lands on quiz door.', campaign: {name: name('TikTok'), objective: c.channels.tiktok.objective, daily_budget_usd: daily('tiktok'), operation_status: 'DISABLE'}, landing: url('quiz', 'tiktok'), ad_text: c.ads[0].primary_text.slice(0, 100)};
  const openai = {status: 'PAUSED_DRAFT', ad_account: c.channels.openai.ad_account, note: 'ChatGPT ads. Create paused via Ryze openai_ads.write. Conversion event = lead.', campaign: {name: name('ChatGPT Ads'), daily_budget_usd: daily('openai'), status: 'paused'}, ad: {headline: c.ads[0].headline, body: c.ads[0].primary_text, destination: url('quiz', 'chatgpt')}};

  const sofia = {
    status: 'DRAFT', note: 'Feed to services/provision-bot/provision.js (DRY_RUN first). assistant_id stays null until provisioned and tested.',
    phone_display: c.sofia.phone_display, phone_tel: c.sofia.phone_tel, assistant_id: c.sofia.assistant_id ?? null,
    current_transfer: c.delivery.transfer ?? null,
    provision_bot_input: {firm_name: c.delivery.firm_name ?? c.brand.name, buyer_id: c.tenant_id, transfer_number: c.delivery.transfer?.kind === 'firm' ? c.delivery.transfer.number : null, states: c.geo.states, accepted: [c.tort.name], turned_down: c.criteria.disqualifies ?? [], hours: c.delivery.hours ?? '24/7', language: c.sofia.language ?? 'en'},
    criteria_prompt_block: [`CAMPAIGN ${c.campaign_id} — ${c.tort.name}`, 'Ask one question at a time, in this order:', ...c.quiz.map((q, i) => `${i + 1}. ${q.q} (qualifying answers: ${q.options.filter(o => o.signal === 'good').map(o => o.label).join(' / ') || 'n/a'})`), 'Qualifies when: ' + c.criteria.qualifies.join('; '), 'Does not qualify when: ' + (c.criteria.disqualifies ?? []).join('; '), `Delivery: ${c.delivery.mode}${c.delivery.mode === 'live_transfer' ? ` to ${c.delivery.transfer ? c.delivery.transfer.label + ' (' + c.delivery.transfer.kind + ')' : 'a firm line that is NOT SET'} during ${c.delivery.hours ?? '24/7'}` : ''}.`, 'Never say the caller qualifies; say they may potentially qualify for review. Never give legal advice.'].join('\n'),
  };
  const delivery = {
    mode: c.delivery.mode, options_offered_to_firm: ['live_transfer', 'scheduled_callback', 'api_webhook', 'email'],
    transfer: c.delivery.transfer ?? null, firm_transfer_set: c.delivery.transfer?.kind === 'firm', hours: c.delivery.hours ?? '24/7', buyer_webhook: c.delivery.buyer_webhook ?? null, buyer_email: c.delivery.buyer_email ?? null, schedule_url: c.delivery.schedule_url ?? null,
    payload_contract: 'btl.intake.web/v1 (same as the live Paraquat lane; see tracking.json). Buyer outcome comes back via POST to the Perspective outcome endpoint or a portal status update: accepted | rejected(reason) | signed | not_signed.',
    real_time_return: 'Firm returns status per lead_id within 24h (portal button, API, or reply to the lead email). Feeds Meta CAPI + Google offline conversions + BigQuery.',
  };
  // Paste-ready entries for the two services that already serve Paraquat (see docs/paraquat-overview.md in legal-web-lead).
  const source = `make:btl-${c.slug}-web`;
  const perspective = {
    status: 'NOT_PROVISIONED', kpis: ['spend', 'leads', 'cost_per_lead', 'qualified', 'transferred', 'accepted', 'signed', 'cost_per_signed', 'door_mix', 'speed_to_contact'],
    make_intake_scenario: {clone_of: 'Make 6437227 "BTL — Paraquat Web Intake" (hook 2868930)', must: ['parse payload (form field) as JSON', 'dedupe on submission_id; a duplicate answers {status:"duplicate"} with the SAME receipt_id', 'receipt_id derived from submission_id (e.g. BTLXX-<first 10 hex>) so retries are idempotent', `append BigQuery evolution_engine.raw_lead_events with source "${source}", event_type "lead.received" — NO "Ignore" error handler on this write`, 'respond only AFTER the write succeeds: 200 {status:"received", receipt_id}; on write failure respond 500 so the page shows the phone fallback', `deliver per delivery.json (${c.delivery.mode}) after the receipt`], known_gap_in_6437227: 'BigQuery write has an Ignore error handler and the response route does not depend on it — the receipt is returned even if storage failed', set_webhook_in: `campaign-kit/campaigns/${c.slug}.json → intake.webhook`},
    'legal-web-lead/config/portal/campaign-overviews.json': {slug: c.slug, campaign_id: c.campaign_id, public_schema: `${c.slug}-perspective/v1`, input_schema: `${c.slug}-overview-input/v1`, public_origin: 'https://besttortlawyers.com',
      source_binding: {system: 'bigquery', table: 'marketing-apes-master-database.evolution_engine.raw_lead_events', source, domain_id: 'btl', payload_version: 'btl.intake.web/v1', event_type: 'lead.received'},
      page_sources: {[pid(c, 'form')]: 'form', [pid(c, 'quiz')]: 'quiz', [pid(c, 'sofia')]: 'sofia'}, privacy_floor: 10, staleness_seconds: 900, max_future_skew_seconds: 120},
    'legal-web-lead/sql': `copy sql/paraquat-overview.sql → sql/${c.slug}-overview.sql; edit CONFIG lines (source "${source}", page ids above, request_type map: form=web_inquiry, quiz=quiz_inquiry, sofia=callback_request)`,
    'evolutionengine/affiliate-hub/portal.py BASIC_PORTALS': {[c.slug]: {view: `v_${c.slug.replace(/-/g, '_')}_portal_leads`, campaign_id: c.campaign_id, title: `${c.tort.name} · ${c.brand.name}`, transfer_poll_seconds: 900, self_register: true, open_demo: true}},
    'evolutionengine/sql/views': `copy sql/views/paraquat_portal.sql → v_${c.slug.replace(/-/g, '_')}_portal_leads; sources ${source}, vapi:btl-${c.slug}-*, callrail:btl-${c.slug}-transfer`,
  };
  const tracking = {
    gtm_web: c.gtm, ga4_property: '423835322', meta_pixel: c.channels.meta.pixel_id,
    events: {ee_page_view: 'every page load', ee_door_click: 'click on any door CTA or phone link', ee_quiz_complete: 'quiz result shown (quiz_result)', ee_lead_submit_attempt: 'form/quiz submit clicked', ee_lead_submit_success: 'webhook returned 2xx — the Lead conversion for Meta/Google/TikTok/OpenAI tags', ee_lead_submit_error: 'webhook failed or timed out (15s); phone fallback shown'},
    join_keys: ['lead_id', 'campaign_id', 'tenant_id', 'domain_id', 'door', 'page_id'], click_ids: ['gclid', 'gbraid', 'wbraid', 'fbclid', 'fbp', 'fbc', 'ttclid', 'msclkid', 'utm_*'],
    compliance_fields: ['consent.call', 'consent.sms', 'consent.language', 'consent.at', 'trustedform_cert_url'],
    bigquery: 'Make webhook scenario appends raw payload to the ledger table (one row per event, campaign_id partition key).',
  };
  const rows = checklist(c), open = rows.filter(r => r.status !== 'WORKING').length;
  const launch = `# ${c.campaign_id} — ${c.tort.name} · working / missing checklist

Generated by campaign-kit ${KIT_VERSION} from \`campaign-kit/campaigns/${c.slug}.json\`. Mode: **${c.mode.toUpperCase()}**. ${open} of ${rows.length} rows are not WORKING.

Budget plan (not created anywhere): $${usd.toLocaleString()} media over ${days} days → Meta $${daily('meta')}/d · Google $${daily('google')}/d · TikTok $${daily('tiktok')}/d · ChatGPT $${daily('openai')}/d.
Delivery: ${c.delivery.mode}${c.delivery.transfer ? ` · Sofia currently transfers to ${c.delivery.transfer.number} (${c.delivery.transfer.kind}: ${c.delivery.transfer.label})` : ''}. Geo: ${c.geo.states.join(', ')}.

| Area | Item | Status | Evidence |
|---|---|---|---|
${mdRows(rows)}

Criteria (as configured — not a legal determination):
- Qualifies: ${c.criteria.qualifies.join('; ')}
- Does not qualify: ${(c.criteria.disqualifies ?? []).join('; ') || 'not specified'}
`;
  return {'meta.json': meta, 'google-search.json': google, 'tiktok.json': tiktok, 'openai-ads.json': openai, 'sofia.json': sofia, 'delivery.json': delivery, 'perspective.json': perspective, 'tracking.json': tracking, 'assets.json': assetManifest(c), 'LAUNCH.md': launch};
}

// ---------- firm onboarding: local request preview, using this same generator ----------
export const ONBOARDING_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'";

function onboardingBrowser(config) {
  'use strict';
  const byId = id => document.getElementById(id);
  const form = byId('order-form');
  const panels = Array.from(document.querySelectorAll('[data-panel]'));
  const steps = Array.from(document.querySelectorAll('[data-step]'));
  const value = id => byId(id).value.trim();
  const splitLines = s => s.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const states = s => s.split(/[\s,;]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
  const money = cents => cents === null || cents === undefined ? 'To review' : new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:2}).format(cents / 100);
  const titles = {managed_campaign:'Managed campaign',qualified_lead_program:'Qualified-lead program',network_membership:'Firm directory membership',founding_partner:'Founding partner'};
  const commercialCopy = {
    qualified_lead_program:'Per-lead price, the definition of a billable lead, exclusivity, acceptance window and credit policy need a written agreement. No campaign fee or advertising budget is automatically added to this request.',
    network_membership:'A proposed $150/month example is under review. Membership would cover a firm profile, criteria and capacity settings, and agreed intake/report access. Media and guaranteed leads are not included. The final price and service terms have not been approved.',
    founding_partner:'Dedicated campaigns and a broader operating build need a custom scope, service levels, budget and agreement. Any partner planning scenario is a proposal, not an invoice or commitment.'
  };
  const mappedFields = {
    commercial_model:'commercial-model',template_id:'topic',topic:'topic','geo.states':'states','geo.excluded_states':'excluded-states',channels:'commercial-model',
    'firm.name':'firm-name','firm.website':'firm-website','firm.contact_name':'contact-name','firm.email':'contact-email','firm.phone':'contact-phone',
    'billing.name':'billing-name','billing.email':'billing-email','criteria.version':'criteria-version','criteria.source':'criteria-source','criteria.qualifiers':'qualifiers','criteria.exclusions':'exclusions',
    'intake.mode':'intake-mode','intake.endpoint':'intake-endpoint','intake.hours':'intake-hours','intake.timezone':'timezone','intake.capacity_per_day':'capacity',
    'budget.media_usd':'media','budget.media_budget_cents':'media','budget.duration_days':'duration','network.distribution':'distribution','terms.scope_acknowledged':'scope-ack'
  };
  let currentStep = 0;
  let draft = null;
  let lastRaw = null;
  let synthetic = false;
  let serial = 0;
  let downloadUrl = null;
  let busy = false;
  function releaseDownload() { if (downloadUrl) { URL.revokeObjectURL(downloadUrl); downloadUrl = null; } }
  function rawRequest() {
    const source = value('criteria-source');
    const model = value('commercial-model');
    return {
      schema:config.schema,commercial_model:model,template_id:form.querySelector('input[name="template"]:checked').value,topic:value('topic'),
      geo:{states:states(value('states')),excluded_states:states(value('excluded-states'))},
      channels:model === 'network_membership' ? [] : Array.from(form.querySelectorAll('input[name="channels"]:checked')).map(el=>el.value),
      firm:{name:value('firm-name'),website:value('firm-website'),contact_name:value('contact-name'),email:value('contact-email'),phone:value('contact-phone')},
      billing:{name:value('billing-name'),email:value('billing-email')},
      criteria:{version:value('criteria-version'),source,qualifiers:splitLines(value('qualifiers')).map((line,i)=>({key:'qualifier_'+(i+1),label:line,rule:line,verification_method:value('verification-method'),required:true,evidence_source:source})),exclusions:splitLines(value('exclusions'))},
      intake:{mode:value('intake-mode'),endpoint:value('intake-endpoint'),hours:value('intake-hours'),timezone:value('timezone'),languages:value('languages').split(','),capacity_per_day:value('capacity') === '' ? null : Number(value('capacity'))},
      budget:{media_usd:model === 'managed_campaign' ? value('media') : '',duration_days:value('duration') === '' ? null : Number(value('duration'))},
      network:{alternate_routing:byId('alternate-routing').checked,distribution:value('distribution')},
      terms:{version:'',source:'',scope_acknowledged:byId('scope-ack').checked}
    };
  }
  function clearErrors() {
    byId('errors').hidden = true;
    byId('error-list').replaceChildren();
    document.querySelectorAll('.field-error').forEach(el=>{el.textContent='';});
    form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
  }
  function fieldId(error) {
    if (mappedFields[error.field]) return mappedFields[error.field];
    const prefix = Object.keys(mappedFields).sort((a,b)=>b.length-a.length).find(k=>error.field?.startsWith(k));
    return prefix ? mappedFields[prefix] : 'topic';
  }
  function showErrors(errors) {
    clearErrors();
    const first = errors[0]?.id;
    for (const error of errors) {
      const field = byId(error.id);
      if (field) field.setAttribute('aria-invalid','true');
      const inline = byId('error-'+error.id);
      if (inline && !inline.textContent) inline.textContent = error.message;
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#'+error.id;
      link.textContent = error.message;
      link.addEventListener('click', event=>{event.preventDefault();focusField(error.id);});
      li.append(link);byId('error-list').append(li);
    }
    byId('errors').hidden = !errors.length;
    if (first) focusField(first);
  }
  function focusField(id) {
    const field = byId(id);
    if (!field) return;
    const panel = field.closest('[data-panel]');
    if (panel) goTo(Number(panel.dataset.panel),false);
    const details = field.closest('details');if(details) details.open=true;
    field.focus();
  }
  function localErrors(index = null) {
    const errors = [];
    const add = (id,message)=>{if(index === null || byId(id).closest('[data-panel]')?.dataset.panel === String(index)) errors.push({id,message});};
    const scope = index === null ? form : panels[index];
    for (const field of scope.querySelectorAll('[data-required="true"]')) {
      if (field.type === 'checkbox' ? !field.checked : !field.value.trim()) {
        const name = field.id === 'scope-ack' ? 'Confirm that this is a draft scope request.' : (form.querySelector('label[for="'+field.id+'"]')?.textContent || 'This field')+' is required.';
        add(field.id,name);
      }
    }
    for (const field of scope.querySelectorAll('input[type="email"],input[type="url"]')) {
      if (field.value.trim() && !field.validity.valid) add(field.id,field.type==='email'?'Enter a valid business email address.':'Enter a complete http:// or https:// website address.');
    }
    if (value('criteria-status') === 'provided') {
      if (!value('criteria-source')) add('criteria-source','Reference the firm-supplied written criteria.');
      if (!value('criteria-version')) add('criteria-version','Enter the criteria version.');
      if (!value('qualifiers')) add('qualifiers','Add the firm’s written key qualifiers, one per line.');
    }
    const included=states(value('states')),excluded=states(value('excluded-states'));
    const stateCodes = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
    if (included.some(x=>!stateCodes.has(x))) add('states','Use valid two-letter US state codes, separated by commas.');
    if (excluded.some(x=>!stateCodes.has(x))) add('excluded-states','Use valid two-letter state codes for exclusions.');
    if(new Set(included).size!==included.length) add('states','List each included state once.');
    if(new Set(excluded).size!==excluded.length) add('excluded-states','List each excluded state once.');
    if(included.some(x=>excluded.includes(x))) add('excluded-states','A state cannot be both included and excluded.');
    if (value('capacity') && !/^\d{1,5}$/.test(value('capacity'))) add('capacity','Capacity must be a whole number from 0 to 99,999.');
    if (value('duration') && (!/^\d{1,3}$/.test(value('duration')) || Number(value('duration')) < 1 || Number(value('duration')) > 365)) add('duration','Use a whole campaign duration from 1 to 365 days.');
    if (value('commercial-model')==='managed_campaign' && value('media') && (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value('media')) || Number(value('media'))<=0)) add('media','Use a positive USD amount with at most two decimal places.');
    if (/https?:\/\//i.test(value('intake-endpoint'))) add('intake-endpoint','Use a business phone or opaque connection reference; leave endpoint URLs for secure setup.');
    return errors;
  }
  function goTo(index,focus=true) {
    currentStep=Math.max(0,Math.min(3,index));
    panels.forEach((panel,i)=>{panel.hidden=i!==currentStep;});
    steps.forEach((button,i)=>{if(i===currentStep)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    byId('back').hidden=currentStep===0;byId('start-note').hidden=currentStep!==0;
    byId('next').hidden=currentStep===3;byId('prepare').hidden=currentStep!==3;
    updateSummary();
    if(focus)byId('step-title-'+currentStep).focus();
  }
  function row(parent,label,text) {
    const div=document.createElement('div');div.className='summary-row';
    const name=document.createElement('strong');name.textContent=label;
    const content=document.createElement('span');content.textContent=text || 'Needs review';
    div.append(name,content);parent.append(div);
  }
  function summary(parent,raw,quote) {
    parent.replaceChildren();
    row(parent,'Program',titles[raw.commercial_model]);row(parent,'Case type',raw.topic);
    row(parent,'Locations',raw.geo.states.join(', '));row(parent,'Firm',raw.firm.name);
    row(parent,'Written criteria',value('criteria-status')==='provided'?(raw.criteria.version || 'Version missing'):'Pending firm review');
    row(parent,'Intake',raw.intake.mode==='review_needed'?'Needs setup review':raw.intake.mode.replaceAll('_',' '));
    if(raw.commercial_model==='managed_campaign') {
      row(parent,'Build fee',money(quote?.service_fee_cents ?? 250000));
      row(parent,'Proposed media',money(quote?.media_budget_cents));
      row(parent,'Planning total',money(quote?.total_cents));
    } else row(parent,'Commercial terms','Custom quote / agreement required');
  }
  function updateSummary() {
    const raw=rawRequest(),result=BTL_ORDER.validateOrderRequest(raw),model=raw.commercial_model;
    const managed=model==='managed_campaign';
    byId('managed-budget').hidden=!managed;byId('custom-commercial').hidden=managed;
    byId('campaign-channel-area').hidden=model==='network_membership';
    byId('commercial-title').textContent=titles[model]+' · terms to review';
    byId('commercial-copy').textContent=commercialCopy[model]||'';
    byId('plan-title').textContent=titles[model];byId('plan-topic').textContent=raw.topic || 'Choose a case type to begin.';
    const lines=byId('plan-lines');lines.replaceChildren();
    function line(label,text,total=false){const div=document.createElement('div');if(total)div.className='total';const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=text;div.append(dt,dd);lines.append(div);}
    if(managed) {
      line('Campaign build',money(250000));line('Proposed media',money(result.quote?.media_budget_cents));line('Planning total',money(result.quote?.total_cents),true);
      byId('plan-note').textContent='Planning amounts only. Final scope and terms must be reviewed before an invoice is issued.';
    } else {
      line('Price','Quote required');line('Media','Not included automatically');line('Status','Proposal only');
      byId('plan-note').textContent=model==='network_membership'?'A $150/month example is under review. No approved membership price, media or lead guarantee.':'Separate scope, pricing and delivery terms are required. No campaign fee or media charge is added here.';
    }
    summary(byId('review-summary'),raw,result.quote);
  }
  function invalidate() {
    if(draft){draft=null;lastRaw=null;releaseDownload();byId('draft-result').hidden=true;form.hidden=false;document.querySelector('.progress').hidden=false;}
    updateSummary();
  }
  function prepare(event) {
    event.preventDefault();
    if(busy)return;
    const local=localErrors();if(local.length){showErrors(local);return;}
    const raw=rawRequest(),result=BTL_ORDER.validateOrderRequest(raw);
    if(!result.valid){showErrors(result.errors.map(e=>({id:fieldId(e),message:e.message})));return;}
    const serialized=JSON.stringify(raw);
    if(draft && lastRaw===serialized){showDraft();return;}
    busy=true;byId('prepare').disabled=true;
    try {
      serial+=1;
      const id='DRAFT-'+(globalThis.crypto?.randomUUID?.() || (Date.now().toString(16)+'-'+serial)).toUpperCase();
      const reasons=[...(result.review_reasons||[])];
      if(value('criteria-status')!=='provided')reasons.unshift('Firm-supplied written key qualifiers are still pending.');
      if(synthetic)reasons.unshift('Synthetic demonstration details only; replace and independently verify every field.');
      draft={schema:'btl.campaign.order.preview/v1',draft_id:id,revision:serial,created_at:new Date().toISOString(),status:'LOCAL_DRAFT_NOT_SUBMITTED',synthetic,request:result.normalized,commercial_preview:result.quote,review_reasons:[...new Set(reasons)],authorization:{invoice:false,payment:false,build:false,publish:false,spend:false,contact:false}};
      lastRaw=serialized;showDraft();
    } finally {busy=false;byId('prepare').disabled=false;}
  }
  function showDraft() {
    clearErrors();form.hidden=true;document.querySelector('.progress').hidden=true;byId('draft-result').hidden=false;
    byId('draft-ref').textContent=draft.draft_id;
    summary(byId('result-summary'),draft.request,draft.commercial_preview);
    byId('review-reasons').replaceChildren();
    for(const reason of draft.review_reasons){const li=document.createElement('li');li.textContent=reason;byId('review-reasons').append(li);}
    byId('draft-title').focus();
  }
  function download() {
    if(!draft)return;
    releaseDownload();
    downloadUrl=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)+'\n'],{type:'application/json'}));
    const link=document.createElement('a');link.href=downloadUrl;link.download=draft.draft_id.toLowerCase()+'.json';document.body.append(link);link.click();link.remove();
    byId('download-status').textContent='Download prepared. This tab has not submitted or stored the request.';
  }
  function reset() {
    releaseDownload();form.reset();draft=null;lastRaw=null;synthetic=false;serial=0;
    form.hidden=false;document.querySelector('.progress').hidden=false;byId('draft-result').hidden=true;clearErrors();goTo(0);updateSummary();
  }
  function demo() {
    reset();synthetic=true;
    const values={topic:'Example mass tort program',states:'CA, AZ','firm-name':'Example Review Firm','firm-website':'https://firm.example.test','contact-name':'Example Operator','contact-email':'operator@example.test','contact-phone':'+12025550100','billing-name':'Example Review Firm','billing-email':'billing@example.test','intake-mode':'review_needed','intake-hours':'Mon–Fri, 9:00 AM–5:00 PM',timezone:'America/Los_Angeles',capacity:'10',media:'5000.00',duration:'14'};
    for(const [id,text] of Object.entries(values))byId(id).value=text;
    byId('qualifiers').value='Example only: firm must provide and approve the case-specific qualifiers.';
    updateSummary();goTo(0);byId('demo').textContent='Synthetic example loaded — edit as needed';
  }
  form.addEventListener('submit',prepare);
  form.addEventListener('input',invalidate);
  form.addEventListener('change',event=>{
    if(event.target.name==='template') {
      byId('topic').value=event.target.value==='btl-paraquat'?'Paraquat':event.target.value==='glassman-bard-powerport'?'Bard PowerPort':'';
      for(const id of ['criteria-source','criteria-version','qualifiers','exclusions'])byId(id).value='';
      byId('criteria-status').value='pending';byId('scope-ack').checked=false;
    }
    if(event.target.id==='commercial-model')byId('scope-ack').checked=false;
    invalidate();
  });
  steps.forEach(button=>button.addEventListener('click',()=>{clearErrors();goTo(Number(button.dataset.step));}));
  byId('next').addEventListener('click',()=>{const errors=localErrors(currentStep);if(errors.length)showErrors(errors);else{clearErrors();goTo(currentStep+1);}});
  byId('back').addEventListener('click',()=>{clearErrors();goTo(currentStep-1);});
  byId('download').addEventListener('click',download);
  byId('revise').addEventListener('click',()=>{form.hidden=false;document.querySelector('.progress').hidden=false;byId('draft-result').hidden=true;goTo(3);});
  byId('reset').addEventListener('click',reset);byId('demo').addEventListener('click',demo);
  window.addEventListener('pagehide',releaseDownload);
  window.BTL_ONBOARDING=Object.freeze({read:rawRequest,getDraft:()=>draft?JSON.parse(JSON.stringify(draft)):null});
  updateSummary();
}

export function renderOnboardingPage() {
  const css = readFileSync(join(KIT, 'onboarding.css'), 'utf8');
  const field = (id, label, control, hint = '', wide = false) => `<div class="field${wide ? ' wide' : ''}" id="field-${id}"><label for="${id}">${label}</label>${control}<p class="hint" id="hint-${id}">${hint}</p><p class="field-error" id="error-${id}" aria-live="polite"></p></div>`;
  const input = (id, label, opts = {}) => field(id, label, `<input id="${id}" name="${id}" type="${opts.type || 'text'}" maxlength="${opts.max || 200}"${opts.required ? ' data-required="true" required' : ''}${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ''}${opts.value ? ` value="${esc(opts.value)}"` : ''}${opts.autocomplete ? ` autocomplete="${opts.autocomplete}"` : ''}${opts.inputmode ? ` inputmode="${opts.inputmode}"` : ''} aria-describedby="hint-${id} error-${id}">`, opts.hint, opts.wide);
  const textarea = (id, label, opts = {}) => field(id, label, `<textarea id="${id}" name="${id}" rows="${opts.rows || 3}" maxlength="${opts.max || 4000}"${opts.required ? ' data-required="true" required' : ''}${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ''} aria-describedby="hint-${id} error-${id}"></textarea>`, opts.hint, opts.wide);
  const select = (id, label, values, opts = {}) => field(id, label, `<select id="${id}" name="${id}"${opts.required ? ' data-required="true" required' : ''} aria-describedby="hint-${id} error-${id}">${values.map(([v,l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>`, opts.hint, opts.wide);
  const checklist = ['Firm identity, written key qualifiers and approved locations', 'Approved copy, disclosures and exact consent language', 'Successful intake receipt and durable saved record', 'Tested firm delivery, transfer and fallback', 'Required consent evidence captured and retained', 'Allowed conversion events verified for selected channels', 'Perspective report reconciled with test outcomes', 'Invoice/payment evidence and separate media authorization', 'Kyle’s approval of the exact launch and budget'];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="${ONBOARDING_CSP}"><meta name="theme-color" content="#0d253d"><title>Plan your campaign &amp; firm intake | Best Tort Lawyers</title><meta name="description" content="A private planning preview for a mass tort or abuse campaign, firm intake and proposed network participation."><link rel="icon" href="data:,"><style>${css}</style></head>
<body><a class="skip" href="#request">Skip to request</a><header class="masthead"><div class="wrap"><div class="brand"><span class="brand-mark" aria-hidden="true">BTL</span><div class="brand-name">BEST TORT LAWYERS<span class="brand-sub">Mass tort &amp; abuse network · proposed program</span></div></div><div class="preview-tag"><span class="preview-dot" aria-hidden="true"></span>Planning preview</div></div></header>
<main class="wrap"><section class="hero" aria-labelledby="headline"><div><p class="eyebrow">For law firms · campaign &amp; intake planning</p><h1 id="headline">A clearer path<br>to <em>the right firm.</em></h1><p class="lede">Define the case criteria, marketing plan and intake handoff for your next mass tort or abuse program. One request becomes the starting point for a repeatable campaign.</p></div><div class="hero-aside"><p>Clear inputs. A reviewable launch.</p><ol class="mini-flow"><li><span>01 / REQUEST</span>Choose the scope.</li><li><span>02 / FUND</span>Approve terms &amp; invoice.</li><li><span>03 / REVIEW</span>Review your campaign.</li><li><span>04 / LAUNCH</span>Enter Kyle’s launch queue.</li></ol><p class="intro-note">For campaign orders: verified payment starts the build. Client review, successful tests and Kyle’s launch approval follow.</p></div></section>
<noscript><div class="noscript">This local planning preview needs JavaScript to validate the request and prepare a download. Nothing can be submitted or paid here.</div></noscript>
<div class="request-layout" id="request"><section class="request-panel" aria-label="Firm request"><nav class="progress" aria-label="Request steps"><button type="button" data-step="0" aria-current="step"><span class="step-dot">1</span>Program</button><button type="button" data-step="1"><span class="step-dot">2</span>Key qualifiers</button><button type="button" data-step="2"><span class="step-dot">3</span>Firm &amp; intake</button><button type="button" data-step="3"><span class="step-dot">4</span>Scope &amp; review</button></nav>
<div class="errors" id="errors" role="alert" hidden><p>Please check the following:</p><ul id="error-list"></ul></div>
<form id="order-form" novalidate autocomplete="off">
<section class="step" data-panel="0" aria-labelledby="step-title-0"><div class="step-heading"><h2 id="step-title-0" tabindex="-1">Start with the program.</h2><span class="step-counter">01 / 04</span></div><p class="description">Tell us what your firm wants to receive. Every option is a proposal for review.</p><div class="field-grid">
${select('commercial-model','How would you like to work together?', [['managed_campaign','Managed campaign'],['qualified_lead_program','Qualified-lead program · quote required'],['network_membership','Firm directory membership · proposed'],['founding_partner','Founding partner · custom proposal']], {wide:true,hint:'Campaign fee and media apply only to a managed campaign. Other programs need their own approved commercial terms.'})}
</div><div class="divider"></div><fieldset><legend>Campaign template</legend><div class="template-options"><label class="choice"><input type="radio" name="template" value="btl-paraquat"><span><strong>Paraquat</strong><small>Template · review required</small></span></label><label class="choice"><input type="radio" name="template" value="glassman-bard-powerport"><span><strong>Bard PowerPort</strong><small>Template · review required</small></span></label><label class="choice"><input type="radio" name="template" value="custom" checked><span><strong>Another program</strong><small>Mass tort or abuse</small></span></label></div><p class="hint">Template availability does not mean launch approval. Your firm supplies the criteria.</p></fieldset><div class="field-grid" style="margin-top:18px">
${input('topic','Tort or case type', {required:true,placeholder:'Name the tort or abuse program',hint:'Use the specific case type. Each distinct campaign gets its own approved criteria.',wide:true,max:180})}
${input('states','Included states', {required:true,placeholder:'CA, AZ',hint:'Use two-letter state codes. List the actual states your firm accepts.',max:200})}
${input('excluded-states','Excluded states <span class="optional">(optional)</span>', {placeholder:'NV, OR',hint:'Exclusions are kept explicitly; they are not inferred.',max:200})}
</div><div id="campaign-channel-area"><div class="divider"></div><fieldset><legend>Requested channels</legend><div class="channel-grid"><label class="choice"><input type="checkbox" name="channels" value="meta" checked><span><strong>Facebook + Instagram</strong><small>Initial pilot request</small></span></label><label class="choice"><input type="checkbox" name="channels" value="google"><span><strong>Google Search</strong><small>Additional review</small></span></label><label class="choice"><input type="checkbox" name="channels" value="tiktok"><span><strong>TikTok</strong><small>Additional review</small></span></label><label class="choice"><input type="checkbox" name="channels" value="openai"><span><strong>ChatGPT ads</strong><small>Availability &amp; policy review</small></span></label></div><p class="hint">Requested channels are reviewed against fit, platform rules and the approved budget. No channel is activated here.</p></fieldset><div class="divider"></div><p class="field-label">Three ways for someone to start</p><div class="door-list"><span>Online claim check</span><span>Talk with Sofia</span><span>Request a callback</span></div><p class="hint">One approved set of key qualifiers across all three.</p></div></section>
<section class="step" data-panel="1" aria-labelledby="step-title-1" hidden><div class="step-heading"><h2 id="step-title-1" tabindex="-1">Define the key qualifiers.</h2><span class="step-counter">02 / 04</span></div><p class="description">Write what must be true before intake. Unknown answers remain unknown until verified.</p><div class="field-grid">
${select('criteria-status','Written criteria', [['pending','Not ready — route this request for review'],['provided','I have firm-supplied written criteria']], {wide:true})}
${input('criteria-source','Criteria source reference', {placeholder:'Private brief or approval reference',hint:'Reference the approved brief. Do not paste claimant records, credentials or webhook URLs.',wide:true,max:500})}
${input('criteria-version','Criteria version', {placeholder:'e.g. v1 · 2026-10-27',hint:'The final approval must bind to the exact version.',max:100})}
${select('verification-method','How answers should be verified', [['ask_or_verify_existing','Ask, or reuse verified existing evidence'],['ask','Ask the person directly'],['verified_existing','Use verified existing evidence'],['manual_review','Firm review required']], {hint:'Ad targeting and browsing behavior do not establish case eligibility.'})}
${textarea('qualifiers','Required qualifiers <span class="optional">(one per line)</span>', {placeholder:'Paste your firm’s rules, including relevant dates and evidence requirements.',hint:'No suggested legal or medical thresholds are filled in automatically.',wide:true,max:6000,rows:4})}
${textarea('exclusions','Exclusions &amp; unknown-answer handling', {placeholder:'List exclusions and questions that need a person to review.',hint:'This is your screening instruction, not a promise that a case will be accepted.',wide:true,max:4000})}
</div><div class="rule-note"><strong>Ask less when the evidence already exists.</strong>Reuse a verified answer only when its source, date and permission fit the rule. Otherwise, ask a clear question or send it to your team for review. A click or demographic estimate is never proof.</div></section>
<section class="step" data-panel="2" aria-labelledby="step-title-2" hidden><div class="step-heading"><h2 id="step-title-2" tabindex="-1">Connect the firm.</h2><span class="step-counter">03 / 04</span></div><p class="description">Business contact details only. Intake and billing stay tied to the correct firm.</p><div class="field-grid">
${input('firm-name','Firm legal name', {required:true,autocomplete:'organization',wide:true})}
${input('firm-website','Firm website <span class="optional">(optional)</span>', {type:'url',placeholder:'https://yourfirm.com',hint:'Include https://.',wide:true})}
${input('contact-name','Requesting contact', {required:true,autocomplete:'name'})}
${input('contact-email','Business email', {type:'email',required:true,autocomplete:'email'})}
${input('contact-phone','Business phone <span class="optional">(optional)</span>', {type:'tel',placeholder:'+1 202 555 0100',max:30})}
${input('billing-name','Invoice recipient / business name', {required:true})}
${input('billing-email','Billing email', {type:'email',required:true,wide:true})}
</div><div class="divider"></div><div class="field-grid">
${select('intake-mode','Preferred intake route', [['review_needed','Choose during setup'],['live_transfer','Sofia screening + live transfer'],['scheduled_callback','Scheduled callback'],['api_webhook','Existing CRM integration'],['secure_delivery','Secure delivery for firm review']], {wide:true})}
${input('intake-endpoint','Intake destination reference', {placeholder:'Firm desk number or existing connection reference',hint:'Use a public business phone or an opaque connection reference. Never paste a secret endpoint or key.',wide:true,max:250})}
${input('intake-hours','Intake hours', {placeholder:'Mon–Fri, 8:00 AM–6:00 PM',hint:'Include any after-hours routing requirement.'})}
${select('timezone','Intake time zone', [['','Choose a time zone'],['America/Los_Angeles','Pacific — America/Los_Angeles'],['America/Denver','Mountain — America/Denver'],['America/Phoenix','Arizona — America/Phoenix'],['America/Chicago','Central — America/Chicago'],['America/New_York','Eastern — America/New_York'],['Pacific/Honolulu','Hawaii — Pacific/Honolulu'],['America/Anchorage','Alaska — America/Anchorage']], {hint:'Used for scheduling, coverage and contact timing.'})}
${input('capacity','Capacity per day <span class="optional">(proposed)</span>', {inputmode:'numeric',placeholder:'e.g. 10',hint:'Maximum new inquiries your team can review. Zero means hold.',max:6})}
${select('languages','Intake languages', [['en','English'],['en,es','English + Spanish'],['es','Spanish']], {hint:'Language support must be verified before launch.'})}
</div><details class="details"><summary>Network participation &amp; delivery terms</summary><p>Proposed firm preferences. These do not grant permission to share a person’s information or create an acceptance agreement.</p><div class="field-grid">
${select('distribution','Requested lead distribution', [['undecided','Needs agreement'],['exclusive','Exclusive to our firm'],['shared','Shared only under an approved agreement']], {wide:true})}
<div class="field wide"><label class="inline-check"><input type="checkbox" id="alternate-routing"><span>Discuss alternative matching with other participating firms.<small>Only after the applicable agreements and the person’s separate permission are verified. No automatic redistribution is enabled here.</small></span></label></div>
</div></details></section>
<section class="step" data-panel="3" aria-labelledby="step-title-3" hidden><div class="step-heading"><h2 id="step-title-3" tabindex="-1">Set the scope. Review it.</h2><span class="step-counter">04 / 04</span></div><p class="description">This prepares a local request for review. It does not issue an invoice, accept payment or approve a launch.</p><div id="managed-budget"><div class="field-grid">
${input('media','Proposed advertising budget', {inputmode:'decimal',placeholder:'5000.00',hint:'USD. $5,000 is a planning example; enter the amount to be reviewed. Media remains separate from the build fee.',max:14})}
${input('duration','Proposed campaign days', {inputmode:'numeric',value:'14',hint:'Start date and duration are agreed after readiness checks.',max:3})}
</div><div class="cost-box"><h3>$2,500 campaign build fee</h3><p>Shown separately from your proposed media budget. Final scope, price and terms require review before an invoice can be issued.</p></div></div><div id="custom-commercial" class="cost-box" hidden><h3 id="commercial-title">Custom terms required</h3><p id="commercial-copy"></p></div><div class="draft-summary" id="review-summary" aria-label="Request summary"></div><div class="acceptance"><label class="inline-check"><input type="checkbox" id="scope-ack" data-required="true" required aria-describedby="error-scope-ack"><span>I confirm this is a draft scope request.<small>I understand the commercial terms, invoice, payment, any information sharing and the final launch require separate approval.</small></span></label><p class="field-error" id="error-scope-ack" aria-live="polite"></p></div></section>
<div class="form-footer"><button type="button" class="button quiet" id="back" hidden>← Back</button><p class="micro-copy" id="start-note">Four short steps.</p><button type="button" class="button" id="next">Continue <span aria-hidden="true">→</span></button><button type="submit" class="button" id="prepare" hidden>Prepare request <span aria-hidden="true">→</span></button></div><p class="preview-warning">Preview only. Information stays in this tab until you download it. Nothing is sent and no payment is accepted. Do not enter claimant records or secret connection details.</p></form>
<section class="draft-result" id="draft-result" aria-labelledby="draft-title" hidden><p class="result-label">Local planning draft</p><h2 id="draft-title" tabindex="-1">Your request is prepared.</h2><p class="ref" id="draft-ref"></p><p class="result-note">This reference identifies a draft in this tab. It is not a submitted order or a payment receipt.</p><div class="draft-summary" id="result-summary"></div><div class="status-banner"><strong>Review required before billing or setup.</strong><span>Final terms and campaign-specific approvals are still required.</span><ul id="review-reasons"></ul></div><p class="result-note">Next: review the scope with Kyle. For an approved campaign order, verified payment starts the build; you review the pages and request edits before it enters the launch queue.</p><div class="result-actions"><button type="button" class="button" id="download">Download request JSON</button><button type="button" class="button secondary" id="revise">Revise request</button><button type="button" class="button quiet" id="reset">Start a new request</button></div><p class="micro-copy" id="download-status" role="status">Download before closing this tab. No copy is stored here.</p></section></section>
<aside class="sidebar" aria-label="Planning summary"><p class="side-label">Your proposed program</p><div class="plan-card"><h3 id="plan-title">Managed campaign</h3><p class="plan-topic" id="plan-topic">Choose a case type to begin.</p><dl class="plan-lines" id="plan-lines"></dl><p class="plan-note" id="plan-note">Planning amounts only. No approved quote, invoice, payment or launch.</p></div><div class="side-notes"><p class="side-copy"><strong>The goal:</strong> more qualified potential claims reaching the right intake team, with outcomes reported back to improve the next campaign.</p><p class="side-copy">Your firm decides legal eligibility and case acceptance. Screening supports that decision.</p><button type="button" class="demo-button" id="demo">Try synthetic example details</button></div></aside></div>
<section class="system-section" aria-labelledby="system-title"><div class="section-heading"><h2 id="system-title">The proposed network workflow.</h2><p>Consumer screening is free. Firm services require agreed terms.</p></div><ol class="network-flow"><li><span class="num">01</span><strong>An inquiry arrives</strong><p>Someone explores a potential claim through an ad, case page or directory.</p></li><li><span class="num">02</span><strong>Approved pre-screen</strong><p>Ask the firm’s key qualifiers. Keep uncertain answers open for review.</p></li><li><span class="num">03</span><strong>The firm reviews</strong><p>Deliver through the tested route, within capacity, with an acceptance record.</p></li><li><span class="num">04</span><strong>Another fit, if permitted</strong><p>If the first firm declines, check another participating firm only under the applicable agreements and permission.</p></li><li><span class="num">05</span><strong>Outcomes return</strong><p>Track accepted, declined and signed outcomes separately, then review what improves qualified-case acquisition.</p></li></ol><details class="owner-checklist"><summary>What Kyle checks before a campaign launches</summary><ul>${checklist.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></details></section>
</main><footer class="page-footer"><div class="wrap"><p>Best Tort Lawyers is a claim matching service operated by Marketing Apes LLC, not a law firm. This planning preview does not establish an attorney-client relationship, guarantee leads or show a live network directory.</p><p class="foot-version">Campaign kit · local preview · ${KIT_VERSION}</p></div></footer><script>${browserOrderContractSource()}
(${onboardingBrowser.toString()})(${js({schema:ORDER_SCHEMA})});</script></body></html>`;
}

// ---------- write ----------
export function buildOnboarding() {
  const pageDir = join(KIT, 'out', 'onboarding', 'preview');
  mkdirSync(pageDir, {recursive:true});
  writeFileSync(join(pageDir, 'index.html'), renderOnboardingPage());
  return {mode:'LOCAL_DRAFT_NOT_SUBMITTED',pages:'campaign-kit/out/onboarding/preview/index.html',provider_actions:false};
}

export function build(file) {
  const c = normalize(JSON.parse(readFileSync(file, 'utf8')));
  // publish:false keeps the pages out of btl/ (not deployed) — used for client lanes that already live elsewhere.
  const outDir = join(KIT, 'out', c.slug), pageDir = c.publish === false ? join(outDir, 'preview') : join(ROOT, 'btl', 'c', c.slug);
  mkdirSync(pageDir, {recursive: true}); mkdirSync(outDir, {recursive: true});
  for (const [n, html] of Object.entries(renderPages(c))) writeFileSync(join(pageDir, n), html);
  writeFileSync(join(pageDir, 'site.css'), renderCss(c));
  for (const [n, v] of Object.entries(renderBundle(c))) writeFileSync(join(outDir, n), typeof v === 'string' ? v : JSON.stringify(v, null, 2) + '\n');
  return {campaign_id: c.campaign_id, pages: pageDir.slice(ROOT.length + 1) + '/', bundle: `campaign-kit/out/${c.slug}/`};
}

// Rewrites the generated block of the read-first brief so the status table can never drift from the configs.
export function writeBriefChecklist(configs) {
  const f = join(KIT, 'BRIEF.md'), start = '<!-- checklist:start -->', end = '<!-- checklist:end -->';
  const brief = readFileSync(f, 'utf8'), a = brief.indexOf(start), b = brief.indexOf(end);
  if (a < 0 || b < a) throw Error('BRIEF.md is missing the checklist markers');
  const block = configs.map(c => `### ${c.campaign_id} · ${c.tort.name} · ${c.mode.toUpperCase()}\n\n| Area | Item | Status | Evidence |\n|---|---|---|---|\n${mdRows(checklist(c))}\n`).join('\n');
  writeFileSync(f, brief.slice(0, a + start.length) + `\n_Generated by \`node campaign-kit/build.mjs --all\` (kit ${KIT_VERSION}). Do not edit by hand._\n\n` + block + brief.slice(b));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--onboarding') console.log(JSON.stringify(buildOnboarding()));
  else {
    const dir = join(KIT, 'campaigns');
    const files = args[0] === '--all' ? readdirSync(dir).filter(f => f.endsWith('.json')).map(f => join(dir, f)) : args;
    if (!files.length) { console.error('usage: build.mjs <campaign.json> | --all | --onboarding'); process.exit(1); }
    for (const f of files) { if (!existsSync(f)) { console.error('missing ' + f); process.exit(1); } console.log(JSON.stringify(build(f))); }
    if (args[0] === '--all') {
      writeBriefChecklist(files.map(f => normalize(JSON.parse(readFileSync(f, 'utf8')))));
      console.log(JSON.stringify(buildOnboarding()));
    }
  }
}

