import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { declareAccess } from "../../authz/registry.js";
import prisma from "../../utils/prisma.js";
import { toWhatsappNumber } from "./whatsapp.js";

const preferencesSchema = z.object({
  email: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
  /** Saved to the profile when WhatsApp is turned on without a number on file. */
  phone: z.string().trim().max(30).optional(),
});
type PreferencesInput = z.infer<typeof preferencesSchema>;

const select = {
  phone: true,
  marketingEmailOptOutAt: true,
  marketingWhatsappOptInAt: true,
  marketingWhatsappOptOutAt: true,
} as const;

function toPreferences(user: {
  phone: string | null;
  marketingEmailOptOutAt: Date | null;
  marketingWhatsappOptInAt: Date | null;
  marketingWhatsappOptOutAt: Date | null;
}) {
  const { marketingWhatsappOptInAt: optIn, marketingWhatsappOptOutAt: optOut } = user;
  return {
    email: user.marketingEmailOptOutAt === null,
    whatsapp: optIn !== null && (optOut === null || optOut < optIn),
    phone: user.phone,
  };
}

/** `/api/customer-comms`: a person's own choice of tips and news from RateUp. */
export async function customerCommsRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

  server.get("/preferences", async (request: FastifyRequest) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.user.userId! },
      select,
    });
    return toPreferences(user);
  });

  server.put<{ Body: PreferencesInput }>(
    "/preferences",
    { schema: { body: preferencesSchema } },
    async (request, reply) => {
      const { email, whatsapp, phone } = request.body;
      const now = new Date();
      const current = await prisma.user.findUniqueOrThrow({
        where: { id: request.user.userId! },
        select,
      });
      const nextPhone = phone || current.phone;
      if (whatsapp && !toWhatsappNumber(nextPhone)) {
        return reply.code(400).send({ message: "Add a WhatsApp number with its country code." });
      }
      const user = await prisma.user.update({
        where: { id: request.user.userId! },
        data: {
          ...(email === undefined ? {} : { marketingEmailOptOutAt: email ? null : now }),
          ...(whatsapp === undefined
            ? {}
            : whatsapp
              ? { marketingWhatsappOptInAt: now, marketingWhatsappOptOutAt: null }
              : { marketingWhatsappOptOutAt: now }),
          ...(phone && phone !== current.phone ? { phone } : {}),
        },
        select,
      });
      return toPreferences(user);
    },
  );
}
