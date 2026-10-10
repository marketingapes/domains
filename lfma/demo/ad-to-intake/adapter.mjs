// Conference demo integration boundary. Pure logic: no network, DOM or storage.
// Live behaviour only exists through an injected transport bound to a verified
// contract (see integration-config.mjs). Without one, every live action reports
// "integration_not_configured" and nothing leaves the page.

export const LIVE_STATES = Object.freeze(['not_connected', 'starting', 'in_call', 'processing', 'ready', 'failed']);
export const VOICE_PATHS = Object.freeze(['phone', 'browser']);
export const TRANSPORT_OPERATIONS = Object.freeze([
  'createSession', 'launchVoice', 'getStatus', 'startVerification', 'confirmVerification', 'requestTransfer', 'getReceipt'
]);

export const UNCONNECTED = Object.freeze({
  status: 'unconnected',
  contractVersion: null,
  voicePath: null,
  origin: null,
  disclosures: null,
  recordingOptional: false,
  pollMs: 3000
});

// US-only normalisation for the demo; returns E.164 or null.
export function normalizePhone(raw) {
  const digits = String(raw ?? '').replace(/[\s().-]/g, '').replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) return null;
  const national = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
  if (national.length !== 10 || /^[01]/.test(national) || /^\d{3}[01]/.test(national)) return null;
  return '+1' + national;
}

export function validEmail(raw) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(raw ?? '').trim());
}

// A config is live-capable only when every field the coordinator must supply is present.
export function configProblems(config, transport) {
  const problems = [];
  if (!config || config.status !== 'verified') problems.push('No verified integration contract has been supplied.');
  if (config && !config.contractVersion) problems.push('Contract version missing.');
  if (config && !VOICE_PATHS.includes(config.voicePath)) problems.push('Live voice path is pending an owner decision.');
  if (config && !/^https:\/\/[^/*]+$/.test(config.origin ?? '')) problems.push('Approved integration origin missing.');
  const d = config?.disclosures;
  if (!d || !d.callPurpose || !d.callerIdentity || !d.recordingUse) problems.push('Approved consent and disclosure copy missing.');
  if (!transport || TRANSPORT_OPERATIONS.some(op => typeof transport[op] !== 'function')) problems.push('No transport is bound.');
  return problems;
}

// Transfers to PSTN are only possible on the phone path (browser voice cannot transfer).
export function transferSupported(config) {
  return config?.voicePath === 'phone';
}

// Only backend-controlled playback on the approved origin may be shown.
export function safePlaybackUrl(config, url) {
  if (typeof url !== 'string' || !config?.origin) return null;
  try {
    const u = new URL(url);
    return u.origin === config.origin && !u.username && !u.password ? u.href : null;
  } catch { return null; }
}

function freshLive() {
  return {
    state: 'not_connected', sessionId: null, error: null,
    verification: 'not_started', verifiedPhone: null, pendingPhone: null,
    transfer: 'not_requested', receipt: null
  };
}

// Session controller. All participant data lives only in this closure.
export function createSessionController({ config = UNCONNECTED, transport = null, onChange = () => {} } = {}) {
  let generation = 0;
  let verifyGen = 0;
  let starting = null;
  let pollTimer = null;
  let participant = null;
  let consent = { phoneContact: false, recording: false, sms: false };
  let fictionalCase = null;
  let leadPhone = null;
  let live = freshLive();

  const problems = () => configProblems(config, transport);
  const connected = () => problems().length === 0;
  const emit = () => onChange(snapshot());

  function snapshot() {
    return {
      connected: connected(), problems: problems(), transferSupported: transferSupported(config),
      generation, hasParticipant: Boolean(participant), consent: { ...consent },
      state: live.state, error: live.error, verification: live.verification,
      transfer: live.transfer, receipt: live.receipt, hasSession: Boolean(live.sessionId),
      pendingPhone: live.pendingPhone, verifiedPhone: live.verifiedPhone
    };
  }

  function stopPolling() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; } }

  // Any change to identity, consent or fictional answers discards the old session.
  function invalidate() {
    generation++; verifyGen++; starting = null; stopPolling();
    live = freshLive();
    emit();
  }

  function guard(gen) { return gen === generation; }

  function fail(gen, error) {
    if (!guard(gen)) return;
    stopPolling();
    live.state = 'failed'; live.error = error;
    emit();
  }

  function setParticipant(next) {
    const name = next ? String(next.name).trim() : null, email = next ? String(next.email).trim() : null;
    if (!participant || participant.name !== name || participant.email !== email) {
      consent = { phoneContact: false, recording: false, sms: false }; leadPhone = null;
    }
    participant = next ? { name, email } : null;
    invalidate();
  }
  function setConsent(next) { consent = { phoneContact: !!next.phoneContact, recording: !!next.recording, sms: !!next.sms }; invalidate(); }
  function setFictionalCase(next) { fictionalCase = next ? { ...next } : null; invalidate(); }
  function setLeadPhone(raw) { leadPhone = raw ? normalizePhone(raw) : null; invalidate(); }

  function startBlockers() {
    const b = [...problems()];
    if (!participant) b.push('Enter your name and work email first.');
    if (!fictionalCase) b.push('Fictional case answers missing.');
    if (!consent.phoneContact) b.push('Phone contact consent is required.');
    if (!consent.recording && !config.recordingOptional) b.push('Call recording consent is required for this demo.');
    if (config.voicePath !== 'browser' && !leadPhone) b.push('Enter a valid phone number for Sofia to call.');
    return b;
  }

  async function start() {
    if (starting) return starting;
    if (!['not_connected', 'failed'].includes(live.state)) return { ok: false, reason: 'already_active' };
    const blockers = startBlockers();
    if (blockers.length) return { ok: false, reason: connected() ? 'blocked' : 'integration_not_configured', blockers };
    if (live.state === 'failed') { generation++; live = freshLive(); }
    const gen = generation;
    live.state = 'starting'; live.error = null; emit();
    starting = (async () => {
      try {
        const created = await transport.createSession({
          participant: { ...participant }, consent: { ...consent }, fictionalCase: { ...fictionalCase },
          leadPhone: config.voicePath === 'phone' ? leadPhone : null, voicePath: config.voicePath
        });
        if (!guard(gen)) return { ok: false, reason: 'stale' };
        if (!created?.sessionId) { fail(gen, 'Session was not created.'); return { ok: false, reason: 'failed' }; }
        live.sessionId = created.sessionId;
        const launched = await transport.launchVoice(live.sessionId);
        if (!guard(gen)) return { ok: false, reason: 'stale' };
        if (!launched || launched.error) { fail(gen, launched?.error ?? 'Voice launch failed.'); return { ok: false, reason: 'failed' }; }
        // "starting" stays until the backend reports otherwise.
        schedulePoll(gen, 0);
        return { ok: true };
      } catch (err) {
        fail(gen, 'Live service unavailable.');
        return { ok: false, reason: 'failed' };
      } finally { if (guard(gen)) starting = null; }
    })();
    return starting;
  }

  function schedulePoll(gen, delay) {
    stopPolling();
    pollTimer = setTimeout(() => refresh(gen), delay);
    pollTimer?.unref?.(); // never hold a Node process open; no effect in browsers
  }

  async function refresh(gen = generation) {
    if (!live.sessionId || !connected()) return;
    try {
      const s = await transport.getStatus(live.sessionId);
      if (!guard(gen)) return;
      if (!s || !LIVE_STATES.includes(s.state) || s.state === 'not_connected') { fail(gen, 'Unrecognised status from live service.'); return; }
      live.state = s.state; live.error = s.error ?? null;
      if (s.transfer) live.transfer = s.transfer;
      if (s.state === 'ready') { await loadReceipt(gen); return; }
      emit();
      if (s.state !== 'failed') schedulePoll(gen, config.pollMs ?? 3000);
    } catch { fail(gen, 'Live service unavailable.'); }
  }

  async function loadReceipt(gen = generation) {
    try {
      const r = await transport.getReceipt(live.sessionId);
      if (!guard(gen)) return;
      live.receipt = normalizeReceipt(r);
      if (live.receipt.transfer !== 'unknown') live.transfer = live.receipt.transfer;
      emit();
      if (live.receipt.recording.state === 'processing') schedulePoll(gen, config.pollMs ?? 3000);
    } catch { if (guard(gen)) { live.receipt = normalizeReceipt(null); emit(); } }
  }

  function normalizeReceipt(r) {
    const recState = ['processing', 'ready', 'failed', 'not_recorded'].includes(r?.recording?.state) ? r.recording.state : 'unavailable';
    const playback = recState === 'ready' ? safePlaybackUrl(config, r.recording.playbackUrl) : null;
    return {
      mode: 'live',
      summary: typeof r?.summary === 'string' && r.summary.trim() ? r.summary.trim() : null,
      perspective: Array.isArray(r?.perspective) ? r.perspective.filter(p => p && p.label && p.value).map(p => ({ label: String(p.label), value: String(p.value) })) : null,
      recording: { state: recState === 'ready' && !playback ? 'blocked' : recState, playbackUrl: playback },
      transfer: ['not_requested', 'requested', 'connected', 'failed'].includes(r?.transfer?.state) ? r.transfer.state : 'unknown',
      sms: ['not_consented', 'queued', 'sent', 'delivered', 'failed', 'not_eligible'].includes(r?.sms?.state) ? r.sms.state : 'unknown'
    };
  }

  // Verification has its own generation: editing the receiving number, a new
  // challenge or a session change makes every in-flight verification response stale.
  const verifyGuard = (gen, vgen) => guard(gen) && vgen === verifyGen;

  function resetVerification() {
    if (live.transfer !== 'not_requested') return false;
    verifyGen++;
    live.verification = 'not_started'; live.pendingPhone = null; live.verifiedPhone = null;
    emit();
    return true;
  }

  async function startVerification(raw) {
    const phone = normalizePhone(raw);
    if (!transferSupported(config) || !live.sessionId || live.transfer !== 'not_requested') return { ok: false, reason: 'unavailable' };
    if (['requesting', 'checking'].includes(live.verification)) return { ok: false, reason: 'busy' };
    verifyGen++;
    live.pendingPhone = null; live.verifiedPhone = null;
    if (!phone) { live.verification = 'invalid'; emit(); return { ok: false, reason: 'invalid_phone' }; }
    if (phone === leadPhone) { live.verification = 'same_as_lead'; emit(); return { ok: false, reason: 'same_as_lead' }; }
    const gen = generation, vgen = verifyGen;
    live.verification = 'requesting'; emit();
    try {
      const r = await transport.startVerification(live.sessionId, phone);
      if (!verifyGuard(gen, vgen)) return { ok: false, reason: 'stale' };
      live.verification = r?.verification === 'challenge_issued' ? 'challenge_issued' : 'failed';
      if (live.verification === 'challenge_issued') live.pendingPhone = phone;
    } catch {
      if (!verifyGuard(gen, vgen)) return { ok: false, reason: 'stale' };
      live.verification = 'failed';
    }
    emit();
    return { ok: live.verification === 'challenge_issued' };
  }

  async function confirmVerification(code) {
    if (live.verification !== 'challenge_issued' || !live.sessionId || !live.pendingPhone) return { ok: false };
    const gen = generation, vgen = verifyGen, phone = live.pendingPhone;
    live.verification = 'checking'; emit();
    try {
      const r = await transport.confirmVerification(live.sessionId, String(code ?? '').trim(), phone);
      if (!verifyGuard(gen, vgen)) return { ok: false, reason: 'stale' };
      live.verification = r?.verification === 'verified' ? 'verified' : 'failed';
      live.verifiedPhone = live.verification === 'verified' ? phone : null;
    } catch {
      if (!verifyGuard(gen, vgen)) return { ok: false, reason: 'stale' };
      live.verification = 'failed';
    }
    if (live.verification !== 'verified') live.pendingPhone = null;
    emit();
    return { ok: live.verification === 'verified' };
  }

  async function requestTransfer() {
    if (!transferSupported(config) || live.state !== 'in_call' || live.verification !== 'verified' || live.transfer === 'requested') return { ok: false };
    const gen = generation;
    live.transfer = 'requested'; emit();
    try {
      const r = await transport.requestTransfer(live.sessionId, live.verifiedPhone);
      if (!guard(gen)) return { ok: false, reason: 'stale' };
      // A request is not a completed transfer; completion only comes from status/receipt.
      if (!r || r.transfer === 'failed' || r.error) live.transfer = 'failed';
    } catch { if (guard(gen)) live.transfer = 'failed'; }
    emit();
    return { ok: live.transfer === 'requested' };
  }

  function reset() {
    participant = null; consent = { phoneContact: false, recording: false, sms: false };
    fictionalCase = null; leadPhone = null;
    invalidate();
  }

  return {
    snapshot, start, refresh: () => refresh(), startVerification, confirmVerification, resetVerification, requestTransfer,
    setParticipant, setConsent, setFictionalCase, setLeadPhone, startBlockers, reset
  };
}

// Simulation receipt: derived only from the fictional answers, always labeled.
export function simulationReceipt(fictionalCase) {
  return {
    mode: 'simulation',
    summary: null,
    perspective: Object.entries(fictionalCase ?? {}).map(([label, value]) => ({ label, value: String(value) })),
    recording: { state: 'simulation', playbackUrl: null },
    transfer: 'simulation',
    sms: 'simulation'
  };
}
