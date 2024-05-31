import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";
import {
  WaAutomatedReplyMatchType,
  WaAutomatedReplyResponseType,
} from "../../../../../../../types/enums";

const keywordSchema = z.object({
  keyword: z.string(),
  caseSensitive: z.boolean(),
});
const matchDataSchema = z.object({
  keywords: z.array(keywordSchema).optional(),
  exactText: z.string().optional(),
});
const createAutomatedReplySchema = z.object({
  name: z.string(),
  teamId: z.string(),
  matchType: z.nativeEnum(WaAutomatedReplyMatchType),
  matchData: matchDataSchema,
  responseType: z.nativeEnum(WaAutomatedReplyResponseType),
  responseText: z.string().optional(),
  responseTemplateId: z.string().optional(),
});

const byWaAutomatedReplyIdParams = z.object({
  waAutomatedReplyId: z.string(),
});

export const { schemas: waAutomatedReplySchemas, $ref: $waAutomatedReplyRef } =
  buildJsonSchemas(
    {
      createAutomatedReplySchema,
      byWaAutomatedReplyIdParams,
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
