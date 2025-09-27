import { buildJsonSchemas } from "fastify-zod";
import z from "zod";
import { StageCategory } from "../../../generated/prisma/enums";

const labelIdParamSchema = z.object({
  labelId: z.string(),
});

const labelBodySchema = z.object({
  name: z.string().min(1, "Label name required"),
  ordering: z.number().int().optional(),
  isDefault: z.boolean().optional(),
  category: z.nativeEnum(StageCategory),
  description: z.string().optional(),
  emoji: z.string().optional(),
  isWon: z.boolean().optional(),
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
  ordering: number;
  isDefault: boolean;
  emoji: string;
  isWon: boolean;
  description: string;
  category: StageCategory;
};
