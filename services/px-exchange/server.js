'use strict';
// Pillow Exchange swap API. Plain node:http + pg. Photos live in Postgres (bytea).
const http = require('node:http');
const { Pool } = require('pg');
const L = require('./lib');
const { HttpError } = L;

const PORT = process.env.PORT || 10000;
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'https://pillowexchange.com,https://www.pillowexchange.com,https://px-site.onrender.com').split(',').map((s) => s.trim()).filter(Boolean);
const SESSION_DAYS = 60;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'disable' || /localhost|127\.0\.0\.1|\/tmp/.test(process.env.DATABASE_URL || '') ? false : (process.env.DATABASE_URL || '').includes('.render.com') ? { rejectUnauthorized: false } : false,
  max: 5,
});
const limit = L.makeLimiter();

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, pass_hash TEXT, display_name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '', zip TEXT NOT NULL DEFAULT '', is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mime TEXT NOT NULL, data BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', size TEXT NOT NULL, style TEXT NOT NULL,
  color TEXT NOT NULL, condition TEXT NOT NULL, method TEXT NOT NULL DEFAULT 'either',
  city TEXT NOT NULL, zip TEXT NOT NULL, want TEXT NOT NULL DEFAULT '', quantity INT NOT NULL DEFAULT 1,
  insert_included BOOLEAN NOT NULL DEFAULT FALSE, cover_washed BOOLEAN NOT NULL DEFAULT TRUE,
  smoke_free BOOLEAN NOT NULL DEFAULT FALSE, pet_free BOOLEAN NOT NULL DEFAULT FALSE,
  images TEXT[] NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'active',
  visibility TEXT NOT NULL DEFAULT 'public', is_demo BOOLEAN NOT NULL DEFAULT FALSE, hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS listings_browse ON listings (status, visibility, hidden, created_at DESC);
CREATE TABLE IF NOT EXISTS offers (
  id SERIAL PRIMARY KEY, listing_id INT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  from_user INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offered_listing_id INT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), decided_at TIMESTAMPTZ);
CREATE INDEX IF NOT EXISTS offers_listing ON offers (listing_id);
CREATE INDEX IF NOT EXISTS offers_from ON offers (from_user);
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY, listing_id INT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter TEXT NOT NULL, reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, reporter));
`;

// Clearly-labelled example listings so the grid is not empty on day one. They cannot receive offers.
const DEMO = [
  ['Mustard velvet square', 'Soft cotton-velvet cover with a hidden zip. Example listing to show how a post looks.', '20in', 'velvet', 'yellow', 'like-new', 'either', 'San Diego', '92101', 'Anything in sage, cream or a muted floral', '/images/demo/mustard-velvet.jpg', true],
  ['Cream cable-knit cover', 'Chunky knit cover, hand-wash only. Example listing.', '18in', 'knit', 'cream', 'good', 'meetup', 'Vista', '92084', 'A holiday plaid or a dark green pillow', '/images/demo/cream-knit.jpg', false],
  ['Terracotta mudcloth-style lumbar', '12x20 lumbar with a printed geometric pattern. Example listing.', 'lumbar', 'geometric', 'orange', 'like-new', 'ship', 'Phoenix', '85004', 'Another lumbar in navy or black and white', '/images/demo/lumbar-mudcloth.jpg', true],
  ['Navy stripe outdoor pair', 'Two outdoor-fabric covers, fade resistant. Example listing.', '22in', 'outdoor', 'blue', 'good', 'either', 'Long Beach', '90802', 'A pair of 20" or 22" in a warm color', '/images/demo/navy-stripe.jpg', false],
  ['Sage linen with tassels', 'Linen-blend cover with corner tassels. Example listing.', '20in', 'linen', 'green', 'like-new', 'meetup', 'Oceanside', '92054', 'Blush, rust or a velvet in any color', '/images/demo/sage-linen.jpg', true],
  ['Red tartan holiday pillow', 'Seasonal plaid cover, used one December. Example listing.', '18in', 'plaid', 'red', 'good', 'either', 'Escondido', '92025', 'A spring floral or a solid cream', '/images/demo/tartan-holiday.jpg', false],
  ['Blush boucle square', 'Nubby boucle cover, very soft. Example listing.', '20in', 'boucle', 'pink', 'new', 'ship', 'Irvine', '92618', 'Mustard, sage or terracotta', '/images/demo/blush-boucle.jpg', false],
  ['Black and white boho with fringe', 'Woven geometric front with cotton fringe. Example listing.', '22in', 'boho', 'black', 'like-new', 'either', 'Carlsbad', '92008', 'Solid neutrals or a lumbar', '/images/demo/boho-fringe.jpg', true],
];

async function migrate() {
  await pool.query(SCHEMA);
  const { rows } = await pool.query(`INSERT INTO users (email, display_name, city, zip, is_demo) VALUES ('examples@pillowexchange.invalid','Pillow Exchange examples','Vista','92084',TRUE)
    ON CONFLICT (email) DO UPDATE SET is_demo = TRUE RETURNING id`);
  const demoId = rows[0].id;
  const have = await pool.query('SELECT count(*)::int AS n FROM listings WHERE is_demo');
  if (have.rows[0].n === 0) {
    for (const d of DEMO) {
      await pool.query(`INSERT INTO listings (user_id,title,description,size,style,color,condition,method,city,zip,want,images,insert_included,cover_washed,smoke_free,pet_free,is_demo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,ARRAY[$12],$13,TRUE,TRUE,TRUE,TRUE)`, [demoId, ...d]);
    }
  }
}

// ---------- http helpers ----------
function send(res, status, body, headers = {}) {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(data);
}
function readJson(req, max = 2_500_000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > max) { reject(new HttpError(413, 'That upload is too large.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { if (!chunks.length) return resolve({}); try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'Bad request.')); } });
    req.on('error', reject);
  });
}
const ipOf = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
function rate(req, bucket, max, windowMs) {
  if (!limit(`${bucket}:${ipOf(req)}`, max, windowMs)) throw new HttpError(429, 'Too many requests. Please wait a few minutes and try again.');
}

async function authUser(req, required = true) {
  const h = String(req.headers.authorization || '');
  const tok = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (tok) {
    const { rows } = await pool.query(`SELECT u.id,u.email,u.display_name,u.city,u.zip FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.expires_at>now()`, [L.tokenHash(tok)]);
    if (rows[0]) return rows[0];
  }
  if (required) throw new HttpError(401, 'Please sign in first.');
  return null;
}

async function startSession(userId) {
  const token = L.newToken();
  await pool.query(`INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '${SESSION_DAYS} days')`, [L.tokenHash(token), userId]);
  return token;
}
const publicUser = (u) => ({ id: u.id, email: u.email, display_name: u.display_name, city: u.city, zip: u.zip });

const LISTING_COLS = `l.id,l.title,l.description,l.size,l.style,l.color,l.condition,l.method,l.city,l.zip,l.want,l.quantity,
  l.insert_included,l.cover_washed,l.smoke_free,l.pet_free,l.images,l.status,l.visibility,l.is_demo,l.created_at,l.user_id,
  u.display_name AS owner_name, u.created_at AS owner_since`;
const shapeListing = (r) => ({
  id: r.id, title: r.title, description: r.description, size: r.size, size_label: L.SIZE_LABEL[r.size] || r.size,
  style: r.style, color: r.color, condition: r.condition, method: r.method, city: r.city, zip: r.zip, want: r.want,
  quantity: r.quantity, insert_included: r.insert_included, cover_washed: r.cover_washed, smoke_free: r.smoke_free, pet_free: r.pet_free,
  images: r.images, status: r.status, visibility: r.visibility, is_demo: r.is_demo, created_at: r.created_at,
  owner: { id: r.user_id, name: r.owner_name, since: r.owner_since }, offer_count: r.offer_count == null ? undefined : Number(r.offer_count),
});

async function insertListing(client, userId, v, visibility) {
  // Only allow photos this user uploaded.
  const own = await client.query('SELECT id FROM images WHERE user_id=$1 AND id = ANY($2)', [userId, v.images]);
  if (own.rows.length !== new Set(v.images).size) throw new HttpError(400, 'One of the photos did not upload. Please add it again.');
  const { rows } = await client.query(`INSERT INTO listings (user_id,title,description,size,style,color,condition,method,city,zip,want,quantity,
      insert_included,cover_washed,smoke_free,pet_free,images,visibility)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
  [userId, v.title, v.description, v.size, v.style, v.color, v.condition, v.method, v.city, v.zip, v.want, v.quantity,
    v.insertIncluded, v.coverWashed, v.smokeFree, v.petFree, v.images, visibility]);
  return rows[0].id;
}

async function offerView(rows, viewerId) {
  return rows.map((r) => {
    const accepted = r.status === 'accepted';
    const viewerIsLister = r.lister_id === viewerId;
    return {
      id: r.id, status: r.status, message: r.message, created_at: r.created_at, decided_at: r.decided_at,
      listing: { id: r.listing_id, title: r.l_title, images: r.l_images, size: r.l_size, condition: r.l_condition, city: r.l_city, status: r.l_status },
      offered: { id: r.offered_listing_id, title: r.o_title, images: r.o_images, size: r.o_size, size_label: L.SIZE_LABEL[r.o_size] || r.o_size,
        style: r.o_style, color: r.o_color, condition: r.o_condition, description: r.o_description, city: r.o_city, method: r.o_method,
        insert_included: r.o_insert, cover_washed: r.o_washed },
      from: { name: r.from_name, city: r.from_city },
      to: { name: r.lister_name, city: r.lister_city },
      // Contact details are only shared once both sides have agreed.
      contact: accepted ? (viewerIsLister ? { name: r.from_name, email: r.from_email } : { name: r.lister_name, email: r.lister_email }) : null,
    };
  });
}
const OFFER_SQL = `SELECT o.*, l.title AS l_title, l.images AS l_images, l.size AS l_size, l.condition AS l_condition, l.city AS l_city, l.status AS l_status,
  l.user_id AS lister_id, lu.display_name AS lister_name, lu.city AS lister_city, lu.email AS lister_email,
  ol.title AS o_title, ol.images AS o_images, ol.size AS o_size, ol.style AS o_style, ol.color AS o_color, ol.condition AS o_condition,
  ol.description AS o_description, ol.city AS o_city, ol.method AS o_method, ol.insert_included AS o_insert, ol.cover_washed AS o_washed,
  fu.display_name AS from_name, fu.city AS from_city, fu.email AS from_email
  FROM offers o JOIN listings l ON l.id=o.listing_id JOIN users lu ON lu.id=l.user_id
  JOIN listings ol ON ol.id=o.offered_listing_id JOIN users fu ON fu.id=o.from_user`;

// ---------- routes ----------
const routes = [];
const route = (method, pattern, fn) => routes.push({ method, re: new RegExp(`^${pattern}$`), fn });

route('GET', '/api/health', async () => { await pool.query('SELECT 1'); return { ok: true }; });
route('GET', '/api/options', async () => ({ sizes: L.SIZES, size_labels: L.SIZE_LABEL, conditions: L.CONDITIONS, styles: L.STYLES, colors: L.COLORS, methods: L.METHODS, max_photos: L.MAX_PHOTOS }));

route('POST', '/api/auth/signup', async (req) => {
  rate(req, 'signup', 8, 3600e3);
  const v = L.validateSignup(await readJson(req));
  const exists = await pool.query('SELECT 1 FROM users WHERE email=$1', [v.email]);
  if (exists.rows[0]) throw new HttpError(409, 'That email already has an account. Try signing in.');
  const { rows } = await pool.query('INSERT INTO users (email,pass_hash,display_name,city,zip) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [v.email, L.hashPassword(v.password), v.displayName, v.city, v.zip]);
  return { token: await startSession(rows[0].id), user: publicUser(rows[0]) };
});
route('POST', '/api/auth/login', async (req) => {
  rate(req, 'login', 20, 900e3);
  const b = await readJson(req);
  const email = L.clean(b.email, 200).toLowerCase();
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1 AND NOT is_demo', [email]);
  if (!rows[0] || !L.checkPassword(b.password, rows[0].pass_hash)) throw new HttpError(401, 'Email or password is not right.');
  return { token: await startSession(rows[0].id), user: publicUser(rows[0]) };
});
route('POST', '/api/auth/logout', async (req) => {
  const h = String(req.headers.authorization || '');
  if (h.startsWith('Bearer ')) await pool.query('DELETE FROM sessions WHERE token_hash=$1', [L.tokenHash(h.slice(7).trim())]);
  return { ok: true };
});
route('GET', '/api/me', async (req) => ({ user: publicUser(await authUser(req)) }));
route('DELETE', '/api/me', async (req) => {
  const u = await authUser(req);
  await pool.query('DELETE FROM users WHERE id=$1 AND NOT is_demo', [u.id]);
  return { ok: true, deleted: true };
});

route('POST', '/api/images', async (req) => {
  const u = await authUser(req);
  rate(req, 'img', 80, 3600e3);
  const { buf, mime } = L.decodeImage((await readJson(req)).data);
  const id = L.newImageId();
  await pool.query('INSERT INTO images (id,user_id,mime,data) VALUES ($1,$2,$3,$4)', [id, u.id, mime, buf]);
  return { id };
});
route('GET', '/api/images/([a-f0-9]{32})', async (req, res, m) => {
  const { rows } = await pool.query('SELECT mime,data FROM images WHERE id=$1', [m[1]]);
  if (!rows[0]) throw new HttpError(404, 'Not found.');
  res.writeHead(200, { 'Content-Type': rows[0].mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
  res.end(rows[0].data);
  return undefined;
});

route('GET', '/api/listings', async (req, res, m, url) => {
  const q = url.searchParams; const where = [`l.status='active'`, `l.visibility='public'`, 'NOT l.hidden']; const args = [];
  const add = (sql, v) => { args.push(v); where.push(sql.replace('$?', `$${args.length}`)); };
  for (const [k, list] of [['size', L.SIZES], ['style', L.STYLES], ['color', L.COLORS], ['condition', L.CONDITIONS]]) {
    const v = q.get(k); if (v && list.includes(v)) add(`l.${k}=$?`, v);
  }
  const method = q.get('method'); if (method === 'ship' || method === 'meetup') add(`l.method IN ($?, 'either')`, method);
  const zip = (q.get('zip') || '').trim(); if (/^\d{3,5}$/.test(zip)) add(`left(l.zip,3)=$?`, zip.slice(0, 3));
  const text = L.clean(q.get('q'), 60); if (text) add(`(l.title ILIKE $? OR l.description ILIKE $1 OR l.want ILIKE $1 OR l.city ILIKE $1)`.replace(/\$1/g, `$${args.length + 1}`), `%${text.replace(/[%_\\]/g, '\\$&')}%`);
  if (q.get('real') === '1') where.push('NOT l.is_demo');
  const order = q.get('sort') === 'oldest' ? 'l.created_at ASC' : 'l.is_demo ASC, l.created_at DESC';
  const { rows } = await pool.query(`SELECT ${LISTING_COLS} FROM listings l JOIN users u ON u.id=l.user_id WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 120`, args);
  const counts = await pool.query(`SELECT count(*) FILTER (WHERE NOT is_demo)::int AS real, count(*) FILTER (WHERE is_demo)::int AS demo FROM listings WHERE status='active' AND visibility='public' AND NOT hidden`);
  return { listings: rows.map(shapeListing), totals: counts.rows[0] };
});
route('GET', '/api/listings/(\\d+)', async (req, res, m) => {
  const viewer = await authUser(req, false);
  const { rows } = await pool.query(`SELECT ${LISTING_COLS}, (SELECT count(*) FROM offers o WHERE o.listing_id=l.id AND o.status='pending') AS offer_count
    FROM listings l JOIN users u ON u.id=l.user_id WHERE l.id=$1`, [m[1]]);
  const r = rows[0];
  const mine = viewer && r && viewer.id === r.user_id;
  if (!r || ((r.visibility !== 'public' || r.hidden || r.status === 'removed') && !mine)) throw new HttpError(404, 'This pillow is no longer listed.');
  const out = shapeListing(r); out.mine = !!mine;
  if (viewer && !mine) {
    const my = await pool.query(`SELECT id,status FROM offers WHERE listing_id=$1 AND from_user=$2 ORDER BY id DESC LIMIT 1`, [r.id, viewer.id]);
    out.my_offer = my.rows[0] || null;
  }
  return { listing: out };
});
route('POST', '/api/listings', async (req) => {
  const u = await authUser(req);
  rate(req, 'list', 30, 3600e3);
  const v = L.validateListing(await readJson(req, 100_000));
  const id = await insertListing(pool, u.id, v, 'public');
  return { id };
});
route('PATCH', '/api/listings/(\\d+)', async (req, res, m) => {
  const u = await authUser(req);
  const b = await readJson(req, 50_000);
  const status = b.status;
  if (!['active', 'removed', 'traded'].includes(status)) throw new HttpError(400, 'Unknown status.');
  const { rowCount } = await pool.query(`UPDATE listings SET status=$1, updated_at=now() WHERE id=$2 AND user_id=$3`, [status, m[1], u.id]);
  if (!rowCount) throw new HttpError(404, 'Not your listing.');
  if (status !== 'active') await pool.query(`UPDATE offers SET status='declined', decided_at=now() WHERE status='pending' AND (listing_id=$1 OR offered_listing_id=$1)`, [m[1]]);
  return { ok: true };
});
route('POST', '/api/listings/(\\d+)/report', async (req, res, m) => {
  rate(req, 'report', 20, 3600e3);
  const b = await readJson(req, 20_000);
  const reason = L.clean(b.reason, 300) || 'unspecified';
  const viewer = await authUser(req, false);
  const reporter = viewer ? `u${viewer.id}` : `ip:${L.tokenHash(ipOf(req)).slice(0, 16)}`;
  await pool.query('INSERT INTO reports (listing_id,reporter,reason) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [m[1], reporter, reason]);
  await pool.query(`UPDATE listings SET hidden=TRUE WHERE id=$1 AND (SELECT count(*) FROM reports WHERE listing_id=$1)>=3`, [m[1]]);
  return { ok: true };
});

route('GET', '/api/my/listings', async (req) => {
  const u = await authUser(req);
  const { rows } = await pool.query(`SELECT ${LISTING_COLS}, (SELECT count(*) FROM offers o WHERE o.listing_id=l.id AND o.status='pending') AS offer_count
    FROM listings l JOIN users u ON u.id=l.user_id WHERE l.user_id=$1 AND l.status<>'removed' ORDER BY l.created_at DESC`, [u.id]);
  return { listings: rows.map(shapeListing) };
});
route('POST', '/api/listings/(\\d+)/offers', async (req, res, m) => {
  const u = await authUser(req);
  rate(req, 'offer', 40, 3600e3);
  const b = await readJson(req, 100_000);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const t = await client.query(`SELECT * FROM listings WHERE id=$1 FOR UPDATE`, [m[1]]);
    const target = t.rows[0];
    if (!target || target.status !== 'active' || target.visibility !== 'public' || target.hidden) throw new HttpError(404, 'This pillow is no longer available.');
    if (target.is_demo) throw new HttpError(400, 'This is an example listing, so it cannot take offers. Browse real listings or post your own.');
    if (target.user_id === u.id) throw new HttpError(400, 'That is your own pillow.');
    const dup = await client.query(`SELECT 1 FROM offers WHERE listing_id=$1 AND from_user=$2 AND status='pending'`, [target.id, u.id]);
    if (dup.rows[0]) throw new HttpError(409, 'You already have an offer waiting on this pillow.');
    let offeredId;
    if (b.offered_listing_id) {
      const o = await client.query(`SELECT id FROM listings WHERE id=$1 AND user_id=$2 AND status='active'`, [b.offered_listing_id, u.id]);
      if (!o.rows[0]) throw new HttpError(400, 'Pick one of your active pillows.');
      offeredId = o.rows[0].id;
    } else if (b.new_listing) {
      offeredId = await insertListing(client, u.id, L.validateListing(b.new_listing), b.list_publicly ? 'public' : 'offer');
    } else throw new HttpError(400, 'Choose a pillow to offer.');
    const message = L.clean(b.message, 600);
    const { rows } = await client.query(`INSERT INTO offers (listing_id,from_user,offered_listing_id,message) VALUES ($1,$2,$3,$4) RETURNING id`, [target.id, u.id, offeredId, message]);
    await client.query('COMMIT');
    return { id: rows[0].id };
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
});
route('GET', '/api/my/offers', async (req) => {
  const u = await authUser(req);
  const rec = await pool.query(`${OFFER_SQL} WHERE l.user_id=$1 ORDER BY (o.status='pending') DESC, o.created_at DESC`, [u.id]);
  const sent = await pool.query(`${OFFER_SQL} WHERE o.from_user=$1 ORDER BY (o.status='pending') DESC, o.created_at DESC`, [u.id]);
  return { received: await offerView(rec.rows, u.id), sent: await offerView(sent.rows, u.id) };
});
route('POST', '/api/offers/(\\d+)/(accept|decline|withdraw)', async (req, res, m) => {
  const u = await authUser(req);
  const action = m[2];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT o.*, l.user_id AS lister_id, l.status AS l_status FROM offers o JOIN listings l ON l.id=o.listing_id WHERE o.id=$1 FOR UPDATE OF o`, [m[1]]);
    const o = rows[0];
    if (!o) throw new HttpError(404, 'Offer not found.');
    if (o.status !== 'pending') throw new HttpError(409, `This offer was already ${o.status}.`);
    if (action === 'withdraw') {
      if (o.from_user !== u.id) throw new HttpError(403, 'Only the person who made the offer can withdraw it.');
      await client.query(`UPDATE offers SET status='withdrawn', decided_at=now() WHERE id=$1`, [o.id]);
      const off = await client.query(`SELECT visibility FROM listings WHERE id=$1`, [o.offered_listing_id]);
      if (off.rows[0] && off.rows[0].visibility === 'offer') await client.query(`UPDATE listings SET status='removed' WHERE id=$1`, [o.offered_listing_id]);
    } else {
      if (o.lister_id !== u.id) throw new HttpError(403, 'Only the lister can answer this offer.');
      if (action === 'decline') {
        await client.query(`UPDATE offers SET status='declined', decided_at=now() WHERE id=$1`, [o.id]);
      } else {
        if (o.l_status !== 'active') throw new HttpError(409, 'This pillow is no longer active.');
        const off = await client.query(`SELECT status FROM listings WHERE id=$1`, [o.offered_listing_id]);
        if (!off.rows[0] || off.rows[0].status !== 'active') throw new HttpError(409, 'The pillow offered is no longer available.');
        await client.query(`UPDATE offers SET status='accepted', decided_at=now() WHERE id=$1`, [o.id]);
        await client.query(`UPDATE listings SET status='traded', updated_at=now() WHERE id IN ($1,$2)`, [o.listing_id, o.offered_listing_id]);
        await client.query(`UPDATE offers SET status='declined', decided_at=now() WHERE status='pending' AND id<>$1 AND (listing_id IN ($2,$3) OR offered_listing_id IN ($2,$3))`, [o.id, o.listing_id, o.offered_listing_id]);
      }
    }
    await client.query('COMMIT');
    return { ok: true };
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
});

const server = http.createServer(async (req, res) => {
  const origin = L.corsOrigin(req.headers.origin, ALLOWED);
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '600');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/' ) return send(res, 200, { service: 'px-exchange-api', ok: true });
  for (const r of routes) {
    if (r.method !== req.method) continue;
    const m = url.pathname.match(r.re);
    if (!m) continue;
    try {
      const out = await r.fn(req, res, m, url);
      if (out !== undefined) send(res, 200, out);
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error('error', req.method, url.pathname, e.code || '', e.message);
      if (!res.headersSent) send(res, status, { error: status >= 500 ? 'Something went wrong on our side. Please try again.' : e.message });
    }
    return undefined;
  }
  return send(res, 404, { error: 'Not found.' });
});

migrate().then(() => server.listen(PORT, () => console.log(`px-exchange-api listening on ${PORT}`)))
  .catch((e) => { console.error('migration failed', e.code || '', e.message); process.exit(1); });
