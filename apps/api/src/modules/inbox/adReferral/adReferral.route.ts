import type { FastifyInstance, FastifyRequest } from "fastify";
import prisma from "../../../utils/prisma.js";
import { z } from "zod";

const paramsSchema = z.object({ contactId: z.uuid() });

/** The click-to-WhatsApp ads a contact came from, newest first, for the inbox details panel. */
export async function adReferralRoutes(server: FastifyInstance) {
  server.get(
    "/:contactId",
    { schema: { params: paramsSchema } },
    async (request: FastifyRequest<{ Params: z.infer<typeof paramsSchema> }>) =>
      prisma.adReferral.findMany({
        where: { contactId: request.params.contactId, orgId: request.user.orgId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          conversationId: true,
          sourceId: true,
          sourceType: true,
          sourceUrl: true,
          headline: true,
          body: true,
          mediaType: true,
          mediaUrl: true,
          createdAt: true,
        },
      }),
  );
}
