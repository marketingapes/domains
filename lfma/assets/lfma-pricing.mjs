/**
 * LFMA commercial pricing. Pure, deterministic, no I/O.
 *
 * Money is integer CENTS everywhere. No floats, no rounding at the edges.
 *
 * House rules this file enforces (CURRENT-BRIEF.md):
 *  - MEDIA-FUND is a liability, never income, so every line carries a
 *    `category` of 'fee' or 'media' and the two totals never merge.
 *  - "No discount line." Sofia included on a first campaign is emitted at
 *    amountCents 0 with `included: true` — never as a negative adjustment.
 *
 * This module prices. It does not invoice, charge, or authorize anything.
 */
export const PRICING_VERSION = 'lfma-pricing-v1';

export class PricingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PricingError';
    this.code = code;
  }
}

/** Per-campaign Sofia fee when it is not the firm's first campaign. */
export const SOFIA_CENTS = 250000;

/** Hard ceiling so a typo cannot produce a six-figure quote. */
export const MAX_MARKETS = 25;

export const PRODUCTS = Object.freeze({
  tort: Object.freeze({
    id: 'tort',
    label: 'Mass tort campaign',
    unit: 'campaign',
    unitLabel: 'campaign',
    multiMarket: false,
    serviceCents: 250000,
    mediaCents: 500000
  }),
  mva: Object.freeze({
    id: 'mva',
    label: 'MVA / PI campaign',
    unit: 'market',
    unitLabel: '30-mile ZIP market',
    multiMarket: true,
    serviceCents: 300000,
    mediaCents: 700000
  })
});

export function usd(cents) {
  if (!Number.isSafeInteger(cents)) throw new PricingError('INVALID_AMOUNT', 'Amount must be whole cents.');
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const body = `${Math.floor(abs / 100).toLocaleString('en-US')}.${String(abs % 100).padStart(2, '0')}`;
  return `${negative ? '-' : ''}$${body}`;
}

function line(code, label, qty, unitCents, category, extra = {}) {
  return Object.freeze({
    code,
    label,
    qty,
    unitCents,
    amountCents: unitCents * qty,
    category,
    ...extra
  });
}

/**
 * @param {object} input
 * @param {'tort'|'mva'} input.product
 * @param {number} [input.markets=1]     only meaningful for multi-market products
 * @param {boolean} [input.sofia=true]   include the Sofia AI intake desk
 * @param {boolean} [input.firstCampaign=true] first campaign -> Sofia at no charge
 */
export function priceCampaign(input) {
  if (!input || typeof input !== 'object') throw new PricingError('INVALID_INPUT', 'Expected a pricing request.');
  const { product, markets = 1, sofia = true, firstCampaign = true } = input;

  const spec = Object.hasOwn(PRODUCTS, product) ? PRODUCTS[product] : null;
  if (!spec) throw new PricingError('UNKNOWN_PRODUCT', 'Choose an available campaign type.');
  if (typeof sofia !== 'boolean' || typeof firstCampaign !== 'boolean') {
    throw new PricingError('INVALID_INPUT', 'Sofia options must be true or false.');
  }
  if (!Number.isSafeInteger(markets) || markets < 1) {
    throw new PricingError('INVALID_MARKETS', 'Markets must be a whole number of at least 1.');
  }
  if (markets > MAX_MARKETS) {
    throw new PricingError('TOO_MANY_MARKETS', `Contact us directly for more than ${MAX_MARKETS} markets.`);
  }
  if (!spec.multiMarket && markets !== 1) {
    throw new PricingError('SINGLE_MARKET_PRODUCT', `${spec.label} is priced per campaign, not per market.`);
  }

  const qtyLabel = spec.multiMarket ? `${markets} × ${spec.unitLabel}` : spec.unitLabel;
  const lines = [
    line('LFMA-SERVICE', `${spec.label} — campaign build & management (${qtyLabel})`, markets, spec.serviceCents, 'fee'),
    line('MEDIA-FUND', `Media budget (${qtyLabel})`, markets, spec.mediaCents, 'media', {
      liability: true,
      note: 'Held as a media liability and spent on ad platforms. Not agency income.'
    })
  ];

  if (sofia) {
    const included = firstCampaign;
    lines.push(line(
      'SOFIA-DESK',
      included ? 'Sofia AI intake desk — included on your first campaign' : 'Sofia AI intake desk',
      1,
      included ? 0 : SOFIA_CENTS,
      'fee',
      included
        ? Object.freeze({ included: true, listCents: SOFIA_CENTS, note: 'Included at no charge on a first campaign.' })
        : Object.freeze({ included: false })
    ));
  }

  const sum = (category) => lines
    .filter(l => l.category === category)
    .reduce((total, l) => total + l.amountCents, 0);

  const feesCents = sum('fee');
  const mediaCents = sum('media');
  const totalCents = feesCents + mediaCents;

  return Object.freeze({
    version: PRICING_VERSION,
    product: spec.id,
    productLabel: spec.label,
    markets,
    sofia,
    firstCampaign,
    lines: Object.freeze(lines),
    feesCents,
    mediaCents,
    totalCents,
    fees: usd(feesCents),
    media: usd(mediaCents),
    total: usd(totalCents)
  });
}
