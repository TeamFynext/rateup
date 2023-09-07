import { buildJsonSchemas } from 'fastify-zod';
import {z} from 'zod';

const CreateMenuCategoryInput = {
    name: z.string(),
    menuId: z.string(),
    image: z.string(),
}
const CreateMenuCategorySchema = z.object(CreateMenuCategoryInput)

const ByCategoryIdParamsSchema = z.object({
    categoryId: z.string(),
})
const UpdateMenuCategoryInputSchema = z.object({
    name: z.string().optional(),
    image: z.string().optional(),
})

export const {schemas: menuCategorySchemas, $ref: $MCref} = buildJsonSchemas({
    CreateMenuCategorySchema,
    ByCategoryIdParamsSchema,
    UpdateMenuCategoryInputSchema,
}, {
    $id: 'menuCategorySchema'
});

export type CreateMenuCategoryInput = z.infer<typeof CreateMenuCategorySchema>
export type ByCategoryIdParams = z.infer<typeof ByCategoryIdParamsSchema>
export type UpdateMenuCategoryInput = z.infer<typeof UpdateMenuCategoryInputSchema>
