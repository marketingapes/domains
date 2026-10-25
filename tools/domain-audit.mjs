#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const TENANTS={
  BTL:{folder:'btl',domain:'besttortlawyers.com'},
  CGG:{folder:'cgg',domain:'crazygolfgame.com'},
  DDM:{folder:'ddm',domain:'discountdealme.com'},
  DIHAC:{folder:'dihac',domain:'doihaveaclaim.ai'},
  FPLB:{folder:'fplb',domain:'forpetslikeblue.com'},
  KG:{folder:'kg',domain:'kylegosselin.com'},
  LFMA:{folder:'lfma',domain:'lawfirmmarketingapes.com'},
  MA:{folder:'ma',domain:'marketingapes.com'},
  NIL:{folder:'nil',domain:'nearestinjurylawyers.com'},
  PX:{folder:'px',domain:'pillowexchange.com'},
  RI:{folder:'ri',domain:'researchinvestigation.com'},
  SLIQ:{folder:'sliq',domain:'smartlifeinsurancequote.com'},
  TNT:{folder:'tnt',domain:'tonedntasty.com'},
  TOSS:{folder:'toss',domain:'tosssports.com'}
};

const args=process.argv.slice(2);
const live=args.includes('--live');
const requested=args.find(a=>!a.startsWith('--'))?.toUpperCase();
const selected=requested?[requested]:Object.keys(TENANTS);
if(requested&&!TENANTS[requested]){
  console.error('Unknown tenant:',requested);
  process.exit(2);
}

let blockers=0,warnings=0;
const rows=[];
const push=(tenant,severity,check,detail)=>{
  rows.push({tenant,severity,check,detail});
  if(severity==='BLOCK') blockers++;
  if(severity==='WARN') warnings++;
};
const exists=p=>fs.existsSync(path.join(ROOT,p));
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const count=(s,re)=>(s.match(re)||[]).length;

function localAudit(tenant){
  const cfg=TENANTS[tenant], base=cfg.folder;
  const manifestPath=`${base}/domain.json`;
  if(!exists(manifestPath)){ push(tenant,'BLOCK','manifest','missing '+manifestPath); return; }
  let manifest;
  try{ manifest=JSON.parse(read(manifestPath)); }
  catch(e){ push(tenant,'BLOCK','manifest','invalid JSON: '+e.message); return; }

  const declared=manifest.domain_id||manifest.hostname?.intended_canonical_hostname;
  if(declared!==cfg.domain) push(tenant,'BLOCK','domain identity',`expected ${cfg.domain}; manifest has ${declared||'none'}`);
  else push(tenant,'PASS','domain identity',cfg.domain);

  const idx=`${base}/index.html`;
  if(!exists(idx)){ push(tenant,'BLOCK','root source','missing '+idx); return; }
  const html=read(idx);

  const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.trim();
  if(!title) push(tenant,'BLOCK','title','missing <title>');
  else push(tenant,'PASS','title',title.replace(/\s+/g,' '));

  const desc=html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)||
             html.match(/<meta\s+content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  if(!desc) push(tenant,'WARN','meta description','missing');
  else push(tenant,'PASS','meta description',desc[1].slice(0,120));

  const canonical=(html.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)||
                   html.match(/<link\s+href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i))?.[1];
  if(!canonical) push(tenant,'WARN','canonical','missing on homepage');
  else if(!canonical.startsWith('https://'+cfg.domain)) push(tenant,'BLOCK','canonical',`cross-domain or unexpected canonical: ${canonical}`);
  else push(tenant,'PASS','canonical',canonical);

  const h1s=count(html,/<h1\b/gi);
  if(h1s===0) push(tenant,'WARN','H1','no H1 on homepage');
  else if(h1s>1) push(tenant,'WARN','H1',`${h1s} H1 elements on homepage`);
  else push(tenant,'PASS','H1','one H1');

  const placeholders=[
    /PIXEL_ID_HERE/i,/GTM-[A-Z0-9_-]*PLACEHOLDER/i,/MEASUREMENT_ID/i,
    /YOUR_[A-Z0-9_]*_ID/i,/TODO[: ]/i,/example\.com/i
  ].filter(re=>re.test(html));
  if(placeholders.length) push(tenant,'BLOCK','placeholder tokens',placeholders.map(String).join(', '));
  else push(tenant,'PASS','placeholder tokens','none on homepage');

  if(/https:\/\/hook\.[^"'\s]+/i.test(html)) push(tenant,'BLOCK','public webhook','raw webhook URL committed in homepage source');
  else push(tenant,'PASS','public webhook','none on homepage');

  for(const req of ['robots.txt','sitemap.xml']){
    if(!exists(`${base}/${req}`)) push(tenant,'WARN',req,'missing');
    else push(tenant,'PASS',req,'present');
  }

  if(exists(`${base}/robots.txt`)){
    const robots=read(`${base}/robots.txt`);
    if(/Disallow:\s*\//i.test(robots)&&manifest.hostname?.current_hosting_state==='render'){
      push(tenant,'WARN','robots crawlability','root disallow found on Render-hosted tenant');
    }
  }

  if(exists(`${base}/sitemap.xml`)){
    const sm=read(`${base}/sitemap.xml`);
    const locs=[...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
    const foreign=locs.filter(u=>!u.startsWith('https://'+cfg.domain));
    if(foreign.length) push(tenant,'BLOCK','sitemap domains','foreign URLs: '+foreign.slice(0,5).join(', '));
    else push(tenant,'PASS','sitemap domains',`${locs.length} URLs, all on ${cfg.domain}`);
  }

  const gtm=manifest.measurement?.gtm_web?.container_id;
  if(gtm){
    const sourceHas=html.includes(gtm);
    if(!sourceHas) push(tenant,'WARN','GTM','manifest declares '+gtm+' but homepage source does not contain it');
    else push(tenant,'PASS','GTM',gtm);
  }
}

async function liveAudit(tenant){
  const {domain}=TENANTS[tenant];
  const urls=[`https://${domain}/`,`https://${domain}/robots.txt`,`https://${domain}/sitemap.xml`];
  for(const url of urls){
    try{
      const res=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(12000)});
      const sev=res.ok?'PASS':'BLOCK';
      push(tenant,sev,'live '+new URL(url).pathname,`${res.status} -> ${res.url}`);
      if(url.endsWith('/sitemap.xml')&&res.ok){
        const text=await res.text();
        const locs=[...text.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]).slice(0,40);
        for(const loc of locs){
          try{
            const r=await fetch(loc,{redirect:'follow',signal:AbortSignal.timeout(12000)});
            if(!r.ok) push(tenant,'BLOCK','live sitemap URL',`${r.status} ${loc}`);
          }catch(e){ push(tenant,'BLOCK','live sitemap URL',`${loc}: ${e.message}`); }
        }
        if(locs.length) push(tenant,'PASS','live sitemap sample',`${locs.length} URLs checked`);
      }
    }catch(e){ push(tenant,'BLOCK','live '+new URL(url).pathname,e.message); }
  }
}

for(const t of selected) localAudit(t);
if(live){
  for(const t of selected) await liveAudit(t);
}

for(const r of rows){
  console.log(`[${r.severity}] ${r.tenant} :: ${r.check} :: ${r.detail}`);
}
console.log(`\nSummary: ${blockers} blocker(s), ${warnings} warning(s), ${rows.length-blockers-warnings} pass(es)`);
process.exit(blockers?1:0);
