import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "./logger.js";
import Session from "supertokens-node/recipe/session/index.js";
import { auditLogHook } from "./auditLog.js";
import { getOrgIdAndRole } from "../modules/user/user.service.js";

/**
 * Verifies that the session is valid and sets the userId on the request object.
 * @param request
 * @param reply
 */
export const checkSession = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    let session = await Session.getSession(request, reply);
    const userId = session.getUserId();
    if (!userId) {
      log.error("No userId found in session\n%o", request.headers);
      reply.code(401).send({ message: "Not authorized" });
      // Stop here: this used to reply and keep going, populating request.user and
      // letting the route handler run on an unauthenticated request.
      return;
    }
    // TODO: verify the below works as expected
    request.userId = userId;
    let { role, orgId, email } = session.getAccessTokenPayload();

    // A first sign-up creates the session *before* it creates the org, so that
    // token carries no orgId — and carried none until something happened to call
    // getLoggedUserInfo, which is the only place that ever refreshed it. Anything
    // reached in between (the feature gate on the contact/campaign/pipeline route
    // trees, say) then handed Prisma an undefined orgId and threw. Recover it from
    // the membership and write it back, using the same helper — and therefore the
    // same choice of org — as createNewSession in config.ts.
    if (!orgId) {
      const member = await getOrgIdAndRole({ id: userId });
      if (member) {
        orgId = member.orgId;
        role = member.role;
        await session.mergeIntoAccessTokenPayload({ orgId, role });
      }
    }

    const user = { userId, role, orgId, email };
    request.user = user;
    // Log audit info
    await auditLogHook(request, reply);
  } catch (err) {
    log.error({ err }, "Error checking session");
    reply.code(401).send({ message: "Not authorized" });
  }
};
