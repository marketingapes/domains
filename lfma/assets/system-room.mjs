/** Illustrative desk for One Case, One Door. No live lead, no spend, no signed-case claim. */
export const REASON_TEXT = Object.freeze({
  lawyer: 'Already has a lawyer',
  noharm: 'No physical injury',
  late: 'Outside 12 months'
});

export const SAMPLE_INQUIRIES = Object.freeze([
  Object.freeze({
    id: 'wrong',
    title: 'Inquiry A',
    lines: Object.freeze(['Crash, fourteen months ago.', 'Sore neck.', 'Already has a lawyer.']),
    violates: Object.freeze(['late', 'lawyer'])
  }),
  Object.freeze({
    id: 'inside',
    title: 'Inquiry B',
    lines: Object.freeze(['Arizona.', 'Physically hurt.', 'Three weeks ago.', 'No lawyer.']),
    violates: Object.freeze([])
  })
]);

export function evaluateInquiry(inquiry) {
  if (!inquiry || !Array.isArray(inquiry.violates)) {
    throw new Error('Inquiry is missing its rule check.');
  }
  const reasons = inquiry.violates.map(id => {
    if (!REASON_TEXT[id]) throw new Error('Unknown rule.');
    return REASON_TEXT[id];
  });
  return Object.freeze({
    id: inquiry.id,
    decision: reasons.length ? 'REFUSED' : 'HANDOFF',
    reasons: Object.freeze(reasons)
  });
}

export function nextDollar(marks) {
  if (!Array.isArray(marks)) throw new Error('Marks must be a list.');
  const seen = new Map();
  for (const mark of marks) {
    if (!mark || !['ACCEPT', 'REJECT', 'PENDING'].includes(mark.decision)) {
      throw new Error('A mark must be accept, reject, or pending.');
    }
    if (mark.decision !== 'REJECT') continue;
    const reason = String(mark.reason || '').trim().toLowerCase();
    if (!reason) throw new Error('A reject needs one reason.');
    seen.set(reason, (seen.get(reason) || 0) + 1);
    if (seen.get(reason) >= 2) {
      return Object.freeze({
        pause: true,
        change: `Pause media. The same reject reason came back twice: ${reason}.`
      });
    }
  }
  if (!marks.length) {
    return Object.freeze({ pause: false, change: 'No mark yet. The next dollar stays off.' });
  }
  return Object.freeze({
    pause: false,
    change: 'One mark is not a pattern. The next dollar waits until the same reject reason comes back twice.'
  });
}

export function buildReport({ matter, evaluations, marks }) {
  if (!Array.isArray(evaluations) || !Array.isArray(marks)) {
    throw new Error('The report needs the inquiries and the marks.');
  }
  const dollar = nextDollar(marks);
  return Object.freeze({
    matter: String(matter || '').trim(),
    refused: evaluations.filter(item => item.decision === 'REFUSED').length,
    handed: evaluations.filter(item => item.decision === 'HANDOFF').length,
    marks: Object.freeze(marks.map(mark => Object.freeze({
      decision: mark.decision,
      reason: String(mark.reason || '').trim()
    }))),
    pause: dollar.pause,
    change: dollar.change
  });
}
