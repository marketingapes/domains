// Pure internal budget planning. Invoice/payment/queue state belongs to the
// existing order-contract.mjs in PR #362, never to a second commercial reducer.
const CHANNELS = ['meta', 'google', 'tiktok', 'openai'];
const cents = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-7;

export function validateCommercial(c) {
  if (c.commercial == null) return [];
  const p = c.commercial, errs = [], need = (ok, msg) => { if (!ok) errs.push('commercial.' + msg); };
  need(p && typeof p === 'object' && !Array.isArray(p), 'must be an object');
  need(p.currency === 'USD', 'currency must be USD');
  need(cents(p.package_total_usd) && p.package_total_usd > 0, 'package_total_usd must be a positive cent-precision amount');
  need(cents(p.planned_media_usd), 'planned_media_usd must be a nonnegative cent-precision amount');
  need(p.planned_media_usd <= p.package_total_usd, 'planned_media_usd cannot exceed package_total_usd');
  need(cents(c.budget?.media_total_usd) && c.budget.media_total_usd === p.planned_media_usd, 'planned_media_usd must equal budget.media_total_usd; package price is not the media budget');
  need(Number.isSafeInteger(c.budget?.days) && c.budget.days > 0 && c.budget.days <= 365, 'budget.days must be a whole number from 1 to 365');
  const split = c.split ?? {};
  need(Object.keys(split).every(k => CHANNELS.includes(k)), 'split contains an unsupported channel');
  need(CHANNELS.every(k => typeof split[k] === 'number' && Number.isFinite(split[k]) && split[k] >= 0 && split[k] <= 1), 'split must specify all supported channels with nonnegative fractions');
  need(Math.abs(CHANNELS.reduce((n, k) => n + (split[k] ?? 0), 0) - 1) < 1e-9, 'split must total 1');
  return errs;
}

// Largest-remainder allocation preserves the planned lifetime total in cents.
// Daily references are deliberately not described as spend-control guarantees.
export function allocateMedia(totalUsd, fractions, days) {
  if (!cents(totalUsd) || !Number.isSafeInteger(days) || days < 1 || days > 365) throw Error('Invalid media total or duration');
  if (!fractions || Object.keys(fractions).some(k => !CHANNELS.includes(k)) ||
      CHANNELS.some(k => typeof fractions[k] !== 'number' || !Number.isFinite(fractions[k]) || fractions[k] < 0 || fractions[k] > 1) ||
      Math.abs(CHANNELS.reduce((n, k) => n + fractions[k], 0) - 1) > 1e-9) throw Error('Invalid channel fractions');
  const total = BigInt(Math.round(totalUsd * 100));
  // Parse each finite numeric weight's exact decimal representation. Normalize
  // by their combined integer weight so accepted floating-point tolerance can
  // never inflate the budget or route rounding pennies to a zero-share channel.
  const decimals = CHANNELS.map(channel => {
    const [mantissa, exponent = '0'] = String(fractions[channel]).split('e');
    const [whole, fractional = ''] = mantissa.split('.');
    const scale = fractional.length - Number(exponent);
    return {coefficient: BigInt(whole + fractional), scale};
  });
  const scale = Math.max(0, ...decimals.map(x => x.scale));
  const weights = decimals.map(x => x.coefficient * 10n ** BigInt(scale - x.scale));
  const denominator = weights.reduce((sum, weight) => sum + weight, 0n);
  const rows = CHANNELS.map((channel, i) => {
    const numerator = total * weights[i];
    return {channel, i, amount: numerator / denominator, remainder: numerator % denominator, weight: weights[i]};
  });
  const rest = Number(total - rows.reduce((n, r) => n + r.amount, 0n));
  const ranked = rows.filter(r => r.weight > 0n).sort((a, b) => a.remainder === b.remainder ? a.i - b.i : a.remainder > b.remainder ? -1 : 1);
  for (let i = 0; i < rest; i++) ranked[i].amount++;
  if (rows.reduce((n, r) => n + r.amount, 0n) !== total) throw Error('Media allocation did not reconcile');
  return Object.fromEntries(rows.map(r => [r.channel, {
    lifetime_plan_cents: Number(r.amount),
    lifetime_plan_usd: Number(r.amount) / 100,
    daily_reference_usd: Number(r.amount / BigInt(days)) / 100,
    remainder_to_allocate_usd: Number(r.amount % BigInt(days)) / 100,
    enabled_for_spend: false,
  }]));
}

export function renderCommercial(c) {
  const errors = validateCommercial(c);
  if (errors.length) throw Error(errors.join('\n'));
  if (!c.commercial) return {schema: 'btl.campaign.media-plan/v1', status: 'NOT_CONFIGURED', execution_enabled: false};
  const p = c.commercial;
  return {
    schema: 'btl.campaign.media-plan/v1', campaign_id: c.campaign_id, tenant_id: c.tenant_id,
    status: 'UNAPPROVED_PLAN', execution_enabled: false,
    currency: p.currency, package_total_usd: p.package_total_usd, planned_media_usd: p.planned_media_usd,
    non_media_balance_usd: (Math.round(p.package_total_usd * 100) - Math.round(p.planned_media_usd * 100)) / 100,
    non_media_note: 'Unitemized package balance, not a profit estimate, added charge, or new invoice line.',
    media: allocateMedia(p.planned_media_usd, c.split, c.budget.days),
    duration_days: c.budget.days,
    spend_control_requirement: 'Approve channel allocations, eligibility, account currency, start/end dates, lifetime cap and stop rules before activation. Daily references alone are not spend caps. Allocate the rounding remainder explicitly.',
    order_workflow: {reuse: 'campaign-kit/order-contract.mjs from existing draft PR #362', source: 'https://github.com/marketingapes/domains/pull/362', applied: false},
    invoice_paid: 'UNKNOWN', queue_state: 'NOT_QUERIED',
    note: 'This artifact neither verifies payment nor creates or advances a queue job. Use the existing trusted transactional order adapter and version-bound approvals.',
  };
}
