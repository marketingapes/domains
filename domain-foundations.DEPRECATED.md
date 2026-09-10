# `domain-foundations.json` — DEPRECATED

**Superseded by Foundation v1.2 (2026-09-10).** Do not read this file as truth.

| Question | Read instead |
|---|---|
| Which tenants exist? | `portfolio.json` — the canonical 14 |
| What does tenant X own? | `<tenant>/domain.json` — the v1.2 foundation manifest |
| What shape must a manifest be? | `domain.schema.json` |
| Is the foundation intact? | `python3 tools/verify-foundation.py` |

## Why it is still here

`domain-foundations.json` is an 8-record preview-era list (`slug`, `brand`, `domain`,
`service`, `publishPath`, `status`, `customDomain`). It covers 8 of the 14 tenants and
carries no capability, ownership, or activation state. Against v1.2 it is not wrong so
much as *thin* — and a thin file that looks authoritative is exactly how a second truth
survives.

A repo-wide search found **zero code consumers** of this file: nothing imports, reads,
or parses it. It is left byte-identical anyway, because "no consumer in this repo" is
not the same as "no consumer" — Make scenarios, Render config, and other AI sessions
read this repo from outside, and deletion is not reversible from their side.

## Proposed next step (needs Kyle's approval — not taken here)

Delete the file, or replace its contents with a pointer object. Either is safe *if*
nothing outside the repo reads it. That is the part this repo cannot prove on its own.
Until then this notice carries the deprecation and `portfolio.json` carries the truth.
