import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../utils/logger";
import { ByOrgIdParams } from "../org/org.schema";
import { verifyApiAccessToken } from "./apiAccessToken.service";
import { getOrgById } from "../org/org.services";
import { Role } from "../../../generated/prisma/client";

/**
 * Verifies that the api-access-key is valid & sets orgId on the request.user object.
 */
export const verifyApiAccessTokenHook = async (
  request: FastifyRequest<{
    Params: ByOrgIdParams;
  }>,
  reply: FastifyReply,
) => {
  try {
    const orgId = request.params.orgId;
    if (!orgId) {
      log.warn(
        "No orgId found in request\n%s\n%o",
        request.url,
        request.headers,
      );
      reply.code(404).send({ message: "Not found" });
      return;
    }
    try {
      const org = await getOrgById(orgId);
      if (!org) {
        log.error("Org not found\n%o", request.headers);
        reply.code(404).send({
          message: "Not found",
          error: `Org with orgId='${orgId}' not found`,
        });
        return;
      }
    } catch (err) {
      log.warn("Invalid orgId\n%o", request.headers);
      reply.code(404).send({
        message: "Not found",
        error: `Org with orgId='${orgId}' not found`,
      });
    }

    const authHeader = request.headers.authorization;
    if (!authHeader.startsWith("Bearer ")) {
      log.error("No bearer token found in headers\n%o", request.headers);
      reply.code(400).send({
        message: "Invalid request",
        error: "No bearer token found in headers",
      });
      return;
    }
    const accessToken = authHeader.split("Bearer ")[1];
    if (!accessToken) {
      log.error("No access token found in headers\n%o", request.headers);
      reply.code(401).send({
        message: "Not authorized",
        error: "No access token found in headers",
      });
      return;
    }

    const isValid = await verifyApiAccessToken(orgId, accessToken);

    if (!isValid) {
      log.error("Invalid access token\n%o", request.headers);
      reply
        .code(401)
        .send({ message: "Not authorized", error: "Invalid access token" });
      return;
    }

    // since most of the *.service.ts functions fetches user from request object
    const user = { orgId, role: Role.SUPER_ADMIN };
    (request as any).user! = user;
  } catch (err) {
    log.error("Error checking session\n%o", err);
    reply.code(401).send({ message: "Not authorized" });
  }
};
