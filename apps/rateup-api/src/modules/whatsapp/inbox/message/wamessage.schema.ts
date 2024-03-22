import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const byWaContactId = z.object({
  waContactId: z.string().uuid(),
});

const WaMessageText = z.object({
  body: z.string(),
});
const NewWaMessageBody = z.object({
  type: z.enum(["text"]),
  text: WaMessageText,
});

export const { schemas: waMessageSchemas, $ref: $waMessage } = buildJsonSchemas(
  {
    byWaContactId,
    NewWaMessageBody,
  },
  { $id: "waMessage" },
);

export type ByWaContactId = z.infer<typeof byWaContactId>;
export type NewWaMessageBody = z.infer<typeof NewWaMessageBody>;
