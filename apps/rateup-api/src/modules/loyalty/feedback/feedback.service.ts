import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import {
  LoyaltyFeedbackRequestStatus,
  TemplateType,
  type Survey,
} from "../../../../generated/prisma/client.js";
import {
  SurveyType,
  WaFlowStatus,
  WaTemplateCategory,
  WaTemplateComponentTypeUpperCase,
} from "../../../types/enums.js";
import {
  createFlowCopyInDb,
  createFlowInWa,
  deleteFlowInWa,
  deprecateFlowInWa,
  getWaSettingsForFlow,
  syncLocalFlowToWhatsapp,
  updateFlowInDb,
} from "../../whatsapp/flows/flow.service.js";
import { createSurvey, deleteSurveyById } from "../../survey/survey.service.js";
import { getWaSettings } from "../../whatsapp/settings/wa_settings.service.js";
import {
  createTemplate,
  getTemplateByNameAndOrgId,
  saveTemplate,
} from "../../whatsapp/messageTemplates/wa_templates.service.js";
import { isValidTimeZone, resolvePeriod } from "../dashboard/dashboard.period.js";
import {
  buildFeedbackFlowJson,
  buildFeedbackTemplateMessage,
  DEFAULT_HAPPY_MIN_RATING,
  FEEDBACK_DRAFTS,
  FEEDBACK_FLOW_SCREEN_ID,
  feedbackDraftForApi,
  getFeedbackDraft,
  setHappyMinRating,
  suggestFeedbackDraftKey,
} from "./feedback.drafts.js";
import { ratingAveragesByElement, type FlowAnswer } from "./feedback.evaluate.js";
import { resolveTeamGoogleLink } from "./feedback.googleLink.js";
import { cancelScheduledFeedbackRequests } from "./feedback.scheduler.js";
import { ensureSurveyTeamMap } from "./feedback.teamMap.js";
import type {
  FeedbackCounts,
  FeedbackDraftsResponse,
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
 * The admin side of loyalty feedback: turning a draft into a real flow, submitting it to
 * Meta, the settings, and the results. Sending and completion live in their own files.
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

/** Meta template name; templates are unique per account, so a re-setup reuses this one. */
export const FEEDBACK_TEMPLATE_NAME = "loyalty_feedback_request_v1";

interface AuthedRequest {
  user?: { userId?: string; email?: string; orgId?: string };
}

function templateStep(data: unknown): TemplateStep {
  const status = (data as { status?: unknown } | null)?.status;
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

function templateName(data: unknown): string {
  const name = (data as { name?: unknown } | null)?.name;
  return typeof name === "string" ? name : FEEDBACK_TEMPLATE_NAME;
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
      whatsappSettingsId: true,
      onboardingPresetKey: true,
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
      draftKey: setting.draftKey,
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
          name: templateName(setting.waTemplate.data),
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

export async function listFeedbackDrafts(orgId: string): Promise<FeedbackDraftsResponse> {
  const program = await prisma.loyaltyProgram.findUnique({
    where: { orgId },
    select: { onboardingPresetKey: true, feedbackSetting: { select: { happyMinRating: true } } },
  });
  const happyMinRating = program?.feedbackSetting?.happyMinRating ?? DEFAULT_HAPPY_MIN_RATING;
  return {
    drafts: FEEDBACK_DRAFTS.map((draft) => feedbackDraftForApi(draft, happyMinRating)),
    suggestedKey: suggestFeedbackDraftKey(program?.onboardingPresetKey),
  };
}

/* ── setup ──────────────────────────────────────────────────────────────────── */

export async function setupFeedback(
  orgId: string,
  input: SetupFeedbackBody,
  req: AuthedRequest,
): Promise<FeedbackOverview> {
  const program = await loadProgram(orgId);
  if (!program) throw new FeedbackError(404, "Loyalty programme not found");
  if (program.feedbackSetting) {
    throw new FeedbackError(409, "Feedback is already set up for this programme");
  }
  const draft = getFeedbackDraft(input.draftKey);
  if (!draft) throw new FeedbackError(400, "Unknown feedback draft");
  const team = await prisma.team.findFirst({
    where: { id: input.teamId, orgId },
    select: { id: true },
  });
  if (!team) throw new FeedbackError(404, "Team not found");

  // The flow is created on the requested number, else the programme's channel, else the
  // org default — a flow id only resolves against the WABA it was created under.
  let whatsappSettingsId: string | undefined = program.whatsappSettingsId ?? undefined;
  if (input.whatsappSettingsPhoneId) {
    const waSettings = await getWaSettings(orgId, input.whatsappSettingsPhoneId);
    if (!waSettings) {
      throw new FeedbackError(404, "WhatsApp number not found for this organisation");
    }
    whatsappSettingsId = waSettings.id;
  }

  const name = `Feedback – ${draft.label}`;
  const created = await createFlowInWa(orgId, { name, categories: ["SURVEY"] }, whatsappSettingsId);

  let surveyId: string | undefined;
  try {
    const survey = (await createSurvey(
      {
        title: name,
        teamIds: [team.id],
        type: SurveyType.WaFlow,
        languages: ["en"],
        orgId,
        active: true,
        getLocation: false,
        welcomePageEnabled: false,
      },
      req,
    )) as Survey;
    surveyId = survey.id;

    const flow = await createFlowCopyInDb({
      orgId,
      flowId: created.id,
      json: buildFeedbackFlowJson(draft, { happyMinRating: DEFAULT_HAPPY_MIN_RATING }),
      flowMap: {},
      surveyId: survey.id,
      status: WaFlowStatus.DRAFT,
      name,
      templateMessage: buildFeedbackTemplateMessage(program.businessName ?? program.name),
      version: 2,
      whatsappSettingsId: created.whatsappSettingsId,
    });

    await prisma.loyaltyFeedbackSetting.create({
      data: {
        programId: program.id,
        teamId: team.id,
        dbFlowId: flow.dbFlowId,
        draftKey: draft.key,
        happyMinRating: DEFAULT_HAPPY_MIN_RATING,
      },
    });
  } catch (error) {
    // Roll back what Meta and the database already hold so the org can try again.
    await deleteFlowInWa(orgId, created.id, created.whatsappSettingsId).catch((e) =>
      log.error({ err: e, flowId: created.id }, "Could not delete orphaned feedback flow at Meta"),
    );
    if (surveyId) {
      await deleteSurveyById(surveyId).catch((e) =>
        log.error({ err: e, surveyId }, "Could not delete orphaned feedback survey"),
      );
    }
    throw error;
  }

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

/** The UTILITY template with a FLOW button that reaches customers outside a service window. */
export function buildFeedbackRequestTemplate(name: string, flowId: string): WaMetaTemplate {
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
            navigate_screen: FEEDBACK_FLOW_SCREEN_ID,
          },
        ],
      },
    ],
  };
}

export async function submitFeedbackFlow(orgId: string): Promise<FeedbackOverview> {
  const { program, setting } = await requireSetting(orgId);
  const flow = setting.flow;
  if (!flow) throw new FeedbackError(404, "Feedback flow not found");

  if (flow.status !== WaFlowStatus.PUBLISHED || flow.pendingSave) {
    await syncLocalFlowToWhatsapp(orgId, flow.dbFlowId);
  }
  const published = await prisma.waFlow.findUnique({
    where: { dbFlowId: flow.dbFlowId },
    select: { flowId: true, whatsappSettingsId: true },
  });
  if (!published?.flowId) {
    throw new FeedbackError(400, "The flow has not been created at Meta yet");
  }

  if (!setting.waTemplateId) {
    // Templates are unique per account: a programme that was reset and set up again gets
    // its earlier template back rather than a duplicate submission Meta would reject.
    const channel = await getWaSettingsForFlow(orgId, published.whatsappSettingsId);
    const phoneId = channel.phoneId ?? undefined;
    const existing = await getTemplateByNameAndOrgId(FEEDBACK_TEMPLATE_NAME, orgId);
    let templateId: string;
    if (existing) {
      templateId = existing.id;
    } else {
      const submitted = await createTemplate(
        orgId,
        buildFeedbackRequestTemplate(FEEDBACK_TEMPLATE_NAME, published.flowId),
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

/* ── reset ──────────────────────────────────────────────────────────────────── */

export async function resetFeedback(orgId: string): Promise<void> {
  const { program, setting } = await requireSetting(orgId);
  await cancelScheduledFeedbackRequests(program.id, "Feedback reset");
  // The setting goes first: the flow/survey deletes below cascade into it otherwise.
  await prisma.loyaltyFeedbackSetting.delete({ where: { id: setting.id } });

  const flow = setting.flow;
  if (!flow) return;
  if (flow.status === WaFlowStatus.DRAFT) {
    if (flow.flowId) {
      await deleteFlowInWa(orgId, flow.flowId, flow.whatsappSettingsId).catch((e) =>
        log.error({ err: e, flowId: flow.flowId }, "Could not delete feedback flow at Meta"),
      );
    }
    // Deleting the survey cascades the WaFlow row; responses (none for a draft) go too.
    await deleteSurveyById(flow.surveyId);
    return;
  }
  // A published flow keeps its survey and responses as history; Meta only allows deprecation.
  if (flow.flowId) {
    await deprecateFlowInWa(orgId, flow.flowId, flow.whatsappSettingsId).catch((e) =>
      log.error({ err: e, flowId: flow.flowId }, "Could not deprecate feedback flow at Meta"),
    );
  }
  await updateFlowInDb(orgId, flow.dbFlowId, { status: WaFlowStatus.DEPRECATED });
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
