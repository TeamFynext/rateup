
import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
export const checkRoleHandler = (request: FastifyRequest,
  reply: FastifyReply, done : HookHandlerDoneFunction
) => {

    let session = request.session;
    let accessTokenPayload = session.getAccessTokenPayload();
    let role = accessTokenPayload.role

    console.log("ROLE::::::::::::::"+role)
    if (role !== 'SUPER_ADMIN') {
        reply.send(new Error('Action is only allowed for Super Admin. You are logged in as :'+role));
        return;
      }
    
      done();
    
}
