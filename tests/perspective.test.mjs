import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../lfma/assets/portal/perspective.js');

test('Litify rows map to the three Phillips campaigns', () => {
  assert.equal(P.campaignForLitify({ Source: 'Marketing Apes Deadleads', 'Case Type': 'Auto (AA)' }), 'handover');
  assert.equal(P.campaignForLitify({ Source: 'Marketing Apes', 'Case Type': 'Sex Abuse - Sexual Assault LA County' }), 'la');
  assert.equal(P.campaignForLitify({ Source: 'Marketing Apes', 'Case Type': 'Auto (AA)' }), 'mva');
  assert.equal(P.campaignForLitify({ Source: 'Marketing Apes', 'Case Type': 'Immigration Law' }), 'other');
});

test('CSV parser handles quotes, commas, CRLF and BOM', () => {
  const rows = P.parseCSV('﻿a,b\r\n"x, y","he said ""hi"""\r\n\r\n1,2');
  assert.deepEqual(rows, [{ a: 'x, y', b: 'he said "hi"' }, { a: '1', b: '2' }]);
});

test('page ships no lead data and loads only the token-gated feed', async () => {
  const fs = await import('node:fs');
  const html = fs.readFileSync(new URL('../lfma/portal/phillips/index.html', import.meta.url), 'utf8');
  assert.ok(!/\d{3}[-.)\s]\d{3}[-.\s]\d{4}/.test(html), 'no phone numbers in page');
  assert.ok(html.includes('/assets/portal/perspective.js'));
  const js = fs.readFileSync(new URL('../lfma/assets/portal/perspective.js', import.meta.url), 'utf8');
  assert.ok(!/localStorage\.setItem\([^)]*token/i.test(js), 'token never persisted');
});
