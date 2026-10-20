import {readFile, mkdir, writeFile, realpath} from 'node:fs/promises';
import {resolve, relative, isAbsolute, join, dirname, basename, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPlan} from './model.mjs';
import {renderIntakePage} from './pages.mjs';
import {validateMassTortKit,kitSnapshot,REVIEW_CHECKS,LAUNCH_CHECKS} from './mass-tort.mjs';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function dryRun(kit) {
  const readiness=validateMassTortKit(kit);
  if(readiness.errors.length) return {readiness,manifest:null,assets:{}};
  const plan=createPlan({brand:kit.brand,topic:kit.topic,start:kit.start,firm:kit.firm.name,location:kit.geography.included.join(', '),excludedGeo:kit.geography.excluded.join(', '),qualifies:kit.screening.qualifies.join('\n'),disqualifies:kit.screening.disqualifies.join('\n'),campaignClass:'major_mass_tort'});
  // The legacy studio model bounds free-form planning strings. This validated adapter
  // must render every campaign rule and jurisdiction losslessly without changing it.
  plan.firm=kit.firm.name;
  plan.criteria={qualifies:[...kit.screening.qualifies],disqualifies:[...kit.screening.disqualifies],verified:false};
  plan.geo={location:kit.geography.included.join(', '),excluded:kit.geography.excluded.join(', '),radiusMiles:null,verified:false};
  const assets={};
  for(const page of kit.pages) assets[`${page.path}.html`]=renderIntakePage(plan,page.studioMode,{brandOverlay:{name:kit.firm.name||'Firm brand awaiting approval',color:kit.firm.color}});
  assets['ads.html']=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex,nofollow"><title>BTL ad concept review</title><style>body{font:18px/1.6 system-ui;max-width:960px;margin:auto;padding:24px;background:#f4f6f8;color:#153b51}article{padding:24px;background:white;border:1px solid #ccd8dd;border-radius:16px;margin:24px 0}p{overflow-wrap:anywhere}</style><h1>${esc(kit.firm.name||"Firm brand awaiting approval")} · Ad concept review</h1><p>Draft slots only. No ad is uploaded or activated. No medical/legal eligibility or performance claim is supplied.</p>${kit.concepts.map(c=>`<article><h2>${esc(c.id)}</h2><h3>${esc(c.headline||'Headline awaiting campaign copy review')}</h3><p>${esc(c.body||'Body awaiting campaign copy review')}</p><p>Image: ${esc(c.imageRef||'Awaiting deliverable')}</p><p>Video storyboard: ${esc(c.videoStoryboardRef||'Awaiting deliverable')}</p><p>Final video: ${esc(c.videoRef||'Awaiting deliverable')}</p></article>`).join('')}</html>`;
  const manifest={schema:'btl.mass-tort-build/v1',campaignId:kit.campaignId,product:kit.product,firmBrand:kit.firm,snapshot:kitSnapshot(kit),dryRun:true,activation:false,readiness:readiness.status,artifacts:Object.keys(assets),pages:kit.pages.map(p=>({path:p.path,studioMode:p.studioMode,pageId:p.pageId,file:`${p.path}.html`})),intakeContract:kit.bindings.intakeContract,identity:kit.identity,bindings:kit.bindings,destinations:kit.destinations,checklist:{review:REVIEW_CHECKS,launch:LAUNCH_CHECKS}};
  return {manifest,readiness,assets};
}

async function outputTarget(output) {
  const root=await realpath(fileURLToPath(new URL('../',import.meta.url)));
  let ancestor=resolve(output);
  const missing=[];
  // Resolve every existing component, including symlinks, before checking containment.
  // Missing parents are inspected but never created recursively.
  for(;;) {
    try {ancestor=await realpath(ancestor);break;}
    catch(e) {
      if(e.code!=='ENOENT'||dirname(ancestor)===ancestor)throw e;
      missing.unshift(basename(ancestor));ancestor=dirname(ancestor);
    }
  }
  const target=join(ancestor,...missing),rel=relative(root,target);
  if(rel===''||(!rel.startsWith('..'+sep)&&!isAbsolute(rel))) throw Error('Output must be outside the repository (for example /tmp/btl-review-001).');
  return target; // Write through the resolved path, not the caller's symlink alias.
}

export async function run(args) {
  const [input,output,gate='DRAFT']=args;
  if(!input||!output||!['DRAFT','REVIEW_READY','LAUNCH_READY'].includes(gate)||args.length>3) throw Error('Usage: node campaign-system/mass-tort-cli.mjs INPUT.json OUTPUT_DIRECTORY [DRAFT|REVIEW_READY|LAUNCH_READY]');
  // A new output directory only. Never overwrite source, generated studios or live pages.
  const target=await outputTarget(output);
  const kit=JSON.parse(await readFile(input,'utf8'));
  const result=dryRun(kit);
  if(result.readiness.errors.length) {console.log(JSON.stringify(result.readiness,null,2));return 2;}
  await mkdir(target); // Deliberately fail on an existing directory; no clobber or recursive writes.
  for(const [name,html] of Object.entries(result.assets)) await writeFile(join(target,name),html,{flag:'wx'});
  await writeFile(join(target,'manifest.json'),JSON.stringify(result.manifest,null,2)+'\n',{flag:'wx'});
  await writeFile(join(target,'readiness.json'),JSON.stringify(result.readiness,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output:target,...result.readiness},null,2));
  return gate==='DRAFT'?0:gate==='REVIEW_READY'&&!result.readiness.reviewReady?1:gate==='LAUNCH_READY'&&!result.readiness.launchReady?1:0;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {process.exitCode=await run(process.argv.slice(2));}
  catch(e) {console.error(e.message);process.exitCode=2;}
}
