// Local browser check for the LA County abuse lane (callback form, quiz, talk-to-Sofia).
// Uses the repository's existing Playwright stack (no install here): point PLAYWRIGHT at an existing
// playwright package directory. Everything is served from 127.0.0.1; every request to any other host is
// blocked and counted. Fictional data only.
//
//   PLAYWRIGHT=/path/to/node_modules/playwright CHROMIUM=/path/to/chromium SHOTS=/fresh/dir \
//     node tests/btl-abuse-la.browser.mjs
//
// The intake endpoint is a local fake that returns either the exact receipt shape or a deliberately
// wrong one; a wrong receipt must never be shown as saved. This proves page behaviour only — it does
// not prove any server, provider or phone line is live.
import http from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const ROOT = new URL("../btl/", import.meta.url).pathname;
const CHROMIUM = process.env.CHROMIUM;
const SHOTS = process.env.SHOTS || "";
if (!CHROMIUM || !process.env.PLAYWRIGHT) { console.error("Set PLAYWRIGHT (existing playwright package dir) and CHROMIUM (installed executable)."); process.exit(2); }
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT);
if (SHOTS) { try { await access(SHOTS); console.error("SHOTS must be a new directory."); process.exit(2); } catch { await mkdir(SHOTS, { recursive: true }); } }

const sha = (v) => createHash("sha256").update(v).digest("hex");
const posted = [];
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png" };
function receipt(body, variant) {
  const good = { ok: true, schema: "btl.abuse.intake/v1", campaign_id: "btl-ca-abuse-la-county-v1", lead_id: "MA-BTL-ABUSE-00000000-0000-4000-8000-000000000001", submission_id: body.submission_id, consent_record_id: `CR-${sha(body.submission_id).slice(0, 24)}`, saved: true, status: "saved_pending_human_review", eligibility: "not_assessed", dispatch: "disabled", outreach: "not_scheduled" };
  const bad = {
    wrongsub: { submission_id: "different-submission" }, badlead: { lead_id: "MA-BTL-ABUSE-invalid" }, dispatch: { dispatch: "enabled" },
    noconsent: { consent_record_id: undefined }, schema: { schema: "btl.intake.web/v1" }, campaign: { campaign_id: "btl-az-mva" },
    notsaved: { saved: false }, qualified: { eligibility: "qualified" },
  }[variant];
  return bad ? { ...good, ...bad } : good;
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname.startsWith("/__intake/")) {
    const variant = url.pathname.split("/")[2];
    let raw = ""; for await (const c of req) raw += c;
    const body = JSON.parse(raw || "{}"); posted.push({ variant, body });
    if (variant === "http500") { res.writeHead(500); res.end("{}"); return; }
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(receipt(body, variant))); return;
  }
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  if (path.endsWith("/")) path += "index.html";
  try {
    let data = await readFile(join(ROOT, path));
    const ep = url.searchParams.get("ep");
    if (extname(path) === ".html" && ep) data = Buffer.from(data.toString("utf8").replace("intake_endpoint:null,", `intake_endpoint:"/__intake/${ep}",simulated:true,`));
    res.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream" }); res.end(data);
  } catch { res.writeHead(404); res.end("missing"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

// ---- Playwright page with all non-local traffic blocked ----
const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
let context, page;
const external = []; const images = []; const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(path, { width = 375, height = 812, mobile = true } = {}) {
  if (context) await context.close();
  context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
  await context.route("**/*", (route) => { const u = new URL(route.request().url()); if (u.hostname !== "127.0.0.1") { external.push(u.hostname); return route.abort("blockedbyclient"); } return route.continue(); });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
  page.on("response", (r) => { if (r.request().resourceType() === "image") images.push([r.url().replace(ORIGIN, ""), r.status()]); });
  await page.goto(ORIGIN + path, { waitUntil: "load" });
  await sleep(250);
}
const evaluate = (expression) => page.evaluate(expression);
const fill = (sel, value) => page.fill(sel, value);
const click = (sel) => page.click(sel);
const visibleState = (box) => evaluate(`[...document.querySelectorAll('#${box} [data-state]')].filter(e=>!e.hidden && !document.getElementById('${box}').hidden).map(e=>e.dataset.state)`);
const statusText = () => evaluate("[...document.querySelectorAll('form .status')].map(s=>s.textContent).join(' ')");
const results = [];
const check = (name, fn) => fn().then(() => results.push([name, "pass"]), (e) => results.push([name, "FAIL", e.message.slice(0, 300)]));
const contrast=(a,b)=>{const l=s=>{const rgb=s.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]};const x=l(a),y=l(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};

async function fillContact(form, { email = false } = {}) {
  await fill(`#${form} #first_name`, "Avery"); await fill(`#${form} #phone`, "3105550142");
  if (email) await fill(`#${form} #email`, "avery@example.test");
  await click(`#${form} #consent_calls`);
}
async function answerQuiz() {
  for (const key of ["1", "1", "3", "1"]) { await page.waitForSelector("#qChoices button", { timeout: 5000 }); await page.keyboard.press(key); await sleep(450); }
  await page.waitForFunction(() => document.querySelectorAll("#rSum li").length === 4 && /decides/.test(document.getElementById("rSay").textContent), null, { timeout: 5000 });
}

// ---------- disconnected (as committed): notice visible before typing; submit says nothing was sent ----------
for (const [path, form, box, email] of [["/sex-abuse-la-county/", "laneForm", "landDone", true], ["/sex-abuse-la-county/talk-to-sofia/?callback=1", "talkCb", "talkDone", false]]) {
  await check(`disconnected ${path}`, async () => {
    await open(path);
    assert.equal(await evaluate(`!document.querySelector('[data-ee-offline]').hidden`), true, "offline notice shown before entry");
    await fillContact(form, { email }); await click(`#${form} button[type=submit]`); await sleep(300);
    assert.deepEqual(await visibleState(box), ["not_sent"]);
    assert.equal(await evaluate("document.body.innerText.includes('Your request is saved')"), false);
  });
}
// ---------- consent is required ----------
await check("call consent required", async () => {
  await open("/sex-abuse-la-county/?ep=good");
  await fill("#laneForm #first_name", "Avery"); await fill("#laneForm #phone", "3105550142"); await fill("#laneForm #email", "avery@example.test");
  const before = posted.length;
  await click("#laneForm button[type=submit]"); await sleep(300);
  assert.equal(posted.length, before, "nothing posted without the call consent box");
  assert.match(await evaluate("document.getElementById('consent_calls-e').textContent"), /check this box/);
  assert.equal(await evaluate("document.getElementById('consent_calls').checked || document.getElementById('consent_sms').checked"), false, "both boxes start unchecked");
});
// ---------- exact receipt: saved; every wrong receipt: not saved ----------
await check("landing exact receipt → saved", async () => {
  await open("/sex-abuse-la-county/?ep=good");
  assert.equal(await evaluate("document.querySelector('[data-ee-offline]').hidden"), true);
  await fillContact("laneForm", { email: true }); await click("#laneForm button[type=submit]"); await sleep(600);
  assert.deepEqual(await visibleState("landDone"), ["saved"]);
  const last = posted[posted.length - 1].body;
  assert.deepEqual([last.schema, last.campaign_id, last.page_path, last.answers.length, last.consent.calls, last.consent.sms, last.consent.calls_text_sha256.length], ["btl.abuse.intake/v1", "btl-ca-abuse-la-county-v1", "/sex-abuse-la-county/", 0, true, false, 64]);
});
for (const variant of ["wrongsub", "badlead", "dispatch", "noconsent", "schema", "campaign", "notsaved", "qualified", "http500"]) {
  await check(`landing wrong receipt (${variant}) → not saved`, async () => {
    await open(`/sex-abuse-la-county/?ep=${variant}`);
    await fillContact("laneForm", { email: true }); await click("#laneForm button[type=submit]"); await sleep(600);
    assert.deepEqual(await visibleState("landDone"), []);
    assert.match(await statusText(), /couldn’t confirm/);
    assert.equal(await evaluate("window.dataLayer.some(e=>e.event==='ee_lead_saved')"), false);
  });
}
await check("retry keeps the same submission id; edited content gets a new one", async () => {
  await open("/sex-abuse-la-county/?ep=http500");
  await fillContact("laneForm", { email: true });
  await click("#laneForm button[type=submit]"); await sleep(500); await click("#laneForm button[type=submit]"); await sleep(500);
  const [a, b] = posted.slice(-2).map((p) => p.body.submission_id);
  assert.equal(a, b);
  await fill("#laneForm #first_name", "Avery J"); await click("#laneForm button[type=submit]"); await sleep(500);
  assert.notEqual(posted[posted.length - 1].body.submission_id, a);
});
// ---------- quiz: four approved answers → summary without verdict → contact → saved with answers ----------
await check("quiz → summary → saved with four question IDs", async () => {
  await open("/sex-abuse-la-county/quiz/?ep=good");
  await answerQuiz(); await sleep(600); // the summary line is typed in after a short pause
  const text = await evaluate("document.getElementById('rSay').textContent + ' ' + document.getElementById('rSum').innerText");
  assert.equal(await evaluate("document.getElementById('rOutside').hidden"), true);
  assert.match(text, /Nothing on this page decides eligibility/);
  assert.doesNotMatch(text, /may potentially qualify|not be able to help|disqualif/i);
  assert.equal(await evaluate("document.querySelectorAll('#rSum li').length"), 4);
  await click("#rContinue"); await fillContact("quizForm"); await click("#quizForm button[type=submit]"); await sleep(600);
  assert.deepEqual(await visibleState("quizDone"), ["saved"]);
  const last = posted[posted.length - 1].body;
  assert.deepEqual(last.answers.map((a) => [a.question_id, a.answer_id, a.source]), [["age", "under18", "quiz"], ["where", "juvenile", "quiz"], ["when", "2005_2019", "quiz"], ["lawyer", "no", "quiz"]]);
  assert.equal(last.page_path, "/sex-abuse-la-county/quiz/");
});
await check("quiz cannot submit without all answers", async () => {
  await open("/sex-abuse-la-county/quiz/?ep=good");
  const before = posted.length;
  await evaluate("document.getElementById('contactStep').hidden=false;document.getElementById('qStep').hidden=true;document.getElementById('resultStep').hidden=true");
  await fillContact("quizForm"); await click("#quizForm button[type=submit]"); await sleep(300);
  assert.equal(posted.length, before); assert.match(await statusText(), /answer each question/);
});
// ---------- unverified phone line: no call link, pending note visible ----------
await check("no call links while the line is unverified", async () => {
  for (const p of ["/sex-abuse-la-county/", "/sex-abuse-la-county/quiz/", "/sex-abuse-la-county/talk-to-sofia/"]) {
    await open(p);
    assert.equal(await evaluate("[...document.querySelectorAll('a[data-ee-tel]')].some(a=>!a.hidden || a.getAttribute('href'))"), false, p);
    assert.equal(await evaluate("[...document.querySelectorAll('[data-ee-call-pending]')].some(e=>!e.hidden)"), true, p);
    assert.equal(await evaluate("document.body.innerHTML.includes('932-9700')"), false, p);
  }
});
await check("voice-first preview has a disabled primary action and secondary closed callback", async () => {
  await open('/sex-abuse-la-county/talk-to-sofia/');
  assert.equal(await page.isVisible('#voiceUnavailable'), true);
  assert.equal(await page.isDisabled('#voiceUnavailable'), true);
  assert.equal(await evaluate("document.getElementById('cbPanel').hidden"), true);
  assert.match(await page.textContent('#openCb'), /callback instead/i);
  assert.equal(await page.locator('[src*="phillips-logo"]').count(), 0);
  assert.equal(await page.evaluate(()=>document.getElementById('heroH').getBoundingClientRect().right+8 <= document.querySelector('.portrait').getBoundingClientRect().left), true, 'heading clears the mobile portrait');
  await click('#openCb');
  assert.equal(await evaluate("document.getElementById('cbPanel').hidden"), false);
});
await check("all campaign pages use a plain firm wordmark without the product thumbnail", async () => {
  for (const p of ['/sex-abuse-la-county/','/sex-abuse-la-county/quiz/','/sex-abuse-la-county/talk-to-sofia/']) {
    await open(p);
    assert.equal(await page.locator('img[src*="phillips-logo"],link[href*="phillips-logo"]').count(), 0);
    assert.match(await page.textContent('.brand .wm b'), /^Phillips Law Group$/);
  }
});
// ---------- layout, accessibility basics and screenshots at 375, 768 and 1440 ----------
await check('form and quiz have distinct palettes and readable text/button contrast', async()=>{
  const backgrounds=[];
  for(const path of ['/sex-abuse-la-county/','/sex-abuse-la-county/quiz/']){
    await open(path);
    const colors=await page.evaluate(()=>{const body=getComputedStyle(document.body),button=getComputedStyle(document.querySelector('.submit')||document.querySelector('.next'));return{ink:body.color,paper:body.backgroundColor,buttonInk:button.color,buttonPaper:button.backgroundColor}});
    assert.ok(contrast(colors.ink,colors.paper)>=4.5,`${path} body contrast`);assert.ok(contrast(colors.buttonInk,colors.buttonPaper)>=4.5,`${path} action contrast`);backgrounds.push(colors.paper);
  }
  assert.notEqual(backgrounds[0],backgrounds[1]);
});
const sizes = [[375, 812, true], [768, 1024, true], [1440, 1000, false]];
for (const [path, name] of [["/sex-abuse-la-county/", "landing"], ["/sex-abuse-la-county/quiz/", "quiz"], ["/sex-abuse-la-county/talk-to-sofia/", "sofia"]]) {
  for (const [w, h, mobile] of sizes) {
    await check(`layout ${name} ${w}x${h}`, async () => {
      await open(path, { width: w, height: h, mobile });
      await evaluate("Promise.race([Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode().catch(()=>null);})), new Promise(r=>setTimeout(r,5000))])");
      assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true, "no horizontal overflow");
      assert.equal(await evaluate("[...document.querySelectorAll('input:not([type=hidden])')].every(i=>i.labels && i.labels.length>0)"), true, "every input has a label");
      assert.equal(await evaluate("document.querySelector('meta[name=robots]').content"), "noindex,nofollow");
      assert.equal(await evaluate("[...document.images].every(i=>i.naturalWidth>0)"), true, "every image decoded");
      if (SHOTS) { await page.screenshot({ path: join(SHOTS, `${name}-${w}x${h}.png`) }); await page.screenshot({ path: join(SHOTS, `${name}-${w}x${h}-full.png`), fullPage: true }); }
    });
  }
}
await check("no external requests, no page errors, all images 200", async () => {
  assert.deepEqual([...new Set(external)], []);
  assert.deepEqual(errors, []);
  const bad = images.filter(([, status]) => status !== 200);
  assert.deepEqual(bad, []);
  assert.ok(images.length > 0);
});

const failed = results.filter((r) => r[1] !== "pass");
const summary = { pass: results.length - failed.length, fail: failed.length, external_hosts_blocked: [...new Set(external)], images_checked: images.length, page_errors: errors.length, posts_to_local_fake: posted.length, shots: SHOTS || null };
for (const r of results) console.log(r.join(" | "));
console.log(JSON.stringify(summary));
if (SHOTS) await writeFile(join(SHOTS, "receipt.json"), JSON.stringify({ results, summary }, null, 2));
await browser.close(); server.close();
process.exitCode = failed.length ? 1 : 0;
