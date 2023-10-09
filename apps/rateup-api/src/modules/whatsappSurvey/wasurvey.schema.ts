import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const sendSurveyToRespondentParamsSchema = z.object({
    surveyId: z.string(),
    respondentId: z.string(),
    templateId: z.string(),
})

const sendSurveyToRGroupParamsSchema = z.object({
    surveyId: z.string(),
    rgroupId: z.string(),
    templateId: z.string(),
})

export const { schemas: wasurveySchemas, $ref: $WASref } = buildJsonSchemas({
     sendSurveyToRespondentParamsSchema,
    sendSurveyToRGroupParamsSchema,
}, { $id: "wasurveySchema" })

export type SendSurveyToRespondentParams = z.infer<typeof sendSurveyToRespondentParamsSchema>;
export type SendSurveyToRGroupParams = z.infer<typeof sendSurveyToRGroupParamsSchema>;

