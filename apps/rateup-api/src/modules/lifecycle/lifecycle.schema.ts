import z from "zod";
import { StageCategory } from "../../../generated/prisma/enums.js";

const lifecycleIdParamSchema = z.object({
  lifecycleId: z.string(),
});

const lifecycleBodySchema = z.object({
  name: z.string().min(1, "Lifecycle name required"),
  ordering: z.number().int().optional(),
  isDefault: z.boolean().optional(),
  category: z.enum(StageCategory),
  description: z.string(),
  emoji: z.string(),
  isWon: z.boolean().optional(),
  color: z.string().nullable().optional(),
});

const lifecycleReorderSchema = z.object({
  lifecycles: z.array(
    z.object({
      id: z.string(),
      ordering: z.number().int(),
      category: z.enum(StageCategory).optional(),
      isWon: z.boolean(),
    }),
  ),
});

export type LifecycleIdParamSchema = z.infer<typeof lifecycleIdParamSchema>;
export type LifecycleBodySchema = z.infer<typeof lifecycleBodySchema>;
export type LifecycleReorderSchema = z.infer<typeof lifecycleReorderSchema>;

// Auto-exported after fastify-zod migration
export { lifecycleBodySchema, lifecycleIdParamSchema, lifecycleReorderSchema };
