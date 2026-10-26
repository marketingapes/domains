#!/usr/bin/env node
// Campaign kit: one campaign JSON -> a complete three-door lane on besttortlawyers.com plus the
// staged (never live) channel, voice, delivery, portal and launch files that go with it.
//
//   node campaign-kit/build.mjs campaign-kit/campaigns/<slug>.json   # one campaign
//   node campaign-kit/build.mjs --all                                 # every config in campaigns/
//
// Writes:
//   btl/c/<slug>/{index,quiz,sofia,form,ads}.html + site.css   public pages, always noindex
//   campaign-kit/out/<slug>/*.json + LAUNCH.md                  internal bundle, not deployed
//
// Nothing here calls an ad platform, Vapi, Make or a buyer. Every channel file is a PAUSED draft;
// launch stays human-gated (see LAUNCH.md in each bundle).
import {readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const KIT = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(KIT, '..');
export const KIT_VERSION = '2026-10-26.1';

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
  intake: {webhook: 'https://hook.us2.make.com/7iit9nlnwuxmvt5ry1p7tq1vlryp5bkc', trustedform: true},
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
  need(/^https:\/\//.test(c.intake.webhook ?? ''), 'intake.webhook must be https');
  need(Array.isArray(c.quiz) && c.quiz.length >= 3 && c.quiz.length <= 10, 'quiz: 3-10 questions');
  for (const [i, q] of (c.quiz ?? []).entries()) {
    need(/^[a-z][a-z0-9_]*$/.test(q.key ?? ''), `quiz[${i}].key`);
    need(q.q && Array.isArray(q.options) && q.options.length >= 2, `quiz[${i}] needs q + 2+ options`);
    for (const o of q.options ?? []) need(SIGNALS.includes(o.signal), `quiz[${i}] option "${o.label}" signal must be one of ${SIGNALS.join('|')}`);
  }
  need(new Set((c.quiz ?? []).map(q => q.key)).size === (c.quiz ?? []).length, 'quiz keys must be unique');
  need(Array.isArray(c.geo?.states) && c.geo.states.length, 'geo.states: at least one state (or ["US"])');
  need(DELIVERY.includes(c.delivery?.mode), `delivery.mode: ${DELIVERY.join('|')}`);
  if (c.delivery?.mode === 'live_transfer') need(telOk(c.delivery.transfer_number ?? ''), 'delivery.transfer_number (E.164) required for live_transfer');
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
  const tf = c.intake.trustedform && (page === 'quiz' || page === 'form') ? TRUSTEDFORM : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex,follow">
<meta name="campaign-kit" content="${esc(c.campaign_id)} · ${KIT_VERSION}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website">${c.images?.og ? `<meta property="og:image" content="${esc(c.images.og)}">` : ''}
<link rel="icon" href="${esc(b.logo)}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fam}&display=swap">
<link rel="stylesheet" href="site.css?v=${KIT_VERSION}">
<!-- Google Tag Manager (${esc(c.gtm)}). Non-identifying events only: ee_page_view, ee_door_click, ee_lead_submit_attempt, ee_lead_submit_success. No PII is pushed. -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${js(c.gtm)});</script>
<script>window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'ee_page_view',page_id:${js(pid(c, page))},campaign_id:${js(c.campaign_id)},tenant_id:${js(c.tenant_id)},domain_id:${js(c.domain_id)}});</script>
${tf}</head><body>
<div class="bar"><div class="in"><span><b>${esc(b.fee_line)}</b> ${esc(b.tagline ?? 'Free consultation, 24/7.')}</span><a href="tel:${esc(c.sofia.phone_tel)}" data-door="sofia">${esc(c.sofia.phone_display)}</a></div></div>
<div class="nav"><div class="in"><a href="./" class="brand" aria-label="${esc(b.name)}">${b.logo_wide ? `<img src="${esc(b.logo_wide)}" alt="${esc(b.name)}">` : `<span class="wordmark"><img src="${esc(b.logo)}" alt="" width="36" height="36">${esc(b.name)}</span>`}</a><nav class="links"><a href="quiz.html">Case check</a><a href="form.html">Request a callback</a><a class="call" href="sofia.html">Talk to us now</a></nav></div></div>
`;
}

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
  <div>${esc(b.address)} · <a href="tel:${esc(b.phone_tel)}">${esc(b.phone_display)}</a> · <a href="${esc(b.privacy_url)}">Privacy</a> · <a href="${esc(b.terms_url)}">Terms</a></div>
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
const fine = c => `<p class="err" id="senderr" role="alert" hidden>That did not go through. Please try again, or call <a href="tel:${esc(c.sofia.phone_tel)}">${esc(c.sofia.phone_display)}</a>.</p><p class="fine">By submitting you agree to the <a href="${esc(c.brand.privacy_url)}">privacy policy</a> and <a href="${esc(c.brand.terms_url)}">terms</a>. Attorney advertising. This is not a case decision; a person reviews every inquiry.</p>`;
const done = (c, msg) => `<div class="ok" id="done" hidden><b>Received.</b>${esc(msg)} If you would rather talk now, call <a href="tel:${esc(c.sofia.phone_tel)}" data-door="sofia">${esc(c.sofia.phone_display)}</a>.</div>`;

function quizCard(c) {
  const n = c.quiz.length;
  const qs = c.quiz.map((q, i) => `<div class="q${i ? '' : ' on'}" data-k="${esc(q.key)}"><h2 class="qh">${esc(q.q)}</h2>${q.hint ? `<p class="qs">${esc(q.hint)}</p>` : ''}
    <div class="opts">${q.options.map(o => `<button type="button" data-v="${esc(o.value)}" data-s="${esc(o.signal)}">${esc(o.label)}</button>`).join('')}</div></div>`).join('\n  ');
  return `<div class="card" id="quiz" data-campaign="${esc(c.campaign_id)}" data-door="quiz">
  <div class="card-head"><span class="k">Eligibility check</span><span class="count" id="count">1 of ${n}</span></div>
  <div class="prog"><i id="bar"></i></div>
  ${qs}
  <div class="q" data-k="result"><div id="res"></div>
    <form id="cap" novalidate>${contactFields(c, false)}</div>${consent(c)}
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
  <form id="f" novalidate data-campaign="${esc(c.campaign_id)}" data-door="form">${contactFields(c, true)}${sel}
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
  <p class="ctas"><a class="cta" href="tel:${esc(s.phone_tel)}" data-door="sofia">Tap to call</a><button class="copybtn" id="copy" type="button">Copy number</button></p>
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
// Success is shown only on a 2xx; anything else shows the error line with the phone fallback.
const REQUEST_TYPE = {form: 'web_inquiry', quiz: 'quiz_inquiry', sofia: 'callback_request'};
export const consentVersion = c => `${c.slug}-consent-${c.consent_version ?? KIT_VERSION}`;
function captureJs(c, door, extra) {
  const cfg = {webhook: c.intake.webhook, campaign_id: c.campaign_id, tenant_id: c.tenant_id, domain_id: c.domain_id, page_id: pid(c, door), door, request_type: REQUEST_TYPE[door], consent_version: consentVersion(c)};
  return `<script>
(function(){
  var C=${js(cfg)};
  var attr={}; try{new URL(location.href).searchParams.forEach(function(v,k){ if(${CLICK_IDS}.test(k)) attr[k]=v; });}catch(e){}
  attr.landing_path=location.pathname; try{attr.referrer_host=document.referrer?new URL(document.referrer).host:'';}catch(e){attr.referrer_host='';}
  function ck(n){var m=document.cookie.match('(?:^|; )'+n+'=([^;]*)');return m?decodeURIComponent(m[1]):'';}
  attr.fbp=ck('_fbp'); attr.fbc=ck('_fbc');
  function v(id,ok,m){ var el=document.getElementById(id), e=el.parentNode.querySelector('.err'); if(e) e.textContent=ok?'':m; el.setAttribute('aria-invalid',ok?'false':'true'); return ok; }
  function ev(n){ try{window.dataLayer.push({event:n,page_id:C.page_id,campaign_id:C.campaign_id,door:C.door});}catch(e){} }
  function sid(){ var k='ee_sub_'+C.page_id; try{var s=sessionStorage.getItem(k); if(s) return s;}catch(e){} var u; try{u=crypto.randomUUID();}catch(e){u='s'+Date.now()+Math.random().toString(16).slice(2);} try{sessionStorage.setItem(k,u);}catch(e){} return u; }
  function send(f,screening,onDone){
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
    if(/[?&]ee_test=synthetic/.test(location.search)) p.test={synthetic:true};
    var btn=document.getElementById('send'), er=document.getElementById('senderr'); btn.disabled=true; er.hidden=true; ev('ee_lead_submit_attempt');
    var body=new URLSearchParams({payload:JSON.stringify(p),submission_id:p.submission_id});
    var ctl=('AbortController' in window)?new AbortController():null; var tm=setTimeout(function(){ if(ctl) ctl.abort(); },15000);
    fetch(C.webhook,{method:'POST',body:body,signal:ctl?ctl.signal:undefined}).then(function(r){ clearTimeout(tm); if(!r.ok) throw Error(r.status);
      f.hidden=true; document.getElementById('done').hidden=false; ev('ee_lead_submit_success'); if(onDone) onDone(); })
    .catch(function(){ clearTimeout(tm); btn.disabled=false; er.hidden=false; ev('ee_lead_submit_error'); });
  }
${extra}
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
  document.getElementById('cap').addEventListener('submit',function(e){ e.preventDefault(); var sc=Object.assign({},a,{web_outcome:outcome(a),quiz_version:${js(quizVersion(c))}}); send(e.target,sc); });`;

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
.nav{background:var(--navy)}.wordmark{display:inline-flex;align-items:center;gap:10px;color:#fff;font-family:var(--display);font-size:20px;font-weight:700;text-decoration:none}.nav .wordmark img{width:36px}.brand{text-decoration:none}
`;
  return readFileSync(join(KIT, 'base.css'), 'utf8') + '\n/* campaign-kit brand tokens: ' + c.campaign_id + ' */\n' + vars;
}

// ---------- internal bundle: channels, voice, delivery, portal, tracking, launch ----------
export function renderBundle(c) {
  const usd = c.budget.media_total_usd, days = c.budget.days, base = `${c.domain_id === 'besttortlawyers.com' ? 'https://besttortlawyers.com' : 'https://' + c.domain_id}/c/${c.slug}/`;
  const url = (door, source, medium = 'paid') => `${base}${PAGE_FILES[door]}?utm_source=${source}&utm_medium=${medium}&utm_campaign=${encodeURIComponent(c.campaign_id)}&utm_content=${door}`;
  const daily = ch => Math.max(1, Math.round((usd * c.split[ch]) / days));
  const name = (ch, extra = '') => `${c.campaign_id} | ${c.tort.name} | ${ch}${extra} | DRAFT PAUSED | campaign-kit ${KIT_VERSION}`;
  const states = c.geo.states.includes('US') ? ['US'] : c.geo.states;

  const meta = {
    status: 'PAUSED_DRAFT', note: 'Create via Ryze meta_ads.runGraphWrite with status PAUSED. Never activate without Kyle approval in chat.',
    ad_account: c.channels.meta.ad_account, page_id: c.channels.meta.page_id, instagram_id: c.channels.meta.instagram_id, pixel_id: c.channels.meta.pixel_id,
    campaign: {name: name('Meta', ' | 3 doors'), objective: c.channels.meta.objective, status: 'PAUSED', special_ad_categories: c.channels.meta.special_ad_categories, daily_budget_usd: daily('meta')},
    ad_sets: [{name: `${c.campaign_id} | ${states.join(',')} | 3 doors`, status: 'PAUSED', optimization_goal: 'OFFSITE_CONVERSIONS', promoted_object: {pixel_id: c.channels.meta.pixel_id, custom_event_type: 'LEAD'}, targeting: {geo_locations: states[0] === 'US' ? {countries: ['US']} : {regions_by_state_code: states}, age_min: c.geo.age_min ?? 25, publisher_platforms: ['facebook', 'instagram']}}],
    ads: c.ads.map(a => ({name: `${c.campaign_id} | door:${a.door}`, status: 'PAUSED', headline: a.headline, primary_text: a.primary_text, call_to_action: a.cta, link: url(a.door, 'facebook'), image: c.images?.['ad_' + a.door] ? base + c.images['ad_' + a.door] : null})),
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
    provision_bot_input: {firm_name: c.delivery.firm_name ?? c.brand.name, buyer_id: c.tenant_id, transfer_number: c.delivery.transfer_number ?? null, states: c.geo.states, accepted: [c.tort.name], turned_down: c.criteria.disqualifies ?? [], hours: c.delivery.hours ?? '24/7', language: c.sofia.language ?? 'en'},
    criteria_prompt_block: [`CAMPAIGN ${c.campaign_id} — ${c.tort.name}`, 'Ask one question at a time, in this order:', ...c.quiz.map((q, i) => `${i + 1}. ${q.q} (qualifying answers: ${q.options.filter(o => o.signal === 'good').map(o => o.label).join(' / ') || 'n/a'})`), 'Qualifies when: ' + c.criteria.qualifies.join('; '), 'Does not qualify when: ' + (c.criteria.disqualifies ?? []).join('; '), `Delivery: ${c.delivery.mode}${c.delivery.mode === 'live_transfer' ? ' to the firm intake line during ' + (c.delivery.hours ?? '24/7') : ''}.`, 'Never say the caller qualifies; say they may potentially qualify for review. Never give legal advice.'].join('\n'),
  };
  const delivery = {
    mode: c.delivery.mode, options_offered_to_firm: ['live_transfer', 'scheduled_callback', 'api_webhook', 'email'],
    transfer_number: c.delivery.transfer_number ?? null, hours: c.delivery.hours ?? '24/7', buyer_webhook: c.delivery.buyer_webhook ?? null, buyer_email: c.delivery.buyer_email ?? null, schedule_url: c.delivery.schedule_url ?? null,
    payload_contract: 'btl.intake.web/v1 (same as the live Paraquat lane; see tracking.json). Buyer outcome comes back via POST to the Perspective outcome endpoint or a portal status update: accepted | rejected(reason) | signed | not_signed.',
    real_time_return: 'Firm returns status per lead_id within 24h (portal button, API, or reply to the lead email). Feeds Meta CAPI + Google offline conversions + BigQuery.',
  };
  // Paste-ready entries for the two services that already serve Paraquat (see docs/paraquat-overview.md in legal-web-lead).
  const source = `make:btl-${c.slug}-web`;
  const perspective = {
    status: 'NOT_PROVISIONED', kpis: ['spend', 'leads', 'cost_per_lead', 'qualified', 'transferred', 'accepted', 'signed', 'cost_per_signed', 'door_mix', 'speed_to_contact'],
    make_intake_scenario: {clone_of: 'Make 6437227 "BTL — Paraquat Web Intake" (hook 2868930)', must: ['parse payload (form field) as JSON', 'dedupe on submission_id', `append BigQuery evolution_engine.raw_lead_events with source "${source}", event_type "lead.received"`, `deliver per delivery.json (${c.delivery.mode})`, 'respond 200 {status:"received", receipt_id}'], set_webhook_in: `campaign-kit/campaigns/${c.slug}.json → intake.webhook`},
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
  const gates = [
    ['Buyer criteria approved in writing', !!c.criteria.approved_by],
    ['Firm identity, disclosures and attorney-advertising copy signed off', !!c.compliance?.copy_approved_by],
    ['Delivery destination verified with a test lead (form + quiz)', false],
    ['Sofia assistant provisioned, transfer tested on a live call', !!c.sofia.assistant_id && !!c.sofia.transfer_tested],
    ['TrustedForm certificate present on a test submission', false],
    ['GTM tags publish ee_lead_submit_success → Meta/Google/TikTok/OpenAI conversions', false],
    ['Perspective portal feed returns this campaign', false],
    ['Invoice paid / media authorization on file', !!c.billing?.paid],
    ['Kyle approves activation in chat (exact campaign + budget)', false],
  ];
  const launch = `# ${c.campaign_id} — ${c.tort.name} · launch gates

Generated by campaign-kit ${KIT_VERSION}. Status: **${gates.every(g => g[1]) ? 'READY FOR APPROVAL' : 'BUILT-NOT-LIVE'}**

Pages (noindex)${c.publish === false ? ' — PREVIEW ONLY, not deployed (publish:false; see out/' + c.slug + '/preview/). The live lane is the source; channel links below point at /c/ and must be repointed before use' : ''}: ${base}  ·  quiz ${base}quiz.html  ·  Sofia ${base}sofia.html  ·  form ${base}form.html  ·  ads ${base}ads.html

Budget: $${usd.toLocaleString()} media over ${days} days → Meta $${daily('meta')}/d · Google $${daily('google')}/d · TikTok $${daily('tiktok')}/d · ChatGPT $${daily('openai')}/d (all PAUSED drafts).
Delivery: ${c.delivery.mode}${c.delivery.transfer_number ? ' → ' + c.delivery.transfer_number : ''}. Geo: ${c.geo.states.join(', ')}.

| Gate | Status |
|---|---|
${gates.map(([g, ok]) => `| ${g} | ${ok ? 'PASS' : 'OPEN'} |`).join('\n')}

Criteria (as configured — not a legal determination):
- Qualifies: ${c.criteria.qualifies.join('; ')}
- Does not qualify: ${(c.criteria.disqualifies ?? []).join('; ') || 'not specified'}
`;
  return {'meta.json': meta, 'google-search.json': google, 'tiktok.json': tiktok, 'openai-ads.json': openai, 'sofia.json': sofia, 'delivery.json': delivery, 'perspective.json': perspective, 'tracking.json': tracking, 'LAUNCH.md': launch};
}

// ---------- write ----------
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dir = join(KIT, 'campaigns');
  const files = args[0] === '--all' ? readdirSync(dir).filter(f => f.endsWith('.json')).map(f => join(dir, f)) : args;
  if (!files.length) { console.error('usage: build.mjs <campaign.json> | --all'); process.exit(1); }
  for (const f of files) { if (!existsSync(f)) { console.error('missing ' + f); process.exit(1); } console.log(JSON.stringify(build(f))); }
}
