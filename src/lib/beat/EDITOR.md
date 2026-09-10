# Beat editor / Access admin (M2)

Public `/news` must keep working if this surface or Cloudflare Access is down.

## Gate

Same owner gate as `/editor`:

- `KEYSTONE_ADMIN_EMAIL` wrangler var
- Cloudflare Access email header `cf-access-authenticated-user-email`
- Admin route: `/editor/beat` (`noindex`)

If Access is unavailable, visitors see a locked message; News RSS + Film Room are unaffected.

## Controls (D1-backed)

| Control | Behavior |
| --- | --- |
| **Approve** | `pending` → `approved` (+ `approvedBy` / `approvedAt`). Breaking requires `expiresAt`. |
| **Reject** | Hide from public feed (`rejected`) |
| **Edit context** | Change Keystone caption / desk note only |
| **Change category** | Breaking / From the beat / Watch / Locker room / Reaction |
| **Pin / Unpin** | Float above editorial sort within public list |
| **Set expiration** | Set or clear `expiresAt` |
| **Open original** | Deep-link `originalUrl` |
| **Preview** | Side panel metadata + embed URL |
| **Run discovery** | Inserts **pending** candidates only (never auto-publishes) |

## Storage

- Table: `beat_items` (migration `0002_beat_items`)
- Public reads: approved + unexpired from D1 only
- Fixtures (`beat-poc.json`) stay for tests/dev — never on the production public path

## Feature flag

`KEYSTONE_BEAT_M1` still gates the public Beat strip. Keep `false` in production `wrangler.toml` until Collin flips after verify.
