import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    // Not prisma's env(), which throws when the variable is unset: the postinstall
    // `prisma generate` runs in every app's build, and the web, admin and docs services
    // have no database. Migrate commands still need a real URL.
    url: process.env.DATABASE_URL ?? "",
  },
});
