# Keystone outside Grok

The default build runs Keystone as a Cloudflare module Worker on Sites. It does not require the Grok preview host or a Grok subscription. The original Grok configuration is retained as `npm run build:grok`.

## Using the site

- Scores, teams, news, calendar and odds use sports feeds without an AI key.
- Select My Teams to personalize the board in the current browser.
- Open a game for available statistics and player highlights. Pregame cards offer calendar downloads; scheduled times can change.
- `/editor` is the owner publishing dashboard. Save drafts, publish updates, or unpublish them. Published items appear to people who can access the site. The initial deployment is private to the owner.
- `/desk` is My Notes: personal notes stored only in the current browser. They are separate from shared publishing; export them for a backup.

## Configuration

Sites supplies the `DB` D1 binding and applies the SQL migrations in `drizzle/`. Published posts and drafts use this database. Owner access is enforced on the server using Cloudflare Access (`Cf-Access-Authenticated-User-Email`) matched to `KEYSTONE_ADMIN_EMAIL` (already set for the verified owner). Put Access in front of `/editor` (and optionally `/desk`) on the Worker; public score pages stay open. Do not trust identity headers on an unprotected Worker. Legacy ChatGPT host headers are only recognized as a fallback when present.

AI is optional and initially disabled. To enable it, set `XAI_API_KEY` as a server secret and `KEYSTONE_AI_ENABLED=true` in the site runtime environment, then deploy with those settings. `XAI_MODEL` optionally overrides the model. Keep keys out of browser code. xAI usage is billed separately by xAI. The app limits AI requests to five per user per day and fifty overall per day. Failed requests can still consume a quota slot. Recaps use fetched game facts; unavailable feeds cause recap generation to stop instead of guessing. No paid AI call was made during verification.

## Development and deployment

1. `npm ci`
2. `npm run typecheck`
3. `npm run test:sports`
4. `npm run build`

The independent configuration is `vite.standalone.config.ts`; deployable output is in `dist`. The Sites manifest retains this site's identity. Use the Sites build and packaging helpers, push the exact source commit, save a version, then deploy that version. Do not create a new site for routine updates. A raw Vite development server cannot supply Cloudflare's D1 binding or trusted identity; use the hosting runtime for database-backed flows.

## Verification and limits

Eight targeted regression tests cover cache expiry, empty results, request coalescing, doubleheaders, dates, recap fact isolation, historical score requests, owner authorization, and calendar formatting. Type checking and a production build pass. Production Worker HTTP rendering was checked with fixture feeds and an in-memory database. This is not a live-feed, browser-layout, or paid xAI integration test. Feed availability, statistics, broadcasts, and odds vary by league and provider. Delay indicators show when upstream retrieval fails.
