#!/usr/bin/env node
/** Native HTML UX refinement of the current LFMA form. No new runtime JS.
 * Dry run: node tools/apply-lfma-usability.mjs <repo-root>
 * Apply: add --apply after reviewing the current page and installing PR #4 polish.
 */
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const UX_LINK = '<link rel="stylesheet" href="/assets/campaign-usability-v1.css" data-lfma-usability="v1">';
const MARKER = 'data-lfma-ux="v1"';
function once(text, oldValue, newValue) {
  if (text.split(oldValue).length !== 2) throw Error('Page structure changed; review rather than force a patch.');
  return text.replace(oldValue, newValue);
}
function scriptBytes(html) { return html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || []; }
export function improveUsability(html) {
  if (typeof html !== 'string') throw Error('Expected HTML text.');
  if (html.includes('data-lfma-ux=')) {
    if (html.split(MARKER).length !== 2 || html.split(UX_LINK).length !== 2 ||
        !html.includes('class="lfma-process"') || !html.includes('class="lfma-form-group"')) {
      throw Error('A partial or different UX version exists; reconcile it first.');
    }
    return html;
  }
  if (!html.includes('data-lfma-polish="v1"') || !html.includes('id="sent" hidden')) {
    throw Error('Apply the reviewed PR #4 presentation layer to the receipt-fixed page first.');
  }
  if (html.includes('<fieldset') || html.includes('lfma-process') || html.includes('class="brief-entry"')) {
    throw Error('The form has already been reorganized; reconcile with the current editor.');
  }
  const beforeScripts = scriptBytes(html);
  // Move the unchanged explanation after the form/receipt. Native details needs no script.
  const process = html.match(/  <div class="flow">[\s\S]*?\n  <\/div>\s*\n\s*(?=<form id="briefForm">)/);
  if (!process || (process[0].match(/class="fstep"/g) || []).length !== 6) {
    throw Error('Expected the reviewed six-step explanation before the form.');
  }
  let out = once(html, process[0], '  ');
  out = once(out, '  <footer>', '  <details class="lfma-process">\n    <summary>What happens after you send the brief</summary>\n' + process[0].trimEnd() + '\n  </details>\n\n  <footer>');
  out = once(out, '<body>', '<body ' + MARKER + '>');
  out = once(out, '</head>', UX_LINK + '\n</head>');
  out = once(out, '<span class="step-of">Step 1 of 3</span>', '<span class="step-of">Campaign brief</span>');
  out = once(out, '<form id="briefForm">', '<p class="brief-entry"><a href="#briefForm">Start your campaign brief <span aria-hidden="true">&rarr;</span></a><span>No payment on this page.</span></p>\n\n  <form id="briefForm" aria-label="Campaign brief" tabindex="-1">');
  out = once(out, "<h2>Who's asking</h2>", '<fieldset class="lfma-form-group"><legend>01 / Your firm</legend>');
  out = once(out, '<h2>The campaign</h2>', '</fieldset>\n\n    <fieldset class="lfma-form-group"><legend>02 / Your campaign</legend>');
  out = once(out, '<h2>How leads reach you</h2>', '</fieldset>\n\n    <fieldset class="lfma-form-group"><legend>03 / Lead delivery</legend>');
  const moneyIndex = out.indexOf('    <div class="money">');
  if (moneyIndex < 0 || moneyIndex > out.indexOf('</form>')) throw Error('Expected the money notice inside the form.');
  out = out.slice(0, moneyIndex) + '    </fieldset>\n\n' + out.slice(moneyIndex);
  out = once(out, 'id="firm" name="firm" required', 'id="firm" name="firm" autocomplete="organization" required');
  out = once(out, 'id="name" name="name" required', 'id="name" name="name" autocomplete="name" required');
  out = once(out, 'id="email" name="email" required', 'id="email" name="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" required');
  out = once(out, 'type="text" id="line" name="line"', 'type="tel" id="line" name="line" inputmode="tel" autocomplete="off"');
  // Attach existing help text without rewriting its business meaning.
  for (const id of ['tort', 'no', 'budget', 'hours']) {
    const pattern = new RegExp('<span class="hint">([^<]*)<\\/span>(\\s*<(?:input|select|textarea)\\b[^>]*\\bid="' + id + '")');
    if (!pattern.test(out)) throw Error('Expected help text for ' + id + '; inspect before applying.');
    out = out.replace(pattern, '<span class="hint" id="help-' + id + '">$1</span>$2 aria-describedby="help-' + id + '"');
  }
  if (JSON.stringify(scriptBytes(out)) !== JSON.stringify(beforeScripts)) throw Error('Refusing any script change.');
  if ((out.match(/<form\b/g) || []).length !== 1 || (out.match(/<fieldset\b/g) || []).length !== 3) throw Error('Unexpected form grouping.');
  return out;
}
async function main() {
  const args = process.argv.slice(2);
  if (!args[0] || args.length > 2 || (args[1] && args[1] !== '--apply')) throw Error('Usage: node tools/apply-lfma-usability.mjs <repo-root> [--apply]');
  const root = resolve(args[0]);
  const page = resolve(root, 'lfma/campaign/index.html');
  await readFile(resolve(root, 'lfma/assets/campaign-usability-v1.css'), 'utf8');
  const before = await readFile(page, 'utf8');
  const after = improveUsability(before);
  if (after === before) { console.log('Already applied; no changes.'); return; }
  console.log('Native groups, mobile keyboards, jump-to-form CTA and collapsed process; existing scripts unchanged.');
  if (!args.includes('--apply')) { console.log('DRY RUN. Review the current page, then use --apply. No commit or deploy performed.'); return; }
  if (await readFile(page, 'utf8') !== before) throw Error('File changed during application; reconcile with the current editor.');
  await writeFile(page, after, 'utf8');
  console.log('Applied locally. Review the diff, browser-test, then commit separately.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => {console.error(e.message); process.exitCode = 1;});
