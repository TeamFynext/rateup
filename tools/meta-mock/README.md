# @rateup/meta-mock

A local stand-in for Meta's Graph API, so services that talk to WhatsApp can be
run and tested without reaching Meta.

It answers in **Meta's own shapes**: `graph-fixtures.json` is generated from
Meta's two published Postman collections — [WhatsApp Cloud API][whatsapp] and
[Instagram API][instagram] — which ship saved example responses. 68 routes
covering messages, media, templates, flows, phone numbers, registration, QR
codes, business profiles, encryption keys, Instagram conversations, messenger
profiles and welcome-message flows. It also replays their 24 documented
**webhook payloads**, which is the only way to exercise the inbound half of
either platform in a test.

[whatsapp]: https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api
[instagram]: https://www.postman.com/meta/instagram/collection/23987686-9386f468-7714-490f-9bfc-9442db5c8f00

## What it answers

**[`ROUTES.md`](ROUTES.md)** is the full table — every route, which collection
it came from, which are stateful, and which requests Meta documents without an
example. It is regenerated on every sync and committed, so it diffs when Meta
changes something.

```bash
npm run routes              # the same list, in the terminal
npm run routes messenger    # filtered
```

Three layers answer a request, and nothing is ever unanswered:

| | where | count |
| --- | --- | --- |
| Stateful handlers | `src/graph-routes.mjs` | 22 — all WhatsApp |
| Generated fixtures | `graph-fixtures.json` | 68 (52 WhatsApp, 16 Instagram) |
| Fallback | `src/fixtures.mjs` | anything else, `matched: false` |

`src/server.mjs` holds none of them — it is the matcher and the control plane.

## WhatsApp and Instagram share endpoints

Four routes exist in both collections, and `POST /{id}/messages` is the one
that matters: WhatsApp answers with a `messages[]` envelope, Instagram with
`{ recipient_id, message_id }`. The path cannot separate them — the request
body can. A Cloud API send always declares `messaging_product`; an Instagram
send is a `recipient` plus a `message`:

```js
mock.calls().at(-1).api;   // "whatsapp" | "instagram"
```

Where the body says nothing (a GET, mostly), WhatsApp wins. Pass
`defaultApi: "instagram"` or set `META_MOCK_DEFAULT_API` to flip that.

## Replacing whatsapp-mock-api

This supersedes the Express server that used to live in this repo. Its history
is preserved; its files are not.

| Old | New |
| --- | --- |
| `POST /v1/messages` | `POST /{phone-number-id}/messages` — Graph's real path |
| `POST /v1/webhook/message` | `POST /__stub/webhook` — replays Meta's own payload |
| `POST /webhook/statuses/:id` | `POST /__stub/status` |
| automatic status progression | kept — opt-in, and deterministic |
| port 3004 | port 3099 (`META_MOCK_PORT`) |

Two differences worth knowing.

**Callers no longer need a dev branch.** The old server spoke an invented API,
so message-dispatcher forked on `DEV === "TRUE"` to reach it — which meant the
real send path, with its message body, phone id and access token, was never
exercised in development. What you tested was not what shipped. This one answers
on Graph's own paths, so `META_API_BASE_URL` redirects the host and the same
code runs everywhere:

```diff
- if (process.env.DEV === "TRUE") {
-   res = await callMockWhatsappApi(`/v1/messages`, "POST", { to: options.phone });
- } else {
-   res = await callWhatsappApi(`/${options.phoneId}/${messageUrl}`, ...);
- }
+ res = await callWhatsappApi(`/${options.phoneId}/${messageUrl}`, ...);
```

**Status progression is opt-in and deterministic.** The old one ran on every
send and failed 20% of them at random — realistic, but untestable, since a test
could not tell its own bug from the mock's dice. Turn it on with
`META_MOCK_STATUS_PROGRESSION=1`, and set `failureRate` if you want failures:

```js
const mock = await startMetaMock({
  statusProgression: true,
  statusDelays: { sent: 0, delivered: 0, read: 0 },   // instant, for tests
  failureRate: 0,                                     // 1 to fail every send
  wabaId, phoneNumberId,
});
```

## Why

Creating a WhatsApp flow or a message template is *Meta-first*: the API calls
Graph and only stores the record once Meta hands back an id. Starting a
conversation sends a real message. So any environment with a real WhatsApp
Business Account connected cannot exercise those paths — the artefacts it makes
are real, and the messages reach real phones.

Pointing `META_API_BASE_URL` at this mock makes every one of those paths run for
real, end to end, against a real database, with nothing leaving the machine.

## Running it

```bash
npx meta-mock                                     # :3099
npx meta-mock --port 4000 --verbose
META_MOCK_WEBHOOK_URL=http://localhost:3001/api/wa/webhook npx meta-mock
```

Then point the services at it:

```bash
cd rateup-api && META_API_BASE_URL=http://127.0.0.1:3099 npm run dev
```

Or as a container, alongside the rest of your local infrastructure:

```yaml
services:
  meta-mock:
    build: ../meta-mock
    ports: ["3099:3099"]
    environment:
      META_MOCK_WEBHOOK_URL: http://host.docker.internal:3001/api/wa/webhook
```

## Using it from a test

```js
import { startMetaMock } from "@rateup/meta-mock";

const mock = await startMetaMock({ port: 0 });   // 0 = any free port
process.env.META_API_BASE_URL = mock.url;

await createFlow({ name: "onboarding" });

// Assert on what *would* have gone to Meta.
const [sent] = mock.calls({ path: "/flows", method: "POST" });
expect(sent.body.name).toBe("onboarding");

await mock.close();
```

`calls(filter?)` takes `{ since, path, method }`. `since` is a call count taken
earlier, which is how you narrow to "what happened during this step".

## Inbound webhooks

```js
await mock.replayWebhook({
  name: "Received Text Message",
  from: "919876500001",
  wabaId: "238205772710930",
  phoneNumberId: "259643180556398",
});
```

Meta's sample payloads carry placeholder identifiers written half a dozen
different ways (`PHONE_NUMBER_ID`, `<PHONE_NUMBER_ID>`, `phone-number-id`, and
three different literal numbers), so the account fields are rewritten **by key**
rather than by string matching: `entry[].id`, `phone_number_id`,
`display_phone_number`, and `wa_id`/`from`/`recipient_id`. A message id is left
alone, because it is not an account id.

Instagram nests the two ends as objects instead — `messaging[].sender.id` is the
customer and `messaging[].recipient.id` is the business, both just `id` — so the
parent key is what tells them apart:

```js
await mock.replayWebhook({
  name: "Messaging webhook",          // an inbound Instagram DM
  wabaId: "17841400000000000",        // the Instagram user id
  from: "9876543210",
});
```

Names are qualified as `api:name` only where both collections use the same one;
`listWebhooks()` returns what to pass.

The ids must match the receiving app's stored settings for that account, or the
app will correctly ignore the notification.

> **Only replay against an app configured to use this mock.** Processing an
> inbound message can trigger an automated reply, which is an outbound WhatsApp
> send. Pointed at the real Graph host, that reaches a real phone.

## How a request is answered

Three layers, and `/__stub/calls` reports which one answered:

1. **Stateful handlers** (`src/graph-routes.mjs`) — flows and templates behave:
   created, listed, fetched, published, deleted. A canned example cannot model
   that, and without it "Sync" in a dashboard shows something different from
   what the test just made.
2. **Fixtures** (`graph-fixtures.json`) — Meta's own example response.
3. **Fallback** — a generic Graph-shaped answer (`{ data: [] }` for reads,
   `{ success: true }` for writes), recorded with `matched: false` so unmapped
   calls stay visible rather than being papered over.

State is deliberately limited to the endpoints callers actually drive. Graph has
hundreds of endpoints; emulating the rest statefully would be work with no
caller and more surface to keep correct when Meta changes it.

## Control plane

| Endpoint | |
| --- | --- |
| `GET /__stub/health` | counts, route/webhook totals, collection date |
| `GET /__stub/calls` | recorded calls; `?since=` `?path=` `?method=` |
| `GET /__stub/routes` | the fixture route table |
| `GET /__stub/webhooks` | notification payloads available to replay |
| `POST /__stub/webhook` | replay one — `{ name, from, wabaId, … }` |
| `POST /__stub/reset` | drop recorded calls and stored objects |

## Keeping up with Meta

```bash
npm run sync           # re-download both collections and regenerate fixtures
npm run sync:check     # fail if the committed fixtures are stale (CI)
node scripts/sync-from-postman.mjs --file whatsapp=wa.json --file instagram=ig.json
```

The generator collapses variants: the WhatsApp collection carries 51
`POST /{phone-number-id}/messages` entries, one per message type, all answered
with the same envelope — one is kept and the rest recorded by name. It also
reports which routes the two APIs share, so a new collision shows up in the
sync output rather than silently resolving to whichever sorted first.

Note the two collections spell the version segment differently — `{{Version}}`
against `{{api_version}}` — so the generator strips any version-ish leading
segment. Matching only one spelling leaves every Instagram path with an extra
`:id` that then matches nothing, which looks like coverage and is not.

## Configuration

| Variable | Default |
| --- | --- |
| `META_MOCK_PORT` | `3099` |
| `META_MOCK_HOST` | `127.0.0.1` |
| `META_MOCK_WEBHOOK_URL` | `http://localhost:3001/api/wa/webhook` |
| `META_MOCK_DEFAULT_API` | `whatsapp` — which API wins on shared endpoints |
| `META_MOCK_STATUS_PROGRESSION` | unset; `1` fires sent → delivered → read after each send |
| `META_MOCK_WABA_ID` | stamped onto status callbacks so the app resolves the tenant |
| `META_MOCK_PHONE_NUMBER_ID` | the same |
| `META_MOCK_FAILURE_RATE` | `0`; the fraction of sends that fail after `sent` |
| `META_MOCK_VERBOSE` | unset; `1` logs every request and which layer answered |

## Tests

```bash
npm test
```
