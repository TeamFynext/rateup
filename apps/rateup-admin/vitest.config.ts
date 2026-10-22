import { defineConfig } from "vitest/config";

// The app's vite.config also runs the router generator and Tailwind; tests need neither.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
