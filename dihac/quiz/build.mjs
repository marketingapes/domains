#!/usr/bin/env node
// DIHAC quiz build: inject schema.json + engine.js into index.html, validate, and
// (with --mirror) regenerate the shared markdown mirror outside the repo.
//
//   node dihac/quiz/build.mjs            # inject + validate
//   node dihac/quiz/build.mjs --check    # exit 1 if index.html is out of date
//   node dihac/quiz/build.mjs --mirror   # also write $QUIZ_SCHEMA_MD (default ~/workspace/legal-lane/dihac-network/quiz-schema.md)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const PAGE = path.join(DIR, 'index.html');
const SCHEMA = path.join(DIR, 'schema.json');
const ENGINE = path.join(DIR, 'engine.js');
const MIRROR = process.env.QUIZ_SCHEMA_MD || path.join(os.homedir(), 'workspace/legal-lane/dihac-network/quiz-schema.md');
const args = new Set(process.argv.slice(2));

const schemaText = fs.readFileSync(SCHEMA, 'utf8');
const schema = JSON.parse(schemaText);
const engineSrc = fs.readFileSync(ENGINE, 'utf8').replace(/\n$/, '');

// Validate with the real engine before touching anything.
const sandbox = { window: {}, URL, URLSearchParams };
vm.runInNewContext(engineSrc, sandbox);
const engine = sandbox.window.DIHAC_QUIZ_ENGINE.createEngine(schema);
const errors = engine.validate();
if (errors.length) { console.error('SCHEMA INVALID:\n  ' + errors.join('\n  ')); process.exit(1); }

const html = fs.readFileSync(PAGE, 'utf8');
const SCHEMA_RE = /(<script type="application\/json" id="quiz-schema">\n)([\s\S]*?)(\n  <\/script>)/;
const ENGINE_RE = /(<script id="quiz-engine">\n)([\s\S]*?)(\n  <\/script>)/;
if (!SCHEMA_RE.test(html) || !ENGINE_RE.test(html)) { console.error('markers missing in index.html'); process.exit(1); }
const next = html
  .replace(SCHEMA_RE, (_, a, __, c) => a + JSON.stringify(schema, null, 2) + c)
  .replace(ENGINE_RE, (_, a, __, c) => a + engineSrc + c);

if (args.has('--check')) {
  if (next !== html) { console.error('index.html is out of date: run node dihac/quiz/build.mjs'); process.exit(1); }
  console.log('quiz build: up to date');
} else if (next !== html) {
  fs.writeFileSync(PAGE, next);
  console.log('quiz build: index.html updated');
} else {
  console.log('quiz build: no change');
}

function mirrorMarkdown() {
  const rows = Object.entries(schema.routes).map(([k, r]) =>
    `| ${k} | ${r.tenant_id} | ${r.tort ?? '—'} | ${r.status || 'live'} | ${r.url} |`).join('\n');
  const trackRows = engine.tracks().map(t => {
    const first = engine.start(t);
    const n = engine.remaining(first) + 1;
    return `| ${t} | \`${first}\` | ${n} | \`/quiz/?tort=${t}\` |`;
  }).join('\n');
  return `# DIHAC quiz schema — shared contract (derived)

**STATUS: DERIVED.** First written by Claude Code on 2026-09-25 because the Muse \`quiz-schema.md\` named in the packet did not exist on the Mac, in Drive, or in mail (defect \`BOOTSTRAP_DOC_MISSING\`). Since then this file is the shared contract the engine is built against. It is **generated**: the machine copy is \`marketingapes/domains\` → \`dihac/quiz/schema.json\`; \`node dihac/quiz/build.mjs --mirror\` rewrites this file. Edit \`schema.json\`, not this document. Version \`${schema.version}\`.

Source of question wording: \`library/*.md\` (research date 2026-09-24). Copy rule from \`library/README.md\`: a matching answer means a person may **potentially qualify** for a lawyer to review. Never "you have a claim".

## Files

| file | role |
| --- | --- |
| \`dihac/quiz/schema.json\` | the schema (this document mirrors it) |
| \`dihac/quiz/engine.js\` | pure router: \`createEngine(schema)\` → \`start, apply, walk, describe, destination, remaining, tracks, validate\` |
| \`dihac/quiz/build.mjs\` | injects both into \`index.html\`; \`--check\` for CI; \`--mirror\` regenerates this file |
| \`dihac/quiz/index.html\` | the page: UI only, reads the injected blocks |
| \`tests/dihac-quiz.test.mjs\` | walks every track and stop reason; asserts page == sources |

## Shape

\`\`\`
schema            string
tenant_id         "DIHAC"  every event and outbound link carries it
domain_id         "doihaveaclaim.ai"
quiz_id           string   goes out as quiz_id=… on cross-domain links
version           string   goes out as quiz_version=…
entry             step id  first step when no ?tort= deep link
attribution_passthrough  [keys]  copied from the inbound URL to the outbound firm URL
outbound_utm      {utm_source, utm_medium, utm_campaign}  utm_content = result
outcomes          {result_key: {title, body, note}}  result screen copy; note may use {{destination_host}}
routes            {route_key: {tenant_id, tort, url, cta, status?, intent?}}
                  cross-tenant → tort + utm + quiz_id + quiz_version + session_id + passthrough
                  same-tenant  → from=quiz_id + result + tort + intent + utm_campaign + utm_content
                  status: "live" (a firm page exists) | "needs_buyer" (Sofia holds it)
stop_reasons      {key: sentence}  shown on no_match / closed
steps[]           {id, track, prompt, help, choices[]}
choices[]         {id, label} + exactly one of:  next: step_id   |   result: outcome_key, route: route_key, stop_reason?: key
                  optional track: sets the track ("paraquat" | "afff" | …)
\`\`\`

Rules \`engine.validate()\` enforces: every \`next\` resolves, every \`result\` has an outcome and a route, every \`stop_reason\` exists, the graph is a DAG (progress is the longest remaining path), routes carry tenant_id/url/cta and a known status. \`?tort=<track>\` starts at the first step whose \`track\` matches.

## Tracks

| track | first step | longest path (questions) | deep link |
| --- | --- | --- | --- |
${trackRows}

## Routes

| route | tenant | tort | status | destination |
| --- | --- | --- | --- | --- |
${rows}

## Privacy

Answers are held in page memory only. No form, no webhook, no storage of answers. dataLayer events carry step ids, track and outcome codes, never individual answers. The result screen's recap is rendered on-page from the schema labels and is never transmitted.

## Implemented JSON (mirror of \`schema.json\`, ${schema.version})

\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`
`;
}

if (args.has('--mirror')) {
  fs.mkdirSync(path.dirname(MIRROR), { recursive: true });
  fs.writeFileSync(MIRROR, mirrorMarkdown());
  console.log('quiz build: mirror written to ' + MIRROR);
}
