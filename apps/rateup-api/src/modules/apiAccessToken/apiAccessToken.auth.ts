import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../utils/logger.js";
import { ByOrgIdParams } from "../org/org.schema.js";
import { verifyApiAccessToken } from "./apiAccessToken.service.js";
import { getOrgById } from "../org/org.services.js";
import { Role } from "../../../generated/prisma/client.js";

/**
 * Verifies that the api-access-key is valid & sets orgId on the request.user object.
 */
/** Narrows an untyped `params`/`query` bag to "might carry an orgId". Used instead of a
 *  concrete route generic because this hook is mounted on routes with unrelated shapes
 *  (e.g. `/contact/:contactId`, which declares no querystring at all). */
function mayCarryOrgId(value: unknown): value is Partial<ByOrgIdParams> {
  return typeof value === "object" && value !== null;
}

export const verifyApiAccessTokenHook = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = mayCarryOrgId(request.params) ? request.params : {};
    const query = mayCarryOrgId(request.query) ? request.query : {};
    const orgId = params.orgId ? params.orgId : query.orgId;
    // Every refusal below used to log `request.headers`, which carries
    // `authorization: "Bearer <the key>"` — so a key that failed verification
    // was recorded verbatim at error level, along with every other header
    // including the cookies of a request that also carried a session. "Failed
    // verification" includes a key that was just rotated and one typed against
    // the wrong org, both of which will work again shortly. The log is a
    // lower-trust store than the database: shipped to an aggregator, retained
    // on a different schedule, readable by people never granted the credential.
    // The org id and the reason are enough to diagnose any of these.
    // See issues.txt 46.5.
    if (!orgId) {
      log.warn({ url: request.url }, "No orgId found in request");
      reply.code(404).send({ message: "Not found" });
      return;
    }
    try {
      const org = await getOrgById(orgId);
      if (!org) {
        log.error({ orgId }, "Org not found");
        reply.code(404).send({
          message: "Not found",
          error: `Org with orgId='${orgId}' not found`,
        });
        return;
      }
    } catch {
      log.warn({ orgId }, "Invalid orgId");
      reply.code(404).send({
        message: "Not found",
        error: `Org with orgId='${orgId}' not found`,
      });
      // The branch above returns; this one did not, so a request that had
      // already been refused fell through to the bearer-token check, the key
      // comparison and the assignment of request.user — producing a second
      // reply for one request (FST_ERR_REP_ALREADY_SENT), and, when the key
      // happened to be valid, an authenticated request against an org that
      // could not be loaded. See issues.txt 46.4.
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      log.error({ orgId }, "No bearer token found in headers");
      reply.code(400).send({
        message: "Invalid request",
        error: "No bearer token found in headers",
      });
      return;
    }
    const accessToken = authHeader.split("Bearer ")[1];
    if (!accessToken) {
      log.error({ orgId }, "No access token found in headers");
      reply.code(401).send({
        message: "Not authorized",
        error: "No access token found in headers",
      });
      return;
    }

    const isValid = await verifyApiAccessToken(orgId, accessToken);

    if (!isValid) {
      log.error({ orgId }, "Invalid access token");
      reply.code(401).send({ message: "Not authorized", error: "Invalid access token" });
      return;
    }

    // since most of the *.service.ts functions fetches user from request object
    //
    // STILL OPEN (issues.txt 46.2, 46.8): the role is a constant, so every key
    // authenticates as an owner whatever its minter's membership says, and the
    // identity carries no userId — a service reading request.user.userId gets
    // undefined, which Prisma drops from a `where` rather than rejecting.
    // Closing either needs the minting member recorded on the ApiAccessToken
    // row, which is a schema change. Minting is at least owner-only now.
    request.user = { orgId, role: Role.SUPER_ADMIN };
  } catch (err) {
    log.error({ err }, "Error checking session");
    reply.code(401).send({ message: "Not authorized" });
  }
};
