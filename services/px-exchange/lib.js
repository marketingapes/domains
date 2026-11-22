'use strict';
// Pure helpers for the Pillow Exchange API. No dependencies, so CI can test them without Postgres.
const crypto = require('node:crypto');

const SIZES = ['18in', '20in', '22in', '24in', 'lumbar', 'other'];
const SIZE_LABEL = { '18in': '18" square', '20in': '20" square', '22in': '22" square', '24in': '24" square', lumbar: 'Lumbar', other: 'Other size' };
const CONDITIONS = ['new', 'like-new', 'good', 'fair'];
const STYLES = ['solid', 'striped', 'plaid', 'floral', 'geometric', 'boho', 'knit', 'velvet', 'linen', 'boucle', 'seasonal', 'outdoor', 'other'];
const COLORS = ['white', 'cream', 'gray', 'black', 'blue', 'green', 'yellow', 'orange', 'red', 'pink', 'purple', 'brown', 'multi'];
const METHODS = ['ship', 'meetup', 'either'];
const IMAGE_MAX_BYTES = 1_500_000;
const MAX_PHOTOS = 4;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
const oneOf = (v, list, field) => {
  const s = clean(v, 40).toLowerCase();
  if (!list.includes(s)) throw new HttpError(400, `Choose a ${field}.`);
  return s;
};

function validEmail(e) {
  const s = clean(e, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s)) throw new HttpError(400, 'Enter a valid email address.');
  return s;
}

function validZip(z, required) {
  const s = clean(z, 10);
  if (!s && !required) return '';
  if (!/^\d{5}$/.test(s)) throw new HttpError(400, 'Enter a 5-digit ZIP code.');
  return s;
}

function validateSignup(b) {
  const email = validEmail(b.email);
  const password = String(b.password || '');
  if (password.length < 8 || password.length > 200) throw new HttpError(400, 'Use a password of at least 8 characters.');
  const displayName = clean(b.display_name, 40);
  if (displayName.length < 2) throw new HttpError(400, 'Add a display name (first name is fine).');
  const city = clean(b.city, 60);
  if (city.length < 2) throw new HttpError(400, 'Add your city so swappers know where you are.');
  const zip = validZip(b.zip, true);
  return { email, password, displayName, city, zip };
}

function validateListing(b) {
  const title = clean(b.title, 80);
  if (title.length < 4) throw new HttpError(400, 'Give your pillow a short title.');
  const description = clean(b.description, 1500);
  const size = oneOf(b.size, SIZES, 'size');
  const style = oneOf(b.style, STYLES, 'style');
  const color = oneOf(b.color, COLORS, 'main color');
  const condition = oneOf(b.condition, CONDITIONS, 'condition');
  const method = oneOf(b.method || 'either', METHODS, 'swap method');
  const city = clean(b.city, 60);
  if (city.length < 2) throw new HttpError(400, 'Add the city the pillow is in.');
  const zip = validZip(b.zip, true);
  const want = clean(b.want, 300);
  const quantity = Math.max(1, Math.min(6, parseInt(b.quantity, 10) || 1));
  const insertIncluded = !!b.insert_included;
  const coverWashed = !!b.cover_washed;
  if (!coverWashed) throw new HttpError(400, 'Covers must be washed (or brand new) before they are listed.');
  const smokeFree = !!b.smoke_free;
  const petFree = !!b.pet_free;
  const images = Array.isArray(b.images) ? b.images.map((x) => clean(x, 64)).filter((x) => /^[a-f0-9]{32}$/.test(x)) : [];
  if (images.length < 1) throw new HttpError(400, 'Add at least one photo of the pillow.');
  if (images.length > MAX_PHOTOS) throw new HttpError(400, `Up to ${MAX_PHOTOS} photos per pillow.`);
  return { title, description, size, style, color, condition, method, city, zip, want, quantity, insertIncluded, coverWashed, smokeFree, petFree, images };
}

function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

function decodeImage(dataUrlOrB64) {
  const s = String(dataUrlOrB64 || '');
  const b64 = s.includes(',') ? s.slice(s.indexOf(',') + 1) : s;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64)) throw new HttpError(400, 'That photo could not be read.');
  const buf = Buffer.from(b64, 'base64');
  if (buf.length > IMAGE_MAX_BYTES) throw new HttpError(413, 'That photo is too large. Try a smaller one.');
  const mime = sniffImage(buf);
  if (!mime) throw new HttpError(415, 'Photos must be JPEG, PNG or WebP.');
  return { buf, mime };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

function checkPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, saltHex, keyHex] = stored.split('$');
  const key = crypto.scryptSync(String(password || ''), Buffer.from(saltHex, 'hex'), 64, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(keyHex, 'hex');
  return want.length === key.length && crypto.timingSafeEqual(want, key);
}

const newToken = () => crypto.randomBytes(32).toString('base64url');
const tokenHash = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
const newImageId = () => crypto.randomBytes(16).toString('hex');

// Simple fixed-window limiter keyed by bucket+ip.
function makeLimiter() {
  const hits = new Map();
  return function limit(key, max, windowMs) {
    const now = Date.now();
    const e = hits.get(key);
    if (!e || now - e.start > windowMs) { hits.set(key, { start: now, n: 1 }); return true; }
    e.n += 1;
    if (hits.size > 50000) hits.clear();
    return e.n <= max;
  };
}

function corsOrigin(origin, allowed) {
  if (!origin) return null;
  if (allowed.includes(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

module.exports = {
  SIZES, SIZE_LABEL, CONDITIONS, STYLES, COLORS, METHODS, IMAGE_MAX_BYTES, MAX_PHOTOS,
  HttpError, clean, validEmail, validZip, validateSignup, validateListing, sniffImage, decodeImage,
  hashPassword, checkPassword, newToken, tokenHash, newImageId, makeLimiter, corsOrigin,
};
