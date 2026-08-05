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

    request.user = { orgId, role: Role.SUPER_ADMIN };
  } catch (err) {
    log.error({ err }, "Error checking session");
    reply.code(401).send({ message: "Not authorized" });
  }
};
