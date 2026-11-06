# rateup-api

Scalable API backend for the [Rateup](https://rateup.app) platform.

## Tech Stack

- **Runtime:** Node.js 26.x (LTS)
- **Framework:** Fastify 5 (TypeScript, ESM)
- **Database:** PostgreSQL via Prisma ORM (v7)
- **Queue:** BullMQ + Redis
- **Streaming:** Kafka
- **Auth:** SuperTokens
- **Authorization:** CASL
- **Payments:** Stripe, Razorpay
- **Storage:** AWS S3
- **Email:** AWS SES (Nodemailer)
- **Validation:** Zod 4
- **API Docs:** Swagger + Scalar

## Getting Started

### Prerequisites

- Node.js 26.x (LTS)
- PostgreSQL
- Redis

### Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Run database migrations
pnpm exec prisma migrate dev

# Start development server
pnpm run dev
```

## Scripts

| Command              | Description                                        |
| -------------------- | -------------------------------------------------- |
| `pnpm run dev`       | Start dev server with hot reload (tsx watch)       |
| `pnpm run build`     | Compile TypeScript (`tsc -p tsconfig.json`)        |
| `pnpm run start`     | Start production server (`node dist/src/index.js`) |
| `pnpm run test`      | Run tests (Vitest)                                 |
| `pnpm run lint`      | Lint with oxlint                                   |
| `pnpm run lint:fix`  | Lint and auto-fix                                  |
| `pnpm run fmt`       | Format with oxfmt                                  |
| `pnpm run fmt:check` | Check formatting                                   |

## Project Structure

```
src/
├── app.ts              # Fastify app setup
├── config.ts           # Configuration
├── index.ts            # Entry point
├── registerRoutes.ts   # Route registration
├── modules/            # Feature modules (routes, handlers, schemas, auth)
│   ├── ai/             # AI features
│   ├── campaign/       # Campaign management
│   ├── chatbot/        # Chatbot
│   ├── contact/        # Contact management
│   ├── dashboard/      # Dashboard
│   ├── integrations/   # Third-party integrations
│   ├── loyalty/        # Loyalty program
│   ├── org/            # Organization management
│   ├── payment/        # Payment processing
│   ├── survey/         # Survey engine
│   ├── ticket/         # Ticketing system
│   ├── webhook/        # Webhook handlers
│   └── ...             # And more
├── plugins/            # Fastify plugins (cron, kafka, swagger)
├── jobs/               # Background job processors (BullMQ)
├── external/           # External API integrations
├── routes/             # Route definitions
├── types/              # TypeScript types
└── utils/              # Shared utilities
prisma/                 # Database schema and migrations
generated/              # Generated Prisma client
```

## Conventions

- **Linting & Formatting:** oxlint + `vp fmt`; staged files are formatted by the monorepo's Vite+ pre-commit hook.
- **Prisma:** Run `pnpm exec prisma generate` after schema changes (also runs automatically on `pnpm install`).
- **ESM:** The project uses ES modules (`"type": "module"`).

## Agent Instructions

See [AGENTS.md](AGENTS.md) for detailed conventions and instructions for AI coding agents.

## License

MIT
