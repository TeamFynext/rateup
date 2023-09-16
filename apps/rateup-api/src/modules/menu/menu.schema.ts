import { buildJsonSchemas } from 'fastify-zod'
import { z } from 'zod'
const menuInput = {
    name: z.string(),
    displayName: z.string(),
    locationText: z.string().optional(),
    locationUrl: z.string().optional(),
    websiteText: z.string().optional(),
    websiteUrl: z.string().optional(),
    logo: z.string().optional(),
    backgroundImage: z.string().optional(),
    teamId: z.string(),
}

const updateMenuInputSchema = z.object({
    name: z.string().optional(),
    displayName: z.string().optional(),
    locationText: z.string().optional(),
    locationUrl: z.string().optional(),
    websiteText: z.string().optional(),
    websiteUrl: z.string().optional(),
    logo: z.string().optional(),
    backgroundImage: z.string().optional(),
})
const menuInputSchema = z.object(menuInput)
const menuCore = {
    ...menuInput,
    id: z.string(),
    createdAt: z.string(),
}
const menuSchema = z.object(menuCore)
const ByMenuIdParamsSchema = z.object({
    menuId: z.string(),
})

const menuPublicResponseSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    locationText: z.string().optional(),
    locationUrl: z.string().optional(),
    websiteText: z.string().optional(),
    websiteUrl: z.string().optional(),
    logo: z.string().optional(),
    backgroundImage: z.string().optional(),
})

const fullMenuPublicResponseSchema = z.object({
    ...menuPublicResponseSchema.shape,
    categories: z.array(z.object({
        id: z.string(),
        name: z.string(),
        image: z.string().optional(),
        items: z.array(z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
            images: z.array(z.string()).optional(),
            videoUrl: z.string().optional(),
            price: z.any(),
        }))
    }))
})

export const { schemas: menuSchemas, $ref: $Mref } = buildJsonSchemas({
    menuInputSchema,
    menuSchema,
    updateMenuInputSchema,
    ByMenuIdParamsSchema,
    menuPublicResponseSchema,
    fullMenuPublicResponseSchema
}, {
    $id: 'menuSchema'
})

export type CreateMenuInput = z.infer<typeof menuInputSchema>
export type Menu = z.infer<typeof menuSchema>
export type UpdateMenuInput = z.infer<typeof updateMenuInputSchema>
export type ByMenuIdParams = z.infer<typeof ByMenuIdParamsSchema>