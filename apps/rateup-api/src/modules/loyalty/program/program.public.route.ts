import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

import { log } from "../../../utils/logger.js";
import { rateLimit } from "../../../utils/rateLimit.js";
import { getPublicLoyaltyProgramInfo } from "./program.service.js";

const orgIdParamSchema = z.object({ orgId: z.string().min(1) });
type OrgIdParam = z.infer<typeof orgIdParamSchema>;

export async function getPublicLoyaltyProgramHandler(
  request: FastifyRequest<{ Params: OrgIdParam }>,
  reply: FastifyReply,
) {
  try {
    const info = await getPublicLoyaltyProgramInfo(request.params.orgId);
    if (!info) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    return reply.code(200).send(info);
  } catch (e) {
    log.error(e);
    return reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

/** Read by the public join page to brand itself and to point a new member at WhatsApp. */
export async function loyaltyProgramPublicRoutes(server: FastifyInstance) {
  server.get<{ Params: OrgIdParam }>(
    "/:orgId",
    {
      preHandler: rateLimit({ max: 120, windowSeconds: 60 * 60, key: "loyaltyPublicProgram" }),
      schema: { params: orgIdParamSchema },
    },
    getPublicLoyaltyProgramHandler,
  );
}
