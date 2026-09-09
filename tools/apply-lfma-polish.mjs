#!/usr/bin/env node
/** Add one stylesheet to the CURRENT page; never replace its form or scripts.
 *  Dry-run: node tools/apply-lfma-polish.mjs <repo-root>
 *  Apply:   node tools/apply-lfma-polish.mjs <repo-root> --apply
 */
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const LINK = '<link rel="stylesheet" href="/assets/campaign-polish-v1.css" data-lfma-polish="v1">';
export function addPolish(html) {
  if (typeof html !== 'string' || !html.includes('id="briefForm"') || !html.includes('id="sent"')) throw Error('Unexpected page structure; review rather than overwrite.');
  if (html.includes('data-lfma-polish=')) {
    if (html.split(LINK).length === 2) return html;
    throw Error('A different or duplicate polish layer is present; reconcile manually.');
  }
  if ((html.match(/<\/head>/gi) || []).length !== 1) throw Error('Expected exactly one head closing tag.');
  return html.replace(/<\/head>/i, LINK + '\n</head>');
}
async function main() {
  const args = process.argv.slice(2);
  if (!args[0] || args.some((v,i) => i > 0 && v !== '--apply') || args.length > 2) throw Error('Usage: node tools/apply-lfma-polish.mjs <repo-root> [--apply]');
  const root = resolve(args[0]);
  const page = resolve(root, 'lfma/campaign/index.html');
  await readFile(resolve(root, 'lfma/assets/campaign-polish-v1.css'), 'utf8');
  const original = await readFile(page, 'utf8');
  const proposed = addPolish(original);
  if (proposed === original) {console.log('Already applied; no changes.'); return;}
  console.log('Change: one stylesheet link only. Form, scripts, price, webhook and tracking untouched.');
  if (!args.includes('--apply')) {console.log('DRY RUN. Review, then rerun with --apply.'); return;}
  // Detect changes during review; do not overwrite an agent's newer file.
  if (await readFile(page, 'utf8') !== original) throw Error('Page changed during application; retry after review.');
  await writeFile(page, proposed, 'utf8');
  console.log('Applied locally. Commit and deploy are separate actions. Rollback: remove the one data-lfma-polish link.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => {console.error(e.message); process.exitCode = 1;});
