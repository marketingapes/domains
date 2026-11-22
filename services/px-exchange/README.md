# px-exchange-api

Backend for the Pillow Exchange throw-pillow swap marketplace (pillowexchange.com).

- Runtime: Node 22, `node:http` + `pg`. No framework.
- Data: Render Postgres `px-exchange-db` (basic-256mb, 1 GB). Tables are created on boot (`migrate()` in `server.js`).
- Photos: stored in Postgres (`images.data` bytea). The browser resizes to max 1200 px JPEG before upload; the API caps each photo at 1.5 MB and sniffs JPEG/PNG/WebP magic bytes.
- Accounts: email + password (scrypt), bearer session tokens (only a SHA-256 of the token is stored). No email verification yet.
- Example listings: seeded once with `is_demo = true`, owned by a no-login examples account, images from `px/images/demo/`. They are labelled "Example" on the site and refuse offers.
- Contact details are only shown to both sides after the lister accepts an offer.
- Three distinct reports hide a listing automatically.

Deploy: Blueprint `services/px-exchange/render.yaml` (separate from the root Blueprint).

## API

| Method | Path | Notes |
|---|---|---|
| GET | /api/health | DB ping |
| POST | /api/auth/signup, /api/auth/login, /api/auth/logout | returns `{token,user}` |
| GET / DELETE | /api/me | DELETE removes the account and everything it owns |
| POST | /api/images | `{data: dataURL}` -> `{id}` |
| GET | /api/images/:id | photo bytes |
| GET | /api/listings | filters: size, style, color, condition, method, zip (first 3 digits), q, real=1 |
| GET / PATCH | /api/listings/:id | PATCH `{status: active|removed|traded}` by owner |
| POST | /api/listings | create (auth) |
| POST | /api/listings/:id/offers | `{offered_listing_id}` or `{new_listing, list_publicly}` + `message` |
| POST | /api/listings/:id/report | `{reason}` |
| GET | /api/my/listings, /api/my/offers | auth |
| POST | /api/offers/:id/accept, decline, withdraw | auth |

Local: `DATABASE_URL=postgres://... PORT=8787 node server.js`
