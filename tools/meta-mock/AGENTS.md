# meta-mock

A local stand-in for Meta's Graph API (WhatsApp Cloud API and Instagram), so rateup-api can be
run and tested end to end without reaching Meta. It answers in Meta's own shapes:
`graph-fixtures.json` is generated from Meta's published Postman collections. `README.md` is the
full manual; this file is the short version for working on the code.

## Commands

```bash
pnpm run dev                  # :8081 with status progression and verbose logging
pnpm start                    # :8081 with status progression
pnpm test                     # node --test test/*.test.mjs
pnpm run routes [filter]      # print the route table
pnpm run sync                 # re-download both collections, regenerate fixtures + ROUTES.md
pnpm run sync:check           # fail if the committed fixtures are stale (CI)
node bin/meta-mock.mjs --help # every CLI flag
```

Copy `.env.example` to `.env` and fill in the WABA and phone number ids; real environment
variables still win. There are no git hooks and no formatter config in this repo.

## Project Overview

- **Runtime:** plain Node.js (>= 26), ES modules (`.mjs`), **no dependencies**. Keep it that
  way: the Dockerfile is just a copy and a CMD.
- **Entry points:** `bin/meta-mock.mjs` (CLI), `index.mjs` (`startMetaMock()` for tests, typed by
  `index.d.ts`).
- **Callers:** rateup-api points `META_API_BASE_URL` at the mock, so the real send path runs
  unchanged. Never add a dev-only branch to a caller to reach the mock.

## How a Request Is Answered

Three layers, and every request gets an answer; `/__stub/calls` records which layer replied:

1. **Stateful handlers** (`src/graph-routes.mjs`): flows and templates are created, listed,
   fetched, published and deleted for real. WhatsApp only.
2. **Fixtures** (`graph-fixtures.json`): Meta's own example responses.
3. **Fallback** (`src/fixtures.mjs`): a generic Graph-shaped answer, recorded as
   `matched: false` so unmapped calls stay visible.

`src/server.mjs` is the matcher and the `/__stub/*` control plane, not a home for handlers.
Other modules: `webhooks.mjs` (replaying Meta's sample webhooks), `deliver.mjs` (signed delivery
to the app), `status-progression.mjs` (sent → delivered → read), `graph-errors.mjs` (Meta's 82
Cloud API error codes and wording).

## Key Conventions

- **Generated files:** `graph-fixtures.json` and `ROUTES.md` come from `pnpm run sync`. Do not
  edit them by hand; change `scripts/sync-from-postman.mjs` and re-sync.
- **Stay deterministic:** status progression, send errors and failure rates are opt-in and off
  by default, so a test can tell its own bug from the mock's behaviour.
- **State is limited to endpoints callers drive.** Add a stateful handler only when a caller
  needs the behaviour; otherwise the fixture is enough.
- **Shared endpoints:** WhatsApp and Instagram share four routes (notably `POST /{id}/messages`).
  The request body decides which API answers; WhatsApp wins when the body says nothing.
- **Account ids must match the app under test.** Callbacks carry `phone_number_id`, and the app
  resolves the tenant from it; wrong ids mean the app silently ignores the delivery.
- **Webhooks are signed** with `X-Hub-Signature-256` using `META_MOCK_APP_SECRET`, which must
  equal rateup-api's `waclient_secret` or every delivery is refused with 401.
- **Never replay webhooks at an app pointed at the real Graph host.** An inbound message can
  trigger an automated reply that reaches a real phone.
