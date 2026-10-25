import test from "node:test";
import assert from "node:assert/strict";
import { startSetupServer } from "../setup-server.mjs";
import { createMassTortKit, kitSnapshot } from "../mass-tort.mjs";
import { dryRun } from "../mass-tort-cli.mjs";
import { request } from "node:http";
const kit = () =>
  createMassTortKit({
    topic: "talc",
    campaignId: "fixture-setup-001",
    start: "2026-11-01",
  });
async function local(fn) {
  const server = await startSetupServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (path, value, headers = {}) =>
    fetch(origin + path, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(value),
    });
  try {
    await fn({ origin, post });
  } finally {
    await new Promise((ok) => server.close(ok));
  }
}
test("setup serves only the local UI/catalog, with no repository file exposure or remote assets", () =>
  local(async ({ origin }) => {
    const response = await fetch(origin);
    assert.equal(response.status, 200);
    assert.match(
      response.headers.get("content-security-policy"),
      /frame-ancestors 'none'/,
    );
    const html = await response.text();
    assert.match(html, /Facebook first/);
    assert.match(html, /No autosave/);
    assert.doesNotMatch(html, /https?:\/\/|localStorage|analytics/i);
    for (const path of ["/setup.css", "/setup.mjs"])
      assert.equal((await fetch(origin + path)).status, 200);
    const catalog = await (await fetch(origin + "/api/catalog")).json();
    assert.ok(catalog.topics.some((t) => t.id === "paraquat"));
    for (const id of ["mva", "ssdi", "personal-injury", "custom"])
      assert.ok(!catalog.topics.some((t) => t.id === id));
    for (const path of [
      "/domain.json",
      "/btl/paraquat/intake.js",
      "/api/activate",
      "/api/connect",
    ])
      assert.equal((await fetch(origin + path)).status, 404);
  }));
test("new profile uses the reviewed strict constructor and blank evidence/routing", () =>
  local(async ({ post }) => {
    const input = {
      topic: "paraquat",
      campaignId: "fixture-new-001",
      start: "2026-11-01",
    };
    const response = await post("/api/new", input);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).kit, createMassTortKit(input));
    for (const topic of ["mva", "ssdi", "custom"])
      assert.equal((await post("/api/new", { ...input, topic })).status, 400);
    assert.equal(
      (await post("/api/new", { ...input, endpoint: "unapproved" })).status,
      400,
    );
  }));
test("local generation exactly reuses dryRun and keeps supplied bindings unverified", () =>
  local(async ({ post }) => {
    const k = kit();
    k.bindings.vapiAssistant = { id: "fixture-vapi", revision: "fixture-v1" };
    k.firm.name = "<img src=x onerror=alert(1)>";
    const response = await post("/api/build", k);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result, { ...dryRun(k), kit: k });
    assert.equal(result.manifest.activation, false);
    assert.equal(result.readiness.launchReady, false);
    assert.match(
      result.assets["form.html"],
      /&lt;img src=x onerror=alert\(1\)&gt;/,
    );
    assert.ok(
      result.readiness.launchBlockers.some((x) =>
        x.startsWith("launch.bindings:"),
      ),
    );
    const before = kitSnapshot(k);
    k.consent.callsText = "Changed disclosure";
    const changed = await (await post("/api/build", k)).json();
    assert.notEqual(changed.manifest.snapshot, before);
    assert.equal(changed.kit.evidence.snapshot, "");
  }));
test("local API refuses cross-origin/host calls, form POSTs, malformed and oversized JSON", () =>
  local(async ({ origin, post }) => {
    const k = kit();
    assert.equal(
      (await post("/api/build", k, { Origin: "https://untrusted.invalid" }))
        .status,
      403,
    );
    const spoofedHost = await new Promise((ok, fail) => {
      const req = request(
        origin + "/api/build",
        {
          method: "POST",
          headers: {
            Host: "untrusted.invalid",
            Origin: origin,
            "Content-Type": "application/json",
          },
        },
        (res) => {
          res.resume();
          res.once("end", () => ok(res.statusCode));
        },
      );
      req.once("error", fail);
      req.end(JSON.stringify(k));
    });
    assert.equal(spoofedHost, 403);
    assert.equal(
      (
        await post("/api/build", k, {
          "Content-Type": "application/x-www-form-urlencoded",
        })
      ).status,
      415,
    );
    assert.equal(
      (
        await fetch(origin + "/api/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(origin + "/api/build", {
          method: "POST",
          headers: { Origin: origin, "Content-Type": "application/json" },
          body: "invalid json",
        })
      ).status,
      400,
    );
    assert.equal(
      (await post("/api/build", { content: "x".repeat(262145) })).status,
      413,
    );
    k.bindings.makeHook.id = "https://hook.invalid/secret";
    const invalid = await post("/api/build", k);
    assert.equal(invalid.status, 422);
    assert.equal((await invalid.json()).manifest, null);
  }));
