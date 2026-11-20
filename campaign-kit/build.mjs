#!/usr/bin/env node
// Campaign kit: one campaign JSON -> a complete three-door lane on besttortlawyers.com plus the
// staged (never live) channel, voice, delivery, portal and launch files that go with it.
//
//   node campaign-kit/build.mjs campaign-kit/campaigns/<slug>.json   # one campaign
//   node campaign-kit/build.mjs --all                                 # every config in campaigns/
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
import {validateCommercial, renderCommercial, allocateMedia} from './media-plan.mjs';
import {readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

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
  ['conversions_tested', 'ee_lead_submit_success recorded as a Lead in Meta, Google, TikTok and ChatGPT ads'],
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
  if (raw.layout === "provider-review") return normalizeProviderReview(raw);
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
  need(['EXACT', 'EXACT_AND_PHRASE'].includes(c.channels?.google?.match), 'channels.google.match must be EXACT or EXACT_AND_PHRASE');
  errs.push(...validateCommercial(c));
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
${c.disclaimer_top ? `<div class="firm-disclaimer" role="note">${esc(c.disclaimer_top)}</div>\n` : ''}${live ? '' : '<div class="kit-preview" role="note"><b>Preview</b> · nothing on this page sends a lead, places a call or loads tracking.</div>\n'}<div class="bar"><div class="in"><span><b>${esc(b.fee_line)}</b> ${esc(b.tagline ?? 'Free consultation, 24/7.')}</span>${tel(c, c.sofia.phone_tel, c.sofia.phone_display, 'data-door="sofia"')}</div></div>
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

const indexCard = c => {
  const H = c.copy?.hub?.card;
  if (H) return `<div class="card doorsmini">
  <div class="card-head"><span class="k">${esc(H.k)}</span><span class="count">${esc(H.count || '')}</span></div>
  ${H.rows.map((r, i) => `<a class="door-row${r.primary ? ' primary' : ''}" href="${PAGE_FILES[r.door]}" data-door="${esc(r.door)}"><span class="n">${i + 1}</span><span><b>${esc(r.b)}</b><small>${esc(r.small)}</small></span><span class="arr">→</span></a>`).join('\n  ')}
  <p class="fine" style="margin:14px 0 0">${esc(H.fine || 'Every path ends with a person reviewing your situation.')}</p>
</div>`;
  return `<div class="card doorsmini">
  <div class="card-head"><span class="k">Start here</span><span class="count">Pick one</span></div>
  <a class="door-row" href="quiz.html" data-door="quiz"><span class="n">1</span><span><b>Check my claim</b><small>${c.quiz.length} questions, two minutes, instant result</small></span><span class="arr">→</span></a>
  <a class="door-row" href="sofia.html" data-door="sofia"><span class="n">2</span><span><b>Talk to someone now</b><small>Call ${esc(c.sofia.phone_display)}, any time</small></span><span class="arr">→</span></a>
  <a class="door-row" href="form.html" data-door="form"><span class="n">3</span><span><b>Request a callback</b><small>Send your details, pick a time</small></span><span class="arr">→</span></a>
  <p class="fine" style="margin:14px 0 0">Every path ends with a person reviewing your situation.</p>
</div>`;
};

function doorsSection(c) {
  const img = d => c.images?.['ad_' + d] ? `<img src="${esc(c.images['ad_' + d])}" alt="" loading="lazy">` : '';
  const row = (d, k, h, p, btn, cls) => `<a class="door" href="${PAGE_FILES[d]}" data-door="${d}">${img(d)}<div class="body"><span class="k">${k}</span><h3>${h}</h3><p>${p}</p><span class="btn${cls}">${btn}</span></div></a>`;
  return `<section><div class="in"><h2 class="sec center">${esc(c.copy?.hub?.doors?.h2 ?? 'Three ways to start. One team behind all of them.')}</h2><div class="doors">
  ${(c.copy?.hub?.doors?.rows ?? [
    {door: 'quiz', k: 'Two minutes', h: `${c.quiz.length} quick questions`, p: 'See where you stand right away.', btn: 'Take the check', cls: ' gold'},
    {door: 'sofia', k: 'Right now', h: 'Talk it through', p: 'Call and tell Sofia what happened. She connects you with a person.', btn: 'Call now', cls: ''},
    {door: 'form', k: 'On your schedule', h: 'Request a callback', p: 'Send a few details and pick the time.', btn: 'Start the form', cls: ''}
  ]).map(r => row(r.door, esc(r.k), esc(r.h), esc(r.p), esc(r.btn), r.cls || '')).join('\n  ')}
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
  if (c.layout === "provider-review") return {"index.html": renderProviderReview(c)};
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
  if (c.layout === "provider-review") return PROVIDER_CSS;
  const k = c.brand.colors, f = c.brand.fonts;
  const vars = `:root{--navy:${k.navy};--deep:${k.deep};--blue:${k.blue};--blue-ink:${k.blue_ink};--gold:${k.gold};--gold-ink:${k.gold_ink};--bg2:${k.bg2};--line:${k.line};--ok:${k.ok};--display:"${f.display}",Georgia,serif;--body:"${f.body}",system-ui,-apple-system,sans-serif;--hero-img:${c.images?.hero ? `url(${c.images.hero})` : 'none'}}
.door-row.primary{background:var(--blue);color:#fff;border-radius:14px;padding:16px 14px;margin:6px 0 10px}.door-row.primary b,.door-row.primary small,.door-row.primary .arr,.door-row.primary .n{color:#fff}.door-row.primary .n{background:rgba(255,255,255,.18)}
.firm-disclaimer{display:block;margin:0;padding:10px max(16px,env(safe-area-inset-left,0px));background:#fff;color:#111;border-bottom:1px solid #c7cbd2;font:12pt/1.4 "Times New Roman",Times,serif}
.kit-preview{background:#fff4c2;color:#3d2e00;font:600 14px/1.4 var(--body);text-align:center;padding:8px max(16px,env(safe-area-inset-left,0px))}
.tel-off{font-weight:700;cursor:not-allowed}.cta.tel-off{opacity:.75}
.ok .ref{display:block;margin-top:10px;font-size:14px}.ok .ref em{font-style:normal;color:var(--muted)}.ok #again{margin-top:10px}
.nav{background:var(--navy)}.wordmark{display:inline-flex;align-items:center;gap:10px;color:#fff;font-family:var(--display);font-size:20px;font-weight:700;text-decoration:none}.nav .wordmark img{width:36px}.brand{text-decoration:none}
`;
  return readFileSync(join(KIT, 'base.css'), 'utf8') + '\n/* campaign-kit brand tokens: ' + c.campaign_id + ' */\n' + vars + (c.theme_css ? '\n/* campaign theme */\n' + c.theme_css : '');
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
  if (c.layout === "provider-review") return providerChecklist(c);
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
  if (c.layout === "provider-review") return {"REVIEW.md": providerReviewNotes(c)};
  const usd = c.budget.media_total_usd, days = c.budget.days, base = `${c.domain_id === 'besttortlawyers.com' ? 'https://besttortlawyers.com' : 'https://' + c.domain_id}/c/${c.slug}/`;
  const landing = c.landing ?? (c.publish === false ? null : Object.fromEntries(DOORS.map(d => [d, base + PAGE_FILES[d]])));
  const url = (door, source, medium = 'paid') => landing?.[door] && `${landing[door]}?utm_source=${source}&utm_medium=${medium}&utm_campaign=${encodeURIComponent(c.campaign_id)}&utm_content=${door}`;
  const mediaPlan = c.commercial ? allocateMedia(usd, c.split, days) : null;
  const daily = ch => mediaPlan ? mediaPlan[ch].daily_reference_usd : Math.max(1, Math.round((usd * c.split[ch]) / days));
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
    ad_group: {name: `${c.campaign_id} | core`, keywords: kw.flatMap(k => c.channels.google.match === 'EXACT' ? [{text: k, match: 'EXACT'}] : [{text: k, match: 'EXACT'}, {text: k, match: 'PHRASE'}]), negative_keywords: c.negative_keywords ?? ['jobs', 'settlement amounts reddit', 'free download']},
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
    privacy: {access: 'private', applied: false, requires: 'Verify authentication, firm-scoped authorization, logout and cross-tenant isolation before release. Flags alone do not prove privacy.'},
    'evolutionengine/affiliate-hub/portal.py BASIC_PORTALS': {[c.slug]: {view: `v_${c.slug.replace(/-/g, '_')}_portal_leads`, campaign_id: c.campaign_id, title: `${c.tort.name} · ${c.brand.name}`, transfer_poll_seconds: 900, self_register: false, open_demo: false}},
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
  return {'meta.json': meta, 'google-search.json': google, 'tiktok.json': tiktok, 'openai-ads.json': openai, 'sofia.json': sofia, 'delivery.json': delivery, 'perspective.json': perspective, 'tracking.json': tracking, 'commercial.json': renderCommercial(c), 'assets.json': assetManifest(c), 'LAUNCH.md': launch};
}

// ---------- provider education review: no campaign registration or production wiring ----------
// This is a page-review mode, not a new intake builder. It intentionally has no canonical
// campaign/tenant IDs, budgets, ad bundles, phone lines, telemetry, contact capture or calendar.
function normalizeProviderReview(raw) {
  const allowed = new Set(['layout','slug','status','publish','title','headline','intro','firm_name','attorney_name','firm_source','hero_image','billing_image','attorney_image','firm_logo','legacy_slugs','questions']);
  for (const key of Object.keys(raw)) if (!allowed.has(key)) throw Error(`provider-review: unsupported field ${key}`);
  if (raw.status !== 'draft') throw Error('provider-review must remain draft; production requires a separately approved intake integration');
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(raw.slug ?? '')) throw Error('provider-review slug must be lower-kebab');
  for (const key of ['title','headline','intro','firm_name','attorney_name']) if (typeof raw[key] !== 'string' || !raw[key].trim()) throw Error(`provider-review requires ${key}`);
  if (raw.firm_source !== 'https://www.vanderhahn.com/service/healthcare-litigation/') throw Error('provider-review requires the verified firm source');
  for (const key of ['hero_image','billing_image','attorney_image','firm_logo']) if (!/^\/assets\/[a-z0-9/-]+\.(?:svg|jpg|png)$/.test(raw[key] ?? '') || !(existsSync(join(ROOT, 'btl', raw[key])) || existsSync(join(ROOT, 'btl', raw[key] + '.b64')))) throw Error(`provider-review requires a local ${key}`);
  if (raw.legacy_slugs !== undefined && (raw.slug !== 'multiplan' || JSON.stringify(raw.legacy_slugs) !== '["devin-multiplan"]')) throw Error('provider-review supports only the approved legacy alias');
  const expected = {role:['owner','admin','finance','other'],oon:['yes','unsure','no'],volume:['million','near','below','unsure']};
  if (!Array.isArray(raw.questions) || raw.questions.length !== 3) throw Error('provider-review requires three questions');
  for (const [i,q] of raw.questions.entries()) {
    const key = Object.keys(expected)[i];
    if (q.key !== key || !q.label || !q.help || JSON.stringify(q.options?.map(o => o.value)) !== JSON.stringify(expected[key]) || q.options.some(o => !o.label)) throw Error(`provider-review invalid question ${key}`);
  }
  return {...raw, mode:'preview', campaign_id:null, tenant_id:null, tort:{name:raw.title}};
}
export function providerRoute(a) {
  if (!a || !['owner','admin','finance','other'].includes(a.role) || !['yes','no','unsure'].includes(a.oon) || !['million','near','below','unsure'].includes(a.volume)) return 'incomplete';
  if (a.oon === 'no') return 'scope';
  if (a.role === 'other' || a.oon === 'unsure' || ['below','unsure'].includes(a.volume)) return 'clarify';
  return 'conversation';
}
function providerChecklist(c) {
  return [
    {area:'Pages',item:`Provider review page (btl/c/${c.slug}/)`,status:'WORKING',evidence:'Generated by the existing campaign kit; noindex; three anonymous preliminary questions.'},
    {area:'Pages',item:'Preview cannot send leads or load tracking',status:'WORKING',evidence:'Preview CSP blocks connections and form posts. No contact fields, external scripts, storage, phone, calendar or webhook.'},
    {area:'Creative',item:'Verified attorney photography and billing explainer',status:'WORKING',evidence:'Local Devin portraits and firm logo from the public firm website; educational billing diagram, not outcome data.'},
    ...GATES.map(([key,label])=>({area:'Gate',item:label,status:'MISSING',evidence:'Review page only. No production approval or integration evidence claimed.'}))
  ];
}
function providerReviewNotes(c) {
  return `# ${c.title}: provider page review\n\nGenerated by campaign-kit/build.mjs. Page-review mode only; no canonical campaign ID has been assigned or registered. This is not a live intake campaign.\n\n## Review and connection gates\n- Firm approval of copy, disclosures, educational material, scope and final screening criteria.\n- Confirm consultation terms, permitted geography and final pre-qualification criteria, plus direct self-scheduling and the optional AI scheduling call. Neither scheduling route is connected.\n- Approved privacy/consent language and separate, optional educational-email permission.\n- Connect approved intake only after durable receipt, failure and duplicate tests pass.\n- Verify campaign identity, analytics and platform permissions before any advertising.\n\n## Public content\nThe page contains only provider-facing educational draft copy. It contains no proposal pricing, contact lists, private correspondence, internal document links, budgets or account identifiers. It is noindex and not linked from the main site. No contact information is collected.\n\n## Images\nReal attorney portrait: ${c.hero_image}, sourced from https://www.vanderhahn.com/wp-content/uploads/2024/07/devin-van-der-hahn-new-1.jpg and the named biography https://www.vanderhahn.com/devin-van-der-hahn/. Secondary portrait: ${c.attorney_image}, supplied 400px crop matching the named Devin Team card on the firm homepage (original https://www.vanderhahn.com/wp-content/uploads/2024/02/21637CHH_7_hr_edited.png). Firm logo: ${c.firm_logo}, from https://www.vanderhahn.com/wp-content/uploads/2024/05/logo.png. These identify the attorney and firm, not an endorsement, testimonial or result. The billing illustration ${c.billing_image} explains concepts only.\n\n## Routes\nCanonical public demo: https://besttortlawyers.com/c/${c.slug}/. The old /c/devin-multiplan/ route remains a generated alias with a canonical link to the new route. Both stay noindex with no capture or tracking.\n\n## Source\n${c.firm_source} supports the public firm description. Screening language remains a preliminary discussion aid, not a legal eligibility decision.\n`;
}
function renderProviderReview(c) {
  const questions = c.questions.map((q,i)=>`<div class="field"><label for="${esc(q.key)}"><span>0${i+1}</span>${esc(q.label)}</label><select id="${esc(q.key)}" name="${esc(q.key)}" required aria-describedby="help-${esc(q.key)}"><option value="">Choose an answer</option>${q.options.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select><p id="help-${esc(q.key)}">${esc(q.help)}</p></div>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(c.title)} · Provider review · Best Tort Lawyers</title><meta name="description" content="An educational starting point for healthcare providers and organizations with questions about commercial out-of-network payments."><meta name="robots" content="noindex,follow"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#184143"><meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}"><meta property="og:title" content="${esc(c.title)}"><meta property="og:description" content="Healthcare provider education and preliminary review. Preview only; no intake or booking."><link rel="icon" href="/assets/btl-seal.svg" type="image/svg+xml"><link rel="canonical" href="https://besttortlawyers.com/c/${esc(c.slug)}/"><link rel="stylesheet" href="site.css"></head>
<body><a class="skip" href="#main">Skip to content</a><div class="kit-preview" role="note"><strong>Page preview</strong> · Explore the questions. No information is sent and no appointment is booked.</div>
<header class="site-head"><div class="wrap head-inner"><a class="brand" href="#main" aria-label="Best Tort Lawyers, provider education"><img src="/assets/btl-seal.svg" alt="" width="44" height="44"><span>Best Tort Lawyers<small>HEALTHCARE PROVIDER EDUCATION</small></span></a><nav aria-label="Page navigation"><a href="#attorney">Meet Devin</a><a href="#questions">Common questions</a><a class="btn compact" href="#review">Start here <span aria-hidden="true">↗</span></a></nav></div></header>
<main id="main"><section class="hero"><div class="wrap hero-grid"><div class="hero-copy"><p class="eyebrow">MultiPlan · Commercial out-of-network billing</p><h1>${esc(c.headline)}</h1><p class="lede">${esc(c.intro)}</p><div class="actions"><a class="btn cream" href="#review">Check your starting point <span aria-hidden="true">↗</span></a><a class="text-link" href="#overview">Understand the review</a></div><p class="hero-note">For healthcare providers and organizations.<br>No patient records needed for this first step.</p></div><figure class="hero-art"><div class="portrait-frame"><img src="${esc(c.hero_image)}" width="567" height="709" fetchpriority="high" alt="Devin van der Hahn, Managing Partner and Founder of VanderHahn LLP."><div class="portrait-label"><span>PROVIDER-SIDE HEALTHCARE DISPUTES</span><strong>${esc(c.attorney_name)}</strong><p>Managing Partner &amp; Founder</p></div></div><figcaption><img src="${esc(c.firm_logo)}" width="643" height="64" alt="VanderHahn LLP"><a href="#attorney">Meet the attorney <span aria-hidden="true">↗</span></a></figcaption></figure></div></section>
<div class="wrap principles"><div><span>01</span><p><strong>Commercial out-of-network</strong>A focus on services billed during 2015–2026.</p></div><div><span>02</span><p><strong>Three questions to start</strong>Estimates and “unsure” are welcome.</p></div><div><span>03</span><p><strong>No records needed here</strong>No patient information. No uploads.</p></div></div>
<section class="review-section" id="review"><div class="wrap review-grid"><div class="review-intro"><p class="eyebrow">01 / Start here</p><h2>Start with three<br>simple questions.</h2><p>Tell us where the conversation should begin. You can choose “not sure” without calculating an exact figure or finding records first.</p><div class="callout"><strong>Near $1 million?</strong><p>The screen includes annual commercial out-of-network billed charges near $1 million. That is not a rigid cutoff or an estimate of any claim’s value.</p></div><p class="small">Preview only. Answers stay in this page’s temporary memory and disappear when you reload. Do not enter patient information.</p></div><div class="screen"><div class="screen-head"><strong>Your organization</strong><span>STEP 1 OF 3</span></div><ol class="screen-steps" aria-label="Proposed process"><li class="current">Form</li><li>Preliminary review</li><li>Scheduling</li></ol><form id="provider-screen">${questions}<p id="screen-error" class="error" role="alert" hidden>Choose an answer to each question. “Not sure” is a valid answer.</p><button class="btn full" type="submit">See the next step <span aria-hidden="true">→</span></button></form><section id="screen-result" class="result" aria-live="polite" tabindex="-1" hidden><p class="eyebrow">Preliminary screen only</p><h3 id="result-heading"></h3><p id="result-copy"></p><button id="request-consultation" class="btn full" type="button">Preview scheduling options <span aria-hidden="true">↗</span></button><button id="reset-screen" class="reset" type="button">Change my answers</button></section><p class="screen-foot">This page does not determine eligibility, create an attorney-client relationship or guarantee an outcome.</p></div></div></section>
<section class="wrap section intro-grid" id="overview"><div><p class="eyebrow">Start with the billing picture</p><h2>The question is not only<br>what was paid.</h2><p class="large">It is how the payment relates to the services billed, the applicable arrangements and the records behind it.</p></div><div class="body-copy"><p>Questions about MultiPlan-related payments can begin with a provider’s commercial out-of-network billing. A payment difference alone does not establish an improper underpayment or a legal claim.</p><p>The purpose of an initial conversation is to understand your organization’s circumstances and whether a more detailed review may be appropriate. Any legal assessment depends on the facts, relevant agreements and applicable law.</p><a class="inline-link" href="#review">Organize the basics <span aria-hidden="true">↗</span></a></div></section>
<section class="billing-section"><div class="wrap billing-grid"><figure class="billing-art"><img src="${esc(c.billing_image)}" alt="Three distinct billing concepts: billed charges, allowed amount and payment received. A difference is a question to review, not proof of a claim." width="1000" height="760" loading="lazy"></figure><div><p class="eyebrow">Understand your billing</p><h2>Keep the terms clear.</h2><dl class="terms"><div><dt>Billed charges</dt><dd>The amount your organization billed for services.</dd></div><div><dt>Allowed amount</dt><dd>The amount identified as allowable in the relevant payment or benefit determination.</dd></div><div><dt>Payment received</dt><dd>The amount actually paid. Payment records and explanations help put that number in context.</dd></div></dl><p class="small">These are general descriptions, not a conclusion about any particular payment.</p></div></div></section>
<section class="wrap section"><div class="section-title"><div><p class="eyebrow">Who this is for</p><h2>Practices. Facilities.<br>Provider groups.</h2></div><p>Owners, executives, administrators, finance leaders and revenue-cycle teams can help assemble the first picture.</p></div><div class="audience-grid"><article><span class="icon" aria-hidden="true">01 / CARE</span><h3>Clinical practices & groups</h3><p>Including physician practices, emergency medicine groups and behavioral health organizations.</p></article><article><span class="icon" aria-hidden="true">02 / FACILITIES</span><h3>Centers & facilities</h3><p>Including ambulatory surgery centers and infusion centers.</p></article><article><span class="icon" aria-hidden="true">03 / SERVICES</span><h3>Other healthcare providers</h3><p>Including laboratories, ambulance services and other provider organizations.</p></article></div><p class="small audience-note">Examples describe the audience only. Organization type alone does not establish eligibility.</p></section>
<section class="attorney-section" id="attorney"><div class="wrap attorney-grid"><figure class="attorney-photo"><img src="${esc(c.attorney_image)}" width="400" height="400" loading="lazy" alt="Devin van der Hahn smiling in a professional portrait."><figcaption>Devin van der Hahn · VanderHahn LLP</figcaption></figure><div><p class="eyebrow">Meet the attorney</p><h2>A real conversation.<br>A focused perspective.</h2><h3>${esc(c.attorney_name)}</h3><p class="attorney-title">Managing Partner &amp; Founder · ${esc(c.firm_name)}</p><p>Devin’s practice includes provider-side healthcare disputes. The firm’s published healthcare practice describes representation of providers in matters involving MultiPlan.</p><p>A lawyer, not this page, decides whether to evaluate or accept a matter. Your organization’s records, agreements and circumstances guide that decision.</p><div class="actions"><a class="btn" href="#review">Start with your organization <span aria-hidden="true">↗</span></a><a class="inline-link" href="https://www.vanderhahn.com/devin-van-der-hahn/" target="_blank" rel="noopener noreferrer">Read Devin’s biography ↗</a></div><a class="inline-link" href="${esc(c.firm_source)}" target="_blank" rel="noopener noreferrer">Explore the firm’s healthcare practice ↗</a></div></div></section>
<section class="wrap section process-section"><div class="section-title"><div><p class="eyebrow">The proposed next step</p><h2>A conversation,<br>with the right context.</h2></div><p>The proposed flow is to complete the form, then, if you pre-qualify, schedule directly or choose an AI scheduling call. This is a demo: intake and scheduling are not connected.</p></div><ol class="process"><li><span>01</span><h3>Complete the form</h3><p>Start with your organization, role and broad out-of-network billing history.</p></li><li><span>02</span><h3>Pre-qualify for a conversation</h3><p>The proposed form would check the approved preliminary criteria. This demo does not determine qualification.</p></li><li><span>03</span><h3>Choose how to schedule</h3><p>If you pre-qualify, book time with ${esc(c.attorney_name)} yourself or choose an AI scheduling call, with your permission, to help find a time. Neither option is connected yet.</p></li></ol></section>
<section class="faq-section" id="questions"><div class="wrap faq-grid"><div><p class="eyebrow">Before you begin</p><h2>Good questions.<br>Clear expectations.</h2></div><div class="faqs"><details><summary>Does this screen tell me whether I qualify?</summary><p>No. It helps organize a possible conversation. The firm must review the facts and decide whether further evaluation is appropriate. No recovery or other outcome is promised.</p></details><details><summary>What if my annual billing is near $1 million, or I am unsure?</summary><p>Choose the closest answer. “Near $1 million,” “below that range” and “not sure” all have a path to clarification. The figure refers to annual commercial out-of-network billed charges, not the amount paid or a potential claim value.</p></details><details><summary>Should I send medical records or patient details?</summary><p>No. Do not provide patient names, medical records or other patient-level information on an initial landing page. If records are needed later, the firm should explain an approved secure process.</p></details><details><summary>What can I prepare for a future conversation?</summary><p>Start with a general description of your organization, the years of commercial out-of-network billing and an estimate of annual billed charges. A reviewer may later ask which payment explanations or agreements are relevant. Do not upload them here.</p></details><details><summary>Can I book an appointment on this page?</summary><p>Not yet. The proposed flow lets people who pre-qualify schedule directly or choose an AI scheduling call. This is a demo; neither option is connected. No request is delivered, no call is placed, no email subscription is created and no appointment is booked. Final criteria, consultation terms and availability still need confirmation.</p></details></div></div></section>
<section class="wrap final-cta"><p class="eyebrow">An informed first step</p><h2>Bring the questions.<br>Start with the basics.</h2><a class="btn" href="#review">Try the preliminary review <span aria-hidden="true">↗</span></a></section></main>
<footer class="site-footer"><div class="wrap"><div class="footer-brand"><strong>Best Tort Lawyers</strong><span>Healthcare provider education · Page preview</span></div><p>Attorney advertising / educational draft. Best Tort Lawyers is a matching and intake service operated by Marketing Apes LLC, not a law firm. It does not provide legal advice. This educational information is general and does not establish that a provider has a claim. Any participating firm makes its own decision about review and representation. No attorney-client relationship or outcome is guaranteed.</p><p>This preview does not collect contact information, transmit screening answers, subscribe anyone to email or book appointments.</p><div class="footer-links"><a href="/privacy-policy/">BTL Privacy Policy</a><a href="/terms-and-conditions/">BTL Terms</a><a href="#main">Back to top ↑</a></div></div></footer>
<dialog id="consultation-dialog" aria-labelledby="dialog-title"><button id="close-dialog" class="close-dialog" type="button" aria-label="Close scheduling preview">×</button><p class="eyebrow">Scheduling options · demo</p><h2 id="dialog-title">Two ways to schedule.</h2><p>In the proposed flow, complete the form first. If you pre-qualify, you can schedule directly or choose an AI scheduling call to help find a time.</p><div class="dialog-note"><strong>No request has been sent.</strong><p>This is a demo. Intake, direct self-scheduling and the AI scheduling call are not connected. This preview does not ask for contact details, place a call, select an appointment or enroll you in emails.</p></div><p class="small">Final screening criteria, consultation terms and availability still need confirmation. Any AI scheduling call would require the appropriate consent. Educational emails would require a separate, optional choice.</p><button id="done-dialog" class="btn full" type="button">Return to the page</button></dialog>
<script>
(function(){'use strict';
var form=document.getElementById('provider-screen'),result=document.getElementById('screen-result'),error=document.getElementById('screen-error'),dialog=document.getElementById('consultation-dialog');
var route=${providerRoute.toString()};
var messages={conversation:['A conversation may be a useful next step.','Your answers are a starting point, not a qualification decision or proof of a claim. In the proposed flow, if you pre-qualify, you can schedule directly or choose an AI scheduling call. Neither option is connected in this demo.'],clarify:['A few details are worth clarifying.','Being unsure or outside the indicated billing range is not an automatic rejection. A conversation can clarify your organization’s circumstances and whether further review may be appropriate.'],scope:['Let’s clarify the scope first.','This page focuses on commercial out-of-network services billed during 2015–2026. If you are unsure whether that describes your organization, clarify those details before completing a future qualification form. This demo does not determine qualification.']};
form.noValidate=true;
form.addEventListener('submit',function(e){e.preventDefault();var a={role:form.elements.role.value,oon:form.elements.oon.value,volume:form.elements.volume.value};var state=route(a);error.hidden=state!=='incomplete';if(state==='incomplete'){for(var i=0;i<form.elements.length;i++){if(form.elements[i].tagName==='SELECT'&&!form.elements[i].value){form.elements[i].focus();break;}}return;}document.getElementById('result-heading').textContent=messages[state][0];document.getElementById('result-copy').textContent=messages[state][1];result.dataset.route=state;result.hidden=false;form.hidden=true;result.focus();});
document.getElementById('reset-screen').addEventListener('click',function(){result.hidden=true;form.hidden=false;error.hidden=true;form.elements.role.focus();});
document.getElementById('request-consultation').addEventListener('click',function(){dialog.showModal();});
['close-dialog','done-dialog'].forEach(function(id){document.getElementById(id).addEventListener('click',function(){dialog.close();});});
dialog.addEventListener('click',function(e){if(e.target===dialog){var r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
})();
</script></body></html>`;
}
const PROVIDER_CSS = `
:root{--teal:#184143;--dark:#103335;--ink:#213a3b;--muted:#586b6a;--paper:#f7f6f1;--cream:#e8e2cc;--line:#d9dfd8;--gold:#bb9b5a}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:28px}body{margin:0;background:#fff;color:var(--ink);font:16px/1.65 Arial,Helvetica,sans-serif}button,select{font:inherit}button,a,select{touch-action:manipulation}button{cursor:pointer}a{color:inherit}img{max-width:100%;height:auto;display:block}[hidden]{display:none!important}h1,h2,h3,p,figure{margin:0}h1,h2{font-family:Georgia,'Times New Roman',serif;font-weight:400;line-height:1.08;letter-spacing:-1.8px}h1{font-size:clamp(44px,5.2vw,72px)}h2{font-size:clamp(34px,3.6vw,48px)}h3{font-size:20px;line-height:1.3}p+p{margin-top:18px}.wrap{width:min(1160px,calc(100% - 64px));margin:auto}.skip{position:absolute;left:10px;top:-100px;background:#fff;padding:12px;z-index:20}.skip:focus{top:10px}:focus-visible{outline:3px solid #bc7b36;outline-offset:4px}.kit-preview{background:#f3ecdb;color:#4b4435;text-align:center;font-size:12px;padding:9px 20px}.site-head{background:#fff;border-bottom:1px solid var(--line)}.head-inner{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px 0}.brand{display:flex;gap:11px;align-items:center;text-decoration:none;font-family:Georgia,serif;font-size:21px;line-height:1.2}.brand small{display:block;font:9px/1.5 Arial,sans-serif;letter-spacing:1.5px;margin-top:5px}.site-head nav{display:flex;gap:25px;align-items:center;font-size:13px}.site-head nav>a:not(.btn){text-decoration:none}.btn{display:inline-flex;align-items:center;justify-content:center;gap:28px;min-height:49px;padding:13px 21px;border:1px solid var(--teal);border-radius:3px;background:var(--teal);color:white;text-decoration:none;font-size:14px;font-weight:600;line-height:1.4}.btn:hover{background:#27575a}.btn span{font-size:19px;font-weight:400}.btn.compact{font-size:12px;padding:10px 15px;min-height:43px;gap:18px}.btn.cream{background:var(--cream);border-color:var(--cream);color:var(--dark)}.btn.cream:hover{background:#f4edd6}.btn.full{width:100%;justify-content:space-between}.hero{background:var(--teal);color:#fff;overflow:hidden}.hero-grid{display:grid;grid-template-columns:1.07fr 1fr;gap:65px;align-items:center;padding:64px 0 52px}.eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:700;color:var(--teal);margin-bottom:19px}.hero .eyebrow{color:#dfd5b6}.hero .lede{font-size:17px;line-height:1.75;color:#dbe7e3;margin-top:25px;max-width:560px}.actions{display:flex;gap:25px;align-items:center;margin-top:29px;flex-wrap:wrap}.text-link{font-size:13px;text-underline-offset:5px}.hero-note{font-size:12px;line-height:1.7;color:#c4d6d0;margin-top:20px}.hero-art{position:relative}.hero-art img{width:100%;border-radius:4px}.hero-art figcaption{font-size:10px;color:#bcd0c8;margin-top:8px;text-align:right}.principles{display:grid;grid-template-columns:repeat(3,1fr);gap:35px;border-bottom:1px solid var(--line);padding:30px 0}.principles>div{display:flex;gap:16px;align-items:start}.principles span{color:#987747;font-family:Georgia,serif;font-size:23px}.principles p{font-size:12px;color:var(--muted);line-height:1.55}.principles strong{display:block;font-size:14px;color:var(--ink);margin-bottom:5px}.section{padding:85px 0}.intro-grid{display:grid;grid-template-columns:1fr 1fr;gap:90px}.large{font-size:18px;line-height:1.65;margin-top:24px;color:var(--muted)}.body-copy{padding-top:38px;color:var(--muted);font-size:15px}.inline-link{display:inline-flex;gap:18px;font-size:13px;font-weight:600;text-underline-offset:5px;margin-top:18px;color:var(--teal)}.billing-section{background:var(--paper);padding:65px 0}.billing-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:90px;align-items:center}.billing-art img{border:1px solid #dedfd4;border-radius:5px;width:100%}.terms{margin:22px 0 15px}.terms>div{padding:14px 0;border-bottom:1px solid var(--line)}.terms dt{font-weight:700;font-size:14px}.terms dd{margin:5px 0 0;font-size:13px;color:var(--muted)}.small{font-size:12px;color:var(--muted);line-height:1.7}.section-title{display:flex;justify-content:space-between;gap:60px;align-items:end;margin-bottom:32px}.section-title>p{max-width:390px;font-size:15px;color:var(--muted)}.audience-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}.audience-grid article{padding:27px;border:1px solid var(--line);border-radius:4px}.icon{display:block;color:#987747;font-size:10px;letter-spacing:1.6px;margin-bottom:30px}.audience-grid p{margin-top:12px;font-size:14px;color:var(--muted)}.audience-note{margin-top:18px}.review-section{background:#e9efea;padding:78px 0}.review-grid{display:grid;grid-template-columns:.85fr 1.15fr;gap:88px;align-items:start}.review-intro>p:not(.eyebrow){margin-top:24px;color:var(--muted)}.callout{margin-top:30px;border-left:2px solid #a78850;padding:2px 0 2px 20px}.callout strong{font-family:Georgia,serif;font-size:23px;font-weight:400}.callout p{font-size:14px;color:var(--muted);margin-top:9px}.screen{background:#fff;border:1px solid #d4ddd3;border-radius:5px;padding:29px;box-shadow:0 12px 28px #24473c08}.screen-head{display:flex;gap:15px;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:20px;margin-bottom:25px}.screen-head strong{font-size:13px}.screen-head>span{font-size:9px;letter-spacing:1.3px;white-space:nowrap;padding-top:3px}.field{margin-bottom:24px}.field label{display:block;font-size:14px;font-weight:600;line-height:1.55;margin-bottom:9px}.field label>span{color:#9a7e4b;margin-right:10px;font-size:11px}.field select{width:100%;min-height:47px;border:1px solid #b6c3ba;border-radius:3px;background:#fff;color:var(--ink);padding:10px 30px 10px 11px;font-size:14px}.field p{font-size:11px;color:var(--muted);line-height:1.6;margin-top:7px}.screen-foot{font-size:10px;color:var(--muted);border-top:1px solid var(--line);padding-top:16px;margin-top:20px}.error{color:#a32623;font-size:12px;margin-bottom:15px}.result{padding:12px 0}.result h3{font-family:Georgia,serif;font-weight:400;font-size:31px;letter-spacing:-.7px}.result>p:not(.eyebrow){color:var(--muted);font-size:14px;margin:17px 0 25px}.reset{display:block;margin:15px auto 0;background:none;border:0;text-decoration:underline;text-underline-offset:4px;color:var(--teal);font-size:12px;padding:8px}.process{display:grid;grid-template-columns:repeat(3,1fr);padding:0;list-style:none;margin:35px 0 40px;gap:40px}.process li{border-top:1px solid var(--line);padding-top:20px}.process span{font-family:Georgia,serif;font-size:30px;color:#9b7d47;display:block;margin-bottom:22px}.process p{font-size:14px;color:var(--muted);margin-top:12px}.firm-card{border:1px solid var(--line);padding:33px;display:grid;grid-template-columns:95px 1fr;gap:30px;align-items:center}.firm-monogram{font-family:Georgia,serif;font-size:36px;letter-spacing:-3px;color:var(--teal);width:85px;height:85px;border:1px solid #b9c6bf;display:grid;place-items:center}.firm-card .eyebrow{font-size:9px;margin-bottom:8px}.firm-card h3{font-family:Georgia,serif;font-size:27px;font-weight:400}.firm-card p:not(.eyebrow){font-size:13px;color:var(--muted);margin-top:10px;max-width:740px}.firm-card a{margin-top:12px;font-size:12px}.faq-section{background:var(--paper);padding:70px 0}.faq-grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:85px}.faqs details{border-bottom:1px solid var(--line);padding:20px 0}.faqs details:first-child{padding-top:0}.faqs summary{cursor:pointer;font-size:15px;font-weight:600;line-height:1.5;padding-right:18px}.faqs p{font-size:14px;color:var(--muted);margin-top:15px}.final-cta{padding:75px 0;text-align:center}.final-cta h2{margin-bottom:25px}.site-footer{background:var(--dark);color:#c1d1ca;padding:35px 0}.footer-brand{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #416260;padding-bottom:20px;margin-bottom:20px}.footer-brand strong{font-family:Georgia,serif;font-weight:400;font-size:22px;color:#fff}.footer-brand span{font-size:11px;padding-top:7px}.site-footer p{font-size:11px;line-height:1.8;max-width:1070px}.site-footer p+p{margin-top:12px}.footer-links{display:flex;gap:24px;flex-wrap:wrap;margin-top:22px;font-size:11px}.footer-links a{text-underline-offset:4px}dialog{width:min(570px,calc(100% - 28px));border:1px solid var(--line);border-radius:6px;background:#fff;color:var(--ink);padding:38px;max-height:90dvh;box-shadow:0 30px 80px #0003}dialog::backdrop{background:#103335b3;backdrop-filter:blur(2px)}dialog h2{font-size:37px;margin-bottom:20px}dialog>p:not(.eyebrow){font-size:14px;color:var(--muted)}.dialog-note{background:#eff2e9;border-left:3px solid #ab925c;padding:17px;margin:20px 0}.dialog-note p{font-size:13px;margin-top:6px;color:var(--muted)}dialog .btn{margin-top:22px}.close-dialog{position:absolute;right:12px;top:10px;border:0;background:transparent;font-size:25px;color:var(--teal);width:32px;height:32px}
@media(max-width:1000px){.site-head nav>a:not(.btn){display:none}.hero-grid{gap:35px}.intro-grid,.billing-grid,.review-grid,.faq-grid{gap:45px}.hero h1{font-size:53px}.section-title{gap:35px}.wrap{width:calc(100% - 48px)}}
@media(max-width:720px){.wrap{width:calc(100% - 36px)}.kit-preview{font-size:10px;line-height:1.5;padding:8px 14px}.head-inner{padding:15px 0;gap:12px}.brand{font-size:17px;gap:8px}.brand img{width:34px;height:34px}.brand small{font-size:7px;letter-spacing:.9px}.site-head nav .btn{font-size:10px;padding:8px 9px;max-width:117px;gap:5px;min-height:39px}.site-head nav .btn span{display:none}.hero-grid{grid-template-columns:1fr;gap:30px;padding:44px 0 30px}.hero h1{font-size:47px;max-width:560px}.hero .lede{font-size:16px;margin-top:21px}.hero-art{max-width:460px;margin:0 auto;width:100%}.hero-art img{max-height:350px;object-fit:cover;object-position:center}.hero-note{font-size:11px}.actions{gap:20px}.eyebrow{font-size:9px;letter-spacing:1.6px}.principles{grid-template-columns:1fr;gap:17px;padding:25px 0}.principles>div{gap:16px}.principles span{font-size:21px}.principles p{font-size:12px}.principles strong{display:inline;margin-right:6px}.section{padding:53px 0}.intro-grid,.billing-grid,.review-grid,.faq-grid{grid-template-columns:1fr;gap:30px}.body-copy{padding-top:0;font-size:14px}.large{font-size:17px;margin-top:20px}.billing-section{padding:40px 0}.billing-art{max-width:440px;width:100%;margin:auto}.billing-grid{gap:34px}.section-title{display:block;margin-bottom:25px}.section-title>p{margin-top:20px;font-size:14px}.audience-grid{grid-template-columns:1fr;gap:13px}.audience-grid article{padding:22px}.icon{margin-bottom:15px}.audience-grid p{font-size:13px;margin-top:8px}.review-section{padding:48px 0}.review-intro>p:not(.eyebrow){margin-top:20px;font-size:14px}.callout{margin-top:22px}.review-intro>.small{font-size:11px!important}.screen{padding:22px 19px}.screen-head{gap:10px}.screen-head strong{font-size:12px}.screen-head>span{font-size:8px}.field label{font-size:13px}.field select{font-size:13px}.process{grid-template-columns:1fr;gap:22px;margin:28px 0}.process li{display:grid;grid-template-columns:40px 1fr;gap:5px 14px;padding-top:20px}.process span{grid-row:span 2;font-size:26px;margin:0}.process h3{font-size:17px}.process p{margin:0;font-size:13px}.firm-card{grid-template-columns:1fr;gap:18px;padding:24px}.firm-monogram{width:60px;height:60px;font-size:27px}.faq-section{padding:47px 0}.faq-grid{gap:32px}.faqs summary{font-size:14px}.faqs p{font-size:13px}.final-cta{padding:50px 0}.footer-brand{display:block}.footer-brand span{display:block;font-size:10px}.site-footer p{font-size:10px}.footer-links{font-size:10px;gap:18px}dialog{padding:30px 23px}dialog h2{font-size:32px}.btn{font-size:13px}}
/* Portrait-led provider page: local firm photography, no generic healthcare art. */
.hero{background:#153f42}.hero-grid{grid-template-columns:1.15fr .85fr;gap:76px;padding:54px 0 40px}.hero h1{font-size:clamp(44px,4.9vw,65px);letter-spacing:-2px;max-width:640px}.hero .lede{font-size:17px;max-width:570px}.hero-art{max-width:405px;width:100%;justify-self:end}.portrait-frame{position:relative;overflow:hidden;border-radius:18px 18px 3px 3px;background:#cad0cf}.portrait-frame>img{width:100%;height:430px;object-fit:cover;object-position:center 23%;border-radius:0}.portrait-label{position:absolute;inset:auto 0 0;background:linear-gradient(transparent,rgba(8,30,32,.96) 35%);padding:55px 26px 23px;color:white}.portrait-label>span{font-size:9px;letter-spacing:1.6px;color:#e9d5ad}.portrait-label strong{display:block;font:29px/1.3 Georgia,serif;margin-top:5px}.portrait-label p{font-size:12px;color:#dbe6e4;margin-top:4px}.hero-art figcaption{display:flex;align-items:center;justify-content:space-between;gap:20px;text-align:left;margin-top:22px}.hero-art figcaption img{width:188px;border-radius:0}.hero-art figcaption a{font-size:11px;white-space:nowrap;text-underline-offset:4px}.hero .eyebrow{max-width:420px;line-height:1.7}.btn{border-radius:7px}.btn.cream{background:#f2deb0;border-color:#f2deb0}.principles{padding:28px 0}.review-section{background:#f2f5f1;padding:70px 0}.review-grid{gap:80px;grid-template-columns:.9fr 1.1fr}.screen{border-radius:16px;padding:30px;box-shadow:0 20px 45px #153f420a}.screen-head{margin-bottom:14px;border-bottom:0;padding-bottom:0}.screen-steps{list-style:none;display:flex;gap:9px;padding:0;margin:0 0 26px;counter-reset:step}.screen-steps li{flex:1;font-size:10px;color:var(--muted);padding-top:10px;border-top:3px solid #e6ebe6}.screen-steps li.current{border-color:var(--teal);color:var(--teal);font-weight:700}.field select{border-radius:7px;min-height:50px}.field p{font-size:12px}.screen-foot{font-size:11px}.callout{padding:19px 21px;background:#e7ede5;border-left:3px solid #af8b44;border-radius:0 9px 9px 0}.audience-grid article{border-radius:12px;background:#fff}.audience-grid article:nth-child(2){background:#f4f6f3}.audience-grid article:nth-child(3){background:#f8f5ed}.attorney-section{padding:80px 0;background:#f0f3ee}.attorney-grid{display:grid;grid-template-columns:360px 1fr;gap:80px;align-items:center}.attorney-photo img{border-radius:12px;width:100%}.attorney-photo figcaption{font-size:11px;color:var(--muted);margin-top:12px}.attorney-grid h3{font-size:24px;margin-top:27px}.attorney-title{font-size:13px;color:var(--teal);margin-top:6px}.attorney-grid p:not(.eyebrow):not(.attorney-title){color:var(--muted);font-size:15px;margin-top:20px}.attorney-grid .actions{gap:22px;margin-top:24px}.attorney-grid .actions .inline-link{margin:0}.attorney-grid .btn{font-size:12px}.process li{padding:24px;border:1px solid var(--line);border-radius:12px;background:#fafbf8}.process{gap:20px}.process span{font:700 12px Arial,sans-serif;background:#e7eee7;border-radius:50%;width:36px;height:36px;display:grid;place-items:center;color:var(--teal);margin-bottom:20px}.final-cta{padding:68px 0}.billing-art img{border-radius:12px}.faqs details{padding:22px 0}.faqs summary{min-height:25px}dialog{border-radius:16px}
@media(max-width:1000px){.hero-grid{gap:40px}.hero h1{font-size:53px}.portrait-frame>img{height:410px}.hero-art figcaption{flex-wrap:wrap;gap:12px}.attorney-grid{grid-template-columns:300px 1fr;gap:45px}}
@media(max-width:720px){.hero-grid{grid-template-columns:1fr;padding:36px 0 30px;gap:30px}.hero h1{font-size:45px;letter-spacing:-1.5px}.hero .lede{font-size:15px;line-height:1.7;margin-top:19px}.hero .actions{gap:18px;margin-top:24px}.hero-art{max-width:390px;justify-self:center}.portrait-frame>img{height:375px;max-height:none;object-position:center 24%}.portrait-label{padding:50px 22px 20px}.portrait-label strong{font-size:27px}.hero-art figcaption{flex-wrap:nowrap;gap:12px;margin-top:17px}.hero-art figcaption img{width:175px}.hero-art figcaption a{font-size:10px}.review-section{padding:45px 0}.review-grid{grid-template-columns:1fr;gap:28px}.review-intro h2 br{display:none}.screen{padding:24px 19px}.field select{font-size:14px}.screen-foot{font-size:11px}.principles{gap:17px}.principles strong{display:block}.attorney-section{padding:46px 0}.attorney-grid{grid-template-columns:1fr;gap:29px}.attorney-photo{max-width:320px}.attorney-grid h3{font-size:22px;margin-top:22px}.attorney-grid p:not(.eyebrow):not(.attorney-title){font-size:14px}.attorney-grid .actions{gap:17px}.process li{grid-template-columns:35px 1fr;padding:20px;gap:5px 15px}.process span{margin:0;font-size:11px}.process h3{font-size:17px}.process p{font-size:13px}.final-cta{padding:48px 0}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;

// ---------- write ----------
export function build(file) {
  const c = normalize(JSON.parse(readFileSync(file, 'utf8')));
  // publish:false keeps the pages out of btl/ (not deployed) — used for client lanes that already live elsewhere.
  const outDir = join(KIT, 'out', c.slug), pageDir = c.publish === false ? join(outDir, 'preview') : join(ROOT, 'btl', 'c', c.slug);
  mkdirSync(pageDir, {recursive: true}); mkdirSync(outDir, {recursive: true});
  for (const [n, html] of Object.entries(renderPages(c))) writeFileSync(join(pageDir, n), html);
  writeFileSync(join(pageDir, 'site.css'), renderCss(c));
  if (c.layout === 'provider-review' && c.publish !== false) for (const slug of c.legacy_slugs ?? []) {
    const aliasDir = join(ROOT, 'btl', 'c', slug);
    mkdirSync(aliasDir, {recursive:true});
    writeFileSync(join(aliasDir, 'index.html'), renderProviderReview(c));
    writeFileSync(join(aliasDir, 'site.css'), renderCss(c));
  }
  for (const [n, v] of Object.entries(renderBundle(c))) writeFileSync(join(outDir, n), typeof v === 'string' ? v : JSON.stringify(v, null, 2) + '\n');
  return {campaign_id: c.campaign_id, pages: pageDir.slice(ROOT.length + 1) + '/', bundle: `campaign-kit/out/${c.slug}/`};
}

// Rewrites the generated block of the read-first brief so the status table can never drift from the configs.
export function writeBriefChecklist(configs) {
  const f = join(KIT, 'BRIEF.md'), start = '<!-- checklist:start -->', end = '<!-- checklist:end -->';
  const brief = readFileSync(f, 'utf8'), a = brief.indexOf(start), b = brief.indexOf(end);
  if (a < 0 || b < a) throw Error('BRIEF.md is missing the checklist markers');
  const block = configs.map(c => `### ${c.campaign_id ?? c.slug} · ${c.tort.name} · ${c.mode.toUpperCase()}\n\n| Area | Item | Status | Evidence |\n|---|---|---|---|\n${mdRows(checklist(c))}\n`).join('\n');
  writeFileSync(f, brief.slice(0, a + start.length) + `\n_Generated by \`node campaign-kit/build.mjs --all\` (kit ${KIT_VERSION}). Do not edit by hand._\n\n` + block + brief.slice(b));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dir = join(KIT, 'campaigns');
  const files = args[0] === '--all' ? readdirSync(dir).filter(f => f.endsWith('.json')).map(f => join(dir, f)) : args;
  if (!files.length) { console.error('usage: build.mjs <campaign.json> | --all'); process.exit(1); }
  for (const f of files) { if (!existsSync(f)) { console.error('missing ' + f); process.exit(1); } console.log(JSON.stringify(build(f))); }
  if (args[0] === '--all') writeBriefChecklist(files.map(f => normalize(JSON.parse(readFileSync(f, 'utf8')))));
}

