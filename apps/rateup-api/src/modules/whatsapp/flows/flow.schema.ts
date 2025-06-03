import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { QuestionType2 } from "../../../types/enums";

const sourceQuery = z.object({
  source: z.enum(["wa", "db"]).default("wa"),
});

const byWaFlowIdParams = z.object({
  waFlowId: z.string(),
});
const byDbFlowIdParams = z.object({
  dbFlowId: z.string(),
});

const importFlowsBody = z.object({
  waFlowIds: z.array(z.string()),
  mapData: z.any(), // TODO: add types
  teamIds: z.array(z.string()),
});
const createFlowInput = z.object({
  teamIds: z.array(z.string()),
  name: z.string(),
  categories: z.array(z.string()),
});

const updateFlowInput = z.object({
  name: z.string().trim().optional(),
  status: z.string().optional(),
  json: z.any().optional(),
  map: z.any().optional(),
  logicJumps: z.any().optional(),
  templateMessage: z.custom<WaFlowTemplateMessage>().optional(),
  startMessageConfig: z.custom<WaFlowStartMessageConfig>().optional(),
  pendingSave: z.boolean().optional(),
  anonymous: z.boolean().optional(),
  ticketIssued: z
    .array(
      z.object({
        questionId: z.string(),
        type: z.nativeEnum(QuestionType2),
        selectedColumnId: z.string().optional(),
        selectedBoardId: z.string().optional(),
        condition: z.object({
          minRating: z.number().optional(),
          minOpinion: z.number().optional(),
          reqOptions: z.array(z.string()).optional(),
          submissionTicket: z.boolean().optional(),
        }),
      }),
    )
    .optional(),
});
const updateFlowMetaInput = z.object({
  name: z.string().optional(),
  // categories: z.array(z.string()).optional(),
  anonymous: z.boolean().optional(),
});

const cloneFlowSchema = z.object({
  teamId: z.string().uuid(),
});

const sendFlowBodySchema = z.object({
  phone: z.string(),
  teamId: z.string(),
  flowId: z.string(),
});
export const { schemas: waFlowSchemas, $ref: $waFlow } = buildJsonSchemas(
  {
    sourceQuery,
    byWaFlowIdParams,
    importFlowsBody,
    createFlowInput,
    byDbFlowIdParams,
    updateFlowInput,
    cloneFlowSchema,
    sendFlowBodySchema,
    updateFlowMetaInput,
  },
  {
    $id: "waFlow",
  },
);

export type WaFlowSourceQuery = z.infer<typeof sourceQuery>;
export type ByWaFlowIdParams = z.infer<typeof byWaFlowIdParams>;
export type ImportFlowsBody = z.infer<typeof importFlowsBody>;
export type CreateFlowInput = z.infer<typeof createFlowInput>;
export type ByDbFlowIdParams = z.infer<typeof byDbFlowIdParams>;
export type UpdateFlowInput = z.infer<typeof updateFlowInput>;
export type CloneFlowBody = z.infer<typeof cloneFlowSchema>;
export type SendFlowBody = z.infer<typeof sendFlowBodySchema>;
export type UpdateFlowMetaInput = z.infer<typeof updateFlowMetaInput>;
