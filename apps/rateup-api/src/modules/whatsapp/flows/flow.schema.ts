import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const sourceQuery = z.object({
  source: z.enum(["wa", "db"]).default("wa"),
});

const byWaFlowIdParams = z.object({
  waFlowId: z.string(),
});

const importFlowsBody = z.object({
  waFlowIds: z.array(z.string()),
  mapData: z.any(), // TODO: add types
  teamIds: z.array(z.string()),
});

export const { schemas: waFlowSchemas, $ref: $waFlow } = buildJsonSchemas(
  {
    sourceQuery,
    byWaFlowIdParams,
    importFlowsBody,
  },
  {
    $id: "waFlow",
  },
);

export type WaFlowSourceQuery = z.infer<typeof sourceQuery>;
export type ByWaFlowIdParams = z.infer<typeof byWaFlowIdParams>;
export type ImportFlowsBody = z.infer<typeof importFlowsBody>;
