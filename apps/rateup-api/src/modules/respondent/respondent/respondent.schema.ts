import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const respondentByIdParamsSchema = z.object({
    respondentId: z.string(),
})
const respondentByPhoneParamsSchema = z.object({
    phone: z.string(),
})
const createRespondentsInputSchema = z.object({
    teamId: z.string(),
    respondents: z.array(z.object({
        phone: z.string(),
        name: z.string().optional(),
    }))
})

// Only name can be updated for now
const updateRespondentInputSchema = z.object({
    name: z.string().optional(),
})

export const { schemas: respondentSchemas, $ref: $Respondentref } = buildJsonSchemas({
    respondentByIdParamsSchema,
    createRespondentsInputSchema,
    updateRespondentInputSchema,    respondentByPhoneParamsSchema
}, {
    $id: "respondentSchema"
})

export type RespondentByIdParams = z.infer<typeof respondentByIdParamsSchema>;
export type CreateRespondentsInput = z.infer<typeof createRespondentsInputSchema>;
export type UpdateRespondentInput = z.infer<typeof updateRespondentInputSchema>;
export type respondentByPhoneParamsSchema = z.infer<typeof respondentByPhoneParamsSchema>;