import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root='/home/user/domains/sliq';
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(root,p);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){r.writeHead(404);return r.end()}const ext=path.extname(f);r.writeHead(200,{'content-type':{'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'}[ext]||'text/plain'});fs.createReadStream(f).pipe(r)}).listen(8765);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'});
const out=process.argv[2];
for (const [name,url,w] of [['home','/',1280],['home-m','/',360],['art','/articles/choosing-life-insurance-beneficiaries/',360],['art-d','/articles/term-vs-whole-life-insurance/',1280]]){
 const pg=await b.newPage({viewport:{width:w,height:900}});
 await pg.route(/googlesyndication|fonts\.g/, r=>r.abort());
 await pg.goto('http://localhost:8765'+url);
 const sw=await pg.evaluate(()=>document.documentElement.scrollWidth);
 console.log(name,'scrollWidth',sw);
 await pg.screenshot({path:`${out}/${name}.png`,fullPage:name!=='home'&&name!=='art-d'?false:false});
 if(name==='home'){await pg.evaluate(()=>document.getElementById('estimator').scrollIntoView());await pg.screenshot({path:`${out}/widget.png`});
   await pg.evaluate(()=>document.querySelector('.cards').scrollIntoView());await pg.screenshot({path:`${out}/cards.png`});}
}
// article svgs grid
const pg=await b.newPage({viewport:{width:1500,height:1300}});
await pg.setContent('<body style="margin:0;display:grid;grid-template-columns:repeat(4,1fr);gap:4px">'+fs.readdirSync(root+'/images').filter(f=>f.endsWith('.svg')).map(f=>`<img src="http://localhost:8765/images/${f}" style="width:100%">`).join('')+'</body>');
await pg.waitForTimeout(500);
await pg.screenshot({path:`${out}/svgs.png`,fullPage:true});
await b.close(); srv.close();
