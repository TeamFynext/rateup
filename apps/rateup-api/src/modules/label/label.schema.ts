import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

const labelIdParamSchema = z.object({
  labelId: z.string(),
});

const labelBodySchema = z.object({
  name: z.string().min(1, "Tag name required"),
  color: z.string().min(1, "Color required"),
  description: z.string().optional(),
});

export const { schemas: labelSchema, $ref: $LabelRef } = buildJsonSchemas(
  {
    labelBodySchema,
    labelIdParamSchema,
  },
  { $id: "labelSchemas" },
);

export type LabelIdParamSchema = z.infer<typeof labelIdParamSchema>;
export type LabelBodySchema = {
  name: string;
  color: string;
  description?: string;
};
