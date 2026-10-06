import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SAMPLE_INQUIRIES, evaluateInquiry, buildReport, nextDollar} from '../lfma/assets/system-room.mjs';
import {readFormData, buildOrderPayload} from '../lfma/assets/order-intake-client.mjs';

const pages = [
  'lfma/system/index.html',
  'lfma/system/room/index.html',
  'lfma/llms.txt'
];
const banned = [/10x/i, /\$100/, /clients tomorrow/i, /AI will replace/i, /\$2,500/, /\b2,500\b/, /3,880/, /3880/, /Phillips/];

async function text(path) {
  return readFile(new URL('../' + path, import.meta.url), 'utf8');
}

test('public system copy stays inside the claim boundary', async () => {
  for (const path of pages) {
    const body = await text(path);
    for (const pattern of banned) assert.doesNotMatch(body, pattern, path);
  }
  const offer = await text('lfma/system/index.html');
  assert.match(offer, /\$7,500/);
  assert.match(offer, /\$1,500/);
  assert.match(offer, /not a law firm/i);
  assert.match(offer, /Still being built/);
  assert.match(offer, /the-refusal\.mp4/);
  assert.match(offer, /two-lists\.mp4/);
  assert.match(offer, /whose-name\.mp4/);
  const room = await text('lfma/system/room/index.html');
  assert.match(room, /one-case-one-door/);
  assert.match(room, /value="7500"/);
  assert.match(room, /hook\.us2\.make\.com\/dwzmtn5xbkdrt6pjvli9jgy3auppobbi/);
  assert.match(room, /fictional/i);
  const home = await text('lfma/index.html');
  assert.match(home, /href="\/system\/"/);
});

test('the wrong inquiry dies and the inside inquiry is handed off', () => {
  const wrong = evaluateInquiry(SAMPLE_INQUIRIES[0]);
  const inside = evaluateInquiry(SAMPLE_INQUIRIES[1]);
  assert.equal(wrong.decision, 'REFUSED');
  assert.deepEqual(wrong.reasons, ['Outside 12 months', 'Already has a lawyer']);
  assert.equal(inside.decision, 'HANDOFF');
  assert.equal(inside.reasons.length, 0);
});

test('one reject waits and the same reason twice pauses the next dollar', () => {
  assert.equal(nextDollar([]).pause, false);
  const once = nextDollar([{decision: 'REJECT', reason: 'Already has a lawyer'}]);
  assert.equal(once.pause, false);
  const twice = buildReport({
    matter: 'Arizona motor-vehicle injury',
    evaluations: [evaluateInquiry(SAMPLE_INQUIRIES[0]), evaluateInquiry(SAMPLE_INQUIRIES[1])],
    marks: [
      {decision: 'REJECT', reason: 'Already has a lawyer'},
      {decision: 'REJECT', reason: 'already has a lawyer'}
    ]
  });
  assert.equal(twice.refused, 1);
  assert.equal(twice.handed, 1);
  assert.equal(twice.pause, true);
  assert.match(twice.change, /Pause media/);
});

test('the room brief is a scope, not an invoice', () => {
  const form = new FormData();
  form.set('buyer_name', 'Example Firm');
  form.set('contact_name', 'Ada Partner');
  form.set('email', 'ada@example.com');
  form.set('phone', '6195550100');
  form.set('states', 'Arizona');
  form.set('case_types', 'Arizona motor-vehicle injury');
  form.set('product', 'one-case-one-door');
  form.set('price_usd', '7500');
  form.set('type', 'Law firm');
  form.set('notes', 'Scope only. Media is not authorized.');
  const raw = readFormData(form);
  const payload = buildOrderPayload(raw, {
    referenceId: 'MAO-00000000-0000-4000-8000-000000000001',
    tenantId: 'LFMA',
    sourceUrl: 'https://lawfirmmarketingapes.com/system/room/',
    pageVersion: 'lfma-system-room-v1',
    now: new Date('2026-10-05T12:00:00Z')
  });
  assert.equal(payload.get('price_usd'), '7500');
  assert.equal(payload.get('product'), 'one-case-one-door');
  assert.match(payload.get('notes'), /NOT VERIFIED/);
  assert.match(payload.get('notes'), /not an invoice/);
});

test('films are h264 and carry no audio track', async () => {
  for (const name of ['the-refusal.mp4', 'two-lists.mp4', 'whose-name.mp4']) {
    const buf = await readFile(new URL('../lfma/system/media/' + name, import.meta.url));
    assert.ok(buf.subarray(0, 32).includes(Buffer.from('ftyp')), name);
    assert.ok(buf.includes(Buffer.from('avc1')), name);
    assert.equal(buf.includes(Buffer.from('mp4a')), false, name);
    assert.ok(buf.length > 20000 && buf.length < 2000000, name);
  }
});
