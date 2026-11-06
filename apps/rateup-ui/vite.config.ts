import transformImports from "@rolldown/plugin-transform-imports";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, lazyPlugins } from "vite-plus";

const config = defineConfig({
  staged: {
    "*.{ts,tsx,js,jsx,json,css,md}": "vp fmt",
  },
  fmt: {
    ignorePatterns: [".agents", ".claude", "src/routeTree.gen.ts"],
    sortImports: true,
  },
  lint: {
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      // Fire-and-forget calls (navigate, invalidateQueries, event handlers) are normal in React
      // code; marking each one with `void` adds noise without catching anything.
      "typescript/no-floating-promises": "off",
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
    alias: {
      html2canvas: "html2canvas-pro",
    },
  },
  css: {
    transformer: "lightningcss",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
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
  // TODO: enable when fully works with tanstack start
  // experimental: {
  //   bundledDev: true,
  // },
  // Tests skip the app plugin chain. TanStack Start / Nitro / Sentry load `@opentelemetry/api`
  // as CommonJS into the ESM runner ("exports is not defined") and keep the server open after the
  // run. The suite covers pure modules, so `resolve.tsconfigPaths` is all it needs.
  // Add `environment: "jsdom"` (and the dependency) above if a component test ever lands.
  plugins: lazyPlugins(() =>
    process.env.VITEST
      ? []
      : [
          transformImports({
            // TODO: enable when reload in each page problem fixes
            // "@tabler/icons-react": {
            //   transform: "@tabler/icons-react/dist/esm/icons/{{member}}.mjs",
            //   preventFullImport: true,
            // },
            lodash: {
              transform: "lodash/{{member}}",
            },
          }),
          devtools(),
          nitro({
            rollupConfig: { external: [/^@sentry\//] },
          }),
          tailwindcss(),
          tanstackStart(),
          ...(process.env.SENTRY_AUTH_TOKEN
            ? [
                sentryTanstackStart({
                  org: "rateup",
                  project: "tanstackstart-ui",
                  authToken: process.env.SENTRY_AUTH_TOKEN,
                  autoInstrumentMiddleware: false,
                }),
              ]
            : []),
          viteReact(),
        ],
  ),
});

export default config;
