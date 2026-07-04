import transformImports from "@rolldown/plugin-transform-imports";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      html2canvas: "html2canvas-pro",
    },
  },
  css: {
    transformer: "lightningcss",
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
  plugins: [
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
      scanDirs: ["./server/"],
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
          }),
        ]
      : []),
    viteReact(),
  ],
});

export default config;
