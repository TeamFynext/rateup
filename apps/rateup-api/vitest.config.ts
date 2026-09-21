import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["node_modules", "dist", "src/utils/redisConnection.ts"],
    env: {
      // Signing key for WhatsApp Flow tokens. Anything non-empty: the tests that
      // care about the signature set their own value.
      FLOW_TOKEN_SECRET: "test-flow-token-secret",
      // Every /api route must declare config.access or config.permission (src/authz/registry.ts).
      AUTHZ_STRICT: "1",
    },
  },
});
