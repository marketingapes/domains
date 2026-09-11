#!/usr/bin/env node
// tools/scan-secrets.mjs — regression scanner: no hook/webhook URL or key-like material in the tracked tree.
//
//   node tools/scan-secrets.mjs            # exit 1 and list offenders if anything matches
//
// Scans every file `git ls-files` reports (the CURRENT tracked tree, not history). Binary assets are skipped.
// Patterns are built from fragments so this file never matches itself.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ZAP = ['hooks', 'zapier', 'com'].join('\\.') + '/hooks/catch/';
const MAKE = 'hook\\.[a-z0-9-]+\\.' + ['make', 'com'].join('\\.') + '/[A-Za-z0-9]{8,}';
const SLACK = ['hooks', 'slack', 'com'].join('\\.') + '/services/';
export const PATTERNS = [
  { name: 'zapier_catch_hook_url', re: new RegExp(ZAP) },
  { name: 'make_hook_url', re: new RegExp(MAKE, 'i') },
  { name: 'slack_incoming_webhook_url', re: new RegExp(SLACK) },
  { name: 'openai_style_key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'aws_access_key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'google_api_key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'slack_token', re: /\bxox[abpr]-[A-Za-z0-9-]{10,}/ },
  { name: 'private_key_block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'bearer_token_literal', re: /\bBearer\s+[A-Za-z0-9._-]{24,}/ }
];
const SKIP = /\.(png|jpe?g|webp|gif|ico|b64|pdf|woff2?|ttf|otf|mp4|mp3|zip)$/i;

export function scan(root = ROOT) {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
  const hits = [];
  for (const f of files) {
    if (SKIP.test(f)) continue;
    const abs = path.join(root, f);
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
    const text = fs.readFileSync(abs, 'utf8');
    for (const p of PATTERNS) {
      const m = text.match(p.re);
      if (m) hits.push({ file: f, pattern: p.name, sample: m[0].slice(0, 24) + (m[0].length > 24 ? '…' : '') });
    }
  }
  return { files: files.length, hits };
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const r = scan();
  if (r.hits.length) {
    console.error(`SECRET SCAN: ${r.hits.length} hit(s) in ${r.files} tracked files`);
    for (const h of r.hits) console.error(`  ${h.file}  [${h.pattern}]  ${h.sample}`);
    process.exit(1);
  }
  console.log(`SECRET SCAN: clean (${r.files} tracked files, ${PATTERNS.length} patterns)`);
}
