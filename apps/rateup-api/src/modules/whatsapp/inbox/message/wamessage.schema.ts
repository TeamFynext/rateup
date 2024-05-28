import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

enum WaChatLastMessageTypes {
  "usermessages",
  "all",
}

const WaMessageText = z.object({
  body: z.string(),
});
const NewWaMessageBody = z.object({
  type: z.enum(["text"]),
  text: WaMessageText,
});

const PaginateQuerySchema = z.object({
  cursor: z.string().optional(),
  page: z.string().optional(),
});

const WaChatFilterSchema = z.object({
  messageType: z.string().default("all"),
  strictFilter: z.boolean().default(false),
  searchTerm: z.string().optional(),
  contactGroups: z.array(z.string()).optional(),
  campaigns: z.array(z.string()).optional(),
  tags: z.array(z.any()).optional(),
});

const waChatFilterQuerySchema = PaginateQuerySchema.extend({
  filterData: z.string(),
});

export const { schemas: waMessageSchemas, $ref: $waMessage } = buildJsonSchemas(
  {
    NewWaMessageBody,
    PaginateQuerySchema,
    WaChatFilterSchema,
    waChatFilterQuerySchema,
  },
  { $id: "waMessage" },
);

export type NewWaMessageBody = z.infer<typeof NewWaMessageBody>;
export type PaginateQuerySchema = z.infer<typeof PaginateQuerySchema>;
export type WaChatFilterSchema = z.infer<typeof WaChatFilterSchema>;
export type WaChatFilterQuerySchema = z.infer<typeof waChatFilterQuerySchema>;
