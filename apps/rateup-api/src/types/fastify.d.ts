import "fastify";
import type { StaffSession, StaffUser, TeamFeature } from "../../generated/prisma/client.js";
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
     * `staff`: the staff console (src/modules/staff); its plugin's own hooks authenticate, never SuperTokens.
     */
    access?: "public" | "session" | "token" | "staff";
    /** Permission(s) the actor needs; any one of a list suffices. Implies a session. */
    permission?: Permission | Permission[];
    /**
     * A staff route reachable without a staff session: only the Google sign-in hops. Every
     * other guard of the staff plugin still runs. See STAFF_PUBLIC_ROUTES in staff.plugin.ts.
     */
    staffPublic?: boolean;
  }

  interface FastifyRequest {
    /** The signed-in staff member; set by the staff plugin's requireStaff hook. */
    staff?: StaffUser;
    staffSession?: StaffSession;
    /** Email from the verified Cloudflare Access JWT; unset when Access enforcement is off. */
    cfAccessEmail?: string;
    /** Set once a staff audit row exists for this request, so the fallback row is skipped. */
    staffAuditRecorded?: boolean;
    /** Local development only: the request was admitted by STAFF_DEV_BYPASS_EMAIL, not a cookie. */
    staffDevBypass?: boolean;
  }
}
