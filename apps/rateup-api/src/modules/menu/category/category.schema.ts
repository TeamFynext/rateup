import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const CreateMenuCategoryInput = {
  name: z.string(),
  menuId: z.string(),
  image: z.string().optional(),
  scheduleEnabled: z.boolean().optional(),
  startTime: z.date().optional().nullable(),
  endTime: z.date().optional().nullable(),
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
  startTime: z.date().optional(),
  endTime: z.date().optional(),
});

const SortMenuCategoryInputSchema = z.object({
  itemOrder: z.array(
    z.object({
      id: z.string(),
    }),
  ),
});
export const { schemas: menuCategorySchemas, $ref: $MCref } = buildJsonSchemas(
  {
    CreateMenuCategorySchema,
    ByCategoryIdParamsSchema,
    UpdateMenuCategoryInputSchema,
    SortMenuCategoryInputSchema,
  },
  {
    $id: "menuCategorySchema",
  },
);

export type CreateMenuCategoryInput = z.infer<typeof CreateMenuCategorySchema>;
export type ByCategoryIdParams = z.infer<typeof ByCategoryIdParamsSchema>;
export type UpdateMenuCategoryInput = z.infer<
  typeof UpdateMenuCategoryInputSchema
>;
export type SortMenuCategoryInput = z.infer<typeof SortMenuCategoryInputSchema>;
