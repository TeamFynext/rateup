# Rateup API

This repository contains the scalable API backend for the Rateup platform, built with TypeScript and Node.js.

## Project Overview

- **Type:** API backend
- **Language:** TypeScript (Node.js)
- **Main entry:** `src/index.ts`
- **Repository:** https://github.com/TeamFynext/rateup-api

## Getting Started

### Prerequisites

- Node.js 24.x
- npm
- PostgreSQL database (for Prisma)

### Installation

1. Clone the repository
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up your `.env` file (see example or project documentation)

### Build & Run

- **Build:**
  ```sh
  npm run build
  ```
- **Start (production):**
  ```sh
  npm run start
  ```
- **Development (hot-reload):**
  ```sh
  npm run dev
  ```
- **Test:**
  ```sh
  npm run test
  ```
- **Prisma generate (after schema changes):**
  ```sh
  npx prisma generate
  ```

## Conventions & Notes

- Prisma schema and migrations are in the `prisma/` directory.
- Prettier is enforced on staged files via lint-staged and husky.
- Always run `npx prisma generate` after modifying the schema.
- Use Node.js 24.x as specified in `package.json`.

## Directory Structure

- `src/` — Main application code
- `prisma/` — Prisma schema and migrations
- `generated/` — Generated Prisma client code
- `utils/` — Utility modules

## Agent & Contributor Instructions

See [AGENTS.md](AGENTS.md) for detailed instructions and conventions for AI coding agents and contributors.

---

For more details, refer to the project documentation or contact the Rateup Team.
