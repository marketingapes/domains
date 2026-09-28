(function () {
  var form = document.getElementById("shop-desk-form");
  var success = document.getElementById("success");
  var successEmail = document.getElementById("success-email");
  var STORAGE_KEY = "ma_shop_desk_lead";

  function normalizeUrl(raw) {
  var v = (raw || "").trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  return v;
  }

  function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
  }

  function isValidUrl(v) {
  try {
  var u = new URL(v);
  return u.protocol === "http:" || u.protocol === "https:";
  } catch (e) {
  return false;
  }
  }

  function setInvalid(el, errId, on) {
  if (on) {
  el.classList.add("is-invalid");
  document.getElementById(errId).classList.add("show");
  } else {
  el.classList.remove("is-invalid");
  document.getElementById(errId).classList.remove("show");
  }
  }

  form.addEventListener("submit", function (e) {
  e.preventDefault();

  var businessEl = document.getElementById("business");
  var nicheEl = document.getElementById("niche");
  var websiteEl = document.getElementById("website");
  var emailEl = document.getElementById("email");

  var business = businessEl.value.trim();
  var niche = nicheEl.value.trim();
  var website = normalizeUrl(websiteEl.value);
  var email = emailEl.value.trim();

  websiteEl.value = website;

  var ok = true;
  if (!business) { setInvalid(businessEl, "err-business", true); ok = false; }
  else setInvalid(businessEl, "err-business", false);

  if (!niche) { setInvalid(nicheEl, "err-niche", true); ok = false; }
  else setInvalid(nicheEl, "err-niche", false);

  if (!website || !isValidUrl(website)) { setInvalid(websiteEl, "err-website", true); ok = false; }
  else setInvalid(websiteEl, "err-website", false);

  if (!email || !isValidEmail(email)) { setInvalid(emailEl, "err-email", true); ok = false; }
  else setInvalid(emailEl, "err-email", false);

  if (!ok) {
  var firstBad = form.querySelector(".is-invalid");
  if (firstBad) firstBad.focus();
  return;
  }

  var payload = {
  product: "shop-desk",
  business: business,
  niche: niche,
  website: website,
  instagram: document.getElementById("instagram").value.trim() || null,
  facebook: document.getElementById("facebook").value.trim() || null,
  email: email,
  notes: document.getElementById("notes").value.trim() || null,
  savedAt: new Date().toISOString(),
  tz: "America/Los_Angeles"
  };

  try {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
  // Still show success UX even if storage is blocked
  }

  form.style.display = "none";
  successEmail.textContent = email;
  success.classList.add("show");
  success.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // Soft-clear invalid state on input
  ["business", "niche", "website", "email"].forEach(function (id) {
  var el = document.getElementById(id);
  el.addEventListener("input", function () {
  el.classList.remove("is-invalid");
  var err = document.getElementById("err-" + id);
  if (err) err.classList.remove("show");
  });
  });
  })();
