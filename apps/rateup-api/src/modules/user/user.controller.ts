
import { FastifyReply, FastifyRequest } from "fastify";
import { getLoggedUserInfo } from "./user.service";

export async function getLoggedUserInfoHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userData =  await getLoggedUserInfo(request, reply);
    if (!userData) {
      reply.code(200).send({ message: "No user data found" });
    } else {
      reply.code(200).send({ message: "Success", data: userData });
    }
  } catch (e) {
    reply.code(500).send({ message: `Internal server error :  ${e}` });
  }
}
