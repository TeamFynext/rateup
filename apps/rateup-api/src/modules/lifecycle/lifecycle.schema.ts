import z from "zod";
import { StageCategory } from "../../../generated/prisma/enums.js";

const lifecycleIdParamSchema = z.object({
  lifecycleId: z.string(),
});

// The requirements used to be inverted against the database: Lifecycle.emoji and
// Lifecycle.description are non-null columns with no default and were optional here,
// while `color` — which the database allows to be null — was required. A body the
// schema accepted therefore reached Prisma missing two required columns and failed
// as a generic 500. See issues.txt 27.4.
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
      // Optional: the server derives the category from isWon except for "lost", so a
      // client cannot express anything else through it. See issues.txt 27.7.
      category: z.enum(StageCategory).optional(),
      isWon: z.boolean(),
    }),
  ),
});

export type LifecycleIdParamSchema = z.infer<typeof lifecycleIdParamSchema>;
// Was a hand-written interface declaring all eight fields required and non-nullable,
// which disagreed with the validator beside it and let the service pass a body Prisma
// would reject. See issues.txt 27.8.
export type LifecycleBodySchema = z.infer<typeof lifecycleBodySchema>;
export type LifecycleReorderSchema = z.infer<typeof lifecycleReorderSchema>;

// Auto-exported after fastify-zod migration
export { lifecycleBodySchema, lifecycleIdParamSchema, lifecycleReorderSchema };
