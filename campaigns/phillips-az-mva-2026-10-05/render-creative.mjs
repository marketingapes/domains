// Local typography/motion renderer following nil-site's existing Playwright export workflow.
// No provider, stock image, generated person, upload, voice, music or network request.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const opts=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,all)=>i%2?a:a.concat([[v,all[i+1]]]),[]));
for(const key of ['--logo','--playwright','--chrome','--ffmpeg']) if(!opts[key]) throw Error('Required: --logo PATH --playwright MODULE --chrome EXECUTABLE --ffmpeg EXECUTABLE');
const logoBytes=fs.readFileSync(opts['--logo']);
const logoHash=createHash('sha256').update(logoBytes).digest('hex');
if(logoHash!=='b79d238ac48f705910898d9dcffef8281a8b27799609a96e01e513ae86c5fc44')throw Error('Wrong source logo');
const logo='data:image/webp;base64,'+logoBytes.toString('base64');
const {chromium}=await import(pathToFileURL(path.resolve(opts['--playwright'])).href);
const out=path.join(dir,'rendered');fs.mkdirSync(out,{recursive:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'phillips-motion-'));
const outputs=[];
const stills=[['meta-square',1080,1080],['meta-portrait',1080,1350],['vertical',1080,1920],['pmax-landscape',1200,628],['pmax-square',1200,1200],['pmax-portrait',960,1200]];
const videos=[['vertical',1080,1920],['horizontal',1920,1080],['square',1080,1080]];
const beats=[
 ['ARIZONA INTAKE OPTIONS','The next step, explained.','Vehicle-accident intake options',0],
 ['CHOOSE HOW TO START','Explore the process.','Overview · disclosed AI · guided facts',0],
 ['SHARE THE BASICS','Start with the basic facts.','Incident type · location · approximate date',1],
 ['ONE QUESTION AT A TIME','Keep uncertainty visible.','Information is organized for human review.',1],
 ['SOFIA IS AI','An AI intake assistant.','Sofia helps organize information.',2],
 ['CLEAR ROLE','Sofia is not a lawyer.','No legal advice or eligibility decisions.',2],
 ['HUMAN REVIEW','Attorneys review legal questions.','AI does not decide eligibility.',3],
 ['PRIVATE INTAKE','Optional answers stay private.','Never health data in ad targeting.',3],
 ['A CLEAR NEXT STEP','Explore the process.','Choose how to begin an inquiry.',4],
 ['PHILLIPS LAW GROUP','Arizona intake options.','No representation or outcome guaranteed.',4],
];
function html(w,h,beat){
 const wide=w/h>1.4,vertical=h/w>1.6,scale=wide?h/850:w/1080;
 const top=vertical?180:wide?38:62,bottom=vertical?360:wide?35:70;
 const header=wide?125:190;
 const titleSize=(wide?76:vertical?95:88)*scale;
 return `<!doctype html><html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; connect-src 'none'"><style>
 *{box-sizing:border-box}body{margin:0;width:${w}px;height:${h}px;background:#f6ede3;color:#17191b;font-family:Arial,sans-serif}
 .frame{position:relative;height:100%;padding:${top}px ${70*scale}px ${bottom}px}
 header{height:${header*scale}px;display:flex;align-items:center;gap:${28*scale}px}
 header img{width:${wide?135*scale:190*scale}px;height:auto}header span{font-size:${22*scale}px;font-weight:700;letter-spacing:2px}
 .copy{margin-top:${wide?20:vertical?135:45}px}.eyebrow{font-size:${24*scale}px;letter-spacing:3px;color:#a91526;font-weight:700}
 h1{font-size:${titleSize}px;line-height:1.03;margin:${22*scale}px 0;max-width:${wide?1400*scale:900*scale}px;letter-spacing:-2px}
 .sub{font-size:${(wide?31:vertical?40:35)*scale}px;line-height:1.3;max-width:${900*scale}px;margin:0}
 .steps{display:flex;gap:${12*scale}px;margin-top:${(wide?28:55)*scale}px}
 .step{flex:1;border-top:5px solid #b5a699;padding-top:${16*scale}px;font-size:${20*scale}px;line-height:1.2}
 .active{border-color:#a91526;color:#a91526;font-weight:700}.cta{display:inline-block;background:#a91526;color:white;padding:${16*scale}px ${28*scale}px;margin-top:${32*scale}px;font-size:${26*scale}px;font-weight:700}
 footer{position:absolute;bottom:${bottom}px;left:${70*scale}px;right:${70*scale}px;border-top:1px solid #b5a699;padding-top:${16*scale}px;font-size:${(wide?20:vertical?26:23)*scale}px;line-height:1.3}
 </style><div class="frame"><header><img src="${logo}" alt="Phillips Law Group"><span>ARIZONA<br>INTAKE OPTIONS</span></header><div class="copy"><div class="eyebrow">${beat[0]}</div><h1>${beat[1]}</h1><p class="sub">${beat[2]}</p><div class="steps">${['Explore','Share basics','AI organization','Human review'].map((x,i)=>'<div class="step '+(i===Math.min(beat[3],3)?'active':'')+'">'+x+'</div>').join('')}</div>${beat[3]===0||beat[3]===4?'<div class="cta">Explore the process</div>':''}</div><footer>Attorney advertising.<br>Nearest Injury Lawyers is a matching service, not a law firm.<br>No representation or outcome guaranteed.</footer></div></html>`;
}
function receipt(file,fields){const b=fs.readFileSync(path.join(out,file));outputs.push({file:'rendered/'+file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),...fields});}
const browser=await chromium.launch({headless:true,executablePath:opts['--chrome']});
try{
 async function render(w,h,beat,file,jpeg=false){
  const page=await browser.newPage({viewport:{width:w,height:h}});
  await page.route(/^https?:/,r=>r.abort());
  await page.setContent(html(w,h,beat));await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  const issue=await page.evaluate(()=>{const f=document.querySelector('footer').getBoundingClientRect();const c=document.querySelector('.copy').getBoundingClientRect();return document.documentElement.scrollWidth>innerWidth||c.bottom>f.top-12;});
  if(issue)throw Error('Layout overlap/overflow '+w+'x'+h);
  await page.screenshot({path:file,type:jpeg?'jpeg':'png',...(jpeg?{quality:92}:{})});await page.close();
 }
 for(const [id,w,h] of stills){const name=id+'-'+w+'x'+h+'.jpg';await render(w,h,beats[0],path.join(out,name),true);receipt(name,{kind:'still',width:w,height:h,creative_id:'phillips_mva_process_'+id+'_review_v1',alt:'Phillips Arizona intake options: the next step explained, with human review and matching-service disclosures.'});}
 for(const [id,w,h] of videos){
  const poster=id+'-poster.jpg';await render(w,h,beats[0],path.join(out,poster),true);receipt(poster,{kind:'poster',width:w,height:h});
  const segments=[];
  for(let i=0;i<beats.length;i++){
   const png=path.join(temp,id+'-'+i+'.png'),mp4=path.join(temp,id+'-'+i+'.mp4');
   await render(w,h,beats[i],png);
   const vf=`zoompan=z='1+0.00015*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${w}x${h}:fps=30,format=yuv420p`;
   const r=spawnSync(opts['--ffmpeg'],['-hide_banner','-loglevel','error','-y','-loop','1','-i',png,'-vf',vf,'-t','2','-c:v','libx264','-preset','fast','-crf','20',mp4],{encoding:'utf8'});
   if(r.status!==0)throw Error(r.stderr);segments.push(mp4);
  }
  const list=path.join(temp,id+'.txt');fs.writeFileSync(list,segments.map(x=>"file '"+x+"'").join('\n'));
  const master=id+'-20s.mp4';
  const r=spawnSync(opts['--ffmpeg'],['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',path.join(out,master)],{encoding:'utf8'});
  if(r.status!==0)throw Error(r.stderr);receipt(master,{kind:'video',width:w,height:h,duration_seconds:20,fps:30,codec:'h264',pixel_format:'yuv420p',audio:'none',creative_id:'phillips_mva_process_'+id+'_review_v1'});
  console.log('Rendered '+master);
 }
 const srt=beats.map((b,i)=>`${i+1}\n00:00:${String(i*2).padStart(2,'0')},000 --> 00:00:${String((i+1)*2).padStart(2,'0')},000\n${b[1]} ${b[2]}\n`).join('\n');
 fs.writeFileSync(path.join(out,'process-captions.srt'),srt);receipt('process-captions.srt',{kind:'captions'});
 fs.writeFileSync(path.join(out,'process-transcript.txt'),beats.map(b=>b[1]+' '+b[2]).join('\n')+'\nAttorney advertising. Nearest Injury Lawyers is a matching service, not a law firm. No representation or outcome guaranteed.\n');receipt('process-transcript.txt',{kind:'transcript'});
 fs.writeFileSync(path.join(dir,'rendered-assets.json'),JSON.stringify({status:'RENDERED_REVIEW_ONLY',activation:false,publication_enabled:false,upload_enabled:false,legal_review:'pending-attorney-review',source_logo_sha256:logoHash,source_logo_note:'Exact source bytes embedded unchanged; no recreated logo or fabricated people.',rights_note:'Advertiser-source logo provenance; no new voice/music/stock. Placement/legal/brand review remains required.',assets:outputs},null,2)+'\n');
}finally{await browser.close();fs.rmSync(temp,{recursive:true,force:true});}
