import "fastify";
import type { TeamFeature } from "../../generated/prisma/client.js";

declare module "fastify" {
  interface FastifyContextConfig {
    fallbackEmptyArray?: boolean;
    feature?: TeamFeature;
  }
}
