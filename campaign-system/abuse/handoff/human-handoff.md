# Human handoff — LA County abuse (DRAFT)

| Step | Owner | Evidence written |
|---|---|---|
| Lead saved (form, quiz or callback request) | adapter | `lead.saved` event, consent record id |
| Human review | Phillips intake reviewer | `human_review.recorded` with `review_request_id` (decisions: attorney_review_requested, needs_more_information, outside_program_scope, duplicate, contact_declined, no_response) |
| Callback (only after dispatch is approved and enabled) | Sofia / intake | `call.bound`, then context read with fresh suppression |
| Transfer to a person | complex-tort desk (number and staffed hours UNCONFIRMED) | transfer receipt — not available yet |
| Failed handoff | intake-operations; backup Marketing Apes ops | `internal-failed-handoff` alert (no contact details), follow-up within one business day |
| Opt-out at any point | whoever receives it | `lead.suppressed` + shared registry write, confirmed before success |

Never use the MVA desk for abuse. Never record "qualified", "signed" or "retained" from this flow; those are firm
records from the firm's own systems. Simulated leads are labelled and excluded from every count.
