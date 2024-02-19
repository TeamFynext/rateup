import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

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
  name: z.string().optional(),
  status: z.string().optional(),
  json: z.any().optional(),
  map: z.any().optional(),
  logicJumps: z.any().optional(),
  templateMessage: z.custom<WaFlowTemplateMessage>().optional(),
});
export const { schemas: waFlowSchemas, $ref: $waFlow } = buildJsonSchemas(
  {
    sourceQuery,
    byWaFlowIdParams,
    importFlowsBody,
    createFlowInput,
    byDbFlowIdParams,
    updateFlowInput,
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
