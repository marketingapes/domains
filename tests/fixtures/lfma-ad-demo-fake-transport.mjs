// TEST-ONLY in-memory transport for the LFMA conference demo. Never shipped in lfma/.
// Every result is scripted by the test; nothing is inferred or timed.
export const FAKE_CONFIG = Object.freeze({
  status: 'verified', contractVersion: 'test-fixture', voicePath: 'phone', origin: 'https://contract.test',
  disclosures: { callPurpose: 'Test fixture purpose', callerIdentity: 'Test fixture caller', recordingUse: 'Test fixture recording use' },
  recordingOptional: false, pollMs: 60000
});

export function createFakeTransport(opts = {}) {
  let releaseCreate = null;
  const t = {
    calls: [], statuses: opts.statuses ?? ['starting'], receipt: opts.receipt ?? null,
    verifyResult: opts.verifyResult ?? 'verified', transferResult: opts.transferResult ?? 'requested',
    throwOn: opts.throwOn ?? null, seq: 0,
    // Set hold to an operation name to park its responses until releaseHeld(result) is called.
    hold: null, held: [],
    releaseHeld(result) { const h = t.held.shift(); h?.(result); },
    release() { releaseCreate?.(); },
    async createSession(...args) {
      t.calls.push({ op: 'createSession', args });
      if (t.throwOn === 'createSession') throw new Error('unavailable');
      if (opts.holdCreate) await new Promise(r => { releaseCreate = r; });
      return { sessionId: `fake-${++t.seq}` };
    },
    async launchVoice(...args) { t.calls.push({ op: 'launchVoice', args }); return { state: 'starting' }; },
    async getStatus(...args) { t.calls.push({ op: 'getStatus', args }); return { state: t.statuses.length > 1 ? t.statuses.shift() : t.statuses[0] }; },
    async startVerification(...args) {
      t.calls.push({ op: 'startVerification', args });
      if (t.hold === 'startVerification') return new Promise(r => t.held.push(r));
      return { verification: 'challenge_issued' };
    },
    async confirmVerification(...args) {
      t.calls.push({ op: 'confirmVerification', args });
      if (t.hold === 'confirmVerification') return new Promise(r => t.held.push(r));
      return { verification: t.verifyResult };
    },
    async requestTransfer(...args) { t.calls.push({ op: 'requestTransfer', args }); return { transfer: t.transferResult }; },
    async getReceipt(...args) { t.calls.push({ op: 'getReceipt', args }); return t.receipt; }
  };
  return t;
}
