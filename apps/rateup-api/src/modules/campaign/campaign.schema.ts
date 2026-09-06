import { z } from "zod";
import {
  CampaignParticipantStatus,
  CampaignStatus,
  CampaignType,
  SentCampaignEnum,
} from "../../types/enums.js";
import { CampaignRetryStrategy } from "../../../generated/prisma/enums.js";

const coreCampaignSchema = z
  .object({
    name: z.string(),
    type: z.enum(CampaignType),
    teamId: z.string(),
    /**
     * The wizard creates a DRAFT from step 1, where only a name and a team
     * exist. Everything the refine below insists on is collected in later steps
     * and saved with PUT, so the requirement is enforced at launch instead.
     */
    status: z.enum(CampaignStatus).optional(),
    waTemplateId: z.string().optional(),
    flowId: z.coerce.string().optional(),
    dynamicTags: z.array(z.string().nullable()).optional(),
    dripStages: z
      .array(
        z.object({
          templateId: z.uuid(),
          delay: z.number(),
          delayUnit: z.string(),
          sendAtTime: z.string().optional(),
        }),
      )
      .optional(),
  })
  .refine(
    (data) => {
      // A draft is allowed to be incomplete; that is what makes the wizard
      // resumable. `POST /campaign/:id/send` re-checks this before launching.
      if (data.status === CampaignStatus.DRAFT) return true;
      if (data.type === CampaignType.DRIP) {
        return Array.isArray(data.dripStages) && data.dripStages.length > 0;
      } else {
        return !!data.waTemplateId;
      }
    },
    {
      path: ["type"],
      error:
        "If type is DRIP, dripStages is required with at least one item. Otherwise, waTemplateId is required.",
    },
  );

const createCampaignInputSchema = coreCampaignSchema;

const updateCampaignInputSchema = z.object({
  name: z.string().optional(),
  type: z.enum(CampaignType).optional(),
  waTemplateId: z.string().optional(),
  status: z.enum(CampaignStatus).optional(),
  startedAt: z.coerce.date().optional(),
  // Coerced: the body arrives as JSON, so a scheduled date is a string by the
  // time zod sees it — `z.date()` rejected every scheduled send outright.
  campaignSentAt: z.coerce.date().optional().nullable(),
  scheduledStatuses: z.array(z.enum(CampaignParticipantStatus)).optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  dynamicTags: z.array(z.string().nullable()).optional(),
  useUserConsent: z.boolean().optional(),
  /** IANA zone the schedule is expressed in, e.g. "Asia/Kolkata". */
  timezone: z.string().optional(),
  whatsappSettingsPhoneId: z.string().optional(),
  dailySendLimit: z.number().int().positive().optional().nullable(),
  dripStages: z
    .array(
      z.object({
        id: z.uuid().optional(),
        templateId: z.uuid(),
        delay: z.number(),
        delayUnit: z.string(),
        sendAtTime: z.string().optional(),
      }),
    )
    .optional(),
});

const byCampaignIdParamsSchema = z.object({
  campaignId: z.string(),
});
const byFlowIdParamsSchema = z.object({
  flowId: z.string(),
});

const getCampaignsQuerySchema = z.object({
  campaignId: z.string().optional(),
  teamId: z.string().optional(),
  type: z.enum(CampaignType).optional(),
});
const responseSchema = z.object({
  type: z.string(),
  response: z.any(),
  title: z.string().optional(),
});

const campaignResponseByIdSchema = z.object({
  id: z.uuid(),
  createdAt: z.date(),
  teamId: z.uuid(),
  language: z.string(),
  phone: z.string().optional(),
  tag: z.string().optional(),
  responses: z.array(responseSchema),
});

const campaignResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(CampaignType),
  teamId: z.string(),
  waTemplateId: z.string(),
  status: z.enum(CampaignStatus),
  startedAt: z.date().optional(),
  createdAt: z.date(),
  endedAt: z.date().optional(),
});

/**
 * The preflight asks the same question the send does — "who would this go to?" — so it
 * takes the same statuses, as a querystring since it changes nothing.
 */
const sendPreflightQuerySchema = z.object({
  sendToStatuses: z
    .union([z.enum(CampaignParticipantStatus), z.array(z.enum(CampaignParticipantStatus))])
    .transform((value) => (Array.isArray(value) ? value : [value])),
});

const bySendIdParamsSchema = z.object({
  campaignId: z.string(),
  sendId: z.uuid(),
});

const sendParticipantsQuerySchema = z.object({
  status: z.enum(CampaignParticipantStatus).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * `maxAttempts` is capped at 3 and the window at 7 days deliberately: retries
 * spend the org's conversation allowance, and an unbounded schedule is a way to
 * spend all of it on recipients who have already refused four times.
 */
const retryPolicyInputSchema = z
  .object({
    enabled: z.boolean(),
    strategy: z.enum(CampaignRetryStrategy).default(CampaignRetryStrategy.SMART),
    maxAttempts: z.number().int().min(1).max(3).default(3),
    intervalHours: z.number().int().min(1).max(168).default(24),
    windowEndsAt: z.coerce.date().nullable().optional(),
    // "HH:mm", local to `timezone`.
    quietHoursStart: z.string().regex(CLOCK_TIME, "Expected HH:mm").nullable().optional(),
    quietHoursEnd: z.string().regex(CLOCK_TIME, "Expected HH:mm").nullable().optional(),
    timezone: z.string().default("Etc/UTC"),
  })
  // Both ends or neither: a half-open window has no meaning, and would silently
  // never apply rather than failing where someone would notice.
  .refine((data) => Boolean(data.quietHoursStart) === Boolean(data.quietHoursEnd), {
    path: ["quietHoursEnd"],
    error: "Set both ends of the quiet-hours window, or neither.",
  });

/** A single template send to one number, for the wizard's "Send test to me". */
const sendTestInputSchema = z.object({
  phone: z.string().trim().min(5, "Enter the number to send the test to"),
});

const sendCampaignInputSchema = z.object({
  sendToStatuses: z.array(z.enum(CampaignParticipantStatus)).min(1),
  participantId: z.string().optional(),
  campaignSentAt: z.coerce.date().optional().nullable(),
  sentCampaignChoice: z.enum(SentCampaignEnum),
  status: z.enum(CampaignStatus).optional().nullable(),
  type: z.string().optional(),
  dailySendLimit: z.number().int().positive().optional().nullable(),
  /**
   * Set alongside the send so the wizard's Launch is one call. Absent leaves any
   * existing policy untouched — this is not a way to clear one.
   */
  retryPolicy: retryPolicyInputSchema.optional(),
});

export type BySendIdParams = z.infer<typeof bySendIdParamsSchema>;
export type SendParticipantsQuery = z.infer<typeof sendParticipantsQuerySchema>;
export type RetryPolicyInput = z.infer<typeof retryPolicyInputSchema>;
export type SendTestInput = z.infer<typeof sendTestInputSchema>;
export type GetCampaignsQuery = z.infer<typeof getCampaignsQuerySchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignInputSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignInputSchema>;
export type ByCampaignIdParams = z.infer<typeof byCampaignIdParamsSchema>;
export type SendCampaignInput = z.infer<typeof sendCampaignInputSchema>;
export type SendPreflightQuery = z.infer<typeof sendPreflightQuerySchema>;
export type ByFlowIdParams = z.infer<typeof byFlowIdParamsSchema>;
export type CampaignResponseByIdSchema = z.infer<typeof campaignResponseByIdSchema>;

// Auto-exported after fastify-zod migration
export {
  bySendIdParamsSchema,
  sendParticipantsQuerySchema,
  retryPolicyInputSchema,
  sendTestInputSchema,
  createCampaignInputSchema,
  byCampaignIdParamsSchema,
  updateCampaignInputSchema,
  getCampaignsQuerySchema,
  campaignResponseSchema,
  sendCampaignInputSchema,
  sendPreflightQuerySchema,
  byFlowIdParamsSchema,
  campaignResponseByIdSchema,
};
