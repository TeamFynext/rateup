import { buildJsonSchemas } from "fastify-zod";
import z from "zod";
import { StageCategory } from "../../../generated/prisma/enums";

const lifecycleIdParamSchema = z.object({
  lifecycleId: z.string(),
});

const lifecycleBodySchema = z.object({
  name: z.string().min(1, "Lifecycle name required"),
  ordering: z.number().int().optional(),
  isDefault: z.boolean().optional(),
  category: z.nativeEnum(StageCategory),
  description: z.string().optional(),
  emoji: z.string().optional(),
  isWon: z.boolean().optional(),
  color: z.string(),
});

const lifecycleReorderSchema = z.object({
  lifecycles: z.array(
    z.object({
      id: z.string(),
      ordering: z.number().int(),
      category: z.nativeEnum(StageCategory),
    }),
  ),
});

export const { schemas: lifecycleSchema, $ref: $LifecycleRef } =
  buildJsonSchemas(
    {
      lifecycleBodySchema,
      lifecycleIdParamSchema,
      lifecycleReorderSchema,
    },
    { $id: "lifecycleSchemas" },
  );

export type LifecycleIdParamSchema = z.infer<typeof lifecycleIdParamSchema>;
export type LifecycleBodySchema = {
  name: string;
  ordering: number;
  isDefault: boolean;
  emoji: string;
  isWon: boolean;
  description: string;
  category: StageCategory;
  color: string;
};
export type LifecycleReorderSchema = z.infer<typeof lifecycleReorderSchema>;
