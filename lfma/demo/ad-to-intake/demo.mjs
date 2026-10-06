import { createSessionController, simulationReceipt, normalizePhone, validEmail, transferSupported } from './adapter.mjs';
import { integrationConfig, transport } from './integration-config.mjs';

export const STATE_LABELS = Object.freeze({
  not_connected: 'Not connected', starting: 'Starting', in_call: 'In call',
  processing: 'Processing', ready: 'Ready', failed: 'Failed'
});
export const RECORDING_TEXT = Object.freeze({
  simulation: 'Simulation — no call took place, so no recording exists.',
  processing: 'Processing. Not available yet.',
  ready: 'Ready.',
  blocked: 'Withheld: the playback link was not on the approved private origin.',
  failed: 'Recording failed. None is available.',
  not_recorded: 'Not recorded.',
  unavailable: 'Not available for this session.'
});
export const TRANSFER_TEXT = Object.freeze({
  simulation: 'Simulation — no transfer was attempted.',
  not_requested: 'Not requested.',
  requested: 'Requested — not yet confirmed as completed.',
  connected: 'Completed: connected to your verified phone.',
  failed: 'Failed. The call was not transferred.',
  unknown: 'Unknown — no result was returned.'
});
export const SMS_TEXT = Object.freeze({
  simulation: 'Simulation — no text was sent.',
  not_consented: 'Not sent: no text consent.',
  not_eligible: 'Not sent: number not eligible.',
  queued: 'Queued — not yet delivered.',
  sent: 'Sent by the service — delivery not confirmed.',
  delivered: 'Delivered.',
  failed: 'Failed. No text was delivered.',
  unknown: 'Unknown — no result was returned.'
});
const VERIFY_TEXT = {
  not_started: 'Not started', invalid: 'That number is not valid', same_as_lead: 'Must be a different phone from the one Sofia calls',
  requesting: 'Requesting…', challenge_issued: 'Code requested — enter it to verify', checking: 'Checking…', verified: 'Verified', failed: 'Verification failed'
};

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  const steps = [...document.querySelectorAll('[data-step]')];
  let started = false;
  let simReceipt = null;
  let current = 0;

  const ctl = createSessionController({ config: integrationConfig, transport, onChange: render });

  const fictionalCase = () => ({
    'Reported state': $('state').value, 'Incident timing': $('timing').value,
    'Injury context': $('injury').value, 'Representation': $('representation').value
  });
  const receipt = () => ctl.snapshot().receipt ?? simReceipt;

  function show(step) {
    if (step > 0 && !started) step = 0;
    if (step === 4 && !receipt()) step = 3;
    current = step;
    steps.forEach(el => { el.hidden = Number(el.dataset.step) !== step; el.classList.remove('entering'); });
    const active = steps[step];
    void active.offsetWidth; active.classList.add('entering');
    document.querySelectorAll('.demo-progress li').forEach((el, i) => i === step ? el.setAttribute('aria-current', 'step') : el.removeAttribute('aria-current'));
    active.querySelector('h2').focus({ preventScroll: true });
    $('journey').scrollIntoView({ behavior: 'instant', block: 'start' });
  }

  function clearSimulation() { simReceipt = null; }

  function render(s = ctl.snapshot()) {
    const live = s.connected;
    $('mode-tag').textContent = live ? 'DEMO · LIVE' : 'DEMO · LIVE NOT CONNECTED';
    const d = integrationConfig.disclosures;
    $('purpose').innerHTML = '';
    if (live && d) {
      $('purpose').append('Call purpose: ', Object.assign(document.createElement('b'), { textContent: d.callPurpose }), '. Caller: ', d.callerIdentity, '. Recording: ', d.recordingUse, '.');
    } else {
      $('purpose').append('Call purpose and destination: ', Object.assign(document.createElement('b'), { textContent: 'pending the approved contract' }), '. Live controls stay off until it is supplied.');
    }
    $('live-pill').dataset.state = s.state;
    $('live-pill').textContent = STATE_LABELS[s.state];
    $('live-status').textContent = !live
      ? 'Not connected. The live voice path has not been approved yet, so no call can start from this page.'
      : s.state === 'failed' ? `Failed: ${s.error ?? 'unknown error'}` : `${STATE_LABELS[s.state]}.`;
    const blockers = ctl.startBlockers();
    $('live-problems').replaceChildren(...(s.state === 'not_connected' ? blockers : []).map(t => Object.assign(document.createElement('li'), { textContent: t })));
    $('start-call').disabled = !live || s.state !== 'not_connected' || blockers.length > 0;
    $('retry-call').hidden = !(live && s.state === 'failed');
    const canHandoff = live && transferSupported(integrationConfig) && s.hasSession && ['starting', 'in_call'].includes(s.state);
    $('handoff').classList.toggle('unavailable', !canHandoff);
    $('recv-phone').disabled = !canHandoff || ['requesting', 'checking', 'verified'].includes(s.verification);
    $('verify-send').disabled = $('recv-phone').disabled;
    $('verify-code').disabled = !canHandoff || s.verification !== 'challenge_issued';
    $('verify-confirm').disabled = $('verify-code').disabled;
    $('verify-state').textContent = !live ? 'Unavailable — not connected'
      : !transferSupported(integrationConfig) ? 'Unavailable on this voice path' : VERIFY_TEXT[s.verification];
    $('transfer-state').textContent = !live ? 'Unavailable — not connected' : TRANSFER_TEXT[s.transfer];
    $('transfer').disabled = !canHandoff || s.state !== 'in_call' || s.verification !== 'verified' || s.transfer !== 'not_requested';
    document.querySelector('.sim-box').hidden = live;
    $('view-receipt').hidden = !s.receipt;
    renderReceipt();
  }

  function renderReceipt() {
    const r = receipt();
    if (!r) {
      ['r-recording', 'r-summary', 'r-transfer', 'r-sms', 'r-perspective-note'].forEach(id => { $(id).textContent = ''; });
      $('r-perspective').replaceChildren();
      $('sms-state').textContent = 'This page does not send texts; none has been sent.';
      if (current === 4) show(3);
      return;
    }
    const sim = r.mode === 'simulation';
    $('receipt').dataset.mode = r.mode;
    $('receipt-mode').textContent = sim ? 'SIMULATION · NOT A REAL CALL' : 'LIVE SESSION';
    $('receipt-heading').textContent = sim ? 'Simulated session receipt' : 'Session receipt';
    const rec = $('r-recording'); rec.replaceChildren(RECORDING_TEXT[r.recording.state]);
    if (r.recording.state === 'ready' && r.recording.playbackUrl) {
      const a = Object.assign(document.createElement('audio'), { controls: true, preload: 'none', src: r.recording.playbackUrl });
      a.setAttribute('aria-label', 'Your demo call recording'); rec.append(a);
    }
    $('r-summary').textContent = sim ? 'Simulation — no conversation took place, so there is no summary.' : (r.summary ?? 'Not available for this session.');
    $('r-transfer').textContent = TRANSFER_TEXT[r.transfer];
    $('r-sms').textContent = SMS_TEXT[r.sms];
    $('sms-state').textContent = sim ? 'Simulation — no text was sent.' : SMS_TEXT[r.sms];
    $('r-perspective-note').textContent = sim
      ? 'Simulation — these are the fictional answers you picked, as a firm would see them. No assessment was made.'
      : r.perspective?.length ? 'Returned for this session only.' : 'Not available for this session.';
    $('r-perspective').replaceChildren(...(r.perspective ?? []).flatMap(p => [
      Object.assign(document.createElement('dt'), { textContent: p.label }),
      Object.assign(document.createElement('dd'), { textContent: p.value })
    ]));
  }

  // Step 01: identity, transient only.
  $('start-demo').addEventListener('click', () => {
    const name = $('p-name').value.trim(), email = $('p-email').value.trim();
    const err = !name ? 'Enter your name.' : !validEmail(email) ? 'Enter a valid work email.' : '';
    $('start-error').textContent = err;
    if (err) { (name ? $('p-email') : $('p-name')).focus(); return; }
    started = true; clearSimulation();
    ctl.setParticipant({ name, email });
    ctl.setFictionalCase(fictionalCase());
    show(1);
  });
  ['p-name', 'p-email'].forEach(id => $(id).addEventListener('input', () => {
    if (!started) return;
    started = false; clearSimulation(); ctl.setParticipant(null);
  }));

  document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => show(Number(el.dataset.go))));

  document.querySelectorAll('.fixture-fields select').forEach(el => el.addEventListener('change', () => {
    clearSimulation(); ctl.setFictionalCase(fictionalCase());
  }));

  const readConsent = () => ({ phoneContact: $('c-phone').checked, recording: $('c-recording').checked, sms: $('c-sms').checked });
  ['c-phone', 'c-recording', 'c-sms'].forEach(id => $(id).addEventListener('change', () => { clearSimulation(); ctl.setConsent(readConsent()); }));

  $('lead-phone').addEventListener('input', () => { $('lead-error').textContent = ''; clearSimulation(); ctl.setLeadPhone($('lead-phone').value); });
  $('lead-phone').addEventListener('blur', () => {
    const v = $('lead-phone').value.trim();
    $('lead-error').textContent = v && !normalizePhone(v) ? 'Enter a valid US phone number.' : '';
  });

  $('start-call').addEventListener('click', () => ctl.start());
  $('retry-call').addEventListener('click', () => ctl.start());
  $('verify-send').addEventListener('click', () => ctl.startVerification($('recv-phone').value));
  $('verify-confirm').addEventListener('click', () => ctl.confirmVerification($('verify-code').value));
  $('transfer').addEventListener('click', () => ctl.requestTransfer());

  $('simulate').addEventListener('click', () => {
    if (ctl.snapshot().connected) return;
    simReceipt = simulationReceipt(fictionalCase());
    render(); show(4);
  });

  $('reset').addEventListener('click', () => {
    started = false; clearSimulation();
    ['p-name', 'p-email', 'lead-phone', 'recv-phone', 'verify-code'].forEach(id => { $(id).value = ''; });
    ['start-error', 'lead-error'].forEach(id => { $(id).textContent = ''; });
    ['c-phone', 'c-recording', 'c-sms'].forEach(id => { $(id).checked = false; });
    document.querySelectorAll('select').forEach(el => { el.selectedIndex = 0; });
    ctl.reset();
    show(0);
  });

  render();
}
