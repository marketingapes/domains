import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const load = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const campaign = load('meta-campaign-blueprint.json');
const forms = [load('nil-meta-instant-form.json'), load('dihac-meta-instant-form.json')];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(campaign.status === 'DRAFT_DO_NOT_PUBLISH', 'campaign must remain draft');
assert(campaign.campaign.budget_requires_human_approval === true, 'budget gate missing');
assert(campaign.campaign.hard_cap_usd === 150, 'unexpected pilot cap');
assert(campaign.cells.length === 2, 'pilot must contain exactly two test cells');

const expectedKeys = [
  'first_name', 'last_name', 'phone_number', 'email', 'state',
  'accident_type', 'incident_recency', 'contact_consent',
];
for (const form of forms) {
  assert(form.status === 'DRAFT_DO_NOT_PUBLISH', `${form.name} must remain draft`);
  assert(form.form_type === 'HIGHER_INTENT', `${form.name} must use higher intent`);
  assert(JSON.stringify(form.questions.map((q) => q.key)) === JSON.stringify(expectedKeys),
    `${form.name} field mapping changed`);
  assert(form.consent.text.includes('AI intake assistant'), `${form.name} lacks AI disclosure`);
  assert(form.consent.text.includes('Reply STOP'), `${form.name} lacks SMS opt-out`);
  assert(form.consent.text.includes('not a condition of purchase'),
    `${form.name} lacks non-condition disclosure`);
}

const prohibited = [
  /attorney will contact/i,
  /within 15 minutes/i,
  /guaranteed representation/i,
  /we('ll| will) tell you if you have a (legal )?(case|claim)/i,
];
for (const filename of [
  'meta-campaign-blueprint.json', 'nil-meta-instant-form.json',
  'dihac-meta-instant-form.json', 'followup-copy.md',
]) {
  const text = fs.readFileSync(path.join(root, filename), 'utf8');
  for (const pattern of prohibited) {
    assert(!pattern.test(text), `${filename} contains prohibited promise: ${pattern}`);
  }
}

for (const filename of [
  'creative/nil-clearer-next-step-square-v1.png',
  'creative/dihac-not-sure-square-v1.png',
]) {
  const image = fs.readFileSync(path.join(root, filename));
  assert(image.subarray(1, 4).toString() === 'PNG', `${filename} is not PNG`);
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  assert(width === height && width >= 1080, `${filename} is not a large square asset`);
}

console.log('Arizona MVA pilot assets: valid');
