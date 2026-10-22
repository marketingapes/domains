// Exports silent H.264 MP4 drafts from the committed PNG/WebM creatives using Chromium's own
// MediaRecorder (video/mp4;codecs=avc1.42001E) — the method used for the earlier draft MP4s, because
// Homebrew ffmpeg here is broken (linked to libx265.215; x265 4.3 ships libx265.217).
// Local only: files are served from 127.0.0.1 and every other request is blocked. Output dir must be new.
//
//   PLAYWRIGHT=/path/to/playwright CHROMIUM=/path/to/chromium \
//     node campaign-system/abuse/creative/export-mp4.mjs <source-dir> <new-out-dir>
import http from 'node:http';
import { createRequire } from 'node:module';
import { readFile, mkdir, access, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, extname } from 'node:path';
import { inspectMp4 } from './mp4-inspect.mjs';

const [src, out] = process.argv.slice(2);
if (!src || !out || !process.env.PLAYWRIGHT || !process.env.CHROMIUM) { console.error('usage: PLAYWRIGHT=… CHROMIUM=… node export-mp4.mjs <source-dir> <new-out-dir>'); process.exit(2); }
try { await access(out); console.error('output directory must be new'); process.exit(2); } catch { await mkdir(out, { recursive: true }); }
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const MIME = 'video/mp4;codecs=avc1.42001E';
const SECONDS = 9.5;
const manifest = JSON.parse(await readFile(join(src, 'manifest.json'), 'utf8'));
const angles = [...new Set(manifest.assets.map((a) => a.angle_id))];
const jobs = angles.flatMap((angle) => [
  { angle, file: `${angle}-9x16-draft.mp4`, source: `${angle}-story-9x16.png`, kind: 'image', w: 1080, h: 1920 },
  { angle, file: `${angle}-4x5-draft.mp4`, source: `${angle}-motion-4x5.webm`, kind: 'video', w: 1080, h: 1350 },
]);

const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).replace(/^\/+/, '');
  if (p === '' || p === 'index.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>export</title>'); return; }
  if (p.includes('..') || p.includes('/')) { res.writeHead(404); res.end(); return; }
  try {
    const data = await readFile(join(p.endsWith('.mp4') ? out : src, p));
    const type = { '.png': 'image/png', '.webm': 'video/webm', '.mp4': 'video/mp4' }[extname(p)] || 'application/octet-stream';
    // Media seeking needs byte ranges.
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m) {
      const start = m[1] ? Number(m[1]) : Math.max(0, data.length - Number(m[2])); const end = m[1] && m[2] ? Math.min(Number(m[2]), data.length - 1) : data.length - 1;
      res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${data.length}`, 'content-length': end - start + 1 }); res.end(data.subarray(start, end + 1)); return;
    }
    res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': data.length }); res.end(data);
  }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext();
const blocked = [];
await ctx.route('**/*', (r) => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : (blocked.push(r.request().url()), r.abort())));
const page = await ctx.newPage();
await page.goto(`${origin}/`);
if (!(await page.evaluate((m) => MediaRecorder.isTypeSupported(m), MIME))) { console.error(`this Chromium cannot record ${MIME}`); process.exit(1); }

const results = [];
for (const job of jobs) {
  const b64 = await page.evaluate(async ({ job, MIME, SECONDS }) => {
    const canvas = document.createElement('canvas'); canvas.width = job.w; canvas.height = job.h;
    const g = canvas.getContext('2d');
    let draw; let video = null;
    if (job.kind === 'image') { const img = new Image(); img.src = '/' + job.source; await img.decode(); draw = () => g.drawImage(img, 0, 0, job.w, job.h); }
    else { video = document.createElement('video'); video.src = '/' + job.source; video.muted = true; await new Promise((ok, no) => { video.oncanplaythrough = ok; video.onerror = () => no(new Error('video_load_failed')); }); draw = () => g.drawImage(video, 0, 0, job.w, job.h); }
    draw();
    // Frames are pushed explicitly at 30 fps from a timer, so the recording is not at the mercy of
    // animation-frame throttling in headless browsers.
    const stream = canvas.captureStream(0); const track = stream.getVideoTracks()[0];
    const rec = new MediaRecorder(stream, { mimeType: MIME, videoBitsPerSecond: 6_000_000 });
    const chunks = []; rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise((ok) => { rec.onstop = ok; });
    rec.start(250); if (video) await video.play();
    const start = performance.now();
    await new Promise((ok) => { const timer = setInterval(() => { draw(); track.requestFrame(); if (performance.now() - start >= SECONDS * 1000) { clearInterval(timer); ok(); } }, 1000 / 30); });
    rec.stop(); await stopped; if (video) video.pause();
    const buf = new Uint8Array(await new Blob(chunks, { type: MIME }).arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(s);
  }, { job, MIME, SECONDS });
  const bytes = Buffer.from(b64, 'base64');
  await writeFile(join(out, job.file), bytes);
  // Validate by decoding the written file in the same browser: dimensions, duration and a seek to 1s.
  // Duration, codec and size come from the MP4 boxes (fragmented MP4 has no header duration);
  // the browser proves the file decodes and can seek to 1 second, and saves that frame for review.
  const box = inspectMp4(join(out, job.file));
  const check = await page.evaluate(async ({ file, frameAt }) => {
    const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = '/' + file;
    const wait = (ev, ms) => new Promise((ok) => { const t = setTimeout(() => ok(false), ms); v.addEventListener(ev, () => { clearTimeout(t); ok(true); }, { once: true }); });
    if (!(await wait('loadeddata', 10000))) return { seekedTo1s: false, frame: null };
    let s = wait('seeked', 5000); v.currentTime = 1; const sought = (await s) && Math.abs(v.currentTime - 1) < 0.2 && v.readyState >= 2;
    s = wait('seeked', 5000); v.currentTime = frameAt; await s;
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
    return { seekedTo1s: sought, frame: c.toDataURL('image/png').split(',')[1] };
  }, { file: job.file, frameAt: 8 });
  if (check.frame) await writeFile(join(out, job.file.replace('.mp4', '-frame-8s.png')), Buffer.from(check.frame, 'base64'));
  results.push({ file: job.file, source: job.source, kind: job.kind === 'image' ? 'silent static story export' : 'silent motion transcode', sha256: sha(bytes), bytes: bytes.length,
    width: box.width, height: box.height, duration: Number(box.duration.toFixed(3)), frames: box.samples, mime: MIME, mp4_ftyp: box.ftyp, avc1: box.avc1, playback: check.seekedTo1s ? 'decoded and sought to 1 second' : 'FAILED', audio: false,
    source_sha256: sha(await readFile(join(src, job.source))) });
}
await browser.close(); server.close();
const receipt = { status: 'DRAFT — not approved or uploaded', encoder: `Chromium MediaRecorder ${MIME} (${process.env.CHROMIUM.split('/').slice(-1)[0]})`, source_dir: src, question_bank_version: manifest.question_bank_version || null, external_requests: blocked.length, assets: results };
await writeFile(join(out, 'receipt.json'), JSON.stringify(receipt, null, 2));
const bad = results.filter((r, i) => r.playback !== 'decoded and sought to 1 second' || !r.mp4_ftyp || !r.avc1 || Math.abs(r.duration - SECONDS) > 0.3 || r.width !== jobs[i].w || r.height !== jobs[i].h);
console.log(JSON.stringify({ out, exported: results.length, failed: bad.map((r) => r.file), external_requests: blocked.length }));
process.exitCode = bad.length ? 1 : 0;
