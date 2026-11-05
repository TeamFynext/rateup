import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig, lazyPlugins } from "vite-plus";

const config = defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    // MDX pages stay hand-formatted: oxfmt collapses `<Step>` blocks onto one line, which turns
    // their paragraph into inline text and changes how the page renders.
    ignorePatterns: [".agents", ".claude", ".source", "src/content", "src/routeTree.gen.ts"],
    sortImports: true,
  },
  lint: {
    ignorePatterns: [".source", "src/routeTree.gen.ts"],
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
    noExternal: ["fumadocs-core", "fumadocs-ui", "fumadocs-openapi", "@fumadocs/base-ui"],
  },
  plugins: lazyPlugins(() => [
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    mdx(),
  ]),
});

export default config;
