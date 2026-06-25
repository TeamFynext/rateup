# AGENTS.md

## Project Description

- **Name:** rateup-api
- **Type:** Scalable API backend for the Rateup platform
- **Language:** TypeScript (Node.js, ESM)
- **Framework:** Fastify 5
- **Main entry:** src/index.ts
- **Repository:** https://github.com/TeamFynext/rateup-api

## Build & Run Commands

- **Dev:** `npm run dev` (hot-reloads with `tsx watch src/index.ts`)
- **Build:** `npm run build` (compiles TypeScript via `tsc -p tsconfig.json`)
- **Start (prod):** `npm run start` (runs `node dist/src/index.js`)
- **Test:** `npm run test` (Vitest)
- **Lint:** `npm run lint` (oxlint) / `npm run lint:fix`
- **Format:** `npm run fmt` (oxfmt) / `npm run fmt:check`
- **Prisma generate:** `npx prisma generate` (runs automatically on `npm install` via postinstall)

## Tech Stack

- **Runtime:** Node.js 24.x
- **Framework:** Fastify 5 with Zod type provider
- **Database:** PostgreSQL via Prisma ORM (v7)
- **Queue:** BullMQ + Redis (ioredis)
- **Streaming:** Kafka (kafkajs)
- **Auth:** SuperTokens
- **Authorization:** CASL
- **Payments:** Stripe, Razorpay
- **Storage:** AWS S3
- **Email:** SendGrid, Nodemailer
- **Validation:** Zod 4
- **API Docs:** Swagger + Scalar

## Directory Structure

```
src/
├── app.ts              # Fastify app setup
├── config.ts           # Configuration
├── index.ts            # Entry point
├── registerRoutes.ts   # Route registration
├── modules/            # Feature modules (each with routes, handlers, schemas)
├── plugins/            # Fastify plugins (cron, kafka, swagger)
├── routes/             # Route definitions
├── external/           # External API integrations
├── jobs/               # Background job processors
├── types/              # TypeScript type definitions
└── utils/              # Shared utilities
prisma/                 # Prisma schema and migrations
generated/              # Generated Prisma client
```

### Feature Modules

Modules are organized by domain: `ai`, `campaign`, `chatbot`, `contact`, `dashboard`, `email`, `integrations`, `landingPage`, `lifecycle`, `loyalty`, `menu`, `notification`, `org`, `payment`, `question`, `referrals`, `response`, `services`, `stats`, `subscription`, `survey`, `team`, `testimonial`, `ticket`, `user`, `webhook`, `whatsapp`, and more.

## Key Conventions

- **Module pattern:** Each module typically contains route handlers, Zod schemas, service logic, and authorization rules.
- **Prisma:** Always run `npx prisma generate` after modifying the schema. Migrations live in `prisma/`.
- **Linting:** oxlint is used for linting, oxfmt for formatting. Both are enforced on staged files via lint-staged + husky.
- **Environment:** Node.js 24.x required. Configuration via `.env`.
- **ESM:** The project uses ES modules (`"type": "module"` in package.json).

## Common Pitfalls

- Forgetting to run `npx prisma generate` after schema changes.
- Not using Node.js 24.x (see `engines` in package.json).
- Using Prettier instead of oxfmt — the project has migrated to oxc tooling.
- Using CommonJS syntax (`require`) — the project is ESM-only.
