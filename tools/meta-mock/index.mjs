export { createMetaMock } from "./src/server.mjs";
export { apiOf, fixtures, fieldSelector, matchFixture } from "./src/fixtures.mjs";
export { buildWebhook, listWebhooks, replayWebhook, retarget } from "./src/webhooks.mjs";

/**
 * Start a mock and hand back a handle. The shape most callers want:
 *
 *   const mock = await startMetaMock({ port: 0 });
 *   process.env.META_API_BASE_URL = mock.url;
 *   ...
 *   await mock.close();
 *
 * `port: 0` takes any free port, which is what a parallel test run wants.
 */
export async function startMetaMock(options) {
  const { createMetaMock } = await import("./src/server.mjs");
  return createMetaMock(options).listen();
}
