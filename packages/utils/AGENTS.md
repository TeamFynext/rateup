# @rateup/utils

Small pure TypeScript helpers shared across apps (web, mobile, admin, server). Each file is
its own entry: `import { maskPhone } from "@rateup/utils/maskPhone";`.

- No DOM, React, React Native or Node APIs: everything here must run in the browser, in
  Hermes and in Node.
- Source-only (Vite, Metro and tsx compile it). Tests sit next to the code: `pnpm run test`.
- Move a helper here when a second app needs it, instead of copying it.
