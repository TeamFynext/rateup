import { defineConfig } from "vitest/config";

/**
 * Tests run against their own config, not `vite.config.ts`.
 *
 * The app config pulls in the full TanStack Start / Nitro / Sentry plugin chain, which
 * loads `@opentelemetry/api` as CommonJS into an ESM runner ("exports is not defined")
 * and then holds the Vite server open past the run. None of that is needed here: the
 * suite covers pure modules, so plain Node and tsconfig path resolution are enough.
 *
 * Add `environment: "jsdom"` (and the dependency) here if a component test ever lands.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
