# Foundation v1.2 — repo truth

`marketingapes.domain.foundation/v1.2`, adopted 2026-09-10 from the frozen review
package (Drive folder `16opLCLZQt_jCzroVDqPL5KwL2ZBILIKv`).

| File | Role |
|---|---|
| `portfolio.json` | the canonical 14 tenants. A closed set, not a count. |
| `<tenant>/domain.json` | one deterministic foundation manifest per tenant |
| `domain.schema.json` | draft-07, `additionalProperties:false` throughout |
| `validate.py` | the frozen validator — **never edit** |
| `foundation.sha256` | frozen hashes; drift is a build failure |
| `tools/verify-foundation.py` | stages the repo layout and runs the frozen validator |

## Verify

```sh
python3 tools/verify-foundation.py     # exit 0 = intact
```

The frozen validator globs `domains/*.json` relative to its own directory; this repo
stores `<tenant>/domain.json`. The wrapper stages a throwaway copy in the layout the
validator expects and runs it unmodified. **If the layouts ever diverge again, change
the wrapper — not the validator.**

## Rules this encodes

- `campaigns = []`. A campaign attaches TO a domain. A campaign never IS the domain.
  Campaign-shaped keys (`campaign_id`, `campaign_studio`, `lead_lane`, `buyer`,
  `budget`, `routing`, …) are rejected structurally, recursively.
- `connection_status` is separate from `activation_state`. A capability that is not
  connected cannot be ON.
- **UNKNOWN DOES NOT MEAN BORROW.** Shared infrastructure is allowed but must always
  carry `tenant_id`/`domain_id`, and every share must be claimed from both ends.
- No secret material in a manifest — no API keys, tokens, passwords, private keys, or
  webhook URLs. Webhooks are recorded as **hook IDs only**; a hook URL is an
  unauthenticated endpoint and is treated as a secret.
- LEE is excluded from the portfolio. Its site folder stays; it simply is not a tenant.

## Known conflict — read before running `campaign-system/build.mjs`

`campaign-system/build.mjs` line 20 **writes** a `campaign_studio` object into
`<brand>/domain.json` for lfma, btl, nil, dihac, ma, kg, lee. Under v1.2 that key is
invalid by shape. Running that script as-is will invalidate 6 of the 14 adopted
manifests and fail `tools/verify-foundation.py` three ways over (hash drift, forbidden
key, schema). It is **left untouched by this adoption** — the fix is a separate,
reviewed change. See the adoption PR description.
