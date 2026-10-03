export function locationError(code) {
  if (code === 1) return 'Permission denied. No location was shared with this page. You can skip this test. If you later choose to allow this site in your browser, retry or reload; a browser may not show the prompt again.';
  if (code === 2) return 'Location unavailable. Your browser could not determine a position. No coordinates were displayed. Retry when location is available, or skip this test.';
  if (code === 3) return 'Location request timed out. No coordinates were displayed. Retry when ready, or skip this test.';
  return 'Location request failed. No coordinates were displayed. Retry or reload, or skip this test.';
}
export const examples = Object.freeze({
  incomplete: {reference:'DEMO-001',contact:'Not confirmed',duplicate:'Not checked',permission:'Not documented',decision:'Hold for human review',reason:'A browser hint cannot fill the missing contact and permission checks.'},
  repeat: {reference:'DEMO-002',contact:'Confirmed in this fictional example',duplicate:'Possible repeat; unresolved',permission:'Documented in this fictional example',decision:'Review the possible duplicate',reason:'A repeat inquiry may be legitimate. Review its context before suppression; a shared IP alone is not a duplicate key.'},
  reviewed: {reference:'DEMO-003',contact:'Confirmed in this fictional example',duplicate:'Reviewed in this fictional example',permission:'Documented in this fictional example',decision:'Ready for intended intake handoff',reason:'Documented checks support a handoff. They do not guarantee a valid claim, intake acceptance or a signed case.'}
});
export function mount(doc = document, nav = navigator, win = window) {
  const get = id => doc.getElementById(id);
  const ua = nav.userAgent || '';
  get('system').textContent = /Android/i.test(ua) ? 'Android hint' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS / iPadOS hint' : /Windows/i.test(ua) ? 'Windows hint' : /Macintosh/i.test(ua) ? 'macOS / iPadOS hint' : /Linux/i.test(ua) ? 'Linux hint' : 'Not exposed / unknown';
  get('language').textContent = nav.language || 'Not exposed';
  get('viewport').textContent = `${win.innerWidth} × ${win.innerHeight} CSS px`;
  get('arrival').textContent = new Date().toLocaleTimeString();
  const button = get('location-button'), status = get('location-status'), output = get('coordinates'), clear = get('clear-location'), mapResult = get('map-result'), mapFrame = get('map-frame');
  button.addEventListener('click', () => {
    output.textContent = ''; output.hidden = true; clear.hidden = true; mapFrame.replaceChildren(); mapResult.hidden = true;
    if (!win.isSecureContext) { status.textContent = 'Location requires HTTPS or a local test server. Nothing was requested. Open the secure page to try, or skip this test.'; return; }
    if (!nav.geolocation) { status.textContent = 'Location is not supported in this browser. Nothing was requested. Try a supported browser, or skip this test.'; return; }
    button.disabled = true; button.textContent = 'Waiting for browser permission / position…';
    status.textContent = 'Your browser handles permission. You can decline; this demo does not need location.';
    const fail = code => { status.textContent = locationError(code); button.disabled = false; button.hidden = false; button.textContent = 'Retry location test'; };
    try {
      nav.geolocation.getCurrentPosition(position => {
        const {latitude, longitude, accuracy} = position.coords;
        if (![latitude,longitude,accuracy].every(Number.isFinite) || Math.abs(latitude)>90 || Math.abs(longitude)>180 || accuracy<0) { fail(2); return; }
        output.textContent = `Latitude: ${latitude.toFixed(5)} · Longitude: ${longitude.toFixed(5)} · Reported accuracy: ±${Math.round(accuracy)} m`;
        output.hidden = false; clear.hidden = false;
        const iframe = doc.createElement('iframe');
        iframe.title = 'Google Map centered on your browser-reported position';
        iframe.src = `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;
        iframe.loading = 'eager'; iframe.referrerPolicy = 'no-referrer';
        mapFrame.replaceChildren(iframe); mapResult.hidden = false;
        status.textContent = 'Browser position received. Coordinates shared with Google to load your map; not proof of identity, GPS use, or legal eligibility.';
        button.disabled = false; button.textContent = 'Request location again';
      }, error => fail(error?.code), {enableHighAccuracy:true,timeout:12000,maximumAge:0});
    } catch { fail(); }
  });
  clear.addEventListener('click', () => {
    output.textContent = ''; output.hidden = true; clear.hidden = true; mapFrame.replaceChildren(); mapResult.hidden = true;
    status.textContent = 'Map and displayed coordinates removed. Browser permission is unchanged. Clearing cannot undo coordinates already shared with Google.';
    button.textContent = 'Show my dot on Google Maps'; button.focus();
  });
  function renderExample(key) {
    const record = examples[key]; if (!record) return;
    const heading = doc.createElement('h3'); heading.textContent = `${record.reference} · Synthetic receipt`;
    const list = doc.createElement('dl');
    for (const [label,value] of [['Contact',record.contact],['Duplicate review',record.duplicate],['Permission',record.permission],['Review decision',record.decision],['Firm outcome','Not reported']]) {
      const term=doc.createElement('dt'), description=doc.createElement('dd'); term.textContent=label; description.textContent=value; list.append(term,description);
    }
    const reason=doc.createElement('p'); reason.textContent=record.reason;
    get('receipt').replaceChildren(heading,list,reason);
    doc.querySelectorAll('[data-example]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.example===key)));
  }
  doc.querySelectorAll('[data-example]').forEach(node=>node.addEventListener('click',()=>renderExample(node.dataset.example)));
  renderExample('incomplete');
}
if (typeof document !== 'undefined') mount();
