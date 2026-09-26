# rateup-api

Scalable API backend for the [Rateup](https://rateup.app) platform.

## Tech Stack

- **Runtime:** Node.js 24.x
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

- Node.js 24.x
- PostgreSQL
- Redis

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## Scripts

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start dev server with hot reload (tsx watch)       |
| `npm run build`     | Compile TypeScript (`tsc -p tsconfig.json`)        |
| `npm run start`     | Start production server (`node dist/src/index.js`) |
| `npm run test`      | Run tests (Vitest)                                 |
| `npm run lint`      | Lint with oxlint                                   |
| `npm run lint:fix`  | Lint and auto-fix                                  |
| `npm run fmt`       | Format with oxfmt                                  |
| `npm run fmt:check` | Check formatting                                   |

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

- **Linting & Formatting:** oxlint + oxfmt, enforced on staged files via lint-staged + husky.
- **Prisma:** Run `npx prisma generate` after schema changes (also runs automatically on `npm install`).
- **ESM:** The project uses ES modules (`"type": "module"`).

## Agent Instructions

See [AGENTS.md](AGENTS.md) for detailed conventions and instructions for AI coding agents.

## License

MIT
