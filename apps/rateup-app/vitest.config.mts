import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Tests for the cashier's pure logic — and only those.
 *
 * The points arithmetic and the WhatsApp preview are where a silent error is most
 * expensive: one hands a customer the wrong number of points, the other tells staff a
 * message went out when it did not. Both are plain functions with no React and no React
 * Native in them, so they need a runner and nothing else — which is why this is vitest in
 * a `node` environment rather than `jest-expo`. Mounting a screen would need the RN
 * preset, a babel transform and native mocking; pay for that the day there is a component
 * test to write, not to run `maskPhone`.
 *
 * `include` is deliberately narrow. Anything outside it imports React Native and will not
 * run here — if a new test needs that, it needs `jest-expo`, not a wider glob.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/components/loyalty/cashier/logic/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
