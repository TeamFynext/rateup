import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const WaMessageText = z.object({
  body: z.string(),
});
const NewWaMessageBody = z.object({
  type: z.enum(["text"]),
  text: WaMessageText,
});

const PaginateQuerySchema = z.object({
  page: z.string(),
});

export const { schemas: waMessageSchemas, $ref: $waMessage } = buildJsonSchemas(
  {
    NewWaMessageBody,
    PaginateQuerySchema,
  },
  { $id: "waMessage" },
);

export type NewWaMessageBody = z.infer<typeof NewWaMessageBody>;
export type PaginateQuerySchema = z.infer<typeof PaginateQuerySchema>;
