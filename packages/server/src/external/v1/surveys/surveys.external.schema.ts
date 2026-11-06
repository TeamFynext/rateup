import { z } from "zod";

import { SurveyType } from "../../../types/enums.js";

// v1's original schemas, kept here since the dashboard no longer has a use for them.
export const getResponsesBySurveyParamsSchema = z.object({
  orgId: z.uuid().optional(),
  surveyId: z.uuid().optional(),
});

export const getSurveyListResponseSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  type: z.enum(SurveyType),
});

export type GetResponsesBySurveyParams = z.infer<typeof getResponsesBySurveyParamsSchema>;
