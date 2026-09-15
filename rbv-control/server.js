import { createServer } from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import * as z from "zod/v4";

const PORT = Number(process.env.PORT || 10000);
const VERSION = "0.3.0";
const CANONICAL_URL = "https://rbvvolleyball.tonedntasty.com";
const RENDER_URL = "https://rbv-volleyball.onrender.com";
const CONTROL_URL = "https://rbv-control.onrender.com";
const REPO = "marketingapes/domains";
const BRANCH = "feat/rbv-volleyball-render-migration-20260914";
const SITE_ROOT = "rbvvolleyball/site";
const START_HERE_PATH = "rbvvolleyball/00-START-HERE.md";
const GITHUB_TOKEN = process.env.RBV_GITHUB_TOKEN || "";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const UPLOAD_TTL_SECONDS = 15 * 60;

const CALENDARS = [
  { team: "Varsity", id: "2ff3b121ca7e7eb913a0cd42259e24a2b857eeafb3110033e1b54ebb6376814c@group.calendar.google.com" },
  { team: "JV", id: "b0ff9fd02b1a009c367b418c3fe6858ff6b47ca81d4dcc2a26cc14dda091ff6d@group.calendar.google.com" },
  { team: "Frosh", id: "db439e7e18e3d3ba95266d5870eae7e1d2b88ba982f58765c894a49ee2faee4e@group.calendar.google.com" },
];
const MIME_EXT = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function result(body, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(body) }],
    structuredContent: body,
    ...(isError ? { isError: true } : {}),
  };
}
function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function safeHtmlPage(page, { allowIndex = true } = {}) {
  const clean = String(page || "").trim().replace(/^\/+/, "");
  if (!/^[a-z0-9][a-z0-9-]{0,63}\.html$/.test(clean)) throw new Error("invalid_page_name");
  if (!allowIndex && clean === "index.html") throw new Error("index_page_reserved");
  return clean;
}
function safeImagePath(asset) {
  const clean = String(asset || "").trim().replace(/^\/+/, "");
  if (!/^images\/[a-z0-9][a-z0-9._-]{0,120}\.(?:jpe?g|png|webp)$/i.test(clean)) throw new Error("invalid_image_path");
  if (clean.includes("..")) throw new Error("invalid_image_path");
  return clean;
}
function safeStem(value = "photo") {
  const stem = String(value || "photo")
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return stem || "photo";
}
function validateBodyHtml(html) {
  const text = String(html || "");
  if (/<\s*(script|iframe|object|embed)\b/i.test(text) || /javascript\s*:/i.test(text)) {
    throw new Error("unsafe_html_blocked");
  }
  return text;
}
function ghHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "rbv-control",
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}
async function ghJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...ghHeaders(), ...(options.headers || {}) },
    signal: options.signal || AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}
async function readRepoFile(repoPath, ref = BRANCH) {
  const url = `https://api.github.com/repos/${REPO}/contents/${repoPath}?ref=${encodeURIComponent(ref)}`;
  const { response, data } = await ghJson(url);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`github_read_${response.status}`);
  return {
    path: repoPath,
    sha: data.sha,
    bytes: Buffer.from(data.content || "", "base64"),
    html_url: data.html_url || null,
  };
}
async function listRepoDirectory(repoPath, ref = BRANCH) {
  const url = `https://api.github.com/repos/${REPO}/contents/${repoPath}?ref=${encodeURIComponent(ref)}`;
  const { response, data } = await ghJson(url);
  if (!response.ok) throw new Error(`github_list_${response.status}`);
  if (!Array.isArray(data)) throw new Error("github_list_invalid");
  return data;
}
async function writeRepoFile({ repoPath, bytes, sha = null, message }) {
  if (!GITHUB_TOKEN) throw new Error("write_not_configured");
  const url = `https://api.github.com/repos/${REPO}/contents/${repoPath}`;
  const body = {
    message,
    content: Buffer.from(bytes).toString("base64"),
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  };
  const { response, data } = await ghJson(url, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`github_write_${response.status}:${data?.message || "unknown"}`);
  return {
    commit_sha: data?.commit?.sha || null,
    content_sha: data?.content?.sha || null,
    html_url: data?.content?.html_url || null,
  };
}
async function readGithubPage(page, ref = BRANCH) {
  const p = safeHtmlPage(page);
  const file = await readRepoFile(`${SITE_ROOT}/${p}`, ref);
  if (!file) throw new Error("page_not_found");
  return { page: p, sha: file.sha, text: file.bytes.toString("utf8") };
}
async function listGithubPages() {
  const items = await listRepoDirectory(SITE_ROOT);
  return items.filter(x => x.type === "file" && /^[a-z0-9][a-z0-9-]*\.html$/i.test(x.name)).map(x => x.name).sort();
}
async function listGithubImages() {
  const items = await listRepoDirectory(`${SITE_ROOT}/images`);
  return items.filter(x => x.type === "file" && /\.(?:jpe?g|png|webp)$/i.test(x.name)).map(x => `images/${x.name}`).sort();
}
async function ensureImageExists(asset) {
  const p = safeImagePath(asset);
  const f = await readRepoFile(`${SITE_ROOT}/${p}`);
  if (!f) throw new Error("image_not_found");
  return { path: p, sha: f.sha, size: f.bytes.length };
}
function previewReplacement(text, oldText, newText) {
  const count = text.split(oldText).length - 1;
  if (count !== 1) return { ok: false, matches: count, reason: count === 0 ? "old_text_not_found" : "old_text_not_unique" };
  const at = text.indexOf(oldText);
  const before = text.slice(Math.max(0, at - 220), at);
  const after = text.slice(at + oldText.length, Math.min(text.length, at + oldText.length + 220));
  return {
    ok: true,
    matches: 1,
    proposed: text.slice(0, at) + newText + text.slice(at + oldText.length),
    excerpt_before: before + oldText + after,
    excerpt_after: before + newText + after,
  };
}
function excerptDiff(current, target) {
  const max = Math.min(current.length, target.length);
  let i = 0;
  while (i < max && current[i] === target[i]) i += 1;
  const start = Math.max(0, i - 180);
  return {
    first_difference_offset: i,
    current_excerpt: current.slice(start, Math.min(current.length, i + 320)),
    target_excerpt: target.slice(start, Math.min(target.length, i + 320)),
  };
}
function pageUrl(page, base = CANONICAL_URL) {
  return page === "index.html" ? `${base}/` : `${base}/${page}`;
}
function imageFigure(asset, alt, caption = "") {
  const src = escapeHtml(safeImagePath(asset));
  const altText = escapeHtml(alt || "RBV Volleyball photo");
  const cap = caption ? `<figcaption style="margin-top:8px;color:#666;font-size:.92rem;">${escapeHtml(caption)}</figcaption>` : "";
  return `\n<figure class="rbv-inline-photo" style="margin:28px auto;text-align:center;max-width:900px;">\n  <img src="${src}" alt="${altText}" loading="lazy" style="display:block;width:100%;height:auto;border-radius:10px;">\n  ${cap}\n</figure>\n`;
}
function insertImageIntoPage(text, asset, alt, caption, afterText = "") {
  const figure = imageFigure(asset, alt, caption);
  if (afterText) {
    const p = previewReplacement(text, afterText, afterText + figure);
    return p.ok ? p : { ...p, proposed: null };
  }
  const marker = "</main>";
  const at = text.lastIndexOf(marker);
  if (at < 0) return { ok: false, reason: "main_close_not_found", matches: 0 };
  return {
    ok: true,
    matches: 1,
    proposed: text.slice(0, at) + figure + text.slice(at),
    excerpt_before: text.slice(Math.max(0, at - 260), Math.min(text.length, at + 80)),
    excerpt_after: text.slice(Math.max(0, at - 260), at) + figure + text.slice(at, Math.min(text.length, at + 80)),
  };
}
function insertGalleryImage(text, asset, alt) {
  const p = safeImagePath(asset);
  if (text.includes(`src="${p}"`) || text.includes(`src='${p}'`)) return { ok: false, reason: "image_already_in_gallery", matches: 1 };
  const start = text.indexOf('<div class="gallery-grid">');
  if (start < 0) return { ok: false, reason: "gallery_grid_not_found", matches: 0 };
  const close = text.indexOf("</div>", start);
  if (close < 0) return { ok: false, reason: "gallery_grid_close_not_found", matches: 0 };
  const tag = `      <img src="${escapeHtml(p)}" alt="${escapeHtml(alt || "RBV Volleyball photo")}" loading="lazy" onclick="openLightbox(this)">\n`;
  return {
    ok: true,
    matches: 1,
    proposed: text.slice(0, close) + tag + text.slice(close),
    excerpt_before: text.slice(Math.max(start, close - 360), Math.min(text.length, close + 80)),
    excerpt_after: text.slice(Math.max(start, close - 360), close) + tag + text.slice(close, Math.min(text.length, close + 80)),
  };
}
function removeGalleryImage(text, asset) {
  const p = safeImagePath(asset);
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\s*<img\\b[^>]*\\bsrc=["']${escaped}["'][^>]*>\\s*`, "gi");
  const matches = [...text.matchAll(re)];
  if (matches.length !== 1) return { ok: false, reason: matches.length === 0 ? "image_not_in_gallery" : "image_reference_not_unique", matches: matches.length };
  const m = matches[0];
  const proposed = text.slice(0, m.index) + "\n" + text.slice(m.index + m[0].length);
  return {
    ok: true,
    matches: 1,
    proposed,
    excerpt_before: text.slice(Math.max(0, m.index - 260), Math.min(text.length, m.index + m[0].length + 260)),
    excerpt_after: proposed.slice(Math.max(0, m.index - 260), Math.min(proposed.length, m.index + 260)),
  };
}
function standardNav(active = "") {
  const rows = [
    ["index.html", "Home"], ["schedule.html", "Schedule"], ["forms.html", "Forms"],
    ["parent-playbook.html", "Parent Playbook"], ["gallery.html", "Gallery"], ["booster-club.html", "Booster Club"],
  ];
  return rows.map(([href, label]) => `          <li><a href="${href}"${href === active ? ' class="active"' : ""}>${label}</a></li>`).join("\n");
}
function buildStandardPage({ filename, title, description, heading, subheading, bodyHtml }) {
  const page = safeHtmlPage(filename, { allowIndex: false });
  const body = validateBodyHtml(bodyHtml);
  const t = escapeHtml(title);
  const d = escapeHtml(description || `${title} | RBV Volleyball`);
  const h = escapeHtml(heading || title);
  const sub = escapeHtml(subheading || "Rancho Buena Vista High School Longhorns");
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${t} | RBV Volleyball | Rancho Buena Vista High</title>\n  <meta name="description" content="${d}">\n  <meta name="robots" content="index, follow">\n  <meta name="theme-color" content="#692530">\n  <link rel="canonical" href="${CANONICAL_URL}/${page}">\n  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-WTQSXG');</script>\n  <link rel="stylesheet" href="css/style.css?v=aug10">\n  <link rel="icon" type="image/png" href="images/rbv-logo.png">\n  <link rel="apple-touch-icon" href="images/rbv-logo.png">\n</head>\n<body>\n  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WTQSXG" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n  <header class="site-header">\n    <div class="header-inner">\n      <div class="logo-area"><img src="images/rbv-logo.png" alt="RBV Volleyball logo — Rancho Buena Vista High School Longhorns" width="42" height="42"><span>RBV Volleyball</span></div>\n      <button class="nav-toggle" aria-label="Toggle navigation" onclick="document.querySelector('.main-nav').classList.toggle('open')">&#9776;</button>\n      <nav class="main-nav"><ul>\n${standardNav(page)}\n      </ul></nav>\n    </div>\n  </header>\n  <section class="hero hero-banner hero-banner-page">\n    <div class="hero-overlay"></div>\n    <img src="images/team-huddle-3.jpg" alt="RBV Volleyball team at Rancho Buena Vista High School" class="hero-bg" width="1600" height="900">\n    <div class="hero-text"><h1>${h}</h1><p>${sub}</p></div>\n  </section>\n  <main class="content">\n${body}\n  </main>\n  <footer class="site-footer">\n    <div class="footer-links"><a href="index.html">Home</a><a href="schedule.html">Schedule</a><a href="forms.html">Forms</a><a href="parent-playbook.html">Parent Playbook</a><a href="gallery.html">Gallery</a><a href="booster-club.html">Booster Club</a><a href="https://www.instagram.com/rbvvolleyball/" target="_blank" rel="noopener">Instagram</a></div>\n    <p>&copy; 2026 RBV Longhorn Volleyball &bull; Rancho Buena Vista High School</p>\n    <p style="margin-top:8px;"><a href="request-changes.html" style="font-size:0.75rem; opacity:0.5;">Request Site Changes</a></p>\n  </footer>\n  <script src="js/main.js?v=aug10"></script>\n</body>\n</html>\n`;
}
async function addPageToSitemap(page) {
  const sitemapPath = `${SITE_ROOT}/sitemap.xml`;
  const f = await readRepoFile(sitemapPath);
  if (!f) return { status: "SKIPPED", reason: "sitemap_missing" };
  const text = f.bytes.toString("utf8");
  const loc = `${CANONICAL_URL}/${page}`;
  if (text.includes(loc)) return { status: "UNCHANGED" };
  const marker = "</urlset>";
  if (!text.includes(marker)) return { status: "SKIPPED", reason: "sitemap_invalid" };
  const block = `  <url>\n    <loc>${loc}</loc>\n  </url>\n`;
  const next = text.replace(marker, block + marker);
  const w = await writeRepoFile({ repoPath: sitemapPath, bytes: Buffer.from(next), sha: f.sha, message: `RBV: add ${page} to sitemap` });
  return { status: "UPDATED", commit_sha: w.commit_sha };
}
async function recordHistory(title, bullets = []) {
  try {
    const f = await readRepoFile(START_HERE_PATH);
    if (!f) return { status: "SKIPPED", reason: "start_here_missing" };
    const text = f.bytes.toString("utf8");
    const marker = "Append newest entries at the top of this section. Preserve prior entries.";
    const at = text.indexOf(marker);
    if (at < 0) return { status: "SKIPPED", reason: "history_marker_missing" };
    const insertAt = at + marker.length;
    const date = new Date().toISOString().slice(0, 10);
    const entry = `\n\n## ${date} — ${title}\n\n${bullets.map(b => `- ${b}`).join("\n")}\n`;
    const next = text.slice(0, insertAt) + entry + text.slice(insertAt);
    const w = await writeRepoFile({ repoPath: START_HERE_PATH, bytes: Buffer.from(next), sha: f.sha, message: `RBV history: ${title}` });
    return { status: "RECORDED", commit_sha: w.commit_sha };
  } catch (e) {
    return { status: "FAILED", error: String(e.message || e) };
  }
}

function uploadSigningKey() {
  if (!GITHUB_TOKEN) return null;
  return createHmac("sha256", GITHUB_TOKEN).update("rbv-upload-link-v1").digest();
}
function b64url(data) {
  return Buffer.from(data).toString("base64url");
}
function makeUploadToken(payload) {
  const key = uploadSigningKey();
  if (!key) throw new Error("write_not_configured");
  const raw = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", key).update(raw).digest("base64url");
  return `${raw}.${sig}`;
}
function readUploadToken(token) {
  const key = uploadSigningKey();
  if (!key) throw new Error("write_not_configured");
  const [raw, sig] = String(token || "").split(".");
  if (!raw || !sig) throw new Error("invalid_upload_token");
  const expected = createHmac("sha256", key).update(raw).digest("base64url");
  const a = Buffer.from(sig); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("invalid_upload_token");
  const payload = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  if (!payload.exp || Date.now() > payload.exp) throw new Error("upload_token_expired");
  if (!/^[a-f0-9]{12}$/.test(payload.nonce || "")) throw new Error("invalid_upload_token");
  return payload;
}
async function findUploadedAsset(uploadId) {
  if (!/^[a-f0-9]{12}$/.test(String(uploadId || ""))) throw new Error("invalid_upload_id");
  const assets = await listGithubImages();
  return assets.find(x => x.includes(`-${uploadId}.`)) || null;
}

function unfoldIcs(text) { return String(text || "").replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/); }
function unescapeIcs(value = "") { return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\"); }
function parseIcsDate(raw = "") {
  const m = raw.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", s = "00", utc] = m;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${utc ? "Z" : "-07:00"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}
function parseCalendar(text, team) {
  const events = []; let current = null;
  for (const line of unfoldIcs(text)) {
    if (line === "BEGIN:VEVENT") { current = { team }; continue; }
    if (line === "END:VEVENT") { if (current?.summary && current?.start) events.push(current); current = null; continue; }
    if (!current) continue;
    const i = line.indexOf(":"); if (i < 0) continue;
    const key = line.slice(0, i), value = line.slice(i + 1);
    if (key.startsWith("SUMMARY")) current.summary = unescapeIcs(value);
    else if (key.startsWith("LOCATION")) current.location = unescapeIcs(value);
    else if (key.startsWith("DTSTART")) current.start = parseIcsDate(value);
    else if (key.startsWith("DTEND")) current.end = parseIcsDate(value);
  }
  return events;
}
async function getSchedule() {
  const now = Date.now(), all = [], sources = [];
  for (const calendar of CALENDARS) {
    const url = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendar.id)}/public/basic.ics`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) { sources.push({ team: calendar.team, status: "unavailable", http_status: response.status }); continue; }
      const parsed = parseCalendar(await response.text(), calendar.team); all.push(...parsed); sources.push({ team: calendar.team, status: "ok", events: parsed.length });
    } catch { sources.push({ team: calendar.team, status: "unavailable" }); }
  }
  const upcoming = all.filter(e => e.start && e.start.getTime() >= now - 86400000).sort((a,b) => a.start-b.start).slice(0,30).map(e => ({ team:e.team, title:e.summary, start:e.start.toISOString(), ...(e.end?{end:e.end.toISOString()}:{}), ...(e.location?{location:e.location}:{}) }));
  return { source: "Google Calendar public ICS", sources, upcoming };
}
async function probe(url) {
  try {
    const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000) });
    const t = await r.text();
    const title = t.match(/<title>([^<]{1,200})<\/title>/i)?.[1]?.trim();
    return { url, reachable: r.ok, http_status: r.status, ...(title ? { title } : {}) };
  } catch {
    return { url, reachable: false };
  }
}

const pageNameSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}\.html$/);
const imagePathSchema = z.string().regex(/^images\/[a-z0-9][a-z0-9._-]{0,120}\.(?:jpg|jpeg|png|webp)$/i);
const confirmPublish = z.literal("PUBLISH");

const mcpHandler = createMcpHandler(() => {
  const server = new McpServer({ name: "rbv-volleyball-control", version: VERSION }, { instructions:
    "RBV Volleyball assistant for Lindsay. RBV-only. Read tools are safe. Every visible website change is preview-first and requires Lindsay's explicit approval in the current conversation before a publish tool is called. New photo uploads use a short-lived signed upload link; uploading the binary alone does not add it to a page or gallery. Never claim a change is live unless a publish tool returned a commit SHA and the deployed site was verified. Calendar is read-only. Never touch any non-RBV tenant." });

  server.registerTool("rbv_status", {
    title: "Check RBV website operator status",
    description: "Check canonical and Render site status, write configuration, and RBV operator capabilities.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async () => result({
    domain: "rbvvolleyball.tonedntasty.com",
    version: VERSION,
    mode: GITHUB_TOKEN ? "safe_operator" : "preview_only",
    github_repo: REPO,
    github_branch: BRANCH,
    write_configured: !!GITHUB_TOKEN,
    capabilities: ["update_page", "create_page", "upload_photo", "add_image_to_page", "gallery_add", "gallery_remove", "history", "rollback", "schedule_read"],
    endpoints: await Promise.all([probe(CANONICAL_URL), probe(RENDER_URL)]),
  }));

  server.registerTool("rbv_list_pages", {
    title: "List RBV website pages",
    description: "List current RBV HTML pages from GitHub, including pages created later.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async () => { try { const pages = await listGithubPages(); return result({ pages: pages.map(path => ({ path, url: pageUrl(path) })) }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_list_gallery_assets", {
    title: "List RBV site images",
    description: "List current RBV image assets from GitHub.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async () => { try { return result({ assets: await listGithubImages(), gallery_page: `${CANONICAL_URL}/gallery.html` }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_upcoming_schedule", {
    title: "Read RBV upcoming schedule",
    description: "Read upcoming Varsity, JV, and Frosh events. Read-only.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async () => result(await getSchedule()));

  server.registerTool("rbv_draft_change_request", {
    title: "Draft an RBV website change request",
    description: "Structure a requested RBV website change without publishing anything.",
    inputSchema: z.object({ request: z.string().min(3).max(4000), page: z.string().max(200).optional(), asset_names: z.array(z.string().max(200)).max(20).optional() }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ request, page, asset_names = [] }) => result({ status: "DRAFT_ONLY", request, target_page: page || "auto-select", assets: asset_names, published: false }));

  server.registerTool("rbv_get_page", {
    title: "Read an RBV page source",
    description: "Read current GitHub HTML for one RBV root page so a safe edit can be prepared.",
    inputSchema: z.object({ page: pageNameSchema }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ page }) => { try { const f = await readGithubPage(page); return result({ page: f.page, sha: f.sha, content: f.text }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_preview_text_change", {
    title: "Preview an RBV page text or HTML change",
    description: "Preview one exact replacement on an RBV page. Does not write. old_text must appear exactly once.",
    inputSchema: z.object({ page: pageNameSchema, old_text: z.string().min(1).max(20000), new_text: z.string().max(20000), reason: z.string().max(500).optional() }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ page, old_text, new_text, reason }) => { try { const f = await readGithubPage(page); const p = previewReplacement(f.text, old_text, new_text); if (!p.ok) return result({ status: "PREVIEW_BLOCKED", page, base_sha: f.sha, ...p }, true); return result({ status: "PREVIEW_READY", page, base_sha: f.sha, reason: reason || null, matches: 1, excerpt_before: p.excerpt_before, excerpt_after: p.excerpt_after, publish_instruction: "Ask Lindsay to approve this exact preview, then call rbv_publish_text_change with confirmation PUBLISH." }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_publish_text_change", {
    title: "Publish an approved RBV page change",
    description: "Publish one exact approved replacement. Requires confirmation=PUBLISH and the matching base SHA from preview.",
    inputSchema: z.object({ page: pageNameSchema, old_text: z.string().min(1).max(20000), new_text: z.string().max(20000), base_sha: z.string().min(20).max(100), confirmation: confirmPublish, commit_message: z.string().min(5).max(200) }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ page, old_text, new_text, base_sha, confirmation, commit_message }) => { try { if (confirmation !== "PUBLISH") return result({ status: "BLOCKED", reason: "explicit_publish_confirmation_required" }, true); const f = await readGithubPage(page); if (f.sha !== base_sha) return result({ status: "BLOCKED", reason: "source_changed_since_preview", current_sha: f.sha, preview_sha: base_sha }, true); const p = previewReplacement(f.text, old_text, new_text); if (!p.ok) return result({ status: "BLOCKED", ...p }, true); const w = await writeRepoFile({ repoPath: `${SITE_ROOT}/${page}`, bytes: Buffer.from(p.proposed), sha: f.sha, message: commit_message }); const history = await recordHistory(`Page updated: ${page}`, [`Published approved page change.`, `Content commit: \`${w.commit_sha}\`.`]); return result({ status: "PUBLISHED", page, commit_sha: w.commit_sha, history, render_url: pageUrl(page, RENDER_URL), note: "Render auto-deploy is enabled; verify the deployed page before calling the canonical site live." }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_preview_new_page", {
    title: "Preview a new RBV page",
    description: "Build and preview a new RBV page using the existing RBV header, navigation, styling, GTM, and footer. Does not write.",
    inputSchema: z.object({ filename: pageNameSchema, title: z.string().min(2).max(120), description: z.string().max(240).optional(), heading: z.string().max(160).optional(), subheading: z.string().max(240).optional(), body_html: z.string().min(1).max(40000), include_in_sitemap: z.boolean().optional() }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async (args) => { try { const page = safeHtmlPage(args.filename, { allowIndex: false }); const existing = await readRepoFile(`${SITE_ROOT}/${page}`); if (existing) return result({ status: "PREVIEW_BLOCKED", reason: "page_already_exists", page }, true); const html = buildStandardPage({ filename: page, title: args.title, description: args.description, heading: args.heading, subheading: args.subheading, bodyHtml: args.body_html }); return result({ status: "PREVIEW_READY", page, url: pageUrl(page), include_in_sitemap: args.include_in_sitemap !== false, html, publish_instruction: "Show Lindsay this page preview/summary. After explicit approval call rbv_publish_new_page with confirmation PUBLISH and the same content." }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_publish_new_page", {
    title: "Publish an approved new RBV page",
    description: "Create a new RBV root HTML page after explicit preview approval. Optionally adds it to sitemap.xml.",
    inputSchema: z.object({ filename: pageNameSchema, title: z.string().min(2).max(120), description: z.string().max(240).optional(), heading: z.string().max(160).optional(), subheading: z.string().max(240).optional(), body_html: z.string().min(1).max(40000), include_in_sitemap: z.boolean().optional(), confirmation: confirmPublish, commit_message: z.string().min(5).max(200) }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async (args) => { try { if (args.confirmation !== "PUBLISH") return result({ status: "BLOCKED", reason: "explicit_publish_confirmation_required" }, true); const page = safeHtmlPage(args.filename, { allowIndex: false }); const existing = await readRepoFile(`${SITE_ROOT}/${page}`); if (existing) return result({ status: "BLOCKED", reason: "page_already_exists", page }, true); const html = buildStandardPage({ filename: page, title: args.title, description: args.description, heading: args.heading, subheading: args.subheading, bodyHtml: args.body_html }); const w = await writeRepoFile({ repoPath: `${SITE_ROOT}/${page}`, bytes: Buffer.from(html), message: args.commit_message }); const sitemap = args.include_in_sitemap === false ? { status: "SKIPPED" } : await addPageToSitemap(page); const history = await recordHistory(`Page created: ${page}`, [`Created new RBV page.`, `Content commit: \`${w.commit_sha}\`.`, `Sitemap: ${sitemap.status}.`]); return result({ status: "PUBLISHED", page, commit_sha: w.commit_sha, sitemap, history, render_url: pageUrl(page, RENDER_URL), note: "The page exists on the RBV Render source. Add navigation links separately if desired." }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_prepare_photo_upload", {
    title: "Prepare a secure RBV photo upload",
    description: "Create a short-lived upload link for Lindsay to choose a JPG, PNG, or WEBP photo from her device. Creating the link does not change the website.",
    inputSchema: z.object({ filename_hint: z.string().min(1).max(120), alt_text: z.string().max(300).optional() }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async ({ filename_hint, alt_text }) => { try { if (!GITHUB_TOKEN) return result({ status: "BLOCKED", reason: "RBV_GITHUB_TOKEN_not_configured" }, true); const nonce = randomBytes(6).toString("hex"); const payload = { nonce, stem: safeStem(filename_hint), alt: String(alt_text || "").slice(0, 300), exp: Date.now() + UPLOAD_TTL_SECONDS * 1000 }; const token = makeUploadToken(payload); return result({ status: "UPLOAD_LINK_READY", upload_id: nonce, expires_at: new Date(payload.exp).toISOString(), upload_url: `${CONTROL_URL}/upload/${token}`, instructions: "Send this link to Lindsay. She clicks it, chooses one image, and presses Upload. After she says it is done, call rbv_upload_status with the upload_id. The photo is not added to a page or gallery until a separate preview and publish step." }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_upload_status", {
    title: "Check an RBV photo upload",
    description: "Check whether a photo from a prepared upload link has been committed to the RBV image folder.",
    inputSchema: z.object({ upload_id: z.string().regex(/^[a-f0-9]{12}$/) }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ upload_id }) => { try { const asset = await findUploadedAsset(upload_id); return result(asset ? { status: "UPLOADED", upload_id, asset_path: asset, render_url: `${RENDER_URL}/${asset}` } : { status: "WAITING", upload_id }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_preview_add_image_to_page", {
    title: "Preview adding an image to an RBV page",
    description: "Preview adding an existing RBV image to a page. Use after_text for precise placement; omit it to add the image near the end of main content.",
    inputSchema: z.object({ page: pageNameSchema, asset_path: imagePathSchema, alt_text: z.string().min(1).max(300), caption: z.string().max(300).optional(), after_text: z.string().max(12000).optional() }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ page, asset_path, alt_text, caption = "", after_text = "" }) => { try { await ensureImageExists(asset_path); const f = await readGithubPage(page); const p = insertImageIntoPage(f.text, asset_path, alt_text, caption, after_text); if (!p.ok) return result({ status: "PREVIEW_BLOCKED", page, base_sha: f.sha, ...p }, true); return result({ status: "PREVIEW_READY", page, base_sha: f.sha, asset_path, excerpt_before: p.excerpt_before, excerpt_after: p.excerpt_after, publish_instruction: "Ask Lindsay to approve this exact placement, then call rbv_publish_add_image_to_page." }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_publish_add_image_to_page", {
    title: "Publish an approved image placement on an RBV page",
    description: "Add an existing RBV image to a page after exact preview approval.",
    inputSchema: z.object({ page: pageNameSchema, asset_path: imagePathSchema, alt_text: z.string().min(1).max(300), caption: z.string().max(300).optional(), after_text: z.string().max(12000).optional(), base_sha: z.string().min(20).max(100), confirmation: confirmPublish, commit_message: z.string().min(5).max(200) }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ page, asset_path, alt_text, caption = "", after_text = "", base_sha, confirmation, commit_message }) => { try { if (confirmation !== "PUBLISH") return result({ status: "BLOCKED", reason: "explicit_publish_confirmation_required" }, true); await ensureImageExists(asset_path); const f = await readGithubPage(page); if (f.sha !== base_sha) return result({ status: "BLOCKED", reason: "source_changed_since_preview", current_sha: f.sha, preview_sha: base_sha }, true); const p = insertImageIntoPage(f.text, asset_path, alt_text, caption, after_text); if (!p.ok) return result({ status: "BLOCKED", ...p }, true); const w = await writeRepoFile({ repoPath: `${SITE_ROOT}/${page}`, bytes: Buffer.from(p.proposed), sha: f.sha, message: commit_message }); const history = await recordHistory(`Image added to page: ${page}`, [`Asset: \`${asset_path}\`.`, `Content commit: \`${w.commit_sha}\`.`]); return result({ status: "PUBLISHED", page, asset_path, commit_sha: w.commit_sha, history, render_url: pageUrl(page, RENDER_URL) }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_preview_gallery_add", {
    title: "Preview adding a photo to the RBV gallery",
    description: "Preview adding an existing RBV image asset to gallery.html.",
    inputSchema: z.object({ asset_path: imagePathSchema, alt_text: z.string().min(1).max(300) }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ asset_path, alt_text }) => { try { await ensureImageExists(asset_path); const f = await readGithubPage("gallery.html"); const p = insertGalleryImage(f.text, asset_path, alt_text); if (!p.ok) return result({ status: "PREVIEW_BLOCKED", base_sha: f.sha, ...p }, true); return result({ status: "PREVIEW_READY", page: "gallery.html", base_sha: f.sha, asset_path, excerpt_before: p.excerpt_before, excerpt_after: p.excerpt_after, publish_instruction: "Ask Lindsay to approve this exact gallery addition, then call rbv_publish_gallery_add." }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_publish_gallery_add", {
    title: "Publish an approved RBV gallery photo",
    description: "Add an existing RBV image asset to gallery.html after explicit preview approval.",
    inputSchema: z.object({ asset_path: imagePathSchema, alt_text: z.string().min(1).max(300), base_sha: z.string().min(20).max(100), confirmation: confirmPublish, commit_message: z.string().min(5).max(200) }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ asset_path, alt_text, base_sha, confirmation, commit_message }) => { try { if (confirmation !== "PUBLISH") return result({ status: "BLOCKED", reason: "explicit_publish_confirmation_required" }, true); await ensureImageExists(asset_path); const f = await readGithubPage("gallery.html"); if (f.sha !== base_sha) return result({ status: "BLOCKED", reason: "source_changed_since_preview", current_sha: f.sha, preview_sha: base_sha }, true); const p = insertGalleryImage(f.text, asset_path, alt_text); if (!p.ok) return result({ status: "BLOCKED", ...p }, true); const w = await writeRepoFile({ repoPath: `${SITE_ROOT}/gallery.html`, bytes: Buffer.from(p.proposed), sha: f.sha, message: commit_message }); const history = await recordHistory("Gallery photo added", [`Asset: \`${asset_path}\`.`, `Content commit: \`${w.commit_sha}\`.`]); return result({ status: "PUBLISHED", page: "gallery.html", asset_path, commit_sha: w.commit_sha, history, render_url: `${RENDER_URL}/gallery.html` }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_preview_gallery_remove", {
    title: "Preview removing a photo from the RBV gallery",
    description: "Preview removing one image reference from gallery.html. The image file itself is not deleted.",
    inputSchema: z.object({ asset_path: imagePathSchema }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ asset_path }) => { try { const f = await readGithubPage("gallery.html"); const p = removeGalleryImage(f.text, asset_path); if (!p.ok) return result({ status: "PREVIEW_BLOCKED", base_sha: f.sha, ...p }, true); return result({ status: "PREVIEW_READY", page: "gallery.html", base_sha: f.sha, asset_path, excerpt_before: p.excerpt_before, excerpt_after: p.excerpt_after, note: "The binary image stays in the RBV image library for rollback/reuse.", publish_instruction: "Ask Lindsay to approve this exact gallery removal, then call rbv_publish_gallery_remove." }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_publish_gallery_remove", {
    title: "Publish an approved RBV gallery removal",
    description: "Remove one approved image reference from gallery.html without deleting the image file.",
    inputSchema: z.object({ asset_path: imagePathSchema, base_sha: z.string().min(20).max(100), confirmation: confirmPublish, commit_message: z.string().min(5).max(200) }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ asset_path, base_sha, confirmation, commit_message }) => { try { if (confirmation !== "PUBLISH") return result({ status: "BLOCKED", reason: "explicit_publish_confirmation_required" }, true); const f = await readGithubPage("gallery.html"); if (f.sha !== base_sha) return result({ status: "BLOCKED", reason: "source_changed_since_preview", current_sha: f.sha, preview_sha: base_sha }, true); const p = removeGalleryImage(f.text, asset_path); if (!p.ok) return result({ status: "BLOCKED", ...p }, true); const w = await writeRepoFile({ repoPath: `${SITE_ROOT}/gallery.html`, bytes: Buffer.from(p.proposed), sha: f.sha, message: commit_message }); const history = await recordHistory("Gallery photo removed", [`Removed gallery reference for \`${asset_path}\`; binary asset retained.`, `Content commit: \`${w.commit_sha}\`.`]); return result({ status: "PUBLISHED", page: "gallery.html", asset_path, binary_deleted: false, commit_sha: w.commit_sha, history, render_url: `${RENDER_URL}/gallery.html` }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_history", {
    title: "Read RBV website change history",
    description: "Read recent GitHub commits for one RBV page or the RBV site directory. Use before choosing a rollback point.",
    inputSchema: z.object({ page: pageNameSchema.optional(), limit: z.number().int().min(1).max(30).optional() }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ page, limit = 15 }) => { try { const path = page ? `${SITE_ROOT}/${safeHtmlPage(page)}` : SITE_ROOT; const url = `https://api.github.com/repos/${REPO}/commits?sha=${encodeURIComponent(BRANCH)}&path=${encodeURIComponent(path)}&per_page=${limit}`; const { response, data } = await ghJson(url); if (!response.ok || !Array.isArray(data)) throw new Error(`github_history_${response.status}`); return result({ path, commits: data.map(c => ({ sha: c.sha, message: c.commit?.message || "", date: c.commit?.committer?.date || null, author: c.commit?.author?.name || null, url: c.html_url || null })) }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_preview_rollback", {
    title: "Preview rolling back an RBV page",
    description: "Preview restoring one RBV HTML page to its contents at an earlier Git commit. Does not write.",
    inputSchema: z.object({ page: pageNameSchema, target_commit_sha: z.string().min(7).max(64) }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ page, target_commit_sha }) => { try { const current = await readGithubPage(page); const target = await readGithubPage(page, target_commit_sha); const diff = excerptDiff(current.text, target.text); return result({ status: "PREVIEW_READY", page, current_base_sha: current.sha, target_commit_sha, current_size: current.text.length, target_size: target.text.length, ...diff, publish_instruction: "Show Lindsay this rollback preview and the target commit. Only after explicit approval call rbv_publish_rollback with confirmation ROLLBACK." }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  server.registerTool("rbv_publish_rollback", {
    title: "Publish an approved RBV page rollback",
    description: "Restore one RBV HTML page to an earlier Git commit after explicit rollback approval. Creates a new forward commit; it does not rewrite Git history.",
    inputSchema: z.object({ page: pageNameSchema, target_commit_sha: z.string().min(7).max(64), current_base_sha: z.string().min(20).max(100), confirmation: z.literal("ROLLBACK"), commit_message: z.string().min(5).max(200).optional() }),
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  }, async ({ page, target_commit_sha, current_base_sha, confirmation, commit_message }) => { try { if (confirmation !== "ROLLBACK") return result({ status: "BLOCKED", reason: "explicit_rollback_confirmation_required" }, true); const current = await readGithubPage(page); if (current.sha !== current_base_sha) return result({ status: "BLOCKED", reason: "source_changed_since_preview", current_sha: current.sha, preview_sha: current_base_sha }, true); const target = await readGithubPage(page, target_commit_sha); const w = await writeRepoFile({ repoPath: `${SITE_ROOT}/${page}`, bytes: Buffer.from(target.text), sha: current.sha, message: commit_message || `RBV: rollback ${page} to ${target_commit_sha.slice(0, 12)}` }); const history = await recordHistory(`Page rolled back: ${page}`, [`Restored page content from commit \`${target_commit_sha}\`.`, `Rollback commit: \`${w.commit_sha}\`.`]); return result({ status: "PUBLISHED_ROLLBACK", page, source_commit: target_commit_sha, commit_sha: w.commit_sha, history, render_url: pageUrl(page, RENDER_URL) }); } catch (e) { return result({ status: "ERROR", error: String(e.message || e) }, true); } });

  return server;
});

const nodeMcpHandler = toNodeHandler(mcpHandler);

async function handleUploadGet(req, res, token) {
  try {
    const payload = readUploadToken(token);
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RBV Photo Upload</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#f6f3f3;color:#241d1f;margin:0;padding:28px}.card{max-width:620px;margin:40px auto;background:white;border-radius:16px;padding:26px;box-shadow:0 8px 30px rgba(0,0,0,.08)}h1{color:#692530}input,button{font:inherit}input[type=file]{display:block;width:100%;margin:20px 0;padding:12px;border:1px solid #ddd;border-radius:10px}button{background:#692530;color:white;border:0;padding:12px 18px;border-radius:10px;font-weight:700;cursor:pointer}.note{color:#666;font-size:.9rem}</style></head><body><div class="card"><h1>Upload RBV Volleyball Photo</h1><p>Choose one JPG, PNG, or WEBP image. Maximum 10 MB.</p><form method="post" enctype="multipart/form-data"><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required><button type="submit">Upload photo</button></form><p class="note">Upload ID: ${escapeHtml(payload.nonce)}. This link expires shortly and only writes to the RBV image folder.</p></div></body></html>`;
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(html);
  } catch (e) {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }); res.end(`Upload link unavailable: ${String(e.message || e)}`);
  }
}
async function handleUploadPost(req, res, token) {
  try {
    const payload = readUploadToken(token);
    const request = new Request(`${CONTROL_URL}/upload/${encodeURIComponent(token)}`, { method: "POST", headers: req.headers, body: req, duplex: "half" });
    const form = await request.formData();
    const file = form.get("photo");
    if (!file || typeof file.arrayBuffer !== "function") throw new Error("photo_required");
    const mime = String(file.type || "").toLowerCase();
    const ext = MIME_EXT.get(mime);
    if (!ext) throw new Error("unsupported_image_type");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("image_size_invalid");
    const asset = `images/${payload.stem}-${payload.nonce}.${ext}`;
    const existing = await readRepoFile(`${SITE_ROOT}/${asset}`);
    if (existing) throw new Error("upload_already_used");
    const w = await writeRepoFile({ repoPath: `${SITE_ROOT}/${asset}`, bytes, message: `RBV: upload photo ${asset}` });
    const history = await recordHistory("Photo uploaded to RBV library", [`Asset: \`${asset}\`.`, `Content commit: \`${w.commit_sha}\`.`, `Photo is not automatically placed on a page or in the gallery.`]);
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RBV Photo Uploaded</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#f6f3f3;color:#241d1f;margin:0;padding:28px}.card{max-width:620px;margin:40px auto;background:white;border-radius:16px;padding:26px;box-shadow:0 8px 30px rgba(0,0,0,.08)}h1{color:#692530}code{word-break:break-all}.ok{font-weight:700;color:#236d3a}</style></head><body><div class="card"><h1>RBV Photo Uploaded</h1><p class="ok">Upload complete.</p><p>Asset path: <code>${escapeHtml(asset)}</code></p><p>Return to Lindsay's ChatGPT conversation and say <strong>"uploaded"</strong>. The RBV app can then preview adding it to a page or the gallery.</p></div></body></html>`;
    res.writeHead(201, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-rbv-asset": asset, "x-rbv-history": history.status }); res.end(html);
  } catch (e) {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }); res.end(`Upload failed: ${String(e.message || e)}`);
  }
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/health" || url.pathname === "/") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "no-store" });
    res.end(JSON.stringify({ status: "ok", service: "rbv-volleyball-control", version: VERSION, mode: GITHUB_TOKEN ? "safe_operator" : "preview_only", write_configured: !!GITHUB_TOKEN, mcp: "/mcp" }));
    return;
  }
  if (url.pathname.startsWith("/upload/")) {
    const token = decodeURIComponent(url.pathname.slice("/upload/".length));
    if (req.method === "GET") return handleUploadGet(req, res, token);
    if (req.method === "POST") return handleUploadPost(req, res, token);
    res.writeHead(405, { "content-type": "text/plain; charset=utf-8" }); res.end("method not allowed"); return;
  }
  if (url.pathname === "/mcp") {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "content-type, authorization, mcp-session-id, mcp-protocol-version");
    res.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    await nodeMcpHandler(req, res); return;
  }
  res.writeHead(404, { "content-type": "application/json; charset=utf-8" }); res.end(JSON.stringify({ error: "not_found" }));
});

httpServer.listen(PORT, "0.0.0.0", () => console.log(`rbv-volleyball-control v${VERSION} listening on ${PORT}`));