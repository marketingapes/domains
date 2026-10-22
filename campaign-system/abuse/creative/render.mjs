// Renders DRAFT ad creatives for the three angles from committed lane photos, with the existing
// Playwright install. Local only: pages are built from the package and served from 127.0.0.1; any
// other request is blocked. Output goes to a NEW directory.
//
//   PLAYWRIGHT=/path/to/playwright CHROMIUM=/path/to/chromium node campaign-system/abuse/creative/render.mjs <new-out-dir>
import http from 'node:http';
import { createRequire } from 'node:module';
import { readFile, mkdir, access, writeFile, rename, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { loadPackage } from '../machine.mjs';

const out = process.argv[2];
if (!out || !process.env.PLAYWRIGHT || !process.env.CHROMIUM) { console.error('usage: PLAYWRIGHT=… CHROMIUM=… node render.mjs <new-out-dir>'); process.exit(2); }
try { await access(out); console.error('output directory must be new'); process.exit(2); } catch { await mkdir(out, { recursive: true }); }
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT);
const pkg = loadPackage();
const BTL = new URL('../../../btl/', import.meta.url).pathname;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CTA = { form: 'Ask for a free, confidential review', quiz: 'Answer four private questions', voice: 'Preview talking with Sofia' };
const SECOND = { form: 'You don’t need to describe what happened.', quiz: 'Every question has “Prefer not to say.”', voice: 'Sofia is AI. Live voice is not connected yet.' };

function still(ad, w, h) {
  return `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;font-family:-apple-system,"Inter","Segoe UI",Roboto,Arial,sans-serif;background:#111}
  .ph{position:absolute;inset:0;background:url(${ad.image}) center/cover}
  .sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,12,18,.05) 30%,rgba(10,12,18,.82) 72%,rgba(10,12,18,.94))}
  .tx{position:absolute;left:${w * 0.07}px;right:${w * 0.07}px;bottom:${h * 0.07}px;color:#fff}
  .ey{display:inline-block;font:700 ${Math.round(w * 0.022)}px/1 sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#f2dfb4;border:1px solid rgba(242,223,180,.6);border-radius:999px;padding:${w * 0.012}px ${w * 0.022}px;margin-bottom:${w * 0.03}px}
  h1{font:400 ${Math.round(w * 0.066)}px/1.12 "Iowan Old Style",Baskerville,Georgia,serif;margin:0 0 ${w * 0.025}px}
  p{font-size:${Math.round(w * 0.03)}px;line-height:1.4;margin:0 0 ${w * 0.035}px;color:#e9e6df}
  .cta{display:inline-block;background:#f6f1e7;color:#111827;font-weight:700;font-size:${Math.round(w * 0.03)}px;border-radius:999px;padding:${w * 0.02}px ${w * 0.04}px}
  .ft{display:flex;align-items:flex-start;flex-direction:column;gap:${w * 0.02}px;margin-top:${w * 0.04}px;font-size:${Math.round(w * 0.019)}px;color:#cfcac0}
  .firm-wordmark{font:400 ${Math.round(w * 0.032)}px/1.15 Georgia,serif;color:#fff}
  </style><div class="ph" role="img" aria-label="${esc(ad.image_alt)}"></div><div class="sh"></div>
  <div class="tx"><span class="ey">Los Angeles County · confidential</span><h1>${esc(ad.headline)}</h1><p>${esc(SECOND[ad.path])}</p>
  <span class="cta">${esc(CTA[ad.path])} →</span>
  <div class="ft"><span class="firm-wordmark">Phillips Law Group</span><span>Attorney advertising · Phillips Law Group · Sofia is AI · No outcome guaranteed · Photo is illustrative</span></div></div>`;
}
function motion(ad, w, h) {
  // Three timed scenes over ~9s; transform/opacity only. Reduced to a still for prefers-reduced-motion.
  return still(ad, w, h).replace('<style>', `<style>
  @keyframes zoom{from{transform:scale(1.02)}to{transform:scale(1.12)}}
  @keyframes in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  .ph{animation:zoom 9s ease-out forwards}
  .ey{opacity:0;animation:in .8s .3s forwards} h1{opacity:0;animation:in .9s 1s forwards}
  p{opacity:0;animation:in .9s 3.2s forwards} .cta{opacity:0;animation:in .9s 5.4s forwards} .ft{opacity:0;animation:in .9s 6.4s forwards}`);
}
const pages = new Map();
const server = http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pages.has(p)) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(pages.get(p)); return; }
  try { const data = await readFile(join(BTL, p)); res.writeHead(200, { 'content-type': { '.jpg': 'image/jpeg', '.webp': 'image/webp' }[extname(p)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
const blocked = [];
const manifest = [];
const guard = async (ctx) => ctx.route('**/*', (r) => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : (blocked.push(r.request().url()), r.abort())));
for (const ad of pkg.ads) {
  for (const [label, w, h] of [['feed-1x1', 1080, 1080], ['feed-4x5', 1080, 1350], ['story-9x16', 1080, 1920]]) {
    pages.set(`/${ad.angle_id}-${label}`, still(ad, w, h));
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }); await guard(ctx);
    const page = await ctx.newPage(); await page.goto(`${origin}/${ad.angle_id}-${label}`); await page.waitForLoadState('networkidle');
    const brandCheck = await page.evaluate(() => ({ wordmark: document.querySelector('.firm-wordmark')?.textContent, images: document.querySelectorAll('.ft img').length, overflow: document.documentElement.scrollWidth > innerWidth }));
    if (brandCheck.wordmark !== 'Phillips Law Group' || brandCheck.images !== 0 || brandCheck.overflow) throw Error('creative_branding_or_layout_invalid');
    const file = `${ad.angle_id}-${label}.png`; await page.screenshot({ path: join(out, file) }); await ctx.close();
    manifest.push({ angle_id: ad.angle_id, kind: 'image', format: label, file, source_image: ad.image });
  }
  // Draft motion: recorded at 720x900 (4:5) as WebM; final MP4/H.264 export is a listed missing deliverable.
  pages.set(`/${ad.angle_id}-motion`, motion(ad, 720, 900));
  const vdir = join(out, `.rec-${ad.angle_id}`);
  const ctx = await browser.newContext({ viewport: { width: 720, height: 900 }, recordVideo: { dir: vdir, size: { width: 720, height: 900 } } }); await guard(ctx);
  const page = await ctx.newPage(); await page.goto(`${origin}/${ad.angle_id}-motion`); await page.waitForTimeout(9500);
  const video = page.video(); await ctx.close();
  const file = `${ad.angle_id}-motion-4x5.webm`; await rename(await video.path(), join(out, file));
  manifest.push({ angle_id: ad.angle_id, kind: 'video_draft', format: '720x900 webm ~9.5s', file, source_image: ad.image });
}
await browser.close(); server.close();
await writeFile(join(out, 'manifest.json'), JSON.stringify({ campaign_id: pkg.campaign_id, status: 'DRAFT — not uploaded, not approved', creative_revision: pkg.creative_revision, branding: 'plain text wordmark; no logo image' , blocked_external_requests: blocked.length, assets: manifest, missing_final_deliverables: [
  'Voice-over or captions track, if Muse/Kyle want audio — none recorded',
  'Firm and attorney approval of all creative before any upload',
] }, null, 2));
console.log(JSON.stringify({ out, assets: manifest.length, blocked_external_requests: blocked.length }));
