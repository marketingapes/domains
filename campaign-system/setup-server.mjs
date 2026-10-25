// Local-only operator UI. Reuses the reviewed adapter; never writes campaign files or calls providers.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { topics } from "./catalog.mjs";
import {
  createMassTortKit,
  REVIEW_CHECKS,
  LAUNCH_CHECKS,
} from "./mass-tort.mjs";
import { dryRun } from "./mass-tort-cli.mjs";

const staticFiles = {
  "/": ["setup/index.html", "text/html; charset=utf-8"],
  "/setup.css": ["setup/setup.css", "text/css; charset=utf-8"],
  "/setup.mjs": ["setup/setup.mjs", "text/javascript; charset=utf-8"],
};
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  // Inline styles/scripts are required by the existing renderer inside sandboxed srcdoc.
  // Imported values are never inserted as HTML; preview adds a stricter deny-network policy.
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'self' about:; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};
const json = (res, status, body) => {
  res.writeHead(status, {
    ...headers,
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(body));
};
async function body(req) {
  return new Promise((ok, fail) => {
    let size = 0,
      tooLarge = false;
    const chunks = [];
    req.on("data", (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > 262144) {
        tooLarge = true;
        chunks.length = 0;
        fail(
          Object.assign(Error("Configuration exceeds 256 KiB."), {
            status: 413,
          }),
        );
        return;
      }
      chunks.push(chunk);
    });
    req.once("error", fail);
    req.once("end", () => {
      if (tooLarge) return;
      try {
        ok(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        fail(
          Object.assign(Error("Choose a valid JSON configuration."), {
            status: 400,
          }),
        );
      }
    });
  });
}
export function createSetupServer() {
  const server = createServer(async (req, res) => {
    try {
      const origin = `http://127.0.0.1:${server.address().port}`;
      if (req.headers.host !== new URL(origin).host)
        return json(res, 403, {
          error: "Use the loopback address printed by the local server.",
        });
      if (req.headers.origin && req.headers.origin !== origin)
        return json(res, 403, { error: "Cross-origin access is refused." });
      const path = new URL(req.url, origin).pathname;
      if (req.method === "GET" && path === "/favicon.ico") {
        res.writeHead(204, headers);
        res.end();
        return;
      }
      if (req.method === "GET" && staticFiles[path]) {
        const [file, type] = staticFiles[path];
        res.writeHead(200, { ...headers, "Content-Type": type });
        res.end(await readFile(new URL(file, import.meta.url)));
        return;
      }
      if (req.method === "GET" && path === "/api/catalog")
        return json(res, 200, {
          topics: topics
            .filter((t) => t.mdl !== null)
            .map(({ id, name }) => ({ id, name })),
          reviewChecks: REVIEW_CHECKS,
          launchChecks: LAUNCH_CHECKS,
        });
      if (req.method !== "POST" || !["/api/new", "/api/build"].includes(path))
        return json(res, 404, { error: "Not found." });
      // Browsers must send same-origin JSON. No CORS, form POSTs, cookies or provider credentials.
      if (req.headers.origin !== origin)
        return json(res, 403, { error: "Same-origin request required." });
      if (req.headers["content-type"]?.split(";")[0] !== "application/json")
        return json(res, 415, { error: "JSON configuration required." });
      const input = await body(req);
      if (path === "/api/new") {
        if (
          !input ||
          Object.keys(input).some(
            (k) => !["topic", "start", "campaignId"].includes(k),
          )
        )
          return json(res, 400, {
            error:
              "Only topic, start and campaign ID may initialize a profile.",
          });
        return json(res, 200, { kit: createMassTortKit(input) });
      }
      const result = dryRun(input);
      json(res, result.readiness.errors.length ? 422 : 200, {
        ...result,
        kit: input,
      });
    } catch (e) {
      json(res, e.status || 400, {
        error: e.message || "Unable to generate this configuration.",
      });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  return server;
}
export async function startSetupServer(port = 0) {
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw Error("Choose a valid local port.");
  const server = createSetupServer();
  await new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", ok);
  });
  return server;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const server = await startSetupServer(
      process.argv[2] === undefined ? 0 : Number(process.argv[2]),
    );
    console.log(
      `BTL firm setup: http://127.0.0.1:${server.address().port}\nLocal review only. No files saved or providers connected. Press Ctrl+C to stop.`,
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
