import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: [".agents", ".claude", "src/routeTree.gen.ts"],
    sortImports: true,
  },
  lint: {
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
  resolve: {
    tsconfigPaths: true,
  },
  css: {
    transformer: "lightningcss",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  // The API's STAFF_CONSOLE_ORIGIN is http://localhost:4000 locally, so the port is fixed.
  server: {
    port: 4000,
    strictPort: true,
  },
  build: {
    rolldownOptions: {
      output: {
        minify: {
          compress: {
            dropConsole: true,
          },
        },
      },
    },
  },
  // Same stack as rateup-ui: Nitro serves the built app (`pnpm start`), and the Start plugin
  // also runs the file-route generator that @tanstack/router-plugin used to.
  // Tests skip them: the suite covers pure modules and needs neither the router generator nor
  // Tailwind, only `resolve.tsconfigPaths`.
  plugins: lazyPlugins(() =>
    process.env.VITEST ? [] : [nitro(), tailwindcss(), tanstackStart(), viteReact()],
  ),
});
