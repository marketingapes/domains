import { createServer } from "node:http";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import * as z from "zod/v4";

const PORT = Number(process.env.PORT || 10000);
const CANONICAL_URL = "https://rbvvolleyball.tonedntasty.com";
const STAGING_URL = "https://rbv-volleyball-staging.onrender.com";
const BRANCH = "feat/rbv-volleyball-render-migration-20260914";

const PAGES = [
  "index.html",
  "schedule.html",
  "forms.html",
  "parent-playbook.html",
  "gallery.html",
  "booster-club.html",
  "flyer.html",
  "request-changes.html",
];

const GALLERY_ASSETS = [
  "images/team-circle.jpg",
  "images/team-huddle-2.jpg",
  "images/team-huddle-3.jpg",
  "images/team-photo.jpg",
  "images/hero-banner.jpg",
  "images/rbv-logo.png",
  "images/rbv-qr-code.png",
  "images/picture-day-flyer.jpg",
  "images/founding-supporters-flyer.jpg",
  "images/flippin-pizza-logo.jpg",
  "images/american-legion-auxiliary.png",
];

const CALENDARS = [
  { team: "Varsity", id: "2ff3b121ca7e7eb913a0cd42259e24a2b857eeafb3110033e1b54ebb6376814c@group.calendar.google.com" },
  { team: "JV", id: "b0ff9fd02b1a009c367b418c3fe6858ff6b47ca81d4dcc2a26cc14dda091ff6d@group.calendar.google.com" },
  { team: "Frosh", id: "db439e7e18e3d3ba95266d5870eae7e1d2b88ba982f58765c894a49ee2faee4e@group.calendar.google.com" },
];

function result(body) {
  return {
    content: [{ type: "text", text: JSON.stringify(body) }],
    structuredContent: body,
  };
}

function unfoldIcs(text) {
  return String(text || "").replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
}

function unescapeIcs(value = "") {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseIcsDate(raw = "") {
  const value = raw.trim();
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", s = "00", z] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${z ? "Z" : "-07:00"}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseCalendar(text, team) {
  const lines = unfoldIcs(text);
  const events = [];
  let current = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = { team };
      continue;
    }
    if (line === "END:VEVENT") {
      if (current?.summary && current?.start) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const index = line.indexOf(":");
    if (index < 0) continue;
    const key = line.slice(0, index);
    const value = line.slice(index + 1);
    if (key.startsWith("SUMMARY")) current.summary = unescapeIcs(value);
    else if (key.startsWith("LOCATION")) current.location = unescapeIcs(value);
    else if (key.startsWith("UID")) current.uid = value;
    else if (key.startsWith("DTSTART")) current.start = parseIcsDate(value);
    else if (key.startsWith("DTEND")) current.end = parseIcsDate(value);
  }
  return events;
}

async function getSchedule() {
  const now = Date.now();
  const all = [];
  const sources = [];
  for (const calendar of CALENDARS) {
    const url = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendar.id)}/public/basic.ics`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) {
        sources.push({ team: calendar.team, status: "unavailable", http_status: response.status });
        continue;
      }
      const text = await response.text();
      const parsed = parseCalendar(text, calendar.team);
      all.push(...parsed);
      sources.push({ team: calendar.team, status: "ok", events: parsed.length });
    } catch {
      sources.push({ team: calendar.team, status: "unavailable" });
    }
  }
  const upcoming = all
    .filter((event) => event.start && event.start.getTime() >= now - 24 * 60 * 60 * 1000)
    .sort((a, b) => a.start - b.start)
    .slice(0, 30)
    .map((event) => ({
      team: event.team,
      title: event.summary,
      start: event.start.toISOString(),
      ...(event.end ? { end: event.end.toISOString() } : {}),
      ...(event.location ? { location: event.location } : {}),
    }));
  return { source: "Google Calendar public ICS", sources, upcoming };
}

async function probe(url) {
  try {
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000) });
    const text = await response.text();
    const title = text.match(/<title>([^<]{1,200})<\/title>/i)?.[1]?.trim();
    return { url, reachable: response.ok, http_status: response.status, ...(title ? { title } : {}) };
  } catch {
    return { url, reachable: false };
  }
}

const mcpHandler = createMcpHandler(() => {
  const server = new McpServer(
    { name: "rbv-volleyball-control", version: "0.1.0" },
    {
      instructions:
        "This is the RBV Volleyball assistant for Lindsay. It is READ-ONLY in this first test. It may inspect the public site, page inventory, gallery inventory, and public Google Calendar schedule, and may structure a requested change as a draft. It must never claim a website or calendar change was published because this test server has no mutation tools.",
    },
  );

  server.registerTool(
    "rbv_status",
    {
      title: "Check RBV website status",
      description: "Check the RBV Volleyball canonical and Render staging URLs and report the current migration/test state. Read-only.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => result({
      domain: "rbvvolleyball.tonedntasty.com",
      mode: "read_only_test",
      github_repo: "marketingapes/domains",
      github_branch: BRANCH,
      endpoints: await Promise.all([probe(CANONICAL_URL), probe(STAGING_URL)]),
    }),
  );

  server.registerTool(
    "rbv_list_pages",
    {
      title: "List RBV website pages",
      description: "List the RBV Volleyball pages available to the migration/control system. Read-only.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => result({ domain: "RBV", pages: PAGES.map((path) => ({ path, url: path === "index.html" ? `${CANONICAL_URL}/` : `${CANONICAL_URL}/${path}` })) }),
  );

  server.registerTool(
    "rbv_list_gallery_assets",
    {
      title: "List RBV gallery and site images",
      description: "List known RBV Volleyball image assets that can later be managed by the write-enabled connector. Read-only.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => result({ assets: GALLERY_ASSETS, gallery_page: `${CANONICAL_URL}/gallery.html` }),
  );

  server.registerTool(
    "rbv_upcoming_schedule",
    {
      title: "Read RBV upcoming schedule",
      description: "Read upcoming RBV Volleyball events from the Varsity, JV, and Frosh Google Calendars. Read-only; never edits a calendar.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => result(await getSchedule()),
  );

  server.registerTool(
    "rbv_draft_change_request",
    {
      title: "Draft an RBV website change request",
      description: "Turn Lindsay's requested website change into a structured draft. This first-test tool does not publish or alter the site.",
      inputSchema: z.object({
        request: z.string().min(3).max(4000),
        page: z.string().max(200).optional(),
        asset_names: z.array(z.string().max(200)).max(20).optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ request, page, asset_names = [] }) => result({
      status: "DRAFT_ONLY",
      requested_by: "Lindsay / RBV",
      request,
      target_page: page || "auto-select",
      assets: asset_names,
      next_step: "Preview and approve after the write-enabled RBV connector is activated.",
      published: false,
    }),
  );

  return server;
});

const nodeMcpHandler = toNodeHandler(mcpHandler);

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/health" || url.pathname === "/") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
    res.end(JSON.stringify({ status: "ok", service: "rbv-volleyball-control", mode: "read_only_test", mcp: "/mcp" }));
    return;
  }
  if (url.pathname === "/mcp") {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "content-type, authorization, mcp-session-id, mcp-protocol-version");
    res.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    await nodeMcpHandler(req, res);
    return;
  }
  res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "not_found" }));
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`rbv-volleyball-control listening on ${PORT}`);
});
