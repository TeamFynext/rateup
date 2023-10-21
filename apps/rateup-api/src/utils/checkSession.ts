import { FastifyRequest, FastifyReply } from "fastify";
import { getUserIdFromRequest } from "./auth";
import { log } from "./logger";

/**
 * Verifies that the session is valid and sets the userId on the request object.
 * @param request 
 * @param reply 
 */
export const checkSession = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) {
      log.error('No userId found in session\n%o', request.headers);
      reply.code(403).send({ message: 'Not authorized' })
    }
    (request as any).userId! = userId;
  } catch (err) {
    log.error('Error checking session\n%o', err)
    reply.code(403).send({ message: 'Not authorized' })
  }
};
