import "fastify";
import type { TeamFeature } from "../../generated/prisma/client.js";

declare module "fastify" {
  interface FastifyContextConfig {
    fallbackEmptyArray?: boolean;
    feature?: TeamFeature;
    /** Marks a route as skipping the session-auth preHandler (see onRoute hooks that gate `checkSession`). */
    isPublic?: boolean;
    /** Marks a route as additionally requiring the `assertRootOrg` preHandler (see surveyTheme.routes.ts's onRoute hook). */
    assertRootOrg?: boolean;
  }
}
