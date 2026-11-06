import { defineConfig } from "vite-plus";

// Workspace-wide format, lint and staged-file settings. Vite+ reads these only from the root:
// package configs keep their own build/dev/test settings, and per-package differences live
// in `overrides` below. Each override reproduces what that repo used before the move.
const VITE_PLUS_APPS = ["apps/rateup-ui/**", "apps/rateup-admin/**", "apps/rateup-docs/**"];

export default defineConfig({
  staged: {
    // rateup-ui only formats on commit; its lint is not clean enough to gate commits yet.
    "apps/rateup-ui/**/*.{ts,tsx,js,jsx,json,css,md}": "vp fmt --no-error-on-unmatched-pattern",
    "apps/rateup-{admin,docs}/**": "vp check --fix --no-error-on-unmatched-pattern",
    "apps/rateup-api/**/*.{ts,js,md,json}": "vp fmt --no-error-on-unmatched-pattern",
    "apps/rateup-app/**/*.{ts,tsx,js,jsx,mjs,cjs}": [
      "oxlint -c apps/rateup-app/.oxlintrc.json --fix",
      "vp fmt --no-error-on-unmatched-pattern",
    ],
    "apps/rateup-app/**/*.{json,jsonc,md,css}": "vp fmt --no-error-on-unmatched-pattern",
    "{*,.vite-hooks/*,.github/**/*,.vscode/*}": "vp fmt --no-error-on-unmatched-pattern",
  },
  fmt: {
    ignorePatterns: [
      // Vendored agent skills and generated files.
      "**/.agents/**",
      "**/.claude/**",
      "apps/*/src/routeTree.gen.ts",
      "apps/rateup-docs/.source/**",
      // MDX pages stay hand-formatted: oxfmt collapses `<Step>` blocks onto one line, which
      // turns their paragraph into inline text and changes how the page renders.
      "apps/rateup-docs/src/content/**",
      // meta-mock never had a formatter; leave its hand formatting alone.
      "tools/meta-mock/**",
    ],
    overrides: [{ files: VITE_PLUS_APPS, options: { sortImports: true } }],
  },
  lint: {
    ignorePatterns: [
      "**/.agents/**",
      "**/.claude/**",
      "apps/*/src/routeTree.gen.ts",
      "apps/rateup-docs/.source/**",
      // These still lint with plain oxlint and their own .oxlintrc.json. Type-aware
      // linting reports ~750 existing issues in rateup-api and ~120 in rateup-app.
      "apps/rateup-api/**",
      "apps/rateup-app/**",
      "tools/meta-mock/**",
    ],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    options: { typeAware: true, typeCheck: true },
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    overrides: [
      {
        // Fire-and-forget calls (navigate, invalidateQueries, event handlers) are normal in
        // React code; marking each one with `void` adds noise without catching anything.
        files: ["apps/rateup-ui/**"],
        rules: { "typescript/no-floating-promises": "off" },
      },
    ],
  },
});
