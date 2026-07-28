#!/usr/bin/env node
/**
 * Run the mock as a server.
 *
 *   npx meta-mock                       # :3099, webhooks to localhost:3001
 *   META_MOCK_PORT=4000 npx meta-mock
 *   npx meta-mock --port 4000 --webhook-url http://localhost:3001/api/wa/webhook
 */
import { createMetaMock } from "../src/server.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const mock = createMetaMock({
  port: flag("port") ? Number(flag("port")) : undefined,
  host: flag("host"),
  webhookUrl: flag("webhook-url"),
  verbose: args.includes("--verbose") || undefined,
});

await mock.listen();

console.log(`[meta-mock] standing in for the Graph API on ${mock.url}`);
for (const collection of mock.fixtures.collections) {
  console.log(
    `[meta-mock]   ${collection.name}: ${collection.routes} routes, ` +
      `${collection.webhooks} webhook payloads` +
      (collection.updatedAt ? ` (updated ${collection.updatedAt.slice(0, 10)})` : ""),
  );
}
console.log("[meta-mock] point services at it with META_API_BASE_URL");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => mock.close().then(() => process.exit(0)));
}
