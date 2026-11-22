// Pure-logic checks for the Pillow Exchange swap API (services/px-exchange/lib.js). No database needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../services/px-exchange/lib.js');

const good = { title: 'Sage linen square', size: '20in', style: 'linen', color: 'green', condition: 'like-new', method: 'either',
  city: 'Vista', zip: '92084', cover_washed: true, images: ['a'.repeat(32)] };

test('px-exchange: listing validation accepts a complete pillow', () => {
  const v = L.validateListing(good);
  assert.equal(v.size, '20in'); assert.equal(v.coverWashed, true); assert.deepEqual(v.images, ['a'.repeat(32)]);
});
test('px-exchange: listing validation enforces washed covers, photos, ZIP and enums', () => {
  assert.throws(() => L.validateListing({ ...good, cover_washed: false }), /washed/);
  assert.throws(() => L.validateListing({ ...good, images: [] }), /photo/);
  assert.throws(() => L.validateListing({ ...good, zip: '9208' }), /ZIP/);
  assert.throws(() => L.validateListing({ ...good, size: '99in' }), /size/);
  assert.throws(() => L.validateListing({ ...good, images: Array(5).fill('b'.repeat(32)) }), /Up to 4/);
});
test('px-exchange: signup validation', () => {
  assert.throws(() => L.validateSignup({ email: 'x', password: 'longenough', display_name: 'Al', city: 'Vista', zip: '92084' }), /email/);
  assert.throws(() => L.validateSignup({ email: 'a@b.co', password: 'short', display_name: 'Al', city: 'Vista', zip: '92084' }), /8 characters/);
  assert.equal(L.validateSignup({ email: 'A@B.co', password: 'longenough', display_name: 'Al', city: 'Vista', zip: '92084' }).email, 'a@b.co');
});
test('px-exchange: passwords hash and verify; tokens are hashed', () => {
  const h = L.hashPassword('correct horse');
  assert.ok(L.checkPassword('correct horse', h)); assert.ok(!L.checkPassword('wrong', h));
  assert.match(L.tokenHash('t'), /^[a-f0-9]{64}$/);
});
test('px-exchange: only real image bytes are accepted', () => {
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
  assert.equal(L.decodeImage('data:image/jpeg;base64,' + jpg.toString('base64')).mime, 'image/jpeg');
  assert.throws(() => L.decodeImage(Buffer.from('<svg onload=alert(1)>xxxxxxxxx').toString('base64')), /JPEG/);
  assert.throws(() => L.decodeImage(Buffer.alloc(L.IMAGE_MAX_BYTES + 10, 1).toString('base64')), /too large/);
});
test('px-exchange: CORS allows the site and localhost only', () => {
  const allowed = ['https://pillowexchange.com'];
  assert.equal(L.corsOrigin('https://pillowexchange.com', allowed), 'https://pillowexchange.com');
  assert.equal(L.corsOrigin('https://evil.test', allowed), null);
  assert.equal(L.corsOrigin('http://localhost:8080', allowed), 'http://localhost:8080');
});
