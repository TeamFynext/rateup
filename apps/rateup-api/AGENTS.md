# AGENTS.md

## Overview

This file provides essential instructions and conventions for AI coding agents working in the Rateup API backend project. It is designed to help agents be immediately productive and avoid common pitfalls.

---

## Project Description

- **Name:** rateup-api
- **Type:** Scalable API backend for the Rateup platform
- **Language:** TypeScript (Node.js)
- **Main entry:** src/index.ts
- **Repository:** https://github.com/TeamFynext/rateup-api

## Build & Run Commands

- **Build:** `npm run build` (compiles TypeScript using `tsc -p tsconfig.json`)
- **Start (prod):** `npm run start` (runs built JS from `dist/`)
- **Development:** `npm run dev` (hot-reloads with `tsx watch src/index.ts`)
- **Test:** `npm run test` (runs tests with Vitest)
- **Prisma generate:** `npx prisma generate` (after install or schema changes)

## Key Conventions

- **Prisma:** Database schema and migrations are in `prisma/`. Always run `npx prisma generate` after modifying the schema.
- **Formatting:** Prettier is enforced on staged files via lint-staged and husky.
- **Environment:** Node.js 24.x required. Use `.env` for configuration.
- **Documentation:** See [README.md](README.md) for a brief project description.

## Directory Structure

- `src/` — Main application code
- `prisma/` — Prisma schema and migrations
- `generated/` — Generated Prisma client code
- `utils/` — Utility modules

## Common Pitfalls

- Forgetting to run `npx prisma generate` after schema changes
- Not using Node.js 24.x (see `engines` in package.json)
- Not formatting code before commit (Prettier enforced)

## Useful Links

- [Prisma documentation](https://www.prisma.io/docs/)
- [Vitest documentation](https://vitest.dev/)
- [Prettier documentation](https://prettier.io/)

---

For more details, refer to the [README.md](README.md) or project documentation. If you add new conventions or scripts, update this file to help future agents.
