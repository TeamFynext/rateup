import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";

export const checkRoleHandler =
  (requiredRole: "ADMIN" | "SUPER_ADMIN") =>
  (
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) => {
    const session = request.session;
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
