import "fastify";
import type { TeamFeature } from "../../generated/prisma/client.js";
import type { Permission } from "../authz/permissions.js";

declare module "fastify" {
  interface FastifyContextConfig {
    fallbackEmptyArray?: boolean;
    feature?: TeamFeature;
    /** Marks a route as skipping the session-auth preHandler (see onRoute hooks that gate `checkSession`). */
    isPublic?: boolean;
    /** Marks a route as additionally requiring the `assertRootOrg` preHandler (see surveyTheme.routes.ts's onRoute hook). */
    assertRootOrg?: boolean;
    /**
     * Who may reach the route. Every route under /api declares this or `permission`;
     * the route registry refuses to boot (AUTHZ_STRICT=1) when neither is present.
     * `public`: no session. `session`: any signed-in user, even one with no membership yet.
     * `token`: an API access token (external v1).
     */
    access?: "public" | "session" | "token";
    /** Permission(s) the actor needs; any one of a list suffices. Implies a session. */
    permission?: Permission | Permission[];
  }
}
