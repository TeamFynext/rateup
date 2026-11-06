import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

// Mirrors tsconfig.json `paths` (and babel's resolver) so `@/…` imports resolve
// in tests. TypeScript picks the longest matching pattern, so `@/assets/*` must
// come before the catch-all `@/*` here (Vite tries aliases in order).
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/assets\//, replacement: `${path.resolve(root, "assets")}/` },
      { find: /^@\//, replacement: `${path.resolve(root, "src")}/` },
    ],
  },
});
