const $ = (id) => document.getElementById(id),
  form = $("campaign-form");
let kit = null,
  result = null,
  catalog = null,
  version = 0,
  downloads = [];
const labels = {
  makeScenario: "Make scenario",
  makeHook: "Make hook",
  vapiAssistant: "Sofia · Vapi assistant",
  existingTestLine: "Existing test / demo line",
  bigQuery: "BigQuery",
  perspective: "Perspective",
  calendar: "Intake calendar",
  transfer: "Transfer destination",
  firm: "Firm delivery",
  fallback: "Fallback destination",
};
const get = (obj, path) => path.split(".").reduce((v, k) => v?.[k], obj);
const set = (obj, path, value) => {
  const keys = path.split("."),
    last = keys.pop();
  keys.reduce((v, k) => v[k], obj)[last] = value;
};
const lines = (s) =>
  s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
function error(message) {
  $("error").textContent = message;
  $("error").hidden = false;
  $("error").tabIndex = -1;
  $("error").focus();
}
function clearError() {
  $("error").hidden = true;
  $("error").textContent = "";
}
async function api(path, input) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "omit",
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(
      data.error ||
        data.readiness?.errors.join("\n") ||
        "Unable to validate configuration.",
    );
  return data;
}
function clearResults() {
  version++;
  result = null;
  for (const url of downloads) URL.revokeObjectURL(url);
  downloads = [];
  $("downloads").replaceChildren();
  $("preview").removeAttribute("srcdoc");
  $("results").hidden = true;
  $("summary-status").textContent = "DRAFT · edits need validation";
}
function summarize() {
  $("summary-firm").textContent = kit?.firm.name || "Your firm";
  $("summary-topic").textContent =
    catalog?.topics.find((t) => t.id === kit?.topic)?.name ||
    "Choose a named tort";
}
function field(label, name, { rows, placeholder } = {}) {
  const wrapper = document.createElement("label");
  wrapper.append(document.createTextNode(label));
  const input = document.createElement(rows ? "textarea" : "input");
  input.name = name;
  if (rows) input.rows = rows;
  input.placeholder = placeholder || "";
  wrapper.append(input);
  return wrapper;
}
function connectionFields(target, scope, keys) {
  for (const key of keys) {
    const row = document.createElement("div");
    row.className = "connection-row";
    const title = document.createElement("h4");
    title.textContent = labels[key];
    const status = document.createElement("span");
    status.className = "unconnected";
    status.textContent = "Unconnected in this workspace";
    title.append(status);
    row.append(title);
    const grid = document.createElement("div");
    grid.className = "field-grid";
    grid.append(
      field("Existing ID", `${scope}.${key}.id`, {
        placeholder: "ID only · no secret URLs",
      }),
      field("Revision", `${scope}.${key}.revision`, {
        placeholder: "Verified revision reference",
      }),
    );
    row.append(grid);
    $(target).append(row);
  }
}
function buildDynamicFields() {
  connectionFields("binding-fields", "bindings", [
    "makeScenario",
    "makeHook",
    "vapiAssistant",
    "existingTestLine",
    "bigQuery",
    "perspective",
  ]);
  connectionFields("destination-fields", "destinations", [
    "calendar",
    "transfer",
    "firm",
    "fallback",
  ]);
  for (const [i, name] of ["Form", "Quiz", "Sofia"].entries()) {
    const row = document.createElement("div");
    row.className = "sub-card";
    const title = document.createElement("h3");
    title.textContent = `${name} page`;
    row.append(title);
    const grid = document.createElement("div");
    grid.className = "field-grid";
    grid.append(
      field("Polished preview reference", `pages.${i}.previewRef`, {
        placeholder: "Private reviewed asset reference",
      }),
      field("Copy version", `pages.${i}.copyVersion`, {
        placeholder: "Campaign copy version",
      }),
    );
    row.append(grid);
    $("page-fields").append(row);
  }
  for (const [i, name] of ["Education", "Process", "Human review"].entries()) {
    const row = document.createElement("div");
    row.className = "sub-card";
    const title = document.createElement("h3");
    title.textContent = `Concept ${i + 1} · ${name}`;
    row.append(title);
    row.append(
      field("Headline", `concepts.${i}.headline`),
      field("Body copy", `concepts.${i}.body`, { rows: 3 }),
    );
    const grid = document.createElement("div");
    grid.className = "field-grid";
    for (const [label, key] of [
      ["Image preview reference", "imageRef"],
      ["Video storyboard reference", "videoStoryboardRef"],
      ["Final video reference", "videoRef"],
    ])
      grid.append(
        field(label, `concepts.${i}.${key}`, {
          placeholder: "Private asset reference · no remote URLs",
        }),
      );
    row.append(grid);
    $("concept-fields").append(row);
  }
}
function populate() {
  for (const input of form.querySelectorAll("[name]")) {
    if (input.name === "campaignSpecific") {
      input.checked = !kit.templateOnly;
      continue;
    }
    let value = get(kit, input.name);
    if (input.name === "budget.mediaCents")
      value = value === null ? "" : (value / 100).toFixed(2);
    input.value = Array.isArray(value) ? value.join("\n") : (value ?? "");
  }
  summarize();
}
function newId(topic) {
  return `${topic}-${crypto.randomUUID().slice(0, 8)}`;
}
async function fresh({ topic, keepBrand = false } = {}) {
  clearResults();
  clearError();
  const token = version,
    brand = keepBrand ? structuredClone(kit.firm) : null;
  $("generate").disabled = true;
  form.inert = true;
  try {
    const selected = topic || catalog.topics[0].id;
    const data = await api("/api/new", {
      topic: selected,
      start: new Date().toISOString().slice(0, 10),
      campaignId: newId(selected),
    });
    if (token !== version) return;
    kit = data.kit;
    if (brand) kit.firm = brand;
    $("build-fee").value = "";
    populate();
    $("connection-state").textContent = keepBrand
      ? "New tort profile created. Campaign rules, consent, geography, routing, budget, creative and approvals were cleared."
      : "Local generator connected. Inputs stay in memory; download your configuration to keep it. All provider connections remain unconnected.";
  } catch (e) {
    error(e.message);
  } finally {
    form.inert = false;
    $("generate").disabled = !kit;
  }
}
function hasSensitiveInputs() {
  return (
    kit.screening.qualifies.length ||
    kit.screening.disqualifies.length ||
    kit.screening.version ||
    kit.consent.version ||
    kit.consent.callsText ||
    kit.consent.smsText ||
    kit.geography.included.length ||
    kit.geography.excluded.length ||
    kit.budget.mediaCents !== null ||
    Object.values(kit.evidence.review).some((a) => a.verified) ||
    Object.values(kit.evidence.launch).some((a) => a.verified) ||
    Object.values(kit.bindings).some(
      (b) => typeof b === "object" && (b.id || b.revision),
    ) ||
    Object.values(kit.destinations).some(
      (b) => typeof b === "object" && (b.id || b.revision),
    ) ||
    kit.concepts.some(
      (c) =>
        c.headline ||
        c.body ||
        c.imageRef ||
        c.videoStoryboardRef ||
        c.videoRef,
    ) ||
    kit.pages.some((p) => p.previewRef || p.copyVersion) ||
    kit.reporting.sampleRef ||
    kit.reporting.actualRef ||
    kit.destinations.timezone ||
    kit.budget.approvalRef ||
    !kit.templateOnly ||
    kit.evidence.snapshot
  );
}
async function edit(event) {
  const input = event.target;
  if (!kit || !input.name) return;
  if (input.name === "topic") {
    await fresh({ topic: input.value, keepBrand: true });
    return;
  }
  clearResults();
  clearError();
  let value = input.value;
  // A new firm identity starts a new campaign; never carry the old firm's intake rules.
  if (
    ["firm.id", "firm.name"].includes(input.name) &&
    get(kit, input.name) &&
    get(kit, input.name) !== value &&
    hasSensitiveInputs()
  ) {
    const brand = structuredClone(kit.firm);
    set({ firm: brand }, input.name, value);
    const token = version;
    $("generate").disabled = true;
    form.inert = true;
    try {
      const data = await api("/api/new", {
        topic: kit.topic,
        start: kit.start,
        campaignId: newId(kit.topic),
      });
      if (token !== version) return;
      kit = data.kit;
      kit.firm = brand;
      $("build-fee").value = "";
      populate();
      $("connection-state").textContent =
        "Firm changed. A new isolated campaign was created; screening, consent, geography, routing, budget, creative and approvals were cleared.";
    } catch (e) {
      error(e.message);
    } finally {
      form.inert = false;
      $("generate").disabled = !kit;
    }
    return;
  }
  if (input.name === "campaignSpecific") kit.templateOnly = !input.checked;
  else if (input.name === "campaignId") {
    kit.campaignId = value;
    kit.identity.source = `btl:mass-tort:${value}`;
    for (const p of kit.pages) p.pageId = `${value}-${p.path}`;
  } else {
    if (Array.isArray(get(kit, input.name))) value = lines(value);
    if (input.name === "budget.mediaCents")
      value = value === "" ? null : Math.round(Number(value) * 100);
    set(kit, input.name, value);
  }
  summarize();
}
function download(name, content, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  downloads.push(url);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.textContent = `↓ ${name}`;
  $("downloads").append(link);
}
function renderList(id, items, empty) {
  const list = $(id);
  list.replaceChildren();
  for (const text of items.length ? items : [empty]) {
    const li = document.createElement("li");
    li.textContent = text;
    list.append(li);
  }
}
function preview(name) {
  // All HTML comes from the reviewed renderer; no imported HTML or remote media is loaded.
  // The iframe has an opaque origin and its own deny-network policy.
  const policy =
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'\">";
  const html = result.assets[name];
  $("preview").srcdoc = html.includes("<head>")
    ? html.replace("<head>", "<head>" + policy)
    : html.replace('<html lang="en">', '<html lang="en">' + policy);
  for (const button of $("preview-tabs").children)
    button.setAttribute("aria-pressed", String(button.dataset.file === name));
}
function evidenceRows() {
  const host = $("evidence-status");
  host.replaceChildren();
  for (const group of ["review", "launch"])
    for (const [key, label] of Object.entries(catalog[`${group}Checks`])) {
      const a = kit.evidence[group][key];
      const blocker = result.readiness[`${group}Blockers`].some((x) =>
        x.startsWith(`${group}.${key}:`),
      );
      const state = !blocker
        ? "Current human attestation supplied"
        : a.verified
          ? "Stale or incomplete attestation"
          : "No verified attestation supplied";
      const row = document.createElement("div");
      row.className = "evidence-row";
      const title = document.createElement("strong");
      title.textContent = `${group}.${key} · ${state}`;
      const detail = document.createElement("p");
      detail.textContent = label;
      row.append(title, detail);
      if (a.evidenceRef) {
        const receipt = document.createElement("p");
        receipt.textContent = `Receipt: ${a.evidenceRef} · ${a.reviewer || "Reviewer missing"} · ${a.reviewedAt || "Date missing"}`;
        row.append(receipt);
      }
      host.append(row);
    }
}
function showResults(data) {
  result = data;
  $("results").hidden = false;
  $("summary-status").textContent = data.readiness.status.replaceAll("_", " ");
  $("result-summary").textContent =
    `${kit.firm.name || "Firm brand awaiting approval"} · ${kit.campaignId} · ${data.readiness.status}. Generated previews are drafts; asset references alone do not prove finished creative.`;
  $("gates").replaceChildren();
  for (const [label, ready, blockers] of [
    ["REVIEW_READY", data.readiness.reviewReady, data.readiness.reviewBlockers],
    ["LAUNCH_READY", data.readiness.launchReady, data.readiness.launchBlockers],
  ]) {
    const gate = document.createElement("article");
    gate.className = "gate";
    const title = document.createElement("h3");
    title.textContent = label;
    const status = document.createElement("p");
    status.textContent = ready
      ? "Evidence requirements satisfied offline"
      : `${blockers.length} requirements still open`;
    gate.append(title, status);
    $("gates").append(gate);
  }
  download("campaign.json", JSON.stringify(kit, null, 2));
  download(
    "review-pack.json",
    JSON.stringify(
      {
        schema: "btl.mass-tort-review-pack/v1",
        ...data,
        planning: {
          phase: "FACEBOOK_STARTER",
          channels: ["facebook"],
          buildFeeCents:
            $("build-fee").value === ""
              ? null
              : Math.round(Number($("build-fee").value) * 100),
          pricingStatus: "pending_terms_no_commitment",
          expansion:
            "Separate channel, budget and activation approvals required",
        },
      },
      null,
      2,
    ),
  );
  download("manifest.json", JSON.stringify(data.manifest, null, 2));
  download("readiness.json", JSON.stringify(data.readiness, null, 2));
  for (const [name, html] of Object.entries(data.assets))
    download(name, html, "text/html");
  $("preview-tabs").replaceChildren();
  for (const [file, label] of [
    ["form.html", "Form"],
    ["quiz.html", "Quiz"],
    ["sofia.html", "Sofia"],
    ["ads.html", "Ads"],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.file = file;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => preview(file));
    $("preview-tabs").append(button);
  }
  preview("form.html");
  $("binding-status").replaceChildren();
  const current = data.readiness.launchBlockers.every(
    (x) => !x.startsWith("launch.bindings:"),
  );
  for (const [key, binding] of Object.entries(kit.bindings))
    if (typeof binding === "object") {
      const row = document.createElement("div");
      row.className = "status-row";
      const name = document.createElement("strong");
      name.textContent = labels[key];
      const status = document.createElement("span");
      status.textContent = `${binding.id && binding.revision ? "Configured" : "Not configured"} · ${current ? "Current binding attestation supplied" : "Not verified"} · unconnected here`;
      row.append(name, status);
      $("binding-status").append(row);
    }
  renderList(
    "review-blockers",
    data.readiness.reviewBlockers,
    "All offline review evidence requirements are satisfied.",
  );
  renderList(
    "launch-blockers",
    data.readiness.launchBlockers,
    "All offline launch evidence requirements are satisfied. No activation is authorized by this result.",
  );
  evidenceRows();
  $("results-heading").tabIndex = -1;
  $("results-heading").focus();
}
form.addEventListener("input", edit);
$("build-fee").addEventListener("input", () => {
  if (kit) clearResults();
});
$("new-profile").addEventListener("click", () => fresh());
$("preview-size").addEventListener("change", () => {
  $("preview").classList.toggle("mobile", $("preview-size").value === "mobile");
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!kit) return;
  clearResults();
  clearError();
  if (!form.checkValidity()) {
    error("Please fix the highlighted campaign fields before generating.");
    form.reportValidity();
    return;
  }
  const token = version;
  $("generate").disabled = true;
  $("connection-state").textContent =
    "Validating configuration and building local review artifacts…";
  try {
    const data = await api("/api/build", kit);
    if (token !== version) return;
    showResults(data);
    $("connection-state").textContent =
      "Review pack generated locally. No files were saved to the server and no provider was contacted.";
  } catch (e) {
    if (token === version) error(e.message);
  } finally {
    $("generate").disabled = !kit;
  }
});
$("import").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  clearResults();
  clearError();
  const token = version;
  $("generate").disabled = true;
  try {
    if (file.size > 262144) throw Error("Configuration exceeds 256 KiB.");
    const imported = JSON.parse(await file.text()),
      data = await api("/api/build", imported);
    if (token !== version) return;
    kit = data.kit;
    $("build-fee").value = "";
    populate();
    showResults(data);
    $("connection-state").textContent =
      "Campaign configuration imported and revalidated. Provider connections remain unconnected; supplied evidence is not independently verified here.";
  } catch (e) {
    if (token === version) error(e.message);
  } finally {
    event.target.value = "";
    $("generate").disabled = !kit;
  }
});
try {
  const response = await fetch("/api/catalog", { credentials: "omit" });
  if (!response.ok) throw Error("Local generator unavailable.");
  catalog = await response.json();
  $("topic").replaceChildren(
    ...catalog.topics.map((t) => new Option(t.name, t.id)),
  );
  $("topic").disabled = false;
  buildDynamicFields();
  await fresh();
} catch (e) {
  $("connection-state").textContent =
    "Local generator unavailable. No campaign has been generated.";
  error(e.message);
}
