#!/usr/bin/env node
/**
 * Run the mock as a server.
 *
 *   npx meta-mock                              # :8081, no status callbacks
 *   npx meta-mock --status-progression         # ...and sent → delivered → read
 *   npx meta-mock --port 4000 --verbose
 *
 * Reads a `.env` beside the working directory if there is one, so the account
 * identity does not have to be retyped on every run. Real environment
 * variables win.
 */
import fs from "node:fs";

import { createMetaMock } from "../src/server.mjs";

if (fs.existsSync(".env")) {
  const before = { ...process.env };
  process.loadEnvFile(".env");
  for (const [key, value] of Object.entries(before)) process.env[key] = value;
}

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const has = (name) => args.includes(`--${name}`);

if (has("help")) {
  console.log(`
meta-mock — a local stand-in for Meta's Graph API

  --port <n>                 default 8081, or PORT
  --host <h>                 default 127.0.0.1
  --webhook-url <url>        where replayed webhooks and status callbacks go
  --status-progression       deliver sent → delivered → read after each send
  --waba-id <id>             stamped onto those callbacks
  --phone-number-id <id>     the same — the receiving app resolves the tenant from it
  --failure-rate <0..1>      fraction of sends that fail after "sent"
  --status-jitter <ms>       random spread on each callback, so statuses interleave
                             across contacts and can arrive out of order
  --send-error <code>        refuse every send with this Graph error, e.g. 131042
                             (payment method). Flip it at runtime with
                             POST/DELETE /__stub/send-error
  --send-error-rate <0..1>   refuse this fraction of sends with a random Graph
                             error — any code a send can return, never 131042
  --send-error-codes <list>  narrow that random pool, e.g. 131026,130429
  --verbose                  log every request and which layer answered
  --help

Routes: see ROUTES.md, or run \`npm run routes\`.
`);
  process.exit(0);
}

const mock = createMetaMock({
  port: flag("port") ? Number(flag("port")) : undefined,
  host: flag("host"),
  webhookUrl: flag("webhook-url"),
  verbose: has("verbose") || undefined,
  statusProgression: has("status-progression") || undefined,
  wabaId: flag("waba-id"),
  phoneNumberId: flag("phone-number-id"),
  failureRate: flag("failure-rate") ? Number(flag("failure-rate")) : undefined,
  statusJitter: flag("status-jitter") ? Number(flag("status-jitter")) : undefined,
  sendError: flag("send-error"),
  sendErrorRate: flag("send-error-rate"),
  sendErrorCodes: flag("send-error-codes"),
});

await mock.listen();

const config = mock.config;

console.log(`[meta-mock] standing in for the Graph API on ${mock.url}`);
for (const collection of mock.fixtures.collections) {
  console.log(
    `[meta-mock]   ${collection.name}: ${collection.routes} routes, ` +
      `${collection.webhooks} webhook payloads` +
      (collection.updatedAt ? ` (updated ${collection.updatedAt.slice(0, 10)})` : ""),
  );
}
console.log("[meta-mock] point services at it with META_API_BASE_URL");

/**
 * Say what mode this is in, out loud.
 *
 * Status progression being off is the difference between "my campaign sends
 * work" and "my campaign never updates", and with no banner there is nothing to
 * look at — the send succeeds and the silence afterwards looks like a bug in
 * the app. So the mode is always printed, and the two ways to get it wrong are
 * called out rather than left to be discovered.
 */
if (config.statusProgression) {
  console.log(
    `[meta-mock] status callbacks: ON — sent → delivered → read to ${config.webhookUrl}` +
      (config.failureRate > 0 ? ` (${config.failureRate * 100}% fail after "sent")` : "") +
      (config.statusJitter > 0 ? ` (±${config.statusJitter}ms jitter, out of order)` : ""),
  );

  if (!config.phoneNumberId) {
    console.warn(
      "[meta-mock] WARNING: no phone number id, so status callbacks carry an empty\n" +
        "[meta-mock]          metadata.phone_number_id and the receiving app cannot tell\n" +
        "[meta-mock]          which account they belong to. Set META_MOCK_PHONE_NUMBER_ID\n" +
        "[meta-mock]          (or --phone-number-id) to the WhatsappSettings row under test.",
    );
  }
} else {
  console.log(
    "[meta-mock] status callbacks: OFF — a send is answered and nothing follows.\n" +
      "[meta-mock]          Campaign and message statuses will never update. Turn them on\n" +
      "[meta-mock]          with --status-progression or META_MOCK_STATUS_PROGRESSION=1.",
  );
}

if (config.sendError != null || config.sendErrorRate > 0) {
  console.log(
    `[meta-mock] sends: FAILING — ${config.sendErrors}.\n` +
      `[meta-mock]          Clear it without restarting: curl -X DELETE ${mock.url}/__stub/send-error`,
  );
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => mock.close().then(() => process.exit(0)));
}
