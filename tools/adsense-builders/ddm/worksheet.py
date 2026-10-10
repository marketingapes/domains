"""Printable two-seller checkout and return-policy worksheet (/guides/checkout-comparison/).

Content first published September 20, 2026; restyled into the site design October 10, 2026.
The page keeps exactly one bare <script> worksheet handler besides the shared head tags,
and still contains no affiliate purchase links, collection or network calls.
"""

CHECKOUT_FIELDS = [
    ("item", "Seller, item/model, variant and condition"),
    ("qty", "Quantity / pack size"),
    ("sub", "Item subtotal"),
    ("discount", "Discount actually applied"),
    ("ship", "Shipping"),
    ("tax", "Tax not already included"),
    ("fee", "Other mandatory fees not already included"),
    ("calc", "Your calculated total"),
    ("total", "Final checkout total"),
    ("recurring", "Subscription / renewal amount, frequency and cancellation terms"),
]
RETURN_FIELDS = [
    ("policy", "Policy source and date checked"),
    ("start", "Window starts at order, shipment, delivery or another event?"),
    ("deadline", "Exact request / ship-by / received-by deadlines"),
    ("exclude", "Opened-item, final-sale or other exclusions"),
    ("cost", "Return shipping, restocking and nonrefundable charges"),
    ("refund", "Refund method and stated processing time"),
]

STYLE = """<style>
.ws-head,.ws-body{max-width:900px;margin-left:auto;margin-right:auto}
.ws-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:20px 0 6px}
.ws-body section{padding:28px 0;border-top:1px solid var(--line)}
.ws-body section:first-child{border-top:0}
.formula{padding:16px 18px;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r)}
.ws-body section.worksheet{border:1px solid var(--line);border-radius:var(--r-lg);padding:24px;background:#fff;box-shadow:var(--shadow);margin:8px 0}
.worksheet h2{margin-top:0}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.worksheet fieldset{border:0;padding:0;margin:0;min-width:0}
.worksheet legend{font-size:1rem;font-weight:700;padding:0 0 4px;color:var(--ink)}
.worksheet label{display:block;margin:14px 0 6px;font-size:.875rem;font-weight:500;color:var(--ink-2)}
.worksheet input,.worksheet textarea,.ws-body textarea{display:block;width:100%;min-height:42px;padding:9px 11px;border:1px solid var(--line-2);border-radius:8px;font:inherit;font-size:.95rem;background:#fff;color:var(--ink)}
.ws-body textarea{min-height:76px;resize:vertical}
.worksheet input:focus,.ws-body textarea:focus{outline:2px solid var(--acc);outline-offset:1px;border-color:var(--acc)}
.ws-body label[for=decision]{display:block;font-weight:600;margin:10px 0 6px}
@media(max-width:620px){.pair{grid-template-columns:1fr}.ws-body section.worksheet{padding:18px}}
.print-value{display:none}
@media print{.topbar,.site-head,.site-foot,.ws-actions,.ws-more,.crumbs{display:none!important}body{background:#fff;color:#000}.ws-body section.worksheet{box-shadow:none;border-color:#555;padding:12px}.pair{grid-template-columns:1fr 1fr}.formula{background:#fff;border-color:#555}input[type="text"],textarea{display:none!important}.print-value{display:block;white-space:pre-wrap;overflow-wrap:anywhere;min-height:30px;padding:6px 0;border-bottom:1px solid #777}.worksheet .print-value{margin-bottom:10px}section,fieldset{break-inside:auto}a{color:#000}}
</style>
"""

SCRIPT = """<script>
// Local print formatting only. Values remain in this document and are never sent.
(() => {
  const fields = Array.from(document.querySelectorAll('input[type="text"], textarea'));
  const pairs = fields.map(field => {
    const output = document.createElement('div');
    output.className = 'print-value';
    output.setAttribute('aria-hidden', 'true');
    field.insertAdjacentElement('afterend', output);
    return {field, output};
  });
  window.addEventListener('beforeprint', () => {
    for (const {field, output} of pairs) output.textContent = field.value || '\\u00a0';
  });
})();
</script>
"""


def _fieldset(side, fields):
    rows = "".join(f'<label for="{side}{k}">{label}</label><input id="{side}{k}" type="text" autocomplete="off">' for k, label in fields)
    return f'<fieldset><legend>Seller {side}</legend>{rows}</fieldset>'


def body():
    return f'''<section class="wrap page-head ws-head">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/articles/">Guides</a> <span aria-hidden="true">/</span> <span>Checkout worksheet</span></nav>
<p class="kicker">A worksheet to keep</p>
<h1>Compare the checkout, then the return.</h1>
<p class="lede">A two-seller worksheet for the amount due now, recurring charges and the deadlines that matter if you return an item.</p>
<div class="ws-actions"><button type="button" class="btn" onclick="window.print()">Print this worksheet</button><span class="fine">No affiliate links in this worksheet</span></div>
<p class="fine">Write on a printed copy or type below before printing. Entries stay in this page; nothing is submitted or saved. Closing or reloading may clear them.</p>
</section>
<div class="wrap ws-body prose-wide">
<section><h2>Put both checkouts on the same basis</h2><p>Open the exact variant and quantity you would buy from each seller. Use the same delivery destination and currency. Record the amounts shown at checkout before placing an order. Leave unknown amounts marked &ldquo;unknown&rdquo; instead of treating them as zero.</p><p class="formula"><strong>Amount due now = item subtotal &minus; applied discount + shipping + tax + mandatory fees.</strong> If tax or another charge is already included in a line, do not add it twice. Copy the final checkout total as a separate cross-check.</p><p>Do not subtract an advertised coupon until it is actually applied. Keep gift-card credit, rewards and possible future rebates separate so you can distinguish the order cost from how you pay for it.</p></section>
<section class="worksheet" aria-labelledby="compare-title"><h2 id="compare-title">Two-seller comparison</h2><p>Use one currency throughout. Record the currency and date: ____________________</p><div class="pair">{_fieldset("A", CHECKOUT_FIELDS)}{_fieldset("B", CHECKOUT_FIELDS)}</div></section>
<section><h2>Compare the cost of changing your mind</h2><p>A longer return window is useful only if this item is eligible. Read the policy for the particular seller and product. Distinguish requesting a return from shipping it back or having it received: these may have different deadlines.</p></section>
<section class="worksheet" aria-labelledby="return-title"><h2 id="return-title">Return-policy record</h2><div class="pair">{_fieldset("A", RETURN_FIELDS)}{_fieldset("B", RETURN_FIELDS)}</div></section>
<section><h2>Make the decision you can explain</h2><p>If quantities differ, divide the order total by comparable usable units and write down what each unit means. A cheap item you cannot use or return may not be the better purchase.</p><label for="decision">Which option fits your budget and return needs? What remains unknown?</label><textarea id="decision" rows="2"></textarea><p>Save the seller&rsquo;s product description, applied promotion and return terms with your order confirmation. This worksheet is a record of what you checked, not a seller&rsquo;s promise or a return authorization.</p></section>
<section class="ws-more"><h2>Keep comparing</h2><p><a href="/deal-checklist/">Start with the deal checklist</a> &middot; <a href="/offers/">Browse current offer pages</a> &middot; <a href="/deals/">See live deals</a></p><p class="fine">The offers and live deals pages contain disclosed affiliate links. This worksheet contains no affiliate purchase links.</p></section>
<p class="fine">Prepared September 20, 2026, redesigned October 10, 2026 &middot; AI-assisted editorial guide for Marketing Apes. No product testing, reviews or sponsored recommendations are represented here.</p>
</div>'''
