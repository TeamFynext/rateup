import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const WaMessageText = z.object({
  body: z.string(),
});
const NewWaMessageBody = z.object({
  type: z.enum(["text"]),
  text: WaMessageText,
});

export const { schemas: waMessageSchemas, $ref: $waMessage } = buildJsonSchemas(
  {
    NewWaMessageBody,
  },
  { $id: "waMessage" },
);

export type NewWaMessageBody = z.infer<typeof NewWaMessageBody>;
