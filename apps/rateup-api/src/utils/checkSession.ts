import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "./logger.js";
import Session from "supertokens-node/recipe/session/index.js";
import { auditLogHook } from "./auditLog.js";

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
    }
    // TODO: verify the below works as expected
    request.userId = userId;
    const { role, orgId, email } = session.getAccessTokenPayload();
    const user = { userId, role, orgId, email };
    request.user = user;
    // Log audit info
    await auditLogHook(request, reply);
  } catch (err) {
    log.error({ err }, "Error checking session");
    reply.code(401).send({ message: "Not authorized" });
  }
};
