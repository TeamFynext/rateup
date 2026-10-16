import z from "zod";

import { CampaignParticipantStatus, CampaignStatus, CampaignType } from "../../../types/enums.js";
import { pageSchema, paginationQuerySchema } from "../pagination.js";

export const campaignIdParamsSchema = z.object({ campaignId: z.uuid() });

export const campaignListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(CampaignStatus).optional(),
  type: z.enum(CampaignType).optional(),
  teamId: z.uuid().optional(),
});

// ---- create -----------------------------------------------------------------

const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const dripStageInputSchema = z.object({
  templateId: z.uuid(),
  delay: z.number().int().min(0).max(10_000),
  delayUnit: z.enum(["minutes", "hours", "days"]),
  /** "HH:mm" in the campaign's timezone; the stage waits for that time of day. */
  sendAtTime: z.string().regex(CLOCK_TIME, "Expected HH:mm").optional(),
});

/**
 * A curated subset of the dashboard's create input. Status is not settable — a campaign is
 * created as a DRAFT and launched with `POST /campaigns/{id}/send` — and `flowId` is derived
 * from the template's FLOW button the way the wizard does, rather than trusted from the
 * caller.
 */
export const createCampaignSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    /** EMAIL campaigns have no sender yet, so only the two WhatsApp kinds are offered. */
    type: z.enum([CampaignType.WHATSAPP, CampaignType.DRIP]),
    teamId: z.uuid(),
    /** Required for a WHATSAPP campaign; ignored for a DRIP (each stage names its own). */
    templateId: z.uuid().optional(),
    /** Template variable mappings, in `{{n}}` order. */
    dynamicTags: z.array(z.string().max(500)).max(50).optional(),
    /** Required for a DRIP campaign. */
    dripStages: z.array(dripStageInputSchema).min(1).max(20).optional(),
    /** Members of these groups (their WhatsApp contacts) become the audience. */
    contactGroupIds: z.array(z.uuid()).max(1000).optional(),
    /** Individual contacts added alongside the groups. */
    contactIds: z.array(z.uuid()).max(1000).optional(),
  })
  .refine((b) => b.type !== CampaignType.WHATSAPP || Boolean(b.templateId), {
    path: ["templateId"],
    error: "templateId is required for a WHATSAPP campaign",
  })
  .refine((b) => b.type !== CampaignType.DRIP || Boolean(b.dripStages?.length), {
    path: ["dripStages"],
    error: "dripStages is required for a DRIP campaign",
  });

// ---- send -------------------------------------------------------------------

export const sendCampaignSchema = z
  .object({
    /** Which recipients to (re)send to. A first send targets PENDING. Ignored for a DRIP. */
    sendToStatuses: z
      .array(z.enum(CampaignParticipantStatus))
      .min(1)
      .max(7)
      .default([CampaignParticipantStatus.PENDING]),
    /** Send later instead of now. Must be in the future. Not supported for a DRIP. */
    scheduledAt: z.iso.datetime({ offset: true }).optional(),
    /** Spread recipients across days, at most this many per day. */
    dailySendLimit: z.number().int().positive().max(1_000_000).optional(),
  })
  // A bodiless POST arrives as null; it means "send to PENDING, now".
  .nullish()
  .transform((body) => body ?? { sendToStatuses: [CampaignParticipantStatus.PENDING] });

// ---- responses --------------------------------------------------------------

const campaignStatsSchema = z.object({
  /** Per-message counters: a retried recipient is counted once per attempt. */
  sent: z.number(),
  delivered: z.number(),
  read: z.number(),
  failed: z.number(),
  completed: z.number(),
});

const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  teamId: z.string(),
  template: z.object({ id: z.string(), name: z.string().nullable() }).nullable(),
  /** When a scheduled send is due; null when nothing is scheduled. */
  scheduledAt: z.iso.datetime().nullable(),
  startedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  /** Why the platform paused it (credits, payment method…); null unless PAUSED. */
  pauseReason: z.string().nullable(),
  errorMessage: z.string().nullable(),
  stats: campaignStatsSchema,
});

const campaignSendSchema = z.object({
  id: z.string(),
  attemptNo: z.number(),
  trigger: z.string(),
  status: z.string(),
  targetStatuses: z.array(z.string()),
  scheduledFor: z.iso.datetime().nullable(),
  startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  totals: z.object({
    targeted: z.number(),
    sent: z.number(),
    delivered: z.number(),
    read: z.number(),
    failed: z.number(),
    completed: z.number(),
  }),
});

export const campaignDetailSchema = campaignSchema.extend({
  contactGroupIds: z.array(z.string()),
  recipients: z.number(),
  dripStages: z.array(
    z.object({
      id: z.string(),
      templateId: z.string().nullable(),
      delay: z.number(),
      delayUnit: z.string(),
      sendAtTime: z.string().nullable(),
    }),
  ),
  lastSend: campaignSendSchema.nullable(),
});

export const campaignListSchema = pageSchema(campaignSchema);

export const deletedCampaignSchema = z.object({ id: z.string(), deleted: z.literal(true) });

export const sendAcceptedSchema = z.object({
  campaignId: z.string(),
  campaignStatus: z.string(),
  /** The send session opened for this request; null for a DRIP, whose stages send by schedule. */
  send: campaignSendSchema.nullable(),
});

export type CampaignIdParams = z.infer<typeof campaignIdParamsSchema>;
export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;
export type CreateCampaignBody = z.infer<typeof createCampaignSchema>;
export type SendCampaignBody = z.infer<typeof sendCampaignSchema>;
