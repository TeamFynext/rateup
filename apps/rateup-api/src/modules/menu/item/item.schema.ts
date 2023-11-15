import { buildJsonSchemas } from 'fastify-zod';
import { z } from 'zod';
import { MenuItemPriceType } from '../../../types/enums';

const CreateMenuItemInput = {
    name: z.string(),
    description: z.string(),
    price: z.union([
        z.object({
            price: z.string().nonempty(),
            type: z.nativeEnum(MenuItemPriceType)
        }),
        z.object({
            type: z.nativeEnum(MenuItemPriceType),
            variants: z.array(z.object({
                name: z.string(),
                price: z.string(),
            }))
        })
    ]),
    images: z.array(z.string()),
    categoryId: z.string(),
    videoUrl: z.string().optional(),
}
const createMenuItemInputSchema = z.object(CreateMenuItemInput)

const updateMenuItemInputSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    price: z.union([
        z.object({
            price: z.number(),
        }),
        z.object({
            variants: z.array(z.object({
                name: z.string(),
                price: z.number(),
            }))
        })
    ]).optional(),
    images: z.array(z.string()).optional(),
    videoUrl: z.string().optional().optional(),
    itemOrder: z.string().optional()
})
const ByMenuItemIdParamsSchema = z.object({
    menuItemId: z.string(),
})

export const { schemas: menuItemSchemas, $ref: $MIref } = buildJsonSchemas({
    createMenuItemInputSchema,
    updateMenuItemInputSchema,
    ByMenuItemIdParamsSchema
},{ $id: 'menuItemSchema' })

export type CreateMenuItemInput = z.infer<typeof createMenuItemInputSchema>
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemInputSchema>
export type ByMenuItemIdParams = z.infer<typeof ByMenuItemIdParamsSchema>
