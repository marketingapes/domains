#!/usr/bin/env node
/** Finish the EXISTING brief's mobile UX. No new submission handler or endpoint.
 * Dry-run by default. Apply to a clean review worktree, never an active editor's checkout.
 * Requires the presentation assets from PR #4. Existing scripts and values are preserved.
 */
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addPolish } from './apply-lfma-polish.mjs';
export const MARKER = 'data-lfma-mobile-ux="v1"';
export const STYLE = `<style ${MARKER}>
body:has(#briefForm) .campaign-intro, body:has(#briefForm) .campaign-main {min-width:0;}
body:has(#briefForm) .campaign-main {margin-top:24px;}
body:has(#briefForm) .campaign-intro h1 {max-width:14ch;}
body:has(#briefForm) .intro-actions {display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:24px 0 18px;}
body:has(#briefForm) .intro-start {display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 20px;border:1px solid #8fc0ff;border-radius:12px;background:#9ccaff;color:#09213e;text-decoration:none;font:700 15px/1.5 system-ui,sans-serif;}
body:has(#briefForm) .intro-note {color:#c5d7ed;font-size:13px;line-height:1.6;max-width:30ch;}
body:has(#briefForm) .campaign-process {border:1px solid #465f7f;border-radius:12px;padding:0 16px;margin-top:16px;}
body:has(#briefForm) .campaign-process summary {min-height:48px;padding:13px 0;color:#dfebfc;cursor:pointer;font:600 14px/1.6 system-ui,sans-serif;}
body:has(#briefForm) .campaign-process .flow {margin:0 0 12px;display:block;}
body:has(#briefForm) #briefForm {display:block;}
body:has(#briefForm) #briefForm .brief-section {display:grid;grid-template-columns:1fr;gap:0 18px;min-width:0;margin:0 0 26px;padding:0 0 10px;border:0;border-bottom:1px solid #d5e0ed;}
body:has(#briefForm) #briefForm .brief-section legend {float:none;width:100%;margin:0 0 20px;padding:0;color:#17324f;font:700 17px/1.6 system-ui,sans-serif;}
body:has(#briefForm) .section-number {display:inline-flex;justify-content:center;align-items:center;width:32px;height:32px;margin-right:10px;background:#e6eefb;color:#174d9b;border-radius:9px;font:700 12px/1.5 system-ui,sans-serif;}
body:has(#briefForm) #briefForm .brief-section > * {min-width:0;grid-column:1/-1;}
body:has(#briefForm) #briefForm label, body:has(#briefForm) .opt-h {line-height:1.55;}
body:has(#briefForm) #briefForm input {scroll-margin-top:24px;}
body:has(#briefForm) .campaign-intro a:focus-visible, body:has(#briefForm) summary:focus-visible {outline:3px solid #b1d6ff;outline-offset:4px;}
body:has(#briefForm) .campaign-main:focus {outline:3px solid #9ccaff;outline-offset:8px;}
body:has(#briefForm) .campaign-skip {position:absolute;left:16px;top:0;transform:translateY(-130%);z-index:10;min-height:48px;padding:12px 18px;background:#fff;color:#142237;border:2px solid #185bce;border-radius:10px;font:600 16px/1.5 system-ui,sans-serif;}
body:has(#briefForm) .campaign-skip:focus {transform:none;}
body:has(#briefForm) .hint {font-family:inherit;}
body:has(#briefForm) .opt-d, body:has(#briefForm) .money p {font-size:14px;}
body:has(#briefForm) .field .hint, body:has(#briefForm) .after {font-size:13px;}
body:has(#briefForm) [hidden] {display:none!important;}
@media(min-width:700px){body:has(#briefForm) #briefForm .brief-section:first-of-type {grid-template-columns:1fr 1fr;}body:has(#briefForm) #briefForm .brief-section:first-of-type > .field:has(#name),body:has(#briefForm) #briefForm .brief-section:first-of-type > .field:has(#email){grid-column:auto;}}
@media(min-width:1100px){body:has(#briefForm) .wrap {grid-template-rows:auto 1fr auto;}body:has(#briefForm) .campaign-intro {grid-column:1;grid-row:2;}body:has(#briefForm) .campaign-main {grid-column:2;grid-row:2;margin-top:0;}body:has(#briefForm) footer{grid-row:3;}}
@media(max-width:560px){body:has(#briefForm) .topbar{padding:18px 0;margin-bottom:22px;}body:has(#briefForm) .campaign-intro h1{font-size:clamp(32px,9vw,40px);margin-bottom:14px;}body:has(#briefForm) .intro-actions{margin:18px 0 12px;}body:has(#briefForm) .intro-note{max-width:none;width:100%;}body:has(#briefForm) .campaign-main{margin-top:20px;}body:has(#briefForm) #briefForm,body:has(#briefForm) #sent{padding:22px 18px;}body:has(#briefForm) .campaign-process{margin-top:14px;}}
</style>`;
function one(s, before, after) {
  if (s.split(before).length !== 2) throw Error('Structure changed: ' + before.slice(0,70) + '. Review; do not force the patch.');
  return s.replace(before, after);
}
function scripts(s) { return s.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || []; }
function controls(s) {
  return [...s.matchAll(/<(?:input|select|textarea|button)\b[^>]*>/gi)].map(m => {
    const tag=m[0];
    return ['name','value'].map(a => (tag.match(new RegExp('\\b'+a+'="([^"]*)"'))||[])[1]||'').concat(/\brequired(?:\s|>)/.test(tag),/\bchecked(?:\s|>)/.test(tag)).join('|');
  });
}
export function addMobileUx(input) {
  if (typeof input !== 'string') throw Error('Expected HTML.');
  if (input.includes(MARKER)) {
    if (input.split(MARKER).length === 2 && input.includes('class="campaign-main"') && (input.match(/class="brief-section"/g)||[]).length === 3) return input;
    throw Error('Partial or duplicated mobile patch; reconcile manually.');
  }
  if (/<main\b|<fieldset\b|data-lfma-mobile-ux=/i.test(input)) throw Error('Page already has semantic layout changes; review instead of overwriting.');
  for(const tag of ['form','footer','h1']) if((input.match(new RegExp('<'+tag+'(?:\\s|>)','g'))||[]).length!==1) throw Error('Expected one '+tag+' element.');
  const oldScripts=scripts(input), oldControls=controls(input);
  let s=addPolish(input);
  s=one(s,'<span class="step-of">Step 1 of 3</span>','<span class="step-of">Campaign brief</span>');
  const first=s.indexOf('  <h1>'), end=s.indexOf('  <form id="briefForm">');
  if(first<0||end<first) throw Error('Expected introduction before the brief.');
  const intro=s.slice(first,end), flow=/<div class="flow">[\s\S]*<\/div>\s*$/.exec(intro);
  if(!flow || (intro.match(/<h1>/g)||[]).length!==1 || (intro.match(/class="flow"/g)||[]).length!==1) throw Error('Introduction changed; review.');
  const introHead=one(intro.slice(0,flow.index),'<h1>Tell us the campaign you need.</h1>','<h1 id="campaign-title">Build your next campaign.</h1>');
  const compact=introHead.replace(/<p class="lede">[\s\S]*?<\/p>/,'<p class="lede">A focused two-week campaign, built around your firm. Tell us your case type, market and intake preferences.</p>');
  const newIntro='<section class="campaign-intro" aria-labelledby="campaign-title">\n'+compact+
    '<div class="intro-actions"><a class="intro-start" href="#firm">Start your brief</a><span class="intro-note">Scope and invoice before you commit. Nothing is charged here.</span></div>\n'+
    '<details class="campaign-process"><summary>How your campaign gets built</summary>'+flow[0].trim()+'</details>\n</section>\n\n';
  s=s.slice(0,first)+newIntro+s.slice(end);
  s=one(s,'<form id="briefForm">','<main id="campaign-main" class="campaign-main" tabindex="-1" aria-label="Campaign request"><form id="briefForm">');
  s=one(s,"<h2>Who's asking</h2>",'<fieldset class="brief-section"><legend><span class="section-number" aria-hidden="true">01</span> Your firm</legend>');
  s=one(s,'<h2>The campaign</h2>','</fieldset><fieldset class="brief-section"><legend><span class="section-number" aria-hidden="true">02</span> Your campaign</legend>');
  s=one(s,'<h2>How leads reach you</h2>','</fieldset><fieldset class="brief-section"><legend><span class="section-number" aria-hidden="true">03</span> Your intake preferences</legend>');
  // Close the last group before the pricing summary, not inside the receipt region.
  const formEnd=s.indexOf('</form>'), money=s.lastIndexOf('    <div class="money">',formEnd);
  if(money<0) throw Error('Missing pricing summary.');
  s=s.slice(0,money)+'</fieldset>\n'+s.slice(money);
  s=one(s,'  <footer>','</main>\n\n  <footer>');
  s=one(s,'<div class="wrap">','<a class="campaign-skip" href="#campaign-main">Skip to campaign brief</a>\n<div class="wrap">');
  const attrs={firm:' autocomplete="organization"',name:' autocomplete="name"',email:' autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false"',line:' inputmode="tel" autocomplete="off"'};
  for(const [id,extra] of Object.entries(attrs)) {
    const re=new RegExp('<input\\b[^>]*\\bid="'+id+'"[^>]*>','g'), found=[...s.matchAll(re)];
    if(found.length!==1 || /\b(?:autocomplete|inputmode)=/.test(found[0][0])) throw Error('Input already changed: '+id+'. Reconcile attributes.');
    let tag=found[0][0]; if(id==='line') tag=tag.replace('type="text"','type="tel"');
    s=s.replace(found[0][0],tag.slice(0,-1)+extra+'>');
  }
  // Copy changes are reviewable, and avoid promising unverified filtering or AI speed.
  s=one(s,'The most valuable answer on this page. Anything you name here never reaches your desk.','List exclusions so we can agree on the qualification and routing rules.');
  s=one(s,'We run intake<span class="tag">Included</span>','My team handles intake<span class="tag">Included</span>');
  s=one(s,'Deliver to our intake team<span class="tag">Included</span>','Send to my intake team<span class="tag">Included</span>');
  s=one(s,'A.I. prequalifies first<span class="tag up">Add-on</span>','Explore AI prequalification<span class="tag up">Quoted separately</span>');
  s=one(s,'Our assistant calls in about a minute, qualifies by claim type in English or Spanish, and only warm-transfers what matches your criteria.','Request AI-assisted qualification. Availability, languages and transfer rules are confirmed in your scope; not activated by this form.');
  s=one(s,'<button class="submit" type="submit">Send the brief</button>','<button class="submit" type="submit">Send my campaign brief</button>');
  s=one(s,'</head>',STYLE+'\n</head>');
  if(JSON.stringify(scripts(s))!==JSON.stringify(oldScripts)||JSON.stringify(controls(s))!==JSON.stringify(oldControls)) throw Error('Protected scripts or submission fields changed.');
  return s;
}
async function main() {
  const args=process.argv.slice(2);
  if(!args[0]||args.length>2||(args[1]&&args[1]!=='--apply')) throw Error('Usage: node tools/apply-lfma-mobile-ux.mjs <repo-root> [--apply]');
  const path=resolve(args[0],'lfma/campaign/index.html');
  await readFile(resolve(args[0],'lfma/assets/campaign-polish-v1.css'),'utf8');
  const before=await readFile(path,'utf8'), after=addMobileUx(before);
  if(after===before){console.log('Already applied.');return;}
  console.log('Adds grouped fields, compact process disclosure, clearer copy and mobile input attributes. Scripts and field values unchanged.');
  if(!args.includes('--apply')){console.log('DRY RUN: no files changed. Review in a clean worktree before --apply.');return;}
  if(await readFile(path,'utf8')!==before) throw Error('Concurrent edit detected.');
  // Keep rollback bytes outside every public site tree, never in the commit.
  const backupDir=await mkdtemp(resolve(tmpdir(),'lfma-mobile-ux-'));
  const backup=resolve(backupDir,'before.html');
  await writeFile(backup,before,{flag:'wx',mode:0o600});
  await writeFile(path,after,'utf8');
  console.log('Rollback copy: '+backup);
  console.log('Applied locally. Review diff, browser-test and commit; deployment is separate.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(e=>{console.error(e.message);process.exitCode=1;});
