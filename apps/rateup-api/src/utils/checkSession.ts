import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import { authorizeBySessionOrJWT } from "./auth";

export const checkSession = async (
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) => {
  try {
    const userId = await authorizeBySessionOrJWT(request, reply);
    (request as any).userId! = userId;
    done();
  } catch (err) {
    console.log(err)
    return null
  }

};
