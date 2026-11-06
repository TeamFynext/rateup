import type { Actor } from "../../../authz/actor.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import {
  CampaignBusyError,
  CampaignCreditsExhaustedError,
  CampaignEnqueueFailedError,
  CampaignIncompleteError,
  CampaignNoRecipientsError,
  CampaignNotFoundError,
} from "../../../modules/campaign/campaign.errors.js";
import { createCampaign, deleteCampaign } from "../../../modules/campaign/campaign.service.js";
import {
  launchCampaign,
  type LaunchCampaignResult,
} from "../../../modules/campaign/campaignLaunch.service.js";
import { CampaignSendInProgressError } from "../../../modules/campaign/campaignSend.service.js";
import { createCampaignParticipants } from "../../../modules/campaign/campaignParticipants/campaignParticipants.service.js";
import { CampaignParticipantStatus, CampaignStatus, CampaignType } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { getFlowIdFromTemplateComponents } from "../../../utils/waTemplateComponents.js";
import type { WaTemplateComponent } from "../../../types/whatsapp.types.js";
import { ExternalApiError } from "../../shared/errors.js";
import { cursorOrderBy, cursorWhere, decodeCursor, toPage } from "../pagination.js";
import { presentSurveyResponse, questionTitles } from "../surveys/presenters.js";
import { presentCampaign, presentCampaignDetail, presentCampaignSend } from "./presenters.js";
import type {
  CampaignListQuery,
  CreateCampaignBody,
  SendCampaignBody,
} from "./campaigns.schema.js";

/**
 * Campaign reads and writes for the partner API.
 *
 * `Campaign` has no `orgId`; it belongs to an org through its team, so every lookup here
 * carries `team: { orgId }`. A campaign id from another org is a 404, never a 403 — the
 * caller does not get to learn that it exists.
 */

const notFound = () => new ExternalApiError(404, "campaign_not_found", "No such campaign");

const campaignSelect = {
  id: true,
  name: true,
  type: true,
  status: true,
  teamId: true,
  createdAt: true,
  startedAt: true,
  campaignSentAt: true,
  pauseReason: true,
  errorMessage: true,
  waTemplate: { select: { id: true, data: true } },
  CampaignStats: {
    select: {
      totalSend: true,
      totalDelivered: true,
      totalRead: true,
      totalFailed: true,
      totalCompleted: true,
    },
  },
} satisfies Prisma.CampaignSelect;

const campaignSendSelect = {
  id: true,
  attemptNo: true,
  trigger: true,
  status: true,
  targetStatuses: true,
  scheduledFor: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  totalTargeted: true,
  totalSent: true,
  totalDelivered: true,
  totalRead: true,
  totalFailed: true,
  totalCompleted: true,
} satisfies Prisma.CampaignSendSelect;

// ---- reads ------------------------------------------------------------------

export async function listCampaigns(orgId: string, query: CampaignListQuery) {
  const { limit, cursor, status, type, teamId } = query;
  const rows = await prisma.campaign.findMany({
    where: {
      team: { orgId },
      ...(teamId ? { teamId } : {}),
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...cursorWhere(decodeCursor(cursor)),
    },
    select: campaignSelect,
    orderBy: cursorOrderBy,
    take: limit + 1,
  });
  return toPage(rows, limit, presentCampaign);
}

export async function getCampaignDetail(orgId: string, campaignId: string) {
  const row = await prisma.campaign.findFirst({
    where: { id: campaignId, team: { orgId } },
    select: {
      ...campaignSelect,
      CampaignDripStage: {
        select: { id: true, waTemplateId: true, delay: true, delayUnit: true, sendAtTime: true },
        orderBy: { delay: "asc" },
      },
    },
  });
  if (!row) throw notFound();

  const [groups, recipients, lastSend] = await Promise.all([
    // GROUP BY in SQL, not Prisma's `distinct` (which de-duplicates in memory after
    // fetching every participant row).
    prisma.campaignParticipant.groupBy({
      by: ["contactGroupId"],
      where: { campaignId, contactGroupId: { not: null } },
    }),
    prisma.campaignParticipant.count({ where: { campaignId } }),
    prisma.campaignSend.findFirst({
      where: { campaignId, dripStageId: null },
      orderBy: { attemptNo: "desc" },
      select: campaignSendSelect,
    }),
  ]);

  return presentCampaignDetail(row, {
    contactGroupIds: groups.map((g) => g.contactGroupId).filter((id): id is string => !!id),
    recipients,
    lastSend,
  });
}

/**
 * The survey responses a campaign's WhatsApp Flow collected.
 *
 * Same rows the dashboard's `getResponseByCampaignById` returns — responses to the flow's
 * survey through the campaign's team — but paginated and through the shared survey
 * presenter, so encrypted orgs get their ciphertext rather than an empty answer list.
 */
export async function listCampaignResponses(
  orgId: string,
  campaignId: string,
  page: { limit: number; cursor?: string },
) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, team: { orgId } },
    select: { teamId: true, flowId: true },
  });
  if (!campaign) throw notFound();

  const empty = { data: [], nextCursor: null };
  const dbFlowId = campaign.flowId;
  // `flowId` is a free-text column holding a uuid, or "" for a campaign with no flow.
  if (!dbFlowId || !/^[0-9a-f-]{36}$/i.test(dbFlowId)) return empty;

  const flow = await prisma.waFlow.findFirst({
    where: { dbFlowId, orgId },
    select: { surveyId: true, survey: { select: { questions: true } } },
  });
  if (!flow) return empty;

  const rows = await prisma.surveyResponse.findMany({
    where: {
      surveyTeamMap: { surveyId: flow.surveyId, teamId: campaign.teamId },
      ...cursorWhere(decodeCursor(page.cursor)),
    },
    select: {
      id: true,
      createdAt: true,
      language: true,
      tag: true,
      responses: true,
      encryptedResponses: true,
      surveyTeamMap: { select: { teamId: true } },
      Contact: { select: { phone: true } },
    },
    orderBy: cursorOrderBy,
    take: page.limit + 1,
  });
  const titles = questionTitles(flow.survey.questions);
  return toPage(rows, page.limit, (row) => presentSurveyResponse(row, titles));
}

// ---- create -----------------------------------------------------------------

function missing(requested: string[], found: { id: string }[]) {
  const have = new Set(found.map((r) => r.id));
  return [...new Set(requested)].filter((id) => !have.has(id));
}

/**
 * Every id the caller names must be the org's. The dashboard's `createCampaign` checks the
 * team but takes `waTemplateId` and drip `templateId`s on trust, so it is checked here before
 * anything is written.
 */
async function assertCreateRefs(orgId: string, body: CreateCampaignBody) {
  const team = await prisma.team.findFirst({
    where: { id: body.teamId, orgId },
    select: { id: true },
  });
  if (!team) throw new ExternalApiError(404, "team_not_found", "No such team");

  const templateIds = [
    ...(body.type === CampaignType.WHATSAPP && body.templateId ? [body.templateId] : []),
    ...(body.type === CampaignType.DRIP ? (body.dripStages ?? []).map((s) => s.templateId) : []),
  ];
  const templates = templateIds.length
    ? await prisma.waTemplate.findMany({
        where: { id: { in: templateIds }, orgId },
        select: { id: true, data: true },
      })
    : [];
  const missingTemplates = missing(templateIds, templates);
  if (missingTemplates.length) {
    throw new ExternalApiError(404, "template_not_found", "No such template", {
      templateIds: missingTemplates,
    });
  }

  const groupIds = body.contactGroupIds ?? [];
  if (groupIds.length) {
    const groups = await prisma.contactGroup.findMany({
      where: { id: { in: groupIds }, team: { orgId } },
      select: { id: true },
    });
    const missingGroups = missing(groupIds, groups);
    if (missingGroups.length) {
      throw new ExternalApiError(404, "contact_group_not_found", "No such audience", {
        contactGroupIds: missingGroups,
      });
    }
  }

  const contactIds = body.contactIds ?? [];
  if (contactIds.length) {
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, orgId },
      select: { id: true },
    });
    const missingContacts = missing(contactIds, contacts);
    if (missingContacts.length) {
      throw new ExternalApiError(404, "contact_not_found", "No such contact", {
        contactIds: missingContacts,
      });
    }
  }

  return templates;
}

/**
 * The Meta flow id behind the template's FLOW button, when the org has that flow — what the
 * wizard sends as `flowId`. `createCampaign` throws a bare Error for a flow it cannot find,
 * so an unknown one is left off (the campaign simply has no responses to list) rather than
 * passed through.
 */
async function deriveFlowId(orgId: string, templateData: unknown): Promise<string | undefined> {
  const components = (templateData as { components?: WaTemplateComponent[] } | null)?.components;
  if (!Array.isArray(components)) return undefined;
  const flowId = getFlowIdFromTemplateComponents(components);
  if (!flowId) return undefined;
  const flow = await prisma.waFlow.findFirst({
    where: { flowId, orgId },
    select: { dbFlowId: true },
  });
  return flow ? flowId : undefined;
}

export async function createCampaignForOrg(orgId: string, actor: Actor, body: CreateCampaignBody) {
  const templates = await assertCreateRefs(orgId, body);
  const isDrip = body.type === CampaignType.DRIP;

  const flowId =
    !isDrip && body.templateId
      ? await deriveFlowId(orgId, templates.find((t) => t.id === body.templateId)?.data)
      : undefined;

  const campaign = await createCampaign(
    {
      name: body.name,
      type: body.type,
      teamId: body.teamId,
      // Launched by POST /send, as the wizard's Launch does.
      status: CampaignStatus.DRAFT,
      ...(isDrip ? {} : { waTemplateId: body.templateId }),
      ...(flowId ? { flowId } : {}),
      dynamicTags: body.dynamicTags,
      ...(isDrip ? { dripStages: body.dripStages } : {}),
    },
    orgId,
    actor,
  );

  const groupIds = body.contactGroupIds ?? [];
  const contactIds = body.contactIds ?? [];
  if (groupIds.length || contactIds.length) {
    try {
      // The combined path, because it is the one that also enrols each participant in
      // the drip stages; the per-source ones do not.
      await createCampaignParticipants(campaign.id, orgId, {
        contactIds,
        groupIds,
        campaignIds: [],
        status: [],
      });
    } catch (error) {
      // A half-built campaign with no audience is worse than none: the caller would retry
      // the create and end up with two.
      await prisma.campaign
        .delete({ where: { id: campaign.id } })
        .catch((err: unknown) =>
          log.error({ err, campaignId: campaign.id }, "Could not roll back a partner campaign"),
        );
      throw error;
    }
  }

  return getCampaignDetail(orgId, campaign.id);
}

// ---- delete -----------------------------------------------------------------

/**
 * Mirrors the dashboard, which allows deleting a campaign in any state: `deleteCampaign`
 * cancels its pending messages and scheduled retries before the row goes, so a delete
 * mid-send stops the send rather than orphaning it.
 */
export async function deleteCampaignForOrg(orgId: string, campaignId: string) {
  try {
    await deleteCampaign(campaignId, orgId);
  } catch (error) {
    if (error instanceof CampaignNotFoundError) throw notFound();
    throw error;
  }
  return { id: campaignId, deleted: true as const };
}

// ---- send -------------------------------------------------------------------

const creditsExhausted = () =>
  new ExternalApiError(
    403,
    "campaign_credits_exhausted",
    "The campaign credits for this month are used up. Upgrade or add a credit pack to keep sending.",
  );

/** A refusal from `launchCampaign`, in this API's error envelope. */
function launchErrorToApiError(
  error: unknown,
  sendToStatuses: CampaignParticipantStatus[],
): unknown {
  if (error instanceof CampaignBusyError) {
    return new ExternalApiError(
      409,
      "campaign_send_in_progress",
      `The campaign is ${error.campaignStatus.toLowerCase()}; try again once that finishes`,
      { status: error.campaignStatus },
    );
  }
  if (error instanceof CampaignSendInProgressError) {
    return new ExternalApiError(
      409,
      "campaign_send_in_progress",
      "Another send for this campaign is already in progress",
    );
  }
  if (error instanceof CampaignIncompleteError) {
    return new ExternalApiError(
      422,
      "campaign_incomplete",
      error.reason === "no_drip_stages"
        ? "The drip campaign has no stages"
        : "The campaign has no template",
    );
  }
  if (error instanceof CampaignNoRecipientsError) {
    return new ExternalApiError(
      422,
      "no_recipients",
      "No participants with those statuses to send the campaign to",
      { sendToStatuses },
    );
  }
  if (error instanceof CampaignCreditsExhaustedError) return creditsExhausted();
  if (error instanceof CampaignEnqueueFailedError) {
    return new ExternalApiError(503, "send_failed", "The campaign could not be queued; try again");
  }
  return error;
}

/**
 * Launch (or re-send) a campaign through `launchCampaign`, the same launch path the
 * dashboard's `sendCampaignHandler` uses: stale-send release, completeness, the preflight
 * credit gate, a `CampaignSend` session, then `enqueueCampaignMessage`. A DRIP is started
 * by flipping it ACTIVE; the cron owns what goes out and when.
 *
 * What the dashboard handler also does and this does not: stop a campaign (status
 * INACTIVE), pause a drip, re-send to named participants, or save a retry policy. What
 * this checks and the dashboard does not: a schedule must be in the future, a DRIP cannot
 * be scheduled, and a DRIP with no stages is refused rather than started to send nothing.
 */
export async function sendCampaignForOrg(
  orgId: string,
  campaignId: string,
  body: SendCampaignBody,
) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, team: { orgId } },
    select: {
      id: true,
      type: true,
      status: true,
      waTemplateId: true,
      _count: { select: { CampaignDripStage: true } },
    },
  });
  if (!campaign) throw notFound();

  const isDrip = campaign.type === CampaignType.DRIP;
  const { sendToStatuses, dailySendLimit } = body;
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;
  if (scheduledAt && isDrip) {
    throw new ExternalApiError(
      400,
      "validation_failed",
      "A drip campaign cannot be scheduled; its stages send by their own delays",
      { issues: [{ path: "/scheduledAt", message: "not supported for a DRIP campaign" }] },
    );
  }
  if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
    throw new ExternalApiError(400, "validation_failed", "scheduledAt must be in the future", {
      issues: [{ path: "/scheduledAt", message: "must be in the future" }],
    });
  }

  let result: LaunchCampaignResult;
  try {
    result = await launchCampaign({
      orgId,
      campaign: {
        id: campaign.id,
        type: campaign.type,
        status: campaign.status,
        waTemplateId: campaign.waTemplateId,
        dripStageCount: campaign._count.CampaignDripStage,
      },
      mode: isDrip ? "drip" : "broadcast",
      status: isDrip ? CampaignStatus.ACTIVE : undefined,
      sendToStatuses,
      scheduledAt,
      dailySendLimit,
      requireDripStages: true,
    });
  } catch (error) {
    throw launchErrorToApiError(error, sendToStatuses);
  }

  if (result.outcome === "queued") {
    return {
      campaignId,
      campaignStatus: CampaignStatus.QUEUING,
      send: presentCampaignSend(result.send),
    };
  }
  // `drip_status_set` — the only other outcome a partner request can reach.
  return { campaignId, campaignStatus: CampaignStatus.ACTIVE, send: null };
}
