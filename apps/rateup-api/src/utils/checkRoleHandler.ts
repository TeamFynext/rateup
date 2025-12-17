import { FastifyRequest, FastifyReply } from "fastify";
import Session from "supertokens-node/recipe/session/index.js";

export const checkRoleHandler =
  (requiredRoles: Array<"ADMIN" | "SUPER_ADMIN" | "MEMBER">) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    let session = await Session.getSession(request, reply);

    const accessTokenPayload = session.getAccessTokenPayload();
    const role = accessTokenPayload.role;

    //console.log(`>>>ROLE: ${role},  REQUIRED ROLES:  ${requiredRoles}`);
    if (!requiredRoles.includes(role)) {
      reply.status(403).send({
        error: `Permissions failed.`,
        message: `Action is only allowed for ${requiredRoles.join(", ")}.`,
      });
      return;
    }
  };
