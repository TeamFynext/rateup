import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import Session from "supertokens-node/recipe/session";

export const checkRoleHandler =
  (requiredRole: "ADMIN" | "SUPER_ADMIN") =>
 async (
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) => {

    let session = await Session.getSession(request, reply);

    const accessTokenPayload = session.getAccessTokenPayload();
    const role = accessTokenPayload.role;

    console.log(`ROLE: ${role},  REQ:  ${requiredRole}`);
    if (role !== requiredRole) {
      reply.status(403).send({
        error: `Action is only allowed for ${requiredRole}.`,
        message: `You are logged in as: ${role}`,
      });
      return;
    }

    done();
  };
