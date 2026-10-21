import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * The deployed console gets its headers (CSP with `frame-ancestors 'none'`, X-Frame-Options)
 * from `public/_headers` on Cloudflare Pages. Dev and `vite preview` mirror the anti-framing
 * pair so a local build behaves the same when embedded.
 */
const FRAME_DENY_HEADERS = {
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
};

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  css: {
    transformer: "lightningcss",
  },
  // The API's STAFF_CONSOLE_ORIGIN is http://localhost:4000 locally, so the port is fixed.
  server: {
    port: 4000,
    strictPort: true,
    headers: FRAME_DENY_HEADERS,
  },
  preview: {
    headers: FRAME_DENY_HEADERS,
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
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    tailwindcss(),
    viteReact(),
  ],
});
