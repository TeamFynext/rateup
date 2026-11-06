import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { LoyaltyFeedbackRequestStatus, TemplateType } from "../../../../generated/prisma/client.js";
import {
  LOYALTY_FEEDBACK_FLOW_CATEGORY,
  WaFlowStatus,
  WaTemplateCategory,
  WaTemplateComponentTypeUpperCase,
} from "../../../types/enums.js";
import {
  getWaSettingsForFlow,
  syncLocalFlowToWhatsapp,
  updateFlowInDb,
} from "../../whatsapp/flows/flow.service.js";
import {
  DEFAULT_HAPPY_MIN_RATING,
  findOverallRatingElement,
  setHappyMinRating,
} from "../../whatsapp/flows/flowTemplates.js";
import {
  createTemplate,
  getTemplateByNameAndOrgId,
  saveTemplate,
} from "../../whatsapp/messageTemplates/wa_templates.service.js";
import { isValidTimeZone, resolvePeriod } from "../dashboard/dashboard.period.js";
import { feedbackEligibility } from "./feedback.eligibility.js";
import { ratingAveragesByElement, type FlowAnswer } from "./feedback.evaluate.js";
import { resolveTeamGoogleLink } from "./feedback.googleLink.js";
import { cancelScheduledFeedbackRequests } from "./feedback.scheduler.js";
import { ensureSurveyTeamMap } from "./feedback.teamMap.js";
import type {
  FeedbackCounts,
  FeedbackFlowCandidates,
  FeedbackOverview,
  FeedbackRequestRow,
  FeedbackRequestsPage,
  FeedbackRequestsQuery,
  FeedbackResults,
  FeedbackResultsQuery,
  SetupFeedbackBody,
  TemplateStep,
  UpdateFeedbackSettingInput,
} from "./feedback.schema.js";

/**
 * The admin side of loyalty feedback. Feedback never owns the flow: the business creates one
 * in WhatsApp → Flow with the LOYALTY_FEEDBACK category (from a template, so it carries the
 * rating question and its Google-review threshold) and selects it here. This module attaches
 * it to the programme, submits the FLOW-button template to Meta, holds the settings and reads
 * the results. Sending and completion live in their own files.
 */

export class FeedbackError extends Error {
  constructor(
    public readonly status: 400 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = "FeedbackError";
  }
}

/**
 * Meta template names are unique per account and the FLOW button binds to one flow, so the
 * template is named after the flow — a later selection gets its own, and reselecting a flow
 * finds its earlier template again.
 */
export function feedbackTemplateName(dbFlowId: string): string {
  return `loyalty_feedback_${dbFlowId.replaceAll("-", "").slice(0, 8).toLowerCase()}`;
}

function templateStep(data: unknown): TemplateStep {
  const status = (data as { status?: unknown } | null)?.status;
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

function templateName(data: unknown, dbFlowId: string | null): string {
  const name = (data as { name?: unknown } | null)?.name;
  if (typeof name === "string") return name;
  return dbFlowId ? feedbackTemplateName(dbFlowId) : "loyalty_feedback";
}

/** `+91••••••12`: enough to recognise a number, not enough to dial it. */
export function maskPhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  const hidden = "•".repeat(Math.max(2, digits.length - 4));
  return `+${digits.slice(0, 2)}${hidden}${digits.slice(-2)}`;
}

const ZERO_COUNTS: FeedbackCounts = {
  scheduled: 0,
  sent: 0,
  completed: 0,
  happy: 0,
  reviewClicks: 0,
  rewardsGranted: 0,
};

const EMPTY_OVERVIEW: FeedbackOverview = {
  programExists: false,
  setting: null,
  flow: null,
  template: null,
  team: null,
  reward: null,
  counts: ZERO_COUNTS,
};

const SETTING_INCLUDE = {
  flow: {
    select: {
      dbFlowId: true,
      flowId: true,
      name: true,
      status: true,
      pendingSave: true,
      surveyId: true,
      version: true,
      json: true,
      whatsappSettingsId: true,
    },
  },
  waTemplate: { select: { id: true, data: true, whatsappSettingsPhoneId: true } },
  team: { select: { id: true, name: true, googleLink: true, reviewPageLinks: true } },
  reward: { select: { id: true, name: true, status: true } },
} as const;

async function loadProgram(orgId: string) {
  return await prisma.loyaltyProgram.findUnique({
    where: { orgId },
    select: {
      id: true,
      name: true,
      businessName: true,
      status: true,
      feedbackSetting: { include: SETTING_INCLUDE },
    },
  });
}

async function requireSetting(orgId: string) {
  const program = await loadProgram(orgId);
  if (!program) throw new FeedbackError(404, "Loyalty programme not found");
  if (!program.feedbackSetting) throw new FeedbackError(404, "Feedback has not been set up");
  return { program, setting: program.feedbackSetting };
}

async function feedbackCounts(programId: string): Promise<FeedbackCounts> {
  const [byStatus, happy, reviewClicks, rewardsGranted] = await Promise.all([
    prisma.loyaltyFeedbackRequest.groupBy({
      by: ["status"],
      where: { programId },
      _count: { _all: true },
    }),
    prisma.loyaltyFeedbackRequest.count({ where: { programId, happy: true } }),
    prisma.loyaltyFeedbackRequest.count({ where: { programId, reviewClickedAt: { not: null } } }),
    prisma.loyaltyFeedbackRequest.count({ where: { programId, rewardGrantedAt: { not: null } } }),
  ]);
  const count = (status: LoyaltyFeedbackRequestStatus) =>
    byStatus.find((row) => row.status === status)?._count._all ?? 0;
  const completed = count(LoyaltyFeedbackRequestStatus.COMPLETED);
  return {
    scheduled: count(LoyaltyFeedbackRequestStatus.SCHEDULED),
    // A completed request was sent too; "sent" is everything that reached the customer.
    sent: count(LoyaltyFeedbackRequestStatus.SENT) + completed,
    completed,
    happy,
    reviewClicks,
    rewardsGranted,
  };
}

function toOverview(
  program: NonNullable<Awaited<ReturnType<typeof loadProgram>>>,
  counts: FeedbackCounts,
): FeedbackOverview {
  const setting = program.feedbackSetting;
  if (!setting) return { ...EMPTY_OVERVIEW, programExists: true, counts };
  return {
    programExists: true,
    setting: {
      id: setting.id,
      enabled: setting.enabled,
      sendDelayMinutes: setting.sendDelayMinutes,
      cooldownDays: setting.cooldownDays,
      teamId: setting.teamId,
      rewardId: setting.rewardId,
      happyMinRating: setting.happyMinRating,
    },
    flow: setting.flow
      ? {
          dbFlowId: setting.flow.dbFlowId,
          flowId: setting.flow.flowId,
          name: setting.flow.name,
          status: setting.flow.status,
          pendingSave: setting.flow.pendingSave,
          surveyId: setting.flow.surveyId,
          version: setting.flow.version,
        }
      : null,
    template: setting.waTemplate
      ? {
          id: setting.waTemplate.id,
          name: templateName(setting.waTemplate.data, setting.dbFlowId),
          status: templateStep(setting.waTemplate.data),
        }
      : null,
    team: {
      id: setting.team.id,
      name: setting.team.name,
      googleLink: resolveTeamGoogleLink(setting.team),
    },
    reward: setting.reward
      ? { id: setting.reward.id, name: setting.reward.name, status: setting.reward.status }
      : null,
    counts,
  };
}

export async function getFeedbackOverview(orgId: string): Promise<FeedbackOverview> {
  const program = await loadProgram(orgId);
  if (!program) return EMPTY_OVERVIEW;
  return toOverview(program, await feedbackCounts(program.id));
}

/* ── selecting a flow ───────────────────────────────────────────────────────── */

/**
 * Every flow in the org carrying the LOYALTY_FEEDBACK category, with whether Feedback may
 * select it. Org-wide rather than filtered by the caller's teams: loyalty is an org-level
 * programme.
 */
export async function listFeedbackFlowCandidates(orgId: string): Promise<FeedbackFlowCandidates> {
  const flows = await prisma.waFlow.findMany({
    where: { orgId, categories: { has: LOYALTY_FEEDBACK_FLOW_CATEGORY } },
    orderBy: { createdAt: "desc" },
    select: {
      dbFlowId: true,
      name: true,
      status: true,
      pendingSave: true,
      version: true,
      json: true,
    },
  });
  return {
    flows: flows.map((flow) => {
      const eligibility = feedbackEligibility(flow);
      return {
        dbFlowId: flow.dbFlowId,
        name: flow.name,
        status: flow.status,
        pendingSave: flow.pendingSave,
        version: flow.version,
        eligible: eligibility.eligible,
        reason: eligibility.eligible ? null : eligibility.reason,
      };
    }),
  };
}

export async function setupFeedback(
  orgId: string,
  input: SetupFeedbackBody,
): Promise<FeedbackOverview> {
  const program = await loadProgram(orgId);
  if (!program) throw new FeedbackError(404, "Loyalty programme not found");
  if (program.feedbackSetting) {
    throw new FeedbackError(409, "Feedback is already set up for this programme");
  }
  const team = await prisma.team.findFirst({
    where: { id: input.teamId, orgId },
    select: { id: true },
  });
  if (!team) throw new FeedbackError(404, "Team not found");

  const flow = await prisma.waFlow.findFirst({
    where: { dbFlowId: input.dbFlowId, orgId },
    select: {
      dbFlowId: true,
      surveyId: true,
      json: true,
      version: true,
      status: true,
      categories: true,
    },
  });
  if (!flow) throw new FeedbackError(404, "Flow not found");
  if (!flow.categories.includes(LOYALTY_FEEDBACK_FLOW_CATEGORY)) {
    throw new FeedbackError(400, "That flow was not created with the Loyalty feedback category");
  }
  const eligibility = feedbackEligibility(flow);
  if (!eligibility.eligible) throw new FeedbackError(400, eligibility.reason);

  // The flow token needs a survey↔team mapping for the team whose Google link is used.
  await ensureSurveyTeamMap(flow.surveyId, team.id);

  // The flow is the source of truth for the threshold on attach; the settings form writes it
  // back into the flow afterwards (updateFeedbackSetting), so the two stay in step.
  const happyMinRating =
    findOverallRatingElement(flow.json)?.googleReview?.minRating ?? DEFAULT_HAPPY_MIN_RATING;

  await prisma.loyaltyFeedbackSetting.create({
    data: { programId: program.id, teamId: team.id, dbFlowId: flow.dbFlowId, happyMinRating },
  });
  return await getFeedbackOverview(orgId);
}

/* ── settings ───────────────────────────────────────────────────────────────── */

export async function updateFeedbackSetting(
  orgId: string,
  patch: UpdateFeedbackSettingInput,
): Promise<FeedbackOverview> {
  const { program, setting } = await requireSetting(orgId);
  const data: {
    enabled?: boolean;
    sendDelayMinutes?: number;
    cooldownDays?: number;
    teamId?: string;
    rewardId?: string | null;
    happyMinRating?: number;
  } = {};

  if (patch.sendDelayMinutes !== undefined) data.sendDelayMinutes = patch.sendDelayMinutes;
  if (patch.cooldownDays !== undefined) data.cooldownDays = patch.cooldownDays;

  if (patch.teamId !== undefined && patch.teamId !== setting.teamId) {
    const team = await prisma.team.findFirst({
      where: { id: patch.teamId, orgId },
      select: { id: true },
    });
    if (!team) throw new FeedbackError(404, "Team not found");
    if (setting.flow) await ensureSurveyTeamMap(setting.flow.surveyId, team.id);
    data.teamId = team.id;
  }

  if (patch.rewardId !== undefined) {
    if (patch.rewardId === null) {
      data.rewardId = null;
    } else {
      const reward = await prisma.loyaltyReward.findFirst({
        where: { id: patch.rewardId, programId: program.id },
        select: { id: true },
      });
      if (!reward) throw new FeedbackError(400, "Reward not found in this programme");
      data.rewardId = reward.id;
    }
  }

  if (patch.happyMinRating !== undefined && patch.happyMinRating !== setting.happyMinRating) {
    // The threshold lives on the flow's overall-rating element, where the reply handlers
    // read it. It is stripped before Meta sees the JSON, so this is not a pending edit.
    if (setting.flow) {
      await updateFlowInDb(orgId, setting.flow.dbFlowId, {
        json: setHappyMinRating(setting.flow.json, patch.happyMinRating),
      });
    }
    data.happyMinRating = patch.happyMinRating;
  }

  if (patch.enabled !== undefined) {
    if (patch.enabled) {
      const flowLive = setting.flow?.status === WaFlowStatus.PUBLISHED;
      const templateLive = templateStep(setting.waTemplate?.data) === "approved";
      if (!flowLive || !templateLive) {
        throw new FeedbackError(
          400,
          "Submit the flow to Meta and wait for the message template to be approved first",
        );
      }
    } else if (setting.enabled) {
      await cancelScheduledFeedbackRequests(program.id, "Feedback switched off");
    }
    data.enabled = patch.enabled;
  }

  if (Object.keys(data).length) {
    await prisma.loyaltyFeedbackSetting.update({ where: { id: setting.id }, data });
  }
  return await getFeedbackOverview(orgId);
}

/* ── submit to Meta ─────────────────────────────────────────────────────────── */

/**
 * The UTILITY template with a FLOW button that reaches customers outside a service window.
 * `navigateScreen` is the selected flow's first screen — flows built outside our templates
 * name their screens however they like.
 */
export function buildFeedbackRequestTemplate(
  name: string,
  flowId: string,
  navigateScreen: string,
): WaMetaTemplate {
  return {
    name,
    language: "en",
    category: WaTemplateCategory.UTILITY,
    components: [
      {
        type: WaTemplateComponentTypeUpperCase.BODY,
        text: "Hi {{1}}, thanks for visiting {{2}}! Could you spare 30 seconds to tell us how we did?",
        example: { body_text: [["Priya", "Kettle & Co"]] },
      },
      {
        type: WaTemplateComponentTypeUpperCase.BUTTONS,
        buttons: [
          {
            type: "FLOW",
            text: "Share feedback",
            flow_id: flowId,
            flow_action: "navigate",
            navigate_screen: navigateScreen,
          },
        ],
      },
    ],
  };
}

export async function submitFeedbackFlow(orgId: string): Promise<FeedbackOverview> {
  const { program, setting } = await requireSetting(orgId);
  const flow = setting.flow;
  if (!flow)
    throw new FeedbackError(404, "The selected flow no longer exists — detach and pick another");

  if (flow.status !== WaFlowStatus.PUBLISHED || flow.pendingSave) {
    await syncLocalFlowToWhatsapp(orgId, flow.dbFlowId);
  }
  const published = await prisma.waFlow.findUnique({
    where: { dbFlowId: flow.dbFlowId },
    select: { flowId: true, whatsappSettingsId: true, json: true },
  });
  if (!published?.flowId) {
    throw new FeedbackError(400, "The flow has not been created at Meta yet");
  }
  const firstScreen = published.json.screens[0]?.id;
  if (!firstScreen) throw new FeedbackError(400, "The flow has no screens yet");

  if (!setting.waTemplateId) {
    const name = feedbackTemplateName(flow.dbFlowId);
    const channel = await getWaSettingsForFlow(orgId, published.whatsappSettingsId);
    const phoneId = channel.phoneId ?? undefined;
    const existing = await getTemplateByNameAndOrgId(name, orgId);
    let templateId: string;
    if (existing) {
      templateId = existing.id;
    } else {
      const submitted = await createTemplate(
        orgId,
        buildFeedbackRequestTemplate(name, published.flowId, firstScreen),
        phoneId,
      );
      const saved = await saveTemplate(
        submitted,
        orgId,
        {},
        TemplateType.LOYALTY,
        undefined,
        phoneId,
      );
      templateId = saved.id;
    }
    await prisma.loyaltyFeedbackSetting.update({
      where: { id: setting.id },
      data: { waTemplateId: templateId },
    });
  }

  log.info({ orgId, programId: program.id, dbFlowId: flow.dbFlowId }, "Feedback flow submitted");
  return await getFeedbackOverview(orgId);
}

/* ── detach ─────────────────────────────────────────────────────────────────── */

/**
 * Stops asking and forgets the selection. The flow stays in WhatsApp → Flow untouched;
 * requests already sent still complete (the flow is resolved from the token), just without a
 * review link, and the request history is kept.
 */
export async function detachFeedback(orgId: string): Promise<void> {
  const { program, setting } = await requireSetting(orgId);
  await cancelScheduledFeedbackRequests(program.id, "Feedback detached");
  await prisma.loyaltyFeedbackSetting.delete({ where: { id: setting.id } });
}

/* ── results ────────────────────────────────────────────────────────────────── */

interface RequestRowSource {
  id: string;
  status: LoyaltyFeedbackRequestStatus;
  happy: boolean | null;
  overallRating: number | null;
  channel: string | null;
  failReason: string | null;
  scheduledFor: Date;
  sentAt: Date | null;
  completedAt: Date | null;
  reviewClickedAt: Date | null;
  rewardGrantedAt: Date | null;
  account: { contact: { name: string | null; phone: string | null } | null };
}

const REQUEST_ROW_SELECT = {
  id: true,
  status: true,
  happy: true,
  overallRating: true,
  channel: true,
  failReason: true,
  scheduledFor: true,
  sentAt: true,
  completedAt: true,
  reviewClickedAt: true,
  rewardGrantedAt: true,
  account: { select: { contact: { select: { name: true, phone: true } } } },
} as const;

const iso = (date: Date | null) => (date ? date.toISOString() : null);

function toRequestRow(row: RequestRowSource): FeedbackRequestRow {
  return {
    id: row.id,
    customerName: row.account.contact?.name?.trim() || "Customer",
    phoneMasked: maskPhone(row.account.contact?.phone),
    status: row.status,
    happy: row.happy,
    overallRating: row.overallRating,
    channel: row.channel,
    failReason: row.failReason,
    scheduledFor: row.scheduledFor.toISOString(),
    sentAt: iso(row.sentAt),
    completedAt: iso(row.completedAt),
    reviewClickedAt: iso(row.reviewClickedAt),
    rewardGrantedAt: iso(row.rewardGrantedAt),
  };
}

export async function getFeedbackResults(
  orgId: string,
  query: FeedbackResultsQuery,
  now = new Date(),
): Promise<FeedbackResults> {
  const tz = query.tz && isValidTimeZone(query.tz) ? query.tz : "UTC";
  const period = resolvePeriod(query.period ?? "30d", now, tz);
  const periodOut = {
    key: period.key,
    label: period.label,
    start: period.current.start.toISOString(),
    end: period.current.end.toISOString(),
  };

  const program = await loadProgram(orgId);
  const flowJson = program?.feedbackSetting?.flow?.json;
  if (!program) {
    return {
      period: periodOut,
      metrics: {
        sent: 0,
        completed: 0,
        completionRate: null,
        happy: 0,
        happyRate: null,
        reviewClicks: 0,
        rewardsGranted: 0,
      },
      questionAverages: [],
      recent: [],
    };
  }

  const [inWindow, recent] = await Promise.all([
    prisma.loyaltyFeedbackRequest.findMany({
      where: {
        programId: program.id,
        createdAt: { gte: period.current.start, lt: period.current.end },
      },
      select: {
        status: true,
        happy: true,
        reviewClickedAt: true,
        rewardGrantedAt: true,
        surveyResponseId: true,
      },
    }),
    prisma.loyaltyFeedbackRequest.findMany({
      where: { programId: program.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: REQUEST_ROW_SELECT,
    }),
  ]);

  const completedRows = inWindow.filter((r) => r.status === LoyaltyFeedbackRequestStatus.COMPLETED);
  const sent =
    completedRows.length +
    inWindow.filter((r) => r.status === LoyaltyFeedbackRequestStatus.SENT).length;
  const completed = completedRows.length;
  const happy = completedRows.filter((r) => r.happy === true).length;

  let questionAverages: FeedbackResults["questionAverages"] = [];
  if (flowJson) {
    const responseIds = completedRows
      .map((r) => r.surveyResponseId)
      .filter((id): id is string => typeof id === "string");
    const responses = responseIds.length
      ? await prisma.surveyResponse.findMany({
          where: { id: { in: responseIds } },
          select: { responses: true },
        })
      : [];
    questionAverages = ratingAveragesByElement(
      flowJson,
      responses.map((r) => r.responses as unknown as FlowAnswer[]),
    );
  }

  return {
    period: periodOut,
    metrics: {
      sent,
      completed,
      completionRate: sent ? completed / sent : null,
      happy,
      happyRate: completed ? happy / completed : null,
      reviewClicks: inWindow.filter((r) => r.reviewClickedAt !== null).length,
      rewardsGranted: inWindow.filter((r) => r.rewardGrantedAt !== null).length,
    },
    questionAverages,
    recent: recent.map(toRequestRow),
  };
}

export async function listFeedbackRequests(
  orgId: string,
  query: FeedbackRequestsQuery,
): Promise<FeedbackRequestsPage> {
  const program = await prisma.loyaltyProgram.findUnique({
    where: { orgId },
    select: { id: true },
  });
  const { page, pageSize } = query;
  if (!program) return { rows: [], total: 0, page, pageSize };

  const where = { programId: program.id, ...(query.status ? { status: query.status } : {}) };
  const [rows, total] = await Promise.all([
    prisma.loyaltyFeedbackRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: REQUEST_ROW_SELECT,
    }),
    prisma.loyaltyFeedbackRequest.count({ where }),
  ]);
  return { rows: rows.map(toRequestRow), total, page, pageSize };
}
