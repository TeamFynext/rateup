import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const addMultipleWaContacts = z.object({
  contactIds: z.array(z.string()),
});

const byId = z.object({
  id: z.string().uuid(),
});

export const { schemas: waContactSchemas, $ref: $waContact } = buildJsonSchemas(
  {
    addMultipleWaContacts,
    byId,
  },
  {
    $id: "waContactSchemas",
  },
);

export type AddMultipleWaContacts = z.infer<typeof addMultipleWaContacts>;
export type ByWaContactId = z.infer<typeof byId>;
