import z from "zod";

import { LoyaltyFeedbackRequestStatus } from "../../../../generated/prisma/client.js";
import { DASHBOARD_PERIODS } from "../dashboard/dashboard.period.js";

/* ── requests ───────────────────────────────────────────────────────────────── */

export const setupFeedbackBodySchema = z.object({
  /** An existing flow carrying the LOYALTY_FEEDBACK category (created in WhatsApp → Flow). */
  dbFlowId: z.uuid(),
  /** The team whose Google review link happy customers are sent to. */
  teamId: z.uuid(),
});
export type SetupFeedbackBody = z.infer<typeof setupFeedbackBodySchema>;

export const updateFeedbackSettingSchema = z.object({
  enabled: z.boolean().optional(),
  sendDelayMinutes: z
    .number()
    .int()
    .min(0)
    .max(7 * 24 * 60)
    .optional(),
  cooldownDays: z.number().int().min(0).max(365).optional(),
  teamId: z.uuid().optional(),
  rewardId: z.uuid().nullable().optional(),
  happyMinRating: z.number().int().min(1).max(5).optional(),
});
export type UpdateFeedbackSettingInput = z.infer<typeof updateFeedbackSettingSchema>;

export const feedbackResultsQuerySchema = z.object({
  period: z.enum(DASHBOARD_PERIODS).optional(),
  /** IANA zone the browser cuts days in. Unknown zones fall back to UTC. */
  tz: z.string().max(64).optional(),
});
export type FeedbackResultsQuery = z.infer<typeof feedbackResultsQuerySchema>;

export const feedbackRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(LoyaltyFeedbackRequestStatus).optional(),
});
export type FeedbackRequestsQuery = z.infer<typeof feedbackRequestsQuerySchema>;

export const reviewRedirectParamsSchema = z.object({
  requestId: z.uuid(),
  // base64url of a 32-byte HMAC, no padding.
  sig: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
export type ReviewRedirectParams = z.infer<typeof reviewRedirectParamsSchema>;

/* ── responses ──────────────────────────────────────────────────────────────── */

/** A flow Feedback may select, and — when it may not — why. */
export const feedbackFlowCandidateSchema = z.object({
  dbFlowId: z.string(),
  name: z.string(),
  status: z.string(),
  pendingSave: z.boolean(),
  version: z.number(),
  eligible: z.boolean(),
  reason: z.string().nullable(),
});
export const feedbackFlowCandidatesSchema = z.object({
  flows: z.array(feedbackFlowCandidateSchema),
});
export type FeedbackFlowCandidate = z.infer<typeof feedbackFlowCandidateSchema>;
export type FeedbackFlowCandidates = z.infer<typeof feedbackFlowCandidatesSchema>;

export const feedbackSettingSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  sendDelayMinutes: z.number(),
  cooldownDays: z.number(),
  teamId: z.string(),
  rewardId: z.string().nullable(),
  happyMinRating: z.number(),
});

export const feedbackFlowSchema = z.object({
  dbFlowId: z.string(),
  flowId: z.string().nullable(),
  name: z.string(),
  /** WaFlowStatus, kept as a string like the column it mirrors. */
  status: z.string(),
  pendingSave: z.boolean(),
  surveyId: z.string(),
  version: z.number(),
});

export const TEMPLATE_STEPS = ["pending", "approved", "rejected"] as const;
export type TemplateStep = (typeof TEMPLATE_STEPS)[number];

export const feedbackTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(TEMPLATE_STEPS),
});

export const feedbackCountsSchema = z.object({
  scheduled: z.number(),
  sent: z.number(),
  completed: z.number(),
  happy: z.number(),
  reviewClicks: z.number(),
  rewardsGranted: z.number(),
});

export const feedbackOverviewSchema = z.object({
  programExists: z.boolean(),
  setting: feedbackSettingSchema.nullable(),
  flow: feedbackFlowSchema.nullable(),
  template: feedbackTemplateSchema.nullable(),
  team: z
    .object({ id: z.string(), name: z.string(), googleLink: z.string().nullable() })
    .nullable(),
  reward: z.object({ id: z.string(), name: z.string(), status: z.string() }).nullable(),
  counts: feedbackCountsSchema,
});
export type FeedbackOverview = z.infer<typeof feedbackOverviewSchema>;
export type FeedbackCounts = z.infer<typeof feedbackCountsSchema>;

export const feedbackRequestRowSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  /** Country code and last two digits only; the full number is not the results screen's business. */
  phoneMasked: z.string(),
  status: z.enum(LoyaltyFeedbackRequestStatus),
  happy: z.boolean().nullable(),
  overallRating: z.number().nullable(),
  channel: z.string().nullable(),
  failReason: z.string().nullable(),
  scheduledFor: z.string(),
  sentAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  reviewClickedAt: z.string().nullable(),
  rewardGrantedAt: z.string().nullable(),
});
export type FeedbackRequestRow = z.infer<typeof feedbackRequestRowSchema>;

export const feedbackResultsSchema = z.object({
  period: z.object({
    key: z.enum(DASHBOARD_PERIODS),
    label: z.string(),
    start: z.string(),
    end: z.string(),
  }),
  metrics: z.object({
    sent: z.number(),
    completed: z.number(),
    /** 0–1, null until something has been sent. */
    completionRate: z.number().nullable(),
    happy: z.number(),
    /** 0–1, null until something has been completed. */
    happyRate: z.number().nullable(),
    reviewClicks: z.number(),
    rewardsGranted: z.number(),
  }),
  questionAverages: z.array(
    z.object({
      elementId: z.string(),
      title: z.string(),
      average: z.number().nullable(),
      count: z.number(),
    }),
  ),
  recent: z.array(feedbackRequestRowSchema),
});
export type FeedbackResults = z.infer<typeof feedbackResultsSchema>;

export const feedbackRequestsPageSchema = z.object({
  rows: z.array(feedbackRequestRowSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type FeedbackRequestsPage = z.infer<typeof feedbackRequestsPageSchema>;

export const feedbackErrorSchema = z.object({ error: z.string() });
