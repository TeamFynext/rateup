import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    resolve: {
      tsconfigPaths: true,
    },
    css: {
      transformer: "lightningcss",
    },
    // Local stand-in for the Cloudflare Pages Function: same-origin `/api/staff/*`, with the proxy
    // secret injected here so it never reaches the browser bundle (no `VITE_` prefix).
    server: {
      port: 4000,
      strictPort: true,
      proxy: {
        "/api/staff": {
          target: env.API_ORIGIN || "http://localhost:3001",
          changeOrigin: true,
          headers: env.STAFF_PROXY_SECRET ? { "X-Staff-Proxy-Secret": env.STAFF_PROXY_SECRET } : {},
        },
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
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      tailwindcss(),
      viteReact(),
    ],
  };
});
