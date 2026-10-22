# Isolated reviewer correction — local only

Baseline: Claude commit 4a31b0194218af77236c4fa299333d531d38d8e5.
Reviewer branch: reviewer/btl-payment-queue-20261022. This is a separate clone; Claude's checkout is untouched. No remote push, merge, deployment or provider action.

The original module accepted caller-declared payment authority, allowed queue reuse across tenant/campaign/specification boundaries, overwrote competing completion receipts and accepted caller booleans as launch proof.

Corrections:
- A record-shaped object cannot verify payment. The legacy verifyPayment helper now fails closed.
- createPaymentAuthority defaults to disconnected fixture mode. A trusted server composition root must explicitly install an authenticated settlement reader. Never expose reader/mode configuration through request JSON. No such connector is installed here.
- The reader must return a settled, exact tenant/firm/campaign/order/invoice/reference/amount/currency match and fresh ordered timestamps. Fixture mode only issues marked fixture capabilities. Capabilities use object identity and expire; copies, foreign authorities and deserialized JSON fail closed.
- Orders/invoices are deeply immutable. Invoice IDs and queue keys separate fixture/connected execution and include the full order and versioned campaign specification. Changing a campaign invalidates old payment capability scope.
- Atomic setNx creates queue jobs and write-once completion receipts. Equal retries are duplicates; conflicting completion evidence is rejected. Partial enqueue failures resume without duplication. Store reads/writes clone values.
- Readiness remains blocked because this module has no authenticated launch-evidence reader. Completed local builds and booleans never authorize activation.

The store adapter must provide durable atomic setNx before production use. This memory store is a fixture, not a durable queue or worker. Completion records indicate local build evidence, not a provider effect. There is no invoice webhook, authenticated payment connector, worker lease/executor or live activation path in this module. Capabilities are process-local and require re-verification after restart. Do not treat a callback that merely echoes input as an authoritative settlement reader.

Validation: node --test campaign-system/test/abuse-campaign.test.mjs tests/phillips-5-lane.test.mjs (22 pass); node --test campaign-system/test/*.test.mjs (43 pass). Tests use fictional evidence only. No real payment was verified.

Creative copy review: the form ad now uses neutral informational wording rather than asserting the viewer experienced abuse or making an unsourced claim about a change in California law. The offer, destination, existing photos and legal review requirement are unchanged. This is draft copy, not ad-policy approval.
