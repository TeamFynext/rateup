import { FastifyRequest, FastifyReply } from "fastify";
import prisma from "./prisma.js";
import { TeamFeature } from "../../generated/prisma/client.js";
export { TeamFeature } from "../../generated/prisma/client.js";
import type { AccessDenialReason } from "./auth.js";

/**
 * Returns the set of TeamFeatures the user can access within an org.
 * OWNER / ADMIN (SUPER_ADMIN) get every feature automatically.
 * For regular members: union of features granted to all teams they belong to.
 *
 * Cache this on req.features — one DB round-trip per request.
 */
export async function getUserFeatures(userId: string, orgId: string): Promise<Set<TeamFeature>> {
  // No org on the session means there is no membership to read features from.
  // checkSession recovers a missing orgId before we get here, so this is the
  // last resort for a caller that genuinely belongs to no org — answer "no
  // features" and let the gate refuse, rather than handing Prisma an undefined
  // `orgId` and turning a 403 into a 500.
  if (!orgId) return new Set();

  const orgMember = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { role: true },
  });

  // Only SUPER_ADMIN gets full access bypass
  if (orgMember?.role === "SUPER_ADMIN") {
    return new Set(Object.values(TeamFeature) as TeamFeature[]);
  }

  // Union of features across all teams the user belongs to in this org
  const rows = await prisma.teamFeatureAccess.findMany({
    where: {
      team: {
        orgId,
        members: { some: { userId } },
      },
    },
    select: { feature: true },
  });

  return new Set(rows.map((r) => r.feature));
}

/**
 * Fastify preHandler that attaches req.features and req.can to every request.
 * Call once after checkSession.
 */
export async function attachUserFeatures(request: FastifyRequest, _reply: FastifyReply) {
  const { userId, orgId } = request.user;
  request.features = await getUserFeatures(userId!, orgId);
  request.can = (feature: TeamFeature) => request.features.has(feature);
}

/**
 * Fastify preHandler factory that rejects the request when the team
 * does not have the required feature enabled.
 *
 * Usage:
 *   preHandler: [checkSession, requireFeature(TeamFeature.inbox)]
 */
export function requireFeature(feature: TeamFeature) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { role } = request.user;
    const featureFromConfig = request.routeOptions.config?.feature;
    const requiredFeature = featureFromConfig ?? feature;

    // Only SUPER_ADMIN bypasses feature checks
    if (role === "SUPER_ADMIN") return;

    if (!request.features) {
      const { userId, orgId } = request.user;
      request.features = await getUserFeatures(userId!, orgId);
      request.can = (f: TeamFeature) => request.features.has(f);
    }

    if (!request.features.has(requiredFeature)) {
      const fallbackEmpty = request.routeOptions.config?.fallbackEmptyArray;

      if (fallbackEmpty) {
        return reply.code(200).send([]);
      }

      return reply.code(403).send({
        message: `Access to '${requiredFeature}' is not enabled for your team`,
        // Not a billing problem — an admin has to grant the team this feature.
        // See AccessDenialReason in utils/auth.ts.
        reason: "team" satisfies AccessDenialReason,
      });
    }
  };
}
