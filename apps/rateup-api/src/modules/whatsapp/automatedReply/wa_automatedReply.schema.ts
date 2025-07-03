import { z } from "zod";
import { AssignType, WaAutomatedReplyMatchType } from "../../../types/enums";
import { buildJsonSchemas } from "fastify-zod";

const matchDataSchema = z.object({
  json: z.any(),
  caseSensitive: z.boolean().optional(),
});
const createAutomatedReplySchema = z.object({
  name: z.string().min(1),
  matchType: z.nativeEnum(WaAutomatedReplyMatchType),
  matchData: matchDataSchema,
  commands: z.array(z.string()),
  whatsappSettingsPhoneId: z.string(),
  other: z.object({
    assignType: z.nativeEnum(AssignType).optional(),
    choice: z.string().optional(),
  }),
  teamId: z.string().optional(),
  assignedUserIds: z.array(z.string()),
});

const byWaAutomatedReplyIdParams = z.object({
  waAutomatedReplyId: z.string(),
});

const initiateAutomatedReplyBody = z.object({
  phone: z.string(),
});

export const { schemas: waAutomatedReplySchemas, $ref: $waAutomatedReplyRef } =
  buildJsonSchemas(
    {
      createAutomatedReplySchema,
      byWaAutomatedReplyIdParams,
      initiateAutomatedReplyBody,
    },
    {
      $id: "waAutomatedReplySchemas",
    },
  );

export type CreateAutomatedReplySchema = z.infer<
  typeof createAutomatedReplySchema
>;
export type ByWaAutomatedReplyIdParams = z.infer<
  typeof byWaAutomatedReplyIdParams
>;
export type InitiateAutomatedReplyBody = z.infer<
  typeof initiateAutomatedReplyBody
>;
