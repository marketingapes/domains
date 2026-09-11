#!/usr/bin/env node
// tools/scan-secrets.mjs — regression scanner: no hook/webhook URL, bare hook token, or key-like material in the tracked tree.
//
//   node tools/scan-secrets.mjs            # exit 1 and list offenders if anything matches
//
// Scans every file `git ls-files` reports plus untracked-but-not-ignored files (the CURRENT tree, not history). Binary assets are skipped.
// Two layers:
//   1. shape patterns — full hook URLs, bare hook-path fragments, key formats. Bare Make-style tokens are matched as a
//      32-char lowercase alphanumeric word that is NOT pure hex (hashes, commit ids and UUID parts are hex-only) and is
//      not immediately preceded by "commit"/"blob"/"sha" context, so arbitrary ids are not blindly flagged.
//   2. a denylist of SHA-256 digests of the exact hook tokens that were exposed in this repository's history.
//      Any word whose digest is in the list is flagged wherever it appears. The tokens themselves are never stored.
// Patterns are built from fragments so this file never matches itself.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ZAP = ['hooks', 'zapier', 'com'].join('\\.') + '/hooks/catch/';
const MAKE = 'hook\\.[a-z0-9-]+\\.' + ['make', 'com'].join('\\.') + '/[A-Za-z0-9]{8,}';
const SLACK = ['hooks', 'slack', 'com'].join('\\.') + '/services/';
export const PATTERNS = [
  { name: 'zapier_catch_hook_url', re: new RegExp(ZAP) },
  { name: 'zapier_catch_path_fragment', re: /(^|[^A-Za-z0-9])hooks\/catch\/[0-9]{5,}\/[a-z0-9]{6,8}(\/|\b)/ },
  { name: 'make_hook_url', re: new RegExp(MAKE, 'i') },
  { name: 'slack_incoming_webhook_url', re: new RegExp(SLACK) },
  { name: 'openai_style_key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'aws_access_key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'google_api_key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'slack_token', re: /\bxox[abpr]-[A-Za-z0-9-]{10,}/ },
  { name: 'private_key_block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'bearer_token_literal', re: /\bBearer\s+[A-Za-z0-9._-]{24,}/ }
];
// SHA-256 digests of hook tokens known to have been exposed in this repository's git history.
export const KNOWN_TOKEN_HASHES = new Set(["1ab381565cf95fa0ffc574fce4a2a038a5b321752911e6c6742e46962121013a", "9e63ea5793903d5ae50675ca051bcd1e38737f5b3b7fd3b9821053291ab05b21", "abb481c797b213b2a2b355e16a439d8478df6753112634f577c3cd48267c6e7c", "d551c204aae5e74d3f7e216cb3b7bc5f8c0ad8af760758cd1d6cb0708ab8986e", "dd5d918eea43d4a83ed4294a21cb58d5431f26fb2711932eb064944466b5154f", "f10e8c9635a33e7f5e29188ff02edbcf871c2d391ab0fb8ba43e3f809d65add4"]);
const SKIP = /\.(png|jpe?g|webp|gif|ico|b64|pdf|woff2?|ttf|otf|mp4|mp3|zip)$/i;
const WORD = /[A-Za-z0-9]{6,64}/g;
const BARE_MAKE = /(^|[^A-Za-z0-9_.-])([a-z0-9]{32})(?![A-Za-z0-9_])/g;
const HEX_ONLY = /^[0-9a-f]+$/;
const HASH_CONTEXT = /(commit|blob|sha|digest|hash|tree|object|id)\W{0,4}$/i;

export function scanText(text, { hashes = KNOWN_TOKEN_HASHES } = {}) {
  const hits = [];
  for (const p of PATTERNS) { const m = text.match(p.re); if (m) hits.push({ pattern: p.name, sample: mask(m[0]) }); }
  for (const m of text.matchAll(BARE_MAKE)) {
    const tok = m[2];
    if (HEX_ONLY.test(tok)) continue;                                    // md5/sha/uuid material is hex-only
    if (HASH_CONTEXT.test(text.slice(Math.max(0, m.index - 24), m.index))) continue;
    hits.push({ pattern: 'bare_make_style_hook_token', sample: mask(tok) });
  }
  for (const m of text.matchAll(WORD)) {
    if (hashes.has(crypto.createHash('sha256').update(m[0]).digest('hex'))) hits.push({ pattern: 'known_exposed_hook_token', sample: mask(m[0]) });
  }
  return hits;
}
function mask(s) { return s.length <= 6 ? '***' : s.slice(0, 3) + '…' + s.slice(-2) + ` (${s.length})`; }

export function scan(root = ROOT) {
  const files = [...new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root }).toString().split('\0').filter(Boolean))];
  const hits = [];
  for (const f of files) {
    if (SKIP.test(f)) continue;
    const abs = path.join(root, f);
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
    for (const h of scanText(fs.readFileSync(abs, 'utf8'))) hits.push({ file: f, ...h });
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
  console.log(`SECRET SCAN: clean (${r.files} tracked files, ${PATTERNS.length} shape patterns + bare-token heuristic + ${KNOWN_TOKEN_HASHES.size} known-token digests)`);
}
