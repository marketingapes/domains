// Render every <lane>/src/*.html to <lane>/<name>.png using ONE headless Chrome over CDP.
// Size is parsed from the file name (…_WxH.html). Usage: node render_cdp.mjs [lane ...]
import { spawn } from "node:child_process";
import { readdirSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9400 + Math.floor(Math.random() * 400);
const lanes = process.argv.slice(2).length ? process.argv.slice(2)
  : readdirSync(HERE).filter((d) => existsSync(join(HERE, d, "src")));

const chrome = spawn(CHROME, ["--headless=new", "--hide-scrollbars", "--disable-gpu", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "ee-cdp-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.find((t) => t.type === "page")) break; } catch {}
  await sleep(250);
}
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map(); const waiters = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) waiters.filter((w) => w.method === m.method).forEach((w) => w.res(m));
});
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const once = (method) => new Promise((res) => { const w = { method, res: (m) => { waiters.splice(waiters.indexOf(w), 1); res(m); } }; waiters.push(w); });

await send("Page.enable");
let n = 0;
for (const lane of lanes) {
  const src = join(HERE, lane, "src");
  for (const f of readdirSync(src).filter((x) => x.endsWith(".html")).sort()) {
    const [, W, H] = f.match(/_(\d+)x(\d+)\.html$/).map(Number);
    await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    const loaded = once("Page.loadEventFired");
    await send("Page.navigate", { url: "file://" + join(src, f) });
    await loaded; await sleep(150);
    const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
    writeFileSync(join(HERE, lane, f.replace(/\.html$/, ".png")), Buffer.from(shot.result.data, "base64"));
    n++;
  }
}
console.log(`rendered ${n} PNGs`);
ws.close(); chrome.kill();
process.exit(0);
