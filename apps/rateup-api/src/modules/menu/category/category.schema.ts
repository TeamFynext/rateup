import { z } from "zod";

const CreateMenuCategoryInput = {
  name: z.string(),
  menuId: z.string(),
  image: z.string().optional(),
  scheduleEnabled: z.boolean().optional(),
  startTime: z.iso.datetime().optional().nullable(),
  endTime: z.iso.datetime().optional().nullable(),
};
const CreateMenuCategorySchema = z.object(CreateMenuCategoryInput);

const ByCategoryIdParamsSchema = z.object({
  categoryId: z.string(),
});
const UpdateMenuCategoryInputSchema = z.object({
  name: z.string().optional(),
  image: z.string().optional(),
  itemOrder: z.string().optional(),
  scheduleEnabled: z.boolean().optional(),
  startTime: z.iso.datetime().optional().nullable(),
  endTime: z.iso.datetime().optional().nullable(),
});

const SortMenuCategoryInputSchema = z.object({
  itemOrder: z.array(
    z.object({
      id: z.string(),
    }),
  ),
});

export type CreateMenuCategoryInput = z.infer<typeof CreateMenuCategorySchema>;
export type ByCategoryIdParams = z.infer<typeof ByCategoryIdParamsSchema>;
export type UpdateMenuCategoryInput = z.infer<
  typeof UpdateMenuCategoryInputSchema
>;
export type SortMenuCategoryInput = z.infer<typeof SortMenuCategoryInputSchema>;

// Auto-exported after fastify-zod migration
export {
  CreateMenuCategorySchema,
  ByCategoryIdParamsSchema,
  UpdateMenuCategoryInputSchema,
  SortMenuCategoryInputSchema,
};
