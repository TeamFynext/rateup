import { buildJsonSchemas } from 'fastify-zod';
import { z } from 'zod';

const rGroupCore = {
    name: z.string(),
    respondents: z.array(z.string()),
}

const createRGroupInputSchema = z.object({
    name: z.string(),
    teamId: z.string(),
    data: z.array(z.object({
        phone: z.string(),
        name: z.string().optional(),
    }))
})
const rGroupsByIdParamsSchema = z.object({
    rgroupId: z.string(),
})

const deleteRespondentFromRGroupParamsSchema = z.object({
    rgroupId: z.string(),
    respondentId: z.string(),
})
//
const updateRgroupInputSchema = z.object({
    name: z.string()
})
const addRespondentsToRGroupInputSchema = z.array(z.string())

export const { schemas: rGroupSchemas, $ref: $RGref } = buildJsonSchemas({
    createRGroupInputSchema,
    rGroupsByIdParamsSchema,
    deleteRespondentFromRGroupParamsSchema,
    updateRgroupInputSchema,
    addRespondentsToRGroupInputSchema
},
    { $id: "rGroupSchema" });
export type CreateRGroupInput = z.infer<typeof createRGroupInputSchema>;
export type RGroupsByIdParams = z.infer<typeof rGroupsByIdParamsSchema>;
export type DeleteRespondentFromRGroupParams = z.infer<typeof deleteRespondentFromRGroupParamsSchema>;
export type UpdateRgroupInput = z.infer<typeof updateRgroupInputSchema>;
export type AddRespondentsToRGroupInput = z.infer<typeof addRespondentsToRGroupInputSchema>;