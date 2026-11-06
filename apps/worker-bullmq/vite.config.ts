import { config as loadEnv } from "dotenv";
import { defineConfig } from "vite-plus";

/**
 * The same Redis server as `.env`, but database 15. Code under test that reaches a real BullMQ
 * queue (for example `notify()`, which imports its queue directly) used to enqueue into the dev
 * database, where a running worker picked the jobs up: notifications for the fixture org "org-a"
 * failed on every run and test emails were sent. Nothing consumes database 15.
 *
 * `.env` is read into a scratch object, not `process.env`: some tests rely on variables such as
 * the encryption key being unset.
 */
function testRedisUrl(): string {
  const fromFile: Record<string, string> = {};
  loadEnv({ processEnv: fromFile, quiet: true, path: "../api/.env" });
  const url = new URL(process.env.REDIS_URL ?? fromFile.REDIS_URL ?? "redis://localhost:6379");
  url.pathname = "/15";
  return url.toString();
}

export default defineConfig({
  // `vp lint` in this folder uses this block, not the root's type-aware rules (which report
  // hundreds of existing issues in the backend).
  lint: {
    rules: { "typescript/consistent-type-definitions": "error" },
  },
  // Load workspace packages from their TypeScript source (see @rateup/tsconfig/node.json).
  resolve: { conditions: ["source"] },
  ssr: { resolve: { conditions: ["source"] } },
  test: {
    // Test logs stay quiet; failures still print.
    silent: true,
    exclude: ["node_modules", "dist"],
    env: {
      // Signing key for WhatsApp Flow tokens. Anything non-empty: the tests that
      // care about the signature set their own value.
      FLOW_TOKEN_SECRET: "test-flow-token-secret",
      // Every /api route must declare config.access or config.permission (src/authz/registry.ts).
      AUTHZ_STRICT: "1",
      REDIS_URL: testRedisUrl(),
    },
  },
});
