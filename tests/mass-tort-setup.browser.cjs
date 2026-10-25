// Synthetic local-only QA: no live providers, no claimant data, no external requests.
// NODE_PATH=/path/to/node_modules SHOTS=/tmp/btl-setup-shots node tests/mass-tort-setup.browser.cjs
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { mkdir, readFile } = require("node:fs/promises");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");
(async () => {
  const { startSetupServer } = await import(
    pathToFileURL(join(__dirname, "../campaign-system/setup-server.mjs"))
  );
  const { createMassTortKit, kitSnapshot } = await import(
    pathToFileURL(join(__dirname, "../campaign-system/mass-tort.mjs"))
  );
  const server = await startSetupServer(),
    origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const shots = process.env.SHOTS;
  if (shots) await mkdir(shots, { recursive: true });
  const shot = async (page, name) => {
    if (shots)
      await page.screenshot({
        path: join(shots, name + ".png"),
        fullPage: false,
      });
  };
  const fill = (page, name, value) =>
    page.locator(`[name="${name}"]`).fill(value);
  const importKit = async (page, k) =>
    page.locator("#import").setInputFiles({
      name: "fixture.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(k)),
    });
  const fixture = () => {
    const k = createMassTortKit({
      topic: "talc",
      start: "2026-11-01",
      campaignId: "fixture-approved-001",
    });
    Object.assign(k.firm, {
      id: "fixture-firm",
      name: "Harbor Review Firm · Synthetic",
      logoRef: "assets/fixture-logo.svg",
      color: "#295849",
    });
    Object.assign(k.identity, {
      tenantId: "fixture-tenant",
      domainId: "fixture-domain",
    });
    k.templateOnly = false;
    k.geography.included = ["Fixture jurisdiction"];
    Object.assign(k.screening, {
      version: "fixture-rules-v1",
      qualifies: ["Synthetic firm-supplied rule"],
      disqualifies: ["Synthetic firm-supplied exclusion"],
    });
    Object.assign(k.consent, {
      version: "fixture-consent-v1",
      callsText: "Synthetic approved calls text",
      smsText: "Synthetic approved SMS text",
    });
    for (const p of k.pages)
      Object.assign(p, {
        previewRef: `review/${p.path}.html`,
        copyVersion: "fixture-copy-v1",
      });
    for (const c of k.concepts)
      Object.assign(c, {
        headline: "Synthetic campaign headline",
        body: "Synthetic campaign copy",
        imageRef: "review/fixture.png",
        videoStoryboardRef: "review/fixture.pdf",
        videoRef: "review/fixture.mp4",
      });
    for (const [key, b] of Object.entries(k.bindings))
      if (typeof b === "object")
        Object.assign(b, { id: `fixture-${key}`, revision: "fixture-v1" });
    for (const [key, b] of Object.entries(k.destinations))
      if (typeof b === "object")
        Object.assign(b, { id: `fixture-${key}`, revision: "fixture-v1" });
    k.destinations.timezone = "America/New_York";
    k.reporting.sampleRef = "review/synthetic-sample";
    k.reporting.actualRef = "review/synthetic-reconciliation";
    k.budget = { mediaCents: 100, approvalRef: "review/synthetic-approval" };
    const snapshot = kitSnapshot(k);
    k.evidence.snapshot = snapshot;
    for (const group of ["review", "launch"])
      for (const a of Object.values(k.evidence[group]))
        Object.assign(a, {
          snapshot,
          verified: true,
          evidenceRef: "review/synthetic-receipt",
          reviewer: "Synthetic QA reviewer",
          reviewedAt: "2026-10-20T10:00:00Z",
        });
    return k;
  };
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
    });
    for (const width of [390, 1440]) {
      const context = await browser.newContext({
          viewport: { width, height: 1000 },
          acceptDownloads: true,
        }),
        page = await context.newPage();
      const errors = [],
        external = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("console", (msg) => {
        if (msg.type() === "error" && !/422|503/.test(msg.text()))
          errors.push(msg.text());
      });
      await context.route("**/*", (route) => {
        const url = route.request().url();
        if (
          !url.startsWith(origin) &&
          !url.startsWith("about:") &&
          !url.startsWith("blob:") &&
          !url.startsWith("data:")
        ) {
          external.push(url);
          return route.abort();
        }
        return route.continue();
      });
      await page.goto(origin);
      await page.waitForFunction(
        () => !document.querySelector("#generate").disabled,
      );
      assert.match(
        await page.locator("#connection-state").innerText(),
        /Local generator connected/,
      );
      assert.ok(
        !(await page.locator("#topic option").allTextContents()).some((x) =>
          /Motor vehicle|SSDI|Custom campaign/i.test(x),
        ),
      );
      await shot(page, `setup-${width}`);
      await fill(page, "firm.name", "Harbor Review Firm · Synthetic");
      await fill(page, "firm.id", "fixture-firm");
      await fill(page, "firm.logoRef", "assets/fixture-logo.svg");
      await fill(page, "firm.color", "#295849");
      await page.locator("#topic").selectOption("talc");
      await page.waitForFunction(
        () => !document.querySelector("#campaign-form").inert,
      );
      await fill(page, "screening.version", "fixture-rules-v1");
      await fill(page, "screening.qualifies", "Synthetic firm-supplied rule");
      await fill(
        page,
        "screening.disqualifies",
        "Synthetic firm-supplied exclusion",
      );
      await fill(page, "geography.included", "Fixture jurisdiction");
      await fill(page, "consent.version", "fixture-consent-v1");
      await fill(page, "consent.callsText", "Synthetic calls disclosure");
      await fill(page, "consent.smsText", "Synthetic SMS disclosure");
      await fill(page, "bindings.vapiAssistant.id", "fixture-assistant");
      await fill(page, "bindings.vapiAssistant.revision", "fixture-v1");
      await page.getByRole("button", { name: "Generate review pack" }).click();
      await page.locator("#results").waitFor({ state: "visible" });
      assert.match(await page.locator("#summary-status").innerText(), /DRAFT/);
      assert.match(
        await page.locator("#binding-status").innerText(),
        /Configured · Not verified · unconnected here/,
      );
      assert.equal(await page.locator("#downloads a").count(), 8);
      const downloadPromise = page.waitForEvent("download");
      await page
        .getByRole("link", { name: "↓ campaign.json", exact: true })
        .click();
      const downloaded = JSON.parse(
        await readFile(await (await downloadPromise).path(), "utf8"),
      );
      assert.equal(downloaded.firm.name, "Harbor Review Firm · Synthetic");
      assert.equal(downloaded.screening.topic, "talc");
      assert.equal(downloaded.bindings.vapiAssistant.id, "fixture-assistant");
      assert.equal(downloaded.evidence.launch.bindings.verified, false);
      const frame = page.frameLocator("#preview");
      await frame
        .getByRole("heading", { name: "Tell your story. Find the next step." })
        .waitFor();
      assert.match(
        await frame.locator("header").innerText(),
        /Harbor Review Firm/,
      );
      await page.getByRole("button", { name: "Quiz", exact: true }).click();
      await frame
        .getByRole("heading", { name: "Prequalification", exact: true })
        .waitFor();
      await page.getByRole("button", { name: "Sofia", exact: true }).click();
      await frame
        .getByText("No AI service is connected.", { exact: false })
        .waitFor();
      await page.getByRole("button", { name: "Ads", exact: true }).click();
      await frame.locator("article").nth(2).waitFor();
      assert.equal(await frame.locator("article").count(), 3);
      await page
        .locator("#results-heading")
        .evaluate((el) =>
          el.scrollIntoView({ block: "start", behavior: "instant" }),
        );
      assert.ok(
        await page
          .locator("#results-heading")
          .evaluate(
            (el) =>
              el.getBoundingClientRect().top >=
              document
                .querySelector(innerWidth < 761 ? ".sidebar" : ".topbar")
                .getBoundingClientRect().bottom,
          ),
        `${width}: review heading clears sticky navigation`,
      );
      await shot(page, `review-${width}`);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${width}: no page overflow`,
      );
      assert.deepEqual(
        await page.evaluate(() => Object.keys(localStorage)),
        [],
      );
      // Every material edit removes prior previews/downloads immediately.
      await fill(page, "consent.callsText", "Changed synthetic disclosure");
      assert.equal(await page.locator("#results").isVisible(), false);
      assert.equal(await page.locator("#downloads a").count(), 0);
      // Changing firm identity isolates screening/consent/routing/budget/evidence under a new source.
      await fill(page, "budget.mediaCents", "25.00");
      await fill(page, "firm.id", "fixture-other-firm");
      await page.waitForFunction(
        () => !document.querySelector("#campaign-form").inert,
      );
      for (const name of [
        "screening.version",
        "consent.version",
        "bindings.vapiAssistant.id",
        "budget.mediaCents",
      ])
        assert.equal(await page.locator(`[name="${name}"]`).inputValue(), "");
      await fill(
        page,
        "screening.qualifies",
        "Must be cleared for another tort",
      );
      await page.locator("#topic").selectOption("paraquat");
      await page.waitForFunction(
        () => !document.querySelector("#campaign-form").inert,
      );
      assert.equal(
        await page.locator('[name="screening.qualifies"]').inputValue(),
        "",
      );
      // Imported current evidence is displayed honestly; an edit + generation makes it stale.
      await importKit(page, fixture());
      await page.waitForFunction(
        () =>
          document.querySelector("#summary-status").textContent ===
          "LAUNCH READY",
      );
      assert.match(
        await page.locator("#binding-status").innerText(),
        /Current binding attestation supplied · unconnected here/,
      );
      await fill(page, "consent.callsText", "Changed after human review");
      await page.getByRole("button", { name: "Generate review pack" }).click();
      await page.waitForFunction(
        () => document.querySelector("#results").hidden === false,
      );
      assert.match(await page.locator("#summary-status").innerText(), /DRAFT/);
      await page
        .getByText("Evidence status · current, stale or missing", {
          exact: true,
        })
        .click();
      assert.match(
        await page.locator("#evidence-status").innerText(),
        /Stale or incomplete attestation/,
      );
      // A slow response for old content cannot restore artifacts after a new edit.
      let release, arrived;
      const held = new Promise((ok) => (release = ok)),
        reached = new Promise((ok) => (arrived = ok));
      await page.route(origin + "/api/build", async (route) => {
        const response = await route.fetch();
        arrived();
        await held;
        await route.fulfill({ response });
      });
      await page.getByRole("button", { name: "Generate review pack" }).click();
      await reached;
      await fill(
        page,
        "consent.callsText",
        "Newer edit while build is in flight",
      );
      release();
      await page.waitForFunction(
        () => !document.querySelector("#generate").disabled,
      );
      assert.equal(await page.locator("#results").isVisible(), false);
      assert.equal(await page.locator("#downloads a").count(), 0);
      await page.unroute(origin + "/api/build");
      // Escaped imported text remains text in both the workspace and generated frame.
      const malicious = fixture();
      malicious.firm.name = '<img src=x onerror="window.top.pwned=true">';
      await importKit(page, malicious);
      await page.waitForFunction(() =>
        document.querySelector("#summary-firm").textContent.startsWith("<img"),
      );
      assert.equal(await page.locator("#summary-firm img").count(), 0);
      assert.equal(
        await page.frameLocator("#preview").locator("img").count(),
        0,
      );
      assert.equal(await page.evaluate(() => window.pwned), undefined);
      // A remote/executable logo is rejected with an accessible error; no fetch occurs.
      const invalid = fixture();
      invalid.firm.logoRef = "https://unsafe.invalid/logo.svg";
      await importKit(page, invalid);
      await page.locator("#error").waitFor({ state: "visible" });
      assert.match(
        await page.locator("#error").innerText(),
        /Logo must be an approved local asset reference/,
      );
      assert.equal(
        await page
          .locator("#error")
          .evaluate((el) => el === document.activeElement),
        true,
      );
      // Reordered valid arrays keep page paths and concept IDs attached to their own controls.
      const reordered = fixture();
      for (const p of reordered.pages) p.copyVersion = `copy-${p.path}`;
      for (const c of reordered.concepts) c.headline = `Headline for ${c.id}`;
      reordered.pages.reverse();
      reordered.concepts.reverse();
      await importKit(page, reordered);
      await page.waitForFunction(
        () =>
          document.querySelector('[name="pages.form.copyVersion"]').value ===
          "copy-form",
      );
      for (const path of ["form", "quiz", "sofia"])
        assert.equal(
          await page.locator(`[name="pages.${path}.previewRef"]`).inputValue(),
          `review/${path}.html`,
        );
      for (const id of ["education", "process", "human-review"])
        assert.equal(
          await page.locator(`[name="concepts.${id}.headline"]`).inputValue(),
          `Headline for ${id}`,
        );
      await fill(page, "pages.form.previewRef", "review/edited-form.html");
      await fill(
        page,
        "concepts.education.headline",
        "Edited education headline",
      );
      await page.getByRole("button", { name: "Generate review pack" }).click();
      await page.locator("#results").waitFor({ state: "visible" });
      const reorderedDownload = page.waitForEvent("download");
      await page
        .getByRole("link", { name: "↓ campaign.json", exact: true })
        .click();
      const exported = JSON.parse(
        await readFile(await (await reorderedDownload).path(), "utf8"),
      );
      assert.deepEqual(
        exported.pages.map((p) => p.path),
        ["sofia", "quiz", "form"],
      );
      assert.equal(
        exported.pages.find((p) => p.path === "form").previewRef,
        "review/edited-form.html",
      );
      assert.equal(
        exported.pages.find((p) => p.path === "sofia").previewRef,
        "review/sofia.html",
      );
      assert.equal(
        exported.concepts.find((c) => c.id === "education").headline,
        "Edited education headline",
      );
      assert.equal(
        exported.concepts.find((c) => c.id === "human-review").headline,
        "Headline for human-review",
      );
      // A failed profile switch restores the old visible identity and its matching content.
      await page.route(origin + "/api/new", (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Synthetic profile service unavailable",
          }),
        }),
      );
      await page.locator("#topic").selectOption("paraquat");
      await page.waitForFunction(
        () => !document.querySelector("#campaign-form").inert,
      );
      assert.equal(await page.locator("#topic").inputValue(), "talc");
      assert.equal(
        await page.locator('[name="screening.qualifies"]').inputValue(),
        "Synthetic firm-supplied rule",
      );
      assert.match(
        await page.locator("#connection-state").innerText(),
        /previous campaign and visible identity were restored/,
      );
      await fill(page, "firm.id", "fixture-failed-switch");
      await page.waitForFunction(
        () => !document.querySelector("#campaign-form").inert,
      );
      assert.equal(
        await page.locator('[name="firm.id"]').inputValue(),
        "fixture-firm",
      );
      assert.equal(
        await page.locator('[name="consent.version"]').inputValue(),
        "fixture-consent-v1",
      );
      assert.equal(await page.locator("#generate").isEnabled(), true);
      await page.getByRole("button", { name: "Generate review pack" }).click();
      await page.locator("#results").waitFor({ state: "visible" });
      const rollbackDownload = page.waitForEvent("download");
      await page
        .getByRole("link", { name: "↓ campaign.json", exact: true })
        .click();
      const rolledBack = JSON.parse(
        await readFile(await (await rollbackDownload).path(), "utf8"),
      );
      assert.equal(rolledBack.topic, "talc");
      assert.equal(rolledBack.firm.id, "fixture-firm");
      assert.deepEqual(rolledBack.screening.qualifies, [
        "Synthetic firm-supplied rule",
      ]);
      await page.unroute(origin + "/api/new");
      await fill(page, "firm.id", "fixture-recovered-firm");
      await page.waitForFunction(
        () => !document.querySelector("#campaign-form").inert,
      );
      assert.equal(
        await page.locator('[name="firm.id"]').inputValue(),
        "fixture-recovered-firm",
      );
      assert.equal(
        await page.locator('[name="screening.qualifies"]').inputValue(),
        "",
      );
      await fill(
        page,
        "screening.qualifies",
        "Synthetic rule before recovered tort change",
      );
      await page.locator("#topic").selectOption("paraquat");
      await page.waitForFunction(
        () => !document.querySelector("#campaign-form").inert,
      );
      assert.equal(await page.locator("#topic").inputValue(), "paraquat");
      assert.equal(
        await page.locator('[name="screening.qualifies"]').inputValue(),
        "",
      );
      assert.deepEqual(external, []);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `PASS ${width}px: setup, generation, downloads, four previews, isolation, evidence, escaping, error focus, failed-switch rollback/recovery, reordered import/export, sticky heading visibility, no external requests`,
      );
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((ok) => server.close(ok));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
