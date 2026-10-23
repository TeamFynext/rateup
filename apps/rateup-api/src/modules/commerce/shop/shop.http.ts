import type { FastifyReply, FastifyRequest } from "fastify";

import { ShopError } from "./shop.errors.js";

/**
 * Wraps a shop handler: a ShopError becomes `{ code, message }` with its status, anything else
 * goes on to the app's error handler (the SuperTokens one at the root, which must still see
 * session errors — so no plugin-wide setErrorHandler here).
 */
export function h<Req extends FastifyRequest>(
  fn: (request: Req, reply: FastifyReply) => Promise<unknown>,
) {
  return async (request: Req, reply: FastifyReply) => {
    try {
      const result = await fn(request, reply);
      if (!reply.sent && result !== undefined) return reply.send(result);
      return reply;
    } catch (err) {
      if (err instanceof ShopError)
        return reply.code(err.statusCode).send({ code: err.code, message: err.message });
      throw err;
    }
  };
}

export const actorId = (request: FastifyRequest) =>
  request.user?.userId ?? request.user?.id ?? null;
