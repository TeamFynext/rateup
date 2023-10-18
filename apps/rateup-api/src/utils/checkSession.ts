import { FastifyRequest, FastifyReply } from "fastify";
import { authorizeBySessionOrJWT } from "./auth";

export const checkSession = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const userId = await authorizeBySessionOrJWT(request, reply);
    (request as any).userId! = userId;
  } catch (err) {
    console.log(err)
    return null
  }

};
