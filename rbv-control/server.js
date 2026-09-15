import { createServer } from "node:http";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import * as z from "zod/v4";

const PORT = Number(process.env.PORT || 10000);
const CANONICAL_URL = "https://rbvvolleyball.tonedntasty.com";
const RENDER_URL = "https://rbv-volleyball.onrender.com";
const REPO = "marketingapes/domains";
const BRANCH = "feat/rbv-volleyball-render-migration-20260914";
const SITE_ROOT = "rbvvolleyball/site";
const GITHUB_TOKEN = process.env.RBV_GITHUB_TOKEN || "";

const PAGES = [
  "index.html", "schedule.html", "forms.html", "parent-playbook.html",
  "gallery.html", "booster-club.html", "flyer.html", "request-changes.html",
];
const EDITABLE_PAGES = new Set(PAGES);
const GALLERY_ASSETS = [
  "images/team-circle.jpg", "images/team-huddle-2.jpg", "images/team-huddle-3.jpg",
  "images/team-photo.jpg", "images/hero-banner.jpg", "images/rbv-logo.png",
  "images/rbv-qr-code.png", "images/picture-day-flyer.jpg",
  "images/founding-supporters-flyer.jpg", "images/flippin-pizza-logo.jpg",
  "images/american-legion-auxiliary.png",
];
const CALENDARS = [
  { team: "Varsity", id: "2ff3b121ca7e7eb913a0cd42259e24a2b857eeafb3110033e1b54ebb6376814c@group.calendar.google.com" },
  { team: "JV", id: "b0ff9fd02b1a009c367b418c3fe6858ff6b47ca81d4dcc2a26cc14dda091ff6d@group.calendar.google.com" },
  { team: "Frosh", id: "db439e7e18e3d3ba95266d5870eae7e1d2b88ba982f58765c894a49ee2faee4e@group.calendar.google.com" },
];

function result(body, isError = false) {
  return { content: [{ type: "text", text: JSON.stringify(body) }], structuredContent: body, ...(isError ? { isError: true } : {}) };
}
function safePage(page) {
  const clean = String(page || "").replace(/^\/+/, "");
  if (!EDITABLE_PAGES.has(clean)) throw new Error("page_not_allowed");
  return clean;
}
function ghHeaders(write = false) {
  const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "rbv-control" };
  if (write && GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}
async function readGithubPage(page) {
  const p = safePage(page);
  const url = `https://api.github.com/repos/${REPO}/contents/${SITE_ROOT}/${p}?ref=${encodeURIComponent(BRANCH)}`;
  const response = await fetch(url, { headers: ghHeaders(false), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`github_read_${response.status}`);
  const data = await response.json();
  return { page: p, sha: data.sha, text: Buffer.from(data.content || "", "base64").toString("utf8") };
}
async function writeGithubPage({ page, sha, text, message }) {
  if (!GITHUB_TOKEN) throw new Error("write_not_configured");
  const p = safePage(page);
  const url = `https://api.github.com/repos/${REPO}/contents/${SITE_ROOT}/${p}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(true), "content-type": "application/json" },
    body: JSON.stringify({ message, content: Buffer.from(text, "utf8").toString("base64"), sha, branch: BRANCH }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`github_write_${response.status}:${data?.message || "unknown"}`);
  return { commit_sha: data?.commit?.sha || null, content_sha: data?.content?.sha || null };
}
function previewReplacement(text, oldText, newText) {
  const count = text.split(oldText).length - 1;
  if (count !== 1) return { ok: false, matches: count, reason: count === 0 ? "old_text_not_found" : "old_text_not_unique" };
  const at = text.indexOf(oldText);
  const before = text.slice(Math.max(0, at - 180), at);
  const after = text.slice(at + oldText.length, Math.min(text.length, at + oldText.length + 180));
  return { ok: true, matches: 1, proposed: text.slice(0, at) + newText + text.slice(at + oldText.length), excerpt_before: before + oldText + after, excerpt_after: before + newText + after };
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
  try { const r = await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(8000)}); const t = await r.text(); const title=t.match(/<title>([^<]{1,200})<\/title>/i)?.[1]?.trim(); return {url,reachable:r.ok,http_status:r.status,...(title?{title}:{})}; }
  catch { return {url,reachable:false}; }
}

const mcpHandler = createMcpHandler(() => {
  const server = new McpServer({ name:"rbv-volleyball-control", version:"0.2.0" }, { instructions:
    "RBV Volleyball assistant for Lindsay. RBV-only. Read tools are safe. Website changes must always be previewed first. Never call rbv_publish_text_change unless the user has explicitly approved publishing the exact preview in the current conversation. Publishing writes only an allowlisted RBV HTML page to the RBV GitHub branch; Render auto-deploys that commit. Never claim success unless the tool returns PUBLISHED with a commit SHA. Calendar remains read-only." });

  server.registerTool("rbv_status", { title:"Check RBV website status", description:"Check canonical and GitHub-backed Render site status and whether write publishing is configured.", inputSchema:z.object({}), annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true}}, async()=>result({domain:"rbvvolleyball.tonedntasty.com",mode:GITHUB_TOKEN?"safe_operator":"preview_only",github_repo:REPO,github_branch:BRANCH,write_configured:!!GITHUB_TOKEN,endpoints:await Promise.all([probe(CANONICAL_URL),probe(RENDER_URL)])}));
  server.registerTool("rbv_list_pages", { title:"List RBV website pages", description:"List RBV pages.", inputSchema:z.object({}), annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}, async()=>result({pages:PAGES.map(path=>({path,url:path==="index.html"?`${CANONICAL_URL}/`:`${CANONICAL_URL}/${path}`}))}));
  server.registerTool("rbv_list_gallery_assets", { title:"List RBV gallery and site images", description:"List known RBV images.", inputSchema:z.object({}), annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}, async()=>result({assets:GALLERY_ASSETS,gallery_page:`${CANONICAL_URL}/gallery.html`}));
  server.registerTool("rbv_upcoming_schedule", { title:"Read RBV upcoming schedule", description:"Read upcoming Varsity, JV, and Frosh events. Read-only.", inputSchema:z.object({}), annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true}}, async()=>result(await getSchedule()));
  server.registerTool("rbv_draft_change_request", { title:"Draft an RBV website change request", description:"Structure a requested website change without publishing.", inputSchema:z.object({request:z.string().min(3).max(4000),page:z.string().max(200).optional(),asset_names:z.array(z.string().max(200)).max(20).optional()}), annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}, async({request,page,asset_names=[]})=>result({status:"DRAFT_ONLY",request,target_page:page||"auto-select",assets:asset_names,published:false,next_step:"Use preview tool with exact current and replacement text."}));

  server.registerTool("rbv_get_page", { title:"Read an RBV page source", description:"Read the current GitHub source for one allowlisted RBV HTML page so an exact safe edit can be prepared.", inputSchema:z.object({page:z.enum(PAGES)}), annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true}}, async({page})=>{ try { const f=await readGithubPage(page); return result({page:f.page,sha:f.sha,content:f.text}); } catch(e){ return result({status:"ERROR",error:String(e.message||e)},true); }});

  server.registerTool("rbv_preview_text_change", { title:"Preview an RBV text change", description:"Preview one exact text replacement on an allowlisted RBV page. Does not write. old_text must appear exactly once.", inputSchema:z.object({page:z.enum(PAGES),old_text:z.string().min(1).max(12000),new_text:z.string().max(12000),reason:z.string().max(500).optional()}), annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true}}, async({page,old_text,new_text,reason})=>{ try { const f=await readGithubPage(page); const p=previewReplacement(f.text,old_text,new_text); if(!p.ok) return result({status:"PREVIEW_BLOCKED",page,base_sha:f.sha,...p},true); return result({status:"PREVIEW_READY",page,base_sha:f.sha,reason:reason||null,matches:1,excerpt_before:p.excerpt_before,excerpt_after:p.excerpt_after,publish_instruction:"Ask the user to approve this exact preview. After explicit approval, call rbv_publish_text_change with confirmation PUBLISH."}); } catch(e){ return result({status:"ERROR",error:String(e.message||e)},true); }});

  server.registerTool("rbv_publish_text_change", { title:"Publish an approved RBV text change", description:"Publish one exact text replacement after explicit user approval. RBV-only. Requires confirmation=PUBLISH and a matching base_sha from the preview. Creates a GitHub commit; Render auto-deploys it.", inputSchema:z.object({page:z.enum(PAGES),old_text:z.string().min(1).max(12000),new_text:z.string().max(12000),base_sha:z.string().min(20).max(100),confirmation:z.literal("PUBLISH"),commit_message:z.string().min(5).max(200)}), annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true}}, async({page,old_text,new_text,base_sha,confirmation,commit_message})=>{ try { if(confirmation!=="PUBLISH") return result({status:"BLOCKED",reason:"explicit_publish_confirmation_required"},true); if(!GITHUB_TOKEN) return result({status:"BLOCKED",reason:"RBV_GITHUB_TOKEN_not_configured",human_step:"Add a fine-grained GitHub token with Contents: Read and write access only to marketingapes/domains as RBV_GITHUB_TOKEN on the rbv-control Render service."},true); const f=await readGithubPage(page); if(f.sha!==base_sha) return result({status:"BLOCKED",reason:"source_changed_since_preview",current_sha:f.sha,preview_sha:base_sha},true); const p=previewReplacement(f.text,old_text,new_text); if(!p.ok) return result({status:"BLOCKED",...p},true); const w=await writeGithubPage({page,sha:f.sha,text:p.proposed,message:commit_message}); return result({status:"PUBLISHED",page,commit_sha:w.commit_sha,content_sha:w.content_sha,render_url:page==="index.html"?`${RENDER_URL}/`:`${RENDER_URL}/${page}`,note:"Render auto-deploy is enabled. Verify the Render deploy before claiming the public custom domain is updated."}); } catch(e){ return result({status:"ERROR",error:String(e.message||e)},true); }});
  return server;
});

const nodeMcpHandler = toNodeHandler(mcpHandler);
const httpServer = createServer(async (req,res)=>{
  const url=new URL(req.url||"/",`http://${req.headers.host||"localhost"}`);
  if(url.pathname==="/health"||url.pathname==="/"){res.writeHead(200,{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*"});res.end(JSON.stringify({status:"ok",service:"rbv-volleyball-control",version:"0.2.0",mode:GITHUB_TOKEN?"safe_operator":"preview_only",write_configured:!!GITHUB_TOKEN,mcp:"/mcp"}));return;}
  if(url.pathname==="/mcp"){res.setHeader("access-control-allow-origin","*");res.setHeader("access-control-allow-headers","content-type, authorization, mcp-session-id, mcp-protocol-version");res.setHeader("access-control-allow-methods","GET, POST, DELETE, OPTIONS");if(req.method==="OPTIONS"){res.writeHead(204);res.end();return;}await nodeMcpHandler(req,res);return;}
  res.writeHead(404,{"content-type":"application/json; charset=utf-8"});res.end(JSON.stringify({error:"not_found"}));
});
httpServer.listen(PORT,"0.0.0.0",()=>console.log(`rbv-volleyball-control v0.2.0 listening on ${PORT}`));
