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

export const { schemas: menuSchemas, $ref: $Mref } = buildJsonSchemas({
    menuInputSchema,
    menuSchema,
    updateMenuInputSchema,
    ByMenuIdParamsSchema
}, {
    $id: 'menuSchema'
})

export type CreateMenuInput = z.infer<typeof menuInputSchema>
export type Menu = z.infer<typeof menuSchema>
export type UpdateMenuInput = z.infer<typeof updateMenuInputSchema>
export type ByMenuIdParams = z.infer<typeof ByMenuIdParamsSchema>