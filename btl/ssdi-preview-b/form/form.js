"use strict";
(() => {
  const form = document.getElementById("ssdi-form");
  const ids = ["full-name", "email", "phone", "claim-stage", "work-status", "duration"];
  const field = id => document.getElementById(id);
  function errorFor(id) {
    const el = field(id);
    if (!el.value.trim()) return "Please " + (el.tagName === "SELECT" ? "select an option." : "enter your " + ({"full-name":"name",email:"email",phone:"phone number"}[id]) + ".");
    if (id === "full-name" && el.value.trim().length < 2) return "Please enter at least two characters.";
    if (id === "email" && !el.validity.valid) return "Please enter a valid email address.";
    if (id === "phone") {
      const digits = el.value.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15 || /[^+()\d\s.\-]/.test(el.value)) return "Please enter a valid phone number with 10 to 15 digits.";
    }
    return "";
  }
  function showError(id, message) {
    field(id).setAttribute("aria-invalid", String(Boolean(message)));
    field(id + "-error").textContent = message;
  }
  ids.forEach(id => {
    field(id).addEventListener("input", () => { if (field(id).getAttribute("aria-invalid") === "true") showError(id, errorFor(id)); });
    field(id).addEventListener("change", () => { if (field(id).getAttribute("aria-invalid") === "true") showError(id, errorFor(id)); });
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    let firstInvalid = null;
    ids.forEach(id => { const error = errorFor(id); showError(id, error); if (error && !firstInvalid) firstInvalid = field(id); });
    if (firstInvalid) { field("form-error").textContent = "Please check the highlighted fields."; firstInvalid.focus(); return; }
    field("form-error").textContent = "";
    // Discard entered values. No payload, storage write, analytics or network request.
    form.reset();
    field("demo-reference").textContent = "DEMO-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    field("form-content").hidden = true;
    field("form-confirmation").hidden = false;
    field("form-confirmation").focus();
  });
  field("restart-form").addEventListener("click", () => {
    form.reset(); ids.forEach(id => showError(id, "")); field("form-error").textContent = ""; field("demo-reference").textContent = "";
    field("form-confirmation").hidden = true; field("form-content").hidden = false; field("full-name").focus();
  });
})();
