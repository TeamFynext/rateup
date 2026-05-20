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
  plugins: [
    devtools(),
    nitro({
      scanDirs: ["./server/"],
      rollupConfig: { external: [/^@sentry\//] },
    }),
    tailwindcss(),
    tanstackStart(),
    // sentryTanstackStart({
    //   org: "rateup",
    //   project: "javascript-nextjs",
    //   authToken: process.env.SENTRY_AUTH_TOKEN,
    // }),
    viteReact(),
  ],
});

export default config;
