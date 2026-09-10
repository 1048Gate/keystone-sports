# Beat editor / Access admin design (M1 stub)

Public `/news` must keep working if this surface or Cloudflare Access is down.

## Gate

Same owner gate as `/editor`:

- `KEYSTONE_ADMIN_EMAIL` wrangler var
- Cloudflare Access email header `cf-access-authenticated-user-email`
- Admin route: `/editor/beat` (`noindex`)

If Access is unavailable, visitors see a locked message; News RSS + Film Room are unaffected.

## Future controls (stubbed in UI — no D1 writes in M1)

| Control | Intent |
| --- | --- |
| **Approve** | `pending` → `approved` (+ `approvedBy` / `approvedAt`) |
| **Reject** | Hide from public feed |
| **Edit context** | Change 1–3 sentence Keystone caption only |
| **Change category** | Breaking / From the beat / Watch / Locker room / Reaction |
| **Pin** | Float above editorial sort within public list |
| **Expire** | Set `expiresAt` (required for Breaking) or mark `expired` |
| **Open original** | Always available; deep-link `originalUrl` |

## M1 behavior

- Fixture JSON only (`src/data/beat-poc.json`)
- Admin page lists fixtures + approval state for desk review
- Buttons are disabled placeholders documenting the M3+ D1 workflow
- Feature flag `KEYSTONE_BEAT_M1` still gates the public Beat strip independently
