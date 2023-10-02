import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const sendSurveyToWaCustomerParamsSchema = z.object({
    surveyId: z.string(),
    waCustomerId: z.string(),
    templateId: z.string(),
})

const sendSurveyToWaCustomerGroupParamsSchema = z.object({
    surveyId: z.string(),
    waCustomerGroupId: z.string(),
    templateId: z.string(),
})

export const { schemas: wasurveySchemas, $ref: $WASref } = buildJsonSchemas({
     sendSurveyToWaCustomerParamsSchema,
    sendSurveyToWaCustomerGroupParamsSchema,
}, { $id: "wasurveySchema" })

export type SendSurveyToWaCustomerParams = z.infer<typeof sendSurveyToWaCustomerParamsSchema>;
export type SendSurveyToWaCustomerGroupParams = z.infer<typeof sendSurveyToWaCustomerGroupParamsSchema>;

