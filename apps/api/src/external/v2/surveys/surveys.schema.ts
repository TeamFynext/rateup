import z from "zod";

import { SurveyType } from "../../../types/enums.js";
import { pageSchema, paginationQuerySchema } from "../pagination.js";
import { wirePhoneSchema } from "../phone.js";

export const surveyIdParamsSchema = z.object({ surveyId: z.uuid() });

export const surveyListQuerySchema = paginationQuerySchema.extend({
  type: z.enum(SurveyType).optional(),
});

const surveySchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  createdAt: z.iso.datetime(),
});

export const surveyDetailSchema = surveySchema.extend({
  questions: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      required: z.boolean(),
      /** Keyed by language code. */
      title: z.record(z.string(), z.string()),
    }),
  ),
});

const surveyAnswerSchema = z.object({
  questionId: z.string(),
  type: z.string(),
  title: z.string().nullable(),
  /** The answer as recorded: a string, number, list of choice ids or an object, by type. */
  value: z.unknown(),
});

const surveyResponseSchema = z.object({
  id: z.string(),
  createdAt: z.iso.datetime(),
  teamId: z.string(),
  language: z.string(),
  tag: z.string().nullable(),
  phone: wirePhoneSchema.nullable(),
  /**
   * True when the org encrypts responses. RateUp cannot read them, so `answers` is empty and
   * `encryptedAnswers` carries the ciphertext for the org to decrypt with its own key.
   */
  encrypted: z.boolean(),
  encryptedAnswers: z.string().nullable(),
  answers: z.array(surveyAnswerSchema),
});

export const surveyListSchema = pageSchema(surveySchema);
export const surveyResponseListSchema = pageSchema(surveyResponseSchema);

export type SurveyIdParams = z.infer<typeof surveyIdParamsSchema>;
export type SurveyListQuery = z.infer<typeof surveyListQuerySchema>;
